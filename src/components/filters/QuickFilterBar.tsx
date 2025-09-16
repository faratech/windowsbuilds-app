import React from 'react';
import type { BuildType } from '../../types';

interface QuickFilterBarProps {
  activeFilter: BuildType | 'latest' | 'reset' | null;
  onFilterClick: (filter: BuildType | 'latest' | 'reset') => void;
}

export const QuickFilterBar: React.FC<QuickFilterBarProps> = ({
  activeFilter,
  onFilterClick
}) => {
  const filters: Array<{ value: BuildType | 'latest' | 'reset'; label: string; color: string }> = [
    { value: 'release', label: 'Release Builds', color: 'bg-green-500' },
    { value: 'insider', label: 'Insider Builds', color: 'bg-purple-500' },
    { value: 'beta', label: 'Beta Channel', color: 'bg-blue-500' },
    { value: 'dev', label: 'Dev Channel', color: 'bg-orange-500' },
    { value: 'canary', label: 'Canary Channel', color: 'bg-red-500' },
    { value: 'latest', label: 'Latest Only', color: 'bg-gray-500' },
    { value: 'reset', label: 'Reset Filters', color: 'bg-gray-400' }
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filters.map(filter => (
        <button
          key={filter.value}
          onClick={() => onFilterClick(filter.value)}
          className={`px-3 py-1 rounded-md text-white text-sm font-medium transition-all ${
            activeFilter === filter.value
              ? `${filter.color} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900`
              : `${filter.color} opacity-70 hover:opacity-100`
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};