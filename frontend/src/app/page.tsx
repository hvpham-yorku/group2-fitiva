'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import SettingsModal from '@/components/ui/SettingsModal';
import './landing.css';

export default function LandingPage() {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Standard Initials Logic from Dashboard
  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : '';

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-container">
      <header className="landing-header">
        <div className="landing-logo" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} style={{cursor: 'pointer'}}>
          <Logo variant="full" size="sm" />
        </div>

        <nav className="landing-nav-tabs">
          <button onClick={() => scrollToSection('features')}>Features</button>
          <button onClick={() => scrollToSection('mission')}>Mission</button>
          <button onClick={() => scrollToSection('trainers')}>Trainers</button>
          <button onClick={() => scrollToSection('about')}>About</button>
        </nav>

        <div className="landing-auth-zone">
          {user ? (
            <div className="user-menu" ref={dropdownRef}>
              <button className="user-menu-trigger" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                <div className="user-avatar">{initials}</div>
                <svg className={`dropdown-icon ${isDropdownOpen ? 'open' : ''}`} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div className={`user-menu-dropdown ${isDropdownOpen ? 'open' : ''}`}>
                <div className="dropdown-header">
                  <div className="dropdown-user-name">{user.first_name} {user.last_name}</div>
                  <div className="dropdown-user-email">{user.email}</div>
                  <span className={`user-badge ${user.is_trainer ? 'trainer' : ''}`} style={{fontSize: '0.65rem'}}>
                    {user.is_trainer ? 'Trainer' : 'Member'}
                  </span>
                </div>
                <ul className="dropdown-menu-items">
                  <li><Link href="/dashboard" className="dropdown-menu-item">Go to Dashboard</Link></li>
                  <li><button className="dropdown-menu-item" onClick={() => setIsSettingsOpen(true)}>Settings</button></li>
                  <div className="dropdown-divider"></div>
                  <li><button onClick={logout} className="dropdown-menu-item danger">Logout</button></li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link href="/signup"><Button className="signup-btn" variant="primary" size="sm">Sign Up</Button></Link>
              <Link href="/login"><Button variant="ghost" size="sm">Log In</Button></Link>
            </div>
          )}
        </div>
      </header>

      <section id="hero" className="hero-section">
        <div className="hero-content">
          <h1>TRANSFORM YOUR FITNESS <span className="text-gradient">JOURNEY</span></h1>
          <p>Personalized workout planning designed for gym-goers and professional trainers alike. Simple. Minimalist. Effective.</p>
          <div className="hero-cta">
            <Link href="/signup"><Button size="lg">START YOUR 4-WEEK PLAN</Button></Link>
          </div>
        </div>
        <div className="hero-image">
          <Image src="/resources/gym-hero.jpg" alt="Gym training" className="landing-img" width={1200} height={675} priority />
        </div>
      </section>

      <section id="features" className="features-section">
        <h2 className="section-title">Why Fitiva?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <h3>Smart Scheduling</h3>
            <p>Auto-generate 4-week schedules and merge multiple programs into one cohesive calendar.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⋮⋮</div>
            <h3>Drag & Drop</h3>
            <p>Effortlessly reorder exercises within your workout days with our smooth, native interface.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Live Progress</h3>
            <p>Track your streaks, total workout time, and post-session feedback in a minimalist dashboard.</p>
          </div>
        </div>
      </section>

      <section id="mission" className="mission-section">
        <div className="mission-content">
          <h2>Our Mission</h2>
          <p>We believe that fitness should be accessible and organized. Fitiva was developed at York University to bridge the gap between complex training data and actual results. We remove the clutter so you can focus on the reps.</p>
        </div>
      </section>

      <section id="trainers" className="trainer-promo-section">
        <div className="trainer-image">
          <Image src="/resources/trainer-stock.jpg" alt="Fitness Trainer" className="landing-img" width={800} height={500} />
        </div>
        <div className="trainer-content">
          <h2>Are you a Trainer?</h2>
          <p>Publish your own programs, manage exercise templates, and get aggregated, anonymized feedback from your trainees.</p>
          <Link href="/signup?role=trainer"><Button variant="secondary">CREATE TRAINER ACCOUNT</Button></Link>
        </div>
      </section>

      <footer id="about" className="landing-footer">
        <div className="footer-content">
          <Logo variant="text" size="md" />
          <p style={{marginTop: '1rem'}}>Developed by Group 2, Section Z - EECS 2311</p>
          <p>‎ </p>
          <p>Team Members:</p>
          <p>‎ </p>
          <p>Ege Yesilyurt - @egeyesss</p>
          <p>Weiqin Situ - @kevinsitu1706</p>
          <p>Arshia Hassanpour - @Arshi-prog</p>
          <p>Raha Golsorkhi - @raha-golsorkhi</p>
          <p>Dawood Al-Janaby - @DaveT1991</p>
          <p>Nurjahan Ahmed Shiah	- @nurjahan-shiah</p>
          <div className="footer-links" style={{marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '2rem'}}>
            <Link href="/help" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>Help Center</Link>
            <Link href="/privacy" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>Privacy Policy</Link>
          </div>
        </div>
      </footer>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}