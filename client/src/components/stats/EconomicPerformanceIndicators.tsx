import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Clock,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  PiggyBank,
  ShoppingCart,
  Star,
} from 'lucide-react';
import arctrackerLabels from '../../data/arctracker-en.json';

const EMBARK_STAT_LABELS = (arctrackerLabels as any)?.RaidHistoryPage
  ?.embarkStats ?? {
  netValue: 'Net Value',
};

interface EconomicPerformanceIndicatorsProps {
  indicators: {
    profitPerHourByMap: Array<{
      map: string;
      totalRounds: number;
      totalDuration: number;
      totalProfit: number;
      totalLoadoutValue: number;
      totalExtractedValue: number;
      extractions: number;
      profitPerHour: number;
      avgHourlyRate: number;
      investmentReturn: number;
      extractionRate: number;
    }>;
    lootOptimizationRecommendations: Array<{
      type: string;
      priority: string;
      title: string;
      description: string;
      recommendation: string;
      potentialGain: number;
    }>;
    marketValueTrends: Array<{
      month: string;
      totalValue: number;
      totalRounds: number;
      avgValuePerRaid: number;
      maxValue: number;
      minValue: number;
      trend?: string;
      trendPercentage?: number;
    }>;
    riskAdjustedReturns: Array<{
      riskCategory: string;
      description: string;
      totalRounds: number;
      totalProfit: number;
      avgProfitPerRaid: number;
      returnOnInvestment: number;
      survivalRate: number;
      profitPerHour: number;
      riskAdjustedReturn: number;
    }>;
    economicEfficiency: {
      totalNetProfit: number;
      totalInvestment: number;
      overallROI: number;
      avgProfitPerHour: number;
      extractionSuccessRate: number;
      lootToInvestmentRatio: number;
      economicRating: string;
      currentStashValue: number;
      netWorthGrowth: number;
    };
  };
}

export function EconomicPerformanceIndicators({
  indicators,
}: EconomicPerformanceIndicatorsProps) {
  const economicEfficiency = Object.assign(
    {
      totalNetProfit: 0,
      totalInvestment: 0,
      overallROI: 0,
      avgProfitPerHour: 0,
      extractionSuccessRate: 0,
      lootToInvestmentRatio: 0,
      economicRating: 'Unknown',
      currentStashValue: 0,
      netWorthGrowth: 0,
    },
    indicators?.economicEfficiency,
  );
  economicEfficiency.economicRating ||= 'Unknown';
  const safeIndicators = {
    profitPerHourByMap: Array.isArray(indicators?.profitPerHourByMap)
      ? indicators.profitPerHourByMap
      : [],
    lootOptimizationRecommendations: Array.isArray(
      indicators?.lootOptimizationRecommendations,
    )
      ? indicators.lootOptimizationRecommendations
      : [],
    marketValueTrends: Array.isArray(indicators?.marketValueTrends)
      ? indicators.marketValueTrends
      : [],
    riskAdjustedReturns: Array.isArray(indicators?.riskAdjustedReturns)
      ? indicators.riskAdjustedReturns
      : [],
    economicEfficiency,
  };
  const formatCurrency = (value: number) =>
    `${Math.round(value).toLocaleString()}`;
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      case 'average':
        return 'text-yellow-600';
      case 'below average':
        return 'text-orange-600';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getRiskColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'conservative':
        return 'bg-green-100 text-green-800';
      case 'balanced':
        return 'bg-yellow-100 text-yellow-800';
      case 'aggressive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'container_optimization':
        return <ShoppingCart className="h-4 w-4" />;
      case 'map_selection':
        return <Target className="h-4 w-4" />;
      case 'timing_optimization':
        return <Clock className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Economic Efficiency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Overall Economic Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(
                  safeIndicators.economicEfficiency.totalNetProfit,
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {EMBARK_STAT_LABELS.netValue}
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {formatCurrency(
                  safeIndicators.economicEfficiency.avgProfitPerHour,
                )}
                /hr
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Avg {EMBARK_STAT_LABELS.netValue}/Hour
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {formatPercent(safeIndicators.economicEfficiency.overallROI)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Overall ROI</div>
            </div>

            <div className="text-center">
              <div
                className={`text-3xl font-bold ${getRatingColor(safeIndicators.economicEfficiency.economicRating)}`}
              >
                {safeIndicators.economicEfficiency.economicRating}
              </div>
              <div className="text-sm text-gray-600 mt-1">Economic Rating</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profit Per Hour by Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Profit Per Hour by Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {safeIndicators.profitPerHourByMap
              .sort((a, b) => b.profitPerHour - a.profitPerHour)
              .map((map) => (
                <div
                  key={map.map}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-medium">{map.map}</div>
                      <div className="text-sm text-gray-500">
                        {map.totalRounds} rounds
                      </div>
                    </div>
                    <Badge variant="outline">
                      {formatPercent(map.extractionRate)} extraction
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-6 text-center">
                    <div>
                      <div className="font-semibold text-lg text-green-600">
                        {formatCurrency(map.profitPerHour)}/hr
                      </div>
                      <div className="text-xs text-gray-500">Profit/Hour</div>
                    </div>
                    <div>
                      <div className="font-semibold text-lg">
                        {formatCurrency(map.avgHourlyRate)}
                      </div>
                      <div className="text-xs text-gray-500">Avg Hourly</div>
                    </div>
                    <div>
                      <div className="font-semibold text-lg">
                        {formatPercent(map.investmentReturn)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Investment Return
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-lg">
                        {formatCurrency(map.totalProfit)}
                      </div>
                      <div className="text-xs text-gray-500">Total Profit</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Optimization Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Loot Optimization Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {safeIndicators.lootOptimizationRecommendations.map(
              (rec, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${getPriorityColor(rec.priority)}`}
                >
                  <div className="flex items-start gap-3">
                    {getRecommendationIcon(rec.type)}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{rec.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {rec.priority}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-700 mb-2">
                        {rec.description}
                      </p>
                      <p className="text-sm font-medium mb-2">
                        {rec.recommendation}
                      </p>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">
                          Potential Gain:
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                          +{formatCurrency(rec.potentialGain)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {/* Risk-Adjusted Returns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Risk-Adjusted Returns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {safeIndicators.riskAdjustedReturns.map((risk) => (
                <div key={risk.riskCategory} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-medium">{risk.riskCategory}</div>
                      <div className="text-xs text-gray-500">
                        {risk.description}
                      </div>
                    </div>
                    <Badge className={getRiskColor(risk.riskCategory)}>
                      {risk.riskCategory}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ROI:</span>
                        <span className="font-medium">
                          {formatPercent(risk.returnOnInvestment)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Survival:</span>
                        <span className="font-medium">
                          {formatPercent(risk.survivalRate)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Profit/Hour:</span>
                        <span className="font-medium">
                          {formatCurrency(risk.profitPerHour)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Risk-Adjusted:</span>
                        <span
                          className={`font-medium ${
                            risk.riskAdjustedReturn > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {risk.riskAdjustedReturn.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Profit:</span>
                        <span className="font-medium">
                          {formatCurrency(risk.avgProfitPerRaid)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rounds:</span>
                        <span className="font-medium">{risk.totalRounds}</span>
                      </div>
                    </div>
                  </div>

                  <Progress
                    value={Math.abs(risk.riskAdjustedReturn) * 100}
                    className="mt-3 h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Market Value Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Market Value Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {safeIndicators.marketValueTrends.slice(-6).map((trend) => (
                <div
                  key={trend.month}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{trend.month}</span>
                    {trend.trend && (
                      <div className="flex items-center gap-1">
                        {trend.trend === 'increasing' ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span
                          className={`text-sm ${
                            trend.trend === 'increasing'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {trend.trendPercentage?.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(trend.avgValuePerRaid)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {trend.totalRounds} raids
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Economic Efficiency Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Economic Efficiency Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(
                  safeIndicators.economicEfficiency.totalInvestment,
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Investment</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatPercent(
                  safeIndicators.economicEfficiency.extractionSuccessRate,
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Extraction Success Rate
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {safeIndicators.economicEfficiency.lootToInvestmentRatio.toFixed(
                  2,
                )}
                x
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Loot to Investment Ratio
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(
                  safeIndicators.economicEfficiency.netWorthGrowth,
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1">Net Worth Growth</div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Current Stash Value</div>
                <div className="text-sm text-gray-600">
                  Including all currencies and items
                </div>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  safeIndicators.economicEfficiency.currentStashValue,
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
