/**
 * metaforge.ts — MetaForge.app ARC Raiders Public API Client
 *
 * Base URL: https://metaforge.app/api/arc-raiders
 * No authentication required. All endpoints are public.
 *
 * MetaForge asks you to cache locally and avoid hammering the API.
 * This module uses a 5-minute in-memory cache on all GET calls.
 *
 * All types come from client/src/types/../types/arcApi.ts
 */

import type {
  MfItem,
  MfArc,
  MfQuest,
  MfEventTimer,
  MfWeeklyTrials,
  MfPagedResponse,
} from '../types/arcApi';

export const MF_BASE_URL = 'https://metaforge.app/api/arc-raiders';
const MF_META_URL = 'https://metaforge.app/api/arc-raiders';

// ─── Re-export the MfItem type for backward compat ────────────────────────────
export type { MfItem };

// ─── 5-second in-memory cache (reduced for live updates) ─────
const CACHE_TTL = 5 * 1000; // 5 seconds
const _cache = new Map<string, { data: unknown; ts: number }>();

function cacheGet<T>(key: string): T | null {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    _cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function cacheSet(key: string, data: unknown): void {
  _cache.set(key, { data, ts: Date.now() });
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

async function mfFetch<T>(url: string): Promise<T> {
  const cached = cacheGet<T>(url);
  if (cached !== null) {
    return cached;
  }

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    console.error(`[MetaForge] ✗ ${res.status} ${url}`);
    throw new Error(`[MetaForge] HTTP ${res.status} — ${url}`);
  }

  const json = await res.json();
  // MetaForge wraps responses differently per endpoint:
  //   paged: { data: [...], pagination: {...} }
  //   traders: { success: true, data: {...} }
  //   flat: [...] or { data: [...] }
  const result = json as T;
  cacheSet(url, result);
  return result;
}

// ─── Items ────────────────────────────────────────────────────────────────────

/**
 * Fetch a page of items from MetaForge.
 * Supports all arc_api_rs Item fields including full stat_block.
 *
 * @param page           page number (default 1)
 * @param limit          items per page, max 100 (default 50)
 * @param id             fetch a single item by ID
 * @param item_type      filter by type (e.g. "Weapon", "Armor")
 * @param rarity         filter by rarity (e.g. "Common", "Rare", "Epic")
 * @param search         search by name (max 100 chars)
 * @param loadout_slot   filter by loadout slot
 * @param workbench      filter by workbench
 * @param subcategory    filter by subcategory
 * @param shield_type    filter by shield type
 * @param includeComponents include crafting component relationships
 * @param minimal        return minimal item data only
 * @param sortBy         sort field (default "name")
 * @param sortOrder      "asc" | "desc"
 */
export function getItems(params?: {
  page?: number;
  limit?: number;
  id?: string;
  item_type?: string;
  rarity?: string;
  search?: string;
  loadout_slot?: string;
  workbench?: string;
  subcategory?: string;
  shield_type?: string;
  includeComponents?: boolean;
  minimal?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<MfPagedResponse<MfItem>> {
  const url = new URL(`${MF_BASE_URL}/items`);
  if (params?.page) url.searchParams.set('page', String(params.page));
  if (params?.limit) url.searchParams.set('limit', String(params.limit));
  if (params?.id) url.searchParams.set('id', params.id);
  if (params?.item_type) url.searchParams.set('item_type', params.item_type);
  if (params?.rarity) url.searchParams.set('rarity', params.rarity);
  if (params?.search)
    url.searchParams.set('search', params.search.slice(0, 100));
  if (params?.loadout_slot)
    url.searchParams.set('loadout_slot', params.loadout_slot);
  if (params?.workbench) url.searchParams.set('workbench', params.workbench);
  if (params?.subcategory)
    url.searchParams.set('subcategory', params.subcategory);
  if (params?.shield_type)
    url.searchParams.set('shield_type', params.shield_type);
  if (params?.includeComponents)
    url.searchParams.set('includeComponents', 'true');
  if (params?.minimal) url.searchParams.set('minimal', 'true');
  if (params?.sortBy) url.searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) url.searchParams.set('sortOrder', params.sortOrder);
  return mfFetch<MfPagedResponse<MfItem>>(url.toString());
}

/**
 * Fetch a single item by ID.
 */
export function getItem(id: string): Promise<MfPagedResponse<MfItem>> {
  return getItems({ id });
}

/**
 * Fetch ALL items across all pages.
 * Use with care — MetaForge throttles large requests.
 * Results are cached after the first full fetch.
 */
export async function getAllItems(): Promise<MfItem[]> {
  const cacheKey = `${MF_BASE_URL}/items?all=true`;
  const cached = cacheGet<MfItem[]>(cacheKey);
  if (cached) return cached;

  const first = await getItems({ page: 1, limit: 100 });
  const total = first.pagination?.totalPages ?? 1;
  const items: MfItem[] = [...(first.data ?? [])];

  const pages = Array.from({ length: total - 1 }, (_, i) => i + 2);
  const results = await Promise.allSettled(
    pages.map((p) => getItems({ page: p, limit: 100 })),
  );
  for (const r of results) {
    if (r.status === 'fulfilled') items.push(...(r.value.data ?? []));
  }

  cacheSet(cacheKey, items);
  return items;
}

// ─── ARCs (enemies / machines) ────────────────────────────────────────────────

/**
 * Retrieve ARC enemies/machines.
 *
 * @param includeLoot include loot items dropped by each arc
 * @param id          fetch a specific arc by ID
 * @param search      search by name
 * @param page        page number
 * @param limit       per page (max 100)
 * @param sortBy      sort field
 * @param sortOrder   "asc" | "desc"
 */
export function getArcs(params?: {
  includeLoot?: boolean;
  id?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<MfPagedResponse<MfArc>> {
  const url = new URL(`${MF_BASE_URL}/arcs`);
  if (params?.id) url.searchParams.set('id', params.id);
  if (params?.search)
    url.searchParams.set('search', params.search.slice(0, 100));
  if (params?.includeLoot) url.searchParams.set('includeLoot', 'true');
  if (params?.page) url.searchParams.set('page', String(params.page));
  if (params?.limit) url.searchParams.set('limit', String(params.limit ?? 100));
  if (params?.sortBy) url.searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) url.searchParams.set('sortOrder', params.sortOrder);
  return mfFetch<MfPagedResponse<MfArc>>(url.toString());
}

// ─── Quests ───────────────────────────────────────────────────────────────────

/**
 * Retrieve quests with required items and rewards.
 *
 * @param id       specific quest ID
 * @param search   search by name
 * @param page     page number
 * @param limit    per page (max 100, default 40)
 * @param sortBy   sort field
 * @param sortOrder "asc" | "desc"
 */
export function getQuests(params?: {
  id?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<MfPagedResponse<MfQuest>> {
  const url = new URL(`${MF_BASE_URL}/quests`);
  if (params?.id) url.searchParams.set('id', params.id);
  if (params?.search)
    url.searchParams.set('search', params.search.slice(0, 100));
  if (params?.page) url.searchParams.set('page', String(params.page));
  if (params?.limit) url.searchParams.set('limit', String(params.limit ?? 40));
  if (params?.sortBy) url.searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) url.searchParams.set('sortOrder', params.sortOrder);
  return mfFetch<MfPagedResponse<MfQuest>>(url.toString());
}

// ─── Map Data ─────────────────────────────────────────────────────────────────

/**
 * Retrieve map data.
 *
 * tableID is always "arc_map_data".
 * mapID: "dam" | "spaceport" | "buried-city" | "blue-gate"
 */
export function getMapData(mapID: string): Promise<{ data: unknown[] }> {
  const url = new URL(`${MF_META_URL}/game-map-data`);
  url.searchParams.set('tableID', 'arc_map_data');
  url.searchParams.set('mapID', mapID);
  return mfFetch<{ data: unknown[] }>(url.toString());
}

// ─── Events Schedule ─────────────────────────────────────────────────────────

/**
 * Retrieve the current events schedule (replaces deprecated /event-timers).
 * Returns an array of event timer objects.
 */
export function getEventsSchedule(): Promise<{ data: MfEventTimer[] }> {
  return mfFetch<{ data: MfEventTimer[] }>('/api/arc-raiders/events-schedule');
}

// ─── Traders ─────────────────────────────────────────────────────────────────

/**
 * Get all trader inventories.
 * Returns: { success: true, data: { traderName: MfItem[], ... } }
 */
export function getTraders(): Promise<{
  success: boolean;
  data: Record<string, MfItem[]>;
}> {
  return mfFetch<{ success: boolean; data: Record<string, MfItem[]> }>(
    '/api/arc-raiders/traders',
  );
}

// ─── Weekly Trials ────────────────────────────────────────────────────────────

/**
 * Get the MetaForge weekly trials leaderboard.
 */
export function getWeeklyTrials(id?: string): Promise<MfWeeklyTrials> {
  const url = new URL('/api/arc-raiders/weekly-trials', window.location.origin);
  if (id) url.searchParams.set('id', id);
  return mfFetch<MfWeeklyTrials>(url.toString());
}

// ─── Raider Stats (MetaForge user stats by MetaForge ID) ─────────────────────

/**
 * Fetch exhaustive player stats from MetaForge using the raider's MetaForge ID.
 * Returns the full raider profile including combat metrics, map stats, weapon data.
 * Falls back to /stats/<id> if the /raider/<id> endpoint fails.
 */
export async function getRaiderStats(
  metaforgeId: string,
): Promise<Record<string, unknown> | null> {
  const cleanId = metaforgeId.trim().replace(/\s/g, '');
  try {
    const primary = await mfFetch<Record<string, unknown>>(
      `${MF_BASE_URL}/raider/${cleanId}`,
    );
    if (primary && !('error' in primary)) return primary;
  } catch {
    // fall through to legacy
  }

  try {
    const legacy = await mfFetch<Record<string, unknown>>(
      `${MF_BASE_URL}/stats/${cleanId}`,
    );
    return legacy ?? null;
  } catch {
    return null;
  }
}

// ─── Cache management ─────────────────────────────────────────────────────────

/** Clear the entire MetaForge response cache. */
export function clearMetaForgeCache(): void {
  _cache.clear();
}

/** Clear a single cached URL. */
export function invalidateMetaForgeCache(url: string): void {
  _cache.delete(url);
}
