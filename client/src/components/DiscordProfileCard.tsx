/**
 * DiscordProfileCard — reusable Discord identity card.
 *
 * Shows avatar, display name, username, Discord ID, online badge,
 * and optional bio/level info. Used in SettingsPage and PublicProfilePage.
 *
 * Props:
 *   profile  — the Discord user object from PlayerContext / PublicProfile
 *   compact  — if true, renders a slim horizontal pill (for headers/nav)
 *   showStats — if true, shows level + sales + rep row
 */

import { getAvatarUrl } from '../lib/discordUtils';

interface ProfileCardProps {
  profile: {
    id: string;
    username?: string;
    displayName?: string;
    discord_username?: string;
    avatar?: string | null;
    bio?: string;
    embarkID?: string;
    level?: number;
    playerLevel?: number;
    salesCount?: number;
    marketplaceRep?: number;
    createdAt?: string;
    badges?: { id: string; name: string; icon?: string; earnedAt: string }[];
  };
  compact?: boolean;
  showStats?: boolean;
  className?: string;
}

export default function DiscordProfileCard({
  profile,
  compact = false,
  showStats = false,
  className = '',
}: ProfileCardProps) {
  const displayName =
    profile.displayName ||
    profile.username ||
    profile.discord_username ||
    'Unknown Raider';
  const discordTag = profile.username || profile.discord_username || '';
  const level = profile.level ?? profile.playerLevel;

  // Resolve avatar: prefer the Discord CDN URL helper, fall back to profile.avatar
  const avatarUrl = getAvatarUrl(
    profile.id,
    profile.avatar ?? null,
    compact ? 64 : 128,
  );

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="relative shrink-0">
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full border border-[#25bb55]/40 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                `https://cdn.discordapp.com/embed/avatars/${parseInt(profile.id || '0') % 5}.png`;
            }}
          />
          {/* online dot */}
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#25bb55] border border-[#080b16]" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black text-white uppercase tracking-wider truncate leading-none">
            {displayName}
          </p>
          {discordTag && (
            <p className="text-[8px] text-[#6c6b6a] font-mono truncate leading-none mt-0.5">
              @{discordTag}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`raider-box bg-[#080b16] border border-[#1a1a2e] p-6 ${className}`}
    >
      {/* Avatar + name row */}
      <div className="flex items-center gap-5 mb-5">
        <div className="relative shrink-0">
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-20 h-20 rounded-full border-2 border-[#25bb55]/40 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                `https://cdn.discordapp.com/embed/avatars/${parseInt(profile.id || '0') % 5}.png`;
            }}
          />
          <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-[#25bb55] border-2 border-[#080b16]" />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-white uppercase tracking-[0.15em] truncate">
            {displayName}
          </h2>
          {discordTag && (
            <p className="text-[10px] text-[#6c6b6a] font-mono mt-0.5">
              @{discordTag}
            </p>
          )}
          {/* Discord badge chip */}
          <div className="flex items-center gap-1.5 mt-2">
            <svg
              className="w-3 h-3 text-[#5865F2] shrink-0"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.036.055a19.93 19.93 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
            <span className="text-[8px] font-black text-[#5865F2] uppercase tracking-wider">
              Discord Linked
            </span>
            <span className="text-[8px] font-mono text-[#6c6b6a] ml-1">
              {profile.id}
            </span>
          </div>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-[10px] text-[#A1A1AA] leading-relaxed mb-4 border-l-2 border-[#25bb55]/30 pl-3">
          {profile.bio}
        </p>
      )}

      {/* Stats row */}
      {showStats && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {level !== undefined && (
            <div className="bg-[#0d0d17] border border-[#1a1a2e] p-2 text-center">
              <p className="text-[18px] font-black text-[#ffcc00] leading-none">
                {level}
              </p>
              <p className="text-[7px] text-[#6c6b6a] uppercase tracking-widest mt-0.5">
                Level
              </p>
            </div>
          )}
          {profile.salesCount !== undefined && (
            <div className="bg-[#0d0d17] border border-[#1a1a2e] p-2 text-center">
              <p className="text-[18px] font-black text-[#01abf4] leading-none">
                {profile.salesCount}
              </p>
              <p className="text-[7px] text-[#6c6b6a] uppercase tracking-widest mt-0.5">
                Sales
              </p>
            </div>
          )}
          {profile.marketplaceRep !== undefined && (
            <div className="bg-[#0d0d17] border border-[#1a1a2e] p-2 text-center">
              <p
                className={`text-[18px] font-black leading-none ${(profile.marketplaceRep ?? 0) >= 0 ? 'text-[#25bb55]' : 'text-[#e83a3a]'}`}
              >
                {(profile.marketplaceRep ?? 0) >= 0 ? '+' : ''}
                {profile.marketplaceRep}
              </p>
              <p className="text-[7px] text-[#6c6b6a] uppercase tracking-widest mt-0.5">
                Rep
              </p>
            </div>
          )}
        </div>
      )}

      {/* Badges */}
      {profile.badges && profile.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {profile.badges.map((badge) => (
            <span
              key={badge.id}
              title={`Earned ${new Date(badge.earnedAt).toLocaleDateString()}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#ffcc00]/10 border border-[#ffcc00]/30 text-[#ffcc00] text-[7px] font-black uppercase tracking-widest"
            >
              {badge.icon && <span>{badge.icon}</span>}
              {badge.name}
            </span>
          ))}
        </div>
      )}

      {/* Member since */}
      {profile.createdAt && (
        <p className="text-[8px] text-[#6c6b6a] font-mono mt-4 pt-4 border-t border-[#1a1120]">
          MEMBER SINCE{' '}
          {new Date(profile.createdAt)
            .toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
            .toUpperCase()}
        </p>
      )}
    </div>
  );
}
