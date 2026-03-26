'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { profileAPI, sessionAPI, rewardsAPI } from '@/library/api';
import Logo from '@/components/ui/Logo';
import SettingsModal from '@/components/ui/SettingsModal';
import Notification from '@/components/Notification';
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
  date: string;
  plan_name?: string | null;
  duration_minutes?: number | null;
  notes?: string;
}

interface EarnedBadgeSummary {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string | null;
}

interface CalendarEvent {
  date: string;
  day: string;
  section_type: string;
  exercise_count: number;
  session_status?: 'in_progress' | 'completed' | null;
  has_feedback?: boolean;
  sections: Array<{
    id: number;
    name: string;
    type: string;
    exercise_count: number;
    program_id: number;
    program_name: string;
    focus: string;
  }>;
}

interface ScheduleResponse {
  schedule: any | null;
  calendar_events: CalendarEvent[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const API_BASE_URL = 'http://localhost:8000/api';

// ============================================================================
// COMPONENT
// ============================================================================

export default function DashboardPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // UI state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openStatDetail, setOpenStatDetail] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; message: string; } | null>(null);

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

  // Schedule & Modal state
  const [scheduleData, setScheduleData] = useState<ScheduleResponse | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState<CalendarEvent[]>([]);
  
  const [workoutDetail, setWorkoutDetail] = useState<any>(null);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(false);
  
  // Feedback Form State
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackFatigue, setFeedbackFatigue] = useState<number | null>(null);
  const [feedbackPain, setFeedbackPain] = useState(false);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [deletingFeedback, setDeletingFeedback] = useState(false);
  const [undoingComplete, setUndoingComplete] = useState(false);

  const showSuccess = (message: string) => setNotification({ type: 'success', message });
  const showError   = (message: string) => setNotification({ type: 'error', message });

  const toLocalDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayStr = toLocalDateString(new Date());

  const parseLocalDate = (dateStr: string): Date => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '0 sec';
    const mins = Math.floor(seconds / 60), secs = seconds % 60;
    if (mins === 0) return `${secs} sec`;
    if (secs === 0) return `${mins} min`;
    return `${mins} min ${secs} sec`;
  };

  const buildMonSunWeekData = (sessions: WorkoutHistorySession[]) => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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
      const iso = toLocalDateString(d);
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
        setHasCompletedProfile(!!profile.age);
      } catch {
        setHasCompletedProfile(false);
      } finally {
        setProfileLoading(false);
      }
    };
    checkProfile();
  }, []);

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
          const programs = Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : [];
          const myPrograms = programs.filter((p: Program) => String(p.trainer) === String(user.id));
          const activePrograms = myPrograms.filter((p: Program) => !p.is_deleted);
          setProgramsCount(myPrograms.length);
          setActiveProgramsCount(activePrograms.length);
          setTrainerProgramsList([...myPrograms].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } else {
          setProgramsCount(0); setActiveProgramsCount(0); setTrainerProgramsList([]);
        }

        if (exercisesRes.ok) {
          const exData = await exercisesRes.json();
          const raw = Array.isArray(exData.exercises) ? exData.exercises : [];
          const own = raw.filter((e: any) => !e.is_default).map((e: any) => ({
            id: e.id, name: e.name, description: e.description || '', created_at: e.created_at,
          })).sort((a: TrainerExerciseRow, b: TrainerExerciseRow) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
        setTrainerProgramsList([]); setTrainerExercisesList([]); setTraineeCount(0);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchTrainerStats();
  }, [user?.id, user?.is_trainer]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) { setHistoryLoading(false); return; }
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
    const onFocus = () => { if (user) fetchHistory(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user]);

  useEffect(() => {
    const fetchBadges = async () => {
      if (!user) return;
      try {
        const data = await rewardsAPI.getBadges() as { total_earned: number; badges: any[] };
        setAchievementsCount(data.total_earned);
        const earned = (data.badges || []).filter((b) => b.earned).sort((a, b) => (b.earned_at || '').localeCompare(a.earned_at || '')).map((b) => ({
            badge_id: b.badge_id, name: b.name, description: b.description, icon: b.icon, earned_at: b.earned_at,
        }));
        setEarnedBadgesList(earned);
      } catch {
        setAchievementsCount(0); setEarnedBadgesList([]);
      }
    };
    fetchBadges();
  }, [user]);

  // Fetch Schedule and find current week
  const fetchSchedule = async () => {
    setScheduleLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/active/`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setScheduleData(data);
        if (data.schedule && data.calendar_events?.length > 0) {
          let foundWeek = data.calendar_events.slice(0, 7);
          for (let i = 0; i < data.calendar_events.length; i += 7) {
            const weekChunk = data.calendar_events.slice(i, i + 7);
            if (weekChunk.some((d: CalendarEvent) => d.date === todayStr)) {
              foundWeek = weekChunk;
              break;
            }
          }
          setCurrentWeek(foundWeek);
        }
      }
    } catch { console.error('Error fetching schedule'); }
    finally { setScheduleLoading(false); }
  };

  useEffect(() => { if (user) fetchSchedule(); }, [user]);

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
  // Event & Modal Handlers
  // ========================================

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  const handleLogout = async () => { setIsLoggingOut(true); setIsDropdownOpen(false); await logout(); };
  const openSettings = () => { setIsDropdownOpen(false); setIsSettingsOpen(true); };

  const resetFeedbackForm = () => { setFeedbackRating(0); setFeedbackFatigue(null); setFeedbackPain(false); setFeedbackNotes(''); setEditingFeedback(false); };
  const handleCloseModal = () => { setShowWorkoutModal(false); setShowFeedbackForm(false); resetFeedbackForm(); };

  const fetchWorkoutForDate = async (dateStr: string, sectionType?: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/workout/${dateStr}/`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const isActuallyWorkout = sectionType === 'workout' || (data.workouts && data.workouts.length > 0);
        setWorkoutDetail({ ...data, is_rest_day: isActuallyWorkout ? false : data.is_rest_day });
        setShowWorkoutModal(true);
      }
    } catch { showError('Failed to load workout details'); }
  };

  const handleDateClick = (event: CalendarEvent) => {
    setShowFeedbackForm(false); resetFeedbackForm();
    fetchWorkoutForDate(event.date, event.section_type);
  };

  const startSession = async (dateStr: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/start/${dateStr}/`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error(); showSuccess('Workout started!'); await fetchSchedule(); await fetchWorkoutForDate(dateStr);
    } catch { showError('Could not start workout.'); }
  };

  const completeSession = async (dateStr: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/complete/${dateStr}/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({}) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.newly_unlocked_badges?.length > 0) showSuccess(`Badge unlocked!`);
      else if (data.points_awarded > 0) showSuccess(`Workout completed! +${data.points_awarded} pts ⭐`);
      else showSuccess('Workout completed! 🎉');
      await fetchSchedule(); await fetchWorkoutForDate(dateStr); setShowFeedbackForm(true);
    } catch { showError('Could not complete workout.'); }
  };

  const submitFeedback = async (dateStr: string) => {
    if (feedbackRating === 0) { showError('Please rate the difficulty before submitting.'); return; }
    setSubmittingFeedback(true);
    try {
      const body: any = { difficulty_rating: feedbackRating, pain_reported: feedbackPain, notes: feedbackNotes };
      if (feedbackFatigue !== null) body.fatigue_level = feedbackFatigue;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/feedback/${dateStr}/`, {
        method: editingFeedback ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      showSuccess(editingFeedback ? 'Feedback updated! ✏️' : 'Feedback submitted! 🙌');
      setShowFeedbackForm(false); setShowWorkoutModal(false); resetFeedbackForm(); await fetchSchedule();
    } catch { showError('Could not submit feedback.'); }
    finally { setSubmittingFeedback(false); }
  };

  const openEditFeedback = () => {
    if (workoutDetail?.feedback) {
      setFeedbackRating(workoutDetail.feedback.difficulty_rating ?? 0);
      setFeedbackFatigue(workoutDetail.feedback.fatigue_level ?? null);
      setFeedbackPain(workoutDetail.feedback.pain_reported ?? false);
      setFeedbackNotes(workoutDetail.feedback.notes ?? '');
    }
    setEditingFeedback(true);
    setShowFeedbackForm(true);
  };

  const undoCompleteSession = async (dateStr: string) => {
    setUndoingComplete(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/undo/${dateStr}/`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error();
      showSuccess('Workout marked as not completed.');
      await fetchSchedule(); await fetchWorkoutForDate(dateStr);
      setShowFeedbackForm(false); resetFeedbackForm();
    } catch { showError('Could not undo workout completion.'); }
    finally { setUndoingComplete(false); }
  };

  const deleteFeedback = async (dateStr: string) => {
    setDeletingFeedback(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/feedback/${dateStr}/`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error();
      showSuccess('Feedback removed.');
      await fetchSchedule(); await fetchWorkoutForDate(dateStr);
      setShowFeedbackForm(false); resetFeedbackForm();
    } catch { showError('Could not remove feedback.'); }
    finally { setDeletingFeedback(false); }
  };

  // ========================================
  // Render Helpers
  // ========================================

  if (isLoading) {
    return <div className="loading-container"><div className="loading-spinner"></div></div>;
  }

  if (!user) {
    return null;
  }

  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.username[0].toUpperCase();
  const totalWorkouts = historySessions.length;
  const totalMinutes = historySessions.reduce((sum, s) => {
    const m = typeof s.duration_minutes === 'number' ? s.duration_minutes : 0;
    return sum + m;
  }, 0);

  const getStreakInfo = (sessions: WorkoutHistorySession[]) => {
    const result = { count: 0, dates: [] as string[] };
    if (!sessions.length) return result;
    const dates = Array.from(new Set(sessions.map(s => s.date))).sort().reverse();
    const today = new Date();
    const todayLocal = toLocalDateString(today);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayLocal = toLocalDateString(yesterday);
    let current: Date | null = dates[0] === todayLocal ? today : (dates[0] === yesterdayLocal ? yesterday : null);
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
    { icon: '📊', iconColor: 'blue', label: 'Programs Created', value: statsLoading ? '...' : programsCount, subtext: programsCount === 0 ? 'Create your first program!' : 'Keep building!' },
    { icon: '🏋️', iconColor: 'green', label: 'Exercises Created', value: statsLoading ? '...' : trainerExercisesList.length, subtext: trainerExercisesList.length === 0 ? 'Build your exercise library' : `${trainerExercisesList.length} custom exercise${trainerExercisesList.length !== 1 ? 's' : ''}` },
    { icon: '💪', iconColor: 'purple', label: 'Active Programs', value: statsLoading ? '...' : activeProgramsCount, subtext: 'Publish and share your work' },
    { icon: '🏆', iconColor: 'orange', label: 'Total Trainees', value: statsLoading ? '...' : traineeCount, subtext: traineeCount === 0 ? 'See how many people follow your workouts!' : `${traineeCount} member${traineeCount !== 1 ? 's' : ''} on your programs` },
    { icon: '📊', iconColor: 'blue', label: 'Total Workouts', value: historyLoading ? '...' : totalWorkouts, subtext: totalWorkouts === 0 ? 'Start your first workout today!' : 'Nice work—keep going!' },
    { icon: '🔥', iconColor: 'green', label: 'Current Streak', value: historyLoading ? '...' : `${currentStreak} days`, subtext: currentStreak === 0 ? 'Build consistency!' : 'Momentum looks good!' },
    { icon: '⏱️', iconColor: 'purple', label: 'Total Time', value: historyLoading ? '...' : `${totalMinutes} min`, subtext: 'Every minute counts' },
    { icon: '🏆', iconColor: 'orange', label: 'Achievements', value: achievementsCount, subtext: achievementsCount === 0 ? 'Unlock your first badge!' : `${achievementsCount} badge${achievementsCount !== 1 ? 's' : ''} earned!` },
  ];

  const MEMBER_STATS: StatCard[] = [
    { icon: '📊', iconColor: 'blue', label: 'Total Workouts', value: historyLoading ? '...' : totalWorkouts, subtext: totalWorkouts === 0 ? 'Start your first workout today!' : 'Nice work—keep going!' },
    { icon: '🔥', iconColor: 'green', label: 'Current Streak', value: historyLoading ? '...' : `${currentStreak} days`, subtext: currentStreak === 0 ? 'Build consistency!' : 'Momentum looks good!' },
    { icon: '⏱️', iconColor: 'purple', label: 'Total Time', value: historyLoading ? '...' : `${totalMinutes} min`, subtext: 'Every minute counts' },
    { icon: '🏆', iconColor: 'orange', label: 'Achievements', value: achievementsCount, subtext: achievementsCount === 0 ? 'Unlock your first badge!' : `${achievementsCount} badge${achievementsCount !== 1 ? 's' : ''} earned!` },
  ];

  const stats = user.is_trainer ? TRAINER_STATS : MEMBER_STATS;

  const statDetailByLabel: Record<string, string> = {
    'Total Time': 'time',
    'Total Workouts': 'workouts',
    'Current Streak': 'streak',
    'Achievements': 'achievements',
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
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
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
                <li><Link href="/profile" className="dropdown-menu-item" onClick={() => setIsDropdownOpen(false)}><span>Profile</span></Link></li>
                <li><button className="dropdown-menu-item" onClick={openSettings}><span>Settings</span></button></li>
                <div className="dropdown-divider"></div>
                <li><button onClick={handleLogout} disabled={isLoggingOut} className="dropdown-menu-item danger"><span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span></button></li>
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
              ? "Ready to inspire and train your clients today?" 
              : "Ready to crush your fitness goals today?"}
          </p>
          <div className="welcome-message">
            <span className="welcome-icon">🎯</span>
            {user.is_trainer ? (
              <><strong>Trainer Journey:</strong>Manage your workout programs, track client progress, and share your expertise with the Fitiva community.</>
            ) : (
              <><strong>Your Fitness Journey:</strong>Complete your profile to get personalized workout recommendations tailored to your goals and experience level.</>
            )}
          </div>
        </section>

        {/* Stats Grid */}
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
              <div key={stat.label} className="stat-card">{cardContent}</div>
            );
          })}
        </section>

        {/* Detailed Stats Modal */}
        {openStatDetail && (
          <div className="time-breakdown-overlay" onClick={() => setOpenStatDetail(null)} role="dialog" aria-modal="true" aria-labelledby="stat-detail-title">
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
                <button type="button" className="time-breakdown-close" onClick={() => setOpenStatDetail(null)} aria-label="Close">×</button>
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
                            <span className="time-breakdown-date">{new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span className="time-breakdown-plan">{s.plan_name || 'Workout'}</span>
                            <span className="time-breakdown-duration">{typeof s.duration_minutes === 'number' ? `${s.duration_minutes} min` : '—'}</span>
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
                          <span className="time-breakdown-date">{new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span className="time-breakdown-plan">{s.plan_name || 'Workout'}</span>
                          <span className="time-breakdown-duration">{typeof s.duration_minutes === 'number' ? `${s.duration_minutes} min` : '—'}</span>
                        </li>
                      ))}
                    </ul>
                  )
                )}
                {openStatDetail === 'streak' && (
                  <>
                    <div className="time-breakdown-total">{currentStreak} {currentStreak === 1 ? 'day' : 'days'}</div>
                    <p className="time-breakdown-streak-explanation">Current streak is the number of consecutive days you worked out, including today or yesterday. If your most recent workout was more than one day ago, the streak resets to zero.</p>
                    {currentStreak === 0 ? (
                      <div className="time-breakdown-empty">
                        <p className="time-breakdown-empty-text">No active streak</p>
                        <p className="time-breakdown-empty-sub">Let&apos;s build a streak together—work out today!</p>
                      </div>
                    ) : (
                      <ul className="time-breakdown-list">
                        {streakInfo.dates.map((dateStr) => (
                          <li key={dateStr} className="time-breakdown-row time-breakdown-row-single">
                            <span className="time-breakdown-date">{new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
                {openStatDetail === 'achievements' && (
                  <>
                    <div className="time-breakdown-total">{achievementsCount} {achievementsCount === 1 ? 'badge' : 'badges'} earned</div>
                    {earnedBadgesList.length === 0 ? (
                      <div className="time-breakdown-empty">
                        <p className="time-breakdown-empty-text">No badges yet</p>
                        <p className="time-breakdown-empty-sub">Complete a workout from your schedule to earn your first badge.</p>
                        <Link href="/schedule" className="dashboard-stat-modal-link">Go to Schedule</Link>
                      </div>
                    ) : (
                      <>
                        <ul className="dashboard-achievements-list">
                          {earnedBadgesList.map((b) => (
                            <li key={b.badge_id} className="dashboard-achievement-row">
                              <span className="dashboard-achievement-icon" aria-hidden>{b.icon}</span>
                              <div className="dashboard-achievement-text">
                                <span className="dashboard-achievement-name">{b.name}</span>
                                <span className="dashboard-achievement-desc">{b.description}</span>
                                {b.earned_at && <span className="dashboard-achievement-date">Earned {new Date(b.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                              </div>
                            </li>
                          ))}
                        </ul>
                        <div className="dashboard-stat-modal-footer"><Link href="/rewards" className="dashboard-stat-modal-link">Open achievement gallery</Link></div>
                      </>
                    )}
                  </>
                )}
                {openStatDetail === 'programs_created' && (
                  <>
                    <div className="time-breakdown-total">{programsCount} program{programsCount !== 1 ? 's' : ''} created</div>
                    {trainerProgramsList.length === 0 ? (
                      <div className="time-breakdown-empty">
                        <p className="time-breakdown-empty-text">No programs yet</p>
                        <p className="time-breakdown-empty-sub">Create a workout program to share with the community.</p>
                        <Link href="/create-program" className="dashboard-stat-modal-link">Create a program</Link>
                      </div>
                    ) : (
                      <>
                        <ul className="dashboard-achievements-list">
                          {trainerProgramsList.map((p) => (
                            <li key={p.id} className="dashboard-achievement-row">
                              <span className="dashboard-achievement-icon" aria-hidden>📋</span>
                              <div className="dashboard-achievement-text">
                                <span className="dashboard-achievement-name">{p.name}</span>
                                {p.is_deleted && <span className="dashboard-achievement-desc">Archived</span>}
                                <span className="dashboard-achievement-date">Created {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <div className="dashboard-stat-modal-footer"><Link href="/trainer-programs" className="dashboard-stat-modal-link">Browse your programs</Link></div>
                      </>
                    )}
                  </>
                )}
                {openStatDetail === 'active_programs' && (
                  <>
                    <div className="time-breakdown-total">{activeProgramsCount} active program{activeProgramsCount !== 1 ? 's' : ''}</div>
                    {trainerActiveProgramsList.length === 0 ? (
                      <div className="time-breakdown-empty">
                        <p className="time-breakdown-empty-text">No active programs</p>
                        <p className="time-breakdown-empty-sub">Published programs you haven&apos;t archived appear here.</p>
                        <Link href="/create-program" className="dashboard-stat-modal-link">Create a program</Link>
                      </div>
                    ) : (
                      <>
                        <ul className="dashboard-achievements-list">
                          {trainerActiveProgramsList.map((p) => (
                            <li key={p.id} className="dashboard-achievement-row">
                              <span className="dashboard-achievement-icon" aria-hidden>💪</span>
                              <div className="dashboard-achievement-text">
                                <span className="dashboard-achievement-name">{p.name}</span>
                                <span className="dashboard-achievement-date">Created {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <div className="dashboard-stat-modal-footer"><Link href="/trainer-programs" className="dashboard-stat-modal-link">Manage programs</Link></div>
                      </>
                    )}
                  </>
                )}
                {openStatDetail === 'exercises_created' && (
                  <>
                    <div className="time-breakdown-total">{trainerExercisesList.length} custom exercise{trainerExercisesList.length !== 1 ? 's' : ''}</div>
                    {trainerExercisesList.length === 0 ? (
                      <div className="time-breakdown-empty">
                        <p className="time-breakdown-empty-text">No custom exercises yet</p>
                        <p className="time-breakdown-empty-sub">Build your library—default catalog exercises don&apos;t count here.</p>
                        <Link href="/add-exercise" className="dashboard-stat-modal-link">Add an exercise</Link>
                      </div>
                    ) : (
                      <>
                        <ul className="dashboard-achievements-list">
                          {trainerExercisesList.map((ex) => (
                            <li key={ex.id} className="dashboard-achievement-row">
                              <span className="dashboard-achievement-icon" aria-hidden>🏋️</span>
                              <div className="dashboard-achievement-text">
                                <span className="dashboard-achievement-name">{ex.name}</span>
                                {ex.description && <span className="dashboard-achievement-desc">{ex.description}</span>}
                                <span className="dashboard-achievement-date">Added {new Date(ex.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <div className="dashboard-stat-modal-footer"><Link href="/add-exercise" className="dashboard-stat-modal-link">Add another exercise</Link></div>
                      </>
                    )}
                  </>
                )}
                {openStatDetail === 'total_trainees' && (
                  <>
                    <div className="time-breakdown-total">{traineeCount} {traineeCount === 1 ? 'trainee' : 'trainees'}</div>
                    {traineeCount === 0 ? (
                      <div className="time-breakdown-empty">
                        <p className="time-breakdown-empty-text">No trainees yet</p>
                        <p className="time-breakdown-empty-sub">When members add your programs to an active schedule, they count here.</p>
                        <Link href="/trainer-programs" className="dashboard-stat-modal-link">View your programs</Link>
                      </div>
                    ) : (
                      <>
                        <p className="time-breakdown-streak-explanation">Members with an active schedule that includes at least one of your programs. Your own account is not counted.</p>
                        <div className="dashboard-stat-modal-footer"><Link href="/trainer-programs" className="dashboard-stat-modal-link">Browse your programs</Link></div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── NEW: Weekly Schedule Widget ───────────────────────────────── */}
        <section className="dashboard-schedule-widget">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="section-title" style={{ margin: 0 }}>This Week's Schedule</h2>
            <Link href="/schedule" style={{ color: 'var(--fitiva-orange)', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none' }}>View Full Calendar →</Link>
          </div>

          {scheduleLoading ? (
            <div className="dashboard-chart-card dashboard-chart-loading">Loading schedule...</div>
          ) : !scheduleData?.schedule ? (
            <div className="dashboard-chart-card dashboard-chart-empty">
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📅</div>
              <p className="dashboard-chart-empty-title">No Active Schedule</p>
              <p className="dashboard-chart-empty-text">Select a workout program to generate your weekly schedule.</p>
              <Link href="/trainer-programs" className="btn-primary" style={{ padding: '0.5rem 1.5rem', textDecoration: 'none' }}>Browse Programs</Link>
            </div>
          ) : (
            <div className="dashboard-week-grid">
              {currentWeek.map((event) => {
                const isToday = event.date === todayStr;
                const isCompleted = event.session_status === 'completed';
                return (
                  <div key={event.date} className={`dashboard-day-card ${isToday ? 'is-today' : ''} ${event.section_type === 'rest' ? 'rest-day' : ''}`} onClick={() => handleDateClick(event)}>
                    <div className="dash-day-name">{event.day.slice(0, 3).toUpperCase()}</div>
                    <div className="dash-day-num">{parseLocalDate(event.date).getDate()}</div>
                    
                    <div className="dash-day-indicator">
                      {event.section_type === 'rest' ? (
                        <div style={{ opacity: 0.6 }}>😴 Rest</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontSize: '1.2rem' }}>🏋️</span>
                          {isCompleted ? (
                            <span style={{ fontSize: '0.65rem', background: '#4caf50', color: 'white', padding: '2px 6px', borderRadius: '8px', fontWeight: 'bold' }}>Done</span>
                          ) : (
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{event.exercise_count} ex</span>
                          )}
                        </div>
                      )}
                    </div>
                    {isToday && <div className="dash-today-badge">TODAY</div>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Weekly Activity Chart */}
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
                  <YAxis tickMargin={8} label={{ value: "Minutes", angle: -90, position: "insideLeft" }} domain={[0, 'auto']} />
                  <Tooltip formatter={(value: number | undefined) => [value ?? 0, 'Minutes']} />
                  <Line type="monotone" dataKey="minutes" strokeWidth={3} dot={{ r: 5 }} stroke="var(--fitiva-red)" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="quick-actions">
          <h2 className="section-title">Quick Actions</h2>
          <div className="action-buttons">
            
            {/* Hides completely once the profile is complete */}
            {!hasCompletedProfile && (
              <Link href="/profile" className="action-button">
                <div className="action-button-icon">👤</div>
                <div className="action-button-title">Complete Profile</div>
                <div className="action-button-description">Manage your fitness details</div>
              </Link>
            )}

            {/* Re-added Recommendations Button */}
            <Link href="/recommendations" className="action-button">
              <div className="action-button-icon">🎯</div>
              <div className="action-button-title">Recommendations</div>
              <div className="action-button-description">View personalized suggestions</div>
            </Link>

            <Link href="/trainer-programs" className="action-button">
              <div className="action-button-icon">💪</div>
              <div className="action-button-title">Browse Programs</div>
              <div className="action-button-description">Explore trainer-created workouts</div>
            </Link>

            {user.is_trainer && (
              <Link href="/create-program" className="action-button">
                <div className="action-button-icon">✨</div>
                <div className="action-button-title">Create Program</div>
                <div className="action-button-description">Design a new workout plan</div>
              </Link>
            )}
            
            <Link href="/rewards" className="action-button">
              <div className="action-button-icon">🏆</div>
              <div className="action-button-title">My Rewards</div>
              <div className="action-button-description">View your points and badges</div>
            </Link>
          </div>
        </section>
      </main>

      {/* ── NEW: Workout Detail & Feedback Modal (Ported from Schedule) ── */}
      {showWorkoutModal && workoutDetail && (
        <div className="dashboard-modal-overlay" onClick={handleCloseModal}>
          <div className="dashboard-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="dashboard-modal-header">
              <h3>{showFeedbackForm ? (editingFeedback ? '✏️ Edit Feedback' : '📝 Rate Your Workout') : workoutDetail.is_rest_day ? '😴 Rest Day' : '🏋️ Workout Details'}</h3>
              <button className="dashboard-modal-close" onClick={handleCloseModal}>✕</button>
            </div>
            <div className="dashboard-modal-body">
              <div className="workout-date" style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {parseLocalDate(workoutDetail.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              
              {workoutDetail.is_rest_day ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}><p>{workoutDetail.message || 'Rest day — recovery is important!'}</p></div>
              ) : (
                <>
                  {/* WORKOUT LIST */}
                  {!showFeedbackForm && workoutDetail.workouts?.map((workout: any, workoutIdx: number) => (
                    <div key={workoutIdx} style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>{workout.program_name} — {workout.section.format}</h4>
                      {workout.section.exercises?.map((exercise: any, index: number) => (
                        <div key={exercise.id} style={{ marginBottom: '1rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                          <h5 style={{ margin: '0 0 0.5rem 0' }}>{index + 1}. {exercise.name}</h5>
                          <table style={{ width: '100%', textAlign: 'left', fontSize: '0.85rem' }}>
                            <thead><tr><th>Set</th><th>Reps</th><th>Time</th><th>Rest</th></tr></thead>
                            <tbody>{exercise.sets.map((set: any) => (<tr key={set.id}><td>{set.set_number}</td><td>{set.reps || '-'}</td><td>{set.time ? formatTime(set.time) : '-'}</td><td>{formatTime(set.rest)}</td></tr>))}</tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* DISPLAY EXISTING FEEDBACK */}
                  {!showFeedbackForm && workoutDetail.has_feedback && workoutDetail.feedback && (
                    <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '0.75rem 1rem', margin: '0.75rem 0', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontWeight: 700, marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>YOUR FEEDBACK</div>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.88rem' }}>
                        <span>💪 Difficulty: <strong>{workoutDetail.feedback.difficulty_rating}/5</strong></span>
                        {workoutDetail.feedback.fatigue_level && <span>😓 Fatigue: <strong>{workoutDetail.feedback.fatigue_level}/5</strong></span>}
                        {workoutDetail.feedback.pain_reported && <span>⚠️ <strong>Pain reported</strong></span>}
                      </div>
                      {workoutDetail.feedback.notes && <p style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{workoutDetail.feedback.notes}"</p>}
                    </div>
                  )}

                  {/* PORTED FEEDBACK FORM */}
                  {showFeedbackForm && (
                    <div className="feedback-form">
                      <div className="feedback-section"><label className="feedback-label">Difficulty <span className="feedback-required">*</span></label><div className="rating-buttons">{[1,2,3,4,5].map((n) => <button key={n} className={`rating-btn ${feedbackRating===n?'rating-btn-active':''}`} onClick={()=>setFeedbackRating(n)}>{n}</button>)}</div><div className="rating-scale-labels"><span>Very Easy</span><span>Very Hard</span></div></div>
                      <div className="feedback-section"><label className="feedback-label">Fatigue Level <span className="feedback-optional">(optional)</span></label><div className="rating-buttons">{[1,2,3,4,5].map((n) => <button key={n} className={`rating-btn ${feedbackFatigue===n?'rating-btn-active':''}`} onClick={()=>setFeedbackFatigue(feedbackFatigue===n?null:n)}>{n}</button>)}</div><div className="rating-scale-labels"><span>Not Tired</span><span>Exhausted</span></div></div>
                      <div className="feedback-section feedback-section-inline"><label className="feedback-label">Any pain or discomfort?</label><button className={`toggle-pain-btn ${feedbackPain?'toggle-pain-yes':'toggle-pain-no'}`} onClick={()=>setFeedbackPain(!feedbackPain)}>{feedbackPain?'⚠️ Yes':'No'}</button></div>
                      <div className="feedback-section"><label className="feedback-label">Notes <span className="feedback-optional">(optional)</span></label><textarea className="feedback-textarea" placeholder="How did it go? Any observations..." value={feedbackNotes} onChange={(e)=>setFeedbackNotes(e.target.value)} rows={3}/></div>
                      <div className="feedback-actions">
                        <button className="btn-skip-feedback" onClick={()=>{setShowFeedbackForm(false);resetFeedbackForm();}}>Cancel</button>
                        <button className="btn-submit-feedback" onClick={()=>submitFeedback(workoutDetail.date)} disabled={feedbackRating===0||submittingFeedback}>{submittingFeedback?'Saving...':editingFeedback?'✏️ Update Feedback':'Submit Feedback'}</button>
                      </div>
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  {!showFeedbackForm && (
                    <div className="modal-actions" style={{ flexDirection: 'column', gap: '0.6rem' }}>
                      {workoutDetail.session_status === 'completed' && workoutDetail.has_feedback && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <div className="workout-completed-label" style={{ flex: 1 }}>✅ Completed · Feedback Given ✓</div>
                          <button className="btn-add-feedback" onClick={openEditFeedback}>✏️ Edit Feedback</button>
                          <button onClick={()=>deleteFeedback(workoutDetail.date)} disabled={deletingFeedback} style={{ padding: '0.4rem 0.75rem', borderRadius: '7px', border: '1.5px solid #dc2626', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>{deletingFeedback?'...':'🗑️ Remove Feedback'}</button>
                        </div>
                      )}
                      
                      {workoutDetail.session_status === 'completed' && !workoutDetail.has_feedback && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <div className="workout-completed-label" style={{ flex: 1 }}>✅ Completed</div>
                          <button className="btn-add-feedback" onClick={()=>setShowFeedbackForm(true)}>📝 Give a feedback</button>
                        </div>
                      )}
                      
                      {workoutDetail.session_status === 'completed' && (
                        <button onClick={()=>undoCompleteSession(workoutDetail.date)} disabled={undoingComplete} style={{ padding: '0.4rem 0.75rem', borderRadius: '7px', border: '1.5px solid var(--border-medium)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500, fontSize: '0.82rem', alignSelf: 'flex-start' }}>{undoingComplete?'...':'↩ Undo Completion'}</button>
                      )}
                      
                      {!workoutDetail.session_status && (
                        <button className="btn-start-workout" style={{ width: '100%' }} onClick={() => startSession(workoutDetail.date)}>▶️ Start Workout</button>
                      )}
                      
                      {workoutDetail.session_status === 'in_progress' && (
                        <button className="btn-complete-workout" style={{ width: '100%', margin: 0 }} onClick={() => completeSession(workoutDetail.date)}>✅ Complete Workout</button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {notification && <Notification type={notification.type} message={notification.message} onClose={() => setNotification(null)} />}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}