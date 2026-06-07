import type { NormalizedBlueprint } from './normalizeBlueprints'
import { getRarityVisualTier, type RarityVisualTier } from './rarityCardStyles'

const ORDER: RarityVisualTier[] = ['legendary', 'epic', 'rare', 'uncommon', 'common', 'unknown', 'none']

const LABELS: Record<RarityVisualTier, string> = {
    legendary: 'Legendary',
    epic: 'Epic',
    rare: 'Rare',
    uncommon: 'Uncommon',
    common: 'Common',
    unknown: 'Other rarity',
    none: 'No rarity',
}

/** Groups items by visual rarity tier; only non-empty buckets, in high-to-low rarity order. */
export function groupBlueprintsByRarityTier(items: NormalizedBlueprint[]): {
    tier: RarityVisualTier
    label: string
    items: NormalizedBlueprint[]
}[] {
    const map = new Map<RarityVisualTier, NormalizedBlueprint[]>()
    for (const t of ORDER) map.set(t, [])
    for (const b of items) {
        map.get(getRarityVisualTier(b.rarity))!.push(b)
    }
    return ORDER.filter((tier) => map.get(tier)!.length > 0).map((tier) => ({
        tier,
        label: LABELS[tier],
        items: map.get(tier)!,
    }))
}
