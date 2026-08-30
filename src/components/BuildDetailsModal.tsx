import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge, BuildTypeBadge, ChannelBadge } from './ui/Badge';
import { Card } from './ui/Card';
import { Skeleton } from './ui/Skeleton';
import { apiService } from '../services/api';
import { kindMeta, statusMeta } from '../config/releaseChannels';
import { isWindowsBuild, isEdgeBuild, isOfficeBuild, type BuildRecord } from '../utils/typeGuards';
import { buildDateValue, buildProduct } from '../utils/buildRecord';
import { formatBuildDate, LONG_DATE } from '../utils/dates';
import { downloadTarget, openExternal, OFFICE_DOWNLOAD_CENTER } from '../utils/downloads';
import type { EdgeArtifact } from '../types';
import { buildPermalink } from '../utils/permalink';

interface BuildDetailsModalProps {
  build: BuildRecord;
  isOpen: boolean;
  onClose: () => void;
}

/** Stable identity used as the summary cache key on the backend. */
function summaryIdentity(build: BuildRecord): { uuid: string; title: string } | null {
  if (isWindowsBuild(build)) {
    return { uuid: build.uuid, title: build.title || 'Windows Build' };
  }
  if (isEdgeBuild(build)) {
    const uuid = build.ReleaseId
      ? String(build.ReleaseId)
      : `${build.Product}_${build.Platform}_${build.Architecture}_${build.Version}`;
    return { uuid, title: `Microsoft Edge ${build.Product || ''} ${build.Version || ''}`.trim() };
  }
  if (isOfficeBuild(build)) {
    const uuid = `${build.channel.replace(/\s+/g, '_')}_${build.build || ''}`;
    return { uuid, title: build.title || build.name || 'Office 365 Build' };
  }
  return null;
}

export const BuildDetailsModal: React.FC<BuildDetailsModalProps> = ({ build, isOpen, onClose }) => {
  const [retryNonce, setRetryNonce] = useState(0);

  const product = buildProduct(build);
  const download = downloadTarget(build);
  const permalink = buildPermalink(build);
  const isOffice = isOfficeBuild(build);

  // Windows rows sometimes ship a summary inline; it wins without a fetch.
  const inlineSummary = isWindowsBuild(build) && build.summary ? build.summary : '';

  // The summary lives in react-query rather than a hand-rolled effect: the
  // cache dedupes reopenings of the same build (the backend caches for 90
  // days anyway), abort signals and retry bookkeeping come for free, and no
  // state has to be reset imperatively when `build` changes.
  const identity = summaryIdentity(build);
  const summaryQuery = useQuery({
    queryKey: ['build-summary', identity?.uuid ?? '', identity?.title ?? '', product, retryNonce],
    queryFn: ({ signal }) =>
      apiService.fetchBuildSummary(identity!.uuid, identity!.title, product, signal),
    enabled: isOpen && !inlineSummary && !!identity?.uuid,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });

  const summary = inlineSummary || summaryQuery.data || '';
  // With the query disabled these would otherwise read as pending/true.
  const loadingSummary =
    !inlineSummary && isOpen && !!identity?.uuid && summaryQuery.isPending;
  const summaryError = !inlineSummary && summaryQuery.isError;

  const getBuildTitle = () => {
    if (isEdgeBuild(build)) return `Microsoft Edge ${build.Product || ''}`.trim();
    if (isOfficeBuild(build)) return build.title || build.name || 'Office 365 Build';
    return build.title || 'Build Details';
  };

  const getBuildNumber = () => {
    if (isWindowsBuild(build)) return build.build_number || build.build || 'N/A';
    if (isEdgeBuild(build)) return build.Version || 'N/A';
    return build.build || build.version || 'N/A';
  };

  const getPlatformOrArchitecture = () => {
    if (isWindowsBuild(build)) return build.arch;
    if (isEdgeBuild(build)) return `${build.Platform} ${build.Architecture}`.trim();
    return null;
  };

  const getBuildId = () => {
    if (isWindowsBuild(build)) return build.uuid;
    if (isEdgeBuild(build)) return build.ReleaseId;
    return null;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getBuildTitle()} size="lg">
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Build Information
          </h3>
          <Card variant="outline" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {product === 'windows' ? 'Build Number' : 'Version'}
                </p>
                <p className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                  {getBuildNumber()}
                </p>
              </div>

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

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Seen</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {formatBuildDate(buildDateValue(build), LONG_DATE)}
                </p>
              </div>

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

            <div className="flex flex-wrap gap-2 mt-4">
              {isWindowsBuild(build) && build.build_type && <BuildTypeBadge type={build.build_type} />}
              {isWindowsBuild(build) && build.branch && <Badge variant="secondary">{build.branch}</Badge>}
              {isWindowsBuild(build) && build.kind && kindMeta(build.kind) && (
                <Badge variant="default" className={kindMeta(build.kind)!.badgeClass}>
                  {kindMeta(build.kind)!.label}
                </Badge>
              )}
              {isWindowsBuild(build) && build.status && statusMeta(build.status) && (
                <Badge variant="default" className={statusMeta(build.status)!.badgeClass} aria-label={statusMeta(build.status)!.aria}>
                  {statusMeta(build.status)!.label}
                </Badge>
              )}
              {isEdgeBuild(build) && build.Product && <ChannelBadge channel={build.Product} />}
              {isOfficeBuild(build) && build.channel && <Badge variant="primary">{build.channel}</Badge>}
              {isOfficeBuild(build) && build.latest && <Badge variant="success">Latest</Badge>}
            </div>
          </Card>
        </div>

        {(summary || loadingSummary || summaryError) && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Summary
            </h3>
            <Card variant="outline" className="p-4">
              {loadingSummary ? (
                <div className="space-y-2" aria-busy="true" aria-label="Loading summary">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : summaryError ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-gray-600 dark:text-gray-400" role="alert">
                    Couldn’t load the summary.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setRetryNonce((n) => n + 1)}>
                    Retry
                  </Button>
                </div>
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  {summary || (isWindowsBuild(build) ? build.summary : '') || 'No summary available for this build.'}
                </p>
              )}
            </Card>
          </div>
        )}

        {isEdgeBuild(build) && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Download Options
            </h3>
            <Card variant="outline" className="p-4">
              {build.Artifacts && build.Artifacts.length > 0 ? (
                <div className="space-y-3">
                  {build.Artifacts.map((artifact: EdgeArtifact) => (
                    <div
                      key={artifact.Location}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <svg className="w-5 h-5 flex-shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {artifact.ArtifactName.toUpperCase()}
                          </p>
                          {artifact.SizeInBytes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {(artifact.SizeInBytes / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Previously `window.open(location, '_blank')` with no
                          `noopener` — the opened page kept a live `window.opener`. */}
                      <Button
                        variant="primary"
                        size="sm"
                        aria-label={`Download ${artifact.ArtifactName.toUpperCase()} for Edge ${build.Version}`}
                        onClick={() => openExternal(artifact.Location)}
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 11v4m0 0l-2-2m2 2l2-2" />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400">
                    No download links available for this build yet.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Downloads are typically available for recent builds.
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Office has no per-build media. Say so, and point at the one page that
            does exist, rather than dressing the Download Center up as a
            build-specific artifact. */}
        {isOffice && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Downloads
            </h3>
            <Card variant="outline" className="p-4">
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                Microsoft does not publish per-build installers for Microsoft 365. Servicing builds
                arrive through the update channel configured on the device.
              </p>
              <a
                href={OFFICE_DOWNLOAD_CENTER}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Open the Microsoft 365 Download Center
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </Card>
          </div>
        )}

        {isEdgeBuild(build) && build.CVEs && build.CVEs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Security Updates (CVEs)
            </h3>
            <Card variant="outline" className="p-4">
              <div className="flex flex-wrap gap-2">
                {build.CVEs.map((cve: string) => (
                  <Badge key={cve} variant="warning" size="sm">
                    {cve}
                  </Badge>
                ))}
              </div>
            </Card>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {permalink && (
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = permalink;
              }}
            >
              Build page
            </Button>
          )}
          {download && (
            <Button variant="primary" onClick={() => openExternal(download.url)}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              {download.label}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
