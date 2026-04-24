import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createService,
  createServiceCategory,
  deleteService,
  deleteServiceCategory,
  getServiceCategories,
  getServices,
  toggleService,
  toggleServiceCategory,
  updateService,
  updateServiceCategory,
  uploadServiceImage,
} from "../../api/servicesApi";
import { formatCurrency } from "../../utils";
import { formatMoneyInput, parseMoneyInput } from "../../utils/moneyInput";
import { useResponsiveAdmin } from "../../hooks/useResponsiveAdmin";

const panelStyle = {
  background: "var(--a-surface)",
  borderRadius: 16,
  border: "1px solid var(--a-border)",
  boxShadow: "none",
};

const inputStyle = {
  width: "100%",
  background: "var(--a-bg)",
  border: "1px solid var(--a-surface-bright)",
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
  color: "var(--a-text-muted)",
  marginBottom: 8,
};

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--a-overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(760px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--a-surface)",
          borderRadius: 24,
          border: "1px solid var(--a-border)",
          boxShadow: "var(--a-shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "22px 24px 16px",
            borderBottom: "1px solid var(--a-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 22, color: "var(--a-text)" }}>{title}</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--a-text-muted)" }}>
              Giao diện đồng bộ với admin hiện tại.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--a-text-muted)" }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

export default function ServicePage() {
  const { isMobile } = useResponsiveAdmin();
  const [categoryRows, setCategoryRows] = useState([]);
  const [serviceRows, setServiceRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoryKeyword, setCategoryKeyword] = useState("");
  const [serviceKeyword, setServiceKeyword] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [serviceForm, setServiceForm] = useState({
    categoryId: "",
    name: "",
    description: "",
    price: "",
    unit: "",
    imageUrl: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serviceImageFile, setServiceImageFile] = useState(null);
  const [serviceImagePreview, setServiceImagePreview] = useState("");

  const activeCategories = useMemo(
    () => categoryRows.filter((item) => item.isActive),
    [categoryRows],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [categoryRes, serviceRes] = await Promise.all([
        getServiceCategories({
          page: 1,
          pageSize: 100,
          keyword: categoryKeyword,
          includeInactive,
        }),
        getServices({
          page: 1,
          pageSize: 200,
          keyword: serviceKeyword,
          categoryId: selectedCategoryId || null,
          includeInactive,
        }),
      ]);

      setCategoryRows(categoryRes.data?.data || []);
      setServiceRows(serviceRes.data?.data || []);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Không thể tải dữ liệu dịch vụ.");
    } finally {
      setLoading(false);
    }
  }, [categoryKeyword, serviceKeyword, selectedCategoryId, includeInactive]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryName("");
    setErrorMessage("");
  };

  const resetServiceForm = () => {
    setEditingService(null);
    setServiceImageFile(null);
    setServiceImagePreview("");
    setServiceForm({
      categoryId: "",
      name: "",
      description: "",
      price: "",
      unit: "",
      imageUrl: "",
    });
    setErrorMessage("");
  };

  const openCategoryModal = (category = null) => {
    setEditingCategory(category);
    setCategoryName(category?.name || "");
    setErrorMessage("");
    setCategoryModalOpen(true);
  };

  const openServiceModal = (service = null) => {
    setEditingService(service);
    setServiceForm({
      categoryId: service?.categoryId?.toString() || "",
      name: service?.name || "",
      description: service?.description || "",
      price: formatMoneyInput(service?.price || ""),
      unit: service?.unit || "",
      imageUrl: service?.imageUrl || "",
    });
    setServiceImageFile(null);
    setServiceImagePreview(service?.imageUrl || "");
    setErrorMessage("");
    setServiceModalOpen(true);
  };

  const handleServiceImageChange = (file) => {
    setServiceImageFile(file || null);
    setServiceImagePreview(file ? URL.createObjectURL(file) : serviceForm.imageUrl || "");
  };

  const removeServiceImage = () => {
    setServiceImageFile(null);
    setServiceImagePreview("");
    setServiceForm((prev) => ({ ...prev, imageUrl: "" }));
  };

  const submitCategory = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    try {
      if (editingCategory) {
        await updateServiceCategory(editingCategory.id, { name: categoryName });
      } else {
        await createServiceCategory({ name: categoryName });
      }
      setCategoryModalOpen(false);
      resetCategoryForm();
      await loadData();
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Không thể lưu nhóm dịch vụ.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitService = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    let imageUrl = serviceForm.imageUrl || null;
    try {
      if (serviceImageFile) {
        const uploadRes = await uploadServiceImage(serviceImageFile);
        imageUrl = uploadRes.data?.url || null;
      }
    } catch (error) {
      setSubmitting(false);
      setErrorMessage(error?.response?.data?.message || "Không thể upload ảnh dịch vụ.");
      return;
    }

    const payload = {
      categoryId: serviceForm.categoryId ? Number(serviceForm.categoryId) : null,
      name: serviceForm.name,
      description: serviceForm.description || null,
      price: parseMoneyInput(serviceForm.price),
      unit: serviceForm.unit || null,
      imageUrl,
    };
    try {
      if (editingService) {
        await updateService(editingService.id, payload);
      } else {
        await createService(payload);
      }
      setServiceModalOpen(false);
      resetServiceForm();
      await loadData();
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Không thể lưu dịch vụ.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCategoryAction = async (handler, id, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      await handler(id);
      await loadData();
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Không thể cập nhật nhóm dịch vụ.");
    }
  };

  const handleServiceAction = async (handler, id, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      await handler(id);
      await loadData();
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Không thể cập nhật dịch vụ.");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', sans-serif; }
      `}</style>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 24,
            gap: 16,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "var(--a-text)" }}>
              Quản lý Dịch vụ
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--a-text-muted)" }}>
              Quản lý đồng thời nhóm dịch vụ và dịch vụ phát sinh theo cùng theme admin.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => openCategoryModal()}
              style={primaryButton(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>category</span>
              Thêm nhóm
            </button>
            <button
              onClick={() => openServiceModal()}
              style={primaryButton(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>room_service</span>
              Thêm dịch vụ
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div style={{ ...panelStyle, marginBottom: 20, padding: 16, color: "var(--a-error)", background: "var(--a-error-bg)", borderColor: "var(--a-error-border)" }}>
            {errorMessage}
          </div>
        ) : null}

        <section style={{ ...panelStyle, padding: 24, marginBottom: 24 }}>
          <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1.2fr_0.9fr_auto] gap-4 items-end">
            <div>
              <label style={labelStyle}>Tìm nhóm dịch vụ</label>
              <input value={categoryKeyword} onChange={(e) => setCategoryKeyword(e.target.value)} style={inputStyle} placeholder="Nhà hàng, Spa..." />
            </div>
            <div>
              <label style={labelStyle}>Tìm dịch vụ</label>
              <input value={serviceKeyword} onChange={(e) => setServiceKeyword(e.target.value)} style={inputStyle} placeholder="Buffet, giặt ủi..." />
            </div>
            <div>
              <label style={labelStyle}>Lọc theo nhóm</label>
              <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} style={inputStyle}>
                <option value="">Tất cả nhóm</option>
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                color: "var(--a-text-muted)",
                paddingBottom: 10,
              }}
            >
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
              Hiện cả dữ liệu đã ẩn
            </label>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.35fr] gap-6">
          <section style={{ ...panelStyle, overflow: "hidden" }}>
            <SectionHeader
              icon="category"
              title="Nhóm dịch vụ"
              subtitle={`${categoryRows.length} nhóm`}
            />
            <div style={{ padding: 18 }}>
              {loading ? (
                <EmptyState label="Đang tải nhóm dịch vụ..." icon="hourglass_top" />
              ) : categoryRows.length === 0 ? (
                <EmptyState label="Chưa có nhóm dịch vụ nào." icon="inventory_2" />
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {categoryRows.map((category) => (
                    <div key={category.id} style={rowCardStyle(category.isActive)}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <strong style={{ fontSize: 15, color: "var(--a-text)" }}>{category.name}</strong>
                          <StatusChip active={category.isActive} />
                        </div>
                        <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--a-text-muted)" }}>
                          {category.serviceCount ?? 0} dịch vụ đang hoạt động
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <IconButton icon="edit" title="Sửa" onClick={() => openCategoryModal(category)} />
                        <IconButton
                          icon={category.isActive ? "visibility_off" : "visibility"}
                          title={category.isActive ? "Ẩn" : "Hiện"}
                          onClick={() => handleCategoryAction(toggleServiceCategory, category.id)}
                        />
                        <IconButton
                          icon="delete"
                          title="Xóa mềm"
                          danger
                          onClick={() =>
                            handleCategoryAction(
                              deleteServiceCategory,
                              category.id,
                              `Xóa mềm nhóm "${category.name}"?`,
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section style={{ ...panelStyle, overflow: "hidden" }}>
            <SectionHeader
              icon="room_service"
              title="Dịch vụ"
              subtitle={`${serviceRows.length} dịch vụ`}
            />
            {isMobile ? (
              <div style={{ display: "grid", gap: 12, padding: 14 }}>
                {loading ? (
                  <EmptyState label="Đang tải dịch vụ..." icon="hourglass_top" />
                ) : serviceRows.length === 0 ? (
                  <EmptyState label="Chưa có dịch vụ phù hợp bộ lọc." icon="search_off" />
                ) : serviceRows.map((service) => (
                  <article key={service.id} style={{ border: "1px solid var(--a-border)", borderRadius: 16, padding: 14, display: "grid", gap: 12, background: "var(--a-surface-raised)" }}>
                    <ServiceImage imageUrl={service.imageUrl} name={service.name} height={150} />
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 900, color: "var(--a-text)", fontSize: 16 }}>{service.name}</div>
                        <div style={{ color: "var(--a-text-muted)", fontSize: 12, marginTop: 4 }}>{service.description || "Chưa có mô tả"}</div>
                      </div>
                      <StatusChip active={service.isActive} label={service.isActive ? "Đang bán" : "Đã ẩn"} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div style={{ background: "var(--a-bg)", borderRadius: 12, padding: 10, border: "1px solid var(--a-border)" }}>
                        <div style={{ fontSize: 10, color: "var(--a-text-muted)", fontWeight: 900 }}>Nhóm</div>
                        <div style={{ fontSize: 13, color: "var(--a-text)", fontWeight: 800 }}>{service.categoryName || "Chưa gán"}</div>
                      </div>
                      <div style={{ background: "var(--a-bg)", borderRadius: 12, padding: 10, border: "1px solid var(--a-border)" }}>
                        <div style={{ fontSize: 10, color: "var(--a-text-muted)", fontWeight: 900 }}>Giá</div>
                        <div style={{ fontSize: 13, color: "var(--a-text)", fontWeight: 900 }}>{formatCurrency(service.price)}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <span style={{ color: "var(--a-text-muted)", fontSize: 13 }}>{service.unit || "-"}</span>
                      <div style={{ display: "inline-flex", gap: 8 }}>
                        <IconButton icon="edit" title="Sửa" onClick={() => openServiceModal(service)} />
                        <IconButton icon={service.isActive ? "visibility_off" : "visibility"} title={service.isActive ? "Ẩn" : "Hiện"} onClick={() => handleServiceAction(toggleService, service.id)} />
                        <IconButton icon="delete" title="Xóa mềm" danger onClick={() => handleServiceAction(deleteService, service.id, `Xóa mềm dịch vụ \"${service.name}\"?`)} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--a-surface-raised)", borderBottom: "1px solid var(--a-border)" }}>
                    {["Dịch vụ", "Nhóm", "Giá", "Đơn vị", "Trạng thái", "Thao tác"].map((heading, idx) => (
                      <th
                        key={heading}
                        style={{
                          padding: "16px 18px",
                          textAlign: idx === 5 ? "right" : "left",
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: ".08em",
                          color: "var(--a-text-muted)",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 48 }}>
                        <EmptyState label="Đang tải dịch vụ..." icon="hourglass_top" />
                      </td>
                    </tr>
                  ) : serviceRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 48 }}>
                        <EmptyState label="Chưa có dịch vụ phù hợp bộ lọc." icon="search_off" />
                      </td>
                    </tr>
                  ) : (
                    serviceRows.map((service) => (
                      <tr key={service.id} style={{ borderBottom: "1px solid var(--a-border)" }}>
                        <td style={{ padding: "16px 18px" }}>
                          <div>
                            <div style={{ fontWeight: 800, color: "var(--a-text)", fontSize: 14 }}>{service.name}</div>
                            <div style={{ color: "var(--a-text-muted)", fontSize: 12, marginTop: 4 }}>
                              {service.description || "Chưa có mô tả"}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "16px 18px", color: "var(--a-text-muted)", fontSize: 14 }}>
                          {service.categoryName || "Chưa gán nhóm"}
                        </td>
                        <td style={{ padding: "16px 18px", color: "var(--a-text)", fontWeight: 700 }}>
                          {formatCurrency(service.price)}
                        </td>
                        <td style={{ padding: "16px 18px", color: "var(--a-text-muted)" }}>
                          {service.unit || "—"}
                        </td>
                        <td style={{ padding: "16px 18px" }}>
                          <StatusChip active={service.isActive} label={service.isActive ? "Đang bán" : "Đã ẩn"} />
                        </td>
                        <td style={{ padding: "16px 18px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 8 }}>
                            <IconButton icon="edit" title="Sửa" onClick={() => openServiceModal(service)} />
                            <IconButton
                              icon={service.isActive ? "visibility_off" : "visibility"}
                              title={service.isActive ? "Ẩn" : "Hiện"}
                              onClick={() => handleServiceAction(toggleService, service.id)}
                            />
                            <IconButton
                              icon="delete"
                              title="Xóa mềm"
                              danger
                              onClick={() =>
                                handleServiceAction(deleteService, service.id, `Xóa mềm dịch vụ "${service.name}"?`)
                              }
                            />
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
        </div>
      </div>

      <Modal
        open={categoryModalOpen}
        title={editingCategory ? "Cập nhật nhóm dịch vụ" : "Tạo nhóm dịch vụ"}
        onClose={() => {
          setCategoryModalOpen(false);
          resetCategoryForm();
        }}
      >
        <form onSubmit={submitCategory}>
          <label style={labelStyle}>Tên nhóm</label>
          <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} style={inputStyle} placeholder="Ví dụ: Spa & Massage" />
          {errorMessage ? <p style={{ color: "var(--a-error)", marginTop: 12 }}>{errorMessage}</p> : null}
          <FormFooter submitting={submitting} onClose={() => setCategoryModalOpen(false)} />
        </form>
      </Modal>

      <Modal
        open={serviceModalOpen}
        title={editingService ? "Cập nhật dịch vụ" : "Tạo dịch vụ"}
        onClose={() => {
          setServiceModalOpen(false);
          resetServiceForm();
        }}
      >
        <form onSubmit={submitService}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Tên dịch vụ</label>
              <input
                value={serviceForm.name}
                onChange={(e) => setServiceForm((prev) => ({ ...prev, name: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Nhóm dịch vụ</label>
              <select
                value={serviceForm.categoryId}
                onChange={(e) => setServiceForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                style={inputStyle}
              >
                <option value="">Chưa gán nhóm</option>
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Giá</label>
              <input
                type="text"
                inputMode="numeric"
                value={serviceForm.price}
                onChange={(e) => setServiceForm((prev) => ({ ...prev, price: formatMoneyInput(e.target.value) }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Đơn vị</label>
              <input
                value={serviceForm.unit}
                onChange={(e) => setServiceForm((prev) => ({ ...prev, unit: e.target.value }))}
                style={inputStyle}
                placeholder="Suất, lượt, kg..."
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Mô tả</label>
              <textarea
                value={serviceForm.description}
                onChange={(e) => setServiceForm((prev) => ({ ...prev, description: e.target.value }))}
                style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Ảnh dịch vụ</label>
              <ImagePicker
                preview={serviceImagePreview || serviceForm.imageUrl}
                fileName={serviceImageFile?.name}
                onPick={handleServiceImageChange}
                onRemove={removeServiceImage}
              />
            </div>
          </div>
          {errorMessage ? <p style={{ color: "var(--a-error)", marginTop: 12 }}>{errorMessage}</p> : null}
          <FormFooter submitting={submitting} onClose={() => setServiceModalOpen(false)} />
        </form>
      </Modal>
    </>
  );
}

function ServiceImage({ imageUrl, name, height = 120, width = "100%" }) {
  return (
    <div style={{ width, height, borderRadius: 14, overflow: "hidden", background: "linear-gradient(135deg, color-mix(in srgb, var(--a-primary) 14%, var(--a-surface)) 0%, color-mix(in srgb, var(--a-warning-bg) 36%, var(--a-surface-raised)) 100%)", border: "1px solid var(--a-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--a-primary)", flexShrink: 0 }}>
      {imageUrl ? (
        <img src={imageUrl} alt={name || "Dịch vụ"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span className="material-symbols-outlined" style={{ fontSize: 34 }}>room_service</span>
      )}
    </div>
  );
}

function ImagePicker({ preview, fileName, onPick, onRemove }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ServiceImage imageUrl={preview} name="Preview dịch vụ" height={160} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <label style={{ ...primaryButton(true), justifyContent: "center" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>upload</span>
          {preview ? "Đổi ảnh dịch vụ" : "Chọn ảnh dịch vụ"}
          <input type="file" accept="image/*" onChange={(e) => onPick(e.target.files?.[0] || null)} style={{ display: "none" }} />
        </label>
        {preview ? (
          <button type="button" onClick={onRemove} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid var(--a-error-border)", background: "var(--a-error-bg)", color: "var(--a-error)", fontWeight: 800, cursor: "pointer" }}>
            Gỡ ảnh
          </button>
        ) : null}
      </div>
      {fileName ? <div style={{ fontSize: 12, color: "var(--a-text-muted)", fontWeight: 700, wordBreak: "break-word" }}>{fileName}</div> : null}
    </div>
  );
}

function primaryButton(soft) {
  return {
    padding: "10px 18px",
    borderRadius: 12,
    border: soft ? "1px solid var(--a-border)" : "none",
    background: soft ? "var(--a-surface)" : "var(--a-primary)",
    color: soft ? "var(--a-text)" : "var(--a-text-inverse)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "none",
  };
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div
      style={{
        padding: "18px 20px",
        borderBottom: "1px solid var(--a-border)",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          background: "var(--a-brand-bg)",
          color: "var(--a-brand-ink)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <div style={{ fontWeight: 800, color: "var(--a-text)" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--a-text-muted)", marginTop: 2 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function EmptyState({ label, icon }) {
  return (
    <div style={{ textAlign: "center", color: "var(--a-text-soft)" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 42 }}>{icon}</span>
      <p style={{ margin: "10px 0 0", fontWeight: 500 }}>{label}</p>
    </div>
  );
}

function StatusChip({ active, label }) {
  return (
    <span
      style={{
        padding: "5px 10px",
        borderRadius: 999,
        background: active ? "var(--a-success-bg)" : "var(--a-surface-bright)",
        color: active ? "var(--a-success)" : "var(--a-text-muted)",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: ".06em",
      }}
    >
      {label || (active ? "Hoạt động" : "Đã ẩn")}
    </span>
  );
}

function IconButton({ icon, title, onClick, danger = false }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        border: "1px solid var(--a-border)",
        background: danger ? "var(--a-error-bg)" : "var(--a-surface)",
        color: danger ? "var(--a-error)" : "var(--a-text-muted)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
    </button>
  );
}

function rowCardStyle(active) {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    border: "1px solid var(--a-border)",
    background: active ? "color-mix(in srgb, var(--a-primary) 8%, var(--a-surface-raised))" : "var(--a-bg)",
    gap: 12,
  };
}

function FormFooter({ submitting, onClose }) {
  return (
    <div
      style={{
        marginTop: 20,
        display: "flex",
        justifyContent: "flex-end",
        gap: 12,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        style={{
          padding: "10px 16px",
          borderRadius: 12,
          border: "1px solid var(--a-border)",
          background: "var(--a-surface)",
          color: "var(--a-text-muted)",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Đóng
      </button>
      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: "10px 18px",
          borderRadius: 12,
          border: "none",
          background: "var(--a-primary)",
          color: "var(--a-text-inverse)",
          fontWeight: 800,
          cursor: "pointer",
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </div>
  );
}
