import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getRoomTypeById } from '../../api/roomTypesApi';
import { getReviews } from '../../api/reviewsApi';
import { PageContainer, LoadingSpinner, EmptyState } from '../../components/guest';
import { getFullImageUrl } from '../../utils/imageUtils';

const VND = (n) =>
  n ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n) : '—';

function Stars({ rating, size = 16 }) {
  const full = Math.round(rating || 0);
  return (
    <span style={{ fontSize: size, color: 'var(--g-gold)', letterSpacing: 1 }}>
      {'★'.repeat(full)}{'☆'.repeat(Math.max(0, 5 - full))}
    </span>
  );
}

function ReviewItem({ review }) {
  return (
    <div style={{ padding: '20px 0', borderBottom: '1px solid var(--g-border-light)', display: 'flex', gap: 16 }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, var(--g-primary), var(--g-primary-light))',
        color: '#fff', display: 'grid', placeItems: 'center',
        fontWeight: 700, fontSize: '1rem',
      }}>
        {(review.user?.fullName || 'K')[0].toUpperCase()}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
          <strong style={{ color: 'var(--g-text)', fontSize: '0.9rem' }}>
            {review.user?.fullName || 'Khách lưu trú'}
          </strong>
          <Stars rating={review.rating} size={13} />
        </div>
        {review.comment && (
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--g-text-secondary)', lineHeight: 1.65, fontStyle: 'italic' }}>
            "{review.comment}"
          </p>
        )}
        {review.imageUrl && (
          <img
            src={getFullImageUrl(review.imageUrl)}
            alt="Review"
            style={{ marginTop: 10, maxWidth: 200, borderRadius: 'var(--g-radius-md)', objectFit: 'cover' }}
          />
        )}
      </div>
    </div>
  );
}

export default function RoomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const stickyRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getRoomTypeById(id),
      getReviews({ roomTypeId: id, pageSize: 10 }),
    ]).then(([roomRes, reviewsRes]) => {
      if (cancelled) return;

      // getRoomTypeById trả thẳng object (không có success wrapper)
      const raw = roomRes.data;
      // Remap field names về dạng UI dùng
      const roomData = raw ? {
        ...raw,
        pricePerNight: raw.pricePerNight ?? raw.basePrice,
        areaM2: raw.areaM2 ?? raw.areaSqm,
        maxOccupancy: raw.maxOccupancy ?? raw.capacityAdults,
        primaryImageUrl: raw.primaryImageUrl ?? raw.images?.find(i => i.isPrimary)?.imageUrl ?? raw.images?.[0]?.imageUrl,
      } : null;
      setRoom(roomData);

      // Reviews API: trả thẳng { total, page, avgRating, data: [...] }
      const reviewsPayload = reviewsRes?.data ?? {};
      const revList = Array.isArray(reviewsPayload?.data) ? reviewsPayload.data : [];
      setReviews(revList);
      setAvgRating(reviewsPayload?.avgRating ?? 0);

      setLoading(false);
    }).catch(err => {
      if (!cancelled) { setError(err?.response?.data?.message || 'Không tìm thấy phòng.'); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [id]);

  const images = room ? [
    ...(room.primaryImageUrl ? [{ imageUrl: room.primaryImageUrl }] : []),
    ...(room.images || []).filter(img => !room.primaryImageUrl || img.imageUrl !== room.primaryImageUrl),
  ] : [];

  const handleBook = () => {
    const params = new URLSearchParams({ roomTypeId: id });
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    navigate(`/booking?${params.toString()}`);
  };

  if (loading) return (
    <PageContainer className="g-section-lg">
      <LoadingSpinner />
    </PageContainer>
  );

  if (error || !room) return (
    <PageContainer className="g-section-lg">
      <EmptyState icon="🛏️" title="Không tìm thấy phòng" message={error || 'Hạng phòng này không tồn tại.'} />
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link to="/rooms" className="g-btn-primary">← Quay lại danh sách phòng</Link>
      </div>
    </PageContainer>
  );

  const amenities = room.amenities || [];

  return (
    <>
      <style>{`
        .rd-breadcrumb {
          padding: 16px 0;
          font-size: 0.82rem;
          color: var(--g-text-muted);
        }
        .rd-breadcrumb a { color: var(--g-text-muted); text-decoration: none; }
        .rd-breadcrumb a:hover { color: var(--g-primary); }
        .rd-breadcrumb span { margin: 0 6px; }

        .rd-gallery-main {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          max-height: 520px;
          overflow: hidden;
          border-radius: var(--g-radius-xl);
          background: var(--g-surface-raised);
        }
        .rd-gallery-main img {
          width: 100%; height: 100%; object-fit: cover;
          transition: opacity 0.35s var(--g-ease);
        }
        .rd-gallery-thumbs {
          display: flex;
          gap: 8px;
          margin-top: 10px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .rd-gallery-thumbs::-webkit-scrollbar { height: 4px; }
        .rd-gallery-thumbs::-webkit-scrollbar-thumb { background: var(--g-border-strong); border-radius: 999px; }
        .rd-thumb {
          flex-shrink: 0;
          width: 80px;
          height: 60px;
          border-radius: var(--g-radius-sm);
          overflow: hidden;
          cursor: pointer;
          border: 2.5px solid transparent;
          transition: border-color 0.2s, opacity 0.2s;
          opacity: 0.65;
        }
        .rd-thumb.active { border-color: var(--g-primary); opacity: 1; }
        .rd-thumb:hover { opacity: 0.9; }
        .rd-thumb img { width: 100%; height: 100%; object-fit: cover; }

        .rd-layout {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 48px;
          align-items: start;
          margin-top: 40px;
        }
        @media (max-width: 1023px) {
          .rd-layout { grid-template-columns: 1fr; }
          .rd-sidebar { position: static !important; }
        }

        .rd-sidebar {
          position: sticky;
          top: calc(var(--g-header-h) + 24px);
        }
        .rd-booking-card {
          background: #fff;
          border: 1.5px solid var(--g-border);
          border-radius: var(--g-radius-xl);
          padding: 28px;
          box-shadow: var(--g-shadow-lg);
        }
        .rd-date-input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          border: 1.5px solid var(--g-border);
          border-radius: var(--g-radius-md);
          font-family: var(--g-font-body);
          font-size: 0.875rem;
          color: var(--g-text);
          background: var(--g-bg);
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .rd-date-input:focus { border-color: var(--g-primary); }

        .rd-amenity-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 10px;
          margin-top: 20px;
        }
        .rd-amenity-item {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--g-surface-raised);
          border-radius: var(--g-radius-md);
          padding: 10px 14px;
          font-size: 0.83rem;
          color: var(--g-text-secondary);
          font-weight: 500;
        }
        .rd-amenity-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--g-primary);
          flex-shrink: 0;
        }

        @media (max-width: 767px) {
          .rd-mobile-cta {
            position: fixed;
            bottom: 0; left: 0; right: 0;
            background: #fff;
            border-top: 1px solid var(--g-border);
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 100;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
          }
        }
        @media (min-width: 768px) {
          .rd-mobile-cta { display: none; }
        }
      `}</style>

      <PageContainer>
        {/* Breadcrumb */}
        <div className="rd-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span>›</span>
          <Link to="/rooms">Hạng phòng</Link>
          <span>›</span>
          <span style={{ color: 'var(--g-text)' }}>{room.name}</span>
        </div>

        {/* Gallery */}
        <div className="rd-gallery-main">
          {images.length > 0 ? (
            <img
              key={activeImg}
              src={getFullImageUrl(images[activeImg]?.imageUrl)}
              alt={room.name}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a3826, #4f645b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 80 }}>🛏️</span>
            </div>
          )}
          {images.length > 0 && (
            <>
              <button
                onClick={() => setActiveImg(i => Math.max(0, i - 1))}
                disabled={activeImg === 0}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: activeImg === 0 ? 0.3 : 0.85, transition: 'opacity 0.2s' }}
              >‹</button>
              <button
                onClick={() => setActiveImg(i => Math.min(images.length - 1, i + 1))}
                disabled={activeImg === images.length - 1}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: activeImg === images.length - 1 ? 0.3 : 0.85, transition: 'opacity 0.2s' }}
              >›</button>
              <div style={{ position: 'absolute', bottom: 12, right: 14, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '0.75rem', padding: '4px 10px', borderRadius: 'var(--g-radius-full)' }}>
                {activeImg + 1} / {images.length}
              </div>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="rd-gallery-thumbs">
            {images.map((img, i) => (
              <div key={i} className={`rd-thumb${i === activeImg ? ' active' : ''}`} onClick={() => setActiveImg(i)}>
                <img src={getFullImageUrl(img.imageUrl)} alt="" />
              </div>
            ))}
          </div>
        )}

        {/* Main layout */}
        <div className="rd-layout">
          {/* Left: Info */}
          <div>
            <h1 style={{ fontFamily: 'var(--g-font-heading)', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 700, color: 'var(--g-text)', margin: '0 0 12px', lineHeight: 1.2 }}>
              {room.name}
            </h1>

            {/* Quick stats */}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
              {room.maxOccupancy && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', color: 'var(--g-text-secondary)' }}>
                  <span>👥</span> <span>{room.maxOccupancy} khách tối đa</span>
                </div>
              )}
              {room.areaM2 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', color: 'var(--g-text-secondary)' }}>
                  <span>📐</span> <span>{room.areaM2} m²</span>
                </div>
              )}
              {avgRating > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', color: 'var(--g-text-secondary)' }}>
                  <Stars rating={avgRating} size={14} />
                  <span style={{ fontWeight: 700, color: 'var(--g-text)' }}>{avgRating.toFixed(1)}</span>
                  <span>({reviews.length} đánh giá)</span>
                </div>
              )}
            </div>

            {/* Price (mobile) */}
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontFamily: 'var(--g-font-heading)', fontSize: '2rem', fontWeight: 800, color: 'var(--g-primary)' }}>
                {VND(room.pricePerNight)}
              </span>
              <span style={{ color: 'var(--g-text-muted)', marginLeft: 6 }}>/đêm</span>
            </div>

            {/* Description */}
            {room.description && (
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontFamily: 'var(--g-font-heading)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--g-text)', marginBottom: 10 }}>
                  Mô tả
                </h2>
                <div className="g-prose" style={{ fontSize: '0.95rem' }}>
                  {room.description.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                </div>
              </div>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <h2 style={{ fontFamily: 'var(--g-font-heading)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--g-text)', marginBottom: 4 }}>
                  Tiện nghi
                </h2>
                <div className="rd-amenity-grid">
                  {amenities.map((a, i) => (
                    <div key={i} className="rd-amenity-item">
                      <div className="rd-amenity-dot" />
                      <span>{a.name || a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <h2 style={{ fontFamily: 'var(--g-font-heading)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--g-text)', margin: 0 }}>
                  Đánh giá khách hàng
                </h2>
                {avgRating > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Stars rating={avgRating} size={15} />
                    <strong style={{ color: 'var(--g-primary)', fontSize: '1rem' }}>{avgRating.toFixed(1)}/5</strong>
                  </div>
                )}
              </div>
              {reviews.length === 0 ? (
                <div style={{ color: 'var(--g-text-faint)', fontSize: '0.9rem', padding: '24px 0', textAlign: 'center', background: 'var(--g-surface-raised)', borderRadius: 'var(--g-radius-lg)' }}>
                  Chưa có đánh giá cho hạng phòng này.
                </div>
              ) : (
                <div>
                  {reviews.map(r => <ReviewItem key={r.id} review={r} />)}
                </div>
              )}
              <div style={{ marginTop: 20 }}>
                <Link to="/reviews" style={{ color: 'var(--g-primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                  Xem tất cả đánh giá →
                </Link>
              </div>
            </div>
          </div>

          {/* Right: Booking sidebar */}
          <div className="rd-sidebar" ref={stickyRef}>
            <div className="rd-booking-card">
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontFamily: 'var(--g-font-heading)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--g-primary)' }}>
                  {VND(room.pricePerNight)}
                </span>
                <span style={{ color: 'var(--g-text-muted)', marginLeft: 6, fontSize: '0.85rem' }}>/đêm</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--g-text-muted)', marginBottom: 6 }}>
                    Ngày nhận phòng
                  </label>
                  <input
                    type="date"
                    className="rd-date-input"
                    value={checkIn}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setCheckIn(e.target.value)}
                    id="rd-checkin"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--g-text-muted)', marginBottom: 6 }}>
                    Ngày trả phòng
                  </label>
                  <input
                    type="date"
                    className="rd-date-input"
                    value={checkOut}
                    min={checkIn || new Date().toISOString().split('T')[0]}
                    onChange={e => setCheckOut(e.target.value)}
                    id="rd-checkout"
                  />
                </div>
              </div>

              <button
                onClick={handleBook}
                className="g-btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800, justifyContent: 'center' }}
              >
                🗓 Đặt phòng ngay
              </button>

              <p style={{ fontSize: '0.75rem', color: 'var(--g-text-muted)', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
                Không thu phí đặt cọc ngay. Giá đã bao gồm thuế và phí dịch vụ cơ bản.
              </p>

              <div style={{ borderTop: '1px solid var(--g-border-light)', marginTop: 20, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: '✅', text: 'Miễn phí hủy trong 24h' },
                  { icon: '🔒', text: 'Đặt phòng an toàn & bảo mật' },
                  { icon: '💬', text: 'Hỗ trợ 24/7' },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.8rem', color: 'var(--g-text-secondary)' }}>
                    <span>{icon}</span> <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <Link to="/rooms" style={{ fontSize: '0.82rem', color: 'var(--g-text-muted)' }}>
                ← Xem hạng phòng khác
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom padding for mobile CTA */}
        <div style={{ height: 80 }} className="rd-mobile-cta-spacer" />
      </PageContainer>

      {/* Mobile sticky CTA */}
      <div className="rd-mobile-cta">
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--g-primary)' }}>{VND(room.pricePerNight)}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--g-text-muted)' }}>mỗi đêm</div>
        </div>
        <button onClick={handleBook} className="g-btn-primary" style={{ padding: '12px 28px', fontSize: '0.9rem', fontWeight: 800 }}>
          Đặt ngay
        </button>
      </div>
    </>
  );
}
