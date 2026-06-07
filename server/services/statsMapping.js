/* =========================================================
   STATS MAPPING — Single Source of Truth
   Real ArcTracker source field -> internal stat key -> display label.
   Only fields confirmed in LIVE ArcTracker v2 responses are listed.
   Any stat not listed here MUST display NOT_AVAILABLE in the UI.

   Live-verified 2026-06-06 against https://arctracker.io
   ========================================================= */

export const NOT_AVAILABLE = 'N/A';

// /api/v2/user/profile -> data
export const PROFILE_FIELDS = {
  username:    { source: 'username',    display: 'Username' },
  displayName: { source: 'username',    display: 'Display Name' }, // alias
  playerLevel: { source: 'playerLevel', display: 'Player Level' },
  memberSince: { source: 'memberSince', display: 'Member Since' },
  userId:      { source: 'userId',      display: 'Embark ID' },
};

// /api/v2/user/rounds -> data.rounds[*]
// These are the ONLY fields observed in live responses. Do not invent more.
export const ROUND_FIELDS = {
  id:                    { source: 'id' },
  roundId:               { source: 'roundId' },
  map:                   { source: 'map' },                       // raw id
  mapName:               { source: 'mapName' },                   // pretty name
  outcome:               { source: 'outcome' },                   // "extracted" | "failed"
  durationMs:            { source: 'durationMs' },
  valueBroughtIn:        { source: 'valueBroughtIn' },
  valueExtracted:        { source: 'valueExtracted' },
  netValue:              { source: 'netValue' },
  kills:                 { source: 'kills' },
  arcKills:              { source: 'arcKills' },
  playerKills:           { source: 'playerKills' },
  playerDowns:           { source: 'playerDowns' },
  damage:                { source: 'damage' },
  score:                 { source: 'score' },
  isLegacy:              { source: 'isLegacy' },
  roundEndedAt:          { source: 'roundEndedAt' },
  syncedAt:              { source: 'syncedAt' },
  // Optional / not always present on every round payload:
  damageTaken:           { source: 'damageTaken',           optional: true },
  healing:               { source: 'healing',               optional: true },
  containersLooted:      { source: 'containersLooted',      optional: true },
  arcBreakdown:          { source: 'arcBreakdown',          optional: true }, // [{ targetName, kills, damage, type }]
  weaponDamageBreakdown: { source: 'weaponDamageBreakdown', optional: true }, // [{ weaponName, amount }]
};

// /api/v2/user/stash -> data.currencies
export const CURRENCY_FIELDS = {
  credits:      { source: 'currencies.credits',      display: 'Credits' },
  cred:         { source: 'currencies.cred',         display: 'CRED' },
  raiderTokens: { source: 'currencies.raiderTokens', display: 'Raider Tokens' },
  xp:           { source: 'currencies.xp',           display: 'XP' },
};

// Computed in summarizeRounds() / buildStatsOverview() — NOT from any endpoint.
export const COMPUTED_STATS = {
  totalRounds:           { display: 'Total Raids' },
  totalExtracted:        { display: 'Successful Extractions' },
  totalDied:             { display: 'Deaths' },
  survivalRate:          { display: 'Survival Rate' },
  totalArcKills:         { display: 'ARC Kills' },
  totalPlayerKills:      { display: 'Player Kills' },
  totalDamage:           { display: 'Total Damage' },
  totalValueExtracted:   { display: 'Loot Value' },
  totalValueBroughtIn:   { display: 'Loadout Value' },
  totalNetValue:         { display: 'Net Profit' },
  totalContainersLooted: { display: 'Containers Looted' },
  totalTimeMs:           { display: 'Time Topside (ms)' },
  demonStreak:           { display: 'Demon Streak' },
  topWeapons:            { display: 'Top 10 Weapons' },
  topEnemies:            { display: 'Top 10 ARC Enemies' },
};

// Canonical ARC enemy names — match values seen in arcBreakdown[*].targetName
export const ENEMY_NAMES = [
  'Wasp','Fireball','Tick','Pop','Hornet','Turret','Snitch','Firefly','Spotter',
  'Shredder','Rocketeer','Leaper','Comet','Bastion','Bombardier','ARC Surveyor',
  'Sentinel','Vaporizer',
];

// Endpoint catalog — what is real vs. what was removed.
// Use only the LIVE entries from server code.
export const ENDPOINTS = {
  live: [
    '/api/v2/user/profile',
    '/api/v2/user/rounds',
    '/api/v2/user/stash',
    '/api/v2/user/loadout',
    '/api/v2/user/hideout',
    '/api/v2/user/quests',
    '/api/v2/user/projects',
    '/api/v2/user/blueprints',
    '/api/items', // public
  ],
  // Returns 404 with X-App-Key + Bearer auth (do NOT call from server):
  dead: [
    '/api/v2/user/summary',
    '/api/v2/user/enemy-kills',
    '/api/v2/user/weapon-kills',
    '/api/v2/user/map-performance',
    '/api/v2/user/expedition-status',
  ],
  // Cookie-only (better-auth.session_token). Returns 401 with Bearer.
  // Use the fetchEmbarkStats() path if a per-user session cookie is stored.
  cookieOnly: [
    '/api/embark/stats/summary',
    '/api/embark/stats/enemy-kills',
    '/api/embark/stats/weapon-kills',
    '/api/embark/stats/map-performance',
    '/api/embark/stats/rounds',
  ],
};

// =========================================================
// CONFIRMED EMBARK STATS FIELDS
// From /api/embark/stats/* cookie-only endpoints.
// These are the ONLY fields observed in live browser responses.
// =========================================================

// /api/embark/stats/weapon-kills -> data.weapons[*]
export const WEAPON_KILL_FIELDS = {
  weaponAssetId: { source: 'weaponAssetId' },
  itemId:        { source: 'itemId' },
  name:          { source: 'name' },
  count:         { source: 'count' },
};

// /api/embark/stats/enemy-kills -> data.enemies[*]
export const ENEMY_KILL_FIELDS = {
  targetId: { source: 'targetId' },
  name:     { source: 'name' },
  count:    { source: 'count' },
};

// /api/embark/stats/map-performance -> data.maps[*]
export const MAP_PERFORMANCE_FIELDS = {
  mapTargetId: { source: 'mapTargetId' },
  mapName:     { source: 'mapName' },
  raids:       { source: 'raids' },
  extracted:   { source: 'extracted' },
};

// =========================================================
// NORMALIZED STATS SHAPE
// Produced by normalizeArcTrackerStats() running in the browser.
// This is the exact shape stored in SyncData from the extension.
// All other stat files should map to these field names.
// =========================================================

export const STATS = {
  userId:           { source: 'userId' },
  username:         { source: 'username' },
  emailVerified:    { source: 'emailVerified' },
  sessionExpiresAt: { source: 'sessionExpiresAt' },

  enabled:               { source: 'enabled' },
  isEmbarkLinked:        { source: 'isEmbarkLinked' },
  isTokenExpired:        { source: 'isTokenExpired' },
  consecutiveFailures:   { source: 'consecutiveFailures' },
  lastSyncAt:            { source: 'lastSyncAt' },
  nextSyncAt:            { source: 'nextSyncAt' },

  activeSeason:         { source: 'activeSeason' },
  completedExpeditions: { source: 'completedExpeditions' },
  expeditionState:      { source: 'expeditionState' },
  currentTier:          { source: 'currentTier' },
  nextTier:             { source: 'nextTier' },

  totalRounds:           { source: 'totalRounds' },
  totalExtracted:        { source: 'totalExtracted' },
  totalDied:             { source: 'totalDied' },
  totalTimeMs:           { source: 'totalTimeMs' },
  totalValueExtracted:   { source: 'totalValueExtracted' },
  totalValueBroughtIn:   { source: 'totalValueBroughtIn' },
  totalNetValue:         { source: 'totalNetValue' },
  totalArcKills:         { source: 'totalArcKills' },
  totalPlayerKills:      { source: 'totalPlayerKills' },
  totalKills:            { source: 'totalKills' },
  totalDamage:           { source: 'totalDamage' },
  totalContainersLooted: { source: 'totalContainersLooted' },

  survivalRate:              { source: 'survivalRate' },
  deathRate:                 { source: 'deathRate' },
  playerKD:                  { source: 'playerKD' },
  avgRaidTimeMs:             { source: 'avgRaidTimeMs' },
  avgRaidTimeMinutes:        { source: 'avgRaidTimeMinutes' },
  avgValueExtractedPerRound: { source: 'avgValueExtractedPerRound' },
  avgValueBroughtInPerRound: { source: 'avgValueBroughtInPerRound' },
  avgNetValuePerRound:       { source: 'avgNetValuePerRound' },
  arcKillsPerRound:          { source: 'arcKillsPerRound' },
  playerKillsPerRound:       { source: 'playerKillsPerRound' },
  totalKillsPerRound:        { source: 'totalKillsPerRound' },
  damagePerRound:            { source: 'damagePerRound' },
  containersLootedPerRound:  { source: 'containersLootedPerRound' },

  topWeapons:     { source: 'topWeapons' },
  arcEnemies:     { source: 'arcEnemiesByType' },
  mapPerformance: { source: 'mapPerformance' },
};

// =========================================================
// NORMALIZATION FUNCTIONS
// Convert raw embark endpoint responses into unified shapes.
// ONLY uses confirmed fields listed above.
// =========================================================

export function normalizeWeaponKills(payload) {
  const raw = payload?.weapons ?? payload?.data?.weapons ?? [];
  if (!Array.isArray(raw)) return { weapons: [], source: 'embark' };
  return {
    weapons: raw.map((w) => ({
      weaponAssetId: w?.weaponAssetId ?? null,
      itemId:        w?.itemId ?? null,
      name:          w?.name ?? 'Unknown',
      count:         Number(w?.count ?? 0),
    })),
    source: 'embark',
  };
}

export function normalizeEnemyKills(payload) {
  const raw = payload?.enemies ?? payload?.data?.enemies ?? [];
  if (!Array.isArray(raw)) return { enemies: [], source: 'embark' };
  return {
    enemies: raw.map((e) => ({
      targetId: e?.targetId ?? null,
      name:     e?.name ?? 'Unknown',
      count:    Number(e?.count ?? 0),
    })),
    source: 'embark',
  };
}

export function normalizeMapPerformance(payload) {
  const raw = payload?.maps ?? payload?.data?.maps ?? payload?.mapPerformance ?? [];
  if (!Array.isArray(raw)) return { maps: [], source: 'embark' };
  return {
    maps: raw.map((m) => {
      const raids = Number(m?.raids ?? m?.rounds ?? m?.roundsPlayed ?? 0);
      const extracted = Number(m?.extracted ?? m?.extractions ?? m?.totalExtracted ?? 0);
      const totalDurationMs = Number(m?.totalDurationMs ?? m?.durationMs ?? 0);
      const totalNetValue = Number(m?.totalNetValue ?? m?.netValue ?? m?.netProfit ?? 0);
      return {
        mapTargetId: m?.mapTargetId ?? m?.targetId ?? m?.mapId ?? null,
        mapName:     m?.mapName ?? resolveMapName(m?.mapTargetId ?? m?.targetId ?? m?.mapId),
        raids,
        extracted,
        totalDurationMs,
        totalNetValue,
        survivalRate: raids > 0 ? Number(((extracted / raids) * 100).toFixed(2)) : 0,
        avgDurationMs: raids > 0 ? Math.round(totalDurationMs / raids) : 0,
        avgNetValue: raids > 0 ? Math.round(totalNetValue / raids) : 0,
      };
    }).sort((a, b) => Number(b.raids || 0) - Number(a.raids || 0)),
    source: 'embark',
  };
}

/**
 * Master normalization for the full embark stats bundle.
 * Computes unified totals from the normalized sub-sections.
 */
export function normalizeEmbarkStats({
  summary = null,
  rounds = null,
  weaponKills,
  enemyKills,
  mapPerformance,
  expeditionStatus = null,
  autoSyncSettings = null,
} = {}) {
  const hasSummary =
    summary !== null &&
    summary !== undefined &&
    (typeof summary !== 'object' || Object.keys(summary).length > 0);
  const normalizedSummary = normalizeSummary(summary);
  const normalizedRounds = summarizeRounds(normalizeRounds(rounds?.rounds ?? rounds?.data?.rounds ?? rounds ?? []));
  const weapons = normalizeWeaponKills(weaponKills).weapons;
  const enemies = normalizeEnemyKills(enemyKills).enemies;
  const maps    = normalizeMapPerformance(mapPerformance).maps;

  const totalRounds = firstNumber(
    hasSummary ? normalizedSummary.totalRounds : undefined,
    normalizedRounds.totalRounds,
    maps.reduce((s, m) => s + numberOrZero(m.raids), 0),
  );
  const totalExtracted = firstNumber(
    hasSummary ? normalizedSummary.totalExtracted : undefined,
    normalizedRounds.totalExtracted,
    maps.reduce((s, m) => s + numberOrZero(m.extracted), 0),
  );
  const totalDied = firstNumber(
    hasSummary ? normalizedSummary.totalDied : undefined,
    normalizedRounds.totalDied,
    Math.max(totalRounds - totalExtracted, 0),
  );
  const totalArcKills = firstNumber(
    hasSummary ? normalizedSummary.totalArcKills : undefined,
    normalizedRounds.totalArcKills,
    enemies.reduce((s, e) => s + numberOrZero(e.count), 0),
  );
  const totalPlayerKills = firstNumber(
    hasSummary ? normalizedSummary.totalPlayerKills : undefined,
    normalizedRounds.totalPlayerKills,
  );
  const totalDamage = firstNumber(
    hasSummary ? normalizedSummary.totalDamage : undefined,
    normalizedRounds.totalDamage,
  );
  const totalContainersLooted = firstNumber(
    hasSummary ? normalizedSummary.totalContainersLooted : undefined,
    normalizedRounds.totalContainersLooted,
  );
  const totalValueExtracted = firstNumber(
    hasSummary ? normalizedSummary.totalValueExtracted : undefined,
    normalizedRounds.totalValueExtracted,
  );
  const totalValueBroughtIn = firstNumber(
    hasSummary ? normalizedSummary.totalValueBroughtIn : undefined,
    normalizedRounds.totalValueBroughtIn,
  );
  const totalNetValue = firstNumber(
    hasSummary ? normalizedSummary.totalNetValue : undefined,
    normalizedRounds.totalNetValue,
    totalValueExtracted - totalValueBroughtIn,
  );
  const totalTimeMs = firstNumber(
    hasSummary ? normalizedSummary.totalTimeMs : undefined,
    normalizedRounds.totalTimeMs,
  );
  const totalKills = totalArcKills + totalPlayerKills;

  const totals = {
    totalRounds,
    totalExtracted,
    totalDied,
    totalTimeMs,
    totalValueExtracted,
    totalValueBroughtIn,
    totalNetValue,
    totalArcKills,
    totalPlayerKills,
    totalKills,
    totalDamage,
    totalContainersLooted,
  };

  const derived = deriveRates(totals);

  return {
    sync: {
      enabled: Boolean(autoSyncSettings?.enabled),
      isEmbarkLinked: Boolean(autoSyncSettings?.isEmbarkLinked),
      isTokenExpired: Boolean(autoSyncSettings?.isTokenExpired),
      consecutiveFailures: numberOrZero(autoSyncSettings?.consecutiveFailures),
      lastSyncAt: autoSyncSettings?.lastSyncAt ?? null,
      nextSyncAt: autoSyncSettings?.nextSyncAt ?? null,
    },
    expedition: expeditionStatus ?? null,
    totals,
    derived,
    summary: { ...totals, ...derived },
    rounds: normalizedRounds.rounds,
    topWeapons: normalizeTopWeapons(weapons, normalizedRounds.rounds),
    arcEnemiesByType: normalizeTopEnemies(enemies, normalizedRounds.rounds),
    mapPerformance: maps.length ? maps : normalizedRounds.mapPerformance,
    source: 'statsMapping',
  };
}

// =========================================================
// ARC TRACKER BROWSER FETCHER
// Run this in the ArcTracker browser console.
// Fetches all cookie-only endpoints and normalizes.
// =========================================================

const ARCTRACKER_STAT_ROUTES = {
  session: "/api/auth/get-session",

  sync: "/api/embark/auto-sync/settings",
  expeditionStatus: "/api/embark/expedition-status",

  summary: "/api/embark/stats/summary",
  weaponKills: "/api/embark/stats/weapon-kills",
  enemyKills: "/api/embark/stats/enemy-kills",
  mapPerformance: "/api/embark/stats/map-performance",

  // POST route, needs payload/body if used
  mappings: "/api/embark/mappings"
};

async function fetchArcTrackerRoute(route) {
  const res = await fetch(route, {
    method: "GET",
    credentials: "include",
    headers: {
      accept: "application/json"
    }
  });

  const text = await res.text();

  let data = null;

  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    route,
    status: res.status,
    ok: res.ok,
    data
  };
}

async function fetchAllArcTrackerStats() {
  const [
    session,
    syncSettings,
    expeditionStatus,
    summary,
    weaponKills,
    enemyKills,
    mapPerformance
  ] = await Promise.all([
    fetchArcTrackerRoute(ARCTRACKER_STAT_ROUTES.session),
    fetchArcTrackerRoute(ARCTRACKER_STAT_ROUTES.sync),
    fetchArcTrackerRoute(ARCTRACKER_STAT_ROUTES.expeditionStatus),
    fetchArcTrackerRoute(ARCTRACKER_STAT_ROUTES.summary),
    fetchArcTrackerRoute(ARCTRACKER_STAT_ROUTES.weaponKills),
    fetchArcTrackerRoute(ARCTRACKER_STAT_ROUTES.enemyKills),
    fetchArcTrackerRoute(ARCTRACKER_STAT_ROUTES.mapPerformance)
  ]);

  return normalizeArcTrackerStats({
    session: session.data,
    syncSettings: syncSettings.data,
    expeditionStatus: expeditionStatus.data,
    summary: summary.data,
    weaponKills: weaponKills.data,
    enemyKills: enemyKills.data,
    mapPerformance: mapPerformance.data
  });
}

function normalizeArcTrackerStats({
  session,
  summary,
  weaponKills,
  enemyKills,
  mapPerformance,
  expeditionStatus,
  syncSettings
}) {
  const s = summary ?? {};
  const weapons = weaponKills?.weapons ?? [];
  const enemies = enemyKills?.enemies ?? [];
  const maps = mapPerformance?.maps ?? [];

  const totalRounds = Number(s.totalRounds ?? 0);
  const totalExtracted = Number(s.totalExtracted ?? 0);
  const totalDied = Number(s.totalDied ?? 0);
  const totalTimeMs = Number(s.totalTimeMs ?? 0);

  const totalValueExtracted = Number(s.totalValueExtracted ?? 0);
  const totalValueBroughtIn = Number(s.totalValueBroughtIn ?? 0);
  const totalNetValue = Number(s.totalNetValue ?? 0);

  const totalArcKills = Number(s.totalArcKills ?? 0);
  const totalPlayerKills = Number(s.totalPlayerKills ?? 0);
  const totalKills = totalArcKills + totalPlayerKills;

  const totalDamage = Number(s.totalDamage ?? 0);
  const totalContainersLooted = Number(s.totalContainersLooted ?? 0);

  return {
    account: {
      userId: session?.user?.id ?? null,
      username: session?.user?.name ?? null,
      emailVerified: Boolean(session?.user?.emailVerified),
      sessionExpiresAt: session?.session?.expiresAt ?? null
    },

    sync: {
      enabled: Boolean(syncSettings?.enabled),
      isEmbarkLinked: Boolean(syncSettings?.isEmbarkLinked),
      isTokenExpired: Boolean(syncSettings?.isTokenExpired),
      consecutiveFailures: Number(syncSettings?.consecutiveFailures ?? 0),
      lastSyncAt: syncSettings?.lastSyncAt ?? null,
      nextSyncAt: syncSettings?.nextSyncAt ?? null
    },

    expedition: {
      activeSeason: expeditionStatus?.activeSeason ?? null,
      completedExpeditions: expeditionStatus?.completedExpeditions ?? null,
      state: expeditionStatus?.state ?? null,
      currentTier: expeditionStatus?.currentTier ?? null,
      nextTier: expeditionStatus?.nextTier ?? null
    },

    totals: {
      totalRounds,
      totalExtracted,
      totalDied,
      totalTimeMs,

      totalValueExtracted,
      totalValueBroughtIn,
      totalNetValue,

      totalArcKills,
      totalPlayerKills,
      totalKills,

      totalDamage,
      totalContainersLooted
    },

    derived: {
      survivalRate:
        totalRounds > 0
          ? Number(((totalExtracted / totalRounds) * 100).toFixed(2))
          : 0,

      deathRate:
        totalRounds > 0
          ? Number(((totalDied / totalRounds) * 100).toFixed(2))
          : 0,

      playerKD:
        totalDied > 0
          ? Number((totalPlayerKills / totalDied).toFixed(2))
          : totalPlayerKills,

      avgRaidTimeMs:
        totalRounds > 0
          ? Math.round(totalTimeMs / totalRounds)
          : 0,

      avgRaidTimeMinutes:
        totalRounds > 0
          ? Number((totalTimeMs / totalRounds / 60000).toFixed(2))
          : 0,

      avgValueExtractedPerRound:
        totalRounds > 0
          ? Math.round(totalValueExtracted / totalRounds)
          : 0,

      avgValueBroughtInPerRound:
        totalRounds > 0
          ? Math.round(totalValueBroughtIn / totalRounds)
          : 0,

      avgNetValuePerRound:
        totalRounds > 0
          ? Math.round(totalNetValue / totalRounds)
          : 0,

      arcKillsPerRound:
        totalRounds > 0
          ? Number((totalArcKills / totalRounds).toFixed(2))
          : 0,

      playerKillsPerRound:
        totalRounds > 0
          ? Number((totalPlayerKills / totalRounds).toFixed(2))
          : 0,

      totalKillsPerRound:
        totalRounds > 0
          ? Number((totalKills / totalRounds).toFixed(2))
          : 0,

      damagePerRound:
        totalRounds > 0
          ? Number((totalDamage / totalRounds).toFixed(2))
          : 0,

      containersLootedPerRound:
        totalRounds > 0
          ? Number((totalContainersLooted / totalRounds).toFixed(2))
          : 0
    },

    topWeapons: weapons.map((weapon) => ({
      weaponAssetId: weapon.weaponAssetId ?? null,
      itemId: weapon.itemId ?? null,
      name: weapon.name ?? "Unknown Weapon",
      count: Number(weapon.count ?? 0)
    })),

    arcEnemiesByType: enemies.map((enemy) => ({
      targetId: enemy.targetId ?? null,
      name: enemy.name ?? "Unknown Enemy",
      count: Number(enemy.count ?? 0)
    })),

    mapPerformance: maps.map((map) => {
      const raids = Number(map.raids ?? 0);
      const extracted = Number(map.extracted ?? 0);
      const totalDurationMs = Number(map.totalDurationMs ?? 0);
      const totalNetValue = Number(map.totalNetValue ?? 0);

      return {
        mapTargetId: map.mapTargetId ?? null,
        mapName: map.mapName ?? "Unknown Map",
        raids,
        extracted,
        totalDurationMs,
        totalNetValue,

        survivalRate:
          raids > 0
            ? Number(((extracted / raids) * 100).toFixed(2))
            : 0,

        avgDurationMs:
          raids > 0
            ? Math.round(totalDurationMs / raids)
            : 0,

        avgNetValue:
          raids > 0
            ? Math.round(totalNetValue / raids)
            : 0
      };
    })
  };
}

// Run this in the ArcTracker browser console:
// fetchAllArcTrackerStats().then((stats) => {
//   console.log("NORMALIZED ARC TRACKER STATS:", stats);
// });


// =========================================================
// SINGLE-SOURCE HELPERS ADDED FOR SHIESTY PROJECT
// Keep all stat decoding / naming / totals here. Other services should import
// from this file instead of inventing aliases in multiple places.
// =========================================================

export const PLAYER_TARGET_ID = 0x3b54bb4b;

export const STAT_EVENT_IDS = Object.freeze({
  MAP_SEEN: 9800,
  RETURNED_SAFELY: 9801,
  KNOCKED_OUT: 9802,
  DURATION_MS: 9803,
  VALUE_BROUGHT_IN: 9804,
  VALUE_EXTRACTED: 9805,
  DAMAGE_BY_ENEMY_TYPE: 100,
  KILLS_BY_ENEMY_TYPE: 200,
  DAMAGE_BY_WEAPON_TYPE: 102,
  KILLS_BY_WEAPON_TYPE: 202,
  PLAYER_DOWNS: 204,
  CONTAINERS_LOOTED: 501,
  XP_GAINED: 9902,
});

export const MAP_ID_TO_NAME = Object.freeze({
  [0x237328a6]: 'Spaceport',
  [0x5a91839b]: 'The Blue Gate',
  [-0x78b0152f]: 'Stella Montis',
  [-0x2c448c69]: 'The Dam',
  [-0x25eb6647]: 'The Dam',
  [-0x75a49a54]: 'Buried City',
  [-0x01447610]: 'Riven Tides',
});

export const ENEMY_ID_TO_NAME = Object.freeze({
  [0x2813ad02]: 'Wasp',
  [0x279a46d1]: 'Hornet',
  [-0x1e0df78f]: 'Pop',
  [0x11d66714]: 'Fireball',
  [-0x605d544f]: 'Bastion',
  [-0x4e2c5310]: 'Bombardier',
  [-0x05d1b69ed]: 'Spotter',
  [0x6a7b166b]: 'Snitch',
  [0x36736819]: 'Turret',
  [0x35df96f6]: 'Rocketeer',
  [-0x2041fdeb]: 'Leaper',
  [-0x14fd3b58]: 'Tick',
  [0x78289476]: 'Shredder',
  [-0x42ef750a]: 'Sentinel',
  [0x4426c766]: 'ARC Surveyor',
  [-0x458be398]: 'Queen',
  [0x49126989]: 'Matriarch',
  [-0x5ae14f71]: 'Firefly',
  [-0x6a1f6a7b]: 'Comet',
  [0x61bf1298]: 'Vaporizer',
  [-0x17d9bf87]: 'ARC Turbine',
});

export const SHIELD_PROFILES = Object.freeze({
  light: { charge: 40, deflection: 0.4 },
  medium: { charge: 70, deflection: 0.425 },
  heavy: { charge: 80, deflection: 0.525 },
});

export function numberOrZero(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

export function firstNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function percent(numerator, denominator, digits = 2) {
  const den = numberOrZero(denominator);
  if (den <= 0) return 0;
  return Number(((numberOrZero(numerator) / den) * 100).toFixed(digits));
}

export function getPath(obj, path, fallback = undefined) {
  if (!obj || !path) return fallback;
  const parts = String(path).split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return fallback;
    current = current[part];
  }
  return current === undefined || current === null ? fallback : current;
}

export function resolveMapName(mapTargetId, fallback = 'Unknown') {
  if (mapTargetId === undefined || mapTargetId === null) return fallback;
  return MAP_ID_TO_NAME[Number(mapTargetId)] || fallback || `Unknown Map (${mapTargetId})`;
}

export function resolveEnemyName(targetId, fallback = 'Unknown') {
  if (targetId === undefined || targetId === null) return fallback;
  if (Number(targetId) === PLAYER_TARGET_ID) return 'Player';
  return ENEMY_ID_TO_NAME[Number(targetId)] || fallback || `Enemy ${targetId}`;
}

export function normalizeSummary(payload = {}) {
  const root = payload?.data ?? payload?.summary ?? payload?.totals ?? payload?.stats ?? payload ?? {};
  const totalRounds = firstNumber(root.totalRounds, root.total_rounds, root.raids, root.rounds);
  const totalExtracted = firstNumber(root.totalExtracted, root.total_extracted, root.extracted, root.successfulExtractions, root.extractions);
  const totalDied = firstNumber(root.totalDied, root.total_died, root.died, root.deaths, root.totalDeaths, totalRounds - totalExtracted);
  const totalValueExtracted = firstNumber(root.totalValueExtracted, root.valueExtracted, root.lootValue, root.total_loot_value);
  const totalValueBroughtIn = firstNumber(root.totalValueBroughtIn, root.valueBroughtIn, root.loadoutValue);
  const totalNetValue = firstNumber(root.totalNetValue, root.netValue, root.netProfit, root.total_net_value, totalValueExtracted - totalValueBroughtIn);
  const totalArcKills = firstNumber(root.totalArcKills, root.arcKills, root.arc_kills, root.arc_enemies_destroyed);
  const totalPlayerKills = firstNumber(root.totalPlayerKills, root.playerKills, root.player_kills);
  const totalDamage = firstNumber(root.totalDamage, root.damage, root.damageDealt, root.totalDamageDealt, root.total_damage_dealt);
  const totalContainersLooted = firstNumber(root.totalContainersLooted, root.containersLooted, root.containers_looted);
  return {
    totalRounds,
    totalExtracted,
    totalDied,
    totalTimeMs: firstNumber(root.totalTimeMs, root.durationMs, root.totalDurationMs),
    totalValueExtracted,
    totalValueBroughtIn,
    totalNetValue,
    totalArcKills,
    totalPlayerKills,
    totalKills: firstNumber(root.totalKills, totalArcKills + totalPlayerKills),
    totalDamage,
    totalContainersLooted,
  };
}

export function deriveRates(totals = {}) {
  const totalRounds = numberOrZero(totals.totalRounds);
  const totalExtracted = numberOrZero(totals.totalExtracted);
  const totalDied = numberOrZero(totals.totalDied);
  const totalTimeMs = numberOrZero(totals.totalTimeMs);
  const totalNetValue = numberOrZero(totals.totalNetValue);
  const totalValueExtracted = numberOrZero(totals.totalValueExtracted);
  const totalValueBroughtIn = numberOrZero(totals.totalValueBroughtIn);
  const totalArcKills = numberOrZero(totals.totalArcKills);
  const totalPlayerKills = numberOrZero(totals.totalPlayerKills);
  const totalKills = firstNumber(totals.totalKills, totalArcKills + totalPlayerKills);
  const totalDamage = numberOrZero(totals.totalDamage);
  const totalContainersLooted = numberOrZero(totals.totalContainersLooted);
  return {
    survivalRate: percent(totalExtracted, totalRounds),
    deathRate: percent(totalDied, totalRounds),
    playerKD: totalDied > 0 ? Number((totalPlayerKills / totalDied).toFixed(2)) : totalPlayerKills,
    avgRaidTimeMs: totalRounds > 0 ? Math.round(totalTimeMs / totalRounds) : 0,
    avgRaidTimeMinutes: totalRounds > 0 ? Number((totalTimeMs / totalRounds / 60000).toFixed(2)) : 0,
    avgValueExtractedPerRound: totalRounds > 0 ? Math.round(totalValueExtracted / totalRounds) : 0,
    avgValueBroughtInPerRound: totalRounds > 0 ? Math.round(totalValueBroughtIn / totalRounds) : 0,
    avgNetValuePerRound: totalRounds > 0 ? Math.round(totalNetValue / totalRounds) : 0,
    arcKillsPerRound: totalRounds > 0 ? Number((totalArcKills / totalRounds).toFixed(2)) : 0,
    playerKillsPerRound: totalRounds > 0 ? Number((totalPlayerKills / totalRounds).toFixed(2)) : 0,
    totalKillsPerRound: totalRounds > 0 ? Number((totalKills / totalRounds).toFixed(2)) : 0,
    damagePerRound: totalRounds > 0 ? Number((totalDamage / totalRounds).toFixed(2)) : 0,
    containersLootedPerRound: totalRounds > 0 ? Number((totalContainersLooted / totalRounds).toFixed(2)) : 0,
  };
}

export function normalizeRoundStats(rawRound = {}, resolveWeaponName = null) {
  const rawStats = Array.isArray(rawRound.stats) ? rawRound.stats : [];

  // Already-normalized route shape: keep it, but still fill aliases.
  if (rawStats.length === 0) {
    const valueBroughtIn = firstNumber(rawRound.valueBroughtIn, rawRound.loadoutValue, rawRound.loadout_value);
    const valueExtracted = firstNumber(rawRound.valueExtracted, rawRound.lootValue, rawRound.loot_value);
    const netValue = firstNumber(rawRound.netValue, rawRound.netProfit, valueExtracted - valueBroughtIn);
    const mapTargetId = firstDefined(rawRound.mapTargetId, rawRound.mapId, rawRound.map);
    return {
      ...rawRound,
      roundId: firstDefined(rawRound.roundId, rawRound.id),
      mapTargetId,
      mapName: firstDefined(rawRound.mapName, rawRound.map_name, resolveMapName(mapTargetId, 'Unknown')),
      outcome: normalizeOutcome(rawRound.outcome ?? rawRound.status ?? rawRound.extraction),
      durationMs: firstNumber(rawRound.durationMs, numberOrZero(rawRound.duration) * 1000),
      valueBroughtIn,
      valueExtracted,
      netValue,
      kills: firstNumber(rawRound.kills, numberOrZero(rawRound.arcKills) + numberOrZero(rawRound.playerKills)),
      arcKills: firstNumber(rawRound.arcKills, rawRound.arc_kills),
      playerKills: firstNumber(rawRound.playerKills, rawRound.player_kills),
      playerDowns: firstNumber(rawRound.playerDowns, rawRound.downs, rawRound.knocks),
      damage: firstNumber(rawRound.damage, rawRound.damageDealt, rawRound.totalDamage),
      xpGained: firstNumber(rawRound.xpGained, rawRound.xp, rawRound.score),
      containersLooted: firstNumber(rawRound.containersLooted, rawRound.totalContainersLooted, rawRound.containers_looted),
      rawStats,
    };
  }

  let outcome = 'UNKNOWN';
  let mapTargetId = null;
  let durationMs = null;
  let valueBroughtIn = null;
  let valueExtracted = null;
  let enemyKillTotal = 0;
  let weaponKillTotal = 0;
  let enemyDamageTotal = 0;
  let weaponDamageTotal = 0;
  let arcKills = 0;
  let playerKills = 0;
  let playerDowns = 0;
  let xpGained = 0;
  let containersLooted = 0;

  const killsByEnemy = new Map();
  const killsByWeapon = new Map();
  const damageByEnemy = new Map();
  const damageByWeapon = new Map();

  for (const stat of rawStats) {
    const eventId = Number(stat?.eventId);
    const targetId = stat?.targetId;
    const amount = numberOrZero(stat?.amount);

    switch (eventId) {
      case STAT_EVENT_IDS.RETURNED_SAFELY:
        outcome = 'RETURNED SAFELY';
        if (targetId !== undefined && targetId !== null) mapTargetId = targetId;
        break;
      case STAT_EVENT_IDS.KNOCKED_OUT:
        outcome = 'KNOCKED OUT';
        if (targetId !== undefined && targetId !== null) mapTargetId = targetId;
        break;
      case STAT_EVENT_IDS.MAP_SEEN:
        if (targetId !== undefined && targetId !== null && mapTargetId === null) mapTargetId = targetId;
        break;
      case STAT_EVENT_IDS.DURATION_MS:
        durationMs = amount;
        break;
      case STAT_EVENT_IDS.VALUE_BROUGHT_IN:
        valueBroughtIn = amount;
        break;
      case STAT_EVENT_IDS.VALUE_EXTRACTED:
        valueExtracted = amount;
        break;
      case STAT_EVENT_IDS.DAMAGE_BY_ENEMY_TYPE:
        enemyDamageTotal += amount;
        if (targetId !== undefined && targetId !== null) damageByEnemy.set(targetId, (damageByEnemy.get(targetId) || 0) + amount);
        break;
      case STAT_EVENT_IDS.KILLS_BY_ENEMY_TYPE:
        enemyKillTotal += amount;
        if (targetId !== undefined && targetId !== null) {
          killsByEnemy.set(targetId, (killsByEnemy.get(targetId) || 0) + amount);
          if (Number(targetId) === PLAYER_TARGET_ID) playerKills += amount;
          else if (ENEMY_ID_TO_NAME[Number(targetId)]) arcKills += amount;
        }
        break;
      case STAT_EVENT_IDS.DAMAGE_BY_WEAPON_TYPE:
        weaponDamageTotal += amount;
        if (targetId !== undefined && targetId !== null) damageByWeapon.set(targetId, (damageByWeapon.get(targetId) || 0) + amount);
        break;
      case STAT_EVENT_IDS.KILLS_BY_WEAPON_TYPE:
        weaponKillTotal += amount;
        if (targetId !== undefined && targetId !== null) killsByWeapon.set(targetId, (killsByWeapon.get(targetId) || 0) + amount);
        break;
      case STAT_EVENT_IDS.PLAYER_DOWNS:
        if (Number(targetId) === PLAYER_TARGET_ID) playerDowns += amount;
        break;
      case STAT_EVENT_IDS.CONTAINERS_LOOTED:
        containersLooted += amount;
        break;
      case STAT_EVENT_IDS.XP_GAINED:
        xpGained += amount;
        break;
      default:
        break;
    }
  }

  const weaponName = (id) => {
    if (typeof resolveWeaponName === 'function') return resolveWeaponName(id) || `Weapon ${id}`;
    return `Weapon ${id}`;
  };
  const enemyName = (id) => resolveEnemyName(id, `Enemy ${id}`);
  const toBreakdown = (map, nameFn) => Array.from(map.entries()).map(([targetId, amount]) => ({
    targetId,
    targetName: nameFn(targetId),
    amount: numberOrZero(amount),
  })).sort((a, b) => b.amount - a.amount);

  return {
    roundId: firstDefined(rawRound.roundId, rawRound.id),
    id: rawRound.id,
    outcome,
    mapTargetId,
    mapId: mapTargetId,
    mapName: resolveMapName(mapTargetId, 'Unknown'),
    durationMs,
    durationFormatted: formatDurationMs(durationMs),
    valueBroughtIn,
    valueExtracted,
    netValue: valueExtracted !== null && valueBroughtIn !== null ? valueExtracted - valueBroughtIn : null,
    kills: enemyKillTotal + weaponKillTotal,
    damage: enemyDamageTotal + weaponDamageTotal,
    killsByEnemyType: enemyKillTotal,
    killsByWeapon: weaponKillTotal,
    damageByEnemyType: enemyDamageTotal,
    damageByWeaponType: weaponDamageTotal,
    arcKills,
    playerKills,
    playerDowns,
    killsBreakdownByEnemy: toBreakdown(killsByEnemy, enemyName),
    killsBreakdownByWeapon: toBreakdown(killsByWeapon, weaponName),
    damageBreakdownByEnemy: toBreakdown(damageByEnemy, enemyName),
    damageBreakdownByWeapon: toBreakdown(damageByWeapon, weaponName),
    xpGained,
    containersLooted,
    rawStats,
    raw: rawRound,
  };
}

export function normalizeRounds(rounds = [], resolveWeaponName = null) {
  const arr = Array.isArray(rounds) ? rounds : [];
  return arr.map((round) => normalizeRoundStats(round, resolveWeaponName));
}

export function normalizeOutcome(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return 'UNKNOWN';
  if (raw === 'extracted' || raw === 'returned safely' || raw.includes('returned') || raw.includes('extract')) return 'RETURNED SAFELY';
  if (raw === 'failed' || raw === 'knocked out' || raw.includes('knocked') || raw.includes('died')) return 'KNOCKED OUT';
  return String(value).toUpperCase();
}

export function isExtracted(round = {}) {
  return normalizeOutcome(round.outcome ?? round.status ?? round.extraction) === 'RETURNED SAFELY';
}

export function formatDurationMs(ms) {
  if (ms === null || ms === undefined) return '--:--';
  const seconds = Math.floor(numberOrZero(ms) / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function summarizeRounds(rounds = []) {
  const normalized = normalizeRounds(rounds);
  const totals = normalized.reduce((acc, round) => {
    acc.totalRounds += 1;
    if (isExtracted(round)) acc.totalExtracted += 1;
    else acc.totalDied += 1;
    acc.totalTimeMs += numberOrZero(round.durationMs);
    acc.totalValueExtracted += numberOrZero(round.valueExtracted);
    acc.totalValueBroughtIn += numberOrZero(round.valueBroughtIn);
    acc.totalNetValue += numberOrZero(round.netValue);
    acc.totalArcKills += numberOrZero(round.arcKills);
    acc.totalPlayerKills += numberOrZero(round.playerKills);
    acc.totalKills += numberOrZero(round.kills);
    acc.totalDamage += numberOrZero(round.damage);
    acc.totalContainersLooted += numberOrZero(round.containersLooted);
    return acc;
  }, {
    totalRounds: 0,
    totalExtracted: 0,
    totalDied: 0,
    totalTimeMs: 0,
    totalValueExtracted: 0,
    totalValueBroughtIn: 0,
    totalNetValue: 0,
    totalArcKills: 0,
    totalPlayerKills: 0,
    totalKills: 0,
    totalDamage: 0,
    totalContainersLooted: 0,
  });

  const maps = new Map();
  for (const round of normalized) {
    const key = round.mapTargetId ?? round.mapName ?? 'unknown';
    const row = maps.get(key) || {
      mapTargetId: round.mapTargetId ?? null,
      mapName: round.mapName ?? 'Unknown',
      raids: 0,
      extracted: 0,
      totalDurationMs: 0,
      totalNetValue: 0,
    };
    row.raids += 1;
    if (isExtracted(round)) row.extracted += 1;
    row.totalDurationMs += numberOrZero(round.durationMs);
    row.totalNetValue += numberOrZero(round.netValue);
    maps.set(key, row);
  }

  return {
    ...totals,
    ...deriveRates(totals),
    rounds: normalized,
    topWeapons: normalizeTopWeapons([], normalized),
    arcEnemiesByType: normalizeTopEnemies([], normalized),
    mapPerformance: normalizeMapPerformance({ maps: Array.from(maps.values()) }).maps,
  };
}

export function normalizeTopWeapons(dedicatedWeapons = [], rounds = []) {
  const map = new Map();
  const add = (name, patch = {}) => {
    if (!name) return;
    const key = String(name).toLowerCase();
    const prev = map.get(key) || { name, count: 0, kills: 0, damage: 0, itemId: null, weaponAssetId: null };
    prev.name = prev.name || name;
    prev.count += numberOrZero(patch.count ?? patch.kills);
    prev.kills += numberOrZero(patch.kills ?? patch.count);
    prev.damage += numberOrZero(patch.damage ?? patch.amount);
    prev.itemId = prev.itemId ?? patch.itemId ?? patch.item_id ?? null;
    prev.weaponAssetId = prev.weaponAssetId ?? patch.weaponAssetId ?? patch.weapon_asset_id ?? patch.targetId ?? null;
    map.set(key, prev);
  };

  const dedicated = Array.isArray(dedicatedWeapons)
    ? dedicatedWeapons.filter(Boolean)
    : [];
  for (const weapon of dedicated) add(weapon?.name, weapon);
  if (dedicated.length === 0) {
    for (const round of normalizeRounds(rounds || [])) {
      for (const row of round.killsBreakdownByWeapon || []) add(row.targetName, { kills: row.amount, targetId: row.targetId });
      for (const row of round.damageBreakdownByWeapon || []) add(row.targetName, { damage: row.amount, targetId: row.targetId });
      for (const row of round.weaponDamageBreakdown || []) add(row.weaponName || row.name, { damage: row.amount ?? row.damage });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => (numberOrZero(b.count || b.kills) - numberOrZero(a.count || a.kills)) || (numberOrZero(b.damage) - numberOrZero(a.damage)))
    .slice(0, 10);
}

export function normalizeTopEnemies(dedicatedEnemies = [], rounds = []) {
  const map = new Map();
  const add = (name, patch = {}) => {
    if (!name || name === 'Player') return;
    const key = String(name).toLowerCase();
    const prev = map.get(key) || { name, count: 0, kills: 0, damage: 0, targetId: null };
    prev.count += numberOrZero(patch.count ?? patch.kills);
    prev.kills += numberOrZero(patch.kills ?? patch.count);
    prev.damage += numberOrZero(patch.damage ?? patch.amount);
    prev.targetId = prev.targetId ?? patch.targetId ?? patch.target_id ?? null;
    map.set(key, prev);
  };

  const dedicated = Array.isArray(dedicatedEnemies)
    ? dedicatedEnemies.filter(Boolean)
    : [];
  for (const enemy of dedicated) add(enemy?.name, enemy);
  if (dedicated.length === 0) {
    for (const round of normalizeRounds(rounds || [])) {
      for (const row of round.killsBreakdownByEnemy || []) add(row.targetName, { kills: row.amount, targetId: row.targetId });
      for (const row of round.damageBreakdownByEnemy || []) add(row.targetName, { damage: row.amount, targetId: row.targetId });
      for (const row of round.arcBreakdown || []) add(row.targetName || row.name, { kills: row.kills, damage: row.damage, targetId: row.targetId });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => (numberOrZero(b.count || b.kills) - numberOrZero(a.count || a.kills)) || (numberOrZero(b.damage) - numberOrZero(a.damage)))
    .slice(0, 20);
}

export function buildWeaponDamageStats(weaponTier = {}, shieldType = 'medium', headshot = false) {
  const shield = SHIELD_PROFILES[shieldType] || SHIELD_PROFILES.medium;
  const damagePerShot = numberOrZero(weaponTier.damage) * numberOrZero(weaponTier.bulletsPerShot, 1);
  const headshotDamage = damagePerShot * numberOrZero(weaponTier.hsMultiplier, 1);
  const appliedDamage = headshot ? headshotDamage : damagePerShot;
  const roundsPerShot = numberOrZero(weaponTier.roundsPerShot, 1) || 1;
  const magShots = Math.floor(numberOrZero(weaponTier.magSize) / roundsPerShot);
  const cycleTime = numberOrZero(weaponTier.magDumpTime) + numberOrZero(weaponTier.reloadTime);
  const dps = cycleTime > 0 ? (damagePerShot * magShots) / cycleTime : 0;
  const shieldBreakShots = appliedDamage > 0 ? Math.ceil(shield.charge / appliedDamage) : Infinity;
  const damageAfterShield = shieldBreakShots * appliedDamage * (1 - shield.deflection);
  const bodyShotsAfterShield = damageAfterShield >= 100 ? 0 : Math.ceil((100 - damageAfterShield) / appliedDamage);
  const shotsToKill = shieldBreakShots + bodyShotsAfterShield;
  const fireRate = numberOrZero(weaponTier.fireRate);
  const reloads = magShots > 0 ? Math.floor((shotsToKill - 1) / magShots) : 0;
  const ttk = fireRate > 0
    ? numberOrZero(weaponTier.prefireDelay) + (shotsToKill - 1) / fireRate + reloads * numberOrZero(weaponTier.reloadTime)
    : Infinity;
  return {
    damagePerShot,
    headshotDamage,
    dps: Number(dps.toFixed(2)),
    shotsToKill,
    timeToKill: Number(ttk.toFixed(3)),
    magDamage: damagePerShot * magShots,
  };
}

export function canonicalTotalsFromOverview(overview = {}) {
  const perf = overview.performance_analytics || overview.performance || {};
  const combat = overview.combat_detailed || overview.combat || {};
  const scav = overview.scavenging_and_world || {};
  const econ = overview.wallet_and_economy || overview.economy || {};
  const totals = overview.totals || overview.stats || {};
  return {
    totalRounds: firstNumber(totals.totalRounds, perf.total_rounds, perf.totalRounds, perf.totalRounds),
    totalExtracted: firstNumber(totals.totalExtracted, perf.successful_raids, perf.successfulRaids, overview.successfulExtractions),
    totalDied: firstNumber(totals.totalDied, perf.deaths, perf.totalDied),
    totalTimeMs: firstNumber(totals.totalTimeMs, numberOrZero(perf.time_topside_seconds) * 1000, numberOrZero(perf.timeTopsideSeconds) * 1000),
    totalValueExtracted: firstNumber(totals.totalValueExtracted, totals.lootValue, overview.totalValueExtracted),
    totalValueBroughtIn: firstNumber(totals.totalValueBroughtIn, totals.loadoutValue, overview.totalValueBroughtIn),
    totalNetValue: firstNumber(totals.totalNetValue, econ.net_profit_career, econ.netProfit, overview.netProfit),
    totalArcKills: firstNumber(totals.totalArcKills, combat.arc_kills_total, combat.total_arc_kills, combat.arcKills, overview.arcKills),
    totalPlayerKills: firstNumber(totals.totalPlayerKills, combat.player_kills, combat.playerKills, overview.playerKills),
    totalKills: firstNumber(totals.totalKills, combat.kills, perf.arcKillsTotal),
    totalDamage: firstNumber(totals.totalDamage, combat.damage_dealt_total, combat.damageDealt, overview.totalDamage),
    totalContainersLooted: firstNumber(totals.totalContainersLooted, scav.totalContainersLooted, scav.containersLooted, scav.containers_looted, overview.totalContainersLooted, overview.containersLooted),
  };
}

export function finalizeStatsOverview(overview = {}) {
  const totals = canonicalTotalsFromOverview(overview);
  if (!totals.totalKills) totals.totalKills = numberOrZero(totals.totalArcKills) + numberOrZero(totals.totalPlayerKills);
  if (!totals.totalDied && totals.totalRounds && totals.totalExtracted) {
    totals.totalDied = Math.max(totals.totalRounds - totals.totalExtracted, 0);
  }
  const derived = deriveRates(totals);
  const topWeapons = normalizeTopWeapons(overview.topWeapons || overview.weapons || overview.weaponKills?.weapons || [], overview.recentRounds || []);
  const enemies = normalizeTopEnemies(overview.enemies || overview.enemyKills?.enemies || [], overview.recentRounds || []);
  const maps = normalizeMapPerformance({ maps: overview.mapPerformance?.maps || overview.map_specific_data || overview.maps || [] }).maps;

  return {
    ...overview,
    canonicalStats: {
      ...totals,
      ...derived,
      topWeapons,
      arcEnemiesByType: enemies,
      mapPerformance: maps,
    },
    totals: {
      ...(overview.totals || {}),
      ...totals,
    },
    derived: {
      ...(overview.derived || {}),
      ...derived,
    },
    performance_analytics: {
      ...(overview.performance_analytics || {}),
      total_rounds: totals.totalRounds,
      successful_raids: totals.totalExtracted,
      survival_rate: derived.survivalRate,
      time_topside_seconds: Math.floor(numberOrZero(totals.totalTimeMs) / 1000),
      avg_damage_per_round: derived.damagePerRound,
    },
    combat_detailed: {
      ...(overview.combat_detailed || {}),
      player_kills: totals.totalPlayerKills,
      arc_kills_total: totals.totalArcKills,
      total_arc_kills: totals.totalArcKills,
      damage_dealt_total: totals.totalDamage,
      enemies,
    },
    scavenging_and_world: {
      ...(overview.scavenging_and_world || {}),
      totalContainersLooted: totals.totalContainersLooted,
      containersLooted: totals.totalContainersLooted,
      containers_looted: totals.totalContainersLooted,
    },
    performance: {
      ...(overview.performance || {}),
      survivalRate: derived.survivalRate,
      totalRounds: totals.totalRounds,
      successfulRaids: totals.totalExtracted,
      timeTopsideSeconds: Math.floor(numberOrZero(totals.totalTimeMs) / 1000),
      arcKillsTotal: totals.totalKills,
    },
    combat: {
      ...(overview.combat || {}),
      kills: totals.totalKills,
      arcKills: totals.totalArcKills,
      playerKills: totals.totalPlayerKills,
      damageDealt: totals.totalDamage,
    },
    topWeapons,
    enemies,
    mapPerformance: { maps },
  };
}

export function getDisplayStat(source, statKey, fallback = NOT_AVAILABLE) {
  const spec = STATS[statKey] || COMPUTED_STATS[statKey] || ROUND_FIELDS[statKey] || PROFILE_FIELDS[statKey] || CURRENCY_FIELDS[statKey];
  if (!spec) return fallback;
  const value = getPath(source, spec.source || statKey, undefined);
  return value === undefined || value === null ? fallback : value;
}

export {
  ARCTRACKER_STAT_ROUTES,
  fetchArcTrackerRoute,
  fetchAllArcTrackerStats,
  normalizeArcTrackerStats,
};
