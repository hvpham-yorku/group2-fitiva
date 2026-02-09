'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { profileAPI, publicProfileAPI, ApiError } from '@/library/api';
import EditProfileModal from '@/components/ui/EditProfileModal';
import EditTrainerProfileModal from '@/components/ui/EditTrainerProfileModal';
import './profile.css';

type PublicProfile = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email?: string;
  is_trainer: boolean;
  is_owner: boolean;
  user_profile: {
    age?: number | null;
    experience_level: string;
    training_location: string;
    fitness_focus: string;
  } | null;
  trainer_profile: {
    id: number;
    bio: string;
    years_of_experience: number;
    specialty_strength: boolean;
    specialty_cardio: boolean;
    specialty_flexibility: boolean;
    specialty_sports: boolean;
    specialty_rehabilitation: boolean;
    certifications: string;
    created_at: string;
    updated_at: string;
  } | null;
};

type WorkoutProgram = {
  id: number;
  name: string;
  description: string;
  focus: string;
  difficulty: string;
  weekly_frequency: number;
  session_length: number;
  created_at: string;
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

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditTrainerModal, setShowEditTrainerModal] = useState(false);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [setupForm, setSetupForm] = useState<ProfileForm>({
    age: '',
    experience_level: 'beginner',
    training_location: 'home',
    fitness_focus: 'mixed',
  });
  const [setupErrors, setSetupErrors] = useState<Record<string, string>>({});
  const [setupSaving, setSetupSaving] = useState(false);

  const isOwnProfile = user && String(user.id) === profileId;

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        setPageLoading(true);

        // Load public profile
        const profileData = await publicProfileAPI.getPublicProfile(Number(profileId));
        setProfile(profileData);

        // Check if this is first-time setup (own profile with no age)
        if (isOwnProfile && profileData.user_profile && !profileData.user_profile.age) {
          setIsFirstTimeSetup(true);
        }

        // Load programs if trainer
        if (profileData.is_trainer) {
          try {
            const programsData = await publicProfileAPI.getTrainerPrograms(Number(profileId));
            setPrograms(programsData.programs);
          } catch {
            setPrograms([]);
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setPageLoading(false);
      }
    };

    if (!authLoading) {
      loadProfile();
    }
  }, [user, authLoading, profileId, isOwnProfile]);

  if (authLoading || pageLoading) {
    return (
      <div className="profile-loading">
        <div className="profile-spinner"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="profile-page-container">
        <div className="profile-view-card">
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            Profile not found
          </p>
        </div>
      </div>
    );
  }

  const handleProfileUpdate = (updatedProfile: unknown) => {
    setShowEditModal(false);
    setIsFirstTimeSetup(false);
    // Reload profile
    window.location.reload();
  };

  const handleTrainerProfileUpdate = () => {
    setShowEditTrainerModal(false);
    // Reload profile
    window.location.reload();
  };

  // Setup form handlers
  const setSetupField = (name: keyof ProfileForm, value: string) => {
    setSetupForm(prev => ({ ...prev, [name]: value }));
    setSetupErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateSetup = () => {
    const newErrors: Record<string, string> = {};

    if (!setupForm.age) newErrors.age = 'Age is required';
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
      await profileAPI.updateProfile({
        age: Number(setupForm.age),
        experience_level: setupForm.experience_level,
        training_location: setupForm.training_location,
        fitness_focus: setupForm.fitness_focus,
      });

      setIsFirstTimeSetup(false);
      window.location.reload();
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

  // First-time setup view
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
            </div>

            <button className="setup-button" type="submit" disabled={setupSaving}>
              {setupSaving ? 'Creating Profile...' : 'Create Profile'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Normal profile view
  const fullName = `${profile.first_name} ${profile.last_name}`.trim() || profile.username;
  const specialties = profile.trainer_profile ? [
    profile.trainer_profile.specialty_strength && 'Strength Training',
    profile.trainer_profile.specialty_cardio && 'Cardio',
    profile.trainer_profile.specialty_flexibility && 'Flexibility',
    profile.trainer_profile.specialty_sports && 'Sports',
    profile.trainer_profile.specialty_rehabilitation && 'Rehabilitation',
  ].filter(Boolean) : [];

  return (
    <div className="profile-page-container">
      {/* Header Section */}
      <div className="profile-view-card">
        <div className="profile-view-header">
          <div className="profile-header-info">
            <div className="profile-avatar">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="profile-view-title">{fullName}</h1>
              <p className="profile-view-subtitle">@{profile.username}</p>
              {profile.is_trainer && (
                <span className="trainer-badge">Certified Trainer</span>
              )}
            </div>
          </div>
          {isOwnProfile && (
            <button
              className="edit-profile-button"
              onClick={() => router.push('/dashboard')}
            >
              Back to Dashboard
            </button>
          )}
        </div>

        {/* Trainer Profile Section */}
        {profile.is_trainer && profile.trainer_profile && (
          <div className="profile-section">
            <div className="section-header">
              <h2 className="section-title">About {isOwnProfile ? 'You' : fullName}</h2>
              {isOwnProfile && (
                <button
                  className="edit-section-button"
                  onClick={() => setShowEditTrainerModal(true)}
                >
                  Edit Trainer Info
                </button>
              )}
            </div>

            <div className="trainer-info-grid">

              {profile.trainer_profile.bio && (
                <div className="info-card full-width">
                  <span className="info-label">Bio</span>
                  <p className="info-text">{profile.trainer_profile.bio}</p>
                </div>
              )}

              <div className="info-card">
                <span className="info-label">Experience</span>
                <span className="info-value">
                  {profile.trainer_profile.years_of_experience} years
                </span>
              </div>

              {specialties.length > 0 && (
                <div className="info-card full-width">
                  <span className="info-label">Specialties</span>
                  <div className="specialty-tags">
                    {specialties.map((specialty) => (
                      <span key={specialty as string} className="specialty-tag">
                        {specialty as string}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.trainer_profile.certifications && (
                <div className="info-card full-width">
                  <span className="info-label">Certifications</span>
                  <div className="cert-display-chips">
                    {profile.trainer_profile.certifications
                      .split(',')
                      .map(cert => cert.trim())
                      .filter(cert => cert.length > 0)
                      .map((cert) => (
                        <span key={cert} className="cert-display-chip">
                          {cert}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fitness Profile Section (for regular users or trainers viewing own) */}
        {profile.user_profile && (!profile.is_trainer || isOwnProfile) && (
          <div className="profile-section">
            <div className="section-header">
              <h2 className="section-title">Fitness Profile</h2>
              {isOwnProfile && (
                <button
                  className="edit-section-button"
                  onClick={() => setShowEditModal(true)}
                >
                  Edit Profile
                </button>
              )}
            </div>

            <div className="profile-info-grid">
              <div className="profile-info-item">
                <span className="profile-info-label">Age</span>
                <span className="profile-info-value">
                  {profile.user_profile.age || 'Not set'}
                </span>
              </div>

              <div className="profile-info-item">
                <span className="profile-info-label">Experience Level</span>
                <span className="profile-info-value">
                  {profile.user_profile.experience_level
                    ? profile.user_profile.experience_level.charAt(0).toUpperCase() +
                      profile.user_profile.experience_level.slice(1)
                    : 'Not set'}
                </span>
              </div>

              <div className="profile-info-item">
                <span className="profile-info-label">Training Location</span>
                <span className="profile-info-value">
                  {profile.user_profile.training_location === 'home' ? 'Home' : 'Gym'}
                </span>
              </div>

              <div className="profile-info-item">
                <span className="profile-info-label">Fitness Focus</span>
                <span className="profile-info-value">
                  {profile.user_profile.fitness_focus
                    ? profile.user_profile.fitness_focus.charAt(0).toUpperCase() +
                      profile.user_profile.fitness_focus.slice(1)
                    : 'Not set'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* My Programs Section (for trainers only) */}
        {profile.is_trainer && (
          <div className="profile-section">
            <div className="section-header">
              <h2 className="section-title">My Programs</h2>
              {isOwnProfile && (
                <button
                  className="create-program-button"
                  onClick={() => alert('Create program functionality coming soon!')}
                >
                  + Create Program
                </button>
              )}
            </div>

            {programs.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-text">
                  {isOwnProfile
                    ? "You haven't created any workout programs yet."
                    : "This trainer hasn't created any programs yet."}
                </p>
              </div>
            ) : (
              <div className="programs-grid">
                {programs.map((program) => (
                  <div key={program.id} className="program-card">
                    <h3 className="program-name">{program.name}</h3>
                    <p className="program-description">{program.description}</p>
                    <div className="program-meta">
                      <span className="program-badge">{program.difficulty}</span>
                      <span className="program-badge">{program.focus}</span>
                    </div>
                    <div className="program-details">
                      <span>{program.weekly_frequency}x per week</span>
                      <span>{program.session_length} min</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showEditModal && profile.user_profile && (
        <EditProfileModal
          currentProfile={profile.user_profile}
          isFirstTime={false}
          onClose={() => setShowEditModal(false)}
          onSave={handleProfileUpdate}
        />
      )}

      {showEditTrainerModal && profile.trainer_profile && (
        <EditTrainerProfileModal
          currentData={profile.trainer_profile}
          onClose={() => setShowEditTrainerModal(false)}
          onSave={handleTrainerProfileUpdate}
        />
      )}
    </div>
  );
}
