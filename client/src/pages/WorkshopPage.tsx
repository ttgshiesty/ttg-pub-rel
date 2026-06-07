/**
 * WorkshopPage — ARC Raiders workshop station upgrade viewer.
 * Shows each station's upgrade levels with required item costs + item images.
 * Data sourced from /data/workshop_upgrades.json (built from ARDB-main).
 */
import { useState, useEffect } from 'react';
import type { CSSProperties, ReactEventHandler } from 'react';
import { Wrench, Package, ChevronDown, ChevronUp, Hammer } from 'lucide-react';
import { getItemImg, getItemImgWebp, getItemData } from '../lib/itemDb';
import { assetUrl } from '../lib/assetUrl';
import WORKSHOP_UPGRADES_RAW from '../data/workshop_upgrades.json';
import { ItemCard } from '../components/ItemCard';

/* ─── ARC palette ─────────────────────────────────────────────────────────── */
const STATION_COLORS: Record<string, string> = {
  gunsmith: '#01abf4',
  gear_bench: '#25bb55',
  medical_lab: '#c43198',
  explosives_station: '#e83a3a',
  utility_station: '#f1aa1c',
  refiner: '#ffcc00',
  scrappy: '#8a7a9a',
};

const STATION_NAMES: Record<string, string> = {
  gunsmith: 'Gunsmith',
  gear_bench: 'Gear Bench',
  medical_lab: 'Medical Lab',
  explosives_station: 'Explosives Station',
  utility_station: 'Utility Station',
  refiner: 'Refiner',
  scrappy: 'Scrappy',
};

/* ─── Trader mapping for workshop stations ───────────────────────────────── */
const STATION_TRADERS: Record<
  string,
  { name: string; image: string; color: string }
> = {
  gunsmith: {
    name: 'Gun Smith',
    image: assetUrl('/main/weapon.webp'),
    color: '#e83a3a',
  },
  gear_bench: {
    name: 'Gear Bench',
    image: assetUrl('/main/gear.webp'),
    color: '#c43198',
  },
  security_station: {
    name: 'Shani',
    image: assetUrl('/main/shani.png'),
    color: '#c43198',
  },
  medical_lab: {
    name: 'Medical',
    image: assetUrl('/icons/medical.webp'),
    color: '#01abf4',
  },
  explosives_station: {
    name: 'Explosives Station',
    image: assetUrl('/main/explosive.png'),
    color: '#f1aa1c',
  },
  utility_station: {
    name: 'Utility Station',
    image: assetUrl('/main/utility.png'),
    color: '#f1aa1c',
  },
  refiner: {
    name: 'Refiner',
    image: assetUrl('/icons/refiner.webp'),
    color: '#f1aa1c',
  },
  CraftingMaterials: {
    name: 'Crafting Materials',
    image: assetUrl('/icons/craftingmaterials.webp'),
    color: '#8a7a9a',
  },
  outfit_scrappy: {
    name: 'Scrappy',
    image: assetUrl('/main/outfitscrappy.webp'),
    color: '#8a7a9a',
  },
};

function buildWorkshopStations(data: Record<string, Record<string, any[]>>) {
  return Object.entries(data).map(([id, levels]) => ({
    id,
    name:
      STATION_NAMES[id] ??
      id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    levels: Object.entries(levels)
      .map(([level, items]) => ({
        level: Number(level),
        items: Array.isArray(items) ? items : [],
      }))
      .sort((a, b) => a.level - b.level),
  }));
}


/* ─── Responsive image helper ───────────────────────────────────────────────
   MediaWiki serves tiny UI icons as 1x/1.5x/2x thumbnails. This keeps them
   sharp on Retina screens while still rendering at the requested CSS size.
   Local project assets fall back to normal <img>, because we do not need to
   hoard three copies of every icon like a goblin with a CDN account.
*/
function buildMediaWikiSrcSet(src: string, displaySize: number) {
  if (!src.includes('/w/images/thumb/')) return undefined;

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

/* ─── Item chip with compact market card style ───────────────────────────────── */
function ItemChip({ itemId, quantity }: { itemId: string; quantity: number }) {
  const meta = getItemData(itemId);
  const rarity = String(meta?.rarity || 'common').toLowerCase();
  const category = String(
    meta?.category || meta?.itemType || 'material',
  ).toLowerCase();

  return (
    <div className="relative">
      <ItemCard itemId={itemId} rarity={rarity} category={category} />
      {/* Quantity badge */}
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
    </div>
  );
}

/* ─── Station card ───────────────────────────────────────────────────────── */
function StationCard({ station }: { station: any }) {
  const [openLevel, setOpenLevel] = useState<number | null>(null);
  const color = STATION_COLORS[station.id] ?? '#8a7a9a';
  const trader = STATION_TRADERS[station.id];

  return (
    <div
      className="border border-[#2d1f38] bg-[#100a18] overflow-hidden"
      style={{ borderTopColor: color, borderTopWidth: 2 }}
    >
      {/* Station header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2d1f38]">
        {/* Station icon */}
        {station.image ? (
          <ResponsiveGameImage
            src={station.image}
            alt={station.name}
            size={40}
            className="w-10 h-10 object-contain shrink-0"
          />
        ) : (
          <div
            className="w-10 h-10 flex items-center justify-center border shrink-0"
            style={{ borderColor: color, background: `${color}18` }}
          >
            <Wrench className="w-5 h-5" style={{ color }} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="text-[10px] font-black text-white uppercase tracking-wider">
            {station.name}
          </h3>
          <p className="text-[7px] text-[#8a7a9a] uppercase tracking-widest mt-0.5">
            {station.levels.length} upgrade levels
          </p>
        </div>

        {/* Trader icon */}
        {trader && (
          <div className="flex flex-col items-center gap-1 shrink-0">
            <ResponsiveGameImage
              src={trader.image}
              alt={trader.name}
              size={32}
              className="w-8 h-8 object-contain border border-[#2d1f38] rounded-full"
              style={{
                borderColor: trader.color,
                boxShadow: `0 0 8px ${trader.color}40`,
              }}
              onError={(e) => {
                // Fallback to colored div if image fails
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className =
                    'w-8 h-8 flex items-center justify-center border border-[#2d1f38] rounded-full text-[8px] font-black';
                  fallback.style.borderColor = trader.color;
                  fallback.style.background = `${trader.color}18`;
                  fallback.style.color = trader.color;
                  fallback.textContent = trader.name.charAt(0);
                  parent.appendChild(fallback);
                }
              }}
            />
            <span
              className="text-[6px] font-black uppercase tracking-widest"
              style={{ color: trader.color }}
            >
              {trader.name}
            </span>
          </div>
        )}
      </div>

      {/* Levels */}
      <div className="divide-y divide-[#2d1f38]">
        {station.levels.map((lvl: any) => {
          const isOpen = openLevel === lvl.level;
          return (
            <div key={lvl.level}>
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#1a1120] transition-colors text-left"
                onClick={() => setOpenLevel(isOpen ? null : lvl.level)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 flex items-center justify-center text-[8px] font-black border"
                    style={{
                      borderColor: color,
                      color,
                      background: `${color}15`,
                    }}
                  >
                    {lvl.level}
                  </div>
                  <span className="text-[9px] font-black text-white uppercase tracking-wide">
                    Level {lvl.level} Upgrade
                  </span>
                  <span className="text-[7px] text-[#8a7a9a]">
                    {lvl.items.length} material
                    {lvl.items.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-3 h-3 text-[#8a7a9a]" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-[#8a7a9a]" />
                )}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 bg-[#0d0814]">
                  <p className="text-[7px] text-[#8a7a9a] uppercase tracking-widest mb-2">
                    Required Materials
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {lvl.items.map((item: any, idx: number) => (
                      <ItemChip
                        key={idx}
                        itemId={item.itemId}
                        quantity={item.quantity}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function WorkshopPage() {
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setStations(
      buildWorkshopStations(
        WORKSHOP_UPGRADES_RAW as unknown as Record<
          string,
          Record<string, any[]>
        >,
      ),
    );
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#f1aa1c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen bg-transparent text-white pb-20 pt-10">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Hammer className="w-5 h-5 text-[#f1aa1c]" />

            <ResponsiveGameImage
              src={assetUrl('/icons/workbench_logo.webp')}
              alt="Workbench"
              size={40}
              className="w-10 h-10 object-contain"
            />

            <h1 className="text-[13px] font-black text-white uppercase tracking-[0.3em]">
              WORKSHOP UPGRADES
            </h1>
          </div>
          <p className="text-[9px] text-[#8a7a9a] uppercase tracking-widest">
            Station upgrade costs · Required materials per level
          </p>
        </div>

        {/* Station grid */}
        {stations.length === 0 ? (
          <div className="border border-[#2d1f38] bg-[#1a1120] p-12 text-center">
            <Wrench className="w-10 h-10 text-[#2d1f38] mx-auto mb-4" />
            <p className="text-[9px] text-[#8a7a9a] uppercase tracking-widest">
              No workshop data available
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stations.map((station: any) => (
              <StationCard key={station.id} station={station} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
