import { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  Settings,
  Gamepad2,
  Bell,
  LayoutDashboard,
  Save,
  Loader2,
  Check,
  Wifi,
  RefreshCw,
  X,
  Activity,
  Crosshair,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  PlayerAPI,
  DiscordAPI,
  ArcTrackerAPI,
  PublicAPI,
  IntelligenceAPI,
} from '../lib/api';
import DiscordProfileCard from '../components/DiscordProfileCard';
import { assetUrl } from '../lib/assetUrl';
import { SUPPORTED_PLATFORMS } from '../lib/extensionBridge';

const ICONS = {
  settings: assetUrl('/icons/settings.webp'),
  refresh: assetUrl('/icons/refresh.webp'),
  inbox: assetUrl('/icons/inbox.webp'),
  friends: assetUrl('/icons/friends.webp'),
  gear: assetUrl('/icons/gear.webp'),
};

interface UserSettings {
  xboxIp: string;
  autoSyncXbox: boolean;
  discordNotifications: boolean;
  marketplaceAlerts: boolean;
  raidAlerts: boolean;
  levelUpAlerts: boolean;
  dashboardLayout: string;
  theme: string;
}

interface AutoSyncSettings {
  enabled: boolean;
  intervalMinutes: number;
  lastSyncedAt: string | null;
  nextSyncAt: string | null;
  disabledReason: string | null;
  source?: 'extension' | 'arctracker' | 'both';
}

const DEFAULT_SETTINGS: UserSettings = {
  xboxIp: '',
  autoSyncXbox: false,
  discordNotifications: true,
  marketplaceAlerts: true,
  raidAlerts: true,
  levelUpAlerts: true,
  dashboardLayout: 'default',
  theme: 'dark',
};

export default function SettingsPage() {
  const {
    profile,
    raiderHub,
    stats,
    authState,
    extensionInstalled,
    extensionVersion,
    startPlatformAuth,
    linkToken,
    refresh,
    tokenExpiresAt,
    reauthRequired,
  } = usePlayer();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [wantedItems, setWantedItems] = useState<
    Array<{ itemId: string; itemName: string; reason: string }>
  >([]);
  const [wantedInput, setWantedInput] = useState('');
  const [wantedReason, setWantedReason] = useState('');
  const [wantedSaving, setWantedSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookStatus, setWebhookStatus] = useState<boolean | null>(null);
  const [xboxMsg, setXboxMsg] = useState('');
  const [xboxSyncing, setXboxSyncing] = useState(false);

  // States for Embark Sync
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [autoSync, setAutoSync] = useState<AutoSyncSettings | null>(null);
  const [autoSyncBusy, setAutoSyncBusy] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [manualTokenMsg, setManualTokenMsg] = useState('');
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);
  const [embarkLinkBusy, setEmbarkLinkBusy] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(
    null,
  );
  const [embarkLinkMsg, setEmbarkLinkMsg] = useState('');

  // ArcTracker key linking
  const [arcKeyInput, setArcKeyInput] = useState('');
  const [arcLinked, setArcLinked] = useState<boolean | null>(null);
  const [arcLinkedAt, setArcLinkedAt] = useState<Date | null>(null);
  const [arcBusy, setArcBusy] = useState(false);
  const [arcMsg, setArcMsg] = useState('');

  // MetaForge ID
  const [metaforgeIdInput, setMetaforgeIdInput] = useState('');
  const [metaforgeBusy, setMetaforgeBusy] = useState(false);
  const [metaforgeMsg, setMetaforgeMsg] = useState('');
  const [metaforgeSaved, setMetaforgeSaved] = useState<string | null>(null);

  const saveMetaforgeId = async () => {
    const id = metaforgeIdInput.trim();
    if (!id) return;
    setMetaforgeBusy(true);
    setMetaforgeMsg('');
    try {
      await PlayerAPI.updateSettings({ metaforgeId: id });
      setMetaforgeSaved(id);
      setMetaforgeIdInput('');
      setMetaforgeMsg('MetaForge ID saved.');
    } catch (err: any) {
      setMetaforgeMsg(err.message || 'Failed to save MetaForge ID.');
    } finally {
      setMetaforgeBusy(false);
    }
  };

  const clearMetaforgeId = async () => {
    setMetaforgeBusy(true);
    setMetaforgeMsg('');
    try {
      await PlayerAPI.updateSettings({ metaforgeId: '' });
      setMetaforgeSaved(null);
      setMetaforgeMsg('MetaForge ID removed.');
    } catch (err: any) {
      setMetaforgeMsg(err.message || 'Failed to remove MetaForge ID.');
    } finally {
      setMetaforgeBusy(false);
    }
  };

  // ArcTracker TRADE key (secondary account for blueprint trading)
  const [tradeKeyInput, setTradeKeyInput] = useState('');
  const [tradeLinked, setTradeLinked] = useState<boolean | null>(null);
  const [tradeLinkedAt, setTradeLinkedAt] = useState<Date | null>(null);
  const [tradeUsername, setTradeUsername] = useState<string | null>(null);
  const [tradeBusy, setTradeBusy] = useState(false);
  const [tradeMsg, setTradeMsg] = useState('');

  const linkTradeKey = async () => {
    if (!tradeKeyInput.trim()) return;
    setTradeBusy(true);
    setTradeMsg('');
    try {
      const res = await ArcTrackerAPI.linkTrade(tradeKeyInput.trim());
      setTradeLinked(true);
      setTradeLinkedAt(res.linkedAt ? new Date(res.linkedAt) : new Date());
      setTradeUsername(res.profile?.username || null);
      setTradeKeyInput('');
      setTradeMsg(
        res.profile?.username
          ? `Trade account linked: ${res.profile.username}`
          : 'Trade account linked.',
      );
    } catch (err: any) {
      setTradeMsg(err.message || 'Failed to link trade key.');
    } finally {
      setTradeBusy(false);
    }
  };

  const unlinkTradeKey = async () => {
    setTradeBusy(true);
    setTradeMsg('');
    try {
      await ArcTrackerAPI.unlinkTrade();
      setTradeLinked(false);
      setTradeLinkedAt(null);
      setTradeUsername(null);
      setTradeMsg('Trade key removed.');
    } catch (err: any) {
      setTradeMsg(err.message || 'Failed to unlink trade key.');
    } finally {
      setTradeBusy(false);
    }
  };

  // Public profile slug
  const [slugInput, setSlugInput] = useState('');
  const [slugSaved, setSlugSaved] = useState<string | null>(null);
  const [slugBusy, setSlugBusy] = useState(false);
  const [slugMsg, setSlugMsg] = useState('');

  const claimSlug = async () => {
    if (!slugInput.trim()) return;
    setSlugBusy(true);
    setSlugMsg('');
    try {
      const res = await PublicAPI.setSlug(slugInput.trim());
      setSlugSaved(res.slug);
      setSlugInput('');
      setSlugMsg(`Profile URL set: shiesty.me/u/${res.slug}`);
    } catch (err: any) {
      setSlugMsg(err.message || 'Failed to claim slug');
    } finally {
      setSlugBusy(false);
    }
  };

  useEffect(() => {
    loadSettings();
    checkWebhook();
    checkArcTracker();
    loadAutoSyncSettings();
  }, []);

  const loadAutoSyncSettings = async () => {
    try {
      const res = await fetch('/api/embark/auto-sync/settings', {
        credentials: 'include',
      });
      if (res.ok) setAutoSync(await res.json());
    } catch (err) {
      console.error('[Settings] Failed to load auto-sync:', err);
    }
  };

  const checkArcTracker = async () => {
    try {
      const res = await ArcTrackerAPI.status();
      setArcLinked(!!res.linked);
      setArcLinkedAt(res.linkedAt ? new Date(res.linkedAt) : null);
      setTradeLinked(!!res.tradeLinked);
      setTradeLinkedAt(res.tradeLinkedAt ? new Date(res.tradeLinkedAt) : null);
      setTradeUsername(res.tradeUsername || null);
    } catch {
      setArcLinked(false);
    }
  };

  const linkArcTracker = async () => {
    if (!arcKeyInput.trim()) return;
    setArcBusy(true);
    setArcMsg('');
    try {
      const res = await ArcTrackerAPI.link(arcKeyInput.trim());
      setArcLinked(true);
      setArcLinkedAt(res.linkedAt ? new Date(res.linkedAt) : new Date());
      setArcKeyInput('');
      setArcMsg(
        res.profile?.username
          ? `Linked to ArcTracker as ${res.profile.username}.`
          : 'ArcTracker key linked successfully.',
      );
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      setArcMsg(err.message || 'Failed to link key.');
    } finally {
      setArcBusy(false);
    }
  };

  const unlinkArcTracker = async () => {
    setArcBusy(true);
    setArcMsg('');
    try {
      await ArcTrackerAPI.unlink();
      setArcLinked(false);
      setArcLinkedAt(null);
      setArcMsg('ArcTracker key removed.');
    } catch (err: any) {
      setArcMsg(err.message || 'Failed to unlink key.');
    } finally {
      setArcBusy(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await PlayerAPI.settings();
      if (res?.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...res.settings });
        if (res.settings.metaforgeId)
          setMetaforgeSaved(res.settings.metaforgeId);
      }
      if (Array.isArray(res?.mostWanted)) {
        setWantedItems(res.mostWanted);
      }
    } catch (err) {
      console.error('[Settings] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage('');
    try {
      await PlayerAPI.updateSettings(settings);
      setMessage('Settings saved successfully.');
    } catch (err: any) {
      setMessage(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (raiderHub?.profile?.mostWanted) {
      setWantedItems(raiderHub.profile.mostWanted);
    }
  }, [raiderHub]);

  const handleAddWanted = async () => {
    const name = wantedInput.trim();
    if (!name) return;
    setWantedSaving(true);
    try {
      const itemId = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
      await IntelligenceAPI.addWanted(itemId, name, wantedReason.trim());
      setWantedItems((prev) => [
        ...prev,
        { itemId, itemName: name, reason: wantedReason.trim() },
      ]);
      setWantedInput('');
      setWantedReason('');
    } catch (err: any) {
      setMessage(err.message || 'Failed to add item.');
    } finally {
      setWantedSaving(false);
    }
  };

  const handleRemoveWanted = async (itemId: string) => {
    try {
      await IntelligenceAPI.removeWanted(itemId);
      setWantedItems((prev) => prev.filter((w) => w.itemId !== itemId));
    } catch (err: any) {
      setMessage(err.message || 'Failed to remove item.');
    }
  };

  const checkWebhook = async () => {
    try {
      const res = await DiscordAPI.webhookStatus();
      setWebhookStatus(res.connected);
    } catch {
      setWebhookStatus(false);
    }
  };

  const saveWebhook = async () => {
    if (!webhookUrl) return;
    try {
      await DiscordAPI.webhook(webhookUrl);
      setWebhookStatus(true);
      setWebhookUrl('');
      setMessage('Discord webhook connected!');
    } catch (err: any) {
      setMessage(err.message || 'Failed to connect webhook.');
    }
  };

  const removeWebhook = async () => {
    try {
      await DiscordAPI.deleteWebhook();
      setWebhookStatus(false);
      setMessage('Webhook disconnected.');
    } catch {
      setMessage('Failed to disconnect webhook.');
    }
  };

  // --- EMBARK SYNC LOGIC ---
  const waitForExtensionSync = () =>
    new Promise<{ success: boolean; error?: string }>((resolve) => {
      let done = false;
      const handler = (event: MessageEvent) => {
        if (
          event.data?.source === 'shiestyraider-extension' &&
          event.data?.type === 'SYNC_NOW_RESULT'
        ) {
          done = true;
          window.removeEventListener('message', handler);
          resolve(event.data.data || { success: false });
        }
      };
      window.addEventListener('message', handler);
      setTimeout(() => {
        if (!done) {
          window.removeEventListener('message', handler);
          resolve({ success: false, error: 'Extension timed out' });
        }
      }, 8000);
    });

  const handleEmbarkSync = async () => {
    setIsAutoSyncing(true);
    setMessage('Initializing Uplink...');
    try {
      window.postMessage(
        { source: 'shiestyraider-web', type: 'TRIGGER_SYNC_NOW' },
        '*',
      );
      const result = await waitForExtensionSync();
      if (!result.success) {
        const res = await fetch('/api/embark/sync/inventory', {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || result.error || 'Sync failed');
        }
      }
      setLastSyncTime(new Date());
      setMessage('Sync successful.');
      await loadAutoSyncSettings();
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      setMessage(err.message || 'Sync failed. Check API connection.');
    } finally {
      setIsAutoSyncing(false);
    }
  };

  const toggleAutoSync = async () => {
    const enabled = !autoSync?.enabled;
    setAutoSyncBusy(true);
    setMessage('');
    try {
      window.postMessage(
        { source: 'shiestyraider-web', type: 'SET_AUTO_SYNC', enabled },
        '*',
      );
      const res = await fetch('/api/embark/auto-sync/settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update auto-sync.');
      setAutoSync(data);
      setMessage(enabled ? 'Auto-sync enabled.' : 'Auto-sync disabled.');
    } catch (err: any) {
      setMessage(err.message || 'Failed to update auto-sync.');
    } finally {
      setAutoSyncBusy(false);
    }
  };

  const updateAutoSyncSettings = async (
    patch: Partial<Pick<AutoSyncSettings, 'intervalMinutes' | 'source'>>,
  ) => {
    setAutoSyncBusy(true);
    setMessage('');
    try {
      const res = await fetch('/api/embark/auto-sync/settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update auto-sync.');
      setAutoSync(data);
      setMessage('Auto-sync settings updated.');
    } catch (err: any) {
      setMessage(err.message || 'Failed to update auto-sync.');
    } finally {
      setAutoSyncBusy(false);
    }
  };

  const handleManualTokenSubmit = async () => {
    const token = manualToken.trim();
    if (!token) {
      setManualTokenMsg('Paste your Embark token first.');
      return;
    }
    setIsSubmittingToken(true);
    setManualTokenMsg('Registering token...');
    try {
      const res = await fetch('/api/extension/token', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, source: 'manual' }),
      });
      const data = await res.json();
      if (res.ok) {
        // Also trigger the link step so it binds to your Discord account
        await fetch('/api/extension/link', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        setManualTokenMsg('Token registered! Reload the dashboard.');
        setManualToken('');
      } else {
        setManualTokenMsg(data.error || 'Failed to register token.');
      }
    } catch {
      setManualTokenMsg('Network error — check server connection.');
    } finally {
      setIsSubmittingToken(false);
    }
  };

  const handlePlatformLink = async (platform: string) => {
    setConnectingPlatform(platform);
    setEmbarkLinkMsg('');
    try {
      const result = await startPlatformAuth(platform);
      if (result.success) {
        setEmbarkLinkMsg('Embark login started. Complete the provider login in this tab.');
      } else {
        setEmbarkLinkMsg(result.error || 'Failed to start Embark login.');
      }
    } catch (err: any) {
      setEmbarkLinkMsg(err.message || 'Failed to start Embark login.');
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleLinkDetectedToken = async () => {
    setEmbarkLinkBusy(true);
    setEmbarkLinkMsg('');
    try {
      const result = await linkToken();
      if (result?.status === 'linked' || result?.status === 'already_linked') {
        setEmbarkLinkMsg('Embark ID linked to your SHiESTY profile.');
        await refresh();
      } else {
        setEmbarkLinkMsg('No pending Embark token found. Use your platform login first.');
      }
    } catch (err: any) {
      setEmbarkLinkMsg(err.message || 'Failed to link Embark ID.');
    } finally {
      setEmbarkLinkBusy(false);
    }
  };

  const autoDetectXbox = () => {
    setXboxMsg('Scanning local network...');
    window.postMessage({ type: 'FIND_XBOX' }, '*');
  };

  const startXboxSync = () => {
    if (!settings.xboxIp.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) {
      setXboxMsg('Invalid IP address');
      return;
    }
    setXboxMsg('Starting sync...');
    window.postMessage({ type: 'START_SYNC', ip: settings.xboxIp }, '*');
    setXboxSyncing(true);
    setSettings((s) => ({ ...s, autoSyncXbox: true }));
  };

  const stopXboxSync = () => {
    window.postMessage({ type: 'STOP_XBOX_SYNC' }, '*');
    setXboxSyncing(false);
    setSettings((s) => ({ ...s, autoSyncXbox: false }));
    setXboxMsg('Sync stopped');
  };

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'XBOX_IP_FOUND' && event.data.ip) {
        setSettings((s) => ({ ...s, xboxIp: event.data.ip }));
        setXboxMsg(`Auto-detected: ${event.data.ip}`);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-arc-yellow animate-spin mb-4" />
        <p className="text-arc-yellow text-[10px] font-black uppercase tracking-[0.4em]">
          Loading Settings...
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 mt-20 text-center">
        <div className="raider-box p-12 bg-arc-light-bg border border-arc-border">
          <Settings className="w-12 h-12 text-[var(--color-arc-muted)] mx-auto mb-6" />
          <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">
            LOGIN REQUIRED
          </h2>
          <p className="text-[10px] text-[var(--color-arc-muted)] uppercase tracking-[0.3em]">
            Link your Discord account to access settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 mt-8 pb-20">
      <div className="border-b border-arc-border pb-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-6 h-6 text-[var(--color-arc-muted)]" />
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">
            OPERATIVE SETTINGS
          </h1>
        </div>
        <p className="text-[10px] text-[var(--color-arc-muted)] uppercase tracking-[0.4em]">
          Personal preferences, Xbox bridge, and notification controls
        </p>
      </div>

      {message && (
        <div
          className={`raider-box p-4 mb-6 border-l-4 ${message.includes('successfully') || message.includes('Successful') ? 'border-[var(--color-arc-yellow)] bg-arc-yellow/5' : 'border-[var(--color-arc-danger)] bg-[var(--color-arc-danger)]/5'}`}
        >
          <p
            className={`text-[10px] font-black uppercase tracking-wider ${message.includes('successfully') || message.includes('Successful') ? 'text-arc-yellow' : 'text-[var(--color-arc-danger)]'}`}
          >
            {message}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PUBLIC PROFILE — Shareable URL */}
        <div className="raider-box bg-arc-light-bg border border-arc-border p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <Wifi className="w-5 h-5 text-arc-yellow" />
            <h2 className="text-xs font-black text-white uppercase tracking-[0.3em]">
              Public Profile URL
            </h2>
          </div>
          <p className="text-[9px] text-[var(--color-arc-muted)] uppercase tracking-[0.2em] mb-4">
            Claim a custom URL to share your stats, listings, and badges:
            <span className="font-mono text-arc-yellow">
              {' '}
              shiesty.me/u/your-name
            </span>
          </p>

          <div className="flex gap-2">
            <div className="flex-1 flex items-stretch border border-arc-border bg-[#050505]">
              <span className="px-3 flex items-center text-[9px] font-mono text-[var(--color-arc-muted)] border-r border-arc-border">
                shiesty.me/u/
              </span>
              <input
                type="text"
                value={slugInput}
                onChange={(e) =>
                  setSlugInput(
                    e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
                  )
                }
                placeholder={slugSaved || 'your-name'}
                maxLength={32}
                className="flex-1 bg-transparent text-white text-[10px] font-mono px-3 py-2 focus:outline-none"
              />
            </div>
            <button
              onClick={claimSlug}
              disabled={slugBusy || !slugInput.trim()}
              className="px-4 py-2 bg-arc-yellow/10 border border-[var(--color-arc-yellow)]/30 text-arc-yellow text-[9px] font-black uppercase hover:bg-arc-yellow/20 disabled:opacity-50 flex items-center gap-2"
            >
              {slugBusy ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              Claim
            </button>
          </div>

          {slugSaved && (
            <a
              href={`/u/${slugSaved}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-[9px] text-arc-yellow font-black uppercase tracking-[0.2em] hover:underline"
            >
              View → shiesty.me/u/{slugSaved}
            </a>
          )}

          {slugMsg && (
            <p className="mt-2 text-[9px] font-black uppercase tracking-wider text-[var(--color-arc-muted)]">
              {slugMsg}
            </p>
          )}
        </div>

        {/* ARCTRACKER LINK — Real stats source */}
        <div className="raider-box bg-arc-light-bg border border-arc-border p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-5 h-5 text-arc-yellow" />
            <h2 className="text-xs font-black text-white uppercase tracking-[0.3em]">
              ArcTracker Data Link
            </h2>
            {arcLinked && (
              <span className="ml-2 inline-flex items-center gap-1 text-[8px] text-arc-yellow font-black uppercase">
                <Check className="w-3 h-3" /> Linked
              </span>
            )}
          </div>
          <p className="text-[9px] text-[var(--color-arc-muted)] uppercase tracking-[0.2em] mb-4">
            Paste your personal API key from{' '}
            <a
              href="https://arctracker.io/settings/developer"
              target="_blank"
              rel="noreferrer"
              className="text-arc-yellow hover:underline"
            >
              arctracker.io / Developer Access
            </a>{' '}
            (starts with <span className="font-mono">arc_u1_</span>)
          </p>

          {arcLinked ? (
            <div className="flex items-center justify-between bg-[#0c0c0e] border border-arc-border px-4 py-3">
              <div>
                <div className="text-[10px] text-arc-yellow font-black uppercase tracking-[0.2em]">
                  Key on file
                </div>
                {arcLinkedAt && (
                  <div className="text-[9px] text-[var(--color-arc-muted)] mt-1">
                    Linked {arcLinkedAt.toLocaleString()}
                  </div>
                )}
              </div>
              <button
                onClick={unlinkArcTracker}
                disabled={arcBusy}
                className="px-3 py-2 border border-[var(--color-arc-danger)]/30 text-[var(--color-arc-danger)] text-[9px] font-black uppercase hover:bg-[var(--color-arc-danger)]/10 disabled:opacity-50"
              >
                {arcBusy ? '...' : 'Remove'}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="password"
                value={arcKeyInput}
                onChange={(e) => setArcKeyInput(e.target.value)}
                placeholder="arc_u1_xxxxxxxxxxxxxxxxxxxx"
                autoComplete="off"
                spellCheck={false}
                className="flex-1 bg-[#050505] border border-arc-border text-white text-[10px] font-mono px-3 py-2 focus:border-[var(--color-arc-yellow)] outline-none"
              />
              <button
                onClick={linkArcTracker}
                disabled={arcBusy || !arcKeyInput.trim()}
                className="px-4 py-2 bg-arc-yellow/10 border border-[var(--color-arc-yellow)]/30 text-arc-yellow text-[9px] font-black uppercase hover:bg-arc-yellow/20 disabled:opacity-50 flex items-center gap-2"
              >
                {arcBusy ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Link
              </button>
            </div>
          )}

          {arcMsg && (
            <p className="mt-3 text-[9px] font-black uppercase tracking-wider text-[var(--color-arc-muted)]">
              {arcMsg}
            </p>
          )}
        </div>

        {/* TRADE ACCOUNT — Secondary ArcTracker key for blueprints/stash */}
        <div className="raider-box bg-arc-light-bg border border-[var(--color-arc-yellow)]/20 p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-5 h-5 text-arc-yellow" />
            <h2 className="text-xs font-black text-white uppercase tracking-[0.3em]">
              Trade Account ArcTracker Key
            </h2>
            {tradeLinked && (
              <span className="ml-2 inline-flex items-center gap-1 text-[8px] text-arc-yellow font-black uppercase">
                <Check className="w-3 h-3" />{' '}
                {tradeUsername ? `${tradeUsername}` : 'Linked'}
              </span>
            )}
          </div>
          <p className="text-[9px] text-[var(--color-arc-muted)] uppercase tracking-[0.2em] mb-4">
            Optional second key for a different in-game profile (e.g.
            blueprint-trading account). View its blueprints/stash without
            unlinking your main account.
          </p>

          {tradeLinked ? (
            <div className="flex items-center justify-between gap-3 px-3 py-2 border border-[var(--color-arc-yellow)]/20 bg-[#0c0c0c]">
              <div>
                <div className="text-[10px] text-arc-yellow font-black uppercase tracking-[0.2em]">
                  {tradeUsername || 'Trade key on file'}
                </div>
                {tradeLinkedAt && (
                  <div className="text-[9px] text-[var(--color-arc-muted)] mt-1">
                    Linked {tradeLinkedAt.toLocaleString()}
                  </div>
                )}
              </div>
              <button
                onClick={unlinkTradeKey}
                disabled={tradeBusy}
                className="px-3 py-2 border border-[var(--color-arc-danger)]/30 text-[var(--color-arc-danger)] text-[9px] font-black uppercase hover:bg-[var(--color-arc-danger)]/10 disabled:opacity-50"
              >
                {tradeBusy ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <X className="w-3 h-3" />
                )}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="password"
                value={tradeKeyInput}
                onChange={(e) => setTradeKeyInput(e.target.value)}
                placeholder="arc_u1_xxxxxxxxxxxxxxxxxxxx"
                autoComplete="off"
                spellCheck={false}
                className="flex-1 bg-[#050505] border border-arc-border text-white text-[10px] font-mono px-3 py-2 focus:border-[var(--color-arc-yellow)] outline-none"
              />
              <button
                onClick={linkTradeKey}
                disabled={tradeBusy || !tradeKeyInput.trim()}
                className="px-4 py-2 bg-arc-yellow/10 border border-[var(--color-arc-yellow)]/30 text-arc-yellow text-[9px] font-black uppercase hover:bg-arc-yellow/20 disabled:opacity-50 flex items-center gap-2"
              >
                {tradeBusy ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Link Trade
              </button>
            </div>
          )}

          {tradeMsg && (
            <p className="mt-3 text-[9px] font-black uppercase tracking-wider text-[var(--color-arc-muted)]">
              {tradeMsg}
            </p>
          )}
        </div>

        {/* METAFORGE ID — Raider stats & trials lookup */}
        <div className="raider-box bg-arc-light-bg border border-arc-border p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-arc-yellow" />
            <h2 className="text-xs font-black text-white uppercase tracking-[0.3em]">
              MetaForge Player ID
            </h2>
            {metaforgeSaved && (
              <span className="ml-2 inline-flex items-center gap-1 text-[8px] text-arc-yellow font-black uppercase">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>
          <p className="text-[9px] text-[var(--color-arc-muted)] uppercase tracking-[0.2em] mb-4">
            Your{' '}
            <a
              href="https://metaforge.app"
              target="_blank"
              rel="noreferrer"
              className="text-arc-yellow hover:underline"
            >
              metaforge.app
            </a>{' '}
            player ID — used to fetch your raider stats and weekly trials
            ranking.
          </p>

          {metaforgeSaved ? (
            <div className="flex items-center justify-between bg-[#0c0c0e] border border-arc-border px-4 py-3">
              <div>
                <div className="text-[10px] text-arc-yellow font-black uppercase tracking-[0.2em]">
                  ID on file
                </div>
                <div className="text-[9px] text-[var(--color-arc-muted)] mt-1 font-mono">
                  {metaforgeSaved}
                </div>
              </div>
              <button
                onClick={clearMetaforgeId}
                disabled={metaforgeBusy}
                className="px-3 py-2 border border-[var(--color-arc-danger)]/30 text-[var(--color-arc-danger)] text-[9px] font-black uppercase hover:bg-[var(--color-arc-danger)]/10 disabled:opacity-50"
              >
                {metaforgeBusy ? '...' : 'Remove'}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={metaforgeIdInput}
                onChange={(e) => setMetaforgeIdInput(e.target.value)}
                placeholder="your-metaforge-id"
                autoComplete="off"
                spellCheck={false}
                className="flex-1 bg-[#050505] border border-arc-border text-white text-[10px] font-mono px-3 py-2 focus:border-[var(--color-arc-yellow)] outline-none"
              />
              <button
                onClick={saveMetaforgeId}
                disabled={metaforgeBusy || !metaforgeIdInput.trim()}
                className="px-4 py-2 bg-arc-yellow/10 border border-[var(--color-arc-yellow)]/30 text-arc-yellow text-[9px] font-black uppercase hover:bg-arc-yellow/20 disabled:opacity-50 flex items-center gap-2"
              >
                {metaforgeBusy ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Save
              </button>
            </div>
          )}

          {metaforgeMsg && (
            <p className="mt-3 text-[9px] font-black uppercase tracking-wider text-[var(--color-arc-muted)]">
              {metaforgeMsg}
            </p>
          )}
        </div>

        {/* XBOX BRIDGE & EMBARK UPLINK */}
        <div className="raider-box bg-arc-light-bg border border-arc-border p-6">
          <div className="flex items-center gap-2 mb-5">
            <Gamepad2 className="w-5 h-5 text-arc-yellow" />
            <h2 className="text-xs font-black text-white uppercase tracking-[0.3em]">
              System Bridge
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[9px] text-[var(--color-arc-muted)] mb-1.5 font-black uppercase tracking-[0.2em]">
                Xbox Local IP
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.xboxIp}
                  onChange={(e) =>
                    setSettings({ ...settings, xboxIp: e.target.value })
                  }
                  placeholder="192.168.1.XX"
                  className="flex-1 bg-[#050505] border border-arc-border text-white text-[10px] font-black px-3 py-2 focus:border-[var(--color-arc-yellow)] outline-none"
                />
                <button
                  onClick={autoDetectXbox}
                  className="px-3 py-2 bg-arc-yellow/10 border border-[var(--color-arc-yellow)]/30 text-arc-yellow text-[9px] font-black uppercase hover:bg-arc-yellow/20"
                >
                  <Wifi className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* EMBARK ID LINKING */}
            <div className="raider-box bg-[#0c0c0e] border border-arc-border p-4 my-2">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <img
                    src={assetUrl('/main/embark.webp')}
                    alt=""
                    className="w-4 h-4 object-contain opacity-80"
                  />
                  <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                    Link Embark ID
                  </h3>
                </div>
                <span
                  className={`text-[8px] font-black uppercase tracking-[0.2em] ${stats?.embarkLinked ? 'text-arc-yellow' : 'text-[var(--color-arc-muted)]'}`}
                >
                  {stats?.embarkLinked ? 'Linked' : 'Required'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                <div className="border border-[var(--color-arc-light-background)] bg-black/30 p-3">
                  <p className="text-[8px] text-[var(--color-arc-muted)] font-black uppercase tracking-[0.2em]">
                    Embark ID
                  </p>
                  <p className="text-[10px] text-white font-black truncate mt-1">
                    {stats?.embarkId || 'Not linked'}
                  </p>
                </div>
                <div className="border border-[var(--color-arc-light-background)] bg-black/30 p-3">
                  <p className="text-[8px] text-[var(--color-arc-muted)] font-black uppercase tracking-[0.2em]">
                    Embark Name
                  </p>
                  <p className="text-[10px] text-white font-black truncate mt-1">
                    {stats?.embarkUsername || stats?.displayName || '-'}
                  </p>
                </div>
                <div className="border border-[var(--color-arc-light-background)] bg-black/30 p-3">
                  <p className="text-[8px] text-[var(--color-arc-muted)] font-black uppercase tracking-[0.2em]">
                    Extension
                  </p>
                  <p className="text-[10px] text-white font-black truncate mt-1">
                    {extensionInstalled
                      ? `Ready${extensionVersion ? ` v${extensionVersion}` : ''}`
                      : 'Not detected'}
                  </p>
                </div>
              </div>

              {tokenExpiresAt && (
                <p
                  className={`mb-3 text-[8px] font-black uppercase tracking-[0.2em] ${reauthRequired ? 'text-[var(--color-arc-danger)]' : 'text-[var(--color-arc-muted)]'}`}
                >
                  {reauthRequired
                    ? 'Re-auth required now.'
                    : `Token expires: ${new Date(tokenExpiresAt).toLocaleString()}`}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 mb-3">
                {SUPPORTED_PLATFORMS.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformLink(platform.id)}
                    disabled={connectingPlatform !== null || !extensionInstalled}
                    className="px-3 py-2 bg-arc-yellow/10 border border-[var(--color-arc-yellow)]/30 text-arc-yellow text-[9px] font-black uppercase tracking-wider hover:bg-arc-yellow/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Gamepad2 className="w-3 h-3" style={{ color: platform.color }} />
                    {connectingPlatform === platform.id
                      ? 'Connecting...'
                      : platform.name}
                  </button>
                ))}
              </div>

              {authState === 'token_pending' && (
                <button
                  onClick={handleLinkDetectedToken}
                  disabled={embarkLinkBusy}
                  className="w-full px-4 py-2 bg-arc-yellow text-black text-[9px] font-black uppercase tracking-widest hover:bg-arc-yellow/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {embarkLinkBusy ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" /> LINKING...
                    </>
                  ) : (
                    'LINK DETECTED EMBARK TOKEN'
                  )}
                </button>
              )}

              {!extensionInstalled && (
                <p className="text-[8px] text-[var(--color-arc-danger)] font-black uppercase tracking-widest">
                  SHiESTYBUDDY extension is required for Embark linking.
                </p>
              )}

              {embarkLinkMsg && (
                <p className="mt-3 text-[8px] text-arc-yellow font-black uppercase tracking-widest">
                  {embarkLinkMsg}
                </p>
              )}
            </div>

            {/* EMBARK ACCOUNT SYNC */}
            <div className="raider-box bg-[#0c0c0e] border border-arc-border p-4 my-2">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw
                  className={`w-4 h-4 text-arc-yellow ${isAutoSyncing ? 'animate-spin' : ''}`}
                />
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                  Embark Account Sync
                </h3>
              </div>

              <button
                onClick={handleEmbarkSync}
                disabled={isAutoSyncing}
                className="w-full px-4 py-2 bg-arc-yellow/10 border border-[var(--color-arc-yellow)]/30 text-arc-yellow text-[9px] font-black uppercase tracking-widest hover:bg-arc-yellow/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAutoSyncing ? (
                  <>
                    {' '}
                    <Loader2 className="w-3 h-3 animate-spin" />{' '}
                    SYNCHRONIZING...{' '}
                  </>
                ) : (
                  <>
                    {' '}
                    <RefreshCw className="w-3 h-3" /> INITIALIZE UPLINK{' '}
                  </>
                )}
              </button>

              {lastSyncTime && (
                <p className="mt-2 text-[8px] text-[var(--color-arc-muted)] font-black uppercase text-center tracking-widest">
                  Last Uplink: {lastSyncTime.toLocaleTimeString()}
                </p>
              )}

              <div className="flex items-center justify-between border-t border-[var(--color-arc-light-background)] mt-4 pt-4">
                <div>
                  <span className="text-[10px] text-[var(--color-arc-muted)] font-black uppercase tracking-wider">
                    Embark Auto-Sync
                  </span>
                  {autoSync?.nextSyncAt && (
                    <p className="text-[8px] text-[var(--color-arc-muted)] font-black uppercase tracking-widest mt-1">
                      Next: {new Date(autoSync.nextSyncAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={toggleAutoSync}
                  disabled={autoSyncBusy}
                  className={`w-10 h-5 rounded-full transition-colors relative disabled:opacity-50 ${autoSync?.enabled ? 'bg-arc-yellow' : 'bg-[var(--color-arc-border)]'}`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white absolute top-1 transition-all ${autoSync?.enabled ? 'left-6' : 'left-1'}`}
                  />
                </button>
              </div>

              {autoSync?.enabled && (
                <div className="grid grid-cols-1 gap-3 border-t border-[var(--color-arc-light-background)] mt-4 pt-4">
                  <div>
                    <label className="block text-[9px] text-[var(--color-arc-muted)] mb-1.5 font-black uppercase tracking-[0.2em]">
                      Sync Source
                    </label>
                    <select
                      value={autoSync.source || 'both'}
                      onChange={(e) =>
                        updateAutoSyncSettings({
                          source: e.target.value as AutoSyncSettings['source'],
                        })
                      }
                      disabled={autoSyncBusy}
                      className="w-full bg-[#050505] border border-arc-border text-white text-[10px] font-black px-3 py-2 focus:border-[var(--color-arc-yellow)] outline-none uppercase"
                    >
                      <option value="both">Extension + ArcTracker</option>
                      <option value="extension">Extension Only</option>
                      <option value="arctracker">ArcTracker Users Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] text-[var(--color-arc-muted)] mb-1.5 font-black uppercase tracking-[0.2em]">
                      Server Interval
                    </label>
                    <select
                      value={autoSync.intervalMinutes || 15}
                      onChange={(e) =>
                        updateAutoSyncSettings({
                          intervalMinutes: Number(e.target.value),
                        })
                      }
                      disabled={autoSyncBusy}
                      className="w-full bg-[#050505] border border-arc-border text-white text-[10px] font-black px-3 py-2 focus:border-[var(--color-arc-yellow)] outline-none uppercase"
                    >
                      <option value={5}>5 min</option>
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={60}>60 min</option>
                      <option value={120}>120 min</option>
                      <option value={240}>240 min</option>
                    </select>
                  </div>
                  {autoSync.source === 'arctracker' && !arcLinked && (
                    <p className="text-[8px] text-[var(--color-arc-danger)] font-black uppercase tracking-widest">
                      Link an ArcTracker key above before using ArcTracker-only
                      sync.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* MANUAL TOKEN PASTE */}
            <div className="raider-box bg-[#0c0c0e] border border-arc-border p-4 mt-2">
              <p className="text-[9px] font-black text-[var(--color-arc-muted)] uppercase tracking-[0.2em] mb-2">
                Manual Token Entry
              </p>
              <textarea
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste your Embark access token here..."
                rows={3}
                className="w-full bg-[#050505] border border-arc-border text-white text-[9px] font-mono px-3 py-2 focus:border-[var(--color-arc-yellow)] outline-none resize-none mb-2"
              />
              <button
                onClick={handleManualTokenSubmit}
                disabled={isSubmittingToken || !manualToken.trim()}
                className="w-full px-4 py-2 bg-arc-yellow/10 border border-[var(--color-arc-yellow)]/30 text-arc-yellow text-[9px] font-black uppercase tracking-widest hover:bg-arc-yellow/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmittingToken ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> REGISTERING...
                  </>
                ) : (
                  'SUBMIT TOKEN'
                )}
              </button>
              {manualTokenMsg && (
                <p
                  className="mt-2 text-[8px] font-black uppercase tracking-widest text-center"
                  style={{
                    color: manualTokenMsg.includes('registered')
                      ? 'var(--color-arc-yellow)'
                      : 'var(--color-arc-danger)',
                  }}
                >
                  {manualTokenMsg}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[var(--color-arc-light-background)] pt-4">
              <span className="text-[10px] text-[var(--color-arc-muted)] font-black uppercase tracking-wider">
                Xbox Auto-Sync
              </span>
              <button
                onClick={() =>
                  setSettings((s) => ({ ...s, autoSyncXbox: !s.autoSyncXbox }))
                }
                className={`w-10 h-5 rounded-full transition-colors relative ${settings.autoSyncXbox ? 'bg-arc-yellow' : 'bg-[var(--color-arc-border)]'}`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white absolute top-1 transition-all ${settings.autoSyncXbox ? 'left-6' : 'left-1'}`}
                />
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              {!xboxSyncing ? (
                <button
                  onClick={startXboxSync}
                  disabled={!settings.xboxIp}
                  className="flex-1 px-4 py-2 bg-[var(--color-arc-rare)]/10 border border-[var(--color-arc-rare)]/30 text-[var(--color-arc-rare)] text-[9px] font-black uppercase tracking-wider hover:bg-[var(--color-arc-rare)]/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" /> Start Xbox Bridge
                </button>
              ) : (
                <button
                  onClick={stopXboxSync}
                  className="flex-1 px-4 py-2 border border-[var(--color-arc-danger)]/30 text-[var(--color-arc-danger)] text-[9px] font-black uppercase tracking-wider hover:bg-[var(--color-arc-danger)]/10 flex items-center justify-center gap-2"
                >
                  <X className="w-3 h-3" /> Stop Xbox Bridge
                </button>
              )}
            </div>

            {xboxMsg && (
              <p className="text-[9px] font-black uppercase text-arc-yellow">
                {xboxMsg}
              </p>
            )}
          </div>
        </div>

        {/* DISCORD NOTIFICATIONS */}
        <div className="raider-box bg-arc-light-bg border border-arc-border p-6">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-5 h-5 text-[#5865F2]" />
            <h2 className="text-xs font-black text-white uppercase tracking-[0.3em]">
              Discord Notifications
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[9px] text-[var(--color-arc-muted)] mb-1.5 font-black uppercase tracking-[0.2em]">
                Webhook URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="flex-1 bg-[#050505] border border-arc-border text-white text-[10px] font-black px-3 py-2 focus:border-[#5865F2] outline-none"
                />
                <button
                  onClick={saveWebhook}
                  disabled={!webhookUrl}
                  className="px-3 py-2 bg-[#5865F2]/10 border border-[#5865F2]/30 text-[#5865F2] text-[9px] font-black uppercase hover:bg-[#5865F2]/20 disabled:opacity-50"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            </div>

            {webhookStatus !== null && (
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${webhookStatus ? 'bg-arc-yellow' : 'bg-[var(--color-arc-danger)]'}`}
                />
                <span className="text-[9px] font-black uppercase text-[var(--color-arc-muted)]">
                  {webhookStatus ? 'Connected' : 'Disconnected'}
                </span>
                {webhookStatus && (
                  <button
                    onClick={removeWebhook}
                    className="ml-auto text-[8px] text-[var(--color-arc-danger)] hover:underline uppercase font-black"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}

            <div className="space-y-3 pt-2 border-t border-[var(--color-arc-light-background)]">
              {[
                { key: 'discordNotifications', label: 'Enable Notifications' },
                { key: 'marketplaceAlerts', label: 'Marketplace Alerts' },
                { key: 'raidAlerts', label: 'Raid Completion Alerts' },
                { key: 'levelUpAlerts', label: 'Level Up Alerts' },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between"
                >
                  <span className="text-[10px] text-[var(--color-arc-muted)] font-black uppercase tracking-wider">
                    {item.label}
                  </span>
                  <button
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        [item.key]: !s[item.key as keyof UserSettings],
                      }))
                    }
                    className={`w-10 h-5 rounded-full transition-colors relative ${settings[item.key as keyof UserSettings] ? 'bg-arc-yellow' : 'bg-[var(--color-arc-border)]'}`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full bg-white absolute top-1 transition-all ${settings[item.key as keyof UserSettings] ? 'left-6' : 'left-1'}`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MOST WANTED WATCHLIST */}
        <div className="raider-box bg-arc-light-bg border border-arc-border p-6">
          <div className="flex items-center gap-2 mb-5">
            <Crosshair className="w-5 h-5 text-[#ff073a]" />
            <h2 className="text-xs font-black text-white uppercase tracking-[0.3em]">
              Most Wanted Watchlist
            </h2>
          </div>
          <p className="text-[9px] text-[var(--color-arc-muted)] mb-4 leading-relaxed">
            Add items you're hunting — you'll get a Discord ping and in-site
            alert the moment one is listed on the marketplace.
          </p>

          {/* Add item */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={wantedInput}
              onChange={(e) => setWantedInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddWanted();
              }}
              placeholder="Item name (e.g. Aphelion Blueprint)"
              className="flex-1 bg-[#050505] border border-arc-border text-white text-[10px] font-black px-3 py-2 focus:border-[#ff073a] outline-none"
            />
            <input
              type="text"
              value={wantedReason}
              onChange={(e) => setWantedReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-32 bg-[#050505] border border-arc-border text-white text-[10px] font-black px-3 py-2 focus:border-[#ff073a] outline-none"
            />
            <button
              onClick={handleAddWanted}
              disabled={!wantedInput.trim() || wantedSaving}
              className="px-3 py-2 bg-[#ff073a]/10 border border-[#ff073a]/30 text-[#ff073a] text-[9px] font-black uppercase hover:bg-[#ff073a]/20 disabled:opacity-50 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>

          {/* Current list */}
          <div className="space-y-2">
            {wantedItems.length === 0 ? (
              <p className="text-[9px] text-[var(--color-arc-muted)] text-center py-4 border border-dashed border-arc-border">
                No items on your watchlist
              </p>
            ) : (
              wantedItems.map((item) => (
                <div
                  key={item.itemId}
                  className="flex items-center justify-between gap-3 px-3 py-2 bg-[#0a0a0a] border border-arc-border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-white uppercase tracking-wider truncate">
                      {item.itemName}
                    </p>
                    {item.reason && (
                      <p className="text-[8px] text-[var(--color-arc-muted)] mt-0.5 truncate">
                        {item.reason}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveWanted(item.itemId)}
                    className="shrink-0 text-[var(--color-arc-muted)] hover:text-[#ff073a] transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* DASHBOARD PREFERENCES */}
        <div className="raider-box bg-arc-light-bg border border-arc-border p-6">
          <div className="flex items-center gap-2 mb-5">
            <LayoutDashboard className="w-5 h-5 text-arc-yellow" />
            <h2 className="text-xs font-black text-white uppercase tracking-[0.3em]">
              Dashboard
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] text-[var(--color-arc-muted)] mb-1.5 font-black uppercase tracking-[0.2em]">
                Layout
              </label>
              <select
                value={settings.dashboardLayout}
                onChange={(e) =>
                  setSettings({ ...settings, dashboardLayout: e.target.value })
                }
                className="w-full bg-[#050505] border border-arc-border text-white text-[10px] font-black px-3 py-2 focus:border-[var(--color-arc-yellow)] outline-none uppercase"
              >
                <option value="default">Default</option>
                <option value="compact">Compact</option>
                <option value="tactical">Tactical</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] text-[var(--color-arc-muted)] mb-1.5 font-black uppercase tracking-[0.2em]">
                Theme
              </label>
              <select
                value={settings.theme}
                onChange={(e) =>
                  setSettings({ ...settings, theme: e.target.value })
                }
                className="w-full bg-[#050505] border border-arc-border text-white text-[10px] font-black px-3 py-2 focus:border-[var(--color-arc-yellow)] outline-none uppercase"
              >
                <option value="dark">Dark (Default)</option>
                <option value="terminal">Terminal Green</option>
                <option value="amber">Amber CRT</option>
              </select>
            </div>
          </div>
        </div>

        {/* ACCOUNT INFO — Discord Profile Card */}
        <DiscordProfileCard profile={profile} showStats={false} />
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-8 py-3 bg-arc-yellow text-black text-[10px] font-black uppercase tracking-[0.3em] hover:bg-arc-yellow/90 disabled:opacity-60 flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
