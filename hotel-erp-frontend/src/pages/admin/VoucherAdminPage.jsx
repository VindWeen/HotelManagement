import { useCallback, useEffect, useMemo, useState } from "react";
import { createVoucher, getVouchers, updateVoucher } from "../../api/vouchersApi";
import { getAdminRoomTypes } from "../../api/roomTypesApi";
import { useResponsiveAdmin } from "../../hooks/useResponsiveAdmin";

const pageCard = {
  background: "#fff",
  border: "1px solid #f1f0ea",
  borderRadius: 20,
  boxShadow: "0 1px 4px rgba(28,25,23,.05)",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 14px",
  borderRadius: 12,
  border: "1.5px solid #e2e8e1",
  background: "#f9f8f3",
  fontSize: 13,
  fontWeight: 600,
  color: "#1c1917",
  outline: "none",
  fontFamily: "'Manrope', sans-serif",
};

const primaryButton = {
  height: 42,
  padding: "0 18px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg,#4f645b 0%,#43574f 100%)",
  color: "#e7fef3",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "'Manrope', sans-serif",
  boxShadow: "0 4px 12px rgba(79,100,91,.15)",
};

const secondaryButton = {
  height: 40,
  padding: "0 14px",
  borderRadius: 12,
  border: "1.5px solid #e2e8e1",
  background: "#fff",
  color: "#57534e",
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "'Manrope', sans-serif",
};

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

function StatusChip({ active }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        background: active ? "#ecfdf5" : "#f3f4f6",
        color: active ? "#047857" : "#6b7280",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: active ? "#10b981" : "#9ca3af",
        }}
      />
      {active ? "Đang bật" : "Đang tắt"}
    </span>
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
        background: "rgba(15,23,42,.35)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 24,
        zIndex: 1200,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ ...pageCard, width: "100%", maxWidth: isMobile ? "100%" : 760, maxHeight: isMobile ? "92vh" : "90vh", overflowY: "auto", padding: isMobile ? 16 : 24, borderRadius: isMobile ? "24px 24px 0 0" : 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em" }}>
              Quản trị voucher
            </div>
            <h3 style={{ margin: "6px 0 0", fontSize: 22, color: "#1c1917" }}>{title}</h3>
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

export default function VoucherAdminPage() {
  const { isMobile, isTablet } = useResponsiveAdmin();
  const [rows, setRows] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const [voucherRes, roomTypeRes] = await Promise.all([
        getVouchers({ page: 1, pageSize: 200, keyword, status: status || undefined }),
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
  }, [keyword, status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const activeCount = rows.filter((item) => item.isActive).length;
    const expiredCount = rows.filter((item) => item.validTo && new Date(item.validTo) < new Date()).length;
    return { total: rows.length, activeCount, expiredCount };
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

  const openCreateModal = () => {
    setEditingItem(null);
    setForm(defaultForm);
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
      isActive: item.isActive !== false,
    });
    setErrorMessage("");
    setModalOpen(true);
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

    setSaving(true);
    setErrorMessage("");
    try {
      const payload = buildPayload();
      if (editingItem) {
        await updateVoucher(editingItem.id, payload);
      } else {
        await createVoucher(payload);
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
    try {
      await updateVoucher(item.id, { isActive: !item.isActive });
      await loadData();
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Không thể cập nhật trạng thái voucher.");
    }
  };

  return (
    <div style={{ maxWidth: 1360, margin: "0 auto", paddingInline: isMobile ? 4 : 0 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', sans-serif; }
      `}</style>
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 28, color: "#1c1917", fontWeight: 800 }}>Voucher</h2>
          <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 14, maxWidth: 780, lineHeight: 1.65 }}>
            Quản lý danh sách voucher, chỉnh sửa cấu hình giảm giá và bật tắt voucher mà không ảnh hưởng tới luồng áp dụng voucher ở trang booking.
          </p>
        </div>
        <button type="button" onClick={openCreateModal} style={{ ...primaryButton, width: isMobile ? "100%" : "auto", justifyContent: "center" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Thêm voucher
        </button>
      </div>

      {errorMessage ? (
        <div style={{ ...pageCard, marginBottom: 20, padding: 14, color: "#b91c1c", background: "#fff7f7", borderColor: "#fecaca" }}>
          {errorMessage}
        </div>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))", gap: 16, marginBottom: 22 }}>
        {[
          { label: "Tổng voucher", value: stats.total, sub: "Tất cả mã đã tạo" },
          { label: "Đang bật", value: stats.activeCount, sub: "Voucher còn hiệu lực sử dụng" },
          { label: "Đã quá hạn", value: stats.expiredCount, sub: "Cần rà soát lại thời hạn" },
        ].map((item) => (
          <div key={item.label} style={{ ...pageCard, padding: 18 }}>
            <div style={{ color: "#78716c", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>{item.label}</div>
            <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#1c1917" }}>{item.value}</div>
            <div style={{ marginTop: 6, color: "#6b7280", fontSize: 13 }}>{item.sub}</div>
          </div>
        ))}
      </section>

      <section style={{ ...pageCard, padding: isMobile ? 16 : 20, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 0.8fr auto", gap: 14, alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>Tìm mã voucher</label>
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} style={inputStyle} placeholder="Ví dụ: SUMMER, VIP..." />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>Trạng thái</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Tất cả</option>
              <option value="active">Đang bật</option>
              <option value="inactive">Đang tắt</option>
            </select>
          </div>
          <button type="button" onClick={loadData} style={{ ...secondaryButton, width: isMobile ? "100%" : "auto", justifyContent: "center" }}>Làm mới</button>
        </div>
      </section>

      <section style={{ ...pageCard, overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #f1f0ea" }}>
          <strong style={{ color: "#1c1917" }}>Danh sách voucher</strong>
          <p style={{ margin: "4px 0 0", color: "#78716c", fontSize: 13 }}>Tổng cộng {rows.length} voucher.</p>
        </div>
        {isMobile ? (
          <div style={{ display: "grid", gap: 12, padding: 16 }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>Đang tải dữ liệu...</div>
            ) : rows.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>Chưa có voucher nào.</div>
            ) : (
              rows.map((item) => (
                <article key={item.id} style={{ border: "1px solid #f1ece2", borderRadius: 16, padding: 14, display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ color: "#1c1917", fontWeight: 800 }}>{item.code}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "#78716c" }}>#{item.id}</div>
                    </div>
                    <StatusChip active={item.isActive !== false} />
                  </div>
                  <div style={{ display: "grid", gap: 6, fontSize: 13, color: "#57534e" }}>
                    <div>Giảm giá: <strong style={{ color: "#1f2937" }}>{item.discountType === "PERCENT" ? `${item.discountValue}%` : fmtCurrency(item.discountValue)}</strong></div>
                    <div>Giảm tối đa: {item.maxDiscountAmount != null ? fmtCurrency(item.maxDiscountAmount) : "Không giới hạn"}</div>
                    <div>Tối thiểu: {item.minBookingValue != null ? fmtCurrency(item.minBookingValue) : "Không yêu cầu"}</div>
                    <div>Hạng phòng: {item.applicableRoomTypeId ? roomTypeMap.get(String(item.applicableRoomTypeId)) || `#${item.applicableRoomTypeId}` : "Tất cả"}</div>
                    <div>Hiệu lực: {fmtDateTime(item.validFrom)} - {fmtDateTime(item.validTo)}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <button type="button" onClick={() => handleToggleActive(item)} style={{ ...secondaryButton, width: "100%", justifyContent: "center" }}>{item.isActive !== false ? "Tắt voucher" : "Bật voucher"}</button>
                    <button type="button" onClick={() => openEditModal(item)} style={{ ...primaryButton, width: "100%", justifyContent: "center" }}>Sửa</button>
                  </div>
                </article>
              ))
            )}
          </div>
        ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#faf8f3", borderBottom: "1px solid #f1f0ea" }}>
                {["Mã voucher", "Giảm giá", "Điều kiện", "Thời gian", "Trạng thái", "Thao tác"].map((heading, idx) => (
                  <th key={heading} style={{ padding: "16px 18px", textAlign: idx === 5 ? "right" : "left", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "#78716c" }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 48, textAlign: "center", color: "#9ca3af" }}>Đang tải dữ liệu...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 48, textAlign: "center", color: "#9ca3af" }}>Chưa có voucher nào.</td></tr>
              ) : (
                rows.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f7f4ee" }}>
                    <td style={{ padding: "16px 18px" }}>
                      <div style={{ color: "#1c1917", fontWeight: 800 }}>{item.code}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "#78716c" }}>#{item.id}</div>
                    </td>
                    <td style={{ padding: "16px 18px", color: "#57534e" }}>
                      <div style={{ fontWeight: 800, color: "#1f2937" }}>
                        {item.discountType === "PERCENT" ? `${item.discountValue}%` : fmtCurrency(item.discountValue)}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "#78716c" }}>
                        Giảm tối đa: {item.maxDiscountAmount != null ? fmtCurrency(item.maxDiscountAmount) : "Không giới hạn"}
                      </div>
                    </td>
                    <td style={{ padding: "16px 18px", color: "#57534e" }}>
                      <div>Tối thiểu: {item.minBookingValue != null ? fmtCurrency(item.minBookingValue) : "Không yêu cầu"}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "#78716c" }}>
                        Hạng phòng: {item.applicableRoomTypeId ? roomTypeMap.get(String(item.applicableRoomTypeId)) || `#${item.applicableRoomTypeId}` : "Tất cả"}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "#78716c" }}>
                        Đã dùng {item.usedCount || 0}/{item.usageLimit ?? "∞"} lượt
                      </div>
                    </td>
                    <td style={{ padding: "16px 18px", color: "#57534e" }}>
                      <div>Từ: {fmtDateTime(item.validFrom)}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "#78716c" }}>Đến: {fmtDateTime(item.validTo)}</div>
                    </td>
                    <td style={{ padding: "16px 18px" }}>
                      <StatusChip active={item.isActive !== false} />
                    </td>
                    <td style={{ padding: "16px 18px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#57534e", fontSize: 13, fontWeight: 800 }}>
                          <input type="checkbox" checked={item.isActive !== false} onChange={() => handleToggleActive(item)} />
                          {item.isActive !== false ? "Bật" : "Tắt"}
                        </label>
                        <button type="button" onClick={() => openEditModal(item)} style={{ ...secondaryButton, fontWeight: 800 }}>Sửa</button>
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
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>Mã voucher</label>
              <input
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                style={inputStyle}
                placeholder="SUMMER2026"
                disabled={Boolean(editingItem)}
                required={!editingItem}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>Loại giảm giá</label>
              <select value={form.discountType} onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="PERCENT">Phần trăm</option>
                <option value="FIXED_AMOUNT">Số tiền cố định</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>Giá trị giảm</label>
              <input type="number" min="0" step="1000" value={form.discountValue} onChange={(e) => setForm((prev) => ({ ...prev, discountValue: e.target.value }))} style={inputStyle} required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>Giảm tối đa</label>
              <input type="number" min="0" step="1000" value={form.maxDiscountAmount} onChange={(e) => setForm((prev) => ({ ...prev, maxDiscountAmount: e.target.value }))} style={inputStyle} placeholder="Để trống nếu không giới hạn" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>Đơn tối thiểu</label>
              <input type="number" min="0" step="1000" value={form.minBookingValue} onChange={(e) => setForm((prev) => ({ ...prev, minBookingValue: e.target.value }))} style={inputStyle} placeholder="Không bắt buộc" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>Hạng phòng áp dụng</label>
              <select value={form.applicableRoomTypeId} onChange={(e) => setForm((prev) => ({ ...prev, applicableRoomTypeId: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">Tất cả hạng phòng</option>
                {roomTypes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>Giới hạn lượt dùng</label>
              <input type="number" min="1" value={form.usageLimit} onChange={(e) => setForm((prev) => ({ ...prev, usageLimit: e.target.value }))} style={inputStyle} placeholder="Để trống nếu không giới hạn" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>Tối đa / người</label>
              <input type="number" min="1" value={form.maxUsesPerUser} onChange={(e) => setForm((prev) => ({ ...prev, maxUsesPerUser: e.target.value }))} style={inputStyle} required />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>Hiệu lực từ</label>
              <input type="datetime-local" value={form.validFrom} onChange={(e) => setForm((prev) => ({ ...prev, validFrom: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>Hiệu lực đến</label>
              <input type="datetime-local" value={form.validTo} onChange={(e) => setForm((prev) => ({ ...prev, validTo: e.target.value }))} style={inputStyle} />
            </div>
          </div>

          {editingItem ? (
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#57534e", fontWeight: 700 }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
              Voucher đang bật
            </label>
          ) : null}

          {errorMessage ? <div style={{ color: "#b91c1c", fontSize: 14 }}>{errorMessage}</div> : null}

          <div style={{ display: "flex", flexDirection: isMobile ? "column-reverse" : "row", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
            <button type="button" onClick={() => setModalOpen(false)} style={{ ...secondaryButton, width: isMobile ? "100%" : "auto", justifyContent: "center" }}>Đóng</button>
            <button type="submit" disabled={saving} style={{ ...primaryButton, width: isMobile ? "100%" : "auto", justifyContent: "center", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Đang lưu..." : editingItem ? "Lưu thay đổi" : "Tạo voucher"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
