import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getRoomTypes } from '../../api/roomTypesApi';
import { PageContainer, SectionTitle, LoadingSpinner, EmptyState } from '../../components/guest';
import { getFullImageUrl } from '../../utils/imageUtils';

const VND = (n) =>
  n ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n) : '—';

function RoomCard({ room }) {
  // List API: primaryImage.imageUrl | Detail API: images[].isPrimary | after remap: primaryImageUrl
  const img = room.primaryImageUrl || room.primaryImage?.imageUrl || room.images?.[0]?.imageUrl;
  const amenities = (room.amenities || []).slice(0, 4);

  return (
    <article style={{
      background: '#fff',
      borderRadius: 'var(--g-radius-xl)',
      border: '1px solid var(--g-border)',
      overflow: 'hidden',
      boxShadow: 'var(--g-shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'transform 0.3s var(--g-ease), box-shadow 0.3s var(--g-ease)',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = 'var(--g-shadow-xl)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--g-shadow-sm)'; }}
    >
      {/* Image */}
      <div style={{ position: 'relative', height: 260, overflow: 'hidden', flexShrink: 0 }}>
        {img ? (
          <img src={getFullImageUrl(img)} alt={room.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s var(--g-ease)' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.07)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a3826, #4f645b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 56 }}>🛏️</span>
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 55%)' }} />
        {/* Price badge */}
        <div style={{
          position: 'absolute', bottom: 16, left: 16,
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
          borderRadius: 'var(--g-radius-full)',
          padding: '6px 14px',
          display: 'inline-flex', alignItems: 'baseline', gap: 4,
        }}>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--g-primary)' }}>{VND(room.pricePerNight)}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--g-text-muted)' }}>/đêm</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--g-font-heading)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--g-text)', margin: '0 0 6px', lineHeight: 1.3 }}>
            {room.name}
          </h2>
          <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem', color: 'var(--g-text-muted)' }}>
            {room.maxOccupancy && <span>👥 {room.maxOccupancy} khách tối đa</span>}
            {room.areaM2 && <span>📐 {room.areaM2} m²</span>}
          </div>
        </div>

        {room.description && (
          <p style={{ fontSize: '0.85rem', color: 'var(--g-text-secondary)', lineHeight: 1.65, margin: 0 }}>
            {room.description.length > 130 ? room.description.slice(0, 130) + '…' : room.description}
          </p>
        )}

        {amenities.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {amenities.map((a, i) => (
              <span key={i} style={{
                background: 'var(--g-primary-muted)',
                color: 'var(--g-primary)',
                fontSize: '0.73rem', fontWeight: 600,
                padding: '4px 10px', borderRadius: 'var(--g-radius-full)',
              }}>
                {a.name || a}
              </span>
            ))}
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 14, display: 'flex', gap: 10 }}>
          <Link
            to={`/rooms/${room.id}`}
            className="g-btn-outline"
            style={{ flex: 1, textAlign: 'center', padding: '10px 0', fontSize: '0.85rem', textDecoration: 'none', color: 'var(--g-primary)' }}
          >
            Chi tiết
          </Link>
          <Link
            to={`/booking?roomTypeId=${room.id}`}
            className="g-btn-primary"
            style={{ flex: 1, textAlign: 'center', padding: '10px 0', fontSize: '0.85rem', textDecoration: 'none', color: '#fff' }}
          >
            Đặt ngay
          </Link>
        </div>
      </div>
    </article>
  );
}

const SORT_OPTIONS = [
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
  { value: 'name_asc', label: 'Tên A → Z' },
];

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  // Filter state
  const [search, setSearch] = useState('');
  const [maxGuests, setMaxGuests] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('price_asc');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRoomTypes().then(res => {
      if (!cancelled) {
        // API: { success, message, data: [...] }
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        // Remap field names: basePrice→pricePerNight, areaSqm→areaM2, capacityAdults→maxOccupancy
        const mapped = list
          .filter(r => r.isActive !== false)
          .map(r => ({
            ...r,
            pricePerNight: r.pricePerNight ?? r.basePrice,
            areaM2: r.areaM2 ?? r.areaSqm,
            maxOccupancy: r.maxOccupancy ?? r.capacityAdults,
            // list API: primaryImage.imageUrl | detail API: images[].isPrimary
            primaryImageUrl: r.primaryImageUrl ?? r.primaryImage?.imageUrl ?? r.images?.find(i => i.isPrimary)?.imageUrl ?? r.images?.[0]?.imageUrl,
          }));
        setRooms(mapped);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Client-side filter + sort
  const filtered = useMemo(() => {
    let list = [...rooms];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.name?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q));
    }
    if (maxGuests) {
      list = list.filter(r => !r.maxOccupancy || r.maxOccupancy >= Number(maxGuests));
    }
    if (maxPrice) {
      list = list.filter(r => !r.pricePerNight || r.pricePerNight <= Number(maxPrice));
    }
    if (sort === 'price_asc') list.sort((a, b) => (a.pricePerNight || 0) - (b.pricePerNight || 0));
    else if (sort === 'price_desc') list.sort((a, b) => (b.pricePerNight || 0) - (a.pricePerNight || 0));
    else if (sort === 'name_asc') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return list;
  }, [rooms, search, maxGuests, maxPrice, sort]);

  const hasFilter = search || maxGuests || maxPrice;

  return (
    <>
      <style>{`
        .rooms-hero {
          position: relative;
          height: 340px;
          display: flex;
          align-items: flex-end;
          justify-content: flex-start;
          background: linear-gradient(135deg, #0f2419 0%, #1a3826 60%, #2d5540 100%);
          overflow: hidden;
          padding-bottom: 48px;
        }
        .rooms-hero-pattern {
          position: absolute;
          inset: 0;
          opacity: 0.06;
          background-image: radial-gradient(circle at 1px 1px, #fff 1px, transparent 0);
          background-size: 40px 40px;
        }
        .rooms-hero-content {
          position: relative;
          z-index: 2;
          color: #fff;
        }
        .rooms-filter-bar {
          background: #fff;
          border-bottom: 1px solid var(--g-border);
          padding: 20px 0;
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
        }
        .rooms-filter-inner {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        .rooms-filter-input {
          flex: 1;
          min-width: 200px;
          height: 42px;
          padding: 0 16px;
          border: 1.5px solid var(--g-border);
          border-radius: var(--g-radius-full);
          font-family: var(--g-font-body);
          font-size: 0.875rem;
          color: var(--g-text);
          background: var(--g-bg);
          transition: border-color 0.2s;
          outline: none;
        }
        .rooms-filter-input:focus { border-color: var(--g-primary); }
        .rooms-filter-select {
          height: 42px;
          padding: 0 14px;
          border: 1.5px solid var(--g-border);
          border-radius: var(--g-radius-full);
          font-family: var(--g-font-body);
          font-size: 0.875rem;
          color: var(--g-text);
          background: var(--g-bg);
          cursor: pointer;
          outline: none;
          transition: border-color 0.2s;
        }
        .rooms-filter-select:focus { border-color: var(--g-primary); }
        .rooms-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
          margin-top: 48px;
        }
        @media (max-width: 1023px) { .rooms-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 639px)  { .rooms-grid { grid-template-columns: 1fr; } }
        @media (max-width: 767px) {
          .rooms-hero { height: 220px; padding-bottom: 24px; }
        }
      `}</style>

      {/* Hero */}
      <section className="rooms-hero">
        <div className="rooms-hero-pattern" />
        <div className="rooms-hero-content" style={{ padding: '0 clamp(16px,5vw,48px)', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
            The Ethereal Hotel
          </div>
          <h1 style={{ fontFamily: 'var(--g-font-heading)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, color: '#fff', margin: '0 0 12px', lineHeight: 1.1 }}>
            Hạng Phòng & Suite
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1rem', margin: 0 }}>
            {rooms.length > 0 ? `${rooms.length} hạng phòng đang có sẵn` : 'Khám phá không gian nghỉ dưỡng đẳng cấp'}
          </p>
        </div>
      </section>

      {/* Filter bar */}
      <div className="rooms-filter-bar">
        <PageContainer>
          <div className="rooms-filter-inner">
            <input
              type="text"
              className="rooms-filter-input"
              placeholder="🔍  Tìm kiếm hạng phòng..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="rooms-search"
            />
            <select
              className="rooms-filter-select"
              value={maxGuests}
              onChange={e => setMaxGuests(e.target.value)}
              id="rooms-guests"
              title="Số khách"
            >
              <option value="">👥 Số khách</option>
              <option value="1">1 khách</option>
              <option value="2">2 khách</option>
              <option value="3">3 khách</option>
              <option value="4">4+ khách</option>
            </select>
            <select
              className="rooms-filter-select"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              id="rooms-price"
              title="Giá tối đa"
            >
              <option value="">💰 Giá tối đa</option>
              <option value="1000000">1.000.000đ</option>
              <option value="2000000">2.000.000đ</option>
              <option value="5000000">5.000.000đ</option>
              <option value="10000000">10.000.000đ</option>
            </select>
            <select
              className="rooms-filter-select"
              value={sort}
              onChange={e => setSort(e.target.value)}
              id="rooms-sort"
              title="Sắp xếp"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {hasFilter && (
              <button
                onClick={() => { setSearch(''); setMaxGuests(''); setMaxPrice(''); }}
                style={{ height: 42, padding: '0 16px', background: 'transparent', border: '1.5px solid var(--g-border)', borderRadius: 'var(--g-radius-full)', cursor: 'pointer', fontFamily: 'var(--g-font-body)', fontSize: '0.85rem', color: 'var(--g-text-muted)', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--g-primary)'; e.currentTarget.style.color = 'var(--g-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--g-border)'; e.currentTarget.style.color = 'var(--g-text-muted)'; }}
              >
                ✕ Xoá bộ lọc
              </button>
            )}
          </div>
        </PageContainer>
      </div>

      {/* Room grid */}
      <PageContainer className="g-section-lg">
        {loading ? (
          <LoadingSpinner variant="skeleton" skeletonCount={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🛏️"
            title={hasFilter ? 'Không tìm thấy phòng phù hợp' : 'Chưa có hạng phòng nào'}
            message={hasFilter ? 'Hãy thử điều chỉnh bộ lọc tìm kiếm.' : 'Vui lòng quay lại sau.'}
            action={hasFilter ? <button onClick={() => { setSearch(''); setMaxGuests(''); setMaxPrice(''); }} className="g-btn-primary" style={{ marginTop: 16 }}>Xoá bộ lọc</button> : null}
          />
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--g-text-muted)', margin: 0 }}>
                Hiển thị <strong>{filtered.length}</strong> hạng phòng
              </p>
            </div>
            <div className="rooms-grid">
              {filtered.map(room => <RoomCard key={room.id} room={room} />)}
            </div>
          </>
        )}

        {/* Bottom CTA */}
        <div style={{ marginTop: 64, background: 'var(--g-primary)', borderRadius: 'var(--g-radius-xl)', padding: '40px 40px', textAlign: 'center', color: '#fff' }}>
          <h2 style={{ fontFamily: 'var(--g-font-heading)', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, margin: '0 0 12px' }}>
            Chưa tìm thấy phòng ưng ý?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 24px', lineHeight: 1.6 }}>
            Liên hệ trực tiếp với chúng tôi để được tư vấn và có ưu đãi đặc biệt.
          </p>
          <Link
            to="/booking"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '13px 32px', background: '#fff', color: 'var(--g-primary)',
              borderRadius: 'var(--g-radius-full)', fontWeight: 800,
              textDecoration: 'none', fontSize: '0.95rem',
            }}
          >
            Đặt phòng ngay →
          </Link>
        </div>
      </PageContainer>
    </>
  );
}
