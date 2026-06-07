/**
 * MarketplacePage — Full trading floor.
 *
 * Tabs: BROWSE → SELL → MY LISTINGS → ORDERS
 *
 * Embark Verification Gate:
 *   Before ANY trade action (buy, sell, make offer) the initiating player
 *   must pass an Embark ID verification check via shiestybuddy. This confirms
 *   they are a real, linked ARC Raiders player — not a random account.
 *
 * Blueprint Link:
 *   Blueprints page can navigate here with ?tab=sell&blueprint=<id> pre-filled.
 *   "Blueprint Bulk Export" reads owned blueprints and generates listing posts.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search,
  Package,
  Send,
  Plus,
  X,
  Check,
  Loader2,
  ShoppingCart,
  Tag,
  Clock,
  RefreshCw,
  Shield,
  ChevronDown,
  ChevronUp,
  Copy,
  AlertTriangle,
  Layers,
  BookOpen,
  Zap,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { MarketplaceAPI, DiscordAPI, BlueprintProgressAPI } from '../lib/api';
import { checkEmbarkSession } from '../lib/extensionBridge';
import {
  getItemImg,
  getItemImgWebp,
  getItemData,
  ALL_ITEMS,
  RARITY_BG,
  RARITY_GRADIENT,
} from '../lib/itemDb';
import { matchesSearchMultiLang } from '../lib/searchUtils';
import { assetUrl } from '../lib/assetUrl';

const ICONS = {
  currency: assetUrl('/main/currency_icon.png'),
  backpack: assetUrl('/icons/backpack.webp'),
  refresh: assetUrl('/icons/refresh.webp'),
  shopping: assetUrl('/icons/gunicon.webp'),
  shield: assetUrl('/icons/gear.webp'),
};

/* ── Palette ──────────────────────────────────────────────────────────────── */
const Y = 'var(--color-arc-yellow)';
const M = 'var(--color-arc-muted)';
const BD = 'var(--color-arc-border)';
const BG = 'var(--color-arc-dark-background)';
const CRD = 'var(--color-arc-light-background)';

const RC: Record<string, string> = {
  legendary: 'var(--color-arc-legendary)',
  epic: 'var(--color-arc-epic)',
  rare: 'var(--color-arc-rare)',
  uncommon: 'var(--color-arc-uncommon)',
  common: 'var(--color-arc-common)',
};
const rc = (r?: string) => RC[(r ?? 'common').toLowerCase()] ?? RC.common;

/* ── Tab type ─────────────────────────────────────────────────────────────── */
type TabId = 'browse' | 'sell' | 'mylistings' | 'orders';

/* ── Listing / Order types ────────────────────────────────────────────────── */
interface Listing {
  _id: string;
  itemName: string;
  itemId?: string;
  itemType?: string;
  itemIconUrl?: string;
  itemStats?: Record<string, any>;
  itemrarity?: string;
  itemQuantity: number;
  price: number;
  currency: string;
  condition?: string;
  sellerName: string;
  sellerId?: string;
  sellerSlug?: string | null;
  sellerSales?: number;
  sellerEmbarkVerified?: boolean;
  description?: string;
  createdAt: string;
  status: string;
  wantedItems?: { id?: string; name: string; rarity?: string; qty?: number }[];
  blueprintId?: string;
  blueprintKey?: string;
  blueprintIntel?: {
    map?: string;
    condition?: string;
    containers?: string;
    bestRoute?: string;
    workshopLevel?: string;
  };
  communityFindsCount?: number;
}

interface Order {
  _id: string;
  itemName: string;
  itemId?: string;
  itemrarity?: string;
  price: number;
  currency: string;
  buyerName: string;
  sellerName: string;
  status: 'pending' | 'verified' | 'completed' | 'cancelled' | 'disputed';
  buyerEmbarkVerified?: boolean;
  sellerEmbarkVerified?: boolean;
  createdAt: string;
}

interface InventoryListingItem {
  id: string;
  name: string;
  rarity: string;
  type: string;
  icon?: string;
  quantity: number;
  isListed?: boolean;
  account: 'main' | 'trade';
  raw: any;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const diff = Date.now() - new Date(String(iso)).getTime();
    if (!Number.isFinite(diff)) return '—';
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch {
    return '—';
  }
}

function displayItemName(value: any, fallback = 'Unknown Item'): string {
  if (typeof value === 'string') return value;
  return value?.en || value?.name || value?.itemName || value?.id || fallback;
}

function titleCase(value: any, fallback = 'Common'): string {
  const raw = String(value || fallback).toLowerCase();
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function blueprintKey(value: any): string {
  return String(value || '')
    .trim()
    .replace(/[_-]?blueprint$/i, '')
    .replace(/\s+blueprint$/i, '')
    .toLowerCase()
    .replace(/\bmagazine\b/g, 'mag')
    .replace(/[^a-z0-9]+/g, '');
}

function findCatalogItem(id?: string, name?: string) {
  const cleanName = String(name || '').toLowerCase();
  return ALL_ITEMS.find((item: any) => {
    const itemName = displayItemName(item.name, item.id).toLowerCase();
    return item.id === id || (!!cleanName && itemName === cleanName);
  });
}

function normalizeInventoryItem(
  item: any,
  account: 'main' | 'trade',
): InventoryListingItem | null {
  const id =
    item?.id || item?.itemId || item?.itemID || item?.item_id || item?.slug;
  if (!id) return null;
  const catalog = findCatalogItem(id, item?.name || item?.itemName);
  const name = displayItemName(
    item?.name || item?.itemName || catalog?.name,
    id,
  );
  // Get rarity from items-master first, then fall back to provided data
  const masterData = getItemData(id);
  const rarity = titleCase(
    masterData?.rarity || item?.rarity || catalog?.rarity || 'Common',
  );
  const type = String(
    item?.type ||
      item?.itemType ||
      item?.item_type ||
      catalog?.type ||
      catalog?.item_type ||
      'unknown',
  ).toLowerCase();
  const quantity = Math.max(
    1,
    Number(
      item?.quantity ?? item?.stackSize ?? item?.amount ?? item?.count ?? 1,
    ) || 1,
  );

  return {
    id,
    name,
    rarity,
    type,
    icon: normalizeItemIconUrl(
      item?.icon || item?.imageUrl || item?.imageFilename || undefined,
    ),
    quantity,
    isListed: Boolean(item?.isListed),
    account,
    raw: item,
  };
}

function isBlueprintInventoryItem(item: InventoryListingItem | null): boolean {
  if (!item) return false;
  return (
    item.type === 'blueprint' || item.name.toLowerCase().includes('blueprint')
  );
}

/* ── Item icon ────────────────────────────────────────────────────────────── */
function ItemIcon({
  id,
  name,
  rarity,
  qty,
  size = 52,
  iconUrl,
}: {
  id?: string;
  name: string;
  rarity?: string;
  qty?: number;
  size?: number;
  iconUrl?: string;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const normalizedIconUrl = normalizeItemIconUrl(iconUrl);
  const srcs = [
    normalizedIconUrl ?? '',
    ...(id ? [getItemImg(id) ?? '', getItemImgWebp(id) ?? ''] : []),
  ].filter(Boolean);
  const src = srcs[imgIdx] ?? '';
  // Get rarity from items-master if not provided
  const masterData = id ? getItemData(id) : null;
  const finalrarity = masterData?.rarity || rarity || 'common';
  const color = rc(finalrarity);
  return (
    <div
      className="relative shrink-0 flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: CRD,
        border: `1px solid ${color}40`,
        backgroundImage:
          RARITY_BG[finalrarity ?? 'Common'] ||
          RARITY_GRADIENT[finalrarity ?? 'Common']
            ? `url(${RARITY_BG[finalrarity ?? 'Common'] || RARITY_GRADIENT[finalrarity ?? 'Common']})`
            : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          width={size - 8}
          height={size - 8}
          className="object-contain"
          onError={() => setImgIdx((i) => Math.min(i + 1, srcs.length))}
        />
      ) : (
        <Package
          style={{ width: size * 0.45, height: size * 0.45, color: BD }}
        />
      )}
      {qty !== undefined && qty > 1 && (
        <span
          className="absolute bottom-0 right-0 text-[10px] font-black px-1 leading-none"
          style={{ background: BG, color }}
        >
          x{qty}
        </span>
      )}
    </div>
  );
}

function normalizeItemIconUrl(iconUrl?: string): string | undefined {
  if (!iconUrl) return undefined;
  return assetUrl(iconUrl);
}

/* ── Embark Verified Badge ────────────────────────────────────────────────── */
function EmbarkBadge({ verified }: { verified?: boolean }) {
  if (!verified)
    return (
      <span
        className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 border"
        style={{ color: M, borderColor: `${M}40`, background: `${M}10` }}
      >
        <AlertTriangle className="w-2.5 h-2.5" /> Unverified
      </span>
    );
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 border"
      style={{
        color: 'var(--color-arc-uncommon)',
        borderColor: 'var(--color-arc-uncommon)40',
        background: 'var(--color-arc-uncommon)10',
      }}
    >
      <img
        src={assetUrl('/dont.webp')}
        alt=""
        className="w-3 h-3 object-contain"
      />
      Embark Verified
    </span>
  );
}

/* ── Embark Verification Modal ────────────────────────────────────────────── */
function EmbarkVerifyModal({
  action,
  onVerified,
  onCancel,
}: {
  action: string;
  onVerified: (id: string) => void;
  onCancel: () => void;
}) {
  const { stats } = usePlayer();
  const [step, setStep] = useState<'check' | 'verified' | 'failed'>('check');
  const [embarkId, setId] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  // Auto-check via shiestybuddy on mount
  useEffect(() => {
    checkEmbarkSession().then((session) => {
      if (session?.session?.embarkUserId) {
        setId(session.session.embarkUserId);
        setStep('verified');
      }
    });
  }, []);

  async function handleVerify() {
    if (!embarkId.trim()) {
      setError('Enter your Embark ID');
      return;
    }
    setChecking(true);
    setError('');
    try {
      const storedId = stats?.embarkId;
      if (
        storedId &&
        storedId.toLowerCase() !== embarkId.trim().toLowerCase()
      ) {
        setError("Embark ID doesn't match your linked account.");
        setStep('failed');
        setChecking(false);
        return;
      }
      const session = await checkEmbarkSession();
      if (!session) {
        setError(
          "No active Embark session. Make sure shiestybuddy is running and you're logged into ARC Raiders.",
        );
        setStep('failed');
        setChecking(false);
        return;
      }
      setStep('verified');
    } catch {
      setError('Verification failed. Try again.');
      setStep('failed');
    }
    setChecking(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-md p-6 border shadow-2xl"
        style={{
          background: CRD,
          borderColor: BD,
          borderLeftColor: Y,
          borderLeftWidth: 3,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-3 right-3"
          style={{ color: M }}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 flex items-center justify-center border"
            style={{ borderColor: `${Y}50`, background: `${Y}10` }}
          >
            <Shield className="w-5 h-5" style={{ color: Y }} />
          </div>
          <div>
            <p
              className="text-sm font-black uppercase tracking-widest"
              style={{ color: 'var(--color-arc-white)' }}
            >
              Embark Verification Required
            </p>
            <p className="text-[10px]" style={{ color: M }}>
              To {action}
            </p>
          </div>
        </div>

        {step === 'check' && (
          <>
            <p className="text-xs mb-4 leading-relaxed" style={{ color: M }}>
              All trades require Embark ID verification. This confirms you are a
              real, linked ARC Raiders player before any exchange takes place.
            </p>
            <div
              className="border p-3 mb-4"
              style={{ borderColor: BD, background: BG }}
            >
              <p
                className="text-[10px] font-black uppercase tracking-widest mb-1"
                style={{ color: Y }}
              >
                Auto-detect via shiestybuddy
              </p>
              <p className="text-[10px]" style={{ color: M }}>
                If your Chrome extension is active with an active session,
                verification happens automatically.
              </p>
            </div>
            <p
              className="text-[10px] font-black uppercase tracking-widest mb-2"
              style={{ color: M }}
            >
              Or enter manually
            </p>
            <input
              type="text"
              placeholder="Your Embark ID"
              value={embarkId}
              onChange={(e) => setId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              className="w-full px-3 py-2 text-sm mb-3 outline-none border"
              style={{
                background: BG,
                borderColor: BD,
                color: 'var(--color-arc-white)',
              }}
            />
            {error && (
              <p
                className="text-xs mb-3"
                style={{ color: 'var(--color-arc-danger)' }}
              >
                {error}
              </p>
            )}
            <button
              onClick={handleVerify}
              disabled={checking}
              className="w-full py-2.5 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: Y, color: '#000' }}
            >
              {checking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              Verify Embark ID
            </button>
          </>
        )}

        {step === 'verified' && (
          <div className="text-center py-4">
            <div
              className="w-14 h-14 mx-auto flex items-center justify-center border mb-4"
              style={{
                borderColor: 'var(--color-arc-uncommon)50',
                background: 'var(--color-arc-uncommon)10',
              }}
            >
              <Check
                className="w-7 h-7"
                style={{ color: 'var(--color-arc-uncommon)' }}
              />
            </div>
            <p
              className="text-sm font-black uppercase tracking-widest mb-1"
              style={{ color: 'var(--color-arc-uncommon)' }}
            >
              Embark Verified
            </p>
            <p className="text-xs mb-1" style={{ color: M }}>
              ID:{' '}
              <span style={{ color: 'var(--color-arc-white)' }}>
                {embarkId || stats?.embarkId || 'Confirmed'}
              </span>
            </p>
            <p className="text-[10px] mb-5" style={{ color: M }}>
              You're cleared to proceed.
            </p>
            <button
              onClick={() => onVerified(embarkId || stats?.embarkId || '')}
              className="w-full py-2.5 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2"
              style={{ background: 'var(--color-arc-uncommon)', color: '#000' }}
            >
              <Check className="w-4 h-4" /> Continue
            </button>
          </div>
        )}

        {step === 'failed' && (
          <div className="text-center py-4">
            <div
              className="w-14 h-14 mx-auto flex items-center justify-center border mb-4"
              style={{
                borderColor: 'var(--color-arc-danger)50',
                background: 'var(--color-arc-danger)10',
              }}
            >
              <X
                className="w-7 h-7"
                style={{ color: 'var(--color-arc-danger)' }}
              />
            </div>
            <p
              className="text-sm font-black uppercase tracking-widest mb-2"
              style={{ color: 'var(--color-arc-danger)' }}
            >
              Verification Failed
            </p>
            {error && (
              <p className="text-xs mb-4" style={{ color: M }}>
                {error}
              </p>
            )}
            <button
              onClick={() => {
                setStep('check');
                setError('');
              }}
              className="w-full py-2 text-xs font-black uppercase tracking-widest border"
              style={{ borderColor: Y, color: Y }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Blueprint Bulk Export Panel ──────────────────────────────────────────── */
function BlueprintBulkExport({
  onListBlueprint,
}: {
  onListBlueprint: (bp: { id: string; name: string; rarity: string }) => void;
}) {
  const { blueprints: userBlueprints } = usePlayer();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [manualOwnedIds, setManualOwnedIds] = useState<Set<string>>(new Set());

  const RARITY_ORDER: Record<string, number> = {
    Legendary: 0,
    Epic: 1,
    Rare: 2,
    Uncommon: 3,
    Common: 4,
  };
  const RARITY_EMOJI: Record<string, string> = {
    Legendary: '🟡',
    Epic: '🟣',
    Rare: '🔷',
    Uncommon: '🟢',
    Common: '⬜',
  };
  const RARITY_HINT: Record<string, string> = {
    Legendary: 'Rare drop — premium offers only.',
    Epic: 'High-demand blueprint. Open to serious offers.',
    Rare: 'Moderate value. Happy to discuss pricing.',
    Uncommon: 'Budget-friendly. DM for a quick deal.',
    Common: 'Easy to trade. Fast response.',
  };

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

  const ownedBps: any[] = useMemo(() => {
    const ownedKeys = new Set<string>();
    const addOwned = (bp: any) => {
      if (!bp) return;
      if (typeof bp === 'string') {
        ownedKeys.add(blueprintKey(bp));
        return;
      }
      const status = String(bp.status || '').toLowerCase();
      if (status === 'missing' || status === 'locked' || bp.owned === false) {
        return;
      }
      const owned =
        bp.owned === true ||
        bp.status === 'owned' ||
        bp.learned === true ||
        bp.unlocked === true ||
        (!('owned' in bp) && !status);
      if (!owned) return;
      [bp.id, bp.itemId, bp.itemID, bp.name]
        .filter(Boolean)
        .forEach((value) => {
          ownedKeys.add(blueprintKey(value));
        });
    };
    if (Array.isArray(userBlueprints)) userBlueprints.forEach(addOwned);
    else if (Array.isArray((userBlueprints as any)?.blueprints)) {
      (userBlueprints as any).blueprints.forEach(addOwned);
    }
    manualOwnedIds.forEach((id) => ownedKeys.add(blueprintKey(id)));

    return ALL_ITEMS.filter((item: any) => {
      const type = String(item.type || '').toLowerCase();
      const name = displayItemName(item.name, item.id);
      const isBlueprint =
        type === 'blueprint' || name.toLowerCase().includes('blueprint');
      if (!isBlueprint) return false;
      return (
        ownedKeys.has(blueprintKey(item.id)) ||
        ownedKeys.has(blueprintKey(name))
      );
    })
      .map((item: any) => ({
        id: item.id,
        name: displayItemName(item.name, item.id).replace(/\s+Blueprint$/i, ''),
        rarity: item.rarity ?? 'Common',
      }))
      .sort((a: any, b: any) => {
        const ra = RARITY_ORDER[a.rarity ?? 'Common'] ?? 5;
        const rb = RARITY_ORDER[b.rarity ?? 'Common'] ?? 5;
        return ra !== rb ? ra - rb : (a.name ?? '').localeCompare(b.name ?? '');
      });
  }, [manualOwnedIds, userBlueprints]);

  function generateText(bp: any): string {
    const r = bp.rarity ?? 'Common';
    const emoji = RARITY_EMOJI[r] ?? '📄';
    const hint = RARITY_HINT[r] ?? 'Open to offers.';
    return [
      `${emoji} [${r}] ${bp.name} Blueprint — ARC Raiders`,
      '',
      `Selling my extra ${bp.name} blueprint.`,
      `💰 ${hint}`,
      '💬 DM on Discord to arrange the trade.',
      '',
      `#ARCRaiders #Blueprint #${r} #SHIESTY-RAIDERS`,
    ].join('\n');
  }

  useEffect(() => {
    if (open && ownedBps.length > 0)
      setSelected(new Set(ownedBps.map((b: any) => b.id)));
  }, [open, ownedBps]);

  async function copySelected() {
    const items = ownedBps.filter((b: any) => selected.has(b.id));
    await navigator.clipboard.writeText(
      items.map(generateText).join('\n\n' + '─'.repeat(40) + '\n\n'),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!ownedBps.length) return null;

  return (
    <div className="border" style={{ borderColor: BD, background: CRD }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" style={{ color: Y }} />
          <span
            className="text-xs font-black uppercase tracking-widest"
            style={{ color: 'var(--color-arc-white)' }}
          >
            Blueprint Bulk Export
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 font-black"
            style={{ background: `${Y}20`, color: Y }}
          >
            {ownedBps.length} owned
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4" style={{ color: M }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: M }} />
        )}
      </button>

      {open && (
        <div className="border-t px-4 pb-4" style={{ borderColor: BD }}>
          <p
            className="text-[10px] mt-3 mb-3 leading-relaxed"
            style={{ color: M }}
          >
            Select blueprints to generate ready-to-paste Discord trade posts, or
            hit "List" to go straight to the sell form.
          </p>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() =>
                selected.size === ownedBps.length
                  ? setSelected(new Set())
                  : setSelected(new Set(ownedBps.map((b: any) => b.id)))
              }
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: Y }}
            >
              {selected.size === ownedBps.length
                ? 'Deselect All'
                : 'Select All'}
            </button>
            <button
              onClick={copySelected}
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border disabled:opacity-40"
              style={{ borderColor: Y, color: Y, background: `${Y}10` }}
            >
              {copied ? (
                <Check className="w-3 h-3" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copied ? 'Copied!' : `Copy ${selected.size} Posts`}
            </button>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {ownedBps.map((bp: any) => {
              const color = rc(bp.rarity);
              const isSel = selected.has(bp.id);
              return (
                <div
                  key={bp.id}
                  className="flex items-center gap-3 px-3 py-2 border cursor-pointer"
                  style={{
                    borderColor: isSel ? `${color}60` : BD,
                    background: isSel ? `${color}08` : BG,
                  }}
                  onClick={() =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      next.has(bp.id) ? next.delete(bp.id) : next.add(bp.id);
                      return next;
                    })
                  }
                >
                  <div
                    className="w-4 h-4 border flex items-center justify-center shrink-0"
                    style={{
                      borderColor: isSel ? color : BD,
                      background: isSel ? `${color}20` : 'transparent',
                    }}
                  >
                    {isSel && (
                      <Check className="w-2.5 h-2.5" style={{ color }} />
                    )}
                  </div>
                  <ItemIcon
                    id={bp.id}
                    name={bp.name}
                    rarity={bp.rarity}
                    size={32}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-black truncate"
                      style={{ color: 'var(--color-arc-white)' }}
                    >
                      {bp.name}
                    </p>
                    <p className="text-[10px]" style={{ color }}>
                      {bp.rarity ?? 'Common'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onListBlueprint({
                        id: bp.id,
                        name: bp.name,
                        rarity: bp.rarity ?? 'Common',
                      });
                    }}
                    className="shrink-0 text-[10px] font-black uppercase tracking-widest px-2 py-1 border"
                    style={{
                      borderColor: `${Y}50`,
                      color: Y,
                      background: `${Y}10`,
                    }}
                  >
                    List
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Barter Card ──────────────────────────────────────────────────────────── */
function BarterCard({
  listing,
  isOwn,
  onBuy,
  onCancel,
  onDiscord,
}: {
  listing: Listing;
  isOwn: boolean;
  onBuy: (l: Listing) => void;
  onCancel: (id: string) => void;
  onDiscord: (l: Listing) => void;
}) {
  if (!listing) return null;
  const safeStr = (v: any) => (v == null ? '' : String(v));
  const color = rc(listing.itemrarity);
  const sellerName = safeStr(listing.sellerName) || '?';
  const itemName = safeStr(listing.itemName) || 'Unknown Item';
  const isBlueprintListing =
    Boolean(listing.blueprintId || listing.itemStats?.blueprintId) ||
    String(listing.itemType || '').toLowerCase() === 'blueprint' ||
    itemName.toLowerCase().includes('blueprint');
  const wanted = listing.wantedItems ?? listing.itemStats?.wantedItems ?? [];
  const price = Number(listing.price ?? 0);
  return (
    <div
      className="flex flex-col border"
      style={{
        borderColor: BD,
        borderTopColor: color,
        borderTopWidth: 2,
        background: CRD,
      }}
    >
      {/* Trader header */}
      <div
        className="flex items-center gap-3 px-4 pt-3 pb-2 border-b"
        style={{ borderColor: BD }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0"
          style={{
            background: `${color}20`,
            border: `1px solid ${color}40`,
            color,
          }}
        >
          {sellerName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-black truncate"
            style={{ color: 'var(--color-arc-white)' }}
          >
            {sellerName}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <EmbarkBadge verified={listing.sellerEmbarkVerified} />
            {listing.sellerSales !== undefined && (
              <span className="text-[10px]" style={{ color: M }}>
                {listing.sellerSales} trades
              </span>
            )}
            {listing.sellerSlug && (
              <a
                href={`/u/${listing.sellerSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-black uppercase tracking-[0.2em] hover:underline"
                style={{ color: Y }}
              >
                View Profile →
              </a>
            )}
          </div>
        </div>
        {isOwn ? (
          <button
            onClick={() => onCancel(listing._id)}
            className="text-[10px] font-black uppercase px-3 py-1.5 border shrink-0"
            style={{
              borderColor: 'var(--color-arc-danger)40',
              color: 'var(--color-arc-danger)',
            }}
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={() => onBuy(listing)}
            className="text-[10px] font-black uppercase px-3 py-1.5 shrink-0"
            style={{
              background: `${color}20`,
              border: `1px solid ${color}50`,
              color,
            }}
          >
            Trade
          </button>
        )}
      </div>

      {/* Offering zone */}
      <div className="px-4 pt-3 pb-2">
        <p
          className="text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5"
          style={{ color: M }}
        >
          <Tag className="w-3 h-3" /> Offering
        </p>
        <div className="flex items-center gap-3">
          <ItemIcon
            id={listing.itemId}
            name={itemName}
            rarity={listing.itemrarity}
            qty={listing.itemQuantity}
            iconUrl={listing.itemIconUrl}
            size={56}
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-black truncate"
              style={{ color: 'var(--color-arc-white)' }}
            >
              {itemName}
            </p>
            <p className="text-xs mt-0.5" style={{ color }}>
              {listing.itemrarity ?? 'Common'}
            </p>
            {isBlueprintListing && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span
                  className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 inline-block"
                  style={{
                    background: `${Y}15`,
                    color: Y,
                    border: `1px solid ${Y}30`,
                  }}
                >
                  Blueprint
                </span>
                {listing.communityFindsCount ? (
                  <span
                    className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 inline-block"
                    style={{
                      background: 'var(--color-arc-rare)12',
                      color: 'var(--color-arc-rare)',
                      border: '1px solid var(--color-arc-rare)35',
                    }}
                  >
                    {listing.communityFindsCount} finds
                  </span>
                ) : null}
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <p
              className="text-base font-black"
              style={{ color: 'var(--color-arc-white)' }}
            >
              {price > 0 ? price.toLocaleString() : '—'}
            </p>
            <p className="text-[10px] uppercase" style={{ color: M }}>
              {listing.currency}
            </p>
          </div>
        </div>
      </div>

      {/* Wanted zone */}
      {wanted.length > 0 && (
        <div className="px-4 pt-2 pb-2 border-t" style={{ borderColor: BD }}>
          <p
            className="text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5"
            style={{ color: M }}
          >
            <Search className="w-3 h-3" /> Wanting
          </p>
          <div className="flex flex-wrap gap-2">
            {wanted.map((w: any, i: number) => (
              <ItemIcon
                key={i}
                id={w.id}
                name={w.name}
                rarity={w.rarity}
                qty={w.qty}
                size={44}
              />
            ))}
          </div>
        </div>
      )}

      {listing.description && (
        <div className="px-4 pt-1 pb-2">
          <p
            className="text-xs leading-relaxed line-clamp-2"
            style={{ color: M }}
          >
            {listing.description}
          </p>
        </div>
      )}

      {isBlueprintListing && listing.blueprintIntel && (
        <div className="px-4 pt-1 pb-2">
          <div className="border px-2 py-1.5" style={{ borderColor: BD }}>
            <p className="text-[10px] leading-relaxed" style={{ color: M }}>
              <span className="font-black uppercase" style={{ color: Y }}>
                CSV intel:
              </span>{' '}
              {listing.blueprintIntel.map || 'Any map'}
              {listing.blueprintIntel.containers
                ? ` · ${listing.blueprintIntel.containers}`
                : ''}
              {listing.blueprintIntel.workshopLevel
                ? ` · ${listing.blueprintIntel.workshopLevel}`
                : ''}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="mt-auto px-4 py-2 flex items-center justify-between border-t"
        style={{ borderColor: BD }}
      >
        <div className="flex items-center gap-1" style={{ color: M }}>
          <Clock className="w-3 h-3" />
          <span className="text-[10px]">{timeAgo(listing.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onBuy(listing)}
            className="text-[10px] font-black uppercase px-3 py-1.5 flex items-center gap-1.5"
            style={{ background: Y, color: '#000' }}
          >
            <Zap className="w-3 h-3" /> Buy
          </button>
          <button
            onClick={() => onDiscord(listing)}
            className="text-[10px] font-black uppercase px-2 py-1.5 border"
            style={{ borderColor: BD, color: M }}
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Order status badge ───────────────────────────────────────────────────── */
function OrderBadge({ status }: { status: Order['status'] }) {
  const map: Record<string, { color: string; label: string }> = {
    pending: { color: Y, label: 'Pending' },
    verified: { color: 'var(--color-arc-uncommon)', label: 'Verified' },
    completed: { color: 'var(--color-arc-rare)', label: 'Completed' },
    cancelled: { color: M, label: 'Cancelled' },
    disputed: { color: 'var(--color-arc-danger)', label: 'Disputed' },
  };
  const { color, label } = map[status] ?? map.pending;
  return (
    <span
      className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border"
      style={{ color, borderColor: `${color}40`, background: `${color}12` }}
    >
      {label}
    </span>
  );
}

/* ── Discord Post Panel ───────────────────────────────────────────────────── */
function DiscordPanel({
  listing,
  onClose,
}: {
  listing: Listing;
  onClose: () => void;
}) {
  const [type, setType] = useState<'offer' | 'want'>('offer');
  const [price, setPrice] = useState(
    listing.price > 0 ? String(listing.price) : '',
  );
  const [note, setNote] = useState('');
  const [st, setSt] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');
  const color = rc(listing.itemrarity);

  async function send() {
    setSt('sending');
    try {
      await DiscordAPI.notifyBlueprint({
        type,
        itemName: listing.itemName,
        itemId: listing.itemId ?? listing._id,
        rarity: listing.itemrarity ?? 'Common',
        imageUrl: listing.itemId
          ? (getItemImg(listing.itemId) ?? undefined)
          : undefined,
        price: price ? Number(price) : undefined,
        note: note || undefined,
      });
      setSt('ok');
      setMsg('Posted to Discord!');
    } catch (e: any) {
      setSt('err');
      setMsg(e.message || 'Failed.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md p-6 border shadow-2xl"
        style={{
          background: CRD,
          borderColor: BD,
          borderLeftColor: color,
          borderLeftWidth: 3,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3"
          style={{ color: M }}
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <ItemIcon
            id={listing.itemId}
            name={listing.itemName}
            rarity={listing.itemrarity}
            iconUrl={listing.itemIconUrl}
            size={48}
          />
          <div>
            <p
              className="text-sm font-black uppercase tracking-wider"
              style={{ color: 'var(--color-arc-white)' }}
            >
              {listing.itemName}
            </p>
            <p className="text-xs font-bold mt-0.5" style={{ color }}>
              {listing.itemrarity ?? 'Common'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          {(['offer', 'want'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="flex-1 py-2 text-xs font-black uppercase tracking-widest border"
              style={{
                borderColor: type === t ? color : BD,
                color: type === t ? color : M,
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
          className="w-full px-3 py-2 text-sm mb-3 outline-none border"
          style={{
            background: BG,
            borderColor: BD,
            color: 'var(--color-arc-white)',
          }}
        />
        <textarea
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 text-sm mb-4 outline-none border resize-none"
          style={{
            background: BG,
            borderColor: BD,
            color: 'var(--color-arc-white)',
          }}
        />
        <button
          onClick={send}
          disabled={st === 'sending' || st === 'ok'}
          className="w-full py-2.5 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: color, color: '#000' }}
        >
          {st === 'sending' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {st === 'ok' ? 'Posted!' : st === 'err' ? 'Retry' : 'Post to Discord'}
        </button>
        {msg && (
          <p
            className={`text-xs mt-2 text-center ${st === 'ok' ? 'text-[var(--color-arc-uncommon)]' : 'text-[var(--color-arc-danger)]'}`}
          >
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Create Listing Modal ─────────────────────────────────────────────────── */
function CreateListingModal({
  prefill,
  onClose,
  onCreated,
}: {
  prefill?: {
    itemId?: string;
    itemName?: string;
    rarity?: string;
    isBlueprintListing?: boolean;
  };
  onClose: () => void;
  onCreated: () => void;
}) {
  const { stats, profile } = usePlayer();
  // Verified if the player has linked their Embark account (embarkLinked from /api/player/me)
  const embarkVerified = !!stats?.embarkLinked;

  const [itemName, setItemName] = useState(prefill?.itemName ?? '');
  const [itemId, setItemId] = useState(prefill?.itemId ?? '');
  const [rarity, setrarity] = useState(titleCase(prefill?.rarity ?? 'Common'));
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('credits');
  const [condition, setCondition] = useState('mint');
  const [desc, setDesc] = useState('');
  const [isBp, setIsBp] = useState(prefill?.isBlueprintListing ?? false);
  const [wantedItems, setWanted] = useState<string[]>([]);
  const [wantedInput, setWInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [itemSearch, setItemSearch] = useState(prefill?.itemName ?? '');
  const [results, setResults] = useState<any[]>([]);
  const [showRes, setShowRes] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryListingItem[]>(
    [],
  );
  const [selectedInventoryItem, setSelectedInventoryItem] =
    useState<InventoryListingItem | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Clear error and reset state when modal opens
  useEffect(() => {
    setError('');
    setSubmitting(false);
  }, []);

  // Handle click outside to close search results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowRes(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!itemSearch.trim() || itemSearch.length < 2) {
      setResults(inventoryItems.filter((it) => !it.isListed).slice(0, 12));
      return;
    }
    const q = itemSearch.toLowerCase();
    const r = inventoryItems.filter(
      (it) =>
        !it.isListed &&
        (matchesSearchMultiLang(it.name, null, itemSearch) ||
          it.id.toLowerCase().includes(q) ||
          it.account.includes(q)),
    );
    setResults(r);
    setShowRes(r.length > 0);
  }, [inventoryItems, itemSearch]);

  useEffect(() => {
    let cancelled = false;
    setInventoryLoading(true);
    Promise.allSettled([
      MarketplaceAPI.stashItems('main'),
      MarketplaceAPI.stashItems('trade'),
    ])
      .then((responses) => {
        if (cancelled) return;
        const next: InventoryListingItem[] = [];
        responses.forEach((res, idx) => {
          if (res.status !== 'fulfilled') return;
          const account = idx === 0 ? 'main' : 'trade';
          const items = Array.isArray((res.value as any)?.items)
            ? (res.value as any).items
            : [];
          items.forEach((item: any) => {
            const normalized = normalizeInventoryItem(item, account);
            if (normalized) next.push(normalized);
          });
        });
        const deduped = [
          ...new Map(next.map((it) => [`${it.account}:${it.id}`, it])).values(),
        ];
        setInventoryItems(deduped);

        if (prefill?.itemId || prefill?.itemName) {
          const prefillName = String(prefill.itemName || '').toLowerCase();
          const match = deduped.find(
            (it) =>
              it.id === prefill.itemId ||
              it.id.replace(/_blueprint$/, '') ===
                String(prefill.itemId || '').replace(/_blueprint$/, '') ||
              (!!prefillName && it.name.toLowerCase() === prefillName),
          );
          if (match) {
            selectItem(match);
          } else {
            setError(
              'That blueprint is not in your synced inventory stash, so it cannot be listed yet.',
            );
          }
        }
      })
      .catch((e: any) => {
        if (!cancelled) {
          setError(e.message || 'Could not load your inventory.');
        }
      })
      .finally(() => {
        if (!cancelled) setInventoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [prefill?.itemId, prefill?.itemName]);

  function selectItem(it: InventoryListingItem) {
    const n = it.name;
    setSelectedInventoryItem(it);
    setItemId(it.id);
    setItemName(n);
    setrarity(it.rarity);
    setItemSearch(n);
    setIsBp(isBlueprintInventoryItem(it));
    if (Number(qty) > it.quantity) setQty(String(it.quantity));
    setShowRes(false);
    setError('');
  }

  async function handleSubmit() {
    if (!profile) {
      setError('Please log in to access the marketplace.');
      return;
    }
    if (!selectedInventoryItem) {
      setError('Select an item from your synced inventory.');
      return;
    }
    if (selectedInventoryItem.isListed) {
      setError('That inventory item is already listed.');
      return;
    }
    const quantity = Number(qty);
    if (!Number.isFinite(quantity) || quantity < 1) {
      setError('Enter a valid quantity');
      return;
    }
    if (quantity > selectedInventoryItem.quantity) {
      setError(`You only have ${selectedInventoryItem.quantity} available.`);
      return;
    }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      setError('Enter a valid price');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await MarketplaceAPI.list({
        stashItemRef: selectedInventoryItem.id,
        itemName: selectedInventoryItem.name || itemName,
        itemType:
          selectedInventoryItem.type || (isBp ? 'blueprint' : 'unknown'),
        itemrarity: rarity.toLowerCase(),
        itemIconUrl:
          getItemImg(selectedInventoryItem.id) ||
          getItemImgWebp(selectedInventoryItem.id) ||
          selectedInventoryItem.icon ||
          '',
        itemQuantity: quantity,
        price: Number(price),
        currency,
        condition,
        description: desc,
        itemStats: {
          account: selectedInventoryItem.account,
          wantedItems: wantedItems.map((n) => ({ name: n })),
          blueprintId: isBp ? itemId : undefined,
          sellerEmbarkVerified: true,
          sellerEmbarkId: stats?.embarkId,
        },
      });
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to create listing');
    }
    setSubmitting(false);
  }

  const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  const CURRENCIES = [
    { value: 'credits', label: 'Credits' },
    { value: 'tokens', label: 'Tokens' },
  ];
  const CONDITIONS = [
    { value: 'mint', label: 'Mint' },
    { value: 'used', label: 'Used' },
    { value: 'damaged', label: 'Damaged' },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/70"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 border shadow-2xl"
          style={{ background: CRD, borderColor: BD }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3"
            style={{ color: M }}
          >
            <X className="w-4 h-4" />
          </button>
          <p
            className="text-sm font-black uppercase tracking-widest mb-5"
            style={{ color: 'var(--color-arc-white)' }}
          >
            Create Listing
          </p>

          {/* Embark status bar */}
          <div
            className="flex items-center gap-2 mb-4 p-3 border"
            style={{
              borderColor: embarkVerified
                ? 'var(--color-arc-uncommon)40'
                : `${Y}40`,
              background: embarkVerified
                ? 'var(--color-arc-uncommon)10'
                : `${Y}10`,
            }}
          >
            {embarkVerified ? (
              <>
                <Check
                  className="w-4 h-4 shrink-0"
                  style={{ color: 'var(--color-arc-uncommon)' }}
                />
                <p
                  className="text-xs font-black"
                  style={{ color: 'var(--color-arc-uncommon)' }}
                >
                  Embark Verified
                  {stats?.embarkUsername
                    ? ` — ${stats.embarkUsername}`
                    : " — you're cleared to trade"}
                </p>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 shrink-0" style={{ color: Y }} />
                <p className="text-xs font-black" style={{ color: Y }}>
                  Link your Embark account in Settings to post listings
                </p>
              </>
            )}
          </div>

          {/* Inventory status bar */}
          <div
            className="flex items-center gap-2 mb-4 p-3 border"
            style={{ borderColor: BD, background: BG }}
          >
            {inventoryLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: M }} />
            ) : (
              <Package className="w-4 h-4" style={{ color: Y }} />
            )}
            <p className="text-xs font-black" style={{ color: M }}>
              {inventoryLoading
                ? 'Loading synced inventory...'
                : `${inventoryItems.filter((it) => !it.isListed).length} inventory items available to list`}
            </p>
          </div>

          {/* Blueprint toggle */}
          <div
            className="flex items-center gap-3 mb-4 p-3 border"
            style={{
              borderColor: isBp ? `${Y}50` : BD,
              background: isBp ? `${Y}08` : BG,
            }}
          >
            <div
              className="w-4 h-4 border flex items-center justify-center shrink-0"
              style={{
                borderColor: isBp ? Y : BD,
                background: isBp ? `${Y}20` : 'transparent',
              }}
            >
              {isBp && <Check className="w-2.5 h-2.5" style={{ color: Y }} />}
            </div>
            <BookOpen className="w-4 h-4" style={{ color: Y }} />
            <p
              className="text-xs font-black uppercase tracking-wide"
              style={{ color: 'var(--color-arc-white)' }}
            >
              {isBp
                ? 'Inventory blueprint detected'
                : 'Listing type follows inventory item'}
            </p>
          </div>

          {/* Item search */}
          <div ref={searchRef} className="relative mb-3">
            <label
              className="text-[10px] font-black uppercase tracking-widest mb-1 block"
              style={{ color: M }}
            >
              Item
            </label>
            <input
              placeholder="Search your synced inventory..."
              value={itemSearch}
              onChange={(e) => {
                setItemSearch(e.target.value);
                setItemName(e.target.value);
                setItemId('');
                setSelectedInventoryItem(null);
                setIsBp(false);
              }}
              onFocus={() => results.length > 0 && setShowRes(true)}
              className="w-full px-3 py-2 text-sm outline-none border"
              style={{
                background: BG,
                borderColor: BD,
                color: 'var(--color-arc-white)',
              }}
            />
            {showRes && (
              <div
                className="absolute top-full left-0 right-0 z-50 border max-h-48 overflow-y-auto"
                style={{ background: CRD, borderColor: BD }}
              >
                {results.map((it: InventoryListingItem) => {
                  const n = it.name;
                  return (
                    <button
                      key={`${it.account}:${it.id}`}
                      onClick={() => selectItem(it)}
                      disabled={it.isListed}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-white/5 disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      <ItemIcon
                        id={it.id}
                        name={n}
                        rarity={it.rarity}
                        size={28}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-black truncate"
                          style={{ color: 'var(--color-arc-white)' }}
                        >
                          {n}
                        </p>
                        <p
                          className="text-[10px]"
                          style={{ color: rc(it.rarity) }}
                        >
                          {it.rarity} · {it.account} stash · x{it.quantity}
                          {it.isListed ? ' · already listed' : ''}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedInventoryItem && (
            <div
              className="mb-3 p-3 border flex items-center gap-3"
              style={{ borderColor: `${Y}35`, background: `${Y}08` }}
            >
              <ItemIcon
                id={selectedInventoryItem.id}
                name={selectedInventoryItem.name}
                rarity={selectedInventoryItem.rarity}
                qty={selectedInventoryItem.quantity}
                size={38}
              />
              <div className="min-w-0">
                <p
                  className="text-xs font-black truncate"
                  style={{ color: 'var(--color-arc-white)' }}
                >
                  {selectedInventoryItem.name}
                </p>
                <p className="text-[10px]" style={{ color: M }}>
                  Verified from {selectedInventoryItem.account} stash · max x
                  {selectedInventoryItem.quantity}
                </p>
              </div>
            </div>
          )}

          {/* rarity + Qty */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label
                className="text-[10px] font-black uppercase tracking-widest mb-1 block"
                style={{ color: M }}
              >
                rarity
              </label>
              <select
                value={rarity}
                onChange={(e) => setrarity(e.target.value)}
                className="w-full px-3 py-2 text-sm outline-none border"
                style={{ background: BG, borderColor: BD, color: rc(rarity) }}
              >
                {RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="text-[10px] font-black uppercase tracking-widest mb-1 block"
                style={{ color: M }}
              >
                Quantity
              </label>
              <input
                type="number"
                min={1}
                max={selectedInventoryItem?.quantity ?? undefined}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full px-3 py-2 text-sm outline-none border"
                style={{
                  background: BG,
                  borderColor: BD,
                  color: 'var(--color-arc-white)',
                }}
              />
            </div>
          </div>

          {/* Price + Currency */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label
                className="text-[10px] font-black uppercase tracking-widest mb-1 block"
                style={{ color: M }}
              >
                Price
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 text-sm outline-none border"
                style={{
                  background: BG,
                  borderColor: BD,
                  color: 'var(--color-arc-white)',
                }}
              />
            </div>
            <div>
              <label
                className="text-[10px] font-black uppercase tracking-widest mb-1 block"
                style={{ color: M }}
              >
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-sm outline-none border"
                style={{
                  background: BG,
                  borderColor: BD,
                  color: 'var(--color-arc-white)',
                }}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Condition */}
          <div className="mb-3">
            <label
              className="text-[10px] font-black uppercase tracking-widest mb-1 block"
              style={{ color: M }}
            >
              Condition
            </label>
            <div className="flex gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCondition(c.value)}
                  className="flex-1 py-1.5 text-[10px] font-black uppercase border"
                  style={{
                    borderColor: condition === c.value ? Y : BD,
                    color: condition === c.value ? Y : M,
                    background:
                      condition === c.value ? `${Y}12` : 'transparent',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Wanted items */}
          <div className="mb-3">
            <label
              className="text-[10px] font-black uppercase tracking-widest mb-1 block"
              style={{ color: M }}
            >
              Wanting in Return (optional)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                placeholder="Item name..."
                value={wantedInput}
                onChange={(e) => setWInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && wantedInput.trim()) {
                    setWanted((p) => [...p, wantedInput.trim()]);
                    setWInput('');
                  }
                }}
                className="flex-1 px-3 py-2 text-sm outline-none border"
                style={{
                  background: BG,
                  borderColor: BD,
                  color: 'var(--color-arc-white)',
                }}
              />
              <button
                onClick={() => {
                  if (wantedInput.trim()) {
                    setWanted((p) => [...p, wantedInput.trim()]);
                    setWInput('');
                  }
                }}
                className="px-3 border"
                style={{ borderColor: BD, color: M }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {wantedItems.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {wantedItems.map((w, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 text-[10px] font-black px-2 py-1 border"
                    style={{
                      borderColor: BD,
                      color: 'var(--color-arc-white)',
                      background: BG,
                    }}
                  >
                    {w}
                    <button
                      onClick={() =>
                        setWanted((p) => p.filter((_, j) => j !== i))
                      }
                      style={{ color: M }}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Note */}
          <div className="mb-4">
            <label
              className="text-[10px] font-black uppercase tracking-widest mb-1 block"
              style={{ color: M }}
            >
              Note (optional)
            </label>
            <textarea
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Any extra info for the buyer..."
              className="w-full px-3 py-2 text-sm outline-none border resize-none"
              style={{
                background: BG,
                borderColor: BD,
                color: 'var(--color-arc-white)',
              }}
            />
          </div>

          {error && (
            <p
              className="text-xs mb-3"
              style={{ color: 'var(--color-arc-danger)' }}
            >
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-2.5 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: Y, color: '#000' }}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {embarkVerified ? 'Post Listing' : 'Verify & Post'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Buy Confirm Modal ────────────────────────────────────────────────────── */
function BuyModal({
  listing,
  onClose,
  onConfirmed,
}: {
  listing: Listing;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [verified, setVerified] = useState(false);
  const [buying, setBuying] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const color = rc(listing.itemrarity);

  if (!verified) {
    return (
      <EmbarkVerifyModal
        action={`buy ${listing.itemName}`}
        onVerified={() => setVerified(true)}
        onCancel={onClose}
      />
    );
  }

  async function handleBuy() {
    setBuying(true);
    try {
      await MarketplaceAPI.buy(listing._id);
      setDone(true);
      onConfirmed();
    } catch (e: any) {
      setError(e.message || 'Transaction failed');
    }
    setBuying(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm p-6 border shadow-2xl"
        style={{
          background: CRD,
          borderColor: BD,
          borderTopColor: color,
          borderTopWidth: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3"
          style={{ color: M }}
        >
          <X className="w-4 h-4" />
        </button>

        {done ? (
          <div className="text-center py-4">
            <Check
              className="w-10 h-10 mx-auto mb-3"
              style={{ color: 'var(--color-arc-uncommon)' }}
            />
            <p
              className="text-sm font-black uppercase tracking-widest mb-1"
              style={{ color: 'var(--color-arc-uncommon)' }}
            >
              Order Placed
            </p>
            <p className="text-xs" style={{ color: M }}>
              Contact the seller to arrange the exchange.
            </p>
          </div>
        ) : (
          <>
            <p
              className="text-sm font-black uppercase tracking-widest mb-4"
              style={{ color: 'var(--color-arc-white)' }}
            >
              Confirm Trade
            </p>
            <div
              className="flex items-center gap-3 mb-4 p-3 border"
              style={{ borderColor: BD, background: BG }}
            >
              <ItemIcon
                id={listing.itemId}
                name={listing.itemName}
                rarity={listing.itemrarity}
                iconUrl={listing.itemIconUrl}
                size={52}
              />
              <div>
                <p
                  className="text-sm font-black"
                  style={{ color: 'var(--color-arc-white)' }}
                >
                  {listing.itemName}
                </p>
                <p className="text-xs" style={{ color }}>
                  x{listing.itemQuantity} · {listing.itemrarity}
                </p>
                <p className="text-sm font-black mt-1" style={{ color: Y }}>
                  {listing.price.toLocaleString()} {listing.currency}
                </p>
              </div>
            </div>
            {/* Verification summary */}
            <div
              className="border p-3 mb-4"
              style={{
                borderColor: 'var(--color-arc-uncommon)40',
                background: 'var(--color-arc-uncommon)08',
              }}
            >
              <p
                className="text-[10px] font-black uppercase tracking-widest mb-2"
                style={{ color: 'var(--color-arc-uncommon)' }}
              >
                <Check className="w-3 h-3 inline mr-1" />
                Your Embark ID Verified
              </p>
              <div className="flex items-center gap-1.5">
                <EmbarkBadge verified={listing.sellerEmbarkVerified} />
                <span className="text-[10px]" style={{ color: M }}>
                  Seller: {listing.sellerName}
                </span>
              </div>
            </div>
            {error && (
              <p
                className="text-xs mb-3"
                style={{ color: 'var(--color-arc-danger)' }}
              >
                {error}
              </p>
            )}
            <button
              onClick={handleBuy}
              disabled={buying}
              className="w-full py-2.5 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: Y, color: '#000' }}
            >
              {buying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Confirm Trade
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                                  */
/* ══════════════════════════════════════════════════════════════════════════ */
export default function MarketplacePage() {
  const { stats, profile } = usePlayer();

  const urlParams = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : '',
  );
  const initTab = (urlParams.get('tab') as TabId) || 'browse';
  const initBpId = urlParams.get('blueprint') ?? '';
  const initBpName = urlParams.get('bpname') ?? '';
  const initBpRar = urlParams.get('bprarity') ?? '';
  const initSearch = urlParams.get('search') ?? '';
  const initBpOnly = urlParams.get('blueprints') === '1';

  const [tab, setTab] = useState<TabId>(initTab);
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(initSearch);
  const [rarityFilter, setrarityFilter] = useState('all');
  const [bpOnly, setBpOnly] = useState(initBpOnly);
  const [showCreate, setShowCreate] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<any>(
    initBpId
      ? {
          itemId: initBpId,
          itemName: initBpName,
          rarity: initBpRar,
          isBlueprintListing: true,
        }
      : undefined,
  );
  const [buyTarget, setBuyTarget] = useState<Listing | null>(null);
  const [discordTarget, setDiscordTarget] = useState<Listing | null>(null);
  const refreshRef = useRef(0);

  const isLoggedIn = !!(stats?.embarkId || profile);

  const load = useCallback(async () => {
    setLoading(true);
    const tick = ++refreshRef.current;
    try {
      const [browse, mine, ords] = await Promise.allSettled([
        MarketplaceAPI.browse(),
        isLoggedIn ? MarketplaceAPI.myListings() : Promise.resolve([]),
        isLoggedIn ? MarketplaceAPI.offers() : Promise.resolve([]),
      ]);
      if (refreshRef.current !== tick) return;
      if (browse.status === 'fulfilled')
        setListings(
          Array.isArray(browse.value)
            ? browse.value
            : ((browse.value as any)?.listings ?? []),
        );
      if (mine.status === 'fulfilled')
        setMyListings(
          Array.isArray(mine.value)
            ? mine.value
            : ((mine.value as any)?.listings ?? []),
        );
      if (ords.status === 'fulfilled')
        setOrders(
          Array.isArray(ords.value)
            ? ords.value
            : ((ords.value as any)?.offers ?? []),
        );
    } catch {
      /* silently */
    }
    setLoading(false);
  }, [isLoggedIn]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-open sell form if deep-linked from blueprints
  useEffect(() => {
    if (initBpId && initTab === 'sell') {
      setShowCreate(true);
    }
  }, []);

  // Re-read URL params after navigation events (blueprint deep-link pushed after tab switch)
  useEffect(() => {
    function handleNavigate() {
      const p = new URLSearchParams(window.location.search);
      const bpId = p.get('blueprint') ?? '';
      const bpName = p.get('bpname') ?? '';
      const bpRar = p.get('bprarity') ?? '';
      const searchParam = p.get('search') ?? '';
      const blueprintsOnly = p.get('blueprints') === '1';
      const t = p.get('tab') ?? '';
      if (bpId && t === 'sell') {
        setCreatePrefill({
          itemId: bpId,
          itemName: bpName,
          rarity: bpRar,
          isBlueprintListing: true,
        });
        setShowCreate(true);
        setTab('sell');
      } else if (t === 'browse') {
        setTab('browse');
        setSearch(searchParam);
        setBpOnly(blueprintsOnly);
      }
    }
    window.addEventListener('shiesty:navigate', handleNavigate);
    window.addEventListener('popstate', handleNavigate);
    return () => {
      window.removeEventListener('shiesty:navigate', handleNavigate);
      window.removeEventListener('popstate', handleNavigate);
    };
  }, []);

  const filtered = useMemo(
    () =>
      listings.filter((l) => {
        if (!l) return false;
        if (
          rarityFilter !== 'all' &&
          String(l.itemrarity ?? '').toLowerCase() !== rarityFilter
        )
          return false;
        const isBlueprintListing =
          Boolean(l.blueprintId || l.itemStats?.blueprintId) ||
          String(l.itemType || '').toLowerCase() === 'blueprint' ||
          String(l.itemName || '')
            .toLowerCase()
            .includes('blueprint');
        if (bpOnly && !isBlueprintListing) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const name = String(l.itemName ?? '').toLowerCase();
          const seller = String(l.sellerName ?? '').toLowerCase();
          return name.includes(q) || seller.includes(q);
        }
        return true;
      }),
    [listings, search, rarityFilter, bpOnly],
  );

  const myId = (profile as any)?.id ?? stats?.embarkId;

  function handleCancelListing(id: string) {
    MarketplaceAPI.cancel(id)
      .then(() => {
        setMyListings((p) => p.filter((l) => l._id !== id));
        setListings((p) => p.filter((l) => l._id !== id));
      })
      .catch(() => {});
  }

  function openListBlueprint(bp: { id: string; name: string; rarity: string }) {
    setCreatePrefill({
      itemId: bp.id,
      itemName: bp.name,
      rarity: bp.rarity,
      isBlueprintListing: true,
    });
    setShowCreate(true);
    setTab('sell');
  }

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'browse', label: 'Browse', icon: <Search className="w-3.5 h-3.5" /> },
    { id: 'sell', label: 'Sell / List', icon: <Tag className="w-3.5 h-3.5" /> },
    {
      id: 'mylistings',
      label: 'My Listings',
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: <ShoppingCart className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: BG }}>
      <div className="max-w-screen-2xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1
              className="text-xl font-black uppercase tracking-widest"
              style={{ color: 'var(--color-arc-white)' }}
            >
              Trading Floor
            </h1>
            <p className="text-xs mt-0.5" style={{ color: M }}>
              All trades require Embark ID verification · Blueprint listings
              highlighted
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} style={{ color: M }}>
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              onClick={() => {
                setCreatePrefill(undefined);
                setShowCreate(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest"
              style={{ background: Y, color: '#000' }}
            >
              <Plus className="w-3.5 h-3.5" /> Post Listing
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-6" style={{ borderColor: BD }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest relative transition-colors"
              style={{ color: tab === t.id ? Y : M }}
            >
              {t.icon}
              {t.label}
              {tab === t.id && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: Y }}
                />
              )}
              {t.id === 'mylistings' && myListings.length > 0 && (
                <span
                  className="text-[9px] font-black px-1 py-0.5 ml-1"
                  style={{ background: `${Y}20`, color: Y }}
                >
                  {myListings.length}
                </span>
              )}
              {t.id === 'orders' && orders.length > 0 && (
                <span
                  className="text-[9px] font-black px-1 py-0.5 ml-1"
                  style={{
                    background: 'var(--color-arc-danger)20',
                    color: 'var(--color-arc-danger)',
                  }}
                >
                  {orders.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══ BROWSE ══ */}
        {tab === 'browse' && (
          <div>
            <div
              className="flex flex-wrap items-center gap-3 mb-5 p-4 border"
              style={{ borderColor: BD, background: CRD }}
            >
              <div className="flex-1 min-w-48 relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                  style={{ color: M }}
                />
                <input
                  placeholder="Search item or seller..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs outline-none border"
                  style={{
                    background: BG,
                    borderColor: BD,
                    color: 'var(--color-arc-white)',
                  }}
                />
              </div>
              {['all', 'common', 'uncommon', 'rare', 'epic', 'legendary'].map(
                (r) => (
                  <button
                    key={r}
                    onClick={() => setrarityFilter(r)}
                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border"
                    style={{
                      color:
                        rarityFilter === r ? '#000' : r === 'all' ? Y : rc(r),
                      borderColor: r === 'all' ? Y : rc(r),
                      background:
                        rarityFilter === r
                          ? r === 'all'
                            ? Y
                            : rc(r)
                          : `${r === 'all' ? Y : rc(r)}12`,
                    }}
                  >
                    {r}
                  </button>
                ),
              )}
              <button
                onClick={() => setBpOnly((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border"
                style={{
                  borderColor: bpOnly ? `${Y}60` : BD,
                  color: bpOnly ? Y : M,
                  background: bpOnly ? `${Y}12` : 'transparent',
                }}
              >
                <BookOpen className="w-3 h-3" /> Blueprints Only
              </button>
            </div>

            {loading && (
              <div
                className="flex items-center justify-center py-20 gap-2"
                style={{ color: M }}
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-black uppercase tracking-widest">
                  Loading listings...
                </span>
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="text-center py-20">
                <Package
                  className="w-12 h-12 mx-auto mb-3 opacity-20"
                  style={{ color: M }}
                />
                <p
                  className="text-sm font-black uppercase tracking-widest mb-4"
                  style={{ color: M }}
                >
                  No listings found
                </p>
                <button
                  onClick={() => {
                    setCreatePrefill(undefined);
                    setShowCreate(true);
                    setTab('sell');
                  }}
                  className="px-5 py-2 text-xs font-black uppercase tracking-widest"
                  style={{ background: Y, color: '#000' }}
                >
                  Be the first to post
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((l) => (
                <BarterCard
                  key={l._id}
                  listing={l}
                  isOwn={l.sellerId === myId}
                  onBuy={setBuyTarget}
                  onCancel={handleCancelListing}
                  onDiscord={setDiscordTarget}
                />
              ))}
            </div>
          </div>
        )}

        {/* ══ SELL ══ */}
        {tab === 'sell' && (
          <div className="max-w-2xl space-y-4">
            <BlueprintBulkExport onListBlueprint={openListBlueprint} />
            <div
              className="border p-4 flex items-start gap-3"
              style={{ borderColor: `${Y}40`, background: `${Y}08` }}
            >
              <Shield
                className="w-4 h-4 shrink-0 mt-0.5"
                style={{ color: Y }}
              />
              <div>
                <p
                  className="text-xs font-black uppercase tracking-widest mb-1"
                  style={{ color: Y }}
                >
                  Embark Verification Required
                </p>
                <p className="text-xs leading-relaxed" style={{ color: M }}>
                  All listings require your Embark ID verified via shiestybuddy
                  before posting. Protects both buyers and sellers — only real
                  ARC Raiders players trade here.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setCreatePrefill(undefined);
                setShowCreate(true);
              }}
              className="w-full py-4 border-2 border-dashed text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2"
              style={{ borderColor: BD, color: M }}
            >
              <Plus className="w-4 h-4" /> Create New Listing
            </button>
          </div>
        )}

        {/* ══ MY LISTINGS ══ */}
        {tab === 'mylistings' && (
          <div>
            {!isLoggedIn && (
              <div className="text-center py-20">
                <Shield
                  className="w-12 h-12 mx-auto mb-3 opacity-20"
                  style={{ color: M }}
                />
                <p
                  className="text-sm font-black uppercase tracking-widest"
                  style={{ color: M }}
                >
                  Connect Discord or link Embark to view your listings
                </p>
              </div>
            )}
            {isLoggedIn && !loading && myListings.length === 0 && (
              <div className="text-center py-20">
                <Layers
                  className="w-12 h-12 mx-auto mb-3 opacity-20"
                  style={{ color: M }}
                />
                <p
                  className="text-sm font-black uppercase tracking-widest mb-4"
                  style={{ color: M }}
                >
                  No active listings
                </p>
                <button
                  onClick={() => setTab('sell')}
                  className="px-5 py-2 text-xs font-black uppercase tracking-widest"
                  style={{ background: Y, color: '#000' }}
                >
                  Post your first listing
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {myListings.map((l) => (
                <BarterCard
                  key={l._id}
                  listing={l}
                  isOwn={true}
                  onBuy={() => {}}
                  onCancel={handleCancelListing}
                  onDiscord={setDiscordTarget}
                />
              ))}
            </div>
          </div>
        )}

        {/* ══ ORDERS ══ */}
        {tab === 'orders' && (
          <div className="space-y-3">
            {!isLoggedIn && (
              <div className="text-center py-20">
                <Shield
                  className="w-12 h-12 mx-auto mb-3 opacity-20"
                  style={{ color: M }}
                />
                <p
                  className="text-sm font-black uppercase tracking-widest"
                  style={{ color: M }}
                >
                  Connect Discord or link Embark to view orders
                </p>
              </div>
            )}
            {isLoggedIn && !loading && orders.length === 0 && (
              <div className="text-center py-20">
                <ShoppingCart
                  className="w-12 h-12 mx-auto mb-3 opacity-20"
                  style={{ color: M }}
                />
                <p
                  className="text-sm font-black uppercase tracking-widest"
                  style={{ color: M }}
                >
                  No orders yet
                </p>
              </div>
            )}
            {orders.map((o: any) => {
              if (!o) return null;
              const oItemName = String(o.itemName ?? 'Item');
              const oBuyerName = String(o.buyerName ?? '?');
              const oSellerName = String(o.sellerName ?? '?');
              const color = rc(o.itemrarity);
              return (
                <div
                  key={o._id}
                  className="border p-4 flex items-center gap-4"
                  style={{
                    borderColor: BD,
                    background: CRD,
                    borderLeftColor: color,
                    borderLeftWidth: 2,
                  }}
                >
                  <ItemIcon
                    id={o.itemId}
                    name={oItemName}
                    rarity={o.itemrarity}
                    size={48}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-black truncate"
                      style={{ color: 'var(--color-arc-white)' }}
                    >
                      {oItemName}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <OrderBadge status={o.status} />
                      <span className="text-[10px]" style={{ color: M }}>
                        {oBuyerName} → {oSellerName}
                      </span>
                    </div>
                    {/* Both-party Embark verification state */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[9px]" style={{ color: M }}>
                        Buyer:
                      </span>
                      <EmbarkBadge verified={o.buyerEmbarkVerified} />
                      <span className="text-[9px]" style={{ color: M }}>
                        Seller:
                      </span>
                      <EmbarkBadge verified={o.sellerEmbarkVerified} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black" style={{ color: Y }}>
                      {(o.price ?? 0).toLocaleString()} {o.currency}
                    </p>
                    <p className="text-[10px]" style={{ color: M }}>
                      {timeAgo(o.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateListingModal
          prefill={createPrefill}
          onClose={() => {
            setShowCreate(false);
            setCreatePrefill(undefined);
          }}
          onCreated={() => {
            load();
            setTab('mylistings');
          }}
        />
      )}
      {buyTarget && (
        <BuyModal
          listing={buyTarget}
          onClose={() => setBuyTarget(null)}
          onConfirmed={() => {
            setBuyTarget(null);
            load();
          }}
        />
      )}
      {discordTarget && (
        <DiscordPanel
          listing={discordTarget}
          onClose={() => setDiscordTarget(null)}
        />
      )}
    </div>
  );
}
