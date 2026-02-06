'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { profileAPI, trainerAPI, ApiError } from '@/library/api';
import type { ProfileData, TrainerProfileData } from '@/library/api';
import './profile.css';

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const LOCATION_OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'gym', label: 'Gym' },
];

const FOCUS_OPTIONS = [
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'mixed', label: 'Mixed' },
];

const SPECIALTY_OPTIONS = [
  { key: 'specialty_strength', label: 'Strength Training' },
  { key: 'specialty_cardio', label: 'Cardio' },
  { key: 'specialty_flexibility', label: 'Flexibility' },
  { key: 'specialty_sports', label: 'Sports Training' },
  { key: 'specialty_rehabilitation', label: 'Rehabilitation' },
] as const;

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'fitness' | 'trainer'>('fitness');

  // User fitness profile state
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileForm, setProfileForm] = useState({
    age: '',
    experience_level: 'beginner',
    training_location: 'home',
    fitness_focus: 'mixed',
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  // Trainer profile state
  const [trainerProfile, setTrainerProfile] = useState<TrainerProfileData | null>(null);
  const [trainerForm, setTrainerForm] = useState({
    bio: '',
    years_of_experience: '0',
    specialty_strength: false,
    specialty_cardio: false,
    specialty_flexibility: false,
    specialty_sports: false,
    specialty_rehabilitation: false,
    certifications: '',
  });
  const [trainerErrors, setTrainerErrors] = useState<Record<string, string>>({});
  const [trainerSaving, setTrainerSaving] = useState(false);
  const [trainerSuccess, setTrainerSuccess] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const [profileRes, trainerRes] = await Promise.all([
          profileAPI.getProfile().catch(() => null),
          user.is_trainer ? trainerAPI.getProfile().catch(() => null) : null,
        ]);
        if (profileRes) {
          setProfile(profileRes);
          setProfileForm({
            age: profileRes.age != null ? String(profileRes.age) : '',
            experience_level: profileRes.experience_level || 'beginner',
            training_location: profileRes.training_location || 'home',
            fitness_focus: profileRes.fitness_focus || 'mixed',
          });
        }
        if (trainerRes) {
          setTrainerProfile(trainerRes);
          setTrainerForm({
            bio: trainerRes.bio || '',
            years_of_experience: String(trainerRes.years_of_experience ?? 0),
            specialty_strength: trainerRes.specialty_strength ?? false,
            specialty_cardio: trainerRes.specialty_cardio ?? false,
            specialty_flexibility: trainerRes.specialty_flexibility ?? false,
            specialty_sports: trainerRes.specialty_sports ?? false,
            specialty_rehabilitation: trainerRes.specialty_rehabilitation ?? false,
            certifications: trainerRes.certifications || '',
          });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, user?.is_trainer]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setProfileForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (profileErrors[name]) setProfileErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrors({});
    setProfileSuccess('');
    const ageNum = profileForm.age ? parseInt(profileForm.age, 10) : null;
    if (ageNum === null || isNaN(ageNum)) {
      setProfileErrors({ age: 'Age is required.' });
      return;
    }
    if (ageNum < 13 || ageNum > 120) {
      setProfileErrors({ age: 'Please enter a valid age (13–120).' });
      return;
    }
    setProfileSaving(true);
    try {
      await profileAPI.updateProfile({
        age: ageNum,
        experience_level: profileForm.experience_level,
        training_location: profileForm.training_location,
        fitness_focus: profileForm.fitness_focus,
      });
      setProfileSuccess('Profile saved successfully.');
      setProfile({ ...profile!, age: ageNum, experience_level: profileForm.experience_level, training_location: profileForm.training_location, fitness_focus: profileForm.fitness_focus });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors && Object.keys(err.errors).length > 0) {
          setProfileErrors(err.errors as Record<string, string>);
        } else {
          setProfileErrors({ general: err.message || 'Failed to save profile. Please try again.' });
        }
      } else {
        setProfileErrors({ general: 'Failed to save profile. Please try again.' });
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const handleTrainerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setTrainerForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (trainerErrors[name]) setTrainerErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleTrainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrainerErrors({});
    setTrainerSuccess('');
    setTrainerSaving(true);
    try {
      await trainerAPI.updateProfile({
        bio: trainerForm.bio,
        years_of_experience: parseInt(trainerForm.years_of_experience, 10) || 0,
        specialty_strength: trainerForm.specialty_strength,
        specialty_cardio: trainerForm.specialty_cardio,
        specialty_flexibility: trainerForm.specialty_flexibility,
        specialty_sports: trainerForm.specialty_sports,
        specialty_rehabilitation: trainerForm.specialty_rehabilitation,
        certifications: trainerForm.certifications,
      });
      setTrainerSuccess('Trainer profile saved successfully.');
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setTrainerErrors(err.errors as Record<string, string>);
      } else {
        setTrainerErrors({ general: 'Failed to save trainer profile.' });
      }
    } finally {
      setTrainerSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="profile-page">
        <div className="profile-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <Link href="/dashboard" className="profile-back">← Dashboard</Link>
        <h1 className="profile-title">Profile</h1>
      </header>

      <div className="profile-tabs">
        <button
          type="button"
          className={`profile-tab ${activeTab === 'fitness' ? 'active' : ''}`}
          onClick={() => setActiveTab('fitness')}
        >
          Fitness Profile
        </button>
        {user.is_trainer && (
          <button
            type="button"
            className={`profile-tab ${activeTab === 'trainer' ? 'active' : ''}`}
            onClick={() => setActiveTab('trainer')}
          >
            Trainer Profile
          </button>
        )}
      </div>

      <main className="profile-main">
        {loading ? (
          <div className="profile-loading">Loading profile...</div>
        ) : (
          <>
            {activeTab === 'fitness' && (
              <section className="profile-section">
                <h2>Your Fitness Profile</h2>
                <p className="profile-section-desc">
                  Enter your age, experience level, training location, and focus so we can recommend suitable workout plans.
                </p>
                {profileSuccess && <div className="alert alert-success">{profileSuccess}</div>}
                {profileErrors.general && <div className="alert alert-error">{profileErrors.general}</div>}
                <form onSubmit={handleProfileSubmit} className="profile-form">
                  <div className="form-group">
                    <label htmlFor="age" className="form-label">Age <span className="required">*</span></label>
                    <input
                      id="age"
                      name="age"
                      type="number"
                      min={13}
                      max={120}
                      required
                      value={profileForm.age}
                      onChange={handleProfileChange}
                      className={`form-input ${profileErrors.age ? 'error' : ''}`}
                      placeholder="e.g. 28"
                    />
                    {profileErrors.age && <p className="form-error">{profileErrors.age}</p>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="experience_level" className="form-label">Experience level <span className="required">*</span></label>
                    <select
                      id="experience_level"
                      name="experience_level"
                      value={profileForm.experience_level}
                      onChange={handleProfileChange}
                      className="form-input form-select"
                    >
                      {EXPERIENCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="training_location" className="form-label">Training location <span className="required">*</span></label>
                    <select
                      id="training_location"
                      name="training_location"
                      value={profileForm.training_location}
                      onChange={handleProfileChange}
                      className="form-input form-select"
                    >
                      {LOCATION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="fitness_focus" className="form-label">Primary focus <span className="required">*</span></label>
                    <select
                      id="fitness_focus"
                      name="fitness_focus"
                      value={profileForm.fitness_focus}
                      onChange={handleProfileChange}
                      className="form-input form-select"
                    >
                      {FOCUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="profile-submit" disabled={profileSaving}>
                    {profileSaving ? 'Saving...' : 'Save profile'}
                  </button>
                </form>
              </section>
            )}

            {activeTab === 'trainer' && user.is_trainer && (
              <section className="profile-section">
                <h2>Trainer Profile</h2>
                <p className="profile-section-desc">
                  Your public profile (bio, specialties, certifications) so users can discover your content.
                </p>
                {trainerSuccess && <div className="alert alert-success">{trainerSuccess}</div>}
                {trainerErrors.general && <div className="alert alert-error">{trainerErrors.general}</div>}
                <form onSubmit={handleTrainerSubmit} className="profile-form">
                  <div className="form-group">
                    <label htmlFor="bio" className="form-label">Bio</label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={trainerForm.bio}
                      onChange={handleTrainerChange}
                      maxLength={500}
                      className={`form-input form-textarea ${trainerErrors.bio ? 'error' : ''}`}
                      placeholder="Tell us about your training philosophy and experience..."
                    />
                    <span className="char-count">{trainerForm.bio.length}/500</span>
                    {trainerErrors.bio && <p className="form-error">{trainerErrors.bio}</p>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="years_of_experience" className="form-label">Years of experience</label>
                    <input
                      id="years_of_experience"
                      name="years_of_experience"
                      type="number"
                      min={0}
                      max={50}
                      value={trainerForm.years_of_experience}
                      onChange={handleTrainerChange}
                      className={`form-input ${trainerErrors.years_of_experience ? 'error' : ''}`}
                    />
                    {trainerErrors.years_of_experience && <p className="form-error">{trainerErrors.years_of_experience}</p>}
                  </div>
                  <div className="form-group">
                    <span className="form-label">Specialties</span>
                    <div className="specialties-grid">
                      {SPECIALTY_OPTIONS.map(({ key, label }) => (
                        <label key={key} className="specialty-item">
                          <input
                            type="checkbox"
                            name={key}
                            checked={trainerForm[key]}
                            onChange={handleTrainerChange}
                            className="specialty-checkbox"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="certifications" className="form-label">Certifications</label>
                    <input
                      id="certifications"
                      name="certifications"
                      type="text"
                      value={trainerForm.certifications}
                      onChange={handleTrainerChange}
                      className={`form-input ${trainerErrors.certifications ? 'error' : ''}`}
                      placeholder="e.g. NASM-CPT, ACE (comma-separated)"
                    />
                    {trainerErrors.certifications && <p className="form-error">{trainerErrors.certifications}</p>}
                  </div>
                  <button type="submit" className="profile-submit" disabled={trainerSaving}>
                    {trainerSaving ? 'Saving...' : 'Save trainer profile'}
                  </button>
                </form>
                <div className="profile-trainer-actions">
                  <Link href="/my-programs" className="profile-link-button">My Programs</Link>
                  <Link href="/create-program" className="profile-link-button primary">Create program</Link>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
