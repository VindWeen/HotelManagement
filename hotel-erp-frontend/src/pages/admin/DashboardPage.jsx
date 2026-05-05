// src/pages/admin/DashboardPage.jsx
// Dashboard thực tế — tích hợp API: Bookings, Rooms, Users, Reviews, Vouchers, LossAndDamages, Equipments
import { useState, useEffect, useCallback, useMemo } from "react";
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
  const fallback = booking?.bookingDetails?.[0]?.checkInDate;
  return fallback ? new Date(fallback) : null;
};

const getInvoiceRevenueDate = (invoice) =>
  invoice?.createdAt ? new Date(invoice.createdAt) : null;

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

// ─── Main Component ──────────────────────────────────────────────────────────
// ─── Date Filter Helpers ─────────────────────────────────────────────────────
const DATE_PRESETS = [
  { key: "today",   label: "Hôm nay" },
  { key: "7days",   label: "7 ngày qua" },
  { key: "month",   label: "Tháng này" },
  { key: "year",    label: "Năm này" },
  { key: "all",     label: "Tất cả" },
  { key: "custom",  label: "Tùy chỉnh" },
];

function getPresetRange(key) {
  const now = new Date();
  const start = new Date(now);
  switch (key) {
    case "today":
      start.setHours(0, 0, 0, 0);
      return { from: start, to: now };
    case "7days":
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: now };
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: now };
    case "year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: now };
    default:
      return null;
  }
}

export default function DashboardPage() {
  const { isMobile } = useResponsiveAdmin();
  const [loading, setLoading] = useState(true);

  // ─── Date filter state ────────────────────────────────────────────────────
  const [preset, setPreset] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");

  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [_roomTypes, setRoomTypes] = useState([]);
  const [lossAndDamages, setLossAndDamages] = useState([]);
  const [_equipments, setEquipments] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

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

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Compute date-filtered KPIs ──────────────────────────────────────────────
  const filteredStats = useMemo(() => {
    const now = new Date();
    let from = null;
    let to = now;

    if (preset === "custom") {
      from = customFrom ? new Date(customFrom + "T00:00:00") : null;
      to   = customTo   ? new Date(customTo   + "T23:59:59") : now;
    } else if (preset !== "all") {
      const range = getPresetRange(preset);
      if (range) { from = range.from; to = range.to; }
    }

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
    const activeBookings = filteredBookings.filter((b) => ["Confirmed","Checked_in","Checked_out_pending_settlement","Pending"].includes(b.status)).length;
    const pendingBookings = filteredBookings.filter((b) => b.status === "Pending").length;

    const newUsersThisMonth = allUsers.filter((u) => {
      const d = u.createdAt ? new Date(u.createdAt) : null;
      return inRange(d);
    }).length;

    // Revenue chart: last 7 days always
    const revenueByDay = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return allInvoices
        .filter((iv) => iv.status === "Paid" && isSameDay(getInvoiceRevenueDate(iv), d))
        .reduce((s, iv) => s + (iv.finalTotal || 0), 0);
    });

    const bookingsByStatus = {};
    filteredBookings.forEach((b) => { bookingsByStatus[b.status] = (bookingsByStatus[b.status] || 0) + 1; });

    return { totalRevenue, todayRevenue, activeBookings, pendingBookings, newUsersThisMonth, revenueByDay, bookingsByStatus };
  }, [preset, customFrom, customTo, allInvoices, bookings, allUsers]);

  // Merge base stats + filtered stats
  const mergedStats = { ...stats, ...filteredStats };
  const filteredBookingList = useMemo(() => {
    const now = new Date();
    let from = null, to = now;
    if (preset === "custom") {
      from = customFrom ? new Date(customFrom + "T00:00:00") : null;
      to   = customTo   ? new Date(customTo   + "T23:59:59") : now;
    } else if (preset !== "all") {
      const range = getPresetRange(preset);
      if (range) { from = range.from; to = range.to; }
    }
    const inRange = (date) => {
      if (!date) return preset === "all";
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
  }, [preset, customFrom, customTo, bookings]);

  const STATUS_ORDER = { Occupied: 0, Cleaning: 1, PendingLoss: 2, Maintenance: 3, Ready: 4 };
  const roomPreview = [...rooms].sort((a, b) => {
    const ka = STATUS_ORDER[getRoomStatusKey(a)] ?? 99;
    const kb = STATUS_ORDER[getRoomStatusKey(b)] ?? 99;
    if (ka !== kb) return ka - kb;
    return (a.roomNumber || "").localeCompare(b.roomNumber || "", "vi", { numeric: true });
  });
  const statusEntries = Object.entries(mergedStats.bookingsByStatus).sort((a, b) => b[1] - a[1]);
  const totalBk = Object.values(mergedStats.bookingsByStatus).reduce((s, v) => s + v, 0) || 1;

  const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return weekdays[d.getDay()];
  });

  const roomCountByStatus = {
    Ready: rooms.filter(r => r.businessStatus === "Available" && r.cleaningStatus === "Clean").length,
    Occupied: rooms.filter(r => r.businessStatus === "Occupied").length,
    Cleaning: rooms.filter(r => r.businessStatus === "Available" && r.cleaningStatus === "Dirty").length,
    PendingLoss: rooms.filter(r => r.businessStatus === "Available" && r.cleaningStatus === "PendingLoss").length,
    Maintenance: rooms.filter(r => r.businessStatus === "Disabled").length,
  };

  const activePresetLabel = DATE_PRESETS.find(p => p.key === preset)?.label ?? "";

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
        .date-filter-bar { display:flex; flex-wrap:wrap; align-items:center; gap:10px; padding:12px 20px; background:var(--a-surface-raised); border-radius:16px; border:1px solid var(--a-border); margin-bottom:24px; box-shadow:var(--a-shadow-xs); }
        .preset-select { appearance:none; -webkit-appearance:none; padding:7px 32px 7px 14px; border-radius:10px; border:1.5px solid var(--a-border); background:var(--a-surface); color:var(--a-text); font-size:13px; font-family:'Manrope',sans-serif; font-weight:700; cursor:pointer; outline:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; transition:border-color .15s, box-shadow .15s; min-width:150px; }
        .preset-select:focus { border-color:var(--a-brand-border); box-shadow:0 0 0 3px color-mix(in srgb, var(--a-brand-ink) 15%, transparent); }
        .preset-select:hover { border-color:var(--a-brand-border); }
        .date-input { padding:7px 12px; border-radius:10px; border:1.5px solid var(--a-border); background:var(--a-surface); color:var(--a-text); font-size:13px; font-family:'Manrope',sans-serif; font-weight:600; cursor:pointer; outline:none; transition:border-color .15s; }
        .date-input:focus { border-color:var(--a-brand-border); box-shadow:0 0 0 3px color-mix(in srgb, var(--a-brand-ink) 15%, transparent); }
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
          <button className="refresh-btn" onClick={fetchAll} disabled={loading}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, ...(loading ? { animation: "spin .7s linear infinite" } : {}) }}>
              refresh
            </span>
            Làm mới
          </button>
        </div>

        {/* ── Date Filter Bar ── */}
        <div className="date-filter-bar">
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--a-brand-ink)", flexShrink: 0 }}>calendar_month</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--a-text-muted)", whiteSpace: "nowrap" }}>Lọc theo:</span>
          <select
            className="preset-select"
            value={preset}
            onChange={e => setPreset(e.target.value)}
          >
            {DATE_PRESETS.map(p => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
          {preset === "custom" && (
            <>
              <span style={{ fontSize: 12, color: "var(--a-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>Từ</span>
              <input
                type="date"
                className="date-input"
                value={customFrom}
                max={customTo || new Date().toISOString().slice(0, 10)}
                onChange={e => setCustomFrom(e.target.value)}
              />
              <span style={{ fontSize: 12, color: "var(--a-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>đến</span>
              <input
                type="date"
                className="date-input"
                value={customTo}
                min={customFrom}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => setCustomTo(e.target.value)}
              />
            </>
          )}
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--a-text-soft)", fontWeight: 600 }}>
            Đang xem: <strong style={{ color: "var(--a-brand-ink)" }}>{activePresetLabel}</strong>
          </span>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-5">
          {[
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
          ].map((kpi, idx) => (
            <div
              key={idx}
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
          ))}
        </div>

        {/* REVENUE CHART & QUICK ACTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-7">
          {/* Thất thoát hư hỏng */}
          <div className="card-in admin-stat-card" data-intent="error" style={{ borderRadius: 18, padding: 22, animationDelay: "220ms", animationFillMode: "both" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div className="admin-stat-icon">
                <span className="material-symbols-outlined" style={{ color: "var(--a-error)", fontSize: 22, fontVariationSettings: "'FILL' 1" }}>report</span>
              </div>
              {!loading && mergedStats.pendingLoss > 0 && (
                <span className="admin-status-badge" data-intent="warning" style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px" }}>
                  {mergedStats.pendingLoss} chờ xử lý
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--a-text-soft)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tổng tiền đền bù ghi nhận</p>
            {loading ? <Skel h={28} w={140} style={{ marginBottom: 6 }} /> : (
              <div className="kpi-val" style={{ animationFillMode: "both" }}>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: "var(--a-error)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
                  {fmtCurrency(mergedStats.totalLossValue)}
                </h3>
              </div>
            )}
            {loading ? <Skel h={12} w={160} /> : (
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--a-error)" }}>
                  {lossAndDamages.length} biên bản · {mergedStats.confirmedLoss} đã xác nhận
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
                  {fmt(mergedStats.totalEquipmentUnits)}
                </h3>
              </div>
            )}
            {loading ? <Skel h={12} w={160} /> : (
              <p style={{ fontSize: 11, fontWeight: 800, color: "var(--a-info)", margin: 0, opacity: 0.82 }}>
                {fmt(mergedStats.inUseEquipmentUnits)} đang dùng · {fmt(mergedStats.damagedEquipmentUnits)} hư hỏng
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Revenue + Room Type Occupancy */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div className="card-in admin-card" style={{ padding: 24, animationDelay: "200ms", animationFillMode: "both" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 800, color: "var(--a-text)", margin: "0 0 2px" }}>Doanh thu 7 ngày qua</h4>
                <p style={{ fontSize: 12, color: "var(--a-text-muted)", margin: 0 }}>Chỉ tính hóa đơn đã thanh toán</p>
              </div>
              {!loading && (
                <span className="admin-status-badge" data-intent="success" style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px" }}>
                  {fmtCurrency(mergedStats.revenueByDay.reduce((s, v) => s + v, 0))}
                </span>
              )}
            </div>
            {loading ? (
              <div style={{ height: 80, display: "flex", alignItems: "flex-end", gap: 8 }}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skel key={i} style={{ flex: 1, height: `${30 + Math.random() * 50}%`, borderRadius: "4px 4px 2px 2px" }} />
                ))}
              </div>
            ) : (
              <MiniBar data={mergedStats.revenueByDay} labels={dayLabels} color="var(--a-brand-ink)" />
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
            ) : mergedStats.roomTypeOccupancy.length === 0 ? (
              <p style={{ color: "var(--a-text-muted)", fontSize: 13, textAlign: "center", paddingTop: 16 }}>Không có dữ liệu</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {mergedStats.roomTypeOccupancy.map((rt, i) => (
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
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
                      {mergedStats.avgRating.toFixed(1)}
                      <span style={{ fontSize: 14, color: "var(--a-emphasis-muted)", fontWeight: 500 }}>/5</span>
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <Stars rating={Math.round(mergedStats.avgRating)} />
                    <span style={{ fontSize: 11, color: "rgba(231,254,243,.6)" }}>{reviews.length} đánh giá</span>
                  </div>
                </div>
                {mergedStats.pendingReviews > 0 && (
                  <div className="admin-status-badge" data-intent="warning" style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 10, padding: "8px 12px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--a-warning)" }}>schedule</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--a-warning)" }}>{mergedStats.pendingReviews} đánh giá chờ duyệt</span>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[5, 4, 3, 2, 1].map(star => {
                    const cnt = reviews.filter(r => r.rating === star).length;
                    const pct = reviews.length > 0 ? Math.round((cnt / reviews.length) * 100) : 0;
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
                  { icon: "local_offer", iconColor: "#1e40af", bg: "#dbeafe", label: "Voucher đang hoạt động", value: fmt(mergedStats.activeVouchers), sub: `${fmt(vouchers.length)} tổng cộng` },
                  { icon: "bed", iconColor: "#065f46", bg: "#d1fae5", label: "Phòng sẵn sàng", value: fmt(mergedStats.availableRooms), sub: `${fmt(rooms.length)} phòng tổng` },
                  { icon: "category", iconColor: "#9333ea", bg: "#f3e8ff", label: "Loại phòng", value: fmt(mergedStats.activeRoomTypes), sub: "Loại phòng đang hoạt động" },
                  { icon: "people", iconColor: "#b45309", bg: "#fef3c7", label: "Tài khoản hệ thống", value: fmt(mergedStats.totalUsers), sub: `+${fmt(mergedStats.newUsersThisMonth)} trong kỳ lọc` },
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
        <div className="card-in admin-card" style={{ overflow: "hidden", animationDelay: "460ms", animationFillMode: "both", marginBottom: 20 }}>
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
        <div className="card-in admin-card" style={{ overflow: "hidden", animationDelay: "500ms", animationFillMode: "both" }}>
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
            ) : rooms.length === 0 ? (
              <p style={{ color: "var(--a-text-muted)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>Chưa có phòng nào</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                {(["Occupied", "Cleaning", "PendingLoss", "Maintenance", "Ready"]).map(statusKey => {
                  const groupRooms = roomPreview.filter(r => getRoomStatusKey(r) === statusKey);
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
                                  {rm.roomNumber}
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


