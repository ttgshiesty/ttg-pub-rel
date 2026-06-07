import ArdbService from './ardb.js';
import { GameCatalog } from './gameCatalog.js';

function text(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    return value.en || value.name || value.title || '';
  }
  return '';
}

function idOf(entry) {
  return entry?.id || entry?.itemId || entry?.slug || entry?.key || null;
}

function nameOf(entry) {
  return text(
    entry?.name || entry?.title || entry?.displayName || entry?.label,
  );
}

function normalizeItem(item) {
  const id = idOf(item);
  return {
    id,
    kind: 'item',
    source: 'ardb',
    name: nameOf(item) || id,
    rarity: item?.rarity || null,
    type: item?.type || item?.category || null,
    tag: item?.tag || null,
    image: item?.imageFilename || item?.icon || item?.imageUrl || null,
    raw: item,
  };
}

function normalizeQuest(quest) {
  const id = idOf(quest);
  return {
    id,
    kind: 'quest',
    source: 'ardb',
    name: nameOf(quest) || id,
    trader: quest?.trader || quest?.traderName || quest?.giver || null,
    map: quest?.map || quest?.maps || [],
    requiredItems: quest?.requiredItems || quest?.required_items || [],
    previousQuestIds: quest?.previousQuestIds || [],
    nextQuestIds: quest?.nextQuestIds || [],
    raw: quest,
  };
}

function normalizeProject(project) {
  const id = idOf(project);
  return {
    id,
    kind: 'project',
    source: 'ardb',
    name: nameOf(project) || id,
    phases: project?.phases || [],
    requirementItemIds:
      project?.requirementItemIds || project?.requiredItems || [],
    raw: project,
  };
}

function normalizeArcEnemy(enemy) {
  const id = idOf(enemy);
  return {
    id,
    kind: 'arc-enemy',
    source: 'ardb',
    targetId: enemy?.targetId || enemy?.target_id || null,
    name: nameOf(enemy) || enemy?.name || id,
    type: enemy?.type || enemy?.category || null,
    threat: enemy?.threat || null,
    image: enemy?.image || enemy?.imageFilename || enemy?.icon || null,
    drops: enemy?.drops || enemy?.loot || [],
    maps: enemy?.maps || [],
    raw: enemy,
  };
}

function normalizeHideout(module) {
  const id = idOf(module);
  return {
    id,
    kind: 'hideout',
    source: 'arcdata',
    name: nameOf(module) || id,
    category: module?.category || module?.type || null,
    levels: module?.levels || module?.upgrades || [],
    raw: module,
  };
}

function normalizeMap(map) {
  const id = idOf(map);
  return {
    id,
    kind: 'map',
    source: 'arcdata',
    name: nameOf(map) || id,
    image: map?.image || map?.imageUrl || map?.icon || null,
    raw: map,
  };
}

function normalizeTrade(trade) {
  const id = idOf(trade);
  return {
    id,
    kind: 'trade',
    source: 'arcdata',
    name: nameOf(trade) || id,
    trader: trade?.trader || trade?.traderName || trade?.vendor || null,
    gives: trade?.gives || trade?.output || trade?.reward || null,
    requires: trade?.requires || trade?.input || trade?.cost || null,
    raw: trade,
  };
}

const normalizers = {
  items: {
    list: () => ArdbService.allItems(),
    lookup: (id) => ArdbService.lookupItem(id),
    normalize: normalizeItem,
  },
  quests: {
    list: () => ArdbService.allQuests(),
    lookup: (id) => ArdbService.lookupQuest(id),
    normalize: normalizeQuest,
  },
  projects: {
    list: () => ArdbService.allProjects(),
    lookup: (id) => ArdbService.allProjects().find((p) => idOf(p) === id),
    normalize: normalizeProject,
  },
  'arc-enemies': {
    list: () => ArdbService.allArcEnemies(),
    lookup: (id) => ArdbService.lookupArcEnemy(id),
    normalize: normalizeArcEnemy,
  },
  hideout: {
    list: () => GameCatalog.allHideout(),
    lookup: (id) => GameCatalog.lookupHideout(id),
    normalize: normalizeHideout,
  },
  maps: {
    list: () => GameCatalog.maps(),
    lookup: async (id) => {
      const maps = await GameCatalog.maps();
      return Array.isArray(maps) ? maps.find((m) => idOf(m) === id) : null;
    },
    normalize: normalizeMap,
  },
  trades: {
    list: () => GameCatalog.trades(),
    lookup: async (id) => {
      const trades = await GameCatalog.trades();
      return Array.isArray(trades) ? trades.find((t) => idOf(t) === id) : null;
    },
    normalize: normalizeTrade,
  },
};

async function normalizeList(kind) {
  const config = normalizers[kind];
  if (!config) return null;
  const rows = await config.list();
  return (Array.isArray(rows) ? rows : []).map(config.normalize);
}

async function normalizeOne(kind, id) {
  const config = normalizers[kind];
  if (!config || !id) return null;
  const row = await config.lookup(id);
  return row ? config.normalize(row) : null;
}

async function all() {
  const entries = await Promise.all(
    Object.keys(normalizers).map(async (kind) => [
      kind,
      await normalizeList(kind),
    ]),
  );
  return Object.fromEntries(entries);
}

export const NormalizedCatalog = {
  kinds: () => Object.keys(normalizers),
  all,
  list: normalizeList,
  lookup: normalizeOne,
};

export default NormalizedCatalog;
