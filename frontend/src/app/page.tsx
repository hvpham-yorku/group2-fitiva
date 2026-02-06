'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import './home.css';

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="home-page">
        <div className="home-loading">Loading...</div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="home-page">
        <div className="home-box">
          <h1 className="home-logo">Fitiva</h1>
          <p className="home-welcome">Welcome back, {user.first_name}!</p>
          <Link href="/dashboard" className="home-cta">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-box">
        <h1 className="home-logo">Fitiva</h1>
        <p className="home-tagline">Your personal fitness journey starts here.</p>
        <div className="home-actions">
          <Link href="/login" className="home-cta primary">
            Sign in
          </Link>
          <Link href="/signup" className="home-cta secondary">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
