'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Notification from '@/components/Notification';
import { challengeAPI, ApiError } from '@/library/api';
import './create-challenge.css';

interface ProgramOption {
  id: number;
  name: string;
  trainer: number;
}

export default function CreateChallengePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [programId, setProgramId] = useState('');
  const [endDate, setEndDate] = useState('');

  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const myPrograms = useMemo(() => {
    if (!user?.id) return [];
    return programs.filter((p) => String(p.trainer) === String(user.id));
  }, [programs, user?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/programs/`,
          { credentials: 'include' }
        );
        if (!res.ok) throw new Error('Failed to load programs');
        const data = await res.json();
        const list: ProgramOption[] = data.results || data || [];
        if (!cancelled) setPrograms(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setPrograms([]);
      } finally {
        if (!cancelled) setLoadingPrograms(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const showError = (message: string) => setNotification({ type: 'error', message });
  const showSuccess = (message: string) => setNotification({ type: 'success', message });

  const todayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  /** Challenge end must be strictly after start_date (we default start to today). */
  const minEndDateIso = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pid = parseInt(programId, 10);
    if (!name.trim() || Number.isNaN(pid) || !endDate) {
      showError('Please fill in challenge name, program, and end date.');
      return;
    }
    if (!endDate || endDate <= todayIso()) {
      showError('End date must be after the start date (choose tomorrow or later).');
      return;
    }

    setSubmitting(true);
    try {
      await challengeAPI.createTrainerChallenge({
        name: name.trim(),
        description: description.trim(),
        program: pid,
        end_date: endDate,
        start_date: todayIso(),
      });
      showSuccess('Challenge created! Redirecting to your dashboard…');
      setTimeout(() => router.push('/dashboard'), 900);
    } catch (err) {
      if (err instanceof ApiError) {
        showError(err.message || 'Could not create challenge.');
      } else {
        showError('Could not create challenge. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <ProtectedRoute>
        <div className="create-challenge-container">
          <div className="content" style={{ padding: '3rem', textAlign: 'center' }}>
            Loading…
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!user?.is_trainer) {
    return (
      <ProtectedRoute>
        <div className="create-challenge-container">
          <div className="header">
            <button type="button" className="back-button" onClick={() => router.back()}>
              ← Back
            </button>
            <h1>Host a Challenge</h1>
          </div>
          <div className="content">
            <div className="trainer-only-message">
              Only trainer accounts can create challenges.{' '}
              <Link href="/dashboard">Return to dashboard</Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="create-challenge-container">
        {notification && (
          <Notification
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}

        <div className="header">
          <button type="button" className="back-button" onClick={() => router.back()}>
            ← Back
          </button>
          <h1>Host a Challenge</h1>
        </div>

        <div className="content">
          {loadingPrograms ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading your programs…</p>
          ) : myPrograms.length === 0 ? (
            <div className="empty-programs-hint">
              You need at least one published program to host a challenge.{' '}
              <Link href="/create-program">Create a program</Link> first, then come back here.
            </div>
          ) : (
            <form className="create-challenge-form" onSubmit={handleSubmit}>
              <label>
                Challenge name <span className="field-hint">(required)</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. February Strength Sprint"
                  maxLength={100}
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What should participants do? Goals use the default weekly targets unless your team adds custom rules later."
                />
              </label>

              <label>
                Target program <span className="field-hint">(required)</span>
                <select
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                  required
                >
                  <option value="">Select a program…</option>
                  {myPrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                End date <span className="field-hint">(must be after today)</span>
                <input
                  type="date"
                  value={endDate}
                  min={minEndDateIso()}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </label>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-submit-challenge"
                  disabled={submitting}
                >
                  {submitting ? 'Creating…' : 'Create challenge'}
                </button>
                <button
                  type="button"
                  className="btn-cancel-challenge"
                  onClick={() => router.push('/dashboard')}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
