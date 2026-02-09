'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import './trainer-programs.css';

interface Program {
  id: number;
  name: string;
  description: string;
  focus: string;
  difficulty: string;
  weekly_frequency: number;
  session_length: number;
  is_subscription: boolean;
  trainer: number;
  created_at: string;
  sections?: Array<{
    format: string;
    type: string;
    exercises: Array<{
      name: string;
      sets: any[];
    }>;
  }>;
}

export default function TrainerProgramsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [myPrograms, setMyPrograms] = useState<Program[]>([]);
  const [otherPrograms, setOtherPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'others'>('my');

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/programs/', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        // Split programs into user's and others'
        const mine = data.filter((p: Program) => p.trainer === user?.id);
        const others = data.filter((p: Program) => p.trainer !== user?.id);
        
        setMyPrograms(mine);
        setOtherPrograms(others);
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'beginner';
      case 'intermediate':
        return 'intermediate';
      case 'advanced':
        return 'advanced';
      default:
        return 'beginner';
    }
  };

  const getFocusIcon = (focus: string) => {
    switch (focus.toLowerCase()) {
      case 'strength':
        return '💪';
      case 'cardio':
        return '🏃';
      case 'flexibility':
        return '🧘';
      case 'balance':
        return '⚖️';
      default:
        return '🏋️';
    }
  };

  const viewProgramDetails = (program: Program) => {
    // If it's user's own program OR a free program, show full details
    if (program.trainer === user?.id || !program.is_subscription) {
      router.push(`/program/${program.id}`);
    } else {
      // If it requires subscription and user doesn't own it, show preview only
      router.push(`/program/${program.id}/preview`);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

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
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No Programs Yet</h3>
                <p>You haven't created any workout programs yet.</p>
                <button 
                  onClick={() => router.push('/create-program')}
                  className="btn-primary"
                >
                  Create Your First Program
                </button>
              </div>
            ) : (
              <div className="programs-grid">
                {myPrograms.map((program) => (
                  <div key={program.id} className="program-card my-program">
                    <div className="program-badge">Your Program</div>
                    <div className="program-header">
                      <span className="focus-icon">{getFocusIcon(program.focus)}</span>
                      <h3 className="program-title">{program.name}</h3>
                    </div>
                    
                    <p className="program-description">{program.description || 'No description provided'}</p>

                    <div className="program-meta">
                      <div className="meta-item">
                        <span className="meta-label">Focus:</span>
                        <span className="meta-value">{program.focus}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Difficulty:</span>
                        <span className={`difficulty-badge ${getDifficultyColor(program.difficulty)}`}>
                          {program.difficulty}
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
                      <div className="meta-item">
                        <span className="meta-label">Subscription:</span>
                        <span className={`subscription-badge ${program.is_subscription ? 'required' : 'free'}`}>
                          {program.is_subscription ? '🔒 Required' : '✓ Free'}
                        </span>
                      </div>
                    </div>

                    <div className="program-stats">
                      <div className="stat">
                        <span className="stat-value">{program.sections?.length || 0}</span>
                        <span className="stat-label">Sections</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">
                          {program.sections?.reduce((acc, s) => acc + s.exercises.length, 0) || 0}
                        </span>
                        <span className="stat-label">Exercises</span>
                      </div>
                    </div>

                    <div className="program-actions">
                      <button 
                        onClick={() => viewProgramDetails(program)}
                        className="btn-view"
                      >
                        View Details
                      </button>
                      <button 
                        onClick={() => router.push(`/edit-program/${program.id}`)}
                        className="btn-edit"
                      >
                        Edit
                      </button>
                    </div>

                    <p className="program-date">
                      Created {new Date(program.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Other Trainers Tab */}
        {activeTab === 'others' && (
          <section className="programs-section">
            <h2>Other Trainers' Workout Plans</h2>
            <p className="section-description">
              Explore programs from other trainers. Some programs require a subscription.
            </p>

            {otherPrograms.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>No Other Programs Available</h3>
                <p>There are currently no programs from other trainers.</p>
              </div>
            ) : (
              <div className="programs-grid">
                {otherPrograms.map((program) => (
                  <div key={program.id} className="program-card other-program">
                    <div className={`program-badge ${program.is_subscription ? 'premium' : 'free'}`}>
                      {program.is_subscription ? '🔒 Premium' : '✓ Free'}
                    </div>
                    <div className="program-header">
                      <span className="focus-icon">{getFocusIcon(program.focus)}</span>
                      <h3 className="program-title">{program.name}</h3>
                    </div>
                    
                    <p className="program-description">{program.description || 'No description provided'}</p>

                    <div className="program-meta">
                      <div className="meta-item">
                        <span className="meta-label">Focus:</span>
                        <span className="meta-value">{program.focus}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Difficulty:</span>
                        <span className={`difficulty-badge ${getDifficultyColor(program.difficulty)}`}>
                          {program.difficulty}
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

                    {program.is_subscription && (
                      <div className="subscription-notice">
                        <p>🔒 Subscribe to view full workout details</p>
                      </div>
                    )}

                    <div className="program-actions">
                      <button 
                        onClick={() => viewProgramDetails(program)}
                        className="btn-view"
                      >
                        {program.is_subscription ? 'Preview Program' : 'View Details'}
                      </button>
                    </div>

                    <p className="program-date">
                      Created {new Date(program.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}

                {/* Show subscription card if there are subscription programs */}
                {otherPrograms.some(p => p.is_subscription) && (
                  <div className="program-card subscription-card">
                    <div className="lock-icon">🔒</div>
                    <h3>Premium Access</h3>
                    <p className="subscription-description">
                      Subscribe to unlock all premium workout programs
                    </p>
                    
                    <div className="subscription-benefits">
                      <div className="benefit">✓ Unlimited premium programs</div>
                      <div className="benefit">✓ Full workout details</div>
                      <div className="benefit">✓ Progress tracking</div>
                      <div className="benefit">✓ Personalized recommendations</div>
                    </div>

                    <div className="subscription-pricing">
                      <span className="price">$9.99</span>
                      <span className="period">/month</span>
                    </div>

                    <button className="btn-subscribe">
                      Subscribe Now
                    </button>

                    <p className="subscription-note">
                      Cancel anytime. No commitments.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}