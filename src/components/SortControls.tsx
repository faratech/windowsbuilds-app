import React from 'react';
import type { TabType } from '../types';

interface SortControlsProps {
  sortBy: string;
  buildCount: number;
  activeTab: TabType;
  onSortChange: (sortBy: string) => void;
}

export const SortControls: React.FC<SortControlsProps> = ({
  sortBy,
  buildCount,
  activeTab,
  onSortChange
}) => {
  const isEdge = activeTab === 'edge';

  return (
    <div className="flex justify-between items-center mb-4">
      <div className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-bold">{buildCount}</span> builds found
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="sort-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Sort by:
        </label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {isEdge ? (
            <>
              <option value="date-desc">Date (Newest First)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="version-desc">Version (Highest First)</option>
              <option value="version-asc">Version (Lowest First)</option>
            </>
          ) : (
            <>
              <option value="date-desc">Date (Newest First)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="build-desc">Build # (Highest First)</option>
              <option value="build-asc">Build # (Lowest First)</option>
            </>
          )}
        </select>
      </div>
    </div>
  );
};