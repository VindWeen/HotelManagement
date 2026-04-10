import { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuthStore } from '../../store/adminAuthStore';

const NAV_LINKS = [
  { to: '/',            label: 'Trang chủ',      exact: true },
  { to: '/attractions', label: 'Khám phá',        exact: false },
  { to: '/articles',    label: 'Bài viết',        exact: false },
  { to: '/reviews',     label: 'Đánh giá',        exact: false },
];

export default function GuestHeader() {
  const [scrolled,    setScrolled]    = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [visible,     setVisible]     = useState(true);
  const lastY = useRef(0);
  const location = useLocation();
  const navigate = useNavigate();
  const token = useAdminAuthStore((s) => s.token);
  const user = useAdminAuthStore((s) => s.user);
  const clearAuth = useAdminAuthStore((s) => s.clearAuth);

  const isStaff = token && user?.role && user.role !== 'Customer' && user.role !== 'Guest';

  const handleLogout = (e) => {
    e.preventDefault();
    clearAuth();
    setMenuOpen(false);
    navigate('/');
  };

  /* ---------- scroll hide/show + blur ---------- */
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      setVisible(y < lastY.current || y < 80);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ---------- close menu on route change ---------- */
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  /* ---------- lock body scroll when menu open ---------- */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const isHomePage = location.pathname === '/';

  return (
    <>
      <style>{`
        .gh-header {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: var(--g-header-h);
          z-index: var(--g-z-header, 200);
          transition: transform 0.3s var(--g-ease), background 0.3s var(--g-ease), box-shadow 0.3s var(--g-ease);
          font-family: var(--g-font-body);
        }
        .gh-header.scrolled {
          background: rgba(251, 249, 244, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 1px 0 var(--g-border), 0 4px 20px rgba(0,0,0,0.06);
        }
        .gh-header.at-top.hero-page {
          background: transparent;
        }
        .gh-header.at-top {
          background: rgba(251, 249, 244, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .gh-header.hidden { transform: translateY(-100%); }

        .gh-inner {
          max-width: var(--g-container-xl);
          margin: 0 auto;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--g-container-pad);
          gap: 24px;
        }

        /* Logo */
        .gh-logo { text-decoration: none; flex-shrink: 0; }
        .gh-logo-name {
          font-family: var(--g-font-heading);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--g-primary);
          letter-spacing: 0.05em;
          line-height: 1;
        }
        .gh-header.at-top.hero-page .gh-logo-name { color: #fff; }
        .gh-logo-sub {
          font-size: 0.6rem;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--g-text-muted);
          margin-top: 3px;
        }
        .gh-header.at-top.hero-page .gh-logo-sub { color: rgba(255,255,255,0.65); }

        /* Desktop nav */
        .gh-nav {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          justify-content: center;
        }
        .gh-nav-link {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--g-text-secondary);
          text-decoration: none;
          padding: 8px 14px;
          border-radius: var(--g-radius-full);
          transition: all 0.2s var(--g-ease);
          white-space: nowrap;
        }
        .gh-nav-link:hover {
          color: var(--g-primary);
          background: var(--g-primary-muted);
        }
        .gh-nav-link.active {
          color: var(--g-primary);
          background: var(--g-primary-muted);
          font-weight: 700;
        }
        .gh-header.at-top.hero-page .gh-nav-link {
          color: rgba(255,255,255,0.85);
        }
        .gh-header.at-top.hero-page .gh-nav-link:hover,
        .gh-header.at-top.hero-page .gh-nav-link.active {
          color: #fff;
          background: rgba(255,255,255,0.15);
        }

        /* Actions */
        .gh-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

        .gh-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 22px;
          background: var(--g-primary);
          color: #ffffff !important;
          font-size: 0.8125rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-decoration: none;
          border-radius: var(--g-radius-full);
          white-space: nowrap;
          transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
          border: none;
          cursor: pointer;
          font-family: var(--g-font-body);
        }
        .gh-cta:hover {
          background: var(--g-primary-hover);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(26,56,38,0.2);
        }

        /* Hamburger */
        .gh-hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          width: 40px;
          height: 40px;
          align-items: center;
          justify-content: center;
          background: none;
          border: 1.5px solid var(--g-border);
          border-radius: var(--g-radius-md);
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.2s;
        }
        .gh-hamburger:hover { background: var(--g-surface); }
        .gh-hamburger span {
          display: block;
          width: 20px;
          height: 1.5px;
          background: var(--g-text);
          border-radius: 2px;
          transition: all 0.25s;
        }
        .gh-header.at-top.hero-page .gh-hamburger { border-color: rgba(255,255,255,0.4); }
        .gh-header.at-top.hero-page .gh-hamburger span { background: #fff; }
        .gh-hamburger.open span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
        .gh-hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .gh-hamburger.open span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }

        /* Mobile drawer */
        .gh-drawer {
          position: fixed;
          inset: 0;
          z-index: calc(var(--g-z-header, 200) - 1);
          pointer-events: none;
        }
        .gh-drawer.open { pointer-events: all; }

        .gh-overlay {
          position: absolute;
          inset: 0;
          background: rgba(28, 25, 23, 0.6);
          backdrop-filter: blur(4px);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .gh-drawer.open .gh-overlay { opacity: 1; }

        .gh-panel {
          position: absolute;
          top: 0; right: 0;
          width: min(320px, 85vw);
          height: 100%;
          background: var(--g-bg-card);
          box-shadow: var(--g-shadow-2xl);
          display: flex;
          flex-direction: column;
          transform: translateX(100%);
          transition: transform 0.35s var(--g-ease-out, cubic-bezier(0, 0, 0.2, 1));
          padding: calc(var(--g-header-h) + 8px) 24px 32px;
          gap: 4px;
          overflow-y: auto;
        }
        .gh-drawer.open .gh-panel { transform: translateX(0); }

        .gh-panel-link {
          display: flex;
          align-items: center;
          padding: 14px 16px;
          font-size: 1rem;
          font-weight: 500;
          color: var(--g-text-secondary);
          text-decoration: none;
          border-radius: var(--g-radius-md);
          transition: all 0.2s;
          gap: 10px;
        }
        .gh-panel-link:hover,
        .gh-panel-link.active {
          background: var(--g-primary-muted);
          color: var(--g-primary);
          font-weight: 700;
        }
        .gh-panel-divider {
          height: 1px;
          background: var(--g-border);
          margin: 12px 0;
        }
        .gh-panel-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px;
          background: var(--g-gold);
          color: #ffffff !important;
          font-weight: 700;
          font-size: 0.9375rem;
          border-radius: var(--g-radius-full);
          text-decoration: none;
          margin-top: 8px;
          transition: background 0.2s;
        }
        .gh-panel-cta:hover { background: var(--g-gold-hover, #a07e25); }

        @media (max-width: 1023px) {
          .gh-nav { display: none; }
          .gh-hamburger { display: flex; }
        }
        @media (max-width: 639px) {
          .gh-cta { display: none; }
        }
      `}</style>

      {/* Header */}
      <header
        className={[
          'gh-header',
          scrolled ? 'scrolled' : 'at-top',
          isHomePage && !scrolled ? 'hero-page' : '',
          !visible ? 'hidden' : '',
        ].join(' ')}
      >
        <div className="gh-inner">
          {/* Logo */}
          <Link to="/" className="gh-logo">
            <div className="gh-logo-name">The Ethereal</div>
            <div className="gh-logo-sub">Luxury Hotel</div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="gh-nav">
            {NAV_LINKS.map(({ to, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `gh-nav-link${isActive ? ' active' : ''}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="gh-actions">
            {isStaff && (
              <Link
                to="/admin"
                className="gh-nav-link"
                style={{ 
                  fontWeight: 700, 
                  background: 'white', 
                  color: 'var(--g-primary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: 38,
                  height: 38,
                  padding: 0,
                  borderRadius: '50%',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                title="Vào Trang Quản Trị"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>dashboard</span>
              </Link>
            )}
            {token ? (
              <button
                onClick={handleLogout}
                className="gh-nav-link"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Đăng xuất
              </button>
            ) : (
              <Link
                to="/login"
                className="gh-nav-link"
              >
                Đăng nhập
              </Link>
            )}
            <Link to="/booking" className="gh-cta">
              Đặt phòng
            </Link>
            <button
              className={`gh-hamburger${menuOpen ? ' open' : ''}`}
              onClick={() => setMenuOpen(v => !v)}
              aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={menuOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div className={`gh-drawer${menuOpen ? ' open' : ''}`} aria-hidden={!menuOpen}>
        <button
          className="gh-overlay"
          onClick={() => setMenuOpen(false)}
          tabIndex={menuOpen ? 0 : -1}
          aria-label="Đóng menu"
          style={{ border: 'none', cursor: 'pointer' }}
        />
        <nav className="gh-panel">
          {NAV_LINKS.map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `gh-panel-link${isActive ? ' active' : ''}`
              }
              tabIndex={menuOpen ? 0 : -1}
            >
              {label}
            </NavLink>
          ))}
          <div className="gh-panel-divider" />
          {isStaff && (
            <Link
              to="/admin"
              className="gh-panel-link"
              tabIndex={menuOpen ? 0 : -1}
              style={{ color: 'var(--g-primary)', fontWeight: 700 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>dashboard</span>
              Trang Quản Trị
            </Link>
          )}
          {token ? (
            <button
              onClick={handleLogout}
              className="gh-panel-link"
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit', color: '#b91c1c', cursor: 'pointer' }}
              tabIndex={menuOpen ? 0 : -1}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
              Đăng xuất
            </button>
          ) : (
            <Link
              to="/login"
              className="gh-panel-link"
              tabIndex={menuOpen ? 0 : -1}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>login</span>
              Đăng nhập
            </Link>
          )}
          <Link to="/booking" className="gh-panel-cta" tabIndex={menuOpen ? 0 : -1}>
            🗓 Đặt phòng ngay
          </Link>
        </nav>
      </div>
    </>
  );
}
