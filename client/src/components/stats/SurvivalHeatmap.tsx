import { useMemo } from 'react';
import { Map, Clock, TrendingUp } from 'lucide-react';

interface Round {
  mapName?: string;
  map?: string;
  outcome?: string;
  status?: string;
  roundEndedAt?: string;
  syncedAt?: string;
  timestamp?: string;
}

interface MapTimeStats {
  mapName: string;
  hour: number;
  raids: number;
  extracted: number;
  survivalRate: number;
}

interface SurvivalHeatmapProps {
  rounds: Round[];
  title?: string;
}

const MAP_NAMES: Record<string, string> = {
  'The Dam': 'Dam',
  'Dam Battlegrounds': 'Dam',
  'Stella Montis': 'Stella',
  'The Blue Gate': 'Blue Gate',
  'Buried City': 'Buried',
  Spaceport: 'Spaceport',
};

function normalizeMapName(name: string): string {
  const n = (name || 'Unknown').toLowerCase().replace(/_/g, ' ');
  if (
    n.includes('dam') ||
    n.includes('reservoir') ||
    n.includes('battleground')
  )
    return 'The Dam';
  if (n.includes('stella') || n.includes('montis')) return 'Stella Montis';
  if (n.includes('blue') || n.includes('gate')) return 'The Blue Gate';
  if (n.includes('buried') || n.includes('city')) return 'Buried City';
  if (n.includes('spaceport') || n.includes('shuttle')) return 'Spaceport';
  return name || 'Unknown';
}

function isExtracted(r: Round): boolean {
  const s = (r.outcome || r.status || '').toLowerCase();
  return s === 'extracted' || s.includes('extract') || s === 'success';
}

function getHour(r: Round): number {
  const dateStr = r.roundEndedAt || r.syncedAt || r.timestamp || '';
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  return date.getHours();
}

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h} ${ampm}`;
}

export function SurvivalHeatmap({
  rounds,
  title = 'Survival by Map & Time',
}: SurvivalHeatmapProps) {
  const stats = useMemo(() => {
    if (!Array.isArray(rounds) || rounds.length === 0)
      return { maps: [], bestTime: null, worstTime: null };

    type HourData = { raids: number; extracted: number };
    const mapTimeData: Record<string, Record<string, HourData>> = {};

    for (const r of rounds) {
      const mapName = normalizeMapName(r.mapName || r.map || 'Unknown');
      const hour = getHour(r);
      const hourKey = `${Math.floor(hour / 2) * 2}-${Math.floor(hour / 2) * 2 + 2}`;

      if (!mapTimeData[mapName]) {
        mapTimeData[mapName] = {};
      }
      if (!mapTimeData[mapName][hourKey]) {
        mapTimeData[mapName][hourKey] = { raids: 0, extracted: 0 };
      }
      mapTimeData[mapName][hourKey].raids++;
      if (isExtracted(r)) mapTimeData[mapName][hourKey].extracted++;
    }

    // Convert to array and calculate survival rates
    const maps: MapTimeStats[] = [];
    for (const mapName of Object.keys(mapTimeData)) {
      for (const hourKey of Object.keys(mapTimeData[mapName])) {
        const data = mapTimeData[mapName][hourKey];
        const [startHour] = hourKey.split('-').map(Number);
        maps.push({
          mapName,
          hour: startHour,
          raids: data.raids,
          extracted: data.extracted,
          survivalRate: data.raids > 0 ? data.extracted / data.raids : 0,
        });
      }
    }

    // Find best and worst times
    const sortedBySurvival = [...maps].sort(
      (a, b) => b.survivalRate - a.survivalRate,
    );
    const bestTime = sortedBySurvival[0] || null;
    const worstTime = sortedBySurvival[sortedBySurvival.length - 1] || null;

    return { maps, bestTime, worstTime };
  }, [rounds]);

  const uniqueMaps = useMemo(() => {
    const set = new Set(stats.maps.map((m) => m.mapName));
    return Array.from(set).sort();
  }, [stats.maps]);

  const timeSlots = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

  if (rounds.length === 0) {
    return (
      <div className="bg-arc-light-bg border border-[#1e1e1e]">
        <div className="px-4 py-2.5 border-b border-[#141414] flex items-center gap-2">
          <Map className="w-4 h-4 text-arc-rare" />
          <h2 className="text-[10px] font-black uppercase tracking-widest">
            {title}
          </h2>
        </div>
        <div className="p-8 text-center text-muted-foreground text-sm">
          No raid data available — play a raid to populate survival analytics
        </div>
      </div>
    );
  }

  const getCellColor = (survivalRate: number, raids: number): string => {
    if (raids === 0) return 'transparent';
    if (survivalRate >= 0.7) return '#22c55e'; // green
    if (survivalRate >= 0.5) return '#eab308'; // yellow
    if (survivalRate >= 0.3) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  return (
    <div className="bg-arc-light-bg border border-[#1e1e1e]">
      <div className="px-4 py-2.5 border-b border-[#141414] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-arc-rare" />
          <h2 className="text-[10px] font-black uppercase tracking-widest">
            {title}
          </h2>
        </div>
        {stats.bestTime && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            Best: {MAP_NAMES[stats.bestTime.mapName] ||
              stats.bestTime.mapName}{' '}
            @ {formatHour(stats.bestTime.hour)} (
            {(stats.bestTime.survivalRate * 100).toFixed(0)}%)
          </span>
        )}
      </div>
      <div className="p-4">
        {/* Legend */}
        <div className="flex items-center gap-4 mb-3 text-[10px] text-muted-foreground">
          <span>Survival Rate:</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded"
                style={{ backgroundColor: '#22c55e' }}
              />
              70%+
            </span>
            <span className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded"
                style={{ backgroundColor: '#eab308' }}
              />
              50-69%
            </span>
            <span className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded"
                style={{ backgroundColor: '#f97316' }}
              />
              30-49%
            </span>
            <span className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded"
                style={{ backgroundColor: '#ef4444' }}
              />
              &lt;30%
            </span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Header row with time slots */}
            <div className="grid grid-cols-[100px_repeat(12,1fr)] gap-1">
              <div className="text-[10px] font-medium text-muted-foreground">
                Map
              </div>
              {timeSlots.map((hour) => (
                <div
                  key={hour}
                  className="text-[10px] text-center text-muted-foreground"
                >
                  <Clock className="w-3 h-3 mx-auto mb-0.5" />
                  {formatHour(hour)}
                </div>
              ))}
            </div>

            {/* Data rows */}
            {uniqueMaps.map((mapName) => (
              <div
                key={mapName}
                className="grid grid-cols-[100px_repeat(12,1fr)] gap-1 mt-1"
              >
                <div className="text-xs font-medium truncate py-1">
                  {MAP_NAMES[mapName] || mapName}
                </div>
                {timeSlots.map((hour) => {
                  const data = stats.maps.find(
                    (m) => m.mapName === mapName && m.hour === hour,
                  );
                  const color = getCellColor(
                    data?.survivalRate || 0,
                    data?.raids || 0,
                  );
                  const hasData = (data?.raids || 0) > 0;

                  return (
                    <div
                      key={hour}
                      className={`h-8 rounded flex items-center justify-center text-[9px] font-bold ${
                        hasData ? '' : 'bg-muted/20'
                      }`}
                      style={{
                        backgroundColor: hasData ? color : undefined,
                        color: hasData ? '#000' : undefined,
                      }}
                      title={
                        hasData
                          ? `${mapName} @ ${formatHour(hour)}: ${data?.extracted}/${data?.raids} (${(
                              (data?.survivalRate || 0) * 100
                            ).toFixed(0)}%)`
                          : undefined
                      }
                    >
                      {hasData
                        ? `${((data?.survivalRate || 0) * 100).toFixed(0)}%`
                        : ''}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
