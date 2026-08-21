import React from 'react';
import { cn } from '../../utils/cn';
import type { ReleaseChannel } from '../../types';
import { QUICK_FILTER_CHANNELS, channelMeta } from '../../config/releaseChannels';

interface QuickFilterBarProps {
  activeChannel: ReleaseChannel | null;
  onSelect: (channel: ReleaseChannel | null) => void;
}

// Channel quick-filter chips, derived entirely from the shared releaseChannels
// config (so Experimental / Release Preview appear automatically). `null` = all.
export const QuickFilterBar: React.FC<QuickFilterBarProps> = ({ activeChannel, onSelect }) => {
  const ring = 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900';

  return (
    <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filter by release channel">
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={activeChannel === null}
        className={cn(
          'px-3 py-1 rounded-md text-sm font-medium transition-all bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-white',
          activeChannel === null ? ring : 'opacity-70 hover:opacity-100'
        )}
      >
        All channels
      </button>

      {QUICK_FILTER_CHANNELS.map((ch) => {
        const meta = channelMeta(ch);
        const active = activeChannel === ch;
        return (
          <button
            key={ch}
            type="button"
            onClick={() => onSelect(ch)}
            aria-pressed={active}
            aria-label={meta.aria}
            className={cn(
              'px-3 py-1 rounded-md text-sm font-medium transition-all',
              meta.badgeClass,
              active ? ring : 'hover:brightness-110'
            )}
          >
            <span aria-hidden="true" className="mr-1">{meta.icon}</span>
            {meta.label}
          </button>
        );
      })}
    </div>
  );
};
