import { useEffect, useState } from "react";
import {
  createAttraction,
  deleteAttraction,
  getAttractionById,
  getAttractions,
  updateAttraction,
} from "../../api/attractionsApi";

const CATEGORY_OPTIONS = ["Di tích", "Ẩm thực", "Giải trí", "Thiên nhiên"];

function buildEmbedUrl(detail) {
  if (!detail) return "";

  const rawLink = detail.mapEmbedLink?.trim();
  if (rawLink && (rawLink.includes("/maps/embed") || rawLink.includes("output=embed"))) {
    return rawLink;
  }

  if (detail.latitude != null && detail.longitude != null) {
    return `https://www.google.com/maps?q=${detail.latitude},${detail.longitude}&z=15&output=embed`;
  }

  if (rawLink) {
    const encoded = encodeURIComponent(rawLink);
    return `https://www.google.com/maps?q=${encoded}&z=15&output=embed`;
  }

  return "";
}

const cardStyle = {
  background: "white",
  borderRadius: 18,
  border: "1px solid #f1f0ea",
  boxShadow: "0 1px 3px rgba(0,0,0,.06)",
};

const inputStyle = {
  width: "100%",
  background: "#f9f8f3",
  border: "1px solid #e2e8e1",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 14,
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

function Overlay({ title, onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(28,25,23,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 120 }}>
      <div onClick={(e) => e.stopPropagation()} className="primary-card-p" style={{ width: "min(860px,100%)", maxHeight: "90vh", overflowY: "auto", background: "#fffdf9", borderRadius: 24, border: "1px solid #ede7dd", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f0ea", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="primary-card-p" style={{ margin: 0, fontSize: 22, border: "none" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

export default function AttractionAdminPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("list");
  const [mapKeyword, setMapKeyword] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    name: "",
    category: CATEGORY_OPTIONS[0],
    address: "",
    latitude: "",
    longitude: "",
    distanceKm: "",
    imageUrl: "",
    mapEmbedLink: "",
    description: "",
  });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAttractions({ includeInactive: true });
      const data = res.data?.data || [];
      setItems(data);
      if (data.length > 0) {
        setSelectedId((prev) => prev ?? data[0].id);
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Không thể tải danh sách địa điểm.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
        setSelectedDetail(null);
      } finally {
        setLoadingDetail(false);
      }
    };
    loadDetail();
  }, [selectedId]);

  const openCreate = () => {
    setEditingItem(null);
    setForm({
      name: "",
      category: CATEGORY_OPTIONS[0],
      address: "",
      latitude: "",
      longitude: "",
      distanceKm: "",
      imageUrl: "",
      mapEmbedLink: "",
      description: "",
    });
    setModalOpen(true);
  };

  const openEdit = async (item) => {
    try {
      const res = await getAttractionById(item.id);
      const detail = res.data;
      setEditingItem(item);
      setForm({
        name: detail.name || "",
        category: detail.category || CATEGORY_OPTIONS[0],
        address: detail.address || "",
        latitude: detail.latitude ?? "",
        longitude: detail.longitude ?? "",
        distanceKm: detail.distanceKm ?? "",
        imageUrl: detail.imageUrl || "",
        mapEmbedLink: detail.mapEmbedLink || "",
        description: detail.description || "",
      });
      setModalOpen(true);
    } catch (e) {
      setError(e?.response?.data?.message || "Không thể tải chi tiết địa điểm.");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const payload = {
      name: form.name,
      category: form.category,
      address: form.address || null,
      latitude: form.latitude === "" ? null : Number(form.latitude),
      longitude: form.longitude === "" ? null : Number(form.longitude),
      distanceKm: form.distanceKm === "" ? null : Number(form.distanceKm),
      imageUrl: form.imageUrl || null,
      mapEmbedLink: form.mapEmbedLink || null,
      description: form.description || null,
    };
    try {
      if (editingItem) await updateAttraction(editingItem.id, payload);
      else await createAttraction(payload);
      setModalOpen(false);
      await loadData();
    } catch (e2) {
      setError(e2?.response?.data?.message || "Không thể lưu địa điểm.");
    }
  };

  const filteredMapItems = items.filter((item) => {
    const normalized = mapKeyword.trim().toLowerCase();
    if (!normalized) return true;
    return [item.name, item.address, item.category]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalized));
  });

  const mapEmbedUrl = buildEmbedUrl(selectedDetail);

  return (
    <>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, color: "#1c1917", fontWeight: 700 }}>Quản lý địa điểm</h2>
            <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 14 }}>Quản lý điểm đến, tọa độ thực tế và dữ liệu để dùng cho site map.</p>
          </div>
          <button onClick={openCreate} style={{ padding: "10px 18px", borderRadius: 12, border: "none", background: "#4f645b", color: "#ecfdf5", fontWeight: 700, cursor: "pointer" }}>
            Thêm địa điểm
          </button>
        </div>

        {error ? <div className="sub-card-p" style={{ ...cardStyle, padding: 14, marginBottom: 20, color: "#b91c1c", background: "#fff7f7", borderColor: "#fecaca" }}>{error}</div> : null}

        <section className="primary-card-p" style={{ ...cardStyle, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f0ea", display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={activeTab === "list" ? "" : "sub-card-p"}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: activeTab === "list" ? "1px solid #4f645b" : "1px solid #e7e5e4",
                background: activeTab === "list" ? "#4f645b" : "white",
                color: activeTab === "list" ? "#ecfdf5" : "#57534e",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Danh sách địa điểm
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("map")}
              className={activeTab === "map" ? "" : "sub-card-p"}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: activeTab === "map" ? "1px solid #4f645b" : "1px solid #e7e5e4",
                background: activeTab === "map" ? "#4f645b" : "white",
                color: activeTab === "map" ? "#ecfdf5" : "#57534e",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Site Map
            </button>
          </div>

          {activeTab === "list" ? (
            <>
              <div style={{ padding: "18px 20px", borderBottom: "1px solid #f1f0ea" }}>
                <strong style={{ color: "#1c1917" }}>Danh sách địa điểm</strong>
                <p style={{ margin: "4px 0 0", color: "#78716c", fontSize: 13 }}>Tổng cộng {items.length} địa điểm.</p>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#faf8f3", borderBottom: "1px solid #f1f0ea" }}>
                      {["Địa điểm", "Danh mục", "Tọa độ", "Khoảng cách", "Thao tác"].map((heading, idx) => (
                        <th key={heading} style={{ padding: "16px 18px", textAlign: idx === 4 ? "right" : "left", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "#78716c" }}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Đang tải dữ liệu...</td></tr>
                    ) : items.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Chưa có địa điểm nào.</td></tr>
                    ) : (
                      items.map((item) => (
                        <tr key={item.id} style={{ borderBottom: "1px solid #f7f4ee" }}>
                          <td style={{ padding: "16px 18px" }}>
                            <div style={{ fontWeight: 700, color: "#1c1917" }}>{item.name}</div>
                            <div style={{ marginTop: 4, fontSize: 12, color: "#78716c" }}>{item.address || "-"}</div>
                          </td>
                          <td style={{ padding: "16px 18px", color: "#57534e" }}>{item.category || "-"}</td>
                          <td style={{ padding: "16px 18px", color: "#57534e" }}>{item.latitude ?? "-"}, {item.longitude ?? "-"}</td>
                          <td style={{ padding: "16px 18px", color: "#57534e" }}>{item.distanceKm ?? "-"} km</td>
                          <td style={{ padding: "16px 18px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 8 }}>
                              <button type="button" onClick={() => openEdit(item)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e7e5e4", background: "white", cursor: "pointer" }}>Sửa</button>
                              <button type="button" onClick={() => deleteAttraction(item.id).then(loadData)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #fecaca", background: "#fff7f7", color: "#b91c1c", cursor: "pointer" }}>Xóa</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-6 p-5">
              <div className="sub-card-p" style={{ border: "1px solid #f1f0ea", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: 16, borderBottom: "1px solid #f1f0ea" }}>
                  <strong style={{ color: "inherit" }}>Danh sách điểm đến</strong>
                  <input
                    value={mapKeyword}
                    onChange={(e) => setMapKeyword(e.target.value)}
                    placeholder="Tìm theo tên, địa chỉ, danh mục..."
                    style={{ ...inputStyle, marginTop: 12 }}
                  />
                </div>
                <div style={{ maxHeight: 560, overflowY: "auto" }}>
                  {filteredMapItems.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>Không có địa điểm phù hợp.</div>
                  ) : (
                    filteredMapItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={selectedId === item.id ? "" : "sub-card-p"}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: 16,
                          border: "none",
                          borderBottom: "1px solid #f7f4ee",
                          background: selectedId === item.id ? "#f8fafc" : "white",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontWeight: 700, color: "inherit" }}>{item.name}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: "inherit", opacity: 0.8 }}>{item.category || "-"} • {item.distanceKm ?? "-"} km</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: "inherit", opacity: 0.6 }}>{item.address || "-"}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="sub-card-p" style={{ border: "1px solid #f1f0ea", borderRadius: 16, padding: 18 }}>
                {loadingDetail ? (
                  <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Đang tải chi tiết địa điểm...</div>
                ) : selectedDetail ? (
                  <>
                    <div style={{ marginBottom: 18 }}>
                      <h3 style={{ margin: 0, fontSize: 22, color: "inherit" }}>{selectedDetail.name}</h3>
                      <p style={{ margin: "8px 0 0", color: "inherit", opacity: 0.7, fontSize: 14 }}>{selectedDetail.address || "Chưa có địa chỉ."}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      <div className="sub-card-p" style={{ padding: 14, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "inherit", opacity: 0.6, fontWeight: 700 }}>Latitude</div>
                        <div style={{ marginTop: 6, fontWeight: 700 }}>{selectedDetail.latitude ?? "-"}</div>
                      </div>
                      <div className="sub-card-p" style={{ padding: 14, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "inherit", opacity: 0.6, fontWeight: 700 }}>Longitude</div>
                        <div style={{ marginTop: 6, fontWeight: 700 }}>{selectedDetail.longitude ?? "-"}</div>
                      </div>
                      <div className="sub-card-p" style={{ padding: 14, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "inherit", opacity: 0.6, fontWeight: 700 }}>Khoảng cách</div>
                        <div style={{ marginTop: 6, fontWeight: 700 }}>{selectedDetail.distanceKm ?? "-"} km</div>
                      </div>
                    </div>
                    {mapEmbedUrl ? (
                      <iframe
                        title={`map-${selectedDetail.id}`}
                        src={mapEmbedUrl}
                        style={{ width: "100%", height: 420, border: "1px solid #e5e7eb", borderRadius: 18, background: "#fff" }}
                        loading="lazy"
                      />
                    ) : (
                      <div className="sub-card-p" style={{ padding: 32, textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: 18, color: "#94a3b8" }}>
                        Địa điểm này chưa có `mapEmbedLink` hoặc tọa độ đầy đủ để hiển thị bản đồ.
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>Chọn một địa điểm để xem site map.</div>
                )}
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
                <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Danh mục</label>
                <select value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} style={inputStyle}>
                  {CATEGORY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label style={labelStyle}>Địa chỉ</label>
                <input value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Latitude</label>
                <input value={form.latitude} onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Longitude</label>
                <input value={form.longitude} onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Khoảng cách (km)</label>
                <input value={form.distanceKm} onChange={(e) => setForm((prev) => ({ ...prev, distanceKm: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Ảnh URL</label>
                <input value={form.imageUrl} onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))} style={inputStyle} />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label style={labelStyle}>Map embed link</label>
                <input value={form.mapEmbedLink} onChange={(e) => setForm((prev) => ({ ...prev, mapEmbedLink: e.target.value }))} style={inputStyle} />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label style={labelStyle}>Mô tả</label>
                <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button type="button" className="sub-card-p" onClick={() => setModalOpen(false)} style={{ padding: "10px 16px", borderRadius: 12, border: "1px solid #e7e5e4", background: "white", color: "#57534e", fontWeight: 600, cursor: "pointer" }}>Đóng</button>
              <button type="submit" style={{ padding: "10px 18px", borderRadius: 12, border: "none", background: "#4f645b", color: "#ecfdf5", fontWeight: 700, cursor: "pointer" }}>Lưu địa điểm</button>
            </div>
          </form>
        </Overlay>
      ) : null}
    </>
  );
}