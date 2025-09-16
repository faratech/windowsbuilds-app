import React from 'react';
import type { WindowsBuild, EdgeBuild, OfficeBuild, TabType } from '../types';

interface BuildItemProps {
  build: WindowsBuild | EdgeBuild | OfficeBuild;
  type: TabType;
  onClick: () => void;
}

const BuildItem: React.FC<BuildItemProps> = ({ build, onClick }) => {
  const getBuildTypeColor = (buildType?: string) => {
    switch (buildType) {
      case 'canary': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'dev': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'beta': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'insider': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'release': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'stable': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if ('title' in build) {
    // Windows Build
    return (
      <div
        className="py-4 px-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
        onClick={onClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {build.title}
              </h3>
              {build.type && (
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getBuildTypeColor(build.type)}`}>
                  {build.type.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>Build: {build.build}</span>
              <span>•</span>
              <span>{build.arch}</span>
              <span>•</span>
              <span>{formatDate(build.created)}</span>
            </div>
            {build.summary && (
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                {build.summary}
              </p>
            )}
          </div>
          <button className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if ('Version' in build) {
    // Edge Build
    const edgeBuild = build as EdgeBuild;
    return (
      <div
        className="py-4 px-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
        onClick={onClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Microsoft Edge {edgeBuild.Product}
              </h3>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getBuildTypeColor(edgeBuild.Product.toLowerCase())}`}>
                {edgeBuild.Product.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>Version: {edgeBuild.Version}</span>
              <span>•</span>
              <span>{edgeBuild.Platform}</span>
              <span>•</span>
              <span>{edgeBuild.Architecture}</span>
              <span>•</span>
              <span>{formatDate(edgeBuild.PublishedTime)}</span>
            </div>
            {edgeBuild.Artifacts && edgeBuild.Artifacts.length > 0 && (
              <div className="mt-2 flex gap-2">
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  {edgeBuild.Artifacts.length} download{edgeBuild.Artifacts.length !== 1 ? 's' : ''} available
                </span>
              </div>
            )}
          </div>
          <button className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Office Build
  const officeBuild = build as OfficeBuild;
  return (
    <div
      className="py-4 px-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {officeBuild.name}
            </h3>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getBuildTypeColor(officeBuild.channel.toLowerCase())}`}>
              {officeBuild.channel}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Version: {officeBuild.version}</span>
            <span>•</span>
            <span>{formatDate(officeBuild.releaseDate)}</span>
          </div>
          {officeBuild.notes && (
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
              {officeBuild.notes}
            </p>
          )}
        </div>
        <button className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default BuildItem;