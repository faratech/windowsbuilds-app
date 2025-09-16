import React, { useState, useMemo } from 'react';
import { BuildBadge } from '../BuildBadge';
import { SortControls } from '../SortControls';
import { BuildSummaryModal } from '../BuildSummaryModal';
import type { WindowsBuild, FilterOptions } from '../../types';

interface WindowsBuildsTableProps {
  builds: WindowsBuild[];
  filters: FilterOptions;
  activeTab: 'windows11' | 'windows10' | 'windowsServer';
}

export const WindowsBuildsTable: React.FC<WindowsBuildsTableProps> = ({
  builds,
  filters,
  activeTab
}) => {
  const [selectedBuild, setSelectedBuild] = useState<WindowsBuild | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Apply filters
  const filteredBuilds = useMemo(() => {
    let filtered = [...builds];

    // Filter by build type
    if (filters.buildType) {
      filtered = filtered.filter(build => build.build_type === filters.buildType);
    }

    // Filter by exclude insider
    if (filters.excludeInsider) {
      filtered = filtered.filter(build =>
        build.build_type !== 'insider' &&
        !build.title.toLowerCase().includes('insider')
      );
    }

    // Filter by build number
    if (filters.buildFilter) {
      const filterLower = filters.buildFilter.toLowerCase();
      filtered = filtered.filter(build =>
        build.build_number?.includes(filterLower) ||
        build.build?.includes(filterLower) ||
        build.title.toLowerCase().includes(filterLower)
      );
    }

    // Filter by month/year
    if (filters.selectedMonth && filters.selectedMonth !== 'Last 30 Days') {
      filtered = filtered.filter(build => build.month === filters.selectedMonth);
    }
    if (filters.selectedYear) {
      filtered = filtered.filter(build => build.year?.toString() === filters.selectedYear);
    }

    // Sort
    const sortBy = filters.sortBy || 'build-desc';
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return (b.created_timestamp || 0) - (a.created_timestamp || 0);
        case 'date-asc':
          return (a.created_timestamp || 0) - (b.created_timestamp || 0);
        case 'build-desc':
          return (b.build_number || b.build || '').localeCompare(a.build_number || a.build || '');
        case 'build-asc':
          return (a.build_number || a.build || '').localeCompare(b.build_number || b.build || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [builds, filters]);

  const handleBuildClick = (build: WindowsBuild) => {
    setSelectedBuild(build);
    setShowSummaryModal(true);
  };

  const getBuildType = (title: string): string => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('canary') || lowerTitle.includes('rs_') || lowerTitle.includes('ge_pre')) {
      return 'canary';
    }
    if (lowerTitle.includes('dev') || lowerTitle.includes('ge_release') || lowerTitle.includes('co_release')) {
      return 'dev';
    }
    if (lowerTitle.includes('beta') || lowerTitle.includes('vb_release')) {
      return 'beta';
    }
    if (lowerTitle.includes('insider') || lowerTitle.includes('zn_release') || lowerTitle.includes('fe_release')) {
      return 'insider';
    }
    return 'release';
  };

  return (
    <div>
      <SortControls
        sortBy={filters.sortBy || 'build-desc'}
        buildCount={filteredBuilds.length}
        activeTab={activeTab}
        onSortChange={() => {/* TODO: Implement sort change */}}
      />

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Build Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Build #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Seen
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredBuilds.map((build) => (
              <tr key={build.uuid} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleBuildClick(build)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                  >
                    {build.title}
                  </button>
                  <BuildBadge type={build.build_type || getBuildType(build.title)} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {build.build_number || build.build || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {build.created}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleBuildClick(build)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    View Summary
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedBuild && (
        <BuildSummaryModal
          isOpen={showSummaryModal}
          onClose={() => setShowSummaryModal(false)}
          buildUuid={selectedBuild.uuid}
          buildTitle={selectedBuild.title}
          buildType="windows"
        />
      )}
    </div>
  );
};