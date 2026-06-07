/* =========================================================
   MetaForge proxy routes — mounted at /api/metaforge

   Correct paths confirmed from MetaForge Network responses:
   - /api/arc-raiders/player-stats?userId=<profileId>
   - /api/arc-raiders/stats/profile
   - /api/arc-raiders/inventory/snapshot?profileId=<profileId>
   - /api/arc-raiders/weekly-trials
   - /api/sync
   - /api/guide-navigation?game_id=arc-raiders

   Public/catalog endpoints may use METAFORGE_API_KEY.
   Logged-in MetaForge-only endpoints may also require a server-side
   access token if MetaForge rejects bare API-key calls.
   ========================================================= */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/requireAuth.js';
import { User } from '../models/User.js';
import { MetaForgeAPI } from '../services/metaforge.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REFERENCE_DIR = path.resolve(__dirname, '../data/reference/metaforge');

const MF_ARC_BASE = 'https://metaforge.app/api/arc-raiders';
const MF_ROOT = 'https://metaforge.app/api';
const MF_SITE = 'https://metaforge.app';
const CACHE_TTL = 5 * 60 * 1000;
const SHORT_CACHE_TTL = 30 * 1000;

const cache = new Map();

async function readReferenceJson(filename, fallback = null) {
  try {
    const raw = await fs.readFile(path.join(REFERENCE_DIR, filename), 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function readReferenceText(filename, fallback = '') {
  try {
    return await fs.readFile(path.join(REFERENCE_DIR, filename), 'utf8');
  } catch {
    return fallback;
  }
}

function headersForMetaForge({ privateData = false } = {}) {
  const headers = { Accept: 'application/json' };

  // MetaForge reported: No `apikey` request header or url param was found.
  if (process.env.METAFORGE_API_KEY) {
    headers.apikey = process.env.METAFORGE_API_KEY;
  }

  // Optional support if your private/profile routes require a bearer token.
  // Do not expose this value to the browser.
  if (privateData && process.env.METAFORGE_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.METAFORGE_ACCESS_TOKEN}`;
  }

  return headers;
}

async function mfFetch(
  url,
  { ttlMs = CACHE_TTL, privateData = false, skipCache = false } = {},
) {
  const cached = cache.get(url);
  if (!skipCache && cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  let response;
  try {
    response = await fetch(url, {
      headers: headersForMetaForge({ privateData }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    if (!skipCache && cached) return cached.data;
    throw err;
  }

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (!response.ok) {
    if (!skipCache && cached) return cached.data;
    throw new Error(
      `MetaForge ${response.status} on ${url}: ${text.slice(0, 250) || response.statusText}`,
    );
  }

  if (!contentType.includes('application/json')) {
    if (!skipCache && cached) return cached.data;
    throw new Error(
      `MetaForge returned non-JSON (${response.status}) for ${url}: ${text.slice(0, 80)}`,
    );
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    if (!skipCache && cached) return cached.data;
    throw err;
  }

  if (!skipCache) {
    cache.set(url, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  return data;
}

function sendProxyError(res, label, err) {
  console.error(`[MetaForge proxy] ${label}:`, err.message);
  return res.status(502).json({
    error: true,
    source: 'metaforge',
    message: err.message,
  });
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function cleanStatName(key) {
  return String(key || '')
    .replace(/_kills$/i, '')
    .replace(/^kills_/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function crawlNumberStats(obj, result = {}) {
  if (!obj || typeof obj !== 'object') return result;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'number' && value > 0) {
      const name = cleanStatName(key);
      if (name) result[name] = (result[name] || 0) + value;
    } else if (value && typeof value === 'object') {
      crawlNumberStats(value, result);
    }
  }
  return result;
}

function crawlWeaponStats(obj, result = {}) {
  if (!obj || typeof obj !== 'object') return result;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'number' && /kills/i.test(key) && value > 0) {
      const name = cleanStatName(key);
      if (!result[name]) result[name] = { kills: 0, damage: 0 };
      result[name].kills += value;
    } else if (value && typeof value === 'object' && value.kills !== undefined) {
      const name = cleanStatName(key);
      if (!result[name]) result[name] = { kills: 0, damage: 0 };
      result[name].kills += numeric(value.kills);
      result[name].damage += numeric(
        value.damage ??
          value.totalDamage ??
          value.total_damage ??
          value.damageDealt ??
          value.damage_dealt,
      );
    } else if (value && typeof value === 'object') {
      crawlWeaponStats(value, result);
    }
  }
  return result;
}

function normalizeEnemyStats(enemyStats) {
  if (!Array.isArray(enemyStats)) {
    return crawlNumberStats(enemyStats);
  }

  const out = {};
  for (const enemy of enemyStats) {
    const name =
      enemy?.enemyName ??
      enemy?.enemy_name ??
      enemy?.name ??
      enemy?.targetName ??
      enemy?.target_name;
    if (!name) continue;

    out[name] = numeric(
      enemy?.kills ?? enemy?.count ?? enemy?.totalKills ?? enemy?.total_kills,
    );
  }
  return out;
}

function normalizeWeaponStats(weaponStats) {
  if (!Array.isArray(weaponStats)) {
    return crawlWeaponStats(weaponStats);
  }

  const out = {};
  for (const weapon of weaponStats) {
    const name =
      weapon?.weaponName ??
      weapon?.weapon_name ??
      weapon?.name ??
      weapon?.title;
    if (!name) continue;

    out[name] = {
      kills: numeric(
        weapon?.kills ??
          weapon?.count ??
          weapon?.totalKills ??
          weapon?.total_kills,
      ),
      damage: numeric(
        weapon?.damage ??
          weapon?.totalDamage ??
          weapon?.total_damage ??
          weapon?.damageDealt ??
          weapon?.damage_dealt,
      ),
    };
  }
  return out;
}

/**
 * Adapts the real MetaForge player-stats response to the legacy names already
 * consumed by server/services/statsaggregator.js.
 *
 * Real response:
 *   { stats: { total_rounds, total_net_profit, ... }, mapStats, enemyStats, weaponStats }
 */
function normalizePlayerStats(payload) {
  const totals = payload?.stats || {};
  const rounds = numeric(totals.total_rounds);
  const extractions = numeric(totals.total_extractions);
  const deaths = numeric(totals.total_deaths);

  // Debug: log the structure of enemyStats and weaponStats
  if (!payload?.enemyStats && !totals?.enemyStats) {
    console.log('[MetaForge] No enemyStats found in payload or stats object');
  }
  if (!payload?.weaponStats && !totals?.weaponStats) {
    console.log('[MetaForge] No weaponStats found in payload or stats object');
  }
  const enemySource = Array.isArray(payload?.enemyStats)
    ? payload.enemyStats
    : Array.isArray(totals?.enemyStats)
      ? totals.enemyStats
      : payload?.arc_destroyed_breakdown ||
        payload?.machine_kills ||
        payload?.codex ||
        totals?.arc_destroyed_breakdown ||
        totals?.machine_kills ||
        totals?.codex ||
        {};
  const weaponSource = Array.isArray(payload?.weaponStats)
    ? payload.weaponStats
    : Array.isArray(totals?.weaponStats)
      ? totals.weaponStats
      : payload?.weapon_performance ||
        payload?.weapon_stats ||
        payload?.weapons ||
        totals?.weapon_performance ||
        totals?.weapon_stats ||
        totals?.weapons ||
        {};

  return {
    ...payload,

    // Existing statsAggregator compatibility fields
    total_raids: rounds,
    total_rounds: rounds,
    extracted: extractions,
    extracted_count: extractions,
    died: deaths,
    total_deaths: deaths,
    total_profit: numeric(totals.total_net_profit),
    net_profit: numeric(totals.total_net_profit),
    arc_enemies_destroyed: numeric(totals.total_arc_kills),
    arc_destroyed: numeric(totals.total_arc_kills),
    player_kills: numeric(totals.total_player_kills),
    player_downs: numeric(totals.total_player_downs),
    damage_dealt: numeric(totals.total_damage_dealt),
    damage_received: numeric(totals.total_damage_taken),
    healing: numeric(totals.total_healing),
    total_xp: numeric(totals.total_xp),
    totalContainersLooted: numeric(
      totals.total_containers ??
        totals.totalContainersLooted ??
        totals.containers_looted,
    ),
    survival_rate: rounds > 0 ? extractions / rounds : 0,
    extraction_rate: rounds > 0 ? extractions / rounds : 0,

    // Support both old aggregator keys and the raw arrays
    map_stats: Array.isArray(payload?.mapStats) ? payload.mapStats : [],
    map_performance: Array.isArray(payload?.mapStats) ? payload.mapStats : [],
    // Check for enemyStats at top level or inside stats object
    enemy_stats: Array.isArray(enemySource) ? enemySource : [],
    // Check for weaponStats at top level or inside stats object
    weapon_stats: Array.isArray(weaponSource) ? weaponSource : [],
    arc_destroyed_breakdown: normalizeEnemyStats(enemySource),
    weapon_performance: normalizeWeaponStats(weaponSource),
  };
}

async function getLinkedMetaForgeUser(req) {
  if (!req.user?.id) return null;
  return User.findOne({ id: req.user.id })
    .select(
      'metaForgeProfileId embarkId embarkUsername displayName username lastSync syncError credits tokens coins stashValue stashSlotsUsed stashSlotsTotal',
    )
    .lean();
}

async function requireLinkedMetaForgeProfile(req, res) {
  const user = await getLinkedMetaForgeUser(req);
  const profileId = user?.metaForgeProfileId;
  if (!profileId) {
    res.status(404).json({
      error: true,
      message: 'No linked MetaForge profile found for this user.',
      linked: false,
    });
    return null;
  }
  return { user, profileId };
}

// ── Linked MetaForge profile state from Mongo ──────────────────────────
// GET /api/arc-raiders/profile/link
router.get('/profile/link', requireAuth, async (req, res) => {
  const user = await getLinkedMetaForgeUser(req);
  return res.json({
    linked: !!user?.metaForgeProfileId,
    profileId: user?.metaForgeProfileId || null,
    embarkId: user?.embarkId || null,
    embarkUsername: user?.embarkUsername || user?.displayName || null,
    lastSync: user?.lastSync || null,
    syncError: user?.syncError || null,
    cached: user
      ? {
          credits: user.credits || 0,
          tokens: user.tokens || 0,
          coins: user.coins || 0,
          stashValue: user.stashValue || 0,
          stashSlotsUsed: user.stashSlotsUsed || 0,
          stashSlotsTotal: user.stashSlotsTotal || 0,
        }
      : null,
  });
});

// Public MetaForge profile reputation/reviews.
// Captured shape: https://metaforge.app/profile/<slug>?game=arc-raiders
router.get('/profile/:slug', async (req, res) => {
  try {
    const slug = req.params.slug.trim();
    if (!slug) {
      return res.status(400).json({ error: true, message: 'slug required' });
    }

    const url = `${MF_SITE}/profile/${encodeURIComponent(slug)}?game=arc-raiders`;
    const data = await mfFetch(url, { ttlMs: CACHE_TTL });
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    return res.json(data);
  } catch (err) {
    return sendProxyError(res, '/profile/:slug', err);
  }
});

// ── Current user's linked player stats ─────────────────────────────────
// GET /api/arc-raiders/player-stats/me
router.get('/player-stats/me', requireAuth, async (req, res) => {
  try {
    const linked = await requireLinkedMetaForgeProfile(req, res);
    if (!linked) return;

    const url = `${MF_ARC_BASE}/player-stats?userId=${encodeURIComponent(linked.profileId)}`;
    const data = await mfFetch(url, { ttlMs: SHORT_CACHE_TTL });
    res.set('Cache-Control', 'private, max-age=30');
    return res.json(data);
  } catch (err) {
    return sendProxyError(res, '/player-stats/me', err);
  }
});

// GET /api/arc-raiders/raider/me
router.get('/raider/me', requireAuth, async (req, res) => {
  try {
    const linked = await requireLinkedMetaForgeProfile(req, res);
    if (!linked) return;

    const url = `${MF_ARC_BASE}/player-stats?userId=${encodeURIComponent(linked.profileId)}`;
    const data = await mfFetch(url, { ttlMs: SHORT_CACHE_TTL });
    res.set('Cache-Control', 'private, max-age=30');
    return res.json(normalizePlayerStats(data));
  } catch (err) {
    return sendProxyError(res, '/raider/me', err);
  }
});

// ── Full career/player stats ────────────────────────────────────────────
// Raw real response for new frontend consumers:
// GET /api/arc-raiders/player-stats/:profileId
router.get('/player-stats/:profileId', async (req, res) => {
  try {
    const profileId = req.params.profileId.trim();
    if (!profileId) {
      return res
        .status(400)
        .json({ error: true, message: 'profileId required' });
    }

    const url = `${MF_ARC_BASE}/player-stats?userId=${encodeURIComponent(profileId)}`;
    const data = await mfFetch(url, { ttlMs: SHORT_CACHE_TTL });
    res.set('Cache-Control', 'private, max-age=30');
    return res.json(data);
  } catch (err) {
    return sendProxyError(res, '/player-stats', err);
  }
});

// Compatibility route already used by statsAggregator.js.
// It now calls the real endpoint and translates the real field names.
// GET /api/arc-raiders/raider/:profileId
router.get('/raider/:profileId', async (req, res) => {
  try {
    const profileId = req.params.profileId.trim();
    if (!profileId) {
      return res
        .status(400)
        .json({ error: true, message: 'profileId required' });
    }

    const url = `${MF_ARC_BASE}/player-stats?userId=${encodeURIComponent(profileId)}`;
    const data = await mfFetch(url, { ttlMs: SHORT_CACHE_TTL });
    res.set('Cache-Control', 'private, max-age=30');
    return res.json(normalizePlayerStats(data));
  } catch (err) {
    return sendProxyError(res, '/raider compatibility alias', err);
  }
});

// Current profile/currency stats. This must be declared before /stats/:profileId.
// GET /api/arc-raiders/stats/profile
router.get('/stats/profile', requireAuth, async (_req, res) => {
  try {
    const data = await mfFetch(`${MF_ARC_BASE}/stats/profile`, {
      privateData: true,
      skipCache: true,
    });
    res.set('Cache-Control', 'private, no-store');
    return res.json(data);
  } catch (err) {
    return sendProxyError(res, '/stats/profile', err);
  }
});

// Current linked MetaForge stats for the logged-in app user.
// GET /api/arc-raiders/stats/me
router.get('/stats/me', requireAuth, async (req, res) => {
  try {
    const linked = await requireLinkedMetaForgeProfile(req, res);
    if (!linked) return;

    const url = `${MF_ARC_BASE}/player-stats?userId=${encodeURIComponent(linked.profileId)}`;
    const data = await mfFetch(url, { ttlMs: SHORT_CACHE_TTL });
    res.set('Cache-Control', 'private, max-age=30');
    return res.json(normalizePlayerStats(data));
  } catch (err) {
    return sendProxyError(res, '/stats/me', err);
  }
});

// Existing alias preserved for any client already calling /stats/:profileId.
router.get('/stats/:profileId', async (req, res) => {
  try {
    const profileId = req.params.profileId.trim();
    if (!profileId) {
      return res
        .status(400)
        .json({ error: true, message: 'profileId required' });
    }

    const url = `${MF_ARC_BASE}/player-stats?userId=${encodeURIComponent(profileId)}`;
    const data = await mfFetch(url, { ttlMs: SHORT_CACHE_TTL });
    res.set('Cache-Control', 'private, max-age=30');
    return res.json(normalizePlayerStats(data));
  } catch (err) {
    return sendProxyError(res, '/stats compatibility alias', err);
  }
});

// ── Current inventory/loadout snapshot ─────────────────────────────────
// GET /api/arc-raiders/inventory/snapshot/me
router.get('/inventory/snapshot/me', requireAuth, async (req, res) => {
  try {
    const linked = await requireLinkedMetaForgeProfile(req, res);
    if (!linked) return;

    const url = `${MF_ARC_BASE}/inventory/snapshot?profileId=${encodeURIComponent(linked.profileId)}`;
    const data = await mfFetch(url, {
      privateData: true,
      skipCache: true,
    });
    res.set('Cache-Control', 'private, no-store');
    return res.json(data);
  } catch (err) {
    return sendProxyError(res, '/inventory/snapshot/me', err);
  }
});

// GET /api/arc-raiders/inventory/snapshot/:profileId
router.get('/inventory/snapshot/:profileId', requireAuth, async (req, res) => {
  try {
    const profileId = req.params.profileId.trim();
    if (!profileId) {
      return res
        .status(400)
        .json({ error: true, message: 'profileId required' });
    }

    const url = `${MF_ARC_BASE}/inventory/snapshot?profileId=${encodeURIComponent(profileId)}`;
    const data = await mfFetch(url, {
      privateData: true,
      skipCache: true,
    });
    res.set('Cache-Control', 'private, no-store');
    return res.json(data);
  } catch (err) {
    return sendProxyError(res, '/inventory/snapshot', err);
  }
});

router.get('/inventory/me', requireAuth, async (req, res) => {
  try {
    const linked = await requireLinkedMetaForgeProfile(req, res);
    if (!linked) return;

    const url = `${MF_ARC_BASE}/inventory/snapshot?profileId=${encodeURIComponent(linked.profileId)}`;
    const data = await mfFetch(url, {
      privateData: true,
      skipCache: true,
    });
    res.set('Cache-Control', 'private, no-store');
    return res.json(data);
  } catch (err) {
    return sendProxyError(res, '/inventory/me', err);
  }
});

// Shorter alias if the frontend wants /api/arc-raiders/inventory/:profileId.
router.get('/inventory/:profileId', requireAuth, async (req, res) => {
  try {
    const profileId = req.params.profileId.trim();
    if (!profileId) {
      return res
        .status(400)
        .json({ error: true, message: 'profileId required' });
    }

    const url = `${MF_ARC_BASE}/inventory/snapshot?profileId=${encodeURIComponent(profileId)}`;
    const data = await mfFetch(url, {
      privateData: true,
      skipCache: true,
    });
    res.set('Cache-Control', 'private, no-store');
    return res.json(data);
  } catch (err) {
    return sendProxyError(res, '/inventory alias', err);
  }
});

// ── Weekly trials ──────────────────────────────────────────────────────
// GET /api/arc-raiders/weekly-trials
router.get('/weekly-trials', async (_req, res) => {
  try {
    const data = await mfFetch(`${MF_ARC_BASE}/weekly-trials`, {
      ttlMs: SHORT_CACHE_TTL,
    });
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    return res.json(data);
  } catch (err) {
    return sendProxyError(res, '/weekly-trials', err);
  }
});

// ── Saved tracker sync data ────────────────────────────────────────────
// GET /api/arc-raiders/sync
router.get('/sync', requireAuth, async (_req, res) => {
  try {
    const data = await mfFetch(`${MF_ROOT}/sync`, {
      privateData: true,
      skipCache: true,
    });
    res.set('Cache-Control', 'private, no-store');
    return res.json(data);
  } catch (err) {
    return sendProxyError(res, '/sync', err);
  }
});

// ── Guide/navigation content ───────────────────────────────────────────
// GET /api/arc-raiders/guide-navigation
router.get('/guide-navigation', async (_req, res) => {
  try {
    const data = await mfFetch(
      `${MF_ROOT}/guide-navigation?game_id=arc-raiders`,
    );
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    return res.json(data);
  } catch (err) {
    return sendProxyError(res, '/guide-navigation', err);
  }
});

// ── Existing map-data route preserved ──────────────────────────────────
router.get('/game-map-data', async (req, res) => {
  try {
    const query = new URLSearchParams(req.query).toString();
    const url = `${MF_ROOT}/game-map-data${query ? `?${query}` : ''}`;
    const data = await mfFetch(url);
    res.set('Cache-Control', 'public, max-age=300');
    return res.json(data);
  } catch (err) {
    return sendProxyError(res, '/game-map-data', err);
  }
});

// ── Local MetaForge/ARDB reference data imported from /meta ─────────────
router.get('/reference/projects', async (_req, res) => {
  const data = await readReferenceJson('ardb-projects.json', []);
  res.set('Cache-Control', 'public, max-age=300');
  return res.json(data);
});

router.get('/reference/returns-clean', async (_req, res) => {
  const data = await readReferenceJson('returns-clean.json', {});
  res.set('Cache-Control', 'public, max-age=300');
  return res.json(data);
});

router.get('/reference/maps-sidebar', async (_req, res) => {
  const data = await readReferenceJson('maps-sidebar.json', {});
  res.set('Cache-Control', 'public, max-age=300');
  return res.json(data);
});

router.get('/reference/maps-sidebar.txt', async (_req, res) => {
  const data = await readReferenceText('maps-sidebar.txt');
  res.type('text/plain');
  res.set('Cache-Control', 'public, max-age=300');
  return res.send(data);
});

router.get('/reference/mapicons', async (_req, res) => {
  const data = await readReferenceText('mapicons.txt');
  res.type('text/plain');
  res.set('Cache-Control', 'public, max-age=300');
  return res.send(data);
});

// ── Public MetaForge ARC Raiders data ───────────────────────────────────

// GET /api/arc-raiders/weekly-trials — live rotation data
router.get('/weekly-trials', async (req, res) => {
  try {
    const data = await MetaForgeAPI.getWeeklyTrials();
    res.set('Cache-Control', 'public, max-age=60');
    return res.json(data);
  } catch (err) {
    return sendProxyError(res, '/weekly-trials', err);
  }
});

// GET /api/arc-raiders/events-schedule — live conditions
router.get('/events-schedule', async (req, res) => {
  try {
    const data = await MetaForgeAPI.getEventsSchedule();
    res.set('Cache-Control', 'public, max-age=60');
    return res.json(data);
  } catch (err) {
    return sendProxyError(res, '/events-schedule', err);
  }
});

// ── Existing simple public catalog proxy preserved ─────────────────────
// items, arcs, quests, traders, events-schedule, etc.
router.get('/:endpoint', async (req, res) => {
  const endpoint = req.params.endpoint.trim();
  try {
    const query = new URLSearchParams(req.query).toString();
    const url = `${MF_ARC_BASE}/${encodeURIComponent(endpoint)}${query ? `?${query}` : ''}`;
    const data = await mfFetch(url);
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    return res.json(data);
  } catch (err) {
    if (endpoint === 'projects') {
      const data = await readReferenceJson('ardb-projects.json', []);
      if (Array.isArray(data) && data.length > 0) {
        res.set('Cache-Control', 'public, max-age=300');
        return res.json({ data, source: 'local-metaforge-reference' });
      }
    }
    return sendProxyError(res, `/${req.params.endpoint}`, err);
  }
});

export default router;
