'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import './trainer-programs.css';

// ============================================================================
// TYPES
// ============================================================================

interface ExerciseSet {
  set_number: number;
  reps: number | null;
  time: number | null;
  rest: number;
}

interface Exercise {
  name: string;
  sets: ExerciseSet[];
}

interface ProgramSection {
  format: string;
  type: string;
  exercises: Exercise[];
}

interface Program {
  id: number;
  name: string;
  description: string;
  focus: string;
  difficulty: string;
  weekly_frequency: number;
  session_length: number;
  trainer: number;
  created_at: string;
  sections?: ProgramSection[];
}

type TabType = 'my' | 'others';

// ============================================================================
// CONSTANTS
// ============================================================================

const API_BASE_URL = 'http://localhost:8000/api';

const FOCUS_ICONS: Record<string, string> = {
  strength: '💪',
  cardio: '🏃',
  flexibility: '🧘',
  balance: '⚖️',
  default: '🏋️',
};

const DIFFICULTY_CLASSES: Record<string, string> = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
  default: 'beginner',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getDifficultyColor(difficulty: string): string {
  return DIFFICULTY_CLASSES[difficulty.toLowerCase()] || DIFFICULTY_CLASSES.default;
}

function getFocusIcon(focus: string): string {
  return FOCUS_ICONS[focus.toLowerCase()] || FOCUS_ICONS.default;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

function getTotalExercises(program: Program): number {
  return program.sections?.reduce((acc, section) => acc + section.exercises.length, 0) || 0;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function TrainerProgramsPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // State
  const [myPrograms, setMyPrograms] = useState<Program[]>([]);
  const [otherPrograms, setOtherPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('my');

  // ========================================
  // Effects
  // ========================================

  useEffect(() => {
    // Only fetch when user is loaded
    if (user?.id) {
      fetchPrograms();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  // ========================================
  // API Functions
  // ========================================

  const fetchPrograms = async () => {
    if (!user?.id) {
      console.log('No user ID available');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/programs/`, {
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('Failed to fetch programs:', response.status);
        setMyPrograms([]);
        setOtherPrograms([]);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Fetched programs:', data);
      
      // Handle paginated response with 'results' key
      const programs = Array.isArray(data) 
        ? data 
        : Array.isArray(data.results) 
          ? data.results 
          : [];
      
      console.log('Programs array:', programs);
      console.log('Current user ID:', user.id, 'Type:', typeof user.id);
      
      // Use string comparison to avoid type mismatch issues
      const currentUserId = String(user.id);
      
      const mine = programs.filter((p: Program) => {
        const trainerId = String(p.trainer);
        console.log(`Comparing: trainer ${trainerId} === user ${currentUserId}`, trainerId === currentUserId);
        return trainerId === currentUserId;
      });
      
      const others = programs.filter((p: Program) => 
        String(p.trainer) !== currentUserId
      );
      
      console.log('My programs:', mine);
      console.log('Other programs:', others);
      
      setMyPrograms(mine);
      setOtherPrograms(others);
    } catch (error) {
      console.error('Error fetching programs:', error);
      setMyPrograms([]);
      setOtherPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // Event Handlers
  // ========================================

  const viewProgramDetails = (program: Program) => {
    router.push(`/program/${program.id}`);
  };

  // ========================================
  // Render Helpers
  // ========================================

  const renderProgramCard = (program: Program, isOwn: boolean) => (
    <div key={program.id} className={`program-card ${isOwn ? 'my-program' : 'other-program'}`}>
      {/* Badge */}
      <div className="program-badge">
        {isOwn ? 'Your Program' : 'Public Program'}
      </div>

      {/* Header */}
      <div className="program-header">
        <span className="focus-icon">{getFocusIcon(program.focus)}</span>
        <h3 className="program-title">{program.name}</h3>
      </div>
      
      {/* Description */}
      <p className="program-description">
        {program.description || 'No description provided'}
      </p>

      {/* Meta Information */}
      <div className="program-meta">
        <div className="meta-item">
          <span className="meta-label">Focus:</span>
          <span className="meta-value">{program.focus.charAt(0).toUpperCase() + program.focus.slice(1)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Difficulty:</span>
          <span className={`difficulty-badge ${getDifficultyColor(program.difficulty)}`}>
            {program.difficulty.charAt(0).toUpperCase() + program.difficulty.slice(1)}
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Weekly Frequency:</span>
          <span className="meta-value">{program.weekly_frequency} days/week</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Session Length:</span>
          <span className="meta-value">{program.session_length} min</span>
        </div>
      </div>

      {/* Stats (only for own programs) */}
      {isOwn && (
        <div className="program-stats">
          <div className="stat">
            <span className="stat-value">{program.sections?.length || 0}</span>
            <span className="stat-label">Sections</span>
          </div>
          <div className="stat">
            <span className="stat-value">{getTotalExercises(program)}</span>
            <span className="stat-label">Exercises</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="program-actions">
        <button 
          onClick={() => viewProgramDetails(program)}
          className="btn-view"
        >
          View Details
        </button>
        {isOwn && (
          <button 
            onClick={() => router.push(`/edit-program/${program.id}`)}
            className="btn-edit"
          >
            Edit
          </button>
        )}
      </div>

      {/* Created Date */}
      <p className="program-date">
        Created {formatDate(program.created_at)}
      </p>
    </div>
  );

  const renderEmptyState = (type: 'my' | 'others') => {
    if (type === 'my') {
      return (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No Programs Yet</h3>
          <p>You haven&apos;t created any workout programs yet.</p>
          <button 
            onClick={() => router.push('/create-program')}
            className="btn-primary"
          >
            Create Your First Program
          </button>
        </div>
      );
    }

    return (
      <div className="empty-state">
        <div className="empty-icon">🔍</div>
        <h3>No Other Programs Available</h3>
        <p>There are currently no programs from other trainers.</p>
      </div>
    );
  };

  // ========================================
  // Loading State
  // ========================================

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // ========================================
  // Render
  // ========================================

  return (
    <div className="trainer-programs-container">
      {/* Header */}
      <div className="header">
        <button onClick={() => router.push('/dashboard')} className="back-button">
          ← Back to Dashboard
        </button>
        <h1>Workout Programs</h1>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab ${activeTab === 'my' ? 'active' : ''}`}
          onClick={() => setActiveTab('my')}
        >
          My Programs ({myPrograms.length})
        </button>
        <button 
          className={`tab ${activeTab === 'others' ? 'active' : ''}`}
          onClick={() => setActiveTab('others')}
        >
          Other Trainers ({otherPrograms.length})
        </button>
      </div>

      <div className="content">
        {/* My Programs Tab */}
        {activeTab === 'my' && (
          <section className="programs-section">
            <div className="section-header">
              <h2>My Created Workout Plans</h2>
              <button 
                onClick={() => router.push('/create-program')}
                className="btn-create"
              >
                + Create New Program
              </button>
            </div>

            {myPrograms.length === 0 ? (
              renderEmptyState('my')
            ) : (
              <div className="programs-grid">
                {myPrograms.map((program) => renderProgramCard(program, true))}
              </div>
            )}
          </section>
        )}

        {/* Other Trainers Tab */}
        {activeTab === 'others' && (
          <section className="programs-section">
            <h2>Other Trainers&apos; Workout Plans</h2>
            <p className="section-description">
              Explore and view programs created by other trainers.
            </p>

            {otherPrograms.length === 0 ? (
              renderEmptyState('others')
            ) : (
              <div className="programs-grid">
                {otherPrograms.map((program) => renderProgramCard(program, false))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
