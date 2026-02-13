'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Notification from '@/components/Notification';
import ConfirmModal from '@/components/ConfirmModal';
import './trainer-programs.css';

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
  sections: ProgramSection[];
}

const TrainerProgramsPage = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'others'>('my');
  const [programsInSchedule, setProgramsInSchedule] = useState<Set<number>>(new Set());
  
  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);
  
  // Confirm modal state
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [programToRemove, setProgramToRemove] = useState<number | null>(null);

  const isTrainer = user?.is_trainer || false;

  useEffect(() => {
    // If user is not a trainer, show only "others" tab by default
    if (!isTrainer) {
      setActiveTab('others');
    }
    fetchPrograms();
    fetchSchedulePrograms();
  }, [isTrainer]);

  const fetchPrograms = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/programs/`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setPrograms(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedulePrograms = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/active/`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.schedule && data.schedule.programs) {
          setProgramsInSchedule(new Set(data.schedule.programs));
        }
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    }
  };

  // Notification helpers
  const showSuccess = (message: string) => {
    setNotification({ type: 'success', message });
  };

  const showError = (message: string) => {
    setNotification({ type: 'error', message });
  };

  const showInfo = (message: string) => {
    setNotification({ type: 'info', message });
  };

  const myPrograms = programs.filter(
    (program) => String(program.trainer) === String(user?.id)
  );
  const otherPrograms = programs.filter(
    (program) => String(program.trainer) !== String(user?.id)
  );

  const getFocusIcon = (focuses: string[]) => {
    const icons: { [key: string]: string } = {
      strength: '💪',
      cardio: '❤️',
      flexibility: '🧘',
      balance: '⚖️',
    };
    if (!focuses || focuses.length == 0) return '💪';
    const firstFocus = focuses[0].toLowerCase();
    return icons[firstFocus] || '💪';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  };

  const handleAddToSchedule = async (programId: number) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/generate/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            program_id: programId,
            rest_days: ['sunday']
          })
        }
      );

      if (response.ok) {
        showSuccess('Program added to your schedule!');
        setProgramsInSchedule(prev => new Set([...prev, programId]));
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Failed to add to schedule');
      }
    } catch (error) {
      console.error('Error adding to schedule:', error);
      showError('Error adding to schedule. Please try again.');
    }
  };

  const handleRemoveFromSchedule = async () => {
    if (!programToRemove) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/remove-program/${programToRemove}/`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (response.ok) {
        showSuccess('Program removed from schedule');
        setProgramsInSchedule(prev => {
          const newSet = new Set(prev);
          newSet.delete(programToRemove);
          return newSet;
        });
        fetchSchedulePrograms();
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Failed to remove from schedule');
      }
    } catch (error) {
      console.error('Error removing from schedule:', error);
      showError('Error removing from schedule. Please try again.');
    }
  };

  const renderProgramCard = (program: Program, showEditButton: boolean = false) => {
    const totalExercises = program.sections?.reduce(
      (sum, section) => sum + (section.exercises?.length || 0),
      0
    );

    const isInSchedule = programsInSchedule.has(program.id);

    return (
      <div key={program.id} className={`program-card ${showEditButton ? 'my-program' : 'other-program'}`}>
        {/* Date at top */}
        <div className="program-date-top">Created {formatDate(program.created_at)}</div>
        
        <div className="program-badge">PUBLIC PROGRAM</div>

        <div className="program-header">
          <span className="focus-icon">{getFocusIcon(program.focus)}</span>
          <h3 className="program-title">{program.name}</h3>
        </div>

        <p className="program-description">
          {program.description || 'No description provided'}
        </p>

        {/* Program Details */}
        <div className="program-meta">
          <div className="meta-item">
            <span className="meta-label">Focus:</span>
            <div className="focus-tags-inline">
              {program.focus && program.focus.length > 0 ? (
                program.focus.map((f) => (
                  <span key={f} className="focus-tag-small">
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </span>
                ))
              ) : (
                <span className="meta-value">Not specified</span>
              )}
            </div>
          </div>
          <div className="meta-item">
            <span className="meta-label">Difficulty:</span>
            <span className={`difficulty-badge ${program.difficulty}`}>
              {program.difficulty.charAt(0).toUpperCase() + program.difficulty.slice(1)}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Weekly Frequency:</span>
            <span className="meta-value">{program.weekly_frequency} days/week</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Session Length:</span>
            <span className="meta-value">{program.session_length} min</span>
          </div>
        </div>

        {/* Trainer Information */}
        <div className="program-author">
          <strong>Trainer:</strong> {program.trainer_name}
        </div>

        {/* Show stats only for trainer's own programs */}
        {showEditButton && (
          <div className="program-stats">
            <div className="stat">
              <span className="stat-value">{program.sections?.length || 0}</span>
              <span className="stat-label">Sections</span>
            </div>
            <div className="stat">
              <span className="stat-value">{totalExercises}</span>
              <span className="stat-label">Exercises</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="program-actions">
          <button 
            className="btn-view" 
            onClick={() => router.push(`/program/${program.id}`)}
          >
            View Details
          </button>
          
          {showEditButton && (
            <button 
              className="btn-edit" 
              onClick={() => router.push(`/edit-program/${program.id}`)}
            >
              Edit
            </button>
          )}
          
          {/* Show Add or Remove based on schedule status */}
          {isInSchedule ? (
            <button 
              className="btn-remove-calendar" 
              onClick={() => {
                setProgramToRemove(program.id);
                setShowRemoveConfirm(true);
              }}
            >
              🗑️ Remove from Schedule
            </button>
          ) : (
            <button 
              className="btn-add-calendar" 
              onClick={() => handleAddToSchedule(program.id)}
            >
              📅 Add to Schedule
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderEmptyState = (type: 'my' | 'others') => {
    if (type === 'my') {
      return (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No Programs Yet</h3>
          <p className="empty-message">You haven&apos;t created any workout programs yet.</p>
          <button className="btn-primary" onClick={() => router.push('/create-program')}>
            Create Your First Program
          </button>
        </div>
      );
    } else {
      return (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No Programs Available</h3>
          <p className="empty-message">There are currently no programs from other trainers.</p>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      </ProtectedRoute>
    );
  }

  // For regular users (non-trainers), show simplified view
  if (!isTrainer) {
    return (
      <ProtectedRoute>
        <div className="trainer-programs-container">
          <div className="header">
            <button className="back-button" onClick={() => router.push('/dashboard')}>
              ← Back to Dashboard
            </button>
            <h1>Workout Programs</h1>
          </div>

          <div className="content">
            <div className="programs-section">
              <p className="section-description">
                Explore and view programs created by trainers.
              </p>
              {otherPrograms.length === 0 ? (
                renderEmptyState('others')
              ) : (
                <div className="programs-grid">
                  {otherPrograms.map((program) => renderProgramCard(program, false))}
                </div>
              )}
            </div>
          </div>

          {/* Notification Component */}
          {notification && (
            <Notification
              type={notification.type}
              message={notification.message}
              onClose={() => setNotification(null)}
            />
          )}

          {/* Confirmation Modal */}
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
              onCancel={() => {
                setShowRemoveConfirm(false);
                setProgramToRemove(null);
              }}
            />
          )}
        </div>
      </ProtectedRoute>
    );
  }

  // For trainers, show full view with tabs
  return (
    <ProtectedRoute>
      <div className="trainer-programs-container">
        <div className="header">
          <button className="back-button" onClick={() => router.push('/dashboard')}>
            ← Back to Dashboard
          </button>
          <h1>Workout Programs</h1>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <button
            className={`tab ${activeTab === 'my' ? 'active' : ''}`}
            onClick={() => setActiveTab('my')}
          >
            My Programs ({myPrograms.length})
          </button>
          <button
            className={`tab ${activeTab === 'others' ? 'active' : ''}`}
            onClick={() => setActiveTab('others')}
          >
            Other Trainers ({otherPrograms.length})
          </button>
        </div>

        <div className="content">
          {/* My Programs Tab */}
          {activeTab === 'my' && (
            <div className="programs-section">
              <div className="section-header">
                <div>
                  <h2>My Created Workout Plans</h2>
                </div>
                <button className="btn-create" onClick={() => router.push('/create-program')}>
                  + Create New Program
                </button>
              </div>
              {myPrograms.length === 0 ? (
                renderEmptyState('my')
              ) : (
                <div className="programs-grid">
                  {myPrograms.map((program) => renderProgramCard(program, true))}
                </div>
              )}
            </div>
          )}

          {/* Other Trainers Tab */}
          {activeTab === 'others' && (
            <div className="programs-section">
              <h2>Other Trainers&apos; Workout Plans</h2>
              <p className="section-description">
                Explore and view programs created by other trainers.
              </p>
              {otherPrograms.length === 0 ? (
                renderEmptyState('others')
              ) : (
                <div className="programs-grid">
                  {otherPrograms.map((program) => renderProgramCard(program, false))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notification Component */}
        {notification && (
          <Notification
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}

        {/* Confirmation Modal */}
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
            onCancel={() => {
              setShowRemoveConfirm(false);
              setProgramToRemove(null);
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
};

export default TrainerProgramsPage;