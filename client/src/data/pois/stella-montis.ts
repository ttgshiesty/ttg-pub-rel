import type { MapPoi } from './poi-types';
import { stellamontisExtractedPois } from './stella-montis-extracted';

/**
 * Stella Montis — multi-floor curated pins (`mapId`: `stella-montis`).
 *
 * `floorIndex` aligns with `MapMeta.floors` / `activeFloor` in NativeMapExplorer:
 *   - `0`       → Upper Level (tile layer `stella-montis-l2`)
 *   - `1`       → Lower Level (tile layer `stella-montis-l1`)
 *   - (omitted) → Shown on BOTH floors (cross-floor landmarks)
 *
 * Refine positions with NEXT_PUBLIC_RF_POI_PLACEMENT=1 (toggle floor, then sample).
 * Stable ids use the `sm-` prefix.
 *
 * Categories: extract · key · quest · area · container · loot · arc · nature · interaction · noise
 */
const curatedPois: MapPoi[] = [
  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  EXTRACTS                                                            ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  // ── Upper (floor 0) ───────────────────────────────────────────────────
  {
    id: 'sm-extract-upper-north-ridge',
    mapId: 'stella-montis',
    name: 'Upper North Ridge Extract',
    category: 'extract',
    floorIndex: 0,
    x: 52,
    y: 14,
    description:
      'Northern ridgeline exit from the upper level — exposed to roof rotations, but fastest out when the atrium is contested.',
    tags: ['extract', 'upper', 'north'],
  },
  {
    id: 'sm-extract-upper-east-terrace',
    mapId: 'stella-montis',
    name: 'Upper East Terrace Extract',
    category: 'extract',
    floorIndex: 0,
    x: 86,
    y: 42,
    description:
      'Outdoor terrace extraction on the upper east deck. Watch the ridge overhang before committing.',
    tags: ['extract', 'upper', 'east'],
  },
  {
    id: 'sm-extract-upper-south-bridge',
    mapId: 'stella-montis',
    name: 'Upper South Bridge Extract',
    category: 'extract',
    floorIndex: 0,
    x: 48,
    y: 82,
    description:
      'Skybridge exit on the upper south — long crossing, but it bypasses the atrium choke entirely.',
    tags: ['extract', 'upper', 'south'],
  },
  {
    id: 'sm-extract-upper-west-access',
    mapId: 'stella-montis',
    name: 'Upper West Access Extract',
    category: 'extract',
    floorIndex: 0,
    x: 14,
    y: 48,
    description:
      'Western upper exterior ledge — tight but sheltered. Good when east and south routes are locked down.',
    tags: ['extract', 'upper', 'west'],
  },

  // ── Lower (floor 1) ───────────────────────────────────────────────────
  {
    id: 'sm-extract-lower-north-tunnel',
    mapId: 'stella-montis',
    name: 'Lower North Tunnel Extract',
    category: 'extract',
    floorIndex: 1,
    x: 50,
    y: 12,
    description:
      'Lower maintenance tunnel exit toward the north. Winding approach makes it hard to intercept.',
    tags: ['extract', 'lower', 'north'],
  },
  {
    id: 'sm-extract-lower-east-garage',
    mapId: 'stella-montis',
    name: 'Lower East Garage Extract',
    category: 'extract',
    floorIndex: 1,
    x: 88,
    y: 52,
    description:
      'Sub-level vehicle garage bay extraction. Open floor — do not linger near the doors.',
    tags: ['extract', 'lower', 'east'],
  },
  {
    id: 'sm-extract-lower-south-vent',
    mapId: 'stella-montis',
    name: 'Lower South Vent Extract',
    category: 'extract',
    floorIndex: 1,
    x: 46,
    y: 86,
    description:
      'Ventilation annex exit on the lower south perimeter — tight sightlines inside but safe once through.',
    tags: ['extract', 'lower', 'south'],
  },

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  KEYS & ACCESS                                                       ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  // ── Upper (floor 0) ───────────────────────────────────────────────────
  {
    id: 'sm-key-upper-director-suite',
    mapId: 'stella-montis',
    name: 'Director Suite',
    category: 'key',
    floorIndex: 0,
    x: 44,
    y: 38,
    description:
      'Executive ring — keyed inner offices and a secure data terminal with top-tier intel loot.',
    tags: ['key', 'upper', 'admin'],
  },
  {
    id: 'sm-key-upper-lab-alpha',
    mapId: 'stella-montis',
    name: 'Research Lab Alpha',
    category: 'key',
    floorIndex: 0,
    x: 62,
    y: 34,
    description:
      'Primary upper research lab — biohazard lock and specimen vault inside.',
    tags: ['key', 'upper', 'lab'],
  },
  {
    id: 'sm-key-upper-observatory',
    mapId: 'stella-montis',
    name: 'Observatory Dome Lock',
    category: 'key',
    floorIndex: 0,
    x: 36,
    y: 28,
    description:
      'Dome access hatch — keycard controlled, high-value tech and optical equipment inside.',
    tags: ['key', 'upper', 'dome'],
  },

  // ── Lower (floor 1) ───────────────────────────────────────────────────
  {
    id: 'sm-key-lower-reactor-mech',
    mapId: 'stella-montis',
    name: 'Reactor Mech Room',
    category: 'key',
    floorIndex: 1,
    x: 54,
    y: 48,
    description:
      'Lower reactor service area — heavy blast doors, valuable component loot inside.',
    tags: ['key', 'lower', 'reactor'],
  },
  {
    id: 'sm-key-lower-archive-vault',
    mapId: 'stella-montis',
    name: 'Archive Vault',
    category: 'key',
    floorIndex: 1,
    x: 32,
    y: 58,
    description:
      'Cold storage archive with a dual-lock inner vault — classified documents and encrypted drives.',
    tags: ['key', 'lower', 'archive'],
  },
  {
    id: 'sm-key-lower-transit-hub',
    mapId: 'stella-montis',
    name: 'Transit Hub Gate',
    category: 'key',
    floorIndex: 1,
    x: 70,
    y: 44,
    description:
      'Central gatehouse connecting lower sectors — keyed barrier controls movement between server hall and quarantine wing.',
    tags: ['key', 'lower', 'transit'],
  },

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  QUEST LANDMARKS                                                     ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  // ── Upper (floor 0) ───────────────────────────────────────────────────
  {
    id: 'sm-quest-upper-atrium',
    mapId: 'stella-montis',
    name: 'Upper Atrium Objectives',
    category: 'quest',
    floorIndex: 0,
    x: 50,
    y: 50,
    description:
      'Main upper atrium — scans, uplinks, and elimination objectives stack heavily here. Expect the most competition.',
    tags: ['quest', 'upper'],
  },
  {
    id: 'sm-quest-upper-harvester-ring',
    mapId: 'stella-montis',
    name: 'Upper Harvester Ring',
    category: 'quest',
    floorIndex: 0,
    x: 68,
    y: 58,
    description:
      'ARC Harvester patrol loop on the upper ring road — elimination quests frequently resolve here.',
    tags: ['quest', 'upper', 'harvester'],
  },
  {
    id: 'sm-quest-upper-roof-uplink',
    mapId: 'stella-montis',
    name: 'Roof Uplink Array',
    category: 'quest',
    floorIndex: 0,
    x: 58,
    y: 22,
    description:
      'Beacon and uplink contracts on the rooftop antenna infrastructure — fully exposed, best done fast.',
    tags: ['quest', 'upper', 'comms'],
  },

  // ── Lower (floor 1) ───────────────────────────────────────────────────
  {
    id: 'sm-quest-lower-coolant',
    mapId: 'stella-montis',
    name: 'Coolant Gallery Objectives',
    category: 'quest',
    floorIndex: 1,
    x: 48,
    y: 52,
    description:
      'Sample and sabotage steps threading through the coolant gallery pipes — narrow corridors, ARC patrols tight.',
    tags: ['quest', 'lower'],
  },
  {
    id: 'sm-quest-lower-server-farm',
    mapId: 'stella-montis',
    name: 'Server Farm Sweep',
    category: 'quest',
    floorIndex: 1,
    x: 64,
    y: 36,
    description:
      'Data recovery and wipe quests cluster in the server hall — multiple objectives spread across the aisles.',
    tags: ['quest', 'lower', 'tech'],
  },
  {
    id: 'sm-quest-lower-quarantine',
    mapId: 'stella-montis',
    name: 'Quarantine Wing Contracts',
    category: 'quest',
    floorIndex: 1,
    x: 28,
    y: 44,
    description:
      'Isolation wing clearance and escort beats — ARC units inside are on high alert.',
    tags: ['quest', 'lower', 'medical'],
  },

  // ── Both floors (no floorIndex) ───────────────────────────────────────
  {
    id: 'sm-quest-central-shaft',
    mapId: 'stella-montis',
    name: 'Central Access Shaft',
    category: 'quest',
    x: 50,
    y: 54,
    description:
      'The vertical spine connecting both facility levels. Cross-floor survey and courier quests route through here.',
    tags: ['quest', 'facility', 'both'],
  },

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  NAMED AREAS                                                         ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  // ── Upper (floor 0) ───────────────────────────────────────────────────
  {
    id: 'sm-area-research-atrium',
    mapId: 'stella-montis',
    name: 'Research Atrium',
    category: 'area',
    floorIndex: 0,
    x: 50,
    y: 48,
    description:
      'Soaring glass-and-steel atrium spanning the upper facility core. Primary contest zone — flanked by the lab wing and executive ring.',
    tags: ['area', 'upper', 'atrium'],
  },
  {
    id: 'sm-area-observatory-dome',
    mapId: 'stella-montis',
    name: 'Observatory Dome',
    category: 'area',
    floorIndex: 0,
    x: 34,
    y: 26,
    description:
      'Large astronomical dome on the north upper wing. Keycard access, dense tech loot, and elevated positions with partial roof overwatch.',
    tags: ['area', 'upper', 'dome'],
  },
  {
    id: 'sm-area-executive-ring',
    mapId: 'stella-montis',
    name: 'Executive Ring',
    category: 'area',
    floorIndex: 0,
    x: 42,
    y: 40,
    description:
      'Upper-floor administrative corridor with director offices, a secure terminal room, and the director suite keycard room.',
    tags: ['area', 'upper', 'admin'],
  },
  {
    id: 'sm-area-upper-terrace',
    mapId: 'stella-montis',
    name: 'Upper Terrace',
    category: 'area',
    floorIndex: 0,
    x: 80,
    y: 46,
    description:
      'Outdoor elevated terrace on the east side — wind-swept, open sightlines toward the ridge. Secondary loot and a clean extract path.',
    tags: ['area', 'upper', 'outdoor'],
  },
  {
    id: 'sm-area-upper-lab-wing',
    mapId: 'stella-montis',
    name: 'Lab Wing',
    category: 'area',
    floorIndex: 0,
    x: 64,
    y: 36,
    description:
      'Upper research lab corridor with Lab Alpha and multiple keyed specimen rooms. Highest item density on the upper floor.',
    tags: ['area', 'upper', 'lab'],
  },

  // ── Lower (floor 1) ───────────────────────────────────────────────────
  {
    id: 'sm-area-reactor-core',
    mapId: 'stella-montis',
    name: 'Reactor Core',
    category: 'area',
    floorIndex: 1,
    x: 54,
    y: 46,
    description:
      'Central lower-level power plant. Heavy blast-door access, radiation warning signage, and the densest ARC presence on the lower floor.',
    tags: ['area', 'lower', 'reactor'],
  },
  {
    id: 'sm-area-server-hall',
    mapId: 'stella-montis',
    name: 'Server Hall',
    category: 'area',
    floorIndex: 1,
    x: 66,
    y: 36,
    description:
      'Rows of server racks stretching across the lower east wing. Good data drive loot, multiple quest beats, and sight-blocking cover throughout.',
    tags: ['area', 'lower', 'tech'],
  },
  {
    id: 'sm-area-quarantine-wing',
    mapId: 'stella-montis',
    name: 'Quarantine Wing',
    category: 'area',
    floorIndex: 1,
    x: 26,
    y: 44,
    description:
      'Sealed isolation wing in the lower west. Narrow corridors with med loot and high-alert ARC units — pre-clear before looting.',
    tags: ['area', 'lower', 'medical'],
  },
  {
    id: 'sm-area-coolant-gallery',
    mapId: 'stella-montis',
    name: 'Coolant Gallery',
    category: 'area',
    floorIndex: 1,
    x: 46,
    y: 56,
    description:
      'Industrial pipe network running coolant through the lower facility. Tight chokepoints, loud underfoot — use the maintenance catwalks when possible.',
    tags: ['area', 'lower', 'pipes'],
  },

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  CONTAINERS                                                          ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  // ── Upper (floor 0) ───────────────────────────────────────────────────
  {
    id: 'sm-container-upper-locker-bank',
    mapId: 'stella-montis',
    name: 'Upper Locker Bank',
    category: 'container',
    floorIndex: 0,
    x: 56,
    y: 46,
    description:
      'Staff lockers near the upper concourse — reliable tech parts and meds.',
    tags: ['container', 'upper', 'lockers'],
  },
  {
    id: 'sm-container-upper-lab-crates',
    mapId: 'stella-montis',
    name: 'Upper Lab Crates',
    category: 'container',
    floorIndex: 0,
    x: 66,
    y: 40,
    description:
      'Sealed research crates in the upper lab wing — components inside vary by run.',
    tags: ['container', 'upper', 'crate'],
  },
  {
    id: 'sm-container-upper-office-safe',
    mapId: 'stella-montis',
    name: 'Upper Office Safe',
    category: 'container',
    floorIndex: 0,
    x: 42,
    y: 42,
    description:
      'Admin room floor safe — slow clear but consistent high-value content.',
    tags: ['container', 'upper', 'safe'],
  },
  {
    id: 'sm-container-upper-terrace-cache',
    mapId: 'stella-montis',
    name: 'Upper Terrace Cache',
    category: 'container',
    floorIndex: 0,
    x: 78,
    y: 50,
    description:
      'Outdoor cache tucked behind terrace HVAC units — easy to miss, worth the detour.',
    tags: ['container', 'upper', 'cache'],
  },

  // ── Lower (floor 1) ───────────────────────────────────────────────────
  {
    id: 'sm-container-lower-tool-wall',
    mapId: 'stella-montis',
    name: 'Lower Tool Wall',
    category: 'container',
    floorIndex: 1,
    x: 52,
    y: 62,
    description:
      'Maintenance tool cabinets along the lower ring corridor — steady mid-tier loot.',
    tags: ['container', 'lower', 'lockers'],
  },
  {
    id: 'sm-container-lower-duffle-tunnel',
    mapId: 'stella-montis',
    name: 'Lower Tunnel Duffels',
    category: 'container',
    floorIndex: 1,
    x: 40,
    y: 68,
    description:
      'Duffels left along the lower service tunnel — easy pickup, low contest.',
    tags: ['container', 'lower', 'duffle'],
  },
  {
    id: 'sm-container-lower-reactor-lockers',
    mapId: 'stella-montis',
    name: 'Reactor Locker Room',
    category: 'container',
    floorIndex: 1,
    x: 58,
    y: 44,
    description:
      'Radiation-adjacent crew lockers — high-value but ARC-contested approach.',
    tags: ['container', 'lower', 'lockers'],
  },
  {
    id: 'sm-container-lower-med-stash',
    mapId: 'stella-montis',
    name: 'Lower Medical Stash',
    category: 'container',
    floorIndex: 1,
    x: 34,
    y: 52,
    description:
      'Medical supply bags in the quarantine wing support area — reliable med run on the lower floor.',
    tags: ['container', 'lower', 'medical'],
  },

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  LOOT (high-value loose spawns / specialty rooms)                   ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  // ── Upper (floor 0) ───────────────────────────────────────────────────
  {
    id: 'sm-loot-observatory-tech',
    mapId: 'stella-montis',
    name: 'Observatory Instrument Cache',
    category: 'loot',
    floorIndex: 0,
    x: 34,
    y: 30,
    description:
      'Precision astronomical instruments and optics components inside the dome — heavy, but among the highest-value tech on the map.',
    tags: ['loot', 'upper', 'tech'],
  },
  {
    id: 'sm-loot-director-intel',
    mapId: 'stella-montis',
    name: 'Director Intel Cache',
    category: 'loot',
    floorIndex: 0,
    x: 44,
    y: 36,
    description:
      'Classified research dossiers and encrypted drives in the director suite — mission-critical sell items that need the key to reach.',
    tags: ['loot', 'upper', 'intel'],
  },
  {
    id: 'sm-loot-lab-specimens',
    mapId: 'stella-montis',
    name: 'Lab Specimen Vault',
    category: 'loot',
    floorIndex: 0,
    x: 64,
    y: 32,
    description:
      'Preserved biological specimens in sealed containers — niche but high-value for the right quest or vendor.',
    tags: ['loot', 'upper', 'lab'],
  },

  // ── Lower (floor 1) ───────────────────────────────────────────────────
  {
    id: 'sm-loot-reactor-components',
    mapId: 'stella-montis',
    name: 'Reactor Component Parts',
    category: 'loot',
    floorIndex: 1,
    x: 56,
    y: 50,
    description:
      'Stripped reactor hardware and control modules — heavy, expensive, and guarded by the most aggressive ARC on the lower floor.',
    tags: ['loot', 'lower', 'reactor'],
  },
  {
    id: 'sm-loot-server-drives',
    mapId: 'stella-montis',
    name: 'Server Data Drives',
    category: 'loot',
    floorIndex: 1,
    x: 66,
    y: 38,
    description:
      'Extracted server drives stacked in the hall — fast to grab individually, good carry efficiency.',
    tags: ['loot', 'lower', 'tech'],
  },
  {
    id: 'sm-loot-cryo-samples',
    mapId: 'stella-montis',
    name: 'Cryogenic Sample Storage',
    category: 'loot',
    floorIndex: 1,
    x: 30,
    y: 56,
    description:
      'Cryogenic biological sample containers in the archive cold room — specialty loot with the highest per-slot value on the map.',
    tags: ['loot', 'lower', 'cryo'],
  },

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  ARC SPAWNS                                                          ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  // ── Upper (floor 0) ───────────────────────────────────────────────────
  {
    id: 'sm-arc-atrium-patrol',
    mapId: 'stella-montis',
    name: 'ARC Atrium Patrol',
    category: 'arc',
    floorIndex: 0,
    x: 52,
    y: 52,
    description:
      'Two-unit ARC patrol sweeping the upper atrium — main engagement on the upper floor, always present.',
    tags: ['arc', 'upper', 'atrium'],
  },
  {
    id: 'sm-arc-rooftop-sentry',
    mapId: 'stella-montis',
    name: 'ARC Rooftop Sentry',
    category: 'arc',
    floorIndex: 0,
    x: 58,
    y: 20,
    description:
      'Single ARC sentry posted on the roof platform — controls the uplink array approach and the north ridge extract.',
    tags: ['arc', 'upper', 'roof'],
  },
  {
    id: 'sm-arc-lab-wing-guard',
    mapId: 'stella-montis',
    name: 'ARC Lab Wing Guard',
    category: 'arc',
    floorIndex: 0,
    x: 64,
    y: 38,
    description:
      'ARC unit stationed at the lab wing entrance — positioned to protect Lab Alpha and the adjacent specimen vault.',
    tags: ['arc', 'upper', 'lab'],
  },

  // ── Lower (floor 1) ───────────────────────────────────────────────────
  {
    id: 'sm-arc-reactor-guard',
    mapId: 'stella-montis',
    name: 'ARC Reactor Guard',
    category: 'arc',
    floorIndex: 1,
    x: 54,
    y: 44,
    description:
      'Heavy ARC unit stationed at the reactor mech room entrance — will not patrol, will not back down.',
    tags: ['arc', 'lower', 'reactor'],
  },
  {
    id: 'sm-arc-server-hall-patrol',
    mapId: 'stella-montis',
    name: 'ARC Server Hall Patrol',
    category: 'arc',
    floorIndex: 1,
    x: 64,
    y: 40,
    description:
      'ARC patrol sweeping between server aisles — route makes them hard to track without first clearing the transit hub.',
    tags: ['arc', 'lower', 'server'],
  },
  {
    id: 'sm-arc-night-reinforcement',
    mapId: 'stella-montis',
    name: 'ARC Night Reinforcement',
    category: 'arc',
    floorIndex: 1,
    x: 48,
    y: 54,
    description:
      'Extra ARC squad inserted into the lower facility during Night runs — deploys near the coolant gallery junction.',
    tags: ['arc', 'lower'],
    difficulties: ['Night'],
  },

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  INTERACTIONS (elevators, ziplines, terminals)                      ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  // ── Upper (floor 0) ───────────────────────────────────────────────────
  {
    id: 'sm-interact-main-elevator-upper',
    mapId: 'stella-montis',
    name: 'Main Elevator (Upper)',
    category: 'interaction',
    floorIndex: 0,
    x: 50,
    y: 56,
    description:
      'Upper call panel for the central elevator shaft. Descends to the lower level — audible from both floors.',
    tags: ['interaction', 'upper', 'elevator'],
  },
  {
    id: 'sm-interact-dome-lift',
    mapId: 'stella-montis',
    name: 'Observatory Dome Lift',
    category: 'interaction',
    floorIndex: 0,
    x: 36,
    y: 32,
    description:
      'Small powered lift raising you into the observatory dome — quieter than the main elevator.',
    tags: ['interaction', 'upper', 'vertical'],
  },
  {
    id: 'sm-interact-roof-hatch',
    mapId: 'stella-montis',
    name: 'Roof Access Hatch',
    category: 'interaction',
    floorIndex: 0,
    x: 54,
    y: 18,
    description:
      'Manual hatch leading to the rooftop platform — loud to push open, gives full exterior access.',
    tags: ['interaction', 'upper', 'roof'],
  },
  {
    id: 'sm-interact-terrace-zipline',
    mapId: 'stella-montis',
    name: 'Terrace Descent Zipline',
    category: 'interaction',
    floorIndex: 0,
    x: 82,
    y: 44,
    description:
      'Emergency descent line from the upper east terrace to the lower garage approach — fastest cross-floor bypass without the elevator.',
    tags: ['interaction', 'upper', 'zipline'],
  },

  // ── Lower (floor 1) ───────────────────────────────────────────────────
  {
    id: 'sm-interact-main-elevator-lower',
    mapId: 'stella-montis',
    name: 'Main Elevator (Lower)',
    category: 'interaction',
    floorIndex: 1,
    x: 50,
    y: 54,
    description:
      'Lower call panel for the central elevator shaft. Ascends to the upper level — same shaft, different floor.',
    tags: ['interaction', 'lower', 'elevator'],
  },
  {
    id: 'sm-interact-reactor-vent',
    mapId: 'stella-montis',
    name: 'Reactor Emergency Vent',
    category: 'interaction',
    floorIndex: 1,
    x: 58,
    y: 52,
    description:
      'Emergency vent control console in the reactor room — activating it vents hot gas into adjacent corridors, briefly disrupting ARC units nearby.',
    tags: ['interaction', 'lower', 'reactor'],
  },
  {
    id: 'sm-interact-server-terminal',
    mapId: 'stella-montis',
    name: 'Server Room Battery Terminal',
    category: 'interaction',
    floorIndex: 1,
    x: 68,
    y: 34,
    description:
      'Portable battery terminal powering isolated server racks. Pulling it kills lighting in the server hall — advantage or liability depending on your setup.',
    tags: ['interaction', 'lower', 'tech'],
  },

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  NOISE HAZARDS                                                       ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  // ── Upper (floor 0) ───────────────────────────────────────────────────
  {
    id: 'sm-noise-lab-motion-sensor',
    mapId: 'stella-montis',
    name: 'Lab Corridor Motion Sensor',
    category: 'noise',
    floorIndex: 0,
    x: 60,
    y: 38,
    description:
      'Infrared motion sensor across the lab wing corridor — trips an alarm that activates the ARC lab guard. Crouch through or destroy the unit.',
    tags: ['noise', 'upper', 'sensor'],
  },
  {
    id: 'sm-noise-exec-cameras',
    mapId: 'stella-montis',
    name: 'Executive Suite Camera Bank',
    category: 'noise',
    floorIndex: 0,
    x: 40,
    y: 36,
    description:
      'Security camera cluster covering the executive ring approach. Three cameras on rotating sweeps — time the gaps or pull the power panel first.',
    tags: ['noise', 'upper', 'camera'],
  },

  // ── Lower (floor 1) ───────────────────────────────────────────────────
  {
    id: 'sm-noise-tunnel-pressure-plate',
    mapId: 'stella-montis',
    name: 'Tunnel Pressure-Plate Alarm',
    category: 'noise',
    floorIndex: 1,
    x: 44,
    y: 64,
    description:
      'Hidden pressure plate in the lower service tunnel — triggers a loud alarm and pulls the coolant gallery ARC patrol.',
    tags: ['noise', 'lower', 'alarm'],
  },
  {
    id: 'sm-noise-reactor-tripwire',
    mapId: 'stella-montis',
    name: 'Reactor Approach Tripwire',
    category: 'noise',
    floorIndex: 1,
    x: 52,
    y: 42,
    description:
      'Tripwire strung across the mech room approach corridor — activates a local alarm and forces the reactor guard into high-alert mode.',
    tags: ['noise', 'lower', 'tripwire'],
  },

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  NATURE                                                              ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  // ── Upper (floor 0) ───────────────────────────────────────────────────
  {
    id: 'sm-nature-ice-ridge-formation',
    mapId: 'stella-montis',
    name: 'Ice Ridge Formation',
    category: 'nature',
    floorIndex: 0,
    x: 54,
    y: 16,
    description:
      'Thick ice shelf built up along the north ridge overhang — natural cover, but stepping on loose ice creates cracking audio.',
    tags: ['nature', 'upper', 'ice'],
  },
  {
    id: 'sm-nature-snow-terrace-drift',
    mapId: 'stella-montis',
    name: 'Snow-Drifted Terrace',
    category: 'nature',
    floorIndex: 0,
    x: 82,
    y: 50,
    description:
      'Deep snow drifts piled against the east terrace walls — slow movement but muffled footsteps. Lush Blooms thaws the snowline dramatically.',
    tags: ['nature', 'upper', 'snow'],
    difficulties: ['Lush Blooms'],
  },
  {
    id: 'sm-nature-roof-bird-nests',
    mapId: 'stella-montis',
    name: 'Rooftop Bird Nests',
    category: 'nature',
    floorIndex: 0,
    x: 60,
    y: 24,
    description:
      'Large bird nesting colony along the roof antenna masts — startling them creates a loud audio burst. Especially active during Bird City.',
    tags: ['nature', 'upper', 'birds'],
    difficulties: ['Bird City'],
  },

  // ── Lower (floor 1) ───────────────────────────────────────────────────
  {
    id: 'sm-nature-ice-seep-lower',
    mapId: 'stella-montis',
    name: 'Underground Ice Seep',
    category: 'nature',
    floorIndex: 1,
    x: 38,
    y: 62,
    description:
      'Groundwater seeping through lower-level walls has frozen into jagged ice columns — interesting cover, but crunchy underfoot. Avoid in Night runs.',
    tags: ['nature', 'lower', 'ice'],
  },
  {
    id: 'sm-nature-frozen-pipe-burst',
    mapId: 'stella-montis',
    name: 'Frozen Pipe Burst',
    category: 'nature',
    floorIndex: 1,
    x: 62,
    y: 58,
    description:
      'A ruptured coolant pipe frozen solid creates a low ice barrier across the gallery floor — usable as cover, blocks ARC patrol sightlines.',
    tags: ['nature', 'lower', 'ice'],
  },
];

// Merge curated POIs with extracted MetaForge POIs
export const stellaMontisPois: MapPoi[] = [...curatedPois, ...stellamontisExtractedPois];
