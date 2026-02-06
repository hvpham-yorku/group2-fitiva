'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { programAPI, ApiError } from '@/library/api';
import '@/app/create-program/create-program.css';

const FOCUS_OPTIONS = [
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'mixed', label: 'Mixed' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export default function EditProgramPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id ? Number(params.id) : NaN;
  const [form, setForm] = useState({
    name: '',
    description: '',
    focus: 'mixed',
    difficulty: 'beginner',
    weekly_frequency: '3',
    session_length: '45',
    is_subscription: false,
    is_published: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && user && !user.is_trainer) {
      router.replace('/dashboard');
      return;
    }
    if (!id || !user?.is_trainer) return;
    const load = async () => {
      setLoading(true);
      try {
        const program = await programAPI.get(id);
        setForm({
          name: program.name,
          description: program.description || '',
          focus: program.focus,
          difficulty: program.difficulty,
          weekly_frequency: String(program.weekly_frequency),
          session_length: String(program.session_length),
          is_subscription: program.is_subscription || false,
          is_published: program.is_published || false,
        });
      } catch {
        setErrors({ general: 'Program not found.' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user, isLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || isNaN(id)) return;
    setErrors({});
    const weekly = parseInt(form.weekly_frequency, 10);
    const session = parseInt(form.session_length, 10);
    if (!form.name.trim()) {
      setErrors({ name: 'Program name is required.' });
      return;
    }
    if (isNaN(weekly) || weekly < 1 || weekly > 7) {
      setErrors({ weekly_frequency: 'Enter 1–7 sessions per week.' });
      return;
    }
    if (isNaN(session) || session < 5 || session > 180) {
      setErrors({ session_length: 'Enter 5–180 minutes per session.' });
      return;
    }
    setSaving(true);
    try {
      await programAPI.update(id, {
        name: form.name.trim(),
        description: form.description.trim(),
        focus: form.focus,
        difficulty: form.difficulty,
        weekly_frequency: weekly,
        session_length: session,
        is_subscription: form.is_subscription,
        is_published: form.is_published,
      });
      router.push('/my-programs');
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setErrors(err.errors as Record<string, string>);
      } else {
        setErrors({ general: 'Failed to update program.' });
      }
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) {
    return <div className="create-program-page"><div className="loading">Loading...</div></div>;
  }

  if (!user.is_trainer) return null;

  if (loading) {
    return <div className="create-program-page"><div className="loading">Loading program...</div></div>;
  }

  return (
    <div className="create-program-page">
      <header className="create-program-header">
        <Link href="/my-programs" className="back-link">← My programs</Link>
        <h1>Edit program</h1>
      </header>

      <main className="create-program-main">
        {errors.general && <div className="alert alert-error">{errors.general}</div>}
        <form onSubmit={handleSubmit} className="create-program-form">
          <div className="form-group">
            <label htmlFor="name" className="form-label">Program name <span className="required">*</span></label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={100}
              value={form.name}
              onChange={handleChange}
              className={`form-input ${errors.name ? 'error' : ''}`}
            />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              className="form-input form-textarea"
              rows={4}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="focus" className="form-label">Focus</label>
              <select id="focus" name="focus" value={form.focus} onChange={handleChange} className="form-input">
                {FOCUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="difficulty" className="form-label">Difficulty</label>
              <select id="difficulty" name="difficulty" value={form.difficulty} onChange={handleChange} className="form-input">
                {DIFFICULTY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="weekly_frequency" className="form-label">Sessions per week <span className="required">*</span></label>
              <input
                id="weekly_frequency"
                name="weekly_frequency"
                type="number"
                min={1}
                max={7}
                value={form.weekly_frequency}
                onChange={handleChange}
                className={`form-input ${errors.weekly_frequency ? 'error' : ''}`}
              />
              {errors.weekly_frequency && <p className="form-error">{errors.weekly_frequency}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="session_length" className="form-label">Session length (min) <span className="required">*</span></label>
              <input
                id="session_length"
                name="session_length"
                type="number"
                min={5}
                max={180}
                value={form.session_length}
                onChange={handleChange}
                className={`form-input ${errors.session_length ? 'error' : ''}`}
              />
              {errors.session_length && <p className="form-error">{errors.session_length}</p>}
            </div>
          </div>
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" name="is_subscription" checked={form.is_subscription} onChange={handleChange} className="form-checkbox" />
              Subscription-based program
            </label>
          </div>
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" name="is_published" checked={form.is_published} onChange={handleChange} className="form-checkbox" />
              Published (visible in Browse Programs)
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <Link href="/my-programs" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
