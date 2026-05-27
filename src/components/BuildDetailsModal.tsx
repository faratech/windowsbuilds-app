import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge, BuildTypeBadge, ChannelBadge } from './ui/Badge';
import { Card } from './ui/Card';
import { Skeleton } from './ui/Skeleton';
import { apiService } from '../services/api';
import type { EdgeArtifact, EdgeBuild, OfficeBuild, WindowsBuild } from '../types';

type BuildDetails = WindowsBuild | EdgeBuild | OfficeBuild;

interface BuildDetailsModalProps {
  build: BuildDetails;
  type: 'windows' | 'edge' | 'office';
  isOpen: boolean;
  onClose: () => void;
}

const isWindowsBuild = (build: BuildDetails): build is WindowsBuild => 'uuid' in build;
const isEdgeBuild = (build: BuildDetails): build is EdgeBuild => 'Version' in build;
const isOfficeBuild = (build: BuildDetails): build is OfficeBuild => 'channel' in build && !('uuid' in build) && !('Version' in build);

export const BuildDetailsModal: React.FC<BuildDetailsModalProps> = ({
  build,
  type,
  isOpen,
  onClose,
}) => {
  const [summary, setSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!isOpen) {
      return;
    }

    if (isWindowsBuild(build) && build.summary) {
      setSummary(build.summary);
      return;
    }

    let uuid = '';
    let title = '';
    const buildType = type;

    if (isWindowsBuild(build)) {
      uuid = build.uuid;
      title = build.title || 'Windows Build';
    } else if (isEdgeBuild(build)) {
      uuid = build.ReleaseId ? String(build.ReleaseId) : `${build.Product}_${build.Platform}_${build.Architecture}_${build.Version}`;
      title = `Microsoft Edge ${build.Product || ''} ${build.Version || ''}`.trim();
    } else if (isOfficeBuild(build)) {
      uuid = `${build.channel.replace(/\s+/g, '_')}_${build.build || ''}`;
      title = build.title || build.name || 'Office 365 Build';
    }

    if (!uuid) {
      setSummary('');
      return;
    }

    setSummary('');
    setLoadingSummary(true);
    apiService.fetchBuildSummary(uuid, title, buildType)
      .then((fetchedSummary) => {
        if (!cancelled) setSummary(fetchedSummary);
      })
      .catch((error: unknown) => {
        console.error('Failed to fetch summary:', error);
        if (!cancelled) setSummary('Summary unavailable');
      })
      .finally(() => {
        if (!cancelled) setLoadingSummary(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, build, type]);

  const getBuildTitle = () => {
    if (isEdgeBuild(build)) {
      return `Microsoft Edge ${build.Product || ''}`;
    }
    if (isOfficeBuild(build)) {
      return build.title || build.name || 'Office 365 Build';
    }
    return build.title || 'Build Details';
  };

  const getBuildNumber = () => {
    if (isWindowsBuild(build)) {
      return build.build_number || build.build || 'N/A';
    }
    if (isEdgeBuild(build)) {
      return build.Version || 'N/A';
    }
    return build.build || build.version || 'N/A';
  };

  const getPlatformOrArchitecture = () => {
    if (isWindowsBuild(build)) return build.arch;
    if (isEdgeBuild(build)) return `${build.Platform} ${build.Architecture}`.trim();
    return null;
  };

  const getBuildDate = () => {
    if (isWindowsBuild(build)) return build.created || build.created_timestamp;
    if (isEdgeBuild(build)) return build.PublishedTime;
    return build.releaseDate;
  };

  const getBuildId = () => {
    if (isWindowsBuild(build)) return build.uuid;
    if (isEdgeBuild(build)) return build.ReleaseId;
    return null;
  };

  const formatDate = (date?: string | number) => {
    if (!date) return 'Unknown';
    const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDownloadUrl = () => {
    if (isWindowsBuild(build)) {
      return `https://uupdump.net/selectlang.php?id=${build.uuid}`;
    }
    if (isEdgeBuild(build) && build.Artifacts && build.Artifacts.length > 0) {
      return build.Artifacts[0].Location;
    }
    if (isOfficeBuild(build)) {
      return 'https://www.microsoft.com/en-us/download/office.aspx';
    }
    return null;
  };

  const handleDownload = () => {
    const url = getDownloadUrl();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getBuildTitle()}
      size="lg"
    >
      <div className="space-y-6">
        {/* Build Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Build Information
          </h3>
          <Card variant="outline" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Version/Build Number */}
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {type === 'windows' ? 'Build Number' : 'Version'}
                </p>
                <p className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                  {getBuildNumber()}
                </p>
              </div>

              {/* Architecture/Platform */}
              {getPlatformOrArchitecture() && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isEdgeBuild(build) ? 'Platform' : 'Architecture'}
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {getPlatformOrArchitecture()}
                  </p>
                </div>
              )}

              {/* Last Seen */}
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Seen</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {formatDate(getBuildDate())}
                </p>
              </div>

              {/* UUID/Release ID */}
              {getBuildId() && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isWindowsBuild(build) ? 'UUID' : 'Release ID'}
                  </p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white truncate">
                    {getBuildId()}
                  </p>
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-4">
              {isWindowsBuild(build) && build.build_type && (
                <BuildTypeBadge type={build.build_type} />
              )}
              {isEdgeBuild(build) && build.Product && (
                <ChannelBadge channel={build.Product} />
              )}
              {isOfficeBuild(build) && build.channel && (
                <Badge variant="primary">{build.channel}</Badge>
              )}
              {isOfficeBuild(build) && build.latest && (
                <Badge variant="success">Latest</Badge>
              )}
            </div>
          </Card>
        </div>

        {/* Summary */}
        {(summary || loadingSummary) && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Summary
            </h3>
            <Card variant="outline" className="p-4">
              {loadingSummary ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  {summary || (isWindowsBuild(build) ? build.summary : '') || 'No summary available for this build.'}
                </p>
              )}
            </Card>
          </div>
        )}

        {/* Edge Artifacts or No Downloads Available Message */}
        {isEdgeBuild(build) && (
          build.Artifacts && build.Artifacts.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Download Options
            </h3>
            <Card variant="outline" className="p-4">
              <div className="space-y-3">
                {build.Artifacts.map((artifact: EdgeArtifact, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-5 h-5 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {artifact.ArtifactName.toUpperCase()}
                        </p>
                        {artifact.SizeInBytes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {(artifact.SizeInBytes / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => window.open(artifact.Location, '_blank')}
                    >
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Download Options
              </h3>
              <Card variant="outline" className="p-4">
                <div className="text-center py-4">
                  <svg
                    className="w-12 h-12 mx-auto text-gray-400 mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 11v4m0 0l-2-2m2 2l2-2"
                    />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400">
                    No download links available for this build yet.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Downloads are typically available for recent builds.
                  </p>
                </div>
              </Card>
            </div>
          )
        )}

        {/* CVEs for Edge */}
        {isEdgeBuild(build) && build.CVEs && build.CVEs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Security Updates (CVEs)
            </h3>
            <Card variant="outline" className="p-4">
              <div className="flex flex-wrap gap-2">
                {build.CVEs.map((cve: string, index: number) => (
                  <Badge key={index} variant="warning" size="sm">
                    {cve}
                  </Badge>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {getDownloadUrl() && (
            <Button variant="primary" onClick={handleDownload}>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                />
              </svg>
              {type === 'windows' ? 'Download from UUP Dump' : 'Download'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
