'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import { ApiError } from '@/lib/api';
import './login.css';

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
      <div className="login-box">
        <div className="login-header">
          <h2 className="login-title">Sign in to your account</h2>
          <p className="login-subtitle">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="login-link">
              Sign up
            </Link>
          </p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        <form className="login-form" onSubmit={handleSubmit}>
          <Input
            id="login"
            name="login"
            type="text"
            label="Username or Email"
            required
            value={formData.login}
            onChange={handleChange}
            placeholder="Enter your username or email"
            autoComplete="username"
            helperText="You can use either your username or email address"
          />

          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            required
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            autoComplete="current-password"
          />

          <Button type="submit" disabled={isLoading} fullWidth>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
