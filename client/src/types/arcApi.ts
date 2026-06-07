/**
 * arcApi.ts — Canonical TypeScript types for all ARC Raiders API sources.
 *
 * Sources:
 *   - ArcTracker.io v2 dual-key authenticated user endpoints
 *   - MetaForge.app/api/arc-raiders public game catalog endpoints
 *   - arc_api_rs StatBlock model (https://docs.rs/arc_api_rs/latest/arc_api_rs/models/items/struct.StatBlock.html)
 *   - SHiESTY full_data_schema (ALL RETURNS schema)
 */

// ─── arc_api_rs StatBlock ─────────────────────────────────────────────────────
// Direct mapping from the Rust struct returned by MetaForge /api/arc-raiders/items
export interface StatBlock {
  // Weapons
  damage?: number;
  damage_type?: string;
  fire_rate?: number; // rounds per minute
  mag_size?: number; // magazine capacity
  reload_time?: number; // seconds
  range?: number;
  handling?: number;
  accuracy?: number;
  recoil?: number;
  headshot_multiplier?: number;
  pellet_count?: number; // shotgun pellets
  charge_time?: number; // charged weapons
  burst_count?: number; // burst fire count
  projectile_speed?: number;
  effective_range?: number;
  // Shields
  shield_capacity?: number;
  shield_regen_delay?: number;
  shield_regen_rate?: number;
  // Armor
  armor_rating?: number;
  damage_reduction?: number;
  // Generic
  weight?: number;
  durability?: number;
  stack_size?: number;
  // Ammo
  ammo_capacity?: number;
  ammo_type?: string;
  // Misc
  [key: string]: unknown;
}

// ─── MetaForge Item (arc_api_rs Item struct) ──────────────────────────────────
export interface MfItem {
  id: string;
  game_asset_id: number;
  name: string;
  description?: string;
  flavor_text?: string;
  item_type: string; // "Weapon", "Armor", "Material", etc.
  subcategory?: string;
  rarity: string; // "Common", "Uncommon", "Rare", "Epic", "Legendary"
  value: number; // vendor sell value in credits
  workbench?: string;
  loadout_slots: string[];
  shield_type?: string;
  loot_area?: string;
  ammo_type?: string;
  stat_block: StatBlock;
  sources?: unknown;
  locations: unknown[];
  guide_links: unknown[];
  icon: string; // URI to item icon image
  created_at: string;
  updated_at: string;
}

// ─── MetaForge ARC (enemy/machine) ───────────────────────────────────────────
export interface MfArc {
  id: string;
  name: string;
  icon?: string;
  image?: string;
  description?: string;
  loot?: MfItem[]; // present when includeLoot=true
  [key: string]: unknown;
}

// ─── MetaForge Quest ──────────────────────────────────────────────────────────
export interface MfQuestItem {
  id: string;
  name: string;
  quantity: number;
}

export interface MfQuest {
  id: string;
  name: string;
  description?: string;
  trader?: string;
  required_items?: MfQuestItem[];
  rewards?: MfQuestItem[];
  [key: string]: unknown;
}

// ─── MetaForge Trader ─────────────────────────────────────────────────────────
export interface MfTrader {
  name: string;
  items: MfItem[];
}

// ─── MetaForge Event Timer ────────────────────────────────────────────────────
export interface MfEventTimer {
  game: string;
  name: string;
  map: string;
  icon?: string;
  description?: string;
  days?: string[];
  times: string[];
}

// ─── MetaForge Weekly Trials ─────────────────────────────────────────────────
export interface MfTrialEntry {
  rank: number;
  id?: string;
  metaforge_id?: string;
  username: string;
  score: number;
}

export interface MfWeeklyTrials {
  id?: string;
  name?: string;
  leaderboard?: MfTrialEntry[];
  entries?: MfTrialEntry[];
  activeWindowEnd?: string | null;
  nextWindowStart?: string | null;
}

// ─── MetaForge Pagination ─────────────────────────────────────────────────────
export interface MfPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface MfPagedResponse<T> {
  data: T[];
  pagination: MfPagination;
}

// ─── ArcTracker v2 User Types ─────────────────────────────────────────────────

/** GET /api/v2/user/profile */
export interface ArcTrackerProfile {
  userId: string;
  username: string;
  playerLevel: number;
  memberSince: string; // ISO date string
}

/** Item attachment on a stash item or loadout weapon */
export interface ArcTrackerAttachment {
  itemId: string;
  name: string;
  quantity: number;
  slotIndex: number;
  durabilityPercent: number;
}

/** Single item in the stash */
export interface ArcTrackerStashItem {
  itemId: string;
  name: string;
  quantity: number;
  slotIndex: number;
  durabilityPercent: number;
  attachments?: ArcTrackerAttachment[];
  // Enriched fields (added by ArcTracker)
  rarity?: string;
  value?: number;
  weight?: number;
  type?: string;
}

/** GET /api/v2/user/stash */
export interface ArcTrackerStash {
  items: ArcTrackerStashItem[];
  currencies?: {
    credits?: number;
    creds?: number;
    tokens?: number;
    raiders_tokens?: number;
    coins?: number;
    currencies?: number;
    raider_tokens?: number;
    merits?: number;
  };
  slots?: {
    used: number;
    total: number;
  };
  pagination?: {
    page: number;
    per_page: number;
    total: number;
  };
  syncedAt?: string;
}

/** Single loadout slot weapon */
export interface ArcTrackerWeapon {
  itemId: string;
  name: string;
  quantity: number;
  slotIndex: number;
  durabilityPercent: number;
  attachments?: ArcTrackerAttachment[];
  weaponLevel?: number;
}

/** GET /api/v2/user/loadout */
export interface ArcTrackerLoadout {
  augment?: ArcTrackerStashItem;
  shield?: ArcTrackerStashItem;
  weapon1?: ArcTrackerWeapon;
  weapon2?: ArcTrackerWeapon;
  backpack?: ArcTrackerStashItem[];
  quickItems?: ArcTrackerStashItem[];
  safePocket?: ArcTrackerStashItem[];
  augmentedSlots?: ArcTrackerStashItem[];
  slotCounts?: {
    backpack: number;
    quickItems: number;
    safePocket: number;
    augmentedSlots: number;
  };
  syncedAt?: string;
}

/** Single quest entry */
export interface ArcTrackerQuest {
  id: string;
  name: string;
  trader: string;
  completed: boolean;
}

/** GET /api/v2/user/quests */
export interface ArcTrackerQuests {
  quests: ArcTrackerQuest[];
  summary?: {
    total: number;
    completed: number;
    incomplete: number;
  };
}

/** Single hideout module */
export interface ArcTrackerHideoutModule {
  id: string;
  name: string;
  currentLevel: number;
  maxLevel: number;
}

/** GET /api/v2/user/hideout */
export interface ArcTrackerHideout {
  modules: ArcTrackerHideoutModule[];
  syncedAt?: string;
}

/** Single project phase */
export interface ArcTrackerProjectPhase {
  name: string;
  completed: boolean;
}

/** Single project */
export interface ArcTrackerProject {
  id: string;
  name: string;
  phases: ArcTrackerProjectPhase[];
  completedPhases: number;
  totalPhases: number;
  fullyCompleted: boolean;
}

/** GET /api/v2/user/projects */
export interface ArcTrackerProjects {
  projects: ArcTrackerProject[];
  summary?: {
    total: number;
    fullyCompleted: number;
  };
}

/** Single looted item in a round */
export interface ArcTrackerRoundLoot {
  itemId: string;
  name: string;
  quantity: number;
  value?: number;
}

/** Single round/raid entry */
export interface ArcTrackerRound {
  id?: string;
  // Outcome
  status: 'Extracted' | 'Failed' | 'Unknown' | string;
  outcome?: string; // legacy alias
  // Map
  mapName?: string;
  map?: string;
  map_name?: string;
  mapSlug?: string;
  // Economy
  netProfit?: number;
  netValue?: number; // legacy
  rdValue?: number; // legacy
  profit?: number; // legacy
  // Combat
  damageDealt?: number;
  damage?: number; // legacy
  arcKills?: number;
  playerKills?: number;
  pvpKills?: number; // legacy
  // XP
  xp?: number;
  score?: number; // legacy
  experience?: number; // legacy
  xpEarned?: number; // legacy
  // Timing
  duration?: number; // seconds
  durationMs?: number; // legacy ms
  durationSeconds?: number; // legacy
  syncedAt?: string;
  roundEndedAt?: string; // legacy
  playedAt?: string; // legacy
  timestamp?: string; // legacy
  // Season
  season?: number;
  // Loot (when screenshot attached)
  loot?: ArcTrackerRoundLoot[];
}

/** GET /api/v2/user/rounds */
export interface ArcTrackerRounds {
  rounds?: ArcTrackerRound[];
  data?: ArcTrackerRound[] | { rounds?: ArcTrackerRound[] };
  total?: number;
  offset?: number;
  limit?: number;
}

/** Single blueprint entry */
export interface ArcTrackerBlueprint {
  itemId: string;
  name: string;
  category?: string;
  learned: boolean;
  rarity?: string;
}

/** GET /api/v2/user/blueprints */
export interface ArcTrackerBlueprints {
  blueprints?: ArcTrackerBlueprint[];
  summary?: {
    total: number;
    learned: number;
    missing: number;
  };
}

// ─── Trials ───────────────────────────────────────────────────────────────────
export interface TrialPlayer {
  rank: number;
  userId: string;
  username: string;
  score: number;
  tier?: string;
  percentile?: number;
}

// ─── Unified FullPlayerStats ──────────────────────────────────────────────────
// Complete shape from the SHiESTY full_data_schema (ALL RETURNS)
// All fields optional so partial data never breaks the UI
export interface UnitBreakdown {
  wasp?: number;
  fireball?: number;
  tick?: number;
  pop?: number;
  hornet?: number;
  turret?: number;
  snitch?: number;
  firefly?: number;
  spotter?: number;
  shredder?: number;
  rocketeer?: number;
  leaper?: number;
  comet?: number;
  bastion?: number;
  bombardier?: number;
  surveyor?: number;
  sentinel?: number;
  vaporizer?: number;
  [unit: string]: number | undefined;
}

export interface MapStatEntry {
  map_id?: string;
  map_name?: string;
  mapName?: string;
  survival_rate?: number;
  rounds_played?: number;
  time_topside?: number;
  net_profit?: number;
  avg_profit?: number;
  // ArcTracker shape aliases
  total_raids?: number;
  success_rate?: number;
  total_profit?: number;
}

export interface FullPlayerStats {
  // ── Identity ─────────────────────────────
  embarkId?: string;
  displayName?: string;
  username?: string;
  metaforgeId?: string;
  level?: number;
  xp?: number;
  totalXp?: number;
  xpForNextLevel?: number;
  xpProgressPercent?: number;
  memberSince?: string;

  // ── Wallet & Economy ─────────────────────
  credits?: number;
  tokens?: number;
  raider_tokens?: number;
  currencies?: number;
  coins?: number;
  stashValue?: number;
  netProfitCareer?: number;
  avgProfitPerRound?: number;
  lootEfficiencyPerMin?: number;
  activeListings?: number;

  // ── Slot counts ──────────────────────────
  stashSlotsTotal?: number;
  stashSlotsUsed?: number;

  // ── Performance ──────────────────────────
  totalRaids?: number;
  successfulExtractions?: number;
  extractionRate?: number;
  survivalRate?: number;
  kdRatio?: number;
  totalKills?: number;
  arcKills?: number;
  playerKills?: number;
  playerDowns?: number;
  timeTopsideSeconds?: number;
  scoreTotal?: number;
  avgDamagePerRound?: number;

  // ── Combat Detailed ───────────────────────
  damageDealtTotal?: number;
  damageReceivedTotal?: number;
  healthRestoredTotal?: number;
  revivesGiven?: number;
  revivesReceived?: number;
  shieldDamage?: number;
  armorDamage?: number;
  unitBreakdown?: UnitBreakdown;

  // ── Accuracy / Weapon ─────────────────────
  accuracy?: number;
  shotsFired?: number;
  shotsHit?: number;
  headshotPercentage?: number;
  weakpointHits?: number;
  longestKillDistance?: number;
  meleeKills?: number;
  favoriteWeapon?: string;
  weapons?: Record<string, { kills: number }>;

  // ── Scavenging & World ────────────────────
  containersLooted?: number;
  rareContainersFound?: number;
  vaultsBreached?: number;
  keysConsumed?: number;
  lockedDoorsOpened?: number;
  industrialBinsOpened?: number;
  itemsScrappedCount?: number;
  itemsExtractedCount?: number;

  // ── Map Performance ───────────────────────
  mapPerformance?: MapStatEntry[];

  // ── Progression ───────────────────────────
  blueprintsUnlocked?: number;
  nodesUnlocked?: number;
  workbenchLevels?: Record<string, number>;
  facilityLevels?: Record<string, number>;
  skillTree?: { combat?: string[]; tech?: string[]; survival?: string[] };

  // ── Shiesty Calculated ────────────────────
  raidEfficiency?: number; // $/min
  demonStreak?: number; // max extraction streak
  maxExtractionStreak?: number;
  blackMarketValue?: number; // stashValue * 0.85
  extractionsUnderFire?: number;

  // ── Storefront ────────────────────────────
  storefrontName?: string;
  storefrontDescription?: string;
  discordWebhookUrl?: boolean;

  // ── Platform / Auth ───────────────────────
  arcTrackerLinked?: boolean;
  metaforgeLinked?: boolean;
  arcTrackerUserKey?: string; // NOT stored in state, only used for API calls
}
