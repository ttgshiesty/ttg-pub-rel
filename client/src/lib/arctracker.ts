/**
 * arctracker.ts — ArcTracker.io v2 Dual-Key API Client
 *
 * Auth: All user endpoints require both:
 *   X-App-Key: arc_k1_<your_app_key>       (from VITE_ARCTRACKER_APP_KEY)
 *   Authorization: Bearer arc_u1_<user_key> (user's personal key, stored on backend)
 *
 * Architecture: All authenticated calls are routed through the shiesty.me backend
 * proxy (BASE_URL/api/arctracker/...) so the app key is never exposed client-side.
 * The backend attaches the X-App-Key header server-side.
 *
 * Public catalog endpoints (items, quests, hideout, projects) hit ArcTracker
 * directly via the backend proxy's /api/catalog/... routes.
 *
 * Returns typed from client/src/types/../types/arcApi.ts
 */

import type {
  ArcTrackerProfile,
  ArcTrackerStash,
  ArcTrackerLoadout,
  ArcTrackerQuests,
  ArcTrackerHideout,
  ArcTrackerProjects,
  ArcTrackerRounds,
  ArcTrackerBlueprints,
} from '../types/arcApi';

const BASE_URL = import.meta.env.VITE_API_URL || '';

// ─── Rate limit state (header-driven) ────────────────────────────────────────
let _rateLimitRemaining: number | null = null;
let _rateLimitReset: number | null = null;

export function getArcTrackerRateLimit() {
  return { remaining: _rateLimitRemaining, resetAt: _rateLimitReset };
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

async function atFetch<T>(
  path: string,
  params?: Record<string, string | number>,
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
  }

  console.log(`[ArcTracker] → ${path}`, params ?? '');

  const res = await fetch(url.toString(), {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  // Capture rate limit headers
  const remaining = res.headers.get('X-RateLimit-Remaining');
  const reset = res.headers.get('X-RateLimit-Reset');
  if (remaining !== null) _rateLimitRemaining = Number(remaining);
  if (reset !== null) _rateLimitReset = Number(reset);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const code = body?.error?.code || body?.error || '';
    const msg = body?.error?.message || body?.message || `HTTP ${res.status}`;
    console.error(`[ArcTracker] ✗ ${res.status} ${path}`, { code, msg, body });
    const err = new Error(`[ArcTracker] ${code ? `${code}: ` : ''}${msg}`);
    (err as any).status = res.status;
    (err as any).code = code;
    throw err;
  }

  const json = await res.json();
  // ArcTracker wraps responses: { data: {...}, meta: {...} }
  const result = (json?.data ?? json) as T;
  console.log(`[ArcTracker] ✓ ${path}`, result);
  return result;
}

// ─── Authenticated User Endpoints ─────────────────────────────────────────────
// All routed through /api/arctracker/... backend proxy which attaches X-App-Key

/**
 * GET /api/v2/user/profile — scope: profile:read
 * Returns: username, playerLevel, memberSince
 */
export function getArcTrackerProfile(): Promise<ArcTrackerProfile> {
  return atFetch<ArcTrackerProfile>('/api/arctracker/user/profile');
}

/**
 * GET /api/v2/user/stash — scope: stash:read
 * Supports: locale, page, per_page (max 500), sort (slot|name|quantity)
 */
export function getArcTrackerStash(params?: {
  locale?: string;
  page?: number;
  per_page?: number;
  sort?: 'slot' | 'name' | 'quantity';
}): Promise<ArcTrackerStash> {
  return atFetch<ArcTrackerStash>('/api/arctracker/user/stash', {
    locale: params?.locale ?? 'en',
    page: params?.page ?? 1,
    per_page: params?.per_page ?? 500,
    ...(params?.sort ? { sort: params.sort } : {}),
  });
}

/**
 * GET /api/v2/user/loadout — scope: loadout:read
 * Returns current equipped loadout with enriched item details.
 */
export function getArcTrackerLoadout(
  locale = 'en',
): Promise<ArcTrackerLoadout> {
  return atFetch<ArcTrackerLoadout>('/api/arctracker/user/loadout', { locale });
}

/**
 * GET /api/v2/user/quests — scope: quests:read
 * filter: "completed" | "incomplete"
 */
export function getArcTrackerQuests(params?: {
  locale?: string;
  filter?: 'completed' | 'incomplete';
}): Promise<ArcTrackerQuests> {
  return atFetch<ArcTrackerQuests>('/api/arctracker/user/quests', {
    locale: params?.locale ?? 'en',
    ...(params?.filter ? { filter: params.filter } : {}),
  });
}

/**
 * GET /api/v2/user/hideout — scope: hideout:read
 */
export function getArcTrackerHideout(
  locale = 'en',
): Promise<ArcTrackerHideout> {
  return atFetch<ArcTrackerHideout>('/api/arctracker/user/hideout', { locale });
}

/**
 * GET /api/v2/user/projects — scope: projects:read
 * season: 1 | 2
 */
export function getArcTrackerProjects(params?: {
  locale?: string;
  season?: number;
}): Promise<ArcTrackerProjects> {
  return atFetch<ArcTrackerProjects>('/api/arctracker/user/projects', {
    locale: params?.locale ?? 'en',
    ...(params?.season !== undefined ? { season: params.season } : {}),
  });
}

/**
 * GET /api/v2/user/rounds — scope: rounds:read
 *
 * Supports all ArcTracker round filters:
 *   limit (max 200), offset, outcome, map, season, date_from, date_to, sort
 *
 * map slugs: dam-battleground | the-spaceport | blue-gate | stella-montis | buried-city | riven-tides
 * outcome:   extracted | died | unknown
 * sort:      newest | oldest | value_desc | value_asc
 */
export function getArcTrackerRounds(params?: {
  locale?: string;
  limit?: number;
  offset?: number;
  outcome?: 'extracted' | 'died' | 'unknown';
  map?:
    | 'dam-battleground'
    | 'the-spaceport'
    | 'blue-gate'
    | 'stella-montis'
    | 'buried-city'
    | 'riven-tides'
    | string;
  season?: number;
  date_from?: string;
  date_to?: string;
  sort?: 'newest' | 'oldest' | 'value_desc' | 'value_asc';
}): Promise<ArcTrackerRounds> {
  const p: Record<string, string | number> = {
    locale: params?.locale ?? 'en',
    limit: params?.limit ?? 200,
    offset: params?.offset ?? 0,
  };
  if (params?.outcome) p.outcome = params.outcome;
  if (params?.map) p.map = params.map;
  if (params?.season !== undefined) p.season = params.season;
  if (params?.date_from) p.date_from = params.date_from;
  if (params?.date_to) p.date_to = params.date_to;
  if (params?.sort) p.sort = params.sort;
  return atFetch<ArcTrackerRounds>('/api/arctracker/user/rounds', p);
}

/**
 * GET /api/v2/user/blueprints — scope: blueprints:read
 * filter: "learned" | "missing"
 */
export function getArcTrackerBlueprints(params?: {
  locale?: string;
  filter?: 'learned' | 'missing';
}): Promise<ArcTrackerBlueprints> {
  return atFetch<ArcTrackerBlueprints>('/api/arctracker/user/blueprints', {
    locale: params?.locale ?? 'en',
    ...(params?.filter ? { filter: params.filter } : {}),
  });
}

// ─── Public ArcTracker Catalog Endpoints (no auth) ───────────────────────────
// These are proxied through the backend /api/arctracker/public/... route

/**
 * GET /api/items — all game items with multilingual names/descriptions.
 * Suitable for high-frequency use (cached on ArcTracker side).
 */
export function getArcTrackerItems(locale = 'en'): Promise<unknown[]> {
  return atFetch<unknown[]>('/api/arctracker/public/items', { locale });
}

/**
 * GET /api/quests — all quests with multilingual details, objectives, rewards.
 */
export function getArcTrackerPublicQuests(locale = 'en'): Promise<unknown[]> {
  return atFetch<unknown[]>('/api/arctracker/public/quests', { locale });
}

/**
 * GET /api/hideout — all hideout modules with multilingual names, levels, requirements.
 */
export function getArcTrackerPublicHideout(locale = 'en'): Promise<unknown[]> {
  return atFetch<unknown[]>('/api/arctracker/public/hideout', { locale });
}

/**
 * GET /api/projects — all projects. Filter by season (1 | 2 | "1,2").
 */
export function getArcTrackerPublicProjects(
  locale = 'en',
  season?: string,
): Promise<unknown[]> {
  return atFetch<unknown[]>('/api/arctracker/public/projects', {
    locale,
    ...(season ? { season } : {}),
  });
}

// ─── Helper: normalise rounds from any shape to ArcTrackerRound[] ─────────────
export function normaliseRounds(
  raw: ArcTrackerRounds,
): import('../types/arcApi').ArcTrackerRound[] {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray((raw as any)?.data?.data)) return (raw as any).data.data;
  if (Array.isArray((raw as any)?.data?.rounds))
    return (raw as any).data.rounds;
  if (Array.isArray((raw as any)?.data)) return (raw as any).data;
  if (Array.isArray((raw as any)?.rounds)) return (raw as any).rounds;
  return [];
}

