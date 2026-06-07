export type ArcTrackerMasterData = Record<string, unknown>;

// NO CACHE - always fetch fresh data
export async function loadArcTrackerMasterData(): Promise<ArcTrackerMasterData> {
  const response = await fetch('/data/arctracker/en.json', {
    cache: 'no-cache',
  });
  if (!response.ok) {
    throw new Error(`ArcTracker master data failed: ${response.status}`);
  }

  return (await response.json()) as ArcTrackerMasterData;
}

export function getMasterSection<T = unknown>(
  data: ArcTrackerMasterData,
  ...sectionNames: string[]
): T | undefined {
  for (const name of sectionNames) {
    const direct = data[name];
    if (direct !== undefined) return direct as T;

    const foundKey = Object.keys(data).find(
      (key) => key.toLowerCase() === name.toLowerCase(),
    );
    if (foundKey) return data[foundKey] as T;
  }
  return undefined;
}

function asArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function textValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return textValue(record.en ?? record.name ?? record.title ?? record.id);
  }
  return '';
}

function matchesText(value: unknown, expected: string): boolean {
  return textValue(value).toLowerCase() === expected.toLowerCase();
}

export function getTradesByTrader(
  data: ArcTrackerMasterData,
  trader: string,
): any[] {
  return asArray(getMasterSection(data, 'Trades', 'trades')).filter((trade) =>
    matchesText(trade?.trader ?? trade?.traderName ?? trade?.vendor, trader),
  );
}

export function getSkillNodesByCategory(
  data: ArcTrackerMasterData,
  category: string,
): any[] {
  return asArray(
    getMasterSection(data, 'SkillTreePage', 'SkillTree', 'skills'),
  ).filter((skill) =>
    matchesText(
      skill?.category ?? skill?.branch ?? skill?.tree ?? skill?.type,
      category,
    ),
  );
}

export function getHideoutModuleById(
  data: ArcTrackerMasterData,
  moduleId: string,
): any | undefined {
  return asArray(getMasterSection(data, 'Hideout', 'hideout')).find(
    (module) => module?.id === moduleId || module?.slug === moduleId,
  );
}

export function getQuests(data: ArcTrackerMasterData): any[] {
  return asArray(getMasterSection(data, 'Quests', 'quests'));
}

export function getQuestsByTrader(
  data: ArcTrackerMasterData,
  trader: string,
): any[] {
  return getQuests(data).filter((quest) =>
    matchesText(quest?.trader ?? quest?.traderName ?? quest?.giver, trader),
  );
}

export function getProjects(data: ArcTrackerMasterData): any[] {
  return asArray(getMasterSection(data, 'Projects', 'projects'));
}

export function getMaps(data: ArcTrackerMasterData): any[] {
  return asArray(getMasterSection(data, 'Maps', 'maps', 'MapNames'));
}

