import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="blockMessage">
      <div className="blockMessage-content">
        <i className="fa fa-spinner fa-spin fa-3x"></i>
        <div className="u-marginTop">Loading builds...</div>
      </div>
    </div>
  );
};