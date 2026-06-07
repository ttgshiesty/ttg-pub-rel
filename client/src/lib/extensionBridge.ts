/**
 * SHiESTYBUDDY Extension Bridge
 * Handles communication with the shiestybuddy Chrome extension for OAuth PKCE flow
 */

const EXTENSION_SOURCE = 'shiestyraider-web';
const EXTENSION_TARGET = 'shiestyraider-extension';

export interface ExtensionStatus {
  installed: boolean;
  version?: string;
  hasSession: boolean;
  platform?: string;
}

export interface EmbarkSession {
  session: {
    embarkUserId: string;
    accessToken: string;
    accessTokenExpires?: string;
    refreshToken?: string;
  };
  profile?: {
    displayName: string;
    displayNameDiscriminator?: string;
    email?: string;
    countryCode?: string;
  };
}

/**
 * Ping the extension to check if it's installed
 */
export async function pingExtension(): Promise<ExtensionStatus> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ installed: false, hasSession: false });
    }, 1000);

    const handler = (event: MessageEvent) => {
      if (
        event.data?.source === EXTENSION_TARGET &&
        event.data?.type === 'PONG'
      ) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        resolve({
          installed: true,
          version: event.data.data?.version,
          hasSession: false,
        });
      }
    };

    window.addEventListener('message', handler);
    window.postMessage({ source: EXTENSION_SOURCE, type: 'PING' }, '*');
  });
}

/**
 * Start Embark OAuth flow with selected platform (steam, epic, playstation, xbox)
 */
export async function startEmbarkAuth(
  platform: string,
  returnUrl?: string,
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({
        success: false,
        error: 'Extension timeout - not installed or unresponsive',
      });
    }, 5000);

    const handler = (event: MessageEvent) => {
      if (event.data?.source !== EXTENSION_TARGET) return;

      if (event.data?.type === 'EMBARK_AUTH_STARTED') {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        resolve({ success: true });
      }

      if (event.data?.type === 'EMBARK_AUTH_ERROR') {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        resolve({
          success: false,
          error: event.data.data?.error || 'Auth failed',
        });
      }
    };

    window.addEventListener('message', handler);
    window.postMessage(
      {
        source: EXTENSION_SOURCE,
        type: 'START_EMBARK_AUTH',
        platform,
        returnUrl: returnUrl || window.location.href,
      },
      '*',
    );
  });
}

/**
 * Check if the extension has a stored Embark session
 */
export async function checkEmbarkSession(): Promise<EmbarkSession | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(null);
    }, 2000);

    const handler = (event: MessageEvent) => {
      if (
        event.data?.source === EXTENSION_TARGET &&
        event.data?.type === 'EMBARK_SESSION_STATUS'
      ) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        if (event.data.data?.success && event.data.data?.data) {
          resolve(event.data.data.data as EmbarkSession);
        } else {
          resolve(null);
        }
      }
    };

    window.addEventListener('message', handler);
    window.postMessage(
      { source: EXTENSION_SOURCE, type: 'CHECK_EMBARK_SESSION' },
      '*',
    );
  });
}

/**
 * Get the PKCE verifier for token exchange
 */
export async function getPKCEVerifier(
  state: string,
): Promise<{ codeVerifier: string; platform: string } | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(null);
    }, 3000);

    const handler = (event: MessageEvent) => {
      if (
        event.data?.source === EXTENSION_TARGET &&
        event.data?.type === 'PKCE_VERIFIER_RESPONSE'
      ) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        if (event.data.data?.success) {
          resolve({
            codeVerifier: event.data.data.codeVerifier,
            platform: event.data.data.platform,
          });
        } else {
          resolve(null);
        }
      }
    };

    window.addEventListener('message', handler);
    window.postMessage(
      { source: EXTENSION_SOURCE, type: 'GET_PKCE_VERIFIER', state },
      '*',
    );
  });
}

/**
 * Listen for OAuth callbacks from the extension
 */
export function onOAuthCallback(
  callback: (data: { code: string; state: string }) => void,
): () => void {
  const handler = (event: MessageEvent) => {
    if (
      event.data?.source === EXTENSION_TARGET &&
      event.data?.type === 'EMBARK_OAUTH_CALLBACK'
    ) {
      callback(event.data.data);
    }
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

/**
 * Listen for extension ready event
 */
export function onExtensionReady(
  callback: (data: { version: string }) => void,
): () => void {
  const handler = (event: MessageEvent) => {
    if (
      event.data?.source === EXTENSION_TARGET &&
      event.data?.type === 'EXTENSION_READY'
    ) {
      callback(event.data.data);
    }
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

/**
 * Clear stored Embark data from extension
 */
export async function clearEmbarkData(): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false);
    }, 2000);

    const handler = (event: MessageEvent) => {
      if (
        event.data?.source === EXTENSION_TARGET &&
        event.data?.type === 'EMBARK_DATA_CLEARED'
      ) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        resolve(event.data.data?.success || false);
      }
    };

    window.addEventListener('message', handler);
    window.postMessage(
      { source: EXTENSION_SOURCE, type: 'CLEAR_EMBARK_DATA' },
      '*',
    );
  });
}

/**
 * Request the stored Embark token from the extension for Auto-Sync
 * This "shouts" the token from the extension vault to the website
 */
export async function requestEmbarkToken(): Promise<{
  success: boolean;
  token?: string;
  embarkUserId?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({
        success: false,
        error: 'Extension timeout — no token received',
      });
    }, 5000);

    const handler = (event: MessageEvent) => {
      if (
        event.data?.source === EXTENSION_TARGET &&
        event.data?.type === 'DELIVER_EMBARK_TOKEN'
      ) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        resolve(event.data.data);
      }
    };

    window.addEventListener('message', handler);
    window.postMessage(
      { source: EXTENSION_SOURCE, type: 'REQUEST_EMBARK_TOKEN' },
      '*',
    );
  });
}

/**
 * Tell the extension the server-side OAuth exchange succeeded, and give it the
 * real access token so future extension syncs do not store a placeholder.
 */
export async function notifyTokenExchanged(data: {
  token: string;
  embarkUserId?: string | null;
  profile?: EmbarkSession['profile'] | null;
}): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false);
    }, 3000);

    const handler = (event: MessageEvent) => {
      if (
        event.data?.source === EXTENSION_TARGET &&
        event.data?.type === 'TOKEN_EXCHANGE_ACKNOWLEDGED'
      ) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        resolve(!!event.data.data?.success);
      }
    };

    window.addEventListener('message', handler);
    window.postMessage(
      {
        source: EXTENSION_SOURCE,
        type: 'NOTIFY_TOKEN_EXCHANGED',
        token: data.token,
        embarkUserId: data.embarkUserId || null,
        profile: data.profile || null,
      },
      '*',
    );
  });
}

// Supported platforms for Embark OAuth
export const SUPPORTED_PLATFORMS = [
  { id: 'steam', name: 'Steam', color: '#1b2838' },
  { id: 'epic', name: 'Epic Games', color: '#ffffff' },
  { id: 'playstation', name: 'PlayStation', color: '#003791' },
  { id: 'xbox', name: 'Xbox', color: '#107c10' },
] as const;
