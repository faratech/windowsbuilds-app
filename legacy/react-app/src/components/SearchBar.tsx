import React from 'react';
import { BuildType } from '../types';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onQuickFilter: (filter: BuildType | 'latest' | 'reset') => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, onQuickFilter }) => {
  const quickFilters: Array<{ id: BuildType | 'latest' | 'reset'; label: string }> = [
    { id: 'release', label: 'Release Builds' },
    { id: 'insider', label: 'Insider Builds' },
    { id: 'beta', label: 'Beta Channel' },
    { id: 'dev', label: 'Dev Channel' },
    { id: 'canary', label: 'Canary Channel' },
    { id: 'latest', label: 'Latest Only' },
    { id: 'reset', label: 'Reset Filters' },
  ];

  return (
    <div className="block-filterBar">
      <div className="filterBar">
        <div className="filterBar-filters">
          <div className="inputGroup">
            <input
              type="text"
              className="input"
              placeholder="Search builds..."
              value={value}
              onChange={(e) => onChange(e.target.value)}
              aria-label="Search for builds by name or number"
            />
            <span className="inputGroup-splitter"></span>
            <button 
              type="button" 
              className="button button--icon button--icon--search"
              onClick={() => onChange(value)}
              aria-label="Search"
            >
              <i className="fa fa-search" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      
        <div className="filterBar-filterToggle">
          <div className="buttonGroup">
            {quickFilters.map(filter => (
              <button
                key={filter.id}
                type="button"
                className={`button ${filter.id === 'reset' ? 'button--link' : ''}`}
                onClick={() => onQuickFilter(filter.id)}
                aria-label={filter.label}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};