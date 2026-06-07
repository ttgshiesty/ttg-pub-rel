import { assetUrl } from '../../lib/assetUrl';

interface HudStatBoxProps {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  iconSrc?: string;
  compact?: boolean;
  sub?: string;
}

export function HudStatBox({
  label,
  value,
  color = 'var(--color-arc-rare)',
  icon: Icon,
  iconSrc,
  compact = false,
  sub,
}: HudStatBoxProps) {
  return (
    <div
      className={`hud-box ${compact ? 'hud-box--compact' : ''}`}
      style={{ '--hud-accent': color } as React.CSSProperties}
    >
      <div className="hud-header">
        {iconSrc ? (
          <img src={iconSrc} alt="" className="main-icon" />
        ) : Icon ? (
          <Icon className="main-icon" />
        ) : null}
      </div>
      <span className="hud-title">{label}</span>
      <span className="hud-value">{value}</span>
      {sub && <span className="hud-sub">{sub}</span>}
    </div>
  );
}

export default HudStatBox;
