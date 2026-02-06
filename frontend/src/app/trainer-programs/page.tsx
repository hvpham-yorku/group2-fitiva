'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Redirect legacy URL to single Programs page. */
export default function TrainerProgramsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/programs');
  }, [router]);
  return null;
}
