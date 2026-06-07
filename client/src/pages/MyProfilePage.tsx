/**
 * MyProfilePage — Raider Profile Hub
 * Full stats showcase: identity, sync status, all combat metrics,
 * currency breakdown, blueprint progress, raid history graphs.
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Award,
  Edit3,
  Check,
  X,
  ExternalLink,
  Loader2,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  TrendingUp,
  Map,
  Crosshair,
  Shield,
  Activity,
  Package,
  Skull,
  Upload,
  Download,
  Trash2,
  ListChecks,
  Zap,
  DollarSign,
  Clock,
  Target,
  Sword,
  BarChart2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
} from 'recharts';
import { usePlayer } from '../context/PlayerContext';
import QUESTS_RAW from '../data/quests-all.json';
import type { PlayerProfileSummary } from '../lib/api';
import { PlayerAPI, PublicAPI, ArcTrackerAPI } from '../lib/api';
import DiscordProfileCard from '../components/DiscordProfileCard';
import { getDiscordLoginUrl } from '../lib/discordUtils';
import { assetUrl } from '../lib/assetUrl';
import { getArcBotIcon } from '../lib/arcBotIcon';
import arctrackerLabels from '../data/arctracker-en.json';
import {
  buildProgressSummary,
  downloadCompletions,
  importCompletionsFromFile,
  resetCompletions,
} from '../lib/progressSummary';
import { getCompletions } from '../lib/completionsStorage';

const EMBARK_STAT_LABELS = arctrackerLabels.RaidHistoryPage.embarkStats;
import type { ProgressSummary } from '../lib/progressSummary';

type UserHideoutProgress = Record<string, number>;
type ProjectPhaseProgress = Record<string, boolean | number | string>;

interface UserProgress {
  hideoutLevels: UserHideoutProgress;
  completedQuests: string[];
  completedProjects: string[];
  projectPhaseProgress: ProjectPhaseProgress;
  lastUpdated: number;
}

const DEFAULT_USER_PROGRESS: UserProgress = {
  hideoutLevels: {
    scrappy: 1,
    gunsmith: 1,
    gear_bench: 1,
    medical_lab: 1,
    explosives_station: 1,
    utility_station: 1,
    refiner: 1,
    workbench: 1,
  },
  completedQuests: [],
  completedProjects: [],
  projectPhaseProgress: {},
  lastUpdated: Date.now(),
};

/* ── Palette ────────────────────────────────────────────────────────────── */
const Y = 'var(--color-arc-yellow)';
const C = 'var(--color-arc-rare)';
const G = 'var(--color-arc-uncommon)';
const P = 'var(--color-arc-epic)';
const R = 'var(--color-arc-danger)';
const M = 'var(--color-arc-muted)';
const BG = 'var(--color-arc-dark-background)';
const BD = 'var(--color-arc-border)';
const CRD = 'var(--color-arc-light-background)';
const CURATED_QUEST_TOTAL = Object.keys(
  QUESTS_RAW as Record<string, unknown>,
).length;

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmt$(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}
function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}
function pickNumber(...values: any[]) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return 0;
}
function pickUsefulNumber(...values: any[]) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num) && num !== 0) return num;
  }
  return pickNumber(...values);
}
function formatProfileDate(value: any) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

/* ── StatTile ────────────────────────────────────────────────────────────── */
function StatTile({
  label,
  value,
  sub,
  color = '#fff',
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-arc-light-bg border border-arc-border p-3 flex flex-col gap-1 hover:border-[var(--color-arc-yellow)]/40 transition-colors">
      {icon && <div className="mb-1 opacity-70">{icon}</div>}
      <p
        className="text-[9px] uppercase tracking-widest font-black"
        style={{ color: M }}
      >
        {label}
      </p>
      <p className="text-xl font-black leading-none truncate" style={{ color }}>
        {value}
      </p>
      {sub && (
        <p className="text-[10px]" style={{ color: M }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function MetaForgeMetricCard({
  label,
  value,
  sub,
  icon,
  color = Y,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      className="border p-3 flex items-center gap-3 min-w-0"
      style={{
        borderColor: `${color}35`,
        background: `linear-gradient(135deg, ${color}10, rgba(8,11,22,0.72))`,
      }}
    >
      <div
        className="w-9 h-9 border flex items-center justify-center shrink-0"
        style={{ borderColor: `${color}55`, color, background: '#080b16' }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p
          className="text-[9px] uppercase tracking-widest font-black truncate"
          style={{ color: M }}
        >
          {label}
        </p>
        <p className="text-lg font-black leading-none truncate" style={{ color }}>
          {value}
        </p>
        {sub && (
          <p className="text-[9px] mt-1 truncate" style={{ color: M }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── SectionHeading ──────────────────────────────────────────────────────── */
function SectionHeading({
  icon: Icon,
  label,
  color = Y,
}: {
  icon?: any;
  label: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon className="w-4 h-4" style={{ color }} />}
      <h2
        className="text-xs font-black uppercase tracking-[0.2em]"
        style={{ color: 'var(--color-arc-white)' }}
      >
        {label}
      </h2>
      <div className="flex-1 h-px" style={{ background: BD }} />
    </div>
  );
}

/* ── MiniBar (horizontal bar for weapon damage / arc kills etc.) ─────────── */
function MiniBar({
  name,
  value,
  max,
  color,
  rank,
}: {
  name: string;
  value: number;
  max: number;
  color: string;
  rank?: number;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      {rank !== undefined && (
        <span
          className="w-5 text-[9px] font-black text-right shrink-0"
          style={{ color: M }}
        >
          #{rank + 1}
        </span>
      )}
      <span
        className="text-[10px] font-black uppercase truncate w-28 shrink-0"
        style={{ color: 'var(--color-arc-white)' }}
      >
        {name}
      </span>
      <div
        className="flex-1 h-2 rounded-sm overflow-hidden"
        style={{ background: BD }}
      >
        <div
          className="h-full rounded-sm transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span
        className="text-[10px] font-black tabular-nums w-14 text-right shrink-0"
        style={{ color }}
      >
        {fmt$(value)}
      </span>
    </div>
  );
}

/* ── Custom Tooltip for recharts ─────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="border px-3 py-2"
      style={{ background: CRD, borderColor: BD, fontSize: 11 }}
    >
      <p
        className="font-black uppercase tracking-wide mb-1"
        style={{ color: 'var(--color-arc-white)' }}
      >
        {label}
      </p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? Y }}>
          {p.name}:{' '}
          {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

/* ── ProgressBar ─────────────────────────────────────────────────────────── */
function ProgressBar({
  label,
  completed,
  total,
  color,
}: {
  label: string;
  completed: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: M }}
        >
          {label}
        </span>
        <span className="text-[10px] font-black tabular-nums" style={{ color }}>
          {completed}/{total} ({pct}%)
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: BD }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ── Sync Status Card ────────────────────────────────────────────────────── */
function SyncCard({
  profile: _profile,
  refresh,
}: {
  profile: any;
  refresh: () => Promise<void>;
}) {
  const [syncProfile, setSyncProfile] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch('/api/raider-sync/profile', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setSyncProfile(d))
      .catch(() => {});
  }, []);

  const lastSync = syncProfile?.lastSync
    ? new Date(syncProfile.lastSync).toLocaleString()
    : null;

  const handleResync = async () => {
    setSyncing(true);
    try {
      await refresh();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      className="border p-4 flex flex-col gap-3"
      style={{ borderColor: BD, background: CRD }}
    >
      <div className="flex items-center gap-3">
        <img
          src={assetUrl('/main/embark.webp')}
          alt="Embark"
          className="w-8 h-8 object-contain"
        />
        <div className="flex-1">
          <p
            className="text-xs font-black uppercase tracking-widest"
            style={{ color: 'var(--color-arc-white)' }}
          >
            Embark Sync
          </p>
          <p className="text-[10px]" style={{ color: M }}>
            {syncProfile?.embarkLinked ? 'Active' : 'Not linked'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: syncProfile?.embarkLinked ? G : M,
              boxShadow: syncProfile?.embarkLinked ? `0 0 6px ${G}` : 'none',
            }}
          />
          <span
            className="text-[9px] font-black uppercase tracking-widest"
            style={{ color: syncProfile?.embarkLinked ? G : M }}
          >
            {syncProfile?.embarkLinked ? 'SYNCED' : 'OFFLINE'}
          </span>
        </div>
      </div>
      {syncProfile?.embarkUsername && (
        <div className="flex items-center justify-between text-[10px]">
          <span style={{ color: M }}>Embark Name</span>
          <span
            className="font-black"
            style={{ color: 'var(--color-arc-white)' }}
          >
            {syncProfile.embarkUsername}
          </span>
        </div>
      )}
      {lastSync && (
        <div className="flex items-center justify-between text-[10px]">
          <span style={{ color: M }}>Last Sync</span>
          <span className="font-black" style={{ color: Y }}>
            {lastSync}
          </span>
        </div>
      )}
      <button
        onClick={handleResync}
        disabled={syncing}
        className="flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest border transition-colors disabled:opacity-50"
        style={{ borderColor: `${Y}40`, color: Y, background: `${Y}08` }}
      >
        {syncing ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <RefreshCw className="w-3 h-3" />
        )}
        {syncing ? 'Syncing...' : 'Re-Sync Now'}
      </button>
    </div>
  );
}

function extractHideoutLevels(hideout: any, progression: any): UserHideoutProgress {
  const raw =
    progression?.hideoutModuleLevels ||
    progression?.gameProgress?.hideoutModuleLevels ||
    hideout?.hideoutModuleLevels ||
    hideout?.modules ||
    hideout?.workshops ||
    hideout;
  const levels: UserHideoutProgress = {
    ...DEFAULT_USER_PROGRESS.hideoutLevels,
  };
  if (!raw || typeof raw !== 'object') return levels;

  if (Array.isArray(raw)) {
    raw.forEach((entry: any) => {
      const id = entry?.id || entry?.moduleId || entry?.key || entry?.name;
      const level = pickNumber(entry?.level, entry?.currentLevel, entry?.tier);
      if (id && level > 0) levels[String(id)] = level;
    });
    return levels;
  }

  Object.entries(raw).forEach(([key, value]: [string, any]) => {
    const level =
      typeof value === 'number'
        ? value
        : pickNumber(value?.level, value?.currentLevel, value?.tier);
    if (level > 0) levels[key] = level;
  });
  return levels;
}

function completedIdsFromRows(rows: any, fallback: string[]): string[] {
  if (!Array.isArray(rows)) return fallback;
  const completed = rows
    .filter((row: any) => {
      const status = String(row?.status || row?.outcome || '').toLowerCase();
      return (
        row?.completed === true ||
        row?.learned === true ||
        status === 'completed' ||
        status === 'complete' ||
        status === 'done'
      );
    })
    .map((row: any) => row?.id || row?.questId || row?.projectId || row?.slug)
    .filter(Boolean)
    .map(String);
  return completed.length > 0 ? [...new Set(completed)] : fallback;
}

function buildUserProgress({
  hideout,
  quests,
  projects,
  progression,
}: {
  hideout: any;
  quests: any;
  projects: any;
  progression: any;
}): UserProgress {
  const completions = getCompletions();
  const questStatuses =
    progression?.questStatuses ||
    progression?.gameProgress?.questStatuses ||
    {};
  const projectPhaseProgress =
    progression?.projectPhaseStatuses ||
    progression?.gameProgress?.projectPhaseStatuses ||
    projects?.projectPhaseStatuses ||
    {};
  const completedQuestsFromProgress = Object.entries(questStatuses)
    .filter(([, done]) => done === true)
    .map(([id]) => id);
  const completedProjectsFromProgress = Object.entries(projectPhaseProgress)
    .filter(([, done]) => done === true)
    .map(([id]) => id);

  return {
    hideoutLevels: extractHideoutLevels(hideout, progression),
    completedQuests:
      completedQuestsFromProgress.length > 0
        ? completedQuestsFromProgress
        : completedIdsFromRows(quests, completions.quests),
    completedProjects:
      completedProjectsFromProgress.length > 0
        ? completedProjectsFromProgress
        : completedIdsFromRows(
            Array.isArray(projects?.projects) ? projects.projects : projects,
            completions.projects,
          ),
    projectPhaseProgress:
      projectPhaseProgress && typeof projectPhaseProgress === 'object'
        ? projectPhaseProgress
        : DEFAULT_USER_PROGRESS.projectPhaseProgress,
    lastUpdated: progression?.lastSynced
      ? new Date(progression.lastSynced).getTime()
      : completions.lastUpdated
        ? new Date(completions.lastUpdated).getTime()
        : Date.now(),
  };
}

/* ── Main Page ─────────────────────────────────────────────────────────────  */
export default function MyProfilePage() {
  const {
    profile,
    playerStats,
    rounds,
    combatBreakdown,
    stash,
    hideout,
    quests,
    projects,
    progression,
    blueprints,
    refresh,
    enemyKills,
    weaponKills,
  } = usePlayer();

  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [bioSaving, setBioSaving] = useState(false);
  const [bioMsg, setBioMsg] = useState('');
  const [slugInput, setSlugInput] = useState('');
  const [slugBusy, setSlugBusy] = useState(false);
  const [slugMsg, setSlugMsg] = useState('');
  const [slugSaved, setSlugSaved] = useState<string | null>(
    profile?.slug ?? null,
  );
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [profilePublic, setProfilePublic] = useState<boolean>(
    profile?.profilePublic !== false,
  );
  const [copied, setCopied] = useState(false);

  // ArcTracker blueprints for accurate count
  const [atBlueprints, setAtBlueprints] = useState<any>(null);
  useEffect(() => {
    ArcTrackerAPI.userBlueprints()
      .then((d: any) => setAtBlueprints(d))
      .catch(() => {});
  }, []);

  // Profile summary (link status)
  const [profileSummary, setProfileSummary] =
    useState<PlayerProfileSummary | null>(null);
  useEffect(() => {
    PlayerAPI.profileSummary()
      .then(setProfileSummary)
      .catch(() => {});
  }, []);

  // Progress tracking (local completions)
  const [progressSummary, setProgressSummary] =
    useState<ProgressSummary | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress>(
    DEFAULT_USER_PROGRESS,
  );
  const [importing, setImporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  // Fetch catalog totals for progress summary
  useEffect(() => {
    Promise.all([
      fetch('/api/projects')
        .then((r) => r.json())
        .catch(() => []),
    ]).then(([projects]) => {
      const qCount = CURATED_QUEST_TOTAL || 100;
      const pCount = Array.isArray(projects)
        ? projects.length
        : (projects?.data?.length ?? projects?.length ?? 50);
      setProgressSummary(
        buildProgressSummary({
          quests: qCount,
          projects: pCount,
          workshops: 50,
        }),
      );
    });
  }, []);

  useEffect(() => {
    setUserProgress(
      buildUserProgress({ hideout, quests, projects, progression }),
    );
  }, [hideout, quests, projects, progression, progressSummary]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const ok = await importCompletionsFromFile(file, 'merge');
    if (ok) {
      const qCount = progressSummary?.quests.total ?? 100;
      const pCount = progressSummary?.projects.total ?? 50;
      setProgressSummary(
        buildProgressSummary({
          quests: qCount,
          projects: pCount,
          workshops: 50,
        }),
      );
    }
    setImporting(false);
    if (importRef.current) importRef.current.value = '';
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        'Reset all locally tracked completions? This cannot be undone.',
      )
    )
      return;
    setResetting(true);
    resetCompletions();
    const qCount = progressSummary?.quests.total ?? 100;
    const pCount = progressSummary?.projects.total ?? 50;
    setProgressSummary(
      buildProgressSummary({ quests: qCount, projects: pCount, workshops: 50 }),
    );
    setResetting(false);
  };

  const refreshProgress = () => {
    const qCount = progressSummary?.quests.total ?? 100;
    const pCount = progressSummary?.projects.total ?? 50;
    setProgressSummary(
      buildProgressSummary({ quests: qCount, projects: pCount, workshops: 50 }),
    );
  };

  const stats = playerStats;
  const roundsArr = Array.isArray(rounds) ? rounds : [];

  /* ── Aggregate from rounds ───────────────────────────────────────────── */
  const agg = useMemo(() => {
    return roundsArr.reduce(
      (a: any, r: any) => {
        a.netProfit += Number(r.netValue ?? r.netProfit ?? r.profit ?? 0);
        a.xp += Number(r.score ?? r.xp ?? 0);
        a.playerKills += Number(r.playerKills ?? r.pvpKills ?? 0);
        a.arcKills += Number(r.arcKills ?? r.aiKills ?? 0);
        a.damage += Number(r.damage ?? r.damageDealt ?? 0);
        a.durationMs += Number(r.durationMs ?? Number(r.duration ?? 0) * 1000);
        a.lootValue += Number(r.valueExtracted ?? r.lootValue ?? 0);
        a.loadoutValue += Number(r.valueBroughtIn ?? r.loadoutValue ?? 0);
        a.containersLooted += Number(
          r.containersLooted ??
            r.lootedContainers ??
            r.containers_looted ??
            r.containers ??
            0,
        );
        a.itemsExtracted += Number(
          r.itemsExtracted ??
            r.items_extracted_count ??
            r.items_extracted ??
            r.extractedItems ??
            0,
        );
        const s = (r.outcome || r.status || '').toLowerCase();
        if (s === 'extracted') a.extracted += 1;
        if (s === 'failed' || s === 'died') a.deaths += 1;
        // Weapon damage map
        const wdArr: any[] =
          r.weaponDamageBreakdown || r.weaponDamage || r.weapons || [];
        wdArr.forEach((w: any) => {
          const wn = w.name || w.weaponName || w.id || 'Unknown';
          a.weaponDmg[wn] =
            (a.weaponDmg[wn] ?? 0) +
            Number(w.amount ?? w.damage ?? w.totalDamage ?? 0);
        });
        // ARC kills per type
        const akArr: any[] = r.arcKillBreakdown || r.arcBreakdown || [];
        akArr.forEach((k: any) => {
          const kn = k.targetName || k.name || k.type || 'Unknown';
          a.arcBreakdown[kn] =
            (a.arcBreakdown[kn] ?? 0) + Number(k.kills ?? k.count ?? 0);
        });
        return a;
      },
      {
        netProfit: 0,
        xp: 0,
        playerKills: 0,
        arcKills: 0,
        damage: 0,
        durationMs: 0,
        lootValue: 0,
        loadoutValue: 0,
        containersLooted: 0,
        itemsExtracted: 0,
        extracted: 0,
        deaths: 0,
        weaponDmg: {} as Record<string, number>,
        arcBreakdown: {} as Record<string, number>,
      },
    );
  }, [roundsArr]);

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <img
          src={assetUrl('/main/outfitscrappy.webp')}
          alt="Scrappy"
          className="w-20 h-20 object-contain mx-auto mb-6 opacity-40"
        />
        <h1 className="text-2xl font-black text-white uppercase tracking-[0.3em] mb-3">
          Login Required
        </h1>
        <p className="text-[10px] text-[var(--color-arc-muted)] uppercase tracking-[0.2em] mb-8">
          Link your Discord account to access your Raider Hub.
        </p>
        <a
          href={getDiscordLoginUrl()}
          className="inline-flex items-center gap-2 px-6 py-3 border text-sm font-black uppercase tracking-widest transition-colors"
          style={{
            background: '#5865F218',
            borderColor: '#5865F250',
            color: '#5865F2',
          }}
        >
          <img
            src={assetUrl('/main/discord_icon.webp')}
            alt="Discord"
            className="w-5 h-5 object-contain"
          />
          Sign in with Discord
        </a>
      </div>
    );
  }

  const total = roundsArr.length;

  /* ── Pull from combatBreakdown (preferred) ─────────────────────────── */
  const cd = (combatBreakdown as any)?.combat_detailed || {};
  const perf = (combatBreakdown as any)?.performance_analytics || {};
  const scav =
    (combatBreakdown as any)?.scavenging_and_world ||
    (combatBreakdown as any)?.scavenging ||
    {};
  const pvp = (combatBreakdown as any)?.pvp || {};

  const playerKills =
    Number(stats?.playerKills ?? 0) ||
    Number(cd.player_kills ?? pvp.kills ?? agg.playerKills ?? 0);
  const arcKillsTotal =
    Number(stats?.arcKills ?? 0) ||
    Number(cd.arc_kills_total ?? agg.arcKills ?? 0);
  const totalKills = playerKills + arcKillsTotal;
  const damageDealt = Number(cd.damage_dealt_total ?? 0) || agg.damage;
  const kdRaw = stats?.kdRatio ?? perf.kd_ratio ?? pvp.kdRatio;
  const kdRatio = kdRaw
    ? Number(kdRaw).toFixed(2)
    : agg.deaths > 0
      ? (playerKills / agg.deaths).toFixed(2)
      : playerKills > 0
        ? Number(playerKills).toFixed(2)
        : '0.00';
  const extractedCount =
    Number(stats?.successfulExtractions ?? 0) || agg.extracted;
  const totalRounds = Number(stats?.totalRaids ?? 0) || total;
  const survivalRateRaw =
    stats?.survivalRate ??
    perf.survival_rate ??
    perf.extraction_rate ??
    (combatBreakdown as any)?.extraction_rate;
  const survivalPct =
    survivalRateRaw != null
      ? survivalRateRaw > 1
        ? Number(survivalRateRaw)
        : Number(survivalRateRaw) * 100
      : totalRounds > 0
        ? (extractedCount / totalRounds) * 100
        : 0;
  const containersLooted = pickUsefulNumber(
    scav.containersLooted,
    scav.containers_looted,
    scav.containerslooted,
    stats?.containersLooted,
    stats?.totalContainersLooted,
    perf.total_containersLooted,
    perf.totalContainersLooted,
    cd.containersLooted,
    cd.containers_looted,
    agg.containersLooted,
  );
  const itemsExtracted = pickUsefulNumber(
    scav.itemsExtracted,
    scav.items_extracted_count,
    scav.items_extracted,
    stats?.itemsExtracted,
    stats?.totalItemsExtracted,
    perf.total_items_extracted,
    perf.totalItemsExtracted,
    cd.itemsExtracted,
    cd.items_extracted_count,
    agg.itemsExtracted,
  );
  const keysInStash = Array.isArray(stash?.items)
    ? stash.items.filter((it: any) =>
        /key/i.test(
          String(
            it?.type || it?.itemType || it?.item_type || it?.category || '',
          ),
        ),
      ).length
    : 0;
  const avgProfitPerRaid =
    totalRounds > 0 ? Math.round(agg.netProfit / totalRounds) : 0;
  const totalValueExtracted = agg.lootValue;
  const totalValueBroughtIn = agg.loadoutValue;
  const timeTopsideHrs = (agg.durationMs / 3_600_000).toFixed(1);
  const avgScoreRound =
    total > 0 ? Math.round((perf.score_total ?? agg.xp) / total) : 0;
  const avgDamageRound = total > 0 ? Math.round(damageDealt / total) : 0;

  /* ── Blueprint progress ─────────────────────────────────────────────── */
  const bpList =
    (atBlueprints as any)?.blueprints ?? (blueprints as any)?.blueprints ?? [];
  const bpLearned = bpList.filter(
    (b: any) => b.learned !== false && b.status !== 'missing',
  ).length;
  const bpTotal = bpList.length || 1;
  const bpPct = Math.round((bpLearned / bpTotal) * 100);

  /* ── Stash value ────────────────────────────────────────────────────── */
  const stashValue = stats?.stashValue ?? (stash as any)?.totalValue ?? 0;

  /* ── Currencies ─────────────────────────────────────────────────────── */
  const credits = stats?.credits ?? 0;
  const tokens = stats?.tokens ?? 0;
  const raidTokens = stats?.tokens ?? 0;
  const coins = stats?.coins ?? 0;
  // totalCurrency = stash value + all currencies combined

  const totalCurrency = stashValue + credits + tokens + coins;

  /* ── Charts ─────────────────────────────────────────────────────────── */
  // XP per round sparkline
  const xpChart = [...roundsArr].reverse().map((r: any, i: number) => ({
    name: `R${i + 1}`,
    xp: Number(r.score ?? r.xp ?? 0),
    map: (r.mapName || r.map || '').replace(/_/g, ' '),
  }));

  // Weapon damage top-10 from rounds or combatBreakdown
  // Server may send weapon_performance array [{weapon_name, weapon_damage_total}] or flat object
  const wpPerf: any[] =
    (combatBreakdown as any)?.topWeapons ||
    (combatBreakdown as any)?.weapon_performance ||
    [];
  const wdSource: Record<string, number> =
    cd.weapon_damage || (combatBreakdown as any)?.weaponDamage || agg.weaponDmg;
  const topWeapons =
    wpPerf.length > 0
      ? wpPerf
          .map((w: any) => ({
            name: w.weapon_name || w.name || 'Unknown',
            dmg: Number(w.damage ?? w.weapon_damage_total ?? w.amount ?? 0),
          }))
          .filter((w) => w.dmg > 0)
          .sort((a, b) => b.dmg - a.dmg)
      : Object.entries(wdSource)
          .map(([name, dmg]) => ({
            name: name.replace(/_/g, ' '),
            dmg: Number(dmg),
          }))
          .filter((w) => w.dmg > 0)
          .sort((a, b) => b.dmg - a.dmg);
  const maxWpnDmg = topWeapons[0]?.dmg || 1;

  // ARC kills top-10
  // unit_breakdown keys are like "kills_wasp", "kills_fireball" — strip prefix, also handle plain names
  // unit_breakdown keys are like "kills_wasp", "kills_fireball" — strip prefix, also handle plain names
  const arcSource: Record<string, number> =
    cd.unit_breakdown ||
    (combatBreakdown as any)?.pve?.arcDestroyed ||
    agg.arcBreakdown;
  const topArcs = Object.entries(arcSource)
    .map(([rawKey, kills]) => {
      const name = rawKey.startsWith('kills_')
        ? rawKey.slice(6).replace(/_/g, ' ')
        : rawKey.replace(/_/g, ' ');
      // Capitalize each word
      const display = name.replace(/\b\w/g, (c) => c.toUpperCase());
      return {
        name: display,
        kills: Number(kills),
        image: getArcBotIcon(display),
      };
    })
    .filter((a) => a.kills > 0)
    .sort((a, b) => b.kills - a.kills);
  const maxArcKills = topArcs[0]?.kills || 1;

  // Survival donut
  const survivalData = [
    { name: 'Extracted', value: agg.extracted, fill: G },
    { name: 'Deaths', value: agg.deaths, fill: R },
    {
      name: 'Unknown',
      value: Math.max(0, total - agg.extracted - agg.deaths),
      fill: M,
    },
  ].filter((d) => d.value > 0);

  // Map performance from rounds
  const mapPerfMap: Record<
    string,
    { raids: number; extracted: number; kills: number }
  > = {};
  roundsArr.forEach((r: any) => {
    const mapName = (r.mapName || r.map || 'Unknown').replace(/_/g, ' ');
    if (!mapPerfMap[mapName])
      mapPerfMap[mapName] = { raids: 0, extracted: 0, kills: 0 };
    mapPerfMap[mapName].raids++;
    const s = (r.status || r.outcome || '').toLowerCase();
    if (s === 'extracted') mapPerfMap[mapName].extracted++;
    mapPerfMap[mapName].kills +=
      Number(r.arcKills ?? 0) + Number(r.playerKills ?? 0);
  });
  const mapPerf = Object.entries(mapPerfMap)
    .map(([name, d]) => ({
      name,
      ...d,
      survivalPct: d.raids > 0 ? Math.round((d.extracted / d.raids) * 100) : 0,
    }))
    .sort((a, b) => b.raids - a.raids);

  const profileUrl =
    (slugSaved ?? profile?.slug) ? `/u/${slugSaved ?? profile.slug}` : null;

  const saveBio = async () => {
    setBioSaving(true);
    setBioMsg('');
    try {
      await PlayerAPI.updateProfile({ bio: bioInput.trim() });
      await refresh();
      setEditingBio(false);
      setBioMsg('Bio updated.');
    } catch (err: any) {
      setBioMsg(err.message || 'Failed to save bio.');
    } finally {
      setBioSaving(false);
    }
  };

  const claimSlug = async () => {
    if (!slugInput.trim()) return;
    setSlugBusy(true);
    setSlugMsg('');
    try {
      const res = await PublicAPI.setSlug(slugInput.trim());
      setSlugSaved(res.slug);
      setSlugInput('');
      setSlugMsg(`Profile URL set: /u/${res.slug}`);
    } catch (err: any) {
      setSlugMsg(err.message || 'Failed to claim slug.');
    } finally {
      setSlugBusy(false);
    }
  };

  const copyProfileUrl = () => {
    if (!profileUrl) return;
    navigator.clipboard.writeText(`${window.location.origin}${profileUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleVisibility = async () => {
    setVisibilityBusy(true);
    try {
      await PublicAPI.setVisibility(!profilePublic);
      setProfilePublic((v) => !v);
    } catch {
      /* silent */
    } finally {
      setVisibilityBusy(false);
    }
  };

  const embarkLinked = stats?.embarkLinked ?? false;
  const embarkName =
    stats?.embarkUsername ||
    stats?.displayName ||
    profile?.username ||
    profile?.displayName ||
    '—';
  const lastSyncedAt = formatProfileDate(
    (profileSummary as any)?.profile?.lastSync ||
      (profileSummary as any)?.links?.arctracker?.lastSync ||
      (profileSummary as any)?.links?.metaforge?.updatedAt ||
      (stats as any)?.lastSync ||
      (stats as any)?.syncedAt ||
      (stats as any)?.updatedAt,
  );
  const lastSignedInAt = formatProfileDate(
    (profileSummary as any)?.lastActive ||
      profile?.lastActive ||
      profile?.authSession?.expires_at ||
      profile?.createdAt,
  );
  const mfLinks = (profileSummary as any)?.links?.metaforge ?? {};
  const mfProfile = (profileSummary as any)?.profile ?? {};
  const mfProfileId =
    mfLinks.profileId || mfLinks.id || mfProfile.profileId || mfProfile.id;
  const mfDisplayName =
    mfProfile.full_name ||
    mfProfile.displayName ||
    mfProfile.username ||
    mfLinks.username ||
    embarkName;
  const mfAvatarUrl = mfLinks.avatarUrl || mfProfile.avatarUrl;
  const mfEmbarkId =
    mfLinks.embarkId ||
    mfProfile.embarkId ||
    stats?.raider_identity?.metaforge_id ||
    stats?.embarkId;
  const mfLinked = Boolean(mfLinks.linked || mfProfileId || mfEmbarkId);
  const inventoryWeight = pickUsefulNumber(
    (stash as any)?.totalWeight,
    (stash as any)?.weight,
    (stats as any)?.stashWeight,
  );
  const totalRatings = pickNumber(
    mfProfile?.ratings?.summary?.totalRatings,
    mfProfile?.ratings?.totalRatings,
  );
  const reputationScore = pickNumber(
    mfProfile?.ratings?.summary?.reputationScore,
    mfProfile?.ratings?.reputationScore,
  );
  const totalTrades = pickNumber(
    mfProfile?.ratings?.summary?.totalTrades,
    mfProfile?.ratings?.totalTrades,
  );
  const contributionSource = mfProfile?.contributions ?? {};
  const addedMarkers = pickNumber(contributionSource.addedMarkers);
  const liveMarkers = pickNumber(contributionSource.liveMarkers);
  const totalSubmissions = pickNumber(contributionSource.totalSubmissions);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-24 space-y-8">
      {/* ══ HERO: RAIDER IDENTITY CARD ══ */}
      <div
        className="border border-[var(--color-arc-legendary)]"
        style={{ background: CRD, boxShadow: '0 0 24px rgba(255,204,0,0.12)' }}
      >
        {/* Top bar: name + auth + edit */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-[var(--color-arc-legendary)]/20">
          {/* Avatar */}
          <div className="relative shrink-0">
            {mfAvatarUrl ? (
              <img
                src={mfAvatarUrl}
                alt="avatar"
                className="w-14 h-14 object-cover border-2"
                style={{ borderColor: mfLinked ? G : Y }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : profile?.avatar ? (
              <img
                src={`https://cdn.discordapp.com/avatars/${profile.discordId}/${profile.avatar}.webp?size=64`}
                alt="avatar"
                className="w-14 h-14 object-cover border-2"
                style={{ borderColor: Y }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div
                className="w-14 h-14 border-2 flex items-center justify-center"
                style={{ borderColor: Y, background: '#0d0c14' }}
              >
                <span className="text-xl font-black" style={{ color: Y }}>
                  {(embarkName[0] || '?').toUpperCase()}
                </span>
              </div>
            )}
            <span
              className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[var(--color-arc-dark-background)]"
              style={{ background: embarkLinked ? G : M }}
            />
          </div>
          {/* Name + status */}
          <div className="flex-1 min-w-0">
            <h1
              className="text-2xl font-black uppercase tracking-[0.1em] leading-none truncate"
              style={{ color: Y }}
            >
              {embarkName}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span
                className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border"
                style={{
                  borderColor: embarkLinked ? `${G}40` : `${M}40`,
                  color: embarkLinked ? G : M,
                  background: embarkLinked ? `${G}08` : 'transparent',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: embarkLinked ? G : M }}
                />
                {embarkLinked ? 'AUTHENTICATED' : 'NOT LINKED'}
              </span>
              <span
                className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border"
                style={{
                  borderColor: mfLinked ? `${C}40` : `${M}40`,
                  color: mfLinked ? C : M,
                  background: mfLinked ? `${C}08` : 'transparent',
                }}
              >
                MetaForge {mfLinked ? 'Linked' : 'Offline'}
              </span>
              <img
                src={assetUrl('/main/embark.webp')}
                alt="Embark"
                className="h-4 w-auto object-contain opacity-70"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              {lastSyncedAt && (
                <span
                  className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: M }}
                >
                  Last synced at:{' '}
                  <span style={{ color: Y }}>{lastSyncedAt}</span>
                </span>
              )}
              {lastSignedInAt && (
                <span
                  className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: M }}
                >
                  Last signed in:{' '}
                  <span style={{ color: C }}>{lastSignedInAt}</span>
                </span>
              )}
            </div>
          </div>
          {/* Edit profile button */}
          <button
            onClick={() => {
              setBioInput(profile.bio ?? '');
              setEditingBio(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 border text-[9px] font-black uppercase tracking-widest shrink-0 transition-colors"
            style={{ borderColor: `${Y}40`, color: Y }}
          >
            <Edit3 className="w-3 h-3" /> Edit Profile
          </button>
        </div>

        {/* MetaForge-style identity strip */}
        <div
          className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr] gap-3 p-4 border-b"
          style={{ borderColor: `${Y}22` }}
        >
          <div
            className="border p-4"
            style={{
              borderColor: `${C}35`,
              background:
                'linear-gradient(135deg, rgba(34,211,238,0.08), rgba(8,11,22,0.82))',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="text-[9px] font-black uppercase tracking-[0.22em]"
                  style={{ color: M }}
                >
                  MetaForge Profile
                </p>
                <h2
                  className="text-xl font-black uppercase tracking-widest truncate mt-1"
                  style={{ color: 'var(--color-arc-white)' }}
                >
                  {mfDisplayName}
                </h2>
                <p
                  className="text-[10px] font-mono truncate mt-1"
                  style={{ color: C }}
                >
                  {mfProfileId || 'Profile id not linked'}
                </p>
              </div>
              <span
                className="text-[9px] font-black uppercase tracking-widest px-2 py-1 border shrink-0"
                style={{
                  borderColor: mfLinked ? `${G}55` : `${M}35`,
                  color: mfLinked ? G : M,
                }}
              >
                {mfLinked ? 'Live Link' : 'Local'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div>
                <p
                  className="text-[9px] uppercase tracking-widest"
                  style={{ color: M }}
                >
                  Embark ID
                </p>
                <p className="text-sm font-black truncate" style={{ color: Y }}>
                  {mfEmbarkId || 'Not Linked'}
                </p>
              </div>
              <div>
                <p
                  className="text-[9px] uppercase tracking-widest"
                  style={{ color: M }}
                >
                  Access
                </p>
                <p
                  className="text-sm font-black truncate"
                  style={{ color: mfLinked ? G : M }}
                >
                  {mfLinked ? 'Fresh' : 'Unavailable'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
            <MetaForgeMetricCard
              label="Arc Inventory"
              value={`$${fmt$(stashValue)}`}
              sub={`${inventoryWeight.toFixed(2)} weight`}
              color={Y}
              icon={<Package className="w-4 h-4" />}
            />
            <MetaForgeMetricCard
              label="Reputation"
              value={reputationScore}
              sub={`${totalRatings} ratings`}
              color={P}
              icon={<Award className="w-4 h-4" />}
            />
            <MetaForgeMetricCard
              label="Trades"
              value={totalTrades}
              sub="MetaForge market"
              color={C}
              icon={<BarChart2 className="w-4 h-4" />}
            />
            <MetaForgeMetricCard
              label="Map Work"
              value={totalSubmissions || addedMarkers + liveMarkers}
              sub={`${addedMarkers} added / ${liveMarkers} live`}
              color={G}
              icon={<Map className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Currency stat boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[var(--color-arc-legendary)]/20">
          {/* Inventory Value */}
          <div className="flex items-center gap-3 px-4 py-3">
            <img
              src={assetUrl('/dashboard/currency.coin.webp')}
              alt="value"
              className="w-6 h-6 object-contain shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div>
              <p
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: M }}
              >
                Inventory Value
              </p>
              <p
                className="text-base font-black leading-none"
                style={{ color: Y }}
              >
                {fmt$(stashValue)}
              </p>
            </div>
          </div>
          {/* Coins */}
          <div className="flex items-center gap-3 px-4 py-3">
            <img
              src={assetUrl('/icons/coins.webp')}
              alt="coins"
              className="w-6 h-6 object-contain shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div>
              <p
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: M }}
              >
                Coins
              </p>
              <p
                className="text-base font-black leading-none"
                style={{ color: Y }}
              >
                {fmt$(coins)}
              </p>
            </div>
          </div>
          {/* Creds */}
          <div className="flex items-center gap-3 px-4 py-3">
            <img
              src={assetUrl('/main/cred_icon.png')}
              alt="creds"
              className="w-6 h-6 object-contain shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div>
              <p
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: M }}
              >
                Creds
              </p>
              <p
                className="text-base font-black leading-none"
                style={{ color: Y }}
              >
                {fmt$(credits)}
                <span className="text-[9px] ml-1" style={{ color: M }}>
                  /800
                </span>
              </p>
            </div>
          </div>
          {/* Raider Tokens */}
          <div className="flex items-center gap-3 px-4 py-3">
            <img
              src={assetUrl('/main/raidertoken.png')}
              alt="tokens"
              className="w-6 h-6 object-contain shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div>
              <p
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: M }}
              >
                Tokens
              </p>
              <p
                className="text-base font-black leading-none"
                style={{ color: '#f1aa1c' }}
              >
                {fmt$(raidTokens)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ LINK STATUS CARD ══ */}
      {profileSummary && (
        <section>
          <SectionHeading
            icon={ExternalLink}
            label="Linked Accounts & Services"
            color={C}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Discord */}
            <div
              className="border p-3 flex items-center gap-3"
              style={{ borderColor: BD, background: CRD }}
            >
              <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center shrink-0 overflow-hidden">
                {profileSummary.links.discord.avatarUrl ? (
                  <img
                    src={profileSummary.links.discord.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-[10px] font-black">D</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] font-black uppercase tracking-widest truncate"
                  style={{ color: 'var(--color-arc-white)' }}
                >
                  {profileSummary.links.discord.globalName ||
                    profileSummary.links.discord.username ||
                    'Discord'}
                </p>
                <p className="text-[9px]" style={{ color: M }}>
                  Discord Auth
                </p>
              </div>
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: G, boxShadow: `0 0 6px ${G}` }}
              />
            </div>
            {/* ArcTracker */}
            <div
              className="border p-3 flex items-center gap-3"
              style={{ borderColor: BD, background: CRD }}
            >
              <div className="w-8 h-8 rounded-full bg-[#ff6b35] flex items-center justify-center shrink-0">
                <span className="text-white text-[10px] font-black">AT</span>
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] font-black uppercase tracking-widest truncate"
                  style={{ color: 'var(--color-arc-white)' }}
                >
                  ArcTracker
                </p>
                <p className="text-[9px]" style={{ color: M }}>
                  {profileSummary.links.arctracker.linked
                    ? profileSummary.links.arctracker.tokenExpired
                      ? 'Token Expired'
                      : `${profileSummary.links.metaforge.embarkId || 'Linked'}${profileSummary.links.arctracker.tradeLinked ? ' + Trade' : ''}`
                    : 'Not Linked'}
                </p>
              </div>
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background:
                    profileSummary.links.arctracker.linked &&
                    !profileSummary.links.arctracker.tokenExpired
                      ? G
                      : R,
                  boxShadow:
                    profileSummary.links.arctracker.linked &&
                    !profileSummary.links.arctracker.tokenExpired
                      ? `0 0 6px ${G}`
                      : 'none',
                }}
              />
            </div>
            {/* MetaForge */}
            <div
              className="border p-3 flex items-center gap-3"
              style={{ borderColor: BD, background: CRD }}
            >
              <div className="w-8 h-8 rounded-full bg-[#7c3aed] flex items-center justify-center shrink-0 overflow-hidden">
                {profileSummary.links.metaforge.avatarUrl ? (
                  <img
                    src={profileSummary.links.metaforge.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-[10px] font-black">MF</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] font-black uppercase tracking-widest truncate"
                  style={{ color: 'var(--color-arc-white)' }}
                >
                  MetaForge
                </p>
                <p className="text-[9px]" style={{ color: M }}>
                  {profileSummary.links.metaforge.linked
                    ? profileSummary.profile?.full_name ||
                      profileSummary.profile?.username ||
                      profileSummary.links.metaforge.embarkId ||
                      profileSummary.links.metaforge.id
                    : 'Not Linked'}
                </p>
              </div>
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: profileSummary.links.metaforge.linked ? G : M,
                  boxShadow: profileSummary.links.metaforge.linked
                    ? `0 0 6px ${G}`
                    : 'none',
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* ══ LOCAL PROGRESS TRACKING ══ */}
      <section>
        <SectionHeading
          icon={ListChecks}
          label="Local Progress Tracking"
          color={G}
        />
        <div
          className="border p-4"
          style={{ borderColor: BD, background: CRD }}
        >
          {progressSummary ? (
            <div className="space-y-3">
              {/* Three-track progress bars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ProgressBar
                  label="Quests"
                  completed={progressSummary.quests.completed}
                  total={progressSummary.quests.total}
                  color={C}
                />
                <ProgressBar
                  label="Projects"
                  completed={progressSummary.projects.completed}
                  total={progressSummary.projects.total}
                  color={P}
                />
                <ProgressBar
                  label="Workshops"
                  completed={progressSummary.workshops.completed}
                  total={progressSummary.workshops.total}
                  color={Y}
                />
              </div>
              <div
                className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-3 border-t"
                style={{ borderColor: BD }}
              >
                <div>
                  <p
                    className="text-[9px] font-black uppercase tracking-widest mb-2"
                    style={{ color: M }}
                  >
                    Hideout Levels
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(userProgress.hideoutLevels).map(
                      ([key, level]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-2 border px-2 py-1"
                          style={{
                            borderColor: `${G}22`,
                            background: '#070a12',
                          }}
                        >
                          <span
                            className="text-[9px] uppercase truncate"
                            style={{ color: 'var(--color-arc-white)' }}
                          >
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span
                            className="text-[10px] font-black tabular-nums"
                            style={{ color: G }}
                          >
                            {level}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
                <div>
                  <p
                    className="text-[9px] font-black uppercase tracking-widest mb-2"
                    style={{ color: M }}
                  >
                    Completion Lists
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <StatTile
                      label="Completed Quests"
                      value={userProgress.completedQuests.length}
                      color={C}
                      icon={<ListChecks className="w-4 h-4" />}
                    />
                    <StatTile
                      label="Completed Projects"
                      value={userProgress.completedProjects.length}
                      color={P}
                      icon={<Target className="w-4 h-4" />}
                    />
                  </div>
                </div>
                <div>
                  <p
                    className="text-[9px] font-black uppercase tracking-widest mb-2"
                    style={{ color: M }}
                  >
                    Project Phase Progress
                  </p>
                  <div
                    className="border px-3 py-2 h-full min-h-[76px] flex flex-col justify-center"
                    style={{ borderColor: `${Y}30`, background: '#070a12' }}
                  >
                    <p
                      className="text-2xl font-black leading-none"
                      style={{ color: Y }}
                    >
                      {Object.keys(userProgress.projectPhaseProgress).length}
                    </p>
                    <p
                      className="text-[9px] uppercase tracking-widest mt-1"
                      style={{ color: M }}
                    >
                      tracked phases
                    </p>
                    <p className="text-[9px] mt-2" style={{ color: M }}>
                      Updated:{' '}
                      {new Date(userProgress.lastUpdated).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              {progressSummary.lastUpdated && (
                <p className="text-[9px]" style={{ color: M }}>
                  Last updated:{' '}
                  {new Date(progressSummary.lastUpdated).toLocaleString()}
                </p>
              )}
              {/* Actions row */}
              <div
                className="flex flex-wrap items-center gap-1.5 pt-2 border-t"
                style={{ borderColor: BD }}
              >
                <input
                  ref={importRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <button
                  onClick={() => importRef.current?.click()}
                  disabled={importing}
                  className="flex h-8 w-8 items-center justify-center border transition-colors disabled:opacity-50"
                  style={{ borderColor: `${C}40`, color: C }}
                  title={importing ? 'Importing...' : 'Import progress'}
                  aria-label={
                    importing ? 'Importing progress' : 'Import progress'
                  }
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={downloadCompletions}
                  className="flex h-8 w-8 items-center justify-center border transition-colors"
                  style={{ borderColor: `${Y}40`, color: Y }}
                  title="Export progress"
                  aria-label="Export progress"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="flex h-8 w-8 items-center justify-center border transition-colors disabled:opacity-50"
                  style={{ borderColor: `${R}40`, color: R }}
                  title={resetting ? 'Resetting...' : 'Reset progress'}
                  aria-label={
                    resetting ? 'Resetting progress' : 'Reset progress'
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={refreshProgress}
                  className="ml-auto flex h-8 w-8 items-center justify-center border transition-colors"
                  style={{ borderColor: `${M}40`, color: M }}
                  title="Refresh progress"
                  aria-label="Refresh progress"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-center py-3" style={{ color: M }}>
              Loading progress data...
            </p>
          )}
        </div>
      </section>

      {/* ══ CORE STATS OVERVIEW ══ */}
      {stats && (
        <section>
          <SectionHeading icon={Activity} label="Raider Identity" color={Y} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <StatTile
              label="Embark ID"
              value={
                stats.raider_identity?.metaforge_id || stats.embarkId || '—'
              }
              color={Y}
              icon={
                <img
                  src={assetUrl('/dont.webp')}
                  alt="Don't Shoot"
                  className="h-5 w-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              }
            />
            <StatTile
              label="Level"
              value={`${Math.min(stats.level || 1, 75)}/75`}
              color={Y}
              icon={
                <img
                  src={assetUrl('/icons/raidertool.webp')}
                  alt="level"
                  className="w-5 h-5 object-contain"
                />
              }
            />
            <StatTile
              label="Total XP"
              value={fmt$(stats.totalXp || stats.xp || 0)}
              color={C}
              icon={
                <img
                  src={assetUrl('/icons/merits.webp')}
                  alt="xp"
                  className="w-5 h-5 object-contain"
                />
              }
            />
            <StatTile
              label="Credits"
              value={fmt$(stashValue)}
              color={G}
              icon={
                <img
                  src={assetUrl('/main/cred_icon.png')}
                  alt="cred"
                  className="w-5 h-5 object-contain"
                />
              }
            />
            <StatTile
              label="Stash"
              value={fmt$(credits)}
              color={Y}
              icon={
                <img
                  src={assetUrl('/icons/coins.webp')}
                  alt="stash"
                  className="w-5 h-5 object-contain"
                />
              }
            />
            <StatTile
              label="Raider Tokens"
              value={fmt$(tokens)}
              color={C}
              icon={
                <img
                  src={assetUrl('/main/raidertoken.png')}
                  alt="tokens"
                  className="w-5 h-5 object-contain"
                />
              }
            />
            <StatTile
              label="Coins"
              value={fmt$(coins)}
              color="#ffd700"
              icon={
                <img
                  src={assetUrl('/icons/coins.webp')}
                  alt="coins"
                  className="w-5 h-5 object-contain"
                />
              }
            />
          </div>

          {/* Blueprint progress bar */}
          {bpList.length > 0 && (
            <div
              className="mt-3 p-4 border"
              style={{ borderColor: BD, background: CRD }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src={assetUrl('/icons/blueprint.webp')}
                    alt="blueprint"
                    className="w-4 h-4 object-contain"
                  />
                  <span
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: M }}
                  >
                    Blueprint Progress
                  </span>
                </div>
                <span className="text-sm font-black" style={{ color: C }}>
                  {bpLearned} / {bpTotal} ({bpPct}%)
                </span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: BD }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${bpPct}%`,
                    background: `linear-gradient(90deg, ${C}, ${G})`,
                  }}
                />
              </div>
            </div>
          )}
        </section>
      )}

      {/* ══ COMBAT STATS ══ */}
      <section>
        <SectionHeading icon={Crosshair} label="Combat Statistics" color={R} />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <StatTile
            label="Total Raids"
            value={total || stats?.totalRaids || 0}
            color={Y}
          />
          <StatTile label="Extractions" value={extractedCount} color={G} />
          <StatTile
            label="Deaths"
            value={
              agg.deaths || Number(stats?.totalRaids ?? 0) - extractedCount
            }
            color={R}
          />
          <StatTile
            label="Survival Rate"
            value={fmtPct(survivalPct)}
            color={G}
            sub={`${extractedCount} extractions`}
          />
          <StatTile label="Player Kills" value={playerKills} color={P} />
          <StatTile label="ARC Kills" value={arcKillsTotal} color={C} />
          <StatTile label="K/D Ratio" value={kdRatio} color={Y} />
          <StatTile label="Total Kills" value={totalKills} color={R} />
          <StatTile label="Damage Dealt" value={fmt$(damageDealt)} color={R} />
          <StatTile
            label="Avg Score/Raid"
            value={avgScoreRound.toLocaleString()}
            color={Y}
          />
          <StatTile
            label="Avg Damage/Raid"
            value={fmt$(avgDamageRound)}
            color={R}
          />
          <StatTile
            label="Time Topside"
            value={`${timeTopsideHrs}h`}
            color={M}
          />
        </div>
      </section>

      {/* ══ SCAVENGING ══ */}
      <section>
        <SectionHeading icon={Package} label="Scavenging & World" color={C} />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <StatTile
            label="Containers Looted"
            value={containersLooted}
            color={C}
            icon={
              <img
                src={assetUrl('/icons/backpack.webp')}
                className="w-5 h-5 object-contain"
                alt=""
              />
            }
          />
          <StatTile
            label="Keys In Stash"
            value={keysInStash}
            color={Y}
            icon={
              <img
                src={assetUrl('/icons/key.webp')}
                className="w-5 h-5 object-contain"
                alt=""
              />
            }
          />
          <StatTile
            label="Blueprints Learned"
            value={`${bpLearned}/${bpTotal}`}
            color={P}
            icon={
              <img
                src={assetUrl('/icons/blueprint.webp')}
                className="w-5 h-5 object-contain"
                alt=""
              />
            }
          />
          <StatTile
            label={EMBARK_STAT_LABELS.avgProfitPerExtraction}
            value={fmt$(avgProfitPerRaid)}
            color={G}
            icon={
              <img
                src={assetUrl('/main/cred_icon.png')}
                className="w-5 h-5 object-contain"
                alt=""
              />
            }
          />
          <StatTile
            label={EMBARK_STAT_LABELS.valueExtracted}
            value={fmt$(totalValueExtracted)}
            color={G}
            icon={
              <img
                src={assetUrl('/icons/leftarrow.webp')}
                className="w-5 h-5 object-contain"
                alt=""
              />
            }
          />
          <StatTile
            label={EMBARK_STAT_LABELS.valueBroughtIn}
            value={fmt$(totalValueBroughtIn)}
            color={M}
            icon={
              <img
                src={assetUrl('/icons/refiner.webp')}
                className="w-5 h-5 object-contain"
                alt=""
              />
            }
          />
          <StatTile
            label={EMBARK_STAT_LABELS.netValue}
            value={fmt$(agg.netProfit)}
            color={Y}
            icon={
              <img
                src={assetUrl('/icons/owned.webp')}
                className="w-5 h-5 object-contain"
                alt=""
              />
            }
          />
          <StatTile
            label="Items Extracted"
            value={itemsExtracted}
            color={C}
            icon={
              <img
                src={assetUrl('/icons/craftingmaterials.webp')}
                className="w-5 h-5 object-contain"
                alt=""
              />
            }
          />
        </div>
      </section>

      {/* ══ CHARTS ROW ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* XP per round sparkline */}
        {xpChart.length > 0 && (
          <div
            className="border p-4"
            style={{ borderColor: BD, background: CRD }}
          >
            <SectionHeading
              icon={TrendingUp}
              label="XP Per Raid (Last 20)"
              color={Y}
            />
            <ResponsiveContainer width="100%" height={140}>
              <LineChart
                data={xpChart}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: M }} />
                <YAxis tick={{ fontSize: 9, fill: M }} />
                <RTooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="xp"
                  stroke={Y}
                  strokeWidth={2}
                  dot={false}
                  name="XP"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Survival donut */}
        {survivalData.length > 0 && (
          <div
            className="border p-4"
            style={{ borderColor: BD, background: CRD }}
          >
            <SectionHeading icon={Shield} label="Raid Outcomes" color={G} />
            <div className="flex items-center justify-center gap-6">
              <PieChart width={130} height={130}>
                <Pie
                  data={survivalData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={58}
                  paddingAngle={2}
                >
                  {survivalData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Pie>
              </PieChart>
              <div className="space-y-2">
                {survivalData.map((d) => (
                  <div
                    key={d.name}
                    className="flex items-center gap-2 text-[11px] font-black"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: d.fill }}
                    />
                    <span style={{ color: 'var(--color-arc-white)' }}>
                      {d.name}
                    </span>
                    <span style={{ color: d.fill }}>{d.value}</span>
                  </div>
                ))}
                <div
                  className="text-[10px] pt-1 border-t"
                  style={{ borderColor: BD, color: G }}
                >
                  Survival: <strong>{fmtPct(survivalPct)}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top 10 Weapons by damage */}
        <div
          className="border p-4"
          style={{ borderColor: BD, background: CRD }}
        >
          <SectionHeading
            icon={Crosshair}
            label="Top 10 Weapons by Damage"
            color={P}
          />
          {topWeapons.length > 0 ? (
            <div className="space-y-1.5">
              {topWeapons.map((w, i) => (
                <MiniBar
                  key={w.name}
                  name={w.name}
                  value={w.dmg}
                  max={maxWpnDmg}
                  color={[P, C, Y, G, R][i % 5]}
                  rank={i}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs py-4 text-center" style={{ color: M }}>
              No weapon data yet — sync more raids to populate
            </p>
          )}
        </div>

        {/* Top 10 ARC units killed */}
        <div
          className="border p-4"
          style={{ borderColor: BD, background: CRD }}
        >
          <SectionHeading
            icon={Skull}
            label="Top 10 ARC Units Eliminated"
            color={C}
          />
          {topArcs.length > 0 ? (
            <div className="space-y-1.5">
              {topArcs.map((a, i) => (
                <MiniBar
                  key={a.name}
                  name={a.name}
                  value={a.kills}
                  max={maxArcKills}
                  color={[C, Y, G, P, R][i % 5]}
                  rank={i}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs py-4 text-center" style={{ color: M }}>
              No ARC kill data yet — sync more raids to populate
            </p>
          )}
        </div>

        {/* Map performance */}
        {mapPerf.length > 0 && (
          <div
            className="border p-4 lg:col-span-2"
            style={{ borderColor: BD, background: CRD }}
          >
            <SectionHeading icon={Map} label="Map Performance" color={Y} />
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={mapPerf}
                margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: M }} />
                <YAxis tick={{ fontSize: 9, fill: M }} />
                <RTooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="raids"
                  name="Raids"
                  fill={`${Y}88`}
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="extracted"
                  name="Extracted"
                  fill={G}
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="kills"
                  name="Kills"
                  fill={R}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ══ BIO + PROFILE URL ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bio */}
        <div
          className="border p-4"
          style={{ borderColor: BD, background: CRD }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3
              className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2"
              style={{ color: 'var(--color-arc-white)' }}
            >
              <Edit3 className="w-3.5 h-3.5" style={{ color: Y }} /> Bio
            </h3>
            {!editingBio && (
              <button
                onClick={() => {
                  setBioInput(profile.bio ?? '');
                  setEditingBio(true);
                }}
                className="text-[9px] font-black uppercase px-2 py-1 border transition-colors"
                style={{ borderColor: `${Y}40`, color: Y }}
              >
                Edit
              </button>
            )}
          </div>
          {editingBio ? (
            <div className="space-y-2">
              <textarea
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                maxLength={300}
                rows={3}
                className="w-full bg-[#050505] border border-arc-border text-white text-sm px-3 py-2 resize-none focus:outline-none focus:border-[var(--color-arc-yellow)]/50 placeholder-[#4a4a5a]"
                placeholder="Write something about yourself..."
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditingBio(false)}
                  className="px-3 py-1.5 border text-[9px] font-black uppercase"
                  style={{ borderColor: BD, color: M }}
                >
                  <X className="w-3 h-3 inline mr-1" />
                  Cancel
                </button>
                <button
                  onClick={saveBio}
                  disabled={bioSaving}
                  className="px-3 py-1.5 border text-[9px] font-black uppercase"
                  style={{
                    borderColor: `${Y}40`,
                    color: Y,
                    background: `${Y}10`,
                  }}
                >
                  {bioSaving ? (
                    <Loader2 className="w-3 h-3 inline animate-spin" />
                  ) : (
                    <Check className="w-3 h-3 inline" />
                  )}{' '}
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p
              className="text-sm leading-relaxed border-l-2 pl-3"
              style={{
                borderColor: `${G}40`,
                color: profile.bio ? 'var(--color-arc-white)' : M,
              }}
            >
              {profile.bio || 'No bio set yet.'}
            </p>
          )}
          {bioMsg && (
            <p
              className="mt-2 text-[9px] font-black uppercase"
              style={{ color: G }}
            >
              {bioMsg}
            </p>
          )}
        </div>

        {/* Public profile URL */}
        <div
          className="border p-4"
          style={{ borderColor: BD, background: CRD }}
        >
          <h3
            className="text-xs font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2"
            style={{ color: 'var(--color-arc-white)' }}
          >
            <ExternalLink className="w-3.5 h-3.5" style={{ color: C }} /> Public
            Profile
          </h3>
          {profileUrl ? (
            <div className="space-y-2">
              <div
                className="flex items-center gap-2 p-2 border text-sm"
                style={{ borderColor: BD, background: BG }}
              >
                <span
                  className="flex-1 font-mono text-[11px]"
                  style={{ color: C }}
                >
                  {window.location.origin}
                  {profileUrl}
                </span>
                <button onClick={copyProfileUrl} className="p-1" title="Copy">
                  {copied ? (
                    <Check className="w-3.5 h-3.5" style={{ color: G }} />
                  ) : (
                    <Copy className="w-3.5 h-3.5" style={{ color: M }} />
                  )}
                </button>
              </div>
              <button
                onClick={toggleVisibility}
                disabled={visibilityBusy}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1.5 border transition-colors"
                style={{ borderColor: BD, color: profilePublic ? G : M }}
              >
                {visibilityBusy ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : profilePublic ? (
                  <Eye className="w-3 h-3" />
                ) : (
                  <EyeOff className="w-3 h-3" />
                )}
                {profilePublic ? 'Public' : 'Private'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px]" style={{ color: M }}>
                Claim a public slug to share your raider profile.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value)}
                  placeholder="your-handle"
                  className="flex-1 bg-[#050505] border text-white text-sm px-3 py-2 focus:outline-none"
                  style={{ borderColor: BD }}
                />
                <button
                  onClick={claimSlug}
                  disabled={slugBusy || !slugInput.trim()}
                  className="px-4 py-2 text-[10px] font-black uppercase border transition-colors disabled:opacity-50"
                  style={{
                    borderColor: `${C}40`,
                    color: C,
                    background: `${C}10`,
                  }}
                >
                  {slugBusy ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    'Claim'
                  )}
                </button>
              </div>
              {slugMsg && (
                <p className="text-[9px] font-black" style={{ color: G }}>
                  {slugMsg}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ BADGES ══ */}
      {profile.badges && profile.badges.length > 0 && (
        <section>
          <SectionHeading
            icon={Award}
            label="Achievements"
            color="var(--color-arc-legendary)"
          />
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((b: any) => (
              <div
                key={b.id}
                className="px-3 py-2 border text-[9px] font-black uppercase tracking-[0.2em]"
                style={{
                  borderColor: 'var(--color-arc-legendary)/30',
                  color: 'var(--color-arc-legendary)',
                  background: 'var(--color-arc-legendary)08',
                }}
                title={`Earned ${new Date(b.earnedAt).toLocaleDateString()}`}
              >
                {b.icon && <span className="mr-1">{b.icon}</span>}
                {b.name}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
