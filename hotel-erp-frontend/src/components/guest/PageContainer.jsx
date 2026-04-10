/**
 * PageContainer
 * Wrapper chuẩn cho toàn bộ nội dung trang guest.
 *
 * Props:
 *   children     — nội dung
 *   size         — 'sm' | 'md' | 'lg' (default) | 'xl' | 'full'
 *   padding      — có padding ngang (default: true)
 *   className    — thêm class tùy ý
 *   style        — inline style bổ sung
 *   as           — HTML tag (default: 'div')
 *
 * Usage:
 *   <PageContainer size="lg">...</PageContainer>
 *   <PageContainer as="section" size="xl" style={{ paddingTop: 80 }}>...</PageContainer>
 */

const SIZE_MAP = {
  sm:   'var(--g-container-sm)',
  md:   'var(--g-container-md)',
  lg:   'var(--g-container-xl)',   // default
  xl:   'var(--g-container-2xl)',
  full: 'none',
};

export default function PageContainer({
  children,
  size = 'lg',
  padding = true,
  className = '',
  style = {},
  as: Tag = 'div',
}) {
  return (
    <Tag
      className={className}
      style={{
        maxWidth: SIZE_MAP[size] ?? SIZE_MAP.lg,
        margin: '0 auto',
        paddingLeft:  padding ? 'var(--g-container-pad)' : 0,
        paddingRight: padding ? 'var(--g-container-pad)' : 0,
        width: '100%',
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
