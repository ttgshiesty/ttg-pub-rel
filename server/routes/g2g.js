import express from 'express';
import {
  createG2GApiClient,
  getMissingG2GConfigKeys,
  G2GParseError,
  G2GResponseError,
  isWebhookTimestampFresh,
  safeG2GLogContext,
  tryLoadG2GServerConfig,
  verifyG2GWebhookSignature,
} from '../services/g2g.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

function clientOrUnavailable(res) {
  const missingKeys = getMissingG2GConfigKeys();
  if (missingKeys.length > 0) {
    res.status(503).json({
      ok: false,
      error: 'g2g_not_configured',
      missingKeys,
    });
    return null;
  }

  const client = createG2GApiClient();
  if (!client) {
    res.status(503).json({
      ok: false,
      error: 'g2g_not_configured',
      missingKeys,
    });
    return null;
  }

  return client;
}

function sendG2GError(res, err) {
  if (err instanceof G2GResponseError) {
    return res.status(502).json({
      ok: false,
      error: 'g2g_error',
      status: err.status,
      code: err.code,
      request_id: err.requestId,
    });
  }
  if (err instanceof G2GParseError) {
    return res.status(502).json({ ok: false, error: 'g2g_parse_error' });
  }
  console.warn('[G2G] request failed', safeG2GLogContext(err));
  return res.status(500).json({ ok: false, error: 'internal_error' });
}

function envelope(env) {
  return {
    ok: true,
    request_id: env.request_id,
    code: env.code,
    message: env.message,
    warning: env.warning,
    payload: env.payload,
  };
}

function pickQuery(req, keys) {
  const query = {};
  for (const key of keys) {
    if (req.query[key] !== undefined) query[key] = String(req.query[key]);
  }
  return Object.keys(query).length > 0 ? query : undefined;
}

router.get('/health', async (_req, res) => {
  const missingKeys = getMissingG2GConfigKeys();
  if (missingKeys.length > 0) {
    return res.json({ g2g: { configured: false, missingKeys } });
  }

  const client = createG2GApiClient();
  if (!client) return res.json({ g2g: { configured: false, missingKeys } });

  try {
    const env = await client.request({ method: 'GET', path: '/v2/store' });
    return res.json({
      g2g: { configured: true, api: { ok: true, code: env.code } },
    });
  } catch (err) {
    console.warn('[G2G] health check failed', safeG2GLogContext(err));
    return res.json({
      g2g: { configured: true, api: { ok: false, error: 'request_failed' } },
    });
  }
});

router.use((req, res, next) => {
  if (req.path === '/webhook') return next();
  return requireAuth(req, res, next);
});

router.get('/products', async (req, res) => {
  const client = clientOrUnavailable(res);
  if (!client) return;
  try {
    const env = await client.request({
      method: 'GET',
      path: '/v2/products',
      query: pickQuery(req, ['category_id', 'service_id', 'brand_id', 'q']),
    });
    return res.json(envelope(env));
  } catch (err) {
    return sendG2GError(res, err);
  }
});

router.get('/services', async (_req, res) => {
  const client = clientOrUnavailable(res);
  if (!client) return;
  try {
    const env = await client.request({ method: 'GET', path: '/v2/services' });
    return res.json(envelope(env));
  } catch (err) {
    return sendG2GError(res, err);
  }
});

router.get('/brands', async (req, res) => {
  const serviceId = String(req.query.service_id || '').trim();
  if (!serviceId) {
    return res.status(400).json({ ok: false, error: 'service_id_required' });
  }

  const client = clientOrUnavailable(res);
  if (!client) return;
  try {
    const env = await client.request({
      method: 'GET',
      path: `/v2/services/${encodeURIComponent(serviceId)}/brands`,
    });
    return res.json(envelope(env));
  } catch (err) {
    return sendG2GError(res, err);
  }
});

router.get('/offers', async (req, res) => {
  const client = clientOrUnavailable(res);
  if (!client) return;
  try {
    const offerId = String(req.query.offer_id || '').trim();
    const env = await client.request(
      offerId
        ? { method: 'GET', path: `/v2/offers/${encodeURIComponent(offerId)}` }
        : {
            method: 'GET',
            path: '/v2/offers/search',
            query: pickQuery(req, [
              'product_id',
              'service_id',
              'brand_id',
              'status',
              'page',
              'limit',
            ]),
          },
    );
    return res.json(envelope(env));
  } catch (err) {
    return sendG2GError(res, err);
  }
});

router.post('/offers', async (req, res) => {
  const client = clientOrUnavailable(res);
  if (!client) return;
  try {
    const env = await client.request({
      method: 'POST',
      path: '/v2/offers',
      body: req.body,
    });
    return res.json(envelope(env));
  } catch (err) {
    return sendG2GError(res, err);
  }
});

router.patch('/offers/:offerId', async (req, res) => {
  const client = clientOrUnavailable(res);
  if (!client) return;
  try {
    const env = await client.request({
      method: 'PATCH',
      path: `/v2/offers/${encodeURIComponent(req.params.offerId)}`,
      body: req.body,
    });
    return res.json(envelope(env));
  } catch (err) {
    return sendG2GError(res, err);
  }
});

router.delete('/offers/:offerId', async (req, res) => {
  const client = clientOrUnavailable(res);
  if (!client) return;
  try {
    const env = await client.request({
      method: 'DELETE',
      path: `/v2/offers/${encodeURIComponent(req.params.offerId)}`,
    });
    return res.json(envelope(env));
  } catch (err) {
    return sendG2GError(res, err);
  }
});

router.get('/orders/:orderId', async (req, res) => {
  const client = clientOrUnavailable(res);
  if (!client) return;
  try {
    const env = await client.request({
      method: 'GET',
      path: `/v2/orders/${encodeURIComponent(req.params.orderId)}`,
    });
    return res.json(envelope(env));
  } catch (err) {
    return sendG2GError(res, err);
  }
});

router.post('/orders/:orderId/delivery', async (req, res) => {
  const client = clientOrUnavailable(res);
  if (!client) return;
  try {
    const env = await client.request({
      method: 'POST',
      path: `/v2/orders/${encodeURIComponent(req.params.orderId)}/delivery`,
      body: req.body,
    });
    return res.json(envelope(env));
  } catch (err) {
    return sendG2GError(res, err);
  }
});

router.get('/webhook', (_req, res) => {
  res.json({ ok: true, endpoint: 'g2g-webhook' });
});

router.post('/webhook', (req, res) => {
  const config = tryLoadG2GServerConfig();
  const signature = req.get('g2g-signature');
  const timestamp = req.get('g2g-timestamp');

  if (!signature || !timestamp) {
    console.warn('[G2G Webhook] Rejected: missing signature or timestamp');
    return res.status(401).json({ error: 'missing_headers' });
  }

  if (!isWebhookTimestampFresh(timestamp)) {
    console.warn('[G2G Webhook] Rejected: timestamp outside replay window');
    return res.status(401).json({ error: 'timestamp_expired' });
  }

  if (config?.webhookSecret) {
    const webhookUrl =
      config.webhookUrl ||
      `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const valid = verifyG2GWebhookSignature({
      webhookUrl,
      userId: config.userId,
      timestamp,
      receivedSignature: signature,
      webhookSecret: config.webhookSecret,
    });
    if (!valid) {
      console.warn('[G2G Webhook] Rejected: invalid signature');
      return res.status(401).json({ error: 'invalid_signature' });
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.error('[G2G Webhook] Rejected: missing G2G_WEBHOOK_SECRET');
    return res.status(503).json({ error: 'webhook_secret_not_configured' });
  } else {
    console.warn('[G2G Webhook] G2G_WEBHOOK_SECRET missing; dev-only bypass');
  }

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  const eventType =
    typeof req.body.event_type === 'string' ? req.body.event_type : 'unknown';
  const orderId =
    typeof req.body.order_id === 'string' ? req.body.order_id : undefined;
  const offerId =
    typeof req.body.offer_id === 'string' ? req.body.offer_id : undefined;

  console.info('[G2G Webhook] Received', {
    event_type: eventType,
    order_id: orderId,
    offer_id: offerId,
  });

  return res.json({ received: true });
});

export default router;
