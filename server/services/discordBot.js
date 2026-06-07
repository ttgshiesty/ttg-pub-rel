// Shared rarity → color map (Discord embed hex colors)
const RARITY_COLORS = {
  common: 0x6c6b6a,
  uncommon: 0x25bb55,
  rare: 0x01abf4,
  epic: 0xc43198,
  legendary: 0xffcc00,
};

/**
 * Send a Discord webhook notification
 */
export async function sendDiscordWebhook(webhookUrl, payload) {
  if (!webhookUrl) return false;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (err) {
    console.error('[DiscordBot] Webhook error:', err.message);
    return false;
  }
}

/**
 * Build a marketplace listing embed
 */
export function buildListingEmbed(listing, seller) {
  return {
    embeds: [
      {
        title: `💰 New Marketplace Listing: ${listing.itemName}`,
        description: listing.description || 'No description provided.',
        color: RARITY_COLORS[listing.itemrarity] || 0x00bcd4,
        fields: [
          {
            name: '💵 Price',
            value: `${listing.price} ${listing.currency}`,
            inline: true,
          },
          {
            name: '📦 Quantity',
            value: String(listing.itemQuantity),
            inline: true,
          },
          {
            name: '🏷️ Type',
            value: listing.itemType || 'Unknown',
            inline: true,
          },
          {
            name: '⭐ rarity',
            value: listing.itemrarity?.toUpperCase() || 'UNKNOWN',
            inline: true,
          },
          {
            name: '🔧 Condition',
            value: listing.condition?.toUpperCase() || 'MINT',
            inline: true,
          },
          {
            name: '👤 Seller',
            value: seller?.username || listing.sellerName,
            inline: true,
          },
        ],
        thumbnail: listing.itemIconUrl
          ? { url: listing.itemIconUrl }
          : undefined,
        footer: {
          text: `SHiESTY Marketplace • Level ${seller?.level || '?'} Seller`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Build a raid completion embed
 */
export function buildRaidEmbed(roundData, player) {
  const survived = roundData.extraction === 'success';
  const color = survived ? 0x4caf50 : 0xf44336;

  const fields = [
    {
      name: '🗺️ Map',
      value: roundData.map || 'Unknown',
      inline: true,
    },
    {
      name: '⏱️ Duration',
      value: `${Math.floor((roundData.duration || 0) / 60)}m ${(roundData.duration || 0) % 60}s`,
      inline: true,
    },
    {
      name: '💀 Kills',
      value: String(roundData.kills || 0),
      inline: true,
    },
    {
      name: '💰 Value Extracted',
      value: `${roundData.lootValue || 0} credits`,
      inline: true,
    },
    {
      name: '📊 XP Gained',
      value: `+${roundData.xpGained || 0} XP`,
      inline: true,
    },
  ];

  if (roundData.deathCause) {
    fields.push({
      name: '☠️ Death Cause',
      value: roundData.deathCause,
      inline: true,
    });
  }

  return {
    embeds: [
      {
        title: survived ? '✅ Raid Extraction Successful' : '❌ Raid Failed',
        description: `${player?.username || 'Unknown'} completed a raid on ${roundData.map || 'Unknown'}`,
        color,
        fields,
        footer: {
          text: `SHiESTY Tracker • Level ${player?.level || '?'}`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Build a level up embed
 */
export function buildLevelUpEmbed(player, oldLevel) {
  return {
    embeds: [
      {
        title: '🎉 LEVEL UP!',
        description: `**${player.username}** has reached **Level ${player.level}**!`,
        color: 0xffd700,
        fields: [
          {
            name: '📈 Previous Level',
            value: String(oldLevel),
            inline: true,
          },
          {
            name: '🎯 New Level',
            value: String(player.level),
            inline: true,
          },
          {
            name: '🏆 Total XP',
            value: String(player.totalXp),
            inline: true,
          },
        ],
        footer: {
          text: 'SHiESTY Progress Tracker',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Build a storefront update embed
 */
export function buildStorefrontEmbed(user, listings) {
  const activeListings = listings.filter((l) => l.status === 'active');

  return {
    embeds: [
      {
        title: `🏪 ${user.storefrontName || user.username + "'s Store"}`,
        description:
          user.storefrontDescription || 'Check out my marketplace listings!',
        color: 0x00bcd4,
        fields: [
          {
            name: '📦 Active Listings',
            value: String(activeListings.length),
            inline: true,
          },
          {
            name: '💰 Total Value',
            value: `${activeListings.reduce((sum, l) => sum + l.price * l.itemQuantity, 0)} credits`,
            inline: true,
          },
          {
            name: '👤 Seller',
            value: user.username,
            inline: true,
          },
        ],
        footer: {
          text: `SHiESTY Marketplace • Level ${user.level}`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Build a wanted item alert embed — triggered when a matching item is listed
 */
export function buildWantedAlertEmbed(listing, seller, wantedBy) {
  return {
    embeds: [
      {
        title: `🔥 WANTED ITEM ALERT: ${listing.itemName}`,
        description: `An item on your **Most Wanted** list has been listed on the marketplace!`,
        color: 0xff10f0,
        fields: [
          {
            name: '💵 Price',
            value: `${listing.price} ${listing.currency}`,
            inline: true,
          },
          {
            name: '📦 Quantity',
            value: String(listing.itemQuantity),
            inline: true,
          },
          {
            name: '⭐ rarity',
            value: listing.itemrarity?.toUpperCase() || 'UNKNOWN',
            inline: true,
          },
          {
            name: '👤 Seller',
            value: seller?.username || listing.sellerName || 'Unknown',
            inline: true,
          },
          {
            name: '🏷️ Type',
            value: listing.itemType || 'Unknown',
            inline: true,
          },
          {
            name: '🎯 Your Reason',
            value: wantedBy?.reason || 'No reason given',
            inline: true,
          },
        ],
        thumbnail: listing.itemIconUrl
          ? { url: listing.itemIconUrl }
          : undefined,
        footer: {
          text: `SHiESTY Telepathy • Act fast before it's gone!`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Build a journal entry embed — for Discord sharing
 */
export function buildJournalEmbed(entry, player) {
  const categoryColors = {
    raid: 0x39ff14,
    trade: 0xffb800,
    milestone: 0xffd700,
    reflection: 0x00d1ff,
  };

  return {
    embeds: [
      {
        title: `📖 ${entry.title}`,
        description: entry.content,
        color: categoryColors[entry.category] || 0x71717a,
        fields: [
          {
            name: '📂 Category',
            value: entry.category.toUpperCase(),
            inline: true,
          },
          {
            name: '👤 Raider',
            value: player?.username || 'Unknown',
            inline: true,
          },
        ],
        footer: {
          text: `SHiESTY Raider's Journal • Level ${player?.level || '?'}`,
        },
        timestamp: entry.createdAt || new Date().toISOString(),
      },
    ],
  };
}

/**
 * Build an XP breakdown embed
 */
export function buildXpEmbed(user) {
  const needed = user.xpForNextLevel
    ? user.xpForNextLevel()
    : user.level * 1000;
  const percent = user.xpProgressPercent ? user.xpProgressPercent() : 0;

  return {
    embeds: [
      {
        title: `📈 XP Breakdown — ${user.username}`,
        description: `Level **${user.level}** • **${user.xp}** / **${needed}** XP (${percent}%)`,
        color: 0x39ff14,
        fields: [
          {
            name: '🏆 Total XP Earned',
            value: String(user.totalXp || 0),
            inline: true,
          },
          {
            name: '📊 XP to Next Level',
            value: String(needed - (user.xp || 0)),
            inline: true,
          },
          {
            name: '🎯 Progress',
            value: `${percent}%`,
            inline: true,
          },
        ],
        footer: {
          text: 'SHiESTY Progress Tracker',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/* ==== Marketplace tradeflow embeds (sale + offer lifecycle) ==== */

function rarityColor(r) {
  return RARITY_COLORS[(r || 'common').toLowerCase()] || 0x39ff14;
}

/**
 * Built when a buyer purchases a listing outright. Sent to the SELLER.
 */
export function buildSaleEmbed(listing, buyerName, totalPrice) {
  return {
    embeds: [
      {
        title: `✅ SOLD: ${listing.itemName}`,
        description: `Your listing has been purchased.`,
        color: rarityColor(listing.itemrarity),
        fields: [
          {
            name: '💰 Sale Price',
            value: `${totalPrice} ${listing.currency}`,
            inline: true,
          },
          {
            name: '📦 Quantity',
            value: String(listing.itemQuantity || 1),
            inline: true,
          },
          { name: '👤 Buyer', value: buyerName || 'Unknown', inline: true },
          {
            name: '⭐ rarity',
            value: (listing.itemrarity || 'common').toUpperCase(),
            inline: true,
          },
        ],
        thumbnail: listing.itemIconUrl
          ? { url: listing.itemIconUrl }
          : undefined,
        footer: { text: 'SHiESTY Marketplace · Sale Confirmed' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Built when a buyer submits a new offer. Sent to the SELLER.
 */
export function buildOfferReceivedEmbed(offer, listing) {
  return {
    embeds: [
      {
        title: `📩 New Offer: ${listing.itemName}`,
        description: offer.message?.trim()
          ? `> ${offer.message.trim().slice(0, 500)}`
          : '_No message included._',
        color: rarityColor(listing.itemrarity),
        fields: [
          {
            name: '💵 Offer',
            value: `${offer.offeredPrice} ${offer.currency}`,
            inline: true,
          },
          {
            name: '📦 Listed at',
            value: `${listing.price} ${listing.currency}`,
            inline: true,
          },
          {
            name: '👤 From',
            value: offer.buyerName || 'Unknown',
            inline: true,
          },
          {
            name: '⭐ rarity',
            value: (listing.itemrarity || 'common').toUpperCase(),
            inline: true,
          },
        ],
        thumbnail: listing.itemIconUrl
          ? { url: listing.itemIconUrl }
          : undefined,
        footer: {
          text: 'SHiESTY Marketplace · Open the trade panel to respond',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Built when a seller accepts an offer. Sent to the BUYER.
 */
export function buildOfferAcceptedEmbed(offer, listing) {
  return {
    embeds: [
      {
        title: `🎉 Offer Accepted: ${listing.itemName}`,
        description: 'The seller accepted your offer — funds transferred.',
        color: 0x39ff14,
        fields: [
          {
            name: '💰 Paid',
            value: `${offer.offeredPrice * (offer.itemQuantity || 1)} ${offer.currency}`,
            inline: true,
          },
          {
            name: '📦 Quantity',
            value: String(offer.itemQuantity || 1),
            inline: true,
          },
          {
            name: '👤 Seller',
            value: offer.sellerName || 'Unknown',
            inline: true,
          },
        ],
        thumbnail: listing.itemIconUrl
          ? { url: listing.itemIconUrl }
          : undefined,
        footer: {
          text: 'SHiESTY Marketplace · Coordinate the in-game handoff',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Built when a seller declines an offer. Sent to the BUYER.
 */
export function buildOfferDeclinedEmbed(offer, listing) {
  return {
    embeds: [
      {
        title: `❌ Offer Declined: ${listing.itemName}`,
        description: 'The seller passed on your offer. Try a different price?',
        color: 0xff073a,
        fields: [
          {
            name: 'Your offer',
            value: `${offer.offeredPrice} ${offer.currency}`,
            inline: true,
          },
          {
            name: 'Listed at',
            value: `${listing.price} ${listing.currency}`,
            inline: true,
          },
        ],
        thumbnail: listing.itemIconUrl
          ? { url: listing.itemIconUrl }
          : undefined,
        footer: { text: 'SHiESTY Marketplace' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Blueprint-specific listing embed — richer than the generic one.
 * Includes drop source, manufacture cost, and owned status.
 */
export function buildBlueprintListingEmbed(listing, seller, dropInfo) {
  const fields = [
    {
      name: '💵 Price',
      value: `${listing.price.toLocaleString()} ${listing.currency}`,
      inline: true,
    },
    {
      name: '📦 Quantity',
      value: String(listing.itemQuantity || 1),
      inline: true,
    },
    {
      name: '⭐ rarity',
      value: (listing.itemrarity || 'common').toUpperCase(),
      inline: true,
    },
    {
      name: '👤 Seller',
      value: seller?.username || listing.sellerName || 'Unknown',
      inline: true,
    },
  ];

  if (dropInfo) {
    fields.push({
      name: '🗺️ Drop Source',
      value: `${dropInfo.map} · ${dropInfo.containers}${dropInfo.scavengable ? ' · Scavengable' : ''}`,
      inline: false,
    });
    if (dropInfo.questReward) {
      fields.push({
        name: '📋 Quest Reward',
        value: dropInfo.questReward,
        inline: true,
      });
    }
  }

  if (listing.itemStats?.manufactureCost) {
    fields.push({
      name: '🔧 Craft Cost',
      value: `${listing.itemStats.manufactureCost.toLocaleString()} credits`,
      inline: true,
    });
  }

  return {
    embeds: [
      {
        title: `📐 Blueprint Listed: ${listing.itemName}`,
        description:
          listing.description?.trim() ||
          'Blueprint available on the SHiESTY Marketplace.',
        color:
          RARITY_COLORS[(listing.itemrarity || 'common').toLowerCase()] ||
          0x39ff14,
        fields,
        thumbnail: listing.itemIconUrl
          ? { url: listing.itemIconUrl }
          : undefined,
        footer: {
          text: `SHiESTY Marketplace · Blueprint Exchange · Level ${seller?.level || '?'} Seller`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Blueprint community find embed — sent when a player logs where a blueprint
 * dropped so Discord can mirror the tracker feed.
 */
export function buildBlueprintFindEmbed(find, reporter) {
  const fields = [
    {
      name: 'Map',
      value: find.map || 'Unknown',
      inline: true,
    },
    {
      name: 'Condition',
      value: find.condition || 'Any',
      inline: true,
    },
    {
      name: 'Container',
      value: find.container || 'Not specified',
      inline: true,
    },
  ];

  if (find.location) {
    fields.push({
      name: 'Location',
      value: find.location,
      inline: false,
    });
  }
  if (find.locked) {
    fields.push({
      name: 'Access',
      value: 'Locked/keyed area',
      inline: true,
    });
  }
  if (find.notes) {
    fields.push({
      name: 'Notes',
      value: find.notes.slice(0, 500),
      inline: false,
    });
  }

  return {
    embeds: [
      {
        title: `Blueprint Find: ${find.blueprintName}`,
        description: `${reporter?.username || find.userName || 'A raider'} logged a blueprint drop location.`,
        color:
          RARITY_COLORS[(find.rarity || 'common').toLowerCase()] || 0x39ff14,
        fields,
        thumbnail: find.blueprintImageUrl
          ? { url: find.blueprintImageUrl }
          : undefined,
        footer: { text: 'SHiESTY Blueprint Finder' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export const DiscordBot = {
  sendWebhook: sendDiscordWebhook,
  buildListingEmbed,
  buildBlueprintListingEmbed,
  buildBlueprintFindEmbed,
  buildRaidEmbed,
  buildLevelUpEmbed,
  buildStorefrontEmbed,
  buildWantedAlertEmbed,
  buildJournalEmbed,
  buildXpEmbed,
  buildSaleEmbed,
  buildOfferReceivedEmbed,
  buildOfferAcceptedEmbed,
  buildOfferDeclinedEmbed,
};

// =============================================================================
// ARC SPY BOT — Live Events, Blueprint Intelligence, Guild Panel Management
// Ported from bot.py
// =============================================================================

import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { parse as csvParse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import logger from '../utils/logger.js';
import {
  commands as discordHubCommands,
  handleInteraction,
} from './discordCommands.js';
import { getAtlasBlueprintSummary } from './atlasBlueprints.js';

// ---- CONFIG ----
const API_BASE = 'https://metaforge.app/api/arc-raiders';
const BLUEPRINTS_CSV_PATH =
  process.env.BLUEPRINTS_CSV_PATH ||
  new URL('../../arc_raiders_blueprints_final.csv', import.meta.url).pathname;
const CONFIG_PATH =
  process.env.GUILD_CONFIG_PATH ||
  new URL('../../guild_config.json', import.meta.url).pathname;
const PANEL_UPDATE_CONCURRENCY = Math.max(
  1,
  parseInt(process.env.PANEL_UPDATE_CONCURRENCY || '8', 10) || 8,
);

// ---- EVENT → BLUEPRINT MAPPING ----
export const EVENT_BLUEPRINTS = {
  'Locked Gate': [
    'Bobcat',
    'Combat Mk. 3 (Aggressive)',
    'Combat Mk. 3 (Flanking)',
    'Compensator III',
    'Extended Barrel',
    'Extended Light Magazine III',
    'Extended Medium Magazine III',
    'Extended Shotgun Magazine III',
    'Lightweight Stock',
    'Muzzle Brake III',
    'Padded Stock',
    'Shotgun Choke III',
    'Shotgun Silencer',
    'Stable Stock III',
    'Vertical Grip III',
  ],
  'Night Raid': [
    'Tempest',
    'Wolfpack',
    'Extended Medium Magazine II',
    'Angled Grip III',
    'Compensator III',
    'Extended Light Magazine III',
    'Extended Medium Magazine III',
    'Extended Shotgun Magazine III',
    'Lightweight Stock',
    'Muzzle Brake III',
    'Padded Stock',
    'Shotgun Choke III',
    'Shotgun Silencer',
    'Stable Stock III',
    'Vertical Grip III',
  ],
  'Electromagnetic Storm': [
    'Snap Hook',
    'Angled Grip III',
    'Compensator III',
    'Extended Barrel',
    'Extended Light Magazine III',
    'Extended Medium Magazine III',
    'Extended Shotgun Magazine III',
    'Lightweight Stock',
    'Muzzle Brake III',
    'Padded Stock',
    'Shotgun Choke III',
    'Shotgun Silencer',
    'Stable Stock III',
    'Vertical Grip III',
  ],
  Harvester: ['Equalizer', 'Jupiter'],
  'Hidden Bunker': ['Vulcano', 'Shotgun Silencer'],
  Matriarch: ['Aphelion'],
};

// ---- ITEM CACHE ----
let itemsRaw = [];
let itemsByName = {}; // lowercase name → item object

function buildItemsIndex(raw) {
  const idx = {};
  for (const it of raw) {
    const nm = typeof it.name === 'string' ? it.name.trim() : null;
    if (nm) idx[nm.toLowerCase()] = it;
  }
  return idx;
}

async function loadItemsAllPages(limit = 50) {
  const all = [];
  const firstRes = await fetch(`${API_BASE}/items?page=1&limit=${limit}`);
  if (!firstRes.ok) throw new Error(`Items API ${firstRes.status}`);
  const first = await firstRes.json();
  const firstData = Array.isArray(first.data) ? first.data : first;
  if (!Array.isArray(firstData))
    throw new Error('Unexpected /items shape (expected array)');
  all.push(...firstData);

  const totalPages = parseInt(first.pagination?.totalPages || '1', 10) || 1;
  for (let page = 2; page <= totalPages; page++) {
    const res = await fetch(`${API_BASE}/items?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error(`Items API page ${page}: ${res.status}`);
    const payload = await res.json();
    const data = Array.isArray(payload.data) ? payload.data : payload;
    if (!Array.isArray(data))
      throw new Error(`Unexpected /items page ${page} shape`);
    all.push(...data);
  }
  return all;
}

export async function refreshItemCache() {
  itemsRaw = await loadItemsAllPages(50);
  itemsByName = buildItemsIndex(itemsRaw);
  logger.info(
    `[SHiESTY RAIDERS] Items cached: ${Object.keys(itemsByName).length}`,
  );
}

function findItemForBlueprint(bpName) {
  const candidates = [`${bpName} Blueprint`, bpName, `${bpName} blueprint`];
  for (const c of candidates) {
    const it = itemsByName[c.toLowerCase()];
    if (it) return it;
  }
  return null;
}

function itemDisplay(name) {
  const it = itemsByName[name.toLowerCase()];
  return it?.name || name;
}

// ---- GUILD CONFIG STORE ----
// Async-safe: Node is single-threaded so we use a promise-mutex for
// in-process serialization; atomic write via tmp→rename.
let _configLock = Promise.resolve();

function withConfigLock(fn) {
  const next = _configLock.then(() => fn());
  _configLock = next.catch(() => {});
  return next;
}

function _readConfigSync() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return {};
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return {};
    // Validate each entry — keep IDs as strings (Discord snowflakes exceed
    // Number.MAX_SAFE_INTEGER so converting to Number loses precision).
    const out = {};
    for (const [gid, panel] of Object.entries(data)) {
      const cid = String(panel?.channel_id || '');
      const mid = String(panel?.message_id || '');
      if (cid && mid) {
        out[String(gid)] = { channel_id: cid, message_id: mid };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function _writeConfigSync(cfg) {
  const dir = path.dirname(CONFIG_PATH);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.guild_config_${process.pid}_${Date.now()}.tmp`);
  try {
    fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8');
    fs.renameSync(tmp, CONFIG_PATH);
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}

export const guildConfigStore = {
  snapshot() {
    return withConfigLock(() => _readConfigSync());
  },
  setPanel(guildId, channelId, messageId) {
    return withConfigLock(() => {
      const cfg = _readConfigSync();
      cfg[String(guildId)] = {
        channel_id: String(channelId),
        message_id: String(messageId),
      };
      _writeConfigSync(cfg);
    });
  },
  removePanel(guildId) {
    return withConfigLock(() => {
      const cfg = _readConfigSync();
      const existed = String(guildId) in cfg;
      if (existed) {
        delete cfg[String(guildId)];
        _writeConfigSync(cfg);
      }
      return existed;
    });
  },
  removeMatching(stalePanels) {
    if (!stalePanels || !Object.keys(stalePanels).length)
      return Promise.resolve(0);
    return withConfigLock(() => {
      const cfg = _readConfigSync();
      let removed = 0;
      for (const [gid, stale] of Object.entries(stalePanels)) {
        const cur = cfg[gid];
        if (
          cur &&
          String(cur.channel_id) === String(stale.channel_id) &&
          String(cur.message_id) === String(stale.message_id)
        ) {
          delete cfg[gid];
          removed++;
        }
      }
      if (removed) _writeConfigSync(cfg);
      return removed;
    });
  },
};

// ---- BLUEPRINT CSV LOADER ----
let bpDb = {}; // lowercase name → blueprint row object

export function loadBlueprintsCSV(csvPath = BLUEPRINTS_CSV_PATH) {
  const db = {};
  if (!fs.existsSync(csvPath)) {
    console.error(`[SHiESTY RAIDERS] Blueprint CSV not found at ${csvPath}`);
    return db;
  }
  try {
    const content = fs.readFileSync(csvPath, 'utf8');
    // Handle window.SHIESTY_DATA = {...} JS format
    if (content.includes('window.SHIESTY_DATA')) {
      const jsonMatch = content.match(
        /window\.SHIESTY_DATA\s*=\s*({[\s\S]*});?$/,
      );
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        const rows = data.rows || [];
        for (const row of rows) {
          const name = (row.Blueprint || '').trim();
          if (!name) continue;
          db[name.toLowerCase()] = {
            name,
            map: (row.Map || '').trim(),
            mapCondition: (
              row['Map Condition'] ||
              row.MapCondition ||
              ''
            ).trim(),
            condition: (row.Condition || '').trim(),
            behindLockedDoor: (row['Behind Locked Door?'] || '').trim(),
            container: (row.Container || '').trim(),
            location: (row['Location on the map'] || '').trim(),
          };
        }
        logger.info(
          `[SHiESTY RAIDERS] Blueprint dataset loaded: ${Object.keys(db).length} entries from JS format`,
        );
        return db;
      }
    }
    // Fallback to CSV parsing
    const rows = csvParse(content, { columns: true, skip_empty_lines: true });
    for (const row of rows) {
      const name = (row.BlueprintName || '').trim();
      if (!name) continue;
      db[name.toLowerCase()] = {
        name,
        map: (row.Map || '').trim(),
        mapCondition: (row.MapCondition || '').trim(),
        scavengable: (row.Scavengable || '').trim(),
        containers: (row.Containers || '').trim(),
        questReward: (row.QuestReward || '').trim(),
        trialsReward: (row.TrialsReward || '').trim(),
        containerTypeAssumed: (row.ContainerTypeAssumed || '').trim(),
        dropRatePerContainer:
          parseFloat(row.DropRateEstimate_PerContainer) || null,
        avgRaids6: parseFloat(row.AvgRaidsEstimate_6Containers) || null,
        avgRaids9: parseFloat(row.AvgRaidsEstimate_9Containers) || null,
        notes: (row.Notes || '').trim(),
        locationNotes: (row.LocationNotes || '').trim(),
        bestKnownRoute: (row.BestKnownRoute || '').trim(),
        craftingMaterials: (row.CraftingMaterials || '').trim(),
        workshopLevel: (row.WorkshopLevel || '').trim(),
      };
    }
    logger.info(
      `[SHiESTY RAIDERS]] Blueprint dataset loaded: ${Object.keys(db).length} entries`,
    );
  } catch (err) {
    console.error('[SHiESTY RAIDERS] Blueprint CSV parse error:', err.message);
  }
  return db;
}

export function reloadBlueprints() {
  bpDb = loadBlueprintsCSV();
  return bpDb;
}

// ---- FORMATTING HELPERS ----
function clamp(s, n) {
  s = s != null ? String(s) : '—';
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function isMeaningful(value) {
  const v = (value || '').trim();
  if (!v) return false;
  return !['unknown', 'n/a', 'na', '-', '—'].includes(v.toLowerCase());
}

function addFieldIf(embed, name, value, inline = false) {
  if (isMeaningful(value)) {
    embed.addFields({ name, value: clamp(value, 1024), inline });
  }
}

function formatFound(info) {
  const bits = [];
  if (info.map) bits.push(`Map: ${info.map}`);
  if (info.mapCondition) bits.push(`Condition: ${info.mapCondition}`);
  if (info.scavengable) bits.push(`Scavengable: ${info.scavengable}`);
  if (info.containers) bits.push(`Containers: ${info.containers}`);
  if (info.questReward) bits.push(`Quest reward: ${info.questReward}`);
  if (info.trialsReward) bits.push(`Trials reward: ${info.trialsReward}`);
  if (info.containerTypeAssumed)
    bits.push(`Container pool: ${info.containerTypeAssumed}`);
  if (info.notes) bits.push(`Notes: ${info.notes}`);
  return bits.join('\n');
}

function formatRoutes(info) {
  const bits = [];
  if (info.locationNotes) bits.push(info.locationNotes);
  if (info.bestKnownRoute) bits.push(`Route: ${info.bestKnownRoute}`);
  return bits.join('\n');
}

function formatAtlasPercent(value) {
  return `${Math.round(value * 10) / 10}%`;
}

function formatAtlasStats(stats = [], limit = 5) {
  return stats
    .slice(0, limit)
    .map(
      (entry) =>
        `${entry.name}: ${entry.count} (${formatAtlasPercent(entry.percent)})`,
    )
    .join('\n');
}

function formatAtlasRoutes(summary) {
  return summary.locationsByMap
    .filter((entry) => entry.locations.length)
    .slice(0, 2)
    .map((entry) => {
      const routes = entry.locations
        .slice(0, 3)
        .map((location) => `${location.name} (${location.count})`)
        .join('; ');
      return `${entry.map}: ${routes}`;
    })
    .join('\n');
}

function atlasUrl(bpName) {
  const base = process.env.APP_URL || 'https://shiesty.me';
  return `${base}/atlas/index.html?bp=${encodeURIComponent(bpName)}`;
}

// ---- BLUEPRINT EMBED BUILDER ----
export async function buildBlueprintPageEmbed(bpName, idx, total) {
  const info = bpDb[bpName.toLowerCase()];
  const atlas = await getAtlasBlueprintSummary(bpName).catch((err) => {
    console.warn('[SCRAPPY] Atlas blueprint summary failed:', err.message);
    return null;
  });
  const embed = new EmbedBuilder()
    .setTitle(`${bpName} Blueprint`)
    .setColor(0x2b6cb0)
    .setURL(atlasUrl(bpName))
    .setFooter({
      text: `${idx + 1}/${total} • Atlas data includes CSV + Mongo user finds`,
    });

  const it = findItemForBlueprint(bpName);
  if (it) {
    const desc = (it.description || '').trim();
    const rarity = (it.rarity || '').trim();
    const icon = it.icon;
    if (isMeaningful(desc)) embed.setDescription(clamp(desc, 4096));
    addFieldIf(embed, 'rarity', rarity, true);
    if (typeof icon === 'string' && icon.startsWith('http')) {
      embed.setThumbnail(icon);
    }
  }

  if (info) {
    addFieldIf(embed, 'Found / how', formatFound(info), false);
    addFieldIf(embed, 'Where to farm', formatRoutes(info), false);
    addFieldIf(embed, 'Craft materials', info.craftingMaterials, false);
    addFieldIf(embed, 'Workshop level', info.workshopLevel, true);
  }

  if (atlas) {
    addFieldIf(
      embed,
      'Atlas overview',
      [
        `Reports: ${atlas.reports}`,
        `Best map: ${atlas.bestMap}`,
        `Best time: ${atlas.bestCondition}`,
        atlas.lockedChance == null
          ? null
          : `Locked chance: ${formatAtlasPercent(atlas.lockedChance)}`,
      ]
        .filter(Boolean)
        .join('\n'),
      false,
    );
    addFieldIf(embed, 'By map', formatAtlasStats(atlas.maps, 5), false);
    addFieldIf(
      embed,
      'Containers',
      formatAtlasStats(atlas.containers, 5),
      false,
    );
    addFieldIf(embed, 'Routes', formatAtlasRoutes(atlas), false);
  }

  if (!embed.data.description && !embed.data.fields?.length) {
    embed.setDescription('No intel available for this blueprint.');
  }

  return embed;
}

function buildBlueprintRow(idx, total) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('bp_prev')
      .setLabel('◀️ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(total <= 1),
    new ButtonBuilder()
      .setCustomId('bp_next')
      .setLabel('Next ▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(total <= 1),
  );
}

// ---- ACTIVE EVENTS EMBED ----
export async function buildActiveEventsEmbed() {
  const res = await fetch(`${API_BASE}/events-schedule`);
  if (!res.ok) throw new Error(`Events API ${res.status}`);
  const data = await res.json();

  const nowMs = Date.now();
  const nowUnix = Math.floor(nowMs / 1000);

  const raw = Array.isArray(data.data)
    ? data.data
    : Array.isArray(data)
      ? data
      : [];

  const activeByMap = {};
  for (const e of raw) {
    if (typeof e !== 'object' || !e) continue;
    const name = String(e.name || 'Unknown');
    const mp = String(e.map || 'Unknown');
    const st = e.startTime;
    const et = e.endTime;
    if (typeof st === 'number' && typeof et === 'number') {
      if (nowMs >= st && nowMs < et) {
        (activeByMap[mp] = activeByMap[mp] || []).push(name);
      }
    }
  }

  const embed = new EmbedBuilder().setTitle('ACTIVE Events').setColor(0xff0000);

  if (Object.keys(activeByMap).length) {
    embed.setDescription(`Updated <t:${nowUnix}:F> (<t:${nowUnix}:R>)`);
    for (const [mp, evs] of Object.entries(activeByMap).sort()) {
      const lines = [];
      for (const ev of evs.slice(0, 6)) {
        lines.push(`• ${ev}`);
        const bps = EVENT_BLUEPRINTS[ev] || [];
        if (bps.length) {
          const shown = bps.slice(0, 10).map(itemDisplay);
          const suffix = bps.length > 10 ? '…' : '';
          lines.push(`↳ Event blueprints: ${shown.join(', ')}${suffix}`);
        } else {
          lines.push('↳ Event blueprints: None');
        }
        lines.push('');
      }
      if (lines.at(-1) === '') lines.pop();
      embed.addFields({ name: mp, value: lines.join('\n'), inline: false });
    }
  } else {
    embed.setDescription(
      `No events active • Updated <t:${nowUnix}:F> (<t:${nowUnix}:R>)`,
    );
  }

  embed.setFooter({
    text: 'Event blueprint list is curated; verify drops in-game',
  });
  return embed;
}

// ---- BOT CLIENT + COMMANDS ----

// Per-user paginator sessions: userId → { names: string[], idx: number }
const bpSessions = new Map();

// Slash command definitions
const slashCommands = [
  new SlashCommandBuilder()
    .setName('set_event_panel')
    .setDescription('Create or move the live events panel to this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  new SlashCommandBuilder()
    .setName('remove_event_panel')
    .setDescription("Remove this server's live events panel configuration")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  new SlashCommandBuilder()
    .setName('blueprints')
    .setDescription('Browse blueprint intel (one per page)')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('update_events')
    .setDescription('Owner-only: refresh the live events panel now')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('reload_blueprints')
    .setDescription('Owner-only: reload blueprint intel from disk')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('refresh_cache')
    .setDescription('Owner-only: refresh item metadata (icons/rarity)')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show command reference')
    .toJSON(),
];

async function pushStalePanelUpdates(client) {
  const guildCfg = await guildConfigStore.snapshot();
  if (!Object.keys(guildCfg).length) return;

  let embed;
  try {
    embed = await buildActiveEventsEmbed();
  } catch (err) {
    console.error(
      '[SHiESTY RAIDERS] Failed to build events embed:',
      err.message,
    );
    return;
  }

  const stalePanels = {};
  const tasks = Object.entries(guildCfg).map(async ([guildId, panel]) => {
    try {
      let channel = client.channels.cache.get(panel.channel_id);
      if (!channel) {
        try {
          channel = await client.channels.fetch(panel.channel_id);
        } catch {
          stalePanels[guildId] = panel;
          return;
        }
      }
      const msg = await channel.messages.fetch(panel.message_id);
      await msg.edit({ embeds: [embed] });
    } catch (err) {
      if (err.code === 10003 || err.code === 10008) {
        // Unknown channel or message — mark stale
        stalePanels[guildId] = panel;
      } else {
        console.warn(
          `[SHiESTY RAIDERS] Panel update guild=${guildId}: ${err.message}`,
        );
      }
    }
  });

  // Batch with concurrency limit
  for (let i = 0; i < tasks.length; i += PANEL_UPDATE_CONCURRENCY) {
    await Promise.allSettled(tasks.slice(i, i + PANEL_UPDATE_CONCURRENCY));
  }

  if (Object.keys(stalePanels).length) {
    const removed = await guildConfigStore.removeMatching(stalePanels);
    if (removed)
      logger.info(`[SHiESTY RAIDERS] Cleaned up ${removed} stale guild panels`);
  }
}

/**
 * Initialize and start the SHiESTY RAIDERS bot.
 * Call this once from your server entry point:
 *   import { startSHiESTY RAIDERSBot } from './services/discordBot.js';
 *   startSCRAPPYBot();
 */
export async function startSCRAPPYBot() {
  const token = (process.env.DISCORD_BOT_TOKEN || '')
    .split('#')[0]
    .replace(/['"'\s\n\r]/g, '')
    .trim();
  if (!token) {
    console.error('[SCRAPPY] DISCORD_BOT_TOKEN not set — SCRAPPY not started.');
    return;
  }

  // Warm up data
  reloadBlueprints();
  try {
    await refreshItemCache();
  } catch (err) {
    console.warn(
      '[SCRAPPY] Item cache warmup failed (continuing):',
      err.message,
    );
  }

  // Register slash commands globally
  const rest = new REST({ version: '10' }).setToken(token);
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (clientId) {
    try {
      await rest.put(Routes.applicationCommands(clientId), {
        body: [...slashCommands, ...discordHubCommands.map((c) => c.toJSON())],
      });
      logger.info('[SCRAPPY] Slash commands registered globally.');
    } catch (err) {
      console.warn('[SCRAPPY] Slash command registration failed:', err.message);
    }
  } else {
    console.warn(
      '[SCRAPPY] DISCORD_CLIENT_ID not set — skipping slash command registration.',
    );
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once('clientReady', async () => {
    logger.info(
      `[SCRAPPY] ${client.user.tag} connected! Guilds: ${client.guilds.cache.size}`,
    );
    const cfg = await guildConfigStore.snapshot();
    logger.info(
      `[SCRAPPY] Loaded ${Object.keys(cfg).length} guild panel configs`,
    );

    // Live panel update: every 5 minutes
    cron.schedule('*/5 * * * *', () => pushStalePanelUpdates(client));

    // Weekly item cache refresh (every 168 hours ≈ Sunday midnight)
    cron.schedule('0 0 * * 0', async () => {
      try {
        await refreshItemCache();
      } catch (err) {
        console.error('[SCRAPPY] Weekly cache refresh failed:', err.message);
      }
    });
  });

  // ---- SLASH COMMAND HANDLER ----
  client.on('interactionCreate', async (interaction) => {
    // Blueprint paginator buttons
    if (interaction.isButton()) {
      const session = bpSessions.get(interaction.user.id);
      if (!session) return;
      if (interaction.customId === 'bp_prev') {
        session.idx =
          (session.idx - 1 + session.names.length) % session.names.length;
      } else if (interaction.customId === 'bp_next') {
        session.idx = (session.idx + 1) % session.names.length;
      } else {
        return;
      }
      const embed = await buildBlueprintPageEmbed(
        session.names[session.idx],
        session.idx,
        session.names.length,
      );
      await interaction.update({
        embeds: [embed],
        components: [buildBlueprintRow(session.idx, session.names.length)],
      });
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const ownerId = process.env.DISCORD_OWNER_ID;
    const isOwner = ownerId
      ? interaction.user.id === ownerId
      : interaction.guild?.ownerId === interaction.user.id;

    try {
      switch (interaction.commandName) {
        case 'set_event_panel': {
          await interaction.deferReply({ ephemeral: true });
          if (!interaction.guild || !interaction.channel) {
            return interaction.followUp({
              content: 'This command must be used in a server channel.',
              ephemeral: true,
            });
          }
          let embed;
          try {
            embed = await buildActiveEventsEmbed();
          } catch (err) {
            return interaction.followUp({
              content: `Failed to fetch events: ${err.message}`,
              ephemeral: true,
            });
          }
          let msg;
          try {
            msg = await interaction.channel.send({ embeds: [embed] });
          } catch {
            return interaction.followUp({
              content: "I don't have permission to post in this channel.",
              ephemeral: true,
            });
          }
          await guildConfigStore.setPanel(
            interaction.guild.id,
            interaction.channel.id,
            msg.id,
          );
          await interaction.followUp({
            content: 'Live events panel configured for this server.',
            ephemeral: true,
          });
          break;
        }

        case 'remove_event_panel': {
          await interaction.deferReply({ ephemeral: true });
          if (!interaction.guild) return;
          const existed = await guildConfigStore.removePanel(
            interaction.guild.id,
          );
          await interaction.followUp({
            content: existed
              ? 'Panel configuration removed.'
              : 'No panel was configured for this server.',
            ephemeral: true,
          });
          break;
        }

        case 'blueprints': {
          await interaction.deferReply({ ephemeral: true });
          if (!Object.keys(bpDb).length) {
            return interaction.followUp({
              content: 'Blueprint data is not loaded.',
              ephemeral: true,
            });
          }
          const names = Object.values(bpDb)
            .map((b) => b.name)
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
          bpSessions.set(interaction.user.id, { names, idx: 0 });
          const embed = await buildBlueprintPageEmbed(names[0], 0, names.length);
          await interaction.followUp({
            embeds: [embed],
            components: [buildBlueprintRow(0, names.length)],
            ephemeral: true,
          });
          break;
        }

        case 'update_events': {
          if (!isOwner) {
            return interaction.reply({
              content: 'Owner only.',
              ephemeral: true,
            });
          }
          await interaction.deferReply({ ephemeral: true });
          await pushStalePanelUpdates(client);
          await interaction.followUp({ content: 'Updated.', ephemeral: true });
          break;
        }

        case 'reload_blueprints': {
          if (!isOwner) {
            return interaction.reply({
              content: 'Owner only.',
              ephemeral: true,
            });
          }
          await interaction.deferReply({ ephemeral: true });
          reloadBlueprints();
          await interaction.followUp({
            content: `Reloaded (${Object.keys(bpDb).length} entries).`,
            ephemeral: true,
          });
          break;
        }

        case 'refresh_cache': {
          if (!isOwner) {
            return interaction.reply({
              content: 'Owner only.',
              ephemeral: true,
            });
          }
          await interaction.deferReply({ ephemeral: true });
          try {
            await refreshItemCache();
            await interaction.followUp({
              content: `Refreshed (${itemsRaw.length} items).`,
              ephemeral: true,
            });
          } catch (err) {
            await interaction.followUp({
              content: `Refresh failed: ${err.message}`,
              ephemeral: true,
            });
          }
          break;
        }

        case 'help': {
          const embed = new EmbedBuilder()
            .setTitle('SHiESTY RAIDERS — Commands')
            .setColor(0x00ff00)
            .addFields(
              {
                name: '/set_event_panel',
                value: 'Create or move the live events panel to this channel.',
                inline: false,
              },
              {
                name: '/remove_event_panel',
                value: "Remove this server's live events panel configuration.",
                inline: false,
              },
              {
                name: '/blueprints',
                value: 'Browse blueprint intel (one per page).',
                inline: false,
              },
              {
                name: 'Prefix',
                value: 'Also available with: A$ (case-insensitive).',
                inline: false,
              },
              {
                name: 'Support',
                value: 'visit https://shiesty.me',
                inline: false,
              },
            )
            .setFooter({
              text: 'Some info is community-maintained; verify in-game',
            });
          await interaction.reply({ embeds: [embed], ephemeral: true });
          break;
        }

        default: {
          await handleInteraction(interaction);
          break;
        }
      }
    } catch (err) {
      console.error(
        `[SCRAPPY] Slash command error: cmd=${interaction.commandName} user=${interaction.user.id} guild=${interaction.guild?.id}`,
        err,
      );
    }
  });

  // ---- PREFIX COMMAND HANDLER (A$...) ----
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot) return;
    if (!msg.content.startsWith('A$') && !msg.content.startsWith('a$')) return;

    const raw = msg.content.slice(2).trim();
    const [cmd] = raw.toLowerCase().split(/\s+/);
    const ownerId = process.env.DISCORD_OWNER_ID;
    const isOwner = ownerId
      ? msg.author.id === ownerId
      : msg.guild?.ownerId === msg.author.id;

    try {
      switch (cmd) {
        case 'set_event_panel': {
          if (!msg.guild || !msg.channel) return;
          const member = msg.guild.members.cache.get(msg.author.id);
          if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) return;
          const embed = await buildActiveEventsEmbed();
          const sent = await msg.channel.send({ embeds: [embed] });
          await guildConfigStore.setPanel(
            msg.guild.id,
            msg.channel.id,
            sent.id,
          );
          await msg.reply({
            content: 'Live events panel configured for this server.',
          });
          break;
        }

        case 'remove_event_panel': {
          if (!msg.guild) return;
          const member = msg.guild.members.cache.get(msg.author.id);
          if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) return;
          const existed = await guildConfigStore.removePanel(msg.guild.id);
          await msg.reply({
            content: existed
              ? 'Panel configuration removed.'
              : 'No panel was configured for this server.',
          });
          break;
        }

        case 'blueprints': {
          if (!Object.keys(bpDb).length) {
            return msg.reply('Blueprint data is not loaded.');
          }
          const names = Object.values(bpDb)
            .map((b) => b.name)
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
          bpSessions.set(msg.author.id, { names, idx: 0 });
          const embed = await buildBlueprintPageEmbed(names[0], 0, names.length);
          await msg.reply({
            embeds: [embed],
            components: [buildBlueprintRow(0, names.length)],
          });
          break;
        }

        case 'update_events': {
          if (!isOwner) return;
          await pushStalePanelUpdates(client);
          await msg.reply('Updated.');
          break;
        }

        case 'reload_blueprints': {
          if (!isOwner) return;
          reloadBlueprints();
          await msg.reply(`Reloaded (${Object.keys(bpDb).length} entries).`);
          break;
        }

        case 'refresh_cache': {
          if (!isOwner) return;
          await refreshItemCache();
          await msg.reply(`Refreshed (${itemsRaw.length} items).`);
          break;
        }

        case 'help': {
          const embed = new EmbedBuilder()
            .setTitle('SHiESTY RAIDERS — Commands')
            .setColor(0x00ff00)
            .addFields(
              {
                name: 'A$set_event_panel',
                value: 'Create or move the live events panel to this channel.',
                inline: false,
              },
              {
                name: 'A$remove_event_panel',
                value: "Remove this server's live events panel configuration.",
                inline: false,
              },
              {
                name: 'A$blueprints',
                value: 'Browse blueprint intel (one per page).',
                inline: false,
              },
              {
                name: 'Support',
                value: 'Patreon: https://shiesty.me',
                inline: false,
              },
            )
            .setFooter({
              text: 'Some info is community-maintained; verify in-game',
            });
          await msg.reply({ embeds: [embed] });
          break;
        }
      }
    } catch (err) {
      console.error(
        `[SHiESTY]RAIERS Prefix command error: cmd=${cmd} author=${msg.author.id} guild=${msg.guild?.id}`,
        err,
      );
    }
  });

  await client.login(token);
  return client;
}
