// Imported MetaForge icon helper notes.
const fs = require("fs");
const path = require("path");

// Paste your 81 Blueprint IDs here
const itemMap = {
  anvil: "anvil_blueprint.webp",
  tempest: "tempest_blueprint.webp",
  renegade: "renegade_iv.webp",
  // Add the rest of your 81 items here...
};

function getBlueprintRenameMap() {
  return { ...itemMap };
}

function getAssetPath(item) {
  // 1. Check if it's a weapon
  const isWeapon = item.type?.toLowerCase().includes('weapon') || 
                   item.category?.toLowerCase().includes('weapon') ||
                   item.name.includes(" I") || 
                   item.name.includes(" II") ||
                   item.name.includes(" III") || 
                   item.name.includes(" IV") || 
                   item.name.includes(" V");
  
  if (isWeapon) {
    const tierMatch = item.name.match(/(I|II|III|IV|V)$/);
    const tier = tierMatch ? tierMatch[1].toLowerCase() : "i";
    // Clean itemId - remove _i, _ii, _iii, _iv, _v suffixes
    const baseId = item.itemId.replace(/_(i|ii|iii|iv|v)$/i, "");
    return `weapons/${baseId}_${tier}.webp`;
  }

  // 2. Check if it's an attachment (use ACTUALICON T_UI_Mods_* icons)
  if (item.itemId.includes("mag") || item.type?.toLowerCase().includes("magazine")) {
    return `ACTUALICON/T_UI_Mods_Magazine.webp`;
  }
  if (item.itemId.includes("scope") || item.type?.toLowerCase().includes("scope")) {
    return `ACTUALICON/T_UI_Mods_Scope.webp`;
  }
  if (item.itemId.includes("stock") || item.type?.toLowerCase().includes("stock")) {
    return `ACTUALICON/T_UI_Mods_Stock.webp`;
  }
  if (item.itemId.includes("barrel") || item.type?.toLowerCase().includes("barrel")) {
    return `ACTUALICON/T_UI_Mods_Barrel.webp`;
  }
  if (item.itemId.includes("muzzle") || item.type?.toLowerCase().includes("muzzle")) {
    return `ACTUALICON/T_UI_Mods_Muzzle.webp`;
  }
  if (item.itemId.includes("grip") || item.type?.toLowerCase().includes("grip")) {
    return `ACTUALICON/T_UI_Mods_Grip.webp`;
  }
  if (item.itemId.includes("laser") || item.type?.toLowerCase().includes("laser")) {
    return `ACTUALICON/T_UI_Mods_Laser.webp`;
  }

  // 3. Check for ammo types
  if (item.type?.toLowerCase().includes('ammo') || item.category?.toLowerCase().includes('ammo')) {
    const ammoType = item.name?.toLowerCase() || '';
    if (ammoType.includes('light')) return `ACTUALICON/T_UI_Ammo_Light.webp`;
    if (ammoType.includes('medium')) return `ACTUALICON/T_UI_Ammo_Medium.webp`;
    if (ammoType.includes('heavy')) return `ACTUALICON/T_UI_Ammo_Heavy.webp`;
    if (ammoType.includes('shotgun')) return `ACTUALICON/T_UI_Ammo_Shotgun.webp`;
    if (ammoType.includes('energy')) return `ACTUALICON/T_UI_Ammo_Energy.webp`;
    if (ammoType.includes('special')) return `ACTUALICON/T_UI_Ammo_Special.webp`;
    return `ACTUALICON/T_UI_Ammo_Light.webp`; // default
  }

  // 4. Check for specific attachment icons from ACTUALICON
  const attachmentTypes = {
  'extended barrel': 'ACTUALICON/T_UI_Mods_Barrel.webp',
  'vertical grip': 'ACTUALICON/T_UI_Mods_Grip.webp',
  'horzontal grip': 'ACTUALICON/T_UI_Mods_Grip.webp',
  'kinetic converter': 'ACTUALICON/T_UI_Mods_Kinetic.webp',
  'silencer': 'ACTUALICON/T_UI_Mods_Silencer.webp',
  'extended magazine': 'ACTUALICON/T_UI_Mods_Magazine.webp',
  };
  
  const itemIdLower = item.itemId.toLowerCase();
  for (const [key, iconPath] of Object.entries(attachmentTypes)) {
    if (itemIdLower.includes(key)) {
      return iconPath;
    }
  }

  // 5. Default for items (no folder prefix, just items/)
  return `items/${item.itemId}.webp`;
}

module.exports = {
  getAssetPath,
  getBlueprintRenameMap,
};
