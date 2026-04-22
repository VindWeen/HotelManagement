import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createEquipment,
  getEquipments,
  previewSyncEquipmentInUse,
  syncEquipmentInUse,
  toggleEquipmentActive,
  updateEquipment,
} from "../../api/equipmentsApi";
import { useResponsiveAdmin } from "../../hooks/useResponsiveAdmin";

const fmtCurrency = (value) =>
  value == null ? "—" : new Intl.NumberFormat("vi-VN").format(value) + "đ";

const INPUT_STYLE = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 12,
  border: "1.5px solid #e2e8e1",
  background: "#f9f8f3",
  fontSize: 14,
  fontWeight: 600,
  color: "#1c1917",
  outline: "none",
  fontFamily: "'Manrope', sans-serif",
};

const emptyForm = {
  itemCode: "",
  name: "",
  category: "",
  unit: "",
  totalQuantity: "",
  basePrice: "",
  defaultPriceIfLost: "",
  supplier: "",
  imageFile: null,
  currentImageUrl: "",
};

function Toast({ message, type = "success", onClose }) {
  const palette = {
    success: { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
    error: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
  };
  const s = palette[type] || palette.success;

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 300,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
        borderRadius: 12,
        padding: "10px 14px",
        fontSize: 13,
        fontWeight: 700,
        boxShadow: "0 8px 20px rgba(0,0,0,.12)",
      }}
    >
      {message}
    </div>
  );
}

function EquipmentModal({ open, mode, form, setForm, loading, error, onClose, onSubmit }) {
  const { isMobile } = useResponsiveAdmin();
  if (!open) return null;

  const title = mode === "edit" ? "Chỉnh sửa vật tư" : "Thêm vật tư";
  const submitLabel = loading ? "Đang lưu..." : mode === "edit" ? "Cập nhật" : "Thêm vật tư";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        zIndex: 220,
        padding: isMobile ? 0 : 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 680,
          maxHeight: isMobile ? "92vh" : "90vh",
          display: "flex",
          flexDirection: "column",
          background: "white",
          borderRadius: isMobile ? "22px 22px 0 0" : 18,
          boxShadow: "0 24px 64px rgba(0,0,0,.2)",
          border: "1px solid #f1f0ea",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 22px",
            borderBottom: "1px solid #f1f0ea",
            flexShrink: 0,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1c1917" }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ padding: 22, overflowY: "auto", flex: 1, minHeight: 0 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6 }}>Mã VT *</label>
              <input value={form.itemCode} onChange={(e) => setForm((p) => ({ ...p, itemCode: e.target.value }))} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6 }}>Tên vật tư *</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6 }}>Danh mục *</label>
              <input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6 }}>ĐVT *</label>
              <input value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6 }}>Tổng số lượng *</label>
              <input type="number" min="0" value={form.totalQuantity} onChange={(e) => setForm((p) => ({ ...p, totalQuantity: e.target.value }))} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6 }}>Giá gốc *</label>
              <input type="number" min="0" value={form.basePrice} onChange={(e) => setForm((p) => ({ ...p, basePrice: e.target.value }))} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6 }}>Giá đền bù *</label>
              <input type="number" min="0" value={form.defaultPriceIfLost} onChange={(e) => setForm((p) => ({ ...p, defaultPriceIfLost: e.target.value }))} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6 }}>Nhà cung cấp</label>
              <input value={form.supplier} onChange={(e) => setForm((p) => ({ ...p, supplier: e.target.value }))} style={INPUT_STYLE} />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6 }}>Ảnh từ máy (optional)</label>
            {mode === "edit" && form.currentImageUrl ? (
              <div className="flex flex-col sm:flex-row gap-3 items-center mb-2">
                <div style={{
                  width: 80, height: 80, borderRadius: 12, overflow: "hidden",
                  border: "1.5px solid #e2e8e1", flexShrink: 0,
                  background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <img src={form.currentImageUrl} alt="current" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 8px", fontWeight: 600 }}>Ảnh hiện tại</p>
                  <label
                    htmlFor="equipment-img-upload"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "7px 14px", borderRadius: 10,
                      border: "1.5px dashed #a7c4bb", background: "#f5f8f6",
                      color: "#4f645b", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>upload_file</span>
                    Thay ảnh
                  </label>
                  {form.imageFile && (
                    <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{form.imageFile.name}</p>
                  )}
                </div>
              </div>
            ) : (
              <label
                htmlFor="equipment-img-upload"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "8px 16px", borderRadius: 10,
                  border: "1.5px dashed #a7c4bb", background: "#f5f8f6",
                  color: "#4f645b", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  marginBottom: 6,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>upload_file</span>
                Chọn ảnh
                {form.imageFile && (
                  <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, marginLeft: 4 }}>{form.imageFile.name}</span>
                )}
              </label>
            )}
            <input
              id="equipment-img-upload"
              type="file"
              accept="image/*"
              onChange={(e) => setForm((p) => ({ ...p, imageFile: e.target.files?.[0] || null }))}
              style={{ display: "none" }}
            />
          </div>

          {error && (
            <div
              style={{
                marginTop: 12,
                borderRadius: 10,
                padding: "10px 12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 20px",
                borderRadius: 10,
                border: "1px solid #e2e8e1",
                background: "white",
                color: "#4b5563",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "8px 20px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg,#4f645b 0%,#43574f 100%)",
                color: "#e7fef3",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                opacity: loading ? 0.65 : 1,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {loading && (
                <div style={{ width: 13, height: 13, border: "2px solid rgba(231,254,243,.4)", borderTopColor: "#e7fef3", borderRadius: "50%", animation: "spin .65s linear infinite" }} />
              )}
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EquipmentSyncPreviewModal({ open, changes, loading, onClose, onConfirm }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 240,
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: "100%", maxWidth: 980, background: "white", borderRadius: 20, boxShadow: "0 24px 64px rgba(0,0,0,.2)", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f0ea", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1c1917" }}>Đồng bộ vật tư toàn hệ thống</h3>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6b7280" }}>Trước là `InUse` hiện tại trong kho, sau là tổng vật tư active từ tất cả các phòng.</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div style={{ padding: "16px 24px", maxHeight: "55vh", overflowY: "auto" }}>
          {changes.length === 0 ? (
            <div style={{ padding: "28px 0", textAlign: "center", color: "#6b7280", fontSize: 14 }}>
              Không có vật tư nào để đối soát.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9f8f3" }}>
                  {["Mã VT", "Tên vật tư", "Trước", "Sau", "Chênh lệch"].map((title, idx) => (
                    <th key={title} style={{ padding: "12px 14px", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "#9ca3af", textAlign: idx >= 2 ? "right" : "left", borderBottom: "1px solid #f1f0ea" }}>
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {changes.map((item) => (
                  <tr key={item.equipmentId} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "#4f645b" }}>{item.itemCode}</td>
                    <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 600, color: "#1c1917" }}>{item.equipmentName}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, textAlign: "right", color: "#6b7280" }}>{item.oldInUseQuantity ?? 0}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, textAlign: "right", color: "#1c1917", fontWeight: 700 }}>{item.newInUseQuantity ?? 0}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, textAlign: "right", fontWeight: 700, color: item.delta > 0 ? "#16a34a" : item.delta < 0 ? "#dc2626" : "#6b7280" }}>
                      {item.delta > 0 ? "+" : ""}
                      {item.delta ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f0ea", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Tổng equipment được kiểm tra: {changes.length}</span>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #e2e8e1", background: "white", color: "#4b5563", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Đóng
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading || changes.length === 0}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg,#4f645b 0%,#43574f 100%)",
                color: "#e7fef3",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                opacity: loading || changes.length === 0 ? 0.65 : 1,
              }}
            >
              {loading ? "Đang đồng bộ..." : "Đồng bộ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EquipmentPage() {
  const { isMobile } = useResponsiveAdmin();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    active: "all",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [togglingId, setTogglingId] = useState(null);
  const [syncPreviewOpen, setSyncPreviewOpen] = useState(false);
  const [syncPreviewLoading, setSyncPreviewLoading] = useState(false);
  const [syncRunning, setSyncRunning] = useState(false);
  const [syncChanges, setSyncChanges] = useState([]);
  const [toast, setToast] = useState({ message: "", type: "success" });

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const closeToast = useCallback(() => {
    setToast({ message: "", type: "success" });
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getEquipments({ includeInactive: true });
      setItems(res.data?.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Không thể tải danh sách vật tư.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category).filter(Boolean))].sort(),
    [items]
  );

  const filteredItems = items.filter((item) => {
    const search = filters.search.trim().toLowerCase();
    const matchesSearch =
      !search ||
      item.name?.toLowerCase().includes(search) ||
      item.itemCode?.toLowerCase().includes(search) ||
      item.supplier?.toLowerCase().includes(search);
    const matchesCategory = !filters.category || item.category === filters.category;
    const matchesActive =
      filters.active === "all" ||
      (filters.active === "active" && item.isActive) ||
      (filters.active === "inactive" && !item.isActive);
    return matchesSearch && matchesCategory && matchesActive;
  });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.category, filters.active]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingId(null);
    setForm(emptyForm);
    setSubmitError("");
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setModalMode("edit");
    setEditingId(item.id);
    setForm({
      itemCode: item.itemCode || "",
      name: item.name || "",
      category: item.category || "",
      unit: item.unit || "",
      totalQuantity: item.totalQuantity ?? 0,
      basePrice: item.basePrice ?? 0,
      defaultPriceIfLost: item.defaultPriceIfLost ?? 0,
      supplier: item.supplier || "",
      imageFile: null,
      currentImageUrl: item.imageUrl || "",
    });
    setSubmitError("");
    setModalOpen(true);
  };

  const validateForm = () => {
    if (!form.itemCode?.trim()) return "Mã VT không được để trống.";
    if (!form.name?.trim()) return "Tên vật tư không được để trống.";
    if (!form.category?.trim()) return "Danh mục không được để trống.";
    if (!form.unit?.trim()) return "ĐVT không được để trống.";

    const totalQty = Number(form.totalQuantity);
    const basePrice = Number(form.basePrice);
    const lostPrice = Number(form.defaultPriceIfLost);

    if (!Number.isFinite(totalQty) || totalQty < 0) return "Tổng số lượng phải >= 0.";
    if (!Number.isFinite(basePrice) || basePrice < 0) return "Giá gốc phải >= 0.";
    if (!Number.isFinite(lostPrice) || lostPrice < 0) return "Giá đền bù phải >= 0.";

    return "";
  };

  const handleSubmitModal = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setSubmitLoading(true);
    setSubmitError("");
    try {
      const payload = new FormData();
      payload.append("itemCode", form.itemCode.trim());
      payload.append("name", form.name.trim());
      payload.append("category", form.category.trim());
      payload.append("unit", form.unit.trim());
      payload.append("totalQuantity", String(Number(form.totalQuantity)));
      payload.append("basePrice", String(Number(form.basePrice)));
      payload.append("defaultPriceIfLost", String(Number(form.defaultPriceIfLost)));
      if (form.supplier?.trim()) payload.append("supplier", form.supplier.trim());
      if (form.imageFile) payload.append("imageFile", form.imageFile);

      if (modalMode === "edit" && editingId) {
        await updateEquipment(editingId, payload);
        showToast("Cập nhật vật tư thành công.", "success");
      } else {
        await createEquipment(payload);
        showToast("Thêm vật tư thành công.", "success");
      }

      setModalOpen(false);
      await loadItems();
    } catch (e) {
      setSubmitError(e?.response?.data?.message || "Không thể lưu vật tư.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleToggleActive = async (item) => {
    setTogglingId(item.id);
    try {
      const res = await toggleEquipmentActive(item.id);
      showToast(res?.data?.message || "Cập nhật trạng thái thành công.", "success");
      await loadItems();
    } catch (e) {
      showToast(e?.response?.data?.message || "Không thể cập nhật trạng thái.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const openSyncPreview = async () => {
    setSyncPreviewLoading(true);
    try {
      const res = await previewSyncEquipmentInUse();
      setSyncChanges(res?.data?.data || []);
      setSyncPreviewOpen(true);
    } catch (e) {
      showToast(e?.response?.data?.message || "Không thể tải preview đồng bộ vật tư.", "error");
    } finally {
      setSyncPreviewLoading(false);
    }
  };

  const handleSyncInUse = async () => {
    setSyncRunning(true);
    try {
      const res = await syncEquipmentInUse();
      const changed = res?.data?.changedEquipments ?? 0;
      showToast(`Đồng bộ vật tư thành công. Đã cập nhật ${changed} equipment.`, "success");
      setSyncPreviewOpen(false);
      await loadItems();
    } catch (e) {
      showToast(e?.response?.data?.message || "Không thể đồng bộ vật tư.", "error");
    } finally {
      setSyncRunning(false);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg) } }
`}</style>
      <Toast message={toast.message} type={toast.type} onClose={closeToast} />

      <EquipmentModal
        open={modalOpen}
        mode={modalMode}
        form={form}
        setForm={setForm}
        loading={submitLoading}
        error={submitError}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmitModal}
      />
      <EquipmentSyncPreviewModal
        open={syncPreviewOpen}
        changes={syncChanges}
        loading={syncRunning}
        onClose={() => setSyncPreviewOpen(false)}
        onConfirm={handleSyncInUse}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center sm:mb-7 mb-4 gap-4">
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#1c1917", margin: "0 0 6px" }}>
            Vật tư & Minibar
          </h2>
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
            Tổng <strong style={{ color: "#1c1917" }}>{filteredItems.length}</strong> vật tư hiển thị từ bảng Equipments
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={openSyncPreview}
            disabled={syncPreviewLoading || syncRunning}
            style={{
              padding: "10px 18px",
              borderRadius: 12,
              border: "1px solid #e2e8e1",
              background: "white",
              color: "#1c1917",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              opacity: syncPreviewLoading || syncRunning ? 0.65 : 1,
            }}
          >
            {syncPreviewLoading ? "Đang tải..." : "Đồng bộ vật tư"}
          </button>
          <button
            onClick={openCreateModal}
            style={{
              padding: "10px 18px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg,#4f645b 0%,#43574f 100%)",
              color: "#e7fef3",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Thêm vật tư
          </button>
          <button
            onClick={loadItems}
            style={{
              padding: "10px 18px",
              borderRadius: 12,
              border: "1px solid #e2e8e1",
              background: "white",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Làm mới
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#f1f0ea] shadow-sm mb-5 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-3">
        <input
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          placeholder="Tìm theo tên, mã vật tư, nhà cung cấp..."
          style={INPUT_STYLE}
        />
        <select
          value={filters.category}
          onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
          style={INPUT_STYLE}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select
          value={filters.active}
          onChange={(e) => setFilters((prev) => ({ ...prev, active: e.target.value }))}
          style={INPUT_STYLE}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Đã tắt</option>
        </select>
      </div>

      <div style={{ background: "white", borderRadius: 18, border: "1px solid #f1f0ea", boxShadow: "0 1px 4px rgba(0,0,0,.06)", overflow: "hidden" }}>
        {error ? (
          <div style={{ padding: 32, color: "#dc2626", fontWeight: 600 }}>{error}</div>
        ) : loading ? (
          <div style={{ padding: 32, color: "#6b7280" }}>Đang tải dữ liệu vật tư...</div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: 32, color: "#6b7280" }}>Không có vật tư phù hợp bộ lọc.</div>
        ) : isMobile ? (
          <div style={{ display: "grid", gap: 12, padding: 14 }}>
            {paginatedItems.map((item) => (
              <article key={item.id} style={{ border: "1px solid #f1f0ea", borderRadius: 16, padding: 14, display: "grid", gap: 12, background: "white" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover", border: "1px solid #f1f0ea", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 24 }}>inventory_2</span>
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 900, color: "#4f645b" }}>{item.itemCode}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#1c1917", marginTop: 4 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{item.category || "-"} - {item.unit || "-"}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                  {[["Tổng", item.totalQuantity ?? 0], ["Đang dùng", item.inUseQuantity ?? 0], ["Tồn kho", item.inStockQuantity ?? 0]].map(([labelText, value]) => (
                    <div key={labelText} style={{ background: "#f8fafc", borderRadius: 12, padding: 9 }}>
                      <div style={{ fontSize: 10, color: "#78716c", fontWeight: 900 }}>{labelText}</div>
                      <div style={{ fontSize: 15, color: "#1c1917", fontWeight: 900 }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ fontSize: 12, color: "#475569" }}>Giá gốc: <strong>{fmtCurrency(item.basePrice)}</strong></div>
                  <div style={{ fontSize: 12, color: "#dc2626" }}>Đền bù: <strong>{fmtCurrency(item.defaultPriceIfLost)}</strong></div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <button type="button" onClick={() => handleToggleActive(item)} disabled={togglingId === item.id} style={{ height: 36, padding: "0 12px", borderRadius: 999, border: "none", background: item.isActive ? "#10b981" : "#4b5563", color: "white", fontWeight: 900 }}>
                    {togglingId === item.id ? "Đang đổi..." : item.isActive ? "Bật" : "Tắt"}
                  </button>
                  <button type="button" onClick={() => openEditModal(item)} style={{ height: 38, borderRadius: 10, border: "1.5px solid rgba(79,100,91,.2)", background: "#f0faf5", color: "#1a3826", fontWeight: 900, padding: "0 14px" }}>
                    Sửa
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1300 }}>
              <thead>
                <tr style={{ background: "#f9f8f3" }}>
                  {[
                    "Mã VT",
                    "Tên vật tư",
                    "Danh mục",
                    "ĐVT",
                    "Tổng",
                    "Đang dùng",
                    "Hỏng",
                    "Thanh lý",
                    "Tồn kho",
                    "Giá gốc",
                    "Đền bù",
                    "Nhà cung cấp",
                    "Trạng thái",
                    "Thao tác",
                  ].map((title) => (
                    <th key={title} style={{ padding: "14px 16px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "#6b7280", textAlign: "left", borderBottom: "1px solid #f1f0ea" }}>
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "16px", fontSize: 13, fontFamily: "monospace", fontWeight: 800, color: "#4f645b" }}>{item.itemCode}</td>
                    <td style={{ padding: "16px", fontSize: 14, fontWeight: 800, color: "#1c1917" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} style={{ width: 42, height: 42, borderRadius: 10, objectFit: "cover", border: "1px solid #f1f0ea" }} />
                        ) : (
                          <div style={{ width: 42, height: 42, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>inventory_2</span>
                          </div>
                        )}
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "16px", fontSize: 13, color: "#475569" }}>{item.category || "—"}</td>
                    <td style={{ padding: "16px", fontSize: 13, color: "#475569" }}>{item.unit || "—"}</td>
                    <td style={{ padding: "16px", fontSize: 13, fontWeight: 800 }}>{item.totalQuantity ?? 0}</td>
                    <td style={{ padding: "16px", fontSize: 13, fontWeight: 800 }}>{item.inUseQuantity ?? 0}</td>
                    <td style={{ padding: "16px", fontSize: 13, fontWeight: 800 }}>{item.damagedQuantity ?? 0}</td>
                    <td style={{ padding: "16px", fontSize: 13, fontWeight: 800 }}>{item.liquidatedQuantity ?? 0}</td>
                    <td style={{ padding: "16px", fontSize: 13, fontWeight: 800, color: "#2563eb" }}>{item.inStockQuantity ?? 0}</td>
                    <td style={{ padding: "16px", fontSize: 13, color: "#475569" }}>{fmtCurrency(item.basePrice)}</td>
                    <td style={{ padding: "16px", fontSize: 13, color: "#dc2626", fontWeight: 800 }}>{fmtCurrency(item.defaultPriceIfLost)}</td>
                    <td style={{ padding: "16px", fontSize: 13, color: "#475569" }}>{item.supplier || "—"}</td>
                    <td style={{ padding: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          disabled={togglingId === item.id}
                          aria-label={item.isActive ? "Tắt vật tư" : "Bật vật tư"}
                          style={{
                            width: 46,
                            height: 26,
                            border: "none",
                            borderRadius: 9999,
                            padding: 3,
                            cursor: togglingId === item.id ? "not-allowed" : "pointer",
                            background: item.isActive ? "#10b981" : "#4b5563",
                            opacity: togglingId === item.id ? 0.65 : 1,
                            transition: "background .18s ease",
                            position: "relative",
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: "white",
                              boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                              transform: item.isActive ? "translateX(20px)" : "translateX(0)",
                              transition: "transform .18s ease",
                            }}
                          />
                        </button>
                        <span style={{ fontSize: 11, fontWeight: 800, color: item.isActive ? "#10b981" : "#9ca3af" }}>
                          {togglingId === item.id ? "Đang đổi..." : item.isActive ? "Bật" : "Tắt"}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        title="Chỉnh sửa"
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 9,
                          border: "1.5px solid rgba(79,100,91,.2)",
                          background: "#f0faf5",
                          color: "#1a3826",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all .15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#4f645b"; e.currentTarget.style.color = "#e7fef3"; e.currentTarget.style.borderColor = "#4f645b"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#f0faf5"; e.currentTarget.style.color = "#1a3826"; e.currentTarget.style.borderColor = "rgba(79,100,91,.2)"; }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 17, fontVariationSettings: "'FILL' 0" }}>edit_note</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && filteredItems.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, gap: 16, flexWrap: "wrap" }}>
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
                    cursor: active ? "default" : "pointer",
                    background: active ? "#4f645b" : "transparent",
                    color: active ? "#e7fef3" : "#6b7280",
                    fontSize: 13,
                    fontWeight: 800,
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
      )}
    </div>
  );
}

