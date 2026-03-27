'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sessionAPI } from '@/library/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './history.css';

interface Session {
  id: number;
  date: string;
  status?: 'completed' | 'missed' | 'in_progress';
  plan_name?: string | null;
  duration_minutes?: number | null;
}

export default function HistoryPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await sessionAPI.getWorkoutHistory(
        startDate || undefined,
        endDate || undefined
      ) as { sessions: Session[] };

      setSessions(data.sessions || []);
    } catch (err) {
      console.error(err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  if (isLoading || loading) {
    return <div className="history-loading">Loading...</div>;
  }

  return (
    <div className="history-container">

      {/* Back */}
      <div className="history-top-nav">
        <span
          className="history-back-link"
          onClick={() => router.push('/dashboard')}
        >
          ← Back to Dashboard
        </span>
      </div>

      <div className="history-header">
        <div className="history-title-box">
          <h1>Workout History</h1>
        </div>

        <p className="history-description">
          View all your completed workouts across your entire fitness journey 💪
        </p>

        {/* Filters */}
        <div className="history-filters">
          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <button className="filter-btn" onClick={fetchHistory}>
            Apply Filter
          </button>

          <button
            className="filter-reset"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              fetchHistory();
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="history-empty">
          <p>No activity records yet.</p>
          <Link href="/schedule" className="history-link">
            Go to Schedule
          </Link>
        </div>
      ) : (
        <div className="history-list">
          {sessions.map((session) => (
            <div key={session.id} className="history-card">
              <div className="history-date">
                {new Date(session.date + 'T12:00:00').toLocaleDateString()}
              </div>

              <div className="history-info">
                <div className="history-plan">
                  {session.status === 'missed' ? 'Missed workout' : (session.plan_name || 'Workout')}
                </div>

                <div className="history-duration">
                  {session.status === 'missed'
                    ? 'Missed'
                    : (session.duration_minutes
                      ? `${session.duration_minutes} min`
                      : '--')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}