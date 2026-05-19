export function GuestDashboardIllustration({ style, className }) {
  return (
    <svg
      viewBox="0 0 480 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      className={className}
    >
      <rect width="480" height="320" rx="24" fill="var(--g-card-bg)" />
      
      {/* Background blobs/shapes */}
      <circle cx="380" cy="80" r="120" fill="var(--g-primary)" opacity="0.05" />
      <circle cx="80" cy="240" r="160" fill="var(--g-info)" opacity="0.05" />
      <rect x="240" y="160" width="200" height="120" rx="60" fill="var(--g-success)" opacity="0.05" />

      {/* Abstract building / hotel shapes */}
      <rect x="180" y="120" width="120" height="160" rx="12" fill="var(--g-bg-secondary)" stroke="var(--g-border)" strokeWidth="2" />
      
      {/* Windows */}
      <rect x="200" y="140" width="24" height="24" rx="4" fill="var(--g-primary)" opacity="0.8" />
      <rect x="244" y="140" width="24" height="24" rx="4" fill="var(--g-bg-hover)" />
      <rect x="200" y="180" width="24" height="24" rx="4" fill="var(--g-bg-hover)" />
      <rect x="244" y="180" width="24" height="24" rx="4" fill="var(--g-info)" opacity="0.8" />
      <rect x="200" y="220" width="24" height="24" rx="4" fill="var(--g-bg-hover)" />
      <rect x="244" y="220" width="24" height="24" rx="4" fill="var(--g-bg-hover)" />
      
      {/* Decorative lines/elements */}
      <path d="M140 280 L340 280" stroke="var(--g-border)" strokeWidth="4" strokeLinecap="round" />
      <path d="M120 180 Q150 150 180 180" stroke="var(--g-primary)" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M300 200 Q330 230 360 200" stroke="var(--g-success)" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
      
      {/* Sun / Moon */}
      <circle cx="120" cy="100" r="24" fill="var(--g-warning)" opacity="0.2" />
      <circle cx="120" cy="100" r="16" fill="var(--g-warning)" opacity="0.8" />
      
      {/* Mini floating cards to represent bookings/data */}
      <rect x="320" y="100" width="80" height="40" rx="8" fill="var(--g-card-bg)" stroke="var(--g-border)" strokeWidth="1" />
      <rect x="330" y="112" width="40" height="6" rx="3" fill="var(--g-text-secondary)" opacity="0.5" />
      <rect x="330" y="124" width="60" height="4" rx="2" fill="var(--g-text-muted)" opacity="0.3" />

      <rect x="80" y="160" width="60" height="60" rx="12" fill="var(--g-card-bg)" stroke="var(--g-border)" strokeWidth="1" />
      <circle cx="110" cy="190" r="12" fill="var(--g-success)" opacity="0.2" />
      <path d="M105 190 L108 193 L115 186" stroke="var(--g-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
