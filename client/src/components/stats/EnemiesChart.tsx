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

interface Enemy {
  name: string;
  count?: number;
  kills?: number;
  targetId?: number;
}

interface EnemiesChartProps {
  enemies: Enemy[];
  title?: string;
  color?: string;
}

export function EnemiesChart({
  enemies,
  title = 'ARC Enemies Destroyed by Type',
  color = '#ffc601',
}: EnemiesChartProps) {
  const chartData = useMemo(() => {
    if (!Array.isArray(enemies)) return [];
    
    // All 18 canonical ARC enemy types
    const canonicalEnemies = [
      { name: 'Wasp', targetId: 672378114 },
      { name: 'Fireball', targetId: 299263764 },
      { name: 'Tick', targetId: -352140120 },
      { name: 'Pop', targetId: -504231823 },
      { name: 'Hornet', targetId: 664422097 },
      { name: 'Turret', targetId: 913532953 },
      { name: 'Snitch', targetId: 1786451563 },
      { name: 'Firefly', targetId: -1524715377 },
      { name: 'Spotter', targetId: -1562077677 },
      { name: 'Shredder', targetId: 2015925366 },
      { name: 'Rocketeer', targetId: 903845622 },
      { name: 'Leaper', targetId: -541195755 },
      { name: 'Comet', targetId: -1780443771 },
      { name: 'Bastion', targetId: -1616729167 },
      { name: 'Bombardier', targetId: -1311527696 },
      { name: 'ARC Surveyor', targetId: 1143392102 },
      { name: 'Sentinel', targetId: -1122989322 },
      { name: 'Vaporizer', targetId: 1639912088 },
    ];

    // Merge with actual data
    const merged = canonicalEnemies.map((canonical) => {
      const found = enemies.find(
        (e) =>
          e.name === canonical.name ||
          e.targetId === canonical.targetId ||
          e.name?.toLowerCase() === canonical.name.toLowerCase()
      );
      return {
        name: canonical.name,
        targetId: canonical.targetId,
        kills: Number(found?.count ?? found?.kills ?? 0),
      };
    });

    return merged.sort((a, b) => b.kills - a.kills).slice(0, 10);
  }, [enemies]);

  const totalKills = useMemo(() => {
    return chartData.reduce((sum, e) => sum + e.kills, 0);
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="bg-arc-light-bg border border-[#1e1e1e]">
        <h3 className="text-sm font-semibold mb-4">{title}</h3>
        <div className="p-8 text-center text-muted-foreground text-sm">
          No ARC kill data available — destroy some ARC units to populate stats
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">
          {totalKills.toLocaleString()} destroyed
        </span>
      </div>
      <div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 54, bottom: 30 }}
            barCategoryGap={5}
          >
            <defs>
              <linearGradient id="enemyBarTop" x1="0" y1="0" x2="1" y2="0">
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
              width={96}
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
                        {data.kills.toLocaleString()} destroyed
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
                  fill={index === 0 ? 'url(#enemyBarTop)' : '#6b7280'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
