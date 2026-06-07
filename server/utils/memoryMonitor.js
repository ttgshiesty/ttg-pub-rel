/**
 * Memory monitoring utility for tracking heap usage and potential leaks
 */

import os from 'os';
import logger from './logger.js';

class MemoryMonitor {
  constructor(options = {}) {
    this.intervalMs = options.intervalMs || 30000; // 30 seconds default
    this.maxSnapshots = options.maxSnapshots || 120; // Keep 1 hour of data
    this.snapshots = [];
    this.timer = null;
    this.thresholds = {
      warning: options.warningThreshold || 400 * 1024 * 1024, // 400MB
      critical: options.criticalThreshold || 700 * 1024 * 1024, // 700MB
    };
  }

  getMemoryStats() {
    const usage = process.memoryUsage();
    const system = {
      total: os.totalmem(),
      free: os.freemem(),
      usedPercent: (
        ((os.totalmem() - os.freemem()) / os.totalmem()) *
        100
      ).toFixed(1),
    };

    return {
      timestamp: new Date().toISOString(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      rss: usage.rss,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
      heapUsedMB: (usage.heapUsed / 1024 / 1024).toFixed(2),
      rssMB: (usage.rss / 1024 / 1024).toFixed(2),
      system,
    };
  }

  snapshot(label = 'manual') {
    const stats = this.getMemoryStats();
    stats.label = label;
    this.snapshots.push(stats);

    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return stats;
  }

  start() {
    if (this.timer) return;

    this.timer = setInterval(() => {
      const stats = this.snapshot('auto');

      // Log warnings
      if (stats.heapUsed > this.thresholds.critical) {
        console.error(
          `[MemoryMonitor] CRITICAL: Heap at ${stats.heapUsedMB}MB`,
        );
        this.logTopConsumers();
      } else if (stats.heapUsed > this.thresholds.warning) {
        console.warn(`[MemoryMonitor] WARNING: Heap at ${stats.heapUsedMB}MB`);
      }

      // Log to console every 2 minutes (4 intervals)
      if (this.snapshots.length % 4 === 0) {
        logger.info(
          `[MemoryMonitor] Heap: ${stats.heapUsedMB}MB | RSS: ${stats.rssMB}MB | System: ${stats.system.usedPercent}%`,
        );
      }
    }, this.intervalMs);

    // Don't keep process alive just for monitoring
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  logTopConsumers() {
    // Log current state of known large objects
    const globalKeys = Object.keys(global).filter(
      (k) =>
        k.includes('client') || k.includes('cache') || k.includes('Catalog'),
    );
  }

  getReport() {
    if (this.snapshots.length < 2) return 'Not enough data';

    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    const growth = last.heapUsed - first.heapUsed;
    const growthMB = (growth / 1024 / 1024).toFixed(2);

    return {
      snapshots: this.snapshots.length,
      duration: `${((this.snapshots.length * this.intervalMs) / 1000 / 60).toFixed(1)} minutes`,
      heapGrowth: `${growthMB}MB`,
      current: `${last.heapUsedMB}MB`,
      trend: growth > 50 * 1024 * 1024 ? 'LEAK DETECTED' : 'stable',
    };
  }
}

// Singleton instance
let monitor = null;

export function startMonitoring(options) {
  if (!monitor) {
    monitor = new MemoryMonitor(options);
    monitor.start();
  }
  return monitor;
}

export function getMonitor() {
  return monitor;
}

export function snapshot(label) {
  return monitor ? monitor.snapshot(label) : null;
}

export { MemoryMonitor };
