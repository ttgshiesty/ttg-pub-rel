/**
 * TrialsLeaderboardPage — MetaForge Weekly Trials Leaderboard
 * Ported and adapted from ADD/pages/TrialsLeaderboardPage.tsx
 */
import { useEffect, useState, useMemo } from 'react';
import {
  Trophy,
  Timer,
  Target,
  Zap,
  Loader2,
  Radio,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  MapPin,
  ExternalLink,
  Shield,
  Wind,
  Flame,
} from 'lucide-react';
import { TrialsService } from '../lib/trialsService';
import { getWeeklyTrials } from '../lib/metaForge';
import type { TrialPlayer, MfWeeklyTrials } from '../types/arcApi';
import { assetUrl } from '../lib/assetUrl';

/* ─── ARC palette ─────────────────────────────────────────────────────────── */
const YELLOW = 'var(--color-arc-yellow)';
const CYAN = 'var(--color-arc-rare)';
const MUTED = 'var(--color-arc-muted)';
const BG = 'var(--color-arc-dark-background)';
const BORDER = 'var(--color-arc-border)';
const CARD = 'var(--color-arc-light-background)';

// ─── Weekly Trials Data ───────────────────────────────────────────────────────
type TrialBranch = 'conditioning' | 'mobility' | 'survival';

type TrialBrief = {
  trialId: string;
  name: string;
  description: string;
  maxPoints: number;
  tips: string[];
  imageUrl: string;
  guideUrl?: string;
  guideLabel?: string;
  difficultyTier: 'Easy' | 'Medium' | 'Hard';
  branch: TrialBranch;
  mapName?: string;
};

const BRANCH_ICON: Record<TrialBranch, React.ReactNode> = {
  conditioning: <Flame className="w-3.5 h-3.5" />,
  mobility: <Wind className="w-3.5 h-3.5" />,
  survival: <Shield className="w-3.5 h-3.5" />,
};

const BRANCH_COLOR: Record<TrialBranch, string> = {
  conditioning: '#f1aa1c',
  mobility: '#01abf4',
  survival: '#25bb55',
};

// ─── Full Trial Catalog (31+ trials) ──────────────────────────────────────────
const ALL_TRIALS: TrialBrief[] = [
  // Legacy/Classic Trials
  {
    trialId: 'trial-hornet-havoc',
    name: 'Hornet Havoc',
    description:
      'Hornet swarms escalate fast — chain staggers to reset their burst windows.',
    maxPoints: 15_000,
    difficultyTier: 'Medium',
    branch: 'conditioning',
    mapName: 'Dam Battlegrounds',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/damage-flying-arc-enemies.webp',
    tips: [
      'Run mag-size perks; one stagger tool per player.',
      'Hold elevated spillways with rear exit.',
      'Clear sightlines before hornet icon ticks.',
      'One player kites stragglers wide.',
    ],
    guideUrl: 'https://metaforge.app/arc-raiders/damage-hornets',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-carriable-dash',
    name: 'Carriable Relay',
    description:
      'Checkpoint deliveries under time — route discipline beats fighting.',
    maxPoints: 12_500,
    difficultyTier: 'Easy',
    branch: 'mobility',
    mapName: 'Spaceport',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/deal-damage-to-shredders.webp',
    tips: [
      'Scout pad order in daylight first.',
      'Light armor only.',
      'Drop carriables in cover-adjacent spots.',
      'Escort uses smoke for LOS breaks.',
    ],
  },
  {
    trialId: 'trial-bombardier-siege',
    name: 'Bombardier Siege',
    description:
      'Artillery patterns punish static holds — rotate and spread vertically.',
    maxPoints: 18_000,
    difficultyTier: 'Hard',
    branch: 'survival',
    mapName: 'Buried City',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/damage-bombardiers.webp',
    tips: [
      'Sustain loadout over raw DPS.',
      'Move diagonally between cover blocks.',
      'Spread vertically across floors.',
      'Bank heals for post-salvo spikes.',
    ],
    guideUrl: 'https://metaforge.app/arc-raiders/damage-bombardiers',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-lightning-gauntlet',
    name: 'Lightning Gauntlet',
    description:
      'Strike windows and painted floors — damage only when storm allows.',
    maxPoints: 16_500,
    difficultyTier: 'Hard',
    branch: 'conditioning',
    mapName: 'Blue Gate',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/get-hit-by-lightning.webp',
    tips: [
      'Caller announces "paint"/"clear".',
      'Burst fire in 1-2s post-strike window.',
      'Take wide arcs when repositioning.',
      'Avoid heavy armor.',
    ],
    guideUrl: 'https://metaforge.app/arc-raiders/get-hit-by-lightning',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-flying-arc-hunt',
    name: 'Flying ARC Hunt',
    description:
      'Aerial targets drive score — save ammo and elevation for flyers.',
    maxPoints: 14_000,
    difficultyTier: 'Medium',
    branch: 'mobility',
    mapName: 'Spaceport',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/damage-flying-arc-enemies.webp',
    tips: [
      'Stage on gantries/towers.',
      'Lead your shots.',
      'Reserve full magazine for flyer waves.',
      'Caller assigns clock positions.',
    ],
    guideUrl: 'https://metaforge.app/arc-raiders/damage-flying-arc-enemies',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-frostline',
    name: 'Frostline Endurance',
    description:
      'Cold exposure + patrol cadence — indoor loops and single pulls win.',
    maxPoints: 17_500,
    difficultyTier: 'Hard',
    branch: 'survival',
    mapName: 'Stella Montis',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/search-first-wave-husks.webp',
    tips: [
      'Route through heated interiors.',
      'Survival loadout with thermal gear.',
      'One pack at a time.',
      'One player calls the route.',
    ],
  },
  // Live MetaForge Trials — Damage
  {
    trialId: 'trial-damage-flying-arc',
    name: 'Damage Flying ARC',
    description: 'Damage any aerial ARC — stage at elevation, lead every shot.',
    maxPoints: 14_000,
    difficultyTier: 'Medium',
    branch: 'conditioning',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/damage-flying-arc-enemies.webp',
    tips: [
      'Stage on gantries/towers.',
      'Lead your shots.',
      'Reserve magazine for flyer waves.',
      'Caller assigns targets.',
    ],
    guideUrl: 'https://metaforge.app/arc-raiders/damage-flying-arc-enemies',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-damage-shredders',
    name: 'Damage Shredders',
    description:
      'Shredders sprint in lateral bursts — punish side-exposure window.',
    maxPoints: 13_500,
    difficultyTier: 'Medium',
    branch: 'conditioning',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/deal-damage-to-shredders.webp',
    tips: [
      'Hold doorways/elevation.',
      'Burst fire before each dash.',
      'Bring one stagger tool per player.',
      'Never pull two packs simultaneously.',
    ],
    guideUrl: 'https://metaforge.app/arc-raiders/deal-damage-to-shredders',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-damage-bastions',
    name: 'Damage Bastions',
    description: 'Flank to rear joints — never stand in their push lane.',
    maxPoints: 16_000,
    difficultyTier: 'Hard',
    branch: 'conditioning',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/damage-bastions.webp',
    tips: [
      'Circle-strafe wide.',
      'Use 1s wind-up to vault to blind side.',
      'Bring anti-armor weapons.',
      'Never stack in front.',
    ],
    guideUrl: 'https://metaforge.app/arc-raiders/damage-bastions',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-damage-leapers',
    name: 'Damage Leapers',
    description: 'Track apex of jump — dump burst in airborne window.',
    maxPoints: 13_000,
    difficultyTier: 'Medium',
    branch: 'conditioning',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/damage-leapers.webp',
    tips: [
      'Fire at apex of jump.',
      'Shotguns/burst rifles ideal.',
      'Maintain medium range.',
      'Call jump direction verbally.',
    ],
    guideUrl: 'https://metaforge.app/arc-raiders/damage-leapers',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-damage-queens',
    name: 'Damage Queens',
    description: 'Coordinated burst during 2-3s transition pauses.',
    maxPoints: 18_000,
    difficultyTier: 'Hard',
    branch: 'conditioning',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/damage-queens-or-matriarchs.webp',
    tips: [
      'Learn phase rotation.',
      'One player calls transitions.',
      'Bring sustained DPS.',
      'Keep aggro spread.',
    ],
    guideUrl: 'https://metaforge.app/arc-raiders/damage-queens-or-matriarchs',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-damage-spotters',
    name: 'Damage Spotters',
    description:
      'Eliminate before they broadcast — prevent reinforced patrols.',
    maxPoints: 10_500,
    difficultyTier: 'Easy',
    branch: 'conditioning',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/damage-spotters.webp',
    tips: [
      'Check high ground first.',
      'Use suppressors.',
      '2s window after they lock on.',
      'Prioritize Spotters in mixed groups.',
    ],
    guideUrl: 'https://metaforge.app/arc-raiders/damage-spotters',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-damage-snitches',
    name: 'Damage Snitches',
    description: 'Kill before pulse fires — or use area tools for whole group.',
    maxPoints: 10_000,
    difficultyTier: 'Easy',
    branch: 'conditioning',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/Damage_Snitches.webp',
    tips: [
      'Be fast — 1.5s window.',
      'Grenades wipe clusters.',
      'Engage at medium range.',
      'Clear area fully after alert.',
    ],
  },
  {
    trialId: 'trial-damage-rocketeers',
    name: 'Damage Rocketeers',
    description:
      'Pre-fire during lock-on window, then break LOS before rockets land.',
    maxPoints: 14_500,
    difficultyTier: 'Medium',
    branch: 'conditioning',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/damage-rocketeers.webp',
    tips: [
      'Mid-range precision weapons.',
      'Break cover between volleys.',
      'Prioritize over flanking ARC.',
      'Scan upward before entering areas.',
    ],
    guideUrl: 'https://metaforge.app/arc-raiders/damage-rocketeers',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-damage-wasps',
    name: 'Damage Wasps',
    description: 'Strip whole swarm with area fire before they scatter.',
    maxPoints: 12_500,
    difficultyTier: 'Medium',
    branch: 'conditioning',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/damage-wasps.webp',
    tips: [
      'Position under large structures.',
      'Area-effect weapons.',
      'Predictable loops — position ahead.',
      'Commit to open ground briefly.',
    ],
    guideUrl: 'https://metaforge.app/arc-raiders/damage-wasps',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-destroy-small-arc',
    name: 'Destroy Small ARC',
    description: 'Ticks, Fireballs, Pops — splash damage clears packs.',
    maxPoints: 12_000,
    difficultyTier: 'Easy',
    branch: 'conditioning',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/destroy-ticks-fireballs-and-pops.webp',
    tips: [
      'One grenade > ten individual shots.',
      'Hold height for angle.',
      'Let them advance toward you.',
      'Clear small swarm first in mixed.',
    ],
    guideUrl:
      'https://metaforge.app/arc-raiders/destroy-ticks-fireballs-and-pops',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-damage-any-arc',
    name: 'Damage Any ARC',
    description: 'Maximize output on high-density patrol routes.',
    maxPoints: 10_000,
    difficultyTier: 'Easy',
    branch: 'conditioning',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/Damage_any_ARC_enemies.webp',
    tips: [
      'Target heavy patrol corridors.',
      'Full squad focus on one target.',
      'High-ground with sightlines.',
      'Conserve ammo between pulls.',
    ],
  },
  {
    trialId: 'trial-damage-ground-arc',
    name: 'Damage Ground ARC',
    description: 'Ground-based only — every shot at flyer is wasted.',
    maxPoints: 11_500,
    difficultyTier: 'Medium',
    branch: 'conditioning',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/damage-ground-based-arc-enemies.webp',
    tips: [
      'Ignore aerial ARC.',
      'Pull packs to chokepoints.',
      'Burst builds over sustained DPS.',
      'One player on flanking duty.',
    ],
    guideUrl:
      'https://metaforge.app/arc-raiders/damage-ground-based-arc-enemies',
    guideLabel: 'MetaForge guide',
  },
  // Exploration / Loot Trials
  {
    trialId: 'trial-loot-bird-nests',
    name: 'Loot Bird Nests',
    description: 'Plan vertical circuit before engaging ARC.',
    maxPoints: 10_000,
    difficultyTier: 'Easy',
    branch: 'mobility',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/loot-birds-nests.webp',
    tips: [
      'Know nest ledges per map.',
      'Slide-jump chains for elevation.',
      'Skip ARC packs near nests.',
      'All three can loot same nests.',
    ],
    guideUrl: 'https://metaforge.app/arc-raiders/loot-birds-nests',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-traffic-tunnels',
    name: 'Traffic Tunnels',
    description: 'Underground tunnel network — clear once, sprint loot runs.',
    maxPoints: 11_000,
    difficultyTier: 'Medium',
    branch: 'mobility',
    mapName: 'Dam Battlegrounds',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/Containersunderground.webp',
    tips: [
      'Enter from western ramp.',
      'Prioritize central junction hub.',
      'Clear ARC first, then loot.',
      'Avoid during Hurricane/Night Raid.',
    ],
    guideUrl:
      'https://metaforge.app/arc-raiders/open-containers-inside-the-traffic-tunnels',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-search-husks',
    name: 'Search Husks',
    description: 'First Wave husks only in opening raid window.',
    maxPoints: 12_000,
    difficultyTier: 'Medium',
    branch: 'mobility',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/search-first-wave-husks.webp',
    tips: [
      'Drop on earliest insertion.',
      'Focus outer sectors first.',
      'Learn darker shell coloring.',
      'Split patrol loop.',
    ],
    guideUrl: 'https://metaforge.app/arc-raiders/search-first-wave-husks',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-disarm-mines',
    name: 'Disarm Mines',
    description: 'Locked Gate mine circuit — chain disarms without stopping.',
    maxPoints: 16_000,
    difficultyTier: 'Hard',
    branch: 'mobility',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/disarm-mines-during-locked-gate.webp',
    tips: [
      'Check MetaForge before raid.',
      'Learn 3-4 spawn locations.',
      'Crouched-sprint animation saves 0.8s.',
      'Bring smoke grenade.',
    ],
    guideUrl:
      'https://metaforge.app/arc-raiders/disarm-mines-during-locked-gate',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-raider-caches',
    name: 'Raider Caches',
    description: 'Sweep outer ring early, push central before traffic peaks.',
    maxPoints: 11_500,
    difficultyTier: 'Medium',
    branch: 'mobility',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/search-raider-caches.webp',
    tips: [
      'Clear outer-ring first 2-3 mins.',
      'Speed circuit not combat sweep.',
      'Search and move immediately.',
      'Pre-agree which to skip.',
    ],
    guideUrl: 'https://metaforge.app/arc-raiders/search-raider-caches',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-download-bunker',
    name: 'Download Bunker',
    description: 'Clear entry patrol before progress bar, hold both entries.',
    maxPoints: 15_500,
    difficultyTier: 'Hard',
    branch: 'mobility',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/download-information-inside-the-bunker.webp',
    tips: [
      'Position before UTC trigger.',
      'Clear all ARC inside first.',
      'Two guard entries, one terminal.',
      'Dont split across terminals.',
    ],
    guideUrl:
      'https://metaforge.app/arc-raiders/download-information-inside-the-bunker',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-harvest-plants',
    name: 'Harvest Plants',
    description: 'Circuit growth zones without stopping to fight.',
    maxPoints: 9_000,
    difficultyTier: 'Easy',
    branch: 'mobility',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/harvest-plants.webp',
    tips: [
      'Learn 4-6 cluster locations.',
      'Clear nearby ARC before interacting.',
      'Skip contested clusters.',
      'Time with Lush Blooms events.',
    ],
    guideUrl: 'https://metaforge.app/arc-raiders/harvest-plants',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-open-probes',
    name: 'Open Probes',
    description: 'Sprint interact animation from corner — cant be flanked.',
    maxPoints: 11_000,
    difficultyTier: 'Medium',
    branch: 'mobility',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/open-arc-probes.webp',
    tips: [
      'Probes near patrol waypoints.',
      'Face wall/corner during interact.',
      'Kill 2-3 adjacent ARC only.',
      'Mark on squad HUD.',
    ],
    guideUrl: 'https://metaforge.app/arc-raiders/open-arc-probes',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-supply-drops',
    name: 'Supply Drops',
    description: 'Rotate immediately — first 60s have minimal competition.',
    maxPoints: 10_500,
    difficultyTier: 'Medium',
    branch: 'mobility',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/Search_Supply_Drops.webp',
    tips: [
      'Rotate immediately on minimap ping.',
      'Search and leave within 30s.',
      'Bring mobility over firepower.',
      'Evaluate fight cost vs rotating.',
    ],
  },
  {
    trialId: 'trial-west-highway',
    name: 'West Highway',
    description: 'All damage must land west of highway on Dam Battlegrounds.',
    maxPoints: 13_000,
    difficultyTier: 'Medium',
    branch: 'mobility',
    mapName: 'Dam Battlegrounds',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/damage-flying-arc-enemies.webp',
    tips: [
      'Mark highway as hard stop.',
      'Push western industrial blocks first.',
      'Dont pursue east of road.',
      'One player holds highway block.',
    ],
  },
  // Survival Trials
  {
    trialId: 'trial-get-lightning',
    name: 'Get Lightning',
    description: 'Stand in painted center — survive with sustain gear.',
    maxPoints: 8_500,
    difficultyTier: 'Easy',
    branch: 'survival',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/get-hit-by-lightning.webp',
    tips: [
      'Heavy sustain loadout.',
      'Stand in center tile.',
      'Move to fresh painted sector between.',
      'Coordinate who absorbs each strike.',
    ],
    guideUrl: 'https://metaforge.app/arc-raiders/get-hit-by-lightning',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-swamp-arc',
    name: 'Swamp ARC',
    description: 'Dense foliage caps visibility — rely on audio cues.',
    maxPoints: 13_000,
    difficultyTier: 'Medium',
    branch: 'survival',
    mapName: 'Swamp',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/destroy-arc-enemies-in-the-swamp.webp',
    tips: [
      'Rely on audio cues.',
      'Shotguns/SMGs outperform rifles.',
      'Hold elevated ridges.',
      'Move aggressively through patrol paths.',
    ],
    guideUrl:
      'https://metaforge.app/arc-raiders/destroy-arc-enemies-in-the-swamp',
    guideLabel: 'MetaForge guide',
  },
  {
    trialId: 'trial-medical-research',
    name: 'Medical Research',
    description: 'High container density — enter via secure side-corridor.',
    maxPoints: 11_000,
    difficultyTier: 'Medium',
    branch: 'survival',
    mapName: 'Any',
    imageUrl:
      'https://cdn.metaforge.app/arc-raiders/weekly-trials/search-containers-in-the-medical-research-wing.webp',
    tips: [
      'Secure corridor side-entrance.',
      'Sweep both adjacent rooms.',
      'Open and move immediately.',
      'Mark wing entrance on map.',
    ],
    guideUrl:
      'https://metaforge.app/arc-raiders/search-containers-in-the-medical-research-wing',
    guideLabel: 'MetaForge guide',
  },
];

// Split into weekly rotations (5-6 trials per week)
const TRIAL_WEEKS: TrialBrief[][] = [
  ALL_TRIALS.filter((t) =>
    [
      'trial-hornet-havoc',
      'trial-damage-shredders',
      'trial-loot-bird-nests',
      'trial-get-lightning',
      'trial-damage-bastions',
    ].includes(t.trialId),
  ),
  ALL_TRIALS.filter((t) =>
    [
      'trial-carriable-dash',
      'trial-damage-flying-arc',
      'trial-traffic-tunnels',
      'trial-swamp-arc',
      'trial-damage-queens',
    ].includes(t.trialId),
  ),
  ALL_TRIALS.filter((t) =>
    [
      'trial-bombardier-siege',
      'trial-damage-rocketeers',
      'trial-search-husks',
      'trial-medical-research',
      'trial-destroy-small-arc',
    ].includes(t.trialId),
  ),
  ALL_TRIALS.filter((t) =>
    [
      'trial-lightning-gauntlet',
      'trial-damage-wasps',
      'trial-disarm-mines',
      'trial-damage-any-arc',
      'trial-download-bunker',
    ].includes(t.trialId),
  ),
  ALL_TRIALS.filter((t) =>
    [
      'trial-flying-arc-hunt',
      'trial-damage-spotters',
      'trial-raider-caches',
      'trial-damage-ground-arc',
      'trial-harvest-plants',
    ].includes(t.trialId),
  ),
  ALL_TRIALS.filter((t) =>
    [
      'trial-frostline',
      'trial-damage-snitches',
      'trial-open-probes',
      'trial-supply-drops',
      'trial-west-highway',
      'trial-damage-leapers',
    ].includes(t.trialId),
  ),
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getUtcMondayMidnightMs(now: Date = new Date()): number {
  const d = new Date(now);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function getCurrentWeekIndex(now: Date = new Date()): number {
  const mondayMs = getUtcMondayMidnightMs(now);
  return Math.floor(
    (mondayMs / (7 * 24 * 60 * 60 * 1000)) % TRIAL_WEEKS.length,
  );
}

function formatWeekLabel(now: Date): string {
  const mon = new Date(getUtcMondayMidnightMs(now));
  const sun = new Date(mon);
  sun.setUTCDate(sun.getUTCDate() + 6);
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  };
  const y = mon.getUTCFullYear();
  return `Week of ${mon.toLocaleDateString('en-US', opts)} – ${sun.toLocaleDateString('en-US', opts)}, ${y} (UTC)`;
}

// ─── Trial Card Component ────────────────────────────────────────────────────
function TrialCard({ trial }: { trial: TrialBrief }) {
  const [open, setOpen] = useState(false);
  const color = BRANCH_COLOR[trial.branch];
  const diffColor =
    trial.difficultyTier === 'Hard'
      ? '#e83a3a'
      : trial.difficultyTier === 'Medium'
        ? '#f1aa1c'
        : '#25bb55';
  return (
    <div
      className="border overflow-hidden transition-all hover:border-[var(--color-arc-yellow)]/40"
      style={{ borderColor: BORDER, background: BG }}
    >
      {/* Image header */}
      <div className="relative h-28 overflow-hidden">
        <img
          src={trial.imageUrl}
          alt={trial.name}
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div
          className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-black/60 border"
          style={{ borderColor: color, color }}
        >
          {BRANCH_ICON[trial.branch]}
          {trial.branch}
        </div>
        <div
          className="absolute top-2 right-2 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-black/60 border"
          style={{ borderColor: diffColor, color: diffColor }}
        >
          {trial.difficultyTier}
        </div>
        <div className="absolute bottom-2 left-2 right-2">
          <h3 className="text-sm font-black uppercase tracking-wide text-white truncate">
            {trial.name}
          </h3>
          {trial.mapName && (
            <div className="flex items-center gap-1 text-[9px] text-white/60 mt-0.5">
              <MapPin className="w-3 h-3" />
              {trial.mapName}
            </div>
          )}
        </div>
      </div>
      {/* Body */}
      <div className="p-3 space-y-3">
        <p className="text-[11px] leading-relaxed" style={{ color: MUTED }}>
          {trial.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" style={{ color: YELLOW }} />
            <span className="text-xs font-black" style={{ color: YELLOW }}>
              {trial.maxPoints.toLocaleString()}
            </span>
            <span className="text-[9px] uppercase" style={{ color: MUTED }}>
              max pts
            </span>
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider transition-colors hover:text-white"
            style={{ color: MUTED }}
          >
            {open ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            Tips
          </button>
        </div>
        {open && (
          <div
            className="border-t pt-3 space-y-2"
            style={{ borderColor: BORDER }}
          >
            <ul className="space-y-1.5">
              {trial.tips.map((tip, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-[10px] leading-snug"
                  style={{ color: 'var(--color-arc-white)' }}
                >
                  <span style={{ color }}>•</span>
                  <span className="flex-1">{tip}</span>
                </li>
              ))}
            </ul>
            {trial.guideUrl && (
              <a
                href={trial.guideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-[9px] font-black uppercase tracking-wider transition-colors hover:text-white"
                style={{ color: CYAN }}
              >
                <ExternalLink className="w-3 h-3" />
                {trial.guideLabel || 'View Guide'}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Tier metadata with images ────────────────────────────────────────────── */
const TIERS: { id: string; label: string; img?: string }[] = [
  { id: 'All', label: 'All' },
  {
    id: 'Cantina Legend',
    label: 'Cantina Legend',
    img: assetUrl('/trials/cantinalegend.webp'),
  },
  { id: 'Hotshot', label: 'Hotshot', img: assetUrl('/trials/hotshot.webp') },
  {
    id: 'Daredevil',
    label: 'Daredevil',
    img: assetUrl('/trials/daredevil1.webp'),
  },
  {
    id: 'Wildcard',
    label: 'Wildcard',
    img: assetUrl('/trials/wildcard1.webp'),
  },
  { id: 'Tryhard', label: 'Tryhard', img: assetUrl('/trials/tryhard1.webp') },
  { id: 'Rookie', label: 'Rookie', img: assetUrl('/trials/rookie1.webp') },
];

/* Weekly screenshot gallery images */
const WEEKLY_SCREENSHOTS = [
  assetUrl('/trials/weekly/img_1520.webp'),
  assetUrl('/trials/weekly/img_1521.webp'),
  assetUrl('/trials/weekly/img_1522.webp'),
  assetUrl('/trials/weekly/img_1523.webp'),
  assetUrl('/trials/weekly/img_1524.webp'),
  assetUrl('/trials/weekly/img_1525.webp'),
  assetUrl('/trials/weekly/img_1526.webp'),
  assetUrl('/trials/weekly/img_1527.webp'),
];

/* ─── Rank medal ──────────────────────────────────────────────────────────── */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="text-lg font-black" style={{ color: '#FFD700' }}>
        #1
      </span>
    );
  if (rank === 2)
    return (
      <span className="text-lg font-black" style={{ color: '#C0C0C0' }}>
        #2
      </span>
    );
  if (rank === 3)
    return (
      <span className="text-lg font-black" style={{ color: '#CD7F32' }}>
        #3
      </span>
    );
  return (
    <span className="text-sm font-black" style={{ color: MUTED }}>
      #{rank}
    </span>
  );
}

/* ─── Single player row ────────────────────────────────────────────────────── */
function PlayerRow({ player, idx }: { player: TrialPlayer; idx: number }) {
  const tierColor = TrialsService.getTierColor(player.tier ?? '');
  const tierMeta = TIERS.find(
    (t) => t.id !== 'All' && player.tier?.includes(t.id),
  );
  return (
    <div
      className="flex items-center gap-4 px-4 py-3 border-b transition-colors hover:bg-white/[0.02]"
      style={{ borderColor: BORDER, background: idx % 2 === 0 ? BG : CARD }}
    >
      {/* Rank */}
      <div className="w-12 shrink-0 text-center">
        <RankBadge rank={player.rank} />
      </div>

      {/* Username */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-black uppercase tracking-wide truncate"
          style={{ color: 'var(--color-arc-white)' }}
        >
          {player.username}
        </p>
        {player.percentile !== undefined && (
          <p className="text-[10px]" style={{ color: MUTED }}>
            Top {player.percentile.toFixed(1)}%
          </p>
        )}
      </div>

      {/* Tier (with icon if available) */}
      <div
        className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 border text-[9px] font-black uppercase tracking-widest"
        style={{
          color: tierColor,
          borderColor: `${tierColor}40`,
          background: `${tierColor}10`,
        }}
      >
        {tierMeta?.img && (
          <img
            src={tierMeta.img}
            alt={tierMeta.label}
            className="w-4 h-4 object-contain"
          />
        )}
        {player.tier ?? '—'}
      </div>

      {/* Score */}
      <div className="shrink-0 text-right min-w-[64px]">
        <p className="text-sm font-black" style={{ color: YELLOW }}>
          {player.score.toLocaleString()}
        </p>
        <p
          className="text-[9px] uppercase tracking-widest"
          style={{ color: MUTED }}
        >
          pts
        </p>
      </div>
    </div>
  );
}

/* ─── Weekly screenshot gallery ─────────────────────────────────────────────── */
function WeeklyGallery() {
  const [lightbox, setLightbox] = useState<string | null>(null);
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <img
          src={assetUrl('/trials/reward.webp')}
          alt="Reward"
          className="w-5 h-5 object-contain"
        />
        <h2
          className="text-xs font-black uppercase tracking-[0.2em]"
          style={{ color: 'var(--color-arc-white)' }}
        >
          Weekly Snapshots
        </h2>
        <div className="flex-1 h-px" style={{ background: BORDER }} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {WEEKLY_SCREENSHOTS.map((src) => (
          <button
            key={src}
            onClick={() => setLightbox(src)}
            className="relative overflow-hidden border transition-all hover:border-[var(--color-arc-yellow)]/60 group"
            style={{ borderColor: BORDER, aspectRatio: '16/9' }}
          >
            <img
              src={src}
              alt="Weekly trial"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 cursor-pointer"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Trial screenshot"
            className="max-w-[90vw] max-h-[90vh] object-contain border"
            style={{ borderColor: BORDER }}
          />
          <span
            className="absolute top-4 right-6 text-2xl font-black cursor-pointer"
            style={{ color: MUTED }}
          >
            ✕
          </span>
        </div>
      )}
    </section>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────────── */
export default function TrialsLeaderboardPage() {
  const [activeTrialId, setActiveTrialId] = useState<string>('current');
  const [players, setPlayers] = useState<TrialPlayer[]>([]);
  const [liveTrials, setLiveTrials] = useState<MfWeeklyTrials | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tierFilter, setTierFilter] = useState('All');

  // Fallback to hardcoded catalog if live data fails
  const currentWeekIdx = getCurrentWeekIndex();
  const fallbackWeekTrials =
    TRIAL_WEEKS[currentWeekIdx] || ALL_TRIALS.slice(0, 5);

  const fetchLiveInfo = async () => {
    try {
      const res = await getWeeklyTrials();
      setLiveTrials(res);
    } catch (err) {
      console.error('[Trials] Failed to fetch live info:', err);
    }
  };

  const loadLeaderboard = async (trialId: string, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);

    try {
      const id = trialId === 'current' ? undefined : trialId;
      const data = await TrialsService.getWeeklyTrials(id);
      setPlayers(data || []);
    } catch (err) {
      console.error('[Trials] Leaderboard error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveInfo();
    loadLeaderboard(activeTrialId);
  }, [activeTrialId]);

  const timeLeft = useWeeklyResetCountdown(liveTrials?.activeWindowEnd);

  const filtered = useMemo(() => {
    if (tierFilter === 'All') return players;
    return players.filter((p) => p.tier?.includes(tierFilter));
  }, [players, tierFilter]);

  const handleRefresh = () => loadLeaderboard(activeTrialId, true);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-10">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--color-arc-yellow)]/10 border border-[var(--color-arc-yellow)]/40 rounded-lg">
              <Radio className="w-5 h-5 text-[var(--color-arc-yellow)] animate-pulse" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-[0.3em]">
              Live Operations
            </h1>
          </div>
          <p className="text-[11px] text-[var(--color-arc-muted)] uppercase tracking-[0.2em]">
            Weekly Trials · World Leaderboard · {formatWeekLabel(new Date())}
          </p>
        </div>

        <div className="flex items-center gap-6 bg-black/40 border border-[var(--color-arc-border)] p-4 rounded-xl backdrop-blur-md">
          <div className="flex items-center gap-3 border-r border-[var(--color-arc-border)] pr-6">
            <Clock className="w-4 h-4 text-[var(--color-arc-muted)]" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-arc-muted)]">
                Reset Countdown
              </p>
              <div className="mt-0.5">
                <CountdownDisplay timeLeft={timeLeft} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Trophy className="w-4 h-4 text-[var(--color-arc-yellow)]" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-arc-muted)]">
                Global Ranking
              </p>
              <p className="text-lg font-black text-white">Top 1,000</p>
            </div>
          </div>
        </div>
      </div>

      {/* This week's trials */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-[var(--color-arc-rare)]" />
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">
            Active Trials Catalog
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {fallbackWeekTrials.map((t) => (
            <TrialCard key={t.trialId} trial={t} />
          ))}
        </div>
      </section>

      {/* Leaderboard Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Board */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[var(--color-arc-yellow)]" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                World Leaderboard
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-1 mr-4">
                {TIERS.map((tier) => {
                  const active = tierFilter === tier.id;
                  const color =
                    tier.id === 'All'
                      ? YELLOW
                      : TrialsService.getTierColor(tier.id);
                  return (
                    <button
                      key={tier.id}
                      onClick={() => setTierFilter(tier.id)}
                      className="px-2 py-1 text-[8px] font-black uppercase tracking-widest border transition-all"
                      style={{
                        color: active ? '#000' : color,
                        borderColor: active ? color : `${color}40`,
                        background: active ? color : `${color}10`,
                      }}
                    >
                      {tier.label}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-[var(--color-arc-muted)] hover:text-white hover:bg-white/10 transition-all rounded-md"
              >
                <RefreshCw
                  className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="bg-[#0b0b0e] border border-[var(--color-arc-border)] overflow-hidden rounded-xl">
            {loading ? (
              <div className="py-32 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-[var(--color-arc-yellow)] mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-arc-muted)] animate-pulse">
                  Retrieving Rankings...
                </p>
              </div>
            ) : players.length === 0 ? (
              <div className="py-32 text-center">
                <p className="text-[var(--color-arc-muted)] uppercase tracking-widest text-xs">
                  No leaderboard data available
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white/[0.03] border-b border-[var(--color-arc-border)]">
                    <tr>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[var(--color-arc-muted)]">
                        Rank
                      </th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[var(--color-arc-muted)]">
                        Raider
                      </th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[var(--color-arc-muted)] text-right">
                        Score
                      </th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[var(--color-arc-muted)]">
                        Tier
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-arc-border)]">
                    {filtered.map((p, i) => (
                      <tr
                        key={p.userId || i}
                        className="hover:bg-white/[0.02] transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <span
                            className={`text-sm font-black ${
                              p.rank <= 3
                                ? 'text-[var(--color-arc-yellow)]'
                                : 'text-[var(--color-arc-muted)]'
                            }`}
                          >
                            #{p.rank}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black group-hover:border-[var(--color-arc-yellow)]/40 group-hover:bg-[var(--color-arc-yellow)]/5 transition-all">
                              {p.username[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-bold text-white group-hover:text-[var(--color-arc-yellow)] transition-colors">
                              {p.username}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-black tabular-nums text-[var(--color-arc-rare)]">
                            {p.score.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-black/40 border"
                            style={{
                              borderColor: `${TrialsService.getTierColor(p.tier || '')}40`,
                              color: TrialsService.getTierColor(p.tier || ''),
                            }}
                          >
                            {p.tier}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stats summary row */}
          {!loading && players.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: 'Total Operatives',
                  value: players.length.toLocaleString(),
                  icon: <Zap className="w-3.5 h-3.5" />,
                },
                {
                  label: 'Shown',
                  value: filtered.length.toLocaleString(),
                  icon: <Target className="w-3.5 h-3.5" />,
                },
                {
                  label: 'Top Score',
                  value: (players[0]?.score ?? 0).toLocaleString(),
                  icon: <Trophy className="w-3.5 h-3.5" />,
                },
                {
                  label: 'Avg Score',
                  value: Math.round(
                    players.reduce((s, p) => s + p.score, 0) / players.length,
                  ).toLocaleString(),
                  icon: <Timer className="w-3.5 h-3.5" />,
                },
              ].map(({ label, value, icon }) => (
                <div
                  key={label}
                  className="border p-3 rounded-lg"
                  style={{ borderColor: BORDER, background: CARD }}
                >
                  <div
                    className="flex items-center gap-1.5 mb-1"
                    style={{ color: MUTED }}
                  >
                    {icon}
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      {label}
                    </span>
                  </div>
                  <p className="text-lg font-black" style={{ color: YELLOW }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar / Rotation Details */}
        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-[var(--color-arc-epic)]" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                Rotation Tips
              </h2>
            </div>
            <div className="space-y-4">
              {fallbackWeekTrials.slice(0, 3).map((t) => (
                <div
                  key={t.trialId}
                  className="p-4 bg-[#0d0d12] border border-[var(--color-arc-border)] rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase text-white tracking-widest">
                      {t.name}
                    </p>
                    <span
                      className="text-[8px] font-black uppercase px-1.5 py-0.5 border"
                      style={{
                        borderColor: BRANCH_COLOR[t.branch],
                        color: BRANCH_COLOR[t.branch],
                      }}
                    >
                      {t.branch}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {t.tips.slice(0, 2).map((tip, i) => (
                      <li key={i} className="flex gap-2 text-[10px]">
                        <span className="text-[var(--color-arc-yellow)]">
                          •
                        </span>
                        <span className="text-[var(--color-arc-muted)] italic">
                          {tip}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="p-6 bg-gradient-to-br from-[var(--color-arc-yellow)]/10 to-transparent border border-[var(--color-arc-yellow)]/20 rounded-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity">
              <Zap className="w-20 h-20 text-[var(--color-arc-yellow)] -mr-4 -mt-4" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-arc-yellow)] mb-2">
              Trial Expert?
            </h3>
            <p className="text-[10px] text-[var(--color-arc-muted)] leading-relaxed mb-4">
              Share your max-score strategies and clips with the community on
              Discord to help fellow raiders climb the leaderboard.
            </p>
            <a
              href="https://discord.gg/arcraiders"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white border-b border-white/20 hover:border-[var(--color-arc-yellow)] transition-all pb-1"
            >
              Join Operations <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </section>

          {/* Weekly screenshot gallery fallback */}
          <WeeklyGallery />
        </div>
      </div>
    </div>
  );
}

// ─── Countdown Hook ──────────────────────────────────────────────────────────
function useWeeklyResetCountdown(apiTarget?: string | null) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      let targetMs: number;

      if (apiTarget) {
        targetMs = new Date(apiTarget).getTime();
      } else {
        targetMs = getUtcMondayMidnightMs(
          new Date(now + 7 * 24 * 60 * 60 * 1000),
        );
      }

      const diff = targetMs - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      const hours = Math.floor(
        (diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000),
      );
      const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((diff % (60 * 1000)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [apiTarget]);
  return timeLeft;
}

// ─── Countdown Display ─────────────────────────────────────────────────────────
function CountdownDisplay({
  timeLeft,
}: {
  timeLeft: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null;
}) {
  if (!timeLeft)
    return (
      <div className="h-6 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: MUTED }} />
      </div>
    );
  const pad = (n: number) => n.toString().padStart(2, '0');
  const blocks = [
    { label: 'D', value: timeLeft.days },
    { label: 'H', value: timeLeft.hours },
    { label: 'M', value: timeLeft.minutes },
    { label: 'S', value: timeLeft.seconds },
  ];
  return (
    <div className="flex items-center gap-2">
      {blocks.map((b, i) => (
        <div key={b.label} className="flex items-center gap-1">
          <span
            className="text-lg font-black tabular-nums"
            style={{ color: YELLOW }}
          >
            {pad(b.value)}
          </span>
          <span
            className="text-[8px] uppercase tracking-widest font-black"
            style={{ color: MUTED }}
          >
            {b.label}
          </span>
          {i < blocks.length - 1 && (
            <span
              className="text-lg font-black opacity-20"
              style={{ color: MUTED }}
            >
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
