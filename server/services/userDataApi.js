/* =========================================================
   UserDataAPI — single resolver used by all routes.
   Provider order:
     1. ArcTracker user key (explicit per-user API token)
     2. MetaForge linked Raider profile (synced profile/snapshot data)
     3. Extension/ArcTracker snapshots in MongoDB
   ========================================================= */

import { User } from '../models/User.js';
import { SyncData } from '../models/SyncData.js';
import {
  ArcTrackerAPI,
  summarizeRounds,
  fetchArcTrackerWithCookie,
} from './arctracker.js';
import { GameCatalog } from './gameCatalog.js';
import { MetaForgeAPI } from './metaforge.js';
import { MetaForgeCatalog } from './metaforgeCatalog.js';
import ArdbService from './ardb.js';
import { enrichGameAssetRefs } from './assetMap.js';
import {
  deriveExpeditionStatus,
  normalizeProjectProgressSnapshot,
  normalizeProgressSnapshot,
} from './syncsnapshotnormalizer.js';
import { resolveItemAssetUrl } from '../utils/assetUrl.js';
import logger from '../utils/logger.js';
import {
  normalizeWeaponKills,
  normalizeEnemyKills,
  normalizeMapPerformance,
  normalizeEmbarkStats,
} from './statsMapping.js';

// Merge catalog metadata (name/icon/rarity/etc.) into a list of items.
// Lookup priority: MetaForge (richest schema) → ArcData (GameCatalog).
async function enrichItems(items) {
  if (!Array.isArray(items) || items.length === 0) return items || [];
  return Promise.all(
    items.map(async (it) => {
      // "i" is the short key used by ArcTracker's stash/inventory snapshot format.
      const id = it?.i || it?.id || it?.itemId || it?.item_id || it?.slug;
      if (!id) return it;

      const mf = MetaForgeCatalog.lookupItem(id);
      const meta = await GameCatalog.lookupItem(id).catch(() => null);
      if (!mf && !meta) return it;

      // ArcData fallbacks (legacy)
      const localizedName =
        (meta?.name && (meta.name.en || meta.name.EN || meta.name)) ||
        meta?.displayName ||
        null;
      const rawImage =
        meta?.imageFilename ||
        meta?.icon ||
        meta?.image ||
        meta?.iconUrl ||
        null;
      const arcIcon = resolveItemAssetUrl(rawImage, id);

      return {
        ...it,
        name: it.name || mf?.name || localizedName || id,
        icon: it.icon || mf?.icon || arcIcon,
        rarity: it.rarity || mf?.rarity || meta?.rarity || null,
        category:
          it.category || mf?.item_type || meta?.category || meta?.type || null,
        // MetaForge-only enrichment fields
        item_type: it.item_type || mf?.item_type || null,
        stat_block: it.stat_block || mf?.stat_block || null,
        loadout_slots: it.loadout_slots || mf?.loadout_slots || null,
        workbench: it.workbench || mf?.workbench || null,
        subcategory: it.subcategory || mf?.subcategory || null,
        ammo_type: it.ammo_type || mf?.ammo_type || null,
        flavor_text: it.flavor_text || mf?.flavor_text || null,
        value: it.value || mf?.value || null,
        description: it.description || mf?.description || null,
        // ARDB enrichment fields (keep/sell/recycle tags, recycling, weight, vendors)
        tag: ArdbService.getTag(id),
        recyclesInto: ArdbService.lookupItem(id)?.recyclesInto || null,
        salvagesInto: ArdbService.lookupItem(id)?.salvagesInto || null,
        repairCost: ArdbService.lookupItem(id)?.repairCost || null,
        weightKg: ArdbService.lookupItem(id)?.weightKg || null,
        vendors: ArdbService.lookupItem(id)?.vendors || null,
        meta: meta || mf || null,
      };
    }),
  );
}

async function enrichLoadout(data) {
  if (!data || typeof data !== 'object') return data;

  const root =
    data.loadout && typeof data.loadout === 'object' ? data.loadout : data;
  const out = data.loadout ? { ...data, loadout: { ...root } } : { ...data };
  const slots = data.loadout ? out.loadout : out;

  slots.weapon1 = slots.weapon1 || slots.weapon_1 || slots.primary || null;
  slots.weapon2 = slots.weapon2 || slots.weapon_2 || slots.secondary || null;
  slots.quickItems =
    slots.quickItems || slots.quick_use || slots.quickUse || slots.utilities || [];
  slots.safePocket = slots.safePocket || slots.safe_pocket || [];
  slots.augmentedSlots = slots.augmentedSlots || slots.augmented_slots || [];

  const enrichOne = async (item) => {
    if (!item || typeof item !== 'object') return item;
    const [enriched] = await enrichItems([item]);
    if (Array.isArray(enriched?.attachments)) {
      enriched.attachments = await Promise.all(
        enriched.attachments.map(enrichOne),
      );
    }
    return enriched;
  };

  const itemSlots = ['augment', 'shield', 'weapon1', 'weapon2'];
  for (const key of itemSlots) {
    if (slots[key]) slots[key] = await enrichOne(slots[key]);
  }

  const arraySlots = ['backpack', 'quickItems', 'safePocket', 'augmentedSlots'];
  for (const key of arraySlots) {
    if (Array.isArray(slots[key])) {
      slots[key] = await Promise.all(slots[key].map(enrichOne));
    } else if (slots[key]) {
      slots[key] = await enrichOne(slots[key]);
    }
  }

  return out;
}

// account: "main" (default) | "trade"
async function getArcKey(discordId, account = 'main') {
  if (!discordId) return null;
  const user = await User.findOne({ id: discordId })
    .select('+arctrackerUserKey +arctrackerTradeKey')
    .lean();
  if (account === 'trade') {
    return user?.arctrackerTradeKey || user?.arctrackerUserKey || null;
  }
  return user?.arctrackerUserKey || null;
}

async function getArcTrackerSessionToken(discordId) {
  if (!discordId) return null;
  const user = await User.findOne({ id: discordId })
    .select('+arctrackerSessionToken')
    .lean();
  return user?.arctrackerSessionToken || null;
}

async function getMetaForgeProfileId(discordId) {
  if (!discordId) return null;
  const user = await User.findOne({ id: discordId })
    .select('metaForgeProfileId settings metaForgeProfile profile embarkId')
    .lean();
  return (
    user?.metaForgeProfileId ||
    user?.settings?.metaforgeId ||
    user?.metaForgeProfile?.id ||
    user?.metaForgeProfile?.profileId ||
    user?.profile?.embark_id ||
    user?.embarkId ||
    null
  );
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function findNested(value, keys, depth = 5) {
  if (!value || depth < 0) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNested(item, keys, depth - 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (typeof value !== 'object') return undefined;

  for (const key of keys) {
    if (value[key] !== undefined && value[key] !== null) return value[key];
  }
  for (const item of Object.values(value)) {
    const found = findNested(item, keys, depth - 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

async function getMetaForgePlayerStatsForUser(discordId) {
  const profileId = await getMetaForgeProfileId(discordId);
  if (!profileId) return null;
  return MetaForgeAPI.getPlayerStats(profileId);
}

async function getMetaForgeInventoryForUser(discordId) {
  const profileId = await getMetaForgeProfileId(discordId);
  if (!profileId) return null;
  return MetaForgeAPI.getInventorySnapshot(profileId);
}

async function getMetaForgeSyncForUser(discordId) {
  const profileId = await getMetaForgeProfileId(discordId);
  if (!profileId) return null;
  return MetaForgeAPI.getSync();
}

async function getMetaForgeSection(discordId, keys) {
  const profileId = await getMetaForgeProfileId(discordId);
  if (!profileId) return undefined;

  const [stats, inventory, sync] = await Promise.all([
    MetaForgeAPI.getPlayerStats(profileId).catch(() => null),
    MetaForgeAPI.getInventorySnapshot(profileId).catch(() => null),
    MetaForgeAPI.getSync().catch(() => null),
  ]);

  const result = firstValue(
    findNested(stats, keys),
    findNested(inventory, keys),
    findNested(sync, keys),
  );

  return result;
}

async function getSyncedExtensionSection(discordId, keys) {
  if (!discordId || !Array.isArray(keys) || keys.length === 0) return undefined;

  const directSources = keys.map((key) => `extension_${key}`);
  const direct = await SyncData.findOne({
    userId: discordId,
    source: { $in: directSources },
  })
    .sort({ syncedAt: -1 })
    .lean();
  if (direct?.payload !== undefined && direct?.payload !== null) {
    return direct.payload;
  }

  const full = await SyncData.findOne({
    userId: discordId,
    source: { $in: ['extension_full', 'shiestybuddy_v2', 'xbox_bridge'] },
  })
    .sort({ syncedAt: -1 })
    .lean();
  if (!full?.payload) return undefined;

  return firstValue(
    ...keys.map((key) => full.payload?.[key]),
    ...keys.map((key) => full.payload?.arcTrackerStats?.[key]),
    findNested(full.payload, keys),
  );
}

async function getSyncedExtensionProgress(discordId) {
  const progress = await getSyncedExtensionSection(discordId, ['progress']);
  if (progress) return progress;
  return getSyncedExtensionSection(discordId, ['gameProgress']);
}

async function getSyncedProviderSection(discordId, provider, keys) {
  if (!discordId || !provider || !Array.isArray(keys) || keys.length === 0) {
    return undefined;
  }

  const sources = keys.map((key) => `${provider}_${key}`);
  const direct = await SyncData.findOne({
    userId: discordId,
    source: { $in: sources },
  })
    .sort({ syncedAt: -1 })
    .lean();

  return direct?.payload;
}

async function saveProviderSnapshot(discordId, provider, key, payload) {
  if (!discordId || !provider || !key || payload === undefined || payload === null) {
    return;
  }

  try {
    await SyncData.updateOne(
      { userId: discordId, source: `${provider}_${key}` },
      {
        $set: {
          userId: discordId,
          source: `${provider}_${key}`,
          payload,
          syncedAt: new Date(),
        },
      },
      { upsert: true },
    );
  } catch (err) {
    logger.warn(
      `[UserDataAPI] Failed to save ${provider}_${key} snapshot:`,
      err.message,
    );
  }
}

function normalizeMetaForgeStash(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return snapshot;
  const arcInventory = snapshot.arcInventory || snapshot.data?.arcInventory;
  const envelope = arcInventory?.envelope;
  const root = snapshot.snapshot || snapshot.data || snapshot;
  const stashSlots = envelope?.view?.stashSlots;
  const items = firstValue(
    Array.isArray(stashSlots)
      ? stashSlots.map((slot) => ({
          ...(slot.item || {}),
          slotId: slot.id,
          role: slot.role,
          root: slot.root,
        }))
      : undefined,
    root.items,
    root.stashItems,
    root.stash?.items,
    root.inventory?.items,
    root.inventory,
  );
  return {
    ...root,
    items: Array.isArray(items) ? items : [],
    currencies: firstValue(
      root.currencies,
      root.wallet,
      root.raider_tokens,
      root.profile?.currencies,
      null,
    ),
    totals: firstValue(root.totals, envelope?.totals, null),
    usedSlots: firstValue(
      root.usedSlots,
      root.stash?.usedSlots,
      root.slots?.used,
      Array.isArray(stashSlots) ? stashSlots.length : undefined,
    ),
    maxSlots: firstValue(
      root.maxSlots,
      root.stash?.maxSlots,
      root.slots?.total,
    ),
    revision: firstValue(root.revision, envelope?.revision, null),
    source: 'metaforge',
  };
}

function normalizeMetaForgeStats(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const totals = payload.stats || payload.totals || payload;
  const profile = payload.profile || payload.raider || null;
  const totalDurationSeconds = firstValue(
    totals.totalDurationSeconds,
    totals.total_duration_seconds,
    totals.totalTimeSeconds,
    payload.totalTimeSeconds,
  );
  const totalNetValue = firstValue(
    totals.totalNetValue,
    totals.total_net_profit,
    totals.net_profit,
    totals.total_profit,
    totals.netIncome,
    payload.totalNetValue,
    payload.netIncome,
  );
  const enemyStats = normalizeMetaForgeEnemies(payload)?.enemies || [];
  const weaponStats = normalizeMetaForgeWeapons(payload)?.weapons || [];
  return {
    profile: profile,
    seasonNumber: profile?.seasonNumber || profile?.season || null,
    playerLevel: profile?.playerLevel || profile?.level || null,
    totalRounds: firstValue(totals.totalRounds, totals.total_rounds, totals.totalRaids),
    totalExtracted: firstValue(
      totals.totalExtracted,
      totals.total_extractions,
      totals.extractedRaids,
    ),
    totalDied: firstValue(totals.totalDied, totals.total_deaths, totals.failedRaids),
    totalTimeMs:
      firstValue(totals.totalTimeMs, totals.total_time_ms) ??
      (totalDurationSeconds !== undefined
        ? Number(totalDurationSeconds) * 1000
        : undefined),
    totalNetValue,
    netValue: totalNetValue,
    netProfit: totalNetValue,
    totalValueExtracted: firstValue(
      totals.totalValueExtracted,
      totals.valueExtracted,
      totals.value_extracted,
      totals.gross_profit,
      payload.totalValueExtracted,
      payload.valueExtracted,
      payload.value_extracted,
      payload.gross_profit,
    ),
    totalValueBroughtIn: firstValue(
      totals.totalValueBroughtIn,
      totals.valueBroughtIn,
      totals.value_brought_in,
      totals.loadout_value,
      payload.totalValueBroughtIn,
      payload.valueBroughtIn,
      payload.value_brought_in,
      payload.loadout_value,
    ),
    totalArcKills: firstValue(
      totals.totalArcKills,
      totals.total_arc_kills,
      totals.arc_enemies_destroyed,
      totals.arc_destroyed,
      totals.arcEnemiesDestroyed,
      payload.arc_enemies_destroyed,
      payload.arc_destroyed,
      payload.arcEnemiesDestroyed,
    ),
    totalPlayerKills: firstValue(
      totals.totalPlayerKills,
      totals.total_player_kills,
      totals.playerKills,
      totals.player_kills,
      totals.pvp_kills,
      payload.playerKills,
      payload.player_kills,
      payload.pvp_kills,
    ),
    totalKills: firstValue(
      totals.totalKills,
      totals.total_kills,
      payload.totalKills,
      payload.total_kills,
    ),
    totalDamage: firstValue(
      totals.totalDamage,
      totals.damage,
      totals.totalDamage,
      totals.total_damage_dealt,
      totals.damage_dealt,
      payload.totalDamage,
    ),
    totalDamageTaken: firstValue(
      totals.totalDamageTaken,
      totals.damageTaken,
      totals.total_damage_taken,
      totals.damage_taken,
    ),
    totalHealing: firstValue(totals.totalHealing, totals.total_healing),
    totalXp: firstValue(
      totals.totalXp,
      totals.score,
      totals.xp,
      totals.total_xp,
    ),
    totalScore: firstValue(
      totals.totalScore,
      totals.score,
      totals.total_xp,
      totals.totalXp,
    ),
    totalContainersLooted: firstValue(
      totals.totalContainersLooted,
      totals.totalContainers,
      totals.total_containers,
      totals.containers_looted,
      totals.containersLooted,
      payload.totalContainersLooted,
      payload.total_containers,
      payload.containers_looted,
      payload.containersLooted,
    ),
    mapStats:
      payload.mapStats ||
      payload.map_stats ||
      payload.map_performance ||
      payload.perMapPerformance ||
      [],
    enemyStats,
    weaponStats,
    arcEnemyBreakdown: Object.fromEntries(
      enemyStats.map((enemy) => [enemy.name, Number(enemy.count || 0)]),
    ),
    topWeapons: weaponStats,
    raidValueHistory: payload.raidValueHistory || payload.raid_value_history || [],
    source: 'metaforge',
  };
}

function isPresent(value) {
  return value !== undefined && value !== null;
}

function pickNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function cleanStatName(key) {
  return String(key || '')
    .replace(/_kills$/i, '')
    .replace(/^kills_/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function crawlCodexStats(obj, result = {}) {
  if (!obj || typeof obj !== 'object') return result;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'number' && value > 0) {
      const name = cleanStatName(key);
      if (name) result[name] = (result[name] || 0) + value;
    } else if (value && typeof value === 'object') {
      crawlCodexStats(value, result);
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
      result[name].kills += Number(value.kills) || 0;
      result[name].damage += Number(
        value.damage ??
          value.totalDamage ??
          value.total_damage ??
          value.damageDealt ??
          value.damage_dealt ??
          0,
      );
    } else if (value && typeof value === 'object') {
      crawlWeaponStats(value, result);
    }
  }
  return result;
}

function mergeUnifiedStats({
  arcSummary,
  arcCalculated,
  arcProfile,
  metaStats,
  extensionStats,
}) {
  const meta = normalizeMetaForgeStats(metaStats) || {};
  const extension = normalizeMetaForgeStats(extensionStats) || {};
  const calc = arcCalculated || {};
  const summary = arcSummary || {};
  const profile = arcProfile || {};

  const totalRounds = pickNumber(
    summary.totalRounds,
    calc.totalRaids,
    extension.totalRounds,
    meta.totalRounds,
  );
  const totalExtracted = pickNumber(
    summary.totalExtracted,
    calc.successfulExtractions,
    extension.totalExtracted,
    meta.totalExtracted,
  );
  const totalDied = pickNumber(
    summary.totalDied,
    calc.failedRaids,
    extension.totalDied,
    meta.totalDied,
  );
  const totalTimeMs = pickNumber(
    summary.totalTimeMs,
    calc.topsideSeconds !== undefined ? calc.topsideSeconds * 1000 : undefined,
    extension.totalTimeMs,
    meta.totalTimeMs,
  );
  const totalValueExtracted = pickNumber(
    summary.totalValueExtracted,
    calc.totalValueExtracted,
    calc.valueExtracted,
    calc.lootValue,
    extension.totalValueExtracted,
    meta.totalValueExtracted,
  );
  const totalValueBroughtIn = pickNumber(
    summary.totalValueBroughtIn,
    calc.totalValueBroughtIn,
    calc.valueBroughtIn,
    calc.loadoutValue,
    extension.totalValueBroughtIn,
    meta.totalValueBroughtIn,
  );
  const totalNetValue = pickNumber(
    summary.totalNetValue,
    calc.totalNetValue,
    calc.netValue,
    extension.totalNetValue,
    meta.totalNetValue,
    meta.netValue,
  );
  const totalDamage = pickNumber(
    summary.totalDamage,
    calc.totalDamage,
    extension.totalDamage,
    meta.totalDamage,
  );
  const totalScore = pickNumber(
    summary.totalScore,
    calc.totalScore,
    calc.totalXp,
    extension.totalScore,
    extension.totalXp,
    meta.totalScore,
    meta.totalXp,
  );
  const totalArcKills = pickNumber(
    summary.totalArcKills,
    calc.arcKills,
    extension.totalArcKills,
    meta.totalArcKills,
  );
  const totalPlayerKills = pickNumber(
    summary.totalPlayerKills,
    calc.playerKills,
    extension.totalPlayerKills,
    meta.totalPlayerKills,
  );
  const totalKills = pickNumber(
    summary.totalKills,
    calc.totalKills,
    extension.totalKills,
    meta.totalKills,
    Number(totalArcKills || 0) + Number(totalPlayerKills || 0),
  );
  const totalContainersLooted = pickNumber(
    summary.totalContainersLooted,
    calc.totalContainersLooted,
    calc.containersLooted,
    extension.totalContainersLooted,
    meta.totalContainersLooted,
  );

  return {
    ...meta,
    ...extension,
    ...calc,
    ...summary,
    profile: profile || meta.profile || null,
    username: profile.username || meta.profile?.username || meta.username,
    playerLevel: pickNumber(profile.playerLevel, meta.playerLevel),
    totalRounds,
    totalRaids: totalRounds,
    totalExtracted,
    successfulExtractions: totalExtracted,
    totalDied,
    failedRaids: totalDied,
    totalTimeMs,
    totalValueExtracted,
    valueExtracted: totalValueExtracted,
    lootValue: totalValueExtracted,
    totalValueBroughtIn,
    valueBroughtIn: totalValueBroughtIn,
    loadoutValue: totalValueBroughtIn,
    totalNetValue,
    netValue: totalNetValue,
    netProfit: totalNetValue,
    totalDamage,
    damage: totalDamage,
    totalScore,
    score: totalScore,
    totalXp: totalScore,
    totalArcKills,
    arcKills: totalArcKills,
    totalPlayerKills,
    playerKills: totalPlayerKills,
    totalKills,
    totalContainersLooted,
    containersLooted: totalContainersLooted,
    mapStats:
      (Array.isArray(extension.mapStats) && extension.mapStats.length > 0
        ? extension.mapStats
        : null) ||
      (Array.isArray(meta.mapStats) && meta.mapStats.length > 0
        ? meta.mapStats
        : null) ||
      calc.mapPerformance ||
      [],
    enemyStats: [
      ...(Array.isArray(extension.enemyStats) ? extension.enemyStats : []),
      ...(Array.isArray(meta.enemyStats) ? meta.enemyStats : []),
    ],
    weaponStats: [
      ...(Array.isArray(extension.weaponStats) ? extension.weaponStats : []),
      ...(Array.isArray(meta.weaponStats) ? meta.weaponStats : []),
    ],
    arcEnemyBreakdown:
      extension.arcEnemyBreakdown ||
      meta.arcEnemyBreakdown ||
      calc.arcEnemyBreakdown ||
      {},
    topWeapons:
      (Array.isArray(extension.topWeapons) && extension.topWeapons.length > 0
        ? extension.topWeapons
        : null) ||
      (Array.isArray(meta.topWeapons) && meta.topWeapons.length > 0
        ? meta.topWeapons
        : null) ||
      calc.topWeapons ||
      [],
    sources: {
      arctrackerSummary: !!arcSummary,
      arctrackerRounds: !!arcCalculated,
      arctrackerProfile: !!arcProfile,
      metaforge: !!metaStats,
      extensionSync: !!extensionStats,
    },
    providerValues: {
      arctracker: {
        summary: arcSummary || null,
        calculated: arcCalculated || null,
        profile: arcProfile || null,
      },
      metaforge: metaStats || null,
      extension: extensionStats || null,
    },
    source: 'unified',
  };
}

async function getExtensionStatsForUser(discordId) {
  const [statsPayload, roundsPayload, arcTrackerPayload] = await Promise.all([
    getSyncedExtensionSection(discordId, ['stats', 'summary']),
    getSyncedExtensionSection(discordId, [
      'rounds',
      'roundHistory',
      'raidHistory',
    ]),
    getSyncedExtensionSection(discordId, ['arcTrackerStats']),
  ]);

  const arcTrackerSummary =
    arcTrackerPayload?.summary?.data ??
    arcTrackerPayload?.summary ??
    arcTrackerPayload?.stats?.data ??
    arcTrackerPayload?.stats ??
    null;
  const directStats = statsPayload?.data ?? statsPayload ?? arcTrackerSummary;
  const roundStats = summarizeRoundList(roundsPayload);

  if (!directStats && !roundStats?.totalRounds) return null;
  return {
    ...(roundStats || {}),
    ...(directStats && typeof directStats === 'object' ? directStats : {}),
    source: 'extension_sync',
  };
}

async function getUnifiedStatsForUser(discordId) {
  const key = await getArcKey(discordId);
  const sessionToken = await getArcTrackerSessionToken(discordId);
  const [summary, calculated, profile, metaStats, extensionStats] =
    await Promise.all([
      sessionToken
        ? fetchArcTrackerWithCookie(
            sessionToken,
            '/api/embark/stats/summary',
          ).catch(() => null)
        : null,
      key ? summarizeRounds(key, { limit: 5000 }).catch(() => null) : null,
      key ? ArcTrackerAPI.getProfile(key).catch(() => null) : null,
      getMetaForgePlayerStatsForUser(discordId).catch(() => null),
      getExtensionStatsForUser(discordId).catch(() => null),
    ]);

  if (!summary && !calculated && !profile && !metaStats && !extensionStats) {
    return null;
  }

  return mergeUnifiedStats({
    arcSummary: summary,
    arcCalculated: calculated,
    arcProfile: profile,
    metaStats,
    extensionStats,
  });
}

function summarizeRoundList(rounds) {
  const rows = Array.isArray(rounds?.rounds)
    ? rounds.rounds
    : Array.isArray(rounds)
      ? rounds
      : [];
  let totalRounds = 0;
  let totalExtracted = 0;
  let totalDied = 0;
  let totalArcKills = 0;
  let totalPlayerKills = 0;
  let totalDamage = 0;
  let totalScore = 0;
  let totalTimeMs = 0;
  let totalValueExtracted = 0;
  let totalValueBroughtIn = 0;
  let totalNetValue = 0;
  let totalContainersLooted = 0;

  for (const round of rows) {
    totalRounds += 1;
    const outcome = String(round.outcome || round.status || '').toLowerCase();
    if (outcome === 'extracted' || outcome.includes('extract')) {
      totalExtracted += 1;
    } else if (outcome === 'died' || outcome === 'failed') {
      totalDied += 1;
    }
    totalArcKills +=
      Number(round.arcKills ?? round.arc_kills ?? round.arcDestroyed ?? 0) || 0;
    totalPlayerKills +=
      Number(round.playerKills ?? round.player_kills ?? round.kills ?? 0) || 0;
    totalDamage +=
      Number(
        round.damage ??
          round.damageDealt ??
          round.damage_dealt ??
          round.totalDamage ??
          0,
      ) || 0;
    totalScore += Number(round.score ?? round.xp ?? round.experience ?? 0) || 0;
    totalTimeMs +=
      Number(
        round.durationMs ??
          (round.durationSeconds != null
            ? Number(round.durationSeconds) * 1000
            : undefined) ??
          (round.duration != null ? Number(round.duration) * 1000 : 0),
      ) || 0;
    totalValueExtracted +=
      Number(round.valueExtracted ?? round.lootValue ?? round.loot_value ?? 0) || 0;
    totalValueBroughtIn +=
      Number(round.valueBroughtIn ?? round.loadoutValue ?? round.loadout_value ?? 0) || 0;
    totalNetValue += Number(round.netValue ?? round.netProfit ?? round.net_profit ?? 0) || 0;
    totalContainersLooted +=
      Number(
        round.totalContainersLooted ??
          round.containersLooted ??
          round.containers_looted ??
          round.lootedContainers ??
          round.containers ??
          0,
      ) || 0;
  }

  if (totalRounds > 0 && totalDied === 0) {
    totalDied = Math.max(0, totalRounds - totalExtracted);
  }

  return {
    totalRounds,
    totalRaids: totalRounds,
    totalExtracted,
    successfulExtractions: totalExtracted,
    totalDied,
    failedRaids: totalDied,
    totalTimeMs,
    totalValueExtracted,
    valueExtracted: totalValueExtracted,
    lootValue: totalValueExtracted,
    totalValueBroughtIn,
    valueBroughtIn: totalValueBroughtIn,
    loadoutValue: totalValueBroughtIn,
    totalNetValue,
    netValue: totalNetValue,
    netProfit: totalNetValue,
    totalArcKills,
    arcKills: totalArcKills,
    totalPlayerKills,
    playerKills: totalPlayerKills,
    totalKills: totalArcKills + totalPlayerKills,
    totalDamage,
    damage: totalDamage,
    totalScore,
    score: totalScore,
    totalXp: totalScore,
    totalContainersLooted,
    containersLooted: totalContainersLooted,
    source: 'extension_sync_rounds',
  };
}

function normalizeMetaForgeEnemies(payload) {
  const totals = payload?.stats || payload?.totals || {};
  const enemies =
    (Array.isArray(payload) ? payload : null) ||
    payload?.enemies ||
    payload?.data?.enemies ||
    payload?.arcKills ||
    payload?.enemyStats ||
    payload?.enemy_stats ||
    totals.enemyStats ||
    totals.enemy_stats;
  if (Array.isArray(enemies)) {
    return {
      enemies: enemies.map((enemy) => ({
        targetId: enemy.targetId ?? enemy.target_id ?? enemy.id ?? null,
        target_id: enemy.targetId ?? enemy.target_id ?? enemy.id ?? null,
        name: enemy.enemyName || enemy.enemy_name || enemy.name,
        count: enemy.kills ?? enemy.count ?? enemy.totalKills ?? 0,
        kills: enemy.kills ?? enemy.count ?? enemy.totalKills ?? 0,
        damage:
          enemy.damage ??
          enemy.totalDamage ??
          enemy.total_damage ??
          enemy.damageDealt ??
          enemy.damage_dealt ??
          0,
      })),
      source: 'metaforge',
    };
  }
  const breakdown =
    payload?.arcEnemyBreakdown ||
    payload?.arc_enemy_breakdown ||
    payload?.arc_destroyed_breakdown ||
    payload?.machine_kills ||
    payload?.codex ||
    payload?.data?.arcEnemyBreakdown ||
    payload?.data?.arc_enemy_breakdown ||
    payload?.data?.arc_destroyed_breakdown ||
    totals.arcEnemyBreakdown ||
    totals.arc_enemy_breakdown ||
    totals.arc_destroyed_breakdown ||
    totals.machine_kills ||
    totals.codex;
  if (breakdown && typeof breakdown === 'object') {
    const flat = crawlCodexStats(breakdown);
    return {
      enemies: Object.entries(flat).map(([name, count]) => ({
        targetId: null,
        target_id: null,
        name,
        count,
        kills: count,
      })),
      source: 'metaforge',
    };
  }
  return undefined;
}

function normalizeMetaForgeMaps(payload) {
  const maps =
    (Array.isArray(payload) ? payload : null) ||
    payload?.mapStats ||
    payload?.map_stats ||
    payload?.map_performance ||
    payload?.perMapPerformance;
  if (!Array.isArray(maps)) return undefined;
  return {
    maps: maps.map((map) => ({
      mapTargetId:
        map.mapTargetId ||
        map.mapId ||
        map.map_id ||
        map.map_target_id ||
        map.id ||
        null,
      mapId:
        map.mapId ||
        map.map_id ||
        map.mapTargetId ||
        map.map_target_id ||
        map.id ||
        null,
      mapName: map.mapName || map.map_name || map.map || 'Unknown',
      raids:
        map.raids || map.rounds || map.rounds_played || map.totalRounds || 0,
      extracted:
        map.extracted ||
        map.extractions ||
        map.total_extractions ||
        map.totalExtracted ||
        0,
      totalDurationMs:
        map.totalDurationMs ||
        map.durationMs ||
        map.total_duration_ms ||
        (map.avgTimeSeconds && map.raids
          ? Number(map.avgTimeSeconds) * Number(map.raids) * 1000
          : undefined) ||
        (map.total_duration_seconds
          ? Number(map.total_duration_seconds) * 1000
          : map.time_topside
            ? Number(map.time_topside) * 1000
            : 0),
      totalNetValue:
        map.totalNetValue ||
        map.total_net_profit ||
        map.netIncome ||
        map.netValue ||
        map.net_profit ||
        map.netProfit ||
        0,
    })),
    source: 'metaforge',
  };
}

function normalizeMetaForgeWeapons(payload) {
  const totals = payload?.stats || payload?.totals || {};
  const weapons =
    (Array.isArray(payload) ? payload : null) ||
    payload?.data?.weapons ||
    payload?.weaponsUsed ||
    payload?.weaponStats ||
    payload?.weapon_stats ||
    payload?.weapon_performance ||
    payload?.weapons ||
    payload?.topWeapons ||
    payload?.top_weapons ||
    payload?.data?.weaponsUsed ||
    payload?.data?.weaponStats ||
    payload?.data?.weapon_stats ||
    payload?.data?.weapon_performance ||
    payload?.data?.topWeapons ||
    payload?.data?.top_weapons ||
    totals.weaponStats ||
    totals.weapon_stats ||
    totals.weapon_performance ||
    totals.weapons ||
    totals.topWeapons ||
    totals.top_weapons;
  if (Array.isArray(weapons)) {
    return {
      weapons: weapons.map((weapon) => ({
        weaponAssetId:
          weapon.weaponAssetId ?? weapon.weapon_asset_id ?? weapon.assetId ?? null,
        weapon_asset_id:
          weapon.weaponAssetId ?? weapon.weapon_asset_id ?? weapon.assetId ?? null,
        itemId: weapon.itemId ?? weapon.item_id ?? weapon.id ?? null,
        item_id: weapon.itemId ?? weapon.item_id ?? weapon.id ?? null,
        name: weapon.weaponName || weapon.weapon_name || weapon.name,
        count: weapon.kills ?? weapon.count ?? weapon.totalKills ?? 0,
        kills: weapon.kills ?? weapon.count ?? weapon.totalKills ?? 0,
        damage:
          weapon.damage ??
          weapon.totalDamage ??
          weapon.total_damage ??
          weapon.damageDealt ??
          0,
      })),
      source: 'metaforge',
    };
  }
  if (weapons && typeof weapons === 'object') {
    const flat = crawlWeaponStats(weapons);
    const source = Object.keys(flat).length > 0 ? flat : weapons;
    return {
      weapons: Object.entries(source).map(([name, stats]) => ({
        weaponAssetId:
          stats?.weaponAssetId ?? stats?.weapon_asset_id ?? stats?.assetId ?? null,
        weapon_asset_id:
          stats?.weaponAssetId ?? stats?.weapon_asset_id ?? stats?.assetId ?? null,
        itemId: stats?.itemId ?? stats?.item_id ?? null,
        item_id: stats?.itemId ?? stats?.item_id ?? null,
        name,
        count: stats?.kills ?? stats?.count ?? 0,
        kills: stats?.kills ?? stats?.count ?? 0,
        damage: stats?.damage ?? stats?.totalDamage ?? 0,
      })),
      source: 'metaforge',
    };
  }
  return undefined;
}

function hasRows(data, key) {
  return Array.isArray(data?.[key]) && data[key].some((row) => {
    const count = Number(row.count ?? row.kills ?? row.totalKills ?? 0);
    const damage = Number(row.damage ?? row.totalDamage ?? 0);
    return count > 0 || damage > 0;
  });
}

function hasKillRows(data, key) {
  return Array.isArray(data?.[key]) && data[key].some((row) => {
    const count = Number(row.count ?? row.kills ?? row.totalKills ?? 0);
    return count > 0;
  });
}

function mergeEnemyKillSources(...sources) {
  const byKey = new Map();
  const sourceNames = new Set();
  for (const source of sources) {
    if (source?.source) sourceNames.add(source.source);
    const rows = Array.isArray(source?.enemies) ? source.enemies : [];
    for (const enemy of rows) {
      const targetId = enemy.targetId ?? enemy.target_id ?? enemy.id ?? null;
      const name = enemy.name || enemy.enemyName || enemy.enemy_name || targetId;
      if (!name) continue;
      const key = String(targetId ?? name).toLowerCase();
      const existing = byKey.get(key) || {
        targetId,
        target_id: targetId,
        name,
        count: 0,
        kills: 0,
        damage: 0,
      };
      existing.count += Number(enemy.count ?? enemy.kills ?? enemy.totalKills ?? 0);
      existing.kills = existing.count;
      existing.damage += Number(
        enemy.damage ??
          enemy.totalDamage ??
          enemy.total_damage ??
          enemy.damageDealt ??
          enemy.damage_dealt ??
          0,
      );
      byKey.set(key, existing);
    }
  }
  return {
    enemies: [...byKey.values()].sort((a, b) => b.count - a.count),
    source: sourceNames.size ? [...sourceNames].join('+') : 'merged',
  };
}

function mergeWeaponKillSources(...sources) {
  const byKey = new Map();
  const sourceNames = new Set();
  for (const source of sources) {
    if (source?.source) sourceNames.add(source.source);
    const rows = Array.isArray(source?.weapons) ? source.weapons : [];
    for (const weapon of rows) {
      const weaponAssetId =
        weapon.weaponAssetId ?? weapon.weapon_asset_id ?? weapon.assetId ?? null;
      const itemId = weapon.itemId ?? weapon.item_id ?? null;
      const name =
        weapon.name || weapon.weaponName || weapon.weapon_name || weaponAssetId;
      if (!name) continue;
      const key = String(weaponAssetId ?? itemId ?? name).toLowerCase();
      const existing = byKey.get(key) || {
        weaponAssetId,
        weapon_asset_id: weaponAssetId,
        itemId,
        item_id: itemId,
        name,
        count: 0,
        kills: 0,
        damage: 0,
      };
      existing.count += Number(weapon.count ?? weapon.kills ?? weapon.totalKills ?? 0);
      existing.kills = existing.count;
      existing.damage += Number(
        weapon.damage ??
          weapon.totalDamage ??
          weapon.total_damage ??
          weapon.damageDealt ??
          weapon.damage_dealt ??
          0,
      );
      byKey.set(key, existing);
    }
  }
  return {
    weapons: [...byKey.values()].sort((a, b) => b.count - a.count),
    source: sourceNames.size ? [...sourceNames].join('+') : 'merged',
  };
}

function mergeMapPerformanceSources(...sources) {
  const byKey = new Map();
  const sourceNames = new Set();
  for (const source of sources) {
    if (source?.source) sourceNames.add(source.source);
    const rows = Array.isArray(source?.maps) ? source.maps : [];
    for (const map of rows) {
      const name = map.mapName || map.map_name || map.name || map.map || 'Unknown';
      const key = String(
        map.mapTargetId || map.mapId || map.map_id || map.map_target_id || name,
      ).toLowerCase();
      const existing = byKey.get(key) || {
        mapTargetId:
          map.mapTargetId ||
          map.mapId ||
          map.map_id ||
          map.map_target_id ||
          map.id ||
          null,
        mapId:
          map.mapId ||
          map.map_id ||
          map.mapTargetId ||
          map.map_target_id ||
          map.id ||
          null,
        mapName: name,
        raids: 0,
        extracted: 0,
        totalDurationMs: 0,
        totalNetValue: 0,
      };
      existing.raids += Number(map.raids ?? map.rounds ?? map.rounds_played ?? 0);
      existing.extracted += Number(map.extracted ?? map.extractions ?? 0);
      existing.totalDurationMs += Number(
        map.totalDurationMs ?? map.total_duration_ms ?? map.durationMs ?? 0,
      );
      existing.totalNetValue += Number(
        map.totalNetValue ?? map.total_net_profit ?? map.netValue ?? map.netProfit ?? 0,
      );
      byKey.set(key, existing);
    }
  }
  return {
    maps: [...byKey.values()].sort((a, b) => b.raids - a.raids),
    source: sourceNames.size ? [...sourceNames].join('+') : 'merged',
  };
}

async function viaProviders(
  discordId,
  arcFn,
  metaForgeFn,
  fallbackFn,
  account = 'main',
  syncKeys = [],
  syncNormalize = null,
) {
  // ── 1. Try live ArcTracker API first (most accurate, freshest data) ──
  try {
    const key = await getArcKey(discordId, account);
    if (key && typeof arcFn === 'function') {
      const data = await arcFn(key);
      if (account === 'main' && syncKeys[0]) {
        await saveProviderSnapshot(discordId, 'arctracker', syncKeys[0], data);
      }
      logger.info(
        `[UserDataAPI] viaProviders(${syncKeys[0] || 'unknown'}) → source: arctracker_live`,
      );
      return enrichGameAssetRefs(data);
    }
  } catch (err) {
    logger.warn(
      `[UserDataAPI] viaProviders(${syncKeys[0] || 'unknown'}) ArcTracker live failed, trying parallel fallbacks: ${err.message}`,
    );
  }

  // ── 2. If live API fails, run ALL fallbacks in parallel ──
  const fallbackPromises = [];

  // Extension sync data
  if (account === 'main') {
    fallbackPromises.push(
      (async () => {
        try {
          const synced = await getSyncedExtensionSection(discordId, syncKeys);
          if (synced !== undefined && synced !== null) {
            const normalized =
              typeof syncNormalize === 'function'
                ? syncNormalize(synced)
                : synced;
            logger.info(
              `[UserDataAPI] viaProviders(${syncKeys[0] || 'unknown'}) → source: extension_sync (parallel fallback)`,
            );
            return enrichGameAssetRefs(normalized);
          }
        } catch (err) {
          logger.warn(
            '[UserDataAPI] Extension sync lookup failed:',
            err.message,
          );
        }
        return null;
      })(),
    );

    // Cached ArcTracker snapshots
    fallbackPromises.push(
      (async () => {
        try {
          const cached = await getSyncedProviderSection(
            discordId,
            'arctracker',
            syncKeys,
          );
          if (cached !== undefined && cached !== null) {
            const normalized =
              typeof syncNormalize === 'function'
                ? syncNormalize(cached)
                : cached;
            logger.info(
              `[UserDataAPI] viaProviders(${syncKeys[0] || 'unknown'}) → source: arctracker_snapshot (parallel fallback)`,
            );
            return enrichGameAssetRefs(normalized);
          }
        } catch (err) {
          logger.warn(
            '[UserDataAPI] ArcTracker snapshot lookup failed:',
            err.message,
          );
        }
        return null;
      })(),
    );
  }

  // MetaForge
  if (account === 'main' && metaForgeFn) {
    fallbackPromises.push(
      (async () => {
        try {
          const data = await metaForgeFn(discordId);
          if (data !== undefined && data !== null) {
            logger.info(
              `[UserDataAPI] viaProviders(${syncKeys[0] || 'unknown'}) → source: metaforge (parallel fallback)`,
            );
            return enrichGameAssetRefs(data);
          }
        } catch (err) {
          logger.warn('[UserDataAPI] MetaForge call failed:', err.message);
        }
        return null;
      })(),
    );
  }

  // Generic fallback function
  if (typeof fallbackFn === 'function') {
    fallbackPromises.push(
      (async () => {
        try {
          const data = await fallbackFn();
          logger.info(
            `[UserDataAPI] viaProviders(${syncKeys[0] || 'unknown'}) → source: fallback_fn (parallel fallback)`,
          );
          return enrichGameAssetRefs(data);
        } catch (err) {
          logger.warn('[UserDataAPI] Fallback function failed:', err.message);
        }
        return null;
      })(),
    );
  }

  // Run all fallbacks in parallel and return first successful result
  if (fallbackPromises.length > 0) {
    const results = await Promise.allSettled(fallbackPromises);
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value !== null) {
        return result.value;
      }
    }
  }

  // All fallbacks failed
  logger.warn(
    `[UserDataAPI] viaProviders(${syncKeys[0] || 'unknown'}) → all fallbacks failed`,
  );
  return null;
}

export const UserDataAPI = {
  getProfile: (discordId) =>
    viaProviders(
      discordId,
      (k) => ArcTrackerAPI.getProfile(k),
      async (id) => {
        const raw = await getMetaForgePlayerStatsForUser(id);
        // Extract profile with season/level from MetaForge data
        if (!raw || typeof raw !== 'object') return null;
        const profile = raw.profile || raw.raider || raw;
        return {
          ...profile,
          seasonNumber: profile?.seasonNumber || profile?.season || null,
          playerLevel: profile?.playerLevel || profile?.level || null,
        };
      },
      () => null,
      'main',
      ['profile'],
    ),

  getStash: async (discordId, opts = {}) => {
    const account = opts.account === 'trade' ? 'trade' : 'main';
    const data = await viaProviders(
      discordId,
      (k) => ArcTrackerAPI.getAllStash(k),
      async (id) =>
        normalizeMetaForgeStash(await getMetaForgeInventoryForUser(id)),
      () => null,
      account,
      ['stash', 'inventory', 'inventoryLatest'],
      (synced) => synced?.inventory || synced?.snapshot || synced,
    );
    if (data && Array.isArray(data.items)) {
      data.items = await enrichItems(data.items);
    }
    return data;
  },

  getLoadout: async (discordId, opts = {}) => {
    const account = opts.account === 'trade' ? 'trade' : 'main';
    const data = await viaProviders(
      discordId,
      (k) => ArcTrackerAPI.getLoadout(k),
      async (id) => {
        const snapshot = await getMetaForgeInventoryForUser(id);
        return firstValue(
          snapshot?.loadout,
          snapshot?.snapshot?.loadout,
          snapshot?.data?.loadout,
        );
      },
      () => null,
      account,
      ['loadout', 'inventoryLatest'],
      (synced) => synced?.loadout || synced,
    );
    if (data && Array.isArray(data.items)) {
      data.items = await enrichItems(data.items);
    }
    return enrichLoadout(data);
  },

  getHideout: (discordId, opts = {}) =>
    viaProviders(
      discordId,
      (k) => ArcTrackerAPI.getHideout(k),
      (id) =>
        getMetaForgeSection(id, [
          'hideout',
          'workshop',
          'workshops',
          'modules',
        ]),
      () => null,
      opts.account === 'trade' ? 'trade' : 'main',
      ['hideout', 'workshop', 'workshops', 'modules'],
    ),

  getQuests: (discordId, opts = {}) =>
    viaProviders(
      discordId,
      (k) =>
        opts.filter
          ? ArcTrackerAPI.getQuests(k, opts)
          : ArcTrackerAPI.getQuestProgress(k, opts),
      (id) => getMetaForgeSection(id, ['quests', 'questProgress']),
      () => null,
      opts.account === 'trade' ? 'trade' : 'main',
      ['quests', 'questProgress'],
    ),

  getProjects: (discordId, opts = {}) =>
    viaProviders(
      discordId,
      (k) =>
        opts.season
          ? ArcTrackerAPI.getProjects(k, opts)
          : ArcTrackerAPI.getAllProjects(k, opts),
      (id) => getMetaForgeSection(id, ['projects', 'projectProgress']),
      () => null,
      opts.account === 'trade' ? 'trade' : 'main',
      ['projects', 'projectProgress', 'progress', 'gameProgress'],
      (synced) => {
        if (Array.isArray(synced) || Array.isArray(synced?.projects)) {
          return synced;
        }
        return normalizeProjectProgressSnapshot(synced) || synced;
      },
    ),

  getBlueprints: async (discordId, opts = {}) => {
    const account = opts.account === 'trade' ? 'trade' : 'main';
    const data = await viaProviders(
      discordId,
      (k) => ArcTrackerAPI.getBlueprints(k),
      (id) => getMetaForgeSection(id, ['blueprints', 'learnedBlueprints']),
      () => null,
      account,
      ['blueprints', 'learnedBlueprints'],
    );
    if (data && Array.isArray(data.items)) {
      data.items = await enrichItems(data.items);
    } else if (Array.isArray(data)) {
      return enrichItems(data);
    }
    return data;
  },

  getRounds: (discordId, opts = {}) =>
    viaProviders(
      discordId,
      async (k) => {
        // Use getAllRounds to paginate past ArcTracker's 200/req limit
        const data = await ArcTrackerAPI.getAllRounds(k, {
          maxTotal: opts.limit || 5000,
          outcome: opts.outcome,
          map: opts.map,
          dateFrom: opts.dateFrom || opts.date_from,
          dateTo: opts.dateTo || opts.date_to,
          sort: opts.sort,
        });
        // Normalize to an array shape so legacy callers keep working.
        return Array.isArray(data?.rounds)
          ? data.rounds
          : Array.isArray(data)
            ? data
            : [];
      },
      (id) =>
        getMetaForgeSection(id, [
          'rounds',
          'roundHistory',
          'raidHistory',
          'matches',
        ]),
      () => null,
      'main',
      ['rounds', 'roundHistory', 'raidHistory', 'matches'],
    ),

  getStats: (discordId) => getUnifiedStatsForUser(discordId),

  // Lifetime enemy kill totals per enemy type.
  getEnemyKills: async (discordId) => {
    let arcData = null;
    let metaData = null;
    let syncedData = null;

    // 1. Try cookie-auth with session token first (works for cookie-only endpoints)
    try {
      const sessionToken = await getArcTrackerSessionToken(discordId);
      if (sessionToken) {
        const data = await fetchArcTrackerWithCookie(
          sessionToken,
          '/api/embark/stats/enemy-kills',
        );
        arcData =
          normalizeMetaForgeEnemies(data) || (data ? { ...data } : null);
        if (arcData) arcData.source = 'arctracker_cookie';
        if (arcData) {
          await saveProviderSnapshot(
            discordId,
            'arctracker',
            'enemyKills',
            arcData,
          );
        }
      }
    } catch (err) {
      logger.warn(
        '[UserDataAPI] ArcTracker cookie enemy kills failed:',
        err.message,
      );
    }

    try {
      metaData = normalizeMetaForgeEnemies(
        await getMetaForgePlayerStatsForUser(discordId),
      );
    } catch (err) {
      logger.warn('[UserDataAPI] MetaForge enemy kills failed:', err.message);
    }
    try {
      syncedData = normalizeMetaForgeEnemies(
        await getSyncedExtensionSection(discordId, [
          'enemyKills',
          'enemy_kills',
          'enemyStats',
          'enemy_stats',
          'arc_destroyed_breakdown',
          'machine_kills',
          'codex',
          'stats',
        ]),
      );
      if (syncedData) syncedData.source = 'extension_sync';
    } catch (err) {
      logger.warn('[UserDataAPI] Extension enemy kills failed:', err.message);
    }
    if (!hasRows(arcData, 'enemies')) {
      try {
        arcData = normalizeMetaForgeEnemies(
          await getSyncedProviderSection(discordId, 'arctracker', [
            'enemyKills',
            'stats',
            'summary',
          ]),
        );
        if (arcData) arcData.source = 'arctracker_snapshot';
      } catch (err) {
        logger.warn(
          '[UserDataAPI] ArcTracker enemy snapshot failed:',
          err.message,
        );
      }
    }
    if (!hasRows(arcData, 'enemies')) {
      try {
        const key = await getArcKey(discordId);
        if (key) {
          arcData = normalizeMetaForgeEnemies(
            await summarizeRounds(key, { limit: 5000 }),
          );
          if (arcData) arcData.source = 'arctracker_rounds_summary';
        }
      } catch (err) {
        logger.warn(
          '[UserDataAPI] ArcTracker enemy rounds summary failed:',
          err.message,
        );
      }
    }
    if (
      hasRows(arcData, 'enemies') ||
      hasRows(metaData, 'enemies') ||
      hasRows(syncedData, 'enemies')
    ) {
      return enrichGameAssetRefs(
        mergeEnemyKillSources(arcData, metaData, syncedData),
      );
    }
    return { enemies: [], source: 'no_synced_enemy_kills' };
  },

  // Pre-aggregated per-map performance stats.
  getMapPerformance: async (discordId) => {
    let arcData = null;
    let metaData = null;
    let syncedData = null;

    // 1. Try cookie-auth with session token first
    try {
      const sessionToken = await getArcTrackerSessionToken(discordId);
      if (sessionToken) {
        const data = await fetchArcTrackerWithCookie(
          sessionToken,
          '/api/embark/stats/map-performance',
        );
        arcData = data ? { ...data, source: 'arctracker_cookie' } : null;
        if (arcData) {
          await saveProviderSnapshot(
            discordId,
            'arctracker',
            'mapPerformance',
            arcData,
          );
        }
      }
    } catch (err) {
      logger.warn(
        '[UserDataAPI] ArcTracker cookie map performance failed:',
        err.message,
      );
    }

    try {
      metaData = normalizeMetaForgeMaps(
        await getMetaForgePlayerStatsForUser(discordId),
      );
    } catch (err) {
      logger.warn(
        '[UserDataAPI] MetaForge map performance failed:',
        err.message,
      );
    }
    try {
      syncedData = normalizeMetaForgeMaps(
        await getSyncedExtensionSection(discordId, [
          'mapPerformance',
          'map_performance',
          'mapStats',
          'map_stats',
        ]),
      );
      if (syncedData) syncedData.source = 'extension_sync';
    } catch (err) {
      logger.warn(
        '[UserDataAPI] Extension map performance failed:',
        err.message,
      );
    }
    if (
      hasRows(arcData, 'maps') ||
      hasRows(metaData, 'maps') ||
      hasRows(syncedData, 'maps')
    ) {
      return enrichGameAssetRefs(
        mergeMapPerformanceSources(arcData, metaData, syncedData),
      );
    }
    return null;
  },

  // Current expedition/season status and tier progress.
  getExpeditionStatus: (discordId) =>
    viaProviders(
      discordId,
      (k) => ArcTrackerAPI.getExpeditionStatus(k),
      (id) =>
        getMetaForgeSection(id, [
          'expeditionStatus',
          'expedition',
          'season',
          'activeSeason',
        ]),
      () => null,
      'main',
      [
        'expeditionStatus',
        'expedition',
        'season',
        'activeSeason',
        'progress',
        'gameProgress',
      ],
      (synced) => {
        if (synced?.projectPhaseStatuses && Array.isArray(synced?.phases)) {
          return synced;
        }
        const progress = normalizeProgressSnapshot(synced);
        return deriveExpeditionStatus(progress) || synced;
      },
    ),

  // Lifetime weapon kill totals per weapon.
  getWeaponKills: async (discordId) => {
    let arcData = null;
    let syncedData = null;

    // 1. Try cookie-auth with session token first
    try {
      const sessionToken = await getArcTrackerSessionToken(discordId);
      if (sessionToken) {
        const data = await fetchArcTrackerWithCookie(
          sessionToken,
          '/api/embark/stats/weapon-kills',
        );
        arcData = normalizeMetaForgeWeapons(data) || (data ? { ...data } : null);
        if (arcData) arcData.source = 'arctracker_cookie';
        if (arcData) {
          await saveProviderSnapshot(
            discordId,
            'arctracker',
            'weaponKills',
            arcData,
          );
        }
      }
    } catch (err) {
      logger.warn('[UserDataAPI] ArcTracker cookie weapon kills failed:', err.message);
    }

    // MetaForge player-stats `weaponStats` rows are damage-only
    // ({ weapon_name, damage, last_updated }); do not use them as weapon kills.
    try {
      syncedData = normalizeMetaForgeWeapons(
        await getSyncedExtensionSection(discordId, [
          'weaponKills',
          'weapon_kills',
          'weaponStats',
          'weapon_stats',
          'weapon_performance',
          'weapons',
          'stats',
        ]),
      );
      if (syncedData) syncedData.source = 'extension_sync';
    } catch (err) {
      logger.warn('[UserDataAPI] Extension weapon kills failed:', err.message);
    }
    if (!hasKillRows(arcData, 'weapons')) {
      try {
        arcData = normalizeMetaForgeWeapons(
          await getSyncedProviderSection(discordId, 'arctracker', [
            'weaponKills',
            'stats',
            'summary',
          ]),
        );
        if (arcData) arcData.source = 'arctracker_snapshot';
      } catch (err) {
        logger.warn(
          '[UserDataAPI] ArcTracker weapon snapshot failed:',
          err.message,
        );
      }
    }
    if (!hasKillRows(arcData, 'weapons')) {
      try {
        const key = await getArcKey(discordId);
        if (key) {
          arcData = normalizeMetaForgeWeapons(
            await summarizeRounds(key, { limit: 5000 }),
          );
          if (arcData) arcData.source = 'arctracker_rounds_summary';
        }
      } catch (err) {
        logger.warn(
          '[UserDataAPI] ArcTracker weapon rounds summary failed:',
          err.message,
        );
      }
    }
    if (
      hasKillRows(arcData, 'weapons') ||
      hasKillRows(syncedData, 'weapons')
    ) {
      return enrichGameAssetRefs(
        mergeWeaponKillSources(arcData, syncedData),
      );
    }
    return { weapons: [], source: 'no_synced_weapon_kills' };
  },

  // Summary endpoint - pre-aggregated stats (totalRounds, totalExtracted, totalDied, etc.)
  getSummary: (discordId) => getUnifiedStatsForUser(discordId),
};

export default UserDataAPI;
