import { assetUrl } from '../lib/assetUrl';

/**
 * FixedBackdrop - A fixed background image that stays in place while page scrolls
 * Uses the official ARC Raiders backdrop.png from assets.shiesty.me
 */
export default function FixedBackdrop() {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: `url(${assetUrl('/backrounds/backdrop.png')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Dark overlay for better readability of content */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.7) 100%)',
        }}
      />
    </div>
  );
}
