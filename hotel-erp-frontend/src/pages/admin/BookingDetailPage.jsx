import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addRoomToBooking, cancelBooking, checkIn, checkInRoom, checkOut, earlyCheckOut, extendStay, getBookingDetail } from "../../api/bookingsApi";
import { createInvoiceFromBooking, getInvoiceByBookingId } from "../../api/invoicesApi";
import { recordPayment } from "../../api/paymentsApi";
import { getAdminRoomTypes } from "../../api/roomTypesApi";
import { formatCurrency, formatDate } from "../../utils";
import { formatMoneyInput, parseMoneyInput } from "../../utils/moneyInput";
import { getBookingSourceLabel, getBookingStatusLabel } from "../../utils/statusLabels";
import { useResponsiveAdmin } from "../../hooks/useResponsiveAdmin";

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

function CheckInModal({ open, booking, loading, onConfirm, onCancel }) {
  const [form, setForm] = useState({ guestName: "", guestPhone: "", guestEmail: "", nationalId: "" });

  useEffect(() => {
    if (!open || !booking) return;
    setForm({
      guestName: booking.guestName || "",
      guestPhone: booking.guestPhone || "",
      guestEmail: booking.guestEmail || "",
      nationalId: booking.nationalId || "",
    });
  }, [open, booking]);

  if (!open || !booking) return null;

  const canSubmit = form.guestName.trim() && form.guestPhone.trim() && form.guestEmail.trim() && form.nationalId.trim();

  return (
    <div style={{ ...MODAL_OVERLAY_STYLE, zIndex: 2100 }} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={{ ...MODAL_SURFACE_STYLE, maxWidth: 520, padding: 32 }}>
        <h3 style={MODAL_TITLE_STYLE}>Xác nhận check-in</h3>
        <p style={MODAL_SUBTITLE_STYLE}>
          Booking này chưa gắn hồ sơ khách. Nhập thông tin lưu trú để hệ thống kiểm tra tài khoản theo email trước khi check-in.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <input value={form.guestName} onChange={(e) => setForm((prev) => ({ ...prev, guestName: e.target.value }))} placeholder="Họ tên khách" style={FIELD_STYLE} />
          <input value={form.guestPhone} onChange={(e) => setForm((prev) => ({ ...prev, guestPhone: e.target.value }))} placeholder="Số điện thoại" style={FIELD_STYLE} />
          <input value={form.guestEmail} onChange={(e) => setForm((prev) => ({ ...prev, guestEmail: e.target.value }))} placeholder="Email" style={{ ...FIELD_STYLE, gridColumn: "span 2" }} />
          <input value={form.nationalId} onChange={(e) => setForm((prev) => ({ ...prev, nationalId: e.target.value }))} placeholder="CCCD / Hộ chiếu" style={{ ...FIELD_STYLE, gridColumn: "span 2" }} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onCancel} style={MODAL_SECONDARY_BUTTON_STYLE}>Đóng</button>
          <button onClick={() => onConfirm(form)} disabled={loading || !canSubmit} style={{ ...MODAL_PRIMARY_BUTTON_STYLE, opacity: (!canSubmit || loading) ? 0.6 : 1 }}>
            {loading ? <div style={INLINE_LIGHT_SPINNER} /> : <span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span>}
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
    <div style={{ ...MODAL_OVERLAY_STYLE, zIndex: 2200 }} onClick={(e) => e.target === e.currentTarget && onCancel()}>
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
          <button onClick={() => onConfirm({ ...form, amountPaid: parseMoneyInput(form.amountPaid) })} disabled={loading || parseMoneyInput(form.amountPaid) <= 0} style={{ ...MODAL_PRIMARY_BUTTON_STYLE, opacity: (parseMoneyInput(form.amountPaid) <= 0 || loading) ? 0.6 : 1 }}>
            {loading ? <div style={INLINE_LIGHT_SPINNER} /> : <span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span>}
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

function AddRoomModal({ open, loading, roomTypes, booking, form, onChange, onConfirm, onCancel }) {
  if (!open) return null;

  const selectedRoomType = roomTypes.find((item) => Number(item.id) === Number(form.roomTypeId));
  const canSubmit = Number(form.roomTypeId) > 0 && form.checkInDate && form.checkOutDate;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2200, padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div style={{ background: "white", borderRadius: 24, width: "100%", maxWidth: 640, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)", padding: 30 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", margin: "0 0 6px" }}>Thêm phòng vào booking</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              Thêm một hạng phòng mới cho booking hiện tại. Hệ thống sẽ tự gán phòng phù hợp khi check-in.
            </p>
          </div>
          <button onClick={onCancel} className="action-btn" style={{ padding: "8px 12px", fontSize: 12, height: "fit-content" }}>
            Đóng
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14, marginBottom: 18 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Hạng phòng</div>
            <select
              value={form.roomTypeId}
              onChange={(e) => onChange("roomTypeId", e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 14, border: "1.5px solid #e2e8e1", background: "#f9f8f3", fontSize: 14, fontWeight: 600, outline: "none", color: "#1c1917" }}
            >
              <option value="">Chọn hạng phòng muốn thêm</option>
              {roomTypes.map((roomType) => (
                <option key={roomType.id} value={roomType.id}>
                  {roomType.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Ngày nhận phòng</div>
            <input
              type="date"
              value={form.checkInDate}
              onChange={(e) => onChange("checkInDate", e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 14, border: "1.5px solid #e2e8e1", background: "#f9f8f3", fontSize: 14, fontWeight: 600, outline: "none", color: "#1c1917" }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Ngày trả phòng</div>
            <input
              type="date"
              value={form.checkOutDate}
              min={form.checkInDate || undefined}
              onChange={(e) => onChange("checkOutDate", e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 14, border: "1.5px solid #e2e8e1", background: "#f9f8f3", fontSize: 14, fontWeight: 600, outline: "none", color: "#1c1917" }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Ghi chú nội bộ</div>
            <textarea
              value={form.note}
              onChange={(e) => onChange("note", e.target.value)}
              placeholder="Ví dụ: Thêm phòng cho người thân đi cùng, cần gần phòng hiện tại..."
              style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 14, border: "1.5px solid #e2e8e1", background: "#f9f8f3", fontSize: 13, fontWeight: 500, outline: "none", color: "#1c1917", minHeight: 92, resize: "none" }}
            />
          </div>
        </div>

        <div style={{ border: "1px solid #ecebe4", background: "#fafaf8", borderRadius: 16, padding: 16, marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>
            Xem nhanh trước khi thêm
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Booking</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>#{booking?.bookingCode || "-"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Hạng phòng</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{selectedRoomType?.name || "Chưa chọn"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Giá niêm yết</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#4f645b" }}>
                {selectedRoomType ? `${formatCurrency(selectedRoomType.basePrice || 0)}/đêm` : "-"}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onCancel} className="action-btn" style={{ flex: 1, justifyContent: "center" }}>Hủy</button>
          <button
            onClick={onConfirm}
            disabled={!canSubmit || loading}
            className="action-btn primary"
            style={{ flex: 1, justifyContent: "center", opacity: (!canSubmit || loading) ? 0.6 : 1 }}
          >
            {loading ? <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin .65s linear infinite" }} /> : <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_home</span>}
            Xác nhận thêm phòng
          </button>
        </div>
      </div>
    </div>
  );
}

function EarlyCheckOutModal({ open, detail, loading, form, onChange, onConfirm, onCancel }) {
  if (!open || !detail) return null;

  const canSubmit = !!form.newCheckOutDate;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2200, padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div style={{ background: "white", borderRadius: 24, width: "100%", maxWidth: 560, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)", padding: 30 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", margin: "0 0 6px" }}>Cập nhật out sớm</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              Điều chỉnh ngày trả phòng thực tế cho chặng lưu trú này để hệ thống tính lại booking.
            </p>
          </div>
          <button onClick={onCancel} className="action-btn" style={{ padding: "8px 12px", fontSize: 12, height: "fit-content" }}>
            Đóng
          </button>
        </div>

        <div style={{ border: "1px solid #ecebe4", background: "#fafaf8", borderRadius: 16, padding: 16, marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 12 }}>
            Thông tin chặng lưu trú
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Hạng phòng</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{detail.roomTypeName || "-"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Phòng</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{detail.roomName || "Chưa gán phòng"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Check-in hiện tại</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917" }}>{formatDate(detail.checkInDate)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Check-out đang lưu</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917" }}>{formatDate(detail.checkOutDate)}</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Ngày trả phòng thực tế</div>
          <input
            type="date"
            value={form.newCheckOutDate}
            min={detail?.checkInDate?.slice?.(0, 10) || undefined}
            max={detail?.checkOutDate?.slice?.(0, 10) || undefined}
            onChange={(e) => onChange("newCheckOutDate", e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 14, border: "1.5px solid #e2e8e1", background: "#f9f8f3", fontSize: 14, fontWeight: 600, outline: "none", color: "#1c1917" }}
          />
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
            Ngày mới nên nằm trong khoảng từ ngày check-in đến ngày check-out hiện tại của chặng này.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onCancel} className="action-btn" style={{ flex: 1, justifyContent: "center" }}>Hủy</button>
          <button
            onClick={onConfirm}
            disabled={!canSubmit || loading}
            className="action-btn primary"
            style={{ flex: 1, justifyContent: "center", opacity: (!canSubmit || loading) ? 0.6 : 1 }}
          >
            {loading ? <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin .65s linear infinite" }} /> : <span className="material-symbols-outlined" style={{ fontSize: 18 }}>event_available</span>}
            Cập nhật out sớm
          </button>
        </div>
      </div>
    </div>
  );
}

function ExtendStayModal({ open, detail, loading, form, onChange, onConfirm, onCancel }) {
  if (!open || !detail) return null;

  const canSubmit = !!form.newCheckOutDate;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2200, padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div style={{ background: "white", borderRadius: 24, width: "100%", maxWidth: 560, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)", padding: 30, animation: "modalSlideUp .3s ease-out" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", margin: "0 0 6px" }}>Ở thêm ngày</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              Kéo dài thời gian lưu trú cho chặng phòng này. Nếu phòng hiện tại bị trùng lịch, hệ thống sẽ gợi ý phòng thay thế.
            </p>
          </div>
          <button onClick={onCancel} className="action-btn" style={{ padding: "8px 12px", fontSize: 12, height: "fit-content" }}>
            Đóng
          </button>
        </div>

        <div style={{ border: "1px solid #ecebe4", background: "#fafaf8", borderRadius: 16, padding: 16, marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 12 }}>
            Thông tin chặng lưu trú
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Hạng phòng</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{detail.roomTypeName || "-"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Phòng</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{detail.roomName || "Chưa gán phòng"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Check-in hiện tại</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917" }}>{formatDate(detail.checkInDate)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Check-out đang lưu</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917" }}>{formatDate(detail.checkOutDate)}</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Ngày trả phòng mới</div>
          <input
            type="date"
            value={form.newCheckOutDate}
            min={detail?.checkOutDate?.slice?.(0, 10) || undefined}
            onChange={(e) => onChange("newCheckOutDate", e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 14, border: "1.5px solid #e2e8e1", background: "#f9f8f3", fontSize: 14, fontWeight: 600, outline: "none", color: "#1c1917" }}
          />
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
            Ngày mới phải sau ngày check-out hiện tại của chặng này.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onCancel} className="action-btn" style={{ flex: 1, justifyContent: "center" }}>Hủy</button>
          <button
            onClick={onConfirm}
            disabled={!canSubmit || loading}
            className="action-btn primary"
            style={{ flex: 1, justifyContent: "center", opacity: (!canSubmit || loading) ? 0.6 : 1 }}
          >
            {loading ? <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin .65s linear infinite" }} /> : <span className="material-symbols-outlined" style={{ fontSize: 18 }}>event_repeat</span>}
            Xác nhận ở thêm
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
    Completed: { bg: "var(--a-surface-soft)", text: "var(--a-text-muted)", icon: "done_all" },
    Cancelled: { bg: "var(--a-error-bg)", text: "var(--a-error)", icon: "block" }
  };
  const s = map[status] || { bg: "var(--a-surface-soft)", text: "var(--a-text-muted)", icon: "help" };
  return (
    <span className="badge-p" style={{ background: s.bg, color: s.text }}>
      <span className="material-symbols-outlined" style={{ fontSize: 13, fontWeight: 700 }}>{s.icon}</span>
      {getBookingStatusLabel(status)}
    </span>
  );
};

const isTransferExtensionDetail = (detail) =>
  (detail?.note || "").toLowerCase().includes("chuyển phòng để ở thêm");

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useResponsiveAdmin();
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [extendStayConflict, setExtendStayConflict] = useState(null);
  
  // Trạng thái hộp thoại tùy chỉnh
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [checkInDetailTarget, setCheckInDetailTarget] = useState(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState("deposit");
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false);
  const [addRoomLoading, setAddRoomLoading] = useState(false);
  const [addRoomForm, setAddRoomForm] = useState({ roomTypeId: "", checkInDate: "", checkOutDate: "", note: "" });
  const [earlyCheckOutTarget, setEarlyCheckOutTarget] = useState(null);
  const [earlyCheckOutLoading, setEarlyCheckOutLoading] = useState(false);
  const [earlyCheckOutForm, setEarlyCheckOutForm] = useState({ newCheckOutDate: "" });
  const [extendStayTarget, setExtendStayTarget] = useState(null);
  const [extendStayLoading, setExtendStayLoading] = useState(false);
  const [extendStayForm, setExtendStayForm] = useState({ newCheckOutDate: "" });

  const showToast = useCallback((msg, type = "success") => {
    const toastId = Date.now() + Math.random();
    setToasts((p) => [...p, { id: toastId, msg, type }]);
  }, []);
  const dismissToast = useCallback((toastId) => {
    setToasts((p) => p.filter((t) => t.id !== toastId));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBookingDetail(id);
      const payload = res.data || {};
      setBooking(payload.data || payload);
      setTimeline(payload.timeline || []);
    } catch (e) {
      showToast(e?.response?.data?.message || "Không thể tải chi tiết booking.", "error");
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const loadRoomTypes = async () => {
      try {
        const res = await getAdminRoomTypes();
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setRoomTypes(data);
      } catch {
        setRoomTypes([]);
      }
    };

    loadRoomTypes();
  }, []);

  const canRun = (action) => {
    const status = booking?.status;
    const summary = booking?.paymentSummary || {};

    if (action === "collect_deposit") return status === "Pending" && (summary.remainingToConfirm || 0) > 0;
    if (action === "collect_checkin") return status === "Confirmed" && !summary.canCheckIn;
    if (action === "checkin") return status === "Confirmed" && !!summary.canCheckIn;
    if (action === "cancel") return status === "Pending" || status === "Confirmed";
    if (action === "checkout") return status === "Checked_in";
    if (action === "open_invoice") return Number(booking?.depositAmount || 0) > 0 || status === "Checked_out_pending_settlement" || status === "Completed";
    if (action === "refund") return status === "Cancelled" && Number(booking?.depositAmount || 0) > 0;

    return (ALLOWED_ACTIONS[status] || []).includes(action);
  };

  const runAction = async (action) => {
    if (action === "cancel") {
      setCancelModalOpen(true);
      return;
    }

    if (action === "collect_deposit") {
      setPaymentMode("deposit");
      setPaymentModalOpen(true);
      return;
    }

    if (action === "collect_checkin") {
      setPaymentMode("checkin");
      setPaymentModalOpen(true);
      return;
    }

    if (action === "refund") {
      setPaymentMode("refund");
      setPaymentModalOpen(true);
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
        if (Number(booking?.depositAmount || 0) > 0 || booking?.status === "Checked_out_pending_settlement") {
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

    if (action === "checkin" && !booking?.nationalId) {
      setCheckInDetailTarget(null);
      setCheckInModalOpen(true);
      return;
    }

    try {
      if (action === "checkin") { await checkIn(id); showToast("Đã Check-in thành công."); }
      if (action === "checkout") { await checkOut(id); showToast("Đã Check-out thành công."); }
      await load();
    } catch (e) {
      showToast(e?.response?.data?.message || "Thao tác thất bại.", "error");
    }
  };

  const executeBookingPayment = async (payload) => {
    setPaymentLoading(true);
    try {
      const paymentType = paymentMode === "deposit"
        ? "Booking_Deposit"
        : paymentMode === "checkin"
          ? "CheckIn_Collection"
          : "Refund";

      await recordPayment({
        bookingId: Number(id),
        paymentType,
        paymentMethod: payload.paymentMethod,
        amountPaid: Number(payload.amountPaid),
        transactionCode: payload.transactionCode || null,
        note: payload.note || null,
      });

      showToast(paymentMode === "refund" ? "Đã ghi nhận hoàn tiền booking." : "Đã ghi nhận thanh toán booking.");
      setPaymentModalOpen(false);
      await load();
    } catch (e) {
      showToast(e?.response?.data?.message || "Không thể ghi nhận thanh toán booking.", "error");
    } finally {
      setPaymentLoading(false);
    }
  };

  const executeCheckIn = async (payload) => {
    setCheckInLoading(true);
    try {
      if (checkInDetailTarget) {
        await checkInRoom(id, { bookingDetailId: checkInDetailTarget, ...payload });
        showToast("Đã check-in phòng và cập nhật hồ sơ khách thành công.");
      } else {
        await checkIn(id, payload);
        showToast("Đã check-in và cập nhật hồ sơ khách thành công.");
      }
      setCheckInModalOpen(false);
      setCheckInDetailTarget(null);
      await load();
    } catch (e) {
      showToast(e?.response?.data?.message || "Check-in thất bại.", "error");
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckInDetail = async (detailId) => {
    if (!booking?.nationalId) {
      setCheckInDetailTarget(detailId);
      setCheckInModalOpen(true);
      return;
    }

    try {
      await checkInRoom(id, { bookingDetailId: detailId });
      showToast("Đã check-in phòng thành công.");
      await load();
    } catch (e) {
      showToast(e?.response?.data?.message || "Check-in từng phòng thất bại.", "error");
    }
  };

  const openExtendStayModal = (detail) => {
    setExtendStayTarget(detail);
    const currentOut = detail?.checkOutDate?.slice?.(0, 10) || "";
    let suggested = "";
    if (currentOut) {
      const d = new Date(currentOut);
      d.setDate(d.getDate() + 1);
      suggested = d.toISOString().slice(0, 10);
    }
    setExtendStayForm({ newCheckOutDate: suggested });
  };

  const executeExtendStay = async () => {
    if (!extendStayTarget || !extendStayForm.newCheckOutDate) return;
    const detail = extendStayTarget;
    const rawDate = extendStayForm.newCheckOutDate;

    setExtendStayLoading(true);
    try {
      await extendStay(id, { bookingDetailId: detail.id, newCheckOutDate: rawDate });
      showToast("Đã cập nhật ở thêm ngày.");
      setExtendStayConflict(null);
      setExtendStayTarget(null);
      await load();
    } catch (e) {
      const payload = e?.response?.data;
      if (payload?.data?.suggestions?.length) {
        setExtendStayTarget(null);
        setExtendStayConflict({
          bookingDetailId: detail.id,
          newCheckOutDate: payload.data.newCheckOutDate || rawDate,
          currentRoomId: payload.data.currentRoomId,
          currentRoomTypeId: payload.data.currentRoomTypeId,
          suggestions: payload.data.suggestions || [],
        });
        showToast("Phòng hiện tại bị trùng lịch. Hãy chọn một phòng thay thế bên dưới.", "warning");
      } else {
        showToast(payload?.message || "Ở thêm ngày thất bại.", "error");
      }
    } finally {
      setExtendStayLoading(false);
    }
  };

  const handleChooseAlternativeRoom = async (roomId) => {
    if (!extendStayConflict) return;

    try {
      await extendStay(id, {
        bookingDetailId: extendStayConflict.bookingDetailId,
        newCheckOutDate: extendStayConflict.newCheckOutDate,
        targetRoomId: roomId,
      });
      showToast("Đã đổi phòng thay thế và cập nhật ở thêm ngày.");
      setExtendStayConflict(null);
      await load();
    } catch (e) {
      showToast(e?.response?.data?.message || "Đổi sang phòng thay thế thất bại.", "error");
    }
  };

  const openEarlyCheckOutModal = (detail) => {
    setEarlyCheckOutTarget(detail);
    setEarlyCheckOutForm({ newCheckOutDate: detail?.checkOutDate?.slice?.(0, 10) || "" });
  };

  const openAddRoomModal = () => {
    const lastDetail = booking?.bookingDetails?.[booking.bookingDetails.length - 1];
    setAddRoomForm({
      roomTypeId: "",
      checkInDate: lastDetail?.checkInDate?.slice?.(0, 10) || "",
      checkOutDate: lastDetail?.checkOutDate?.slice?.(0, 10) || "",
      note: "",
    });
    setAddRoomModalOpen(true);
  };

  const executeEarlyCheckOut = async () => {
    if (!earlyCheckOutTarget || !earlyCheckOutForm.newCheckOutDate) return;

    setEarlyCheckOutLoading(true);
    try {
      await earlyCheckOut(id, { bookingDetailId: earlyCheckOutTarget.id, newCheckOutDate: earlyCheckOutForm.newCheckOutDate });
      showToast("Đã cập nhật out sớm và tính lại booking.");
      setEarlyCheckOutTarget(null);
      await load();
    } catch (e) {
      showToast(e?.response?.data?.message || "Out sớm thất bại.", "error");
    } finally {
      setEarlyCheckOutLoading(false);
    }
  };

  const executeAddRoom = async () => {
    if (!addRoomForm.roomTypeId || !addRoomForm.checkInDate || !addRoomForm.checkOutDate) return;

    setAddRoomLoading(true);
    try {
      await addRoomToBooking(id, {
        roomTypeId: Number(addRoomForm.roomTypeId),
        checkInDate: addRoomForm.checkInDate,
        checkOutDate: addRoomForm.checkOutDate,
        note: addRoomForm.note?.trim() || null,
      });
      showToast("Đã thêm phòng vào booking.");
      setAddRoomModalOpen(false);
      await load();
    } catch (e) {
      showToast(e?.response?.data?.message || "Thêm phòng thất bại.", "error");
    } finally {
      setAddRoomLoading(false);
    }
  };

  const executeCancel = async (reason) => {
    const normalizedReason = reason.trim();
    if (!normalizedReason) return;
    
    setCancelLoading(true);
    try {
      await cancelBooking(id, normalizedReason);
      showToast("Đã hủy booking thành công.");
      setCancelModalOpen(false);
      await load();
    } catch (e) {
      showToast(e?.response?.data?.message || "Hủy thất bại.", "error");
    } finally {
      setCancelLoading(false);
    }
  };

  const timelineItems = useMemo(() => (timeline || []).slice().sort((a, b) => new Date(a.at) - new Date(b.at)), [timeline]);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', sans-serif; }
        @keyframes toastIn { from{transform:translateX(110%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes toastProgress { from{width:100%} to{width:0} }
        @keyframes modalSlideUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .table-row { transition: background 0.1s; border-bottom: 1px solid var(--a-border); }
        .table-row:hover { background: var(--a-surface-soft) !important; }
        .badge-p { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
        .action-btn { display: inline-flex; alignItems: center; gap: 8px; padding: 10px 22px; borderRadius: 12px; font-size: 14px; font-weight: 800; background: var(--a-surface-raised); color: var(--a-text); border: 1.5px solid var(--a-border); cursor: pointer; transition: all 0.15s; }
        .action-btn:hover:not(:disabled) { border-color: var(--a-primary); color: var(--a-primary); background: var(--a-primary-soft); }
        .action-btn.primary { background: linear-gradient(135deg,#4f645b 0%,#43574f 100%); color: #e7fef3; border: none; font-weight: 800; }
        .action-btn.primary:hover:not(:disabled) { box-shadow: 0 4px 14px rgba(79,100,91,0.25); }
        .action-btn.danger { color: var(--a-error); border-color: var(--a-error-border); font-weight: 800; }
        .action-btn.danger:hover:not(:disabled) { background: var(--a-error-bg); }
        .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      {/* Khu vực thông báo */}
      <div style={{ position: "fixed", top: 24, right: 24, zIndex: 300, pointerEvents: "none", minWidth: 280 }}>
        {toasts.map((t) => <Toast key={t.id} {...t} onDismiss={dismissToast} />)}
      </div>

      <CancelModal
        key={cancelModalOpen ? "open" : "closed"}
        open={cancelModalOpen}
        onConfirm={executeCancel}
        onCancel={() => setCancelModalOpen(false)}
        loading={cancelLoading}
      />
      <CheckInModal
        key={checkInModalOpen ? "checkin-open" : "checkin-closed"}
        open={checkInModalOpen}
        booking={booking}
        onConfirm={executeCheckIn}
        onCancel={() => {
          setCheckInModalOpen(false);
          setCheckInDetailTarget(null);
        }}
        loading={checkInLoading}
      />
      <BookingPaymentModal
        key={paymentModalOpen ? `payment-${paymentMode}` : "payment-closed"}
        open={paymentModalOpen}
        booking={booking}
        mode={paymentMode}
        onConfirm={executeBookingPayment}
        onCancel={() => setPaymentModalOpen(false)}
        loading={paymentLoading}
      />
      <AddRoomModal
        open={addRoomModalOpen}
        loading={addRoomLoading}
        roomTypes={roomTypes}
        booking={booking}
        form={addRoomForm}
        onChange={(field, value) => setAddRoomForm((prev) => ({ ...prev, [field]: value }))}
        onConfirm={executeAddRoom}
        onCancel={() => setAddRoomModalOpen(false)}
      />
      <EarlyCheckOutModal
        open={!!earlyCheckOutTarget}
        detail={earlyCheckOutTarget}
        loading={earlyCheckOutLoading}
        form={earlyCheckOutForm}
        onChange={(field, value) => setEarlyCheckOutForm((prev) => ({ ...prev, [field]: value }))}
        onConfirm={executeEarlyCheckOut}
        onCancel={() => setEarlyCheckOutTarget(null)}
      />
      <ExtendStayModal
        open={!!extendStayTarget}
        detail={extendStayTarget}
        loading={extendStayLoading}
        form={extendStayForm}
        onChange={(field, value) => setExtendStayForm((prev) => ({ ...prev, [field]: value }))}
        onConfirm={executeExtendStay}
        onCancel={() => setExtendStayTarget(null)}
      />

      {extendStayConflict && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2100, padding: 20 }}
          onClick={(e) => e.target === e.currentTarget && setExtendStayConflict(null)}
        >
          <div style={{ background: "var(--a-surface-raised)", borderRadius: 24, width: "100%", maxWidth: 760, boxShadow: "var(--a-shadow-lg)", border: "1px solid var(--a-border)", padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--a-text)", margin: "0 0 6px" }}>Gợi ý phòng thay thế để ở thêm</h3>
                <p style={{ fontSize: 13, color: "var(--a-text-muted)", margin: 0 }}>
                  Phòng hiện tại đã bị trùng lịch trong phần ngày ở thêm. Bạn có thể chọn một phòng khác để chuyển sang ở tiếp.
                </p>
              </div>
              <button onClick={() => setExtendStayConflict(null)} className="action-btn" style={{ padding: "8px 12px", fontSize: 12 }}>
                Đóng
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {(extendStayConflict.suggestions || []).map((room) => (
                <div
                  key={room.id}
                  style={{
                    border: "1px solid var(--a-info-border)",
                    background: "var(--a-info-bg)",
                    borderRadius: 16,
                    padding: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "var(--a-text)", marginBottom: 4 }}>
                      Phòng {room.roomNumber} • {room.roomTypeName}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--a-text-muted)", marginBottom: 4 }}>
                      Tầng {room.floor} • {room.sameRoomType ? "Cùng hạng phòng" : "Khác hạng phòng"}
                    </div>
                    <div style={{ fontSize: 12, color: room.sameRoomType ? "var(--a-success)" : "var(--a-info)", fontWeight: 700 }}>
                      {room.sameRoomType ? "Ưu tiên cùng hạng" : "Có thể đổi sang hạng khác"} • {formatCurrency(room.basePrice)}/đêm
                    </div>
                  </div>
                  <button
                    onClick={() => handleChooseAlternativeRoom(room.id)}
                    className="action-btn primary"
                    style={{ padding: "10px 16px", fontSize: 13, flexShrink: 0 }}
                  >
                    Chọn phòng này
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => navigate("/admin/bookings")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--a-text-muted)", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, marginBottom: 12 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Quay lại danh sách
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "var(--a-text)", letterSpacing: "-0.025em", margin: 0 }}>
            Chi tiết Đặt phòng
            {booking && <span style={{ marginLeft: 12, color: "var(--a-text-soft)", fontWeight: 600, fontSize: 16 }}>#{booking.bookingCode}</span>}
          </h2>
          {booking && <BookingStatusBadge status={booking.status} />}
        </div>
      </div>

      {!loading && booking && (
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Main Info Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Summary Card */}
            <div style={{ background: "var(--a-surface-raised)", borderRadius: 18, border: "1px solid var(--a-border)", padding: 24, boxShadow: "var(--a-shadow-sm)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--a-text)", margin: "0 0 20px" }}>Thông tin khách hàng & Báo giá</h3>
              {booking.status === "Checked_out_pending_settlement" && (
                <div style={{ marginBottom: 20, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--a-warning-border)", background: "var(--a-warning-bg)", color: "var(--a-warning)", fontSize: 13, fontWeight: 700 }}>
                  Khách đã check-out. Booking này đang chờ quyết toán hóa đơn trước khi chuyển sang Completed.
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                <div>
                  <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Tên khách hàng</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--a-text)" }}>{booking.guestName || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Số điện thoại</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--a-text)" }}>{booking.guestPhone || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Email</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--a-text)" }}>{booking.guestEmail || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Nguồn booking</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--a-text)" }}>{getBookingSourceLabel(booking.source)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Tổng dự kiến</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--a-success)" }}>{formatCurrency(booking.totalEstimatedAmount)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Đã thu trước lưu trú</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--a-primary)" }}>{formatCurrency(booking.depositAmount)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Mức cần để xác nhận</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--a-text)" }}>{formatCurrency(booking.paymentSummary?.requiredBookingDepositAmount || 0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Mức cần để nhận phòng</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--a-text)" }}>{formatCurrency(booking.paymentSummary?.requiredCheckInAmount || 0)}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Tiến độ thanh toán trước lưu trú</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--a-text)" }}>
                    {booking.paymentSummary?.canCheckIn
                      ? "Booking đã đủ điều kiện nhận phòng."
                      : booking.status === "Pending"
                        ? `Cần thêm ${formatCurrency(booking.paymentSummary?.remainingToConfirm || 0)} để xác nhận booking.`
                        : `Cần thêm ${formatCurrency(booking.paymentSummary?.remainingToCheckIn || 0)} để đủ điều kiện nhận phòng.`}
                  </div>
                </div>
                {booking.status === "Cancelled" && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: 12, color: "var(--a-error)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Lý do hủy</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--a-error)", background: "var(--a-error-bg)", padding: "10px 14px", borderRadius: 10, border: "1px dashed var(--a-error-border)" }}>{booking.cancellationReason || "-"}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Rooms Table */}
            <div style={{ background: "var(--a-surface-raised)", borderRadius: 18, border: "1px solid var(--a-border)", overflow: "hidden", boxShadow: "var(--a-shadow-sm)" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--a-border)", background: "var(--a-surface-soft)" }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--a-text)", margin: 0 }}>Danh sách hạng phòng booking</h3>
              </div>
              {isMobile && (
                <div style={{ display: "grid", gap: 12, padding: 14 }}>
                  {(booking.bookingDetails || []).map((detail) => (
                    <article key={detail.id} style={{ border: "1px solid var(--a-border)", borderRadius: 16, padding: 14, display: "grid", gap: 12, background: "var(--a-surface)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 900, color: "var(--a-text)" }}>{detail.roomTypeName || "-"}</div>
                          <div style={{ marginTop: 6, display: "inline-flex", padding: "4px 10px", borderRadius: 999, background: "var(--a-success-bg)", color: "var(--a-success)", fontWeight: 900, fontSize: 12, border: "1px solid var(--a-success-border)" }}>
                            Phòng {detail.roomName || "N/A"}
                          </div>
                        </div>
                        <div style={{ color: "var(--a-primary)", fontWeight: 900 }}>{formatCurrency(detail.pricePerNight)}</div>
                      </div>
                      {isTransferExtensionDetail(detail) && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, width: "fit-content", padding: "4px 10px", borderRadius: 999, background: "var(--a-info-bg)", color: "var(--a-info)", fontSize: 11, fontWeight: 800, border: "1px solid var(--a-info-border)" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>swap_horiz</span>
                          Chặng chuyển phòng
                        </span>
                      )}
                      <div style={{ display: "grid", gap: 4, fontSize: 13, color: "var(--a-text-muted)" }}>
                        <div><strong>In:</strong> {formatDate(detail.checkInDate)}</div>
                        <div><strong>Out:</strong> {formatDate(detail.checkOutDate)}</div>
                        {detail.note && <div style={{ color: "var(--a-text-soft)", lineHeight: 1.45 }}>{detail.note}</div>}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {!detail.roomId && (booking.status === "Confirmed" || booking.status === "Checked_in") && (
                          <button className="action-btn" style={{ justifyContent: "center", padding: "9px 12px", fontSize: 12, gridColumn: "1 / -1" }} onClick={() => handleCheckInDetail(detail.id)}>
                            Check-in phòng
                          </button>
                        )}
                        {(booking.status === "Confirmed" || booking.status === "Checked_in") && (
                          <>
                            <button className="action-btn" style={{ justifyContent: "center", padding: "9px 12px", fontSize: 12 }} onClick={() => openExtendStayModal(detail)}>
                              Ở thêm
                            </button>
                            <button className="action-btn" style={{ justifyContent: "center", padding: "9px 12px", fontSize: 12 }} onClick={() => openEarlyCheckOutModal(detail)}>
                              Out sớm
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <div className="overflow-x-auto" style={{ display: isMobile ? "none" : "block" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--a-surface)" }}>
                    <th style={{ padding: "14px 24px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", borderBottom: "1px solid var(--a-border)", textTransform: "uppercase", letterSpacing: ".05em" }}>Hạng phòng</th>
                    <th style={{ padding: "14px 24px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", borderBottom: "1px solid var(--a-border)", textTransform: "uppercase", letterSpacing: ".05em" }}>Phòng (N/A nếu chưa gán)</th>
                    <th style={{ padding: "14px 24px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", borderBottom: "1px solid var(--a-border)", textTransform: "uppercase", letterSpacing: ".05em" }}>Thời gian</th>
                    <th style={{ padding: "14px 24px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", borderBottom: "1px solid var(--a-border)", textTransform: "uppercase", letterSpacing: ".05em" }}>Giá/Đêm</th>
                    <th style={{ padding: "14px 24px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", borderBottom: "1px solid var(--a-border)", textTransform: "uppercase", letterSpacing: ".05em" }}>Nghiệp vụ</th>
                  </tr>
                </thead>
                <tbody>
                  {(booking.bookingDetails || []).map((detail) => (
                    <tr key={detail.id} className="table-row">
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--a-text)" }}>{detail.roomTypeName || "-"}</div>
                        {isTransferExtensionDetail(detail) && (
                          <div style={{ marginTop: 8 }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 10px",
                                borderRadius: 999,
                                background: "var(--a-info-bg)",
                                color: "var(--a-info)",
                                fontSize: 11,
                                fontWeight: 800,
                                border: "1px solid var(--a-info-border)",
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>swap_horiz</span>
                              Chặng chuyển phòng
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ padding: "3px 10px", borderRadius: 8, background: "var(--a-success-bg)", color: "var(--a-success)", fontWeight: 800, fontSize: 14, display: "inline-block", border: "1px solid var(--a-success-border)" }}>
                          {detail.roomName || "-"}
                        </div>
                        {isTransferExtensionDetail(detail) && (
                          <div style={{ fontSize: 11, color: "var(--a-text-muted)", marginTop: 8 }}>
                            Đây là phòng được thêm mới để nối tiếp thời gian ở sau khi đổi phòng.
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--a-text)" }}>In: {formatDate(detail.checkInDate)}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--a-text-muted)", marginTop: 4 }}>Out: {formatDate(detail.checkOutDate)}</div>
                        {detail.note && (
                          <div style={{ fontSize: 11, color: "var(--a-text-muted)", marginTop: 8, lineHeight: 1.45 }}>
                            {detail.note}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#4f645b" }}>{formatCurrency(detail.pricePerNight)}</div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                          {!detail.roomId && (booking.status === "Confirmed" || booking.status === "Checked_in") && (
                            <button className="action-btn" style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => handleCheckInDetail(detail.id)}>
                              Check-in phòng
                            </button>
                          )}
                          {(booking.status === "Confirmed" || booking.status === "Checked_in") && (
                            <>
                              <button className="action-btn" style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => openExtendStayModal(detail)}>
                                Ở thêm
                              </button>
                              <button className="action-btn" style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => openEarlyCheckOutModal(detail)}>
                                Out sớm
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>

          {/* Right Column: Actions & Timeline */}
          <div className="w-full xl:w-[320px] shrink-0 flex flex-col gap-6">
            {/* Actions Card */}
            <div style={{ background: "var(--a-surface-raised)", borderRadius: 18, border: "1px solid var(--a-border)", padding: 24, boxShadow: "var(--a-shadow-sm)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--a-text)", margin: "0 0 16px" }}>Hành động</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button className="action-btn primary" disabled={!canRun("collect_deposit")} onClick={() => runAction("collect_deposit")}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span> Thu cọc booking
                </button>
                <button className="action-btn" disabled={!canRun("collect_checkin")} onClick={() => runAction("collect_checkin")}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>account_balance_wallet</span> Thu thêm để nhận phòng
                </button>
                <button className="action-btn" disabled={!canRun("checkin")} onClick={() => runAction("checkin")}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span> Khách Check-in
                </button>
                <button className="action-btn" disabled={!canRun("checkout")} onClick={() => runAction("checkout")}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span> Khách Check-out
                </button>
                <button className="action-btn" disabled={!canRun("open_invoice")} onClick={() => runAction("open_invoice")}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>receipt_long</span> Mở hóa đơn
                </button>
                <button className="action-btn" disabled={!(booking?.status === "Pending" || booking?.status === "Confirmed" || booking?.status === "Checked_in")} onClick={openAddRoomModal}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_home</span> Thêm phòng vào booking
                </button>
                <button className="action-btn" disabled={!canRun("refund")} onClick={() => runAction("refund")}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>reply</span> Hoàn tiền booking
                </button>
                <button className="action-btn danger" disabled={!canRun("cancel")} onClick={() => runAction("cancel")}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>cancel</span> Hủy đặt phòng
                </button>
              </div>
            </div>

            {/* Timeline Card */}
            <div style={{ background: "var(--a-surface-raised)", borderRadius: 18, border: "1px solid var(--a-border)", padding: 24, boxShadow: "var(--a-shadow-sm)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--a-text)", margin: "0 0 20px" }}>Lịch sử hoạt động</h3>
              {timelineItems.length === 0 && <div style={{ fontSize: 13, color: "var(--a-text-soft)" }}>Chưa có hoạt động nào.</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {timelineItems.map((item, index) => (
                  <div key={`${item.type}-${index}`} style={{ display: "flex", gap: 14, position: "relative" }}>
                    {/* Line */}
                    {index < timelineItems.length - 1 && (
                      <div style={{ position: "absolute", left: 7, top: 20, bottom: -10, width: 2, background: "var(--a-border)" }} />
                    )}
                    {/* Dot */}
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--a-primary-soft)", border: "2px solid var(--a-primary)", flexShrink: 0, marginTop: 4, zIndex: 1 }} />
                    {/* Content */}
                    <div style={{ paddingBottom: 20 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--a-text)" }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: "var(--a-text-soft)", marginTop: 2 }}>{formatDate(item.at)} • {item.type}</div>
                      {item.note && <div style={{ fontSize: 13, color: "var(--a-text-muted)", background: "var(--a-surface-soft)", padding: "8px 12px", borderRadius: 8, marginTop: 8, border: "1px solid var(--a-border)" }}>{item.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




