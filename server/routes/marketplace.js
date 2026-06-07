import express from 'express';
import { MarketplaceListing } from '../models/MarketplaceListing.js';
import { MarketplaceOffer } from '../models/MarketplaceOffer.js';
import { BlueprintFind } from '../models/BlueprintFind.js';
import { User } from '../models/User.js';
import { DiscordBot } from '../services/discordBot.js';
import { pushNotification } from '../models/Notification.js';
import { UserDataAPI } from '../services/userDataApi.js';
import { MarketplacePriceSnapshot } from '../models/MarketplacePriceSnapshot.js';
import { GameCatalog } from '../services/gameCatalog.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { MetaForgeCatalog } from '../services/metaforgeCatalog.js';
import ArdbService from '../services/ardb.js';
import { generateOptimizedListing } from '../services/listingOptimizer.js';
import { resolveItemAssetUrl } from '../utils/assetUrl.js';
import {
  getBlueprintIntel,
  isBlueprintListing,
  listingBlueprintKey,
  normalizeBlueprintKey,
} from '../services/blueprintIntel.js';

// Backfill missing icons on listings using catalog data. Cheap because
// both catalogs have in-memory id->item indexes.
async function backfillIcons(listings) {
  return Promise.all(
    listings.map(async (l) => {
      // Use existing URL if valid, otherwise lookup in catalogs.
      // Prefer MetaForge (full CDN urls), fall back to ArcData.
      let icon = l.itemIconUrl;
      if (!icon || icon === '') {
        const id = l.itemId || l.stashItemRef;
        const mf = MetaForgeCatalog.lookupItem(id);
        if (mf?.icon) {
          icon = mf.icon;
        } else {
          const meta = await GameCatalog.lookupItem(id).catch(() => null);
          icon = resolveItemAssetUrl(
            meta?.imageFilename || meta?.icon || meta?.image,
            id,
          );
        }
      }

      icon = resolveItemAssetUrl(icon, l.itemId || l.stashItemRef);

      return { ...l, itemIconUrl: icon };
    }),
  );
}

// Helper: write a price snapshot row (fire-and-forget, never blocks).
async function snapshot(listing, event) {
  try {
    await MarketplacePriceSnapshot.create({
      itemId: listing.itemId,
      itemName: listing.itemName,
      itemrarity: listing.itemrarity,
      price: listing.price,
      quantity: listing.itemQuantity || 1,
      currency: listing.currency || 'credits',
      event,
      listingId: listing._id,
      sellerId: listing.sellerId,
    });
  } catch (e) {
    console.warn('[Marketplace] snapshot failed:', e.message);
  }
}

async function enrichBlueprintRelations(listings) {
  const blueprintListings = listings.filter(isBlueprintListing);
  if (!blueprintListings.length) return listings;

  const findCounts = {};
  const finds = await BlueprintFind.find({})
    .select('blueprintId blueprintName')
    .limit(5000)
    .lean()
    .catch(() => []);

  finds.forEach((find) => {
    const key = normalizeBlueprintKey(find.blueprintId || find.blueprintName);
    if (key) findCounts[key] = (findCounts[key] || 0) + 1;
  });

  return listings.map((listing) => {
    if (!isBlueprintListing(listing)) return listing;
    const key = listingBlueprintKey(listing);
    const intel =
      getBlueprintIntel(listing.itemStats?.blueprintId) ||
      getBlueprintIntel(listing.itemId) ||
      getBlueprintIntel(listing.itemName);
    const itemStats = {
      ...(listing.itemStats || {}),
      blueprintId:
        listing.itemStats?.blueprintId || listing.blueprintId || listing.itemId,
      dropInfo: listing.itemStats?.dropInfo || intel || undefined,
    };
    return {
      ...listing,
      blueprintId: itemStats.blueprintId,
      blueprintKey: key,
      blueprintIntel: intel,
      communityFindsCount: findCounts[key] || 0,
      itemStats,
    };
  });
}

function firstPresent(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== '',
  );
}

function english(value, fallback = '') {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return value.en || value.EN || value.name || fallback;
}

function slugifyKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');
}

function lookupMetaForgeItem(...ids) {
  for (const id of ids) {
    if (!id) continue;
    const direct = MetaForgeCatalog.lookupItem(id);
    if (direct) return direct;
    const dashed = MetaForgeCatalog.lookupItem(slugifyKey(id));
    if (dashed) return dashed;
  }
  return null;
}

async function lookupCatalogItem(id, name) {
  const mf = lookupMetaForgeItem(id, name);
  if (mf) return mf;
  return GameCatalog.lookupItem(id || name).catch(() => null);
}

function itemLookupKeys({ id, name }) {
  const keys = new Set();
  [id, name].forEach((value) => {
    if (!value) return;
    const raw = String(value).trim().toLowerCase();
    if (!raw) return;
    keys.add(raw);
    keys.add(raw.replace(/_/g, '-'));
    keys.add(raw.replace(/-/g, '_'));
    keys.add(raw.replace(/[-_]+/g, ' '));
  });
  return Array.from(keys);
}

function normalizeStashItem(item) {
  const id = firstPresent(
    item.itemId,
    item.item_id,
    item.id,
    item.i,
    item.slug,
    item.instanceId,
  );
  const quantity = Number(
    firstPresent(
      item.amount,
      item.quantity,
      item.qty,
      item.count,
      item.itemQuantity,
      1,
    ),
  );
  return {
    ...item,
    id,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    name: firstPresent(item.name, item.title, item.displayName, id),
    icon: firstPresent(
      item.icon,
      item.iconUrl,
      item.imageUrl,
      item.imageFilename,
    ),
    itemType: firstPresent(
      item.item_type,
      item.itemType,
      item.type,
      item.category,
      item.tag,
    ),
    rarity: firstPresent(item.rarity, 'common'),
    value: Number(firstPresent(item.value, item.totalValue, item.cost, 0)) || 0,
  };
}

async function buildQuestDemandMap() {
  const [metaForgeQuests, ardbQuests] = await Promise.all([
    MetaForgeCatalog.allQuests().catch(() => []),
    Promise.resolve(ArdbService.allQuests()),
  ]);
  const demand = new Map();

  const add = (itemId, itemName, questName, quantity, source) => {
    if (!questName || (!itemId && !itemName)) return;
    const entry = {
      questName,
      quantity: Number(quantity) || 1,
      source,
    };
    for (const key of itemLookupKeys({ id: itemId, name: itemName })) {
      if (!demand.has(key)) demand.set(key, []);
      demand.get(key).push(entry);
    }
  };

  for (const quest of metaForgeQuests || []) {
    const questName = english(quest.name, quest.title || quest.id);
    const requiredItems =
      quest.required_items ||
      quest.requiredItems ||
      quest.requiredItemIds ||
      [];
    for (const required of requiredItems) {
      const itemId = firstPresent(
        required.item?.id,
        required.itemId,
        required.item_id,
        required.id,
      );
      const itemName = firstPresent(
        required.item?.name,
        required.itemName,
        required.name,
      );
      add(
        itemId,
        itemName,
        questName,
        required.quantity || required.amount,
        'metaforge',
      );
    }
  }

  for (const quest of ardbQuests || []) {
    const questName = english(quest.name, quest.id);
    for (const required of quest.requiredItemIds || []) {
      const itemId = required.itemId;
      const ardbItem = ArdbService.lookupItem(itemId);
      const mfItem = lookupMetaForgeItem(itemId);
      add(
        itemId,
        mfItem?.name || english(ardbItem?.name, itemId),
        questName,
        required.quantity,
        'ardb',
      );
    }
  }

  return demand;
}

function median(values) {
  const sorted = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

async function buildMedianPriceMap(groups) {
  const ids = new Set();
  const names = new Set();
  groups.forEach((group) => {
    if (group.itemId) ids.add(group.itemId);
    if (group.itemName) names.add(group.itemName);
  });

  if (!ids.size && !names.size) return new Map();

  const snapshots = await MarketplacePriceSnapshot.find({
    event: 'sold',
    currency: 'credits',
    $or: [
      ids.size ? { itemId: { $in: Array.from(ids) } } : null,
      names.size ? { itemName: { $in: Array.from(names) } } : null,
    ].filter(Boolean),
  })
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();

  const samples = new Map();
  for (const snap of snapshots) {
    for (const key of itemLookupKeys({
      id: snap.itemId,
      name: snap.itemName,
    })) {
      if (!samples.has(key)) samples.set(key, []);
      const bucket = samples.get(key);
      if (bucket.length < 5) bucket.push(snap.price);
    }
  }

  const medians = new Map();
  samples.forEach((values, key) => medians.set(key, median(values)));
  return medians;
}

function demandForItem(demandMap, itemId, itemName) {
  for (const key of itemLookupKeys({ id: itemId, name: itemName })) {
    const matches = demandMap.get(key);
    if (matches?.length) {
      return Array.from(
        new Map(
          matches.map((match) => [`${match.questName}:${match.source}`, match]),
        ).values(),
      );
    }
  }
  return [];
}

function medianForItem(priceMap, itemId, itemName) {
  for (const key of itemLookupKeys({ id: itemId, name: itemName })) {
    if (priceMap.has(key)) return priceMap.get(key);
  }
  return null;
}

function parseBulkLine(line) {
  const raw = String(line || '').trim();
  if (!raw) return null;

  const leading = raw.match(/^(\d+)\s*(?:x|×)?\s+(.+)$/i);
  const trailing = raw.match(/^(.+?)\s*(?:x|×)\s*(\d+)$/i);
  const simpleNumber = raw.match(/\d+/);

  let qty = 1;
  let rawName = raw;
  if (leading) {
    qty = Number(leading[1]) || 1;
    rawName = leading[2].trim();
  } else if (trailing) {
    qty = Number(trailing[2]) || 1;
    rawName = trailing[1].trim();
  } else if (simpleNumber) {
    qty = Number(simpleNumber[0]) || 1;
    rawName = raw.replace(simpleNumber[0], '').trim();
  }

  return { raw, rawName, qty: Math.max(1, Math.floor(qty)) };
}

function findCatalogItemByName(items, rawName) {
  const key = codexKey(rawName);
  return (
    lookupMetaForgeItem(rawName) ||
    items.find((item) => {
      const name = codexKey(item.name);
      const id = codexKey(item.id);
      const slug = codexKey(item.slug);
      return name === key || id === key || slug === key;
    }) ||
    items.find((item) => {
      const name = codexKey(item.name);
      const id = codexKey(item.id);
      return name.includes(key) || id.includes(key);
    }) ||
    null
  );
}

function codexKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const router = express.Router();

router.use(requireAuth);

// GET /api/marketplace/trade-center — Consolidated Trading Hub
router.get('/trade-center', async (req, res) => {
  try {
    // Get user data and stats
    const [myListings, incomingOffers, user] = await Promise.all([
      MarketplaceListing.find({
        sellerId: req.user.id,
        status: 'active',
      }).lean(),
      MarketplaceOffer.find({
        sellerId: req.user.id,
        status: 'pending',
      }).lean(),
      User.findOne({ id: req.user.id }).select(
        'mostWanted storefrontName credits tokens storefrontDescription',
      ),
    ]);

    // Get active categories with counts to help remove the display limit
    const categories = await MarketplaceListing.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$itemType',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      wallet: {
        credits: user?.credits || 0,
        tokens: user?.tokens || 0,
      },
      inventoryStats: {
        activeListings: myListings.length,
        pendingOffers: incomingOffers.length,
        wantedItems: user?.mostWanted?.length || 0,
      },
      storefront: {
        name: user?.storefrontName,
        description: user?.storefrontDescription,
      },
      categories,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/marketplace — Browse all active listings
router.get('/', async (req, res) => {
  try {
    const {
      type,
      rarity,
      minPrice,
      maxPrice,
      sortBy = 'newest',
      page = 1,
      limit = 60, // Increased default limit to show more items
      search,
    } = req.query;

    const filter = { status: 'active' };
    if (type) filter.itemType = type;
    if (rarity) filter.itemrarity = rarity;

    // Add search functionality to help find items in a large market
    if (search) {
      filter.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    let sort = {};
    switch (sortBy) {
      case 'price_asc':
        sort = { price: 1 };
        break;
      case 'price_desc':
        sort = { price: -1 };
        break;
      case 'rarity':
        sort = { itemrarity: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [listingsRaw, total] = await Promise.all([
      MarketplaceListing.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      MarketplaceListing.countDocuments(filter),
    ]);
    const listings = await enrichBlueprintRelations(
      await backfillIcons(listingsRaw),
    );

    res.json({
      listings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[Marketplace] Browse error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/marketplace/my-listings — Get user's own listings
router.get('/my-listings', async (req, res) => {
  try {
    const listingsRaw = await MarketplaceListing.find({
      sellerId: req.user.id,
    })
      .sort({ createdAt: -1 })
      .lean();
    const listings = await enrichBlueprintRelations(
      await backfillIcons(listingsRaw),
    );
    res.json(listings);
  } catch (err) {
    console.error('[Marketplace] My listings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/marketplace/warehouse?account=main|trade&staleDays=7
// Mongo-backed warehouse summary inspired by here/CHECKOUT/metaforge-trade-tracker.
router.get('/warehouse', async (req, res) => {
  try {
    const account = req.query.account === 'trade' ? 'trade' : 'main';
    const staleDays = Math.max(
      1,
      Math.min(90, Number(req.query.staleDays) || 7),
    );

    const [stash, activeListingsRaw, questDemandMap] = await Promise.all([
      UserDataAPI.getStash(req.user.id, { account }),
      MarketplaceListing.find({
        sellerId: req.user.id,
        status: 'active',
      })
        .sort({ createdAt: -1 })
        .lean(),
      buildQuestDemandMap(),
    ]);

    const activeListings = await enrichBlueprintRelations(
      await backfillIcons(activeListingsRaw),
    );

    const listedQuantityByKey = new Map();
    activeListings.forEach((listing) => {
      const qty = Number(listing.itemQuantity) || 1;
      itemLookupKeys({
        id: listing.stashItemRef || listing.itemId,
        name: listing.itemName,
      }).forEach((key) => {
        listedQuantityByKey.set(key, (listedQuantityByKey.get(key) || 0) + qty);
      });
    });

    const normalizedItems = await Promise.all(
      (stash?.items || []).map(async (raw) => {
        const item = normalizeStashItem(raw);
        const catalogItem = await lookupCatalogItem(item.id, item.name);
        const rawIcon = firstPresent(
          item.icon,
          catalogItem?.icon,
          catalogItem?.iconUrl,
          catalogItem?.imageFilename,
          catalogItem?.image,
        );
        const icon = resolveItemAssetUrl(rawIcon, item.id);
        return {
          ...item,
          catalogItem,
          itemId: firstPresent(item.id, catalogItem?.id, item.name),
          itemName: firstPresent(item.name, catalogItem?.name, item.id),
          itemType: firstPresent(
            item.itemType,
            catalogItem?.item_type,
            catalogItem?.category,
            catalogItem?.type,
            'General',
          ),
          itemIconUrl: icon || '',
          rarity: String(
            firstPresent(item.rarity, catalogItem?.rarity, 'common'),
          ),
          value: Number(firstPresent(item.value, catalogItem?.value, 0)) || 0,
          stackSize:
            Number(
              firstPresent(
                item.maxStackAmount,
                item.stat_block?.stackSize,
                catalogItem?.stat_block?.stackSize,
                1,
              ),
            ) || 1,
        };
      }),
    );

    const groupedMap = new Map();
    for (const item of normalizedItems) {
      const key = [
        slugifyKey(item.itemId || item.itemName),
        slugifyKey(item.itemType),
        slugifyKey(item.rarity),
        Math.floor(item.value || 0),
      ].join(':');

      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          itemId: item.itemId,
          itemName: item.itemName,
          itemType: item.itemType,
          itemIconUrl: item.itemIconUrl,
          rarity: item.rarity,
          source: stash?.source || account,
          account,
          value: item.value,
          quantity: 0,
          stackSize: Math.max(1, item.stackSize),
          sampleIds: [],
        });
      }

      const group = groupedMap.get(key);
      group.quantity += item.quantity;
      if (item.id) group.sampleIds.push(item.id);
      group.stackSize = Math.max(group.stackSize, item.stackSize);
    }

    const groups = Array.from(groupedMap.values());
    const medianPriceMap = await buildMedianPriceMap(groups);

    const enrichedGroups = groups
      .map((group) => {
        const medianSoldPrice = medianForItem(
          medianPriceMap,
          group.itemId,
          group.itemName,
        );
        const questDemand = demandForItem(
          questDemandMap,
          group.itemId,
          group.itemName,
        );
        const listedQuantity = itemLookupKeys({
          id: group.itemId,
          name: group.itemName,
        }).reduce(
          (sum, key) => Math.max(sum, listedQuantityByKey.get(key) || 0),
          0,
        );
        const slotEstimate = Math.ceil(group.quantity / group.stackSize);

        return {
          ...group,
          quantity: Math.round(group.quantity),
          stackSize: group.stackSize,
          slotEstimate,
          listedQuantity,
          isListed: listedQuantity > 0,
          medianSoldPrice,
          questDemand,
          questDemandCount: questDemand.length,
          estimatedValue: Math.round(
            (medianSoldPrice || group.value || 0) * group.quantity,
          ),
        };
      })
      .sort((a, b) => a.itemName.localeCompare(b.itemName));

    const now = Date.now();
    const enrichedListings = activeListings.map((listing) => {
      const ageDays = Math.floor(
        (now - new Date(listing.createdAt || now).getTime()) / 86400000,
      );
      const medianSoldPrice = medianForItem(
        medianPriceMap,
        listing.itemId,
        listing.itemName,
      );
      const questDemand = demandForItem(
        questDemandMap,
        listing.itemId,
        listing.itemName,
      );
      return {
        ...listing,
        ageDays,
        staleDays,
        staleLevel:
          ageDays >= staleDays * 2
            ? 'critical'
            : ageDays >= staleDays
              ? 'stale'
              : 'fresh',
        medianSoldPrice,
        questDemand,
        questDemandCount: questDemand.length,
      };
    });

    res.json({
      account,
      source: stash?.source || account,
      groups: enrichedGroups,
      activeListings: enrichedListings,
      summary: {
        totalGroups: enrichedGroups.length,
        totalItems: enrichedGroups.reduce(
          (sum, group) => sum + group.quantity,
          0,
        ),
        totalSlots: enrichedGroups.reduce(
          (sum, group) => sum + group.slotEstimate,
          0,
        ),
        listedCount: enrichedListings.length,
        staleCount: enrichedListings.filter(
          (listing) => listing.staleLevel !== 'fresh',
        ).length,
        estimatedAssetValue: enrichedGroups.reduce(
          (sum, group) => sum + group.estimatedValue,
          0,
        ),
        questDemandGroups: enrichedGroups.filter(
          (group) => group.questDemandCount > 0,
        ).length,
      },
    });
  } catch (err) {
    console.error('[Marketplace] Warehouse error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/optimize-listing', async (req, res) => {
  try {
    const body = req.body || {};
    const item = body.item;
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return res
        .status(400)
        .json({ error: 'validation_error', message: 'item is required.' });
    }

    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!name) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'item.name is required.',
      });
    }

    const foundIn = Array.isArray(item.foundIn)
      ? item.foundIn.filter(
          (value) => typeof value === 'string' && value.trim().length > 0,
        )
      : [];
    const price =
      typeof body.price === 'number'
        ? body.price
        : typeof body.price === 'string' && body.price.trim()
          ? Number.parseFloat(body.price)
          : null;

    const result = await generateOptimizedListing({
      item: {
        name,
        itemType:
          typeof item.itemType === 'string'
            ? item.itemType.trim() || null
            : null,
        rarity:
          typeof item.rarity === 'string' ? item.rarity.trim() || null : null,
        description:
          typeof item.description === 'string'
            ? item.description.trim() || null
            : null,
        foundIn,
      },
      price: Number.isFinite(price) ? price : null,
      currency:
        typeof body.currency === 'string' ? body.currency.trim() || null : null,
      quantity: typeof body.quantity === 'number' ? body.quantity : null,
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
    });

    return res.json(result);
  } catch (err) {
    const message = err.message || 'Unable to optimize listing right now.';
    const status = message.includes('OPENAI_API_KEY') ? 503 : 502;
    return res.status(status).json({ error: 'optimizer_unavailable', message });
  }
});

router.post('/bulk-ingest', async (req, res) => {
  try {
    const text = String(req.body?.text || '');
    const allowUnknown = req.body?.allowUnknown === true;
    if (!text.trim()) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'text is required',
      });
    }

    const catalogItems = await MetaForgeCatalog.allItems().catch(() => []);
    const parsed = [];
    const invalid = [];

    for (const line of text.split(/\r?\n/)) {
      const parsedLine = parseBulkLine(line);
      if (!parsedLine) continue;

      const lower = parsedLine.rawName.toLowerCase();
      if (
        lower === 'assorted seeds' ||
        lower === 'raw seeds' ||
        lower === 'seeds'
      ) {
        parsed.push({
          type: 'currency',
          raw: parsedLine.raw,
          name: parsedLine.rawName,
          quantity: parsedLine.qty,
          currency: 'seeds',
        });
        continue;
      }

      const item = findCatalogItemByName(catalogItems, parsedLine.rawName);
      if (!item && !allowUnknown) {
        invalid.push({
          raw: parsedLine.raw,
          name: parsedLine.rawName,
          quantity: parsedLine.qty,
          reason: 'item_not_found',
        });
        continue;
      }

      parsed.push({
        type: 'item',
        raw: parsedLine.raw,
        quantity: parsedLine.qty,
        itemId: item?.id || slugifyKey(parsedLine.rawName),
        itemName: item?.name || parsedLine.rawName,
        itemType: item?.item_type || item?.type || 'Unknown',
        itemrarity: item?.rarity || 'Common',
        itemIconUrl: item?.icon || '',
        value: Number(item?.value) || 0,
        stackSize: Number(item?.stat_block?.stackSize) || 1,
        matched: Boolean(item),
      });
    }

    return res.json({
      ok: invalid.length === 0,
      parsed,
      invalid,
      summary: {
        lines: text.split(/\r?\n/).filter((line) => line.trim()).length,
        items: parsed.filter((entry) => entry.type === 'item').length,
        currencies: parsed.filter((entry) => entry.type === 'currency').length,
        invalid: invalid.length,
        quantity: parsed.reduce(
          (sum, entry) => sum + (Number(entry.quantity) || 0),
          0,
        ),
      },
    });
  } catch (err) {
    console.error('[Marketplace] Bulk ingest parse error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/marketplace/stash-items?account=main|trade — Get a stash to pick from
router.get('/stash-items', async (req, res) => {
  try {
    const account = req.query.account === 'trade' ? 'trade' : 'main';
    const stash = await UserDataAPI.getStash(req.user.id, { account });
    if (!stash || !stash.items) {
      return res.json({ items: [], account });
    }

    // Filter out items already listed
    const listedItemIds = await MarketplaceListing.distinct('stashItemRef', {
      sellerId: req.user.id,
      status: 'active',
    });

    // Normalize each stash item so the client always has a stable shape:
    // - id: pulled from id | itemId | item_id | slug
    // - icon: filled from catalog if missing, normalized to absolute URL
    // - rarity: lowercased for consistent UI lookups
    const availableItems = await Promise.all(
      stash.items.map(async (item) => {
        const id = item.id || item.itemId || item.item_id || item.slug;
        let icon = item.icon || item.imageUrl || item.imageFilename || null;
        if (!icon && id) {
          const meta = await GameCatalog.lookupItem(id).catch(() => null);
          if (meta?.imageFilename) icon = meta.imageFilename;
        }
        icon = resolveItemAssetUrl(icon, id);
        return {
          ...item,
          id,
          icon,
          rarity: (item.rarity || 'common').toString().toLowerCase(),
          isListed: listedItemIds.includes(id),
        };
      }),
    );

    res.json({ items: availableItems, account });
  } catch (err) {
    console.error('[Marketplace] Stash items error:', err);
    const isUnreachable = err.message?.includes(
      'not reachable from the server',
    );
    res
      .status(isUnreachable ? 503 : 500)
      .json({ error: err.message, unreachable: isUnreachable, items: [] });
  }
});

// POST /api/marketplace/list — Create a new listing from stash item
router.post('/list', async (req, res) => {
  try {
    const {
      stashItemRef,
      itemName,
      itemType,
      itemrarity,
      itemIconUrl,
      itemQuantity,
      itemStats,
      price,
      currency,
      description,
      condition,
    } = req.body;

    if (!stashItemRef || !itemName || !price) {
      return res.status(400).json({
        error: 'stashItemRef, itemName, and price are required',
      });
    }

    // Check if already listed
    const existing = await MarketplaceListing.findOne({
      sellerId: req.user.id,
      stashItemRef,
      status: 'active',
    });

    if (existing) {
      return res.status(409).json({ error: 'Item already listed' });
    }

    // Strict Data Mode: Verify item actually exists in user stash before
    // listing. Check BOTH main and trade stashes so users can list items from
    // either account without having to switch keys.
    const [mainStash, tradeStash] = await Promise.all([
      UserDataAPI.getStash(req.user.id, { account: 'main' }).catch(() => null),
      UserDataAPI.getStash(req.user.id, { account: 'trade' }).catch(() => null),
    ]);
    const findIn = (s) =>
      s?.items?.find(
        (i) => (i.id || i.itemId || i.item_id || i.slug) === stashItemRef,
      );
    const itemInStash = findIn(mainStash) || findIn(tradeStash);

    if (!itemInStash) {
      return res
        .status(400)
        .json({ error: 'Item not found in your active stash' });
    }

    if (itemInStash.quantity < (itemQuantity || 1)) {
      return res
        .status(400)
        .json({ error: 'Insufficient item quantity in stash' });
    }

    const user = await User.findOne({ id: req.user.id });

    const blueprintPayload =
      String(itemType || '').toLowerCase() === 'blueprint' ||
      String(itemName || '')
        .toLowerCase()
        .includes('blueprint') ||
      itemStats?.blueprintId;
    const blueprintIntel = blueprintPayload
      ? getBlueprintIntel(itemStats?.blueprintId) ||
        getBlueprintIntel(stashItemRef) ||
        getBlueprintIntel(itemName)
      : null;

    const listing = new MarketplaceListing({
      sellerId: req.user.id,
      sellerName: req.user.username,
      sellerSlug: user?.slug ?? null,
      itemId: stashItemRef,
      itemName,
      itemType: blueprintPayload ? 'blueprint' : itemType || 'unknown',
      itemrarity: itemrarity || 'common',
      itemIconUrl: itemIconUrl || '',
      itemQuantity: itemQuantity || 1,
      itemStats: {
        ...(itemStats || {}),
        blueprintId: blueprintPayload
          ? itemStats?.blueprintId || stashItemRef
          : itemStats?.blueprintId,
        dropInfo: itemStats?.dropInfo || blueprintIntel || undefined,
      },
      price: Number(price),
      currency: currency || 'credits',
      description: description || '',
      condition: condition || 'mint',
      stashItemRef,
    });

    await listing.save();
    snapshot(listing, 'listed');

    // Send Discord notification if webhook is configured
    if (user?.discordWebhookUrl) {
      const isBlueprint =
        (listing.itemType || '').toLowerCase() === 'blueprint' ||
        listing.itemName?.toLowerCase().includes('blueprint');
      const payload = isBlueprint
        ? DiscordBot.buildBlueprintListingEmbed(
            listing,
            user,
            listing.itemStats?.dropInfo || null,
          )
        : DiscordBot.buildListingEmbed(listing, user);
      await DiscordBot.sendWebhook(user.discordWebhookUrl, payload);
    }

    // Check for wanted item alerts
    await checkWantedItemAlerts(listing);

    res.json({ status: 'listed', listing });
  } catch (err) {
    console.error('[Marketplace] List error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/marketplace/list-key — Quick list an access key
router.post('/list-key', async (req, res) => {
  try {
    const { keyName, keyrarity, price, description } = req.body;

    if (!keyName || !price) {
      return res.status(400).json({ error: 'keyName and price are required' });
    }

    const rarityMap = {
      master: 'legendary',
      admin: 'legendary',
      security: 'epic',
      vault: 'epic',
      supply: 'rare',
      cellar: 'rare',
      residential: 'uncommon',
      office: 'uncommon',
    };

    const detectedrarity =
      keyrarity || rarityMap[keyName.toLowerCase().split(' ')[0]] || 'rare';

    const user = await User.findOne({ id: req.user.id });

    const listing = new MarketplaceListing({
      sellerId: req.user.id,
      sellerName: req.user.username,
      sellerSlug: user?.slug ?? null,
      itemId: `key_${Date.now()}`,
      itemName: keyName,
      itemType: 'key',
      itemrarity: detectedrarity,
      itemIconUrl: resolveItemAssetUrl(
        `https://raw.githubusercontent.com/dandwyer/arcraiders-data/main/images/items/key_${keyName.toLowerCase().replace(/\s+/g, '_')}.png`,
      ),
      itemQuantity: 1,
      price: Number(price),
      currency: 'credits',
      description: description || `Access Key: ${keyName}`,
      condition: 'mint',
      stashItemRef: `key_${Date.now()}`,
    });

    await listing.save();
    snapshot(listing, 'listed');

    // Send Discord notification
    if (user?.discordWebhookUrl) {
      const payload = DiscordBot.buildListingEmbed(listing, user);
      await DiscordBot.sendWebhook(user.discordWebhookUrl, payload);
    }

    // Check for wanted item alerts
    await checkWantedItemAlerts(listing);

    res.json({ status: 'listed', listing, shortcut: true });
  } catch (err) {
    console.error('[Marketplace] List-key error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Check if a newly listed item matches any user's wanted list and send alerts
 */
async function checkWantedItemAlerts(listing) {
  try {
    const usersWithWanted = await User.find({
      'mostWanted.itemName': { $regex: new RegExp(listing.itemName, 'i') },
    });

    for (const user of usersWithWanted) {
      const matchedWanted = user.mostWanted.find(
        (w) =>
          listing.itemName.toLowerCase().includes(w.itemName.toLowerCase()) ||
          w.itemName.toLowerCase().includes(listing.itemName.toLowerCase()),
      );

      if (matchedWanted) {
        if (user.discordWebhookUrl) {
          const payload = DiscordBot.buildWantedAlertEmbed(
            listing,
            { username: listing.sellerName },
            matchedWanted,
          );
          DiscordBot.sendWebhook(user.discordWebhookUrl, payload).catch(
            () => {},
          );
        }
        pushNotification(user.id, {
          type: 'wanted_alert',
          title: `🔥 Wanted Item Listed: ${listing.itemName}`,
          message: `${listing.itemName} is now listed for ${listing.price} ${listing.currency} by ${listing.sellerName}.`,
          link: '/marketplace',
          meta: { listingId: String(listing._id), itemName: listing.itemName },
        });
      }
    }
  } catch (err) {
    console.error('[Marketplace] Wanted alert error:', err.message);
  }
}

// POST /api/marketplace/buy/:id — Purchase a listing
router.post('/buy/:id', async (req, res) => {
  try {
    const listing = await MarketplaceListing.findById(req.params.id);
    if (!listing || listing.status !== 'active') {
      return res.status(404).json({ error: 'Listing not found or inactive' });
    }

    if (listing.sellerId === req.user.id) {
      return res.status(400).json({ error: 'Cannot buy your own listing' });
    }

    const buyer = await User.findOne({ id: req.user.id });
    const seller = await User.findOne({ id: listing.sellerId });

    if (!buyer) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    // Check funds
    const totalPrice = listing.price * listing.itemQuantity;
    if (buyer[listing.currency] < totalPrice) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Transfer funds
    buyer[listing.currency] -= totalPrice;
    if (seller) {
      seller[listing.currency] += totalPrice;
    }

    // Update listing
    listing.status = 'sold';
    listing.buyerId = req.user.id;
    listing.buyerName = req.user.username;
    listing.soldAt = new Date();

    await Promise.all([buyer.save(), seller?.save(), listing.save()]);
    snapshot(listing, 'sold');

    // Notify the seller via Discord webhook (if configured).
    if (seller?.discordWebhookUrl) {
      const payload = DiscordBot.buildSaleEmbed(
        listing,
        buyer.username,
        totalPrice,
      );
      DiscordBot.sendWebhook(seller.discordWebhookUrl, payload).catch(() => {});
    }
    if (seller) {
      pushNotification(seller.id, {
        type: 'sale',
        title: `✅ Sold: ${listing.itemName}`,
        message: `${buyer.username} purchased your ${listing.itemName} for ${totalPrice} ${listing.currency}.`,
        link: '/marketplace',
        meta: {
          listingId: String(listing._id),
          buyerName: buyer.username,
          price: totalPrice,
        },
      });
    }

    // Increment seller marketplace rep + sales count
    if (seller) {
      seller.salesCount = (seller.salesCount || 0) + 1;
      seller.marketplaceRep = (seller.marketplaceRep || 0) + 1;
      await seller.save().catch(() => {});
    }

    // Award XP to both parties
    const xpAmount = Math.floor(totalPrice / 10) + 50;
    buyer.addXp(xpAmount, 'Marketplace purchase', 'marketplace');
    if (seller)
      seller.addXp(Math.floor(xpAmount / 2), 'Marketplace sale', 'marketplace');

    await Promise.all([buyer.save(), seller?.save()]);

    res.json({ status: 'sold', listing, xpGained: xpAmount });
  } catch (err) {
    console.error('[Marketplace] Buy error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/marketplace/offers — Get incoming and outgoing offers
 */
router.get('/offers', async (req, res) => {
  try {
    const [incoming, outgoing] = await Promise.all([
      MarketplaceOffer.find({ sellerId: req.user.id })
        .sort({ createdAt: -1 })
        .lean(),
      MarketplaceOffer.find({ buyerId: req.user.id })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    res.json({ incoming, outgoing });
  } catch (err) {
    console.error('[Marketplace] Offers fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/marketplace/offers — Create a new offer for an active listing
 */
router.post('/offers', async (req, res) => {
  try {
    const { listingId, offeredPrice, currency, message } = req.body;

    if (!listingId || !offeredPrice) {
      return res.status(400).json({
        error: 'listingId and offeredPrice are required',
      });
    }

    const listing = await MarketplaceListing.findById(listingId);
    if (!listing || listing.status !== 'active') {
      return res.status(404).json({ error: 'Listing not found or inactive' });
    }

    if (listing.sellerId === req.user.id) {
      return res
        .status(400)
        .json({ error: 'Cannot make an offer on your own listing' });
    }

    const offerCurrency = currency || listing.currency || 'credits';
    if (!['credits', 'tokens'].includes(offerCurrency)) {
      return res.status(400).json({ error: 'Invalid currency' });
    }

    const buyer = await User.findOne({ id: req.user.id });
    const seller = await User.findOne({ id: listing.sellerId });

    if (!buyer) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    const existingPending = await MarketplaceOffer.findOne({
      listingId,
      buyerId: req.user.id,
      status: 'pending',
    });

    if (existingPending) {
      return res
        .status(409)
        .json({ error: 'You already have a pending offer on this listing' });
    }

    const offer = new MarketplaceOffer({
      listingId,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      buyerId: req.user.id,
      buyerName: req.user.username,
      itemName: listing.itemName,
      itemType: listing.itemType || 'unknown',
      itemrarity: listing.itemrarity || 'common',
      itemQuantity: listing.itemQuantity || 1,
      itemIconUrl: listing.itemIconUrl || '',
      offeredPrice: Number(offeredPrice),
      currency: offerCurrency,
      message: message || '',
    });

    await offer.save();

    // Notify seller about the new offer via Discord webhook.
    if (seller?.discordWebhookUrl) {
      const payload = DiscordBot.buildOfferReceivedEmbed(offer, listing);
      DiscordBot.sendWebhook(seller.discordWebhookUrl, payload).catch(() => {});
    }
    pushNotification(listing.sellerId, {
      type: 'offer_received',
      title: `📩 New Offer: ${listing.itemName}`,
      message: `${req.user.username} offered ${offer.offeredPrice} ${offer.currency} for your ${listing.itemName}.`,
      link: '/marketplace',
      meta: {
        offerId: String(offer._id),
        listingId: String(listing._id),
        buyerName: req.user.username,
      },
    });

    res.json({ status: 'offer_sent', offer });
  } catch (err) {
    console.error('[Marketplace] Offer create error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/marketplace/offers/:id/accept — Accept an incoming offer
 */
router.post('/offers/:id/accept', async (req, res) => {
  try {
    const offer = await MarketplaceOffer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Not your offer to accept' });
    }

    if (offer.status !== 'pending') {
      return res.status(409).json({ error: 'Offer is no longer pending' });
    }

    const listing = await MarketplaceListing.findById(offer.listingId);
    if (!listing || listing.status !== 'active') {
      return res.status(409).json({ error: 'Listing is no longer active' });
    }

    const seller = await User.findOne({ id: req.user.id });
    const buyer = await User.findOne({ id: offer.buyerId });

    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    if (!buyer) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    const totalPrice = offer.offeredPrice * offer.itemQuantity;
    const buyerBalance = Number(buyer[offer.currency] || 0);

    if (buyerBalance < totalPrice) {
      return res.status(400).json({ error: 'Buyer has insufficient funds' });
    }

    buyer[offer.currency] = buyerBalance - totalPrice;
    seller[offer.currency] = Number(seller[offer.currency] || 0) + totalPrice;

    listing.status = 'sold';
    listing.price = offer.offeredPrice;
    listing.currency = offer.currency;
    listing.buyerId = buyer.id;
    listing.buyerName = buyer.username;
    listing.soldAt = new Date();

    offer.status = 'accepted';
    offer.respondedAt = new Date();
    offer.acceptedAt = new Date();

    await Promise.all([
      buyer.save(),
      seller.save(),
      listing.save(),
      offer.save(),
    ]);
    snapshot(listing, 'sold');
    seller.salesCount = (seller.salesCount || 0) + 1;
    seller.marketplaceRep = (seller.marketplaceRep || 0) + 1;
    await seller.save().catch(() => {});

    const xpAmount = Math.floor(totalPrice / 10) + 50;
    buyer.addXp(xpAmount, 'Marketplace offer accepted', 'marketplace');
    seller.addXp(
      Math.floor(xpAmount / 2),
      'Marketplace offer accepted',
      'marketplace',
    );

    await Promise.all([
      buyer.save(),
      seller.save(),
      MarketplaceOffer.updateMany(
        {
          listingId: offer.listingId,
          _id: { $ne: offer._id },
          status: 'pending',
        },
        {
          $set: {
            status: 'expired',
            respondedAt: new Date(),
          },
        },
      ),
    ]);

    // Notify the buyer via Discord webhook.
    if (buyer?.discordWebhookUrl) {
      const payload = DiscordBot.buildOfferAcceptedEmbed(offer, listing);
      DiscordBot.sendWebhook(buyer.discordWebhookUrl, payload).catch(() => {});
    }
    pushNotification(offer.buyerId, {
      type: 'offer_accepted',
      title: `🎉 Offer Accepted: ${offer.itemName}`,
      message: `Your offer of ${offer.offeredPrice} ${offer.currency} for ${offer.itemName} was accepted!`,
      link: '/marketplace',
      meta: { offerId: String(offer._id), listingId: String(offer.listingId) },
    });

    res.json({ status: 'accepted', offer, listing, xpGained: xpAmount });
  } catch (err) {
    console.error('[Marketplace] Offer accept error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/marketplace/offers/:id/decline — Decline an incoming offer
 */
router.post('/offers/:id/decline', async (req, res) => {
  try {
    const offer = await MarketplaceOffer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Not your offer to decline' });
    }

    if (offer.status !== 'pending') {
      return res.status(409).json({ error: 'Offer is no longer pending' });
    }

    offer.status = 'declined';
    offer.respondedAt = new Date();
    offer.declinedAt = new Date();
    await offer.save();

    // Notify the buyer via Discord webhook.
    const buyer = await User.findOne({ id: offer.buyerId });
    const listing = await MarketplaceListing.findById(offer.listingId);
    if (buyer?.discordWebhookUrl && listing) {
      const payload = DiscordBot.buildOfferDeclinedEmbed(offer, listing);
      DiscordBot.sendWebhook(buyer.discordWebhookUrl, payload).catch(() => {});
    }
    pushNotification(offer.buyerId, {
      type: 'offer_declined',
      title: `❌ Offer Declined: ${offer.itemName}`,
      message: `Your offer of ${offer.offeredPrice} ${offer.currency} for ${offer.itemName} was declined.`,
      link: '/marketplace',
      meta: { offerId: String(offer._id) },
    });

    res.json({ status: 'declined', offer });
  } catch (err) {
    console.error('[Marketplace] Offer decline error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/marketplace/offers/:id/withdraw — Withdraw an outgoing offer
 */
router.post('/offers/:id/withdraw', async (req, res) => {
  try {
    const offer = await MarketplaceOffer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.buyerId !== req.user.id) {
      return res.status(403).json({ error: 'Not your offer to withdraw' });
    }

    if (offer.status !== 'pending') {
      return res.status(409).json({ error: 'Offer is no longer pending' });
    }

    offer.status = 'withdrawn';
    offer.respondedAt = new Date();
    offer.withdrawnAt = new Date();
    await offer.save();

    res.json({ status: 'withdrawn', offer });
  } catch (err) {
    console.error('[Marketplace] Offer withdraw error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/marketplace/:id — Cancel a listing
router.delete('/:id', async (req, res) => {
  try {
    const listing = await MarketplaceListing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Not your listing' });
    }

    listing.status = 'cancelled';
    await listing.save();
    snapshot(listing, 'cancelled');

    res.json({ status: 'cancelled' });
  } catch (err) {
    console.error('[Marketplace] Cancel error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/marketplace/categories — Get filter categories
router.get('/categories', async (_req, res) => {
  try {
    const [types, rarities] = await Promise.all([
      MarketplaceListing.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$itemType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      MarketplaceListing.distinct('itemrarity', { status: 'active' }),
    ]);

    res.json({ types, rarities });
  } catch (err) {
    console.error('[Marketplace] Categories error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/marketplace/items/:id/history — price history snapshots for an item
router.get('/items/:id/history', async (req, res) => {
  try {
    const itemId = req.params.id;
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const snapshots = await MarketplacePriceSnapshot.find({
      itemId,
      createdAt: { $gte: since },
    })
      .sort({ createdAt: 1 })
      .lean();

    const sold = snapshots.filter((s) => s.event === 'sold');
    const listed = snapshots.filter((s) => s.event === 'listed');

    const summary = {
      itemId,
      days,
      totalSnapshots: snapshots.length,
      soldCount: sold.length,
      listedCount: listed.length,
      currentLowestActive: null,
      avgSold: sold.length
        ? Math.round(sold.reduce((a, s) => a + s.price, 0) / sold.length)
        : null,
      lastSold: sold.length ? sold[sold.length - 1] : null,
    };

    const lowestActive = await MarketplaceListing.findOne({
      itemId,
      status: 'active',
    })
      .sort({ price: 1 })
      .lean();
    if (lowestActive) summary.currentLowestActive = lowestActive.price;

    res.json({ summary, snapshots });
  } catch (err) {
    console.error('[Marketplace] History error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/marketplace/items/:id/comparable — current active listings for that item
router.get('/items/:id/comparable', async (req, res) => {
  try {
    const itemId = req.params.id;
    const listings = await MarketplaceListing.find({
      itemId,
      status: 'active',
    })
      .sort({ price: 1 })
      .limit(20)
      .lean();
    res.json({ listings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/marketplace/trending — items with most listings/sales in last 7 days
router.get('/trending', async (_req, res) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const top = await MarketplacePriceSnapshot.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$itemId',
          itemName: { $last: '$itemName' },
          itemrarity: { $last: '$itemrarity' },
          listings: {
            $sum: { $cond: [{ $eq: ['$event', 'listed'] }, 1, 0] },
          },
          sales: { $sum: { $cond: [{ $eq: ['$event', 'sold'] }, 1, 0] } },
          avgPrice: { $avg: '$price' },
        },
      },
      { $sort: { sales: -1, listings: -1 } },
      { $limit: 25 },
    ]);
    res.json({ trending: top });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
