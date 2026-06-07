const DEFAULT_ASSET_ORIGIN = 'https://assets.shiesty.me';

const ASSET_ORIGIN = (
  process.env.ASSETS_URL ||
  process.env.VITE_ASSETS_URL ||
  DEFAULT_ASSET_ORIGIN
).replace(/\/$/, '');

function filenameFromUrl(value) {
  try {
    return new URL(value).pathname.split('/').filter(Boolean).pop() || null;
  } catch {
    return null;
  }
}

export function getAssetOrigin() {
  return ASSET_ORIGIN;
}

export function assetUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${ASSET_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

export function resolveItemAssetUrl(rawValue, fallbackItemId = null) {
  if (
    rawValue &&
    /^https?:\/\/raw\.githubusercontent\.com\/.+\/images\/items\//i.test(
      rawValue,
    )
  ) {
    const filename = filenameFromUrl(rawValue);
    return filename ? assetUrl(`/items/${filename}`) : rawValue;
  }

  if (
    rawValue &&
    /^https?:\/\/cdn\.arctracker\.io\/items\/v2\//i.test(rawValue)
  ) {
    const filename = filenameFromUrl(rawValue);
    return filename ? assetUrl(`/items/${filename}`) : rawValue;
  }

  if (rawValue && /^https?:\/\/cdn\.arctracker\.io\/items\//i.test(rawValue)) {
    const filename = filenameFromUrl(rawValue);
    return filename ? assetUrl(`/items/${filename}`) : rawValue;
  }

  if (rawValue && /^https?:\/\/assets\.shiesty\.me\/items\//i.test(rawValue)) {
    const filename = filenameFromUrl(rawValue);
    return filename ? assetUrl(`/items/${filename}`) : rawValue;
  }

  if (rawValue && !/^https?:\/\//i.test(rawValue)) {
    const normalized = String(rawValue).replace(/^\/+/, '');
    if (normalized.startsWith('items/')) return assetUrl(`/${normalized}`);
    return assetUrl(`/items/${normalized.split('/').pop()}`);
  }

  if (fallbackItemId) {
    return assetUrl(`/items/${fallbackItemId}.png`);
  }

  return rawValue;
}
