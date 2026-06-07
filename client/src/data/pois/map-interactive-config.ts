/**
 * map-interactive-config.ts — Per-map difficulty modes and POI category groups.
 * Adapted from pois/maps2/map-interactive-config.ts
 */

import type { Difficulty, PoiCategory } from './poi-types';

export type MapDifficulty = {
  id: Difficulty;
  label: string;
  color?: string;
};

export type PoiSubcategoryDef = {
  key: string;
  displayName: string;
  active: boolean;
};

export type CategoryGroupDef = {
  id: string;
  label: string;
  categories: PoiCategory[];
  subcategories: PoiSubcategoryDef[];
};

export const DEFAULT_DIFFICULTIES: MapDifficulty[] = [
  { id: 'Normal', label: 'Normal' },

  { id: 'Night Raid', label: 'Night Raid', color: '#60a5fa' },
  {
    id: 'Electromagnetic Storm',
    label: 'Electromagnetic Storm',
    color: '#a855f7',
  },
  { id: 'Hurricane', label: 'Hurricane', color: '#38bdf8' },
  { id: 'Close Scrutiny', label: 'Close Scrutiny', color: '#22d3ee' },

  { id: 'Hidden Bunker', label: 'Hidden Bunker', color: '#0f766e' },
  { id: 'Locked Gate', label: 'Locked Gate', color: '#92400e' },
  { id: 'Beachcombing', label: 'Beachcombing', color: '#fbbf24' },
  { id: 'Bird City', label: 'Bird City', color: '#f97316' },
  { id: 'Launch Tower Loot', label: 'Launch Tower Loot', color: '#fb923c' },

  { id: 'Harvester', label: 'Harvester', color: '#ea580c' },
  { id: 'Husk Graveyard', label: 'Husk Graveyard', color: '#78716c' },
  { id: 'Lush Blooms', label: 'Lush Blooms', color: '#4ade80' },
  { id: 'Matriarch', label: 'Matriarch', color: '#dc2626' },
  { id: 'Prospecting Probes', label: 'Prospecting Probes', color: '#f59e0b' },
  { id: 'Uncovered Caches', label: 'Uncovered Caches', color: '#facc15' },
];

export const MAP_DIFFICULTIES: Record<string, MapDifficulty[]> = {
  'dam-battlegrounds': [
    { id: 'Normal', label: 'Normal' },

    { id: 'Night Raid', label: 'Night Raid', color: '#60a5fa' },
    {
      id: 'Electromagnetic Storm',
      label: 'Electromagnetic Storm',
      color: '#a855f7',
    },
    { id: 'Hurricane', label: 'Hurricane', color: '#38bdf8' },
    { id: 'Close Scrutiny', label: 'Close Scrutiny', color: '#22d3ee' },

    { id: 'Harvester', label: 'Harvester', color: '#ea580c' },
    { id: 'Husk Graveyard', label: 'Husk Graveyard', color: '#78716c' },
    { id: 'Lush Blooms', label: 'Lush Blooms', color: '#4ade80' },
    { id: 'Matriarch', label: 'Matriarch', color: '#dc2626' },
    { id: 'Prospecting Probes', label: 'Prospecting Probes', color: '#f59e0b' },
    { id: 'Uncovered Caches', label: 'Uncovered Caches', color: '#facc15' },
  ],

  'buried-city': [
    { id: 'Normal', label: 'Normal' },

    { id: 'Night Raid', label: 'Night Raid', color: '#60a5fa' },
    { id: 'Hurricane', label: 'Hurricane', color: '#38bdf8' },
    { id: 'Close Scrutiny', label: 'Close Scrutiny', color: '#22d3ee' },

    { id: 'Bird City', label: 'Bird City', color: '#f97316' },
    { id: 'Husk Graveyard', label: 'Husk Graveyard', color: '#78716c' },
    { id: 'Lush Blooms', label: 'Lush Blooms', color: '#4ade80' },
    { id: 'Prospecting Probes', label: 'Prospecting Probes', color: '#f59e0b' },
    { id: 'Uncovered Caches', label: 'Uncovered Caches', color: '#facc15' },
  ],

  spaceport: [
    { id: 'Normal', label: 'Normal' },

    { id: 'Night Raid', label: 'Night Raid', color: '#60a5fa' },
    {
      id: 'Electromagnetic Storm',
      label: 'Electromagnetic Storm',
      color: '#a855f7',
    },
    { id: 'Hurricane', label: 'Hurricane', color: '#38bdf8' },
    { id: 'Close Scrutiny', label: 'Close Scrutiny', color: '#22d3ee' },
    { id: 'Hidden Bunker', label: 'Hidden Bunker', color: '#0f766e' },

    { id: 'Harvester', label: 'Harvester', color: '#ea580c' },
    { id: 'Husk Graveyard', label: 'Husk Graveyard', color: '#78716c' },
    { id: 'Launch Tower Loot', label: 'Launch Tower Loot', color: '#fb923c' },
    { id: 'Lush Blooms', label: 'Lush Blooms', color: '#4ade80' },
    { id: 'Matriarch', label: 'Matriarch', color: '#dc2626' },
    { id: 'Prospecting Probes', label: 'Prospecting Probes', color: '#f59e0b' },
    { id: 'Uncovered Caches', label: 'Uncovered Caches', color: '#facc15' },
  ],

  'blue-gate': [
    { id: 'Normal', label: 'Normal' },

    { id: 'Night Raid', label: 'Night Raid', color: '#60a5fa' },
    {
      id: 'Electromagnetic Storm',
      label: 'Electromagnetic Storm',
      color: '#a855f7',
    },
    { id: 'Hurricane', label: 'Hurricane', color: '#38bdf8' },
    { id: 'Locked Gate', label: 'Locked Gate', color: '#92400e' },

    { id: 'Harvester', label: 'Harvester', color: '#ea580c' },
    { id: 'Husk Graveyard', label: 'Husk Graveyard', color: '#78716c' },
    { id: 'Lush Blooms', label: 'Lush Blooms', color: '#4ade80' },
    { id: 'Matriarch', label: 'Matriarch', color: '#dc2626' },
    { id: 'Prospecting Probes', label: 'Prospecting Probes', color: '#f59e0b' },
    { id: 'Uncovered Caches', label: 'Uncovered Caches', color: '#facc15' },
  ],

  'stella-montis': [
    { id: 'Normal', label: 'Normal' },
    { id: 'Night Raid', label: 'Night Raid', color: '#60a5fa' },
  ],

  'riven-tides': [
    { id: 'Normal', label: 'Normal' },

    { id: 'Night Raid', label: 'Night Raid', color: '#60a5fa' },
    { id: 'Beachcombing', label: 'Beachcombing', color: '#fbbf24' },
    { id: 'Prospecting Probes', label: 'Prospecting Probes', color: '#f59e0b' },
    { id: 'Uncovered Caches', label: 'Uncovered Caches', color: '#facc15' },
  ],
};

export function getDifficultiesForMap(mapId: string): MapDifficulty[] {
  return MAP_DIFFICULTIES[mapId] ?? DEFAULT_DIFFICULTIES;
}

export const CONTAINER_SUBCATEGORIES: PoiSubcategoryDef[] = [
  { key: 'weapon_case', displayName: 'Weapon Case', active: false },
  { key: 'med_crate', displayName: 'Med Crate', active: false },
  { key: 'ammo_crate', displayName: 'Ammo Crate', active: false },
  {
    key: 'breachable_container',
    displayName: 'Breachable Container',
    active: false,
  },
  { key: 'raider_cache', displayName: 'Raider Cache', active: false },
  { key: 'hurricane_cache', displayName: 'Hurricane Cache', active: true },
  { key: 'combat_supplies', displayName: 'Combat Supplies', active: true },
  { key: 'base_container', displayName: 'Container', active: false },
  { key: 'utility_crate', displayName: 'Grenade Tube', active: false },
  { key: 'car', displayName: 'Cars', active: false },
  { key: 'locker', displayName: 'Lockers', active: false },
  { key: 'box', displayName: 'Boxes', active: false },
  { key: 'basket', displayName: 'Baskets', active: false },
  { key: 'bag', displayName: 'Bags', active: false },
  { key: 'baron_husk', displayName: 'Baron Husk', active: false },
  { key: 'arc_husk', displayName: 'Arc Husk', active: false },
  { key: 'wasp_husk', displayName: 'Wasp Husk', active: false },
  { key: 'rocketeer_husk', displayName: 'Rocketeer Husk', active: false },
  { key: 'arc_courier', displayName: 'Arc Courier', active: false },
  { key: 'arc_probe', displayName: 'Arc Probe', active: false },
  { key: 'security_breach', displayName: 'Security Breach', active: false },
  { key: 'android', displayName: 'Android', active: false },
];

export const ARC_SUBCATEGORIES: PoiSubcategoryDef[] = [
  { key: 'tick', displayName: 'Tick', active: false },
  { key: 'pop', displayName: 'Pop', active: false },
  { key: 'fireball', displayName: 'Fireball', active: false },
  { key: 'rollbot', displayName: 'Surveyor', active: false },
  { key: 'comet', displayName: 'Comet', active: false },
  { key: 'firefly', displayName: 'Firefly', active: false },
  { key: 'spotter', displayName: 'Spotter', active: false },
  { key: 'turret', displayName: 'Turret', active: false },
  { key: 'sentinel', displayName: 'Sentinel', active: false },
  { key: 'snitch', displayName: 'Snitch', active: false },
  { key: 'wasp', displayName: 'Wasp', active: false },
  { key: 'hornet ', displayName: 'Hornet', active: false },
  { key: 'vaporizer', displayName: 'Vaporizer', active: false },
  { key: 'shredder', displayName: 'Shredder', active: false },
  { key: 'bison', displayName: 'Leaper', active: true },
  { key: 'rocketeer', displayName: 'Rocketeer', active: false },
  { key: 'bombardier', displayName: 'Bombardier', active: true },
  { key: 'bastion', displayName: 'Bastion', active: true },
  { key: 'queen', displayName: 'Queen', active: true },
  { key: 'turbine', displayName: 'Turbine', active: true },
  { key: 'matriarch', displayName: 'Matriarch', active: false },
];

export const LOCATION_SUBCATEGORIES: PoiSubcategoryDef[] = [
  { key: 'button', displayName: 'Button', active: true },
  { key: 'fuel-cell', displayName: 'Fuel Cell', active: true },
  { key: 'extraction', displayName: 'Extraction Point', active: true },
  { key: 'hatch', displayName: 'Hatch Extraction', active: true },
  { key: 'player_spawn', displayName: 'Player Spawn', active: true },
  { key: 'supply_station', displayName: 'Supply Call Station', active: true },
  { key: 'field_depot', displayName: 'Field Depot', active: true },
  { key: 'field_crate', displayName: 'Field Crate', active: true },
  { key: 'metro_station', displayName: 'Metro Station', active: true },
  { key: 'metro_entrance', displayName: 'Metro Entrance', active: true },
  { key: 'locked_room', displayName: 'Key room', active: true },
  { key: 'breach_room', displayName: 'Breach Room', active: true },
  { key: 'raider_camp', displayName: 'Raider Camp', active: true },
];

export const NATURE_SUBCATEGORIES: PoiSubcategoryDef[] = [
  { key: 'olive', displayName: 'Olive', active: false },
  { key: 'lemons', displayName: 'Lemons', active: false },
  { key: 'mushroom', displayName: 'Mushroom', active: false },
  { key: 'prickly-pear', displayName: 'Prickly Pear', active: false },
  { key: 'great-mullein', displayName: 'Great Mullein', active: false },
  { key: 'agave', displayName: 'Agave', active: false },
  { key: 'apricot', displayName: 'Apricot', active: false },
  { key: 'moss', displayName: 'Moss', active: false },
  { key: 'fertilizer', displayName: 'Fertilizer', active: false },
  { key: 'roots', displayName: 'Roots', active: false },
  { key: 'candleberries', displayName: 'Candleberries', active: false },
];

export const EVENT_SUBCATEGORIES: PoiSubcategoryDef[] = [
  { key: 'antenna', displayName: 'Antenna', active: true },
  { key: 'bunker', displayName: 'Hidden Bunker', active: true },
  { key: 'bird', displayName: 'Bird Nest', active: false },
  { key: 'harvester', displayName: 'Harvester', active: true },
  { key: 'snow_pile', displayName: 'Snow Pile', active: false },
  { key: 'locked_gate_key', displayName: 'Locked Gate Key', active: true },
  { key: 'puzzle_button', displayName: 'Puzzle Button', active: true },
  { key: 'mine', displayName: 'Mine', active: true },
  { key: 'assessor', displayName: 'Assessor', active: false },
  { key: 'ship_model', displayName: 'Ship Model', active: true },
  { key: 'dig_spot', displayName: 'Dig Spot', active: true },
];

export const QUEST_SUBCATEGORIES: PoiSubcategoryDef[] = [];

export const ALL_POI_CATEGORIES: PoiCategory[] = [
  'extract',
  'key',
  'quest',
  'area',
  'container',
  'loot',
  'arc',
  'nature',
  'interaction',
  'noise',
];

export const CATEGORY_GROUPS: CategoryGroupDef[] = [
  {
    id: 'locations',
    label: 'Locations',
    categories: ['extract', 'key', 'quest', 'area'],
    subcategories: LOCATION_SUBCATEGORIES,
  },
  {
    id: 'containers',
    label: 'Containers',
    categories: ['container', 'loot'],
    subcategories: CONTAINER_SUBCATEGORIES,
  },
  {
    id: 'arc',
    label: 'Arc',
    categories: ['arc'],
    subcategories: ARC_SUBCATEGORIES,
  },
  {
    id: 'nature',
    label: 'Nature',
    categories: ['nature'],
    subcategories: NATURE_SUBCATEGORIES,
  },
  {
    id: 'events',
    label: 'Events',
    categories: ['interaction', 'noise'],
    subcategories: EVENT_SUBCATEGORIES,
  },
  {
    id: 'quests',
    label: 'Quests',
    categories: ['quest'],
    subcategories: QUEST_SUBCATEGORIES,
  },
];

export const DEFAULT_ACTIVE_CATEGORIES: ReadonlySet<PoiCategory> =
  new Set<PoiCategory>([
    'extract',
    'key',
    'quest',
    'area',
  ]);
