'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';
import '../landing.css';

export default function HelpCenter() {
  return (
    <div className="landing-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="landing-header">
        <Link href="/" className="landing-logo">
          <Logo variant="full" size="sm" />
        </Link>
        <Link href="/"><Button variant="ghost" size="sm">Back to Home</Button></Link>
      </header>

      <main style={{ padding: '160px 4rem 80px', flex: 1, maxWidth: '800px', margin: '0 auto' }}>
        <h1 className="section-title" style={{ textAlign: 'left' }}>Help Center</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Welcome to the Fitiva Help Center. How can we assist you today?
        </p>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem', textTransform: 'uppercase' }}>Frequently Asked Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', borderRadius: '0.5rem' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem' }}>How do I start a workout?</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Go to your Schedule page and click &quot;Start Workout&quot; on any planned session.</p>
            </div>
            <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', borderRadius: '0.5rem' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Can I create my own exercises?</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>If you are a Trainer, you can manage custom templates in the Exercise Library.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem', textTransform: 'uppercase' }}>Contact Support</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            For project-related inquiries, please reach out to Group 2, Section Z.
          </p>
        </section>
      </main>

      <footer className="landing-footer" style={{ padding: '2rem' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
          © 2026 Fitiva - EECS 2311 Software Development Project.
        </p>
      </footer>
    </div>
  );
}