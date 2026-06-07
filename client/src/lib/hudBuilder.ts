/**
 * HUD Builder - Generate stat box HTML for dashboard items
 * Based on statgrid.json from S3 bucket assets
 */

import { assetUrl } from './assetUrl';

// Asset mapping for tier icons and ammo types (matches S3 bucket structure)
const assetMap = {
  characters: ['apollo', 'celeste', 'lance', 'shani'],
  tiers: { 1: 'one', 2: 'two', 3: 'three', 4: 'four' },
  ammo: {
    Energy: 'EnergyType',
    Heavy: 'HeavyType',
    Medium: 'MediumType',
    Light: 'LightType',
  },
};

interface ItemData {
  id: string;
  name: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  type?: string;
  tier?: 1 | 2 | 3 | 4;
  ammoType?: 'Energy' | 'Heavy' | 'Medium' | 'Light';
}

/**
 * Build a dashboard stat box HTML string
 * @param itemData - Item data with id, name, rarity, type, tier, ammoType
 * @returns HTML string for the stat box
 */
export function buildDashboardItem(itemData: ItemData): string {
  // Determine icon file based on item type
  let iconFile = `${itemData.id}.webp`;
  const iconFilePng = `${itemData.id}.png`;
  const iconFileSvg = `${itemData.id}.svg`;
  if (itemData.type === 'weapon' && itemData.tier) {
    iconFile = `${assetMap.tiers[itemData.tier]}.webp`;
  }

  const iconUrl = assetUrl(`/icons/${iconFile}`);
  const ammoType = itemData.ammoType ? assetMap.ammo[itemData.ammoType] : null;
  const ammoUrl = ammoType ? assetUrl(`/icons/${ammoType}.webp`) : null;

  return `
    <div class="stat-box" data-rarity="${itemData.rarity}">
      <img src="${iconUrl}" class="barrel-roll" alt="${itemData.name}">
      <div class="stats">
         <span>${itemData.name}</span>
         ${ammoUrl ? `<img src="${ammoUrl}" class="ammo-mini-icon" alt="ammo">` : ''}
      </div>
    </div>
  `;
}

/**
 * Build a HUD box with header, icon, title and description
 * @param title - HUD title
 * @param description - HUD description text
 * @param iconUrl - URL for main icon
 * @param status - Optional status (e.g., 'locked')
 * @returns HTML string for the HUD box
 */
export function buildHudBox(
  title: string,
  description: string,
  iconUrl: string,
  status?: 'locked',
): string {
  const statusAttr = status ? `data-status="${status}"` : '';

  return `
    <div class="hud-box" ${statusAttr}>
      <div class="hud-header">
        <img src="${iconUrl}" class="main-icon" alt="${title}">
      </div>
      <span class="hud-title">${title}</span>
      <p class="hud-desc">${description}</p>
    </div>
  `;
}

