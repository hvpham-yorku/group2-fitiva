'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import './program-details.css';

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

const ProgramDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const programId = params.id as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProgramDetail();
  }, [programId]);

  const fetchProgramDetail = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/programs/${programId}/`,
        {
          credentials: 'include',
        }
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

  // handing "Use This Program" action - for schedule generation

  const handleUseProgram = async () => {
    if (!program) return;

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
            program_id: program.id,
            rest_days: ['sunday']  // Can make this configurable later
          })
        }
      );
      if (response.ok) {
        alert('Schedule created successfully! Redirecting to your schedule...');
        router.push('/schedule');  // Redirect to schedule page
      } else {
        const errorData = await response.json();
        alert(`Failed to create schedule: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('Error creating schedule. Please try again.');
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
      (sum, section) => sum + (section.exercises?.length || 0),
      0
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
            <button className="back-button" onClick={() => router.back()}>
              ← Back
            </button>
            <h1>Program Details</h1>
          </div>
          <div className="content">
            <div className="error-state">
              <h3>⚠️ {error || 'Program not found'}</h3>
              <button className="btn-primary" onClick={() => router.back()}>
                Go Back
              </button>
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
        {/* Header */}
        <div className="header">
          <button className="back-button" onClick={() => router.back()}>
            ← Back
          </button>
          <h1>Program Details</h1>
        </div>

        <div className="content">
          {/* Program Overview Card */}
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
              {isOwnProgram && (
                <span className="owner-badge">Your Program</span>
              )}
            </div>

            <p className="program-description">
              {program.description || 'No description provided'}
            </p>

            <div className="trainer-info">
              <strong>Created by:</strong> {program.trainer_name}
            </div>

            {/* Quick Stats */}
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

            {/* Action Buttons */}
            <div className="action-buttons">
              <button className="btn-primary btn-large" onClick={handleUseProgram}>
                ⭐ Use This Program
              </button>
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
                            <span className="exercise-number">
                              {exerciseIndex + 1}
                            </span>
                            <h5 className="exercise-name">{exercise.name}</h5>
                          </div>

                          <div className="sets-table-container">
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
                                {exercise.sets.map((set) => (
                                  <tr key={set.id}>
                                    <td>{set.set_number}</td>
                                    <td>{set.reps || '-'}</td>
                                    <td>
                                      {set.time ? formatTime(set.time) : '-'}
                                    </td>
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
      </div>
    </ProtectedRoute>
  );
};

export default ProgramDetailPage;
