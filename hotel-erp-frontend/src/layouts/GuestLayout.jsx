import { Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import FullscreenLoader from '../components/guest/FullscreenLoader';
import GuestHeader from '../components/guest/GuestHeader';
import GuestFooter from '../components/guest/GuestFooter';
import '../styles/guest.css';

const GUEST_THEME_STORAGE_KEY = 'guest-theme-mode';

/**
 * GuestLayout
 * Layout chinh cho toan bo Guest/Public Portal.
 */

function PageFallback() {
  return <FullscreenLoader />;
}

export default function GuestLayout() {
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem(GUEST_THEME_STORAGE_KEY) || 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(GUEST_THEME_STORAGE_KEY, themeMode);
    document.documentElement.style.colorScheme = themeMode;
    document.body.style.background = themeMode === 'dark' ? '#111411' : '#f8f9fa';
  }, [themeMode]);

  return (
    <div className="guest-portal" data-theme={themeMode}>
      <GuestHeader
        themeMode={themeMode}
        onToggleTheme={() =>
          setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'))
        }
      />

      <main style={{ minHeight: '100vh', paddingTop: 'var(--g-header-h)' }}>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <GuestFooter />
    </div>
  );
}
