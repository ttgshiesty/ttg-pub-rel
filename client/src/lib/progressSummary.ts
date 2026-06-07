/**
 * progressSummary — Local progress aggregator for the My Profile page.
 * Combines local storage completions + catalog data to produce
 * source-aware status cards, completion counts, and import/export helpers.
 */
import {
  getCompletions,
  getCompletionsCount,
  importCompletions,
  exportCompletions,
  clearCompletions,
} from './completionsStorage';
import type { CompletionsData } from './completionsStorage';

export interface ProgressSummary {
  quests: { completed: number; total: number; pct: number };
  projects: { completed: number; total: number; pct: number };
  workshops: { completed: number; total: number; pct: number };
  total: { completed: number; total: number; pct: number };
  lastUpdated: string | null;
}

/**
 * Build a progress summary from local completions.
 * The `totals` argument should come from fetching catalog counts
 * (quests/projects/workshops from either ARDB or MetaForge).
 */
export function buildProgressSummary(totals: {
  quests: number;
  projects: number;
  workshops: number;
}): ProgressSummary {
  const local = getCompletionsCount();
  const lastUpdated = getCompletions().lastUpdated ?? null;

  const safeDiv = (n: number, d: number) =>
    d > 0 ? Math.round((n / d) * 100) : 0;

  return {
    quests: {
      completed: local.quests,
      total: Math.max(local.quests, totals.quests),
      pct: safeDiv(local.quests, totals.quests),
    },
    projects: {
      completed: local.projects,
      total: Math.max(local.projects, totals.projects),
      pct: safeDiv(local.projects, totals.projects),
    },
    workshops: {
      completed: local.workshops,
      total: Math.max(local.workshops, totals.workshops),
      pct: safeDiv(local.workshops, totals.workshops),
    },
    total: {
      completed: local.total,
      total: Math.max(
        local.total,
        totals.quests + totals.projects + totals.workshops,
      ),
      pct: safeDiv(
        local.total,
        totals.quests + totals.projects + totals.workshops,
      ),
    },
    lastUpdated,
  };
}

/**
 * Export local completions as a downloadable JSON blob.
 */
export function downloadCompletions() {
  const data = exportCompletions();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ttg-completions-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import completions from a JSON file. Returns true on success.
 */
export function importCompletionsFromFile(
  file: File,
  mode: 'merge' | 'replace',
): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(
          e.target?.result as string,
        ) as Partial<CompletionsData>;
        resolve(importCompletions(data, mode));
      } catch {
        resolve(false);
      }
    };
    reader.onerror = () => resolve(false);
    reader.readAsText(file);
  });
}

/**
 * Reset all local completions (with confirmation).
 */
export function resetCompletions(): boolean {
  return clearCompletions();
}
