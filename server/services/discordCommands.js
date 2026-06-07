import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { User } from '../models/User.js';
import { MarketplaceListing } from '../models/MarketplaceListing.js';
import { SyncData } from '../models/SyncData.js';
import { searchAtlasBlueprintSummaries } from './atlasBlueprints.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your SHiESTY profile')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('User to look up').setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the SHiESTY leaderboard')
    .addStringOption((opt) =>
      opt
        .setName('type')
        .setDescription('Leaderboard type')
        .setRequired(false)
        .addChoices(
          { name: 'XP', value: 'xp' },
          { name: 'Credits', value: 'credits' },
          { name: 'Kills', value: 'kills' },
          { name: 'Raids', value: 'raids' },
        ),
    ),

  new SlashCommandBuilder()
    .setName('stash')
    .setDescription('View your stash value and items')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('User to look up').setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName('marketplace')
    .setDescription('Browse active marketplace listings')
    .addStringOption((opt) =>
      opt.setName('search').setDescription('Search term').setRequired(false),
    )
    .addStringOption((opt) =>
      opt
        .setName('rarity')
        .setDescription('Filter by rarity')
        .setRequired(false)
        .addChoices(
          { name: 'Common', value: 'common' },
          { name: 'Uncommon', value: 'uncommon' },
          { name: 'Rare', value: 'rare' },
          { name: 'Epic', value: 'epic' },
          { name: 'Legendary', value: 'legendary' },
        ),
    ),

  new SlashCommandBuilder()
    .setName('wanted')
    .setDescription('Manage your Most Wanted items')
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('View your wanted items'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add an item to your wanted list')
        .addStringOption((opt) =>
          opt.setName('item').setDescription('Item name').setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName('reason')
            .setDescription('Why you want it')
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove an item from your wanted list')
        .addStringOption((opt) =>
          opt
            .setName('item')
            .setDescription('Item name or ID')
            .setRequired(true),
        ),
    ),

  new SlashCommandBuilder()
    .setName('alerts')
    .setDescription('Configure marketplace alerts')
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Check your alert status'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription('Toggle wanted item alerts')
        .addBooleanOption((opt) =>
          opt
            .setName('enabled')
            .setDescription('Enable or disable')
            .setRequired(true),
        ),
    ),

  new SlashCommandBuilder()
    .setName('xp')
    .setDescription('View your XP and leveling progress')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('User to look up').setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName('raid-history')
    .setDescription('View your Raid History')
    .addIntegerOption((opt) =>
      opt
        .setName('limit')
        .setDescription('Number of entries')
        .setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Discord account to SHiESTY.me'),

  new SlashCommandBuilder()
    .setName('raids')
    .setDescription('View recent raids for a player')
    .addUserOption((opt) =>
      opt
        .setName('user')
        .setDescription('Discord user (defaults to you)')
        .setRequired(false),
    )
    .addIntegerOption((opt) =>
      opt
        .setName('count')
        .setDescription('Number of raids to show (1-10, default 5)')
        .setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View full raid stats for a player')
    .addUserOption((opt) =>
      opt
        .setName('user')
        .setDescription('Discord user (defaults to you)')
        .setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName('blueprint')
    .setDescription('Look up a blueprint from the Raider Hub database')
    .addStringOption((opt) =>
      opt
        .setName('name')
        .setDescription('Blueprint name to search for')
        .setRequired(true),
    ),
];

export async function registerCommands(clientId, token, guildId) {
  const rest = new REST({ version: '10' }).setToken(token);
  try {
    const body = commands.map((c) => c.toJSON());
    if (guildId && guildId.length > 5) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body,
      });
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body });
    }
  } catch (err) {
    console.error(
      `[Discord] Command registration failed: ${err.message}. Check if DISCORD_GUILD_ID is correct and Bot has 'applications.commands' scope.`,
    );
  }
}

export async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, user } = interaction;

  try {
    switch (commandName) {
      case 'profile': {
        const target = options.getUser('user') || user;
        const dbUser = await User.findOne({ id: target.id });
        if (!dbUser) {
          await interaction.reply({
            content:
              '❌ No SHiESTY profile found. Link your account first with `/link`.',
            ephemeral: true,
          });
          return;
        }
        await interaction.reply({
          embeds: [
            {
              title: `👤 ${dbUser.username}'s Profile`,
              color: 0x00bcd4,
              thumbnail: dbUser.avatar
                ? {
                    url: `https://cdn.discordapp.com/avatars/${dbUser.id}/${dbUser.avatar}.png`,
                  }
                : undefined,
              fields: [
                {
                  name: '🎯 Level',
                  value: String(dbUser.level || 1),
                  inline: true,
                },
                { name: '✨ XP', value: String(dbUser.xp || 0), inline: true },
                {
                  name: '💰 Credits',
                  value: String(dbUser.credits || 0),
                  inline: true,
                },
                {
                  name: '🪙 Tokens',
                  value: String(dbUser.tokens || 0),
                  inline: true,
                },
                {
                  name: '☠️ Raids',
                  value: String(dbUser.totalRaids || 0),
                  inline: true,
                },
                {
                  name: '✅ Extractions',
                  value: String(dbUser.successfulExtractions || 0),
                  inline: true,
                },
                {
                  name: '💀 Kills',
                  value: String(dbUser.totalKills || 0),
                  inline: true,
                },
                {
                  name: '📦 Stash Value',
                  value: `${dbUser.stashValue || 0} credits`,
                  inline: true,
                },
              ],
              footer: { text: 'SHiESTY Profile' },
              timestamp: new Date().toISOString(),
            },
          ],
        });
        break;
      }

      case 'leaderboard': {
        const type = options.getString('type') || 'xp';
        const sortField =
          type === 'credits'
            ? 'credits'
            : type === 'kills'
              ? 'totalKills'
              : type === 'raids'
                ? 'totalRaids'
                : 'totalXp';
        const top = await User.find()
          .sort({ [sortField]: -1 })
          .limit(10);
        const medals = [
          '🥇',
          '🥈',
          '🥉',
          '4️⃣',
          '5️⃣',
          '6️⃣',
          '7️⃣',
          '8️⃣',
          '9️⃣',
          '🔟',
        ];
        const lines = top.map(
          (u, i) => `${medals[i]} **${u.username}** — ${u[sortField]} ${type}`,
        );
        await interaction.reply({
          embeds: [
            {
              title: `🏆 SHiESTY Leaderboard — ${type.toUpperCase()}`,
              description: lines.join('\n'),
              color: 0xffd700,
              footer: { text: 'Top 10 Players' },
              timestamp: new Date().toISOString(),
            },
          ],
        });
        break;
      }

      case 'stash': {
        const target = options.getUser('user') || user;
        const dbUser = await User.findOne({ id: target.id });
        if (!dbUser) {
          await interaction.reply({
            content: '❌ No profile found.',
            ephemeral: true,
          });
          return;
        }
        // Stash items live in SyncData, not on the User document.
        const stashSync = await SyncData.findOne({
          userId: target.id,
          source: 'arctracker_stash',
        })
          .sort({ syncedAt: -1 })
          .lean();
        const stashItems = Array.isArray(stashSync?.payload?.items)
          ? stashSync.payload.items
          : [];
        await interaction.reply({
          embeds: [
            {
              title: `📦 ${dbUser.username}'s Stash`,
              description: `Total Value: **${dbUser.stashValue || 0} credits**`,
              color: 0x4caf50,
              fields: stashItems.slice(0, 25).map((item) => ({
                name: item.name || item.itemName || 'Unknown Item',
                value: `${item.quantity || item.amount || 1}x • ${item.value || item.price || 0} credits`,
                inline: true,
              })),
              footer: {
                text: `Level ${dbUser.level} • ${stashItems.length} items`,
              },
              timestamp: new Date().toISOString(),
            },
          ],
        });
        break;
      }

      case 'marketplace': {
        const search = options.getString('search');
        const rarity = options.getString('rarity');
        let query = { status: 'active' };
        if (rarity) query.itemrarity = rarity;
        if (search) {
          query.itemName = { $regex: search, $options: 'i' };
        }
        const listings = await MarketplaceListing.find(query)
          .sort({ createdAt: -1 })
          .limit(10);
        if (!listings.length) {
          await interaction.reply({
            content: '🔍 No active listings found.',
            ephemeral: true,
          });
          return;
        }
        await interaction.reply({
          embeds: listings.map((l) => ({
            title: `${l.itemName} — ${l.price} ${l.currency}`,
            description: l.description || 'No description',
            color: rarityColor(l.itemrarity),
            fields: [
              {
                name: '⭐ rarity',
                value: (l.itemrarity || 'common').toUpperCase(),
                inline: true,
              },
              {
                name: '📦 Quantity',
                value: String(l.itemQuantity || 1),
                inline: true,
              },
              {
                name: '👤 Seller',
                value: l.sellerName || 'Unknown',
                inline: true,
              },
            ],
            footer: { text: `ID: ${l._id}` },
            timestamp: l.createdAt?.toISOString(),
          })),
        });
        break;
      }

      case 'wanted': {
        const sub = options.getSubcommand();
        const dbUser = await User.findOne({ id: user.id });
        if (!dbUser) {
          await interaction.reply({
            content: '❌ No profile found. Use `/link` first.',
            ephemeral: true,
          });
          return;
        }

        if (sub === 'list') {
          const wanted = dbUser.mostWanted || [];
          if (!wanted.length) {
            await interaction.reply({
              content:
                '📭 Your wanted list is empty. Use `/wanted add` to track items.',
              ephemeral: true,
            });
            return;
          }
          await interaction.reply({
            embeds: [
              {
                title: `🎯 ${dbUser.username}'s Most Wanted`,
                description: wanted
                  .map(
                    (w, i) =>
                      `${i + 1}. **${w.itemName}**${w.reason ? ` — *${w.reason}*` : ''}`,
                  )
                  .join('\n'),
                color: 0xff10f0,
                footer: { text: `${wanted.length} items tracked` },
                timestamp: new Date().toISOString(),
              },
            ],
          });
        } else if (sub === 'add') {
          const itemName = options.getString('item');
          const reason = options.getString('reason') || '';
          dbUser.addWantedItem(
            itemName.toLowerCase().replace(/\s+/g, '_'),
            itemName,
            reason,
          );
          await dbUser.save();
          await interaction.reply({
            embeds: [
              {
                title: '✅ Item Added to Wanted List',
                description: `**${itemName}** has been added to your Most Wanted list.`,
                color: 0x39ff14,
                fields: reason
                  ? [{ name: '📝 Reason', value: reason, inline: false }]
                  : [],
                footer: {
                  text: 'You will be alerted when this item appears on the marketplace.',
                },
                timestamp: new Date().toISOString(),
              },
            ],
          });
        } else if (sub === 'remove') {
          const itemName = options.getString('item');
          const itemId = itemName.toLowerCase().replace(/\s+/g, '_');
          dbUser.removeWantedItem(itemId);
          await dbUser.save();
          await interaction.reply({
            embeds: [
              {
                title: '🗑️ Item Removed',
                description: `**${itemName}** has been removed from your wanted list.`,
                color: 0xff073a,
                timestamp: new Date().toISOString(),
              },
            ],
          });
        }
        break;
      }

      case 'alerts': {
        const sub = options.getSubcommand();
        const dbUser = await User.findOne({ id: user.id });
        if (!dbUser) {
          await interaction.reply({
            content: '❌ No profile found. Use `/link` first.',
            ephemeral: true,
          });
          return;
        }

        if (sub === 'status') {
          const hasWebhook = !!dbUser.discordWebhookUrl;
          const wantedCount = (dbUser.mostWanted || []).length;
          await interaction.reply({
            embeds: [
              {
                title: '🔔 Alert Status',
                color: hasWebhook ? 0x39ff14 : 0xffb800,
                fields: [
                  {
                    name: 'Webhook Configured',
                    value: hasWebhook ? '✅ Yes' : '❌ No',
                    inline: true,
                  },
                  {
                    name: 'Wanted Items',
                    value: String(wantedCount),
                    inline: true,
                  },
                  {
                    name: 'Alert Type',
                    value: 'Marketplace matches for wanted items',
                    inline: false,
                  },
                ],
                footer: {
                  text: hasWebhook
                    ? 'Alerts are active!'
                    : 'Set a webhook in your SHiESTY profile to enable alerts.',
                },
                timestamp: new Date().toISOString(),
              },
            ],
          });
        } else if (sub === 'toggle') {
          const enabled = options.getBoolean('enabled');
          await interaction.reply({
            embeds: [
              {
                title: enabled ? '🔔 Alerts Enabled' : '🔕 Alerts Disabled',
                description: enabled
                  ? 'You will now receive Discord notifications when items on your wanted list are listed.'
                  : 'Marketplace alerts are now disabled.',
                color: enabled ? 0x39ff14 : 0x71717a,
                timestamp: new Date().toISOString(),
              },
            ],
          });
        }
        break;
      }

      case 'xp': {
        const target = options.getUser('user') || user;
        const dbUser = await User.findOne({ id: target.id });
        if (!dbUser) {
          await interaction.reply({
            content: '❌ No profile found.',
            ephemeral: true,
          });
          return;
        }
        const needed = dbUser.xpForNextLevel
          ? dbUser.xpForNextLevel()
          : dbUser.level * 1000;
        const percent = dbUser.xpProgressPercent
          ? dbUser.xpProgressPercent()
          : 0;
        await interaction.reply({
          embeds: [
            {
              title: `📈 ${dbUser.username}'s XP Progress`,
              description: `Level **${dbUser.level}** • **${dbUser.xp}** / **${needed}** XP (${percent}%)`,
              color: 0x39ff14,
              fields: [
                {
                  name: '🏆 Total XP',
                  value: String(dbUser.totalXp || 0),
                  inline: true,
                },
                {
                  name: '📊 XP to Next',
                  value: String(needed - dbUser.xp),
                  inline: true,
                },
                { name: '🎯 Progress', value: `${percent}%`, inline: true },
              ],
              footer: { text: 'SHiESTY Progress Tracker' },
              timestamp: new Date().toISOString(),
            },
          ],
        });
        break;
      }

      case 'raid-history': {
        const dbUser = await User.findOne({ id: user.id });
        if (!dbUser) {
          await interaction.reply({
            content: '❌ No profile found.',
            ephemeral: true,
          });
          return;
        }
        const limit = options.getInteger('limit') || 5;
        const entries = (dbUser.raidHistory || [])
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, limit);

        if (!entries.length) {
          await interaction.reply({
            content:
              '📭 Your raid history is empty. Entries are added automatically as you raid and trade.',
            ephemeral: true,
          });
          return;
        }

        await interaction.reply({
          embeds: entries.map((entry) => ({
            title: `📖 ${entry.title}`,
            description:
              entry.content.length > 200
                ? entry.content.substring(0, 200) + '...'
                : entry.content,
            color: categoryColor(entry.category),
            fields: [
              {
                name: '📂 Category',
                value: (entry.category || 'raid').toUpperCase(),
                inline: true,
              },
            ],
            footer: {
              text: `Raid History • ${new Date(entry.createdAt).toLocaleDateString()}`,
            },
            timestamp: entry.createdAt,
          })),
        });
        break;
      }

      case 'link': {
        const linkUrl = `${process.env.APP_URL || 'https://shiesty.me'}/api/auth/discord`;
        await interaction.reply({
          content: `🔗 **Link your SHiESTY account**\nClick here to connect: ${linkUrl}\n\nThis will sync your Discord profile with SHiESTY.me.`,
          ephemeral: true,
        });
        break;
      }

      case 'raids': {
        await interaction.deferReply({ ephemeral: true });
        const target = options.getUser('user') || user;
        const count = Math.min(
          Math.max(options.getInteger('count') || 5, 1),
          10,
        );

        const dbUser = await User.findOne({ id: target.id });
        if (!dbUser) {
          await interaction.editReply({
            content: '❌ No SHiESTY profile found. Use `/link` first.',
          });
          return;
        }

        // Pull rounds from SyncData (most recent sync payload)
        const syncDoc = await SyncData.findOne({ userId: target.id }).sort({
          syncedAt: -1,
        });
        const payload = syncDoc?.payload || {};
        const rawRounds = Array.isArray(payload.rounds)
          ? payload.rounds
          : Array.isArray(payload)
            ? payload
            : [];

        const recent = rawRounds
          .slice()
          .sort(
            (a, b) =>
              new Date(b.roundEndedAt || b.syncedAt || b.timestamp || 0) -
              new Date(a.roundEndedAt || a.syncedAt || a.timestamp || 0),
          )
          .slice(0, count);

        if (!recent.length) {
          await interaction.editReply({
            content:
              '📭 No raid history found for this player yet — try syncing on the site first.',
          });
          return;
        }

        const fmt$ = (n) => {
          n = Number(n) || 0;
          if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
          return `$${n}`;
        };
        const fmtDur = (s) => {
          s = Number(s) || 0;
          if (!s) return '—';
          const m = Math.floor(s / 60),
            sec = Math.floor(s % 60);
          return `${m}m ${sec}s`;
        };

        const fields = recent.map((r, i) => {
          const status = (r.outcome || r.status || '').toLowerCase();
          const isEx = status === 'extracted' || status.includes('extract');
          const map = (r.mapName || r.map_name || r.map || 'Unknown').replace(
            /_/g,
            ' ',
          );
          const profit = Number(r.netValue ?? r.netProfit ?? 0);
          const kills =
            (Number(r.arcKills) || 0) + (Number(r.playerKills) || 0);
          const dur = r.durationMs
            ? Math.round(r.durationMs / 1000)
            : Number(r.duration ?? r.durationSeconds ?? 0);
          const xp = Number(r.score ?? r.xp ?? 0);
          const ts = r.roundEndedAt || r.syncedAt || r.timestamp;
          const when = ts
            ? `<t:${Math.floor(new Date(ts).getTime() / 1000)}:R>`
            : '—';
          return {
            name: `${isEx ? '✅' : '☠️'} Raid ${i + 1} — ${map}`,
            value: [
              `**Result:** ${isEx ? 'EXTRACTED' : 'DIED'}`,
              `**Net Value:** ${profit >= 0 ? '+' : ''}${fmt$(profit)}`,
              `**Kills:** ${kills} • **XP:** ${xp.toLocaleString()}`,
              `**Duration:** ${fmtDur(dur)} • ${when}`,
            ].join('\n'),
            inline: false,
          };
        });

        await interaction.editReply({
          embeds: [
            {
              title: `🗡️ ${dbUser.username}'s Recent Raids`,
              color: 0xf1aa1c,
              fields,
              footer: {
                text: `Last ${recent.length} raids • SHiESTY Raider Hub`,
              },
              timestamp: new Date().toISOString(),
            },
          ],
        });
        break;
      }

      case 'stats': {
        await interaction.deferReply({ ephemeral: true });
        const target = options.getUser('user') || user;

        const dbUser = await User.findOne({ id: target.id });
        if (!dbUser) {
          await interaction.editReply({
            content: '❌ No SHiESTY profile found. Use `/link` first.',
          });
          return;
        }

        const syncDoc = await SyncData.findOne({ userId: target.id }).sort({
          syncedAt: -1,
        });
        const payload = syncDoc?.payload || {};
        const rawRounds = Array.isArray(payload.rounds)
          ? payload.rounds
          : Array.isArray(payload)
            ? payload
            : [];

        const total = rawRounds.length;
        const extracted = rawRounds.filter((r) => {
          const s = (r.outcome || r.status || '').toLowerCase();
          return s === 'extracted' || s.includes('extract');
        }).length;
        const deaths = total - extracted;
        const arcKills = rawRounds.reduce(
          (s, r) => s + (Number(r.arcKills) || 0),
          0,
        );
        const pvpKills = rawRounds.reduce(
          (s, r) => s + (Number(r.playerKills) || 0),
          0,
        );
        const totalKills = arcKills + pvpKills;
        const netProfit = rawRounds.reduce(
          (s, r) => s + Number(r.netValue ?? r.netProfit ?? 0),
          0,
        );
        const totalXp = rawRounds.reduce(
          (s, r) => s + Number(r.score ?? r.xp ?? 0),
          0,
        );
        const totalDmg = rawRounds.reduce(
          (s, r) => s + Number(r.damage ?? r.damageDealt ?? 0),
          0,
        );
        const totalDur = rawRounds.reduce((s, r) => {
          const d = r.durationMs
            ? Number(r.durationMs) / 1000
            : Number(r.duration ?? r.durationSeconds ?? 0);
          return s + d;
        }, 0);
        const extractRate =
          total > 0 ? ((extracted / total) * 100).toFixed(1) : '0';
        const kd =
          deaths > 0
            ? (pvpKills / deaths).toFixed(2)
            : pvpKills > 0
              ? '∞'
              : '0';
        const avgProfit = total > 0 ? Math.round(netProfit / total) : 0;
        const hours = (totalDur / 3600).toFixed(1);
        const fmt$ = (n) => {
          n = Number(n) || 0;
          if (Math.abs(n) >= 1_000_000)
            return `$${(n / 1_000_000).toFixed(2)}M`;
          if (Math.abs(n) >= 1000) return `$${Math.round(n / 1000)}K`;
          return `$${n}`;
        };

        await interaction.editReply({
          embeds: [
            {
              title: `📊 ${dbUser.username}'s Raid Stats`,
              color: 0x01abf4,
              thumbnail: dbUser.avatar
                ? {
                    url: `https://cdn.discordapp.com/avatars/${dbUser.id}/${dbUser.avatar}.png`,
                  }
                : undefined,
              fields: [
                { name: '🗡️ Total Raids', value: String(total), inline: true },
                {
                  name: '✅ Extract Rate',
                  value: `${extractRate}%`,
                  inline: true,
                },
                { name: '☠️ Deaths', value: String(deaths), inline: true },
                { name: '🎯 PvP K/D', value: kd, inline: true },
                {
                  name: '💀 Total Kills',
                  value: `${totalKills.toLocaleString()} (${pvpKills} PvP / ${arcKills} ARC)`,
                  inline: false,
                },
                {
                  name: '💰 Net Value',
                  value: `${fmt$(netProfit)} (avg ${fmt$(avgProfit)}/raid)`,
                  inline: false,
                },
                {
                  name: '⚡ Total XP',
                  value: totalXp.toLocaleString(),
                  inline: true,
                },
                {
                  name: '🔫 Damage Dealt',
                  value: totalDmg.toLocaleString(),
                  inline: true,
                },
                { name: '⏱️ Time Topside', value: `${hours}h`, inline: true },
              ],
              footer: {
                text: `Hub LV.${dbUser.level} • ${dbUser.xp?.toLocaleString() || 0} XP • SHiESTY Raider Hub`,
              },
              timestamp: new Date().toISOString(),
            },
          ],
        });
        break;
      }

      case 'blueprint': {
        await interaction.deferReply({ ephemeral: true });
        const query = (options.getString('name') || '').trim().toLowerCase();
        if (!query) {
          await interaction.editReply({
            content: '❌ Please provide a blueprint name.',
          });
          return;
        }

        // Pull blueprints from all users who have them in their SyncData
        // Since blueprints are static game data, pull from the CSV via the MetaForge catalog
        let catalogResults = [];
        let atlasSummaries = [];
        try {
          const { MetaForgeCatalog } = await import('./metaforgeCatalog.js');
          const blueprints = await MetaForgeCatalog.getBlueprints();
          const all = Array.isArray(blueprints?.data)
            ? blueprints.data
            : Array.isArray(blueprints)
              ? blueprints
              : [];
          catalogResults = all
            .filter((bp) => {
              const name = (bp.name || bp.blueprintName || '').toLowerCase();
              return name.includes(query);
            })
            .slice(0, 5);
        } catch (_) {
          /* catalog unavailable */
        }

        try {
          atlasSummaries = await searchAtlasBlueprintSummaries(query, 3);
        } catch (_) {
          /* atlas unavailable */
        }

        if (!catalogResults.length && !atlasSummaries.length) {
          await interaction.editReply({
            content: `🔍 No blueprints found matching **${query}**.\nCheck the full list at ${process.env.APP_URL || 'https://shiesty.me'}/blueprints`,
          });
          return;
        }

        const fields = catalogResults.map((bp) => {
          const name = bp.name || bp.blueprintName || 'Unknown';
          const map = bp.map || bp.location || '—';
          const rarity = bp.rarity || '—';
          const craft = bp.craftingMaterials || bp.materials || '—';
          const notes = bp.notes || bp.locationNotes || '';
          return {
            name: `📋 ${name}`,
            value: [
              `**Map:** ${map}`,
              `**rarity:** ${rarity}`,
              craft !== '—' ? `**Crafting:** ${craft}` : null,
              notes ? `**Notes:** ${notes}` : null,
            ]
              .filter(Boolean)
              .join('\n'),
            inline: false,
          };
        });

        fields.unshift(
          ...atlasSummaries.map((atlasSummary) => ({
            name: `🧭 Atlas: ${atlasSummary.blueprint}`,
            value: [
              `**Reports:** ${atlasSummary.reports}`,
              `**Best map:** ${atlasSummary.bestMap}`,
              `**Best time:** ${atlasSummary.bestCondition}`,
              atlasSummary.lockedChance == null
                ? null
                : `**Locked chance:** ${
                    Math.round(atlasSummary.lockedChance * 10) / 10
                  }%`,
              atlasSummary.containers.length
                ? `**Top containers:** ${atlasSummary.containers
                    .slice(0, 3)
                    .map((entry) => `${entry.name} (${entry.count})`)
                    .join(', ')}`
                : null,
              `[Open Atlas](${
                process.env.APP_URL || 'https://shiesty.me'
              }/atlas/index.html?bp=${encodeURIComponent(
                atlasSummary.blueprint,
              )})`,
            ]
              .filter(Boolean)
              .join('\n'),
            inline: false,
          })),
        );

        await interaction.editReply({
          embeds: [
            {
              title: `📋 Blueprint Search: "${query}"`,
              color: 0xf1aa1c,
              fields,
              footer: {
                text: `${catalogResults.length} result(s) • SHiESTY Raider Hub`,
              },
              timestamp: new Date().toISOString(),
            },
          ],
        });
        break;
      }
    }
  } catch (err) {
    console.error('[Discord] Command error:', err);
    await interaction
      .reply({ content: '❌ An error occurred.', ephemeral: true })
      .catch(() => {});
  }
}

function rarityColor(rarity) {
  const colors = {
    common: 0x9e9e9e,
    uncommon: 0x4caf50,
    rare: 0x2196f3,
    epic: 0x9c27b0,
    legendary: 0xff9800,
  };
  return colors[rarity] || 0x00bcd4;
}

function categoryColor(category) {
  const colors = {
    raid: 0x39ff14,
    trade: 0xffb800,
    milestone: 0xffd700,
    reflection: 0x00d1ff,
  };
  return colors[category] || 0x71717a;
}
