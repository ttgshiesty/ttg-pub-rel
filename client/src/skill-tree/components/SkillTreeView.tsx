import type { FC } from 'react';
import { SkillTreeGraph } from './SkillTreeGraph';
import { POSITIONED_SKILLS, SKILL_TREE_VIEWBOX } from '../data/skillsGraph';

export const SkillTreeView: FC = () => {
  return (
    <div className="flex-1 flex flex-col">
      <div className="chamfered bg-charcoal/50 p-4 overflow-x-auto">
        <h2 className="terminal-header text-2xl mb-4 text-center">
          𓃶જ⁀➴⌖💥🚀 SHIESTY SKILLZ 💥⌖💥🚀
        </h2>

        <div
          className="relative flex justify-start xl:justify-center"
          style={{ minWidth: SKILL_TREE_VIEWBOX.width }}
        >
          <SkillTreeGraph skills={POSITIONED_SKILLS} />
        </div>

        <div className="mt-4 text-center text-text-secondary text-sm border-t border-panel-border pt-4">
          <p className="font-mono">
            <span className="text-warning">◄</span> Left Click: Allocate Point
            <span className="mx-3">|</span>
            Right Click: Remove Point <span className="text-warning">►</span>
          </p>
          <div className="mt-3 flex justify-center gap-6 text-xs">
            <span className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: '#12FF70' }}
              ></span>
              <span>Conditioning</span>
            </span>
            <span className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: '#F7CF09' }}
              ></span>
              <span>Mobility</span>
            </span>
            <span className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: '#F3040E' }}
              ></span>
              <span>Survival</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
