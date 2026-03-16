'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';
import '../landing.css';

export default function PrivacyPolicy() {
  return (
    <div className="landing-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="landing-header">
        <Link href="/" className="landing-logo">
          <Logo variant="full" size="sm" />
        </Link>
        <Link href="/"><Button variant="ghost" size="sm">Back to Home</Button></Link>
      </header>

      <main style={{ padding: '160px 4rem 80px', flex: 1, maxWidth: '800px', margin: '0 auto' }}>
        <h1 className="section-title" style={{ textAlign: 'left' }}>Privacy Policy</h1>
        
        <div style={{ color: 'var(--text-secondary)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <p>
            At Fitiva, we are committed to protecting the data of our student and trainer community. 
            This policy outlines how your information is handled within our academic project.
          </p>

          <section>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>1. Data Storage</h3>
            <p>
              Your profile information and workout history are stored securely in a MySQL 8.0 database. 
              We use session-based authentication to ensure only you can access your personal training plans.
            </p>
          </section>

          <section>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>2. Trainer Access</h3>
            <p>
              Workout feedback provided by members is aggregated and anonymized before being shared with trainers. 
              Trainers cannot see individual user IDs or names in their feedback dashboard.
            </p>
          </section>

          <section>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>3. Academic Purpose</h3>
            <p>
              This application is developed strictly for EECS 2311 at York University. 
              Data collected is for demonstration purposes within Group 2, Section Z.
            </p>
          </section>
        </div>
      </main>

      <footer className="landing-footer" style={{ padding: '2rem' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
          Last Updated: March 2026.
        </p>
      </footer>
    </div>
  );
}