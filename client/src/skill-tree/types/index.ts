// Core Types for Arc Raiders Skill Tree

export type SkillTreeType = 'Conditioning' | 'Mobility' | 'Survival';

export type SkillType = 'scaling' | 'binary'; // scaling = 1-5 ranks, binary = keystone (1 rank)

export interface RadarImpact {
  Agility?: number;
  Resilience?: number;
  Endurance?: number;
  Stealth?: number;
  Logistics?: number;
  Utility?: number;
}

export interface Skill {
  id: string;
  name: string;
  tree: SkillTreeType;
  type: SkillType;
  maxRank: number;
  currentRank: number;
  reqPointsInTree: number; // Minimum total points required in this tree
  prerequisites: string[]; // IDs of skills that must have at least 1 point
  description: string;
  effectPerRank?: string; // e.g., "+5% per rank" for scaling skills
  effect?: string | null;
  knownValues?: string | null;
  videoUrl?: string | null;
  radarImpact: RadarImpact;
  uiPosition: {
    x: number; // Grid position X
    y: number; // Grid position Y
    tier: number; // Tier level (1-5)
  };
  icon?: string; // Path to skill icon image (e.g., '/icons/t_ui_charprog_*.webp')
}

export interface SkillTreeEdge {
  from: string;
  to: string;
  path: string;
  x: number;
  y: number;
  tree: SkillTreeType;
}

export interface BuildSummary {
  fullyMaxed: Skill[];
  partialInvestment: Skill[];
  onePointWonders: Skill[];
}

export interface RadarData {
  Agility: number;
  Resilience: number;
  Endurance: number;
  Stealth: number;
  Logistics: number;
  Utility: number;
}

export interface SkillTreeState {
  skills: Skill[];
  totalPoints: number;
  maxPoints: number;
  expeditionTier: number; // 0 = base game, higher = bonus points
  history: Skill[][]; // For undo/redo
  historyIndex: number;
  buildSummary: BuildSummary;

  // Actions
  allocatePoint: (skillId: string) => void;
  deallocatePoint: (skillId: string) => void;
  resetSkill: (skillId: string) => void;
  resetAllSkills: () => void;
  setExpeditionTier: (tier: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Computed values
  getPointsInTree: (tree: SkillTreeType) => number;
  canAllocatePoint: (skillId: string) => boolean;
  getBuildSummary: () => BuildSummary;
  getRadarData: () => RadarData;
}

export interface SkillNodeProps {
  skill: Skill;
  isLocked: boolean;
  isConnected: boolean;
  onClick: () => void;
  onRightClick: () => void;
}
