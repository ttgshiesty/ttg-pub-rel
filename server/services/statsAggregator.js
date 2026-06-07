/* =========================================================
   Stats Aggregator
   Pulls profile + rounds + hideout + projects + quests + blueprints +
   stash from ArcTracker (or fallback) and produces a single
   MetaForge-style stats object the client can render directly.
   ========================================================= */

import { UserDataAPI } from './userDataApi.js';
import { ArcTrackerAPI } from './arctracker.js';
import { MetaForgeAPI } from './metaforge.js';
import { User } from '../models/User.js';
import ArdbService from './ardb.js';
import logger from '../utils/logger.js';
import { finalizeStatsOverview } from './statsMapping.js';

const safe = (p) => p.catch(() => null);

/**
 * Keep the already-unified summary value when it exists, then fill only a
 * genuinely missing field from the direct MetaForge snapshot.
 */
function pickStat(primaryVal, complementaryVal) {
  if (primaryVal !== undefined && primaryVal !== null) {
    const primaryNum = Number(primaryVal);
    return Number.isFinite(primaryNum) ? primaryNum : primaryVal;
  }
  if (complementaryVal !== undefined && complementaryVal !== null) {
    const complementaryNum = Number(complementaryVal);
    return Number.isFinite(complementaryNum)
      ? complementaryNum
      : complementaryVal;
  }
  return 0;
}

/**
 * Deep-crawl a MetaForge arc_destroyed_breakdown object into a flat codex map.
 * Returns: { "Enemy Name": killCount, ... }
 */
function crawlCodex(obj, result = {}) {
  if (!obj || typeof obj !== 'object') return result;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number' && v > 0) {
      const name = k
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
      result[name] = (result[name] || 0) + v;
    } else if (typeof v === 'object' && v !== null) {
      crawlCodex(v, result);
    }
  }
  return result;
}

/**
 * Deep-crawl a MetaForge weapon_performance object into a weapon list.
 * Returns: { "Weapon Name": { kills, damage }, ... }
 */
function crawlWeapons(obj, result = {}) {
  if (!obj || typeof obj !== 'object') return result;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number' && k.includes('kills') && v > 0) {
      const name = k
        .replace(/_kills/g, '')
        .replace(/kills_/g, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
      if (!result[name]) result[name] = { kills: 0, damage: 0 };
      result[name].kills += v;
    } else if (v && typeof v === 'object' && v.kills !== undefined) {
      const name = k
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
      result[name] = {
        kills: num(v.kills),
        damage: num(v.damage ?? v.totalDamage ?? 0),
      };
    } else if (typeof v === 'object') {
      crawlWeapons(v, result);
    }
  }
  return result;
}

function normalizeMetaForgeRaiderPayload(payload) {
  if (!payload || typeof payload !== 'object') return {};

  const totals = payload?.stats && typeof payload.stats === 'object' ? payload.stats : {};
  const rounds = num(totals.total_rounds);
  const extractions = num(totals.total_extractions);
  const deaths = num(totals.total_deaths);
  const mapSource = Array.isArray(payload?.mapStats) ? payload.mapStats : [];
  const enemySource = Array.isArray(payload?.enemyStats) ? payload.enemyStats : [];
  const weaponSource = Array.isArray(payload?.weaponStats) ? payload.weaponStats : [];
  const normalizedEnemyBreakdown = Array.isArray(enemySource)
    ? enemySource.reduce((acc, enemy) => {
        const name =
          enemy?.enemy_name ??
          enemy?.enemyName ??
          enemy?.name;
        if (!name) return acc;
        acc[name] = (acc[name] || 0) + num(enemy?.kills);
        return acc;
      }, {})
    : {};
  const normalizedWeaponPerformance = Array.isArray(weaponSource)
    ? weaponSource.reduce((acc, weapon) => {
        const name =
          weapon?.weapon_name ??
          weapon?.weaponName ??
          weapon?.name;
        if (!name) return acc;
        acc[name] = {
          kills: 0,
          damage: num(weapon?.damage),
        };
        return acc;
      }, {})
    : {};
  const normalizedEnemyStats = Array.isArray(enemySource)
    ? enemySource.map((enemy) => ({
        user_id: enemy?.user_id ?? totals.user_id ?? null,
        enemy_name: enemy?.enemy_name ?? enemy?.enemyName ?? enemy?.name ?? null,
        name: enemy?.enemy_name ?? enemy?.enemyName ?? enemy?.name ?? 'Unknown',
        count: num(enemy?.kills),
        kills: num(enemy?.kills),
        damage: num(enemy?.damage),
        last_updated: enemy?.last_updated ?? null,
      }))
    : [];

  return {
    ...payload,
    total_raids: rounds,
    total_rounds: rounds,
    extracted: extractions,
    extracted_count: extractions,
    died: deaths,
    total_deaths: deaths,
    total_profit: num(totals.total_net_profit),
    net_profit: num(totals.total_net_profit),
    arc_enemies_destroyed: num(totals.total_arc_kills),
    arc_destroyed: num(totals.total_arc_kills),
    player_kills: num(totals.total_player_kills),
    player_downs: num(totals.total_player_downs),
    damage_dealt: num(totals.total_damage_dealt),
    damage_received: num(totals.total_damage_taken),
    healing: num(totals.total_healing),
    total_xp: num(totals.total_xp),
    totalContainersLooted: 0,
    survival_rate: rounds > 0 ? extractions / rounds : 0,
    extraction_rate: rounds > 0 ? extractions / rounds : 0,
    map_stats: mapSource,
    map_performance: mapSource,
    enemy_stats: normalizedEnemyStats,
    weapon_stats: weaponSource.map((weapon) => ({
      user_id: weapon?.user_id ?? totals.user_id ?? null,
      weapon_name: weapon?.weapon_name ?? weapon?.weaponName ?? weapon?.name ?? null,
      damage: num(weapon?.damage),
      last_updated: weapon?.last_updated ?? null,
    })),
    arc_destroyed_breakdown: normalizedEnemyBreakdown,
    weapon_performance: normalizedWeaponPerformance,
    totalDamageDealt: num(payload?.totalDamageDealt ?? totals.total_damage_dealt),
    totalPlayerDowns: num(payload?.totalPlayerDowns ?? totals.total_player_downs),
  };
}

function getExactStatField(payload, key) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload[key] !== undefined && payload[key] !== null) return payload[key];
  if (
    payload.stats &&
    typeof payload.stats === 'object' &&
    payload.stats[key] !== undefined &&
    payload.stats[key] !== null
  ) {
    return payload.stats[key];
  }
  return null;
}

/**
 * SHiESTY: compute demonStreak (max consecutive extraction streak) from rounds.
 */
function computeDemonStreak(rounds) {
  let maxStreak = 0;
  let current = 0;
  for (const r of [...rounds].reverse()) {
    if (isExtract(r)) {
      current++;
      if (current > maxStreak) maxStreak = current;
    } else {
      current = 0;
    }
  }
  return maxStreak;
}

/**
 * SHiESTY: compute raidEfficiency (avg $/min across successful extractions).
 */
function computeRaidEfficiency(rounds) {
  let total = 0;
  let count = 0;
  for (const r of rounds) {
    if (!isExtract(r)) continue;
    const dur = pickDuration(r);
    const profit = pickProfit(r);
    if (dur > 0) {
      total += profit / (dur / 60);
      count++;
    }
  }
  return count > 0 ? Math.round(total / count) : 0;
}

/**
 * SHiESTY: sum value of Common-rarity items in stash.
 */
function computeTrashValue(stashItems) {
  return stashItems
    .filter((i) => (i.rarity || '').toLowerCase() === 'common')
    .reduce(
      (acc, i) => acc + num(i.value || i.price) * num(i.quantity || 1),
      0,
    );
}

/**
 * SHiESTY: total stash weight using ARDB weightKg data.
 */
function computeTotalWeight(stashItems) {
  return stashItems.reduce((acc, i) => {
    const ardbItem = ArdbService.lookupItem(i.id || i.itemId);
    const kg = num(ardbItem?.weightKg ?? i.weightKg ?? 0);
    return acc + kg * num(i.quantity || 1);
  }, 0);
}

const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// -------------------------------------------------------
// Field pickers — real ArcTracker round shape (confirmed):
//   roundId, mapName, status ("Failed"/"Extracted"),
//   duration (seconds as string), lootValue, loadoutValue,
//   netProfit, arcKills, playerKills, playerDowns, deaths,
//   damageDealt, damageTaken, xp, healing, damageByWeapon,
//   syncedAt,
//   arcBreakdown:        [{ targetName, kills, damage, type }]
//   weaponDamageBreakdown: [{ weaponName, amount }]
// -------------------------------------------------------
const pickKills = (r) =>
  num(
    r.kills ??
      num(r.arcKills ?? r.arc_kills) + num(r.playerKills ?? r.player_kills),
  );
const pickArcKills = (r) =>
  num(r.arcKills ?? r.arc_kills ?? r.arcDestroyed ?? r.aiKills ?? r.botKills);
const pickPlayerKills = (r) =>
  num(r.playerKills ?? r.player_kills ?? r.kills ?? r.pvpKills);
const pickDowns = (r) => num(r.playerDowns ?? r.knocks ?? r.downs ?? r.knockdowns);
const pickDmgDealt = (r) =>
  num(r.damage ?? r.damageDealt ?? r.damage_dealt ?? r.totalDamage);
const pickDmgRecv = (r) =>
  // ArcTracker uses damageTaken
  num(r.damageTaken ?? r.damageReceived ?? r.damage_received ?? r.damage_taken);
const pickHealed = (r) =>
  // ArcTracker uses healing
  num(
    r.healthRestored ??
      r.healing ??
      r.healed ??
      r.healingDone ??
      r.health_restored,
  );
const pickDuration = (r) => {
  if (r.durationMs !== undefined) return num(r.durationMs) / 1000;
  return num(r.duration ?? r.durationSeconds ?? r.time_topside ?? r.timeAlive);
};
const pickProfit = (r) => {
  if (r.netValue !== undefined) return num(r.netValue);
  if (r.netProfit !== undefined) return num(r.netProfit);
  if (r.valueExtracted !== undefined && r.valueBroughtIn !== undefined)
    return num(r.valueExtracted) - num(r.valueBroughtIn);
  return num(
    r.profit ??
      r.net_profit ??
      r.lootValueGained ??
      r.lootGained ??
      r.lootValue ??
      r.value,
  );
};
const pickLootValue = (r) =>
  num(r.valueExtracted ?? r.lootValue ?? r.loot_value ?? r.netValue);
const pickLoadoutValue = (r) =>
  num(r.valueBroughtIn ?? r.loadoutValue ?? r.loadout_value);
const pickScore = (r) => num(r.score ?? r.xp ?? r.experience ?? r.totalScore);
const pickRevivesGiven = (r) =>
  num(r.revivesGiven ?? r.revives ?? r.allyRevives);
const pickRevivesReceived = (r) =>
  num(r.revivesReceived ?? r.wasRevived ?? r.timesRevived);
const pickContainersLooted = (r) =>
  num(
    r.containersLooted ??
      r.containers_looted ??
      r.lootedContainers ??
      r.totalContainersLooted ??
      r.containers,
  );
const pickVaultsBreached = (r) =>
  num(r.vaultsBreached ?? r.vaultsOpened ?? r.lockedVaults);
const pickKeysConsumed = (r) =>
  num(r.keysUsed ?? r.keysConsumed ?? r.consumedKeys);
const pickItemsScrapped = (r) =>
  num(
    r.itemsScrapped ??
      r.itemsRecycled ??
      r.itemsScrappedCount ??
      r.scrappedItems,
  );
const pickItemsExtracted = (r) =>
  num(r.itemsExtracted ?? r.itemsExtractedCount ?? r.extractedItems);
const pickRareContainers = (r) =>
  num(r.rareContainersFound ?? r.rareContainers ?? r.vaultContainersOpened);
const pickLockedDoors = (r) =>
  num(r.lockedDoorsOpened ?? r.lockedDoors ?? r.doorsOpened);
const pickIndustrialBins = (r) =>
  num(r.industrialBinsOpened ?? r.industrialBins ?? r.bins);
const pickMap = (r) => r.mapName || r.map_name || r.map || 'Unknown';
const isExtract = (r) => {
  const s = (r.outcome || r.status || r.extraction || '')
    .toString()
    .toLowerCase();
  return s === 'extracted' || s.includes('extract');
};
const isDeath = (r) => {
  const s = (r.outcome || r.status || r.extraction || '')
    .toString()
    .toLowerCase();
  return (
    s === 'failed' ||
    s === 'died' ||
    s.includes('die') ||
    s === 'death' ||
    s.includes('fail')
  );
};

// Canonical ARC unit names — these match targetName values in arcBreakdown.
const ARC_UNIT_NAMES = [
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
];

/**
 * Aggregate enemy kills across all rounds.
 *
 * Real ArcTracker round shape:
 *   arcBreakdown: [{ targetName, kills, damage, type }]
 *   targetName can be: "Wasp", "Fireball", "Tick", "Pop", "Hornet",
 *                      "Turret", "Snitch", "Firefly", "Spotter", "Shredder",
 *                      "Player", "Self"
 *
 * @param {object[]} rounds
 * @param {object|null} profile — unused now but kept for signature compat
 */
function aggregateEnemies(rounds, profile = null) {
  const tally = new Map();
  const damageTally = new Map();
  const targetIdMap = new Map(); // Store target_id for each enemy name

  for (const r of rounds) {
    // Primary: real ArcTracker arcBreakdown array
    if (Array.isArray(r.arcBreakdown)) {
      for (const e of r.arcBreakdown) {
        const name = e.targetName || e.name || e.type || e.id;
        if (!name || name === 'Self') continue; // skip self-damage entries
        tally.set(name, (tally.get(name) || 0) + num(e.kills ?? e.count ?? 0));
        damageTally.set(
          name,
          (damageTally.get(name) || 0) +
            num(
              e.damage ??
                e.totalDamage ??
                e.total_damage ??
                e.damageDealt ??
                e.damage_dealt,
            ),
        );
        // Preserve target_id from arcBreakdown if available
        const targetId = e.targetId ?? e.target_id ?? e.id ?? null;
        if (targetId != null && !targetIdMap.has(name)) {
          targetIdMap.set(name, targetId);
        }
      }
    }
    // Fallback: legacy shapes
    else {
      const list = r.enemies || r.enemyKills || r.botKills || [];
      if (Array.isArray(list)) {
        for (const e of list) {
          const name = e.name || e.type || e.id;
          const count = num(e.count ?? e.kills ?? e.totalKills ?? 0);
          if (!name) continue;
          tally.set(name, (tally.get(name) || 0) + count);
          damageTally.set(
            name,
            (damageTally.get(name) || 0) +
              num(
                e.damage ??
                  e.totalDamage ??
                  e.total_damage ??
                  e.damageDealt ??
                  e.damage_dealt,
              ),
          );
          // Preserve target_id if available
          const targetId = e.targetId ?? e.target_id ?? e.id ?? null;
          if (targetId != null && !targetIdMap.has(name)) {
            targetIdMap.set(name, targetId);
          }
        }
      } else if (list && typeof list === 'object') {
        for (const [name, count] of Object.entries(list)) {
          tally.set(name, (tally.get(name) || 0) + num(count));
        }
      }
    }
  }

  // Ensure all 10 canonical ARC unit types are always present (even 0)
  // so the UI renders a complete table without missing rows.
  for (const name of ARC_UNIT_NAMES) {
    if (!tally.has(name)) tally.set(name, 0);
    if (!damageTally.has(name)) damageTally.set(name, 0);
  }

  return [...tally.entries()]
    .map(([name, kills]) => ({
      name,
      kills,
      damage: damageTally.get(name) || 0,
      targetId: targetIdMap.get(name) ?? null,
      target_id: targetIdMap.get(name) ?? null,
    }))
    .sort((a, b) => b.kills - a.kills);
}

/**
 * Aggregate weapon damage across all rounds.
 *
 * Real ArcTracker round shape:
 *   weaponDamageBreakdown: [{ weaponName, amount }]
 *   damageByWeapon: total number (not per-weapon)
 */
function aggregateWeapons(rounds) {
  const tally = new Map();
  const itemIdMap = new Map(); // Store itemId for each weapon name
  const weaponAssetIdMap = new Map(); // Store weaponAssetId for each weapon name

  for (const r of rounds) {
    // Primary: real ArcTracker weaponDamageBreakdown
    if (Array.isArray(r.weaponDamageBreakdown)) {
      for (const w of r.weaponDamageBreakdown) {
        const name = w.weaponName || w.name || w.weapon || w.id;
        if (!name) continue;
        const prev = tally.get(name) || { damage: 0, kills: 0 };
        prev.damage += num(w.amount ?? w.damage ?? w.totalDamage);
        prev.kills += num(w.kills ?? 0);
        tally.set(name, prev);
        // Preserve itemId and weaponAssetId if available
        const itemId = w.itemId ?? w.item_id ?? null;
        const weaponAssetId =
          w.weaponAssetId ?? w.weapon_asset_id ?? w.assetId ?? null;
        if (itemId != null && !itemIdMap.has(name)) {
          itemIdMap.set(name, itemId);
        }
        if (weaponAssetId != null && !weaponAssetIdMap.has(name)) {
          weaponAssetIdMap.set(name, weaponAssetId);
        }
      }
    }
    // Fallback: legacy shapes
    else {
      const list = r.weapons || r.weaponDamage || r.weapon_stats || [];
      if (Array.isArray(list)) {
        for (const w of list) {
          const name = w.name || w.weapon || w.id;
          if (!name) continue;
          const prev = tally.get(name) || { damage: 0, kills: 0 };
          prev.damage += num(w.damage ?? w.totalDamage ?? w.amount);
          prev.kills += num(w.kills ?? 0);
          tally.set(name, prev);
          // Preserve IDs if available
          const itemId = w.itemId ?? w.item_id ?? null;
          const weaponAssetId =
            w.weaponAssetId ?? w.weapon_asset_id ?? w.assetId ?? null;
          if (itemId != null && !itemIdMap.has(name)) {
            itemIdMap.set(name, itemId);
          }
          if (weaponAssetId != null && !weaponAssetIdMap.has(name)) {
            weaponAssetIdMap.set(name, weaponAssetId);
          }
        }
      } else if (list && typeof list === 'object') {
        for (const [name, dmg] of Object.entries(list)) {
          const prev = tally.get(name) || { damage: 0, kills: 0 };
          prev.damage += num(dmg);
          tally.set(name, prev);
        }
      }
    }
  }
  return [...tally.entries()]
    .map(([name, v]) => ({
      name,
      damage: v.damage,
      kills: v.kills,
      itemId: itemIdMap.get(name) ?? null,
      item_id: itemIdMap.get(name) || null,
      weaponAssetId: weaponAssetIdMap.get(name) ?? null,
      weapon_asset_id: weaponAssetIdMap.get(name) || null,
    }))
    .sort((a, b) => b.damage - a.damage);
}

/** Per-map performance: rounds, survival rate, time topside, net profit. */
function aggregateMaps(rounds) {
  const groups = new Map();
  for (const r of rounds) {
    const map = pickMap(r);
    const g = groups.get(map) || {
      map,
      roundsPlayed: 0,
      extractions: 0,
      deaths: 0,
      timeTopside: 0,
      netProfit: 0,
      kills: 0,
      totalValueBroughtIn: 0,
      totalValueExtracted: 0,
      damageDealt: 0,
      damageReceived: 0,
      containersLooted: 0,
      timestamps: [],
    };
    g.roundsPlayed += 1;
    if (isExtract(r)) g.extractions += 1;
    if (isDeath(r)) g.deaths += 1;
    g.timeTopside += pickDuration(r);
    g.netProfit += pickProfit(r);
    g.kills += pickKills(r);
    g.totalValueBroughtIn += pickLoadoutValue(r);
    g.totalValueExtracted += pickLootValue(r);
    g.damageDealt += pickDmgDealt(r);
    g.damageReceived += pickDmgRecv(r);
    g.containersLooted += pickContainersLooted(r);

    // Store timestamp for trend analysis
    if (r.roundEndedAt || r.syncedAt) {
      g.timestamps.push(new Date(r.roundEndedAt || r.syncedAt));
    }

    groups.set(map, g);
  }
  return [...groups.values()]
    .map((g) => ({
      ...g,
      survivalRate: g.roundsPlayed > 0 ? g.extractions / g.roundsPlayed : 0,
      avgProfitPerRaid: g.roundsPlayed > 0 ? g.netProfit / g.roundsPlayed : 0,
      avgTimeTopside: g.roundsPlayed > 0 ? g.timeTopside / g.roundsPlayed : 0,
      avgDamageRatio:
        g.damageReceived > 0 ? g.damageDealt / g.damageReceived : 0,
      profitPerHour:
        g.timeTopside > 0 ? g.netProfit / (g.timeTopside / 3600) : 0,
      riskRewardRatio:
        g.totalValueBroughtIn > 0 ? g.netProfit / g.totalValueBroughtIn : 0,
      lootEfficiency:
        g.containersLooted > 0 ? g.totalValueExtracted / g.containersLooted : 0,
    }))
    .sort((a, b) => b.roundsPlayed - a.roundsPlayed);
}

/**
 * Enhanced survival metrics with time-based analysis and risk assessment
 */
function aggregateEnhancedSurvival(rounds) {
  if (!Array.isArray(rounds) || rounds.length === 0) {
    return {
      overallSurvivalRate: 0,
      extractionTrends: [],
      riskRewardAnalysis: [],
      timeBasedSurvival: {},
      survivalByLoadoutValue: [],
      teamPerformanceMetrics: {},
    };
  }

  // Sort rounds by timestamp for trend analysis
  const sortedRounds = rounds
    .filter((r) => r.roundEndedAt || r.syncedAt)
    .sort(
      (a, b) =>
        new Date(a.roundEndedAt || a.syncedAt) -
        new Date(b.roundEndedAt || b.syncedAt),
    );

  // Overall survival rate
  const totalRounds = rounds.length;
  const totalExtractions = rounds.filter((r) => isExtract(r)).length;
  const overallSurvivalRate =
    totalRounds > 0 ? totalExtractions / totalRounds : 0;

  // Extraction trends over time (weekly buckets)
  const extractionTrends = [];
  const weeklyBuckets = new Map();

  for (const round of sortedRounds) {
    const date = new Date(round.roundEndedAt || round.syncedAt);
    const weekKey = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;

    if (!weeklyBuckets.has(weekKey)) {
      weeklyBuckets.set(weekKey, {
        week: weekKey,
        total: 0,
        extracted: 0,
        profit: 0,
      });
    }

    const bucket = weeklyBuckets.get(weekKey);
    bucket.total += 1;
    if (isExtract(round)) bucket.extracted += 1;
    bucket.profit += pickProfit(round);
  }

  for (const [week, data] of weeklyBuckets) {
    extractionTrends.push({
      week,
      survivalRate: data.total > 0 ? data.extracted / data.total : 0,
      totalRounds: data.total,
      avgProfit: data.total > 0 ? data.profit / data.total : 0,
    });
  }

  // Risk-reward analysis by loadout value ranges
  const riskRewardBuckets = [
    {
      name: 'Low Risk',
      min: 0,
      max: 50000,
      data: { total: 0, extracted: 0, profit: 0 },
    },
    {
      name: 'Medium Risk',
      min: 50000,
      max: 200000,
      data: { total: 0, extracted: 0, profit: 0 },
    },
    {
      name: 'High Risk',
      min: 200000,
      max: Infinity,
      data: { total: 0, extracted: 0, profit: 0 },
    },
  ];

  for (const round of rounds) {
    const loadoutValue = pickLoadoutValue(round);
    const bucket = riskRewardBuckets.find(
      (b) => loadoutValue >= b.min && loadoutValue < b.max,
    );
    if (bucket) {
      bucket.data.total += 1;
      if (isExtract(round)) bucket.data.extracted += 1;
      bucket.data.profit += pickProfit(round);
    }
  }

  const riskRewardAnalysis = riskRewardBuckets.map((bucket) => ({
    riskCategory: bucket.name,
    survivalRate:
      bucket.data.total > 0 ? bucket.data.extracted / bucket.data.total : 0,
    avgProfit:
      bucket.data.total > 0 ? bucket.data.profit / bucket.data.total : 0,
    totalRounds: bucket.data.total,
    riskAdjustedReturn:
      bucket.data.total > 0 ? bucket.data.profit / bucket.data.total : 0,
  }));

  // Time-based survival analysis
  const timeBasedSurvival = {
    byHourOfDay: analyzeSurvivalByTimeOfDay(rounds),
    byDayOfWeek: analyzeSurvivalByDayOfWeek(rounds),
    byMonth: analyzeSurvivalByMonth(rounds),
  };

  // Survival by loadout value ranges (more granular)
  const survivalByLoadoutValue = analyzeSurvivalByLoadoutValue(rounds);

  // Team performance metrics
  const teamPerformanceMetrics = {
    avgRevivesGiven:
      rounds.reduce((sum, r) => sum + pickRevivesGiven(r), 0) / totalRounds,
    avgRevivesReceived:
      rounds.reduce((sum, r) => sum + pickRevivesReceived(r), 0) / totalRounds,
    totalTeamSupport: rounds.reduce(
      (sum, r) => sum + pickRevivesGiven(r) + pickRevivesReceived(r),
      0,
    ),
    supportEfficiency: calculateSupportEfficiency(rounds),
  };

  return {
    overallSurvivalRate,
    extractionTrends,
    riskRewardAnalysis,
    timeBasedSurvival,
    survivalByLoadoutValue,
    teamPerformanceMetrics,
  };
}

function analyzeSurvivalByTimeOfDay(rounds) {
  const hourlyStats = new Map();

  for (const round of rounds) {
    const date = new Date(round.roundEndedAt || round.syncedAt);
    const hour = date.getHours();

    if (!hourlyStats.has(hour)) {
      hourlyStats.set(hour, { total: 0, extracted: 0, profit: 0 });
    }

    const stats = hourlyStats.get(hour);
    stats.total += 1;
    if (isExtract(round)) stats.extracted += 1;
    stats.profit += pickProfit(round);
  }

  return Array.from(hourlyStats.entries()).map(([hour, stats]) => ({
    hour,
    survivalRate: stats.total > 0 ? stats.extracted / stats.total : 0,
    totalRounds: stats.total,
    avgProfit: stats.total > 0 ? stats.profit / stats.total : 0,
  }));
}

function analyzeSurvivalByDayOfWeek(rounds) {
  const dailyStats = new Map();
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  for (const round of rounds) {
    const date = new Date(round.roundEndedAt || round.syncedAt);
    const day = date.getDay();

    if (!dailyStats.has(day)) {
      dailyStats.set(day, { total: 0, extracted: 0, profit: 0 });
    }

    const stats = dailyStats.get(day);
    stats.total += 1;
    if (isExtract(round)) stats.extracted += 1;
    stats.profit += pickProfit(round);
  }

  return Array.from(dailyStats.entries()).map(([day, stats]) => ({
    dayName: dayNames[day],
    day,
    survivalRate: stats.total > 0 ? stats.extracted / stats.total : 0,
    totalRounds: stats.total,
    avgProfit: stats.total > 0 ? stats.profit / stats.total : 0,
  }));
}

function analyzeSurvivalByMonth(rounds) {
  const monthlyStats = new Map();

  for (const round of rounds) {
    const date = new Date(round.roundEndedAt || round.syncedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyStats.has(monthKey)) {
      monthlyStats.set(monthKey, { total: 0, extracted: 0, profit: 0 });
    }

    const stats = monthlyStats.get(monthKey);
    stats.total += 1;
    if (isExtract(round)) stats.extracted += 1;
    stats.profit += pickProfit(round);
  }

  return Array.from(monthlyStats.entries()).map(([month, stats]) => ({
    month,
    survivalRate: stats.total > 0 ? stats.extracted / stats.total : 0,
    totalRounds: stats.total,
    avgProfit: stats.total > 0 ? stats.profit / stats.total : 0,
  }));
}

function analyzeSurvivalByLoadoutValue(rounds) {
  const valueRanges = [
    { name: '0-25k', min: 0, max: 25000 },
    { name: '25k-50k', min: 25000, max: 50000 },
    { name: '50k-100k', min: 50000, max: 100000 },
    { name: '100k-200k', min: 100000, max: 200000 },
    { name: '200k-500k', min: 200000, max: 500000 },
    { name: '500k+', min: 500000, max: Infinity },
  ];

  return valueRanges.map((range) => {
    const filteredRounds = rounds.filter((r) => {
      const value = pickLoadoutValue(r);
      return value >= range.min && value < range.max;
    });

    const total = filteredRounds.length;
    const extracted = filteredRounds.filter((r) => isExtract(r)).length;
    const totalProfit = filteredRounds.reduce(
      (sum, r) => sum + pickProfit(r),
      0,
    );

    return {
      loadoutRange: range.name,
      survivalRate: total > 0 ? extracted / total : 0,
      totalRounds: total,
      avgProfit: total > 0 ? totalProfit / total : 0,
      returnOnInvestment:
        total > 0 ? totalProfit / (total * ((range.min + range.max) / 2)) : 0,
    };
  });
}

function calculateSupportEfficiency(rounds) {
  let totalSupportActions = 0;
  let totalPossibleSupport = 0;

  for (const round of rounds) {
    const revivesGiven = pickRevivesGiven(round);
    const revivesReceived = pickRevivesReceived(round);
    const playerDowns = pickDowns(round);

    totalSupportActions += revivesGiven + revivesReceived;
    totalPossibleSupport += playerDowns + revivesGiven;
  }

  return totalPossibleSupport > 0
    ? totalSupportActions / totalPossibleSupport
    : 0;
}

/**
 * Advanced kill statistics including enemy efficiency, weapon mastery, and combat effectiveness
 */
function aggregateAdvancedKillStats(
  rounds,
  enemyKills = null,
  weaponKills = null,
) {
  if (!Array.isArray(rounds) || rounds.length === 0) {
    return {
      enemyEfficiencyAnalysis: [],
      weaponMasteryProgression: [],
      combatEffectivenessByMap: [],
      threatAssessment: [],
      killCombos: [],
      damageEfficiency: {},
    };
  }

  // Enemy efficiency analysis (damage per kill, engagement patterns)
  const enemyEfficiencyAnalysis = analyzeEnemyEfficiency(rounds, enemyKills);

  // Weapon mastery progression tracking
  const weaponMasteryProgression = analyzeWeaponMastery(rounds, weaponKills);

  // Combat effectiveness by map and situation
  const combatEffectivenessByMap = analyzeCombatEffectivenessByMap(rounds);

  // ARC unit threat assessment and counter strategies
  const threatAssessment = analyzeThreatAssessment(rounds, enemyKills);

  // Kill combos and multi-kill analysis
  const killCombos = analyzeKillCombos(rounds);

  // Overall damage efficiency metrics
  const damageEfficiency = analyzeDamageEfficiency(rounds);

  return {
    enemyEfficiencyAnalysis,
    weaponMasteryProgression,
    combatEffectivenessByMap,
    threatAssessment,
    killCombos,
    damageEfficiency,
  };
}

function analyzeEnemyEfficiency(rounds, enemyKills) {
  const enemyStats = new Map();

  // Initialize with known enemy types
  const knownEnemies = [
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
    'Rocketeer',
    'Leaper',
    'Comet',
    'Bastion',
    'Bombardier',
    'ARC Surveyor',
    'Sentinel',
    'Vaporizer',
  ];

  for (const enemyName of knownEnemies) {
    enemyStats.set(enemyName, {
      totalKills: 0,
      totalDamage: 0,
      encounters: 0,
      damagePerKill: 0,
      threatLevel: 'Unknown',
      recommendedWeapon: null,
      efficiencyScore: 0,
    });
  }

  // Process rounds for enemy data
  for (const round of rounds) {
    if (Array.isArray(round.arcBreakdown)) {
      for (const enemy of round.arcBreakdown) {
        const name = enemy.targetName || enemy.name;
        if (!name || name === 'Self' || name === 'Player') continue;

        const stats = enemyStats.get(name) ||
          enemyStats.get(name) || {
            totalKills: 0,
            totalDamage: 0,
            encounters: 0,
            damagePerKill: 0,
            threatLevel: 'Unknown',
            recommendedWeapon: null,
            efficiencyScore: 0,
          };

        stats.totalKills += num(enemy.kills || 0);
        stats.totalDamage += num(enemy.damage || 0);
        stats.encounters += 1;
        enemyStats.set(name, stats);
      }
    }
  }

  // Calculate efficiency metrics
  for (const [name, stats] of enemyStats) {
    if (stats.totalKills > 0) {
      stats.damagePerKill = stats.totalDamage / stats.totalKills;
    }

    // Calculate efficiency score (kills per encounter)
    stats.efficiencyScore =
      stats.encounters > 0 ? stats.totalKills / stats.encounters : 0;

    // Determine threat level based on damage per kill
    if (stats.damagePerKill > 1000) {
      stats.threatLevel = 'High';
    } else if (stats.damagePerKill > 500) {
      stats.threatLevel = 'Medium';
    } else if (stats.damagePerKill > 0) {
      stats.threatLevel = 'Low';
    } else {
      stats.threatLevel = 'Unknown';
    }
  }

  return Array.from(enemyStats.entries())
    .map(([name, stats]) => ({ enemyName: name, ...stats }))
    .filter((enemy) => enemy.encounters > 0)
    .sort((a, b) => b.efficiencyScore - a.efficiencyScore);
}

function analyzeWeaponMastery(rounds, weaponKills) {
  const weaponStats = new Map();

  // Process weapon damage breakdown from rounds
  for (const round of rounds) {
    if (Array.isArray(round.weaponDamageBreakdown)) {
      for (const weapon of round.weaponDamageBreakdown) {
        const name = weapon.weaponName || weapon.name;
        if (!name) continue;

        const stats = weaponStats.get(name) || {
          totalDamage: 0,
          totalKills: 0,
          usageCount: 0,
          avgDamagePerUse: 0,
          masteryLevel: 'Beginner',
          progressionTrend: [],
        };

        stats.totalDamage += num(weapon.amount || weapon.damage || 0);
        stats.usageCount += 1;
        weaponStats.set(name, stats);
      }
    }
  }

  // Incorporate dedicated weapon kills if available
  if (Array.isArray(weaponKills?.weapons)) {
    for (const weapon of weaponKills.weapons) {
      const name = weapon.name;
      if (!name) continue;

      const stats = weaponStats.get(name) || {
        totalDamage: 0,
        totalKills: 0,
        usageCount: 0,
        avgDamagePerUse: 0,
        masteryLevel: 'Beginner',
        progressionTrend: [],
      };

      stats.totalKills = weapon.count || 0;
      weaponStats.set(name, stats);
    }
  }

  // Calculate mastery metrics
  for (const [name, stats] of weaponStats) {
    stats.avgDamagePerUse =
      stats.usageCount > 0 ? stats.totalDamage / stats.usageCount : 0;

    // Determine mastery level based on total damage and kills
    if (stats.totalDamage > 100000 || stats.totalKills > 500) {
      stats.masteryLevel = 'Master';
    } else if (stats.totalDamage > 50000 || stats.totalKills > 200) {
      stats.masteryLevel = 'Expert';
    } else if (stats.totalDamage > 20000 || stats.totalKills > 100) {
      stats.masteryLevel = 'Advanced';
    } else if (stats.totalDamage > 5000 || stats.totalKills > 50) {
      stats.masteryLevel = 'Intermediate';
    } else if (stats.totalDamage > 0 || stats.totalKills > 0) {
      stats.masteryLevel = 'Beginner';
    }
  }

  return Array.from(weaponStats.entries())
    .map(([name, stats]) => ({ weaponName: name, ...stats }))
    .filter((weapon) => weapon.usageCount > 0 || weapon.totalKills > 0)
    .sort((a, b) => b.totalDamage - a.totalDamage);
}

function analyzeCombatEffectivenessByMap(rounds) {
  const mapStats = new Map();

  for (const round of rounds) {
    const map = pickMap(round);
    const stats = mapStats.get(map) || {
      map,
      totalRounds: 0,
      totalKills: 0,
      totalDamage: 0,
      totalDamageReceived: 0,
      extractions: 0,
      avgKillsPerRaid: 0,
      avgDamagePerRaid: 0,
      damageRatio: 0,
      combatRating: 'Unknown',
    };

    stats.totalRounds += 1;
    stats.totalKills += pickKills(round);
    stats.totalDamage += pickDmgDealt(round);
    stats.totalDamageReceived += pickDmgRecv(round);
    if (isExtract(round)) stats.extractions += 1;

    mapStats.set(map, stats);
  }

  // Calculate combat effectiveness metrics
  for (const [map, stats] of mapStats) {
    stats.avgKillsPerRaid =
      stats.totalRounds > 0 ? stats.totalKills / stats.totalRounds : 0;
    stats.avgDamagePerRaid =
      stats.totalRounds > 0 ? stats.totalDamage / stats.totalRounds : 0;
    stats.damageRatio =
      stats.totalDamageReceived > 0
        ? stats.totalDamage / stats.totalDamageReceived
        : 0;

    // Determine combat rating
    const survivalRate =
      stats.totalRounds > 0 ? stats.extractions / stats.totalRounds : 0;
    if (stats.avgKillsPerRaid > 10 && survivalRate > 0.7) {
      stats.combatRating = 'Excellent';
    } else if (stats.avgKillsPerRaid > 7 && survivalRate > 0.5) {
      stats.combatRating = 'Good';
    } else if (stats.avgKillsPerRaid > 4 && survivalRate > 0.3) {
      stats.combatRating = 'Average';
    } else {
      stats.combatRating = 'Needs Improvement';
    }
  }

  return Array.from(mapStats.values()).sort(
    (a, b) => b.avgKillsPerRaid - a.avgKillsPerRaid,
  );
}

function analyzeThreatAssessment(rounds, enemyKills) {
  const threats = [];

  // Analyze enemy lethality and danger levels
  const enemyDamage = new Map();
  const playerDeaths = new Map();

  for (const round of rounds) {
    if (Array.isArray(round.arcBreakdown)) {
      for (const enemy of round.arcBreakdown) {
        const name = enemy.targetName || enemy.name;
        if (!name || name === 'Self' || name === 'Player') continue;

        const damage = enemyDamage.get(name) || { totalDamage: 0, kills: 0 };
        damage.totalDamage += num(enemy.damage || 0);
        damage.kills += num(enemy.kills || 0);
        enemyDamage.set(name, damage);
      }
    }

    // Track deaths by enemy type (if available)
    if (round.damageTaken && round.arcBreakdown) {
      for (const enemy of round.arcBreakdown) {
        const name = enemy.targetName || enemy.name;
        if (name && name !== 'Self' && name !== 'Player') {
          const deaths = playerDeaths.get(name) || 0;
          playerDeaths.set(name, isDeath(round) ? deaths + 1 : deaths);
        }
      }
    }
  }

  // Generate threat assessments
  for (const [enemyName, damage] of enemyDamage) {
    const deaths = playerDeaths.get(enemyName) || 0;
    const avgDamage = damage.kills > 0 ? damage.totalDamage / damage.kills : 0;

    let threatLevel = 'Low';
    let counterStrategy = 'Standard engagement';

    if (avgDamage > 800 || deaths > 10) {
      threatLevel = 'Extreme';
      counterStrategy = 'Prioritize elimination, use heavy weapons';
    } else if (avgDamage > 500 || deaths > 5) {
      threatLevel = 'High';
      counterStrategy = 'Maintain distance, use cover';
    } else if (avgDamage > 300 || deaths > 2) {
      threatLevel = 'Medium';
      counterStrategy = 'Tactical positioning, coordinated fire';
    }

    threats.push({
      enemyName,
      avgDamagePerKill: avgDamage,
      totalKills: damage.kills,
      playerDeaths: deaths,
      threatLevel,
      counterStrategy,
      priority: avgDamage + deaths * 100,
    });
  }

  return threats.sort((a, b) => b.priority - a.priority);
}

function analyzeKillCombos(rounds) {
  const combos = [];

  for (const round of rounds) {
    const kills = pickKills(round);
    const playerKills = pickPlayerKills(round);
    const arcKills = pickArcKills(round);

    if (kills > 0) {
      combos.push({
        roundId: round.roundId || round.id,
        map: pickMap(round),
        totalKills: kills,
        playerKills,
        arcKills,
        comboType: determineComboType(kills, playerKills, arcKills),
        efficiency: calculateKillEfficiency(round),
      });
    }
  }

  return combos.sort((a, b) => b.totalKills - a.totalKills).slice(0, 20); // Top 20 combos
}

function determineComboType(totalKills, playerKills, arcKills) {
  if (totalKills >= 20) return 'Massacre';
  if (totalKills >= 15) return 'Dominating';
  if (totalKills >= 10) return 'Killing Spree';
  if (totalKills >= 5) return 'Multi-Kill';
  if (totalKills >= 2) return 'Double Kill';
  return 'Single Kill';
}

function calculateKillEfficiency(round) {
  const damage = pickDmgDealt(round);
  const kills = pickKills(round);
  const duration = pickDuration(round);

  if (kills === 0) return 0;

  const damagePerKill = damage / kills;
  const killsPerMinute = duration > 0 ? (kills / duration) * 60 : 0;

  return damagePerKill * 0.3 + killsPerMinute * 0.7;
}

function analyzeDamageEfficiency(rounds) {
  const totalDamage = rounds.reduce((sum, r) => sum + pickDmgDealt(r), 0);
  const totalDamageReceived = rounds.reduce(
    (sum, r) => sum + pickDmgRecv(r),
    0,
  );
  const totalKills = rounds.reduce((sum, r) => sum + pickKills(r), 0);
  const totalDuration = rounds.reduce((sum, r) => sum + pickDuration(r), 0);

  return {
    totalDamageDealt: totalDamage,
    totalDamageReceived: totalDamageReceived,
    damageRatio:
      totalDamageReceived > 0 ? totalDamage / totalDamageReceived : 0,
    avgDamagePerKill: totalKills > 0 ? totalDamage / totalKills : 0,
    damagePerMinute: totalDuration > 0 ? totalDamage / (totalDuration / 60) : 0,
    combatEfficiency:
      totalDamageReceived > 0
        ? (totalDamage / totalDamageReceived) * (totalKills / rounds.length)
        : 0,
  };
}

/**
 * Economic performance indicators including profit analysis, optimization recommendations, and market trends
 */
function aggregateEconomicPerformance(rounds, stash = null) {
  if (!Array.isArray(rounds) || rounds.length === 0) {
    return {
      profitPerHourByMap: [],
      lootOptimizationRecommendations: [],
      marketValueTrends: [],
      riskAdjustedReturns: [],
      economicEfficiency: {},
    };
  }

  // Profit per hour by map and strategy
  const profitPerHourByMap = analyzeProfitPerHourByMap(rounds);

  // Loot optimization recommendations
  const lootOptimizationRecommendations = analyzeLootOptimization(rounds);

  // Market value trends for extracted items
  const marketValueTrends = analyzeMarketValueTrends(rounds);

  // Risk-adjusted return on investment analysis
  const riskAdjustedReturns = analyzeRiskAdjustedReturns(rounds);

  // Overall economic efficiency metrics
  const economicEfficiency = analyzeEconomicEfficiency(rounds, stash);

  return {
    profitPerHourByMap,
    lootOptimizationRecommendations,
    marketValueTrends,
    riskAdjustedReturns,
    economicEfficiency,
  };
}

function analyzeProfitPerHourByMap(rounds) {
  const mapStats = new Map();

  for (const round of rounds) {
    const map = pickMap(round);
    const duration = pickDuration(round);
    const profit = pickProfit(round);
    const loadoutValue = pickLoadoutValue(round);
    const extractedValue = pickLootValue(round);

    const stats = mapStats.get(map) || {
      map,
      totalRounds: 0,
      totalDuration: 0,
      totalProfit: 0,
      totalLoadoutValue: 0,
      totalExtractedValue: 0,
      extractions: 0,
      profitPerHour: 0,
      avgHourlyRate: 0,
      investmentReturn: 0,
      extractionRate: 0,
    };

    stats.totalRounds += 1;
    stats.totalDuration += duration;
    stats.totalProfit += profit;
    stats.totalLoadoutValue += loadoutValue;
    stats.totalExtractedValue += extractedValue;
    if (isExtract(round)) stats.extractions += 1;

    mapStats.set(map, stats);
  }

  // Calculate economic metrics
  for (const [map, stats] of mapStats) {
    stats.profitPerHour =
      stats.totalDuration > 0
        ? stats.totalProfit / (stats.totalDuration / 3600)
        : 0;
    stats.avgHourlyRate =
      stats.totalRounds > 0
        ? stats.totalProfit / (stats.totalDuration / 3600)
        : 0;
    stats.investmentReturn =
      stats.totalLoadoutValue > 0
        ? stats.totalProfit / stats.totalLoadoutValue
        : 0;
    stats.extractionRate =
      stats.totalRounds > 0 ? stats.extractions / stats.totalRounds : 0;
  }

  return Array.from(mapStats.values()).sort(
    (a, b) => b.profitPerHour - a.profitPerHour,
  );
}

function analyzeLootOptimization(rounds) {
  const recommendations = [];

  // Analyze container looting efficiency
  const containerStats = new Map();
  for (const round of rounds) {
    const containers = pickContainersLooted(round);
    const extractedValue = pickLootValue(round);
    const duration = pickDuration(round);

    const key = `${Math.floor(containers / 5) * 5}-${Math.floor(containers / 5) * 5 + 4} containers`;
    const stats = containerStats.get(key) || {
      containerRange: key,
      containerLooted: 0,
      totalRounds: 0,
      totalContainers: 0,
      totalValue: 0,
      totalDuration: 0,
      avgValuePerContainer: 0,
      valuePerHour: 0,
    };

    stats.totalRounds += 1;
    stats.containerLooted += containers;
    stats.totalContainers += containers;
    stats.totalValue += extractedValue;
    stats.totalDuration += duration;

    containerStats.set(key, stats);
  }

  // Calculate container efficiency
  for (const [, stats] of containerStats) {
    stats.avgValuePerContainer =
      stats.totalContainers > 0 ? stats.totalValue / stats.totalContainers : 0;
    stats.valuePerHour =
      stats.totalDuration > 0
        ? stats.totalValue / (stats.totalDuration / 3600)
        : 0;
  }

  // Generate recommendations based on data
  const sortedContainers = Array.from(containerStats.values()).sort(
    (a, b) => b.avgValuePerContainer - a.avgValuePerContainer,
  );

  if (sortedContainers.length > 0) {
    const optimal = sortedContainers[0];
    recommendations.push({
      type: 'container_optimization',
      priority: 'High',
      title: 'Optimal Container Looting',
      description: `Focus on looting ${optimal.containerRange} for best value per container`,
      recommendation: `Average value: ${Math.round(optimal.avgValuePerContainer)} per container`,
      potentialGain: Math.round(optimal.avgValuePerContainer * 10), // Potential gain from 10 additional containers
    });
  }

  // Map-specific recommendations
  const mapProfits = analyzeProfitPerHourByMap(rounds);
  if (mapProfits.length > 0) {
    const bestMap = mapProfits[0];
    recommendations.push({
      type: 'map_selection',
      priority: 'Medium',
      title: 'Most Profitable Map',
      description: `${bestMap.map} shows highest profit potential`,
      recommendation: `Focus on ${bestMap.map} for ${Math.round(bestMap.profitPerHour)} per hour`,
      potentialGain: Math.round(bestMap.profitPerHour * 5), // 5 hours of optimal play
    });
  }

  // Time-based recommendations
  const hourlyPerformance = analyzeHourlyProfitability(rounds);
  const bestHour = hourlyPerformance.reduce(
    (best, current) =>
      current.profitPerHour > best.profitPerHour ? current : best,
    hourlyPerformance[0],
  );

  if (bestHour) {
    recommendations.push({
      type: 'timing_optimization',
      priority: 'Low',
      title: 'Optimal Playing Time',
      description: `Best performance during ${bestHour.hour}:00-${bestHour.hour + 1}:00`,
      recommendation: `Play during ${bestHour.hour}:00 for peak profitability`,
      potentialGain: Math.round(bestHour.profitPerHour * 2),
    });
  }

  return recommendations;
}

function analyzeMarketValueTrends(rounds) {
  const trends = [];
  const monthlyData = new Map();

  for (const round of rounds) {
    const date = new Date(round.roundEndedAt || round.syncedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const stats = monthlyData.get(monthKey) || {
      month: monthKey,
      totalValue: 0,
      totalRounds: 0,
      avgValuePerRaid: 0,
      maxValue: 0,
      minValue: Infinity,
    };

    const extractedValue = pickLootValue(round);
    stats.totalValue += extractedValue;
    stats.totalRounds += 1;
    stats.maxValue = Math.max(stats.maxValue, extractedValue);
    stats.minValue = Math.min(stats.minValue, extractedValue);

    monthlyData.set(monthKey, stats);
  }

  // Calculate monthly averages and trends
  const sortedMonths = Array.from(monthlyData.values()).sort((a, b) =>
    a.month.localeCompare(b.month),
  );

  for (let i = 0; i < sortedMonths.length; i++) {
    const current = sortedMonths[i];
    current.avgValuePerRaid =
      current.totalRounds > 0 ? current.totalValue / current.totalRounds : 0;

    if (i > 0) {
      const previous = sortedMonths[i - 1];
      current.trend =
        current.avgValuePerRaid > previous.avgValuePerRaid
          ? 'increasing'
          : 'decreasing';
      current.trendPercentage =
        previous.avgValuePerRaid > 0
          ? ((current.avgValuePerRaid - previous.avgValuePerRaid) /
              previous.avgValuePerRaid) *
            100
          : 0;
    }

    trends.push(current);
  }

  return trends;
}

function analyzeRiskAdjustedReturns(rounds) {
  const riskCategories = [
    {
      name: 'Conservative',
      maxRisk: 0.3,
      description: 'Low loadout value, high survival focus',
    },
    {
      name: 'Balanced',
      maxRisk: 0.6,
      description: 'Moderate risk/reward balance',
    },
    {
      name: 'Aggressive',
      maxRisk: 1.0,
      description: 'High loadout value, high risk/high reward',
    },
  ];

  const analysis = [];

  for (const category of riskCategories) {
    const categoryRounds = rounds.filter((round) => {
      const loadoutValue = pickLoadoutValue(round);
      // Simple risk calculation based on loadout value (can be enhanced)
      const riskScore = Math.min(loadoutValue / 500000, 1); // Normalize to 0-1
      return riskScore <= category.maxRisk;
    });

    if (categoryRounds.length > 0) {
      const totalProfit = categoryRounds.reduce(
        (sum, r) => sum + pickProfit(r),
        0,
      );
      const totalInvestment = categoryRounds.reduce(
        (sum, r) => sum + pickLoadoutValue(r),
        0,
      );
      const extractions = categoryRounds.filter((r) => isExtract(r)).length;
      const totalDuration = categoryRounds.reduce(
        (sum, r) => sum + pickDuration(r),
        0,
      );

      analysis.push({
        riskCategory: category.name,
        description: category.description,
        totalRounds: categoryRounds.length,
        totalProfit,
        avgProfitPerRaid: totalProfit / categoryRounds.length,
        returnOnInvestment:
          totalInvestment > 0 ? totalProfit / totalInvestment : 0,
        survivalRate: extractions / categoryRounds.length,
        profitPerHour:
          totalDuration > 0 ? totalProfit / (totalDuration / 3600) : 0,
        riskAdjustedReturn: calculateRiskAdjustedReturn(
          totalProfit,
          totalInvestment,
          extractions / categoryRounds.length,
        ),
      });
    }
  }

  return analysis.sort((a, b) => b.riskAdjustedReturn - a.riskAdjustedReturn);
}

function calculateRiskAdjustedReturn(profit, investment, survivalRate) {
  const roi = investment > 0 ? profit / investment : 0;
  return roi * survivalRate; // Adjust ROI by survival rate
}

function analyzeHourlyProfitability(rounds) {
  const hourlyStats = new Map();

  for (const round of rounds) {
    const date = new Date(round.roundEndedAt || round.syncedAt);
    const hour = date.getHours();

    const stats = hourlyStats.get(hour) || {
      hour,
      totalProfit: 0,
      totalRounds: 0,
      totalDuration: 0,
      profitPerHour: 0,
    };

    stats.totalProfit += pickProfit(round);
    stats.totalRounds += 1;
    stats.totalDuration += pickDuration(round);

    hourlyStats.set(hour, stats);
  }

  // Calculate profit per hour for each hour
  for (const [hour, stats] of hourlyStats) {
    stats.profitPerHour =
      stats.totalDuration > 0
        ? stats.totalProfit / (stats.totalDuration / 3600)
        : 0;
  }

  return Array.from(hourlyStats.values()).sort(
    (a, b) => b.profitPerHour - a.profitPerHour,
  );
}

function analyzeEconomicEfficiency(rounds, stash) {
  const totalProfit = rounds.reduce((sum, r) => sum + pickProfit(r), 0);
  const totalInvestment = rounds.reduce(
    (sum, r) => sum + pickLoadoutValue(r),
    0,
  );
  const totalDuration = rounds.reduce((sum, r) => sum + pickDuration(r), 0);
  const totalExtractedValue = rounds.reduce(
    (sum, r) => sum + pickLootValue(r),
    0,
  );
  const extractions = rounds.filter((r) => isExtract(r)).length;

  return {
    totalNetProfit: totalProfit,
    totalInvestment: totalInvestment,
    overallROI: totalInvestment > 0 ? totalProfit / totalInvestment : 0,
    avgProfitPerHour:
      totalDuration > 0 ? totalProfit / (totalDuration / 3600) : 0,
    extractionSuccessRate: rounds.length > 0 ? extractions / rounds.length : 0,
    lootToInvestmentRatio:
      totalInvestment > 0 ? totalExtractedValue / totalInvestment : 0,
    economicRating: calculateEconomicRating(
      totalProfit,
      totalInvestment,
      extractions / rounds.length,
    ),
    currentStashValue: stash?.currencies?.totalValue || 0,
    netWorthGrowth: totalProfit + (stash?.currencies?.totalValue || 0),
  };
}

function calculateEconomicRating(profit, investment, survivalRate) {
  const roi = investment > 0 ? profit / investment : 0;

  if (roi > 0.5 && survivalRate > 0.7) return 'Excellent';
  if (roi > 0.3 && survivalRate > 0.5) return 'Good';
  if (roi > 0.1 && survivalRate > 0.3) return 'Average';
  if (roi > 0) return 'Below Average';
  return 'Poor';
}

/** Compute a completion percentage from a list with `completed`/`learned`/`unlocked` flags. */
function completionPercent(list, key = 'completed') {
  if (!Array.isArray(list) || list.length === 0) return 0;
  const done = list.filter(
    (x) =>
      x?.[key] === true ||
      x?.learned === true ||
      x?.unlocked === true ||
      x?.claimed === true ||
      x?.[key] === 1 ||
      x?.learned === 1 ||
      x?.unlocked === 1 ||
      x?.claimed === 1,
  ).length;
  return Math.round((done / list.length) * 100);
}

/**
 * Build the full MetaForge-style stats object for a user.
 */
export async function buildStatsOverview(discordId) {
  const dbUser = await User.findOne({ id: discordId }).lean();
  const metaForgeProfileId =
    dbUser?.metaForgeProfileId ||
    dbUser?.settings?.metaforgeId ||
    dbUser?.metaForgeProfile?.id ||
    dbUser?.metaForgeProfile?.profileId ||
    dbUser?.profile?.embark_id ||
    dbUser?.embarkId ||
    null;

  // Parallel data fetch — each is allowed to fail independently.
  const [
    profile,
    rounds,
    hideout,
    projects,
    quests,
    blueprints,
    stash,
    expeditionStatus,
    dedicatedEnemyKills,
    dedicatedMapPerformance,
    dedicatedWeaponKills,
    summary, // Pre-aggregated totals from summary endpoint
    mfRaiderRaw, // MetaForge /raider/{id} — optional, requires stored metaForgeProfileId
  ] = await Promise.all([
    safe(UserDataAPI.getProfile(discordId)),
    safe(
      (async () => {
        const u = await User.findOne({ id: discordId })
          .select('+arctrackerUserKey')
          .lean();
        if (u?.arctrackerUserKey) {
          const res = await ArcTrackerAPI.getAllRounds(u.arctrackerUserKey, {
            maxTotal: 5000,
          }).catch(() => UserDataAPI.getRounds(discordId, { limit: 5000 }));
          return Array.isArray(res?.rounds)
            ? res.rounds
            : Array.isArray(res)
              ? res
              : [];
        }
        return UserDataAPI.getRounds(discordId, { limit: 5000 });
      })(),
    ),
    safe(UserDataAPI.getHideout(discordId)),
    safe(UserDataAPI.getProjects(discordId)),
    safe(UserDataAPI.getQuests(discordId)),
    safe(UserDataAPI.getBlueprints(discordId)),
    safe(UserDataAPI.getStash(discordId)),
    safe(UserDataAPI.getExpeditionStatus(discordId)),
    // UserDataAPI merges ArcTracker, MetaForge, extension sync, and fallback data.
    safe(UserDataAPI.getEnemyKills(discordId)),
    safe(UserDataAPI.getMapPerformance(discordId)),
    safe(UserDataAPI.getWeaponKills(discordId)),
    safe(UserDataAPI.getSummary(discordId)),
    // MetaForge raider stats — fetched server-side via our own proxy
    safe(
      (async () => {
        if (!metaForgeProfileId) return null;
        const payload = await MetaForgeAPI.getPlayerStats(metaForgeProfileId);
        return normalizeMetaForgeRaiderPayload(payload);
      })(),
    ),
  ]);

  const roundsArr = Array.isArray(rounds)
    ? rounds
    : Array.isArray(rounds?.rounds)
      ? rounds.rounds
      : [];

  // ---- Performance & Combat aggregates ----
  let totalKills = 0;
  let totalArcKills = 0;
  let totalPlayerKills = 0;
  let totalDowns = 0;
  let totalDmgDealt = 0;
  let totalDmgRecv = 0;
  let totalHealed = 0;
  let totalTime = 0;
  let totalProfit = 0;
  let totalScore = 0;
  let extractions = 0;
  let deaths = 0;
  let revivesGiven = 0;
  let revivesReceived = 0;
  let containersLooted = 0;
  let vaultsBreached = 0;
  let keysConsumed = 0;
  let itemsScrapped = 0;
  let itemsExtracted = 0;
  let rareContainers = 0;
  let lockedDoors = 0;
  let industrialBins = 0;

  for (const r of roundsArr) {
    totalKills += pickKills(r);
    totalArcKills += pickArcKills(r);
    totalPlayerKills += pickPlayerKills(r);
    totalDowns += pickDowns(r);
    totalDmgDealt += pickDmgDealt(r);
    totalDmgRecv += pickDmgRecv(r);
    totalHealed += pickHealed(r);
    totalTime += pickDuration(r);
    totalProfit += pickProfit(r);
    totalScore += pickScore(r);
    revivesGiven += pickRevivesGiven(r);
    revivesReceived += pickRevivesReceived(r);
    containersLooted += pickContainersLooted(r);
    vaultsBreached += pickVaultsBreached(r);
    keysConsumed += pickKeysConsumed(r);
    itemsScrapped += pickItemsScrapped(r);
    itemsExtracted += pickItemsExtracted(r);
    rareContainers += pickRareContainers(r);
    lockedDoors += pickLockedDoors(r);
    industrialBins += pickIndustrialBins(r);
    if (isExtract(r)) extractions += 1;
    if (isDeath(r)) deaths += 1;
  }

  // ---- MetaForge raider data processing ----
  const mfData = mfRaiderRaw || {};
  // MetaForge returns enemyStats as array, normalizeEnemyStats converts to object
  const mfCodex = mfData.arc_destroyed_breakdown || {};
  // MetaForge returns weaponStats as array, normalizeWeaponStats converts to object
  const mfWeapons = mfData.weapon_performance || {};
  // Preserve these exact fields if a provider actually returns them. Their
  // absence from one documented payload must not be treated as proof that they
  // do not exist in another synced stats payload.
  const mfAccuracy = getExactStatField(mfData, 'accuracy');
  const mfHeadshotPct = getExactStatField(mfData, 'headshot_percentage');
  const mfShotsFired = getExactStatField(mfData, 'shots_fired');
  const mfShotsHit = getExactStatField(mfData, 'shots_hit');
  const mfWeakpointHits = getExactStatField(mfData, 'weakpoint_hits');
  const mfLongestKill = getExactStatField(mfData, 'longest_kill_distance');
  const mfMeleeKills = getExactStatField(mfData, 'melee_kills');
  const mfTimesRevived = getExactStatField(mfData, 'times_revived');
  const mfRevivesPerformed = getExactStatField(mfData, 'revives_performed');
  const mfExtractionsUnderFire = getExactStatField(
    mfData,
    'extractions_under_fire',
  );
  // MetaForge overlapping stats (will be merged with pickStat)
  const mfArcKills = num(mfData.arc_enemies_destroyed ?? mfData.arc_destroyed);
  const mfPlayerKills = num(mfData.player_kills);
  const mfTotalKills = mfArcKills + mfPlayerKills;
  const mfTotalRaids = num(mfData.total_raids);
  const mfExtractions = num(mfData.extracted);
  const mfSurvivalRate = num(mfData.survival_rate ?? mfData.extraction_rate);
  const mfProfit = num(mfData.total_profit);
  const mfAvgProfit = null;
  const mfDmgDealt = num(mfData.damage_dealt);
  const mfDmgReceived = num(mfData.damage_received);
  const mfContainersLooted = null;
  // MetaForge map performance — used as fallback only
  const mfMapPerformance = mfData.map_stats || mfData.map_performance || [];

  // ---- Use summary endpoint data as primary source (more accurate than calculating from rounds) ----
  // Summary data contains: totalRounds, totalExtracted, totalDied, totalTimeMs,
  // totalValueExtracted, totalValueBroughtIn, totalNetValue, totalArcKills, totalPlayerKills, totalDamage, totalContainersLooted
  const summaryData = summary || {};

  // Prefer summary data, fall back to calculated values from rounds.
  // Then apply pickStat to merge with MetaForge where both sources have data.
  const atTotalRounds = num(summaryData.totalRounds, roundsArr.length);
  const atExtractions = num(summaryData.totalExtracted, extractions);
  const atDeaths = num(summaryData.totalDied, deaths);
  const atArcKills = num(summaryData.totalArcKills, totalArcKills);
  const atPlayerKills = num(summaryData.totalPlayerKills, totalPlayerKills);
  const atDmgDealt = num(summaryData.totalDamage, totalDmgDealt);
  const atProfit = num(summaryData.totalNetValue, totalProfit);
  const atContainers = num(summaryData.totalContainersLooted, containersLooted);

  const finalTotalRounds = pickStat(atTotalRounds, mfTotalRaids);
  const finalExtractions = pickStat(atExtractions, mfExtractions);
  const finalDeaths = atDeaths; // deaths not tracked by MF, keep AT
  const finalArcKills = pickStat(atArcKills, mfArcKills);
  const finalPlayerKills = pickStat(atPlayerKills, mfPlayerKills);
  const finalTotalKills = finalArcKills + finalPlayerKills;
  const finalDmgDealt = pickStat(atDmgDealt, mfDmgDealt);
  const finalProfit = pickStat(atProfit, mfProfit);
  const finalTime = summaryData.totalTimeMs
    ? num(summaryData.totalTimeMs) / 1000
    : totalTime;
  const finalContainersLooted = pickStat(atContainers, mfContainersLooted);

  // Diagnostic logging for non-zero data flow
  if (finalTotalRounds > 0) {
    logger.info(
      `[StatsAggregator] Resolved stats for ${discordId}: Raids=${finalTotalRounds}, Extracts=${finalExtractions}, Kills=${finalTotalKills}, Profit=${finalProfit}, Damage=${finalDmgDealt}, Containers=${finalContainersLooted}`,
    );
    logger.debug(
      `[StatsAggregator] Provider Breakdown: AT(Raids=${atTotalRounds}, Prof=${atProfit}), MF(Raids=${mfTotalRaids}, Prof=${mfProfit}), Calc(Raids=${roundsArr.length}, Prof=${totalProfit})`,
    );
  } else {
    logger.warn(
      `[StatsAggregator] No stats found for user ${discordId} across all providers.`,
    );
  }

  // Calculate derived stats — merge with MetaForge where available
  const atSurvivalRate =
    finalTotalRounds > 0 ? finalExtractions / finalTotalRounds : 0;
  const survivalRate = pickStat(
    atSurvivalRate,
    mfSurvivalRate > 1 ? mfSurvivalRate / 100 : mfSurvivalRate,
  );
  const kdRatio =
    finalDeaths > 0 ? finalPlayerKills / finalDeaths : finalPlayerKills;
  const avgDmgPerRound =
    finalTotalRounds > 0 ? finalDmgDealt / finalTotalRounds : 0;
  const atAvgProfit = finalTotalRounds > 0 ? finalProfit / finalTotalRounds : 0;
  const avgProfitPerRound = pickStat(atAvgProfit, mfAvgProfit);
  const lootEfficiencyPerMin =
    finalTime > 0 ? finalProfit / (finalTime / 60) : 0;
  const avgScorePerRound =
    finalTotalRounds > 0 ? totalScore / finalTotalRounds : 0;

  // ---- Stash valuation ----
  const stashItems = stash?.items || [];
  const stashValue = stashItems.reduce(
    (sum, i) => sum + num(i.value || i.price) * num(i.quantity || 1),
    0,
  );

  // ---- SHiESTY custom stats ----
  const demonStreak = computeDemonStreak(roundsArr);
  const raidEfficiency = computeRaidEfficiency(roundsArr);
  const trashValue = computeTrashValue(stashItems);
  const totalWeight = computeTotalWeight(stashItems);

  // ---- Progression % ----
  const hideoutModules =
    hideout?.modules || hideout?.workshop || hideout?.items || [];
  const projectsList = projects?.projects || projects?.items || projects || [];
  const questsList = quests?.quests || quests?.items || quests || [];
  const bpList = blueprints?.items || blueprints?.blueprints || [];

  // Map stash currencies into user credits/tokens
  const stashCurr = stash?.currencies || {};

  // Hideout modules use currentLevel/maxLevel — maxed = completed
  const hideoutDone = hideoutModules.filter(
    (m) =>
      m.currentLevel != null &&
      m.maxLevel != null &&
      m.currentLevel >= m.maxLevel,
  ).length;
  const hideoutPct =
    hideoutModules.length > 0
      ? Math.round((hideoutDone / hideoutModules.length) * 100)
      : 0;

  const progression = {
    workshop: hideoutPct,
    projects: completionPercent(projectsList, 'fullyCompleted'),
    quests: completionPercent(questsList, 'completed'),
    blueprints: completionPercent(bpList, 'learned'),
  };

  // ---- Currency — prefer live stash.currencies, fall back to DB ----
  // Confirmed field names from currencies.json: { credits, cred, raiderTokens, xp }
  const liveCredits =
    stashCurr.credits ?? stashCurr.creds ?? num(dbUser?.credits);
  // "cred" is the separate CRED in-game currency (cred: 739 in currencies.json)
  const liveCred = stashCurr.cred ?? num(dbUser?.coins);
  // "raiderTokens" is the premium currency (raiderTokens: 200 in currencies.json)
  const liveTokens =
    stashCurr.raiderTokens ??
    stashCurr.tokens ??
    stashCurr.raiders_tokens ??
    num(dbUser?.tokens);
  const liveCoins = liveCred;
  const currency = {
    totalFunds: num(liveCredits) + num(liveTokens),
    coins: num(liveCoins),
    cred: num(liveCred),
    credits: num(liveCredits),
    tokens: num(liveTokens),
  };

  // Weapon data priority: 1. ArcTracker dedicated kills, 2. MetaForge damage, 3. ArcTracker round damage.
  const weaponDamageRows = aggregateWeapons(roundsArr);
  const dedicatedWeaponRows =
    dedicatedWeaponKills?.weapons && Array.isArray(dedicatedWeaponKills.weapons)
      ? dedicatedWeaponKills.weapons
      : [];

  const mfWeaponMap = new Map();

  // Start with ArcTracker dedicated weapon kills.
  for (const w of dedicatedWeaponRows) {
    const key = (w.name || '').toLowerCase();
    if (!key) continue;
    mfWeaponMap.set(key, {
      name: w.name,
      kills: num(w.count ?? w.kills),
      damage: num(w.damage),
      itemId: w.itemId ?? w.item_id ?? null,
      weaponAssetId: w.weaponAssetId ?? w.weapon_asset_id ?? null,
    });
  }

  // MetaForge player-stats weaponStats are damage-only; never add kills from them.
  for (const [name, data] of Object.entries(mfWeapons || {})) {
    const key = (name || '').toLowerCase();
    if (!key) continue;
    const existing = mfWeaponMap.get(key);
    if (existing) {
      existing.damage = Math.max(num(existing.damage), num(data?.damage));
    } else {
      mfWeaponMap.set(key, {
        name,
        kills: 0,
        damage: num(data?.damage),
        itemId: null,
        weaponAssetId: null,
      });
    }
  }

  // Merge round-based damage data
  const weaponDamageByName = new Map(
    weaponDamageRows.map((w) => [w.name.toLowerCase(), w]),
  );
  for (const [key, weapon] of mfWeaponMap) {
    const damageRow = weaponDamageByName.get(key);
    if (damageRow && !weapon.damage) {
      weapon.damage = num(damageRow.damage);
    }
  }

  // Add any weapons only found in rounds (with damage but no kills from other sources)
  for (const w of weaponDamageRows) {
    const key = (w.name || '').toLowerCase();
    if (!mfWeaponMap.has(key)) {
      mfWeaponMap.set(key, {
        name: w.name,
        kills: 0,
        damage: num(w.damage),
        itemId: w.itemId ?? w.item_id ?? null,
        weaponAssetId: w.weaponAssetId ?? w.weapon_asset_id ?? null,
      });
    }
  }

  const mergedWeapons = Array.from(mfWeaponMap.values());
  const topWeaponsByDamage = [...mergedWeapons]
    .filter((w) => num(w.damage) > 0 || num(w.kills) > 0)
    .sort((a, b) => num(b.damage) - num(a.damage))
    .slice(0, 10);

  const combatEnemyRows =
    dedicatedEnemyKills?.enemies &&
    Array.isArray(dedicatedEnemyKills.enemies) &&
    dedicatedEnemyKills.enemies.length > 0
      ? dedicatedEnemyKills.enemies.map((e) => ({
          name: e.name,
          kills: num(e.count ?? e.kills),
          count: num(e.count ?? e.kills),
          damage: num(
            e.damage ??
              e.totalDamage ??
              e.total_damage ??
              e.damageDealt ??
              e.damage_dealt,
          ),
          target_id: e.targetId ?? e.target_id ?? null,
          targetId: e.targetId ?? e.target_id ?? null,
        }))
      : aggregateEnemies(roundsArr, profile).map((e) => ({
          name: e.name,
          kills: e.kills,
          count: e.kills,
          damage: e.damage,
          target_id: e.targetId ?? e.target_id ?? null,
          targetId: e.targetId ?? e.target_id ?? null,
        }));

  const enemyKillsSpec = combatEnemyRows.reduce((acc, e) => {
    acc[`kills_${e.name.toLowerCase().replace(/\s+/g, '_')}`] = e.kills;
    return acc;
  }, {});

  // Get last round score for XP earned in last match
  const lastRoundScore = roundsArr.length > 0 ? pickScore(roundsArr[0]) : 0;

  const overview = {
    raider_identity: {
      raider_alias:
        dbUser?.embarkUsername ||
        dbUser?.displayName ||
        profile?.username ||
        dbUser?.username ||
        'Unknown',
      metaforge_id: dbUser?.embarkId || dbUser?.id || null,
      raider_level: num(profile?.playerLevel ?? dbUser?.level, 1),
      total_xp: num(dbUser?.totalXp),
      raider_status: profile ? 'Online' : 'Offline',
      authenticated: !!profile,
      expedition_season: num(
        profile?.seasonNumber ??
          profile?.season ??
          expeditionStatus?.activeSeason ??
          dbUser?.seasonNumber,
        1,
      ),
    },
    wallet_and_economy: {
      total_funds: num(liveCredits) + num(liveTokens),
      total_coins: num(liveCoins),
      creds_balance: num(liveCredits),
      cred_balance: num(liveCred), // "cred" — separate CRED currency
      creds_max: null, // Not tracked by API
      tokens_balance: num(liveTokens),
      stash_market_value: stashValue,
      net_profit_career: finalProfit,
      avg_profit_per_round: avgProfitPerRound,
      loot_efficiency_per_min: lootEfficiencyPerMin,
    },
    performance_analytics: {
      survival_rate: survivalRate,
      kd_ratio: kdRatio,
      total_rounds: finalTotalRounds,
      successful_raids: finalExtractions,
      time_topside_seconds: Math.floor(finalTime),
      score_total: totalScore,
      avg_damage_per_round: avgDmgPerRound,
      avg_score_per_round: avgScorePerRound,
    },
    combat_detailed: {
      player_kills: finalPlayerKills,
      player_downs: totalDowns,
      arc_kills_total: finalArcKills,
      total_arc_kills: totalArcKills,
      damage_dealt_total: finalDmgDealt,
      damage_received_total: pickStat(totalDmgRecv, mfDmgReceived),
      health_restored_total: totalHealed,
      revives_given: pickStat(revivesGiven, mfRevivesPerformed),
      revives_received: pickStat(revivesReceived, mfTimesRevived),
      accuracy: mfAccuracy,
      headshot_percentage: mfHeadshotPct,
      shots_fired: mfShotsFired,
      shots_hit: mfShotsHit,
      weakpoint_hits: mfWeakpointHits,
      longest_kill_distance: mfLongestKill,
      melee_kills: mfMeleeKills,
      extractions_under_fire: mfExtractionsUnderFire,
      machine_codex: mfCodex,
      weapon_list: mfWeapons,
      // unit_breakdown: prefer the dedicated enemy-kills endpoint (pre-aggregated lifetime totals).
      // Falls back to aggregating from rounds if the endpoint is unavailable.
      unit_breakdown: enemyKillsSpec,
      // Full enemy array for consumers that want richer data
      enemies: combatEnemyRows,
    },
    scavenging_and_world: {
      totalContainersLooted: finalContainersLooted,
      containersLooted: finalContainersLooted,
      containers_looted: finalContainersLooted,
      rare_containers_found: rareContainers,
      vaults_breached: vaultsBreached,
      keys_consumed: keysConsumed,
      locked_doors_opened: lockedDoors,
      industrial_bins_opened: industrialBins,
      itemsExtracted: itemsExtracted,
      totalItemsExtracted: itemsExtracted,
      items_scrapped_count: itemsScrapped,
      items_extracted_count: itemsExtracted,
    },
    // map_specific_data: prefer dedicated ArcTracker map-performance endpoint.
    // Falls back to MetaForge map stats, then round aggregation.
    map_specific_data: (() => {
      if (
        dedicatedMapPerformance?.maps &&
        Array.isArray(dedicatedMapPerformance.maps) &&
        dedicatedMapPerformance.maps.length > 0
      ) {
        return dedicatedMapPerformance.maps.map((m) => ({
          map_id: (m.mapName || 'unknown').toLowerCase().replace(/\s+/g, '_'),
          map_name: m.mapName || 'Unknown',
          map_target_id: m.mapTargetId,
          survival_rate: m.raids > 0 ? m.extracted / m.raids : 0,
          rounds_played: m.raids || 0,
          extracted: m.extracted || 0,
          time_topside: Math.round((m.totalDurationMs || 0) / 1000),
          net_profit: m.totalNetValue || 0,
          avg_profit: m.raids > 0 ? Math.round(m.totalNetValue / m.raids) : 0,
          kills: 0, // not provided by map-performance endpoint
        }));
      }
      // Fallback 1: MetaForge map performance
      if (Array.isArray(mfMapPerformance) && mfMapPerformance.length > 0) {
        return mfMapPerformance.map((m) => ({
          map_id: (m.map_name || m.mapName || m.map || 'unknown')
            .toLowerCase()
            .replace(/\s+/g, '_'),
          map_name: m.map_name || m.mapName || m.map || 'Unknown',
          survival_rate: num(m.survival_rate ?? m.survivalRate),
          rounds_played: num(m.rounds_played ?? m.totalRounds ?? m.raids),
          extracted: num(m.total_extractions ?? m.extracted ?? m.extractions),
          time_topside: num(
            m.total_duration_seconds ?? m.time_topside ?? m.timeTopside,
          ),
          net_profit: num(m.total_net_profit ?? m.net_profit ?? m.netProfit),
          total_net_profit: num(m.total_net_profit ?? m.totalNetProfit),
          avg_profit: num(m.avg_profit ?? m.avgProfit),
          kills: num(m.total_arc_kills) + num(m.total_player_kills),
        }));
      }
      // Fallback 2: compute from rounds
      return aggregateMaps(roundsArr).map((m) => ({
        map_id: m.map.toLowerCase().replace(/\s+/g, '_'),
        map_name: m.map,
        survival_rate: m.survivalRate,
        rounds_played: m.roundsPlayed,
        extracted: m.extractions || 0,
        time_topside: Math.floor(m.timeTopside),
        net_profit: m.netProfit,
        total_net_profit: m.totalNetProfit,
        avg_profit: m.roundsPlayed > 0 ? m.netProfit / m.roundsPlayed : 0,
        kills: m.kills,
      }));
    })(),
    inventory_and_stash: {
      // inventory.json confirms: { usedSlots, maxSlots } at the snapshot root.
      // The stash response wraps this in the snapshot object or top-level slots.
      stash_capacity_used: num(
        stash?.usedSlots ??
          stash?.slots?.used ??
          stash?.snapshot?.usedSlots ??
          stashItems.length,
      ),
      stash_capacity_total:
        num(
          stash?.maxSlots ??
            stash?.slots?.total ??
            stash?.snapshot?.maxSlots ??
            null,
        ) || null,
      stash_total_value: num(
        stash?.totalValue ?? stash?.snapshot?.totalValue ?? 0,
      ),
      stash_items: stashItems,
    },
    leveling_logic: {
      current_rank: num(profile?.playerLevel ?? dbUser?.level, 1),
      xp_earned_last_match: lastRoundScore,
      total_career_xp: num(dbUser?.totalXp),
      current_season: num(
        profile?.seasonNumber ??
          profile?.season ??
          expeditionStatus?.activeSeason ??
          dbUser?.seasonNumber,
        1,
      ),
    },
    // Legacy shape for backward compatibility
    identity: {
      raiderAlias:
        dbUser?.embarkUsername ||
        dbUser?.displayName ||
        profile?.username ||
        dbUser?.username ||
        'Unknown',
      handle: dbUser?.username
        ? `${dbUser.username}#${dbUser.id?.slice?.(-4) || ''}`
        : '',
      avatar: dbUser?.avatar || null,
      slug: dbUser?.slug || null,
      level: num(profile?.playerLevel ?? dbUser?.level, 1),
      totalXp: num(dbUser?.totalXp),
      xp: num(dbUser?.xp),
      status: profile ? 'Authenticated / Online' : 'Offline',
      season: num(
        profile?.seasonNumber ??
          profile?.season ??
          expeditionStatus?.activeSeason ??
          dbUser?.seasonNumber,
        1,
      ),
    },
    currency,
    performance: {
      survivalRate,
      kdRatio,
      totalRounds: finalTotalRounds,
      successfulRaids: finalExtractions,
      timeTopsideSeconds: finalTime,
      arcKillsTotal: finalTotalKills,
      scoreTotal: totalScore,
      avgScorePerRound: avgScorePerRound,
    },
    combat: {
      kills: finalTotalKills,
      arcKills: finalArcKills,
      playerKills: finalPlayerKills,
      downs: totalDowns,
      damageDealt: finalDmgDealt,
      damageReceived: totalDmgRecv,
      healthRestored: totalHealed,
      avgDamagePerRound: avgDmgPerRound,
      revivesGiven,
      revivesReceived,
    },
    economy: {
      netProfit: finalProfit,
      avgProfitPerRound,
      lootEfficiencyPerMin,
      stashValue,
      stashCapacityUsed: stashItems.length,
    },
    shiesty_metrics: {
      demonStreak,
      raidEfficiency,
      blackMarketValue: Math.round(stashValue * 0.85),
      trashValue,
      totalWeight: Math.round(totalWeight * 100) / 100,
      metaforgeLinked: !!metaForgeProfileId,
    },
    maps: aggregateMaps(roundsArr),
    enemies: combatEnemyRows,
    weapons: mergedWeapons,
    weapon_performance: topWeaponsByDamage.map((w) => ({
      weapon_name: w.name,
      weapon_kills_total: num(w.kills),
      weapon_damage_total: num(w.damage),
      itemId: w.itemId,
      weaponAssetId: w.weaponAssetId,
    })),
    topWeapons: topWeaponsByDamage,
    progression,
    trade: {
      raiderRating: num(dbUser?.marketplaceRep),
      activeListingsCount: num(dbUser?.activeListings),
      lastSync: dbUser?.lastActive || null,
    },
    // MetaForge source block — full raw MF stats for UI consumers that want them directly
    metaforge_stats: mfRaiderRaw
      ? {
          total_kills: mfTotalKills,
          arc_kills: mfArcKills,
          player_kills: mfPlayerKills,
          total_raids: mfTotalRaids,
          extractions: mfExtractions,
          survival_rate: mfSurvivalRate,
          total_profit: mfProfit,
          avg_profit_per_extraction: mfAvgProfit,
          accuracy: mfAccuracy,
          headshot_percentage: mfHeadshotPct,
          shots_fired: mfShotsFired,
          shots_hit: mfShotsHit,
          weakpoint_hits: mfWeakpointHits,
          longest_kill_distance: mfLongestKill,
          melee_kills: mfMeleeKills,
          times_revived: mfTimesRevived,
          revives_performed: mfRevivesPerformed,
          extractions_under_fire: mfExtractionsUnderFire,
          damage_dealt: mfDmgDealt,
          damage_received: mfDmgReceived,
          containers_looted: mfContainersLooted,
          machine_codex: mfCodex,
          weapon_list: mfWeapons,
          map_performance: mfMapPerformance,
          containersLooted: finalContainersLooted,
        }
      : null,
    // Enhanced SHiESTY Codex Statistics
    enhanced_survival_metrics: aggregateEnhancedSurvival(roundsArr),
    advanced_kill_statistics: aggregateAdvancedKillStats(
      roundsArr,
      dedicatedEnemyKills,
      dedicatedWeaponKills,
    ),
    economic_performance_indicators: aggregateEconomicPerformance(
      roundsArr,
      stash,
    ),

    // Note: Full rounds array removed to prevent memory issues
    // Use /api/player/rounds endpoint with pagination to fetch round history
    roundsCount: roundsArr.length,
    recentRounds: roundsArr.slice(0, 10).map((r) => ({
      map: pickMap(r),
      outcome: r.outcome || r.status || r.extraction,
      duration: pickDuration(r),
      kills: pickKills(r),
      profit: pickProfit(r),
      timestamp: r.roundEndedAt || r.syncedAt || r.timestamp || r.date,
    })),
  };

  return finalizeStatsOverview(overview);
}
