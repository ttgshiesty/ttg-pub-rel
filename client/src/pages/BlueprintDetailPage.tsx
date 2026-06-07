import { useState, useMemo, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Package,
  Flame,
  TrendingUp,
  Map,
  ShoppingCart,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import {
  getItemImg,
  getItemData,
  RARITY_BG,
  RARITY_GRADIENT,
} from '../lib/itemDb';
import { MarketplaceAPI } from '../lib/api';
import { assetUrl } from '../lib/assetUrl';
import { blueprintCoordinates } from '../data/blueprintCoordinateSource';
import { blueprintHeatmapKey } from '../data/blueprintHeatmapPoints';
import {
  rarityCardContainerClasses,
  rarityCardTopBarClass,
  rarityBadgeClasses,
  getRarityVisualTier,
  formatRarityLabel,
} from '../lib/rarityCardStyles';
import { getItemImageUrl, getItemName, getItemRarity } from '../lib/itemUtils';

const RC: Record<string, string> = {
  Legendary: 'var(--color-arc-legendary)',
  Epic: 'var(--color-arc-epic)',
  Rare: 'var(--color-arc-rare)',
  Uncommon: 'var(--color-arc-uncommon)',
  Common: 'var(--color-arc-common)',
};

const rarityColor = (r?: string) => RC[r ?? ''] ?? RC.Common;
const getBlueprintrarity = (blueprintId: string, fallback?: string) => {
  const masterData = getItemData(blueprintId);
  return masterData?.rarity || fallback || 'Common';
};
const getBlueprintBackground = () =>
  RARITY_BG['Blueprint'] || RARITY_GRADIENT['Blueprint'] || '#0d1419';
const displayName = (value: any, fallback = 'Unknown') =>
  typeof value === 'string' ? value : value?.en || value?.name || value?.id || fallback;
const stripBlueprintSuffix = (name: string) =>
  name.replace(/\s+blueprint$/i, '').replace(/_blueprint$/i, '');
const blueprintSourceKey = (value: string) =>
  stripBlueprintSuffix(value)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

type ShiestyReport = {
  Blueprint: string;
  Map: string;
  Condition: string;
  'Map Condition': string;
  'Behind Locked Door?': string;
  Container: string;
  'Location on the map': string;
};

interface BlueprintDetailPageProps {
  blueprintId: string;
  blueprintName: string;
  onBack: () => void;
}

export default function BlueprintDetailPage({ blueprintId, blueprintName, onBack }: BlueprintDetailPageProps) {
  const { blueprints: userBlueprints } = usePlayer();
  const [activeTab, setActiveTab] = useState<'overview' | 'conditions' | 'containers' | 'locations' | 'heatmap' | 'marketplace'>('overview');
  const [shiestyData, setShiestyData] = useState<ShiestyReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/shiestysource.csv')
      .then((res) => res.text())
      .then((text) => {
        try {
          const match = text.match(/window\.SHIESTY_DATA\s*=\s*({[\s\S]*})/);
          if (match) {
            const data = JSON.parse(match[1]);
            const rows: ShiestyReport[] = data.rows || [];
            const targetKey = blueprintSourceKey(blueprintName);
            const idKey = blueprintSourceKey(blueprintId);
            const filtered = rows.filter((r) => {
              const rowKey = blueprintSourceKey(r.Blueprint || '');
              return rowKey === targetKey || rowKey === idKey;
            });
            setShiestyData(filtered);
          }
        } catch (e) {
          console.error('Failed to parse shiestysource.csv:', e);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [blueprintName]);

  const rarity = getBlueprintrarity(blueprintId, 'Common');
  const borderColor = rarityColor(rarity);
  const isOwned =
    Array.isArray(userBlueprints) &&
    userBlueprints.some(
      (bp: { id?: string; name?: string }) =>
        bp.id === blueprintId ||
        bp.name?.toLowerCase().includes(blueprintName.toLowerCase()),
    );

  const stats = useMemo(() => {
    if (shiestyData.length === 0) return null;
    const mapCounts: Record<string, number> = {};
    const conditionCounts: Record<string, number> = {};
    const containerCounts: Record<string, number> = {};
    const lockedCount = shiestyData.filter((r) => r['Behind Locked Door?']?.toLowerCase().includes('lock')).length;

    shiestyData.forEach((r) => {
      mapCounts[r.Map] = (mapCounts[r.Map] || 0) + 1;
      conditionCounts[r.Condition] = (conditionCounts[r.Condition] || 0) + 1;
      containerCounts[r.Container || 'Unknown'] = (containerCounts[r.Container || 'Unknown'] || 0) + 1;
    });

    const bestMap = Object.entries(mapCounts).sort((a, b) => b[1] - a[1])[0];
    const bestCondition = Object.entries(conditionCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      totalReports: shiestyData.length,
      uniqueMaps: Object.keys(mapCounts).length,
      bestMap: bestMap?.[0] || 'Unknown',
      bestCondition: bestCondition?.[0] || 'Unknown',
      lockedChance: Math.round((lockedCount / shiestyData.length) * 100),
      mapDistribution: Object.entries(mapCounts).sort((a, b) => b[1] - a[1]),
      conditionDistribution: Object.entries(conditionCounts).sort((a, b) => b[1] - a[1]),
      containerDistribution: Object.entries(containerCounts).sort((a, b) => b[1] - a[1]),
    };
  }, [shiestyData]);

  const tierMatch = blueprintName.match(/\b(I{1,3}|IV)\b/);
  const tier = tierMatch ? tierMatch[1] : '';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-[var(--color-arc-muted)] hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blueprints
        </button>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div
            className="relative w-32 h-32 md:w-48 md:h-48 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: getBlueprintBackground(),
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: `2px solid ${borderColor}`,
              boxShadow: `0 0 30px ${borderColor}30`,
            }}
          >
            <img
              src={getItemImg(blueprintId) || '/items/default.png'}
              alt={blueprintName}
              className="w-24 h-24 md:w-32 md:h-32 object-contain arcHeroZoom"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/items/default.png';
              }}
            />
            {tier && (
              <div
                className="absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-black"
                style={{
                  background: 'rgba(0,0,0,0.8)',
                  border: `1px solid ${borderColor}`,
                  color: borderColor,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {tier}
              </div>
            )}
            {isOwned && (
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[var(--color-arc-uncommon)] flex items-center justify-center">
                <Check className="w-5 h-5 text-black" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <h1
              className="text-3xl md:text-4xl font-black text-white mb-2"
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                textShadow: '0 0 20px rgba(34, 229, 255, 0.3)',
              }}
            >
              {stripBlueprintSuffix(blueprintName)}
            </h1>
            <p
              className="text-sm text-[var(--color-arc-common)] mb-4"
              style={{ fontFamily: "'Barlow', sans-serif" }}
            >
              Data Source →{' '}
              <span className="text-[var(--color-arc-rare)]">
                shiestysource.csv
              </span>
              {stats && (
                <span className="ml-4">
                  • Based on {stats.totalReports} community reports
                </span>
              )}
            </p>

            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  label="Best Map"
                  value={stats.bestMap}
                  color="#22e5ff"
                />
                <StatCard
                  label="Best Time"
                  value={stats.bestCondition}
                  color="#25bb55"
                />
                <StatCard
                  label="Reports"
                  value={stats.totalReports.toString()}
                  color="#f1aa1c"
                />
                <StatCard
                  label="Locked Chance"
                  value={`${stats.lockedChance}%`}
                  color="#c43198"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10 pb-4">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'conditions', label: 'Conditions' },
          { id: 'containers', label: 'Containers' },
          { id: 'locations', label: 'Locations' },
          { id: 'heatmap', label: 'Heatmap' },
          { id: 'marketplace', label: 'Marketplace' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background:
                activeTab === tab.id
                  ? 'rgba(34, 229, 255, 0.15)'
                  : 'rgba(255,255,255,0.06)',
              border: `1px solid ${activeTab === tab.id ? 'rgba(34, 229, 255, 0.5)' : 'rgba(255,255,255,0.1)'}`,
              color: activeTab === tab.id ? '#22e5ff' : 'rgba(255,255,255,0.6)',
              fontFamily: "'Barlow', sans-serif",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="rounded-2xl p-6"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {loading ? (
          <div className="text-center py-20 text-[var(--color-arc-muted)]">
            <div className="w-8 h-8 mx-auto mb-4 rounded-full animate-spin border-2 border-[var(--color-arc-yellow)] border-t-transparent" />
            Loading spawn data...
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab stats={stats} blueprintName={blueprintName} />
            )}
            {activeTab === 'conditions' && <ConditionsTab stats={stats} />}
            {activeTab === 'containers' && <ContainersTab stats={stats} />}
            {activeTab === 'locations' && (
              <LocationsTab reports={shiestyData} />
            )}
            {activeTab === 'heatmap' && (
              <HeatmapTab
                blueprintId={blueprintId}
                blueprintName={blueprintName}
              />
            )}
            {activeTab === 'marketplace' && (
              <MarketplaceTab
                blueprintName={blueprintName}
                blueprintId={blueprintId}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color, fontFamily: "'Barlow', sans-serif" }}>
        {label}
      </div>
      <div className="text-lg font-black text-white" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
        {value}
      </div>
    </div>
  );
}

function OverviewTab({ stats, blueprintName }: { stats: any; blueprintName: string }) {
  if (!stats) return <div className="text-center py-20 text-[var(--color-arc-muted)]"><Package className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>No spawn data for {blueprintName}</p></div>;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-black text-white uppercase tracking-wide" style={{ fontFamily: "'Rajdhani', sans-serif" }}>Spawn Distribution</h3>
      <div className="space-y-3">
        {stats.mapDistribution.map(([map, count]: [string, number], i: number) => {
          const percentage = Math.round((count / stats.totalReports) * 100);
          const colors = ['#22e5ff', '#25bb55', '#f1aa1c', '#c43198', '#ffcc00'];
          return (
            <div key={map} className="flex items-center gap-3">
              <div className="w-32 text-sm text-white truncate" style={{ fontFamily: "'Barlow', sans-serif" }}>{map}</div>
              <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, background: colors[i % colors.length] }} />
              </div>
              <div className="w-20 text-right text-sm" style={{ color: colors[i % colors.length], fontFamily: "'JetBrains Mono', monospace" }}>{count} ({percentage}%)</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConditionsTab({ stats }: { stats: any }) {
  if (!stats) return null;
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-black text-white uppercase tracking-wide" style={{ fontFamily: "'Rajdhani', sans-serif" }}>Conditions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.conditionDistribution.map(([condition, count]: [string, number]) => {
          const percentage = Math.round((count / stats.totalReports) * 100);
          const colors: Record<string, string> = { Day: '#f1aa1c', Night: '#c43198', Storm: '#01abf4', Hurricane: '#ffcc00' };
          return (
            <div key={condition} className="rounded-xl p-4 flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${colors[condition] || '#22e5ff'}20`, border: `1px solid ${colors[condition] || '#22e5ff'}40` }}>
                <Clock className="w-6 h-6" style={{ color: colors[condition] || '#22e5ff' }} />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold" style={{ fontFamily: "'Barlow', sans-serif" }}>{condition}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <div className="h-full rounded-full" style={{ width: `${percentage}%`, background: colors[condition] || '#22e5ff' }} />
                  </div>
                  <span className="text-sm" style={{ color: colors[condition] || '#22e5ff' }}>{count}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContainersTab({ stats }: { stats: any }) {
  if (!stats) return null;
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-black text-white uppercase tracking-wide" style={{ fontFamily: "'Rajdhani', sans-serif" }}>Containers</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.containerDistribution.map(([container, count]: [string, number], i: number) => {
          const percentage = Math.round((count / stats.totalReports) * 100);
          const colors = ['#22e5ff', '#25bb55', '#f1aa1c', '#c43198', '#ffcc00', '#01abf4'];
          return (
            <div key={container} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${colors[i % colors.length]}20`, border: `1px solid ${colors[i % colors.length]}40` }}>
                  <Package className="w-5 h-5" style={{ color: colors[i % colors.length] }} />
                </div>
                <span className="text-lg font-black" style={{ color: colors[i % colors.length], fontFamily: "'Rajdhani', sans-serif" }}>{percentage}%</span>
              </div>
              <p className="text-white font-semibold text-sm" style={{ fontFamily: "'Barlow', sans-serif" }}>{container}</p>
              <p className="text-xs text-[var(--color-arc-muted)]">{count} reports</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LocationsTab({ reports }: { reports: ShiestyReport[] }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-black text-white uppercase tracking-wide" style={{ fontFamily: "'Rajdhani', sans-serif" }}>Community Reports</h3>
      <div className="space-y-3">
        {reports.map((report, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[var(--color-arc-rare)]" />
                <span className="text-white font-semibold" style={{ fontFamily: "'Barlow', sans-serif" }}>{report.Map}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(34, 229, 255, 0.2)', color: '#22e5ff' }}>{report.Condition}</span>
              </div>
              <span className="text-xs text-[var(--color-arc-muted)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>#{i + 1}</span>
            </div>
            {report['Location on the map'] && <p className="text-sm text-[var(--color-arc-common)] mb-2" style={{ fontFamily: "'Barlow', sans-serif" }}> {report['Location on the map']}</p>}
            <div className="flex items-center gap-4 text-xs">
              <span className="text-[var(--color-arc-muted)]">Container: <span className="text-[var(--color-arc-rare)]">{report.Container}</span></span>
              <span>{report['Behind Locked Door?']?.toLowerCase().includes('lock') ? <span className="text-[var(--color-arc-epic)]"> Locked</span> : <span className="text-[var(--color-arc-uncommon)]"> Open</span>}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const HEATMAP_MAP_BOUNDS: Record<string, { width: number; height: number }> = {
  spaceport: { width: 5120, height: 4096 },
};

const HEATMAP_MAP_IMAGES: Record<string, string> = {
  spaceport: assetUrl('/maps/spaceport.png'),
};

function displayHeatmapItemId(itemId: string): string {
  return itemId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\s+(Blueprint|Recipe)$/i, '');
}

function HeatmapTab({
  blueprintId,
  blueprintName,
}: {
  blueprintId: string;
  blueprintName: string;
}) {
  const heatmapKeys = useMemo(() => {
    const cleanName = stripBlueprintSuffix(blueprintName);
    return new Set([
      blueprintHeatmapKey(blueprintId),
      blueprintHeatmapKey(blueprintName),
      blueprintHeatmapKey(cleanName),
      blueprintHeatmapKey(`${cleanName} blueprint`),
    ]);
  }, [blueprintId, blueprintName]);
  const blueprintPoints = useMemo(
    () =>
      blueprintCoordinates.filter((point) =>
        heatmapKeys.has(blueprintHeatmapKey(point.item_id)),
      ),
    [heatmapKeys],
  );
  const mapData = useMemo(() => {
    const byMap: Record<string, number> = {};
    blueprintPoints.forEach((point) => {
      byMap[point.map] = (byMap[point.map] || 0) + 1;
    });
    return Object.entries(byMap).sort((a, b) => b[1] - a[1]);
  }, [blueprintPoints]);
  const activeMapId = blueprintPoints[0]?.map || 'spaceport';
  const mapBounds = HEATMAP_MAP_BOUNDS[activeMapId] ?? HEATMAP_MAP_BOUNDS.spaceport;
  const mapImage = HEATMAP_MAP_IMAGES[activeMapId] ?? HEATMAP_MAP_IMAGES.spaceport;
  const displayedPoints = blueprintPoints;
  const displayedMaxStack = Math.max(
    1,
    ...displayedPoints.map(
      (point) =>
        displayedPoints.filter(
          (other) =>
            Math.abs(other.y - point.y) < 8 &&
            Math.abs(other.x - point.x) < 8,
        ).length,
    ),
  );
  const listData = mapData;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-black text-white uppercase tracking-wide" style={{ fontFamily: "'Rajdhani', sans-serif" }}>Heatmap</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {listData.map(([map, count], i) => {
            const intensity = count / Math.max(...listData.map((d) => d[1]));
            const heatColor = intensity > 0.7 ? '#ff4444' : intensity > 0.4 ? '#ffaa00' : '#22e5ff';
            return (
              <div key={map} className="rounded-xl p-4 flex items-center gap-4" style={{ background: `linear-gradient(90deg, ${heatColor}15 0%, rgba(255,255,255,0.06) ${intensity * 100}%)`, border: `1px solid ${heatColor}30` }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${heatColor}20`, border: `1px solid ${heatColor}40` }}>
                  <Flame className="w-6 h-6" style={{ color: heatColor }} />
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold" style={{ fontFamily: "'Barlow', sans-serif" }}>{map}</p>
                  <p className="text-xs text-[var(--color-arc-muted)]">{count} spawn reports</p>
                </div>
                <div className="w-3 h-3 rounded-full" style={{ background: heatColor, boxShadow: `0 0 10px ${heatColor}` }} />
              </div>
            );
          })}
        </div>
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.14)' }}>
          <div className="relative" style={{ aspectRatio: `${mapBounds.width} / ${mapBounds.height}` }}>
            <img
              src={mapImage}
              alt={`${activeMapId} blueprint heatmap`}
              className="absolute inset-0 w-full h-full object-cover opacity-70"
            />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, rgba(255,170,0,0.08), rgba(0,0,0,0.35))' }} />
            {displayedPoints.map((point) => {
              const nearby = displayedPoints.filter(
                (other) =>
                  Math.abs(other.y - point.y) < 8 &&
                  Math.abs(other.x - point.x) < 8,
              ).length;
              const intensity = nearby / displayedMaxStack;
              const size = 14 + intensity * 24;
              const left = Math.max(0, Math.min(100, (point.x / mapBounds.width) * 100));
              const top = Math.max(0, Math.min(100, (point.y / mapBounds.height) * 100));
              return (
                <div
                  key={point.id}
                  className="absolute rounded-full"
                  title={`${displayHeatmapItemId(point.item_id)} - ${point.added_by}`}
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: size,
                    height: size,
                    transform: 'translate(-50%, -50%)',
                    background: '#ff4444',
                    border: '1px solid rgba(255,255,255,0.9)',
                    boxShadow: `0 0 ${Math.round(size * 1.6)}px #ff4444`,
                    opacity: 0.78,
                  }}
                />
              );
            })}
            <div className="absolute left-3 bottom-3 right-3 rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.72)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="flex items-center gap-2">
                <Map className="w-4 h-4 text-[var(--color-arc-rare)]" />
                <p className="text-sm font-bold text-white" style={{ fontFamily: "'Barlow', sans-serif" }}>
                  {blueprintPoints.length} {stripBlueprintSuffix(blueprintName)} point{blueprintPoints.length === 1 ? '' : 's'}
                </p>
              </div>
              <p className="text-xs text-[var(--color-arc-muted)] mt-1">
                Spaceport blueprint heatmap data from SHiESTY blueprint points.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MarketplaceListing {
  _id: string;
  itemName: string;
  itemId?: string;
  price: number;
  currency: string;
  sellerName?: string;
  sellerId?: string;
  createdAt: string;
}

function MarketplaceTab({ blueprintName, blueprintId }: { blueprintName: string; blueprintId: string }) {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const { profile } = usePlayer();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Fetch marketplace listings filtered by blueprint name
    MarketplaceAPI.browse({ itemName: blueprintName, limit: '20' })
      .then((data: any) => {
        if (cancelled) return;
        const allListings = data?.listings || data || [];
        // Filter to only show listings for this blueprint
        const filtered = allListings.filter((l: MarketplaceListing) =>
          l.itemName?.toLowerCase().includes(blueprintName.toLowerCase()) ||
          l.itemId === blueprintId
        );
        setListings(filtered);
      })
      .catch((err) => {
        console.error('Failed to fetch marketplace listings:', err);
        setListings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [blueprintName, blueprintId]);

  async function handleBuy(listingId: string) {
    if (!profile?.id) {
      alert('Please log in to purchase items');
      return;
    }
    setBuying(listingId);
    try {
      await MarketplaceAPI.buy(listingId);
      // Remove bought listing from view
      setListings((prev) => prev.filter((l) => l._id !== listingId));
    } catch (e: any) {
      alert(e?.message || 'Failed to purchase item');
    } finally {
      setBuying(null);
    }
  }

  const myId = (profile as any)?.id ?? (profile as any)?.embarkId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-white uppercase tracking-wide" style={{ fontFamily: "'Rajdhani', sans-serif" }}>Marketplace</h3>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('shiesty:navigate', { detail: { tab: 'marketplace' } }))}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{ background: 'rgba(34, 229, 255, 0.15)', border: '1px solid rgba(34, 229, 255, 0.5)', color: '#22e5ff', fontFamily: "'Barlow', sans-serif" }}
        >
          <ShoppingCart className="w-4 h-4" />
          List for Sale
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-[var(--color-arc-muted)]" />
          <p className="text-[var(--color-arc-muted)]">Loading marketplace...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-arc-muted)]">
          <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No active listings for {blueprintName}</p>
          <p className="text-sm mt-2">Be the first to list one!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {listings.map((listing) => {
            const isMyListing = listing.sellerId === myId;
            return (
              <div key={listing._id} className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34, 229, 255, 0.1)', border: '1px solid rgba(34, 229, 255, 0.3)' }}>
                    <img
                      src={getItemImg(listing.itemId) || '/items/default.png'}
                      alt={listing.itemName}
                      className="w-10 h-10 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/items/default.png'; }}
                    />
                  </div>
                  <div>
                    <p className="text-white font-semibold" style={{ fontFamily: "'Barlow', sans-serif" }}>{listing.itemName}</p>
                    <p className="text-xs text-[var(--color-arc-muted)]">
                      Seller: {listing.sellerName || 'Unknown'}
                      {isMyListing && <span className="ml-2 text-[var(--color-arc-yellow)]">(You)</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black" style={{ color: '#22e5ff', fontFamily: "'Rajdhani', sans-serif" }}>
                    {listing.currency || '$'}{listing.price?.toLocaleString() || '0'}
                  </p>
                  {isMyListing ? (
                    <span className="text-xs text-[var(--color-arc-muted)]">Your listing</span>
                  ) : (
                    <button
                      onClick={() => handleBuy(listing._id)}
                      disabled={buying === listing._id || !profile?.id}
                      className="text-xs px-3 py-1 rounded-lg mt-1 transition-all hover:opacity-80 disabled:opacity-40"
                      style={{ background: 'rgba(34, 229, 255, 0.15)', border: '1px solid rgba(34, 229, 255, 0.3)', color: '#22e5ff' }}
                    >
                      {buying === listing._id ? 'Buying...' : 'Buy Now'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
