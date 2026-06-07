/**
 * poiMarkers.ts — POI marker rendering for Leaflet divIcons.
 * Adapted from pois/maps/MapPoiMarker.tsx
 * Icons served from local ADD-2-MAPS assets first, with configured asset-host fallbacks.
 */

import type { PoiCategory, MapPoi } from './poi-types';

const ASSET_BASE = (
  import.meta.env.VITE_ASSETS_URL || 'https://assets.shiesty.me'
).replace(/\/$/, '');
const LOCAL_ICON_BASE = '/map-icons/';

const localIcon = (name: string) => `${LOCAL_ICON_BASE}/${name}`;

export type PoiCategoryVisual = {
  label: string;
  color: string;
  iconSrc: string;
};

export const POI_CATEGORY_META: Record<PoiCategory, PoiCategoryVisual> = {
  extract: {
    label: 'Extract',
    color: '#34d399',
    iconSrc: localIcon('extraction_point.png'),
  },
  key: {
    label: 'Key',
    color: '#fbbf24',
    iconSrc: localIcon('key.svg'),
  },
  quest: {
    label: 'Quest',
    color: '#818cf8',
    iconSrc: localIcon('task.svg'),
  },
  area: {
    label: 'Area',
    color: '#94a3b8',
    iconSrc: localIcon('generic-marker.png'),
  },
  container: {
    label: 'Container',
    color: '#f97316',
    iconSrc: localIcon('Field-crate-4.png'),
  },
  loot: {
    label: 'Loot',
    color: '#f472b6',
    iconSrc: localIcon('raider_cache_3d.png'),
  },
  arc: {
    label: 'ARC',
    color: '#f87171',
    iconSrc: localIcon('arc-courier.png'),
  },
  nature: {
    label: 'Nature',
    color: '#a3e635',
    iconSrc: localIcon('agave.png'),
  },
  interaction: {
    label: 'Interact.',
    color: '#38bdf8',
    iconSrc: localIcon('supply_call.png'),
  },
  noise: {
    label: 'Noise',
    color: '#c084fc',
    iconSrc: localIcon('camera.webp'),
  },
};

function resolvePoiIconSrc(
  poi: Pick<MapPoi, 'category' | 'name' | 'iconKey'>,
): string {
  const key = poi.iconKey?.trim();
  if (key) return localIcon(key);

  const name = poi.name.toLowerCase();

  if (poi.category === 'extract') {
    if (name.includes('hatch')) return localIcon('hatch.webp');
    if (name.includes('airshaft') || name.includes('shaft'))
      return localIcon('airshaft.webp');
    if (
      name.includes('metro') ||
      name.includes('subway') ||
      name.includes('stairs')
    )
      return localIcon('stairs.webp');
    return localIcon('extraction_point.png');
  }

  if (poi.category === 'arc') {
    if (name.includes('sentinel')) return localIcon('sentinel.webp');
    if (name.includes('wasp')) return localIcon('wasp.webp');
    if (name.includes('hornet')) return localIcon('hornet.webp');
    if (name.includes('bastion')) return localIcon('bastion.webp');
    if (name.includes('bombardier')) return localIcon('bombardier.webp');
    if (name.includes('rocketeer')) return localIcon('rocketeer.webp');
    if (name.includes('turret')) return localIcon('turret.webp');
    if (name.includes('tick')) return localIcon('tick.webp');
    if (name.includes('probe')) return localIcon('arc-probe.png');
    return localIcon('arc-courier.png');
  }

  if (poi.category === 'nature') {
    if (name.includes('agave')) return localIcon('agave.png');
    if (name.includes('apricot')) return localIcon('apricot.png');
    if (name.includes('moss')) return localIcon('moss.webp');
    if (name.includes('mushroom')) return localIcon('mushroom.png');
    if (name.includes('mullein')) return localIcon('great-mullein.png');
    if (name.includes('prickly')) return localIcon('prickly-pear.png');
    return localIcon('agave.png');
  }

  if (poi.category === 'interaction') {
    if (name.includes('zipline')) return localIcon('zipline3.png');
    if (name.includes('ladder')) return localIcon('ladder.png');
    if (name.includes('supply')) return localIcon('supply_call.png');
    if (name.includes('fuel')) return localIcon('fuel-cell.png');
    return localIcon('generic-marker.png');
  }

  if (poi.category === 'noise') {
    if (name.includes('camera')) return localIcon('camera.webp');
    return localIcon('camera.webp');
  }

  if (poi.category === 'loot' || poi.category === 'container') {
    if (name.includes('weapon case')) return localIcon('weapon-case.webp');
    if (name.includes('weapon crate')) return localIcon('Weapons-crate.png');
    if (name.includes('ammo')) return localIcon('Ammo-crate.png');
    if (name.includes('medical') || name.includes('med'))
      return localIcon('Med-bag.png');
    if (name.includes('locker')) return localIcon('locker.png');
    if (name.includes('backpack')) return localIcon('backpack-2.png');
    if (name.includes('cache')) return localIcon('raider_cache_3d.png');
    if (name.includes('field depot')) return localIcon('field-depot.png');
    if (name.includes('grenade')) return localIcon('grenade-case.png');
    if (name.includes('safe') || name.includes('security'))
      return localIcon('security-locker.png');
    return localIcon('Field-crate-4.png');
  }

  return (
    POI_CATEGORY_META[poi.category].iconSrc ||
    `${ASSET_BASE}/map-icons/icons/t_icon_event.webp`
  );
}

export function buildPoiMarkerHtml(
  poi: Pick<MapPoi, 'category' | 'name' | 'iconKey'>,
  selected: boolean,
  visited = false,
): string {
  const { color } = POI_CATEGORY_META[poi.category];
  const iconSrc = resolvePoiIconSrc(poi);
  const size = selected ? 22 : 18;
  const inner = selected ? 14 : 12;
  const radius = selected ? 7 : 6;
  const check = visited
    ? `<span style="
        position:absolute;
        right:-5px;
        bottom:-5px;
        width:12px;
        height:12px;
        border-radius:999px;
        background:#34d399;
        border:1.5px solid #071018;
        color:#071018;
        font-size:9px;
        line-height:10px;
        font-weight:900;
        text-align:center;
      ">✓</span>`
    : '';
  if (selected) {
    return `<div style="
      position:relative;
      box-sizing:border-box;
      width:${size}px;
      height:${size}px;
      background:rgba(5,10,18,0.96);
      border:2.5px solid rgba(255,255,255,0.95);
      border-radius:${radius}px;
      box-shadow:
        0 0 0 2px rgba(0,0,0,0.55),
        0 0 14px ${color},
        0 0 28px ${color}55,
        0 2px 8px rgba(0,0,0,0.85);
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:center;
      overflow:hidden;
    ">
      <div style="
        width:${inner}px;
        height:${inner}px;
        border-radius:4px;
        background:${color}22 url('${iconSrc}') center/contain no-repeat;
        filter:drop-shadow(0 0 6px ${color});
      "></div>
      ${check}
    </div>`;
  }
  return `<div style="
    position:relative;
    box-sizing:border-box;
    width:${size}px;
    height:${size}px;
    background:rgba(5,10,18,0.92);
    border:1.5px solid rgba(255,255,255,0.74);
    border-radius:${radius}px;
    box-shadow:
      0 0 0 1px rgba(0,0,0,0.5),
      0 0 9px ${color}b0,
      0 2px 6px rgba(0,0,0,0.75);
    cursor:pointer;
    transition:transform 0.1s;
    display:flex;
    align-items:center;
    justify-content:center;
    overflow:hidden;
  " onmouseenter="this.style.transform='scale(1.22)'" onmouseleave="this.style.transform='scale(1)'">
    <div style="
      width:${inner}px;
      height:${inner}px;
      border-radius:4px;
      background:${color}1a url('${iconSrc}') center/contain no-repeat;
      filter:drop-shadow(0 0 5px ${color});
    "></div>
    ${check}
  </div>`;
}

export function buildContainerMarkerHtml(
  color: string,
  selected: boolean,
): string {
  const size = selected ? 20 : 16;
  return `<div style="
    width:${size}px;
    height:${size}px;
    background:${color}${selected ? 'dd' : '88'};
    border:2px solid ${selected ? '#fff' : 'rgba(255,255,255,0.6)'};
    transform:rotate(45deg);
    box-shadow:0 0 ${selected ? '12' : '6'}px ${color}${selected ? 'cc' : '80'};
    cursor:pointer;
    transition:transform 0.15s, box-shadow 0.15s;
  " onmouseenter="this.style.transform='rotate(45deg) scale(1.35)';this.style.boxShadow='0 0 16px ${color}cc'" onmouseleave="this.style.transform='rotate(45deg) scale(1)';this.style.boxShadow='0 0 ${selected ? '12' : '6'}px ${color}${selected ? 'cc' : '80'}'"></div>`;
}
