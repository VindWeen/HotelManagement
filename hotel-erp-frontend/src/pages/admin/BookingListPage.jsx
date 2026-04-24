import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { cancelBooking, checkIn, checkOut, createBooking, getBookings, getReceptionAvailability, getReceptionDashboard, getReceptionMemberSuggestions } from "../../api/bookingsApi";
import { createInvoiceFromBooking, getInvoiceByBookingId } from "../../api/invoicesApi";
import { recordPayment } from "../../api/paymentsApi";
import { getVouchers } from "../../api/vouchersApi";
import { useResponsiveAdmin } from "../../hooks/useResponsiveAdmin";
import { formatDate, formatCurrency } from "../../utils";
import { formatMoneyInput, parseMoneyInput } from "../../utils/moneyInput";
import { getBookingSourceLabel, getBookingStatusLabel } from "../../utils/statusLabels";

const ALLOWED_ACTIONS = {
  Pending: ["cancel", "collect_deposit"],
  Confirmed: ["checkin", "cancel", "open_invoice"],
  Checked_in: ["checkout", "open_invoice"],
  Checked_out_pending_settlement: ["open_invoice"],
  Completed: ["open_invoice"],
  Cancelled: ["refund"],
};

// ─── Thông báo ────────────────────────────────────────────────────────────────────
const TOAST_STYLES = {
  success: { bg: "var(--a-success-bg)", border: "var(--a-success-border)", text: "var(--a-success)", prog: "var(--a-success)", icon: "check_circle" },
  error:   { bg: "var(--a-error-bg)", border: "var(--a-error-border)", text: "var(--a-error)", prog: "var(--a-error)", icon: "error" },
  warning: { bg: "var(--a-warning-bg)", border: "var(--a-warning-border)", text: "var(--a-warning)", prog: "var(--a-warning)", icon: "warning" },
  info:    { bg: "var(--a-info-bg)", border: "var(--a-info-border)", text: "var(--a-info)", prog: "var(--a-info)", icon: "info" },
};

const MODAL_OVERLAY_STYLE = {
  position: "fixed",
  inset: 0,
  background: "var(--a-overlay)",
  backdropFilter: "blur(6px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const MODAL_SURFACE_STYLE = {
  background: "var(--a-surface)",
  borderRadius: 24,
  width: "100%",
  boxShadow: "var(--a-shadow-lg)",
  animation: "modalSlideUp .3s ease-out",
  border: "1px solid var(--a-border)",
};

const MODAL_TITLE_STYLE = {
  fontSize: 18,
  fontWeight: 800,
  color: "var(--a-text)",
  margin: "0 0 8px",
};

const MODAL_SUBTITLE_STYLE = {
  fontSize: 13,
  color: "var(--a-text-muted)",
  margin: "0 0 20px",
};

const FIELD_STYLE = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1.5px solid var(--a-border-strong)",
  background: "var(--a-surface-raised)",
  fontSize: 13,
  fontWeight: 500,
  outline: "none",
  color: "var(--a-text)",
};

const MODAL_SECONDARY_BUTTON_STYLE = {
  flex: 1,
  padding: "12px 0",
  borderRadius: 12,
  border: "1.5px solid var(--a-border-strong)",
  background: "var(--a-surface)",
  fontWeight: 700,
  color: "var(--a-text-muted)",
  cursor: "pointer",
  fontSize: 14,
};

const MODAL_PRIMARY_BUTTON_STYLE = {
  flex: 1,
  padding: "12px 0",
  borderRadius: 12,
  border: "none",
  background: "var(--a-primary)",
  fontWeight: 700,
  color: "var(--a-text-inverse)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontSize: 14,
};

const MODAL_DANGER_BUTTON_STYLE = {
  ...MODAL_PRIMARY_BUTTON_STYLE,
  background: "var(--a-error)",
};

const INLINE_LIGHT_SPINNER = {
  width: 14,
  height: 14,
  border: "2px solid rgba(255,255,255,.35)",
  borderTopColor: "currentColor",
  borderRadius: "50%",
  animation: "spin .65s linear infinite",
};

function Toast({ id, msg, type = "success", dur = 3500, onDismiss }) {
  const s = TOAST_STYLES[type] || TOAST_STYLES.info;
  useEffect(() => {
    const t = setTimeout(() => onDismiss(id), dur);
    return () => clearTimeout(t);
  }, [id, dur, onDismiss]);
  return (
    <div
      style={{
        background: s.bg, border: `1px solid ${s.border}`, color: s.text,
        borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 28px rgba(0,0,0,.35)",
        pointerEvents: "auto", marginBottom: 10, minWidth: 280,
        animation: "toastIn .32s cubic-bezier(.22,1,.36,1) forwards",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 12px 8px" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, flexShrink: 0, marginTop: 1, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
        <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, margin: 0, flex: 1 }}>{msg}</p>
        <button onClick={() => onDismiss(id)} style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.4, color: "inherit", padding: 2 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
        </button>
      </div>
      <div style={{ margin: "0 12px 8px", height: 3, borderRadius: 9999, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
        <div style={{ height: "100%", background: s.prog, animation: `toastProgress ${dur}ms linear forwards` }} />
      </div>
    </div>
  );
}

// ─── Hộp thoại hủy ──────────────────────────────────────────────────────────────
function CancelModal({ open, onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState("Admin cancelled");

  if (!open) return null;
  return (
    <div style={{ ...MODAL_OVERLAY_STYLE, zIndex: 2000 }} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={{ ...MODAL_SURFACE_STYLE, maxWidth: 400, padding: 32 }}>
        <h3 style={MODAL_TITLE_STYLE}>Hủy Đặt Phòng</h3>
        <p style={MODAL_SUBTITLE_STYLE}>Vui lòng nhập lý do hủy phòng bên dưới:</p>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Lý do hủy..."
          style={{ ...FIELD_STYLE, fontFamily: "inherit", resize: "none", height: 80, marginBottom: 20 }}
        />
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onCancel} style={MODAL_SECONDARY_BUTTON_STYLE}>Hủy bỏ</button>
          <button onClick={() => onConfirm(reason)} disabled={loading || !reason.trim()} style={{ ...MODAL_DANGER_BUTTON_STYLE, opacity: (!reason.trim() || loading) ? 0.6 : 1 }}>
            {loading ? <div style={INLINE_LIGHT_SPINNER} /> : <span className="material-symbols-outlined" style={{ fontSize: 18 }}>cancel</span>}
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Nhãn trạng thái ─────────────────────────────────────────────────────────────
const BookingStatusBadge = ({ status }) => {
  const map = {
    Pending: { bg: "var(--a-warning-bg)", text: "var(--a-warning)", icon: "schedule" },
    Confirmed: { bg: "var(--a-info-bg)", text: "var(--a-info)", icon: "verified" },
    Checked_in: { bg: "var(--a-success-bg)", text: "var(--a-success)", icon: "login" },
    Checked_out_pending_settlement: { bg: "var(--a-warning-bg)", text: "var(--a-warning)", icon: "payments" },
    Completed: { bg: "var(--a-surface-bright)", text: "var(--a-text-muted)", icon: "done_all" },
    Cancelled: { bg: "var(--a-error-bg)", text: "var(--a-error)", icon: "block" }
  };
  const s = map[status] || { bg: "var(--a-surface-bright)", text: "var(--a-text-muted)", icon: "help" };
  return (
    <span className="badge-p" style={{ background: s.bg, color: s.text }}>
      <span className="material-symbols-outlined" style={{ fontSize: 13, fontWeight: 700 }}>{s.icon}</span>
      {getBookingStatusLabel(status)}
    </span>
  );
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const sameDate = (a, b) => a && b && a.toDateString() === b.toDateString();
const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const startOfToday = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};

function ReceptionDateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => startOfMonth(new Date()));
  const [draftStart, setDraftStart] = useState(value.checkInDate ? new Date(value.checkInDate) : null);
  const today = startOfToday();

  useEffect(() => {
    setDraftStart(value.checkInDate ? new Date(value.checkInDate) : null);
  }, [value.checkInDate, value.checkOutDate]);

  const buildDays = (monthDate) => {
    const first = startOfMonth(monthDate);
    const last = endOfMonth(monthDate);
    const startWeekDay = (first.getDay() + 6) % 7;
    const days = [];

    for (let i = 0; i < startWeekDay; i += 1) {
      days.push(null);
    }
    for (let day = 1; day <= last.getDate(); day += 1) {
      days.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
    }
    return days;
  };

  const handlePick = (day) => {
    if (!day || day < today) {
      return;
    }

    if (!draftStart || (value.checkInDate && value.checkOutDate)) {
      setDraftStart(day);
      onChange({ checkInDate: toInputDate(day), checkOutDate: "" });
      return;
    }

    if (day < draftStart) {
      setDraftStart(day);
      onChange({ checkInDate: toInputDate(day), checkOutDate: "" });
      return;
    }

    onChange({
      checkInDate: toInputDate(draftStart),
      checkOutDate: toInputDate(day),
    });
    setDraftStart(null);
    setOpen(false);
  };

  const isInRange = (day) => {
    if (!day || !value.checkInDate || !value.checkOutDate) return false;
    const start = new Date(value.checkInDate);
    const end = new Date(value.checkOutDate);
    return day >= start && day <= end;
  };

  const renderMonth = (monthDate) => {
    const days = buildDays(monthDate);
    return (
      <div style={{ minWidth: 280 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <strong style={{ color: "var(--a-text)" }}>
            {monthDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
          </strong>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label) => (
            <div key={label} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--a-text-muted)", paddingBottom: 4 }}>{label}</div>
          ))}
          {days.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} />;
            }
            const selectedStart = value.checkInDate && sameDate(day, new Date(value.checkInDate));
            const selectedEnd = value.checkOutDate && sameDate(day, new Date(value.checkOutDate));
            const isPast = day < today;
            return (
              <button
                key={day.toISOString()}
                onClick={() => handlePick(day)}
                disabled={isPast}
                title={isPast ? "Không thể chọn ngày trong quá khứ" : undefined}
                style={{
                  height: 36,
                  borderRadius: 10,
                  border: selectedStart || selectedEnd ? "1.5px solid var(--a-primary)" : "1px solid var(--a-border)",
                  background: isPast ? "var(--a-surface-soft)" : selectedStart || selectedEnd ? "var(--a-primary)" : isInRange(day) ? "var(--a-success-bg)" : "var(--a-surface)",
                  color: isPast ? "var(--a-text-soft)" : selectedStart || selectedEnd ? "var(--a-text-inverse)" : "var(--a-text)",
                  cursor: isPast ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  opacity: isPast ? 0.55 : 1,
                }}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          border: "1.5px solid var(--a-border-strong)",
          background: "var(--a-surface-raised)",
          padding: "10px 14px",
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 700,
          color: "var(--a-text)",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        {value.checkInDate ? `Check-in: ${value.checkInDate}` : "Chọn ngày check-in"}
        {"  "}
        {value.checkOutDate ? `• Check-out: ${value.checkOutDate}` : value.checkInDate ? "• Chọn tiếp ngày check-out" : ""}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 50, background: "var(--a-surface)", border: "1px solid var(--a-border)", borderRadius: 16, boxShadow: "var(--a-shadow-md)", padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="btn-icon-p">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
            </button>
            <div style={{ fontSize: 12, color: "var(--a-text-muted)", fontWeight: 700 }}>
              Chọn ngày bắt đầu rồi chọn tiếp ngày kết thúc
            </div>
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="btn-icon-p">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
            </button>
          </div>
          {renderMonth(viewDate)}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, gap: 8 }}>
            <button type="button" onClick={() => { setDraftStart(null); onChange({ checkInDate: "", checkOutDate: "" }); }} className="btn-icon-p" style={{ width: "auto", padding: "0 12px" }}>
              Xóa
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-icon-p" style={{ width: "auto", padding: "0 12px" }}>
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckInModal({ open, booking, loading, onConfirm, onCancel }) {
  const [form, setForm] = useState({ guestName: "", guestPhone: "", guestEmail: "", nationalId: "" });

  useEffect(() => {
    if (!open || !booking) return;
    setForm({
      guestName: booking.guestName || "",
      guestPhone: booking.guestPhone || "",
      guestEmail: booking.guestEmail || "",
      nationalId: "",
    });
  }, [open, booking]);

  if (!open || !booking) return null;

  const canSubmit = form.guestName.trim() && form.guestPhone.trim() && form.guestEmail.trim() && form.nationalId.trim();

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20 }} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={{ background: "white", borderRadius: 24, width: "100%", maxWidth: 520, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)", animation: "modalSlideUp .3s ease-out", padding: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", margin: "0 0 8px" }}>Xác nhận check-in</h3>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
          Booking này chưa gắn hồ sơ khách. Nhập thông tin lưu trú để hệ thống kiểm tra tài khoản theo email trước khi check-in.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <input value={form.guestName} onChange={(e) => setForm((prev) => ({ ...prev, guestName: e.target.value }))} placeholder="Họ tên khách" style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #e2e8e1", background: "#f9f8f3", fontSize: 13, fontWeight: 500, outline: "none", color: "#1c1917" }} />
          <input value={form.guestPhone} onChange={(e) => setForm((prev) => ({ ...prev, guestPhone: e.target.value }))} placeholder="Số điện thoại" style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #e2e8e1", background: "#f9f8f3", fontSize: 13, fontWeight: 500, outline: "none", color: "#1c1917" }} />
          <input value={form.guestEmail} onChange={(e) => setForm((prev) => ({ ...prev, guestEmail: e.target.value }))} placeholder="Email" style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #e2e8e1", background: "#f9f8f3", fontSize: 13, fontWeight: 500, outline: "none", color: "#1c1917", gridColumn: "span 2" }} />
          <input value={form.nationalId} onChange={(e) => setForm((prev) => ({ ...prev, nationalId: e.target.value }))} placeholder="CCCD / Hộ chiếu" style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #e2e8e1", background: "#f9f8f3", fontSize: 13, fontWeight: 500, outline: "none", color: "#1c1917", gridColumn: "span 2" }} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1.5px solid #e2e8e1", background: "white", fontWeight: 700, color: "#6b7280", cursor: "pointer", fontSize: 14 }}>Đóng</button>
          <button onClick={() => onConfirm(form)} disabled={loading || !canSubmit} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: "#4f645b", fontWeight: 700, color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, opacity: (!canSubmit || loading) ? 0.6 : 1 }}>
            {loading ? <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin .65s linear infinite" }} /> : <span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span>}
            Xác nhận check-in
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingPaymentModal({ open, booking, mode, loading, onConfirm, onCancel }) {
  const [form, setForm] = useState({ amountPaid: "", paymentMethod: "Cash", transactionCode: "", note: "" });

  useEffect(() => {
    if (!open || !booking) return;
    const summary = booking.paymentSummary || {};
    const suggestedAmount = mode === "deposit"
      ? summary.remainingToConfirm || 0
      : mode === "checkin"
        ? summary.remainingToCheckIn || 0
        : booking.depositAmount || 0;

    setForm({
      amountPaid: suggestedAmount > 0 ? formatMoneyInput(String(Math.ceil(suggestedAmount))) : "",
      paymentMethod: "Cash",
      transactionCode: "",
      note: "",
    });
  }, [open, booking, mode]);

  if (!open || !booking) return null;

  const title = mode === "deposit"
    ? "Thu cọc booking"
    : mode === "checkin"
      ? "Thu thêm để nhận phòng"
      : "Hoàn tiền booking";

  const helper = mode === "deposit"
    ? `Cần tối thiểu ${formatCurrency(booking?.paymentSummary?.remainingToConfirm || 0)} để booking được xác nhận.`
    : mode === "checkin"
      ? `Cần thu thêm ${formatCurrency(booking?.paymentSummary?.remainingToCheckIn || 0)} để đủ điều kiện nhận phòng.`
      : `Số tiền đã thu trước đó: ${formatCurrency(booking?.depositAmount || 0)}.`;

  return (
    <div style={{ ...MODAL_OVERLAY_STYLE, zIndex: 2050 }} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={{ ...MODAL_SURFACE_STYLE, maxWidth: 460, padding: 32 }}>
        <h3 style={MODAL_TITLE_STYLE}>{title}</h3>
        <p style={MODAL_SUBTITLE_STYLE}>{helper}</p>
        <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
          <input type="text" inputMode="numeric" value={form.amountPaid} onChange={(e) => setForm((prev) => ({ ...prev, amountPaid: formatMoneyInput(e.target.value) }))} placeholder="Số tiền" style={FIELD_STYLE} />
          <select value={form.paymentMethod} onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))} style={FIELD_STYLE}>
            <option value="Cash">Tiền mặt</option>
            <option value="Momo">Momo</option>
            <option value="VNPay_Mock">VNPay</option>
            <option value="Credit Card">Thẻ tín dụng</option>
            <option value="Bank Transfer">Chuyển khoản</option>
          </select>
          <input value={form.transactionCode} onChange={(e) => setForm((prev) => ({ ...prev, transactionCode: e.target.value }))} placeholder="Mã giao dịch (nếu có)" style={FIELD_STYLE} />
          <textarea value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Ghi chú" style={{ ...FIELD_STYLE, minHeight: 80, resize: "none" }} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onCancel} style={MODAL_SECONDARY_BUTTON_STYLE}>Đóng</button>
          <button
            onClick={() => onConfirm({ ...form, amountPaid: parseMoneyInput(form.amountPaid) })}
            disabled={loading || parseMoneyInput(form.amountPaid) <= 0}
            style={{ ...MODAL_PRIMARY_BUTTON_STYLE, opacity: (parseMoneyInput(form.amountPaid) <= 0 || loading) ? 0.6 : 1 }}
          >
            {loading ? <div style={INLINE_LIGHT_SPINNER} /> : <span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span>}
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BookingListPage() {
  const { isMobile } = useResponsiveAdmin();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [dashboard, setDashboard] = useState({ todayArrivals: [], stayingGuests: [], pendingCheckouts: [], summary: {} });
  const [vouchers, setVouchers] = useState([]);
  const [memberOptions, setMemberOptions] = useState([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberSuggestOpen, setMemberSuggestOpen] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availableRoomTypes, setAvailableRoomTypes] = useState([]);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [activeTab, setActiveTab] = useState("manage");
  
  // Trạng thái hộp thoại tùy chỉnh
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [checkInTarget, setCheckInTarget] = useState(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentMode, setPaymentMode] = useState("deposit");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [filters, setFilters] = useState({
    bookingCode: "",
    guest: "",
    status: "",
    fromDate: "",
    toDate: "",
  });

  const dashboardDate = filters.toDate || filters.fromDate || toInputDate(new Date());

  const [bookingForm, setBookingForm] = useState({
    customerType: "walk_in",
    userId: null,
    memberKeyword: "",
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    numAdults: "",
    numChildren: "",
    checkInDate: "",
    checkOutDate: "",
    voucherId: "",
    source: "walk_in",
    note: "",
    selectedRooms: [],
  });

  const showToast = useCallback((msg, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, msg, type }]);
  }, []);
  const dismissToast = useCallback((id) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingRes, dashboardRes, voucherRes] = await Promise.all([
        getBookings({ page: 1, pageSize: 200 }),
        getReceptionDashboard({ date: dashboardDate }),
        getVouchers({ page: 1, pageSize: 100, status: "active" }),
      ]);

      const bookingPayload = bookingRes.data || {};
      const dashboardPayload = dashboardRes.data?.data || {};
      const voucherPayload = voucherRes.data || {};
      setRows(bookingPayload.data || []);
      setDashboard({
        todayArrivals: dashboardPayload.todayArrivals || [],
        stayingGuests: dashboardPayload.stayingGuests || [],
        pendingCheckouts: dashboardPayload.pendingCheckouts || [],
        summary: dashboardPayload.summary || {},
      });
      setVouchers(voucherPayload.data || []);
    } catch (e) {
      showToast(e?.response?.data?.message || "Không thể tải danh sách booking.", "error");
    } finally {
      setLoading(false);
    }
  }, [dashboardDate, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const baseRows =
      activeTab === "arrivals"
        ? dashboard.todayArrivals || []
        : activeTab === "staying"
          ? dashboard.stayingGuests || []
          : activeTab === "checkout"
            ? dashboard.pendingCheckouts || []
            : rows;

    return baseRows.filter((item) => {
      const code = (item.bookingCode || "").toLowerCase();
      const guestName = (item.guestName || "").toLowerCase();
      const guestPhone = (item.guestPhone || "").toLowerCase();
      const status = item.status || "";
      const dateField = activeTab === "checkout" ? "checkOutDate" : "checkInDate";
      const filterDates = (item.bookingDetails || [])
        .map((detail) => detail?.[dateField] ? toInputDate(new Date(detail[dateField])) : "")
        .filter(Boolean);

      if (filters.bookingCode && !code.includes(filters.bookingCode.toLowerCase())) return false;
      if (filters.guest) {
        const keyword = filters.guest.toLowerCase();
        if (!guestName.includes(keyword) && !guestPhone.includes(keyword)) return false;
      }
      if (filters.status && status !== filters.status) return false;
      if ((filters.fromDate || filters.toDate) && filterDates.length) {
        const hasDateInRange = filterDates.some((date) =>
          (!filters.fromDate || date >= filters.fromDate) &&
          (!filters.toDate || date <= filters.toDate)
        );
        if (!hasDateInRange) return false;
      }
      return true;
    });
  }, [rows, filters, activeTab, dashboard]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [activeTab, filters.bookingCode, filters.guest, filters.status, filters.fromDate, filters.toDate]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setFilters((prev) => prev.status ? ({ ...prev, status: "" }) : prev);
  };

  const activeFilterChips = [
    filters.bookingCode && { key: "bookingCode", label: `Mã: ${filters.bookingCode}` },
    filters.guest && { key: "guest", label: `Khách: ${filters.guest}` },
    filters.status && { key: "status", label: `Trạng thái: ${getBookingStatusLabel(filters.status)}` },
    (filters.fromDate || filters.toDate) && {
      key: "date",
      label: `Đang áp dụng bộ lọc ngày: ${filters.fromDate || "..."} - ${filters.toDate || "..."}`,
    },
  ].filter(Boolean);

  const hasActiveFilters = activeFilterChips.length > 0;
  const clearFilters = () => {
    setFilters({ bookingCode: "", guest: "", status: "", fromDate: "", toDate: "" });
  };

  const estimatedBookingAmount = useMemo(() => {
    if (!bookingForm.selectedRooms?.length) {
      return 0;
    }

    return bookingForm.selectedRooms.reduce(
      (sum, room) => sum + Number(room.suggestedTotal || 0),
      0,
    );
  }, [bookingForm.selectedRooms]);

  const selectableVouchers = useMemo(() => {
    const now = new Date();
    const selectedRoomTypeIds = [...new Set((bookingForm.selectedRooms || []).map((room) => Number(room.roomTypeId)).filter(Boolean))];

    return vouchers.filter((voucher) => {
      if (!voucher.isActive) return false;

      if (voucher.validFrom && new Date(voucher.validFrom) > now) return false;
      if (voucher.validTo && new Date(voucher.validTo) < now) return false;
      if (voucher.usageLimit != null && voucher.usedCount >= voucher.usageLimit) return false;
      if (voucher.minBookingValue != null && estimatedBookingAmount > 0 && estimatedBookingAmount < Number(voucher.minBookingValue)) return false;
      if (
        voucher.applicableRoomTypeId &&
        selectedRoomTypeIds.length > 0 &&
        !selectedRoomTypeIds.includes(Number(voucher.applicableRoomTypeId))
      ) return false;

      return true;
    });
  }, [vouchers, estimatedBookingAmount, bookingForm.selectedRooms]);

  const runAction = async (item, action) => {
    const id = item.id;
    if (action === "cancel") {
      setCancelTarget(id);
      return;
    }

    if (action === "collect_deposit") {
      setPaymentTarget(item);
      setPaymentMode("deposit");
      return;
    }

    if (action === "collect_checkin") {
      setPaymentTarget(item);
      setPaymentMode("checkin");
      return;
    }

    if (action === "refund") {
      setPaymentTarget(item);
      setPaymentMode("refund");
      return;
    }

    if (action === "open_invoice") {
      try {
        const res = await getInvoiceByBookingId(id);
        const invoiceId = res?.data?.data?.id;
        if (invoiceId) {
          navigate(`/admin/invoices/${invoiceId}`);
          return;
        }
      } catch (e) {
        if (Number(item?.depositAmount || 0) > 0 || item.status === "Checked_out_pending_settlement") {
          try {
            const created = await createInvoiceFromBooking(id);
            const invoiceId = created?.data?.invoiceId;
            if (invoiceId) {
              showToast("Đã tạo hóa đơn cho booking.");
              navigate(`/admin/invoices/${invoiceId}`);
              return;
            }
          } catch (createError) {
            showToast(createError?.response?.data?.message || "Không thể tạo hóa đơn cho booking này.", "error");
            return;
          }
        }

        showToast(e?.response?.data?.message || "Không tìm thấy hóa đơn của booking này.", "error");
        return;
      }
    }

    if (action === "checkin" && !item.userId) {
      setCheckInTarget(item);
      return;
    }

    setBusyId(id);
    try {
      if (action === "checkin") { await checkIn(id); showToast("Đã Check-in thành công."); }
      if (action === "checkout") { await checkOut(id); showToast("Đã Check-out thành công."); }
      await load();
    } catch (e) {
      showToast(e?.response?.data?.message || "Thao tác thất bại.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const executeBookingPayment = async (payload) => {
    if (!paymentTarget) return;

    setPaymentLoading(true);
    setBusyId(paymentTarget.id);
    try {
      const paymentType = paymentMode === "deposit"
        ? "Booking_Deposit"
        : paymentMode === "checkin"
          ? "CheckIn_Collection"
          : "Refund";

      await recordPayment({
        bookingId: paymentTarget.id,
        paymentType,
        paymentMethod: payload.paymentMethod,
        amountPaid: Number(payload.amountPaid),
        transactionCode: payload.transactionCode || null,
        note: payload.note || null,
      });

      showToast(paymentMode === "refund" ? "Đã ghi nhận hoàn tiền booking." : "Đã ghi nhận thanh toán booking.");
      setPaymentTarget(null);
      await load();
    } catch (e) {
      showToast(e?.response?.data?.message || "Không thể ghi nhận thanh toán booking.", "error");
    } finally {
      setPaymentLoading(false);
      setBusyId(null);
    }
  };

  const executeCheckIn = async (payload) => {
    if (!checkInTarget) return;

    setCheckInLoading(true);
    setBusyId(checkInTarget.id);
    try {
      await checkIn(checkInTarget.id, payload);
      showToast("Đã check-in và cập nhật hồ sơ khách thành công.");
      setCheckInTarget(null);
      await load();
    } catch (e) {
      showToast(e?.response?.data?.message || "Check-in thất bại.", "error");
    } finally {
      setCheckInLoading(false);
      setBusyId(null);
    }
  };

  const executeCancel = async (reason) => {
    const normalizedReason = reason.trim();
    if (!normalizedReason) return;
    
    setCancelLoading(true);
    try {
      await cancelBooking(cancelTarget, normalizedReason);
      showToast("Đã hủy booking thành công.");
      setCancelTarget(null);
      await load();
    } catch (e) {
      showToast(e?.response?.data?.message || "Hủy thất bại.", "error");
    } finally {
      setCancelLoading(false);
    }
  };

  const canRun = (item, action) => {
    const status = item?.status;
    const summary = item?.paymentSummary || {};

    if (action === "collect_deposit") return status === "Pending" && (summary.remainingToConfirm || 0) > 0;
    if (action === "collect_checkin") return status === "Confirmed" && !summary.canCheckIn;
    if (action === "checkin") return status === "Confirmed" && !!summary.canCheckIn;
    if (action === "cancel") return status === "Pending" || status === "Confirmed";
    if (action === "checkout") return status === "Checked_in";
    if (action === "open_invoice") return Number(item?.depositAmount || 0) > 0 || status === "Checked_out_pending_settlement" || status === "Completed";
    if (action === "refund") return status === "Cancelled" && Number(item?.depositAmount || 0) > 0;

    return (ALLOWED_ACTIONS[status] || []).includes(action);
  };

  const loadAvailability = useCallback(async () => {
    if (!bookingForm.checkInDate || !bookingForm.checkOutDate) {
      setAvailableRoomTypes([]);
      return;
    }

    setAvailabilityLoading(true);
    try {
      const res = await getReceptionAvailability({
        checkInDate: bookingForm.checkInDate,
        checkOutDate: bookingForm.checkOutDate,
        numAdults: bookingForm.numAdults,
        numChildren: bookingForm.numChildren,
      });
      const payload = res.data?.data || [];
      setAvailableRoomTypes(payload);
    } catch (e) {
      setAvailableRoomTypes([]);
      showToast(e?.response?.data?.message || "Không thể lấy danh sách phòng phù hợp.", "error");
    } finally {
      setAvailabilityLoading(false);
    }
  }, [bookingForm.checkInDate, bookingForm.checkOutDate, bookingForm.numAdults, bookingForm.numChildren, showToast]);

  useEffect(() => {
    if (activeTab === "manage") {
      loadAvailability();
    }
  }, [activeTab, loadAvailability]);

  useEffect(() => {
    if (!bookingForm.voucherId) return;

    const stillSelectable = selectableVouchers.some((voucher) => String(voucher.id) === String(bookingForm.voucherId));
    if (!stillSelectable) {
      setBookingForm((prev) => ({ ...prev, voucherId: "" }));
    }
  }, [bookingForm.voucherId, selectableVouchers]);

  useEffect(() => {
    setBookingForm((prev) => {
      if (!prev.selectedRooms?.length) {
        return prev;
      }

      const selectableRoomMap = new Map();
      availableRoomTypes.forEach((item) => {
        (item.rooms || []).forEach((room) => {
          if (room.selectable) {
            selectableRoomMap.set(String(room.id), {
              roomId: String(room.id),
              roomTypeId: String(item.id),
              roomNumber: room.roomNumber,
              roomTypeName: item.name,
              suggestedTotal: Number(item.suggestedTotal || 0),
            });
          }
        });
      });

      const nextSelectedRooms = prev.selectedRooms
        .map((room) => selectableRoomMap.get(String(room.roomId)) || null)
        .filter(Boolean);

      if (nextSelectedRooms.length === prev.selectedRooms.length) {
        const same = nextSelectedRooms.every((room, index) =>
          room.roomId === prev.selectedRooms[index]?.roomId &&
          room.roomTypeId === prev.selectedRooms[index]?.roomTypeId &&
          room.suggestedTotal === prev.selectedRooms[index]?.suggestedTotal,
        );
        if (same) return prev;
      }

      return {
        ...prev,
        selectedRooms: nextSelectedRooms,
      };
    });
  }, [availableRoomTypes]);

  useEffect(() => {
    let ignore = false;

    const fetchMembers = async () => {
      if (bookingForm.customerType !== "member") {
        setMemberOptions([]);
        setMemberSuggestOpen(false);
        return;
      }

      setMemberLoading(true);
      try {
        const res = await getReceptionMemberSuggestions({
          keyword: bookingForm.memberKeyword || "",
        });
        const payload = res.data?.data || [];
        if (!ignore) {
          setMemberOptions(payload);
        }
      } catch {
        if (!ignore) {
          setMemberOptions([]);
        }
      } finally {
        if (!ignore) {
          setMemberLoading(false);
        }
      }
    };

    fetchMembers();
    return () => {
      ignore = true;
    };
  }, [bookingForm.customerType, bookingForm.memberKeyword]);

  const handleSelectMember = (member) => {
    setBookingForm((prev) => ({
      ...prev,
      customerType: "member",
      userId: member.id,
      memberKeyword: member.fullName || "",
      guestName: member.fullName || "",
      guestPhone: member.phone || "",
      guestEmail: member.email || "",
    }));
    setMemberSuggestOpen(false);
  };

  const toggleSelectedRoom = (roomTypeItem, room) => {
    if (!room.selectable) return;

    setBookingForm((prev) => {
      const exists = prev.selectedRooms.some((selected) => String(selected.roomId) === String(room.id));

      return {
        ...prev,
        selectedRooms: exists
          ? prev.selectedRooms.filter((selected) => String(selected.roomId) !== String(room.id))
          : [
              ...prev.selectedRooms,
              {
                roomTypeId: String(roomTypeItem.id),
                roomId: String(room.id),
                roomNumber: room.roomNumber,
                roomTypeName: roomTypeItem.name,
                suggestedTotal: Number(roomTypeItem.suggestedTotal || 0),
              },
            ],
      };
    });
  };

  const handleCreateBooking = async () => {
    if (!bookingForm.selectedRooms?.length) {
      showToast("Bạn chưa chọn phòng khả dụng cụ thể.", "warning");
      return;
    }

    setCreatingBooking(true);
    try {
      await createBooking({
        userId: bookingForm.userId,
        guestName: bookingForm.guestName,
        guestPhone: bookingForm.guestPhone,
        guestEmail: bookingForm.guestEmail,
        numAdults: Number(bookingForm.numAdults),
        numChildren: Number(bookingForm.numChildren),
        voucherId: bookingForm.voucherId ? Number(bookingForm.voucherId) : null,
        source: bookingForm.source,
        note: bookingForm.note,
        details: bookingForm.selectedRooms.map((room) => ({
          roomTypeId: Number(room.roomTypeId),
          roomId: Number(room.roomId),
          checkInDate: bookingForm.checkInDate,
          checkOutDate: bookingForm.checkOutDate,
        })),
      });

      showToast("Đã tạo booking mới thành công.");
      setBookingForm({
        customerType: "walk_in",
        userId: null,
        memberKeyword: "",
        guestName: "",
        guestPhone: "",
        guestEmail: "",
        numAdults: "",
        numChildren: "",
        checkInDate: "",
        checkOutDate: "",
        voucherId: "",
        source: "walk_in",
        note: "",
        selectedRooms: [],
      });
      setAvailableRoomTypes([]);
      await load();
    } catch (e) {
      showToast(e?.response?.data?.message || "Tạo booking thất bại.", "error");
    } finally {
      setCreatingBooking(false);
    }
  };

  const tabs = [
    { id: "manage", label: "Quản lý booking", count: rows.length },
    { id: "arrivals", label: "Khách đến hôm nay", count: dashboard.todayArrivals?.length || 0 },
    { id: "staying", label: "Khách đang lưu trú", count: dashboard.stayingGuests?.length || 0 },
    { id: "checkout", label: "Thủ tục trả phòng", count: dashboard.pendingCheckouts?.length || 0 },
  ];

  // Reusable input style for toolbar
  const inputStyle = {
    border: "1.5px solid #e2e8e1", background: "#f9f8f3", padding: "10px 14px",
    borderRadius: 12, fontSize: 13, fontWeight: 600, color: "#1c1917", outline: "none",
    width: "100%", boxSizing: "border-box", fontFamily: "Manrope, sans-serif",
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', sans-serif; }
        @keyframes toastIn { from{transform:translateX(110%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes toastProgress { from{width:100%} to{width:0} }
        @keyframes modalSlideUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .table-row { transition: background 0.1s; border-bottom: 1px solid #f1f0ea; }
        .table-row:hover { background: #fafaf8 !important; }
        .btn-icon-p { width: 34px; height: 34px; border-radius: 9px; border: 1.5px solid #f1f0ea; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; color: #6b7280; }
        .btn-icon-p:hover:not(:disabled) { border-color: #4f645b; color: #4f645b; background: #f0faf5; transform: scale(1.05); }
        .btn-icon-p:disabled { opacity: 0.35; cursor: not-allowed; }
        .badge-p { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
      `}</style>

      {/* Khu vực thông báo */}
      <div style={{ position: "fixed", top: 24, right: 24, zIndex: 300, pointerEvents: "none", minWidth: 280 }}>
        {toasts.map((t) => <Toast key={t.id} {...t} onDismiss={dismissToast} />)}
      </div>

      <CancelModal
        key={cancelTarget || "closed"}
        open={!!cancelTarget}
        onConfirm={executeCancel}
        onCancel={() => setCancelTarget(null)}
        loading={cancelLoading}
      />
      <CheckInModal
        key={checkInTarget?.id || "checkin-closed"}
        open={!!checkInTarget}
        booking={checkInTarget}
        onConfirm={executeCheckIn}
        onCancel={() => setCheckInTarget(null)}
        loading={checkInLoading}
      />
      <BookingPaymentModal
        key={paymentTarget?.id ? `${paymentMode}-${paymentTarget.id}` : "payment-closed"}
        open={!!paymentTarget}
        booking={paymentTarget}
        mode={paymentMode}
        onConfirm={executeBookingPayment}
        onCancel={() => setPaymentTarget(null)}
        loading={paymentLoading}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#1c1917", letterSpacing: "-0.025em", margin: "0 0 4px" }}>
            Quầy Lễ tân
          </h2>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            Theo dõi booking, khách đến hôm nay, khách đang lưu trú và thủ tục trả phòng trong cùng một màn hình
          </p>
        </div>
        <button
          onClick={load}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 12, fontSize: 14, fontWeight: 700, background: "white", color: "#1c1917", border: "1.5px solid #e2e8e1", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span> Làm mới
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              borderRadius: 16,
              padding: "16px 18px",
              border: activeTab === tab.id ? "1.5px solid #4f645b" : "1px solid #e5e7eb",
              background: activeTab === tab.id ? "#f0faf5" : "white",
              textAlign: "left",
              cursor: "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,.04)",
            }}
          >
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
              {tab.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#1c1917" }}>{tab.count}</div>
          </button>
        ))}
      </div>

      {activeTab === "manage" && (
        <div className="primary-card-p" style={{ background: "white", borderRadius: 18, border: "1px solid #f1f0ea", boxShadow: "0 1px 4px rgba(0,0,0,.06)", padding: 22, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
            <div>
              <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#1c1917" }}>Tạo booking cho lễ tân</h3>
              <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                Chọn ngày và số khách để hệ thống gợi ý hạng phòng phù hợp. Giá chỉ hiển thị ở bước nội bộ này.
              </p>
            </div>
            <button
              onClick={loadAvailability}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700, background: "white", color: "#1c1917", border: "1.5px solid #e2e8e1", cursor: "pointer" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>travel_explore</span>
              Gợi ý phòng
            </button>
          </div>

          <div style={{ display: "grid", gap: 16, marginBottom: 16 }}>
            <div className="sub-card-p" style={{ padding: 16, borderRadius: 16, background: "#fcfbf8", border: "1px solid #f1f0ea" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>
                Thông tin khách
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <select
                  value={bookingForm.customerType}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setBookingForm((prev) => ({
                      ...prev,
                      customerType: nextType,
                      userId: nextType === "member" ? prev.userId : null,
                      memberKeyword: nextType === "member" ? prev.memberKeyword : "",
                      ...(nextType === "walk_in" ? { guestName: "", guestPhone: "", guestEmail: "" } : {}),
                    }));
                  }}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="walk_in">Khách vãng lai</option>
                  <option value="member">Khách thành viên</option>
                </select>
                <div style={{ position: "relative" }}>
                  <input
                    placeholder={bookingForm.customerType === "member" ? "Nhập tên thành viên để gợi ý" : "Tên khách"}
                    value={bookingForm.customerType === "member" ? bookingForm.memberKeyword : bookingForm.guestName}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (bookingForm.customerType === "member") {
                        setMemberSuggestOpen(true);
                      }
                      setBookingForm((prev) => bookingForm.customerType === "member"
                        ? { ...prev, memberKeyword: value, userId: null, guestName: value }
                        : { ...prev, guestName: value });
                    }}
                    onFocus={() => {
                      if (bookingForm.customerType === "member") {
                        setMemberSuggestOpen(true);
                      }
                    }}
                    onBlur={() => {
                      if (bookingForm.customerType === "member") {
                        setTimeout(() => setMemberSuggestOpen(false), 120);
                      }
                    }}
                    style={inputStyle}
                  />
                  {bookingForm.customerType === "member" && memberSuggestOpen && (bookingForm.memberKeyword || memberLoading || memberOptions.length > 0) && (
                    <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 30, background: "white", border: "1px solid #e5e7eb", borderRadius: 14, boxShadow: "0 16px 32px rgba(15,23,42,.12)", maxHeight: 220, overflowY: "auto" }}>
                      {memberLoading ? (
                        <div style={{ padding: 12, fontSize: 13, color: "#6b7280" }}>Đang tìm khách thành viên...</div>
                      ) : memberOptions.length === 0 ? (
                        <div style={{ padding: 12, fontSize: 13, color: "#6b7280" }}>Không có gợi ý phù hợp.</div>
                      ) : memberOptions.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectMember(member);
                          }}
                          style={{ width: "100%", textAlign: "left", border: "none", background: "white", padding: 12, cursor: "pointer", borderBottom: "1px solid #f3f4f6" }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917" }}>{member.fullName}</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>{member.phone || "Chưa có SĐT"} • {member.email || "Chưa có email"}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input placeholder="Số điện thoại" value={bookingForm.guestPhone} onChange={(e) => setBookingForm((prev) => ({ ...prev, guestPhone: e.target.value }))} style={inputStyle} />
                <input placeholder="Email" value={bookingForm.guestEmail} onChange={(e) => setBookingForm((prev) => ({ ...prev, guestEmail: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <div className="sub-card-p" style={{ padding: 16, borderRadius: 16, background: "#fcfbf8", border: "1px solid #f1f0ea" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>
                Thông tin lưu trú
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1.1fr_2fr_1fr_1fr] gap-3">
                <select value={bookingForm.source} onChange={(e) => setBookingForm((prev) => ({ ...prev, source: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="walk_in">Tại quầy</option>
                  <option value="phone">Điện thoại</option>
                  <option value="online">Trực tuyến</option>
                </select>
                <ReceptionDateRangePicker
                  value={{ checkInDate: bookingForm.checkInDate, checkOutDate: bookingForm.checkOutDate }}
                  onChange={({ checkInDate, checkOutDate }) => setBookingForm((prev) => ({ ...prev, checkInDate, checkOutDate }))}
                />
                <input type="number" min="1" value={bookingForm.numAdults} onChange={(e) => setBookingForm((prev) => ({ ...prev, numAdults: e.target.value }))} style={inputStyle} placeholder="Người lớn" />
                <input type="number" min="0" value={bookingForm.numChildren} onChange={(e) => setBookingForm((prev) => ({ ...prev, numChildren: e.target.value }))} style={inputStyle} placeholder="Trẻ em" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-3 items-start mb-4">
            <textarea
              placeholder="Ghi chú booking"
              value={bookingForm.note}
              onChange={(e) => setBookingForm((prev) => ({ ...prev, note: e.target.value }))}
              style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
            />
            <select value={bookingForm.voucherId} onChange={(e) => setBookingForm((prev) => ({ ...prev, voucherId: e.target.value }))} style={{ ...inputStyle, cursor: "pointer", height: 44 }}>
              <option value="">Không áp dụng voucher</option>
              {selectableVouchers.map((voucher) => (
                <option key={voucher.id} value={voucher.id}>
                  {voucher.code} {voucher.discountType === "PERCENT" ? `- ${voucher.discountValue}%` : `- ${formatCurrency(voucher.discountValue)}`}
                </option>
              ))}
            </select>
            {vouchers.length > 0 && selectableVouchers.length === 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#9a3412", fontWeight: 700 }}>
                Hiện chưa có voucher phù hợp với hạng phòng hoặc tổng tiền dự kiến của booking này.
              </div>
            )}
          </div>

          <div className="primary-card-p" style={{ border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
            <div className="sub-card-p" style={{ padding: "14px 16px", background: "#fafaf8", borderBottom: "1px solid #f1f0ea", fontSize: 13, fontWeight: 800, color: "#1c1917" }}>
              Hạng phòng phù hợp
            </div>
            {availabilityLoading ? (
              <div style={{ padding: 20, fontSize: 13, color: "#6b7280" }}>Đang lấy danh sách phòng phù hợp...</div>
            ) : availableRoomTypes.length === 0 ? (
              <div style={{ padding: 20, fontSize: 13, color: "#6b7280" }}>Chưa có gợi ý. Hãy chọn ngày và số khách rồi bấm “Gợi ý phòng”.</div>
            ) : (
              <div style={{ display: "grid", gap: 14, padding: 14 }}>
                {availableRoomTypes.map((item) => {
                  return (
                    <div
                      key={item.id}
                      style={{
                        borderRadius: 14,
                        border: "1px solid #e5e7eb",
                        background: "white",
                        padding: 16,
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#1c1917", marginBottom: 4 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                        {item.capacityAdults} người lớn • {item.capacityChildren} trẻ em
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                        Còn {item.availableRooms} phòng phù hợp
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#166534", marginBottom: 12 }}>{formatCurrency(item.suggestedTotal)}</div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {(item.rooms || []).map((room) => {
                          const selectedRoom = bookingForm.selectedRooms.some(
                            (selected) => String(selected.roomId) === String(room.id),
                          );
                          const selectable = room.selectable;
                          const bookingStatusLabel = room.bookingStatusLabel || (selectable ? "Có thể book" : "Không khả dụng");
                          const liveStatusLabel = room.liveStatusLabel || "Chưa rõ trạng thái";
                          const bg = selectable ? (selectedRoom ? "#dcfce7" : "#eff6ff") : "#fef2f2";
                          const border = selectable ? (selectedRoom ? "#16a34a" : "#60a5fa") : "#fca5a5";
                          const color = selectable ? "#1c1917" : "#b91c1c";
                          const bookingStatusColor = selectable ? "#166534" : "#b91c1c";

                          return (
                            <button
                              key={room.id}
                              type="button"
                              disabled={!selectable}
                              onClick={() => toggleSelectedRoom(item, room)}
                              style={{
                                minWidth: 120,
                                textAlign: "left",
                                borderRadius: 12,
                                border: `1.5px solid ${border}`,
                                background: bg,
                                padding: "10px 12px",
                                cursor: selectable ? "pointer" : "not-allowed",
                                opacity: selectable ? 1 : 0.95,
                              }}
                            >
                              <div style={{ fontSize: 14, fontWeight: 800, color }}>{room.roomNumber}</div>
                              <div style={{ fontSize: 11, color: bookingStatusColor, marginTop: 4, fontWeight: 700 }}>
                                {bookingStatusLabel}
                              </div>
                              <div style={{ fontSize: 11, color: selectable ? "#6b7280" : "#7f1d1d", marginTop: 3 }}>
                                Hiện tại: {liveStatusLabel}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              background: bookingForm.selectedRooms.length ? "#f8fafc" : "#fafaf8",
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: bookingForm.selectedRooms.length ? 12 : 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917" }}>
                Phòng đã chọn {bookingForm.selectedRooms.length ? `(${bookingForm.selectedRooms.length})` : ""}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#166534" }}>
                {formatCurrency(estimatedBookingAmount)}
              </div>
            </div>

            {bookingForm.selectedRooms.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {bookingForm.selectedRooms.map((room) => (
                  <button
                    key={room.roomId}
                    type="button"
                    onClick={() => setBookingForm((prev) => ({
                      ...prev,
                      selectedRooms: prev.selectedRooms.filter((selected) => String(selected.roomId) !== String(room.roomId)),
                    }))}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      borderRadius: 999,
                      border: "1px solid #bbf7d0",
                      background: "#f0fdf4",
                      color: "#166534",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <span>{room.roomNumber}</span>
                    <span style={{ opacity: 0.75 }}>{room.roomTypeName}</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Chưa chọn phòng nào. Bấm vào từng phòng khả dụng để chọn, bấm lại lần nữa để bỏ chọn.
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleCreateBooking}
              disabled={creatingBooking}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 12, fontSize: 14, fontWeight: 800, background: "linear-gradient(135deg,#4f645b 0%,#43574f 100%)", color: "white", border: "none", cursor: "pointer", opacity: creatingBooking ? 0.7 : 1 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_home</span>
              {creatingBooking ? "Đang tạo booking..." : "Tạo booking"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 border border-[#f1f0ea] shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(5,1fr)_auto] items-center gap-3 mb-6">
        <input placeholder="Mã booking" value={filters.bookingCode} onChange={(e) => setFilters((f) => ({ ...f, bookingCode: e.target.value }))} style={inputStyle} onFocus={(e) => e.target.style.borderColor = "#4f645b"} onBlur={(e) => e.target.style.borderColor = "#e2e8e1"} />
        <input placeholder="Tên / SĐT Khách" value={filters.guest} onChange={(e) => setFilters((f) => ({ ...f, guest: e.target.value }))} style={inputStyle} onFocus={(e) => e.target.style.borderColor = "#4f645b"} onBlur={(e) => e.target.style.borderColor = "#e2e8e1"} />
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }} onFocus={(e) => e.target.style.borderColor = "#4f645b"} onBlur={(e) => e.target.style.borderColor = "#e2e8e1"}>
          <option value="">Tất cả trạng thái</option>
          <option value="Pending">Chờ cọc</option>
          <option value="Confirmed">Đã xác nhận</option>
          <option value="Checked_in">Đang lưu trú</option>
          <option value="Checked_out_pending_settlement">Chờ quyết toán</option>
          <option value="Completed">Hoàn tất</option>
          <option value="Cancelled">Đã hủy</option>
        </select>
        <div style={{ position: "relative" }}>
          <input type="date" value={filters.fromDate} onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))} style={inputStyle} onFocus={(e) => e.target.style.borderColor = "#4f645b"} onBlur={(e) => e.target.style.borderColor = "#e2e8e1"} />
          <div style={{ position: "absolute", top: -8, left: 10, background: "white", padding: "0 4px", fontSize: 10, fontWeight: 700, color: "#9ca3af" }}>Từ ngày</div>
        </div>
        <div style={{ position: "relative" }}>
          <input type="date" value={filters.toDate} onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))} style={inputStyle} onFocus={(e) => e.target.style.borderColor = "#4f645b"} onBlur={(e) => e.target.style.borderColor = "#e2e8e1"} />
          <div style={{ position: "absolute", top: -8, left: 10, background: "white", padding: "0 4px", fontSize: 10, fontWeight: 700, color: "#9ca3af" }}>Đến ngày</div>
        </div>
        <button
          onClick={clearFilters}
          disabled={!hasActiveFilters}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 18px", borderRadius: 12, border: hasActiveFilters ? "1.5px solid #f59e0b" : "1.5px solid #e2e8e1", background: hasActiveFilters ? "#fff7ed" : "white", color: hasActiveFilters ? "#b45309" : "#9ca3af", fontSize: 13, fontWeight: 800, cursor: hasActiveFilters ? "pointer" : "not-allowed", boxShadow: hasActiveFilters ? "0 8px 20px rgba(245,158,11,.16)" : "0 1px 3px rgba(0,0,0,.04)", fontFamily: "Manrope, sans-serif", whiteSpace: "nowrap", opacity: hasActiveFilters ? 1 : 0.65 }}
          onMouseEnter={(e) => { if (!hasActiveFilters) return; e.currentTarget.style.borderColor = "#d97706"; e.currentTarget.style.background = "#ffedd5"; }}
          onMouseLeave={(e) => { if (!hasActiveFilters) return; e.currentTarget.style.borderColor = "#f59e0b"; e.currentTarget.style.background = "#fff7ed"; }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>filter_alt_off</span> Xóa lọc
        </button>
      </div>

      {hasActiveFilters && (
        <div style={{ margin: "-12px 0 18px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          {activeFilterChips.map((chip) => (
            <span
              key={chip.key}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 11px",
                borderRadius: 999,
                background: chip.key === "date" ? "#ecfdf5" : "#f8fafc",
                border: chip.key === "date" ? "1px solid #bbf7d0" : "1px solid #e5e7eb",
                color: chip.key === "date" ? "#047857" : "#475569",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                {chip.key === "date" ? "event" : "filter_alt"}
              </span>
              {chip.label}
            </span>
          ))}
        </div>
      )}

      {activeTab !== "manage" && (
        <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 12, border: "1px solid #d1fae5", background: "#ecfdf5", color: "#065f46", fontSize: 13, fontWeight: 700 }}>
          {activeTab === "arrivals" && "Danh sách này chỉ hiển thị các booking dự kiến check-in trong ngày."}
          {activeTab === "staying" && "Danh sách này chỉ hiển thị các booking đang lưu trú để lễ tân theo dõi nhanh."}
          {activeTab === "checkout" && "Mặc định hiển thị booking checkout hôm nay; chọn Từ ngày/Đến ngày để xem booking checkout của ngày khác."}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#f1f0ea] shadow-sm mb-6">
        {isMobile ? (
          <div style={{ display: "grid", gap: 12, padding: 14 }}>
            {!loading && filteredRows.length === 0 ? (
              <div style={{ padding: "28px 12px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                <span className="material-symbols-outlined mx-auto text-center" style={{ fontSize: 44, marginBottom: 10, opacity: 0.5, display: "block" }}>search_off</span>
                Khong tim thay booking nao
              </div>
            ) : paginatedRows.map((item) => (
              <article key={item.id} style={{ border: "1px solid #f1f0ea", borderRadius: 16, padding: 14, display: "grid", gap: 12, background: "white", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 16, fontWeight: 900, color: "#1c1917" }}>{item.bookingCode}</span>
                      <button className="btn-icon-p" title="Sao chep ma booking" onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(item.bookingCode || "");
                          showToast("Da sao chep ma booking.");
                        } catch {
                          showToast("Khong the sao chep ma booking.", "error");
                        }
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                      </button>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{item.guestName || "-"}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{item.guestPhone || "-"}</div>
                  </div>
                  <BookingStatusBadge status={item.status} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ background: "#f8fafc", borderRadius: 12, padding: 10 }}>
                    <div style={{ fontSize: 11, color: "#78716c", fontWeight: 800 }}>Check-in</div>
                    <div style={{ fontSize: 13, color: "#1c1917", fontWeight: 800 }}>{formatDate(item.bookingDetails?.[0]?.checkInDate).split(' ')[0]}</div>
                  </div>
                  <div style={{ background: "#f8fafc", borderRadius: 12, padding: 10 }}>
                    <div style={{ fontSize: 11, color: "#78716c", fontWeight: 800 }}>Nguồn</div>
                    <div style={{ fontSize: 13, color: "#1c1917", fontWeight: 800 }}>{getBookingSourceLabel(item.source)}</div>
                  </div>
                </div>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 10 }}>
                  <div style={{ fontSize: 11, color: "#166534", fontWeight: 800 }}>Tổng tiền</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#16a34a" }}>{formatCurrency(item.totalEstimatedAmount)}</div>
                  <div style={{ fontSize: 11, color: "#166534", marginTop: 4 }}>Đã thu trước lưu trú: {formatCurrency(item.depositAmount || 0)}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                  <button className="btn-icon-p" title="Chi tiết" onClick={() => navigate(`/admin/bookings/${item.id}`)} style={{ width: "100%" }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>visibility</span></button>
                  <button className="btn-icon-p" title="Thu cọc" disabled={!canRun(item, "collect_deposit") || busyId === item.id} onClick={() => runAction(item, "collect_deposit")} style={{ width: "100%" }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span></button>
                  <button className="btn-icon-p" title="Check-in" disabled={!canRun(item, "checkin") || busyId === item.id} onClick={() => runAction(item, "checkin")} style={{ width: "100%" }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span></button>
                  <button className="btn-icon-p" title="Check-out" disabled={!canRun(item, "checkout") || busyId === item.id} onClick={() => runAction(item, "checkout")} style={{ width: "100%" }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span></button>
                  <button className="btn-icon-p" title="Mở hóa đơn" disabled={!canRun(item, "open_invoice") || busyId === item.id} onClick={() => runAction(item, "open_invoice")} style={{ width: "100%" }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>receipt_long</span></button>
                  <button className="btn-icon-p" title="Thu thêm để nhận phòng" disabled={!canRun(item, "collect_checkin") || busyId === item.id} onClick={() => runAction(item, "collect_checkin")} style={{ width: "100%" }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>account_balance_wallet</span></button>
                  <button className="btn-icon-p" title="Hoàn tiền" disabled={!canRun(item, "refund") || busyId === item.id} onClick={() => runAction(item, "refund")} style={{ width: "100%" }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>reply</span></button>
                  <button className="btn-icon-p" title="Hủy" disabled={!canRun(item, "cancel") || busyId === item.id} onClick={() => runAction(item, "cancel")} style={{ width: "100%", color: canRun(item, "cancel") ? "#dc2626" : "#cbd5e1", borderColor: canRun(item, "cancel") ? "#fecaca" : "#f1f0ea" }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>cancel</span></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(249,248,243,.6)" }}>
              <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#6b7280", borderBottom: "1px solid #f1f0ea" }}>Mã Code</th>
              <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#6b7280", borderBottom: "1px solid #f1f0ea" }}>Khách hàng</th>
              <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#6b7280", borderBottom: "1px solid #f1f0ea" }}>Check-in</th>
              <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#6b7280", borderBottom: "1px solid #f1f0ea" }}>Tổng tiền</th>
              <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#6b7280", borderBottom: "1px solid #f1f0ea" }}>Trạng thái</th>
              <th style={{ padding: "16px 24px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#6b7280", borderBottom: "1px solid #f1f0ea" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filteredRows.length === 0 && (
              <tr>
                <td style={{ padding: "40px 24px", textAlign: "center", color: "#9ca3af", fontSize: 14 }} colSpan={6}>
                  <span className="material-symbols-outlined mx-auto text-center" style={{ fontSize: 48, marginBottom: 12, opacity: 0.5, display: "block" }}>search_off</span>
                  Không tìm thấy bookings nào
                </td>
              </tr>
            )}
            {paginatedRows.map((item) => (
              <tr key={item.id} className="table-row">
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{item.bookingCode}</div>
                    <button
                      className="btn-icon-p"
                      title="Sao chép mã booking"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(item.bookingCode || "");
                          showToast("Đã sao chép mã booking.");
                        } catch {
                          showToast("Không thể sao chép mã booking.", "error");
                        }
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                    </button>
                  </div>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917" }}>{item.guestName || "-"}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{item.guestPhone || "-"}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{getBookingSourceLabel(item.source)}</div>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1c1917" }}>{formatDate(item.bookingDetails?.[0]?.checkInDate).split(' ')[0]}</div>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#16a34a" }}>{formatCurrency(item.totalEstimatedAmount)}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                    Đã thu trước lưu trú: {formatCurrency(item.depositAmount || 0)}
                  </div>
                  {item.paymentSummary && item.status !== "Completed" && item.status !== "Cancelled" && (
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
                      {item.paymentSummary.canCheckIn
                        ? "Đủ điều kiện nhận phòng"
                        : item.status === "Pending"
                          ? `Cần thêm ${formatCurrency(item.paymentSummary.remainingToConfirm || 0)} để xác nhận`
                          : `Cần thêm ${formatCurrency(item.paymentSummary.remainingToCheckIn || 0)} để nhận phòng`}
                    </div>
                  )}
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <BookingStatusBadge status={item.status} />
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button className="btn-icon-p" title="Chi tiết" onClick={() => navigate(`/admin/bookings/${item.id}`)}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>visibility</span></button>
                    <button className="btn-icon-p" title="Thu cọc" disabled={!canRun(item, "collect_deposit") || busyId === item.id} onClick={() => runAction(item, "collect_deposit")}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span></button>
                    <button className="btn-icon-p" title="Thu thêm để nhận phòng" disabled={!canRun(item, "collect_checkin") || busyId === item.id} onClick={() => runAction(item, "collect_checkin")}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>account_balance_wallet</span></button>
                    <button className="btn-icon-p" title="Check-in" disabled={!canRun(item, "checkin") || busyId === item.id} onClick={() => runAction(item, "checkin")}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span></button>
                    <button className="btn-icon-p" title="Check-out" disabled={!canRun(item, "checkout") || busyId === item.id} onClick={() => runAction(item, "checkout")}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span></button>
                    <button className="btn-icon-p" title="Mở hóa đơn" disabled={!canRun(item, "open_invoice") || busyId === item.id} onClick={() => runAction(item, "open_invoice")}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>receipt_long</span></button>
                    <button className="btn-icon-p" title="Hoàn tiền" disabled={!canRun(item, "refund") || busyId === item.id} onClick={() => runAction(item, "refund")}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>reply</span></button>
                    <button className="btn-icon-p" title="Hủy" disabled={!canRun(item, "cancel") || busyId === item.id} onClick={() => runAction(item, "cancel")} style={{ color: canRun(item, "cancel") ? "#dc2626" : "#cbd5e1", borderColor: canRun(item, "cancel") ? "#fecaca" : "#f1f0ea" }} onMouseEnter={(e) => { if (canRun(item, "cancel")) { e.currentTarget.style.background = "#fef2f2"; } }} onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>cancel</span></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, padding: "0 18px 18px", gap: 16, flexWrap: "wrap" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
            Trang <strong style={{ color: "#1c1917" }}>{page}</strong> / {totalPages}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", color: "#6b7280", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.35 : 1 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
            </button>
            {Array.from({ length: totalPages }).map((_, index) => {
              const pageNumber = index + 1;
              const active = pageNumber === page;
              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: "none",
                    background: active ? "#4f645b" : "transparent",
                    color: active ? "#e7fef3" : "#6b7280",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: active ? "default" : "pointer",
                  }}
                >
                  {pageNumber}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", color: "#6b7280", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.35 : 1 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}





