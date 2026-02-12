'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import './add-exercise.css';

// Helper function to get CSRF token from cookies
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

interface ExerciseTemplate {
  id: number;
  name: string;
  description: string;
  muscle_groups: string[];
  exercise_type: 'reps' | 'time';
  default_recommendations: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const MUSCLE_GROUP_OPTIONS = [
  { value: 'chest', label: 'Chest' },
  { value: 'quads/hamstrings', label: 'Quads/Hamstrings' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'biceps', label: 'Biceps' },
  { value: 'triceps', label: 'Triceps' },
  { value: 'core', label: 'Core' },
  { value: 'full body', label: 'Full Body' },
];

const AddExercisePage = () => {
  const router = useRouter();
  const { user } = useAuth();
  const formRef = useRef<HTMLDivElement>(null);

  const [exercises, setExercises] = useState<ExerciseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseTemplate | null>(null);
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    muscle_groups: [] as string[],
    exercise_type: 'reps' as 'reps' | 'time',
    default_recommendations: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && !user.is_trainer) {
      router.push('/dashboard');
    } else {
      fetchExercises();
    }
  }, [user]);

  const fetchExercises = async (search = '') => {
    try {
      const url = search
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/exercise-templates/?search=${encodeURIComponent(search)}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/exercise-templates/`;

      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setExercises(data.exercises || []);
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    fetchExercises(searchQuery);
  };

  const handleMuscleGroupToggle = (group: string) => {
    setFormData((prev) => ({
      ...prev,
      muscle_groups: prev.muscle_groups.includes(group)
        ? prev.muscle_groups.filter((g) => g !== group)
        : [...prev.muscle_groups, group],
    }));
    setFormErrors((prev) => ({ ...prev, muscle_groups: '' }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Exercise name is required';
    }
    if (!formData.description.trim()) {
      errors.description = 'Description/instructions are required';
    }
    if (formData.muscle_groups.length === 0) {
      errors.muscle_groups = 'Select at least one muscle group';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);
    setFormErrors({});

    try {
      const url = editingExercise
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/exercise-templates/${editingExercise.id}/`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/exercise-templates/`;

      const method = editingExercise ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateForm(false);
        setEditingExercise(null);
        resetForm();
        fetchExercises(searchQuery);
      } else {
        const errorData = await response.json();
        setFormErrors(errorData);
      }
    } catch (error) {
      console.error('Error saving exercise:', error);
      setFormErrors({ detail: 'Failed to save exercise' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (exercise: ExerciseTemplate) => {
    setEditingExercise(exercise);
    setFormData({
      name: exercise.name,
      description: exercise.description,
      muscle_groups: exercise.muscle_groups,
      exercise_type: exercise.exercise_type,
      default_recommendations: exercise.default_recommendations,
    });
    setShowCreateForm(true);
    
    // Scroll to form smoothly
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDeleteClick = (exerciseId: number) => {
    setExerciseToDelete(exerciseId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!exerciseToDelete) return;

    setDeleting(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/exercise-templates/${exerciseToDelete}/`,
        {
          method: 'DELETE',
          headers: {
            'X-CSRFToken': getCsrfToken(),
          },
          credentials: 'include',
        }
      );

      if (response.ok) {
        setShowDeleteModal(false);
        setExerciseToDelete(null);
        fetchExercises(searchQuery);
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setExerciseToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      muscle_groups: [],
      exercise_type: 'reps',
      default_recommendations: '',
    });
    setFormErrors({});
    setEditingExercise(null);
  };

  const handleCancelForm = () => {
    setShowCreateForm(false);
    resetForm();
  };

  if (!user?.is_trainer) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="exercise-library-container">
        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="modal-overlay" onClick={cancelDelete}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Delete Exercise</h3>
                <button onClick={cancelDelete} className="modal-close">×</button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this exercise?</p>
                <p className="modal-warning">This action cannot be undone.</p>
              </div>
              <div className="modal-actions">
                <button onClick={cancelDelete} className="btn-modal-cancel" disabled={deleting}>
                  Cancel
                </button>
                <button onClick={confirmDelete} className="btn-modal-delete" disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete Exercise'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="header">
          <button className="back-button" onClick={() => router.push('/dashboard')}>
            ← Back to Dashboard
          </button>
          <h1>Exercise Library</h1>
        </div>

        <div className="content">
          {/* Action Bar */}
          <div className="action-bar">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search exercises by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="search-input"
              />
              <button onClick={handleSearch} className="btn-search">
                🔍 Search
              </button>
            </div>
            <button
              onClick={() => {
                setShowCreateForm(true);
                setTimeout(() => {
                  formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
              className="btn-create-exercise"
            >
              + Create New Exercise
            </button>
          </div>

          {/* Create/Edit Form */}
          {showCreateForm && (
            <div className="form-card" ref={formRef}>
              <div className="form-header">
                <h2>{editingExercise ? 'Edit Exercise' : 'Create New Exercise'}</h2>
                <button onClick={handleCancelForm} className="btn-close">
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="exercise-form">
                {formErrors.detail && (
                  <div className="error-alert">{formErrors.detail}</div>
                )}

                {/* Exercise Name */}
                <div className="form-group">
                  <label>
                    Exercise Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Barbell Squats"
                    className={`form-input ${formErrors.name ? 'input-error' : ''}`}
                  />
                  {formErrors.name && (
                    <span className="error-text">{formErrors.name}</span>
                  )}
                </div>

                {/* Description */}
                <div className="form-group">
                  <label>
                    Instructions/Description <span className="required">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe how to perform this exercise..."
                    rows={4}
                    className={`form-textarea ${
                      formErrors.description ? 'input-error' : ''
                    }`}
                  />
                  {formErrors.description && (
                    <span className="error-text">{formErrors.description}</span>
                  )}
                </div>

                {/* Exercise Type */}
                <div className="form-group">
                  <label>
                    Exercise Type <span className="required">*</span>
                  </label>
                  <div className="radio-group">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="exercise_type"
                        value="reps"
                        checked={formData.exercise_type === 'reps'}
                        onChange={() =>
                          setFormData({ ...formData, exercise_type: 'reps' })
                        }
                      />
                      <span>Rep-based (e.g., Push-ups, Squats)</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="exercise_type"
                        value="time"
                        checked={formData.exercise_type === 'time'}
                        onChange={() =>
                          setFormData({ ...formData, exercise_type: 'time' })
                        }
                      />
                      <span>Time-based (e.g., Plank, Running)</span>
                    </label>
                  </div>
                </div>

                {/* Muscle Groups */}
                <div className="form-group">
                  <label>
                    Target Muscle Groups <span className="required">*</span>
                  </label>
                  <div className="muscle-groups-grid">
                    {MUSCLE_GROUP_OPTIONS.map((option) => (
                      <label key={option.value} className="muscle-group-checkbox">
                        <input
                          type="checkbox"
                          checked={formData.muscle_groups.includes(option.value)}
                          onChange={() => handleMuscleGroupToggle(option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {formErrors.muscle_groups && (
                    <span className="error-text">{formErrors.muscle_groups}</span>
                  )}
                </div>

                {/* Default Recommendations */}
                <div className="form-group">
                  <label>Default Recommendations (Optional)</label>
                  <input
                    type="text"
                    value={formData.default_recommendations}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        default_recommendations: e.target.value,
                      })
                    }
                    placeholder="e.g., 3-4 sets of 8-12 reps"
                    className="form-input"
                  />
                </div>

                {/* Form Actions */}
                <div className="form-actions">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="btn-cancel"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn-save">
                    {saving
                      ? 'Saving...'
                      : editingExercise
                      ? 'Update Exercise'
                      : 'Create Exercise'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Exercise List */}
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <div className="exercises-list">
              <div className="list-header">
                <h2>Your Exercise Library</h2>
                <span className="exercise-count">
                  {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
                </span>
              </div>

              {exercises.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <h3>No exercises found</h3>
                  <p>Create your first exercise to get started!</p>
                </div>
              ) : (
                <div className="exercise-cards">
                  {exercises.map((exercise) => (
                    <div key={exercise.id} className="exercise-card">
                      <div className="exercise-card-header">
                        <h3 className="exercise-name">{exercise.name}</h3>
                        {exercise.is_default && (
                          <span className="default-badge">Default</span>
                        )}
                      </div>

                      <p className="exercise-description">{exercise.description}</p>

                      <div className="exercise-meta">
                        <div className="meta-row">
                          <span className="meta-label">Type:</span>
                          <span className={`type-badge ${exercise.exercise_type}`}>
                            {exercise.exercise_type === 'reps' ? '🔢 Reps' : '⏱️ Time'}
                          </span>
                        </div>

                        <div className="meta-row">
                          <span className="meta-label">Muscle Groups:</span>
                          <div className="muscle-tags">
                            {exercise.muscle_groups.map((group) => (
                              <span key={group} className="muscle-tag">
                                {group}
                              </span>
                            ))}
                          </div>
                        </div>

                        {exercise.default_recommendations && (
                          <div className="meta-row">
                            <span className="meta-label">Recommended:</span>
                            <span className="meta-value">
                              {exercise.default_recommendations}
                            </span>
                          </div>
                        )}
                      </div>

                      {!exercise.is_default && (
                        <div className="exercise-actions">
                          <button
                            onClick={() => handleEdit(exercise)}
                            className="btn-edit-small"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(exercise.id)}
                            className="btn-delete-small"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AddExercisePage;
