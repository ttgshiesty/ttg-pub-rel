/**
 * TradersPage — ARC Raiders trader hub.
 *
 * Uses the local trade catalog plus quest metadata and the main/icon asset set.
 */
import { useMemo, useState } from 'react';
import type { CSSProperties, ReactEventHandler } from 'react';
import {
  Backpack,
  Clock,
  Crosshair,
  HeartPulse,
  Infinity as InfinityIcon,
  Lock,
  Package,
  Search,
  Shield,
  ShoppingBag,
  Star,
  Users,
  Wrench,
} from 'lucide-react';
import TRADES_RAW from '../data/trades.json';
import QUESTS_RAW from '../data/quests-all.json';
import WORKSHOP_RAW from '../data/workshop_upgrades.json';
import { assetUrl } from '../lib/assetUrl';
import { getItemData, getItemImg, RARITY_COLOR } from '../lib/itemDb';
import { ItemCard } from '../components/ItemCard';

const Y = 'var(--color-arc-yellow)';
const W = 'var(--color-arc-white)';
const M = 'var(--color-arc-muted)';
const BD = 'var(--color-arc-border)';
const BG = 'var(--color-arc-dark-background)';
const CRD = 'var(--color-arc-light-background)';

interface TradeEntry {
  trader: string;
  itemId: string;
  quantity: number;
  cost: { itemId: string; quantity: number };
  dailyLimit: number | null;
  refreshSeconds?: number;
  requiredLevel?: number;
}

interface QuestEntry {
  id: string;
  trader?: string;
  name?: string | Record<string, string>;
  description?: string | Record<string, string>;
}

interface TraderMeta {
  label: string;
  role: string;
  subtitle: string;
  image: string;
  fallbackImage?: string;
  accentColor: string;
  icon: any;
  functions: string[];
  workshop: string[];
}

const TRADES = TRADES_RAW as TradeEntry[];
const QUESTS = Object.values(QUESTS_RAW as Record<string, QuestEntry>);
const WORKSHOP = WORKSHOP_RAW as Record<string, any>;

const TRADER_META: Record<string, TraderMeta> = {
  Apollo: {
    label: 'Apollo',
    role: 'Gadgets & Community',
    subtitle: 'Utility, explosives, tactical gear, community requests',
    image: assetUrl('/main/apollo.png'),
    accentColor: '#f1aa1c',
    icon: Users,
    functions: [
      'Gadget and throwable trading',
      'Explosives station ties',
      'Community-focused quest lines',
      'Daily limited utility purchases',
    ],
    workshop: ['explosives_station', 'refiner'],
  },
  Shani: {
    label: 'Shani',
    role: 'Security',
    subtitle: 'Security gear, defensive items, keys, intel work',
    image: assetUrl('/main/shani.png'),
    accentColor: '#01abf4',
    icon: Shield,
    functions: [
      'Security and access-focused trades',
      'Defensive quest chains',
      'Gear bench upgrade direction',
      'Key and surveillance item demand',
    ],
    workshop: ['gear_bench'],
  },
  Celeste: {
    label: 'Celeste',
    role: 'Materials & Morale',
    subtitle: 'Materials, seeds, morale supplies, scavenging requests',
    image: assetUrl('/main/celeste.png'),
    accentColor: '#25bb55',
    icon: Package,
    functions: [
      'Material exchanges',
      'Seed economy trades',
      'Morale and recovery quest chains',
      'Medical lab supply crossover',
    ],
    workshop: ['medical_lab'],
  },
  'Tian Wen': {
    label: 'Tian Wen',
    role: 'Weapons',
    subtitle: 'Weapons, ammo, attachments, combat progression',
    image: assetUrl('/main/tianwen.png'),
    accentColor: '#c43198',
    icon: Crosshair,
    functions: [
      'Weapon and ammo trading',
      'Attachment and gunsmith progression',
      'Combat quest lines',
      'High-value level-gated offers',
    ],
    workshop: ['utility_station'],
  },
  Lance: {
    label: 'Lance',
    role: 'Medical',
    subtitle: 'Medical supplies, augments, healing and survival requests',
    image: assetUrl('/main/lance.png'),
    accentColor: '#e83a3a',
    icon: HeartPulse,
    functions: [
      'Medical supply trades',
      'Augment and healing item demand',
      'Survival quest chains',
      'Gunsmith support station links',
    ],
    workshop: ['gunsmith'],
  },
  'The Nomadic Trader': {
    label: 'The Nomadic Trader',
    role: 'Stash Expansions',
    subtitle: 'Storage growth, account expansion, and rare service offers',
    image: assetUrl('/main/valuableicon.webp'),
    fallbackImage: assetUrl('/main/backpack.webp'),
    accentColor: '#ffcc00',
    icon: Backpack,
    functions: [
      'Stash expansion planning',
      'Storage and capacity service tracking',
      'High-cost account progression checklist',
      'Expansion reminders for hoard management',
    ],
    workshop: [],
  },
  Scrappy: {
    label: 'SCRAPPY',
    role: 'YOUR COMPANION',
    subtitle: 'Companion progression, scavenging support, Scrappy upgrades',
    image: assetUrl('/main/scrappy.webp'),
    fallbackImage: assetUrl('/main/outfitscrappy.webp'),
    accentColor: '#8a7a9a',
    icon: Star,
    functions: [
      'Companion upgrade planning',
      'Scavenging support tracker',
      'Scrappy workshop requirements',
      'Item demand from companion progression',
    ],
    workshop: ['scrappy'],
  },
};

const TRADER_ORDER = [
  'Apollo',
  'Shani',
  'Celeste',
  'Tian Wen',
  'Lance',
  'Ermal',
  'Scrappy',
];

const CURRENCY_LABEL: Record<string, string> = {
  assorted_seeds: 'Seeds',
  creds: 'Creds',
  coins: 'Coins',
  free_loadout_augment: 'Free Augment',
};

const CURRENCY_ICON: Record<string, string> = {
  assorted_seeds: assetUrl('/items/assorted_seeds.webp'),
  creds: assetUrl('/icons/t_ui_hud_creds.webp'),
  coins: assetUrl('/icons/t_ui_hud_coins.webp'),
  free_loadout_augment: assetUrl('/items/free_loadout_augment.webp'),
};

// Currency mapping for ItemCard
const CURRENCY_TYPE: Record<string, 'coins' | 'creds' | 'merits'> = {
  assorted_seeds: 'coins',
  creds: 'creds',
  coins: 'coins',
  free_loadout_augment: 'coins',
};


/* ─── Responsive image helper ───────────────────────────────────────────────
   MediaWiki serves tiny UI icons as 1x/1.5x/2x thumbnails. This keeps them
   sharp on Retina screens while still rendering at the requested CSS size.
   Local project assets fall back to normal <img>, because we do not need to
   hoard three copies of every icon like a goblin with a CDN account.
*/
function buildMediaWikiSrcSet(src: string, displaySize: number) {
  if (!src.includes('https://assets.shiesty.me/')) return undefined;

  const pattern = new RegExp(`/${displaySize}px-`, 'g');
  if (!pattern.test(src)) return undefined;

  return [
    src,
    `${src.replace(new RegExp(`/${displaySize}px-`, 'g'), `/${Math.round(displaySize * 1.5)}px-`)} 1.5x`,
    `${src.replace(new RegExp(`/${displaySize}px-`, 'g'), `/${displaySize * 2}px-`)} 2x`,
  ].join(', ');
}

function ResponsiveGameImage({
  src,
  alt,
  size,
  className = '',
  fit = 'contain',
  onError,
  style,
}: {
  src: string;
  alt: string;
  size: number;
  className?: string;
  fit?: 'contain' | 'cover';
  onError?: ReactEventHandler<HTMLImageElement>;
  style?: CSSProperties;
}) {
  const srcSet = buildMediaWikiSrcSet(src, size);

  return (
    <picture>
      {srcSet && <source srcSet={srcSet} />}
      <img
        src={src}
        alt={alt}
        decoding="async"
        loading="lazy"
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size, objectFit: fit, ...style }}
        onError={onError}
      />
    </picture>
  );
}

function text(value: any, fallback = '') {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return value.en || value.EN || fallback;
}

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function currencyLabel(itemId: string) {
  return CURRENCY_LABEL[itemId] ?? titleCase(itemId);
}

function getTradeName(itemId: string) {
  const item = getItemData(itemId);
  return text(item?.name, titleCase(itemId));
}

function traderDisplayName(meta: TraderMeta) {
  if (meta.label === 'SCRAPPY') return 'SCRAPPY: YOUR COMPANION';
  return `${meta.label} (${meta.role})`;
}

function TraderImage({ meta, size = 76 }: { meta: TraderMeta; size?: number }) {
  return (
    <div
      className="shrink-0 overflow-hidden bg-[#080810]"
      style={{
        width: size,
        height: size,
        border: `2px solid ${meta.accentColor}`,
        boxShadow: `0 0 16px ${meta.accentColor}44`,
      }}
    >
      <ResponsiveGameImage
        src={meta.image}
        alt={meta.label}
        size={size}
        fit="cover"
        className="w-full h-full object-cover"
        onError={(e) => {
          if (
            meta.fallbackImage &&
            e.currentTarget.src !== meta.fallbackImage
          ) {
            e.currentTarget.src = meta.fallbackImage;
          } else {
            e.currentTarget.style.display = 'none';
          }
        }}
      />
    </div>
  );
}

function CurrencyIcon({
  itemId,
  size = 18,
}: {
  itemId: string;
  size?: number;
}) {
  const src = CURRENCY_ICON[itemId] ?? getItemImg(itemId);
  if (!src) return null;
  return (
    <ResponsiveGameImage
      src={src}
      alt={currencyLabel(itemId)}
      size={size}
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}

function ItemIcon({ itemId, size = 58 }: { itemId: string; size?: number }) {
  const item = getItemData(itemId);
  const src = getItemImg(itemId);
  const rarity = text(item?.rarity, item?.rarity || 'Common');
  const color = RARITY_COLOR[rarity] ?? RARITY_COLOR.Common ?? '#6c6b6a';

  return (
    <div
      className="shrink-0 flex items-center justify-center bg-[#080810]"
      style={{
        width: size,
        height: size,
        border: `1px solid ${color}88`,
        boxShadow: `inset 0 0 12px ${color}22`,
      }}
    >
      {src ? (
        <ResponsiveGameImage
          src={src}
          alt={getTradeName(itemId)}
          size={Math.round(size * 0.88)}
          className="w-[88%] h-[88%] object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <ShoppingBag size={Math.round(size * 0.42)} color={M} />
      )}
    </div>
  );
}

function TradeCard({ trade, accent }: { trade: TradeEntry; accent: string }) {
  const item = getItemData(trade.itemId);
  const rarity = text(item?.rarity, item?.rarity || 'Common');
  const rarityColor = RARITY_COLOR[rarity] ?? RARITY_COLOR.Common ?? accent;
  const hasLimit = trade.dailyLimit !== null;

  return (
    <div
      className="relative flex items-center gap-3 overflow-hidden bg-[#0b0a11] p-3 transition hover:-translate-y-0.5"
      style={{
        border: `1px solid ${BD}`,
        borderLeft: `3px solid ${rarityColor}`,
        boxShadow: `0 0 14px ${rarityColor}14`,
      }}
    >
      <ItemIcon itemId={trade.itemId} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-black uppercase tracking-widest text-[#ece2d0]">
          {trade.quantity > 1 && (
            <span style={{ color: accent }}>x{trade.quantity} </span>
          )}
          {getTradeName(trade.itemId)}
        </p>
        <p
          className="mt-1 text-[12px] font-black uppercase tracking-widest"
          style={{ color: rarityColor }}
        >
          {rarity}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span
            className="inline-flex items-center gap-1 border px-2 py-0.5 text-[12px] font-black uppercase tracking-widest"
            style={{
              borderColor: hasLimit ? `${accent}66` : BD,
              color: hasLimit ? accent : M,
              background: hasLimit ? `${accent}18` : '#ffffff08',
            }}
          >
            {hasLimit ? <Clock size={12} /> : <InfinityIcon size={12} />}
            {hasLimit ? `${trade.dailyLimit}/day` : 'Unlimited'}
          </span>
          {trade.requiredLevel && (
            <span className="inline-flex items-center gap-1 border border-[#e83a3a66] bg-[#e83a3a18] px-2 py-0.5 text-[12px] font-black uppercase tracking-widest text-[#e83a3a]">
              <Lock size={12} />
              Lv {trade.requiredLevel}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <CurrencyIcon itemId={trade.cost.itemId} />
          <span
            className="text-[22px] font-black leading-none tabular-nums"
            style={{ color: Y }}
          >
            {trade.cost.quantity.toLocaleString()}
          </span>
        </div>
        <span
          className="text-[12px] font-black uppercase tracking-widest"
          style={{ color: M }}
        >
          {currencyLabel(trade.cost.itemId)}
        </span>
      </div>
    </div>
  );
}

// Compact market card version using ItemCard
function TradeCardCompact({ trade }: { trade: TradeEntry }) {
  const item = getItemData(trade.itemId);
  const rarity = text(item?.rarity, item?.rarity || 'Common').toLowerCase();
  const category = text(item?.category, item?.itemType || 'misc').toLowerCase();
  const currency = CURRENCY_TYPE[trade.cost.itemId] || 'coins';

  return (
    <div className="relative">
      <ItemCard
        itemId={trade.itemId}
        price={trade.cost.quantity}
        currency={currency}
        rarity={rarity}
        category={category}
      />
      {/* Limit badge overlay */}
      {trade.dailyLimit !== null && (
        <div
          className="absolute -top-2 -right-2 flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest border bg-[#1a1120]"
          style={{ borderColor: '#f1aa1c', color: '#f1aa1c' }}
          title={`${trade.dailyLimit} per day`}
        >
          <Clock size={10} />
          {trade.dailyLimit}/d
        </div>
      )}
      {/* Level lock overlay */}
      {trade.requiredLevel && (
        <div
          className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest border bg-[#1a1120]"
          style={{ borderColor: '#e83a3a', color: '#e83a3a' }}
        >
          <Lock size={10} />
          Lv{trade.requiredLevel}
        </div>
      )}
    </div>
  );
}

function QuestRow({ quest, accent }: { quest: QuestEntry; accent: string }) {
  return (
    <div className="border border-[#2d1f38] bg-[#080810] px-3 py-2">
      <p
        className="truncate text-[14px] font-black uppercase tracking-widest"
        style={{ color: W }}
      >
        {text(quest.name, titleCase(quest.id))}
      </p>
      <p
        className="mt-1 line-clamp-2 text-[13px] leading-tight"
        style={{ color: M }}
      >
        {text(quest.description, 'Quest objective data available in catalog.')}
      </p>
      <span
        className="mt-2 inline-block border px-2 py-0.5 text-[11px] font-black uppercase tracking-widest"
        style={{ borderColor: `${accent}66`, color: accent }}
      >
        Quest
      </span>
    </div>
  );
}

function TraderTab({
  trader,
  active,
  onClick,
}: {
  trader: string;
  active: boolean;
  onClick: () => void;
}) {
  const meta = TRADER_META[trader];
  const count = TRADES.filter((t) => t.trader === trader).length;
  const questCount = QUESTS.filter((q) => q.trader === trader).length;
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-[142px] border bg-[#080810] p-2 text-left transition hover:-translate-y-0.5"
      style={{
        borderColor: active ? meta.accentColor : BD,
        boxShadow: active ? `0 0 18px ${meta.accentColor}33` : 'none',
      }}
    >
      <div className="flex items-center gap-2">
        <TraderImage meta={meta} size={48} />
        <div className="min-w-0">
          <p
            className="truncate text-[13px] font-black uppercase tracking-widest"
            style={{ color: active ? meta.accentColor : W }}
          >
            {traderDisplayName(meta)}
          </p>
          <p
            className="text-[12px] font-black uppercase tracking-widest"
            style={{ color: M }}
          >
            {count} trades / {questCount} quests
          </p>
        </div>
      </div>
      <div
        className="mt-2 flex items-center gap-1 text-[12px] font-black uppercase tracking-widest"
        style={{ color: meta.accentColor }}
      >
        <Icon size={13} />
        {meta.role}
      </div>
    </button>
  );
}

function ServicePanel({ trader }: { trader: string }) {
  const meta = TRADER_META[trader];
  const stationNames = meta.workshop.map((id) =>
    titleCase(WORKSHOP[id]?.name?.en || id),
  );

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {meta.functions.map((fn) => (
        <div
          key={fn}
          className="flex items-center gap-2 border border-[#2d1f38] bg-[#080810] px-3 py-2"
        >
          <Wrench size={15} style={{ color: meta.accentColor }} />
          <span
            className="text-[14px] font-black uppercase tracking-widest"
            style={{ color: W }}
          >
            {fn}
          </span>
        </div>
      ))}
      {stationNames.map((station) => (
        <div
          key={station}
          className="flex items-center gap-2 border border-[#2d1f38] bg-[#080810] px-3 py-2"
        >
          <Package size={15} style={{ color: meta.accentColor }} />
          <span
            className="text-[14px] font-black uppercase tracking-widest"
            style={{ color: W }}
          >
            Workshop: {station}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TradersPage() {
  const [activeTrader, setActiveTrader] = useState(TRADER_ORDER[0]);
  const [query, setQuery] = useState('');

  const meta = TRADER_META[activeTrader];
  const q = query.trim().toLowerCase();
  const trades = useMemo(
    () =>
      TRADES.filter((trade) => trade.trader === activeTrader).filter(
        (trade) => {
          if (!q) return true;
          return (
            trade.itemId.toLowerCase().includes(q) ||
            getTradeName(trade.itemId).toLowerCase().includes(q) ||
            trade.cost.itemId.toLowerCase().includes(q)
          );
        },
      ),
    [activeTrader, q],
  );
  const quests = useMemo(
    () => QUESTS.filter((quest) => quest.trader === activeTrader),
    [activeTrader],
  );
  const unlimited = trades.filter((trade) => trade.dailyLimit === null);
  const limited = trades
    .filter((trade) => trade.dailyLimit !== null)
    .sort(
      (a, b) =>
        (b.requiredLevel ?? 0) - (a.requiredLevel ?? 0) ||
        b.cost.quantity - a.cost.quantity,
    );

  return (
    <div className="min-h-screen px-4 py-6 md:px-6" style={{ background: BG }}>
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="border border-[#2d1f38] bg-[#0b0a11] p-4">
          <p
            className="text-[13px] font-black uppercase tracking-[0.24em]"
            style={{ color: M }}
          >
            World / Traders
          </p>
          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1
                className="text-[34px] font-black uppercase leading-none tracking-widest"
                style={{ color: W }}
              >
                Trader Hub
              </h1>
              <p
                className="mt-2 max-w-3xl text-[16px] font-semibold leading-tight"
                style={{ color: M }}
              >
                ARC Raiders traders, inventories, quest chains, workshop links,
                companion upgrades, and stash-expansion services.
              </p>
            </div>
            <div className="relative min-w-[260px]">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: M }}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search active inventory..."
                className="w-full border border-[#2d1f38] bg-[#080810] py-2 pl-9 pr-3 text-[14px] font-black uppercase tracking-widest text-[#ece2d0] outline-none focus:border-[#01abf4]"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {TRADER_ORDER.map((trader) => (
            <TraderTab
              key={trader}
              trader={trader}
              active={activeTrader === trader}
              onClick={() => setActiveTrader(trader)}
            />
          ))}
        </div>

        <div
          className="grid gap-4 border bg-[#0b0a11] p-4 lg:grid-cols-[320px_1fr]"
          style={{ borderColor: `${meta.accentColor}66` }}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <TraderImage meta={meta} size={96} />
              <div>
                <p
                  className="text-[26px] font-black uppercase leading-none tracking-widest"
                  style={{ color: meta.accentColor }}
                >
                  {traderDisplayName(meta)}
                </p>
                <p
                  className="mt-1 text-[16px] font-black uppercase tracking-widest"
                  style={{ color: W }}
                >
                  {meta.role}
                </p>
                <p
                  className="mt-1 text-[14px] leading-tight"
                  style={{ color: M }}
                >
                  {meta.subtitle}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1">
              <div
                className="hud-box hud-box--compact"
                style={{ '--hud-accent': meta.accentColor } as any}
              >
                <div className="hud-header">
                  <ShoppingBag className="main-icon" />
                </div>
                <span className="hud-title">Trades</span>
                <span className="hud-value">
                  {TRADES.filter((t) => t.trader === activeTrader).length}
                </span>
              </div>
              <div
                className="hud-box hud-box--compact"
                style={{ '--hud-accent': meta.accentColor } as any}
              >
                <div className="hud-header">
                  <Star className="main-icon" />
                </div>
                <span className="hud-title">Quests</span>
                <span className="hud-value">{quests.length}</span>
              </div>
              <div
                className="hud-box hud-box--compact"
                style={{ '--hud-accent': meta.accentColor } as any}
              >
                <div className="hud-header">
                  <Wrench className="main-icon" />
                </div>
                <span className="hud-title">Links</span>
                <span className="hud-value">{meta.workshop.length}</span>
              </div>
            </div>

            <ServicePanel trader={activeTrader} />
          </div>

          <div className="space-y-4">
            {unlimited.length > 0 && (
              <section>
                <p
                  className="mb-2 flex items-center gap-2 text-[14px] font-black uppercase tracking-widest"
                  style={{ color: M }}
                >
                  <InfinityIcon size={15} />
                  Always Available
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {unlimited.map((trade, i) => (
                    <TradeCardCompact
                      key={`${trade.itemId}-unlimited-${i}`}
                      trade={trade}
                    />
                  ))}
                </div>
              </section>
            )}

            {limited.length > 0 && (
              <section>
                <p
                  className="mb-2 flex items-center gap-2 text-[14px] font-black uppercase tracking-widest"
                  style={{ color: M }}
                >
                  <Clock size={15} />
                  Daily Limited
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {limited.map((trade, i) => (
                    <TradeCardCompact
                      key={`${trade.itemId}-limited-${i}`}
                      trade={trade}
                    />
                  ))}
                </div>
              </section>
            )}

            {trades.length === 0 && (
              <div className="border border-[#2d1f38] bg-[#080810] p-4">
                <p
                  className="text-[18px] font-black uppercase tracking-widest"
                  style={{ color: meta.accentColor }}
                >
                  No standard inventory
                </p>
                <p
                  className="mt-1 text-[15px] leading-tight"
                  style={{ color: M }}
                >
                  This entry is tracked as a service/companion trader instead of
                  a normal shop inventory in `trades.json`.
                </p>
              </div>
            )}

            {quests.length > 0 && (
              <section>
                <p
                  className="mb-2 flex items-center gap-2 text-[14px] font-black uppercase tracking-widest"
                  style={{ color: M }}
                >
                  <Star size={15} />
                  Trader Quest Chain
                </p>
                <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                  {quests.slice(0, 8).map((quest) => (
                    <QuestRow
                      key={quest.id}
                      quest={quest}
                      accent={meta.accentColor}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
