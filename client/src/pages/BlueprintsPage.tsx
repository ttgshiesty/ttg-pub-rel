import { useState, useMemo, useRef, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  Search,
  Check,
  X,
  Send,
  Package,
  Wrench,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  FileImage,
  FileText,
  Plus,
  Clock,
  Lock,
  Database,
  Flame,
  TrendingUp,
  ShoppingCart,
} from 'lucide-react';
import {
  DiscordAPI,
  ArcTrackerAPI,
  BlueprintFindAPI,
  BlueprintProgressAPI,
} from '../lib/api';
import {
  ALL_ITEMS,
  getItemImg,
  getItemImgWebp,
  getItemData,
  RARITY_BG,
  RARITY_GRADIENT,
} from '../lib/itemDb';
import { matchesSearchMultiLang } from '../lib/searchUtils';
import CraftRelationships from '../components/CraftRelationships';
import AtlasBlueprintPanel from '../components/AtlasBlueprintPanel';
import BlueprintDetailPage from './BlueprintDetailPage';
import { Tooltip, LabelTooltip } from '../components/Tooltip';
import { getDropForBlueprint } from '../blueprint_drops';
import {
  downloadReportAsImage,
  downloadReportAsPdf,
} from '../blueprintReportUtils';
import {
  blueprintLookupKey,
  resolveReferenceBlueprintArt,
  stripBlueprintSuffix,
} from '../lib/blueprintReferenceArt';
import { groupBlueprintsByRarityTier } from '../lib/rarityGroups';
import {
  rarityCardContainerClasses,
  rarityCardTopBarClass,
  rarityBadgeClasses,
  getRarityVisualTier,
  formatRarityLabel,
} from '../lib/rarityCardStyles';
import { getItemImageUrl, getItemName, getItemRarity } from '../lib/itemUtils';

/* ─── ARC rarity palette ─────────────────────────────────────────────────── */
const RC: Record<string, string> = {
  Legendary: 'var(--color-arc-legendary)',
  Epic: 'var(--color-arc-epic)',
  Rare: 'var(--color-arc-rare)',
  Uncommon: 'var(--color-arc-uncommon)',
  Common: 'var(--color-arc-common)',
};
const rarityColor = (r?: string) => RC[r ?? ''] ?? RC.Common;
// Get rarity from items-master for accurate data
const getBlueprintrarity = (blueprintId: string, fallback?: string) => {
  const masterData = getItemData(blueprintId);
  return masterData?.rarity || fallback || 'Common';
};
const displayName = (value: any, fallback = 'Unknown') =>
  typeof value === 'string'
    ? value
    : value?.en || value?.name || value?.id || fallback;

type BlueprintFindRecord = {
  _id: string;
  blueprintId: string;
  blueprintName: string;
  blueprintImageUrl?: string;
  rarity?: string;
  map?: string;
  condition?: string;
  container?: string;
  location?: string;
  locked?: boolean;
  notes?: string;
  userName?: string;
  votes?: { up?: number; down?: number };
  createdAt?: string;
};

type BlueprintFindPayload = {
  blueprintId: string;
  blueprintName: string;
  blueprintImageUrl?: string;
  rarity?: string;
  map?: string;
  condition?: string;
  container?: string;
  location?: string;
  locked?: boolean;
  notes?: string;
  source?: 'manual' | 'sync' | 'discord';
};

type BlueprintCsvIntel = {
  key: string;
  blueprintId?: string;
  name: string;
  map?: string;
  condition?: string;
  scavengable?: string;
  containers?: string;
  questReward?: string;
  trialsReward?: string;
  containerType?: string;
  notes?: string;
  locationNotes?: string;
  bestRoute?: string;
  craftingMaterials?: string;
  workshopLevel?: string;
};

type BlueprintMarketSummary = {
  key: string;
  count: number;
  lowestPrice: number | null;
  listings: {
    _id: string;
    itemName: string;
    price: number;
    currency: string;
    sellerName?: string;
  }[];
};

const BLUEPRINT_MAPS = [
  'Dam Battlegrounds',
  'Blue Gate',
  'Buried City',
  'Spaceport',
  'Stella Montis',
  'All',
];
const FIND_CONDITIONS = [
  'Any',
  'Day',
  'Night',
  'Storm',
  'Hurricane',
  'Hidden Bunker',
  'Locked Gate',
];

function timeAgo(iso?: string): string {
  if (!iso) return 'just now';
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return 'just now';
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function blueprintRelationKey(id?: string, name?: string): string {
  const source = id || name || '';
  return String(source)
    .trim()
    .replace(/[_-]?blueprint$/i, '')
    .replace(/\s+blueprint$/i, '')
    .toLowerCase()
    .replace(/\bmagazine\b/g, 'mag')
    .replace(/[^a-z0-9]+/g, '');
}

function getBlueprintRelation<T>(
  map: Record<string, T>,
  bp: any,
): T | undefined {
  const name = stripBlueprintSuffix(displayName(bp?.name, bp?.id));
  const keys = [
    blueprintRelationKey(bp?.id, name),
    blueprintRelationKey(undefined, name),
    blueprintLookupKey(name).replace(/[^a-z0-9]+/g, ''),
  ];
  return keys.map((key) => map[key]).find(Boolean);
}

/* ─── Category groups ────────────────────────────────────────────────────── */
const CATS = [
  { id: 'all', label: 'All' },
  { id: 'weapon', label: 'Weapons' },
  { id: 'mod', label: 'Mods' },
  { id: 'augment', label: 'Augments' },
  { id: 'quickuse', label: 'Quick Use' },
  { id: 'material', label: 'Materials' },
];

function catOf(item: any): string {
  // For blueprints, derive category from the target item's type via the item ID
  const targetId = (item.id || '').replace(/_blueprint$/, '');
  const targetItem = ALL_ITEMS.find(
    (i: any) =>
      i.id === targetId ||
      i.id === targetId + '_i' ||
      i.id === targetId + '_ii' ||
      i.id === targetId + '_iii' ||
      i.id === targetId + '_iv',
  );
  const t = String(targetItem?.type || item?.item_type || '').toLowerCase();

  if (
    t.includes('rifle') ||
    t.includes('smg') ||
    t.includes('shotgun') ||
    t.includes('pistol') ||
    t.includes('sniper') ||
    t.includes('hand cannon') ||
    t.includes('lmg') ||
    t.includes('special')
  )
    return 'weapon';
  if (t.includes('modification') || t.includes('mod')) return 'mod';
  if (t.includes('augment')) return 'augment';
  if (t.includes('quick') || t.includes('consumable') || t.includes('medical'))
    return 'quickuse';
  if (
    t.includes('material') ||
    t.includes('component') ||
    t.includes('resource')
  )
    return 'material';
  return 'other';
}

/* ─── Item image with fallbacks ──────────────────────────────────────────── */
function ItemImg({
  id,
  name,
  size = 48,
}: {
  id: string;
  name: string;
  size?: number;
}) {
  const [idx, setIdx] = useState(0);
  const srcs = [
    resolveReferenceBlueprintArt(name) ?? '',
    getItemImg(id) ?? '',
    getItemImgWebp(id) ?? '',
  ].filter(Boolean);
  const src = srcs[idx] || '';
  return src ? (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className="object-contain arcHeroZoom"
      onError={() => setIdx((i) => i + 1)}
    />
  ) : (
    <div className="flex items-center justify-center w-full h-full">
      <Package
        className="text-[var(--color-arc-muted)]"
        style={{ width: size * 0.5, height: size * 0.5 }}
      />
    </div>
  );
}

/* ─── Discord post panel ─────────────────────────────────────────────────── */
function DiscordPostPanel({
  blueprint,
  onClose,
}: {
  blueprint: any;
  onClose: () => void;
}) {
  const [type, setType] = useState<'offer' | 'want'>('offer');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>(
    'idle',
  );
  const [msg, setMsg] = useState('');

  async function send() {
    const name = displayName(blueprint.name, blueprint.id);
    setStatus('sending');
    try {
      await DiscordAPI.notifyBlueprint({
        type,
        itemName: name,
        itemId: blueprint.id,
        rarity: getBlueprintrarity(blueprint.id, blueprint.rarity),
        imageUrl: getItemImg(blueprint.id) ?? undefined,
        price: price ? Number(price) : undefined,
        note: note || undefined,
      });
      setStatus('ok');
      setMsg('Posted to Discord!');
    } catch (e: any) {
      setStatus('err');
      setMsg(e.message || 'Failed to post.');
    }
  }

  const bprarity = getBlueprintrarity(blueprint.id, blueprint.rarity);
  const color = rarityColor(bprarity);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#0d0d14] border border-[#2a2a3a] p-6 shadow-2xl"
        style={{ borderLeftColor: color, borderLeftWidth: 3 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-[var(--color-arc-legendary)] hover:text-white arc-btn"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 bg-arc-light-bg border border-arc-border flex items-center justify-center">
            <ItemImg
              id={blueprint.id}
              name={displayName(blueprint.name, blueprint.id)}
              size={36}
            />
          </div>
          <div>
            <p className="text-sm font-black text-white uppercase tracking-wider">
              {displayName(blueprint.name, blueprint.id)}
            </p>
            <p className="text-xs font-bold mt-0.5" style={{ color }}>
              {bprarity}
            </p>
          </div>
        </div>

        {/* Offer / Want toggle */}
        <div className="flex gap-2 mb-4">
          {(['offer', 'want'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="flex-1 py-2 text-xs font-black uppercase tracking-widest border transition-colors"
              style={{
                borderColor: type === t ? color : '#2a2a3a',
                color: type === t ? color : 'var(--color-arc-common)',
                background: type === t ? `${color}12` : 'transparent',
              }}
            >
              {t === 'offer' ? '📦 For Sale' : '🔍 Wanted'}
            </button>
          ))}
        </div>

        <input
          type="number"
          placeholder="Price (optional)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full bg-[#0a0a10] border border-[#2a2a3a] text-white text-sm px-3 py-2 mb-3 outline-none focus:border-[var(--color-arc-rare)] placeholder-[var(--color-arc-muted)]"
        />
        <textarea
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full bg-[#0a0a10] border border-[#2a2a3a] text-white text-sm px-3 py-2 mb-4 outline-none focus:border-[var(--color-arc-rare)] placeholder-[var(--color-arc-muted)] resize-none"
        />

        <button
          onClick={send}
          disabled={status === 'sending' || status === 'ok'}
          className="w-full py-2.5 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
          style={{ background: color, color: '#000' }}
        >
          {status === 'sending' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {status === 'ok'
            ? 'Posted!'
            : status === 'err'
              ? 'Retry'
              : 'Post to Discord'}
        </button>
        {msg && (
          <p
            className={`text-xs mt-2 text-center ${status === 'ok' ? 'text-[var(--color-arc-uncommon)]' : 'text-[var(--color-arc-danger)]'}`}
          >
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}

function BlueprintFindModal({
  blueprint,
  csvIntel,
  onClose,
  onSubmit,
}: {
  blueprint: any;
  csvIntel?: BlueprintCsvIntel;
  onClose: () => void;
  onSubmit: (payload: BlueprintFindPayload) => Promise<void>;
}) {
  const bpName = displayName(blueprint.name, blueprint.id);
  const drop = getDropForBlueprint(bpName);
  const [map, setMap] = useState(
    drop?.map && drop.map !== 'All' ? drop.map : csvIntel?.map || '',
  );
  const [condition, setCondition] = useState(
    drop?.condition ?? csvIntel?.condition ?? 'Any',
  );
  const [container, setContainer] = useState(
    drop?.containers ?? csvIntel?.containers ?? '',
  );
  const [location, setLocation] = useState(
    drop?.location ?? csvIntel?.locationNotes ?? '',
  );
  const [locked, setLocked] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>(
    'idle',
  );
  const [msg, setMsg] = useState('');
  const bprarity = getBlueprintrarity(blueprint.id, blueprint.rarity);
  const color = rarityColor(bprarity);

  async function save() {
    if (!map.trim()) {
      setStatus('err');
      setMsg('Pick the map where you found it.');
      return;
    }
    if (!container.trim() && !location.trim()) {
      setStatus('err');
      setMsg('Add a container or a location so the report is useful.');
      return;
    }
    setStatus('saving');
    setMsg('');
    try {
      await onSubmit({
        blueprintId: blueprint.id,
        blueprintName: bpName,
        blueprintImageUrl: getItemImg(blueprint.id) ?? undefined,
        rarity: getBlueprintrarity(blueprint.id, blueprint.rarity),
        map,
        condition,
        container,
        location,
        locked,
        notes,
        source: 'manual',
      });
      setStatus('ok');
      setMsg('Blueprint find logged.');
      setTimeout(onClose, 500);
    } catch (e: any) {
      setStatus('err');
      setMsg(e.message || 'Could not log this find.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#0d0d14] border border-[#2a2a3a] p-6 shadow-2xl"
        style={{ borderLeftColor: color, borderLeftWidth: 3 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-[var(--color-arc-common)] hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 bg-arc-light-bg border flex items-center justify-center"
            style={{ borderColor: `${color}40` }}
          >
            <ItemImg id={blueprint.id} name={bpName} size={36} />
          </div>
          <div>
            <p className="text-sm font-black text-white uppercase tracking-wider">
              Log Blueprint Find
            </p>
            <p className="text-xs font-bold mt-0.5" style={{ color }}>
              {bpName}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-arc-muted)] mb-1 block">
              Map
            </label>
            <select
              value={map}
              onChange={(e) => setMap(e.target.value)}
              className="w-full bg-[#0a0a10] border border-[#2a2a3a] text-white text-sm px-3 py-2 outline-none focus:border-[var(--color-arc-rare)]"
            >
              <option value="">Select map</option>
              {BLUEPRINT_MAPS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-arc-muted)] mb-1 block">
              Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full bg-[#0a0a10] border border-[#2a2a3a] text-white text-sm px-3 py-2 outline-none focus:border-[var(--color-arc-rare)]"
            >
              {FIND_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-arc-muted)] mb-1 block">
            Container
          </label>
          <input
            value={container}
            onChange={(e) => setContainer(e.target.value)}
            placeholder="Drawer, locker, cache, weapon case..."
            className="w-full bg-[#0a0a10] border border-[#2a2a3a] text-white text-sm px-3 py-2 outline-none focus:border-[var(--color-arc-rare)] placeholder-[var(--color-arc-muted)]"
          />
        </div>

        <div className="mb-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-arc-muted)] mb-1 block">
            Exact Location
          </label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Room, landmark, key room, POI..."
            className="w-full bg-[#0a0a10] border border-[#2a2a3a] text-white text-sm px-3 py-2 outline-none focus:border-[var(--color-arc-rare)] placeholder-[var(--color-arc-muted)]"
          />
        </div>

        <label className="flex items-center gap-2 mb-3 cursor-pointer">
          <span
            className="w-4 h-4 border flex items-center justify-center"
            style={{
              borderColor: locked ? 'var(--color-arc-yellow)' : '#2a2a3a',
              background: locked ? 'var(--color-arc-yellow)20' : 'transparent',
            }}
          >
            {locked && (
              <Check className="w-2.5 h-2.5 text-[var(--color-arc-yellow)]" />
            )}
          </span>
          <span className="text-xs font-black uppercase tracking-widest text-[var(--color-arc-common)]">
            Locked/keyed area
          </span>
        </label>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder={csvIntel?.bestRoute || 'Optional notes...'}
          className="w-full bg-[#0a0a10] border border-[#2a2a3a] text-white text-sm px-3 py-2 mb-4 outline-none focus:border-[var(--color-arc-rare)] placeholder-[var(--color-arc-muted)] resize-none"
        />

        {msg && (
          <p
            className={`text-xs mb-3 ${status === 'ok' ? 'text-[var(--color-arc-uncommon)]' : 'text-[var(--color-arc-danger)]'}`}
          >
            {msg}
          </p>
        )}

        <button
          onClick={save}
          disabled={status === 'saving'}
          className="w-full py-2.5 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
          style={{ background: color, color: '#000' }}
        >
          {status === 'saving' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Save Find
        </button>
      </div>
    </div>
  );
}

function BlueprintCommunityPanel({
  finds,
  loading,
  csvIntelByBlueprint,
  marketplaceListingsByBlueprint,
  onVote,
}: {
  finds: BlueprintFindRecord[];
  loading: boolean;
  csvIntelByBlueprint: Record<string, BlueprintCsvIntel>;
  marketplaceListingsByBlueprint: Record<string, BlueprintMarketSummary>;
  onVote: (id: string, direction: 'up' | 'down') => void;
}) {
  const topMap = useMemo(() => {
    const counts = new Map<string, number>();
    finds.forEach((f) => {
      if (f.map) counts.set(f.map, (counts.get(f.map) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  }, [finds]);

  return (
    <aside className="border border-[#1e1e2e] bg-[#0d0d14] xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
      <div className="p-4 border-b border-[#1e1e2e]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-[var(--color-arc-rare)]" />
              Community Finds
            </p>
            <p className="text-[10px] text-[var(--color-arc-common)] mt-1">
              {finds.length} reports
              {topMap ? ` · top map ${topMap[0]} (${topMap[1]})` : ''}
            </p>
          </div>
          {loading && (
            <Loader2 className="w-4 h-4 animate-spin text-[var(--color-arc-muted)]" />
          )}
        </div>
      </div>

      {finds.length === 0 && !loading ? (
        <div className="p-5 text-center text-[var(--color-arc-common)]">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs font-black uppercase tracking-widest">
            No find reports yet
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#1e1e2e]">
          {finds.slice(0, 30).map((find) => {
            const key = blueprintRelationKey(
              find.blueprintId,
              find.blueprintName,
            );
            const csvIntel = csvIntelByBlueprint[key];
            const market = marketplaceListingsByBlueprint[key];
            return (
              <div key={find._id} className="p-4 hover:bg-white/[0.02]">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white uppercase tracking-wide truncate">
                      {find.blueprintName}
                    </p>
                    <p className="text-[10px] text-[var(--color-arc-common)]">
                      {find.userName
                        ? `Reported by ${find.userName}`
                        : 'Community report'}
                    </p>
                  </div>
                  <span className="text-[10px] text-[var(--color-arc-muted)] shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(find.createdAt)}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="flex items-center gap-2 text-[var(--color-arc-common)]">
                    <MapPin className="w-3.5 h-3.5 text-[var(--color-arc-rare)]" />
                    <span className="text-white">
                      {find.map || 'Unknown map'}
                    </span>
                    <span className="ml-auto text-[var(--color-arc-yellow)]">
                      {find.condition || 'Any'}
                    </span>
                    {find.locked && (
                      <Lock className="w-3 h-3 text-[var(--color-arc-yellow)]" />
                    )}
                  </p>
                  {find.container && (
                    <p className="flex items-center gap-2 text-[var(--color-arc-common)]">
                      <Package className="w-3.5 h-3.5" />
                      <span>{find.container}</span>
                    </p>
                  )}
                  {find.location && (
                    <p className="text-[var(--color-arc-common)] leading-relaxed">
                      <span className="text-[var(--color-arc-muted)]">
                        Location:
                      </span>{' '}
                      {find.location}
                    </p>
                  )}
                  {(csvIntel?.bestRoute ||
                    csvIntel?.workshopLevel ||
                    market) && (
                    <div className="border border-[#1e1e2e] bg-black/20 px-2 py-1.5 space-y-1">
                      {csvIntel?.bestRoute && (
                        <p className="text-[10px] text-[var(--color-arc-common)] leading-relaxed">
                          <span className="text-[var(--color-arc-yellow)] font-black">
                            CSV route:
                          </span>{' '}
                          {csvIntel.bestRoute}
                        </p>
                      )}
                      {csvIntel?.workshopLevel && (
                        <p className="text-[10px] text-[var(--color-arc-muted)]">
                          Workshop: {csvIntel.workshopLevel}
                        </p>
                      )}
                      {market?.count ? (
                        <p className="text-[10px] text-[var(--color-arc-rare)] font-black uppercase tracking-widest">
                          Market: {market.count} active
                          {market.lowestPrice != null
                            ? ` from ${market.lowestPrice.toLocaleString()}`
                            : ''}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => onVote(find._id, 'up')}
                    className="text-[10px] font-black uppercase tracking-widest px-2 py-1 border border-[#1e1e2e] text-[var(--color-arc-uncommon)] hover:border-[var(--color-arc-uncommon)]"
                  >
                    + {find.votes?.up ?? 0}
                  </button>
                  <button
                    onClick={() => onVote(find._id, 'down')}
                    className="text-[10px] font-black uppercase tracking-widest px-2 py-1 border border-[#1e1e2e] text-[var(--color-arc-danger)] hover:border-[var(--color-arc-danger)]"
                  >
                    - {find.votes?.down ?? 0}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}

/* ─── Blueprint card ─────────────────────────────────────────────────────── */
function BpCard({
  bp,
  ownedIds,
  stashMap,
  csvIntel,
  market,
  communityFindCount,
  onPost,
  onListMarket,
  onViewMarket,
  onLogFind,
  onOpenAtlas,
  onToggleOwned,
}: {
  bp: any;
  ownedIds: Set<string>;
  stashMap: Map<string, number>;
  csvIntel?: BlueprintCsvIntel;
  market?: BlueprintMarketSummary;
  communityFindCount?: number;
  onPost: (bp: any) => void;
  onListMarket: (bp: any) => void;
  onViewMarket: (bp: any) => void;
  onLogFind: (bp: any) => void;
  onOpenAtlas: (bp: any) => void;
  onToggleOwned: (bp: any, owned: boolean) => void;
}) {
  // Guard against undefined bp
  if (!bp || typeof bp !== 'object') {
    return null;
  }
  const [open, setOpen] = useState(false);
  // Check ownership with multiple ID variants
  const bpIdVariants = [
    bp.id,
    bp.id?.replace(/_blueprint$/, ''),
    displayName(bp.name, bp.id).toLowerCase().replace(/\s+/g, '_'),
  ];
  const owned =
    Array.isArray(bpIdVariants) &&
    bpIdVariants.some((id) => id && ownedIds.has(id));
  // Blueprints use blueprint background and their actual rarity for borders
  const BP_BG =
    RARITY_BG['Blueprint'] ||
    RARITY_GRADIENT['Blueprint'] ||
    'var(--color-arc-blueprint)';

  // Drop location data from blueprint_drops.ts
  const bpName = displayName(bp.name, bp.id);
  const drop = getDropForBlueprint(bpName);

  const mats: { id: string; name: string; qty: number }[] = useMemo(() => {
    const comps = bp.crafting_components || bp.recipe || [];
    if (!Array.isArray(comps)) return [];
    return comps.map((c: any) => {
      const item = c.item || c.component || c;
      const name = displayName(item.name, item.id ?? '');
      return { id: item.id ?? '', name, qty: c.quantity ?? 1 };
    });
  }, [bp]);

  const hasDetails = mats.length > 0 || !!drop;

  // Get rarity color for border
  const rarity = getBlueprintrarity(bp.id, bp.rarity);
  const rarityColors: Record<string, string> = {
    Legendary: '#ffcc00',
    Epic: '#c43198',
    Rare: '#01abf4',
    Uncommon: '#25bb55',
    Common: '#8a8a8a',
  };
  const borderColor = rarityColors[rarity] || '#8a8a8a';

  // Get tier from name (I, II, III, IV)
  const tierMatch = bpName.match(/\b(I{1,3}|IV)\b/);
  const tier = tierMatch ? tierMatch[1] : '';

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] ${rarity === 'Legendary' ? 'pulse-gold' : ''}`}
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: `2px solid ${borderColor}40`,
        backdropFilter: 'blur(10px)',
      }}
      onClick={() => onOpenAtlas(bp)}
    >
      {/* Hover glow effect */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 30px ${borderColor}30, 0 0 20px ${borderColor}20`,
        }}
      />

      {/* Tier Badge */}
      {tier && (
        <div
          className="absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-black z-10"
          style={{
            background: 'rgba(0,0,0,0.7)',
            border: `1px solid ${borderColor}`,
            color: borderColor,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {tier}
        </div>
      )}

      {/* Image Container with Blueprint background */}
      <div
        className="aspect-square flex items-center justify-center p-4"
        style={{
          background: BP_BG,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <ItemImg id={bp.id} name={bpName} size={80} />
        </div>
      </div>

      {/* Name Footer */}
      <div className="p-3 border-t border-white/10">
        <p
          className="text-sm font-bold text-white text-center truncate"
          style={{ fontFamily: "'Barlow', sans-serif" }}
        >
          {bpName}
        </p>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: `${borderColor}20`,
              color: borderColor,
              fontFamily: "'Barlow', sans-serif",
            }}
          >
            {rarity}
          </span>
          {owned && <span className="text-[var(--color-arc-uncommon)]">✓</span>}
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function BlueprintsPage() {
  const { blueprints: userBlueprints, stash } = usePlayer();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('all');
  const [ownedFilter, setOwnedFilter] = useState<'all' | 'owned' | 'missing'>(
    'all',
  );
  const [postTarget, setPostTarget] = useState<any | null>(null);
  const [findTarget, setFindTarget] = useState<any | null>(null);
  const [communityFinds, setCommunityFinds] = useState<BlueprintFindRecord[]>(
    [],
  );
  const [blueprintCsvIntel, setBlueprintCsvIntel] = useState<
    Record<string, BlueprintCsvIntel>
  >({});
  const [blueprintMarket, setBlueprintMarket] = useState<
    Record<string, BlueprintMarketSummary>
  >({});
  const [findsLoading, setFindsLoading] = useState(false);
  const [pageTab, setPageTab] = useState<'registry' | 'atlas'>('registry');
  const [exporting, setExporting] = useState<'' | 'img' | 'pdf'>('');
  const reportRef = useRef<HTMLDivElement>(null);
  const atlasRef = useRef<HTMLDivElement>(null);
  const [atlasSearch, setAtlasSearch] = useState('');
  const [manualOwnedIds, setManualOwnedIds] = useState<Set<string>>(new Set());
  const [detailBlueprint, setDetailBlueprint] = useState<any | null>(null);

  /* ArcTracker live blueprint ownership — fetched on mount */
  const [atBpIds, setAtBpIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    ArcTrackerAPI.userBlueprints()
      .then((data: any) => {
        const ids = new Set<string>();
        const list: any[] =
          data?.blueprints ?? data?.items ?? (Array.isArray(data) ? data : []);
        list.forEach((bp: any) => {
          if (bp?.id) ids.add(bp.id);
          if (bp?.itemID) ids.add(bp.itemID);
          if (bp?.itemId) ids.add(bp.itemId);
          if (bp?.name)
            ids.add(
              displayName(bp.name, bp.id).toLowerCase().replace(/\s+/g, '_'),
            );
        });
        setAtBpIds(ids);
      })
      .catch(() => {
        /* silent — context blueprints remain source of truth */
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    BlueprintProgressAPI.get()
      .then((data: any) => {
        if (!cancelled) setManualOwnedIds(new Set(data?.blueprints ?? []));
      })
      .catch(() => {
        if (!cancelled) setManualOwnedIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setFindsLoading(true);
    BlueprintFindAPI.list({ limit: 120 })
      .then((data: any) => {
        if (!cancelled) {
          setCommunityFinds(data?.finds ?? []);
          setBlueprintCsvIntel(data?.csvIntelByBlueprint ?? {});
          setBlueprintMarket(data?.marketplaceListingsByBlueprint ?? {});
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCommunityFinds([]);
          setBlueprintCsvIntel({});
          setBlueprintMarket({});
        }
      })
      .finally(() => {
        if (!cancelled) setFindsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* All blueprints from master DB — only actual Blueprint-type items */
  const allBlueprintItems = useMemo(
    () =>
      ALL_ITEMS.filter((item: any) => {
        const type = String(item.type || '').toLowerCase();
        const name =
          typeof item.name === 'object' ? item.name?.en || '' : item.name || '';
        return type === 'blueprint' || name.toLowerCase().includes('blueprint');
      }),
    [],
  );

  /* IDs the player owns — merged from context + ArcTracker live data */
  const ownedIds = useMemo(() => {
    const s = new Set<string>();
    const add = (bp: any) => {
      if (bp?.id) {
        s.add(bp.id);
        // Also add variant without _blueprint suffix for matching
        s.add(bp.id.replace(/_blueprint$/, ''));
      }
      if (bp?.itemID) {
        s.add(bp.itemID);
        s.add(bp.itemID.replace(/_blueprint$/, ''));
      }
      if (bp?.itemId) {
        s.add(bp.itemId);
        s.add(bp.itemId.replace(/_blueprint$/, ''));
      }
      // Handle name-based matching
      if (bp?.name) {
        const nameKey = displayName(bp.name, bp.id)
          .toLowerCase()
          .replace(/\s+/g, '_');
        s.add(nameKey);
      }
    };
    if (Array.isArray(userBlueprints)) userBlueprints.forEach(add);
    else if (Array.isArray(userBlueprints?.blueprints))
      (userBlueprints as any).blueprints.forEach(add);
    manualOwnedIds.forEach((id) => {
      s.add(id);
      s.add(id.replace(/_blueprint$/, ''));
    });
    atBpIds.forEach((id) => {
      s.add(id);
      s.add(id.replace(/_blueprint$/, ''));
    });
    return s;
  }, [userBlueprints, atBpIds, manualOwnedIds]);

  /* Stash lookup map id→qty */
  const stashMap = useMemo(() => {
    const m = new Map<string, number>();
    const items: any[] =
      (stash as any)?.items ?? (Array.isArray(stash) ? stash : []);
    items.forEach((it: any) => {
      const id = it.itemId ?? it.itemID ?? it.id ?? '';
      const name = (
        typeof it.name === 'string'
          ? it.name
          : (it.name?.en ?? it.itemName ?? '')
      ).toLowerCase();
      const qty = it.quantity ?? it.stackSize ?? 1;
      if (id) m.set(id, (m.get(id) ?? 0) + qty);
      if (name) m.set(name, (m.get(name) ?? 0) + qty);
    });
    return m;
  }, [stash]);

  // Helper to check if a blueprint is owned (handles ID variations)
  const isBlueprintOwned = (b: any) => {
    const variants = [
      b.id,
      b.id?.replace(/_blueprint$/, ''),
      displayName(b.name, b.id).toLowerCase().replace(/\s+/g, '_'),
    ];
    return variants.some((id) => id && ownedIds.has(id));
  };

  const filtered = useMemo(() => {
    let list = allBlueprintItems as any[];
    if (cat !== 'all') list = list.filter((b) => catOf(b) === cat);
    if (ownedFilter === 'owned') list = list.filter(isBlueprintOwned);
    if (ownedFilter === 'missing')
      list = list.filter((b) => !isBlueprintOwned(b));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          matchesSearchMultiLang(b.name, undefined, search) ||
          (typeof b.id === 'string' && b.id.toLowerCase().includes(q)),
      );
    }
    return list.sort((a, b) => {
      // Owned first, then by rarity
      const aOwned = isBlueprintOwned(a);
      const bOwned = isBlueprintOwned(b);
      if (aOwned !== bOwned) return aOwned ? -1 : 1;
      const order = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];
      return (
        order.indexOf(a.rarity ?? 'Common') -
        order.indexOf(b.rarity ?? 'Common')
      );
    });
  }, [allBlueprintItems, cat, ownedFilter, ownedIds, search]);

  const owned = filtered.filter(isBlueprintOwned).length;

  const communityFindCountByBlueprint = useMemo(() => {
    const counts: Record<string, number> = {};
    communityFinds.forEach((find) => {
      const key = blueprintRelationKey(find.blueprintId, find.blueprintName);
      if (key) counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [communityFinds]);

  function csvCell(value: any): string {
    const raw = String(value ?? '');
    return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
  }

  function exportBlueprintCsv() {
    const rows = filtered.map((bp: any) => {
      const csvIntel = getBlueprintRelation(blueprintCsvIntel, bp);
      const market = getBlueprintRelation(blueprintMarket, bp);
      const key = blueprintRelationKey(bp.id, displayName(bp.name, bp.id));
      return {
        id: bp.id,
        name: displayName(bp.name, bp.id),
        status: isBlueprintOwned(bp) ? 'owned' : 'missing',
        category: catOf(bp),
        rarity: bp.rarity ?? 'Common',
        csvMap: csvIntel?.map ?? '',
        csvCondition: csvIntel?.condition ?? '',
        csvContainers: csvIntel?.containers ?? '',
        csvRoute: csvIntel?.bestRoute ?? '',
        workshopLevel: csvIntel?.workshopLevel ?? '',
        communityFinds: communityFindCountByBlueprint[key] ?? 0,
        marketListings: market?.count ?? 0,
        lowestPrice: market?.lowestPrice ?? '',
      };
    });
    const headers = [
      'id',
      'name',
      'status',
      'category',
      'rarity',
      'csvMap',
      'csvCondition',
      'csvContainers',
      'csvRoute',
      'workshopLevel',
      'communityFinds',
      'marketListings',
      'lowestPrice',
    ];
    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((header) => csvCell(row[header as keyof typeof row]))
          .join(','),
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blueprint-registry-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function toggleBlueprintOwned(bp: any, owned: boolean) {
    const id = String(bp?.id ?? '').trim();
    if (!id) return;

    const previous = manualOwnedIds;
    const next = new Set(previous);
    if (owned) next.add(id);
    else next.delete(id);
    setManualOwnedIds(next);

    try {
      const data: any = await BlueprintProgressAPI.setOwned(id, owned);
      if (Array.isArray(data?.blueprints)) {
        setManualOwnedIds(new Set(data.blueprints));
      }
    } catch {
      setManualOwnedIds(previous);
    }
  }

  async function saveBlueprintFind(payload: BlueprintFindPayload) {
    const data = await BlueprintFindAPI.create(payload);
    const find = (data as any)?.find;
    if (find) {
      setCommunityFinds((prev) => [find, ...prev]);
      BlueprintFindAPI.list({ limit: 120 })
        .then((fresh: any) => {
          setBlueprintCsvIntel(fresh?.csvIntelByBlueprint ?? {});
          setBlueprintMarket(fresh?.marketplaceListingsByBlueprint ?? {});
        })
        .catch(() => {});
    }
  }

  function viewBlueprintMarket(bp: any) {
    const name =
      typeof bp.name === 'object' ? (bp.name?.en ?? bp.id) : (bp.name ?? bp.id);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'browse');
    url.searchParams.set('search', stripBlueprintSuffix(name));
    url.searchParams.set('blueprints', '1');
    window.history.pushState({}, '', url.toString());
    window.dispatchEvent(
      new CustomEvent('shiesty:navigate', {
        detail: { tab: 'marketplace' },
      }),
    );
  }

  function openBlueprintAtlas(bp: any) {
    setDetailBlueprint(bp);
  }

  function openAtlasPanel() {
    setPageTab('atlas');
    // Wait for DOM update after tab switch before scrolling
    setTimeout(() => {
      atlasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  async function voteBlueprintFind(id: string, direction: 'up' | 'down') {
    setCommunityFinds((prev) =>
      prev.map((find) =>
        find._id === id
          ? {
              ...find,
              votes: {
                up: (find.votes?.up ?? 0) + (direction === 'up' ? 1 : 0),
                down: (find.votes?.down ?? 0) + (direction === 'down' ? 1 : 0),
              },
            }
          : find,
      ),
    );
    try {
      const data = await BlueprintFindAPI.vote(id, direction);
      const updated = (data as any)?.find;
      if (updated) {
        setCommunityFinds((prev) =>
          prev.map((find) => (find._id === id ? updated : find)),
        );
      }
    } catch {
      /* optimistic vote can stay; community signal is low-stakes */
    }
  }

  // Show detail page if a blueprint is selected
  if (detailBlueprint) {
    return (
      <BlueprintDetailPage
        blueprintId={detailBlueprint.id}
        blueprintName={displayName(detailBlueprint.name, detailBlueprint.id)}
        onBack={() => setDetailBlueprint(null)}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20">
      {/* Page header - Roxban Atlas Style */}
      <div className="mb-6">
        {/* Title Row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1
              className="text-3xl font-black uppercase tracking-tight text-white mb-1"
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                textShadow: '0 0 20px rgba(34, 229, 255, 0.3)',
              }}
            >
              Blueprint Atlas
            </h1>
            <p
              className="text-sm text-[var(--color-arc-common)]"
              style={{ fontFamily: "'Barlow', sans-serif" }}
            >
              Data Source →{' '}
              <span className="text-[var(--color-arc-rare)]">
                shiestysource.csv
              </span>
            </p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            <Tooltip
              content={<LabelTooltip text="Open ARC Raiders Blueprint Atlas" />}
              side="bottom"
              delay={80}
            >
              <button
                type="button"
                onClick={openAtlasPanel}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase tracking-widest border border-[var(--color-arc-yellow)] text-[var(--color-arc-yellow)] bg-[var(--color-arc-yellow)]/10 hover:bg-[var(--color-arc-yellow)]/20 transition-colors"
              >
                <MapPin className="w-3 h-3" />
                Atlas
              </button>
            </Tooltip>
            {/* Export buttons — uses blueprintReportUtils.ts */}
            <Tooltip
              content={
                <LabelTooltip text="Export filtered blueprint tracker as CSV" />
              }
              side="bottom"
              delay={80}
            >
              <button
                onClick={exportBlueprintCsv}
                disabled={!!exporting}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase tracking-widest border border-[#1e1e2e] text-[var(--color-arc-muted)] hover:border-[var(--color-arc-uncommon)] hover:text-[var(--color-arc-uncommon)] transition-colors disabled:opacity-40 arc-btn"
              >
                <Database className="w-3 h-3" />
                CSV
              </button>
            </Tooltip>
            <Tooltip
              content={<LabelTooltip text="Export as JPEG image" />}
              side="bottom"
              delay={80}
            >
              <button
                onClick={async () => {
                  if (!reportRef.current || exporting) return;
                  setExporting('img');
                  try {
                    await downloadReportAsImage(reportRef.current);
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setExporting('');
                  }
                }}
                disabled={!!exporting}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase tracking-widest border border-[#1e1e2e] text-[var(--color-arc-muted)] hover:border-[var(--color-arc-yellow)] hover:text-arc-yellow transition-colors disabled:opacity-40 arc-btn"
              >
                {exporting === 'img' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <FileImage className="w-3 h-3" />
                )}
                JPG
              </button>
            </Tooltip>
            <Tooltip
              content={<LabelTooltip text="Export as PDF report" />}
              side="bottom"
              delay={80}
            >
              <button
                onClick={async () => {
                  if (!reportRef.current || exporting) return;
                  setExporting('pdf');
                  try {
                    await downloadReportAsPdf(reportRef.current);
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setExporting('');
                  }
                }}
                disabled={!!exporting}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase tracking-widest border border-[#1e1e2e] text-[var(--color-arc-muted)] hover:border-[var(--color-arc-rare)] hover:text-[var(--color-arc-rare)] transition-colors disabled:opacity-40"
              >
                {exporting === 'pdf' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <FileText className="w-3 h-3" />
                )}
                PDF
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Marketplace Ads Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {[
            {
              name: 'Extended Barrel II',
              rarity: 'Epic',
              offers: 14,
              icon: '🔥',
              color: '#c43198',
            },
            {
              name: 'Hullcracker',
              rarity: 'Legendary',
              offers: 8,
              icon: '🟡',
              color: '#ffcc00',
            },
            {
              name: 'Angled Grip II',
              rarity: 'Rare',
              offers: 6,
              icon: '🔵',
              color: '#01abf4',
            },
          ].map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${item.color}40`,
                backdropFilter: 'blur(10px)',
              }}
              onClick={() => {
                const bp = allBlueprintItems.find((b: any) =>
                  displayName(b.name, b.id)
                    .toLowerCase()
                    .includes(item.name.toLowerCase()),
                );
                if (bp) openBlueprintAtlas(bp);
              }}
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-lg"
                style={{
                  background: `${item.color}20`,
                  border: `1px solid ${item.color}40`,
                }}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-black text-white truncate"
                  style={{ fontFamily: "'Barlow', sans-serif" }}
                >
                  {item.name}
                </p>
                <p
                  className="text-xs"
                  style={{
                    color: item.color,
                    fontFamily: "'Barlow', sans-serif",
                  }}
                >
                  {item.rarity} • {item.offers} offers
                </p>
              </div>
              <ShoppingCart className="w-4 h-4 text-[var(--color-arc-common)]" />
            </div>
          ))}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1.5 mb-6">
        {(
          [
            ['registry', '📋 Registry'],
            ['atlas', '🗺️ Atlas Data'],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => {
              setPageTab(t);
              if (t === 'atlas') {
                setAtlasSearch(''); // Clear search when switching to full atlas
              }
            }}
            className="px-4 py-2 text-xs font-black uppercase tracking-widest border transition-colors"
            style={{
              borderColor:
                pageTab === t ? 'var(--color-arc-yellow)' : '#1e1e2e',
              color:
                pageTab === t
                  ? 'var(--color-arc-yellow)'
                  : 'var(--color-arc-common)',
              background:
                pageTab === t ? 'var(--color-arc-yellow)15' : 'transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {pageTab === 'atlas' && (
        <div ref={atlasRef}>
          <AtlasBlueprintPanel initialSearch={atlasSearch} />
        </div>
      )}

      {pageTab === 'registry' && (
        <>
          {/* Collection Progress */}
          <div className="mb-5 bg-[#0d0d14] border border-[#1e1e2e] p-4">
            <div className="flex justify-between text-sm font-black text-white mb-2">
              <span>COLLECTION PROGRESS</span>
              <span className="text-[var(--color-arc-rare)]">
                {allBlueprintItems.length > 0
                  ? Math.round((ownedIds.size / allBlueprintItems.length) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="h-2 bg-arc-light-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--color-arc-rare)] to-[var(--color-arc-uncommon)] transition-all duration-700"
                style={{
                  width: `${allBlueprintItems.length > 0 ? (ownedIds.size / allBlueprintItems.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap gap-3 mb-5">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-arc-common)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search blueprints..."
                className="w-full bg-[#0d0d14] border border-[#1e1e2e] text-white text-sm pl-9 pr-3 py-2.5 outline-none focus:border-[var(--color-arc-rare)] placeholder-[var(--color-arc-muted)]"
              />
            </div>

            {/* Owned filter */}
            <div className="flex border border-[#1e1e2e] overflow-hidden">
              {(['all', 'owned', 'missing'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setOwnedFilter(f)}
                  className="px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-colors"
                  style={{
                    background:
                      ownedFilter === f
                        ? 'var(--color-arc-rare)20'
                        : 'transparent',
                    color:
                      ownedFilter === f
                        ? 'var(--color-arc-rare)'
                        : 'var(--color-arc-common)',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {CATS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className="px-3 py-1.5 text-xs font-black uppercase tracking-wider border transition-colors"
                style={{
                  borderColor:
                    cat === c.id ? 'var(--color-arc-rare)' : '#1e1e2e',
                  color:
                    cat === c.id
                      ? 'var(--color-arc-rare)'
                      : 'var(--color-arc-common)',
                  background:
                    cat === c.id ? 'var(--color-arc-rare)15' : 'transparent',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Roxban Atlas Style 3-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_240px] gap-6 items-start">
            {/* Left Sidebar - Filters & Blueprint List */}
            <div className="space-y-4">
              {/* Search */}
              <div
                className="p-4 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-arc-common)]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search blueprints..."
                    className="w-full bg-[#0a0a10] border border-[#2a2a3a] rounded-xl text-white text-sm pl-10 pr-3 py-3 outline-none focus:border-[var(--color-arc-rare)] placeholder-[var(--color-arc-muted)]"
                    style={{ fontFamily: "'Barlow', sans-serif" }}
                  />
                </div>
              </div>

              {/* Filters */}
              <div
                className="p-4 rounded-2xl space-y-3"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <p className="text-xs font-black uppercase tracking-widest text-[var(--color-arc-muted)] mb-3">
                  Filters
                </p>

                {/* Sort Dropdown */}
                <select
                  className="w-full bg-[#0a0a10] border border-[#2a2a3a] rounded-lg text-white text-sm px-3 py-2 outline-none focus:border-[var(--color-arc-rare)]"
                  style={{ fontFamily: "'Barlow', sans-serif" }}
                  defaultValue="name"
                >
                  <option value="name">Sort: Name</option>
                  <option value="rarity">Sort: rarity</option>
                  <option value="tier">Sort: Tier</option>
                </select>

                {/* Tier Filter */}
                <select
                  className="w-full bg-[#0a0a10] border border-[#2a2a3a] rounded-lg text-white text-sm px-3 py-2 outline-none focus:border-[var(--color-arc-rare)]"
                  style={{ fontFamily: "'Barlow', sans-serif" }}
                  defaultValue="all"
                >
                  <option value="all">Tier: All</option>
                  <option value="I">Tier I</option>
                  <option value="II">Tier II</option>
                  <option value="III">Tier III</option>
                  <option value="IV">Tier IV</option>
                </select>

                {/* Container Filter */}
                <select
                  className="w-full bg-[#0a0a10] border border-[#2a2a3a] rounded-lg text-white text-sm px-3 py-2 outline-none focus:border-[var(--color-arc-rare)]"
                  style={{ fontFamily: "'Barlow', sans-serif" }}
                  defaultValue="all"
                >
                  <option value="all">Container: All</option>
                  <option value="drawer">Drawer</option>
                  <option value="box">Box</option>
                  <option value="locker">Locker</option>
                  <option value="safe">Safe</option>
                </select>
              </div>

              {/* All Blueprints List */}
              <div
                className="p-4 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <p className="text-xs font-black uppercase tracking-widest text-white mb-3 flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" />
                  All {allBlueprintItems.length} Blueprints
                </p>
                <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                  {allBlueprintItems.slice(0, 50).map((bp: any) => {
                    const bpName = displayName(bp.name, bp.id);
                    const isOwned = ownedIds.has(bp.id);
                    return (
                      <button
                        key={bp.id}
                        onClick={() => openBlueprintAtlas(bp)}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/5 flex items-center gap-2"
                        style={{ fontFamily: "'Barlow', sans-serif" }}
                      >
                        <span
                          className={
                            isOwned
                              ? 'text-[var(--color-arc-uncommon)]'
                              : 'text-[var(--color-arc-common)]'
                          }
                        >
                          {isOwned ? '✓' : '○'}
                        </span>
                        <span className="text-white truncate">{bpName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Content - Blueprint Grid */}
            <div ref={reportRef}>
              {/* Results count */}
              <p
                className="text-sm text-[var(--color-arc-common)] mb-4"
                style={{ fontFamily: "'Barlow', sans-serif" }}
              >
                Showing{' '}
                <span className="text-white font-black">{filtered.length}</span>{' '}
                blueprints ·{' '}
                <span className="text-[var(--color-arc-uncommon)] font-black">
                  {owned} owned
                </span>
                ·{' '}
                <span className="text-[var(--color-arc-danger)] font-black">
                  {filtered.length - owned} missing
                </span>
              </p>

              {/* Grid - Roxban Atlas Style */}
              {filtered.length === 0 ? (
                <div className="text-center py-20 text-[var(--color-arc-common)]">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-black uppercase tracking-widest">
                    No blueprints found
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filtered.map((bp: any) => {
                    const csvIntel = getBlueprintRelation(
                      blueprintCsvIntel,
                      bp,
                    );
                    const market = getBlueprintRelation(blueprintMarket, bp);
                    const relationKey = blueprintRelationKey(
                      bp.id,
                      displayName(bp.name, bp.id),
                    );
                    return (
                      <BpCard
                        key={bp.id}
                        bp={bp}
                        ownedIds={ownedIds}
                        stashMap={stashMap}
                        csvIntel={csvIntel}
                        market={market}
                        communityFindCount={
                          communityFindCountByBlueprint[relationKey] ?? 0
                        }
                        onPost={setPostTarget}
                        onLogFind={setFindTarget}
                        onOpenAtlas={openBlueprintAtlas}
                        onToggleOwned={toggleBlueprintOwned}
                        onViewMarket={viewBlueprintMarket}
                        onListMarket={(b: any) => {
                          const name =
                            typeof b.name === 'object'
                              ? (b.name?.en ?? b.id)
                              : (b.name ?? b.id);
                          window.dispatchEvent(
                            new CustomEvent('shiesty:navigate', {
                              detail: { tab: 'marketplace' },
                            }),
                          );
                          // Small delay so the marketplace tab renders before we push URL params
                          setTimeout(() => {
                            const url = new URL(window.location.href);
                            url.searchParams.set('tab', 'sell');
                            url.searchParams.set('blueprint', b.id ?? '');
                            url.searchParams.set('bpname', name);
                            url.searchParams.set(
                              'bprarity',
                              b.rarity ?? 'Common',
                            );
                            window.history.pushState({}, '', url.toString());
                            window.dispatchEvent(
                              new CustomEvent('shiesty:navigate', {
                                detail: { tab: 'marketplace' },
                              }),
                            );
                          }, 50);
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Sidebar - rarity Key */}
            <div
              className="p-4 rounded-2xl space-y-4"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <p className="text-xs font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" />
                rarity Key
              </p>

              <div className="space-y-3">
                {[
                  {
                    label: 'Legendary',
                    count: '<10',
                    color: '#ffcc00',
                    symbol: '🟡',
                  },
                  {
                    label: 'Very Rare',
                    count: '<20',
                    color: '#c43198',
                    symbol: '🟣',
                  },
                  {
                    label: 'Rare',
                    count: '<50',
                    color: '#01abf4',
                    symbol: '🔵',
                  },
                  {
                    label: 'Uncommon',
                    count: '<100',
                    color: '#25bb55',
                    symbol: '🟢',
                  },
                  {
                    label: 'Common',
                    count: '100+',
                    color: '#8a8a8a',
                    symbol: '⚪',
                  },
                ].map((rarity) => (
                  <div
                    key={rarity.label}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ color: rarity.color }}>
                        {rarity.symbol}
                      </span>
                      <span
                        className="text-sm text-white"
                        style={{ fontFamily: "'Barlow', sans-serif" }}
                      >
                        {rarity.label}
                      </span>
                    </div>
                    <span
                      className="text-xs text-[var(--color-arc-muted)]"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {rarity.count}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-4 mt-4">
                <p
                  className="text-xs text-[var(--color-arc-muted)] mb-2"
                  style={{ fontFamily: "'Barlow', sans-serif" }}
                >
                  Click any card to see details
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--color-arc-common)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-arc-uncommon)]"></span>
                  <span>Owned</span>
                  <span className="w-2 h-2 rounded-full bg-[var(--color-arc-common)] ml-2"></span>
                  <span>Missing</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Discord post modal */}
      {postTarget && (
        <DiscordPostPanel
          blueprint={postTarget}
          onClose={() => setPostTarget(null)}
        />
      )}
      {findTarget && (
        <BlueprintFindModal
          blueprint={findTarget}
          csvIntel={getBlueprintRelation(blueprintCsvIntel, findTarget)}
          onSubmit={saveBlueprintFind}
          onClose={() => setFindTarget(null)}
        />
      )}
    </div>
  );
}
