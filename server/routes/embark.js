import express from 'express';
import crypto from 'crypto';
import { EmbarkAPI } from '../services/embarkProxy.js';
import { ArcTrackerAPI } from '../services/arctracker.js';
import { UserDataAPI } from '../services/userDataApi.js';
import { buildStatsOverview } from '../services/statsAggregator.js';
import { User } from '../models/User.js';
import { CapturedToken } from '../models/CapturedToken.js';
import { AutoSyncSettings } from '../models/AutoSyncSettings.js';
import { SyncData } from '../models/SyncData.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();
const AUTO_SYNC_INTERVAL_MINUTES = Number.parseInt(
  process.env.AUTO_SYNC_INTERVAL_MINUTES || '15',
  10,
);
const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ALLOWED_AUTO_SYNC_INTERVALS = [5, 15, 30, 60, 120, 240];
const ALLOWED_AUTO_SYNC_SOURCES = ['extension', 'arctracker', 'both'];

// Resolve a user's ArcTracker key (select:false in schema, so explicit fetch).
async function getArcKey(discordId) {
  if (!discordId) return null;
  const user = await User.findOne({ id: discordId })
    .select('+arctrackerUserKey')
    .lean();
  return user?.arctrackerUserKey || null;
}

// Wrap an ArcTracker call; on failure (no key, bad key, network) fall back.
async function arcOrFallback(req, arcFn, fallbackFn) {
  try {
    const key = await getArcKey(req.user?.id);
    if (key) return await arcFn(key);
  } catch (err) {
    console.warn('[ArcTracker] route fallback:', err.message);
  }
  return fallbackFn();
}

// POST /api/embark/token-exchange
// Exchanges OAuth authorization code for Embark access token
// No Discord auth required — this fires mid-OAuth redirect before session is set.
// Token is stored anonymously (by IP) and auto-linked once the user checks status.
router.post('/token-exchange', async (req, res) => {
  try {
    const { code, codeVerifier, platform } = req.body;

    if (!code || !codeVerifier) {
      return res.status(400).json({ error: 'code and codeVerifier required' });
    }

    const tokenUrl = 'https://auth.embark.net/oauth2/token';

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: 'embark-pioneer',
      redirect_uri: 'http://127.0.0.1:49171',
      code,
      code_verifier: codeVerifier,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error('[Embark] Token exchange failed:', data);
      return res.status(response.status).json({
        error: data?.error || 'Token exchange failed',
        details: data,
      });
    }

    // Store the token directly in the database for this user
    if (data.access_token) {
      try {
        const tokenHash = crypto
          .createHash('sha256')
          .update(data.access_token)
          .digest('hex');
        const existing = await CapturedToken.findOne({
          tokenHash,
          isValid: true,
        });
        if (existing) {
          existing.lastUsed = new Date();
          existing.expiresAt = new Date(Date.now() + TOKEN_MAX_AGE_MS);
          if (req.user?.id) {
            existing.userId = req.user.id;
            existing.linkedAt = existing.linkedAt || new Date();
          }
          await existing.save();
        } else {
          const tokenDoc = new CapturedToken({
            userId: req.user?.id || 'anonymous',
            token: data.access_token,
            tokenHash,
            source: platform || 'embark',
            isValid: true,
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip,
            linkedAt: req.user?.id ? new Date() : undefined,
            expiresAt: new Date(Date.now() + TOKEN_MAX_AGE_MS),
          });
          await tokenDoc.save();
        }
      } catch (storeErr) {
        console.warn('[Embark] Token store warning:', storeErr.message);
      }
    }

    res.json({
      token: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    });
  } catch (err) {
    console.error('[Embark] Token exchange error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// All routes below require Discord login
router.use(requireAuth);

router.get('/auto-sync/settings', async (req, res) => {
  try {
    const settings = await AutoSyncSettings.findOne({
      userId: req.user.id,
    }).lean();
    res.json(
      settings || {
        enabled: false,
        intervalMinutes: AUTO_SYNC_INTERVAL_MINUTES,
        source: 'both',
        lastSyncedAt: null,
        nextSyncAt: null,
        disabledReason: null,
        consecutiveFailures: 0,
        lastErrorMessage: null,
        lastErrorAt: null,
      },
    );
  } catch (err) {
    console.error('[Embark] Auto-sync settings error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/auto-sync/settings', async (req, res) => {
  try {
    const { enabled, intervalMinutes, source } = req.body || {};
    const existing = await AutoSyncSettings.findOne({ userId: req.user.id });
    const nextEnabled =
      typeof enabled === 'boolean' ? enabled : existing?.enabled || false;
    const nextInterval =
      intervalMinutes === undefined
        ? existing?.intervalMinutes || AUTO_SYNC_INTERVAL_MINUTES
        : Number(intervalMinutes);
    const nextSource =
      source === undefined ? existing?.source || 'both' : source;

    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be boolean' });
    }
    if (!ALLOWED_AUTO_SYNC_INTERVALS.includes(nextInterval)) {
      return res.status(400).json({ error: 'invalid intervalMinutes' });
    }
    if (!ALLOWED_AUTO_SYNC_SOURCES.includes(nextSource)) {
      return res.status(400).json({ error: 'invalid auto-sync source' });
    }

    const nextSyncAt = nextEnabled
      ? new Date(Date.now() + nextInterval * 60 * 1000)
      : null;

    const updated = await AutoSyncSettings.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          enabled: nextEnabled,
          intervalMinutes: nextInterval,
          source: nextSource,
          nextSyncAt,
          disabledReason: nextEnabled ? null : 'user_disabled',
          lastErrorMessage: null,
          lastErrorAt: null,
        },
      },
      { upsert: true, new: true },
    );

    res.json(updated);
  } catch (err) {
    console.error('[Embark] Auto-sync settings update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/sync/inventory', async (req, res) => {
  try {
    const latest = await SyncData.findOne({
      userId: req.user.id,
      source: 'extension_stash',
    }).sort({ syncedAt: -1 });

    if (!latest) {
      return res.status(404).json({
        code: 'NO_DATA',
        error: 'Open the SHiESTY extension and let it sync first',
      });
    }

    const stash = await UserDataAPI.getStash(req.user.id);
    res.json({
      items: stash.items || [],
      totalItems: stash.items?.length || 0,
      lastSyncedAt: latest.syncedAt,
      currencies: stash.currencies || null,
      totalValue: stash.totalValue || 0,
    });
  } catch (err) {
    console.error('[Embark] Inventory sync error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/profile', async (req, res) => {
  try {
    const data = await arcOrFallback(
      req,
      (key) => ArcTrackerAPI.getProfile(key),
      () => EmbarkAPI.getProfile(req.user.id),
    );
    res.json(data);
  } catch (err) {
    console.error('[Embark] Profile error:', err.message);
    const isUnreachable = err.message?.includes(
      'not reachable from the server',
    );
    res
      .status(isUnreachable ? 503 : 500)
      .json({ error: err.message, unreachable: isUnreachable });
  }
});

router.get('/stash', async (req, res) => {
  try {
    // Route through UserDataAPI so items get catalog-enriched (icon, rarity).
    const data = await UserDataAPI.getStash(req.user.id);
    res.json(data);
  } catch (err) {
    console.error('[Embark] Stash error:', err.message);
    const isUnreachable = err.message?.includes(
      'not reachable from the server',
    );
    res
      .status(isUnreachable ? 503 : 500)
      .json({ error: err.message, unreachable: isUnreachable });
  }
});

router.get('/rounds', async (req, res) => {
  try {
    const data = await arcOrFallback(
      req,
      (key) =>
        ArcTrackerAPI.getRounds(key, {
          limit: req.query.limit,
          offset: req.query.offset,
          outcome: req.query.outcome,
          map: req.query.map,
          season: req.query.season,
          dateFrom: req.query.date_from,
          dateTo: req.query.date_to,
          sort: req.query.sort,
        }),
      () => EmbarkAPI.getRounds(req.user.id, req.query),
    );
    res.json(data);
  } catch (err) {
    console.error('[Embark] Rounds error:', err.message);
    const isUnreachable = err.message?.includes(
      'not reachable from the server',
    );
    res
      .status(isUnreachable ? 503 : 500)
      .json({ error: err.message, unreachable: isUnreachable });
  }
});

router.get('/hideout', async (req, res) => {
  try {
    const data = await arcOrFallback(
      req,
      (key) => ArcTrackerAPI.getHideout(key),
      () => EmbarkAPI.getHideout(req.user.id),
    );
    res.json(data);
  } catch (err) {
    console.error('[Embark] Hideout error:', err.message);
    const isUnreachable = err.message?.includes(
      'not reachable from the server',
    );
    res
      .status(isUnreachable ? 503 : 500)
      .json({ error: err.message, unreachable: isUnreachable });
  }
});

router.get('/quests', async (req, res) => {
  try {
    const data = await arcOrFallback(
      req,
      (key) => ArcTrackerAPI.getQuests(key),
      () => EmbarkAPI.getQuests(req.user.id),
    );
    res.json(data);
  } catch (err) {
    console.error('[Embark] Quests error:', err.message);
    const isUnreachable = err.message?.includes(
      'not reachable from the server',
    );
    res
      .status(isUnreachable ? 503 : 500)
      .json({ error: err.message, unreachable: isUnreachable });
  }
});

router.get('/projects', async (req, res) => {
  try {
    const data = await arcOrFallback(
      req,
      (key) => ArcTrackerAPI.getProjects(key),
      () => EmbarkAPI.getProjects(req.user.id),
    );
    res.json(data);
  } catch (err) {
    console.error('[Embark] Projects error:', err.message);
    const isUnreachable = err.message?.includes(
      'not reachable from the server',
    );
    res
      .status(isUnreachable ? 503 : 500)
      .json({ error: err.message, unreachable: isUnreachable });
  }
});

router.get('/loadout', async (req, res) => {
  try {
    const data = await UserDataAPI.getLoadout(req.user.id);
    res.json(data);
  } catch (err) {
    console.error('[Embark] Loadout error:', err.message);
    const isUnreachable = err.message?.includes(
      'not reachable from the server',
    );
    res
      .status(isUnreachable ? 503 : 500)
      .json({ error: err.message, unreachable: isUnreachable });
  }
});

router.get('/blueprints', async (req, res) => {
  try {
    const data = await arcOrFallback(
      req,
      (key) => ArcTrackerAPI.getBlueprints(key),
      () => EmbarkAPI.getBlueprints(req.user.id),
    );
    res.json(data);
  } catch (err) {
    console.error('[Embark] Blueprints error:', err.message);
    const isUnreachable = err.message?.includes(
      'not reachable from the server',
    );
    res
      .status(isUnreachable ? 503 : 500)
      .json({ error: err.message, unreachable: isUnreachable });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const data = await buildStatsOverview(req.user.id);
    res.json(data);
  } catch (err) {
    console.error('[Embark] Stats error:', err.message);
    const isUnreachable = err.message?.includes(
      'not reachable from the server',
    );
    res
      .status(isUnreachable ? 503 : 500)
      .json({ error: err.message, unreachable: isUnreachable });
  }
});

export default router;
