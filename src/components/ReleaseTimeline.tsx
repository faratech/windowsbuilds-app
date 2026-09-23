import React from 'react';
import type { BuildRecord } from '../utils/typeGuards';
import { UPDATE_KIND_META, type ReleaseDay, type ReleaseGroup } from '../utils/releaseGroups';
import { cn } from '../utils/cn';

interface ReleaseTimelineProps {
  days: ReleaseDay[];
  /** Rows to render before "Show more"; whole days are never split. */
  limit: number;
  onOpen: (build: BuildRecord) => void;
}

function GroupRow({ group, onOpen }: { group: ReleaseGroup; onOpen: (b: BuildRecord) => void }) {
  const meta = UPDATE_KIND_META[group.kind];
  return (
    <li className="grid grid-cols-1 @md:grid-cols-[9.5rem_minmax(0,1fr)] @2xl:grid-cols-[9.5rem_minmax(0,1fr)_11rem] gap-x-4 gap-y-1.5 px-4 sm:px-5 py-3">
      <span
        title={meta.explain}
        className={cn('justify-self-start self-start rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap', meta.pill)}
      >
        {meta.label}
      </span>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onOpen(group.primary)}
          aria-label={`View details for ${group.title}`}
          className="text-left text-[15px] font-semibold text-gray-900 dark:text-white hover:text-blue-700 dark:hover:text-blue-300 hover:underline focus-visible:outline-2 focus-visible:outline-blue-500 rounded"
        >
          {group.title}
        </button>
        {group.detail && (
          <p className="mt-0.5 text-sm leading-snug text-gray-600 dark:text-gray-400 line-clamp-2">{group.detail}</p>
        )}
      </div>
      {(group.items.length > 0 || group.kb) && (
        <div className="@md:col-start-2 @2xl:col-start-auto flex flex-wrap @2xl:flex-col @2xl:items-end gap-x-3 gap-y-0.5 font-mono text-[13px]">
          {group.items.map((item) =>
            item.href ? (
              <a
                key={item.number}
                href={item.href}
                title={item.label ? `${item.label} — build ${item.number}` : undefined}
                className="text-blue-700 dark:text-blue-300 hover:underline"
              >
                {item.number}
              </a>
            ) : (
              <span key={item.number} className="text-gray-800 dark:text-gray-200">{item.number}</span>
            ),
          )}
          {group.kb && <span className="text-gray-600 dark:text-gray-400">{group.kb}</span>}
        </div>
      )}
    </li>
  );
}

export const ReleaseTimeline: React.FC<ReleaseTimelineProps> = ({ days, limit, onOpen }) => {
  let budget = limit;
  const visible: ReleaseDay[] = [];
  for (const day of days) {
    if (budget <= 0) break;
    visible.push(day);
    budget -= day.groups.length;
  }

  return (
    <ol className="@container list-none" aria-label="Releases by day">
      {visible.map((day) => (
        <li key={day.day} className="border-t border-gray-100 dark:border-gray-800">
          <h3 className="flex flex-wrap items-baseline gap-x-2 px-4 sm:px-5 pt-3 text-sm">
            <span className="font-semibold text-gray-900 dark:text-white">{day.label}</span>
            {day.note && <span className="text-gray-600 dark:text-gray-400">· {day.note}</span>}
          </h3>
          <ul className="list-none">
            {day.groups.map((group) => <GroupRow key={group.key} group={group} onOpen={onOpen} />)}
          </ul>
        </li>
      ))}
    </ol>
  );
};

/** Rows actually rendered for a given limit (whole days), for the "Show more" count. */
export function timelineRowCount(days: ReleaseDay[], limit: number): number {
  let shown = 0;
  for (const day of days) {
    if (shown >= limit) break;
    shown += day.groups.length;
  }
  return shown;
}
