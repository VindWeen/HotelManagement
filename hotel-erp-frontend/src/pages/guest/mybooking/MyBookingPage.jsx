import { useEffect, useState } from "react";
import { getMyBookings } from "../../../api/bookingsApi";
import {
  EmptyState,
  LoadingSpinner,
  PageContainer,
  SectionTitle,
  StatusBadge,
} from "../../../components/guest";
import { formatCurrency } from "../../../utils";
import { getBookingStatusLabel } from "../../../utils/statusLabels";

/* ── Status helpers ── */
const STATUS_ORDER = [
  "Checked_in",
  "CheckedIn",
  "Confirmed",
  "Pending",
  "Checked_out_pending_settlement",
  "Completed",
  "Cancelled",
  "NoShow",
];

const getStatusVariant = (status) => {
  if (status === "Confirmed") return "info";
  if (status === "Pending") return "warning";
  if (status === "Checked_in" || status === "CheckedIn") return "success";
  if (status === "Completed") return "neutral";
  if (status === "Cancelled" || status === "NoShow") return "error";
  if (status === "Checked_out_pending_settlement") return "warning";
  return "primary";
};

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* ── Filter tabs ── */
const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang lưu trú" },
  { key: "upcoming", label: "Sắp tới" },
  { key: "completed", label: "Hoàn tất" },
  { key: "cancelled", label: "Đã hủy" },
];

const filterByTab = (bookings, tab) => {
  if (tab === "all") return bookings;
  if (tab === "active")
    return bookings.filter(
      (b) => b.status === "Checked_in" || b.status === "CheckedIn"
    );
  if (tab === "upcoming")
    return bookings.filter(
      (b) => b.status === "Pending" || b.status === "Confirmed"
    );
  if (tab === "completed") return bookings.filter((b) => b.status === "Completed");
  if (tab === "cancelled")
    return bookings.filter(
      (b) => b.status === "Cancelled" || b.status === "NoShow"
    );
  return bookings;
};

/* ──────────── Inline styles (CSS-in-JS) ──────────── */
const styles = `
  .mb-page { display: grid; gap: 28px; }

  /* ── Tab bar ── */
  .mb-tabs {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    padding: 4px;
    background: var(--g-surface-raised);
    border-radius: var(--g-radius-full);
    border: 1px solid var(--g-border-light);
  }
  .mb-tab {
    padding: 10px 20px;
    font-size: var(--g-text-sm);
    font-weight: 600;
    font-family: var(--g-font-body);
    color: var(--g-text-muted);
    border: none;
    background: transparent;
    border-radius: var(--g-radius-full);
    cursor: pointer;
    transition: all 0.2s var(--g-ease);
    white-space: nowrap;
  }
  .mb-tab:hover {
    color: var(--g-text);
    background: rgba(255,255,255,0.8);
  }
  .mb-tab.active {
    background: var(--g-bg-card);
    color: var(--g-primary);
    box-shadow: var(--g-shadow-sm);
  }

  /* ── Stats row ── */
  .mb-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 14px;
  }
  .mb-stat {
    background: var(--g-bg-card);
    border: 1px solid var(--g-border-light);
    border-radius: var(--g-radius-lg);
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: transform 0.2s var(--g-ease), box-shadow 0.2s var(--g-ease);
  }
  .mb-stat:hover {
    transform: translateY(-2px);
    box-shadow: var(--g-shadow-md);
  }
  .mb-stat-value {
    font-family: var(--g-font-heading);
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--g-text);
    letter-spacing: var(--g-tracking-tight);
  }
  .mb-stat-label {
    font-size: var(--g-text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: var(--g-tracking-widest);
    color: var(--g-text-muted);
  }

  /* ── Booking cards ── */
  .mb-list {
    display: grid;
    gap: 16px;
  }
  .mb-booking {
    background: var(--g-bg-card);
    border: 1px solid var(--g-border);
    border-radius: var(--g-radius-lg);
    overflow: hidden;
    transition: transform 0.2s var(--g-ease), box-shadow 0.2s var(--g-ease);
  }
  .mb-booking:hover {
    transform: translateY(-3px);
    box-shadow: var(--g-shadow-lg);
  }

  .mb-booking-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
    padding: 20px 22px 0;
  }
  .mb-booking-code {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--g-text);
    letter-spacing: var(--g-tracking-tight);
  }
  .mb-booking-date-created {
    font-size: var(--g-text-xs);
    color: var(--g-text-muted);
    margin-top: 4px;
  }

  .mb-booking-body {
    padding: 16px 22px 20px;
    display: grid;
    gap: 14px;
  }

  .mb-details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px;
  }
  .mb-detail-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .mb-detail-label {
    font-size: var(--g-text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: var(--g-tracking-widest);
    color: var(--g-text-muted);
  }
  .mb-detail-value {
    font-size: var(--g-text-sm);
    font-weight: 600;
    color: var(--g-text);
  }

  /* Sub-details (rooms) */
  .mb-rooms {
    display: grid;
    gap: 10px;
  }
  .mb-room {
    padding: 14px 16px;
    background: var(--g-surface-raised);
    border-radius: var(--g-radius-md);
    border: 1px solid var(--g-border-light);
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 10px;
    align-items: center;
  }
  .mb-room-name {
    font-weight: 700;
    color: var(--g-text);
    font-size: var(--g-text-sm);
  }
  .mb-room-dates {
    color: var(--g-text-secondary);
    font-size: var(--g-text-sm);
  }
  .mb-room-price {
    font-weight: 700;
    color: var(--g-primary);
    font-size: var(--g-text-sm);
    text-align: right;
  }

  /* Booking footer */
  .mb-booking-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 14px 22px;
    border-top: 1px solid var(--g-border-light);
    background: rgba(248, 249, 250, 0.5);
  }
  .mb-total {
    font-size: var(--g-text-sm);
    color: var(--g-text-muted);
  }
  .mb-total-amount {
    font-family: var(--g-font-heading);
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--g-text);
    margin-left: 6px;
  }
  .mb-note {
    font-size: var(--g-text-xs);
    color: var(--g-text-muted);
    font-style: italic;
  }

  /* ── Count badge ── */
  .mb-count {
    font-size: var(--g-text-sm);
    color: var(--g-text-muted);
    font-weight: 500;
  }

  @media (max-width: 639px) {
    .mb-tabs { gap: 4px; }
    .mb-tab { padding: 8px 14px; font-size: var(--g-text-xs); }
    .mb-booking-header { padding: 16px 16px 0; }
    .mb-booking-body { padding: 12px 16px 16px; }
    .mb-booking-footer { padding: 12px 16px; }
    .mb-room-price { text-align: left; }
  }
`;

/* ──────────── Component ──────────── */
export default function MyBookingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getMyBookings();
        if (cancelled) return;

        const data = res.data?.data || res.data || [];
        const list = Array.isArray(data) ? data : [];

        // Sort by status priority then by createdAt desc
        list.sort((a, b) => {
          const ia = STATUS_ORDER.indexOf(a.status);
          const ib = STATUS_ORDER.indexOf(b.status);
          const oa = ia === -1 ? 999 : ia;
          const ob = ib === -1 ? 999 : ib;
          if (oa !== ob) return oa - ob;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

        setBookings(list);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message || "Không thể tải danh sách booking."
          );
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
    return <LoadingSpinner text="Đang tải danh sách booking..." />;
  }

  const filtered = filterByTab(bookings, activeTab);

  /* ── Stats ── */
  const stats = {
    total: bookings.length,
    active: bookings.filter(
      (b) => b.status === "Checked_in" || b.status === "CheckedIn"
    ).length,
    upcoming: bookings.filter(
      (b) => b.status === "Pending" || b.status === "Confirmed"
    ).length,
    completed: bookings.filter((b) => b.status === "Completed").length,
  };

  return (
    <>
      <style>{styles}</style>
      <PageContainer className="g-section-lg mb-page">
        {/* Header */}
        <SectionTitle
          align="left"
          eyebrow="My Booking"
          title="Lịch Sử Đặt Phòng"
          subtitle="Quản lý và theo dõi tất cả các booking của bạn tại The Ethereal."
        />

        {/* Error */}
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

        {/* Stats */}
        <div className="mb-stats">
          <div className="mb-stat">
            <span className="mb-stat-label">Tổng Booking</span>
            <span className="mb-stat-value">{stats.total}</span>
          </div>
          <div className="mb-stat">
            <span className="mb-stat-label">Đang Lưu Trú</span>
            <span className="mb-stat-value">{stats.active}</span>
          </div>
          <div className="mb-stat">
            <span className="mb-stat-label">Sắp Tới</span>
            <span className="mb-stat-value">{stats.upcoming}</span>
          </div>
          <div className="mb-stat">
            <span className="mb-stat-label">Hoàn Tất</span>
            <span className="mb-stat-value">{stats.completed}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`mb-tab${activeTab === tab.key ? " active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Count */}
        <div className="mb-count">
          Hiển thị {filtered.length} / {bookings.length} booking
        </div>

        {/* Booking list */}
        {filtered.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Không có booking nào"
            message={
              activeTab === "all"
                ? "Bạn chưa tạo booking nào. Hãy đặt phòng ngay để trải nghiệm dịch vụ tuyệt vời!"
                : "Không có booking nào khớp với bộ lọc này."
            }
          />
        ) : (
          <div className="mb-list">
            {filtered.map((booking) => (
              <BookingItem key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}

/* ──────────── Booking Item Card ──────────── */
function BookingItem({ booking }) {
  const details = booking.bookingDetails || [];

  return (
    <article className="mb-booking">
      {/* Header row */}
      <div className="mb-booking-header">
        <div>
          <div className="mb-booking-code">{booking.bookingCode || `#${booking.id}`}</div>
          <div className="mb-booking-date-created">
            Tạo lúc: {formatDateTime(booking.createdAt)}
          </div>
        </div>
        <StatusBadge variant={getStatusVariant(booking.status)} dot>
          {getBookingStatusLabel(booking.status)}
        </StatusBadge>
      </div>

      {/* Body */}
      <div className="mb-booking-body">
        {/* Overall info */}
        <div className="mb-details-grid">
          {booking.guestName && (
            <div className="mb-detail-item">
              <span className="mb-detail-label">Khách hàng</span>
              <span className="mb-detail-value">{booking.guestName}</span>
            </div>
          )}
          {booking.guestPhone && (
            <div className="mb-detail-item">
              <span className="mb-detail-label">Điện thoại</span>
              <span className="mb-detail-value">{booking.guestPhone}</span>
            </div>
          )}
          {booking.guestEmail && (
            <div className="mb-detail-item">
              <span className="mb-detail-label">Email</span>
              <span className="mb-detail-value">{booking.guestEmail}</span>
            </div>
          )}
          {(booking.numAdults != null || booking.numChildren != null) && (
            <div className="mb-detail-item">
              <span className="mb-detail-label">Số khách</span>
              <span className="mb-detail-value">
                {booking.numAdults ?? 0} người lớn
                {booking.numChildren ? `, ${booking.numChildren} trẻ em` : ""}
              </span>
            </div>
          )}
        </div>

        {/* Room details */}
        {details.length > 0 && (
          <div className="mb-rooms">
            {details.map((d, i) => (
              <div className="mb-room" key={d.id || i}>
                <div className="mb-room-name">
                  <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6, color: "var(--g-primary)" }}>
                    hotel
                  </span>
                  {d.roomTypeName || "Phòng"}
                  {d.roomNumber ? ` — ${d.roomNumber}` : ""}
                </div>
                <div className="mb-room-dates">
                  {formatDate(d.checkInDate)} → {formatDate(d.checkOutDate)}
                </div>
                <div className="mb-room-price">
                  {formatCurrency(d.totalPrice || d.estimatedPrice || 0)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Note */}
        {booking.note && (
          <div className="mb-note">
            <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: "middle", marginRight: 4 }}>
              sticky_note_2
            </span>
            {booking.note}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mb-booking-footer">
        <div className="mb-total">
          Tạm tính:
          <span className="mb-total-amount">
            {formatCurrency(booking.totalEstimatedAmount || 0)}
          </span>
        </div>
        {booking.source && (
          <div style={{ fontSize: "var(--g-text-xs)", color: "var(--g-text-muted)" }}>
            Nguồn: {booking.source === "online" ? "Trực tuyến" : booking.source === "walk_in" ? "Tại quầy" : booking.source}
          </div>
        )}
      </div>
    </article>
  );
}
