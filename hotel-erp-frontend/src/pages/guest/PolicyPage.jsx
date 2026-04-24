import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer, SectionTitle } from '../../components/guest';

const POLICIES = [
  {
    id: 'checkin',
    icon: '🏨',
    title: 'Check-in / Check-out',
    items: [
      { label: 'Giờ check-in', value: 'Từ 14:00 (2:00 PM)' },
      { label: 'Giờ check-out', value: 'Trước 12:00 (12:00 PM)' },
      { label: 'Early check-in', value: 'Có thể sắp xếp (phụ thuộc tình trạng phòng, phụ phí áp dụng)' },
      { label: 'Late check-out', value: 'Đến 18:00 không phụ phí, sau 18:00 tính thêm 50% giá phòng' },
      { label: 'Giấy tờ yêu cầu', value: 'CMND/Hộ chiếu bản gốc còn hiệu lực' },
    ],
    notes: ['Vui lòng thông báo giờ đến dự kiến trước 24 giờ', 'Khách VIP có thể được ưu tiên early check-in miễn phí']
  },
  {
    id: 'cancellation',
    icon: '❌',
    title: 'Chính Sách Hủy Phòng',
    items: [
      { label: 'Hủy miễn phí', value: 'Trước 72 giờ so với giờ check-in (14:00)' },
      { label: 'Hủy trong 72h - 24h', value: 'Phí hủy 50% tổng giá trị đặt phòng' },
      { label: 'Hủy trong 24h hoặc không đến', value: 'Phí hủy 100% đêm đầu tiên' },
      { label: 'Không hoàn tiền', value: 'Giá phòng ngày lễ, Tết, sự kiện đặc biệt' },
    ],
    notes: ['Việc hoàn tiền sẽ được xử lý trong 5-7 ngày làm việc', 'Đặt phòng qua OTA (Booking.com, Agoda…) áp dụng chính sách của từng kênh']
  },
  {
    id: 'payment',
    icon: '💳',
    title: 'Chính Sách Thanh Toán',
    items: [
      { label: 'Đặt cọc', value: '20% tổng giá trị đặt phòng khi xác nhận' },
      { label: 'Thanh toán còn lại', value: 'Tại quầy lễ tân khi check-in hoặc check-out' },
      { label: 'Phương thức thanh toán', value: 'Tiền mặt VNĐ, Thẻ Visa/Master, Chuyển khoản, VNPay, ZaloPay' },
      { label: 'Hóa đơn VAT', value: 'Vui lòng yêu cầu trước khi check-out' },
    ],
    notes: ['Phòng có thể bị giữ trước với thẻ tín dụng để đảm bảo yêu cầu dịch vụ', 'Tỷ giá áp dụng tại thời điểm thanh toán cho khách nước ngoài']
  },
  {
    id: 'general',
    icon: '📜',
    title: 'Quy Định Chung',
    items: [
      { label: 'Thú cưng', value: 'Không được phép mang thú cưng vào khách sạn' },
      { label: 'Hút thuốc', value: 'Cấm hút thuốc trong phòng và toàn bộ khu vực trong nhà (phạt 500.000đ)' },
      { label: 'Tiếng ồn', value: 'Giữ yên tĩnh từ 22:00 — 07:00 (giờ nghỉ ngơi)' },
      { label: 'Khách thêm', value: 'Khách bên ngoài cần đăng ký tại lễ tân, không ở qua đêm' },
      { label: 'Tài sản hư hại', value: 'Khách bồi thường theo giá trị thực tế nếu làm hư hỏng tài sản' },
    ],
    notes: ['The Ethereal có quyền từ chối phục vụ nếu vi phạm nội quy', 'Trẻ em dưới 12 tuổi miễn phí (không cần thêm giường phụ, tối đa 1 trẻ/phòng)']
  },
  {
    id: 'pool',
    icon: '🏊',
    title: 'Quy Định Hồ Bơi & Tiện Ích',
    items: [
      { label: 'Giờ mở cửa hồ bơi', value: '06:00 — 22:00 hàng ngày' },
      { label: 'Giờ Spa & Gym', value: '06:00 — 22:00 (Spa cần đặt lịch trước)' },
      { label: 'Nhà hàng', value: 'Bữa sáng 06:30-10:00 | Trưa 11:30-14:30 | Tối 17:30-22:00' },
      { label: 'Trang phục', value: 'Mặc phù hợp khi sử dụng tiện ích chung (không mặc đồ bơi ra ngoài khu vực hồ)' },
    ],
    notes: ['Trẻ em dưới 12 tuổi phải có người lớn giám sát tại hồ bơi', 'Không mang đồ ăn/uống từ bên ngoài vào hồ bơi']
  },
];

function PolicySection({ policy }) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{
      border: '1.5px solid var(--g-border)',
      borderRadius: 'var(--g-radius-xl)',
      overflow: 'hidden',
      background: 'var(--g-bg-card)',
      boxShadow: 'var(--g-shadow-xs)',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '22px 28px', gap: 16,
          fontFamily: 'var(--g-font-body)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
          <span style={{ fontSize: 26 }}>{policy.icon}</span>
          <h2 style={{ fontFamily: 'var(--g-font-heading)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--g-text)', margin: 0 }}>
            {policy.title}
          </h2>
        </div>
        <span style={{
          fontSize: 22, color: 'var(--g-text-muted)', flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.25s var(--g-ease)',
        }}>⌄</span>
      </button>

      {open && (
        <div style={{ padding: '0 28px 24px', animation: 'g-fadeInUp 0.2s ease-out' }}>
          <div style={{ borderTop: '1px solid var(--g-border-light)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {policy.items.map(({ label, value }) => (
              <div key={label} style={{
                display: 'grid', gridTemplateColumns: '200px 1fr',
                gap: 12, padding: '12px 0',
                borderBottom: '1px solid var(--g-border-light)',
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--g-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: 2 }}>
                  {label}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--g-text-secondary)', lineHeight: 1.6 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
          {policy.notes && policy.notes.length > 0 && (
            <div style={{ marginTop: 16, background: 'var(--g-primary-muted)', borderRadius: 'var(--g-radius-md)', padding: '14px 18px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--g-primary)', marginBottom: 8 }}>
                📌 Lưu ý
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {policy.notes.map((note, i) => (
                  <li key={i} style={{ fontSize: '0.84rem', color: 'var(--g-primary)', lineHeight: 1.55 }}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PolicyPage() {
  return (
    <>
      <style>{`
        .policy-hero {
          position: relative;
          height: 300px;
          display: flex;
          align-items: center;
          background: linear-gradient(135deg, #0f2419 0%, #1a3826 100%);
          overflow: hidden;
        }
        .policy-hero-pattern {
          position: absolute; inset: 0;
          opacity: 0.05;
          background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0);
          background-size: 36px 36px;
        }
        @media (max-width: 639px) {
          .policy-hero { height: 200px; }
          .policy-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* Hero */}
      <section className="policy-hero">
        <div className="policy-hero-pattern" />
        <PageContainer style={{ position: 'relative', zIndex: 2, width: '100%' }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 14 }}>
            The Ethereal Hotel
          </div>
          <h1 style={{ fontFamily: 'var(--g-font-heading)', fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 700, color: '#fff', margin: '0 0 10px', lineHeight: 1.1 }}>
            Chính Sách Khách sạn
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            Quy định rõ ràng để cả bạn và chúng tôi có trải nghiệm tốt nhất.
          </p>
        </PageContainer>
      </section>

      <PageContainer className="g-section-lg">
        {/* Quick summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 56,
          padding: '28px 32px',
          background: 'var(--g-primary)',
          borderRadius: 'var(--g-radius-xl)',
          color: '#fff',
        }} className="policy-grid">
          {[
            { icon: '🕐', label: 'Check-in', value: 'Từ 14:00' },
            { icon: '🕛', label: 'Check-out', value: 'Trước 12:00' },
            { icon: '❌', label: 'Hủy miễn phí', value: 'Trước 72h' },
            { icon: '🚭', label: 'Hút thuốc', value: 'Cấm trong phòng' },
          ].map(({ icon, label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Policy sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {POLICIES.map(p => <PolicySection key={p.id} policy={p} />)}
        </div>

        {/* Contact */}
        <div style={{
          marginTop: 56, background: 'var(--g-surface-raised)',
          borderRadius: 'var(--g-radius-xl)', padding: '40px',
          display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ fontFamily: 'var(--g-font-heading)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--g-text)', margin: '0 0 8px' }}>
              Có câu hỏi về chính sách?
            </h2>
            <p style={{ color: 'var(--g-text-muted)', margin: 0, fontSize: '0.88rem', lineHeight: 1.6 }}>
              Đội ngũ lễ tân luôn sẵn sàng hỗ trợ bạn 24/7.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="tel:+84283822888" className="g-btn-primary" style={{ textDecoration: 'none', padding: '11px 24px', fontSize: '0.88rem' }}>
              📞 Gọi ngay
            </a>
            <Link to="/faq" className="g-btn-outline" style={{ padding: '11px 24px', fontSize: '0.88rem' }}>
              Xem FAQ
            </Link>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
