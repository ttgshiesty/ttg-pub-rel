export type MapProgressSlice = {
  p?: Record<string, boolean>;
};

export type MapProgressSave = {
  version: 1;
  maps: Record<string, MapProgressSlice>;
};

const MAP_PROGRESS_KEY = 'shiesty.map-progress.v1';

export function emptyMapProgressSave(): MapProgressSave {
  return { version: 1, maps: {} };
}

function compactSlice(slice: MapProgressSlice): MapProgressSlice {
  const pins: Record<string, boolean> = {};
  for (const [id, visited] of Object.entries(slice.p ?? {})) {
    if (visited) pins[id] = true;
  }
  return Object.keys(pins).length > 0 ? { p: pins } : {};
}

export function loadMapProgress(): MapProgressSave {
  if (typeof window === 'undefined') return emptyMapProgressSave();

  try {
    const raw = window.localStorage.getItem(MAP_PROGRESS_KEY);
    if (!raw) return emptyMapProgressSave();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || typeof parsed.maps !== 'object') {
      return emptyMapProgressSave();
    }
    return parsed as MapProgressSave;
  } catch {
    return emptyMapProgressSave();
  }
}

export function saveMapProgress(save: MapProgressSave): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MAP_PROGRESS_KEY, JSON.stringify(save));
}

export function isMapPinVisited(
  save: MapProgressSave,
  mapId: string,
  pinId: string,
): boolean {
  return Boolean(save.maps[mapId]?.p?.[pinId]);
}

export function toggleMapPinVisited(
  save: MapProgressSave,
  mapId: string,
  pinId: string,
  visited: boolean,
): MapProgressSave {
  const previous = save.maps[mapId] ?? {};
  const pins = { ...(previous.p ?? {}) };
  if (visited) pins[pinId] = true;
  else delete pins[pinId];

  const maps = { ...save.maps };
  const nextSlice = compactSlice({ ...previous, p: pins });
  if (Object.keys(nextSlice).length > 0) maps[mapId] = nextSlice;
  else delete maps[mapId];

  return { version: 1, maps };
}

export function countVisitedMapPins(
  save: MapProgressSave,
  mapId: string,
): number {
  return Object.values(save.maps[mapId]?.p ?? {}).filter(Boolean).length;
}

export function mergeMapProgress(
  local: MapProgressSave,
  remote: MapProgressSave,
): MapProgressSave {
  const next: MapProgressSave = { version: 1, maps: { ...local.maps } };
  for (const [mapId, slice] of Object.entries(remote.maps ?? {})) {
    next.maps[mapId] = {
      p: {
        ...(next.maps[mapId]?.p ?? {}),
        ...(slice.p ?? {}),
      },
    };
  }
  return next;
}

export async function fetchRemoteMapProgress(): Promise<MapProgressSave | null> {
  const response = await fetch('/api/map-progress', {
    credentials: 'include',
  });
  if (response.status === 401) return null;
  if (!response.ok)
    throw new Error(`Map progress fetch failed: ${response.status}`);
  return (await response.json()) as MapProgressSave;
}

export async function pushRemoteMapProgress(
  save: MapProgressSave,
  mode: 'merge' | 'replace' = 'merge',
): Promise<MapProgressSave | null> {
  const response = await fetch(`/api/map-progress?mode=${mode}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(save),
  });
  if (response.status === 401) return null;
  if (!response.ok)
    throw new Error(`Map progress save failed: ${response.status}`);
  return (await response.json()) as MapProgressSave;
}
