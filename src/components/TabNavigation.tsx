import React from 'react';
import type { TabType } from '../types';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: string; color: string }[] = [
  { id: 'windows11', label: 'Windows 11', icon: '🪟', color: 'text-windows-11' },
  { id: 'windows10', label: 'Windows 10', icon: '💻', color: 'text-windows-10' },
  { id: 'windowsServer', label: 'Windows Server', icon: '🖥️', color: 'text-windows-server' },
  { id: 'edge', label: 'Microsoft Edge', icon: '🌐', color: 'text-windows-edge' },
  { id: 'office365', label: 'Office 365', icon: '📊', color: 'text-orange-600' },
];

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="flex flex-wrap -mb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              inline-flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm
              transition-colors duration-200
              ${
                activeTab === tab.id
                  ? `border-blue-500 text-blue-600 dark:text-blue-400`
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default TabNavigation;