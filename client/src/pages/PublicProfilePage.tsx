import { useEffect, useState } from 'react';
import {
  Trophy,
  Skull,
  Target,
  Coins,
  Package,
  ShieldCheck,
  Award,
  Calendar,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { PublicAPI } from '../lib/api';
import { RARITY_BG, RARITY_GRADIENT, getItemData } from '../lib/itemDb';
import DiscordProfileCard from '../components/DiscordProfileCard';
import arctrackerLabels from '../data/arctracker-en.json';

const EMBARK_STAT_LABELS = arctrackerLabels.RaidHistoryPage.embarkStats;

interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  bio: string;
  slug: string | null;
  embarkLinked: boolean;
  embarkUsername: string | null;
  level: number;
  xp: number;
  totalXp: number;
  storefrontName: string;
  storefrontDescription: string;
  badges: { id: string; name: string; icon?: string; earnedAt: string }[];
  salesCount: number;
  marketplaceRep: number;
  stats: {
    totalRaids: number;
    successfulExtractions: number;
    totalKills: number;
    netProfit: number;
    stashValue: number;
    kd: number;
    extractRate: number;
  };
  createdAt: string;
}

interface Listing {
  _id: string;
  itemId: string;
  itemName: string;
  itemrarity?: string;
  itemIconUrl?: string;
  itemQuantity: number;
  price: number;
  currency: string;
  createdAt: string;
}

interface Round {
  id?: string;
  outcome?: string;
  map?: string;
  kills?: number;
  damage?: number;
  date?: string;
  createdAt?: string;
}

const RARITY_COLOR: Record<string, string> = {
  legendary: 'var(--color-arc-legendary)',
  epic: 'var(--color-arc-epic)',
  rare: 'var(--color-arc-rare)',
  uncommon: 'var(--color-arc-uncommon)',
  common: 'var(--color-arc-common)',
};

export default function PublicProfilePage({ slug }: { slug: string }) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const p = await PublicAPI.profile(slug);
        if (cancelled) return;
        setProfile(p);
        const [ls, rs] = await Promise.all([
          PublicAPI.listings(slug).catch(() => ({ listings: [] })),
          PublicAPI.recent(slug).catch(() => ({ rounds: [] })),
        ]);
        if (cancelled) return;
        setListings(ls.listings || []);
        setRounds(rs.rounds || []);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Profile not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-arc-yellow animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <AlertTriangle className="w-10 h-10 text-[var(--color-arc-danger)] mx-auto mb-4" />
        <h1 className="text-2xl font-black text-white uppercase tracking-[0.3em] mb-2">
          Profile Unavailable
        </h1>
        <p className="text-[10px] text-[#8a7a9a] uppercase tracking-[0.2em]">
          {error || 'Not found'}
        </p>
        <a
          href="/"
          className="inline-block mt-6 px-4 py-2 border border-[var(--color-arc-yellow)]/30 text-arc-yellow text-[9px] font-black uppercase tracking-[0.2em] hover:bg-arc-yellow/10"
        >
          Return Home
        </a>
      </div>
    );
  }

  const { stats } = profile;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      {/* Header card — Discord profile */}
      <DiscordProfileCard profile={profile} showStats={true} />

      {/* Embark verified badge — shows in-game name if linked */}
      {profile.embarkLinked && profile.embarkUsername && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[#0c0c0e] border border-[var(--color-arc-uncommon)]/40 w-fit">
          <ShieldCheck className="w-4 h-4 text-[var(--color-arc-uncommon)]" />
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[var(--color-arc-uncommon)]">
            Embark Verified
          </span>
          <span className="text-[10px] font-mono text-arc-white">
            {profile.embarkUsername}
          </span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Raids"
          value={stats.totalRaids.toLocaleString()}
        />
        <StatCard
          icon={<ShieldCheck className="w-5 h-5" />}
          label="Extract Rate"
          value={`${stats.extractRate}%`}
          color="var(--color-arc-yellow)"
        />
        <StatCard
          icon={<Skull className="w-5 h-5" />}
          label="Kills"
          value={stats.totalKills.toLocaleString()}
          color="var(--color-arc-danger)"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          label="K/D"
          value={stats.kd.toFixed(2)}
          color="#FFC107"
        />
        <StatCard
          icon={<Coins className="w-5 h-5" />}
          label={EMBARK_STAT_LABELS.netValue}
          value={stats.netProfit.toLocaleString()}
        />
        <StatCard
          icon={<Package className="w-5 h-5" />}
          label="Stash Value"
          value={stats.stashValue.toLocaleString()}
        />
        <StatCard
          icon={<Award className="w-5 h-5" />}
          label="Total XP"
          value={profile.totalXp.toLocaleString()}
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="Extractions"
          value={stats.successfulExtractions.toLocaleString()}
          color="var(--color-arc-yellow)"
        />
      </div>

      {/* Badges */}
      {profile.badges.length > 0 && (
        <div className="raider-box bg-arc-light-bg border border-arc-border p-6">
          <h2 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#FFC107]" /> Achievements
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((b) => (
              <div
                key={b.id}
                className="px-3 py-2 bg-[#0c0c0e] border border-[#FFC107]/30 text-[#FFC107] text-[9px] font-black uppercase tracking-[0.2em]"
                title={new Date(b.earnedAt).toLocaleDateString()}
              >
                {b.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active marketplace listings */}
      <div className="raider-box bg-arc-light-bg border border-arc-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
            <Coins className="w-5 h-5 text-arc-yellow" /> Active Listings (
            {listings.length})
          </h2>
          {profile.storefrontName && (
            <span className="text-[9px] text-[#8a7a9a] uppercase tracking-[0.2em]">
              {profile.storefrontName}
            </span>
          )}
        </div>
        {listings.length === 0 ? (
          <p className="text-[10px] text-[#8a7a9a] uppercase tracking-[0.2em]">
            No active listings.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {listings.map((l) => {
              // Get rarity from items-master for accurate data
              const masterData = getItemData(l.itemId);
              const rarity = masterData?.rarity || l.itemrarity || 'Common';
              return (
                <div
                  key={l._id}
                  className="bg-[#050505] border border-arc-border p-3 flex items-center gap-3 hover:border-[var(--color-arc-yellow)]/40 transition-colors"
                >
                  <div
                    className="w-12 h-12 shrink-0 flex items-center justify-center"
                    style={{
                      background: '#0d0c14',
                      backgroundImage:
                        RARITY_BG[rarity] || RARITY_GRADIENT[rarity]
                          ? `url(${RARITY_BG[rarity] || RARITY_GRADIENT[rarity]})`
                          : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {l.itemIconUrl && (
                      <img
                        src={l.itemIconUrl}
                        alt=""
                        className="w-10 h-10 object-contain"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[10px] font-black uppercase tracking-wider truncate"
                      style={{
                        color: RARITY_COLOR[rarity.toLowerCase()] || '#fff',
                      }}
                    >
                      {l.itemName}
                    </p>
                    <p className="text-[9px] text-arc-yellow font-mono mt-1">
                      {l.price.toLocaleString()} {l.currency} · ×
                      {l.itemQuantity}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent rounds */}
      <div className="raider-box bg-arc-light-bg border border-arc-border p-6">
        <h2 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-[var(--color-arc-danger)]" /> Recent
          Raids
        </h2>
        {rounds.length === 0 ? (
          <p className="text-[10px] text-[#8a7a9a] uppercase tracking-[0.2em]">
            No public raid data.
          </p>
        ) : (
          <div className="space-y-2">
            {rounds.map((r, i) => (
              <div
                key={r.id || i}
                className="flex items-center justify-between px-3 py-2 bg-[#050505] border border-arc-border"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[9px] font-black uppercase tracking-[0.2em] ${
                      r.outcome === 'extracted'
                        ? 'text-arc-yellow'
                        : 'text-[var(--color-arc-danger)]'
                    }`}
                  >
                    {r.outcome || '—'}
                  </span>
                  <span className="text-[10px] text-white">
                    {r.map || 'Unknown Map'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[9px] text-[#8a7a9a] font-mono">
                  <span>K {r.kills ?? 0}</span>
                  <span>D {Math.round(r.damage || 0)}</span>
                  <span>
                    {r.date || r.createdAt
                      ? new Date(r.date || r.createdAt!).toLocaleDateString()
                      : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center pt-4">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-[9px] text-arc-yellow font-black uppercase tracking-[0.3em] hover:underline"
        >
          <ExternalLink className="w-3 h-3" /> shiesty.me
        </a>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color = '#fff',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="raider-box bg-arc-light-bg border border-arc-border p-4">
      <div className="flex items-center gap-2 text-[#8a7a9a] mb-2">
        {icon}
        <span className="text-[8px] font-black uppercase tracking-[0.3em]">
          {label}
        </span>
      </div>
      <p className="text-2xl font-black font-mono" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
