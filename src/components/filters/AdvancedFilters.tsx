import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { MonthYearFilter } from './MonthYearFilter';
import { ArchitectureFilter } from './ArchitectureFilter';
import { QuickFilterBar } from './QuickFilterBar';
import type { FilterOptions, TabType, BuildType } from '../../types';

interface AdvancedFiltersProps {
  filters: FilterOptions;
  activeTab: TabType;
  onFiltersChange: (filters: Partial<FilterOptions>) => void;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  activeTab,
  onFiltersChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleQuickFilter = (filter: BuildType | 'latest' | 'reset') => {
    if (filter === 'reset') {
      onFiltersChange({
        selectedMonth: 'Last 30 Days',
        selectedYear: '2025',
        selectedArch: 'amd64',
        excludeInsider: false,
        buildFilter: '',
        buildType: undefined
      });
    } else if (filter === 'latest') {
      // Implement latest-only logic
      onFiltersChange({ buildType: undefined }); // Will be handled in filtering
    } else {
      onFiltersChange({ buildType: filter });
    }
  };

  return (
    <div className="mb-6">
      <QuickFilterBar
        activeFilter={filters.buildType || null}
        onFilterClick={handleQuickFilter}
      />

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="font-medium">Advanced Filters</span>
        {isExpanded ? (
          <ChevronUpIcon className="h-4 w-4" />
        ) : (
          <ChevronDownIcon className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MonthYearFilter
              selectedMonth={filters.selectedMonth || 'Last 30 Days'}
              selectedYear={filters.selectedYear || '2025'}
              onMonthChange={(month) => onFiltersChange({ selectedMonth: month })}
              onYearChange={(year) => onFiltersChange({ selectedYear: year })}
            />

            <ArchitectureFilter
              selectedArch={filters.selectedArch || 'amd64'}
              activeTab={activeTab}
              onChange={(arch) => onFiltersChange({ selectedArch: arch })}
            />

            {activeTab === 'office365' && (
              <div className="filter-group">
                <label htmlFor="channel-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Office Channel:
                </label>
                <select
                  id="channel-select"
                  value={filters.officeChannel || ''}
                  onChange={(e) => onFiltersChange({ officeChannel: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">All Channels</option>
                  <option value="Current">Current Channel</option>
                  <option value="InsiderSlow">Insider Slow</option>
                  <option value="Deferred">Deferred Channel</option>
                  <option value="Perpetual2021">Office 2021</option>
                  <option value="Perpetual2019">Office 2019</option>
                </select>
              </div>
            )}

            <div className="filter-group">
              <label htmlFor="build-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Build Number Filter:
              </label>
              <input
                type="text"
                id="build-filter"
                value={filters.buildFilter || ''}
                onChange={(e) => onFiltersChange({ buildFilter: e.target.value })}
                placeholder="e.g. 26080"
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div className="filter-group flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.excludeInsider || false}
                  onChange={(e) => onFiltersChange({ excludeInsider: e.target.checked })}
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Exclude Insider builds
                </span>
              </label>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                onFiltersChange({
                  selectedMonth: 'Last 30 Days',
                  selectedYear: '2025',
                  selectedArch: 'amd64',
                  excludeInsider: false,
                  buildFilter: '',
                  buildType: undefined
                });
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Reset All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};