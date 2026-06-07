import { useMemo, useState } from 'react';
import {
  Database,
  Filter,
  ArrowUpDown,
  Skull,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Target,
  Coins,
  Zap,
  Clock,
  Map,
  Radio,
  Crosshair,
  BarChart3,
  Activity,
  Swords,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { usePlayer } from '../context/PlayerContext';
import { assetUrl } from '../lib/assetUrl';
import arctrackerLabels from '../data/arctracker-en.json';

/* ── ARC Raiders palette ─────────────────────────────────── */
const YELLOW = 'var(--color-arc-yellow)';
const CYAN = 'var(--color-arc-rare)';
const GREEN = 'var(--color-arc-uncommon)';
const RED = 'var(--color-arc-danger)';
const MUTED = 'var(--color-arc-muted)';
const CARD = 'var(--color-arc-light-background)';
const BORDER = 'var(--color-arc-border)';
const BG = '#130918';
const RAID_LABELS = arctrackerLabels.RaidHistoryPage;
const EMBARK_STAT_LABELS = RAID_LABELS.embarkStats;
const MAP_LABELS = arctrackerLabels.MapNames;

/* ── Map image lookup ─────────────────────────────────────── */
function getMapImg(name: string): string {
  const n = (name || '').toLowerCase().replace(/_/g, ' ').trim();
  if (n.includes('stella') || n.includes('montis'))
    return assetUrl('/maps/stella.png');
  if (n.includes('spaceport') || n.includes('shuttle'))
    return assetUrl('/maps/spaceport.png');
  if (
    n.includes('dam') ||
    n.includes('reservoir') ||
    n.includes('battleground')
  )
    return assetUrl('/maps/dambattlegrounds.png');
  if (n.includes('buried') || n.includes('city'))
    return assetUrl('/maps/burriedcity.png');
  if (n.includes('riven') || n.includes('tides'))
    return assetUrl('/maps/riventides.webp');
  if (n.includes('gate') || n.includes('blue'))
    return assetUrl('/maps/bluegate.png');
  return assetUrl('/maps/burriedcity.png');
}

const SECTOR_MAPS = [
  { key: 'spaceport', label: MAP_LABELS.theSpaceport },
  { key: 'buried', label: 'Buried City' },
  { key: 'gate', label: 'The Blue Gate' },
  { key: 'stella', label: 'Stella Montis' },
  { key: 'dam', label: MAP_LABELS.damBattleground },
  { key: 'riven', label: 'Riven Tides' },
];

// ── ArcTracker field normalizers ─────────────────────────────
// ArcTracker v2 live fields use outcome, netValue, damage, score, durationMs,
// roundEndedAt. Fallbacks keep older MetaForge/legacy payloads readable.
const rStatus = (r: any) =>
  (r.outcome || r.status || '').toString().toLowerCase();
const rIsEx = (r: any) => {
  const s = rStatus(r);
  return s === 'extracted' || s.includes('extract');
};
const rIsDead = (r: any) => {
  const s = rStatus(r);
  return s === 'failed' || s === 'died' || s.includes('die');
};
const rProfit = (r: any) => Number(r.netValue ?? r.netProfit ?? r.profit ?? 0);
const rValueExtracted = (r: any) =>
  Number(r.valueExtracted ?? r.lootValue ?? r.extractedValue ?? 0);
const rValueBroughtIn = (r: any) =>
  Number(r.valueBroughtIn ?? r.loadoutValue ?? r.broughtInValue ?? 0);
const rDmg = (r: any) => Number(r.damage ?? r.damageDealt ?? r.totalDamage ?? 0);
const rArcK = (r: any) => Number(r.arcKills ?? r.arcDestroyed ?? 0);
const rPvpK = (r: any) => Number(r.playerKills ?? r.pvpKills ?? r.kills ?? 0);
const rKills = (r: any) => rArcK(r) + rPvpK(r);
const rXp = (r: any) => Number(r.score ?? r.xp ?? r.experience ?? 0);
const rDurSec = (r: any) =>
  r.durationMs != null
    ? Number(r.durationMs) / 1000
    : Number(r.duration ?? r.durationSeconds ?? 0);
const rDate = (r: any) =>
  r.roundEndedAt || r.syncedAt || r.playedAt || r.timestamp || '';
const rMap = (r: any) =>
  (r.mapName || r.map_name || r.map || 'Unknown').replace(/_/g, ' ');
const rContainers = (r: any) =>
  Number(r.containersLooted ?? r.lootedContainers ?? r.containers ?? 0);
const rDmgTaken = (r: any) => Number(r.damageTaken ?? r.damageReceived ?? 0);
const rHealed = (r: any) =>
  Number(r.healing ?? r.healed ?? r.healthRestored ?? 0);

function fmtDuration(s: number) {
  if (!s || !Number.isFinite(s)) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function timeAgo(dateStr: string) {
  if (!dateStr) return '—';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (!Number.isFinite(diff)) return '—';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

type SortKey =
  | 'date'
  | 'value'
  | 'kills'
  | 'score'
  | 'duration'
  | 'damage'
  | 'playerKills';
type View = 'history' | 'sector' | 'trends';

/* ── Stat tile ──────────────────────────────────────────── */
function Tile({
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
    <div className="stat-tile">
      <p className="stat-label">{label}</p>
      <p className="stat-value" style={{ color }}>
        {value}
      </p>
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  );
}

export default function RaidHistoryPage() {
  const { rounds, isLoading } = usePlayer();

  const [view, setView] = useState<View>('history');
  const [filterMap, setFilterMap] = useState('all');
  const [filterOutcome, setFilterOutcome] = useState('all');
  const [filterExpedition, setFilterExpedition] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterMinKills, setFilterMinKills] = useState(0);
  const [filterMinProfit, setFilterMinProfit] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [search, setSearch] = useState('');
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  const allRounds = useMemo(
    () => (Array.isArray(rounds) ? rounds : []),
    [rounds],
  );

  const uniqueMaps = useMemo(() => {
    const set = new Set<string>();
    allRounds.forEach((r: any) => {
      const m = r.mapName || r.map_name || r.map;
      if (m) set.add(m);
    });
    return Array.from(set).sort();
  }, [allRounds]);

  /* ── Full stats ── */
  const stats = useMemo(() => {
    const total = allRounds.length;
    const extracted = allRounds.filter(rIsEx).length;
    const deaths = allRounds.filter(rIsDead).length;
    const totalArcKills = allRounds.reduce(
      (s: number, r: any) => s + rArcK(r),
      0,
    );
    const totalPlayerKills = allRounds.reduce(
      (s: number, r: any) => s + rPvpK(r),
      0,
    );
    const totalKills = totalArcKills + totalPlayerKills;
    const totalDamage = allRounds.reduce((s: number, r: any) => s + rDmg(r), 0);
    const totalDmgTaken = allRounds.reduce(
      (s: number, r: any) => s + rDmgTaken(r),
      0,
    );
    const totalHealed = allRounds.reduce(
      (s: number, r: any) => s + rHealed(r),
      0,
    );
    const totalProfit = allRounds.reduce(
      (s: number, r: any) => s + rProfit(r),
      0,
    );
    const totalXp = allRounds.reduce((s: number, r: any) => s + rXp(r), 0);
    const totalSeconds = allRounds.reduce(
      (s: number, r: any) => s + rDurSec(r),
      0,
    );
    const totalContainers = allRounds.reduce(
      (s: number, r: any) => s + rContainers(r),
      0,
    );
    const syncedRaids = allRounds.filter(
      (r: any) => r.syncedAt || r.roundEndedAt,
    ).length;
    const legacyRaids = allRounds.filter(
      (r: any) => r.isLegacy === true,
    ).length;
    const profitableRaids = allRounds.filter((r: any) => rProfit(r) > 0).length;
    const bestRaidProfit = Math.max(0, ...allRounds.map(rProfit));
    const mostKillsRaid = Math.max(0, ...allRounds.map(rKills));
    const streakData = (() => {
      let cur = 0,
        best = 0;
      for (const r of allRounds) {
        if (rIsEx(r)) {
          cur++;
          best = Math.max(best, cur);
        } else cur = 0;
      }
      return best;
    })();
    return {
      total,
      extracted,
      deaths,
      totalKills,
      totalPlayerKills,
      totalArcKills,
      totalDamage,
      totalDmgTaken,
      totalHealed,
      totalProfit,
      totalXp,
      totalContainers,
      syncedRaids,
      legacyRaids,
      profitableRaids,
      bestRaidProfit,
      mostKillsRaid,
      streakData,
      hours: (totalSeconds / 3600).toFixed(1),
      avgProfit: total > 0 ? Math.round(totalProfit / total) : 0,
      avgKills: total > 0 ? (totalKills / total).toFixed(1) : '0',
      avgXp: total > 0 ? Math.round(totalXp / total) : 0,
      avgDmg: total > 0 ? Math.round(totalDamage / total) : 0,
      avgContainers: total > 0 ? (totalContainers / total).toFixed(1) : '0',
      avgDurSec: total > 0 ? totalSeconds / total : 0,
      extractRate: total > 0 ? ((extracted / total) * 100).toFixed(1) : '0',
      kd:
        deaths > 0
          ? (totalPlayerKills / deaths).toFixed(2)
          : totalPlayerKills > 0
            ? '∞'
            : '0',
      lootPerMin:
        totalSeconds > 0 ? Math.round(totalProfit / (totalSeconds / 60)) : 0,
    };
  }, [allRounds]);

  /* ── Per-map sector stats ── */
  const sectorStats = useMemo(() => {
    const s: Record<
      string,
      {
        rounds: number;
        extracted: number;
        kills: number;
        profit: number;
        damage: number;
        containers: number;
        totalDurSec: number;
        lastPlayed: string | null;
      }
    > = {};
    SECTOR_MAPS.forEach(({ label }) => {
      s[label] = {
        rounds: 0,
        extracted: 0,
        kills: 0,
        profit: 0,
        damage: 0,
        containers: 0,
        totalDurSec: 0,
        lastPlayed: null,
      };
    });
    allRounds.forEach((r: any) => {
      const raw = rMap(r).toLowerCase();
      const match = SECTOR_MAPS.find(({ key }) => raw.includes(key));
      if (!match) return;
      const e = s[match.label];
      e.rounds++;
      e.kills += rKills(r);
      e.profit += rProfit(r);
      e.damage += rDmg(r);
      e.containers += rContainers(r);
      e.totalDurSec += rDurSec(r);
      if (rIsEx(r)) e.extracted++;
      const ts = rDate(r);
      if (ts && (!e.lastPlayed || new Date(ts) > new Date(e.lastPlayed)))
        e.lastPlayed = ts;
    });
    return s;
  }, [allRounds]);

  /* ── Trend data (all raids chronological) ── */
  const trendData = useMemo(() => {
    return [...allRounds]
      .sort(
        (a: any, b: any) =>
          new Date(rDate(a)).getTime() - new Date(rDate(b)).getTime(),
      )
      .map((r: any, i: number) => ({
        i: i + 1,
        profit: rProfit(r),
        valueExtracted: rValueExtracted(r),
        valueBroughtIn: rValueBroughtIn(r),
        netValue: rProfit(r),
        kills: rKills(r),
        arcKills: rArcK(r),
        pvpKills: rPvpK(r),
        xp: rXp(r),
        damage: rDmg(r),
        dmgTaken: rDmgTaken(r),
        healed: rHealed(r),
        dur: Math.round((rDurSec(r) / 60) * 10) / 10,
        containers: rContainers(r),
        extract: rIsEx(r),
        map: rMap(r),
      }));
  }, [allRounds]);

  /* ── Recent activity (last 10) ── */
  const recentActivity = useMemo(
    () =>
      [...allRounds].sort(
        (a: any, b: any) =>
          new Date(rDate(b)).getTime() - new Date(rDate(a)).getTime(),
      ),
    [allRounds],
  );

  /* ── Filtered + sorted list ── */
  const filtered = useMemo(() => {
    let list = [...allRounds];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r: any) => rMap(r).toLowerCase().includes(q));
    }
    if (filterMap !== 'all')
      list = list.filter(
        (r: any) => rMap(r).toLowerCase() === filterMap.toLowerCase(),
      );
    if (filterOutcome !== 'all')
      list = list.filter((r: any) => {
        if (filterOutcome === 'extracted') return rIsEx(r);
        if (filterOutcome === 'died') return rIsDead(r);
        return true;
      });
    if (filterExpedition !== 'all')
      list = list.filter((r: any) => {
        if (filterExpedition === 'legacy') return r.isLegacy === true;
        if (filterExpedition === 'season1') return r.seasonNumber === 1;
        if (filterExpedition === 'season2') return r.seasonNumber === 2;
        return true;
      });
    if (filterDateFrom)
      list = list.filter(
        (r: any) => new Date(rDate(r)) >= new Date(filterDateFrom),
      );
    if (filterDateTo)
      list = list.filter(
        (r: any) => new Date(rDate(r)) <= new Date(filterDateTo),
      );
    if (filterMinKills > 0)
      list = list.filter((r: any) => rKills(r) >= filterMinKills);
    if (filterMinProfit > 0)
      list = list.filter((r: any) => rProfit(r) >= filterMinProfit);
    list.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'value':
          return rProfit(b) - rProfit(a);
        case 'kills':
          return rKills(b) - rKills(a);
        case 'score':
          return rXp(b) - rXp(a);
        case 'duration':
          return rDurSec(b) - rDurSec(a);
        case 'damage':
          return rDmg(b) - rDmg(a);
        case 'playerKills':
          return rPvpK(b) - rPvpK(a);
        case 'date':
        default:
          return new Date(rDate(b)).getTime() - new Date(rDate(a)).getTime();
      }
    });
    return list;
  }, [
    allRounds,
    filterMap,
    filterOutcome,
    filterExpedition,
    filterDateFrom,
    filterDateTo,
    filterMinKills,
    filterMinProfit,
    sortBy,
    search,
  ]);

  /* ── Pagination ── */
  const visibleRaids = useMemo(
    () => filtered.slice(0, page * PAGE_SIZE),
    [filtered, page],
  );
  const hasMore = visibleRaids.length < filtered.length;

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center text-sm uppercase tracking-[0.5em]"
        style={{ color: YELLOW }}
      >
        Loading Raid History...
      </div>
    );
  }

  const VIEWS = [
    { key: 'history', label: 'RAID LOG', icon: Database },
    { key: 'sector', label: 'SECTOR INTEL', icon: Radio },
    { key: 'trends', label: 'TREND ANALYSIS', icon: BarChart3 },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 mt-8 pb-20 space-y-6">
      {/* ── Page header ── */}
      <div className="border-b pb-4" style={{ borderColor: BORDER }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5" style={{ color: YELLOW }} />
            <h1 className="text-2xl font-black uppercase text-white tracking-tighter">
              RAIDS <span style={{ color: YELLOW }}>//</span> HISTORY
            </h1>
          </div>
          <div className="flex gap-1.5">
            {VIEWS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase tracking-widest border transition-all"
                style={{
                  borderColor: view === key ? YELLOW : BORDER,
                  color: view === key ? YELLOW : MUTED,
                  background: view === key ? `${YELLOW}10` : 'transparent',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <p
          className="text-xs uppercase tracking-[0.4em] mt-2"
          style={{ color: MUTED }}
        >
          {allRounds.length.toLocaleString()} raids tracked · {stats.hours}h
          topside
        </p>
      </div>

      {/* ══════════════════ HISTORY VIEW ══════════════════ */}
      {view === 'history' && (
        <>
          {/* ── Summary stats strip ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <Tile
              label="Total Raids"
              value={stats.total.toLocaleString()}
              color="var(--color-arc-white)"
            />
            <Tile
              label="Extraction %"
              value={`${stats.extractRate}%`}
              color={GREEN}
              sub={`${stats.extracted} extracts`}
            />
            <Tile
              label="Deaths"
              value={stats.deaths.toLocaleString()}
              color={RED}
            />
            <Tile
              label="PvP K/D"
              value={`${stats.kd}`}
              color={YELLOW}
              sub="PvP kills / deaths"
            />
            <Tile
              label="Total Kills"
              value={stats.totalKills.toLocaleString()}
              color={RED}
              sub={`${stats.totalPlayerKills} PvP · ${stats.totalArcKills} ARC`}
            />
            <Tile
              label={EMBARK_STAT_LABELS.netValue}
              value={`$${stats.totalProfit.toLocaleString()}`}
              color={YELLOW}
              sub={`avg $${stats.avgProfit.toLocaleString()}`}
            />
            <Tile
              label="Best Raid"
              value={`$${stats.bestRaidProfit.toLocaleString()}`}
              color={YELLOW}
            />
            <Tile
              label="Best Streak"
              value={`${stats.streakData}W`}
              color={GREEN}
              sub="extraction streak"
            />
          </div>

          {/* ── Extra stats row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <Tile label="Avg Kills/Raid" value={stats.avgKills} color={RED} />
            <Tile
              label="Avg XP/Raid"
              value={stats.avgXp.toLocaleString()}
              color={CYAN}
            />
            <Tile
              label="Profitable"
              value={`${stats.profitableRaids}/${stats.total}`}
              color={GREEN}
              sub="raids in profit"
            />
            <Tile
              label="Avg Damage"
              value={stats.avgDmg.toLocaleString()}
              color={RED}
              sub="per raid"
            />
            <Tile
              label="$/Min Topside"
              value={stats.lootPerMin.toLocaleString()}
              color={YELLOW}
              sub="loot efficiency"
            />
            <Tile
              label="Containers"
              value={
                stats.totalContainers > 0
                  ? stats.totalContainers.toLocaleString()
                  : '—'
              }
              color={CYAN}
              sub={`avg ${stats.avgContainers}/raid`}
            />
            <Tile
              label="Total Damage"
              value={
                stats.totalDamage > 0 ? stats.totalDamage.toLocaleString() : '—'
              }
              color={RED}
            />
            <Tile
              label="Most Kills"
              value={stats.mostKillsRaid.toLocaleString()}
              color={RED}
              sub="single raid"
            />
            <Tile
              label="Synced Raids"
              value={stats.syncedRaids.toLocaleString()}
              color={GREEN}
              sub="with timestamps"
            />
            <Tile
              label="Legacy"
              value={stats.legacyRaids.toLocaleString()}
              color={YELLOW}
              sub="pre-season 2"
            />
          </div>

          {/* ── Filters ── */}
          <div
            className="border p-4 space-y-3"
            style={{ background: CARD, borderColor: BORDER }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" style={{ color: MUTED }} />
                <span
                  className="text-sm font-black uppercase tracking-widest"
                  style={{ color: MUTED }}
                >
                  Filters
                </span>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Search map..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="border text-sm text-white px-3 py-2 outline-none min-w-[140px]"
                style={{ background: BG, borderColor: BORDER }}
              />

              {/* Map */}
              <select
                value={filterMap}
                onChange={(e) => setFilterMap(e.target.value)}
                className="border text-sm font-black uppercase text-white px-3 py-2 outline-none focus:border-[var(--color-arc-yellow)]"
                style={{ background: BG, borderColor: BORDER }}
              >
                <option value="all">All Maps</option>
                {uniqueMaps.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Outcome */}
              <select
                value={filterOutcome}
                onChange={(e) => setFilterOutcome(e.target.value)}
                className="border text-sm font-black uppercase text-white px-3 py-2 outline-none"
                style={{ background: BG, borderColor: BORDER }}
              >
                <option value="all">All Outcomes</option>
                <option value="extracted">Extracted</option>
                <option value="died">Died</option>
              </select>

              {/* Expedition */}
              <select
                value={filterExpedition}
                onChange={(e) => setFilterExpedition(e.target.value)}
                className="border text-sm font-black uppercase text-white px-3 py-2 outline-none"
                style={{ background: BG, borderColor: BORDER }}
              >
                <option value="all">All Expeditions</option>
                <option value="season1">Season 1</option>
                <option value="season2">Season 2</option>
                <option value="legacy">Legacy</option>
              </select>

              {/* Date From */}
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="border text-sm text-white px-3 py-2 outline-none"
                style={{ background: BG, borderColor: BORDER }}
                placeholder="From"
              />

              {/* Date To */}
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="border text-sm text-white px-3 py-2 outline-none"
                style={{ background: BG, borderColor: BORDER }}
                placeholder="To"
              />

              {/* Sort */}
              <div className="flex items-center gap-2 ml-auto">
                <ArrowUpDown className="w-4 h-4" style={{ color: MUTED }} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="border text-sm font-black uppercase text-white px-3 py-2 outline-none"
                  style={{ background: BG, borderColor: BORDER }}
                >
                  <option value="date">Newest First</option>
                  <option value="value">Net Value</option>
                  <option value="kills">Total Kills</option>
                  <option value="playerKills">PvP Kills</option>
                  <option value="score">Score</option>
                  <option value="duration">Duration</option>
                  <option value="damage">Damage</option>
                </select>
              </div>

              {/* Advanced toggle */}
              <button
                onClick={() => setShowAdvanced((v) => !v)}
                className="text-sm font-black uppercase tracking-wider border px-3 py-2 transition-colors"
                style={{
                  borderColor: showAdvanced ? YELLOW : BORDER,
                  color: showAdvanced ? YELLOW : MUTED,
                }}
              >
                Advanced
              </button>
            </div>

            {/* Advanced filters */}
            {showAdvanced && (
              <div
                className="flex flex-wrap gap-4 pt-3 border-t"
                style={{ borderColor: BORDER }}
              >
                <label className="flex items-center gap-2">
                  <span className="text-sm font-black" style={{ color: MUTED }}>
                    Min Kills
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={filterMinKills || ''}
                    onChange={(e) =>
                      setFilterMinKills(Number(e.target.value) || 0)
                    }
                    placeholder="0"
                    className="w-20 border text-white text-sm px-2 py-1.5 outline-none"
                    style={{ background: BG, borderColor: BORDER }}
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-sm font-black" style={{ color: MUTED }}>
                    Min {EMBARK_STAT_LABELS.netValue} $
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={filterMinProfit || ''}
                    onChange={(e) =>
                      setFilterMinProfit(Number(e.target.value) || 0)
                    }
                    placeholder="0"
                    className="w-24 border text-white text-sm px-2 py-1.5 outline-none"
                    style={{ background: BG, borderColor: BORDER }}
                  />
                </label>
                <button
                  onClick={() => {
                    setFilterMap('all');
                    setFilterOutcome('all');
                    setFilterExpedition('all');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                    setFilterMinKills(0);
                    setFilterMinProfit(0);
                  }}
                  className="text-sm font-black uppercase border px-3 py-1.5 transition-colors"
                  style={{ borderColor: RED, color: RED }}
                >
                  Reset All
                </button>
              </div>
            )}
          </div>

          {/* ── Per-map thumbnail cards ── */}
          {allRounds.length > 0 &&
            (() => {
              const byMap: Record<
                string,
                {
                  rounds: number;
                  extracted: number;
                  profit: number;
                  kills: number;
                }
              > = {};
              allRounds.forEach((r: any) => {
                const mn = rMap(r).toLowerCase().trim();
                if (!byMap[mn])
                  byMap[mn] = { rounds: 0, extracted: 0, profit: 0, kills: 0 };
                byMap[mn].rounds++;
                if (rIsEx(r)) byMap[mn].extracted++;
                byMap[mn].profit += rProfit(r);
                byMap[mn].kills += rKills(r);
              });
              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {Object.entries(byMap)
                    .sort((a, b) => b[1].rounds - a[1].rounds)
                    .map(([mn, ms]) => {
                      const exRate =
                        ms.rounds > 0
                          ? ((ms.extracted / ms.rounds) * 100).toFixed(0)
                          : 0;
                      const active = filterMap === mn;
                      return (
                        <div
                          key={mn}
                          onClick={() => setFilterMap(active ? 'all' : mn)}
                          className="relative overflow-hidden border cursor-pointer transition-all hover:scale-[1.02]"
                          style={{ borderColor: active ? YELLOW : BORDER }}
                        >
                          <img
                            src={getMapImg(mn)}
                            alt={mn}
                            className="w-full h-16 object-cover opacity-40"
                          />
                          <div className="p-2" style={{ background: CARD }}>
                            <p
                              className="text-xs font-black uppercase tracking-wider truncate"
                              style={{ color: YELLOW }}
                            >
                              {mn.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs" style={{ color: MUTED }}>
                              {ms.rounds} raids · {exRate}% exfil
                            </p>
                            <p
                              className="text-sm font-black"
                              style={{ color: GREEN }}
                            >
                              ${ms.profit.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })()}

          {/* ── Raid log ── */}
          <div
            className="border"
            style={{ background: CARD, borderColor: BORDER }}
          >
            <div
              className="px-4 py-3 border-b flex items-center justify-between"
              style={{ borderColor: BORDER, background: '#0f1320' }}
            >
              <span
                className="text-sm font-black uppercase tracking-widest flex items-center gap-2"
                style={{ color: YELLOW }}
              >
                <Map className="w-4 h-4" /> Raid Log
              </span>
              <span className="text-xs font-black" style={{ color: MUTED }}>
                Showing {visibleRaids.length} of {filtered.length} raids
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="p-10 text-center">
                <Database
                  className="w-8 h-8 mx-auto mb-3"
                  style={{ color: BORDER }}
                />
                <p
                  className="text-sm font-black uppercase tracking-widest"
                  style={{ color: MUTED }}
                >
                  No raids match the current filters
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: BORDER }}>
                {visibleRaids.map((r: any, i: number) => {
                  const id = r.roundId || r.id || String(i);
                  const isOpen = expanded.has(id);
                  const isExtracted = rIsEx(r);
                  const accent = isExtracted ? GREEN : RED;
                  const mapName = rMap(r);
                  const netValue = rProfit(r);
                  const kills = rKills(r);
                  const pvpKills = rPvpK(r);
                  const arcKills = rArcK(r);
                  const score = rXp(r);
                  const damage = rDmg(r);
                  const duration = rDurSec(r);
                  const containers = rContainers(r);
                  const dmgTaken = rDmgTaken(r);
                  const healed = rHealed(r);

                  return (
                    <div key={id} style={{ borderColor: BORDER }}>
                      <button
                        onClick={() => toggle(id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                        style={{ borderLeft: `3px solid ${accent}` }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            `${accent}05`;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            'transparent';
                        }}
                      >
                        {/* Expand chevron */}
                        <div className="w-4 shrink-0" style={{ color: MUTED }}>
                          {isOpen ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>

                        {/* Outcome badge */}
                        <div className="flex items-center gap-2 w-40 shrink-0">
                          {isExtracted ? (
                            <CheckCircle2
                              className="w-4 h-4"
                              style={{ color: accent }}
                            />
                          ) : (
                            <Skull
                              className="w-4 h-4"
                              style={{ color: accent }}
                            />
                          )}
                          <span
                            className="text-sm font-black uppercase tracking-widest"
                            style={{ color: accent }}
                          >
                            {isExtracted ? 'EXTRACTED' : 'DIED'}
                          </span>
                        </div>

                        {/* Map */}
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          <img
                            src={getMapImg(mapName)}
                            alt={mapName}
                            className="w-14 h-9 object-cover opacity-60 shrink-0 hidden sm:block"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-black text-white uppercase tracking-wider truncate">
                              {mapName}
                            </p>
                            <p className="text-xs" style={{ color: MUTED }}>
                              {timeAgo(rDate(r))}
                            </p>
                          </div>
                        </div>

                        {/* Stats row */}
                        <div className="hidden md:flex items-center gap-5 text-sm">
                          <span
                            className="flex items-center gap-1.5"
                            style={{ color: MUTED }}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            {fmtDuration(duration)}
                          </span>
                          <span
                            className="flex items-center gap-1.5"
                            style={{ color: RED }}
                          >
                            <Target className="w-3.5 h-3.5" />
                            {kills}K
                          </span>
                          <span
                            className="flex items-center gap-1.5"
                            style={{ color: CYAN }}
                          >
                            <Zap className="w-3.5 h-3.5" />
                            {score.toLocaleString()}
                          </span>
                          <span
                            className="flex items-center gap-1.5 font-black"
                            style={{ color: netValue > 0 ? GREEN : MUTED }}
                          >
                            <Coins className="w-3.5 h-3.5" />$
                            {netValue.toLocaleString()}
                          </span>
                        </div>
                      </button>

                      {/* Expanded detail panel */}
                      {isOpen && (
                        <div
                          className="px-6 py-4 border-t border-l-4 grid grid-cols-2 md:grid-cols-4 gap-4"
                          style={{
                            background: BG,
                            borderColor: BORDER,
                            borderLeftColor: accent,
                          }}
                        >
                          {[
                            {
                              label: 'Duration',
                              value: fmtDuration(duration),
                              color: MUTED,
                            },
                            {
                              label: EMBARK_STAT_LABELS.netValue,
                              value: `$${netValue.toLocaleString()}`,
                              color: netValue > 0 ? GREEN : RED,
                            },
                            {
                              label: 'XP Earned',
                              value: score.toLocaleString(),
                              color: CYAN,
                            },
                            { label: 'Total Kills', value: kills, color: RED },
                            {
                              label: 'PvP Kills',
                              value: pvpKills,
                              color: YELLOW,
                            },
                            {
                              label: 'ARC Kills',
                              value: arcKills,
                              color: CYAN,
                            },
                            {
                              label: 'Dmg Dealt',
                              value: damage > 0 ? damage.toLocaleString() : '—',
                              color: RED,
                            },
                            {
                              label: 'Dmg Taken',
                              value:
                                dmgTaken > 0 ? dmgTaken.toLocaleString() : '—',
                              color: RED,
                            },
                            {
                              label: 'Healed',
                              value: healed > 0 ? healed.toLocaleString() : '—',
                              color: GREEN,
                            },
                            {
                              label: 'Containers',
                              value: containers > 0 ? containers : '—',
                              color: CYAN,
                            },
                            {
                              label: EMBARK_STAT_LABELS.valueExtracted,
                              value:
                                Number(r.valueExtracted ?? r.lootValue) > 0
                                  ? `$${Number(r.valueExtracted ?? r.lootValue).toLocaleString()}`
                                  : '—',
                              color: YELLOW,
                            },
                            {
                              label: EMBARK_STAT_LABELS.valueBroughtIn,
                              value:
                                Number(r.valueBroughtIn ?? r.loadoutValue) > 0
                                  ? `$${Number(r.valueBroughtIn ?? r.loadoutValue).toLocaleString()}`
                                  : '—',
                              color: MUTED,
                            },
                          ].map(({ label, value, color }) => (
                            <div key={label}>
                              <p
                                className="text-xs font-black uppercase tracking-widest mb-1"
                                style={{ color: MUTED }}
                              >
                                {label}
                              </p>
                              <p
                                className="text-xl font-black"
                                style={{ color }}
                              >
                                {value}
                              </p>
                            </div>
                          ))}
                          {/* Items extracted */}
                          {Array.isArray(r.items) && r.items.length > 0 && (
                            <div className="col-span-full">
                              <p
                                className="text-xs font-black uppercase tracking-widest mb-2"
                                style={{ color: MUTED }}
                              >
                                Items Extracted ({r.items.length})
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {r.items.map((item: any, j: number) => (
                                  <span
                                    key={j}
                                    className="text-xs font-black border px-2 py-1"
                                    style={{
                                      borderColor: BORDER,
                                      color: 'var(--color-arc-white)',
                                    }}
                                  >
                                    {item.name ||
                                      item.itemName ||
                                      item.itemId ||
                                      'Item'}
                                    {item.quantity > 1
                                      ? ` ×${item.quantity}`
                                      : ''}
                                  </span>
                                ))}
                                {r.items.length > 12 && (
                                  <span
                                    className="text-xs border px-2 py-1"
                                    style={{
                                      borderColor: BORDER,
                                      color: MUTED,
                                    }}
                                  >
                                    +{r.items.length - 12} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Load More footer */}
            {filtered.length > 0 && (
              <div
                className="px-4 py-3 border-t flex items-center justify-between"
                style={{ borderColor: BORDER }}
              >
                <span
                  className="text-xs font-black uppercase tracking-widest"
                  style={{ color: MUTED }}
                >
                  {visibleRaids.length} / {filtered.length} raids
                </span>
                {hasMore && (
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    className="text-xs font-black uppercase tracking-widest px-4 py-2 border transition-colors"
                    style={{
                      borderColor: YELLOW,
                      color: YELLOW,
                      background: `${YELLOW}10`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        `${YELLOW}25`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        `${YELLOW}10`;
                    }}
                  >
                    Load More ({filtered.length - visibleRaids.length}{' '}
                    remaining)
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════ SECTOR VIEW ══════════════════ */}
      {view === 'sector' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {SECTOR_MAPS.map(({ label }) => {
              const s = sectorStats[label];
              const exRate =
                s.rounds > 0
                  ? ((s.extracted / s.rounds) * 100).toFixed(1)
                  : '0';
              const img = getMapImg(label.toLowerCase());
              return (
                <div
                  key={label}
                  className="border overflow-hidden"
                  style={{ background: CARD, borderColor: BORDER }}
                >
                  <div className="relative h-28">
                    <img
                      src={img}
                      alt={label}
                      className="w-full h-full object-cover opacity-40"
                    />
                    <div
                      className="absolute inset-0 flex items-end p-3"
                      style={{
                        background:
                          'linear-gradient(to top, var(--color-arc-light-background)cc, transparent)',
                      }}
                    >
                      <h3 className="text-base font-black text-white uppercase tracking-wide">
                        {label}
                      </h3>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-3 gap-3">
                    <div>
                      <p
                        className="text-xs font-black uppercase"
                        style={{ color: MUTED }}
                      >
                        Raids
                      </p>
                      <p className="text-xl font-black text-white">
                        {s.rounds}
                      </p>
                    </div>
                    <div>
                      <p
                        className="text-xs font-black uppercase"
                        style={{ color: MUTED }}
                      >
                        Exfil %
                      </p>
                      <p
                        className="text-xl font-black"
                        style={{ color: GREEN }}
                      >
                        {exRate}%
                      </p>
                    </div>
                    <div>
                      <p
                        className="text-xs font-black uppercase"
                        style={{ color: MUTED }}
                      >
                        Kills
                      </p>
                      <p className="text-xl font-black" style={{ color: RED }}>
                        {s.kills}
                      </p>
                    </div>
                    <div>
                      <p
                        className="text-xs font-black uppercase"
                        style={{ color: MUTED }}
                      >
                        {EMBARK_STAT_LABELS.netValue}
                      </p>
                      <p
                        className="text-base font-black"
                        style={{ color: YELLOW }}
                      >
                        ${s.profit.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p
                        className="text-xs font-black uppercase"
                        style={{ color: MUTED }}
                      >
                        Avg Duration
                      </p>
                      <p
                        className="text-base font-black"
                        style={{ color: MUTED }}
                      >
                        {fmtDuration(
                          s.rounds > 0 ? s.totalDurSec / s.rounds : 0,
                        )}
                      </p>
                    </div>
                    <div>
                      <p
                        className="text-xs font-black uppercase"
                        style={{ color: MUTED }}
                      >
                        Last Played
                      </p>
                      <p
                        className="text-sm font-black"
                        style={{ color: MUTED }}
                      >
                        {s.lastPlayed ? timeAgo(s.lastPlayed) : 'Never'}
                      </p>
                    </div>
                  </div>
                  {/* Extract rate bar */}
                  <div className="px-4 pb-4">
                    <div
                      className="h-1.5 rounded-sm overflow-hidden"
                      style={{ background: BORDER }}
                    >
                      <div
                        className="h-full"
                        style={{
                          width: `${exRate}%`,
                          background: `linear-gradient(90deg, ${GREEN}, ${CYAN})`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent activity table */}
          <div
            className="border"
            style={{ background: CARD, borderColor: BORDER }}
          >
            <div
              className="px-4 py-3 border-b"
              style={{ borderColor: BORDER, background: '#0f1320' }}
            >
              <h3
                className="text-sm font-black uppercase tracking-widest flex items-center gap-2"
                style={{ color: CYAN }}
              >
                <Crosshair className="w-4 h-4" /> RECENT ACTIVITY
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: MUTED }}>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest">
                    SECTOR
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest">
                    RESULT
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-widest">
                    KILLS
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-widest">
                    SCORE
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-widest">
                    YIELD
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-widest">
                    WHEN
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((r: any, i: number) => {
                  const extr = rIsEx(r);
                  return (
                    <tr key={i} className="arc-table-row">
                      <td className="px-4 py-3 font-black text-white truncate max-w-[120px]">
                        {rMap(r).toUpperCase()}
                      </td>
                      <td
                        className="px-4 py-3 font-black"
                        style={{ color: extr ? GREEN : RED }}
                      >
                        {extr ? 'EXTRACT' : 'DIED'}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-black"
                        style={{ color: RED }}
                      >
                        {rKills(r)}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-black"
                        style={{ color: CYAN }}
                      >
                        {rXp(r).toLocaleString()}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-black"
                        style={{ color: YELLOW }}
                      >
                        ${rProfit(r).toLocaleString()}
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        style={{ color: MUTED }}
                      >
                        {timeAgo(rDate(r))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════ TRENDS VIEW ══════════════════ */}
      {view === 'trends' && (
        <div className="space-y-6">
          <p className="text-sm" style={{ color: MUTED }}>
            Last {trendData.length} raids — chronological progression
          </p>

          {/* Net value per raid — area chart */}
          <div
            className="border p-5"
            style={{ background: CARD, borderColor: BORDER }}
          >
            <h3
              className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2"
              style={{ color: YELLOW }}
            >
              <Coins className="w-4 h-4" /> {EMBARK_STAT_LABELS.netValue} PER RAID
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart
                data={trendData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={YELLOW} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={YELLOW} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis
                  dataKey="i"
                  tick={{ fill: MUTED, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: MUTED, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                  }
                />
                <ReferenceLine y={0} stroke={BORDER} strokeDasharray="4 2" />
                <RechartsTip
                  contentStyle={{
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 0,
                    color: 'var(--color-arc-white)',
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [
                    `$${Number(v).toLocaleString()}`,
                    EMBARK_STAT_LABELS.netValue,
                  ]}
                  labelFormatter={(l) => `Raid #${l}`}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke={YELLOW}
                  strokeWidth={2}
                  fill="url(#profitGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: YELLOW, stroke: BG, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 3-Line Graph: Value Extracted, Net Value, Value Brought In */}
          <div
            className="border p-5"
            style={{ background: CARD, borderColor: BORDER }}
          >
            <h3
              className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2"
              style={{ color: YELLOW }}
            >
              <Coins className="w-4 h-4" /> RAID VALUE HISTORY
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart
                data={trendData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis
                  dataKey="i"
                  tick={{ fill: MUTED, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: MUTED, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                  }
                />
                <RechartsTip
                  contentStyle={{
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 0,
                    color: 'var(--color-arc-white)',
                    fontSize: 12,
                  }}
                  formatter={(v: number, name: string) => [
                    `$${Number(v).toLocaleString()}`,
                    name,
                  ]}
                  labelFormatter={(l) => `Raid #${l}`}
                />
                <Line
                  type="monotone"
                  dataKey="valueExtracted"
                  name={EMBARK_STAT_LABELS.valueExtracted}
                  stroke="#00cc66"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: '#00cc66',
                    stroke: BG,
                    strokeWidth: 2,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="netValue"
                  name="Net Value"
                  stroke={YELLOW}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: YELLOW, stroke: BG, strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="valueBroughtIn"
                  name={EMBARK_STAT_LABELS.valueBroughtIn}
                  stroke="#0066cc"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: '#0066cc',
                    stroke: BG,
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* XP per raid — area chart */}
          <div
            className="border p-5"
            style={{ background: CARD, borderColor: BORDER }}
          >
            <h3
              className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2"
              style={{ color: CYAN }}
            >
              <Zap className="w-4 h-4" /> XP PER RAID
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart
                data={trendData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CYAN} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CYAN} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis
                  dataKey="i"
                  tick={{ fill: MUTED, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: MUTED, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <RechartsTip
                  contentStyle={{
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 0,
                    color: 'var(--color-arc-white)',
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [Number(v).toLocaleString(), 'XP']}
                  labelFormatter={(l) => `Raid #${l}`}
                />
                <Area
                  type="monotone"
                  dataKey="xp"
                  stroke={CYAN}
                  strokeWidth={2}
                  fill="url(#xpGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: CYAN, stroke: BG, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Kills per raid — bar chart, PvP vs ARC stacked */}
          <div
            className="border p-5"
            style={{ background: CARD, borderColor: BORDER }}
          >
            <h3
              className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2"
              style={{ color: RED }}
            >
              <Target className="w-4 h-4" /> KILLS PER RAID
              <span className="ml-auto flex items-center gap-4 text-xs font-black normal-case tracking-normal">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-3 h-3"
                    style={{ background: RED }}
                  />{' '}
                  PvP
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-3 h-3"
                    style={{ background: CYAN }}
                  />{' '}
                  ARC
                </span>
              </span>
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={trendData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                barCategoryGap="20%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={BORDER}
                  vertical={false}
                />
                <XAxis
                  dataKey="i"
                  tick={{ fill: MUTED, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: MUTED, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <RechartsTip
                  contentStyle={{
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 0,
                    color: 'var(--color-arc-white)',
                    fontSize: 12,
                  }}
                  labelFormatter={(l) => `Raid #${l}`}
                />
                <Bar
                  dataKey="pvpKills"
                  name="PvP"
                  stackId="kills"
                  fill={RED}
                  opacity={0.9}
                  radius={0}
                />
                <Bar
                  dataKey="arcKills"
                  name="ARC"
                  stackId="kills"
                  fill={CYAN}
                  opacity={0.8}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Damage dealt vs taken per raid */}
          <div
            className="border p-5"
            style={{ background: CARD, borderColor: BORDER }}
          >
            <h3
              className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2"
              style={{ color: RED }}
            >
              <Swords className="w-4 h-4" /> DAMAGE DEALT vs TAKEN
              <span className="ml-auto flex items-center gap-4 text-xs font-black normal-case tracking-normal">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-3 h-3"
                    style={{ background: RED }}
                  />{' '}
                  Dealt
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-3 h-3"
                    style={{ background: YELLOW }}
                  />{' '}
                  Taken
                </span>
              </span>
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={trendData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                barCategoryGap="20%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={BORDER}
                  vertical={false}
                />
                <XAxis
                  dataKey="i"
                  tick={{ fill: MUTED, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: MUTED, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <RechartsTip
                  contentStyle={{
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 0,
                    color: 'var(--color-arc-white)',
                    fontSize: 12,
                  }}
                  labelFormatter={(l) => `Raid #${l}`}
                />
                <Bar
                  dataKey="damage"
                  name="Dealt"
                  fill={RED}
                  opacity={0.85}
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="dmgTaken"
                  name="Taken"
                  fill={YELLOW}
                  opacity={0.7}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Duration per raid */}
          <div
            className="border p-5"
            style={{ background: CARD, borderColor: BORDER }}
          >
            <h3
              className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2"
              style={{ color: MUTED }}
            >
              <Clock className="w-4 h-4" /> RAID DURATION (minutes)
            </h3>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart
                data={trendData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                barCategoryGap="20%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={BORDER}
                  vertical={false}
                />
                <XAxis
                  dataKey="i"
                  tick={{ fill: MUTED, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: MUTED, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <RechartsTip
                  contentStyle={{
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 0,
                    color: 'var(--color-arc-white)',
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v} min`, 'Duration']}
                  labelFormatter={(l) => `Raid #${l}`}
                />
                <Bar dataKey="dur" name="Duration" radius={[2, 2, 0, 0]}>
                  {trendData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.extract ? GREEN : RED}
                      opacity={0.7}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs mt-2" style={{ color: MUTED }}>
              Green = extracted · Red = died
            </p>
          </div>

          {/* Extract / death strip */}
          <div
            className="border p-5"
            style={{ background: CARD, borderColor: BORDER }}
          >
            <h3
              className="text-sm font-black uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: GREEN }}
            >
              <Activity className="w-4 h-4" /> EXTRACT / DEATH STRIP
            </h3>
            <div className="flex gap-1 flex-wrap">
              {trendData.map((d, i) => (
                <div
                  key={i}
                  className="w-5 h-5 flex items-center justify-center text-xs font-black"
                  title={`Raid #${d.i} — ${d.map} — ${d.extract ? 'EXTRACTED' : 'DIED'}`}
                  style={{
                    background: d.extract ? `${GREEN}25` : `${RED}25`,
                    border: `1px solid ${d.extract ? GREEN : RED}60`,
                  }}
                >
                  {d.extract ? 'E' : 'D'}
                </div>
              ))}
            </div>
          </div>

          {/* Map distribution — horizontal bar chart */}
          <div
            className="border p-5"
            style={{ background: CARD, borderColor: BORDER }}
          >
            <h3
              className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2"
              style={{ color: CYAN }}
            >
              <Map className="w-4 h-4" /> MAP DISTRIBUTION
            </h3>
            {(() => {
              const mapCounts: Record<string, number> = {};
              allRounds.forEach((r: any) => {
                const mn = rMap(r);
                mapCounts[mn] = (mapCounts[mn] || 0) + 1;
              });
              const chartData = Object.entries(mapCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => ({ name, count }));
              return (
                <div className="space-y-3">
                  {chartData.map(({ name, count }) => {
                    const maxC = chartData[0]?.count || 1;
                    const pct = ((count / allRounds.length) * 100).toFixed(1);
                    return (
                      <div key={name} className="flex items-center gap-3">
                        <span className="text-sm font-black text-white w-44 truncate">
                          {name}
                        </span>
                        <div
                          className="flex-1 h-5 overflow-hidden"
                          style={{ background: BORDER }}
                        >
                          <div
                            className="h-full flex items-center px-2 text-xs font-black transition-all"
                            style={{
                              width: `${(count / maxC) * 100}%`,
                              background: `linear-gradient(90deg, ${CYAN}50, ${CYAN}20)`,
                              borderLeft: `3px solid ${CYAN}`,
                              color: 'var(--color-arc-white)',
                              minWidth: 36,
                            }}
                          >
                            {count}
                          </div>
                        </div>
                        <span
                          className="text-sm font-black w-14 text-right"
                          style={{ color: MUTED }}
                        >
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
