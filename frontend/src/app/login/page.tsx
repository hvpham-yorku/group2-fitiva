'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/ui/Logo';
import { ApiError } from '@/library/api';
import './login.css';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function LoginPage() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    login: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(formData);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left Side - Gym Image */}
      <div className="login-left">
        <div className="gym-image"></div>
        <div className="diagonal-overlay"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-right">
        <ThemeToggle />
        <div className="login-box">
          {/* Logo */}
          <div className="logo-container">
            <Logo variant="full" size="md" />
          </div>

          {/* Header */}
          <div className="login-header">
            <h2 className="login-title">Sign in to your account</h2>
            <p className="login-subtitle">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="login-link">
                Sign up
              </Link>
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-error">
              <p className="alert-text">{error}</p>
            </div>
          )}

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="login" className="form-label">
                Username or Email<span className="required-asterisk">*</span>
              </label>
              <input
                id="login"
                name="login"
                type="text"
                required
                value={formData.login}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your username or email"
                autoComplete="username"
              />
              <p className="form-helper">You can use either your username or email address</p>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password<span className="required-asterisk">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="submit-button"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
