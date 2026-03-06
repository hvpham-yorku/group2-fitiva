'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Notification from '@/components/Notification';
import ConfirmModal from '@/components/ConfirmModal';
import './program-details.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { programAPI } from '@/library/api';

interface ExerciseSet {
  id: number;
  set_number: number;
  reps: number | null;
  time: number | null;
  rest: number;
}

interface Exercise {
  id: number;
  name: string;
  order: number;
  sets: ExerciseSet[];
}

interface ProgramSection {
  id: number;
  format: string;
  type: string;
  order: number;
  exercises: Exercise[];
}

interface Program {
  id: number;
  name: string;
  description: string;
  focus: string[];
  difficulty: string;
  weekly_frequency: number;
  session_length: number;
  trainer: number;
  trainer_name: string;
  created_at: string;
  updated_at: string;
  sections: ProgramSection[];
}

interface FeedbackEntry {
  date: string;
  difficulty_rating: number;      
  fatigue_level: number | null;   
  pain_reported: boolean;         
  notes: string;
}

interface ProgramFeedback {
  program_id: number;             
  program_name: string;           
  total_responses: number;        
  avg_difficulty: number | null;  
  avg_fatigue: number | null;     
  pain_reported_count: number;    
  weekly_trends: Array<{        
    week: string; 
    avg_difficulty: number;     
    response_count: number;       
  }>;
  entries: FeedbackEntry[];
}


// Bug fix #2: all days for rest day picker
const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const ProgramDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const programId = params.id as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInSchedule, setIsInSchedule] = useState(false);
  const [feedback, setFeedback] = useState<ProgramFeedback | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(true);

  
  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);
  
  // Confirm modal state
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Bug fix #2: rest day picker state (replaces hardcoded rest_days: ['sunday'])
  const [showRestDayPicker, setShowRestDayPicker] = useState(false);
  const [selectedRestDays, setSelectedRestDays] = useState<string[]>(['sunday']);
  const [addingToSchedule, setAddingToSchedule] = useState(false);

  useEffect(() => {
    fetchProgramDetail();
    checkIfInSchedule();
  }, [programId]);

  const fetchProgramDetail = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/programs/${programId}/`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        setProgram(data);
      } else {
        setError('Failed to load program details');
      }
    } catch (error) {
      console.error('Error fetching program:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkIfInSchedule = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/active/`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.schedule && data.schedule.programs) {
          setIsInSchedule(data.schedule.programs.includes(parseInt(programId)));
        }
      }
    } catch (error) {
      console.error('Error checking schedule:', error);
    }
  };

const fetchProgramFeedback = async () => {
  if (!program?.id || !user?.is_trainer) {
    console.log('⏭️ Skipping feedback - not trainer or no program');
    setFeedbackLoading(false);
    return;
  }
  
  try {
    console.log('🔍 Fetching feedback for program:', program.id);
    console.log('👤 Trainer check:', user.id === program.trainer);
    
    // DIRECT FETCH - BYPASSES BROKEN api.ts
    const response = await fetch(`http://localhost:8000/api/trainer/programs/${program.id}/feedback/`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ FEEDBACK DATA:', data);
    setFeedback(data);
  } catch (error) {
    console.error('Error fetching feedback:', error);
  } finally {
    setFeedbackLoading(false);
  }
};

  useEffect(() => {
    if (program?.id) fetchProgramFeedback();
  }, [program?.id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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

  const showSuccess = (message: string) => setNotification({ type: 'success', message });
  const showError = (message: string) => setNotification({ type: 'error', message });
  const showInfo = (message: string) => setNotification({ type: 'info', message });

  // Bug fix #2: toggle a day in/out of rest days
  const toggleRestDay = (day: string) => {
    setSelectedRestDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Bug fix #2: sends user-selected rest_days (was hardcoded ['sunday'])
  const handleConfirmAddToSchedule = async () => {
    if (!program) return;
    setAddingToSchedule(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/generate/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            program_id: program.id,
            rest_days: selectedRestDays,
          }),
        }
      );
      if (response.ok) {
        showSuccess('Program added to your schedule!');
        setIsInSchedule(true);
        setShowRestDayPicker(false);
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Failed to add to schedule');
      }
    } catch (error) {
      console.error('Error adding to schedule:', error);
      showError('Error adding to schedule. Please try again.');
    } finally {
      setAddingToSchedule(false);
    }
  };

  const handleRemoveFromSchedule = async () => {
    if (!program) return;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/remove-program/${program.id}/`,
        { method: 'DELETE', credentials: 'include' }
      );
      if (response.ok) {
        showSuccess('Program removed from schedule');
        setIsInSchedule(false);
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Failed to remove from schedule');
      }
    } catch (error) {
      console.error('Error removing from schedule:', error);
      showError('Error removing from schedule. Please try again.');
    }
  };

  const getFocusIcon = (focus: string) => {
    const icons: { [key: string]: string } = {
      strength: '💪',
      cardio: '❤️',
      flexibility: '🧘',
      balance: '⚖️',
    };
    return icons[focus.toLowerCase()] || '💪';
  };

  const getTotalExercises = () => {
    return program?.sections?.reduce(
      (sum, section) => sum + (section.exercises?.length || 0), 0
    ) || 0;
  };

  const getTotalSets = () => {
    let total = 0;
    program?.sections?.forEach((section) => {
      section.exercises?.forEach((exercise) => {
        total += exercise.sets?.length || 0;
      });
    });
    return total;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="program-detail-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !program) {
    return (
      <ProtectedRoute>
        <div className="program-detail-container">
          <div className="header">
            <button className="back-button" onClick={() => router.back()}>← Back</button>
            <h1>Program Details</h1>
          </div>
          <div className="content">
            <div className="error-state">
              <h3>⚠️ {error || 'Program not found'}</h3>
              <button className="btn-primary" onClick={() => router.back()}>Go Back</button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const isOwnProgram = program.trainer === user?.id;

  return (
    <ProtectedRoute>
      <div className="program-detail-container">
        <div className="header">
          <button className="back-button" onClick={() => router.back()}>← Back</button>
          <h1>Program Details</h1>
        </div>

        <div className="content">
          <div className="overview-card">
            <div className="overview-header">
              <div className="title-section">
                <h2 className="program-name">{program.name}</h2>
                <div className="focus-badges">
                  {program.focus.map((f) => (
                    <span key={f} className="focus-badge">
                      {getFocusIcon(f)} {f.charAt(0).toUpperCase() + f.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="header-badges">
                {isOwnProgram && <span className="owner-badge">Your Program</span>}
                {isInSchedule && <span className="schedule-badge">In your schedule</span>}
              </div>
            </div>

            <p className="program-description">
              {program.description || 'No description provided'}
            </p>

            <div className="trainer-info">
              <strong>Created by:</strong> {program.trainer_name}
            </div>

            <div className="quick-stats">
              <div className="stat-item">
                <span className="stat-icon">📊</span>
                <div className="stat-content">
                  <span className="stat-label">Difficulty</span>
                  <span className={`stat-value difficulty-${program.difficulty}`}>
                    {program.difficulty.charAt(0).toUpperCase() + program.difficulty.slice(1)}
                  </span>
                </div>
              </div>
              <div className="stat-item">
                <span className="stat-icon">📅</span>
                <div className="stat-content">
                  <span className="stat-label">Frequency</span>
                  <span className="stat-value">{program.weekly_frequency}x per week</span>
                </div>
              </div>
              <div className="stat-item">
                <span className="stat-icon">⏱️</span>
                <div className="stat-content">
                  <span className="stat-label">Duration</span>
                  <span className="stat-value">{program.session_length} min</span>
                </div>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🏋️</span>
                <div className="stat-content">
                  <span className="stat-label">Exercises</span>
                  <span className="stat-value">{getTotalExercises()}</span>
                </div>
              </div>
              <div className="stat-item">
                <span className="stat-icon">📈</span>
                <div className="stat-content">
                  <span className="stat-label">Total Sets</span>
                  <span className="stat-value">{getTotalSets()}</span>
                </div>
              </div>
            </div>

{isOwnProgram && (
  <div className="feedback-summary">
    <h3 className="feedback-title">📊 Feedback Summary</h3>
    
    {feedbackLoading ? (
      <div className="no-feedback">Loading feedback...</div>
    ) : feedback ? (
      <>
        {/* Stats Row */}
        <div className="feedback-stats">
          <div className="stat-item">
            <span className="stat-icon">📊</span>
            <div>
              <span>Avg Difficulty</span>
              <span>{feedback.avg_difficulty?.toFixed(1) ?? 'N/A'}</span>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">😴</span>
            <div>
              <span>Avg Fatigue</span>
              <span>{feedback.avg_fatigue?.toFixed(1) ?? 'N/A'}</span>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">💬</span>
            <div>
              <span>Total Responses</span>
              <span>{feedback.total_responses}</span>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">⚠️</span>
            <div>
              <span>Pain Reports</span>
              <span>{feedback.pain_reported_count}</span>
            </div>
          </div>
        </div>

        {/* Trends Chart */}
        {feedback?.weekly_trends && feedback.weekly_trends.length > 0 && (
          <div className="feedback-chart" style={{ minHeight: '300px' }}>
            <h4>📈 Weekly Difficulty Trends</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={feedback.weekly_trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="week" />
                <YAxis type="number" domain={['auto', 'auto']} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="avg_difficulty" 
                  stroke="#EF3E36" 
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </>
    ) : (
      <div className="no-feedback">
        No feedback yet. Share your program to get client feedback!
      </div>
    )}
  </div>
)}

            {/* Dates */}
            <div className="dates-info">
              <div className="date-item">
                <span className="date-label">Created:</span>
                <span className="date-value">{formatDate(program.created_at)}</span>
              </div>
              <div className="date-item">
                <span className="date-label">Last Updated:</span>
                <span className="date-value">{formatDate(program.updated_at)}</span>
              </div>
            </div>

            <div className="action-buttons">
              {isInSchedule ? (
                <button
                  className="btn-remove-schedule btn-large"
                  onClick={() => setShowRemoveConfirm(true)}
                >
                  🗑️ Remove from My Schedule
                </button>
              ) : (
                // Bug fix #2: opens rest day picker instead of hardcoding ['sunday']
                <button
                  className="btn-primary btn-large"
                  onClick={() => setShowRestDayPicker(true)}
                >
                  ⭐ Use This Program
                </button>
              )}
              {isOwnProgram && (
                <button
                  className="btn-secondary btn-large"
                  onClick={() => router.push(`/edit-program/${program.id}`)}
                >
                  ✏️ Edit Program
                </button>
              )}
            </div>
          </div>

          {/* Program Sections */}
          <div className="sections-container">
            <h3 className="sections-title">Workout Plan</h3>
            {program.sections && program.sections.length > 0 ? (
              program.sections.map((section, sectionIndex) => (
                <div key={section.id} className="section-card">
                  <div className="section-header">
                    <h4 className="section-title">
                      {section.format || `Day ${sectionIndex + 1}`}
                    </h4>
                    <span className="exercise-count">
                      {section.exercises?.length || 0} exercises
                    </span>
                  </div>
                  {section.exercises && section.exercises.length > 0 ? (
                    <div className="exercises-list">
                      {section.exercises.map((exercise, exerciseIndex) => (
                        <div key={exercise.id} className="exercise-card">
                          <div className="exercise-header">
                            <span className="exercise-number">{exerciseIndex + 1}</span>
                            <h5 className="exercise-name">{exercise.name}</h5>
                          </div>
                          <div className="sets-table-container">
                            <table className="sets-table">
                              <thead>
                                <tr>
                                  <th>Set</th><th>Reps</th><th>Time</th><th>Rest</th>
                                </tr>
                              </thead>
                              <tbody>
                                {exercise.sets.map((set) => (
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
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-exercises">No exercises added yet</p>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-sections">
                <p>No workout days configured yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Bug fix #2: Rest Day Picker Modal */}
        {showRestDayPicker && (
          <div className="modal-overlay" onClick={() => setShowRestDayPicker(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Choose Your Rest Days</h3>
                <button className="modal-close" onClick={() => setShowRestDayPicker(false)}>✕</button>
              </div>
              <div className="modal-body">
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  Select the days you want to rest. Workouts will be scheduled on the remaining days
                  based on this program&apos;s frequency ({program.weekly_frequency}x/week).
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1rem' }}>
                  {ALL_DAYS.map((day) => {
                    const active = selectedRestDays.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => toggleRestDay(day)}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '20px',
                          border: active ? '2px solid #EF3E36' : '2px solid var(--border-medium)',
                          background: active ? 'linear-gradient(135deg, #EF3E36 0%, #FF9234 100%)' : 'var(--bg-tertiary)',
                          color: active ? 'white' : 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {selectedRestDays.length === 0
                    ? 'No rest days — all 7 days may be used for workouts.'
                    : `Rest: ${selectedRestDays.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}`}
                </p>
              </div>
              <div className="modal-actions">
                <button
                  onClick={() => setShowRestDayPicker(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'transparent',
                    border: '2px solid var(--border-medium)',
                    borderRadius: '8px',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAddToSchedule}
                  disabled={addingToSchedule}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #EF3E36 0%, #FF9234 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 700,
                    cursor: addingToSchedule ? 'not-allowed' : 'pointer',
                    opacity: addingToSchedule ? 0.6 : 1,
                  }}
                >
                  {addingToSchedule ? 'Adding...' : '⭐ Add to Schedule'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showRemoveConfirm && (
          <ConfirmModal
            title="Remove from Schedule?"
            message="Are you sure you want to remove this program from your schedule?"
            confirmText="Remove"
            cancelText="Cancel"
            type="danger"
            onConfirm={() => {
              setShowRemoveConfirm(false);
              handleRemoveFromSchedule();
            }}
            onCancel={() => setShowRemoveConfirm(false)}
          />
        )}

        {notification && (
          <Notification
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
};

export default ProgramDetailPage;