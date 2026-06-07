/**
 * discordUtils.ts — Client-side Discord helper utilities.
 * Mirrors the server-side getAvatarUrl from ARDB-main/lib/discord.ts
 * but safe to use in the browser (no Node.js deps).
 */

/**
 * Build a Discord CDN avatar URL.
 * Falls back to the default avatar if avatarHash is null/empty.
 */
export function getAvatarUrl(
  userId: string | undefined | null,
  avatarHash: string | null | undefined,
  size: 32 | 64 | 128 | 256 | 512 = 128,
): string {
  if (!userId) return `https://cdn.discordapp.com/embed/avatars/0.png`;

  if (!avatarHash) {
    const idx = parseInt(userId) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  }

  // Animated avatars start with "a_"
  const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=${size}`;
}

/**
 * Build a Discord guild member avatar URL (server-specific avatar).
 * Falls back to user avatar if no guildAvatarHash.
 */
export function getGuildAvatarUrl(
  guildId: string,
  userId: string,
  guildAvatarHash: string | null | undefined,
  userAvatarHash: string | null | undefined,
  size: 32 | 64 | 128 | 256 | 512 = 128,
): string {
  if (guildAvatarHash) {
    const ext = guildAvatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/guilds/${guildId}/users/${userId}/avatars/${guildAvatarHash}.${ext}?size=${size}`;
  }
  return getAvatarUrl(userId, userAvatarHash, size);
}

/**
 * Generate the Discord OAuth login URL.
 * Redirects to the server's /api/auth/discord endpoint.
 */
export function getDiscordLoginUrl(returnTo?: string): string {
  const base = '/api/auth/discord';
  if (returnTo) return `${base}?returnTo=${encodeURIComponent(returnTo)}`;
  return base;
}

/**
 * Format a Discord username for display.
 * New usernames have no discriminator; old ones show user#1234.
 */
export function formatDiscordUsername(
  username: string | undefined | null,
  discriminator?: string | null,
): string {
  if (!username) return 'Unknown';
  if (discriminator && discriminator !== '0')
    return `${username}#${discriminator}`;
  return username;
}
