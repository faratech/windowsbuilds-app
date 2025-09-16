import React, { useMemo } from 'react';
import { BuildBadge } from '../BuildBadge';
import { SortControls } from '../SortControls';
import { EdgeDownloadMenu } from '../EdgeDownloadMenu';
import type { EdgeBuild, FilterOptions } from '../../types';

interface EdgeBuildsTableProps {
  builds: EdgeBuild[];
  filters: FilterOptions;
}

export const EdgeBuildsTable: React.FC<EdgeBuildsTableProps> = ({
  builds,
  filters
}) => {
  // Apply filters and sorting
  const filteredBuilds = useMemo(() => {
    let filtered = [...builds];

    // Filter by architecture
    if (filters.selectedArch && filters.selectedArch !== 'amd64') {
      const archMap: Record<string, string[]> = {
        'x64': ['x64', 'x86_64', 'Windows'],
        'x86': ['x86', 'Windows'],
        'arm64': ['arm64', 'Windows'],
        'macos': ['macOS', 'Darwin'],
        'linux': ['Linux'],
        'android': ['Android'],
        'ios': ['iOS']
      };
      const targetArchs = archMap[filters.selectedArch] || [filters.selectedArch];
      filtered = filtered.filter(build =>
        targetArchs.some(arch =>
          build.Platform?.toLowerCase().includes(arch.toLowerCase()) ||
          build.Architecture?.toLowerCase().includes(arch.toLowerCase())
        )
      );
    }

    // Filter by exclude insider (Dev and Canary channels)
    if (filters.excludeInsider) {
      filtered = filtered.filter(build =>
        build.Product !== 'Dev' && build.Product !== 'Canary'
      );
    }

    // Filter by build/version number
    if (filters.buildFilter) {
      const filterLower = filters.buildFilter.toLowerCase();
      filtered = filtered.filter(build =>
        build.Version?.toLowerCase().includes(filterLower)
      );
    }

    // Sort
    const sortBy = filters.sortBy || 'version-desc';
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.PublishedTime).getTime() - new Date(a.PublishedTime).getTime();
        case 'date-asc':
          return new Date(a.PublishedTime).getTime() - new Date(b.PublishedTime).getTime();
        case 'version-desc':
          return b.Version.localeCompare(a.Version, undefined, { numeric: true });
        case 'version-asc':
          return a.Version.localeCompare(b.Version, undefined, { numeric: true });
        default:
          return 0;
      }
    });

    return filtered;
  }, [builds, filters]);

  return (
    <div>
      <SortControls
        sortBy={filters.sortBy || 'version-desc'}
        buildCount={filteredBuilds.length}
        activeTab="edge"
        onSortChange={() => {/* TODO: Implement sort change */}}
      />

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Channel / Platform
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Version
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Architecture
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Published
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredBuilds.map((build, index) => (
              <tr key={`${build.Version}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {build.Platform}
                  </span>
                  <BuildBadge type={build.Product} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {build.Version}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {build.Architecture}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(build.PublishedTime).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <EdgeDownloadMenu artifacts={build.Artifacts || []} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};