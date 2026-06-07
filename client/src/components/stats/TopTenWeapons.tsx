import { useMemo } from 'react';
import { Target, Skull } from 'lucide-react';
import { assetUrl } from '../../lib/assetUrl';
import {
  getItemDataByGameAssetId,
  getItemImg,
  getItemImgWebp,
} from '../../lib/itemDb';

interface Weapon {
  name: string;
  count?: number;
  kills?: number;
  weaponAssetId?: number;
  itemId?: string;
  damage?: number;
  fireRate?: number;
  range?: number;
}

interface Armor {
  name: string;
  armorValue?: number;
  rarity?: string;
}

interface ArcRaidersItem {
  name: string;
  rarity?: string;
  itemId?: string;
  damage?: number;
  fireRate?: number;
  range?: number;
}

interface TopTenWeaponsProps {
  weapons: Weapon[];
  title?: string;
  maxItems?: number;
  color?: string;
}

function getWeaponIcon(weapon: Weapon) {
  const assetItem = getItemDataByGameAssetId(weapon.weaponAssetId);
  const itemId = weapon.itemId || assetItem?.id;
  return (
    getItemImg(itemId) ||
    getItemImgWebp(itemId) ||
    assetItem?.icon ||
    assetUrl('/icons/t_ui_generic_weapon.webp')
  );
}

export interface Stats {
  count: number;
  average: number;
  min: number;
  max: number;
  sum: number;
}

export function calculateStats(values: number[]): Stats {
  if (values.length === 0) {
    return {
      count: 0,
      average: 0,
      min: 0,
      max: 0,
      sum: 0,
    };
  }

  const sum = values.reduce((acc, val) => acc + val, 0);
  const average = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  return {
    count: values.length,
    average: Number(average.toFixed(2)),
    min,
    max,
    sum,
  };
}

export function getWeaponStats(weapons: Weapon[]): {
  damage?: Stats;
  fireRate?: Stats;
  range?: Stats;
} {
  const damage = weapons
    .map((w) => w.damage)
    .filter((d): d is number => typeof d === 'number');

  const fireRate = weapons
    .map((w) => w.fireRate)
    .filter((fr): fr is number => typeof fr === 'number');

  const range = weapons
    .map((w) => w.range)
    .filter((r): r is number => typeof r === 'number');

  return {
    damage: damage.length > 0 ? calculateStats(damage) : undefined,
    fireRate: fireRate.length > 0 ? calculateStats(fireRate) : undefined,
    range: range.length > 0 ? calculateStats(range) : undefined,
  };
}

export function getArmorStats(armor: Armor[]): {
  armor?: Stats;
} {
  const armorValues = armor
    .map((a) => a.armorValue)
    .filter((a): a is number => typeof a === 'number');

  return {
    armor: armorValues.length > 0 ? calculateStats(armorValues) : undefined,
  };
}

export function getrarityDistribution(
  items: ArcRaidersItem[],
): Record<string, number> {
  const distribution: Record<string, number> = {};

  items.forEach((item) => {
    const rarity = item.rarity || 'unknown';
    distribution[rarity] = (distribution[rarity] || 0) + 1;
  });

  return distribution;
}

export function findBestWeapon(
  weapons: Weapon[],
  criteria: 'damage' | 'fireRate' | 'range' = 'damage',
): Weapon | null {
  if (weapons.length === 0) {
    return null;
  }

  const getValue = (weapon: Weapon): number => {
    switch (criteria) {
      case 'damage':
        return weapon.damage || 0;
      case 'fireRate':
        return weapon.fireRate || 0;
      case 'range':
        return weapon.range || 0;
      default:
        return 0;
    }
  };

  return weapons.reduce((best, current) => {
    return getValue(current) > getValue(best) ? current : best;
  });
}

export function findBestArmor(
  armor: Armor[],
  criteria: 'armor' = 'armor',
): Armor | null {
  if (armor.length === 0) {
    return null;
  }

  const getValue = (a: Armor): number => {
    switch (criteria) {
      case 'armor':
        return a.armorValue || 0;
      default:
        return 0;
    }
  };

  return armor.reduce((best, current) => {
    return getValue(current) > getValue(best) ? current : best;
  });
}

export function TopTenWeapons({
  weapons,
  title = 'Top Weapons by Kills',
  maxItems = 10,
  color = 'var(--color-arc-epic)',
}: TopTenWeaponsProps) {
  const sortedWeapons = useMemo(() => {
    if (!Array.isArray(weapons)) return [];
    return [...weapons]
      .sort((a, b) => {
        const aCount = Number(a.count ?? a.kills ?? 0);
        const bCount = Number(b.count ?? b.kills ?? 0);
        return bCount - aCount;
      })
      .slice(0, maxItems);
  }, [weapons, maxItems]);

  const totalKills = useMemo(() => {
    return sortedWeapons.reduce(
      (sum, w) => sum + Number(w.count ?? w.kills ?? 0),
      0,
    );
  }, [sortedWeapons]);

  const maxCount = sortedWeapons[0]
    ? Number(sortedWeapons[0].count ?? sortedWeapons[0].kills ?? 0)
    : 1;

  if (sortedWeapons.length === 0) {
    return (
      <div className="bg-arc-light-bg border border-[#1e1e1e]">
        <div className="px-4 py-2.5 border-b border-[#141414] flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color }} />
          <h2 className="text-[10px] font-black uppercase tracking-widest">
            {title}
          </h2>
        </div>
        <div className="p-8 text-center text-muted-foreground text-sm">
          No weapon data available — play a raid to populate stats
        </div>
      </div>
    );
  }

  return (
    <div className="bg-arc-light-bg border border-[#1e1e1e]">
      <div className="px-4 py-2.5 border-b border-[#141414] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color }} />
          <h2 className="text-[10px] font-black uppercase tracking-widest">
            {title}
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {totalKills.toLocaleString()} total kills
        </span>
      </div>
      <div className="p-3 space-y-1.5">
        {sortedWeapons.map((weapon, index) => {
          const count = Number(weapon.count ?? weapon.kills ?? 0);
          const pct = (count / maxCount) * 100;
          const isTop = index === 0;
          const iconSrc = getWeaponIcon(weapon);

          return (
            <div
              key={weapon.weaponAssetId || weapon.itemId || weapon.name || index}
              className="flex items-center gap-2 text-xs group"
            >
              <span
                className={`w-5 h-5 flex items-center justify-center font-bold text-[10px] ${
                  isTop
                    ? 'bg-arc-yellow text-black'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index + 1}
              </span>
              <img
                src={iconSrc}
                alt={weapon.name}
                className="w-5 h-5 rounded-[3px] object-contain bg-black/20 p-0.5 ring-1 ring-white/5"
                loading="lazy"
                draggable={false}
                onError={(e) => {
                  if (!e.currentTarget.dataset.fallback) {
                    e.currentTarget.dataset.fallback = '1';
                    e.currentTarget.src = assetUrl(
                      '/icons/T_UI_Generic_Weapon.webp',
                    );
                  }
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className={`font-medium truncate ${isTop ? 'text-arc-yellow' : ''}`}
                  >
                    {weapon.name}
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
                      backgroundColor: isTop ? color : 'var(--color-arc-rare)',
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
