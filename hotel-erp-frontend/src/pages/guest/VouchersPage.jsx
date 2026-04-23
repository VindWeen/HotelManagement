import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, LoadingSpinner, PageContainer, SectionTitle, StatusBadge } from "../../components/guest";
import { getAvailableVouchers } from "../../api/vouchersApi";
import { formatCurrency } from "../../utils";

const FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "USER", label: "Của tôi" },
  { key: "MEMBERSHIP", label: "Hạng thành viên" },
  { key: "BIRTHDAY_MONTH", label: "Sinh nhật" },
  { key: "HOLIDAY", label: "Dịp lễ" },
  { key: "FIXED_AMOUNT", label: "Giảm tiền" },
  { key: "PERCENT", label: "Giảm %" },
];

const audienceLabel = (voucher) => {
  if (voucher.audienceType === "USER") return "Riêng cho bạn";
  if (voucher.audienceType === "BIRTHDAY_MONTH") return "Sinh nhật";
  if (voucher.audienceType === "MEMBERSHIP") return voucher.targetMembershipName || "Hạng thành viên";
  if (voucher.audienceType === "HOLIDAY") return voucher.occasionName || "Dịp lễ";
  return "Công khai";
};

const formatDate = (value) => {
  if (!value) return "Không giới hạn";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDiscount = (voucher) => {
  if (voucher.discountType === "PERCENT") {
    return `Giảm ${voucher.discountValue}%${voucher.maxDiscountAmount ? ` tối đa ${formatCurrency(voucher.maxDiscountAmount)}` : ""}`;
  }
  return `Giảm ${formatCurrency(voucher.discountValue)}`;
};

export default function VouchersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vouchers, setVouchers] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getAvailableVouchers();
        if (!cancelled) {
          setVouchers(res.data?.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || "Không thể tải danh sách ưu đãi.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const usableCount = useMemo(
    () => vouchers.filter((item) => item.isUsable !== false).length,
    [vouchers]
  );

  const filteredVouchers = useMemo(() => {
    if (activeFilter === "all") return vouchers;
    if (activeFilter === "FIXED_AMOUNT" || activeFilter === "PERCENT") {
      return vouchers.filter((item) => item.discountType === activeFilter);
    }
    return vouchers.filter((item) => item.audienceType === activeFilter);
  }, [activeFilter, vouchers]);

  if (loading) {
    return <LoadingSpinner text="Đang tải ưu đãi của bạn..." />;
  }

  return (
    <PageContainer className="g-section-lg" style={{ display: "grid", gap: 28 }}>
      <SectionTitle
        align="left"
        eyebrow="Ưu đãi"
        title="Voucher Của Tôi"
        subtitle="Chọn một ưu đãi và dùng ngay trong flow đặt phòng."
      />

      {error ? (
        <div className="g-card" style={{ padding: 18, color: "var(--g-error)", borderColor: "var(--g-error-border)", background: "var(--g-error-bg)" }}>
          {error}
        </div>
      ) : null}

      <section style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          <SectionTitle
            align="left"
            titleSize="sm"
            title="Danh Sách Voucher"
            subtitle={`${usableCount} voucher còn có thể dùng.`}
          />
          <div
            role="tablist"
            aria-label="Lọc voucher"
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              padding: 4,
              border: "1px solid var(--g-border-light)",
              borderRadius: "var(--g-radius-full)",
              background: "var(--g-surface-raised)",
            }}
          >
            {FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                role="tab"
                aria-selected={activeFilter === filter.key}
                onClick={() => setActiveFilter(filter.key)}
                style={{
                  padding: "9px 16px",
                  border: "none",
                  borderRadius: "var(--g-radius-full)",
                  background: activeFilter === filter.key ? "var(--g-bg-card)" : "transparent",
                  color: activeFilter === filter.key ? "var(--g-primary)" : "var(--g-text-secondary)",
                  boxShadow: activeFilter === filter.key ? "var(--g-shadow-sm)" : "none",
                  font: "inherit",
                  fontSize: "var(--g-text-sm)",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {filteredVouchers.length === 0 ? (
          <EmptyState icon="local_offer" title="Không có voucher phù hợp" message="Thử chuyển sang tab khác để xem thêm ưu đãi." />
        ) : (
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {filteredVouchers.map((voucher) => (
              <article key={voucher.id} className="g-card" style={{ padding: 22, display: "grid", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div>
                    <div className="g-label">Mã voucher</div>
                    <strong style={{ display: "block", marginTop: 6, fontSize: "1.25rem", color: "var(--g-primary)", letterSpacing: "0.08em" }}>
                      {voucher.code}
                    </strong>
                  </div>
                  <StatusBadge variant={voucher.isUsable === false ? "neutral" : "success"} dot>
                    {voucher.isUsable === false ? "Hết lượt" : "Có thể dùng"}
                  </StatusBadge>
                </div>

                <div>
                  <StatusBadge variant="neutral" dot>{audienceLabel(voucher)}</StatusBadge>
                </div>

                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--g-text)" }}>
                  {formatDiscount(voucher)}
                </div>

                <div style={{ display: "grid", gap: 8, color: "var(--g-text-secondary)", fontSize: "var(--g-text-sm)" }}>
                  <div>Đơn tối thiểu: <strong>{voucher.minBookingValue ? formatCurrency(voucher.minBookingValue) : "Không yêu cầu"}</strong></div>
                  <div>Hạng phòng: <strong>{voucher.applicableRoomTypeName || "Tất cả"}</strong></div>
                  <div>Hạn dùng: <strong>{formatDate(voucher.validTo)}</strong></div>
                  <div>Lượt còn lại: <strong>{voucher.remainingForUser ?? 0}</strong></div>
                </div>

                {voucher.unavailableReason ? (
                  <div style={{ color: "var(--g-error)", fontSize: "var(--g-text-sm)", fontWeight: 700 }}>
                    {voucher.unavailableReason}
                  </div>
                ) : null}

                <Link
                  to={`/booking?voucher=${encodeURIComponent(voucher.code)}`}
                  className={voucher.isUsable === false ? "g-btn-outline" : "g-btn-primary"}
                  style={{
                    marginTop: "auto",
                    pointerEvents: voucher.isUsable === false ? "none" : "auto",
                    opacity: voucher.isUsable === false ? 0.55 : 1,
                  }}
                >
                  Dùng ngay
                </Link>
              </article>
            ))}
          </section>
        )}
      </section>
    </PageContainer>
  );
}
