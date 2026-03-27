'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Notification from '@/components/Notification';
import ConfirmModal from '@/components/ConfirmModal';
import './schedule.css';

interface CalendarEvent {
  date: string;
  day: string;
  sections: Array<{
    id: number;
    name: string;
    type: string;
    exercise_count: number;
    program_id: number;
    program_name: string;
    focus: string;
  }>;
  section_type: string;
  exercise_count: number;
  session_status?: 'in_progress' | 'completed' | 'missed' | null;
  has_feedback?: boolean;
}

interface Program {
  id: number;
  name: string;
  focus: string[];
  difficulty: string;
  trainer_name: string;
}

interface Schedule {
  id: number;
  programs: number[];
  program_names: string;
  program_list: Program[];
  start_date: string;
  end_date?: string;
  weekly_schedule: { [key: string]: number[] | string };
  is_active: boolean;
  created_at: string;
  is_adjusted?: boolean;
  original_weekly_schedule?: { [key: string]: number[] | string };
  duration_overrides?: Record<string, number>;
  focus_overrides?: Record<string, string>;
  adjustments_locked_until?: string | null;
  adjustment_lock_note?: string;
  is_adjustment_locked?: boolean;
}

interface ScheduleResponse {
  schedule: Schedule | null;
  calendar_events: CalendarEvent[];
  next_week_changes?: NextWeekChange[];
}

interface NextWeekChange {
  day: string;
  from: 'workout' | 'rest';
  to: 'workout' | 'rest';
  reason?: string;
}

// Recovery options from the backend
export interface RecoveryOption {
  id: 'rest_next' | 'shorter_workout' | 'lighter_focus' | 'rest_same_day' | 'keep_going';
  label: string;
  description: string;
  icon: string;
  affected_day: string | null;   // which day changes
  affected_date: string | null;  // ISO date that changes
  change_type: 'rest' | 'shorter' | 'lighter' | 'none';
  duration_minutes?: number;     // for shorter_workout option
}

interface ScheduleSuggestion {
  adjustment: 'none' | 'increased' | 'reduced' | 'recovery' | 'pain';
  stress_score: number;
  avg_difficulty: number;
  avg_fatigue: number;
  pain_reported: boolean;
  pain_day: string | null;
  pain_session_date: string | null;        // ← ISO date of the session that had pain
  pain_next_workout_day: string | null;
  pain_next_workout_date: string | null;
  pain_day_cleared: string | null;
  workout_days_count: number;
  reason: string;
  recovery_options: RecoveryOption[];
}

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_INDEX: Record<string, number> = Object.fromEntries(DAYS_OF_WEEK.map((d, i) => [d, i]));

const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const toLocalISODate = (): string => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

/** US 3.5: completed / missed / in progress, or infer missed for past workout days with no session row yet. */
function getCalendarWorkoutStatus(event: CalendarEvent, todayIso: string): 'completed' | 'missed' | 'in_progress' | 'none' {
  if (event.section_type === 'rest') return 'none';
  if (event.session_status === 'completed') return 'completed';
  if (event.session_status === 'missed') return 'missed';
  if (event.session_status === 'in_progress') return 'in_progress';
  if (event.date < todayIso) return 'missed';
  return 'none';
}

const formatShort = (dateStr: string): string =>
  parseLocalDate(dateStr).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();

const ADJUSTMENT_META: Record<string, { emoji: string; label: string; color: string }> = {
  recovery:  { emoji: '🛌', label: 'Recovery Week',        color: '#e07b54' },
  reduced:   { emoji: '📉', label: 'Reduce Workload',      color: '#f59e0b' },
  increased: { emoji: '📈', label: 'Progressive Overload', color: '#22c55e' },
  pain:      { emoji: '⚠️', label: 'Pain Recovery Options', color: '#ef4444' },
  none:      { emoji: '✅', label: 'No Changes Needed',    color: '#6b7280' },
};

// Small helper to find the next workout day from the weekly schedule
export function findNextWorkoutDay(
  weeklySchedule: { [key: string]: number[] | string },
  painDay: string
): string | null {
  const painIdx = DAY_INDEX[painDay.toLowerCase()];
  if (painIdx === undefined) return null;

  // Walk forward through the week (wrapping around) to find the next day
  // that has at least one program assigned (array with length > 0) and is not 'rest'
  for (let offset = 1; offset <= 7; offset++) {
    const candidateDay = DAYS_OF_WEEK[(painIdx + offset) % 7];
    const slot = weeklySchedule[candidateDay];
    const isWorkout =
      Array.isArray(slot) ? slot.length > 0 : (slot !== 'rest' && slot !== '' && slot != null);
    if (isWorkout) return candidateDay;
  }
  return null; // full rest week — shouldn't happen
}

// Returns true if the given day name is a workout day in the schedule
function _isWorkoutDayInSchedule(
  weeklySchedule: { [key: string]: number[] | string },
  day: string
): boolean {
  const slot = weeklySchedule[day.toLowerCase()];
  if (slot == null) return false;
  if (Array.isArray(slot)) return slot.length > 0;
  return slot !== 'rest' && slot !== '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback for recovery options on the frontend
// (backend should return these; this is a safety net / preview).
// ─────────────────────────────────────────────────────────────────────────────
export function buildRecoveryOptions(
  painDay: string,
  nextWorkoutDay: string,
  nextWorkoutDate: string | null,
  currentDuration: number = 45
): RecoveryOption[] {
  const nextDayLabel = nextWorkoutDay.charAt(0).toUpperCase() + nextWorkoutDay.slice(1);
  const painDayLabel = painDay.charAt(0).toUpperCase() + painDay.slice(1);
  const shorterMins = Math.max(20, Math.round(currentDuration * 0.6));

  return [
    {
      id: 'rest_next',
      label: `Rest on ${nextDayLabel}`,
      description: `Skip ${nextDayLabel}'s workout entirely and give your body a full recovery day.`,
      icon: '😴',
      affected_day: nextWorkoutDay,
      affected_date: nextWorkoutDate,
      change_type: 'rest',
    },
    {
      id: 'shorter_workout',
      label: `Shorter workout on ${nextDayLabel} (${shorterMins} min)`,
      description: `Do a lighter ${shorterMins}-minute session instead of the full workout to stay active without overloading.`,
      icon: '⏱️',
      affected_day: nextWorkoutDay,
      affected_date: nextWorkoutDate,
      change_type: 'shorter',
      duration_minutes: shorterMins,
    },
    {
      id: 'lighter_focus',
      label: `Swap to mobility/stretching on ${nextDayLabel}`,
      description: `Replace ${nextDayLabel}'s workout with gentle mobility or stretching to keep moving without aggravating the pain.`,
      icon: '🧘',
      affected_day: nextWorkoutDay,
      affected_date: nextWorkoutDate,
      change_type: 'lighter',
    },
    {
      id: 'rest_same_day',
      label: `Also rest today (${painDayLabel})`,
      description: `Mark today as a rest day too and resume when you feel ready.`,
      icon: '🛌',
      affected_day: painDay,
      affected_date: null,
      change_type: 'rest',
    },
    {
      id: 'keep_going',
      label: 'Keep my schedule as-is',
      description: `Acknowledge the pain but continue with the planned schedule. Monitor how you feel.`,
      icon: '💪',
      affected_day: null,
      affected_date: null,
      change_type: 'none',
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────

const SchedulePage = () => {
  const router = useRouter();
  const { user } = useAuth();

  const [scheduleData, setScheduleData] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [workoutDetail, setWorkoutDetail] = useState<any>(null);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [editingStartDate, setEditingStartDate] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');
  const [editingEndDate, setEditingEndDate] = useState(false);
  const [newEndDate, setNewEndDate] = useState('');

  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);

  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);

  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackFatigue, setFeedbackFatigue] = useState<number | null>(null);
  const [feedbackPain, setFeedbackPain] = useState(false);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [deletingFeedback, setDeletingFeedback] = useState(false);
  const [undoingComplete, setUndoingComplete] = useState(false);

  const [regenerating, setRegenerating] = useState(false);
  const [applyingRegen, setApplyingRegen] = useState(false);

  const [suggestion, setSuggestion] = useState<ScheduleSuggestion | null>(null);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  // ← NEW: which recovery option the user has selected
  const [selectedRecoveryOption, setSelectedRecoveryOption] = useState<RecoveryOption | null>(null);
  const [applyingRecovery, setApplyingRecovery] = useState(false);
  const [lockingPlan, setLockingPlan] = useState(false);
  const [unlockingPlan, setUnlockingPlan] = useState(false);

  const [nextWeekChanges, setNextWeekChanges] = useState<NextWeekChange[] | null>(null);
  const [showNextWeekBanner, setShowNextWeekBanner] = useState(false);

  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    fetchSchedule();
  }, [monthOffset]);

  const fetchSchedule = async (offsetOverride?: number) => {
    const offset = offsetOverride ?? monthOffset;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/active/?offset=${offset}`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        setScheduleData(data);
        if (data.next_week_changes && data.next_week_changes.length > 0) {
          setNextWeekChanges(data.next_week_changes);
          setShowNextWeekBanner(true);
        }
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (message: string) => setNotification({ type: 'success', message });
  const showError   = (message: string) => setNotification({ type: 'error',   message });
  const showInfo    = (message: string) => setNotification({ type: 'info',    message });

  const resetFeedbackForm = () => {
    setFeedbackRating(0);
    setFeedbackFatigue(null);
    setFeedbackPain(false);
    setFeedbackNotes('');
    setEditingFeedback(false);
  };

  const handleCloseModal = () => {
    setShowWorkoutModal(false);
    setShowFeedbackForm(false);
    resetFeedbackForm();
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

  const handleUpdateStartDate = async () => {
    if (!newStartDate || !scheduleData?.schedule) return;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/${scheduleData.schedule.id}/update-start-date/`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ start_date: newStartDate }) }
      );
      if (response.ok) {
        showSuccess('Start date updated!');
        setEditingStartDate(false);
        setMonthOffset(0);
        fetchSchedule(0);
      } else {
        const err = await response.json();
        showError(err.error || 'Failed to update start date');
      }
    } catch { showError('Error updating start date.'); }
  };

  const handleUpdateEndDate = async () => {
    if (!newEndDate || !scheduleData?.schedule) return;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/${scheduleData.schedule.id}/update-end-date/`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ end_date: newEndDate }) }
      );
      if (response.ok) { showSuccess('End date updated!'); setEditingEndDate(false); fetchSchedule(); }
      else { const err = await response.json(); showError(err.error || 'Failed to update end date'); }
    } catch { showError('Error updating end date.'); }
  };

  const fetchWorkoutForDate = async (dateStr: string, calendarSectionType?: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/workout/${dateStr}/`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        const isActuallyWorkout = calendarSectionType === 'workout' || (data.workouts && data.workouts.length > 0);
        setWorkoutDetail({ ...data, is_rest_day: isActuallyWorkout ? false : data.is_rest_day });
        setShowWorkoutModal(true);
      }
    } catch { showError('Failed to load workout details'); }
  };

  const startSession    = async (dateStr: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/start/${dateStr}/`, { method: 'POST', credentials: 'include' });
    if (!res.ok) throw new Error('Failed to start session');
    return res.json();
  };
  const completeSession = async (dateStr: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/complete/${dateStr}/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({}) });
    if (!res.ok) throw new Error('Failed to complete session');
    return res.json();
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
  const handleRevertToDefault = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/revert/`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) { showError(data.error || 'Failed to revert schedule'); return; }
      showSuccess('Schedule reverted to your original plan! ✅');
      setShowRevertConfirm(false); setShowNextWeekBanner(false); setNextWeekChanges(null);
      await fetchSchedule();
    } catch { showError('Could not revert schedule.'); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PAIN FIX: Derive pain_day from the exact ISO date the user just rated.
  // Never trust the backend's strftime output or "today" — both can produce
  // the wrong weekday due to timezone offsets.
  // ─────────────────────────────────────────────────────────────────────────
  const patchPainDaySuggestion = (
    raw: ScheduleSuggestion,
    weeklySchedule: { [key: string]: number[] | string },
    ratedDateStr?: string,          // ISO date of the session being rated e.g. "2026-03-10"
  ): ScheduleSuggestion => {
    if (!raw.pain_reported) return raw;

    // Step 1 — get pain_day from the rated session date (most reliable source).
    // Priority: ratedDateStr (just submitted) > pain_session_date (from backend)
    // Both use parseLocalDate which is timezone-safe (new Date(y, m-1, d)).
    let painDay: string;
    const sourceDateStr = ratedDateStr ?? raw.pain_session_date ?? null;
    if (sourceDateStr) {
      const d = parseLocalDate(sourceDateStr);
      painDay = DAYS_OF_WEEK[d.getDay() === 0 ? 6 : d.getDay() - 1];
    } else if (raw.pain_day) {
      painDay = raw.pain_day.toLowerCase();
    } else {
      return raw;
    }

    // Step 2 — find the correct next workout day by walking the schedule
    const correctNextWorkout = findNextWorkoutDay(weeklySchedule, painDay);
    if (!correctNextWorkout) return raw;

    // Step 3 — compute next workout ISO date
    let nextWorkoutDate: string | null = null;
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayName = DAYS_OF_WEEK[d.getDay() === 0 ? 6 : d.getDay() - 1];
      if (dayName === correctNextWorkout) {
        nextWorkoutDate = [
          d.getFullYear(),
          String(d.getMonth() + 1).padStart(2, '0'),
          String(d.getDate()).padStart(2, '0'),
        ].join('-');
        break;
      }
    }

    // Step 4 — build recovery options with the corrected pain day
    const options = buildRecoveryOptions(painDay, correctNextWorkout, nextWorkoutDate);

    return {
      ...raw,
      pain_day: painDay,
      pain_next_workout_day: correctNextWorkout,
      pain_next_workout_date: nextWorkoutDate,
      pain_day_cleared: correctNextWorkout,
      recovery_options: options.length > 0 ? options : raw.recovery_options,
    };
  };

  // dateStr = the ISO date of the workout session the user just rated.
  // This is the source of truth for pain_day — avoids all timezone/strftime issues.
  const fetchScheduleSuggestion = async (ratedDateStr?: string) => {
    if (!scheduleData?.schedule) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/regenerate/preview/`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.regenerated) return;
      const patched = patchPainDaySuggestion(data, scheduleData.schedule.weekly_schedule, ratedDateStr);
      setSuggestion(patched);
      setShowSuggestionModal(true);
    } catch { /* silent */ }
  };

  // ── Apply a specific recovery option chosen by the user ──────────────────
  const handleApplyRecoveryOption = async (option: RecoveryOption) => {
    if (!suggestion) return;
    setApplyingRecovery(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/apply-recovery-option/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            option_id: option.id,
            affected_day: option.affected_day,
            affected_date: option.affected_date,
            change_type: option.change_type,
            duration_minutes: option.duration_minutes ?? null,
            pain_day: suggestion.pain_day,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 423) {
          showInfo(data.error || 'Your current plan is locked for the next cycle.');
        } else {
          showError(data.error || 'Failed to apply option');
        }
        return;
      }

      if (option.id === 'keep_going') {
        showInfo('Got it — schedule unchanged. Keep an eye on that pain! 💙');
      } else {
        showSuccess(`✅ ${option.label} applied! ${data.reason ?? ''}`);
      }

      setShowSuggestionModal(false);
      setSuggestion(null);
      setSelectedRecoveryOption(null);

      if (data.next_week_changes && data.next_week_changes.length > 0) {
        setNextWeekChanges(data.next_week_changes);
        setShowNextWeekBanner(true);
      }

      await fetchSchedule();
    } catch {
      showError('Could not apply recovery option. Please try again.');
    } finally {
      setApplyingRecovery(false);
    }
  };

  const handleAcceptSuggestion = async () => {
    // If it's a pain suggestion, require the user to pick an option
    if (suggestion?.adjustment === 'pain' && suggestion.recovery_options?.length > 0) {
      if (!selectedRecoveryOption) {
        showError('Please choose one of the recovery options below.');
        return;
      }
      await handleApplyRecoveryOption(selectedRecoveryOption);
      return;
    }
    // Non-pain path — original apply flow
    setApplyingRegen(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/regenerate/apply/`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 423) {
          showInfo(data.error || 'Your current plan is locked for the next cycle.');
        } else {
          showError(data.error || 'Failed to apply changes');
        }
        return;
      }
      showSuccess(`✅ Schedule updated! ${data.reason}`);
      setShowSuggestionModal(false); setSuggestion(null);
      await fetchSchedule();
    } catch { showError('Could not apply schedule changes.'); }
    finally { setApplyingRegen(false); }
  };

  const handleLockPlanForNextCycle = async () => {
    if (!scheduleData?.schedule) return;

    setLockingPlan(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/lock-adjustments/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            note: 'User locked the current workout plan for the next cycle after reviewing a recommended adjustment.',
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || data.message || 'Failed to lock the current plan');
        return;
      }

      showSuccess(data.message || 'Plan locked for the next cycle.');
      setShowSuggestionModal(false);
      setSuggestion(null);
      setSelectedRecoveryOption(null);
      await fetchSchedule();
    } catch {
      showError('Could not lock the current plan right now.');
    } finally {
      setLockingPlan(false);
    }
  };

  const handleUnlockPlan = async () => {
    if (!scheduleData?.schedule) return;

    setUnlockingPlan(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/lock-adjustments/`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || data.message || 'Failed to unlock the plan');
        return;
      }

      showSuccess(data.message || 'Plan lock removed.');
      await fetchSchedule();
    } catch {
      showError('Could not unlock the plan.');
    } finally {
      setUnlockingPlan(false);
    }
  };

  const handleDismissSuggestion = () => {
    setShowSuggestionModal(false);
    setSuggestion(null);
    setSelectedRecoveryOption(null);
    showInfo(
      'Adjustment rejected. Your current weekly plan stays unchanged, and Fitiva can suggest new changes after future feedback.'
    );
  };

  const handleRegenerateSchedule = async () => {
    if (!scheduleData?.schedule) return;

    if (scheduleData?.schedule?.is_adjustment_locked) {
      const lockedUntil = scheduleData.schedule.adjustments_locked_until;
      showInfo(
        lockedUntil
          ? `Your current plan is locked through ${parseLocalDate(lockedUntil).toLocaleDateString()}. Unlock it before requesting new adjustments.`
          : 'Your current plan is locked for the next cycle.'
      );
      return;
    }

    setRegenerating(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/regenerate/preview/`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) { showError(data.error || 'Failed to analyze schedule'); return; }
      if (!data.regenerated) { showInfo(data.message || 'No recent feedback found. Complete workouts and rate them first.'); return; }
      // Pass selectedDate so pain_day is derived from the clicked session, not "today"
      const patched = patchPainDaySuggestion(data, scheduleData.schedule.weekly_schedule, selectedDate ?? undefined);
      setSuggestion(patched);
      setShowSuggestionModal(true);
    } catch { showError('Could not analyze schedule. Please try again.'); }
    finally { setRegenerating(false); }
  };

  const submitFeedback = async (dateStr: string) => {
    if (feedbackRating === 0) { showError('Please rate the difficulty before submitting.'); return; }
    setSubmittingFeedback(true);
    try {
      const body: Record<string, any> = { difficulty_rating: feedbackRating, pain_reported: feedbackPain, notes: feedbackNotes };
      if (feedbackFatigue !== null) body.fatigue_level = feedbackFatigue;
      const method = editingFeedback ? 'PATCH' : 'POST';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/feedback/${dateStr}/`, {
        method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to submit feedback');
      showSuccess(editingFeedback ? 'Feedback updated! ✏️' : 'Feedback submitted! 🙌');
      setShowFeedbackForm(false); setShowWorkoutModal(false); resetFeedbackForm();
      await fetchSchedule();
      // Always trigger suggestion when pain is reported — pass the exact session
      // date so the modal shows the correct rated day, not "today"
      if (!editingFeedback || feedbackPain) await fetchScheduleSuggestion(dateStr);
    } catch { showError('Could not submit feedback. Please try again.'); }
    finally { setSubmittingFeedback(false); }
  };

  const handleDateClick = (event: CalendarEvent) => {
    setSelectedDate(event.date);
    setShowFeedbackForm(false);
    resetFeedbackForm();
    fetchWorkoutForDate(event.date, event.section_type);
  };

  const handleDeactivateSchedule = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/deactivate/`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) { showSuccess('Schedule cleared successfully'); setTimeout(() => router.push('/trainer-programs'), 1500); }
      else showError('Failed to clear schedule');
    } catch { showError('Error clearing schedule. Please try again.'); }
  };

  const formatDateLong = (dateStr: string) =>
    parseLocalDate(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const formatTime = (seconds: number) => {
    if (!seconds) return '0 sec';
    const mins = Math.floor(seconds / 60), secs = seconds % 60;
    if (mins === 0) return `${secs} sec`;
    if (secs === 0) return `${mins} min`;
    return `${mins} min ${secs} sec`;
  };

  const getFocusIcon = (focus: string) => ({ strength: '💪', cardio: '❤️', flexibility: '🧘', balance: '⚖️' }[focus?.toLowerCase()] ?? '🏋️');

  /** Split the 28-day list from the API into 4 rows of 7 (server applies ?offset for Prev/Next). */
  const buildWeeksFromEvents = (events: CalendarEvent[]): CalendarEvent[][] => {
    const weeks: CalendarEvent[][] = [];
    for (let i = 0; i < events.length; i += 7) {
      weeks.push(events.slice(i, i + 7));
    }
    return weeks;
  };

  const weekHasChanges = (week: CalendarEvent[]) => {
    if (!nextWeekChanges || !showNextWeekBanner) return false;
    const changeDays = new Set(nextWeekChanges.map((c) => c.day.toLowerCase()));
    return week.some((e) => changeDays.has(e.day.toLowerCase()));
  };

  const weekRangeLabel = (week: CalendarEvent[]) => `${formatShort(week[0].date)} – ${formatShort(week[week.length - 1].date)}`;

  const monthWindowLabelFromEvents = (events: CalendarEvent[]) => {
    if (!events.length) return '';
    const first = parseLocalDate(events[0].date);
    const last = parseLocalDate(events[events.length - 1].date);
    return `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()} – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`;
  };

  const navBtnStyle: React.CSSProperties = { padding: '0.45rem 1rem', borderRadius: '8px', border: '2px solid var(--border-medium)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' };
  const backToCurrentBtnStyle: React.CSSProperties = { padding: '0.3rem 0.8rem', borderRadius: '6px', border: '1.5px solid var(--border-medium)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500, fontSize: '0.78rem', whiteSpace: 'nowrap', marginTop: '0.3rem' };

  if (loading) return <ProtectedRoute><div className="schedule-container"><div className="loading-container"><div className="loading-spinner"></div></div></div></ProtectedRoute>;

  if (!scheduleData?.schedule) return (
    <ProtectedRoute>
      <div className="schedule-container">
        <div className="header"><button className="back-button" onClick={() => router.push('/trainer-programs')}>← Back to Programs</button><h1>My Workout Schedule</h1></div>
        <div className="content"><div className="empty-state"><div className="empty-icon">📅</div><h3>No Active Schedule</h3><p>You haven&apos;t selected a workout program yet.</p><button className="btn-primary" onClick={() => router.push('/trainer-programs')}>Browse Programs</button></div></div>
      </div>
    </ProtectedRoute>
  );

  const { schedule, calendar_events } = scheduleData;
  // Treat as locked if either flag is set — backend may set one without the other
  const isAdjustmentLocked = Boolean(
    schedule.is_adjustment_locked || schedule.adjustments_locked_until
  );

  const lockedUntilLabel = schedule.adjustments_locked_until
    ? parseLocalDate(schedule.adjustments_locked_until).toLocaleDateString()
    : '';

  const weeks = buildWeeksFromEvents(calendar_events);
  const todayIso = toLocalISODate();
  const allFocuses = schedule.program_list ? [...new Set(schedule.program_list.flatMap((p) => p.focus))] : [];
  const suggestionMeta = suggestion ? (ADJUSTMENT_META[suggestion.adjustment] ?? ADJUSTMENT_META.none) : null;
  const isPainSuggestion = suggestion?.adjustment === 'pain' || (suggestion?.pain_reported && (suggestion?.recovery_options?.length ?? 0) > 0);

  return (
    <ProtectedRoute>
      <div className="schedule-container">
        <div className="header">
          <button className="back-button" onClick={() => router.push('/trainer-programs')}>← Back to Programs</button>
          <h1>My Workout Schedule</h1>
        </div>

        <div className="content">

          {/* ── Next-Week Adjustment Banner ──────────────────────────────── */}
          {showNextWeekBanner && nextWeekChanges && nextWeekChanges.length > 0 && (
            <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#1a2e4a)', border: '1.5px solid #3b82f6', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
              <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>📅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#93c5fd', marginBottom: '0.3rem', fontSize: '0.95rem' }}>Schedule adjusted — effective next week</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  {nextWeekChanges.map((change, idx) => (
                    <span key={idx} style={{ background: change.to === 'rest' ? '#7f1d1d' : '#14532d', color: change.to === 'rest' ? '#fca5a5' : '#86efac', borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      {change.day.charAt(0).toUpperCase() + change.day.slice(1)}: {change.from === 'workout' ? '🏋️' : '😴'} → {change.to === 'workout' ? '🏋️' : '😴'}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button onClick={() => setShowRevertConfirm(true)} style={{ padding: '0.3rem 0.85rem', borderRadius: '6px', border: '1.5px solid #3b82f6', background: 'transparent', color: '#93c5fd', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>↩ Revert to Default</button>
                  <button onClick={() => setShowNextWeekBanner(false)} style={{ padding: '0.3rem 0.85rem', borderRadius: '6px', border: '1.5px solid #475569', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 500, fontSize: '0.8rem' }}>Dismiss</button>
                </div>
              </div>
            </div>
          )}



          {/* Program Info Card */}
          <div className="program-info-card">
            <div className="program-info-header">
              <div className="program-info-main">
                <h2>{schedule.program_names || 'My Schedule'}</h2>
                {allFocuses.length > 0 && (
                  <div className="focus-badges">
                    {allFocuses.map((f) => <span key={f} className="focus-badge">{getFocusIcon(f)} {f.charAt(0).toUpperCase() + f.slice(1)}</span>)}
                  </div>
                )}
              </div>
              <div className="schedule-header-actions">
                {/* ── Inline lock toggle ───────────────────────────────── */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  background: isAdjustmentLocked ? 'rgba(255,146,52,0.08)' : 'var(--bg-tertiary)',
                  border: isAdjustmentLocked ? '1.5px solid #FF9234' : '1.5px solid var(--border-medium)',
                  borderRadius: '10px', padding: '0.45rem 0.85rem',
                  transition: 'all 0.2s',
                }}>
                  <button
                    onClick={isAdjustmentLocked ? handleUnlockPlan : handleLockPlanForNextCycle}
                    disabled={lockingPlan || unlockingPlan}
                    title={isAdjustmentLocked
                      ? `Locked until ${lockedUntilLabel} — click to unlock`
                      : 'Protect your current plan from AI adjustments for the next week'}
                    style={{
                      width: '38px', height: '22px', borderRadius: '11px',
                      border: 'none', cursor: (lockingPlan || unlockingPlan) ? 'wait' : 'pointer',
                      background: isAdjustmentLocked ? '#FF9234' : 'var(--border-medium)',
                      position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: '3px',
                      left: isAdjustmentLocked ? '19px' : '3px',
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: '#fff', transition: 'left 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px',
                    }}>
                      {(lockingPlan || unlockingPlan) ? '…' : isAdjustmentLocked ? '🔒' : '🔓'}
                    </span>
                  </button>
                  <div style={{ lineHeight: 1.3 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isAdjustmentLocked ? '#FF9234' : 'var(--text-primary)' }}>
                      {isAdjustmentLocked ? 'Plan protected' : 'Protect plan'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      {isAdjustmentLocked
                        ? `Adjustments paused until ${lockedUntilLabel}`
                        : 'Pause schedule adjustments'}
                    </div>
                  </div>
                </div>

                <button
                  className="btn-regenerate"
                  onClick={handleRegenerateSchedule}
                  disabled={regenerating || isAdjustmentLocked}
                  title={
                    isAdjustmentLocked
                      ? `Plan protected until ${lockedUntilLabel} — toggle the lock above to re-enable`
                      : 'Analyzes your last 7 days of feedback and suggests adjustments'
                  }
                >
                  {isAdjustmentLocked
                    ? '🔒 Adjustments paused'
                    : regenerating
                      ? '⏳ Analyzing...'
                      : '🔄 Adjust Schedule'}
                </button>
                {schedule.is_adjusted && (
                  <button className="btn-regenerate" onClick={() => setShowRevertConfirm(true)} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '2px solid var(--border-medium)' }} title="Revert to your original default schedule">
                    ↩ Default Schedule
                  </button>
                )}
                <button className="btn-deactivate" onClick={() => setShowDeactivateConfirm(true)}>🗑️ Clear Schedule</button>
              </div>
            </div>

            {schedule.program_list && schedule.program_list.length > 0 && (
              <div className="programs-in-schedule">
                <h4>Programs in Schedule ({schedule.program_list.length})</h4>
                <div className="program-chips">
                  {schedule.program_list.map((program) => (
                    <div key={program.id} className="program-chip program-chip-clickable" onClick={() => router.push(`/program/${program.id}`)}>
                      <span className="program-chip-name">{program.name}</span>
                      <span className={`program-chip-difficulty difficulty-${program.difficulty}`}>{program.difficulty}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="program-stats-row">
              <div className="stat-box"><span className="stat-icon">👤</span><div className="stat-content"><span className="stat-label">Trainers</span><span className="stat-value">{schedule.program_list?.length > 0 ? [...new Set(schedule.program_list.map((p) => p.trainer_name))].join(', ') : 'N/A'}</span></div></div>
              <div className="stat-box"><span className="stat-icon">📅</span><div className="stat-content"><span className="stat-label">Start Date</span>
                {editingStartDate ? (
                  <div className="date-edit-section"><input type="date" className="date-input" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} /><div className="date-edit-buttons"><button className="btn-save-date" onClick={handleUpdateStartDate}>✓</button><button className="btn-cancel-date" onClick={() => { setEditingStartDate(false); setNewStartDate(''); }}>✕</button></div></div>
                ) : (
                  <div className="stat-value-editable" onClick={() => { setEditingStartDate(true); setNewStartDate(schedule.start_date); }}>{parseLocalDate(schedule.start_date).toLocaleDateString()}<span className="edit-icon">✏️</span></div>
                )}
              </div></div>
              <div className="stat-box"><span className="stat-icon">🏁</span><div className="stat-content"><span className="stat-label">End Date</span>
                {editingEndDate ? (
                  <div className="date-edit-section"><input type="date" className="date-input" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} min={schedule.start_date} /><div className="date-edit-buttons"><button className="btn-save-date" onClick={handleUpdateEndDate}>✓</button><button className="btn-cancel-date" onClick={() => { setEditingEndDate(false); setNewEndDate(''); }}>✕</button></div></div>
                ) : (
                  <div className="stat-value-editable" onClick={() => { setEditingEndDate(true); setNewEndDate(schedule.end_date || ''); }}>{schedule.end_date ? parseLocalDate(schedule.end_date).toLocaleDateString() : <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Not set</span>}<span className="edit-icon">✏️</span></div>
                )}
              </div></div>
              <div className="stat-box"><span className="stat-icon">📊</span><div className="stat-content"><span className="stat-label">Programs</span><span className="stat-value">{schedule.program_list?.length ?? 0}</span></div></div>
            </div>
          </div>

          {/* Calendar */}
          <div className="calendar-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <button style={navBtnStyle} onClick={() => setMonthOffset((o) => o - 1)}>← Prev</button>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{monthWindowLabelFromEvents(calendar_events)}</span>
                {monthOffset === 0 ? (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-primary,#e07b54)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Current</span>
                ) : (
                  <button style={backToCurrentBtnStyle} onClick={() => setMonthOffset(0)}>↩ Back to Current</button>
                )}
              </div>
              <button style={navBtnStyle} onClick={() => setMonthOffset((o) => o + 1)}>Next →</button>
            </div>

            <h3 className="calendar-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              4-Week Schedule
              {showNextWeekBanner && nextWeekChanges && nextWeekChanges.length > 0 && (
                <span style={{
                  background: '#1d4ed8', color: '#bfdbfe',
                  borderRadius: '6px', padding: '0.15rem 0.6rem',
                  fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em',
                  textTransform: 'uppercase', verticalAlign: 'middle',
                }}>
                  ● Adjusted
                </span>
              )}
            </h3>

            {weeks.map((week, weekIndex) => {
              const hasChanges = weekHasChanges(week);
              return (
                <div key={weekIndex} className="calendar-week">
                  <div className="week-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4>{weekRangeLabel(week)}</h4>
                    </div>
                    <span className="week-dates">{formatDateLong(week[0].date)} – {formatDateLong(week[week.length - 1].date)}</span>
                  </div>
                  <div className="week-grid">
                    {week.map((event) => {
                      const workoutStatus = getCalendarWorkoutStatus(event, todayIso);
                      return (
                        <div
                          key={event.date}
                          className={`calendar-day ${event.section_type === 'rest' ? 'rest-day' : 'workout-day'} ${selectedDate === event.date ? 'selected' : ''} ${workoutStatus === 'completed' ? 'session-completed' : ''} ${workoutStatus === 'missed' ? 'session-missed' : ''}`}
                          onClick={() => handleDateClick(event)}
                        >
                          <div className="day-header"><span className="day-name">{event.day.slice(0, 3).toUpperCase()}</span><span className="day-date">{parseLocalDate(event.date).getDate()}</span></div>
                          {event.section_type === 'workout' && workoutStatus === 'missed' && (
                            <div className="day-missed-banner" role="status" aria-label="Workout missed">Missed</div>
                          )}
                          <div className="day-content">
                            {event.section_type === 'rest' ? (
                              <div className="rest-indicator"><span className="rest-icon">😴</span><span className="rest-text">Rest Day</span></div>
                            ) : (
                              <div className="workout-indicator">
                                <span className="workout-icon">🏋️</span>
                                {event.sections?.length > 0 && (
                                  <div className="workout-programs-table">
                                    {event.sections.map((section, idx) => (
                                      <div key={idx} className="program-row">
                                        <div className="program-name-col">
                                          <div className="program-name-line"><a href={`/program/${section.program_id}`} className="program-link" onClick={(e) => { e.stopPropagation(); router.push(`/program/${section.program_id}`); }}>{section.program_name}</a></div>
                                          <div className="program-focus-line">
                                            <span className="program-focus-text">{typeof section.focus === 'string' ? section.focus : Array.isArray(section.focus) ? (section.focus as string[]).slice(0, 2).join(', ') : 'N/A'}</span>
                                            {workoutStatus === 'completed' && <span className="program-complete-badge">✅ Complete</span>}
                                            {workoutStatus === 'missed' && <span className="program-missed-badge">Missed</span>}
                                            {event.session_status === 'in_progress' && <span className="program-inprogress-badge">In Progress</span>}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="total-count">{event.exercise_count} total</div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Workout Detail Modal ─────────────────────────────────────── */}
          {showWorkoutModal && workoutDetail && (
            <div className="modal-overlay" onClick={handleCloseModal}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>{showFeedbackForm ? (editingFeedback ? '✏️ Edit Feedback' : '📝 Rate Your Workout') : workoutDetail.is_rest_day ? '😴 Rest Day' : '🏋️ Workout Details'}</h3>
                  <button className="modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="workout-date">{parseLocalDate(workoutDetail.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  {workoutDetail.is_rest_day ? (
                    <div className="rest-message"><p>{workoutDetail.message || 'Rest day — recovery is important!'}</p></div>
                  ) : (
                    <>
                      {!showFeedbackForm && workoutDetail.workouts?.map((workout: any, workoutIdx: number) => (
                        <div key={workoutIdx} className="workout-section-detail">
                          <h4 className="workout-program-name">{workout.program_name} — {workout.section.format}</h4>
                          {workout.section.exercises?.length > 0 && (
                            <div className="exercises-section">
                              {workout.section.exercises.map((exercise: any, index: number) => (
                                <div key={exercise.id} className="exercise-detail">
                                  <div className="exercise-detail-header"><span className="exercise-number">{index + 1}</span><h5>{exercise.name}</h5></div>
                                  <table className="sets-table"><thead><tr><th>Set</th><th>Reps</th><th>Time</th><th>Rest</th></tr></thead><tbody>{exercise.sets.map((set: any) => (<tr key={set.id}><td>{set.set_number}</td><td>{set.reps || '-'}</td><td>{set.time ? formatTime(set.time) : '-'}</td><td>{formatTime(set.rest)}</td></tr>))}</tbody></table>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
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
                            <button className="btn-start-workout" onClick={async()=>{try{await startSession(workoutDetail.date);showSuccess('Workout started!');await fetchSchedule();await fetchWorkoutForDate(workoutDetail.date);}catch{showError('Could not start workout.');}}}>▶️ Start Workout</button>
                          )}
                          {workoutDetail.session_status === 'in_progress' && (
                            <button className="btn-complete-workout" onClick={async()=>{
                              try {
                                const data = await completeSession(workoutDetail.date);
                                // US 4.2 – badge unlock toast takes priority
                                if (data.newly_unlocked_badges && data.newly_unlocked_badges.length > 0) {
                                  const names = data.newly_unlocked_badges
                                    .map((b: { icon: string; name: string }) => `${b.icon} ${b.name}`)
                                    .join(', ');
                                  showSuccess(`Badge${data.newly_unlocked_badges.length > 1 ? 's' : ''} unlocked: ${names}!`);
                                } else if (data.points_awarded > 0) {
                                  // US 4.1 – points toast
                                  showSuccess(`Workout completed! +${data.points_awarded} pts ⭐`);
                                } else {
                                  showSuccess('Workout completed! 🎉');
                                }
                                await fetchSchedule();
                                await fetchWorkoutForDate(workoutDetail.date);
                                setShowFeedbackForm(true);
                              } catch { showError('Could not complete workout.'); }
                            }}>✅ Complete</button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Suggestion / Pain Recovery Modal ────────────────────────── */}
          {showSuggestionModal && suggestion && suggestionMeta && (
            <div className="modal-overlay" onClick={handleDismissSuggestion}>
              <div
                className="modal-content"
                style={{ maxWidth: isPainSuggestion ? '560px' : '480px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header" style={{ borderBottom: `3px solid ${suggestionMeta.color}` }}>
                  <h3 style={{ color: suggestionMeta.color }}>{suggestionMeta.emoji} {isPainSuggestion ? 'Pain Reported — How would you like to adjust?' : suggestionMeta.label}</h3>
                  <button className="modal-close" onClick={handleDismissSuggestion}>✕</button>
                </div>

                <div className="modal-body">
                  <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                    {suggestion.reason}
                  </p>

                  {/* Pain day context */}
                  {isPainSuggestion && suggestion.pain_day && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#450a0a', border: '1px solid #b91c1c', borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '1.1rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                      <div>
                        <span style={{ fontWeight: 700, color: '#fca5a5', fontSize: '0.88rem' }}>
                          Pain reported on {suggestion.pain_day.charAt(0).toUpperCase() + suggestion.pain_day.slice(1)}
                        </span>
                        {suggestion.pain_next_workout_day && (
                          <span style={{ color: '#fca5a5', fontSize: '0.82rem' }}>
                            {' '}— next workout day: <strong>{suggestion.pain_next_workout_day.charAt(0).toUpperCase() + suggestion.pain_next_workout_day.slice(1)}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stats row (non-pain) */}
                  {!isPainSuggestion && (
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                      {[{ label: 'Stress Score', value: suggestion.stress_score, icon: '📊' }, { label: 'Avg Difficulty', value: suggestion.avg_difficulty, icon: '💪' }, { label: 'Avg Fatigue', value: suggestion.avg_fatigue, icon: '😓' }].map((stat) => (
                        <div key={stat.label} style={{ flex: '1', minWidth: '100px', background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '0.6rem 0.8rem', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                          <div style={{ fontSize: '1.1rem' }}>{stat.icon}</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: suggestionMeta.color }}>{stat.value}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── PAIN: Recovery Option Cards ─────────────────────── */}
                  {isPainSuggestion && suggestion.recovery_options?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '1.25rem' }}>
                      <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.2rem' }}>
                        Choose how to handle it:
                      </p>
                      {suggestion.recovery_options.map((opt) => {
                        const isSelected = selectedRecoveryOption?.id === opt.id;
                        const isKeepGoing = opt.id === 'keep_going';
                        return (
                          <button
                            key={opt.id}
                            onClick={() => setSelectedRecoveryOption(isSelected ? null : opt)}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                              background: isSelected
                                ? (isKeepGoing ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)')
                                : 'var(--bg-tertiary)',
                              border: isSelected
                                ? `2px solid ${isKeepGoing ? '#22c55e' : '#ef4444'}`
                                : '2px solid var(--border-light)',
                              borderRadius: '10px', padding: '0.75rem 0.9rem',
                              cursor: 'pointer', textAlign: 'left', width: '100%',
                              transition: 'all 0.15s',
                            }}
                          >
                            <span style={{ fontSize: '1.35rem', flexShrink: 0, marginTop: '1px' }}>{opt.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontWeight: 700, fontSize: '0.9rem',
                                color: isSelected ? (isKeepGoing ? '#86efac' : '#fca5a5') : 'var(--text-primary)',
                                marginBottom: '0.18rem',
                              }}>
                                {opt.label}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                                {opt.description}
                              </div>
                            </div>
                            {isSelected && (
                              <span style={{
                                flexShrink: 0, width: '20px', height: '20px', borderRadius: '50%',
                                background: isKeepGoing ? '#22c55e' : '#ef4444',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontWeight: 700, fontSize: '0.75rem', marginTop: '2px',
                              }}>✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Non-pain: what will change */}
                  {!isPainSuggestion && (
                    <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.5rem', border: `1px solid ${suggestionMeta.color}44` }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>What will change</p>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>
                        {suggestion.adjustment === 'recovery'  && `Workout days will be reduced to ${suggestion.workout_days_count} days this week to allow your body to recover.`}
                        {suggestion.adjustment === 'reduced'   && `One workout day will be removed, leaving ${suggestion.workout_days_count} active workout days.`}
                        {suggestion.adjustment === 'increased' && `One rest day will become a workout day, bringing your total to ${suggestion.workout_days_count} workout days.`}
                        {suggestion.adjustment === 'none'      && 'No changes will be made — your current schedule is well-balanced.'}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#60a5fa', marginTop: '0.5rem', marginBottom: 0 }}>ℹ️ Changes apply from <strong>next week</strong> — your current week is not affected.</p>
                    </div>
                  )}

                  <div className="suggestion-impact-note">
                    Rejecting this suggestion keeps your current weekly plan unchanged.
                    To pause all AI adjustments for the next week, use the{' '}
                    <strong>Protect plan</strong> toggle on your schedule card.
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleDismissSuggestion}
                      style={{
                        flex: 1,
                        minWidth: '150px',
                        padding: '0.7rem',
                        borderRadius: '8px',
                        border: '2px solid var(--border-medium)',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.9rem'
                      }}
                    >
                      Reject
                    </button>

                    <button
                      onClick={handleAcceptSuggestion}
                      disabled={applyingRegen || applyingRecovery || (isPainSuggestion && !selectedRecoveryOption)}
                      style={{
                        flex: 2,
                        minWidth: '220px',
                        padding: '0.7rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: (isPainSuggestion && !selectedRecoveryOption) ? 'var(--border-medium)' : suggestionMeta.color,
                        color: '#fff',
                        cursor: (applyingRegen || applyingRecovery || (isPainSuggestion && !selectedRecoveryOption)) ? 'not-allowed' : 'pointer',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        opacity: (applyingRegen || applyingRecovery) ? 0.7 : 1,
                        transition: 'background 0.2s',
                      }}
                    >
                      {applyingRegen || applyingRecovery
                        ? '⏳ Applying...'
                        : isPainSuggestion
                          ? selectedRecoveryOption
                            ? `✓ Apply: ${selectedRecoveryOption.icon} ${selectedRecoveryOption.label}`
                            : 'Select an option above'
                          : '✓ Accept & Update Schedule'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {notification && <Notification type={notification.type} message={notification.message} onClose={() => setNotification(null)} />}

        {showDeactivateConfirm && (
          <ConfirmModal title="Clear Entire Schedule?" message="This will remove all programs from your schedule. This action cannot be undone." confirmText="Clear Schedule" cancelText="Cancel" type="danger"
            onConfirm={() => { setShowDeactivateConfirm(false); handleDeactivateSchedule(); }} onCancel={() => setShowDeactivateConfirm(false)} />
        )}

        {showRevertConfirm && (
          <ConfirmModal title="Revert to Default Schedule?" message="This will undo all AI-suggested adjustments and restore your original weekly schedule. Your completed workouts and feedback will be kept." confirmText="Revert to Default" cancelText="Keep Adjusted" type="warning"
            onConfirm={() => { setShowRevertConfirm(false); handleRevertToDefault(); }} onCancel={() => setShowRevertConfirm(false)} />
        )}
      </div>
    </ProtectedRoute>
  );
};

export default SchedulePage;