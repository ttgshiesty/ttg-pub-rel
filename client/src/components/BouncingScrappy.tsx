import { assetUrl } from '../lib/assetUrl';

export default function BouncingScrappy() {
  return (
    <>
      <div className="bouncing-scrappy">
        <img
          src={assetUrl('/main/outfitscrappy.webp')}
          alt="Scrappy"
          className="scrappy-img"
        />
      </div>
      <div className="embark">
        <img
          src={assetUrl('/embark.webp')}
          alt="Embark"
          className="embark-img"
        />
      </div>
    </>
  );
}
