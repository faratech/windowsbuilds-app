import React from 'react';
import type { WindowsBuild, EdgeBuild, OfficeBuild, TabType } from '../types';
import BuildItem from './BuildItem';

interface BuildsListProps {
  builds: WindowsBuild[] | EdgeBuild[] | OfficeBuild[];
  loading: boolean;
  activeTab: TabType;
  searchQuery: string;
  onBuildClick: (build: any) => void;
}

const BuildsList: React.FC<BuildsListProps> = ({
  builds,
  loading,
  activeTab,
  searchQuery,
  onBuildClick,
}) => {
  const filteredBuilds = builds.filter((build: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    if ('title' in build) {
      return build.title.toLowerCase().includes(query) ||
             build.build?.toLowerCase().includes(query);
    }
    if ('Version' in build) {
      return build.Version.toLowerCase().includes(query) ||
             build.Product.toLowerCase().includes(query);
    }
    if ('name' in build) {
      return build.name.toLowerCase().includes(query) ||
             build.version.toLowerCase().includes(query);
    }
    return false;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (filteredBuilds.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {searchQuery ? 'No builds found matching your search.' : 'No builds available.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredBuilds.length}</span> builds
        </span>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {filteredBuilds.map((build: any, index) => (
          <BuildItem
            key={build.uuid || build.id || index}
            build={build}
            type={activeTab}
            onClick={() => onBuildClick(build)}
          />
        ))}
      </div>
    </div>
  );
};

export default BuildsList;