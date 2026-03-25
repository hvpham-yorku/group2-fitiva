'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { profileAPI, sessionAPI, rewardsAPI } from '@/library/api';
import Logo from '@/components/ui/Logo';
import SettingsModal from '@/components/ui/SettingsModal';
import './dashboard.css';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';


// ============================================================================
// TYPES
// ============================================================================

interface StatCard {
  icon: string;
  iconColor: 'blue' | 'green' | 'purple' | 'orange';
  label: string;
  value: string | number;
  subtext: string;
}

interface Program {
  id: number;
  name: string;
  trainer: number;
  is_deleted: boolean;
  created_at: string;
}

/** Trainer-owned exercise template (from /api/exercise-templates/) */
interface ExerciseTemplateSummary {
  id: number;
  name: string;
  description: string;
  created_at: string;
  is_default: boolean;
  trainer: number;
}

interface WorkoutHistorySession {
  id: number;
  date: string;
  plan_name?: string | null;
  duration_minutes?: number | null;
  notes?: string;
}

interface EarnedBadgeRow {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  earned_at: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const API_BASE_URL = 'http://localhost:8000/api';

const USER_STATS: StatCard[] = [
  {
    icon: '📊',
    iconColor: 'blue',
    label: 'Total Workouts',
    value: 0,
    subtext: 'Start your first workout today!',
  },
  {
    icon: '🔥',
    iconColor: 'green',
    label: 'Current Streak',
    value: '0 days',
    subtext: 'Build consistency!',
  },
  {
    icon: '⏱️',
    iconColor: 'purple',
    label: 'Total Time',
    value: '0 min',
    subtext: 'Every minute counts',
  },
  {
    icon: '🏆',
    iconColor: 'orange',
    label: 'Achievements',
    value: 0,
    subtext: 'Unlock your first badge!',
  },
];


// ============================================================================
// DARK MODE HOOK
// ============================================================================

function useDarkMode() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}


// ============================================================================
// CUSTOM CHART TOOLTIP
// ============================================================================

function ChartTooltip({
  active,
  payload,
  label,
  isDark,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  isDark: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, color: isDark ? '#f1f5f9' : '#1e293b', fontSize: '13px' }}>
        {label}
      </p>
      <p style={{ margin: '4px 0 0', color: isDark ? '#a78bfa' : '#7c3aed', fontSize: '13px' }}>
        {payload[0].value} min
      </p>
    </div>
  );
}


// ============================================================================
// COMPONENT
// ============================================================================

export default function DashboardPage() {
  const { user, logout, isLoading } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isDark = useDarkMode();

  // UI state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openStatDetail, setOpenStatDetail] = useState<
    | null
    | 'time'
    | 'workouts'
    | 'streak'
    | 'achievements'
    | 'programs_created'
    | 'exercises_created'
  >(null);

  // Profile state
  const [hasCompletedProfile, setHasCompletedProfile] = useState(false);
  const [profileLoading, setProfileLoading]           = useState(true);

  // Trainer stats state
  const [programsCount, setProgramsCount]             = useState(0);
  const [activeProgramsCount, setActiveProgramsCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [trainerProgramsList, setTrainerProgramsList] = useState<Program[]>([]);
  const [exercisesCount, setExercisesCount] = useState(0);
  const [exercisesLoading, setExercisesLoading] = useState(true);
  const [trainerExercisesList, setTrainerExercisesList] = useState<ExerciseTemplateSummary[]>([]);

  // Member workout history + stats
  const [historySessions, setHistorySessions] = useState<WorkoutHistorySession[]>([]);
  const [historyLoading, setHistoryLoading]   = useState(true);

  // US 4.1 / 4.2 – live badge count + earned list for Achievements detail modal
  const [achievementsCount, setAchievementsCount] = useState(0);
  const [earnedBadgesList, setEarnedBadgesList] = useState<EarnedBadgeRow[]>([]);

  const buildMonSunWeekData = (sessions: WorkoutHistorySession[]) => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const toLocalISODate = (dt: Date) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const anchor = sessions.length
      ? new Date(sessions.map(s => s.date).sort().slice(-1)[0] + 'T12:00:00')
      : new Date();

    const day = anchor.getDay();
    const diffToMonday = (day + 6) % 7;

    const monday = new Date(anchor);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(anchor.getDate() - diffToMonday);

    const minutesByDate = new Map<string, number>();
    for (const s of sessions) {
      const m = typeof s.duration_minutes === 'number' ? s.duration_minutes : 0;
      minutesByDate.set(s.date, (minutesByDate.get(s.date) ?? 0) + m);
    }

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = toLocalISODate(d);
      const minutes = minutesByDate.get(iso) ?? 0;
      week.push({ day: labels[i], minutes, iso });
    }

    return week;
  };

  const weeklyChartData = buildMonSunWeekData(historySessions);


  // ========================================
  // Effects
  // ========================================

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const profile = await profileAPI.getProfile();
        const isComplete =
        !!profile.experience_level &&
        !!profile.training_location &&
        (profile.fitness_focus?.length ?? 0) > 0;
        setHasCompletedProfile(isComplete);
      } catch {
        setHasCompletedProfile(false);
      } finally {
        setProfileLoading(false);
      }
    };
    checkProfile();
  }, []);

  // Fetch trainer stats (programs count + list for Programs Created modal)
  useEffect(() => {
  const fetchTrainerStats = async () => {
    if (!user?.is_trainer || !user?.id) {
      setStatsLoading(false);
      setTrainerProgramsList([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/programs/`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        // Handle paginated response
        const programs = Array.isArray(data) 
          ? data 
          : Array.isArray(data.results) 
            ? data.results 
            : [];
        
        // Count all programs created by current user (including deleted)
        const myPrograms = programs.filter(
          (p: Program) => String(p.trainer) === String(user.id)
        );
        
        // Count only active (non-deleted) programs
        const activePrograms = myPrograms.filter(
          (p: Program) => !p.is_deleted
        );
        
        setProgramsCount(myPrograms.length);
        setActiveProgramsCount(activePrograms.length);
        const sorted = [...myPrograms].sort((a, b) => {
          const ta = new Date(a.created_at).getTime();
          const tb = new Date(b.created_at).getTime();
          return tb - ta;
        });
        setTrainerProgramsList(sorted);
      } else {
        setTrainerProgramsList([]);
      }
    } catch (error) {
      console.error('Error fetching trainer stats:', error);
      setTrainerProgramsList([]);
    } finally {
      setStatsLoading(false);
    }
  };

    fetchTrainerStats();
    const onFocus = () => {
      if (user?.is_trainer && user?.id) fetchTrainerStats();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.id, user?.is_trainer]);

  // Trainer exercise templates (Exercises Created card + modal)
  useEffect(() => {
  const fetchTrainerExercises = async () => {
    if (!user?.is_trainer || !user?.id) {
      setTrainerExercisesList([]);
      setExercisesCount(0);
      setExercisesLoading(false);
      return;
    }
    setExercisesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/exercise-templates/`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        const raw = Array.isArray(data.exercises) ? data.exercises : [];
        const mine = raw.filter(
          (e: ExerciseTemplateSummary) =>
            !e.is_default && String(e.trainer) === String(user.id),
        );
        mine.sort((a: ExerciseTemplateSummary, b: ExerciseTemplateSummary) => {
          const ta = new Date(a.created_at).getTime();
          const tb = new Date(b.created_at).getTime();
          return tb - ta;
        });
        setTrainerExercisesList(mine);
        setExercisesCount(mine.length);
      } else {
        setTrainerExercisesList([]);
        setExercisesCount(0);
      }
    } catch {
      setTrainerExercisesList([]);
      setExercisesCount(0);
    } finally {
      setExercisesLoading(false);
    }
  };
    fetchTrainerExercises();
    const onFocus = () => {
      if (user?.is_trainer && user?.id) fetchTrainerExercises();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.id, user?.is_trainer]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) {
        setHistoryLoading(false);
        return;
      }

      setHistoryLoading(true);
      try {
        const data = await sessionAPI.getWorkoutHistory() as { total?: number; sessions?: WorkoutHistorySession[] };
        setHistorySessions(Array.isArray(data.sessions) ? data.sessions : []);
      } catch {
        setHistorySessions([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();

    const onFocus = () => {
      if (user) fetchHistory();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user]);

  // US 4.2 – badges for Achievements card + detail modal (members and trainers)
  useEffect(() => {
    const fetchBadges = async () => {
      if (!user) return;
      try {
        const data = await rewardsAPI.getBadges() as {
          total_earned: number;
          badges: Array<EarnedBadgeRow & { earned: boolean }>;
        };
        const earned = data.badges.filter((b) => b.earned);
        earned.sort((a, b) => {
          const ta = a.earned_at ? new Date(a.earned_at).getTime() : 0;
          const tb = b.earned_at ? new Date(b.earned_at).getTime() : 0;
          return tb - ta;
        });
        setEarnedBadgesList(earned);
        setAchievementsCount(data.total_earned);
      } catch {
        setEarnedBadgesList([]);
        setAchievementsCount(0);
      }
    };
    fetchBadges();
    const onFocus = () => {
      if (user) fetchBadges();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);


  // ========================================
  // Event Handlers
  // ========================================

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  const handleLogout   = async () => { setIsLoggingOut(true); setIsDropdownOpen(false); await logout(); };
  const openSettings   = () => { setIsDropdownOpen(false); setIsSettingsOpen(true); };


  // ========================================
  // Loading & Auth States
  // ========================================

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) return null;


  // ========================================
  // Render Helpers
  // ========================================

  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    || user.username[0].toUpperCase();

  const totalWorkouts = historySessions.length;

  const totalMinutes = historySessions.reduce((sum, s) => {
    const m = typeof s.duration_minutes === 'number' ? s.duration_minutes : 0;
    return sum + m;
  }, 0);

  const toLocalDateString = (d: Date) => {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getStreakInfo = (sessions: WorkoutHistorySession[]) => {
    const result = { count: 0, dates: [] as string[] };
    if (!sessions.length) return result;

    const dates      = Array.from(new Set(sessions.map(s => s.date))).sort().reverse();
    const today      = new Date();
    const todayLocal = toLocalDateString(today);
    const yesterday  = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayLocal = toLocalDateString(yesterday);

    let current: Date | null =
      dates[0] === todayLocal ? today : dates[0] === yesterdayLocal ? yesterday : null;
    if (!current) return result;

    for (const d of dates) {
      if (!current) break;
      const currentLocal = toLocalDateString(current);
      if (d === currentLocal) {
        result.count++;
        result.dates.push(d);
        current = new Date(current.getFullYear(), current.getMonth(), current.getDate() - 1);
      } else {
        break;
      }
    }
    return result;
  };

  const streakInfo    = getStreakInfo(historySessions);
  const currentStreak = streakInfo.count;

  const TRAINER_STATS: StatCard[] = [
    {
      icon: '📊',
      iconColor: 'blue',
      label: 'Programs Created',
      value: statsLoading ? '...' : programsCount,
      subtext: programsCount === 0 ? 'Create your first program!' : 'Keep building!',
    },
    {
      icon: '🏋️',
      iconColor: 'green',
      label: 'Exercises Created',
      value: exercisesLoading ? '...' : exercisesCount,
      subtext:
        exercisesCount === 0
          ? 'Create your first exercise!'
          : 'Build your exercise library',
    },
    {
      icon: '💪',
      iconColor: 'purple',
      label: 'Active Programs',
      value: statsLoading ? '...' : activeProgramsCount,
      subtext: 'Publish and share your work',
    },
    {
      icon: '🏆',
      iconColor: 'orange',
      label: 'Total Trainees',
      value: 0,
      subtext: 'See how many people follow your workouts!',
    },
    {
      icon: '📊',
      iconColor: 'blue',
      label: 'Total Workouts',
      value: historyLoading ? '...' : totalWorkouts,
      subtext: totalWorkouts === 0 ? 'Start your first workout today!' : 'Nice work—keep going!',
    },
    {
      icon: '🔥',
      iconColor: 'green',
      label: 'Current Streak',
      value: historyLoading ? '...' : `${currentStreak} days`,
      subtext: currentStreak === 0 ? 'Build consistency!' : 'Momentum looks good!',
    },
    {
      icon: '⏱️',
      iconColor: 'purple',
      label: 'Total Time',
      value: historyLoading ? '...' : `${totalMinutes} min`,
      subtext: 'Every minute counts',
    },
    {
      icon: '🏆',
      iconColor: 'orange',
      label: 'Achievements',
      value: achievementsCount,
      subtext:
        achievementsCount === 0
          ? 'Unlock your first badge!'
          : `${achievementsCount} badge${achievementsCount !== 1 ? 's' : ''} earned!`,
    },
  ];

  const MEMBER_STATS: StatCard[] = [
    {
      icon: '📊',
      iconColor: 'blue',
      label: 'Total Workouts',
      value: historyLoading ? '...' : totalWorkouts,
      subtext: totalWorkouts === 0 ? 'Start your first workout today!' : 'Nice work—keep going!',
    },
    {
      icon: '🔥',
      iconColor: 'green',
      label: 'Current Streak',
      value: historyLoading ? '...' : `${currentStreak} days`,
      subtext: currentStreak === 0 ? 'Build consistency!' : 'Momentum looks good!',
    },
    {
      icon: '⏱️',
      iconColor: 'purple',
      label: 'Total Time',
      value: historyLoading ? '...' : `${totalMinutes} min`,
      subtext: 'Every minute counts',
    },
    {
      icon: '🏆',
      iconColor: 'orange',
      label: 'Achievements',
      value: achievementsCount,
      subtext: achievementsCount === 0 ? 'Unlock your first badge!' : `${achievementsCount} badge${achievementsCount !== 1 ? 's' : ''} earned!`,
    },
  ];

  const stats = user.is_trainer ? TRAINER_STATS : MEMBER_STATS;


  // ========================================
  // Render
  // ========================================

  return (
    <div className="dashboard-container">

      {/* Header */}
      <header className="dashboard-header">
        <Link href="/" className="dashboard-logo-link" style={{ textDecoration: 'none' }}>
          <div className="dashboard-logo">
            <Logo variant="text" size="sm" />
          </div>
        </Link>

        <nav className="dashboard-nav">
          <div className="user-menu" ref={dropdownRef}>
            <button
              className="user-menu-trigger"
              onClick={toggleDropdown}
              aria-label="User menu"
              aria-expanded={isDropdownOpen}
            >
              <div className="user-avatar">{initials}</div>
              <div className="user-details">
                <div className="user-name">{user.first_name} {user.last_name}</div>
                <div className="user-email">{user.email}</div>
                <span className={`user-badge ${user.is_trainer ? 'trainer' : ''}`}>
                  {user.is_trainer ? 'Trainer' : 'Member'}
                </span>
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

            <div className={`user-menu-dropdown ${isDropdownOpen ? 'open' : ''}`}>
              <div className="dropdown-header">
                <div className="dropdown-user-name">{user.first_name} {user.last_name}</div>
                <div className="dropdown-user-email">{user.email}</div>
              </div>
              <ul className="dropdown-menu-items">
                <li>
                  <Link href="/" className="dropdown-menu-item" onClick={() => setIsDropdownOpen(false)}>
                    <span>Landing Page</span>
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className="dropdown-menu-item" onClick={() => setIsDropdownOpen(false)}>
                    <span>Profile</span>
                  </Link>
                </li>
                <li>
                  <button className="dropdown-menu-item" onClick={openSettings}>
                    <span>Settings</span>
                  </button>
                </li>
                <div className="dropdown-divider"></div>
                <li>
                  <button onClick={handleLogout} disabled={isLoggingOut} className="dropdown-menu-item danger">
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
          <h1 className="welcome-title">Welcome back, {user.first_name}! 👋</h1>
          <p className="welcome-subtitle">
            {user.is_trainer
              ? 'Ready to inspire and train your clients today?'
              : 'Ready to crush your fitness goals today?'}
          </p>
          <div className="welcome-message">
            <span className="welcome-icon">🎯</span>
            {user.is_trainer ? (
              <>
                <strong>Trainer Journey:</strong> Manage your workout programs, track client progress,
                and share your expertise with the Fitiva community.
              </>
            ) : (
              <>
                <strong>Your Fitness Journey:</strong> Complete your profile to get personalized workout
                recommendations tailored to your goals and experience level.
              </>
            )}
          </div>
        </section>

        {/* Stat Cards */}
        <section className="stats-grid">
          {stats.map((stat) => {
            const detailKey =
              stat.label === 'Total Time'
                ? 'time'
                : stat.label === 'Total Workouts'
                  ? 'workouts'
                  : stat.label === 'Current Streak'
                    ? 'streak'
                    : stat.label === 'Achievements'
                      ? 'achievements'
                      : stat.label === 'Programs Created'
                        ? 'programs_created'
                        : stat.label === 'Exercises Created'
                          ? 'exercises_created'
                          : null;
            const isClickable = detailKey !== null;
            const cardContent = (
              <>
                <div className={`stat-icon ${stat.iconColor}`}>{stat.icon}</div>
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-subtext">{stat.subtext}</div>
              </>
            );
            return isClickable && detailKey ? (
              <button
                key={stat.label}
                type="button"
                className="stat-card stat-card-clickable"
                onClick={() => setOpenStatDetail(detailKey)}
                aria-label={`View ${stat.label} details`}
              >
                {cardContent}
              </button>
            ) : (
              <div key={stat.label} className="stat-card">
                {cardContent}
              </div>
            );
          })}
        </section>

        {/* Stat Detail Modal */}
        {openStatDetail && (
          <div
            className="time-breakdown-overlay"
            onClick={() => setOpenStatDetail(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="stat-detail-title"
          >
            <div className="time-breakdown-content" onClick={(e) => e.stopPropagation()}>
              <div className="time-breakdown-header">
                <h2 id="stat-detail-title" className="time-breakdown-title">
                  {openStatDetail === 'time'     && 'Total Time'}
                  {openStatDetail === 'workouts' && 'Total Workouts'}
                  {openStatDetail === 'streak' && 'Current Streak'}
                  {openStatDetail === 'achievements' && 'Achievements'}
                  {openStatDetail === 'programs_created' && 'Programs Created'}
                  {openStatDetail === 'exercises_created' && 'Exercises Created'}
                </h2>
                <button
                  type="button"
                  className="time-breakdown-close"
                  onClick={() => setOpenStatDetail(null)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="time-breakdown-body">
                {openStatDetail === 'time' && (
                  historySessions.length === 0 ? (
                    <div className="time-breakdown-empty">
                      <p className="time-breakdown-empty-text">No completed workouts yet.</p>
                      <p className="time-breakdown-empty-sub">Complete workouts from your schedule to see your time breakdown here.</p>
                    </div>
                  ) : (
                    <>
                      <div className="time-breakdown-total">Total: {totalMinutes} min</div>
                      <ul className="time-breakdown-list">
                        {historySessions.map((s) => (
                          <li key={s.id} className="time-breakdown-row">
                            <span className="time-breakdown-date">
                              {new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', {
                                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                              })}
                            </span>
                            <span className="time-breakdown-plan">{s.plan_name || 'Workout'}</span>
                            <span className="time-breakdown-duration">
                              {typeof s.duration_minutes === 'number' ? `${s.duration_minutes} min` : '—'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )
                )}
                {openStatDetail === 'workouts' && (
                  historySessions.length === 0 ? (
                    <div className="time-breakdown-empty">
                      <p className="time-breakdown-empty-text">No completed workouts yet.</p>
                      <p className="time-breakdown-empty-sub">Complete workouts from your schedule to see them here.</p>
                    </div>
                  ) : (
                    <ul className="time-breakdown-list">
                      {historySessions.map((s) => (
                        <li key={s.id} className="time-breakdown-row">
                          <span className="time-breakdown-date">
                            {new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', {
                              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </span>
                          <span className="time-breakdown-plan">{s.plan_name || 'Workout'}</span>
                          <span className="time-breakdown-duration">
                            {typeof s.duration_minutes === 'number' ? `${s.duration_minutes} min` : '—'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )
                )}
                {openStatDetail === 'streak' && (
                  <>
                    <div className="time-breakdown-total">
                      {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
                    </div>
                    <p className="time-breakdown-streak-explanation">
                      Current streak is the number of consecutive days you worked out, including today or
                      yesterday. If your most recent workout was more than one day ago, the streak resets to zero.
                    </p>
                    {currentStreak === 0 ? (
                      <div className="time-breakdown-empty">
                        <p className="time-breakdown-empty-text">No active streak</p>
                        <p className="time-breakdown-empty-sub">Let&apos;s build a streak together—work out today!</p>
                      </div>
                    ) : (
                      <ul className="time-breakdown-list">
                        {streakInfo.dates.map((dateStr) => (
                          <li key={dateStr} className="time-breakdown-row time-breakdown-row-single">
                            <span className="time-breakdown-date">
                              {new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
                                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                              })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
                {openStatDetail === 'programs_created' && (
                  <>
                    {trainerProgramsList.length === 0 ? (
                      <div className="time-breakdown-empty">
                        <p className="time-breakdown-empty-text">No programs yet.</p>
                        <p className="time-breakdown-empty-sub">
                          Create a workout program to see it listed here.
                        </p>
                        <Link href="/create-program" className="dashboard-stat-detail-link">
                          Create a program
                        </Link>
                      </div>
                    ) : (
                      <>
                        <div className="time-breakdown-total">
                          {trainerProgramsList.length} program
                          {trainerProgramsList.length !== 1 ? 's' : ''} total
                          {' '}
                          ({activeProgramsCount} active)
                        </div>
                        <ul className="stat-detail-program-list">
                          {trainerProgramsList.map((p) => (
                            <li key={p.id}>
                              <Link
                                href={`/program/${p.id}`}
                                className="stat-detail-program-link"
                                onClick={() => setOpenStatDetail(null)}
                              >
                                <span className="stat-detail-program-name">{p.name}</span>
                                <span className="stat-detail-program-meta">
                                  {p.is_deleted ? (
                                    <span className="stat-detail-program-badge">Archived</span>
                                  ) : null}
                                  <span className="stat-detail-program-date">
                                    {new Date(p.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })}
                                  </span>
                                  <span className="stat-detail-program-chevron" aria-hidden>
                                    →
                                  </span>
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <div className="stat-detail-badge-footer">
                          <Link
                            href="/trainer-programs"
                            className="dashboard-stat-detail-link"
                            onClick={() => setOpenStatDetail(null)}
                          >
                            View all in Trainer Programs
                          </Link>
                        </div>
                      </>
                    )}
                  </>
                )}
                {openStatDetail === 'exercises_created' && (
                  <>
                    {trainerExercisesList.length === 0 ? (
                      <div className="time-breakdown-empty">
                        <p className="time-breakdown-empty-text">No custom exercises yet.</p>
                        <p className="time-breakdown-empty-sub">
                          Add exercises to reuse them when you build programs.
                        </p>
                        <Link href="/add-exercise" className="dashboard-stat-detail-link">
                          Add exercise
                        </Link>
                      </div>
                    ) : (
                      <>
                        <div className="time-breakdown-total">
                          {trainerExercisesList.length} exercise
                          {trainerExercisesList.length !== 1 ? 's' : ''} in your library
                        </div>
                        <ul className="stat-detail-program-list">
                          {trainerExercisesList.map((ex) => (
                            <li key={ex.id}>
                              <Link
                                href={`/add-exercise?edit=${ex.id}`}
                                className="stat-detail-program-link"
                                onClick={() => setOpenStatDetail(null)}
                              >
                                <span className="stat-detail-program-name">{ex.name}</span>
                                <span className="stat-detail-program-meta">
                                  <span className="stat-detail-program-date">
                                    {new Date(ex.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })}
                                  </span>
                                  <span className="stat-detail-program-chevron" aria-hidden>
                                    →
                                  </span>
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <div className="stat-detail-badge-footer">
                          <Link
                            href="/add-exercise"
                            className="dashboard-stat-detail-link"
                            onClick={() => setOpenStatDetail(null)}
                          >
                            Open exercise library
                          </Link>
                        </div>
                      </>
                    )}
                  </>
                )}
                {openStatDetail === 'achievements' && (
                  <>
                    {earnedBadgesList.length === 0 ? (
                      <div className="time-breakdown-empty">
                        <p className="time-breakdown-empty-text">No badges earned yet.</p>
                        <p className="time-breakdown-empty-sub">
                          Complete workouts from your schedule to unlock achievement badges.
                        </p>
                        <Link href="/schedule" className="dashboard-stat-detail-link">
                          Go to Schedule
                        </Link>
                      </div>
                    ) : (
                      <>
                        <div className="time-breakdown-total">
                          {earnedBadgesList.length} badge{earnedBadgesList.length !== 1 ? 's' : ''} earned
                        </div>
                        <p className="time-breakdown-streak-explanation">
                          Badges reward milestones and streaks. Open the gallery for the full list including locked badges.
                        </p>
                        <ul className="stat-detail-badge-list">
                          {earnedBadgesList.map((b) => (
                            <li key={b.badge_id} className="stat-detail-badge-item">
                              <span className="stat-detail-badge-icon" aria-hidden>
                                {b.icon}
                              </span>
                              <div className="stat-detail-badge-text">
                                <span className="stat-detail-badge-name">{b.name}</span>
                                <span className="stat-detail-badge-desc">{b.description}</span>
                              </div>
                              {b.earned_at && (
                                <span className="stat-detail-badge-date">
                                  {new Date(b.earned_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                        <div className="stat-detail-badge-footer">
                          <Link href="/rewards" className="dashboard-stat-detail-link">
                            Open achievement gallery
                          </Link>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Weekly Activity Chart — shown for both trainers and members */}
        <section className="dashboard-trends-section">
          <h2 className="section-title">Weekly Activity</h2>
          <div className="dashboard-chart-card">
            {historyLoading ? (
              <p className="dashboard-chart-loading">Loading...</p>
            ) : historySessions.length === 0 ? (
              <div className="dashboard-chart-empty">
                <p className="dashboard-chart-empty-title">No completed workouts yet</p>
                <p className="dashboard-chart-empty-text">
                  Complete a workout from your schedule to see your activity here.
                </p>
                <Link href="/schedule" className="dashboard-chart-empty-link">Go to Schedule</Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyChartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickMargin={8} />
                  <YAxis
                    tickMargin={8}
                    label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
                    domain={[0, 'auto']}
                  />
                  <Tooltip content={<ChartTooltip isDark={isDark} />} />
                  <Line type="monotone" dataKey="minutes" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="quick-actions">
          <h2 className="section-title">Quick Actions</h2>
          <div className="action-buttons">
            {!hasCompletedProfile && (
              <Link href="/profile" className="action-button">
                <div className="action-button-icon">👤</div>
                <div className="action-button-title">Complete Profile</div>
                <div className="action-button-description">
                  Add your fitness details to get started
                </div>
              </Link>
            )}

            <Link href="/trainer-programs" className="action-button">
              <div className="action-button-icon">💪</div>
              <div className="action-button-title">Browse Programs</div>
              <div className="action-button-description">Explore trainer-created workouts</div>
            </Link>

            {user.is_trainer ? (
              <>
                <Link href="/add-exercise" className="action-button">
                  <div className="action-button-icon">🏋️</div>
                  <div className="action-button-title">Add Exercise</div>
                  <div className="action-button-description">Create exercises for your programs</div>
                </Link>
                <Link href="/create-program" className="action-button">
                  <div className="action-button-icon">✨</div>
                  <div className="action-button-title">Create Program</div>
                  <div className="action-button-description">Design a new workout plan</div>
                </Link>
                <Link href="/recommendations" className="action-button">
                  <div className="action-button-icon">🎯</div>
                  <div className="action-button-title">View Recommendations</div>
                  <div className="action-button-description">Discover workout plans tailored for you</div>
                </Link>
                <Link href="/rewards" className="action-button">
                  <div className="action-button-icon">🏆</div>
                  <div className="action-button-title">My Rewards</div>
                  <div className="action-button-description">
                    View your points and achievement badges
                  </div>
                </Link>
              </>
            ) : (
              <>
                <Link href="/recommendations" className="action-button">
                  <div className="action-button-icon">🎯</div>
                  <div className="action-button-title">View Recommendations</div>
                  <div className="action-button-description">Discover workout plans for you</div>
                </Link>
                <Link href="/rewards" className="action-button">
                  <div className="action-button-icon">🏆</div>
                  <div className="action-button-title">My Rewards</div>
                  <div className="action-button-description">
                    View your points and achievement badges
                  </div>
                </Link>
              </>
            )}

            <Link href="/schedule" className="action-button">
              <div className="action-button-icon">📅</div>
              <div className="action-button-title">My Workout Schedule</div>
              <div className="action-button-description">View and manage your personalized calendar</div>
            </Link>
          </div>
        </section>

      </main>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
