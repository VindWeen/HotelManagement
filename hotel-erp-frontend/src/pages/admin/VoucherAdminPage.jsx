import { useCallback, useEffect, useMemo, useState } from "react";
import { createVoucher, getVouchers, updateVoucher } from "../../api/vouchersApi";
import { getAdminRoomTypes } from "../../api/roomTypesApi";
import { getUsers } from "../../api/userManagementApi";
import { getMemberships } from "../../api/membershipsApi";
import { useResponsiveAdmin } from "../../hooks/useResponsiveAdmin";

const pageCard = {
  background: "var(--a-surface)",
  border: "1px solid var(--a-border)",
  borderRadius: 20,
  boxShadow: "none",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid var(--a-surface-bright)",
  background: "var(--a-bg)",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--a-text)",
  outline: "none",
  fontFamily: "'Manrope', sans-serif",
  boxShadow: "0 0 0 0 rgba(165, 214, 167, 0)",
};

const primaryButton = {
  height: 42,
  padding: "0 18px",
  borderRadius: 12,
  border: "none",
  background: "var(--a-primary)",
  color: "var(--a-text-inverse)",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "'Manrope', sans-serif",
  boxShadow: "none",
};

const secondaryButton = {
  height: 40,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid var(--a-primary)",
  background: "transparent",
  color: "var(--a-primary)",
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "'Manrope', sans-serif",
};

const AUDIENCE_OPTIONS = [
  { value: "PUBLIC", label: "Công khai" },
  { value: "USER", label: "Khách cụ thể" },
  { value: "BIRTHDAY_MONTH", label: "Sinh nhật" },
  { value: "MEMBERSHIP", label: "Hạng thành viên" },
  { value: "HOLIDAY", label: "Dịp lễ" },
];

const audienceLabel = (value) =>
  AUDIENCE_OPTIONS.find((item) => item.value === (value || "PUBLIC"))?.label || "Công khai";

const defaultForm = {
  code: "",
  discountType: "PERCENT",
  discountValue: "",
  maxDiscountAmount: "",
  minBookingValue: "",
  applicableRoomTypeId: "",
  validFrom: "",
  validTo: "",
  usageLimit: "",
  maxUsesPerUser: "1",
  audienceType: "PUBLIC",
  targetMembershipId: "",
  occasionName: "",
  targetUserIds: [],
  sendEmailToRecipients: true,
  isActive: true,
};

const fmtCurrency = (value) =>
  value == null ? "0đ" : `${new Intl.NumberFormat("vi-VN").format(Number(value) || 0)}đ`;

const fmtDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const toDateTimeLocalValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const sanitizeCodeToken = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, "")
    .toUpperCase();

const buildVoucherCode = ({
  audienceType,
  discountType,
  targetMembershipId,
  memberships,
  occasionName,
  validFrom,
}) => {
  const membership = memberships.find((item) => String(item.id) === String(targetMembershipId || ""));
  const month = validFrom ? new Date(validFrom).getMonth() + 1 : new Date().getMonth() + 1;
  const audiencePrefixMap = {
    PUBLIC: "PUB",
    USER: "CUS",
    BIRTHDAY_MONTH: `BD${String(month).padStart(2, "0")}`,
    MEMBERSHIP: sanitizeCodeToken(membership?.tierName || "MEM"),
    HOLIDAY: sanitizeCodeToken(occasionName || "HOL"),
  };
  const audiencePrefix = audiencePrefixMap[audienceType] || "VOU";
  const discountPrefix = discountType === "FIXED_AMOUNT" ? "FIX" : "PCT";
  const randomBlock = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${audiencePrefix}-${discountPrefix}-${randomBlock}`.slice(0, 30);
};

function StatusSwitch({ active, onToggle, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={active}
      aria-label={active ? "Tắt voucher" : "Bật voucher"}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        width: 76,
        height: 30,
        padding: 3,
        borderRadius: 999,
        border: active ? "1px solid var(--a-success-border)" : "1px solid var(--a-border)",
        background: active ? "var(--a-success-bg)" : "var(--a-surface-raised)",
        cursor: disabled ? "wait" : "pointer",
        transition: "all 0.2s ease",
        fontFamily: "'Manrope', sans-serif",
        opacity: disabled ? 0.72 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          left: active ? 12 : "auto",
          right: active ? "auto" : 12,
          fontSize: 10,
          fontWeight: 900,
          color: active ? "var(--a-success)" : "var(--a-text-muted)",
          pointerEvents: "none",
          transition: "all 0.2s ease",
        }}
      >
        {active ? "Bật" : "Tắt"}
      </span>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 3,
          top: 2,
          width: 24,
          height: 24,
          borderRadius: 999,
          background: active ? "var(--a-primary)" : "var(--a-surface)",
          border: active ? "1px solid var(--a-success-border)" : "1px solid var(--a-border)",
          transform: active ? "translateX(46px)" : "translateX(0)",
          transition: "transform 0.22s ease, border-color 0.2s ease",
        }}
      />
    </button>
  );
}

function Modal({ open, title, onClose, children }) {
  const { isMobile } = useResponsiveAdmin();
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--a-overlay)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 24,
        zIndex: 1200,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ ...pageCard, background: "var(--a-surface)", width: "100%", maxWidth: isMobile ? "100%" : 760, maxHeight: isMobile ? "92vh" : "90vh", overflowY: "auto", padding: isMobile ? 16 : 24, borderRadius: isMobile ? "24px 24px 0 0" : 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--a-text-muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>
              Quản trị voucher
            </div>
            <h3 style={{ margin: "6px 0 0", fontSize: 22, color: "var(--a-text)" }}>{title}</h3>
          </div>
          <button type="button" onClick={onClose} style={{ ...secondaryButton, width: 40, padding: 0 }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ msg, type = "success", onDismiss }) {
  const styles = {
    success: {
      bg: "rgba(236, 253, 245, 0.98)",
      border: "1px solid #86efac",
      text: "#166534",
      prog: "#22c55e",
    },
    error: {
      bg: "rgba(254, 242, 242, 0.98)",
      border: "1px solid #fca5a5",
      text: "#b91c1c",
      prog: "#ef4444",
    },
    info: {
      bg: "rgba(239, 246, 255, 0.98)",
      border: "1px solid #93c5fd",
      text: "#1d4ed8",
      prog: "#3b82f6",
    },
  };
  const s = styles[type] || styles.success;
  const dur = 4200;

  useEffect(() => {
    const timer = setTimeout(onDismiss, dur);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div style={{ background: s.bg, border: s.border, color: s.text, borderRadius: 16, overflow: "hidden", boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)", marginBottom: 10, minWidth: 280, maxWidth: 420, animation: "toastIn .32s cubic-bezier(.22,1,.36,1) forwards" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px" }}>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>{msg}</div>
        <button type="button" onClick={onDismiss} style={{ border: "none", background: "transparent", color: s.text, cursor: "pointer", fontSize: 16, fontWeight: 800, padding: 0, lineHeight: 1 }}>
          ×
        </button>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,.45)" }}>
        <div style={{ height: "100%", background: s.prog, animation: `toastProgress ${dur}ms linear forwards` }} />
      </div>
    </div>
  );
}

export default function VoucherAdminPage() {
  const { isMobile, isTablet } = useResponsiveAdmin();
  const [rows, setRows] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [guests, setGuests] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [audienceType, setAudienceType] = useState("");
  const [loading, setLoading] = useState(false);
  const [togglingIds, setTogglingIds] = useState({});
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [toasts, setToasts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [guestSearch, setGuestSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const [voucherRes, roomTypeRes] = await Promise.all([
        getVouchers({ page: 1, pageSize: 200, keyword, status: status || undefined, audienceType: audienceType || undefined }),
        getAdminRoomTypes(),
      ]);
      setRows(voucherRes.data?.data || []);
      const roomTypePayload = roomTypeRes.data?.data || roomTypeRes.data || [];
      setRoomTypes(Array.isArray(roomTypePayload) ? roomTypePayload : []);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Không thể tải danh sách voucher.");
    } finally {
      setLoading(false);
    }
  }, [keyword, status, audienceType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;
    const loadTargets = async () => {
      try {
        const [usersRes, membershipRes] = await Promise.all([
          getUsers({ page: 1, pageSize: 500 }),
          getMemberships({ page: 1, pageSize: 200 }),
        ]);

        if (cancelled) return;

        const userList = usersRes.data?.data || [];
        setGuests(Array.isArray(userList) ? userList : []);
        setMemberships(membershipRes.data?.data || membershipRes.data || []);
      } catch {
        if (!cancelled) {
          setGuests([]);
          setMemberships([]);
        }
      }
    };

    loadTargets();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const activeCount = rows.filter((item) => item.isActive).length;
    const expiredCount = rows.filter((item) => item.validTo && new Date(item.validTo) < new Date()).length;
    const privateCount = rows.filter((item) => item.audienceType === "USER").length;
    return { total: rows.length, activeCount, expiredCount, privateCount };
  }, [rows]);

  const roomTypeMap = useMemo(
    () =>
      new Map(
        roomTypes.map((item) => [
          String(item.id),
          item.name,
        ]),
      ),
    [roomTypes],
  );

  const filteredGuests = useMemo(() => {
    const keyword = guestSearch.trim().toLowerCase();
    if (!keyword) return guests;
    return guests.filter((guest) =>
      [guest.fullName, guest.email, guest.phone, guest.roleName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [guestSearch, guests]);

  const guestRecipients = useMemo(
    () => guests.filter((guest) => guest.roleName === "Guest" && guest.status !== false && guest.email),
    [guests],
  );

  const selectedMembership = useMemo(
    () => memberships.find((item) => String(item.id) === String(form.targetMembershipId || "")) || null,
    [memberships, form.targetMembershipId],
  );

  const birthdayTargetMonth = useMemo(() => {
    if (!form.validFrom) return new Date().getMonth() + 1;
    const date = new Date(form.validFrom);
    return Number.isNaN(date.getTime()) ? new Date().getMonth() + 1 : date.getMonth() + 1;
  }, [form.validFrom]);

  const estimatedRecipientCount = useMemo(() => {
    if (form.audienceType === "USER") return form.targetUserIds.length;
    if (form.audienceType === "BIRTHDAY_MONTH") {
      return guestRecipients.filter((guest) => {
        if (!guest.dateOfBirth) return false;
        const date = new Date(guest.dateOfBirth);
        return !Number.isNaN(date.getTime()) && date.getMonth() + 1 === birthdayTargetMonth;
      }).length;
    }
    if (form.audienceType === "MEMBERSHIP") {
      return guestRecipients.filter((guest) => String(guest.membershipId || "") === String(form.targetMembershipId || "")).length;
    }
    return guestRecipients.length;
  }, [birthdayTargetMonth, form.audienceType, form.targetMembershipId, form.targetUserIds.length, guestRecipients]);

  const emailAudienceHint = useMemo(() => {
    if (form.audienceType === "USER") {
      return `Email sẽ gửi cho ${estimatedRecipientCount} khách đang được chọn.`;
    }
    if (form.audienceType === "BIRTHDAY_MONTH") {
      return `Email sẽ gửi cho khách Guest có tháng sinh là tháng ${birthdayTargetMonth}.`;
    }
    if (form.audienceType === "MEMBERSHIP") {
      return selectedMembership
        ? `Email sẽ gửi cho thành viên thuộc hạng ${selectedMembership.tierName}.`
        : "Chọn hạng thành viên để xác định người nhận email.";
    }
    if (form.audienceType === "HOLIDAY") {
      return "Email sẽ gửi cho toàn bộ khách Guest đang hoạt động.";
    }
    return "Email sẽ gửi cho toàn bộ khách Guest đang hoạt động.";
  }, [birthdayTargetMonth, estimatedRecipientCount, form.audienceType, selectedMembership]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({
      ...defaultForm,
      code: buildVoucherCode({
        audienceType: defaultForm.audienceType,
        discountType: defaultForm.discountType,
        targetMembershipId: defaultForm.targetMembershipId,
        memberships,
        occasionName: defaultForm.occasionName,
        validFrom: defaultForm.validFrom,
      }),
    });
    setGuestSearch("");
    setErrorMessage("");
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      code: item.code || "",
      discountType: item.discountType || "PERCENT",
      discountValue: item.discountValue?.toString() || "",
      maxDiscountAmount: item.maxDiscountAmount?.toString() || "",
      minBookingValue: item.minBookingValue?.toString() || "",
      applicableRoomTypeId: item.applicableRoomTypeId?.toString() || "",
      validFrom: toDateTimeLocalValue(item.validFrom),
      validTo: toDateTimeLocalValue(item.validTo),
      usageLimit: item.usageLimit?.toString() || "",
      maxUsesPerUser: item.maxUsesPerUser?.toString() || "1",
      audienceType: item.audienceType || "PUBLIC",
      targetMembershipId: item.targetMembershipId?.toString() || "",
      occasionName: item.occasionName || "",
      targetUserIds: (item.targetUsers || []).map((target) => Number(target.userId)),
      sendEmailToRecipients: false,
      isActive: item.isActive !== false,
    });
    setGuestSearch("");
    setErrorMessage("");
    setModalOpen(true);
  };

  const regenerateVoucherCode = () => {
    setForm((prev) => ({
      ...prev,
      code: buildVoucherCode({
        audienceType: prev.audienceType,
        discountType: prev.discountType,
        targetMembershipId: prev.targetMembershipId,
        memberships,
        occasionName: prev.occasionName,
        validFrom: prev.validFrom,
      }),
    }));
  };

  const buildPayload = () => ({
    code: form.code.trim(),
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    maxDiscountAmount: form.maxDiscountAmount === "" ? null : Number(form.maxDiscountAmount),
    minBookingValue: form.minBookingValue === "" ? null : Number(form.minBookingValue),
    applicableRoomTypeId: form.applicableRoomTypeId === "" ? null : Number(form.applicableRoomTypeId),
    validFrom: form.validFrom || null,
    validTo: form.validTo || null,
    usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
    maxUsesPerUser: Number(form.maxUsesPerUser || 1),
    audienceType: form.audienceType,
    targetMembershipId: form.audienceType === "MEMBERSHIP" && form.targetMembershipId !== "" ? Number(form.targetMembershipId) : null,
    occasionName: form.audienceType === "HOLIDAY" ? form.occasionName.trim() : null,
    targetUserIds: form.audienceType === "USER" ? form.targetUserIds.map(Number) : [],
    sendEmailToRecipients: Boolean(form.sendEmailToRecipients),
    isActive: form.isActive,
  });

  const submitForm = async (event) => {
    event.preventDefault();
    if (!form.code.trim() && !editingItem) {
      setErrorMessage("Vui lòng nhập mã voucher.");
      return;
    }
    if (Number(form.discountValue) <= 0) {
      setErrorMessage("Giá trị giảm phải lớn hơn 0.");
      return;
    }
    if (form.discountType === "PERCENT" && (Number(form.discountValue) < 1 || Number(form.discountValue) > 100)) {
      setErrorMessage("Voucher phần trăm chỉ được nhập từ 1 đến 100.");
      return;
    }
    if (form.audienceType === "USER" && form.targetUserIds.length === 0) {
      setErrorMessage("Vui lòng chọn ít nhất một khách cho voucher riêng.");
      return;
    }
    if (form.audienceType === "MEMBERSHIP" && !form.targetMembershipId) {
      setErrorMessage("Vui lòng chọn hạng thành viên áp dụng.");
      return;
    }
    if (form.audienceType === "HOLIDAY" && !form.occasionName.trim()) {
      setErrorMessage("Vui lòng nhập tên dịp lễ.");
      return;
    }

    if (!editingItem && form.sendEmailToRecipients && estimatedRecipientCount === 0) {
      setErrorMessage("Không có người nhận phù hợp để gửi email cho voucher này.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    try {
      const payload = buildPayload();
      if (editingItem) {
        const response = await updateVoucher(editingItem.id, payload);
        pushToast(response?.data?.message || `Đã cập nhật voucher ${editingItem.code}.`, "success");
      } else {
        const response = await createVoucher(payload);
        pushToast(response?.data?.message || "Tạo voucher thành công.", "success");
        if (response?.data?.emailWarning) {
          pushToast(response.data.emailWarning, "info");
        }
      }
      setModalOpen(false);
      await loadData();
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Không thể lưu voucher.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item) => {
    const nextActive = item.isActive === false;
    setTogglingIds((prev) => ({ ...prev, [item.id]: true }));
    setRows((prev) =>
      prev.map((row) =>
        row.id === item.id
          ? { ...row, isActive: nextActive }
          : row
      ),
    );
    try {
      await updateVoucher(item.id, { isActive: nextActive });
      pushToast(nextActive ? `Đã bật voucher ${item.code}.` : `Đã tắt voucher ${item.code}.`, "success");
    } catch (error) {
      setRows((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? { ...row, isActive: item.isActive }
            : row
        ),
      );
      setErrorMessage(error?.response?.data?.message || "Không thể cập nhật trạng thái voucher.");
    } finally {
      setTogglingIds((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  };

  const toggleTargetUser = (userId) => {
    setForm((prev) => {
      const id = Number(userId);
      const exists = prev.targetUserIds.includes(id);
      return {
        ...prev,
        targetUserIds: exists
          ? prev.targetUserIds.filter((item) => item !== id)
          : [...prev.targetUserIds, id],
      };
    });
  };

  const selectAllFilteredGuests = () => {
    setForm((prev) => ({
      ...prev,
      targetUserIds: Array.from(new Set([...prev.targetUserIds, ...filteredGuests.map((guest) => Number(guest.id))])),
    }));
  };

  const clearTargetUsers = () => {
    setForm((prev) => ({ ...prev, targetUserIds: [] }));
  };

  const pushToast = useCallback((msg, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, type }]);
  }, []);

  const dismissToast = useCallback((toastId) => {
    setToasts((prev) => prev.filter((item) => item.id !== toastId));
  }, []);

  return (
    <div style={{ maxWidth: 1360, margin: "0 auto", paddingInline: isMobile ? 4 : 0 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', sans-serif; }
        .voucher-input::placeholder { color: var(--a-text-soft); }
        .voucher-input:focus,
        .voucher-select:focus {
          border-color: var(--a-primary) !important;
          box-shadow: 0 0 0 2px rgba(165, 214, 167, 0.2) !important;
        }
        .voucher-primary:hover { background: var(--a-primary-hover) !important; }
        .voucher-ghost:hover {
          background: var(--a-surface-bright) !important;
          color: var(--a-text) !important;
          border-color: var(--a-surface-bright) !important;
        }
        .voucher-row:hover td { background: var(--a-surface-bright); }
        .voucher-mobile-card:hover {
          background: color-mix(in srgb, var(--a-surface-raised) 82%, var(--a-surface-bright));
          border-color: var(--a-border-strong);
        }
        @keyframes toastIn { from{transform:translateX(110%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes toastProgress { from{width:100%} to{width:0} }
      `}</style>
      <div style={{ position: "fixed", top: isMobile ? 12 : 20, right: isMobile ? 12 : 20, zIndex: 1400, pointerEvents: "none" }}>
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: "auto" }}>
            <Toast {...toast} onDismiss={() => dismissToast(toast.id)} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 28, color: "var(--a-text)", fontWeight: 800 }}>Voucher</h2>
          <p style={{ margin: "8px 0 0", color: "var(--a-text-muted)", fontSize: 14, maxWidth: 780, lineHeight: 1.65 }}>
            Quản lý danh sách voucher, chỉnh sửa cấu hình giảm giá và bật tắt voucher mà không ảnh hưởng tới luồng áp dụng voucher ở trang booking.
          </p>
        </div>
        <button className="voucher-primary" type="button" onClick={openCreateModal} style={{ ...primaryButton, width: isMobile ? "100%" : "auto", justifyContent: "center" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Thêm voucher
        </button>
      </div>

      {errorMessage ? (
        <div style={{ ...pageCard, marginBottom: 20, padding: 14, color: "var(--a-error)", background: "var(--a-error-bg)", borderColor: "var(--a-error-border)" }}>
          {errorMessage}
        </div>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 22 }}>
        {[
          { label: "Tổng voucher", value: stats.total, sub: "Tất cả mã đã tạo" },
          { label: "Đang bật", value: stats.activeCount, sub: "Voucher còn hiệu lực sử dụng" },
          { label: "Riêng khách", value: stats.privateCount, sub: "Voucher gắn với khách cụ thể" },
          { label: "Đã quá hạn", value: stats.expiredCount, sub: "Cần rà soát lại thời hạn" },
        ].map((item) => (
          <div key={item.label} style={{ ...pageCard, padding: 18 }}>
            <div style={{ color: "var(--a-text-muted)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>{item.label}</div>
            <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "var(--a-text)" }}>{item.value}</div>
            <div style={{ marginTop: 6, color: "var(--a-text-muted)", fontSize: 13 }}>{item.sub}</div>
          </div>
        ))}
      </section>

      <section style={{ ...pageCard, padding: isMobile ? 16 : 20, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 0.8fr 0.9fr auto", gap: 14, alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", marginBottom: 6 }}>Tìm mã voucher</label>
            <input className="voucher-input" value={keyword} onChange={(e) => setKeyword(e.target.value)} style={inputStyle} placeholder="Ví dụ: SUMMER, VIP..." />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", marginBottom: 6 }}>Trạng thái</label>
            <select className="voucher-select" value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Tất cả</option>
              <option value="active">Đang bật</option>
              <option value="inactive">Đang tắt</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", marginBottom: 6 }}>Phân loại voucher</label>
            <select className="voucher-select" value={audienceType} onChange={(e) => setAudienceType(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Tất cả</option>
              {AUDIENCE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <button className="voucher-ghost" type="button" onClick={loadData} style={{ ...secondaryButton, width: isMobile ? "100%" : "auto", justifyContent: "center" }}>Làm mới</button>
        </div>
      </section>

      <section style={{ ...pageCard, overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--a-border)", background: "var(--a-surface)" }}>
          <strong style={{ color: "var(--a-text)" }}>Danh sách voucher</strong>
          <p style={{ margin: "4px 0 0", color: "var(--a-text-muted)", fontSize: 13 }}>Tổng cộng {rows.length} voucher.</p>
        </div>
        {isMobile ? (
          <div style={{ display: "grid", gap: 12, padding: 16 }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--a-text-soft)" }}>Đang tải dữ liệu...</div>
            ) : rows.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--a-text-soft)" }}>Chưa có voucher nào.</div>
            ) : (
              rows.map((item) => (
                <article className="voucher-mobile-card" key={item.id} style={{ border: "1px solid var(--a-border)", borderRadius: 16, padding: 14, display: "grid", gap: 12, background: "var(--a-surface-raised)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ color: "var(--a-text)", fontWeight: 800 }}>{item.code}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "var(--a-text-muted)" }}>#{item.id}</div>
                    </div>
                    <StatusSwitch active={item.isActive !== false} onToggle={() => handleToggleActive(item)} disabled={Boolean(togglingIds[item.id])} />
                  </div>
                  <div style={{ display: "grid", gap: 6, fontSize: 13, color: "var(--a-text-muted)" }}>
                    <div>Giảm giá: <strong style={{ color: "var(--a-text)" }}>{item.discountType === "PERCENT" ? `${item.discountValue}%` : fmtCurrency(item.discountValue)}</strong></div>
                    <div>Phân loại: <strong style={{ color: "var(--a-info)" }}>{audienceLabel(item.audienceType)}</strong></div>
                    <div>Giảm tối đa: {item.maxDiscountAmount != null ? fmtCurrency(item.maxDiscountAmount) : "Không giới hạn"}</div>
                    <div>Tối thiểu: {item.minBookingValue != null ? fmtCurrency(item.minBookingValue) : "Không yêu cầu"}</div>
                    <div>Hạng phòng: {item.applicableRoomTypeId ? roomTypeMap.get(String(item.applicableRoomTypeId)) || `#${item.applicableRoomTypeId}` : "Tất cả"}</div>
                    <div>Hiệu lực: {fmtDateTime(item.validFrom)} - {fmtDateTime(item.validTo)}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                    <button className="voucher-primary" type="button" onClick={() => openEditModal(item)} style={{ ...primaryButton, width: "100%", justifyContent: "center" }}>Sửa</button>
                  </div>
                </article>
              ))
            )}
          </div>
        ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--a-surface-raised)", borderBottom: "1px solid var(--a-border)" }}>
                {["Mã voucher", "Phân loại", "Giảm giá", "Điều kiện", "Thời gian", "Trạng thái", "Thao tác"].map((heading, idx) => (
                  <th key={heading} style={{ padding: "16px 18px", textAlign: idx === 6 ? "right" : "left", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--a-text-muted)" }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "var(--a-text-soft)" }}>Đang tải dữ liệu...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "var(--a-text-soft)" }}>Chưa có voucher nào.</td></tr>
              ) : (
                rows.map((item) => (
                  <tr className="voucher-row" key={item.id} style={{ borderBottom: "1px solid var(--a-border)" }}>
                    <td style={{ padding: "16px 18px" }}>
                      <div style={{ color: "var(--a-text)", fontWeight: 800 }}>{item.code}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "var(--a-text-muted)" }}>#{item.id}</div>
                    </td>
                    <td style={{ padding: "16px 18px", color: "var(--a-text-muted)" }}>
                      <div style={{ fontWeight: 800, color: "var(--a-info)" }}>{audienceLabel(item.audienceType)}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "var(--a-text-muted)" }}>
                        {item.audienceType === "USER"
                          ? `${item.targetUsers?.length || 0} khách`
                          : item.audienceType === "MEMBERSHIP"
                            ? item.targetMembershipName || `#${item.targetMembershipId}`
                            : item.audienceType === "HOLIDAY"
                              ? item.occasionName || "Dịp lễ"
                              : item.audienceType === "BIRTHDAY_MONTH"
                                ? "Theo tháng sinh"
                                : "Mọi khách"}
                      </div>
                    </td>
                    <td style={{ padding: "16px 18px", color: "var(--a-text-muted)" }}>
                      <div style={{ fontWeight: 800, color: "var(--a-text)" }}>
                        {item.discountType === "PERCENT" ? `${item.discountValue}%` : fmtCurrency(item.discountValue)}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "var(--a-text-muted)" }}>
                        Giảm tối đa: {item.maxDiscountAmount != null ? fmtCurrency(item.maxDiscountAmount) : "Không giới hạn"}
                      </div>
                    </td>
                    <td style={{ padding: "16px 18px", color: "var(--a-text-muted)" }}>
                      <div>Tối thiểu: {item.minBookingValue != null ? fmtCurrency(item.minBookingValue) : "Không yêu cầu"}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "var(--a-text-muted)" }}>
                        Hạng phòng: {item.applicableRoomTypeId ? roomTypeMap.get(String(item.applicableRoomTypeId)) || `#${item.applicableRoomTypeId}` : "Tất cả"}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "var(--a-text-muted)" }}>
                        Đã dùng {item.usedCount || 0}/{item.usageLimit ?? "∞"} lượt
                      </div>
                    </td>
                    <td style={{ padding: "16px 18px", color: "var(--a-text-muted)" }}>
                      <div>Từ: {fmtDateTime(item.validFrom)}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "var(--a-text-muted)" }}>Đến: {fmtDateTime(item.validTo)}</div>
                    </td>
                    <td style={{ padding: "16px 18px" }}>
                      <StatusSwitch active={item.isActive !== false} onToggle={() => handleToggleActive(item)} disabled={Boolean(togglingIds[item.id])} />
                    </td>
                    <td style={{ padding: "16px 18px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                        <button className="voucher-ghost" type="button" onClick={() => openEditModal(item)} style={{ ...secondaryButton, fontWeight: 800 }}>Sửa</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </section>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? `Sửa voucher ${editingItem.code}` : "Tạo voucher mới"}>
        <form onSubmit={submitForm} style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", marginBottom: 6 }}>Mã voucher</label>
              <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
              {!editingItem ? (
                <div style={{ display: "contents" }}>
                  <button className="voucher-ghost" type="button" onClick={regenerateVoucherCode} style={{ ...secondaryButton, minHeight: 44, padding: "0 14px", fontSize: 12, whiteSpace: "nowrap", order: 2 }}>
                    Random mã
                  </button>
                </div>
              ) : null}
              <input
                className="voucher-input"
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: sanitizeCodeToken(e.target.value) }))}
                style={{ ...inputStyle, flex: 1, order: 1 }}
                placeholder="SUMMER2026"
                disabled={Boolean(editingItem)}
                required={!editingItem}
              />
              </div>
              {!editingItem ? (
                <div style={{ marginTop: 6, color: "var(--a-text-soft)", fontSize: 12 }}>
                  Gợi ý theo loại voucher đang chọn. Bạn có thể sửa lại trước khi lưu.
                </div>
              ) : null}
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", marginBottom: 6 }}>Loại giảm giá</label>
              <select className="voucher-select" value={form.discountType} onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="PERCENT">Phần trăm</option>
                <option value="FIXED_AMOUNT">Số tiền cố định</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", marginBottom: 6 }}>Đối tượng áp dụng</label>
              <select className="voucher-select" value={form.audienceType} onChange={(e) => setForm((prev) => ({ ...prev, audienceType: e.target.value, targetMembershipId: "", occasionName: "", targetUserIds: [], code: prev.code ? buildVoucherCode({ audienceType: e.target.value, discountType: prev.discountType, targetMembershipId: "", memberships, occasionName: "", validFrom: prev.validFrom }) : prev.code }))} style={{ ...inputStyle, cursor: "pointer" }}>
                {AUDIENCE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
            {form.audienceType === "MEMBERSHIP" ? (
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", marginBottom: 6 }}>Hạng thành viên</label>
                <select className="voucher-select" value={form.targetMembershipId} onChange={(e) => setForm((prev) => ({ ...prev, targetMembershipId: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Chọn hạng</option>
                  {memberships.map((item) => (
                    <option key={item.id} value={item.id}>{item.tierName}</option>
                  ))}
                </select>
              </div>
            ) : form.audienceType === "HOLIDAY" ? (
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", marginBottom: 6 }}>Tên dịp lễ</label>
                <input className="voucher-input" value={form.occasionName} onChange={(e) => setForm((prev) => ({ ...prev, occasionName: e.target.value }))} style={inputStyle} placeholder="Tết 2026, 30/4..." />
              </div>
            ) : (
              <div style={{ color: "var(--a-text-muted)", fontSize: 13, alignSelf: "end", lineHeight: 1.5 }}>
                {form.audienceType === "USER"
                  ? "Chọn khách cụ thể ở danh sách bên dưới."
                  : form.audienceType === "BIRTHDAY_MONTH"
                    ? "Áp dụng cho guest có tháng sinh trùng tháng hiện tại."
                    : "Áp dụng cho mọi guest đăng nhập."}
              </div>
            )}
          </div>

          {form.audienceType === "USER" ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)" }}>
                  Khách được áp dụng <span style={{ color: "var(--a-text)" }}>({form.targetUserIds.length} đã chọn)</span>
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="voucher-ghost" type="button" onClick={selectAllFilteredGuests} style={{ ...secondaryButton, height: 34 }}>Chọn tất cả đang lọc</button>
                  <button className="voucher-ghost" type="button" onClick={clearTargetUsers} style={{ ...secondaryButton, height: 34 }}>Bỏ chọn hết</button>
                </div>
              </div>
              <input
                className="voucher-input"
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                style={inputStyle}
                placeholder="Tìm theo tên, email, số điện thoại..."
              />
              <div style={{ display: "grid", gap: 8, maxHeight: 220, overflowY: "auto", border: "1px solid var(--a-border)", borderRadius: 12, padding: 10, background: "var(--a-bg)" }}>
                {guests.length === 0 ? (
                  <div style={{ color: "var(--a-text-soft)", fontSize: 13 }}>Chưa tải được danh sách khách.</div>
                ) : filteredGuests.length === 0 ? (
                  <div style={{ color: "var(--a-text-soft)", fontSize: 13 }}>Không có khách nào khớp từ khóa.</div>
                ) : filteredGuests.map((guest) => {
                  const isSelectedGuest = form.targetUserIds.includes(Number(guest.id));
                  return (
                    <label
                      key={guest.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        color: "var(--a-text)",
                        fontSize: 13,
                        fontWeight: 700,
                        border: isSelectedGuest ? "1px solid var(--a-primary)" : "1px solid var(--a-border)",
                        borderRadius: 10,
                        padding: "10px 12px",
                        background: isSelectedGuest ? "var(--a-primary-soft)" : "var(--a-surface)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelectedGuest}
                        onChange={() => toggleTargetUser(guest.id)}
                        style={{
                          position: "absolute",
                          opacity: 0,
                          pointerEvents: "none",
                        }}
                      />
                      <span
                        aria-hidden="true"
                        style={{
                          width: 18,
                          height: 18,
                          flex: "0 0 18px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 5,
                          border: isSelectedGuest ? "1.5px solid var(--a-primary)" : "1.5px solid var(--a-border-strong)",
                          background: isSelectedGuest ? "var(--a-primary)" : "var(--a-surface)",
                          color: "var(--a-text-inverse)",
                          fontSize: 12,
                          lineHeight: 1,
                          boxShadow: isSelectedGuest ? "0 0 0 3px rgba(165, 214, 167, 0.12)" : "none",
                        }}
                      >
                        {isSelectedGuest ? "✓" : ""}
                      </span>
                      <span>
                        {guest.fullName || guest.email}
                        <span style={{ color: "var(--a-text-muted)", fontWeight: 600 }}> {guest.email}</span>
                        {guest.phone ? <span style={{ color: "var(--a-text-muted)", fontWeight: 600 }}> • {guest.phone}</span> : null}
                        {guest.roleName ? <span style={{ color: "var(--a-info)", fontWeight: 700, textTransform: "uppercase" }}> • {guest.roleName}</span> : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          {!editingItem ? (
            <div style={{ display: "grid", gap: 8, padding: 14, borderRadius: 16, border: "1px solid var(--a-border)", background: "var(--a-surface-raised)" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, color: "var(--a-text)", fontWeight: 700, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.sendEmailToRecipients}
                  onChange={(e) => setForm((prev) => ({ ...prev, sendEmailToRecipients: e.target.checked }))}
                  style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                />
                <span
                  aria-hidden="true"
                  style={{
                    width: 20,
                    height: 20,
                    flex: "0 0 20px",
                    marginTop: 2,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                    border: form.sendEmailToRecipients ? "1.5px solid var(--a-primary)" : "1.5px solid var(--a-border-strong)",
                    background: form.sendEmailToRecipients ? "var(--a-primary)" : "var(--a-surface)",
                    color: "var(--a-text-inverse)",
                    fontSize: 13,
                    lineHeight: 1,
                    boxShadow: form.sendEmailToRecipients ? "0 0 0 3px rgba(165, 214, 167, 0.12)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {form.sendEmailToRecipients ? "✓" : ""}
                </span>
                <span>
                  Gửi voucher qua email ngay sau khi tạo
                  <span style={{ display: "block", marginTop: 4, color: "var(--a-text-muted)", fontSize: 12, fontWeight: 600 }}>
                    {emailAudienceHint} Ước tính {estimatedRecipientCount} người nhận.
                  </span>
                </span>
              </label>
            </div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", marginBottom: 6 }}>Giá trị giảm</label>
              <input
                className="voucher-input"
                type="number"
                min={form.discountType === "PERCENT" ? "1" : "0"}
                max={form.discountType === "PERCENT" ? "100" : undefined}
                step={form.discountType === "PERCENT" ? "1" : "1000"}
                value={form.discountValue}
                onChange={(e) => setForm((prev) => ({ ...prev, discountValue: e.target.value }))}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", marginBottom: 6 }}>Giảm tối đa</label>
              <input className="voucher-input" type="number" min="0" step="1000" value={form.maxDiscountAmount} onChange={(e) => setForm((prev) => ({ ...prev, maxDiscountAmount: e.target.value }))} style={inputStyle} placeholder="Để trống nếu không giới hạn" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", marginBottom: 6 }}>Đơn tối thiểu</label>
              <input className="voucher-input" type="number" min="0" step="1000" value={form.minBookingValue} onChange={(e) => setForm((prev) => ({ ...prev, minBookingValue: e.target.value }))} style={inputStyle} placeholder="Không bắt buộc" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", marginBottom: 6 }}>Hạng phòng áp dụng</label>
              <select className="voucher-select" value={form.applicableRoomTypeId} onChange={(e) => setForm((prev) => ({ ...prev, applicableRoomTypeId: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">Tất cả hạng phòng</option>
                {roomTypes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", marginBottom: 6 }}>Giới hạn lượt dùng</label>
              <input className="voucher-input" type="number" min="1" value={form.usageLimit} onChange={(e) => setForm((prev) => ({ ...prev, usageLimit: e.target.value }))} style={inputStyle} placeholder="Để trống nếu không giới hạn" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", marginBottom: 6 }}>Tối đa / người</label>
              <input className="voucher-input" type="number" min="1" value={form.maxUsesPerUser} onChange={(e) => setForm((prev) => ({ ...prev, maxUsesPerUser: e.target.value }))} style={inputStyle} required />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", marginBottom: 6 }}>Hiệu lực từ</label>
              <input className="voucher-input" type="datetime-local" value={form.validFrom} onChange={(e) => setForm((prev) => ({ ...prev, validFrom: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--a-text-muted)", marginBottom: 6 }}>Hiệu lực đến</label>
              <input className="voucher-input" type="datetime-local" value={form.validTo} onChange={(e) => setForm((prev) => ({ ...prev, validTo: e.target.value }))} style={inputStyle} />
            </div>
          </div>

          {editingItem ? (
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--a-text-muted)", fontWeight: 700 }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
              Voucher đang bật
            </label>
          ) : null}

          {errorMessage ? <div style={{ color: "var(--a-error)", fontSize: 14 }}>{errorMessage}</div> : null}

          <div style={{ display: "flex", flexDirection: isMobile ? "column-reverse" : "row", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
            <button className="voucher-ghost" type="button" onClick={() => setModalOpen(false)} style={{ ...secondaryButton, width: isMobile ? "100%" : "auto", justifyContent: "center" }}>Đóng</button>
            <button className="voucher-primary" type="submit" disabled={saving} style={{ ...primaryButton, width: isMobile ? "100%" : "auto", justifyContent: "center", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Đang lưu..." : editingItem ? "Lưu thay đổi" : "Tạo voucher"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

