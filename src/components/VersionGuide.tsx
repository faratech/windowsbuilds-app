import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import type { TabType } from '../types';
import { PRODUCT_GUIDE } from '../config/productGuide';
import { edgeRows, lineRows, officeRows, TONE_PILL, type VersionRow } from '../utils/versionRows';
import { formatBuildDate, SHORT_DATE } from '../utils/dates';
import { isWindowsTab } from '../hooks/useBuilds';
import type { BuildRecord } from '../utils/typeGuards';
import { cn } from '../utils/cn';

interface VersionGuideProps {
  tab: TabType;
  /** Loaded records; Edge/Office rows are derived from them. */
  builds: BuildRecord[];
  /** Version line the page was opened on (/builds/windows11/24h2/). */
  activeTag?: string | null;
  /** The build feed is still loading (Edge/Office rows derive from it). */
  loading?: boolean;
  onOpen: (build: BuildRecord) => void;
}

// Container queries, not viewport breakpoints: embedded in XenForo the column
// is ~740px at a 1366px viewport, and fixed columns starved "Latest build" to
// zero width (build numbers wrapped one digit per line).
const GRID = '@2xl:grid @2xl:grid-cols-[5.5rem_minmax(0,1.3fr)_minmax(8.5rem,1fr)_6rem_6.5rem_minmax(5.5rem,auto)] @2xl:gap-x-4';

function Row({ row, active, onOpen }: { row: VersionRow; active: boolean; onOpen: (b: BuildRecord) => void }) {
  const date = row.time ? formatBuildDate(row.time / 1000, SHORT_DATE, '') : '';
  const numberClass = 'font-mono text-[15px] font-semibold text-blue-700 dark:text-blue-300 hover:underline';
  return (
    <li
      className={cn(
        'px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-gray-800 @2xl:items-start',
        GRID,
        row.recommended && 'bg-blue-50/70 dark:bg-blue-950/30 shadow-[inset_3px_0_0_var(--color-blue-500)]',
        active && 'ring-2 ring-inset ring-blue-500',
        row.ended && 'text-gray-600 dark:text-gray-400',
      )}
    >
      <div className="flex items-center justify-between gap-3 @2xl:block">
        <span className="text-base font-semibold text-gray-900 dark:text-white">{row.name}</span>
        {/* Mobile: the build number rides on the name line. */}
        <span className="@2xl:hidden">
          {row.href ? (
            <a href={row.href} className={numberClass}>{row.number}</a>
          ) : row.build ? (
            <button type="button" onClick={() => onOpen(row.build!)} className={numberClass}>{row.number}</button>
          ) : (
            <span className="font-mono">{row.number}</span>
          )}
        </span>
      </div>
      <div className="mt-1 @2xl:mt-0 flex flex-col items-start gap-1">
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', TONE_PILL[row.tone])}>{row.status}</span>
        {row.note && <span className="text-xs leading-snug text-gray-600 dark:text-gray-400">{row.note}</span>}
      </div>
      <div className="hidden @2xl:block">
        {row.href ? (
          <a href={row.href} className={numberClass}>{row.number}</a>
        ) : row.build ? (
          <button type="button" onClick={() => onOpen(row.build!)} className={cn(numberClass, 'text-left')}>
            {row.number}
          </button>
        ) : (
          <span className="font-mono">{row.number}</span>
        )}
      </div>
      <div className="mt-1 @2xl:mt-0 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400 @2xl:contents">
        <span className="font-mono @2xl:text-[13px] @2xl:text-gray-700 @2xl:dark:text-gray-300">{row.kb ?? (row.historyHref && !row.ended ? '—' : '')}</span>
        <span className="@2xl:text-[13px] @2xl:text-gray-700 @2xl:dark:text-gray-300">{date}</span>
        <span className="@2xl:text-right">
          {row.historyHref && (
            <a href={row.historyHref} className="text-blue-700 dark:text-blue-300 hover:underline @2xl:text-[13px]">
              {row.historyLabel}
            </a>
          )}
        </span>
      </div>
    </li>
  );
}

export const VersionGuide: React.FC<VersionGuideProps> = ({ tab, builds, activeTag, loading = false, onOpen }) => {
  const guide = PRODUCT_GUIDE[tab];
  const windows = isWindowsTab(tab);
  const lines = useQuery({
    queryKey: ['lines', tab],
    queryFn: ({ signal }) => apiService.fetchLines(tab, signal),
    staleTime: 10 * 60 * 1000,
    enabled: windows,
  });

  const rows = useMemo(() => {
    if (windows) return lineRows(lines.data ?? []);
    if (tab === 'edge') return edgeRows(builds);
    return officeRows(builds);
  }, [windows, tab, lines.data, builds]);

  const pending = windows ? lines.isPending : loading;
  if (rows.length === 0 && !pending) return null;

  // Ended versions fold away — unless nothing else is left (Windows 10).
  const live = rows.filter((r) => !r.ended);
  const ended = live.length > 0 ? rows.filter((r) => r.ended) : [];
  const shown = live.length > 0 ? live : rows;
  const isActive = (r: VersionRow) => !!activeTag && r.name.toUpperCase().endsWith(activeTag.toUpperCase());
  const col1 = windows ? (tab === 'windowsServer' ? 'Release' : 'Version') : 'Channel';

  return (
    <section
      aria-labelledby="wf-versions-heading"
      className="@container rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
    >
      <div className="px-4 sm:px-5 pt-4 pb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div className="min-w-0">
          <h2 id="wf-versions-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
            {guide.versionHeading}
          </h2>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400 max-w-2xl">{guide.versionHint}</p>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">{guide.checkHint}</p>
      </div>
      <div
        aria-hidden="true"
        className={cn(
          'hidden px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400',
          'bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-800',
          GRID,
        )}
      >
        <span>{col1}</span><span>Status</span><span>Latest build</span><span>{windows ? 'KB' : ''}</span><span>Released</span>
        <span className="text-right">{windows ? 'History' : ''}</span>
      </div>
      {rows.length === 0 ? (
        // Placeholder rows hold the table's height, so the release list below
        // does not jump down when the data lands.
        <ul className="list-none" aria-busy="true" aria-label="Loading versions">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex items-center gap-4 px-4 sm:px-5 py-4 border-t border-gray-100 dark:border-gray-800">
              <span className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
              <span className="h-4 w-28 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
              <span className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="list-none">
          {shown.map((row) => <Row key={row.key} row={row} active={isActive(row)} onOpen={onOpen} />)}
        </ul>
      )}
      {ended.length > 0 && (
        <details className="group border-t border-gray-100 dark:border-gray-800">
          <summary className="cursor-pointer list-none px-4 sm:px-5 py-2.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:underline">
            <span className="group-open:hidden">Show {ended.length} ended {ended.length === 1 ? 'version' : 'versions'} ({ended.map((r) => r.name).join(', ')})</span>
            <span className="hidden group-open:inline">Hide ended versions</span>
          </summary>
          <ul className="list-none">
            {ended.map((row) => <Row key={row.key} row={row} active={isActive(row)} onOpen={onOpen} />)}
          </ul>
        </details>
      )}
    </section>
  );
};
