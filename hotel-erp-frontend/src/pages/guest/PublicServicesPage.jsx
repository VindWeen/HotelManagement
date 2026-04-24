import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getGuestServiceCatalog } from '../../api/guestServicesApi';
import { PageContainer, SectionTitle, LoadingSpinner, EmptyState } from '../../components/guest';
import { getFullImageUrl } from '../../utils/imageUtils';

const VND = (n) =>
  n ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n) : null;

const SERVICE_ICONS = ['💆', '🍽️', '🏊', '🏋️', '🌿', '🚗', '🎭', '📸', '🧖', '🎵'];

function ServiceCard({ service, index }) {
  const icon = SERVICE_ICONS[index % SERVICE_ICONS.length];
  const price = VND(service.price);

  return (
    <div style={{
      background: 'var(--g-bg-card)',
      borderRadius: 'var(--g-radius-xl)',
      border: '1px solid var(--g-border)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'transform 0.3s var(--g-ease), box-shadow 0.3s var(--g-ease)',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = 'var(--g-shadow-xl)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {/* Image or icon */}
      <div style={{ position: 'relative', height: 200, overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg, #1a3826 0%, #2d5540 100%)' }}>
        {service.imageUrl ? (
          <img
            src={getFullImageUrl(service.imageUrl)}
            alt={service.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>
            {icon}
          </div>
        )}
        {price && (
          <div style={{
            position: 'absolute', bottom: 12, right: 12,
            background: 'var(--g-bg-card)', backdropFilter: 'blur(6px)',
            borderRadius: 'var(--g-radius-full)', padding: '4px 12px',
            fontWeight: 800, fontSize: '0.88rem', color: 'var(--g-primary)',
          }}>
            {price}
          </div>
        )}
      </div>
      {/* Body */}
      <div style={{ padding: '20px 22px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ fontFamily: 'var(--g-font-heading)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--g-text)', margin: 0 }}>
          {service.name}
        </h3>
        {service.description && (
          <p style={{ fontSize: '0.84rem', color: 'var(--g-text-secondary)', lineHeight: 1.6, margin: 0, flex: 1 }}>
            {service.description.length > 120 ? service.description.slice(0, 120) + '…' : service.description}
          </p>
        )}
        <div style={{ marginTop: 'auto', paddingTop: 10 }}>
          <Link
            to="/login"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: '0.82rem', color: 'var(--g-primary)', fontWeight: 700,
              textDecoration: 'none', padding: '8px 0',
            }}
          >
            Đặt dịch vụ →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PublicServicesPage() {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getGuestServiceCatalog()
      .then(res => {
        if (cancelled) return;
        // Catalog trả về mảng categories, mỗi category có danh sách services
        const catalog = Array.isArray(res.data) ? res.data : res.data?.data || [];
        // Nếu catalog là mảng categories có .services bên trong
        if (catalog.length > 0 && catalog[0]?.services !== undefined) {
          setCategories(catalog.map(c => ({ id: c.id, name: c.name })));
          const allServices = catalog.flatMap(c =>
            (c.services || []).map(s => ({ ...s, categoryId: c.id }))
          );
          setServices(allServices);
        } else {
          // Fallback: catalog là flat list of services
          setServices(catalog.filter(s => s.isActive !== false));
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = activeCategory === 'all'
    ? services
    : services.filter(s => String(s.categoryId) === String(activeCategory));

  return (
    <>
      <style>{`
        .ps-hero {
          position: relative;
          height: 380px;
          display: flex;
          align-items: center;
          background: linear-gradient(135deg, #0f2419 0%, #1a3826 60%, #4f645b 100%);
          overflow: hidden;
        }
        .ps-hero-pattern {
          position: absolute;
          inset: 0;
          opacity: 0.04;
          background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0);
          background-size: 32px 32px;
        }
        .ps-hero-circle {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.04);
        }
        .ps-tabs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          margin-bottom: 40px;
          margin-top: 40px;
        }
        .ps-tabs::-webkit-scrollbar { height: 3px; }
        .ps-tabs::-webkit-scrollbar-thumb { background: var(--g-border-strong); border-radius: 999px; }
        .ps-tab {
          flex-shrink: 0;
          height: 40px;
          padding: 0 20px;
          border-radius: var(--g-radius-full);
          border: 1.5px solid var(--g-border);
          background: transparent;
          color: var(--g-text-secondary);
          font-family: var(--g-font-body);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s var(--g-ease);
        }
        .ps-tab:hover { border-color: var(--g-primary); color: var(--g-primary); background: var(--g-primary-muted); }
        .ps-tab.active { background: var(--g-primary); color: #fff; border-color: var(--g-primary); }

        .ps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        @media (max-width: 1023px) { .ps-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 639px)  { .ps-grid { grid-template-columns: 1fr; } }

        .ps-banner {
          background: linear-gradient(135deg, #0f2419, #1a3826);
          border-radius: var(--g-radius-xl);
          padding: 56px 48px;
          text-align: center;
          color: #fff;
          margin-top: 64px;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 639px) {
          .ps-hero { height: 240px; }
          .ps-banner { padding: 40px 24px; }
        }
      `}</style>

      {/* Hero */}
      <section className="ps-hero">
        <div className="ps-hero-pattern" />
        <div className="ps-hero-circle" style={{ width: 500, height: 500, top: -200, right: -100 }} />
        <div className="ps-hero-circle" style={{ width: 300, height: 300, bottom: -120, left: -80 }} />
        <PageContainer style={{ position: 'relative', zIndex: 2, width: '100%' }}>
          <div style={{ maxWidth: 600 }}>
            <div style={{ fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 16 }}>
              The Ethereal Hotel
            </div>
            <h1 style={{ fontFamily: 'var(--g-font-heading)', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 700, color: '#fff', margin: '0 0 16px', lineHeight: 1.1 }}>
              Dịch Vụ Tiêu Chuẩn 5★
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1rem', margin: 0, lineHeight: 1.7 }}>
              Từ spa thư giãn đến ẩm thực tinh tế — tất cả đều được thiết kế để mang lại trải nghiệm đẳng cấp nhất.
            </p>
          </div>
        </PageContainer>
      </section>

      <PageContainer>
        {/* Category tabs */}
        {categories.length > 0 && (
          <div className="ps-tabs">
            <button className={`ps-tab${activeCategory === 'all' ? ' active' : ''}`} onClick={() => setActiveCategory('all')}>
              Tất cả
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`ps-tab${activeCategory === String(cat.id) ? ' active' : ''}`}
                onClick={() => setActiveCategory(String(cat.id))}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Services grid */}
        <div style={{ marginTop: categories.length > 0 ? 0 : 48 }}>
          {loading ? (
            <div className="ps-grid">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="g-skeleton" style={{ height: 320, borderRadius: 'var(--g-radius-xl)' }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="✨" title="Không có dịch vụ" message="Chưa có dịch vụ nào trong danh mục này." />
          ) : (
            <div className="ps-grid">
              {filtered.map((svc, i) => <ServiceCard key={svc.id} service={svc} index={i} />)}
            </div>
          )}
        </div>

        {/* Why choose us */}
        <section style={{ marginTop: 80, marginBottom: 16 }}>
          <SectionTitle
            eyebrow="Tại sao chọn chúng tôi"
            title="Đẳng Cấp Trong Từng Dịch Vụ"
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginTop: 48 }}>
            {[
              { icon: '🏆', title: 'Tiêu chuẩn 5 sao', desc: 'Mọi dịch vụ đều đạt chuẩn quốc tế, được giám sát chặt chẽ.' },
              { icon: '👨‍🍳', title: 'Đội ngũ chuyên nghiệp', desc: 'Nhân viên được đào tạo bài bản, nhiệt tình và tận tâm.' },
              { icon: '🌿', title: 'Thân thiện môi trường', desc: 'Sử dụng sản phẩm tự nhiên, thân thiện với môi trường.' },
              { icon: '🔒', title: 'An toàn & Riêng tư', desc: 'Không gian riêng tư, an toàn tuyệt đối cho mọi khách hàng.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{
                background: 'var(--g-bg-card)',
                border: '1px solid var(--g-border)',
                borderRadius: 'var(--g-radius-lg)',
                padding: '28px 24px',
                textAlign: 'center',
                transition: 'box-shadow 0.25s',
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--g-shadow-md)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
              >
                <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
                <h3 style={{ fontFamily: 'var(--g-font-heading)', fontWeight: 700, color: 'var(--g-text)', margin: '0 0 8px', fontSize: '1rem' }}>{title}</h3>
                <p style={{ color: 'var(--g-text-muted)', fontSize: '0.85rem', lineHeight: 1.65, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="ps-banner">
          <div style={{ fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 16 }}>
            Đặt phòng để sử dụng đầy đủ
          </div>
          <h2 style={{ fontFamily: 'var(--g-font-heading)', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 700, color: '#fff', margin: '0 0 16px' }}>
            Trải Nghiệm Ngay Hôm Nay
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', margin: '0 0 32px', lineHeight: 1.7, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
            Đặt phòng tại The Ethereal để được sử dụng toàn bộ dịch vụ cao cấp. Khách đã check-in có thể đặt dịch vụ trực tiếp từ app.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/booking"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 32px', background: '#fff', color: 'var(--g-primary)',
                borderRadius: 'var(--g-radius-full)', fontWeight: 800,
                textDecoration: 'none', fontSize: '0.95rem',
              }}
            >
              🗓 Đặt phòng ngay
            </Link>
            <Link
              to="/login"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 28px', background: 'transparent',
                border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff',
                borderRadius: 'var(--g-radius-full)', fontWeight: 700,
                textDecoration: 'none', fontSize: '0.9rem',
              }}
            >
              Đăng nhập để đặt dịch vụ
            </Link>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
