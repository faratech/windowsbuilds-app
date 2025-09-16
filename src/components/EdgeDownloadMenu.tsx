import React, { useState, useRef, useEffect } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import type { EdgeArtifact } from '../types';

interface EdgeDownloadMenuProps {
  artifacts: EdgeArtifact[];
}

export const EdgeDownloadMenu: React.FC<EdgeDownloadMenuProps> = ({ artifacts }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!artifacts || artifacts.length === 0) {
    return null;
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getFileType = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      msi: 'Windows Installer',
      exe: 'Windows Executable',
      deb: 'Debian/Ubuntu',
      rpm: 'RedHat/Fedora',
      pkg: 'macOS Package',
      dmg: 'macOS Disk Image',
      apk: 'Android Package',
      ipa: 'iOS Package'
    };
    return typeMap[ext || ''] || ext?.toUpperCase() || 'Unknown';
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
        Download
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {artifacts.map((artifact, index) => (
              <a
                key={index}
                href={artifact.Location}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                role="menuitem"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{getFileType(artifact.ArtifactName)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {artifact.ArtifactName}
                    </div>
                  </div>
                  {artifact.SizeInBytes && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(artifact.SizeInBytes)}
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};