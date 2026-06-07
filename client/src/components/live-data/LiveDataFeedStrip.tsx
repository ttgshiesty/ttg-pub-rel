import { useEffect, useMemo, useState } from 'react';

import type { GeneratedEvent } from '../../hooks/useEventsSchedule';
import { EVENT_COLORS, EVENT_ICONS } from '../../lib/events/eventsConfig';
import {
  bannerKeyForChip,
  deriveLiveDataChipKind,
} from '../../lib/live-data/feedState';
import {
  formatLocalTimestampFull,
  formatRelativeUpdated,
} from '../../lib/live-data/formatTimestamp';

import { LiveDataFeedBanner } from './LiveDataFeedBanner';
import { LiveDataStatusChip } from './LiveDataStatusChip';

const TICK_MS = 8_000;
const LOOKAHEAD_MS = 6 * 60 * 60 * 1000;
const MAX_VISIBLE_EVENTS = 3;

type FeedEvent = {
  id: string;
  eventName: string;
  mapName: string;
  category: string;
  icon: string | null;
  startsAtMs: number;
  endsAtMs: number;
  isLive: boolean;
};

type Props = {
  events?: GeneratedEvent[];
  fetchedAt: string | null;
  upstreamOk: boolean | null;
  polledEventCount: number;
  loading: boolean;
  className?: string;
  /** When set, chip/stale logic follows parent clock; no internal timer. */
  now?: Date;
};

function parseEventTimestamp(value: number | string): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const trimmed = value.trim();
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && /^\d+$/.test(trimmed)) {
    return numeric < 1e10 ? numeric * 1000 : numeric;
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function formatEventClock(event: FeedEvent, nowMs: number) {
  const targetMs = event.isLive ? event.endsAtMs - nowMs : event.startsAtMs - nowMs;
  const safeMs = Math.max(0, targetMs);
  const hours = Math.floor(safeMs / 3_600_000);
  const minutes = Math.floor((safeMs % 3_600_000) / 60_000);

  if (event.isLive) {
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${Math.max(1, minutes)}m left`;
  }

  if (hours > 0) return `in ${hours}h ${minutes}m`;
  if (minutes > 0) return `in ${minutes}m`;
  return 'soon';
}

function getFeedEvents(events: GeneratedEvent[] | undefined, now: Date) {
  const nowMs = now.getTime();
  const rows: FeedEvent[] = [];

  for (const event of events ?? []) {
    const startsAtMs = parseEventTimestamp(event.startTime);
    const endsAtMs = parseEventTimestamp(event.endTime);
    if (startsAtMs === null || endsAtMs === null) continue;
    if (endsAtMs <= nowMs || startsAtMs > nowMs + LOOKAHEAD_MS) continue;

    rows.push({
      id: `${event.mapId}-${event.eventTypeId}-${startsAtMs}`,
      eventName: event.eventName,
      mapName: event.mapName,
      category: event.category,
      icon: event.icon ?? EVENT_ICONS[event.eventName] ?? event.mapIcon ?? null,
      startsAtMs,
      endsAtMs,
      isLive: startsAtMs <= nowMs && endsAtMs > nowMs,
    });
  }

  return rows
    .sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      return a.startsAtMs - b.startsAtMs || a.eventName.localeCompare(b.eventName);
    })
    .slice(0, MAX_VISIBLE_EVENTS);
}

/**
 * Shared live-data header: status chip + relative updated time (title = full local) + contextual banner.
 */
export function LiveDataFeedStrip({
  events,
  fetchedAt,
  upstreamOk,
  polledEventCount,
  loading,
  className = '',
  now: nowProp,
}: Props) {
  const [tick, setTick] = useState(() => new Date());

  useEffect(() => {
    if (nowProp) return;
    const id = setInterval(() => setTick(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, [nowProp]);

  const now = nowProp ?? tick;

  const kind = deriveLiveDataChipKind({
    upstreamOk,
    fetchedAt,
    now,
    polledEventCount,
    loading,
  });
  const bannerKey = bannerKeyForChip(kind);
  const relative = formatRelativeUpdated(fetchedAt, now);
  const fullTs = fetchedAt ? formatLocalTimestampFull(fetchedAt) : null;
  const feedEvents = useMemo(() => getFeedEvents(events, now), [events, now]);

  return (
    <div className={`flex flex-col gap-1.5 min-w-0 ${className}`}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 shrink-0">
          <LiveDataStatusChip kind={kind} />
          <span
            className="tabular-nums text-[10px] sm:text-[11px] text-white/60 whitespace-nowrap shrink-0 min-w-[10ch] inline-block text-left sm:text-right"
            title={fullTs ? `Schedule - ${fullTs}` : undefined}
          >
            {relative}
          </span>
        </div>

        {feedEvents.length > 0 && (
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {feedEvents.map((event) => {
              const color = EVENT_COLORS[event.eventName];
              const clock = formatEventClock(event, now.getTime());
              return (
                <div
                  key={event.id}
                  className="flex min-w-0 max-w-[260px] items-center gap-1.5 border-l px-2 py-0.5 text-left first:max-w-[320px]"
                  style={{
                    borderColor: color?.border ?? 'rgba(255,255,255,0.2)',
                  }}
                  title={`${event.eventName} - ${event.mapName} - ${clock}`}
                >
                  {event.icon && (
                    <img
                      src={event.icon}
                      alt=""
                      className="h-4 w-4 shrink-0 object-contain opacity-90"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="shrink-0 text-[8px] font-black uppercase tracking-wider"
                        style={{ color: event.isLive ? '#39FF14' : '#f1aa1c' }}
                      >
                        {event.isLive ? 'Live' : 'Next'}
                      </span>
                      <span
                        className="truncate text-[9px] sm:text-[10px] font-black uppercase"
                        style={{ color: color?.text ?? 'rgba(255,255,255,0.86)' }}
                      >
                        {event.eventName}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5 text-[8px] font-black uppercase tracking-wide text-white/50">
                      <span className="truncate">{event.mapName}</span>
                      <span className="shrink-0 text-white/30">/</span>
                      <span className="shrink-0 tabular-nums">{clock}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <LiveDataFeedBanner bannerKey={bannerKey} />
    </div>
  );
}
