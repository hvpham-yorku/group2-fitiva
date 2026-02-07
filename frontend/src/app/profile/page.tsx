'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { profileAPI, ApiError } from '@/library/api';
import './profile.css';

type ProfileForm = {
  age: string;
  experience_level: string;
  training_location: string;
  fitness_focus: string;
};

export default function ProfilePage() {
  const { user, isLoading } = useAuth();

  const [form, setForm] = useState<ProfileForm>({
    age: '',
    experience_level: 'beginner',
    training_location: 'home',
    fitness_focus: 'mixed',
  });

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await profileAPI.getProfile();

        setForm({
          age: profile.age !== undefined && profile.age !== null ? String(profile.age) : '',
          experience_level: profile.experience_level || 'beginner',
          training_location: profile.training_location || 'home',
          fitness_focus: profile.fitness_focus || 'mixed',
        });
      } catch (e) {
        // If profile does not exist yet, we keep defaults and let user fill
      } finally {
        setPageLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (isLoading || pageLoading) {
    return (
      <div className="profile-loading">
        <div className="profile-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const setField = (name: keyof ProfileForm, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setSuccessMessage('');
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
    setSuccessMessage('');

    if (!validateClientSide()) return;

    setSaving(true);
    setErrors({});

    try {
      await profileAPI.updateProfile({
        age: Number(form.age),
        experience_level: form.experience_level,
        training_location: form.training_location,
        fitness_focus: form.fitness_focus,
      });

      setSuccessMessage('Profile saved successfully');
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
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <h1 className="profile-title">Fitness Profile</h1>
          <p className="profile-subtitle">Update your details to get better recommendations</p>
          <Link className="profile-back" href="/dashboard">Back to Dashboard</Link>
        </div>

        <form onSubmit={handleSave} className="profile-form">
          {errors.detail && <div className="profile-alert error">{errors.detail}</div>}
          {successMessage && <div className="profile-alert success">{successMessage}</div>}

          <div className="profile-field">
            <label className="profile-label" htmlFor="age">Age</label>
            <input
              id="age"
              className="profile-input"
              value={form.age}
              onChange={e => setField('age', e.target.value)}
              placeholder="Enter your age"
              inputMode="numeric"
            />
            {errors.age && <div className="profile-error">{errors.age}</div>}
          </div>

          <div className="profile-field">
            <label className="profile-label" htmlFor="experience_level">Experience level</label>
            <select
              id="experience_level"
              className="profile-select"
              value={form.experience_level}
              onChange={e => setField('experience_level', e.target.value)}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            {errors.experience_level && <div className="profile-error">{errors.experience_level}</div>}
          </div>

          <div className="profile-field">
            <label className="profile-label" htmlFor="training_location">Training location</label>
            <select
              id="training_location"
              className="profile-select"
              value={form.training_location}
              onChange={e => setField('training_location', e.target.value)}
            >
              <option value="home">Home</option>
              <option value="gym">Gym</option>
            </select>
            {errors.training_location && <div className="profile-error">{errors.training_location}</div>}
          </div>

          <div className="profile-field">
            <label className="profile-label" htmlFor="fitness_focus">Primary fitness focus</label>
            <select
              id="fitness_focus"
              className="profile-select"
              value={form.fitness_focus}
              onChange={e => setField('fitness_focus', e.target.value)}
            >
              <option value="strength">Strength</option>
              <option value="cardio">Cardio</option>
              <option value="flexibility">Flexibility</option>
              <option value="mixed">Mixed</option>
            </select>
            {errors.fitness_focus && <div className="profile-error">{errors.fitness_focus}</div>}
          </div>

          <button className="profile-button" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
