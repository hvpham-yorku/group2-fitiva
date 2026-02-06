'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import './dashboard.css';

export default function DashboardPage() {
  const { user, logout, isLoading } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setIsDropdownOpen(false);
    await logout();
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.username[0].toUpperCase();

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-logo">Fitiva</div>
        <nav className="dashboard-nav">
          {/* User Menu with Dropdown */}
          <div className="user-menu" ref={dropdownRef}>
            <button 
              className="user-menu-trigger" 
              onClick={toggleDropdown}
              aria-label="User menu"
              aria-expanded={isDropdownOpen}
            >
              <div className="user-avatar">{initials}</div>
              <div className="user-details">
                <div className="user-name">
                  {user.first_name} {user.last_name}
                </div>
                <div className="user-email">{user.email}</div>
                {user.is_trainer && (
                  <span className="user-badge trainer">Trainer</span>
                )}
                {!user.is_trainer && (
                  <span className="user-badge">Member</span>
                )}
              </div>
              <svg 
                className={`dropdown-icon ${isDropdownOpen ? 'open' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            <div className={`user-menu-dropdown ${isDropdownOpen ? 'open' : ''}`}>
              <div className="dropdown-header">
                <div className="dropdown-user-name">{user.first_name} {user.last_name}</div>
                <div className="dropdown-user-email">{user.email}</div>
              </div>
              
              <ul className="dropdown-menu-items">
                <li>
                  <Link 
                    href="/profile" 
                    className="dropdown-menu-item"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <span className="menu-item-icon">👤</span>
                    <span>Profile</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/settings" 
                    className="dropdown-menu-item"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <span className="menu-item-icon">⚙️</span>
                    <span>Settings</span>
                  </Link>
                </li>
                {user.is_trainer && (
                  <li>
                    <Link 
                      href="/my-programs" 
                      className="dropdown-menu-item"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <span className="menu-item-icon">📋</span>
                      <span>My Programs</span>
                    </Link>
                  </li>
                )}
                <div className="dropdown-divider"></div>
                <li>
                  <button 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="dropdown-menu-item danger"
                  >
                    <span className="menu-item-icon">🚪</span>
                    <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Welcome Section */}
        <section className="welcome-section">
          <h1 className="welcome-title">
            Welcome back, {user.first_name}! 👋
          </h1>
          <p className="welcome-subtitle">
            {user.is_trainer 
              ? "Ready to inspire and train your clients today?" 
              : "Ready to crush your fitness goals today?"}
          </p>
          <div className="welcome-message">
            {user.is_trainer ? (
              <>
                <strong>🎯 Trainer Dashboard:</strong> Manage your workout programs, track client progress, 
                and share your expertise with the Fitiva community.
              </>
            ) : (
              <>
                <strong>🎯 Your Fitness Journey:</strong> Complete your profile to get personalized workout 
                recommendations tailored to your goals and experience level.
              </>
            )}
          </div>
        </section>

        {/* Stats Grid */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">📊</div>
            <div className="stat-label">Total Workouts</div>
            <div className="stat-value">0</div>
            <div className="stat-subtext">Start your first workout today!</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">🔥</div>
            <div className="stat-label">Current Streak</div>
            <div className="stat-value">0 days</div>
            <div className="stat-subtext">Build consistency!</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">⏱️</div>
            <div className="stat-label">Total Time</div>
            <div className="stat-value">0 min</div>
            <div className="stat-subtext">Every minute counts</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">🏆</div>
            <div className="stat-label">Achievements</div>
            <div className="stat-value">0</div>
            <div className="stat-subtext">Unlock your first badge!</div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="quick-actions">
          <h2 className="section-title">Quick Actions</h2>
          <div className="action-buttons">
            <Link href="/profile" className="action-button">
              <div className="action-button-icon">👤</div>
              <div className="action-button-title">Complete Profile</div>
              <div className="action-button-description">
                Add your fitness details to get started
              </div>
            </Link>

            <Link href="/recommendations" className="action-button">
              <div className="action-button-icon">🎯</div>
              <div className="action-button-title">View Recommendations</div>
              <div className="action-button-description">
                Discover workout plans for you
              </div>
            </Link>

            <Link href="/trainer-programs" className="action-button">
              <div className="action-button-icon">💪</div>
              <div className="action-button-title">Browse Programs</div>
              <div className="action-button-description">
                Explore trainer-created workouts
              </div>
            </Link>

            {user.is_trainer && (
              <Link href="/create-program" className="action-button">
                <div className="action-button-icon">✨</div>
                <div className="action-button-title">Create Program</div>
                <div className="action-button-description">
                  Design a new workout plan
                </div>
              </Link>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
