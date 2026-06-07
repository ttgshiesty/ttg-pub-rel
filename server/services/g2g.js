import { createHmac, timingSafeEqual } from 'node:crypto';

const REDACTED = '[redacted]';
const pacers = new Map();

export class G2GResponseError extends Error {
  constructor(message, { status, requestId, code, bodySnippet } = {}) {
    super(message);
    this.name = 'G2GResponseError';
    this.status = status;
    this.requestId = requestId;
    this.code = code;
    this.bodySnippet = bodySnippet;
  }
}

export class G2GParseError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'G2GParseError';
    this.cause = cause;
  }
}

function trim(value) {
  return String(value || '').trim();
}

function collectSources() {
  return {
    apiBaseUrl: trim(process.env.G2G_API_BASE_URL || process.env.G2G_API_BASE),
    accessKeyId: trim(process.env.G2G_ACCESS_KEY_ID || process.env.G2G_API_KEY),
    secretAccessKey: trim(
      process.env.G2G_SECRET_ACCESS_KEY || process.env.G2G_SECRET,
    ),
    userId: trim(process.env.G2G_USER_ID || process.env.G2G_USERNAME),
    webhookSecret: trim(process.env.G2G_WEBHOOK_SECRET),
    webhookUrl: trim(process.env.G2G_WEBHOOK_URL),
    minInterval: trim(process.env.G2G_MIN_REQUEST_INTERVAL_MS),
  };
}

export function getMissingG2GConfigKeys() {
  const source = collectSources();
  const missing = [];
  if (!source.apiBaseUrl) missing.push('G2G_API_BASE_URL');
  if (!source.accessKeyId) missing.push('G2G_ACCESS_KEY_ID');
  if (!source.secretAccessKey) missing.push('G2G_SECRET_ACCESS_KEY');
  if (!source.userId) missing.push('G2G_USER_ID');
  return missing;
}

export function tryLoadG2GServerConfig() {
  const missing = getMissingG2GConfigKeys();
  if (missing.length > 0) return null;

  const source = collectSources();
  const interval = Number(source.minInterval);
  return {
    apiBaseUrl: source.apiBaseUrl.replace(/\/+$/, ''),
    accessKeyId: source.accessKeyId,
    secretAccessKey: source.secretAccessKey,
    userId: source.userId,
    webhookSecret: source.webhookSecret || undefined,
    webhookUrl: source.webhookUrl || undefined,
    minRequestIntervalMs:
      Number.isFinite(interval) && interval >= 0 ? interval : 250,
  };
}

function createRequestPacer(minIntervalMs) {
  let chain = Promise.resolve();
  let lastEnd = 0;

  return function pace(run) {
    const next = chain.then(async () => {
      const wait = Math.max(0, minIntervalMs - (Date.now() - lastEnd));
      if (wait > 0) {
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
      try {
        return await run();
      } finally {
        lastEnd = Date.now();
      }
    });
    chain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };
}

function getPacer(minIntervalMs) {
  const key = String(minIntervalMs);
  if (!pacers.has(key)) pacers.set(key, createRequestPacer(minIntervalMs));
  return pacers.get(key);
}

export function signG2GRequest(path, method, timestamp, config) {
  void method;
  const urlPath = path.startsWith('/') ? path : `/${path}`;
  const canonicalString = `${urlPath}${config.accessKeyId}${config.userId}${String(timestamp)}`;
  return createHmac('sha256', config.secretAccessKey)
    .update(canonicalString, 'utf8')
    .digest('hex');
}

function snippet(text, max = 512) {
  const compact = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  return compact.length <= max ? compact : `${compact.slice(0, max)}...`;
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function looksLikeEnvelope(value) {
  return (
    isRecord(value) &&
    typeof value.request_id === 'string' &&
    (typeof value.code === 'string' || typeof value.code === 'number') &&
    typeof value.message === 'string' &&
    typeof value.warning === 'string' &&
    Object.prototype.hasOwnProperty.call(value, 'payload')
  );
}

export function safeG2GLogContext(err) {
  if (err instanceof G2GResponseError) {
    return {
      name: err.name,
      status: err.status,
      requestId: err.requestId,
      code: err.code,
      bodySnippet: snippet(
        String(err.bodySnippet || '').replace(/[A-Za-z0-9+/]{20,}/g, REDACTED),
      ),
    };
  }
  if (err instanceof G2GParseError) return { name: err.name };
  return { name: 'Error' };
}

export function createG2GApiClient() {
  const config = tryLoadG2GServerConfig();
  if (!config) return null;
  const pace = getPacer(config.minRequestIntervalMs);

  return {
    config,
    request: (init) =>
      pace(async () => {
        const method = init.method || 'GET';
        const path = init.path.startsWith('/') ? init.path : `/${init.path}`;
        const search = new URLSearchParams();
        for (const [key, value] of Object.entries(init.query || {})) {
          if (value !== undefined && value !== null && value !== '') {
            search.append(key, String(value));
          }
        }
        const query = search.toString();
        const url = `${config.apiBaseUrl}${path}${query ? `?${query}` : ''}`;

        const headers = { ...(init.headers || {}) };
        let body;
        if (init.body !== undefined) {
          body = JSON.stringify(init.body);
          if (!headers['Content-Type'] && !headers['content-type']) {
            headers['Content-Type'] = 'application/json';
          }
        }

        const timestamp = Date.now();
        headers['g2g-api-key'] = config.accessKeyId;
        headers['g2g-userid'] = config.userId;
        headers['g2g-timestamp'] = String(timestamp);
        headers['g2g-signature'] = signG2GRequest(
          path,
          method,
          timestamp,
          config,
        );

        const response = await fetch(url, { method, headers, body });
        const text = await response.text();
        let json = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch (err) {
          throw new G2GParseError('G2G response was not valid JSON', err);
        }

        if (!response.ok) {
          throw new G2GResponseError(`G2G HTTP ${response.status}`, {
            status: response.status,
            requestId: isRecord(json) ? json.request_id : undefined,
            code: isRecord(json)
              ? String(json.code || '') || undefined
              : undefined,
            bodySnippet: snippet(text),
          });
        }

        if (!looksLikeEnvelope(json)) {
          throw new G2GParseError('G2G JSON missing expected envelope fields');
        }

        return { ...json, code: String(json.code) };
      }),
  };
}

export function isWebhookTimestampFresh(timestamp, windowMs = 5 * 60 * 1000) {
  const parsed = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(parsed)) return false;
  return Math.abs(Date.now() - parsed) <= windowMs;
}

export function verifyG2GWebhookSignature({
  webhookUrl,
  userId,
  timestamp,
  receivedSignature,
  webhookSecret,
}) {
  try {
    if (!webhookSecret || !receivedSignature) return false;
    const canonicalString = `${webhookUrl}${userId}${timestamp}`;
    const expected = createHmac('sha256', webhookSecret)
      .update(canonicalString, 'utf8')
      .digest('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const receivedBuffer = Buffer.from(receivedSignature, 'hex');
    if (expectedBuffer.length !== receivedBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}
