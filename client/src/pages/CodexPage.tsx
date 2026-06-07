import { useEffect, useMemo, useState } from 'react';
import {
  Skull,
  Package,
  Activity,
  TrendingUp,
  BarChart3,
  Shield,
  Crosshair,
  Award,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { usePlayer } from '../context/PlayerContext';
import { MetaForgeAPI } from '../lib/api';
import arctrackerLabels from '../data/arctracker-en.json';
import { assetUrl } from '../lib/assetUrl';
import { getArcBotIcon } from '../lib/arcBotIcon';
import type { MfArc } from '../types/arcApi';

const EMBARK_STAT_LABELS = (arctrackerLabels as any)?.RaidHistoryPage
  ?.embarkStats ?? {
  avgProfitPerExtraction: 'Avg Profit/Extraction',
  valueExtracted: 'Value Extracted',
  valueBroughtIn: 'Value Brought In',
  netValue: 'Net Value',
};

const ICONS = {
  skull: assetUrl('/icons/gunicon.webp'),
  activity: assetUrl('/icons/gear.webp'),
  shield: assetUrl('/icons/gear.webp'),
  crosshair: assetUrl('/icons/gunicon.webp'),
  award: assetUrl('/icons/star.webp'),
};

interface ArcBreakdownEntry {
  name: string;
  kills: number;
  icon: string | null;
  id: string | null;
  percentage?: string;
}

function StatTile({
  label,
  value,
  subvalue,
  color = '#fff',
}: {
  label: string;
  value: string | number;
  subvalue?: string | number;
  color?: string;
}) {
  return (
    <div className="bg-arc-light-bg border border-arc-border p-3 hover:border-arc-border transition-colors">
      <p className="text-[11px] text-[#8a7a9a] font-black uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-2xl font-black truncate" style={{ color }}>
        {value}
      </p>
      {subvalue && <p className="text-[11px] text-white mt-0.5">{subvalue}</p>}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  label,
  color,
}: {
  icon: any;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5" style={{ color }} />
      <h2 className="text-[12px] font-black text-white uppercase tracking-widest">
        {label}
      </h2>
      <div className="flex-1 h-px bg-[var(--color-arc-border)] ml-2" />
    </div>
  );
}

export default function CodexPage() {
  const {
    rounds,
    combatBreakdown,
    stats,
    enemyKills,
    mapPerformance,
    weaponKills,
    playerStats,
    stash,
    loadout,
    hideout,
    quests,
    blueprints,
  } = usePlayer();

  const roundsData = useMemo(
    () => (Array.isArray(rounds) ? rounds : []),
    [rounds],
  );

  // Aggregate from rounds[] as fallback
  const agg = useMemo(() => {
    return roundsData.reduce(
      (a: any, r: any) => {
        const arcKills = Number(r.arcKills ?? 0);
        const playerKills = Number(r.playerKills ?? 0);
        a.netProfit += Number(r.netValue ?? 0);
        a.totalScore += Number(r.score ?? 0);
        a.playerKills += playerKills;
        a.arcKills += arcKills;
        a.kills += arcKills + playerKills;
        a.playerDowns += Number(r.playerDowns ?? 0);
        a.damage += Number(r.damage ?? 0);
        a.durationMs += Number(r.durationMs ?? 0);
        a.valueBroughtIn += Number(r.valueBroughtIn ?? 0);
        a.valueExtracted += Number(r.valueExtracted ?? 0);
        const s = (r.outcome || r.status || '').toLowerCase();
        if (
          s === 'failed' ||
          s === 'died' ||
          s.includes('fail') ||
          s.includes('died')
        )
          a.deaths += 1;
        if (s === 'extracted' || s.includes('extract')) a.extracted += 1;
        return a;
      },
      {
        netProfit: 0,
        totalScore: 0,
        playerKills: 0,
        arcKills: 0,
        kills: 0,
        playerDowns: 0,
        damage: 0,
        durationMs: 0,
        valueBroughtIn: 0,
        valueExtracted: 0,
        deaths: 0,
        extracted: 0,
      },
    );
  }, [roundsData]);

  const combatDetailed =
    combatBreakdown?.combat_detailed || stats?.combat_detailed || {};
  const performance =
    combatBreakdown?.performance_analytics ||
    stats?.performance_analytics ||
    {};
  const scavenging =
    combatBreakdown?.scavenging_and_world ||
    stats?.scavenging_and_world ||
    combatBreakdown?.scavenging ||
    {};
  const mapRows = Array.isArray(mapPerformance?.maps)
    ? mapPerformance.maps
    : [];
  const totalFromMaps = mapRows.reduce(
    (sum: number, m: any) => sum + Number(m.raids ?? 0),
    0,
  );
  const extractedFromMaps = mapRows.reduce(
    (sum: number, m: any) => sum + Number(m.extracted ?? 0),
    0,
  );
  const durationFromMaps = mapRows.reduce(
    (sum: number, m: any) => sum + Number(m.totalDurationMs ?? 0),
    0,
  );
  const profitFromMaps = mapRows.reduce(
    (sum: number, m: any) => sum + Number(m.totalNetValue ?? 0),
    0,
  );
  const total =
    Number(stats?.totalRaids ?? 0) ||
    Number(stats?.performance_analytics?.total_rounds ?? 0) ||
    roundsData.length ||
    Number(performance?.total_rounds ?? 0) ||
    totalFromMaps;
  const extractedTotal =
    Number(stats?.successfulExtractions ?? 0) ||
    Number(stats?.performance_analytics?.successful_raids ?? 0) ||
    agg.extracted ||
    extractedFromMaps;
  const diedTotal =
    Number(combatBreakdown?.pvp?.deaths ?? 0) ||
    agg.deaths ||
    Math.max(0, total - extractedTotal);
  const netProfitTotal =
    Number(stats?.netProfit ?? 0) ||
    Number(stats?.wallet_and_economy?.net_profit_career ?? 0) ||
    agg.netProfit ||
    profitFromMaps;

  // ── PvP / core stats with summary fallbacks ──
  const pvpPlayerKills =
    Number(stats?.playerKills ?? 0) ||
    Number(combatDetailed?.player_kills ?? 0) ||
    agg.playerKills;
  const pvpDamageDealt =
    Number(stats?.totalDamage ?? 0) ||
    Number(combatDetailed?.damage_dealt_total ?? 0) ||
    agg.damage;

  // ── PvP ──
  const playerKills = pvpPlayerKills;
  const playerDowns =
    Number(combatDetailed?.player_downs ?? 0) || agg.playerDowns;
  const playerDeaths = diedTotal;
  const kdRatio = (() => {
    if (stats?.kdRatio) return Number(stats.kdRatio).toFixed(2);
    if (performance?.kd_ratio) return Number(performance.kd_ratio).toFixed(2);
    if (combatBreakdown?.pvp?.kdRatio)
      return Number(combatBreakdown.pvp.kdRatio).toFixed(2);
    if (playerDeaths > 0) return (pvpPlayerKills / playerDeaths).toFixed(2);
    return pvpPlayerKills > 0 ? Number(pvpPlayerKills).toFixed(2) : '0.00';
  })();
  const damageDealt = pvpDamageDealt;

  // ── PvE / Unit breakdown ──
  // Prefer the rich arcBreakdown (with icons) from the server, fall back to
  // the legacy { name: count } map.
  const enemyRows = Array.isArray(enemyKills?.enemies)
    ? enemyKills.enemies
    : [];
  const arcBreakdown: ArcBreakdownEntry[] = enemyRows.map((enemy: any) => ({
    name: String(enemy.name || enemy.targetId || 'Unknown'),
    kills: Number(enemy.count ?? 0),
    icon: null,
    id: enemy.targetId != null ? String(enemy.targetId) : null,
  }));
  const unitBreakdown: Record<string, number> =
    combatDetailed?.unit_breakdown || combatBreakdown?.pve?.arcDestroyed || {};

  const arcList: ArcBreakdownEntry[] =
    arcBreakdown.length > 0
      ? arcBreakdown
      : Object.entries(unitBreakdown).map(([name, count]) => ({
          name,
          kills: Number(count) || 0,
          icon: getArcBotIcon(name),
          id: null,
        }));

  const [mfArcs, setMfArcs] = useState<MfArc[]>([]);
  useEffect(() => {
    let cancelled = false;
    MetaForgeAPI.arcs()
      .then((data: MfArc[]) => {
        if (!cancelled && Array.isArray(data)) setMfArcs(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const arcByName = useMemo(() => {
    const m = new Map<string, MfArc>();
    for (const a of mfArcs) {
      if (a.name) m.set(a.name.toLowerCase(), a);
      if (a.id) m.set(String(a.id).toLowerCase(), a);
    }
    return m;
  }, [mfArcs]);

  const enrichedArcList: ArcBreakdownEntry[] = arcList
    .map((a) => {
      const meta = arcByName.get(a.name.toLowerCase());
      return {
        ...a,
        icon: a.icon || getArcBotIcon(meta?.name || a.name),
      };
    })
    .filter((a) => a.kills > 0)
    .sort((a, b) => b.kills - a.kills);

  // Calculate ARC unit kill percentages
  const totalArcKills =
    enrichedArcList.reduce((sum, a) => sum + a.kills, 0) || 1;
  const arcWithPercentages = enrichedArcList.map((a) => ({
    ...a,
    percentage: ((a.kills / totalArcKills) * 100).toFixed(1),
  }));

  const arcKillsTotal =
    (enemyRows.length > 0
      ? enemyRows.reduce(
          (sum: number, enemy: any) => sum + Number(enemy.count ?? 0),
          0,
        )
      : 0) ||
    Number(stats?.arcKills ?? 0) ||
    Number(combatDetailed?.arc_kills_total ?? 0) ||
    Object.values(unitBreakdown).reduce(
      (s: number, v: any) => s + (Number(v) || 0),
      0,
    ) ||
    agg.arcKills;
  const topWeaponName = (() => {
    const fromApi = Array.isArray(weaponKills?.weapons)
      ? [...weaponKills.weapons].sort(
          (a: any, b: any) => Number(b.count ?? 0) - Number(a.count ?? 0),
        )
      : [];
    if (fromApi[0]?.name) return fromApi[0].name;
    const wk = Array.isArray((stats as any)?.topWeapons)
      ? (stats as any).topWeapons
      : Array.isArray((combatBreakdown as any)?.topWeapons)
        ? (combatBreakdown as any).topWeapons
        : [];
    return wk[0]?.name || wk[0]?.weaponName || '—';
  })();

  // ── Scavenging ──
  const containersLooted = Number(
    scavenging?.containers_looted ??
      stats?.totalContainersLooted ??
      stats?.containersLooted ??
      (combatBreakdown as any)?.totalContainersLooted ??
      (combatBreakdown as any)?.containersLooted ??
      0,
  );
  const itemsExtracted = scavenging?.items_extracted_count ?? 0;
  const keysInStash = Array.isArray(stash?.items)
    ? stash.items.filter((it: any) =>
        /key/i.test(
          String(
            it?.type || it?.itemType || it?.item_type || it?.category || '',
          ),
        ),
      ).length
    : 0;
  const avgProfitPerRaid = total > 0 ? Math.round(netProfitTotal / total) : 0;
  const totalValueExtracted = agg.valueExtracted;
  const totalValueBroughtIn = agg.valueBroughtIn;

  // ── Performance ──
  const effectiveExtracted =
    extractedTotal || agg.extracted || extractedFromMaps;
  const effectiveTotal = total || totalFromMaps;
  const survivalRateRaw =
    stats?.survivalRate ??
    performance?.survival_rate ??
    performance?.extraction_rate ??
    (combatBreakdown as any)?.extraction_rate ??
    (combatBreakdown as any)?.survival_rate;
  const survivalRate =
    survivalRateRaw != null
      ? survivalRateRaw > 1
        ? Number(survivalRateRaw).toFixed(1)
        : (Number(survivalRateRaw) * 100).toFixed(1)
      : effectiveTotal > 0
        ? ((effectiveExtracted / effectiveTotal) * 100).toFixed(1)
        : '0.0';
  const totalScore =
    agg.totalScore ||
    Number(performance?.score_total ?? performance?.total_score ?? 0);
  const avgScore = total > 0 ? Math.round(totalScore / total) : 0;
  const avgDamage = performance?.avg_damage_per_round
    ? Number(performance.avg_damage_per_round)
    : total > 0
      ? Math.round(damageDealt / total)
      : 0;
  const timeTopsideHours = (
    (Number(stats?.totalTimeMs ?? 0) || agg.durationMs || durationFromMaps) /
    1000 /
    3600
  ).toFixed(1);
  const longestRaidMin = roundsData.length
    ? Math.round(
        Math.max(
          ...roundsData.map(
            (r: any) =>
              Number(r.durationMs ?? Number(r.duration ?? 0) * 1000) || 0,
          ),
        ) / 60000,
      )
    : 0;

  // ── XP / Leveling ──
  const playerLevel = playerStats?.level ?? 1;
  const xpForNext = (playerStats as any)?.xpForNextLevel ?? 5000;
  const totalXp =
    (playerStats as any)?.totalXp ?? playerStats?.xp ?? agg.totalScore ?? 0;
  const xpProgress =
    xpForNext > 0 ? Math.round(((totalXp % xpForNext) / xpForNext) * 100) : 0;
  const lastMatchXp = roundsData[0]?.score ?? roundsData[0]?.xp ?? 0;

  // XP per recent round bar
  const xpChart = roundsData.reverse().map((r: any, i: number) => ({
    name: `R${i + 1}`,
    xp: Number(r.score ?? r.xp ?? 0),
    map: (r.mapName || r.map || '').replace(/_/g, ' '),
  }));

  // Hideout modules data
  const hideoutModules = hideout?.modules || [];
  const completedModules = hideoutModules.filter(
    (m: any) => (m.currentLevel || 0) >= (m.maxLevel || 1),
  ).length;
  const totalModules = hideoutModules.length;
  const moduleCompletionPct =
    totalModules > 0
      ? ((completedModules / totalModules) * 100).toFixed(0)
      : '0';

  // Quests data
  const questList = quests?.quests || [];
  const completedQuests = questList.filter((q: any) => q.completed).length;
  const totalQuests = questList.length;
  const questCompletionPct =
    totalQuests > 0 ? ((completedQuests / totalQuests) * 100).toFixed(0) : '0';

  // Blueprints data
  const bpList = blueprints?.blueprints || [];
  const learnedBlueprints = bpList.filter((bp: any) => bp.learned).length;
  const totalBlueprints = bpList.length;
  const bpCompletionPct =
    totalBlueprints > 0
      ? ((learnedBlueprints / totalBlueprints) * 100).toFixed(0)
      : '0';

  // Loadout summary
  const loadoutData = loadout?.loadout || {};
  const equippedWeapons = [loadoutData.weapon1, loadoutData.weapon2].filter(
    Boolean,
  ).length;
  const hasShield =
    !!loadoutData.shield && loadoutData.shield?.itemId !== '__empty_slot__';
  const hasAugment =
    !!loadoutData.augment && loadoutData.augment?.itemId !== '__empty_slot__';
  const backpackItems = loadoutData.backpack?.length || 0;
  const quickItems = loadoutData.quickItems?.length || 0;

  // Stash data
  const stashItems = stash?.items || [];
  const stashCapacity = stash?.slots?.total || 0;
  const stashUsed = stash?.slots?.used || stashItems.length;
  const stashFillPct =
    stashCapacity > 0 ? ((stashUsed / stashCapacity) * 100).toFixed(0) : '0';

  // Profit per raid line chart
  const profitChart = roundsData.reverse().map((r: any, i: number) => ({
    name: `R${i + 1}`,
    profit: Number(r.netValue ?? r.netProfit ?? r.profit ?? 0),
  }));

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 mt-8 pb-20">
      {/* Header */}
      <div className="border-b border-arc-border pb-4 mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-arc-yellow" />
          <h1 className="text-3xl font-black uppercase text-white tracking-tighter">
            OPERATIVE <span className="text-arc-yellow">//</span> CODEX
          </h1>
        </div>
        <p className="text-[10px] text-[#8a7a9a] uppercase tracking-[0.4em] mt-2">
          Complete Analytics Dashboard — All Returns Visualized
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: IDENTITY & LEVEL (from playerStats + raiderHub)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <SectionTitle
          icon={Award}
          label="Operative Identity"
          color="var(--color-arc-yellow)"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <StatTile
            label="Level"
            value={`Lv.${playerLevel}`}
            color="var(--color-arc-yellow)"
            subvalue={`${xpProgress}% to next`}
          />
          <StatTile
            label="Total XP"
            value={Number(totalXp).toLocaleString()}
            color="var(--color-arc-yellow)"
          />
          <StatTile
            label="XP This Level"
            value={`${(totalXp % xpForNext).toLocaleString()} / ${xpForNext.toLocaleString()}`}
            color="var(--color-arc-epic)"
          />
          <StatTile
            label="Last Match XP"
            value={Number(lastMatchXp).toLocaleString()}
            color="var(--color-arc-rare)"
          />
          <StatTile
            label="Hideout"
            value={`${completedModules}/${totalModules}`}
            color="var(--color-arc-yellow)"
            subvalue={`${moduleCompletionPct}% complete`}
          />
          <StatTile
            label="Quests"
            value={`${completedQuests}/${totalQuests}`}
            color="var(--color-arc-yellow)"
            subvalue={`${questCompletionPct}% done`}
          />
          <StatTile
            label="Blueprints"
            value={`${learnedBlueprints}/${totalBlueprints}`}
            color="var(--color-arc-epic)"
            subvalue={`${bpCompletionPct}% learned`}
          />
          <StatTile
            label="Stash"
            value={`${stashUsed}/${stashCapacity}`}
            color="var(--color-arc-rare)"
            subvalue={`${stashFillPct}% full`}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2: PvP COMBAT STATS
      ═══════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <SectionTitle
          icon={Crosshair}
          label="PvP Combat"
          color="var(--color-arc-danger)"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
          <StatTile
            label="Player Kills"
            value={playerKills.toLocaleString()}
            color="var(--color-arc-danger)"
          />
          <StatTile
            label="Player Downs"
            value={playerDowns.toLocaleString()}
            color="var(--color-arc-yellow)"
          />
          <StatTile
            label="Deaths"
            value={playerDeaths.toLocaleString()}
            color="var(--color-arc-danger)"
          />
          <StatTile
            label="K/D Ratio"
            value={String(kdRatio)}
            color="var(--color-arc-danger)"
          />
          <StatTile
            label="Damage Dealt"
            value={Number(damageDealt).toLocaleString()}
            color="var(--color-arc-yellow)"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3: PvE / ARC COMBAT with Percentages
      ═══════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <SectionTitle
          icon={Skull}
          label="PvE Combat — ARC Units Destroyed"
          color="var(--color-arc-yellow)"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatTile
            label="Total ARC Kills"
            value={Number(arcKillsTotal).toLocaleString()}
            color="var(--color-arc-yellow)"
          />
          <StatTile
            label="Top Weapon"
            value={topWeaponName}
            color="var(--color-arc-rare)"
          />
          <StatTile
            label="Containers Looted"
            value={containersLooted.toLocaleString()}
            color="var(--color-arc-epic)"
          />
        </div>

        {arcWithPercentages.length > 0 && (
          <div className="bg-arc-light-bg border border-arc-border p-4">
            <h3 className="text-[11px] font-black text-arc-yellow uppercase tracking-widest mb-4">
              ARC Unit Kill Distribution
            </h3>
            <div className="space-y-2">
              {arcWithPercentages.map((arc) => (
                <div
                  key={arc.name}
                  className="grid grid-cols-[40px_minmax(88px,150px)_1fr_58px_76px] items-center gap-3 bg-[#050505] border border-arc-border px-3 py-2"
                >
                  {arc.icon ? (
                    <img
                      src={arc.icon}
                      alt={arc.name}
                      className="w-9 h-9 object-contain"
                      onError={(e) =>
                        ((e.currentTarget as HTMLImageElement).style.display =
                          'none')
                      }
                    />
                  ) : (
                    <Skull className="w-6 h-6 text-arc-yellow" />
                  )}
                  <span className="text-[10px] text-white font-black uppercase truncate">
                    {arc.name}
                  </span>
                  <div className="h-3 bg-[#0d0d0d] border border-[#141414] overflow-hidden">
                    <div
                      className="h-full bg-arc-yellow"
                      style={{ width: `${arc.percentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black tabular-nums text-arc-yellow text-right">
                    {arc.percentage}%
                  </span>
                  <span className="text-[10px] font-black tabular-nums text-white text-right">
                    {arc.kills.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4: SCAVENGING STATS
      ═══════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <SectionTitle
          icon={Package}
          label="Scavenging & World"
          color="var(--color-arc-rare)"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <StatTile
            label="Containers Looted"
            value={containersLooted.toLocaleString()}
            color="var(--color-arc-rare)"
          />
          <StatTile
            label="Keys In Stash"
            value={keysInStash.toLocaleString()}
            color="var(--color-arc-yellow)"
          />
          <StatTile
            label="Blueprints Learned"
            value={`${learnedBlueprints}/${totalBlueprints}`}
            color="var(--color-arc-epic)"
          />
          <StatTile
            label={EMBARK_STAT_LABELS.avgProfitPerExtraction}
            value={`$${avgProfitPerRaid.toLocaleString()}`}
            color="var(--color-arc-yellow)"
          />
          <StatTile
            label={EMBARK_STAT_LABELS.valueExtracted}
            value={`$${totalValueExtracted.toLocaleString()}`}
            color="var(--color-arc-rare)"
          />
          <StatTile
            label={EMBARK_STAT_LABELS.valueBroughtIn}
            value={`$${totalValueBroughtIn.toLocaleString()}`}
            color="#8a7a9a"
          />
          <StatTile
            label={`${EMBARK_STAT_LABELS.netValue} Career`}
            value={`$${netProfitTotal.toLocaleString()}`}
            color="var(--color-arc-yellow)"
          />
          <StatTile
            label="Items Extracted"
            value={itemsExtracted.toLocaleString()}
            color="var(--color-arc-yellow)"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5: PERFORMANCE ANALYTICS
      ═══════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <SectionTitle
          icon={TrendingUp}
          label="Performance Analytics"
          color="var(--color-arc-yellow)"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
          <StatTile
            label="Total Rounds"
            value={total.toLocaleString()}
            color="var(--color-arc-yellow)"
          />
          <StatTile
            label="Successful Raids"
            value={extractedTotal.toLocaleString()}
            color="var(--color-arc-yellow)"
            subvalue={`${survivalRate}% survival`}
          />
          <StatTile
            label="Failed Raids"
            value={diedTotal.toLocaleString()}
            color="var(--color-arc-danger)"
            subvalue={`${(100 - parseFloat(survivalRate)).toFixed(1)}% death rate`}
          />
          <StatTile
            label="Survival Rate"
            value={`${survivalRate}%`}
            color="var(--color-arc-rare)"
          />
          <StatTile
            label="K/D Ratio"
            value={String(kdRatio)}
            color="var(--color-arc-danger)"
          />
          <StatTile
            label="Score Total"
            value={Number(totalScore).toLocaleString()}
            color="var(--color-arc-yellow)"
          />
          <StatTile
            label="Avg Score"
            value={avgScore.toLocaleString()}
            color="var(--color-arc-yellow)"
          />
          <StatTile
            label="Avg Damage"
            value={Number(avgDamage).toLocaleString()}
            color="var(--color-arc-danger)"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatTile
            label="Time Topside"
            value={`${timeTopsideHours}h`}
            color="var(--color-arc-rare)"
          />
          <StatTile
            label="Longest Raid"
            value={`${longestRaidMin}m`}
            color="var(--color-arc-epic)"
          />
          <StatTile
            label={EMBARK_STAT_LABELS.netValue}
            value={`$${netProfitTotal.toLocaleString()}`}
            color="var(--color-arc-yellow)"
          />
          <StatTile
            label={EMBARK_STAT_LABELS.avgProfitPerExtraction}
            value={`$${total > 0 ? Math.round(netProfitTotal / total).toLocaleString() : 0}`}
            color="var(--color-arc-yellow)"
          />
        </div>

        {profitChart.length > 0 && (
          <div className="bg-arc-light-bg border border-arc-border p-4 mb-4">
            <h3 className="text-[11px] font-black text-arc-yellow uppercase tracking-widest mb-3">
              {EMBARK_STAT_LABELS.netValue} Trend - Last {profitChart.length}{' '}
              Raids
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={profitChart} margin={{ left: 8, right: 16 }}>
                <XAxis
                  dataKey="name"
                  stroke="#8a7a9a"
                  tick={{ fontSize: 10, fill: '#8a7a9a' }}
                />
                <YAxis
                  stroke="#8a7a9a"
                  tick={{ fontSize: 10, fill: '#8a7a9a' }}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#000',
                    border: '1px solid var(--color-arc-yellow)',
                    fontSize: 11,
                  }}
                  formatter={(v: any) => [
                    `$${Number(v).toLocaleString()}`,
                    EMBARK_STAT_LABELS.netValue,
                  ]}
                  cursor={{ stroke: 'var(--color-arc-yellow)', strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="var(--color-arc-yellow)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--color-arc-yellow)', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {xpChart.length > 0 && (
          <div className="bg-arc-light-bg border border-arc-border p-4">
            <h3 className="text-[11px] font-black text-[var(--color-arc-epic)] uppercase tracking-widest mb-3">
              XP per Round — Last {xpChart.length} Raids
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={xpChart} margin={{ left: 8, right: 16 }}>
                <XAxis
                  dataKey="name"
                  stroke="#8a7a9a"
                  tick={{ fontSize: 9, fill: '#8a7a9a' }}
                />
                <YAxis
                  stroke="#8a7a9a"
                  tick={{ fontSize: 9, fill: '#8a7a9a' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#000',
                    border: '1px solid var(--color-arc-epic)',
                    fontSize: 10,
                  }}
                  formatter={(v: any, _n: any, p: any) => [
                    `${v.toLocaleString()} XP`,
                    p?.payload?.map || 'Round',
                  ]}
                  cursor={{ fill: 'rgba(255,16,240,0.05)' }}
                />
                <Bar
                  dataKey="xp"
                  fill="var(--color-arc-epic)"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6: CURRENT LOADOUT SUMMARY
      ═══════════════════════════════════════════════════════════════ */}
      {equippedWeapons > 0 && (
        <div className="mb-8">
          <SectionTitle
            icon={Shield}
            label="Current Loadout"
            color="var(--color-arc-rare)"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile
              label="Weapons"
              value={`${equippedWeapons}/2`}
              color="var(--color-arc-yellow)"
            />
            <StatTile
              label="Shield"
              value={hasShield ? 'Equipped' : 'None'}
              color={hasShield ? 'var(--color-arc-yellow)' : '#8a7a9a'}
            />
            <StatTile
              label="Augment"
              value={hasAugment ? 'Equipped' : 'None'}
              color={hasAugment ? 'var(--color-arc-epic)' : '#8a7a9a'}
            />
            <StatTile
              label="Backpack"
              value={`${backpackItems} items`}
              color="var(--color-arc-rare)"
            />
            <StatTile
              label="Quick Items"
              value={`${quickItems}/5`}
              color="var(--color-arc-yellow)"
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER — No Data Notice
      ═══════════════════════════════════════════════════════════════ */}
      {total === 0 && (
        <div className="mt-6 bg-arc-light-bg border border-dashed border-arc-border p-6 text-center">
          <Activity className="w-8 h-8 text-[#8a7a9a] mx-auto mb-2" />
          <p className="text-[9px] text-[#8a7a9a] uppercase tracking-widest">
            No round data — sync your account or play a raid to populate
            analytics
          </p>
        </div>
      )}
    </div>
  );
}
