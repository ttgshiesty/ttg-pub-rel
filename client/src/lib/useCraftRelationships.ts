/**
 * useCraftRelationships — ported from ARDB-main/lib/useCraftRelationships.ts
 *
 * Calculates bidirectional craft/recycle relationships for any item
 * by searching through ALL_ITEMS from itemDb.
 *
 * Returns:
 *   recipe          — ingredients needed to craft this item
 *   recycle_components — items obtained by recycling this item
 *   used_in         — items that require this item in their recipe
 *   recycle_from    — items that can be recycled to produce this item
 */
import { useMemo } from 'react';
import { ALL_ITEMS } from './itemDb';

export interface CraftComponent {
  id: string;
  name: string;
  icon?: string;
  rarity?: string;
  type?: string;
  quantity?: number;
}

export interface CraftRelationships {
  recipe: CraftComponent[];
  recycle_components: CraftComponent[];
  used_in: CraftComponent[];
  recycle_from: CraftComponent[];
}

function toComp(item: any, qty?: number): CraftComponent {
  return {
    id: item.id ?? '',
    name:
      typeof item.name === 'string'
        ? item.name
        : (item.name?.en ?? item.id ?? ''),
    icon: item.imageFilename ?? item.icon ?? undefined,
    rarity: item.rarity ?? undefined,
    type: item.type ?? item.item_type ?? undefined,
    quantity: qty,
  };
}

export function useCraftRelationships(
  itemId: string | undefined,
): CraftRelationships {
  return useMemo(() => {
    const empty: CraftRelationships = {
      recipe: [],
      recycle_components: [],
      used_in: [],
      recycle_from: [],
    };
    if (!itemId) return empty;

    const current = ALL_ITEMS.find((i) => i.id === itemId);
    if (!current) return empty;

    const result: CraftRelationships = { ...empty };

    // 1. This item's own recipe (crafting_components / recipe)
    const ownRecipe: any[] =
      (current as any).crafting_components ?? (current as any).recipe ?? [];
    if (Array.isArray(ownRecipe)) {
      ownRecipe.forEach((comp: any) => {
        const sub = comp.item ?? comp.component ?? comp;
        if (sub?.id) result.recipe.push(toComp(sub, comp.quantity));
      });
    } else if (typeof ownRecipe === 'object') {
      // recipe as { itemId: qty } map
      Object.entries(ownRecipe).forEach(([id, qty]) => {
        const sub = ALL_ITEMS.find((i) => i.id === id);
        result.recipe.push(toComp(sub ?? { id }, Number(qty)));
      });
    }

    // 2. Items obtained by recycling this item
    const ownRecycleComp: any[] =
      (current as any).recycle_components ??
      (current as any).recyclesInto ??
      [];
    if (Array.isArray(ownRecycleComp)) {
      ownRecycleComp.forEach((comp: any) => {
        const sub = comp.item ?? comp.component ?? comp;
        if (sub?.id) result.recycle_components.push(toComp(sub, comp.quantity));
      });
    } else if (typeof ownRecycleComp === 'object') {
      Object.entries(ownRecycleComp).forEach(([id, qty]) => {
        const sub = ALL_ITEMS.find((i) => i.id === id);
        result.recycle_components.push(toComp(sub ?? { id }, Number(qty)));
      });
    }

    // 3. Scan all items to find used_in and recycle_from
    for (const item of ALL_ITEMS) {
      if (item.id === itemId) continue;

      // used_in — this item appears in another item's recipe
      const theirRecipe: any[] =
        (item as any).crafting_components ?? (item as any).recipe ?? [];
      let usedInThisRecipe = false;
      if (Array.isArray(theirRecipe)) {
        usedInThisRecipe = theirRecipe.some((c: any) => {
          const sub = c.item ?? c.component ?? c;
          return sub?.id === itemId;
        });
      } else if (typeof theirRecipe === 'object') {
        usedInThisRecipe = itemId in theirRecipe;
      }
      if (usedInThisRecipe && !result.used_in.some((c) => c.id === item.id)) {
        result.used_in.push(toComp(item));
      }

      // recycle_from — this item appears in another item's recyclesInto
      const theirRecycleInto: any =
        (item as any).recyclesInto ?? (item as any).recycle_components ?? null;
      let thisComesFromRecyclingThem = false;
      if (Array.isArray(theirRecycleInto)) {
        thisComesFromRecyclingThem = theirRecycleInto.some((c: any) => {
          const sub = c.item ?? c.component ?? c;
          return sub?.id === itemId;
        });
      } else if (typeof theirRecycleInto === 'object' && theirRecycleInto) {
        thisComesFromRecyclingThem = itemId in theirRecycleInto;
      }
      if (
        thisComesFromRecyclingThem &&
        !result.recycle_from.some((c) => c.id === item.id)
      ) {
        result.recycle_from.push(toComp(item));
      }
    }

    return result;
  }, [itemId]);
}

/** Plain function version (non-hook) for use outside components */
export function getCraftRelationships(itemId: string): CraftRelationships {
  const empty: CraftRelationships = {
    recipe: [],
    recycle_components: [],
    used_in: [],
    recycle_from: [],
  };
  if (!itemId) return empty;
  // Re-use the same logic without the useMemo wrapper
  const current = ALL_ITEMS.find((i) => i.id === itemId);
  if (!current) return empty;
  const result: CraftRelationships = { ...empty };

  const ownRecipe: any[] =
    (current as any).crafting_components ?? (current as any).recipe ?? [];
  if (Array.isArray(ownRecipe)) {
    ownRecipe.forEach((comp: any) => {
      const sub = comp.item ?? comp.component ?? comp;
      if (sub?.id) result.recipe.push(toComp(sub, comp.quantity));
    });
  } else if (typeof ownRecipe === 'object') {
    Object.entries(ownRecipe).forEach(([id, qty]) => {
      const sub = ALL_ITEMS.find((i) => i.id === id);
      result.recipe.push(toComp(sub ?? { id }, Number(qty)));
    });
  }

  const ownRecycleComp: any[] =
    (current as any).recycle_components ?? (current as any).recyclesInto ?? [];
  if (Array.isArray(ownRecycleComp)) {
    ownRecycleComp.forEach((comp: any) => {
      const sub = comp.item ?? comp.component ?? comp;
      if (sub?.id) result.recycle_components.push(toComp(sub, comp.quantity));
    });
  } else if (typeof ownRecycleComp === 'object') {
    Object.entries(ownRecycleComp).forEach(([id, qty]) => {
      const sub = ALL_ITEMS.find((i) => i.id === id);
      result.recycle_components.push(toComp(sub ?? { id }, Number(qty)));
    });
  }

  for (const item of ALL_ITEMS) {
    if (item.id === itemId) continue;
    const theirRecipe: any[] =
      (item as any).crafting_components ?? (item as any).recipe ?? [];
    let usedIn = false;
    if (Array.isArray(theirRecipe))
      usedIn = theirRecipe.some(
        (c: any) => (c.item ?? c.component ?? c)?.id === itemId,
      );
    else if (typeof theirRecipe === 'object') usedIn = itemId in theirRecipe;
    if (usedIn && !result.used_in.some((c) => c.id === item.id))
      result.used_in.push(toComp(item));

    const theirRecycleInto: any =
      (item as any).recyclesInto ?? (item as any).recycle_components ?? null;
    let recycleFrom = false;
    if (Array.isArray(theirRecycleInto))
      recycleFrom = theirRecycleInto.some(
        (c: any) => (c.item ?? c.component ?? c)?.id === itemId,
      );
    else if (typeof theirRecycleInto === 'object' && theirRecycleInto)
      recycleFrom = itemId in theirRecycleInto;
    if (recycleFrom && !result.recycle_from.some((c) => c.id === item.id))
      result.recycle_from.push(toComp(item));
  }

  return result;
}
