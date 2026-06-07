import { useMemo } from 'react';
import { Star, Target, Zap } from 'lucide-react';

interface Weapon {
  name: string;
  count?: number;
  kills?: number;
  damage?: number;
  itemId?: string;
}

interface WeaponMasteryCardProps {
  weapons: Weapon[];
  title?: string;
}

interface MasteryWeapon extends Weapon {
  masteryScore: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  stars: number;
}

const TIERS = [
  { name: 'bronze', threshold: 0, color: '#cd7f32', icon: '🥉' },
  { name: 'silver', threshold: 100, color: '#c0c0c0', icon: '🥈' },
  { name: 'gold', threshold: 250, color: '#ffd700', icon: '🥇' },
  { name: 'platinum', threshold: 500, color: '#e5e4e2', icon: '💎' },
  { name: 'diamond', threshold: 1000, color: '#b9f2ff', icon: '💠' },
];

function calculateMastery(kills: number): {
  tier: string;
  stars: number;
  color: string;
  icon: string;
} {
  let tier = TIERS[0];
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (kills >= TIERS[i].threshold) {
      tier = TIERS[i];
      break;
    }
  }

  // Stars based on progress within tier
  let stars = 1;
  const nextTier = TIERS.find((t) => t.threshold > tier.threshold);
  if (nextTier) {
    const range = nextTier.threshold - tier.threshold;
    const progress = kills - tier.threshold;
    stars = Math.min(5, Math.max(1, Math.ceil((progress / range) * 5)));
  } else {
    stars = 5; // Max tier gets 5 stars
  }

  return { tier: tier.name, stars, color: tier.color, icon: tier.icon };
}

export function WeaponMasteryCard({
  weapons,
  title = 'Weapon Mastery',
}: WeaponMasteryCardProps) {
  const masteryWeapons = useMemo<MasteryWeapon[]>(() => {
    if (!Array.isArray(weapons)) return [];
    return weapons
      .map((w) => {
        const kills = Number(w.count ?? w.kills ?? 0);
        const damage = Number(w.damage ?? 0);
        // Mastery score: kills * 10 + damage / 100
        const masteryScore = kills * 10 + Math.floor(damage / 100);
        const { tier, stars } = calculateMastery(kills);
        return {
          ...w,
          masteryScore,
          tier: tier as MasteryWeapon['tier'],
          stars,
        };
      })
      .sort((a, b) => b.masteryScore - a.masteryScore);
  }, [weapons]);

  const totalMastery = useMemo(() => {
    return masteryWeapons.reduce((sum, w) => sum + w.masteryScore, 0);
  }, [masteryWeapons]);

  if (masteryWeapons.length === 0) {
    return null;
  }

  return (
    <div className="bg-arc-light-bg border border-[#1e1e1e]">
      <div className="px-4 py-2.5 border-b border-[#141414] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-arc-yellow" />
          <h2 className="text-[10px] font-black uppercase tracking-widest">
            {title}
          </h2>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {totalMastery.toLocaleString()} mastery pts
        </span>
      </div>
      <div className="p-3 space-y-2">
        {masteryWeapons.map((weapon, index) => {
          const kills = Number(weapon.count ?? weapon.kills ?? 0);
          const { color, icon } = calculateMastery(kills);
          const isTop = index === 0;

          return (
            <div
              key={weapon.itemId || weapon.name || index}
              className={`flex items-center gap-3 p-2 rounded border ${
                isTop ? 'border-arc-yellow bg-arc-yellow/5' : 'border-border/50'
              }`}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-lg">{icon}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: weapon.stars }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-2.5 h-2.5"
                      style={{ color }}
                      fill={color}
                    />
                  ))}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`font-semibold text-sm truncate ${isTop ? 'text-arc-yellow' : ''}`}
                  >
                    {weapon.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {kills.toLocaleString()} kills
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (kills / 1000) * 100)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-medium" style={{ color }}>
                    {weapon.tier.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
