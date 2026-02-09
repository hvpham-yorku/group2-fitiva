'use client';

import { useState, useEffect } from 'react';
import { profileAPI, ApiError } from '@/library/api';
import './EditProfileModal.css';

type ProfileForm = {
  age: string;
  experience_level: string;
  training_location: string;
  fitness_focus: string;
};

type ProfileData = {
  age?: number | null;
  experience_level?: string;
  training_location?: string;
  fitness_focus?: string;
};

type EditProfileModalProps = {
  currentProfile: ProfileData | null;
  isFirstTime: boolean;
  onClose: () => void;
  onSave: (profile: ProfileData) => void;
};

export default function EditProfileModal({ 
  currentProfile, 
  isFirstTime, 
  onClose, 
  onSave 
}: EditProfileModalProps) {
  const [form, setForm] = useState<ProfileForm>({
    age: '',
    experience_level: 'beginner',
    training_location: 'home',
    fitness_focus: 'mixed',
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentProfile) {
      setForm({
        age: currentProfile.age !== undefined && currentProfile.age !== null ? String(currentProfile.age) : '',
        experience_level: currentProfile.experience_level || 'beginner',
        training_location: currentProfile.training_location || 'home',
        fitness_focus: currentProfile.fitness_focus || 'mixed',
      });
    }
  }, [currentProfile]);

  const setField = (name: keyof ProfileForm, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateClientSide = () => {
    const newErrors: Record<string, string> = {};

    if (!form.age) newErrors.age = 'Age is required';
    if (!form.experience_level) newErrors.experience_level = 'Experience level is required';
    if (!form.training_location) newErrors.training_location = 'Training location is required';
    if (!form.fitness_focus) newErrors.fitness_focus = 'Fitness focus is required';

    const ageNum = Number(form.age);
    if (form.age && (Number.isNaN(ageNum) || !Number.isFinite(ageNum))) {
      newErrors.age = 'Age must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateClientSide()) return;

    setSaving(true);
    setErrors({});

    try {
      const updatedProfile = await profileAPI.updateProfile({
        age: Number(form.age),
        experience_level: form.experience_level,
        training_location: form.training_location,
        fitness_focus: form.fitness_focus,
      });

      onSave(updatedProfile);
    } catch (e) {
      if (e instanceof ApiError && e.errors) {
        setErrors(e.errors);
      } else if (e instanceof ApiError) {
        setErrors({ detail: e.message });
      } else {
        setErrors({ detail: 'Something went wrong' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !isFirstTime && onClose()}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isFirstTime ? 'Complete Your Profile' : 'Edit Profile'}
          </h2>
          {!isFirstTime && (
            <button className="modal-close" onClick={onClose}>×</button>
          )}
        </div>

        <form onSubmit={handleSave} className="modal-form">
          {errors.detail && <div className="modal-alert error">{errors.detail}</div>}

          <div className="modal-field">
            <label className="modal-label" htmlFor="age">Age<span style={{ color: '#dc2626' }}>*</span></label>
            <input
              id="age"
              className="modal-input"
              value={form.age}
              onChange={e => setField('age', e.target.value)}
              placeholder="Enter your age"
              inputMode="numeric"
              required
            />
            {errors.age && <div className="modal-error">{errors.age}</div>}
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="experience_level">Experience level</label>
            <select
              id="experience_level"
              className="modal-select"
              value={form.experience_level}
              onChange={e => setField('experience_level', e.target.value)}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            {errors.experience_level && <div className="modal-error">{errors.experience_level}</div>}
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="training_location">Training location</label>
            <select
              id="training_location"
              className="modal-select"
              value={form.training_location}
              onChange={e => setField('training_location', e.target.value)}
            >
              <option value="home">Home</option>
              <option value="gym">Gym</option>
            </select>
            {errors.training_location && <div className="modal-error">{errors.training_location}</div>}
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="fitness_focus">Primary fitness focus</label>
            <select
              id="fitness_focus"
              className="modal-select"
              value={form.fitness_focus}
              onChange={e => setField('fitness_focus', e.target.value)}
            >
              <option value="strength">Strength</option>
              <option value="cardio">Cardio</option>
              <option value="flexibility">Flexibility</option>
              <option value="mixed">Mixed</option>
            </select>
            {errors.fitness_focus && <div className="modal-error">{errors.fitness_focus}</div>}
          </div>

          <button className="modal-button" type="submit" disabled={saving}>
            {saving ? 'Saving...' : isFirstTime ? 'Create Profile' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
