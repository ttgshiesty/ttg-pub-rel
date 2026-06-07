import type { MapPoi } from './poi-types';
import { bluegateExtractedPois } from './blue-gate-extracted';

/**
 * Blue Gate — curated pins (`mapId` matches `MapMeta.id`: `blue-gate`).
 * Percent coordinates, top-left origin. Refine with NEXT_PUBLIC_RF_POI_PLACEMENT=1.
 * Stable ids use the `bg-` prefix.
 *
 * Categories: extract · key · quest · area · container · loot · arc · nature · interaction · noise
 */
const curatedPois: MapPoi[] = [
  // ── Extracts ─────────────────────────────────────────────────────────────
  {
    id: 'bg-extract-north-ridge',
    mapId: 'blue-gate',
    name: 'North Ridge Extract',
    category: 'extract',
    x: 50,
    y: 12,
    description:
      'Northern ridgeline exit — cleanest out after upland fights when the gate plaza is too hot.',
    tags: ['extract', 'north'],
  },
  {
    id: 'bg-extract-northeast-outpost',
    mapId: 'blue-gate',
    name: 'Northeast Outpost Road',
    category: 'extract',
    x: 85,
    y: 24,
    description:
      'Road extract past the northeast checkpoint line. Watch for ARC holdouts at the gate post.',
    tags: ['extract', 'northeast'],
  },
  {
    id: 'bg-extract-east-perimeter',
    mapId: 'blue-gate',
    name: 'East Perimeter Extract',
    category: 'extract',
    x: 90,
    y: 50,
    description:
      'Open east fence line — long sightlines expose you early. Best used as a quick out with low carry weight.',
    tags: ['extract', 'east'],
  },
  {
    id: 'bg-extract-south-gate',
    mapId: 'blue-gate',
    name: 'South Gate Extract',
    category: 'extract',
    x: 48,
    y: 86,
    description:
      'Southern gate approach — common match-end rotation when the north is locked down.',
    tags: ['extract', 'south'],
  },
  {
    id: 'bg-extract-southwest-ravine',
    mapId: 'blue-gate',
    name: 'Southwest Ravine Extract',
    category: 'extract',
    x: 18,
    y: 76,
    description:
      'Low-ground exit through broken terrain. Slow but sheltered — good when you need a quiet escape.',
    tags: ['extract', 'southwest'],
  },
  {
    id: 'bg-extract-west-trail',
    mapId: 'blue-gate',
    name: 'West Trail Extract',
    category: 'extract',
    x: 12,
    y: 46,
    description:
      'Western trailhead — pairs well with mine adit and river ford loot routes.',
    tags: ['extract', 'west'],
  },
  {
    id: 'bg-extract-northwest-watch',
    mapId: 'blue-gate',
    name: 'Northwest Watchtower Extract',
    category: 'extract',
    x: 22,
    y: 20,
    description:
      'Watchtower-adjacent extraction on the high northwest corner. Fast out if you control the ridge.',
    tags: ['extract', 'northwest'],
  },

  // ── Keys & access ─────────────────────────────────────────────────────────
  {
    id: 'bg-key-command-bunker',
    mapId: 'blue-gate',
    name: 'Command Bunker',
    category: 'key',
    x: 52,
    y: 44,
    description:
      'Fortified command node at the map center — inner offices and ops rooms are keyed.',
    tags: ['key', 'command'],
  },
  {
    id: 'bg-key-supply-depot',
    mapId: 'blue-gate',
    name: 'Supply Depot Cage',
    category: 'key',
    x: 64,
    y: 38,
    description:
      'Depot rear cages and tool lockers behind key doors — good weapon component density.',
    tags: ['key', 'depot'],
  },
  {
    id: 'bg-key-radar-shack',
    mapId: 'blue-gate',
    name: 'Radar Relay Shack',
    category: 'key',
    x: 38,
    y: 32,
    description:
      'Elevated relay building with a keyed rooftop hatch and comms equipment inside.',
    tags: ['key', 'comms'],
  },
  {
    id: 'bg-key-perimeter-armory',
    mapId: 'blue-gate',
    name: 'Perimeter Armory',
    category: 'key',
    x: 72,
    y: 58,
    description:
      'Outer wall armory wing — keyed weapon storage, reliable for attachments and ammo.',
    tags: ['key', 'armory'],
  },
  {
    id: 'bg-key-mine-adit',
    mapId: 'blue-gate',
    name: 'Mine Adit Gate',
    category: 'key',
    x: 34,
    y: 62,
    description:
      'Sealed adit into the hillside mine workings — shortcuts west and opens a cache room inside.',
    tags: ['key', 'tunnel'],
  },
  {
    id: 'bg-key-field-hospital',
    mapId: 'blue-gate',
    name: 'Field Hospital Lockup',
    category: 'key',
    x: 58,
    y: 68,
    description:
      'Triage wing with a locked pharmacy and supply storage — best med haul on the map.',
    tags: ['key', 'medical'],
  },

  // ── Quest landmarks ───────────────────────────────────────────────────────
  {
    id: 'bg-quest-gate-plaza',
    mapId: 'blue-gate',
    name: 'Gate Plaza Objectives',
    category: 'quest',
    x: 50,
    y: 48,
    description:
      'Central plaza beneath the gate arch — scans, eliminations, and uplink objectives cluster here.',
    tags: ['quest', 'plaza'],
  },
  {
    id: 'bg-quest-patrol-corridor',
    mapId: 'blue-gate',
    name: 'Patrol Corridor Loop',
    category: 'quest',
    x: 62,
    y: 52,
    description:
      'ARC patrol contracts frequently track through this corridor arc east of the command bunker.',
    tags: ['quest', 'patrol'],
  },
  {
    id: 'bg-quest-ridge-recon',
    mapId: 'blue-gate',
    name: 'Ridge Recon Line',
    category: 'quest',
    x: 44,
    y: 28,
    description:
      'Recon and beacon objectives along the high ground — best run after clearing the watchtower.',
    tags: ['quest', 'ridge'],
  },
  {
    id: 'bg-quest-river-ford',
    mapId: 'blue-gate',
    name: 'River Ford Crossing',
    category: 'quest',
    x: 30,
    y: 54,
    description:
      'Sample and courier objectives near the shallow ford — low contest zone on most runs.',
    tags: ['quest', 'river'],
  },
  {
    id: 'bg-quest-downed-convoy',
    mapId: 'blue-gate',
    name: 'Downed Convoy Site',
    category: 'quest',
    x: 76,
    y: 42,
    description:
      'Salvage and investigation objectives around the wrecked convoy east of the supply depot.',
    tags: ['quest', 'salvage'],
  },
  {
    id: 'bg-quest-listening-post',
    mapId: 'blue-gate',
    name: 'Listening Post',
    category: 'quest',
    x: 40,
    y: 40,
    description:
      'Uplink-style objectives at the improvised listening array — moderate exposure on approach.',
    tags: ['quest', 'comms'],
  },
  {
    id: 'bg-quest-border-cache',
    mapId: 'blue-gate',
    name: 'Border Cache Marker',
    category: 'quest',
    x: 68,
    y: 30,
    description:
      'Dead-drop and tracking objectives along the contested border ridge.',
    tags: ['quest', 'cache'],
  },

  // ── Named areas ───────────────────────────────────────────────────────────
  {
    id: 'bg-area-blue-gate-arch',
    mapId: 'blue-gate',
    name: 'Blue Gate Arch',
    category: 'area',
    x: 50,
    y: 46,
    description:
      'The namesake gateway structure — a massive reinforced arch marking the mountain pass frontier. Controls map center and funnels most rotations.',
    tags: ['area', 'gate'],
  },
  {
    id: 'bg-area-command-complex',
    mapId: 'blue-gate',
    name: 'Command Complex',
    category: 'area',
    x: 52,
    y: 52,
    description:
      'Fortified command and operations compound adjacent to the arch. Highest loot density and most contested indoor space on the map.',
    tags: ['area', 'command'],
  },
  {
    id: 'bg-area-north-ridge',
    mapId: 'blue-gate',
    name: 'North Ridge',
    category: 'area',
    x: 46,
    y: 22,
    description:
      'Elevated rocky ridgeline dominating the northern half. Extreme overwatch reach — whoever holds this controls long-range engagements.',
    tags: ['area', 'ridge'],
  },
  {
    id: 'bg-area-supply-depot',
    mapId: 'blue-gate',
    name: 'Supply Depot',
    category: 'area',
    x: 66,
    y: 38,
    description:
      'Military logistics compound east of the gate. Dense crates, vehicle bays, and keyed rear storage.',
    tags: ['area', 'depot'],
  },
  {
    id: 'bg-area-mine-workings',
    mapId: 'blue-gate',
    name: 'Mine Workings',
    category: 'area',
    x: 30,
    y: 60,
    description:
      'Hillside mining tunnels and adit entrances on the western slopes. Dark, disorienting, and full of mineral loot.',
    tags: ['area', 'mine'],
  },
  {
    id: 'bg-area-river-valley',
    mapId: 'blue-gate',
    name: 'River Valley',
    category: 'area',
    x: 28,
    y: 54,
    description:
      'Low-lying valley floor with the river ford crossing. Natural vegetation cover — quieter contest than the ridges.',
    tags: ['area', 'river'],
  },
  {
    id: 'bg-area-eastern-outpost',
    mapId: 'blue-gate',
    name: 'Eastern Outpost',
    category: 'area',
    x: 80,
    y: 36,
    description:
      'Perimeter checkpoint and outpost cluster on the east edge. Good secondary loot loop with the downed convoy nearby.',
    tags: ['area', 'outpost'],
  },

  // ── Notable containers / loot rooms ───────────────────────────────────────
  {
    id: 'bg-container-command-lockers',
    mapId: 'blue-gate',
    name: 'Command Locker Row',
    category: 'container',
    x: 54,
    y: 46,
    description:
      'Dense lockers in the command annex — consistent tech and weapon parts.',
    tags: ['container', 'lockers'],
  },
  {
    id: 'bg-container-depot-crates',
    mapId: 'blue-gate',
    name: 'Depot Crate Yard',
    category: 'container',
    x: 66,
    y: 36,
    description:
      'Outdoor military crates in the depot yard — fast loot but loud and exposed.',
    tags: ['container', 'crate'],
  },
  {
    id: 'bg-container-ridge-duffles',
    mapId: 'blue-gate',
    name: 'Ridge Duffle Line',
    category: 'container',
    x: 46,
    y: 26,
    description:
      'Scattered duffels along the ridge approach trail — easy pickup on the way through.',
    tags: ['container', 'duffle'],
  },
  {
    id: 'bg-container-bunker-safe',
    mapId: 'blue-gate',
    name: 'Bunker Floor Safe',
    category: 'container',
    x: 50,
    y: 56,
    description: 'Lower bunker safe room — slow clear but high-value contents.',
    tags: ['container', 'safe'],
  },
  {
    id: 'bg-container-outpost-cache',
    mapId: 'blue-gate',
    name: 'Outpost Raider Cache',
    category: 'container',
    x: 78,
    y: 48,
    description:
      'Hidden cache stack near the perimeter fencing — east flank bonus loot.',
    tags: ['container', 'cache'],
  },
  {
    id: 'bg-container-tent-medical',
    mapId: 'blue-gate',
    name: 'Tent Medical Bags',
    category: 'container',
    x: 56,
    y: 64,
    description: 'Field tent medical spawns near the hospital triage zone.',
    tags: ['container', 'medical'],
  },
  {
    id: 'bg-container-watch-weapon-case',
    mapId: 'blue-gate',
    name: 'Watchtower Weapon Case',
    category: 'container',
    x: 36,
    y: 34,
    description:
      'Elevated weapon case inside the watchtower — climb tax, worth it for attachments.',
    tags: ['container', 'weapon'],
  },
  {
    id: 'bg-container-trail-backpacks',
    mapId: 'blue-gate',
    name: 'Trail Backpack Spawns',
    category: 'container',
    x: 24,
    y: 48,
    description:
      'Solo packs along the western trail — consistent but easy to skip.',
    tags: ['container', 'backpack'],
  },

  // ── Loot (high-value loose spawns / specialty rooms) ─────────────────────
  {
    id: 'bg-loot-mine-ore-cache',
    mapId: 'blue-gate',
    name: 'Mine Ore Cache',
    category: 'loot',
    x: 32,
    y: 64,
    description:
      'Processed mineral ore stockpiled deep in the mine — heavy carry, high sell value.',
    tags: ['loot', 'mine'],
  },
  {
    id: 'bg-loot-command-intel-files',
    mapId: 'blue-gate',
    name: 'Command Intel Files',
    category: 'loot',
    x: 52,
    y: 48,
    description:
      'Dossiers and encrypted drives in the command ops room — mission-critical sell items.',
    tags: ['loot', 'intel'],
  },
  {
    id: 'bg-loot-convoy-salvage',
    mapId: 'blue-gate',
    name: 'Convoy Salvage Parts',
    category: 'loot',
    x: 76,
    y: 44,
    description:
      'Vehicle components and cargo scattered across the downed convoy — good weight-to-value ratio.',
    tags: ['loot', 'salvage'],
  },
  {
    id: 'bg-loot-hospital-pharmaceuticals',
    mapId: 'blue-gate',
    name: 'Hospital Pharmaceuticals',
    category: 'loot',
    x: 58,
    y: 70,
    description:
      'Rare pharmaceutical stocks in the locked hospital storage — some of the best med-adjacent loot on the map.',
    tags: ['loot', 'medical'],
  },
  {
    id: 'bg-loot-uncovered-drop',
    mapId: 'blue-gate',
    name: 'Uncovered Cache Drop',
    category: 'loot',
    x: 42,
    y: 58,
    description:
      'Buried supply drop exposed during Uncovered Caches — worth a dedicated detour.',
    tags: ['loot', 'cache'],
    difficulties: ['Uncovered Caches'],
  },

  // ── ARC spawns ────────────────────────────────────────────────────────────
  {
    id: 'bg-arc-gate-arch-guard',
    mapId: 'blue-gate',
    name: 'ARC Arch Gatehouse Guard',
    category: 'arc',
    x: 50,
    y: 44,
    description:
      'Pair of ARC sentries holding the gate arch passage — unavoidable if you route through center.',
    tags: ['arc', 'gate'],
  },
  {
    id: 'bg-arc-command-squad',
    mapId: 'blue-gate',
    name: 'ARC Command Squad',
    category: 'arc',
    x: 54,
    y: 52,
    description:
      'Three-unit squad defending the command complex interior — heaviest concentration on the map.',
    tags: ['arc', 'command'],
  },
  {
    id: 'bg-arc-depot-patrol',
    mapId: 'blue-gate',
    name: 'ARC Depot Patrol',
    category: 'arc',
    x: 68,
    y: 40,
    description:
      'Roaming patrol through the supply depot yard — route loops the crate yard and armory approach.',
    tags: ['arc', 'depot'],
  },
  {
    id: 'bg-arc-ridge-sniper',
    mapId: 'blue-gate',
    name: 'ARC Ridge Sniper Post',
    category: 'arc',
    x: 44,
    y: 24,
    description:
      'Long-range ARC unit dug into the north ridge — clears the northern extract routes if unchecked.',
    tags: ['arc', 'ridge'],
  },
  {
    id: 'bg-arc-storm-reinforcement',
    mapId: 'blue-gate',
    name: 'ARC Storm Reinforcement',
    category: 'arc',
    x: 60,
    y: 46,
    description:
      'Extra ARC squad that deploys to the gate plaza during Storm and Hurricane. Not present in Normal or Night.',
    tags: ['arc', 'storm'],
    difficulties: ['Storm', 'Hurricane'],
  },

  // ── Interactions (ziplines, lifts, terminals) ─────────────────────────────
  {
    id: 'bg-interact-ridge-zipline',
    mapId: 'blue-gate',
    name: 'Ridge Descent Zipline',
    category: 'interaction',
    x: 46,
    y: 28,
    description:
      'Zipline from the north ridge to the valley floor — quick elevation drop into the ford area.',
    tags: ['interaction', 'zipline'],
  },
  {
    id: 'bg-interact-mine-elevator',
    mapId: 'blue-gate',
    name: 'Mine Shaft Elevator',
    category: 'interaction',
    x: 30,
    y: 62,
    description:
      'Powered shaft elevator inside the mine workings — bypasses the long tunnel approach from the surface.',
    tags: ['interaction', 'vertical'],
  },
  {
    id: 'bg-interact-supply-terminal',
    mapId: 'blue-gate',
    name: 'Supply Call Terminal',
    category: 'interaction',
    x: 64,
    y: 42,
    description:
      'Resupply call terminal in the depot loading bay — activating it broadcasts your position.',
    tags: ['interaction', 'supply'],
  },
  {
    id: 'bg-interact-watchtower-ladder',
    mapId: 'blue-gate',
    name: 'Watchtower External Ladder',
    category: 'interaction',
    x: 38,
    y: 36,
    description:
      'External ladder giving fast access to the watchtower top. Loud to climb — plan the approach.',
    tags: ['interaction', 'vertical'],
  },
  {
    id: 'bg-interact-gate-winch',
    mapId: 'blue-gate',
    name: 'Gate Winch Control',
    category: 'interaction',
    x: 52,
    y: 46,
    description:
      'Mechanical winch panel that operates the inner gate barrier — opens a vehicle-width passage through center.',
    tags: ['interaction', 'gate'],
  },

  // ── Noise hazards ─────────────────────────────────────────────────────────
  {
    id: 'bg-noise-gate-scanners',
    mapId: 'blue-gate',
    name: 'Gate Arch Scanners',
    category: 'noise',
    x: 50,
    y: 47,
    description:
      'Security scanner array embedded in the arch pillars — triggers an alert if you walk through standing. Crouch or loop around.',
    tags: ['noise', 'scanner'],
  },
  {
    id: 'bg-noise-depot-cameras',
    mapId: 'blue-gate',
    name: 'Depot Surveillance Cameras',
    category: 'noise',
    x: 66,
    y: 34,
    description:
      'Cameras covering the depot yard perimeter. Time your approach between sweeps or destroy the unit.',
    tags: ['noise', 'camera'],
  },
  {
    id: 'bg-noise-mine-tripwire',
    mapId: 'blue-gate',
    name: 'Mine Entrance Tripwire',
    category: 'noise',
    x: 32,
    y: 60,
    description:
      'Tripwire strung across the mine adit entrance — triggers a loud alarm that pulls the nearby ARC patrol.',
    tags: ['noise', 'tripwire'],
  },

  // ── Nature ────────────────────────────────────────────────────────────────
  {
    id: 'bg-nature-mountain-stream',
    mapId: 'blue-gate',
    name: 'Mountain Stream Crossing',
    category: 'nature',
    x: 28,
    y: 52,
    description:
      'Rocky stream feeding into the river ford — wading through creates audio splash. Cross at the stones to stay quiet.',
    tags: ['nature', 'water'],
  },
  {
    id: 'bg-nature-ridge-pines',
    mapId: 'blue-gate',
    name: 'Ridge Pine Stand',
    category: 'nature',
    x: 42,
    y: 20,
    description:
      'Dense pine tree stand on the upper ridge — natural concealment for flanking and overwatch positions.',
    tags: ['nature', 'trees'],
  },
  {
    id: 'bg-nature-alpine-bloom-field',
    mapId: 'blue-gate',
    name: 'Alpine Bloom Field',
    category: 'nature',
    x: 24,
    y: 36,
    description:
      'Seasonal wildflower meadow on the western slopes. Expanded during Lush Blooms — beautiful and very visible cover.',
    tags: ['nature', 'flowers'],
    difficulties: ['Lush Blooms'],
  },
  {
    id: 'bg-nature-bird-colony',
    mapId: 'blue-gate',
    name: 'Ridge Bird Colony',
    category: 'nature',
    x: 48,
    y: 18,
    description:
      'Large bird roosting colony along the cliff face — disturbing them creates a loud audio burst. Especially dense in Bird City.',
    tags: ['nature', 'birds'],
    difficulties: ['Bird City'],
  },
];

// Merge curated POIs with extracted MetaForge POIs
export const blueGatePois: MapPoi[] = [...curatedPois, ...bluegateExtractedPois];
