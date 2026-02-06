'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { programAPI } from '@/library/api';
import type { WorkoutPlanData } from '@/library/api';
import './programs.css';

export default function ProgramsPage() {
  const { user, isLoading } = useAuth();
  const [programs, setPrograms] = useState<WorkoutPlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const list = await programAPI.listPublished();
        setPrograms(list);
      } catch {
        setError('Failed to load programs.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="programs-page">
      <header className="programs-header">
        <Link href={user ? '/dashboard' : '/'} className="programs-back-link">
          ← {user ? 'Dashboard' : 'Home'}
        </Link>
        <h1>Programs</h1>
        <p className="programs-subtitle">
          Discover workout programs published by trainers. Complete your profile to get personalized recommendations.
        </p>
      </header>

      {error && <div className="programs-alert programs-alert-error">{error}</div>}

      {loading ? (
        <div className="programs-loading">Loading programs...</div>
      ) : programs.length === 0 ? (
        <div className="programs-empty">
          <p>No published programs yet.</p>
          <p className="programs-empty-hint">
            When trainers publish their programs, they will appear here.
          </p>
        </div>
      ) : (
        <ul className="programs-grid">
          {programs.map((program) => (
            <li key={program.id} className="programs-card">
              <h3 className="programs-card-name">{program.name}</h3>
              {program.trainer_name && (
                <p className="programs-card-trainer">by {program.trainer_name}</p>
              )}
              {program.description && (
                <p className="programs-card-desc">{program.description}</p>
              )}
              <div className="programs-card-meta">
                <span className="programs-badge">{program.focus}</span>
                <span className="programs-badge">{program.difficulty}</span>
                <span>{program.weekly_frequency}×/week</span>
                <span>{program.session_length} min/session</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
