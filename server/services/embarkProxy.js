/* =========================================================
   EMBARK DIRECT API PROXY  v2
   Uses captured tokens with auto-discovery of working endpoints.
   Caches working base URL per-token to avoid repeated probing.
   FALLBACK: Uses extension-synced data when server IP is blocked.
   RESTRICTION: Direct Embark API calls only allowed from extension routes.
   ========================================================= */

import logger from '../utils/logger.js';
import { CapturedToken } from '../models/CapturedToken.js';
import { SyncData } from '../models/SyncData.js';
import { enrichGameAssetRefs } from './assetMap.js';

const EMBARK_API_ROOT =
  process.env.EMBARK_API_ROOT || 'https://api.embark.games';

// API endpoint paths (appended to discovered base)
const ENDPOINTS = {
  profile: '/id/profile',
  stash: '/inventory',
  blueprints: '/blueprints',
  loadout: '/loadout',
  hideout: '/hideout',
  rounds: '/rounds',
  quests: '/quests',
  projects: '/projects',
  stats: '/stats',
};

// All possible base URL patterns to try during discovery
const BASE_CANDIDATES = [
  `${EMBARK_API_ROOT}/arc-raiders`,
  `${EMBARK_API_ROOT}/arc-raiders/v1`,
  `${EMBARK_API_ROOT}/arc-raiders/v2`,
  `${EMBARK_API_ROOT}/v1/arc-raiders`,
  `${EMBARK_API_ROOT}/v2/arc-raiders`,
  `${EMBARK_API_ROOT}/v1`,
  `${EMBARK_API_ROOT}/v2`,
  `${EMBARK_API_ROOT}/api/v1`,
  `${EMBARK_API_ROOT}/api/arc-raiders`,
  `${EMBARK_API_ROOT}`,
  `${EMBARK_API_ROOT}/player`,
];

// In-memory cache of working endpoints (tokenHash -> baseUrl)
const endpointCache = new Map();
const MAX_ENDPOINT_CACHE_SIZE = 1000;

function setEndpointCache(tokenHash, baseUrl) {
  // Prevent unbounded growth - delete oldest if at limit
  if (endpointCache.size >= MAX_ENDPOINT_CACHE_SIZE) {
    const firstKey = endpointCache.keys().next().value;
    endpointCache.delete(firstKey);
  }
  endpointCache.set(tokenHash, baseUrl);
}

function normalizeToken(token) {
  const trimmed = token.trim();
  if (
    !trimmed.toLowerCase().startsWith('bearer ') &&
    !trimmed.toLowerCase().startsWith('basic ') &&
    !trimmed.toLowerCase().startsWith('xbl3.0 ')
  ) {
    return `Bearer ${trimmed}`;
  }
  return trimmed;
}

function buildEmbarkHeaders(token, tokenHash) {
  return {
    Authorization: token,
    Accept: 'application/json',
    'User-Agent': 'SHiESTY-Companion/2.0',
    'X-Client-Version': '2.0.0',
    'X-Requested-With': 'XMLHttpRequest',
  };
}

async function getUserToken(userId) {
  const tokenDoc = await CapturedToken.findOne({
    userId,
    isValid: true,
  }).sort({ lastUsed: -1 });

  if (!tokenDoc) {
    throw new Error(
      'No valid token. Install the SHiESTY extension and launch ARC Raiders.',
    );
  }

  tokenDoc.lastUsed = new Date();
  await tokenDoc.save();

  return tokenDoc;
}

/**
 * Check for extension-synced data (fallback when direct API is blocked)
 */
async function getExtensionSync(userId, endpointKey) {
  try {
    const doc = await SyncData.findOne({
      userId,
      source: `extension_${endpointKey}`,
    }).sort({ syncedAt: -1 });

    if (doc && doc.payload) {
      const age = Date.now() - (doc.syncedAt?.getTime() || 0);
      // Data valid for 24 hours
      if (age < 24 * 60 * 60 * 1000) {
        logger.info(
          `[EmbarkProxy] Using extension-synced ${endpointKey} for user ${userId}`,
        );
        return doc.payload;
      }
    }
  } catch (e) {
    console.warn(`[EmbarkProxy] Extension sync check failed:`, e.message);
  }
  return null;
}

/**
 * Discover a working base URL for this token by probing /inventory
 * Uses the captured source URL as a hint if available.
 * Returns the working base URL and caches it.
 */
async function discoverWorkingEndpoint(tokenDoc) {
  const token = normalizeToken(tokenDoc.token);
  const cacheKey = tokenDoc.tokenHash;

  // Check memory cache first
  if (endpointCache.has(cacheKey)) {
    const cached = endpointCache.get(cacheKey);
    console.log(`[EmbarkProxy] Using cached endpoint: ${cached}`);
    return cached;
  }

  // Check DB cache
  if (tokenDoc.workingEndpoint) {
    const age = Date.now() - (tokenDoc.endpointDiscoveredAt?.getTime() || 0);
    // Cache valid for 24 hours
    if (age < 24 * 60 * 60 * 1000) {
      console.log(
        `[EmbarkProxy] Using DB cached endpoint: ${tokenDoc.workingEndpoint}`,
      );
      endpointCache.set(cacheKey, tokenDoc.workingEndpoint);
      return tokenDoc.workingEndpoint;
    }
  }

  console.log(
    `[EmbarkProxy] Discovering working endpoint for token ${tokenDoc.tokenHash.slice(0, 8)}...`,
  );

  // If we have a source URL, derive the base from it
  const sourceUrl = tokenDoc.source || '';
  let priorityBases = [];

  if (sourceUrl.includes('api.embark.games')) {
    try {
      const url = new URL(sourceUrl);
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        const basePath = '/' + pathParts.slice(0, -1).join('/');
        priorityBases.push(`${url.origin}${basePath}`);
      }
      if (pathParts.length >= 1) {
        const basePath = '/' + pathParts[0];
        priorityBases.push(`${url.origin}${basePath}`);
      }
      priorityBases.push(url.origin);
    } catch {
      // Invalid URL, ignore
    }
  }

  const allBases = [...new Set([...priorityBases, ...BASE_CANDIDATES])];

  const testPath = '/inventory';
  let lastError = null;
  let dnsFailed = false;

  for (const base of allBases) {
    const url = `${base.replace(/\/+$/, '')}${testPath}`;
    console.log(`[EmbarkProxy] Probing: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: buildEmbarkHeaders(token, cacheKey),
        signal: AbortSignal.timeout(8000),
      });

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      if (
        contentType.includes('text/html') ||
        text.trim().startsWith('<!DOCTYPE') ||
        text.trim().startsWith('<html')
      ) {
        console.warn(
          `[EmbarkProxy] ${url} returned HTML (${response.status}) — skipping`,
        );
        lastError = new Error(`HTML response from ${url}`);
        continue;
      }

      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        console.warn(
          `[EmbarkProxy] ${url} returned non-JSON: ${text.slice(0, 100)}`,
        );
        lastError = new Error(`Non-JSON from ${url}`);
        continue;
      }

      const hasItems = !!(
        data?.items ||
        data?.inventory ||
        data?.data?.items ||
        Array.isArray(data)
      );

      if (response.ok && hasItems) {
        console.log(`[EmbarkProxy] ✓ Found working endpoint: ${base}`);
        setEndpointCache(cacheKey, base);
        tokenDoc.workingEndpoint = base;
        tokenDoc.endpointDiscoveredAt = new Date();
        await tokenDoc.save();
        return base;
      }

      if (response.status === 401) {
        tokenDoc.isValid = false;
        await tokenDoc.save();
        throw new Error(
          'Token expired or invalid. Re-launch ARC Raiders with the extension active.',
        );
      }

      lastError = new Error(
        `${response.status} from ${url}: ${JSON.stringify(data).slice(0, 200)}`,
      );
      console.warn(
        `[EmbarkProxy] ${url} returned ${response.status} — continuing search`,
      );
    } catch (err) {
      if (
        err.message?.includes('Token expired') ||
        err.message?.includes('invalid')
      ) {
        throw err;
      }
      if (
        err.code === 'ENOTFOUND' ||
        err.message?.includes('ENOTFOUND') ||
        err.message?.includes('getaddrinfo')
      ) {
        dnsFailed = true;
      }
      lastError = err;
      console.warn(`[EmbarkProxy] ${url} error: ${err.message}`);
    }
  }

  if (dnsFailed) {
    throw new Error(
      'Embark API (api.embark.games) is not reachable from the server. ' +
        'This domain only resolves within the browser/game context. ' +
        'Live data sync requires the SHiESTY browser extension to proxy requests.',
    );
  }

  throw (
    lastError ||
    new Error(
      'Could not discover working Embark API endpoint. All candidates failed.',
    )
  );
}

/**
 * Fetch from Embark API using discovered endpoint
 * fromExtension: true if called from extension routes (allows direct API)
 */
async function fetchEmbark(
  endpointKey,
  tokenDoc,
  query = {},
  fromExtension = false,
) {
  const token = normalizeToken(tokenDoc.token);
  const endpointPath = ENDPOINTS[endpointKey];

  if (!endpointPath) {
    throw new Error(`Unknown endpoint: ${endpointKey}`);
  }

  // Discover or use cached working endpoint
  const baseUrl = await discoverWorkingEndpoint(tokenDoc);
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}${endpointPath}`);

  Object.entries(query).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      url.searchParams.set(key, String(val));
    }
  });

  console.log(`[EmbarkProxy] Fetching: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildEmbarkHeaders(token, tokenDoc.tokenHash),
    signal: AbortSignal.timeout(15000),
  });

  const contentType = response.headers.get('content-type') || '';
  const responseText = await response.text();

  if (
    contentType.includes('text/html') ||
    responseText.trim().startsWith('<!DOCTYPE')
  ) {
    endpointCache.delete(tokenDoc.tokenHash);
    tokenDoc.workingEndpoint = null;
    await tokenDoc.save();
    throw new Error(
      `Embark API returned HTML (endpoint may have changed). Try again.`,
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      tokenDoc.isValid = false;
      await tokenDoc.save();
      throw new Error(
        'Token expired. Re-launch ARC Raiders with the extension active.',
      );
    }
    throw new Error(
      `Embark API error (${response.status}): ${responseText.slice(0, 500)}`,
    );
  }

  try {
    return JSON.parse(responseText);
  } catch (parseErr) {
    throw new Error(
      `Invalid JSON from Embark API: ${responseText.slice(0, 200)}`,
    );
  }
}

// Proxy any Embark endpoint for an authenticated user
// fromExtension: true if called from extension routes (allows direct API)
export async function proxyEmbark(
  userId,
  endpointKey,
  query = {},
  fromExtension = false,
) {
  // First, try extension-synced data (always allowed)
  const cached = await getExtensionSync(userId, endpointKey);
  if (cached) return enrichGameAssetRefs(cached);

  // If not from extension, return empty data (no direct API allowed)
  if (!fromExtension) {
    logger.warn(
      `[EmbarkProxy] No extension-synced ${endpointKey} data for user ${userId}; direct Embark fetch blocked (not from extension route).`,
    );
    const isCollection = [
      'stash',
      'blueprints',
      'rounds',
      'quests',
      'projects',
      'inventory',
    ].includes(endpointKey);
    return isCollection ? [] : null;
  }

  // From extension: allow direct Embark API fetch
  try {
    const tokenDoc = await getUserToken(userId);
    return await fetchEmbark(endpointKey, tokenDoc, query, true);
  } catch (err) {
    console.error(
      `[EmbarkProxy] Extension direct fetch failed for ${endpointKey}:`,
      err.message,
    );
    const isCollection = [
      'stash',
      'blueprints',
      'rounds',
      'quests',
      'projects',
      'inventory',
    ].includes(endpointKey);
    return isCollection ? [] : null;
  }
}

// Test a token against all endpoints and return discovery results
// fromExtension: true if called from extension routes (allows direct API)
export async function testTokenEndpoints(token, fromExtension = false) {
  if (!fromExtension) {
    logger.warn(
      '[EmbarkProxy] Token endpoint testing blocked (not from extension route).',
    );
    return [
      {
        disabled: true,
        message: 'Token testing only allowed from extension routes.',
      },
    ];
  }

  const normalized = normalizeToken(token);
  const testPath = '/inventory';
  const results = [];

  for (const base of BASE_CANDIDATES) {
    const url = `${base.replace(/\/+$/, '')}${testPath}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: normalized,
          Accept: 'application/json',
          'User-Agent': 'SHiESTY-Companion/2.0',
        },
        signal: AbortSignal.timeout(8000),
      });

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();
      let isJson = false;
      let data = null;
      let hasItems = false;

      if (contentType.includes('application/json')) {
        try {
          data = JSON.parse(text);
          isJson = true;
          hasItems = !!(
            data?.items ||
            data?.inventory ||
            data?.data?.items ||
            Array.isArray(data)
          );
        } catch {}
      }

      results.push({
        url,
        status: response.status,
        isHtml: contentType.includes('text/html'),
        isJson,
        hasItems,
        contentLength: text.length,
        preview: text.slice(0, 300),
      });
    } catch (err) {
      results.push({
        url,
        error: err.message,
      });
    }
  }

  return results;
}

// Specific helper methods (web UI routes - use extension-synced data only)
export const EmbarkAPI = {
  getProfile: (userId) => proxyEmbark(userId, 'profile', {}, false),
  getProgression: (userId) => proxyEmbark(userId, 'progression', {}, false),
  getStash: (userId) => proxyEmbark(userId, 'stash', {}, false),
  getBlueprints: (userId) => proxyEmbark(userId, 'blueprints', {}, false),
  getLoadout: (userId) => proxyEmbark(userId, 'loadout', {}, false),
  getHideout: (userId) => proxyEmbark(userId, 'hideout', {}, false),
  getRounds: (userId, opts) => proxyEmbark(userId, 'rounds', opts, false),
  getQuests: (userId) => proxyEmbark(userId, 'quests', {}, false),
  getProjects: (userId) => proxyEmbark(userId, 'projects', {}, false),
  getStats: (userId) => proxyEmbark(userId, 'stats', {}, false),
};

export default EmbarkAPI;
