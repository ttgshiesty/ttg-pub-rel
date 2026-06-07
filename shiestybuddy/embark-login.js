/**
 * RaiderBuddy Embark Connector - Login Redirect Handler
 *
 * This script runs on id.embark.games/api/auth/login pages as a fallback
 * when the background service worker couldn't get the redirect URL directly.
 *
 * It asks the background script to handle the redirect.
 */

// Extract platform from URL
const urlParams = new URLSearchParams(window.location.search);
const platform = urlParams.get('provider') || 'steam';

// Tell background script we're on the login page
// Background will handle getting the redirect URL
chrome.runtime.sendMessage(
  {
    type: 'ON_LOGIN_PAGE',
    platform: platform,
    url: window.location.href,
  },
  (response) => {
    if (response && response.redirectUrl) {
      window.location.href = response.redirectUrl;
    }
  },
);
