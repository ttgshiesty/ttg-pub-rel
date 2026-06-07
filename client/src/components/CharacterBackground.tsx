import { useEffect, useRef, useState } from 'react';
import { assetUrl } from '../lib/assetUrl';

interface CharacterBackgroundProps {
  activeTab: string;
}

const RANDOM_IMAGES = [assetUrl('/backrounds/backdrop.png')];
//   FILL  URL HERE FOR DIFFERNT BACKDROPS
// const RANDOM_IMAGES = [assetUrl('/backrounds/backdrop.png')];
// const RANDOM_IMAGES = [assetUrl('/backrounds/backdrop.png')];
// const RANDOM_IMAGES = [assetUrl('/backrounds/backdrop.png')];

function getRandomImage(currentImage?: string) {
  const choices = RANDOM_IMAGES.filter((img) => img !== currentImage);

  if (choices.length === 0) {
    return RANDOM_IMAGES[0];
  }

  return choices[Math.floor(Math.random() * choices.length)];
}

export default function CharacterBackground({
  activeTab,
}: CharacterBackgroundProps) {
  const [rolling, setRolling] = useState(false);
  const [characterImage, setCharacterImage] = useState(() => getRandomImage());
  const prevTab = useRef(activeTab);

  useEffect(() => {
    if (prevTab.current !== activeTab) {
      prevTab.current = activeTab;

      setCharacterImage((current) => getRandomImage(current));
      setRolling(true);

      const timer = setTimeout(() => {
        setRolling(false);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  return null;
}