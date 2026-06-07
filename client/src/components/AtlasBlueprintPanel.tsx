import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  MapPin,
  Package,
  Lock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Info,
} from 'lucide-react';

type AtlasRow = {
  Blueprint?: string;
  blueprint?: string;
  Map?: string;
  map?: string;
  Condition?: string;
  condition?: string;
  'Map Condition'?: string;
  'Behind Locked Door?'?: string;
  behind_locked?: string | boolean;
  Container?: string;
  container?: string | null;
  'Location on the map'?: string;
  location_on_map?: string | null;
};

type GroupedBlueprint = {
  name: string;
  rows: AtlasRow[];
  totalFinds: number;
  uniqueMaps: number;
  uniqueContainers: string[];
  rarity: string;
  maps: string[];
};

const ATLAS_MAPS = [
  'All',
  'Dam Battlegrounds',
  'Blue Gate',
  'Buried City',
  'Spaceport',
  'Stella Montis',
];

const ATLAS_CONDITIONS = [
  'All',
  'Day',
  'Night',
  'Storm',
  'Montis',
  'Any',
  'Bunker',
  'Hurricane',
  'Hidden Bunker',
];

const ATLAS_RARITIES = [
  'All',
  'Common',
  'Uncommon',
  'Rare',
  'Very Rare',
  'Legendary',
];

const ATLAS_RARITY_COLOR: Record<string, string> = {
  Common: 'var(--color-arc-common)',
  Uncommon: 'var(--color-arc-uncommon)',
  Rare: 'var(--color-arc-rare)',
  'Very Rare': 'var(--color-arc-epic)',
  Legendary: 'var(--color-arc-legendary)',
};

function getAtlasrarity(totalReports: number, uniqueMaps: number): string {
  if (totalReports >= 100 && uniqueMaps >= 5) return 'Common';
  if (totalReports >= 50 && uniqueMaps >= 3) return 'Uncommon';
  if (totalReports >= 20) return 'Rare';
  if (totalReports >= 10) return 'Very Rare';
  return 'Legendary';
}

function atlasValue(...values: unknown[]): string {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    return String(value);
  }
  return '';
}

function blueprintName(row: AtlasRow): string {
  return atlasValue(row.Blueprint, row.blueprint, 'Unknown');
}

function rowMap(row: AtlasRow): string {
  return atlasValue(row.Map, row.map, 'Unknown');
}

function rowCondition(row: AtlasRow): string {
  return atlasValue(row.Condition, row.condition, 'Any');
}

function rowContainer(row: AtlasRow): string {
  return atlasValue(row.Container, row.container);
}

function rowLocation(row: AtlasRow): string {
  return atlasValue(row['Location on the map'], row.location_on_map);
}

function rowLocked(row: AtlasRow): string {
  return atlasValue(row['Behind Locked Door?'], row.behind_locked);
}

function isLocked(lockedStr: string): boolean {
  const s = (lockedStr ?? '').toLowerCase();
  return (
    s === 'true' ||
    s === 'yes' ||
    s.includes('key room') ||
    s.includes('breaching') ||
    (s.includes('locked') && !s.includes("wasn't"))
  );
}

export default function AtlasBlueprintPanel({
  initialSearch = '',
}: {
  initialSearch?: string;
}) {
  const [rows, setRows] = useState<AtlasRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [mapFilter, setMapFilter] = useState('All');
  const [rarityFilter, setrarityFilter] = useState('All');
  const [conditionFilter, setConditionFilter] = useState('All');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSearch(initialSearch);
    if (initialSearch) setExpanded(new Set([initialSearch]));
  }, [initialSearch]);

  useEffect(() => {
    if (rows !== null) return;
    setLoading(true);
    setError(false);
    fetch('/atlas-db/rest/v1/arc_blueprints')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: AtlasRow[]) => setRows(Array.isArray(data) ? data : []))
      .catch(() => {
        setError(true);
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [rows]);

  const grouped = useMemo<GroupedBlueprint[]>(() => {
    if (!rows) return [];
    const map = new Map<string, AtlasRow[]>();
    rows.forEach((r) => {
      const key = blueprintName(r).trim() || 'Unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries())
      .map(([name, bpRows]) => {
        const maps = [...new Set(bpRows.map(rowMap).filter(Boolean))];
        const uniqueContainers = [
          ...new Set(bpRows.map(rowContainer).filter(Boolean)),
        ];
        const rarity = getAtlasrarity(bpRows.length, maps.length);
        return {
          name,
          rows: bpRows,
          totalFinds: bpRows.length,
          uniqueMaps: maps.length,
          uniqueContainers,
          rarity,
          maps,
        };
      })
      .sort((a, b) => b.totalFinds - a.totalFinds);
  }, [rows]);

  const filtered = useMemo(() => {
    return grouped.filter((bp) => {
      if (
        search &&
        !bp.name.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (rarityFilter !== 'All' && bp.rarity !== rarityFilter) return false;
      if (mapFilter !== 'All' && !bp.maps.includes(mapFilter)) return false;
      return true;
    });
  }, [grouped, search, rarityFilter, mapFilter]);

  const getVisibleRows = (bp: GroupedBlueprint): AtlasRow[] => {
    if (conditionFilter === 'All' && mapFilter === 'All') return bp.rows;
    return bp.rows.filter((r) => {
      if (conditionFilter !== 'All' && rowCondition(r) !== conditionFilter)
        return false;
      if (mapFilter !== 'All' && rowMap(r) !== mapFilter) return false;
      return true;
    });
  };

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-arc-rare)]" />
        <span className="ml-3 text-sm font-black uppercase tracking-widest text-[var(--color-arc-common)]">
          Loading Atlas Data…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-[var(--color-arc-danger)]">
        <p className="text-sm font-black uppercase tracking-widest">
          Failed to load atlas data
        </p>
        <p className="text-xs text-[var(--color-arc-muted)] mt-1">
          Make sure the atlas is built and served at /atlas/
        </p>
      </div>
    );
  }

  if (!rows) return null;

  return (
    <div>
      {/* Stats header */}
      <div className="mb-4 p-4 bg-[#0d0d14] border border-[#1e1e2e] flex flex-wrap gap-5 items-start">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-arc-muted)]">
            Total Entries
          </p>
          <p className="text-2xl font-black text-white">
            {rows.length.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-arc-muted)]">
            Blueprints
          </p>
          <p className="text-2xl font-black text-[var(--color-arc-rare)]">
            {grouped.length}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-arc-muted)]">
            Maps Covered
          </p>
          <p className="text-2xl font-black text-[var(--color-arc-uncommon)]">
            {ATLAS_MAPS.length - 1}
          </p>
        </div>
        <div className="ml-auto flex items-start gap-1.5 max-w-xs">
          <Info className="w-3.5 h-3.5 text-[var(--color-arc-yellow)] mt-0.5 shrink-0" />
          <div className="text-[10px] text-[var(--color-arc-muted)] leading-relaxed">
            <span className="text-[var(--color-arc-yellow)] font-black block mb-0.5">
              rarity = community dataset heuristic
            </span>
            Common ≥100 reports + 5 maps · Uncommon ≥50 + 3 maps · Rare ≥20 ·
            Very Rare ≥10 · Legendary &lt;10
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-arc-common)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blueprint name..."
            className="w-full bg-[#0d0d14] border border-[#1e1e2e] text-white text-sm pl-9 pr-3 py-2.5 outline-none focus:border-[var(--color-arc-rare)] placeholder-[var(--color-arc-muted)]"
          />
        </div>
        <select
          value={mapFilter}
          onChange={(e) => setMapFilter(e.target.value)}
          className="bg-[#0d0d14] border border-[#1e1e2e] text-[var(--color-arc-common)] text-sm px-3 py-2.5 outline-none focus:border-[var(--color-arc-rare)]"
        >
          {ATLAS_MAPS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select
          value={conditionFilter}
          onChange={(e) => setConditionFilter(e.target.value)}
          className="bg-[#0d0d14] border border-[#1e1e2e] text-[var(--color-arc-common)] text-sm px-3 py-2.5 outline-none focus:border-[var(--color-arc-rare)]"
        >
          {ATLAS_CONDITIONS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* rarity filter strip */}
      <div className="flex gap-1 mb-5 flex-wrap">
        {ATLAS_RARITIES.map((r) => {
          const col = ATLAS_RARITY_COLOR[r] ?? 'var(--color-arc-rare)';
          const active = rarityFilter === r;
          return (
            <button
              key={r}
              onClick={() => setrarityFilter(r)}
              className="px-3 py-1.5 text-xs font-black uppercase tracking-wider border transition-colors"
              style={{
                borderColor: active ? col : '#1e1e2e',
                color: active ? col : 'var(--color-arc-muted)',
                background: active ? `${col}15` : 'transparent',
              }}
            >
              {r}
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <p className="text-sm text-[var(--color-arc-common)] mb-4">
        Showing{' '}
        <span className="text-white font-black">{filtered.length}</span>{' '}
        blueprints
        {search || rarityFilter !== 'All' || mapFilter !== 'All'
          ? ` (filtered from ${grouped.length})`
          : ''}
      </p>

      {/* Blueprint list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[var(--color-arc-common)]">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-black uppercase tracking-widest">
            No atlas entries found
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((bp) => {
            const isOpen = expanded.has(bp.name);
            const color =
              ATLAS_RARITY_COLOR[bp.rarity] ?? 'var(--color-arc-common)';
            const visibleRows = getVisibleRows(bp);

            return (
              <div
                key={bp.name}
                className="bg-[#0d0d14] border"
                style={{
                  borderColor: `${color}40`,
                  borderLeftColor: color,
                  borderLeftWidth: 3,
                }}
              >
                {/* Blueprint header row */}
                <button
                  onClick={() => toggle(bp.name)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white uppercase tracking-wide truncate">
                      {bp.name}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span
                        className="text-[10px] font-black uppercase tracking-widest"
                        style={{ color }}
                      >
                        {bp.rarity}
                      </span>
                      <span className="text-xs text-[var(--color-arc-common)]">
                        {bp.totalFinds} find
                        {bp.totalFinds !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[var(--color-arc-muted)]">
                        <MapPin className="w-3 h-3" /> {bp.uniqueMaps} map
                        {bp.uniqueMaps !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[var(--color-arc-muted)]">
                        <Package className="w-3 h-3" />{' '}
                        {bp.uniqueContainers.length} container type
                        {bp.uniqueContainers.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Map tags */}
                  <div className="hidden sm:flex gap-1 flex-wrap max-w-[220px] justify-end">
                    {bp.maps.slice(0, 4).map((m) => (
                      <span
                        key={m}
                        className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 border border-[#2a2a3a] text-[var(--color-arc-common)] shrink-0"
                      >
                        {m
                          .replace(' Battlegrounds', '')
                          .replace('Buried City', 'Buried')
                          .replace('Spaceport', 'Space')}
                      </span>
                    ))}
                    {bp.maps.length > 4 && (
                      <span className="text-[9px] text-[var(--color-arc-muted)]">
                        +{bp.maps.length - 4}
                      </span>
                    )}
                  </div>

                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[var(--color-arc-muted)] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--color-arc-muted)] shrink-0" />
                  )}
                </button>

                {/* Expanded find entries */}
                {isOpen && (
                  <div className="border-t border-[#1e1e2e] divide-y divide-[#1e1e2e]">
                    {visibleRows.length === 0 ? (
                      <p className="text-xs text-[var(--color-arc-muted)] p-3 text-center">
                        No finds match current filters.
                      </p>
                    ) : (
                      visibleRows.map((row, i) => (
                        <div
                          key={i}
                          className="px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1 items-start hover:bg-white/[0.02]"
                        >
                          <span className="flex items-center gap-1 text-xs font-black text-white min-w-[120px]">
                            <MapPin className="w-3 h-3 text-[var(--color-arc-rare)] shrink-0" />
                            {rowMap(row)}
                          </span>
                          <span className="text-xs text-[var(--color-arc-yellow)] min-w-[56px]">
                            {rowCondition(row)}
                          </span>
                          {rowContainer(row) && (
                            <span className="flex items-center gap-1 text-xs text-[var(--color-arc-common)]">
                              <Package className="w-3 h-3 shrink-0" />
                              {rowContainer(row)}
                            </span>
                          )}
                          {rowLocation(row) && (
                            <span className="text-xs text-[var(--color-arc-muted)] flex-1">
                              {rowLocation(row)}
                            </span>
                          )}
                          {isLocked(rowLocked(row)) && (
                            <span className="flex items-center gap-1 text-[10px] text-[var(--color-arc-yellow)] font-black uppercase tracking-widest">
                              <Lock className="w-3 h-3 shrink-0" /> Locked
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
