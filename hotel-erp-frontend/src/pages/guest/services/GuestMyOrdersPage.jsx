import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyGuestOrders } from "../../../api/orderServicesApi";
import { PageContainer, SectionTitle, LoadingSpinner, EmptyState } from "../../../components/guest";
import { formatCurrency, formatDateTime } from "../../../utils";

export default function GuestMyOrdersPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [totalIncurred, setTotalIncurred] = useState(0);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await getMyGuestOrders();
      setOrders(res.data?.data || []);
      setTotalIncurred(res.data?.totalIncurred || 0);
    } catch (err) {
      console.error(err);
      setError("Không thể tải danh sách đơn dịch vụ.");
    } finally {
      setLoading(false);
    }
  };

  const styles = `
    .mo-summary {
      background: linear-gradient(135deg, var(--g-primary), var(--g-primary-hover));
      padding: 40px;
      border-radius: 20px;
      margin-bottom: 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: white;
      box-shadow: 0 20px 40px rgba(26,56,38,0.15);
      position: relative;
      overflow: hidden;
    }
    .mo-summary::after {
      content: '';
      position: absolute;
      inset: 0;
      background: url('https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1600&q=80') center/cover;
      opacity: 0.1;
      mix-blend-mode: overlay;
      pointer-events: none;
    }
    .mo-summary-left {
      position: relative;
      z-index: 1;
    }
    .mo-summary-label {
      font-size: 1.1rem;
      font-weight: 500;
      opacity: 0.9;
      margin-bottom: 8px;
    }
    .mo-summary-value {
      font-family: var(--g-font-heading);
      font-size: 3rem;
      font-weight: 700;
      line-height: 1;
    }
    .mo-summary-btn {
      position: relative;
      z-index: 1;
      background: white;
      color: var(--g-primary);
      padding: 14px 28px;
      border-radius: 50px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .mo-summary-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }

    .mo-list {
      display: grid;
      gap: 30px;
    }
    .mo-card {
      background: var(--g-bg-card);
      border: 1px solid var(--g-border);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(15,23,42,0.04);
      transition: box-shadow 0.3s;
    }
    .mo-card:hover {
      box-shadow: 0 15px 40px rgba(15,23,42,0.08);
    }
    .mo-card-header {
      padding: 20px 24px;
      background: var(--g-surface-alt);
      border-bottom: 1px solid var(--g-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .mo-card-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--g-text);
      margin-bottom: 4px;
    }
    .mo-badge {
      padding: 6px 14px;
      border-radius: 50px;
      font-weight: 700;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .mo-badge-Pending { background: var(--g-warning-bg); color: var(--g-warning); }
    .mo-badge-Completed { background: var(--g-success-bg); color: var(--g-success); }
    .mo-badge-Cancelled { background: var(--g-error-bg); color: var(--g-error); }
    
    .mo-card-body {
      padding: 24px;
    }
    .mo-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .mo-table th {
      text-align: left;
      padding-bottom: 12px;
      color: var(--g-text-muted);
      font-weight: 600;
      border-bottom: 1px solid var(--g-border-light);
    }
    .mo-table td {
      padding: 16px 0;
      border-bottom: 1px dashed var(--g-border-light);
    }
    .mo-total-container {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 16px;
      padding-top: 10px;
    }
    .mo-total-lbl {
      font-size: 1.1rem;
      color: var(--g-text-secondary);
      font-weight: 600;
    }
    .mo-total-amt {
      font-family: var(--g-font-heading);
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--g-primary);
    }
    .mo-note {
      background: var(--g-surface-raised);
      padding: 16px;
      border-radius: 12px;
      color: var(--g-text-secondary);
      font-size: 0.95rem;
      border: 1px solid var(--g-border-light);
    }
  `;

  if (loading) {
    return <PageContainer><LoadingSpinner text="Đang tải dữ liệu..." /></PageContainer>;
  }

  if (error) {
    return <PageContainer><EmptyState icon="❌" title="Lỗi" message={error} /></PageContainer>;
  }

  return (
    <PageContainer className="g-section-lg">
      <style>{styles}</style>
      
      <SectionTitle 
        eyebrow="Quản Lý Đơn Gọi" 
        title="Dịch Vụ Của Bạn" 
        subtitle="Theo dõi và kiểm tra chi phí phát sinh trong quá trình lưu trú." 
      />

      <div className="mo-summary">
        <div className="mo-summary-left">
          <div className="mo-summary-label">Tổng Chi Phí Dịch Vụ Phát Sinh</div>
          <div className="mo-summary-value">{formatCurrency(totalIncurred)}</div>
        </div>
        <button className="mo-summary-btn" onClick={() => navigate("/guest/services")}>
           KHÁM PHÁ & GỌI DỊCH VỤ
        </button>
      </div>

      {orders.length === 0 ? (
        <EmptyState 
          icon={<span className="material-symbols-outlined" style={{fontSize: 64, color: "var(--g-gold)"}}>room_service</span>}
          title="Bạn chưa gọi dịch vụ nào" 
          message="Khám phá ngay các dịch vụ tuyệt vời của khách sạn để tận hưởng một kỳ nghỉ trọn vẹn. Chúng tôi luôn sẵn sàng phục vụ bạn."
          action={<button className="g-btn-primary" onClick={() => navigate("/guest/services")}>Xem Menu Dịch Vụ</button>}
        />
      ) : (
        <div className="mo-list">
          {orders.map(order => (
            <div key={order.id} className="mo-card">
              <div className="mo-card-header">
                <div>
                  <div className="mo-card-title">Booking: {order.bookingCode} {order.roomNumber ? `- Phòng ${order.roomNumber}` : ''}</div>
                  <div style={{color: "var(--g-text-muted)", fontSize: "0.9rem"}}>{formatDateTime(order.orderDate)}</div>
                </div>
                <div className={`mo-badge mo-badge-${order.status}`}>{order.status}</div>
              </div>
              
              <div className="mo-card-body">
                <table className="mo-table">
                  <thead>
                    <tr>
                      <th>Dịch vụ</th>
                      <th style={{textAlign: "center"}}>Số lượng</th>
                      <th style={{textAlign: "right"}}>Đơn giá</th>
                      <th style={{textAlign: "right"}}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.details?.map(d => (
                      <tr key={d.id}>
                        <td style={{fontWeight: 600, color: "var(--g-text)"}}>{d.serviceName}</td>
                        <td style={{textAlign: "center"}}>{d.quantity}</td>
                        <td style={{textAlign: "right", color: "var(--g-text-muted)"}}>{formatCurrency(d.unitPrice)}</td>
                        <td style={{textAlign: "right", fontWeight: 700}}>{formatCurrency(d.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div className="mo-total-container">
                  <div className="mo-total-lbl">Tổng giá trị đơn:</div>
                  <div className="mo-total-amt">{formatCurrency(order.totalAmount)}</div>
                </div>

                {order.note && (
                  <div className="mo-note" style={{marginTop: 20}}>
                    <strong style={{color: "var(--g-text)"}}>Ghi chú:</strong> {order.note}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
