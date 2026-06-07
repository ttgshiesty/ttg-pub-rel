import type { LiveDataChipKind } from '../../lib/live-data/messages';
import { LIVE_DATA_CHIP_LABEL } from '../../lib/live-data/messages';

const CHIP_STYLE: Record<LiveDataChipKind, string> = {
  live: 'border-emerald-500/40 bg-emerald-500/[0.12] text-emerald-100/95',
  cached: 'border-amber-500/35 bg-amber-500/[0.12] text-amber-50/90',
  fallback: 'border-sky-500/35 bg-sky-500/[0.1] text-sky-50/88',
  upstream_error: 'border-orange-500/40 bg-orange-500/[0.12] text-orange-50/90',
};

type Props = {
  kind: LiveDataChipKind | null;
  className?: string;
};

/**
 * Compact feed-quality indicator (Live / Cached / Fallback / Upstream issue).
 * Use with deriveLiveDataChipKind; pair with LiveDataFeedBanner for explanation text.
 */
export function LiveDataStatusChip({ kind, className = '' }: Props) {
  if (kind === null) {
    return (
      <span
        className={`inline-flex items-center rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/45 whitespace-nowrap shrink-0 ${className}`}
      >
        …
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap shrink-0 ${CHIP_STYLE[kind]} ${className}`}
    >
      {LIVE_DATA_CHIP_LABEL[kind]}
    </span>
  );
}
