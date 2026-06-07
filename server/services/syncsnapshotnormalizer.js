function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function normalizeCompactItem(item) {
  if (!item || typeof item !== 'object') return item;
  const attachments = Array.isArray(item.a)
    ? item.a.map(normalizeCompactItem).filter(Boolean)
    : Array.isArray(item.attachments)
      ? item.attachments.map(normalizeCompactItem).filter(Boolean)
      : undefined;

  return {
    ...item,
    instanceId: item.instanceId || (item.s !== undefined ? `snapshot-${item.s}` : undefined),
    publicUuid: firstValue(item.publicUuid, item.p),
    itemId: firstValue(item.itemId, item.i),
    quantity: firstValue(item.quantity, item.q, item.amount),
    slotIndex: firstValue(item.slotIndex, item.s),
    durabilityPercent: firstValue(item.durabilityPercent, item.d),
    attachments: attachments && attachments.length > 0 ? attachments : undefined,
  };
}

function normalizeLoadout(loadout) {
  if (!loadout || typeof loadout !== 'object') return loadout || null;
  const out = Array.isArray(loadout) ? loadout.map(normalizeCompactItem) : {};
  if (Array.isArray(loadout)) return out;

  for (const [key, value] of Object.entries(loadout)) {
    out[key] = Array.isArray(value)
      ? value.map(normalizeCompactItem)
      : value && typeof value === 'object'
        ? normalizeCompactItem(value)
        : value;
  }
  return out;
}

export function normalizeInventorySnapshot(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const root = firstValue(
    payload.inventoryLatest,
    payload.inventory_latest,
    payload.snapshot,
    payload.stash?.snapshot,
    payload.stash?.data?.snapshot,
    payload.stash?.data,
    payload.stash,
    payload.inventory,
  );
  if (!root || typeof root !== 'object') return null;

  const rawItems = firstValue(
    root.items,
    root.stashItems,
    root.inventory?.items,
    Array.isArray(root.inventory) ? root.inventory : undefined,
  );
  const items = Array.isArray(rawItems) ? rawItems.map(normalizeCompactItem) : [];
  const loadout = normalizeLoadout(firstValue(root.loadout, payload.loadout));
  const syncedAt = firstValue(root.syncedAt, root.lastSyncedAt, payload.lastSynced, new Date());

  return {
    snapshot: {
      items,
      loadout,
      usedSlots: firstValue(root.usedSlots, root.totalItems, items.length),
      maxSlots: firstValue(root.maxSlots, root.slots?.total),
      syncedAt,
      credits: root.credits,
      cred: root.cred,
      raiderTokens: root.raiderTokens,
      xp: root.xp,
      currencies: firstValue(root.currencies, root.wallet, null),
      totalValue: root.totalValue,
    },
    inventory: {
      items,
      unmappedCount: items.filter((item) => item && item.isMapped === false).length,
      totalItems: firstValue(root.usedSlots, root.totalItems, items.length),
      maxSlots: firstValue(root.maxSlots, root.slots?.total),
      lastSyncedAt: new Date(syncedAt).toISOString(),
      currencies: firstValue(root.currencies, root.wallet, {
        credits: root.credits,
        cred: root.cred,
        raiderTokens: root.raiderTokens,
        xp: root.xp,
      }),
      totalValue: root.totalValue || 0,
    },
    loadout,
  };
}

export function normalizeProgressSnapshot(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const root = firstValue(payload.progress, payload.playerProgress, payload);
  const gameProgress = firstValue(root.gameProgress, root.progress?.gameProgress);
  if (!gameProgress || typeof gameProgress !== 'object') return null;

  return {
    playerLevel: firstValue(root.playerLevel, root.level),
    gameProgress,
    questStatuses: gameProgress.questStatuses || {},
    neededItemCounts: gameProgress.neededItemCounts || {},
    hideoutModuleLevels: gameProgress.hideoutModuleLevels || {},
    projectPhaseStatuses: gameProgress.projectPhaseStatuses || {},
    blueprintStatuses: gameProgress.blueprintStatuses || {},
    categoryGoalProgress: gameProgress.categoryGoalProgress || {},
    allocatedSkillPoints: gameProgress.allocatedSkillPoints || {},
    preferences: root.preferences || {},
    lastSynced: firstValue(root.lastSynced, root.lastSyncedAt, root.syncedAt),
    isSubscribed: root.isSubscribed,
    exists: root.exists,
  };
}

export function deriveExpeditionStatus(progressSnapshot) {
  const statuses = progressSnapshot?.projectPhaseStatuses;
  if (!statuses || typeof statuses !== 'object') return null;

  const phases = Object.entries(statuses)
    .map(([id, completed]) => {
      const match = id.match(/^expedition_project(?:_s(\d+))?_(\d+)$/);
      if (!match) return null;
      return {
        id,
        season: match[1] ? Number(match[1]) : null,
        phase: Number(match[2]),
        completed: completed === true,
      };
    })
    .filter(Boolean);

  if (phases.length === 0) return null;

  const numberedSeasons = phases
    .map((phase) => phase.season)
    .filter((season) => Number.isFinite(season));
  const activeSeason =
    numberedSeasons.length > 0 ? Math.max(...numberedSeasons) : null;
  const activePhases =
    activeSeason === null
      ? phases
      : phases.filter((phase) => phase.season === activeSeason);
  const sorted = [...activePhases].sort((a, b) => a.phase - b.phase);
  const nextIncomplete = sorted.find((phase) => !phase.completed);
  const completedCount = sorted.filter((phase) => phase.completed).length;

  return {
    activeSeason,
    expeditionNumber: nextIncomplete?.phase || completedCount,
    currentTier: nextIncomplete?.phase || completedCount,
    completedExpeditions: completedCount,
    totalExpeditions: sorted.length,
    state: nextIncomplete ? 'IN_PROGRESS' : 'READY',
    projectPhaseStatuses: statuses,
    phases: sorted,
    lastSynced: progressSnapshot.lastSynced || null,
  };
}

export function normalizeProjectProgressSnapshot(payload) {
  const progressSnapshot = normalizeProgressSnapshot(payload);
  const statuses = progressSnapshot?.projectPhaseStatuses;
  if (!statuses || typeof statuses !== 'object') return null;

  const projects = Object.entries(statuses).map(([projectId, completed]) => {
    const expeditionMatch = projectId.match(
      /^expedition_project(?:_s(\d+))?_(\d+)$/,
    );
    return {
      projectId,
      id: projectId,
      completed: completed === true,
      isExpedition: !!expeditionMatch,
      season: expeditionMatch?.[1] ? Number(expeditionMatch[1]) : null,
      expeditionNumber: expeditionMatch?.[2]
        ? Number(expeditionMatch[2])
        : null,
      phase: expeditionMatch?.[2] ? Number(expeditionMatch[2]) : null,
      neededItemCounts: progressSnapshot.neededItemCounts || {},
      categoryGoalProgress: progressSnapshot.categoryGoalProgress || {},
      lastSynced: progressSnapshot.lastSynced || null,
    };
  });

  return {
    projects,
    projectPhaseStatuses: statuses,
    neededItemCounts: progressSnapshot.neededItemCounts || {},
    categoryGoalProgress: progressSnapshot.categoryGoalProgress || {},
    lastSynced: progressSnapshot.lastSynced || null,
    source: 'gameProgress',
  };
}
