'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/ui/Logo';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Dashboard has its own full header — skip the topbar there
const PAGES_WITH_OWN_HEADER = ['/dashboard'];

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const showTopBar = !PAGES_WITH_OWN_HEADER.includes(pathname);

  return (
    <>
      {showTopBar && (
        <header style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-medium)',
          padding: '0.6rem 2rem',
          display: 'flex',
          alignItems: 'center',
        }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Logo variant="text" size="sm" />
          </Link>
        </header>
      )}
      {children}
    </>
  );
}