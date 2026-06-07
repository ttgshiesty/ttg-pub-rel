import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  ExtensionAPI,
  AuthAPI,
  PlayerAPI,
} from '../lib/api';
import {
  pingExtension,
  onOAuthCallback,
  onExtensionReady,
  getPKCEVerifier,
  checkEmbarkSession,
  notifyTokenExchanged,
  startEmbarkAuth,
} from '../lib/extensionBridge';

const BASE_URL = import.meta.env.VITE_API_URL || '';

// Expedition/season status shape confirmed from arctracker/expedition-status.json
export interface ExpeditionStatus {
  completedExpeditions: number;
  activeSeason: number;
  /** "READY" | "ACTIVE" | "ENDED" etc. */
  state: string;
  currentTier: number;
  nextTier: number;
  updatedAt: number;
}

interface PlayerStats {
  level: number;
  xp: number;
  totalXp: number;
  xpForNextLevel: number;
  xpProgressPercent: number;
  credits: number;
  tokens: number;
  coins: number;
  currencies?: {
    credits?: number;
    tokens?: number;
    coins?: number;
  };
  stashValue: number;
  liveStashValue?: number;
  stashSlots?: {
    total?: number;
    used?: number;
  };
  stashSlotsTotal?: number;
  stashSlotsUsed?: number;
  totalRaids: number;
  successfulExtractions: number;
  totalKills: number;
  arcKills?: number;
  playerKills?: number;
  totalPlayerKills?: number;
  totalArcKills?: number;
  totalDamage?: number;
  containersLooted?: number;
  totalContainersLooted?: number;
  itemsExtracted?: number;
  totalItemsExtracted?: number;
  survivalRate?: number;
  kdRatio?: number;
  netProfit: number;
  activeListings: number;
  avatarUrl?: string | null;
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
  embarkId: string;
  embarkLinked: boolean;
  embarkUsername: string | null;
  displayName: string;
  storefrontName: string;
  storefrontDescription: string;
  discordWebhookUrl: boolean;
  gameLevel?: number | null;
  playerLevel?: number | null;
  gameXp?: number | null;
  raider_identity?: {
    metaforge_id?: string;
  };
}

// Auth state machine
type AuthState =
  | 'checking'
  | 'no_user'
  | 'needs_token'
  | 'token_pending'
  | 'linked'
  | 'error';

interface PlayerData {
  profile: any;
  playerStats: PlayerStats | null;
  raiderHub: any;
  tradeCenter: any;
  progression: any;
  commandCenter: any;
  stash: any;
  stats: any;
  combatBreakdown: any;
  rounds: any[];
  hideout: any;
  loadout: any;
  blueprints: any;
  quests: any;
  projects: any;
  /** Current expedition/season tier progress from ArcTracker */
  expeditionStatus: ExpeditionStatus | null;
  /** Lifetime enemy kill totals per type. { enemies: [{ targetId, name, count }], source } */
  enemyKills: any;
  /** Pre-aggregated per-map stats. { maps: [{ mapTargetId, mapName, raids, extracted, totalDurationMs, totalNetValue, survivalRate, avgDurationMs, avgNetValue }], source } */
  mapPerformance: any;
  /** Lifetime weapon kill totals per weapon. { weapons: [{ weaponAssetId, itemId, name, count }], source } */
  weaponKills: any;
  isLoading: boolean;
  error: string | null;
  authState: AuthState;
  hasToken: boolean;
  isLinked: boolean;
  apiUnreachable: boolean;
  tokenStatus: {
    hasPendingToken: boolean;
    hasWorkingEndpoint: boolean;
  } | null;
  lastSyncedAt: string | null;
  nextSyncAt: string | null;
  syncCountdownMs: number | null;
  tokenExpiresAt: string | null;
  reauthRequired: boolean;
  reauthCountdownMs: number | null;
  /** MetaForge player ID stored in user settings — used for raider stats lookups */
  metaforgeId: string | null;
}

interface PlayerContextType extends PlayerData {
  refresh: () => Promise<void>;
  linkToken: () => Promise<any>;
  updateSettings: (settings: any) => Promise<any>;
  extensionInstalled: boolean;
  startPlatformAuth: (
    platform: string,
  ) => Promise<{ success: boolean; error?: string }>;
  extensionVersion: string | null;
  clearAuthState: (reason?: string) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PlayerData>({
    profile: null,
    playerStats: null,
    raiderHub: null,
    tradeCenter: null,
    progression: null,
    commandCenter: null,
    stash: null,
    stats: null,
    combatBreakdown: null,
    rounds: [],
    hideout: null,
    loadout: null,
    blueprints: null,
    quests: null,
    projects: null,
    expeditionStatus: null,
    enemyKills: null,
    mapPerformance: null,
    weaponKills: null,
    isLoading: true,
    error: null,
    authState: 'checking',
    hasToken: false,
    isLinked: false,
    apiUnreachable: false,
    tokenStatus: null,
    lastSyncedAt: null,
    nextSyncAt: null,
    syncCountdownMs: null,
    tokenExpiresAt: null,
    reauthRequired: false,
    reauthCountdownMs: null,
    metaforgeId: null,
  });

  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [extensionVersion, setExtensionVersion] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setData((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Step 1: Check Discord auth
      const user = await AuthAPI.user();
      if (!user) {
        setData((prev) => ({
          ...prev,
          isLoading: false,
          authState: 'no_user',
          profile: null,
        }));
        return;
      }

      // Step 2: Check extension token status
      let extStatus;
      try {
        extStatus = await ExtensionAPI.status();
      } catch {
        extStatus = {
          linked: false,
          hasPendingToken: false,
          hasWorkingEndpoint: false,
        };
      }

      // If the user already has an embarkId on their profile, they're linked —
      // no need to wait for a fresh CapturedToken in the DB.
      if (user.embarkId) {
        extStatus = { ...extStatus, linked: !extStatus.reauthRequired };
      }

      // Determine auth state
      let authState: AuthState = 'checking';
      if (extStatus.linked) {
        authState = 'linked';
      } else if (extStatus.hasPendingToken) {
        authState = 'token_pending';
      } else {
        authState = 'needs_token';
      }

      // If not linked, show appropriate state without trying Embark APIs
      if (!extStatus.linked) {
        setData((prev) => ({
          ...prev,
          profile: user,
          isLoading: false,
          authState,
          hasToken: extStatus.hasPendingToken || false,
          isLinked: false,
          apiUnreachable: false,
          tokenStatus: {
            hasPendingToken: extStatus.hasPendingToken || false,
            hasWorkingEndpoint: extStatus.hasWorkingEndpoint || false,
          },
          lastSyncedAt: extStatus.lastSyncedAt || null,
          nextSyncAt: extStatus.nextSyncAt || null,
          syncCountdownMs: extStatus.nextSyncAt
            ? Math.max(0, new Date(extStatus.nextSyncAt).getTime() - Date.now())
            : null,
          tokenExpiresAt: extStatus.tokenExpiresAt || null,
          reauthRequired: !!extStatus.reauthRequired,
          reauthCountdownMs: extStatus.tokenExpiresAt
            ? Math.max(0, new Date(extStatus.tokenExpiresAt).getTime() - Date.now())
            : null,
        }));
        return;
      }

      // Step 3: Token is linked — load consolidated Hub data
      const fetchHub = (path: string) =>
        fetch(`${BASE_URL}${path}`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        }).then(async (res) => {
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Fetch failed: ${res.status}`);
          }
          return res.json();
        });

      const results = await Promise.allSettled([
        PlayerAPI.me(),
        fetchHub('/api/player/raider-hub'),
        fetchHub('/api/player/progression'),
        fetchHub('/api/player/command-center'),
        fetchHub('/api/marketplace/trade-center'),
      ]);

      const [
        playerMe,
        raiderHub,
        progression,
        commandCenter,
        tradeCenter,
      ] = results;

      // Check for token/auth errors
      const hasAuthError = results.some((r) => {
        if (r.status !== 'rejected') return false;
        const msg = r.reason?.message || '';
        return (
          msg.includes('No valid token') ||
          msg.includes('Token expired') ||
          msg.includes('Discord login required')
        );
      });

      if (hasAuthError) {
        setData((prev) => ({
          ...prev,
          profile: user,
          isLoading: false,
          authState: 'needs_token',
          hasToken: false,
          isLinked: false,
          apiUnreachable: false,
          error:
            'Token expired or invalid. Re-launch ARC Raiders with the extension active.',
        }));
        return;
      }

      // Detect if API is unreachable (503 from server)
      const isUnreachable = results.some(
        (r) => r.status === 'rejected' && r.reason?.unreachable === true,
      );

      // Only surface errors from critical endpoints (avoid sticky banners when
      // optional panels fail, e.g. marketplace/trade-center)
      const criticalErrors: string[] = [];
      if (playerMe.status === 'rejected') {
        criticalErrors.push(
          playerMe.reason?.message || 'Failed to load profile',
        );
      }
      if (raiderHub.status === 'rejected') {
        criticalErrors.push(
          raiderHub.reason?.message || 'Failed to load dashboard hub',
        );
      }
      const firstError = criticalErrors.length > 0 ? criticalErrors[0] : null;

      setData(
        (prev: PlayerData): PlayerData => ({
          ...prev,
          profile: user,
          playerStats: playerMe.status === 'fulfilled' ? playerMe.value : null,
          raiderHub: raiderHub.status === 'fulfilled' ? raiderHub.value : null,
          progression:
            progression.status === 'fulfilled' ? progression.value : null,
          commandCenter:
            commandCenter.status === 'fulfilled' ? commandCenter.value : null,
          tradeCenter:
            tradeCenter.status === 'fulfilled' ? tradeCenter.value : null,
          stash:
            raiderHub.status === 'fulfilled' &&
            Array.isArray(raiderHub.value?.stashItems)
              ? {
                  items: raiderHub.value.stashItems,
                  currencies: raiderHub.value.currencies,
                }
              : null,
          stats:
            raiderHub.status === 'fulfilled'
              ? raiderHub.value.combatSummary
              : null,
          combatBreakdown:
            raiderHub.status === 'fulfilled'
              ? raiderHub.value.combatSummary
              : null,
          rounds:
            raiderHub.status === 'fulfilled'
              ? raiderHub.value.recentRounds
              : [],
          hideout:
            raiderHub.status === 'fulfilled' ? raiderHub.value.hideout : null,
          loadout:
            raiderHub.status === 'fulfilled' ? raiderHub.value.loadout : null,
          blueprints:
            raiderHub.status === 'fulfilled' && raiderHub.value.blueprints
              ? raiderHub.value.blueprints
              : null,
          quests:
            raiderHub.status === 'fulfilled' ? raiderHub.value.quests : null,
          projects:
            raiderHub.status === 'fulfilled' ? raiderHub.value.projects : null,
          expeditionStatus:
            raiderHub.status === 'fulfilled' && raiderHub.value?.expeditionStatus
              ? (raiderHub.value.expeditionStatus as ExpeditionStatus)
              : null,
          enemyKills:
            raiderHub.status === 'fulfilled' && raiderHub.value?.enemyKills
                ? raiderHub.value.enemyKills
                : null,
          mapPerformance:
            raiderHub.status === 'fulfilled' && raiderHub.value?.mapPerformance
                ? raiderHub.value.mapPerformance
                : null,
          weaponKills:
            raiderHub.status === 'fulfilled' && raiderHub.value?.weaponKills
                ? raiderHub.value.weaponKills
                : null,
          metaforgeId:
            commandCenter.status === 'fulfilled'
              ? (commandCenter.value?.settings?.metaforgeId ?? null)
              : null,
          isLoading: false,
          error: firstError,
          authState: 'linked',
          hasToken: true,
          isLinked: true,
          apiUnreachable: isUnreachable,
          tokenStatus: {
            hasPendingToken: false,
            hasWorkingEndpoint: extStatus.hasWorkingEndpoint || false,
          },
          lastSyncedAt: extStatus.lastSyncedAt || null,
          nextSyncAt: extStatus.nextSyncAt || null,
          syncCountdownMs: extStatus.nextSyncAt
            ? Math.max(0, new Date(extStatus.nextSyncAt).getTime() - Date.now())
            : null,
          tokenExpiresAt: extStatus.tokenExpiresAt || null,
          reauthRequired: !!extStatus.reauthRequired,
          reauthCountdownMs: extStatus.tokenExpiresAt
            ? Math.max(0, new Date(extStatus.tokenExpiresAt).getTime() - Date.now())
            : null,
        }),
      );
    } catch (err: any) {
      console.error('[PlayerContext] Sync error:', err);
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Failed to load player data',
        authState: 'error',
      }));
    }
  }, []);

  const linkToken = useCallback(async () => {
    try {
      const result = await ExtensionAPI.link();
      if (
        result &&
        (result.status === 'linked' || result.status === 'already_linked')
      ) {
        await loadData();
      }
      return result;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to link token');
    }
  }, [loadData]);

  const startPlatformAuth = useCallback(async (platform: string) => {
    const result = await startEmbarkAuth(platform);
    return result;
  }, []);

  const updateSettings = useCallback(async (settings: any) => {
    try {
      const res = await fetch(`${BASE_URL}/api/player/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save settings');
      }

      const result = await res.json();

      setData((prev: PlayerData): PlayerData => {
        const currentSettings = prev.commandCenter?.settings || {};
        const newSettings = { ...currentSettings, ...result.settings };

        return {
          ...prev,
          metaforgeId: newSettings.metaforgeId ?? prev.metaforgeId,
          commandCenter: {
            ...prev.commandCenter,
            settings: newSettings,
            xbox: prev.commandCenter?.xbox || { connected: false },
          },
        };
      });

      setTimeout(() => {
        loadData();
      }, 500);

      return result;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to save settings');
    }
  }, []);

  // Detect extension on mount
  useEffect(() => {
    const checkExtension = async () => {
      const status = await pingExtension();
      setExtensionInstalled(status.installed);
      if (status.version) setExtensionVersion(status.version);
    };
    checkExtension();

    // Listen for extension ready events
    const cleanupReady = onExtensionReady((data) => {
      setExtensionInstalled(true);
      setExtensionVersion(data.version);
    });

    return () => {
      cleanupReady();
    };
  }, []);

  // Handle OAuth token exchange (shared by URL check and extension message)
  const handleOAuthExchange = useCallback(
    async (oauthData: { code: string; state: string }) => {
      // Get PKCE verifier from extension
      const pkce = await getPKCEVerifier(oauthData.state);
      if (!pkce) {
        console.error(
          '[PlayerContext] PKCE verifier not found for state:',
          oauthData.state,
        );
        return;
      }

      // Exchange code for token via backend
      try {
        const res = await fetch('/api/embark/token-exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            code: oauthData.code,
            codeVerifier: pkce.codeVerifier,
            platform: pkce.platform,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('[PlayerContext] Token exchange failed:', err.error);
          return;
        }

        const result = await res.json();
        const extensionSession = await checkEmbarkSession().catch(() => null);
        const extensionEmbarkUserId =
          extensionSession?.session?.embarkUserId || null;
        const extensionProfile = extensionSession?.profile || null;

        // Send token to extension for storage
        if (result.token) {
          await notifyTokenExchanged({
            token: result.token,
            embarkUserId: extensionEmbarkUserId,
            profile: extensionProfile,
          }).catch(() => false);

          await fetch('/api/extension/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              token: result.token,
              source: pkce.platform,
              embarkUserId: extensionEmbarkUserId,
              profile: extensionProfile,
            }),
          });
        }

        // Clean up the URL (remove OAuth params)
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);

        // Refresh data
        await loadData();
      } catch (err: any) {
        console.error('[PlayerContext] Token exchange error:', err.message);
      }
    },
    [loadData],
  );

  // Check URL for OAuth callback on mount (content script fires before React loads)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('embark_oauth_callback') === '1') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (code && state) {
        handleOAuthExchange({ code, state });
      }
    }
  }, [handleOAuthExchange]);

  // Listen for OAuth callbacks from extension messages
  useEffect(() => {
    const cleanup = onOAuthCallback(async (oauthData) => {
      await handleOAuthExchange(oauthData);
    });

    return () => cleanup();
  }, [handleOAuthExchange]);

  // Clears all user state and redirects with an optional reason param
  const clearAuthState = useCallback((reason?: string) => {
    setData({
      profile: null,
      playerStats: null,
      raiderHub: null,
      tradeCenter: null,
      progression: null,
      commandCenter: null,
      stash: null,
      stats: null,
      combatBreakdown: null,
      rounds: [],
      hideout: null,
      loadout: null,
      blueprints: null,
      quests: null,
      projects: null,
      expeditionStatus: null,
      enemyKills: null,
      mapPerformance: null,
      weaponKills: null,
      isLoading: false,
      error: null,
      authState: 'no_user',
      hasToken: false,
      isLinked: false,
      apiUnreachable: false,
      tokenStatus: null,
      lastSyncedAt: null,
      nextSyncAt: null,
      syncCountdownMs: null,
      tokenExpiresAt: null,
      reauthRequired: false,
      reauthCountdownMs: null,
      metaforgeId: null,
    });
    if (reason) {
      window.location.href = `/?${reason}=1`;
    }
  }, []);

  // Initial data load — background poll every 30 min, but only re-render if data changed
  const lastHashRef = React.useRef<string>('');
  useEffect(() => {
    loadData();
    const interval = setInterval(async () => {
      // Skip polling entirely when not authenticated
      if (data.authState === 'no_user') return;

      // Quietly fetch a lightweight sentinel to check if data changed before
      // triggering a full re-render. Avoids the visible "refresh" every 60s.
      try {
        const res = await fetch(`${BASE_URL}/api/player/me`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        // Session expired mid-session — force re-auth
        if (res.status === 401) {
          const body = await res.json().catch(() => ({}));
          if (body.expired) {
            clearAuthState('expired');
            return;
          }
          clearAuthState('error');
          return;
        }
        if (!res.ok) return;
        const fresh = await res.json();
        const hash = JSON.stringify(fresh?.xp) + JSON.stringify(fresh?.level);
        if (hash !== lastHashRef.current) {
          lastHashRef.current = hash;
          loadData();
        }
      } catch {
        // network blip — skip this tick
      }
    }, 1800000);
    return () => clearInterval(interval);
  }, [loadData, data.authState, clearAuthState]);

  useEffect(() => {
    const tick = () => {
      setData((prev) => {
        const syncCountdownMs = prev.nextSyncAt
          ? Math.max(0, new Date(prev.nextSyncAt).getTime() - Date.now())
          : null;
        const reauthCountdownMs = prev.tokenExpiresAt
          ? Math.max(0, new Date(prev.tokenExpiresAt).getTime() - Date.now())
          : null;

        if (
          syncCountdownMs === prev.syncCountdownMs &&
          reauthCountdownMs === prev.reauthCountdownMs
        ) {
          return prev;
        }

        return {
          ...prev,
          syncCountdownMs,
          reauthCountdownMs,
          reauthRequired:
            prev.reauthRequired || (reauthCountdownMs !== null && reauthCountdownMs <= 0),
        };
      });
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        ...data,
        refresh: loadData,
        linkToken,
        updateSettings,
        extensionInstalled,
        startPlatformAuth,
        extensionVersion,
        clearAuthState,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within PlayerProvider');
  return context;
}
