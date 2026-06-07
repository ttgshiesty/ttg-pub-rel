import { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  Shield,
  Coins,
  Target,
  Package,
  Activity,
  TrendingUp,
  Zap,
  Trophy,
  RefreshCw,
  Monitor,
  Skull,
  Map,
  Crosshair,
  Clock,
  BarChart2,
  Flame,
  AlertTriangle,
  CheckCircle,
  Box,
  Layers,
  Home,
} from 'lucide-react';
import { SUPPORTED_PLATFORMS } from '../lib/extensionBridge';
import {
  ALL_ITEMS,
  enrichItem,
  getItemData,
  getItemDataByGameAssetId,
  getItemImg,
  getItemImgWebp,
} from '../lib/itemDb';
import { assetUrl } from '../lib/assetUrl';
import { getArcBotIcon, getArcBotIconById } from '../lib/arcBotIcon';
import { Tooltip, LabelTooltip } from '../components/Tooltip';
import { HudStatBox } from '../components/ui/HudStatBox';
import arctrackerLabels from '../data/arctracker-en.json';
// import { RaiderBackdrop } from '../components/RaiderBackdrop'; // available for future use
import { SurvivalHeatmap } from '../components/stats';
import '../StashSidebar.css';
import {
  getRarityVisualTier,
  rarityCardContainerClasses,
  rarityCardTopBarClass,
  rarityBadgeClasses,
  rarityImageBackdropClass,
} from '../lib/rarityCardStyles';

const RAID_LABELS = arctrackerLabels.RaidHistoryPage;
const EMBARK_STAT_LABELS = RAID_LABELS.embarkStats;

const ICONS = {
  backpack: assetUrl('/icons/backpack.webp'),
  blueprint: assetUrl('/icons/blueprint.webp'),
  crafting: assetUrl('/icons/craftingmaterials.webp'),
  explosive: assetUrl('/icons/explosive.webp'),
  gear: assetUrl('/icons/gear.webp'),
  key: assetUrl('/icons/key.webp'),
  medical: assetUrl('/icons/medical.webp'),
  merits: assetUrl('/icons/merits.webp'),
  mine: assetUrl('/icons/mine.webp'),
  outfit: assetUrl('/icons/outfit.webp'),
  quest: assetUrl('/icons/quest.webp'),
  raiderToken: assetUrl('/main/raidertoken.png'),
  utility: assetUrl('/icons/utility.webp'),
  weaponMod: assetUrl('/icons/weaponmod.webp'),
  currency: assetUrl('/main/currency_icon.png'),
  //star: assetUrl('/icons/star.webp'),
  refresh: assetUrl('/icons/refresh.webp'),
  star: assetUrl('/toxic.webp'),
  dontshoot: assetUrl('/dont.webp'),
  inbox: assetUrl('/icons/inbox.webp'),
  settings: assetUrl('/icons/settings.webp'),
  Apollo: assetUrl('/main/apollo.png'),
  Celeste: assetUrl('/main/celeste.png'),
  Lance: assetUrl('/main/lance.png'),
  Shani: assetUrl('/main/shani.png'),
  TianWen: assetUrl('/main/tianwen.png'),
  Scrappy: assetUrl('/main/outfitscrappy.webp'),
  Ermal: assetUrl('/main/ermal.webp'),
};

const DASHBOARD_TRADERS = [
  {
    name: 'Apollo',
    role: 'Gadgets & Community',
    image: ICONS.Apollo,
    color: 'var(--color-arc-yellow)',
  },
  {
    name: 'Shani',
    role: 'Security',
    image: ICONS.Shani,
    color: 'var(--color-arc-rare)',
  },
  {
    name: 'Celeste',
    role: 'Materials & Morale',
    image: ICONS.Celeste,
    color: 'var(--color-arc-epic)',
  },
  {
    name: 'Tian Wen',
    role: 'Weapons',
    image: ICONS.TianWen,
    color: '#c43198',
  },
  {
    name: 'Lance',
    role: 'Medical',
    image: ICONS.Lance,
    color: 'var(--color-arc-danger)',
  },
  {
    name: 'Ermal',
    role: 'Stash Expansions',
    image: ICONS.Ermal,
    color: 'var(--color-arc-yellow)',
  },
  {
    name: 'SCRAPPY',
    role: 'My Buddy',
    image: ICONS.Scrappy,
    color: '#8a7a9a',
  },
];

const BASE_URL = import.meta.env.VITE_API_URL || '';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

function itemText(
  value: string | { en?: string; EN?: string },
  fallback = '',
): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return value.en || value.EN || fallback;
}

function codexKey(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getWeaponCodex(
  itemId?: string,
  name?: string,
  weaponAssetId?: string | number | null,
): any | null {
  const direct =
    getItemDataByGameAssetId(weaponAssetId) ||
    getItemData(itemId || '') ||
    getItemData(name || '');
  if (direct) return direct;
  const assetKey =
    weaponAssetId !== undefined && weaponAssetId !== null
      ? String(weaponAssetId)
      : '';
  const nameKey = codexKey(name);
  if (!nameKey && !assetKey) return null;
  return (
    ALL_ITEMS.find((item: any) => {
      const localName = codexKey(itemText(item.name, item.id));
      const localId = codexKey(item.id);
      const localAssetIds = [
        item.game_asset_id,
        item.gameAssetId,
        item.assetId,
        item.weaponAssetId,
      ]
        .filter((value) => value !== undefined && value !== null)
        .map(String);
      return (
        (nameKey && (localName === nameKey || localId === nameKey)) ||
        (assetKey && localAssetIds.includes(assetKey))
      );
    }) || null
  );
}

function weaponCodexLine(codex: any): string {
  if (!codex) return 'Weapon damage tracked from raids';
  const statBlock = codex.stat_block || codex.statBlock || {};
  const parts = [
    codex.rarity,
    codex.type || codex.item_type,
    statBlock.damage ? `${statBlock.damage} dmg` : null,
    statBlock.damagePerSecond ? `${statBlock.damagePerSecond} dps` : null,
    statBlock.magazineSize ? `${statBlock.magazineSize} mag` : null,
  ].filter(Boolean);
  return parts.join(' / ') || 'Weapon damage tracked from raids';
}
function fmtNum(n: number) {
  return n.toLocaleString();
}
function formatDuration(s: number) {
  if (!Number.isFinite(s) || s <= 0) return '—';
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    ss = Math.floor(s % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${ss}s`;
  return `${ss}s`;
}
function timeAgo(iso: string) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function pickArray(data: any, keys: string[]) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const k of keys) if (Array.isArray(data[k])) return data[k];
  return [];
}
function asSlotArray(v: any) {
  return Array.isArray(v) ? v : v ? [v] : [];
}

// ─── Sync Status Bar ────────────────────────────────────────────────────────

const AUTH_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function SyncStatusBar({
  syncedAt,
  authState,
  onSync,
  isSyncing,
}: {
  syncedAt: string | null | undefined;
  authState: string;
  onSync: () => void;
  isSyncing: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const syncedMs = syncedAt ? new Date(syncedAt).getTime() : null;
  const elapsedMs = syncedMs ? now - syncedMs : null;
  const remainingMs = syncedMs ? AUTH_TTL_MS - elapsedMs! : null;
  const needsReauth = remainingMs != null && remainingMs <= 0;
  const urgentReauth = remainingMs != null && remainingMs < 2 * 60 * 60 * 1000; // < 2h

  function fmtRemaining(ms: number) {
    if (ms <= 0) return 'EXPIRED';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function fmtElapsed(ms: number) {
    if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
    if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
    return `${Math.floor(ms / 86400000)}d ago`;
  }

  const borderColor = needsReauth
    ? 'var(--color-arc-danger)'
    : urgentReauth
      ? '#f59e0b'
      : 'var(--color-arc-yellow)';

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 border text-[9px] font-black uppercase tracking-widest flex-wrap gap-3"
      style={{
        background: needsReauth
          ? 'rgba(232,58,58,0.06)'
          : 'rgba(241,170,28,0.04)',
        borderColor,
        borderLeftWidth: 3,
      }}
    >
      <div className="flex items-center gap-4 flex-wrap">
        {/* Auth status */}
        <div className="flex items-center gap-1.5">
          {needsReauth ? (
            <AlertTriangle
              className="w-3 h-3"
              style={{ color: 'var(--color-arc-danger)' }}
            />
          ) : (
            <CheckCircle
              className="w-3 h-3"
              style={{ color: 'var(--color-arc-yellow)' }}
            />
          )}
          <span
            style={{
              color: needsReauth
                ? 'var(--color-arc-danger)'
                : 'var(--color-arc-yellow)',
            }}
          >
            {authState === 'linked'
              ? needsReauth
                ? 'Re-Auth Required'
                : 'Authenticated'
              : 'Not Linked'}
          </span>
        </div>
        {/* Last sync */}
        {syncedMs && (
          <div
            className="flex items-center gap-1.5"
            style={{ color: 'var(--color-arc-muted)' }}
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span>Last Sync: {fmtElapsed(elapsedMs!)}</span>
          </div>
        )}
        {/* Session countdown */}
        {remainingMs != null && (
          <div
            className="flex items-center gap-1.5"
            style={{
              color: needsReauth
                ? 'var(--color-arc-danger)'
                : urgentReauth
                  ? '#f59e0b'
                  : 'var(--color-arc-muted)',
            }}
          >
            <Clock className="w-2.5 h-2.5" />
            <span>
              Session:{' '}
              {needsReauth
                ? 'EXPIRED — re-auth now'
                : fmtRemaining(remainingMs)}
            </span>
          </div>
        )}
        {!syncedMs && (
          <span style={{ color: 'var(--color-arc-muted)' }}>
            No sync data yet
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {needsReauth && (
          <a
            href="/api/auth/discord"
            className="px-3 py-1 text-[8px] font-black uppercase tracking-widest border"
            style={{
              background: 'rgba(232,58,58,0.15)',
              borderColor: 'var(--color-arc-danger)',
              color: 'var(--color-arc-danger)',
            }}
          >
            Re-Authenticate
          </a>
        )}
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-3 py-1 border disabled:opacity-40 transition-colors"
          style={{
            borderColor: 'var(--color-arc-yellow)30',
            color: 'var(--color-arc-yellow)',
          }}
        >
          <RefreshCw
            className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin' : ''}`}
          />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
    </div>
  );
}

// ─── Survival & Loot Stats Panel ──────────────────────────────────────────────

function SurvivalStatsPanel({
  combatSummary,
  combatBreakdown,
  roundsData,
}: {
  combatSummary: any;
  combatBreakdown: any;
  roundsData: any[];
}) {
  // Pull from all available sources — never hardcode
  const cb = combatBreakdown || {};
  const cs = combatSummary || {};
  const perf = cb.performance_analytics || {};
  const detailed = cb.combat_detailed || {};
  const primary = cb.primary_stats || cs.primary_stats || {};
  const wallet = cb.wallet_and_economy || cs.wallet_and_economy || {};
  const economy = cb.economy || cs.economy || {};
  const pickNumber = (...values: any[]) => {
    for (const value of values) {
      if (value === null || value === undefined || value === '') continue;
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return 0;
  };
  const pickUsefulNumber = (...values: any[]) => {
    let firstFinite = 0;
    let hasFinite = false;
    for (const value of values) {
      if (value === null || value === undefined || value === '') continue;
      const n = Number(value);
      if (!Number.isFinite(n)) continue;
      if (!hasFinite) {
        firstFinite = n;
        hasFinite = true;
      }
      if (n !== 0) return n;
    }
    return hasFinite ? firstFinite : 0;
  };

  const totalRounds = pickUsefulNumber(
    cs.totalRaids,
    cs.totalRounds,
    perf.total_rounds,
    primary.total_raids,
    roundsData.length,
  );
  const totalExtracted = pickUsefulNumber(
    cs.successfulExtractions,
    cs.totalExtracted,
    perf.total_extractions,
    perf.successful_extractions,
    perf.successful_raids,
    primary.total_extractions,
    roundsData.filter((r: any) => {
      const st = (r.outcome || r.status || '').toString().toLowerCase();
      return st === 'extracted' || st.includes('extract');
    }).length,
  );
  const totalDied = pickUsefulNumber(
    cs.failedRaids,
    cs.totalDied,
    perf.total_deaths,
    primary.total_deaths,
    roundsData.filter((r: any) => {
      const st = (r.outcome || r.status || '').toString().toLowerCase();
      return st === 'died' || st === 'failed';
    }).length,
  );
  const totalTimeMs = pickUsefulNumber(
    cs.totalTimeMs,
    cs.topsideSeconds != null ? Number(cs.topsideSeconds) * 1000 : null,
    perf.total_time_ms,
    perf.time_topside_seconds != null
      ? Number(perf.time_topside_seconds) * 1000
      : null,
    primary.time_topside != null ? Number(primary.time_topside) * 1000 : null,
    roundsData.reduce(
      (acc: number, r: any) => acc + Number(r.durationMs ?? r.duration ?? 0),
      0,
    ),
  );
  const totalValueExtracted = pickUsefulNumber(
    cs.lootValue,
    cs.totalValueExtracted,
    perf.total_value_extracted,
    primary.total_value_extracted,
    detailed.loot_value,
    roundsData.reduce(
      (acc: number, r: any) =>
        acc + Number(r.valueExtracted ?? r.lootValue ?? 0),
      0,
    ),
  );
  const totalValueBroughtIn = pickNumber(
    cs.totalValueBroughtIn,
    perf.total_value_brought_in,
    primary.total_value_brought_in,
    roundsData.reduce(
      (acc: number, r: any) =>
        acc + Number(r.valueBroughtIn ?? r.loadoutValue ?? 0),
      0,
    ),
  );
  const totalNetValue = pickUsefulNumber(
    cs.netProfit,
    cs.totalNetValue,
    perf.net_profit,
    primary.net_profit_loss,
    wallet.total_net_profit,
    economy.netProfit,
    detailed.net_profit,
    roundsData.reduce(
      (acc: number, r: any) => acc + Number(r.netValue ?? r.netProfit ?? 0),
      0,
    ),
  );
  const totalArcKills = pickUsefulNumber(
    cs.arcKills,
    cs.arc_enemies_destroyed,
    detailed.arc_kills_total,
    primary.arc_enemies_destroyed,
  );
  const totalPlayerKills = pickUsefulNumber(
    cs.playerKills,
    cs.totalPlayerKills,
    detailed.player_kills,
    primary.player_kills,
  );
  const totalDamage = pickUsefulNumber(
    cs.totalDamage,
    detailed.damage_dealt_total,
    detailed.total_damage,
    primary.damage_dealt,
    cb.pvp?.totalDamage,
  );
  const totalDamageTaken = pickUsefulNumber(
    cs.damageTaken,
    cs.totalDamageTaken,
    cs.damage_received,
    detailed.damage_received_total,
    detailed.damage_received,
    primary.damage_received,
  );
  const scav =
    cb.scavenging_and_world ||
    cb.scavenging ||
    cs.scavenging_and_world ||
    cs.scavenging ||
    {};
  const containersLooted = pickUsefulNumber(
    scav.containersLooted,
    scav.containers_looted,
    scav.containerslooted,
    cs.containersLooted,
    cs.totalContainersLooted,
    primary.containers_looted,
    perf.total_containersLooted,
    perf.totalContainersLooted,
    detailed.containersLooted,
    detailed.containers_looted,
    roundsData.reduce(
      (acc: number, r: any) =>
        acc +
        Number(r.containersLooted ?? r.lootedContainers ?? r.containers ?? 0),
      0,
    ),
  );
  const survivalRate =
    totalRounds > 0 ? (totalExtracted / totalRounds) * 100 : 0;
  const avgTimePerRaid = totalRounds > 0 ? totalTimeMs / totalRounds : 0;
  const lootPerMinute =
    totalTimeMs > 0 ? totalValueExtracted / (totalTimeMs / 60000) : 0;
  const avgKillsPerRaid =
    totalRounds > 0 ? (totalArcKills + totalPlayerKills) / totalRounds : 0;

  const Y = 'var(--color-arc-yellow)';
  const R = 'var(--color-arc-danger)';
  const B = 'var(--color-arc-rare)';
  const G = 'var(--color-arc-epic)';
  const M = 'var(--color-arc-legendary)';

  const stats = [
    {
      label: 'Total Raids',
      value: totalRounds.toLocaleString(),
      color: Y,
      icon: Activity,
    },
    {
      label: 'Extracted',
      value: totalExtracted.toLocaleString(),
      color: Y,
      icon: TrendingUp,
    },
    {
      label: 'Deaths',
      value: totalDied.toLocaleString(),
      color: R,
      icon: Skull,
    },
    {
      label: 'Survival Rate',
      value: `${survivalRate.toFixed(1)}%`,
      color: survivalRate >= 50 ? Y : R,
      icon: Shield,
    },
    {
      label: 'Total Time Topside',
      value: formatDurationMs(totalTimeMs),
      color: B,
      icon: Clock,
    },
    {
      label: 'Avg Time / Raid',
      value: formatDurationMs(avgTimePerRaid),
      color: B,
      icon: Clock,
    },
    {
      label: EMBARK_STAT_LABELS.valueExtracted,
      value: fmt$(totalValueExtracted),
      color: Y,
      icon: Coins,
    },
    {
      label: EMBARK_STAT_LABELS.valueBroughtIn,
      value: fmt$(totalValueBroughtIn),
      color: M,
      icon: Package,
    },
    {
      label: EMBARK_STAT_LABELS.netValue,
      value: fmt$(totalNetValue),
      color: totalNetValue >= 0 ? Y : R,
      icon: TrendingUp,
    },
    {
      label: 'ARC Kills',
      value: totalArcKills.toLocaleString(),
      color: B,
      icon: Crosshair,
    },
    {
      label: 'Player Kills',
      value: totalPlayerKills.toLocaleString(),
      color: R,
      icon: Skull,
    },
    {
      label: 'Total Damage',
      value: totalDamage.toLocaleString(),
      color: G,
      icon: Zap,
    },
    {
      label: 'Damage Received',
      value: totalDamageTaken > 0 ? totalDamageTaken.toLocaleString() : '—',
      color: R,
      icon: Shield,
    },
    {
      label: 'Containers Looted',
      value:
        total.containersLooted > 0
          ? total.containersLooted.toLocaleString()
          : '—',
      color: Y,
      icon: Box,
    },
    {
      label: 'Loot / Min',
      value:
        totalTimeMs > 0
          ? `$${Math.round(lootPerMinute).toLocaleString()}`
          : '—',
      color: G,
      icon: Activity,
    },
    {
      label: 'Kills / Raid',
      value: avgKillsPerRaid > 0 ? avgKillsPerRaid.toFixed(1) : '—',
      color: B,
      icon: Target,
    },
    {
      label: 'Total Rounds (API)',
      value: totalRounds > 0 ? totalRounds.toLocaleString() : '—',
      color: M,
      icon: Layers,
    },
  ];

  if (totalRounds === 0 && roundsData.length === 0) return null;

  return (
    <div className="bg-arc-light-bg border border-[#1e1e1e]">
      <div className="px-4 py-2.5 border-b border-[#141414] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-arc-yellow" />
          <h2 className="text-[10px] font-black uppercase tracking-widest">
            Survival & Loot Stats
          </h2>
        </div>
        <span className="text-[7px] text-[var(--color-arc-muted)] uppercase font-black">
          {totalRounds.toLocaleString()} raids analyzed
        </span>
      </div>
      <div className="hud-grid hud-grid--dense">
        {stats.map(({ label, value, color, icon: Icon }) => (
          <HudStatBox
            key={label}
            label={label}
            value={value}
            color={color}
            icon={Icon}
            compact
          />
        ))}
      </div>
    </div>
  );
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const totalS = Math.floor(ms / 1000);
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ─── Spark chart (pure SVG) ───────────────────────────────────────────────────

function SparkChart({
  data,
  height = 56,
}: {
  data: number[];
  height?: number;
}) {
  if (data.length < 2) return null;
  const W = 500,
    H = height,
    pad = 3;
  const min = Math.min(...data),
    max = Math.max(...data),
    range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  });
  const rising = data[data.length - 1] >= data[0];
  const lc = rising ? 'var(--color-arc-yellow)' : 'var(--color-arc-danger)';
  const fid = rising ? 'gup' : 'gdn';
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
    >
      <defs>
        <linearGradient id={fid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lc} stopOpacity="0.28" />
          <stop offset="100%" stopColor={lc} stopOpacity="0.02" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <polygon
        points={`${pad},${H} ${pts.join(' ')} ${W - pad},${H}`}
        fill={`url(#${fid})`}
      />
      {min < 0 && max > 0 && (
        <line
          x1={pad}
          y1={H - pad - ((0 - min) / range) * (H - pad * 2)}
          x2={W - pad}
          y2={H - pad - ((0 - min) / range) * (H - pad * 2)}
          stroke="var(--color-arc-border)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
      )}
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={lc}
        strokeWidth="1.8"
        filter="url(#glow)"
      />
    </svg>
  );
}

// ─── XP bar ──────────────────────────────────────────────────────────────────

const MAX_RAIDER_LEVEL = 75;

function XpBar({
  level,
  xp,
  xpNext,
}: {
  level: number;
  xp: number;
  xpNext: number;
}) {
  const displayLevel = Math.min(
    MAX_RAIDER_LEVEL,
    Math.max(1, Number(level) || 1),
  );
  const isCapped = displayLevel >= MAX_RAIDER_LEVEL || xpNext <= 0;
  const pct = isCapped ? 100 : Math.min(100, Math.round((xp / xpNext) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
        <span className="text-arc-yellow">LV.{displayLevel}</span>
        <span className="text-[var(--color-arc-muted)]">
          {isCapped
            ? 'LEVEL CAP REACHED'
            : `${xp.toLocaleString()} / ${xpNext.toLocaleString()} XP — ${pct}%`}
        </span>
        <span className="text-arc-yellow">
          {isCapped ? 'MAX' : `LV.${displayLevel + 1}`}
        </span>
      </div>
      <div className="h-2 bg-[#0d0d0d] border border-arc-border overflow-hidden relative">
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background:
              'linear-gradient(90deg,var(--color-arc-yellow),var(--color-arc-rare))',
            boxShadow: '0 0 10px var(--color-arc-yellow)88',
          }}
        />
        {[25, 50, 75].map((t) => (
          <div
            key={t}
            className="absolute top-0 bottom-0 w-px bg-[var(--color-arc-border)]"
            style={{ left: `${t}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  color = '#fff',
  icon: Icon,
}: {
  label: string;
  value: string;
  color?: string;
  icon?: any;
}) {
  return (
    <div
      className="bg-arc-light-bg border border-[var(--color-arc-legendary)] px-3 py-2.5 flex flex-col gap-1"
      style={{
        borderLeftColor: color,
        borderLeftWidth: '3px',
        boxShadow: '0 0 10px rgba(255,204,0,0.15)',
      }}
    >
      <div className="flex items-center gap-1">
        {Icon && <Icon className="w-2.5 h-2.5 shrink-0" style={{ color }} />}
        <span className="text-xs text-[var(--color-arc-muted)] uppercase tracking-widest font-black">
          {label}
        </span>
      </div>
      <span
        className="text-base font-black leading-none truncate"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Loadout components ───────────────────────────────────────────────────────

const RARITY_COLOR: Record<string, string> = {
  legendary: 'var(--color-arc-legendary)',
  epic: 'var(--color-arc-epic)',
  rare: 'var(--color-arc-rare)',
  uncommon: 'var(--color-arc-uncommon)',
  common: 'var(--color-arc-common)',
};

const WEAPON_ATTACHMENT_SLOTS: Record<string, string[]> = {
  kettle: ['Muzzle', 'Underbarrel', 'Light Magazine', 'Stock'],
  rattler: ['Muzzle', 'Underbarrel', 'Stock'],
  arpeggio: ['Muzzle', 'Underbarrel', 'Medium Magazine', 'Stock'],
  tempest: ['Muzzle', 'Underbarrel', 'Medium Magazine'],
  bettina: ['Muzzle', 'Underbarrel', 'Stock'],
  ferro: ['Muzzle', 'Underbarrel', 'Stock'],
  renegade: ['Muzzle', 'Medium Magazine', 'Stock'],
  aphelion: ['Underbarrel', 'Stock'],
  stitcher: ['Muzzle', 'Underbarrel', 'Light Magazine', 'Stock'],
  canto: ['Muzzle', 'Underbarrel', 'Light Magazine', 'Stock'],
  bobcat: ['Muzzle', 'Underbarrel', 'Light Magazine', 'Stock'],
  il_toro: ['Shotgun Muzzle', 'Underbarrel', 'Shotgun Magazine', 'Stock'],
  vulcano: ['Shotgun Muzzle', 'Underbarrel', 'Shotgun Magazine', 'Stock'],
  dolabra: [],
  hairpin: ['Light Magazine'],
  burletta: ['Muzzle', 'Light Magazine'],
  venator: ['Underbarrel', 'Medium Magazine'],
  anvil: ['Muzzle', 'Tech Mod'],
  torrente: ['Muzzle', 'Medium Magazine', 'Stock'],
  osprey: ['Muzzle', 'Underbarrel', 'Medium Magazine', 'Stock'],
  jupiter: [],
  rascal: [],
  hullcracker: ['Underbarrel', 'Stock'],
  equalizer: [],
};

function getItemDisplayName(item: any): string {
  return typeof item?.name === 'object'
    ? item.name?.en || ''
    : String(item?.name || item?.itemId || '');
}

function getLoadoutItem(item: any): any {
  if (!item) return item;
  return enrichItem(item);
}

function getLoadoutItemId(item: any): string {
  return String(item?.itemId || item?.itemID || item?.id || '');
}

function getLoadoutAssetId(item: any): string | number | null {
  return (
    item?.game_asset_id ??
    item?.gameAssetId ??
    item?.assetId ??
    item?.weaponAssetId ??
    null
  );
}

function getLoadoutLocalRecord(item: any): any | null {
  if (!item) return null;
  const itemId = getLoadoutItemId(item);
  return (
    getItemData(itemId) ||
    getItemDataByGameAssetId(getLoadoutAssetId(item)) ||
    getItemData(getItemDisplayName(item))
  );
}

function getLocalRecordImage(record: any, fallbackId?: string): string | null {
  if (record?.imageFilename) return assetUrl(record.imageFilename);
  return getItemImg(record?.id || fallbackId || '');
}

function getLoadoutImage(item: any): string | null {
  const itemId = getLoadoutItemId(item);
  const localRecord = getLoadoutLocalRecord(item);
  return (
    getLocalRecordImage(localRecord, itemId) ||
    (item?.imageFilename ? assetUrl(item.imageFilename) : null) ||
    item?.icon ||
    item?.imageUrl ||
    null
  );
}

function getWeaponAttachmentSlots(item: any): string[] {
  const localRecord = getLoadoutLocalRecord(item);
  const rawId =
    localRecord?.id ||
    item?.itemId ||
    item?.itemID ||
    item?.id ||
    getItemDisplayName(item);
  const normalized = String(rawId || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/_(i|ii|iii|iv)$/, '');
  return WEAPON_ATTACHMENT_SLOTS[normalized] || [];
}

function getLoadoutDetailLine(item: any): string {
  const statBlock = item?.stat_block || item?.statBlock || {};
  const parts = [
    item?.rarity,
    item?.item_type || item?.type || item?.subcategory,
    item?.workbench,
    item?.value ? `$${Number(item.value).toLocaleString()}` : null,
    statBlock.damage ? `${statBlock.damage} DMG` : null,
    statBlock.fireRate ? `${statBlock.fireRate} ROF` : null,
    statBlock.magazineSize ? `${statBlock.magazineSize} MAG` : null,
    statBlock.weight ? `${statBlock.weight} WT` : null,
    Array.isArray(item?.loadout_slots) && item.loadout_slots.length
      ? item.loadout_slots.join('/')
      : null,
  ].filter(Boolean);
  return parts.join(' / ');
}

function RarityCorner(_props: { color: string }) {
  return null;
}

function GameGearSlot({ item, label }: { item: any; label: string }) {
  const viewItem = getLoadoutItem(item);
  const itemId = getLoadoutItemId(viewItem);
  const rarity = String(viewItem?.rarity || item?.rarity).toLowerCase();
  const name = viewItem ? getItemDisplayName(viewItem) : '';
  const imgUrl = getLoadoutImage(viewItem);
  const rarityTier = getRarityVisualTier(rarity);
  const imgBackdrop = rarityImageBackdropClass(rarityTier);
  const color = RARITY_COLOR[rarity] || '#2a2a2a';
  return (
    <div
      className={`relative border flex flex-col items-center justify-center${item ? ` rarity-${rarity}` : ''}`}
      style={{
        borderColor: item ? undefined : '#1e1e2e',
        width: 72,
        height: 72,
        minWidth: 72,
      }}
    >
      {item && <div className={imgBackdrop} />}
      {item && <RarityCorner color={color} />}
      <span className="absolute top-1 left-1.5 text-[5px] text-[var(--color-arc-border)] uppercase tracking-widest font-black">
        {label}
      </span>
      {item ? (
        <img
          src={imgUrl || ''}
          alt={name}
          className="w-10 h-10 object-contain transition-transform duration-200 hover:scale-110"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            if (!el.dataset.png) {
              el.dataset.png = '1';
              el.src = el.src.replace(/\.webp$/, '.png');
            } else el.style.opacity = '0';
          }}
        />
      ) : (
        <span className="text-[var(--color-arc-border)] text-lg">+</span>
      )}
      {item && (
        <span
          className="absolute bottom-0.5 left-0 right-0 text-center text-[5px] font-black uppercase truncate px-0.5"
          style={{ color }}
        >
          {name}
        </span>
      )}
    </div>
  );
}

function GameWeaponSlot({ item, label }: { item: any; label: string }) {
  const viewItem = getLoadoutItem(item);
  const itemId = getLoadoutItemId(viewItem);
  const rarity = String(
    viewItem?.rarity || item?.rarity || 'common',
  ).toLowerCase();
  const color = RARITY_COLOR[rarity] || '#2a2a2a';
  const name = viewItem ? getItemDisplayName(viewItem) : '';
  const imgUrl = getLoadoutImage(viewItem);
  const attachments = item?.attachments
    ? Array.isArray(item.attachments)
      ? item.attachments
      : []
    : [];
  const attachmentSlots = getWeaponAttachmentSlots(viewItem);
  const attachmentCellCount = Math.max(
    attachmentSlots.length,
    attachments.length,
    3,
  );
  const ammoType =
    viewItem?.ammo_type ||
    item?.ammoType ||
    item?.effects?.['Ammo Type']?.value ||
    null;
  const wlvl = item?.weaponLevel ?? item?.level ?? null;
  const detailLine = getLoadoutDetailLine(viewItem);
  const rarityTier = getRarityVisualTier(rarity);
  const imgBackdrop = rarityImageBackdropClass(rarityTier);
  return (
    <div
      className={`relative border overflow-hidden${item ? ` rarity-${rarity}` : ''}`}
      style={{
        borderColor: item ? undefined : '#1e1e2e',
        height: 90,
      }}
    >
      {item && <div className={imgBackdrop} />}
      {item && <RarityCorner color={color} />}
      <div className="flex h-full">
        {/* Weapon art area */}
        <div className="flex-1 flex items-center justify-center relative px-2">
          <span className="absolute top-1 left-2 text-[5px] text-[var(--color-arc-border)] uppercase tracking-widest font-black">
            {label}
          </span>
          {item ? (
            <img
              src={imgUrl || ''}
              alt={name}
              className="max-h-[62px] max-w-full object-contain drop-shadow-lg transition-transform duration-200 hover:scale-110"
              style={{ filter: `drop-shadow(0 2px 8px ${color}55)` }}
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                if (!el.dataset.png) {
                  el.dataset.png = '1';
                  el.src = el.src.replace(/\.webp$/, '.png');
                } else el.style.opacity = '0';
              }}
            />
          ) : (
            <span className="text-[var(--color-arc-border)] text-2xl">+</span>
          )}
        </div>
        {/* Attachment slots column */}
        <div className="flex flex-col gap-0.5 p-1 justify-center shrink-0">
          {Array.from({ length: attachmentCellCount }).map((_, i) => {
            const att = attachments[i];
            const attMaster = att ? getLoadoutLocalRecord(att) : null;
            const attrarity = String(
              attMaster?.rarity || att?.rarity || 'common',
            ).toLowerCase();
            const attColor = RARITY_COLOR[attrarity] || '#2a2a2a';
            const slotName = attachmentSlots[i] || 'Attachment Slot';
            const attName =
              itemText(attMaster?.name, '') || att?.name || slotName;
            const attImg = att ? getLoadoutImage(att) : null;
            return (
              <Tooltip
                key={i}
                content={
                  att ? (
                    <LabelTooltip text={attName} />
                  ) : (
                    <LabelTooltip text={`Empty ${slotName}`} />
                  )
                }
                side="right"
                delay={100}
              >
                <div
                  className="bg-[#1a1828] border flex items-center justify-center cursor-pointer hover:brightness-110 transition-all"
                  style={{
                    width: 26,
                    height: 26,
                    borderColor: att ? attColor + '80' : '#1e1e2e',
                    boxShadow: att ? `inset 0 0 8px ${attColor}20` : 'none',
                  }}
                >
                  {att ? (
                    <img
                      src={attImg || ''}
                      alt={attName}
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.opacity =
                          '0';
                      }}
                    />
                  ) : (
                    <span className="text-[8px] text-[var(--color-arc-border)]">
                      ·
                    </span>
                  )}
                </div>
              </Tooltip>
            );
          })}
        </div>
      </div>
      {/* Footer bar */}
      {item && (
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-0.5"
          style={{ background: '#0a0814cc', borderTop: `1px solid ${color}30` }}
        >
          <span
            className="text-[6px] font-black uppercase truncate"
            style={{ color }}
          >
            {name}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {ammoType && (
              <span
                className="text-[5px] font-black uppercase"
                style={{ color: 'var(--color-arc-muted)' }}
              >
                {ammoType}
              </span>
            )}
            {wlvl != null && (
              <span
                className="text-[5px] font-black"
                style={{ color: 'var(--color-arc-yellow)' }}
              >
                LV{wlvl}
              </span>
            )}
          </div>
        </div>
      )}
      {item && detailLine && (
        <div className="absolute left-2 right-2 bottom-4 text-[5px] font-black uppercase truncate text-[var(--color-arc-muted)]">
          {detailLine}
        </div>
      )}
    </div>
  );
}

function GameSmallSlot({ item, label }: { item: any; label: string }) {
  const viewItem = getLoadoutItem(item);
  const itemId = getLoadoutItemId(viewItem);
  const rarity = String(
    viewItem?.rarity || item?.rarity || 'common',
  ).toLowerCase();
  const color = RARITY_COLOR[rarity] || '#2a2a2a';
  const imgUrl = getLoadoutImage(viewItem);
  const rarityTier = getRarityVisualTier(rarity);
  const imgBackdrop = rarityImageBackdropClass(rarityTier);
  return (
    <div
      className="relative bg-[#0d0c14] border flex items-center justify-center"
      style={{
        borderColor: item ? color : '#1e1e2e',
        height: 44,
        width: '100%',
      }}
    >
      {item && <div className={imgBackdrop} />}
      {item && <RarityCorner color={color} />}
      <span className="absolute top-0.5 left-1 text-[4px] text-[var(--color-arc-border)] uppercase tracking-widest font-red">
        {label}
      </span>
      {item ? (
        <img
          src={imgUrl || 'toxic.webp'}
          alt=""
          className="w-7 h-7 object-contain"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            if (!el.dataset.webp) {
              el.dataset.webp = '1';
              el.src = el.src.replace(/\.png$/, '.webp');
            } else {
              el.style.opacity = '5';
              el.style.display = 'none';
            }
          }}
        />
      ) : (
        <span className="text-[var(--color-arc-border)] text-epic">·</span>
      )}
    </div>
  );
}

// ─── Character Preview ────────────────────────────────────────────────────────

const CHARACTER_IMAGES: Record<string, string> = {
  apollo: assetUrl('/main/apollo.png'),
  celeste: assetUrl('/main/celeste.png'),
  shani: assetUrl('/main/shani.png'),
  lance: assetUrl('/main/lance.png'),
  TianWen: assetUrl('/main/tianwen.png'),
  ermal: assetUrl('/main/ermal.webp'),
};

// ─── Player Stat Circles Component ────────────────────────────────────────────────

interface StatCircleProps {
  label: string;
  current: number;
  total: number;
  percent: number;
  color: string;
  icon: React.ReactNode;
}

function StatCircle({
  label,
  current,
  total,
  percent,
  color,
  icon,
}: StatCircleProps) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="#1e1e2e"
            strokeWidth="4"
          />
          {/* Progress circle */}
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[8px] font-black" style={{ color }}>
            {percent}%
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-[8px] font-black uppercase tracking-wider text-[var(--color-arc-muted)]">
          {label}
        </span>
      </div>
      <span className="text-[7px] text-[var(--color-arc-border)]">
        {current}/{total}
      </span>
    </div>
  );
}

interface PlayerStatCirclesProps {
  hideout: { current: number; total: number; percent: number };
  quests: { current: number; total: number; percent: number };
  projects: { current: number; total: number; percent: number };
  blueprints: { current: number; total: number; percent: number };
}

function PlayerStatCircles({
  hideout,
  quests,
  projects,
  blueprints,
}: PlayerStatCirclesProps) {
  return (
    <div className="flex items-center justify-center gap-8 py-2">
      <StatCircle
        label="Hideout"
        current={hideout.current}
        total={hideout.total}
        percent={hideout.percent}
        color="var(--color-arc-rare)"
        icon={<Home className="w-3 h-3 text-[var(--color-arc-rare)]" />}
      />
      <StatCircle
        label="Quests"
        current={quests.current}
        total={quests.total}
        percent={quests.percent}
        color="var(--color-arc-epic)"
        icon={<Target className="w-3 h-3 text-[var(--color-arc-epic)]" />}
      />
      <StatCircle
        label="Projects"
        current={projects.current}
        total={projects.total}
        percent={projects.percent}
        color="var(--color-arc-legendary)"
        icon={<Zap className="w-3 h-3 text-[var(--color-arc-legendary)]" />}
      />
      <StatCircle
        label="Blueprints"
        current={blueprints.current}
        total={blueprints.total}
        percent={blueprints.percent}
        color="var(--color-arc-yellow)"
        icon={<BarChart2 className="w-3 h-3 text-[var(--color-arc-yellow)]" />}
      />
    </div>
  );
}

// ─── LoadoutBox (kept for small backpack/quickuse slots) ───────────────────────

function LoadoutBox({
  item,
  label,
  size = 'md',
}: {
  item: any;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const h = size === 'lg' ? 'h-28' : size === 'sm' ? 'h-[52px]' : 'h-20';
  if (!item)
    return (
      <div
        className={`bg-[#130918] border border-[#141414] flex flex-col items-center justify-center gap-0.5 ${h}`}
      >
        <span className="text-[5px] text-[var(--color-arc-border)] uppercase tracking-widest">
          {label}
        </span>
        <span className="text-[7px] text-[var(--color-arc-border)]">—</span>
      </div>
    );
  const viewItem = getLoadoutItem(item);
  const itemId = getLoadoutItemId(viewItem);
  const rarity = String(
    viewItem?.rarity || item?.rarity || 'common',
  ).toLowerCase();
  const border = RARITY_COLOR[rarity] || '#2a2a2a';
  const name = getItemDisplayName(viewItem) || itemId;
  const imgUrl = getLoadoutImage(viewItem);
  const wlvl = item?.weaponLevel ?? null;
  const detailLine = getLoadoutDetailLine(viewItem);
  const rarityTier = getRarityVisualTier(rarity);
  const imgBackdrop = rarityImageBackdropClass(rarityTier);
  return (
    <div
      className={`border p-1 flex flex-col relative ${h} rarity-${rarity}`}
      style={{
        borderColor: border,
      }}
    >
      <div className={imgBackdrop} />
      <span className="text-[5px] text-[var(--color-arc-border)] uppercase tracking-widest absolute top-0.5 left-1">
        {label}
      </span>
      {wlvl != null && (
        <span className="absolute top-0.5 right-1 text-[5px] font-black text-[var(--color-arc-danger)]">
          {wlvl}
        </span>
      )}
      <div className="flex-1 flex items-center justify-center group">
        <img
          src={imgUrl || ''}
          alt={name}
          className="max-w-full object-contain transition-transform duration-200 group-hover:scale-110"
          style={{ maxHeight: size === 'sm' ? 28 : 56 }}
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            if (!el.dataset.webp) {
              el.dataset.webp = '1';
              el.src = el.src.replace(/\.webp$/, '.png');
            } else el.style.opacity = '0';
          }}
        />
      </div>
      <p
        className="text-[6px] font-black text-center uppercase tracking-wide truncate leading-tight"
        style={{ color: border }}
      >
        {name}
      </p>
      {detailLine && size !== 'sm' && (
        <p className="text-[5px] font-black text-center uppercase tracking-wide truncate leading-tight text-[var(--color-arc-muted)]">
          {detailLine}
        </p>
      )}
    </div>
  );
}

// ─── Inventory Panel (Stash Grid) ────────────────────────────────────────────

const RARITY_GLOW: Record<string, string> = {
  legendary: 'var(--color-arc-legendary)',
  epic: 'var(--color-arc-epic)',
  rare: 'var(--color-arc-rare)',
  uncommon: 'var(--color-arc-uncommon)',
  common: 'var(--color-arc-common)',
};

const ITEM_CATEGORIES = [
  { id: 'all', label: 'All', icon: assetUrl('/dashboard/group.all.webp') },
  {
    id: 'augment',
    label: 'Augments',
    icon: assetUrl('/dashboard/group.augment.webp'),
  },
  {
    id: 'shield',
    label: 'Shields',
    icon: assetUrl('/dashboard/group.shield.webp'),
  },
  {
    id: 'weapon',
    label: 'Weapons',
    icon: assetUrl('/dashboard/group.weapon.webp'),
  },
  {
    id: 'ammo',
    label: 'Ammunition',
    icon: assetUrl('/dashboard/group.ammunition.webp'),
  },
  {
    id: 'weaponmod',
    label: 'Weapon Mods',
    icon: assetUrl('/dashboard/group.weaponmod.webp'),
  },
  {
    id: 'quickuse',
    label: 'Quick Use',
    icon: assetUrl('/dashboard/group.quickuse.webp'),
  },
  { id: 'key', label: 'Keys', icon: assetUrl('/dashboard/group.key.webp') },
  {
    id: 'material',
    label: 'Crafting Materials',
    icon: assetUrl('/dashboard/group.craftingmaterial.webp'),
  },
];

const CIRCLE_MASK =
  "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 39 39%22><path d=%22M 19.5 0 H 19.5 A 19.5 19.5 0 0 1 39 19.5 V 19.5 A 19.5 19.5 0 0 1 19.5 39 H 19.5 A 19.5 19.5 0 0 1 0 19.5 V 19.5 A 19.5 19.5 0 0 1 19.5 0 Z M 19.5 2 H 19.5 A 17.5 17.5 0 0 1 37 19.5 V 19.5 A 17.5 17.5 0 0 1 19.5 37 H 19.5 A 17.5 17.5 0 0 1 2 19.5 V 19.5 A 17.5 17.5 0 0 1 19.5 2 Z%22 fill=%22red%22 /></svg>')";

function getItemFolder(item: any): string {
  const type = String(
    item?.type || item?.itemType || item?.category || '',
  ).toLowerCase();
  const name = String(
    typeof item?.name === 'object'
      ? (item?.name?.en ?? '')
      : (item?.name ?? ''),
  ).toLowerCase();
  if (
    type.includes('weapon') ||
    type.includes('rifle') ||
    type.includes('smg') ||
    type.includes('shotgun') ||
    type.includes('sniper') ||
    type.includes('pistol')
  )
    return 'Weapons';
  if (type.includes('shield')) return 'Shields';
  if (type.includes('augment')) return 'Augments';
  if (
    type.includes('ammo') ||
    type.includes('ammunition') ||
    name.includes('ammo')
  )
    return 'Ammunition';
  if (
    type.includes('quick') ||
    type.includes('medical') ||
    type.includes('consumable')
  )
    return 'QuickUse';
  if (type.includes('key')) return 'Keys';
  if (
    type.includes('material') ||
    type.includes('crafting') ||
    type.includes('resource')
  )
    return 'CraftingMaterials';
  if (type.includes('mod') || type.includes('attachment')) return 'WeaponMods';
  return 'Misc';
}

function getInventoryCategory(item: any): string {
  const itemType = String(item?.type || item?.itemType || '').toLowerCase();
  if (
    itemType.includes('smg') ||
    itemType.includes('rifle') ||
    itemType.includes('shotgun') ||
    itemType.includes('weapon')
  )
    return 'weapon';
  if (itemType.includes('shield')) return 'shield';
  if (itemType.includes('augment')) return 'augment';
  if (itemType.includes('ammo')) return 'ammo';
  if (
    itemType.includes('quick') ||
    itemType.includes('medical') ||
    itemType.includes('consumable')
  )
    return 'quickuse';
  if (itemType.includes('key')) return 'key';
  if (itemType.includes('material') || itemType.includes('crafting'))
    return 'material';
  if (itemType.includes('mod') || itemType.includes('attachment'))
    return 'weaponmod';
  const folder = getItemFolder(item);
  if (folder === 'Weapons') return 'weapon';
  if (folder === 'Shields') return 'shield';
  if (folder === 'Augments') return 'augment';
  if (folder === 'Ammunition') return 'ammo';
  if (folder === 'QuickUse') return 'quickuse';
  if (folder === 'Keys') return 'key';
  if (folder === 'CraftingMaterials') return 'material';
  if (folder === 'WeaponMods') return 'weaponmod';
  return 'misc';
}

function DurabilityBar({ value }: { value: number | null }) {
  if (value == null) return null;
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 70 ? '#25bb55' : pct >= 40 ? '#f1aa1c' : '#e83a3a';
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black/60">
      <div style={{ width: `${pct}%`, background: color, height: '100%' }} />
    </div>
  );
}

function ItemDetailPanel({
  item,
  onClose,
}: {
  item: any;
  onClose: () => void;
}) {
  const rarity = String(item?.rarity || 'common').toLowerCase();
  const glow = RARITY_GLOW[rarity] || 'var(--color-arc-border)';
  const name =
    typeof item?.name === 'object'
      ? item.name?.en || ''
      : String(item?.name || item?.itemId || '');
  const imgSlug = String(item?.itemId || item?.i || name || '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  const durability =
    item?.durability ?? item?.durabilityPercent ?? item?.d ?? null;
  const weight = item?.weightKg || item?.weight || 0;
  const value = item?.value || 0;
  const qty = item?.quantity ?? item?.q ?? item?.qty ?? null;
  const attachments: any[] = item?.attachments || item?.a || [];
  const statBlock = item?.stat_block || null;
  const durPct =
    durability != null ? Math.max(0, Math.min(100, durability)) : null;
  const durColor =
    durPct == null
      ? '#888'
      : durPct >= 70
        ? '#25bb55'
        : durPct >= 40
          ? '#f1aa1c'
          : '#e83a3a';
  return (
    <div
      className="shrink-0 border-l border-[#1e1e2e] flex flex-col overflow-y-auto"
      style={{ width: 200, background: '#0a0a10', padding: '10px 10px' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[9px] font-red uppercase tracking-widest"
          style={{ color: glow }}
        >
          Item Detail
        </span>
        <button
          onClick={onClose}
          className="text-[10px] text-[var(--color-arc-muted)] hover:text-red font-black px-1"
        >
          ❌
        </button>
      </div>
      {/* Image */}
      <div
        className="relative border mb-2 flex items-center justify-center"
        style={{
          borderColor: glow,
          background: `${glow}0e`,
          aspectRatio: '1',
          maxHeight: 100,
        }}
      >
        <img
          src={assetUrl(`/items/${imgSlug}.webp`)}
          alt={name}
          className="w-full h-full object-contain p-2"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            if (!el.dataset.fb) {
              el.dataset.fb = '1';
              el.src = el.src.replace(/\.webp$/, '.png');
            } else el.style.opacity = '0.15';
          }}
        />
        {durPct != null && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/60">
            <div
              style={{
                width: `${durPct}%`,
                background: durColor,
                height: '100%',
              }}
            />
          </div>
        )}
      </div>
      {/* Name + rarity */}
      <p
        className="text-[11px] font-black text-white leading-tight mb-0.5 truncate"
        title={name}
      >
        {name}
      </p>
      <p
        className="text-[9px] font-black uppercase tracking-widest mb-2"
        style={{ color: glow }}
      >
        {rarity}
      </p>
      {/* Stats */}
      <div className="space-y-1 text-[9px] mb-2">
        {qty != null && qty > 1 && (
          <div className="flex justify-between">
            <span className="text-[var(--color-arc-muted)]">QTY</span>
            <span className="text-white font-black">×{qty}</span>
          </div>
        )}
        {durPct != null && (
          <div className="flex justify-between items-center">
            <span className="text-[var(--color-arc-muted)]">DURABILITY</span>
            <span className="font-black" style={{ color: durColor }}>
              {durPct.toFixed(0)}%
            </span>
          </div>
        )}
        {weight > 0 && (
          <div className="flex justify-between">
            <span className="text-[var(--color-arc-muted)]">WEIGHT</span>
            <span className="text-white font-black">{weight}kg</span>
          </div>
        )}
        {value > 0 && (
          <div className="flex justify-between">
            <span className="text-[var(--color-arc-muted)]">VALUE</span>
            <span className="text-[#f1aa1c] font-black">
              {value.toLocaleString()}
            </span>
          </div>
        )}
        {item?.type && (
          <div className="flex justify-between">
            <span className="text-[var(--color-arc-muted)]">TYPE</span>
            <span className="text-white font-black truncate max-w-[100px]">
              {item.type}
            </span>
          </div>
        )}
      </div>
      {/* Stat block */}
      {statBlock && Object.keys(statBlock).length > 0 && (
        <div className="border-t border-[#1e1e2e] pt-2 mb-2">
          <p className="text-[8px] font-black text-[var(--color-arc-muted)] uppercase tracking-widest mb-1">
            Stats
          </p>
          <div className="space-y-0.5">
            {Object.entries(statBlock)
              .filter(([, v]) => v != null && v !== 0)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between text-[9px]">
                  <span className="text-[var(--color-arc-muted)] capitalize">
                    {k.replace(/_/g, ' ')}
                  </span>
                  <span className="text-white font-black">{String(v)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
      {/* Attachments */}
      <img
        src={assetUrl('/icons/gunicon.webp')}
        alt="Weight"
        className="w-3.5 h-3.5 opacity-60"
        onError={(e) => {
          e.currentTarget.style.display = 'glow';
        }}
      />
      {attachments.length > 0 && (
        <div className="border-t border-[#1e1e2e] pt-2">
          <p className="text-[8px] font-black text-[var(--color-arc-muted)] uppercase tracking-widest mb-1">
            Attachments ({attachments.length})
          </p>
          <div className="space-y-1">
            {attachments.map((att: any, ai: number) => {
              const attId = att?.itemId || att?.i || att?.id || '';
              if (!attId) return null;
              const attSlug = attId
                .toLowerCase()
                .replace(/\s+/g, '_')
                .replace(/[^a-z0-9_]/g, '');
              const attName = att?.name || attId.replace(/_/g, ' ');
              const attDur =
                att?.durabilityPercent ?? att?.durability ?? att?.d ?? null;
              const attDurPct =
                attDur != null ? Math.max(0, Math.min(100, attDur)) : null;
              const attDurColor =
                attDurPct == null
                  ? '#888'
                  : attDurPct >= 70
                    ? '#25bb55'
                    : attDurPct >= 40
                      ? '#f1aa1c'
                      : '#e83a3a';
              return (
                <div key={ai} className="flex items-center gap-1.5">
                  <div className="relative shrink-0 border border-[#2a2a3a] w-7 h-7 flex items-center justify-center">
                    <img
                      src={assetUrl(`/items/${attSlug}.webp`)}
                      alt={attName}
                      className="w-full h-full object-contain p-0.5"
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        if (!el.dataset.fb) {
                          el.dataset.fb = '1';
                          el.src = el.src.replace(/\.webp$/, '.png');
                        } else el.style.opacity = '0.15';
                      }}
                    />
                    {attDurPct != null && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px]">
                        <div
                          style={{
                            width: `${attDurPct}%`,
                            background: attDurColor,
                            height: '100%',
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] text-white font-black truncate leading-tight">
                      {attName}
                    </p>
                    {attDurPct != null && (
                      <p
                        className="text-[7px] font-black"
                        style={{ color: attDurColor }}
                      >
                        {attDurPct.toFixed(0)}%
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function InventoryPanel({
  items,
  used,
  total,
}: {
  items: any[];
  used: number;
  total: number | null;
}) {
  const [activeCat, setActiveCat] = useState('all');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const enriched = items.map((i: any) => enrichItem(i));
  const filtered =
    activeCat === 'all'
      ? enriched
      : enriched.filter((it: any) => getInventoryCategory(it) === activeCat);
  const displayItems = filtered;
  const totalWeight = enriched.reduce(
    (sum: number, item: any) => sum + (item?.totalWeight || item?.weight || 0),
    0,
  );

  // Category item counts for badge
  const catCounts = ITEM_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat.id] =
        cat.id === 'all'
          ? enriched.length
          : enriched.filter((it: any) => getInventoryCategory(it) === cat.id)
              .length;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="bg-[#0d0d14] border border-[#1e1e2e] flex overflow-hidden">
      {/* Stash category sidebar — always visible, scrollable if needed */}
      <div
        className="shrink-0 border-r border-[#1e1e2e] flex flex-col overflow-y-auto"
        style={{
          background: '#111317',
          padding: '10px 6px',
          gap: 4,
          minWidth: 54,
          maxHeight: 520,
        }}
      >
        {ITEM_CATEGORIES.map((cat) => {
          const count = catCounts[cat.id] ?? 0;
          const isActive = activeCat === cat.id;
          return (
            <Tooltip
              key={cat.id}
              content={
                <LabelTooltip
                  text={`${cat.label}${count > 0 ? ` — ${count}` : ''}`}
                />
              }
              side="right"
              delay={60}
            >
              <button
                className={`stash-button ${isActive ? 'active' : ''} relative`}
                aria-label={`${cat.label} (${count})`}
                onClick={() => {
                  setActiveCat(cat.id);
                }}
                style={{ '--mask-url': CIRCLE_MASK } as React.CSSProperties}
              >
                <div className="hover-frame-fx">
                  <div className="hover-frame-fx__mask">
                    <div className="hover-frame-fx__rotor">
                      <div className="hover-frame-fx__window">
                        <div className="hover-frame-fx__track">
                          <div className="hover-frame-fx__strip" />
                          <div className="hover-frame-fx__strip" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <span
                  className="stash-icon"
                  style={
                    {
                      '--icon-url': `url('${cat.icon}')`,
                    } as React.CSSProperties
                  }
                />
                {/* Item count badge */}
                {count > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 text-[6px] font-black leading-none px-1 py-px pointer-events-none"
                    style={{
                      background: isActive
                        ? 'var(--color-arc-yellow)'
                        : '#1e1e2e',
                      color: isActive ? '#000' : 'var(--color-arc-muted)',
                      border: `1px solid ${isActive ? 'var(--color-arc-yellow)' : 'var(--color-arc-border)'}`,
                      minWidth: 14,
                      textAlign: 'center',
                    }}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* Item grid */}
      <div className="flex-1 min-w-0 p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={ICONS.backpack}
              alt="Stash"
              className="w-3.5 h-3.5 opacity-80"
            />
            <h3 className="text-[10px] font-black text-[var(--color-arc-danger)] uppercase tracking-widest">
              Stash
            </h3>
            <span className="text-[8px] text-[var(--color-arc-muted)] uppercase tracking-wider truncate">
              —{' '}
              {ITEM_CATEGORIES.find((c) => c.id === activeCat)?.label || 'All'}{' '}
              ({filtered.length})
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1" title="Total Weight">
              <img
                src={assetUrl('/dashboard/ui.weight.webp')}
                alt="Weight"
                className="w-3.5 h-3.5 opacity-60"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="text-[8px] text-[#ff3333] font-black uppercase tracking-widest">
                {totalWeight.toFixed(1)} kg
              </span>
            </div>
            {total != null && (
              <span className="text-[8px] text-[var(--color-arc-muted)] font-black uppercase tracking-widest">
                {used}/{total}
              </span>
            )}
          </div>
        </div>

        {/* Grid */}
        {displayItems.length === 0 ? (
          <p className="text-[9px] text-[var(--color-arc-muted)] uppercase tracking-widest py-4">
            No items in this category
          </p>
        ) : (
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))',
            }}
          >
            {displayItems.map((item: any, i: number) => {
              const rarity = String(
                item?.rarity || item?.itemrarity || 'common',
              ).toLowerCase();
              const glow = RARITY_GLOW[rarity] || 'var(--color-arc-border)';
              const name =
                typeof item?.name === 'object'
                  ? item.name?.en || ''
                  : String(item?.name || item?.itemId || '');
              const itemId = String(item?.itemId || item?.itemID || '');
              const imgUrl = itemId ? getItemImg(itemId) : null;
              const folder = getItemFolder(item);
              const qty = item?.quantity ?? item?.qty ?? item?.amount ?? null;
              const isWeapon =
                folder === 'Weapons' ||
                (item?.type &&
                  /smg|rifle|shotgun|pistol|weapon/i.test(item.type));
              const weaponLevel = item?.weaponLevel || item?.level || null;
              const itemWeight = item?.weight || item?.weightKg || 0;
              const durability =
                item?.durability ?? item?.durabilityPercent ?? item?.d ?? null;
              const attachments: any[] = item?.attachments || item?.a || [];
              const rarityTier = getRarityVisualTier(rarity);
              const imgBackdrop = rarityImageBackdropClass(rarityTier);
              return (
                <div
                  key={i}
                  title={`${name}${qty ? ` ×${qty}` : ''} · ${rarity}${itemWeight ? ` · ${itemWeight}kg` : ''}`}
                  className={`relative border flex items-center justify-center overflow-hidden cursor-pointer hover:scale-105 transition-transform rarity-${rarity}`}
                  onClick={() => setSelectedItem(item)}
                  style={{
                    borderColor: glow,
                    boxShadow:
                      rarity !== 'common' ? `0 0 5px ${glow}35` : 'none',
                    aspectRatio: '1',
                    minHeight: 52,
                  }}
                >
                  {/* Rarity backdrop glow */}
                  <div className={imgBackdrop} />
                  {/* Weapon level badge */}
                  {isWeapon && weaponLevel && (
                    <div className="absolute top-0.5 left-0.5 z-[2] flex items-center gap-0.5 bg-black/80 px-0.5">
                      <img
                        src={assetUrl('/dashboard/weaponlevels.webp')}
                        alt="Level"
                        className="w-2 h-2"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="text-[6px] font-black text-[#ff3333]">
                        {weaponLevel}
                      </span>
                    </div>
                  )}
                  {/* Item image */}
                  <img
                    src={imgUrl || ''}
                    alt={name}
                    className="w-full h-full object-contain p-1 transition-transform duration-200 hover:scale-110"
                    onError={(e) => {
                      const el = e.currentTarget as HTMLImageElement;
                      if (!el.dataset.webp) {
                        el.dataset.webp = '1';
                        el.src = el.src.replace(/\.webp$/, '.png');
                      } else el.style.opacity = '0.4';
                    }}
                  />
                  {/* rarity gem top-right */}
                  {rarity !== 'common' && (
                    <span
                      className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full pointer-events-none"
                      style={{ background: glow, boxShadow: `0 0 4px ${glow}` }}
                    />
                  )}
                  {/* Quantity overlay */}
                  {qty != null && qty > 1 && (
                    <span className="absolute bottom-0 right-0 text-[7px] font-black text-white bg-black/75 px-0.5 leading-tight">
                      ×{qty}
                    </span>
                  )}
                  {/* Attachment count badge */}
                  {attachments.length > 0 && (
                    <span className="absolute bottom-0 left-0 text-[6px] font-black text-[#01abf4] bg-black/75 px-0.5 leading-tight">
                      <img
                        src={assetUrl('/profile/modifcation.webp')}
                        alt="Attachments"
                        className="w-2 h-2"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      +{attachments.length}
                    </span>
                  )}
                  {/* Durability bar */}
                  <DurabilityBar value={durability} />
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Item detail panel */}
      {selectedItem && (
        <ItemDetailPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const {
    profile,
    playerStats,
    combatBreakdown,
    rounds,
    stash,
    hideout,
    loadout,
    blueprints,
    quests,
    projects,
    raiderHub,
    isLoading,
    error,
    authState,
    hasToken,
    linkToken,
    refresh,
    extensionInstalled,
    startPlatformAuth,
    extensionVersion,
    mapPerformance: ctxMapPerformance,
    weaponKills: ctxWeaponKills,
    enemyKills: ctxEnemyKills,
    expeditionStatus,
  } = usePlayer();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const hubSyncedAt = (raiderHub as any)?.syncedAt ?? null;
  const [isLinkingToken, setIsLinkingToken] = useState(false);
  const [tokenMsg, setTokenMsg] = useState('');
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(
    null,
  );
  const [showAllRaids, setShowAllRaids] = useState(false);
  const [raidSearch, setRaidSearch] = useState('');
  const [raidSort, setRaidSort] = useState<
    'newest' | 'map' | 'profit' | 'arcKills' | 'playerKills'
  >('newest');
  // suppress unused-var for hasToken which is used contextually
  void hasToken;

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMsg('SYNCING...');
    try {
      const r = await fetch(`${BASE_URL}/api/player/me`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (r.ok) {
        setSyncMsg('SYNC OK');
        await refresh();
      } else {
        const d = await r.json().catch(() => ({}));
        setSyncMsg(`ERR: ${d.error || 'FAILED'}`);
      }
    } catch {
      setSyncMsg('TIMEOUT');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMsg(''), 4000);
    }
  };

  // ── Loading ──
  if (isLoading)
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-2 border-[var(--color-arc-yellow)] border-t-transparent rounded-full animate-spin" />
        <p className="text-arc-yellow text-[9px] font-black uppercase tracking-[0.4em] animate-pulse">
          Syncing Operative Data...
        </p>
      </div>
    );

  // ── No Discord ──
  if (!profile)
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        {/* <RaiderBackdrop /> — commented out, using CharacterBackground in App.tsx instead */}
        <div className="relative z-10 max-w-md w-full mx-auto px-4 text-center">
          <div className="bg-arc-light-bg/90 border border-arc-border p-12 backdrop-blur-sm">
            <img
              src={assetUrl('/main/outfitscrappy.webp')}
              alt="Scrappy"
              className="w-20 h-20 object-contain mx-auto mb-5"
            />
            <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-3">
              ⚠️ SHiESTY RAiDERS ⚠️ LOOT GOBLINS ⚠️
            </h2>
            <img
              src={assetUrl('/dont.webp')}
              alt="DONT-SHOOT"
              className="w-20 h-20 object-contain mx-auto mb-5"
            />
            <p className="text-xs text-[var(--color-arc-muted)] uppercase tracking-[0.3em] mb-8">
              Link your Discord account to access the hub
            </p>
            <img
              src={assetUrl('/main/discord.svg')}
              alt="Discord"
              className="w-20 h-20 object-contain mx-auto mb-5"
            />
            <a
              href="/api/auth/discord"
              className="inline-block px-8 py-3 bg-arc-yellow text-black text-xs font-black uppercase tracking-[0.3em] transition-opacity hover:opacity-80"
            >
              Initialize Uplink
            </a>
          </div>
        </div>
      </div>
    );

  // ── Needs token ──
  if (authState === 'needs_token' || authState === 'token_pending') {
    const isPending = authState === 'token_pending';
    const tryLink = async () => {
      setIsLinkingToken(true);
      setTokenMsg('');
      try {
        const r = await linkToken();
        if (r?.status === 'linked' || r?.status === 'already_linked') {
          setTokenMsg('Token linked.');
          await refresh();
        } else
          setTokenMsg(
            'Token not found. Launch ARC Raiders with extension active.',
          );
      } catch (e: any) {
        setTokenMsg(e?.message || 'Failed.');
      } finally {
        setIsLinkingToken(false);
      }
    };
    return (
      <div className="max-w-md mx-auto px-4 mt-20 text-center">
        <div className="bg-arc-light-bg border border-[#1e1e1e] p-12">
          <Shield
            className={`w-10 h-10 mx-auto mb-5 ${isPending ? 'text-arc-yellow' : 'text-arc-yellow'}`}
          />
          <img
            src={assetUrl('/embark.webp')}
            alt="Embark"
            className="h-4 opacity-20"
          />
          <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-3">
            {isPending
              ? 'Token Detected — Link Now'
              : 'Embark Account Required'}
          </h2>
          {!isPending && (
            <div className="grid grid-cols-2 gap-2 mb-6 max-w-xs mx-auto">
              {SUPPORTED_PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setConnectingPlatform(p.id);
                    startPlatformAuth(p.id).finally(() =>
                      setConnectingPlatform(null),
                    );
                  }}
                  disabled={connectingPlatform !== null}
                  className="flex items-center gap-2 px-3 py-2.5 bg-arc-light-bg border border-arc-border hover:border-[var(--color-arc-yellow)]/30 transition-colors disabled:opacity-50"
                >
                  <Monitor
                    className="w-4 h-4 shrink-0"
                    style={{ color: p.color }}
                  />
                  <span className="text-[8px] font-black uppercase tracking-wider">
                    {connectingPlatform === p.id ? 'Connecting...' : p.name}
                  </span>
                </button>
              ))}
            </div>
          )}
          {isPending && (
            <button
              onClick={tryLink}
              disabled={isLinkingToken}
              className="px-6 py-2 bg-arc-yellow text-black text-[9px] font-black uppercase tracking-[0.25em] disabled:opacity-60 mb-4 block mx-auto"
            >
              {isLinkingToken ? 'Linking...' : 'Link Token'}
            </button>
          )}
          <p className="text-[7px] text-[var(--color-arc-border)] mt-2">
            Extension:{' '}
            {extensionInstalled
              ? `v${extensionVersion || '?'}`
              : 'Not installed'}
          </p>
          {tokenMsg && (
            <p
              className={`text-[7px] font-black uppercase mt-2 ${tokenMsg.includes('linked') ? 'text-arc-yellow' : 'text-[var(--color-arc-danger)]'}`}
            >
              {tokenMsg}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Derive data ───────────────────────────────────────────────────────────
  const s = playerStats;
  const roundsData: any[] = Array.isArray(rounds) ? rounds : [];
  const combatDetailed = combatBreakdown?.combat_detailed || {};
  const perf = combatBreakdown?.performance_analytics || {};

  const hubLevel = (raiderHub as any)?.playerLevel;
  const realLevel = Math.min(
    MAX_RAIDER_LEVEL,
    s?.level || hubLevel?.level || 1,
  );
  const realXp =
    realLevel >= MAX_RAIDER_LEVEL
      ? 0
      : (s?.gameXp ?? s?.xp ?? hubLevel?.xp ?? 0);
  const realXpNext =
    realLevel >= MAX_RAIDER_LEVEL
      ? 0
      : (s?.xpForNextLevel ?? hubLevel?.xpForNextLevel ?? 1000);
  const realTotalXp = Math.min(2818000, s?.totalXp ?? hubLevel?.totalXp ?? 0);

  const rawCurr = stash?.currencies;
  const currObj: any =
    rawCurr && typeof rawCurr === 'object' && !Array.isArray(rawCurr)
      ? rawCurr
      : {};
  const hubCurr = (raiderHub as any)?.currencies || {};
  // Normalize: raider-hub currencies object uses { credits, tokens, coins, creds }
  // statsAggregator uses { creds_balance, tokens_balance, total_coins }
  // Always prefer the live raider-hub normalized fields first
  const credits = Number(
    hubCurr.credits ??
      hubCurr.creds_balance ??
      hubCurr.currencie_balance ??
      currObj.credits ??
      currObj.creds_balance ??
      s?.credits ??
      0,
  );
  const tokens = Number(
    hubCurr.tokens ??
      hubCurr.tokens_balance ??
      currObj.tokens ??
      currObj.tokens_balance ??
      s?.tokens ??
      0,
  );
  const coins = Number(
    hubCurr.coins ??
      hubCurr.currencies?.coins ??
      hubCurr.total_coins ??
      currObj.coins ??
      currObj.total_coins ??
      s?.coins ??
      0,
  );
  const stashSource =
    stash ||
    ((raiderHub as any)?.stashItems
      ? {
          items: (raiderHub as any).stashItems,
          currencies: (raiderHub as any).currencies,
        }
      : null);
  const stashItems: any[] = pickArray(stashSource, [
    'items',
    'inventory',
    'data',
  ]);
  const stashVal = Number(
    s?.stashValue ??
      (raiderHub as any)?.stashValue ??
      stashItems.reduce(
        (sum: number, item: any) =>
          sum +
          Number(item?.value ?? item?.price ?? 0) * Number(item?.quantity ?? 1),
        0,
      ),
  );

  const hubProfile = (raiderHub as any)?.profile || {};
  const embarkName =
    hubProfile.username || s?.displayName || profile.username || 'RAIDER';
  const embarkId =
    s?.embarkId || hubProfile.userId || (profile as any).embarkId || null;

  // Rounds
  const extractedRounds = roundsData.filter((r: any) => {
    const st = (r.outcome || r.status || '').toString().toLowerCase();
    return st === 'extracted' || st.includes('extract');
  });
  const roundsAgg = roundsData.reduce(
    (acc: any, r: any) => {
      acc.netProfit += Number(r.netValue ?? r.netProfit ?? 0);
      acc.arcKills += Number(r.arcKills || 0);
      acc.pvpKills += Number(r.playerKills || 0);
      acc.duration +=
        r.durationMs != null
          ? Number(r.durationMs) / 1000
          : Number(r.duration ?? 0);
      const st = (r.outcome || r.status || '').toString().toLowerCase();
      if (st === 'failed' || st === 'died') acc.deaths++;
      return acc;
    },
    { netProfit: 0, arcKills: 0, pvpKills: 0, duration: 0, deaths: 0 },
  );

  // Prefer API survival/extraction rate (may be 0-100 or 0-1 float), fall back to rounds
  const _apiSurvivalRaw =
    perf?.survival_rate ??
    perf?.extraction_rate ??
    (combatBreakdown as any)?.extraction_rate ??
    (combatBreakdown as any)?.survival_rate;
  const extractionRate =
    _apiSurvivalRaw != null
      ? _apiSurvivalRaw > 1
        ? Number(_apiSurvivalRaw).toFixed(1)
        : (Number(_apiSurvivalRaw) * 100).toFixed(1)
      : roundsData.length > 0
        ? ((extractedRounds.length / roundsData.length) * 100).toFixed(1)
        : '0.0';
  const netProfit = s?.netProfit || perf?.net_profit || roundsAgg.netProfit;
  const arcKills =
    s?.arcKills ?? combatDetailed?.arc_kills_total ?? roundsAgg.arcKills;
  const pvpKills =
    s?.playerKills ?? combatDetailed?.player_kills ?? roundsAgg.pvpKills;
  const deaths = combatBreakdown?.pvp?.deaths ?? roundsAgg.deaths;
  const kdRatio = (() => {
    if (combatBreakdown?.pvp?.kdRatio) return combatBreakdown.pvp.kdRatio;
    if (perf?.kd_ratio != null) return Number(perf.kd_ratio).toFixed(2);
    if (deaths > 0) return (pvpKills / deaths).toFixed(2);
    return pvpKills > 0 ? pvpKills.toFixed(2) : '0.00';
  })();
  const avgProfit =
    roundsData.length > 0 ? Math.round(netProfit / roundsData.length) : 0;

  let streak = 0;
  for (const r of roundsData) {
    const st = (r.outcome || r.status || '').toString().toLowerCase();
    if (st === 'extracted' || st.includes('extract')) streak++;
    else break;
  }
  const bestRound = [...roundsData].sort(
    (a: any, b: any) =>
      (b.netValue ?? b.netProfit ?? 0) - (a.netValue ?? a.netProfit ?? 0),
  )[0];

  const sparkData = [...roundsData]
    .reverse()
    .map((r: any) => Number(r.netValue ?? r.netProfit ?? 0));

  // ARC kills / damage
  const unitTally: Record<
    string,
    {
      unit: string;
      kills: number;
      damage: number;
      targetId?: number | string | null;
    }
  > = {};
  const displayArcUnitName = (value: unknown) => {
    const raw = String(value || '').trim();
    const key = raw.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
    if (key === 'arc surveyor' || key === 'surveyor') return 'ARC Surveyor';
    return raw.replace(/\b\w/g, (c) => c.toUpperCase());
  };
  const addArcUnit = (
    rawName: unknown,
    rawKills: unknown,
    rawDamage?: unknown,
    rawTargetId?: unknown,
  ) => {
    const name = displayArcUnitName(rawName);
    if (!name) return;
    const targetId =
      rawTargetId !== undefined && rawTargetId !== null && rawTargetId !== ''
        ? (rawTargetId as string | number)
        : null;
    const key =
      targetId !== null ? `target:${targetId}` : `name:${codexKey(name)}`;
    const entry = unitTally[key] || {
      unit: name,
      kills: 0,
      damage: 0,
      targetId,
    };
    entry.unit = entry.unit || name;
    entry.kills += Number(rawKills) || 0;
    entry.damage += Number(rawDamage) || 0;
    entry.targetId = entry.targetId ?? targetId;
    unitTally[key] = entry;
  };
  const dedicatedEnemies = Array.isArray(ctxEnemyKills?.enemies)
    ? ctxEnemyKills.enemies
    : [];
  for (const e of dedicatedEnemies) {
    const enemyName = e.name || e.enemy_name || e.enemyName || e.targetName;
    addArcUnit(
      enemyName,
      e.count ?? e.kills ?? e.totalKills,
      e.damage ?? e.totalDamage ?? e.total_damage ?? e.damageDealt,
      e.targetId ?? e.target_id ?? e.id,
    );
  }
  const serverArcBreakdown = Array.isArray(combatBreakdown?.pve?.arcBreakdown)
    ? combatBreakdown.pve.arcBreakdown
    : [];
  const serverUnitBreakdown =
    combatDetailed?.unit_breakdown || combatBreakdown?.enemy_kills || {};
  for (const e of serverArcBreakdown) {
    const n: string = e.name || e.targetName || '';
    if (!n) continue;
    addArcUnit(
      n,
      e.kills,
      e.damage ?? e.totalDamage ?? e.damageDealt,
      e.targetId ?? e.target_id ?? e.id,
    );
  }
  for (const [breakdownKey, value] of Object.entries(serverUnitBreakdown)) {
    const clean = String(breakdownKey).startsWith('kills_')
      ? String(breakdownKey).slice(6).replace(/_/g, ' ')
      : String(breakdownKey).replace(/_/g, ' ');
    if (!clean) continue;
    const display = displayArcUnitName(clean);
    const tallyKey = `name:${codexKey(display)}`;
    const entry = unitTally[tallyKey] || { unit: display, kills: 0, damage: 0 };
    entry.kills = Math.max(entry.kills, Number(value) || 0);
    unitTally[tallyKey] = entry;
  }
  for (const r of roundsData) {
    if (Array.isArray((r as any).arcBreakdown)) {
      for (const e of (r as any).arcBreakdown) {
        const n: string = e.targetName || e.name || '';
        if (!n) continue;
        addArcUnit(
          n,
          e.kills,
          e.damage ?? e.totalDamage ?? e.damageDealt,
          e.targetId ?? e.target_id ?? e.id,
        );
      }
    }
  }
  for (const n of [
    'Wasp',
    'Fireball',
    'Tick',
    'Pop',
    'Hornet',
    'Turret',
    'Snitch',
    'Firefly',
    'Spotter',
    'Player',
    'Shredder',
    'Rocketeer',
    'Leaper',
    'Comet',
    'Bastion',
    'Bombardier',
    'ARC Surveyor',
    'Sentinel',
    'Vaporizer',
    'Self',
    'Queen',
    'Matriarch',
  ])
    if (!(`name:${codexKey(n)}` in unitTally))
      unitTally[`name:${codexKey(n)}`] = {
        unit: n,
        kills: 0,
        damage: 0,
      };
  const arcUnits = Object.entries(unitTally)
    .map(([key, stats]) => ({
      key,
      unit: stats.unit,
      kills: stats.kills,
      damage: stats.damage,
      targetId: stats.targetId ?? null,
      image: getArcBotIconById(stats.targetId, stats.unit),
    }))
    .sort((a, b) => b.kills - a.kills || b.damage - a.damage);
  const maxArcKills = arcUnits[0]?.kills || 1;
  const maxArcDamage = Math.max(...arcUnits.map((u) => u.damage), 1);

  // Map performance
  const MAP_IMG: Record<string, string> = {
    'the dam': assetUrl('/maps/dambattlegrounds.png'),
    'dam battleground': assetUrl('/maps/dambattlegrounds.png'),
    'dam battlegrounds': assetUrl('/maps/dambattlegrounds.png'),
    dam: assetUrl('/maps/dambattlegrounds.png'),
    spaceport: assetUrl('/maps/spaceport.png'),
    'the spaceport': assetUrl('/maps/spaceport.png'),
    'buried city': assetUrl('/maps/burriedcity.png'),
    'stella montis': assetUrl('/maps/stella.png'),
    'the blue gate': assetUrl('/maps/bluegate.png'),
    'blue gate': assetUrl('/maps/bluegate.png'),
    'riven tides': assetUrl('/maps/riventides.webp'),
  };
  // Map performance — prefer dedicated endpoint (pridee-aggregated, accurate).
  // Merge rows with the same mapName (API returns separate rows for same map variant, e.g. The Dam x2).
  const mapGroups: Record<string, any> = {};
  const dedicatedMaps = Array.isArray(ctxMapPerformance?.maps)
    ? ctxMapPerformance.maps
    : [];
  if (dedicatedMaps.length > 0) {
    for (const m of dedicatedMaps) {
      const mn = (m.mapName || 'Unknown') as string;
      const g = mapGroups[mn] || {
        mapName: mn,
        raids: 0,
        extracted: 0,
        profit: 0,
        duration: 0,
      };
      g.raids += Number(m.raids) || 0;
      g.extracted += Number(m.extracted) || 0;
      g.profit += Number(m.totalNetValue) || 0;
      g.duration += Number(m.totalDurationMs) / 1000 || 0;
      mapGroups[mn] = g;
    }
  } else {
    // Fallback: compute from rounds
    for (const r of roundsData) {
      const mn = (r.mapName || r.map_name || r.map || 'Unknown') as string;
      const g = mapGroups[mn] || {
        mapName: mn,
        raids: 0,
        extracted: 0,
        profit: 0,
        duration: 0,
      };
      g.raids++;
      const st = (r.outcome || r.status || '').toString().toLowerCase();
      if (st === 'extracted' || st.includes('extract')) g.extracted++;
      g.profit += Number(r.netValue ?? r.netProfit ?? 0);
      g.duration +=
        r.durationMs != null
          ? Number(r.durationMs) / 1000
          : Number(r.duration ?? 0);
      mapGroups[mn] = g;
    }
  }
  const mapRows = Object.values(mapGroups).sort(
    (a: any, b: any) => b.raids - a.raids,
  ) as any[];

  // Weapon performance — keep all existing sources intact
  type WeaponTallyEntry = {
    name: string;
    kills: number;
    damage: number;
    itemId?: string;
    weaponAssetId?: number | string;
  };
  const newWeaponEntry = (name: string): WeaponTallyEntry => ({
    name,
    kills: 0,
    damage: 0,
  });
  const weaponTally: Record<string, WeaponTallyEntry> = {};
  const weaponKey = (weapon: any, fallbackName: string) => {
    const assetId = weapon?.weaponAssetId ?? weapon?.weapon_asset_id;
    if (assetId !== undefined && assetId !== null && assetId !== '')
      return `asset:${assetId}`;
    const itemId = weapon?.itemId ?? weapon?.item_id;
    if (itemId) return `item:${itemId}`;
    return `name:${codexKey(fallbackName)}`;
  };
  const dedicatedWeapons = Array.isArray(ctxWeaponKills?.weapons)
    ? ctxWeaponKills.weapons
    : [];
  const serverWeapons = Array.isArray(combatBreakdown?.topWeapons)
    ? combatBreakdown.topWeapons
    : Array.isArray(combatBreakdown?.weapon_performance)
      ? combatBreakdown.weapon_performance
      : [];
  for (const w of serverWeapons) {
    const nm = w.name || w.weapon_name || w.weaponName || '';
    if (nm) {
      const key = weaponKey(w, nm);
      const entry = weaponTally[key] || newWeaponEntry(nm);
      entry.name = entry.name || nm;
      entry.kills += Number(
        w.count ?? w.kills ?? w.weapon_kills_total ?? w.totalKills ?? 0,
      );
      entry.damage += Number(
        w.damage ?? w.weapon_damage_total ?? w.amount ?? 0,
      );
      entry.itemId = entry.itemId || w.itemId || w.item_id;
      entry.weaponAssetId =
        entry.weaponAssetId || w.weaponAssetId || w.weapon_asset_id;
      weaponTally[key] = entry;
    }
  }
  for (const w of dedicatedWeapons) {
    const nm = w.name || w.weapon_name || w.weaponName || '';
    const damage = Number(
      w.damage ?? w.weapon_damage_total ?? w.totalDamage ?? w.amount ?? 0,
    );
    if (nm) {
      const key = weaponKey(w, nm);
      const entry = weaponTally[key] || newWeaponEntry(nm);
      entry.name = entry.name || nm;
      entry.kills = Math.max(
        entry.kills,
        Number(w.count ?? w.kills ?? w.weapon_kills_total ?? 0) || 0,
      );
      entry.damage = Math.max(entry.damage, damage);
      entry.itemId = entry.itemId || w.itemId || w.item_id;
      entry.weaponAssetId =
        entry.weaponAssetId || w.weaponAssetId || w.weapon_asset_id;
      weaponTally[key] = entry;
    }
  }
  for (const r of roundsData) {
    if (Array.isArray((r as any).weaponDamageBreakdown)) {
      for (const w of (r as any).weaponDamageBreakdown) {
        const nm = w.weaponName || w.name || '';
        if (nm) {
          const key = weaponKey(w, nm);
          const entry = weaponTally[key] || newWeaponEntry(nm);
          entry.name = entry.name || nm;
          entry.damage += Number(w.amount || w.damage || 0);
          entry.itemId = entry.itemId || w.itemId || w.item_id;
          entry.weaponAssetId =
            entry.weaponAssetId || w.weaponAssetId || w.weapon_asset_id;
          weaponTally[key] = entry;
        }
      }
    }
  }
  const topWeapons = Object.entries(weaponTally)
    .map(([key, entry]) => {
      const codex = getWeaponCodex(
        entry.itemId,
        entry.name,
        entry.weaponAssetId,
      );
      return {
        key,
        name: itemText(codex?.name, entry.name),
        kills: entry.kills,
        damage: entry.damage,
        itemId: entry.itemId || codex?.id,
        weaponAssetId: entry.weaponAssetId,
        codex,
        codexLine: weaponCodexLine(codex),
      };
    })
    .filter((w) => w.kills > 0 || w.damage > 0)
    .sort((a, b) => b.kills - a.kills || b.damage - a.damage)
    .slice(0, 10);
  const maxWpnKills = topWeapons[0]?.kills || 1;
  const maxWpnDamage = Math.max(...topWeapons.map((w) => w.damage), 1);

  // Loadout
  const loadoutRoot = (loadout as any)?.loadout || loadout || {};
  const backpackItems = asSlotArray(loadoutRoot.backpack || []);
  const quickItems = asSlotArray(
    loadoutRoot.quick_use ||
      loadoutRoot.quickUse ||
      loadoutRoot.quickItems ||
      [],
  );

  // Hideout
  const hideoutModules = pickArray(hideout, ['modules', 'workshop', 'items']);
  const hideoutDone = hideoutModules.filter((m: any) => {
    const c = m.currentLevel ?? m.level;
    const mx = m.maxLevel;
    return c != null && mx != null && c >= mx;
  }).length;
  const hideoutPercent =
    hideoutModules.length > 0
      ? Math.round((hideoutDone / hideoutModules.length) * 100)
      : 0;

  // Player stat circles data
  const blueprintList = pickArray(blueprints, ['blueprints', 'items', 'list']);
  const blueprintCount = blueprintList.filter(
    (bp: any) => bp?.learned === true || bp?.unlocked === true,
  ).length;
  const blueprintTotal = blueprintList.length || 84;
  const blueprintPercent =
    blueprintTotal > 0
      ? Math.round((blueprintCount / blueprintTotal) * 100)
      : 0;

  const questList = pickArray(quests, ['items', 'quests', 'list']);
  const questCompleted = questList.filter(
    (q: any) =>
      q.status === 'completed' || q.completed === true || q.progress === 100,
  ).length;
  const questTotal = questList.length || 20; // Fallback if no data
  const questPercent =
    questTotal > 0 ? Math.round((questCompleted / questTotal) * 100) : 0;

  const projectList = pickArray(projects, ['items', 'projects', 'list']);
  const projectCompleted = projectList.filter(
    (p: any) =>
      p.status === 'completed' || p.completed === true || p.progress === 100,
  ).length;
  const projectTotal = projectList.length || 15; // Fallback if no data
  const projectPercent =
    projectTotal > 0 ? Math.round((projectCompleted / projectTotal) * 100) : 0;

  const recentRaids = roundsData;
  const filteredRaids = recentRaids
    .filter((r: any) => {
      const q = raidSearch.toLowerCase().trim();
      if (!q) return true;

      const map = String(r.mapName || r.map_name || r.map || '').toLowerCase();
      const outcome = String(r.outcome || r.status || '').toLowerCase();
      const profit = String(r.netValue ?? r.netProfit ?? '').toLowerCase();
      const arcKills = String(r.arcKills ?? '').toLowerCase();
      const playerKills = String(r.playerKills ?? '').toLowerCase();

      return (
        map.includes(q) ||
        outcome.includes(q) ||
        profit.includes(q) ||
        arcKills.includes(q) ||
        playerKills.includes(q)
      );
    })
    .sort((a: any, b: any) => {
      if (raidSort === 'map') {
        const am = String(a.mapName || a.map_name || a.map || '');
        const bm = String(b.mapName || b.map_name || b.map || '');
        return am.localeCompare(bm);
      }

      if (raidSort === 'profit') {
        return (
          Number(b.netValue ?? b.netProfit ?? 0) -
          Number(a.netValue ?? a.netProfit ?? 0)
        );
      }

      if (raidSort === 'arcKills') {
        return Number(b.arcKills || 0) - Number(a.arcKills || 0);
      }

      if (raidSort === 'playerKills') {
        return Number(b.playerKills || 0) - Number(a.playerKills || 0);
      }

      return (
        new Date(b.syncedAt || b.timestamp || 0).getTime() -
        new Date(a.syncedAt || a.timestamp || 0).getTime()
      );
    });
  const visibleRaids = showAllRaids
    ? filteredRaids
    : filteredRaids.slice(0, 10);

  const stashSlots = (stashSource as any)?.slots || {};
  const stashUsed =
    s?.stashSlotsUsed ??
    stashSlots.used ??
    stashSlots.current ??
    (stashSource as any)?.currentCapacity ??
    (stashSource as any)?.current ??
    stashItems.length;
  const stashTotal =
    s?.stashSlotsTotal ??
    stashSlots.total ??
    stashSlots.max ??
    (stashSource as any)?.maxCapacity ??
    (stashSource as any)?.max ??
    (stashSource as any)?.capacity ??
    null;
  return s ? (
    <>
      {/* ══ HERO ══ */}
      <div className="bg-arc-light-bg border border-[#1e1e1e]">
        {/* Avatar + name + controls */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#141414]">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={
                  profile.avatar
                    ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
                    : ''
                }
                alt="profile"
                className="w-16 h-16 border-2 object-cover"
                style={{ borderColor: 'var(--color-arc-yellow)' }}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-arc-yellow border-2 border-[var(--color-arc-light-background)]" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-[0.12em] leading-none">
                {embarkName}
              </h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-[8px] font-black text-arc-yellow uppercase tracking-widest bg-arc-yellow/10 border border-[var(--color-arc-yellow)]/20 px-2 py-0.5">
                  LV.{realLevel}
                </span>
                <span className="text-[8px] font-black text-arc-yellow uppercase tracking-widest bg-arc-yellow/10 border border-[var(--color-arc-yellow)]/20 px-2 py-0.5">
                  SYNCED
                </span>
                {embarkId && (
                  <span className="text-[7px] text-[var(--color-arc-border)] font-barlow tracking-wider">
                    ID: {embarkId}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-[7px] text-arc-yellow font-black uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-arc-yellow animate-pulse" />
                  ONLINE
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <img
              src={assetUrl('main/arc.png')}
              alt="Embark"
              className="h-4 opacity-20"
            />
            <span
              className={`flex items-center gap-1.5 px-2 py-1 border text-[7px] font-black uppercase tracking-widest ${
                authState === 'linked'
                  ? 'border-[var(--color-arc-yellow)]/20 bg-arc-yellow/5 text-arc-yellow'
                  : 'border-[var(--color-arc-danger)]/20 bg-[var(--color-arc-danger)]/5 text-[var(--color-arc-danger)]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${authState === 'linked' ? 'bg-arc-yellow animate-pulse' : 'bg-[var(--color-arc-danger)]'}`}
              />
              {authState === 'linked' ? 'AUTHENTICATED' : 'NOT LINKED'}
              <img
                src={assetUrl('/embark.webp')}
                alt="Embark"
                className="h-3 opacity-20"
              />
            </span>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="p-2 border border-[var(--color-arc-yellow)]/20 text-arc-yellow hover:bg-arc-yellow/10 disabled:opacity-40 transition-all"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* XP */}
        <div className="px-5 py-3 border-b border-[#141414]">
          <XpBar level={realLevel} xp={realXp} xpNext={realXpNext} />
          <p className="text-[7px] text-[#2a2a2a] uppercase tracking-widest mt-1.5">
            Total XP:{' '}
            <span className="text-[#3a3a3a]">
              {realTotalXp.toLocaleString()}
            </span>
          </p>
        </div>

        {/* Expedition Status */}
        {expeditionStatus && (
          <div className="px-5 py-2.5 border-b border-[#141414] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[7px] font-black uppercase tracking-widest text-[var(--color-arc-muted)]">
                Season
              </span>
              <span className="text-[7px] font-black text-white">
                {expeditionStatus.activeSeason}
              </span>
              <span className="text-[#1e1e1e]">|</span>
              <span className="text-[7px] font-black uppercase tracking-widest text-[var(--color-arc-muted)]">
                Expeditions
              </span>
              <span className="text-[7px] font-black text-white">
                {expeditionStatus.completedExpeditions}
              </span>
              <span className="text-[#1e1e1e]">|</span>
              <span className="text-[7px] font-black uppercase tracking-widest text-[var(--color-arc-muted)]">
                Tier
              </span>
              <span className="text-[7px] font-black text-[var(--color-arc-yellow)]">
                {expeditionStatus.currentTier}
              </span>
            </div>
            <span
              className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 border ${
                expeditionStatus.state === 'READY'
                  ? 'border-[var(--color-arc-yellow)]/20 text-[var(--color-arc-yellow)]'
                  : 'border-[var(--color-arc-muted)]/20 text-[var(--color-arc-muted)]'
              }`}
            >
              {expeditionStatus.state}
            </span>
          </div>
        )}

        {/* Player Stat Circles */}
        <div className="px-5 py-3 border-b border-[#141414]">
          <PlayerStatCircles
            hideout={{
              current: hideoutDone,
              total: hideoutModules.length,
              percent: hideoutPercent,
            }}
            quests={{
              current: questCompleted,
              total: questTotal,
              percent: questPercent,
            }}
            projects={{
              current: projectCompleted,
              total: projectTotal,
              percent: projectPercent,
            }}
            blueprints={{
              current: blueprintCount,
              total: blueprintTotal,
              percent: blueprintPercent,
            }}
          />
        </div>

        <div className="hud-grid hud-grid--top">
          <HudStatBox
            label="Credits"
            value={fmt$(credits)}
            iconSrc={assetUrl('/main/currency_icon.png')}
            color="#ece2d0"
          />
          <HudStatBox
            label="Tokens"
            value={fmtNum(tokens)}
            iconSrc={assetUrl('/main/raidertoken.png')}
            color="var(--color-arc-rare)"
          />
          <HudStatBox
            label="Cred"
            value={fmtNum(coins)}
            iconSrc={assetUrl('/main/cred_icon.png')}
            color="var(--color-arc-yellow)"
          />
          <HudStatBox
            label="Stash Value"
            value={fmt$(stashVal)}
            iconSrc={assetUrl('/main/currency_icon.png')}
            color="var(--color-arc-epic)"
          />
        </div>

        <div className="border-t border-[#141414]">
          <div className="hud-grid hud-grid--compact">
            <HudStatBox
              compact
              icon={Flame}
              label="Extract Streak"
              value={String(streak)}
              color={
                streak > 0
                  ? 'var(--color-arc-yellow)'
                  : 'var(--color-arc-muted)'
              }
            />
            <HudStatBox
              compact
              icon={Trophy}
              label="Best Raid"
              value={
                bestRound
                  ? fmt$(bestRound.netValue ?? bestRound.netProfit ?? 0)
                  : '—'
              }
              color="var(--color-arc-yellow)"
            />
            <HudStatBox
              compact
              icon={Clock}
              label="Time Topside"
              value={formatDuration(roundsAgg.duration)}
              color="var(--color-arc-rare)"
            />
            <HudStatBox
              compact
              icon={Activity}
              label={EMBARK_STAT_LABELS.avgProfitPerExtraction}
              value={fmt$(avgProfit)}
              color="var(--color-arc-epic)"
            />
          </div>
          {syncMsg && (
            <div className="flex items-center px-5 py-3">
              <p
                className={`text-[7px] font-black uppercase ${syncMsg.includes('ERR') || syncMsg.includes('TIME') ? 'text-[var(--color-arc-danger)]' : 'text-arc-yellow'}`}
              >
                {syncMsg}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ══ SURVIVAL & LOOT STATS ══ */}
      <SurvivalStatsPanel
        combatSummary={(raiderHub as any)?.combatSummary}
        combatBreakdown={combatBreakdown}
        roundsData={roundsData}
      />

      {/* ══ PERFORMANCE PILLS ══ */}
      <div className="hud-grid hud-grid--dense">
        <HudStatBox
          compact
          label="Raids"
          value={fmtNum(roundsData.length)}
          color="var(--color-arc-yellow)"
          icon={Activity}
        />
        <HudStatBox
          compact
          label="Extract %"
          value={`${extractionRate}%`}
          color="var(--color-arc-rare)"
          icon={Shield}
        />
        <HudStatBox
          compact
          label="K/D"
          value={String(kdRatio)}
          color="var(--color-arc-danger)"
          icon={Target}
        />
        <HudStatBox
          compact
          label={EMBARK_STAT_LABELS.netValue}
          value={fmt$(netProfit)}
          color="var(--color-arc-yellow)"
          icon={TrendingUp}
        />
        <HudStatBox
          compact
          label={EMBARK_STAT_LABELS.avgProfitPerExtraction}
          value={fmt$(avgProfit)}
          color="var(--color-arc-epic)"
          icon={Coins}
        />
        <HudStatBox
          compact
          label="ARC Kills"
          value={fmtNum(arcKills)}
          color="var(--color-arc-rare)"
          icon={Crosshair}
        />
        <HudStatBox
          compact
          label="PvP Kills"
          value={fmtNum(pvpKills)}
          color="var(--color-arc-danger)"
          icon={Skull}
        />
        <HudStatBox
          compact
          label="$/Min"
          value={
            roundsAgg.duration > 0
              ? Math.round(
                  netProfit / (roundsAgg.duration / 60),
                ).toLocaleString()
              : '—'
          }
          color="var(--color-arc-yellow)"
          icon={Zap}
        />
      </div>

      {/* ══ main 2-COLUMN GRID ══ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        {/* ── LEFT COLUMN: Loadout + Inventory ── */}
        <div className="space-y-4">
          {/* Loadout — Game-accurate layout */}
          {loadout && (
            <div className="bg-arc-light-bg border border-[#1e1e1e]">
              <div className="px-4 py-2.5 border-b border-[#141414] flex items-center gap-2">
                <Package className="w-4 h-4 text-arc-yellow" />
                <h2 className="text-[10px] font-black uppercase tracking-widest">
                  Loadout
                </h2>
              </div>
              {/* 3-column game layout: gear | character | weapons */}
              <div className="flex gap-0 min-h-[220px] overflow-hidden">
                {/* LEFT: Gear slots + backpack */}
                <div
                  className="flex flex-col gap-2 p-3 shrink-0"
                  style={{
                    background: '#09080f',
                    borderRight: '1px solid #1e1e2e',
                    width: 88,
                  }}
                >
                  <span className="text-[6px] text-[var(--color-arc-muted)] uppercase tracking-widest font-black mb-1">
                    GEAR
                  </span>
                  <GameGearSlot item={loadoutRoot.augment} label="Augment" />
                  <GameGearSlot item={loadoutRoot.shield} label="Shield" />
                  {/* Backpack */}
                  <div className="mt-auto">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[6px] text-[var(--color-arc-muted)] uppercase tracking-widest font-black">
                        PACK
                      </span>
                      <span className="text-[6px] text-[var(--color-arc-danger)] font-black">
                        {backpackItems.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-0.5">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <LoadoutBox
                          key={i}
                          item={backpackItems[i] || null}
                          label={`${i + 1}`}
                          size="sm"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* CENTER: Character preview */}
                <div
                  className="flex-1 flex items-end justify-center relative"
                  style={{
                    background:
                      'linear-gradient(180deg, #09080f 0%, #0d0c18 60%, #0a0814 100%)',
                    borderRight: '1px solid #1e1e2e',
                  }}
                >
                  <div
                    className="relative flex flex-col items-center justify-end overflow-hidden select-none"
                    style={{ minHeight: 200, flex: 1 }}
                  >
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'radial-gradient(ellipse 60% 70% at 50% 60%, rgba(61,235,255,0.07) 0%, transparent 70%)',
                      }}
                    />
                    <img
                      src={assetUrl('/main/t_ui_icon_outfit_bomber.webp')}
                      alt="Raider"
                      className="character-breathe relative z-10 object-contain"
                      style={{
                        maxHeight: 190,
                        width: 'auto',
                        filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.7))',
                      }}
                    />
                    <div
                      className="absolute bottom-0 left-1/2 pointer-events-none"
                      style={{
                        transform: 'translateX(-50%)',
                        width: 100,
                        height: 14,
                        background: 'rgba(0,0,0,0.55)',
                        borderRadius: '50%',
                        filter: 'blur(8px)',
                      }}
                    />
                  </div>
                </div>

                {/* RIGHT: Weapon slots + quick use */}
                <div
                  className="flex flex-col gap-2 p-3 shrink-0"
                  style={{ background: '#09080f', width: 200 }}
                >
                  <span className="text-[6px] text-[var(--color-arc-muted)] uppercase tracking-widest font-black mb-1">
                    WEAPONS
                  </span>
                  <GameWeaponSlot
                    item={loadoutRoot.weapon_1 || loadoutRoot.weapon1}
                    label="Primary"
                  />
                  <GameWeaponSlot
                    item={loadoutRoot.weapon_2 || loadoutRoot.weapon2}
                    label="Secondary"
                  />
                  {/* Quick Use */}
                  <div className="mt-auto">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[6px] text-[var(--color-arc-muted)] uppercase tracking-widest font-black">
                        QUICK USE
                      </span>
                      <span className="text-[6px] text-[var(--color-arc-danger)] font-black">
                        {quickItems.length}/5
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <GameSmallSlot
                          key={i}
                          item={quickItems[i] || null}
                          label={`${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inventory / Stash Grid */}
          {stashItems.length > 0 ? (
            <InventoryPanel
              items={stashItems}
              used={stashUsed}
              total={stashTotal}
            />
          ) : (
            <div className="bg-arc-light-bg border border-[#1e1e2e] p-6 text-center">
              <Package className="w-6 h-6 text-[var(--color-arc-border)] mx-auto mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-arc-muted)]">
                Stash Empty
              </p>
              <img
                src={assetUrl('/embark.webp')}
                alt="Embark"
                className="h-4 opacity-20"
              />
              <p className="text-[8px] text-[var(--color-arc-border)] mt-1">
                Sync your Embark account to view items
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: net value chart + Recent raids ── */}
        <div className="space-y-4">
          {/* Net value history */}
          {sparkData.length > 1 && (
            <div className="bg-arc-light-bg border border-[#1e1e1e] p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-arc-yellow" />
                  <h2 className="text-[10px] font-black uppercase tracking-widest">
                    {EMBARK_STAT_LABELS.raidValueHistoryTitle}
                  </h2>
                  <span className="text-[7px] text-[var(--color-arc-border)]">
                    last {sparkData.length} raids
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[8px] font-black uppercase">
                  <span className="text-arc-yellow">
                    High: {fmt$(Math.max(...sparkData))}
                  </span>
                  <span className="text-[var(--color-arc-danger)]">
                    Low: {fmt$(Math.min(...sparkData))}
                  </span>
                  <span className="text-arc-yellow">
                    Avg:{' '}
                    {fmt$(
                      Math.round(
                        sparkData.reduce((a, b) => a + b, 0) / sparkData.length,
                      ),
                    )}
                  </span>
                </div>
              </div>
              <SparkChart data={sparkData} height={56} />
              <div
                className="flex items-end gap-px mt-1"
                style={{ height: 20 }}
              >
                {sparkData.map((v, i) => {
                  const maxAbs = Math.max(...sparkData.map(Math.abs)) || 1;
                  const pct = Math.abs(v) / maxAbs;
                  return (
                    <div
                      key={i}
                      className="flex-1 flex items-end"
                      title={`${v >= 0 ? '+' : ''}${v.toLocaleString()}`}
                    >
                      <div
                        className="w-full"
                        style={{
                          height: `${Math.max(2, pct * 20)}px`,
                          background:
                            v >= 0
                              ? 'var(--color-arc-yellow)'
                              : 'var(--color-arc-danger)',
                          opacity: 0.55,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent raids feed */}
          {recentRaids.length > 0 && (
            <div className="bg-arc-light-bg border border-[#1e1e1e]">
              <div className="px-4 py-2.5 border-b border-[#141414] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--color-arc-rare)]" />
                  <h2 className="text-[10px] font-black uppercase tracking-widest">
                    Raid History
                  </h2>
                </div>

                <span className="text-[7px] text-[var(--color-arc-border)] uppercase font-black">
                  Total: {filteredRaids.length}
                </span>
              </div>

              <div className="px-3 py-2 border-b border-[#141414] flex flex-wrap items-center gap-2">
                <input
                  value={raidSearch}
                  onChange={(e) => setRaidSearch(e.target.value)}
                  placeholder="Search map/kills/value..."
                  className="bg-[#090909] border border-[#1e1e1e] px-2 py-1 text-[8px] uppercase font-black outline-none flex-1 min-w-[140px]"
                />

                <select
                  value={raidSort}
                  onChange={(e) => setRaidSort(e.target.value as any)}
                  className="bg-[#090909] border border-[#1e1e1e] px-2 py-1 text-[8px] uppercase font-black outline-none"
                >
                  <option value="newest">Newest</option>
                  <option value="map">Map</option>
                  <option value="profit">{EMBARK_STAT_LABELS.netValue}</option>
                  <option value="arcKills">ARC Kills</option>
                  <option value="playerKills">Player Kills</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowAllRaids((v) => !v)}
                  className="border border-[#1e1e1e] px-2 py-1 text-[8px] uppercase font-black hover:bg-[#141414] transition-colors"
                >
                  {showAllRaids ? 'Show 10' : 'Show All'}
                </button>
              </div>

              <div className="divide-y divide-[#0d0d0d]">
                {visibleRaids.map((r: any, i: number) => {
                  const st = (r.outcome || r.status || '')
                    .toString()
                    .toLowerCase();
                  const isEx = st === 'extracted' || st.includes('extract');
                  const profit = Number(r.netValue ?? r.netProfit ?? 0);
                  const dur =
                    r.durationMs != null
                      ? Number(r.durationMs) / 1000
                      : Number(r.duration ?? 0);
                  const mn = r.mapName || r.map_name || r.map || 'Unknown';
                  const img =
                    MAP_IMG[
                      String(mn || '')
                        .toLowerCase()
                        .replace(/\s+/g, ' ')
                    ] || null;

                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-arc-light-bg transition-colors group"
                    >
                      <div className="w-12 h-8 shrink-0 border border-[#141414] overflow-hidden bg-[#130918]">
                        {img ? (
                          <img
                            src={img}
                            alt={mn}
                            className="w-full h-full object-cover opacity-55 group-hover:opacity-75 transition-opacity"
                          />
                        ) : (
                          <Map className="w-3 h-3 text-[var(--color-arc-border)] m-auto mt-2" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[8px] font-black text-white uppercase truncate">
                          {mn}
                        </p>

                        <p className="text-[6px] text-[var(--color-arc-border)]">
                          {timeAgo(r.syncedAt || r.timestamp || '')}
                        </p>
                      </div>

                      <span
                        className={`text-[6px] font-black uppercase px-1.5 py-0.5 border shrink-0 ${
                          isEx
                            ? 'border-[var(--color-arc-yellow)]/25 bg-arc-yellow/5 text-arc-yellow'
                            : 'border-[var(--color-arc-danger)]/25 bg-[var(--color-arc-danger)]/5 text-[var(--color-arc-danger)]'
                        }`}
                      >
                        {isEx ? 'EXTR' : 'DIED'}
                      </span>

                      <span
                        className={`text-sm font-black shrink-0 w-16 text-right ${
                          profit >= 0
                            ? 'text-arc-yellow'
                            : 'text-[var(--color-arc-danger)]'
                        }`}
                      >
                        {profit >= 0 ? '+' : ''}
                        {fmt$(profit)}
                      </span>

                      <span className="text-[6px] text-[var(--color-arc-border)] font-black shrink-0 w-10 text-right">
                        {formatDuration(dur)}
                      </span>

                      <div className="flex items-center gap-2 shrink-0 ml-1">
                        <span className="flex items-center gap-0.5 text-[6px] font-black text-[var(--color-arc-rare)]">
                          <Crosshair className="w-2 h-2" />
                          {Number(r.arcKills || 0)}
                        </span>

                        <span className="flex items-center gap-0.5 text-[6px] font-black text-[var(--color-arc-danger)]">
                          <Skull className="w-2 h-2" />
                          {Number(r.playerKills || 0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ARC enemy performance */}
          {arcUnits.length > 0 && (
            <div className="bg-arc-light-bg border border-[#1e1e1e]">
              <div className="px-4 py-2.5 border-b border-[#141414] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-[var(--color-arc-rare)]" />
                  <h2 className="text-[10px] font-black uppercase tracking-widest">
                    ARC Enemy Performance
                  </h2>
                </div>
                <span className="text-[8px] text-[var(--color-arc-rare)] font-black">
                  {fmtNum(arcKills)} destroyed
                </span>
              </div>
              <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {arcUnits.map(
                  ({ key, unit, kills, damage, targetId, image }) => {
                    const pct = Math.max(
                      maxArcKills > 0 ? (kills / maxArcKills) * 100 : 0,
                      maxArcDamage > 0 ? (damage / maxArcDamage) * 100 : 0,
                    );
                    const isTop = kills === maxArcKills && kills > 0;
                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-2 px-2 py-2 border transition-colors ${
                          isTop
                            ? 'border-[var(--color-arc-rare)]/30 bg-[var(--color-arc-rare)]/5'
                            : 'border-[#141414]'
                        }`}
                      >
                        <img
                          src={image}
                          alt={unit}
                          className="w-7 h-7 object-contain shrink-0 rounded-[3px] bg-black/20 p-0.5 ring-1 ring-white/5"
                          onError={(e) => {
                            e.currentTarget.src = getArcBotIcon('');
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span
                              className={`text-[8px] font-black uppercase truncate pr-2 ${isTop ? 'text-[var(--color-arc-rare)]' : 'text-white'}`}
                            >
                              {unit}
                              {targetId !== null && (
                                <span className="ml-1 text-[6px] text-[var(--color-arc-muted)]">
                                  #{targetId}
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-[10px] font-black tabular-nums ${isTop ? 'text-[var(--color-arc-rare)]' : kills > 0 ? 'text-white' : 'text-[var(--color-arc-border)]'}`}
                              >
                                {fmtNum(kills)} KILLS
                              </span>
                              <span className="text-[10px] font-black tabular-nums text-[var(--color-arc-muted)]">
                                {fmtNum(damage)} DMG
                              </span>
                            </div>
                          </div>
                          <div className="h-1 bg-[#0d0d0d] overflow-hidden">
                            <div
                              className="h-full transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                background: isTop
                                  ? 'linear-gradient(90deg,var(--color-arc-rare),var(--color-arc-yellow))'
                                  : kills > 0
                                    ? 'var(--color-arc-yellow)'
                                    : 'var(--color-arc-border)',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          )}
        </div>

        {/* ══ WEAPON PERFORMANCE + WORKSHOP (side by side) ══ */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          {/* Weapon performance */}
          {topWeapons.length > 0 && (
            <div className="bg-arc-light-bg border border-[#1e1e1e]">
              <div className="px-4 py-2.5 border-b border-[#141414] flex items-center gap-2">
                <Target className="w-4 h-4 text-[var(--color-arc-epic)]" />
                <h2 className="text-[10px] font-black uppercase tracking-widest">
                  Weapon Performance
                </h2>
              </div>
              <div className="p-4 space-y-2">
                {topWeapons.map(
                  (
                    {
                      key,
                      name,
                      kills,
                      damage,
                      itemId,
                      weaponAssetId,
                      codex,
                      codexLine,
                    },
                    i,
                  ) => {
                    const pct = Math.max(
                      maxWpnKills > 0 ? (kills / maxWpnKills) * 100 : 0,
                      maxWpnDamage > 0 ? (damage / maxWpnDamage) * 100 : 0,
                    );
                    const palette = [
                      'var(--color-arc-epic)',
                      'var(--color-arc-rare)',
                      'var(--color-arc-yellow)',
                      'var(--color-arc-yellow)',
                      'var(--color-arc-danger)',
                      'var(--color-arc-epic)',
                      'var(--color-arc-rare)',
                      'var(--color-arc-yellow)',
                      'var(--color-arc-epic)',
                      'var(--color-arc-rare)',
                    ];
                    const c = palette[i % palette.length];
                    const wpnImg =
                      getItemImg(itemId || name) ||
                      getItemImgWebp(itemId || name) ||
                      assetUrl('/icons/t_ui_generic_weapon.webp');
                    return (
                      <div key={key} className="flex items-center gap-2.5">
                        <span
                          className={`w-5 h-5 flex items-center justify-center shrink-0 text-[9px] font-black ${
                            i === 0
                              ? 'bg-[var(--color-arc-epic)] text-black'
                              : 'bg-[#111] text-[var(--color-arc-muted)] ring-1 ring-white/10'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <img
                          src={wpnImg}
                          alt={name}
                          className="w-8 h-8 object-contain shrink-0 rounded-[3px] bg-black/20 p-0.5 ring-1 ring-white/5"
                          onError={(e) => {
                            e.currentTarget.src = assetUrl(
                              '/icons/T_UI_Generic_Weapon.webp',
                            );
                          }}
                        />
                        <div className="w-28 sm:w-36 shrink-0 min-w-0">
                          <div className="text-[8px] font-black text-white uppercase truncate">
                            {name}
                            {weaponAssetId !== undefined &&
                              weaponAssetId !== null && (
                                <span className="ml-1 text-[6px] text-[var(--color-arc-muted)]">
                                  #{weaponAssetId}
                                </span>
                              )}
                          </div>
                          <div className="text-[7px] font-bold text-[var(--color-arc-muted)] uppercase truncate">
                            {codexLine}
                          </div>
                        </div>
                        <div className="flex-1 min-w-[80px]">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-3 bg-[#0d0d0d] border border-[#141414] overflow-hidden">
                              <div
                                className="h-full transition-all duration-500"
                                style={{
                                  width: `${pct}%`,
                                  background: c,
                                  opacity: i === 0 ? 1 : 0.75,
                                  boxShadow:
                                    i === 0 ? `0 0 10px ${c}77` : 'none',
                                }}
                              />
                            </div>
                            <span className="text-[8px] font-black tabular-nums text-[var(--color-arc-muted)] w-9 text-right">
                              {Math.round(pct)}%
                            </span>
                          </div>
                        </div>
                        <div className="w-[84px] shrink-0 text-right">
                          <div
                            className="text-[10px] font-black tabular-nums"
                            style={{ color: c }}
                          >
                            {fmtNum(kills)} KILLS
                          </div>
                          <div className="text-[8px] font-black tabular-nums text-[var(--color-arc-muted)]">
                            {fmtNum(damage)} DMG
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          )}

          {/* Workshop */}
          {hideoutModules.length > 0 && (
            <div className="bg-arc-light-bg border border-[#1e1e1e]">
              <div className="px-4 py-2.5 border-b border-[#141414] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-arc-yellow" />
                  <h2 className="text-[10px] font-black uppercase tracking-widest">
                    Workshop
                  </h2>
                </div>
                <span className="text-[7px] text-[var(--color-arc-border)] uppercase font-black">
                  {hideoutDone}/{hideoutModules.length} maxed
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[#141414]">
                {hideoutModules.map((mod: any, i: number) => {
                  const name =
                    typeof mod.name === 'string'
                      ? mod.name
                      : mod.name?.en || mod.id || `Module ${i + 1}`;
                  const cur = mod.currentLevel ?? mod.level ?? 0;
                  const max = mod.maxLevel ?? 0;
                  const done = max > 0 && cur >= max;
                  const pct = max > 0 ? Math.round((cur / max) * 100) : 0;
                  return (
                    <div
                      key={i}
                      className={`bg-arc-light-bg flex flex-col items-center p-3 gap-2 ${done ? 'bg-arc-yellow/3' : ''}`}
                    >
                      <span
                        className={`text-[7px] font-black uppercase tracking-wide text-center leading-tight ${done ? 'text-arc-yellow' : 'text-[var(--color-arc-muted)]'}`}
                      >
                        {name}
                      </span>
                      {max > 0 && (
                        <>
                          <div className="w-full h-1 bg-[#0d0d0d]">
                            <div
                              className="h-full"
                              style={{
                                width: `${pct}%`,
                                background: done
                                  ? 'var(--color-arc-yellow)'
                                  : 'var(--color-arc-yellow)',
                              }}
                            />
                          </div>
                          <span
                            className={`text-[7px] font-black ${done ? 'text-arc-yellow' : 'text-[var(--color-arc-muted)]'}`}
                          >
                            {cur}/{max}
                            {done ? ' ✓' : ''}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Traders */}
          <div className="bg-arc-light-bg border border-[#1e1e1e] xl:col-span-2">
            <div className="px-4 py-2.5 border-b border-[#141414] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-arc-yellow" />
                <h2 className="text-[10px] font-black uppercase tracking-widest">
                  Traders
                </h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent('shiesty:navigate', {
                      detail: { tab: 'traders' },
                    }),
                  )
                }
                className="text-[7px] font-black uppercase tracking-widest border px-2 py-1 transition-colors hover:border-arc-yellow"
                style={{
                  borderColor: 'var(--color-arc-border)',
                  color: 'var(--color-arc-yellow)',
                }}
              >
                Open Trader Hub
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-px bg-[#141414]">
              {DASHBOARD_TRADERS.map((trader) => (
                <button
                  key={trader.name}
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent('shiesty:navigate', {
                        detail: { tab: 'traders' },
                      }),
                    )
                  }
                  className="group bg-arc-light-bg min-h-[112px] p-3 text-left transition-colors hover:bg-[#111018]"
                  style={{ borderTop: `2px solid ${trader.color}` }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-12 h-12 shrink-0 overflow-hidden bg-[#080810] border"
                      style={{
                        borderColor: trader.color,
                        boxShadow: `0 0 12px ${trader.color}33`,
                      }}
                    >
                      <img
                        src={trader.image}
                        alt={trader.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-[9px] font-black uppercase tracking-widest leading-tight truncate"
                        style={{ color: trader.color }}
                      >
                        {trader.name}
                      </p>
                      <p className="mt-1 text-[7px] font-black uppercase tracking-wide leading-tight text-[var(--color-arc-muted)]">
                        {trader.role}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* end weapon/workshop 2-col grid */}

        {/* ══ SURVIVAL HEATMAP ══ */}
        <SurvivalHeatmap
          rounds={roundsData}
          title="Survival Rate by Map & Time of Day"
        />

        {/* ══ PAGE SHORTCUTS ══ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
          {[
            {
              label: 'Blueprints',
              tab: 'blueprints',
              color: 'var(--color-arc-yellow)',
              icon: BarChart2,
              desc: 'Drop locations & crafting',
            },
            {
              label: 'Stash',
              tab: 'stash',
              color: 'var(--color-arc-yellow)',
              icon: Package,
              desc: 'Inventory & item values',
            },
            {
              label: 'Projects',
              tab: 'journal',
              color: 'var(--color-arc-epic)',
              icon: Zap,
              desc: 'Quests & expedition phases',
            },
            {
              label: 'Codex',
              tab: 'combat',
              color: 'var(--color-arc-rare)',
              icon: Crosshair,
              desc: 'Combat stats & history',
            },
            {
              label: 'Advanced',
              tab: 'enhancedstats',
              color: 'var(--color-arc-uncommon)',
              icon: TrendingUp,
              desc: 'Deep performance stats',
            },
            {
              label: 'Performance',
              tab: 'performance',
              color: 'var(--color-arc-danger)',
              icon: Activity,
              desc: 'System health & sync',
            },
          ].map(({ label, tab, color, icon: Icon, desc }) => (
            <button
              key={tab}
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('shiesty:navigate', { detail: { tab } }),
                )
              }
              className={`flex items-center gap-3 bg-arc-light-bg border border-arc-border px-4 py-3 hover:border-[#2a2a2a] transition-colors text-left group ${
                tab === 'journal' ? 'project-legendary-glow' : ''
              }`}
            >
              <Icon
                className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform"
                style={{ color }}
              />
              <div>
                <p className="text-[9px] font-black text-white uppercase tracking-wider">
                  {label}
                </p>
                <p className="text-[6px] text-[var(--color-arc-border)] uppercase tracking-wide">
                  {desc}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  ) : null;
}
