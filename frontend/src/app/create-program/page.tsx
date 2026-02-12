'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import './create-program.css';

// Helper function to get CSRF token
function getCsrfToken(): string {
  const name = 'csrftoken';
  let cookieValue = '';
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

interface ExerciseSet {
  set_number: number;
  reps: number | null;
  time: number | null;
  rest: number;
}

interface Exercise {
  template_id?: number;
  name: string;
  sets: ExerciseSet[];
}

interface DaySection {
  format: string;
  type: string;
  is_rest_day: boolean;
  exercises: Exercise[];
}

interface ExerciseTemplate {
  id: number;
  name: string;
  description: string;
  muscle_groups: string[];
  exercise_type: 'reps' | 'time';
  default_recommendations: string;
  is_default: boolean;
}

interface SetConfig {
  reps: string;
  time: string;
  rest: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CreateProgramPage = () => {
  const router = useRouter();
  const { user } = useAuth();

  // Program details
  const [programName, setProgramName] = useState('');
  const [description, setDescription] = useState('');
  const [focuses, setFocuses] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState('beginner');
  const [sessionLength, setSessionLength] = useState(45);

  // Initialize 7 days
  const [daySections, setDaySections] = useState<DaySection[]>(
    DAYS_OF_WEEK.map((day) => ({
      format: day,
      type: '',
      is_rest_day: false,
      exercises: [],
    }))
  );

  // Exercise Library Modal
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState<number | null>(null);
  const [exerciseTemplates, setExerciseTemplates] = useState<ExerciseTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Sets Configuration Modal
  const [showSetsConfig, setShowSetsConfig] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ExerciseTemplate | null>(null);
  const [numberOfSets, setNumberOfSets] = useState('3');
  const [setsConfig, setSetsConfig] = useState<SetConfig[]>([]);

  // Rest Day Confirmation
  const [showRestDayConfirm, setShowRestDayConfirm] = useState(false);
  const [pendingRestDayIndex, setPendingRestDayIndex] = useState<number | null>(null);

  const [draggedExercise, setDraggedExercise] = useState<{
      dayIndex: number;
      exerciseIndex: number;
    } | null>(null);

  // Form state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const focusOptions = [
    { value: 'strength', label: 'Strength', icon: '💪' },
    { value: 'cardio', label: 'Cardio', icon: '❤️' },
    { value: 'flexibility', label: 'Flexibility', icon: '🧘' },
    { value: 'balance', label: 'Balance', icon: '⚖️' },
  ];

  const handleFocusToggle = (focus: string) => {
    setFocuses((prev) =>
      prev.includes(focus)
        ? prev.filter((f) => f !== focus)
        : [...prev, focus]
    );
    setErrors((prev) => ({ ...prev, focuses: '' }));
  };

  // Calculate workout summary
  const getWorkoutSummary = () => {
    const workoutDays = daySections.filter((day) => day.exercises.length > 0).length;
    const restDays = 7 - workoutDays;
    return { workoutDays, restDays };
  };

  // Update day description
  const updateDayDescription = (index: number, description: string) => {
    if (description.length > 30) return;
    const updated = [...daySections];
    updated[index].type = description;
    setDaySections(updated);
  };

  // Toggle rest day
  const toggleRestDay = (index: number) => {
    const day = daySections[index];
    
    // If has exercises and trying to mark as rest, confirm first
    if (!day.is_rest_day && day.exercises.length > 0) {
      setPendingRestDayIndex(index);
      setShowRestDayConfirm(true);
      return;
    }

    // Toggle rest day
    const updated = [...daySections];
    updated[index].is_rest_day = !updated[index].is_rest_day;
    setDaySections(updated);
  };

  const confirmRestDay = () => {
    if (pendingRestDayIndex === null) return;
    
    const updated = [...daySections];
    updated[pendingRestDayIndex].is_rest_day = true;
    updated[pendingRestDayIndex].exercises = [];
    setDaySections(updated);
    
    setShowRestDayConfirm(false);
    setPendingRestDayIndex(null);
  };

  const cancelRestDay = () => {
    setShowRestDayConfirm(false);
    setPendingRestDayIndex(null);
  };

  // Open Exercise Library
  const openExerciseLibrary = async (dayIndex: number) => {
    setCurrentDayIndex(dayIndex);
    setShowExerciseLibrary(true);
    setLoadingTemplates(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/exercise-templates/`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setExerciseTemplates(data.exercises || []);
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const searchExercises = async () => {
    setLoadingTemplates(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/exercise-templates/?search=${encodeURIComponent(searchQuery)}`;
      const response = await fetch(url, { credentials: 'include' });

      if (response.ok) {
        const data = await response.json();
        setExerciseTemplates(data.exercises || []);
      }
    } catch (error) {
      console.error('Error searching exercises:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Select exercise from library
  const selectExercise = (template: ExerciseTemplate) => {
    setSelectedTemplate(template);
    setNumberOfSets('3');
    // Initialize sets config
    const defaultSets: SetConfig[] = Array(3).fill(null).map((_, i) => ({
      reps: template.exercise_type === 'reps' ? '10' : '',
      time: template.exercise_type === 'time' ? '30' : '',
      rest: '60',
    }));
    setSetsConfig(defaultSets);
    setShowSetsConfig(true);
  };

  // Update number of sets
  const updateNumberOfSets = (num: number) => {
    setNumberOfSets(num.toString());
    const newConfig: SetConfig[] = Array(num).fill(null).map((_, i) => {
      if (i < setsConfig.length) {
        return setsConfig[i];
      }
      return {
        reps: selectedTemplate?.exercise_type === 'reps' ? '10' : '',
        time: selectedTemplate?.exercise_type === 'time' ? '30' : '',
        rest: '60',
      };
    });
    setSetsConfig(newConfig);
  };


  // Update individual set config
  const updateSetConfig = (setIndex: number, field: keyof SetConfig, value: string) => {
    const updated = [...setsConfig];
    updated[setIndex] = { ...updated[setIndex], [field]: value };
    setSetsConfig(updated);
  };

  // Complete exercise configuration
  const completeExerciseConfig = () => {
    if (!selectedTemplate || currentDayIndex === null) return;

    // Validate sets
    const isValid = setsConfig.every((set) => {
      if (selectedTemplate.exercise_type === 'reps') {
        return set.reps && parseInt(set.reps) > 0;
      } else {
        return set.time && parseInt(set.time) > 0;
      }
    });

    if (!isValid) {
      alert('Please fill in all set configurations');
      return;
    }

    // Create exercise with sets
    const newExercise: Exercise = {
      template_id: selectedTemplate.id,
      name: selectedTemplate.name,
      sets: setsConfig.map((set, index) => ({
        set_number: index + 1,
        reps: selectedTemplate.exercise_type === 'reps' ? parseInt(set.reps) : null,
        time: selectedTemplate.exercise_type === 'time' ? parseInt(set.time) : null,
        rest: parseInt(set.rest) || 0, // Default to 0 if empty
      })),
    };

    // Add to day section and unmark as rest day
    const updated = [...daySections];
    updated[currentDayIndex].exercises.push(newExercise);
    updated[currentDayIndex].is_rest_day = false;
    setDaySections(updated);

    // Close modals
    setShowSetsConfig(false);
    setShowExerciseLibrary(false);
    setSelectedTemplate(null);
    setCurrentDayIndex(null);
  };

  // Remove exercise from day
  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    const updated = [...daySections];
    updated[dayIndex].exercises = updated[dayIndex].exercises.filter((_, i) => i !== exerciseIndex);
    setDaySections(updated);
  };

  // Drag and drop handlers - ADD THESE HERE
  const handleDragStart = (dayIndex: number, exerciseIndex: number) => {
    setDraggedExercise({ dayIndex, exerciseIndex });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dayIndex: number, targetExerciseIndex: number) => {
    if (!draggedExercise || draggedExercise.dayIndex !== dayIndex) {
      setDraggedExercise(null);
      return;
    }

    const updated = [...daySections];
    const exercises = [...updated[dayIndex].exercises];
    
    // Remove from old position
    const [movedExercise] = exercises.splice(draggedExercise.exerciseIndex, 1);
    
    // Insert at new position
    exercises.splice(targetExerciseIndex, 0, movedExercise);
    
    updated[dayIndex].exercises = exercises;
    setDaySections(updated);
    setDraggedExercise(null);
  };

  const handleDragEnd = () => {
    setDraggedExercise(null);
  };


  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!programName.trim()) {
      newErrors.programName = 'Program name is required';
    }
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (focuses.length === 0) {
      newErrors.focuses = 'Select at least one focus';
    }

    const hasAtLeastOneWorkout = daySections.some((day) => day.exercises.length > 0);
    if (!hasAtLeastOneWorkout) {
      newErrors.sections = 'Add at least one workout day with exercises';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit program
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);

    const { workoutDays } = getWorkoutSummary();

    const programData = {
      name: programName,
      description,
      focus: focuses,
      difficulty,
      weekly_frequency: workoutDays,
      session_length: sessionLength,
      sections: daySections.map((section, index) => ({
        format: section.format,
        type: section.type,
        is_rest_day: section.exercises.length === 0 || section.is_rest_day,
        order: index,
        exercises: section.exercises.map((exercise, exIndex) => ({
          name: exercise.name,
          order: exIndex,
          sets: exercise.sets,
        })),
      })),
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/programs/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          credentials: 'include',
          body: JSON.stringify(programData),
        }
      );

      if (response.ok) {
        router.push('/trainer-programs');
      } else {
        const errorData = await response.json();
        console.error('Error creating program:', errorData);
        alert('Failed to create program');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (!user?.is_trainer) {
    return null;
  }

  const { workoutDays, restDays } = getWorkoutSummary();

  return (
    <ProtectedRoute>
      <div className="create-program-container">
        {/* Rest Day Confirmation Modal */}
        {showRestDayConfirm && (
          <div className="modal-overlay" onClick={cancelRestDay}>
            <div className="modal-content-small" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Mark as Rest Day?</h3>
                <button onClick={cancelRestDay} className="modal-close">×</button>
              </div>
              <div className="modal-body">
                <p>This day has {daySections[pendingRestDayIndex!]?.exercises.length} exercise(s).</p>
                <p className="modal-warning">Marking as rest day will remove all exercises.</p>
              </div>
              <div className="modal-actions">
                <button onClick={cancelRestDay} className="btn-modal-cancel">
                  Cancel
                </button>
                <button onClick={confirmRestDay} className="btn-modal-delete">
                  Mark as Rest Day
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Exercise Library Modal */}
        {showExerciseLibrary && (
          <div className="modal-overlay" onClick={() => setShowExerciseLibrary(false)}>
            <div className="modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Select Exercise</h3>
                <button onClick={() => setShowExerciseLibrary(false)} className="modal-close">
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="exercise-search">
                  <input
                    type="text"
                    placeholder="Search exercises..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchExercises()}
                    className="search-input"
                  />
                  <button onClick={searchExercises} className="btn-search-modal">
                    🔍 Search
                  </button>
                </div>

                {loadingTemplates ? (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                  </div>
                ) : (
                  <div className="exercise-list-modal">
                    {exerciseTemplates.length === 0 ? (
                      <div className="empty-state-modal">
                        <p>No exercises found</p>
                      </div>
                    ) : (
                      exerciseTemplates.map((template) => (
                        <div key={template.id} className="exercise-item-modal">
                          <div className="exercise-item-info">
                            <h4>{template.name}</h4>
                            <p>{template.description}</p>
                            <div className="exercise-item-meta">
                              <span className={`type-badge-small ${template.exercise_type}`}>
                                {template.exercise_type === 'reps' ? '🔢 Reps' : '⏱️ Time'}
                              </span>
                              <div className="muscle-tags-small">
                                {template.muscle_groups.slice(0, 2).map((group) => (
                                  <span key={group} className="muscle-tag-tiny">
                                    {group}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => selectExercise(template)}
                            className="btn-add-exercise"
                          >
                            + Add
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sets Configuration Modal */}
        {showSetsConfig && selectedTemplate && (
          <div className="modal-overlay">
            <div className="modal-medium" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Configure Sets - {selectedTemplate.name}</h3>
                <button
                  onClick={() => {
                    setShowSetsConfig(false);
                    setSelectedTemplate(null);
                  }}
                  className="modal-close"
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label>Number of Sets</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={numberOfSets}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value > 10) {
                        updateNumberOfSets(10);
                      } else if (value < 1 || isNaN(value)) {
                        updateNumberOfSets(1);
                      } else {
                        updateNumberOfSets(value);
                      }
                    }}
                    onBlur={(e) => {
                      // Ensure valid value on blur
                      const value = parseInt(e.target.value);
                      if (isNaN(value) || value < 1) {
                        updateNumberOfSets(1);
                      } else if (value > 10) {
                        updateNumberOfSets(10);
                      }
                    }}
                    className="form-input"
                  />
                </div>

                <div className="sets-config-container">
                  {setsConfig.map((set, index) => (
                    <div key={index} className="set-config-row">
                      <span className="set-label">Set {index + 1}</span>
                      
                      {selectedTemplate.exercise_type === 'reps' ? (
                        <div className="set-input-group">
                          <label>Reps</label>
                          <input
                            type="text"
                            value={set.reps}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d+$/.test(value)) {
                                updateSetConfig(index, 'reps', value);
                              }
                            }}
                            className="set-input"
                            placeholder="e.g., 10"
                          />
                        </div>
                      ) : (
                        <div className="set-input-group">
                          <label>Time (sec)</label>
                          <input
                            type="text"
                            value={set.time}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d+$/.test(value)) {
                                updateSetConfig(index, 'time', value);
                              }
                            }}
                            className="set-input"
                            placeholder="e.g., 30"
                          />
                        </div>
                      )}

                      <div className="set-input-group">
                        <label>Rest (sec)</label>
                        <input
                          type="text"
                          value={set.rest}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d+$/.test(value)) {
                              updateSetConfig(index, 'rest', value);
                            }
                          }}
                          className="set-input"
                          placeholder="e.g., 60"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  onClick={() => {
                    setShowSetsConfig(false);
                    setSelectedTemplate(null);
                  }}
                  className="btn-modal-cancel"
                >
                  Cancel
                </button>
                <button onClick={completeExerciseConfig} className="btn-modal-confirm">
                  Add to Program
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="header">
          <button className="back-button" onClick={() => router.push('/dashboard')}>
            ← Back
          </button>
          <h1>Create Workout Program</h1>
        </div>

        <div className="content">
          <form onSubmit={handleSubmit} className="create-form">
            {/* Program Details */}
            <div className="form-section">
              <h2>Program Details</h2>

              <div className="form-group">
                <label>Program Name *</label>
                <input
                  type="text"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="e.g., Beginner Strength Training"
                  className={`form-input ${errors.programName ? 'input-error' : ''}`}
                />
                {errors.programName && <span className="error-text">{errors.programName}</span>}
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your program..."
                  rows={4}
                  className={`form-textarea ${errors.description ? 'input-error' : ''}`}
                />
                {errors.description && <span className="error-text">{errors.description}</span>}
              </div>

              <div className="form-group">
                <label>Focus Areas *</label>
                <div className="focus-options">
                  {focusOptions.map((option) => (
                    <label key={option.value} className="focus-checkbox">
                      <input
                        type="checkbox"
                        checked={focuses.includes(option.value)}
                        onChange={() => handleFocusToggle(option.value)}
                      />
                      <span>
                        {option.icon} {option.label}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.focuses && <span className="error-text">{errors.focuses}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="form-select"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Session Length (min)</label>
                  <input
                    type="number"
                    min="15"
                    max="180"
                    value={sessionLength}
                    onChange={(e) => setSessionLength(parseInt(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Weekly Schedule */}
            <div className="form-section">
              <div className="section-header">
                <h2>Weekly Schedule</h2>
                <div className="workout-summary">
                  <span className="summary-badge workout-badge">
                    🏋️ {workoutDays} Workout {workoutDays !== 1 ? 'Days' : 'Day'}
                  </span>
                  <span className="summary-badge rest-badge">
                    💤 {restDays} Rest {restDays !== 1 ? 'Days' : 'Day'}
                  </span>
                </div>
              </div>

              {errors.sections && <span className="error-text">{errors.sections}</span>}

              <div className="weekly-grid">
                {daySections.map((section, dayIndex) => {
                  const isRestDay = section.is_rest_day || section.exercises.length === 0;
                  const isWorkoutDay = section.exercises.length > 0;

                  return (
                    <div key={dayIndex} className={`day-card ${isRestDay ? 'rest-day' : 'workout-day'}`}>
                      <div className="day-card-header">
                        <div className="day-title-section">
                          <h3 className="day-name">{section.format}</h3>
                          <input
                            type="text"
                            value={section.type}
                            onChange={(e) => updateDayDescription(dayIndex, e.target.value)}
                            placeholder="e.g., Upper Body, Chest Day"
                            className="day-description-input"
                            maxLength={30}
                          />
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => toggleRestDay(dayIndex)}
                          className={`btn-rest-toggle ${section.is_rest_day ? 'active' : ''}`}
                          title={section.is_rest_day ? 'Mark as Workout Day' : 'Mark as Rest Day'}
                        >
                          {section.is_rest_day ? '💤 Rest' : '🏋️'}
                        </button>
                      </div>

                      <div className="day-card-body">
                        {section.is_rest_day ? (
                          <div className="rest-day-indicator">
                            <span className="rest-icon">💤</span>
                            <p>Rest Day</p>
                          </div>
                        ) : (
                          <>
                            {section.exercises.length === 0 ? (
                              <p className="no-exercises-hint">No exercises added yet</p>
                            ) : (
                              <div className="day-exercises-list">
                              
                                {section.exercises.map((exercise, exIndex) => (
                                  <div
                                    key={exIndex}
                                    draggable
                                    onDragStart={() => handleDragStart(dayIndex, exIndex)}
                                    onDragOver={handleDragOver}
                                    onDrop={() => handleDrop(dayIndex, exIndex)}
                                    onDragEnd={handleDragEnd}
                                    className={`exercise-item-compact ${
                                      draggedExercise?.dayIndex === dayIndex &&
                                      draggedExercise?.exerciseIndex === exIndex
                                        ? 'dragging'
                                        : ''
                                    }`}
                                  >
                                    <div className="exercise-compact-header">
                                      <span className="drag-handle">⋮⋮</span>
                                      <span className="exercise-number">{exIndex + 1}</span>
                                      <h4>{exercise.name}</h4>
                                      <button
                                        type="button"
                                        onClick={() => removeExercise(dayIndex, exIndex)}
                                        className="btn-remove-exercise-small"
                                      >
                                        ×
                                      </button>
                                    </div>
                                    <div className="exercise-sets-compact">
                                      {exercise.sets.map((set, setIndex) => (
                                        <span key={setIndex} className="set-chip">
                                          {set.set_number}: {set.reps ? `${set.reps} reps` : `${set.time}s`} | Rest: {set.rest || 0}s
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => openExerciseLibrary(dayIndex)}
                              className="btn-add-exercise-card"
                            >
                              + Add Exercise
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <div className="form-actions">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="btn-cancel-form"
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-submit">
                {saving ? 'Creating...' : 'Create Program'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default CreateProgramPage;
