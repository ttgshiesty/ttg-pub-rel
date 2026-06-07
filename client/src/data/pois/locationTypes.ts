/**
 * locationTypes.ts — Complete location type registry matching arcraidersmaps.app.
 * All 79 location types grouped into 6 categories with asset-hosted SVG icons.
 */

const ASSET_BASE = (
  import.meta.env.VITE_ASSETS_URL || 'https://assets.shiesty.me'
).replace(/\/$/, '');
const ICON = (name: string) => `${ASSET_BASE}/maps/icons/${name}.svg`;

/* ── Category definitions ────────────────────────────────────────────────── */

export type FilterCategory =
  | 'containers'
  | 'locations'
  | 'nature'
  | 'arc'
  | 'events'
  | 'puzzles';

export type CategoryDef = {
  id: FilterCategory;
  title: string;
  color: string;
};

export const FILTER_CATEGORIES: CategoryDef[] = [
  { id: 'containers', title: 'containers', color: '#06F6F6' },
  { id: 'locations', title: 'locations', color: '#808080' },
  { id: 'nature', title: 'nature', color: '#008000' },
  { id: 'arc', title: 'arc', color: '#A60A0A' },
  { id: 'events', title: 'events', color: '#232FB1' },
  { id: 'puzzles', title: 'puzzles', color: '#800080' },
];

export const CATEGORY_COLOR: Record<FilterCategory, string> = {
  containers: '#06F6F6',
  locations: '#808080',
  nature: '#008000',
  arc: '#A60A0A',
  events: '#232FB1',
  puzzles: '#800080',
};

/* ── Individual location type definition ─────────────────────────────────── */

export type LocationTypeDef = {
  id: string;
  title: string;
  category: FilterCategory;
  iconUrl: string;
};

/* ── Containers ──────────────────────────────────────────────────────────── */

const CONTAINERS: LocationTypeDef[] = [
  {
    id: 'weapon_case',
    title: 'Weapon Case',
    category: 'containers',
    iconUrl: ICON('weapon_case'),
  },
  {
    id: 'med_bag',
    title: 'Med Bag',
    category: 'containers',
    iconUrl: ICON('med_bag'),
  },
  {
    id: 'utily_crate',
    title: 'Grenade Tube',
    category: 'containers',
    iconUrl: ICON('utility_crate'),
  },
  {
    id: 'ammo_crate',
    title: 'Ammo Crate',
    category: 'containers',
    iconUrl: ICON('ammo_crate'),
  },
  {
    id: 'backpack',
    title: 'Backpack',
    category: 'containers',
    iconUrl: ICON('container'),
  },
  {
    id: 'security_locker',
    title: 'Security Locker',
    category: 'containers',
    iconUrl: ICON('breachable_container'),
  },
  {
    id: 'baron_husk',
    title: 'Baron Husk',
    category: 'containers',
    iconUrl: ICON('baron_husk'),
  },
  {
    id: 'deforester_husk',
    title: 'Deforester Husk',
    category: 'containers',
    iconUrl: ICON('deforester_husk'),
  },
  {
    id: 'arc_husk_lg',
    title: 'Rocketeer Husk',
    category: 'containers',
    iconUrl: ICON('rocketeer_husk'),
  },
  {
    id: 'arc_husk_sm',
    title: 'Wasp Husk',
    category: 'containers',
    iconUrl: ICON('wasp_husk'),
  },
  {
    id: 'arc_courier',
    title: 'ARC Courier',
    category: 'containers',
    iconUrl: ICON('arc_courier'),
  },
  {
    id: 'crashed_arc_probe',
    title: 'Crashed Probe',
    category: 'containers',
    iconUrl: ICON('arc_probe'),
  },
  {
    id: 'arc_probe',
    title: 'Probe',
    category: 'containers',
    iconUrl: ICON('arc_probe'),
  },
  {
    id: 'bountiful_harvest_basket',
    title: 'Basket',
    category: 'containers',
    iconUrl: ICON('bountiful_harvest'),
  },
  {
    id: 'raider_cache',
    title: 'Raider Cache',
    category: 'containers',
    iconUrl: ICON('raider_cache_v2'),
  },
  {
    id: 'first_wave_cache',
    title: 'First Wave Cache',
    category: 'containers',
    iconUrl: ICON('first_wave_cache'),
  },
];

/* ── Locations ───────────────────────────────────────────────────────────── */

const LOCATIONS: LocationTypeDef[] = [
  {
    id: 'evac',
    title: 'Elevator',
    category: 'locations',
    iconUrl: ICON('airshaft'),
  },
  {
    id: 'station_evac',
    title: 'Metro',
    category: 'locations',
    iconUrl: ICON('airshaft'),
  },
  {
    id: 'airshaft',
    title: 'Airshaft',
    category: 'locations',
    iconUrl: ICON('airshaft'),
  },
  {
    id: 'infil',
    title: 'Player Spawn',
    category: 'locations',
    iconUrl: ICON('infil'),
  },
  {
    id: 'hatch',
    title: 'Hatch',
    category: 'locations',
    iconUrl: ICON('hatch'),
  },
  {
    id: 'quest',
    title: 'Quest',
    category: 'locations',
    iconUrl: ICON('quest'),
  },
  {
    id: 'project',
    title: 'Project',
    category: 'locations',
    iconUrl: ICON('quest'),
  },
  {
    id: 'supply_station',
    title: 'Supply Call Station',
    category: 'locations',
    iconUrl: ICON('supply-station'),
  },
  {
    id: 'locked_room',
    title: 'Locked Room',
    category: 'locations',
    iconUrl: ICON('locked_room'),
  },
  {
    id: 'entrance',
    title: 'Metro Entrance',
    category: 'locations',
    iconUrl: ICON('airshaft'),
  },
  {
    id: 'field_crate',
    title: 'Field Crate',
    category: 'locations',
    iconUrl: ICON('first_wave_cache'),
  },
  {
    id: 'field_depot',
    title: 'Field Depot',
    category: 'locations',
    iconUrl: ICON('first_wave_cache'),
  },
];

/* ── Nature ──────────────────────────────────────────────────────────────── */

const NATURE: LocationTypeDef[] = [
  {
    id: 'mushrooms',
    title: 'Mushrooms',
    category: 'nature',
    iconUrl: ICON('mushrooms'),
  },
  {
    id: 'great_mullein',
    title: 'Great Mullein',
    category: 'nature',
    iconUrl: ICON('great_mullein'),
  },
  { id: 'agave', title: 'Agave', category: 'nature', iconUrl: ICON('nature') },
  {
    id: 'apricot_tree',
    title: 'Apricot Tree',
    category: 'nature',
    iconUrl: ICON('apricot_tree'),
  },
  {
    id: 'lemon_tree',
    title: 'Lemon Tree',
    category: 'nature',
    iconUrl: ICON('lemon_tree'),
  },
  {
    id: 'olives',
    title: 'Olive Tree',
    category: 'nature',
    iconUrl: ICON('olives'),
  },
  {
    id: 'prickly_pear',
    title: 'Prickly Pear',
    category: 'nature',
    iconUrl: ICON('olives'),
  },
  {
    id: 'candleberries',
    title: 'Candleberries',
    category: 'nature',
    iconUrl: ICON('candleberries'),
  },
  { id: 'moss', title: 'Moss', category: 'nature', iconUrl: ICON('moss') },
  { id: 'roots', title: 'Roots', category: 'nature', iconUrl: ICON('nature') },
  {
    id: 'fertilizer',
    title: 'Fertilizer',
    category: 'nature',
    iconUrl: ICON('fertilizer'),
  },
];

/* ── ARC Enemies ─────────────────────────────────────────────────────────── */

const ARC: LocationTypeDef[] = [
  { id: 'tick', title: 'Tick', category: 'arc', iconUrl: ICON('tick') },
  { id: 'pop', title: 'Pop', category: 'arc', iconUrl: ICON('pop') },
  {
    id: 'fireball',
    title: 'Fireball',
    category: 'arc',
    iconUrl: ICON('fireball'),
  },
  { id: 'comet', title: 'Comet', category: 'arc', iconUrl: ICON('comet') },
  {
    id: 'surveyor',
    title: 'Surveyor',
    category: 'arc',
    iconUrl: ICON('surveyor'),
  },
  { id: 'turret', title: 'Turret', category: 'arc', iconUrl: ICON('turret') },
  {
    id: 'shredder',
    title: 'Shredder',
    category: 'arc',
    iconUrl: ICON('shredder'),
  },
  {
    id: 'sentinel',
    title: 'Sentinel',
    category: 'arc',
    iconUrl: ICON('sentinel'),
  },
  {
    id: 'vaporizer',
    title: 'Vaporizer',
    category: 'arc',
    iconUrl: ICON('vaporizer'),
  },
  {
    id: 'rocketeer',
    title: 'Rocketeer',
    category: 'arc',
    iconUrl: ICON('rocketeer'),
  },
  {
    id: 'arc-turbine',
    title: 'Turbine',
    category: 'arc',
    iconUrl: ICON('turret'),
  },
  { id: 'leaper', title: 'Leaper', category: 'arc', iconUrl: ICON('leaper') },
  {
    id: 'bastion',
    title: 'Bastion',
    category: 'arc',
    iconUrl: ICON('bastion'),
  },
  {
    id: 'bombardier',
    title: 'Bombardier',
    category: 'arc',
    iconUrl: ICON('bombardier'),
  },
  { id: 'queen', title: 'Queen', category: 'arc', iconUrl: ICON('queen_v2') },
  {
    id: 'matriarch',
    title: 'Matriarch',
    category: 'arc',
    iconUrl: ICON('matriarch'),
  },
];

/* ── Events ──────────────────────────────────────────────────────────────── */

const EVENTS: LocationTypeDef[] = [
  {
    id: 'arc_assessor',
    title: 'ARC Assessor',
    category: 'events',
    iconUrl: ICON('arc_assessor'),
  },
  {
    id: 'combat_supplies',
    title: 'Combat Supplies',
    category: 'events',
    iconUrl: ICON('combat_supplies'),
  },
  {
    id: 'harvester',
    title: 'Harvester',
    category: 'events',
    iconUrl: ICON('harvester'),
  },
  {
    id: 'launch_tower_event',
    title: 'Launch Tower',
    category: 'events',
    iconUrl: ICON('harvester'),
  },
  {
    id: 'antenna',
    title: 'Antenna',
    category: 'events',
    iconUrl: ICON('arc_assessor'),
  },
  {
    id: 'hidden_bunker',
    title: 'Hidden Bunker',
    category: 'events',
    iconUrl: ICON('combat_supplies'),
  },
  {
    id: 'download_console',
    title: 'Download Console',
    category: 'events',
    iconUrl: ICON('combat_supplies'),
  },
  {
    id: 'snow_pile',
    title: 'Snow Pile',
    category: 'events',
    iconUrl: ICON('snow_pile'),
  },
  { id: 'nest', title: 'Nest', category: 'events', iconUrl: ICON('mine') },
  { id: 'mine', title: 'Mine', category: 'events', iconUrl: ICON('mine') },
  {
    id: 'beachcombing_site',
    title: 'Buried Container',
    category: 'events',
    iconUrl: ICON('combat_supplies'),
  },
];

/* ── Puzzles ─────────────────────────────────────────────────────────────── */

const PUZZLES: LocationTypeDef[] = [
  {
    id: 'capsule_request_terminal',
    title: 'Capsule Request Terminal',
    category: 'puzzles',
    iconUrl: ICON('supply-station'),
  },
  {
    id: 'capsule_delivery_terminal',
    title: 'Capsule Delivery Terminal',
    category: 'puzzles',
    iconUrl: ICON('capsule_delivery_terminal'),
  },
  {
    id: 'access_capacitor_rack',
    title: 'Capacitor Rack',
    category: 'puzzles',
    iconUrl: ICON('capacitor'),
  },
  {
    id: 'access_capacitor',
    title: 'Access Capacitor',
    category: 'puzzles',
    iconUrl: ICON('access_capacitor'),
  },
  {
    id: 'fuel_cell',
    title: 'Fuel Cell',
    category: 'puzzles',
    iconUrl: ICON('fuel_cell'),
  },
  {
    id: 'generator',
    title: 'Generator',
    category: 'puzzles',
    iconUrl: ICON('generator'),
  },
  {
    id: 'power_button',
    title: 'Power Button',
    category: 'puzzles',
    iconUrl: ICON('button'),
  },
];

/* ── Combined registry ───────────────────────────────────────────────────── */

export const ALL_LOCATION_TYPES: LocationTypeDef[] = [
  ...CONTAINERS,
  ...LOCATIONS,
  ...NATURE,
  ...ARC,
  ...EVENTS,
  ...PUZZLES,
];

export const LOCATION_TYPE_MAP: Record<string, LocationTypeDef> =
  Object.fromEntries(ALL_LOCATION_TYPES.map((lt) => [lt.id, lt]));

export const LOCATION_TYPES_BY_CATEGORY: Record<
  FilterCategory,
  LocationTypeDef[]
> = {
  containers: CONTAINERS,
  locations: LOCATIONS,
  nature: NATURE,
  arc: ARC,
  events: EVENTS,
  puzzles: PUZZLES,
};
