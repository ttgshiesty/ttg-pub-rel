import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

const LS_KEY = 'shiesty_last_seen_version';
const POLL_MS = 3_600_000; // 1 hour

interface VersionResponse {
  version: { version: string };
  lastUpdated: {
    lastUpdated: number | null;
    inventoryLastUpdated: number | null;
    serverTime: number;
  };
}

export function NewVersionAvailableBanner() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkVersion() {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const data: VersionResponse = await res.json();
        const currentVersion = data.version?.version;

        if (!currentVersion) return;

        const lastSeen = localStorage.getItem(LS_KEY);
        const lastSeenNum = lastSeen ? Number(lastSeen) : null;
        const currentNum = Number(currentVersion);

        if (lastSeenNum === null || isNaN(lastSeenNum)) {
          localStorage.setItem(LS_KEY, String(currentNum));
          return;
        }

        if (currentNum > lastSeenNum && mounted) {
          setShowUpdate(true);
        }
      } catch {
        // silently ignore network hiccups
      }
    }

    checkVersion();
    const interval = window.setInterval(checkVersion, POLL_MS);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const handleRefresh = () => {
    localStorage.setItem(LS_KEY, '');
    window.location.reload();
  };

  const handleDismiss = () => {
    fetch('/api/version', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: VersionResponse) => {
        const v = data.version?.version;
        if (v) localStorage.setItem(LS_KEY, String(Number(v)));
      })
      .catch(() => {});
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div
      className="z-50 border-b"
      style={{
        background: 'rgba(57, 255, 20, 0.08)',
        borderColor: 'rgba(57, 255, 20, 0.25)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="mx-auto px-4 py-2 flex items-center justify-between max-w-7xl">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" style={{ color: '#39FF14' }} />
          <span className="text-sm" style={{ color: '#e0ffe0' }}>
            New data available! Refresh to see your latest raids and stats.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors"
            style={{
              background: '#39FF14',
              color: '#000',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#2de00f';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#39FF14';
            }}
          >
            Refresh
          </button>

          <button
            onClick={handleDismiss}
            className="p-1 rounded transition-colors hover:bg-white/10"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" style={{ color: 'var(--color-arc-muted)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
