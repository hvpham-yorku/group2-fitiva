'use client';

import { useState, useEffect } from 'react';
import './SettingsModal.css';

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-content" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-body">
          <div className="settings-section">
            <h3 className="settings-section-title">Appearance</h3>
            <p className="settings-section-description">
              Customize how Fitiva looks on your device
            </p>

            <div className="theme-options">
              <button
                className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <div className="theme-icon">☀️</div>
                <div className="theme-info">
                  <div className="theme-name">Light Mode</div>
                </div>
                {theme === 'light' && (
                  <div className="theme-checkmark">✓</div>
                )}
              </button>

              <button
                className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <div className="theme-icon">🌙</div>
                <div className="theme-info">
                  <div className="theme-name">Dark Mode</div>
                </div>
                {theme === 'dark' && (
                  <div className="theme-checkmark">✓</div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
