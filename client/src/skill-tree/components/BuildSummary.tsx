import type { FC } from 'react';
import { useSkillTreeStore } from '../store/skillTreeStore';

export const BuildSummary: FC = () => {
  const summary = useSkillTreeStore((state) => {
    try {
      return state.getBuildSummary();
    } catch {
      return { fullyMaxed: [], partialInvestment: [], onePointWonders: [] };
    }
  });

  return (
    <div className="chamfered bg-charcoal border-2 border-panel-border p-6">
      <h2 className="terminal-header text-xl mb-6">RAIDER</h2>

      {/* One-Point Wonders / Keystones */}
      {summary.onePointWonders.length > 0 && (
        <div className="mb-6">
          <h3 className="text-industrial font-display uppercase text-sm mb-3 tracking-widest">
            ◆ Active Perks
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {summary.onePointWonders.map((skill) => (
              <div
                key={skill.id}
                className="chamfered-sm bg-industrial/10 border border-industrial p-2 flex items-center"
              >
                <span className="text-industrial text-2xl mr-2">⬢</span>
                <span className="text-text-primary text-xs font-body">
                  {skill.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fully Maxed Skills */}
      {summary.fullyMaxed.length > 0 && (
        <div className="mb-6">
          <h3 className="text-warning font-display uppercase text-sm mb-3 tracking-widest">
            ▸ Core Competencies
          </h3>
          <div className="space-y-2">
            {summary.fullyMaxed.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center justify-between chamfered-sm bg-warning/10 border border-warning/50 p-2"
              >
                <span className="text-warning font-bold text-sm uppercase">
                  {skill.name}
                </span>
                <span className="hud-data text-lg">
                  [{skill.currentRank}/{skill.maxRank}]
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {summary.fullyMaxed.length === 0 &&
        summary.onePointWonders.length === 0 && (
          <div className="text-center py-8 text-text-secondary">
            <p className="text-sm mb-2">NO SKILLS ALLOCATED</p>
            <p className="text-xs opacity-60">START TREE</p>
          </div>
        )}
    </div>
  );
};
