import React from 'react';

interface DefaultPlayerSVGProps {
  className?: string;
  size?: number;
}

const DefaultPlayerSVG: React.FC<DefaultPlayerSVGProps> = ({ 
  className = "w-16 h-16", 
  size = 64 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <circle cx="32" cy="32" r="32" fill="#f3f4f6" />
      
      {/* Player silhouette */}
      <g transform="translate(16, 12)">
        {/* Head */}
        <circle cx="16" cy="12" r="8" fill="#6b7280" />
        
        {/* Body */}
        <path
          d="M8 24 C8 20, 12 20, 16 20 C20 20, 24 20, 24 24 L24 36 C24 38, 22 40, 20 40 L12 40 C10 40, 8 38, 8 36 Z"
          fill="#6b7280"
        />
        
        {/* Arms */}
        <ellipse cx="6" cy="28" rx="3" ry="8" fill="#6b7280" />
        <ellipse cx="26" cy="28" rx="3" ry="8" fill="#6b7280" />
        
        {/* Legs */}
        <ellipse cx="12" cy="44" rx="3" ry="8" fill="#6b7280" />
        <ellipse cx="20" cy="44" rx="3" ry="8" fill="#6b7280" />
      </g>
      
      {/* Football icon overlay */}
      <g transform="translate(44, 44)">
        <circle cx="8" cy="8" r="8" fill="#8b5cf6" />
        <path
          d="M4 8 L12 8 M8 4 L8 12 M6 6 L10 10 M10 6 L6 10"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export default DefaultPlayerSVG;
