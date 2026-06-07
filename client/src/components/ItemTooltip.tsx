/**
 * ItemTooltip — ARC Raiders item rarity tooltip
 *
 * Renders the `.shiesty-item-info` card (defined in index.css) as a portal
 * tooltip that follows the mouse or anchors to an element.
 *
 * The image container uses the exact Arc Raiders curved SVG corner glow effect:
 *   - A sharp SVG path accent in the bottom-left corner (rarity color)
 *   - Two blurred/brightened copies for the bloom glow effect
 *
 * Usage:
 *   <ItemTooltip item={myItem}>
 *     <img src={...} />
 *   </ItemTooltip>
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import {
  getItemImg,
  getItemImgWebp,
  getItemData,
  RARITY_BG,
  RARITY_GRADIENT,
} from '../lib/itemDb';
import { STAT_ICON, iconProps } from '../lib/gameIcons';

/* ── rarity config (exact spec colors) ─────────────────────────────────────── */
const RARITY_COLORS: Record<string, string> = {
  Legendary: '#ffcc00',
  Epic: '#c43198',
  Rare: '#01abf4',
  Uncommon: '#25bb55',
  Common: '#6c6b6a',
};
const rarityColor = (r?: string) =>
  RARITY_COLORS[r ?? ''] ?? RARITY_COLORS.Common;

/* ── Types ──────────────────────────────────────────────────────────────────── */
export interface TooltipItem {
  id?: string;
  name: string;
  rarity?: string;
  type?: string;
  item_type?: string;
  description?: string;
  weight?: number;
  stackSize?: number;
  stack_size?: number;
  value?: number;
  sell_price?: number;
  iconUrl?: string;
  icon?: string;
  // Extra stat fields shown in grid
  damage?: number;
  rpm?: number;
  range?: number;
  magSize?: number;
  mag_size?: number;
}

/* ── ItemImage helper ───────────────────────────────────────────────────────── */
function ItemImage({ item, size = 80 }: { item: TooltipItem; size?: number }) {
  const [idx, setIdx] = useState(0);
  // Pull CDN icon from local DB if available — covers items whose slug doesn't match filename
  const dbIcon = item.id ? ((getItemData(item.id) as any)?.icon ?? null) : null;
  const srcs = [
    item.iconUrl,
    item.icon,
    item.id ? getItemImg(item.id) : null, // /items/<slug>.webp
    item.id ? getItemImgWebp(item.id) : null, // /items/<slug>.png
    dbIcon, // cdn.arctracker.io fallback
  ].filter(Boolean) as string[];

  const src = srcs[idx];
  if (!src)
    return (
      <div
        className="flex items-center justify-center rounded"
        style={{
          width: size,
          height: size,
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <span style={{ fontSize: size * 0.35, opacity: 0.3 }}>?</span>
      </div>
    );

  return (
    <img
      src={src}
      alt={item.name}
      width={size}
      height={size}
      className="object-contain relative"
      style={{ zIndex: 10 }}
      onError={() => setIdx((i) => Math.min(i + 1, srcs.length - 1))}
    />
  );
}

/* ── Curved SVG corner glow (exact Arc Raiders spec) ───────────────────────── */
// Path: M0 64V0C0 0 4 21 23.5 40.5C43 60 64 64 64 64H0Z
// This creates the curved corner accent seen in the real game UI.
function RarityCornerGlow({ color }: { color: string }) {
  const path = 'M0 64V0C0 0 4 21 23.5 40.5C43 60 64 64 64 64H0Z';
  return (
    <>
      {/* Sharp accent — bottom left, z-index on top */}
      <svg
        viewBox="0 0 64 64"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: 64,
          height: 64,
          zIndex: 20,
          fill: color,
          pointerEvents: 'none',
        }}
      >
        <path d={path} />
      </svg>
      {/* Blur glow — bottom left */}
      <svg
        viewBox="0 0 64 64"
        style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          width: 64,
          height: 64,
          zIndex: 10,
          fill: color,
          filter: 'blur(24px) brightness(1.5)',
          pointerEvents: 'none',
        }}
      >
        <path d={path} />
      </svg>
      {/* Blur glow — bottom right (rotated -90°) */}
      <svg
        viewBox="0 0 64 64"
        style={{
          position: 'absolute',
          bottom: -4,
          right: -4,
          width: 64,
          height: 64,
          fill: color,
          filter: 'blur(24px) brightness(1.5)',
          transform: 'rotate(-90deg)',
          pointerEvents: 'none',
        }}
      >
        <path d={path} />
      </svg>
    </>
  );
}

/* ── Tooltip card ───────────────────────────────────────────────────────────── */
function ItemCard({ item }: { item: TooltipItem }) {
  const color = rarityColor(item.rarity);
  const typeStr = item.type || item.item_type || 'Item';
  const weight = item.weight;
  const stack = item.stackSize ?? item.stack_size;
  const value = item.value ?? item.sell_price;
  const dmg = item.damage;
  const rpm = item.rpm;
  const mag = item.magSize ?? item.mag_size;

  const stats: { label: string; val: number | string; icon?: string }[] = [];
  if (weight !== undefined)
    stats.push({ label: 'Weight', val: `${weight}kg`, icon: STAT_ICON.weight });
  if (stack !== undefined) stats.push({ label: 'Stack', val: stack });
  if (value !== undefined)
    stats.push({
      label: 'Value',
      val: value.toLocaleString(),
      icon: STAT_ICON.currency,
    });
  if (dmg !== undefined) stats.push({ label: 'Damage', val: dmg });
  if (rpm !== undefined) stats.push({ label: 'RPM', val: rpm });
  if (mag !== undefined) stats.push({ label: 'Mag', val: mag });

  return (
    <div
      className="shiesty-item-info"
      style={{ '--rarity-color': color } as React.CSSProperties}
    >
      {/* Image with curved SVG rarity glow corners */}
      <div
        className="image-container"
        style={{
          backgroundImage:
            RARITY_BG[item.rarity ?? 'Common'] ||
            RARITY_GRADIENT[item.rarity ?? 'Common']
              ? `url(${RARITY_BG[item.rarity ?? 'Common'] || RARITY_GRADIENT[item.rarity ?? 'Common']})`
              : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <ItemImage item={item} size={80} />
        <RarityCornerGlow color={color} />
      </div>

      <div className="info-inner">
        {/* Type + rarity badges */}
        <div className="badge-row">
          <span className="badge type-badge">{typeStr}</span>
          <span className="badge rarity-badge">{item.rarity ?? 'Common'}</span>
        </div>

        {/* Name */}
        <p className="item-title">{item.name}</p>

        {/* Description */}
        {item.description && (
          <p className="item-description">{item.description}</p>
        )}

        {/* Stats grid */}
        {stats.length > 0 && (
          <div className="stats-grid">
            {stats.map(({ label, val, icon }) => (
              <div key={label} className="stat-box">
                <span className="stat-label">
                  {icon && (
                    <img
                      {...iconProps(icon, 10)}
                      alt={label}
                      style={{
                        display: 'inline-block',
                        verticalAlign: 'middle',
                        marginRight: 3,
                        width: 10,
                        height: 10,
                      }}
                    />
                  )}
                  {label}
                </span>
                {val}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Portal tooltip with mouse-follow ───────────────────────────────────────── */
interface ItemTooltipProps {
  item: TooltipItem | null | undefined;
  children: ReactNode;
  disabled?: boolean;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function ItemTooltip({
  item,
  children,
  disabled = false,
  side: _side = 'top',
}: ItemTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), 100);
  }, []);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const GAP = 14;
    const W = 300;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = e.clientX + GAP;
    let y = e.clientY - GAP;
    if (x + W > vw) x = e.clientX - W - GAP;
    if (y < 0) y = e.clientY + GAP;
    if (y + 320 > vh) y = vh - 330;
    setPos({ x, y });
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  if (!item || disabled) return <>{children}</>;

  return (
    <>
      <span
        onMouseEnter={show}
        onMouseLeave={hide}
        onMouseMove={onMouseMove}
        style={{ display: 'contents' }}
      >
        {children}
      </span>

      {visible &&
        createPortal(
          <div
            className="shiesty-tooltip"
            style={{
              position: 'fixed',
              left: pos.x,
              top: pos.y,
              zIndex: 9999,
              pointerEvents: 'none',
            }}
          >
            <ItemCard item={item} />
          </div>,
          document.body,
        )}
    </>
  );
}

export default ItemTooltip;
