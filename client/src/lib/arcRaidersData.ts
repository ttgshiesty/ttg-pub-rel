import { CatalogAPI } from './api';
import {
  getMaps as getMasterMaps,
  getProjects as getMasterProjects,
  getQuests as getMasterQuests,
  getQuestsByTrader as getMasterQuestsByTrader,
  getSkillNodesByCategory as getMasterSkillNodesByCategory,
  getTradesByTrader as getMasterTradesByTrader,
  getHideoutModuleById as getMasterHideoutModuleById,
  loadArcTrackerMasterData,
} from './arctrackerMaster';

function textValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return textValue(record.en ?? record.name ?? record.title ?? record.id);
  }
  return '';
}

function matchesTrader(entry: any, trader: string): boolean {
  const value = textValue(
    entry?.trader ?? entry?.traderName ?? entry?.vendor ?? entry?.npc,
  );
  return value.toLowerCase() === trader.toLowerCase();
}

export const ArcRaidersData = {
  async getTradesByTrader(trader: string): Promise<any[]> {
    const [catalogTrades, master] = await Promise.all([
      CatalogAPI.trades().catch(() => []),
      loadArcTrackerMasterData().catch(() => null),
    ]);
    const catalogMatches = Array.isArray(catalogTrades)
      ? catalogTrades.filter((trade) => matchesTrader(trade, trader))
      : [];
    if (catalogMatches.length > 0) return catalogMatches;
    return master ? getMasterTradesByTrader(master, trader) : [];
  },

  async getSkillNodesByCategory(category: string): Promise<any[]> {
    const [catalogSkills, master] = await Promise.all([
      CatalogAPI.skillNodes().catch(() => []),
      loadArcTrackerMasterData().catch(() => null),
    ]);
    const catalogMatches = Array.isArray(catalogSkills)
      ? catalogSkills.filter((skill) => {
          const value = textValue(
            skill?.category ?? skill?.branch ?? skill?.tree ?? skill?.type,
          );
          return value.toLowerCase() === category.toLowerCase();
        })
      : [];
    if (catalogMatches.length > 0) return catalogMatches;
    return master ? getMasterSkillNodesByCategory(master, category) : [];
  },

  async getHideoutModuleById(moduleId: string): Promise<any | undefined> {
    const [module, master] = await Promise.all([
      CatalogAPI.hideoutModule(moduleId).catch(() => null),
      loadArcTrackerMasterData().catch(() => null),
    ]);
    if (module) return module;
    return master ? getMasterHideoutModuleById(master, moduleId) : undefined;
  },

  async getQuests(): Promise<any[]> {
    const [quests, master] = await Promise.all([
      CatalogAPI.quests().catch(() => []),
      loadArcTrackerMasterData().catch(() => null),
    ]);
    return Array.isArray(quests) && quests.length > 0
      ? quests
      : master
        ? getMasterQuests(master)
        : [];
  },

  async getQuestsByTrader(trader: string): Promise<any[]> {
    const quests = await ArcRaidersData.getQuests();
    const matches = quests.filter((quest) => matchesTrader(quest, trader));
    if (matches.length > 0) return matches;
    const master = await loadArcTrackerMasterData().catch(() => null);
    return master ? getMasterQuestsByTrader(master, trader) : [];
  },

  async getProjects(): Promise<any[]> {
    const [projects, master] = await Promise.all([
      CatalogAPI.projects().catch(() => []),
      loadArcTrackerMasterData().catch(() => null),
    ]);
    return Array.isArray(projects) && projects.length > 0
      ? projects
      : master
        ? getMasterProjects(master)
        : [];
  },

  async getMaps(): Promise<any[]> {
    const [maps, master] = await Promise.all([
      CatalogAPI.maps().catch(() => []),
      loadArcTrackerMasterData().catch(() => null),
    ]);
    return Array.isArray(maps) && maps.length > 0
      ? maps
      : master
        ? getMasterMaps(master)
        : [];
  },
};

export default ArcRaidersData;

