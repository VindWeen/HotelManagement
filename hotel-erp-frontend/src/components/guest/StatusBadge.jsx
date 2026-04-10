/**
 * StatusBadge
 * Badge trạng thái có màu, kích thước và biến thể.
 *
 * Props:
 *   children  — text nội dung
 *   variant   — 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary' | 'gold'
 *   size      — 'sm' | 'md' (default) | 'lg'
 *   dot       — hiện dấu chấm màu trước text
 *   pill      — bo tròn hoàn toàn (default: true)
 *   style     — override style
 *
 * Usage:
 *   <StatusBadge variant="success">Đã xác nhận</StatusBadge>
 *   <StatusBadge variant="warning" dot>Chờ xử lý</StatusBadge>
 *   <StatusBadge variant="error" size="lg">Đã hủy</StatusBadge>
 */

const VARIANTS = {
  success: {
    bg:     'var(--g-success-bg)',
    border: 'var(--g-success-border)',
    text:   'var(--g-success)',
    dot:    'var(--g-success)',
  },
  warning: {
    bg:     'var(--g-warning-bg)',
    border: 'var(--g-warning-border)',
    text:   'var(--g-warning)',
    dot:    'var(--g-warning)',
  },
  error: {
    bg:     'var(--g-error-bg)',
    border: 'var(--g-error-border)',
    text:   'var(--g-error)',
    dot:    'var(--g-error)',
  },
  info: {
    bg:     'var(--g-info-bg)',
    border: 'var(--g-info-border)',
    text:   'var(--g-info)',
    dot:    'var(--g-info)',
  },
  neutral: {
    bg:     'var(--g-neutral-bg)',
    border: 'var(--g-neutral-border)',
    text:   'var(--g-neutral)',
    dot:    'var(--g-neutral)',
  },
  primary: {
    bg:     'var(--g-primary-muted)',
    border: 'rgba(26,56,38,0.15)',
    text:   'var(--g-primary)',
    dot:    'var(--g-primary)',
  },
  gold: {
    bg:     'var(--g-gold-muted)',
    border: 'rgba(184,150,46,0.25)',
    text:   'var(--g-gold)',
    dot:    'var(--g-gold)',
  },
};

const SIZE_STYLES = {
  sm: { fontSize: '0.6875rem', padding: '2px 8px',  gap: 5 },
  md: { fontSize: '0.75rem',   padding: '4px 10px', gap: 6 },
  lg: { fontSize: '0.875rem',  padding: '6px 14px', gap: 7 },
};

export default function StatusBadge({
  children,
  variant = 'neutral',
  size    = 'md',
  dot     = false,
  pill    = true,
  style   = {},
}) {
  const v = VARIANTS[variant] ?? VARIANTS.neutral;
  const s = SIZE_STYLES[size] ?? SIZE_STYLES.md;

  return (
    <span style={{
      display:       'inline-flex',
      alignItems:    'center',
      gap:           s.gap,
      fontSize:      s.fontSize,
      fontWeight:    600,
      fontFamily:    'var(--g-font-body)',
      letterSpacing: '0.03em',
      padding:       s.padding,
      borderRadius:  pill ? 'var(--g-radius-full)' : 'var(--g-radius-sm)',
      background:    v.bg,
      border:        `1px solid ${v.border}`,
      color:         v.text,
      whiteSpace:    'nowrap',
      lineHeight:    1.4,
      ...style,
    }}>
      {dot && (
        <span style={{
          display:      'inline-block',
          width:        size === 'lg' ? 7 : 6,
          height:       size === 'lg' ? 7 : 6,
          borderRadius: '50%',
          background:   v.dot,
          flexShrink:   0,
        }} />
      )}
      {children}
    </span>
  );
}
