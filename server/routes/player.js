import logger from '../utils/logger.js';
import express from 'express';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { MarketplaceListing } from '../models/MarketplaceListing.js';
import { BlueprintFind } from '../models/BlueprintFind.js';
import { UserDataAPI } from '../services/userDataApi.js';
import { DiscordBot } from '../services/discordBot.js';
import { SyncData } from '../models/SyncData.js';
import { buildStatsOverview } from '../services/statsAggregator.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { MetaForgeCatalog } from '../services/metaforgeCatalog.js';
import { enrichStashItems } from '../data/items/index.js';
import {
  getBlueprintIntel,
  getBlueprintIntelMap,
  summarizeBlueprintListings,
} from '../services/blueprintIntel.js';

function statsCompatibilityView(overview) {
  if (!overview || typeof overview !== 'object') return null;
  const canonical = overview.canonicalStats || overview.totals || {};
  const performance = overview.performance || {};
  const combat = overview.combat || {};
  const economy = overview.economy || {};

  return {
    ...overview,
    totalRaids: canonical.totalRounds ?? performance.totalRounds ?? 0,
    totalRounds: canonical.totalRounds ?? performance.totalRounds ?? 0,
    successfulExtractions:
      canonical.totalExtracted ?? performance.successfulRaids ?? 0,
    totalExtracted:
      canonical.totalExtracted ?? performance.successfulRaids ?? 0,
    failedRaids: canonical.totalDied ?? 0,
    totalDied: canonical.totalDied ?? 0,
    totalKills: canonical.totalKills ?? combat.kills ?? 0,
    arcKills: canonical.totalArcKills ?? combat.arcKills ?? 0,
    totalArcKills: canonical.totalArcKills ?? combat.arcKills ?? 0,
    playerKills: canonical.totalPlayerKills ?? combat.playerKills ?? 0,
    totalPlayerKills:
      canonical.totalPlayerKills ?? combat.playerKills ?? 0,
    totalDamage: canonical.totalDamage ?? combat.damageDealt ?? 0,
    damage: canonical.totalDamage ?? combat.damageDealt ?? 0,
    netProfit: canonical.totalNetValue ?? economy.netProfit ?? 0,
    totalNetValue: canonical.totalNetValue ?? economy.netProfit ?? 0,
    lootValue: canonical.totalValueExtracted ?? 0,
    totalContainersLooted: canonical.totalContainersLooted ?? 0,
    containersLooted: canonical.totalContainersLooted ?? 0,
    survivalRate:
      canonical.survivalRate ?? performance.survivalRate ?? 0,
    kdRatio: canonical.kdRatio ?? performance.kdRatio ?? 0,
  };
}

function normalizedWeaponStatsView(overview) {
  const rows =
    overview?.canonicalStats?.topWeapons ||
    overview?.topWeapons ||
    overview?.weapons ||
    [];

  return {
    weapons: (Array.isArray(rows) ? rows : []).map((weapon) => ({
      ...weapon,
      weaponAssetId:
        weapon.weaponAssetId ?? weapon.weapon_asset_id ?? weapon.assetId ?? null,
      itemId: weapon.itemId ?? weapon.item_id ?? null,
      name: weapon.name ?? weapon.weaponName ?? weapon.weapon_name ?? 'Unknown',
      count: Number(weapon.count ?? weapon.kills ?? 0),
      kills: Number(weapon.kills ?? weapon.count ?? 0),
      damage: Number(weapon.damage ?? weapon.amount ?? 0),
    })),
    source: 'statsAggregator',
  };
}

function normalizedEnemyStatsView(overview) {
  const rows =
    overview?.canonicalStats?.arcEnemiesByType ||
    overview?.enemies ||
    overview?.combat_detailed?.enemies ||
    [];

  return {
    enemies: (Array.isArray(rows) ? rows : []).map((enemy) => ({
      ...enemy,
      targetId: enemy.targetId ?? enemy.target_id ?? enemy.id ?? null,
      name: enemy.name ?? enemy.enemyName ?? enemy.enemy_name ?? 'Unknown',
      count: Number(enemy.count ?? enemy.kills ?? 0),
      kills: Number(enemy.kills ?? enemy.count ?? 0),
      damage: Number(enemy.damage ?? enemy.amount ?? 0),
    })),
    source: 'statsAggregator',
  };
}

function normalizedMapStatsView(overview) {
  const rows =
    overview?.canonicalStats?.mapPerformance ||
    overview?.mapPerformance?.maps ||
    overview?.maps ||
    overview?.map_specific_data ||
    [];

  return {
    maps: (Array.isArray(rows) ? rows : []).map((map) => {
      const raids = Number(
        map.raids ?? map.rounds ?? map.roundsPlayed ?? map.rounds_played ?? 0,
      );
      const extracted = Number(
        map.extracted ?? map.extractions ?? map.totalExtracted ?? 0,
      );
      const totalDurationMs = Number(
        map.totalDurationMs ??
          map.durationMs ??
          (Number(map.time_topside ?? map.timeTopside ?? 0) * 1000),
      );
      const totalNetValue = Number(
        map.totalNetValue ?? map.netValue ?? map.netProfit ?? map.net_profit ?? 0,
      );

      return {
        ...map,
        mapTargetId:
          map.mapTargetId ??
          map.targetId ??
          map.mapId ??
          map.map_id ??
          map.map_target_id ??
          map.id ??
          null,
        mapId:
          map.mapId ??
          map.map_id ??
          map.mapTargetId ??
          map.map_target_id ??
          map.targetId ??
          map.id ??
          null,
        mapName:
          map.mapName ?? map.map_name ?? map.map ?? map.name ?? 'Unknown',
        raids,
        extracted,
        totalDurationMs,
        totalNetValue,
        survivalRate: Number(
          map.survivalRate ??
            map.survival_rate ??
            (raids > 0 ? Number(((extracted / raids) * 100).toFixed(2)) : 0),
        ),
        avgDurationMs: Number(
          map.avgDurationMs ??
            (raids > 0 ? Math.round(totalDurationMs / raids) : 0),
        ),
        avgNetValue: Number(
          map.avgNetValue ??
            (raids > 0 ? Math.round(totalNetValue / raids) : 0),
        ),
      };
    }),
    source: 'statsAggregator',
  };
}

// Helper: fetch the current user's ArcTracker key (a "select: false" field).
async function getArcTrackerKey(userId) {
  const u = await User.collection.findOne(
    { id: userId },
    { projection: { arctrackerUserKey: 1 } },
  );
  return u?.arctrackerUserKey || null;
}

async function findUserWithoutDemonStreak(userId, { hydrate = false } = {}) {
  const raw = await User.collection.findOne(
    { id: userId },
    { projection: { demonStreak: 0 } },
  );
  if (!raw) return null;
  return hydrate ? User.hydrate(raw) : raw;
}

// Helper: silently swallow errors and return null
const safe = (p) => p.catch(() => null);

const router = express.Router();

// ─── Raider-Hub TTL cache (60s per userId) ────────────────────────────────
const _hubCache = new Map(); // userId → { data, ts }
const HUB_TTL_MS = 60 * 1000; // 60 seconds — reduces upstream API call storms
function getHubCache(userId) {
  const entry = _hubCache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.ts > HUB_TTL_MS) {
    _hubCache.delete(userId);
    return null;
  }
  return entry.data;
}
function setHubCache(userId, data) {
  _hubCache.set(userId, { data, ts: Date.now() });
}

router.use(requireAuth);

const clampText = (value, max = 160) =>
  String(value ?? '')
    .trim()
    .slice(0, max);

function getAvatarUrl(discordId, avatarHash) {
  if (!avatarHash) return null;
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.png`;
}

function getMetaForgeId(user) {
  const raw =
    user?.settings?.metaforgeId ||
    user?.metaForgeProfileId ||
    user?.metaForgeProfile?.id ||
    user?.metaForgeProfile?.profileId ||
    user?.profile?.embark_id ||
    user?.embarkId;
  if (!raw || typeof raw !== 'string') return null;
  return raw.trim() || null;
}

function applyAuthProfile(user, reqUser) {
  if (!user || !reqUser) return;
  const session =
    reqUser.authSession ||
    reqUser.session ||
    reqUser.supabaseSession ||
    reqUser.sessionData ||
    {};
  const metadata = reqUser.user_metadata || reqUser.userMetadata || {};
  const appMetadata = reqUser.app_metadata || reqUser.appMetadata || {};
  const identities = Array.isArray(reqUser.identities) ? reqUser.identities : [];
  const discordIdentity =
    identities.find((identity) => identity?.provider === 'discord') || null;
  const discordData = discordIdentity?.identity_data || metadata || {};
  const profile = {
    username:
      reqUser.profile?.username ||
      metadata.username ||
      discordData.username ||
      reqUser.username ||
      user.username,
    full_name:
      reqUser.profile?.full_name ||
      metadata.full_name ||
      discordData.full_name ||
      metadata.custom_claims?.global_name ||
      discordData.custom_claims?.global_name ||
      user.displayName ||
      user.username,
    avatar_url:
      reqUser.profile?.avatar_url ||
      metadata.avatar_url ||
      metadata.picture ||
      discordData.avatar_url ||
      discordData.picture ||
      getAvatarUrl(user.id, user.avatar),
    embark_id: reqUser.profile?.embark_id || user.embarkId || null,
  };

  user.authUser = {
    id: reqUser.id || user.id,
    aud: reqUser.aud || null,
    role: reqUser.role || null,
    email: reqUser.email || metadata.email || discordData.email || null,
    email_confirmed_at: reqUser.email_confirmed_at || null,
    phone: reqUser.phone || '',
    confirmation_sent_at: reqUser.confirmation_sent_at || null,
    confirmed_at: reqUser.confirmed_at || null,
    last_sign_in_at: reqUser.last_sign_in_at || null,
    created_at: reqUser.created_at || null,
    updated_at: reqUser.updated_at || null,
    is_anonymous: reqUser.is_anonymous || false,
  };
  user.authSession = {
    token_type: session.token_type || session.tokenType || 'bearer',
    expires_in: session.expires_in || session.expiresIn || null,
    expires_at: session.expires_at || session.expiresAt || null,
    refresh_token: session.refresh_token || session.refreshToken || null,
    user: user.authUser,
  };
  user.appMetadata = appMetadata;
  user.userMetadata = metadata;
  user.linkedIdentities = identities;
  user.profile = { ...(user.profile || {}), ...profile };
  user.discordProfile = {
    id:
      metadata.provider_id ||
      metadata.sub ||
      discordData.provider_id ||
      discordData.sub ||
      user.id,
    username:
      metadata.username ||
      discordData.username ||
      metadata.name ||
      discordData.name ||
      user.username,
    globalName:
      metadata.custom_claims?.global_name ||
      discordData.custom_claims?.global_name ||
      metadata.full_name ||
      discordData.full_name ||
      null,
    avatarUrl: profile.avatar_url,
    email: metadata.email || discordData.email || null,
  };
  if (profile.embark_id) user.embarkId = profile.embark_id;
  if (profile.username) user.username = user.username || profile.username;
  if (profile.full_name) user.displayName = user.displayName || profile.full_name;
}

function buildProfileSummary(user) {
  const now = new Date();
  const metaforgeId = getMetaForgeId(user);
  const arctrackerTokenExpiresAt = user.arctrackerTokenExpiresAt || null;
  const arctrackerTradeTokenExpiresAt =
    user.arctrackerTradeTokenExpiresAt || null;

  return {
    id: user.id,
    username: user.username || '',
    avatar: user.avatar || null,
    avatarUrl: getAvatarUrl(user.id, user.avatar),
    displayName:
      user.profile?.full_name ||
      user.discordProfile?.globalName ||
      user.displayName ||
      user.username ||
      null,
    profile: user.profile || {},
    authSession: user.authSession || {},
    authUser: user.authUser || {},
    appMetadata: user.appMetadata || {},
    userMetadata: user.userMetadata || {},
    linkedIdentities: user.linkedIdentities || [],
    discordProfile: user.discordProfile || {},
    metaForgeProfile: user.metaForgeProfile || {},
    bio: user.bio || '',
    slug: user.slug || null,
    profilePublic: user.profilePublic !== false,
    lastActive: user.lastActive || null,
    createdAt: user.createdAt || null,
    links: {
      discord: {
        linked: true,
        id: user.discordProfile?.id || user.id,
        username:
          user.discordProfile?.username ||
          user.discordProfile?.globalName ||
          user.username ||
          '',
        avatar: user.avatar || null,
        avatarUrl:
          user.discordProfile?.avatarUrl || getAvatarUrl(user.id, user.avatar),
        globalName: user.discordProfile?.globalName || null,
      },
      arctracker: {
        linked: !!user.arctrackerUserKey,
        linkedAt: user.arctrackerLinkedAt || null,
        tokenExpiresAt: arctrackerTokenExpiresAt,
        tokenExpired: arctrackerTokenExpiresAt
          ? now > new Date(arctrackerTokenExpiresAt)
          : null,
        tradeLinked: !!user.arctrackerTradeKey,
        tradeLinkedAt: user.arctrackerTradeLinkedAt || null,
        tradeTokenExpiresAt: arctrackerTradeTokenExpiresAt,
        tradeTokenExpired: arctrackerTradeTokenExpiresAt
          ? now > new Date(arctrackerTradeTokenExpiresAt)
          : null,
        tradeUsername: user.arctrackerTradeUsername || null,
      },
      metaforge: {
        linked: !!metaforgeId,
        id: metaforgeId,
        profile: user.metaForgeProfile || {},
        avatarUrl: user.profile?.avatar_url || user.metaForgeProfile?.avatar_url || null,
        embarkId: user.profile?.embark_id || user.embarkId || null,
        profileUrl: metaforgeId
          ? `https://metaforge.app/arc-raiders/raider/${encodeURIComponent(metaforgeId)}`
          : null,
        status: metaforgeId ? 'linked' : 'not_linked',
      },
    },
  };
}

// GET /api/player/blueprint-finds — Community blueprint drop reports
router.get('/blueprint-finds', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 80, 5000);
    const filter = {};
    if (req.query.blueprintId) {
      filter.blueprintId = String(req.query.blueprintId);
    }

    const [finds, mine, byMap, byContainer, activeBlueprintListings] =
      await Promise.all([
        BlueprintFind.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
        BlueprintFind.find({ userId: req.user.id })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
        BlueprintFind.aggregate([
          { $match: filter },
          { $group: { _id: '$map', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        BlueprintFind.aggregate([
          { $match: filter },
          { $group: { _id: '$container', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        MarketplaceListing.find({
          status: 'active',
          $or: [
            { itemType: /blueprint/i },
            { itemName: /blueprint/i },
            { 'itemStats.blueprintId': { $exists: true, $ne: null } },
          ],
        })
          .sort({ createdAt: -1 })
          .limit(300)
          .lean(),
      ]);

    res.json({
      finds,
      mine,
      byMap,
      byContainer,
      csvIntelByBlueprint: getBlueprintIntelMap(),
      marketplaceListingsByBlueprint: summarizeBlueprintListings(
        activeBlueprintListings,
      ),
    });
  } catch (err) {
    console.error('[Player] Blueprint finds fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/player/blueprint-finds — Log where a blueprint was found
router.post('/blueprint-finds', async (req, res) => {
  try {
    const blueprintId = clampText(req.body.blueprintId, 120);
    const blueprintName = clampText(req.body.blueprintName, 160);

    if (!blueprintId || !blueprintName) {
      return res
        .status(400)
        .json({ error: 'blueprintId and blueprintName are required' });
    }

    const user = await User.findOne({ id: req.user.id });
    const csvIntel =
      getBlueprintIntel(blueprintId) || getBlueprintIntel(blueprintName);

    const find = await BlueprintFind.create({
      userId: req.user.id,
      userName: user?.displayName || req.user.username,
      blueprintId,
      blueprintName,
      blueprintImageUrl: clampText(req.body.blueprintImageUrl, 400),
      rarity: clampText(req.body.rarity, 40) || 'Common',
      map: clampText(req.body.map || csvIntel?.map, 80),
      condition:
        clampText(req.body.condition || csvIntel?.condition, 60) || 'Any',
      container: clampText(req.body.container || csvIntel?.containers, 120),
      location: clampText(req.body.location || csvIntel?.locationNotes, 260),
      locked: Boolean(req.body.locked),
      notes: clampText(req.body.notes || csvIntel?.notes, 500),
      source: ['manual', 'sync', 'discord'].includes(req.body.source)
        ? req.body.source
        : 'manual',
    });

    let discordSent = false;
    if (user?.discordWebhookUrl) {
      try {
        const payload = DiscordBot.buildBlueprintFindEmbed(find, user);
        discordSent = await DiscordBot.sendWebhook(
          user.discordWebhookUrl,
          payload,
        );
      } catch {
        discordSent = false;
      }
    }

    res.json({ find, discordSent });
  } catch (err) {
    console.error('[Player] Blueprint find create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/player/blueprint-finds/:id/vote — Lightweight community signal
router.post('/blueprint-finds/:id/vote', async (req, res) => {
  try {
    const dir = req.body?.direction === 'down' ? 'down' : 'up';
    const find = await BlueprintFind.findByIdAndUpdate(
      req.params.id,
      { $inc: { [`votes.${dir}`]: 1 } },
      { new: true },
    );
    if (!find) return res.status(404).json({ error: 'Find not found' });
    res.json({ find });
  } catch (err) {
    console.error('[Player] Blueprint vote error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/profile/:username — Public info page for any user
router.get('/profile/:username', async (req, res) => {
  try {
    const user = await User.findOne({
      $or: [
        { username: req.params.username },
        { displayName: req.params.username },
      ],
    })
      .select('-settings -raidHistory -xpHistory -discordWebhookUrl')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const activeListings = await MarketplaceListing.find({
      sellerId: user.id,
      status: 'active',
    })
      .limit(10)
      .lean();

    res.json({
      ...user,
      listings: activeListings,
    });
  } catch (err) {
    console.error('[Player] Public profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/profile-summary — Authenticated profile identity + link state
router.get('/profile-summary', async (req, res) => {
  try {
    let user = await findUserWithoutDemonStreak(req.user.id, {
      hydrate: true,
    });

    if (!user) {
      user = new User({
        id: req.user.id,
        username: req.user.username,
        avatar: req.user.avatar,
      });
    }

    applyAuthProfile(user, req.user);
    user.lastActive = new Date();
    await user.save();

    res.json(buildProfileSummary(user));
  } catch (err) {
    console.error('[Player] Profile summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/me — Full player profile with stats
router.get('/me', async (req, res) => {
  try {
    let user = await findUserWithoutDemonStreak(req.user.id, {
      hydrate: true,
    });

    if (!user) {
      user = new User({
        id: req.user.id,
        username: req.user.username,
        avatar: req.user.avatar,
      });
      await user.save();
    }

    applyAuthProfile(user, req.user);
    user.lastActive = new Date();

    let liveCurrencies = null;
    let liveStashValue = null;
    let liveStashSlots = null;

    try {
      // Prefer ArcTracker (real data via dual-key API) when the user has linked
      // a key. The server does not call Embark directly; extension snapshots
      // are read through UserDataAPI.
      const atKey = await getArcTrackerKey(req.user.id);

      // Capture level before any XP mutations this request so we can
      // detect a level-up at the end and fire a Discord notification.
      const levelBefore = Number(user.level || 1);

      if (atKey) {
        const [profile, summary, stashRes, embarkProfile, embarkProgression] =
          await Promise.all([
            safe(UserDataAPI.getProfile(req.user.id)),
            safe(buildStatsOverview(req.user.id)).then(statsCompatibilityView),
            safe(UserDataAPI.getStash(req.user.id)),
            safe(UserDataAPI.getProfile(req.user.id)), // Profile data
            Promise.resolve(null),
          ]);

        logger.debug(
          { found: Boolean(embarkProgression) },
          'Embark progression sync result',
        );

        // ArcTracker /api/v2/user/profile — fetchArcTracker unwraps body.data,
        // so profile fields are at root: { level, xp_total, username, userId, ... }
        if (profile) {
          logger.debug({ profile }, 'ArcTracker profile data');

          // Real in-game level & XP — write to dedicated fields, never touch hub level
          // ArcTracker /api/v2/user/profile returns playerLevel (not level)
          const inGameLevel = profile.playerLevel ?? profile.level;
          if (inGameLevel != null) {
            user.gameLevel = Number(inGameLevel);
          }
          if (profile.xp_total != null) {
            user.gameXp = Number(profile.xp_total);
          }

          user.displayName =
            profile.username || profile.displayName || user.displayName;
          if (profile.userId) user.embarkId = profile.userId;
        }

        // Use Embark profile for display name if available
        if (embarkProfile) {
          user.displayName =
            embarkProfile.displayName ||
            embarkProfile.username ||
            user.displayName;
          if (embarkProfile.embarkId || embarkProfile.id)
            user.embarkId = embarkProfile.embarkId || embarkProfile.id;
        }
        if (summary) {
          // Award XP for newly-detected raid activity since last sync.
          // +50 per successful extract, +15 per failed raid, +5 per kill.
          const prevExtracts = Number(user.successfulExtractions || 0);
          const prevFails = Math.max(
            0,
            Number(user.totalRaids || 0) - prevExtracts,
          );
          const prevKills = Number(user.totalKills || 0);

          const newExtracts = Math.max(
            0,
            Number(summary.successfulExtractions || 0) - prevExtracts,
          );
          const newFails = Math.max(
            0,
            Number(summary.failedRaids || 0) - prevFails,
          );
          const newKills = Math.max(
            0,
            Number(summary.totalKills || 0) - prevKills,
          );

          if (newExtracts > 0) {
            user.addXp(
              newExtracts * 50,
              `${newExtracts} successful extracts`,
              'raid',
            );
          }
          if (newFails > 0) {
            user.addXp(newFails * 15, `${newFails} raids attempted`, 'raid');
          }
          if (newKills > 0) {
            user.addXp(newKills * 5, `${newKills} ARC kills`, 'combat');
          }

          user.totalRaids = summary.totalRaids;
          user.successfulExtractions = summary.successfulExtractions;
          user.totalKills = summary.totalKills;
          user.arcKills = summary.arcKills ?? 0;
          user.playerKills = summary.playerKills ?? 0;
          user.netProfit = summary.lootValue ?? user.netProfit;
        }
        const stashItems = stashRes?.items || stashRes?.data?.items;
        if (Array.isArray(stashItems) && stashItems.length > 0) {
          logger.debug({ firstItem: stashItems[0] }, 'First stash item');
          // Calculate stash value using MetaForge catalog for prices
          let totalValue = 0;
          for (const item of stashItems) {
            const itemId = item.itemId || item.id || item.slug;
            const quantity = item.quantity || item.amount || 1;
            // Try MetaForge catalog first
            const mfItem = itemId ? MetaForgeCatalog.lookupItem(itemId) : null;
            const itemValue = mfItem?.value || item.value || item.price || 0;
            totalValue += itemValue * quantity;
          }
          user.stashValue = totalValue;
          liveStashValue = totalValue;
          // Extract stash capacity from ArcTracker response
          const stashSlots = stashRes?.slots || stashRes?.capacity;
          if (stashSlots) {
            user.stashSlotsTotal = stashSlots.total || stashSlots.max || 0;
            user.stashSlotsUsed =
              stashSlots.used || stashSlots.current || stashItems?.length || 0;
            liveStashSlots = {
              total: user.stashSlotsTotal,
              used: user.stashSlotsUsed,
            };
            logger.debug(
              {
                used: user.stashSlotsUsed,
                total: user.stashSlotsTotal,
              },
              'Resolved stash slots',
            );
          }
        }
        // stash.currencies contains the actual in-game wallet
        const curr = stashRes?.currencies;
        if (curr) {
          // credits — try every known field name.
          // currencies.json confirms: { credits, cred, raiderTokens, xp }
          // "cred" is the CRED in-game currency distinct from "credits".
          user.credits =
            Number(
              curr.credits ??
                curr.creds ??
                curr.softCurrency ??
                curr.soft_currency ??
                curr.balance ??
                0,
            ) || 0;
          // raider tokens (premium soft) — raiderTokens confirmed in currencies.json
          user.tokens =
            Number(
              curr.raiderTokens ??
                curr.tokens ??
                curr.raiders_tokens ??
                curr.hardCurrency ??
                curr.hard_currency ??
                0,
            ) || 0;
          // "cred" is the separate CRED in-game currency (currencies.json: cred: 739).
          // Also try generic coin/premium fields as fallback.
          user.coins =
            Number(
              curr.cred ??
                curr.coins ??
                curr.premium ??
                curr.premiumCurrency ??
                curr.premium_currency ??
                0,
            ) || 0;
          liveCurrencies = {
            credits: user.credits,
            tokens: user.tokens,
            // "cred" is the separate CRED currency; stored in user.coins
            cred: user.coins,
            coins: user.coins,
          };
        }
      } else {
        const [profile, stats, stash] = await Promise.all([
          safe(UserDataAPI.getProfile(req.user.id)),
          safe(buildStatsOverview(req.user.id)).then(statsCompatibilityView),
          safe(UserDataAPI.getStash(req.user.id)),
        ]);

        if (profile) {
          user.embarkId = profile.id || user.embarkId;
          user.displayName =
            profile.displayName || profile.name || user.username;
        }

        if (stats) {
          user.totalRaids = stats.totalRaids ?? user.totalRaids;
          user.successfulExtractions =
            stats.successfulExtractions ?? user.successfulExtractions;
          user.totalKills = stats.totalKills ?? user.totalKills;
          user.arcKills = stats.arcKills ?? user.arcKills;
          user.playerKills = stats.playerKills ?? user.playerKills;
          user.netProfit = stats.netProfit ?? user.netProfit;
        }

        if (stash?.items) {
          user.stashValue = stash.items.reduce(
            (sum, item) =>
              sum + (item.value || item.price || 0) * (item.quantity || 1),
            0,
          );
        }
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!user.lastActive || user.lastActive < today) {
        user.addXp(25, 'Daily login bonus', 'daily');
      }

      // If we crossed a level threshold during this sync, fire a Discord
      // celebration webhook (best-effort; never blocks the response).
      if (user.level > levelBefore && user.discordWebhookUrl) {
        try {
          const payload = DiscordBot.buildLevelUpEmbed(user, levelBefore);
          DiscordBot.sendWebhook(user.discordWebhookUrl, payload).catch(
            () => {},
          );
        } catch {
          /* swallow */
        }
      }

      user.lastActive = new Date();
      await user.save();
    } catch (syncErr) {
      console.error('[Player] Sync error:', syncErr.message);
    }

    const activeListings = await MarketplaceListing.countDocuments({
      sellerId: req.user.id,
      status: 'active',
    });

    logger.debug(
      {
        level: user.level,
        xp: user.xp,
        totalXp: user.totalXp,
        credits: user.credits,
        displayName: user.displayName,
      },
      'Resolved player sync values',
    );

    res.json({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      avatarUrl:
        user.profile?.avatar_url ||
        user.discordProfile?.avatarUrl ||
        getAvatarUrl(user.id, user.avatar),
      authUser: user.authUser || {},
      appMetadata: user.appMetadata || {},
      userMetadata: user.userMetadata || {},
      linkedIdentities: user.linkedIdentities || [],
      profile: user.profile || {},
      discordProfile: user.discordProfile || {},
      metaForgeProfile: user.metaForgeProfile || {},
      embarkId: user.embarkId,
      embarkLinked: user.embarkLinked ?? false,
      embarkUsername: user.embarkUsername ?? null,
      displayName:
        user.profile?.full_name ||
        user.discordProfile?.globalName ||
        user.displayName,
      level: user.level,
      xp: user.xp,
      totalXp: user.totalXp,
      xpForNextLevel: user.xpForNextLevel(),
      xpProgressPercent: user.xpProgressPercent(),
      gameLevel: user.gameLevel ?? null,
      gameXp: user.gameXp ?? null,
      credits: user.credits,
      tokens: user.tokens,
      coins: user.coins,
      currencies: liveCurrencies || {
        credits: user.credits,
        tokens: user.tokens,
        coins: user.coins,
      },
      stashValue: user.stashValue,
      liveStashValue: liveStashValue ?? user.stashValue,
      stashSlots: liveStashSlots || {
        total: user.stashSlotsTotal,
        used: user.stashSlotsUsed,
      },
      stashSlotsTotal: user.stashSlotsTotal,
      stashSlotsUsed: user.stashSlotsUsed,
      totalRaids: user.totalRaids,
      successfulExtractions: user.successfulExtractions,
      totalKills: user.totalKills,
      arcKills: user.arcKills,
      playerKills: user.playerKills,
      netProfit: user.netProfit,
      activeListings,
      bio: user.bio,
      storefrontName: user.storefrontName,
      storefrontDescription: user.storefrontDescription,
      discordWebhookUrl: !!user.discordWebhookUrl,
    });
  } catch (err) {
    console.error('[Player] Profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/raider-hub — Consolidated Gameplay Data
router.get('/raider-hub', async (req, res) => {
  try {
    const cached = getHubCache(req.user.id);
    if (cached) return res.json(cached);

    const atKey = await getArcTrackerKey(req.user.id);
    let stats, rounds, hubProfile, hideout, loadout;
    let blueprints, quests, projects;
    let weaponKills, enemyKills, mapPerformance;
    let user;

    let currencies = null;
    let stashItems = [];
    if (atKey) {
      const [
        summary,
        roundsRes,
        dbUser,
        profileRes,
        hideoutRes,
        loadoutRes,
        bpRes,
        stashRes,
        questsRes,
        projectsRes,
      ] = await Promise.all([
        safe(buildStatsOverview(req.user.id)).then(statsCompatibilityView),
        safe(UserDataAPI.getRounds(req.user.id, { limit: 5000 })),
        findUserWithoutDemonStreak(req.user.id),
        safe(UserDataAPI.getProfile(req.user.id)),
        safe(UserDataAPI.getHideout(req.user.id)),
        safe(UserDataAPI.getLoadout(req.user.id)),
        safe(UserDataAPI.getBlueprints(req.user.id)),
        safe(UserDataAPI.getStash(req.user.id)),
        safe(UserDataAPI.getQuests(req.user.id)),
        safe(UserDataAPI.getProjects(req.user.id)),
      ]);
      stats = summary
        ? {
            totalRaids: summary.totalRaids ?? summary.totalRounds,
            successfulExtractions:
              summary.successfulExtractions ?? summary.totalExtracted,
            failedRaids:
              summary.failedRaids ??
              summary.totalDied ??
              Math.max(
                0,
                Number(summary.totalRounds || 0) -
                  Number(summary.totalExtracted || 0),
              ),
            totalKills:
              summary.totalKills ??
              Number(summary.totalArcKills || 0) +
                Number(summary.totalPlayerKills || 0),
            arcKills: summary.arcKills ?? summary.totalArcKills,
            playerKills: summary.playerKills ?? summary.totalPlayerKills,
            downs: summary.downs || summary.playerDowns,
            totalDamage: summary.totalDamage || summary.damage,
            damageTaken: summary.damageTaken ?? summary.totalDamageTaken,
            healthRestored:
              summary.healthRestored ?? summary.totalHealing ?? summary.healing,
            totalXp: summary.totalXp || summary.score || summary.xp,
            topsideSeconds:
              summary.topsideSeconds ||
              (summary.totalTimeMs ? Number(summary.totalTimeMs) / 1000 : 0),
            lootValue:
              summary.lootValue ?? summary.totalNetValue ?? summary.netValue,
            netProfit:
              summary.netProfit ?? summary.totalNetValue ?? summary.netValue,
            containersLooted:
              summary.totalContainersLooted ?? summary.containersLooted ?? 0,
            totalContainersLooted:
              summary.totalContainersLooted ?? summary.containersLooted ?? 0,
            survivalRate: summary.survivalRate,
            kdRatio: summary.kdRatio,
            avgProfit: summary.avgProfit,
            avgDamagePerRound: summary.avgDamagePerRound,
            lootEfficiencyPerMin: summary.lootEfficiencyPerMin,
            arcEnemyBreakdown: summary.arcEnemyBreakdown,
            topWeapons: summary.topWeapons,
            mapPerformance: summary.mapPerformance,
          }
        : null;
      rounds = Array.isArray(roundsRes?.rounds)
        ? roundsRes.rounds
        : Array.isArray(roundsRes)
          ? roundsRes
          : [];
      user = dbUser;
      hubProfile = profileRes;
      hideout = hideoutRes;
      loadout = loadoutRes;
      blueprints = bpRes;
      quests = questsRes;
      projects = projectsRes;
      weaponKills = normalizedWeaponStatsView(summary);
      enemyKills = normalizedEnemyStatsView(summary);
      mapPerformance = normalizedMapStatsView(summary);
      // Normalize currencies to standard field names.
      // Confirmed from currencies.json: { credits, cred, raiderTokens, xp }
      const rawCurr = stashRes?.currencies;
      currencies = rawCurr
        ? {
            credits: Number(
              rawCurr.credits ??
                rawCurr.creds ??
                rawCurr.softCurrency ??
                rawCurr.soft_currency ??
                rawCurr.balance ??
                0,
            ),
            // "cred" — separate CRED in-game currency (confirmed: cred: 739)
            cred: Number(rawCurr.cred ?? 0),
            // "raiderTokens" — premium soft currency (confirmed: raiderTokens: 200)
            tokens: Number(
              rawCurr.raiderTokens ??
                rawCurr.tokens ??
                rawCurr.raiders_tokens ??
                rawCurr.hardCurrency ??
                rawCurr.hard_currency ??
                0,
            ),
            coins: Number(
              rawCurr.cred ??
                rawCurr.coins ??
                rawCurr.premium ??
                rawCurr.premiumCurrency ??
                rawCurr.premium_currency ??
                0,
            ),
            // XP balance from currencies endpoint
            xp: Number(rawCurr.xp ?? 0),
          }
        : null;
      stashItems = stashRes?.items || [];
    } else {
      [
        stats,
        rounds,
        user,
        hubProfile,
        hideout,
        loadout,
        stashRes,
        blueprints,
        quests,
        projects,
      ] = await Promise.all([
        safe(buildStatsOverview(req.user.id)).then(statsCompatibilityView),
        safe(UserDataAPI.getRounds(req.user.id)).then((v) => v || []),
        findUserWithoutDemonStreak(req.user.id),
        safe(UserDataAPI.getProfile(req.user.id)),
        safe(UserDataAPI.getHideout(req.user.id)),
        safe(UserDataAPI.getLoadout(req.user.id)),
        safe(UserDataAPI.getStash(req.user.id)),
        safe(UserDataAPI.getBlueprints(req.user.id)),
        safe(UserDataAPI.getQuests(req.user.id)),
        safe(UserDataAPI.getProjects(req.user.id)),
      ]);
      weaponKills = normalizedWeaponStatsView(stats);
      enemyKills = normalizedEnemyStatsView(stats);
      mapPerformance = normalizedMapStatsView(stats);
      const rawCurr = stashRes?.currencies;
      currencies = rawCurr
        ? {
            credits: Number(
              rawCurr.credits ??
                rawCurr.creds ??
                rawCurr.softCurrency ??
                rawCurr.soft_currency ??
                rawCurr.balance ??
                0,
            ),
            cred: Number(rawCurr.cred ?? 0),
            tokens: Number(
              rawCurr.raiderTokens ??
                rawCurr.tokens ??
                rawCurr.raiders_tokens ??
                rawCurr.hardCurrency ??
                rawCurr.hard_currency ??
                0,
            ),
            coins: Number(
              rawCurr.cred ??
                rawCurr.coins ??
                rawCurr.premium ??
                rawCurr.premiumCurrency ??
                rawCurr.premium_currency ??
                0,
            ),
            xp: Number(rawCurr.xp ?? 0),
          }
        : null;
      stashItems = stashRes?.items || [];
    }

    const roundsData = Array.isArray(rounds) ? rounds : [];

    // Get the latest entries for the hub view
    const raidHistorySummary = (user?.raidHistory || [])
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    // Calculate a quick map performance summary for the hub
    // Real ArcTracker fields: mapName, status, netProfit, lootValue
    const mapSummary = roundsData.slice(0, 10).map((r) => ({
      map: r.mapName || r.map_name || r.map,
      outcome: r.outcome || r.status || r.extraction,
      profit:
        r.netValue ??
        r.netProfit ??
        r.valueExtracted ??
        r.lootValue ??
        r.profit ??
        0,
    }));

    // Enrich stash items with full item data (names, images, weights, etc.)
    const enrichedStashItems = enrichStashItems(stashItems || []);

    const hubPayload = {
      profile: hubProfile || null,
      combatSummary: stats,
      currencies,
      stashItems: enrichedStashItems,
      mapCodex: mapSummary,
      recentRounds: roundsData.slice(0, 5000),
      raidHistory: raidHistorySummary,
      hideout: hideout || null,
      loadout: loadout || null,
      blueprints: blueprints || null,
      quests: quests || null,
      projects: projects || null,
      weaponKills: weaponKills || null,
      enemyKills: enemyKills || null,
      mapPerformance: mapPerformance || null,
      syncedAt: user?.lastActive
        ? new Date(user.lastActive).toISOString()
        : new Date().toISOString(),
      playerLevel: user
        ? {
            level: user.level || 1,
            xp: user.xp || 0,
            totalXp: user.totalXp || 0,
            xpForNextLevel: user.xpForNextLevel ? user.xpForNextLevel() : 1000,
            xpProgressPercent: user.xpProgressPercent
              ? user.xpProgressPercent()
              : 0,
            gameLevel: user.gameLevel ?? null,
            gameXp: user.gameXp ?? null,
          }
        : null,
      telepathy: await fetchTelepathyLogic(
        req.user.id,
        stats,
        roundsData,
        user,
        {
          stash: { items: enrichedStashItems },
          loadout,
          mapPerformance,
        },
      ),
    };
    setHubCache(req.user.id, hubPayload);
    res.json(hubPayload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/rounds — Full paginated raid history with all spec fields
// Query params: limit, offset, outcome (extracted|died), map, season, date_from, date_to, sort
router.get('/rounds', async (req, res) => {
  try {
    const opts = {
      limit: Math.min(Number(req.query.limit) || 50, 5000),
      offset: Number(req.query.offset) || 0,
      outcome: req.query.outcome || undefined,
      map: req.query.map || undefined,
      season: req.query.season || undefined,
      dateFrom: req.query.date_from || undefined,
      dateTo: req.query.date_to || undefined,
      sort: req.query.sort || 'newest',
    };

    const raw = await UserDataAPI.getRounds(req.user.id, opts);
    const rounds = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.rounds)
        ? raw.rounds
        : [];

    // Normalize every round to the full spec shape so the client always gets
    // consistent field names regardless of which backend provided the data.
    const normalized = rounds.map((r) => {
      const status = (r.outcome || r.status || '').toString();
      const isEx =
        status.toLowerCase() === 'extracted' ||
        status.toLowerCase().includes('extract');

      // Build per-unit kill map from arcBreakdown (real ArcTracker) or legacy shapes
      const unitKills = {};
      if (Array.isArray(r.arcBreakdown)) {
        for (const e of r.arcBreakdown) {
          const name = e.targetName || e.name;
          if (name && name !== 'Self')
            unitKills[`kills_${name.toLowerCase()}`] =
              (unitKills[`kills_${name.toLowerCase()}`] || 0) +
              (Number(e.kills) || 0);
        }
      }

      // Build per-weapon damage map from weaponDamageBreakdown
      const weaponDmg = {};
      if (Array.isArray(r.weaponDamageBreakdown)) {
        for (const w of r.weaponDamageBreakdown) {
          const name = w.weaponName || w.name;
          if (name)
            weaponDmg[name] = (weaponDmg[name] || 0) + (Number(w.amount) || 0);
        }
      }

      return {
        // Identifiers
        raid_id: r.roundId || r.raidId || r.id || null,
        id: r.id || r.roundId || r.raidId || null,
        // Outcome
        raid_outcome: isEx ? 'Extracted' : 'Died',
        outcome: isEx ? 'extracted' : 'failed',
        raid_location: r.mapName || r.map_name || r.map || null,
        mapName: r.mapName || r.map_name || r.map || null,
        mapSlug: r.mapSlug || r.map_slug || r.mapId || r.map_id || null,
        raid_date: r.syncedAt || r.timestamp || r.date || null,
        raid_duration:
          Number(r.duration) ||
          Number(r.durationSeconds) ||
          (r.durationMs ? Math.round(r.durationMs / 1000) : null),
        durationSeconds:
          Number(r.durationSeconds) ||
          Number(r.duration) ||
          (r.durationMs ? Math.round(r.durationMs / 1000) : 0),
        durationText: r.durationText || null,
        // Economy
        raid_value_extracted:
          Number(r.valueExtracted) || Number(r.lootValue) || 0,
        raid_value_brought_in:
          Number(r.valueBroughtIn) || Number(r.loadoutValue) || 0,
        raid_net_value: Number(r.netValue) || Number(r.netProfit) || 0,
        netValue: Number(r.netValue) || Number(r.netProfit) || 0,
        valueText: r.valueText || null,
        // Combat
        arc_kills_count: Number(r.arcKills ?? r.arcDestroyed) || 0,
        arcKills: Number(r.arcKills ?? r.arcDestroyed) || 0,
        arcDestroyed: Number(r.arcDestroyed ?? r.arcKills) || 0,
        player_kills_count: Number(r.playerKills ?? r.kills) || 0,
        playerKills: Number(r.playerKills ?? r.kills) || 0,
        kills: Number(r.kills ?? r.playerKills) || 0,
        player_downs: Number(r.playerDowns ?? r.knocks) || 0,
        playerDowns: Number(r.playerDowns ?? r.knocks) || 0,
        knocks: Number(r.knocks ?? r.playerDowns) || 0,
        damage_dealt: Number(r.damage) || Number(r.damageDealt) || Number(r.totalDamage) || 0,
        damage: Number(r.damage) || Number(r.damageDealt) || Number(r.totalDamage) || 0,
        totalDamage: Number(r.totalDamage) || Number(r.damage) || Number(r.damageDealt) || 0,
        damage_taken: Number(r.damageTaken) || Number(r.damageReceived) || 0,
        healing: Number(r.healing) || Number(r.healed) || 0,
        xp: Number(r.score) || Number(r.xp) || 0,
        // Breakdowns (always present, may be empty)
        arc_breakdown: unitKills,
        weapon_breakdown: weaponDmg,
        // Raw breakdowns for clients that want full detail
        arc_breakdown_detail: r.arcBreakdown || [],
        weapon_breakdown_detail: r.weaponDamageBreakdown || [],
        rawLines: Array.isArray(r.rawLines) ? r.rawLines : [],
      };
    });

    res.json({
      total: normalized.length,
      limit: opts.limit,
      offset: opts.offset,
      rounds: normalized,
    });
  } catch (err) {
    console.error('[Player] Rounds error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/blueprints?account=main|trade — Blueprints for either account
router.get('/blueprints', async (req, res) => {
  try {
    const account = req.query.account === 'trade' ? 'trade' : 'main';
    const data = await UserDataAPI.getBlueprints(req.user.id, { account });
    res.json({ account, blueprints: data || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function normalizeBlueprintIds(ids) {
  return [
    ...new Set(
      (Array.isArray(ids) ? ids : [])
        .map((id) => String(id ?? '').trim())
        .filter(Boolean),
    ),
  ];
}

// GET /api/player/blueprint-progress — Mongo-backed manual blueprint ownership
router.get('/blueprint-progress', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id })
      .select('obtainedBlueprints')
      .lean();
    res.json({ blueprints: normalizeBlueprintIds(user?.obtainedBlueprints) });
  } catch (err) {
    console.error('[Player] Blueprint progress get error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/player/blueprint-progress — replace manual blueprint ownership
router.put('/blueprint-progress', async (req, res) => {
  try {
    const ids = normalizeBlueprintIds(req.body?.blueprints ?? req.body?.ids);
    const user = await User.findOneAndUpdate(
      { id: req.user.id },
      { obtainedBlueprints: ids },
      { new: true, returnDocument: 'after' },
    )
      .select('obtainedBlueprints')
      .lean();
    res.json({ blueprints: normalizeBlueprintIds(user?.obtainedBlueprints) });
  } catch (err) {
    console.error('[Player] Blueprint progress replace error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/player/blueprint-progress/:id — mark one blueprint owned/missing
router.patch('/blueprint-progress/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'Blueprint id required' });
    const owned = req.body?.owned !== false;
    const update = owned
      ? { $addToSet: { obtainedBlueprints: id } }
      : { $pull: { obtainedBlueprints: id } };
    const user = await User.findOneAndUpdate({ id: req.user.id }, update, {
      new: true,
      returnDocument: 'after',
    })
      .select('obtainedBlueprints')
      .lean();
    res.json({ blueprints: normalizeBlueprintIds(user?.obtainedBlueprints) });
  } catch (err) {
    console.error('[Player] Blueprint progress patch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/stash?account=main|trade — Stash for either account
router.get('/stash', async (req, res) => {
  try {
    const account = req.query.account === 'trade' ? 'trade' : 'main';
    const data = await UserDataAPI.getStash(req.user.id, { account });
    // Enrich stash items with full item data (names, images, weights, etc.)
    const enrichedItems = data?.items ? enrichStashItems(data.items) : [];
    res.json({
      account,
      stash: data || null,
      enrichedItems,
      totalWeight: enrichedItems.reduce(
        (sum, item) => sum + (item?.totalWeight || 0),
        0,
      ),
      totalValue: enrichedItems.reduce(
        (sum, item) => sum + (item?.value || 0) * (item?.quantity || 1),
        0,
      ),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/loadout?account=main|trade — Loadout for either account
router.get('/loadout', async (req, res) => {
  try {
    const account = req.query.account === 'trade' ? 'trade' : 'main';
    const data = await UserDataAPI.getLoadout(req.user.id, { account });
    res.json({ account, loadout: data || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/progression — Consolidated Profile & XP Data
router.get('/progression', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const history = user.xpHistory || [];

    // Generate milestones based on the actual scaling formula
    const milestones = Array.from({ length: 5 }, (_, i) => ({
      level: user.level + i,
      xpRequired: 1000 + Math.floor(Math.pow(user.level + i - 1, 2) * 50),
      benefits: getLevelBenefits(user.level + i),
    }));

    res.json({
      user: {
        id: user.id,
        username: user.username,
        level: user.level,
        xp: user.xp,
        totalXp: user.totalXp,
      },
      history: history.slice(-20).reverse(),
      milestones: milestones,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/command-center — Aggregated Settings, Discord, and Xbox Sync
router.get('/command-center', async (req, res) => {
  try {
    const [user, xboxData] = await Promise.all([
      User.findOne({ id: req.user.id }),
      SyncData.findOne({ userId: req.user.id, source: 'xbox_bridge' }).sort({
        syncedAt: -1,
      }),
    ]);

    const defaultSettings = {
      xboxIp: '192.168.1.236',
      autoSyncXbox: false,
      discordNotifications: true,
      marketplaceAlerts: true,
      raidAlerts: true,
      levelUpAlerts: true,
      dashboardLayout: 'default',
      theme: 'dark',
    };

    res.json({
      settings: { ...defaultSettings, ...(user.settings || {}) },
      discord: {
        webhookConnected: !!user.discordWebhookUrl,
        notifications: user.settings?.discordNotifications,
      },
      xbox: {
        connected: !!xboxData,
        lastIp: xboxData?.xboxIp,
        lastSync: xboxData?.syncedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/player/xp — Award XP
router.post('/xp', async (req, res) => {
  try {
    const { amount, reason, source } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid XP amount required' });
    }

    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const oldLevel = user.level;
    user.addXp(Number(amount), reason || '', source || 'raid');

    if (user.level > oldLevel && user.discordWebhookUrl) {
      const payload = DiscordBot.buildLevelUpEmbed(user, oldLevel);
      await DiscordBot.sendWebhook(user.discordWebhookUrl, payload);
    }

    await user.save();

    res.json({
      level: user.level,
      xp: user.xp,
      totalXp: user.totalXp,
      xpForNextLevel: user.xpForNextLevel(),
      xpProgressPercent: user.xpProgressPercent(),
      leveledUp: user.level > oldLevel,
    });
  } catch (err) {
    console.error('[Player] XP error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/combat-breakdown — PvP vs PvE stats
// Backed by the unified stats aggregator so numbers are consistent everywhere.
router.get('/combat-breakdown', async (req, res) => {
  try {
    const overview = await buildStatsOverview(req.user.id);

    // Pull the canonical ARC enemy list from MetaForge so the table includes
    // every unit the game actually has — with icons available client-side.
    const mfArcs = await MetaForgeCatalog.allArcs().catch(() => []);
    const enemyTable = {};
    const arcMeta = {}; // name -> { icon, id, description }
    for (const arc of mfArcs) {
      const name = arc?.name || arc?.id;
      if (!name) continue;
      enemyTable[name] = 0;
      arcMeta[name] = {
        id: arc.id || null,
        icon: arc.icon || arc.image || null,
        description: arc.description || null,
      };
    }
    // Always include "Player" bucket for PvP kills.
    enemyTable.Player = 0;

    for (const e of overview.enemies || []) {
      enemyTable[e.name] = e.kills;
    }
    const playerKills = overview.combat?.playerKills ?? enemyTable.Player ?? 0;
    const arcKills =
      overview.combat?.arcKills ??
      Math.max(0, (overview.combat?.kills || 0) - playerKills);
    enemyTable.Player = playerKills;

    // Spec-format enemy kills: kills_wasp, kills_fireball, etc.
    const enemyKillsSpec = {};
    for (const e of overview.enemies || []) {
      if (e.name === 'Player') continue;
      enemyKillsSpec[`kills_${e.name.toLowerCase()}`] = e.kills;
    }

    // Spec-format weapon kills: weapon_name -> weapon_kills_total
    const weaponKillsSpec = (overview.weapons || []).map((w) => ({
      weaponAssetId: w.weaponAssetId ?? w.weapon_asset_id ?? null,
      itemId: w.itemId ?? w.item_id ?? null,
      name: w.name,
      weapon_name: w.name,
      weapon_kills_total: w.kills || 0,
      weapon_damage_total: w.damage || 0,
      count: w.count ?? w.kills ?? 0,
      kills: w.kills || 0,
      damage: w.damage || 0,
    }));
    const scavenging = overview.scavenging_and_world || {};
    const containersLooted =
      scavenging.totalContainersLooted ??
      scavenging.containersLooted ??
      scavenging.containers_looted ??
      0;
    const itemsExtracted =
      scavenging.totalItemsExtracted ??
      scavenging.itemsExtracted ??
      scavenging.items_extracted_count ??
      0;

    res.json({
      totalContainersLooted: containersLooted,
      containersLooted,
      totalItemsExtracted: itemsExtracted,
      itemsExtracted,
      // Spec: Enemy Kills by Type (kills_wasp, kills_fireball, etc.)
      enemy_kills: enemyKillsSpec,
      // Spec: Weapon Performance
      weapon_performance: weaponKillsSpec,
      // Full combat_detailed block
      combat_detailed: {
        player_kills: playerKills,
        player_downs: overview.combat.downs,
        arc_kills_total: arcKills,
        damage_dealt_total: overview.combat.damageDealt,
        damage_received_total: overview.combat.damageReceived,
        health_restored_total: overview.combat.healthRestored,
        revives_given: overview.combat.revivesGiven,
        revives_received: overview.combat.revivesReceived,
        // unit_breakdown: both spec keys (kills_wasp) and display name keys
        unit_breakdown: enemyKillsSpec,
      },
      // Performance analytics
      performance_analytics: {
        survival_rate: overview.performance.survivalRate,
        kd_ratio: overview.performance.kdRatio,
        total_rounds: overview.performance.totalRounds,
        successful_raids: overview.performance.successfulRaids,
        time_topside_seconds: Math.floor(
          overview.performance.timeTopsideSeconds || 0,
        ),
        score_total: overview.performance.scoreTotal,
        avg_damage_per_round: overview.combat.avgDamagePerRound,
      },
      pvp: {
        kills: playerKills,
        downs: overview.combat.downs,
        deaths:
          overview.performance.totalRounds -
          overview.performance.successfulRaids,
        kdRatio: (overview.performance.kdRatio || 0).toFixed(2),
        revivesGiven: overview.combat.revivesGiven,
        revivesReceived: overview.combat.revivesReceived,
      },
      pve: {
        kills: Math.max(0, arcKills),
        arcDestroyed: enemyTable,
        arcBreakdown: Object.entries(enemyTable)
          .filter(([name]) => name !== 'Player')
          .map(([name, kills]) => ({
            targetId:
              (overview.enemies || []).find((e) => e.name === name)
                ?.targetId ??
              (overview.enemies || []).find((e) => e.name === name)
                ?.target_id ??
              null,
            name,
            kills,
            count: kills,
            icon: arcMeta[name]?.icon || null,
            id: arcMeta[name]?.id || null,
          }))
          .sort((a, b) => b.kills - a.kills),
      },
      combat: {
        damageDealt: overview.combat.damageDealt,
        damageReceived: overview.combat.damageReceived,
        healthRestored: overview.combat.healthRestored,
        avgDamagePerRound: Math.floor(overview.combat.avgDamagePerRound),
        totalRounds: overview.performance.totalRounds,
        revivesGiven: overview.combat.revivesGiven,
        revivesReceived: overview.combat.revivesReceived,
      },
      topWeapons: overview.weapons || [],
      // Scavenging & world interaction stats
      scavenging_and_world: {
        ...scavenging,
        totalContainersLooted: containersLooted,
        containersLooted,
        containers_looted: containersLooted,
        totalItemsExtracted: itemsExtracted,
        itemsExtracted,
        items_extracted_count: itemsExtracted,
        rare_containers_found: scavenging.rare_containers_found ?? 0,
        vaults_breached: scavenging.vaults_breached ?? 0,
        keys_consumed: scavenging.keys_consumed ?? 0,
        locked_doors_opened: scavenging.locked_doors_opened ?? 0,
        industrial_bins_opened: scavenging.industrial_bins_opened ?? 0,
        items_scrapped_count: scavenging.items_scrapped_count ?? 0,
      },
    });
  } catch (err) {
    console.error('[Player] Combat breakdown error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/map-performance — Per-map stats
// Returns: { maps: [{ mapTargetId, mapName, raids, extracted, totalDurationMs, totalNetValue,
//             survivalRate, avgDurationMs, avgNetValue }], source: "statsAggregator" }
router.get('/map-performance', async (req, res) => {
  try {
    const overview = await buildStatsOverview(req.user.id);
    res.json(normalizedMapStatsView(overview));
  } catch (err) {
    console.error('[Player] Map performance error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/enemy-kills — Normalized lifetime enemy kill breakdown.
// Returns: { enemies: [{ targetId, name, count, kills, damage }], source: "statsAggregator" }
router.get('/enemy-kills', async (req, res) => {
  try {
    const overview = await buildStatsOverview(req.user.id);
    res.json(normalizedEnemyStatsView(overview));
  } catch (err) {
    console.error('[Player] Enemy kills error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/weapon-kills — Normalized lifetime weapon performance.
// Returns: { weapons: [{ weaponAssetId, itemId, name, count, kills, damage }], source: "statsAggregator" }
router.get('/weapon-kills', async (req, res) => {
  try {
    const overview = await buildStatsOverview(req.user.id);
    res.json(normalizedWeaponStatsView(overview));
  } catch (err) {
    console.error('[Player] Weapon kills error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/expedition-status — Current expedition/season state and tier progress.
// Returns: { completedExpeditions, activeSeason, state, currentTier, nextTier, updatedAt }
router.get('/expedition-status', async (req, res) => {
  try {
    const data = await UserDataAPI.getExpeditionStatus(req.user.id);
    if (!data)
      return res.status(404).json({ error: 'Expedition status unavailable' });
    res.json(data);
  } catch (err) {
    console.error('[Player] Expedition status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/telepathy — Smart suggestions + most wanted
router.get('/telepathy', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [stats, rounds, stash, loadout] = await Promise.all([
      buildStatsOverview(req.user.id)
        .then(statsCompatibilityView)
        .catch(() => null),
      UserDataAPI.getRounds(req.user.id).catch(() => []),
      UserDataAPI.getStash(req.user.id).catch(() => null),
      UserDataAPI.getLoadout(req.user.id).catch(() => null),
    ]);
    const mapPerformance = normalizedMapStatsView(stats);

    const result = await fetchTelepathyLogic(req.user.id, stats, rounds, user, {
      stash,
      loadout,
      mapPerformance,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function telepathyNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function roundExtracted(round) {
  const status = (round.outcome || round.status || round.extraction || '')
    .toString()
    .toLowerCase();
  return status === 'extracted' || status.includes('extract');
}

function roundMapName(round) {
  return (
    round.mapName ||
    round.map_name ||
    round.map ||
    round.map_name_clean ||
    'Unknown'
  );
}

function roundNetProfit(round) {
  return telepathyNumber(
    round.netValue,
    round.netProfit,
    round.net_profit,
    round.total_net_profit,
    round.valueExtracted,
    round.lootValue,
  );
}

function roundDamage(round) {
  return telepathyNumber(
    round.damage,
    round.damageDealt,
    round.totalDamage,
    round.total_damage_dealt,
  );
}

function normalizeLoadoutRoot(loadout) {
  if (!loadout || typeof loadout !== 'object') return {};
  return loadout.loadout && typeof loadout.loadout === 'object'
    ? loadout.loadout
    : loadout;
}

function countStashKeys(stash) {
  const items = Array.isArray(stash?.items) ? stash.items : [];
  return items.reduce((count, item) => {
    const text = [
      item.id,
      item.itemId,
      item.item_id,
      item.slug,
      item.name,
      item.title,
      item.item_type,
      item.itemType,
      item.type,
      item.category,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const quantity = telepathyNumber(
      item.amount,
      item.quantity,
      item.qty,
      item.count,
      1,
    );
    return /(^|[\s_-])(key|access)([\s_-]|$)/i.test(text)
      ? count + Math.max(1, quantity)
      : count;
  }, 0);
}

function buildMapTelepathy(roundsData, mapPerformance) {
  const mapGroups = new Map();

  if (Array.isArray(mapPerformance?.maps)) {
    for (const row of mapPerformance.maps) {
      const mapName = row.mapName || row.map_name || row.map || 'Unknown';
      const raids = telepathyNumber(
        row.raids,
        row.rounds_played,
        row.map_total_raids,
        row.totalRounds,
      );
      const extracted = telepathyNumber(row.extracted, row.extractions);
      const survival =
        row.map_survival_rate !== undefined
          ? telepathyNumber(row.map_survival_rate) * 100
          : raids > 0
            ? (extracted / raids) * 100
            : 0;
      if (raids > 0) mapGroups.set(mapName, { mapName, raids, survival });
    }
  }

  for (const round of roundsData) {
    const mapName = roundMapName(round);
    const current = mapGroups.get(mapName) || {
      mapName,
      raids: 0,
      extracted: 0,
      survival: 0,
    };
    current.raids += 1;
    if (roundExtracted(round)) current.extracted += 1;
    current.survival =
      current.raids > 0 ? (current.extracted / current.raids) * 100 : 0;
    mapGroups.set(mapName, current);
  }

  return [...mapGroups.values()]
    .filter((row) => row.raids >= 3 && row.mapName !== 'Unknown')
    .sort((a, b) => a.survival - b.survival)[0];
}

async function fetchTelepathyLogic(userId, stats, rounds, user, context = {}) {
  const roundsData = Array.isArray(rounds) ? rounds : [];
  const extracted = roundsData.filter(roundExtracted).length;
  const survivalRate =
    roundsData.length > 0 ? (extracted / roundsData.length) * 100 : 0;
  const totalNetProfit =
    telepathyNumber(
      stats?.netProfit,
      stats?.totalNetValue,
      stats?.total_net_profit,
    ) || roundsData.reduce((sum, round) => sum + roundNetProfit(round), 0);
  const avgNetProfit =
    roundsData.length > 0 ? totalNetProfit / roundsData.length : 0;
  const totalDamage =
    telepathyNumber(
      stats?.totalDamage,
      stats?.damageDealt,
      stats?.total_damage_dealt,
    ) || roundsData.reduce((sum, round) => sum + roundDamage(round), 0);
  const avgDamage = roundsData.length > 0 ? totalDamage / roundsData.length : 0;
  const accuracy = telepathyNumber(stats?.accuracy, stats?.hitRate);
  const keyCount = countStashKeys(context.stash);
  const weakMap = buildMapTelepathy(roundsData, context.mapPerformance);
  const loadoutRoot = normalizeLoadoutRoot(context.loadout);
  const equippedWeapons = [
    loadoutRoot.weapon1,
    loadoutRoot.weapon_1,
    loadoutRoot.weapon2,
    loadoutRoot.weapon_2,
  ].filter(Boolean);
  const hasShield = Boolean(loadoutRoot.shield);
  const hasAugment = Boolean(loadoutRoot.augment);

  const suggestions = [];

  const pushSuggestion = (suggestion) => {
    suggestions.push({
      priority: suggestion.priority ?? 50,
      confidence: suggestion.confidence ?? 75,
      ...suggestion,
    });
  };

  if (roundsData.length >= 5 && survivalRate < 40) {
    pushSuggestion({
      id: 'survival-rate-critical',
      type: 'survival',
      title: 'Survival Rate Critical',
      description: `Your survival rate is ${survivalRate.toFixed(1)}%. Bring shield sustain, meds, and extract earlier until the trend stabilizes.`,
      metric: { survivalRate, totalRounds: roundsData.length },
      action:
        'Review armor, shield, and healing slots before high-value raids.',
      priority: 95,
      confidence: 95,
    });
  } else if (roundsData.length >= 5 && survivalRate < 55) {
    pushSuggestion({
      id: 'survival-rate-soft-warning',
      type: 'survival',
      title: 'Survival Rate Needs Work',
      description: `Your survival rate is ${survivalRate.toFixed(1)}%. You are close, but a safer extraction plan would protect more loot.`,
      metric: { survivalRate, totalRounds: roundsData.length },
      action:
        'Favor shorter routes and avoid late fights after your bag has value.',
      priority: 82,
      confidence: 88,
    });
  }

  if (weakMap && weakMap.survival < 45) {
    pushSuggestion({
      id: `map-extraction-${weakMap.mapName.toLowerCase().replace(/\W+/g, '-')}`,
      type: 'map',
      title: `${weakMap.mapName} Extraction Leak`,
      description: `${weakMap.mapName} is sitting at ${weakMap.survival.toFixed(1)}% extraction over ${weakMap.raids} raids.`,
      metric: {
        mapName: weakMap.mapName,
        survivalRate: weakMap.survival,
        raids: weakMap.raids,
      },
      action:
        'Use a lower-risk route on that map until extractions climb above 50%.',
      priority: 86,
      confidence: 82,
    });
  }

  if (roundsData.length >= 5 && totalNetProfit < 0) {
    pushSuggestion({
      id: 'negative-net-profit',
      type: 'economy',
      title: 'Negative Net Value',
      description: `Your tracked raids are down ${Math.abs(Math.round(totalNetProfit)).toLocaleString()} value overall.`,
      metric: { totalNetProfit, avgNetProfit },
      action:
        'Run budget kits and bank early loot until the average raid returns positive.',
      priority: 90,
      confidence: 90,
    });
  } else if (roundsData.length >= 5 && avgNetProfit < 0) {
    suggestions.push({
      id: 'negative-average-profit',
      type: 'economy',
      title: 'Average Raid Is Losing Value',
      description: `Average net value is ${Math.round(avgNetProfit).toLocaleString()} per raid.`,
      metric: { avgNetProfit },
      action:
        'Cut loadout cost or leave sooner after one profitable objective.',
      priority: 78,
      confidence: 82,
    });
  }

  if (roundsData.length >= 5 && keyCount === 0) {
    pushSuggestion({
      id: 'missing-keys',
      type: 'stash',
      title: 'No Access Keys In Stash',
      description:
        'No key/access items were found in your synced stash, so locked rooms may be limiting route value.',
      metric: { keyCount },
      action:
        'Add useful keys to your wanted list or prioritize key spawns before loot runs.',
      priority: 74,
      confidence: 76,
    });
  }

  if (accuracy > 0 && accuracy < 20) {
    pushSuggestion({
      id: 'weak-accuracy',
      type: 'combat',
      title: 'Accuracy Is Dragging Fights',
      description: `Accuracy is ${accuracy.toFixed(1)}%. Missed shots increase noise, ammo burn, and third-party risk.`,
      metric: { accuracy },
      action:
        'Favor steadier weapons, closer fights, and attachments that improve stability.',
      priority: 72,
      confidence: 78,
    });
  } else if (roundsData.length >= 5 && avgDamage > 0 && avgDamage < 500) {
    pushSuggestion({
      id: 'low-damage-output',
      type: 'combat',
      title: 'Low Damage Output',
      description: `Average damage is ${Math.round(avgDamage).toLocaleString()} per raid.`,
      metric: { avgDamage },
      action:
        'Use a weapon with reliable range and bring enough ammo for one full ARC fight.',
      priority: 66,
      confidence: 70,
    });
  }

  if (
    context.loadout &&
    (equippedWeapons.length === 0 || !hasShield || !hasAugment)
  ) {
    const missing = [
      equippedWeapons.length === 0 ? 'weapon' : null,
      !hasShield ? 'shield' : null,
      !hasAugment ? 'augment' : null,
    ].filter(Boolean);
    pushSuggestion({
      id: 'loadout-missing-core-slots',
      type: 'loadout',
      title: 'Loadout Core Slot Missing',
      description: `Current synced loadout appears to be missing: ${missing.join(', ')}.`,
      metric: { missing },
      action: 'Fill core slots before raids where survival or profit matters.',
      priority: 88,
      confidence: 80,
    });
  }

  suggestions.sort(
    (a, b) => b.priority - a.priority || b.confidence - a.confidence,
  );

  return {
    suggestions: suggestions.slice(0, 8),
    mostWanted: user.mostWanted,
    performance: {
      survivalRate,
      totalRounds: roundsData.length,
      extracted,
      netProfit: totalNetProfit,
      avgNetProfit,
      accuracy,
      avgDamage,
      keyCount,
      weakestMap: weakMap || null,
    },
  };
}

// GET /api/player/raid-history — Raider's logbook
router.get('/raid-history', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const entries = user.raidHistory
      ? user.raidHistory.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        )
      : [];

    res.json({ entries });
  } catch (err) {
    console.error('[Player] Raid history error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/player/raid-history — Add raid history entry
router.post('/raid-history', async (req, res) => {
  try {
    const { title, content, category, metadata } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content required' });
    }

    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.addRaidHistory(title, content, category || 'raid', metadata || {});
    await user.save();

    res.json({ status: 'added', entries: user.raidHistory });
  } catch (err) {
    console.error('[Player] Raid history add error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/xp-breakdown — XP history & milestones
router.get('/xp-breakdown', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const history = user.xpHistory || [];
    const bySource = {};
    history.forEach((entry) => {
      bySource[entry.source] = (bySource[entry.source] || 0) + entry.amount;
    });

    // XP Scaling: Base 1000 + (level-1)^2 * 50 (must match User model)
    const xpForLevel = (lvl) =>
      lvl <= 1 ? 1000 : 1000 + Math.floor(Math.pow(lvl - 1, 2) * 50);

    const milestones = [];
    for (let i = 1; i <= user.level + 3; i++) {
      milestones.push({
        level: i,
        unlocked: i <= user.level,
        xpRequired: xpForLevel(i),
        benefits: getLevelBenefits(i),
      });
    }

    res.json({
      level: user.level,
      xp: user.xp,
      totalXp: user.totalXp,
      xpForNextLevel: user.xpForNextLevel(),
      xpProgressPercent: user.xpProgressPercent(),
      history: history.slice(-50).reverse(),
      bySource,
      milestones,
    });
  } catch (err) {
    console.error('[Player] XP breakdown error:', err);
    res.status(500).json({ error: err.message });
  }
});

function getLevelBenefits(level) {
  const benefits = {
    1: 'Access to Marketplace',
    2: '+1 Active Listing Slot',
    3: 'Telepathy Basic Insights',
    5: 'Discord Webhook Alerts',
    10: 'Premium Storefront Badge',
    15: 'Advanced Combat Analytics',
    20: 'Legendary Trader Status',
    25: 'SHiESTY Elite Access',
    50: 'Master Raider Title',
  };
  return benefits[level] || 'Continue raiding to unlock';
}

// POST /api/player/wanted — Add wanted item
router.post('/wanted', async (req, res) => {
  try {
    const { itemId, itemName, reason } = req.body;
    if (!itemId || !itemName) {
      return res.status(400).json({ error: 'itemId and itemName required' });
    }

    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.addWantedItem(itemId, itemName, reason || '');
    await user.save();

    res.json({ status: 'added', mostWanted: user.mostWanted });
  } catch (err) {
    console.error('[Player] Wanted add error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/player/wanted/:itemId — Remove wanted item
router.delete('/wanted/:itemId', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.removeWantedItem(req.params.itemId);
    await user.save();

    res.json({ status: 'removed', mostWanted: user.mostWanted });
  } catch (err) {
    console.error('[Player] Wanted remove error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/player/storefront — Update storefront info
router.post('/storefront', async (req, res) => {
  try {
    const { name, description } = req.body;

    const user = await User.findOneAndUpdate(
      { id: req.user.id },
      { storefrontName: name, storefrontDescription: description },
      { returnDocument: 'after' },
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      storefrontName: user.storefrontName,
      storefrontDescription: user.storefrontDescription,
    });
  } catch (err) {
    console.error('[Player] Storefront error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/settings — User preferences
router.get('/settings', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const defaults = {
      xboxIp: '192.168.1.236',
      autoSyncXbox: false,
      discordNotifications: true,
      marketplaceAlerts: true,
      raidAlerts: true,
      levelUpAlerts: true,
      dashboardLayout: 'default',
      theme: 'dark',
    };

    res.json({
      settings: { ...defaults, ...(user.settings || {}) },
      mostWanted: user.mostWanted || [],
    });
  } catch (err) {
    console.error('[Player] Settings get error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/player/settings — Update preferences
router.post('/settings', async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object required' });
    }

    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.settings = { ...(user.settings || {}), ...settings };
    await user.save();

    res.json({ status: 'saved', settings: user.settings });
  } catch (err) {
    console.error('[Player] Settings update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/player/profile — Update bio and display name
router.patch('/profile', async (req, res) => {
  try {
    const { bio, displayName } = req.body;
    const update = {};
    if (bio !== undefined) update.bio = String(bio).slice(0, 300);
    if (displayName !== undefined)
      update.displayName = String(displayName).slice(0, 50);
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }
    const user = await User.findOneAndUpdate({ id: req.user.id }, update, {
      returnDocument: 'after',
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ bio: user.bio, displayName: user.displayName });
  } catch (err) {
    console.error('[Player] Profile update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/stats — Full spec stats dashboard payload
// Returns every variable defined in the Header & Account, Primary Stats,
// Raid Value History, Enemy Kills, Weapon Performance, Map Performance,
// and Raid Entry sections of the dashboard spec.
// Query params (all optional):
//   limit        max rounds to include in history (default 200, max 5000)
//   map          filter map slug (dam-battleground | the-spaceport | blue-gate | stella-montis | buried-city | riven-tides)
//   outcome      extracted | died | unknown
//   date_from    ISO date inclusive start
//   date_to      ISO date inclusive end
//   sort         newest (default) | oldest | value_desc | value_asc
router.get('/stats', async (req, res) => {
  try {
    // StatsAggregator is the only active stats producer. The legacy body below
    // is intentionally retained for reference but is not executed.
    const overview = await buildStatsOverview(req.user.id);
    return res.json(overview);

    /* Legacy player stats assembly retained but disabled.
    const user = await User.findOne({ id: req.user.id }).lean();

    const roundOpts = {
      limit: Math.min(Number(req.query.limit) || 200, 5000),
      offset: Number(req.query.offset) || 0,
      outcome: req.query.outcome || undefined,
      map: req.query.map || undefined,
      season: req.query.season || undefined,
      dateFrom: req.query.date_from || undefined,
      dateTo: req.query.date_to || undefined,
      sort: req.query.sort || 'newest',
    };

    let rounds = [];
    let profile = null;
    let stashCurrencies = null;
    let dedicatedEnemyKills = null;
    let dedicatedWeaponKills = null;

    const [roundsRes, profileRes, stashRes, enemyKillsRes, weaponKillsRes] =
      await Promise.all([
        safe(UserDataAPI.getRounds(req.user.id, roundOpts)),
        safe(UserDataAPI.getProfile(req.user.id)),
        safe(UserDataAPI.getStash(req.user.id)),
        safe(UserDataAPI.getEnemyKills(req.user.id)),
        safe(UserDataAPI.getWeaponKills(req.user.id)),
      ]);
    rounds = Array.isArray(roundsRes?.rounds)
      ? roundsRes.rounds
      : Array.isArray(roundsRes)
        ? roundsRes
        : [];
    profile = profileRes;
    stashCurrencies = stashRes?.currencies || null;
    dedicatedEnemyKills = enemyKillsRes;
    dedicatedWeaponKills = weaponKillsRes;

    // ---- Aggregate all primary stats from real ArcTracker round fields ----
    let totalRaids = 0;
    let extractions = 0;
    let deaths = 0;
    let totalArcKills = 0;
    let totalPlayerKills = 0;
    let totalPlayerDowns = 0;
    let totalDamageDealt = 0;
    let totalScore = 0;
    let totalNetProfit = 0;
    let totalLootValue = 0;
    let totalLoadoutValue = 0;
    let totalDuration = 0; // seconds
    let totalContainersLooted = 0;
    const enemyTally = new Map(); // targetName -> kill count
    const enemyDamageTally = new Map(); // targetName -> damage
    const weaponTally = new Map(); // weaponName -> { kills, damage }
    const mapGroups = new Map(); // mapName -> aggregated stats

    for (const r of rounds) {
      totalRaids++;
      const status = (r.outcome || r.status || '').toString().toLowerCase();
      const isEx = status === 'extracted' || status.includes('extract');
      const isDead = status === 'failed' || status === 'died';
      if (isEx) extractions++;
      if (isDead) deaths++;

      totalArcKills += Number(r.arcKills ?? r.arcDestroyed) || 0;
      totalPlayerKills += Number(r.playerKills ?? r.kills) || 0;
      totalPlayerDowns += Number(r.playerDowns ?? r.knocks) || 0;
      totalDamageDealt +=
        Number(r.damage ?? r.damageDealt ?? r.totalDamage) || 0;
      totalScore += Number(r.score ?? r.xp) || 0;
      totalNetProfit += Number(r.netValue ?? r.netProfit) || 0;
      totalLootValue += Number(r.valueExtracted ?? r.lootValue) || 0;
      totalLoadoutValue += Number(r.valueBroughtIn ?? r.loadoutValue) || 0;
      totalContainersLooted += Number(
        r.containersLooted ?? r.lootedContainers ?? r.containers ?? 0,
      );
      const dur =
        r.durationMs !== undefined
          ? Number(r.durationMs) / 1000
          : Number(r.duration ?? r.durationSeconds) || 0;
      totalDuration += dur;

      // Enemy kills from arcBreakdown
      if (Array.isArray(r.arcBreakdown)) {
        for (const e of r.arcBreakdown) {
          const name = e.targetName;
          if (!name || name === 'Self' || name === 'Player') continue;
          enemyTally.set(
            name,
            (enemyTally.get(name) || 0) + (Number(e.kills) || 0),
          );
          enemyDamageTally.set(
            name,
            (enemyDamageTally.get(name) || 0) + (Number(e.damage) || 0),
          );
        }
      }

      // Weapon damage from weaponDamageBreakdown
      if (Array.isArray(r.weaponDamageBreakdown)) {
        for (const w of r.weaponDamageBreakdown) {
          const name = w.weaponName;
          if (!name) continue;
          const prev = weaponTally.get(name) || { kills: 0, damage: 0 };
          prev.damage += Number(w.amount) || 0;
          weaponTally.set(name, prev);
        }
      }

      // Map groups
      const mapName = r.mapName || 'Unknown';
      const mg = mapGroups.get(mapName) || {
        map_name: mapName,
        map_slug:
          r.mapSlug ||
          r.map_slug ||
          String(mapName)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, ''),
        map_total_raids: 0,
        extractions: 0,
        total_duration: 0,
        total_net_income: 0,
        total_loot_value: 0,
        total_damage: 0,
        arc_destroyed: 0,
        player_kills: 0,
      };
      mg.map_total_raids++;
      if (isEx) mg.extractions++;
      mg.total_duration += dur;
      mg.total_net_income += Number(r.netValue ?? r.netProfit) || 0;
      mg.total_loot_value += Number(r.valueExtracted ?? r.lootValue) || 0;
      mg.total_damage +=
        Number(r.damage ?? r.damageDealt ?? r.totalDamage) || 0;
      mg.arc_destroyed += Number(r.arcKills ?? r.arcDestroyed) || 0;
      mg.player_kills += Number(r.playerKills ?? r.kills) || 0;
      mapGroups.set(mapName, mg);
    }

    if (Array.isArray(dedicatedEnemyKills?.enemies)) {
      for (const enemy of dedicatedEnemyKills.enemies) {
        const name = enemy.name || enemy.enemyName || enemy.enemy_name;
        if (!name) continue;
        const kills = Number(enemy.count ?? enemy.kills ?? 0);
        const damage = Number(enemy.damage ?? enemy.totalDamage ?? 0);
        if (Number.isFinite(kills)) enemyTally.set(name, kills);
        if (Number.isFinite(damage) && damage > 0) {
          enemyDamageTally.set(name, damage);
        }
      }
    }

    if (Array.isArray(dedicatedWeaponKills?.weapons)) {
      for (const weapon of dedicatedWeaponKills.weapons) {
        const name = weapon.name || weapon.weaponName || weapon.weapon_name;
        if (!name) continue;
        const current = weaponTally.get(name) || { kills: 0, damage: 0 };
        current.kills = Number(weapon.count ?? weapon.kills ?? 0) || 0;
        const dedicatedDamage = Number(
          weapon.damage ?? weapon.totalDamage ?? 0,
        );
        if (dedicatedDamage > 0) current.damage = dedicatedDamage;
        weaponTally.set(name, current);
      }
    }

    const survivalRate = totalRaids > 0 ? extractions / totalRaids : 0;
    const avgProfitPerExtraction =
      extractions > 0 ? totalNetProfit / extractions : 0;
    const averageNetValue = totalRaids > 0 ? totalNetProfit / totalRaids : 0;
    const bestRaidValue =
      rounds.length > 0
        ? Math.max(
            ...rounds.map((round) =>
              Number(round.netValue ?? round.netProfit ?? 0),
            ),
          )
        : 0;
    const worstRaidValue =
      rounds.length > 0
        ? Math.min(
            ...rounds.map((round) =>
              Number(round.netValue ?? round.netProfit ?? 0),
            ),
          )
        : 0;

    // Guarantee all 10 canonical ARC units present
    for (const name of [
      'Wasp',
      'Fireball',
      'Tick',
      'Pop',
      'Hornet',
      'Turret',
      'Snitch',
      'Firefly',
      'Spotter',
      'Shredder',
    ]) {
      if (!enemyTally.has(name)) enemyTally.set(name, 0);
    }

    // ---- Raid value history (graph data — last 5000 rounds in requested order) ----
    const raidValueHistory = rounds.slice(0, 5000).map((r) => ({
      raid_id: r.roundId || r.raidId || r.id || null,
      raid_value_extracted: Number(r.valueExtracted ?? r.lootValue) || 0,
      raid_net_value: Number(r.netValue ?? r.netProfit) || 0,
      raid_value_brought_in: Number(r.valueBroughtIn ?? r.loadoutValue) || 0,
    }));

    // ---- Weapon performance ----
    const weaponPerformance = [...weaponTally.entries()]
      .map(([name, v]) => ({
        weapon_name: name,
        weapon_kills_total: v.kills,
        weapon_damage_total: v.damage,
      }))
      .sort((a, b) => b.weapon_damage_total - a.weapon_damage_total);

    // ---- Map performance table ----
    const mapPerformance = [...mapGroups.values()]
      .map((mg) => ({
        map_name: mg.map_name,
        map_slug: mg.map_slug,
        map_total_raids: mg.map_total_raids,
        map_survival_rate:
          mg.map_total_raids > 0 ? mg.extractions / mg.map_total_raids : 0,
        map_avg_time:
          mg.map_total_raids > 0
            ? Math.floor(mg.total_duration / mg.map_total_raids)
            : 0,
        map_net_income: mg.total_net_income,
        map_value_extracted: mg.total_loot_value,
        total_damage: mg.total_damage,
        arc_destroyed: mg.arc_destroyed,
        player_kills: mg.player_kills,
      }))
      .sort((a, b) => b.map_total_raids - a.map_total_raids);

    const raidHistorySummary = {
      totalRaids,
      extractedRaids: extractions,
      failedRaids: deaths,
      survivalRate,
      totalNetValue: totalNetProfit,
      averageNetValue,
      bestRaidValue,
      worstRaidValue,
      arcEnemiesDestroyed: totalArcKills,
      playerKills: totalPlayerKills,
      knocks: totalPlayerDowns,
      totalDamage: totalDamageDealt,
      totalTimeSeconds: totalDuration,
      averageTimeSeconds: totalRaids > 0 ? totalDuration / totalRaids : 0,
      perMapPerformance: mapPerformance.map((map) => ({
        mapName: map.map_name,
        mapSlug: map.map_slug,
        raids: map.map_total_raids,
        extracted: Math.round(map.map_total_raids * map.map_survival_rate),
        failed:
          map.map_total_raids -
          Math.round(map.map_total_raids * map.map_survival_rate),
        survivalRate: map.map_survival_rate,
        netIncome: map.map_net_income,
        avgNetValue:
          map.map_total_raids > 0
            ? map.map_net_income / map.map_total_raids
            : 0,
        avgTimeSeconds: map.map_avg_time,
        totalDamage: map.total_damage || 0,
        arcDestroyed: map.arc_destroyed || 0,
        kills: map.player_kills || 0,
      })),
      raidValueHistory: rounds.slice(0, 5000).map((round, index) => {
        const netValue = Number(round.netValue ?? round.netProfit ?? 0);
        return {
          raidNumber: index + 1,
          netValue,
          valueExtracted: Math.max(netValue, 0),
          valueBroughtIn: Math.abs(Math.min(netValue, 0)),
        };
      }),
    };

    const combatBreakdown = {
      arcKills: [...enemyTally.entries()]
        .filter(
          ([name, kills]) =>
            Number(kills) > 0 || Number(enemyDamageTally.get(name)) > 0,
        )
        .map(([name, kills]) => ({
          name,
          kills,
          damage: Number(enemyDamageTally.get(name)) || 0,
        })),
      weaponsUsed: weaponPerformance.map((weapon) => ({
        name: weapon.weapon_name,
        kills: weapon.weapon_kills_total,
        damage: weapon.weapon_damage_total,
      })),
    };

    // ---- Header & Account variables ----
    // Credits/tokens come from stash.currencies (live) or user DB (cached)
    const credits = Number(stashCurrencies?.credits ?? user?.credits ?? 0);
    const tokens = Number(stashCurrencies?.tokens ?? user?.tokens ?? 0);
    const tokensPremium = Number(stashCurrencies?.coins ?? user?.coins ?? 0);

    // Sync status: "synced" if we have live ArcTracker data, else "offline"
    const syncStatus = atKey ? 'synced' : 'offline';
    const lastSyncTime = user?.lastActive || null;

    // account_tier: derived from ArcTracker profile if available
    const accountTier = profile?.tier || profile?.plan || 'standard';

    res.json({
      // ---- Header & Account ----
      account_header: {
        total_credits: credits,
        max_credits: null, // not exposed by ArcTracker API
        raider_tokens: tokens,
        raider_tokens_premium: tokensPremium,
        account_visibility: user?.settings?.profileVisibility || 'public',
        account_name:
          profile?.username ||
          user?.displayName ||
          user?.embarkId ||
          user?.username ||
          null,
        sync_status: syncStatus,
        account_tier: accountTier,
        last_sync_time: lastSyncTime,
        embark_id: user?.embarkId || null,
      },

      // ---- Primary Stats ----
      primary_stats: {
        time_topside: Math.floor(totalDuration), // seconds
        total_raids: totalRaids,
        survival_rate: survivalRate, // 0–1
        total_extractions: extractions,
        total_deaths: deaths,
        arc_enemies_destroyed: totalArcKills,
        total_value_extracted: totalLootValue,
        total_value_brought_in: totalLoadoutValue,
        net_profit_loss: totalNetProfit,
        avg_profit_per_extraction: avgProfitPerExtraction,
        player_kills: totalPlayerKills,
        player_downs: totalPlayerDowns,
        damage_dealt: totalDamageDealt,
        score_total: totalScore,
        containers_looted: totalContainersLooted,
        containers_per_raid:
          totalRaids > 0 ? +(totalContainersLooted / totalRaids).toFixed(2) : 0,
      },

      // ---- Raid Value History (graph) ----
      raid_value_history: raidValueHistory,
      raid_history_summary: raidHistorySummary,
      combat_breakdown: combatBreakdown,

      // ---- Enemy Kills by Type ----
      enemy_kills_by_type: {
        kills_wasp: enemyTally.get('Wasp') || 0,
        kills_fireball: enemyTally.get('Fireball') || 0,
        kills_tick: enemyTally.get('Tick') || 0,
        kills_pop: enemyTally.get('Pop') || 0,
        kills_hornet: enemyTally.get('Hornet') || 0,
        kills_turret: enemyTally.get('Turret') || 0,
        kills_snitch: enemyTally.get('Snitch') || 0,
        kills_firefly: enemyTally.get('Firefly') || 0,
        kills_spotter: enemyTally.get('Spotter') || 0,
        kills_shredder: enemyTally.get('Shredder') || 0,
        kills_surveyor: enemyTally.get('Surveyor') || 0,
        kills_sentinel: enemyTally.get('Sentinel') || 0,
        kills_rocketeer: enemyTally.get('Rocketeer') || 0,
        kills_leaper: enemyTally.get('Leaper') || 0,
        kills_bastion: enemyTally.get('Bastion') || 0,
        kills_bombardier: enemyTally.get('Bombardier') || 0,
        kills_queen: enemyTally.get('The Queen') || 0,
        kills_matriarch: enemyTally.get('Matriarch') || 0,
        kills_harvester: enemyTally.get('Harvester') || 0,
      },

      // ---- Weapon Performance ----
      topWeaponsByDamage: {
        kills_kettle: weaponTally.get('Kettle') || 0,
        kills_rattler: weaponTally.get('Rattler') || 0,
        kills_arpeggio: weaponTally.get('Arpeggio') || 0,
        kills_tempest: weaponTally.get('Tempest') || 0,
        kills_bettina: weaponTally.get('Bettina') || 0,
        kills_ferro: weaponTally.get('Ferro') || 0,
        kills_renegade: weaponTally.get('Renegade') || 0,
        kills_aphelion: weaponTally.get('Aphelion') || 0,
        kills_stitcher: weaponTally.get('Stitcher') || 0,
        kills_canto: weaponTally.get('Canto') || 0,
        kills_bobcat: weaponTally.get('Bobcat') || 0,
        kills_il_toro: weaponTally.get('Il Toro') || 0,
        kills_vulcano: weaponTally.get('Vulcano') || 0,
        kills_dolabra: weaponTally.get('Dolabra') || 0,
        kills_hairpin: weaponTally.get('Hairpin') || 0,
        kills_burletta: weaponTally.get('Burletta') || 0,
        kills_venator: weaponTally.get('Venator') || 0,
        kills_anvil: weaponTally.get('Anvil') || 0,
        kills_torrente: weaponTally.get('Torrente') || 0,
        kills_osprey: weaponTally.get('Osprey') || 0,
        kills_jupiter: weaponTally.get('Jupiter') || 0,
        kills_rascal: weaponTally.get('Rascal') || 0,
        kills_hullcracker: weaponTally.get('Hullcracker') || 0,
        kills_equalizer: weaponTally.get('Equalizer') || 0,
      },

      weapon_performance: weaponPerformance,

      // ---- Map Performance Table ----
      map_performance: mapPerformance,

      // ---- Raid History List (last 5000 rounds, normalized) ----
      raid_history: rounds.slice(0, 5000).map((r) => {
        const s = (r.outcome || r.status || '').toString().toLowerCase();
        const isEx = s === 'extracted' || s.includes('extract');
        const endedAt = r.roundEndedAt || r.syncedAt || null;
        return {
          raid_id: r.roundId || r.raidId || r.id || null,
          raid_outcome: r.outcome || r.status || (isEx ? 'extracted' : 'died'),
          raid_location: r.mapName || r.map || null,
          raid_date: endedAt,
          raid_time_of_day: endedAt
            ? new Date(endedAt).toTimeString().slice(0, 5)
            : null,
          raid_value_change: Number(r.netValue ?? r.netProfit) || 0,
          raid_duration:
            r.durationMs !== undefined
              ? Number(r.durationMs) / 1000
              : Number(r.duration) || 0,
          arc_kills_count: Number(r.arcKills) || 0,
          player_kills_count: Number(r.playerKills) || 0,
          player_downs: Number(r.playerDowns) || 0,
          damage_dealt: Number(r.damage ?? r.damageDealt) || 0,
          score: Number(r.score ?? r.xp) || 0,
          containers_looted:
            Number(
              r.containersLooted ??
                r.containers_looted ??
                r.lootedContainers ??
                r.totalContainersLooted ??
                r.containers ??
                0,
            ) || 0,
        };
      }),

      // ---- Summary Stats (current filtered view) ----
      summary_stats: {
        total_raids_count: totalRaids,
        extraction_rate_percent: Math.round(survivalRate * 100),
        extraction_count_raw: extractions,
        death_count_raw: deaths,
        net_value_total: totalNetProfit,
        avg_value_per_extraction: Math.round(avgProfitPerExtraction),
        total_playtime_hours: +(totalDuration / 3600).toFixed(2),
        synced_raids_total: totalRaids,
        legacy_raids_total: 0,
      },

      // ---- Legacy & Sync ----
      legacy_sync: {
        synced_raids_count: totalRaids,
        legacy_raids_count: 0,
        auto_sync_toggle: user?.settings?.autoSync ?? false,
        next_sync_timer: null,
      },

      // ---- Filter state (echoed from query params) ----
      applied_filters: {
        filter_map: req.query.map || null,
        filter_outcome: req.query.outcome || null,
        filter_date_from: req.query.date_from || null,
        filter_date_to: req.query.date_to || null,
        sort_order: roundOpts.sort,
        results_per_page: roundOpts.limit,
        current_page_number: Math.floor(roundOpts.offset / roundOpts.limit) + 1,
        total_pages_count: Math.ceil(totalRaids / roundOpts.limit) || 1,
      },
    });
    */
  } catch (err) {
    console.error('[Player] Stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player/leaderboard — Top players by level/XP
router.get('/leaderboard', async (_req, res) => {
  try {
    const players = await User.find()
      .sort({ level: -1, totalXp: -1 })
      .limit(50)
      .select('username avatar level totalXp stashValue')
      .lean();

    res.json(players);
  } catch (err) {
    console.error('[Player] Leaderboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Notifications ────────────────────────────────────────────────────────────

// GET /api/player/notifications — last 20 notifications (recent + unread first)
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      read: false,
    });
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/player/notifications/read-all — mark all as read
router.patch('/notifications/read-all', requireAuth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { $set: { read: true } },
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/player/notifications/:id/read — mark single as read
router.patch('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    await Notification.updateOne(
      { _id: req.params.id, userId: req.user.id },
      { $set: { read: true } },
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
