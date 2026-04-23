import { Link } from 'react-router-dom';
import { PageContainer, SectionTitle } from '../../components/guest';

export default function HomePage() {
  return (
    <>
      <style>{`
        .hero {
          position: relative;
          height: 100vh;
          min-height: 600px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #111;
          overflow: hidden;
          margin-top: calc(-1 * var(--g-header-h));
        }
        .hero-bg {
          position: absolute;
          inset: 0;
          background: url('https://res.cloudinary.com/dekvhccnn/image/upload/v1775746982/background_fuvlae.png') center/cover no-repeat;
          opacity: 0.6;
          transform: scale(1.05);
          animation: hero-zoom 20s ease-out forwards;
        }
        @keyframes hero-zoom {
          to { transform: scale(1); }
        }
        .hero-content {
          position: relative;
          z-index: 10;
          text-align: center;
          color: var(--g-text-inverse);
          padding: 0 24px;
        }
        .hero-eyebrow {
          font-size: 0.875rem;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          margin-bottom: 24px;
          opacity: 0.85;
          animation: g-fadeInUp 0.8s ease-out;
        }
        .hero-title {
          font-family: var(--g-font-heading);
          font-size: clamp(3rem, 8vw, 5.5rem);
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: var(--g-tracking-tight);
          margin-bottom: 24px;
          animation: g-fadeInUp 1s ease-out 0.2s both;
        }
        .hero-subtitle {
          font-size: clamp(1rem, 2vw, 1.25rem);
          max-width: 600px;
          margin: 0 auto 40px;
          opacity: 0.9;
          line-height: 1.6;
          animation: g-fadeInUp 1s ease-out 0.4s both;
        }
        .hero-actions {
          animation: g-fadeInUp 1s ease-out 0.6s both;
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }
      `}</style>

      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-content">
          <div className="hero-eyebrow">Trải nghiệm nghỉ dưỡng tuyệt đỉnh</div>
          <h1 className="hero-title">The Ethereal</h1>
          <p className="hero-subtitle">
            Nơi thời gian dừng lại, không gian mở ra. Tận hưởng kỳ nghỉ dưỡng sang trọng giữa không gian thiên nhiên hùng vĩ.
          </p>
          <div className="hero-actions">
            <Link
              to="/booking"
              className="g-btn-lg"
              style={{
                background: 'var(--g-bg-card)',
                color: 'var(--g-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '9999px',
                fontWeight: 700,
                boxShadow: 'var(--g-shadow-md)',
              }}
            >
              Đặt phòng ngay
            </Link>
            <Link
              to="/attractions"
              className="g-btn-lg"
              style={{
                background: 'var(--g-hero-panel)',
                color: 'var(--g-text-inverse)',
                backdropFilter: 'blur(8px)',
                borderColor: 'var(--g-hero-border)',
                border: '1px solid',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '9999px',
                fontWeight: 600,
              }}
            >
              Khám phá
            </Link>
          </div>
        </div>
      </section>

      <PageContainer as="section" className="g-section-lg">
        <SectionTitle
          eyebrow="Phòng & Suite"
          title="Không Gian Đẳng Cấp"
          subtitle="Mỗi căn phòng là một tác phẩm nghệ thuật, mang đến sự tiện nghi và riêng tư tuyệt đối."
          className="g-animate-up"
        />
        <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="g-skeleton" style={{ height: 400, borderRadius: 'var(--g-radius-lg)' }} />
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link to="/rooms" className="g-btn-outline">Xem tất cả hạng phòng</Link>
        </div>
      </PageContainer>

      <section style={{ background: 'var(--g-surface-raised)', padding: 'var(--g-space-32) 0' }}>
        <PageContainer>
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            <div className="w-full lg:flex-1">
              <SectionTitle
                align="left"
                eyebrow="Dịch Vụ Nổi Bật"
                title="Tận Hưởng Từng Khoảnh Khắc"
                subtitle="Tại The Ethereal, chúng tôi mang đến những dịch vụ đạt chuẩn 5 sao, từ ẩm thực tinh tế đến spa chăm sóc sức khỏe toàn diện."
              />
              <ul style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16, listStyle: 'none', padding: 0 }}>
                {['Mộc Spa & Wellness', 'Nhà hàng Ẩm thực Á-Âu', 'Hồ bơi vô cực view núi', 'Phòng tập Gym hiện đại'].map((item) => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '1.125rem' }}>
                    <span style={{ color: 'var(--g-gold)' }}>✦</span> {item}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 40 }}>
                <Link to="/services" className="g-btn-outline">Xem chi tiết</Link>
              </div>
            </div>
            <div className="w-full lg:flex-[1.2] g-skeleton" style={{ height: 500, borderRadius: 'var(--g-radius-2xl)' }} />
          </div>
        </PageContainer>
      </section>

      <section style={{ background: 'var(--g-primary)', color: 'var(--g-text-on-primary)', padding: 'var(--g-space-32) 0', textAlign: 'center' }}>
        <PageContainer size="md">
          <SectionTitle
            title={<span style={{ color: 'var(--g-text-on-primary)' }}>Sẵn Sàng Cho Kỳ Nghỉ Của Bạn?</span>}
            subtitle={<span style={{ color: 'var(--g-hero-text-muted)' }}>Liên hệ với chúng tôi để nhận ưu đãi tốt nhất cho chuyến đi sắp tới.</span>}
          />
          <div style={{ marginTop: 40 }}>
            <Link
              to="/booking"
              className="g-btn-lg"
              style={{
                background: 'var(--g-bg-card)',
                color: 'var(--g-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '9999px',
                fontWeight: 700,
              }}
            >
              Bắt Đầu Đặt Phòng
            </Link>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
