'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import './create-program.css';

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
  format: string;
  type: string;
  exercises: Exercise[];
}

// Helper function to get CSRF token from cookies
function getCookie(name: string): string | null {
  let cookieValue = null;
  if (typeof document !== 'undefined' && document.cookie && document.cookie !== '') {
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

// Helper function to format seconds to "X min Y sec"
function formatTime(seconds: number): string {
  if (seconds === 0) return '0 sec';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (mins === 0) {
    return `${secs} sec`;
  } else if (secs === 0) {
    return `${mins} min`;
  } else {
    return `${mins} min ${secs} sec`;
  }
}

export default function CreateProgramPage() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<'main' | 'add-section' | 'add-exercise' | 'exercise-details'>('main');
  
  // Program details
  const [programName, setProgramName] = useState('');
  const [programDescription, setProgramDescription] = useState('');
  const [programFocus, setProgramFocus] = useState('');
  const [programDifficulty, setProgramDifficulty] = useState('');
  const [weeklyFrequency, setWeeklyFrequency] = useState<number>(3);
  const [sessionLength, setSessionLength] = useState<number>(60);
  const [isSubscription, setIsSubscription] = useState(false);
  
  const [sections, setSections] = useState<Section[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // For adding section
  const [newSection, setNewSection] = useState({
    format: '',
    type: ''
  });
  
  // For adding exercise
  const [currentSectionId, setCurrentSectionId] = useState('');
  const [currentExercise, setCurrentExercise] = useState<Exercise>({
    name: '',
    sets: [{ reps: 0, time: 0, rest: 0 }]
  });

  const handleAddSection = () => {
    setCurrentView('add-section');
    setNewSection({ format: '', type: '' });
  };

  const handleSectionSubmit = () => {
    if (newSection.format && newSection.type) {
      const section: Section = {
        id: Date.now().toString(),
        format: newSection.format,
        type: newSection.type,
        exercises: []
      };
      setSections([...sections, section]);
      setCurrentView('main');
    }
  };

  const handleAddExerciseToSection = (sectionId: string) => {
    setCurrentSectionId(sectionId);
    setCurrentView('add-exercise');
  };

  const handleExerciseSelect = () => {
    setCurrentView('exercise-details');
  };

  const handleAddSet = () => {
    setCurrentExercise({
      ...currentExercise,
      sets: [...currentExercise.sets, { reps: 0, time: 0, rest: 0 }]
    });
  };

  const handleSetChange = (index: number, field: 'reps' | 'time' | 'rest', value: number) => {
    const newSets = [...currentExercise.sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setCurrentExercise({ ...currentExercise, sets: newSets });
  };

  const handleSaveExercise = () => {
    const updatedSections = sections.map(section => {
      if (section.id === currentSectionId) {
        return {
          ...section,
          exercises: [...section.exercises, currentExercise]
        };
      }
      return section;
    });
    setSections(updatedSections);
    setCurrentView('main');
    setCurrentExercise({ name: '', sets: [{ reps: 0, time: 0, rest: 0 }] });
  };

  // Check if the form is valid for saving
  const canSaveProgram = (): boolean => {
    if (!programName.trim()) return false;
    if (!programFocus) return false;
    if (!programDifficulty) return false;
    if (!weeklyFrequency || weeklyFrequency < 1) return false;
    if (!sessionLength || sessionLength < 15) return false;
    if (sections.length === 0) return false;
    
    const allSectionsHaveExercises = sections.every(section => section.exercises.length > 0);
    if (!allSectionsHaveExercises) return false;
    
    return true;
  };

  const handleFinalSave = async () => {
    if (!canSaveProgram()) {
      alert('Please ensure:\n- Program has a name\n- Focus is selected\n- Difficulty is selected\n- Weekly frequency is set\n- Session length is set\n- At least one section exists\n- Each section has at least one exercise');
      return;
    }

    setIsSaving(true);

    // Transform sections data to match backend format
    const formattedSections = sections.map((section) => ({
      format: section.format,
      type: section.type,
      exercises: section.exercises.map((exercise) => ({
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
      is_subscription: isSubscription,
      sections: formattedSections,
    };

    console.log('Sending payload:', JSON.stringify(payload, null, 2));

    try {
      const csrfToken = getCookie('csrftoken');

      const response = await fetch('http://localhost:8000/api/programs/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Response:', data);

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
          <div className="form-group">
            <label>Program Name *</label>
            <input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="Enter program name"
              className="input-field"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={programDescription}
              onChange={(e) => setProgramDescription(e.target.value)}
              placeholder="Enter program description"
              className="input-field textarea-field"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Focus *</label>
            <select 
              value={programFocus} 
              onChange={(e) => setProgramFocus(e.target.value)}
              className="input-field"
              required
            >
              <option value="">Select Focus</option>
              <option value="strength">Strength</option>
              <option value="cardio">Cardio</option>
              <option value="flexibility">Flexibility</option>
              <option value="balance">Balance</option>
            </select>
          </div>

          <div className="form-group">
            <label>Difficulty *</label>
            <select 
              value={programDifficulty} 
              onChange={(e) => setProgramDifficulty(e.target.value)}
              className="input-field"
              required
            >
              <option value="">Select Difficulty</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Weekly Frequency (days) *</label>
              <input
                type="number"
                value={weeklyFrequency}
                onChange={(e) => setWeeklyFrequency(parseInt(e.target.value) || 0)}
                min="1"
                max="7"
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label>Session Length (minutes) *</label>
              <input
                type="number"
                value={sessionLength}
                onChange={(e) => setSessionLength(parseInt(e.target.value) || 0)}
                min="15"
                max="180"
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={isSubscription}
                onChange={(e) => setIsSubscription(e.target.checked)}
              />
              <span>Subscription Required</span>
            </label>
          </div>

          <div className="sections-container">
            <h2>Sections</h2>
            {sections.map((section) => (
              <div key={section.id} className="section-card">
                <div className="section-header">
                  <div>
                    <strong>{section.format}</strong> - {section.type}
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
                        {ex.name} - {ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleAddSection} className="btn-add-section">
            + Add Section
          </button>

          <button 
            onClick={handleFinalSave} 
            className="btn-save"
            disabled={!canSaveProgram() || isSaving}
            style={{
              opacity: canSaveProgram() && !isSaving ? 1 : 0.5,
              cursor: canSaveProgram() && !isSaving ? 'pointer' : 'not-allowed',
            }}
          >
            {isSaving ? 'Saving...' : 'Save Program'}
          </button>

          {!canSaveProgram() && (
            <div className="validation-hint">
              ⚠️ Required: {!programName.trim() && 'Program name. '}
              {!programFocus && 'Focus. '}
              {!programDifficulty && 'Difficulty. '}
              {(!weeklyFrequency || weeklyFrequency < 1) && 'Weekly frequency. '}
              {(!sessionLength || sessionLength < 15) && 'Session length. '}
              {sections.length === 0 && 'At least one section. '}
              {sections.some(s => s.exercises.length === 0) && 'All sections need exercises.'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Add Section View - NEW CIRCULAR DESIGN
  if (currentView === 'add-section') {
    return (
      <div className="create-program-container">
        <div className="header">
          <button onClick={() => setCurrentView('main')} className="back-button">
            ← Back
          </button>
          <h1>Add Section</h1>
        </div>

        <div className="content">
          <div className="form-group">
            <label>Section Format</label>
            <div className="options-grid-modal">
              {['Straight Sets', 'Superset', 'Triset', 'Giant Set', 'Circuit'].map((format) => (
                <button
                  key={format}
                  onClick={() => setNewSection({ ...newSection, format })}
                  className={`option-btn-modal ${newSection.format === format ? 'active-orange' : ''}`}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Section Type</label>
            <div className="options-grid-modal">
              {['Warm Up', 'Working Sets', 'Drop Sets', 'Cool Down'].map((type) => (
                <button
                  key={type}
                  onClick={() => setNewSection({ ...newSection, type })}
                  className={`option-btn-modal ${newSection.type === type ? 'active-orange' : ''}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleSectionSubmit}
            disabled={!newSection.format || !newSection.type}
            className="btn-update-orange"
          >
            Add Section
          </button>
        </div>
      </div>
    );
  }

  // Add Exercise View
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
          <p className="placeholder-text">Exercise selection will be implemented in User Story 1.5</p>
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
          <div className="form-group">
            <label>Exercise Name</label>
            <input
              type="text"
              value={currentExercise.name}
              onChange={(e) => setCurrentExercise({ ...currentExercise, name: e.target.value })}
              placeholder="Enter exercise name"
              className="input-field"
            />
          </div>

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
                          value={set.reps || ''}
                          onChange={(e) => handleSetChange(index, 'reps', parseInt(e.target.value) || 0)}
                          className="input-small"
                          placeholder="0"
                          min="0"
                        />
                      </td>
                      <td>
                        <div className="time-input-group">
                          <select
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (value > 0) {
                                handleSetChange(index, 'time', value);
                              }
                            }}
                            className="input-small dropdown"
                            defaultValue=""
                          >
                            <option value="">Quick</option>
                            <option value="15">15s</option>
                            <option value="30">30s</option>
                            <option value="45">45s</option>
                            <option value="60">1m</option>
                            <option value="90">1m 30s</option>
                            <option value="120">2m</option>
                            <option value="180">3m</option>
                            <option value="240">4m</option>
                            <option value="300">5m</option>
                          </select>
                          <input
                            type="number"
                            value={set.time || ''}
                            onChange={(e) => handleSetChange(index, 'time', parseInt(e.target.value) || 0)}
                            className="input-small"
                            placeholder="sec"
                            min="0"
                          />
                          {set.time && set.time > 0 && (
                            <span className="time-display">{formatTime(set.time)}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="time-input-group">
                          <select
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (value > 0) {
                                handleSetChange(index, 'rest', value);
                              }
                            }}
                            className="input-small dropdown"
                            defaultValue=""
                          >
                            <option value="">Quick</option>
                            <option value="15">15s</option>
                            <option value="30">30s</option>
                            <option value="45">45s</option>
                            <option value="60">1m</option>
                            <option value="90">1m 30s</option>
                            <option value="120">2m</option>
                            <option value="180">3m</option>
                            <option value="240">4m</option>
                            <option value="300">5m</option>
                          </select>
                          <input
                            type="number"
                            value={set.rest || ''}
                            onChange={(e) => handleSetChange(index, 'rest', parseInt(e.target.value) || 0)}
                            className="input-small"
                            placeholder="sec"
                            min="0"
                          />
                          {set.rest && set.rest > 0 && (
                            <span className="time-display">{formatTime(set.rest)}</span>
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