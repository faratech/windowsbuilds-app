import React from 'react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  return (
    <div className="blockMessage blockMessage--error">
      <div className="blockMessage-content">
        <i className="fa fa-exclamation-triangle fa-3x"></i>
        <div className="u-marginTop">{message}</div>
        {onRetry && (
          <div className="u-marginTop">
            <button className="button button--primary" onClick={onRetry}>
              <i className="fa fa-redo"></i> Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};