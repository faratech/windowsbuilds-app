import React from 'react';
import { TabType } from '../types';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'windows11', label: 'Windows 11', icon: 'fa-windows' },
    { id: 'windows10', label: 'Windows 10', icon: 'fa-windows' },
    { id: 'windowsServer', label: 'Windows Server', icon: 'fa-server' },
    { id: 'office', label: 'Microsoft Office', icon: 'fa-file-word' },
    { id: 'edge', label: 'Microsoft Edge', icon: 'fa-edge' },
  ];

  return (
    <div className="tabs tabs--standalone">
      <div className="hScroller" data-xf-init="h-scroller">
        <span className="hScroller-scroll">
          {tabs.map(tab => (
            <a
              key={tab.id}
              className={`tabs-tab ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={(e) => { e.preventDefault(); onTabChange(tab.id); }}
              href="#"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-label={`View ${tab.label} builds`}
            >
              <i className={`fab ${tab.icon}`} aria-hidden="true"></i>
              {' '}
              <span>{tab.label}</span>
            </a>
          ))}
        </span>
      </div>
    </div>
  );
};