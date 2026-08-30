import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';
import type { TabType, VersionLine, LineStatus } from '../types';
import { formatBuildDate, SHORT_DATE } from '../utils/dates';
import { cn } from '../utils/cn';

interface LatestByVersionProps {
  tab: TabType;
  activeTag?: string | null;
}

const STATUS_STYLE: Record<LineStatus, { label: string; className: string }> = {
  preview: { label: 'Not released', className: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200' },
  silicon: { label: 'New silicon', className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200' },
  mainstream: { label: 'Mainstream', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200' },
  supported: { label: 'Supported', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  eol: { label: 'End of support', className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200' },
  extended: { label: 'Extended support', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' },
};

/**
 * "Latest per version line" strip: one card per 24H2 / 25H2 / 26H1 / … with
 * the newest OS build of that line over the whole feed (not just the loaded
 * window), so a line whose last build is weeks old still shows it. Each card
 * is that build's permalink; the small link beneath opens the whole line.
 * Status notes come from the server's build_lines.json.
 */
export const LatestByVersion: React.FC<LatestByVersionProps> = ({ tab, activeTag }) => {
  const query = useQuery({
    queryKey: ['lines', tab],
    queryFn: ({ signal }) => apiService.fetchLines(tab, signal),
    staleTime: 10 * 60 * 1000,
  });
  const lines: VersionLine[] = query.data ?? [];
  if (lines.length === 0) return null;

  return (
    <motion.section
      className="mb-6"
      aria-labelledby="wf-lines-heading"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <h3 id="wf-lines-heading" className="text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
          Latest per version
        </h3>
        <span className="text-xs text-gray-600 dark:text-gray-300">Each card is a permanent link</span>
      </div>
      <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 list-none p-0 m-0">
        {lines.map((line) => {
          const status = line.status ? STATUS_STYLE[line.status] : null;
          const active = !!activeTag && activeTag.toUpperCase() === line.tag.toUpperCase();
          const dateLabel = line.latest.created ? formatBuildDate(line.latest.created, SHORT_DATE) : '';
          return (
            <li key={`${line.family}-${line.tag}`} className="min-w-0">
              <a
                href={line.latest.url}
                title={line.note ?? undefined}
                className={cn(
                  'block rounded-lg border bg-white dark:bg-gray-800 px-3 py-3 transition-colors',
                  'hover:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  active ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-gray-200 dark:border-gray-700',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">{line.tag}</span>
                  {status && (
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', status.className)}>
                      {status.label}
                    </span>
                  )}
                </span>
                <span className="mt-1 block font-mono text-base font-semibold text-gray-900 dark:text-white truncate">
                  {line.latest.build}
                </span>
                <span className="block text-xs text-gray-600 dark:text-gray-300 truncate">
                  {line.status === 'preview' ? 'Preview flight' : line.latest.channel_label}
                  {dateLabel ? ` · ${dateLabel}` : ''}
                </span>
              </a>
              <a
                href={line.url}
                className="mt-1 inline-block min-h-[24px] text-xs text-blue-700 dark:text-blue-300 hover:underline"
              >
                All {line.count} {line.tag} builds ›
              </a>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
};
