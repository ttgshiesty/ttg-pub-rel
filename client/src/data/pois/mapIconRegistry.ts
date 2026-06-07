/**
 * Map Icon Registry — S3-hosted shiestymapicon URLs for POI markers.
 * All icons served from https://assets.shiesty.me/shiestymapicon/
 */
const BASE = 'https://assets.shiesty.me/shiestymapicon';

export const SHIESTY_ICONS = {
  // ARCs
  tick: `${BASE}/tick_mf.png`,
  pop: `${BASE}/pop256.png`,
  fireball: `${BASE}/Fireball_new256.png`,
  wasp: `${BASE}/wasp_mf.png`,
  hornet: `${BASE}/hornet_mf.png`,
  snitch: `${BASE}/snitch_mf.png`,
  spotter: `${BASE}/ARC_Spotter.png.webp`,
  rocketeer: `${BASE}/rocketeer_mf.png`,
  turret: `${BASE}/turret_mf.png`,
  sentinel: `${BASE}/sentinel_mp.png`,
  bastion: `${BASE}/bastion_mf.png`,
  bombardier: `${BASE}/Bombardier.png`,
  shredder: `${BASE}/shredder.png`,
  comet: `${BASE}/comet_mf.png`,
  bison: `${BASE}/bison_mf.png`,
  queen: `${BASE}/queen_mf.png`,
  firefly: `${BASE}/firefly_mf.png`,
  rollbot: `${BASE}/rollbot_mf.png`,
  vaporizer: `${BASE}/vaporizer.png`,
  turbine: `${BASE}/turbine_mf.png`,

  // Husks
  baronHusk: `${BASE}/baron_husk_mf.png`,
  waspHusk: `${BASE}/wasp_husk.png`,
  rocketeerHusk: `${BASE}/rocketeer_husk.png`,
  courierHusk: `${BASE}/arc_courier_mf256.png`,

  // Containers / Lootables
  ammoCrate: `${BASE}/ammo_crate_mf.png`,
  utilityCrate: `${BASE}/utility_crate_mf.png`,
  weaponCrate: `${BASE}/weapon_crate_mf.png`,
  medCrate: `${BASE}/med_crate_mf.png`,
  medBag: `${BASE}/Med-bag.png`,
  raiderCache: `${BASE}/raider_cache_mf.png`,
  hurricaneCache: `${BASE}/hurricane_cache_mf.png`,
  breachableContainer: `${BASE}/breachable_container_mf.png`,
  carBoot: `${BASE}/car_boot.png`,
  lockers: `${BASE}/lockers.png`,
  lootbox: `${BASE}/lootbox.png`,
  weaponCase: `${BASE}/weapon-case.webp`,
  shipModel: `${BASE}/ship-model.webp`,
  combatSupplies: `${BASE}/combatsupplies.png`,

  // Nature / Other
  wickerBasket: `${BASE}/wicker-basket.png`,
  pressButton: `${BASE}/press-button.png`,
  securityBreach: `${BASE}/Security_Breach.png`,
  whiteRoundedBg: `${BASE}/white-rounded-bg.png`,

  // Matriarch
  matriarch: `${BASE}/matriarch256.png`,
} as const;

/** Map event icons from rustbelt S3 bucket */
export const RUSTBELT_ICONS = {
  hurricane: 'https://assets.shiesty.me/rustbelt/hurricane.webp',
  nightRaid: 'https://assets.shiesty.me/rustbelt/nightraid.webp',
  electromagneticStorm: 'https://assets.shiesty.me/rustbelt/electromagneticstorm.webp',
  coldSnap: 'https://assets.shiesty.me/rustbelt/coldsnap.webp',
  raiderColdSnap: 'https://assets.shiesty.me/rustbelt/raider_coldsnap.webp',
  lockedGate: 'https://assets.shiesty.me/rustbelt/lockedgate.webp',
  hiddenBunker: 'https://assets.shiesty.me/rustbelt/hiddenbunker.webp',
  huskGraveyard: 'https://assets.shiesty.me/rustbelt/huskgraveyard.webp',
  uncoveredCaches: 'https://assets.shiesty.me/rustbelt/uncoveredcaches.webp',
  launchTowerLoot: 'https://assets.shiesty.me/rustbelt/launchtowerloot.webp',
  prospectingProbes: 'https://assets.shiesty.me/rustbelt/prospectingprobes.webp',
  natureIcon: 'https://assets.shiesty.me/rustbelt/nature_icon.webp',
  twoXPoints: 'https://assets.shiesty.me/maps/2x_points.png',
} as const;

/** Lookup a shiesty icon by key, returns the S3 URL or undefined */
export function getShiestyIcon(key: string): string | undefined {
  return (SHIESTY_ICONS as Record<string, string>)[key];
}

/** Lookup a rustbelt event icon by key */
export function getRustbeltIcon(key: string): string | undefined {
  return (RUSTBELT_ICONS as Record<string, string>)[key];
}
