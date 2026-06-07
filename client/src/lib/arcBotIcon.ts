import { assetUrl } from './assetUrl';

export const ARC_BOT_FALLBACK_ICON = assetUrl('/bots/arc_probe.webp');
const SHIESTY_MAP_ICON_BASE = 'https://assets.shiesty.me/shiestymapicon';

function slugifyArcBotName(name: string): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/^arc[\s_-]*/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const ARC_BOT_ICON_OVERRIDES: Record<string, string> = {
  arc_surveyor: assetUrl(`${SHIESTY_MAP_ICON_BASE}/arc_courier_mf256.png`),
  bastion: assetUrl(`${SHIESTY_MAP_ICON_BASE}/bastion_mf.png`),
  bombardier: assetUrl(`${SHIESTY_MAP_ICON_BASE}/Bombardier.png`),
  comet: assetUrl(`${SHIESTY_MAP_ICON_BASE}/comet_mf.png`),
  fireball: assetUrl(`${SHIESTY_MAP_ICON_BASE}/Fireball_new256.png`),
  firefly: assetUrl(`${SHIESTY_MAP_ICON_BASE}/firefly_mf.png`),
  hornet: assetUrl(`${SHIESTY_MAP_ICON_BASE}/hornet_mf.png`),
  matriarch: assetUrl(`${SHIESTY_MAP_ICON_BASE}/matriarch256.png`),
  pop: assetUrl(`${SHIESTY_MAP_ICON_BASE}/pop256.png`),
  queen: assetUrl(`${SHIESTY_MAP_ICON_BASE}/queen_mf.png`),
  rocketeer: assetUrl(`${SHIESTY_MAP_ICON_BASE}/rocketeer_mf.png`),
  sentinel: assetUrl(`${SHIESTY_MAP_ICON_BASE}/sentinel_mp.png`),
  shredder: assetUrl(`${SHIESTY_MAP_ICON_BASE}/shredder.png`),
  snitch: assetUrl(`${SHIESTY_MAP_ICON_BASE}/snitch_mf.png`),
  spotter: assetUrl(`${SHIESTY_MAP_ICON_BASE}/ARC_Spotter.png.webp`),
  tick: assetUrl(`${SHIESTY_MAP_ICON_BASE}/tick_mf.png`),
  turret: assetUrl(`${SHIESTY_MAP_ICON_BASE}/turret_mf.png`),
  vaporizer: assetUrl(`${SHIESTY_MAP_ICON_BASE}/vaporizer.png`),
  wasp: assetUrl(`${SHIESTY_MAP_ICON_BASE}/wasp_mf.png`),
};

const ARC_BOT_ID_TO_NAME: Record<string, string> = {
  '672378114': 'wasp',
  '299263764': 'fireball',
  '-352140120': 'tick',
  '-504231823': 'pop',
  '664422097': 'hornet',
  '913532953': 'turret',
  '1786451563': 'snitch',
  '-1524715377': 'firefly',
  '-1562077677': 'spotter',
  '2015925366': 'shredder',
  '903845622': 'rocketeer',
  '-541195755': 'leaper',
  '-1780443771': 'comet',
  '-1616729167': 'bastion',
  '-1311527696': 'bombardier',
  '1143392102': 'arc_surveyor',
  '-1122989322': 'sentinel',
  '1639912088': 'vaporizer',
};

export function getArcBotIcon(name: string): string {
  const slug = slugifyArcBotName(name);
  if (!slug) return ARC_BOT_FALLBACK_ICON;
  if (ARC_BOT_ICON_OVERRIDES[slug]) return ARC_BOT_ICON_OVERRIDES[slug];
  return assetUrl(`/bots/arc_${slug}.svg`);
}

export function getArcBotIconById(
  targetId: string | number | undefined | null,
  fallbackName = '',
): string {
  const slug =
    targetId !== undefined && targetId !== null
      ? ARC_BOT_ID_TO_NAME[String(targetId)]
      : '';
  if (slug && ARC_BOT_ICON_OVERRIDES[slug]) return ARC_BOT_ICON_OVERRIDES[slug];
  return getArcBotIcon(fallbackName || slug);
}
