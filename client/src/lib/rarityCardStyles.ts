/**
 * Visual tier for blueprint cards (Tailwind-only; no runtime animation libs).
 * Maps catalog `rarity` strings; null → none; unrecognized → unknown.
 */
export type RarityVisualTier = 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common' | 'none' | 'unknown'

export function getRarityVisualTier(rarity: string | null): RarityVisualTier {
    if (rarity == null || rarity.trim() === '') return 'none'
    const r = rarity.trim().toLowerCase()
    if (r === 'legendary') return 'legendary'
    if (r === 'epic') return 'epic'
    if (r === 'rare') return 'rare'
    if (r === 'uncommon') return 'uncommon'
    if (r === 'common') return 'common'
    return 'unknown'
}

type CardDensity = 'default' | 'compact'

/** Card shell: border, shadow/glow, hover lift — `compact` reserved for alternate density layouts. */
export function rarityCardContainerClasses(tier: RarityVisualTier, density: CardDensity = 'default'): string {
    const base =
        density === 'compact'
            ? 'w-full flex flex-col rf-card rounded-lg overflow-hidden border transition-all duration-200 hover:-translate-y-px'
            : 'w-full flex flex-col rf-card rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-0.5'
    switch (tier) {
        case 'legendary':
            return `${base} border-rf-orange/45 shadow-[0_0_28px_-6px_rgba(249,115,22,0.35)] hover:border-rf-orange/70 hover:shadow-[0_0_40px_-4px_rgba(251,191,36,0.45)]`
        case 'epic':
            return `${base} border-purple-500/45 shadow-[0_0_28px_-6px_rgba(168,85,247,0.3)] hover:border-purple-400/65 hover:shadow-[0_0_38px_-4px_rgba(192,132,252,0.4)]`
        case 'rare':
            return `${base} border-sky-500/45 shadow-[0_0_26px_-6px_rgba(56,189,248,0.28)] hover:border-sky-400/65 hover:shadow-[0_0_36px_-4px_rgba(125,211,252,0.35)]`
        case 'uncommon':
            return `${base} border-rf-green/40 shadow-[0_0_22px_-6px_rgba(34,197,94,0.22)] hover:border-rf-green/60 hover:shadow-[0_0_32px_-4px_rgba(74,222,128,0.3)]`
        case 'common':
            return `${base} border-white/12 shadow-lg shadow-black/30 hover:border-white/20 hover:shadow-xl hover:shadow-black/40`
        case 'none':
            return `${base} border-white/[0.08] shadow-lg shadow-black/25 hover:border-white/15 hover:shadow-xl hover:shadow-black/35`
        default:
            return `${base} border-white/10 shadow-md shadow-black/20 hover:border-white/18 hover:shadow-lg hover:shadow-black/30`
    }
}

/** Thin top accent bar inside card. */
export function rarityCardTopBarClass(tier: RarityVisualTier): string {
    switch (tier) {
        case 'legendary':
            return 'h-0.5 w-full bg-gradient-to-r from-rf-orange/90 via-amber-400/80 to-rf-orange/60 shrink-0'
        case 'epic':
            return 'h-0.5 w-full bg-gradient-to-r from-purple-500/90 via-fuchsia-500/70 to-purple-600/60 shrink-0'
        case 'rare':
            return 'h-0.5 w-full bg-gradient-to-r from-sky-400/90 via-sky-500/70 to-blue-600/60 shrink-0'
        case 'uncommon':
            return 'h-0.5 w-full bg-gradient-to-r from-rf-green/90 via-emerald-400/70 to-rf-green/60 shrink-0'
        case 'common':
            return 'h-0.5 w-full bg-white/15 shrink-0'
        case 'none':
            return 'h-0.5 w-full bg-white/[0.07] shrink-0'
        default:
            return 'h-0.5 w-full bg-white/12 shrink-0'
    }
}

/** Rarity pill on card (compact, slight glow). */
export function rarityBadgeClasses(tier: RarityVisualTier): string {
    const shell =
        'text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 border backdrop-blur-md shrink-0 shadow-sm'
    switch (tier) {
        case 'legendary':
            return `${shell} border-rf-orange/50 bg-rf-orange/20 text-amber-100 shadow-[0_0_12px_-2px_rgba(249,115,22,0.5)]`
        case 'epic':
            return `${shell} border-purple-400/45 bg-purple-500/20 text-purple-100 shadow-[0_0_12px_-2px_rgba(168,85,247,0.45)]`
        case 'rare':
            return `${shell} border-sky-400/45 bg-sky-500/15 text-sky-100 shadow-[0_0_10px_-2px_rgba(56,189,248,0.4)]`
        case 'uncommon':
            return `${shell} border-rf-green/45 bg-rf-green/15 text-rf-green shadow-[0_0_10px_-2px_rgba(34,197,94,0.35)]`
        case 'common':
            return `${shell} border-white/20 bg-white/10 text-rf-text`
        case 'none':
            return `${shell} border-white/10 bg-white/[0.06] text-rf-textSoft`
        default:
            return `${shell} border-white/15 bg-white/8 text-rf-textSoft`
    }
}

/** Soft radial behind item image. */
export function rarityImageBackdropClass(tier: RarityVisualTier): string {
    switch (tier) {
        case 'legendary':
            return 'absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(249,115,22,0.14),transparent_65%)] pointer-events-none'
        case 'epic':
            return 'absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(168,85,247,0.12),transparent_65%)] pointer-events-none'
        case 'rare':
            return 'absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(56,189,248,0.11),transparent_65%)] pointer-events-none'
        case 'uncommon':
            return 'absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(34,197,94,0.1),transparent_65%)] pointer-events-none'
        default:
            return 'absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(255,255,255,0.04),transparent_70%)] pointer-events-none'
    }
}

export function formatRarityLabel(rarity: string | null): string {
    if (!rarity) return '—'
    return rarity.trim().charAt(0).toUpperCase() + rarity.trim().slice(1).toLowerCase()
}
