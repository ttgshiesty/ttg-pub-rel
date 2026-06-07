/**
 * shiesty-buddy Embark Connector - Content Script
 *
 * This script runs on RaiderBuddy pages and:
 * 1. Listens for auth requests from the web app
 * 2. Communicates with the background script
 * 3. Sends Embark data back to the web app
 * 4. Handles OAuth callbacks by detecting URL parameters
 */

/**
 * Send message to background script
 */
function sendToBackground(message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(
            new Error(chrome.runtime.lastError.message || 'Unknown error'),
          );
        } else {
          resolve(response);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Send message to web page
 */
function sendToPage(type, data) {
  window.postMessage(
    {
      source: 'shiestyraider-extension',
      type,
      data,
    },
    '*',
  );
}

/**
 * Check if we're on an OAuth callback URL and handle it
 */
function checkForOAuthCallback() {
  const url = new URL(window.location.href);
  const isOAuthCallback = url.searchParams.get('embark_oauth_callback') === '1';

  if (isOAuthCallback) {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    if (error) {
      // OAuth error
      sendToPage('EMBARK_OAUTH_ERROR', {
        error,
        errorDescription,
      });
      return true;
    }

    if (code && state) {
      // Notify background that callback was received
      sendToBackground({
        type: 'OAUTH_CALLBACK_RECEIVED',
        code,
        state,
      }).catch(() => {});

      // Send the OAuth callback data to the web page
      // The frontend will request the PKCE verifier and exchange the code
      sendToPage('EMBARK_OAUTH_CALLBACK', {
        code,
        state,
      });
      return true;
    }
  }

  return false;
}

// Check for OAuth callback on load
const isOAuthCallback = checkForOAuthCallback();

/**
 * Listen for messages from the web page
 */
window.addEventListener('message', async (event) => {
  // Only accept messages from same window
  if (event.source !== window) return;

  // Only accept messages from RaiderBuddy
  if (event.data?.source !== 'shiestyraider-web') return;

  switch (event.data.type) {
    case 'START_EMBARK_AUTH':
      try {
        const response = await sendToBackground({
          type: 'START_EMBARK_AUTH',
          platform: event.data.platform || 'steam',
          returnUrl: event.data.returnUrl,
        });
        if (response && response.success !== false) {
          sendToPage('EMBARK_AUTH_STARTED', response);
        } else {
          sendToPage('EMBARK_AUTH_ERROR', {
            error: response?.error || 'Unknown error',
          });
        }
      } catch (error) {
        sendToPage('EMBARK_AUTH_ERROR', { error: error.message });
      }
      break;

    case 'CHECK_EMBARK_SESSION':
      try {
        const response = await sendToBackground({
          type: 'CHECK_EMBARK_SESSION',
        });
        sendToPage('EMBARK_SESSION_STATUS', response);
      } catch (error) {
        sendToPage('EMBARK_SESSION_STATUS', {
          success: false,
          error: error.message,
        });
      }
      break;

    case 'GET_EMBARK_STATUS':
      try {
        const response = await sendToBackground({ type: 'GET_EMBARK_STATUS' });
        sendToPage('EMBARK_STATUS_RESPONSE', response);
      } catch (error) {
        sendToPage('EMBARK_STATUS_RESPONSE', {
          success: false,
          error: error.message,
        });
      }
      break;

    case 'REQUEST_EMBARK_TOKEN':
      try {
        const response = await sendToBackground({ type: 'GET_EMBARK_STATUS' });
        const session = response?.data?.session;
        sendToPage('DELIVER_EMBARK_TOKEN', {
          success: !!session?.accessToken,
          token: session?.accessToken || null,
          embarkUserId: session?.embarkUserId || null,
          error: session ? null : 'No active Embark session',
        });
      } catch (error) {
        sendToPage('DELIVER_EMBARK_TOKEN', {
          success: false,
          error: error.message,
        });
      }
      break;

    case 'TRIGGER_SYNC_NOW':
      try {
        const response = await sendToBackground({ type: 'TRIGGER_SYNC_NOW' });
        sendToPage('SYNC_NOW_RESULT', response);
      } catch (error) {
        sendToPage('SYNC_NOW_RESULT', { success: false, error: error.message });
      }
      break;

    case 'SET_AUTO_SYNC':
      try {
        const response = await sendToBackground({
          type: 'SET_AUTO_SYNC',
          enabled: event.data.enabled,
        });
        sendToPage('AUTO_SYNC_SET', response);
      } catch (error) {
        sendToPage('AUTO_SYNC_SET', { success: false, error: error.message });
      }
      break;

    case 'CLEAR_EMBARK_DATA':
      try {
        const response = await sendToBackground({ type: 'CLEAR_EMBARK_DATA' });
        sendToPage('EMBARK_DATA_CLEARED', response);
      } catch (error) {
        sendToPage('EMBARK_DATA_CLEARED', {
          success: false,
          error: error.message,
        });
      }
      break;

    case 'PING':
      // Simple ping to check if extension is installed
      sendToPage('PONG', {
        installed: true,
        version: chrome.runtime.getManifest().version,
      });
      break;

    case 'GET_PKCE_VERIFIER':
      // Frontend is requesting the PKCE verifier for token exchange
      (async () => {
        const requestedState = event.data.state;

        try {
          const response = await sendToBackground({
            type: 'GET_PKCE_DATA',
            state: requestedState,
          });

          if (response && response.success) {
            sendToPage('PKCE_VERIFIER_RESPONSE', {
              success: true,
              codeVerifier: response.codeVerifier,
              platform: response.platform,
            });
          } else {
            sendToPage('PKCE_VERIFIER_RESPONSE', {
              success: false,
              error: response?.error || 'PKCE data not found',
            });
          }
        } catch (error) {
          sendToPage('PKCE_VERIFIER_RESPONSE', {
            success: false,
            error: error.message,
          });
        }
      })();
      break;

    case 'NOTIFY_TOKEN_EXCHANGED':
      // Frontend notifies that token exchange was successful
      (async () => {
        try {
          await sendToBackground({
            type: 'OAUTH_TOKEN_EXCHANGED',
            token: event.data.token,
            embarkUserId: event.data.embarkUserId,
            profile: event.data.profile,
          });
          sendToPage('TOKEN_EXCHANGE_ACKNOWLEDGED', { success: true });
        } catch (error) {
          sendToPage('TOKEN_EXCHANGE_ACKNOWLEDGED', {
            success: false,
            error: error.message,
          });
        }
      })();
      break;
  }
});

/**
 * Listen for messages from background script (auth success)
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EMBARK_AUTH_SUCCESS') {
    sendToPage('EMBARK_AUTH_SUCCESS', message.data);
    sendResponse({ received: true });
  }

  return false;
});

/**
 * Notify the page that the extension is ready
 */
sendToPage('EXTENSION_READY', {
  version: chrome.runtime.getManifest().version,
});
