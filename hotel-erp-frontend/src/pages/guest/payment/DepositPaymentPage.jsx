import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  getGuestPaymentStatus,
} from "../../../api/paymentsApi";
import { PageContainer, SectionTitle, LoadingSpinner, EmptyState } from "../../../components/guest";
import { formatCurrency } from "../../../utils";
import { useAdminAuthStore } from "../../../store/adminAuthStore";

// ── VietQR config ─────────────────────────────────────────────────────
const VIETQR_BANK   = "VCB";
const VIETQR_ACCOUNT = "1039807638";
const VIETQR_TEMPLATE = "compact";

function buildVietQRUrl(amount, description) {
  const base = `https://img.vietqr.io/image/${VIETQR_BANK}-${VIETQR_ACCOUNT}-${VIETQR_TEMPLATE}.png`;
  const params = new URLSearchParams({
    amount: Math.round(amount).toString(),
    addInfo: description,
  });
  return `${base}?${params.toString()}`;
}

function buildMomoQRUrl(amount, description) {
  const base = `https://api.vietqr.io/image/970454-99MM24032M46882192-kRMQ7Kp.jpg`;
  const params = new URLSearchParams({
    accountName: "VONHACPHUOC",
    amount: Math.round(amount).toString(),
    addInfo: description,
  });
  return `${base}?${params.toString()}`;
}

// ── Phương thức thanh toán ────────────────────────────────────────────
const PAYMENT_METHODS = [
  {
    id: "momo",
    label: "MoMo",
    description: "Ví điện tử MoMo",
    color: "#B0006D",
    bg: "#fdf0f7",
    border: "#f0a8d0",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 36, height: 36 }}>
        <circle cx="24" cy="24" r="24" fill="#B0006D" />
        <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="18" fontWeight="bold" fontFamily="Arial, sans-serif">M</text>
      </svg>
    ),
  },
  {
    id: "vietqr",
    label: "VietQR",
    description: "Chuyển khoản ngân hàng",
    color: "#0066CC",
    bg: "#f0f6ff",
    border: "#a8c8f0",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 36, height: 36 }}>
        <rect width="48" height="48" rx="8" fill="#0066CC" />
        <rect x="10" y="10" width="12" height="12" rx="1" fill="white" />
        <rect x="13" y="13" width="6" height="6" fill="#0066CC" />
        <rect x="26" y="10" width="12" height="12" rx="1" fill="white" />
        <rect x="29" y="13" width="6" height="6" fill="#0066CC" />
        <rect x="10" y="26" width="12" height="12" rx="1" fill="white" />
        <rect x="13" y="29" width="6" height="6" fill="#0066CC" />
        <rect x="26" y="26" width="5" height="5" rx="1" fill="white" />
        <rect x="33" y="26" width="5" height="5" rx="1" fill="white" />
        <rect x="26" y="33" width="5" height="5" rx="1" fill="white" />
        <rect x="33" y="33" width="5" height="5" rx="1" fill="white" />
      </svg>
    ),
  },
];

export default function DepositPaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, token } = useAdminAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [creating, setCreating] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("momo");
  const [showQR, setShowQR] = useState(false);

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
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const handlePay = async () => {
    setShowQR(true);
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

  const activeMethod = PAYMENT_METHODS.find((m) => m.id === selectedMethod);
  const userNameString = (user?.fullName || user?.email?.split('@')[0] || "Khach").replace(/đ|Đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const qrDescription = `${userNameString} Thanh toan coc 30% ${remaining}`;
  const qrUrl = selectedMethod === "momo"
    ? buildMomoQRUrl(remaining, qrDescription)
    : buildVietQRUrl(remaining, qrDescription);

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
            <p style={{ color: "var(--g-text-muted)" }}>Cảm ơn bạn. Booking của bạn đã được xác nhận.</p>
            <button className="g-btn-primary" style={{ marginTop: 16 }} onClick={() => navigate(fallbackUrl)}>
              {token ? "Về danh sách booking" : "Về trang đặt phòng"}
            </button>
          </div>
        ) : showQR ? (
          /* ── Hiển thị QR ── */
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 600, marginBottom: 4, color: "var(--g-text)" }}>
              Quét mã QR để chuyển khoản
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--g-text-muted)", marginBottom: 16 }}>
              Sử dụng ứng dụng {selectedMethod === "momo" ? "MoMo hoặc ngân hàng hỗ trợ" : "ngân hàng hoặc ví điện tử"}
            </p>

            {/* QR Image */}
            <div style={{ display: "inline-block", padding: 12, background: "white", borderRadius: 12, border: `2px solid ${activeMethod?.color || "#0066CC"}`, marginBottom: 20 }}>
              <img
                src={qrUrl}
                alt={`${activeMethod?.label} Payment QR Code`}
                style={{ width: 220, height: "auto", display: "block" }}
                onError={(e) => { 
                  if (selectedMethod === "vietqr") {
                    e.target.src = `https://img.vietqr.io/image/${VIETQR_BANK}-${VIETQR_ACCOUNT}-${VIETQR_TEMPLATE}.png`; 
                  }
                }}
              />
            </div>

            {/* Thông tin chuyển khoản */}
            <div style={{ background: "var(--g-bg)", borderRadius: 8, padding: 16, marginBottom: 20, textAlign: "left", border: "1px solid var(--g-border)" }}>
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  [selectedMethod === "momo" ? "Ví điện tử" : "Ngân hàng", selectedMethod === "momo" ? "MoMo" : "Vietcombank (VCB)"],
                  ["Tên tài khoản", selectedMethod === "momo" ? "VONHACPHUOC" : "--"],
                  ["Số tài khoản", selectedMethod === "momo" ? "99MM24032M46882192" : VIETQR_ACCOUNT],
                  ["Số tiền", formatCurrency(remaining)],
                  ["Nội dung CK", qrDescription],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", display: value === "--" ? "none" : "flex" }}>
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
              ⚠️ Sau khi thanh toán, vui lòng liên hệ lễ tân hoặc chờ nhân viên xác nhận thanh toán để booking được kích hoạt.
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                style={{ flex: 1, padding: "12px", borderRadius: 8, border: "1px solid var(--g-border)", background: "var(--g-surface)", cursor: "pointer", fontWeight: 500, color: "var(--g-text)" }}
                onClick={() => setShowQR(false)}
              >
                ← Quay lại
              </button>
              <button
                className="g-btn-primary"
                style={{ flex: 2, justifyContent: "center", padding: "12px" }}
                onClick={() => navigate(fallbackUrl)}
              >
                {token ? "Về danh sách booking" : "Về trang đặt phòng"}
              </button>
            </div>
          </div>
        ) : (
          /* ── Chọn phương thức ── */
          <>
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontWeight: 600, marginBottom: 12, fontSize: "0.95rem", color: "var(--g-text)" }}>
                Chọn phương thức thanh toán
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = selectedMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      onClick={() => { setSelectedMethod(method.id); setShowQR(false); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "14px 16px",
                        borderRadius: 10,
                        border: isSelected ? `2px solid ${method.color}` : "2px solid var(--g-border)",
                        background: isSelected ? method.bg : "var(--g-surface)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        textAlign: "left",
                        boxShadow: isSelected ? `0 0 0 3px ${method.color}22` : "none",
                      }}
                    >
                      <div style={{ flexShrink: 0 }}>{method.icon}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: isSelected ? method.color : "var(--g-text)" }}>
                          {method.label}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--g-text-muted)", marginTop: 2 }}>
                          {method.description}
                        </div>
                      </div>
                      {isSelected && (
                        <div style={{ marginLeft: "auto", width: 18, height: 18, borderRadius: "50%", background: method.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              className="g-btn-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "16px",
                background: creating ? undefined : activeMethod?.color,
                border: "none",
                transition: "opacity 0.2s",
                opacity: creating ? 0.7 : 1,
              }}
              onClick={handlePay}
            >
              Xem mã QR thanh toán
            </button>
          </>
        )}
      </div>
    </PageContainer>
  );
}
