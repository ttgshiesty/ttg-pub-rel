import { useState, useMemo } from 'react';
import { matchesSearchMultiLang } from '../lib/searchUtils';
import {
  enrichItem,
  getItemImg,
  getItemName,
  RARITY_BG,
  RARITY_GRADIENT,
} from '../lib/itemDb';
import {
  getRarityVisualTier,
  rarityImageBackdropClass,
} from '../lib/rarityCardStyles';
import { usePlayer } from '../context/PlayerContext';
import { generateClientTags } from '../lib/tagGeneratorClient';
import type { ItemTag } from '../types/tags';
import { ItemTooltip } from '../components/ItemTooltip';
import { CATEGORY_ICON, STAT_ICON, iconProps } from '../lib/gameIcons';
import arctrackerLabels from '../data/arctracker-en.json';
import {
  Package,
  Search,
  Filter,
  ArrowUpDown,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Key,
  Crosshair,
  Shield,
  Wrench,
  FlaskConical,
  FileText,
  Gem,
} from 'lucide-react';

const STASH_LABELS = arctrackerLabels.StashPage;
const STASH_INVENTORY_LABELS = STASH_LABELS.inventory;
function getLocalItemImageUrl(item: any): string | null {
  const id =
    item?.itemId || item?.itemID || item?.item_id || item?.id || item?._id;
  return getItemImg(id) || item?.imageUrl || null;
}

// rarity color palette — matches in-game ARC Raiders loot tiers.
// Common=Grey, Uncommon=Green, Rare=Blue, Epic=Purple/Pink, Legendary=Orange.
type rarityStyle = {
  border: string;
  bg: string;
  text: string;
  glow: string;
  label: string;
};

const RARITY_BASE: Record<string, rarityStyle> = {
  legendary: {
    border: 'border-[#ffcc00]',
    bg: 'bg-[#ffcc00]/10',
    text: 'text-[#ffcc00]',
    glow: 'shadow-[0_0_12px_rgba(255,204,0,0.4)]',
    label: 'LEGENDARY',
  },
  epic: {
    border: 'border-[#c43198]',
    bg: 'bg-[#c43198]/10',
    text: 'text-[#c43198]',
    glow: 'shadow-[0_0_12px_rgba(196,49,152,0.4)]',
    label: 'EPIC',
  },
  rare: {
    border: 'border-[#01abf4]',
    bg: 'bg-[#01abf4]/10',
    text: 'text-[#01abf4]',
    glow: 'shadow-[0_0_12px_rgba(1,171,244,0.4)]',
    label: 'RARE',
  },
  uncommon: {
    border: 'border-[#25bb55]',
    bg: 'bg-[#25bb55]/10',
    text: 'text-[#25bb55]',
    glow: 'shadow-[0_0_12px_rgba(37,187,85,0.4)]',
    label: 'UNCOMMON',
  },
  common: {
    border: 'border-[#6c6b6a]',
    bg: 'bg-[#6c6b6a]/10',
    text: 'text-[#6c6b6a]',
    glow: '',
    label: 'COMMON',
  },
};

// Case-insensitive lookup so server payloads with any casing still resolve.
const RARITY_STYLES: Record<string, rarityStyle> = new Proxy(RARITY_BASE, {
  get: (target, prop) =>
    target[String(prop || '').toLowerCase()] || target.common,
});

function getItemCategory(item: any): string {
  const name = (
    (typeof item.name === 'string' ? item.name : '') ||
    item.itemName ||
    ''
  ).toLowerCase();
  const type = (item.itemType || item.type || '').toLowerCase();
  const id = (
    item.itemId ||
    item.itemID ||
    item.item_id ||
    item.id ||
    ''
  ).toLowerCase();

  if (
    name.includes('key') ||
    name.includes('card') ||
    name.includes('pass') ||
    id.includes('_key')
  )
    return 'keys';
  if (name.includes('blueprint') || type.includes('blueprint'))
    return 'blueprints';
  if (
    name.includes('venator') ||
    name.includes('renegade') ||
    name.includes('anvil') ||
    name.includes('hammer') ||
    name.includes('pistol') ||
    name.includes('rifle') ||
    name.includes('shotgun') ||
    name.includes('smg') ||
    name.includes('lmg') ||
    type.includes('weapon') ||
    type.includes('gun')
  )
    return 'weapons';
  if (
    name.includes('shield') ||
    name.includes('armor') ||
    name.includes('vest') ||
    name.includes('plate') ||
    type.includes('armor') ||
    type.includes('vest')
  )
    return 'armor';
  if (
    name.includes('augment') ||
    name.includes('looting') ||
    name.includes('mk.')
  )
    return 'augments';
  if (
    name.includes('vita') ||
    name.includes('bandage') ||
    name.includes('medkit') ||
    name.includes('stim') ||
    name.includes('inject') ||
    name.includes('adrenaline') ||
    type.includes('med') ||
    type.includes('heal')
  )
    return 'meds';
  if (
    name.includes('ammo') ||
    name.includes('magazine') ||
    name.includes('mag') ||
    name.includes('round') ||
    type.includes('ammo')
  )
    return 'ammo';
  if (
    name.includes('grenade') ||
    name.includes('seeker') ||
    name.includes('explosive') ||
    name.includes('mine') ||
    name.includes('charge')
  )
    return 'utilities';
  if (
    name.includes('grip') ||
    name.includes('stock') ||
    name.includes('scope') ||
    name.includes('muzzle') ||
    name.includes('compensator') ||
    name.includes('suppressor') ||
    name.includes('extended') ||
    name.includes('mod')
  )
    return 'weaponmods';
  if (
    type.includes('material') ||
    type.includes('scrap') ||
    name.includes('circuitry') ||
    name.includes('spring') ||
    name.includes('scrap') ||
    name.includes('component') ||
    name.includes('fragment') ||
    name.includes('alloy')
  )
    return 'materials';
  return 'misc';
}

function getCategoryIcon(category: string) {
  const src = CATEGORY_ICON[category];
  if (src) return <img {...iconProps(src, 14)} alt={category} />;
  return <Gem className="w-3.5 h-3.5" />;
}

const CATEGORY_LABELS: Record<string, string> = {
  keys: 'KEYS & ACCESS',
  weapons: 'WEAPONS',
  armor: 'ARMOR',
  augments: 'AUGMENTS',
  blueprints: 'BLUEPRINTS',
  meds: 'MEDICAL',
  ammo: 'AMMUNITION',
  utilities: 'UTILITIES',
  weaponmods: 'ATTACHMENTS',
  materials: 'MATERIALS',
  misc: 'MISC',
};

const SORT_OPTIONS = [
  { key: 'rarity', label: 'RARITY' },
  { key: 'name', label: 'NAME' },
  { key: 'value', label: 'VALUE' },
  { key: 'quantity', label: 'QTY' },
];

const RARITY_ORDER = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];

// Tag display config
const TAG_STYLES: Record<ItemTag, { label: string; classes: string }> = {
  keep: {
    label: 'KEEP',
    classes: 'bg-[#25bb55]/15 border-[#25bb55] text-[#25bb55]',
  },
  recycle: {
    label: 'RECYCLE',
    classes: 'bg-[#01abf4]/15 border-[#01abf4] text-[#01abf4]',
  },
  sell: {
    label: 'SELL',
    classes: 'bg-[#8a7a9a]/15 border-[#8a7a9a] text-[#8a7a9a]',
  },
};

export default function StashPage() {
  const {
    stash,
    playerStats,
    quests,
    projects,
    isLoading,
    error,
    authState,
    refresh,
  } = usePlayer();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [rarityFilter, setrarityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('rarity');
  const [sortDesc, setSortDesc] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const waitForExtensionSync = () =>
    new Promise<{ success: boolean; error?: string }>((resolve) => {
      let done = false;
      const handler = (event: MessageEvent) => {
        if (
          event.data?.source === 'shiestyraider-extension' &&
          event.data?.type === 'SYNC_NOW_RESULT'
        ) {
          done = true;
          window.removeEventListener('message', handler);
          resolve(event.data.data || { success: false });
        }
      };
      window.addEventListener('message', handler);
      setTimeout(() => {
        if (!done) {
          window.removeEventListener('message', handler);
          resolve({ success: false, error: 'Extension timed out' });
        }
      }, 8000);
    });

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncMessage('');
    try {
      window.postMessage(
        { source: 'shiestyraider-web', type: 'TRIGGER_SYNC_NOW' },
        '*',
      );
      const result = await waitForExtensionSync();
      if (!result.success) {
        const res = await fetch('/api/embark/sync/inventory', {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || result.error || 'Sync failed');
        }
      }
      await refresh();
      setSyncMessage('Stash synced.');
    } catch (err: any) {
      setSyncMessage(err.message || 'Sync failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Extract items from stash response and enrich with local JSON metadata
  const items = useMemo(() => {
    let raw: any[] = [];
    if (!stash) return raw;
    if (Array.isArray(stash)) raw = stash;
    else if (stash.items && Array.isArray(stash.items)) raw = stash.items;
    else if (stash.stashItems && Array.isArray(stash.stashItems))
      raw = stash.stashItems;
    else if (stash.inventory && Array.isArray(stash.inventory))
      raw = stash.inventory;
    else if (stash.data && Array.isArray(stash.data)) raw = stash.data;
    // Enrich each item — but keep server-provided fields (name, rarity, imageUrl) if present
    return raw.map((item: any) => {
      const enriched = enrichItem(item);
      return {
        ...enriched,
        // Prefer server-enriched fields over client fallbacks when server provided them
        name: item.name || enriched.name,
        rarity: item.rarity || enriched.rarity,
        type: item.type || enriched.type,
        imageUrl: item.imageUrl || enriched.imageUrl,
        // Normalize item_id -> itemId so rest of page can find it
        itemId:
          item.itemId ||
          item.itemID ||
          item.item_id ||
          item.id ||
          enriched.itemId,
      };
    });
  }, [stash]);

  // Generate keep/sell/recycle tags for every item using quest + project data
  const itemTags = useMemo<Record<string, ItemTag>>(() => {
    if (!items.length) return {};
    const questList = Array.isArray(quests) ? quests : [];
    const projectList = Array.isArray(projects) ? projects : [];
    try {
      return generateClientTags(questList, {}, projectList, items);
    } catch {
      return {};
    }
  }, [items, quests, projects]);

  const stashCapacity = useMemo(() => {
    if (!stash) return { current: 0, max: 0 };
    return {
      current: stash.currentCapacity || stash.current || items.length || 0,
      max: stash.maxCapacity || stash.max || stash.capacity || 0,
    };
  }, [stash, items]);

  const stashValue = playerStats?.stashValue || 0;

  // Get all unique categories from items
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach((item: any) => cats.add(getItemCategory(item)));
    return Array.from(cats).sort();
  }, [items]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (search) {
      result = result.filter(
        (item: any) =>
          matchesSearchMultiLang(
            item.name ?? item.itemName ?? item.itemID ?? item.id ?? '',
            item.description ?? null,
            search,
          ) ||
          (item.itemID || item.id || '')
            .toLowerCase()
            .includes(search.toLowerCase()),
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter(
        (item: any) => getItemCategory(item) === categoryFilter,
      );
    }

    if (rarityFilter !== 'all') {
      result = result.filter(
        (item: any) =>
          (item.itemrarity || item.rarity || 'Common') === rarityFilter,
      );
    }

    if (tagFilter !== 'all') {
      result = result.filter((item: any) => {
        const id = item.itemId || item.itemID || item.id || item._id || '';
        return (itemTags[id] ?? 'sell') === tagFilter;
      });
    }

    result.sort((a: any, b: any) => {
      let cmp = 0;
      switch (sortBy) {
        case 'rarity': {
          const ra = RARITY_ORDER.indexOf(a.itemrarity || a.rarity || 'Common');
          const rb = RARITY_ORDER.indexOf(b.itemrarity || b.rarity || 'Common');
          cmp = ra - rb;
          break;
        }
        case 'name':
          cmp = (a.itemName || a.name || '').localeCompare(
            b.itemName || b.name || '',
          );
          break;
        case 'value':
          cmp =
            (a.value || a.price || a.vendorCost || 0) -
            (b.value || b.price || b.vendorCost || 0);
          break;
        case 'quantity':
          cmp =
            (a.quantity || a.count || a.amount || 1) -
            (b.quantity || b.count || b.amount || 1);
          break;
      }
      return sortDesc ? -cmp : cmp;
    });

    return result;
  }, [
    items,
    search,
    categoryFilter,
    rarityFilter,
    tagFilter,
    itemTags,
    sortBy,
    sortDesc,
  ]);

  // Group by category for display
  const groupedItems = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredItems.forEach((item: any) => {
      const cat = getItemCategory(item);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredItems]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#f1aa1c] animate-spin mb-4" />
        <p className="text-[#f1aa1c] text-[10px] font-black uppercase tracking-[0.4em]">
          {STASH_LABELS.title}...
        </p>
      </div>
    );
  }

  if (authState === 'needs_token' || authState === 'token_pending') {
    return (
      <div className="max-w-7xl mx-auto px-4 mt-20 text-center">
        <div className="raider-box p-12 bg-[#1a1120] border border-[#2d1f38]">
          <Package className="w-12 h-12 text-[#f1aa1c] mx-auto mb-6" />
          <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">
            {STASH_INVENTORY_LABELS.linkRequired}
          </h2>
          <p className="text-[10px] text-[#8a7a9a] uppercase tracking-[0.3em]">
            {STASH_INVENTORY_LABELS.linkRequiredDescription}
          </p>
        </div>
      </div>
    );
  }

  if (error && !items.length) {
    return (
      <div className="max-w-7xl mx-auto px-4 mt-10">
        <div className="raider-box p-6 border-l-4 border-[#e83a3a] bg-[#e83a3a]/10 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[#e83a3a] shrink-0" />
          <p className="text-[11px] text-[#e83a3a] font-data uppercase tracking-widest">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen bg-transparent text-white pb-20 pt-6">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-2">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-6 h-6 text-[#f1aa1c]" />
                <h1 className="text-xl font-black text-white uppercase tracking-widest">
                  {STASH_LABELS.stashInventory}
                </h1>
              </div>
              <p className="text-[10px] text-[#8a7a9a] uppercase tracking-wider">
                {STASH_INVENTORY_LABELS.notSyncedDescription}
              </p>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2">
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="px-4 py-2 bg-[#f1aa1c]/10 border border-[#f1aa1c]/30 text-[#f1aa1c] text-[9px] font-black uppercase tracking-widest hover:bg-[#f1aa1c]/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {STASH_LABELS.autoSync.syncing}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    {STASH_LABELS.syncNow}
                  </>
                )}
              </button>
              {syncMessage && (
                <p className="text-[8px] text-[#8a7a9a] font-black uppercase tracking-widest">
                  {syncMessage}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#1a1120] border border-[#2d1f38] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] text-[#8a7a9a] uppercase font-black tracking-wider">
                Capacity
              </span>
              <span className="text-[9px] text-[#f1aa1c] font-black">
                {stashCapacity.current} / {stashCapacity.max || '∞'}
              </span>
            </div>
            <div className="h-2 bg-[#1a1120] rounded-sm overflow-hidden border border-[#2d1f38]">
              <div
                className="h-full bg-gradient-to-r from-[#f1aa1c] to-[#01abf4] transition-all"
                style={{
                  width: stashCapacity.max
                    ? `${Math.min((stashCapacity.current / stashCapacity.max) * 100, 100)}%`
                    : '0%',
                }}
              />
            </div>
          </div>
          <div className="bg-[#1a1120] border border-[#2d1f38] p-4">
            <span className="text-[9px] text-[#8a7a9a] uppercase font-black tracking-wider block mb-1">
              Total Items
            </span>
            <span className="text-2xl font-black text-white">
              {items.length}
            </span>
          </div>
          <div className="bg-[#1a1120] border border-[#2d1f38] p-4">
            <span className="text-[9px] text-[#8a7a9a] uppercase font-black tracking-wider block mb-1">
              {STASH_LABELS.stash} Value
            </span>
            <span className="text-2xl font-black text-[#f1aa1c]">
              ${stashValue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#1a1120] border border-[#2d1f38] p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8a7a9a]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={STASH_INVENTORY_LABELS.searchPlaceholder}
                className="w-full bg-[#050505] border border-[#2d1f38] text-white text-[11px] font-black pl-9 pr-3 py-2 focus:border-[#f1aa1c] outline-none uppercase tracking-wider"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#8a7a9a]" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-[#050505] border border-[#2d1f38] text-white text-[10px] font-black px-3 py-2 focus:border-[#f1aa1c] outline-none uppercase tracking-wider"
              >
                <option value="all">ALL CATEGORIES</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat] || cat.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* rarity Filter */}
            <div className="flex items-center gap-2">
              <Gem className="w-3.5 h-3.5 text-[#8a7a9a]" />
              <select
                value={rarityFilter}
                onChange={(e) => setrarityFilter(e.target.value)}
                className="bg-[#050505] border border-[#2d1f38] text-white text-[10px] font-black px-3 py-2 focus:border-[#f1aa1c] outline-none uppercase tracking-wider"
              >
                <option value="all">ALL RARITIES</option>
                {RARITY_ORDER.map((r) => (
                  <option key={r} value={r}>
                    {r.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Tag Filter */}
            <div className="flex items-center gap-2">
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="bg-[#050505] border border-[#2d1f38] text-white text-[10px] font-black px-3 py-2 focus:border-[#f1aa1c] outline-none uppercase tracking-wider"
              >
                <option value="all">ALL TAGS</option>
                <option value="keep">KEEP</option>
                <option value="recycle">RECYCLE</option>
                <option value="sell">SELL</option>
              </select>
            </div>

            {/* Sort */}
            <button
              onClick={() => {
                if (sortBy === 'rarity') {
                  setSortDesc(!sortDesc);
                } else {
                  setSortBy('rarity');
                  setSortDesc(true);
                }
              }}
              className="flex items-center gap-2 px-3 py-2 bg-[#050505] border border-[#2d1f38] text-[10px] font-black uppercase tracking-wider hover:border-[#8a7a9a] transition-colors"
            >
              <ArrowUpDown className="w-3 h-3" />
              {SORT_OPTIONS.find((s) => s.key === sortBy)?.label}
              {sortDesc ? '↓' : '↑'}
            </button>
          </div>
        </div>

        {/* Items Grid */}
        {items.length === 0 ? (
          <div className="bg-[#1a1120] border border-[#2d1f38] p-12 text-center">
            <Package className="w-10 h-10 text-[#2d1f38] mx-auto mb-4" />
            <p className="text-[11px] text-[#8a7a9a] font-black uppercase tracking-[0.3em]">
              NO ITEMS IN STASH
            </p>
            <p className="text-[9px] text-[#2d1f38] mt-2">
              Launch ARC Raiders and extract with loot to populate your stash.
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-[#1a1120] border border-[#2d1f38] p-12 text-center">
            <Search className="w-10 h-10 text-[#2d1f38] mx-auto mb-4" />
            <p className="text-[11px] text-[#8a7a9a] font-black uppercase tracking-[0.3em]">
              NO ITEMS MATCH YOUR FILTERS
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, catItems]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  {getCategoryIcon(category)}
                  <h3 className="text-[10px] font-black text-[#8a7a9a] uppercase tracking-widest">
                    {CATEGORY_LABELS[category] || category.toUpperCase()}
                  </h3>
                  <span className="text-[9px] text-[#8a7a9a] font-black">
                    ({catItems.length})
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {catItems.map((item: any, idx: number) => {
                    const rarity = item.rarity || item.itemrarity || 'EPIC';
                    const styles =
                      RARITY_STYLES[rarity] ||
                      RARITY_STYLES.EPIC ||
                      RARITY_STYLES.Common ||
                      RARITY_STYLES.Uncommon ||
                      RARITY_STYLES.Rare ||
                      RARITY_STYLES.Legendary ||
                      RARITY_STYLES.Epic;
                    const name = getItemName(item);
                    const qty =
                      item.quantity ||
                      item.count ||
                      item.amount ||
                      item.totalWeight ||
                      item.value ||
                      1;
                    const value =
                      item.value || item.price || item.vendorCost || 0;
                    const itemId =
                      item.itemId ||
                      item.itemID ||
                      item.id ||
                      item._id ||
                      `item-${idx}`;
                    const isKey = getItemCategory(item) === 'keys';
                    const localUrl = getLocalItemImageUrl(item);
                    const tag: ItemTag = itemTags[itemId] ?? 'sell';
                    const tagStyle = TAG_STYLES[tag];

                    const tooltipItem = {
                      id: itemId,
                      name,
                      rarity: rarity,
                      type: item.type || item.itemType || '',
                      description:
                        typeof item.description === 'string'
                          ? item.description
                          : (item.description?.en ?? ''),
                      weight: item.weightKg ?? item.weight,
                      stackSize: item.stackSize ?? item.stack_size,
                      value: value || undefined,
                    };

                    const rarityTier = getRarityVisualTier(rarity);
                    const imgBackdrop = rarityImageBackdropClass(rarityTier);

                    return (
                      <ItemTooltip
                        key={`tip-${itemId}-${idx}`}
                        item={tooltipItem}
                      >
                        <button
                          key={`${itemId}-${idx}`}
                          onClick={() => setSelectedItem(item)}
                          className={`relative text-left p-3 border ${styles.border} ${styles.bg} hover:${styles.glow} transition-all group w-full`}
                        >
                          <div
                            className={`absolute top-0 left-0 w-full h-0.5 ${styles.bg.replace('/10', '')}`}
                          />

                          {/* Item image */}
                          <div
                            className="aspect-square border border-[#1a1120] mb-2 flex items-center justify-center overflow-hidden relative"
                            style={{
                              background: '#050505',
                              backgroundImage:
                                RARITY_BG[rarity] || RARITY_GRADIENT[rarity]
                                  ? `url(${RARITY_BG[rarity] || RARITY_GRADIENT[rarity]})`
                                  : undefined,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          >
                            <div className={imgBackdrop} />
                            {localUrl ? (
                              <img
                                src={localUrl}
                                alt={name}
                                className="w-full h-full object-contain p-1 transition-transform duration-200 group-hover:scale-110"
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  if (!img.dataset.webp) {
                                    img.dataset.webp = '1';
                                    img.src = img.src.replace(
                                      /\.webp$/,
                                      '.png',
                                    );
                                  } else img.style.display = 'none';
                                }}
                              />
                            ) : (
                              <Package
                                className={`w-6 h-6 ${styles.text} opacity-30`}
                              />
                            )}
                          </div>

                          <p
                            className={`text-[9px] font-black uppercase leading-tight truncate ${styles.text}`}
                          >
                            {name}
                          </p>

                          <span
                            className={`inline-block mt-1 text-[7px] font-black uppercase px-1.5 py-0.5 border ${tagStyle.classes}`}
                          >
                            {tagStyle.label}
                          </span>

                          <div className="flex items-center justify-between mt-1.5">
                            {qty > 1 && (
                              <span className="text-[8px] text-[#8a7a9a] font-black">
                                x{qty}
                              </span>
                            )}
                            {isKey ? (
                              <Key className={`w-3 h-3 ${styles.text}`} />
                            ) : value > 0 ? (
                              <span className="text-[8px] text-[#f1aa1c] font-black">
                                ${value.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[7px] text-[#2d1f38] font-black uppercase">
                                {styles.label}
                              </span>
                            )}
                          </div>
                        </button>
                      </ItemTooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-[#1a1120] border border-[#2d1f38] max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const enriched = enrichItem(selectedItem);
              const rarity = enriched.rarity || enriched.itemrarity || 'Common';
              const styles = RARITY_STYLES[rarity] || RARITY_STYLES.Common;
              const name = getItemName(enriched);
              const qty =
                enriched.quantity || enriched.count || enriched.amount || 1;
              const value =
                enriched.value || enriched.price || enriched.vendorCost || 0;
              const localUrl = getLocalItemImageUrl(enriched);
              const description =
                typeof enriched.description === 'string'
                  ? enriched.description
                  : (enriched.description?.en ?? '');
              const modalItemId =
                enriched.itemId ||
                enriched.itemID ||
                enriched.id ||
                enriched._id ||
                '';
              const modalTag: ItemTag = itemTags[modalItemId] ?? 'sell';
              const modalTagStyle = TAG_STYLES[modalTag];

              return (
                <>
                  <div
                    className={`w-full h-1 ${styles.bg.replace('/10', '')} mb-4`}
                  />
                  <h2
                    className={`text-lg font-black uppercase tracking-widest ${styles.text} mb-2`}
                  >
                    {name}
                  </h2>
                  <div className="flex items-center flex-wrap gap-2 mb-4">
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 border ${styles.border} ${styles.bg} ${styles.text}`}
                    >
                      {rarity.toUpperCase()}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 border ${modalTagStyle.classes}`}
                    >
                      {modalTagStyle.label}
                    </span>
                    <span className="text-[9px] text-[#8a7a9a] font-black uppercase">
                      QTY: {qty}
                    </span>
                    {value > 0 && (
                      <span className="text-[9px] text-[#f1aa1c] font-black flex items-center gap-0.5">
                        <img {...iconProps(STAT_ICON.currency, 10)} alt="$" />
                        {value.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Item Image - local only */}
                  <div className="aspect-video bg-[#050505] border border-[#1a1120] mb-4 flex items-center justify-center relative overflow-hidden">
                    <div
                      className={rarityImageBackdropClass(
                        getRarityVisualTier(rarity),
                      )}
                    />
                    {localUrl ? (
                      <img
                        src={localUrl}
                        alt={name}
                        className="max-w-full max-h-full object-contain p-2 relative z-10"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          if (!img.dataset.webp) {
                            img.dataset.webp = '1';
                            img.src = img.src.replace(/\.webp$/, '.png');
                          } else img.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Package
                        className={`w-12 h-12 ${styles.text} opacity-20`}
                      />
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="space-y-2">
                    {(enriched.itemId || enriched.itemID || enriched.id) && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[#8a7a9a] uppercase">ID</span>
                        <span className="text-white font-data">
                          {enriched.itemId || enriched.itemID || enriched.id}
                        </span>
                      </div>
                    )}
                    {enriched.type && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[#8a7a9a] uppercase">Type</span>
                        <span className="text-white font-data">
                          {enriched.type}
                        </span>
                      </div>
                    )}
                    {enriched.durabilityPercent != null && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[#8a7a9a] uppercase">
                          Durability
                        </span>
                        <span
                          style={{
                            color:
                              enriched.durabilityPercent >= 80
                                ? '#f1aa1c'
                                : enriched.durabilityPercent >= 40
                                  ? '#f1aa1c'
                                  : '#e83a3a',
                          }}
                        >
                          {Math.round(enriched.durabilityPercent)}%
                        </span>
                      </div>
                    )}
                    {enriched.weightKg > 0 && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[#8a7a9a] uppercase flex items-center gap-1">
                          <img
                            {...iconProps(STAT_ICON.weight, 12)}
                            alt="Weight"
                          />{' '}
                          Weight
                        </span>
                        <span className="text-white font-data">
                          {enriched.weightKg}kg
                        </span>
                      </div>
                    )}
                    {description && (
                      <div className="text-[10px] text-[#8a7a9a] mt-3 pt-3 border-t border-[#1a1120]">
                        {description}
                      </div>
                    )}
                    {enriched.effects &&
                      Object.keys(enriched.effects).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#1a1120]">
                          <p className="text-[9px] text-[#8a7a9a] uppercase font-black mb-2">
                            Stats
                          </p>
                          {Object.entries(enriched.effects).map(
                            ([k, v]: [string, any]) => (
                              <div
                                key={k}
                                className="flex justify-between text-[10px]"
                              >
                                <span className="text-[#8a7a9a] uppercase">
                                  {k}
                                </span>
                                <span className="text-white font-data">
                                  {String(v?.value ?? v)}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set('tab', 'sell');
                        url.searchParams.set('blueprint', modalItemId);
                        url.searchParams.set('bpname', name);
                        url.searchParams.set('bprarity', rarity);
                        window.history.pushState({}, '', url.toString());
                        window.dispatchEvent(
                          new CustomEvent('shiesty:navigate', {
                            detail: { tab: 'marketplace' },
                          }),
                        );
                        setSelectedItem(null);
                      }}
                      className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest border transition-colors hover:opacity-80"
                      style={{
                        background: '#f1aa1c20',
                        borderColor: '#f1aa1c60',
                        color: '#f1aa1c',
                      }}
                    >
                      List on Market
                    </button>
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="flex-1 py-2 bg-[#1a1120] border border-[#2d1f38] text-[#8a7a9a] text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-[#8a7a9a] transition-colors"
                    >
                      CLOSE
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
