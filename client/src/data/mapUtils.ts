/**
 * Map image URL helpers for LiveEventTimersPage.
 * Images live in https://assets.shiesty.me/maps/.
 */
import { assetUrl } from '../lib/assetUrl';

const MAP_IMAGES: Record<string, string> = {
  // by display name (lowercase)
  'dam battleground': assetUrl('/maps/dambattlegrounds.png'),
  'dam battlegrounds': assetUrl('/maps/dambattlegrounds.png'),
  'buried city': assetUrl('/maps/burriedcity.png'),
  'the spaceport': assetUrl('/maps/spaceport.png'),
  spaceport: assetUrl('/maps/spaceport.png'),
  'blue gate': assetUrl('/maps/bluegate.png'),
  'the blue gate': assetUrl('/maps/bluegate.png'),
  'stella montis': assetUrl('/maps/stella.png'),
  'riven tides': assetUrl('/maps/riventides.webp'),
  // by map key (fallback)
  'dam-battlegrounds': '/maps/dambattlegrounds.png',
  'buried-city': '/maps/burriedcity.png',
  'blue-gate': '/maps/bluegate.png',
  'stella-montis': '/maps/stella.png',
  'riven-tides': '/maps/riventides.webp',
};

const FALLBACK = assetUrl('/maps/dambattlegrounds.png');

export function getMapImageUrl(
  mapName: string | { en?: string } | null | undefined,
): string {
  if (!mapName) return FALLBACK;
  const key =
    typeof mapName === 'string'
      ? mapName.toLowerCase()
      : (mapName.en ?? '').toLowerCase();
  return MAP_IMAGES[key] ?? FALLBACK;
}
