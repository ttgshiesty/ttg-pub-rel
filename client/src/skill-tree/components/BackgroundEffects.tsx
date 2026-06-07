import type { FC } from 'react';

export const BackgroundEffects: FC = () => {
  return (
    <div className="absolute w-full h-full overflow-visible select-none pointer-events-none">
      {/* Floating Glow Orbs */}
      <div
        className="size-26 bg-[#93aeff] rounded-full right-64 top-100 absolute blur-[90px] animate-float1"
        style={{ opacity: 0.6 }}
      />
      <div
        className="size-24 bg-[#93aeff] rounded-full left-124 top-30 absolute blur-[100px] animate-float2"
        style={{ opacity: 0.5 }}
      />

      {/* Dust Particles */}
      <div
        className="size-0.5 bg-[#93aeff] rounded-full absolute animate-dust2"
        style={{ top: '20%', animationDelay: '-31s' }}
      />
      <div
        className="size-2 blur-[2px] bg-[#93aeff] rounded-full absolute animate-dust3"
        style={{ top: '35%', animationDelay: '-52s' }}
      />
      <div
        className="size-0.5 bg-[#93aeff] rounded-full absolute animate-dust4"
        style={{ top: '15%', animationDelay: '-14s' }}
      />
      <div
        className="size-0.5 bg-[#93aeff] rounded-full absolute animate-dust5"
        style={{ top: '60%', animationDelay: '-38s' }}
      />
      <div
        className="size-2 blur-[2px] bg-[#93aeff] rounded-full absolute animate-dust6"
        style={{ top: '45%', animationDelay: '-27s' }}
      />
      <div
        className="size-2 blur-[2px] bg-[#93aeff] rounded-full absolute animate-dust7"
        style={{ top: '70%', animationDelay: '-41s' }}
      />
      <div
        className="size-0.5 bg-[#93aeff] rounded-full absolute animate-dust8"
        style={{ top: '25%', animationDelay: '-12s' }}
      />
      <div
        className="size-1 blur-[1px] bg-[#93aeff] rounded-full absolute animate-dust9"
        style={{ top: '55%', animationDelay: '-55s' }}
      />
    </div>
  );
};
