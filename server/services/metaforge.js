/* =========================================================
   MetaForge ARC Raiders API client (server-side)

   Docs:     https://metaforge.app/arc-raiders/api
   Base URL: https://metaforge.app/api/arc-raiders

   MetaForge exposes public catalog/map/event data and profile-sync data.
   The documented public API covers catalog/map/event endpoints; synced
   Raider profile endpoints are proxied server-side so private tokens stay
   out of the browser.

   Aggressive caching is required (per MetaForge's terms).
   ========================================================= */

const BASE_URL =
  process.env.METAFORGE_BASE_URL || 'https://metaforge.app/api/arc-raiders';
const ROOT_BASE_URL = 'https://metaforge.app/api'; // for non /arc-raiders endpoints

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes per call
const cache = new Map();
const MAX_CACHE_SIZE = 200; // Prevent unbounded growth

async function mfFetch(path, opts = {}) {
  const url = path.startsWith('http')
    ? path
    : `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const cacheKey = url;
  const cached = cache.get(cacheKey);
  if (!opts.skipCache && cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  let res;
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json', ...(opts.headers || {}) },
      method: opts.method || 'GET',
    });
  } catch (err) {
    if (!opts.skipCache && cached) return cached.data;
    throw err;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (!opts.skipCache && cached) return cached.data;
    throw new Error(
      `MetaForge ${res.status} on ${url}: ${text || res.statusText}`,
    );
  }

  let json;
  try {
    json = await res.json();
  } catch (err) {
    if (!opts.skipCache && cached) return cached.data;
    throw err;
  }
  // Evict expired entries before inserting
  if (cache.size >= MAX_CACHE_SIZE) {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt <= now) cache.delete(key);
    }
  }
  while (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(cacheKey, {
    data: json,
    expiresAt: Date.now() + (opts.ttlMs || CACHE_TTL_MS),
  });
  return json;
}

function buildQuery(params = {}) {
  const p = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    p[k] = String(v);
  }
  const qs = new URLSearchParams(p).toString();
  return qs ? `?${qs}` : '';
}

/**
 * Fetch ALL items by walking pagination. MetaForge caps limit at 100.
 * Optional filters narrow the catalog.
 */
async function getAllItems(params = {}) {
  const limit = Math.min(Number(params.limit) || 100, 100);
  let page = 1;
  const all = [];
  // Hard cap to avoid runaway loops if pagination meta is broken.
  const MAX_PAGES = 100;
  while (page <= MAX_PAGES) {
    const qs = buildQuery({ ...params, limit, page });
    const res = await mfFetch(`/items${qs}`);
    const pageData = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
        ? res
        : [];
    if (pageData.length === 0) break;
    all.push(...pageData);
    const pagination = res?.pagination;
    if (!pagination?.hasNextPage) break;
    page += 1;
  }
  return all;
}

async function getItems(params = {}) {
  const qs = buildQuery(params);
  const res = await mfFetch(`/items${qs}`);
  return {
    items: Array.isArray(res?.data) ? res.data : [],
    pagination: res?.pagination || null,
  };
}

async function getArcs({ includeLoot = false } = {}) {
  const qs = buildQuery({ includeLoot, limit: 100 });
  const res = await mfFetch(`/arcs${qs}`);
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res)) return res;
  return [];
}

async function getQuests(params = {}) {
  const qs = buildQuery(params);
  const res = await mfFetch(`/quests${qs}`);
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res)) return res;
  return [];
}

async function getTraders() {
  // MetaForge returns an object keyed by trader name.
  const res = await mfFetch(`/traders`);
  if (res && res.data && typeof res.data === 'object') return res.data;
  if (res && typeof res === 'object' && !Array.isArray(res)) return res;
  return {};
}

async function getEventTimers(params = {}) {
  const qs = buildQuery(params);
  const res = await mfFetch(`/event-timers${qs}`);
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res)) return res;
  return [];
}

async function getWeeklyTrials() {
  try {
    const raw = await mfFetch('/weekly-trials', { ttlMs: 60 * 1000 });
    if (!raw || typeof raw !== 'object') {
      return {
        data: [],
        activeWindowEnd: null,
        nextWindowStart: null,
        ok: false,
      };
    }
    const data = Array.isArray(raw.data) ? raw.data : [];
    const activeWindowEnd =
      raw.activeWindowEnd ??
      raw.active_window_end ??
      raw.rotation_end ??
      raw.rotationEnd;
    const nextWindowStart =
      raw.nextWindowStart ??
      raw.next_window_start ??
      raw.rotation_start ??
      raw.rotationStart;
    return { data, activeWindowEnd, nextWindowStart, ok: true };
  } catch (err) {
    console.error('[MetaForge] Failed to fetch weekly-trials:', err);
    return {
      data: [],
      activeWindowEnd: null,
      nextWindowStart: null,
      ok: false,
    };
  }
}

async function getEventsSchedule() {
  try {
    const data = await mfFetch('/events-schedule', { ttlMs: 60 * 1000 });
    if (Array.isArray(data)) return { events: data, ok: true };
    if (data && typeof data === 'object' && 'events' in data) {
      const ev = data.events;
      return { events: Array.isArray(ev) ? ev : [], ok: true };
    }
    return { events: [], ok: true };
  } catch (err) {
    console.error('[MetaForge] Failed to fetch events-schedule:', err);
    return { events: [], ok: false };
  }
}

async function getPlayerStats(profileId) {
  const qs = buildQuery({ userId: profileId });
  return mfFetch(`/player-stats${qs}`, { ttlMs: 30 * 1000 });
}

async function getStatsProfile() {
  return mfFetch(`/stats/profile`, {
    skipCache: true,
    headers: privateHeaders(),
  });
}

async function getInventorySnapshot(profileId) {
  const qs = buildQuery({ profileId });
  return mfFetch(`/inventory/snapshot${qs}`, {
    skipCache: true,
    headers: privateHeaders(),
  });
}

async function getSync() {
  return mfFetch(`${ROOT_BASE_URL}/sync`, {
    skipCache: true,
    headers: privateHeaders(),
  });
}

function privateHeaders() {
  const headers = {};
  if (process.env.METAFORGE_API_KEY) {
    headers.apikey = process.env.METAFORGE_API_KEY;
  }
  if (process.env.METAFORGE_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.METAFORGE_ACCESS_TOKEN}`;
  }
  return headers;
}

/**
 * GET https://metaforge.app/api/game-map-data?tableID=arc_map_data&mapID=...
 * (note: not under /arc-raiders/)
 */
async function getMapData(mapId) {
  const url = `${ROOT_BASE_URL}/game-map-data${buildQuery({
    tableID: 'arc_map_data',
    mapID: mapId,
  })}`;
  const res = await mfFetch(url);
  // MetaForge map data uses 'allData' as the primary key
  return res?.allData || res?.data || (Array.isArray(res) ? res : []);
}
export const MetaForgeAPI = {
  getItems,
  getAllItems,
  getArcs,
  getQuests,
  getTraders,
  getEventsSchedule,
  getWeeklyTrials,
  getEventTimers,
  getPlayerStats,
  getStatsProfile,
  getInventorySnapshot,
  getSync,
  getMapData,
};

export default MetaForgeAPI;
