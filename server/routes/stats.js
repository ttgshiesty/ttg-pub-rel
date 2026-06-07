/* =========================================================
   Stats Routes — exposes the aggregated MetaForge-style stats.
   ========================================================= */

import express from 'express';
import { buildStatsOverview } from '../services/statsAggregator.js';
import { ArcTrackerAPI } from '../services/arctracker.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();
router.use(requireAuth);

// Per-user in-memory cache: stats are heavy to compute so we cache 5s.
const statsCache = new Map();
const STATS_TTL_MS = 5 * 1000;

// Diagnostic: dump exactly what shape ArcTracker is returning for rounds.
// Helpful for confirming which fields are present before we map them.
router.get('/debug', async (req, res) => {
  try {
    const { UserDataAPI } = await import('../services/userDataApi.js');
    const rounds = await UserDataAPI.getRounds(req.user.id).catch((e) => ({
      error: e.message,
    }));
    const overview = await buildStatsOverview(req.user.id).catch((e) => ({
      error: e.message,
    }));
    const sample = Array.isArray(rounds) ? rounds.slice(0, 3) : rounds;
    res.json({
      roundsCount: Array.isArray(rounds) ? rounds.length : 0,
      sampleRound:
        Array.isArray(rounds) && rounds[0] ? Object.keys(rounds[0]) : [],
      sampleRoundFull: sample,
      overview: {
        performance: overview.performance,
        combat: overview.combat,
        economy: overview.economy,
        scavenging_and_world: overview.scavenging_and_world,
        enemiesCount: overview.enemies?.length || 0,
        weaponsCount: overview.weapons?.length || 0,
        mapsCount: overview.maps?.length || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Walks an object and produces a shape map: { fieldName: "type" | nested }.
// Arrays show as `array<elementShape>` based on the first element. Capped depth
// to keep output small.
function describeShape(val, depth = 0) {
  if (depth > 4) return '...';
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (Array.isArray(val)) {
    if (val.length === 0) return 'array<empty>';
    return [`array<len=${val.length}>`, describeShape(val[0], depth + 1)];
  }
  const t = typeof val;
  if (t !== 'object') {
    // Show a sample of the primitive value for context.
    const sample =
      t === 'string' && val.length > 60 ? val.slice(0, 60) + '...' : val;
    return `${t}: ${JSON.stringify(sample)}`;
  }
  const out = {};
  for (const [k, v] of Object.entries(val)) {
    out[k] = describeShape(v, depth + 1);
  }
  return out;
}

// Diagnostic: dump the field schema (with sample values) from EVERY ArcTracker
// endpoint so you can audit what's available vs what we're using.
//   GET /api/stats/schema           — every endpoint
//   GET /api/stats/schema?ep=rounds — one endpoint only
router.get('/schema', async (req, res) => {
  try {
    const u = await User.findOne({ id: req.user.id }).select(
      '+arctrackerUserKey',
    );
    const key = u?.arctrackerUserKey;
    if (!key) {
      return res.status(400).json({
        error:
          'No ArcTracker key linked. Link one in Settings before calling this endpoint.',
      });
    }

    // Map of friendly names -> ArcTrackerAPI calls.
    const endpoints = {
      profile: () => ArcTrackerAPI.getProfile(key),
      stash: () => ArcTrackerAPI.getStash(key, { perPage: 5 }),
      loadout: () => ArcTrackerAPI.getLoadout(key),
      quests: () => ArcTrackerAPI.getQuests(key),
      hideout: () => ArcTrackerAPI.getHideout(key),
      projects: () => ArcTrackerAPI.getProjects(key),
      rounds: () => ArcTrackerAPI.getRounds(key, { limit: 3 }),
      blueprints: () => ArcTrackerAPI.getBlueprints(key),
    };

    const onlyEndpoint = req.query.ep ? String(req.query.ep) : null;
    const targets = onlyEndpoint
      ? { [onlyEndpoint]: endpoints[onlyEndpoint] }
      : endpoints;

    const out = {};
    await Promise.all(
      Object.entries(targets).map(async ([name, fn]) => {
        if (!fn) {
          out[name] = { error: 'unknown endpoint' };
          return;
        }
        try {
          const data = await fn();
          // Pull out the top-level array container if present (e.g. items/rounds/quests).
          let sampleArrayName = null;
          let sampleArray = null;
          if (data && typeof data === 'object' && !Array.isArray(data)) {
            for (const [k, v] of Object.entries(data)) {
              if (Array.isArray(v) && v.length > 0) {
                sampleArrayName = k;
                sampleArray = v;
                break;
              }
            }
          } else if (Array.isArray(data)) {
            sampleArrayName = '<root>';
            sampleArray = data;
          }

          out[name] = {
            topLevelKeys:
              data && typeof data === 'object' && !Array.isArray(data)
                ? Object.keys(data)
                : '<array>',
            arrayField: sampleArrayName,
            arrayCount: sampleArray ? sampleArray.length : 0,
            elementFields:
              sampleArray && sampleArray[0] ? Object.keys(sampleArray[0]) : [],
            elementShape:
              sampleArray && sampleArray[0]
                ? describeShape(sampleArray[0])
                : null,
            // First element raw for quick visual scan.
            elementSample: sampleArray ? sampleArray[0] : null,
            // For non-array endpoints (profile, etc.), dump the shape directly.
            rootShape: !sampleArray ? describeShape(data) : undefined,
          };
        } catch (err) {
          out[name] = { error: err.message, status: err.status };
        }
      }),
    );

    res.json({
      generatedAt: new Date().toISOString(),
      endpoints: out,
      hint: 'Use ?ep=<name> to fetch one endpoint. Names: profile, stash, loadout, quests, hideout, projects, rounds, blueprints.',
    });
  } catch (err) {
    console.error('[Stats] Schema dump error:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

router.get('/overview', async (req, res) => {
  try {
    const cacheKey = req.user.id;
    const cached = statsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() && !req.query.fresh) {
      return res.json(cached.data);
    }

    const data = await buildStatsOverview(req.user.id);
    statsCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + STATS_TTL_MS,
    });
    res.json(data);
  } catch (err) {
    console.error('[Stats] Overview error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
