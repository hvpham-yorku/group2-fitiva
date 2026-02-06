'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { programAPI, ApiError } from '@/library/api';
import type { WorkoutPlanData } from '@/library/api';
import './my-programs.css';

export default function MyProgramsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const createdId = searchParams.get('created');
  const [programs, setPrograms] = useState<WorkoutPlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && user && !user.is_trainer) {
      router.replace('/dashboard');
      return;
    }
    if (!user?.is_trainer) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const list = await programAPI.listMine();
        setPrograms(list);
      } catch {
        setError('Failed to load your programs.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, isLoading, router]);

  const handlePublish = async (id: number, current: boolean) => {
    setActionId(id);
    try {
      await programAPI.publish(id, !current);
      setPrograms((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_published: !current } : p))
      );
    } catch {
      setError('Failed to update publish status.');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete program "${name}"? This cannot be undone.`)) return;
    setActionId(id);
    try {
      await programAPI.delete(id);
      setPrograms((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError('Failed to delete program.');
    } finally {
      setActionId(null);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="my-programs-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!user.is_trainer) {
    return null;
  }

  return (
    <div className="my-programs-page">
      <header className="my-programs-header">
        <Link href="/dashboard" className="back-link">← Dashboard</Link>
        <h1>My programs</h1>
        <p className="subtitle">Manage and publish your workout programs.</p>
      </header>

      {createdId && (
        <div className="alert alert-success">
          Program created successfully. You can publish it below so it appears in Browse Programs.
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="my-programs-actions">
        <Link href="/create-program" className="btn-primary">Create program</Link>
      </div>

      {loading ? (
        <div className="loading">Loading programs...</div>
      ) : programs.length === 0 ? (
        <div className="empty-state">
          <p>You haven&apos;t created any programs yet.</p>
          <Link href="/create-program" className="btn-primary">Create your first program</Link>
        </div>
      ) : (
        <ul className="program-list">
          {programs.map((program) => (
            <li key={program.id} className="program-card">
              <div className="program-card-main">
                <h3 className="program-name">{program.name}</h3>
                {program.description && (
                  <p className="program-description">{program.description}</p>
                )}
                <div className="program-meta">
                  <span className="badge">{program.focus}</span>
                  <span className="badge">{program.difficulty}</span>
                  <span>{program.weekly_frequency}×/week</span>
                  <span>{program.session_length} min/session</span>
                  {program.is_published ? (
                    <span className="status published">Published</span>
                  ) : (
                    <span className="status draft">Draft</span>
                  )}
                </div>
              </div>
              <div className="program-card-actions">
                <button
                  type="button"
                  className="btn-sm btn-secondary"
                  onClick={() => handlePublish(program.id, program.is_published)}
                  disabled={actionId === program.id}
                >
                  {actionId === program.id ? '…' : program.is_published ? 'Unpublish' : 'Publish'}
                </button>
                <Link href={`/my-programs/${program.id}/edit`} className="btn-sm btn-outline">
                  Edit
                </Link>
                <button
                  type="button"
                  className="btn-sm btn-danger"
                  onClick={() => handleDelete(program.id, program.name)}
                  disabled={actionId === program.id}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
