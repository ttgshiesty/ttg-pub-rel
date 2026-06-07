/* =========================================================
   SHiESTY API CLIENT — Embark + ArcTracker + MetaForge Integration
   ========================================================= */

import {
  getItems as mfGetItems,
  getArcs as mfGetArcs,
  getQuests as mfGetQuests,
  getTraders as mfGetTraders,
  getEventsSchedule as mfGetEventsSchedule,
  getMapData as mfGetMapData,
  getWeeklyTrials as mfGetWeeklyTrials,
} from './metaForge';

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function safeFetch(url: string, options: RequestInit = {}) {
  const method = options.method ?? 'GET';
  console.log(`[API] → ${method} ${url}`);
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[API] ✗ ${response.status} ${method} ${url}`, errorData);
      const err = new Error(errorData.error || `HTTP ${response.status}`);
      (err as any).status = response.status;
      (err as any).unreachable = errorData.unreachable || false;
      (err as any).data = errorData;
      throw err;
    }

    const data = await response.json();
    console.log(`[API] ✓ ${method} ${url}`, data);
    return data;
  } catch (error: any) {
    if (!error.status)
      console.error(`[API] ✗ ${method} ${url}:`, error.message);
    throw error;
  }
}

// Direct Embark API (via our backend proxy using captured token)
export const EmbarkAPI = {
  profile: () => safeFetch(`${BASE_URL}/api/embark/profile`),
  stash: () => safeFetch(`${BASE_URL}/api/embark/stash`),
  rounds: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return safeFetch(`${BASE_URL}/api/embark/rounds${query}`);
  },
  hideout: () => safeFetch(`${BASE_URL}/api/embark/hideout`),
  quests: () => safeFetch(`${BASE_URL}/api/embark/quests`),
  projects: () => safeFetch(`${BASE_URL}/api/embark/projects`),
  loadout: () => safeFetch(`${BASE_URL}/api/embark/loadout`),
  blueprints: () => safeFetch(`${BASE_URL}/api/embark/blueprints`),
  stats: () => safeFetch(`${BASE_URL}/api/embark/stats`),
};

export interface AutoSyncSettings {
  enabled: boolean;
  intervalMinutes: number;
  lastSyncedAt: string | null;
  nextSyncAt: string | null;
  disabledReason: string | null;
  consecutiveFailures: number;
  lastErrorMessage: string | null;
  lastErrorAt: string | null;
  source?: 'extension' | 'arctracker' | 'both';
}

export const EmbarkSyncAPI = {
  syncNow: () =>
    safeFetch(`${BASE_URL}/api/embark/sync/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }),
  getAutoSync: (): Promise<AutoSyncSettings> =>
    safeFetch(`${BASE_URL}/api/embark/auto-sync/settings`),
  setAutoSync: (
    settings: Partial<
      Pick<AutoSyncSettings, 'enabled' | 'intervalMinutes' | 'source'>
    >,
  ): Promise<AutoSyncSettings> =>
    safeFetch(`${BASE_URL}/api/embark/auto-sync/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }),
};

export const RaiderSyncAPI = {
  profile: () => safeFetch(`${BASE_URL}/api/raider-sync`),
  saveEmbarkUsername: (embarkUsername: string) =>
    safeFetch(`${BASE_URL}/api/raider-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embarkUsername }),
    }),
  saveMetaForgeProfile: (profile: Record<string, any>) =>
    safeFetch(`${BASE_URL}/api/raider-sync/metaforge-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    }),
  saveError: (message: string) =>
    safeFetch(`${BASE_URL}/api/raider-sync/error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    }),
  unlink: () =>
    safeFetch(`${BASE_URL}/api/raider-sync`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    }),
};

// Combat & Performance
export const CombatAPI = {
  breakdown: () => safeFetch(`${BASE_URL}/api/player/combat-breakdown`),
  /** Pre-aggregated per-map stats. Returns { maps: [...], source } */
  mapPerformance: () => safeFetch(`${BASE_URL}/api/player/map-performance`),
  /** Lifetime enemy kill totals per enemy type. Returns { enemies: [{ targetId?, name, count }], source } */
  enemyKills: () => safeFetch(`${BASE_URL}/api/player/enemy-kills`),
  /** Current expedition/season tier state. Returns { completedExpeditions, activeSeason, state, currentTier, nextTier, updatedAt } */
  expeditionStatus: () => safeFetch(`${BASE_URL}/api/player/expedition-status`),
  /** Lifetime weapon kill totals. Returns { weapons: [{ weaponAssetId, itemId, name, count }], source } */
  weaponKills: () => safeFetch(`${BASE_URL}/api/player/weapon-kills`),
};

// Intelligence & Progression
export const IntelligenceAPI = {
  telepathy: () => safeFetch(`${BASE_URL}/api/player/telepathy`),
  raidHistory: () => safeFetch(`${BASE_URL}/api/player/raid-history`),
  xpBreakdown: () => safeFetch(`${BASE_URL}/api/player/xp-breakdown`),
  addWanted: (itemId: string, itemName: string, reason?: string) =>
    safeFetch(`${BASE_URL}/api/player/wanted`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, itemName, reason }),
    }),
  removeWanted: (itemId: string) =>
    safeFetch(`${BASE_URL}/api/player/wanted/${itemId}`, { method: 'DELETE' }),
};

// Notifications
export const NotificationAPI = {
  list: () => safeFetch(`${BASE_URL}/api/player/notifications`),
  readAll: () =>
    safeFetch(`${BASE_URL}/api/player/notifications/read-all`, {
      method: 'PATCH',
    }),
  readOne: (id: string) =>
    safeFetch(`${BASE_URL}/api/player/notifications/${id}/read`, {
      method: 'PATCH',
    }),
};

// Extension token linking
export const ExtensionAPI = {
  status: () => safeFetch(`${BASE_URL}/api/extension/status`),
  link: () => safeFetch(`${BASE_URL}/api/extension/link`, { method: 'POST' }),
  sync: (token: string) =>
    safeFetch(`${BASE_URL}/api/extension/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        source: 'extension_auto_sync',
        payload: {},
      }),
    }),
};

// Xbox bridge
export const XboxAPI = {
  sync: (data: Record<string, any>) =>
    safeFetch(`${BASE_URL}/api/extension/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  getData: () => safeFetch(`${BASE_URL}/api/extension/xbox-data`),
};

// Public profile + slug management
export const PublicAPI = {
  profile: (slug: string) =>
    safeFetch(`${BASE_URL}/api/profile/${encodeURIComponent(slug)}`),
  listings: (slug: string) =>
    safeFetch(`${BASE_URL}/api/profile/${encodeURIComponent(slug)}/listings`),
  recent: (slug: string) =>
    safeFetch(`${BASE_URL}/api/profile/${encodeURIComponent(slug)}/recent`),
  setSlug: (slug: string) =>
    safeFetch(`${BASE_URL}/api/slug`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    }),
  setVisibility: (isPublic: boolean) =>
    safeFetch(`${BASE_URL}/api/visibility`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public: isPublic }),
    }),
};

// Marketplace price history & trending
export const MarketHistoryAPI = {
  itemHistory: (itemId: string, days = 30) =>
    safeFetch(
      `${BASE_URL}/api/marketplace/items/${encodeURIComponent(itemId)}/history?days=${days}`,
    ),
  comparable: (itemId: string) =>
    safeFetch(
      `${BASE_URL}/api/marketplace/items/${encodeURIComponent(itemId)}/comparable`,
    ),
  trending: () => safeFetch(`${BASE_URL}/api/marketplace/trending`),
};

// ARC Raiders public game catalog (items, hideout, quests, maps, etc.)
export const CatalogAPI = {
  items: () => safeFetch(`${BASE_URL}/api/catalog/items`),
  item: (id: string) =>
    safeFetch(`${BASE_URL}/api/catalog/items/${encodeURIComponent(id)}`),
  hideout: () => safeFetch(`${BASE_URL}/api/catalog/hideout`),
  hideoutModule: (id: string) =>
    safeFetch(`${BASE_URL}/api/catalog/hideout/${encodeURIComponent(id)}`),
  quests: () => safeFetch(`${BASE_URL}/api/catalog/quests`),
  quest: (id: string) =>
    safeFetch(`${BASE_URL}/api/catalog/quests/${encodeURIComponent(id)}`),
  bots: () => safeFetch(`${BASE_URL}/api/catalog/bots`),
  maps: () => safeFetch(`${BASE_URL}/api/catalog/maps`),
  projects: () => safeFetch(`${BASE_URL}/api/catalog/projects`),
  skillNodes: () => safeFetch(`${BASE_URL}/api/catalog/skill-nodes`),
  trades: () => safeFetch(`${BASE_URL}/api/catalog/trades`),
  normalized: () => safeFetch(`${BASE_URL}/api/catalog/normalized`),
  normalizedKind: (
    kind: 'items' | 'quests' | 'projects' | 'hideout' | 'maps' | 'trades',
  ) => safeFetch(`${BASE_URL}/api/catalog/normalized/${kind}`),
  normalizedEntry: (
    kind: 'items' | 'quests' | 'projects' | 'hideout' | 'maps' | 'trades',
    id: string,
  ) =>
    safeFetch(
      `${BASE_URL}/api/catalog/normalized/${kind}/${encodeURIComponent(id)}`,
    ),
};

// ArcTracker dual-key integration
// Auth: X-App-Key (app key, set server-side) + Authorization: Bearer arc_u1_<user_key>
// All /api/arctracker/... routes on the backend proxy to https://arctracker.io/api/v2/user/...
// and attach the app key header server-side so it is never exposed client-side.
export const ArcTrackerAPI = {
  // ── Key management (backend-stored user key) ──────────────────────────────
  status: () => safeFetch(`${BASE_URL}/api/arctracker/status`),
  diagnostics: (account: 'main' | 'trade' = 'main') =>
    safeFetch(`${BASE_URL}/api/arctracker/diagnostics?account=${account}`),
  link: (userKey: string) =>
    safeFetch(`${BASE_URL}/api/arctracker/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userKey }),
    }),
  unlink: () =>
    safeFetch(`${BASE_URL}/api/arctracker/unlink`, { method: 'POST' }),
  // Secondary "trade" account key — separate ArcTracker profile used for
  // blueprints/stash views on a trading-only account.
  linkTrade: (userKey: string) =>
    safeFetch(`${BASE_URL}/api/arctracker/link-trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userKey }),
    }),
  unlinkTrade: () =>
    safeFetch(`${BASE_URL}/api/arctracker/unlink-trade`, { method: 'POST' }),

  // ── v2 Authenticated user data (dual-key, proxied) ────────────────────────
  // These correspond 1:1 to ArcTracker GET /api/v2/user/<endpoint>
  // Full typed versions are in client/src/lib/arctracker.ts — use those
  // for type-safe access. These remain for quick ad-hoc usage.
  userProfile: () => safeFetch(`${BASE_URL}/api/arctracker/user/profile`),
  userStash: (params?: Record<string, string | number>) => {
    const q = params
      ? '?' +
        new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).map(([k, v]) => [k, String(v)]),
          ),
        ).toString()
      : '?locale=en&per_page=500';
    return safeFetch(`${BASE_URL}/api/arctracker/user/stash${q}`);
  },
  userLoadout: (locale = 'en') =>
    safeFetch(`${BASE_URL}/api/arctracker/user/loadout?locale=${locale}`),
  userQuests: (filter?: 'completed' | 'incomplete', locale = 'en') =>
    safeFetch(
      `${BASE_URL}/api/arctracker/user/quests?locale=${locale}${filter ? `&filter=${filter}` : ''}`,
    ),
  userHideout: (locale = 'en') =>
    safeFetch(`${BASE_URL}/api/arctracker/user/hideout?locale=${locale}`),
  userProjects: (season?: number, locale = 'en') =>
    safeFetch(
      `${BASE_URL}/api/arctracker/user/projects?locale=${locale}${season !== undefined ? `&season=${season}` : ''}`,
    ),
  userRounds: (params?: Record<string, string | number>) => {
    const defaults: Record<string, string | number> = {
      locale: 'en',
      limit: 200,
      offset: 0,
    };
    const merged = { ...defaults, ...(params ?? {}) };
    const q = new URLSearchParams(
      Object.fromEntries(
        Object.entries(merged).map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return safeFetch(`${BASE_URL}/api/arctracker/user/rounds?${q}`);
  },
  userBlueprints: (filter?: 'learned' | 'missing', locale = 'en') =>
    safeFetch(
      `${BASE_URL}/api/arctracker/user/blueprints?locale=${locale}${filter ? `&filter=${filter}` : ''}`,
    ),
};

// Per-account player data (main or trade). Lets pages opt into trade view.
export const PlayerAccountAPI = {
  blueprints: (account: 'main' | 'trade' = 'main') =>
    safeFetch(`${BASE_URL}/api/player/blueprints?account=${account}`),
  stash: (account: 'main' | 'trade' = 'main') =>
    safeFetch(`${BASE_URL}/api/player/stash?account=${account}`),
  loadout: (account: 'main' | 'trade' = 'main') =>
    safeFetch(`${BASE_URL}/api/player/loadout?account=${account}`),
};

export const BlueprintFindAPI = {
  list: (params?: { blueprintId?: string; limit?: number }) => {
    const query = params
      ? `?${new URLSearchParams(
          Object.fromEntries(
            Object.entries(params)
              .filter(([, value]) => value !== undefined && value !== '')
              .map(([key, value]) => [key, String(value)]),
          ),
        ).toString()}`
      : '';
    return safeFetch(`${BASE_URL}/api/player/blueprint-finds${query}`);
  },
  create: (data: {
    blueprintId: string;
    blueprintName: string;
    blueprintImageUrl?: string;
    rarity?: string;
    map?: string;
    condition?: string;
    container?: string;
    location?: string;
    locked?: boolean;
    notes?: string;
    source?: 'manual' | 'sync' | 'discord';
  }) =>
    safeFetch(`${BASE_URL}/api/player/blueprint-finds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  vote: (id: string, direction: 'up' | 'down') =>
    safeFetch(`${BASE_URL}/api/player/blueprint-finds/${id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    }),
};

export const BlueprintProgressAPI = {
  get: () => safeFetch(`${BASE_URL}/api/player/blueprint-progress`),
  replace: (blueprints: string[]) =>
    safeFetch(`${BASE_URL}/api/player/blueprint-progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blueprints }),
    }),
  setOwned: (blueprintId: string, owned: boolean) =>
    safeFetch(
      `${BASE_URL}/api/player/blueprint-progress/${encodeURIComponent(blueprintId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owned }),
      },
    ),
};

// Discord auth
export const AuthAPI = {
  user: () => safeFetch(`${BASE_URL}/api/auth/user`),
  logout: () =>
    fetch(`${BASE_URL}/api/auth/logout`, { credentials: 'include' }),
};

export interface PlayerProfileSummary {
  id: string;
  username: string;
  avatar: string | null;
  avatarUrl: string | null;
  authSession?: Record<string, any>;
  authUser?: Record<string, any>;
  appMetadata?: Record<string, any>;
  userMetadata?: Record<string, any>;
  linkedIdentities?: any[];
  profile?: {
    username?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    embark_id?: string | null;
    [key: string]: any;
  };
  discordProfile?: {
    id?: string | null;
    username?: string | null;
    globalName?: string | null;
    avatarUrl?: string | null;
    email?: string | null;
    [key: string]: any;
  };
  metaForgeProfile?: Record<string, any>;
  displayName: string | null;
  bio: string;
  slug: string | null;
  profilePublic: boolean;
  lastActive: string | null;
  createdAt: string | null;
  links: {
    discord: {
      linked: boolean;
      id: string;
      username: string;
      avatar: string | null;
      avatarUrl: string | null;
      globalName?: string | null;
    };
    arctracker: {
      linked: boolean;
      linkedAt: string | null;
      tokenExpiresAt: string | null;
      tokenExpired: boolean | null;
      tradeLinked: boolean;
      tradeLinkedAt: string | null;
      tradeTokenExpiresAt: string | null;
      tradeTokenExpired: boolean | null;
      tradeUsername: string | null;
    };
    metaforge: {
      linked: boolean;
      id: string | null;
      profileUrl: string | null;
      profile?: Record<string, any>;
      avatarUrl?: string | null;
      embarkId?: string | null;
      status: 'linked' | 'not_linked' | 'error' | 'unknown';
    };
  };
}

// Player profile & XP
export const PlayerAPI = {
  me: () => safeFetch(`${BASE_URL}/api/player/me`),
  profileSummary: (): Promise<PlayerProfileSummary> =>
    safeFetch(`${BASE_URL}/api/player/profile-summary`),
  xp: (amount: number, reason?: string) =>
    safeFetch(`${BASE_URL}/api/player/xp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, reason }),
    }),
  storefront: (name: string, description: string) =>
    safeFetch(`${BASE_URL}/api/player/storefront`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    }),
  leaderboard: () => safeFetch(`${BASE_URL}/api/player/leaderboard`),
  settings: () => safeFetch(`${BASE_URL}/api/player/settings`),
  updateSettings: (settings: Record<string, any>) =>
    safeFetch(`${BASE_URL}/api/player/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    }),
  updateProfile: (data: { bio?: string; displayName?: string }) =>
    safeFetch(`${BASE_URL}/api/player/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
};

// Comprehensive stats — MetaForge-style overview built from ArcTracker.
export const StatsAPI = {
  overview: (fresh = false) =>
    safeFetch(`${BASE_URL}/api/stats/overview${fresh ? '?fresh=1' : ''}`),
};

// Marketplace
export const MarketplaceAPI = {
  browse: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return safeFetch(`${BASE_URL}/api/marketplace${query}`);
  },
  myListings: () => safeFetch(`${BASE_URL}/api/marketplace/my-listings`),
  stashItems: (account: 'main' | 'trade' = 'main') =>
    safeFetch(`${BASE_URL}/api/marketplace/stash-items?account=${account}`),
  warehouse: (account: 'main' | 'trade' = 'main', staleDays = 7) =>
    safeFetch(
      `${BASE_URL}/api/marketplace/warehouse?account=${account}&staleDays=${staleDays}`,
    ),
  optimizeListing: (data: {
    item: {
      name: string;
      itemType?: string | null;
      rarity?: string | null;
      description?: string | null;
      foundIn?: string[];
    };
    price?: number | string | null;
    currency?: string | null;
    quantity?: number | null;
    notes?: string | null;
  }) =>
    safeFetch(`${BASE_URL}/api/marketplace/optimize-listing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  bulkIngest: (text: string, allowUnknown = false) =>
    safeFetch(`${BASE_URL}/api/marketplace/bulk-ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, allowUnknown }),
    }),
  list: (data: Record<string, any>) =>
    safeFetch(`${BASE_URL}/api/marketplace/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  buy: (id: string) =>
    safeFetch(`${BASE_URL}/api/marketplace/buy/${id}`, { method: 'POST' }),
  cancel: (id: string) =>
    safeFetch(`${BASE_URL}/api/marketplace/${id}`, { method: 'DELETE' }),
  categories: () => safeFetch(`${BASE_URL}/api/marketplace/categories`),
  offers: () => safeFetch(`${BASE_URL}/api/marketplace/offers`),
  createOffer: (data: {
    listingId: string;
    offeredPrice: number;
    currency?: string;
    message?: string;
  }) =>
    safeFetch(`${BASE_URL}/api/marketplace/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  acceptOffer: (id: string) =>
    safeFetch(`${BASE_URL}/api/marketplace/offers/${id}/accept`, {
      method: 'POST',
    }),
  declineOffer: (id: string) =>
    safeFetch(`${BASE_URL}/api/marketplace/offers/${id}/decline`, {
      method: 'POST',
    }),
  withdrawOffer: (id: string) =>
    safeFetch(`${BASE_URL}/api/marketplace/offers/${id}/withdraw`, {
      method: 'POST',
    }),
};

// G2G seller integration proxy. Disabled server-side until G2G env keys exist.
export const G2GAPI = {
  health: () => safeFetch(`${BASE_URL}/api/g2g/health`),
  products: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return safeFetch(`${BASE_URL}/api/g2g/products${query}`);
  },
  services: () => safeFetch(`${BASE_URL}/api/g2g/services`),
  brands: (serviceId: string) =>
    safeFetch(
      `${BASE_URL}/api/g2g/brands?service_id=${encodeURIComponent(serviceId)}`,
    ),
  offers: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return safeFetch(`${BASE_URL}/api/g2g/offers${query}`);
  },
  createOffer: (data: Record<string, any>) =>
    safeFetch(`${BASE_URL}/api/g2g/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  updateOffer: (offerId: string, data: Record<string, any>) =>
    safeFetch(`${BASE_URL}/api/g2g/offers/${encodeURIComponent(offerId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  deleteOffer: (offerId: string) =>
    safeFetch(`${BASE_URL}/api/g2g/offers/${encodeURIComponent(offerId)}`, {
      method: 'DELETE',
    }),
  order: (orderId: string) =>
    safeFetch(`${BASE_URL}/api/g2g/orders/${encodeURIComponent(orderId)}`),
  deliverOrder: (orderId: string, data: Record<string, any>) =>
    safeFetch(
      `${BASE_URL}/api/g2g/orders/${encodeURIComponent(orderId)}/delivery`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    ),
};

// Discord notifications
export const DiscordAPI = {
  webhook: (url: string) =>
    safeFetch(`${BASE_URL}/api/discord/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl: url }),
    }),
  deleteWebhook: () =>
    safeFetch(`${BASE_URL}/api/discord/webhook`, { method: 'DELETE' }),
  webhookStatus: () => safeFetch(`${BASE_URL}/api/discord/webhook/status`),
  notifyStore: () =>
    safeFetch(`${BASE_URL}/api/discord/notify/store`, { method: 'POST' }),
  notifyRaid: (roundData: Record<string, any>) =>
    safeFetch(`${BASE_URL}/api/discord/notify/raid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundData }),
    }),
  notifyProgress: () =>
    safeFetch(`${BASE_URL}/api/discord/notify/progress`, { method: 'POST' }),
  notifyBlueprint: (data: {
    type: 'offer' | 'want';
    itemName: string;
    itemId: string;
    rarity: string;
    imageUrl?: string;
    price?: number;
    note?: string;
  }) =>
    safeFetch(`${BASE_URL}/api/discord/notify/blueprint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  notifyBlueprintFind: (data: {
    blueprintName: string;
    rarity?: string;
    imageUrl?: string;
    map?: string;
    condition?: string;
    container?: string;
    location?: string;
    locked?: boolean;
    notes?: string;
  }) =>
    safeFetch(`${BASE_URL}/api/discord/notify/blueprint-find`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
};

// LEGACY shims — RaidTheory + MetaForge external endpoints were unreliable
// (CSP, 404s). Everything now flows through our CatalogAPI proxy backed by
// arcdata.mahcks.com. These wrappers stay so existing pages keep compiling.
export const RaidTheoryAPI = {
  items: () => CatalogAPI.items().catch(() => []),
  trades: () => CatalogAPI.trades().catch(() => []),
  maps: () => CatalogAPI.maps().catch(() => []),
  enemies: () => CatalogAPI.bots().catch(() => []),
  weapons: async () => {
    // Synthesize "weapons" from items: anything whose type looks weapony.
    const items = await CatalogAPI.items().catch(() => null);
    const arr = Array.isArray(items) ? items : items?.items || [];
    const weaponTypes = /weapon|rifle|smg|shotgun|sniper|pistol|launcher|gun/i;
    return arr.filter((i: any) => weaponTypes.test(i.type || ''));
  },
};

export const ArcDataAPI = {
  items: () => CatalogAPI.items().catch(() => []),
  enemies: () => CatalogAPI.bots().catch(() => []),
};

// MetaForge public game catalog — https://metaforge.app/api/arc-raiders
// No auth required. Full typed versions + 5-min cache in client/src/lib/metaforge.ts.
// These are convenience wrappers that normalise the paged response for legacy callers.
export const MetaForgeAPI = {
  // GET /api/arc-raiders/items — items with full stat_block (arc_api_rs fields)
  items: (params?: Parameters<typeof mfGetItems>[0]) =>
    mfGetItems(params).then((r) => r.data ?? (r as any)),
  // GET /api/arc-raiders/arcs — ARC enemies with optional loot
  arcs: (includeLoot = false) =>
    mfGetArcs({ includeLoot }).then((r) => r.data ?? (r as any)),
  // GET /api/arc-raiders/quests — quests with required_items + rewards
  quests: () => mfGetQuests().then((r) => r.data ?? (r as any)),
  // GET /api/arc-raiders/traders — all trader inventories
  traders: () => mfGetTraders().then((r) => r.data ?? (r as any)),
  // GET /api/arc-raiders/events-schedule — live event timers
  eventsSchedule: () => mfGetEventsSchedule().then((r) => r.data ?? (r as any)),
  // GET /api/game-map-data — map zone data for a specific map
  mapData: (mapID: string) =>
    mfGetMapData(mapID).then((r) => r.data ?? (r as any)),
  // GET /api/arc-raiders/weekly-trials — trials leaderboard
  weeklyTrials: (id?: string) => mfGetWeeklyTrials(id),
  // Raider stats by MetaForge ID — now proxied through backend
  raiderStats: (metaforgeId: string) =>
    safeFetch(
      `${BASE_URL}/api/arc-raiders/raider/${encodeURIComponent(metaforgeId)}`,
    ),
};

// MetaForge server proxy — routes through our backend (no direct browser → metaforge.app calls)
export const MetaForgeProxyAPI = {
  link: () => safeFetch(`${BASE_URL}/api/arc-raiders/profile/link`),
  profile: (slug: string) =>
    safeFetch(
      `${BASE_URL}/api/arc-raiders/profile/${encodeURIComponent(slug)}`,
    ),
  myPlayerStats: () => safeFetch(`${BASE_URL}/api/arc-raiders/player-stats/me`),
  myRaiderStats: () => safeFetch(`${BASE_URL}/api/arc-raiders/raider/me`),
  myStats: () => safeFetch(`${BASE_URL}/api/arc-raiders/stats/me`),
  myInventory: () => safeFetch(`${BASE_URL}/api/arc-raiders/inventory/me`),
  myInventorySnapshot: () =>
    safeFetch(`${BASE_URL}/api/arc-raiders/inventory/snapshot/me`),
  raiderStats: (id: string) =>
    safeFetch(`${BASE_URL}/api/arc-raiders/raider/${encodeURIComponent(id)}`),
  stats: (id: string) =>
    safeFetch(`${BASE_URL}/api/arc-raiders/stats/${encodeURIComponent(id)}`),
  playerStats: (id: string) =>
    safeFetch(
      `${BASE_URL}/api/arc-raiders/player-stats/${encodeURIComponent(id)}`,
    ),
  inventory: (id: string) =>
    safeFetch(
      `${BASE_URL}/api/arc-raiders/inventory/${encodeURIComponent(id)}`,
    ),
  inventorySnapshot: (id: string) =>
    safeFetch(
      `${BASE_URL}/api/arc-raiders/inventory/snapshot/${encodeURIComponent(id)}`,
    ),
  sync: () => safeFetch(`${BASE_URL}/api/arc-raiders/sync`),
  guideNavigation: () =>
    safeFetch(`${BASE_URL}/api/arc-raiders/guide-navigation`),
  endpoint: (path: string) =>
    safeFetch(`${BASE_URL}/api/arc-raiders/${encodeURIComponent(path)}`),
  gameMapData: () => safeFetch(`${BASE_URL}/api/arc-raiders/game-map-data`),
};

// ARDB static data catalog (567 items, 100 quests, projects, tags)
export const ArdbAPI = {
  items: () => safeFetch(`${BASE_URL}/api/items`),
  item: (id: string) =>
    safeFetch(`${BASE_URL}/api/items/${encodeURIComponent(id)}`),
  tags: () => safeFetch(`${BASE_URL}/api/tags`),
  quests: () => safeFetch(`${BASE_URL}/api/quests`),
  quest: (id: string) =>
    safeFetch(`${BASE_URL}/api/quests/${encodeURIComponent(id)}`),
  projects: () => safeFetch(`${BASE_URL}/api/projects`),
  arcEnemies: () => safeFetch(`${BASE_URL}/api/arc-enemies`),
  arcEnemy: (id: string) =>
    safeFetch(`${BASE_URL}/api/arc-enemies/${encodeURIComponent(id)}`),
};
