import { useMemo, useState } from 'react';
import PROJECTS from '../data/projects.json';
import QUESTS_RAW from '../data/quests-all.json';
import WORKSHOP_UPGRADES from '../data/workshop_upgrades.json';
import { usePlayer } from '../context/PlayerContext';
import { ALL_ITEMS } from '../lib/itemDb';
import {
  DEFAULT_RAIDERCACHE_PROGRESS,
  RaiderCacheDecisionEngine,
  getEnemyDropInfo,
  getItemLocationDescription,
  isCosmetic,
  searchRaiderCacheItems,
  type RaiderCacheDecision,
  type RaiderCacheDecisionReason,
  type RaiderCacheHideoutModule,
  type RaiderCacheItem,
  type RaiderCacheProject,
  type RaiderCacheQuest,
} from '../lib/raiderCacheUtils';
import './itemsraidercachepage.css';

type ItemWithDecision = RaiderCacheItem & {
  decisionData: RaiderCacheDecisionReason;
};

type SortKey = 'name' | 'value' | 'rarity' | 'type' | 'decision';
type ViewMode = 'grid' | 'list' | 'compact';
type OwnershipFilter = 'all' | 'have' | 'needed' | 'missing';

const RARITY_ORDER: Record<string, number> = {
  legendary: 5,
  epic: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
};

function en(value: any): string {
  if (typeof value === 'string') return value;
  return value?.en ?? value?.['en-US'] ?? '';
}

function normalizeRequirement(req: any) {
  return {
    itemId: req?.itemId ?? req?.item_id ?? req?.item?.id,
    quantity: Number(req?.quantity ?? 1) || 1,
  };
}

function normalizeQuest(raw: any): RaiderCacheQuest {
  return {
    id: raw.id,
    name: en(raw.name) || raw.name || raw.id,
    description: en(raw.description) || raw.description,
    objectives: Array.isArray(raw.objectives) ? raw.objectives.map(en) : [],
    trader: raw.trader_name ?? raw.trader ?? raw.questGiver,
    requirements: (raw.required_items ?? raw.requirements ?? [])
      .map(normalizeRequirement)
      .filter((req: any) => req.itemId),
  };
}

function normalizeProject(raw: any): RaiderCacheProject {
  return {
    id: raw.id,
    name: en(raw.name) || raw.name || raw.id,
    description: en(raw.description) || raw.description,
    phases: (raw.phases ?? []).map((phase: any) => ({
      phase: Number(phase.phase) || 1,
      name: en(phase.name) || phase.name,
      requirementItemIds: (phase.requirementItemIds ?? phase.requirements ?? [])
        .map(normalizeRequirement)
        .filter((req: any) => req.itemId),
    })),
  };
}

function normalizeHideoutModule(raw: any): RaiderCacheHideoutModule {
  return {
    id: raw.id,
    name: en(raw.name) || raw.name || raw.id,
    maxLevel: raw.maxLevel ?? raw.levels?.length ?? 0,
    levels: (raw.levels ?? []).map((level: any) => ({
      level: Number(level.level) || 1,
      requirementItemIds: (level.requirementItemIds ?? level.items ?? [])
        .map(normalizeRequirement)
        .filter((req: any) => req.itemId),
    })),
  };
}

function getRaiderCacheItems(): RaiderCacheItem[] {
  const rows = ALL_ITEMS;
  return rows.map((item: any) => ({
    ...item,
    type: item.item_type ?? item.type ?? item.subcategory ?? 'Unknown',
    foundIn: item.foundIn ?? item.found_in ?? item.loot_area ?? [],
    imageFilename: item.imageFilename ?? item.icon,
    weightKg: item.weightKg ?? item.stat_block?.weight ?? 0,
    stackSize: item.stackSize ?? item.stat_block?.stackSize ?? 1,
    recipe: item.recipe ?? item.crafting_components,
  }));
}

function decisionLabel(decision: RaiderCacheDecision) {
  if (decision === 'keep') return 'KEEP';
  if (decision === 'sell_or_recycle') return 'SAFE TO SELL';
  return 'YOUR CALL';
}

function decisionIcon(decision: RaiderCacheDecision) {
  if (decision === 'keep') return '!';
  if (decision === 'sell_or_recycle') return '$';
  return '?';
}

function itemType(item: RaiderCacheItem) {
  return item.item_type ?? item.type ?? item.subcategory ?? 'Unknown';
}

function itemImage(item: RaiderCacheItem) {
  return item.icon ?? item.imageFilename ?? '';
}

function normalizeItemId(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
}

function getInventoryItemId(item: any): string {
  return normalizeItemId(
    item?.itemId ??
      item?.itemID ??
      item?.id ??
      item?.item_id ??
      item?.assetId ??
      '',
  );
}

function getInventoryQuantity(item: any): number {
  return (
    Number(item?.quantity ?? item?.qty ?? item?.count ?? item?.amount ?? 1) || 1
  );
}

function buildOwnedQuantities(stashItems: any[]): Map<string, number> {
  const owned = new Map<string, number>();
  for (const item of stashItems) {
    const itemId = getInventoryItemId(item);
    if (!itemId) continue;
    owned.set(itemId, (owned.get(itemId) || 0) + getInventoryQuantity(item));
  }
  return owned;
}

function filterAndSortItems(
  items: ItemWithDecision[],
  query: string,
  decisions: Set<RaiderCacheDecision>,
  rarities: Set<string>,
  categories: Set<string>,
  ownership: OwnershipFilter,
  ownedQuantities: Map<string, number>,
  sortBy: SortKey,
  sortDirection: 'asc' | 'desc',
) {
  let result = query.trim()
    ? (searchRaiderCacheItems(items, query) as ItemWithDecision[])
    : [...items];

  if (decisions.size > 0) {
    result = result.filter((item) => decisions.has(item.decisionData.decision));
  }

  if (rarities.size > 0) {
    result = result.filter((item) =>
      rarities.has((item.rarity ?? '').toLowerCase()),
    );
  }

  if (categories.size > 0) {
    result = result.filter((item) => categories.has(itemType(item)));
  }

  if (ownership !== 'all') {
    result = result.filter((item) => {
      const ownedQuantity = ownedQuantities.get(normalizeItemId(item.id)) || 0;
      const isNeeded = item.decisionData.decision === 'keep';
      if (ownership === 'have') return ownedQuantity > 0;
      if (ownership === 'needed') return isNeeded;
      return isNeeded && ownedQuantity <= 0;
    });
  }

  const direction = sortDirection === 'asc' ? 1 : -1;
  result.sort((a, b) => {
    if (sortBy === 'value')
      return ((a.value ?? 0) - (b.value ?? 0)) * direction;
    if (sortBy === 'rarity') {
      return (
        ((RARITY_ORDER[(a.rarity ?? '').toLowerCase()] ?? 0) -
          (RARITY_ORDER[(b.rarity ?? '').toLowerCase()] ?? 0)) *
        direction
      );
    }
    if (sortBy === 'type')
      return itemType(a).localeCompare(itemType(b)) * direction;
    if (sortBy === 'decision') {
      return (
        a.decisionData.decision.localeCompare(b.decisionData.decision) *
        direction
      );
    }
    return (
      String(a.name ?? a.id).localeCompare(String(b.name ?? b.id)) * direction
    );
  });

  return result;
}

function ItemCard({
  item,
  onClick,
}: {
  item: ItemWithDecision;
  onClick: (item: ItemWithDecision) => void;
}) {
  const decision = item.decisionData.decision;
  const rarity = (item.rarity ?? 'common').toLowerCase();
  return (
    <button
      className={`rc-item-card rarity-${rarity} decision-${decision}`}
      onClick={() => onClick(item)}
      type="button"
    >
      <div className="rc-item-card__header">
        <span className="rc-item-card__rarity-badge">{item.rarity ?? 'Common'}</span>
        <span className="rc-item-card__favorite">☆</span>
      </div>
      <div className="rc-item-card__image-container">
        {itemImage(item) ? (
          <img className="rc-item-card__image" src={itemImage(item)} alt={String(item.name)} />
        ) : (
          <div className="rc-item-card__placeholder">?</div>
        )}
      </div>
      <div className="rc-item-card__content">
        <h3 className="rc-item-card__name">{String(item.name ?? item.id)}</h3>
        <div className="rc-item-card__meta">
          <span className="rc-item-card__value">{(item.value ?? 0).toLocaleString()} $</span>
          <span className={`rc-decision-badge rc-decision-badge--${decision}`}>
            <span>{decisionIcon(decision)}</span>
            <span>{decisionLabel(decision)}</span>
          </span>
        </div>
      </div>
    </button>
  );
}

function ItemModal({
  item,
  engine,
  onClose,
}: {
  item: ItemWithDecision | null;
  engine: RaiderCacheDecisionEngine;
  onClose: () => void;
}) {
  if (!item) return null;
  const usedBy = engine.getItemsUsingIngredient(item.id).slice(0, 12);
  const enemyDrop = getEnemyDropInfo(item.id);
  return (
    <div className="rc-modal active">
      <button className="rc-modal-overlay" onClick={onClose} type="button" aria-label="Close" />
      <div className="rc-modal-content">
        <button className="rc-modal-close" onClick={onClose} type="button">
          x
        </button>
        <div className="rc-item-modal__header">
          <div className="rc-item-modal__image-container">
            {itemImage(item) && <img src={itemImage(item)} alt="" />}
          </div>
          <div>
            <h2>{String(item.name ?? item.id)}</h2>
            <div className="rc-item-modal__badges">
              <span className={`rc-rarity-badge rarity-${(item.rarity ?? 'common').toLowerCase()}`}>
                {item.rarity ?? 'Common'}
              </span>
              <span className={`rc-decision-badge rc-decision-badge--${item.decisionData.decision}`}>
                {decisionLabel(item.decisionData.decision)}
              </span>
            </div>
          </div>
        </div>
        <div className="rc-item-modal__body">
          <section>
            <h3>Description</h3>
            <p>{String(item.description ?? 'No description available.')}</p>
          </section>
          <section>
            <h3>Decision Analysis</h3>
            <ul className="rc-reason-list">
              {item.decisionData.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </section>
          {item.decisionData.dependencyDetails?.length ? (
            <section>
              <h3>Needed For</h3>
              <div className="rc-dependency-list">
                {item.decisionData.dependencyDetails.map((dep) => (
                  <div key={`${dep.kind}-${dep.id}`} className="rc-dependency-pill">
                    <strong>{dep.kind.toUpperCase()}</strong>
                    <span>{dep.name}</span>
                    {dep.totalRequired ? <em>x{dep.totalRequired}</em> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          <section className="rc-item-modal__grid">
            <div>
              <h3>Properties</h3>
              <dl className="rc-property-list">
                <dt>Type</dt>
                <dd>{itemType(item)}</dd>
                <dt>Value</dt>
                <dd>{(item.value ?? 0).toLocaleString()} $</dd>
                <dt>Weight</dt>
                <dd>{String(item.weightKg ?? item.stat_block?.weight ?? 0)}</dd>
                <dt>Stack</dt>
                <dd>{String(item.stackSize ?? item.stat_block?.stackSize ?? 1)}</dd>
              </dl>
            </div>
            <div>
              <h3>Location</h3>
              <p>{getItemLocationDescription(item)}</p>
              {enemyDrop ? (
                <p className="rc-enemy-drop">Dropped by: {enemyDrop.displayName}</p>
              ) : null}
            </div>
          </section>
          {usedBy.length ? (
            <section>
              <h3>Used To Craft</h3>
              <div className="rc-used-grid">
                {usedBy.map((used) => (
                  <span key={used.id}>{String(used.name ?? used.id)}</span>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ItemsRaiderCachePage() {
  const { stash } = usePlayer();
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [view, setView] = useState<ViewMode>('grid');
  const [selected, setSelected] = useState<ItemWithDecision | null>(null);
  const [activePanel, setActivePanel] = useState<'hideout' | 'quest' | 'projects' | 'filters' | 'location'>('filters');
  const [ownership, setOwnership] = useState<OwnershipFilter>('all');
  const [decisions, setDecisions] = useState<Set<RaiderCacheDecision>>(new Set());
  const [rarities, setRarities] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Set<string>>(new Set());

  const quests = useMemo(
    () => Object.values(QUESTS_RAW as Record<string, any>).map(normalizeQuest),
    [],
  );
  const projects = useMemo(
    () => (PROJECTS as any[]).map(normalizeProject),
    [],
  );
  const hideoutModules = useMemo(
    () => (WORKSHOP_UPGRADES as any[]).map(normalizeHideoutModule),
    [],
  );
  const engine = useMemo(
    () =>
      new RaiderCacheDecisionEngine(
        getRaiderCacheItems(),
        hideoutModules,
        quests,
        projects,
      ),
    [hideoutModules, projects, quests],
  );
  const allItems = useMemo(() => {
    return engine
      .getItemsWithDecisions(DEFAULT_RAIDERCACHE_PROGRESS)
      .filter((item) => item.id !== 'refinement-1')
      .filter((item) => !isCosmetic(item));
  }, [engine]);

  const stats = useMemo(() => engine.getDecisionStats(DEFAULT_RAIDERCACHE_PROGRESS), [engine]);
  const categoryOptions = useMemo(
    () => Array.from(new Set(allItems.map(itemType))).sort(),
    [allItems],
  );
  const stashItems = useMemo(
    () => (Array.isArray(stash?.items) ? stash.items : []),
    [stash],
  );
  const ownedQuantities = useMemo(
    () => buildOwnedQuantities(stashItems),
    [stashItems],
  );
  const filteredItems = useMemo(
    () =>
      filterAndSortItems(
        allItems,
        query,
        decisions,
        rarities,
        categories,
        ownership,
        ownedQuantities,
        sortBy,
        sortDirection,
      ),
    [
      allItems,
      categories,
      decisions,
      ownership,
      ownedQuantities,
      query,
      rarities,
      sortBy,
      sortDirection,
    ],
  );

  const toggleSet = <T,>(set: Set<T>, value: T, setter: (next: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  return (
    <div className={`rc-page rc-view-${view}`}>
      <header className="rc-header">
        <div className="rc-container rc-header-layout">
          <div className="rc-logo">
            <span className="rc-logo-text">ARC RAIDERS</span>
            <span className="rc-logo-subtitle">Loot Decision Tool</span>
          </div>
          <div className="rc-header-search">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="rc-search-input-header"
              type="search"
              placeholder="Search items..."
            />
          </div>
          <div className="rc-header-sort">
            <select
              className="rc-sort-select"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortKey)}
            >
              <option value="name">Name</option>
              <option value="value">Value</option>
              <option value="rarity">Rarity</option>
              <option value="type">Type</option>
              <option value="decision">Decision</option>
            </select>
            <button
              className="rc-sort-direction-btn"
              onClick={() =>
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
              }
              type="button"
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          <div className="rc-view-toggle">
            {(['grid', 'list', 'compact'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                className={view === mode ? 'active' : ''}
                onClick={() => setView(mode)}
                type="button"
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="rc-main">
        <div className="rc-container rc-layout-wrapper">
          <aside className="rc-sidebar">
            <div className="rc-sidebar-tabs">
              {(
                ['hideout', 'quest', 'projects', 'filters', 'location'] as const
              ).map((panel) => (
                <button
                  key={panel}
                  className={activePanel === panel ? 'active' : ''}
                  onClick={() => setActivePanel(panel)}
                  type="button"
                >
                  {panel}
                </button>
              ))}
            </div>
            <div className="rc-sidebar-panel">
              {activePanel === 'filters' && (
                <div className="rc-filters">
                  <div className="rc-filter-group">
                    <label>Items:</label>
                    <div>
                      {(
                        [
                          ['all', 'All Items'],
                          ['have', 'Items Have'],
                          ['needed', 'Items Needed'],
                          ['missing', 'Items Missing'],
                        ] as [OwnershipFilter, string][]
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          className={ownership === value ? 'active' : ''}
                          onClick={() => setOwnership(value)}
                          type="button"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rc-filter-group">
                    <label>Decision:</label>
                    <div>
                      {(
                        [
                          'keep',
                          'sell_or_recycle',
                          'situational',
                        ] as RaiderCacheDecision[]
                      ).map((decision) => (
                        <button
                          key={decision}
                          className={decisions.has(decision) ? 'active' : ''}
                          onClick={() =>
                            toggleSet(decisions, decision, setDecisions)
                          }
                          type="button"
                        >
                          {decisionLabel(decision)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rc-filter-group">
                    <label>Rarity:</label>
                    <div>
                      {['common', 'uncommon', 'rare', 'epic', 'legendary'].map(
                        (rarity) => (
                          <button
                            key={rarity}
                            className={
                              rarities.has(rarity)
                                ? `active rarity-${rarity}`
                                : `rarity-${rarity}`
                            }
                            onClick={() =>
                              toggleSet(rarities, rarity, setRarities)
                            }
                            type="button"
                          >
                            {rarity}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                  <div className="rc-filter-group">
                    <label>Category:</label>
                    <div>
                      {categoryOptions.map((category) => (
                        <button
                          key={category}
                          className={categories.has(category) ? 'active' : ''}
                          onClick={() =>
                            toggleSet(categories, category, setCategories)
                          }
                          type="button"
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {activePanel === 'hideout' && (
                <div className="rc-tracker-list">
                  {hideoutModules.map((module) => (
                    <div key={module.id} className="rc-tracker-card">
                      <h3>{module.name}</h3>
                      <p>{module.levels?.length ?? 0} upgrade levels</p>
                    </div>
                  ))}
                </div>
              )}
              {activePanel === 'quest' && (
                <div className="rc-tracker-list">
                  {quests.slice(0, 80).map((quest) => (
                    <div key={quest.id} className="rc-tracker-card">
                      <h3>{quest.name}</h3>
                      <p>{quest.requirements?.length ?? 0} item requirements</p>
                    </div>
                  ))}
                </div>
              )}
              {activePanel === 'projects' && (
                <div className="rc-tracker-list">
                  {projects.map((project) => (
                    <div key={project.id} className="rc-tracker-card">
                      <h3>{project.name}</h3>
                      <p>
                        {project.id.includes('expedition')
                          ? 'Expedition'
                          : 'Project'}{' '}
                        · {project.phases?.length ?? 0} phases
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {activePanel === 'location' && (
                <div className="rc-tracker-list">
                  <div className="rc-tracker-card">
                    <h3>Location Mapping</h3>
                    <p>
                      Items show MetaForge location zones and enemy drop hints
                      in details.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </aside>

          <section className="rc-main-content">
            <div className="rc-decision-dashboard">
              <button
                className="keep"
                onClick={() => toggleSet(decisions, 'keep', setDecisions)}
                type="button"
              >
                <h3>Keep</h3>
                <span>{stats.keep}</span>
              </button>
              <button
                className="sell_or_recycle"
                onClick={() =>
                  toggleSet(decisions, 'sell_or_recycle', setDecisions)
                }
                type="button"
              >
                <h3>Safe To Sell</h3>
                <span>{stats.sell_or_recycle}</span>
              </button>
              <button
                className="situational"
                onClick={() =>
                  toggleSet(decisions, 'situational', setDecisions)
                }
                type="button"
              >
                <h3>Your Call</h3>
                <span>{stats.situational}</span>
              </button>
              <div className="rc-result-count">
                <h3>Showing</h3>
                <span>{filteredItems.length}</span>
              </div>
            </div>
            <div className="rc-items-grid">
              {filteredItems.map((item) => (
                <ItemCard key={item.id} item={item} onClick={setSelected} />
              ))}
            </div>
          </section>
        </div>
      </main>
      <ItemModal
        item={selected}
        engine={engine}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
