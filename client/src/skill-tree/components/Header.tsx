import type { FC } from 'react';
import { useState } from 'react';
import { useSkillTreeStore } from '../store/skillTreeStore';
import { SkillTreeLogo } from './svgs/SkillTreeLogo';
import { assetUrl } from '../../lib/assetUrl';

const TIER_CONFIG = [
  { tier: 0, bonusPoints: 0, label: 'Base' },
  { tier: 1, bonusPoints: 5, label: 'Tier 1' },
  { tier: 2, bonusPoints: 10, label: 'Tier 2' },
  { tier: 3, bonusPoints: 15, label: 'Tier 3' },
  { tier: 4, bonusPoints: 20, label: 'Tier 4' },
  { tier: 5, bonusPoints: 25, label: 'Tier 5' },
];

export const Header: FC = () => {
  const totalPoints = useSkillTreeStore((state) => state.totalPoints);
  const maxPoints = useSkillTreeStore((state) => state.maxPoints);
  const expeditionTier = useSkillTreeStore((state) => state.expeditionTier);
  const setExpeditionTier = useSkillTreeStore(
    (state) => state.setExpeditionTier,
  );
  const resetAllSkills = useSkillTreeStore((state) => state.resetAllSkills);
  const undo = useSkillTreeStore((state) => state.undo);
  const redo = useSkillTreeStore((state) => state.redo);
  const canUndo = useSkillTreeStore((state) => state.canUndo());
  const canRedo = useSkillTreeStore((state) => state.canRedo());
  const [tooltipTier, setTooltipTier] = useState<number | null>(null);

  const pointsRemaining = maxPoints - totalPoints;
  const isOverLimit = totalPoints > maxPoints;

  return (
    <header className="bg-charcoal border-b-2 border-panel-border p-6 scanlines grain">
      <div className="max-w-7xl mx-auto">
        {/* Title and Logo Area */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img
              src={assetUrl('dont.webp')}
              alt="DONT-SHOOT"
              className="w-10 h-10"
              loading="eager"
            />
            <div>
              <SkillTreeLogo className="text-[#D95204] h-8 w-auto" />
              <p className="text-text-secondary text-sm font-body">
                ᡕᠵデ气亠💥 ✷ εつ▄█▀█● SHiESTY💥RAiDERS 𓀐 💨 ╾━╤デ╦︻
              </p>
            </div>
          </div>

          {/* Point Counter */}
          <div className="chamfered bg-gunmetal border-2 border-warning px-8 py-4">
            <div className="text-center">
              <div
                className={`hud-data text-4xl mb-1 ${isOverLimit ? 'text-critical' : ''}`}
              >
                {totalPoints} / {maxPoints}
              </div>
              <div className="text-text-secondary text-xs uppercase tracking-wider">
                Skill Points
              </div>
              {pointsRemaining > 0 && (
                <div className="text-industrial text-sm mt-1">
                  {pointsRemaining} remaining
                </div>
              )}
              {isOverLimit && (
                <div className="text-critical text-xs mt-1 animate-pulse">
                  OVER LIMIT
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Expedition Tier Selector */}
          <div className="flex items-center gap-2 relative">
            <label className="text-text-secondary text-sm font-display uppercase tracking-wider">
              Expedition Tier:
            </label>
            <div className="flex gap-1">
              {TIER_CONFIG.map((config) => {
                const isActive = expeditionTier === config.tier;
                const totalAtTier = 75 + config.bonusPoints;
                const wouldBeOverLimit = totalPoints > totalAtTier;
                return (
                  <button
                    key={config.tier}
                    onClick={() => setExpeditionTier(config.tier)}
                    onMouseEnter={() => setTooltipTier(config.tier)}
                    onMouseLeave={() => setTooltipTier(null)}
                    className={`
                      chamfered-sm px-3 py-2 font-mono text-sm border-2 transition-smooth cursor-pointer
                      ${
                        isActive
                          ? 'bg-industrial/20 border-industrial text-industrial'
                          : wouldBeOverLimit
                            ? 'bg-critical/10 border-critical text-critical'
                            : 'bg-charcoal border-panel-border text-text-secondary hover:border-warning/50'
                      }
                    `}
                  >
                    {config.tier}
                  </button>
                );
              })}
            </div>
            {tooltipTier !== null && (
              <div className="absolute z-50 top-full left-0 mt-2 p-3 chamfered bg-gunmetal border-2 border-panel-border text-xs max-w-xs">
                <div className="font-display uppercase text-industrial mb-2">
                  {TIER_CONFIG[tooltipTier].label}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-text-secondary">Base Points:</span>
                    <span className="text-industrial">75</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-text-secondary">Bonus:</span>
                    <span className="text-industrial">
                      +{TIER_CONFIG[tooltipTier].bonusPoints}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-text-secondary">
                      Total Available:
                    </span>
                    <span className="text-industrial font-bold">
                      {75 + TIER_CONFIG[tooltipTier].bonusPoints}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-panel-border pt-1">
                    <span className="text-text-secondary">Points Spent:</span>
                    <span
                      className={
                        totalPoints > 75 + TIER_CONFIG[tooltipTier].bonusPoints
                          ? 'text-critical'
                          : 'text-industrial'
                      }
                    >
                      {totalPoints}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-text-secondary">Remaining:</span>
                    <span
                      className={
                        maxPoints - totalPoints < 0
                          ? 'text-critical'
                          : 'text-industrial'
                      }
                    >
                      {maxPoints - totalPoints}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 ml-auto">
            {/* Undo */}
            <button
              onClick={undo}
              disabled={!canUndo}
              className={`
                chamfered-sm px-4 py-2
                font-display uppercase text-sm
                border-2 transition-smooth
                ${
                  canUndo
                    ? 'bg-survival/10 border-survival text-survival hover:bg-survival/20 chromatic-hover'
                    : 'bg-charcoal border-panel-border text-text-secondary opacity-50 cursor-not-allowed'
                }
              `}
              title="Undo (Ctrl+Z)"
            >
              ◀ Undo
            </button>

            {/* Redo */}
            <button
              onClick={redo}
              disabled={!canRedo}
              className={`
                chamfered-sm px-4 py-2
                font-display uppercase text-sm
                border-2 transition-smooth
                ${
                  canRedo
                    ? 'bg-survival/10 border-survival text-survival hover:bg-survival/20 chromatic-hover'
                    : 'bg-charcoal border-panel-border text-text-secondary opacity-50 cursor-not-allowed'
                }
              `}
              title="Redo (Ctrl+Y)"
            >
              Redo ▶
            </button>

            {/* Reset All */}
            <button
              onClick={() => {
                if (
                  window.confirm(
                    'Reset all skills? This cannot be undone beyond the current history.',
                  )
                ) {
                  resetAllSkills();
                }
              }}
              className="
                chamfered-sm px-4 py-2
                font-display uppercase text-sm
                bg-critical/10 border-2 border-critical text-critical
                hover:bg-critical/20
                transition-smooth
                chromatic-hover
              "
            >
              ⟲ Reset All
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
