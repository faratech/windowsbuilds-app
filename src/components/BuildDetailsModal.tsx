import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge, BuildTypeBadge, ChannelBadge } from './ui/Badge';
import { Card } from './ui/Card';
import { Skeleton } from './ui/Skeleton';
import axios from 'axios';

interface BuildDetailsModalProps {
  build: any;
  type: 'windows' | 'edge' | 'office';
  isOpen: boolean;
  onClose: () => void;
}

export const BuildDetailsModal: React.FC<BuildDetailsModalProps> = ({
  build,
  type,
  isOpen,
  onClose,
}) => {
  const [summary, setSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    if (isOpen && type === 'windows' && build.uuid && !build.summary) {
      fetchSummary();
    } else if (build.summary) {
      setSummary(build.summary);
    }
  }, [isOpen, build]);

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const response = await axios.post('/api/builds/summary', null, {
        params: {
          uuid: build.uuid,
          title: build.title,
          build_type: 'windows',
        },
      });
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      setSummary('Summary unavailable');
    } finally {
      setLoadingSummary(false);
    }
  };

  const getTitle = () => {
    if (type === 'edge') {
      return `Microsoft Edge ${build.Product || ''}`;
    }
    if (type === 'office') {
      return build.title || build.name || 'Office 365 Build';
    }
    return build.title || build.Product || 'Build Details';
  };

  const formatDate = (date: string | number) => {
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
    if (type === 'windows' && build.uuid) {
      return `https://uupdump.net/selectlang.php?id=${build.uuid}`;
    }
    if (type === 'edge' && build.Artifacts && build.Artifacts.length > 0) {
      return build.Artifacts[0].Location;
    }
    if (type === 'office') {
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
      title={getTitle()}
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
                  {build.build_number || build.Version || build.version || 'N/A'}
                </p>
              </div>

              {/* Architecture/Platform */}
              {(build.arch || build.Architecture || build.Platform) && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {build.Platform ? 'Platform' : 'Architecture'}
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {build.Platform && `${build.Platform} `}
                    {build.arch || build.Architecture || ''}
                  </p>
                </div>
              )}

              {/* Last Seen */}
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Seen</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {formatDate(
                    build.created ||
                    build.created_timestamp ||
                    build.PublishedTime ||
                    build.releaseDate
                  )}
                </p>
              </div>

              {/* UUID/Release ID */}
              {(build.uuid || build.ReleaseId) && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {build.uuid ? 'UUID' : 'Release ID'}
                  </p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white truncate">
                    {build.uuid || build.ReleaseId}
                  </p>
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-4">
              {type === 'windows' && build.build_type && (
                <BuildTypeBadge type={build.build_type} />
              )}
              {type === 'edge' && build.Product && (
                <ChannelBadge channel={build.Product} />
              )}
              {type === 'office' && build.channel && (
                <Badge variant="primary">{build.channel}</Badge>
              )}
              {build.latest && (
                <Badge variant="success">Latest</Badge>
              )}
            </div>
          </Card>
        </div>

        {/* Summary */}
        {(type === 'windows' || summary) && (
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
                  {summary || build.summary || 'No summary available for this build.'}
                </p>
              )}
            </Card>
          </div>
        )}

        {/* Edge Artifacts or No Downloads Available Message */}
        {type === 'edge' && (
          build.Artifacts && build.Artifacts.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Download Options
            </h3>
            <Card variant="outline" className="p-4">
              <div className="space-y-3">
                {build.Artifacts.map((artifact: any, index: number) => (
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
        {type === 'edge' && build.CVEs && build.CVEs.length > 0 && (
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