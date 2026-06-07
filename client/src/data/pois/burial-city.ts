import type { MapPoi } from './poi-types';
import { burialcityExtractedPois } from './burial-city-extracted';

/**
 * Buried City — curated pins. `mapId` stays `burial-city` (stable RF id / routes / saved progress).
 * Percent of full tactical image, top-left origin. Refine with NEXT_PUBLIC_RF_POI_PLACEMENT=1.
 *
 * POI ids use the `bc-` prefix (stable, unique vs Dam `dam-` / `dam-*` ids).
 */
const curatedPois: MapPoi[] = [
  // ── Extracts ─────────────────────────────────────────────────────────────
  {
    id: 'bc-extract-north-boulevard',
    mapId: 'burial-city',
    name: 'North Boulevard Extract',
    category: 'extract',
    x: 48,
    y: 10,
    description:
      'Northern exit along the main boulevard — fast rotations out of downtown blocks.',
    tags: ['extract', 'north'],
  },
  {
    id: 'bc-extract-northeast-alley',
    mapId: 'burial-city',
    name: 'Northeast Alley Extract',
    category: 'extract',
    x: 82,
    y: 22,
    description:
      'Tight alley extraction; good when you are already on the east flank.',
    tags: ['extract', 'northeast'],
  },
  {
    id: 'bc-extract-east-perimeter',
    mapId: 'burial-city',
    name: 'East Perimeter Extract',
    category: 'extract',
    x: 90,
    y: 48,
    description: 'Eastern perimeter road — exposed long sightlines.',
    tags: ['extract', 'east'],
  },
  {
    id: 'bc-extract-south-plaza',
    mapId: 'burial-city',
    name: 'South Plaza Extract',
    category: 'extract',
    x: 52,
    y: 88,
    description:
      'Southern plaza / open ground — watch crossfire from rooftops.',
    tags: ['extract', 'south'],
  },
  {
    id: 'bc-extract-southwest-ruins',
    mapId: 'burial-city',
    name: 'Southwest Ruins Extract',
    category: 'extract',
    x: 18,
    y: 78,
    description: 'Collapse-line extraction through ruined low-rises.',
    tags: ['extract', 'southwest'],
  },
  {
    id: 'bc-extract-west-gate',
    mapId: 'burial-city',
    name: 'West Gate Extract',
    category: 'extract',
    x: 10,
    y: 45,
    description:
      'Western gate approach — pairs with loot routes through west blocks.',
    tags: ['extract', 'west'],
  },
  {
    id: 'bc-extract-northwest-overpass',
    mapId: 'burial-city',
    name: 'Northwest Overpass Extract',
    category: 'extract',
    x: 22,
    y: 18,
    description:
      'Elevated road extraction; verify against latest map geometry.',
    tags: ['extract', 'northwest'],
  },

  // ── Keys & access ─────────────────────────────────────────────────────────
  {
    id: 'bc-key-municipal-vault',
    mapId: 'burial-city',
    name: 'Municipal Vault',
    category: 'key',
    x: 45,
    y: 42,
    description:
      'Civic basement vault — bring the matching keycard for inner rooms.',
    tags: ['key', 'civic'],
  },
  {
    id: 'bc-key-hospital-wing',
    mapId: 'burial-city',
    name: 'Hospital Sealed Wing',
    category: 'key',
    x: 62,
    y: 38,
    description: 'Quarantine wing doors — medical-tier loot behind key locks.',
    tags: ['key', 'hospital'],
  },
  {
    id: 'bc-key-parking-garage-core',
    mapId: 'burial-city',
    name: 'Parking Garage Core',
    category: 'key',
    x: 38,
    y: 58,
    description: 'Central garage levels; several gated utility closets.',
    tags: ['key', 'garage'],
  },
  {
    id: 'bc-key-rooftop-access',
    mapId: 'burial-city',
    name: 'Rooftop Access Hub',
    category: 'key',
    x: 55,
    y: 32,
    description: 'Stair/elevator cluster controlling upper-floor rotations.',
    tags: ['key', 'vertical'],
  },
  {
    id: 'bc-key-subway-maintenance',
    mapId: 'burial-city',
    name: 'Subway Maintenance Hatch',
    category: 'key',
    x: 50,
    y: 62,
    description: 'Below-street maintenance — connects under-block shortcuts.',
    tags: ['key', 'subway'],
  },
  {
    id: 'bc-key-department-store-back',
    mapId: 'burial-city',
    name: 'Department Store Back Offices',
    category: 'key',
    x: 70,
    y: 55,
    description:
      'Retail block rear offices; keyed storerooms with high-tier loot.',
    tags: ['key', 'retail'],
  },

  // ── Quest landmarks ───────────────────────────────────────────────────────
  {
    id: 'bc-quest-central-square',
    mapId: 'burial-city',
    name: 'Central Square Objectives',
    category: 'quest',
    x: 50,
    y: 48,
    description:
      'High-traffic contracts often stage scans or eliminations here.',
    tags: ['quest', 'plaza'],
  },
  {
    id: 'bc-quest-harvester-alley-loop',
    mapId: 'burial-city',
    name: 'Harvester Alley Loop',
    category: 'quest',
    x: 34,
    y: 52,
    description:
      'Tight block grid where Harvester patrol quests frequently resolve.',
    tags: ['quest', 'harvester'],
  },
  {
    id: 'bc-quest-evac-markers-east',
    mapId: 'burial-city',
    name: 'East Block Evac Markers',
    category: 'quest',
    x: 74,
    y: 44,
    description:
      'Survey and beacon-style steps commonly ping eastern rooftops.',
    tags: ['quest', 'east'],
  },
  {
    id: 'bc-quest-old-metro-entrance',
    mapId: 'burial-city',
    name: 'Old Metro Entrance',
    category: 'quest',
    x: 44,
    y: 68,
    description: 'Underground-adjacent objectives and sample pickups.',
    tags: ['quest', 'metro'],
  },
  {
    id: 'bc-quest-church-overlook',
    mapId: 'burial-city',
    name: 'Church Overlook',
    category: 'quest',
    x: 28,
    y: 36,
    description: 'Elevated landmark for recon and uplink-style quest beats.',
    tags: ['quest', 'landmark'],
  },
  {
    id: 'bc-quest-railyard-handoff',
    mapId: 'burial-city',
    name: 'Railyard Hand-Off',
    category: 'quest',
    x: 78,
    y: 68,
    description:
      'Delivery and retrieval contracts often route through the yard edge.',
    tags: ['quest', 'railyard'],
  },
  {
    id: 'bc-quest-residential-sweep',
    mapId: 'burial-city',
    name: 'Residential Sweep Zone',
    category: 'quest',
    x: 58,
    y: 72,
    description: 'Dense housing — clearance and collection steps cluster here.',
    tags: ['quest', 'residential'],
  },

  // ── Notable containers ────────────────────────────────────────────────────
  {
    id: 'bc-container-garage-weapon-lockers',
    mapId: 'burial-city',
    name: 'Garage Weapon Lockers',
    category: 'container',
    x: 40,
    y: 56,
    description: 'Weapon-case cluster on mid-level garage ramps.',
    tags: ['container', 'weapon'],
  },
  {
    id: 'bc-container-hospital-pharmacy',
    mapId: 'burial-city',
    name: 'Hospital Pharmacy Cage',
    category: 'container',
    x: 60,
    y: 40,
    description: 'Caged pharmacy — medical bags and locked shelving.',
    tags: ['container', 'medical'],
  },
  {
    id: 'bc-container-plaza-duffle-line',
    mapId: 'burial-city',
    name: 'Plaza Duffle Line',
    category: 'container',
    x: 48,
    y: 52,
    description: 'Open plaza duffles — fast loot, high contest.',
    tags: ['container', 'duffle'],
  },
  {
    id: 'bc-container-rooftop-cache',
    mapId: 'burial-city',
    name: 'Rooftop Raider Cache',
    category: 'container',
    x: 56,
    y: 28,
    description: 'Elevated cache — climb tax, quieter mid-raid.',
    tags: ['container', 'cache'],
  },
  {
    id: 'bc-container-metro-tool-lockers',
    mapId: 'burial-city',
    name: 'Metro Tool Lockers',
    category: 'container',
    x: 46,
    y: 64,
    description: 'Maintenance lockers near metro access.',
    tags: ['container', 'lockers'],
  },
  {
    id: 'bc-container-retail-safe-room',
    mapId: 'burial-city',
    name: 'Retail Back Safe',
    category: 'container',
    x: 68,
    y: 52,
    description: 'Department store safe room — slow clear, strong payoff.',
    tags: ['container', 'safe'],
  },
  {
    id: 'bc-container-alley-backpacks',
    mapId: 'burial-city',
    name: 'Alley Backpack Spawns',
    category: 'container',
    x: 32,
    y: 46,
    description: 'Narrow alley packs — easy to miss when sprinting.',
    tags: ['container', 'backpack'],
  },
  {
    id: 'bc-container-railyard-crates',
    mapId: 'burial-city',
    name: 'Railyard Crate Stack',
    category: 'container',
    x: 82,
    y: 62,
    description: 'Shipping crates along the yard — loud, horizontal cover.',
    tags: ['container', 'crate'],
  },

  // ── Loot ─────────────────────────────────────────────────────────────────
  {
    id: 'bc-loot-hospital-supply-room',
    mapId: 'burial-city',
    name: 'Hospital Supply Room',
    category: 'loot',
    x: 64,
    y: 35,
    description:
      'Open shelving with medical consumables — meds, stims, bandages. No key needed.',
    tags: ['loot', 'medical'],
  },
  {
    id: 'bc-loot-tech-cache-downtown',
    mapId: 'burial-city',
    name: 'Downtown Tech Cache',
    category: 'loot',
    x: 52,
    y: 44,
    description:
      'Electronics-heavy loot spawn in the commercial block — components and comms gear.',
    tags: ['loot', 'tech'],
  },
  {
    id: 'bc-loot-underground-stash',
    mapId: 'burial-city',
    name: 'Underground Stash',
    category: 'loot',
    x: 47,
    y: 70,
    description:
      'Hidden pile in the subway tunnels — high-value items, low foot traffic.',
    tags: ['loot', 'hidden'],
  },
  {
    id: 'bc-loot-west-residential-pile',
    mapId: 'burial-city',
    name: 'West Residential Pile',
    category: 'loot',
    x: 16,
    y: 55,
    description: 'Scattered loot across collapsed apartments on the west side.',
    tags: ['loot', 'residential'],
  },

  // ── Named areas ───────────────────────────────────────────────────────────
  {
    id: 'bc-area-central-square',
    mapId: 'burial-city',
    name: 'Central Square',
    category: 'area',
    x: 50,
    y: 50,
    description:
      'Open urban plaza at the heart of the map. Dominant sightlines in all directions — contested every raid. Control it or avoid it.',
    tags: ['area', 'central'],
  },
  {
    id: 'bc-area-hospital-complex',
    mapId: 'burial-city',
    name: 'Hospital Complex',
    category: 'area',
    x: 63,
    y: 37,
    description:
      'Multi-wing medical facility — vertical play, key rooms, and medical loot. Some of the best per-slot value on the map.',
    tags: ['area', 'hospital'],
  },
  {
    id: 'bc-area-downtown-commercial',
    mapId: 'burial-city',
    name: 'Downtown Commercial',
    category: 'area',
    x: 55,
    y: 48,
    description:
      'Department store, offices, and retail shops. Dense loot and tight CQB angles. Department store back offices hold key-locked high-tier rooms.',
    tags: ['area', 'commercial'],
  },
  {
    id: 'bc-area-railyard',
    mapId: 'burial-city',
    name: 'Railyard & East Industrial',
    category: 'area',
    x: 80,
    y: 65,
    description:
      'Open yard with crates and machinery — long sightlines into the yard from elevated catwalks. Quest hand-offs and container loot concentrate here.',
    tags: ['area', 'railyard'],
  },
  {
    id: 'bc-area-residential-quarter',
    mapId: 'burial-city',
    name: 'Residential Quarter',
    category: 'area',
    x: 58,
    y: 70,
    description:
      'Dense mid-rise housing — close quarters through hallways and stairwells. Quest sweep zones and scattered residential loot.',
    tags: ['area', 'residential'],
  },
  {
    id: 'bc-area-underground',
    mapId: 'burial-city',
    name: 'Underground / Subway',
    category: 'area',
    x: 47,
    y: 65,
    description:
      'Below-street tunnel network connecting major blocks. Shortcuts between distant extracts — but ARC patrols use it too.',
    tags: ['area', 'subway', 'underground'],
  },
  {
    id: 'bc-area-church-quarter',
    mapId: 'burial-city',
    name: 'Church Quarter',
    category: 'area',
    x: 27,
    y: 34,
    description:
      'Elevated church and surrounding ruins on the northwest flank. Dominant overwatch positions — frequently contested for its sightlines to downtown.',
    tags: ['area', 'church', 'northwest'],
  },

  // ── ARC spawns ────────────────────────────────────────────────────────────
  {
    id: 'bc-arc-central-square-patrol',
    mapId: 'burial-city',
    name: 'Central Square ARC Patrol',
    category: 'arc',
    x: 50,
    y: 50,
    description:
      'Heavy ARC squad circles the central plaza — aggressive engagement range, variable patrol route.',
    tags: ['arc', 'patrol'],
  },
  {
    id: 'bc-arc-hospital-guard-post',
    mapId: 'burial-city',
    name: 'Hospital Guard Post',
    category: 'arc',
    x: 65,
    y: 34,
    description:
      'Stationary ARC guards at hospital entry points. Clear before attempting keyed wing.',
    tags: ['arc', 'guard'],
  },
  {
    id: 'bc-arc-railyard-sweep',
    mapId: 'burial-city',
    name: 'Railyard ARC Sweep',
    category: 'arc',
    x: 82,
    y: 60,
    description:
      'ARC squad sweeps between crate stacks — flanking through machinery avoids direct contact.',
    tags: ['arc', 'sweep'],
  },
  {
    id: 'bc-arc-underground-ambush',
    mapId: 'burial-city',
    name: 'Underground Ambush Point',
    category: 'arc',
    x: 48,
    y: 67,
    description:
      'ARC units hold tunnel chokepoints below street level. Flashbangs before entry advised.',
    tags: ['arc', 'tunnel', 'ambush'],
  },

  // ── Interactions ──────────────────────────────────────────────────────────
  {
    id: 'bc-interact-roof-zipline-north',
    mapId: 'burial-city',
    name: 'North Rooftop Zipline',
    category: 'interaction',
    x: 52,
    y: 22,
    description:
      'Rooftop zipline connecting the north commercial block to mid-map. Fast repositioning, loud landing.',
    tags: ['interaction', 'zipline', 'vertical'],
  },
  {
    id: 'bc-interact-zipline-east-block',
    mapId: 'burial-city',
    name: 'East Block Zipline',
    category: 'interaction',
    x: 78,
    y: 40,
    description:
      'Cross-street zipline on the east side — connects hospital-adjacent rooftop to the railyard approach.',
    tags: ['interaction', 'zipline'],
  },
  {
    id: 'bc-interact-supply-call',
    mapId: 'burial-city',
    name: 'Supply Call Terminal',
    category: 'interaction',
    x: 54,
    y: 54,
    description:
      'Activated supply drop — broadcasts a loud call signal audible to all players nearby.',
    tags: ['interaction', 'supply', 'noise-risk'],
  },
  {
    id: 'bc-interact-battery-terminal',
    mapId: 'burial-city',
    name: 'Battery Terminal',
    category: 'interaction',
    x: 44,
    y: 60,
    description:
      'Restores power to the adjacent zone — unlocks doors and activates area mechanics.',
    tags: ['interaction', 'power'],
  },
  {
    id: 'bc-interact-elevator-garage',
    mapId: 'burial-city',
    name: 'Garage Elevator',
    category: 'interaction',
    x: 38,
    y: 55,
    description:
      'Working elevator in the parking garage — vertical shortcut between levels but loud and predictable.',
    tags: ['interaction', 'elevator', 'vertical'],
  },

  // ── Noise hazards ─────────────────────────────────────────────────────────
  {
    id: 'bc-noise-metal-detector-hospital',
    mapId: 'burial-city',
    name: 'Hospital Metal Detectors',
    category: 'noise',
    x: 61,
    y: 37,
    description:
      'Security scanners at hospital entrance — trigger an audible alarm when passed with weapons drawn. Alert nearby ARC.',
    tags: ['noise', 'alarm', 'hospital'],
  },
  {
    id: 'bc-noise-cctv-cameras-commercial',
    mapId: 'burial-city',
    name: 'Commercial CCTV Cluster',
    category: 'noise',
    x: 68,
    y: 50,
    description:
      'Active surveillance cameras in the downtown block. Triggering them marks your position for ARC patrols.',
    tags: ['noise', 'camera', 'surveillance'],
  },
  {
    id: 'bc-noise-broken-glass-alley',
    mapId: 'burial-city',
    name: 'Broken Glass Chokepoint',
    category: 'noise',
    x: 33,
    y: 48,
    description:
      'Narrow alley blanketed with broken glass and rubble — unavoidably loud without crouching slowly.',
    tags: ['noise', 'floor', 'alley'],
  },

  // ── Nature / environmental ────────────────────────────────────────────────
  {
    id: 'bc-nature-overgrown-courtyard',
    mapId: 'burial-city',
    name: 'Overgrown Courtyard',
    category: 'nature',
    x: 42,
    y: 44,
    description:
      'Reclaimed courtyard choked with vines and root systems. Dense cover — good for repositioning quietly between buildings.',
    tags: ['nature', 'cover'],
  },
  {
    id: 'bc-nature-rooftop-garden',
    mapId: 'burial-city',
    name: 'Rooftop Garden',
    category: 'nature',
    x: 57,
    y: 27,
    description:
      'Collapsed greenhouse on a commercial rooftop — thick plant growth provides concealment from above.',
    tags: ['nature', 'rooftop', 'concealment'],
  },
  {
    id: 'bc-nature-plaza-treeline',
    mapId: 'burial-city',
    name: 'Plaza Treeline',
    category: 'nature',
    x: 50,
    y: 53,
    description:
      'Mature trees lining the central plaza edge. Natural cover in an otherwise open sightline — but also a common camper spot.',
    tags: ['nature', 'trees', 'cover'],
  },
  {
    id: 'bc-nature-southwest-overgrowth',
    mapId: 'burial-city',
    name: 'Southwest Overgrowth',
    category: 'nature',
    x: 20,
    y: 72,
    description:
      'Collapsed buildings reclaimed by heavy vegetation on the southwest edge. Dense foliage slows movement but offers concealment approaching the ruins extract.',
    tags: ['nature', 'southwest', 'ruins'],
  },
];

// Merge curated POIs with extracted MetaForge POIs
export const buriedCityPois: MapPoi[] = [...curatedPois, ...burialcityExtractedPois];
