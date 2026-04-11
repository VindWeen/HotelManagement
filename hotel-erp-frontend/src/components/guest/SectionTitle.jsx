/**
 * SectionTitle
 * Tiêu đề section chuẩn với optional eyebrow label và subtitle.
 *
 * Props:
 *   eyebrow   — nhãn nhỏ phía trên (string | ReactNode)
 *   title     — tiêu đề chính (string | ReactNode) — REQUIRED
 *   subtitle  — mô tả phía dưới (string | ReactNode)
 *   align     — 'left' | 'center' (default: 'center')
 *   titleSize — 'sm' | 'md' | 'lg' (default: 'md')
 *   className — thêm class
 *   style     — inline style
 *
 * Usage:
 *   <SectionTitle
 *     eyebrow="Điểm nổi bật"
 *     title="Hạng phòng cao cấp"
 *     subtitle="Mỗi phòng là một không gian riêng biệt..."
 *   />
 */

const TITLE_SIZE = {
  sm: 'clamp(1.25rem, 3vw, 1.75rem)',
  md: 'clamp(1.75rem, 4vw, 2.5rem)',
  lg: 'clamp(2rem, 5vw, 3.5rem)',
};

export default function SectionTitle({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  titleSize = 'md',
  className = '',
  style = {},
}) {
  return (
    <div
      className={className}
      style={{
        textAlign: align,
        maxWidth: align === 'center' ? 680 : 'none',
        margin: align === 'center' ? '0 auto' : 0,
        ...style,
      }}
    >
      {eyebrow && (
        <div style={{
          fontFamily: 'var(--g-font-body)',
          fontSize: 'var(--g-text-xs)',
          fontWeight: 700,
          letterSpacing: 'var(--g-tracking-widest)',
          textTransform: 'uppercase',
          color: 'var(--g-gold)',
          marginBottom: 'var(--g-space-3)',
        }}>
          {eyebrow}
        </div>
      )}

      <h2 style={{
        fontFamily: 'var(--g-font-heading)',
        fontSize: TITLE_SIZE[titleSize] ?? TITLE_SIZE.md,
        fontWeight: 700,
        lineHeight: 'var(--g-leading-tight)',
        letterSpacing: 'var(--g-tracking-tight)',
        color: 'var(--g-text)',
        margin: 0,
      }}>
        {title}
      </h2>

      {subtitle && (
        <p style={{
          fontFamily: 'var(--g-font-body)',
          fontSize: 'var(--g-text-lg)',
          lineHeight: 'var(--g-leading-relaxed)',
          color: 'var(--g-text-secondary)',
          marginTop: 'var(--g-space-4)',
          marginBottom: 0,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
