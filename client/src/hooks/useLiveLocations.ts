/**
 * useLiveLocations.ts — Fetches live location/marker data for interactive maps.
 *
 * Data source priority:
 *   1. MetaForge API via server proxy (/api/catalog/mf/map-data/:mapId)
 *   2. Fallback: arcraidersmaps.app direct API
 *
 * Returns locations array, per-type counts, and loading state.
 */

import { useState, useEffect, useMemo } from 'react';

/* ── API map ID mapping ──────────────────────────────────────────────────── */

const API_MAP_IDS: Record<string, string> = {
  'dam-battlegrounds': 'dam',
  'burial-city': 'buried-city',
  spaceport: 'spaceport',
  'blue-gate': 'blue-gate',
  blue_gate: 'the_blue_gate',
  'stella-montis': 'stella-montis',
  'riven-tides': 'riven-tides',
};

/* ── Types ───────────────────────────────────────────────────────────────── */

export type ApiLocation = {
  id: string;
  locationType: string;
  coordinate: [number, number];
  description?: string;
  name?: string;
  layer: string;
  image?: string;
  properties?: Record<string, unknown>;
  indicators?: Record<string, unknown>;
  createdBy?: string;
};

export type LiveLocationData = {
  locations: ApiLocation[];
  counts: Record<string, number>;
  loading: boolean;
  error: string | null;
};

/* ── Normalize MetaForge response into ApiLocation[] ─────────────────────── */

function normalizeMetaForgeData(raw: unknown): ApiLocation[] {
  // MetaForge game-map-data returns allData as an array of location objects
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .filter((item: any) => item && item.coordinate && item.locationType)
    .map((item: any, i: number) => ({
      id: item.id || item._id || `mf-${i}`,
      locationType: item.locationType || item.type || '',
      coordinate: Array.isArray(item.coordinate)
        ? ([item.coordinate[0], item.coordinate[1]] as [number, number])
        : ([0, 0] as [number, number]),
      description: item.description,
      name: item.name,
      layer: item.layer || 'surface',
      image: item.image,
      properties: item.properties,
      indicators: item.indicators,
      createdBy: item.createdBy,
    }));
}

/* ── Hook ────────────────────────────────────────────────────────────────── */

const cache: Record<string, ApiLocation[]> = {};

export function useLiveLocations(mapId: string): LiveLocationData {
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiMapId = API_MAP_IDS[mapId];
    if (!apiMapId) {
      setLocations([]);
      setLoading(false);
      setError(`No API mapping for map: ${mapId}`);
      return;
    }

    if (cache[apiMapId]) {
      setLocations(cache[apiMapId]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    // Primary: MetaForge via server proxy
    fetch(`/api/catalog/mf/map-data/${apiMapId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`MetaForge ${res.status}`);
        return res.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        const normalized = normalizeMetaForgeData(data);
        if (normalized.length > 0) {
          cache[apiMapId] = normalized;
          setLocations(normalized);
          setLoading(false);
        } else {
          // MetaForge returned empty — try fallback
          throw new Error('MetaForge returned no locations');
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback: arcraidersmaps.app direct
        fetch(`https://api.arcraidersmaps.app/locations?mapId=${apiMapId}`)
          .then((res) => {
            if (!res.ok) throw new Error(`Fallback API ${res.status}`);
            return res.json();
          })
          .then((data: ApiLocation[]) => {
            if (cancelled) return;
            cache[apiMapId] = data;
            setLocations(data);
            setLoading(false);
          })
          .catch((err) => {
            if (cancelled) return;
            console.error('[useLiveLocations] all sources failed:', err);
            setError(err.message);
            setLoading(false);
          });
      });

    return () => {
      cancelled = true;
    };
  }, [mapId]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const loc of locations) {
      c[loc.locationType] = (c[loc.locationType] || 0) + 1;
    }
    return c;
  }, [locations]);

  return { locations, counts, loading, error };
}
