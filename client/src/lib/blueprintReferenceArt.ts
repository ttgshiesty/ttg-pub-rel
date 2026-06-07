import { assetUrl } from './assetUrl';

/** Stable slug for the generated blueprint registry tiles. */
export function blueprintLookupKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const LABEL_ALIASES: Record<string, string> = {
  'Firework Box': 'Fireworks Box',
  "El' Toro": 'Il Toro',
  Jupitar: 'Jupiter',
  Torrentte: 'Torrente',
};

export function stripBlueprintSuffix(label: string): string {
  return label.replace(/\s+blueprint\s*$/i, '').trim();
}

export function resolveReferenceBlueprintArt(
  displayLabel: string,
): string | null {
  const trimmed = stripBlueprintSuffix(displayLabel || '');
  if (!trimmed) return null;
  const referenceName = LABEL_ALIASES[trimmed] ?? trimmed;
  return assetUrl(`/blueprint/${blueprintLookupKey(referenceName)}.webp`);
}
