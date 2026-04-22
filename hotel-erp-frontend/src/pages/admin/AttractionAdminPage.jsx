import { useEffect, useMemo, useRef, useState } from "react";
import {
  createAttraction,
  getAttractionById,
  getAttractions,
  toggleAttractionActive,
  updateAttraction,
  uploadAttractionImage,
} from "../../api/attractionsApi";
import { useResponsiveAdmin } from "../../hooks/useResponsiveAdmin";

const CATEGORY_OPTIONS = ["Di tích", "Ẩm thực", "Giải trí", "Thiên nhiên"];
const PAGE_SIZE = 12;

const cardStyle = {
  background: "white",
  borderRadius: 18,
  border: "1px solid #f1f0ea",
  boxShadow: "0 1px 3px rgba(0,0,0,.06)",
};

const inputStyle = {
  width: "100%",
  background: "#f9f8f3",
  border: "1.5px solid #e2e8e1",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 14,
  fontWeight: 600,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#6b7280",
  marginBottom: 8,
};

const primaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "0 22px",
  height: 42,
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg,#4f645b 0%,#43574f 100%)",
  color: "#e7fef3",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(79,100,91,0.2)",
  transition: "all 0.15s",
};

const emptyForm = {
  name: "",
  category: CATEGORY_OPTIONS[0],
  address: "",
  latitude: "",
  longitude: "",
  distanceKm: "",
  imageUrl: "",
  cloudinaryPublicId: "",
  mapEmbedLink: "",
  description: "",
  removeImage: false,
};

function buildEmbedUrl(detail) {
  if (!detail) return "";
  const rawLink = detail.mapEmbedLink?.trim();
  if (rawLink && (rawLink.includes("/maps/embed") || rawLink.includes("output=embed"))) return rawLink;
  if (detail.latitude != null && detail.longitude != null) return `https://www.google.com/maps?q=${detail.latitude},${detail.longitude}&z=15&output=embed`;
  if (rawLink) return `https://www.google.com/maps?q=${encodeURIComponent(rawLink)}&z=15&output=embed`;
  return "";
}

function extractEmbedLink(value) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/src\s*=\s*["']([^"']+)["']/i);
  return match?.[1]?.trim() || trimmed;
}

function validateForm(form) {
  const next = {};
  if (!form.name.trim()) next.name = "Tên địa điểm không được để trống.";
  if (form.latitude !== "") {
    const latitude = Number(form.latitude);
    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) next.latitude = "Latitude phải nằm trong khoảng -90 đến 90.";
  }
  if (form.longitude !== "") {
    const longitude = Number(form.longitude);
    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) next.longitude = "Longitude phải nằm trong khoảng -180 đến 180.";
  }
  if (form.distanceKm !== "") {
    const distanceKm = Number(form.distanceKm);
    if (Number.isNaN(distanceKm) || distanceKm < 0) next.distanceKm = "Khoảng cách không được âm.";
  }
  return next;
}

function getStatusMeta(isActive) {
  return isActive
    ? { label: "Đang bật", background: "#ecfdf5", color: "#047857" }
    : { label: "Đang tắt", background: "#fff7ed", color: "#c2410c" };
}

function FieldError({ message }) {
  if (!message) return null;
  return <div style={{ marginTop: 6, fontSize: 12, color: "#b91c1c", fontWeight: 600 }}>{message}</div>;
}

function Overlay({ title, onClose, children }) {
  const { isMobile } = useResponsiveAdmin();
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(28,25,23,0.7)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 24, zIndex: 120 }}>
      <div onClick={(e) => e.stopPropagation()} className="primary-card-p" style={{ width: "min(860px,100%)", maxHeight: "92vh", overflowY: "auto", background: "#fffdf9", borderRadius: isMobile ? "24px 24px 0 0" : 24, border: "1px solid #ede7dd", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ padding: isMobile ? "18px 18px 14px" : "20px 24px 16px", borderBottom: "1px solid #f1f0ea", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fffdf9", zIndex: 1 }}>
          <h3 className="primary-card-p" style={{ margin: 0, fontSize: 22, border: "none" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}><span className="material-symbols-outlined">close</span></button>
        </div>
        <div style={{ padding: isMobile ? 18 : 24 }}>{children}</div>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onChange, totalItems }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ padding: "14px 18px", borderTop: "1px solid #f1f0ea", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div style={{ fontSize: 13, color: "#6b7280" }}>Trang <strong>{page}</strong> / {totalPages} · {totalItems} địa điểm</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e7e5e4", background: "white", color: "#57534e", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1 }}>Trước</button>
        <button type="button" onClick={() => onChange(page + 1)} disabled={page >= totalPages} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e7e5e4", background: "white", color: "#57534e", cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.5 : 1 }}>Sau</button>
      </div>
    </div>
  );
}

function StatusSwitch({ checked, onChange }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
      <span
        style={{
          position: "relative",
          width: 42,
          height: 24,
          borderRadius: 999,
          background: checked ? "#4f645b" : "#d6d3d1",
          transition: "background .18s ease",
          display: "inline-flex",
          alignItems: "center",
          padding: 3,
          boxSizing: "border-box",
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", margin: 0 }}
        />
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,.2)",
            transform: checked ? "translateX(18px)" : "translateX(0)",
            transition: "transform .18s ease",
          }}
        />
      </span>
    </label>
  );
}

export default function AttractionAdminPage() {
  const { isMobile } = useResponsiveAdmin();
  const fileInputRef = useRef(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("list");
  const [viewMode, setViewMode] = useState("table");
  const [page, setPage] = useState(1);
  const [mapKeyword, setMapKeyword] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState("");
  const [form, setForm] = useState(emptyForm);
  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAttractions({ includeInactive: true });
      const data = res.data?.data || [];
      setItems(data);
      if (data.length > 0) setSelectedId((prev) => prev ?? data.find((item) => item.isActive !== false)?.id ?? data[0].id);
    } catch (e) {
      setError(e?.response?.data?.message || "Không thể tải danh sách địa điểm.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedId) {
        setSelectedDetail(null);
        return;
      }
      setLoadingDetail(true);
      try {
        const res = await getAttractionById(selectedId);
        setSelectedDetail(res.data || null);
      } catch {
        setSelectedDetail(items.find((item) => item.id === selectedId) || null);
      } finally {
        setLoadingDetail(false);
      }
    };
    loadDetail();
  }, [items, selectedId]);

  useEffect(() => { setPage(1); }, [activeTab, viewMode]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const openCreate = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setFieldErrors({});
    setSelectedImageFile(null);
    setSelectedImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setModalOpen(true);
  };

  const openEdit = async (item) => {
    try {
      let detail = item;
      try {
        const res = await getAttractionById(item.id);
        detail = res.data || item;
      } catch {
        detail = item;
      }
      setEditingItem(item);
      setForm({
        name: detail.name || "",
        category: detail.category || CATEGORY_OPTIONS[0],
        address: detail.address || "",
        latitude: detail.latitude ?? "",
        longitude: detail.longitude ?? "",
        distanceKm: detail.distanceKm ?? "",
        imageUrl: detail.imageUrl || "",
        cloudinaryPublicId: detail.cloudinaryPublicId || "",
        mapEmbedLink: detail.mapEmbedLink || "",
        description: detail.description || "",
        removeImage: false,
      });
      setFieldErrors({});
      setSelectedImageFile(null);
      setSelectedImagePreview(detail.imageUrl || "");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setModalOpen(true);
    } catch (e) {
      setError(e?.response?.data?.message || "Không thể tải chi tiết địa điểm.");
    }
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleChooseImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedImageFile(file);
    setSelectedImagePreview(URL.createObjectURL(file));
    setForm((prev) => ({ ...prev, removeImage: false }));
  };

  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    setSelectedImagePreview("");
    setForm((prev) => ({ ...prev, imageUrl: "", cloudinaryPublicId: "", removeImage: Boolean(editingItem) }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const nextErrors = validateForm(form);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitting(true);
    try {
      let imageUrl = form.imageUrl || null;
      let cloudinaryPublicId = form.cloudinaryPublicId || null;
      if (selectedImageFile) {
        const uploadRes = await uploadAttractionImage(selectedImageFile);
        imageUrl = uploadRes.data?.url || null;
        cloudinaryPublicId = uploadRes.data?.publicId || null;
      }
      const payload = {
        name: form.name.trim(),
        category: form.category,
        address: form.address || null,
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
        distanceKm: form.distanceKm === "" ? null : Number(form.distanceKm),
        imageUrl,
        cloudinaryPublicId,
        mapEmbedLink: extractEmbedLink(form.mapEmbedLink) || null,
        description: form.description || null,
        removeImage: form.removeImage || false,
      };
      if (editingItem) await updateAttraction(editingItem.id, payload);
      else await createAttraction(payload);
      setModalOpen(false);
      setForm(emptyForm);
      setSelectedImageFile(null);
      setSelectedImagePreview("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadData();
    } catch (e2) {
      setError(e2?.response?.data?.message || "Không thể lưu địa điểm.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await toggleAttractionActive(item.id);
      await loadData();
    } catch (e) {
      setError(e?.response?.data?.message || "Không thể cập nhật trạng thái địa điểm.");
    }
  };

  const filteredMapItems = items.filter((item) => {
    const normalized = mapKeyword.trim().toLowerCase();
    if (!normalized) return true;
    return [item.name, item.address, item.category].filter(Boolean).some((value) => value.toLowerCase().includes(normalized));
  });

  const mapEmbedUrl = buildEmbedUrl(selectedDetail);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', sans-serif; }
      `}</style>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, color: "#1c1917", fontWeight: 700 }}>Quản lý địa điểm</h2>
            <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 14 }}>Quản lý điểm đến, tọa độ thực tế và dữ liệu để dùng cho site map.</p>
          </div>
          <button onClick={openCreate} style={primaryButtonStyle}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_location_alt</span>Thêm địa điểm</button>
        </div>

        {error ? <div className="sub-card-p" style={{ ...cardStyle, padding: 14, marginBottom: 20, color: "#b91c1c", background: "#fff7f7", borderColor: "#fecaca" }}>{error}</div> : null}

        <section className="primary-card-p" style={{ ...cardStyle, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f0ea", display: "flex", gap: 10 }}>
            <button type="button" onClick={() => setActiveTab("list")} className={activeTab === "list" ? "" : "sub-card-p"} style={{ padding: "10px 14px", borderRadius: 12, border: activeTab === "list" ? "1px solid #4f645b" : "1px solid #e7e5e4", background: activeTab === "list" ? "#4f645b" : "white", color: activeTab === "list" ? "#ecfdf5" : "#57534e", fontWeight: 700, cursor: "pointer" }}>Danh sách địa điểm</button>
            <button type="button" onClick={() => setActiveTab("map")} className={activeTab === "map" ? "" : "sub-card-p"} style={{ padding: "10px 14px", borderRadius: 12, border: activeTab === "map" ? "1px solid #4f645b" : "1px solid #e7e5e4", background: activeTab === "map" ? "#4f645b" : "white", color: activeTab === "map" ? "#ecfdf5" : "#57534e", fontWeight: 700, cursor: "pointer" }}>Site Map</button>
          </div>
          {activeTab === "list" ? (
            <>
              <div style={{ padding: "18px 20px", borderBottom: "1px solid #f1f0ea", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <strong style={{ color: "#1c1917" }}>Danh sách địa điểm</strong>
                  <p style={{ margin: "4px 0 0", color: "#78716c", fontSize: 13 }}>Tổng cộng {items.length} địa điểm.</p>
                </div>
                {!isMobile && <div style={{ display: "flex", gap: 2, background: "#f1f0ea", padding: 4, borderRadius: 12 }}>
                  {["table", "grid"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      style={{
                        padding: "7px 14px",
                        borderRadius: 9,
                        background: viewMode === mode ? "white" : "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: viewMode === mode ? "#1c1917" : "#9ca3af",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 12,
                        fontWeight: 700,
                        boxShadow: viewMode === mode ? "0 1px 4px rgba(0,0,0,.1)" : "none",
                        transition: "all .15s",
                        fontFamily: "Manrope, sans-serif",
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                        {mode === "table" ? "table_rows" : "grid_view"}
                      </span>
                      {mode === "table" ? "Bảng" : "Lưới"}
                    </button>
                  ))}
                </div>}
              </div>

              {viewMode === "table" && !isMobile ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#faf8f3", borderBottom: "1px solid #f1f0ea" }}>
                        {["Địa điểm", "Danh mục", "Tọa độ", "Khoảng cách", "Trạng thái", "Thao tác"].map((heading, idx) => (
                          <th key={heading} style={{ padding: "16px 18px", textAlign: idx === 5 ? "right" : "left", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "#78716c" }}>{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Đang tải dữ liệu...</td></tr>
                      ) : paginatedItems.length === 0 ? (
                        <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Chưa có địa điểm nào.</td></tr>
                      ) : (
                        paginatedItems.map((item) => {
                          const statusMeta = getStatusMeta(item.isActive !== false);
                          return (
                            <tr key={item.id} style={{ borderBottom: "1px solid #f7f4ee" }}>
                              <td style={{ padding: "16px 18px" }}><div style={{ fontWeight: 700, color: "#1c1917" }}>{item.name}</div><div style={{ marginTop: 4, fontSize: 12, color: "#78716c" }}>{item.address || "-"}</div></td>
                              <td style={{ padding: "16px 18px", color: "#57534e" }}>{item.category || "-"}</td>
                              <td style={{ padding: "16px 18px", color: "#57534e" }}>{item.latitude ?? "-"}, {item.longitude ?? "-"}</td>
                              <td style={{ padding: "16px 18px", color: "#57534e" }}>{item.distanceKm ?? "-"} km</td>
                              <td style={{ padding: "16px 18px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <StatusSwitch checked={item.isActive !== false} onChange={() => handleToggleActive(item)} />
                                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "fit-content", padding: "6px 10px", borderRadius: 999, background: statusMeta.background, color: statusMeta.color, fontWeight: 700, fontSize: 12 }}>{statusMeta.label}</span>
                                </div>
                              </td>
                              <td style={{ padding: "16px 18px", textAlign: "right" }}>
                                <button
                                  type="button"
                                  onClick={() => openEdit(item)}
                                  title="Sửa địa điểm"
                                  style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 10,
                                    border: "1px solid #e7e5e4",
                                    background: "white",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#57534e",
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: 18 }}>
                  {loading ? (
                    <div style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>Đang tải dữ liệu...</div>
                  ) : paginatedItems.length === 0 ? (
                    <div style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>Chưa có địa điểm nào.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {paginatedItems.map((item) => {
                        const statusMeta = getStatusMeta(item.isActive !== false);
                        return (
                          <div key={item.id} className="sub-card-p" style={{ border: "1px solid #f1f0ea", borderRadius: 16, overflow: "hidden", background: "white" }}>
                            <div style={{ height: 170, background: "#f8fafc", borderBottom: "1px solid #f1f0ea", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ color: "#94a3b8", fontWeight: 700, fontSize: 13 }}>Chưa có ảnh</div>}
                            </div>
                            <div style={{ padding: 16 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                                <div><div style={{ fontWeight: 800, color: "#1c1917" }}>{item.name}</div><div style={{ marginTop: 4, fontSize: 12, color: "#78716c" }}>{item.category || "-"}</div></div>
                                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "6px 10px", borderRadius: 999, background: statusMeta.background, color: statusMeta.color, fontWeight: 700, fontSize: 12 }}>{statusMeta.label}</span>
                              </div>
                              <div style={{ marginTop: 12, fontSize: 13, color: "#57534e", lineHeight: 1.6 }}>
                                <div>{item.address || "-"}</div>
                                <div style={{ marginTop: 6 }}>Tọa độ: {item.latitude ?? "-"}, {item.longitude ?? "-"}</div>
                                <div>Khoảng cách: {item.distanceKm ?? "-"} km</div>
                              </div>
                              <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <StatusSwitch checked={item.isActive !== false} onChange={() => handleToggleActive(item)} />
                                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "6px 10px", borderRadius: 999, background: statusMeta.background, color: statusMeta.color, fontWeight: 700, fontSize: 12 }}>{statusMeta.label}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openEdit(item)}
                                  title="Sửa địa điểm"
                                  style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 10,
                                    border: "1px solid #e7e5e4",
                                    background: "white",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#57534e",
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <Pagination page={page} totalPages={totalPages} onChange={setPage} totalItems={items.length} />
            </>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-6 p-5">
              <div className="sub-card-p" style={{ border: "1px solid #f1f0ea", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: 16, borderBottom: "1px solid #f1f0ea" }}>
                  <strong style={{ color: "inherit" }}>Danh sách điểm đến</strong>
                  <input value={mapKeyword} onChange={(e) => setMapKeyword(e.target.value)} placeholder="Tìm theo tên, địa chỉ, danh mục..." style={{ ...inputStyle, marginTop: 12 }} />
                </div>
                <div style={{ maxHeight: 560, overflowY: "auto" }}>
                  {filteredMapItems.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>Không có địa điểm phù hợp.</div> : filteredMapItems.map((item) => (
                    <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={selectedId === item.id ? "" : "sub-card-p"} style={{ width: "100%", textAlign: "left", padding: 16, border: "none", borderBottom: "1px solid #f7f4ee", background: selectedId === item.id ? "#f8fafc" : "white", cursor: "pointer" }}>
                      <div style={{ fontWeight: 700, color: "inherit" }}>{item.name}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "inherit", opacity: 0.8 }}>{item.category || "-"} • {item.distanceKm ?? "-"} km</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "inherit", opacity: 0.6 }}>{item.address || "-"}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sub-card-p" style={{ border: "1px solid #f1f0ea", borderRadius: 16, padding: 18 }}>
                {loadingDetail ? <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Đang tải chi tiết địa điểm...</div> : selectedDetail ? (
                  <>
                    <div style={{ marginBottom: 18 }}>
                      <h3 style={{ margin: 0, fontSize: 22, color: "inherit" }}>{selectedDetail.name}</h3>
                      <p style={{ margin: "8px 0 0", color: "inherit", opacity: 0.7, fontSize: 14 }}>{selectedDetail.address || "Chưa có địa chỉ."}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      <div className="sub-card-p" style={{ padding: 14, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "inherit", opacity: 0.6, fontWeight: 700 }}>Latitude</div><div style={{ marginTop: 6, fontWeight: 700 }}>{selectedDetail.latitude ?? "-"}</div></div>
                      <div className="sub-card-p" style={{ padding: 14, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "inherit", opacity: 0.6, fontWeight: 700 }}>Longitude</div><div style={{ marginTop: 6, fontWeight: 700 }}>{selectedDetail.longitude ?? "-"}</div></div>
                      <div className="sub-card-p" style={{ padding: 14, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "inherit", opacity: 0.6, fontWeight: 700 }}>Khoảng cách</div><div style={{ marginTop: 6, fontWeight: 700 }}>{selectedDetail.distanceKm ?? "-"} km</div></div>
                    </div>
                    {mapEmbedUrl ? <iframe title={`map-${selectedDetail.id}`} src={mapEmbedUrl} style={{ width: "100%", height: 420, border: "1px solid #e5e7eb", borderRadius: 18, background: "#fff" }} loading="lazy" /> : <div className="sub-card-p" style={{ padding: 32, textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: 18, color: "#94a3b8" }}>Địa điểm này chưa có `mapEmbedLink` hoặc tọa độ đầy đủ để hiển thị bản đồ.</div>}
                  </>
                ) : <div style={{ padding: 32, textAlign: "center", color: "#94a3af" }}>Chọn một địa điểm để xem site map.</div>}
              </div>
            </div>
          )}
        </section>
      </div>
      {modalOpen ? (
        <Overlay title={editingItem ? "Chỉnh sửa địa điểm" : "Tạo địa điểm"} onClose={() => setModalOpen(false)}>
          <form onSubmit={submit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Tên địa điểm</label>
                <input value={form.name} onChange={(e) => handleFieldChange("name", e.target.value)} style={{ ...inputStyle, borderColor: fieldErrors.name ? "#fca5a5" : "#e2e8e1" }} />
                <FieldError message={fieldErrors.name} />
              </div>
              <div>
                <label style={labelStyle}>Danh mục</label>
                <select value={form.category} onChange={(e) => handleFieldChange("category", e.target.value)} style={inputStyle}>{CATEGORY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label style={labelStyle}>Địa chỉ</label>
                <input value={form.address} onChange={(e) => handleFieldChange("address", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Latitude (-90 - 90)</label>
                <input value={form.latitude} onChange={(e) => handleFieldChange("latitude", e.target.value)} style={{ ...inputStyle, borderColor: fieldErrors.latitude ? "#fca5a5" : "#e2e8e1" }} />
                <FieldError message={fieldErrors.latitude} />
              </div>
              <div>
                <label style={labelStyle}>Longitude (-180 - 180)</label>
                <input value={form.longitude} onChange={(e) => handleFieldChange("longitude", e.target.value)} style={{ ...inputStyle, borderColor: fieldErrors.longitude ? "#fca5a5" : "#e2e8e1" }} />
                <FieldError message={fieldErrors.longitude} />
              </div>
              <div>
                <label style={labelStyle}>Khoảng cách (km)</label>
                <input value={form.distanceKm} onChange={(e) => handleFieldChange("distanceKm", e.target.value)} style={{ ...inputStyle, borderColor: fieldErrors.distanceKm ? "#fca5a5" : "#e2e8e1" }} />
                <FieldError message={fieldErrors.distanceKm} />
              </div>
              <div>
                <label style={labelStyle}>Ảnh địa điểm</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleChooseImage} style={{ display: "none" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => fileInputRef.current?.click()} style={{ ...primaryButtonStyle, padding: "10px 14px" }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>image</span>{selectedImagePreview || form.imageUrl ? "Đổi ảnh địa điểm" : "Chọn ảnh địa điểm"}</button>
                  {(selectedImagePreview || form.imageUrl) ? <button type="button" onClick={handleRemoveImage} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #e7e5e4", background: "white", color: "#57534e", fontWeight: 700, cursor: "pointer" }}>Gỡ ảnh</button> : null}
                </div>
                {selectedImagePreview || form.imageUrl ? <div style={{ marginTop: 12 }}><img src={selectedImagePreview || form.imageUrl} alt="preview" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 14, border: "1px solid #e5e7eb" }} /></div> : null}
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label style={labelStyle}>Map embed link</label>
                <input value={form.mapEmbedLink} onChange={(e) => handleFieldChange("mapEmbedLink", e.target.value)} style={inputStyle} placeholder="Dán link Google Maps embed hoặc nguyên thẻ iframe..." />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label style={labelStyle}>Mô tả</label>
                <textarea value={form.description} onChange={(e) => handleFieldChange("description", e.target.value)} style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap", position: "sticky", bottom: 0, background: "#fffdf9", paddingTop: 14 }}>
              <button type="button" className="sub-card-p" onClick={() => setModalOpen(false)} style={{ padding: "10px 16px", borderRadius: 12, border: "1px solid #e7e5e4", background: "white", color: "#57534e", fontWeight: 600, cursor: "pointer" }}>Đóng</button>
              <button type="submit" disabled={submitting} style={{ ...primaryButtonStyle, padding: "10px 18px", opacity: submitting ? 0.7 : 1 }}>{submitting ? "Đang lưu..." : "Lưu địa điểm"}</button>
            </div>
          </form>
        </Overlay>
      ) : null}
    </>
  );
}
