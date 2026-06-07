import { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  Shield,
  Sword,
  DollarSign,
  TrendingUp,
  Activity,
  BarChart3,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  EnhancedSurvivalMetrics,
  AdvancedKillStatistics,
  EconomicPerformanceIndicators,
} from '../components/stats';

interface EnhancedStatsData {
  enhanced_survival_metrics: any;
  advanced_kill_statistics: any;
  economic_performance_indicators: any;
  lastUpdated: string;
}

export default function EnhancedStatsPage() {
  const { profile } = usePlayer();
  const [statsData, setStatsData] = useState<EnhancedStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('survival');
  const [showDetails, setShowDetails] = useState(false);

  const fetchEnhancedStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/stats/overview');
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const data = await response.json();
      setStatsData({
        enhanced_survival_metrics: data.enhanced_survival_metrics || {},
        advanced_kill_statistics: data.advanced_kill_statistics || {},
        economic_performance_indicators:
          data.economic_performance_indicators || {},
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load enhanced statistics',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchEnhancedStats();
    }
  }, [profile?.id]);

  const exportData = () => {
    if (!statsData) return;

    const dataStr = JSON.stringify(statsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `enhanced-stats-${profile?.username || 'unknown'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span>Loading enhanced statistics...</span>
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
              <Activity className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-semibold text-red-400">
                Error Loading Statistics
              </h3>
            </div>
            <p className="text-red-300 mb-4">{error}</p>
            <Button
              onClick={fetchEnhancedStats}
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

  if (!statsData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              No Statistics Available
            </h3>
            <p className="text-gray-500">
              Complete some raids to see your enhanced statistics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              Enhanced Statistics Dashboard
            </h1>
            <p className="text-gray-400">
              Advanced analytics and insights for your Arc Raiders performance
            </p>
            {statsData.lastUpdated && (
              <p className="text-sm text-gray-500 mt-2">
                Last updated: {new Date(statsData.lastUpdated).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDetails(!showDetails)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              {showDetails ? (
                <EyeOff className="h-4 w-4 mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {showDetails ? 'Simple View' : 'Detailed View'}
            </Button>

            <Button
              variant="outline"
              onClick={exportData}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>

            <Button
              onClick={fetchEnhancedStats}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {(
                      (statsData.enhanced_survival_metrics
                        ?.overallSurvivalRate || 0) * 100
                    ).toFixed(1)}
                    %
                  </div>
                  <div className="text-sm text-gray-400">Survival Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Sword className="h-8 w-8 text-red-500" />
                <div>
                  <div className="text-2xl font-bold text-red-400">
                    {statsData.advanced_kill_statistics?.damageEfficiency?.damageRatio?.toFixed(
                      2,
                    ) || '0.00'}
                    x
                  </div>
                  <div className="text-sm text-gray-400">Damage Ratio</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {Math.round(
                      statsData.economic_performance_indicators
                        ?.economicEfficiency?.avgProfitPerHour || 0,
                    ).toLocaleString()}
                    /hr
                  </div>
                  <div className="text-sm text-gray-400">Profit/Hour</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold text-blue-400">
                    {(
                      (statsData.economic_performance_indicators
                        ?.economicEfficiency?.overallROI || 0) * 100
                    ).toFixed(1)}
                    %
                  </div>
                  <div className="text-sm text-gray-400">Overall ROI</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
            <TabsTrigger
              value="survival"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-white flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Survival Metrics
            </TabsTrigger>
            <TabsTrigger
              value="combat"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-white flex items-center gap-2"
            >
              <Sword className="h-4 w-4" />
              Combat Analysis
            </TabsTrigger>
            <TabsTrigger
              value="economic"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-white flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4" />
              Economic Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="survival" className="space-y-6">
            <EnhancedSurvivalMetrics
              metrics={statsData.enhanced_survival_metrics}
            />
          </TabsContent>

          <TabsContent value="combat" className="space-y-6">
            <AdvancedKillStatistics
              stats={statsData.advanced_kill_statistics}
            />
          </TabsContent>

          <TabsContent value="economic" className="space-y-6">
            <EconomicPerformanceIndicators
              indicators={statsData.economic_performance_indicators}
            />
          </TabsContent>
        </Tabs>

        <Card className="mt-8 bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-blue-500" />
                <span className="text-sm text-gray-300">Data Quality:</span>
                <Badge className="bg-green-100 text-green-800">
                  High Quality
                </Badge>
              </div>
              <div className="text-xs text-gray-500">
                Powered by ArcTracker API v2 - Enhanced SHiESTY Analytics
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
