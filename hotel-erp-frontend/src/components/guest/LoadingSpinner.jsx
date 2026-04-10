/**
 * LoadingSpinner — chuyển từ loading.html sang JSX
 *
 * Variants:
 *   'spinner'   — vòng xoay đơn giản
 *   'dots'      — 3 chấm nhảy
 *   'skeleton'  — skeleton card placeholder
 *   'page'      — toàn trang (default khi fullPage=true)
 *
 * Props:
 *   variant     — 'spinner' | 'dots' | 'skeleton'
 *   fullPage    — chiếm toàn màn hình
 *   text        — text hiển thị phía dưới spinner
 *   skeletonCount — số skeleton card (chỉ dùng với variant='skeleton')
 *   size        — 'sm' | 'md' (default) | 'lg'
 *
 * Usage:
 *   <LoadingSpinner />                        // spinner mặc định
 *   <LoadingSpinner fullPage />               // full page loading
 *   <LoadingSpinner variant="dots" />
 *   <LoadingSpinner variant="skeleton" skeletonCount={3} />
 */

const SIZES = { sm: 28, md: 44, lg: 64 };
const BORDER = { sm: 3,  md: 4,  lg: 5 };

function Spinner({ size = 'md', color = 'var(--g-primary)' }) {
  const px = SIZES[size] ?? SIZES.md;
  const bw = BORDER[size] ?? BORDER.md;
  return (
    <>
      <style>{`
        @keyframes __g-spin { to { transform: rotate(360deg); } }
        .g-spinner-ring {
          border-radius: 50%;
          border-style: solid;
          border-color: var(--g-border, #e8e2d9);
          animation: __g-spin 0.75s linear infinite;
        }
      `}</style>
      <div
        className="g-spinner-ring"
        style={{
          width: px,
          height: px,
          borderWidth: bw,
          borderTopColor: color,
        }}
      />
    </>
  );
}

function Dots() {
  return (
    <>
      <style>{`
        @keyframes __g-dot-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1; }
        }
        .g-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          background: var(--g-primary, #1a3826);
          animation: __g-dot-bounce 1.2s ease-in-out infinite;
          display: inline-block;
        }
        .g-dot:nth-child(1) { animation-delay: 0s; }
        .g-dot:nth-child(2) { animation-delay: 0.2s; }
        .g-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="g-dot" />
        <div className="g-dot" />
        <div className="g-dot" />
      </div>
    </>
  );
}

function SkeletonCard() {
  return (
    <>
      <style>{`
        @keyframes __g-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .g-sk {
          background: linear-gradient(90deg, #f0ece3 25%, #e4ddd4 50%, #f0ece3 75%);
          background-size: 200% auto;
          animation: __g-shimmer 1.4s linear infinite;
          border-radius: 8px;
        }
      `}</style>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        border: '1px solid var(--g-border, #e8e2d9)',
        overflow: 'hidden',
        boxShadow: 'var(--g-shadow-sm)',
      }}>
        <div className="g-sk" style={{ height: 200 }} />
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="g-sk" style={{ height: 12, width: '40%' }} />
          <div className="g-sk" style={{ height: 22, width: '80%' }} />
          <div className="g-sk" style={{ height: 14, width: '95%' }} />
          <div className="g-sk" style={{ height: 14, width: '70%' }} />
        </div>
      </div>
    </>
  );
}

export default function LoadingSpinner({
  variant = 'spinner',
  fullPage = false,
  text = 'Đang tải...',
  skeletonCount = 3,
  size = 'md',
}) {
  /* ---- skeleton grid ---- */
  if (variant === 'skeleton') {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 20,
        padding: '8px 0',
      }}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  /* ---- inner content ---- */
  const inner = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      fontFamily: 'var(--g-font-body)',
    }}>
      {variant === 'dots' ? <Dots /> : <Spinner size={size} />}
      {text && (
        <p style={{
          fontSize: 'var(--g-text-sm)',
          color: 'var(--g-text-muted)',
          margin: 0,
          letterSpacing: '0.02em',
        }}>
          {text}
        </p>
      )}
    </div>
  );

  /* ---- full page overlay ---- */
  if (fullPage) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(251,249,244,0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 'var(--g-z-modal, 400)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {inner}
      </div>
    );
  }

  /* ---- inline block ---- */
  return (
    <div style={{
      minHeight: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--g-space-12) var(--g-space-6)',
    }}>
      {inner}
    </div>
  );
}
