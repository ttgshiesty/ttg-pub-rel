import type { LiveDataFeedBannerKey } from '../../lib/live-data/feedState';
import { LIVE_DATA_BANNER } from '../../lib/live-data/messages';

type Props = {
  bannerKey: LiveDataFeedBannerKey;
  className?: string;
};

/** One-line contextual copy for live schedule state (non-alarming). */
export function LiveDataFeedBanner({ bannerKey, className = '' }: Props) {
  const text = LIVE_DATA_BANNER[bannerKey];
  if (bannerKey === 'live') return null;
  return (
    <p
      className={`text-[10px] sm:text-[11px] text-white/55 leading-snug ${className}`}
    >
      {text}
    </p>
  );
}
