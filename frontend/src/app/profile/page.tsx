'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileRedirectPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(`/profile/${user.id}`);
    }
  }, [user, isLoading, router]);

  return (
    <div className="profile-loading">
      <div className="profile-spinner"></div>
    </div>
  );
}
