/**
 * Curated map POIs — coordinates and metadata.
 * Adapted from pois/maps2/poi-types.ts for the React client.
 */

export type PoiCategory =
  | 'extract'
  | 'key'
  | 'quest'
  | 'area'
  | 'container'
  | 'loot'
  | 'arc'
  | 'nature'
  | 'interaction'
  | 'noise'
  | (string & {});

/** Supported in-raid difficulty / map-condition variants for ARC Raiders. */
export type Difficulty =
  | 'Normal'
  | 'Night Raid'
  | 'Electromagnetic Storm'
  | 'Hurricane'
  | 'Close Scrutiny'
  | 'Hidden Bunker'
  | 'Locked Gate'
  | 'Beachcombing'
  | 'Bird City'
  | 'Launch Tower Loot'
  | 'Harvester'
  | 'Husk Graveyard'
  | 'Lush Blooms'
  | 'Matriarch'
  | 'Prospecting Probes'
  | 'Uncovered Caches';

export type MapPoi = {
  id: string;
  mapId: string;
  mapID?: string;
  category: PoiCategory;
  name: string;
  x: number;
  y: number;
  description?: string;
  tags?: string[];
  iconKey?: string;
  floorIndex?: number;
  difficulties?: Array<Difficulty | string>;
  rawType?: string;

  // Preserve compatibility with imported MetaForge-style POI fields.
  subcategory?: string;
  instanceName?: string;
  lat?: number;
  lng?: number;
  zlayers?: Array<string | number> | string | number | null;
  behindLockedDoor?: boolean;
  eventConditionMask?: Difficulty | string | null;
  lootAreas?: string | string[] | null;
  updated_at?: string | null;
  imageUrl?: string;
  source?: string;
  color?: string;
  createdBy?: string;
};
