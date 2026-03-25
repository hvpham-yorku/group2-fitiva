'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { rewardsAPI } from '@/library/api';
import './rewards.css';

// TYPES

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

// US 4.3 – gallery sort modes 
type GallerySortMode = 'date_desc' | 'date_asc' | 'category';

function formatCategoryLabel(category: string): string {
  if (!category) return '';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function sortEarnedBadges(badges: Badge[], mode: GallerySortMode): Badge[] {
  const arr = [...badges];
  if (mode === 'category') {
    return arr.sort((a, b) => {
      const c = a.category.localeCompare(b.category);
      if (c !== 0) return c;
      return a.name.localeCompare(b.name);
    });
  }
  if (mode === 'date_asc') {
    return arr.sort((a, b) => {
      const ta = a.earned_at ? new Date(a.earned_at).getTime() : 0;
      const tb = b.earned_at ? new Date(b.earned_at).getTime() : 0;
      return ta - tb;
    });
  }
  return arr.sort((a, b) => {
    const ta = a.earned_at ? new Date(a.earned_at).getTime() : 0;
    const tb = b.earned_at ? new Date(b.earned_at).getTime() : 0;
    return tb - ta;
  });
}

// Locked badges have no unlock date – we use category + name when sorting by category
function sortLockedBadges(badges: Badge[], mode: GallerySortMode): Badge[] {
  const arr = [...badges];
  if (mode === 'category') {
    return arr.sort((a, b) => {
      const c = a.category.localeCompare(b.category);
      if (c !== 0) return c;
      return a.name.localeCompare(b.name);
    });
  }
  return arr.sort((a, b) => a.badge_id.localeCompare(b.badge_id));
}

// COMPONENT

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

  // Achievement gallery sort
  const [gallerySort, setGallerySort] = useState<GallerySortMode>('date_desc');

  // Data fetching

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


  // Derived values
  const earnedBadges = badges.filter(b => b.earned);
  const lockedBadges = badges.filter(b => !b.earned);

  const sortedEarnedBadges = useMemo(
    () => sortEarnedBadges(badges.filter((b) => b.earned), gallerySort),
    [badges, gallerySort],
  );
  const sortedLockedBadges = useMemo(
    () => sortLockedBadges(badges.filter((b) => !b.earned), gallerySort),
    [badges, gallerySort],
  );

  // Render

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
              Welcome back, {user.first_name}! Earn points, unlock badges, and browse your achievement gallery.
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

          {/* BADGES TAB – US 4.2 + US 4.3 Achievement gallery */}
          {activeTab === 'badges' && (
            <div className="rewards-tab-content">
              {badgesLoading ? (
                <p className="rewards-loading-text">Loading badges...</p>
              ) : (
                <>
                  <div className="rewards-gallery-intro">
                    <h2 className="rewards-gallery-title">Achievement gallery</h2>
                    <p className="rewards-gallery-lead">
                      Every badge you&apos;ve earned and what&apos;s still locked—with descriptions
                      so you can track accomplishments over time.
                    </p>
                    <div className="rewards-gallery-sort">
                      <label htmlFor="rewards-gallery-sort" className="rewards-gallery-sort-label">
                        Sort by
                      </label>
                      <select
                        id="rewards-gallery-sort"
                        className="rewards-gallery-sort-select"
                        value={gallerySort}
                        onChange={(e) =>
                          setGallerySort(e.target.value as GallerySortMode)
                        }
                        aria-describedby="rewards-gallery-sort-hint"
                      >
                        <option value="date_desc">Date (newest first)</option>
                        <option value="date_asc">Date (oldest first)</option>
                        <option value="category">Category</option>
                      </select>
                    </div>
                    <p id="rewards-gallery-sort-hint" className="rewards-gallery-sort-hint">
                      {gallerySort === 'category'
                        ? 'Badges are ordered by category (e.g. milestone, streak), then by name.'
                        : 'Earned badges are ordered by unlock date. Locked badges use a fixed order (no unlock date yet).'}
                    </p>
                  </div>

                  <div className="rewards-card">
                    <div className="rewards-card-header">
                      <h2 className="rewards-card-title">Earned badges</h2>
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
                        {sortedEarnedBadges.map((badge) => (
                          <div
                            key={badge.badge_id}
                            className="rewards-badge-card rewards-badge-earned"
                          >
                            <div className="rewards-badge-icon">{badge.icon}</div>
                            <span className="rewards-badge-category-chip">
                              {formatCategoryLabel(badge.category)}
                            </span>
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
                      <h2 className="rewards-card-title">Locked badges</h2>
                      <p className="rewards-locked-hint">
                        Not earned yet—shown greyed out. Requirements are listed on each card.
                      </p>
                      <div className="rewards-badge-grid">
                        {sortedLockedBadges.map((badge) => (
                          <div
                            key={badge.badge_id}
                            className="rewards-badge-card rewards-badge-locked"
                          >
                            <div className="rewards-badge-icon rewards-badge-icon-locked">
                              {badge.icon}
                            </div>
                            <span className="rewards-badge-category-chip rewards-badge-category-chip-locked">
                              {formatCategoryLabel(badge.category)}
                            </span>
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
