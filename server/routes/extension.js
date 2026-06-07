import logger from '../utils/logger.js';
import express from 'express';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { CapturedToken } from '../models/CapturedToken.js';
import { SyncData } from '../models/SyncData.js'; // Import new model
import { AutoSyncSettings } from '../models/AutoSyncSettings.js';
import { User } from '../models/User.js';
import {
  deriveExpeditionStatus,
  normalizeInventorySnapshot,
  normalizeProgressSnapshot,
} from '../services/syncsnapshotnormalizer.js';
import { normalizeEmbarkStats } from '../services/statsMapping.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

async function bumpUserDataVersion() {
  try {
    const versionPath = path.resolve(__dirname, '../../version.json');
    const raw = await fs.readFile(versionPath, 'utf-8');
    const data = JSON.parse(raw);
    data.userDataVersion = String(Date.now());
    await fs.writeFile(versionPath, JSON.stringify(data, null, 2) + '\n');
    logger.info(`[Version] userDataVersion bumped to ${data.userDataVersion}`);
  } catch (err) {
    logger.error('[Version] Failed to bump userDataVersion:', err.message);
  }
}

function getTokenExpiresAt(tokenDoc) {
  if (!tokenDoc) return null;
  return (
    tokenDoc.expiresAt ||
    new Date(
      (tokenDoc.capturedAt || tokenDoc.linkedAt || new Date()).getTime() +
        TOKEN_MAX_AGE_MS,
    )
  );
}

function isTokenExpired(tokenDoc) {
  const expiresAt = getTokenExpiresAt(tokenDoc);
  return !!expiresAt && expiresAt.getTime() <= Date.now();
}

function getEmbarkUsername(profile) {
  if (!profile || typeof profile !== 'object') return null;
  const displayName =
    profile.displayName || profile.username || profile.name || profile.embarkUsername;
  if (!displayName) return null;
  const discriminator =
    profile.displayNameDiscriminator || profile.discriminator || null;
  return discriminator ? `${displayName}#${discriminator}` : String(displayName);
}

async function updateLinkedEmbarkUser(userId, { embarkUserId, profile, syncedAt } = {}) {
  if (!userId || userId === 'anonymous' || !embarkUserId) return;
  const embarkUsername = getEmbarkUsername(profile);
  await User.updateOne(
    { id: userId },
    {
      $set: {
        embarkId: String(embarkUserId),
        embarkLinked: true,
        ...(embarkUsername ? { embarkUsername, displayName: embarkUsername } : {}),
        ...(profile ? { metaForgeProfile: profile } : {}),
        lastSync: syncedAt || new Date(),
        syncError: null,
      },
      $addToSet: { platforms: 'embark' },
    },
  );
}

// POST /api/extension/token
// Receives token from the Chrome extension
router.post('/token', async (req, res) => {
  try {
    const { token, source, userAgent, embarkUserId, profile } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token required' });
    }

    // Hash token for deduplication
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Check for existing valid token with same hash
    const existing = await CapturedToken.findOne({ tokenHash, isValid: true });
    if (existing) {
      if (req.user?.id) {
        existing.userId = req.user.id;
        existing.linkedAt = existing.linkedAt || new Date();
      }
      existing.lastUsed = new Date();
      existing.expiresAt = new Date(Date.now() + TOKEN_MAX_AGE_MS);
      if (embarkUserId) existing.embarkUserId = String(embarkUserId);
      if (profile) existing.embarkProfile = profile;
      const embarkUsername = getEmbarkUsername(profile);
      if (embarkUsername) existing.embarkUsername = embarkUsername;
      await existing.save();
      await updateLinkedEmbarkUser(existing.userId, {
        embarkUserId: existing.embarkUserId,
        profile: existing.embarkProfile,
      });
      return res.json({
        status: 'already_linked',
        tokenId: existing._id,
        tokenExpiresAt: existing.expiresAt,
      });
    }

    // Create new token record
    const userId = req.user?.id || req.body.extensionId || 'anonymous';

    const tokenDoc = new CapturedToken({
      userId,
      token,
      tokenHash,
      source: source || 'unknown',
      isValid: true,
      userAgent: userAgent || req.headers['user-agent'],
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + TOKEN_MAX_AGE_MS),
      embarkUserId: embarkUserId ? String(embarkUserId) : undefined,
      embarkUsername: getEmbarkUsername(profile),
      embarkProfile: profile || null,
    });

    await tokenDoc.save();
    await updateLinkedEmbarkUser(userId, {
      embarkUserId: tokenDoc.embarkUserId,
      profile: tokenDoc.embarkProfile,
    });

    res.json({
      status: 'captured',
      tokenId: tokenDoc._id,
      tokenExpiresAt: tokenDoc.expiresAt,
    });
  } catch (err) {
    console.error('[Extension] Token capture error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/extension/link
// Links a captured token to an authenticated Discord user
router.post('/link', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Discord login required' });
    }

    const { tokenHash } = req.body || {};
    let tokenDoc;

    if (tokenHash) {
      tokenDoc = await CapturedToken.findOne({ tokenHash, isValid: true });
    } else {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      tokenDoc = await CapturedToken.findOne({
        userId: 'anonymous',
        ipAddress: req.ip,
        isValid: true,
        capturedAt: { $gte: fifteenMinsAgo },
      }).sort({ capturedAt: -1 });
    }

    if (!tokenDoc) {
      return res.status(404).json({ error: 'Token not found' });
    }

    tokenDoc.userId = req.user.id;
    tokenDoc.linkedAt = new Date();
    tokenDoc.expiresAt = new Date(Date.now() + TOKEN_MAX_AGE_MS);
    await tokenDoc.save();
    await updateLinkedEmbarkUser(req.user.id, {
      embarkUserId: tokenDoc.embarkUserId,
      profile: tokenDoc.embarkProfile,
    });

    res.json({
      status: 'linked',
      tokenId: tokenDoc._id,
      tokenExpiresAt: tokenDoc.expiresAt,
    });
  } catch (err) {
    console.error('[Extension] Link error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/extension/status
// Check if user has a linked token
router.get('/status', async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ linked: false, hasPendingToken: false });
    }

    // 1. Check for already linked token
    let token = await CapturedToken.findOne({
      userId: req.user.id,
      isValid: true,
    }).sort({ lastUsed: -1 });

    // 2. Fallback: Auto-link an anonymous token from this IP captured recently
    if (!token) {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      token = await CapturedToken.findOne({
        userId: 'anonymous',
        ipAddress: req.ip,
        isValid: true,
        capturedAt: { $gte: fiveMinsAgo },
      }).sort({ capturedAt: -1 });

      if (token) {
        token.userId = req.user.id;
        token.linkedAt = new Date();
        token.expiresAt = new Date(Date.now() + TOKEN_MAX_AGE_MS);
        await token.save();
        await updateLinkedEmbarkUser(req.user.id, {
          embarkUserId: token.embarkUserId,
          profile: token.embarkProfile,
        });
        logger.info(
          `[Extension] Auto-linked token from IP ${req.ip} to user ${req.user.id}`,
        );
      }
    }

    // 3. Surface if an anonymous token is pending for this IP (helps UI state)
    let hasPendingToken = false;
    if (!token) {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const pending = await CapturedToken.findOne({
        userId: 'anonymous',
        ipAddress: req.ip,
        isValid: true,
        capturedAt: { $gte: fifteenMinsAgo },
      }).select('_id');
      hasPendingToken = !!pending;
    }

    if (token && !token.expiresAt) {
      token.expiresAt = getTokenExpiresAt(token);
      await token.save();
    }

    const expired = token ? isTokenExpired(token) : false;
    const syncSettings = req.user?.id
      ? await AutoSyncSettings.findOne({ userId: req.user.id }).lean()
      : null;

    res.json({
      linked: !!token && !expired,
      hasPendingToken,
      tokenId: token?._id || null,
      lastUsed: token?.lastUsed || null,
      tokenCapturedAt: token?.capturedAt || null,
      tokenExpiresAt: token ? getTokenExpiresAt(token) : null,
      reauthRequired: expired,
      hasWorkingEndpoint: false,
      lastSyncedAt: syncSettings?.lastSyncedAt || null,
      nextSyncAt: syncSettings?.nextSyncAt || null,
      syncIntervalMinutes: syncSettings?.intervalMinutes || 15,
    });
  } catch (err) {
    console.error('[Extension] Status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/extension/debug
// Test a stored token against Embark API (for troubleshooting)
router.get('/debug', async (req, res) => {
  try {
    let tokenDoc;

    if (req.user) {
      tokenDoc = await CapturedToken.findOne({
        userId: req.user.id,
        isValid: true,
      }).sort({ lastUsed: -1 });
    } else if (req.query.tokenHash) {
      tokenDoc = await CapturedToken.findOne({
        tokenHash: req.query.tokenHash,
        isValid: true,
      });
    } else {
      return res
        .status(401)
        .json({ error: 'Login required or provide tokenHash' });
    }

    if (!tokenDoc) {
      return res.status(404).json({ error: 'No valid token found' });
    }

    res.json({
      tokenId: tokenDoc._id,
      tokenHash: tokenDoc.tokenHash,
      source: tokenDoc.source,
      capturedAt: tokenDoc.capturedAt,
      tokenExpiresAt: getTokenExpiresAt(tokenDoc),
      reauthRequired: isTokenExpired(tokenDoc),
      serverEmbarkTestSkipped: true,
      results: [],
    });
  } catch (err) {
    console.error('[Extension] Debug error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/extension/sync
// Receives live data from extension (direct API calls) or Xbox bridge
router.post('/sync', async (req, res) => {
  try {
    const { source, xboxIp, payload, tokenPreview } = req.body;

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Payload required' });
    }

    let tokenHash = null;
    let tokenOwner = null;
    if (req.body.token && typeof req.body.token === 'string') {
      tokenHash = crypto
        .createHash('sha256')
        .update(req.body.token)
        .digest('hex');
      tokenOwner = await CapturedToken.findOne({ tokenHash }).sort({
        linkedAt: -1,
        lastUsed: -1,
        capturedAt: -1,
      });
    }

    const userId = req.user?.id || tokenOwner?.userId || req.ip || 'anonymous';

    // Capture ArcTracker session cookie from extension for cookie-only endpoints.
    const arcTrackerSessionToken = req.body.arcTrackerSessionToken || null;
    if (arcTrackerSessionToken && userId && userId !== 'anonymous') {
      await User.updateOne(
        { id: userId },
        { $set: { arctrackerSessionToken: arcTrackerSessionToken } },
      );
    }

    const payloadProfile = payload?.profile || null;
    const payloadEmbarkId =
      payloadProfile?.embarkUserId ||
      payloadProfile?.embarkId ||
      payloadProfile?.userId ||
      payloadProfile?.id ||
      tokenOwner?.embarkUserId ||
      null;
    const hasStatsPayload = Boolean(
      payload.arcTrackerStats ||
        payload.stats ||
        payload.summary ||
        payload.rounds ||
        payload.weaponKills ||
        payload.weapon_kills ||
        payload.enemyKills ||
        payload.enemy_kills ||
        payload.mapPerformance ||
        payload.map_performance,
    );
    const normalizedArcTrackerStats = payload.arcTrackerStats ||
      (hasStatsPayload
        ? normalizeEmbarkStats({
            summary: payload.summary || payload.stats || null,
            rounds: payload.rounds || null,
            weaponKills: payload.weaponKills || payload.weapon_kills || null,
            enemyKills: payload.enemyKills || payload.enemy_kills || null,
            mapPerformance:
              payload.mapPerformance || payload.map_performance || null,
            expeditionStatus:
              payload.expeditionStatus || payload.expedition || null,
            autoSyncSettings:
              payload.autoSyncSettings || payload.auto_sync_settings || null,
          })
        : null);
    const normalizedPayload = normalizedArcTrackerStats
      ? { ...payload, arcTrackerStats: normalizedArcTrackerStats }
      : payload;
    const syncDoc = {
      userId,
      source: source || 'unknown',
      xboxIp: xboxIp || null,
      payload: normalizedPayload,
      syncedAt: new Date(),
    };

    // Upsert: keep only the latest sync per user+source
    await SyncData.updateOne(
      { userId, source: syncDoc.source },
      { $set: syncDoc },
      { upsert: true },
    );

    await SyncData.updateOne(
      { userId, source: 'extension_full' },
      {
        $set: {
          ...syncDoc,
          source: 'extension_full',
        },
      },
      { upsert: true },
    );

    // Also store individual endpoints for easier querying
    const endpoints = [
      'profile',
      'stash',
      'stats',
      'rounds',
      'hideout',
      'loadout',
      'blueprints',
      'quests',
      'projects',
      'arcTrackerStats',
    ];
    for (const ep of endpoints) {
      if (normalizedPayload[ep]) {
        await SyncData.updateOne(
          { userId, source: `extension_${ep}` },
          {
            $set: {
              userId,
              source: `extension_${ep}`,
              payload: normalizedPayload[ep],
              syncedAt: new Date(),
            },
          },
          { upsert: true },
        );
      }
    }

    // Unpack normalized arcTrackerStats sub-sections for direct lookup
    const normalized = normalizedPayload.arcTrackerStats;
    if (normalized && typeof normalized === 'object' && !normalized.error) {
      const subSections = [
        'totals',
        'derived',
        'topWeapons',
        'arcEnemiesByType',
        'mapPerformance',
        'sync',
        'expedition',
        'account',
      ];
      for (const section of subSections) {
        if (normalized[section] !== undefined) {
          await SyncData.updateOne(
            { userId, source: `extension_${section}` },
            {
              $set: {
                userId,
                source: `extension_${section}`,
                payload: normalized[section],
                syncedAt: new Date(),
              },
            },
            { upsert: true },
          );
        }
      }
    }

    const normalizedInventory = normalizeInventorySnapshot(normalizedPayload);
    if (normalizedInventory) {
      await SyncData.updateOne(
        { userId, source: 'extension_inventoryLatest' },
        {
          $set: {
            userId,
            source: 'extension_inventoryLatest',
            payload: normalizedInventory,
            syncedAt: syncDoc.syncedAt,
          },
        },
        { upsert: true },
      );
    }

    const normalizedProgress = normalizeProgressSnapshot(normalizedPayload);
    if (normalizedProgress) {
      await SyncData.updateOne(
        { userId, source: 'extension_progress' },
        {
          $set: {
            userId,
            source: 'extension_progress',
            payload: normalizedProgress,
            syncedAt: syncDoc.syncedAt,
          },
        },
        { upsert: true },
      );

      const expeditionStatus = deriveExpeditionStatus(normalizedProgress);
      if (expeditionStatus) {
        await SyncData.updateOne(
          { userId, source: 'extension_expeditionStatus' },
          {
            $set: {
              userId,
              source: 'extension_expeditionStatus',
              payload: expeditionStatus,
              syncedAt: syncDoc.syncedAt,
            },
          },
          { upsert: true },
        );
      }
    }

    // Also save token if provided
    if (req.body.token) {
      if (tokenOwner) {
        tokenOwner.userId = userId;
        tokenOwner.lastUsed = new Date();
        tokenOwner.isValid = true;
        tokenOwner.expiresAt = new Date(Date.now() + TOKEN_MAX_AGE_MS);
        if (payloadEmbarkId) tokenOwner.embarkUserId = String(payloadEmbarkId);
        if (payloadProfile) tokenOwner.embarkProfile = payloadProfile;
        const embarkUsername = getEmbarkUsername(payloadProfile);
        if (embarkUsername) tokenOwner.embarkUsername = embarkUsername;
        await tokenOwner.save();
      } else {
        await new CapturedToken({
          userId,
          token: req.body.token,
          tokenHash,
          source: 'extension_direct',
          isValid: true,
          capturedAt: new Date(),
          expiresAt: new Date(Date.now() + TOKEN_MAX_AGE_MS),
          embarkUserId: payloadEmbarkId ? String(payloadEmbarkId) : undefined,
          embarkUsername: getEmbarkUsername(payloadProfile),
          embarkProfile: payloadProfile,
        }).save();
      }
    }

    // Bump userDataVersion when new rounds or stats arrive so the
    // frontend NewVersionAvailableBanner can prompt a refresh.
    if (normalizedPayload.rounds || normalizedPayload.stats) {
      bumpUserDataVersion().catch(() => {});
    }

    await updateLinkedEmbarkUser(userId, {
      embarkUserId: payloadEmbarkId,
      profile: payloadProfile,
      syncedAt: syncDoc.syncedAt,
    });

    await AutoSyncSettings.updateOne(
      { userId },
      {
        $set: {
          userId,
          enabled: true,
          intervalMinutes: 15,
          source: 'extension',
          lastSyncedAt: syncDoc.syncedAt,
          nextSyncAt: new Date(syncDoc.syncedAt.getTime() + 15 * 60 * 1000),
          consecutiveFailures: 0,
          lastErrorMessage: null,
          lastErrorAt: null,
        },
      },
      { upsert: true },
    );

    res.json({
      status: 'synced',
      received: true,
      endpoints: Object.keys(normalizedPayload).filter((k) => !k.startsWith('_')),
      lastSyncedAt: syncDoc.syncedAt,
      nextSyncAt: new Date(syncDoc.syncedAt.getTime() + 15 * 60 * 1000),
      tokenExpiresAt: req.body.token
        ? new Date(Date.now() + TOKEN_MAX_AGE_MS)
        : null,
    });
  } catch (err) {
    console.error('[Extension] Sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/extension/xbox-data
// Returns the last Xbox sync payload for the user
router.get('/xbox-data', async (req, res) => {
  try {
    const userId = req.user?.id || req.ip || 'anonymous';
    const doc = await SyncData.findOne({
      userId,
      source: 'xbox_bridge',
    }).sort({ syncedAt: -1 });

    if (!doc) {
      return res.json({ hasData: false, data: null });
    }

    res.json({
      hasData: true,
      data: doc.payload,
      xboxIp: doc.xboxIp,
      syncedAt: doc.syncedAt,
    });
  } catch (err) {
    console.error('[Extension] Xbox data fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
