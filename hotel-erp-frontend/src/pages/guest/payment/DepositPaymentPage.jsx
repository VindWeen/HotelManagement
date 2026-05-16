import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getGuestPaymentStatus } from "../../../api/paymentsApi";
import { PageContainer, SectionTitle, LoadingSpinner, EmptyState } from "../../../components/guest";
import { formatCurrency } from "../../../utils";
import { useAdminAuthStore } from "../../../store/adminAuthStore";
import { SePayPgClient } from 'sepay-pg-node';

const client = new SePayPgClient({
  env: 'live',
  merchant_id: 'SP-LIVE-PV4A65A9',
  secret_key: 'spsk_live_S8NNtv2e3rTPD2hnpa2bJsysEQKAxoL9'
});

export default function DepositPaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, token } = useAdminAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentInfo, setPaymentInfo] = useState(null);

  const pollInterval = useRef(null);
  const guestAccess = {
    bookingCode: searchParams.get("code") || undefined,
    guestEmail: searchParams.get("email") || undefined,
  };
  const fallbackUrl = token ? "/guest/my-bookings" : "/booking";

  const fetchStatus = async () => {
    try {
      const res = await getGuestPaymentStatus(bookingId, guestAccess);
      const data = res.data?.data;
      setPaymentInfo(data);
      if (data?.isFullyDeposited) {
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
    pollInterval.current = setInterval(fetchStatus, 3000);
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    if (paymentInfo?.isFullyDeposited) {
      const timer = setTimeout(() => {
        navigate(fallbackUrl);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [paymentInfo?.isFullyDeposited, navigate, fallbackUrl]);

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
          action={{ label: "Quay lại", onClick: () => navigate(fallbackUrl) }}
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
    isFullyDeposited,
  } = paymentInfo;

  // URL tạo mã QR động qua SePay VietQR (Miễn phí)
  const sepayBank = "ACB";
  const sepayAccount = "24598667";
  const qrDescription = `Thanh toan tra coc cho booking ${bookingCode}`;
  const qrUrl = `https://qr.sepay.vn/img?bank=${sepayBank}&acc=${sepayAccount}&amount=${remaining}&des=${encodeURIComponent(qrDescription)}`;

  return (
    <PageContainer className="g-section-lg">
      <SectionTitle
        eyebrow="Thanh toán"
        title="Thanh toán tiền cọc"
        subtitle={`Booking #${bookingCode}`}
        align="center"
      />

      <div
        style={{
          maxWidth: 600,
          margin: "0 auto",
          background: "var(--g-surface)",
          padding: 28,
          borderRadius: "var(--g-radius-lg)",
          border: "1px solid var(--g-border)",
        }}
      >
        {error && (
          <div style={{ background: "var(--g-error-bg)", color: "var(--g-error)", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        {/* ── Tóm tắt số tiền ── */}
        <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--g-text-muted)" }}>Tổng tiền dự kiến:</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(totalEstimatedAmount)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--g-text-muted)" }}>Tiền cọc yêu cầu:</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(depositRequired)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--g-text-muted)" }}>Đã thanh toán:</span>
            <span style={{ fontWeight: 600, color: "var(--g-success)" }}>{formatCurrency(depositPaid)}</span>
          </div>
          <div style={{ height: 1, background: "var(--g-border-light)", margin: "4px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem" }}>
            <span style={{ fontWeight: 700 }}>Cần thanh toán thêm:</span>
            <span style={{ fontWeight: 800, color: isFullyDeposited ? "var(--g-success)" : "var(--g-primary)" }}>
              {formatCurrency(remaining)}
            </span>
          </div>
        </div>

        {isFullyDeposited ? (
          /* ── Đã thanh toán đủ ── */
          <div style={{ textAlign: "center", padding: 24, background: "var(--g-success-bg)", borderRadius: 8, border: "1px solid var(--g-success-border)" }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>✅</div>
            <h3 style={{ color: "var(--g-success)", marginBottom: 8 }}>Đã thanh toán đủ tiền cọc</h3>
            <p style={{ color: "var(--g-text-muted)", marginBottom: 24 }}>
              Tiền cọc của bạn đã được thanh toán đủ. Tự động chuyển trang sau 3 giây...
            </p>
            <button className="g-btn-primary" style={{ marginTop: 16 }} onClick={() => navigate(fallbackUrl)}>
              {token ? "Về danh sách booking" : "Về trang đặt phòng"}
            </button>
          </div>
        ) : (
          /* ── Hiển thị QR SePay ── */
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 600, marginBottom: 4, color: "var(--g-text)" }}>
              Quét mã QR để chuyển khoản
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--g-text-muted)", marginBottom: 16 }}>
              Sử dụng ứng dụng ngân hàng hỗ trợ VietQR để thanh toán
            </p>

            {/* QR Image */}
            <div style={{ display: "inline-block", padding: 12, background: "white", borderRadius: 12, border: `2px solid var(--g-primary)`, marginBottom: 20 }}>
              <img
                src={qrUrl}
                alt="SePay Payment QR Code"
                style={{ width: 220, height: "auto", display: "block" }}
              />
            </div>

            {/* Thông tin chuyển khoản */}
            <div style={{ background: "var(--g-bg)", borderRadius: 8, padding: 16, marginBottom: 20, textAlign: "left", border: "1px solid var(--g-border)" }}>
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  ["Ngân hàng", "Ngân hàng TMCP Á Châu (ACB)"],
                  ["Số tài khoản", sepayAccount],
                  ["Số tiền", formatCurrency(remaining)],
                  ["Nội dung CK", qrDescription],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ color: "var(--g-text-muted)", fontSize: "0.88rem" }}>{label}:</span>
                    <span style={{ fontWeight: 600, fontSize: "0.9rem", color: label === "Số tiền" ? "var(--g-primary)" : "var(--g-text)" }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Lưu ý */}
            <div style={{ background: "#fffbec", border: "1px solid #f5d26e", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: "0.84rem", color: "#7a5c00", textAlign: "left" }}>
              ⚠️ Hệ thống sẽ tự động xác nhận thanh toán sau khi bạn chuyển khoản thành công. Vui lòng không đóng trang này.
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
