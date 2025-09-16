import React, { useEffect, useState } from 'react';
import type { WindowsBuild, EdgeBuild, OfficeBuild, TabType } from '../types';
import { apiService } from '../services/api';

interface BuildModalProps {
  build: WindowsBuild | EdgeBuild | OfficeBuild;
  type: TabType;
  onClose: () => void;
}

const BuildModal: React.FC<BuildModalProps> = ({ build, onClose }) => {
  const [summary, setSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    if ('uuid' in build && !build.summary) {
      loadSummary();
    }
  }, [build]);

  const loadSummary = async () => {
    if (!('uuid' in build)) return;

    setLoadingSummary(true);
    try {
      const fetchedSummary = await apiService.fetchBuildSummary(build.uuid, build.title);
      setSummary(fetchedSummary);
    } catch (error) {
      setSummary('Unable to load summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Build Details
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
          {'title' in build ? (
            // Windows Build Details
            <>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  {build.title}
                </h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Build Number</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{build.build}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Architecture</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{build.arch}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(build.created)}</dd>
                  </div>
                  {build.branch && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Branch</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{build.branch}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Summary</h4>
                {loadingSummary ? (
                  <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-20 rounded"></div>
                ) : (
                  <p className="text-sm text-gray-900 dark:text-white">
                    {build.summary || summary || 'No summary available'}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <a
                  href={`https://uupdump.net/selectlang.php?id=${build.uuid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
              </div>
            </>
          ) : 'Version' in build ? (
            // Edge Build Details
            <>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Microsoft Edge {(build as EdgeBuild).Product}
                </h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Version</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{(build as EdgeBuild).Version}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Platform</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{(build as EdgeBuild).Platform}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Architecture</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{(build as EdgeBuild).Architecture}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Published</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate((build as EdgeBuild).PublishedTime)}</dd>
                  </div>
                </dl>
              </div>

              {(build as EdgeBuild).Artifacts && (build as EdgeBuild).Artifacts!.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Downloads</h4>
                  <div className="space-y-2">
                    {(build as EdgeBuild).Artifacts!.map((artifact, index) => (
                      <a
                        key={index}
                        href={artifact.Location}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {artifact.ArtifactName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatBytes(artifact.SizeInBytes || 0)}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Office Build Details
            <>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  {(build as OfficeBuild).name}
                </h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Version</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{(build as OfficeBuild).version}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Channel</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{(build as OfficeBuild).channel}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Seen</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate((build as OfficeBuild).releaseDate)}</dd>
                  </div>
                </dl>
              </div>

              {(build as OfficeBuild).notes && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Release Notes</h4>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {(build as OfficeBuild).notes}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuildModal;