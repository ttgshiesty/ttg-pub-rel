/**
 * Browser-local time formatting for live data (MetaForge poll timestamps).
 * All outputs use the runtime's local timezone.
 */

export function formatLocalTimestampFull(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

/**
 * Short relative phrase for UI (updates on caller's interval to limit re-renders).
 */
export function formatRelativeUpdated(iso: string | null, now: Date): string {
  if (!iso) return 'Not yet loaded';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown time';
  const ms = now.getTime() - d.getTime();
  if (ms < 0) return 'Just now';
  const sec = Math.floor(ms / 1000);
  if (sec < 8) return 'Just now';
  if (sec < 60) return `Updated ${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `Updated ${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 36) return `Updated ${h}h ago`;
  return formatLocalTimestampFull(iso);
}
