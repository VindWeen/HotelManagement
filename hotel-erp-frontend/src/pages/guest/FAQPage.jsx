import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../../components/guest';

const FAQ_DATA = [
  {
    category: 'Đặt phòng',
    icon: '🗓',
    items: [
      {
        q: 'Tôi có thể đặt phòng theo cách nào?',
        a: 'Bạn có thể đặt phòng trực tuyến qua website này, gọi điện thoại trực tiếp tới số +84 28 3822 8888, hoặc gửi email đến hello@theethereal.vn. Đặt phòng online nhanh chóng nhất và bạn có thể chọn ngày, hạng phòng ngay lập tức.',
      },
      {
        q: 'Tôi cần đặt cọc bao nhiêu để xác nhận phòng?',
        a: 'Để xác nhận đặt phòng, bạn cần thanh toán đặt cọc 20% tổng giá trị đặt phòng. Phần còn lại thanh toán tại lễ tân khi check-in hoặc check-out tùy theo gói bạn chọn.',
      },
      {
        q: 'Tôi có thể đặt phòng cho người khác không?',
        a: 'Có, bạn hoàn toàn có thể đặt phòng cho người thân hoặc bạn bè. Vui lòng nhập đầy đủ thông tin của người sẽ check-in vào form đặt phòng.',
      },
      {
        q: 'Có ưu đãi nào cho đặt phòng sớm không?',
        a: 'Có! Khách đặt phòng trước 30 ngày có thể nhận ưu đãi Early Bird giảm đến 20%. Ngoài ra, thành viên Loyalty Club luôn được hưởng giá ưu tiên và nhiều quyền lợi đặc biệt.',
      },
    ],
  },
  {
    category: 'Check-in & Check-out',
    icon: '🏨',
    items: [
      {
        q: 'Giờ check-in và check-out là mấy giờ?',
        a: 'Check-in từ 14:00 (2:00 PM). Check-out trước 12:00 (12:00 PM). Nếu bạn có chuyến bay sớm hoặc muốn early check-in, vui lòng liên hệ trước để chúng tôi sắp xếp.',
      },
      {
        q: 'Tôi có thể gửi hành lý nếu đến sớm hơn giờ check-in không?',
        a: 'Hoàn toàn có thể! Dịch vụ gửi hành lý miễn phí từ 6:00 sáng. Bạn có thể khám phá khách sạn và khu vực lân cận trong khi chờ check-in.',
      },
      {
        q: 'Tôi cần mang những giấy tờ gì khi check-in?',
        a: 'Vui lòng mang theo CMND hoặc Hộ chiếu bản gốc còn hiệu lực. Đối với khách nước ngoài, hộ chiếu là bắt buộc. Thẻ tín dụng có thể được yêu cầu để đảm bảo cho các chi phí phát sinh.',
      },
    ],
  },
  {
    category: 'Hủy & Thay đổi',
    icon: '🔄',
    items: [
      {
        q: 'Tôi có thể hủy phòng miễn phí không?',
        a: 'Có, bạn có thể hủy miễn phí nếu hủy trước 72 giờ so với giờ check-in (14:00). Hủy trong vòng 72 giờ sẽ bị tính phí 50%, trong 24 giờ sẽ tính 100% đêm đầu tiên.',
      },
      {
        q: 'Tôi có thể thay đổi ngày đặt phòng không?',
        a: 'Có thể thay đổi ngày tùy theo tình trạng phòng. Vui lòng liên hệ với chúng tôi ít nhất 48 giờ trước ngày check-in dự kiến. Sự thay đổi không mất phí nếu phòng còn trống.',
      },
      {
        q: 'Tiền hoàn trả sẽ được xử lý trong bao lâu?',
        a: 'Tiền hoàn trả sẽ được xử lý trong vòng 5-7 ngày làm việc, tùy thuộc vào phương thức thanh toán ban đầu của bạn. Chuyển khoản ngân hàng thường nhanh hơn thẻ tín dụng.',
      },
    ],
  },
  {
    category: 'Dịch vụ & Tiện ích',
    icon: '✨',
    items: [
      {
        q: 'Khách sạn có dịch vụ đưa đón sân bay không?',
        a: 'Có, chúng tôi cung cấp dịch vụ đưa đón sân bay 24/7 với xe cao cấp. Vui lòng đặt trước ít nhất 4 giờ. Chi phí sẽ thay đổi theo tuyến đường, liên hệ lễ tân để biết giá cụ thể.',
      },
      {
        q: 'Bữa sáng có bao gồm trong giá phòng không?',
        a: 'Một số gói phòng bao gồm bữa sáng buffet. Bạn có thể kiểm tra trong thông tin gói phòng khi đặt. Nếu không bao gồm, bữa sáng tại nhà hàng The Ethereal sẽ có phụ phí.',
      },
      {
        q: 'Wifi có miễn phí không?',
        a: 'Có! Wifi tốc độ cao miễn phí toàn bộ khu vực khách sạn bao gồm phòng, sảnh, hồ bơi và nhà hàng. Mật khẩu Wifi sẽ được cung cấp tại lễ tân khi check-in.',
      },
      {
        q: 'Hồ bơi mở cửa lúc mấy giờ?',
        a: 'Hồ bơi vô cực view núi mở cửa từ 06:00 đến 22:00 hàng ngày. Khăn tắm được cung cấp miễn phí. Trẻ em dưới 12 tuổi phải có người lớn giám sát.',
      },
    ],
  },
  {
    category: 'Thanh Toán',
    icon: '💳',
    items: [
      {
        q: 'Khách sạn chấp nhận những phương thức thanh toán nào?',
        a: 'Chúng tôi chấp nhận: Tiền mặt VNĐ, Thẻ Visa/Mastercard, Thẻ JCB, Chuyển khoản ngân hàng, VNPay, ZaloPay và Momo. Một số phương thức có thể áp dụng phí giao dịch nhỏ.',
      },
      {
        q: 'Tôi có thể yêu cầu hóa đơn VAT không?',
        a: 'Có, vui lòng yêu cầu hóa đơn VAT trước khi check-out. Hãy chuẩn bị đầy đủ thông tin công ty (MST, tên, địa chỉ) để xuất hóa đơn. Hóa đơn điện tử sẽ được gửi qua email trong 3 ngày làm việc.',
      },
    ],
  },
];

function FAQItem({ item, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{
      border: '1px solid var(--g-border)',
      borderRadius: 'var(--g-radius-lg)',
      background: 'var(--g-bg-card)',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s var(--g-ease)',
      boxShadow: open ? 'var(--g-shadow-md)' : 'none',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: open ? 'var(--g-primary-muted)' : 'transparent',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', gap: 12, textAlign: 'left',
          fontFamily: 'var(--g-font-body)', transition: 'background 0.2s',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: open ? 'var(--g-primary)' : 'var(--g-text)', lineHeight: 1.45 }}>
          {item.q}
        </span>
        <span style={{
          flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
          background: open ? 'var(--g-primary)' : 'var(--g-surface-raised)',
          color: open ? '#fff' : 'var(--g-text-muted)',
          display: 'grid', placeItems: 'center', fontSize: 16,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'all 0.25s var(--g-ease)',
        }}>
          ⌄
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 22px 20px', animation: 'g-fadeInUp 0.2s ease-out' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--g-text-secondary)', lineHeight: 1.75 }}>
            {item.a}
          </p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return FAQ_DATA.map(cat => ({
      ...cat,
      items: cat.items.filter(item =>
        !q || item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
      ),
    })).filter(cat =>
      (activeCategory === 'all' || cat.category === activeCategory) && cat.items.length > 0
    );
  }, [search, activeCategory]);

  const totalResults = filtered.reduce((sum, cat) => sum + cat.items.length, 0);

  return (
    <>
      <style>{`
        .faq-hero {
          position: relative;
          min-height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f2419 0%, #1a3826 100%);
          padding: 60px 20px 80px;
          overflow: hidden;
          text-align: center;
        }
        .faq-hero-pattern {
          position: absolute; inset: 0;
          opacity: 0.04;
          background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0);
          background-size: 36px 36px;
        }
        .faq-search {
          position: relative;
          max-width: 560px;
          width: 100%;
          margin: 0 auto;
        }
        .faq-search-icon {
          position: absolute;
          left: 16px; top: 50%;
          transform: translateY(-50%);
          font-size: 18px;
          pointer-events: none;
        }
        .faq-search-input {
          width: 100%;
          height: 52px;
          padding: 0 20px 0 48px;
          border: 1px solid var(--g-border);
          border-radius: var(--g-radius-full);
          font-family: var(--g-font-body);
          font-size: 0.95rem;
          color: var(--g-text);
          background: var(--g-surface);
          outline: none;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          box-sizing: border-box;
        }
        .faq-cat-tabs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 2px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .faq-cat-tab {
          height: 38px;
          padding: 0 18px;
          border-radius: var(--g-radius-full);
          border: 1.5px solid var(--g-border);
          background: transparent;
          font-family: var(--g-font-body);
          font-size: 0.84rem;
          font-weight: 600;
          color: var(--g-text-secondary);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .faq-cat-tab:hover { border-color: var(--g-primary); color: var(--g-primary); background: var(--g-primary-muted); }
        .faq-cat-tab.active { background: var(--g-primary); color: #fff; border-color: var(--g-primary); }
        @media (max-width: 639px) {
          .faq-hero { min-height: 220px; padding: 40px 16px 60px; }
        }
      `}</style>

      {/* Hero + Search */}
      <section className="faq-hero">
        <div className="faq-hero-pattern" />
        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 700 }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 14 }}>
            The Ethereal Hotel
          </div>
          <h1 style={{ fontFamily: 'var(--g-font-heading)', fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 700, color: '#fff', margin: '0 0 24px', lineHeight: 1.1 }}>
            Câu Hỏi Thường Gặp
          </h1>
          <div className="faq-search">
            <span className="faq-search-icon">🔍</span>
            <input
              type="text"
              className="faq-search-input"
              placeholder="Tìm kiếm câu hỏi..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="faq-search"
            />
          </div>
        </div>
      </section>

      <PageContainer className="g-section-lg">
        {/* Category tabs */}
        <div className="faq-cat-tabs" style={{ marginBottom: 48 }}>
          <button className={`faq-cat-tab${activeCategory === 'all' ? ' active' : ''}`} onClick={() => setActiveCategory('all')}>
            📋 Tất cả
          </button>
          {FAQ_DATA.map(cat => (
            <button
              key={cat.category}
              className={`faq-cat-tab${activeCategory === cat.category ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat.category)}
            >
              {cat.icon} {cat.category}
            </button>
          ))}
        </div>

        {/* Results info */}
        {search && (
          <p style={{ color: 'var(--g-text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
            Tìm thấy <strong>{totalResults}</strong> kết quả cho "{search}"
          </p>
        )}

        {/* FAQ sections */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--g-text-faint)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--g-text-secondary)' }}>Không tìm thấy kết quả</div>
            <p style={{ marginTop: 8 }}>Hãy thử từ khóa khác hoặc <button onClick={() => setSearch('')} style={{ color: 'var(--g-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: 'inherit' }}>xoá bộ lọc</button></p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {filtered.map(cat => (
              <section key={cat.category}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <span style={{ fontSize: 24 }}>{cat.icon}</span>
                  <h2 style={{ fontFamily: 'var(--g-font-heading)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--g-text)', margin: 0 }}>
                    {cat.category}
                  </h2>
                  <div style={{ flex: 1, height: 1, background: 'var(--g-border)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cat.items.map((item, i) => (
                    <FAQItem key={i} item={item} defaultOpen={i === 0 && filtered.length === 1 && cat.items.length === 1} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Still needs help */}
        <div style={{
          marginTop: 64,
          background: 'linear-gradient(135deg, #0f2419, #1a3826)',
          borderRadius: 'var(--g-radius-xl)',
          padding: '48px 40px',
          textAlign: 'center',
          color: '#fff',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💬</div>
          <h2 style={{ fontFamily: 'var(--g-font-heading)', fontWeight: 700, fontSize: '1.5rem', color: '#fff', margin: '0 0 12px' }}>
            Không tìm thấy câu trả lời?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', margin: '0 0 28px', lineHeight: 1.7, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
            Đội ngũ chăm sóc khách hàng của chúng tôi sẵn sàng hỗ trợ bạn 24/7 qua điện thoại, email hoặc chat trực tiếp.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="tel:+84283822888" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: '#fff', color: 'var(--g-primary)', borderRadius: 'var(--g-radius-full)', fontWeight: 800, textDecoration: 'none', fontSize: '0.9rem' }}>
              📞 Gọi ngay
            </a>
            <a href="mailto:hello@theethereal.vn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 'var(--g-radius-full)', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
              ✉️ Gửi email
            </a>
            <Link to="/policy" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 'var(--g-radius-full)', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
              📜 Xem chính sách
            </Link>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
