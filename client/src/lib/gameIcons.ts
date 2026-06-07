import { assetUrl } from './assetUrl';

/* ── Game Icon Paths ─────────────────────────────────────────────────────────
 * Central mapping of ARC Raiders game icon PNGs (from /icons/) to their
 * semantic usage throughout the app. All paths are resolved via assetUrl()
 * to support S3 CDN deployment.
 * ────────────────────────────────────────────────────────────────────────── */

/** Weapon type icons */
export const WEAPON_TYPE_ICON: Record<string, string> = {
  light: assetUrl('/icons/lighttype.webp'),
  medium: assetUrl('/icons/mediumtype.webp'),
  heavy: assetUrl('/icons/heavytype.webp'),
  shotgun: assetUrl('/icons/shotguntype.webp'),
  energy: assetUrl('/icons/energytype.webp'),
  launcher: assetUrl('/icons/launchertype.webp'),
};

/** Ammo type icons (real in-game UI icons) */
export const AMMO_ICON: Record<string, string> = {
  light: assetUrl('/icons/t_ui_ammo_light.webp'),
  medium: assetUrl('/icons/t_ui_ammo_medium.webp'),
  heavy: assetUrl('/icons/t_ui_ammo_heavy.webp'),
  shotgun: assetUrl('/icons/t_ui_ammo_shotgun.webp'),
  energy: assetUrl('/icons/t_ui_ammo_energy.webp'),
  launcher: assetUrl('/icons/t_ui_ammo_launcher.webp'),
};

/** Attachment slot icons (real in-game mod UI icons) */
export const ATTACHMENT_ICON: Record<string, string> = {
  muzzle: assetUrl('/icons/t_ui_mods_muzzle.webp'),
  stock: assetUrl('/icons/t_ui_mods_stock.webp'),
  underbarrel: assetUrl('/icons/t_ui_mods_grip.webp'),
  magazine_light: assetUrl('/icons/t_ui_mods_mag-light.webp'),
  magazine_medium: assetUrl('/icons/t_ui_mods_mag-medium.webp'),
  magazine_shotgun: assetUrl('/icons/t_ui_mods_mag-shotgun.webp'),
  shotgun_muzzle: assetUrl('/icons/t_ui_mods_shotgun-muzzle.webp'),
  weapon_mod: assetUrl('/icons/t_ui_mods_tech-mod.webp'),
  armor_mod: assetUrl('/icons/t_ui_mods_armormod.webp'),
};

/** Stash / inventory category icons */
export const CATEGORY_ICON: Record<string, string> = {
  keys: assetUrl('/icons/key.webp'),
  weapons: assetUrl('/icons/t_ui_itemcategory_weapon.webp'),
  armor: assetUrl('/icons/t_ui_itemcategory_armor.webp'),
  augments: assetUrl('/icons/t_ui_itemcategory_augmentation.webp'),
  blueprints: assetUrl('/icons/blueprint.webp'),
  meds: assetUrl('/icons/medical.webp'),
  ammo: assetUrl('/icons/t_ui_itemcategory_ammunition.webp'),
  utilities: assetUrl('/icons/t_ui_itemcategory_utility.webp'),
  weaponmods: assetUrl('/icons/t_ui_itemcategory_modification.webp'),
  materials: assetUrl('/icons/craftingmaterials.webp'),
  misc: assetUrl('/icons/t_ui_itemcategory_misc.webp'),
  explosive: assetUrl('/icons/explosive.webp'),
  mine: assetUrl('/icons/mine.webp'),
  backpack: assetUrl('/icons/backpack.webp'),
  gadget: assetUrl('/icons/t_ui_itemcategory_gadget.webp'),
  trinket: assetUrl('/icons/t_ui_itemcategory_trinket.webp'),
  currency: assetUrl('/main/currency_icon.png'),
  all: assetUrl('/icons/t_ui_itemcategory_all.webp'),
};

/** Stat / info icons */
export const STAT_ICON: Record<string, string> = {
  weight: assetUrl('/icons/weight.webp'),
  overweight: assetUrl('/icons/t_ui_icon_overweight.webp'),
  currency: assetUrl('/main/currency_icon.png'),
  cred: assetUrl('/main/cred_icon.png'),
  merits: assetUrl('/icons/merits.webp'),
  raider_token: assetUrl('/main/raidertoken.png'),
};

/** Level tier icons (index 0 = level 1, etc.) */
export const LEVEL_ICON = [
  assetUrl('/icons/1_of_3_stars.webp'),
  assetUrl('/icons/2_3stars.webp'),
  assetUrl('/icons/3_3stars.webp'),
  assetUrl('/icons/3_3stars.webp'),
];

/** Misc UI icons */
export const UI_ICON: Record<string, string> = {
  locked: assetUrl('/icons/locked.webp'),
  owned: assetUrl('/icons/owned.webp'),
  star: assetUrl('/icons/star.webp'),
  warning: assetUrl('/icons/warning.webp'),
  refresh: assetUrl('/icons/refresh.webp'),
  settings: assetUrl('/icons/settings.webp'),
  friends: assetUrl('/icons/friends.webp'),
  inbox: assetUrl('/icons/inbox.webp'),
  projects: assetUrl('/icons/projects.webp'),
  quest: assetUrl('/icons/quest.webp'),
  track: assetUrl('/icons/track.webp'),
  plus: assetUrl('/icons/plus.webp'),
  outfit: assetUrl('/icons/outfit.webp'),
  raider_tool: assetUrl('/icons/raidertool.webp'),
  arcraider: assetUrl('/icons/arcraider.webp'),
  valuable: assetUrl('/icons/valuableicon.webp'),
  party_leader: assetUrl('/icons/partyleader.webp'),
  left_arrow: assetUrl('/icons/leftarrow.webp'),
  backpack_attachment: assetUrl('/icons/backpackattachment.webp'),
  refiner: assetUrl('/icons/refiner.webp'),
  discord: assetUrl('/main/discord.svg'),
};

/** Character Progression / Skill Tree Icons (all 38 skills) */
export const SKILL_ICON: Record<string, string> = {
  a_little_extra: assetUrl('/icons/t_ui_charprog_alittleextra.webp'),
  back_on_your_feet: assetUrl('/icons/t_ui_charprog_backonyourfeet.webp'),
  broad_shoulders: assetUrl('/icons/t_ui_charprog_broadshoulders.webp'),
  carry_momentum: assetUrl('/icons/t_ui_charprog_carrymomentum.webp'),
  crouch_stamina: assetUrl('/icons/t_ui_charprog_crouchstamina.webp'),
  down_but_determined: assetUrl('/icons/t_ui_charprog_downbutdetermined.webp'),
  effortless_roll: assetUrl('/icons/t_ui_charprog_effortlessroll.webp'),
  effortless_swing: assetUrl('/icons/t_ui_charprog_effortlessswing.webp'),
  fall_damage: assetUrl('/icons/t_ui_charprog_falldamage.webp'),
  fight_or_flight: assetUrl('/icons/t_ui_charprog_fightorflight.webp'),
  fly_swatter: assetUrl('/icons/t_ui_charprog_flyswatter.webp'),
  gentle_pressure: assetUrl('/icons/t_ui_charprog_gentlepressure.webp'),
  good_as_new: assetUrl('/icons/t_ui_charprog_goodasnew.webp'),
  heroic_leap: assetUrl('/icons/t_ui_charprog_heroicleap.webp'),
  inround_craft: assetUrl('/icons/t_ui_charprog_inroundcraft.webp'),
  inround_craft_more: assetUrl('/icons/t_ui_charprog_inroundcraftmore.webp'),
  loaded_arms: assetUrl('/icons/t_ui_charprog_loadedarms.webp'),
  looters_instinct: assetUrl('/icons/t_ui_charprog_lootersinstinct.webp'),
  looters_luck: assetUrl('/icons/t_ui_charprog_lootersluck.webp'),
  lungs: assetUrl('/icons/t_ui_charprog_lungs.webp'),
  marathon: assetUrl('/icons/t_ui_charprog_marathon.webp'),
  off_the_wall: assetUrl('/icons/t_ui_charprog_offthewall.webp'),
  proficient_pryer: assetUrl('/icons/t_ui_charprog_proficientpryer.webp'),
  proper_breathing: assetUrl('/icons/t_ui_charprog_properbreathing.webp'),
  ready_to_roll: assetUrl('/icons/t_ui_charprog_readytoroll.webp'),
  security_breach: assetUrl('/icons/t_ui_charprog_securitybreach.webp'),
  silent_scavenger: assetUrl('/icons/t_ui_charprog_silentscavenger.webp'),
  sky_clearing_swing: assetUrl('/icons/t_ui_charprog_skyclearingswing.webp'),
  slide: assetUrl('/icons/t_ui_charprog_slide.webp'),
  stubborn_mule: assetUrl('/icons/t_ui_charprog_stubbornmule.webp'),
  suffer_silence: assetUrl('/icons/t_ui_charprog_suffersilence.webp'),
  survivor_stamina: assetUrl('/icons/t_ui_charprog_survivorstamina.webp'),
  three_deep_breath: assetUrl('/icons/t_ui_charprog_threedeepbreath.webp'),
  turtle_crawl: assetUrl('/icons/t_ui_charprog_turtlecrawl.webp'),
  unburden_roll: assetUrl('/icons/t_ui_charprog_unburdenroll.webp'),
  used_to_the_weight: assetUrl('/icons/t_ui_charprog_usedtotheweight.webp'),
  vault_on_vault: assetUrl('/icons/t_ui_charprog_vaultonvault.webp'),
  vault_spring: assetUrl('/icons/t_ui_charprog_vaultspring.webp'),
  vigorous_vaulter: assetUrl('/icons/t_ui_charprog_vigorousvaulter.webp'),
};

/** System / Game UI Icons */
export const SYSTEM_ICON: Record<string, string> = {
  firemode_auto: assetUrl('/icons/t_ui_icon_system_firemode_auto.webp'),
  firemode_burst: assetUrl('/icons/t_ui_icon_system_firemode_burst.webp'),
  firemode_charged: assetUrl('/icons/t_ui_icon_system_firemode_charged.webp'),
  firemode_single: assetUrl('/icons/t_ui_icon_system_firemode_single.webp'),
  arrow_positive: assetUrl('/icons/t_ui_icon_system_arrow_positive.webp'),
  arrow_negative: assetUrl('/icons/t_ui_icon_system_arrow_negative.webp'),
  copy: assetUrl('/icons/t_ui_icon_system_copy.webp'),
  cross: assetUrl('/icons/t_ui_icon_system_cross.webp'),
  currency_scrap: assetUrl('/icons/t_ui_icon_system_currency_scrap.webp'),
  dash: assetUrl('/icons/t_ui_icon_system_dash.webp'),
  down_arrow: assetUrl('/icons/t_ui_icon_system_down-arrow.webp'),
  external_link: assetUrl('/icons/t_ui_icon_system_externallink.webp'),
  friends: assetUrl('/icons/t_ui_icon_system_friends.webp'),
  generator: assetUrl('/icons/t_ui_icon_system_generator.webp'),
  level_up: assetUrl('/icons/t_ui_icon_system_levelup.webp'),
  more_options: assetUrl('/icons/t_ui_icon_system_moreoptions.webp'),
  objective_enemy_boss: assetUrl(
    '/icons/t_ui_icon_system_objective_enemyboss.webp',
  ),
  ping_bunker: assetUrl('/icons/t_ui_icon_system_ping_bunker.webp'),
  tiers: assetUrl('/icons/t_ui_icon_system_tiers.webp'),
  up_arrow: assetUrl('/icons/t_ui_icon_system_up-arrow.webp'),
  up_double_arrow: assetUrl('/icons/t_ui_icon_system_up-doublearrow.webp'),
  up_triple_arrow: assetUrl('/icons/t_ui_icon_system_up-triplearrow.webp'),
  character_class_damage_dealer: assetUrl(
    '/icons/t_ui_icon_system_character_class_damagedealer.webp',
  ),
};

/** Platform Icons */
export const PLATFORM_ICON: Record<string, string> = {
  epic: assetUrl('/icons/t_icon_platform_epic.webp'),
  epic_inverted: assetUrl('/icons/t_icon_platform_epic_inverted.webp'),
  steam: assetUrl('/icons/t_icon_platform_steam.webp'),
  steam_inverted: assetUrl('/icons/t_icon_platform_steam_inverted.webp'),
  playstation: assetUrl('/icons/t_icon_platform_playstation.webp'),
  playstation_inverted: assetUrl(
    '/icons/t_icon_platform_playstation_inverted.webp',
  ),
  xbox: assetUrl('/icons/t_icon_platform_xbox.webp'),
  xbox_inverted: assetUrl('/icons/t_icon_platform_xbox_inverted.webp'),
  nexon: assetUrl('/icons/t_icon_platform_nexon.webp'),
  nexon_inverted: assetUrl('/icons/t_icon_platform_nexon_inverted.webp'),
  generic: assetUrl('/icons/t_icon_platform_generic.webp'),
  generic_inverted: assetUrl('/icons/t_icon_platform_generic_inverted.webp'),
  embark: assetUrl('/icons/t_icon_platform_embark.webp'),
};

/** Additional Category Icons */
export const MORE_CATEGORY_ICON: Record<string, string> = {
  appearance: assetUrl('/icons/t_ui_category_appearance.webp'),
  bodytype: assetUrl('/icons/t_ui_category_bodytype.webp'),
  charm: assetUrl('/icons/t_ui_category_charm.webp'),
  emotes: assetUrl('/icons/t_ui_category_emotes.webp'),
  facestyle: assetUrl('/icons/t_ui_category_facestyle.webp'),
  facialhair: assetUrl('/icons/t_ui_category_facialhair.webp'),
  hair: assetUrl('/icons/t_ui_category_hair.webp'),
  hairvariant: assetUrl('/icons/t_ui_category_hairvariant.webp'),
  none: assetUrl('/icons/t_ui_category_none.webp'),
  outfitvariant: assetUrl('/icons/t_ui_category_outfitvariant.webp'),
  scrappy: assetUrl('/icons/t_ui_category_scrappy.webp'),
  scrappyoutfit: assetUrl('/icons/t_ui_category_scrappyoutfit.webp'),
  voice: assetUrl('/icons/t_ui_category_voice.webp'),
};

/** Map / Ping Icons */
export const MAP_ICON: Record<string, string> = {
  bird_city: assetUrl('/icons/t_ui_icon_mapcondition_birdcity.webp'),
  buried_treasure: assetUrl(
    '/icons/t_ui_icon_mapcondition_buriedtreasure.webp',
  ),
  frost: assetUrl('/icons/t_ui_icon_mapcondition_frost.webp'),
  launch_tower: assetUrl('/icons/t_ui_icon_mapcondition_launchtower.webp'),
  repair_extraction: assetUrl(
    '/icons/t_ui_icon_mapcondition_repairextraction.webp',
  ),
  turbulence: assetUrl('/icons/t_ui_icon_mapcondition_turbulence.webp'),
  defibrillator: assetUrl('/icons/t_ui_icon_map_defibrillator.webp'),
};

/** Social / Emote Icons */
export const SOCIAL_ICON: Record<string, string> = {
  smiley_happy: assetUrl('/icons/t_ui_icon_smiley_happy.webp'),
  smiley_neutral: assetUrl('/icons/t_ui_icon_smiley_neutral.webp'),
  smiley_sad: assetUrl('/icons/t_ui_icon_smiley_sad.webp'),
  smiley_very_happy: assetUrl('/icons/t_ui_icon_smiley_veryhappy.webp'),
  smiley_angry: assetUrl('/icons/t_ui_icon_smiley_angry.webp'),
};

/** Inline <img> helper — returns props for a small inline icon */
export function iconProps(src: string, size = 16) {
  return {
    src,
    width: size,
    height: size,
    className: 'inline-block object-contain',
    style: { width: size, height: size },
    draggable: false,
  } as const;
}
