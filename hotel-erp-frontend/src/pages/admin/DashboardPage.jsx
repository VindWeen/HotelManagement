// src/pages/admin/DashboardPage.jsx
// Dashboard thực tế — tích hợp API: Bookings, Rooms, Users, Reviews, Vouchers, LossAndDamages, Equipments
import { Fragment, useState, useEffect, useCallback, useMemo } from "react";
import { getBookings } from "../../api/bookingsApi";
import { getRooms } from "../../api/roomsApi";
import { getUsers } from "../../api/userManagementApi";
import { getReviews } from "../../api/reviewsApi";
import { getVouchers } from "../../api/vouchersApi";
import { getRoomTypes } from "../../api/roomTypesApi";
import { getEquipments } from "../../api/equipmentsApi";
import { getInvoices } from "../../api/invoicesApi";
import { useResponsiveAdmin } from "../../hooks/useResponsiveAdmin";
import axiosClient from "../../api/axios";
import { getCurrentDashboard, rebuildAllCurrent } from "../../api/dashboardPeriodsApi";
import { useAdminAuthStore } from "../../store/adminAuthStore";
import AdminPeriodDashboardIllustration from "../../components/admin/AdminPeriodDashboardIllustration";

const DASHBOARD_PAGE_SIZE = 200;

// ─── Utility ─────────────────────────────────────────────────────────────────
const fmt = (n) =>
  n == null
    ? "?"
    : new Intl.NumberFormat("vi-VN").format(n);

const fmtCurrency = (n) =>
  n == null
    ? "?"
    : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "?";

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "?";

// ─── Status Config ─────────────────────────────────────────────────────────────
const isSameDay = (date, target) =>
  date &&
  target &&
  date.getFullYear() === target.getFullYear() &&
  date.getMonth() === target.getMonth() &&
  date.getDate() === target.getDate();

const _getBookingRevenueDate = (booking) => {
  if (booking?.checkOutTime) return new Date(booking.checkOutTime);
  const fallback = booking?.bookingDetails?.[0]?.checkOutDate;
  return fallback ? new Date(fallback) : null;
};

const getBookingReferenceDate = (booking) => {
  if (booking?.checkInTime) return new Date(booking.checkInTime);
  if (booking?.checkInDate) return new Date(booking.checkInDate);
  const fallback = booking?.bookingDetails?.[0]?.checkInDate;
  return fallback ? new Date(fallback) : null;
};

const getInvoiceRevenueDate = (invoice) => {
  if (invoice?.booking?.bookingDetails?.length > 0) {
    const checkOutDates = invoice.booking.bookingDetails.map(d => new Date(d.checkOutDate).getTime());
    return new Date(Math.max(...checkOutDates));
  }
  return invoice?.createdAt ? new Date(invoice.createdAt) : null;
};

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const getPagedTotal = (payload, fallbackLength = 0) =>
  payload?.pagination?.totalItems ??
  payload?.pagination?.total ??
  payload?.total ??
  payload?.data?.length ??
  fallbackLength;

async function fetchAllPages(fetcher, params = {}) {
  const items = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const res = await fetcher({ ...params, page, pageSize: DASHBOARD_PAGE_SIZE });
    const payload = res.data || {};
    const pageItems = Array.isArray(payload) ? payload : (payload.data || []);
    const total = getPagedTotal(payload, pageItems.length);

    items.push(...pageItems);
    totalPages = Math.max(1, Math.ceil(total / DASHBOARD_PAGE_SIZE));

    if (pageItems.length === 0) break;
    page += 1;
  }

  return items;
}

const STATUS_CFG = {
  Pending: { label: "Chờ xử lý", bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
  Confirmed: { label: "Đã xác nhận", bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
  Checked_in: { label: "Đang ở", bg: "#d1fae5", color: "#065f46", dot: "#10b981" },
  Checked_out_pending_settlement: { label: "Chờ thanh toán", bg: "#ffedd5", color: "#9a3412", dot: "#f97316" },
  Completed: { label: "Hoàn thành", bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" },
  Cancelled: { label: "Đã huỷ", bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
};

// Room Business Status Config 
const getRoomStatusKey = (rm) => {
  if (rm.businessStatus === "Disabled") return "Maintenance";
  if (rm.businessStatus === "Occupied") return "Occupied";
  if (rm.businessStatus === "Available" && rm.cleaningStatus === "Clean") return "Ready";
  if (rm.businessStatus === "Available" && rm.cleaningStatus === "PendingLoss") return "PendingLoss";
  return "Cleaning";
};

const ROOM_BS_CFG = {
  Ready: {
    bg: "#f0fdf4", border: "#bbf7d0", dot: "#16a34a", label: "Sẵn sàng",
    badge_bg: "#dcfce7", badge_color: "#14532d",
  },
  Occupied: {
    bg: "#fff7ed", border: "#fed7aa", dot: "#ea580c", label: "Đang có khách",
    badge_bg: "#ffedd5", badge_color: "#7c2d12",
  },
  Cleaning: {
    bg: "#fff1f2", border: "#fecdd3", dot: "#dc2626", label: "Cần dọn dẹp",
    badge_bg: "#fee2e2", badge_color: "#7f1d1d",
  },
  PendingLoss: {
    bg: "#fdf2f8", border: "#fbcfe8", dot: "#e11d48", label: "Chờ xử lý thất thoát",
    badge_bg: "#fce7f3", badge_color: "#9d174d",
  },
  Maintenance: {
    bg: "#f3f4f6", border: "#d1d5db", dot: "#6b7280", label: "Bảo trì",
    badge_bg: "#e5e7eb", badge_color: "#374151",
  },
};

// ─── Skeleton ────────────────────────────────────────────────────────────────
const DASH_STATUS_CFG = {
  Pending: { label: "Chờ xử lý", bg: "var(--a-warning-bg)", color: "var(--a-warning)", dot: "var(--a-warning)" },
  Confirmed: { label: "Đã xác nhận", bg: "var(--a-info-bg)", color: "var(--a-info)", dot: "var(--a-info)" },
  Checked_in: { label: "Đang ở", bg: "var(--a-success-bg)", color: "var(--a-success)", dot: "var(--a-success)" },
  Checked_out_pending_settlement: { label: "Chờ thanh toán", bg: "var(--a-warning-bg)", color: "var(--a-warning)", dot: "var(--a-warning)" },
  Completed: { label: "Hoàn thành", bg: "var(--a-surface-bright)", color: "var(--a-text-muted)", dot: "var(--a-text-soft)" },
  Cancelled: { label: "Đã huỷ", bg: "var(--a-error-bg)", color: "var(--a-error)", dot: "var(--a-error)" },
};

const DASH_ROOM_BS_CFG = {
  Ready: {
    bg: "var(--a-success-bg)", border: "var(--a-success-border)", dot: "var(--a-success)", label: "Sẵn sàng",
    badge_bg: "var(--a-success-bg)", badge_color: "var(--a-success)",
  },
  Occupied: {
    bg: "var(--a-warning-bg)", border: "var(--a-warning-border)", dot: "var(--a-warning)", label: "Đang có khách",
    badge_bg: "var(--a-warning-bg)", badge_color: "var(--a-warning)",
  },
  Cleaning: {
    bg: "var(--a-error-bg)", border: "var(--a-error-border)", dot: "var(--a-error)", label: "Cần dọn dẹp",
    badge_bg: "var(--a-error-bg)", badge_color: "var(--a-error)",
  },
  PendingLoss: {
    bg: "color-mix(in srgb, var(--a-error-bg) 68%, var(--a-warning-bg))", border: "color-mix(in srgb, var(--a-error-border) 72%, var(--a-warning-border))", dot: "var(--a-error)", label: "Chờ xử lý thất thoát",
    badge_bg: "color-mix(in srgb, var(--a-error-bg) 72%, var(--a-warning-bg))", badge_color: "var(--a-error)",
  },
  Maintenance: {
    bg: "var(--a-surface-bright)", border: "var(--a-border-strong)", dot: "var(--a-text-muted)", label: "Bảo trì",
    badge_bg: "var(--a-surface-bright)", badge_color: "var(--a-text-muted)",
  },
};

const DASH_KPI_CARDS = [
  { icon: "payments", intent: "brand", iconColor: "var(--a-brand-ink)", label: "Tổng doanh thu", subTone: "var(--a-brand-ink)", delay: 0 },
  { icon: "confirmation_number", intent: "info", iconColor: "var(--a-info)", label: "Booking đang hoạt động", subTone: "var(--a-warning)", delay: 60 },
  { icon: "meeting_room", intent: "error", iconColor: "var(--a-error)", label: "Tỷ lệ lấp đầy", subTone: "var(--a-success)", delay: 120 },
  { icon: "group", intent: "warning", iconColor: "var(--a-warning)", label: "Tài khoản hệ thống", subTone: "var(--a-text-muted)", delay: 180 },
];

const Skel = ({ w = "100%", h = 16, r = 8, style = {} }) => (
  <div
    className="admin-skeleton"
    style={{
      width: w, height: h, borderRadius: r,
      ...style,
    }}
  />
);

// ─── Mini Bar Chart ──────────────────────────────────────────────────────────
function MiniBar({ data, labels, color = "var(--a-primary)" }) {
  if (!data?.length) return null;
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
          <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
            <div
              style={{
                width: "100%",
                height: `${(v / max) * 100}%`,
                background: color,
                borderRadius: "4px 4px 2px 2px",
                minHeight: 4,
                transition: "height .4s ease",
                opacity: i === data.length - 1 ? 1 : 0.45 + (i / data.length) * 0.55,
              }}
            />
          </div>
          {labels?.[i] && (
            <span style={{ fontSize: 9, color: "var(--a-text-soft)", fontWeight: 600, whiteSpace: "nowrap" }}>
              {labels[i]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Star Rating ────────────────────────────────────────────────────────────────
function Stars({ rating }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span
          key={s}
          className="material-symbols-outlined"
          style={{
            fontSize: 13,
            color: s <= rating ? "var(--a-warning)" : "var(--a-border-strong)",
            fontVariationSettings: "'FILL' 1",
          }}
        >star</span>
      ))}
    </span>
  );
}

function SectionCard({ title, subtitle, children, style = {}, action = null }) {
  return (
    <div
      className="card-in admin-card"
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, ...style }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h4 style={{ fontSize: 15, fontWeight: 800, color: "var(--a-text)", margin: "0 0 2px" }}>{title}</h4>
          {subtitle ? <p style={{ fontSize: 12, color: "var(--a-text-muted)", margin: 0 }}>{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function SummaryTile({ icon, label, value, sub, tint = "var(--a-info)", bg = "var(--a-info-bg)" }) {
  return (
    <div
      style={{
        background: "var(--a-surface-raised)",
        border: "1px solid var(--a-border)",
        borderRadius: 16,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--a-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 18, color: tint, background: bg, borderRadius: 10, padding: 8, fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--a-text)", letterSpacing: "-0.02em" }}>{value}</div>
      {sub ? <div style={{ fontSize: 12, color: "var(--a-text-soft)", fontWeight: 600 }}>{sub}</div> : null}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
// ─── Shared Period Helpers ───────────────────────────────────────────────────
function getPeriodFallbackRange(periodType) {
  const now = new Date();
  const start = new Date(now);

  switch (periodType) {
    case "DAILY":
      start.setHours(0, 0, 0, 0);
      break;
    case "WEEKLY": {
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "MONTHLY":
    default:
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { from: start, to: now };
}

export default function DashboardPage() {
  const { isMobile } = useResponsiveAdmin();
  const currentRole = useAdminAuthStore((s) => s.user?.role) || "Admin";
  const [loading, setLoading] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [_roomTypes, setRoomTypes] = useState([]);
  const [lossAndDamages, setLossAndDamages] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // ── Period Dashboard state ─────────────────────────────────────────────────────────────────────────────────────
  const [periodType, setPeriodType] = useState("MONTHLY");
  const [periodDashboard, setPeriodDashboard] = useState(null);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodRebuilding, setPeriodRebuilding] = useState(false);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    activeBookings: 0,
    pendingBookings: 0,
    occupancyRate: 0,
    availableRooms: 0,
    totalUsers: 0,
    newUsersThisMonth: 0,
    avgRating: 0,
    pendingReviews: 0,
    activeVouchers: 0,
    activeRoomTypes: 0,
    revenueByDay: [],
    bookingsByStatus: {},
    roomTypeOccupancy: [],
    totalLossValue: 0,
    pendingLoss: 0,
    confirmedLoss: 0,
    totalEquipments: 0,
    totalEquipmentUnits: 0,
    inUseEquipmentUnits: 0,
    damagedEquipmentUnits: 0,
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [bkRes, rmRes, usRes, rvApprovedRes, rvPendingRes, vcRes, rtRes, ldRes, eqRes, ivRes] = await Promise.allSettled([
        fetchAllPages(getBookings),
        getRooms(),
        fetchAllPages(getUsers),
        fetchAllPages(getReviews, { status: "approved" }),
        fetchAllPages(getReviews, { status: "pending" }),
        fetchAllPages(getVouchers),
        getRoomTypes(),
        axiosClient.get("/LossAndDamages?pageSize=500"),
        getEquipments({ pageSize: 500 }),
        fetchAllPages(getInvoices),
      ]);

      const bkList = bkRes.status === "fulfilled" ? bkRes.value : [];
      const rmList = rmRes.status === "fulfilled" ? (rmRes.value.data?.data || []) : [];
      const usList = usRes.status === "fulfilled" ? usRes.value : [];
      const approvedReviews = rvApprovedRes.status === "fulfilled" ? rvApprovedRes.value : [];
      const pendingReviewList = rvPendingRes.status === "fulfilled" ? rvPendingRes.value : [];
      const vcList = vcRes.status === "fulfilled" ? vcRes.value : [];
      const rtList = rtRes.status === "fulfilled"
        ? (Array.isArray(rtRes.value.data) ? rtRes.value.data : (rtRes.value.data?.data || []))
        : [];
      const ldPayload = ldRes.status === "fulfilled" ? ldRes.value.data : null;
      const ldList = Array.isArray(ldPayload) ? ldPayload : (ldPayload?.data || []);
      const eqPayload = eqRes.status === "fulfilled" ? eqRes.value.data : null;
      const eqList = Array.isArray(eqPayload) ? eqPayload : (eqPayload?.data || []);
      const ivList = ivRes.status === "fulfilled" ? ivRes.value : [];

      setBookings(bkList);
      setRooms(rmList);
      setReviews(approvedReviews);
      setVouchers(vcList);
      setRoomTypes(rtList);
      setLossAndDamages(ldList);
      setEquipments(eqList);
      setAllInvoices(ivList);
      setAllUsers(usList);

      const now = new Date();
      const ready = rmList.filter((r) => r.businessStatus === "Available" && r.cleaningStatus === "Clean").length;
      const occupied = rmList.filter((r) => r.businessStatus === "Occupied").length;
      const sellableRooms = rmList.filter((r) => r.businessStatus !== "Disabled").length || 1;
      const occupancyRate = Math.round((occupied / sellableRooms) * 100);

      const avgRating = approvedReviews.length > 0
        ? approvedReviews.reduce((sum, review) => sum + (review.rating || 0), 0) / approvedReviews.length
        : 0;
      const pendingReviews = pendingReviewList.length;
      const activeVouchers = vcList.filter((v) => v.isActive).length;
      const activeRoomTypes = rtList.filter((rt) => rt.isActive !== false).length;

      const roomTypeOccupancy = rtList.map((rt) => {
        const occupiedRt = rmList.filter((r) => r.roomTypeId === rt.id && r.businessStatus === "Occupied").length;
        const sellableRt = rmList.filter((r) => r.roomTypeId === rt.id && r.businessStatus !== "Disabled").length;
        return {
          id: rt.id, name: rt.name, occupied: occupiedRt, total: sellableRt,
          rate: sellableRt > 0 ? Math.round((occupiedRt / sellableRt) * 100) : 0,
        };
      }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

      const totalLossValue = ldList.reduce((sum, item) => sum + ((item.penaltyAmount || 0) * (item.quantity || 1)), 0);
      const pendingLoss = ldList.filter((l) => l.status === "Pending").length;
      const confirmedLoss = ldList.filter((l) => l.status === "Confirmed").length;
      const totalEquipments = eqList.length;
      const totalEquipmentUnits = eqList.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);
      const inUseEquipmentUnits = eqList.reduce((sum, item) => sum + (item.inUseQuantity || 0), 0);
      const damagedEquipmentUnits = eqList.reduce((sum, item) => sum + (item.damagedQuantity || 0), 0);

      // Static base stats (not date-filtered)
      setStats({
        occupancyRate, availableRooms: ready,
        totalUsers: usList.length,
        avgRating, pendingReviews, activeVouchers, activeRoomTypes,
        roomTypeOccupancy,
        totalLossValue, pendingLoss, confirmedLoss, totalEquipments,
        totalEquipmentUnits, inUseEquipmentUnits, damagedEquipmentUnits,
        // These will be overridden by filteredStats below:
        totalRevenue: 0, todayRevenue: 0,
        activeBookings: 0, pendingBookings: 0,
        newUsersThisMonth: 0,
        revenueByDay: Array(7).fill(0),
        bookingsByStatus: {},
      });
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPeriodDashboard = useCallback(async () => {
    setPeriodLoading(true);
    try {
      const res = await getCurrentDashboard(null, periodType);
      setPeriodDashboard(res.data);
    } catch {
      setPeriodDashboard(null);
    } finally {
      setPeriodLoading(false);
    }
  }, [periodType]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Fetch Period Dashboard khi periodType thay đổi ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadPeriodDashboard();
  }, [loadPeriodDashboard]);

  const handleRefreshAll = async () => {
    setPeriodRebuilding(true);
    try {
      await rebuildAllCurrent();
      await Promise.all([fetchAll(), loadPeriodDashboard()]);
    } catch (e) {
      console.error("Dashboard refresh failed:", e);
    } finally {
      setPeriodRebuilding(false);
    }
  };

  // ─── Compute date-filtered KPIs ──────────────────────────────────────────────
  const activePeriodRange = useMemo(() => {
    if (periodDashboard?.periodStart && periodDashboard?.periodEnd) {
      return {
        from: new Date(periodDashboard.periodStart),
        to: new Date(periodDashboard.periodEnd),
      };
    }

    return getPeriodFallbackRange(periodType);
  }, [periodDashboard?.periodStart, periodDashboard?.periodEnd, periodType]);

  const filteredStats = useMemo(() => {
    const now = new Date();
    const from = activePeriodRange.from;
    const to = activePeriodRange.to;

    const inRange = (date) => {
      if (!date) return false;
      if (from && date < from) return false;
      if (date > to) return false;
      return true;
    };

    const paidInvoices = allInvoices.filter((iv) => iv.status === "Paid" && inRange(getInvoiceRevenueDate(iv)));
    const totalRevenue = paidInvoices.reduce((s, iv) => s + (iv.finalTotal || 0), 0);
    const todayRevenue = allInvoices
      .filter((iv) => iv.status === "Paid" && isSameDay(getInvoiceRevenueDate(iv), now))
      .reduce((s, iv) => s + (iv.finalTotal || 0), 0);

    const filteredBookings = bookings.filter((b) => inRange(getBookingReferenceDate(b)));
    const activeBookings = filteredBookings.filter((b) => ["Confirmed", "Checked_in", "Checked_out_pending_settlement", "Pending"].includes(b.status)).length;
    const pendingBookings = filteredBookings.filter((b) => b.status === "Pending").length;

    const newUsersThisMonth = allUsers.filter((u) => {
      const d = u.createdAt ? new Date(u.createdAt) : null;
      return inRange(d);
    }).length;

    const paidInvoiceEntries = allInvoices
      .filter((iv) => iv.status === "Paid")
      .map((iv) => ({ ...iv, revenueDate: getInvoiceRevenueDate(iv) }))
      .filter((iv) => iv.revenueDate);

    const revenueByDay = (() => {
      if (periodType === "DAILY") {
        const buckets = Array.from({ length: 25 }, (_, hour) => ({
          label: `${hour}h`,
          value: 0,
        }));

        paidInvoiceEntries.forEach((invoice) => {
          if (!inRange(invoice.revenueDate)) return;
          buckets[invoice.revenueDate.getHours()].value += invoice.finalTotal || 0;
        });

        return buckets;
      }

      if (periodType === "WEEKLY") {
        const weekdayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
        const buckets = weekdayLabels.map((label) => ({ label, value: 0 }));

        paidInvoiceEntries.forEach((invoice) => {
          if (!inRange(invoice.revenueDate)) return;
          const dayIndex = invoice.revenueDate.getDay() === 0 ? 6 : invoice.revenueDate.getDay() - 1;
          buckets[dayIndex].value += invoice.finalTotal || 0;
        });

        return buckets;
      }

      const year = to.getFullYear();
      const buckets = Array.from({ length: 12 }, (_, index) => {
        return {
          label: `T${index + 1}`,
          value: 0,
          key: index,
        };
      });

      paidInvoiceEntries.forEach((invoice) => {
        if (!invoice.revenueDate) return;
        if (invoice.revenueDate.getFullYear() === year) {
          const monthIndex = invoice.revenueDate.getMonth();
          buckets[monthIndex].value += invoice.finalTotal || 0;
        }
      });

      return buckets.map(({ key, ...item }) => item);
    })();

    const bookingsByStatus = {};
    filteredBookings.forEach((b) => { bookingsByStatus[b.status] = (bookingsByStatus[b.status] || 0) + 1; });

    return { totalRevenue, todayRevenue, activeBookings, pendingBookings, newUsersThisMonth, revenueByDay, bookingsByStatus };
  }, [activePeriodRange, allInvoices, allUsers, bookings, periodType]);

  const activePeriodLabel = periodType === "DAILY"
    ? "Ngày"
    : periodType === "WEEKLY"
      ? "Tuần"
      : "Tháng";
  const hasPeriodKpis = (periodDashboard?.dashboard?.widgets?.kpiCards?.length || 0) > 0;
  const snapshotSummary = periodDashboard?.dashboard?.summary || {};
  const snapshotSections = periodDashboard?.dashboard?.widgets?.sections || {};
  const sharedSnapshot = periodDashboard?.dashboard?.widgets?.shared || {};
  const roleSectionKeyMap = {
    Admin: "admin",
    Manager: "manager",
    Receptionist: "receptionist",
    Accountant: "accountant",
    Housekeeping: "housekeeping",
    WarehouseStaff: "warehouseStaff",
  };
  const currentRoleSnapshot = snapshotSections?.[roleSectionKeyMap[currentRole]] || null;
  const recentBookingsSnapshot = sharedSnapshot?.recentBookings || [];
  const roomStatusSnapshot = sharedSnapshot?.roomStatus || {};
  const roomStatusCountsSnapshot = roomStatusSnapshot?.counts || {};
  const roomStatusGroupsSnapshot = roomStatusSnapshot?.roomsByStatus || {};
  const bookingStatusSnapshot = sharedSnapshot?.bookingsByStatus || {};
  const roomTypeOccupancySnapshot = sharedSnapshot?.roomTypeOccupancy || [];
  const reviewSummarySnapshot = sharedSnapshot?.reviewSummary || {};
  const quickStatsSnapshot = sharedSnapshot?.quickStats || {};
  const inventorySummarySnapshot = sharedSnapshot?.inventorySummary || {};
  const lossOverviewSnapshot = sharedSnapshot?.lossOverview || {};
  const usingSnapshotRoleSections = ["Receptionist", "Accountant", "Housekeeping", "WarehouseStaff"].includes(currentRole) && !!currentRoleSnapshot;
  const roleSectionLoading = usingSnapshotRoleSections ? false : loading;

  // Merge base stats + filtered stats
  const mergedStats = { ...stats, ...filteredStats };
  const filteredBookingList = useMemo(() => {
    if (recentBookingsSnapshot.length > 0) {
      return recentBookingsSnapshot;
    }

    const from = activePeriodRange.from;
    const to = activePeriodRange.to;
    const inRange = (date) => {
      if (!date) return false;
      if (from && date < from) return false;
      if (date > to) return false;
      return true;
    };
    return [...bookings]
      .filter((b) => inRange(getBookingReferenceDate(b)))
      .sort((a, b) => {
        const tA = getBookingReferenceDate(a)?.getTime() ?? 0;
        const tB = getBookingReferenceDate(b)?.getTime() ?? 0;
        if (tA !== tB) return tB - tA;
        return (b.id || 0) - (a.id || 0);
      })
      .slice(0, 8);
  }, [activePeriodRange, bookings, recentBookingsSnapshot]);

  const STATUS_ORDER = { Occupied: 0, Cleaning: 1, PendingLoss: 2, Maintenance: 3, Ready: 4 };
  const roomPreview = useMemo(() => {
    if (roomStatusGroupsSnapshot && Object.keys(roomStatusGroupsSnapshot).length > 0) {
      return [
        ...(roomStatusGroupsSnapshot.Occupied || []),
        ...(roomStatusGroupsSnapshot.Cleaning || []),
        ...(roomStatusGroupsSnapshot.PendingLoss || []),
        ...(roomStatusGroupsSnapshot.Maintenance || []),
        ...(roomStatusGroupsSnapshot.Ready || []),
      ];
    }

    return [...rooms].sort((a, b) => {
      const ka = STATUS_ORDER[getRoomStatusKey(a)] ?? 99;
      const kb = STATUS_ORDER[getRoomStatusKey(b)] ?? 99;
      if (ka !== kb) return ka - kb;
      return (a.roomNumber || "").localeCompare(b.roomNumber || "", "vi", { numeric: true });
    });
  }, [roomStatusGroupsSnapshot, rooms]);
  const bookingStatusData = Object.keys(bookingStatusSnapshot).length > 0
    ? bookingStatusSnapshot
    : mergedStats.bookingsByStatus;
  const statusEntries = Object.entries(bookingStatusData).sort((a, b) => b[1] - a[1]);
  const totalBk = Object.values(bookingStatusData).reduce((s, v) => s + v, 0) || 1;

  const revenueChartTitle = periodType === "DAILY"
    ? "Doanh thu theo giờ"
    : periodType === "WEEKLY"
      ? "Doanh thu trong tuần"
      : "Doanh thu 12 tháng";
  const revenueChartSubtitle = periodType === "DAILY"
    ? "Hiển thị từ 0h đến 24h"
    : periodType === "WEEKLY"
      ? "Tổng hợp theo T2, T3, T4, T5, T6, T7, CN"
      : `Hiển thị doanh thu các tháng trong năm ${(activePeriodRange.to || new Date()).getFullYear()}`;

  const roomCountByStatus = {
    Ready: roomStatusCountsSnapshot.ready ?? rooms.filter(r => r.businessStatus === "Available" && r.cleaningStatus === "Clean").length,
    Occupied: roomStatusCountsSnapshot.occupied ?? rooms.filter(r => r.businessStatus === "Occupied").length,
    Cleaning: roomStatusCountsSnapshot.cleaning ?? rooms.filter(r => r.businessStatus === "Available" && r.cleaningStatus === "Dirty").length,
    PendingLoss: roomStatusCountsSnapshot.pendingLoss ?? rooms.filter(r => r.businessStatus === "Available" && r.cleaningStatus === "PendingLoss").length,
    Maintenance: roomStatusCountsSnapshot.maintenance ?? rooms.filter(r => r.businessStatus === "Disabled").length,
  };

  const today = useMemo(() => new Date(), []);
  const todayArrivals = useMemo(
    () => currentRole === "Receptionist" && currentRoleSnapshot?.todayArrivals
      ? currentRoleSnapshot.todayArrivals
      : bookings
        .filter((b) => {
          const checkInDate = b.bookingDetails?.[0]?.checkInDate ? new Date(b.bookingDetails[0].checkInDate) : null;
          return checkInDate && isSameDay(checkInDate, today);
        })
        .sort((a, b) => (getBookingReferenceDate(a)?.getTime() ?? 0) - (getBookingReferenceDate(b)?.getTime() ?? 0))
        .slice(0, 6),
    [bookings, today, currentRole, currentRoleSnapshot]
  );
  const stayingGuests = useMemo(
    () => currentRole === "Receptionist" && currentRoleSnapshot?.stayingGuests
      ? currentRoleSnapshot.stayingGuests
      : bookings.filter((b) => b.status === "Checked_in").slice(0, 6),
    [bookings, currentRole, currentRoleSnapshot]
  );
  const pendingCheckoutBookings = useMemo(
    () => currentRole === "Receptionist" && currentRoleSnapshot?.pendingCheckoutBookings
      ? currentRoleSnapshot.pendingCheckoutBookings
      : bookings.filter((b) => b.status === "Checked_out_pending_settlement").slice(0, 6),
    [bookings, currentRole, currentRoleSnapshot]
  );
  const actionBookingList = useMemo(
    () => currentRole === "Receptionist" && currentRoleSnapshot?.actionBookings
      ? currentRoleSnapshot.actionBookings
      : bookings
        .filter((b) => b.status === "Pending" || b.status === "Confirmed")
        .sort((a, b) => (getBookingReferenceDate(a)?.getTime() ?? 0) - (getBookingReferenceDate(b)?.getTime() ?? 0))
        .slice(0, 6),
    [bookings, currentRole, currentRoleSnapshot]
  );

  const recentInvoices = useMemo(
    () => currentRole === "Accountant" && currentRoleSnapshot?.recentInvoices
      ? currentRoleSnapshot.recentInvoices
      : [...allInvoices]
        .sort((a, b) => (getInvoiceRevenueDate(b)?.getTime() ?? 0) - (getInvoiceRevenueDate(a)?.getTime() ?? 0))
        .slice(0, 6),
    [allInvoices, currentRole, currentRoleSnapshot]
  );
  const unpaidInvoices = useMemo(
    () => currentRole === "Accountant" && currentRoleSnapshot?.unpaidInvoices
      ? currentRoleSnapshot.unpaidInvoices
      : allInvoices
        .filter((iv) => ["Ready_To_Collect", "Unpaid", "Partially_Paid"].includes(iv.status))
        .sort((a, b) => (getInvoiceRevenueDate(b)?.getTime() ?? 0) - (getInvoiceRevenueDate(a)?.getTime() ?? 0))
        .slice(0, 6),
    [allInvoices, currentRole, currentRoleSnapshot]
  );
  const confirmedDamageRecords = useMemo(
    () => currentRole === "Accountant" && currentRoleSnapshot?.confirmedDamageRecords
      ? currentRoleSnapshot.confirmedDamageRecords
      : lossAndDamages
        .filter((item) => item.status === "Confirmed")
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 6),
    [lossAndDamages, currentRole, currentRoleSnapshot]
  );

  const cleaningRooms = useMemo(
    () => currentRole === "Housekeeping" && currentRoleSnapshot?.cleaningRooms
      ? currentRoleSnapshot.cleaningRooms
      : roomPreview.filter((room) => getRoomStatusKey(room) === "Cleaning").slice(0, 8),
    [roomPreview, currentRole, currentRoleSnapshot]
  );
  const pendingLossRooms = useMemo(
    () => currentRole === "Housekeeping" && currentRoleSnapshot?.pendingLossRooms
      ? currentRoleSnapshot.pendingLossRooms
      : roomPreview.filter((room) => getRoomStatusKey(room) === "PendingLoss").slice(0, 8),
    [roomPreview, currentRole, currentRoleSnapshot]
  );
  const readyRooms = useMemo(
    () => currentRole === "Housekeeping" && currentRoleSnapshot?.readyRooms
      ? currentRoleSnapshot.readyRooms
      : roomPreview.filter((room) => getRoomStatusKey(room) === "Ready").slice(0, 8),
    [roomPreview, currentRole, currentRoleSnapshot]
  );

  const lowStockItems = useMemo(
    () => currentRole === "WarehouseStaff" && currentRoleSnapshot?.lowStockItems
      ? currentRoleSnapshot.lowStockItems
      : equipments
        .filter((item) => (item.inStockQuantity ?? 0) <= Math.max(5, Math.ceil((item.totalQuantity || 0) * 0.2)))
        .sort((a, b) => (a.inStockQuantity ?? 0) - (b.inStockQuantity ?? 0))
        .slice(0, 8),
    [equipments, currentRole, currentRoleSnapshot]
  );
  const damagedInventoryItems = useMemo(
    () => currentRole === "WarehouseStaff" && currentRoleSnapshot?.damagedInventoryItems
      ? currentRoleSnapshot.damagedInventoryItems
      : equipments
        .filter((item) => (item.damagedQuantity || 0) > 0 || (item.liquidatedQuantity || 0) > 0)
        .sort((a, b) => ((b.damagedQuantity || 0) + (b.liquidatedQuantity || 0)) - ((a.damagedQuantity || 0) + (a.liquidatedQuantity || 0)))
        .slice(0, 8),
    [equipments, currentRole, currentRoleSnapshot]
  );
  const pendingReplenishmentRecords = useMemo(
    () => (currentRole === "Housekeeping" || currentRole === "WarehouseStaff") && currentRoleSnapshot?.pendingReplenishmentRecords
      ? currentRoleSnapshot.pendingReplenishmentRecords
      : lossAndDamages
        .filter((item) => item.status === "Confirmed" && ((item.replenishedQuantity || 0) < (item.quantity || 0)))
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 8),
    [lossAndDamages, currentRole, currentRoleSnapshot]
  );

  const receptionistData = currentRoleSnapshot && currentRole === "Receptionist"
    ? {
      summary: currentRoleSnapshot.summary || {},
      todayArrivals: currentRoleSnapshot.todayArrivals || [],
      stayingGuests: currentRoleSnapshot.stayingGuests || [],
      pendingCheckoutBookings: currentRoleSnapshot.pendingCheckoutBookings || [],
      actionBookings: currentRoleSnapshot.actionBookings || [],
    }
    : {
      summary: {},
      todayArrivals,
      stayingGuests,
      pendingCheckoutBookings,
      actionBookings: actionBookingList,
    };

  const accountantData = currentRoleSnapshot && currentRole === "Accountant"
    ? {
      summary: currentRoleSnapshot.summary || {},
      recentInvoices: currentRoleSnapshot.recentInvoices || [],
      unpaidInvoices: currentRoleSnapshot.unpaidInvoices || [],
      confirmedDamageRecords: currentRoleSnapshot.confirmedDamageRecords || [],
      revenueBreakdown: currentRoleSnapshot.revenueBreakdown || {},
    }
    : {
      summary: {},
      recentInvoices,
      unpaidInvoices,
      confirmedDamageRecords,
      revenueBreakdown: {
        roomRevenue: allInvoices.reduce((sum, iv) => sum + (iv.totalRoomAmount || 0), 0),
        serviceRevenue: allInvoices.reduce((sum, iv) => sum + (iv.totalServiceAmount || 0), 0),
        damageRevenue: allInvoices.reduce((sum, iv) => sum + (iv.totalDamageAmount || 0), 0),
      },
    };

  const housekeepingData = currentRoleSnapshot && currentRole === "Housekeeping"
    ? {
      summary: currentRoleSnapshot.summary || {},
      cleaningRooms: currentRoleSnapshot.cleaningRooms || [],
      pendingLossRooms: currentRoleSnapshot.pendingLossRooms || [],
      readyRooms: currentRoleSnapshot.readyRooms || [],
      pendingReplenishmentRecords: currentRoleSnapshot.pendingReplenishmentRecords || [],
    }
    : {
      summary: {},
      cleaningRooms,
      pendingLossRooms,
      readyRooms,
      pendingReplenishmentRecords,
    };

  const warehouseData = currentRoleSnapshot && currentRole === "WarehouseStaff"
    ? {
      summary: currentRoleSnapshot.summary || {},
      lowStockItems: currentRoleSnapshot.lowStockItems || [],
      pendingReplenishmentRecords: currentRoleSnapshot.pendingReplenishmentRecords || [],
      damagedInventoryItems: currentRoleSnapshot.damagedInventoryItems || [],
      inventorySummary: currentRoleSnapshot.inventorySummary || {},
    }
    : {
      summary: {},
      lowStockItems,
      pendingReplenishmentRecords,
      damagedInventoryItems,
      inventorySummary: {
        totalQuantity: mergedStats.totalEquipmentUnits,
        inUseQuantity: mergedStats.inUseEquipmentUnits,
        inStockQuantity: equipments.reduce((sum, item) => sum + (item.inStockQuantity || 0), 0),
      },
    };

  const fallbackKpiCards = useMemo(() => {
    const totalInvoiceValue = allInvoices.reduce((sum, item) => sum + (item.finalTotal || 0), 0);
    const unpaidInvoiceCount = allInvoices.filter((iv) => ["Ready_To_Collect", "Unpaid", "Partially_Paid"].includes(iv.status)).length;

    switch (currentRole) {
      case "Manager":
        return [
          { icon: "payments", intent: "brand", iconColor: "var(--a-brand-ink)", label: "Doanh thu kỳ", value: fmtCurrency(mergedStats.totalRevenue), sub: `Hôm nay: ${fmtCurrency(mergedStats.todayRevenue)}`, subColor: "var(--a-brand-ink)", delay: 0 },
          { icon: "meeting_room", intent: "error", iconColor: "var(--a-error)", label: "Công suất phòng", value: `${mergedStats.occupancyRate}%`, sub: `${mergedStats.availableRooms} phòng sẵn sàng`, subColor: "var(--a-success)", delay: 60 },
          { icon: "confirmation_number", intent: "info", iconColor: "var(--a-info)", label: "Booking vận hành", value: fmt(mergedStats.activeBookings), sub: `${mergedStats.pendingBookings} booking chờ xử lý`, subColor: "var(--a-warning)", delay: 120 },
          { icon: "warning", intent: "warning", iconColor: "var(--a-warning)", label: "Cảnh báo mở", value: fmt(mergedStats.pendingLoss + roomCountByStatus.Cleaning), sub: `${mergedStats.pendingLoss} pending loss`, subColor: "var(--a-text-muted)", delay: 180 },
        ];
      case "Receptionist":
        return [
          { icon: "login", intent: "success", iconColor: "var(--a-success)", label: "Khách đến hôm nay", value: fmt(todayArrivals.length), sub: `${stayingGuests.length} khách đang ở`, subColor: "var(--a-info)", delay: 0 },
          { icon: "hotel", intent: "info", iconColor: "var(--a-info)", label: "Khách đang lưu trú", value: fmt(stayingGuests.length), sub: `${pendingCheckoutBookings.length} chờ checkout`, subColor: "var(--a-warning)", delay: 60 },
          { icon: "task", intent: "warning", iconColor: "var(--a-warning)", label: "Booking chờ xử lý", value: fmt(actionBookingList.length), sub: `${roomCountByStatus.Ready} phòng sẵn sàng`, subColor: "var(--a-success)", delay: 120 },
          { icon: "payments", intent: "brand", iconColor: "var(--a-brand-ink)", label: "Chờ quyết toán", value: fmt(pendingCheckoutBookings.length), sub: `${fmtCurrency(unpaidInvoices.reduce((sum, iv) => sum + (iv.finalTotal || 0), 0))} cần thu`, subColor: "var(--a-brand-ink)", delay: 180 },
        ];
      case "Accountant":
        return [
          { icon: "receipt_long", intent: "info", iconColor: "var(--a-info)", label: "Tổng hóa đơn kỳ", value: fmt(recentInvoices.length), sub: `${fmt(allInvoices.length)} toàn hệ thống`, subColor: "var(--a-text-muted)", delay: 0 },
          { icon: "payments", intent: "brand", iconColor: "var(--a-brand-ink)", label: "Tổng giá trị hóa đơn", value: fmtCurrency(totalInvoiceValue), sub: `${fmtCurrency(mergedStats.totalRevenue)} đã thanh toán`, subColor: "var(--a-brand-ink)", delay: 60 },
          { icon: "pending_actions", intent: "warning", iconColor: "var(--a-warning)", label: "Hóa đơn chưa thanh toán", value: fmt(unpaidInvoiceCount), sub: `${fmtCurrency(unpaidInvoices.reduce((sum, iv) => sum + (iv.finalTotal || 0), 0))} cần follow-up`, subColor: "var(--a-warning)", delay: 120 },
          { icon: "report", intent: "error", iconColor: "var(--a-error)", label: "Thất thoát đã xác nhận", value: fmtCurrency(mergedStats.totalLossValue), sub: `${fmt(confirmedDamageRecords.length)} biên bản gần đây`, subColor: "var(--a-error)", delay: 180 },
        ];
      case "Housekeeping":
        return [
          { icon: "cleaning_services", intent: "error", iconColor: "var(--a-error)", label: "Phòng cần dọn", value: fmt(roomCountByStatus.Cleaning), sub: `${fmt(roomCountByStatus.PendingLoss)} pending loss`, subColor: "var(--a-warning)", delay: 0 },
          { icon: "warning", intent: "warning", iconColor: "var(--a-warning)", label: "Phòng pending loss", value: fmt(roomCountByStatus.PendingLoss), sub: `${fmt(mergedStats.pendingLoss)} biên bản mở`, subColor: "var(--a-error)", delay: 60 },
          { icon: "check_circle", intent: "success", iconColor: "var(--a-success)", label: "Phòng đã sẵn sàng", value: fmt(roomCountByStatus.Ready), sub: `${fmt(roomCountByStatus.Occupied)} đang có khách`, subColor: "var(--a-success)", delay: 120 },
          { icon: "inventory_2", intent: "info", iconColor: "var(--a-info)", label: "Vật tư cần phối hợp", value: fmt(pendingReplenishmentRecords.length), sub: `${fmt(equipments.length)} vật tư active`, subColor: "var(--a-info)", delay: 180 },
        ];
      case "WarehouseStaff":
        return [
          { icon: "inventory_2", intent: "info", iconColor: "var(--a-info)", label: "Tổng vật tư active", value: fmt(mergedStats.totalEquipments), sub: `${fmt(mergedStats.totalEquipmentUnits)} đơn vị`, subColor: "var(--a-info)", delay: 0 },
          { icon: "warehouse", intent: "success", iconColor: "var(--a-success)", label: "Tồn kho khả dụng", value: fmt(equipments.reduce((sum, item) => sum + (item.inStockQuantity || 0), 0)), sub: `${lowStockItems.length} vật tư sắp thiếu`, subColor: "var(--a-warning)", delay: 60 },
          { icon: "deployed_code", intent: "brand", iconColor: "var(--a-brand-ink)", label: "Vật tư đang dùng", value: fmt(mergedStats.inUseEquipmentUnits), sub: `${pendingReplenishmentRecords.length} cần bổ sung`, subColor: "var(--a-brand-ink)", delay: 120 },
          { icon: "dangerous", intent: "error", iconColor: "var(--a-error)", label: "Hư hỏng/chờ bổ sung", value: fmt(mergedStats.damagedEquipmentUnits + pendingReplenishmentRecords.length), sub: `${damagedInventoryItems.length} vật tư cần xử lý`, subColor: "var(--a-error)", delay: 180 },
        ];
      default:
        return [
          { icon: "payments", intent: "brand", iconColor: "var(--a-brand-ink)", label: "Tổng doanh thu", value: fmtCurrency(mergedStats.totalRevenue), sub: `Hôm nay: ${fmtCurrency(mergedStats.todayRevenue)}`, subColor: "var(--a-brand-ink)", delay: 0 },
          { icon: "confirmation_number", intent: "info", iconColor: "var(--a-info)", label: "Booking đang hoạt động", value: fmt(mergedStats.activeBookings), sub: `${mergedStats.pendingBookings} booking chờ cọc`, subColor: "var(--a-warning)", delay: 60 },
          { icon: "meeting_room", intent: "error", iconColor: "var(--a-error)", label: "Tỷ lệ lấp đầy", value: `${mergedStats.occupancyRate}%`, sub: `${mergedStats.availableRooms} phòng sẵn sàng`, subColor: "var(--a-success)", delay: 120 },
          { icon: "group", intent: "warning", iconColor: "var(--a-warning)", label: "Tài khoản hệ thống", value: fmt(mergedStats.totalUsers), sub: `+${fmt(mergedStats.newUsersThisMonth)} trong kỳ lọc`, subColor: "var(--a-text-muted)", delay: 180 },
        ];
    }
  }, [
    currentRole,
    mergedStats,
    roomCountByStatus,
    todayArrivals.length,
    stayingGuests.length,
    pendingCheckoutBookings.length,
    actionBookingList.length,
    unpaidInvoices,
    allInvoices,
    confirmedDamageRecords.length,
    pendingReplenishmentRecords.length,
    equipments,
    lowStockItems.length,
    damagedInventoryItems.length
  ]);

  const renderBookingList = (items, emptyText) => (
    roleSectionLoading ? (
      <div style={{ display: "grid", gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => <Skel key={i} h={72} r={14} />)}
      </div>
    ) : items.length === 0 ? (
      <div style={{ padding: "16px 0", textAlign: "center", color: "var(--a-text-muted)", fontSize: 13 }}>{emptyText}</div>
    ) : (
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((item) => {
          const referenceDate = getBookingReferenceDate(item);
          const cfg = DASH_STATUS_CFG[item.status] || DASH_STATUS_CFG.Cancelled;
          return (
            <div key={item.id} style={{ background: "var(--a-surface-raised)", border: "1px solid var(--a-border)", borderRadius: 14, padding: 14, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--a-text)" }}>{item.guestName || "Khách vãng lai"}</div>
                  <div style={{ fontSize: 12, color: "var(--a-text-muted)" }}>{item.bookingCode}</div>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 800, background: cfg.bg, color: cfg.color }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot }} />
                  {cfg.label}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, color: "var(--a-text-soft)" }}>
                <span>{referenceDate ? fmtDateTime(referenceDate) : "Chưa có lịch"}</span>
                <strong style={{ color: "var(--a-text)" }}>{fmtCurrency(item.totalEstimatedAmount)}</strong>
              </div>
            </div>
          );
        })}
      </div>
    )
  );

  const renderInvoiceList = (items, emptyText) => (
    roleSectionLoading ? (
      <div style={{ display: "grid", gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => <Skel key={i} h={58} r={14} />)}
      </div>
    ) : items.length === 0 ? (
      <div style={{ padding: "16px 0", textAlign: "center", color: "var(--a-text-muted)", fontSize: 13 }}>{emptyText}</div>
    ) : (
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((invoice) => (
          <div key={invoice.id} style={{ background: "var(--a-surface-raised)", border: "1px solid var(--a-border)", borderRadius: 14, padding: 14, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--a-text)" }}>Hóa đơn #{invoice.id}</div>
              <div style={{ fontSize: 12, color: "var(--a-text-muted)" }}>{fmtDateTime(invoice.createdAt)} · {invoice.status || "Draft"}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--a-text)" }}>{fmtCurrency(invoice.finalTotal)}</div>
            </div>
          </div>
        ))}
      </div>
    )
  );

  const renderEquipmentList = (items, emptyText, valueRenderer) => (
    roleSectionLoading ? (
      <div style={{ display: "grid", gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => <Skel key={i} h={58} r={14} />)}
      </div>
    ) : items.length === 0 ? (
      <div style={{ padding: "16px 0", textAlign: "center", color: "var(--a-text-muted)", fontSize: 13 }}>{emptyText}</div>
    ) : (
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((item) => (
          <div key={item.id} style={{ background: "var(--a-surface-raised)", border: "1px solid var(--a-border)", borderRadius: 14, padding: 14, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--a-text)" }}>{item.name}</div>
              <div style={{ fontSize: 12, color: "var(--a-text-muted)" }}>{item.itemCode} · {item.category}</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: "var(--a-text)" }}>
              {valueRenderer(item)}
            </div>
          </div>
        ))}
      </div>
    )
  );

  const renderRoomList = (items, emptyText, badgeText, badgeColor) => (
    roleSectionLoading ? (
      <div style={{ display: "grid", gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => <Skel key={i} h={58} r={14} />)}
      </div>
    ) : items.length === 0 ? (
      <div style={{ padding: "16px 0", textAlign: "center", color: "var(--a-text-muted)", fontSize: 13 }}>{emptyText}</div>
    ) : (
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((room) => (
          <div key={room.id} style={{ background: "var(--a-surface-raised)", border: "1px solid var(--a-border)", borderRadius: 14, padding: 14, display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--a-text)" }}>Phòng {room.roomNumber}</div>
              <div style={{ fontSize: 12, color: "var(--a-text-muted)" }}>{room.roomTypeName || "Chưa rõ loại phòng"}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: badgeColor }}>{badgeText}</span>
          </div>
        ))}
      </div>
    )
  );

  const renderDamageRecordList = (items, emptyText) => (
    roleSectionLoading ? (
      <div style={{ display: "grid", gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => <Skel key={i} h={58} r={14} />)}
      </div>
    ) : items.length === 0 ? (
      <div style={{ padding: "16px 0", textAlign: "center", color: "var(--a-text-muted)", fontSize: 13 }}>{emptyText}</div>
    ) : (
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((item) => (
          <div key={item.id} style={{ background: "var(--a-surface-raised)", border: "1px solid var(--a-border)", borderRadius: 14, padding: 14, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--a-text)" }}>Biên bản #{item.id}</div>
              <div style={{ fontSize: 12, color: "var(--a-text-muted)" }}>{fmtDateTime(item.createdAt)} · {item.status}</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 13, fontWeight: 800, color: "var(--a-error)" }}>{fmtCurrency(item.penaltyAmount)}</div>
          </div>
        ))}
      </div>
    )
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', sans-serif; }
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        .material-symbols-outlined { font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; vertical-align: middle; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes countUp { from{opacity:0;transform:scale(.85)} to{opacity:1;transform:scale(1)} }
        .card-in { animation: fadeUp .35s ease forwards; }
        .kpi-val { animation: countUp .45s cubic-bezier(.22,1,.36,1) forwards; }
        .refresh-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:12px; font-size:13px; font-weight:800; background:var(--a-surface); color:var(--a-text); border:1px solid var(--a-border); cursor:pointer; font-family:'Manrope',sans-serif; box-shadow:var(--a-shadow-sm); }
        .refresh-btn:hover { background:var(--a-primary-muted); border-color:var(--a-brand-border); color:var(--a-brand-ink); }
        .refresh-btn:active { transform:scale(.97); }
        @keyframes spin { to { transform:rotate(360deg) } }
        .spin { animation:spin .7s linear infinite; }
        .scroll-x { overflow-x:auto; }
        .scroll-x::-webkit-scrollbar { height: 4px; }
        .scroll-x::-webkit-scrollbar-track { background: transparent; }
        .scroll-x::-webkit-scrollbar-thumb { background: var(--a-border-strong); border-radius:9999px; }
        .progress-bar { height:6px; border-radius:9999px; background:var(--a-rail); overflow:hidden; }
        .progress-bar-inner { height:100%; border-radius:9999px; transition: width .6s ease; }
        tr.hover-row:hover td { background:color-mix(in srgb, var(--a-primary) 6%, var(--a-surface)); }
        .room-card { transition: transform .15s, box-shadow .15s; }
        .room-card:hover { transform: translateY(-2px); box-shadow: var(--a-shadow-sm); }
        .db-title { color:var(--a-text); }
        .db-subtitle { color:var(--a-text-muted); }
        .db-subtitle-highlight { color:var(--a-brand-ink); }
        .db-table-head { background:color-mix(in srgb, var(--a-surface-raised) 92%, transparent); }
        .db-border { border-color:var(--a-divider) !important; }
        .period-dashboard-layout { display:grid; grid-template-columns:minmax(0,1.5fr) minmax(280px, 1fr); gap:18px; align-items:center; }
        .period-hero-panel { display:flex; align-items:center; justify-content:center; overflow:visible; min-height:100%; }
        .period-hero-illustration { width:100%; margin:0 auto; }
        .period-hero-illustration svg { width:100%; height:auto; display:block; }
        .period-hero-illustration [fill="#92E3A9"] { fill:var(--a-brand-ink) !important; }
        .period-hero-illustration [fill="#263238"] { fill:var(--a-text) !important; }
        .period-hero-illustration [fill="#ebebeb"],
        .period-hero-illustration [fill="#e0e0e0"],
        .period-hero-illustration [fill="#e6e6e6"],
        .period-hero-illustration [fill="#f0f0f0"],
        .period-hero-illustration [fill="#f5f5f5"],
        .period-hero-illustration [fill="#fafafa"] { fill:color-mix(in srgb, var(--a-surface) 60%, var(--a-border)) !important; }
        .period-hero-illustration [fill="#fff"] { fill:var(--a-surface) !important; }
        @media (max-width: 1024px) { .period-dashboard-layout { grid-template-columns:1fr; } }
      `}</style>

      <div className="admin-page" style={{ maxWidth: 1400, margin: "0 auto", fontFamily: "Manrope, sans-serif" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 className="db-title" style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 5px" }}>
              Tổng quan hoạt động
            </h2>
            <p className="db-subtitle" style={{ fontSize: 13, margin: 0 }}>
              Dữ liệu thực tế · Cập nhật lần cuối:{" "}
              <span className="db-subtitle-highlight" style={{ fontWeight: 600 }}>
                {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </p>
          </div>
          <button className="refresh-btn" onClick={handleRefreshAll} disabled={loading || periodLoading || periodRebuilding}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, ...((periodLoading || periodRebuilding) ? { animation: "spin .7s linear infinite" } : {}) }}>
              refresh
            </span>
            Làm mới
          </button>
        </div>

        {/* ── Period Dashboard Section ─────────────────────────────────────── */}
        <div className="card-in admin-card" style={{ padding: 22, marginBottom: 24, borderRadius: 18 }}>
          <div className="period-dashboard-layout">
            <div>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 800, color: "var(--a-text)", margin: "0 0 2px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                Dashboard theo kỳ
                {periodDashboard && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--a-text-muted)", background: "var(--a-surface-raised)", padding: "2px 8px", borderRadius: 6, border: "1px solid var(--a-border)" }}>
                    {periodDashboard.periodKey} · {periodDashboard.status}
                  </span>
                )}
              </h4>
              <p style={{ fontSize: 12, color: "var(--a-text-muted)", margin: 0 }}>
                Số liệu tổng hợp từ DB · Tự động cập nhật theo nghiệp vụ · Bộ lọc chung: <strong style={{ color: "var(--a-brand-ink)" }}>{activePeriodLabel}</strong>
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {["DAILY", "WEEKLY", "MONTHLY"].map(pt => (
                <button
                  key={pt}
                  onClick={() => setPeriodType(pt)}
                  style={{
                    padding: "6px 14px", borderRadius: 10, cursor: "pointer",
                    fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: 12,
                    border: "1.5px solid", transition: "all .15s",
                    borderColor: periodType === pt ? "var(--a-brand-border)" : "var(--a-border)",
                    background: periodType === pt ? "var(--a-primary-muted)" : "var(--a-surface)",
                    color: periodType === pt ? "var(--a-brand-ink)" : "var(--a-text-muted)",
                  }}
                >
                  {pt === "DAILY" ? "Ngày" : pt === "WEEKLY" ? "Tuần" : "Tháng"}
                </button>
              ))}
            </div>
          </div>

          {/* KPI Cards */}
          {periodLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
              {[1, 2, 3, 4].map(i => <Skel key={i} h={86} style={{ borderRadius: 12 }} />)}
            </div>
          ) : periodDashboard?.dashboard?.widgets?.kpiCards?.length > 0 ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
                {periodDashboard.dashboard.widgets.kpiCards.map((card, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "16px", borderRadius: 12,
                      background: "var(--a-surface-raised)", border: "1px solid var(--a-border)",
                    }}
                  >
                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--a-text-muted)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {card.title}
                    </p>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--a-text)", margin: "0 0 2px", letterSpacing: "-0.02em" }}>
                      {card.unit === "VND"
                        ? fmtCurrency(card.value)
                        : card.unit === "%"
                          ? `${card.value}%`
                          : fmt(card.value)}
                    </h3>
                    <span style={{ fontSize: 10, color: "var(--a-text-soft)", fontWeight: 600 }}>{card.unit}</span>
                  </div>
                ))}
              </div>

              {/* Comparison vs kỳ trước */}
              {periodDashboard?.comparison?.metrics && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--a-text-muted)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    So với kỳ trước
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {Object.entries(periodDashboard.comparison.metrics).map(([key, m]) => {
                      const LABELS = {
                        totalBookings: "Booking", totalRevenue: "Doanh thu",
                        occupancyRate: "Lấp đầy", damageReports: "Biên bản HH",
                        penaltyAmount: "Tiền đền bù", newCustomers: "KH mới",
                        dirtyRooms: "Phòng bẩn", pendingPaymentAmount: "Chưa TT",
                      };
                      const label = LABELS[key] || key;
                      const isUp = m.trend === "up";
                      const isDown = m.trend === "down";
                      const isGood = (m.directionMeaning === "higher_is_better" && isUp)
                        || (m.directionMeaning === "lower_is_better" && isDown);
                      const isBad = (m.directionMeaning === "higher_is_better" && isDown)
                        || (m.directionMeaning === "lower_is_better" && isUp);
                      const trendIcon = isUp ? "arrow_upward" : isDown ? "arrow_downward" : "remove";
                      return (
                        <div
                          key={key}
                          style={{
                            padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                            display: "flex", gap: 3, alignItems: "center",
                            background: isGood ? "var(--a-success-bg)" : isBad ? "var(--a-error-bg)" : "var(--a-surface-raised)",
                            color: isGood ? "var(--a-success)" : isBad ? "var(--a-error)" : "var(--a-text-muted)",
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>
                            {trendIcon}
                          </span>
                          {label}: <strong>{m.growthRate != null ? `${m.growthRate > 0 ? "+" : ""}${m.growthRate}%` : "—"}</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : !periodLoading ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--a-text-muted)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36, display: "block", marginBottom: 8, opacity: 0.35 }}>bar_chart</span>
              <p style={{ fontSize: 13, margin: 0 }}>Chưa có dữ liệu cho kỳ này.</p>
              <p style={{ fontSize: 12, margin: "4px 0 0", opacity: 0.7 }}>Dashboard sẽ hiển thị ngay khi hệ thống có snapshot cho kỳ đã chọn.</p>
            </div>
          ) : null}

          {/* Footer */}
          {periodDashboard && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--a-divider)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
              <span style={{ fontSize: 10, color: "var(--a-text-soft)", fontWeight: 600 }}>
                Cập nhật: {fmtDateTime(periodDashboard.updatedAt)} · v{periodDashboard.version}
              </span>
              <span style={{ fontSize: 10, color: "var(--a-text-soft)" }}>
                {periodDashboard.periodStart
                  ? `${fmtDate(periodDashboard.periodStart)} → ${fmtDate(periodDashboard.periodEnd)}`
                  : ""}
              </span>
            </div>
          )}
            </div>

            <div className="period-hero-panel">
              <div className="period-hero-illustration">
                <AdminPeriodDashboardIllustration />
              </div>
            </div>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-5" style={{ display: hasPeriodKpis ? "none" : undefined }}>
          {fallbackKpiCards.map((kpi, idx) => (
            <Fragment key={idx}>
            {/*
            {
              icon: "payments", intent: "brand", iconColor: "var(--a-brand-ink)",
              label: "Tổng doanh thu", value: loading ? null : fmtCurrency(mergedStats.totalRevenue),
              sub: loading ? null : `Hôm nay: ${fmtCurrency(mergedStats.todayRevenue)}`,
              subColor: "var(--a-brand-ink)", delay: 0,
            },
            {
              icon: "confirmation_number", intent: "info", iconColor: "var(--a-info)",
              label: "Booking đang hoạt động", value: loading ? null : fmt(mergedStats.activeBookings),
              sub: loading ? null : `${mergedStats.pendingBookings} booking chờ cọc`,
              subColor: "var(--a-warning)", delay: 60,
            },
            {
              icon: "meeting_room", intent: "error", iconColor: "var(--a-error)",
              label: "Tỷ lệ lấp đầy", value: loading ? null : `${mergedStats.occupancyRate}%`,
              sub: loading ? null : `${mergedStats.availableRooms} phòng sẵn sàng`,
              subColor: "var(--a-success)", delay: 120,
            },
            {
              icon: "group", intent: "warning", iconColor: "var(--a-warning)",
              label: "Tài khoản hệ thống", value: loading ? null : fmt(mergedStats.totalUsers),
              sub: loading ? null : `+${mergedStats.newUsersThisMonth} trong kỳ lọc`,
              subColor: "var(--a-text-muted)", delay: 180,
            },
            */}
            <div
              className="card-in admin-stat-card"
              data-intent={kpi.intent}
              style={{ padding: 22, animationDelay: `${kpi.delay}ms`, animationFillMode: "both" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div className="admin-stat-icon">
                  <span className="material-symbols-outlined" style={{ color: kpi.iconColor, fontSize: 22, fontVariationSettings: "'FILL' 1" }}>
                    {kpi.icon}
                  </span>
                </div>
              </div>
              <p className="admin-overline" style={{ margin: "0 0 4px" }}>
                {kpi.label}
              </p>
              {loading ? (
                <Skel h={28} w={120} style={{ marginBottom: 6 }} />
              ) : (
                <div className="kpi-val" style={{ animationDelay: `${kpi.delay + 80}ms`, animationFillMode: "both" }}>
                  <h3 className="admin-kpi-value" style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>
                    {kpi.value}
                  </h3>
                </div>
              )}
              {loading ? <Skel h={12} w={140} /> : (
                <p style={{ fontSize: 11, fontWeight: 600, color: kpi.subColor, margin: 0 }}>{kpi.sub}</p>
              )}
            </div>
            </Fragment>
          ))}
        </div>

        {currentRole === "Receptionist" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-5">
              <SummaryTile icon="login" label="Khách đến hôm nay" value={fmt(receptionistData.summary.arrivals ?? todayArrivals.length)} sub={`${fmt(receptionistData.summary.pendingHandlingBookings ?? actionBookingList.length)} booking đang chờ xử lý`} tint="var(--a-success)" bg="var(--a-success-bg)" />
              <SummaryTile icon="hotel" label="Khách đang lưu trú" value={fmt(receptionistData.summary.stayingGuests ?? stayingGuests.length)} sub={`${fmt(receptionistData.summary.pendingCheckout ?? pendingCheckoutBookings.length)} khách chờ trả phòng`} tint="var(--a-info)" bg="var(--a-info-bg)" />
              <SummaryTile icon="meeting_room" label="Phòng sẵn sàng nhận khách" value={fmt(receptionistData.summary.readyRooms ?? roomCountByStatus.Ready)} sub={`${fmt(receptionistData.summary.cleaningRooms ?? roomCountByStatus.Cleaning)} phòng đang dọn`} tint="var(--a-brand-ink)" bg="var(--a-primary-muted)" />
              <SummaryTile icon="payments" label="Khoản cần quyết toán" value={fmtCurrency(receptionistData.summary.outstandingSettlementValue ?? unpaidInvoices.reduce((sum, iv) => sum + (iv.finalTotal || 0), 0))} sub={`${fmt(unpaidInvoices.length)} hóa đơn chưa xong`} tint="var(--a-warning)" bg="var(--a-warning-bg)" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              <SectionCard title="Khách đến hôm nay" subtitle="Ưu tiên check-in trong ngày">
                {renderBookingList(todayArrivals, "Không có khách đến hôm nay")}
              </SectionCard>
              <SectionCard title="Khách đang lưu trú" subtitle="Các booking đang ở trạng thái Checked-in">
                {renderBookingList(stayingGuests, "Không có khách đang lưu trú")}
              </SectionCard>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              <SectionCard title="Chờ trả phòng và quyết toán" subtitle="Theo dõi các booking cần hoàn tất thủ tục">
                {renderBookingList(pendingCheckoutBookings, "Không có booking chờ trả phòng")}
              </SectionCard>
              <SectionCard title="Booking mới hoặc chờ xử lý" subtitle="Booking Pending và Confirmed cần follow-up">
                {renderBookingList(actionBookingList, "Không có booking chờ xử lý")}
              </SectionCard>
            </div>
          </>
        )}

        {currentRole === "Accountant" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-5">
              <SummaryTile icon="receipt_long" label="Tổng hóa đơn" value={fmt(accountantData.summary.totalInvoices ?? recentInvoices.length)} sub={`${fmt(recentInvoices.length)} hóa đơn gần đây`} tint="var(--a-info)" bg="var(--a-info-bg)" />
              <SummaryTile icon="payments" label="Tổng giá trị" value={fmtCurrency(accountantData.summary.totalInvoiceValue ?? recentInvoices.reduce((sum, iv) => sum + (iv.finalTotal || 0), 0))} sub={`${fmtCurrency(mergedStats.totalRevenue)} đã thanh toán`} tint="var(--a-brand-ink)" bg="var(--a-primary-muted)" />
              <SummaryTile icon="pending_actions" label="Chưa thanh toán" value={fmt(accountantData.summary.unpaidInvoiceCount ?? unpaidInvoices.length)} sub={`${fmtCurrency(accountantData.summary.unpaidInvoiceValue ?? unpaidInvoices.reduce((sum, iv) => sum + (iv.finalTotal || 0), 0))} cần thu`} tint="var(--a-warning)" bg="var(--a-warning-bg)" />
              <SummaryTile icon="report" label="Thất thoát đã xác nhận" value={fmtCurrency(accountantData.summary.confirmedLossValue ?? confirmedDamageRecords.reduce((sum, item) => sum + (item.penaltyAmount || 0), 0))} sub={`${fmt(confirmedDamageRecords.length)} biên bản gần đây`} tint="var(--a-error)" bg="var(--a-error-bg)" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              <SectionCard title="Hóa đơn gần đây" subtitle="Theo dõi các khoản thu vừa phát sinh">
                {renderInvoiceList(recentInvoices, "Chưa có hóa đơn nào")}
              </SectionCard>
              <SectionCard title="Hóa đơn chưa thanh toán" subtitle="Ưu tiên follow-up các khoản còn treo">
                {renderInvoiceList(unpaidInvoices, "Không có hóa đơn chờ xử lý")}
              </SectionCard>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              <SectionCard title="Breakdown doanh thu" subtitle="Tách theo nguồn thu chính">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  <SummaryTile icon="bed" label="Doanh thu phòng" value={fmtCurrency(accountantData.revenueBreakdown.roomRevenue ?? 0)} tint="var(--a-success)" bg="var(--a-success-bg)" />
                  <SummaryTile icon="room_service" label="Doanh thu dịch vụ" value={fmtCurrency(accountantData.revenueBreakdown.serviceRevenue ?? 0)} tint="var(--a-info)" bg="var(--a-info-bg)" />
                  <SummaryTile icon="warning" label="Doanh thu thất thoát" value={fmtCurrency(accountantData.revenueBreakdown.damageRevenue ?? 0)} tint="var(--a-error)" bg="var(--a-error-bg)" />
                </div>
              </SectionCard>
              <SectionCard title="Biên bản thất thoát đã xác nhận" subtitle="Các khoản có thể cần hạch toán hoặc đối soát">
                {renderDamageRecordList(confirmedDamageRecords, "Không có biên bản đã xác nhận")}
              </SectionCard>
            </div>
          </>
        )}

        {currentRole === "Housekeeping" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-5">
              <SummaryTile icon="cleaning_services" label="Phòng cần dọn" value={fmt(housekeepingData.summary.cleaningRooms ?? roomCountByStatus.Cleaning)} sub={`${fmt(cleaningRooms.length)} phòng ưu tiên`} tint="var(--a-error)" bg="var(--a-error-bg)" />
              <SummaryTile icon="warning" label="Phòng pending loss" value={fmt(housekeepingData.summary.pendingLossRooms ?? roomCountByStatus.PendingLoss)} sub={`${fmt(housekeepingData.summary.pendingLossCount ?? mergedStats.pendingLoss)} biên bản đang mở`} tint="var(--a-warning)" bg="var(--a-warning-bg)" />
              <SummaryTile icon="check_circle" label="Phòng đã sẵn sàng" value={fmt(housekeepingData.summary.readyRooms ?? roomCountByStatus.Ready)} sub={`${fmt(readyRooms.length)} phòng nổi bật`} tint="var(--a-success)" bg="var(--a-success-bg)" />
              <SummaryTile icon="inventory_2" label="Cần phối hợp vật tư" value={fmt(pendingReplenishmentRecords.length)} sub={`${fmt(housekeepingData.summary.activeEquipments ?? inventorySummarySnapshot.totalEquipments ?? equipments.length)} vật tư active`} tint="var(--a-info)" bg="var(--a-info-bg)" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              <SectionCard title="Phòng cần dọn ngay" subtitle="Các phòng Dirty cần housekeeping xử lý">
                {renderRoomList(cleaningRooms, "Không có phòng cần dọn", "Cần dọn", "var(--a-error)")}
              </SectionCard>
              <SectionCard title="Phòng pending loss" subtitle="Các phòng cần phối hợp thêm với bộ phận liên quan">
                {renderRoomList(pendingLossRooms, "Không có phòng pending loss", "Pending loss", "var(--a-warning)")}
              </SectionCard>
            </div>
          </>
        )}

        {currentRole === "WarehouseStaff" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-5">
              <SummaryTile icon="inventory_2" label="Tổng vật tư active" value={fmt(warehouseData.summary.activeEquipments ?? inventorySummarySnapshot.totalEquipments ?? mergedStats.totalEquipments)} sub={`${fmt(warehouseData.inventorySummary.totalQuantity ?? inventorySummarySnapshot.totalQuantity ?? mergedStats.totalEquipmentUnits)} đơn vị`} tint="var(--a-info)" bg="var(--a-info-bg)" />
              <SummaryTile icon="warehouse" label="Tồn kho khả dụng" value={fmt(warehouseData.summary.totalInStock ?? inventorySummarySnapshot.inStockQuantity ?? equipments.reduce((sum, item) => sum + (item.inStockQuantity || 0), 0))} sub={`${fmt(lowStockItems.length)} vật tư sắp thiếu`} tint="var(--a-success)" bg="var(--a-success-bg)" />
              <SummaryTile icon="deployed_code" label="Vật tư đang dùng" value={fmt(warehouseData.summary.totalInUse ?? inventorySummarySnapshot.inUseQuantity ?? mergedStats.inUseEquipmentUnits)} sub={`${fmt(pendingReplenishmentRecords.length)} phiếu cần bổ sung`} tint="var(--a-brand-ink)" bg="var(--a-primary-muted)" />
              <SummaryTile icon="dangerous" label="Hư hỏng/liquidated" value={fmt(damagedInventoryItems.length)} sub={`${fmt(warehouseData.summary.totalDamaged ?? inventorySummarySnapshot.damagedQuantity ?? mergedStats.damagedEquipmentUnits)} đơn vị hư hỏng`} tint="var(--a-error)" bg="var(--a-error-bg)" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              <SectionCard title="Vật tư sắp thiếu" subtitle="Ưu tiên kiểm tra và bổ sung">
                {renderEquipmentList(lowStockItems, "Chưa có vật tư nào sắp thiếu", (item) => `${fmt(item.inStockQuantity)} tồn · ${fmt(item.totalQuantity)} tổng`)}
              </SectionCard>
              <SectionCard title="Loss/Damage cần bổ sung" subtitle="Các biên bản đã xác nhận nhưng chưa bổ sung đủ">
                {roleSectionLoading ? (
                  <div style={{ display: "grid", gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <Skel key={i} h={58} r={14} />)}</div>
                ) : pendingReplenishmentRecords.length === 0 ? (
                  <div style={{ padding: "16px 0", textAlign: "center", color: "var(--a-text-muted)", fontSize: 13 }}>Không có biên bản cần bổ sung</div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {pendingReplenishmentRecords.map((item) => (
                      <div key={item.id} style={{ background: "var(--a-surface-raised)", border: "1px solid var(--a-border)", borderRadius: 14, padding: 14, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--a-text)" }}>Biên bản #{item.id}</div>
                          <div style={{ fontSize: 12, color: "var(--a-text-muted)" }}>Cần bù {fmt((item.quantity || 0) - (item.replenishedQuantity || 0))} đơn vị</div>
                        </div>
                        <div style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: "var(--a-warning)" }}>{fmtDateTime(item.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              <SectionCard title="Vật tư hư hỏng hoặc liquidated" subtitle="Các vật tư cần xử lý riêng">
                {renderEquipmentList(damagedInventoryItems, "Không có vật tư hư hỏng", (item) => `${fmt((item.damagedQuantity || 0) + (item.liquidatedQuantity || 0))} cần xử lý`)}
              </SectionCard>
              <SectionCard title="Đối soát nhanh vật tư" subtitle="So sánh trạng thái tổng, dùng và tồn kho">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  <SummaryTile icon="inventory" label="Tổng số lượng" value={fmt(warehouseData.inventorySummary.totalQuantity ?? inventorySummarySnapshot.totalQuantity ?? mergedStats.totalEquipmentUnits)} tint="var(--a-info)" bg="var(--a-info-bg)" />
                  <SummaryTile icon="sync_alt" label="Đang dùng" value={fmt(warehouseData.inventorySummary.inUseQuantity ?? inventorySummarySnapshot.inUseQuantity ?? mergedStats.inUseEquipmentUnits)} tint="var(--a-brand-ink)" bg="var(--a-primary-muted)" />
                  <SummaryTile icon="warehouse" label="Tồn kho" value={fmt(warehouseData.inventorySummary.inStockQuantity ?? inventorySummarySnapshot.inStockQuantity ?? equipments.reduce((sum, item) => sum + (item.inStockQuantity || 0), 0))} tint="var(--a-success)" bg="var(--a-success-bg)" />
                </div>
              </SectionCard>
            </div>
          </>
        )}

        {/* REVENUE CHART & QUICK ACTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-7" style={{ display: ["Admin", "Manager"].includes(currentRole) ? undefined : "none" }}>
          {/* Thất thoát hư hỏng */}
          <div className="card-in admin-stat-card" data-intent="error" style={{ borderRadius: 18, padding: 22, animationDelay: "220ms", animationFillMode: "both" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div className="admin-stat-icon">
                <span className="material-symbols-outlined" style={{ color: "var(--a-error)", fontSize: 22, fontVariationSettings: "'FILL' 1" }}>report</span>
              </div>
              {!loading && (lossOverviewSnapshot.pendingLossCount ?? mergedStats.pendingLoss) > 0 && (
                <span className="admin-status-badge" data-intent="warning" style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px" }}>
                  {lossOverviewSnapshot.pendingLossCount ?? mergedStats.pendingLoss} chờ xử lý
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--a-text-soft)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tổng tiền đền bù ghi nhận</p>
            {loading ? <Skel h={28} w={140} style={{ marginBottom: 6 }} /> : (
              <div className="kpi-val" style={{ animationFillMode: "both" }}>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: "var(--a-error)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
                  {fmtCurrency(lossOverviewSnapshot.totalLossValue ?? mergedStats.totalLossValue)}
                </h3>
              </div>
            )}
            {loading ? <Skel h={12} w={160} /> : (
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--a-error)" }}>
                  {lossOverviewSnapshot.totalRecords ?? lossAndDamages.length} biên bản · {lossOverviewSnapshot.confirmedLossCount ?? mergedStats.confirmedLoss} đã xác nhận
                </span>
              </div>
            )}
          </div>

          {/* Tổng quan vật tư */}
          <div className="card-in admin-stat-card" data-intent="info" style={{ borderRadius: 18, padding: 22, animationDelay: "280ms", animationFillMode: "both" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div className="admin-stat-icon">
                <span className="material-symbols-outlined" style={{ color: "var(--a-info)", fontSize: 22, fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
              </div>
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--a-text-soft)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tổng số lượng vật tư</p>
            {loading ? <Skel h={28} w={80} style={{ marginBottom: 6 }} /> : (
              <div className="kpi-val" style={{ animationFillMode: "both" }}>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: "var(--a-info)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
                  {fmt(inventorySummarySnapshot.totalQuantity ?? mergedStats.totalEquipmentUnits)}
                </h3>
              </div>
            )}
            {loading ? <Skel h={12} w={160} /> : (
              <p style={{ fontSize: 11, fontWeight: 800, color: "var(--a-info)", margin: 0, opacity: 0.82 }}>
                {fmt(inventorySummarySnapshot.inUseQuantity ?? mergedStats.inUseEquipmentUnits)} đang dùng · {fmt(inventorySummarySnapshot.damagedQuantity ?? mergedStats.damagedEquipmentUnits)} hư hỏng
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Revenue + Room Type Occupancy */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5" style={{ display: ["Admin", "Manager"].includes(currentRole) ? undefined : "none" }}>
          <div className="card-in admin-card" style={{ padding: 24, animationDelay: "200ms", animationFillMode: "both" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 800, color: "var(--a-text)", margin: "0 0 2px" }}>{revenueChartTitle}</h4>
                <p style={{ fontSize: 12, color: "var(--a-text-muted)", margin: 0 }}>{revenueChartSubtitle}</p>
              </div>
              {!loading && (
                <span className="admin-status-badge" data-intent="success" style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px" }}>
                  {fmtCurrency((mergedStats.revenueByDay || []).reduce((s, item) => s + (item.value || 0), 0))}
                </span>
              )}
            </div>
            {loading ? (
              <div style={{ height: 80, display: "flex", alignItems: "flex-end", gap: 8 }}>
                {Array.from({ length: periodType === "DAILY" ? 12 : 7 }).map((_, i) => (
                  <Skel key={i} style={{ flex: 1, height: `${30 + Math.random() * 50}%`, borderRadius: "4px 4px 2px 2px" }} />
                ))}
              </div>
            ) : (
              <MiniBar data={(mergedStats.revenueByDay || []).map((item) => item.value)} labels={(mergedStats.revenueByDay || []).map((item) => item.label)} color="var(--a-brand-ink)" />
            )}
          </div>

          <div className="card-in admin-card" style={{ padding: 24, animationDelay: "260ms", animationFillMode: "both" }}>
            <div style={{ marginBottom: 18 }}>
              <h4 style={{ fontSize: 15, fontWeight: 800, color: "var(--a-text)", margin: "0 0 2px" }}>Tình trạng loại phòng</h4>
              <p style={{ fontSize: 12, color: "var(--a-text-muted)", margin: 0 }}>Tỷ lệ lấp đầy theo loại</p>
            </div>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <Skel h={12} w={100} />
                    <Skel h={6} r={9999} />
                  </div>
                ))}
              </div>
            ) : roomTypeOccupancySnapshot.length === 0 && mergedStats.roomTypeOccupancy.length === 0 ? (
              <p style={{ color: "var(--a-text-muted)", fontSize: 13, textAlign: "center", paddingTop: 16 }}>Không có dữ liệu</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {(roomTypeOccupancySnapshot.length > 0 ? roomTypeOccupancySnapshot : mergedStats.roomTypeOccupancy).map((rt, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--a-text)" }}>{rt.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: rt.rate > 70 ? "var(--a-success)" : rt.rate > 40 ? "var(--a-info)" : "var(--a-text-muted)" }}>
                        {rt.occupied}/{rt.total} ({rt.rate}%)
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-inner"
                        style={{ width: `${rt.rate}%`, background: rt.rate > 70 ? "var(--a-success)" : rt.rate > 40 ? "var(--a-info)" : "var(--a-border-strong)" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Booking Status + Reviews + Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5" style={{ display: ["Admin", "Manager"].includes(currentRole) ? undefined : "none" }}>
          <div className="card-in admin-card" style={{ padding: 24, animationDelay: "300ms", animationFillMode: "both" }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: "var(--a-text)", margin: "0 0 18px" }}>Phân loại booking</h4>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {Array.from({ length: 5 }).map((_, i) => <Skel key={i} h={14} />)}
              </div>
            ) : statusEntries.length === 0 ? (
              <p style={{ color: "var(--a-text-muted)", fontSize: 13 }}>Không có dữ liệu</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {statusEntries.map(([status, count]) => {
                  const cfg = DASH_STATUS_CFG[status] || DASH_STATUS_CFG.Cancelled;
                  const pct = Math.round((count / totalBk) * 100);
                  return (
                    <div key={status}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--a-text-muted)" }}>{cfg.label}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--a-text)" }}>{count}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-bar-inner" style={{ width: `${pct}%`, background: cfg.dot }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card-in admin-card" style={{ padding: 24, animationDelay: "360ms", animationFillMode: "both" }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: "var(--a-text)", margin: "0 0 4px" }}>Đánh giá khách hàng</h4>
            <p style={{ fontSize: 12, color: "var(--a-text-muted)", margin: "0 0 18px" }}>Đã duyệt</p>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Skel h={48} r={12} />
                <Skel h={12} />
                <Skel h={12} w={140} />
              </div>
            ) : (
              <>
                <div className="admin-emphasis-card" style={{ borderRadius: 14, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 11, color: "rgba(231,254,243,.6)", fontWeight: 600, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Điểm trung bình</p>
                    <p style={{ fontSize: 32, fontWeight: 800, color: "#e7fef3", margin: 0, lineHeight: 1 }}>
                      {(reviewSummarySnapshot.averageRating ?? mergedStats.avgRating).toFixed(1)}
                      <span style={{ fontSize: 14, color: "var(--a-emphasis-muted)", fontWeight: 500 }}>/5</span>
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <Stars rating={Math.round(reviewSummarySnapshot.averageRating ?? mergedStats.avgRating)} />
                    <span style={{ fontSize: 11, color: "rgba(231,254,243,.6)" }}>{reviewSummarySnapshot.totalReviews ?? reviews.length} đánh giá</span>
                  </div>
                </div>
                {(reviewSummarySnapshot.pendingReviews ?? mergedStats.pendingReviews) > 0 && (
                  <div className="admin-status-badge" data-intent="warning" style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 10, padding: "8px 12px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--a-warning)" }}>schedule</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--a-warning)" }}>{reviewSummarySnapshot.pendingReviews ?? mergedStats.pendingReviews} đánh giá chờ duyệt</span>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[5, 4, 3, 2, 1].map(star => {
                    const cnt = (reviewSummarySnapshot.distribution || []).find((item) => item.rating === star)?.count ?? reviews.filter(r => r.rating === star).length;
                    const totalReviews = reviewSummarySnapshot.totalReviews ?? reviews.length;
                    const pct = totalReviews > 0 ? Math.round((cnt / totalReviews) * 100) : 0;
                    return (
                      <div key={star} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--a-text-muted)", width: 8, textAlign: "right" }}>{star}</span>
                        <span className="material-symbols-outlined" style={{ fontSize: 12, color: "var(--a-warning)", fontVariationSettings: "'FILL' 1" }}>star</span>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-bar-inner" style={{ width: `${pct}%`, background: "var(--a-warning)" }} />
                        </div>
                        <span style={{ fontSize: 11, color: "var(--a-text-soft)", width: 22, textAlign: "right" }}>{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="card-in admin-card" style={{ padding: 24, animationDelay: "420ms", animationFillMode: "both", display: "flex", flexDirection: "column", gap: 16 }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: "var(--a-text)", margin: 0 }}>Thống kê nhanh</h4>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {Array.from({ length: 4 }).map((_, i) => <Skel key={i} h={52} r={12} />)}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { icon: "local_offer", iconColor: "#1e40af", bg: "#dbeafe", label: "Voucher đang hoạt động", value: fmt(quickStatsSnapshot.activeVouchers ?? mergedStats.activeVouchers), sub: `${fmt(quickStatsSnapshot.totalVouchers ?? vouchers.length)} tổng cộng` },
                  { icon: "bed", iconColor: "#065f46", bg: "#d1fae5", label: "Phòng sẵn sàng", value: fmt(quickStatsSnapshot.availableRooms ?? mergedStats.availableRooms), sub: `${fmt(quickStatsSnapshot.totalRooms ?? rooms.length)} phòng tổng` },
                  { icon: "category", iconColor: "#9333ea", bg: "#f3e8ff", label: "Loại phòng", value: fmt(quickStatsSnapshot.activeRoomTypes ?? mergedStats.activeRoomTypes), sub: "Loại phòng đang hoạt động" },
                  { icon: "people", iconColor: "#b45309", bg: "#fef3c7", label: "Tài khoản hệ thống", value: fmt(quickStatsSnapshot.totalUsers ?? mergedStats.totalUsers), sub: `+${fmt(quickStatsSnapshot.newUsersInPeriod ?? mergedStats.newUsersThisMonth)} trong kỳ lọc` },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: "var(--a-surface-raised)",
                      border: "1px solid var(--a-border)",
                      borderRadius: 12,
                      padding: "10px 14px",
                      boxShadow: "var(--a-shadow-xs)",
                    }}
                  >
                    <div style={{ padding: 8, background: item.bg, borderRadius: 10, flexShrink: 0, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: item.iconColor, fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, color: "var(--a-text-muted)", fontWeight: 600, margin: "0 0 1px" }}>{item.label}</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--a-text)", margin: 0 }}>{item.value}</p>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--a-text-soft)" }}>{item.sub}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Bookings Table */}
        <div className="card-in admin-card" style={{ overflow: "hidden", animationDelay: "460ms", animationFillMode: "both", marginBottom: 20, display: ["Admin", "Manager", "Receptionist"].includes(currentRole) ? undefined : "none" }}>
          <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--a-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: "var(--a-text)", margin: 0 }}>Booking gần đây</h4>
            <span style={{ fontSize: 12, color: "var(--a-text-muted)", fontWeight: 500 }}>
              {loading ? "..." : `${filteredBookingList.length} booking`}
            </span>
          </div>
          {isMobile ? (
            <div style={{ display: "grid", gap: 12, padding: 14 }}>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <Skel key={i} h={92} r={16} />)
              ) : filteredBookingList.length === 0 ? (
                <div style={{ padding: "28px 0", textAlign: "center", color: "var(--a-text-muted)", fontSize: 13 }}>Chưa có booking nào trong kỳ này</div>
              ) : filteredBookingList.map((b) => {
                const cfg = DASH_STATUS_CFG[b.status] || DASH_STATUS_CFG.Cancelled;
                const initial = (b.guestName || "?")[0].toUpperCase();
                return (
                  <article key={b.id} style={{ background: "var(--a-surface-raised)", border: "1px solid var(--a-border)", borderRadius: 16, padding: 14, display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(79,100,91,.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#4f645b", fontWeight: 900, fontSize: 12, flexShrink: 0 }}>{initial}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 900, color: "#4f645b" }}>{b.bookingCode}</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--a-text)" }}>{b.guestName || "Khach vang lai"}</div>
                        </div>
                      </div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 800, background: cfg.bg, color: cfg.color, whiteSpace: "nowrap" }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
                        {cfg.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--a-text-muted)" }}>{b.guestPhone || b.guestEmail || "-"}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, color: "var(--a-text-soft)" }}>
                      <span>{b.checkInTime ? fmtDateTime(b.checkInTime) : fmtDate(b.bookingDetails?.[0]?.checkInDate)}</span>
                      <strong style={{ color: "var(--a-text)" }}>{fmtCurrency(b.totalEstimatedAmount)}</strong>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="scroll-x">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                <thead>
                  <tr style={{ background: "color-mix(in srgb, var(--a-surface-raised) 88%, transparent)" }}>
                    {["Mã", "Khách hàng", "Liên hệ", "Ngày đặt", "Tổng tiền", "Trạng thái"].map((h, i) => (
                      <th key={h} style={{ padding: "12px 20px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--a-text-muted)", textAlign: i === 4 ? "right" : "left", borderBottom: "1px solid var(--a-border)", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} style={{ padding: "14px 20px" }}>
                            <Skel h={13} w={j === 4 ? 80 : j === 0 ? 70 : 120} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredBookingList.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "40px 0", textAlign: "center", color: "var(--a-text-muted)", fontSize: 13 }}>Chưa có booking nào trong kỳ này</td>
                    </tr>
                  ) : (
                    filteredBookingList.map((b) => {
                      const cfg = DASH_STATUS_CFG[b.status] || DASH_STATUS_CFG.Cancelled;
                      const initial = (b.guestName || "?")[0].toUpperCase();
                      return (
                        <tr key={b.id} className="hover-row" style={{ borderBottom: "1px solid var(--a-border)" }}>
                          <td style={{ padding: "14px 20px" }}>
                            <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "#4f645b", letterSpacing: "0.05em" }}>{b.bookingCode}</span>
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(79,100,91,.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#4f645b", fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                                {initial}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--a-text)" }}>{b.guestName || "Khách vãng lai"}</span>
                            </div>
                          </td>
                          <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--a-text-muted)" }}>{b.guestPhone || b.guestEmail || "—"}</td>
                          <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--a-text-muted)", whiteSpace: "nowrap" }}>
                            {b.checkInTime ? fmtDateTime(b.checkInTime) : fmtDate(b.bookingDetails?.[0]?.checkInDate)}
                          </td>
                          <td style={{ padding: "14px 20px", textAlign: "right" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--a-text)" }}>{fmtCurrency(b.totalEstimatedAmount)}</span>
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 9999, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                              <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
                              {cfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Room Status Grid */}
        <div className="card-in admin-card" style={{ overflow: "hidden", animationDelay: "500ms", animationFillMode: "both", display: ["Admin", "Manager", "Receptionist", "Housekeeping"].includes(currentRole) ? undefined : "none" }}>
          <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--a-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <h4 style={{ fontSize: 15, fontWeight: 800, color: "var(--a-text)", margin: 0 }}>Trạng thái phòng</h4>

            {/* Legend badges */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["Ready", "Occupied", "Cleaning", "PendingLoss", "Maintenance"]).map(status => {
                const cfg = DASH_ROOM_BS_CFG[status];
                const cnt = roomCountByStatus[status] || 0;
                return (
                  <span
                    key={status}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      fontSize: 11, fontWeight: 700,
                      background: cfg.badge_bg, color: cfg.badge_color,
                      padding: "4px 12px", borderRadius: 9999,
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
                    {loading ? "..." : cnt} {cfg.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div style={{ padding: "20px 28px" }}>
            {loading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                {Array.from({ length: 6 }).map((_, i) => <Skel key={i} h={90} r={12} />)}
              </div>
            ) : roomPreview.length === 0 ? (
              <p style={{ color: "var(--a-text-muted)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>Chưa có phòng nào</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                {(["Occupied", "Cleaning", "PendingLoss", "Maintenance", "Ready"]).map(statusKey => {
                  const groupRooms = (roomStatusGroupsSnapshot?.[statusKey] || []).length > 0
                    ? roomStatusGroupsSnapshot[statusKey]
                    : roomPreview.filter(r => getRoomStatusKey(r) === statusKey);
                  if (groupRooms.length === 0) return null;
                  const cfg = DASH_ROOM_BS_CFG[statusKey];
                  return (
                    <div key={statusKey}>
                      {/* Section header */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: cfg.badge_color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {cfg.label}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, background: cfg.badge_bg, color: cfg.badge_color, padding: "2px 8px", borderRadius: 9999 }}>
                          {groupRooms.length} phòng
                        </span>
                        <div style={{ flex: 1, height: 1, background: cfg.border }} />
                      </div>

                      {/* Room cards grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: 12 }}>
                        {groupRooms.map((rm) => {
                          const bsCfg = cfg;
                          const cleanOk = rm.cleaningStatus === "Clean";
                          return (
                            <div
                              key={rm.id}
                              className="room-card"
                              style={{
                                background: bsCfg.bg,
                                border: `1.5px solid ${bsCfg.border}`,
                                borderRadius: 14,
                                padding: "14px 16px",
                                cursor: "default",
                              }}
                            >
                              {/* Room number + status dot */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <span style={{ fontSize: 18, fontWeight: 800, color: "var(--a-text)", letterSpacing: "-0.02em" }}>
                                  {rm.roomNumber || rm.RoomNumber || `Phòng ${rm.id}`}
                                </span>
                                <span
                                  style={{
                                    width: 10, height: 10, borderRadius: "50%",
                                    background: bsCfg.dot, flexShrink: 0,
                                    boxShadow: `0 0 0 3px ${bsCfg.border}`,
                                  }}
                                />
                              </div>

                              {/* Room type / floor */}
                              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--a-text-soft)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {rm.roomTypeName || (rm.floor ? `Tầng ${rm.floor}` : "?")}
                              </p>

                              {/* Status badge + cleaning icon */}
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: bsCfg.badge_color }}>
                                  {bsCfg.label}
                                </span>
                                <span
                                  className="material-symbols-outlined"
                                  style={{
                                    fontSize: 15,
                                    color: cleanOk ? "#16a34a" : "#ea580c",
                                    fontVariationSettings: "'FILL' 1",
                                  }}
                                  title={cleanOk ? "Phòng sạch" : "Cần dọn phòng"}
                                >
                                  {cleanOk ? "check_circle" : "warning"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}

