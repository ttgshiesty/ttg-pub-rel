/**
 * ItemCard - Compact market card component
 * Shows item image, rarity-colored background, slot/type icon, price, and item name
 * Styled like wiki item boxes with corner rarity curves
 */
import { type CSSProperties, useState } from 'react';
import { assetUrl } from '../lib/assetUrl';
import {
  getItemData,
  getItemImg,
  RARITY_BG,
  RARITY_COLOR,
  RARITY_GRADIENT,
} from '../lib/itemDb';
import styles from './ItemCard.module.css';

// Category icons mapping
const CATEGORY_ICONS: Record<string, string> = {
  weapon: assetUrl('/icons/weaponmod.webp'),
  weapons: assetUrl('/icons/weaponmod.webp'),
  ammo: assetUrl('/icons/t_ui_itemcategory_ammunition.webp'),
  armor: assetUrl('/icons/gear.webp'),
  utility: assetUrl('/icons/utility.webp'),
  utilities: assetUrl('/icons/utility.webp'),
  medical: assetUrl('/icons/medical.webp'),
  meds: assetUrl('/icons/medical.webp'),
  explosive: assetUrl('/icons/explosive.webp'),
  explosives: assetUrl('/icons/explosive.webp'),
  mine: assetUrl('/icons/mine.webp'),
  mines: assetUrl('/icons/mine.webp'),
  backpack: assetUrl('/icons/backpack.webp'),
  key: assetUrl('/icons/key.webp'),
  keys: assetUrl('/icons/key.webp'),
  blueprint: assetUrl('/icons/blueprint.webp'),
  blueprints: assetUrl('/icons/blueprint.webp'),
  material: assetUrl('/icons/craftingmaterials.webp'),
  materials: assetUrl('/icons/craftingmaterials.webp'),
  augment: assetUrl('/icons/utility.webp'),
  augments: assetUrl('/icons/utility.webp'),
  attachment: assetUrl('/icons/weaponmod.webp'),
  attachments: assetUrl('/icons/weaponmod.webp'),
  misc: assetUrl('/icons/gear.webp'),
  valuable: assetUrl('/icons/valuableicon.webp'),
  valubles: assetUrl('/icons/valuableicon.webp'),
  default: assetUrl('/icons/gear.webp'),
};

// Currency icons
const CURRENCY_ICONS: Record<string, string> = {
  coins: assetUrl('/main/coins.webp'),
  coin: assetUrl('/main/coins.webp'),
  cred: assetUrl('/main/cred_icon.png'),
  creds: assetUrl('/main/cred_icon.png'),
  merits: assetUrl('/icons/merits.webp'),
  default: assetUrl('/main/coins.webp'),
};

interface ItemCardProps {
  itemId: string;
  name?: string;
  price?: number;
  currency?: 'coins' | 'creds' | 'merits' | string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | string;
  category?: string;
  imageUrl?: string;
  onClick?: () => void;
  href?: string;
}

export function ItemCard({
  itemId,
  name: propName,
  price,
  currency = 'coins',
  rarity: proprarity,
  category: propCategory,
  imageUrl: propImageUrl,
  onClick,
  href,
}: ItemCardProps) {
  const [imgError, setImgError] = useState(false);

  // Get item data from database
  const itemData = getItemData(itemId);

  // Resolve values with fallbacks
  const name = propName || itemData?.name?.en || itemId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const rarity = (proprarity || itemData?.rarity || 'common').toLowerCase();
  const category = (propCategory || itemData?.category || itemData?.itemType || 'misc').toLowerCase();
  const imageUrl = propImageUrl || getItemImg(itemId) || '';

  // Get category icon
  const categoryIcon = CATEGORY_ICONS[category] || CATEGORY_ICONS.default;

  // Get currency icon
  const currencyIcon = CURRENCY_ICONS[currency.toLowerCase()] || CURRENCY_ICONS.default;

  // rarity style mapping
  const rarityClassMap: Record<string, string> = {
    common: styles.rarityCommon,
    uncommon: styles.rarityUncommon,
    rare: styles.rarityRare,
    epic: styles.rarityEpic,
    legendary: styles.rarityLegendary,
  };

  const nameClassMap: Record<string, string> = {
    common: styles.nameCommon,
    uncommon: styles.nameUncommon,
    rare: styles.nameRare,
    epic: styles.nameEpic,
    legendary: styles.nameLegendary,
  };

  const rarityClass = rarityClassMap[rarity] || styles.rarityCommon;
  const nameClass = nameClassMap[rarity] || '';
  const rarityBg = RARITY_BG[rarity] || RARITY_GRADIENT[rarity];
  const rarityColor = RARITY_COLOR[rarity] || RARITY_COLOR.common;

  const handleClick = () => {
    if (onClick) onClick();
    if (href) {
      window.location.href = href;
    }
  };

  return (
    <div className={styles.container}>
      <div
        className={`${styles.itemCell} ${rarityClass}`}
        onClick={handleClick}
        style={
          {
            '--item-rarity-color': rarityColor,
            backgroundImage: rarityBg ? `url(${rarityBg})` : undefined,
          } as CSSProperties
        }
      >
        {/* Clickable overlay for better UX */}
        <span className={styles.clickableOverlay} />

        {/* Item Image */}
        <div className={styles.itemImage}>
          {!imgError && imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              style={{
                width: '40px',
                height: '40px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: '#666',
              }}
            >
              ?
            </div>
          )}
        </div>

        {/* Bottom Data Bar */}
        <div className={styles.dataTable}>
          {/* Category/Type Icon */}
          <div className={styles.categoryIcon}>
            <img src={categoryIcon} alt={category} />
          </div>

          {/* Price */}
          {price !== undefined && (
            <div className={styles.price}>
              <img src={currencyIcon} alt={currency} />
              <span>{price.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Item Name */}
      <a
        href={href || '#'}
        className={`${styles.itemName} ${nameClass}`}
        onClick={(e) => {
          if (!href) e.preventDefault();
          if (onClick) onClick();
        }}
      >
        {name}
      </a>
    </div>
  );
}

export default ItemCard;
