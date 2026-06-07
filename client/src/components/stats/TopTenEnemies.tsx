import { useMemo } from 'react';
import { Crosshair, Skull } from 'lucide-react';
import { ARC_BOT_FALLBACK_ICON, getArcBotIconById } from '../../lib/arcBotIcon';

interface Enemy {
  name: string;
  count?: number;
  kills?: number;
  targetId?: number;
}

interface TopTenEnemiesProps {
  enemies: Enemy[];
  title?: string;
  maxItems?: number;
  color?: string;
}

export function TopTenEnemies({
  enemies,
  title = 'Top ARC Units Killed',
  maxItems = 10,
  color = 'var(--color-arc-danger)',
}: TopTenEnemiesProps) {
  const sortedEnemies = useMemo(() => {
    if (!Array.isArray(enemies)) return [];
    return [...enemies]
      .filter((e) => e.name !== 'Player') // Exclude PvP kills
      .sort((a, b) => {
        const aCount = Number(a.count ?? a.kills ?? 0);
        const bCount = Number(b.count ?? b.kills ?? 0);
        return bCount - aCount;
      })
      .slice(0, maxItems);
  }, [enemies, maxItems]);

  const totalKills = useMemo(() => {
    return sortedEnemies.reduce(
      (sum, e) => sum + Number(e.count ?? e.kills ?? 0),
      0,
    );
  }, [sortedEnemies]);

  const maxCount = sortedEnemies[0]
    ? Number(sortedEnemies[0].count ?? sortedEnemies[0].kills ?? 0)
    : 1;

  if (sortedEnemies.length === 0) {
    return (
      <div className="bg-arc-light-bg border border-[#1e1e1e]">
        <div className="px-4 py-2.5 border-b border-[#141414] flex items-center gap-2">
          <Crosshair className="w-4 h-4" style={{ color }} />
          <h2 className="text-[10px] font-black uppercase tracking-widest">
            {title}
          </h2>
        </div>
        <div className="p-8 text-center text-muted-foreground text-sm">
          No ARC kill data available — destroy some ARC units to populate stats
        </div>
      </div>
    );
  }

  return (
    <div className="bg-arc-light-bg border border-[#1e1e1e]">
      <div className="px-4 py-2.5 border-b border-[#141414] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4" style={{ color }} />
          <h2 className="text-[10px] font-black uppercase tracking-widest">
            {title}
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {totalKills.toLocaleString()} total destroyed
        </span>
      </div>
      <div className="p-3 space-y-1.5">
        {sortedEnemies.map((enemy, index) => {
          const count = Number(enemy.count ?? enemy.kills ?? 0);
          const pct = (count / maxCount) * 100;
          const isTop = index === 0;
          const iconSrc = getArcBotIconById(enemy.targetId, enemy.name);

          return (
            <div
              key={enemy.targetId || enemy.name || index}
              className="flex items-center gap-2 text-xs group"
            >
              <span
                className={`w-5 h-5 flex items-center justify-center font-bold text-[10px] ${
                  isTop ? 'text-black' : 'text-muted-foreground'
                }`}
                style={{
                  backgroundColor: isTop ? color : 'var(--color-muted)',
                }}
              >
                {index + 1}
              </span>
              <img
                src={iconSrc}
                alt={enemy.name}
                className="w-5 h-5 rounded-[3px] object-contain bg-black/20 p-0.5 ring-1 ring-white/5"
                loading="lazy"
                draggable={false}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (img.src !== ARC_BOT_FALLBACK_ICON) {
                    img.src = ARC_BOT_FALLBACK_ICON;
                  }
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className="font-medium truncate"
                    style={{ color: isTop ? color : undefined }}
                  >
                    {enemy.name}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Skull className="w-3 h-3" />
                    {count.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isTop ? color : undefined,
                      opacity: isTop ? 1 : 0.7,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
