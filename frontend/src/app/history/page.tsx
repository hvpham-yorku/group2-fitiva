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
  plan_name?: string | null;
  duration_minutes?: number | null;
}

export default function HistoryPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await sessionAPI.getWorkoutHistory() as { sessions: Session[] };
        setSessions(data.sessions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchHistory();
  }, [user]);

  if (isLoading || loading) {
    return <div className="history-loading">Loading...</div>;
  }

  return (
    <div className="history-container">

        <div className="history-top-nav">
            <span
            className="history-back-link"
            onClick={() => router.push('/dashboard')}
            >
            ← Back to Dashboard
            </span>
        </div>

        <div className="history-header-banner">
            <div className="history-title-box">
            <h1>Workout History</h1>
            </div>

            <p className="history-description">
                View all your completed workouts across your entire fitness journey 💪
            </p>
                    </div>

      {sessions.length === 0 ? (
        <div className="history-empty">
          <p>No completed workouts yet.</p>
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
                  {session.plan_name || 'Workout'}
                </div>

                <div className="history-duration">
                  {session.duration_minutes
                    ? `${session.duration_minutes} min`
                    : '--'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}