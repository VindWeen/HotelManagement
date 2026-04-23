import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyBookings } from "../../api/bookingsApi";
import { getMyReviewStatus } from "../../api/reviewsApi";
import { getMyProfile } from "../../api/userProfileApi";
import { EmptyState, LoadingSpinner, PageContainer, SectionTitle, StatusBadge } from "../../components/guest";
import { formatCurrency } from "../../utils";
import { getBookingStatusLabel } from "../../utils/statusLabels";

const ACTIVE_STAY_STATUSES = new Set(["Checked_in", "CheckedIn"]);
const UPCOMING_STATUSES = new Set(["Pending", "Confirmed"]);

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getStatusVariant = (status) => {
  if (status === "Confirmed") return "info";
  if (status === "Pending") return "warning";
  if (ACTIVE_STAY_STATUSES.has(status)) return "success";
  if (status === "Completed") return "neutral";
  if (status === "Cancelled") return "error";
  return "primary";
};

const getReviewVariant = (status) => {
  if (status === "approved") return "success";
  if (status === "rejected") return "error";
  if (status === "pending") return "warning";
  return "neutral";
};

const getReviewLabel = (status) => {
  if (status === "approved") return "Đã duyệt";
  if (status === "rejected") return "Cần chỉnh sửa";
  if (status === "pending") return "Chờ duyệt";
  return "Không rõ";
};

function SummaryCard({ label, value, hint, action }) {
  return (
    <article
      className="g-card"
      style={{
        padding: "24px",
        display: "grid",
        gap: 12,
        minHeight: 170,
      }}
    >
      <div className="g-label">{label}</div>
      <div
        style={{
          fontFamily: "var(--g-font-heading)",
          fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
          fontWeight: 700,
          color: "var(--g-text)",
          letterSpacing: "var(--g-tracking-tight)",
        }}
      >
        {value}
      </div>
      <div style={{ color: "var(--g-text-secondary)", lineHeight: "var(--g-leading-relaxed)" }}>
        {hint}
      </div>
      {action ? <div style={{ marginTop: "auto" }}>{action}</div> : null}
    </article>
  );
}

function BookingCard({ booking }) {
  const detail = booking.bookingDetails?.[0];

  return (
    <article
      className="g-card"
      style={{
        padding: "22px",
        display: "grid",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="g-label">Booking</div>
          <div style={{ marginTop: 6, fontSize: "1.1rem", fontWeight: 700, color: "var(--g-text)" }}>
            {booking.bookingCode}
          </div>
        </div>
        <StatusBadge variant={getStatusVariant(booking.status)} dot>
          {getBookingStatusLabel(booking.status)}
        </StatusBadge>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          color: "var(--g-text-secondary)",
        }}
      >
        <div>
          <div className="g-label">Hạng phòng</div>
          <div style={{ marginTop: 6, color: "var(--g-text)" }}>{detail?.roomTypeName || "—"}</div>
        </div>
        <div>
          <div className="g-label">Lưu trú</div>
          <div style={{ marginTop: 6, color: "var(--g-text)" }}>
            {formatDate(detail?.checkInDate)} - {formatDate(detail?.checkOutDate)}
          </div>
        </div>
        <div>
          <div className="g-label">Tạm tính</div>
          <div style={{ marginTop: 6, color: "var(--g-text)" }}>{formatCurrency(booking.totalEstimatedAmount)}</div>
        </div>
      </div>
    </article>
  );
}

function ReviewCard({ item }) {
  return (
    <article
      className="g-card"
      style={{
        padding: "20px",
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="g-label">Review</div>
          <div style={{ marginTop: 6, fontWeight: 700, color: "var(--g-text)" }}>
            {item.bookingCode || `Booking #${item.bookingId || "—"}`}
          </div>
        </div>
        <StatusBadge variant={getReviewVariant(item.status)} dot>
          {getReviewLabel(item.status)}
        </StatusBadge>
      </div>
      <div style={{ color: "var(--g-text-secondary)" }}>{item.roomTypeName || "Chưa rõ hạng phòng"}</div>
      {item.comment ? (
        <p style={{ margin: 0, color: "var(--g-text-secondary)", lineHeight: "var(--g-leading-relaxed)" }}>
          {item.comment}
        </p>
      ) : null}
      {item.rejectionReason ? (
        <div
          style={{
            borderRadius: "var(--g-radius-md)",
            border: "1px solid var(--g-error-border)",
            background: "var(--g-error-bg)",
            color: "var(--g-error)",
            padding: "12px 14px",
            fontSize: "var(--g-text-sm)",
          }}
        >
          {item.rejectionReason}
        </div>
      ) : null}
    </article>
  );
}

export default function GuestDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [activeStays, setActiveStays] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [submittedReviews, setSubmittedReviews] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [profileRes, bookingsRes, reviewRes] = await Promise.all([
          getMyProfile(),
          getMyBookings(),
          getMyReviewStatus(),
        ]);

        if (cancelled) return;

        const bookings = bookingsRes.data?.data || [];
        setProfile(profileRes.data || null);
        setUpcomingBookings(bookings.filter((item) => UPCOMING_STATUSES.has(item.status)));
        setActiveStays(bookings.filter((item) => ACTIVE_STAY_STATUSES.has(item.status)));
        setPendingReviews(reviewRes.data?.pendingReviewBookings || []);
        setSubmittedReviews(reviewRes.data?.submittedReviews || []);
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || "Không thể tải dashboard của bạn.");
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

  if (loading) {
    return <LoadingSpinner text="Đang tải dashboard khách hàng..." />;
  }

  return (
    <PageContainer className="g-section-lg" style={{ display: "grid", gap: 32 }}>
      <SectionTitle
        align="left"
        eyebrow="Guest Portal"
        title={`Xin chào${profile?.fullName ? `, ${profile.fullName}` : ""}`}
        subtitle="Theo dõi các booking sắp tới, trạng thái lưu trú, membership hiện tại và những việc cần xử lý trong tài khoản của bạn."
      />

      {error ? (
        <div
          style={{
            borderRadius: "var(--g-radius-lg)",
            border: "1px solid var(--g-error-border)",
            background: "var(--g-error-bg)",
            color: "var(--g-error)",
            padding: "16px 18px",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      ) : null}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 20,
        }}
      >
        <SummaryCard
          label="Booking Sắp Tới"
          value={upcomingBookings.length}
          hint="Các booking đã tạo hoặc đã xác nhận nhưng chưa check-in."
          action={<Link to="/guest/profile" className="g-btn-ghost">Quản lý hồ sơ</Link>}
        />
        <SummaryCard
          label="Đang Lưu Trú"
          value={activeStays.length}
          hint="Booking hiện đang trong trạng thái lưu trú tại khách sạn."
        />
        <SummaryCard
          label="Membership"
          value={profile?.membershipTier || "Chưa có hạng"}
          hint={
            profile?.membershipDiscount != null
              ? `Ưu đãi hiện tại: giảm ${profile.membershipDiscount}%.`
              : "Khi tích lũy đủ điểm, hạng thành viên sẽ được nâng tự động."
          }
          action={<Link to="/guest/loyalty" className="g-btn-ghost">Xem loyalty</Link>}
        />
        <SummaryCard
          label="Điểm Loyalty"
          value={`${profile?.loyaltyPointsUsable ?? profile?.loyaltyPoints ?? 0} điểm`}
          hint={`Tổng điểm tích lũy: ${profile?.loyaltyPoints ?? 0}.`}
          action={<Link to="/guest/vouchers" className="g-btn-ghost">Xem ưu đãi</Link>}
        />
      </section>

      <section style={{ display: "grid", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <SectionTitle
            align="left"
            titleSize="sm"
            title="Booking Sắp Tới"
            subtitle="Các booking bạn cần chuẩn bị trước khi đến."
          />
        </div>
        {upcomingBookings.length === 0 ? (
          <EmptyState
            compact
            icon="🛎️"
            title="Chưa có booking sắp tới"
            message="Khi bạn tạo booking mới, thông tin sẽ xuất hiện ở đây."
          />
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {upcomingBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </section>

      <section style={{ display: "grid", gap: 18 }}>
        <SectionTitle
          align="left"
          titleSize="sm"
          title="Booking Đang Lưu Trú"
          subtitle="Thông tin các kỳ nghỉ đang diễn ra."
        />
        {activeStays.length === 0 ? (
          <EmptyState
            compact
            icon="🏨"
            title="Bạn chưa có booking đang lưu trú"
            message="Khi check-in thành công, booking sẽ được chuyển sang khu vực này."
          />
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {activeStays.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 24,
        }}
      >
        <div style={{ display: "grid", gap: 18 }}>
          <SectionTitle
            align="left"
            titleSize="sm"
            title="Review Chờ Thực Hiện"
            subtitle="Các kỳ lưu trú đã hoàn tất nhưng bạn chưa gửi đánh giá."
          />
          {pendingReviews.length === 0 ? (
            <EmptyState
              compact
              icon="⭐"
              title="Không có review chờ thực hiện"
              message="Khi hoàn tất lưu trú và chưa đánh giá, booking sẽ hiển thị tại đây."
            />
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {pendingReviews.map((item) => (
                <article key={item.id} className="g-card" style={{ padding: "20px", display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div className="g-label">Cần đánh giá</div>
                      <div style={{ marginTop: 6, fontWeight: 700, color: "var(--g-text)" }}>{item.bookingCode}</div>
                    </div>
                    <StatusBadge variant="warning" dot>Chưa gửi review</StatusBadge>
                  </div>
                  <div style={{ color: "var(--g-text-secondary)" }}>
                    {item.roomTypeName || "Chưa rõ hạng phòng"} • {formatDate(item.checkInDate)} - {formatDate(item.checkOutDate)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ color: "var(--g-text-muted)", fontSize: "var(--g-text-sm)" }}>
                      Tổng booking: {formatCurrency(item.totalEstimatedAmount)}
                    </div>
                    <Link to="/guest/reviews" className="g-btn-primary g-btn-sm">Đi tới trang đánh giá</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <SectionTitle
            align="left"
            titleSize="sm"
            title="Review Đã Gửi"
            subtitle="Theo dõi trạng thái review gần nhất của bạn."
          />
          {submittedReviews.length === 0 ? (
            <EmptyState
              compact
              icon="📝"
              title="Bạn chưa gửi review nào"
              message="Review đã gửi sẽ hiển thị ở đây để bạn theo dõi duyệt."
            />
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {submittedReviews.slice(0, 4).map((item) => (
                <ReviewCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>
    </PageContainer>
  );
}
