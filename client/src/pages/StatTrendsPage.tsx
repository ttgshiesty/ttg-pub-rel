import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  Activity,
  Target,
  Clock,
  Map,
  Swords,
  Package,
  Crosshair,
  BarChart3,
  Flame,
  Shield,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { assetUrl } from '../lib/assetUrl';

/* ─── Palette ─────────────────────────────────────────────────────────────── */
const YELLOW = 'var(--color-arc-yellow)';
const CYAN = 'var(--color-arc-rare)';
const GREEN = 'var(--color-arc-uncommon)';
const RED = 'var(--color-arc-danger)';
const MUTED = 'var(--color-arc-muted)';
const CARD = 'var(--color-arc-light-background)';
const BORDER = 'var(--color-arc-border)';
const CHART_TOP_BAR = '#ffc601';
const CHART_BAR = '#6b7280';

/* ─── Round field normalizers (same as RaidHistoryPage) ──────────────────── */
const num = (v: any, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const rStatus = (r: any) =>
  (r.outcome || r.status || '').toString().toLowerCase();
const rIsEx = (r: any) => {
  const s = rStatus(r);
  return s === 'extracted' || s.includes('extract');
};
const rProfit = (r: any) => num(r.netValue ?? r.netProfit ?? r.profit ?? 0);
const rExtracted = (r: any) => num(r.valueExtracted ?? r.lootValue ?? 0);
const rBroughtIn = (r: any) => num(r.valueBroughtIn ?? r.loadoutValue ?? 0);
const rDmg = (r: any) => num(r.damage ?? r.damageDealt ?? r.totalDamage ?? 0);
const rArcK = (r: any) => num(r.arcKills ?? r.arcDestroyed ?? 0);
const rPvpK = (r: any) => num(r.playerKills ?? r.pvpKills ?? r.kills ?? 0);
const rDurSec = (r: any) =>
  r.durationMs != null
    ? num(r.durationMs) / 1000
    : num(r.duration ?? r.durationSeconds ?? 0);
const rDate = (r: any) =>
  r.roundEndedAt || r.syncedAt || r.playedAt || r.timestamp || '';
const rMap = (r: any) =>
  (r.mapName || r.map_name || r.map || 'Unknown').replace(/_/g, ' ');
const rScore = (r: any) => num(r.score ?? r.xp ?? r.experience ?? 0);
const rContainers = (r: any) =>
  num(r.containersLooted ?? r.lootedContainers ?? 0);

/* ─── Shared sub-components ──────────────────────────────────────────────── */
function SectionHead({
  icon: Icon,
  label,
  color = YELLOW,
  sub,
}: {
  icon: any;
  label: string;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <Icon className="w-5 h-5 shrink-0" style={{ color }} />
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest text-white">
          {label}
        </h2>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            {sub}
          </p>
        )}
      </div>
      <div className="flex-1 h-px ml-3" style={{ background: BORDER }} />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color = 'var(--color-arc-white)',
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      className="border p-3 flex flex-col gap-1"
      style={{
        background: CARD,
        borderColor: BORDER,
        borderLeftColor: color,
        borderLeftWidth: 2,
      }}
    >
      <p
        className="text-xs font-black uppercase tracking-widest"
        style={{ color: MUTED }}
      >
        {label}
      </p>
      <p className="text-xl font-black leading-none" style={{ color }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs" style={{ color: MUTED }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div
      className="flex items-center justify-center py-12 border"
      style={{ borderColor: BORDER, background: CARD }}
    >
      <p
        className="text-xs font-black uppercase tracking-widest"
        style={{ color: MUTED }}
      >
        {label}
      </p>
    </div>
  );
}

const TIP_STYLE = {
  contentStyle: {
    background: '#0d0a14',
    border: `1px solid ${BORDER}`,
    borderRadius: 0,
    fontSize: 11,
  },
  labelStyle: { color: MUTED, fontSize: 10 },
  itemStyle: { color: 'var(--color-arc-white)', fontSize: 11 },
};

/* ═══════════════════════════════════════════════════════════════════════════
   1. DAMAGE EFFICIENCY — damage per minute per raid
══════════════════════════════════════════════════════════════════════════════ */
function DamageEfficiencyChart({ rounds }: { rounds: any[] }) {
  const data = useMemo(() => {
    return [...rounds]
      .sort(
        (a, b) => new Date(rDate(a)).getTime() - new Date(rDate(b)).getTime(),
      )
      .map((r, i) => {
        const dur = rDurSec(r);
        const dpm = dur > 0 ? Math.round((rDmg(r) / dur) * 60) : 0;
        return { i: i + 1, dpm, map: rMap(r), extract: rIsEx(r) };
      });
  }, [rounds]);

  if (!data.length) return <EmptyState label="Not enough raid data" />;
  const avg = Math.round(data.reduce((s, d) => s + d.dpm, 0) / data.length);

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <StatCard
          label="Avg Dmg/Min"
          value={avg.toLocaleString()}
          color={RED}
        />
        <StatCard
          label="Peak Dmg/Min"
          value={Math.max(...data.map((d) => d.dpm)).toLocaleString()}
          color={YELLOW}
        />
        <StatCard label="Raids Tracked" value={data.length} color={MUTED} />
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="dpmGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={RED} stopOpacity={0.3} />
              <stop offset="100%" stopColor={RED} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={BORDER}
            vertical={false}
          />
          <XAxis
            dataKey="i"
            tick={{ fill: MUTED, fontSize: 9 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: MUTED, fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={38}
          />
          <ReferenceLine
            y={avg}
            stroke={YELLOW}
            strokeDasharray="4 3"
            strokeWidth={1}
          />
          <ReTip
            {...TIP_STYLE}
            formatter={(v: any) => [`${v} dmg/min`, 'Efficiency']}
            labelFormatter={(i) => `Raid #${i}`}
          />
          <Area
            dataKey="dpm"
            stroke={RED}
            fill="url(#dpmGrad)"
            strokeWidth={1.8}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-xs mt-2" style={{ color: MUTED }}>
        Yellow line = your average. Shows whether you are becoming more or less
        aggressive raid-over-raid.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. LOOT-TO-RISK INDEX — extracted / (broughtIn + 1)
══════════════════════════════════════════════════════════════════════════════ */
function LootRiskChart({ rounds }: { rounds: any[] }) {
  const data = useMemo(() => {
    return [...rounds]
      .sort(
        (a, b) => new Date(rDate(a)).getTime() - new Date(rDate(b)).getTime(),
      )
      .filter((r) => rExtracted(r) > 0 || rBroughtIn(r) > 0)
      .map((r, i) => {
        const idx = parseFloat(
          (rExtracted(r) / (rBroughtIn(r) + 1)).toFixed(2),
        );
        return { i: i + 1, idx, map: rMap(r), extract: rIsEx(r) };
      });
  }, [rounds]);

  if (!data.length) return <EmptyState label="No loot value data available" />;
  const avg = parseFloat(
    (data.reduce((s, d) => s + d.idx, 0) / data.length).toFixed(2),
  );
  const best = Math.max(...data.map((d) => d.idx));

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <StatCard
          label="Avg Risk Index"
          value={`${avg}x`}
          color={CYAN}
          sub="extracted ÷ risked"
        />
        <StatCard label="Best Single Raid" value={`${best}x`} color={YELLOW} />
        <StatCard
          label="Raids w/ Loot Data"
          value={data.length}
          color={MUTED}
        />
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="i"
            tick={{ fill: MUTED, fontSize: 9 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: MUTED, fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <ReferenceLine
            y={1}
            stroke={RED}
            strokeDasharray="4 3"
            strokeWidth={1}
            label={{
              value: 'BREAK-EVEN',
              fill: RED,
              fontSize: 8,
              position: 'right',
            }}
          />
          <ReferenceLine
            y={avg}
            stroke={YELLOW}
            strokeDasharray="4 3"
            strokeWidth={1}
          />
          <ReTip
            {...TIP_STYLE}
            formatter={(v: any) => [`${v}x`, 'Risk Multiplier']}
            labelFormatter={(i) => `Raid #${i}`}
          />
          <Bar dataKey="idx" radius={0} maxBarSize={18}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.idx >= 1 ? CYAN : RED} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs mt-2" style={{ color: MUTED }}>
        Red bars = you extracted less than you risked. Cyan = profitable raid.
        Red dashed = break-even line.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. SURVIVAL STREAK TRACKER
══════════════════════════════════════════════════════════════════════════════ */
function StreakTracker({ rounds }: { rounds: any[] }) {
  const { streak, bestStreak, pattern } = useMemo(() => {
    const sorted = [...rounds].sort(
      (a, b) => new Date(rDate(a)).getTime() - new Date(rDate(b)).getTime(),
    );
    let cur = 0,
      best = 0;
    for (const r of sorted) {
      if (rIsEx(r)) {
        cur++;
        best = Math.max(best, cur);
      } else cur = 0;
    }
    const pattern = sorted.map((r) => rIsEx(r));
    return { streak: cur, bestStreak: best, pattern };
  }, [rounds]);

  if (!rounds.length) return <EmptyState label="No raid data yet" />;

  return (
    <div>
      <div className="flex gap-3 mb-5">
        <StatCard
          label="Current Streak"
          value={streak}
          color={streak > 0 ? GREEN : RED}
          sub="consecutive extracts"
        />
        <StatCard label="Best Ever Streak" value={bestStreak} color={YELLOW} />
        <StatCard
          label="Raids Analyzed"
          value={pattern.filter(Boolean).length}
          color={CYAN}
          sub="extractions"
        />
      </div>
      <div>
        <p
          className="text-xs font-black uppercase tracking-widest mb-3"
          style={{ color: MUTED }}
        >
          Raid Pattern — W/L
        </p>
        <div className="flex flex-wrap gap-1.5">
          {pattern.map((win, i) => (
            <div
              key={i}
              title={win ? 'Extracted' : 'Died'}
              className="w-6 h-6 flex items-center justify-center text-xs font-black border transition-all"
              style={{
                background: win ? `${GREEN}20` : `${RED}15`,
                borderColor: win ? `${GREEN}60` : `${RED}40`,
                color: win ? GREEN : RED,
              }}
            >
              {win ? 'W' : 'L'}
            </div>
          ))}
        </div>
        {streak >= 3 && (
          <div
            className="mt-3 flex items-center gap-2 px-3 py-2 border"
            style={{ borderColor: `${GREEN}50`, background: `${GREEN}08` }}
          >
            <Flame className="w-4 h-4" style={{ color: GREEN }} />
            <span
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: GREEN }}
            >
              {streak} EXTRACTION STREAK — ON FIRE
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. ARC KILL EFFICIENCY — arc kills per minute topside
══════════════════════════════════════════════════════════════════════════════ */
function ArcKillEfficiencyChart({ rounds }: { rounds: any[] }) {
  const data = useMemo(() => {
    return [...rounds]
      .sort(
        (a, b) => new Date(rDate(a)).getTime() - new Date(rDate(b)).getTime(),
      )
      .map((r, i) => {
        const dur = rDurSec(r);
        const kpm =
          dur > 0 ? parseFloat(((rArcK(r) / dur) * 60).toFixed(2)) : 0;
        return { i: i + 1, kpm, arcKills: rArcK(r), map: rMap(r) };
      });
  }, [rounds]);

  if (!data.length) return <EmptyState label="No ARC kill data" />;
  const avg = parseFloat(
    (data.reduce((s, d) => s + d.kpm, 0) / data.length).toFixed(2),
  );

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <StatCard label="Avg ARC Kills/Min" value={avg} color={RED} />
        <StatCard
          label="Peak ARC Kills/Min"
          value={Math.max(...data.map((d) => d.kpm))}
          color={YELLOW}
        />
        <StatCard
          label="Total ARC Kills"
          value={data.reduce((s, d) => s + d.arcKills, 0).toLocaleString()}
          color={MUTED}
        />
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart
          data={data}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        >
          <XAxis
            dataKey="i"
            tick={{ fill: MUTED, fontSize: 9 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: MUTED, fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <ReferenceLine
            y={avg}
            stroke={YELLOW}
            strokeDasharray="4 3"
            strokeWidth={1}
          />
          <ReTip
            {...TIP_STYLE}
            formatter={(v: any) => [`${v} kills/min`, 'ARC Efficiency']}
            labelFormatter={(i) => `Raid #${i}`}
          />
          <Line
            dataKey="kpm"
            stroke={RED}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: RED }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs mt-2" style={{ color: MUTED }}>
        Short raids with high kills score higher. Yellow dashed = career
        average.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. SCAVENGE RATE — containers looted per minute
══════════════════════════════════════════════════════════════════════════════ */
function ScavengeRateChart({ rounds }: { rounds: any[] }) {
  const data = useMemo(() => {
    return [...rounds]
      .sort(
        (a, b) => new Date(rDate(a)).getTime() - new Date(rDate(b)).getTime(),
      )
      .map((r, i) => {
        const dur = rDurSec(r);
        const cpm =
          dur > 0 ? parseFloat(((rContainers(r) / dur) * 60).toFixed(2)) : 0;
        return { i: i + 1, cpm, containers: rContainers(r), map: rMap(r) };
      });
  }, [rounds]);

  if (!data.length) return <EmptyState label="No container data available" />;
  const avg = parseFloat(
    (data.reduce((s, d) => s + d.cpm, 0) / data.length).toFixed(2),
  );
  const totalContainers = data.reduce((s, d) => s + d.containers, 0);

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <StatCard label="Avg Containers/Min" value={avg} color={CYAN} />
        <StatCard
          label="Peak Containers/Min"
          value={Math.max(...data.map((d) => d.cpm))}
          color={YELLOW}
        />
        <StatCard
          label="Total Looted"
          value={totalContainers.toLocaleString()}
          color={MUTED}
        />
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="scavGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CYAN} stopOpacity={0.3} />
              <stop offset="100%" stopColor={CYAN} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="i"
            tick={{ fill: MUTED, fontSize: 9 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: MUTED, fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <ReferenceLine
            y={avg}
            stroke={YELLOW}
            strokeDasharray="4 3"
            strokeWidth={1}
          />
          <ReTip
            {...TIP_STYLE}
            formatter={(v: any) => [`${v} containers/min`, 'Scavenge Rate']}
            labelFormatter={(i) => `Raid #${i}`}
          />
          <Area
            dataKey="cpm"
            stroke={CYAN}
            fill="url(#scavGrad)"
            strokeWidth={1.8}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-xs mt-2" style={{ color: MUTED }}>
        How efficiently you loot per minute. Higher = better route knowledge.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. TIME-OF-DAY PERFORMANCE — extract rate by hour bucket
══════════════════════════════════════════════════════════════════════════════ */
const HOUR_BUCKETS = [
  { label: '12AM–6AM', start: 0, end: 6 },
  { label: '6AM–12PM', start: 6, end: 12 },
  { label: '12PM–6PM', start: 12, end: 18 },
  { label: '6PM–12AM', start: 18, end: 24 },
];

function TimeOfDayChart({ rounds }: { rounds: any[] }) {
  const data = useMemo(() => {
    const buckets = HOUR_BUCKETS.map((b) => ({
      ...b,
      total: 0,
      extracted: 0,
      profit: 0,
    }));
    for (const r of rounds) {
      const d = rDate(r);
      if (!d) continue;
      const hour = new Date(d).getHours();
      const bucket = buckets.find((b) => hour >= b.start && hour < b.end);
      if (!bucket) continue;
      bucket.total++;
      if (rIsEx(r)) bucket.extracted++;
      bucket.profit += rProfit(r);
    }
    return buckets.map((b) => ({
      label: b.label,
      rate:
        b.total > 0
          ? parseFloat(((b.extracted / b.total) * 100).toFixed(1))
          : 0,
      raids: b.total,
      avgProfit: b.total > 0 ? Math.round(b.profit / b.total) : 0,
    }));
  }, [rounds]);

  const best = data.reduce((a, b) => (b.rate > a.rate ? b : a), data[0]);

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <StatCard
          label="Best Time Window"
          value={best?.label || '—'}
          color={GREEN}
          sub={`${best?.rate || 0}% extract rate`}
        />
        <StatCard
          label="Best Avg Profit"
          value={`$${(data.reduce((a, b) => (b.avgProfit > a.avgProfit ? b : a), data[0])?.avgProfit || 0).toLocaleString()}`}
          color={YELLOW}
        />
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: MUTED, fontSize: 9 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: MUTED, fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={30}
            unit="%"
          />
          <ReTip
            {...TIP_STYLE}
            formatter={(v: any, name: string, props: any) => [
              `${v}% (${props.payload.raids} raids)`,
              'Extract Rate',
            ]}
          />
          <Bar dataKey="rate" radius={0} maxBarSize={40}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.label === best?.label ? GREEN : CYAN}
                fillOpacity={0.75}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs mt-2" style={{ color: MUTED }}>
        Based on {rounds.filter((r) => !!rDate(r)).length} raids with
        timestamps. Green = your best performing time window.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. WEAPON DAMAGE SHARE — career total from weaponDamageBreakdown
══════════════════════════════════════════════════════════════════════════════ */
function WeaponDamageChart({ rounds }: { rounds: any[] }) {
  const weapons = useMemo(() => {
    const tally: Record<string, number> = {};
    for (const r of rounds) {
      if (Array.isArray(r.weaponDamageBreakdown)) {
        for (const w of r.weaponDamageBreakdown) {
          const name: string = w.weaponName || w.name || w.weapon || 'Unknown';
          tally[name] = (tally[name] || 0) + num(w.amount ?? w.damage ?? 0);
        }
      }
    }
    const total: number = Object.values(tally).reduce(
      (s: number, v: number) => s + v,
      0,
    );
    return Object.entries(tally)
      .map(([name, damage]: [string, number]) => ({
        name,
        damage,
        pct: total > 0 ? parseFloat(((damage / total) * 100).toFixed(1)) : 0,
      }))
      .sort(
        (a: { damage: number }, b: { damage: number }) => b.damage - a.damage,
      );
  }, [rounds]);

  if (!weapons.length)
    return <EmptyState label="No weapon breakdown data in your rounds yet" />;
  const total = weapons.reduce((s, w) => s + w.damage, 0);
  const chartData = weapons.slice(0, 10);

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Weapons by Damage</h3>
        <span className="text-xs text-muted-foreground">
          {total.toLocaleString()} total
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 16, left: 74, bottom: 30 }}
          barCategoryGap={5}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#27272a"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={{ stroke: '#27272a' }}
            tickLine={false}
            tickFormatter={(v) =>
              num(v) >= 1000 ? `${Math.round(num(v) / 1000)}K` : `${v}`
            }
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fill: '#fafafa', fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <ReTip
            {...TIP_STYLE}
            formatter={(v: any, _: string, p: any) => [
              `${num(v).toLocaleString()} dmg (${p.payload.pct}%)`,
              p.payload.name,
            ]}
          />
          <Bar dataKey="damage" radius={[0, 4, 4, 0]}>
            {chartData.map((w, i) => (
              <Cell
                key={w.name}
                fill={i === 0 ? CHART_TOP_BAR : CHART_BAR}
                fillOpacity={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. MAP PROFIT RATE — profit per minute on each map
══════════════════════════════════════════════════════════════════════════════ */
function MapProfitRateChart({ rounds }: { rounds: any[] }) {
  const maps = useMemo(() => {
    const groups: Record<
      string,
      { profit: number; time: number; rounds: number }
    > = {};
    for (const r of rounds) {
      const m = rMap(r);
      if (!groups[m]) groups[m] = { profit: 0, time: 0, rounds: 0 };
      groups[m].profit += rProfit(r);
      groups[m].time += rDurSec(r);
      groups[m].rounds++;
    }
    return Object.entries(groups)
      .map(
        ([name, g]: [
          string,
          { profit: number; time: number; rounds: number },
        ]) => ({
          name: name.length > 14 ? name.slice(0, 13) + '…' : name,
          fullName: name,
          ppm: g.time > 0 ? Math.round((g.profit / g.time) * 60) : 0,
          rounds: g.rounds,
          avgProfit: g.rounds > 0 ? Math.round(g.profit / g.rounds) : 0,
        }),
      )
      .sort((a: { ppm: number }, b: { ppm: number }) => b.ppm - a.ppm);
  }, [rounds]);

  if (!maps.length) return <EmptyState label="No map data yet" />;
  const best = maps[0];

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <StatCard
          label="Most Profitable Map"
          value={best.fullName}
          color={GREEN}
          sub={`$${best.ppm}/min`}
        />
        <StatCard
          label="Best Avg/Raid"
          value={`$${maps.reduce((a: { avgProfit: number }, b: { avgProfit: number }) => (b.avgProfit > a.avgProfit ? b : a), maps[0]).avgProfit.toLocaleString()}`}
          color={YELLOW}
        />
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={maps}
          layout="vertical"
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fill: MUTED, fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: MUTED, fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={90}
          />
          <ReTip
            {...TIP_STYLE}
            formatter={(v: any, _: string, p: any) => [
              `$${v}/min (${p.payload.rounds} raids)`,
              'Profit Rate',
            ]}
          />
          <Bar dataKey="ppm" radius={0} maxBarSize={18}>
            {maps.map((m, i) => (
              <Cell
                key={i}
                fill={i === 0 ? GREEN : CYAN}
                fillOpacity={i === 0 ? 0.9 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs mt-2" style={{ color: MUTED }}>
        Profit per minute topside — tells you which map gives the best return on
        time, not just best total profit.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. QUEST COMPLETION BY TRADER
══════════════════════════════════════════════════════════════════════════════ */
function QuestTraderChart({ quests }: { quests: any }) {
  const data = useMemo(() => {
    const list: any[] =
      quests?.quests || quests?.items || (Array.isArray(quests) ? quests : []);
    const traders: Record<string, { total: number; done: number }> = {};
    for (const q of list) {
      const trader: string = q.trader || q.trader_name || 'Unknown';
      if (!traders[trader]) traders[trader] = { total: 0, done: 0 };
      traders[trader].total++;
      if (q.completed || q.done) traders[trader].done++;
    }
    return Object.entries(traders)
      .map(([name, g]: [string, { total: number; done: number }]) => ({
        name,
        pct:
          g.total > 0 ? parseFloat(((g.done / g.total) * 100).toFixed(1)) : 0,
        done: g.done,
        total: g.total,
      }))
      .sort((a: { pct: number }, b: { pct: number }) => b.pct - a.pct);
  }, [quests]);

  if (!data.length) return <EmptyState label="No quest data available" />;
  const totalDone: number = data.reduce(
    (s: number, d: { done: number }) => s + d.done,
    0,
  );
  const totalAll: number = data.reduce(
    (s: number, d: { total: number }) => s + d.total,
    0,
  );

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <StatCard
          label="Overall Completion"
          value={`${totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0}%`}
          color={YELLOW}
          sub={`${totalDone} / ${totalAll} quests`}
        />
        <StatCard
          label="Fully Complete Trader"
          value={data.find((d) => d.pct === 100)?.name || 'None yet'}
          color={GREEN}
        />
      </div>
      <div className="space-y-3">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-3">
            <div
              className="w-8 h-8 flex items-center justify-center shrink-0 border"
              style={{ background: `${YELLOW}10`, borderColor: `${YELLOW}30` }}
            >
              <img
                src={assetUrl(`/main/${d.name}.webp`)}
                alt={d.name}
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = '0';
                }}
              />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black uppercase text-white">
                  {d.name}
                </span>
                <span
                  className="text-xs font-black"
                  style={{ color: d.pct === 100 ? GREEN : YELLOW }}
                >
                  {d.done}/{d.total} — {d.pct}%
                </span>
              </div>
              <div
                className="h-2 overflow-hidden"
                style={{ background: BORDER }}
              >
                <div
                  className="h-full transition-all duration-700"
                  style={{
                    width: `${d.pct}%`,
                    background:
                      d.pct === 100
                        ? GREEN
                        : `linear-gradient(90deg, ${YELLOW}, ${CYAN})`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. ARC UNIT HUNTING — radar chart of all enemy unit kill totals
══════════════════════════════════════════════════════════════════════════════ */
function ArcUnitRadar({
  rounds,
  combatBreakdown,
  enemyKills,
}: {
  rounds: any[];
  combatBreakdown: any;
  enemyKills: any;
}) {
  const data = useMemo(() => {
    const tally: Record<string, number> = {};

    // Priority 1: dedicated enemy-kills endpoint — all enemy types with accurate lifetime counts
    const dedicatedEnemies = enemyKills?.enemies;
    if (Array.isArray(dedicatedEnemies) && dedicatedEnemies.length > 0) {
      for (const e of dedicatedEnemies) {
        const name = (e.name || '').trim();
        if (!name || name === 'Player') continue;
        tally[name] = num(e.count ?? e.kills ?? 0);
      }
    } else {
      // Priority 2: combatBreakdown unit_breakdown (server-aggregated)
      const bd =
        combatBreakdown?.unit_breakdown ||
        combatBreakdown?.unitBreakdown ||
        null;
      if (bd && typeof bd === 'object') {
        for (const [key, val] of Object.entries(bd)) {
          const name = key
            .replace(/^kills_/, '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase());
          if (name && name.toLowerCase() !== 'player')
            tally[name] = num(val as number);
        }
      }
      // Priority 3: aggregate from rounds arcBreakdown
      for (const r of rounds) {
        if (!Array.isArray(r.arcBreakdown)) continue;
        for (const e of r.arcBreakdown) {
          const name = (e.targetName || e.name || '').trim();
          if (!name || name === 'Self' || name === 'Player') continue;
          tally[name] = (tally[name] || 0) + num(e.kills ?? e.count ?? 0);
        }
      }
    }

    const entries = Object.entries(tally);
    const max = Math.max(...entries.map(([, v]) => v), 1);
    return entries
      .map(([unit, kills]) => ({
        unit,
        kills,
        pct: Math.round((kills / max) * 100),
      }))
      .sort((a, b) => b.kills - a.kills);
  }, [rounds, combatBreakdown, enemyKills]);

  const total = data.reduce((s, d) => s + d.kills, 0);

  if (!total)
    return <EmptyState label="No ARC kill breakdown data available yet" />;

  const chartData = data.slice(0, 10);

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">ARC Enemies Destroyed by Type</h3>
        <span className="text-xs text-muted-foreground">
          {total.toLocaleString()} total
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 16, left: 54, bottom: 30 }}
          barCategoryGap={5}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#27272a"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={{ stroke: '#27272a' }}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="unit"
            width={96}
            tick={{ fill: '#fafafa', fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <ReTip
            {...TIP_STYLE}
            formatter={(v: any) => [num(v).toLocaleString(), 'Kills']}
          />
          <Bar dataKey="kills" radius={[0, 4, 4, 0]}>
            {chartData.map((d, i) => (
              <Cell
                key={d.unit}
                fill={i === 0 ? CHART_TOP_BAR : CHART_BAR}
                fillOpacity={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════════ */
type TrendSection = {
  key: string;
  label: string;
  icon: any;
  color: string;
  sub: string;
};

const TREND_SECTIONS: TrendSection[] = [
  {
    key: 'dmg_eff',
    label: 'Damage Efficiency',
    icon: Flame,
    color: RED,
    sub: 'Damage dealt per minute topside',
  },
  {
    key: 'loot_risk',
    label: 'Loot-to-Risk Index',
    icon: TrendingUp,
    color: CYAN,
    sub: 'Extracted value ÷ value risked',
  },
  {
    key: 'streak',
    label: 'Survival Streak',
    icon: Shield,
    color: GREEN,
    sub: 'Extraction streaks & win/loss pattern',
  },
  {
    key: 'arc_eff',
    label: 'ARC Kill Efficiency',
    icon: Crosshair,
    color: RED,
    sub: 'ARC kills per minute topside',
  },
  {
    key: 'scavenge',
    label: 'Scavenge Rate',
    icon: Package,
    color: CYAN,
    sub: 'Containers looted per minute',
  },
  {
    key: 'time_of_day',
    label: 'Time-of-Day Performance',
    icon: Clock,
    color: YELLOW,
    sub: 'When you perform best',
  },
  {
    key: 'weapons',
    label: 'Weapon Damage Share',
    icon: Swords,
    color: YELLOW,
    sub: 'Career damage by weapon',
  },
  {
    key: 'map_profit',
    label: 'Map Profit Rate',
    icon: Map,
    color: GREEN,
    sub: 'Profit per minute by map',
  },
  {
    key: 'quests',
    label: 'Quest Trader Progress',
    icon: Activity,
    color: YELLOW,
    sub: 'Completion % per trader',
  },
  {
    key: 'arc_units',
    label: 'ARC Unit Hunt Profile',
    icon: Target,
    color: RED,
    sub: 'Radar of kills per ARC unit type',
  },
];

export default function StatTrendsPage() {
  const { rounds, combatBreakdown, enemyKills, quests, isLoading, authState } =
    usePlayer();
  const [active, setActive] = useState<string | null>(null);

  const allRounds = useMemo(
    () => (Array.isArray(rounds) ? rounds : []),
    [rounds],
  );

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <BarChart3
          className="w-10 h-10 animate-pulse"
          style={{ color: YELLOW }}
        />
        <p
          className="text-sm font-black uppercase tracking-[0.4em]"
          style={{ color: YELLOW }}
        >
          Loading Stat Trends…
        </p>
      </div>
    );
  }

  if (authState === 'no_user' || authState === 'needs_token') {
    return (
      <div className="max-w-4xl mx-auto px-4 mt-20 text-center">
        <div
          className="border p-12"
          style={{ background: CARD, borderColor: BORDER }}
        >
          <BarChart3
            className="w-12 h-12 mx-auto mb-6"
            style={{ color: YELLOW }}
          />
          <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">
            Token Required
          </h2>
          <p
            className="text-sm uppercase tracking-[0.3em]"
            style={{ color: MUTED }}
          >
            Link your ARC Raiders token in Settings to unlock trend analytics.
          </p>
        </div>
      </div>
    );
  }

  const renderSection = (key: string) => {
    switch (key) {
      case 'dmg_eff':
        return <DamageEfficiencyChart rounds={allRounds} />;
      case 'loot_risk':
        return <LootRiskChart rounds={allRounds} />;
      case 'streak':
        return <StreakTracker rounds={allRounds} />;
      case 'arc_eff':
        return <ArcKillEfficiencyChart rounds={allRounds} />;
      case 'scavenge':
        return <ScavengeRateChart rounds={allRounds} />;
      case 'time_of_day':
        return <TimeOfDayChart rounds={allRounds} />;
      case 'weapons':
        return <WeaponDamageChart rounds={allRounds} />;
      case 'map_profit':
        return <MapProfitRateChart rounds={allRounds} />;
      case 'quests':
        return <QuestTraderChart quests={quests} />;
      case 'arc_units':
        return (
          <ArcUnitRadar
            rounds={allRounds}
            combatBreakdown={combatBreakdown}
            enemyKills={enemyKills}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 mt-8 pb-20">
      {/* Page header */}
      <div className="border-b pb-5 mb-8" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-6 h-6" style={{ color: YELLOW }} />
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white">
            STAT <span style={{ color: YELLOW }}>TRENDS</span>
          </h1>
        </div>
        <p
          className="text-xs uppercase tracking-[0.4em]"
          style={{ color: MUTED }}
        >
          {allRounds.length.toLocaleString()} raids · dynamic metrics derived
          from live API data
        </p>
      </div>

      {/* Quick-pick pill navigation */}
      <div className="flex flex-wrap gap-2 mb-8">
        {TREND_SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActive(active === s.key ? null : s.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-widest border transition-all"
            style={{
              borderColor: active === s.key ? s.color : BORDER,
              color: active === s.key ? s.color : MUTED,
              background: active === s.key ? `${s.color}12` : 'transparent',
            }}
          >
            <s.icon className="w-3 h-3" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Sections — all expanded when nothing pinned, filtered when one is selected */}
      <div className="space-y-6">
        {TREND_SECTIONS.filter((s) => !active || s.key === active).map((s) => (
          <div
            key={s.key}
            className="border p-5 transition-all"
            style={{
              background: CARD,
              borderColor: active === s.key ? s.color : BORDER,
              boxShadow: active === s.key ? `0 0 20px ${s.color}18` : 'none',
            }}
          >
            <SectionHead
              icon={s.icon}
              label={s.label}
              color={s.color}
              sub={s.sub}
            />
            {renderSection(s.key)}
          </div>
        ))}
      </div>
    </div>
  );
}
