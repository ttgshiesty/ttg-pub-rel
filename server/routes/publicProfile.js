/* =========================================================
   Public profile routes — no auth required.
   GET  /api/profile/:slug              → profile + stats
   GET  /api/profile/:slug/listings     → active marketplace listings
   GET  /api/profile/:slug/recent       → recent rounds (if user opted in)
   POST /api/slug                       → claim/update own slug (auth)
   ========================================================= */

import express from 'express';
import { User } from '../models/User.js';
import { MarketplaceListing } from '../models/MarketplaceListing.js';
import { buildStatsOverview } from '../services/statsAggregator.js';

const router = express.Router();

// --- helpers ----------------------------------------------------
const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 32);

async function findUserBySlugOrUsername(slug) {
  if (!slug) return null;
  const norm = slugify(slug);
  // Prefer slug match; fall back to case-insensitive username.
  return (
    (await User.findOne({ slug: norm })) ||
    (await User.findOne({
      username: { $regex: `^${norm.replace(/-/g, '.?')}$`, $options: 'i' },
    }))
  );
}

function publicSummary(user, overview = null) {
  // Use live computed stats from aggregator if available, fallback to cached user fields
  const totalRaids = overview?.performance?.totalRounds ?? user.totalRaids ?? 0;
  const successfulExtractions =
    overview?.performance?.successfulRaids ?? user.successfulExtractions ?? 0;
  const totalKills = overview?.combat?.kills ?? user.totalKills ?? 0;
  const deaths = overview
    ? totalRaids - successfulExtractions
    : Math.max(1, totalRaids - successfulExtractions);

  return {
    id: user.id,
    username: user.username,
    displayName:
      user.profile?.full_name ||
      user.discordProfile?.globalName ||
      user.displayName ||
      user.username,
    avatar:
      user.profile?.avatar_url ||
      user.discordProfile?.avatarUrl ||
      (user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : null),
    profile: user.profile || {},
    discordProfile: user.discordProfile || {},
    metaForgeProfile: user.metaForgeProfile || {},
    linkedIdentities: user.linkedIdentities || [],
    bio: user.bio || '',
    slug: user.slug || null,
    embarkLinked: user.embarkLinked ?? false,
    embarkUsername:
      user.profile?.embark_id || user.embarkUsername || user.embarkId || null,
    level: user.level || 1,
    xp: user.xp || 0,
    totalXp: user.totalXp || 0,
    storefrontName: user.storefrontName || '',
    storefrontDescription: user.storefrontDescription || '',
    badges: user.badges || [],
    salesCount: user.salesCount || 0,
    marketplaceRep: user.marketplaceRep || 0,
    stats: {
      totalRaids,
      successfulExtractions,
      totalKills,
      netProfit: overview?.economy?.netProfit ?? user.netProfit ?? 0,
      stashValue: overview?.economy?.stashValue ?? user.stashValue ?? 0,
      kd: deaths > 0 ? +(totalKills / deaths).toFixed(2) : totalKills,
      extractRate:
        totalRaids > 0
          ? Math.round((successfulExtractions / totalRaids) * 100)
          : 0,
    },
    createdAt: user.createdAt,
  };
}

// --- routes -----------------------------------------------------

// GET /api/profile/:slug
router.get('/profile/:slug', async (req, res) => {
  try {
    const user = await findUserBySlugOrUsername(req.params.slug);
    if (!user) return res.status(404).json({ error: 'Profile not found' });
    if (user.profilePublic === false) {
      return res.status(403).json({ error: 'Profile is private' });
    }
    // Try to get live stats from aggregator for accurate K/D and other metrics
    const overview = await buildStatsOverview(user.id).catch(() => null);
    res.json(publicSummary(user, overview));
  } catch (err) {
    console.error('[PublicProfile] error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/profile/:slug/listings
router.get('/profile/:slug/listings', async (req, res) => {
  try {
    const user = await findUserBySlugOrUsername(req.params.slug);
    if (!user) return res.status(404).json({ error: 'Profile not found' });
    if (user.profilePublic === false) {
      return res.status(403).json({ error: 'Profile is private' });
    }
    const listings = await MarketplaceListing.find({
      sellerId: user.id,
      status: 'active',
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ listings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/profile/:slug/recent — last 10 rounds (only if user has ArcTracker linked)
router.get('/profile/:slug/recent', async (req, res) => {
  try {
    const user = await findUserBySlugOrUsername(req.params.slug);
    if (!user) return res.status(404).json({ error: 'Profile not found' });
    if (user.profilePublic === false) {
      return res.status(403).json({ error: 'Profile is private' });
    }
    const overview = await buildStatsOverview(user.id).catch(() => null);
    const rounds = Array.isArray(overview?.recentRounds)
      ? overview.recentRounds
      : [];
    res.json({ rounds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/slug — claim or update slug for current user
router.post('/slug', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  const desired = slugify(req.body?.slug);
  if (!desired || desired.length < 3) {
    return res
      .status(400)
      .json({ error: 'Slug must be 3+ chars (a-z, 0-9, _, -)' });
  }
  // Reserved
  const reserved = new Set([
    'admin',
    'api',
    'auth',
    'u',
    'me',
    'settings',
    'public',
  ]);
  if (reserved.has(desired)) {
    return res.status(400).json({ error: 'Reserved slug' });
  }
  const conflict = await User.findOne({
    slug: desired,
    id: { $ne: req.user.id },
  });
  if (conflict) return res.status(409).json({ error: 'Slug already taken' });
  await User.updateOne({ id: req.user.id }, { slug: desired });
  res.json({ slug: desired });
});

// POST /api/visibility — toggle private
router.post('/visibility', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  const isPublic = !!req.body?.public;
  await User.updateOne({ id: req.user.id }, { profilePublic: isPublic });
  res.json({ profilePublic: isPublic });
});

export default router;
