/**
 * ErrorState
 * Hiển thị khi có lỗi, có nút retry.
 *
 * Props:
 *   title    — tiêu đề lỗi (default: 'Đã xảy ra lỗi')
 *   message  — chi tiết lỗi (string | Error object)
 *   onRetry  — callback khi bấm "Thử lại"
 *   compact  — kích thước nhỏ
 *   icon     — override icon
 *
 * Usage:
 *   <ErrorState
 *     title="Không tải được dữ liệu"
 *     message={error?.message}
 *     onRetry={handleRetry}
 *   />
 */
export default function ErrorState({
  title   = 'Đã xảy ra lỗi',
  message,
  onRetry,
  compact = false,
  icon    = '⚠️',
}) {
  const errorText = message instanceof Error
    ? message.message
    : typeof message === 'string'
      ? message
      : 'Vui lòng thử lại sau.';

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      textAlign:      'center',
      padding: compact
        ? 'var(--g-space-8) var(--g-space-6)'
        : 'var(--g-space-20) var(--g-space-6)',
      fontFamily: 'var(--g-font-body)',
    }}>
      {/* Icon */}
      <div style={{
        fontSize: compact ? '2rem' : '3rem',
        lineHeight: 1,
        marginBottom: 'var(--g-space-4)',
      }}>
        {icon}
      </div>

      {/* Title */}
      <h3 style={{
        fontFamily:    'var(--g-font-heading)',
        fontSize:      compact ? 'var(--g-text-lg)' : 'var(--g-text-2xl)',
        fontWeight:    700,
        color:         'var(--g-text)',
        margin:        0,
        letterSpacing: 'var(--g-tracking-tight)',
      }}>
        {title}
      </h3>

      {/* Error message */}
      <p style={{
        marginTop:  'var(--g-space-3)',
        marginBottom: 0,
        color:      'var(--g-text-muted)',
        fontSize:   'var(--g-text-sm)',
        lineHeight: 'var(--g-leading-relaxed)',
        maxWidth:   440,
        background: 'var(--g-error-bg)',
        border:     '1px solid var(--g-error-border)',
        borderRadius: 'var(--g-radius-md)',
        padding:    'var(--g-space-3) var(--g-space-5)',
      }}>
        {errorText}
      </p>

      {/* Retry */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="g-btn-outline"
          style={{
            marginTop: 'var(--g-space-6)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: '1rem' }}>↻</span>
          Thử lại
        </button>
      )}
    </div>
  );
}
