import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer, SectionTitle } from '../../components/guest';
import { getRoomTypes } from '../../api/roomTypesApi';
import { getReviews } from '../../api/reviewsApi';
import { getArticles } from '../../api/articlesApi';
import { getGuestServiceCatalog } from '../../api/guestServicesApi';
import { getFullImageUrl } from '../../utils/imageUtils';

/* ── Formatters ── */
const VND = (n) =>
  n ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n) : '—';

const STARS_ICONS = ['🛏️', '🌿', '🍽️', '💆', '🏊', '🏋️'];

/* ── Small star renderer ── */
function Stars({ rating, size = 16 }) {
  const full = Math.round(rating || 0);
  return (
    <span style={{ fontSize: size, letterSpacing: 1, color: 'var(--g-gold)' }}>
      {'★'.repeat(full)}{'☆'.repeat(Math.max(0, 5 - full))}
    </span>
  );
}

/* ── Room card ── */
function RoomCard({ room }) {
  const img = room.primaryImageUrl || room.images?.[0]?.imageUrl;
  const amenities = (room.amenities || []).slice(0, 3);
  return (
    <article className="g-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', height: 240, overflow: 'hidden', flexShrink: 0 }}>
        {img ? (
          <img
            src={getFullImageUrl(img)}
            alt={room.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s var(--g-ease)' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a3826 0%,#4f645b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 48 }}>🛏️</span>
          </div>
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)',
        }} />
        <div style={{ position: 'absolute', bottom: 14, left: 16, right: 16 }}>
          <div style={{ background: 'var(--g-bg-card)', backdropFilter: 'blur(8px)', borderRadius: 'var(--g-radius-full)', padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 800, color: 'var(--g-primary)', fontSize: '0.95rem' }}>{VND(room.pricePerNight)}</span>
            <span style={{ color: 'var(--g-text-muted)', fontSize: '0.75rem' }}>/đêm</span>
          </div>
        </div>
      </div>
      <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--g-font-heading)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--g-text)', margin: '0 0 4px', lineHeight: 1.3 }}>
            {room.name}
          </h3>
          <div style={{ fontSize: '0.8rem', color: 'var(--g-text-muted)', display: 'flex', gap: 12 }}>
            {room.maxOccupancy && <span>👥 {room.maxOccupancy} khách</span>}
            {room.areaM2 && <span>📐 {room.areaM2}m²</span>}
          </div>
        </div>
        {amenities.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {amenities.map((a, i) => (
              <span key={i} style={{ background: 'var(--g-primary-muted)', color: 'var(--g-primary)', fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--g-radius-full)' }}>
                {a.name || a}
              </span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', gap: 8 }}>
          <Link to={`/rooms/${room.id}`} className="g-btn-outline" style={{ flex: 1, textAlign: 'center', padding: '9px 0', fontSize: '0.82rem' }}>
            Xem chi tiết
          </Link>
          <Link to={`/booking?roomTypeId=${room.id}`} className="g-btn-primary" style={{ flex: 1, textAlign: 'center', padding: '9px 0', fontSize: '0.82rem' }}>
            Đặt ngay
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ── Review quote card ── */
function ReviewCard({ review }) {
  return (
    <div style={{
      background: 'var(--g-bg-card)',
      borderRadius: 'var(--g-radius-lg)',
      border: '1px solid var(--g-border)',
      padding: '28px 28px 24px',
      display: 'flex', flexDirection: 'column', gap: 16,
      boxShadow: 'var(--g-shadow-sm)',
      position: 'relative',
    }}>
      <div style={{ fontSize: 40, color: 'var(--g-primary)', opacity: 0.2, lineHeight: 1, position: 'absolute', top: 16, right: 20, fontFamily: 'Georgia, serif' }}>"</div>
      <Stars rating={review.rating} />
      <p style={{
        fontSize: '0.95rem',
        lineHeight: 1.7,
        color: 'var(--g-text-secondary)',
        fontStyle: 'italic',
        margin: 0,
        flex: 1,
      }}>
        "{(review.comment || '').length > 180 ? review.comment.slice(0, 180) + '…' : review.comment}"
      </p>
      <div style={{ borderTop: '1px solid var(--g-border-light)', paddingTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--g-primary), var(--g-primary-light))',
          color: '#fff', display: 'grid', placeItems: 'center',
          fontWeight: 700, fontSize: '1rem', flexShrink: 0,
        }}>
          {(review.user?.fullName || 'K').trim()[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--g-text)', fontSize: '0.9rem' }}>
            {review.user?.fullName || 'Khách lưu trú'}
          </div>
          {review.roomType?.name && (
            <div style={{ fontSize: '0.75rem', color: 'var(--g-text-muted)', marginTop: 1 }}>
              {review.roomType.name}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Article card ── */
function ArticleCard({ article }) {
  return (
    <Link to={`/articles/${article.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <article className="g-card" style={{ overflow: 'hidden', cursor: 'pointer' }}>
        <div style={{ height: 200, overflow: 'hidden', position: 'relative' }}>
          {article.thumbnailUrl ? (
            <img
              src={getFullImageUrl(article.thumbnailUrl)}
              alt={article.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s var(--g-ease)' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a3826 0%, #6e8b7c 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 40 }}>📰</span>
            </div>
          )}
          {article.category?.name && (
            <div style={{ position: 'absolute', top: 12, left: 12, background: 'var(--g-primary)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--g-radius-full)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {article.category.name}
            </div>
          )}
        </div>
        <div style={{ padding: '18px 20px 20px' }}>
          <h3 style={{ fontFamily: 'var(--g-font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--g-text)', margin: '0 0 8px', lineHeight: 1.4 }}>
            {article.title}
          </h3>
          {article.metaDescription && (
            <p style={{ fontSize: '0.82rem', color: 'var(--g-text-muted)', lineHeight: 1.6, margin: 0 }}>
              {article.metaDescription.slice(0, 120)}{article.metaDescription.length > 120 ? '…' : ''}
            </p>
          )}
          <div style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--g-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            Đọc thêm →
          </div>
        </div>
      </article>
    </Link>
  );
}

/* ──────────────── Main ──────────────── */
export default function HomePage() {
  const [rooms, setRooms] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [articles, setArticles] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState({ rooms: true, reviews: true, articles: true });
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getRoomTypes().catch(() => ({ data: { data: [] } })),
      getReviews({ pageSize: 3 }).catch(() => ({ data: { data: [], avgRating: 0 } })),
      getArticles({ pageSize: 3 }).catch(() => ({ data: { data: [] } })),
      getGuestServiceCatalog().catch(() => ({ data: { data: [] } })),
    ]).then(([roomsRes, reviewsRes, articlesRes, servicesRes]) => {
      if (cancelled) return;

      // RoomTypes: { success, message, data: [...] }  → res.data.data
      const rawRooms = roomsRes?.data?.data ?? roomsRes?.data ?? [];
      const roomList = (Array.isArray(rawRooms) ? rawRooms : [])
        .filter(r => r.isActive !== false)
        .map(r => ({
          ...r,
          pricePerNight: r.pricePerNight ?? r.basePrice,
          areaM2: r.areaM2 ?? r.areaSqm,
          maxOccupancy: r.maxOccupancy ?? r.capacityAdults,
          // list API: primaryImage.imageUrl | detail API: images[].isPrimary
          primaryImageUrl: r.primaryImageUrl ?? r.primaryImage?.imageUrl ?? r.images?.find(i => i.isPrimary)?.imageUrl ?? r.images?.[0]?.imageUrl,
        }));
      setRooms(roomList.slice(0, 3));

      // Reviews API trả thẳng { total, page, avgRating, data: [...] } (không wrap success)
      const reviewsPayload = reviewsRes?.data ?? {};
      const reviewList = Array.isArray(reviewsPayload?.data) ? reviewsPayload.data : [];
      setReviews(reviewList.slice(0, 3));
      setAvgRating(reviewsPayload?.avgRating ?? 0);

      // Articles: { success, message, data: [...], pagination } → res.data.data
      const articleList = articlesRes?.data?.data ?? articlesRes?.data ?? [];
      setArticles((Array.isArray(articleList) ? articleList : []).slice(0, 3));

      // Services catalog
      const catalog = servicesRes?.data?.data ?? servicesRes?.data ?? [];
      let svcList = [];
      if (Array.isArray(catalog) && catalog.length > 0 && catalog[0]?.services !== undefined) {
        svcList = catalog.flatMap(c => c.services || []);
      } else {
        svcList = Array.isArray(catalog) ? catalog : [];
      }
      setServices(svcList.filter(s => s.isActive !== false).slice(0, 6));

      setLoading({ rooms: false, reviews: false, articles: false });
    });

    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <style>{`
        /* ── Hero ── */
        .hp-hero {
          position: relative;
          height: 100vh;
          min-height: 640px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #111;
          overflow: hidden;
          margin-top: calc(-1 * var(--g-header-h));
        }
        .hp-hero-bg {
          position: absolute;
          inset: 0;
          background: url('https://res.cloudinary.com/dekvhccnn/image/upload/v1775746982/background_fuvlae.png') center/cover no-repeat;
          opacity: 0.55;
          transform: scale(1.05);
          animation: hero-zoom 20s ease-out forwards;
        }
        @keyframes hero-zoom { to { transform: scale(1); } }
        .hp-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.55) 100%);
        }
        .hp-hero-content {
          position: relative;
          z-index: 10;
          text-align: center;
          color: #ffffff;
          padding: 0 24px;
          max-width: 800px;
        }
        .hp-eyebrow {
          font-size: 0.8rem;
          letter-spacing: 0.35em;
          text-transform: uppercase;
          margin-bottom: 24px;
          opacity: 0.85;
          animation: g-fadeInUp 0.8s ease-out;
        }
        .hp-title {
          font-family: var(--g-font-heading);
          font-size: clamp(3.2rem, 8vw, 5.5rem);
          font-weight: 700;
          line-height: 1.08;
          letter-spacing: var(--g-tracking-tight);
          margin-bottom: 24px;
          animation: g-fadeInUp 1s ease-out 0.2s both;
        }
        .hp-subtitle {
          font-size: clamp(1rem, 2vw, 1.2rem);
          max-width: 560px;
          margin: 0 auto 40px;
          opacity: 0.9;
          line-height: 1.7;
          animation: g-fadeInUp 1s ease-out 0.4s both;
        }
        .hp-hero-actions {
          animation: g-fadeInUp 1s ease-out 0.6s both;
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .hp-hero-scroll {
          position: absolute;
          bottom: 36px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: rgba(255,255,255,0.55);
          font-size: 0.7rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          animation: g-fadeIn 2s ease-out 1.2s both;
          z-index: 10;
        }
        .hp-scroll-line {
          width: 1px;
          height: 40px;
          background: linear-gradient(to bottom, rgba(255,255,255,0.6), transparent);
          animation: g-float 2s ease-in-out infinite;
        }

        /* ── Stats bar ── */
        .hp-stats {
          background: var(--g-primary);
          padding: 0;
        }
        .hp-stats-inner {
          max-width: var(--g-container-xl);
          margin: 0 auto;
          padding: 0 var(--g-container-pad);
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }
        .hp-stat-item {
          padding: 28px 16px;
          text-align: center;
          border-right: 1px solid rgba(255,255,255,0.1);
        }
        .hp-stat-item:last-child { border-right: none; }
        .hp-stat-num {
          font-family: var(--g-font-heading);
          font-size: 2rem;
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }
        .hp-stat-label {
          font-size: 0.7rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.55);
          margin-top: 6px;
        }
        @media (max-width: 767px) {
          .hp-stats-inner { grid-template-columns: repeat(2, 1fr); }
          .hp-stat-item:nth-child(2) { border-right: none; }
          .hp-stat-item:nth-child(3) { border-right: none; border-top: 1px solid rgba(255,255,255,0.1); }
          .hp-stat-item:last-child { border-top: 1px solid rgba(255,255,255,0.1); }
        }

        /* ── Services strip ── */
        .hp-services-strip {
          background: var(--g-surface-raised);
          padding: 64px 0;
        }
        .hp-services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          margin-top: 48px;
        }
        .hp-service-card {
          background: #fff;
          border: 1px solid var(--g-border);
          border-radius: var(--g-radius-lg);
          padding: 24px 16px 20px;
          text-align: center;
          transition: all 0.25s var(--g-ease);
        }
        .hp-service-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--g-shadow-lg);
          border-color: var(--g-primary-light);
        }
        .hp-service-icon {
          font-size: 2rem;
          margin-bottom: 12px;
        }
        .hp-service-name {
          font-weight: 700;
          font-size: 0.88rem;
          color: var(--g-text);
          line-height: 1.35;
        }

        /* ── Rooms + Reviews grid ── */
        .hp-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
          margin-top: 48px;
        }
        @media (max-width: 1023px) { .hp-grid-3 { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 639px)  { .hp-grid-3 { grid-template-columns: 1fr; } }

        /* ── Articles ── */
        .hp-articles-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 48px;
        }
        @media (max-width: 1023px) { .hp-articles-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 639px)  { .hp-articles-grid { grid-template-columns: 1fr; } }

        /* ── CTA section ── */
        .hp-cta {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #0f2419 0%, #1a3826 50%, #2d5540 100%);
          padding: 100px 0;
          text-align: center;
          color: #fff;
        }
        .hp-cta-bg-circle {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.03);
        }
        .hp-cta-actions {
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 40px;
        }
      `}</style>

      {/* ══ HERO ══ */}
      <section className="hp-hero">
        <div className="hp-hero-bg" />
        <div className="hp-hero-overlay" />
        <div className="hp-hero-content">
          <div className="hp-eyebrow">✦ Trải nghiệm nghỉ dưỡng tuyệt đỉnh ✦</div>
          <h1 className="hp-title">The Ethereal</h1>
          <p className="hp-subtitle">
            Nơi thời gian dừng lại, không gian mở ra. Tận hưởng kỳ nghỉ dưỡng sang trọng giữa không gian thiên nhiên hùng vĩ.
          </p>
          <div className="hp-hero-actions">
            <Link
              to="/booking"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '15px 36px',
                background: '#ffffff', color: 'var(--g-primary)',
                borderRadius: 'var(--g-radius-full)', fontWeight: 800,
                fontSize: '0.95rem', textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)'; }}
            >
              🗓 Đặt phòng ngay
            </Link>
            <Link
              to="/rooms"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '15px 36px',
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(10px)',
                border: '1.5px solid rgba(255,255,255,0.35)',
                color: '#ffffff',
                borderRadius: 'var(--g-radius-full)', fontWeight: 700,
                fontSize: '0.95rem', textDecoration: 'none',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            >
              Khám phá phòng
            </Link>
          </div>
        </div>
        <div className="hp-hero-scroll">
          <div className="hp-scroll-line" />
          scroll
        </div>
      </section>

      {/* ══ STATS BAR ══ */}
      <section className="hp-stats">
        <div className="hp-stats-inner">
          {[
            { num: '2018', label: 'Năm thành lập' },
            { num: '50+', label: 'Hạng phòng & Suite' },
            { num: `${avgRating > 0 ? avgRating.toFixed(1) : '4.9'}/5`, label: 'Đánh giá trung bình' },
            { num: '5★', label: 'Tiêu chuẩn quốc tế' },
          ].map(({ num, label }) => (
            <div key={label} className="hp-stat-item">
              <div className="hp-stat-num">{num}</div>
              <div className="hp-stat-label">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ FEATURED ROOMS ══ */}
      <PageContainer as="section" className="g-section-lg">
        <SectionTitle
          eyebrow="Phòng & Suite"
          title="Không Gian Đẳng Cấp"
          subtitle="Mỗi căn phòng là một tác phẩm nghệ thuật, mang đến sự tiện nghi và riêng tư tuyệt đối."
          className="g-animate-up"
        />
        <div className="hp-grid-3">
          {loading.rooms
            ? [1, 2, 3].map(i => (
              <div key={i} className="g-skeleton" style={{ height: 420, borderRadius: 'var(--g-radius-lg)' }} />
            ))
            : rooms.length > 0
              ? rooms.map(room => <RoomCard key={room.id} room={room} />)
              : [1, 2, 3].map(i => (
                <div key={i} style={{ background: '#fff', border: '1px solid var(--g-border)', borderRadius: 'var(--g-radius-lg)', height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--g-text-faint)' }}>
                  Hạng phòng {i}
                </div>
              ))
          }
        </div>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link to="/rooms" className="g-btn-outline">Xem tất cả hạng phòng →</Link>
        </div>
      </PageContainer>

      {/* ══ SERVICES STRIP ══ */}
      <section className="hp-services-strip">
        <PageContainer>
          <SectionTitle
            eyebrow="Dịch Vụ Nổi Bật"
            title="Tận Hưởng Từng Khoảnh Khắc"
            subtitle="Tại The Ethereal, chúng tôi mang đến những dịch vụ đạt chuẩn 5 sao, từ ẩm thực tinh tế đến spa chăm sóc sức khỏe toàn diện."
            className="g-animate-up"
          />
          <div className="hp-services-grid">
            {services.length > 0
              ? services.map((svc, i) => (
                <div key={svc.id} className="hp-service-card">
                  <div className="hp-service-icon">
                    {svc.imageUrl
                      ? <img src={getFullImageUrl(svc.imageUrl)} alt={svc.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: '50%', margin: '0 auto 8px' }} />
                      : STARS_ICONS[i % STARS_ICONS.length]
                    }
                  </div>
                  <div className="hp-service-name">{svc.name}</div>
                  {svc.price > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--g-primary)', fontWeight: 700, marginTop: 6 }}>
                      {VND(svc.price)}
                    </div>
                  )}
                </div>
              ))
              : [
                { icon: '💆', name: 'Mộc Spa & Wellness' },
                { icon: '🍽️', name: 'Nhà hàng Á-Âu' },
                { icon: '🏊', name: 'Hồ bơi vô cực' },
                { icon: '🏋️', name: 'Phòng tập Gym' },
                { icon: '🌿', name: 'Yoga & Thiền' },
                { icon: '🚗', name: 'Đưa đón sân bay' },
              ].map(({ icon, name }) => (
                <div key={name} className="hp-service-card">
                  <div className="hp-service-icon">{icon}</div>
                  <div className="hp-service-name">{name}</div>
                </div>
              ))
            }
          </div>
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <Link to="/services" className="g-btn-outline">Xem tất cả dịch vụ →</Link>
          </div>
        </PageContainer>
      </section>

      {/* ══ REVIEWS ══ */}
      <PageContainer as="section" className="g-section-lg">
        <SectionTitle
          eyebrow="Góc Nhìn Khách Hàng"
          title="Dấu Ấn Khó Quên"
          subtitle={avgRating > 0
            ? <>Điểm đánh giá trung bình: <strong style={{ color: 'var(--g-primary)' }}>{avgRating.toFixed(1)}/5 ⭐</strong></>
            : 'Những gì khách hàng nói về trải nghiệm của họ tại The Ethereal'}
          className="g-animate-up"
        />
        <div className="hp-grid-3">
          {loading.reviews
            ? [1, 2, 3].map(i => <div key={i} className="g-skeleton" style={{ height: 220, borderRadius: 'var(--g-radius-lg)' }} />)
            : reviews.length > 0
              ? reviews.map(r => <ReviewCard key={r.id} review={r} />)
              : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--g-text-faint)', padding: '48px 0' }}>
                  Chưa có đánh giá nào.
                </div>
              )
          }
        </div>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link to="/reviews" className="g-btn-outline">Xem tất cả đánh giá →</Link>
        </div>
      </PageContainer>

      {/* ══ ARTICLES ══ */}
      {(articles.length > 0 || loading.articles) && (
        <section style={{ background: 'var(--g-surface-raised)', padding: 'var(--g-space-32) 0' }}>
          <PageContainer>
            <SectionTitle
              eyebrow="Bài Viết & Khám Phá"
              title="Góc Nhìn The Ethereal"
              subtitle="Cẩm nang du lịch, ẩm thực, và những góc khuất thú vị xung quanh khách sạn."
              className="g-animate-up"
            />
            <div className="hp-articles-grid">
              {loading.articles
                ? [1, 2, 3].map(i => <div key={i} className="g-skeleton" style={{ height: 320, borderRadius: 'var(--g-radius-lg)' }} />)
                : articles.map(a => <ArticleCard key={a.id} article={a} />)
              }
            </div>
            <div style={{ textAlign: 'center', marginTop: 36 }}>
              <Link to="/articles" className="g-btn-outline">Xem tất cả bài viết →</Link>
            </div>
          </PageContainer>
        </section>
      )}

      {/* ══ FINAL CTA ══ */}
      <section className="hp-cta">
        <div className="hp-cta-bg-circle" style={{ width: 600, height: 600, top: -200, right: -150 }} />
        <div className="hp-cta-bg-circle" style={{ width: 400, height: 400, bottom: -150, left: -100 }} />
        <PageContainer size="md" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
            ✦ The Ethereal Luxury Hotel ✦
          </div>
          <h2 style={{
            fontFamily: 'var(--g-font-heading)',
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.15,
            letterSpacing: 'var(--g-tracking-tight)',
            margin: '0 0 16px',
          }}>
            Sẵn Sàng Cho Kỳ Nghỉ<br />Của Bạn?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.1rem', lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
            Liên hệ với chúng tôi để nhận ưu đãi tốt nhất. Đặt phòng sớm để có giá tốt và nhiều quyền lợi đặc biệt.
          </p>
          <div className="hp-cta-actions">
            <Link
              to="/booking"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '16px 40px',
                background: '#fff', color: 'var(--g-primary)',
                borderRadius: 'var(--g-radius-full)', fontWeight: 800,
                fontSize: '1rem', textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}
            >
              🗓 Bắt Đầu Đặt Phòng
            </Link>
            <Link
              to="/rooms"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '16px 36px',
                background: 'transparent',
                border: '1.5px solid rgba(255,255,255,0.4)',
                color: '#fff',
                borderRadius: 'var(--g-radius-full)', fontWeight: 700,
                fontSize: '1rem', textDecoration: 'none',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent'; }}
            >
              Xem hạng phòng
            </Link>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
