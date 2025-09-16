import React from 'react';
import type { TabType } from '../../types';

interface ArchitectureFilterProps {
  selectedArch: string;
  activeTab: TabType;
  onChange: (arch: string) => void;
}

const windowsArchitectures = [
  { value: 'amd64', label: 'Windows x64' },
  { value: 'arm64', label: 'Windows ARM' },
  { value: 'x86', label: 'Windows x86' }
];

const edgeArchitectures = [
  { value: 'x64', label: 'Windows x64' },
  { value: 'x86', label: 'Windows x86' },
  { value: 'arm64', label: 'Windows ARM' },
  { value: 'macos', label: 'macOS' },
  { value: 'linux', label: 'Linux' },
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' }
];

export const ArchitectureFilter: React.FC<ArchitectureFilterProps> = ({
  selectedArch,
  activeTab,
  onChange
}) => {
  const architectures = activeTab === 'edge' ? edgeArchitectures : windowsArchitectures;

  if (activeTab === 'office365') {
    return null; // Office doesn't use architecture filter
  }

  return (
    <div className="filter-group">
      <label htmlFor="arch-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Architecture:
      </label>
      <select
        id="arch-select"
        value={selectedArch}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        {architectures.map(arch => (
          <option key={arch.value} value={arch.value}>{arch.label}</option>
        ))}
      </select>
    </div>
  );
};