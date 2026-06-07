import { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { assetUrl } from '../lib/assetUrl';
import {
  getCompletions,
  addCompletion,
  removeCompletion,
  completionsToSets,
} from '../lib/completionsStorage';
import { getItemImg, getItemImgWebp, getItemData } from '../lib/itemDb';
import { ItemCard } from '../components/ItemCard';
import QUESTS_RAW from '../data/quests-all.json';
import PROJECTS_RAW from '../data/projects.json';
import {
  Target,
  Database,
  FileText,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Zap,
  Package,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

const ICONS = {
  quest: assetUrl('/icons/quest.webp'),
  project: assetUrl('/icons/projects.webp'),
  blueprint: assetUrl('/icons/blueprint.webp'),
  star: assetUrl('/icons/star.webp'),
  refresh: assetUrl('/icons/refresh.webp'),
};

/* ─── helpers ───────────────────────────────────────────────── */
function pickArray(data: any, keys: string[]) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const k of keys) if (Array.isArray(data[k])) return data[k];
  return [];
}

const TRADER_COLORS: Record<string, string> = {
  shani: '#c43198',
  lance: '#e83a3a',
  celeste: '#01abf4',
  apollo: '#f1aa1c',
  tianwen: '#f1aa1c',
};
const TRADER_IMG: Record<string, string> = {
  shani: assetUrl('/main/shani.png'),
  lance: assetUrl('/main/lance.png'),
  celeste: assetUrl('/main/celeste.png'),
  apollo: assetUrl('/main/apollo.png'),
  tianwen: assetUrl('/main/tianwen.png'),
};
const CHARACTER_IMAGES: Record<string, string> = {
  Apollo: assetUrl('/main/apollo.png'),
  Celeste: assetUrl('/main/celeste.png'),
  Shani: assetUrl('/main/shani.png'),
  Lance: assetUrl('/main/lance.png'),
  TianWen: assetUrl('/main/tianwen.png'),
  Ermal: assetUrl('/main/ermal.webp'),
};

function displayText(value: any, fallback = ''): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value.en === 'string') return value.en;
  if (typeof value.EN === 'string') return value.EN;
  if (typeof value.name === 'string') return value.name;
  if (value.name && typeof value.name === 'object') {
    return displayText(value.name, fallback);
  }
  if (typeof value.id === 'string') return value.id;
  return fallback;
}

function normalizeList(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') return Object.values(data);
  return [];
}

/* ─── Reward item chip with compact market card style ────────────────────────────── */
function RewardChip({
  itemId,
  quantity,
}: {
  itemId: string;
  quantity: number;
}) {
  const meta = getItemData(itemId);
  const rarity = String(meta?.rarity || 'common').toLowerCase();
  const category = String(
    meta?.category || meta?.itemType || 'misc',
  ).toLowerCase();

  return (
    <div className="relative">
      <ItemCard itemId={itemId} rarity={rarity} category={category} />
      {/* Quantity badge */}
      {quantity > 1 && (
        <div
          className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 text-[10px] font-black border bg-[#1a1120]"
          style={{
            borderColor: '#f1aa1c',
            color: '#f1aa1c',
            borderRadius: '50%',
          }}
          title={`Quantity: ${quantity}`}
        >
          {quantity > 99 ? '99+' : quantity}
        </div>
      )}
    </div>
  );
}

/* ─── Quest Board ────────────────────────────────────────────── */
function QuestBoard({ quests }: { quests: any[] }) {
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const [openTrader, setOpenTrader] = useState<string | null>(null);

  // Load completions from localStorage on component mount
  useEffect(() => {
    const completions = getCompletions();
    const questCompletions = completionsToSets(completions).quests;

    // Update quests with completion status from localStorage
    quests.forEach((quest: any) => {
      if (quest.id && questCompletions.has(quest.id)) {
        quest.completed = true;
      }
    });
  }, [quests]);

  const byTrader: Record<string, any[]> = {};
  quests.forEach((q: any) => {
    const t = (q.trader || 'unknown').toLowerCase();
    if (!byTrader[t]) byTrader[t] = [];
    byTrader[t].push(q);
  });

  return (
    <div className="bg-[#1a1120] border border-[#2d1f38] mb-6 project-legendary-glow">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#2d1f38] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[#f1aa1c]" />
          <h2 className="text-[11px] font-black text-white uppercase tracking-widest">
            CONTRACT BOARD
          </h2>
          <span className="text-[8px] font-black text-[#8a7a9a] uppercase border border-[#2d1f38] px-1.5 py-0.5">
            {quests.filter((q: any) => !q.completed).length} OPEN
          </span>
        </div>
        <div className="flex gap-1">
          {(['all', 'active', 'done'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 border transition-colors ${
                filter === f
                  ? 'border-[#f1aa1c] text-[#f1aa1c] bg-[#f1aa1c]/10'
                  : 'border-[#2d1f38] text-[#8a7a9a] hover:border-[#2d1f38]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Trader columns */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {Object.entries(byTrader).map(([trader, qs]) => {
          const visible = qs.filter((q: any) => {
            if (filter === 'active') return !q.completed;
            if (filter === 'done') return q.completed;
            return true;
          });
          const done = qs.filter((q: any) => q.completed).length;
          const pct = Math.round((done / qs.length) * 100);
          const color = TRADER_COLORS[trader] || '#8a7a9a';
          const img = TRADER_IMG[trader];
          const isOpen = openTrader === trader;

          return (
            <div
              key={trader}
              className="border border-[#2d1f38] hover:border-[#2d1f38] transition-colors"
              style={{ borderTopColor: color, borderTopWidth: 2 }}
            >
              {/* Trader header */}
              <button
                className="w-full flex items-center gap-3 p-3 text-left"
                onClick={() => setOpenTrader(isOpen ? null : trader)}
              >
                {img ? (
                  <img
                    src={assetUrl(`/main/${img}`)}
                    alt={trader}
                    className="w-10 h-10 object-cover border border-[#2d1f38] shrink-0"
                  />
                ) : (
                  <div
                    className="w-10 h-10 border flex items-center justify-center shrink-0"
                    style={{ borderColor: color, background: `${color}18` }}
                  >
                    <span
                      className="text-[11px] font-black uppercase"
                      style={{ color }}
                    >
                      {trader[0]}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-white">
                    {trader}
                  </p>
                  <p className="text-[7px] text-[#8a7a9a] mt-0.5">
                    {done}/{qs.length} complete
                  </p>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-3 h-3 text-[#8a7a9a] shrink-0" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-[#8a7a9a] shrink-0" />
                )}
              </button>

              {/* Progress bar */}
              <div className="h-1 bg-[#1a1120] mx-3 mb-3">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>

              {/* Quest list */}
              {isOpen && (
                <div className="border-t border-[#2d1f38] px-3 pb-3 max-h-72 overflow-y-auto space-y-1.5 mt-1">
                  {visible.length === 0 && (
                    <p className="text-[8px] text-[#8a7a9a] uppercase py-3 text-center">
                      No quests
                    </p>
                  )}
                  {visible.map((q: any, qi: number) => (
                    <div key={qi} className="flex items-start gap-2 py-1">
                      <button
                        onClick={() => {
                          const questId = q.id || q.questId || `quest-${qi}`;
                          if (q.completed) {
                            removeCompletion('quests', questId);
                            q.completed = false;
                          } else {
                            addCompletion('quests', questId);
                            q.completed = true;
                          }
                        }}
                        className="shrink-0 mt-0.5 hover:scale-110 transition-transform"
                      >
                        {q.completed ? (
                          <CheckCircle2 className="w-3 h-3 text-[#f1aa1c]" />
                        ) : (
                          <Circle className="w-3 h-3 text-[#2d1f38]" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <p
                          className={`text-[8px] font-black uppercase leading-snug ${
                            q.completed
                              ? 'text-[#8a7a9a] line-through'
                              : 'text-white'
                          }`}
                        >
                          {displayText(q.name, q.id || 'Quest')}
                        </p>
                        {q.description && !q.completed && (
                          <p className="text-[7px] text-[#8a7a9a] leading-snug mt-0.5">
                            {displayText(q.description)}
                          </p>
                        )}
                        {/* Reward items */}
                        {!q.completed &&
                          (q.grantedItemIds?.length > 0 ||
                            q.rewardItemIds?.length > 0) && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {[
                                ...(q.grantedItemIds ?? []),
                                ...(q.rewardItemIds ?? []),
                              ].map((r: any, ri: number) => (
                                <RewardChip
                                  key={ri}
                                  itemId={r.itemId}
                                  quantity={r.quantity ?? 1}
                                />
                              ))}
                            </div>
                          )}
                        {q.xp > 0 && !q.completed && (
                          <p className="text-[7px] text-[#f1aa1c] mt-1">
                            +{q.xp} XP
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Projects (Expedition phases) ──────────────────────────── */
function ProjectsPanel({ projects }: { projects: any[] }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  // Load completions from localStorage on component mount
  useEffect(() => {
    const completions = getCompletions();
    const projectCompletions = completionsToSets(completions).projects;

    // Update projects and their phases with completion status from localStorage
    projects.forEach((project: any) => {
      if (project.id && projectCompletions.has(project.id)) {
        project.completed = true;
      }

      // Update phases if they exist
      if (project.phases) {
        project.phases.forEach((phase: any) => {
          if (phase.id && projectCompletions.has(phase.id)) {
            phase.completed = true;
          }
        });
      }
    });
  }, [projects]);
  const totalPhases = projects.reduce(
    (s, p) => s + (p.totalPhases || p.phases?.length || 0),
    0,
  );
  const donePhases = projects.reduce(
    (s, p) =>
      s +
      (p.completedPhases ??
        p.phases?.filter((x: any) => x.completed).length ??
        0),
    0,
  );

  return (
    <div className="bg-[#1a1120] border border-[#2d1f38] mb-6 project-legendary-glow">
      <div className="px-5 py-4 border-b border-[#2d1f38] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <img
            src={ICONS.project}
            alt="Projects"
            className="w-4 h-4 opacity-80"
          />
          <h2 className="text-[11px] font-black text-white uppercase tracking-widest">
            EXPEDITION PROJECTS
          </h2>
        </div>
        <span className="text-[9px] font-black text-[#8a7a9a] uppercase">
          {donePhases} / {totalPhases} PHASES
        </span>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {projects.map((proj: any, i: number) => {
          const total = proj.totalPhases || proj.phases?.length || 0;
          const done =
            proj.completedPhases ??
            proj.phases?.filter((p: any) => p.completed).length ??
            0;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const full = proj.fullyCompleted || done >= total;
          const isOpen = expanded[i];

          return (
            <div
              key={i}
              className={`border p-3 transition-colors ${
                full
                  ? 'border-[#f1aa1c]/30 bg-[#f1aa1c]/5'
                  : 'border-[#2d1f38] hover:border-[#2d1f38]'
              }`}
            >
              <button
                className="w-full flex items-center justify-between text-left"
                onClick={() => setExpanded((e) => ({ ...e, [i]: !e[i] }))}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-[9px] font-black text-white uppercase tracking-wide truncate">
                    {displayText(proj.name, proj.id || 'Project')}
                  </p>
                  <p className="text-[7px] text-[#8a7a9a] mt-0.5">
                    {done}/{total} phases · {pct}%
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {full && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#f1aa1c]" />
                  )}
                  {isOpen ? (
                    <ChevronUp className="w-3 h-3 text-[#8a7a9a]" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-[#8a7a9a]" />
                  )}
                </div>
              </button>

              {/* Progress bar */}
              <div className="h-1.5 bg-[#1a1120] border border-[#2d1f38] my-2 overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: full
                      ? '#f1aa1c'
                      : 'linear-gradient(90deg,#c43198,#e83a3a)',
                  }}
                />
              </div>

              {/* Phase list */}
              {isOpen && proj.phases && (
                <div className="space-y-1 border-t border-[#2d1f38] pt-2 mt-1">
                  {proj.phases.map((phase: any, pi: number) => (
                    <div key={pi} className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const phaseId =
                            phase.id ||
                            `${proj.id || `project-${i}`}-phase-${pi}`;
                          if (phase.completed) {
                            removeCompletion('projects', phaseId);
                            phase.completed = false;
                          } else {
                            addCompletion('projects', phaseId);
                            phase.completed = true;
                          }
                        }}
                        className="shrink-0 hover:scale-110 transition-transform"
                      >
                        {phase.completed ? (
                          <CheckCircle2 className="w-2.5 h-2.5 text-[#f1aa1c]" />
                        ) : (
                          <Circle className="w-2.5 h-2.5 text-[#2d1f38]" />
                        )}
                      </button>
                      <span
                        className={`text-[8px] uppercase tracking-wide ${
                          phase.completed
                            ? 'text-[#8a7a9a] line-through'
                            : 'text-[#aaa]'
                        }`}
                      >
                        {displayText(phase.name, `Phase ${pi + 1}`)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Blueprint Grid ─────────────────────────────────────────── */
function BlueprintGrid({ blueprints }: { blueprints: any[] }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'owned' | 'missing'>('all');
  const [category, setCategory] = useState('all');

  const categories = [
    'all',
    ...Array.from(
      new Set(
        blueprints.map((b: any) =>
          (b.category || b.type || 'other').toLowerCase(),
        ),
      ),
    ),
  ];

  const owned = blueprints.filter(
    (b: any) => b.learned || b.unlocked || b.owned,
  );
  const pct =
    blueprints.length > 0
      ? Math.round((owned.length / blueprints.length) * 100)
      : 0;

  const visible = blueprints.filter((b: any) => {
    const name = displayText(b.name, b.itemName || b.id || '').toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    const isOwned = b.learned || b.unlocked || b.owned;
    if (filter === 'owned' && !isOwned) return false;
    if (filter === 'missing' && isOwned) return false;
    const cat = (b.category || b.type || 'other').toLowerCase();
    if (category !== 'all' && cat !== category) return false;
    return true;
  });

  return (
    <div className="bg-[#1a1120] border border-[#2d1f38] mb-6">
      <div className="px-5 py-4 border-b border-[#2d1f38] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#01abf4]" />
          <h2 className="text-[11px] font-black text-white uppercase tracking-widest">
            BLUEPRINT ARCHIVE
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-black uppercase"
            style={{
              color: pct >= 75 ? '#f1aa1c' : pct >= 40 ? '#f1aa1c' : '#e83a3a',
            }}
          >
            {owned.length}/{blueprints.length} · {pct}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[#0d0d0d] overflow-hidden">
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background:
              pct >= 75
                ? 'linear-gradient(90deg,#f1aa1c,#01abf4)'
                : pct >= 40
                  ? 'linear-gradient(90deg,#f1aa1c,#c43198)'
                  : 'linear-gradient(90deg,#e83a3a,#c43198)',
            boxShadow: pct >= 75 ? '0 0 12px #f1aa1c' : 'none',
          }}
        />
      </div>

      {/* Filters */}
      <div className="p-4 pb-2 flex flex-wrap gap-2 items-center border-b border-[#2d1f38]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="SEARCH..."
          className="bg-[#1a1120] border border-[#2d1f38] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 placeholder-[#2d1f38] focus:outline-none focus:border-[#8a7a9a] w-40"
        />
        <div className="flex gap-1">
          {(['all', 'owned', 'missing'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 border transition-colors ${
                filter === f
                  ? 'border-[#01abf4] text-[#01abf4] bg-[#01abf4]/10'
                  : 'border-[#2d1f38] text-[#8a7a9a] hover:border-[#2d1f38]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 border transition-colors ${
                category === c
                  ? 'border-[#f1aa1c] text-[#f1aa1c]'
                  : 'border-[#2d1f38] text-[#2d1f38] hover:border-[#2d1f38]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
        {visible.map((b: any, i: number) => {
          const isOwned = b.learned || b.unlocked || b.owned;
          const name = displayText(b.name, b.itemName || b.id || 'Unknown');
          const rarity = b.rarity || 'Common';
          const rarityColor: Record<string, string> = {
            Legendary: '#f1aa1c',
            Epic: '#c43198',
            Rare: '#01abf4',
            Uncommon: '#4caf50',
            Common: '#9e9e9e',
          };
          const borderColor =
            rarityColor[rarity] || (isOwned ? '#f1aa1c' : '#2d1f38');

          return (
            <div
              key={i}
              data-rarity={rarity}
              className={`item-slot p-2 flex flex-col items-center text-center relative ${
                isOwned ? '' : 'opacity-50'
              }`}
              style={{ borderColor }}
            >
              {isOwned && (
                <div className="absolute top-1 right-1">
                  <CheckCircle2 className="w-2.5 h-2.5 text-[#f1aa1c]" />
                </div>
              )}
              {b.icon && (
                <img
                  src={b.icon}
                  alt={name}
                  className="w-8 h-8 object-contain mb-1 opacity-80"
                  onError={(e) => {
                    (e.currentTarget as any).style.display = 'none';
                  }}
                />
              )}
              <p className="text-[7px] font-black uppercase tracking-wide text-white leading-tight line-clamp-2">
                {name}
              </p>
              {rarity && (
                <span
                  className="text-[6px] uppercase tracking-wider mt-0.5"
                  style={{ color: rarityColor[rarity] || '#8a7a9a' }}
                >
                  {rarity}
                </span>
              )}
            </div>
          );
        })}
        {visible.length > 96 && (
          <div className="col-span-full text-center py-3">
            <p className="text-[8px] text-[#8a7a9a] uppercase">
              +{visible.length - 96} more — use search/filter to narrow
            </p>
          </div>
        )}
        {visible.length === 0 && (
          <div className="col-span-full text-center py-8">
            <p className="text-[8px] text-[#8a7a9a] uppercase tracking-widest">
              No blueprints match
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Summary bar ────────────────────────────────────────────── */
function SummaryBar({
  quests,
  projects,
  blueprints,
}: {
  quests: any[];
  projects: any[];
  blueprints: any[];
}) {
  const openQuests = quests.filter((q: any) => !q.completed).length;
  const doneQuests = quests.filter((q: any) => q.completed).length;

  const totalPhases = projects.reduce(
    (s, p) => s + (p.totalPhases || p.phases?.length || 0),
    0,
  );
  const donePhases = projects.reduce(
    (s, p) =>
      s +
      (p.completedPhases ??
        p.phases?.filter((x: any) => x.completed).length ??
        0),
    0,
  );

  const bpOwned = blueprints.filter(
    (b: any) => b.learned || b.unlocked || b.owned,
  ).length;
  const bpPct =
    blueprints.length > 0 ? Math.round((bpOwned / blueprints.length) * 100) : 0;

  const stats = [
    { label: 'OPEN QUESTS', value: openQuests, color: '#f1aa1c', icon: Target },
    {
      label: 'COMPLETED',
      value: doneQuests,
      color: '#01abf4',
      icon: CheckCircle2,
    },
    {
      label: 'PROJ PHASES',
      value: `${donePhases}/${totalPhases}`,
      color: '#c43198',
      icon: Database,
    },
    {
      label: 'BLUEPRINTS',
      value: `${bpOwned}/${blueprints.length}`,
      color: '#f1aa1c',
      icon: FileText,
    },
    {
      label: 'BP COMPLETION',
      value: `${bpPct}%`,
      color: bpPct >= 75 ? '#f1aa1c' : bpPct >= 40 ? '#f1aa1c' : '#e83a3a',
      icon: Zap,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-6">
      {stats.map((s) => (
        <div
          key={s.label}
          className="project-stat-box stat-box"
          style={{
            borderLeftColor: s.color,
            borderLeftWidth: 3,
          }}
        >
          <div className="flex items-center gap-1 mb-1">
            <s.icon
              className="w-3 h-3 stat-icon"
              style={{
                color: s.color,
                filter: `drop-shadow(0 0 4px ${s.color})`,
              }}
            />
            <span className="stat-label">{s.label}</span>
          </div>
          <p
            className="stat-value truncate"
            style={{
              color: s.color,
              textShadow: `0 0 8px ${s.color}40`,
            }}
          >
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function ProjectsPage() {
  const {
    quests,
    projects,
    blueprints,
    raiderHub,
    isLoading,
    profile,
    refresh,
  } = usePlayer();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Static ARDB fallback data
  const [staticQuests] = useState<any[]>(() => normalizeList(QUESTS_RAW));
  const [staticProjects] = useState<any[]>(() => normalizeList(PROJECTS_RAW));

  const liveQuestItems = pickArray(quests || (raiderHub as any)?.quests, [
    'quests',
    'items',
  ]);
  const liveProjectItems = pickArray(projects || (raiderHub as any)?.projects, [
    'projects',
    'items',
  ]);
  const blueprintItems = pickArray(blueprints, ['blueprints', 'items']);

  // Use live data if available, otherwise fall back to static ARDB data
  const questItems = liveQuestItems.length > 0 ? liveQuestItems : staticQuests;
  const projectItems =
    liveProjectItems.length > 0 ? liveProjectItems : staticProjects;
  const usingStatic = liveQuestItems.length === 0 && staticQuests.length > 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh().catch(() => {});
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-14 h-14 border-2 border-[#f1aa1c] border-t-transparent rounded-full animate-spin mb-6" />
        <p className="text-[#f1aa1c] text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">
          Loading Intel...
        </p>
      </div>
    );
  }

  const isEmpty =
    questItems.length === 0 &&
    projectItems.length === 0 &&
    blueprintItems.length === 0;

  return (
    <div className="relative z-10 min-h-screen bg-transparent text-white pb-20 pt-10">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#f1aa1c]/10 border border-[#f1aa1c]/40 rounded-lg">
                <Database className="w-5 h-5 text-[#f1aa1c]" />
              </div>
              <h1 className="text-2xl font-black text-white uppercase tracking-[0.3em]">
                Strategic Intel
              </h1>
            </div>
            <p className="text-[10px] text-[#8a7a9a] uppercase tracking-widest pl-1">
              Contract Board · Expedition Projects · Blueprint Archive
            </p>
          </div>
          <div className="flex items-center gap-3">
            {usingStatic && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-[#f1aa1c]/20 bg-[#f1aa1c]/5 text-[8px] font-black uppercase tracking-widest text-[#f1aa1c]">
                <FileText className="w-3 h-3 shrink-0" />
                Database Fallback Active
              </div>
            )}
            {profile && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:border-[#f1aa1c]/40 text-[9px] font-black uppercase tracking-widest text-[#8a7a9a] hover:text-white transition-all rounded-md"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                Sync Progress
              </button>
            )}
          </div>
        </div>

        {isEmpty ? (
          <div className="border border-[#2d1f38] bg-[#1a1120]/60 backdrop-blur-md p-16 text-center rounded-2xl">
            <AlertTriangle className="w-16 h-16 text-[#f1aa1c] mx-auto mb-6 opacity-40" />
            <h2 className="text-xl font-black text-white uppercase tracking-widest mb-3">
              No Intel Available
            </h2>
            <p className="text-[10px] text-[#8a7a9a] uppercase tracking-widest mb-8 max-w-md mx-auto leading-relaxed">
              Link your ArcTracker key in Settings to synchronize your live
              raider progress including quests, projects, and blueprints.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent('shiesty:navigate', {
                      detail: { tab: 'settings' },
                    }),
                  )
                }
                className="px-8 py-3 bg-[#f1aa1c] text-black text-[11px] font-black uppercase tracking-[0.2em] hover:bg-[#ffcc00] transition-colors shadow-lg shadow-[#f1aa1c]/20"
              >
                Go to Settings
              </button>
              <button
                onClick={handleRefresh}
                className="px-8 py-3 bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-colors"
              >
                Force Sync
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            <SummaryBar
              quests={questItems}
              projects={projectItems}
              blueprints={blueprintItems}
            />

            <section>
              <QuestBoard quests={questItems} />
            </section>

            <section>
              <ProjectsPanel projects={projectItems} />
            </section>

            <section>
              <BlueprintGrid blueprints={blueprintItems} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
