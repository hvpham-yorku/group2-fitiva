'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { rewardsAPI } from '@/library/api';
import './rewards.css';

// ============================================================================
// TYPES
// ============================================================================

interface Transaction {
  id: number;
  points_awarded: number;
  reason: string;
  created_at: string;
}

interface Badge {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  earned: boolean;
  earned_at: string | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function RewardsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Points state – US 4.1
  const [totalPoints, setTotalPoints]     = useState(0);
  const [transactions, setTransactions]   = useState<Transaction[]>([]);
  const [pointsLoading, setPointsLoading] = useState(true);

  // Badges state – US 4.2
  const [badges, setBadges]               = useState<Badge[]>([]);
  const [totalEarned, setTotalEarned]     = useState(0);
  const [badgesLoading, setBadgesLoading] = useState(true);

  // Active tab
  const [activeTab, setActiveTab] = useState<'points' | 'badges'>('points');

  // ========================================
  // Data fetching
  // ========================================

  useEffect(() => {
    const loadPoints = async () => {
      try {
        const data = await rewardsAPI.getPoints() as {
          total_points: number;
          transactions: Transaction[];
        };
        setTotalPoints(data.total_points);
        setTransactions(data.transactions);
      } catch {
        // user just has 0 points – that is fine
      } finally {
        setPointsLoading(false);
      }
    };

    const loadBadges = async () => {
      try {
        const data = await rewardsAPI.getBadges() as {
          total_earned: number;
          badges: Badge[];
        };
        setBadges(data.badges);
        setTotalEarned(data.total_earned);
      } catch {
        // silently ignore
      } finally {
        setBadgesLoading(false);
      }
    };

    loadPoints();
    loadBadges();
  }, []);

  // ========================================
  // Derived values
  // ========================================

  const earnedBadges = badges.filter(b => b.earned);
  const lockedBadges = badges.filter(b => !b.earned);

  // ========================================
  // Render
  // ========================================

  return (
    <ProtectedRoute>
      <div className="rewards-container">

        {/* Header – same pattern as trainer-programs and recommendations */}
        <div className="rewards-page-header">
          <button
            className="back-button"
            onClick={() => router.push('/dashboard')}
          >
            Back to Dashboard
          </button>
          <h1>My Rewards</h1>
          {user && (
            <p className="rewards-header-sub">
              Welcome back, {user.first_name}! Keep completing workouts to earn points and unlock badges.
            </p>
          )}
        </div>

        <div className="rewards-content">

          {/* Summary bar */}
          <div className="rewards-summary-bar">
            <div className="rewards-summary-card">
              <div className="rewards-summary-icon">STAR</div>
              <div className="rewards-summary-value">
                {pointsLoading ? '...' : totalPoints.toLocaleString()}
              </div>
              <div className="rewards-summary-label">Total Points</div>
            </div>
            <div className="rewards-summary-divider" />
            <div className="rewards-summary-card">
              <div className="rewards-summary-icon">MED</div>
              <div className="rewards-summary-value">
                {badgesLoading ? '...' : totalEarned}
              </div>
              <div className="rewards-summary-label">Badges Earned</div>
            </div>
            <div className="rewards-summary-divider" />
            <div className="rewards-summary-card">
              <div className="rewards-summary-icon">LOCK</div>
              <div className="rewards-summary-value">
                {badgesLoading ? '...' : lockedBadges.length}
              </div>
              <div className="rewards-summary-label">Badges Locked</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="rewards-tabs">
            <button
              className={`rewards-tab${activeTab === 'points' ? ' active' : ''}`}
              onClick={() => setActiveTab('points')}
            >
              Points
            </button>
            <button
              className={`rewards-tab${activeTab === 'badges' ? ' active' : ''}`}
              onClick={() => setActiveTab('badges')}
            >
              Badges
            </button>
          </div>

          {/* POINTS TAB – US 4.1 */}
          {activeTab === 'points' && (
            <div className="rewards-tab-content">

              <div className="rewards-points-card">
                <div className="rewards-points-card-left">
                  <div className="rewards-points-icon">&#11088;</div>
                  <div>
                    <div className="rewards-points-label">Total Points</div>
                    <div className="rewards-points-value">
                      {pointsLoading ? '...' : totalPoints.toLocaleString()}
                    </div>
                    <div className="rewards-points-subtext">
                      Earned from completing workouts
                    </div>
                  </div>
                </div>
                <Link href="/schedule" className="rewards-points-cta">
                  Start Workout
                </Link>
              </div>

              <div className="rewards-card">
                <h2 className="rewards-card-title">How Points Work</h2>
                <div className="rewards-how-grid">
                  <div className="rewards-how-card">
                    <div className="rewards-how-title">Complete a Workout</div>
                    <div className="rewards-how-desc">
                      +10 base points every time you finish a session
                    </div>
                  </div>
                  <div className="rewards-how-card">
                    <div className="rewards-how-title">Long Session Bonus</div>
                    <div className="rewards-how-desc">
                      +5 extra points for sessions 45 min or longer
                    </div>
                  </div>
                  <div className="rewards-how-card">
                    <div className="rewards-how-title">Streak Bonus</div>
                    <div className="rewards-how-desc">
                      +2 points per consecutive day, up to 30 days
                    </div>
                  </div>
                </div>
              </div>

              <div className="rewards-card">
                <h2 className="rewards-card-title">Points History</h2>
                {pointsLoading ? (
                  <p className="rewards-loading-text">Loading...</p>
                ) : transactions.length === 0 ? (
                  <div className="rewards-empty-state">
                    <p className="rewards-empty-title">No points yet</p>
                    <p className="rewards-empty-text">
                      Complete a workout from your schedule to earn your first points!
                    </p>
                    <Link href="/schedule" className="rewards-empty-link">
                      Go to Schedule
                    </Link>
                  </div>
                ) : (
                  <ul className="rewards-transaction-list">
                    {transactions.map((t) => (
                      <li key={t.id} className="rewards-transaction-row">
                        <div className="rewards-transaction-info">
                          <span className="rewards-transaction-reason">{t.reason}</span>
                          <span className="rewards-transaction-date">
                            {new Date(t.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day:   'numeric',
                              year:  'numeric',
                            })}
                          </span>
                        </div>
                        <span className="rewards-transaction-pts">
                          +{t.points_awarded} pts
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </div>
          )}

          {/* BADGES TAB – US 4.2 */}
          {activeTab === 'badges' && (
            <div className="rewards-tab-content">
              {badgesLoading ? (
                <p className="rewards-loading-text">Loading badges...</p>
              ) : (
                <>
                  <div className="rewards-card">
                    <div className="rewards-card-header">
                      <h2 className="rewards-card-title">Earned Badges</h2>
                      <span className="rewards-badge-count-chip">
                        {earnedBadges.length} / {badges.length}
                      </span>
                    </div>

                    {earnedBadges.length === 0 ? (
                      <div className="rewards-empty-state">
                        <p className="rewards-empty-title">No badges yet</p>
                        <p className="rewards-empty-text">
                          Complete your first workout to unlock your first badge!
                        </p>
                        <Link href="/schedule" className="rewards-empty-link">
                          Go to Schedule
                        </Link>
                      </div>
                    ) : (
                      <div className="rewards-badge-grid">
                        {earnedBadges.map((badge) => (
                          <div
                            key={badge.badge_id}
                            className="rewards-badge-card rewards-badge-earned"
                          >
                            <div className="rewards-badge-icon">{badge.icon}</div>
                            <div className="rewards-badge-name">{badge.name}</div>
                            <div className="rewards-badge-desc">{badge.description}</div>
                            {badge.earned_at && (
                              <div className="rewards-badge-date">
                                {'Earned '}
                                {new Date(badge.earned_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day:   'numeric',
                                  year:  'numeric',
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {lockedBadges.length > 0 && (
                    <div className="rewards-card">
                      <h2 className="rewards-card-title">Locked Badges</h2>
                      <div className="rewards-badge-grid">
                        {lockedBadges.map((badge) => (
                          <div
                            key={badge.badge_id}
                            className="rewards-badge-card rewards-badge-locked"
                          >
                            <div className="rewards-badge-icon rewards-badge-icon-locked">
                              {badge.icon}
                            </div>
                            <div className="rewards-badge-name rewards-badge-name-locked">
                              {badge.name}
                            </div>
                            <div className="rewards-badge-desc">{badge.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
