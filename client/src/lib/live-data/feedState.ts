/**
 * Derives global live-data UI state from poll metadata (no per-map logic).
 * Pair with getActiveConditionsForMap() for zone-level source (api vs rotation-fallback).
 */

import type { LiveDataChipKind } from './messages';
import { LIVE_DATA_BANNER } from './messages';

/** After this age since fetchedAt, label feed as Cached (client has not received a newer payload). */
export const LIVE_DATA_STALE_CLIENT_MS = 120_000;

export type LiveDataFeedBannerKey = keyof typeof LIVE_DATA_BANNER;

export function deriveLiveDataChipKind(input: {
  upstreamOk: boolean | null;
  fetchedAt: string | null;
  now: Date;
  /** Length of events array from last JSON body (0 = empty schedule from API). */
  polledEventCount: number;
  /** True while first request in flight */
  loading: boolean;
}): LiveDataChipKind | null {
  if (
    input.loading &&
    input.polledEventCount === 0 &&
    input.upstreamOk === null
  )
    return null;
  if (input.upstreamOk === false) return 'upstream_error';
  if (input.upstreamOk === true && input.polledEventCount === 0)
    return 'fallback';
  const age =
    input.fetchedAt && input.upstreamOk === true && input.polledEventCount > 0
      ? input.now.getTime() - new Date(input.fetchedAt).getTime()
      : 0;
  if (
    input.fetchedAt &&
    input.upstreamOk === true &&
    input.polledEventCount > 0 &&
    age > LIVE_DATA_STALE_CLIENT_MS
  ) {
    return 'cached';
  }
  if (input.upstreamOk === true && input.polledEventCount > 0) return 'live';
  return 'fallback';
}

export function bannerKeyForChip(
  kind: LiveDataChipKind | null,
): LiveDataFeedBannerKey {
  if (kind === null) return 'live';
  if (kind === 'upstream_error') return 'upstream_error';
  if (kind === 'fallback') return 'empty_schedule';
  if (kind === 'cached') return 'cached';
  return 'live';
}

/**
 * Pipeline: when false, callers should pass `undefined` (not []) into getActiveConditionsForMap
 * so intent matches "no API window" — functionally equivalent today but documented.
 */
/** Use MetaForge rows when we have any and upstream did not report hard failure (`false`). */
export function shouldUseMetaForgeEventList(
  upstreamOk: boolean | null,
  eventCount: number,
): boolean {
  if (eventCount === 0) return false;
  if (upstreamOk === false) return false;
  return true;
}
