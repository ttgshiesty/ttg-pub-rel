import { useMemo } from 'react';
import { Skull } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface Weapon {
  name: string;
  count?: number;
  kills?: number;
  weaponAssetId?: number;
  itemId?: string;
}

interface WeaponsChartProps {
  weapons: Weapon[];
  title?: string;
  color?: string;
}

export function WeaponsChart({
  weapons,
  title = 'Weapons by Kills',
  color = '#ffc601',
}: WeaponsChartProps) {
  const chartData = useMemo(() => {
    if (!Array.isArray(weapons)) return [];
    return [...weapons]
      .sort((a, b) => {
        const aCount = Number(a.count ?? a.kills ?? 0);
        const bCount = Number(b.count ?? b.kills ?? 0);
        return bCount - aCount;
      })
      .map((w) => ({
        name: w.name,
        kills: Number(w.count ?? w.kills ?? 0),
        itemId: w.itemId,
        weaponAssetId: w.weaponAssetId,
      }))
      .slice(0, 10);
  }, [weapons]);

  const totalKills = useMemo(() => {
    return chartData.reduce((sum, w) => sum + w.kills, 0);
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="bg-arc-light-bg border border-[#1e1e1e]">
        <h3 className="text-sm font-semibold mb-4">{title}</h3>
        <div className="p-8 text-center text-muted-foreground text-sm">
          No weapon data available — play a raid to populate stats
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">
          {totalKills.toLocaleString()} kills
        </span>
      </div>
      <div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 74, bottom: 30 }}
            barCategoryGap={5}
          >
            <defs>
              <linearGradient id="weaponBarTop" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                <stop offset="100%" stopColor={color} stopOpacity={1} />
              </linearGradient>
            </defs>
            <XAxis
              type="number"
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              axisLine={{ stroke: '#27272a' }}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#fafafa', fontSize: 11, fontWeight: 500 }}
              width={120}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-arc-dark-bg border border-arc-border p-2 rounded">
                      <p className="text-white font-bold text-sm">{data.name}</p>
                      <p className="text-arc-yellow text-xs">
                        <Skull className="w-3 h-3 inline mr-1" />
                        {data.kills.toLocaleString()} kills
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="kills" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === 0 ? 'url(#weaponBarTop)' : '#6b7280'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
