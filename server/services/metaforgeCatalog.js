/* =========================================================
   MetaForge Catalog Index

   Boots once at server start, fetches the entire MetaForge
   item + arc catalog, and exposes O(1) lookup by id/slug.
   Refreshes every 60 minutes.

   Used to enrich loadout/stash/blueprint items with the richer
   MetaForge schema (stat_block, loadout_slots, workbench, etc.)
   ========================================================= */

import logger from '../utils/logger.js';
import { MetaForgeAPI } from './metaforge.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const REFRESH_MS = 60 * 60 * 1000; // 1 hour
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_ITEMS_PATH = path.resolve(
  __dirname,
  '../data/metaforge-items.json',
);

const state = {
  items: [],
  itemsById: new Map(),
  arcs: [],
  arcsById: new Map(),
  quests: [],
  traders: {},
  loadedAt: null,
  loading: null,
  itemSource: 'unloaded',
};

function indexItems(items) {
  const map = new Map();
  for (const item of items) {
    if (!item || !item.id) continue;
    map.set(String(item.id).toLowerCase(), item);
    if (item.slug) map.set(String(item.slug).toLowerCase(), item);
    if (item.name) {
      const k = String(item.name).toLowerCase().replace(/\s+/g, '-');
      if (!map.has(k)) map.set(k, item);
    }
  }
  return map;
}

function indexArcs(arcs) {
  const map = new Map();
  for (const arc of arcs) {
    if (!arc) continue;
    const id = arc.id || arc.slug || arc.name;
    if (!id) continue;
    map.set(String(id).toLowerCase(), arc);
    if (arc.name) {
      map.set(String(arc.name).toLowerCase(), arc);
    }
  }
  return map;
}

async function loadAll() {
  const started = Date.now();
  const [liveItems, arcs, quests, traders] = await Promise.all([
    MetaForgeAPI.getAllItems().catch((e) => {
      console.warn('[MetaForgeCatalog] live items failed:', e.message);
      return [];
    }),
    MetaForgeAPI.getArcs({ includeLoot: true }).catch((e) => {
      console.warn('[MetaForgeCatalog] arcs failed:', e.message);
      return [];
    }),
    MetaForgeAPI.getQuests().catch(() => []),
    MetaForgeAPI.getTraders().catch(() => ({})),
  ]);

  const localItems = loadLocalItems();
  const items = liveItems.length > 0 ? liveItems : localItems;

  state.items = items;
  state.itemsById = indexItems(items);
  state.arcs = arcs;
  state.arcsById = indexArcs(arcs);
  state.quests = quests;
  state.traders = traders;
  state.loadedAt = new Date();
  state.itemSource =
    liveItems.length > 0 ? 'metaforge-api' : 'local-metaforge-items';

  logger.info(
    `[MetaForgeCatalog] Loaded ${items.length} items (${state.itemSource}), ${arcs.length} arcs, ${quests.length} quests in ${Date.now() - started}ms`,
  );
}

function loadLocalItems() {
  try {
    const parsed = JSON.parse(fs.readFileSync(LOCAL_ITEMS_PATH, 'utf8'));
    if (Array.isArray(parsed?.data)) return parsed.data;
    if (Array.isArray(parsed?.items)) return parsed.items;
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    console.warn('[MetaForgeCatalog] local item fallback failed:', e.message);
  }
  return [];
}

function ensureLoaded() {
  if (state.loadedAt) return Promise.resolve();
  if (!state.loading)
    state.loading = loadAll().finally(() => {
      state.loading = null;
    });
  return state.loading;
}

export const MetaForgeCatalog = {
  /** Fire-and-forget initial load. Returns a promise you can await. */
  init() {
    if (!state.loadedAt && !state.loading) {
      state.loading = loadAll().finally(() => {
        state.loading = null;
      });
      // Schedule periodic refresh
      setInterval(() => {
        loadAll().catch((e) =>
          console.warn('[MetaForgeCatalog] Refresh failed:', e.message),
        );
      }, REFRESH_MS).unref?.();
    }
    return state.loading || Promise.resolve();
  },

  /** Lookup a single item by id, slug, or name (case-insensitive). */
  lookupItem(id) {
    if (!id) return null;
    const key = String(id).toLowerCase();
    return state.itemsById.get(key) || null;
  },

  lookupArc(id) {
    if (!id) return null;
    const key = String(id).toLowerCase();
    return state.arcsById.get(key) || null;
  },

  /** Returns the full arc list. Awaits initial load if not ready. */
  async allArcs() {
    await ensureLoaded();
    return state.arcs;
  },

  async allItems() {
    await ensureLoaded();
    return state.items;
  },

  async allQuests() {
    await ensureLoaded();
    return state.quests;
  },

  async allTraders() {
    await ensureLoaded();
    return state.traders;
  },

  status() {
    return {
      loadedAt: state.loadedAt,
      itemCount: state.items.length,
      arcCount: state.arcs.length,
      questCount: state.quests.length,
      itemSource: state.itemSource,
    };
  },
};

export default MetaForgeCatalog;
