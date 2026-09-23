import {
  STATIC_DOWNLOADS,
  STATIC_DOWNLOAD_LINKS_VERIFIED,
  STATIC_DOWNLOADS_NEWEST,
  isStaticDownloadsStale,
  type StaticDownload,
} from '../config/staticDownloads';

const UUP_GUIDE =
  'https://windowsforum.com/windows-tutorials.305/how-to-create-a-windows-iso-using-uupdump-windows-11-24h2.338857/';

const formatArchiveDate = (value: string): string => {
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(timestamp)) return value;
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(timestamp);
};

const ARCH_LABEL: Record<string, string> = { x64: 'x64', arm64: 'Arm64' };

/** One card per media item; the x64/Arm64 variants become buttons on it. */
function groupByTitle(downloads: StaticDownload[]): StaticDownload[][] {
  const groups = new Map<string, StaticDownload[]>();
  for (const d of downloads) groups.set(d.title, [...(groups.get(d.title) ?? []), d]);
  return [...groups.values()];
}

export function StaticDownloads() {
  const stale = isStaticDownloadsStale();

  return (
    <section
      aria-labelledby="wf-downloads-heading"
      className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5"
    >
      <h2 id="wf-downloads-heading" className="text-base font-semibold text-gray-900 dark:text-white">
        Downloads
      </h2>
      <p className="mt-1 text-[13px] leading-snug text-gray-600 dark:text-gray-400">
        Direct Microsoft links, checked {formatArchiveDate(STATIC_DOWNLOAD_LINKS_VERIFIED)}.
      </p>
      {stale && (
        <p role="status" className="mt-2 rounded-md bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-[13px] text-amber-900 dark:text-amber-200">
          The newest media here is from {formatArchiveDate(STATIC_DOWNLOADS_NEWEST)} — check the version table for anything newer.
        </p>
      )}
      <ul className="mt-3 space-y-2.5 list-none">
        {groupByTitle(STATIC_DOWNLOADS).map((variants) => {
          const first = variants[0];
          return (
            <li key={first.title} className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">{first.title}</div>
              <p className="mt-0.5 text-xs leading-snug text-gray-600 dark:text-gray-400">{first.description}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {variants.map((d) => (
                  <a
                    key={d.url}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Download ${first.title} for ${ARCH_LABEL[d.architecture] ?? d.architecture}${d.size ? ` (${d.size})` : ''}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 text-[13px] font-semibold text-gray-900 dark:text-white hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m-5-4 5 5 5-5M5 20h14" />
                    </svg>
                    {ARCH_LABEL[d.architecture] ?? d.architecture}
                    {d.size && <span className="font-normal text-gray-600 dark:text-gray-400">{d.size}</span>}
                  </a>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <a href={UUP_GUIDE} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[13px] text-blue-700 dark:text-blue-300 hover:underline">
        How to build your own ISO with UUP dump
      </a>
    </section>
  );
}
