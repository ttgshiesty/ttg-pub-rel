/**
 * User-facing copy for live schedule / MetaForge integration.
 * Keep calm and non-alarming; rotation fallback is expected when API is empty or down.
 */

export const LIVE_DATA_CHIP_LABEL = {
  live: 'Live',
  cached: 'Cached',
  fallback: 'Fallback',
  upstream_error: 'Upstream issue',
} as const;

export type LiveDataChipKind = keyof typeof LIVE_DATA_CHIP_LABEL;

export const LIVE_DATA_BANNER = {
  upstream_error:
    'Live event feed unavailable; showing fallback rotation data.',
  empty_schedule: 'No active events returned; using rotation schedule.',
  cached:
    'Showing cached schedule from the last good response; refreshing on the next poll.',
  live: 'Connected to MetaForge events-schedule.',
} as const;

/** Per-map footnote when that zone uses community rotation rows. */
export const LIVE_DATA_MAP_ROTATION_HINT =
  'Modifiers from community rotation table — verify in-raid when MetaForge has no match for this map.';
