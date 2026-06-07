import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LogIn,
  LogOut,
  AlertTriangle,
  Menu,
  X,
  Check,
  Lock,
  Clock,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useEventsSchedule } from '../hooks/useEventsSchedule';
import { AuthAPI } from '../lib/api';
import { assetUrl } from '../lib/assetUrl';
import { SUPPORTED_PLATFORMS } from '../lib/extensionBridge';
import { LiveDataFeedStrip } from './live-data/LiveDataFeedStrip';
import NotificationBell from './NotificationBell';

/* ARC palette */
const YELLOW = 'var(--color-arc-yellow)';
const CYAN = 'var(--color-arc-rare)';
const BLUE = CYAN;
const GREEN = 'var(--color-arc-uncommon)';
const RED = 'var(--color-arc-danger)';
const MUTED = 'var(--color-arc-epic)';
const EPIC = 'var(--color-arc-epic)';
const BG = 'var(--color-arc-dark-background)';
const BORDER = 'var(--color-arc-border)';
const legendary = 'var(--color-arc-legendary)';

/* ── 5-section navigation structure ─────────────────────────────────────── */
type NavSection = {
  key: string;
  label: string;
  icon: string;
  tabs: { key: string; label: string; icon: string }[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    key: 'raider',
    label: 'RAIDER',
    icon: assetUrl('/main/embark.webp'),
    tabs: [
      {
        key: 'profile',
        label: 'PROFILE',
        icon: assetUrl('newarcicon/leaper.png'),
      },
      {
        key: 'settings',
        label: 'SYSTEM',
        icon: assetUrl('/main/settings.webp'),
      },
    ],
  },
  {
    key: 'intel',
    label: 'INTEL',
    icon: assetUrl('/newarcicon/bombardier.png'),
    tabs: [
      {
        key: 'dashboard',
        label: 'DASHBOARD',
        icon: assetUrl('/newarcicon/matriarch256.png'),
      },
      {
        key: 'combat',
        label: 'CODEX',
        icon: assetUrl('/main/lilgun.webp'),
      },
      {
        key: 'xp',
        label: 'XP',
        icon: assetUrl('/icons/t_ui_currency_xp.webp'),
      },
      { key: 'trends', label: 'TRENDS', icon: assetUrl('/dont.webp') },
      {
        key: 'enhancedstats',
        label: 'ADVANCED',
        icon: assetUrl('/newarcicon/bastion_mf.png'),
      },
      {
        key: 'performance',
        label: 'PERFORMANCE',
        icon: assetUrl('/newarcicon/rocketeer_mf'),
      },
      {
        key: 'trials',
        label: 'TRIALS',
        icon: assetUrl('/icon/trial_icon.webp'),
      },
    ],
  },
  {
    key: 'stash',
    label: 'STASH',
    icon: assetUrl('/newarcicon/snitch_mf.png'),
    tabs: [
      { key: 'stash', label: 'STASH', icon: assetUrl('/main/backpack.webp') },
      {
        key: 'items',
        label: 'ITEMS',
        icon: assetUrl('/newarcicon/queen_mf.png'),
      },
      {
        key: 'blueprints',
        label: 'BLUEPRINTS',
        icon: assetUrl('/main/blueprint.webp'),
      },
      {
        key: 'loadout',
        label: 'LOADOUT',
        icon: assetUrl('/newarcicon/rollbot_mf.png'),
      },
    ],
  },
  {
    key: 'world',
    label: 'WORLD',
    icon: assetUrl('/newarcicon/shredder.png'),
    tabs: [
      {
        key: 'mapviewer',
        label: 'MAP',
        icon: assetUrl('/newarcicon/tick_mf.png'),
      },
      {
        key: 'maps',
        label: 'RAIDS',
        icon: assetUrl('/newarcicon/wasp_mf.png'),
      },
      {
        key: 'eventtimers',
        label: 'EVENTS',
        icon: assetUrl('/newarcicon/turret_mf.png'),
      },
      {
        key: 'journal',
        label: 'PROJECTS',
        icon: assetUrl('/main/projects.webp'),
      },
      {
        key: 'workshop',
        label: 'WORKSHOP',
        icon: assetUrl('/main/workbench.webp'),
      },
      {
        key: 'skilltree',
        label: 'SKILLS',
        icon: assetUrl('/icons/skill_tree_icon.webp'),
      },
      {
        key: 'traders',
        label: 'TRADERS',
        icon: assetUrl('/newarcicon/hornet_mf.png'),
      },
    ],
  },
  {
    key: 'market',
    label: 'MARKET',
    icon: assetUrl('/newarcicon/sentinel_mp.png'),
    tabs: [
      {
        key: 'marketplace',
        label: 'BARTER',
        icon: assetUrl('/newarcicon/fireball_new256.png'),
      },
    ],
  },
];

/* ── XP progress bar ──────────────────────────────────────────────────────── */
function XpProgressBar({
  percent,
  level,
  xp,
  nextXp,
}: {
  percent: number;
  level: number;
  xp: number;
  nextXp: number;
}) {
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div
        className="flex items-center justify-center w-6 h-6 rounded shrink-0 font-black text-sm"
        style={{
          background: `${YELLOW}18`,
          border: `1px solid ${YELLOW}50`,
          color: YELLOW,
        }}
      >
        {level}
      </div>
      <div className="flex-1">
        <div
          className="flex justify-between mb-0.5 font-black"
          style={{ color: MUTED, fontSize: 9 }}
        >
          <span>XP</span>
          <span style={{ color: YELLOW, fontSize: 9 }}>
            {xp.toLocaleString()} / {nextXp.toLocaleString()}
          </span>
        </div>
        <div
          className="h-1 rounded-sm overflow-hidden"
          style={{ background: BORDER }}
        >
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${percent}%`,
              background: `linear-gradient(90deg, ${YELLOW}, ${CYAN})`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function pickNumber(...values: any[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function fmtCompact(value: number) {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString();
}

function formatCountdown(ms: number | null | undefined) {
  if (!ms || ms <= 0) return 'expired';
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function platformLabel(platform: string) {
  return (
    SUPPORTED_PLATFORMS.find((entry) => entry.id === platform)?.name ||
    platform
  );
}

function HeaderStatChip({
  icon,
  label,
  value,
  color = YELLOW,
  title,
}: {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
  title?: string;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 border bg-black/20"
      style={{ borderColor: `${color}40` }}
      title={title ?? label}
    >
      <img
        src={icon}
        alt=""
        className="w-4 h-4 object-contain shrink-0"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
      <span
        className="text-[8px] font-black uppercase tracking-widest hidden xl:inline"
        style={{ color: MUTED }}
      >
        {label}
      </span>
      <span className="text-[12px] font-black tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function SurvivalRateChip({ rate }: { rate: number }) {
  const clamped = Math.max(0, Math.min(100, rate));
  const color = clamped >= 50 ? GREEN : clamped >= 35 ? YELLOW : RED;
  return (
    <div className="flex items-center gap-1.5" title="Survival rate">
      <div
        className="relative w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: `conic-gradient(${color} ${clamped * 3.6}deg, #141414 0deg)`,
        }}
      >
        <div
          className="absolute inset-[3px] rounded-full"
          style={{ background: BG, border: `1px solid ${BORDER}` }}
        />
        <span
          className="relative z-10 text-[9px] font-black tabular-nums"
          style={{ color }}
        >
          {Math.round(clamped)}
        </span>
      </div>
      <span
        className="text-[8px] font-black uppercase tracking-widest hidden 2xl:inline"
        style={{ color: MUTED }}
      >
        SR
      </span>
    </div>
  );
}

/* ── main Header ──────────────────────────────────────────────────────────── */
export default function Header({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (t: string) => void;
}) {
  const {
    profile,
    playerStats,
    raiderHub,
    stash,
    expeditionStatus,
    authState,
    startPlatformAuth,
    tokenExpiresAt,
    reauthRequired,
    reauthCountdownMs,
    clearAuthState,
  } = usePlayer();

  // Which section owns the active tab?
  const activeSection =
    NAV_SECTIONS.find((s) => s.tabs.some((t) => t.key === activeTab)) ??
    NAV_SECTIONS[1]; // default: INTEL

  const [openSectionKey, setOpenSectionKey] = useState<string>(
    activeSection.key,
  );
  const displaySection =
    NAV_SECTIONS.find((s) => s.key === openSectionKey) ?? activeSection;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expiredBanner, setExpiredBanner] = useState(false);
  const [embarkAuthOpen, setEmbarkAuthOpen] = useState(false);
  const [authPlatform, setAuthPlatform] = useState('xbox');
  const liveDataFeed = useEventsSchedule();

  useEffect(() => {
    setOpenSectionKey(activeSection.key);
  }, [activeSection.key]);

  // Show expired banner if redirected with ?expired=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === '1') {
      setExpiredBanner(true);
      // Clean the param from the URL without a reload
      const clean = window.location.pathname;
      window.history.replaceState({}, '', clean);
    }
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeTab]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogin = () => {
    window.location.href = '/api/auth/discord';
  };
  const handleLogout = () => {
    clearAuthState();
    AuthAPI.logout();
  };

  const stats = playerStats;
  const hasStats = !!stats;
  const liveCurr = (raiderHub as any)?.currencies || {};
  const playerCurr = stats?.currencies || {};
  const dispCredits =
    liveCurr.credits ??
    liveCurr.creds ??
    playerCurr.credits ??
    stats?.credits ??
    0;
  const dispTokens =
    liveCurr.tokens ??
    liveCurr.raiders_tokens ??
    playerCurr.tokens ??
    stats?.tokens ??
    0;
  const dispCoins = liveCurr.coins ?? playerCurr.coins ?? stats?.coins ?? 0;
  const totalCurrency =
    pickNumber(dispCredits) + pickNumber(dispTokens) + pickNumber(dispCoins);
  const stashValue = pickNumber(
    (raiderHub as any)?.stashValue,
    (raiderHub as any)?.liveStashValue,
    stats?.liveStashValue,
    stats?.stashValue,
    (stash as any)?.stashValue,
    (stash as any)?.totalValue,
    (stash as any)?.value,
  );
  const level = pickNumber(stats?.gameLevel, stats?.level);
  const xp = pickNumber(stats?.gameXp, stats?.xp, stats?.totalXp);
  const xpNext = pickNumber(stats?.xpForNextLevel, 1000);
  const xpPercent = pickNumber(
    stats?.xpProgressPercent,
    xpNext > 0 ? (xp / xpNext) * 100 : 0,
  );
  const totalRaids = pickNumber(
    (stats as any)?.totalRaids,
    (raiderHub as any)?.combatSummary?.totalRaids,
  );
  const totalExtracted = pickNumber(
    (stats as any)?.successfulExtractions,
    (raiderHub as any)?.combatSummary?.successfulExtractions,
    (raiderHub as any)?.combatSummary?.totalExtracted,
  );
  const rawSurvivalRate = pickNumber(
    stats?.survivalRate,
    (raiderHub as any)?.combatSummary?.survivalRate,
    totalRaids > 0 ? (totalExtracted / totalRaids) * 100 : 0,
  );
  const survivalRate =
    rawSurvivalRate > 0 && rawSurvivalRate <= 1
      ? rawSurvivalRate * 100
      : rawSurvivalRate;

  const embarkLinked =
    !!(profile as any)?.embarkId ||
    !!(profile as any)?.embarkUsername ||
    !!(stats as any)?.embarkId ||
    !!(stats as any)?.embarkUsername;
  const embarkUsername =
    (stats as any)?.embarkUsername ||
    (stats as any)?.displayName ||
    (profile as any)?.embarkUsername ||
    null;
  const embarkDisplayName = embarkUsername;
  const authExpired = reauthRequired || authState === 'needs_token';
  const authTimer = tokenExpiresAt ? formatCountdown(reauthCountdownMs) : null;
  const authPlatformName = platformLabel(authPlatform);

  return (
    <>
      {expiredBanner && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-2 text-xs font-semibold"
          style={{
            background: '#7c2d12',
            color: '#fed7aa',
            borderBottom: '1px solid #c2410c',
          }}
        >
          <span>
            Your session expired after 24 hours. Please sign in again.
          </span>
          <button
            onClick={() => setExpiredBanner(false)}
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <header
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{ background: `${BG}f8`, borderBottom: `1px solid ${BORDER}` }}
      >
        {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 md:px-5 py-2 flex-nowrap">
          {/* Logo */}
          <div className="flex items-center gap-2 max-w-[50vw]">
            <img
              src={assetUrl('/main/outfitscrappy.webp')}
              alt="Scrappy"
              className="w-8 h-8 object-contain shrink-0"
            />
            <span
              className="font-black uppercase tracking-[0.12em] text-sm md:text-base hidden sm:block"
              style={{ color: 'var(--color-arc-white)' }}
            >
              SHiESTY <span style={{ color: YELLOW }}>RAiDERS</span>
            </span>
            <img
              src={assetUrl('/dont.webp')}
              alt="Don't Shoot"
              className="h-6 w-auto object-contain hidden sm:block"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 flex-nowrap">
            {/* Hamburger menu button - mobile only */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="shrink-0 md:hidden flex items-center justify-center w-11 h-11"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" style={{ color: YELLOW }} />
              ) : (
                <Menu className="w-6 h-6" style={{ color: MUTED }} />
              )}
            </button>

            {profile ? (
              <div className="flex items-center gap-3">
                {/* Currency + XP — desktop only */}
                {hasStats && (
                  <div
                    className="hidden lg:flex items-center gap-3 pr-3"
                    style={{ borderRight: `1px solid ${BORDER}` }}
                  >
                    <HeaderStatChip
                      icon={assetUrl(
                        '/icons/T_UI_Icon_Expedition_Badge_3.webp',
                      )}
                      label="Exp"
                      value={
                        expeditionStatus
                          ? `${expeditionStatus.currentTier || expeditionStatus.completedExpeditions || 0}`
                          : '0'
                      }
                      color={CYAN}
                      title={
                        expeditionStatus
                          ? `Season ${expeditionStatus.activeSeason} · Tier ${expeditionStatus.currentTier}`
                          : 'Expedition status'
                      }
                    />
                    <HeaderStatChip
                      icon={assetUrl('/icons/t_ui_currencywallet.webp')}
                      label="Wallet"
                      value={fmtCompact(totalCurrency + stashValue)}
                      color={YELLOW}
                      title={`Wallet total ${fmtCompact(totalCurrency)} · stash value ${fmtCompact(stashValue)}`}
                    />
                    <HeaderStatChip
                      icon={assetUrl('/icons/t_ui_currency_xp.webp')}
                      label="XP"
                      value={fmtCompact(xp)}
                      color={CYAN}
                      title={`Level ${level} · ${xp.toLocaleString()} / ${xpNext.toLocaleString()} XP`}
                    />
                    <SurvivalRateChip rate={survivalRate} />
                    {/* Cred */}
                    <div
                      className="flex items-center gap-1"
                      title="Stash Value"
                    >
                      <img
                        src={assetUrl('/main/coins3d.png')}
                        alt="Cred"
                        className="w-4 h-4 object-contain"
                      />
                      <span
                        className="text-sm font-black"
                        style={{ color: GREEN }}
                      >
                        {Number(dispCredits).toLocaleString()}
                      </span>
                    </div>
                    {/* Raider Tokens */}
                    <div
                      className="flex items-center gap-1"
                      title="Raider Tokens"
                    >
                      <img
                        src={assetUrl('/main/raider_tokens_icon.webp')}
                        alt="Tokens"
                        className="w-4 h-4 object-contain"
                      />
                      <span
                        className="text-sm font-black"
                        style={{ color: YELLOW }}
                      >
                        {Number(dispTokens).toLocaleString()}
                      </span>
                    </div>
                    {/* Coins */}
                    <div className="flex items-center gap-1" title="Coins">
                      <img
                        src={assetUrl('/main/cred3d.png')}
                        alt="Coins"
                        className="w-4 h-4 object-contain"
                      />
                      <span
                        className="text-sm font-black"
                        style={{ color: BLUE }}
                      >
                        {Number(dispCoins).toLocaleString()}
                      </span>
                    </div>
                    <XpProgressBar
                      percent={xpPercent || 0}
                      level={Math.min(level || 1, 75)}
                      xp={xp || 0}
                      nextXp={xpNext || 1000}
                    />
                  </div>
                )}

                {/* Notification bell */}
                <NotificationBell />

                <button
                  type="button"
                  onClick={() => setEmbarkAuthOpen(true)}
                  className="hidden md:flex items-center gap-2 px-2.5 py-1.5 border bg-black/25 text-left transition-colors hover:bg-white/[0.04]"
                  style={{
                    borderColor:
                      embarkLinked && !authExpired
                        ? `${GREEN}55`
                        : `${YELLOW}55`,
                  }}
                  title={
                    embarkLinked && !authExpired
                      ? `Connected via ${authPlatformName}${authTimer ? ` · expires in ${authTimer}` : ''}`
                      : 'Link your Embark ID'
                  }
                >
                  <img
                    src={assetUrl('/main/embark.webp')}
                    alt=""
                    className="w-5 h-5 object-contain shrink-0"
                  />
                  <span className="flex flex-col leading-tight">
                    <span
                      className="font-black tracking-wide"
                      style={{
                        color: embarkLinked && !authExpired ? GREEN : YELLOW,
                        fontSize: 10,
                      }}
                    >
                      {embarkDisplayName}
                    </span>
                    <span
                      className="font-bold"
                      style={{ color: MUTED, fontSize: 9 }}
                    >
                      {embarkLinked && !authExpired
                        ? `Connected via ${authPlatformName.toLowerCase()}`
                        : 'Auth expired'}
                    </span>
                    {embarkLinked && !authExpired && authTimer && (
                      <span
                        className="font-bold tabular-nums"
                        style={{ color: CYAN, fontSize: 9 }}
                      >
                        Expires in {authTimer}
                      </span>
                    )}
                  </span>
                </button>

                {/* Avatar + name */}
                <div className="flex items-center gap-2">
                  <div className="text-right hidden sm:block">
                    <div
                      className="flex items-center gap-1.5 font-black uppercase tracking-widest leading-tight"
                      style={{ color: 'var(--color-arc-epic)', fontSize: 10 }}
                    >
                      <span style={{ color: MUTED, fontSize: 9 }}>
                        DISCORD:
                      </span>
                      <span
                        style={{
                          color: 'var(--color-arc-epic)',
                          fontSize: 10,
                        }}
                      >
                        {profile.username || 'OPERATIVE'}
                      </span>
                    </div>
                  </div>
                  <img
                    src={
                      profile.avatar
                        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
                        : ''
                    }
                    alt="Avatar"
                    className="w-7 h-7 rounded border object-cover"
                    style={{ borderColor: BORDER }}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        'none';
                    }}
                  />
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded transition-colors"
                    style={{ color: MUTED }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = RED;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = MUTED;
                    }}
                    title="Disconnect"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* Auth error notice */}
                {new URLSearchParams(window.location.search).get('error') ===
                  'auth_failed' && (
                  <span
                    className="hidden sm:flex items-center gap-1 font-black uppercase tracking-wider"
                    style={{ color: RED, fontSize: 10 }}
                  >
                    <AlertTriangle className="w-3 h-3" /> Login Failed
                  </span>
                )}
                {/* Discord Logo - Clickable */}
                <a
                  href="https://discord.gg/MugYT7gKY"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded transition-opacity hover:opacity-80 hover:bg-white/5"
                  title="Join our Discord"
                >
                  <img
                    src={assetUrl('/main/discord.svg')}
                    alt="Discord"
                    className="w-5 h-5 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        assetUrl('/main/discord.svg');
                    }}
                  />
                </a>
                <button
                  onClick={handleLogin}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-black uppercase tracking-widest border transition-colors"
                  style={{
                    background: '#5865F218',
                    borderColor: '#5865F250',
                    color: '#5865F2',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      '#5865F230';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      '#5865F218';
                  }}
                >
                  <span className="hidden sm:inline">LOG IN</span>
                  <LogIn className="w-3.5 h-3.5 sm:hidden" />
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setOpenSectionKey('world');
            setActiveTab('eventtimers');
          }}
          className="w-full border-t px-4 py-2 text-left transition-colors hover:bg-white/[0.03]"
          style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.18)' }}
        >
          <LiveDataFeedStrip
            events={liveDataFeed.events}
            fetchedAt={liveDataFeed.fetchedAt}
            upstreamOk={liveDataFeed.upstreamOk}
            polledEventCount={liveDataFeed.events.length}
            loading={liveDataFeed.loading}
            className="mx-auto max-w-7xl"
          />
        </button>

        {embarkAuthOpen &&
          createPortal(
            <div
              className="fixed inset-0 z-[10000] flex items-center justify-center px-3"
              style={{ background: 'rgba(0,0,0,0.72)' }}
              onClick={() => setEmbarkAuthOpen(false)}
            >
              <div
                className="w-full max-w-sm border p-4 shadow-2xl max-h-[82vh] overflow-y-auto"
                style={{
                  background: BG,
                  borderColor: BORDER,
                  color: 'var(--color-arc-epic)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center"
                      style={{ background: `${GREEN}18`, color: GREEN }}
                    >
                      {embarkLinked && !authExpired ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-base font-black leading-none">
                        Link Your Game Account
                      </h2>
                      <p className="pt-1.5 text-xs" style={{ color: MUTED }}>
                        You're about to connect your Arc Raiders account to
                        SHiESTY RAiDERS using {authPlatformName} for
                        authentication.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmbarkAuthOpen(false)}
                    className="p-1 opacity-70 hover:opacity-100"
                    aria-label="Close Embark auth"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setAuthPlatform('xbox')}
                  className="mt-3 flex w-full items-center gap-2.5 border p-2.5 text-left transition-colors hover:bg-white/[0.04]"
                  style={{
                    borderColor:
                      embarkLinked && !authExpired
                        ? `${GREEN}45`
                        : `${YELLOW}45`,
                    background: 'rgba(0,0,0,0.22)',
                  }}
                >
                  <img
                    src={assetUrl('/toxic.webp')}
                    alt=""
                    className="h-7 w-7 object-contain"
                  />
                  <span className="flex flex-col leading-tight">
                    <span className="font-black" style={{ color: GREEN }}>
                      {embarkDisplayName}
                    </span>
                    <span className="text-xs" style={{ color: MUTED }}>
                      Connected via {authPlatformName.toLowerCase()}
                    </span>
                    {embarkLinked && !authExpired && authTimer && (
                      <span
                        className="text-xs font-bold tabular-nums"
                        style={{ color: EPIC }}
                      >
                        Expires in {authTimer}
                      </span>
                    )}
                    {authExpired && (
                      <span
                        className="text-xs font-bold"
                        style={{ color: RED }}
                      >
                        Connection Expired
                      </span>
                    )}
                  </span>
                </button>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {SUPPORTED_PLATFORMS.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => setAuthPlatform(platform.id)}
                      className="px-3 py-1.5 text-xs font-black transition-colors"
                      style={{
                        background:
                          authPlatform === platform.id
                            ? platform.color
                            : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${
                          authPlatform === platform.id ? platform.color : BORDER
                        }`,
                        color:
                          platform.id === 'epic' && authPlatform === 'epic'
                            ? '#111'
                            : '#fff',
                      }}
                    >
                      {platform.name}
                    </button>
                  ))}
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <p className="mb-2 text-xs font-black">
                      What SHiESTY RAiDERS will access:
                    </p>
                    <ul className="space-y-1.5">
                      {[
                        'Your Arc Raiders profile and username',
                        'Your hideout levels and quest completion',
                        'Your stash inventory data',
                        'Your expedition history',
                      ].map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 text-xs"
                        >
                          <Check
                            className="mt-0.5 h-3.5 w-3.5 shrink-0"
                            style={{ color: RED }}
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div
                    className="space-y-2 border p-3 text-sm"
                    style={{
                      borderColor: `${CYAN}30`,
                      background: `${CYAN}08`,
                      color: MUTED,
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <Lock
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: CYAN }}
                      />
                      <p>
                        SHiESTY RAiDERS never receives your Xbox login
                        credentials. Xbox is only used to verify your identity
                        with ARC Raiders.
                      </p>
                    </div>
                    <p className="pl-6">
                      We only read your Arc Raiders game data. We never modify
                      your game account.
                    </p>
                    <div className="flex items-start gap-2">
                      <Clock
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: CYAN }}
                      />
                      <p>
                        Your connection is valid for 24 hours. You'll need to
                        reconnect after that to continue syncing.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    startPlatformAuth(authPlatform).finally(() =>
                      setEmbarkAuthOpen(false),
                    );
                  }}
                  className="mt-5 w-full px-4 py-2 text-sm font-black uppercase tracking-widest transition-colors"
                  style={{
                    background: GREEN,
                    color: '#061006',
                  }}
                >
                  Continue
                </button>
              </div>
            </div>,
            document.body,
          )}

        {/* ── MOBILE MENU OVERLAY ──────────────────────────────────────────────── */}
        {mobileMenuOpen &&
          createPortal(
            <div
              className="fixed inset-0 z-[9999] md:hidden"
              style={{ background: `${BG}f8` }}
              onClick={() => setMobileMenuOpen(false)}
            >
              <div
                className="h-full overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Mobile menu header */}
                <div
                  className="flex items-center justify-between p-4 border-b"
                  style={{ borderColor: BORDER }}
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={assetUrl('/main/shiesty.png')}
                      alt="Scrappy"
                      className="w-8 h-8 object-contain"
                    />
                    <span
                      className="font-black uppercase tracking-[0.12em]"
                      style={{ color: 'var(--color-arc-white)' }}
                    >
                      SHiESTY <span style={{ color: MUTED }}>SHiESTY</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center w-11 h-11"
                    aria-label="Close menu"
                  >
                    <X className="w-6 h-6" style={{ color: MUTED }} />
                  </button>
                </div>

                {/* Mobile navigation sections */}
                <div className="p-4 space-y-4">
                  {NAV_SECTIONS.map((section) => (
                    <div key={section.key}>
                      <button
                        onClick={() => {
                          setOpenSectionKey((current) =>
                            current === section.key ? '' : section.key,
                          );
                        }}
                        className={`mobile-nav-section-btn${
                          section.key === activeSection.key ? ' active' : ''
                        }`}
                        style={{
                          border:
                            section.key === activeSection.key
                              ? `1px solid ${YELLOW}40`
                              : '1px solid transparent',
                        }}
                        aria-expanded={section.key === openSectionKey}
                      >
                        <img
                          src={section.icon}
                          alt={section.label}
                          className="mobile-nav-section-img"
                        />
                        <span className="mobile-nav-section-label">
                          {section.label}
                        </span>
                      </button>

                      {/* Sub-tabs for active section */}
                      {section.key === openSectionKey && (
                        <div className="ml-4 mt-2 space-y-1">
                          {section.tabs.map((tab) => (
                            <button
                              key={tab.key}
                              onClick={() => {
                                setOpenSectionKey(section.key);
                                setActiveTab(tab.key);
                                setMobileMenuOpen(false);
                              }}
                              className={`mobile-nav-sub-btn${
                                tab.key === activeTab ? ' active' : ''
                              }`}
                              style={{
                                background:
                                  tab.key === activeTab
                                    ? `${legendary}15`
                                    : 'transparent',
                              }}
                            >
                              <img
                                src={tab.icon}
                                alt={tab.label}
                                className="mobile-nav-sub-icon nav-sub-icon"
                              />
                              <span className="mobile-nav-sub-label">
                                {tab.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>,
            document.body,
          )}

        {/* ── SECTION NAV — 5 main sections (hidden on mobile) ─────────────── */}
        <div
          className="hidden md:flex items-end px-2 overflow-x-auto no-scrollbar"
          style={{ background: `${BG}ee`, borderBottom: `1px solid ${BORDER}` }}
        >
          {NAV_SECTIONS.map((section) => {
            const isActive = section.key === activeSection.key;
            return (
              <button
                key={section.key}
                className={`nav-section-btn${isActive ? ' active' : ''}`}
                onClick={() => {
                  setOpenSectionKey(section.key);
                  setActiveTab(section.tabs[0].key);
                }}
              >
                <img
                  src={section.icon}
                  alt={section.label}
                  className="nav-section-img"
                />
                {section.label}
              </button>
            );
          })}
        </div>

        {/* ── SUB-TAB BAR — pages within the hovered/active section (hidden on mobile) ────────── */}
        <div className="nav-sub-bar no-scrollbar hidden md:flex">
          {displaySection.tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                className={`nav-sub-btn${isActive ? ' active' : ''}`}
                onClick={() => {
                  setOpenSectionKey(displaySection.key);
                  setActiveTab(tab.key);
                }}
              >
                <img src={tab.icon} alt={tab.label} className="nav-sub-icon" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>
    </>
  );
}
