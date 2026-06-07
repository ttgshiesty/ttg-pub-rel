import express from 'express';
import { AutoSyncSettings } from '../models/AutoSyncSettings.js';
import { SyncData } from '../models/SyncData.js';
import { User } from '../models/User.js';
import { circuitBreaker } from '../services/arctracker.js';

const router = express.Router();

// System health check endpoint
router.get('/system', async (req, res) => {
  try {
    const now = new Date();
    const healthReport = {
      timestamp: now.toISOString(),
      status: 'healthy',
      services: {
        database: 'unknown',
        arctracker: 'unknown',
        sync: 'unknown',
      },
      metrics: {
        activeSyncs: 0,
        recentFailures: 0,
        circuitBreakerStatus: circuitBreaker.isOpen ? 'open' : 'closed',
        circuitBreakerFailures: circuitBreaker.failures,
      },
      performance: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      },
    };

    // Check database connectivity
    try {
      const userCount = await User.countDocuments();
      healthReport.services.database = 'healthy';
      healthReport.metrics.totalUsers = userCount;
    } catch (err) {
      healthReport.services.database = 'unhealthy';
      healthReport.status = 'degraded';
    }

    // Check sync service status
    try {
      const activeSyncs = await AutoSyncSettings.countDocuments({
        enabled: true,
      });
      const recentFailures = await AutoSyncSettings.countDocuments({
        lastErrorAt: { $gte: new Date(now.getTime() - 60 * 60 * 1000) }, // Last hour
      });

      healthReport.services.sync = 'healthy';
      healthReport.metrics.activeSyncs = activeSyncs;
      healthReport.metrics.recentFailures = recentFailures;

      if (recentFailures > activeSyncs * 0.5) {
        healthReport.services.sync = 'degraded';
        healthReport.status = 'degraded';
      }
    } catch (err) {
      healthReport.services.sync = 'unhealthy';
      healthReport.status = 'unhealthy';
    }

    // Check ArcTracker circuit breaker
    if (circuitBreaker.isOpen) {
      healthReport.services.arctracker = 'degraded';
      healthReport.status = 'degraded';
    } else {
      healthReport.services.arctracker = 'healthy';
    }

    res.json(healthReport);
  } catch (error) {
    console.error('[Health] System health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Sync performance metrics
router.get('/sync', async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const syncMetrics = {
      timestamp: now.toISOString(),
      lastHour: {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        avgSyncTime: 0,
      },
      last24Hours: {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        uniqueUsers: 0,
      },
      currentStatus: {
        activeSyncSettings: 0,
        usersWithErrors: 0,
        usersRateLimited: 0,
      },
      topErrors: [],
    };

    // Get sync data from last hour
    const recentSyncs = await SyncData.find({
      syncedAt: { $gte: oneHourAgo },
    }).lean();

    syncMetrics.lastHour.totalSyncs = recentSyncs.length;
    syncMetrics.lastHour.successfulSyncs = recentSyncs.filter(
      (s) => s.payload && !s.payload.error,
    ).length;
    syncMetrics.lastHour.failedSyncs =
      recentSyncs.length - syncMetrics.lastHour.successfulSyncs;

    // Get sync data from last 24 hours
    const daySyncs = await SyncData.find({
      syncedAt: { $gte: twentyFourHoursAgo },
    }).lean();

    syncMetrics.last24Hours.totalSyncs = daySyncs.length;
    syncMetrics.last24Hours.successfulSyncs = daySyncs.filter(
      (s) => s.payload && !s.payload.error,
    ).length;
    syncMetrics.last24Hours.failedSyncs =
      daySyncs.length - syncMetrics.last24Hours.successfulSyncs;
    syncMetrics.last24Hours.uniqueUsers = new Set(
      daySyncs.map((s) => s.userId),
    ).size;

    // Get current sync settings status
    const activeSettings = await AutoSyncSettings.find({
      enabled: true,
    }).lean();
    syncMetrics.currentStatus.activeSyncSettings = activeSettings.length;
    syncMetrics.currentStatus.usersWithErrors = activeSettings.filter(
      (s) => s.lastErrorMessage,
    ).length;

    // Calculate rate limited users (those with recent failures)
    syncMetrics.currentStatus.usersRateLimited = activeSettings.filter(
      (s) =>
        s.lastErrorAt &&
        now.getTime() - new Date(s.lastErrorAt).getTime() < 5 * 60 * 1000,
    ).length;

    // Get top error messages
    const errorCounts = {};
    activeSettings.forEach((setting) => {
      if (setting.lastErrorMessage) {
        errorCounts[setting.lastErrorMessage] =
          (errorCounts[setting.lastErrorMessage] || 0) + 1;
      }
    });

    syncMetrics.topErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));

    res.json(syncMetrics);
  } catch (error) {
    console.error('[Health] Sync metrics failed:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Database performance check
router.get('/database', async (req, res) => {
  try {
    const startTime = Date.now();

    // Test basic database operations
    const userCount = await User.countDocuments();
    const syncCount = await SyncData.countDocuments();
    const settingsCount = await AutoSyncSettings.countDocuments();

    const queryTime = Date.now() - startTime;

    // Get database stats if available
    let dbStats = null;
    try {
      dbStats = await User.db.stats();
    } catch (err) {
      // Stats might not be available, that's okay
    }

    res.json({
      timestamp: new Date().toISOString(),
      status: 'healthy',
      performance: {
        queryTime: `${queryTime}ms`,
        collections: {
          users: userCount,
          syncData: syncCount,
          autoSyncSettings: settingsCount,
        },
      },
      database: dbStats,
    });
  } catch (error) {
    console.error('[Health] Database health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
