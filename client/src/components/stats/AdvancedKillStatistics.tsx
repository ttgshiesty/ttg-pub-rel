import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Crosshair,
  Sword,
  Shield,
  Target,
  TrendingUp,
  AlertTriangle,
  Star,
  Zap,
  Skull,
  Trophy,
} from 'lucide-react';

interface AdvancedKillStatisticsProps {
  stats: {
    enemyEfficiencyAnalysis: Array<{
      enemyName: string;
      totalKills: number;
      totalDamage: number;
      encounters: number;
      damagePerKill: number;
      threatLevel: string;
      recommendedWeapon: string | null;
      efficiencyScore: number;
    }>;
    weaponMasteryProgression: Array<{
      weaponName: string;
      totalDamage: number;
      totalKills: number;
      usageCount: number;
      avgDamagePerUse: number;
      masteryLevel: string;
      progressionTrend: any[];
    }>;
    combatEffectivenessByMap: Array<{
      map: string;
      totalRounds: number;
      totalKills: number;
      totalDamage: number;
      totalDamageReceived: number;
      extractions: number;
      avgKillsPerRaid: number;
      avgDamagePerRaid: number;
      damageRatio: number;
      combatRating: string;
    }>;
    threatAssessment: Array<{
      enemyName: string;
      avgDamagePerKill: number;
      totalKills: number;
      playerDeaths: number;
      threatLevel: string;
      counterStrategy: string;
      priority: number;
    }>;
    killCombos: Array<{
      roundId: string;
      map: string;
      totalKills: number;
      playerKills: number;
      arcKills: number;
      comboType: string;
      efficiency: number;
    }>;
    damageEfficiency: {
      totalDamageDealt: number;
      totalDamageReceived: number;
      damageRatio: number;
      avgDamagePerKill: number;
      damagePerMinute: number;
      combatEfficiency: number;
    };
  };
}

export function AdvancedKillStatistics({ stats }: AdvancedKillStatisticsProps) {
  const getThreatColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'extreme':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMasteryColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'master':
        return 'bg-purple-100 text-purple-800';
      case 'expert':
        return 'bg-blue-100 text-blue-800';
      case 'advanced':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'beginner':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCombatRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      case 'average':
        return 'text-yellow-600';
      case 'needs improvement':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getComboIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'massacre':
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'dominating':
        return <Star className="h-4 w-4 text-purple-500" />;
      case 'killing spree':
        return <Zap className="h-4 w-4 text-blue-500" />;
      case 'multi-kill':
        return <Crosshair className="h-4 w-4 text-green-500" />;
      default:
        return <Skull className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatNumber = (num: number) => Math.round(num).toLocaleString();
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Overall Combat Efficiency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sword className="h-5 w-5" />
            Overall Combat Efficiency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {formatNumber(stats.damageEfficiency.totalDamageDealt)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Total Damage Dealt
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {formatNumber(stats.damageEfficiency.totalDamageReceived)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Total Damage Received
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {stats.damageEfficiency.damageRatio.toFixed(2)}x
              </div>
              <div className="text-sm text-gray-600 mt-1">Damage Ratio</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {formatPercent(stats.damageEfficiency.combatEfficiency)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Combat Efficiency
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enemy Efficiency Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Enemy Efficiency Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.enemyEfficiencyAnalysis.slice(0, 8).map((enemy) => (
                <div
                  key={enemy.enemyName}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm w-24">
                      {enemy.enemyName}
                    </span>
                    <Badge className={getThreatColor(enemy.threatLevel)}>
                      {enemy.threatLevel}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <div className="font-semibold">{enemy.totalKills}</div>
                      <div className="text-xs text-gray-500">Kills</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {Math.round(enemy.damagePerKill)}
                      </div>
                      <div className="text-xs text-gray-500">DMG/Kill</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {enemy.efficiencyScore.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">Efficiency</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Threat Assessment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Priority Threat Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.threatAssessment.slice(0, 6).map((threat) => (
                <div
                  key={threat.enemyName}
                  className={`p-3 border rounded-lg ${getThreatColor(threat.threatLevel)}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{threat.enemyName}</span>
                      <Badge variant="outline" className="text-xs">
                        Priority {Math.round(threat.priority)}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{threat.playerDeaths}</div>
                      <div className="text-xs">Deaths Caused</div>
                    </div>
                  </div>

                  <div className="text-sm mb-2">
                    <span className="font-medium">Counter Strategy:</span>{' '}
                    {threat.counterStrategy}
                  </div>

                  <div className="flex justify-between text-xs">
                    <span>
                      Avg Damage: {Math.round(threat.avgDamagePerKill)}
                    </span>
                    <span>Total Kills: {threat.totalKills}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weapon Mastery Progression */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Weapon Mastery Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.weaponMasteryProgression.slice(0, 9).map((weapon) => (
              <div key={weapon.weaponName} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <span className="font-medium text-sm">
                    {weapon.weaponName}
                  </span>
                  <Badge className={getMasteryColor(weapon.masteryLevel)}>
                    {weapon.masteryLevel}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Total Damage:</span>
                    <span className="text-xs font-medium">
                      {formatNumber(weapon.totalDamage)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Kills:</span>
                    <span className="text-xs font-medium">
                      {weapon.totalKills}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Avg Damage:</span>
                    <span className="text-xs font-medium">
                      {Math.round(weapon.avgDamagePerUse)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Usage Count:</span>
                    <span className="text-xs font-medium">
                      {weapon.usageCount}
                    </span>
                  </div>
                </div>

                <Progress
                  value={Math.min((weapon.totalDamage / 100000) * 100, 100)}
                  className="mt-3 h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Combat Effectiveness by Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crosshair className="h-5 w-5" />
            Combat Effectiveness by Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.combatEffectivenessByMap.map((map) => (
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
                  <Badge className={getCombatRatingColor(map.combatRating)}>
                    {map.combatRating}
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-6 text-center">
                  <div>
                    <div className="font-semibold text-lg">
                      {map.avgKillsPerRaid.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">Kills/Raid</div>
                  </div>
                  <div>
                    <div className="font-semibold text-lg">
                      {formatNumber(map.avgDamagePerRaid)}
                    </div>
                    <div className="text-xs text-gray-500">Avg Damage</div>
                  </div>
                  <div>
                    <div className="font-semibold text-lg">
                      {map.damageRatio.toFixed(2)}x
                    </div>
                    <div className="text-xs text-gray-500">Damage Ratio</div>
                  </div>
                  <div>
                    <div
                      className={`font-semibold text-lg ${getCombatRatingColor(map.combatRating)}`}
                    >
                      {formatPercent(map.extractions / map.totalRounds)}
                    </div>
                    <div className="text-xs text-gray-500">Survival Rate</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Kill Combos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Top Kill Combos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.killCombos.slice(0, 6).map((combo) => (
              <div
                key={combo.roundId}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getComboIcon(combo.comboType)}
                  <div>
                    <div className="font-medium">{combo.comboType}</div>
                    <div className="text-sm text-gray-500">{combo.map}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-lg">{combo.totalKills}</div>
                  <div className="text-xs text-gray-500">
                    {combo.playerKills}P / {combo.arcKills}ARC
                  </div>
                  <div className="text-xs text-blue-600">
                    Efficiency: {combo.efficiency.toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
