/* =========================================================
   MetaForge ARC Raiders API client (server-side)

   Docs:     https://metaforge.app/arc-raiders/api
   Base URL: https://metaforge.app/api/arc-raiders

   MetaForge is community-maintained catalog data only — it does
   NOT expose player-specific endpoints. Use ArcTrackerAPI for
   user-owned data (stash, loadout, rounds, etc.).

   Aggressive caching is required (per MetaForge's terms).
   ========================================================= */

const BASE_URL =
  process.env.METAFORGE_BASE_URL || "https://metaforge.app/api/arc-raiders";
const ROOT_BASE_URL = "https://metaforge.app/api"; // for non /arc-raiders endpoints

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes per call
const cache = new Map();

async function mfFetch(path, opts = {}) {
  const url = path.startsWith("http")
    ? path
    : `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const cacheKey = url;
  const cached = cache.get(cacheKey);
  if (!opts.skipCache && cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const res = await fetch(url, {
    headers: { Accept: "application/json", ...(opts.headers || {}) },
    method: opts.method || "GET",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `MetaForge ${res.status} on ${url}: ${text || res.statusText}`,
    );
  }

  const json = await res.json();
  cache.set(cacheKey, {
    data: json,
    expiresAt: Date.now() + (opts.ttlMs || CACHE_TTL_MS),
  });
  return json;
}

function buildQuery(params = {}) {
  const p = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    p[k] = String(v);
  }
  const qs = new URLSearchParams(p).toString();
  return qs ? `?${qs}` : "";
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
  if (res && res.data && typeof res.data === "object") return res.data;
  if (res && typeof res === "object" && !Array.isArray(res)) return res;
  return {};
}

async function getEventsSchedule() {
  const res = await mfFetch(`/events-schedule`, { ttlMs: 60 * 1000 });
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res)) return res;
  return [];
}

async function getEventTimers(params = {}) {
  const qs = buildQuery(params);
  const res = await mfFetch(`/event-timers${qs}`);
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res)) return res;
  return [];
}

async function getMapData(mapId) {
  const url = `${ROOT_BASE_URL}/game-map-data${buildQuery({
    tableID: "arc_map_data",
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
  getEventTimers,
  getMapData,
};

export default MetaForgeAPI;
