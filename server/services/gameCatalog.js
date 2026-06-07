/* =========================================================
   ARC Raiders Data API client
   https://arcdata.mahcks.com  (community-run, Cloudflare-cached)
   We additionally cache in-memory for 1h to keep our own
   responses fast and to absorb upstream blips.
   ========================================================= */

const BASE_URL = 'https://arcdata.mahcks.com';
const TTL_MS = 60 * 60 * 1000; // 1 hour

const cache = new Map(); // path -> { data, expiresAt }
const MAX_CACHE_SIZE = 200; // Prevent unbounded growth

async function fetchCached(path) {
  const hit = cache.get(path);
  if (hit && hit.expiresAt > Date.now()) return hit.data;

  const res = await fetch(BASE_URL + path, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`ArcData ${res.status} for ${path}`);
  }
  const data = await res.json();
  // Evict expired entries before inserting
  if (cache.size >= MAX_CACHE_SIZE) {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt <= now) cache.delete(key);
    }
  }
  // If still at limit, drop the oldest entry (FIFO)
  while (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(path, { data, expiresAt: Date.now() + TTL_MS });
  return data;
}

// Fetch a paginated `?full=true` collection completely.
async function fetchAllFull(endpoint) {
  const all = [];
  let offset = 0;
  const limit = 45;
  // Hard safety stop in case `next` keeps returning.
  for (let i = 0; i < 50; i++) {
    const page = await fetchCached(
      `${endpoint}?full=true&offset=${offset}&limit=${limit}`,
    );
    const items = page?.items || [];
    all.push(...items);
    if (!page?.next) break;
    offset += limit;
  }
  return all;
}

/**
 * Prebuilt id -> object lookup tables. Lazy and cached.
 */
const indexes = {
  items: null,
  hideout: null,
  quests: null,
};
const indexExpiresAt = { items: 0, hideout: 0, quests: 0 };

async function getIndex(kind, endpoint) {
  if (indexes[kind] && indexExpiresAt[kind] > Date.now()) return indexes[kind];
  const arr = await fetchAllFull(endpoint);
  const map = new Map();
  for (const obj of arr) {
    const id = obj?.id || obj?.itemId || obj?.slug;
    if (id) map.set(id, obj);
  }
  indexes[kind] = map;
  indexExpiresAt[kind] = Date.now() + TTL_MS;
  return map;
}

export const GameCatalog = {
  // ---- Single-file datasets ----
  bots: () => fetchCached('/v1/bots'),
  maps: () => fetchCached('/v1/maps'),
  projects: () => fetchCached('/v1/projects'),
  skillNodes: () => fetchCached('/v1/skill-nodes'),
  trades: () => fetchCached('/v1/trades'),

  // ---- Collections (single item) ----
  item: (id) => fetchCached(`/v1/items/${encodeURIComponent(id)}`),
  hideoutModule: (id) => fetchCached(`/v1/hideout/${encodeURIComponent(id)}`),
  quest: (id) => fetchCached(`/v1/quests/${encodeURIComponent(id)}`),

  // ---- Collections (full) — paginated under the hood ----
  allItems: () => fetchAllFull('/v1/items'),
  allHideout: () => fetchCached('/v1/hideout?full=true').then((d) => d.items),
  allQuests: () => fetchCached('/v1/quests?full=true').then((d) => d.items),

  // ---- Lookups ----
  lookupItem: async (id) => {
    if (!id) return null;
    const idx = await getIndex('items', '/v1/items').catch(() => null);
    if (idx) return idx.get(id) || null;
    // Fallback: single fetch
    return GameCatalog.item(id).catch(() => null);
  },
  lookupHideout: async (id) => {
    if (!id) return null;
    const idx = await getIndex('hideout', '/v1/hideout').catch(() => null);
    if (idx) return idx.get(id) || null;
    return GameCatalog.hideoutModule(id).catch(() => null);
  },
  lookupQuest: async (id) => {
    if (!id) return null;
    const idx = await getIndex('quests', '/v1/quests').catch(() => null);
    if (idx) return idx.get(id) || null;
    return GameCatalog.quest(id).catch(() => null);
  },
};

export default GameCatalog;
