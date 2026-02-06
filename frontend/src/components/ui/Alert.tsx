import React from 'react';
import './Alert.css';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

export default function Alert({ type, message, onClose }: AlertProps) {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div className={`alert alert-${type}`} role="alert">
      <div className="alert-content">
        <span className="alert-icon">{icons[type]}</span>
        <p className="alert-message">{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="alert-close" aria-label="Close alert">
          ✕
        </button>
      )}
    </div>
  );
}
