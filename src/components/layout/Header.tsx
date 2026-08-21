import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { windowsBuildsAssetUrl } from '../../utils/assets';
// Keep this as a real hashed file. The beta release stages assets separately,
// so inlining would bypass the durable `/js/WindowsBuilds/` URL contract.
import WF_MARK from '../../assets/wf-mark.svg?no-inline';

interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className }) => {
  return (
    <motion.header
      className={cn(
        'sticky top-0 z-50 w-full glass',
        'border-b border-gray-200 dark:border-gray-700',
        className
      )}
      initial={{ y: -64 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center h-16">
          <div className="flex items-center gap-3">
            <img
              src={windowsBuildsAssetUrl(WF_MARK)}
              alt="WindowsForum"
              className="w-9 h-9 rounded-md flex-shrink-0"
              draggable={false}
            />
            <div className="text-center sm:text-left">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                Windows Update Tracker
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Windows 11, Windows 10, Edge &amp; Office Updates
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};
