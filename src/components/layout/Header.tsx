import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className }) => {
  return (
    <motion.header
      className={cn(
        'sticky top-0 z-50 w-full backdrop-blur-lg bg-white/80 dark:bg-gray-900/80',
        'border-b border-gray-200/50 dark:border-gray-700/50',
        className
      )}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100 }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center h-16">
          {/* Logo and Title - centered */}
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-violet-500 rounded-lg blur-lg opacity-50"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-violet-500 text-white p-2 rounded-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400 bg-clip-text text-transparent">
                Windows Update Tracker
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Windows 11, Windows 10, Edge & Office Updates
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
};