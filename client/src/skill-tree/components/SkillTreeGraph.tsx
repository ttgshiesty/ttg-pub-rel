import type { FC, MouseEvent } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSkillTreeStore } from '../store/skillTreeStore';
import type { Skill, SkillTreeType } from '../types';
import { SKILL_TREE_EDGES, SKILL_TREE_VIEWBOX } from '../data/skillsGraph';
import { BackgroundEffects } from './BackgroundEffects';
import { LockIcon } from './svgs/LockIcon';
import { ConnectionPaths } from './svgs/ConnectionPaths';
import { AnimatedRails } from './svgs/AnimatedRails';

interface SkillTreeGraphProps {
  skills: Skill[];
}

interface TooltipState {
  skill: Skill;
  x: number;
  y: number;
}

const TREE_COLORS: Record<SkillTreeType, string> = {
  Conditioning: '#12FF70',
  Mobility: '#F7CF09',
  Survival: '#F3040E',
};

const DISABLED_PATH = '#606576';
const NODE_BG = '#150A0B';
const TOOLTIP_BG = '#f4b539';
const NODE_OFFSET = 30;

const getTreeColor = (treeName: SkillTreeType) => TREE_COLORS[treeName];
const getSkillRadius = (skill: Skill) => (skill.type === 'binary' ? 29 : 25);
const getSkillIcon = (skill: Skill) =>
  skill.icon ?? `https://assets.shiesty.me/skills/${skill.id}.webp`;

export const SkillTreeGraph: FC<SkillTreeGraphProps> = memo(
  function SkillTreeGraph({ skills }) {
    const allocatePoint = useSkillTreeStore((state) => state.allocatePoint);
    const deallocatePoint = useSkillTreeStore((state) => state.deallocatePoint);
    const canAllocatePoint = useSkillTreeStore(
      (state) => state.canAllocatePoint,
    );
    const allSkills = useSkillTreeStore((state) => state.skills);
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);
    const openTimer = useRef<number | null>(null);
    const closeTimer = useRef<number | null>(null);
    const tooltipFrame = useRef<number | null>(null);

    const safeSkills = useMemo(
      () => (Array.isArray(skills) ? skills : []),
      [skills],
    );
    const skillStateById = useMemo(() => {
      return new Map(allSkills.map((skill) => [skill.id, skill]));
    }, [allSkills]);

    const clearTooltipTimers = useCallback(() => {
      if (openTimer.current) window.clearTimeout(openTimer.current);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      if (tooltipFrame.current)
        window.cancelAnimationFrame(tooltipFrame.current);
      openTimer.current = null;
      closeTimer.current = null;
      tooltipFrame.current = null;
    }, []);

    useEffect(() => clearTooltipTimers, [clearTooltipTimers]);

    const getSkillState = useCallback(
      (skill: Skill) => skillStateById.get(skill.id) || skill,
      [skillStateById],
    );

    const scheduleTooltipOpen = useCallback(
      (e: MouseEvent, skill: Skill) => {
        clearTooltipTimers();
        const { clientX, clientY } = e;
        openTimer.current = window.setTimeout(() => {
          setTooltip({ skill, x: clientX, y: clientY });
        }, 100);
      },
      [clearTooltipTimers],
    );

    const updateTooltipPosition = useCallback(
      (e: MouseEvent, skill: Skill) => {
        if (tooltip?.skill.id === skill.id) {
          const { clientX, clientY } = e;
          if (tooltipFrame.current)
            window.cancelAnimationFrame(tooltipFrame.current);
          tooltipFrame.current = window.requestAnimationFrame(() => {
            tooltipFrame.current = null;
            setTooltip({ skill, x: clientX, y: clientY });
          });
        }
      },
      [tooltip?.skill.id],
    );

    const scheduleTooltipClose = useCallback(() => {
      if (openTimer.current) window.clearTimeout(openTimer.current);
      closeTimer.current = window.setTimeout(() => setTooltip(null), 220);
    }, []);

    return (
      <div
        className="relative overflow-visible"
        style={{ display: 'inline-block' }}
      >
        <BackgroundEffects />
        <ConnectionPaths />
        <AnimatedRails />
        <svg
          width={SKILL_TREE_VIEWBOX.width}
          height={SKILL_TREE_VIEWBOX.height}
          className="skill-tree-graph"
          viewBox={`0 0 ${SKILL_TREE_VIEWBOX.width} ${SKILL_TREE_VIEWBOX.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {safeSkills.map((skill) => {
              const state = getSkillState(skill);
              const isMaxed =
                state.currentRank === state.maxRank && state.maxRank > 0;
              if (!isMaxed) return null;
              return (
                <pattern
                  key={`stripe-${skill.id}`}
                  id={`stripe-${skill.id}`}
                  patternUnits="userSpaceOnUse"
                  width="8"
                  height="8"
                  patternTransform="rotate(45)"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="8"
                    stroke={getTreeColor(skill.tree)}
                    strokeWidth="2"
                    opacity="0.35"
                  />
                </pattern>
              );
            })}
          </defs>

          <rect width="100%" height="100%" fill="#0F1115" />

          {SKILL_TREE_EDGES.map((edge) => {
            const fromState = skillStateById.get(edge.from);
            const toState = skillStateById.get(edge.to);
            const isActive = Boolean(
              fromState?.currentRank && toState?.currentRank,
            );
            const isPartiallyActive = Boolean(fromState?.currentRank);
            const color = getTreeColor(edge.tree);

            return (
              <g
                key={`${edge.from}-${edge.to}`}
                transform={`translate(${edge.x}, ${edge.y})`}
              >
                <path
                  d={edge.path}
                  stroke={
                    isActive ? color : isPartiallyActive ? color : DISABLED_PATH
                  }
                  strokeWidth={isActive ? 3 : 2}
                  strokeOpacity={isActive ? 1 : isPartiallyActive ? 0.55 : 0.65}
                  fill="none"
                  strokeLinecap="round"
                  className={
                    isActive
                      ? 'connection-line-main stroke-path-active'
                      : 'connection-line-main stroke-path-disabled'
                  }
                />
              </g>
            );
          })}

          {safeSkills.map((skill) => {
            const state = getSkillState(skill);
            const isActive = state.currentRank > 0;
            const isMaxed =
              state.currentRank === state.maxRank && state.maxRank > 0;
            const isLocked =
              !canAllocatePoint(skill.id) && state.currentRank === 0;
            const radius = getSkillRadius(skill);
            const treeColor = getTreeColor(skill.tree);
            const x = skill.uiPosition.x + NODE_OFFSET;
            const y = skill.uiPosition.y + NODE_OFFSET;

            return (
              <g
                key={skill.id}
                className="skill-button-group"
                style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                onClick={() => !isLocked && allocatePoint(skill.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  deallocatePoint(skill.id);
                }}
                onMouseEnter={(e) => scheduleTooltipOpen(e, skill)}
                onMouseMove={(e) => updateTooltipPosition(e, skill)}
                onMouseLeave={scheduleTooltipClose}
              >
                {isActive && (
                  <circle
                    cx={x}
                    cy={y}
                    r={radius + 12}
                    fill={treeColor}
                    opacity={0.22}
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={isActive ? `${treeColor}26` : NODE_BG}
                  stroke={
                    isActive ? treeColor : isLocked ? '#817D83' : DISABLED_PATH
                  }
                  strokeWidth={isActive ? 3 : 2}
                />
                {isMaxed && (
                  <circle
                    cx={x}
                    cy={y}
                    r={radius - 3}
                    fill={`url(#stripe-${skill.id})`}
                  />
                )}
                <image
                  href={getSkillIcon(skill)}
                  x={x - 15}
                  y={y - 15}
                  width={30}
                  height={30}
                  opacity={isLocked ? 0.35 : 1}
                  style={{ pointerEvents: 'none' }}
                />
                {isLocked && (
                  <foreignObject
                    x={x - 8}
                    y={y - 8}
                    width={16}
                    height={19}
                    style={{ pointerEvents: 'none' }}
                  >
                    <div className="flex h-full w-full items-center justify-center text-[#817D83]">
                      <LockIcon className="h-4 w-4" />
                    </div>
                  </foreignObject>
                )}
                <title>{skill.name}</title>
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="Barlow, sans-serif"
                  fontWeight="700"
                  fill={isLocked ? '#817D83' : '#fcf5e7'}
                  style={{ pointerEvents: 'none' }}
                >
                  {state.currentRank}/{skill.maxRank}
                </text>
                <circle cx={x} cy={y} r={radius + 20} fill="transparent" />
              </g>
            );
          })}
        </svg>

        {tooltip &&
          createPortal(
            <SkillHoverCard
              skill={tooltip.skill}
              state={getSkillState(tooltip.skill)}
              treeColor={getTreeColor(tooltip.skill.tree)}
              isLocked={
                !canAllocatePoint(tooltip.skill.id) &&
                getSkillState(tooltip.skill).currentRank === 0
              }
              x={tooltip.x}
              y={tooltip.y}
              onMouseEnter={clearTooltipTimers}
              onMouseLeave={scheduleTooltipClose}
            />,
            document.body,
          )}
      </div>
    );
  },
);

function Me({ knownValues }: { knownValues?: string | null }) {
  if (!knownValues) return null;
  return (
    <div className="space-y-1 border-t border-path-disabled/40 pt-1">
      <p className="text-[#817D83] font-barlow-regular text-xs italic">
        {knownValues}
      </p>
    </div>
  );
}

function Ie({ className = '' }: { className?: string }) {
  return (
    <svg
      width="15"
      height="19"
      viewBox="0 0 15 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect y="8.5" width="15" height="10" rx="1" fill="currentColor" />
      <path
        d="M3.99999 6.5C3.99999 6 3.49999 1 7.49999 1C11.5 1 11 6 11 6.5"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function SkillHoverCard({
  skill,
  state,
  treeColor,
  isLocked,
  x,
  y,
  onMouseEnter,
  onMouseLeave,
}: {
  skill: Skill;
  state: Skill;
  treeColor: string;
  isLocked: boolean;
  x: number;
  y: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const width = 328;
  const left = Math.max(12, Math.min(x + 14, window.innerWidth - width - 12));
  const top = Math.max(12, Math.min(y - 20, window.innerHeight - 230));

  return (
    <div
      className="skill-tooltip-card bg-tooltip text-tooltip-foreground animate-in fade-in-0 zoom-in-95"
      style={{ left, top, width, borderColor: treeColor }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <h3 className="text-lg uppercase font-barlow-semibold text-[#150A0B]">
        {skill.name}
      </h3>
      <p className="text-[#817D83] font-barlow-regular text-sm leading-snug">
        {skill.description}
      </p>
      {skill.effect && (
        <p className="text-[#150A0B] font-barlow-semibold text-sm">
          {skill.effect}
        </p>
      )}
      {isLocked && skill.reqPointsInTree > 0 ? (
        <span className="text-[#150A0B] uppercase text-md font-barlow-medium flex gap-1 items-center py-1">
          <Ie className="h-3.5 w-3.5" />
          Requires {skill.reqPointsInTree} points in {skill.tree}
        </span>
      ) : (
        <p className="text-[#150A0B] font-barlow-semibold">
          {state.currentRank}/{skill.maxRank}
        </p>
      )}
      <Me knownValues={skill.knownValues} />
    </div>
  );
}
