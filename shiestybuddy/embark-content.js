/**
 * RaiderBuddy Embark Connector - Embark Content Script
 *
 * This script runs on id.embark.games pages and:
 * 1. Detects when user is logged in
 * 2. Fetches session and profile data (including the accessToken)
 * 3. Sends it to the background script
 *
 * The accessToken is the key - it's the temporary token that allows
 * fetching inventory data, statistics, etc. from Embark's API.
 */

// Skip if we're on the login API endpoint (handled by embark-login.js)
if (window.location.pathname.startsWith('/api/auth/login')) {
  // This is the login endpoint, skip
} else {
  initEmbarkCapture();
}

function initEmbarkCapture() {
  /**
   * Fetch session data from Embark API
   * The session contains the accessToken which is the key to fetching game data
   */
  async function fetchEmbarkSession() {
    try {
      const response = await fetch('https://id.embark.games/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      // Check if session is valid
      if (!data.embarkUserId || !data.accessToken) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetch profile data from Embark API
   * Try multiple endpoints/methods as fallback
   */
  async function fetchEmbarkProfile() {
    // Small delay to ensure page is fully rendered
    await new Promise((r) => setTimeout(r, 500));

    // Try GET first (some APIs prefer this)
    try {
      const response = await fetch('https://id.embark.games/api/profile', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      // GET /api/profile failed
    }

    // Try to extract display name from the page DOM as fallback
    try {
      // Look for the discriminator span (contains #1234)
      const discriminatorEl = document.querySelector(
        '[class*="displayNameDiscriminator"]',
      );
      if (discriminatorEl) {
        const discriminatorText = discriminatorEl.textContent?.trim();

        // The display name is in the parent element, before the discriminator
        const parent = discriminatorEl.parentElement;
        if (parent) {
          // Get text content but exclude the discriminator
          const fullText = parent.textContent?.trim();
          const discriminator = discriminatorText?.replace('#', '') || '';
          const displayName = fullText
            ?.replace(discriminatorText || '', '')
            .trim();

          if (displayName) {
            return {
              displayName,
              displayNameDiscriminator: discriminator,
            };
          }
        }
      }

      // Fallback: look for any element containing the # pattern
      const allText = document.body.innerText;
      const nameMatch = allText.match(
        /Display name[:\s]*([A-Za-z0-9_]+)#(\d+)/i,
      );
      if (nameMatch) {
        return {
          displayName: nameMatch[1],
          displayNameDiscriminator: nameMatch[2],
        };
      }
    } catch (error) {
      // DOM extraction failed
    }

    return null;
  }

  /**
   * Check and send Embark data to background script
   */
  async function checkAndSendEmbarkData() {
    const session = await fetchEmbarkSession();
    if (!session) {
      chrome.runtime.sendMessage({ type: 'EMBARK_SESSION_NOT_FOUND' });
      return false;
    }

    const profile = await fetchEmbarkProfile();

    const embarkData = {
      session: {
        embarkUserId: session.embarkUserId,
        accessToken: session.accessToken,
        accessTokenExpires: session.accessTokenExpires,
        refreshToken: session.refreshToken || null,
      },
      profile: profile
        ? {
            displayName: profile.displayName,
            displayNameDiscriminator: profile.displayNameDiscriminator,
            email: profile.email,
            countryCode: profile.countryCode,
          }
        : null,
    };

    // Send to background script
    chrome.runtime.sendMessage({
      type: 'EMBARK_SESSION_FOUND',
      data: embarkData,
    });

    return true;
  }

  /**
   * Listen for messages from background script
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CHECK_EMBARK_SESSION') {
      checkAndSendEmbarkData().then((success) => {
        sendResponse({ received: true, success });
      });
      return true; // Keep channel open for async
    }

    return false;
  });

  // Check if we're on a page where the user is likely logged in (after OAuth completes)
  // The profile page can be at /profile, /id/profile, or similar paths
  const pathname = window.location.pathname;
  const isPostAuthPage =
    pathname.includes('/callback') ||
    pathname === '/' ||
    pathname.includes('/profile') || // Matches /profile, /id/profile, etc.
    pathname.includes('/id/'); // Any page under /id/ means user is logged in

  if (isPostAuthPage) {
    // Check immediately and again after delays to ensure we capture the session
    checkAndSendEmbarkData();
    setTimeout(checkAndSendEmbarkData, 1000);
    setTimeout(checkAndSendEmbarkData, 2500);
  } else {
    // Regular page, check after a delay
    setTimeout(checkAndSendEmbarkData, 1500);
  }
}
