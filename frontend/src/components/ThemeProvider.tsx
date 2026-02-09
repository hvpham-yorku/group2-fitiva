'use client';

import { useEffect } from 'react';

export default function ThemeProvider() {
  useEffect(() => {
    // Apply saved theme on initial load for light/dark theme selections
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return null;
}
