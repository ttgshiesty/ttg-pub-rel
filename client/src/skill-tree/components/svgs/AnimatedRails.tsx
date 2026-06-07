import React from 'react';

export const AnimatedRails: React.FC = () => {
  return (
    <svg 
      style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
      className="connections"
    >
      <g transform="translate(605, 565)" fill="none">
        <path 
          d="M2.25391 39.7257C49.2024 93.1748 51.3693 93.1748 49.2024 218.852V2243.5" 
          stroke="#12FF70" 
          strokeWidth="8"
          className="skill-tree-rail-combat"
        />
        <path 
          d="M73.4761 0.00401163L70.4761 2243.5" 
          stroke="#F7CF09" 
          strokeWidth="8"
          className="skill-tree-rail-looting"
        />
        <path 
          d="M173.436 52.7269C93.262 94.6194 93.9842 115.566 96.1511 219.575V2243.5" 
          stroke="#F3040E" 
          strokeWidth="8"
          className="skill-tree-rail-survival"
        />
      </g>
    </svg>
  );
};
