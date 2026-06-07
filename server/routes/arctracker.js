/* =========================================================
   ArcTracker user-key management routes
   - Link / unlink / status / verify
   ========================================================= */

import express from 'express';
import { User } from '../models/User.js';
import { ArcTrackerAPI } from '../services/arctracker.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

// Public ArcTracker catalog endpoints. These still use the server-side
// X-App-Key, but do not require a linked user key.
router.get('/public/items', async (req, res) => {
  try {
    const data = await ArcTrackerAPI.getItems({ locale: req.query.locale });
    res.set(
      'Cache-Control',
      'public, max-age=300, stale-while-revalidate=3600',
    );
    res.json(data);
  } catch (err) {
    console.error('[ArcTracker] public items error:', err);
    res.status(502).json({ error: err.message });
  }
});

router.get('/public/quests', async (req, res) => {
  try {
    const data = await ArcTrackerAPI.getPublicQuests({
      locale: req.query.locale,
    });
    res.set(
      'Cache-Control',
      'public, max-age=300, stale-while-revalidate=3600',
    );
    res.json(data);
  } catch (err) {
    console.error('[ArcTracker] public quests error:', err);
    res.status(502).json({ error: err.message });
  }
});

router.get('/public/hideout', async (req, res) => {
  try {
    const data = await ArcTrackerAPI.getPublicHideout({
      locale: req.query.locale,
    });
    res.set(
      'Cache-Control',
      'public, max-age=300, stale-while-revalidate=3600',
    );
    res.json(data);
  } catch (err) {
    console.error('[ArcTracker] public hideout error:', err);
    res.status(502).json({ error: err.message });
  }
});

router.get('/public/projects', async (req, res) => {
  try {
    const data = req.query.season
      ? await ArcTrackerAPI.getPublicProjects({
          locale: req.query.locale,
          season: req.query.season,
        })
      : await ArcTrackerAPI.getPublicProjectsAllSeasons({
          locale: req.query.locale,
        });
    res.set(
      'Cache-Control',
      'public, max-age=300, stale-while-revalidate=3600',
    );
    res.json(data);
  } catch (err) {
    console.error('[ArcTracker] public projects error:', err);
    res.status(502).json({ error: err.message });
  }
});

router.use(requireAuth);

// GET /api/arctracker/status — does the current user have a linked key?
router.get('/status', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).select(
      '+arctrackerUserKey +arctrackerTradeKey arctrackerLinkedAt arctrackerTokenExpiresAt arctrackerTradeLinkedAt arctrackerTradeTokenExpiresAt arctrackerTradeUsername',
    );

    const now = new Date();
    const mainExpiresAt = user?.arctrackerTokenExpiresAt;
    const tradeExpiresAt = user?.arctrackerTradeTokenExpiresAt;

    res.json({
      linked: !!user?.arctrackerUserKey,
      linkedAt: user?.arctrackerLinkedAt || null,
      tokenExpiresAt: mainExpiresAt,
      tokenExpired: mainExpiresAt ? now > new Date(mainExpiresAt) : null,
      timeUntilExpiry: mainExpiresAt
        ? Math.max(0, new Date(mainExpiresAt) - now)
        : null,
      tradeLinked: !!user?.arctrackerTradeKey,
      tradeLinkedAt: user?.arctrackerTradeLinkedAt || null,
      tradeTokenExpiresAt: tradeExpiresAt,
      tradeTokenExpired: tradeExpiresAt ? now > new Date(tradeExpiresAt) : null,
      tradeTimeUntilExpiry: tradeExpiresAt
        ? Math.max(0, new Date(tradeExpiresAt) - now)
        : null,
      tradeUsername: user?.arctrackerTradeUsername || null,
    });
  } catch (err) {
    console.error('[ArcTracker] status error:', err);
    res.status(500).json({ error: 'Failed to read status' });
  }
});

// GET /api/arctracker/diagnostics?account=main|trade
// Checks the linked ArcTracker user endpoints and reports which payloads fail.
router.get('/diagnostics', async (req, res) => {
  try {
    const account = req.query.account === 'trade' ? 'trade' : 'main';
    const user = await User.findOne({ id: req.user.id }).select(
      '+arctrackerUserKey +arctrackerTradeKey',
    );
    const userKey =
      account === 'trade' ? user?.arctrackerTradeKey : user?.arctrackerUserKey;

    if (!userKey) {
      return res.status(400).json({
        error:
          account === 'trade'
            ? 'No trade ArcTracker key linked'
            : 'No ArcTracker key linked',
      });
    }

    const diagnostics = await ArcTrackerAPI.runDiagnostics(userKey);
    res.json({ account, ...diagnostics });
  } catch (err) {
    console.error('[ArcTracker] diagnostics error:', err);
    res.status(500).json({ error: 'Failed to run ArcTracker diagnostics' });
  }
});

// POST /api/arctracker/link — body: { userKey: "arc_u1_..." }
router.post('/link', async (req, res) => {
  try {
    const userKey = (req.body?.userKey || '').trim();
    if (!userKey) {
      return res.status(400).json({ error: 'userKey is required' });
    }
    if (!userKey.startsWith('arc_u1_')) {
      return res
        .status(400)
        .json({ error: 'Invalid key format (must start with "arc_u1_")' });
    }

    // Verify the key works by hitting /api/v2/user/profile
    let profile;
    try {
      profile = await ArcTrackerAPI.getProfile(userKey);
    } catch (err) {
      return res.status(400).json({
        error: `ArcTracker rejected the key: ${err.message}`,
      });
    }

    const now = new Date();
    const tokenExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.findOneAndUpdate(
      { id: req.user.id },
      {
        arctrackerUserKey: userKey,
        arctrackerLinkedAt: now,
        arctrackerTokenExpiresAt: tokenExpiresAt,
        ...(profile?.username ? { displayName: profile.username } : {}),
      },
      { new: true, returnDocument: 'after' },
    );

    res.json({
      status: 'linked',
      profile: {
        username: profile?.username || null,
        level: profile?.playerLevel ?? profile?.level ?? null,
        memberSince: profile?.memberSince || null,
      },
      linkedAt: user.arctrackerLinkedAt,
      tokenExpiresAt: user.arctrackerTokenExpiresAt,
    });
  } catch (err) {
    console.error('[ArcTracker] link error:', err);
    res.status(500).json({ error: 'Failed to link key' });
  }
});

// POST /api/arctracker/link-trade — body: { userKey: "arc_u1_..." }
// Stores a SECOND ArcTracker key used only for blueprints/stash views on a
// separate trading account. Doesn't touch the primary key/profile.
router.post('/link-trade', async (req, res) => {
  try {
    const userKey = (req.body?.userKey || '').trim();
    if (!userKey) return res.status(400).json({ error: 'userKey is required' });
    if (!userKey.startsWith('arc_u1_')) {
      return res
        .status(400)
        .json({ error: 'Invalid key format (must start with "arc_u1_")' });
    }
    let profile;
    try {
      profile = await ArcTrackerAPI.getProfile(userKey);
    } catch (err) {
      return res
        .status(400)
        .json({ error: `ArcTracker rejected the trade key: ${err.message}` });
    }

    const now = new Date();
    const tokenExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.findOneAndUpdate(
      { id: req.user.id },
      {
        arctrackerTradeKey: userKey,
        arctrackerTradeLinkedAt: now,
        arctrackerTradeTokenExpiresAt: tokenExpiresAt,
        arctrackerTradeUsername: profile?.username || null,
      },
      { returnDocument: 'after' },
    );
    res.json({
      status: 'linked',
      profile: {
        username: profile?.username || null,
        level: profile?.playerLevel ?? profile?.level ?? null,
      },
      linkedAt: user.arctrackerTradeLinkedAt,
      tokenExpiresAt: user.arctrackerTradeTokenExpiresAt,
    });
  } catch (err) {
    console.error('[ArcTracker] link-trade error:', err);
    res.status(500).json({ error: 'Failed to link trade key' });
  }
});

// POST /api/arctracker/unlink-trade
router.post('/unlink-trade', async (req, res) => {
  try {
    await User.updateOne(
      { id: req.user.id },
      {
        arctrackerTradeKey: null,
        arctrackerTradeLinkedAt: null,
        arctrackerTradeTokenExpiresAt: null,
        arctrackerTradeUsername: null,
      },
    );
    res.json({ status: 'unlinked' });
  } catch (err) {
    console.error('[ArcTracker] unlink-trade error:', err);
    res.status(500).json({ error: 'Failed to unlink trade key' });
  }
});

// POST /api/arctracker/unlink — clears the user's stored key
router.post('/unlink', async (req, res) => {
  try {
    await User.updateOne(
      { id: req.user.id },
      {
        arctrackerUserKey: null,
        arctrackerLinkedAt: null,
        arctrackerTokenExpiresAt: null,
      },
    );
    res.json({ status: 'unlinked' });
  } catch (err) {
    console.error('[ArcTracker] unlink error:', err);
    res.status(500).json({ error: 'Failed to unlink key' });
  }
});

// ============================================================================
// Authenticated User Data Proxy Routes
// These proxy to ArcTracker API using the user's linked key
// ============================================================================

// GET /api/arctracker/user/profile — scope: profile:read
router.get('/user/profile', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).select('+arctrackerUserKey');
    if (!user?.arctrackerUserKey) {
      return res.status(400).json({ error: 'No ArcTracker key linked. Link your key first.' });
    }
    const data = await ArcTrackerAPI.getProfile(user.arctrackerUserKey, {
      locale: req.query.locale,
    });
    res.json(data);
  } catch (err) {
    console.error('[ArcTracker] user/profile error:', err);
    res.status(502).json({ error: err.message });
  }
});

// GET /api/arctracker/user/stash — scope: stash:read
router.get('/user/stash', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).select('+arctrackerUserKey');
    if (!user?.arctrackerUserKey) {
      return res.status(400).json({ error: 'No ArcTracker key linked. Link your key first.' });
    }
    const data = await ArcTrackerAPI.getStash(user.arctrackerUserKey, {
      locale: req.query.locale,
      page: req.query.page ? Number(req.query.page) : 1,
      perPage: req.query.per_page ? Number(req.query.per_page) : 500,
    });
    res.json(data);
  } catch (err) {
    console.error('[ArcTracker] user/stash error:', err);
    res.status(502).json({ error: err.message });
  }
});

// GET /api/arctracker/user/loadout — scope: loadout:read
router.get('/user/loadout', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).select('+arctrackerUserKey');
    if (!user?.arctrackerUserKey) {
      return res.status(400).json({ error: 'No ArcTracker key linked. Link your key first.' });
    }
    const data = await ArcTrackerAPI.getLoadout(user.arctrackerUserKey, {
      locale: req.query.locale,
    });
    res.json(data);
  } catch (err) {
    console.error('[ArcTracker] user/loadout error:', err);
    res.status(502).json({ error: err.message });
  }
});

// GET /api/arctracker/user/quests — scope: quests:read
router.get('/user/quests', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).select('+arctrackerUserKey');
    if (!user?.arctrackerUserKey) {
      return res.status(400).json({ error: 'No ArcTracker key linked. Link your key first.' });
    }
    const data = await ArcTrackerAPI.getQuests(user.arctrackerUserKey, {
      locale: req.query.locale,
      filter: req.query.filter,
    });
    res.json(data);
  } catch (err) {
    console.error('[ArcTracker] user/quests error:', err);
    res.status(502).json({ error: err.message });
  }
});

// GET /api/arctracker/user/hideout — scope: hideout:read
router.get('/user/hideout', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).select('+arctrackerUserKey');
    if (!user?.arctrackerUserKey) {
      return res.status(400).json({ error: 'No ArcTracker key linked. Link your key first.' });
    }
    const data = await ArcTrackerAPI.getHideout(user.arctrackerUserKey, {
      locale: req.query.locale,
    });
    res.json(data);
  } catch (err) {
    console.error('[ArcTracker] user/hideout error:', err);
    res.status(502).json({ error: err.message });
  }
});

// GET /api/arctracker/user/projects — scope: projects:read
router.get('/user/projects', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).select('+arctrackerUserKey');
    if (!user?.arctrackerUserKey) {
      return res.status(400).json({ error: 'No ArcTracker key linked. Link your key first.' });
    }
    const data = await ArcTrackerAPI.getProjects(user.arctrackerUserKey, {
      locale: req.query.locale,
      season: req.query.season ? Number(req.query.season) : undefined,
    });
    res.json(data);
  } catch (err) {
    console.error('[ArcTracker] user/projects error:', err);
    res.status(502).json({ error: err.message });
  }
});

// GET /api/arctracker/user/rounds — scope: rounds:read
router.get('/user/rounds', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).select('+arctrackerUserKey');
    if (!user?.arctrackerUserKey) {
      return res.status(400).json({ error: 'No ArcTracker key linked. Link your key first.' });
    }
    const data = await ArcTrackerAPI.getRounds(user.arctrackerUserKey, {
      locale: req.query.locale,
      limit: req.query.limit ? Number(req.query.limit) : 5000,
      offset: req.query.offset ? Number(req.query.offset) : 0,
      outcome: req.query.outcome,
      map: req.query.map,
      season: req.query.season ? Number(req.query.season) : undefined,
      dateFrom: req.query.date_from,
      dateTo: req.query.date_to,
      sort: req.query.sort,
    });
    res.json(data);
  } catch (err) {
    console.error('[ArcTracker] user/rounds error:', err);
    res.status(502).json({ error: err.message });
  }
});

// GET /api/arctracker/user/blueprints — scope: blueprints:read
router.get('/user/blueprints', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).select('+arctrackerUserKey');
    if (!user?.arctrackerUserKey) {
      return res.status(400).json({ error: 'No ArcTracker key linked. Link your key first.' });
    }
    const data = await ArcTrackerAPI.getBlueprints(user.arctrackerUserKey, {
      locale: req.query.locale,
      filter: req.query.filter,
    });
    res.json(data);
  } catch (err) {
    console.error('[ArcTracker] user/blueprints error:', err);
    res.status(502).json({ error: err.message });
  }
});

export default router;
