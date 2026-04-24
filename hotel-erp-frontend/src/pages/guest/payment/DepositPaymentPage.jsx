import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getGuestPaymentStatus, createGuestDepositPayment } from "../../../api/paymentsApi";
import { PageContainer, SectionTitle, LoadingSpinner, EmptyState } from "../../../components/guest";
import { formatCurrency } from "../../../utils";

export default function DepositPaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentInfo, setPaymentInfo] = useState(null);
  
  const [creating, setCreating] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [payUrl, setPayUrl] = useState(null);

  // Dùng ref để tránh polling khi component đã unmount
  const pollInterval = useRef(null);

  const fetchStatus = async () => {
    try {
      const res = await getGuestPaymentStatus(bookingId);
      const data = res.data?.data;
      setPaymentInfo(data);
      
      // Nếu đã thanh toán đủ, dừng polling
      if (data?.isFullyDeposited) {
        setQrCodeUrl(null);
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
          pollInterval.current = null;
        }
      }
    } catch (err) {
      console.error(err);
      setError("Không thể tải thông tin thanh toán. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const handlePay = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await createGuestDepositPayment(bookingId);
      const data = res.data?.data;
      
      if (data?.payUrl) {
        window.location.href = data.payUrl;
      } else {
        setError("Không nhận được đường dẫn thanh toán từ MoMo.");
        setCreating(false);
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Tạo thanh toán thất bại.");
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <PageContainer className="g-section-lg">
        <LoadingSpinner text="Đang tải thông tin thanh toán..." />
      </PageContainer>
    );
  }

  if (error && !paymentInfo) {
    return (
      <PageContainer className="g-section-lg">
        <EmptyState 
          icon="❌" 
          title="Lỗi tải dữ liệu" 
          message={error} 
          action={{ label: "Quay lại", onClick: () => navigate("/guest/my-bookings") }}
        />
      </PageContainer>
    );
  }

  const {
    bookingCode,
    totalEstimatedAmount,
    depositRequired,
    depositPaid,
    remaining,
    isFullyDeposited
  } = paymentInfo;

  return (
    <PageContainer className="g-section-lg">
      <SectionTitle
        eyebrow="Thanh toán"
        title="Thanh toán tiền cọc"
        subtitle={`Booking #${bookingCode}`}
        align="center"
      />

      <div style={{ maxWidth: 600, margin: "0 auto", background: "var(--g-surface)", padding: 24, borderRadius: "var(--g-radius-lg)", border: "1px solid var(--g-border)" }}>
        {error && (
          <div style={{ background: "var(--g-error-bg)", color: "var(--g-error)", padding: 12, borderRadius: 8, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--g-text-muted)" }}>Tổng tiền dự kiến:</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(totalEstimatedAmount)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
             <span style={{ color: "var(--g-text-muted)" }}>Tổng tiền cọc yêu cầu:</span>
             <span style={{ fontWeight: 600 }}>{formatCurrency(depositRequired)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
             <span style={{ color: "var(--g-text-muted)" }}>Đã thanh toán:</span>
             <span style={{ fontWeight: 600, color: "var(--g-success)" }}>{formatCurrency(depositPaid)}</span>
          </div>
          
          <div style={{ height: 1, background: "var(--g-border-light)", margin: "8px 0" }} />
          
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem" }}>
             <span style={{ fontWeight: 700 }}>Cần thanh toán thêm:</span>
             <span style={{ fontWeight: 800, color: isFullyDeposited ? "var(--g-success)" : "var(--g-primary)" }}>
               {formatCurrency(remaining)}
             </span>
          </div>
        </div>

        {isFullyDeposited ? (
          <div style={{ textAlign: "center", padding: 24, background: "var(--g-success-bg)", borderRadius: 8, border: "1px solid var(--g-success-border)" }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>✅</div>
            <h3 style={{ color: "var(--g-success)", marginBottom: 8 }}>Đã thanh toán đủ tiền cọc</h3>
            <p style={{ color: "var(--g-text-muted)" }}>Cảm ơn bạn. Booking của bạn đã được xác nhận.</p>
            <button className="g-btn-primary" style={{ marginTop: 16 }} onClick={() => navigate("/guest/my-bookings")}>
              Về danh sách booking
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <button 
              className="g-btn-primary" 
              style={{ width: "100%", justifyContent: "center", padding: "16px" }}
              onClick={handlePay}
              disabled={creating}
            >
              {creating ? "Đang chuyển hướng đến MoMo..." : "Thanh toán qua MoMo"}
            </button>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
