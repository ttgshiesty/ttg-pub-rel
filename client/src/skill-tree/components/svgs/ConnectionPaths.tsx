import React from 'react';

interface ConnectionPathsProps {
  isActive?: boolean;
}

export const ConnectionPaths: React.FC<ConnectionPathsProps> = ({ isActive = false }) => {
  const strokeColor = isActive ? '#12ff70' : '#606576';
  const strokeClass = isActive ? 'stroke-path-active' : 'stroke-path-disabled';
  
  return (
    <svg 
      style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }} 
      className="connections"
    >
      <g transform="translate(444.54, 550.9)">
        <path 
          d="M141.632 34.3231C23.8993 -42.2394 54.2352 43.7125 0.786133 9.04307" 
          stroke={strokeColor} 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round" 
          className={`connection-line-main ${strokeClass}`}
        />
      </g>
      <g transform="translate(391.81, 528.88)">
        <path 
          d="M53.4473 31.5881L0.720459 1.25212" 
          stroke={strokeColor} 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round" 
          className={`connection-line-main ${strokeClass}`}
        />
      </g>
      <g transform="translate(317, 486.5)">
        <path 
          d="M76.9944 44.3693L0.494385 0.869293" 
          stroke={strokeColor} 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round" 
          className={`connection-line-main ${strokeClass}`}
        />
      </g>
      <g transform="translate(202.5, 420)">
        <path 
          d="M114.003 66.8645L0.502686 0.864471" 
          stroke={strokeColor} 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round" 
          className={`connection-line-main ${strokeClass}`}
        />
      </g>
      <g transform="translate(152.5, 390)">
        <path 
          d="M50.7585 30.928L0.258545 0.427994" 
          stroke={strokeColor} 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round" 
          className={`connection-line-main ${strokeClass}`}
        />
      </g>
      <g transform="translate(39, 325.5)">
        <path 
          d="M112.995 64.8692L0.494507 0.869186" 
          stroke={strokeColor} 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round" 
          className={`connection-line-main ${strokeClass}`}
        />
      </g>
      <g transform="translate(240.5, 353)">
        <path 
          d="M75.3638 134.432C-4.13623 102.432 73.3638 29.4315 0.36377 0.931519" 
          stroke={strokeColor} 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round" 
          className={`connection-line-main ${strokeClass}`}
        />
      </g>
      <g transform="translate(454.5, 482)">
        <path 
          d="M131 98C48.5 50 1 36.5 1 0" 
          stroke={strokeColor} 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round" 
          className={`connection-line-main ${strokeClass}`}
        />
      </g>
      <g transform="translate(458, 420)">
        <path 
          d="M1 58V0" 
          stroke={strokeColor} 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round" 
          className={`connection-line-main ${strokeClass}`}
        />
      </g>
      <g transform="translate(452, 335)">
        <path 
          d="M7 85V0" 
          stroke={strokeColor} 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round" 
          className={`connection-line-main ${strokeClass}`}
        />
      </g>
      <g transform="translate(381, 295)">
        <path 
          d="M72 40L1 1" 
          stroke={strokeColor} 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round" 
          className={`connection-line-main ${strokeClass}`}
        />
      </g>
      <g transform="translate(348, 226)">
        <path 
          d="M34 70L1 1" 
          stroke={strokeColor} 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round" 
          className={`connection-line-main ${strokeClass}`}
        />
      </g>
      <g transform="translate(240, 175)">
        <path 
          d="M109 52L1 1" 
          stroke={strokeColor} 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round" 
          className={`connection-line-main ${strokeClass}`}
        />
      </g>
      <g transform="translate(185, 145)">
        <path 
          d="M56 31L1 1" 
          stroke={strokeColor} 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round" 
          className={`connection-line-main ${strokeClass}`}
        />
      </g>
      <g transform="translate(90, 98)">
        <path 
          d="M96 48L1 1" 
          stroke={strokeColor} 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round" 
          className={`connection-line-main ${strokeClass}`}
        />
      </g>
      <g transform="translate(90, 98)">
        <path 
          d="M1 194V0" 
          stroke={strokeColor} 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round" 
          className={`connection-line-main ${strokeClass}`}
        />
      </g>
    </svg>
  );
};
