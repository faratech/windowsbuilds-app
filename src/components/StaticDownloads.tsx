import { motion } from 'framer-motion';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

interface DownloadLink {
  title: string;
  description: string;
  architecture: string;
  type: 'iso' | 'update';
  url: string;
  size?: string;
}

const staticDownloads: DownloadLink[] = [
  {
    title: 'Windows 11 25H2 ISO',
    description: 'Build 26200.6584 (September 2025 Release)',
    architecture: 'x64',
    type: 'iso',
    url: 'https://software-static.download.prss.microsoft.com/dbazure/888969d5-f34g-4e03-ac9d-1f9786c66749/26200.6584.250915-1905.25h2_ge_release_svc_refresh_CLIENT_CONSUMER_x64FRE_en-us.iso',
  },
  {
    title: 'Windows 11 25H2 ISO',
    description: 'Build 26200.6584 (September 2025 Release)',
    architecture: 'arm64',
    type: 'iso',
    url: 'https://software-static.download.prss.microsoft.com/dbazure/888969d5-f34g-4e03-ac9d-1f9786c66749/26200.6584.250915-1905.25h2_ge_release_svc_refresh_CLIENT_CONSUMER_A64FRE_en-us.iso',
  },
  {
    title: 'KB5054156 - 24H2 to 25H2 Update',
    description: 'Enablement Package for Windows 11 25H2',
    architecture: 'x64',
    type: 'update',
    url: 'https://catalog.sf.dl.delivery.mp.microsoft.com/filestreamingservice/files/fa84cc49-18b2-4c26-b389-90c96e6ae0d2/public/windows11.0-kb5054156-x64_a0c1638cbcf4cf33dbe9a5bef69db374b4786974.msu',
  },
  {
    title: 'KB5054156 - 24H2 to 25H2 Update',
    description: 'Enablement Package for Windows 11 25H2',
    architecture: 'arm64',
    type: 'update',
    url: 'https://catalog.sf.dl.delivery.mp.microsoft.com/filestreamingservice/files/78b265e5-83a8-4e0a-9060-efbe0bac5bde/public/windows11.0-kb5054156-arm64_3d5c91aaeb08a87e0717f263ad4a61186746e465.msu',
  },
];

export function StaticDownloads() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="mb-8"
    >
      <Card variant="glass">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-violet-500 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Official Windows 11 25H2 Downloads
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Direct download links from Microsoft servers
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staticDownloads.map((download, index) => (
              <motion.div
                key={index}
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
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Note about 25H2 Updates:</p>
                <p>The KB5054156 enablement package can upgrade Windows 11 24H2 systems to 25H2. Install this update through Windows Update or manually using the MSU file above.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}