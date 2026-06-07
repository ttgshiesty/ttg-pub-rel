/**
 * trialsService.ts — MetaForge Weekly Trials Leaderboard
 *
 * Ported and updated from ADD/services/trialsService.ts
 * Uses the canonical MetaForge client (lib/metaforge.ts) for data fetching.
 */

import { getWeeklyTrials } from './metaForge';
import type { TrialPlayer } from '../types/arcApi';

export type { TrialPlayer };

export class TrialsService {
  /**
   * Rank-to-tier mapping based on percentile position.
   * Top 100 are always "Cantina Legend" regardless of total.
   */
  static getTier(rank: number, total: number): string {
    if (rank <= 100) return 'Cantina Legend';
    const pct = (rank / total) * 100;
    if (pct <= 5) return 'Daredevil I';
    if (pct <= 10) return 'Daredevil II';
    if (pct <= 15) return 'Daredevil III';
    if (pct <= 25) return 'Wildcard I';
    if (pct <= 35) return 'Wildcard II';
    if (pct <= 45) return 'Wildcard III';
    if (pct <= 50) return 'Tryhard I';
    if (pct <= 55) return 'Tryhard II';
    if (pct <= 60) return 'Hotshot';
    if (pct <= 75) return 'Tryhard III';
    if (pct <= 85) return 'Rookie I';
    if (pct <= 95) return 'Rookie II';
    return 'Rookie III';
  }

  /** Colour for a given tier label. */
  static getTierColor(tier: string): string {
    if (tier === 'Cantina Legend') return '#FFB800';
    if (tier.startsWith('Daredevil')) return '#FF073A';
    if (tier === 'Hotshot') return '#39FF14';
    if (tier.startsWith('Wildcard')) return '#00D1FF';
    if (tier.startsWith('Tryhard')) return '#7D00FF';
    return '#71717A';
  }

  /**
   * Fetch the current weekly trials leaderboard from MetaForge.
   * Returns null if the API is unavailable.
   *
   * @param trialId  optional specific trial ID; defaults to the current week
   */
  static async getWeeklyTrials(
    trialId?: string,
  ): Promise<TrialPlayer[] | null> {
    try {
      console.log(
        `[TrialsService] → getWeeklyTrials`,
        trialId ? `trialId=${trialId}` : '(current week)',
      );
      const res = await getWeeklyTrials(trialId);
      console.log('[TrialsService] ✓ raw response', res);

      if (!res) return null;

      const players: any[] = res.leaderboard ?? res.entries ?? [];
      if (players.length === 0) return [];

      const total = players.length;
      console.log(`[TrialsService] ✓ parsed ${total} players`);

      return players.map((p) => ({
        rank: p.rank ?? 0,
        userId: p.metaforge_id ?? p.id ?? '',
        username: p.username ?? 'Unknown',
        score: p.score ?? 0,
        tier: TrialsService.getTier(p.rank ?? total, total),
        percentile: total > 0 ? (p.rank / total) * 100 : 100,
      }));
    } catch (err) {
      console.error('[TrialsService] ✗ Failed to fetch weekly trials:', err);
      return null;
    }
  }
}
