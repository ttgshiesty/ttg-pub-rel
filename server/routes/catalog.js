/* =========================================================
   Game catalog routes — proxied + cached from arcdata.mahcks.com
   plus MetaForge-backed endpoints for items/arcs/quests/traders.
   ========================================================= */

import express from 'express';
import { GameCatalog } from '../services/gameCatalog.js';
import { MetaForgeCatalog } from '../services/metaforgeCatalog.js';
import { MetaForgeAPI } from '../services/metaforge.js';
import ArdbService from '../services/ardb.js';
import { NormalizedCatalog } from '../services/normalizedCatalog.js';

const router = express.Router();

const wrap = (fn) => async (req, res) => {
  try {
    const data = await fn(req);
    if (data == null) return res.status(404).json({ error: 'Not found' });
    // Allow CDN/browser caching (1h fresh, 24h stale-while-revalidate).
    res.set(
      'Cache-Control',
      'public, max-age=3600, stale-while-revalidate=86400',
    );
    res.json(data);
  } catch (err) {
    console.error('[Catalog]', err.message);
    res.status(502).json({ error: err.message });
  }
};

// ---- Single-file ArcData datasets -------------------------------------
router.get(
  '/bots',
  wrap(() => GameCatalog.bots()),
);
router.get(
  '/maps',
  wrap(() => GameCatalog.maps()),
);
router.get(
  '/projects',
  wrap(() => GameCatalog.projects()),
);
router.get(
  '/skill-nodes',
  wrap(() => GameCatalog.skillNodes()),
);
router.get(
  '/trades',
  wrap(() => GameCatalog.trades()),
);

// ---- Normalized cross-source catalog ----------------------------------
// Uses ARDB for items/quests/projects, and ArcData for hideout/maps/trades.
// Every row returns { id, kind, source, name, raw, ...normalized fields }.
router.get(
  '/normalized',
  wrap(() => NormalizedCatalog.all()),
);
router.get(
  '/normalized/:kind',
  wrap((req) => NormalizedCatalog.list(req.params.kind)),
);
router.get(
  '/normalized/:kind/:id',
  wrap((req) => NormalizedCatalog.lookup(req.params.kind, req.params.id)),
);

// ---- Items ------------------------------------------------------------
router.get(
  '/items',
  wrap(() => GameCatalog.allItems()),
);
router.get(
  '/items/:id',
  wrap((req) => GameCatalog.lookupItem(req.params.id)),
);

// ---- Hideout ----------------------------------------------------------
router.get(
  '/hideout',
  wrap(() => GameCatalog.allHideout()),
);
router.get(
  '/hideout/:id',
  wrap((req) => GameCatalog.lookupHideout(req.params.id)),
);

// ---- Quests -----------------------------------------------------------
router.get(
  '/quests',
  wrap(() => GameCatalog.allQuests()),
);
router.get(
  '/quests/:id',
  wrap((req) => GameCatalog.lookupQuest(req.params.id)),
);

// ---- MetaForge-backed endpoints (richer schema) -----------------------
// /api/catalog/mf/items                   - full MetaForge item catalog
// /api/catalog/mf/items/:id               - lookup single item (mf only)
// /api/catalog/mf/arcs                    - ARC enemy units with icons + loot
// /api/catalog/mf/arcs/:id                - lookup single arc
// /api/catalog/mf/quests                  - MetaForge quests
// /api/catalog/mf/traders                 - vendor inventories by trader
// /api/catalog/mf/events-schedule         - upcoming event timers
// /api/catalog/mf/map-data/:mapId         - per-map MetaForge data
// /api/catalog/mf/status                  - cache status (debug)
router.get(
  '/mf/items',
  wrap(() => MetaForgeCatalog.allItems()),
);
router.get(
  '/mf/items/:id',
  wrap((req) => MetaForgeCatalog.lookupItem(req.params.id)),
);
router.get(
  '/mf/arcs',
  wrap(() => MetaForgeCatalog.allArcs()),
);
router.get(
  '/mf/arcs/:id',
  wrap((req) => MetaForgeCatalog.lookupArc(req.params.id)),
);
router.get(
  '/mf/quests',
  wrap(() => MetaForgeCatalog.allQuests()),
);
router.get(
  '/mf/traders',
  wrap(() => MetaForgeCatalog.allTraders()),
);
router.get(
  '/mf/events-schedule',
  wrap(() => MetaForgeAPI.getEventsSchedule()),
);
router.get(
  '/mf/event-timers',
  wrap((req) =>
    MetaForgeAPI.getEventTimers({ map: req.query.map, name: req.query.name }),
  ),
);
router.get(
  '/mf/map-data/:mapId',
  wrap((req) => MetaForgeAPI.getMapData(req.params.mapId)),
);
router.get('/mf/status', (_req, res) => res.json(MetaForgeCatalog.status()));

// ---- ARDB static data endpoints ----------------------------------------
// /api/items            - all 567 ARDB items
// /api/items/:id        - single item with recycling + tag
// /api/tags             - all keep/sell/recycle tags
// /api/quests             - all 100 quests with chains
// /api/quests/:id         - single quest
// /api/projects           - projects with phases + requirements
// /api/arc-enemies        - ARC enemies/bots with drops + images
// /api/arc-enemies/:id    - single ARC enemy by id/name/targetId
router.get(
  '/ardb/items',
  wrap(() => ArdbService.allItems()),
);
router.get(
  '/ardb/items/:id',
  wrap((req) => ArdbService.lookupItem(req.params.id)),
);
router.get(
  '/ardb/tags',
  wrap(() => {
    const all = ArdbService.allItems();
    const tags = {};
    for (const item of all) {
      if (item.tag) tags[item.id] = item.tag;
    }
    return tags;
  }),
);
router.get(
  '/ardb/quests',
  wrap(() => ArdbService.allQuests()),
);
router.get(
  '/ardb/quests/:id',
  wrap((req) => ArdbService.lookupQuest(req.params.id)),
);
router.get(
  '/ardb/projects',
  wrap(() => ArdbService.allProjects()),
);
router.get(
  '/ardb/arc-enemies',
  wrap(() => ArdbService.allArcEnemies()),
);
router.get(
  '/ardb/arc-enemies/:id',
  wrap((req) => ArdbService.lookupArcEnemy(req.params.id)),
);

export default router;
