import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import FullscreenLoader from '../components/guest/FullscreenLoader';
import GuestHeader from '../components/guest/GuestHeader';
import GuestFooter from '../components/guest/GuestFooter';
import '../styles/guest.css';

/**
 * GuestLayout
 * Layout chinh cho toan bo Guest/Public Portal.
 */

function PageFallback() {
  return <FullscreenLoader />;
}

export default function GuestLayout() {
  return (
    <div className="guest-portal">
      <GuestHeader />

      <main style={{ minHeight: '100vh', paddingTop: 'var(--g-header-h)' }}>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <GuestFooter />
    </div>
  );
}
