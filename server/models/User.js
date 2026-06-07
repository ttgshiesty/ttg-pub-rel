import mongoose from 'mongoose';

const RaidHistorySchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: {
    type: String,
    enum: ['raid', 'trade', 'milestone', 'reflection'],
    default: 'raid',
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

const WantedItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  itemName: { type: String, required: true },
  reason: { type: String, default: '' },
  addedAt: { type: Date, default: Date.now },
});

const XpHistorySchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  reason: { type: String, default: '' },
  source: {
    type: String,
    enum: [
      'raid',
      'kill',
      'trade',
      'marketplace',
      'daily',
      'milestone',
      'combat',
    ],
    default: 'raid',
  },
  createdAt: { type: Date, default: Date.now },
});

const UserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // Discord ID
    username: { type: String },
    // NOTE: schema options below disable the virtual `id` getter that
    // would otherwise shadow our Discord ID field.
    avatar: { type: String },
    bio: { type: String, default: '' },
    lastActive: { type: Date, default: Date.now },

    // Rich auth/profile payloads used for enhanced SHiESTY profile display.
    // These mirror the provider/session shape returned by auth/profile sources.
    authSession: { type: mongoose.Schema.Types.Mixed, default: {} },
    authUser: { type: mongoose.Schema.Types.Mixed, default: {} },
    appMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    userMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    linkedIdentities: { type: [mongoose.Schema.Types.Mixed], default: [] },
    profile: { type: mongoose.Schema.Types.Mixed, default: {} },
    discordProfile: { type: mongoose.Schema.Types.Mixed, default: {} },
    metaForgeProfile: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Profile stats synced from Embark
    embarkId: { type: String },
    displayName: { type: String },

    // Raider Sync (Embark / MetaForge link state)
    embarkLinked: { type: Boolean, default: false },
    embarkUsername: { type: String, default: null },
    metaForgeProfileId: { type: String, default: null },
    platforms: { type: [String], default: [] },
    lastSync: { type: Date, default: null },
    syncError: { type: String, default: null },
    obtainedBlueprints: { type: [String], default: [] },

    // ArcTracker integration — user pastes their personal key from
    // arctracker.io Settings → Developer Access. We use it server-side
    // with our app key to fetch their stats/stash/etc.
    arctrackerUserKey: { type: String, default: null, select: false },
    arctrackerLinkedAt: { type: Date, default: null },
    arctrackerTokenExpiresAt: { type: Date, default: null }, // 24-hour token expiration
    // Optional secondary "trade" account — used for blueprints/stash on a
    // separate ArcTracker profile dedicated to marketplace trading.
    arctrackerTradeKey: { type: String, default: null, select: false },
    arctrackerTradeLinkedAt: { type: Date, default: null },
    arctrackerTradeTokenExpiresAt: { type: Date, default: null }, // 24-hour token expiration
    arctrackerTradeUsername: { type: String, default: null },
    // ArcTracker browser session cookie — used for cookie-only endpoints
    // (/api/embark/stats/*) that require better-auth.session_token.
    arctrackerSessionToken: { type: String, default: null, select: false },

    // Economy
    credits: { type: Number, default: 0 },
    tokens: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    stashValue: { type: Number, default: 0 },
    stashSlotsTotal: { type: Number, default: 0 },
    stashSlotsUsed: { type: Number, default: 0 },
    currencies: {
      type: Object,
      default: {
        credits: 0,
        raidertokens: 0,
        total_coins: 0,
        merits: 0,
        stash_value: 0,
      },
    },
    //test route

    // XP / Leveling system — Raider Hub internal level, driven by addXp()
    level: { type: Number, default: 0 },
    levelXp: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    totalXp: { type: Number, default: 0 },
    // In-game THE FINALS level & XP synced from ArcTracker profile.level / profile.xp_total
    gameLevel: { type: Number, default: null },
    playerLevel: { type: Number, default: null },
    gameXp: { type: Number, default: null },

    // Raid stats (cached from Embark/ArcTracker)
    totalRaids: { type: Number, default: 0 },
    successfulExtractions: { type: Number, default: 0 },
    totalKills: { type: Number, default: 0 },
    arcKills: { type: Number, default: 0 },
    total_arcKills: { type: Number, default: 0 },
    playerKills: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },
    demonStreak: {
      type: Number,
      default: 0,
      set(value) {
        if (value && typeof value === 'object') {
          return (
            Number(value.best ?? value.current ?? value.survival ?? 0) || 0
          );
        }
        return Number(value) || 0;
      },
    },

    // Discord webhook for notifications
    discordWebhookUrl: { type: String },

    // Marketplace
    storefrontName: { type: String, default: '' },
    storefrontDescription: { type: String, default: '' },
    marketplaceRep: { type: Number, default: 0 }, // sum of (#sales) - (#cancellations)
    salesCount: { type: Number, default: 0 },

    // Public profile
    slug: {
      type: String,
      index: true,
      sparse: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    profilePublic: { type: Boolean, default: true },

    // Achievement badges. Each badge: { id, name, earnedAt }
    badges: {
      type: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          icon: { type: String, default: '' },
          earnedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    // Intelligence & Progression
    mostWanted: { type: [WantedItemSchema], default: [] },
    raidHistory: { type: [RaidHistorySchema], default: [] },
    xpHistory: { type: [XpHistorySchema], default: [] },
    mapProgress: {
      type: mongoose.Schema.Types.Mixed,
      default: { version: 1, maps: {} },
    },

    // User Settings / Preferences
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        xboxIp: '192.168.1.236',
        autoSyncXbox: true,
        discordNotifications: true,
        marketplaceAlerts: true,
        raidAlerts: true,
        levelUpAlerts: true,
        dashboardLayout: 'default',
        theme: 'dark',
      },
    },

    createdAt: { type: Date, default: Date.now },
  },
  { id: false },
);

const MAX_LEVEL = 75;
const XP_PER_LEVEL = [
  5000, 10000, 11000, 12000, 12000, 13000, 14000, 15000, 16000, 17000, 18000,
  19000, 20000, 21000, 23000, 24000, 25000, 26000, 27000, 28000, 29000, 31000,
  32000, 33000, 34000, 35000, 36000, 37000, 38000, 38000, 39000, 40000, 40000,
  41000, 42000, 43000, 43000, 44000, 44000, 44000, 45000, 45000, 46000, 46000,
  47000, 47000, 47000, 47000, 48000, 48000, 48000, 48000, 48000, 48000, 49000,
  49000, 49000, 49000, 49000, 49000, 49000, 49000, 49000, 50000, 50000, 50000,
  50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000,
];

// XP table from scripts/xp-referane.json. Level 75 is the hard cap.
UserSchema.methods.xpForNextLevel = function () {
  const level = Math.max(1, Math.min(MAX_LEVEL, Number(this.level) || 1));
  if (level >= MAX_LEVEL) return 0;
  return XP_PER_LEVEL[level - 1] ?? 0;
};

UserSchema.methods.xpProgressPercent = function () {
  if ((Number(this.level) || 1) >= MAX_LEVEL) return 100;
  const needed = this.xpForNextLevel();
  if (needed <= 0) return 100;
  return Math.min(100, Math.floor((this.xp / needed) * 100));
};

UserSchema.methods.addXp = function (amount, reason = '', source = 'raid') {
  if (this.level >= MAX_LEVEL) return;
  this.xp += amount;
  this.totalXp += amount;
  this.xpHistory.push({ amount, reason, source, createdAt: new Date() });
  // Snapshot the threshold BEFORE bumping level so we subtract the correct amount
  let needed = this.xpForNextLevel();
  while (this.xp >= needed && this.level < MAX_LEVEL) {
    this.xp -= needed;
    this.level += 1;
    needed = this.xpForNextLevel();
  }
  if (this.level >= MAX_LEVEL) {
    this.level = MAX_LEVEL;
    this.xp = 0;
  }
};

UserSchema.methods.addRaidHistory = function (
  title,
  content,
  category = 'raid',
  metadata = {},
) {
  const id = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  this.raidHistory.push({
    id,
    title,
    content,
    category,
    metadata,
    createdAt: new Date(),
  });
};

UserSchema.methods.addWantedItem = function (itemId, itemName, reason = '') {
  if (!this.mostWanted.some((w) => w.itemId === itemId)) {
    this.mostWanted.push({ itemId, itemName, reason, addedAt: new Date() });
  }
};

UserSchema.methods.removeWantedItem = function (itemId) {
  this.mostWanted = this.mostWanted.filter((w) => w.itemId !== itemId);
};

export const User = mongoose.model('User', UserSchema);
