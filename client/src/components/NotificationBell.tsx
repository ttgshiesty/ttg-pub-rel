import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { NotificationAPI } from '../lib/api';

interface AppNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string | null;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  wanted_alert: '🔥',
  sale: '✅',
  offer_received: '📩',
  offer_accepted: '🎉',
  offer_declined: '❌',
  raid: '🗺️',
  level_up: '🎯',
  system: '🔔',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const data = await NotificationAPI.list();
      if (data?.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleOpen = () => {
    setOpen((o) => !o);
  };

  const handleReadAll = async () => {
    setLoading(true);
    try {
      await NotificationAPI.readAll();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleReadOne = async (n: AppNotification) => {
    if (!n.read) {
      await NotificationAPI.readOne(n._id).catch(() => {});
      setNotifications((prev) =>
        prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
  };

  const handleDismiss = async (e: React.MouseEvent, n: AppNotification) => {
    e.stopPropagation();
    await NotificationAPI.readOne(n._id).catch(() => {});
    setNotifications((prev) => prev.filter((x) => x._id !== n._id));
    if (!n.read) setUnreadCount((c) => Math.max(0, c - 1));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 text-[var(--color-arc-muted)] hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-arc-yellow text-black text-[9px] font-black rounded-full flex items-center justify-center leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-[#0d0d0d] border border-[var(--color-arc-border)] shadow-2xl z-50 flex flex-col max-h-[420px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-arc-border)]">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleReadAll}
                disabled={loading}
                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[var(--color-arc-muted)] hover:text-arc-yellow transition-colors disabled:opacity-50"
              >
                <CheckCheck className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-[10px] text-[var(--color-arc-muted)] font-black uppercase tracking-wider">
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleReadOne(n)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--color-arc-border)] cursor-pointer transition-colors hover:bg-[#1a1a1a] ${!n.read ? 'bg-[#111]' : ''}`}
                >
                  <span className="text-base mt-0.5 shrink-0">
                    {TYPE_ICON[n.type] ?? '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-[10px] font-black uppercase tracking-wider leading-tight truncate ${!n.read ? 'text-white' : 'text-[var(--color-arc-muted)]'}`}
                      >
                        {n.title}
                      </p>
                      <button
                        onClick={(e) => handleDismiss(e, n)}
                        className="shrink-0 text-[var(--color-arc-muted)] hover:text-white transition-colors mt-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-[9px] text-[var(--color-arc-muted)] mt-0.5 leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[8px] text-[var(--color-arc-muted)] mt-1 opacity-60">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-1.5 h-1.5 rounded-full bg-arc-yellow shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
