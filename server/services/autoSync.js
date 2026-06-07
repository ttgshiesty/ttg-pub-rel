import cron from 'node-cron';
import { AutoSyncSettings } from '../models/AutoSyncSettings.js';
import { SyncData } from '../models/SyncData.js';
import { User } from '../models/User.js';
import { UserDataAPI } from './userDataApi.js';

const DEFAULT_SCAN_CRON = process.env.AUTO_SYNC_SCAN_CRON || '0 * * * *';
const DEFAULT_INTERVAL_MINUTES = Number.parseInt(
  process.env.AUTO_SYNC_INTERVAL_MINUTES || '60',
  10,
);

let task = null;
let inFlight = false;

// Rate limiting and circuit breaker
const API_FAILURE_COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown after failures
const MAX_CONSECUTIVE_FAILURES = 3;
const apiFailureMap = new Map(); // userId -> { failures: number, lastFailure: Date }

function isApiRateLimited(userId) {
  const failure = apiFailureMap.get(userId);
  if (!failure) return false;

  const now = new Date();
  const timeSinceLastFailure = now.getTime() - failure.lastFailure.getTime();

  // If still in cooldown period
  if (
    timeSinceLastFailure < API_FAILURE_COOLDOWN &&
    failure.failures >= MAX_CONSECUTIVE_FAILURES
  ) {
    return true;
  }

  // Reset if cooldown period has passed
  if (timeSinceLastFailure >= API_FAILURE_COOLDOWN) {
    apiFailureMap.delete(userId);
    return false;
  }

  return false;
}

function recordApiFailure(userId) {
  const failure = apiFailureMap.get(userId) || {
    failures: 0,
    lastFailure: new Date(),
  };
  failure.failures += 1;
  failure.lastFailure = new Date();
  apiFailureMap.set(userId, failure);
}

function recordApiSuccess(userId) {
  apiFailureMap.delete(userId);
}

// Periodic cleanup to prevent unbounded growth of the failure map.
// Removes entries whose cooldown has expired (no longer relevant).
function cleanupApiFailureMap() {
  const now = Date.now();
  for (const [userId, failure] of apiFailureMap.entries()) {
    if (now - failure.lastFailure.getTime() >= API_FAILURE_COOLDOWN) {
      apiFailureMap.delete(userId);
    }
  }
}

function shouldRun(settings, now) {
  if (!settings.enabled) return false;
  if (settings.source === 'extension') return false;
  if (settings.nextSyncAt && settings.nextSyncAt > now) return false;

  // Check if user is rate limited due to API failures
  if (isApiRateLimited(settings.userId)) {
    console.log(
      `[AutoSync] User ${settings.userId} is rate limited due to API failures`,
    );
    return false;
  }

  return true;
}

async function syncArcTrackerUser(settings, now) {
  try {
    const user = await User.findOne({ id: settings.userId })
      .select('+arctrackerUserKey +embarkId')
      .lean();

    if (!user?.arctrackerUserKey) {
      await AutoSyncSettings.updateOne(
        { userId: settings.userId },
        {
          $set: {
            lastErrorMessage: 'ArcTracker key not linked',
            lastErrorAt: now,
            nextSyncAt: new Date(
              now.getTime() +
                (settings.intervalMinutes || DEFAULT_INTERVAL_MINUTES) *
                  60 *
                  1000,
            ),
          },
          $inc: { consecutiveFailures: 1 },
        },
      );
      return;
    }

    // Store embarkId in sync settings for tracking by embark ID
    if (user?.embarkId && !settings.embarkId) {
      await AutoSyncSettings.updateOne(
        { userId: settings.userId },
        { $set: { embarkId: user.embarkId } },
      );
    }

    // Add timeout to prevent hanging API calls
    const stashPromise = UserDataAPI.getStash(settings.userId);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('API timeout after 30 seconds')),
        30000,
      ),
    );

    const stash = await Promise.race([stashPromise, timeoutPromise]);
    const syncedAt = new Date();

    // Record successful API call
    recordApiSuccess(settings.userId);

    await SyncData.updateOne(
      { userId: settings.userId, source: 'arctracker_stash' },
      {
        $set: {
          userId: settings.userId,
          source: 'arctracker_stash',
          payload: stash || {},
          syncedAt,
        },
      },
      { upsert: true },
    );

    await SyncData.updateOne(
      { userId: settings.userId, source: 'extension_stash' },
      {
        $set: {
          userId: settings.userId,
          source: 'extension_stash',
          payload: stash || {},
          syncedAt,
        },
      },
      { upsert: true },
    );

    await AutoSyncSettings.updateOne(
      { userId: settings.userId },
      {
        $set: {
          lastSyncedAt: syncedAt,
          nextSyncAt: new Date(
            syncedAt.getTime() +
              (settings.intervalMinutes || DEFAULT_INTERVAL_MINUTES) *
                60 *
                1000,
          ),
          consecutiveFailures: 0,
          lastErrorMessage: null,
          lastErrorAt: null,
        },
      },
    );
  } catch (err) {
    // Record API failure for rate limiting
    recordApiFailure(settings.userId);

    console.error(
      `[AutoSync] Sync failed for user ${settings.userId}:`,
      err.message,
    );

    // Update settings with error info and longer cooldown for failures
    const cooldownMinutes = Math.min(
      (settings.intervalMinutes || DEFAULT_INTERVAL_MINUTES) * 2, // Double the normal interval
      240, // Max 4 hours
    );

    await AutoSyncSettings.updateOne(
      { userId: settings.userId },
      {
        $set: {
          lastErrorMessage: err.message,
          lastErrorAt: now,
          nextSyncAt: new Date(now.getTime() + cooldownMinutes * 60 * 1000),
        },
        $inc: { consecutiveFailures: 1 },
      },
    );
  }
}

export async function runAutoSyncOnce() {
  if (inFlight) {
    console.log('[AutoSync] Sync already in flight, skipping');
    return;
  }

  inFlight = true;
  const now = new Date();
  const startTime = Date.now();

  try {
    // Purge stale failure entries to prevent map from growing unbounded
    cleanupApiFailureMap();

    console.log(`[AutoSync] Starting sync run at ${now.toISOString()}`);

    const settingsRows = await AutoSyncSettings.find({ enabled: true }).lean();
    console.log(
      `[AutoSync] Found ${settingsRows.length} enabled sync settings`,
    );

    // Process users in parallel with a limit to prevent overwhelming the API
    const CONCURRENT_SYNC_LIMIT = 3;
    const chunks = [];
    for (let i = 0; i < settingsRows.length; i += CONCURRENT_SYNC_LIMIT) {
      chunks.push(settingsRows.slice(i, i + CONCURRENT_SYNC_LIMIT));
    }

    for (const chunk of chunks) {
      const syncPromises = chunk.map(async (settings) => {
        if (!shouldRun(settings, now)) {
          return {
            userId: settings.userId,
            status: 'skipped',
            reason: 'shouldRun returned false',
          };
        }

        try {
          await syncArcTrackerUser(settings, now);
          return { userId: settings.userId, status: 'success' };
        } catch (err) {
          console.error(
            `[AutoSync] Individual sync failed for ${settings.userId}:`,
            err.message,
          );
          // Error handling is now done inside syncArcTrackerUser
          return {
            userId: settings.userId,
            status: 'failed',
            error: err.message,
          };
        }
      });

      // Wait for this chunk to complete before processing the next
      await Promise.allSettled(syncPromises);
    }

    const duration = Date.now() - startTime;
    console.log(`[AutoSync] Sync run completed in ${duration}ms`);
  } catch (err) {
    console.error('[AutoSync] Critical error in sync run:', err);
  } finally {
    inFlight = false;
    const totalDuration = Date.now() - startTime;
    console.log(`[AutoSync] Sync process released after ${totalDuration}ms`);
  }
}

export function startAutoSyncService() {
  if (task) return task;
  task = cron.schedule(DEFAULT_SCAN_CRON, () => {
    runAutoSyncOnce().catch((err) => {
      console.error('[AutoSync] Scheduled run failed:', err.message);
    });
  });
  console.info(`[AutoSync] Service scheduled with ${DEFAULT_SCAN_CRON}`);
  return task;
}
