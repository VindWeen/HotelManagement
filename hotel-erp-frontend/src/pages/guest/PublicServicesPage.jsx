import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getGuestServiceCatalog } from '../../api/guestServicesApi';
import { PageContainer, SectionTitle, LoadingSpinner, EmptyState } from '../../components/guest';
import { getFullImageUrl } from '../../utils/imageUtils';

const VND = (n) =>
  n ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n) : null;

export const getServiceIcon = (name) => {
  if (!name) return 'room_service';
  const lowerName = name.toLowerCase();
  if (lowerName.includes('spa') || lowerName.includes('massage') || lowerName.includes('thư giãn') || lowerName.includes('yoga')) return 'spa';
  if (lowerName.includes('ăn') || lowerName.includes('uống') || lowerName.includes('nhà hàng') || lowerName.includes('food') || lowerName.includes('coffee') || lowerName.includes('buffet') || lowerName.includes('bar')) return 'restaurant';
  if (lowerName.includes('xe') || lowerName.includes('đưa đón') || lowerName.includes('transport') || lowerName.includes('đón')) return 'directions_car';
  if (lowerName.includes('giặt') || lowerName.includes('laundry') || lowerName.includes('ủi')) return 'local_laundry_service';
  if (lowerName.includes('máy tính') || lowerName.includes('văn phòng') || lowerName.includes('họp')) return 'computer';
  if (lowerName.includes('wifi') || lowerName.includes('internet')) return 'wifi';
  if (lowerName.includes('phòng') || lowerName.includes('dọn')) return 'cleaning_services';
  if (lowerName.includes('tour') || lowerName.includes('hướng dẫn')) return 'tour';
  if (lowerName.includes('gym') || lowerName.includes('fitness')) return 'fitness_center';
  if (lowerName.includes('chụp') || lowerName.includes('ảnh') || lowerName.includes('photo')) return 'photo_camera';
  if (lowerName.includes('nhạc') || lowerName.includes('giải trí')) return 'music_note';
  if (lowerName.includes('bơi') || lowerName.includes('pool')) return 'pool';
  if (lowerName.includes('vip')) return 'workspace_premium';
  if (lowerName.includes('xông hơi') || lowerName.includes('thảo dược')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 -960 960 960" width="1em" fill="currentColor">
        <path d="M720-200q-17 0-28.5-11.5T680-240q0-17 11.5-28.5T720-280q17 0 28.5 11.5T760-240q0 17-11.5 28.5T720-200ZM280-80q-17 0-28.5-11.5T240-120q0-17 11.5-28.5T280-160q17 0 28.5 11.5T320-120q0 17-11.5 28.5T280-80Zm-40-120q-17 0-28.5-11.5T200-240q0-17 11.5-28.5T240-280h360q17 0 28.5 11.5T640-240q0 17-11.5 28.5T600-200H240ZM400-80q-17 0-28.5-11.5T360-120q0-17 11.5-28.5T400-160h280q17 0 28.5 11.5T720-120q0 17-11.5 28.5T680-80H400ZM300-320q-91 0-155.5-64.5T80-540q0-83 55-145t136-73q32-57 87.5-89.5T480-880q90 0 156.5 57.5T717-679q69 6 116 57t47 122q0 75-52.5 127.5T700-320H300Zm0-80h400q42 0 71-29t29-71q0-42-29-71t-71-29h-60v-40q0-66-47-113t-113-47q-48 0-87.5 26T333-704l-10 24h-25q-57 2-97.5 42.5T160-540q0 58 41 99t99 41Zm180-200Z"/>
      </svg>
    );
  }
  if (lowerName.includes('móc khóa') || lowerName.includes('kỉ niệm')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 -960 960 960" width="1em" fill="currentColor">
        <path d="M223.5-423.5Q200-447 200-480t23.5-56.5Q247-560 280-560t56.5 23.5Q360-513 360-480t-23.5 56.5Q313-400 280-400t-56.5-23.5ZM280-240q-100 0-170-70T40-480q0-100 70-170t170-70q67 0 121.5 33t86.5 87h352l120 120-180 180-80-60-80 60-85-60h-47q-32 54-86.5 87T280-240Zm0-80q56 0 98.5-34t56.5-86h125l58 41 82-61 71 55 75-75-40-40H435q-14-52-56.5-86T280-640q-66 0-113 47t-47 113q0 66 47 113t113 47Z"/>
      </svg>
    );
  }
  return 'room_service';
};

function ServiceCard({ service }) {
  const iconName = getServiceIcon(service.name);
  const price = VND(service.price);

  return (
    <div style={{
      background: 'var(--g-bg-card)',
      borderRadius: '24px',
      border: '1px solid var(--g-border)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      cursor: 'pointer',
    }}
      onMouseEnter={e => { 
        e.currentTarget.style.transform = 'translateY(-8px)'; 
        e.currentTarget.style.boxShadow = 'var(--g-shadow-lg)'; 
        e.currentTarget.style.borderColor = 'var(--g-primary)';
      }}
      onMouseLeave={e => { 
        e.currentTarget.style.transform = 'translateY(0)'; 
        e.currentTarget.style.boxShadow = 'var(--g-shadow-sm)'; 
        e.currentTarget.style.borderColor = 'var(--g-border)';
      }}
    >
      {/* Image or icon */}
      <div style={{ 
        position: 'relative', 
        height: 220, 
        overflow: 'hidden', 
        flexShrink: 0, 
        background: 'linear-gradient(135deg, #1a3826 0%, #2d5540 100%)' 
      }}>
        {service.imageUrl ? (
          <img
            src={getFullImageUrl(service.imageUrl)}
            alt={service.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            {typeof iconName === 'string' ? (
              <span className="material-symbols-outlined" style={{ fontSize: 72, opacity: 0.9 }}>{iconName}</span>
            ) : (
              <div style={{ fontSize: 72, opacity: 0.9, display: 'flex' }}>{iconName}</div>
            )}
          </div>
        )}
        
        {/* Gradient overlay to make text pop */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '60%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
          pointerEvents: 'none'
        }} />

        {price && (
          <div style={{
            position: 'absolute', bottom: 16, right: 16,
            background: 'var(--g-bg-card)', backdropFilter: 'blur(8px)',
            borderRadius: '12px', padding: '6px 14px',
            fontWeight: 800, fontSize: '0.9rem', color: 'var(--g-primary)',
            boxShadow: 'var(--g-shadow-md)'
          }}>
            {price}
          </div>
        )}
      </div>
      {/* Body */}
      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'var(--g-primary-muted)',
            color: 'var(--g-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
             {typeof iconName === 'string' ? (
               <span className="material-symbols-outlined" style={{ fontSize: 24 }}>{iconName}</span>
             ) : (
               <div style={{ fontSize: 24, display: 'flex' }}>{iconName}</div>
             )}
          </div>
          <h3 style={{ fontFamily: 'var(--g-font-heading)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--g-text)', margin: 0, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {service.name}
          </h3>
        </div>
        
        {service.description && (
          <p style={{ fontSize: '0.9rem', color: 'var(--g-text-secondary)', lineHeight: 1.6, margin: 0, flex: 1 }}>
            {service.description.length > 110 ? service.description.slice(0, 110) + '...' : service.description}
          </p>
        )}
        <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid var(--g-border)' }}>
          <Link
            to="/login"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: '0.95rem', color: 'var(--g-primary)', fontWeight: 700,
              textDecoration: 'none', padding: '4px 0',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--g-primary-hover)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--g-primary)'}
          >
            <span>Khám phá ngay</span>
            <span className="material-symbols-outlined" style={{ fontSize: 20, transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
            >arrow_forward</span>
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
        const catalog = Array.isArray(res.data) ? res.data : res.data?.data || [];
        if (catalog.length > 0 && catalog[0]?.services !== undefined) {
          setCategories(catalog.map(c => ({ id: c.id, name: c.name })));
          const allServices = catalog.flatMap(c =>
            (c.services || []).map(s => ({ ...s, categoryId: c.id }))
          );
          setServices(allServices);
        } else {
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
          height: 420px;
          display: flex;
          align-items: center;
          background: linear-gradient(135deg, #0f2419 0%, #1a3826 60%, #4f645b 100%);
          overflow: hidden;
        }
        .ps-hero-pattern {
          position: absolute;
          inset: 0;
          opacity: 0.1;
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
          gap: 12px;
          overflow-x: auto;
          padding-top: 4px;
          padding-bottom: 12px;
          margin-bottom: 40px;
          margin-top: 20px;
          position: relative;
          z-index: 10;
        }
        .ps-tabs::-webkit-scrollbar { height: 4px; }
        .ps-tabs::-webkit-scrollbar-thumb { background: var(--g-primary-muted); border-radius: 999px; }
        .ps-tab {
          flex-shrink: 0;
          height: 48px;
          padding: 0 24px;
          border-radius: 999px;
          border: 1.5px solid var(--g-border);
          background: transparent;
          box-shadow: 0 4px 15px rgba(0,0,0,0.02);
          color: var(--g-text-secondary);
          font-family: var(--g-font-body);
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ps-tab:hover { 
          border-color: var(--g-primary);
          color: var(--g-primary); 
          background: var(--g-primary-muted);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px var(--g-primary-subtle);
        }
        .ps-tab.active { 
          background: var(--g-primary); 
          color: #fff; 
          border-color: var(--g-primary);
          box-shadow: 0 8px 20px var(--g-primary-subtle);
        }

        .ps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
        }
        @media (max-width: 1023px) { .ps-grid { grid-template-columns: repeat(2, 1fr); gap: 24px; } }
        @media (max-width: 639px)  { .ps-grid { grid-template-columns: 1fr; gap: 20px; } }

        .ps-banner {
          background: linear-gradient(135deg, #0f2419, #1a3826);
          border-radius: 32px;
          padding: 64px 48px;
          text-align: center;
          color: #fff;
          margin-top: 80px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.2);
        }
        .ps-banner::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: url('data:image/svg+xml;utf8,<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="1" fill="rgba(255,255,255,0.1)"/></svg>');
        }
        @media (max-width: 639px) {
          .ps-hero { height: 320px; }
          .ps-banner { padding: 48px 24px; border-radius: 24px; }
        }
      `}</style>

      {/* Hero */}
      <section className="ps-hero">
        <div className="ps-hero-pattern" />
        <div className="ps-hero-circle" style={{ width: 600, height: 600, top: -250, right: -150 }} />
        <div className="ps-hero-circle" style={{ width: 400, height: 400, bottom: -150, left: -100 }} />
        <PageContainer style={{ position: 'relative', zIndex: 2, width: '100%', paddingBottom: 40 }}>
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ 
              display: 'inline-block',
              padding: '6px 16px',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '999px',
              fontSize: '0.75rem', 
              letterSpacing: '0.2em', 
              textTransform: 'uppercase', 
              color: '#fff', 
              marginBottom: 24,
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              The Ethereal Experience
            </div>
            <h1 style={{ fontFamily: 'var(--g-font-heading)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, color: '#fff', margin: '0 0 20px', lineHeight: 1.1 }}>
              Dịch Vụ Tiêu Chuẩn 5★
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', margin: 0, lineHeight: 1.7, fontWeight: 400 }}>
              Từ spa thư giãn đến ẩm thực tinh tế — tất cả đều được thiết kế tỉ mỉ để mang lại trải nghiệm đẳng cấp và hoàn hảo nhất cho kỳ nghỉ của bạn.
            </p>
          </div>
        </PageContainer>
      </section>

      <PageContainer>
        {/* Category tabs */}
        {categories.length > 0 && (
          <div className="ps-tabs">
            <button className={`ps-tab${activeCategory === 'all' ? ' active' : ''}`} onClick={() => setActiveCategory('all')}>
              Tất cả dịch vụ
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
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="g-skeleton" style={{ height: 380, borderRadius: '24px' }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="✨" title="Không có dịch vụ" message="Chưa có dịch vụ nào trong danh mục này. Vui lòng quay lại sau." />
          ) : (
            <div className="ps-grid">
              {filtered.map((svc) => <ServiceCard key={svc.id} service={svc} />)}
            </div>
          )}
        </div>

        {/* Why choose us */}
        <section style={{ marginTop: 100, marginBottom: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontFamily: 'var(--g-font-heading)', fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: 800, color: 'var(--g-text)', margin: '0 0 16px' }}>
              Đẳng Cấp Trong Từng Trải Nghiệm
            </h2>
            <p style={{ color: 'var(--g-text-secondary)', fontSize: '1.1rem', maxWidth: 600, margin: '0 auto' }}>
              Chúng tôi cam kết mang lại những dịch vụ với chất lượng vượt trội, đáp ứng mọi nhu cầu khắt khe nhất của bạn.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 32 }}>
            {[
              { icon: 'workspace_premium', title: 'Tiêu chuẩn 5 sao', desc: 'Mọi dịch vụ đều đạt chuẩn quốc tế, được giám sát và kiểm định chất lượng nghiêm ngặt.' },
              { icon: 'groups', title: 'Đội ngũ chuyên nghiệp', desc: 'Nhân viên được đào tạo bài bản, phục vụ tận tình, chu đáo 24/7.' },
              { icon: 'eco', title: 'Thân thiện môi trường', desc: 'Ưu tiên sử dụng sản phẩm tự nhiên, hữu cơ, bảo vệ sức khỏe và môi trường.' },
              { icon: 'shield_lock', title: 'An toàn & Riêng tư', desc: 'Không gian riêng tư tuyệt đối, đảm bảo an toàn tối đa cho mọi khách hàng.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{
                background: 'var(--g-bg-card)',
                border: '1px solid var(--g-border)',
                borderRadius: '24px',
                padding: '40px 32px',
                textAlign: 'center',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px -10px var(--g-primary-subtle)';
                  e.currentTarget.style.borderColor = 'var(--g-primary-subtle)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.02)';
                  e.currentTarget.style.borderColor = 'var(--g-border)';
                }}
              >
                <div style={{ 
                  width: 72, height: 72, borderRadius: '20px', 
                  background: 'var(--g-primary-muted)', 
                  color: 'var(--g-primary)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 24px'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 36 }}>{icon}</span>
                </div>
                <h3 style={{ fontFamily: 'var(--g-font-heading)', fontWeight: 800, color: 'var(--g-text)', margin: '0 0 12px', fontSize: '1.2rem' }}>{title}</h3>
                <p style={{ color: 'var(--g-text-secondary)', fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="ps-banner">
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ 
              display: 'inline-block',
              padding: '6px 16px',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '999px',
              fontSize: '0.75rem', 
              letterSpacing: '0.2em', 
              textTransform: 'uppercase', 
              color: '#fff', 
              marginBottom: 24,
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              Đặc quyền hội viên
            </div>
            <h2 style={{ fontFamily: 'var(--g-font-heading)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: '#fff', margin: '0 0 20px' }}>
              Trải Nghiệm Trọn Vẹn
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.9)', margin: '0 auto 40px', lineHeight: 1.8, maxWidth: 600, fontSize: '1.1rem' }}>
              Đặt phòng tại The Ethereal để mở khóa toàn bộ dịch vụ cao cấp. Khách đã nhận phòng có thể đặt lịch và sử dụng dịch vụ trực tiếp qua ứng dụng.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                to="/booking"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '16px 40px', background: 'var(--g-gold)', color: 'var(--g-text-inverse)',
                  borderRadius: '999px', fontWeight: 800,
                  textDecoration: 'none', fontSize: '1.05rem',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.background = 'var(--g-gold-hover)';
                  e.currentTarget.style.boxShadow = '0 15px 35px -5px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = 'var(--g-gold)';
                  e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.15)';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>calendar_month</span>
                Đặt phòng ngay
              </Link>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '16px 36px', background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.3)', color: 'var(--g-text-inverse)',
                  borderRadius: '999px', fontWeight: 700,
                  textDecoration: 'none', fontSize: '1rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
              >
                Đăng nhập
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>login</span>
              </Link>
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
