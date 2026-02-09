'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { profileAPI, ApiError } from '@/library/api';
import EditProfileModal from '@/components/ui/EditProfileModal';
import './profile.css';

type ProfileData = {
  age?: number | null;
  experience_level?: string;
  training_location?: string;
  fitness_focus?: string;
};

type ProfileForm = {
  age: string;
  experience_level: string;
  training_location: string;
  fitness_focus: string;
};

export default function ProfileViewPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const profileId = params.id as string;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [setupForm, setSetupForm] = useState<ProfileForm>({
    age: '',
    experience_level: 'beginner',
    training_location: 'home',
    fitness_focus: 'mixed',
  });
  const [setupErrors, setSetupErrors] = useState<Record<string, string>>({});
  const [setupSaving, setSetupSaving] = useState(false);

  // Check if viewing own profile
  const isOwnProfile = user && String(user.id) === profileId;

  useEffect(() => {
  const loadProfile = async () => {
    if (!user) return;

    try {
      const profileData = await profileAPI.getProfile();
      
      // Check if profile is incomplete (age not set)
      if (!profileData.age && isOwnProfile) {
        setIsFirstTimeSetup(true);
      } else {
        setProfile(profileData);
        setIsFirstTimeSetup(false);
      }
    } catch {
      // Profile doesn't exist - first time setup
      if (isOwnProfile) {
        setIsFirstTimeSetup(true);
      }
    } finally {
      setPageLoading(false);
    }
  };

  if (!authLoading) {
    loadProfile();
  }
}, [user, authLoading, isOwnProfile]);

  // Redirect if user tries to access someone else's profile (for now)
  useEffect(() => {
    if (!authLoading && user && !isOwnProfile) {
      router.push(`/profile/${user.id}`);
    }
  }, [user, authLoading, isOwnProfile, router]);

  if (authLoading || pageLoading) {
    return (
      <div className="profile-loading">
        <div className="profile-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleProfileUpdate = (updatedProfile: ProfileData) => {
    setProfile(updatedProfile);
    setShowEditModal(false);
    setIsFirstTimeSetup(false);
  };

  // Setup form handlers
  const setSetupField = (name: keyof ProfileForm, value: string) => {
    setSetupForm(prev => ({ ...prev, [name]: value }));
    setSetupErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateSetup = () => {
    const newErrors: Record<string, string> = {};

    if (!setupForm.age) newErrors.age = 'Age is required';
    if (!setupForm.experience_level) newErrors.experience_level = 'Experience level is required';
    if (!setupForm.training_location) newErrors.training_location = 'Training location is required';
    if (!setupForm.fitness_focus) newErrors.fitness_focus = 'Fitness focus is required';

    const ageNum = Number(setupForm.age);
    if (setupForm.age && (Number.isNaN(ageNum) || !Number.isFinite(ageNum))) {
      newErrors.age = 'Age must be a number';
    }

    setSetupErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateSetup()) return;

    setSetupSaving(true);
    setSetupErrors({});

    try {
      const newProfile = await profileAPI.updateProfile({
        age: Number(setupForm.age),
        experience_level: setupForm.experience_level,
        training_location: setupForm.training_location,
        fitness_focus: setupForm.fitness_focus,
      });

      setProfile(newProfile);
      setIsFirstTimeSetup(false);
    } catch (e) {
      if (e instanceof ApiError && e.errors) {
        setSetupErrors(e.errors);
      } else if (e instanceof ApiError) {
        setSetupErrors({ detail: e.message });
      } else {
        setSetupErrors({ detail: 'Something went wrong' });
      }
    } finally {
      setSetupSaving(false);
    }
  };

  // Show first-time setup page
  if (isFirstTimeSetup && isOwnProfile) {
    return (
      <div className="profile-setup-container">
        <div className="profile-setup-card">
          <div className="profile-setup-header">
            <h1 className="profile-setup-title">Complete Your Profile</h1>
            <p className="profile-setup-subtitle">
              Let&apos;s set up your fitness profile to get personalized recommendations
            </p>
          </div>

          <form onSubmit={handleSetupSubmit} className="profile-setup-form">
            {setupErrors.detail && (
              <div className="setup-alert error">{setupErrors.detail}</div>
            )}

            <div className="setup-field">
              <label className="setup-label" htmlFor="age">
                Age<span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id="age"
                className="setup-input"
                value={setupForm.age}
                onChange={e => setSetupField('age', e.target.value)}
                placeholder="Enter your age"
                inputMode="numeric"
                required
              />
              {setupErrors.age && <div className="setup-error">{setupErrors.age}</div>}
            </div>

            <div className="setup-field">
              <label className="setup-label" htmlFor="experience_level">
                Experience level
              </label>
              <select
                id="experience_level"
                className="setup-select"
                value={setupForm.experience_level}
                onChange={e => setSetupField('experience_level', e.target.value)}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              {setupErrors.experience_level && (
                <div className="setup-error">{setupErrors.experience_level}</div>
              )}
            </div>

            <div className="setup-field">
              <label className="setup-label" htmlFor="training_location">
                Training location
              </label>
              <select
                id="training_location"
                className="setup-select"
                value={setupForm.training_location}
                onChange={e => setSetupField('training_location', e.target.value)}
              >
                <option value="home">Home</option>
                <option value="gym">Gym</option>
              </select>
              {setupErrors.training_location && (
                <div className="setup-error">{setupErrors.training_location}</div>
              )}
            </div>

            <div className="setup-field">
              <label className="setup-label" htmlFor="fitness_focus">
                Primary fitness focus
              </label>
              <select
                id="fitness_focus"
                className="setup-select"
                value={setupForm.fitness_focus}
                onChange={e => setSetupField('fitness_focus', e.target.value)}
              >
                <option value="strength">Strength</option>
                <option value="cardio">Cardio</option>
                <option value="flexibility">Flexibility</option>
                <option value="mixed">Mixed</option>
              </select>
              {setupErrors.fitness_focus && (
                <div className="setup-error">{setupErrors.fitness_focus}</div>
              )}
            </div>

            <button className="setup-button" type="submit" disabled={setupSaving}>
              {setupSaving ? 'Creating Profile...' : 'Create Profile'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Show normal profile view
  return (
    <div className="profile-page-container">
      <div className="profile-view-card">
        {/* Header */}
        <div className="profile-view-header">
          <div>
            <h1 className="profile-view-title">{user.username}&apos;s Profile</h1>
            <p className="profile-view-subtitle">{user.email}</p>
          </div>
          {isOwnProfile && profile && (
            <button
              className="edit-profile-button"
              onClick={() => setShowEditModal(true)}
            >
              Edit Profile
            </button>
          )}
        </div>

        {/* Profile Info Display */}
        {profile ? (
          <div className="profile-info-grid">
            <div className="profile-info-item">
              <span className="profile-info-label">Age</span>
              <span className="profile-info-value">{profile.age || 'Not set'}</span>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-label">Experience Level</span>
              <span className="profile-info-value">
                {profile.experience_level ? 
                  profile.experience_level.charAt(0).toUpperCase() + profile.experience_level.slice(1) 
                  : 'Not set'}
              </span>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-label">Training Location</span>
              <span className="profile-info-value">
                {profile.training_location ? 
                  profile.training_location.charAt(0).toUpperCase() + profile.training_location.slice(1)
                  : 'Not set'}
              </span>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-label">Fitness Focus</span>
              <span className="profile-info-value">
                {profile.fitness_focus ? 
                  profile.fitness_focus.charAt(0).toUpperCase() + profile.fitness_focus.slice(1)
                  : 'Not set'}
              </span>
            </div>
          </div>
        ) : (
          <div className="profile-empty-state">
            <p>No profile information available.</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditProfileModal
          currentProfile={profile}
          isFirstTime={false}
          onClose={() => setShowEditModal(false)}
          onSave={handleProfileUpdate}
        />
      )}
    </div>
  );
}
