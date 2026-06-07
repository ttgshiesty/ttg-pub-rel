/**
 * Blueprint drop locations — generated from arc_raiders_blueprints_final.csv (83 entries).
 * Keys match blueprint names; case-insensitive fallback also provided.
 */

export interface BlueprintDrop {
  map: string;
  condition: string;
  containers: string;
  scavengable: boolean;
  trialsReward?: string;
  questReward?: string;
  location?: string;
  bestRoute?: string;
  crafting?: string;
  workshopLevel?: string;
  notes?: string;
}

const DROPS: Record<string, BlueprintDrop> = {
  Anvil: {
    map: 'All',
    condition: 'Any',
    containers: 'Raider Containers',
    scavengable: true,
    location:
      'Raider containers: uncovered caches (~10% BP rate), raider backpacks, med bags, ammo boxes, weapon boxes, grenade cases; all maps',
    bestRoute:
      'Uncovered Caches event → hunt ticking caches OR loot weapon cases in any high-value breach rooms',
    crafting: '5 Mechanical Components, 5 Simple Gun Parts',
    workshopLevel: 'Gunsmith 2',
  },
  'Angled Grip II': {
    map: 'All',
    condition: 'Any',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers (trash cans, wardrobes, desks); high density: Blue Gate Village, Buried City Plaza Rosa/Grandioso, Stella Montis Lobby/Business Center',
    bestRoute:
      'Blue Gate Village → full residential sweep OR Buried City Plaza Rosa → Grandioso → street residential containers',
    crafting: '2 Mechanical Components, 3 Duct Tape',
    workshopLevel: 'Gunsmith 2',
  },
  'Angled Grip III': {
    map: 'All',
    condition: 'Electromagnetic Storm Locked Gate Night Raid',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers in Locked Gate/Night Raid/Electromagnetic Storm events; Blue Gate Village (Locked Gate), Buried City residential (Night)',
    bestRoute:
      'Locked Gate: Blue Gate Village residential sweep OR Night/Storm: Buried City Plaza Rosa → Grandioso',
    crafting: '2 Mod Components, 5 Duct Tape',
    workshopLevel: 'Gunsmith 3',
  },
  Aphelion: {
    map: 'Stella Montis',
    condition: 'Any',
    containers: 'Anywhere',
    scavengable: true,
    location: 'Stella Montis',
    crafting:
      '3 Magnetic Accelerator, 3 Complex Gun Parts, 1 Matriarch Reactor',
    workshopLevel: 'Gunsmith 3',
    notes: 'Wiki table updated: no Matriarch restriction listed',
  },
  'Barricade Kit': {
    map: 'All',
    condition: 'Any',
    containers: 'Electrical Containers',
    scavengable: true,
    location:
      'Electrical containers (server cabinets, wall cabinets, androids, computers); all maps',
    bestRoute:
      'Check electrical rooms in any map (server rooms, tech areas with cabinets/computers/androids)',
    crafting: '1 Mechanical Component',
    workshopLevel: 'Utility Station 2',
  },
  Bettina: {
    map: 'All',
    condition: 'Any',
    containers: 'Raider Containers',
    scavengable: true,
    location:
      'Raider containers: uncovered caches (~10% BP rate), raider backpacks, med bags, ammo boxes, weapon boxes, grenade cases; all maps',
    bestRoute:
      'Uncovered Caches event → hunt ticking caches OR loot weapon cases in any high-value breach rooms',
    crafting: '3 Advanced Mechanical Components, 3 Heavy Gun Parts, 3 Canister',
    workshopLevel: 'Gunsmith 3',
  },
  'Blaze Grenade': {
    map: 'All',
    condition: 'Any',
    containers: 'Industrial Containers',
    scavengable: true,
    location:
      'Industrial containers (red lockers, rusty raider boxes, shipping containers); Blue Gate Maintenance, Dam Primary Facility, Stella Montis Loading Bay',
    bestRoute:
      'Stella Montis Loading Bay → shipping containers OR Blue Gate Maintenance Wing → red lockers/rusty raider boxes',
    crafting: '1 Explosive Compound, 2 Oil',
    workshopLevel: 'Explosives Station 3',
  },
  Bobcat: {
    map: 'Condition Only',
    condition: 'Locked Gate Hurricane',
    containers: 'Anywhere, First Wave Cache',
    scavengable: true,
    location:
      'Locked Gate or Hurricane condition; Anywhere or First Wave Cache',
    bestRoute: 'Loot during Locked Gate or Hurricane; check First Wave Cache',
    crafting: '1 Magnetic Accelerator, 3 Light Gun Parts, 2 Exodus Modules',
    workshopLevel: 'Gunsmith 3',
  },
  Burletta: {
    map: 'N/A',
    condition: 'N/A',
    containers: 'N/A',
    scavengable: false,
    questReward: 'Industrial Espionage',
    location: 'Quest reward ONLY: Industrial Espionage',
    bestRoute: 'Complete Industrial Espionage quest',
    crafting: '3 Mechanical Components, 3 Simple Gun Parts',
    workshopLevel: 'Gunsmith 1',
    notes: 'Quest: Industrial Espionage',
  },
  Canto: {
    map: 'Condition Only',
    condition: 'Hurricane',
    containers: 'First Wave Cache',
    scavengable: true,
    location: 'Hurricane condition; First Wave Cache',
    bestRoute: 'Hurricane event → First Wave Cache',
    crafting: '1 Magnetic Accelerator, 3 Light Gun Parts, 2 Exodus Modules',
    workshopLevel: 'Gunsmith 3',
  },
  'Combat Mk. 3 (Aggressive)': {
    map: 'Stella Montis The Blue Gate',
    condition: 'Any',
    containers: 'Medical Containers Security Containers',
    scavengable: true,
    location:
      'Medical + Security containers; Blue Gate Security Wing (downstairs + upstairs medical), Stella Montis Lobby/Business Center augment boxes',
    bestRoute:
      'Blue Gate Reinforced Reception → breach room security lockers → upstairs medical floor → Security Wing augment boxes',
    crafting: '2 Advanced Electrical Components, 3 Processors',
    workshopLevel: 'Gear Bench 3',
  },
  'Combat Mk. 3 (Flanking)': {
    map: 'Stella Montis The Blue Gate',
    condition: 'Any',
    containers: 'Medical Containers Security Containers',
    scavengable: true,
    location:
      'Medical + Security containers; Blue Gate Security Wing (downstairs + upstairs medical), Stella Montis Lobby/Business Center augment boxes',
    bestRoute:
      'Blue Gate Reinforced Reception → breach room security lockers → upstairs medical floor → Security Wing augment boxes',
    crafting: '2 Advanced Electrical Components, 3 Processors',
    workshopLevel: 'Gear Bench 3',
  },
  'Compensator II': {
    map: 'All',
    condition: 'Any',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers (trash cans, wardrobes, desks); high density: Blue Gate Village, Buried City Plaza Rosa/Grandioso, Stella Montis Lobby/Business Center',
    bestRoute:
      'Blue Gate Village → full residential sweep OR Buried City Plaza Rosa → Grandioso → street residential containers',
    crafting: '2 Mechanical Components, 8 Wires',
    workshopLevel: 'Gunsmith 2',
  },
  'Compensator III': {
    map: 'Condition Only',
    condition: 'Electromagnetic Storm Locked Gate Night Raid',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers in Locked Gate/Night Raid/Electromagnetic Storm events; Blue Gate Village (Locked Gate), Buried City residential (Night)',
    bestRoute:
      'Locked Gate: Blue Gate Village residential sweep OR Night/Storm: Buried City Plaza Rosa → Grandioso',
    crafting: '2 Mod Components, 8 Wires',
    workshopLevel: 'Gunsmith 3',
  },
  'Crash Mat': {
    map: '?',
    condition: '?',
    containers: '?',
    scavengable: false,
  },
  'Complex Gun Parts': {
    map: 'All',
    condition: 'Any',
    containers: 'Security Containers',
    scavengable: true,
    location:
      'Security containers (augment-style boxes); Blue Gate Reinforced Reception breach room (6 security lockers, 13.6% per locker measured)',
    bestRoute:
      'Blue Gate Reinforced Reception → breach room → full security locker clear (6-9 containers)',
    crafting: '2 Light Gun Parts, 2 Medium Gun Parts, 2 Heavy Gun Parts',
    workshopLevel: 'Refiner 3',
    notes: 'Security locker measured rate',
  },
  Dolabra: {
    map: 'Condition Only',
    condition: 'Close Scrutiny',
    containers: 'ARC Assessor',
    scavengable: true,
    location: 'Close Scrutiny condition; ARC Assessor',
    bestRoute: 'Close Scrutiny → loot ARC Assessor',
    crafting: '3 Shredder Gyro, 3 Magnetic Accelerator, 2 Vaporizer',
    workshopLevel: 'Gunsmith 3',
  },
  Deadline: {
    map: 'Stella Montis',
    condition: 'Any',
    containers: 'Anywhere',
    scavengable: true,
    location: 'Stella Montis ONLY; any container, day or night raid',
    bestRoute:
      'Stella Montis: Security Checkpoint 4-floor sweep OR Lobby/Business Center high-density loot',
    crafting: '3 Explosive Compound, 2 ARC Circuitry',
    workshopLevel: 'Explosives Station 3',
  },
  Defibrillator: {
    map: 'All',
    condition: 'Any',
    containers: 'Medical Containers',
    scavengable: true,
    location:
      'Medical containers (white drawers, med bags) all maps; best density: Buried City Hospital/Space Travel, Stella Montis Medical Research, Dam Testing Annex, Blue Gate underground medical floor',
    bestRoute:
      'Stella Montis Medical Research → full medical floor clear OR Buried City Hospital → Space Travel buildings (blue medical drawers)',
    crafting: '9 Plastic Parts, 1 Moss',
    workshopLevel: 'Medical Lab 2',
  },
  'Explosive Mine': {
    map: 'All',
    condition: 'Any',
    containers: 'Industrial Containers',
    scavengable: true,
    location:
      'Industrial containers (red lockers, rusty raider boxes, shipping containers); Blue Gate Maintenance, Dam Primary Facility, Stella Montis Loading Bay',
    bestRoute:
      'Stella Montis Loading Bay → shipping containers OR Blue Gate Maintenance Wing → red lockers/rusty raider boxes',
    crafting: '1 Explosive Compound, 1 Sensors',
    workshopLevel: 'Explosives Station 3',
  },
  'Extended Barrel II': {
    map: '?',
    condition: '?',
    containers: '?',
    scavengable: false,
  },
  'Extended Barrel III': {
    map: 'Condition Only',
    condition: 'Electromagnetic Storm Locked Gate Night Raid',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers in Locked Gate/Night Raid/Electromagnetic Storm events; Blue Gate Village (Locked Gate), Buried City residential (Night)',
    bestRoute:
      'Locked Gate: Blue Gate Village residential sweep OR Night/Storm: Buried City Plaza Rosa → Grandioso',
    crafting: '2 Mod Components, 8 Wires',
    workshopLevel: 'Gunsmith 3',
  },
  'Extended Light Magazine II': {
    map: 'All',
    condition: 'Any',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers (trash cans, wardrobes, desks); high density: Blue Gate Village, Buried City Plaza Rosa/Grandioso, Stella Montis Lobby/Business Center',
    bestRoute:
      'Blue Gate Village → full residential sweep OR Buried City Plaza Rosa → Grandioso → street residential containers',
    crafting: '2 Mechanical Components, 3 Steel Springs',
    workshopLevel: 'Gunsmith 2',
  },
  'Extended Shotgun Magazine II': {
    map: 'All',
    condition: 'Any',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers (trash cans, wardrobes, desks); high density: Blue Gate Village, Buried City Plaza Rosa/Grandioso, Stella Montis Lobby/Business Center',
    bestRoute:
      'Blue Gate Village → full residential sweep OR Buried City Plaza Rosa → Grandioso → street residential containers',
    crafting: '2 Mechanical Components, 3 Steel Springs',
    workshopLevel: 'Gunsmith 2',
  },
  'Extended Light Magazine III': {
    map: 'Condition Only',
    condition: 'Electromagnetic Storm Locked Gate Night Raid',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers in Locked Gate/Night Raid/Electromagnetic Storm events; Blue Gate Village (Locked Gate), Buried City residential (Night)',
    bestRoute:
      'Locked Gate: Blue Gate Village residential sweep OR Night/Storm: Buried City Plaza Rosa → Grandioso',
    crafting: '2 Mod Components, 5 Steel Springs',
    workshopLevel: 'Gunsmith 3',
  },
  'Extended Medium Magazine III': {
    map: 'Condition Only',
    condition: 'Electromagnetic Storm Locked Gate Night Raid',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers in Locked Gate/Night Raid/Electromagnetic Storm events; Blue Gate Village (Locked Gate), Buried City residential (Night)',
    bestRoute:
      'Locked Gate: Blue Gate Village residential sweep OR Night/Storm: Buried City Plaza Rosa → Grandioso',
    crafting: '2 Mod Components, 5 Steel Springs',
    workshopLevel: 'Gunsmith 3',
  },
  'Extended Shotgun Magazine III': {
    map: 'Condition Only',
    condition: 'Electromagnetic Storm Locked Gate Night Raid',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers in Locked Gate/Night Raid/Electromagnetic Storm events; Blue Gate Village (Locked Gate), Buried City residential (Night)',
    bestRoute:
      'Locked Gate: Blue Gate Village residential sweep OR Night/Storm: Buried City Plaza Rosa → Grandioso',
    crafting: '2 Mod Components, 5 Steel Springs',
    workshopLevel: 'Gunsmith 3',
  },
  'Extended Medium Magazine II': {
    map: 'All',
    condition: 'Night Raid',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers; Night Raid required; high density: Blue Gate Village, Buried City Plaza Rosa/Grandioso',
    bestRoute:
      'Night Raid: Blue Gate Village OR Buried City residential blocks',
    crafting: '2 Mechanical Components, 3 Steel Springs',
    workshopLevel: 'Gunsmith 2',
  },
  Equalizer: {
    map: 'Condition Only',
    condition: 'Harvester',
    containers: 'Harvester',
    scavengable: false,
    location: 'Harvester puzzle completion',
    bestRoute: 'Complete Harvester puzzle → loot central containers',
    crafting: '3 Magnetic Accelerator, 3 Complex Gun Parts, 1 Queen Reactor',
    workshopLevel: 'Gunsmith 3',
    notes: 'Harvester exclusive',
  },
  'Fireworks Box': {
    map: 'Condition Only',
    condition: 'Cold Snap',
    containers: 'Anywhere',
    scavengable: true,
    questReward: 'Test Case',
    location: 'Cold Snap condition; anywhere; also quest reward: Test Case',
    bestRoute: 'Cold Snap loot or complete Test Case',
    crafting: '1 Explosive Compound, 3 Pop Triggers',
    workshopLevel: 'Explosives Station 2',
  },
  'Gas Mine': {
    map: 'Stella Montis',
    condition: 'Any',
    containers: 'Anywhere',
    scavengable: true,
    location: 'Stella Montis ONLY; any container, day or night raid',
    bestRoute:
      'Stella Montis: Security Checkpoint 4-floor sweep OR Lobby/Business Center high-density loot',
    crafting: '4 Chemicals, 2 Rubber Parts',
    workshopLevel: 'Explosives Station 1',
  },
  'Heavy Gun Parts': {
    map: 'All',
    condition: 'Any',
    containers: 'Raider Containers',
    scavengable: true,
    location:
      'Raider containers: uncovered caches (~10% BP rate), raider backpacks, med bags, ammo boxes, weapon boxes, grenade cases; all maps',
    bestRoute:
      'Uncovered Caches event → hunt ticking caches OR loot weapon cases in any high-value breach rooms',
    crafting: '4 Simple Gun Parts',
    workshopLevel: 'Refiner 2',
  },
  Hullcracker: {
    map: 'N/A',
    condition: 'N/A',
    containers: 'N/A',
    scavengable: false,
    questReward: 'The Majors Footlocker',
    location: 'Quest reward ONLY: The Majors Footlocker',
    bestRoute: 'Complete The Majors Footlocker quest',
    crafting: '1 Magnetic Accelerator, 3 Heavy Gun Parts, 1 Exodus Module',
    workshopLevel: 'Gunsmith 3',
    notes: 'Quest: The Majors Footlocker',
  },
  'Il Toro': {
    map: 'All',
    condition: 'Any',
    containers: 'Raider Containers',
    scavengable: true,
    location:
      'Raider containers: uncovered caches (~10% BP rate), raider backpacks, med bags, ammo boxes, weapon boxes, grenade cases; all maps',
    bestRoute:
      'Uncovered Caches event → hunt ticking caches OR loot weapon cases in any high-value breach rooms',
    crafting: '5 Mechanical Components, 6 Simple Gun Parts',
    workshopLevel: 'Gunsmith 1',
  },
  'Jolt Mine': {
    map: 'All',
    condition: 'Any',
    containers: 'Industrial Containers',
    scavengable: true,
    location:
      'Industrial containers (red lockers, rusty raider boxes, shipping containers); Blue Gate Maintenance, Dam Primary Facility, Stella Montis Loading Bay',
    bestRoute:
      'Stella Montis Loading Bay → shipping containers OR Blue Gate Maintenance Wing → red lockers/rusty raider boxes',
    crafting: '1 Electrical Components, 1 Battery',
    workshopLevel: 'Explosives Station 2',
  },
  Jupiter: {
    map: 'Condition Only',
    condition: 'Harvester',
    containers: 'Harvester',
    scavengable: false,
    location: 'Harvester puzzle completion',
    bestRoute: 'Complete Harvester puzzle → loot central containers',
    crafting: '3 Magnetic Accelerator, 3 Complex Gun Parts, 1 Queen Reactor',
    workshopLevel: 'Gunsmith 3',
    notes: 'Harvester exclusive',
  },
  'Light Gun Parts': {
    map: 'All',
    condition: 'Any',
    containers: 'Raider Containers',
    scavengable: true,
    location:
      'Raider containers: uncovered caches (~10% BP rate), raider backpacks, med bags, ammo boxes, weapon boxes, grenade cases; all maps',
    bestRoute:
      'Uncovered Caches event → hunt ticking caches OR loot weapon cases in any high-value breach rooms',
    crafting: '4 Simple Gun Parts',
    workshopLevel: 'Refiner 2',
  },
  'Red Light Stick': {
    map: 'All',
    condition: 'Any',
    containers: 'Anywhere',
    scavengable: true,
    location: 'Any container, any map',
    bestRoute: 'Check general containers across any map',
    crafting: '3 Chemicals',
    workshopLevel: 'Utility Station 1',
  },
  'Green Light Stick': {
    map: 'All',
    condition: 'Any',
    containers: 'Anywhere',
    scavengable: true,
    location: 'Any container, any map',
    bestRoute: 'Check general containers across any map',
    crafting: '3 Chemicals',
    workshopLevel: 'Utility Station 1',
  },
  'Yellow Light Stick': {
    map: 'All',
    condition: 'Any',
    containers: 'Anywhere',
    scavengable: true,
    location: 'Any container, any map',
    bestRoute: 'Check general containers across any map',
    crafting: '3 Chemicals',
    workshopLevel: 'Utility Station 1',
  },
  'Blue Light Stick': {
    map: 'All',
    condition: 'Any',
    containers: 'Anywhere',
    scavengable: true,
    location: 'Any container, any map',
    bestRoute: 'Check general containers across any map',
    crafting: '3 Chemicals',
    workshopLevel: 'Utility Station 1',
  },
  'Lightweight Stock': {
    map: 'Condition Only',
    condition: 'Electromagnetic Storm Locked Gate Night Raid',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers in Locked Gate/Night Raid/Electromagnetic Storm events; Blue Gate Village (Locked Gate), Buried City residential (Night)',
    bestRoute:
      'Locked Gate: Blue Gate Village residential sweep OR Night/Storm: Buried City Plaza Rosa → Grandioso',
    crafting: '2 Mod Components, 5 Duct Tape',
    workshopLevel: 'Gunsmith 3',
  },
  'Looting Mk. 3 (Safekeeper)': {
    map: 'All',
    condition: 'Any',
    containers: 'Medical Containers Security Containers',
    scavengable: true,
    location:
      'Medical + Security containers; Blue Gate Security Wing (downstairs + upstairs medical), Stella Montis Lobby/Business Center augment boxes',
    bestRoute:
      'Blue Gate Reinforced Reception → breach room security lockers → upstairs medical floor → Security Wing augment boxes',
    crafting: '2 Advanced Electrical Components, 3 Processors',
    workshopLevel: 'Gear Bench 3',
  },
  'Looting Mk. 3 (Survivor)': {
    map: 'All',
    condition: 'Any',
    containers: 'Medical Containers Security Containers',
    scavengable: true,
    location:
      'Medical + Security containers; Blue Gate Security Wing (downstairs + upstairs medical), Stella Montis Lobby/Business Center augment boxes',
    bestRoute:
      'Blue Gate Reinforced Reception → breach room security lockers → upstairs medical floor → Security Wing augment boxes',
    crafting: '2 Advanced Electrical Components, 3 Processors',
    workshopLevel: 'Gear Bench 3',
  },
  'Lure Grenade': {
    map: 'N/A',
    condition: 'N/A',
    containers: 'N/A',
    scavengable: false,
    questReward: 'Greasing Her Palms',
    location: 'Quest reward ONLY: Greasing Her Palms',
    bestRoute: 'Complete Greasing Her Palms quest',
    crafting: '1 Speaker Component, 1 Electrical Components',
    workshopLevel: 'Utility Station 2',
    notes: 'Quest: Greasing Her Palms',
  },
  'Medium Gun Parts': {
    map: 'All',
    condition: 'Any',
    containers: 'Raider Containers',
    scavengable: true,
    location:
      'Raider containers: uncovered caches (~10% BP rate), raider backpacks, med bags, ammo boxes, weapon boxes, grenade cases; all maps',
    bestRoute:
      'Uncovered Caches event → hunt ticking caches OR loot weapon cases in any high-value breach rooms',
    crafting: '4 Simple Gun Parts',
    workshopLevel: 'Refiner 2',
  },
  'Muzzle Brake II': {
    map: 'All',
    condition: 'Any',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers (trash cans, wardrobes, desks); high density: Blue Gate Village, Buried City Plaza Rosa/Grandioso, Stella Montis Lobby/Business Center',
    bestRoute:
      'Blue Gate Village → full residential sweep OR Buried City Plaza Rosa → Grandioso → street residential containers',
    crafting: '2 Mechanical Components, 8 Wires',
    workshopLevel: 'Gunsmith 2',
  },
  'Muzzle Brake III': {
    map: 'Condition Only',
    condition: 'Electromagnetic Storm Locked Gate Night Raid',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers in Locked Gate/Night Raid/Electromagnetic Storm events; Blue Gate Village (Locked Gate), Buried City residential (Night)',
    bestRoute:
      'Locked Gate: Blue Gate Village residential sweep OR Night/Storm: Buried City Plaza Rosa → Grandioso',
    crafting: '2 Mod Components, 8 Wires',
    workshopLevel: 'Gunsmith 3',
  },
  Osprey: {
    map: 'All',
    condition: 'Any',
    containers: 'Raider Containers',
    scavengable: true,
    location:
      'Raider containers: uncovered caches (~10% BP rate), raider backpacks, med bags, ammo boxes, weapon boxes, grenade cases; all maps',
    bestRoute:
      'Uncovered Caches event → hunt ticking caches OR loot weapon cases in any high-value breach rooms',
    crafting: '2 Advanced Mechanical Components, 3 Medium Gun Parts, 7 Wires',
    workshopLevel: 'Gunsmith 3',
  },
  'Padded Stock': {
    map: 'Condition Only',
    condition: 'Electromagnetic Storm Locked Gate Night Raid Hidden Bunker',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers in Electromagnetic Storm/Locked Gate/Night Raid/Hidden Bunker conditions',
    bestRoute:
      'Locked Gate: Blue Gate Village residential sweep OR Night/Storm: Buried City Plaza Rosa → Grandioso',
    crafting: '2 Mod Components, 5 Duct Tape',
    workshopLevel: 'Gunsmith 3',
  },
  'Pulse Mine': {
    map: 'Stella Montis',
    condition: 'Any',
    containers: 'Anywhere',
    scavengable: true,
    location: 'Stella Montis ONLY; any container, day or night raid',
    bestRoute:
      'Stella Montis: Security Checkpoint 4-floor sweep OR Lobby/Business Center high-density loot',
    crafting: '1 Crude Explosive, 1 Wires',
    workshopLevel: 'Explosives Station 2',
  },
  'Powered Descender': {
    map: '?',
    condition: '?',
    containers: '?',
    scavengable: false,
  },
  Rascal: {
    map: 'All',
    condition: 'Any',
    containers: 'Raider Containers',
    scavengable: true,
  },
  'Remote Raider Flare': {
    map: 'All',
    condition: 'Any',
    containers: 'Electrical Containers',
    scavengable: true,
    location:
      'Electrical containers (server cabinets, wall cabinets, androids, computers); all maps',
    bestRoute:
      'Check electrical rooms in any map (server rooms, tech areas with cabinets/computers/androids)',
    crafting: '2 Chemicals, 4 Rubber Parts',
    workshopLevel: 'Utility Station 1',
  },
  'Seeker Grenade': {
    map: 'Stella Montis',
    condition: 'Any',
    containers: 'Anywhere',
    scavengable: true,
    location: 'Stella Montis ONLY; any container, day or night raid',
    bestRoute:
      'Stella Montis: Security Checkpoint 4-floor sweep OR Lobby/Business Center high-density loot',
    crafting: '1 Crude Explosives, 2 ARC Alloy',
    workshopLevel: 'Explosives Station 2',
  },
  'Shotgun Choke II': {
    map: 'All',
    condition: 'Any',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers (trash cans, wardrobes, desks); high density: Blue Gate Village, Buried City Plaza Rosa/Grandioso, Stella Montis Lobby/Business Center',
    bestRoute:
      'Blue Gate Village → full residential sweep OR Buried City Plaza Rosa → Grandioso → street residential containers',
    crafting: '2 Mechanical Components, 4 Wires',
    workshopLevel: 'Gunsmith 2',
  },
  'Shotgun Choke III': {
    map: 'Condition Only',
    condition: 'Electromagnetic Storm Locked Gate Night Raid',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers in Locked Gate/Night Raid/Electromagnetic Storm events; Blue Gate Village (Locked Gate), Buried City residential (Night)',
    bestRoute:
      'Locked Gate: Blue Gate Village residential sweep OR Night/Storm: Buried City Plaza Rosa → Grandioso',
    crafting: '2 Mod Components, 4 Wires',
    workshopLevel: 'Gunsmith 3',
  },
  'Shotgun Silencer': {
    map: 'Condition Only',
    condition: 'Electromagnetic Storm Locked Gate Night Raid Hidden Bunker',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers in Locked Gate/Night Raid/Electromagnetic Storm/Hidden Bunker events',
    bestRoute:
      'Locked Gate OR Hidden Bunker: Blue Gate Village OR Buried City residential areas',
    crafting: '2 Mod Components, 8 Wires',
    workshopLevel: 'Gunsmith 3',
  },
  Showstopper: {
    map: 'All',
    condition: 'Any',
    containers: 'Industrial Containers',
    scavengable: true,
    location:
      'Industrial containers (red lockers, rusty raider boxes, shipping containers); Blue Gate Maintenance, Dam Primary Facility, Stella Montis Loading Bay',
    bestRoute:
      'Stella Montis Loading Bay → shipping containers OR Blue Gate Maintenance Wing → red lockers/rusty raider boxes',
    crafting: '1 Advanced Electrical Components, 1 Voltage Converter',
    workshopLevel: 'Explosives Station 3',
  },
  'Silencer I': {
    map: 'All',
    condition: 'Any',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers (trash cans, wardrobes, desks); high density: Blue Gate Village, Buried City Plaza Rosa/Grandioso, Stella Montis Lobby/Business Center',
    bestRoute:
      'Blue Gate Village → full residential sweep OR Buried City Plaza Rosa → Grandioso → street residential containers',
    crafting: '2 Mechanical Components, 4 Wires',
    workshopLevel: 'Gunsmith 2',
  },
  'Silencer II': {
    map: 'All',
    condition: 'Any',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers (trash cans, wardrobes, desks); high density: Blue Gate Village, Buried City Plaza Rosa/Grandioso, Stella Montis Lobby/Business Center',
    bestRoute:
      'Blue Gate Village → full residential sweep OR Buried City Plaza Rosa → Grandioso → street residential containers',
    crafting: '2 Mod Components, 8 Wires',
    workshopLevel: 'Gunsmith 3',
  },
  'Smoke Grenade': {
    map: 'All',
    condition: 'Any',
    containers: 'Residential Containers',
    scavengable: true,
    trialsReward: 'Any',
    location:
      'Residential containers; Blue Gate Village, Buried City residential, Stella Montis Lobby',
    bestRoute:
      'Blue Gate Village OR Buried City Plaza Rosa → Grandioso residential sweep',
    crafting: '14 Chemicals, 1 Canister',
    workshopLevel: 'Utility Station 2',
  },
  'Snap Hook': {
    map: 'Condition Only',
    condition: 'Electromagnetic Storm',
    containers: 'Anywhere',
    scavengable: true,
    trialsReward: 'Trophy Only',
    location:
      'Electromagnetic Storm event ONLY; any container within storm area',
    bestRoute:
      'Electromagnetic Storm: loot containers INSIDE storm zone (any map)',
    crafting: '2 Power Rod, 3 Rope, 1 Exodus Module',
    workshopLevel: 'Utility Station 3',
  },
  'Stable Stock II': {
    map: 'All',
    condition: 'Any',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers (trash cans, wardrobes, desks); high density: Blue Gate Village, Buried City Plaza Rosa/Grandioso, Stella Montis Lobby/Business Center',
    bestRoute:
      'Blue Gate Village → full residential sweep OR Buried City Plaza Rosa → Grandioso → street residential containers',
    crafting: '2 Mechanical Components, 3 Duct Tape',
    workshopLevel: 'Gunsmith 2',
  },
  'Stable Stock III': {
    map: 'Condition Only',
    condition: 'Electromagnetic Storm Locked Gate Night Raid',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers in Locked Gate/Night Raid/Electromagnetic Storm events; Blue Gate Village (Locked Gate), Buried City residential (Night)',
    bestRoute:
      'Locked Gate: Blue Gate Village residential sweep OR Night/Storm: Buried City Plaza Rosa → Grandioso',
    crafting: '2 Mod Components, 5 Duct Tape',
    workshopLevel: 'Gunsmith 3',
  },
  'Surge Coil': {
    map: 'Condition Only',
    condition: 'Electromagnetic Storm',
    containers: '?',
    scavengable: true,
    location: 'Electromagnetic Storm condition; container unknown',
    crafting: '1 Electrical Components, 1 Sensors, 1 Hornet Driver',
    workshopLevel: 'Explosives Station 3',
  },
  'Tactical Mk. 3 (Defensive)': {
    map: 'Stella Montis The Blue Gate',
    condition: 'Any',
    containers: 'Medical Containers Security Containers ARC Surveyor',
    scavengable: true,
    location:
      'Medical + Security containers; Blue Gate Security Wing (downstairs + upstairs medical), Stella Montis Lobby/Business Center augment boxes',
    bestRoute:
      'Blue Gate Reinforced Reception → breach room security lockers → upstairs medical floor → Security Wing augment boxes',
    crafting: '2 Advanced Electrical Components, 3 Processors',
    workshopLevel: 'Gear Bench 3',
  },
  'Tactical Mk. 3 (Healing)': {
    map: 'Stella Montis The Blue Gate',
    condition: 'Any',
    containers: 'Medical Containers Security Containers',
    scavengable: true,
    location:
      'Medical + Security containers; Blue Gate Security Wing (downstairs + upstairs medical), Stella Montis Lobby/Business Center augment boxes',
    bestRoute:
      'Blue Gate Reinforced Reception → breach room security lockers → upstairs medical floor → Security Wing augment boxes',
    crafting: '2 Advanced Electrical Components, 3 Processors',
    workshopLevel: 'Gear Bench 3',
  },
  'Tactical Mk. 3 (Revival)': {
    map: 'Stella Montis The Blue Gate',
    condition: 'Any',
    containers: 'Medical Containers Security Containers',
    scavengable: true,
    location:
      'Medical + Security containers; Blue Gate Security Wing (downstairs + upstairs medical), Stella Montis Lobby/Business Center augment boxes',
    bestRoute:
      'Blue Gate Reinforced Reception → breach room security lockers → upstairs medical floor → Security Wing augment boxes',
    crafting: '2 Advanced Electrical Components, 3 Processors',
    workshopLevel: 'Gear Bench 3',
  },
  'Tactical Mk. 3 (Smoke)': {
    map: '?',
    condition: '?',
    containers: '?',
    scavengable: false,
  },
  'Tagging Grenade': {
    map: 'All',
    condition: 'Any',
    containers: 'Electrical Containers',
    scavengable: true,
    location:
      'Electrical containers (server cabinets, wall cabinets, androids, computers); all maps',
    bestRoute:
      'Check electrical rooms in any map (server rooms, tech areas with cabinets/computers/androids)',
    crafting: '1 Electrical Components, 1 Sensors',
    workshopLevel: 'Utility Station 3',
  },
  Tempest: {
    map: 'Condition Only',
    condition: 'Night Raid Hurricane',
    containers: 'Residential Containers First Wave Cache',
    scavengable: true,
    location:
      'Night Raid or Hurricane; Residential Containers or First Wave Cache',
    bestRoute: 'Night Raid residential sweep OR Hurricane First Wave Cache',
    crafting: '1 Magnetic Accelerator, 3 Medium Gun Parts, 2 Exodus Modules',
    workshopLevel: 'Gunsmith 3',
  },
  Torrente: {
    map: 'All',
    condition: 'Any',
    containers: 'Raider Containers',
    scavengable: true,
    location:
      'Raider containers: uncovered caches (~10% BP rate), raider backpacks, med bags, ammo boxes, weapon boxes, grenade cases; all maps',
    bestRoute:
      'Uncovered Caches event → hunt ticking caches OR loot weapon cases in any high-value breach rooms',
    crafting:
      '2 Advanced Mechanical Components, 3 Medium Gun Parts, 6 Steel Springs',
    workshopLevel: 'Gunsmith 3',
  },
  Trailblazer: {
    map: 'Stella Montis',
    condition: 'Any',
    containers: 'Anywhere',
    scavengable: true,
    location: 'Stella Montis ONLY; any container, day or night raid',
    bestRoute:
      'Stella Montis: Security Checkpoint 4-floor sweep OR Lobby/Business Center high-density loot',
    crafting: '1 Explosive Compound, 1 Synthesized Fuel',
    workshopLevel: 'Explosives Station 2',
  },
  'Trigger Nade': {
    map: 'All',
    condition: 'Any',
    containers: 'Anywhere',
    scavengable: true,
    questReward: 'Sparks Fly',
    location: 'Quest reward: Sparks Fly (also spawns anywhere, any container)',
    bestRoute: 'Complete Sparks Fly quest OR loot high-value breach rooms',
    crafting: '2 Crude Explosives, 1 Processor',
    workshopLevel: 'Explosives Station 2',
    notes: 'Quest: Sparks Fly',
  },
  Venator: {
    map: 'All',
    condition: 'Any',
    containers: 'Raider Containers',
    scavengable: true,
    location:
      'Raider containers: uncovered caches (~10% BP rate), raider backpacks, med bags, ammo boxes, weapon boxes, grenade cases; all maps',
    bestRoute:
      'Uncovered Caches event → hunt ticking caches OR loot weapon cases in any high-value breach rooms',
    crafting: '2 Advanced Mechanical Components, 3 Medium Gun Parts, 5 Magnet',
    workshopLevel: 'Gunsmith 2',
  },
  'Vertical Grip II': {
    map: 'All',
    condition: 'Any',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers (trash cans, wardrobes, desks); high density: Blue Gate Village, Buried City Plaza Rosa/Grandioso, Stella Montis Lobby/Business Center',
    bestRoute:
      'Blue Gate Village → full residential sweep OR Buried City Plaza Rosa → Grandioso → street residential containers',
    crafting: '2 Mechanical Components, 3 Duct Tape',
    workshopLevel: 'Gunsmith 2',
  },
  'Vertical Grip III': {
    map: 'Condition Only',
    condition: 'Electromagnetic Storm Locked Gate Night Raid',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Residential containers in Locked Gate/Night Raid/Electromagnetic Storm events; Blue Gate Village (Locked Gate), Buried City residential (Night)',
    bestRoute:
      'Locked Gate: Blue Gate Village residential sweep OR Night/Storm: Buried City Plaza Rosa → Grandioso',
    crafting: '2 Mod Components, 5 Duct Tape',
    workshopLevel: 'Gunsmith 3',
  },
  'Vita Shot': {
    map: 'All',
    condition: 'Any',
    containers: 'Medical Containers ARC Surveyor',
    scavengable: true,
    location:
      'Medical containers (white drawers, med bags) all maps; best density: Buried City Hospital/Space Travel, Stella Montis Medical Research, Dam Testing Annex, Blue Gate underground medical floor',
    bestRoute:
      'Stella Montis Medical Research → full medical floor clear OR Buried City Hospital → Space Travel buildings (blue medical drawers)',
    crafting: '2 Antiseptic, 1 Syringe',
    workshopLevel: 'Medical Lab 3',
  },
  'Vita Spray': {
    map: 'All',
    condition: 'Any',
    containers: 'Medical Containers ARC Surveyor',
    scavengable: true,
    questReward: 'Worth Your Salt',
    location:
      'Medical containers (white drawers, med bags) all maps; best density: Buried City Hospital/Space Travel, Stella Montis Medical Research, Dam Testing Annex, Blue Gate underground medical floor',
    bestRoute:
      'Stella Montis Medical Research → full medical floor clear OR Buried City Hospital → Space Travel buildings (blue medical drawers)',
    crafting: '3 Antiseptic, 1 Canister',
    workshopLevel: 'Medical Lab 3',
    notes: 'Quest: Worth Your Salt',
  },
  Vulcano: {
    map: 'Condition Only',
    condition: 'Hidden Bunker Hurricane',
    containers: 'Anywhere, First Wave Cache',
    scavengable: true,
    location: 'Hidden Bunker or Hurricane; Anywhere or First Wave Cache',
    bestRoute: 'Hidden Bunker loot OR Hurricane First Wave Cache',
    crafting: '1 Magnetic Accelerator, 3 Heavy Gun Parts, 1 Exodus Module',
    workshopLevel: 'Gunsmith 3',
  },
  Wolfpack: {
    map: 'Condition Only',
    condition: 'Night Raid',
    containers: 'Residential Containers',
    scavengable: true,
    location:
      'Night Raid ONLY; residential containers best; Buried City or Stella Montis residential-density areas',
    bestRoute:
      'Night Raid: Buried City residential blocks OR Stella Montis Lobby → Business Center',
    crafting: '2 Explosive Compound, 2 Sensors',
    workshopLevel: 'Explosives Station 3',
  },
  'White Flag': {
    map: '?',
    condition: '?',
    containers: '?',
    scavengable: false,
  },
};

const DROPS_LOWER = Object.fromEntries(
  Object.entries(DROPS).map(([k, v]) => [k.toLowerCase(), v]),
);

export function getDropForBlueprint(name: string): BlueprintDrop | null {
  return DROPS[name] ?? DROPS_LOWER[name.toLowerCase()] ?? null;
}

export { DROPS as ALL_BLUEPRINT_DROPS };
