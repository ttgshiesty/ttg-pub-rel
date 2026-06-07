import { useMemo } from 'react';
import { Gauge, Timer, TrendingUp } from 'lucide-react';

interface RaidEfficiencyGaugeProps {
  netProfit: number;
  survivalRate: number;
  totalDurationSeconds: number;
  totalRounds: number;
  title?: string;
}

function formatCredits(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}K`;
  return Math.round(value).toLocaleString();
}

export function RaidEfficiencyGauge({
  netProfit,
  survivalRate,
  totalDurationSeconds,
  totalRounds,
  title = 'Raid Efficiency Score',
}: RaidEfficiencyGaugeProps) {
  const stats = useMemo(() => {
    const minutes = totalDurationSeconds > 0 ? totalDurationSeconds / 60 : 0;
    const profitPerMinute = minutes > 0 ? netProfit / minutes : 0;
    const normalizedSurvival =
      survivalRate > 1 ? survivalRate / 100 : survivalRate;
    const efficiency = profitPerMinute * Math.max(0, normalizedSurvival);
    const avgProfit = totalRounds > 0 ? netProfit / totalRounds : 0;
    const avgDuration =
      totalRounds > 0 ? totalDurationSeconds / totalRounds : 0;
    const baseline = Math.max(
      Math.abs(profitPerMinute),
      Math.abs(avgProfit),
      1,
    );
    const pct = Math.min(
      100,
      Math.max(0, (Math.max(0, efficiency) / baseline) * 100),
    );

    return {
      efficiency,
      profitPerMinute,
      avgProfit,
      avgDuration,
      pct,
    };
  }, [netProfit, survivalRate, totalDurationSeconds, totalRounds]);

  if (totalRounds <= 0) {
    return (
      <div className="bg-arc-light-bg border border-[#1e1e1e]">
        <div className="px-4 py-2.5 border-b border-[#141414] flex items-center gap-2">
          <Gauge className="w-4 h-4 text-arc-yellow" />
          <h2 className="text-[10px] font-black uppercase tracking-widest">
            {title}
          </h2>
        </div>
        <div className="p-8 text-center text-muted-foreground text-sm">
          No raid efficiency data available — complete raids to populate this
          gauge
        </div>
      </div>
    );
  }

  return (
    <div className="bg-arc-light-bg border border-[#1e1e1e]">
      <div className="px-4 py-2.5 border-b border-[#141414] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-arc-yellow" />
          <h2 className="text-[10px] font-black uppercase tracking-widest">
            {title}
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatCredits(stats.profitPerMinute)} / min
        </span>
      </div>
      <div className="p-4">
        <div className="relative h-4 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${stats.pct}%`,
              background:
                'linear-gradient(90deg, var(--color-arc-danger), var(--color-arc-yellow))',
            }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div className="border border-border/50 p-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              Score
            </div>
            <div className="font-black text-arc-yellow mt-1">
              {formatCredits(stats.efficiency)}
            </div>
          </div>
          <div className="border border-border/50 p-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Timer className="w-3 h-3" />
              Avg Time
            </div>
            <div className="font-black mt-1">
              {Math.round(stats.avgDuration / 60).toLocaleString()}m
            </div>
          </div>
          <div className="border border-border/50 p-2">
            <div className="text-muted-foreground">Avg Profit</div>
            <div className="font-black mt-1">
              {formatCredits(stats.avgProfit)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
