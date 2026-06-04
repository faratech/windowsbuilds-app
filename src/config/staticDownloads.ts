// Manually-curated direct download links shown on the Windows 11 tab. These lag
// behind the live build list by design (Microsoft does not offer a stable ISO
// API), so each entry is date-stamped and the UI flags the section as stale once
// the newest entry is older than STALE_AFTER_MONTHS. Refresh `releasedDate` and
// the URLs when a newer servicing build's media is published.

export interface StaticDownload {
  title: string;
  description: string;
  architecture: string;
  type: 'iso' | 'update';
  url: string;
  /** ISO date the linked media was released; drives the staleness banner. */
  releasedDate: string;
  size?: string;
}

export const STALE_AFTER_MONTHS = 4;

export const STATIC_DOWNLOADS: StaticDownload[] = [
  {
    title: 'Windows 11 25H2 ISO',
    description: 'Build 26200.6584 (September 2025 servicing release)',
    architecture: 'x64',
    type: 'iso',
    url: 'https://software-static.download.prss.microsoft.com/dbazure/888969d5-f34g-4e03-ac9d-1f9786c66749/26200.6584.250915-1905.25h2_ge_release_svc_refresh_CLIENT_CONSUMER_x64FRE_en-us.iso',
    releasedDate: '2025-09-15',
  },
  {
    title: 'Windows 11 25H2 ISO',
    description: 'Build 26200.6584 (September 2025 servicing release)',
    architecture: 'arm64',
    type: 'iso',
    url: 'https://software-static.download.prss.microsoft.com/dbazure/888969d5-f34g-4e03-ac9d-1f9786c66749/26200.6584.250915-1905.25h2_ge_release_svc_refresh_CLIENT_CONSUMER_A64FRE_en-us.iso',
    releasedDate: '2025-09-15',
  },
  {
    title: 'KB5054156 — 24H2 to 25H2 Enablement Package',
    description: 'Flips a fully-updated 24H2 (26100) device to 25H2 (26200)',
    architecture: 'x64',
    type: 'update',
    url: 'https://catalog.sf.dl.delivery.mp.microsoft.com/filestreamingservice/files/fa84cc49-18b2-4c26-b389-90c96e6ae0d2/public/windows11.0-kb5054156-x64_a0c1638cbcf4cf33dbe9a5bef69db374b4786974.msu',
    releasedDate: '2025-09-15',
  },
  {
    title: 'KB5054156 — 24H2 to 25H2 Enablement Package',
    description: 'Flips a fully-updated 24H2 (26100) device to 25H2 (26200)',
    architecture: 'arm64',
    type: 'update',
    url: 'https://catalog.sf.dl.delivery.mp.microsoft.com/filestreamingservice/files/78b265e5-83a8-4e0a-9060-efbe0bac5bde/public/windows11.0-kb5054156-arm64_3d5c91aaeb08a87e0717f263ad4a61186746e465.msu',
    releasedDate: '2025-09-15',
  },
];

/** Newest releasedDate across all entries (ISO string), or '' if none. */
export const STATIC_DOWNLOADS_NEWEST: string = STATIC_DOWNLOADS.reduce(
  (max, d) => (d.releasedDate > max ? d.releasedDate : max),
  ''
);

/** True when the freshest static download is older than STALE_AFTER_MONTHS. */
export function isStaticDownloadsStale(now: Date = new Date()): boolean {
  if (!STATIC_DOWNLOADS_NEWEST) return true;
  const newest = new Date(STATIC_DOWNLOADS_NEWEST);
  const ageMonths =
    (now.getFullYear() - newest.getFullYear()) * 12 + (now.getMonth() - newest.getMonth());
  return ageMonths >= STALE_AFTER_MONTHS;
}
