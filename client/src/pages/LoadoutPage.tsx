import { usePlayer } from '../context/PlayerContext';
import {
  getItemImg,
  enrichItem,
  getItemName,
  getItemData,
} from '../lib/itemDb';
import {
  CATEGORY_ICON,
  WEAPON_TYPE_ICON,
  ATTACHMENT_ICON,
  STAT_ICON,
  iconProps,
} from '../lib/gameIcons';
import {
  Crosshair,
  Shield,
  Backpack,
  Box,
  Zap,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { assetUrl } from '../lib/assetUrl';
import {
  getRarityVisualTier,
  rarityImageBackdropClass,
} from '../lib/rarityCardStyles';

const ICONS = {
  backpack: assetUrl('/icons/backpack.webp'),
  shield: assetUrl('/icons/gear.webp'),
  weapon: assetUrl('/icons/gunicon.webp'),
  augment: assetUrl('/icons/utility.webp'),
};

/* ARC Raiders official rarity colors */
const RC: Record<string, { border: string; bg: string; text: string }> = {
  legendary: { border: '#ffcc00', bg: '#ffcc0010', text: '#ffcc00' },
  epic: { border: '#c43198', bg: '#c4319810', text: '#c43198' },
  rare: { border: '#01abf4', bg: '#01abf410', text: '#01abf4' },
  uncommon: { border: '#25bb55', bg: '#25bb5510', text: '#25bb55' },
  common: { border: '#8a8a8a', bg: '#8a8a8a08', text: '#8a8a8a' },
  exotic: { border: '#f1aa1c', bg: '#f1aa1c10', text: '#f1aa1c' },
};
const rc = (r?: string) => RC[(r ?? 'common').toLowerCase()] ?? RC.common;

const YELLOW = '#f1aa1c';
const CYAN = '#01abf4';
const GREEN = '#25bb55';
const RED = '#e83a3a';
const MUTED = '#fdfaff';
const CARD = '#1a1120';
const BORDER = '#2d1f38';

type AttachmentSlotKey =
  | 'muzzle'
  | 'underbarrel'
  | 'magazine_light'
  | 'magazine_medium'
  | 'magazine_shotgun'
  | 'stock'
  | 'shotgun_muzzle'
  | 'weapon_mod';

const ATTACHMENT_SLOT_LABEL: Record<AttachmentSlotKey, string> = {
  muzzle: 'Muzzle',
  underbarrel: 'Underbarrel',
  magazine_light: 'Light Magazine',
  magazine_medium: 'Medium Magazine',
  magazine_shotgun: 'Shotgun Magazine',
  stock: 'Stock',
  shotgun_muzzle: 'Shotgun Muzzle',
  weapon_mod: 'Tech Mod',
};

const WEAPON_ATTACHMENT_SLOTS: Record<string, AttachmentSlotKey[]> = {
  kettle: ['muzzle', 'underbarrel', 'magazine_light', 'stock'],
  rattler: ['muzzle', 'underbarrel', 'stock'],
  arpeggio: ['muzzle', 'underbarrel', 'magazine_medium', 'stock'],
  tempest: ['muzzle', 'underbarrel', 'magazine_medium'],
  bettina: ['muzzle', 'underbarrel', 'stock'],
  ferro: ['muzzle', 'underbarrel', 'stock'],
  renegade: ['muzzle', 'magazine_medium', 'stock'],
  aphelion: ['underbarrel', 'stock'],
  stitcher: ['muzzle', 'underbarrel', 'magazine_light', 'stock'],
  canto: ['muzzle', 'underbarrel', 'magazine_light', 'stock'],
  bobcat: ['muzzle', 'underbarrel', 'magazine_light', 'stock'],
  il_toro: ['shotgun_muzzle', 'underbarrel', 'magazine_shotgun', 'stock'],
  vulcano: ['shotgun_muzzle', 'underbarrel', 'magazine_shotgun', 'stock'],
  hairpin: ['magazine_light'],
  burletta: ['muzzle', 'magazine_light'],
  venator: ['underbarrel', 'magazine_medium'],
  anvil: ['muzzle', 'weapon_mod'],
  torrente: ['muzzle', 'magazine_medium', 'stock'],
  osprey: ['muzzle', 'underbarrel', 'magazine_medium', 'stock'],
  hullcracker: ['underbarrel', 'stock'],
};

const normalizeWeaponKey = (value?: string | null) =>
  String(value || '')
    .toLowerCase()
    .replace(/[_\s-]+(i|ii|iii|iv)$/i, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const classifyAttachmentSlot = (attachment: any): AttachmentSlotKey | null => {
  const raw = [
    attachment?.slot,
    attachment?.slotType,
    attachment?.type,
    attachment?.category,
    attachment?.name,
    attachment?.itemId,
    attachment?.id,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!raw) return null;
  if (raw.includes('shotgun') && raw.includes('muzzle'))
    return 'shotgun_muzzle';
  if (
    raw.includes('shotgun') &&
    (raw.includes('choke') || raw.includes('silencer'))
  )
    return 'shotgun_muzzle';
  if (raw.includes('shotgun') && raw.includes('mag')) return 'magazine_shotgun';
  if (raw.includes('light') && raw.includes('mag')) return 'magazine_light';
  if (raw.includes('medium') && raw.includes('mag')) return 'magazine_medium';
  if (raw.includes('mag')) return 'magazine_medium';
  if (raw.includes('underbarrel') || raw.includes('grip')) return 'underbarrel';
  if (
    raw.includes('muzzle') ||
    raw.includes('silencer') ||
    raw.includes('compensator') ||
    raw.includes('barrel') ||
    raw.includes('choke')
  )
    return 'muzzle';
  if (raw.includes('stock')) return 'stock';
  if (raw.includes('tech') || raw.includes('mod')) return 'weapon_mod';
  return null;
};

const getWeaponAttachmentSlots = (item: any): AttachmentSlotKey[] => {
  const candidates = [item?.id, item?.itemId, item?.name].map(
    normalizeWeaponKey,
  );
  for (const key of candidates) {
    if (WEAPON_ATTACHMENT_SLOTS[key]) return WEAPON_ATTACHMENT_SLOTS[key];
  }
  return [];
};

const mapAttachmentsToSlots = (
  attachments: any[],
  slots: AttachmentSlotKey[],
) => {
  const bySlot = new Map<AttachmentSlotKey, any>();
  const unmatched: any[] = [];

  for (const attachment of attachments) {
    const slot = classifyAttachmentSlot(attachment);
    if (slot && slots.includes(slot) && !bySlot.has(slot)) {
      bySlot.set(slot, attachment);
    } else {
      unmatched.push(attachment);
    }
  }

  for (const attachment of unmatched) {
    const openSlot = slots.find((slot) => !bySlot.has(slot));
    if (!openSlot) break;
    bySlot.set(openSlot, attachment);
  }

  return bySlot;
};

interface LoadoutItemProps {
  slot: string;
  label: string;
  icon: any;
  item?: any;
}

function LoadoutItem({ slot, label, icon: Icon, item }: LoadoutItemProps) {
  // Get item data from items-master for accurate rarity
  const itemId = item?.id || item?.itemId || '';
  const masterData = itemId ? getItemData(itemId) : null;
  const rarity = masterData?.rarity || item?.rarity || 'common';
  const style = rc(rarity);
  const displayName = masterData?.name?.en || item?.name || 'Unknown Item';
  const hasItem = !!item && !!displayName;
  const isWeaponSlot = slot === 'primary' || slot === 'secondary';
  const compatibleAttachmentSlots =
    hasItem && isWeaponSlot ? getWeaponAttachmentSlots(item) : [];
  const itemAttachments = Array.isArray(item?.attachments)
    ? item.attachments
    : [];
  const attachmentsBySlot = mapAttachmentsToSlots(
    itemAttachments,
    compatibleAttachmentSlots,
  );
  const rarityTier = getRarityVisualTier(rarity);
  const imgBackdrop = rarityImageBackdropClass(rarityTier);

  return (
    <div
      className="raider-box p-5 group transition-all"
      style={{
        background: CARD,
        borderLeft: `4px solid ${hasItem ? style.border : BORDER}`,
        border: `1px solid ${BORDER}`,
        borderLeftWidth: 4,
        borderLeftColor: hasItem ? style.border : BORDER,
      }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-16 h-16 shrink-0 flex items-center justify-center relative overflow-hidden"
          style={{
            background: '#130918',
            border: `2px solid ${hasItem ? style.border : BORDER}`,
            boxShadow: hasItem ? `0 0 12px ${style.border}25` : 'none',
          }}
        >
          {hasItem && <div className={imgBackdrop} />}
          {hasItem ? (
            <img
              src={getItemImg(itemId) || ''}
              alt={displayName}
              className="w-12 h-12 object-contain transition-transform duration-200 group-hover:scale-110"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                if (!el.dataset.webp) {
                  el.dataset.webp = '1';
                  el.src = el.src.replace(/\.webp$/, '.png');
                } else el.style.display = 'none';
              }}
            />
          ) : typeof Icon === 'string' ? (
            <img
              src={Icon}
              alt={label}
              className="w-6 h-6 object-contain opacity-40"
            />
          ) : (
            <Icon className="w-6 h-6" style={{ color: BORDER }} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="text-xs font-black uppercase tracking-[0.25em]"
              style={{ color: MUTED }}
            >
              {label}
            </span>
            {rarity && (
              <span
                className="text-xs font-black uppercase px-2 py-0.5 border"
                style={{
                  borderColor: style.border,
                  color: style.text,
                  background: style.bg,
                }}
              >
                {rarity}
              </span>
            )}
            {item?.quantity > 1 && (
              <span
                className="text-xs font-black px-1.5 py-0.5 border"
                style={{ borderColor: BORDER, color: MUTED }}
              >
                x{item.quantity}
              </span>
            )}
          </div>

          {hasItem ? (
            <>
              <h3 className="text-base font-black text-white uppercase tracking-wide truncate">
                {displayName}
              </h3>
              {item.description && (
                <p
                  className="text-sm mt-1 line-clamp-2"
                  style={{ color: MUTED }}
                >
                  {item.description}
                </p>
              )}

              {/* Durability bar */}
              {item.durability != null && (
                <div className="mt-2">
                  <div className="flex justify-between mb-1">
                    <span
                      className="text-xs uppercase font-black"
                      style={{ color: MUTED }}
                    >
                      Durability
                    </span>
                    <span
                      className="text-xs font-black"
                      style={{
                        color:
                          item.durability >= 80
                            ? GREEN
                            : item.durability >= 40
                              ? YELLOW
                              : RED,
                      }}
                    >
                      {item.durability}%
                    </span>
                  </div>
                  <div className="w-full h-1.5" style={{ background: BORDER }}>
                    <div
                      className="h-full"
                      style={{
                        width: `${item.durability}%`,
                        background:
                          item.durability >= 80
                            ? GREEN
                            : item.durability >= 40
                              ? YELLOW
                              : RED,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {item.damage && (
                  <span
                    className="text-xs font-data font-black"
                    style={{ color: RED }}
                  >
                    DMG: {item.damage}
                  </span>
                )}
                {item.ammoType && (
                  <span
                    className="text-xs font-data font-black flex items-center gap-1"
                    style={{ color: YELLOW }}
                  >
                    {WEAPON_TYPE_ICON[item.ammoType.toLowerCase()] && (
                      <img
                        {...iconProps(
                          WEAPON_TYPE_ICON[item.ammoType.toLowerCase()],
                          14,
                        )}
                        alt={item.ammoType}
                      />
                    )}
                    {item.ammoType}
                  </span>
                )}
                {item.magazineSize && (
                  <span
                    className="text-xs font-data font-black"
                    style={{ color: CYAN }}
                  >
                    MAG: {item.magazineSize}
                  </span>
                )}
              </div>

              {/* Attachments */}
              {compatibleAttachmentSlots.length > 0 && (
                <div className="mt-3">
                  <p
                    className="text-[10px] font-black uppercase tracking-[0.25em] mb-1.5"
                    style={{ color: MUTED }}
                  >
                    Attachments
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {compatibleAttachmentSlots.map((slotKey) => {
                      const attachment = attachmentsBySlot.get(slotKey);
                      const attachmentId =
                        attachment?.itemId || attachment?.id || '';
                      const attachmentName =
                        attachment?.name ||
                        getItemData(attachmentId)?.name?.en ||
                        ATTACHMENT_SLOT_LABEL[slotKey];
                      const attachmentIcon =
                        (attachmentId && getItemImg(attachmentId)) ||
                        ATTACHMENT_ICON[slotKey] ||
                        ATTACHMENT_ICON.weapon_mod;
                      return (
                        <span
                          key={slotKey}
                          className="text-xs font-black uppercase border px-1.5 py-1 flex items-center gap-1.5"
                          title={
                            attachment
                              ? `${ATTACHMENT_SLOT_LABEL[slotKey]}: ${attachmentName}`
                              : `${ATTACHMENT_SLOT_LABEL[slotKey]} slot`
                          }
                          style={{
                            borderColor: attachment ? style.border : BORDER,
                            color: attachment ? style.text : MUTED,
                            background: attachment ? style.bg : '#130918',
                          }}
                        >
                          <img
                            src={attachmentIcon}
                            alt={attachmentName}
                            className="w-4 h-4 object-contain"
                            onError={(e) => {
                              const el = e.currentTarget as HTMLImageElement;
                              if (!el.dataset.slotFallback) {
                                el.dataset.slotFallback = '1';
                                el.src =
                                  ATTACHMENT_ICON[slotKey] ||
                                  ATTACHMENT_ICON.weapon_mod;
                              } else {
                                el.style.opacity = '0.25';
                              }
                            }}
                          />
                          {attachment
                            ? attachmentName
                            : ATTACHMENT_SLOT_LABEL[slotKey]}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2" style={{ color: BORDER }}>
              <Box className="w-4 h-4" />
              <span
                className="text-sm font-black uppercase tracking-widest"
                style={{ color: MUTED }}
              >
                SLOT EMPTY
              </span>
            </div>
          )}
        </div>

        {hasItem && (
          <ChevronRight
            className="w-4 h-4 shrink-0 mt-1 transition-colors"
            style={{ color: BORDER }}
          />
        )}
      </div>
    </div>
  );
}

export default function LoadoutPage() {
  const { loadout, isLoading, authState } = usePlayer();

  if (authState === 'needs_token' || authState === 'token_pending') {
    return (
      <div className="max-w-7xl mx-auto px-4 mt-20 text-center">
        <div
          className="raider-box p-12 border"
          style={{ background: CARD, borderColor: BORDER }}
        >
          <Shield
            className="w-12 h-12 mx-auto mb-6"
            style={{ color: YELLOW }}
          />
          <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">
            TOKEN REQUIRED
          </h2>
          <p
            className="text-sm uppercase tracking-[0.3em]"
            style={{ color: MUTED }}
          >
            Link your ARC Raiders token to view your equipped loadout.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2
          className="w-10 h-10 animate-spin mb-4"
          style={{ color: YELLOW }}
        />
        <p
          className="text-sm font-black uppercase tracking-[0.4em]"
          style={{ color: YELLOW }}
        >
          Loading Loadout Data...
        </p>
      </div>
    );
  }

  const raw = loadout || {};
  const data = raw.loadout || raw;

  const normalizeItem = (item: any) => {
    if (!item || typeof item !== 'object') return undefined;
    const enriched = enrichItem(item);
    const id = item.itemId || item.id || item.itemID || '';
    return {
      name: getItemName(enriched),
      id,
      durability:
        item.durabilityPercent != null
          ? Math.round(item.durabilityPercent)
          : undefined,
      rarity: enriched.rarity,
      quantity: item.quantity,
      description:
        typeof enriched.description === 'string'
          ? enriched.description
          : (enriched.description?.en ?? ''),
      damage: enriched.effects?.Damage?.value ?? item.damage,
      ammoType: enriched.effects?.['Ammo Type']?.value ?? item.ammoType,
      magazineSize:
        enriched.effects?.['Magazine Size']?.value ?? item.magazineSize,
      modSlots: item.modSlots,
      attachments: item.attachments,
      type: enriched.type,
      value: enriched.value,
    };
  };

  const slots = {
    primary: normalizeItem(
      data.weapon1 || data.primary || data.weapons?.primary,
    ),
    secondary: normalizeItem(
      data.weapon2 || data.secondary || data.weapons?.secondary,
    ),
    armor: normalizeItem(data.shield || data.armor || data.vest),
    augment: normalizeItem(data.augment || data.helmet || data.head),
    backpack: normalizeItem(
      Array.isArray(data.backpack)
        ? data.backpack[0]
        : data.backpack || data.bag,
    ),
    utility1: normalizeItem(
      Array.isArray(data.quickItems)
        ? data.quickItems[0]
        : data.utility1 || data.gadgets?.[0],
    ),
    utility2: normalizeItem(
      Array.isArray(data.quickItems)
        ? data.quickItems[1]
        : data.utility2 || data.gadgets?.[1],
    ),
    utility3: normalizeItem(
      Array.isArray(data.quickItems)
        ? data.quickItems[2]
        : data.utility3 || data.gadgets?.[2],
    ),
    utility4: normalizeItem(
      Array.isArray(data.quickItems)
        ? data.quickItems[3]
        : data.utility4 || data.gadgets?.[3],
    ),
    utility5: normalizeItem(
      Array.isArray(data.quickItems)
        ? data.quickItems[4]
        : data.utility5 || data.gadgets?.[4],
    ),
  };

  const hasAnyItem = Object.values(slots).some((s) => s && s.name);

  const SectionHead = ({
    icon: Icon,
    label,
    color,
  }: {
    icon: any;
    label: string;
    color: string;
  }) => (
    <h2
      className="text-sm font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-2"
      style={{ color }}
    >
      <Icon className="w-4 h-4" /> {label}
    </h2>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 mt-8 pb-20">
      {/* Header */}
      <div className="border-b pb-6 mb-6" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-3 mb-2">
          <img {...iconProps(CATEGORY_ICON.weapons, 24)} alt="Loadout" />
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">
            ACTIVE LOADOUT
          </h1>
        </div>
        <p
          className="text-sm uppercase tracking-[0.4em]"
          style={{ color: MUTED }}
        >
          Currently equipped gear — Live from your ARC Raiders profile
        </p>
      </div>

      {!hasAnyItem && (
        <div
          className="raider-box p-6 border mb-6 flex items-center gap-4"
          style={{ background: CARD, borderColor: `${YELLOW}40` }}
        >
          <AlertTriangle
            className="w-6 h-6 shrink-0"
            style={{ color: YELLOW }}
          />
          <div>
            <p
              className="text-sm font-black uppercase tracking-wider"
              style={{ color: YELLOW }}
            >
              NO EQUIPMENT DETECTED
            </p>
            <p className="text-sm mt-1" style={{ color: MUTED }}>
              Launch ARC Raiders and equip your gear. The extension will capture
              your loadout automatically.
            </p>
          </div>
        </div>
      )}

      {/* Weapons */}
      <div className="mb-8">
        <SectionHead icon={Zap} label="Weapons" color={RED} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LoadoutItem
            slot="primary"
            label="Primary Weapon"
            icon={CATEGORY_ICON.weapons}
            item={slots.primary}
          />
          <LoadoutItem
            slot="secondary"
            label="Secondary Weapon"
            icon={CATEGORY_ICON.weapons}
            item={slots.secondary}
          />
        </div>
      </div>

      {/* Protection */}
      <div className="mb-8">
        <SectionHead icon={Shield} label="Protection" color={CYAN} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LoadoutItem
            slot="armor"
            label="Body Armor / Vest"
            icon={CATEGORY_ICON.armor}
            item={slots.armor}
          />
          <LoadoutItem
            slot="augment"
            label="Augment"
            icon={CATEGORY_ICON.augments}
            item={slots.augment}
          />
        </div>
      </div>

      {/* Carrier */}
      <div className="mb-8">
        <SectionHead icon={Backpack} label="Carrier" color={GREEN} />
        <LoadoutItem
          slot="backpack"
          label="Backpack"
          icon={CATEGORY_ICON.backpack}
          item={slots.backpack}
        />
      </div>

      {/* Utilities */}
      <div className="mb-8">
        <SectionHead icon={Activity} label="Utilities" color={YELLOW} />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            slots.utility1,
            slots.utility2,
            slots.utility3,
            slots.utility4,
            slots.utility5,
          ].map((u, i) => (
            <LoadoutItem
              key={i}
              slot={`utility${i + 1}`}
              label={`Utility Slot ${i + 1}`}
              icon={CATEGORY_ICON.utilities}
              item={u}
            />
          ))}
        </div>
      </div>

      {/* Raw JSON */}
      {loadout && (
        <details
          className="raider-box border p-4"
          style={{ background: CARD, borderColor: BORDER }}
        >
          <summary
            className="cursor-pointer text-sm font-black uppercase tracking-wider transition-colors"
            style={{ color: MUTED }}
          >
            Raw Loadout JSON
          </summary>
          <pre
            className="mt-3 p-3 border text-sm overflow-x-auto whitespace-pre-wrap"
            style={{
              background: '#130918',
              borderColor: BORDER,
              color: '#25bb55',
            }}
          >
            {JSON.stringify(loadout, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
