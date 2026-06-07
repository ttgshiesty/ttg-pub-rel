/**
 * containers.ts — Curated container spawn data for maps.
 * Adapted from pois/containers.ts
 *
 * Coordinate system:
 *   All entries use normalized: true — position.x and position.y are [0, 1]
 *   fractions of the tile image measured from the top-left corner.
 */

export type ContainerType =
  | 'locked_case'
  | 'storage_chest'
  | 'weapon_crate'
  | 'safe'
  | 'duffle_bag'
  | 'backpack'
  | 'raider_cache'
  | 'weapon_case'
  | 'medical_bag';

export type ContainerTypeMeta = {
  label: string;
  color: string;
};

export const CONTAINER_TYPE_META: Record<ContainerType, ContainerTypeMeta> = {
  locked_case: { label: 'Locked Case', color: '#facc15' },
  storage_chest: { label: 'Storage Chest', color: '#94a3b8' },
  weapon_crate: { label: 'Weapon Crate', color: '#f97316' },
  safe: { label: 'Safe', color: '#38bdf8' },
  duffle_bag: { label: 'Duffle Bag', color: '#a855f7' },
  backpack: { label: 'Backpack', color: '#22c55e' },
  raider_cache: { label: 'Raider Cache', color: '#ef4444' },
  weapon_case: { label: 'Weapon Case', color: '#fb923c' },
  medical_bag: { label: 'Medical Bag', color: '#34d399' },
};

export type ContainerMarker = {
  id: string;
  containerType: ContainerType;
  position: { x: number; y: number };
  normalized?: true;
  label?: string;
};

// ── Dam Battlegrounds ─────────────────────────────────────────────────────────

const DAM_CONTAINERS: ContainerMarker[] = [
  {
    id: 'dam-rc-01',
    containerType: 'raider_cache',
    normalized: true,
    position: { x: 0.14, y: 0.13 },
    label: 'Northwest Bunker',
  },
  {
    id: 'dam-rc-02',
    containerType: 'raider_cache',
    normalized: true,
    position: { x: 0.84, y: 0.21 },
    label: 'East Ridge Cache',
  },
  {
    id: 'dam-rc-03',
    containerType: 'raider_cache',
    normalized: true,
    position: { x: 0.36, y: 0.54 },
    label: 'Powerhouse Interior',
  },
  {
    id: 'dam-rc-04',
    containerType: 'raider_cache',
    normalized: true,
    position: { x: 0.22, y: 0.76 },
    label: 'River Camp',
  },
  {
    id: 'dam-rc-05',
    containerType: 'raider_cache',
    normalized: true,
    position: { x: 0.7, y: 0.87 },
    label: 'South Forest Cache',
  },
  {
    id: 'dam-wc-01',
    containerType: 'weapon_case',
    normalized: true,
    position: { x: 0.5, y: 0.09 },
    label: 'Dam Gate Post',
  },
  {
    id: 'dam-wc-02',
    containerType: 'weapon_case',
    normalized: true,
    position: { x: 0.74, y: 0.41 },
    label: 'East Watchtower',
  },
  {
    id: 'dam-wc-03',
    containerType: 'weapon_case',
    normalized: true,
    position: { x: 0.18, y: 0.47 },
    label: 'Maintenance Wing',
  },
  {
    id: 'dam-wc-04',
    containerType: 'weapon_case',
    normalized: true,
    position: { x: 0.62, y: 0.27 },
    label: 'Spillway Control',
  },
  {
    id: 'dam-wc-05',
    containerType: 'weapon_case',
    normalized: true,
    position: { x: 0.55, y: 0.71 },
    label: 'Flood Control Room',
  },
  {
    id: 'dam-mb-01',
    containerType: 'medical_bag',
    normalized: true,
    position: { x: 0.08, y: 0.32 },
    label: 'West Cliff Overhang',
  },
  {
    id: 'dam-mb-02',
    containerType: 'medical_bag',
    normalized: true,
    position: { x: 0.47, y: 0.34 },
    label: 'Dam Catwalk',
  },
  {
    id: 'dam-mb-03',
    containerType: 'medical_bag',
    normalized: true,
    position: { x: 0.91, y: 0.6 },
    label: 'East Shore Shelter',
  },
  {
    id: 'dam-mb-04',
    containerType: 'medical_bag',
    normalized: true,
    position: { x: 0.1, y: 0.64 },
    label: 'Underground Passage',
  },
];

export const CONTAINERS_BY_MAP: Record<string, ContainerMarker[]> = {
  'dam-battlegrounds': DAM_CONTAINERS,
};
