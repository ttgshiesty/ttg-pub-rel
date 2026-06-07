/* =========================================================
   ArcTracker API Client
   Dual-key authentication: app key (env) + user key (per user)
   https://arctracker.io API docs
   ========================================================= */

import logger from '../utils/logger.js';
import { summarizeRounds as summarizeNormalizedRounds } from './statsMapping.js';

const BASE_URL = 'https://arctracker.io';

// Simple in-memory cache to respect rate limits (500 req/hr per app key).
// key = `${userKey}:${path}` -> { data, expiresAt, staleExpiresAt }
const cache = new Map();
const CACHE_TTL_MS = 5 * 1000; // 5 seconds - reduced for live updates
const STALE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes during upstream issues
const MAX_CACHE_SIZE = 500; // Prevent unbounded growth
const MISSING_ENDPOINT_TTL_MS = 10 * 60 * 1000; // Optional 404 endpoints stay quiet briefly

// Circuit breaker state
export const circuitBreaker = {
  failures: 0,
  lastFailureTime: 0,
  isOpen: false,
  threshold: 5, // Open circuit after 5 consecutive failures
  resetTimeout: 5 * 60 * 1000, // 5 minutes before attempting to close circuit
};

function checkCircuitBreaker() {
  const now = Date.now();

  // If circuit is open and reset timeout has passed, try to close it
  if (
    circuitBreaker.isOpen &&
    now - circuitBreaker.lastFailureTime > circuitBreaker.resetTimeout
  ) {
    logger.info('[ArcTracker] Circuit breaker attempting to reset');
    circuitBreaker.isOpen = false;
    circuitBreaker.failures = 0;
  }

  // If circuit is open, throw error
  if (circuitBreaker.isOpen) {
    throw new Error(
      'ArcTracker API circuit breaker is open - too many failures',
    );
  }
}

function recordCircuitBreakerFailure(reason = 'unknown') {
  circuitBreaker.failures += 1;
  circuitBreaker.lastFailureTime = Date.now();

  if (circuitBreaker.failures >= circuitBreaker.threshold) {
    circuitBreaker.isOpen = true;
    logger.error(
      `[ArcTracker] Circuit breaker opened after ${circuitBreaker.failures} transient failures (${reason})`,
    );
  }
}

function recordCircuitBreakerSuccess() {
  // Reset failure count on success
  if (circuitBreaker.failures > 0) {
    logger.info(
      `[ArcTracker] Circuit breaker reset after ${circuitBreaker.failures} failures`,
    );
    circuitBreaker.failures = 0;
  }
}

function shouldTripCircuitForStatus(status) {
  return status === 429 || status >= 500;
}

function shouldTripCircuitForError(err) {
  const message = String(err?.message || '').toLowerCase();
  return (
    err?.name === 'AbortError' ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('eai_again')
  );
}

function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if ((entry.staleExpiresAt ?? entry.expiresAt) <= now) {
      cache.delete(key);
    }
  }
}

function setCacheEntry(key, data, ttlMs, staleTtlMs = STALE_CACHE_TTL_MS) {
  // Cleanup expired entries periodically (roughly every 10% of inserts)
  if (cache.size >= MAX_CACHE_SIZE || Math.random() < 0.1) {
    cleanupCache();
  }
  // If still at limit, delete oldest entries (FIFO)
  while (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  const now = Date.now();
  cache.set(key, {
    data,
    expiresAt: now + ttlMs,
    staleExpiresAt: now + ttlMs + staleTtlMs,
  });
}

function setErrorCacheEntry(key, error, status, ttlMs) {
  if (cache.size >= MAX_CACHE_SIZE || Math.random() < 0.1) {
    cleanupCache();
  }
  while (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  const now = Date.now();
  cache.set(key, {
    error,
    status,
    expiresAt: now + ttlMs,
    staleExpiresAt: now + ttlMs,
  });
}

function getFreshCache(cached) {
  if (!cached || cached.expiresAt <= Date.now()) return null;
  return cached;
}

function getStaleCache(cached) {
  if (
    !cached ||
    cached.error ||
    cached.data === undefined ||
    (cached.staleExpiresAt ?? cached.expiresAt) <= Date.now()
  ) {
    return null;
  }
  return cached;
}

function returnStaleOrThrow(cached, err, label) {
  const stale = getStaleCache(cached);
  if (stale) {
    logger.warn(`[ArcTracker] Using stale cache for ${label}: ${err.message}`);
    return stale.data;
  }
  throw err;
}

function getAppKey() {
  const key = process.env.ARCTRACKER_APP_KEY;
  if (!key) {
    throw new Error(
      '[ArcTracker] ARCTRACKER_APP_KEY is not set in environment',
    );
  }
  return key;
}

function getAppHeaders() {
  return {
    'X-App-Key': getAppKey(),
  };
}

function getUserHeaders(userKey) {
  return {
    'X-App-Key': getAppKey(),
    Authorization: `Bearer ${userKey}`,
  };
}

function getCookieHeaders(sessionToken) {
  return {
    'X-App-Key': getAppKey(),
    Cookie: `better-auth.session_token=${sessionToken}`,
  };
}

function buildArcTrackerUrl(path) {
  const normalizedPath = String(path || '').startsWith('/')
    ? path
    : `/${path}`;
  return new URL(`${BASE_URL}${normalizedPath}`);
}

async function fetchArcTrackerPublic(path, params = {}) {
  const url = buildArcTrackerUrl(path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }

  const cacheKey = `public:${url.toString()}`;
  const cached = cache.get(cacheKey);
  const fresh = getFreshCache(cached);
  if (fresh) return fresh.data;

  let response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: getAppHeaders(),
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    return returnStaleOrThrow(cached, err, path);
  }

  let body = null;
  try {
    body = await response.json();
  } catch (_) {
    /* non-JSON response */
  }

  if (!response.ok) {
    const message =
      body?.error?.message || `ArcTracker public ${response.status}`;
    if (response.status === 429 || response.status >= 500) {
      return returnStaleOrThrow(cached, new Error(message), path);
    }
    throw new Error(message);
  }

  const data = body?.data ?? body ?? null;
  setCacheEntry(cacheKey, data, 5 * 60 * 1000);
  return data;
}

/**
 * Make a request to ArcTracker with cookie auth (better-auth.session_token).
 * Used for cookie-only endpoints like /api/embark/stats/*.
 * @param {string} sessionToken - The user's browser session token
 * @param {string} path - API path starting with /api/...
 * @param {object} [params] - Query params object
 * @returns {Promise<any>} - Parsed JSON `data` field, or throws.
 */
export async function fetchArcTrackerWithCookie(sessionToken, path, params = {}) {
  if (!sessionToken || typeof sessionToken !== 'string') {
    throw new Error('ArcTracker session token required');
  }

  const url = buildArcTrackerUrl(path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }

  let response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: getCookieHeaders(sessionToken),
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    throw new Error(`ArcTracker cookie request failed: ${err.message}`);
  }

  let body = null;
  try {
    body = await response.json();
  } catch (_) {
    /* non-JSON response */
  }

  if (!response.ok) {
    const message =
      body?.error?.message || `ArcTracker cookie ${response.status}`;
    throw new Error(message);
  }

  return body?.data ?? body ?? null;
}

/**
 * Make a request to ArcTracker with dual-key auth.
 * @param {string} userKey - The user's personal key (arc_u1_...)
 * @param {string} path - API path starting with /api/...
 * @param {object} [params] - Query params object
 * @returns {Promise<any>} - Parsed JSON `data` field, or throws.
 */
export async function fetchArcTracker(userKey, path, params = {}) {
  if (!userKey || typeof userKey !== 'string') {
    throw new Error('ArcTracker user key required');
  }
  if (!userKey.startsWith('arc_u1_')) {
    throw new Error('Invalid ArcTracker user key (must start with "arc_u1_")');
  }

  const url = buildArcTrackerUrl(path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }
  const cacheKey = `${userKey}:${url.toString()}`;
  const cached = cache.get(cacheKey);

  // Check for cached failure responses
  const fresh = getFreshCache(cached);
  if (fresh) {
    if (cached.error) {
      throw new Error(cached.error);
    }
    return cached.data;
  }

  try {
    checkCircuitBreaker();
  } catch (err) {
    return returnStaleOrThrow(cached, err, path);
  }

  logger.info(
    `[ArcTracker] Cache MISS for ${path} - fetching fresh (key: ${userKey.slice(0, 8)}...)`,
  );

  let response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: getUserHeaders(userKey),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });
  } catch (err) {
    if (shouldTripCircuitForError(err)) {
      recordCircuitBreakerFailure(err.message);
    }
    return returnStaleOrThrow(
      cached,
      new Error(`ArcTracker API request failed: ${err.message}`),
      path,
    );
  }

  let body = null;
  try {
    body = await response.json();
    logger.info(
      `[ArcTracker] Response from ${path}:`,
      JSON.stringify(body).slice(0, 200),
    );
  } catch (_) {
    /* non-JSON response */
  }

  if (!response.ok) {
    const code = body?.error?.code;
    const message = body?.error?.message || `ArcTracker ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.code = code;

    if (shouldTripCircuitForStatus(response.status)) {
      recordCircuitBreakerFailure(`${response.status} ${message}`);
    }

    // Add enhanced logging for debugging
    logger.error(
      `[ArcTracker] API Error: ${response.status} ${response.statusText} for ${path}`,
    );
    logger.error(
      `[ArcTracker] Response body:`,
      JSON.stringify(body).slice(0, 500),
    );

    // For 404 errors, cache the failure for a shorter time to prevent rapid retries
    if (response.status === 404) {
      setErrorCacheEntry(
        cacheKey,
        message,
        response.status,
        MISSING_ENDPOINT_TTL_MS,
      );
    }

    if (shouldTripCircuitForStatus(response.status)) {
      return returnStaleOrThrow(cached, err, path);
    }

    throw err;
  }

  const data = body?.data ?? body ?? null;

  // Record circuit breaker success and cache the data
  recordCircuitBreakerSuccess();
  setCacheEntry(cacheKey, data, CACHE_TTL_MS);
  return data;
}

async function diagnoseArcTrackerEndpoint(userKey, path) {
  const url = buildArcTrackerUrl(path);
  const startedAt = Date.now();
  let response;
  let body = null;

  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: getUserHeaders(userKey),
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    return {
      endpoint: path,
      ok: false,
      statusCode: 'error',
      requestId: null,
      durationMs: Date.now() - startedAt,
      detail: err.message,
    };
  }

  try {
    body = await response.json();
  } catch (_) {
    body = null;
  }

  return {
    endpoint: path,
    ok: response.ok,
    statusCode: response.status,
    requestId:
      body?.request_id ??
      body?.requestId ??
      body?.error?.request_id ??
      body?.error?.requestId ??
      response.headers.get('x-request-id') ??
      null,
    durationMs: Date.now() - startedAt,
    detail: response.ok
      ? 'OK'
      : body?.error?.message || body?.message || response.statusText,
  };
}

/**
 * High-level convenience wrappers for the user-facing endpoints.
 */
export const ArcTrackerAPI = {
  // ---- Public (no user key needed but we still pass app key) ----
  getItems: (opts = {}) =>
    fetchArcTrackerPublic('/api/items', { locale: opts.locale || 'en' }),

  getPublicQuests: (opts = {}) =>
    fetchArcTrackerPublic('/api/quests', { locale: opts.locale || 'en' }),

  getPublicHideout: (opts = {}) =>
    fetchArcTrackerPublic('/api/hideout', { locale: opts.locale || 'en' }),

  getPublicProjects: (opts = {}) =>
    fetchArcTrackerPublic('/api/projects', {
      locale: opts.locale || 'en',
      season: opts.season,
    }),

  getPublicProjectsAllSeasons: async (opts = {}) => {
    const seasons = String(opts.season || '1,2')
      .split(',')
      .map((season) => season.trim())
      .filter(Boolean);
    const results = await Promise.all(
      seasons.map((season) =>
        fetchArcTrackerPublic('/api/projects', {
          locale: opts.locale || 'en',
          season,
        }),
      ),
    );
    return results.flatMap((data) => (Array.isArray(data) ? data : []));
  },

  // ---- Authenticated user data ----
  getProfile: (userKey, opts = {}) =>
    fetchArcTracker(userKey, '/api/v2/user/profile', {
      locale: opts.locale || 'en',
    }),

  getSummary: (sessionToken, opts = {}) =>
    fetchArcTrackerWithCookie(sessionToken, '/api/embark/stats/summary', {
      locale: opts.locale || 'en',
    }),

  getUserSummary: (sessionToken, opts = {}) =>
    fetchArcTrackerWithCookie(sessionToken, '/api/embark/stats/summary', {
      locale: opts.locale || 'en',
    }),

  getStash: (userKey, opts = {}) =>
    fetchArcTracker(userKey, '/api/v2/user/stash', {
      locale: opts.locale || 'en',
      page: opts.page || 1,
      per_page: opts.per_page || opts.perPage || 500,
      sort: opts.sort || 'slot',
    }),

  getAllStash: async (userKey, opts = {}) => {
    const pageSize = 500;
    const maxItems = opts.maxItems || 5000;
    let page = 1;
    let all = [];
    let slots = null;
    let currencies = null;
    while (all.length < maxItems) {
      const data = await fetchArcTracker(userKey, '/api/v2/user/stash', {
        locale: opts.locale || 'en',
        page,
        per_page: pageSize,
        sort: opts.sort || 'slot',
      });
      const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.data?.items)
          ? data.data.items
          : Array.isArray(data)
            ? data
            : [];
      if (!slots) slots = data?.slots || data?.stashSlots || null;
      if (!currencies) currencies = data?.currencies || null;
      if (items.length === 0) break;
      all = all.concat(items);
      if (items.length < pageSize) break;
      page += 1;
    }
    return { items: all, slots, currencies };
  },

  getLoadout: (userKey, opts = {}) =>
    fetchArcTracker(userKey, '/api/v2/user/loadout', {
      locale: opts.locale || 'en',
    }),

  getQuests: (userKey, opts = {}) =>
    fetchArcTracker(userKey, '/api/v2/user/quests', {
      locale: opts.locale || 'en',
      filter: opts.filter,
    }),

  getIncompleteQuests: (userKey, opts = {}) =>
    fetchArcTracker(userKey, '/api/v2/user/quests', {
      locale: opts.locale || 'en',
      filter: 'incomplete',
    }),

  getCompletedQuests: (userKey, opts = {}) =>
    fetchArcTracker(userKey, '/api/v2/user/quests', {
      locale: opts.locale || 'en',
      filter: 'completed',
    }),

  getQuestProgress: async (userKey, opts = {}) => {
    try {
      return await ArcTrackerAPI.getIncompleteQuests(userKey, opts);
    } catch (err) {
      logger.warn(
        `[ArcTracker] incomplete quests failed, falling back to completed: ${err.message}`,
      );
      return ArcTrackerAPI.getCompletedQuests(userKey, opts);
    }
  },

  getHideout: (userKey, opts = {}) =>
    fetchArcTracker(userKey, '/api/v2/user/hideout', {
      locale: opts.locale || 'en',
    }),

  getProjects: (userKey, opts = {}) =>
    fetchArcTracker(userKey, '/api/v2/user/projects', {
      locale: opts.locale || 'en',
      season: opts.season,
    }),

  getAllProjects: async (userKey, opts = {}) => {
    const seasons = String(opts.season || '1,2')
      .split(',')
      .map((season) => season.trim())
      .filter(Boolean);
    const results = await Promise.all(
      seasons.map((season) =>
        fetchArcTracker(userKey, '/api/v2/user/projects', {
          locale: opts.locale || 'en',
          season,
        }),
      ),
    );
    return results.flatMap((data) => (Array.isArray(data) ? data : []));
  },

  getRounds: (userKey, opts = {}) =>
    fetchArcTracker(userKey, '/api/v2/user/rounds', {
      locale: opts.locale || 'en',
      limit: opts.limit || 50,
      offset: opts.offset || 0,
      outcome: opts.outcome,
      map: opts.map,
      season: opts.season,
      date_from: opts.dateFrom,
      date_to: opts.dateTo,
      sort: opts.sort || 'newest',
    }),

  getBlueprints: (userKey, opts = {}) =>
    fetchArcTracker(userKey, '/api/v2/user/blueprints', {
      locale: opts.locale || 'en',
      filter: opts.filter,
    }),
  // Enemy kill breakdown — dedicated endpoint returning lifetime totals per enemy type.
  // Returns: { enemies: [{ targetId, name, count }] }
  getEnemyKills: (sessionToken, opts = {}) =>
    fetchArcTrackerWithCookie(sessionToken, '/api/embark/stats/enemy-kills', {
      locale: opts.locale || 'en',
    }),

  getMapPerformance: (sessionToken, opts = {}) =>
    fetchArcTrackerWithCookie(sessionToken, '/api/embark/stats/map-performance', {
      locale: opts.locale || 'en',
    }),

  // Weapon kill breakdown — dedicated endpoint returning lifetime kill totals per weapon.
  // Returns: { weapons: [{ weaponAssetId, itemId, name, count }] }
  getWeaponKills: (sessionToken, opts = {}) =>
    fetchArcTrackerWithCookie(sessionToken, '/api/embark/stats/weapon-kills', {
      locale: opts.locale || 'en',
    }),

  getStatsRounds: (sessionToken, opts = {}) =>
    fetchArcTrackerWithCookie(sessionToken, '/api/embark/stats/rounds', {
      locale: opts.locale || 'en',
      limit: Math.min(opts.limit || 200, 200),
      offset: opts.offset || 0,
      outcome: opts.outcome,
      map: opts.map,
      season: opts.season,
      date_from: opts.dateFrom,
      date_to: opts.dateTo,
      sort: opts.sort || 'newest',
    }),

  // Expedition / Season status — current tier progress and season state.
  // Returns: { completedExpeditions, activeSeason, state, currentTier, nextTier, updatedAt }
  getExpeditionStatus: (userKey, opts = {}) =>
    fetchArcTracker(userKey, '/api/v2/user/expedition-status', {
      locale: opts.locale || 'en',
    }),

  runDiagnostics: async (userKey) => {
    const endpoints = [
      '/api/v2/user/profile?locale=en',
      '/api/v2/user/stash?locale=en&page=1&per_page=50&sort=slot',
      '/api/v2/user/loadout?locale=en',
      '/api/v2/user/quests?locale=en&filter=incomplete',
      '/api/v2/user/quests?locale=en&filter=completed',
      '/api/v2/user/hideout?locale=en',
      '/api/v2/user/projects?locale=en&season=1',
      '/api/v2/user/projects?locale=en&season=2',
      '/api/v2/user/rounds?locale=en&limit=10',
      '/api/v2/user/blueprints?locale=en',
    ];

    const rows = [];
    for (const endpoint of endpoints) {
      rows.push(await diagnoseArcTrackerEndpoint(userKey, endpoint));
    }
    return {
      passed: rows.filter((row) => row.ok).length,
      failed: rows.filter((row) => !row.ok).length,
      rows,
    };
  },

  /**           this is number of api rounds to call stat wise
   * Fetch the entire round history by paginating /rounds (max 200/req).
   * Caps at maxTotal to prevent runaway loops if the API misbehaves.
   */
  getAllRounds: async (userKey, opts = {}) => {
    const pageSize = 200;
    const maxTotal = opts.maxTotal || 2000;
    let offset = 0;
    let all = [];
    while (offset < maxTotal) {
      const data = await fetchArcTracker(userKey, '/api/v2/user/rounds', {
        locale: opts.locale || 'en',
        limit: pageSize,
        offset,
        outcome: opts.outcome,
        map: opts.map,
        season: opts.season,
        date_from: opts.dateFrom,
        date_to: opts.dateTo,
        sort: opts.sort || 'newest',
      });
      const rounds = Array.isArray(data?.rounds)
        ? data.rounds
        : Array.isArray(data)
          ? data
          : [];
      if (rounds.length === 0) break;
      all = all.concat(rounds);
      if (rounds.length < pageSize) break;
      offset += pageSize;
    }
    return { rounds: all };
  },
};

// Useful helper: aggregate stats from /rounds for the dashboard
export async function summarizeRounds(userKey, opts = {}) {
  const data = await ArcTrackerAPI.getAllRounds(userKey, {
    maxTotal: opts.maxTotal || 2000,
    outcome: opts.outcome,
    map: opts.map,
    season: opts.season,
    dateFrom: opts.dateFrom,
    dateTo: opts.dateTo,
    sort: opts.sort,
  });
  const rounds = Array.isArray(data?.rounds)
    ? data.rounds
    : Array.isArray(data)
      ? data
      : [];
  const normalized = summarizeNormalizedRounds(rounds);
  return {
    ...normalized,
    totalRaids: normalized.totalRounds,
    successfulExtractions: normalized.totalExtracted,
    failedRaids: normalized.totalDied,
    arcKills: normalized.totalArcKills,
    playerKills: normalized.totalPlayerKills,
    totalKills: normalized.totalKills,
    totalDamage: normalized.totalDamage,
    lootValue: normalized.totalValueExtracted,
    loadoutValue: normalized.totalValueBroughtIn,
    netValue: normalized.totalNetValue,
    netProfit: normalized.totalNetValue,
    containersLooted: normalized.totalContainersLooted,
    topsideSeconds: Math.floor(normalized.totalTimeMs / 1000),
    avgDamagePerRound: normalized.damagePerRound,
    avgProfit: normalized.avgNetValuePerRound,
  };
}

/**
 * Fetch from ArcTracker v1 personal endpoints (stats, inventory, blueprints)
 * @param {string} endpoint - 'stats' | 'inventory' | 'blueprints'
 * @param {string} userKey - User's ArcTracker key
 * @returns {Promise<any>}
 */
export async function fetchV1Personal(endpoint, userKey) {
  if (!userKey || typeof userKey !== 'string') {
    throw new Error('ArcTracker user key required');
  }
  return fetchArcTracker(userKey, `/api/v1/user/${endpoint}`);
}

/**
 * Simple public endpoint fetcher
 * @param {string} endpoint - Public endpoint path (e.g., 'items', 'quests')
 * @returns {Promise<any>}
 */
export async function fetchPublicArc(endpoint) {
  return fetchArcTrackerPublic(`/api/${endpoint}`);
}

/**
 * Xbox proxy - tries Xbox token first, falls back to ArcTracker stash
 * @param {string} [userKey] - Fallback ArcTracker key
 * @returns {Promise<any>}
 */
export async function fetchXboxStash(userKey) {
  // Note: Xbox token handling is environment-specific
  // This function provides the fallback pattern from check/services/arcTracker.ts
  logger.warn('[ArcTracker] No Xbox token, falling back to ArcTracker stash');
  if (userKey) {
    return fetchArcTracker(userKey, '/api/v2/user/stash', { per_page: 500 });
  }
  return null;
}
