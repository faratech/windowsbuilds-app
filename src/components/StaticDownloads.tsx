import { motion } from 'framer-motion';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import {
  STATIC_DOWNLOADS,
  STATIC_DOWNLOAD_LINKS_VERIFIED,
  STATIC_DOWNLOADS_NEWEST,
  isStaticDownloadsStale,
} from '../config/staticDownloads';

const formatArchiveDate = (value: string): string => {
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(timestamp)) return value;

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(timestamp);
};

export function StaticDownloads() {
  const stale = isStaticDownloadsStale();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="mb-8"
    >
      <Card variant="default">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Archived Windows 11 Media
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Direct Microsoft media links retained for convenience; the live build list below is the current tracker.
              </p>
            </div>
          </div>

          {stale && (
            <div
              role="status"
              className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
            >
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  This archive contains media dated {formatArchiveDate(STATIC_DOWNLOADS_NEWEST)}.
                  {' '}Link availability was checked {formatArchiveDate(STATIC_DOWNLOAD_LINKS_VERIFIED)};
                  confirm the release you need in the live list before downloading.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STATIC_DOWNLOADS.map((download, index) => (
              <motion.div
                key={`${download.type}-${download.architecture}-${download.url}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card variant="default" className="h-full hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                          {download.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {download.description}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-3">
                        <Badge variant={download.architecture === 'x64' ? 'primary' : 'secondary'} size="sm">
                          {download.architecture}
                        </Badge>
                        <Badge variant={download.type === 'iso' ? 'success' : 'info'} size="sm">
                          {download.type.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <a
                      href={download.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-900 text-white rounded-lg text-sm font-semibold transition-colors duration-100 card-shadow"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </a>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
