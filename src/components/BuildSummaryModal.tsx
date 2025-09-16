import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface BuildSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildUuid: string;
  buildTitle: string;
  buildType?: string;
}

export const BuildSummaryModal: React.FC<BuildSummaryModalProps> = ({
  isOpen,
  onClose,
  buildUuid,
  buildTitle,
  buildType = 'windows'
}) => {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && buildUuid) {
      setLoading(true);
      apiService.fetchBuildSummary(buildUuid, buildTitle, buildType)
        .then(setSummary)
        .catch(() => setSummary('Failed to load summary'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, buildUuid, buildTitle, buildType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                {buildTitle}
              </h3>
              <button
                onClick={onClose}
                className="ml-3 bg-white dark:bg-gray-800 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="mt-3">
              {loading ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {summary}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};