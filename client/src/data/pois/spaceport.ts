import type { MapPoi } from './poi-types';
import { spaceportExtractedPois } from './spaceport-extracted';

/**
 * Spaceport — curated pins (`mapId` matches `MapMeta.id`: `spaceport`).
 * Percent coordinates, top-left origin. Refine with NEXT_PUBLIC_RF_POI_PLACEMENT=1.
 * Stable ids use the `sp-` prefix.
 *
 * Categories: extract · key · quest · area · container · loot · arc · nature · interaction · noise
 */
const curatedPois: MapPoi[] = [
  // ── Extracts ─────────────────────────────────────────────────────────────
  {
    id: 'sp-extract-north-pad-road',
    mapId: 'spaceport',
    name: 'North Pad Road Extract',
    category: 'extract',
    x: 52,
    y: 10,
    description:
      'Northern service road leading away from the launch infrastructure — cleanest exit when towers are hot.',
    tags: ['extract', 'north'],
  },
  {
    id: 'sp-extract-northeast-perimeter',
    mapId: 'spaceport',
    name: 'Northeast Perimeter Extract',
    category: 'extract',
    x: 86,
    y: 22,
    description:
      'Fence-line exit past the fuel farm. Watch the open sightlines before committing.',
    tags: ['extract', 'northeast'],
  },
  {
    id: 'sp-extract-east-hangar-row',
    mapId: 'spaceport',
    name: 'East Hangar Row Extract',
    category: 'extract',
    x: 92,
    y: 48,
    description:
      'Eastern hangar apron — solid rotate option after clearing hangar bay fights.',
    tags: ['extract', 'east'],
  },
  {
    id: 'sp-extract-south-field',
    mapId: 'spaceport',
    name: 'South Field Extract',
    category: 'extract',
    x: 50,
    y: 88,
    description:
      'Open southern field; tower overwatch covers this route — sprint or time carefully.',
    tags: ['extract', 'south'],
  },
  {
    id: 'sp-extract-southwest-fuel',
    mapId: 'spaceport',
    name: 'Southwest Fuel Farm Extract',
    category: 'extract',
    x: 16,
    y: 78,
    description:
      'Exit through the fuel storage outskirts. Slower but avoids central engagement.',
    tags: ['extract', 'southwest'],
  },
  {
    id: 'sp-extract-west-logistics',
    mapId: 'spaceport',
    name: 'West Logistics Extract',
    category: 'extract',
    x: 10,
    y: 46,
    description:
      'Western logistics road — good exit once the hangar zone clears.',
    tags: ['extract', 'west'],
  },
  {
    id: 'sp-extract-northwest-tower-base',
    mapId: 'spaceport',
    name: 'Northwest Tower Base Extract',
    category: 'extract',
    x: 20,
    y: 18,
    description:
      'Low-ground exit below the main launch tower sightlines. Underused and reliable.',
    tags: ['extract', 'northwest'],
  },

  // ── Keys & access ─────────────────────────────────────────────────────────
  {
    id: 'sp-key-launch-control',
    mapId: 'spaceport',
    name: 'Launch Control Room',
    category: 'key',
    x: 48,
    y: 36,
    description:
      'Primary launch control — multiple keyed inner doors protect the best tech loot.',
    tags: ['key', 'control'],
  },
  {
    id: 'sp-key-fuel-bunker',
    mapId: 'spaceport',
    name: 'Fuel Bunker Hatch',
    category: 'key',
    x: 62,
    y: 58,
    description: 'Bunkered fuel management room with heavy keyed blast doors.',
    tags: ['key', 'fuel'],
  },
  {
    id: 'sp-key-hangar-bay-office',
    mapId: 'spaceport',
    name: 'Hangar Bay Office',
    category: 'key',
    x: 70,
    y: 44,
    description:
      'Mezzanine offices overlooking the main bay floor — good crate density.',
    tags: ['key', 'hangar'],
  },
  {
    id: 'sp-key-clean-room',
    mapId: 'spaceport',
    name: 'Clean Room Annex',
    category: 'key',
    x: 40,
    y: 52,
    description:
      'Payload prep clean room — keycard access, high-value tech components inside.',
    tags: ['key', 'tech'],
  },
  {
    id: 'sp-key-substation-vault',
    mapId: 'spaceport',
    name: 'Substation Vault',
    category: 'key',
    x: 58,
    y: 68,
    description: 'High-voltage substation with a keyed tool vault inside.',
    tags: ['key', 'power'],
  },
  {
    id: 'sp-key-tower-maintenance',
    mapId: 'spaceport',
    name: 'Tower Maintenance Lift',
    category: 'key',
    x: 52,
    y: 24,
    description:
      'Service lift core for the launch tower — keyed access, worth it for Tower Loot runs.',
    tags: ['key', 'vertical'],
    difficulties: ['Tower Loot'],
  },

  // ── Quest landmarks ───────────────────────────────────────────────────────
  {
    id: 'sp-quest-pad-zero',
    mapId: 'spaceport',
    name: 'Pad Complex Objectives',
    category: 'quest',
    x: 50,
    y: 42,
    description:
      'Central pad and flame trench — the highest-traffic contract zone on the map.',
    tags: ['quest', 'pad'],
  },
  {
    id: 'sp-quest-harvester-apron',
    mapId: 'spaceport',
    name: 'Harvester Apron Loop',
    category: 'quest',
    x: 36,
    y: 58,
    description:
      'Wide apron zone where Harvester elimination quests typically resolve.',
    tags: ['quest', 'harvester'],
  },
  {
    id: 'sp-quest-tower-survey',
    mapId: 'spaceport',
    name: 'Tower Survey Rings',
    category: 'quest',
    x: 54,
    y: 28,
    description:
      'Vertical survey and beacon steps around the upper tower stack. Exposure risk is high.',
    tags: ['quest', 'tower'],
  },
  {
    id: 'sp-quest-fuel-sabotage',
    mapId: 'spaceport',
    name: 'Fuel Farm Objectives',
    category: 'quest',
    x: 66,
    y: 62,
    description:
      'Sabotage and sample collection quests threading through the fuel line network.',
    tags: ['quest', 'fuel'],
  },
  {
    id: 'sp-quest-logistics-convoy',
    mapId: 'spaceport',
    name: 'Logistics Convoy Trace',
    category: 'quest',
    x: 28,
    y: 48,
    description:
      'Courier and tracking objectives along the western logistics spine.',
    tags: ['quest', 'logistics'],
  },
  {
    id: 'sp-quest-radar-dish',
    mapId: 'spaceport',
    name: 'Radar Dish Array',
    category: 'quest',
    x: 74,
    y: 36,
    description:
      'Uplink and recon objectives at the dish farm — multiple beats spread across the array.',
    tags: ['quest', 'comms'],
  },
  {
    id: 'sp-quest-debris-field',
    mapId: 'spaceport',
    name: 'Debris Field Marker',
    category: 'quest',
    x: 42,
    y: 72,
    description:
      'Salvage contracts in scattered launch debris south of the pad.',
    tags: ['quest', 'salvage'],
  },

  // ── Named areas ───────────────────────────────────────────────────────────
  {
    id: 'sp-area-launch-tower',
    mapId: 'spaceport',
    name: 'Launch Tower Complex',
    category: 'area',
    x: 52,
    y: 30,
    description:
      'The dominant landmark — multi-level gantry with service access, ziplines, and extreme overwatch reach. Controls the center of the map.',
    tags: ['area', 'tower'],
  },
  {
    id: 'sp-area-launch-pad',
    mapId: 'spaceport',
    name: 'Launch Pad & Flame Trench',
    category: 'area',
    x: 50,
    y: 46,
    description:
      'Open blast pan around the pad base and recessed flame trench. Central contest point — minimal cover.',
    tags: ['area', 'pad'],
  },
  {
    id: 'sp-area-hangar-row',
    mapId: 'spaceport',
    name: 'Hangar Row',
    category: 'area',
    x: 76,
    y: 46,
    description:
      'Row of large maintenance hangars along the eastern side. High container density, multiple vehicle staging bays.',
    tags: ['area', 'hangar'],
  },
  {
    id: 'sp-area-control-building',
    mapId: 'spaceport',
    name: 'Control Building',
    category: 'area',
    x: 44,
    y: 38,
    description:
      'Multi-story operations hub with launch control consoles, crew quarters, and keyed tech rooms.',
    tags: ['area', 'control'],
  },
  {
    id: 'sp-area-fuel-farm',
    mapId: 'spaceport',
    name: 'Fuel Farm',
    category: 'area',
    x: 68,
    y: 62,
    description:
      'Dense cluster of fuel tanks, pump stations, and piping. Good secondary loot — watch the pinch points.',
    tags: ['area', 'fuel'],
  },
  {
    id: 'sp-area-logistics-depot',
    mapId: 'spaceport',
    name: 'Logistics Depot',
    category: 'area',
    x: 24,
    y: 50,
    description:
      'Western warehouse complex handling cargo and ground equipment. Lower combat priority but steady loot.',
    tags: ['area', 'logistics'],
  },
  {
    id: 'sp-area-radar-array',
    mapId: 'spaceport',
    name: 'Radar Array',
    category: 'area',
    x: 76,
    y: 34,
    description:
      'Cluster of tracking and comm dishes in the northeast. Elevated positions make this a natural overwatch nest.',
    tags: ['area', 'comms'],
  },

  // ── Notable containers / loot rooms ───────────────────────────────────────
  {
    id: 'sp-container-control-lockers',
    mapId: 'spaceport',
    name: 'Control Room Lockers',
    category: 'container',
    x: 46,
    y: 40,
    description:
      'Dense locker bank behind the main launch consoles. Often holds meds and tech components.',
    tags: ['container', 'lockers'],
  },
  {
    id: 'sp-container-hangar-weapon-racks',
    mapId: 'spaceport',
    name: 'Hangar Weapon Racks',
    category: 'container',
    x: 72,
    y: 46,
    description:
      'Weapon cases along the hangar staging area — check before rotating east.',
    tags: ['container', 'weapon'],
  },
  {
    id: 'sp-container-fuel-duffles',
    mapId: 'spaceport',
    name: 'Fuel Line Duffels',
    category: 'container',
    x: 64,
    y: 56,
    description:
      'Duffels tucked alongside fuel piping — easy to miss under the tank scaffolding.',
    tags: ['container', 'duffle'],
  },
  {
    id: 'sp-container-tower-equipment-safe',
    mapId: 'spaceport',
    name: 'Tower Equipment Safe',
    category: 'container',
    x: 50,
    y: 32,
    description:
      'Equipment safe in the tower service level — dense but exposed during access.',
    tags: ['container', 'safe'],
  },
  {
    id: 'sp-container-pad-cache',
    mapId: 'spaceport',
    name: 'Pad Edge Raider Cache',
    category: 'container',
    x: 56,
    y: 50,
    description: 'Hidden stash at the pad perimeter — previous raider drop.',
    tags: ['container', 'cache'],
  },
  {
    id: 'sp-container-med-bay',
    mapId: 'spaceport',
    name: 'Crew Medical Bay',
    category: 'container',
    x: 44,
    y: 60,
    description:
      'Medical supply bags in the crew support module — reliable med run.',
    tags: ['container', 'medical'],
  },
  {
    id: 'sp-container-logistics-crates',
    mapId: 'spaceport',
    name: 'Logistics Crate Wall',
    category: 'container',
    x: 26,
    y: 52,
    description:
      'Stacked logistics crates — good horizontal cover and steady loot.',
    tags: ['container', 'crate'],
  },
  {
    id: 'sp-container-service-backpacks',
    mapId: 'spaceport',
    name: 'Service Tunnel Backpacks',
    category: 'container',
    x: 60,
    y: 74,
    description: 'Easy-to-miss packs left in the southern service corridors.',
    tags: ['container', 'backpack'],
  },

  // ── Loot (high-value loose spawns / specialty rooms) ─────────────────────
  {
    id: 'sp-loot-tech-salvage-pile',
    mapId: 'spaceport',
    name: 'Tech Salvage Pile',
    category: 'loot',
    x: 54,
    y: 34,
    description:
      'Loose avionics and circuit boards scattered below the tower umbilical — high-value carry but heavy weight.',
    tags: ['loot', 'tech'],
  },
  {
    id: 'sp-loot-cryo-locker-row',
    mapId: 'spaceport',
    name: 'Cryo Locker Row',
    category: 'loot',
    x: 40,
    y: 44,
    description:
      'Crew cryo storage bank — sealed lockers with premium biologics and high-tier meds.',
    tags: ['loot', 'cryo'],
  },
  {
    id: 'sp-loot-payload-assembly',
    mapId: 'spaceport',
    name: 'Payload Assembly Parts',
    category: 'loot',
    x: 38,
    y: 54,
    description:
      'Precision components from the clean room staging area — sellable as a full load.',
    tags: ['loot', 'components'],
  },
  {
    id: 'sp-loot-comms-cache',
    mapId: 'spaceport',
    name: 'Comms Equipment Cache',
    category: 'loot',
    x: 78,
    y: 32,
    description:
      'Dismantled comms hardware near the dish array — encryption modules and signal boosters.',
    tags: ['loot', 'comms'],
  },
  {
    id: 'sp-loot-tower-top-crates',
    mapId: 'spaceport',
    name: 'Tower Top Supply Crates',
    category: 'loot',
    x: 52,
    y: 20,
    description:
      'Airdropped crates at the tower apex — premium contents, extreme exposure. Primary draw for Tower Loot runs.',
    tags: ['loot', 'tower'],
    difficulties: ['Tower Loot'],
  },

  // ── ARC spawns ────────────────────────────────────────────────────────────
  {
    id: 'sp-arc-tower-base',
    mapId: 'spaceport',
    name: 'ARC Tower Base Sentry',
    category: 'arc',
    x: 50,
    y: 38,
    description:
      'Stationary ARC sentry guarding the tower access ramp — controls the approach to the lift.',
    tags: ['arc', 'tower'],
  },
  {
    id: 'sp-arc-hangar-patrol',
    mapId: 'spaceport',
    name: 'ARC Hangar Bay Patrol',
    category: 'arc',
    x: 72,
    y: 50,
    description:
      'Two-unit ARC patrol inside the main hangar — route varies but always covers the weapon racks.',
    tags: ['arc', 'hangar'],
  },
  {
    id: 'sp-arc-pad-perimeter',
    mapId: 'spaceport',
    name: 'ARC Pad Perimeter Squad',
    category: 'arc',
    x: 46,
    y: 48,
    description:
      'ARC patrol circling the pad blast zone — aggressive, calls for backup quickly.',
    tags: ['arc', 'pad'],
  },
  {
    id: 'sp-arc-control-approach',
    mapId: 'spaceport',
    name: 'ARC Control Room Guard',
    category: 'arc',
    x: 42,
    y: 36,
    description:
      'Positioned at the main control building entrance — forces a choice between engagement or flanking.',
    tags: ['arc', 'control'],
  },
  {
    id: 'sp-arc-fuel-storm',
    mapId: 'spaceport',
    name: 'ARC Fuel Farm Reinforcement',
    category: 'arc',
    x: 66,
    y: 64,
    description:
      'Extra ARC unit that deploys to the fuel farm during extreme weather. Not present in Normal or Night.',
    tags: ['arc', 'fuel'],
    difficulties: ['Storm', 'Hurricane'],
  },

  // ── Interactions (ziplines, lifts, terminals) ─────────────────────────────
  {
    id: 'sp-interact-tower-elevator',
    mapId: 'spaceport',
    name: 'Launch Tower Elevator',
    category: 'interaction',
    x: 52,
    y: 36,
    description:
      'Powered service elevator running the full height of the launch tower — fastest way up, loudest way in.',
    tags: ['interaction', 'vertical'],
  },
  {
    id: 'sp-interact-tower-zipline',
    mapId: 'spaceport',
    name: 'Tower Descent Zipline',
    category: 'interaction',
    x: 55,
    y: 26,
    description:
      'Emergency descent line from the upper gantry to the west apron — fast extract setup after tower loot.',
    tags: ['interaction', 'zipline'],
  },
  {
    id: 'sp-interact-hangar-crane',
    mapId: 'spaceport',
    name: 'Hangar Overhead Crane',
    category: 'interaction',
    x: 74,
    y: 44,
    description:
      'Overhead crane platform in the main hangar bay — use for vertical repositioning and cover during fights.',
    tags: ['interaction', 'hangar'],
  },
  {
    id: 'sp-interact-supply-terminal',
    mapId: 'spaceport',
    name: 'Supply Call Terminal',
    category: 'interaction',
    x: 44,
    y: 56,
    description:
      'Resupply call terminal near the pad support structure. Activating it signals your position — time carefully.',
    tags: ['interaction', 'supply'],
  },
  {
    id: 'sp-interact-power-panel',
    mapId: 'spaceport',
    name: 'Substation Power Panel',
    category: 'interaction',
    x: 60,
    y: 66,
    description:
      'Main power relay panel in the substation. Toggling it can disable some active systems in the area.',
    tags: ['interaction', 'power'],
  },

  // ── Noise hazards ─────────────────────────────────────────────────────────
  {
    id: 'sp-noise-security-checkpoint',
    mapId: 'spaceport',
    name: 'Security Checkpoint Scanners',
    category: 'noise',
    x: 46,
    y: 42,
    description:
      'Metal detector arches at the control building entry — crouch past or detour through the side corridor.',
    tags: ['noise', 'checkpoint'],
  },
  {
    id: 'sp-noise-camera-array',
    mapId: 'spaceport',
    name: 'Camera Sweep Zone',
    category: 'noise',
    x: 72,
    y: 38,
    description:
      'Rotating surveillance cameras covering the radar array approach — wait for the gap or destroy the unit.',
    tags: ['noise', 'camera'],
  },
  {
    id: 'sp-noise-alarm-tripwire',
    mapId: 'spaceport',
    name: 'Hangar Alarm Tripwire',
    category: 'noise',
    x: 68,
    y: 46,
    description:
      'Laser tripwire across the secondary hangar access door. Triggers a local alarm and ARC response.',
    tags: ['noise', 'tripwire'],
  },

  // ── Nature ────────────────────────────────────────────────────────────────
  {
    id: 'sp-nature-overgrown-fuel-line',
    mapId: 'spaceport',
    name: 'Overgrown Fuel Line',
    category: 'nature',
    x: 62,
    y: 72,
    description:
      'Vegetation and root growth have split open an old fuel conduit. Useful visual cover along the south fuel zone.',
    tags: ['nature', 'fuel'],
  },
  {
    id: 'sp-nature-bird-nests-pad',
    mapId: 'spaceport',
    name: 'Pad Structure Bird Nests',
    category: 'nature',
    x: 48,
    y: 50,
    description:
      'Colonies of birds nesting in the pad superstructure — disturbing them creates sudden audio bursts. Especially active in Bird City.',
    tags: ['nature', 'birds'],
    difficulties: ['Bird City'],
  },
  {
    id: 'sp-nature-moss-apron',
    mapId: 'spaceport',
    name: 'Moss-Covered Launch Apron',
    category: 'nature',
    x: 38,
    y: 60,
    description:
      'Years of moisture have blanketed the southwest apron in moss and creeping vines. Quieter footing than bare concrete.',
    tags: ['nature', 'apron'],
  },
  {
    id: 'sp-nature-wildflower-perimeter',
    mapId: 'spaceport',
    name: 'Wildflower Fence Line',
    category: 'nature',
    x: 82,
    y: 68,
    description:
      'Dense wildflower strip reclaiming the eastern fence perimeter — low concealment but natural visual break.',
    tags: ['nature', 'perimeter'],
    difficulties: ['Lush Blooms'],
  },
];

// Merge curated POIs with extracted MetaForge POIs
export const spaceportPois: MapPoi[] = [...curatedPois, ...spaceportExtractedPois];
