import { Link } from 'react-router-dom';

const FOOTER_LINKS = {
  'Khám phá': [
    { label: 'Trang chủ',     to: '/' },
    { label: 'Địa điểm',      to: '/attractions' },
    { label: 'Bài viết',      to: '/articles' },
    { label: 'Đánh giá',      to: '/reviews' },
  ],
  'Dịch vụ': [
    { label: 'Đặt phòng',     to: '/booking' },
    { label: 'Hạng phòng',    to: '/rooms' },
    { label: 'Ưu đãi',        to: '/offers' },
    { label: 'Thành viên',    to: '/membership' },
  ],
  'Thông tin': [
    { label: 'Về chúng tôi',  to: '/about' },
    { label: 'Liên hệ',       to: '/contact' },
    { label: 'Chính sách',    to: '/policy' },
    { label: 'FAQ',           to: '/faq' },
  ],
};

const SOCIAL = [
  { label: 'Facebook',  icon: 'f',   href: '#' },
  { label: 'Instagram', icon: '▣',   href: '#' },
  { label: 'YouTube',   icon: '▶',   href: '#' },
];

export default function GuestFooter() {
  return (
    <footer style={{
      background: 'var(--g-bg-card)',
      color: 'var(--g-text-secondary)',
      fontFamily: 'var(--g-font-body)',
      borderTop: '1px solid var(--g-border)',
    }}>
      <style>{`
        .gf-inner {
          max-width: var(--g-container-xl);
          margin: 0 auto;
          padding: 0 var(--g-container-pad);
        }
        .gf-top {
          display: grid;
          grid-template-columns: 1.6fr 1fr 1fr 1fr;
          gap: 48px;
          padding: 64px 0 48px;
          border-bottom: 1px solid var(--g-border-light);
        }
        .gf-brand-name {
          font-family: var(--g-font-heading);
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--g-text);
          letter-spacing: 0.06em;
          line-height: 1;
        }
        .gf-brand-tagline {
          margin-top: 12px;
          font-size: 0.875rem;
          line-height: 1.7;
          color: var(--g-text-muted);
          max-width: 260px;
        }
        .gf-contact {
          margin-top: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .gf-contact-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.8125rem;
          color: var(--g-text-secondary);
        }
        .gf-contact-icon {
          width: 18px;
          flex-shrink: 0;
          color: var(--g-primary);
          font-size: 0.9rem;
          margin-top: 1px;
        }
        .gf-col-title {
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--g-text-faint);
          margin-bottom: 20px;
        }
        .gf-col-links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .gf-col-links a {
          font-size: 0.875rem;
          color: var(--g-text-secondary);
          text-decoration: none;
          transition: color 0.2s;
        }
        .gf-col-links a:hover { color: var(--g-primary); }

        .gf-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 0;
          gap: 16px;
          flex-wrap: wrap;
        }
        .gf-copy {
          font-size: 0.8125rem;
          color: var(--g-text-faint);
        }
        .gf-socials {
          display: flex;
          gap: 10px;
        }
        .gf-social-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid var(--g-border);
          background: var(--g-surface-raised);
          color: var(--g-text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          text-decoration: none;
          transition: all 0.2s;
        }
        .gf-social-btn:hover {
          background: var(--g-primary-muted);
          color: var(--g-primary);
          border-color: var(--g-border-strong);
        }
        .gf-gold-line {
          height: 2px;
          background: linear-gradient(90deg, var(--g-primary), transparent);
        }

        @media (max-width: 1023px) {
          .gf-top {
            grid-template-columns: 1fr 1fr;
            gap: 36px 24px;
          }
        }
        @media (max-width: 639px) {
          .gf-top {
            grid-template-columns: 1fr;
            padding: 40px 0 32px;
          }
          .gf-bottom {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      {/* Gold accent line */}
      <div className="gf-gold-line" />

      <div className="gf-inner">
        <div className="gf-top">
          {/* Brand column */}
          <div>
            <div className="gf-brand-name">The Ethereal</div>
            <p className="gf-brand-tagline">
              Trải nghiệm đẳng cấp giữa lòng thiên nhiên. Nơi mỗi khoảnh khắc đều trở thành ký ức khó quên.
            </p>
            <div className="gf-contact">
              <div className="gf-contact-item">
                <span className="gf-contact-icon">📍</span>
                <span>123 Đường Nguyễn Huệ, Quận 1, TP.HCM</span>
              </div>
              <div className="gf-contact-item">
                <span className="gf-contact-icon">📞</span>
                <span>+84 28 3822 8888</span>
              </div>
              <div className="gf-contact-item">
                <span className="gf-contact-icon">✉️</span>
                <span>hello@theethereal.vn</span>
              </div>
            </div>
          </div>

          {/* Nav columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <div className="gf-col-title">{title}</div>
              <ul className="gf-col-links">
                {links.map(({ label, to }) => (
                  <li key={to}>
                    <Link to={to}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="gf-bottom">
          <p className="gf-copy">
            © {new Date().getFullYear()} The Ethereal Hotel. Bảo lưu mọi quyền.
          </p>
          <div className="gf-socials">
            {SOCIAL.map(({ label, icon, href }) => (
              <a
                key={label}
                href={href}
                className="gf-social-btn"
                aria-label={label}
                target="_blank"
                rel="noopener noreferrer"
              >
                {icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
