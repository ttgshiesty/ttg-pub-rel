/**
 * assetUrl — resolves a site-relative asset path against the configured asset base.
 *
 * so assetUrl('/items/venator_ii.webp') → 'https://assets.shiesty.me/items/venator_ii.webp'
 *
 * In local dev (no env var set), returns the path as-is for vite dev server.
 */
const BASE = (import.meta.env.VITE_ASSETS_URL || '').replace(/\/$/, '');

const ASSET_ORIGIN = 'https://assets.shiesty.me';
const ARCTRACKER_ITEMS_ORIGIN = 'https://assets.shiesty.me/items';
const ARCTRACKER_MISC_ORIGIN = 'https://assets.shiesty.me/misc';
const GITHUB_ITEMS_ORIGIN =
  'https://raw.githubusercontent.com/dandwyer/arcraiders-data/main/images/items';

const FOLDER_ALIASES: Record<string, string> = {
  icons: 'icons',
  map: 'maps',
  mapdata: 'maps',
  condition: 'maps',
  map_condition: 'maps',
  'map-condition': 'maps',
  'map-events': 'maps',
  live_event_img: 'live-event-img',
  'live-event-img': 'live-event-img',
  skilltree: 'icons',
  traders: 'icons',
};

function normalizeAssetPath(input: string): string {
  if (!input) return input;

  const [rawPath, suffix = ''] = input.split(/([?#].*)/, 2);
  let path = rawPath;

  if (rawPath.startsWith(ASSET_ORIGIN)) {
    path = rawPath.slice(ASSET_ORIGIN.length);
  } else if (rawPath.startsWith(`${ARCTRACKER_ITEMS_ORIGIN}/v2/`)) {
    path = `/items/${rawPath.split('/').pop() || ''}`;
  } else if (rawPath.startsWith(ARCTRACKER_ITEMS_ORIGIN)) {
    path = `/items/${rawPath.split('/').pop() || ''}`;
  } else if (rawPath.startsWith(ARCTRACKER_MISC_ORIGIN)) {
    path = `/raritybg/${rawPath.split('/').pop() || ''}`;
  } else if (rawPath.startsWith(GITHUB_ITEMS_ORIGIN)) {
    path = `/items/${rawPath.split('/').pop() || ''}`;
  }

  if (!path.startsWith('/')) path = `/${path}`;

  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return `/${suffix}`;

  const folder = parts[0].toLowerCase();

  const normalizedFolder = FOLDER_ALIASES[folder] ?? folder;
  const normalizedRest = parts.slice(1).join('/');

  return `/${[normalizedFolder, normalizedRest].filter(Boolean).join('/')}${suffix}`;
}

export function assetUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    const normalized = normalizeAssetPath(path);
    if (normalized === path) return path;
    return `${BASE || ASSET_ORIGIN}${normalized}`;
  }

  // For local development, check if asset exists in public folder first
  if (!BASE || import.meta.env.DEV) {
    return path;
  }

  return BASE + normalizeAssetPath(path);
}
