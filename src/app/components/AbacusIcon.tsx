/* AbacusIcon.tsx */
'use client';

import React from 'react';

interface AbacusIconProps extends React.SVGProps<SVGSVGElement> {}

const AbacusIcon: React.FC<AbacusIconProps> = (props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Outer frame of the abacus */}
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      {/* Horizontal rods */}
      <line x1="3" y1="8" x2="21" y2="8" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="16" x2="21" y2="16" />
      {/* Beads on first rod */}
      <circle cx="7.5" cy="8" r="1" />
      <circle cx="12" cy="8" r="1" />
      <circle cx="16.5" cy="8" r="1" />
      {/* Beads on second rod */}
      <circle cx="7.5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="16.5" cy="12" r="1" />
      {/* Beads on third rod */}
      <circle cx="7.5" cy="16" r="1" />
      <circle cx="12" cy="16" r="1" />
      <circle cx="16.5" cy="16" r="1" />
    </svg>
  );
};

export default AbacusIcon; 