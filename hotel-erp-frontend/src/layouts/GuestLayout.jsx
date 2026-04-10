import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import GuestHeader from '../components/guest/GuestHeader';
import GuestFooter from '../components/guest/GuestFooter';
import LoadingSpinner from '../components/guest/LoadingSpinner';
import '../styles/guest.css';

/**
 * GuestLayout
 * Layout chính cho toàn bộ Guest/Public Portal.
 *
 * Cấu trúc:
 *   <div class="guest-portal">
 *     <GuestHeader />          — sticky, glassmorphism
 *     <main>                   — nội dung trang (via Outlet)
 *       <Outlet />
 *     </main>
 *     <GuestFooter />
 *   </div>
 *
 * Dùng trong GuestRoutes:
 *   <Route element={<GuestLayout />}>
 *     <Route path="/" element={<HomePage />} />
 *     ...
 *   </Route>
 */

import FullscreenLoader from '../components/guest/FullscreenLoader';

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
