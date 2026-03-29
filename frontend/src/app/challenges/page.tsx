'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { challengeAPI, type Challenge } from '@/library/api';
import Logo from '@/components/ui/Logo';
import './challenges.css';

type TabId = 'global' | 'trainer';

export default function ChallengesPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<number | null>(null);
  const [tab, setTab] = useState<TabId>('global');
  // Refactored: replaced alert() with an in-page error message to match the notification style used across all other pages.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    challengeAPI
      .listChallenges()
      .then((data) => setChallenges(data))
      .catch((err) => {
        console.error('Failed to load challenges:', err);
        setChallenges([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const globalChallenges = useMemo(
    () => challenges.filter((c) => c.trainer == null),
    [challenges]
  );
  const trainerChallenges = useMemo(
    () => challenges.filter((c) => c.trainer != null),
    [challenges]
  );

  const visibleList = tab === 'global' ? globalChallenges : trainerChallenges;

  const handleJoin = async (id: number) => {
    setJoining(id);
    try {
      await challengeAPI.joinChallenge(id);
      router.push('/dashboard');
    } catch {
      setErrorMessage('Failed to join challenge. Please try again.');
    } finally {
      setJoining(null);
    }
  };

  if (loading) return <div className="loading">Loading challenges...</div>;

  return (
    <div className="challenges-page">
      {errorMessage && (
        <div className="notification error" role="alert">
          {errorMessage}
          <button onClick={() => setErrorMessage(null)}>×</button>
        </div>
      )}
      <header className="challenges-header">
        <button type="button" onClick={() => router.back()} className="back-button">
          ← Back
        </button>
        <Link href="/dashboard" className="logo-link">
          <Logo variant="text" size="md" />
        </Link>
        <h1>Browse Challenges</h1>
      </header>

      <div className="challenges-tabs" role="tablist" aria-label="Challenge categories">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'global'}
          className={`challenges-tab ${tab === 'global' ? 'active' : ''}`}
          onClick={() => setTab('global')}
        >
          Global Challenges
          <span className="tab-count">{globalChallenges.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'trainer'}
          className={`challenges-tab ${tab === 'trainer' ? 'active' : ''}`}
          onClick={() => setTab('trainer')}
        >
          Trainer Challenges
          <span className="tab-count">{trainerChallenges.length}</span>
        </button>
      </div>

      <div className="challenges-list" role="tabpanel">
        {visibleList.length > 0 ? (
          visibleList.map((c) => (
            <div key={c.id} className="challenge-item">
              <div className="challenge-info">
                <h2>{c.name}</h2>
                {c.trainer_name ? (
                  <div className="challenge-hosted-line">Hosted by {c.trainer_name}</div>
                ) : null}
                <p className="challenge-description">{c.description}</p>

                <div className="challenge-dates">
                  🗓️ {new Date(c.start_date).toLocaleDateString()} -{' '}
                  {new Date(c.end_date).toLocaleDateString()}
                </div>

                <div className="challenge-goals">
                  {Object.entries(c.goal_criteria).map(([k, v]) => (
                    <span key={k} className="goal-badge">
                      {k.replace('_', ' ')}: {v}
                    </span>
                  ))}
                </div>

                <div className="challenge-reward">
                  🏆 {c.reward_badge} <span className="points">(+{c.reward_points} pts)</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleJoin(c.id)}
                disabled={joining === c.id}
                className="join-button"
              >
                {joining === c.id ? 'Joining...' : 'Join Challenge'}
              </button>
            </div>
          ))
        ) : (
          <p className="empty-message">
            {tab === 'global'
              ? 'No global challenges right now.'
              : 'No trainer challenges right now.'}
          </p>
        )}
      </div>
    </div>
  );
}
