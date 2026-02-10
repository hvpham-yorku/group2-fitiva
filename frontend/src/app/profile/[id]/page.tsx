'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { profileAPI, publicProfileAPI, ApiError } from '@/library/api';
import EditProfileModal from '@/components/ui/EditProfileModal';
import EditTrainerProfileModal from '@/components/ui/EditTrainerProfileModal';
import './profile.css';
import Link from 'next/link';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// CONSTANTS
// ============================================================================

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

const SPECIALTY_LABELS = {
  specialty_strength: 'Strength Training',
  specialty_cardio: 'Cardio',
  specialty_flexibility: 'Flexibility',
  specialty_sports: 'Sports',
  specialty_rehabilitation: 'Rehabilitation',
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const capitalize = (str: string): string => {
  if (!str) return 'Not set';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const getSpecialties = (trainerProfile: PublicProfile['trainer_profile']): string[] => {
  if (!trainerProfile) return [];
  
  return (Object.keys(SPECIALTY_LABELS) as Array<keyof typeof SPECIALTY_LABELS>)
    .filter(key => trainerProfile[key])
    .map(key => SPECIALTY_LABELS[key]);
};

const parseCertifications = (certString: string): string[] => {
  return certString
    .split(',')
    .map(cert => cert.trim())
    .filter(cert => cert.length > 0);
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function ProfileViewPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const profileId = params.id as string;

  // Profile state
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  // Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditTrainerModal, setShowEditTrainerModal] = useState(false);

  // First-time setup state
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

  // ========================================
  // Effects
  // ========================================

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        setPageLoading(true);

        // Load public profile
        const profileData = await publicProfileAPI.getPublicProfile(Number(profileId));
        setProfile(profileData);

        // Check if first-time setup needed
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

  // ========================================
  // Event Handlers - Profile Updates
  // ========================================

  const handleProfileUpdate = () => {
    setShowEditModal(false);
    setIsFirstTimeSetup(false);
    window.location.reload();
  };

  const handleTrainerProfileUpdate = () => {
    setShowEditTrainerModal(false);
    window.location.reload();
  };

  // ========================================
  // Event Handlers - First-Time Setup
  // ========================================

  const setSetupField = (name: keyof ProfileForm, value: string) => {
    setSetupForm(prev => ({ ...prev, [name]: value }));
    setSetupErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateSetup = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!setupForm.age) {
      newErrors.age = 'Age is required';
    } else {
      const ageNum = Number(setupForm.age);
      if (Number.isNaN(ageNum) || !Number.isFinite(ageNum)) {
        newErrors.age = 'Age must be a valid number';
      }
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

  // ========================================
  // Loading & Error States
  // ========================================

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
          <p className="profile-not-found">Profile not found</p>
        </div>
      </div>
    );
  }

  // ========================================
  // Render - First-Time Setup
  // ========================================

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

            {/* Age */}
            <div className="setup-field">
              <label className="setup-label" htmlFor="age">
                Age<span className="required-asterisk">*</span>
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

            {/* Experience Level */}
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
                {EXPERIENCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Training Location */}
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
                {LOCATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Fitness Focus */}
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
                {FOCUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
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

  // ========================================
  // Render Helpers
  // ========================================

  const fullName = `${profile.first_name} ${profile.last_name}`.trim() || profile.username;
  const specialties = getSpecialties(profile.trainer_profile);

  // ========================================
  // Render - Profile View
  // ========================================

  return (
    <div className="profile-page-container">
      <div className="profile-view-card">
        {/* Header */}
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
              {/* Bio */}
              {profile.trainer_profile.bio && (
                <div className="info-card full-width">
                  <span className="info-label">Bio</span>
                  <p className="info-text">{profile.trainer_profile.bio}</p>
                </div>
              )}

              {/* Experience */}
              <div className="info-card">
                <span className="info-label">Experience</span>
                <span className="info-value">
                  {profile.trainer_profile.years_of_experience} years
                </span>
              </div>

              {/* Specialties */}
              {specialties.length > 0 && (
                <div className="info-card full-width">
                  <span className="info-label">Specialties</span>
                  <div className="specialty-tags">
                    {specialties.map((specialty) => (
                      <span key={specialty} className="specialty-tag">
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {profile.trainer_profile.certifications && (
                <div className="info-card full-width">
                  <span className="info-label">Certifications</span>
                  <div className="cert-display-chips">
                    {parseCertifications(profile.trainer_profile.certifications).map((cert) => (
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

        {/* Fitness Profile Section */}
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
                  {capitalize(profile.user_profile.experience_level)}
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
                  {capitalize(profile.user_profile.fitness_focus)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Programs Section (Trainers Only) */}
        {profile.is_trainer && (
          <div className="profile-section">
            <div className="section-header">
              <h2 className="section-title">My Programs</h2>
              {isOwnProfile && (
                <Link href="/create-program" className="create-program button">
                <button
                  className="create-program-button"
                >
                  + Create Program
                </button>
                </Link>
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

      {/* Edit Profile Modal */}
      {showEditModal && profile.user_profile && (
        <EditProfileModal
          currentProfile={profile.user_profile}
          isFirstTime={false}
          onClose={() => setShowEditModal(false)}
          onSave={handleProfileUpdate}
        />
      )}

      {/* Edit Trainer Profile Modal */}
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
