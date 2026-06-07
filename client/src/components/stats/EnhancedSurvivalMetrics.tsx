import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Shield,
  Target,
  Activity,
  Users,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface EnhancedSurvivalMetricsProps {
  metrics: {
    overallSurvivalRate: number;
    extractionTrends: Array<{
      week: string;
      survivalRate: number;
      totalRounds: number;
      avgProfit: number;
    }>;
    riskRewardAnalysis: Array<{
      riskCategory: string;
      survivalRate: number;
      avgProfit: number;
      totalRounds: number;
      riskAdjustedReturn: number;
    }>;
    timeBasedSurvival: {
      byHourOfDay: Array<{
        hour: number;
        survivalRate: number;
        totalRounds: number;
        avgProfit: number;
      }>;
      byDayOfWeek: Array<{
        dayName: string;
        day: number;
        survivalRate: number;
        totalRounds: number;
        avgProfit: number;
      }>;
      byMonth: Array<{
        month: string;
        survivalRate: number;
        totalRounds: number;
        avgProfit: number;
      }>;
    };
    survivalByLoadoutValue: Array<{
      loadoutRange: string;
      survivalRate: number;
      totalRounds: number;
      avgProfit: number;
      returnOnInvestment: number;
    }>;
    teamPerformanceMetrics: {
      avgRevivesGiven: number;
      avgRevivesReceived: number;
      totalTeamSupport: number;
      supportEfficiency: number;
    };
  };
}

export function EnhancedSurvivalMetrics({
  metrics,
}: EnhancedSurvivalMetricsProps) {
  const getSurvivalColor = (rate: number) => {
    if (rate >= 0.8) return 'text-green-600';
    if (rate >= 0.6) return 'text-yellow-600';
    if (rate >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRiskColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'low risk':
        return 'bg-green-100 text-green-800';
      case 'medium risk':
        return 'bg-yellow-100 text-yellow-800';
      case 'high risk':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatCurrency = (value: number) =>
    `${Math.round(value).toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* Overall Survival Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Overall Survival Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div
                className={`text-4xl font-bold ${getSurvivalColor(metrics.overallSurvivalRate)}`}
              >
                {formatPercent(metrics.overallSurvivalRate)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Survival Rate</div>
              <Progress
                value={metrics.overallSurvivalRate * 100}
                className="mt-2"
              />
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">
                {metrics.teamPerformanceMetrics.totalTeamSupport}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Total Team Support Actions
              </div>
              <div className="flex justify-center gap-2 mt-2">
                <Users className="h-4 w-4 text-green-500" />
                <span className="text-sm">
                  {formatPercent(
                    metrics.teamPerformanceMetrics.supportEfficiency,
                  )}{' '}
                  Efficiency
                </span>
              </div>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600">
                {metrics.teamPerformanceMetrics.avgRevivesGiven.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Avg Revives Given
              </div>
              <div className="flex justify-center gap-2 mt-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="text-sm">
                  {metrics.teamPerformanceMetrics.avgRevivesReceived.toFixed(1)}{' '}
                  Received
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk-Reward Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Risk-Reward Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.riskRewardAnalysis.map((risk) => (
              <div key={risk.riskCategory} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <Badge className={getRiskColor(risk.riskCategory)}>
                    {risk.riskCategory}
                  </Badge>
                  <div className="text-right">
                    <div
                      className={`font-semibold ${getSurvivalColor(risk.survivalRate)}`}
                    >
                      {formatPercent(risk.survivalRate)}
                    </div>
                    <div className="text-xs text-gray-500">Survival Rate</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Profit:</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(risk.avgProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Rounds:</span>
                    <span className="text-sm">{risk.totalRounds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Risk-Adjusted Return:</span>
                    <span
                      className={`text-sm font-medium ${
                        risk.riskAdjustedReturn > 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {risk.riskAdjustedReturn > 0 ? '+' : ''}
                      {risk.riskAdjustedReturn.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time-Based Survival Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Hours to Play */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Best Hours to Play
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.timeBasedSurvival.byHourOfDay
                .sort((a, b) => b.survivalRate - a.survivalRate)
                .slice(0, 6)
                .map((hour) => (
                  <div
                    key={hour.hour}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium w-12">
                        {hour.hour}:00
                      </span>
                      <Progress
                        value={hour.survivalRate * 100}
                        className="w-20 h-2"
                      />
                      <span
                        className={`text-sm ${getSurvivalColor(hour.survivalRate)}`}
                      >
                        {formatPercent(hour.survivalRate)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatCurrency(hour.avgProfit)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {hour.totalRounds} rounds
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Best Days to Play */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Best Days to Play
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.timeBasedSurvival.byDayOfWeek
                .sort((a, b) => b.survivalRate - a.survivalRate)
                .map((day) => (
                  <div
                    key={day.day}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium w-16">
                        {day.dayName}
                      </span>
                      <Progress
                        value={day.survivalRate * 100}
                        className="w-20 h-2"
                      />
                      <span
                        className={`text-sm ${getSurvivalColor(day.survivalRate)}`}
                      >
                        {formatPercent(day.survivalRate)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatCurrency(day.avgProfit)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {day.totalRounds} rounds
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loadout Value Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Survival by Loadout Investment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.survivalByLoadoutValue.map((loadout) => (
              <div key={loadout.loadoutRange} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <span className="font-medium text-sm">
                    {loadout.loadoutRange}
                  </span>
                  <div
                    className={`text-sm font-semibold ${getSurvivalColor(loadout.survivalRate)}`}
                  >
                    {formatPercent(loadout.survivalRate)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Avg Profit:</span>
                    <span className="text-xs font-medium">
                      {formatCurrency(loadout.avgProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">ROI:</span>
                    <span
                      className={`text-xs font-medium ${
                        loadout.returnOnInvestment > 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {formatPercent(loadout.returnOnInvestment)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Rounds:</span>
                    <span className="text-xs">{loadout.totalRounds}</span>
                  </div>
                </div>

                <Progress
                  value={loadout.survivalRate * 100}
                  className="mt-3 h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Extraction Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Extraction Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.extractionTrends.slice(-8).map((week, index) => {
              const previousWeek =
                metrics.extractionTrends[
                  metrics.extractionTrends.indexOf(week) - 1
                ];
              const trend = previousWeek
                ? week.survivalRate - previousWeek.survivalRate
                : 0;

              return (
                <div
                  key={week.week}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{week.week}</span>
                    <div className="flex items-center gap-1">
                      {trend > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : trend < 0 ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : null}
                      <span
                        className={`text-sm ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'}`}
                      >
                        {trend > 0 ? '+' : ''}
                        {formatPercent(trend)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div
                        className={`font-semibold ${getSurvivalColor(week.survivalRate)}`}
                      >
                        {formatPercent(week.survivalRate)}
                      </div>
                      <div className="text-xs text-gray-500">Survival Rate</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(week.avgProfit)}
                      </div>
                      <div className="text-xs text-gray-500">Avg Profit</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{week.totalRounds}</div>
                      <div className="text-xs text-gray-500">Rounds</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
