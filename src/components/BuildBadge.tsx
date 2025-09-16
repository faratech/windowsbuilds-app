import React from 'react';
import type { BuildType } from '../types';

interface BuildBadgeProps {
  type?: BuildType | string;
}

export const BuildBadge: React.FC<BuildBadgeProps> = ({ type }) => {
  if (!type) return null;

  const badgeStyles: Record<string, string> = {
    stable: 'bg-green-500 text-white',
    release: 'bg-green-500 text-white',
    insider: 'bg-purple-500 text-white',
    beta: 'bg-blue-500 text-white',
    dev: 'bg-orange-500 text-white',
    canary: 'bg-red-500 text-white',
    Stable: 'bg-green-500 text-white',
    Beta: 'bg-blue-500 text-white',
    Dev: 'bg-orange-500 text-white',
    Canary: 'bg-red-500 text-white'
  };

  const style = badgeStyles[type] || 'bg-gray-500 text-white';
  const label = type.toUpperCase();

  return (
    <span className={`inline-block px-2 py-1 text-xs font-bold rounded ${style} ml-2`}>
      {label}
    </span>
  );
};