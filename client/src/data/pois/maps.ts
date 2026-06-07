/**
 * maps.ts — Static metadata for the 6 ARC Raiders maps.
 * Tile configuration sourced from MetaForge / ardb.app.
 * All images served from the configured asset host.
 * Local fallback thumbnails in /public/map-thumbnails/ for dev.
 */

const ASSET_BASE = (
  import.meta.env.VITE_ASSETS_URL || 'https://assets.shiesty.me'
).replace(/\/$/, '');

const interactiveTileUrl = (
  mapPath: string,
  quality: 'high' | 'low' = 'high',
) =>
  `${ASSET_BASE}/maps/interactive/${mapPath}/tiles/${quality}/{z}/{x}/{y}.webp`;

export { interactiveTileUrl };

export type MapFloor = {
  id: string;
  label: string;
  image: string;
};

export type TileLayerDef = {
  id: string;
  label: string;
  tileUrl: string;
  maxNativeZoom: number;
  mapPath?: string;
};

export type MapTileConfig = {
  layers: TileLayerDef[];
  tileSize: number;
  mapPixelSize: number;
  maxZoom: number;
  minZoom: number;
};

export type MapMeta = {
  id: string;
  displayName: string;
  subtitle: string;
  description: string;
  risk: 'Low' | 'Medium' | 'High' | 'Extreme';
  coverImage: string;
  image: string | null;
  mapType: 'standard' | 'multi-floor';
  floors?: MapFloor[];
  features: string[];
  tileConfig?: MapTileConfig;
  /** Position on the world overview map (percent from left, percent from top) */
  overviewPos: { x: number; y: number };
  /** Map ID used by api.arcraidersmaps.app */
  apiMapId: string;
};

export const MAPS: MapMeta[] = [
  {
    id: 'dam-battlegrounds',
    displayName: 'Dam Battlegrounds',
    subtitle: 'Industrial Warzone',
    description:
      'Dam Battlegrounds drops you into the shadow of the Alcantara Power Plant, a massive hydroelectric dam looming over a toxic, flooded landscape.',
    risk: 'High',
    coverImage: `${ASSET_BASE}/maps/dam_battle.jpeg`,
    image: `${ASSET_BASE}/maps/dam_battle.jpeg`,
    mapType: 'standard',
    features: ['Harvester Spawns', 'Contested POIs', 'Industrial Loot'],
    overviewPos: { x: 38, y: 42 },
    apiMapId: 'dam',
    tileConfig: {
      layers: [
        {
          id: 'dam',
          label: 'Dam Battlegrounds',
          tileUrl: interactiveTileUrl('dam_v2'),
          mapPath: 'dam_v2',
          maxNativeZoom: 2,
        },
      ],
      tileSize: 512,
      mapPixelSize: 4096,
      maxZoom: 6,
      minZoom: -2,
    },
  },
  {
    id: 'burial-city',
    displayName: 'Buried City',
    subtitle: 'Urban Ruins',
    description:
      'Buried City sits half-swallowed by dunes in a harsh, wind-scoured desert. Tight streets and lonely plazas tell the story of a town that once thrived.',
    risk: 'Medium',
    coverImage: `${ASSET_BASE}/maps/burriedcity.png`,
    image: `${ASSET_BASE}/maps/burriedcity.png`,
    mapType: 'standard',
    features: ['Urban Cover', 'Cache Spawns', 'ARC Nests'],
    overviewPos: { x: 62, y: 30 },
    apiMapId: 'buried-city',
    tileConfig: {
      layers: [
        {
          id: 'buried-city',
          label: 'Buried City',
          tileUrl: interactiveTileUrl('buried-city-v3'),
          mapPath: 'buried-city-v3',
          maxNativeZoom: 2,
        },
      ],
      tileSize: 512,
      mapPixelSize: 4096,
      maxZoom: 6,
      minZoom: -2,
    },
  },
  {
    id: 'spaceport',
    displayName: 'Spaceport',
    subtitle: 'Launch Complex',
    description:
      'Spaceport centers on Acerra Spaceport, a once-grand launch facility built to send shuttles skyward and ferry people off a failing Earth.',
    risk: 'Extreme',
    coverImage: `${ASSET_BASE}/maps/spaceport.png`,
    image: `${ASSET_BASE}/maps/spaceport.png`,
    mapType: 'standard',
    features: ['Launch Tower Loot', 'High-Tech Salvage', 'ARC Patrols'],
    overviewPos: { x: 25, y: 65 },
    apiMapId: 'spaceport',
    tileConfig: {
      layers: [
        {
          id: 'spaceport',
          label: 'Spaceport',
          tileUrl: interactiveTileUrl('spaceport'),
          mapPath: 'spaceport',
          maxNativeZoom: 2,
        },
      ],
      tileSize: 512,
      mapPixelSize: 4096,
      maxZoom: 6,
      minZoom: -2,
    },
  },
  {
    id: 'blue-gate',
    displayName: 'Blue Gate',
    subtitle: 'Frontier Outpost',
    description:
      'The Blue Gate takes you high into the mountains, where a strange gateway complex dominates the skyline. Wide sightlines and sudden drops keep you shifting.',
    risk: 'Medium',
    coverImage: `${ASSET_BASE}/maps/bluegate.png`,
    image: `${ASSET_BASE}/maps/bluegate.png`,
    mapType: 'standard',
    features: ['Open Terrain', 'Fortified Positions', 'Resource Nodes'],
    overviewPos: { x: 75, y: 55 },
    apiMapId: 'blue-gate',
    tileConfig: {
      layers: [
        {
          id: 'blue-gate',
          label: 'Blue Gate',
          tileUrl: interactiveTileUrl('blue-gate'),
          mapPath: 'blue-gate',
          maxNativeZoom: 2,
        },
      ],
      tileSize: 512,
      mapPixelSize: 4096,
      maxZoom: 6,
      minZoom: -2,
    },
  },
  {
    id: 'stella-montis',
    displayName: 'Stella Montis',
    subtitle: 'Mountain Facility',
    description:
      'Stella Montis is a remote research outpost tucked into snow-covered peaks. Icy walkways, buried structures, and frozen ravines form a chilly maze.',
    risk: 'High',
    coverImage: `${ASSET_BASE}/maps/stella.png`,
    image: `${ASSET_BASE}/maps/stella.png`,
    mapType: 'multi-floor',
    floors: [
      {
        id: 'upper',
        label: 'Upper Level',
        image: `${ASSET_BASE}/items/stella_montis_upper.webp`,
      },
      {
        id: 'lower',
        label: 'Lower Level',
        image: `${ASSET_BASE}/items/stella_montis_lower.webp`,
      },
    ],
    features: ['Multi-Level', 'Night Raids', 'Research Loot'],
    overviewPos: { x: 50, y: 18 },
    apiMapId: 'stella-montis',
    tileConfig: {
      layers: [
        {
          id: 'stella-montis-l1-v2',
          label: 'Map',
          tileUrl: `${ASSET_BASE}/maps/interactive/stella-montis/layers/stella-montis-l1-v2/tiles/{z}/{x}/{y}.webp`,
          maxNativeZoom: 2,
        },
      ],
      tileSize: 512,
      mapPixelSize: 4096,
      maxZoom: 6,
      minZoom: -2,
    },
  },
  {
    id: 'riven-tides',
    displayName: 'Riven Tides',
    subtitle: 'Coastal Frontier',
    description:
      'Riven Tides sprawls along a shattered coastline where crumbling cliffs and tidal ruins create a maze of vertical combat zones and hidden caches.',
    risk: 'Medium',
    coverImage: `${ASSET_BASE}/maps/riventides.webp`,
    image: `${ASSET_BASE}/maps/riventides.webp`,
    mapType: 'standard',
    features: ['Coastal Terrain', 'Tidal Zones', 'Hidden Caches'],
    overviewPos: { x: 13.2, y: 81.45 },
    apiMapId: 'riven-tides',
    tileConfig: {
      layers: [
        {
          id: 'riven-tides',
          label: 'Riven Tides',
          tileUrl: interactiveTileUrl('riven-tides'),
          mapPath: 'riven-tides',
          maxNativeZoom: 2,
        },
      ],
      tileSize: 512,
      mapPixelSize: 4096,
      maxZoom: 6,
      minZoom: -2,
    },
  },
];

export function getMapById(id: string): MapMeta | undefined {
  return MAPS.find((m) => m.id === id);
}
