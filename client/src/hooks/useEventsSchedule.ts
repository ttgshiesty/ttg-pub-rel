/**
 * useEventsSchedule.ts
 *
 * Client-side hook that fetches generated ARC Raiders event occurrences from
 * our /api/events endpoint. The backend serves root events.json, which is
 * generated from root map-events.json by the update-data workflow.
 *
 * Poll interval ~90s — aligns with 60s API revalidate without hammering origin.
 */

import { useState, useEffect, useCallback } from 'react';

const POLL_INTERVAL_MS = 90 * 1000;

export type GeneratedEvent = {
  eventTypeId: string;
  eventName: string;
  category: 'major' | 'minor' | string;
  mapId: string;
  mapName: string;
  mapIcon?: string | null;
  icon?: string | null;
  startTime: number | string;
  endTime: number | string;
};

export type GeneratedEventsPayload = {
  generatedAt: string | null;
  startTimeUtc?: string;
  endTimeUtc?: string;
  durationMinutes?: number;
  eventCount: number;
  events: GeneratedEvent[];
};

type State = {
  events: GeneratedEvent[];
  payload: GeneratedEventsPayload | null;
  loading: boolean;
  error: string | null;
  /** ISO time from X-Events-Fetched-At, falling back to payload.generatedAt. */
  fetchedAt: string | null;
  /** X-Events-Upstream-Ok when present; successful legacy responses are treated as live. */
  upstreamOk: boolean | null;
};

export function useEventsSchedule(): State & { refresh: () => void } {
  const [state, setState] = useState<State>({
    events: [],
    payload: null,
    loading: true,
    error: null,
    fetchedAt: null,
    upstreamOk: null,
  });

  const fetchEvents = useCallback(async () => {
    setState((s) => ({
      ...s,
      loading: s.events.length === 0,
      error: null,
    }));
    try {
      const res = await fetch('/api/events', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: GeneratedEventsPayload | GeneratedEvent[] = await res.json();
      const payload: GeneratedEventsPayload = Array.isArray(data)
        ? {
            generatedAt: null,
            eventCount: data.length,
            events: data,
          }
        : {
            ...data,
            eventCount: Number(data.eventCount ?? data.events?.length ?? 0),
            events: Array.isArray(data.events) ? data.events : [],
          };
      const fetchedAt =
        res.headers.get('X-Events-Fetched-At') ?? payload.generatedAt ?? null;
      const upstreamHeader = res.headers.get('X-Events-Upstream-Ok');
      const upstreamOk =
        upstreamHeader === null ? true : upstreamHeader === '1';
      setState({
        events: payload.events,
        payload,
        loading: false,
        error: null,
        fetchedAt,
        upstreamOk,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.warn('[useEventsSchedule] Fetch failed:', msg);
      setState({
        events: [],
        payload: null,
        loading: false,
        error: msg,
        fetchedAt: null,
        upstreamOk: false,
      });
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const id = setInterval(fetchEvents, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchEvents]);

  return { ...state, refresh: fetchEvents };
}
