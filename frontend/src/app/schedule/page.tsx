'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
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
  weekly_schedule: { [key: string]: number[] | string };
  is_active: boolean;
  created_at: string;
}

interface ScheduleResponse {
  schedule: Schedule | null;
  calendar_events: CalendarEvent[];
}

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

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/active/`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Schedule data:', data);
        setScheduleData(data);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStartDate = async () => {
    if (!newStartDate || !scheduleData?.schedule) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/${scheduleData.schedule.id}/update-start-date/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            start_date: newStartDate
          })
        }
      );

      if (response.ok) {
        alert('✅ Start date updated!');
        setEditingStartDate(false);
        fetchSchedule();
      } else {
        const errorData = await response.json();
        alert(`❌ ${errorData.error || 'Failed to update start date'}`);
      }
    } catch (error) {
      console.error('Error updating start date:', error);
      alert('❌ Error updating start date. Please try again.');
    }
  };

  const fetchWorkoutForDate = async (dateStr: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/workout/${dateStr}/`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setWorkoutDetail(data);
        setShowWorkoutModal(true);
      }
    } catch (error) {
      console.error('Error fetching workout:', error);
    }
  };

  const handleDateClick = (event: CalendarEvent) => {
    setSelectedDate(event.date);
    fetchWorkoutForDate(event.date);
  };

  const handleDeactivateSchedule = async () => {
    if (!confirm('Are you sure you want to deactivate your entire schedule?')) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/deactivate/`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (response.ok) {
        alert('Schedule deactivated');
        router.push('/trainer-programs');
      }
    } catch (error) {
      console.error('Error deactivating schedule:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '0 sec';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} sec`;
    if (secs === 0) return `${mins} min`;
    return `${mins} min ${secs} sec`;
  };

  const getFocusIcon = (focus: string) => {
    const icons: { [key: string]: string } = {
      strength: '💪',
      cardio: '❤️',
      flexibility: '🧘',
      balance: '⚖️',
    };
    return icons[focus?.toLowerCase()] || '🏋️';
  };

  // Group events by week
  const groupEventsByWeek = (events: CalendarEvent[]) => {
    const weeks: CalendarEvent[][] = [];
    let currentWeek: CalendarEvent[] = [];

    events.forEach((event, index) => {
      currentWeek.push(event);
      if ((index + 1) % 7 === 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="schedule-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!scheduleData?.schedule) {
    return (
      <ProtectedRoute>
        <div className="schedule-container">
          <div className="header">
            <button className="back-button" onClick={() => router.push('/trainer-programs')}>
              ← Back to Programs
            </button>
            <h1>My Workout Schedule</h1>
          </div>

          <div className="content">
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <h3>No Active Schedule</h3>
              <p>You haven't selected a workout program yet.</p>
              <button 
                className="btn-primary"
                onClick={() => router.push('/trainer-programs')}
              >
                Browse Programs
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const { schedule, calendar_events } = scheduleData;
  const weeks = groupEventsByWeek(calendar_events);

  // Get all unique focuses from all programs
  const allFocuses = schedule.program_list ? 
    [...new Set(schedule.program_list.flatMap(p => p.focus))] : 
    [];

  return (
    <ProtectedRoute>
      <div className="schedule-container">
        {/* Header */}
        <div className="header">
          <button className="back-button" onClick={() => router.push('/trainer-programs')}>
            ← Back to Programs
          </button>
          <h1>My Workout Schedule</h1>
        </div>

        <div className="content">
          {/* Program Info Card */}
          <div className="program-info-card">
            <div className="program-info-header">
              <div className="program-info-main">
                <h2>{schedule.program_names || 'My Schedule'}</h2>
                {allFocuses.length > 0 && (
                  <div className="focus-badges">
                    {allFocuses.map((f) => (
                      <span key={f} className="focus-badge">
                        {getFocusIcon(f)} {f.charAt(0).toUpperCase() + f.slice(1)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button 
                className="btn-deactivate"
                onClick={handleDeactivateSchedule}
              >
                🗑️ Clear Schedule
              </button>
            </div>

            {/* Show all programs in schedule - CLICKABLE */}
            {schedule.program_list && schedule.program_list.length > 0 && (
              <div className="programs-in-schedule">
                <h4>Programs in Schedule ({schedule.program_list.length})</h4>
                <div className="program-chips">
                  {schedule.program_list.map((program) => (
                    <div 
                      key={program.id} 
                      className="program-chip program-chip-clickable"
                      onClick={() => router.push(`/program/${program.id}`)}
                    >
                      <span className="program-chip-name">{program.name}</span>
                      <span className={`program-chip-difficulty difficulty-${program.difficulty}`}>
                        {program.difficulty}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="program-stats-row">
              <div className="stat-box">
                <span className="stat-icon">👤</span>
                <div className="stat-content">
                  <span className="stat-label">Trainers</span>
                  <span className="stat-value">
                    {schedule.program_list && schedule.program_list.length > 0 
                      ? [...new Set(schedule.program_list.map(p => p.trainer_name))].join(', ')
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* EDITABLE START DATE */}
              <div className="stat-box">
                <span className="stat-icon">📅</span>
                <div className="stat-content">
                  <span className="stat-label">Start Date</span>
                  {editingStartDate ? (
                    <div className="date-edit-section">
                      <input
                        type="date"
                        className="date-input"
                        value={newStartDate}
                        onChange={(e) => setNewStartDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <div className="date-edit-buttons">
                        <button className="btn-save-date" onClick={handleUpdateStartDate}>
                          ✓
                        </button>
                        <button 
                          className="btn-cancel-date" 
                          onClick={() => {
                            setEditingStartDate(false);
                            setNewStartDate('');
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="stat-value-editable" 
                      onClick={() => {
                        setEditingStartDate(true);
                        setNewStartDate(schedule.start_date);
                      }}
                    >
                      {new Date(schedule.start_date).toLocaleDateString()}
                      <span className="edit-icon">✏️</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="stat-box">
                <span className="stat-icon">📊</span>
                <div className="stat-content">
                  <span className="stat-label">Programs</span>
                  <span className="stat-value">
                    {schedule.program_list ? schedule.program_list.length : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="calendar-section">
            <h3 className="calendar-title">4-Week Schedule</h3>
            
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="calendar-week">
                <div className="week-header">
                  <h4>Week {weekIndex + 1}</h4>
                  <span className="week-dates">
                    {formatDate(week[0].date)} - {formatDate(week[week.length - 1].date)}
                  </span>
                </div>

                <div className="week-grid">
                  {week.map((event) => (
                    <div
                      key={event.date}
                      className={`calendar-day ${event.section_type === 'rest' ? 'rest-day' : 'workout-day'} ${selectedDate === event.date ? 'selected' : ''}`}
                      onClick={() => handleDateClick(event)}
                    >
                      <div className="day-header">
                        <span className="day-name">{event.day}</span>
                        <span className="day-date">
                          {new Date(event.date).getDate()}
                        </span>
                      </div>

                      <div className="day-content">
                        {event.section_type === 'rest' ? (
                          <div className="rest-indicator">
                            <span className="rest-icon">😴</span>
                            <span className="rest-text">Rest Day</span>
                          </div>
                        ) : (
                          <div className="workout-indicator">
                            <span className="workout-icon">🏋️</span>

                            {/* Program info in simplified format */}
                            {event.sections && event.sections.length > 0 && (
                              <div className="workout-programs-table">
                                {event.sections.map((section, idx) => (
                                  <div key={idx} className="program-row">
                                    <div className="program-name-col">
                                      <a 
                                        href={`/program/${section.program_id}`}
                                        className="program-link"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          router.push(`/program/${section.program_id}`);
                                        }}
                                      >
                                        {section.program_name}
                                      </a>
                                      <div className="program-focus-col">
                                        {typeof section.focus === 'string' ? section.focus : Array.isArray(section.focus) ? (section.focus as string[]).slice(0, 2).join(', ') : 'N/A'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="total-count">
                              {event.exercise_count} total
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Workout Detail Modal */}
          {showWorkoutModal && workoutDetail ? (
            <div className="modal-overlay" onClick={() => setShowWorkoutModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>
                    {workoutDetail.is_rest_day ? '😴 Rest Day' : '🏋️ Workout Day'}
                  </h3>
                  <button 
                    className="modal-close"
                    onClick={() => setShowWorkoutModal(false)}
                  >
                    ✕
                  </button>
                </div>

                <div className="modal-body">
                  <div className="workout-date">
                    {new Date(workoutDetail.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>

                  {workoutDetail.is_rest_day ? (
                    <div className="rest-message">
                      <p>{workoutDetail.message}</p>
                    </div>
                  ) : (
                    <>
                      {workoutDetail.workouts && workoutDetail.workouts.map((workout: any, workoutIdx: number) => (
                        <div key={workoutIdx} className="workout-section-detail">
                          <h4 className="workout-program-name">
                            {workout.program_name} - {workout.section.format}
                          </h4>
                          
                          {workout.section.exercises && workout.section.exercises.length > 0 && (
                            <div className="exercises-section">
                              {workout.section.exercises.map((exercise: any, index: number) => (
                                <div key={exercise.id} className="exercise-detail">
                                  <div className="exercise-detail-header">
                                    <span className="exercise-number">{index + 1}</span>
                                    <h5>{exercise.name}</h5>
                                  </div>

                                  <table className="sets-table">
                                    <thead>
                                      <tr>
                                        <th>Set</th>
                                        <th>Reps</th>
                                        <th>Time</th>
                                        <th>Rest</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {exercise.sets.map((set: any) => (
                                        <tr key={set.id}>
                                          <td>{set.set_number}</td>
                                          <td>{set.reps || '-'}</td>
                                          <td>{set.time ? formatTime(set.time) : '-'}</td>
                                          <td>{formatTime(set.rest)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      <div className="modal-actions">
                        <button 
                          className="btn-start-workout"
                          onClick={() => {
                            setShowWorkoutModal(false);
                            alert('Start workout feature coming soon!');
                          }}
                        >
                          ▶️ Start Workout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default SchedulePage;