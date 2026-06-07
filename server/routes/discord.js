import express from 'express';
import { User } from '../models/User.js';
import { MarketplaceListing } from '../models/MarketplaceListing.js';
import { BlueprintFind } from '../models/BlueprintFind.js';
import { DiscordBot } from '../services/discordBot.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { getBlueprintIntel } from '../services/blueprintIntel.js';

const router = express.Router();

router.use(requireAuth);

// POST /api/discord/webhook — Save user's Discord webhook URL
router.post('/webhook', async (req, res) => {
  try {
    const { webhookUrl } = req.body;

    if (
      !webhookUrl ||
      !webhookUrl.startsWith('https://discord.com/api/webhooks/')
    ) {
      return res
        .status(400)
        .json({ error: 'Valid Discord webhook URL required' });
    }

    // Test the webhook
    const testPayload = {
      content:
        '🔌 SHiESTY webhook connected! You will now receive notifications here.',
    };
    const testOk = await DiscordBot.sendWebhook(webhookUrl, testPayload);

    if (!testOk) {
      return res
        .status(400)
        .json({ error: 'Webhook test failed. Check your URL.' });
    }

    const user = await User.findOneAndUpdate(
      { id: req.user.id },
      { discordWebhookUrl: webhookUrl },
      { returnDocument: 'after' },
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ status: 'connected', webhookUrl });
  } catch (err) {
    console.error('[Discord] Webhook save error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/discord/webhook — Remove webhook
router.delete('/webhook', async (req, res) => {
  try {
    await User.findOneAndUpdate(
      { id: req.user.id },
      { discordWebhookUrl: null },
    );

    res.json({ status: 'disconnected' });
  } catch (err) {
    console.error('[Discord] Webhook delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discord/webhook/status — Check webhook status
router.get('/webhook/status', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).select(
      'discordWebhookUrl',
    );
    res.json({ connected: !!user?.discordWebhookUrl });
  } catch (err) {
    console.error('[Discord] Webhook status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/discord/notify/store — Send storefront notification
router.post('/notify/store', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user?.discordWebhookUrl) {
      return res.status(400).json({ error: 'No webhook configured' });
    }

    const listings = await MarketplaceListing.find({ sellerId: req.user.id });
    const payload = DiscordBot.buildStorefrontEmbed(user, listings);

    const sent = await DiscordBot.sendWebhook(user.discordWebhookUrl, payload);
    res.json({ sent });
  } catch (err) {
    console.error('[Discord] Store notify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/discord/notify/raid — Send raid notification
router.post('/notify/raid', async (req, res) => {
  try {
    const { roundData } = req.body;
    const user = await User.findOne({ id: req.user.id });

    if (!user?.discordWebhookUrl) {
      return res.status(400).json({ error: 'No webhook configured' });
    }

    const payload = DiscordBot.buildRaidEmbed(roundData, user);
    const sent = await DiscordBot.sendWebhook(user.discordWebhookUrl, payload);

    res.json({ sent });
  } catch (err) {
    console.error('[Discord] Raid notify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/discord/notify/progress — Send progress/level up notification
router.post('/notify/progress', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user?.discordWebhookUrl) {
      return res.status(400).json({ error: 'No webhook configured' });
    }

    const payload = {
      embeds: [
        {
          title: '📊 Progress Update',
          description: `**${user.username}** current status:`,
          color: 0x3f51b5,
          fields: [
            { name: '🎯 Level', value: String(user.level), inline: true },
            {
              name: '✨ XP',
              value: `${user.xp} / ${user.xpForNextLevel()}`,
              inline: true,
            },
            { name: '🏆 Total XP', value: String(user.totalXp), inline: true },
            { name: '💰 Credits', value: String(user.credits), inline: true },
            { name: '🪙 Tokens', value: String(user.tokens), inline: true },
            {
              name: '📦 Stash Value',
              value: `${user.stashValue} credits`,
              inline: true,
            },
            { name: '☠️ Raids', value: String(user.totalRaids), inline: true },
            {
              name: '✅ Extractions',
              value: String(user.successfulExtractions),
              inline: true,
            },
            { name: '💀 Kills', value: String(user.totalKills), inline: true },
          ],
          footer: { text: 'SHiESTY Progress Tracker' },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const sent = await DiscordBot.sendWebhook(user.discordWebhookUrl, payload);
    res.json({ sent });
  } catch (err) {
    console.error('[Discord] Progress notify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/discord/notify/blueprint — Post blueprint offer or want to Discord
router.post('/notify/blueprint', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user?.discordWebhookUrl) {
      return res
        .status(400)
        .json({ error: 'No webhook configured. Add one in Settings.' });
    }

    const { type, itemName, rarity, imageUrl, price, note } = req.body;
    if (!type || !itemName) {
      return res.status(400).json({ error: 'type and itemName are required' });
    }

    const isOffer = type === 'offer';
    const rarityColors = {
      Legendary: 0xffcc00,
      Epic: 0xc43198,
      Rare: 0x01abf4,
      Uncommon: 0x25bb55,
      Common: 0x6c6b6a,
    };
    const color = rarityColors[rarity] || 0x25bb55;
    const emoji = isOffer ? '📦' : '🔍';
    const title = isOffer
      ? `${emoji} Blueprint For Sale: ${itemName}`
      : `${emoji} WTB Blueprint: ${itemName}`;

    const csvIntel =
      getBlueprintIntel(req.body.itemId) || getBlueprintIntel(itemName);

    const fields = [
      { name: 'rarity', value: rarity || 'Unknown', inline: true },
      { name: 'Type', value: isOffer ? 'Offering' : 'Wanted', inline: true },
    ];
    if (price)
      fields.push({
        name: isOffer ? 'Ask Price' : 'Offer Price',
        value: `$${Number(price).toLocaleString()}`,
        inline: true,
      });
    if (note) fields.push({ name: 'Note', value: note, inline: false });
    if (csvIntel?.containers || csvIntel?.bestRoute) {
      fields.push({
        name: 'Blueprint Intel',
        value: [csvIntel.containers, csvIntel.bestRoute]
          .filter(Boolean)
          .join('\n'),
        inline: false,
      });
    }
    fields.push({
      name: 'Posted By',
      value: user.username || req.user.id,
      inline: true,
    });

    const embed = {
      title,
      color,
      fields,
      footer: { text: 'SHiESTY Blueprint Board' },
      timestamp: new Date().toISOString(),
    };
    if (imageUrl) embed.thumbnail = { url: imageUrl };

    const payload = { embeds: [embed] };
    const sent = await DiscordBot.sendWebhook(user.discordWebhookUrl, payload);
    res.json({ sent });
  } catch (err) {
    console.error('[Discord] Blueprint notify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/discord/notify/blueprint-find — Post blueprint find location to Discord
router.post('/notify/blueprint-find', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user?.discordWebhookUrl) {
      return res
        .status(400)
        .json({ error: 'No webhook configured. Add one in Settings.' });
    }

    const {
      blueprintName,
      rarity,
      imageUrl,
      map,
      condition,
      container,
      location,
      locked,
      notes,
    } = req.body;
    if (!blueprintName) {
      return res.status(400).json({ error: 'blueprintName is required' });
    }

    const rarityColors = {
      Legendary: 0xffcc00,
      Epic: 0xc43198,
      Rare: 0x01abf4,
      Uncommon: 0x25bb55,
      Common: 0x6c6b6a,
    };
    const color = rarityColors[rarity] || 0x01abf4;

    const csvIntel = getBlueprintIntel(blueprintName);

    const fields = [
      { name: 'Blueprint', value: blueprintName, inline: true },
      { name: 'rarity', value: rarity || 'Unknown', inline: true },
    ];
    const resolvedMap = map || csvIntel?.map;
    const resolvedCondition = condition || csvIntel?.condition;
    const resolvedContainer = container || csvIntel?.containers;
    const resolvedLocation = location || csvIntel?.locationNotes;
    const resolvedNotes = notes || csvIntel?.notes;

    if (resolvedMap)
      fields.push({ name: 'Map', value: resolvedMap, inline: true });
    if (resolvedCondition)
      fields.push({
        name: 'Condition',
        value: resolvedCondition,
        inline: true,
      });
    if (resolvedContainer)
      fields.push({
        name: 'Container',
        value: resolvedContainer,
        inline: true,
      });
    if (locked)
      fields.push({
        name: 'Access',
        value: '🔒 Locked / Keyed area',
        inline: true,
      });
    if (resolvedLocation)
      fields.push({ name: 'Location', value: resolvedLocation, inline: false });
    if (resolvedNotes)
      fields.push({ name: 'Notes', value: resolvedNotes, inline: false });
    fields.push({
      name: 'Reported By',
      value: user.username || req.user.id,
      inline: true,
    });

    const embed = {
      title: `📍 Blueprint Found: ${blueprintName}`,
      color,
      fields,
      footer: { text: 'SHiESTY Blueprint Tracker' },
      timestamp: new Date().toISOString(),
    };
    if (imageUrl) embed.thumbnail = { url: imageUrl };

    const payload = { embeds: [embed] };
    const sent = await DiscordBot.sendWebhook(user.discordWebhookUrl, payload);
    const find = await BlueprintFind.create({
      userId: req.user.id,
      userName: user.displayName || user.username || req.user.id,
      blueprintId:
        req.body.blueprintId || csvIntel?.blueprintId || blueprintName,
      blueprintName,
      blueprintImageUrl: imageUrl || '',
      rarity: rarity || 'Common',
      map: resolvedMap || '',
      condition: resolvedCondition || 'Any',
      container: resolvedContainer || '',
      location: resolvedLocation || '',
      locked: Boolean(locked),
      notes: resolvedNotes || '',
      source: 'discord',
    });
    res.json({ sent, find });
  } catch (err) {
    console.error('[Discord] Blueprint find notify error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
