import React, { useState } from 'react';
import { FilterState, TabType } from '../types';

interface FilterBarProps {
  filters: FilterState;
  activeTab: TabType;
  onFilterChange: (filters: Partial<FilterState>) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, activeTab, onFilterChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const months = ['All', 'Last 30 Days', 'January', 'February', 'March', 'April', 
                  'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const currentYear = new Date().getFullYear();
  const years = ['All', ...Array.from({ length: 10 }, (_, i) => String(currentYear - i))];
  
  const architectures = activeTab === 'edge' 
    ? ['All Platforms', 'Windows', 'macOS', 'Linux', 'Android', 'iOS']
    : ['amd64', 'arm64', 'x86'];

  return (
    <>
      <div className="block-filterBar">
        <button
          type="button"
          className="button button--cta"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-controls="filter-panel"
        >
          <i className="fa fa-filter" aria-hidden="true"></i>
          Advanced Filters 
          <i className={`fa fa-chevron-${isExpanded ? 'up' : 'down'}`} aria-hidden="true"></i>
        </button>
      </div>
      
      {isExpanded && (
        <div id="filter-panel" className="block block--messages">
          <div className="block-container">
            <h3 className="block-minorHeader">Filter Options</h3>
            <div className="block-body">
              <div className="formRow formRow--input">
                <dl className="formRow-labelRow">
                  <dt><label className="formRow-label" htmlFor="month-select">Month:</label></dt>
                  <dd>
                    <select
                      className="input"
                      id="month-select"
                      value={filters.month}
                      onChange={(e) => onFilterChange({ month: e.target.value })}
                      aria-label="Filter by month"
                    >
                      {months.map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </dd>
                </dl>
              </div>
              
              <div className="formRow formRow--input">
                <dl className="formRow-labelRow">
                  <dt><label className="formRow-label" htmlFor="year-select">Year:</label></dt>
                  <dd>
                    <select
                      className="input"
                      id="year-select"
                      value={filters.year}
                      onChange={(e) => onFilterChange({ year: e.target.value })}
                      aria-label="Filter by year"
                    >
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </dd>
                </dl>
              </div>
              
              <div className="formRow formRow--input">
                <dl className="formRow-labelRow">
                  <dt>
                    <label className="formRow-label" htmlFor="arch-select">
                      {activeTab === 'edge' ? 'Platform:' : 'Architecture:'}
                    </label>
                  </dt>
                  <dd>
                    <select
                      className="input"
                      id="arch-select"
                      value={filters.architecture}
                      onChange={(e) => onFilterChange({ architecture: e.target.value })}
                      aria-label="Filter by architecture"
                    >
                      {architectures.map(arch => (
                        <option key={arch} value={arch}>{arch}</option>
                      ))}
                    </select>
                  </dd>
                </dl>
              </div>
              
              <div className="formRow">
                <label className="iconic iconic--checkbox">
                  <input
                    type="checkbox"
                    checked={filters.excludeInsider}
                    onChange={(e) => onFilterChange({ excludeInsider: e.target.checked })}
                  />
                  <i aria-hidden="true"></i>
                  <span className="iconic-label">Exclude Insider Builds</span>
                </label>
              </div>
            
              {(activeTab === 'office' || activeTab === 'edge') && (
                <>
                  {activeTab === 'office' && (
                    <>
                      <div className="formRow formRow--input">
                        <dl className="formRow-labelRow">
                          <dt><label className="formRow-label" htmlFor="channel-select">Channel:</label></dt>
                          <dd>
                            <select
                              className="input"
                              id="channel-select"
                              value={filters.channel || ''}
                              onChange={(e) => onFilterChange({ channel: e.target.value })}
                            >
                              <option value="">All Channels</option>
                              {/* Channels will be loaded dynamically */}
                            </select>
                          </dd>
                        </dl>
                      </div>
                      
                      <div className="formRow formRow--input">
                        <dl className="formRow-labelRow">
                          <dt><label className="formRow-label" htmlFor="app-select">Application:</label></dt>
                          <dd>
                            <select
                              className="input"
                              id="app-select"
                              value={filters.application || ''}
                              onChange={(e) => onFilterChange({ application: e.target.value })}
                            >
                              <option value="">All Applications</option>
                              {/* Applications will be loaded dynamically */}
                            </select>
                          </dd>
                        </dl>
                      </div>
                    </>
                  )}
                </>
              )}
            
              <div className="formRow formRow--controls">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => setIsExpanded(false)}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};