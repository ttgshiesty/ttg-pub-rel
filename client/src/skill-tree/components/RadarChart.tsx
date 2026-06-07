import type { FC } from 'react';
import { useMemo } from 'react';
import {
  Radar,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import { useSkillTreeStore } from '../store/skillTreeStore';
import type { RadarData, SkillTreeType } from '../types';

const EMPTY_RADAR_DATA: RadarData = {
  Agility: 0,
  Resilience: 0,
  Endurance: 0,
  Stealth: 0,
  Logistics: 0,
  Utility: 0,
};

const getPointsInTree = (
  skills: ReturnType<typeof useSkillTreeStore.getState>['skills'],
  tree: SkillTreeType,
) => {
  return skills
    .filter((skill) => skill.tree === tree)
    .reduce((sum, skill) => sum + skill.currentRank, 0);
};

const buildRadarData = (
  skills: ReturnType<typeof useSkillTreeStore.getState>['skills'],
): RadarData => {
  const baseValues: RadarData = {
    Agility: 10,
    Resilience: 10,
    Endurance: 10,
    Stealth: 10,
    Logistics: 10,
    Utility: 10,
  };

  skills.forEach((skill) => {
    if (skill.currentRank <= 0) return;

    Object.entries(skill.radarImpact).forEach(([key, value]) => {
      if (typeof value !== 'number') return;
      const statKey = key as keyof RadarData;
      const multiplier = skill.type === 'scaling' ? skill.currentRank : 1;
      baseValues[statKey] += value * multiplier;
    });
  });

  return {
    Agility: Math.min(100, (baseValues.Agility / 150) * 100),
    Resilience: Math.min(100, (baseValues.Resilience / 150) * 100),
    Endurance: Math.min(100, (baseValues.Endurance / 150) * 100),
    Stealth: Math.min(100, (baseValues.Stealth / 150) * 100),
    Logistics: Math.min(100, (baseValues.Logistics / 150) * 100),
    Utility: Math.min(100, (baseValues.Utility / 150) * 100),
  };
};

export const RadarChart: FC = () => {
  const skills = useSkillTreeStore((state) => state.skills);
  const totalPoints = useSkillTreeStore((state) => state.totalPoints);

  const radarData = useMemo(() => {
    try {
      return buildRadarData(skills);
    } catch {
      return EMPTY_RADAR_DATA;
    }
  }, [skills]);

  const condPoints = useMemo(
    () => getPointsInTree(skills, 'Conditioning'),
    [skills],
  );
  const mobPoints = useMemo(
    () => getPointsInTree(skills, 'Mobility'),
    [skills],
  );
  const survPoints = useMemo(
    () => getPointsInTree(skills, 'Survival'),
    [skills],
  );

  const dominantColor = useMemo(() => {
    const max = Math.max(condPoints, mobPoints, survPoints);
    if (max === 0) return '#D95204'; // Default warning orange
    if (condPoints === max) return '#D95204'; // Conditioning orange
    if (mobPoints === max) return '#3c668d'; // Mobility blue
    return '#4c7510'; // Survival green
  }, [condPoints, mobPoints, survPoints]);

  const chartData = useMemo(
    () => [
      { stat: 'AGILITY', value: radarData.Agility, fullMark: 100 },
      { stat: 'RESILIENCE', value: radarData.Resilience, fullMark: 100 },
      { stat: 'ENDURANCE', value: radarData.Endurance, fullMark: 100 },
      { stat: 'STEALTH', value: radarData.Stealth, fullMark: 100 },
      { stat: 'LOGISTICS', value: radarData.Logistics, fullMark: 100 },
      { stat: 'UTILITY', value: radarData.Utility, fullMark: 100 },
    ],
    [radarData],
  );

  return (
    <div className="chamfered bg-charcoal border-2 border-panel-border p-6">
      <h2 className="terminal-header text-xl mb-4 text-center">
        PERFORMANCE ANALYSIS
      </h2>

      {totalPoints > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <RechartsRadar data={chartData}>
            <PolarGrid stroke="#2C3038" strokeWidth={1} />
            <PolarAngleAxis
              dataKey="stat"
              tick={{
                fill: '#E0E0E0',
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 'bold',
              }}
            />
            <Radar
              name="Stats"
              dataKey="value"
              stroke={dominantColor}
              fill={dominantColor}
              fillOpacity={0.4}
              strokeWidth={2}
            />
          </RechartsRadar>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-text-secondary">
          <div className="text-center">
            <p className="text-sm mb-2">NO DATA</p>
            <p className="text-xs opacity-60">
              Allocate skills to see analysis
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="text-center">
          <div className="hud-data text-lg">
            {Math.round(radarData.Agility)}
          </div>
          <div className="text-text-secondary">AGI</div>
        </div>
        <div className="text-center">
          <div className="hud-data text-lg">
            {Math.round(radarData.Resilience)}
          </div>
          <div className="text-text-secondary">RES</div>
        </div>
        <div className="text-center">
          <div className="hud-data text-lg">
            {Math.round(radarData.Endurance)}
          </div>
          <div className="text-text-secondary">END</div>
        </div>
        <div className="text-center">
          <div className="hud-data text-lg">
            {Math.round(radarData.Stealth)}
          </div>
          <div className="text-text-secondary">STL</div>
        </div>
        <div className="text-center">
          <div className="hud-data text-lg">
            {Math.round(radarData.Logistics)}
          </div>
          <div className="text-text-secondary">LOG</div>
        </div>
        <div className="text-center">
          <div className="hud-data text-lg">
            {Math.round(radarData.Utility)}
          </div>
          <div className="text-text-secondary">UTL</div>
        </div>
      </div>
    </div>
  );
};
