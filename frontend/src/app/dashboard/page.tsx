'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { profileAPI, sessionAPI, rewardsAPI, challengeAPI  } from '@/library/api';
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

interface TrainerExerciseRow {
  id: number;
  name: string;
  description: string;
  created_at: string;
}
interface WorkoutHistorySession {
  id: number;
  date: string;                 // "YYYY-MM-DD"
  plan_name?: string | null;
  duration_minutes?: number | null;
  notes?: string;
}

interface MyChallenge {
  id: number;
  challenge_name: string;
  challenge_description?: string;
  current_progress: Record<string, number>;
  is_completed: boolean;
  completed_at: string | null;
  progress_percent: number;
}

interface EarnedBadgeSummary {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
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
// COMPONENT
// ============================================================================

export default function DashboardPage() {
  const { user, logout, isLoading } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
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
    | 'active_programs'
    | 'total_trainees'
  >(null);

  // Profile state
  const [hasCompletedProfile, setHasCompletedProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // Trainer stats state
  const [programsCount, setProgramsCount] = useState(0);
  const [activeProgramsCount, setActiveProgramsCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [trainerProgramsList, setTrainerProgramsList] = useState<Program[]>([]);
  const [trainerExercisesList, setTrainerExercisesList] = useState<TrainerExerciseRow[]>([]);
  const [traineeCount, setTraineeCount] = useState(0);

    // Member workout history + stats
  const [historySessions, setHistorySessions] = useState<WorkoutHistorySession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // US 4.1 / 4.2 – live badge count for the Achievements card
  const [achievementsCount, setAchievementsCount] = useState(0);
  const [earnedBadgesList, setEarnedBadgesList] = useState<EarnedBadgeSummary[]>([]);
  // Member challenges (US 4.4)
  const [myChallenges, setMyChallenges] = useState<MyChallenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(true);

const buildMonSunWeekData = (sessions: WorkoutHistorySession[]) => {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toLocalISODate = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // ✅ Anchor week to latest session date if we have any
  const anchor = sessions.length
    ? new Date(sessions.map(s => s.date).sort().slice(-1)[0] + "T12:00:00")
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

  // Check if user has completed their profile
  useEffect(() => {
    const checkProfile = async () => {
      try {
        const profile = await profileAPI.getProfile();
        setHasCompletedProfile(!!profile.age);
      } catch {
        setHasCompletedProfile(false);
      } finally {
        setProfileLoading(false);
      }
    };

    checkProfile();
  }, []);

// Fetch trainer stats: programs, custom exercises, trainee count
  useEffect(() => {
    const fetchTrainerStats = async () => {
      if (!user?.is_trainer || !user?.id) {
        setStatsLoading(false);
        setTrainerProgramsList([]);
        setTrainerExercisesList([]);
        setTraineeCount(0);
        setProgramsCount(0);
        setActiveProgramsCount(0);
        return;
      }

      setStatsLoading(true);
      try {
        const [programsRes, exercisesRes, traineesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/programs/`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/exercise-templates/`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/trainer/trainee-count/`, { credentials: 'include' }),
        ]);

        if (programsRes.ok) {
          const data = await programsRes.json();
          const programs = Array.isArray(data)
            ? data
            : Array.isArray(data.results)
              ? data.results
              : [];
          const myPrograms = programs.filter(
            (p: Program) => String(p.trainer) === String(user.id)
          );
          const activePrograms = myPrograms.filter((p: Program) => !p.is_deleted);
          setProgramsCount(myPrograms.length);
          setActiveProgramsCount(activePrograms.length);
          setTrainerProgramsList(
            [...myPrograms].sort(
              (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
          );
        } else {
          setProgramsCount(0);
          setActiveProgramsCount(0);
          setTrainerProgramsList([]);
        }

        if (exercisesRes.ok) {
          const exData = await exercisesRes.json();
          const raw = Array.isArray(exData.exercises) ? exData.exercises : [];
          const own = raw
            .filter((e: { is_default?: boolean }) => !e.is_default)
            .map((e: { id: number; name: string; description?: string; created_at: string }) => ({
              id: e.id,
              name: e.name,
              description: e.description || '',
              created_at: e.created_at,
            }))
            .sort(
              (a: TrainerExerciseRow, b: TrainerExerciseRow) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          setTrainerExercisesList(own);
        } else {
          setTrainerExercisesList([]);
        }

        if (traineesRes.ok) {
          const t = await traineesRes.json();
          setTraineeCount(typeof t.trainee_count === 'number' ? t.trainee_count : 0);
        } else {
          setTraineeCount(0);
        }
      } catch (error) {
        console.error('Error fetching trainer stats:', error);
        setTrainerProgramsList([]);
        setTrainerExercisesList([]);
        setTraineeCount(0);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchTrainerStats();
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

  useEffect(() => {
  const fetchChallenges = async () => {
    if (!user) return;
    setChallengesLoading(true);
    try {
      const data = await challengeAPI.getMyChallenges();
      setMyChallenges(data);
    } catch {
      setMyChallenges([]);
    } finally {
      setChallengesLoading(false);
    }
  };
  fetchChallenges();
  const onFocus = () => user && fetchChallenges();
  window.addEventListener('focus', onFocus);
  return () => window.removeEventListener('focus', onFocus);
}, [user]);

const handleLeaveChallenge = async (challengeId: number) => {
    if (!window.confirm("Are you sure you want to remove this challenge?")) return;
    
    try {
      await challengeAPI.leaveChallenge(challengeId);
      // Immediately remove it from the screen without needing to refresh
      setMyChallenges(prev => prev.filter(c => c.id !== challengeId));
    } catch (err) {
      console.error("Failed to remove challenge", err);
      alert("Could not remove the challenge.");
    }
  };

// US 4.2 / 4.3 – badge count + earned list for Achievements card modal (members + trainers)
useEffect(() => {
  const fetchBadges = async () => {
    if (!user) return;
    try {
      const data = await rewardsAPI.getBadges() as {
        total_earned: number;
        badges: Array<{
          badge_id: string;
          name: string;
          description: string;
          icon: string;
          earned: boolean;
          earned_at: string | null;
        }>;
      };
      setAchievementsCount(data.total_earned);
      const earned = (data.badges || [])
        .filter((b) => b.earned)
        .sort((a, b) => (b.earned_at || '').localeCompare(a.earned_at || ''))
        .map((b) => ({
          badge_id: b.badge_id,
          name: b.name,
          description: b.description,
          icon: b.icon,
          earned_at: b.earned_at,
        }));
      setEarnedBadgesList(earned);
    } catch {
      setAchievementsCount(0);
      setEarnedBadgesList([]);
    }
  };
  fetchBadges();
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

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setIsDropdownOpen(false);
    await logout();
  };

  const openSettings = () => {
    setIsDropdownOpen(false);
    setIsSettingsOpen(true);
  };

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

  if (!user) {
    return null;
  }

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
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getStreakInfo = (sessions: WorkoutHistorySession[]) => {
    const result = { count: 0, dates: [] as string[] };
    if (!sessions.length) return result;

    const dates = Array.from(new Set(sessions.map(s => s.date))).sort().reverse();

    const today = new Date();
    const todayLocal = toLocalDateString(today);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayLocal = toLocalDateString(yesterday);

    let current: Date | null =
      dates[0] === todayLocal ? today : (dates[0] === yesterdayLocal ? yesterday : null);
    if (!current) return result;

    for (const d of dates) {
      if (!current) break;

      const currentLocal = toLocalDateString(current);

      if (d === currentLocal) {
        result.count++;
        result.dates.push(d);

        const prev: Date = new Date(current);
        prev.setDate(current.getDate() - 1);

        current = prev;
      } else {
        break;
      }
    }
    return result;
  };

  const streakInfo = getStreakInfo(historySessions);
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
      value: statsLoading ? '...' : trainerExercisesList.length,
      subtext:
        trainerExercisesList.length === 0
          ? 'Build your exercise library'
          : `${trainerExercisesList.length} custom exercise${trainerExercisesList.length !== 1 ? 's' : ''}`,
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
      value: statsLoading ? '...' : traineeCount,
      subtext:
        traineeCount === 0
          ? 'See how many people follow your workouts!'
          : `${traineeCount} member${traineeCount !== 1 ? 's' : ''} on your programs`,
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

  const statDetailByLabel: Record<string, NonNullable<typeof openStatDetail>> = {
    'Total Time': 'time',
    'Total Workouts': 'workouts',
    'Current Streak': 'streak',
    Achievements: 'achievements',
    'Programs Created': 'programs_created',
    'Exercises Created': 'exercises_created',
    'Active Programs': 'active_programs',
    'Total Trainees': 'total_trainees',
  };

  const trainerActiveProgramsList = trainerProgramsList.filter((p) => !p.is_deleted);

  // ========================================
  // Render
  // ========================================

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-logo">
          <Logo variant="text" size="sm" />
        </div>
        
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
                    <span>Profile</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/history" 
                    className="dropdown-menu-item"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <span>History</span>
                  </Link>
                </li>
                <li>
                  <button 
                    className="dropdown-menu-item"
                    onClick={openSettings}
                  >
                    <span>Settings</span>
                  </button>
                </li>
                <div className="dropdown-divider"></div>
                <li>
                  <button 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="dropdown-menu-item danger"
                  >
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

        <section className="stats-grid">
          {stats.map((stat) => {
            const detailKey = statDetailByLabel[stat.label] ?? null;
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
                  {openStatDetail === 'time' && 'Total Time'}
                  {openStatDetail === 'workouts' && 'Total Workouts'}
                  {openStatDetail === 'streak' && 'Current Streak'}
                  {openStatDetail === 'achievements' && 'Achievements'}
                  {openStatDetail === 'programs_created' && 'Programs Created'}
                  {openStatDetail === 'exercises_created' && 'Exercises Created'}
                  {openStatDetail === 'active_programs' && 'Active Programs'}
                  {openStatDetail === 'total_trainees' && 'Total Trainees'}
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
                      <div className="time-breakdown-total">
                        Total: {totalMinutes} min
                      </div>
                      <ul className="time-breakdown-list">
                        {historySessions.map((s) => (
                          <li key={s.id} className="time-breakdown-row">
                            <span className="time-breakdown-date">
                              {new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
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
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
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
                      Current streak is the number of consecutive days you worked out, including today or yesterday. If your most recent workout was more than one day ago, the streak resets to zero.
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
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
                {openStatDetail === 'achievements' && (
                  <>
                    <div className="time-breakdown-total">
                      {achievementsCount}{' '}
                      {achievementsCount === 1 ? 'badge' : 'badges'} earned
                    </div>
                    {earnedBadgesList.length === 0 ? (
                      <div className="time-breakdown-empty">
                        <p className="time-breakdown-empty-text">No badges yet</p>
                        <p className="time-breakdown-empty-sub">
                          Complete a workout from your schedule to earn your first badge.
                        </p>
                        <Link href="/schedule" className="dashboard-stat-modal-link">
                          Go to Schedule
                        </Link>
                      </div>
                    ) : (
                      <>
                        <ul className="dashboard-achievements-list">
                          {earnedBadgesList.map((b) => (
                            <li key={b.badge_id} className="dashboard-achievement-row">
                              <span className="dashboard-achievement-icon" aria-hidden>
                                {b.icon}
                              </span>
                              <div className="dashboard-achievement-text">
                                <span className="dashboard-achievement-name">{b.name}</span>
                                <span className="dashboard-achievement-desc">{b.description}</span>
                                {b.earned_at && (
                                  <span className="dashboard-achievement-date">
                                    Earned{' '}
                                    {new Date(b.earned_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })}
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                        <div className="dashboard-stat-modal-footer">
                          <Link href="/rewards" className="dashboard-stat-modal-link">
                            Open achievement gallery
                          </Link>
                        </div>
                      </>
                    )}
                  </>
                )}
                {openStatDetail === 'programs_created' && (
                  <>
                    <div className="time-breakdown-total">
                      {programsCount} program{programsCount !== 1 ? 's' : ''} created
                    </div>
                    {trainerProgramsList.length === 0 ? (
                      <div className="time-breakdown-empty">
                        <p className="time-breakdown-empty-text">No programs yet</p>
                        <p className="time-breakdown-empty-sub">
                          Create a workout program to share with the community.
                        </p>
                        <Link href="/create-program" className="dashboard-stat-modal-link">
                          Create a program
                        </Link>
                      </div>
                    ) : (
                      <>
                        <ul className="dashboard-achievements-list">
                          {trainerProgramsList.map((p) => (
                            <li key={p.id} className="dashboard-achievement-row">
                              <span className="dashboard-achievement-icon" aria-hidden>
                                📋
                              </span>
                              <div className="dashboard-achievement-text">
                                <span className="dashboard-achievement-name">{p.name}</span>
                                {p.is_deleted && (
                                  <span className="dashboard-achievement-desc">Archived</span>
                                )}
                                <span className="dashboard-achievement-date">
                                  Created{' '}
                                  {new Date(p.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <div className="dashboard-stat-modal-footer">
                          <Link href="/trainer-programs" className="dashboard-stat-modal-link">
                            Browse your programs
                          </Link>
                        </div>
                      </>
                    )}
                  </>
                )}
                {openStatDetail === 'active_programs' && (
                  <>
                    <div className="time-breakdown-total">
                      {activeProgramsCount} active program{activeProgramsCount !== 1 ? 's' : ''}
                    </div>
                    {trainerActiveProgramsList.length === 0 ? (
                      <div className="time-breakdown-empty">
                        <p className="time-breakdown-empty-text">No active programs</p>
                        <p className="time-breakdown-empty-sub">
                          Published programs you haven&apos;t archived appear here.
                        </p>
                        <Link href="/create-program" className="dashboard-stat-modal-link">
                          Create a program
                        </Link>
                      </div>
                    ) : (
                      <>
                        <ul className="dashboard-achievements-list">
                          {trainerActiveProgramsList.map((p) => (
                            <li key={p.id} className="dashboard-achievement-row">
                              <span className="dashboard-achievement-icon" aria-hidden>
                                💪
                              </span>
                              <div className="dashboard-achievement-text">
                                <span className="dashboard-achievement-name">{p.name}</span>
                                <span className="dashboard-achievement-date">
                                  Created{' '}
                                  {new Date(p.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <div className="dashboard-stat-modal-footer">
                          <Link href="/trainer-programs" className="dashboard-stat-modal-link">
                            Manage programs
                          </Link>
                        </div>
                      </>
                    )}
                  </>
                )}
                {openStatDetail === 'exercises_created' && (
                  <>
                    <div className="time-breakdown-total">
                      {trainerExercisesList.length} custom exercise
                      {trainerExercisesList.length !== 1 ? 's' : ''}
                    </div>
                    {trainerExercisesList.length === 0 ? (
                      <div className="time-breakdown-empty">
                        <p className="time-breakdown-empty-text">No custom exercises yet</p>
                        <p className="time-breakdown-empty-sub">
                          Build your library—default catalog exercises don&apos;t count here.
                        </p>
                        <Link href="/add-exercise" className="dashboard-stat-modal-link">
                          Add an exercise
                        </Link>
                      </div>
                    ) : (
                      <>
                        <ul className="dashboard-achievements-list">
                          {trainerExercisesList.map((ex) => (
                            <li key={ex.id} className="dashboard-achievement-row">
                              <span className="dashboard-achievement-icon" aria-hidden>
                                🏋️
                              </span>
                              <div className="dashboard-achievement-text">
                                <span className="dashboard-achievement-name">{ex.name}</span>
                                {ex.description ? (
                                  <span className="dashboard-achievement-desc">{ex.description}</span>
                                ) : null}
                                <span className="dashboard-achievement-date">
                                  Added{' '}
                                  {new Date(ex.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <div className="dashboard-stat-modal-footer">
                          <Link href="/add-exercise" className="dashboard-stat-modal-link">
                            Add another exercise
                          </Link>
                        </div>
                      </>
                    )}
                  </>
                )}
                {openStatDetail === 'total_trainees' && (
                  <>
                    <div className="time-breakdown-total">
                      {traineeCount} {traineeCount === 1 ? 'trainee' : 'trainees'}
                    </div>
                    {traineeCount === 0 ? (
                      <div className="time-breakdown-empty">
                        <p className="time-breakdown-empty-text">No trainees yet</p>
                        <p className="time-breakdown-empty-sub">
                          When members add your programs to an active schedule, they count here
                          (your own schedule is excluded).
                        </p>
                        <Link href="/trainer-programs" className="dashboard-stat-modal-link">
                          View your programs
                        </Link>
                      </div>
                    ) : (
                      <>
                        <p className="time-breakdown-streak-explanation">
                          Members with an active schedule that includes at least one of your programs.
                          Your own account is not counted.
                        </p>
                        <div className="dashboard-stat-modal-footer">
                          <Link href="/trainer-programs" className="dashboard-stat-modal-link">
                            Browse your programs
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
        <section className="dashboard-trends-section">
    <h2 className="section-title">Weekly Activity</h2>

    <div className="dashboard-chart-card">
      {historyLoading ? (
        <p className="dashboard-chart-loading">Loading...</p>
      ) : historySessions.length === 0 ? (
        <div className="dashboard-chart-empty">
          <p className="dashboard-chart-empty-title">No completed workouts yet</p>
          <p className="dashboard-chart-empty-text">Complete a workout from your schedule to see your activity here.</p>
          <Link href="/schedule" className="dashboard-chart-empty-link">Go to Schedule</Link>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={weeklyChartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" tickMargin={8} />
            <YAxis tickMargin={8}
              label={{ value: "Minutes", angle: -90, position: "insideLeft" }}
              domain={[0, 'auto']}
            />
            <Tooltip formatter={(value: number | undefined) => [value ?? 0, 'Minutes']} />
            <Line
              type="monotone"
              dataKey="minutes"
              strokeWidth={3}
              dot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  </section>

{/* Weekly Challenges (US 4.4) */}
        <section className="dashboard-challenges-section">
        <h2 className="section-title">Weekly Challenges 🔥</h2>
        {challengesLoading ? (
          <p className="dashboard-chart-loading">Loading challenges...</p>
        ) : myChallenges.length === 0 ? (
          <div className="empty-challenges">
            <span className="empty-icon">🎯</span>
            <p className="empty-text">No active challenges</p>
            <Link href="/challenges" className="empty-link">Browse Challenges</Link>
          </div>
        ) : (
          <div className="challenges-grid">
            {myChallenges.map((challenge) => (
              <div key={challenge.id} className={`challenge-card ${challenge.is_completed ? 'completed' : ''}`}>
                
                {/* --- 1. THE HOVER TOOLTIP --- */}
                <div className="challenge-tooltip">
                  {challenge.challenge_description ?? "Complete the required goals to earn this badge!"}
                </div>

                <div className="challenge-header">
                  <h3 className="challenge-name">{challenge.challenge_name}</h3>
                  
                  {/* --- 2. BADGE & LEAVE BUTTON WRAPPER --- */}
                  <div className="header-actions">
                    {challenge.is_completed ? (
                      <span className="badge completed">✅ Completed!</span>
                    ) : (
                      <span className="badge in-progress">{challenge.progress_percent}%</span>
                    )}
                    
                    <button 
                      onClick={() => handleLeaveChallenge(challenge.id)} 
                      className="leave-button"
                      title="Remove challenge"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                <div className="challenge-progress">
                  <div 
                    className="progress-bar"
                    style={{ width: `${challenge.progress_percent}%` }}
                  />
                </div>
                <div className="challenge-reward">
                  {challenge.is_completed ? 'Badge + Points Earned!' : 'Keep going!'}
                </div>
              </div>
            ))}
            
            <Link href="/challenges" className="challenge-card join-new">
              <div className="challenge-cta">
                <span className="challenge-icon">➕</span>
                <span>Join New Challenge</span>
              </div>
            </Link>
          </div>
        )}
      </section>


        {/* Quick Actions */}
        <section className="quick-actions">
          <h2 className="section-title">Quick Actions</h2>
          <div className="action-buttons">
            {/* Profile Action */}
            <Link href="/profile" className="action-button">
              <div className="action-button-icon">👤</div>
              <div className="action-button-title">
                {hasCompletedProfile ? 'Edit your profile' : 'Complete Profile'}
              </div>
              <div className="action-button-description">
                {hasCompletedProfile 
                  ? 'Change your fitness details to customize for your new preferences'
                  : 'Add your fitness details to get started'}
              </div>
            </Link>

            {/* Browse Programs Action */}
            <Link href="/trainer-programs" className="action-button">
              <div className="action-button-icon">💪</div>
              <div className="action-button-title">Browse Programs</div>
              <div className="action-button-description">
                Explore trainer-created workouts
              </div>
            </Link>
            
            {user.is_trainer ? (
              <>
                <Link href="/add-exercise" className="action-button">
                  <div className="action-button-icon">🏋️</div>
                  <div className="action-button-title">Add Exercise</div>
                  <div className="action-button-description">
                    Create exercises for your programs
                  </div>
                </Link>
                
                <Link href="/create-program" className="action-button">
                  <div className="action-button-icon">✨</div>
                  <div className="action-button-title">Create Program</div>
                  <div className="action-button-description">
                    Design a new workout plan
                  </div>
                </Link>

                <Link href="/rewards" className="action-button">
                  <div className="action-button-icon">🏆</div>
                  <div className="action-button-title">My Rewards</div>
                  <div className="action-button-description">
                    View your points
                  </div>
                </Link>
              </>
            ) : (
              <>
                
                <Link href="/recommendations" className="action-button">
                  <div className="action-button-icon">🎯</div>
                  <div className="action-button-title">View Recommendations</div>
                  <div className="action-button-description">
                    Discover workout plans for you
                  </div>
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

            {myChallenges.length === 0 && !user.is_trainer ? (
            <Link href="/challenges" className="action-button">
              <div className="action-button-icon">🎯</div>
              <div className="action-button-title">Join Challenges</div>
              <div className="action-button-description">Stay motivated with short-term goals</div>
            </Link>
          ) : null}

            <Link href="/schedule" className="action-button">
                  <div className="action-button-icon">📅</div>
                  <div className="action-button-title">My Workout Schedule</div>
                  <div className="action-button-description">
                    View and manage your personalized calendar
                  </div>
                </Link>
          </div>
        </section>
      </main>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
