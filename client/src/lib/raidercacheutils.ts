/**
 * RaiderCache utility bridge.
 *
 * Stable project-native versions of the RaiderCache MetaForge helpers. These
 * intentionally key everything by item id / item_id so generated data files can
 * change without breaking item, recipe, project, quest, and marker mapping.
 */

export type RaiderCacheDecision = 'keep' | 'sell_or_recycle' | 'situational';

export type RaiderCacheRequirement = {
  item_id?: string;
  itemId?: string;
  id?: string;
  quantity?: number | string;
  value?: number | string;
};

export type RaiderCacheQuest = {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  trader?: string;
  questGiver?: string;
  objectives?: string[];
  requirements?: RaiderCacheRequirement[];
  rewardItemIds?: RaiderCacheRequirement[];
};

export type RaiderCacheProjectPhase = {
  phase?: number | string;
  name?: string;
  requirementItemIds?: RaiderCacheRequirement[];
  requirements?: RaiderCacheRequirement[];
};

export type RaiderCacheProject = {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  requirements?: RaiderCacheRequirement[];
  phases?: RaiderCacheProjectPhase[];
};

export type RaiderCacheHideoutLevel = {
  level: number;
  requirementItemIds?: RaiderCacheRequirement[];
  requirements?: RaiderCacheRequirement[];
};

export type RaiderCacheHideoutModule = {
  id: string;
  name?: string;
  title?: string;
  maxLevel?: number;
  levels?: RaiderCacheHideoutLevel[];
};

export type RaiderCacheItem = {
  id: string;
  name?: string | { en?: string };
  description?: string | { en?: string };
  type?: string;
  item_type?: string;
  subcategory?: string;
  rarity?: string;
  value?: number;
  icon?: string;
  imageFilename?: string;
  foundIn?: string[] | string;
  found_in?: string[] | string;
  recipe?: Record<string, number> | RaiderCacheRequirement[];
  crafting_components?: RaiderCacheRequirement[];
  recyclesInto?: Record<string, number>;
  salvagesInto?: Record<string, number>;
  crafting?: Record<string, number>;
  recycle_components?: RaiderCacheRequirement[] | Record<string, number>;
  game_asset_id?: string | number;
  gameAssetId?: string | number;
  stat_block?: Record<string, unknown>;
  weightKg?: number;
  stackSize?: number;
};

export type RaiderCacheUserProgress = {
  hideoutLevels: Record<string, number>;
  completedQuests: string[];
  completedProjects: string[];
  projectPhaseProgress: Record<string, number>;
  lastUpdated?: number;
};

export type RaiderCacheDependencyDetail = {
  kind: 'quest' | 'project' | 'hideout';
  id: string;
  name: string;
  totalRequired?: number;
  trader?: string;
  description?: string;
  objectives?: string[];
  phases?: Array<{
    phase: number;
    name?: string;
    requiredQuantity: number;
    status: 'completed' | 'requires_item' | 'open';
  }>;
};

export type RaiderCacheDecisionReason = {
  decision: RaiderCacheDecision;
  reasons: string[];
  dependencies?: string[];
  dependencyDetails?: RaiderCacheDependencyDetail[];
  recycleValueExceedsItem?: boolean;
};

export type RaiderCacheMapMarker = {
  id?: string;
  subcategory: string;
  category?: string;
  lat?: number;
  lng?: number;
  map?: string;
  instance_name?: string;
};

export type EnemyDropInfo = {
  enemy: string;
  displayName: string;
  tier?: 'Standard' | 'Elite';
};

export const DEFAULT_RAIDERCACHE_PROGRESS: RaiderCacheUserProgress = {
  hideoutLevels: {
    scrappy: 1,
    gunsmith: 1,
    gear_bench: 1,
    medical_lab: 1,
    explosives_station: 1,
    utility_station: 1,
    refiner: 1,
    workbench: 1,
  },
  completedQuests: [],
  completedProjects: [],
  projectPhaseProgress: {},
  lastUpdated: Date.now(),
};

export const ENEMY_DROPS: Record<string, EnemyDropInfo> = {
  'wasp-driver': { enemy: 'wasp', displayName: 'Wasp' },
  'damaged-wasp-driver': { enemy: 'wasp', displayName: 'Wasp' },
  'hornet-driver': { enemy: 'hornet', displayName: 'Hornet' },
  'damaged-hornet-driver': { enemy: 'hornet', displayName: 'Hornet' },
  'danaged-hornet-driver': { enemy: 'hornet', displayName: 'Hornet' },
  'sentinel-part': { enemy: 'sentinel', displayName: 'Sentinel' },
  'sentinel-firing-core': { enemy: 'sentinel', displayName: 'Sentinel' },
  'tick-pod': { enemy: 'tick', displayName: 'Tick' },
  'damaged-tick-pod': { enemy: 'tick', displayName: 'Tick' },
  'fireball-burner': { enemy: 'fireball', displayName: 'Fireball' },
  'damaged-fireball-burner': { enemy: 'fireball', displayName: 'Fireball' },
  'bastion-part': { enemy: 'bastion', displayName: 'Bastion' },
  'bastion-cell': { enemy: 'bastion', displayName: 'Bastion' },
  'bombardier-cell': { enemy: 'bombardier', displayName: 'Bombardier' },
  'surveyor-vault': { enemy: 'surveyor', displayName: 'Surveyor' },
  'snitch-scanner': { enemy: 'snitch', displayName: 'Snitch' },
  'rocketeer-part': { enemy: 'rocketeer', displayName: 'Rocketeer' },
  'rocketeer-driver': { enemy: 'rocketeer', displayName: 'Rocketeer' },
  'damaged-rocketeer-part': { enemy: 'rocketeer', displayName: 'Rocketeer' },
  'bison-driver': { enemy: 'bison', displayName: 'Bison' },
  'leaper-pulse-unit': { enemy: 'leaper', displayName: 'Leaper' },
  'pop-trigger': { enemy: 'pop', displayName: 'Pop' },
  'arc-motion-core': { enemy: 'arc', displayName: 'ARC Enemies' },
  'damaged-arc-motion-core': { enemy: 'arc', displayName: 'ARC Enemies' },
  'arc-powercell': { enemy: 'arc', displayName: 'ARC Enemies' },
  'damaged-arc-powercell': { enemy: 'arc', displayName: 'ARC Enemies' },
  'advanced-arc-powercell': {
    enemy: 'arc',
    displayName: 'Elite ARC Enemies',
    tier: 'Elite',
  },
};

for (const [itemId, info] of Object.entries({ ...ENEMY_DROPS })) {
  for (const alias of itemIdAliases(itemId)) {
    ENEMY_DROPS[alias] = info;
  }
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const ROMAN_REGEX = /^(.+?)[_-]([ivx]+)$/i;

function textValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'en' in value) {
    return String((value as { en?: unknown }).en ?? '');
  }
  return '';
}

function itemType(item: RaiderCacheItem): string {
  return item.item_type ?? item.type ?? item.subcategory ?? '';
}

function itemName(item: RaiderCacheItem): string {
  return textValue(item.name) || item.id;
}

function itemDescription(item: RaiderCacheItem): string {
  return textValue(item.description);
}

function normalizeZoneList(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((zone) => zone.trim())
      .filter(Boolean);
  }
  return [];
}

function requirementId(req: RaiderCacheRequirement): string | null {
  return req.item_id ?? req.itemId ?? req.id ?? null;
}

function itemIdAliases(id: string): string[] {
  const lower = id.toLowerCase();
  return Array.from(
    new Set([lower, lower.replace(/_/g, '-'), lower.replace(/-/g, '_')]),
  );
}

function sameItemId(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  return itemIdAliases(a).includes(b.toLowerCase());
}

function requirementQuantity(req: RaiderCacheRequirement): number {
  const quantity = Number(req.quantity ?? req.value ?? 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

export function normalizeRaiderCacheItem(item: RaiderCacheItem): RaiderCacheItem {
  return {
    ...item,
    type: itemType(item),
    name: itemName(item),
    description: itemDescription(item),
    foundIn: normalizeZoneList(item.foundIn ?? item.found_in),
  };
}

export function normalizeRaiderCacheItems(items: RaiderCacheItem[]): RaiderCacheItem[] {
  return items.map(normalizeRaiderCacheItem);
}

export function buildItemIndex(items: RaiderCacheItem[]): Map<string, RaiderCacheItem> {
  const index = new Map<string, RaiderCacheItem>();
  for (const item of items) {
    if (!item?.id) continue;
    const normalized = normalizeRaiderCacheItem(item);
    index.set(item.id, normalized);
    for (const alias of itemIdAliases(item.id)) {
      index.set(alias, normalized);
    }
    for (const assetId of [item.game_asset_id, item.gameAssetId]) {
      if (assetId !== undefined && assetId !== null && assetId !== '') {
        index.set(String(assetId), normalized);
      }
    }
  }
  return index;
}

export function recipeToRecord(
  recipe: RaiderCacheItem['recipe'] | RaiderCacheItem['crafting_components'],
): Record<string, number> {
  if (!recipe) return {};
  if (!Array.isArray(recipe)) return recipe;
  return recipe.reduce<Record<string, number>>((acc, req) => {
    const id = requirementId(req);
    if (!id) return acc;
    acc[id] = (acc[id] ?? 0) + requirementQuantity(req);
    return acc;
  }, {});
}

export function recycleToRecord(
  item: RaiderCacheItem,
): Record<string, number> {
  const recycleData =
    item.recyclesInto ?? item.salvagesInto ?? item.crafting ?? item.recycle_components;
  if (!recycleData) return {};
  if (!Array.isArray(recycleData)) return recycleData;
  return recipeToRecord(recycleData);
}

export function buildReverseRecipeIndex(
  items: RaiderCacheItem[],
): Map<string, string[]> {
  const reverseIndex = new Map<string, string[]>();

  for (const item of items) {
    const recipe = recipeToRecord(item.recipe ?? item.crafting_components);
    for (const ingredientId of Object.keys(recipe)) {
      const usedBy = reverseIndex.get(ingredientId) ?? [];
      usedBy.push(item.id);
      reverseIndex.set(ingredientId, usedBy);
    }
  }

  return reverseIndex;
}

export function getItemsUsingIngredient(
  ingredientId: string,
  reverseIndex: Map<string, string[]>,
  allItems: RaiderCacheItem[],
): RaiderCacheItem[] {
  const itemIds = reverseIndex.get(ingredientId) ?? [];
  const itemIndex = buildItemIndex(allItems);
  return itemIds
    .map((id) => itemIndex.get(id) ?? itemIndex.get(id.toLowerCase()))
    .filter((item): item is RaiderCacheItem => Boolean(item));
}

export function getRecipeQuantity(
  item: RaiderCacheItem,
  ingredientId: string,
): number {
  return recipeToRecord(item.recipe ?? item.crafting_components)[ingredientId] ?? 0;
}

export function isBlueprint(item: RaiderCacheItem): boolean {
  return itemType(item).toLowerCase().includes('blueprint');
}

export function getEnemyDropInfo(itemId: string): EnemyDropInfo | null {
  return ENEMY_DROPS[itemId] ?? null;
}

export function isEnemyDrop(itemId: string): boolean {
  return itemId in ENEMY_DROPS;
}

export class WeaponGrouper {
  static getTierNumber(id: string): number {
    const match = id.match(ROMAN_REGEX);
    if (!match) return 0;
    const romanNumeral = match[2].toUpperCase();
    const index = ROMAN_NUMERALS.indexOf(romanNumeral);
    return index >= 0 ? index + 1 : 0;
  }

  static isWeaponVariant(item: RaiderCacheItem): boolean {
    return ROMAN_REGEX.test(item.id);
  }

  static getBaseId(id: string): string {
    const match = id.match(ROMAN_REGEX);
    return match ? match[1] : id;
  }

  static getBaseName(name: string): string {
    return name.replace(/\s+[IVX]+$/i, '').trim();
  }
}

export function getRelevantMarkerSubcategories(item: RaiderCacheItem): string[] {
  const normalized = normalizeRaiderCacheItem(item);
  const zones = normalizeZoneList(normalized.foundIn as string[] | string);
  const type = itemType(normalized).toLowerCase();
  const subcategories = new Set<string>();

  if (type === 'nature' || zones.includes('Nature')) {
    subcategories.add('mushroom');
    subcategories.add('prickly-pear');
    subcategories.add('great-mullein');
    subcategories.add('apricot');
    subcategories.add('agave');
  }

  if (type.includes('weapon')) subcategories.add('weapon_case');
  if (type.includes('medical')) subcategories.add('med_crate');
  if (type.includes('ammo') || type.includes('ammunition')) subcategories.add('ammo_crate');
  if (type.includes('utility')) subcategories.add('utility_crate');

  if (zones.includes('ARC')) {
    [
      'tick',
      'wasp',
      'sentinel',
      'bastion',
      'turret',
      'pop',
      'fireball',
      'rocketeer',
      'snitch',
      'hornet',
      'bison',
      'rollbot',
      'bombardier',
      'queen',
      'arc_husk',
      'arc_courier',
      'arc_probe',
      'baron_husk',
    ].forEach((subcategory) => subcategories.add(subcategory));
  }

  if (zones.includes('Raider')) subcategories.add('raider_cache');

  if (zones.includes('Security')) {
    subcategories.add('security_breach');
    subcategories.add('locker');
  }

  if (subcategories.size > 0) return Array.from(subcategories);

  return [
    'base_container',
    'breachable_container',
    'basket',
    'locker',
    'car',
    'utility_crate',
    'bag',
    'box',
  ];
}

export function getRelevantMaps(item: RaiderCacheItem): string[] {
  const zones = normalizeZoneList(item.foundIn ?? item.found_in);
  if (zones.includes('Exodus') || zones.includes('Hideout')) return [];
  return ['dam-battlegrounds', 'burial-city', 'spaceport', 'blue-gate', 'stella-montis'];
}

export function filterMarkersForItem<T extends RaiderCacheMapMarker>(
  item: RaiderCacheItem,
  markers: T[],
): T[] {
  const relevantSubcategories = getRelevantMarkerSubcategories(item);
  return markers.filter((marker) => relevantSubcategories.includes(marker.subcategory));
}

export function getItemLocationDescription(item: RaiderCacheItem): string {
  const zones = normalizeZoneList(item.foundIn ?? item.found_in);
  if (zones.length === 0) return 'Search for loot containers';
  if (zones.includes('ARC')) return 'Hunt ARC enemies or search ARC containers';
  if (zones.includes('Raider')) return 'Search Raider camps and caches';
  if (zones.includes('Nature')) return 'Gather from nature resource nodes';
  const raidZones = zones.filter((zone) => zone !== 'Exodus' && zone !== 'Hideout');
  if (raidZones.length > 0) return `Search ${raidZones.join(', ')} zones`;
  return 'Search for loot containers';
}

export function formatSubcategoryName(subcategory: string): string {
  const specialNames: Record<string, string> = {
    arc_husk: 'ARC Husk',
    arc_courier: 'ARC Courier',
    arc_probe: 'ARC Probe',
    baron_husk: 'Baron Husk',
    med_crate: 'Medical Crate',
    'prickly-pear': 'Prickly Pear',
    'great-mullein': 'Great Mullein',
  };

  return (
    specialNames[subcategory] ??
    subcategory
      .replace(/[_-]/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}

export function searchRaiderCacheItems<T extends RaiderCacheItem>(
  items: T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  return items
    .map((item) => {
      const name = itemName(item).toLowerCase();
      const description = itemDescription(item).toLowerCase();
      const type = itemType(item).toLowerCase();
      const id = item.id.toLowerCase();
      let score = 0;
      if (name === needle) score += 100;
      if (name.startsWith(needle)) score += 60;
      if (name.includes(needle)) score += 40;
      if (type.includes(needle)) score += 25;
      if (id.includes(needle)) score += 15;
      if (description.includes(needle)) score += 10;
      return { item, score };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || itemName(a.item).localeCompare(itemName(b.item)))
    .map((result) => result.item);
}

export function isCosmetic(item: RaiderCacheItem): boolean {
  const name = itemName(item).toLowerCase();
  return (
    name.includes('(outfit)') ||
    name.includes('(emote)') ||
    name.includes('(backpack charm)') ||
    name.includes('(color)') ||
    name.includes('(colour)')
  );
}

export class RaiderCacheDecisionEngine {
  private items: Map<string, RaiderCacheItem>;
  private itemList: RaiderCacheItem[];
  private hideoutModules: RaiderCacheHideoutModule[];
  private quests: RaiderCacheQuest[];
  private projects: RaiderCacheProject[];
  private reverseRecipeIndex: Map<string, string[]>;

  constructor(
    items: RaiderCacheItem[],
    hideoutModules: RaiderCacheHideoutModule[] = [],
    quests: RaiderCacheQuest[] = [],
    projects: RaiderCacheProject[] = [],
  ) {
    this.itemList = normalizeRaiderCacheItems(items);
    this.items = buildItemIndex(this.itemList);
    this.hideoutModules = hideoutModules;
    this.quests = quests;
    this.projects = projects;
    this.reverseRecipeIndex = buildReverseRecipeIndex(this.itemList);
  }

  getDecision(
    item: RaiderCacheItem,
    userProgress: RaiderCacheUserProgress = DEFAULT_RAIDERCACHE_PROGRESS,
  ): RaiderCacheDecisionReason {
    const normalized = normalizeRaiderCacheItem(item);
    const type = itemType(normalized).toLowerCase();
    const rarity = normalized.rarity?.toLowerCase() ?? '';

    if (normalized.id === 'assorted_seeds') {
      return this.finalizeDecision(normalized, {
        decision: 'keep',
        reasons: ['Valuable currency item', 'Used for trading with Celeste'],
      });
    }

    if (rarity === 'legendary') {
      return this.finalizeDecision(normalized, {
        decision: 'keep',
        reasons: ['Legendary rarity - extremely valuable', 'Keep all legendaries'],
      });
    }

    if (type.includes('blueprint')) {
      return this.finalizeDecision(normalized, {
        decision: 'situational',
        reasons: [
          'Blueprint - valuable for unlocking crafting recipes',
          'Review carefully before selling or recycling',
        ],
      });
    }

    if (type.includes('weapon') || WeaponGrouper.isWeaponVariant(normalized)) {
      return this.finalizeDecision(normalized, {
        decision: 'situational',
        reasons: ['Weapon - review based on your current loadout'],
      });
    }

    if (type.includes('ammo') || type.includes('ammunition')) {
      return this.finalizeDecision(normalized, {
        decision: 'situational',
        reasons: ['Ammunition - review based on your weapon loadout'],
      });
    }

    if (type.includes('quick use') || type.includes('consumable')) {
      return this.finalizeDecision(normalized, {
        decision: 'situational',
        reasons: ['Consumable item - review based on inventory needs'],
      });
    }

    if (type.includes('key')) {
      return this.finalizeDecision(normalized, {
        decision: 'situational',
        reasons: ['Key - opens locked areas and containers'],
      });
    }

    const questUse = this.isUsedInActiveQuests(normalized, userProgress);
    if (questUse.isUsed) {
      return this.finalizeDecision(normalized, {
        decision: 'keep',
        reasons: [
          `Required for quest: ${questUse.questNames.join(', ')}`,
          `Total required for active quests: ${questUse.totalRequired}`,
        ],
        dependencies: questUse.questNames,
        dependencyDetails: questUse.details,
      });
    }

    const projectUse = this.isUsedInActiveProjects(normalized, userProgress);
    if (projectUse.isUsed) {
      return this.finalizeDecision(normalized, {
        decision: 'keep',
        reasons: [
          `Needed for project: ${projectUse.projectNames.join(', ')}`,
          `Total required for active projects: ${projectUse.totalRequired}`,
          ...projectUse.phaseRequirements.map((req) => `Phase requirement: ${req}`),
        ],
        dependencies: projectUse.projectNames,
        dependencyDetails: projectUse.details,
      });
    }

    const upgradeUse = this.isNeededForUpgrades(normalized, userProgress);
    if (upgradeUse.isNeeded) {
      return this.finalizeDecision(normalized, {
        decision: 'keep',
        reasons: [`Required for hideout upgrade: ${upgradeUse.moduleNames.join(', ')}`],
        dependencies: upgradeUse.moduleNames,
      });
    }

    const craftingValue = this.evaluateCraftingValue(normalized);
    if (craftingValue.isValuable) {
      return this.finalizeDecision(normalized, {
        decision: 'situational',
        reasons: [
          `Used in ${craftingValue.recipeCount} crafting recipes`,
          craftingValue.details,
        ],
      });
    }

    if (this.isHighValueTrinket(normalized)) {
      return this.finalizeDecision(normalized, {
        decision: 'sell_or_recycle',
        reasons: [`High value (${normalized.value ?? 0} coins)`, 'No crafting or upgrade use'],
      });
    }

    if (normalized.id === 'snitch-scanner') {
      return this.finalizeDecision(normalized, {
        decision: 'situational',
        reasons: ['Call ARC can be used to quickly farm quest points'],
      });
    }

    if (Object.keys(recycleToRecord(normalized)).length > 0) {
      const recycleValue = this.evaluateRecycleValue(normalized);
      if (recycleValue.isValuable) {
        return this.finalizeDecision(normalized, {
          decision: 'sell_or_recycle',
          reasons: [
            `Recycles into: ${recycleValue.description}`,
            `Recycle value estimate: ${recycleValue.estimatedValue} coins`,
          ],
        });
      }
    }

    if (['rare', 'epic'].includes(rarity)) {
      return this.finalizeDecision(normalized, {
        decision: 'situational',
        reasons: [`${normalized.rarity} rarity`, 'May have future use - review carefully'],
      });
    }

    return this.finalizeDecision(normalized, {
      decision: 'sell_or_recycle',
      reasons: ['No immediate use found', 'Safe to sell or recycle'],
    });
  }

  getItemsWithDecisions(
    userProgress: RaiderCacheUserProgress = DEFAULT_RAIDERCACHE_PROGRESS,
  ): Array<RaiderCacheItem & { decisionData: RaiderCacheDecisionReason }> {
    return this.itemList.map((item) => ({
      ...item,
      decisionData: this.getDecision(item, userProgress),
    }));
  }

  getDecisionStats(
    userProgress: RaiderCacheUserProgress = DEFAULT_RAIDERCACHE_PROGRESS,
  ): Record<RaiderCacheDecision, number> {
    return this.itemList.reduce<Record<RaiderCacheDecision, number>>(
      (stats, item) => {
        stats[this.getDecision(item, userProgress).decision] += 1;
        return stats;
      },
      { keep: 0, sell_or_recycle: 0, situational: 0 },
    );
  }

  getItemsUsingIngredient(itemId: string): RaiderCacheItem[] {
    return getItemsUsingIngredient(itemId, this.reverseRecipeIndex, this.itemList);
  }

  private finalizeDecision(
    item: RaiderCacheItem,
    decision: RaiderCacheDecisionReason,
  ): RaiderCacheDecisionReason {
    if (Object.keys(recycleToRecord(item)).length === 0) return decision;
    const recycleValue = this.evaluateRecycleValue(item);
    if (recycleValue.estimatedValue > (item.value ?? 0)) {
      return { ...decision, recycleValueExceedsItem: true };
    }
    return decision;
  }

  private isUsedInActiveQuests(
    item: RaiderCacheItem,
    userProgress: RaiderCacheUserProgress,
  ): {
    isUsed: boolean;
    questNames: string[];
    totalRequired: number;
    details: RaiderCacheDependencyDetail[];
  } {
    const questNames: string[] = [];
    let totalRequired = 0;
    const details: RaiderCacheDependencyDetail[] = [];

    for (const quest of this.quests) {
      if (userProgress.completedQuests.includes(quest.id)) continue;
      const requirements = [...(quest.requirements ?? []), ...(quest.rewardItemIds ?? [])];
      const requiredQuantity = requirements
        .filter((req) => sameItemId(requirementId(req), item.id))
        .reduce((sum, req) => sum + requirementQuantity(req), 0);
      if (requiredQuantity <= 0) continue;

      const name = quest.name ?? quest.title ?? quest.id;
      questNames.push(name);
      totalRequired += requiredQuantity;
      details.push({
        kind: 'quest',
        id: quest.id,
        name,
        totalRequired: requiredQuantity,
        trader: quest.trader ?? quest.questGiver,
        description: quest.description,
        objectives: Array.isArray(quest.objectives) ? quest.objectives : [],
      });
    }

    return { isUsed: questNames.length > 0, questNames, totalRequired, details };
  }

  private isUsedInActiveProjects(
    item: RaiderCacheItem,
    userProgress: RaiderCacheUserProgress,
  ): {
    isUsed: boolean;
    projectNames: string[];
    phaseRequirements: string[];
    totalRequired: number;
    details: RaiderCacheDependencyDetail[];
  } {
    const projectNames: string[] = [];
    const phaseRequirements: string[] = [];
    let totalRequired = 0;
    const details: RaiderCacheDependencyDetail[] = [];

    for (const project of this.projects) {
      const completedPhase =
        userProgress.projectPhaseProgress?.[project.id] ??
        (userProgress.completedProjects.includes(project.id) ? Number.MAX_SAFE_INTEGER : 0);
      const projectName = project.name ?? project.title ?? project.id;
      let requiredInProject = 0;
      const phaseDetails: RaiderCacheDependencyDetail['phases'] = [];

      const legacyQuantity = (project.requirements ?? [])
        .filter((req) => sameItemId(requirementId(req), item.id))
        .reduce((sum, req) => sum + requirementQuantity(req), 0);
      if (legacyQuantity > 0) {
        const status = completedPhase >= 1 ? 'completed' : 'requires_item';
        phaseDetails.push({
          phase: 1,
          requiredQuantity: legacyQuantity,
          status,
        });
        if (completedPhase < 1) {
          requiredInProject += legacyQuantity;
          phaseRequirements.push(`${projectName} (Phase 1) x${legacyQuantity}`);
        }
      }

      for (const phase of project.phases ?? []) {
        const phaseNumber = Number(phase.phase) || 1;
        const requirements = phase.requirementItemIds ?? phase.requirements ?? [];
        const requiredInPhase = requirements
          .filter((req) => sameItemId(requirementId(req), item.id))
          .reduce((sum, req) => sum + requirementQuantity(req), 0);
        if (requiredInPhase <= 0) continue;

        const status = phaseNumber <= completedPhase ? 'completed' : 'requires_item';
        phaseDetails.push({
          phase: phaseNumber,
          name: phase.name,
          requiredQuantity: requiredInPhase,
          status,
        });

        if (phaseNumber > completedPhase) {
          requiredInProject += requiredInPhase;
          const phaseLabel = phase.name
            ? `${projectName} (Phase ${phaseNumber}: ${phase.name}) x${requiredInPhase}`
            : `${projectName} (Phase ${phaseNumber}) x${requiredInPhase}`;
          phaseRequirements.push(phaseLabel);
        }
      }

      if (requiredInProject <= 0) continue;
      projectNames.push(projectName);
      totalRequired += requiredInProject;
      details.push({
        kind: 'project',
        id: project.id,
        name: projectName,
        totalRequired: requiredInProject,
        description: project.description,
        phases: phaseDetails,
      });
    }

    return {
      isUsed: phaseRequirements.length > 0,
      projectNames,
      phaseRequirements,
      totalRequired,
      details,
    };
  }

  private isNeededForUpgrades(
    item: RaiderCacheItem,
    userProgress: RaiderCacheUserProgress,
  ): { isNeeded: boolean; moduleNames: string[] } {
    const moduleNames: string[] = [];

    for (const module of this.hideoutModules) {
      const currentLevel = userProgress.hideoutLevels[module.id] ?? 1;
      if (module.maxLevel && currentLevel >= module.maxLevel) continue;

      for (const levelData of module.levels ?? []) {
        if (levelData.level <= currentLevel) continue;
        const requirements = levelData.requirementItemIds ?? levelData.requirements ?? [];
        if (requirements.some((req) => sameItemId(requirementId(req), item.id))) {
          moduleNames.push(`${module.name ?? module.title ?? module.id} (Level ${levelData.level})`);
        }
      }
    }

    return { isNeeded: moduleNames.length > 0, moduleNames };
  }

  private evaluateCraftingValue(item: RaiderCacheItem): {
    isValuable: boolean;
    recipeCount: number;
    details: string;
  } {
    const recipeCount = this.reverseRecipeIndex.get(item.id)?.length ?? 0;
    const rarity = item.rarity?.toLowerCase() ?? '';
    const isRare = ['rare', 'epic', 'legendary'].includes(rarity);
    return {
      isValuable: recipeCount > 2 || (recipeCount > 0 && isRare),
      recipeCount,
      details: isRare ? 'Rare crafting material' : 'Common crafting ingredient',
    };
  }

  private isHighValueTrinket(item: RaiderCacheItem): boolean {
    const type = itemType(item).toLowerCase();
    const hasNoRecipe = Object.keys(recipeToRecord(item.recipe ?? item.crafting_components)).length === 0;
    const hasNoRecycle = Object.keys(recycleToRecord(item)).length === 0;
    const isTrinket = ['trinket', 'misc', 'collectible'].some((keyword) =>
      type.includes(keyword),
    );
    return (item.value ?? 0) >= 1000 && hasNoRecipe && hasNoRecycle && isTrinket;
  }

  private evaluateRecycleValue(item: RaiderCacheItem): {
    isValuable: boolean;
    description: string;
    estimatedValue: number;
  } {
    const recycleData = recycleToRecord(item);
    const materials: string[] = [];
    let totalValue = 0;

    for (const [itemId, quantity] of Object.entries(recycleData)) {
      const outputItem = this.items.get(itemId) ?? this.items.get(itemId.toLowerCase());
      if (!outputItem) continue;
      materials.push(`${quantity}x ${itemName(outputItem)}`);
      totalValue += (outputItem.value ?? 0) * quantity;
    }

    return {
      isValuable: totalValue > (item.value ?? 0) * 0.5,
      description: materials.join(', ') || 'Nothing',
      estimatedValue: totalValue,
    };
  }
}
