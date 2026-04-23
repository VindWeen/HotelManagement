import React, { useEffect, useState } from 'react';

const MESSAGES = [
  'Arriving at your sanctuary...',
  'Preparing your bespoke experience...',
  'Setting the scene for your stay...',
  'Aligning your personal preferences...',
  'Curating your digital concierge...',
];

export default function FullscreenLoader() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--g-bg)',
        color: 'var(--g-text)',
        fontFamily: 'var(--g-font-body)',
      }}
    >
      <style>{`
        @keyframes g-loader-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes g-loader-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.96); opacity: 0.84; }
        }
        @keyframes g-loader-shimmer {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }
      `}</style>

      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          padding: '24px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '34rem',
            height: '34rem',
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--g-primary-muted), transparent 68%)',
            top: '-8rem',
            right: '-8rem',
            filter: 'blur(18px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '28rem',
            height: '28rem',
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--g-info-bg), transparent 70%)',
            bottom: '-8rem',
            left: '-8rem',
            filter: 'blur(24px)',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 2,
            width: 'min(100%, 640px)',
            padding: '56px 28px',
            borderRadius: '32px',
            border: '1px solid var(--g-border)',
            background: 'linear-gradient(180deg, var(--g-bg-card), var(--g-surface-raised))',
            boxShadow: 'var(--g-shadow-xl)',
            textAlign: 'center',
          }}
        >
          <div style={{ position: 'relative', width: 144, height: 144, margin: '0 auto 28px' }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '1px solid var(--g-border-strong)',
                animation: 'g-loader-spin 10s linear infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 14,
                borderRadius: '50%',
                border: '1px solid var(--g-border)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 28,
                borderRadius: '50%',
                background: 'var(--g-primary-subtle)',
                border: '1px solid var(--g-primary-muted)',
                display: 'grid',
                placeItems: 'center',
                animation: 'g-loader-pulse 2.4s ease-in-out infinite',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 46, color: 'var(--g-primary)' }}>
                spa
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <h1
              style={{
                margin: 0,
                fontSize: '1.8rem',
                fontWeight: 700,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                fontFamily: 'var(--g-font-heading)',
              }}
            >
              The Ethereal
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'var(--g-text-muted)',
              }}
            >
              Guest Portal
            </p>
            <p style={{ margin: '10px 0 0', fontSize: '1.05rem', color: 'var(--g-primary)', fontStyle: 'italic' }}>
              {MESSAGES[messageIndex]}
            </p>
          </div>

          <div
            style={{
              margin: '28px auto 0',
              width: 'min(100%, 320px)',
              height: 4,
              borderRadius: 9999,
              background: 'var(--g-border-light)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: '45%',
                background: 'linear-gradient(90deg, transparent, var(--g-primary), transparent)',
                animation: 'g-loader-shimmer 1.4s linear infinite',
              }}
            />
          </div>

          <p
            style={{
              margin: '20px 0 0',
              fontSize: '0.78rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--g-text-faint)',
            }}
          >
            Digital concierge at your service
          </p>
        </div>
      </main>
    </div>
  );
}
