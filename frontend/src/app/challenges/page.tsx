'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { challengeAPI } from '@/library/api';
import Logo from '@/components/ui/Logo';
import './challenges.css'; 

interface Challenge {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  goal_criteria: Record<string, number>;
  reward_points: number;
  reward_badge: string;
}

export default function ChallengesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<number | null>(null);

  useEffect(() => {
    challengeAPI.listChallenges()
      .then((data: any) => {
        if (data && data.results) {
          setChallenges(data.results);
        } else if (Array.isArray(data)) {
          setChallenges(data);
        } else {
          setChallenges([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load challenges:", err);
        setChallenges([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleJoin = async (id: number) => {
    setJoining(id);
    try {
      await challengeAPI.joinChallenge(id);
      window.location.reload(); 
    } catch {
      alert('Failed to join');
    } finally {
      setJoining(null);
    }
  };

  if (loading) return <div className="loading">Loading challenges...</div>;

  return (
    <div className="challenges-page">
      <header className="challenges-header">
        <button onClick={() => router.back()} className="back-button">
          ← Back
        </button>
        <Link href="/dashboard" className="logo-link">
          <Logo variant="text" size="md" />
        </Link>
        <h1>Weekly Challenges</h1>
      </header>

      <div className="challenges-list">
        {Array.isArray(challenges) && challenges.length > 0 ? (
          challenges.map((c) => (
            <div key={c.id} className="challenge-item">
              <div className="challenge-info">
                <h2>{c.name}</h2>
                <p className="challenge-description">{c.description}</p>
                
                <div className="challenge-dates">
                  🗓️ {new Date(c.start_date).toLocaleDateString()} - {new Date(c.end_date).toLocaleDateString()}
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
                onClick={() => handleJoin(c.id)}
                disabled={joining === c.id}
                className="join-button"
              >
                {joining === c.id ? 'Joining...' : 'Join Challenge'}
              </button>
            </div>
          ))
        ) : (
          <p className="empty-message">No active challenges found right now.</p>
        )}
      </div>
    </div>
  );
}