/**
 * RaiderBuddy Embark Connector - Popup Script
 */

const loadingEl = document.getElementById('loading');
const connectedEl = document.getElementById('connected');
const disconnectedEl = document.getElementById('disconnected');
const embarkIdEl = document.getElementById('embarkId');
const errorMessageEl = document.getElementById('errorMessage');
const lastSyncedEl = document.getElementById('lastSynced');
const nextSyncEl = document.getElementById('nextSync');
const reauthTimerEl = document.getElementById('reauthTimer');
let timerInterval = null;

function formatRelative(timestamp) {
  if (!timestamp) return '-';
  const diffMs = Date.now() - Number(timestamp);
  if (diffMs < 0) return 'just now';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function formatCountdown(timestamp) {
  if (!timestamp) return '-';
  const diffMs = Number(timestamp) - Date.now();
  if (diffMs <= 0) return 'now';
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;
  if (hours > 0) return `${hours}h ${remainingMinutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

function startTimers(syncStatus) {
  if (timerInterval) clearInterval(timerInterval);

  const render = () => {
    if (lastSyncedEl) {
      lastSyncedEl.textContent = formatRelative(syncStatus?.lastSyncedAt);
    }
    if (nextSyncEl) {
      nextSyncEl.textContent = formatCountdown(syncStatus?.nextSyncAt);
    }
    if (reauthTimerEl) {
      const expired =
        syncStatus?.tokenExpiresAt && Number(syncStatus.tokenExpiresAt) <= Date.now();
      reauthTimerEl.textContent = expired
        ? 'required'
        : formatCountdown(syncStatus?.tokenExpiresAt);
      reauthTimerEl.classList.toggle('timer-warning', !!expired);
    }
  };

  render();
  timerInterval = setInterval(render, 1000);
}

/**
 * Show the appropriate UI based on connection status
 */
function showUI(status) {
  loadingEl.style.display = 'none';
  hideError();

  if (status === 'connected') {
    connectedEl.style.display = 'block';
    disconnectedEl.style.display = 'none';
  } else {
    connectedEl.style.display = 'none';
    disconnectedEl.style.display = 'block';
  }
}

/**
 * Show error message in the UI
 */
function showError(message) {
  if (errorMessageEl) {
    errorMessageEl.textContent = message;
    errorMessageEl.style.display = 'block';
  }
}

/**
 * Hide error message
 */
function hideError() {
  if (errorMessageEl) {
    errorMessageEl.style.display = 'none';
  }
}

/**
 * Check current Embark session status
 */
async function checkStatus() {
  try {
    hideError();
    const response = await chrome.runtime.sendMessage({
      type: 'GET_EMBARK_STATUS',
    });

    if (response.success && response.data?.session?.embarkUserId) {
      const { session, profile } = response.data;
      const syncStatus = response.data.syncStatus || {};

      // Format display name
      let displayName = session.embarkUserId;
      if (profile?.displayName) {
        displayName = profile.displayName;
        if (profile.displayNameDiscriminator) {
          displayName += '#' + profile.displayNameDiscriminator;
        }
      }

      embarkIdEl.textContent = displayName;
      startTimers(syncStatus);
      showUI('connected');
    } else {
      showUI('disconnected');
      if (response.error === 'REAUTH_REQUIRED') {
        showError('Re-auth required. Open Embark Login to refresh your token.');
      }
    }
  } catch (error) {
    showUI('disconnected');
  }
}

/**
 * Start Embark authentication
 */
async function startAuth(platform) {
  try {
    hideError();
    await chrome.runtime.sendMessage({
      type: 'START_EMBARK_AUTH',
      platform: platform,
    });

    // Close popup - auth will happen in new tab
    window.close();
  } catch (error) {
    showError('Failed to start authentication. Please try again.');
  }
}

/**
 * Open Embark ID portal directly
 */
function openEmbarkPortal() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTabId = tabs && tabs[0] && tabs[0].id;
    if (activeTabId) {
      chrome.tabs.update(activeTabId, { url: 'https://id.embark.games' });
    } else {
      chrome.tabs.create({ url: 'https://id.embark.games' });
    }
    window.close();
  });
}

/**
 * Disconnect Embark account
 */
async function disconnect() {
  try {
    await chrome.runtime.sendMessage({ type: 'CLEAR_EMBARK_DATA' });
    if (timerInterval) clearInterval(timerInterval);
    showUI('disconnected');
  } catch (error) {
    // Error disconnecting - still show disconnected UI
    showUI('disconnected');
  }
}

// Event listeners
document
  .getElementById('openPortalBtn')
  .addEventListener('click', openEmbarkPortal);
document
  .getElementById('checkStatusBtn')
  .addEventListener('click', checkStatus);
document.getElementById('refreshBtn').addEventListener('click', checkStatus);
document.getElementById('disconnectBtn').addEventListener('click', disconnect);

// Check status on popup open
checkStatus();
