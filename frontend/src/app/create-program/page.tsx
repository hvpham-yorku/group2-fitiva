'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './create-program.css';

// ============================================================================
// TYPES
// ============================================================================

interface Exercise {
  name: string;
  sets: Array<{
    reps?: number;
    time?: number;
    rest: number;
  }>;
}

interface Section {
  id: string;
  dayNumber: number;
  title: string;
  exercises: Exercise[];
}

type ViewType = 'main' | 'add-exercise' | 'exercise-details';

type InvalidFieldKey =
  | 'programName'
  | 'programFocus'
  | 'programDifficulty'
  | 'weeklyFrequency'
  | 'sessionLength'
  | 'sections';

// ============================================================================
// CONSTANTS
// ============================================================================

const FOCUS_OPTIONS = [
  { value: '', label: 'Select Focus' },
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'balance', label: 'Balance' },
];

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'Select Difficulty' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const TIME_PRESETS = [
  { value: '', label: 'Quick' },
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 45, label: '45s' },
  { value: 60, label: '1m' },
  { value: 90, label: '1m 30s' },
  { value: 120, label: '2m' },
  { value: 180, label: '3m' },
  { value: 240, label: '4m' },
  { value: 300, label: '5m' },
];

const API_BASE_URL = 'http://localhost:8000/api';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const trimmedCookie = cookie.trim();
    if (trimmedCookie.startsWith(`${name}=`)) {
      return decodeURIComponent(trimmedCookie.substring(name.length + 1));
    }
  }
  return null;
}

function formatTime(seconds: number): string {
  if (!seconds) return '0 sec';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs} sec`;
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs} sec`;
}

// ============================================================================
// VALIDATION
// ============================================================================

function getInvalidFields(
  programName: string,
  programFocus: string,
  programDifficulty: string,
  weeklyFrequency: number,
  sessionLength: number,
  sections: Section[]
): InvalidFieldKey[] {
  const invalid: InvalidFieldKey[] = [];

  if (!programName.trim()) invalid.push('programName');
  if (!programFocus) invalid.push('programFocus');
  if (!programDifficulty) invalid.push('programDifficulty');
  if (!weeklyFrequency || weeklyFrequency < 1 || weeklyFrequency > 7) {
    invalid.push('weeklyFrequency');
  }
  if (!sessionLength || sessionLength < 15) invalid.push('sessionLength');
  if (sections.length === 0 || sections.some(s => s.exercises.length === 0)) {
    invalid.push('sections');
  }

  return invalid;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CreateProgramPage() {
  const router = useRouter();

  // Invalid fields tracking
  const [invalidFields, setInvalidFields] = useState<InvalidFieldKey[]>([]);

  // View state
  const [currentView, setCurrentView] = useState<ViewType>('main');

  // Program details
  const [programName, setProgramName] = useState('');
  const [programDescription, setProgramDescription] = useState('');
  const [programFocus, setProgramFocus] = useState('');
  const [programDifficulty, setProgramDifficulty] = useState('');
  const [weeklyFrequency, setWeeklyFrequency] = useState<number>(0);
  const [sessionLength, setSessionLength] = useState<number>(60);

  // Sections generated from weeklyFrequency
  const [sections, setSections] = useState<Section[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Exercise state
  const [currentSectionId, setCurrentSectionId] = useState('');
  const [currentExercise, setCurrentExercise] = useState<Exercise>({
    name: '',
    sets: [{ reps: 0, time: 0, rest: 0 }],
  });

  // Auto-clear invalid fields after 3 seconds
  useEffect(() => {
    if (invalidFields.length > 0) {
      const timer = setTimeout(() => {
        setInvalidFields([]);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [invalidFields]);

  // --------------------------------------------------------------------------
  // Regenerate sections when weeklyFrequency changes
  // --------------------------------------------------------------------------

  const regenerateSections = (days: number) => {
    if (days <= 0) {
      setSections([]);
      return;
    }

    setSections(prev => {
      const existingByDay = new Map(prev.map(s => [s.dayNumber, s]));
      const next: Section[] = [];
      for (let day = 1; day <= days; day++) {
        const existing = existingByDay.get(day);
        if (existing) {
          next.push(existing);
        } else {
          next.push({
            id: `day-${day}`,
            dayNumber: day,
            title: `Day ${day}`,
            exercises: [],
          });
        }
      }
      return next;
    });
  };

  // --------------------------------------------------------------------------
  // Event Handlers - Exercises
  // --------------------------------------------------------------------------

  const handleAddExerciseToSection = (sectionId: string) => {
    setCurrentSectionId(sectionId);
    setCurrentView('add-exercise');
  };

  const handleExerciseSelect = () => {
    setCurrentView('exercise-details');
  };

  const handleAddSet = () => {
    setCurrentExercise(prev => ({
      ...prev,
      sets: [...prev.sets, { reps: 0, time: 0, rest: 0 }],
    }));
  };

  const handleSetChange = (index: number, field: 'reps' | 'time' | 'rest', value: number) => {
    setCurrentExercise(prev => {
      const newSets = [...prev.sets];
      newSets[index] = { ...newSets[index], [field]: value };
      return { ...prev, sets: newSets };
    });
  };

  const handleSaveExercise = () => {
    if (!currentSectionId) return;

    setSections(prev =>
      prev.map(section =>
        section.id === currentSectionId
          ? { ...section, exercises: [...section.exercises, currentExercise] }
          : section
      )
    );

    setCurrentExercise({ name: '', sets: [{ reps: 0, time: 0, rest: 0 }] });
    setCurrentSectionId('');
    setCurrentView('main');
  };

  // --------------------------------------------------------------------------
  // Save Program
  // --------------------------------------------------------------------------

  const handleFinalSave = async () => {
    // Check for invalid fields
    const invalid = getInvalidFields(
      programName,
      programFocus,
      programDifficulty,
      weeklyFrequency,
      sessionLength,
      sections
    );

    if (invalid.length > 0) {
      setInvalidFields(invalid);
      // Scroll to first invalid field
      const firstInvalid = document.querySelector('.field-invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSaving(true);

    const formattedSections = sections.map(section => ({
      format: section.title,
      type: 'day',
      exercises: section.exercises.map(exercise => ({
        name: exercise.name,
        sets: exercise.sets.map((set, index) => ({
          set_number: index + 1,
          reps: set.reps || null,
          time: set.time || null,
          rest: set.rest || 0,
        })),
      })),
    }));

    const payload = {
      name: programName,
      description: programDescription,
      focus: programFocus,
      difficulty: programDifficulty,
      weekly_frequency: weeklyFrequency,
      session_length: sessionLength,
      sections: formattedSections,
    };

    try {
      const csrfToken = getCookie('csrftoken');

      const response = await fetch(`${API_BASE_URL}/programs/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Program created successfully!');
        router.push('/trainer-programs');
      } else {
        console.error('Error response:', data);
        alert(`Failed to create program: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error creating program: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  // Main View
  if (currentView === 'main') {
    return (
      <div className="create-program-container">
        <div className="header">
          <button onClick={() => router.push('/dashboard')} className="back-button">
            ← Back
          </button>
          <h1>Create Workout Program</h1>
        </div>

        <div className="content">
          {/* Program Name */}
          <div className="form-group">
            <label>Program Name *</label>
            <input
              type="text"
              value={programName}
              onChange={e => setProgramName(e.target.value)}
              placeholder="Enter program name"
              className={`input-field ${invalidFields.includes('programName') ? 'field-invalid' : ''}`}
              required
            />
            {invalidFields.includes('programName') && (
              <span className="field-error">Program name is required</span>
            )}
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={programDescription}
              onChange={e => setProgramDescription(e.target.value)}
              placeholder="Enter program description"
              className="input-field textarea-field"
              rows={3}
            />
          </div>

          {/* Focus */}
          <div className="form-group">
            <label>Focus *</label>
            <select
              value={programFocus}
              onChange={e => setProgramFocus(e.target.value)}
              className={`input-field ${invalidFields.includes('programFocus') ? 'field-invalid' : ''}`}
              required
            >
              {FOCUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {invalidFields.includes('programFocus') && (
              <span className="field-error">Please select a focus</span>
            )}
          </div>

          {/* Difficulty */}
          <div className="form-group">
            <label>Difficulty *</label>
            <select
              value={programDifficulty}
              onChange={e => setProgramDifficulty(e.target.value)}
              className={`input-field ${invalidFields.includes('programDifficulty') ? 'field-invalid' : ''}`}
              required
            >
              {DIFFICULTY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {invalidFields.includes('programDifficulty') && (
              <span className="field-error">Please select a difficulty</span>
            )}
          </div>

          {/* Frequency and Length */}
          <div className="form-row">
            <div className="form-group">
              <label>Weekly Frequency (days) *</label>
              <input
                type="number"
                value={weeklyFrequency || ''}
                onChange={e => {
                  const raw = parseInt(e.target.value, 10);
                  if (Number.isNaN(raw)) {
                    setWeeklyFrequency(0);
                    regenerateSections(0);
                    return;
                  }
                  const clamped = Math.max(0, Math.min(7, raw));
                  setWeeklyFrequency(clamped);
                  regenerateSections(clamped);
                }}
                min={1}
                max={7}
                className={`input-field ${invalidFields.includes('weeklyFrequency') ? 'field-invalid' : ''}`}
                required
              />
              {invalidFields.includes('weeklyFrequency') && (
                <span className="field-error">Must be between 1-7 days</span>
              )}
            </div>

            <div className="form-group">
              <label>Session Length (minutes) *</label>
              <input
                type="number"
                value={sessionLength}
                onChange={e => setSessionLength(parseInt(e.target.value, 10) || 0)}
                min={15}
                max={180}
                className={`input-field ${invalidFields.includes('sessionLength') ? 'field-invalid' : ''}`}
                required
              />
              {invalidFields.includes('sessionLength') && (
                <span className="field-error">Minimum 15 minutes required</span>
              )}
            </div>
          </div>

          {/* Sections (Days) */}
          <div className={`sections-container ${invalidFields.includes('sections') ? 'sections-invalid' : ''}`}>
            <h2>Sections (Days)</h2>
            {sections.length === 0 && (
              <div className="exercise-item empty">
                Set weekly frequency (1–7) to generate days.
              </div>
            )}

            {sections.map(section => (
              <div key={section.id} className="section-card">
                <div className="section-header">
                  <div>
                    <strong>{section.title}</strong>
                  </div>
                  <button
                    onClick={() => handleAddExerciseToSection(section.id)}
                    className="btn-small"
                  >
                    + Add Exercise
                  </button>
                </div>

                <div className="exercises-list">
                  {section.exercises.length === 0 ? (
                    <div className="exercise-item empty">No exercises added yet</div>
                  ) : (
                    section.exercises.map((ex, idx) => (
                      <div key={idx} className="exercise-item">
                        {ex.name} – {ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}

            {invalidFields.includes('sections') && (
              <div className="field-error sections-error">
                Please add at least one exercise to each day
              </div>
            )}
          </div>

          {/* Save */}
          <button
            onClick={handleFinalSave}
            className="btn-save"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Program'}
          </button>
        </div>
      </div>
    );
  }

  // Add Exercise View (placeholder selection)
  if (currentView === 'add-exercise') {
    return (
      <div className="create-program-container">
        <div className="header">
          <button onClick={() => setCurrentView('main')} className="back-button">
            ← Back
          </button>
          <h1>Add Exercise</h1>
        </div>

        <div className="content">
          <p className="placeholder-text">
            Exercise selection will be implemented in User Story 1.5
          </p>
          <button onClick={handleExerciseSelect} className="btn-primary">
            Continue to Exercise Details
          </button>
        </div>
      </div>
    );
  }

  // Exercise Details View
  if (currentView === 'exercise-details') {
    return (
      <div className="create-program-container">
        <div className="header">
          <button onClick={() => setCurrentView('add-exercise')} className="back-button">
            ← Back
          </button>
          <h1>Exercise Details</h1>
        </div>

        <div className="content">
          {/* Exercise Name */}
          <div className="form-group">
            <label>Exercise Name</label>
            <input
              type="text"
              value={currentExercise.name}
              onChange={e =>
                setCurrentExercise(prev => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter exercise name"
              className="input-field"
            />
          </div>

          {/* Sets Table */}
          <div className="sets-container">
            <h3>Sets</h3>
            <div className="table-wrapper">
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
                  {currentExercise.sets.map((set, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>
                        <input
                          type="number"
                          value={set.reps ?? ''}
                          onChange={e =>
                            handleSetChange(
                              index,
                              'reps',
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          className="input-small"
                          placeholder="0"
                          min="0"
                        />
                      </td>
                      <td>
                        <div className="time-input-group">
                          <select
                            onChange={e => {
                              const value = parseInt(e.target.value, 10);
                              if (value > 0) {
                                handleSetChange(index, 'time', value);
                              }
                            }}
                            className="input-small dropdown"
                            defaultValue=""
                          >
                            {TIME_PRESETS.map(preset => (
                              <option key={preset.value} value={preset.value}>
                                {preset.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={set.time ?? ''}
                            onChange={e =>
                              handleSetChange(
                                index,
                                'time',
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            className="input-small"
                            placeholder="sec"
                            min="0"
                          />
                          {set.time && set.time > 0 && (
                            <span className="time-display">
                              {formatTime(set.time)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="time-input-group">
                          <select
                            onChange={e => {
                              const value = parseInt(e.target.value, 10);
                              if (value > 0) {
                                handleSetChange(index, 'rest', value);
                              }
                            }}
                            className="input-small dropdown"
                            defaultValue=""
                          >
                            {TIME_PRESETS.map(preset => (
                              <option key={preset.value} value={preset.value}>
                                {preset.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={set.rest ?? ''}
                            onChange={e =>
                              handleSetChange(
                                index,
                                'rest',
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            className="input-small"
                            placeholder="sec"
                            min="0"
                          />
                          {set.rest && set.rest > 0 && (
                            <span className="time-display">
                              {formatTime(set.rest)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={handleAddSet} className="btn-add-set">
              + Add Set
            </button>
          </div>

          <button
            onClick={handleSaveExercise}
            className="btn-save"
            disabled={!currentExercise.name.trim()}
          >
            Save Exercise
          </button>
        </div>
      </div>
    );
  }

  return null;
}
