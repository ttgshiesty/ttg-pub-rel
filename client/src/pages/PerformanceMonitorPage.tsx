import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Activity,
  Database,
  AlertTriangle,
  CheckCircle,
  Clock,
  Server,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface SystemHealth {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: string;
    arctracker: string;
    sync: string;
  };
  metrics: {
    activeSyncs: number;
    recentFailures: number;
    circuitBreakerStatus: string;
    circuitBreakerFailures: number;
    totalUsers?: number;
  };
  performance: {
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    uptime: number;
  };
}

interface SyncMetrics {
  timestamp: string;
  lastHour: {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    avgSyncTime: number;
  };
  last24Hours: {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    uniqueUsers: number;
  };
  currentStatus: {
    activeSyncSettings: number;
    usersWithErrors: number;
    usersRateLimited: number;
  };
  topErrors: Array<{ error: string; count: number }>;
}

export default function PerformanceMonitorPage() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [syncMetrics, setSyncMetrics] = useState<SyncMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealthData = async () => {
    try {
      setError(null);
      const [healthResponse, syncResponse] = await Promise.all([
        fetch('/api/health/system'),
        fetch('/api/health/sync'),
      ]);

      if (!healthResponse.ok || !syncResponse.ok) {
        throw new Error('Failed to fetch health data');
      }

      const health = await healthResponse.json();
      const sync = await syncResponse.json();

      setSystemHealth(health);
      setSyncMetrics(sync);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();

    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatMemory = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span>Loading performance data...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-semibold text-red-400">
                Error Loading Performance Data
              </h3>
            </div>
            <p className="text-red-300 mb-4">{error}</p>
            <Button
              onClick={fetchHealthData}
              variant="outline"
              className="border-red-500 text-red-400 hover:bg-red-900/20"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Activity className="h-8 w-8 text-blue-500" />
              Performance Monitor
            </h1>
            <p className="text-gray-400">
              Real-time system health and sync performance metrics
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </Button>

            <Button
              onClick={fetchHealthData}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Now
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Server className="h-6 w-6 text-blue-500" />
                <h3 className="text-lg font-semibold">System Status</h3>
              </div>
              <div className="flex items-center gap-3 mb-4">
                {getStatusIcon(systemHealth?.status || 'unknown')}
                <Badge
                  className={getStatusColor(systemHealth?.status || 'unknown')}
                >
                  {systemHealth?.status?.toUpperCase() || 'UNKNOWN'}
                </Badge>
              </div>
              <p className="text-sm text-gray-400">
                Last updated:{' '}
                {systemHealth
                  ? new Date(systemHealth.timestamp).toLocaleTimeString()
                  : 'N/A'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Database className="h-6 w-6 text-green-500" />
                <h3 className="text-lg font-semibold">Database</h3>
              </div>
              <div className="flex items-center gap-3 mb-4">
                {getStatusIcon(systemHealth?.services?.database || 'unknown')}
                <Badge
                  className={getStatusColor(
                    systemHealth?.services?.database || 'unknown',
                  )}
                >
                  {systemHealth?.services?.database?.toUpperCase() || 'UNKNOWN'}
                </Badge>
              </div>
              {systemHealth?.metrics?.totalUsers && (
                <p className="text-sm text-gray-400">
                  Total Users:{' '}
                  {systemHealth.metrics.totalUsers.toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="h-6 w-6 text-purple-500" />
                <h3 className="text-lg font-semibold">Sync Service</h3>
              </div>
              <div className="flex items-center gap-3 mb-4">
                {getStatusIcon(systemHealth?.services?.sync || 'unknown')}
                <Badge
                  className={getStatusColor(
                    systemHealth?.services?.sync || 'unknown',
                  )}
                >
                  {systemHealth?.services?.sync?.toUpperCase() || 'UNKNOWN'}
                </Badge>
              </div>
              <p className="text-sm text-gray-400">
                Active Syncs: {systemHealth?.metrics?.activeSyncs || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Sync Performance (Last Hour)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {syncMetrics?.lastHour?.totalSyncs || 0}
                  </div>
                  <div className="text-sm text-gray-400">Total Syncs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {syncMetrics?.lastHour?.successfulSyncs || 0}
                  </div>
                  <div className="text-sm text-gray-400">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {syncMetrics?.lastHour?.failedSyncs || 0}
                  </div>
                  <div className="text-sm text-gray-400">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Current Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Users with Errors:</span>
                  <Badge
                    className={
                      (syncMetrics?.currentStatus?.usersWithErrors || 0) > 0
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }
                  >
                    {syncMetrics?.currentStatus?.usersWithErrors || 0}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Rate Limited Users:</span>
                  <Badge
                    className={
                      (syncMetrics?.currentStatus?.usersRateLimited || 0) > 0
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }
                  >
                    {syncMetrics?.currentStatus?.usersRateLimited || 0}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Circuit Breaker:</span>
                  <Badge
                    className={
                      systemHealth?.metrics?.circuitBreakerStatus === 'open'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }
                  >
                    {systemHealth?.metrics?.circuitBreakerStatus || 'unknown'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-gray-400 mb-1">Memory Usage</div>
                <div className="text-lg font-semibold">
                  {systemHealth
                    ? formatMemory(
                        systemHealth.performance.memoryUsage.heapUsed,
                      )
                    : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">RSS Memory</div>
                <div className="text-lg font-semibold">
                  {systemHealth
                    ? formatMemory(systemHealth.performance.memoryUsage.rss)
                    : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">System Uptime</div>
                <div className="text-lg font-semibold">
                  {systemHealth
                    ? formatUptime(systemHealth.performance.uptime)
                    : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">
                  Circuit Breaker Failures
                </div>
                <div className="text-lg font-semibold">
                  {systemHealth?.metrics?.circuitBreakerFailures || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {syncMetrics?.topErrors && syncMetrics.topErrors.length > 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Top Error Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {syncMetrics.topErrors.map((error, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1 mr-4">
                      <p className="text-sm font-medium truncate">
                        {error.error}
                      </p>
                    </div>
                    <Badge className="bg-red-100 text-red-800">
                      {error.count} occurrences
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
