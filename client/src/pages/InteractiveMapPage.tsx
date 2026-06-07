/**
 * InteractiveMapPage — Two-screen interactive map
 * Screen 1: World overview with map markers, live events, side panel
 * Screen 2: Full tile-based Leaflet map with POI layers, containers, difficulty filter
 */
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  type Map as LMap,
  type TileLayer as LTileLayer,
  type Marker as LMarker,
  type LayerGroup as LLayerGroup,
  icon,
} from 'leaflet';
import {
  ChevronLeft,
  ChevronDown,
  Layers,
  Eye,
  EyeOff,
  MapPin,
  X,
  Clock,
  AlertTriangle,
  Crosshair,
  Search,
  Settings,
  User,
  PanelLeftClose,
  ChevronsUpDown,
  Check,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import '../data/map-css/metaforge-vendor-leaflet.css';
import '../data/map-css/metaforge-map-search.css';
import '../data/map-css/metaforge-node-inspector.css';
import '../data/map-css/metaforge-vendor.css';
import '../data/map-css/styles.css';

import { MAPS, getMapById, interactiveTileUrl } from '../data/pois/maps';
import type { MapMeta } from '../data/pois/maps';
import type { MapPoi, PoiCategory, Difficulty } from '../data/pois/poi-types';
import {
  damBattlegroundsPois,
  buriedCityPois,
  blueGatePois,
  spaceportPois,
  stellaMontisPois,
  rivenTidesPois,
} from '../data/pois';
import {
  POI_CATEGORY_META,
  buildPoiMarkerHtml,
  buildContainerMarkerHtml,
} from '../data/pois/poiMarkers';
import {
  CONTAINERS_BY_MAP,
  CONTAINER_TYPE_META,
} from '../data/pois/containers';
import type { ContainerMarker } from '../data/pois/containers';
import {
  getDifficultiesForMap,
  CATEGORY_GROUPS,
} from '../data/pois/map-interactive-config';
import {
  FILTER_CATEGORIES,
  LOCATION_TYPES_BY_CATEGORY,
  LOCATION_TYPE_MAP,
  CATEGORY_COLOR,
} from '../data/pois/locationTypes';
import type {
  FilterCategory,
  LocationTypeDef,
} from '../data/pois/locationTypes';
import { useLiveLocations } from '../hooks/useLiveLocations';
import type { ApiLocation } from '../hooks/useLiveLocations';
import { assetUrl } from '../lib/assetUrl';
import { SHIESTY_ICONS, RUSTBELT_ICONS } from '../data/pois/mapIconRegistry';
import {
  countVisitedMapPins,
  fetchRemoteMapProgress,
  isMapPinVisited,
  loadMapProgress,
  mergeMapProgress,
  pushRemoteMapProgress,
  saveMapProgress,
  toggleMapPinVisited,
} from '../lib/mapProgressStorage';
import type { MapProgressSave } from '../lib/mapProgressStorage';

/* ── Constants ────────────────────────────────────────────────────────────── */
const YELLOW = '#f1aa1c';
const MUTED = '#b0a0c0';
const BG = '#080b16';
const BORDER = '#2d1f38';
const CARD = '#1a1120';
const RUST_BELT_OVERVIEW_MAP = 'https://assets.shiesty.me/maps/blank-map.png';

const RISK_COLORS: Record<string, string> = {
  Low: '#4ade80',
  Medium: '#facc15',
  High: '#f97316',
  Extreme: '#ef4444',
};

/* ── POI registry ─────────────────────────────────────────────────────────── */
const ALL_POIS: Record<string, MapPoi[]> = {
  'dam-battlegrounds': damBattlegroundsPois,
  'burial-city': buriedCityPois,
  spaceport: spaceportPois,
  'blue-gate': blueGatePois,
  'stella-montis': stellaMontisPois,
  'riven-tides': rivenTidesPois,
};

const OVERVIEW_MAPS = MAPS.filter((map) => map.id !== 'riven-tides');

/* ── Event definitions (from mapasset.html event data) ─────────────────── */
const EVENT_META: Record<
  string,
  {
    description: string;
    modifiers: string[];
    difficulty: number;
    multiplier: string | null;
    image: string;
    icon: string;
  }
> = {
  'Husk Graveyard': {
    description:
      'ARC husks scattered around Topside. A rare opportunity to gather parts.',
    modifiers: ['Electrified First Wave husks'],
    difficulty: 3,
    multiplier: null,
    image: RUSTBELT_ICONS.huskGraveyard,
    icon: RUSTBELT_ICONS.huskGraveyard,
  },
  'Buried Treasure': {
    description:
      "discovered during the Beachcombing map condition, a Minor Event exclusive to the Riven Tides map. To unearth it, you must use a Dockmaster's Detector to scan shorelines, following audio and visual cues to dig up valuable loot and quest items",
    modifiers: ['Beach Bombing'],
    difficulty: 5,
    multiplier: '2X',
    image: assetUrl('/map_condition/t_ui_mapcondition_buriedtreasure.webp'),
    icon: assetUrl('/icons/t_icon_mapcondition_buriedtreasure.webp'),
  },
  'Night Raid': {
    description:
      'Better loot behind locked doors, keys more plentiful. Heightened ARC activity.',
    modifiers: [
      'Fewer Return Points',
      'No Raider Hatches',
      'Increased loot value',
    ],
    difficulty: 5,
    multiplier: '2X',
    image: RUSTBELT_ICONS.nightRaid,
    icon: RUSTBELT_ICONS.nightRaid,
  },
  'Electromagnetic Storm': {
    description:
      'Lightning strikes batter the surface, frying electronics and disrupting ARC machines.',
    modifiers: [
      'Fewer Return Points',
      'No Raider Hatches',
      'Increased loot',
      'Lightning strikes',
    ],
    difficulty: 5,
    multiplier: '2X',
    image: RUSTBELT_ICONS.electromagneticStorm,
    icon: RUSTBELT_ICONS.electromagneticStorm,
  },
  'Hidden Bunker': {
    description:
      "Someone has hacked the Outskirts Bunker's security system. Find the buttons to unlock it.",
    modifiers: [
      'Fewer Return Points',
      'No Raider Hatches',
      'Activate Antennas',
      'Retrieve data',
    ],
    difficulty: 5,
    multiplier: '2X',
    image: RUSTBELT_ICONS.hiddenBunker,
    icon: RUSTBELT_ICONS.hiddenBunker,
  },
  'Cold Snap': {
    description:
      'A cold front with snowfall and dangerous temperatures. Candleberry bushes bearing fruit.',
    modifiers: ['Harvest Candleberries', 'Increased loot', 'Damaging cold'],
    difficulty: 4,
    multiplier: '2X',
    image: RUSTBELT_ICONS.coldSnap,
    icon: RUSTBELT_ICONS.coldSnap,
  },
  Matriarch: {
    description:
      'A Matriarch has been sighted nearby. Her children are keeping her from harm.',
    modifiers: [],
    difficulty: 4,
    multiplier: null,
    image: assetUrl('/maps/matriarch.webp'),
    icon: assetUrl('/maps/live-event-img/matriarch.webp'),
  },
  Harvester: {
    description:
      'A Harvester has descended, deploying extraction systems across the area.',
    modifiers: ['Harvester active in area'],
    difficulty: 3,
    multiplier: null,
    image: assetUrl('/maps/condition/harvester.webp'),
    icon: assetUrl('/maps/live-event-img/harvester.webp'),
  },
  'Launch Tower Loot': {
    description:
      'Launch tower systems briefly online, revealing hidden caches of supplies.',
    modifiers: ['Launch tower accessible', 'Increased loot value'],
    difficulty: 3,
    multiplier: null,
    image: RUSTBELT_ICONS.launchTowerLoot,
    icon: RUSTBELT_ICONS.launchTowerLoot,
  },
  'Locked Gate': {
    description:
      "The gate's security has malfunctioned, sealing off a section rich with untouched supplies.",
    modifiers: ['Gate security active', 'High-value loot behind gate'],
    difficulty: 4,
    multiplier: '2X',
    image: RUSTBELT_ICONS.lockedGate,
    icon: RUSTBELT_ICONS.lockedGate,
  },
  'Bird City': {
    description:
      'Flocks of birds have descended on the ruins, drawn by something deep below.',
    modifiers: [],
    difficulty: 3,
    multiplier: null,
    image: assetUrl('/maps/condition/birdcity.webp'),
    icon: assetUrl('/icons/t_icon_mapcondition_birdcity.webp'),
  },
  'Prospecting Probes': {
    description:
      'Automated probes deployed, marking valuable resource locations.',
    modifiers: ['Probe locations marked', 'Increased resource spawns'],
    difficulty: 3,
    multiplier: null,
    image: RUSTBELT_ICONS.prospectingProbes,
    icon: RUSTBELT_ICONS.prospectingProbes,
  },
  'Uncovered Caches': {
    description:
      'Old pre-Exodus resource caches uncovered. Plunder them before others do.',
    modifiers: ['Increased loot value', 'High-value resource caches'],
    difficulty: 3,
    multiplier: null,
    image: RUSTBELT_ICONS.uncoveredCaches,
    icon: RUSTBELT_ICONS.uncoveredCaches,
  },
  Hurricane: {
    description:
      'Strong winds sweeping across the surface. Reduced visibility and hearing.',
    modifiers: [
      'Increased loot value',
      'Debris affects Shields',
      'Higher-threat ARC',
    ],
    difficulty: 4,
    multiplier: '2X',
    image: RUSTBELT_ICONS.hurricane,
    icon: RUSTBELT_ICONS.hurricane,
  },
  'Lush Blooms': {
    description:
      'Rare flowers have bloomed across the surface, attracting wildlife.',
    modifiers: [],
    difficulty: 3,
    multiplier: null,
    image: RUSTBELT_ICONS.natureIcon,
    icon: RUSTBELT_ICONS.natureIcon,
  },
};

function getEventIcon(meta: (typeof EVENT_META)[string] | undefined) {
  if (!meta) return '';
  return meta.multiplier === '2X' ? RUSTBELT_ICONS.twoXPoints : meta.icon;
}

const INLINE_EVENT_SVGS: Record<string, string> = {
  'Electromagnetic Storm':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25.38 47.89"><path fill="currentColor" d="m25.38 20.219-10.642-.11L18.995 0 0 27.685l10.481-.017-4.256 20.219z"/></svg>',
  Hurricane:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0.22 0.6 89.56 84.81"><path fill="currentColor" fill-rule="evenodd" d="M73.772 71.622v-7.813c4.519 0 8.197-3.677 8.197-8.202 0-4.356-3.418-7.931-7.714-8.179v.003a6 6 0 0 0-.481-.018H.219v-7.812h73.464q.044-.002.089-.003.06 0 .118.003h.365v.009c8.604.253 15.526 7.332 15.526 15.997 0 8.827-7.181 16.015-16.009 16.015m-6.535-39.013v.012H6.229v-7.813h60.527q.245 0 .481-.018c4.297-.246 7.716-3.822 7.716-8.178 0-4.525-3.678-8.203-8.197-8.203-4.525 0-8.203 3.678-8.203 8.203h-7.812c0-8.828 7.187-16.015 16.015-16.015s16.009 7.187 16.009 16.015c0 8.665-6.923 15.744-15.528 15.997M52.543 53.391c8.605.253 15.528 7.332 15.528 15.997 0 8.828-7.181 16.015-16.009 16.015s-16.015-7.187-16.015-16.015h7.812c0 4.525 3.678 8.203 8.203 8.203 4.519 0 8.197-3.678 8.197-8.203 0-4.356-3.419-7.932-7.716-8.179a6 6 0 0 0-.481-.017H6.229v-7.813h46.314z"/></svg>',
  'Hidden Bunker':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 43.92 35.86"><g fill="currentColor"><path d="M0 31.954h43.923v3.904H0zM37.999 30.457h-9.761v-7.826c0-3.833-2.816-6.951-6.277-6.951s-6.277 3.118-6.277 6.951v7.826h-9.76v-7.826c0-9.214 7.195-16.711 16.037-16.711s16.037 7.497 16.037 16.711v7.826Z"/><path d="M43.923 30.457h-3.904v-8.496c0-9.957-8.1-18.057-18.057-18.057s-18.057 8.1-18.057 18.057v8.496H0v-8.496C0 9.852 9.852 0 21.962 0s21.961 9.852 21.961 21.961z"/></g></svg>',
  'Locked Gate':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0.93 0.93 84.14 84.14"><path fill="currentColor" fill-rule="evenodd" d="M73.937 85.068V43c0-17.058-13.878-30.937-30.937-30.937S12.063 25.942 12.063 43v42.068H.932V43C.932 19.804 19.803.932 43 .932S85.068 19.804 85.068 43v42.068zM42.952 37.456a4.78 4.78 0 0 1 4.78 4.781v7.878h-9.56v-7.878a4.78 4.78 0 0 1 4.78-4.781m-5.518 29.06H19.535V43.068c0-12.938 10.526-23.464 23.465-23.464 12.937 0 23.464 10.526 23.464 23.464v42H55.332v-42c0-6.8-5.533-12.333-12.332-12.333-6.801 0-12.334 5.533-12.334 12.333v12.317h17.066v29.683H19.471V73.937h17.963z"/></svg>',
  'Night Raid':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0.12 0.84 191.76 190.32"><path fill="currentColor" fill-rule="evenodd" d="M62.811 121.403c0-18.329 14.859-33.189 33.189-33.189s33.188 14.86 33.188 33.189S114.33 154.592 96 154.592s-33.189-14.859-33.189-33.189m40.564 69.755v-22.443c22.936-3.566 40.565-23.392 40.565-47.312 0-26.434-21.506-47.939-47.94-47.939s-47.94 21.505-47.94 47.939c0 23.92 17.629 43.745 40.564 47.312v22.443C39.122 187.388.121 146.057.121 95.59c0-47.936 35.18-87.652 81.128-94.748V15.83c-37.712 6.959-66.377 40.064-66.377 79.76 0 26.086 12.4 49.302 31.591 64.148-8.226-10.596-13.153-23.877-13.153-38.335 0-34.623 28.067-62.69 62.69-62.69s62.69 28.067 62.69 62.69c0 14.458-4.928 27.74-13.153 38.336 19.191-14.846 31.591-38.063 31.591-64.149 0-39.696-28.665-72.801-66.378-79.76V.842c45.949 7.096 81.129 46.812 81.129 94.748 0 50.467-39.001 91.798-88.504 95.568"/></svg>',
  'Launch Tower Loot':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0.41 0.34 65.19 87.31"><path fill="currentColor" fill-rule="evenodd" d="m48.848 16.637 16.747 71.019H35.643V.344h21.088V12.09h-5.552zm-31.696 0-2.331-4.547H9.269V.344h21.088v87.312H.405z"/></svg>',
  'Cold Snap':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 47.2 43.02"><g fill="currentColor"><path d="M23.6 43.017h7.652c0-8.808 7.14-15.949 15.949-15.949v-7.652c-13.034 0-23.6 10.566-23.6 23.6Z"/><path d="M0 19.417v7.652c8.808 0 15.949 7.14 15.949 15.949h7.652c0-13.034-10.566-23.6-23.6-23.6ZM19.24 17.718a14.7 14.7 0 0 1 2.893 4.073 15 15 0 0 1 1.391 4.908h.152a15 15 0 0 1 1.391-4.908 14.96 14.96 0 0 1 6.974-6.974 15 15 0 0 1 4.908-1.391v-.152A14.895 14.895 0 0 1 23.675 0h-.152a14.895 14.895 0 0 1-13.274 13.274v.152a14.7 14.7 0 0 1 4.891 1.391 14.8 14.8 0 0 1 4.098 2.901Z"/></g></svg>',
  'Husk Graveyard':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 76"><g fill="currentColor"><path d="M44.118 0H33.53v11.529h-7.059V0H15.883L0 26v24l15.882 26H26.47V64.471h7.059V76h10.588l15.882-26V26zM54 46h-5.675C45.238 53.061 38.2 58 30 58s-15.237-4.939-18.325-12H6V30h5.675C14.762 22.939 21.8 18 30 18s15.237 4.939 18.325 12H54z"/><path d="M46 35.219h-5.241c-1.236-4.795-5.577-8.342-10.759-8.342s-9.522 3.547-10.759 8.342H14v5.562h5.241c1.236 4.795 5.577 8.342 10.759 8.342s9.522-3.547 10.759-8.342H46z"/></g></svg>',
};

function EventBadge({
  eventName,
  className = '',
}: {
  eventName: string;
  className?: string;
}) {
  const svg = INLINE_EVENT_SVGS[eventName];
  if (svg) {
    const sizedSvg = svg.replace('<svg ', '<svg width="100%" height="100%" ');
    return (
      <span
        className={`inline-flex items-center justify-center ${className}`}
        dangerouslySetInnerHTML={{ __html: sizedSvg }}
      />
    );
  }
  const meta = EVENT_META[eventName];
  return meta ? (
    <img src={getEventIcon(meta)} alt="" className={className} />
  ) : null;
}

/* ── Live events hook ─────────────────────────────────────────────────────── */
type LiveEvent = {
  mapName: string;
  eventName: string;
  startTime: number | null; // epoch ms
  endTime: number | null; // epoch ms
  isMinor: boolean;
};

function parseMfTs(v: string | number | undefined | null): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v < 1e10 ? v * 1000 : v;
  const n = Number(v);
  if (!isNaN(n)) return n < 1e10 ? n * 1000 : n;
  const d = new Date(v).getTime();
  return isNaN(d) ? null : d;
}

function useLiveEvents() {
  const [events, setEvents] = useState<LiveEvent[]>([]);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const arr = Array.isArray(data?.events) ? data.events : [];
      const now = Date.now();

      const mapped: LiveEvent[] = arr
        .map((e: any) => ({
          mapName: e.mapName ?? e.mapId ?? '',
          eventName: e.eventName ?? '',
          startTime: parseMfTs(e.startTime),
          endTime: parseMfTs(e.endTime),
          isMinor: e.category === 'minor',
        }))
        .filter((e: LiveEvent) => {
          return (
            e.startTime !== null &&
            e.endTime !== null &&
            e.startTime <= now &&
            now < e.endTime
          );
        });

      setEvents(mapped);
    } catch (err) {
      console.warn(
        '[InteractiveMapPage] Failed to load generated events:',
        err,
      );
      setEvents([]);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const id = setInterval(fetchEvents, 60_000);
    return () => clearInterval(id);
  }, [fetchEvents]);

  return events;
}

/* ── Countdown formatter ─────────────────────────────────────────────────── */
function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  if (h > 0)
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ── Confirmed positions (from rustbelt/mapNodes.js) ─────────────────────── */
const OVERVIEW_POSITIONS: Record<
  string,
  {
    marker: { top: number; left: number };
    label: { top: number; left: number };
    eventDelta: { top: number; left: number };
    eventLabel: { left: number; top: number };
  }
> = {
  'dam-battlegrounds': {
    marker: { top: 54.52, left: 53.9 },
    label: { top: 48.84, left: 58.12 },
    eventDelta: { top: 14.2, left: -1.3 },
    eventLabel: { left: 60.02, top: 68.06 },
  },
  spaceport: {
    marker: { top: 13.17, left: 28.05 },
    label: { top: 6.81, left: 31.66 },
    eventDelta: { top: 14.93, left: -0.69 },
    eventLabel: { left: 35.05, top: 28.03 },
  },
  'burial-city': {
    marker: { top: 45.08, left: 14.84 },
    label: { top: 39.45, left: 18.82 },
    eventDelta: { top: 14.64, left: -1.0 },
    eventLabel: { left: 20.92, top: 58.68 },
  },
  'blue-gate': {
    marker: { top: 39.07, left: 74.15 },
    label: { top: 33.41, left: 78.05 },
    eventDelta: { top: 14.93, left: -1.07 },
    eventLabel: { left: 80.26, top: 53.32 },
  },
  'stella-montis': {
    marker: { top: 7.52, left: 74.18 },
    label: { top: 0.92, left: 79.0 },
    eventDelta: { top: 15.82, left: -1.99 },
    eventLabel: { left: 79.68, top: 21.03 },
  },
  'riven-tides': {
    marker: { top: 81.45, left: 13.2 },
    label: { top: 87.1, left: 17.5 },
    eventDelta: { top: 14.5, left: -1.0 },
    eventLabel: { left: 19.3, top: 96.2 },
  },
};

/* ── MAP_DEFAULTS (descriptions when no event active) ────────────────────── */
const MAP_DEFAULTS: Record<
  string,
  { description: string; difficulty: number }
> = {
  'dam-battlegrounds': {
    description:
      'The Dam Battlegrounds stretch across a vast hydroelectric complex, now overrun by ARC machines. Raiders brave these grounds for the rich salvage left behind.',
    difficulty: 3,
  },
  spaceport: {
    description:
      "Acerra Spaceport is a majestic testament to humanity's past ambitions. This is where the Exodus shuttles once roared into the heavens.",
    difficulty: 3,
  },
  'burial-city': {
    description:
      'Deep beneath layers of sand and debris lies a city frozen in time. The Buried City holds secrets — and dangers — from before the ARC invasion.',
    difficulty: 4,
  },
  'blue-gate': {
    description:
      'Once a steadfast symbol of defiant connection, the Blue Gate now serves as a daunting entryway into the perilous mountain ranges.',
    difficulty: 4,
  },
  'stella-montis': {
    description:
      'A mountain station shrouded in mystery. Stella Montis towers above the surrounding landscape, its upper and lower levels each hiding their own dangers.',
    difficulty: 4,
  },
  'riven-tides': {
    description:
      'Riven Tides sprawls along a shattered coastline where crumbling cliffs and tidal ruins create a maze of vertical combat zones and hidden caches.',
    difficulty: 3,
  },
};

/* ── Map name normalizer ──────────────────────────────────────────────────── */
function normalizeMapName(name: string): string | undefined {
  const n = name.toLowerCase().replace(/[^a-z]/g, '');
  if (n.includes('dam')) return 'dam-battlegrounds';
  if (n.includes('buried') || n.includes('burial')) return 'burial-city';
  if (n.includes('spaceport')) return 'spaceport';
  if (n.includes('blue') || n.includes('gate')) return 'blue-gate';
  if (n.includes('stella')) return 'stella-montis';
  if (n.includes('riven') || n.includes('tides')) return 'riven-tides';
  return undefined;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * SCREEN 1 — MapOverview  (blank-map.png + positioned markers, labels,
 *            SVG connector lines, event icons with live countdown timers,
 *            side panel with map details/events, double-click to enter map)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function MapOverview({
  onInspect,
  liveEvents,
}: {
  onInspect: (map: MapMeta) => void;
  liveEvents: LiveEvent[];
}) {
  const [selectedMapId, setSelectedMapId] = useState<string | null>(
    'dam-battlegrounds',
  );
  const [showMode, setShowMode] = useState<'DEFAULT' | 'MAIN' | 'MINOR'>(
    'DEFAULT',
  );
  const [now, setNow] = useState(Date.now());
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedMap = selectedMapId ? getMapById(selectedMapId) : null;

  // Tick every second for countdown timers
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Build per-map event lookup: { main: LiveEvent | null, minor: LiveEvent | null }
  const eventsByMap = useMemo(() => {
    const m: Record<
      string,
      { main: LiveEvent | null; minor: LiveEvent | null }
    > = {};
    OVERVIEW_MAPS.forEach((mp) => {
      m[mp.id] = { main: null, minor: null };
    });
    liveEvents.forEach((e) => {
      const id = normalizeMapName(e.mapName);
      if (!id || !m[id]) return;
      if (e.isMinor) {
        m[id].minor = e;
      } else {
        m[id].main = e;
      }
    });
    return m;
  }, [liveEvents]);

  const selectMap = useCallback(
    (mapId: string, mode: 'DEFAULT' | 'MAIN' | 'MINOR' = 'DEFAULT') => {
      setSelectedMapId(mapId);
      setShowMode(mode);
    },
    [],
  );

  const selectedEvents = selectedMapId ? eventsByMap[selectedMapId] : null;
  const primaryEvent =
    showMode === 'MAIN'
      ? selectedEvents?.main
      : (selectedEvents?.minor ?? selectedEvents?.main ?? null);
  const primaryMeta = primaryEvent ? EVENT_META[primaryEvent.eventName] : null;
  const defaults = selectedMapId ? MAP_DEFAULTS[selectedMapId] : null;

  return (
    <div
      className="map-app flex flex-col h-[calc(100vh-120px)]"
      style={{ background: BG }}
    >
      <div
        className="flex items-center justify-between gap-4 border-b px-5 py-3"
        style={{ background: '#0a0a0f', borderColor: BORDER }}
      >
        <div>
          <p
            className="text-[10px] font-black uppercase tracking-[0.3em]"
            style={{ color: YELLOW }}
          >
            SHIESTY RAIDERS
          </p>
          <h1
            className="text-lg font-black uppercase tracking-widest"
            style={{ color: '#f5ead6' }}
          >
            Rust Belt Operations Map
          </h1>
        </div>
        <div
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest"
          style={{ color: '#4ade80', border: `1px solid ${BORDER}` }}
        >
          <Clock className="w-3.5 h-3.5" />
          Live conditions
        </div>
      </div>
      <div className="flex flex-1">
        {/* Left: world map with positioned markers + events */}
        <div className="flex flex-col flex-1">
          <div
            ref={wrapperRef}
            className="flex-1 flex items-center justify-center p-4"
            style={{ background: '#0a0a0f', overflow: 'auto' }}
          >
            <div
              className="relative w-full max-w-[1180px] aspect-[2752/1536]"
              style={{
                minWidth: 760,
                maxHeight: '100%',
              }}
            >
              <div
                className="absolute inset-0 overflow-hidden rounded-xl"
                style={{
                  boxShadow: '0 0 60px rgba(0,0,0,0.7)',
                  WebkitMaskImage:
                    'radial-gradient(ellipse at center, #000 58%, rgba(0,0,0,0.85) 74%, transparent 100%)',
                  maskImage:
                    'radial-gradient(ellipse at center, #000 58%, rgba(0,0,0,0.85) 74%, transparent 100%)',
                }}
              >
                <img
                  src={assetUrl('/maps/blank-map.png')}
                  alt="Rust Belt map background"
                  className="h-full w-full object-cover"
                  style={{
                    opacity: 0.72,
                    filter: 'contrast(1.08) saturate(0.9)',
                  }}
                  onError={(event) => {
                    const img = event.currentTarget;
                    if (img.src !== RUST_BELT_OVERVIEW_MAP) {
                      img.src = RUST_BELT_OVERVIEW_MAP;
                    }
                  }}
                />
              </div>

              {/* SVG connector lines */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 5 }}
              >
                {OVERVIEW_MAPS.map((m) => {
                  const pos = OVERVIEW_POSITIONS[m.id];
                  if (!pos) return null;
                  return (
                    <line
                      key={`line-${m.id}`}
                      x1={`${pos.marker.left}%`}
                      y1={`${pos.marker.top}%`}
                      x2={`${pos.label.left}%`}
                      y2={`${pos.label.top + 1.5}%`}
                      stroke="rgba(255,255,255,0.35)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  );
                })}
                {/* Event icon → event label lines */}
                {OVERVIEW_MAPS.map((m) => {
                  const pos = OVERVIEW_POSITIONS[m.id];
                  const ev = eventsByMap[m.id]?.main;
                  if (!pos || !ev) return null;
                  const iconTop = pos.label.top + pos.eventDelta.top;
                  const iconLeft = pos.label.left + pos.eventDelta.left;
                  return (
                    <line
                      key={`eline-${m.id}`}
                      x1={`${iconLeft}%`}
                      y1={`${iconTop}%`}
                      x2={`${pos.eventLabel.left}%`}
                      y2={`${pos.eventLabel.top}%`}
                      stroke="rgba(255,255,255,0.35)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>

              {/* Map marker dots */}
              {OVERVIEW_MAPS.map((m) => {
                const pos = OVERVIEW_POSITIONS[m.id];
                if (!pos) return null;
                const active = selectedMapId === m.id;
                return (
                  <button
                    key={`dot-${m.id}`}
                    onClick={() => selectMap(m.id, 'DEFAULT')}
                    onDoubleClick={() => {
                      const mp = getMapById(m.id);
                      if (mp) onInspect(mp);
                    }}
                    className="absolute"
                    style={{
                      top: `${pos.marker.top}%`,
                      left: `${pos.marker.left}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 10,
                    }}
                  >
                    <img
                      src={assetUrl(
                        active
                          ? '/maps/icons/icon_8.svg'
                          : '/maps/icons/icon_7.svg',
                      )}
                      alt={m.displayName}
                      className="w-6 h-6 object-contain transition-all"
                      style={{
                        filter: active
                          ? `drop-shadow(0 0 10px ${YELLOW})`
                          : 'drop-shadow(0 0 5px rgba(255,255,255,0.35))',
                      }}
                    />
                  </button>
                );
              })}

              {/* Map name labels */}
              {OVERVIEW_MAPS.map((m) => {
                const pos = OVERVIEW_POSITIONS[m.id];
                if (!pos) return null;
                const active = selectedMapId === m.id;
                const hasMinor = !!eventsByMap[m.id]?.minor;
                return (
                  <button
                    key={`label-${m.id}`}
                    onClick={() => selectMap(m.id, 'DEFAULT')}
                    onDoubleClick={() => {
                      const mp = getMapById(m.id);
                      if (mp) onInspect(mp);
                    }}
                    className="absolute"
                    style={{
                      top: `${pos.label.top}%`,
                      left: `${pos.label.left}%`,
                      transform: 'translate(-50%, 0)',
                      zIndex: 15,
                    }}
                  >
                    <div
                      className="flex items-center gap-1 px-2 py-0.5 rounded-sm transition-all"
                      style={{
                        background: active
                          ? 'rgba(241,170,28,0.2)'
                          : 'rgba(8,11,22,0.85)',
                        border: `1px solid ${active ? YELLOW : 'rgba(255,255,255,0.15)'}`,
                      }}
                    >
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: active ? '#fff' : '#ece2d0' }}
                      >
                        {m.displayName}
                      </span>
                      {/* Minor event icon inline */}
                      {hasMinor && (
                        <EventBadge
                          eventName={eventsByMap[m.id]!.minor!.eventName}
                          className="w-3.5 h-3.5 text-white opacity-80"
                        />
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Main event icons (circular) + countdown labels */}
              {OVERVIEW_MAPS.map((m) => {
                const pos = OVERVIEW_POSITIONS[m.id];
                const ev = eventsByMap[m.id]?.main;
                if (!pos || !ev) return null;
                const meta = EVENT_META[ev.eventName];
                if (!meta) return null;

                const iconTop = pos.label.top + pos.eventDelta.top;
                const iconLeft = pos.label.left + pos.eventDelta.left;
                const isFuture = ev.startTime != null && ev.startTime > now;
                const timeLeft = isFuture
                  ? ev.startTime! - now
                  : ev.endTime != null
                    ? ev.endTime - now
                    : null;
                const active = selectedMapId === m.id && showMode === 'MAIN';

                return (
                  <div key={`event-${m.id}`}>
                    {/* Event icon */}
                    <button
                      onClick={() => selectMap(m.id, 'MAIN')}
                      onDoubleClick={() => {
                        const mp = getMapById(m.id);
                        if (mp) onInspect(mp);
                      }}
                      className="absolute transition-all"
                      style={{
                        top: `${iconTop}%`,
                        left: `${iconLeft}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 20,
                        opacity: isFuture ? 0.5 : 1,
                        filter: active
                          ? 'drop-shadow(0 0 8px rgba(241,170,28,0.6))'
                          : 'none',
                      }}
                    >
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-full"
                        style={{
                          border: `2px solid ${active ? YELLOW : 'rgba(255,255,255,0.4)'}`,
                          background: 'rgba(8,11,22,0.88)',
                          color: '#fff',
                        }}
                      >
                        <EventBadge
                          eventName={ev.eventName}
                          className="w-7 h-7 text-white"
                        />
                      </span>
                    </button>

                    {/* Event label + timer */}
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        top: `${pos.eventLabel.top}%`,
                        left: `${pos.eventLabel.left}%`,
                        transform: 'translate(-50%, 0)',
                        zIndex: 21,
                      }}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className="text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap px-1.5 py-0.5 rounded-sm"
                          style={{
                            color: active ? '#fff' : '#ece2d0',
                            background: active
                              ? 'rgba(241,170,28,0.2)'
                              : 'rgba(8,11,22,0.85)',
                            border: `1px solid ${active ? YELLOW : 'rgba(255,255,255,0.15)'}`,
                          }}
                        >
                          {ev.eventName.toUpperCase()}
                        </span>
                        {timeLeft != null && timeLeft > 0 && (
                          <span
                            className="text-[10px] font-mono tabular-nums"
                            style={{ color: isFuture ? '#facc15' : '#4ade80' }}
                          >
                            {isFuture ? 'Starts ' : ''}
                            {formatCountdown(timeLeft)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Map selector strip */}
          <div
            className="border-t px-4 py-3 overflow-x-auto"
            style={{ background: CARD, borderColor: BORDER }}
          >
            <div className="flex gap-3 min-w-max">
              {OVERVIEW_MAPS.map((m) => {
                const active = selectedMapId === m.id;
                const ev = eventsByMap[m.id]?.main;
                return (
                  <button
                    key={m.id}
                    onClick={() => selectMap(m.id)}
                    onDoubleClick={() => onInspect(m)}
                    className="flex-shrink-0 relative overflow-hidden transition-all"
                    style={{
                      width: 140,
                      height: 80,
                      border: `2px solid ${active ? YELLOW : BORDER}`,
                      borderRadius: 4,
                      boxShadow: active ? `0 0 12px ${YELLOW}40` : 'none',
                    }}
                  >
                    <img
                      src={m.coverImage}
                      alt={m.displayName}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(transparent 40%, rgba(0,0,0,0.85))',
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white truncate">
                        {m.displayName}
                      </p>
                    </div>
                    {ev && (
                      <div
                        className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full animate-pulse"
                        style={{ background: '#ef4444' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <p
              className="text-[8px] mt-2 tracking-widest uppercase"
              style={{ color: MUTED }}
            >
              Event data by{' '}
              <a
                href="https://metaforge.app"
                target="_blank"
                rel="noopener"
                style={{ color: YELLOW }}
              >
                MetaForge
              </a>
            </p>
          </div>
        </div>

        {/* Right side panel */}
        <div
          className="flex flex-col gap-3 p-4 border-l overflow-y-auto"
          style={{
            borderColor: BORDER,
            background: CARD,
            width: 300,
            minWidth: 300,
          }}
        >
          {selectedMap ? (
            <>
              {/* Map image */}
              <div
                className="relative overflow-hidden"
                style={{ borderRadius: 4, border: `1px solid ${BORDER}` }}
              >
                <img
                  src={primaryMeta?.image ?? selectedMap.coverImage}
                  alt={selectedMap.displayName}
                  className="w-full h-36 object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(transparent 50%, rgba(0,0,0,0.8))',
                  }}
                />
                {/* Difficulty pips */}
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background:
                          i <
                          (primaryMeta?.difficulty ?? defaults?.difficulty ?? 3)
                            ? YELLOW
                            : 'rgba(255,255,255,0.15)',
                      }}
                    />
                  ))}
                </div>
                {/* Multiplier badge */}
                {primaryMeta?.multiplier && (
                  <div
                    className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-black rounded-sm"
                    style={{ background: '#ef4444', color: '#fff' }}
                  >
                    {primaryMeta.multiplier}
                  </div>
                )}
              </div>

              {/* Map name / Event name */}
              <div>
                <p
                  className="text-[9px] font-semibold uppercase tracking-widest"
                  style={{ color: MUTED }}
                >
                  {primaryEvent
                    ? selectedMap.displayName
                    : 'NO ACTIVE MAP CONDITION'}
                </p>
                <h3
                  className="text-base font-bold uppercase"
                  style={{ color: '#ece2d0' }}
                >
                  {primaryEvent
                    ? primaryEvent.eventName
                    : selectedMap.displayName}
                </h3>
              </div>

              {/* Event icon + timer */}
              {primaryMeta && primaryEvent && (
                <div
                  className="flex items-center gap-2 p-2"
                  style={{ background: BG, border: `1px solid ${BORDER}` }}
                >
                  <EventBadge
                    eventName={primaryEvent.eventName}
                    className="w-10 h-10 shrink-0 text-white"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[9px] font-black uppercase tracking-widest"
                      style={{ color: YELLOW }}
                    >
                      {primaryEvent.startTime != null &&
                      primaryEvent.startTime > now
                        ? 'UPCOMING EVENT'
                        : 'ACTIVE EVENT'}
                    </p>
                    {primaryEvent.endTime && primaryEvent.endTime > now && (
                      <p
                        className="text-xs font-mono tabular-nums"
                        style={{ color: '#4ade80' }}
                      >
                        {formatCountdown(primaryEvent.endTime - now)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
                {primaryMeta?.description ??
                  defaults?.description ??
                  selectedMap.description}
              </p>

              {/* Event modifiers */}
              {primaryMeta && primaryMeta.modifiers.length > 0 && (
                <div
                  className="p-2"
                  style={{ background: BG, border: `1px solid ${BORDER}` }}
                >
                  <p
                    className="text-[9px] font-black uppercase tracking-widest mb-1.5"
                    style={{ color: YELLOW }}
                  >
                    MODIFIERS
                  </p>
                  <ul className="space-y-1">
                    {primaryMeta.modifiers.map((mod, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <AlertTriangle
                          className="w-3 h-3 shrink-0 mt-0.5"
                          style={{ color: '#ef4444' }}
                        />
                        <span
                          className="text-[10px]"
                          style={{ color: '#ece2d0' }}
                        >
                          {mod}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Features */}
              <div className="flex flex-wrap gap-1">
                {selectedMap.features.map((f) => (
                  <span
                    key={f}
                    className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5"
                    style={{
                      color: MUTED,
                      border: `1px solid ${BORDER}`,
                      background: BG,
                    }}
                  >
                    {f}
                  </span>
                ))}
              </div>

              {/* INSPECT MAP button */}
              <button
                onClick={() => onInspect(selectedMap)}
                className="w-full py-3 text-xs font-black uppercase tracking-widest transition-all hover:brightness-110"
                style={{
                  background: YELLOW,
                  color: '#000',
                  border: 'none',
                  letterSpacing: '0.15em',
                }}
              >
                INSPECT MAP
              </button>
            </>
          ) : (
            <div
              className="flex flex-col items-center justify-center flex-1 gap-3"
              style={{ color: MUTED }}
            >
              <MapPin className="w-8 h-8 opacity-40" />
              <p className="text-xs font-black uppercase tracking-widest text-center">
                Select a map to view details
              </p>
              <p className="text-[9px] text-center" style={{ color: MUTED }}>
                Double-click a map to enter
              </p>
            </div>
          )}

          {/* All live events card */}
          {liveEvents.length > 0 && (
            <div
              className="mt-auto p-3"
              style={{ background: BG, border: `1px solid ${BORDER}` }}
            >
              <p
                className="text-[9px] font-black uppercase tracking-widest mb-2"
                style={{ color: YELLOW }}
              >
                <Clock className="w-3 h-3 inline mr-1" />
                LIVE EVENTS
              </p>
              <div className="space-y-2">
                {liveEvents.slice(0, 6).map((e, i) => {
                  const meta = EVENT_META[e.eventName];
                  const isFuture = e.startTime != null && e.startTime > now;
                  const timeLeft = isFuture
                    ? e.startTime! - now
                    : e.endTime != null
                      ? e.endTime - now
                      : null;
                  return (
                    <button
                      key={i}
                      className="flex items-center gap-2 w-full text-left hover:opacity-80"
                      onClick={() => {
                        const id = normalizeMapName(e.mapName);
                        if (id) selectMap(id, 'MAIN');
                      }}
                    >
                      {meta && (
                        <EventBadge
                          eventName={e.eventName}
                          className="w-6 h-6 shrink-0 text-white"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[10px] font-bold uppercase truncate"
                          style={{ color: '#ece2d0' }}
                        >
                          {e.eventName}
                        </p>
                        <p
                          className="text-[8px] uppercase tracking-widest"
                          style={{ color: MUTED }}
                        >
                          {e.mapName}
                        </p>
                      </div>
                      {timeLeft != null && timeLeft > 0 && (
                        <span
                          className="text-[9px] font-mono tabular-nums shrink-0"
                          style={{ color: isFuture ? '#facc15' : '#4ade80' }}
                        >
                          {formatCountdown(timeLeft)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Live marker icon builder ─────────────────────────────────────────── */
function buildLiveMarkerHtml(
  typeDef: LocationTypeDef,
  selected: boolean,
  visited = false,
): string {
  const color = CATEGORY_COLOR[typeDef.category];
  const size = selected ? 28 : 22;
  return `<div style="
    position:relative;
    width:${size}px;height:${size}px;
    background:rgba(5,10,18,0.92);
    border:${selected ? '2.5' : '1.5'}px solid ${selected ? '#fff' : 'rgba(255,255,255,0.7)'};
    border-radius:${selected ? 8 : 6}px;
    box-shadow:0 0 ${selected ? 16 : 8}px ${color}${selected ? 'cc' : '80'}, 0 0 0 ${selected ? 2 : 1}px rgba(0,0,0,0.5);
    cursor:pointer;display:flex;align-items:center;justify-content:center;overflow:hidden;
    transition:transform 0.1s;
  " ${selected ? '' : 'onmouseenter="this.style.transform=\'scale(1.2)\'" onmouseleave="this.style.transform=\'scale(1)\'"'}>
    <img src="${typeDef.iconUrl}" style="width:${selected ? 18 : 14}px;height:${selected ? 18 : 14}px;object-fit:contain;filter:drop-shadow(0 0 4px ${color});" />
    ${
      visited
        ? `<span style="
            position:absolute;
            right:-5px;
            bottom:-5px;
            width:13px;
            height:13px;
            border-radius:999px;
            background:#34d399;
            border:1.5px solid #071018;
            color:#071018;
            font-size:9px;
            line-height:10px;
            font-weight:900;
            text-align:center;
          ">✓</span>`
        : ''
    }
  </div>`;
}

const FALLBACK_LOCATION_TYPE_BY_POI_CATEGORY: Record<PoiCategory, string> = {
  extract: 'evac',
  key: 'locked_room',
  quest: 'quest',
  container: 'field_crate',
  loot: 'field_depot',
  nature: 'great_mullein',
  arc: 'tick',
  interaction: 'supply_station',
  noise: 'nest',
  area: 'field_depot',
};

function poiToFallbackLocation(poi: MapPoi, map: MapMeta): ApiLocation {
  const coordinateSize = map.tileConfig
    ? map.tileConfig.mapPixelSize / 2 ** map.tileConfig.layers[0].maxNativeZoom
    : 512;

  return {
    id: `curated-${poi.id}`,
    locationType: FALLBACK_LOCATION_TYPE_BY_POI_CATEGORY[poi.category],
    coordinate: [
      -(poi.y / 100) * coordinateSize,
      (poi.x / 100) * coordinateSize,
    ],
    description: poi.description,
    name: poi.name,
    layer: 'surface',
    properties: {
      source: 'curated',
      category: poi.category,
      tags: poi.tags,
    },
  };
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * SCREEN 2 — MapExplorer (arcraidersmaps.app replica)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function MapExplorer({
  map: initialMap,
  onBack,
}: {
  map: MapMeta;
  onBack: () => void;
}) {
  const [currentMap, setCurrentMap] = useState(initialMap);
  const map = currentMap;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<LMap | null>(null);
  const tileLayerRef = useRef<LTileLayer | null>(null);
  const markerLayerRef = useRef<LLayerGroup | null>(null);

  const [activeFloor, setActiveFloor] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapDropdownOpen, setMapDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tileQuality, setTileQuality] = useState<'high' | 'low'>('high');
  const [collapsedCategories, setCollapsedCategories] = useState<
    Set<FilterCategory>
  >(new Set());
  const [selectedLocation, setSelectedLocation] = useState<ApiLocation | null>(
    null,
  );
  const [mapProgress, setMapProgress] =
    useState<MapProgressSave>(loadMapProgress);
  const [progressSynced, setProgressSynced] = useState(false);

  // Active filters — set of location type IDs that are visible
  const [activeFilters, setActiveFilters] = useState<Set<string>>(() => {
    const all = new Set<string>();
    for (const types of Object.values(LOCATION_TYPES_BY_CATEGORY)) {
      types.forEach((t) => all.add(t.id));
    }
    return all;
  });

  const isMultiFloor = map.mapType === 'multi-floor' && map.floors;

  // Fetch live locations from API
  const { locations, loading } = useLiveLocations(map.id);

  const fallbackLocations = useMemo(() => {
    const pois = ALL_POIS[map.id] ?? [];
    return pois
      .filter((poi) => poi.floorIndex == null || poi.floorIndex === activeFloor)
      .map((poi) => poiToFallbackLocation(poi, map));
  }, [activeFloor, map]);

  const visibleLocations = useMemo(() => {
    if (locations.length === 0) return fallbackLocations;

    const liveIds = new Set(locations.map((loc) => loc.id));
    const liveNames = new Set(
      locations
        .map((loc) => `${loc.locationType}:${loc.name ?? ''}`.toLowerCase())
        .filter((key) => key.length > 1),
    );

    const curated = fallbackLocations.filter((loc) => {
      const nameKey = `${loc.locationType}:${loc.name ?? ''}`.toLowerCase();
      return !liveIds.has(loc.id) && !liveNames.has(nameKey);
    });

    return [...locations, ...curated];
  }, [fallbackLocations, locations]);

  // Filtered locations based on active filters
  const filteredLocations = useMemo(() => {
    return visibleLocations.filter((loc) =>
      activeFilters.has(loc.locationType),
    );
  }, [visibleLocations, activeFilters]);

  const visibleCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const loc of visibleLocations) {
      c[loc.locationType] = (c[loc.locationType] || 0) + 1;
    }
    return c;
  }, [visibleLocations]);

  const visitedCount = useMemo(
    () => countVisitedMapPins(mapProgress, map.id),
    [map.id, mapProgress],
  );

  const setLocationVisited = useCallback(
    (loc: ApiLocation, visited: boolean) => {
      const next = toggleMapPinVisited(mapProgress, map.id, loc.id, visited);
      setMapProgress(next);
      saveMapProgress(next);
      void pushRemoteMapProgress(next).catch((err) => {
        console.warn('[InteractiveMap] map progress sync failed:', err);
      });
    },
    [map.id, mapProgress],
  );

  useEffect(() => {
    let cancelled = false;
    fetchRemoteMapProgress()
      .then((remote) => {
        if (cancelled || !remote) return;
        const merged = mergeMapProgress(loadMapProgress(), remote);
        setMapProgress(merged);
        saveMapProgress(merged);
        setProgressSynced(true);
        return pushRemoteMapProgress(merged);
      })
      .catch((err) => {
        console.warn('[InteractiveMap] remote map progress unavailable:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Search-filtered location types for the sidebar
  const searchFilteredTypes = useMemo(() => {
    if (!searchQuery.trim()) return LOCATION_TYPES_BY_CATEGORY;
    const q = searchQuery.toLowerCase();
    const result: Record<FilterCategory, LocationTypeDef[]> = {} as any;
    for (const [cat, types] of Object.entries(LOCATION_TYPES_BY_CATEGORY)) {
      result[cat as FilterCategory] = types.filter((t) =>
        t.title.toLowerCase().includes(q),
      );
    }
    return result;
  }, [searchQuery]);

  // Toggle a single location type filter
  const toggleFilter = (typeId: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(typeId)) next.delete(typeId);
      else next.add(typeId);
      return next;
    });
  };

  // Toggle entire category
  const toggleCategoryFilters = (cat: FilterCategory) => {
    const types = LOCATION_TYPES_BY_CATEGORY[cat];
    const allActive = types.every((t) => activeFilters.has(t.id));
    setActiveFilters((prev) => {
      const next = new Set(prev);
      types.forEach((t) => {
        if (allActive) next.delete(t.id);
        else next.add(t.id);
      });
      return next;
    });
  };

  // Show All / Hide All
  const showAll = () => {
    const all = new Set<string>();
    for (const types of Object.values(LOCATION_TYPES_BY_CATEGORY)) {
      types.forEach((t) => all.add(t.id));
    }
    setActiveFilters(all);
  };
  const hideAll = () => setActiveFilters(new Set());

  // Toggle category collapse
  const toggleCollapse = (cat: FilterCategory) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Switch map via dropdown
  const switchMap = (m: MapMeta) => {
    setCurrentMap(m);
    setMapDropdownOpen(false);
    setSelectedLocation(null);
    setSearchQuery('');
    setActiveFloor(0);
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    setMapReady(false);

    import('leaflet').then((L) => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }

      const tc = map.tileConfig;
      if (!tc) return;

      const lmap = L.map(mapContainerRef.current!, {
        crs: L.CRS.Simple,
        minZoom: tc.minZoom,
        maxZoom: tc.maxZoom,
        zoomSnap: 0.25,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        attributionControl: false,
      });

      const layerDef = tc.layers[activeFloor] ?? tc.layers[0];
      const tileUrl = layerDef.mapPath
        ? interactiveTileUrl(layerDef.mapPath, tileQuality)
        : layerDef.tileUrl;
      const tile = L.tileLayer(tileUrl, {
        tileSize: tc.tileSize,
        minNativeZoom: layerDef.maxNativeZoom,
        maxNativeZoom: layerDef.maxNativeZoom,
        maxZoom: tc.maxZoom,
        minZoom: tc.minZoom,
        noWrap: true,
      });
      tile.addTo(lmap);
      tileLayerRef.current = tile;

      const size = tc.mapPixelSize;
      const southWest = lmap.unproject([0, size], layerDef.maxNativeZoom);
      const northEast = lmap.unproject([size, 0], layerDef.maxNativeZoom);
      lmap.fitBounds(L.latLngBounds(southWest, northEast));

      const markerGroup = L.layerGroup().addTo(lmap);
      markerLayerRef.current = markerGroup;

      lmap.on('click', () => {
        setSelectedLocation(null);
      });

      leafletRef.current = lmap;
      setMapReady(true);
    });

    return () => {
      setMapReady(false);
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map.id, tileQuality]);

  // Switch tile layer for floor changes
  useEffect(() => {
    if (!leafletRef.current || !map.tileConfig) return;
    const tc = map.tileConfig;
    const layerDef = tc.layers[activeFloor] ?? tc.layers[0];
    const tileUrl = layerDef.mapPath
      ? interactiveTileUrl(layerDef.mapPath, tileQuality)
      : layerDef.tileUrl;

    import('leaflet').then((L) => {
      if (tileLayerRef.current) {
        tileLayerRef.current.remove();
      }
      const tile = L.tileLayer(tileUrl, {
        tileSize: tc.tileSize,
        minNativeZoom: layerDef.maxNativeZoom,
        maxNativeZoom: layerDef.maxNativeZoom,
        maxZoom: tc.maxZoom,
        minZoom: tc.minZoom,
        noWrap: true,
      });
      tile.addTo(leafletRef.current!);
      tileLayerRef.current = tile;
    });
  }, [activeFloor, map.tileConfig, tileQuality]);

  // Render live API markers
  useEffect(() => {
    if (
      !mapReady ||
      !leafletRef.current ||
      !markerLayerRef.current ||
      !map.tileConfig
    )
      return;
    const tc = map.tileConfig;
    const layerDef = tc.layers[activeFloor] ?? tc.layers[0];

    import('leaflet').then((L) => {
      markerLayerRef.current!.clearLayers();
      const lmap = leafletRef.current!;

      filteredLocations.forEach((loc) => {
        const typeDef = LOCATION_TYPE_MAP[loc.locationType];
        if (!typeDef) return;

        const [y, x] = loc.coordinate;
        const latLng = L.latLng(y, x);

        const isSelected = selectedLocation?.id === loc.id;
        const visited = isMapPinVisited(mapProgress, map.id, loc.id);
        const curatedCategory =
          loc.properties?.source === 'curated'
            ? (loc.properties.category as PoiCategory | undefined)
            : undefined;
        const html = curatedCategory
          ? buildPoiMarkerHtml(
              {
                category: curatedCategory,
                name: loc.name || typeDef.title,
              },
              isSelected,
              visited,
            )
          : buildLiveMarkerHtml(typeDef, isSelected, visited);
        const sz = isSelected ? 28 : 22;
        const icon = L.divIcon({
          className: '',
          html,
          iconSize: [sz, sz],
          iconAnchor: [sz / 2, sz / 2],
        });

        const marker = L.marker(latLng, { icon })
          .addTo(markerLayerRef.current!)
          .on('click', (e: any) => {
            L.DomEvent.stopPropagation(e);
            setSelectedLocation(loc);
          });

        const label = loc.name || typeDef.title;
        marker.bindTooltip(label, {
          direction: 'top',
          offset: [0, -14],
          className: 'leaflet-shiesty-tooltip',
        });
      });
    });
  }, [
    filteredLocations,
    selectedLocation,
    map.id,
    map.tileConfig,
    mapProgress,
    activeFloor,
    mapReady,
  ]);

  const totalVisible = filteredLocations.length;

  return (
    <div
      className="map-app flex flex-col h-[calc(100vh-120px)]"
      style={{ background: BG }}
    >
      {/* ── Top Navbar ───────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b shrink-0"
        style={{ background: '#0d0d12', borderColor: '#1a1a24', zIndex: 1000 }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider hover:opacity-80 transition-opacity"
            style={{ color: '#ece2d0' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold" style={{ color: '#ece2d0' }}>
            {map.displayName} - ARC Raiders
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Floor toggle in navbar for multi-floor maps */}
          {isMultiFloor && map.floors && (
            <div className="flex items-center gap-1 mr-3">
              <Layers className="w-3.5 h-3.5" style={{ color: MUTED }} />
              {map.floors.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFloor(i)}
                  className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border transition-all"
                  style={{
                    color: activeFloor === i ? '#000' : '#ece2d0',
                    borderColor: '#333',
                    background: activeFloor === i ? '#ece2d0' : 'transparent',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
          {/* Tile quality toggle */}
          <div className="flex items-center gap-1 mr-3">
            <Settings className="w-3.5 h-3.5" style={{ color: MUTED }} />
            <button
              onClick={() =>
                setTileQuality(tileQuality === 'high' ? 'low' : 'high')
              }
              className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border transition-all"
              style={{
                color: '#ece2d0',
                borderColor: '#333',
                background: 'transparent',
              }}
            >
              {tileQuality === 'high' ? 'HQ' : 'LQ'}
            </button>
          </div>
          <a
            href="https://shiesty.me"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all hover:bg-white/10"
            style={{ color: '#ece2d0', border: '1px solid #333' }}
          >
            <User className="w-3.5 h-3.5" />
            Sign In
          </a>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ── Left Sidebar (Filter Panel) ──────────────────────────────── */}
        {sidebarOpen && (
          <div
            className="flex flex-col border-r overflow-hidden shrink-0"
            style={{
              width: 320,
              background: '#111118',
              borderColor: '#1a1a24',
              zIndex: 601,
            }}
          >
            {/* Map dropdown */}
            <div
              className="relative border-b"
              style={{ borderColor: '#1a1a24' }}
            >
              <button
                onClick={() => setMapDropdownOpen((v) => !v)}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <MapPin
                  className="w-4 h-4 shrink-0"
                  style={{ color: '#9ca3af' }}
                />
                <span
                  className="flex-1 text-sm font-semibold truncate"
                  style={{ color: '#ece2d0' }}
                >
                  {map.displayName}
                </span>
                <ChevronsUpDown
                  className="w-4 h-4 shrink-0"
                  style={{ color: '#6b7280' }}
                />
              </button>
              {mapDropdownOpen && (
                <div
                  className="absolute top-full left-0 right-0 border-b shadow-2xl"
                  style={{
                    background: '#111118',
                    borderColor: '#1a1a24',
                    zIndex: 999,
                  }}
                >
                  {MAPS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => switchMap(m)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
                      style={{
                        background:
                          m.id === map.id
                            ? 'rgba(255,255,255,0.05)'
                            : 'transparent',
                      }}
                    >
                      <MapPin
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: m.id === map.id ? YELLOW : '#6b7280' }}
                      />
                      <span
                        className="text-sm"
                        style={{
                          color: m.id === map.id ? '#ece2d0' : '#9ca3af',
                        }}
                      >
                        {m.displayName}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tab bar: Filter / Waypoints / Close */}
            <div
              className="flex items-center border-b"
              style={{ borderColor: '#1a1a24' }}
            >
              <button
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold uppercase tracking-wider"
                style={{ color: YELLOW, borderBottom: `2px solid ${YELLOW}` }}
              >
                <img
                  src={assetUrl('/maps/icons/icon_7.svg')}
                  alt=""
                  className="w-4 h-4 opacity-80"
                  style={{ filter: 'invert(1)' }}
                />
                Filter
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-white/5"
                style={{ color: '#6b7280' }}
              >
                <img
                  src={assetUrl('/maps/icons/icon_8.svg')}
                  alt=""
                  className="w-4 h-4 opacity-50"
                  style={{ filter: 'invert(1)' }}
                />
                Waypoints
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="px-3 py-2.5 hover:bg-white/5 transition-colors"
              >
                <PanelLeftClose
                  className="w-4 h-4"
                  style={{ color: '#6b7280' }}
                />
              </button>
            </div>

            {/* Search bar */}
            <div
              className="px-3 py-2.5 border-b"
              style={{ borderColor: '#1a1a24' }}
            >
              <div
                className="flex items-center gap-2 px-3 py-2 rounded"
                style={{ background: '#0a0a10', border: '1px solid #222230' }}
              >
                <Search
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: '#6b7280' }}
                />
                <input
                  type="text"
                  placeholder={`Search ${map.displayName}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-600"
                  style={{ color: '#ece2d0' }}
                />
              </div>
            </div>

            {/* Show All / Hide All / Presets */}
            <div
              className="flex items-center gap-1.5 px-3 py-2 border-b"
              style={{ borderColor: '#1a1a24' }}
            >
              <button
                onClick={showAll}
                className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors hover:bg-white/10"
                style={{ color: '#9ca3af', border: '1px solid #2a2a36' }}
              >
                Show All
              </button>
              <button
                onClick={hideAll}
                className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors hover:bg-white/10"
                style={{ color: '#9ca3af', border: '1px solid #2a2a36' }}
              >
                Hide All
              </button>
              <button
                className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors hover:bg-white/10"
                style={{ color: '#9ca3af', border: '1px solid #2a2a36' }}
              >
                Presets
              </button>
            </div>

            {/* ── Category sections with individual filter toggles ──────── */}
            <div
              className="flex-1 overflow-y-auto"
              style={{ scrollbarWidth: 'thin' }}
            >
              {FILTER_CATEGORIES.map((cat) => {
                const types = searchFilteredTypes[cat.id] || [];
                if (types.length === 0 && searchQuery) return null;
                const collapsed = collapsedCategories.has(cat.id);
                const allActive = types.every((t) => activeFilters.has(t.id));
                const noneActive = types.every((t) => !activeFilters.has(t.id));

                return (
                  <div
                    key={cat.id}
                    className="border-b"
                    style={{ borderColor: '#1a1a24' }}
                  >
                    {/* Category header */}
                    <button
                      onClick={() => toggleCollapse(cat.id)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                    >
                      <ChevronDown
                        className="w-3.5 h-3.5 shrink-0 transition-transform"
                        style={{
                          color: cat.color,
                          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)',
                        }}
                      />
                      <span
                        className="flex-1 text-xs font-bold uppercase tracking-wider"
                        style={{ color: cat.color }}
                      >
                        {cat.title}
                      </span>
                      {/* Toggle all in category */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategoryFilters(cat.id);
                        }}
                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10"
                        title={allActive ? 'Hide all' : 'Show all'}
                      >
                        {allActive ? (
                          <Eye
                            className="w-3 h-3"
                            style={{ color: cat.color }}
                          />
                        ) : (
                          <EyeOff
                            className="w-3 h-3"
                            style={{ color: '#4b5563' }}
                          />
                        )}
                      </button>
                    </button>

                    {/* Individual filter items */}
                    {!collapsed && (
                      <div className="pb-1">
                        {types.map((typeDef) => {
                          const active = activeFilters.has(typeDef.id);
                          const count = visibleCounts[typeDef.id] || 0;
                          return (
                            <button
                              key={typeDef.id}
                              onClick={() => toggleFilter(typeDef.id)}
                              className="w-full flex items-center gap-2.5 px-4 py-1.5 text-left transition-colors hover:bg-white/5"
                              style={{ opacity: active ? 1 : 0.4 }}
                            >
                              <img
                                src={typeDef.iconUrl}
                                alt=""
                                className="w-5 h-5 object-contain shrink-0"
                                style={{
                                  filter: active ? 'none' : 'grayscale(1)',
                                }}
                              />
                              <span
                                className="flex-1 text-xs"
                                style={{
                                  color: active ? '#ece2d0' : '#6b7280',
                                }}
                              >
                                {typeDef.title}
                              </span>
                              {count > 0 && (
                                <span
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                  style={{
                                    color: active ? cat.color : '#4b5563',
                                    background: active
                                      ? `${cat.color}15`
                                      : 'transparent',
                                  }}
                                >
                                  {count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Loading indicator */}
              {loading && locations.length === 0 && (
                <div
                  className="flex items-center justify-center py-8"
                  style={{ color: MUTED }}
                >
                  <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2" />
                  <span className="text-xs uppercase tracking-wider">
                    Loading locations...
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Navigation — MetaForge style */}
            <div
              className="flex items-center justify-around border-t"
              style={{ borderColor: '#1a1a24', background: '#0d0d14' }}
            >
              {[
                { label: 'Filters', icon: Layers },
                { label: 'Loot', icon: Crosshair },
                { label: 'Contribute', icon: MapPin },
                { label: 'Settings', icon: Settings },
                { label: 'Home', icon: User },
              ].map((item) => (
                <button
                  key={item.label}
                  className="flex flex-col items-center gap-0.5 py-2 px-3 hover:bg-white/5 transition-colors"
                  style={{
                    color: item.label === 'Filters' ? YELLOW : '#6b7280',
                  }}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-[9px] font-semibold uppercase tracking-wider">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
            {/* Stats footer */}
            <div
              className="px-3 py-1.5 border-t text-center"
              style={{ borderColor: '#1a1a24' }}
            >
              <span
                className="text-[10px] uppercase tracking-wider"
                style={{ color: '#4b5563' }}
              >
                {totalVisible} / {visibleLocations.length} visible
                {visitedCount > 0 ? ` - ${visitedCount} checked` : ''}
                {progressSynced ? ' - synced' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Sidebar toggle button (when closed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-3 left-3 px-2.5 py-2 rounded shadow-lg hover:bg-white/10 transition-colors"
            style={{
              background: '#111118ee',
              border: '1px solid #1a1a24',
              zIndex: 1100,
            }}
          >
            <img
              src={assetUrl('/maps/icons/icon_7.svg')}
              alt="Open filters"
              className="w-5 h-5"
              style={{ filter: 'invert(1)' }}
            />
          </button>
        )}

        {/* ── Leaflet map ──────────────────────────────────────────────── */}
        <div
          ref={mapContainerRef}
          className="flex-1"
          style={{ background: '#0a0a0f' }}
        />

        {/* ── Location detail panel (right side) ───────────────────────── */}
        {selectedLocation &&
          (() => {
            const typeDef = LOCATION_TYPE_MAP[selectedLocation.locationType];
            const catColor = typeDef ? CATEGORY_COLOR[typeDef.category] : MUTED;
            const selectedVisited = isMapPinVisited(
              mapProgress,
              map.id,
              selectedLocation.id,
            );
            return (
              <div
                className="flex flex-col gap-3 p-4 border-l overflow-y-auto shrink-0"
                style={{
                  borderColor: '#1a1a24',
                  background: '#111118',
                  width: 300,
                  minWidth: 300,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className="text-sm font-bold uppercase leading-tight"
                    style={{ color: '#ece2d0' }}
                  >
                    {selectedLocation.name ||
                      typeDef?.title ||
                      selectedLocation.locationType}
                  </h3>
                  <button
                    onClick={() => setSelectedLocation(null)}
                    className="shrink-0 mt-0.5 hover:opacity-70"
                    style={{ color: '#6b7280' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Type badge */}
                {typeDef && (
                  <div
                    className="inline-flex items-center gap-1.5 px-2 py-1 w-fit text-[10px] font-bold uppercase tracking-wider rounded"
                    style={{
                      color: catColor,
                      background: `${catColor}15`,
                      border: `1px solid ${catColor}30`,
                    }}
                  >
                    <img src={typeDef.iconUrl} alt="" className="w-4 h-4" />
                    {typeDef.title}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setLocationVisited(selectedLocation, !selectedVisited)
                  }
                  className="inline-flex items-center justify-center gap-2 rounded px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors hover:bg-white/10"
                  style={{
                    color: selectedVisited ? '#071018' : '#34d399',
                    background: selectedVisited ? '#34d399' : '#34d39914',
                    border: '1px solid #34d39966',
                  }}
                >
                  <Check className="h-3.5 w-3.5" />
                  {selectedVisited ? 'Checked' : 'Mark Checked'}
                </button>

                {/* Description */}
                {selectedLocation.description && (
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: '#9ca3af' }}
                  >
                    {selectedLocation.description}
                  </p>
                )}

                {/* Image */}
                {selectedLocation.image && (
                  <div
                    className="rounded overflow-hidden"
                    style={{ border: '1px solid #1a1a24' }}
                  >
                    <img
                      src={selectedLocation.image}
                      alt=""
                      className="w-full h-40 object-cover"
                    />
                  </div>
                )}

                {/* Layer info */}
                <div
                  className="p-2.5 rounded"
                  style={{ background: '#0a0a10', border: '1px solid #1a1a24' }}
                >
                  <p
                    className="text-[9px] font-bold uppercase tracking-wider mb-1"
                    style={{ color: '#6b7280' }}
                  >
                    Layer
                  </p>
                  <p
                    className="text-xs font-semibold"
                    style={{ color: '#ece2d0' }}
                  >
                    {selectedLocation.layer}
                  </p>
                </div>

                {/* Coordinates */}
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className="p-2.5 rounded"
                    style={{
                      background: '#0a0a10',
                      border: '1px solid #1a1a24',
                    }}
                  >
                    <p
                      className="text-[9px] font-bold uppercase tracking-wider"
                      style={{ color: '#6b7280' }}
                    >
                      Y
                    </p>
                    <p
                      className="text-sm font-bold"
                      style={{ color: '#ece2d0' }}
                    >
                      {selectedLocation.coordinate[0].toFixed(1)}
                    </p>
                  </div>
                  <div
                    className="p-2.5 rounded"
                    style={{
                      background: '#0a0a10',
                      border: '1px solid #1a1a24',
                    }}
                  >
                    <p
                      className="text-[9px] font-bold uppercase tracking-wider"
                      style={{ color: '#6b7280' }}
                    >
                      X
                    </p>
                    <p
                      className="text-sm font-bold"
                      style={{ color: '#ece2d0' }}
                    >
                      {selectedLocation.coordinate[1].toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
      </div>

      {/* Leaflet styles */}
      <style>{`
        .leaflet-shiesty-tooltip {
          background: #111118 !important;
          border: 1px solid #1a1a24 !important;
          color: #ece2d0 !important;
          font-family: "Inter", "Barlow", sans-serif !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          letter-spacing: 0.02em !important;
          padding: 4px 10px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.6) !important;
          border-radius: 4px !important;
        }
        .leaflet-shiesty-tooltip::before { display: none !important; }
        .leaflet-container { font-family: "Inter", "Barlow", sans-serif; }
      `}</style>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Main page — two-screen controller
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function InteractiveMapPage() {
  const liveEvents = useLiveEvents();

  // Read ?map= param on mount to auto-open a specific map
  const [inspectedMap, setInspectedMap] = useState<MapMeta | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const mapId = params.get('map');
      if (mapId) return getMapById(mapId) ?? null;
    } catch {}
    return null;
  });

  // Also listen for shiesty:navigate events that carry a map detail
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: string; map?: string }>).detail;
      if (detail?.tab === 'mapviewer' && detail?.map) {
        const target = getMapById(detail.map);
        if (target) setInspectedMap(target);
      }
    };
    window.addEventListener('shiesty:navigate', handler);
    return () => window.removeEventListener('shiesty:navigate', handler);
  }, []);

  if (inspectedMap) {
    return (
      <MapExplorer
        map={inspectedMap}
        onBack={() => {
          setInspectedMap(null);
          // Clear the ?map= param so back button lands on overview
          const url = new URL(window.location.href);
          url.searchParams.delete('map');
          window.history.replaceState({}, '', url.toString());
        }}
      />
    );
  }

  return <MapOverview onInspect={setInspectedMap} liveEvents={liveEvents} />;
}
