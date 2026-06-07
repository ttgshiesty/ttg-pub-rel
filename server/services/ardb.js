/* =========================================================
   ARDB — Arc Raiders Database static loader
   Source: github.com/Teyk0o/ARDB (CC BY-NC-ND 4.0)

   Loads 567 items, 100 quests, and projects from local JSON
   files at boot. Zero HTTP calls — pure in-memory lookups.
   ========================================================= */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');

// ── Load items ─────────────────────────────────────────────
const _rawItems = JSON.parse(
  readFileSync(join(DATA_DIR, 'ardb-items.json'), 'utf-8'),
);
const _tags = JSON.parse(
  readFileSync(join(DATA_DIR, 'ardb-item-tags.json'), 'utf-8'),
);
const _projects = loadOptionalJson(
  [
    join(__dirname, '../../client/src/data/projects.json'),
    join(DATA_DIR, 'ardb-projects.json'),
  ],
  [],
);

function loadOptionalJson(paths, fallback = []) {
  for (const filePath of paths) {
    try {
      if (!existsSync(filePath)) continue;
      return JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (err) {
      console.error(`[ARDB] Failed to load ${filePath}:`, err.message);
    }
  }
  return fallback;
}

/** @type {Map<string, object>} */
const itemMap = new Map();
for (const item of _rawItems) {
  itemMap.set(item.id, { ...item, tag: _tags[item.id] || null });
}

// ── Load quests ────────────────────────────────────────────
/** @type {Map<string, object>} */
const questMap = new Map();
const normalizeQuestId = (id) => String(id || '').replace(/-/g, '_');
const isCanonicalQuestId = (id) => String(id || '').includes('_');
const questsAllPath = join(__dirname, '../../client/src/data/quests-all.json');
const questDirs = [
  join(__dirname, '../../client/src/data/quest'),
  join(__dirname, '../../client/src/data/quests'),
];
try {
  if (existsSync(questsAllPath)) {
    const rawQuests = JSON.parse(readFileSync(questsAllPath, 'utf-8'));
    const quests = Array.isArray(rawQuests) ? rawQuests : Object.values(rawQuests);
    for (const q of quests) {
      if (!q?.id) continue;
      const key = normalizeQuestId(q.id);
      questMap.set(key, q);
    }
  }

  if (questMap.size === 0) {
    for (const questDir of questDirs) {
      if (!existsSync(questDir)) continue;
      for (const file of readdirSync(questDir)) {
        if (!file.endsWith('.json')) continue;
        const q = JSON.parse(readFileSync(join(questDir, file), 'utf-8'));
        if (!q?.id) continue;
        const key = normalizeQuestId(q.id);
        const existing = questMap.get(key);
        if (!existing || isCanonicalQuestId(q.id)) questMap.set(key, q);
      }
    }
  }
} catch (err) {
  console.error('[ARDB] Failed to load quests:', err.message);
}

// ── Load ARC enemies/bots ─────────────────────────────────
const _arcEnemies = loadOptionalJson(
  [
    join(DATA_DIR, 'ardb-arc-enemies.json'),
    join(DATA_DIR, 'ardb-enemies.json'),
    join(__dirname, '../../client/src/data/bots.json'),
  ],
  [],
);

/** @type {Map<string, object>} */
const arcEnemyMap = new Map();
for (const enemy of Array.isArray(_arcEnemies) ? _arcEnemies : []) {
  const id = enemy?.id || enemy?.targetId || enemy?.target_id || enemy?.name;
  if (!id) continue;
  arcEnemyMap.set(String(id), enemy);
  arcEnemyMap.set(String(id).toLowerCase(), enemy);
  if (enemy.name) arcEnemyMap.set(String(enemy.name).toLowerCase(), enemy);
}

console.log(
  `[ARDB] Loaded ${itemMap.size} items, ${questMap.size} quests, ${_projects.length} projects, ${arcEnemyMap.size} ARC enemy keys`,
);

// ── Public API ─────────────────────────────────────────────

/**
 * Look up a single item by its ARDB id.
 * Returns the full item object (with `tag` merged in) or null.
 */
export function lookupItem(id) {
  if (!id) return null;
  return itemMap.get(String(id).toLowerCase()) || null;
}

/**
 * Get just the keep/sell/recycle tag for an item id.
 * @returns {'keep'|'sell'|'recycle'|null}
 */
export function getTag(id) {
  if (!id) return null;
  return _tags[String(id).toLowerCase()] || null;
}

/** All 567 items as an array. */
export function allItems() {
  return Array.from(itemMap.values());
}

/** All 100 quests as an array. */
export function allQuests() {
  return Array.from(questMap.values());
}

/** Single quest by id. */
export function lookupQuest(id) {
  if (!id) return null;
  return questMap.get(normalizeQuestId(id)) || null;
}

/** All projects with phases + requirementItemIds. */
export function allProjects() {
  return _projects;
}

/** All ARC enemies/bots as an array. */
export function allArcEnemies() {
  return Array.from(new Set(arcEnemyMap.values()));
}

/** Single ARC enemy by ARDB id, ArcTracker id, targetId, or name. */
export function lookupArcEnemy(id) {
  if (!id) return null;
  return arcEnemyMap.get(String(id)) || arcEnemyMap.get(String(id).toLowerCase()) || null;
}

export default {
  lookupItem,
  getTag,
  allItems,
  allQuests,
  lookupQuest,
  allProjects,
  allArcEnemies,
  lookupArcEnemy,
};
