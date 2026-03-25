'use client';

import { useMemo, useState, useEffect } from 'react';
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

/** US 4.3 – how the achievement gallery is ordered */
type GallerySort = 'date_newest' | 'category' | 'name';

function formatCategoryLabel(category: string): string {
  if (!category) return 'Other';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/** Group badges by category; within each group: earned (newest first) then locked (by name). */
function groupBadgesByCategory(all: Badge[]): { category: string; badges: Badge[] }[] {
  const map = new Map<string, Badge[]>();
  for (const b of all) {
    const key = b.category || 'other';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(b);
  }
  const keys = [...map.keys()].sort((a, b) => a.localeCompare(b));
  return keys.map((category) => {
    const group = map.get(category)!;
    const earned = group
      .filter((b) => b.earned)
      .sort((a, b) => (b.earned_at || '').localeCompare(a.earned_at || ''));
    const locked = group
      .filter((b) => !b.earned)
      .sort((a, b) => a.name.localeCompare(b.name));
    return { category, badges: [...earned, ...locked] };
  });
}

/** Flat list: earned by date (newest first), then locked by category + name. */
function sortBadgesByDate(all: Badge[]): Badge[] {
  const earned = all
    .filter((b) => b.earned)
    .sort((a, b) => (b.earned_at || '').localeCompare(a.earned_at || ''));
  const locked = all
    .filter((b) => !b.earned)
    .sort(
      (a, b) =>
        (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name),
    );
  return [...earned, ...locked];
}

/** Earned first (by date), then locked, all alphabetically by name within each band. */
function sortBadgesByName(all: Badge[]): Badge[] {
  const earned = all
    .filter((b) => b.earned)
    .sort((a, b) => a.name.localeCompare(b.name));
  const locked = all.filter((b) => !b.earned).sort((a, b) => a.name.localeCompare(b.name));
  return [...earned, ...locked];
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

  // US 4.3 – gallery sort
  const [gallerySort, setGallerySort] = useState<GallerySort>('date_newest');

  // Active tab (gallery = US 4.3 achievement gallery)
  const [activeTab, setActiveTab] = useState<'points' | 'gallery'>('points');

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

  const earnedBadges = badges.filter((b) => b.earned);
  const lockedBadges = badges.filter((b) => !b.earned);

  const galleryByCategory = useMemo(() => groupBadgesByCategory(badges), [badges]);
  const galleryByDate = useMemo(() => sortBadgesByDate(badges), [badges]);
  const galleryByName = useMemo(() => sortBadgesByName(badges), [badges]);

  function renderBadgeTile(badge: Badge) {
    const earned = badge.earned;
    return (
      <div
        key={badge.badge_id}
        className={`rewards-badge-card ${earned ? 'rewards-badge-earned' : 'rewards-badge-locked'}`}
      >
        <div className={`rewards-badge-icon ${earned ? '' : 'rewards-badge-icon-locked'}`}>
          {badge.icon}
        </div>
        <div className={`rewards-badge-name ${earned ? '' : 'rewards-badge-name-locked'}`}>
          {badge.name}
        </div>
        <div className="rewards-badge-desc">{badge.description}</div>
        {!earned && <span className="rewards-badge-locked-pill">Locked</span>}
        {earned && badge.earned_at && (
          <div className="rewards-badge-date">
            Earned{' '}
            {new Date(badge.earned_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        )}
      </div>
    );
  }

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
              Welcome back, {user.first_name}! Track points, then browse your{' '}
              <strong>achievement gallery</strong>—earned and locked badges in one place.
            </p>
          )}
        </div>

        <div className={`rewards-content${activeTab === 'gallery' ? ' rewards-content--gallery' : ''}`}>

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
              type="button"
              className={`rewards-tab${activeTab === 'points' ? ' active' : ''}`}
              onClick={() => setActiveTab('points')}
            >
              Points
            </button>
            <button
              type="button"
              className={`rewards-tab${activeTab === 'gallery' ? ' active' : ''}`}
              onClick={() => setActiveTab('gallery')}
            >
              Achievement gallery
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

          {/* ACHIEVEMENT GALLERY – US 4.3 (builds on US 4.2 badge data) */}
          {activeTab === 'gallery' && (
            <div className="rewards-tab-content rewards-gallery-tab">
              {badgesLoading ? (
                <p className="rewards-loading-text">Loading achievement gallery...</p>
              ) : badges.length === 0 ? (
                <div className="rewards-card">
                  <div className="rewards-empty-state">
                    <p className="rewards-empty-title">No badges to show yet</p>
                    <p className="rewards-empty-text">
                      Complete a workout to start unlocking achievements.
                    </p>
                    <Link href="/schedule" className="rewards-empty-link">
                      Go to Schedule
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <p className="rewards-gallery-lead">
                    Every badge in one gallery. <strong>Earned</strong> badges are highlighted;{' '}
                    <strong>Locked</strong> ones are greyed out until you hit the milestone.
                  </p>

                  <div className="rewards-card rewards-gallery-toolbar-card">
                    <div className="rewards-gallery-toolbar">
                      <div className="rewards-gallery-toolbar-text">
                        <span className="rewards-gallery-progress">
                          {earnedBadges.length} earned · {lockedBadges.length} locked · {badges.length}{' '}
                          total
                        </span>
                      </div>
                      <label className="rewards-gallery-sort-label" htmlFor="gallery-sort">
                        Sort by
                        <select
                          id="gallery-sort"
                          className="rewards-gallery-sort-select"
                          value={gallerySort}
                          onChange={(e) => setGallerySort(e.target.value as GallerySort)}
                          aria-label="Sort achievement gallery"
                        >
                          <option value="date_newest">Date earned (newest first)</option>
                          <option value="category">Category</option>
                          <option value="name">Name (A–Z)</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  {gallerySort === 'category' ? (
                    <div className="rewards-gallery-sections">
                      {galleryByCategory.map(({ category, badges: group }) => (
                        <div key={category} className="rewards-card rewards-gallery-category-block">
                          <h2 className="rewards-gallery-category-title">
                            {formatCategoryLabel(category)}
                          </h2>
                          <p className="rewards-gallery-category-sub">
                            {group.filter((b) => b.earned).length} earned in this category
                          </p>
                          <div className="rewards-badge-grid rewards-badge-grid--gallery">
                            {group.map((badge) => renderBadgeTile(badge))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rewards-card rewards-gallery-unified">
                      <h2 className="rewards-card-title rewards-gallery-unified-title">
                        {gallerySort === 'date_newest'
                          ? 'Timeline (newest unlocks first)'
                          : 'All badges A–Z'}
                      </h2>
                      <div className="rewards-badge-grid rewards-badge-grid--gallery">
                        {(gallerySort === 'date_newest' ? galleryByDate : galleryByName).map(
                          (badge) => renderBadgeTile(badge),
                        )}
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
