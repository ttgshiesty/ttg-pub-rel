/* =========================================================
   Raider Sync — helpers for storing & reading a player's
   linked Embark / MetaForge profile on top of the existing
   User model (Discord-id keyed).

   The User schema already carries embarkLinked, embarkUsername,
   embarkId, metaForgeProfileId, displayName, platforms,
   stashValue, lastSync, syncError, obtainedBlueprints — see
   server/models/user.js.

   All writes use $set so unrelated fields (level, xp,
   marketplace state, etc.) are preserved.
   ========================================================= */

import { User } from '../models/User.js';

const SYNC_FIELDS = [
  'embarkLinked',
  'embarkUsername',
  'embarkId',
  'metaForgeProfileId',
  'displayName',
  'platforms',
  'stashValue',
  'lastSync',
  'syncError',
  'obtainedBlueprints',
];

const DEFAULTS = {
  embarkLinked: false,
  embarkUsername: null,
  embarkId: null,
  metaForgeProfileId: null,
  displayName: null,
  platforms: [],
  stashValue: 0,
  lastSync: null,
  syncError: null,
  obtainedBlueprints: [],
};

/**
 * Read raider-sync fields for a Discord-authed user.
 * Returns defaults merged with whatever is stored.
 */
export async function getRaiderSyncProfile(discordId) {
  const user = await User.findOne({ id: discordId })
    .select(SYNC_FIELDS.join(' '))
    .lean();
  if (!user) return { ...DEFAULTS };
  const out = { ...DEFAULTS };
  for (const k of SYNC_FIELDS) {
    if (user[k] !== undefined && user[k] !== null) out[k] = user[k];
  }
  return out;
}

/**
 * Save an Embark username for the player. Marks them as linked
 * and clears any prior sync error.
 */
export async function saveEmbarkUsername(discordId, embarkUsername) {
  await User.findOneAndUpdate(
    { id: discordId },
    {
      $set: {
        embarkLinked: true,
        embarkUsername: String(embarkUsername).trim(),
        lastSync: new Date(),
        syncError: null,
      },
    },
    { upsert: true, new: true },
  );
}

/**
 * Clear all raider-sync fields without touching unrelated user data
 * (XP, marketplace listings, journal, etc).
 */
export async function clearEmbarkLink(discordId) {
  await User.findOneAndUpdate(
    { id: discordId },
    {
      $set: {
        embarkLinked: false,
        embarkUsername: null,
        embarkId: null,
        metaForgeProfileId: null,
        displayName: null,
        platforms: [],
        stashValue: 0,
        lastSync: new Date(),
        syncError: null,
      },
    },
    { upsert: false },
  );
}

/**
 * Persist a full MetaForge profile payload. Called from the
 * MetaForge OAuth/profile callback once that endpoint is live.
 */
export async function saveMetaForgeProfile(discordId, profile) {
  const metaForgeProfileId =
    profile.metaForgeProfileId || profile.profileId || profile.id;
  await User.findOneAndUpdate(
    { id: discordId },
    {
      $set: {
        embarkLinked: true,
        metaForgeProfileId,
        embarkId: profile.embarkId ?? null,
        embarkUsername:
          profile.embarkUsername || profile.displayName || profile.name || null,
        displayName: profile.displayName || profile.name || null,
        profile: {
          username:
            profile.username ||
            profile.displayName ||
            profile.name ||
            profile.profile?.username ||
            null,
          full_name:
            profile.full_name ||
            profile.fullName ||
            profile.displayName ||
            profile.name ||
            profile.profile?.full_name ||
            null,
          avatar_url:
            profile.avatar_url ||
            profile.avatarUrl ||
            profile.profile?.avatar_url ||
            null,
          embark_id:
            profile.embark_id ||
            profile.embarkId ||
            profile.profile?.embark_id ||
            null,
        },
        metaForgeProfile: profile,
        platforms: Array.isArray(profile.platforms) ? profile.platforms : [],
        stashValue:
          Number(
            profile.stashValue ?? profile.inventoryValue ?? profile.value,
          ) || 0,
        lastSync: new Date(),
        syncError: null,
      },
    },
    { upsert: true, new: true },
  );
}

/**
 * Record a sync error so the UI can show a "Re-link" prompt.
 */
export async function saveSyncError(discordId, message) {
  await User.findOneAndUpdate(
    { id: discordId },
    { $set: { syncError: String(message || 'Unknown error') } },
    { upsert: false },
  );
}
