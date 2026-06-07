import { useMemo } from 'react';
import { Crosshair, Trophy, TrendingUp } from 'lucide-react';

interface Enemy {
  name: string;
  count?: number;
  kills?: number;
}

interface ARCHunterRankProps {
  enemies: Enemy[];
  title?: string;
}

interface RankTier {
  name: string;
  threshold: number;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}

const RANKS: RankTier[] = [
  {
    name: 'Recruit',
    threshold: 0,
    color: '#8b7355',
    bgColor: '#3d3225',
    icon: '🌱',
    description: 'Begin your hunt',
  },
  {
    name: 'Scout',
    threshold: 100,
    color: '#a0a0a0',
    bgColor: '#4a4a4a',
    icon: '🔭',
    description: 'Learning the patterns',
  },
  {
    name: 'Hunter',
    threshold: 500,
    color: '#cd7f32',
    bgColor: '#5a3a1a',
    icon: '🎯',
    description: 'Taking them down',
  },
  {
    name: 'Veteran',
    threshold: 1000,
    color: '#c0c0c0',
    bgColor: '#4a4a4a',
    icon: '⚔️',
    description: 'Seasoned ARC killer',
  },
  {
    name: 'Elite',
    threshold: 2500,
    color: '#ffd700',
    bgColor: '#5a4a00',
    icon: '🏆',
    description: 'Top percentile hunter',
  },
  {
    name: 'Legend',
    threshold: 5000,
    color: '#ff6b35',
    bgColor: '#5a2a15',
    icon: '👑',
    description: 'ARC units fear you',
  },
  {
    name: 'Mythic',
    threshold: 10000,
    color: '#ff00ff',
    bgColor: '#5a005a',
    icon: '🔥',
    description: 'Living legend',
  },
];

function getRank(totalKills: number): RankTier {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalKills >= RANKS[i].threshold) {
      return RANKS[i];
    }
  }
  return RANKS[0];
}

function getNextRank(currentRank: RankTier): RankTier | null {
  const currentIndex = RANKS.findIndex((r) => r.name === currentRank.name);
  return currentIndex < RANKS.length - 1 ? RANKS[currentIndex + 1] : null;
}

export function ARCHunterRank({
  enemies,
  title = 'ARC Hunter Rank',
}: ARCHunterRankProps) {
  const totalArcKills = useMemo(() => {
    if (!Array.isArray(enemies)) return 0;
    return enemies
      .filter((e) => e.name !== 'Player')
      .reduce((sum, e) => sum + Number(e.count ?? e.kills ?? 0), 0);
  }, [enemies]);

  const currentRank = useMemo(() => getRank(totalArcKills), [totalArcKills]);
  const nextRank = useMemo(() => getNextRank(currentRank), [currentRank]);

  const progressToNext = useMemo(() => {
    if (!nextRank) return 100;
    const range = nextRank.threshold - currentRank.threshold;
    const progress = totalArcKills - currentRank.threshold;
    return Math.min(100, Math.max(0, (progress / range) * 100));
  }, [totalArcKills, currentRank, nextRank]);

  const uniqueArcTypes = useMemo(() => {
    if (!Array.isArray(enemies)) return 0;
    return enemies.filter(
      (e) => e.name !== 'Player' && (e.count ?? e.kills ?? 0) > 0,
    ).length;
  }, [enemies]);

  return (
    <div className="bg-arc-light-bg border border-[#1e1e1e]">
      <div className="px-4 py-2.5 border-b border-[#141414] flex items-center gap-2">
        <Crosshair className="w-4 h-4 text-arc-danger" />
        <h2 className="text-[10px] font-black uppercase tracking-widest">
          {title}
        </h2>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl"
            style={{ backgroundColor: currentRank.bgColor }}
          >
            {currentRank.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span
                className="text-lg font-black uppercase"
                style={{ color: currentRank.color }}
              >
                {currentRank.name}
              </span>
              <Trophy
                className="w-4 h-4"
                style={{ color: currentRank.color }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {currentRank.description}
            </p>
            <div className="flex items-center gap-4 mt-1 text-xs">
              <span className="flex items-center gap-1">
                <Crosshair className="w-3 h-3 text-arc-danger" />
                {totalArcKills.toLocaleString()} destroyed
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {uniqueArcTypes} unit types
              </span>
            </div>
          </div>
        </div>

        {nextRank && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">
                Progress to {nextRank.name}
              </span>
              <span className="text-muted-foreground">
                {totalArcKills.toLocaleString()} /{' '}
                {nextRank.threshold.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressToNext}%`,
                  backgroundColor: currentRank.color,
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-center">
              {nextRank.threshold - totalArcKills} more kills to rank up
            </p>
          </div>
        )}

        {uniqueArcTypes > 0 && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              <span>
                You&apos;ve destroyed {uniqueArcTypes} different ARC unit types
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
