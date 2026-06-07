export type ItemTag = 'keep' | 'sell' | 'recycle';

export interface Quest {
  id: string;
  name: { en: string; [lang: string]: string };
  requiredItemIds?: { itemId: string; quantity?: number }[];
}

export interface WorkshopLevel {
  itemId: string;
  quantity?: number;
}

export type WorkshopUpgrades = Record<string, Record<string, WorkshopLevel[]>>;

export interface ProjectPhase {
  phase: number;
  requirementItemIds?: { itemId: string; quantity?: number }[];
}

export interface Project {
  id: string;
  name: { en: string; [lang: string]: string };
  phases: ProjectPhase[];
}

export interface DependencyNode {
  itemId: string;
  depth: number;
  reason: string;
  source?: string;
}
