import { useState, useEffect, useMemo } from 'react';
import {
  Timer,
  Clock,
  MapPin,
  AlertCircle,
  Activity,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { getMapImageUrl } from '../data/mapUtils';
import { useEventsSchedule } from '../hooks/useEventsSchedule';
import { EVENT_COLORS } from '../lib/events/eventsConfig';

/* ── Map definitions (display names + route IDs) ─────────────────────────── */
const MAPS: { key: string; displayName: string }[] = [
  { key: 'dam-battleground', displayName: 'Dam Battleground' },
  { key: 'buried-city', displayName: 'Buried City' },
  { key: 'the-spaceport', displayName: 'The Spaceport' },
  { key: 'blue-gate', displayName: 'Blue Gate' },
  { key: 'stella-montis', displayName: 'Stella Montis' },
  { key: 'riven-tides', displayName: 'Riven Tides' },
];

const DISPLAY_WINDOW_MS = 24 * 3_600_000;

/* ── Unified event shape used by UI ──────────────────────────────────────── */
interface MapEvent {
  id: string;
  eventType: string;
  category: 'major' | 'minor';
  icon: string | null;
  /** epoch ms when the event starts */
  startsAtMs: number;
  /** epoch ms when the event ends */
  endsAtMs: number;
  /** ms until start, or 0 when active — used for sorting / countdown */
  timeUntil: number;
  /** UTC hour slot */
  hour: number;
}

function parseEventTimestamp(value: number | string): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && /^\d+$/.test(value.trim())) {
    return numeric < 1e10 ? numeric * 1000 : numeric;
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

export default function LiveEventTimersPage() {
  const [now, setNow] = useState(Date.now());
  const [selectedMap, setSelectedMap] = useState<string>('all');

  // 1s clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const currentUTCHour = useMemo(() => new Date(now).getUTCHours(), [now]);

  // Generated workflow events — polls every 90s automatically
  const {
    events: scheduledEvents,
    loading,
    upstreamOk,
    fetchedAt,
    error,
    refresh,
  } = useEventsSchedule();

  /* ── Build per-map event lists ───────────────────────────────────────────── */
  const mapEvents = useMemo<Record<string, MapEvent[]>>(() => {
    const result: Record<string, MapEvent[]> = {};
    const knownMaps = new Set(MAPS.map((map) => map.key));

    for (const { key } of MAPS) result[key] = [];

    for (const event of scheduledEvents) {
      if (!knownMaps.has(event.mapId)) continue;

      const startsAtMs = parseEventTimestamp(event.startTime);
      const endsAtMs = parseEventTimestamp(event.endTime);
      if (startsAtMs === null || endsAtMs === null || endsAtMs <= now) continue;
      if (startsAtMs > now + DISPLAY_WINDOW_MS) continue;

      const category = event.category === 'major' ? 'major' : 'minor';
      result[event.mapId].push({
        id: `${event.mapId}-${event.eventTypeId}-${startsAtMs}`,
        eventType: event.eventName,
        category,
        icon: event.icon ?? null,
        startsAtMs,
        endsAtMs,
        timeUntil: Math.max(0, startsAtMs - now),
        hour: new Date(startsAtMs).getUTCHours(),
      });
    }

    for (const events of Object.values(result)) {
      events.sort(
        (a, b) =>
          a.timeUntil - b.timeUntil || a.eventType.localeCompare(b.eventType),
      );
    }

    return result;
  }, [now, scheduledEvents]);

  /* ── Active events (currently live) ─────────────────────────────────────── */
  const activeEvents = useMemo(() => {
    const active: Array<{ mapKey: string; event: MapEvent; mapName: string }> =
      [];
    for (const { key, displayName } of MAPS) {
      for (const event of mapEvents[key] || []) {
        const isActive = event.startsAtMs <= now && event.endsAtMs > now;
        if (isActive && event.timeUntil === 0) {
          active.push({ mapKey: key, event, mapName: displayName });
        }
      }
    }
    return active;
  }, [mapEvents, now]);

  /* ── Helpers ─────────────────────────────────────────────────────────────── */
  const formatTimeUntil = (ms: number) => {
    if (ms <= 0) return 'NOW';
    const hours = Math.floor(ms / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    const seconds = Math.floor((ms % 60_000) / 1000);
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const getEventDetails = (event: MapEvent) => ({
    displayName: event.eventType,
    icon: event.icon,
    color: EVENT_COLORS[event.eventType] ?? null,
  });

  const isGeneratedSource = upstreamOk === true && scheduledEvents.length > 0;
  const mapsToShow =
    selectedMap === 'all' ? MAPS.map((m) => m.key) : [selectedMap];

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto px-4 mt-8">
      {/* HEADER */}
      <div className="raider-box p-8 bg-[#1a1120] border-b-4 border-b-[#f1aa1c]/20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_bottom,transparent_50%,#000_50%)] bg-[size:100%_4px]" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-[#1a1120] border border-[#f1aa1c]/30">
              <Timer className="w-10 h-10 text-[#f1aa1c] animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase text-white tracking-widest">
                Live Event Timers
              </h1>
              <p className="text-[10px] text-[#f1aa1c] font-data tracking-[0.4em] uppercase mt-2">
                Real-time Event Schedule // UTC Timezone
              </p>
            </div>
          </div>
          <div className="bg-black/50 border border-[#2d1f38] p-4 text-right space-y-1">
            {/* Generated schedule status badge */}
            <div className="flex items-center justify-end gap-2 mb-1">
              {isGeneratedSource ? (
                <>
                  <Wifi className="w-3 h-3 text-[#12FF70]" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#12FF70]">
                    Generated Schedule
                  </span>
                  <div className="w-2 h-2 rounded-full bg-[#12FF70] animate-ping" />
                </>
              ) : loading ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-[#f1aa1c] animate-ping" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#f1aa1c]">
                    Connecting...
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-[#8a7a9a]" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#8a7a9a]">
                    Schedule Unavailable
                  </span>
                </>
              )}
            </div>
            <p className="text-[8px] text-[#8a7a9a] font-data uppercase">
              Current UTC: {currentUTCHour.toString().padStart(2, '0')}:00
            </p>
            {fetchedAt && (
              <p className="text-[8px] text-[#8a7a9a] font-data uppercase">
                Updated:{' '}
                {new Date(fetchedAt).toUTCString().replace(/ GMT$/, ' UTC')}
              </p>
            )}
            <button
              onClick={refresh}
              className="text-[8px] font-black uppercase tracking-widest text-[#f1aa1c]/60 hover:text-[#f1aa1c] transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* FALLBACK WARNING */}
      {!loading && !isGeneratedSource && (
        <div className="flex items-center gap-3 p-4 border border-[#f1aa1c]/30 bg-[#f1aa1c]/5 text-[#f1aa1c]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-[10px] font-black uppercase tracking-widest">
            Generated event schedule unavailable{error ? ` — ${error}` : ''}
          </p>
        </div>
      )}

      {/* MAP FILTER */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedMap('all')}
          className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
            selectedMap === 'all'
              ? 'border-[#f1aa1c] text-[#f1aa1c] bg-[#f1aa1c]/5'
              : 'border-[#2d1f38] text-[#8a7a9a] hover:text-white hover:border-[#f1aa1c]/50'
          }`}
        >
          All Maps
        </button>
        {MAPS.map(({ key, displayName }) => (
          <button
            key={key}
            onClick={() => setSelectedMap(key)}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
              selectedMap === key
                ? 'border-[#f1aa1c] text-[#f1aa1c] bg-[#f1aa1c]/5'
                : 'border-[#2d1f38] text-[#8a7a9a] hover:text-white hover:border-[#f1aa1c]/50'
            }`}
          >
            {displayName}
          </button>
        ))}
      </div>

      {/* ACTIVE EVENTS */}
      {activeEvents.length > 0 && (
        <div>
          <h3 className="text-[11px] font-black text-[#e83a3a] uppercase tracking-[0.3em] flex items-center gap-3 mb-4">
            <Activity className="w-4 h-4" /> ACTIVE EVENTS NOW
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeEvents.map(({ mapKey, event, mapName }) => {
              const details = getEventDetails(event);
              return (
                <div
                  key={`${mapKey}-${event.id}`}
                  className="raider-box p-6 bg-[#130918] border-l-4 border-l-[#e83a3a] relative overflow-hidden"
                >
                  <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-[#e83a3a]/20 to-transparent" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      {details.icon && (
                        <img
                          src={details.icon}
                          alt={details.displayName}
                          className="w-8 h-8 object-contain"
                        />
                      )}
                      <div>
                        <span className="text-[9px] font-black text-[#e83a3a] border border-[#e83a3a]/30 px-2 py-0.5 bg-[#e83a3a]/5 uppercase">
                          {event.category}
                        </span>
                      </div>
                    </div>
                    <h4 className="text-lg font-black text-white uppercase mb-2">
                      {details.displayName}
                    </h4>
                    <div className="flex items-center gap-2 text-[9px] text-[#8a7a9a]">
                      <MapPin className="w-3 h-3" />
                      <span className="font-black uppercase">{mapName}</span>
                    </div>
                    {event.endsAtMs && (
                      <p className="text-[8px] text-[#e83a3a] font-data uppercase mt-2">
                        Ends in {formatTimeUntil(event.endsAtMs - now)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* UPCOMING EVENTS */}
      <div>
        <h3 className="text-[11px] font-black text-[#f1aa1c] uppercase tracking-[0.3em] flex items-center gap-3 mb-4">
          <Clock className="w-4 h-4" /> UPCOMING EVENTS
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {mapsToShow.map((mapKey) => {
            const mapMeta = MAPS.find((m) => m.key === mapKey);
            const mapName = mapMeta?.displayName ?? mapKey;
            const events = (mapEvents[mapKey] || []).filter(
              (e) => e.timeUntil > 0,
            );

            if (events.length === 0) return null;

            return (
              <div
                key={mapKey}
                className="raider-box bg-[#1a1120] border border-[#2d1f38] overflow-hidden"
              >
                <div className="h-32 relative">
                  <img
                    src={getMapImageUrl(mapName)}
                    alt={mapName}
                    className="w-full h-full object-cover opacity-40"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <h4 className="text-2xl font-black text-white uppercase tracking-tighter">
                      {mapName}
                    </h4>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {events.map((event, idx) => {
                    const details = getEventDetails(event);
                    const isNext = idx === 0;
                    return (
                      <div
                        key={event.id}
                        className={`flex items-center justify-between p-3 border transition-all ${
                          isNext
                            ? 'border-[#f1aa1c]/50 bg-[#f1aa1c]/5'
                            : 'border-[#1a1120] bg-[#050505]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {details.icon && (
                            <img
                              src={details.icon}
                              alt={details.displayName}
                              className="w-6 h-6 object-contain"
                            />
                          )}
                          <div>
                            <p className="text-[10px] font-black text-white uppercase">
                              {details.displayName}
                            </p>
                            <p className="text-[8px] text-[#8a7a9a] font-data uppercase">
                              {event.category}
                              {` · ${event.hour.toString().padStart(2, '0')}:00 UTC`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-[10px] font-black uppercase ${isNext ? 'text-[#f1aa1c]' : 'text-[#8a7a9a]'}`}
                          >
                            {formatTimeUntil(event.timeUntil)}
                          </p>
                          {isNext && (
                            <p className="text-[8px] text-[#f1aa1c] font-data uppercase">
                              NEXT
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
