import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getGuestServiceCatalog } from "../../../api/guestServicesApi";
import { createGuestOrderService } from "../../../api/orderServicesApi";
import { getMyBookings } from "../../../api/bookingsApi";
import { PageContainer, SectionTitle, LoadingSpinner, EmptyState } from "../../../components/guest";
import { formatCurrency } from "../../../utils";

export default function GuestOrderServicePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialServiceId = parseInt(searchParams.get("serviceId"));
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const [categories, setCategories] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]); // Valid booking details
  const [selectedBookingDetailId, setSelectedBookingDetailId] = useState("");
  
  const [cart, setCart] = useState([]); // Array of { serviceId, service, quantity }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch catalog & Bookings in parallel
      const [catRes, bkRes] = await Promise.all([
        getGuestServiceCatalog(),
        getMyBookings()
      ]);
      
      const cats = catRes.data?.data || [];
      setCategories(cats);
      
      // Setup Initial Cart Item from Query Params
      if (initialServiceId) {
        let foundService = null;
        for (const c of cats) {
          const s = c.services?.find(x => x.id === initialServiceId);
          if (s) { foundService = s; break; }
        }
        if (foundService) {
          setCart([{ serviceId: foundService.id, service: foundService, quantity: 1 }]);
        }
      }

      // Filter to CheckedIn bookings
      const myBookings = bkRes.data?.data || bkRes.data || [];
      const checkedInBookings = myBookings.filter(
        b => b.status === "Checked_in" || b.status === "CheckedIn" || b.status === "Confirmed"
      ); // Accept Confirmed too in case they want to order before arrive (Backend might reject if strict, but UI should let them try if we want. Wait, usually services are for CheckedIn. Let's include Confirmed just to be safe, but label them).
      
      let details = [];
      checkedInBookings.forEach(b => {
        if (Array.isArray(b.bookingDetails)) {
          b.bookingDetails.forEach(d => {
            details.push({
              id: d.id,
              roomNumber: d.roomNumber,
              roomTypeName: d.roomTypeName,
              bookingCode: b.bookingCode,
              status: b.status
            });
          });
        }
      });
      
      setActiveBookings(details);
      if (details.length > 0) {
        setSelectedBookingDetailId(details[0].id.toString());
      }
      
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Lỗi tải dữ liệu. Vui lòng thử lại sau.");
      setLoading(false);
    }
  };

  const addToCart = (service) => {
    setCart(prev => {
      const existing = prev.find(item => item.serviceId === service.id);
      if (existing) {
        return prev.map(item => item.serviceId === service.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { serviceId: service.id, service, quantity: 1 }];
    });
  };

  const updateQuantity = (serviceId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.serviceId === serviceId) {
          const newQ = item.quantity + delta;
          return { ...item, quantity: newQ > 0 ? newQ : 0 };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.quantity * item.service.price, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBookingDetailId) {
      setError("Vui lòng chọn phòng (Booking) để đặt dịch vụ.");
      return;
    }
    if (cart.length === 0) {
      setError("Giỏ hàng của bạn đang trống.");
      return;
    }

    setSubmitting(true);
    setError("");
    
    try {
      await createGuestOrderService({
        bookingDetailId: parseInt(selectedBookingDetailId),
        note: "Đặt dịch vụ từ ứng dụng Khách Hàng",
        items: cart.map(c => ({ serviceId: c.serviceId, quantity: c.quantity }))
      });
      // Don't alert standard ugly alert, let's just navigate.
      navigate("/guest/my-orders?success=1");
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || err?.response?.data?.title || "Đặt dịch vụ thất bại.");
      window.scrollTo(0, 0);
    } finally {
      setSubmitting(false);
    }
  };

  const styles = `
    .so-layout {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 40px;
      margin-top: 24px;
    }
    @media (max-width: 1024px) {
      .so-layout {
        grid-template-columns: 1fr;
      }
    }

    .so-left {
      display: flex;
      flex-direction: column;
      gap: 40px;
    }

    .so-cat-title {
      font-family: var(--g-font-heading);
      font-size: 1.5rem;
      color: var(--g-text);
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--g-border-light);
    }

    .so-service-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: var(--g-bg-card);
      border: 1px solid var(--g-border-light);
      border-radius: 16px;
      margin-bottom: 16px;
      transition: all 0.2s;
    }
    .so-service-item:hover {
      box-shadow: 0 8px 24px rgba(0,0,0,0.06);
      border-color: var(--g-gold);
      transform: translateY(-2px);
    }
    .so-item-info {
      flex: 1;
    }
    .so-item-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--g-text);
      margin-bottom: 4px;
    }
    .so-item-price {
      font-family: var(--g-font-heading);
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--g-primary);
    }
    .so-btn-add {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--g-surface-raised);
      border: 1px solid var(--g-border);
      color: var(--g-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
       transition: all 0.2s;
    }
    .so-btn-add:hover {
      background: var(--g-primary);
      color: white;
      border-color: var(--g-primary);
    }

    .so-right {
      position: sticky;
      top: 100px;
      background: var(--g-bg-card);
      border: 1px solid var(--g-border);
      border-top: 4px solid var(--g-primary);
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 20px 40px rgba(15,23,42,0.08);
      height: fit-content;
    }
    .so-right-title {
      font-family: var(--g-font-heading);
      font-size: 1.4rem;
      margin-bottom: 24px;
      color: var(--g-text);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .so-control-group {
      margin-bottom: 24px;
    }
    .so-label {
      display: block;
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--g-text-secondary);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .so-select {
      width: 100%;
      padding: 14px 16px;
      border-radius: 12px;
      border: 1px solid var(--g-border);
      background: var(--g-surface-raised);
      color: var(--g-text);
      font-size: 1rem;
      font-family: var(--g-font-body);
      outline: none;
      transition: border-color 0.2s;
    }
    .so-select:focus {
      border-color: var(--g-primary);
      box-shadow: 0 0 0 4px var(--g-primary-muted);
    }

    .so-cart-list {
      display: grid;
      gap: 16px;
      margin-bottom: 24px;
      border-top: 1px solid var(--g-border-light);
      padding-top: 24px;
    }
    .so-cart-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .so-cart-item-name {
      font-weight: 600;
      color: var(--g-text);
      margin-bottom: 4px;
    }
    .so-cart-item-price {
      font-size: 0.9rem;
      color: var(--g-text-muted);
    }
    .so-qty-ctrl {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--g-surface-raised);
      padding: 4px;
      border-radius: 20px;
      border: 1px solid var(--g-border-light);
    }
    .so-qty-btn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: white;
      border: 1px solid var(--g-border-light);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-weight: bold;
      color: var(--g-text);
      transition: all 0.2s;
    }
    .so-qty-btn:hover {
      border-color: var(--g-primary);
      color: var(--g-primary);
    }
    .so-qty-val {
      font-weight: 700;
      min-width: 20px;
      text-align: center;
    }

    .so-total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 2px dashed var(--g-border-light);
      padding-top: 20px;
      margin-top: 10px;
    }
    .so-total-label {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--g-text-secondary);
    }
    .so-total-val {
      font-family: var(--g-font-heading);
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--g-primary);
    }

    .so-btn-submit {
      width: 100%;
      padding: 16px;
      font-size: 1.1rem;
      border-radius: 12px;
      margin-top: 30px;
      background: var(--g-primary);
      color: white;
      font-weight: 700;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.2s;
    }
    .so-btn-submit:hover:not(:disabled) {
      background: var(--g-primary-hover);
      box-shadow: 0 8px 24px rgba(26,56,38,0.2);
    }
    .so-btn-submit:disabled {
      background: var(--g-border);
      color: var(--g-text-muted);
      cursor: not-allowed;
      box-shadow: none;
    }
  `;

  if (loading) {
    return <PageContainer><LoadingSpinner text="Đang chuẩn bị menu dịch vụ..." /></PageContainer>;
  }

  return (
    <PageContainer className="g-section-lg">
      <style>{styles}</style>
      
      <SectionTitle 
        eyebrow="Tạo Mới"
        title="Đặt Dịch Vụ" 
        subtitle="Chọn các dịch vụ cao cấp và chúng tôi sẽ phục vụ tận phòng của bạn."
        align="left" 
      />
      
      {error && (
        <div style={{ background: "var(--g-error-bg)", border: "1px solid var(--g-error-border)", color: "var(--g-error)", padding: '16px 20px', borderRadius: 12, marginBottom: 24, fontWeight: 600 }}>
          {error}
        </div>
      )}

      {activeBookings.length === 0 ? (
        <EmptyState 
          icon={<span className="material-symbols-outlined" style={{fontSize: 64, color: "var(--g-gold)"}}>hotel</span>}
          title="Không tìm thấy phòng phù hợp" 
          message="Bạn cần có một phòng đang lưu trú (Đã Check-in) để có thể gọi dịch vụ. Nếu bạn nghĩ đây là lỗi, vui lòng liên hệ lễ tân." 
          action={<button className="g-btn-primary" onClick={() => navigate("/")}>Về trang chủ</button>}
        />
      ) : (
        <div className="so-layout">
          {/* CATALOG */}
          <div className="so-left">
            {categories.map(cat => {
              if (!cat.services?.length) return null;
              return (
                <div key={cat.id}>
                  <h3 className="so-cat-title">{cat.name}</h3>
                  <div>
                    {cat.services.map(srv => (
                      <div key={srv.id} className="so-service-item">
                        <div className="so-item-info">
                          <div className="so-item-name">{srv.name}</div>
                          <div className="so-item-price">
                            {formatCurrency(srv.price)} 
                            {srv.unit && <span style={{fontSize: '0.85rem', color: 'var(--g-text-muted)', fontWeight: 500}}>/{srv.unit}</span>}
                          </div>
                        </div>
                        <button className="so-btn-add" onClick={() => addToCart(srv)} title="Thêm vào giỏ">
                          <span className="material-symbols-outlined">add</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* CART */}
          <div>
            <div className="so-right">
              <h3 className="so-right-title">
                <span className="material-symbols-outlined" style={{ color: 'var(--g-gold)' }}>shopping_cart_checkout</span>
                Đơn Gọi Dịch Vụ
              </h3>
              
              <div className="so-control-group">
                <label className="so-label">Chọn Phòng (Booking)</label>
                <select 
                  className="so-select"
                  value={selectedBookingDetailId}
                  onChange={(e) => setSelectedBookingDetailId(e.target.value)}
                >
                  <option value="" disabled>-- Vui lòng chọn --</option>
                  {activeBookings.map(d => (
                    <option key={d.id} value={d.id}>
                      [{d.bookingCode}] {d.roomTypeName} {d.roomNumber ? `- P.${d.roomNumber}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="so-cart-list">
                {cart.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--g-text-muted)", padding: "20px 0" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.2, marginBottom: 12, display: 'block' }}>room_service</span>
                    Giỏ hàng của bạn đang trống.<br/>Hãy thêm vài dịch vụ ở danh sách bên trái.
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.serviceId} className="so-cart-item">
                      <div>
                        <div className="so-cart-item-name">{item.service.name}</div>
                        <div className="so-cart-item-price">{formatCurrency(item.service.price)}</div>
                      </div>
                      <div className="so-qty-ctrl">
                        <button type="button" className="so-qty-btn" onClick={() => updateQuantity(item.serviceId, -1)}>−</button>
                        <span className="so-qty-val">{item.quantity}</span>
                        <button type="button" className="so-qty-btn" onClick={() => updateQuantity(item.serviceId, 1)}>+</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="so-total-row">
                <span className="so-total-label">Tổng cộng:</span>
                <span className="so-total-val">{formatCurrency(totalAmount)}</span>
              </div>

              <button 
                className="so-btn-submit" 
                disabled={cart.length === 0 || !selectedBookingDetailId || submitting}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <><LoadingSpinner size={20} color="white" /> Đang xử lý...</>
                ) : (
                  <><span className="material-symbols-outlined">send</span> Gửi Yêu Cầu</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
