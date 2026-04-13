/**
 * EmptyState
 * Hiển thị khi không có dữ liệu.
 *
 * Props:
 *   icon      — emoji hoặc SVG/ReactNode
 *   title     — tiêu đề (default: 'Chưa có dữ liệu')
 *   message   — mô tả thêm
 *   action    — ReactNode (ví dụ: nút CTA)
 *   compact   — kích thước nhỏ hơn
 *
 * Usage:
 *   <EmptyState
 *     icon="📭"
 *     title="Chưa có bài viết"
 *     message="Hãy quay lại sau nhé!"
 *     action={<Link className="g-btn-primary" to="/">Về trang chủ</Link>}
 *   />
 */
export default function EmptyState({
  icon = '🌿',
  title = 'Chưa có dữ liệu',
  message,
  action,
  compact = false,
  align = 'center',
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
      justifyContent: 'center',
      textAlign: align,
      padding: compact
        ? `var(--g-space-10) ${align === 'center' ? 'var(--g-space-6)' : 0}`
        : `var(--g-space-20) ${align === 'center' ? 'var(--g-space-6)' : 0}`,
      fontFamily: 'var(--g-font-body)',
    }}>
      {/* Icon */}
      <div style={{
        fontSize: compact ? '2.5rem' : '3.5rem',
        lineHeight: 1,
        marginBottom: 'var(--g-space-5)',
        filter: 'grayscale(0.15)',
      }}>
        {icon}
      </div>

      {/* Title */}
      <h3 style={{
        fontFamily: 'var(--g-font-heading)',
        fontSize:   compact ? 'var(--g-text-xl)' : 'var(--g-text-2xl)',
        fontWeight: 700,
        color:      'var(--g-text)',
        margin:     0,
        lineHeight: 'var(--g-leading-snug)',
        letterSpacing: 'var(--g-tracking-tight)',
      }}>
        {title}
      </h3>

      {/* Message */}
      {message && (
        <p style={{
          marginTop:  'var(--g-space-3)',
          marginBottom: 0,
          color:      'var(--g-text-muted)',
          fontSize:   'var(--g-text-base)',
          lineHeight: 'var(--g-leading-relaxed)',
          maxWidth:   480,
        }}>
          {message}
        </p>
      )}

      {/* Action */}
      {action && (
        <div style={{ marginTop: 'var(--g-space-6)' }}>
          {action}
        </div>
      )}
    </div>
  );
}
