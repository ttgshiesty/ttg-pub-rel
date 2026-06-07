import { useEffect, useState } from 'react';

import {
  formatLocalTimestampFull,
  formatRelativeUpdated,
} from '../../lib/live-data/formatTimestamp';

const TICK_MS = 8_000;

type Props = {
  fetchedAt: string | null;
  className?: string;
  /** Screen-reader prefix; visible line uses relative phrasing from formatRelativeUpdated. */
  prefix?: string;
};

/**
 * Relative "Updated … ago" with full local timestamp in title (browser timezone).
 * Refreshes on an interval to limit layout churn vs a 1s clock.
 */
export function LiveDataUpdatedLine({
  fetchedAt,
  className = '',
  prefix = 'Schedule',
}: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const relative = formatRelativeUpdated(fetchedAt, now);
  const full = fetchedAt ? formatLocalTimestampFull(fetchedAt) : null;

  return (
    <span
      className={`tabular-nums text-[10px] sm:text-[11px] text-white/60 whitespace-nowrap shrink-0 min-w-[10ch] inline-block text-right ${className}`}
      title={full ? `${prefix} — ${full}` : undefined}
    >
      {relative}
    </span>
  );
}

