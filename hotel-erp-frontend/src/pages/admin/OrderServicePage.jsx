import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createOrderService,
  getOrderServiceById,
  getOrderServiceBookingOptions,
  getOrderServices,
  updateOrderService,
  updateOrderServiceStatus,
} from "../../api/orderServicesApi";
import { getServiceCategories, getServices } from "../../api/servicesApi";
import { formatCurrency, formatDate } from "../../utils";
import {
  FormFooter,
  IconButton,
  Modal as SharedModal,
  SERVICE_VIEW_STORAGE_KEY,
  ServiceAdminShell,
  inputStyle,
  labelStyle,
  panelStyle,
  primaryButton,
} from "./ServiceAdminShared";

const secondaryButtonStyle = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid var(--a-border)",
  background: "var(--a-surface)",
  color: "var(--a-text-muted)",
  fontWeight: 600,
  cursor: "pointer",
};

const ORDER_STATUSES = ["Pending", "Delivered", "Cancelled"];
const ORDER_STATUS_LABELS = {
  Pending: "Chờ xử lý",
  Delivered: "Đã giao",
  Cancelled: "Đã hủy",
};
const BOOKING_STATUS_LABELS = {
  Pending: "Chờ nhận",
  Confirmed: "Đã xác nhận",
  Checked_in: "Đang ở",
  Checked_out_pending_settlement: "Chờ quyết toán",
  Completed: "Hoàn tất",
  Cancelled: "Đã hủy",
};

export default function OrderServicePage() {
  const [rows, setRows] = useState([]);
  const [serviceCategoryOptions, setServiceCategoryOptions] = useState([]);
  const [serviceOptions, setServiceOptions] = useState([]);
  const [bookingDetailOptions, setBookingDetailOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({
    bookingDetailId: "",
    note: "",
    items: [{ categoryId: "", serviceId: "", quantity: 1, unitPriceOverride: "" }],
  });

  const activeServiceOptions = useMemo(
    () => serviceOptions.filter((service) => service.isActive && service.categoryIsActive !== false),
    [serviceOptions],
  );
  const activeCategoryOptions = useMemo(
    () => serviceCategoryOptions.filter((category) => category.isActive !== false),
    [serviceCategoryOptions],
  );

  const selectedBookingDetail = useMemo(
    () =>
      bookingDetailOptions.find(
        (item) => String(item.bookingDetailId) === String(form.bookingDetailId),
      ) || null,
    [bookingDetailOptions, form.bookingDetailId],
  );

  const stats = useMemo(() => {
    const pendingCount = rows.filter((item) => item.status === "Pending").length;
    const deliveredCount = rows.filter((item) => item.status === "Delivered").length;
    const cancelledCount = rows.filter((item) => item.status === "Cancelled").length;

    return [
      {
        label: "Đơn dịch vụ",
        value: rows.length,
        description: `${pendingCount} đơn đang chờ xử lý`,
        icon: "receipt_long",
      },
      {
        label: "Đã hoàn tất",
        value: deliveredCount,
        description: `${cancelledCount} đơn đã hủy`,
        icon: "done_all",
      },
      {
        label: "Dịch vụ khả dụng",
        value: activeServiceOptions.length,
        description: `${bookingDetailOptions.length} booking detail có thể gắn đơn`,
        icon: "room_service",
      },
    ];
  }, [activeServiceOptions.length, bookingDetailOptions.length, rows]);

  useEffect(() => {
    sessionStorage.setItem(SERVICE_VIEW_STORAGE_KEY, "order");
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [orderRes, categoryRes, serviceRes, bookingOptionRes] = await Promise.all([
        getOrderServices({
          page: 1,
          pageSize: 200,
          keyword,
          status,
        }),
        getServiceCategories({ page: 1, pageSize: 200, includeInactive: true }),
        getServices({ page: 1, pageSize: 200, includeInactive: false }),
        getOrderServiceBookingOptions(),
      ]);
      setRows(orderRes.data?.data || []);
      setServiceCategoryOptions(categoryRes.data?.data || []);
      setServiceOptions(serviceRes.data?.data || []);
      setBookingDetailOptions(bookingOptionRes.data?.data || []);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Không thể tải đơn dịch vụ.");
    } finally {
      setLoading(false);
    }
  }, [keyword, status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({
      bookingDetailId: "",
      note: "",
      items: [{ categoryId: "", serviceId: "", quantity: 1, unitPriceOverride: "" }],
    });
    setErrorMessage("");
    setModalOpen(true);
  };

  const openEditModal = async (item) => {
    try {
      const res = await getOrderServiceById(item.id, { includeInactive: true });
      const detail = res.data;
      setEditingItem(item);
      setForm({
        bookingDetailId: detail.bookingDetailId?.toString() || "",
        note: detail.note || "",
        items:
          detail.details?.map((line) => ({
            categoryId:
              line.categoryId?.toString() ||
              serviceOptions.find((service) => String(service.id) === String(line.serviceId))?.categoryId?.toString() ||
              "",
            serviceId: line.serviceId?.toString() || "",
            quantity: line.quantity || 1,
            unitPriceOverride: line.unitPrice?.toString() || "",
          })) || [{ categoryId: "", serviceId: "", quantity: 1, unitPriceOverride: "" }],
      });
      setErrorMessage("");
      setModalOpen(true);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Không thể tải chi tiết đơn dịch vụ.");
    }
  };

  const openDetail = async (id) => {
    try {
      const res = await getOrderServiceById(id, { includeInactive: true });
      setDetailItem(res.data);
      setDetailOpen(true);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Không thể tải chi tiết đơn dịch vụ.");
    }
  };

  const updateItemField = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index
          ? field === "categoryId"
            ? { ...item, categoryId: value, serviceId: "" }
            : { ...item, [field]: value }
          : item,
      ),
    }));
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { categoryId: "", serviceId: "", quantity: 1, unitPriceOverride: "" }],
    }));
  };

  const removeLine = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const getBookingStatusLabelShort = (value) => BOOKING_STATUS_LABELS[value] || value || "—";
  const getOrderStatusLabelShort = (value) => ORDER_STATUS_LABELS[value] || value || "—";
  const getServicesByCategory = (categoryId) =>
    activeServiceOptions.filter((service) => String(service.categoryId || "") === String(categoryId || ""));

  const submitForm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    const payload = {
      bookingDetailId: Number(form.bookingDetailId),
      note: form.note || null,
      items: form.items.map((item) => ({
        serviceId: Number(item.serviceId),
        quantity: Number(item.quantity),
        unitPriceOverride:
          item.unitPriceOverride === "" ? null : Number(item.unitPriceOverride),
      })),
    };

    try {
      if (editingItem) {
        await updateOrderService(editingItem.id, {
          note: payload.note,
          items: payload.items,
        });
      } else {
        await createOrderService(payload);
      }
      setModalOpen(false);
      await loadData();
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Không thể lưu đơn dịch vụ.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ServiceAdminShell
        view="order"
        title="Quản lý dịch vụ"
        subtitle="Theo dõi đơn dịch vụ, danh mục dịch vụ và nhóm dịch vụ trong cùng một module."
        stats={stats}
        primaryAction={
          <button onClick={openCreateModal} style={primaryButton(false)}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              receipt_long
            </span>
            Tạo đơn dịch vụ
          </button>
        }
        filterContent={
          <div className="grid grid-cols-1 md:grid-cols-[1.4fr_0.9fr] gap-4 items-end">
            <div>
              <label style={labelStyle}>Tìm booking / khách / phòng</label>
              <input value={keyword} onChange={(e) => setKeyword(e.target.value)} style={inputStyle} placeholder="Booking code, khách, số phòng..." />
            </div>
            <div>
              <label style={labelStyle}>Trạng thái</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
                <option value="">Tất cả</option>
                {ORDER_STATUSES.map((item) => <option key={item} value={item}>{getOrderStatusLabelShort(item)}</option>)}
              </select>
            </div>
          </div>
        }
      >
        {errorMessage ? (
          <div style={{ ...panelStyle, padding: 14, marginBottom: 20, color: "var(--a-error)", background: "var(--a-error-bg)", borderColor: "var(--a-error-border)" }}>
            {errorMessage}
          </div>
        ) : null}

        <section style={{ ...panelStyle, overflow: "hidden" }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--a-border)" }}>
            <strong style={{ color: "var(--a-text)" }}>Danh sách đơn dịch vụ</strong>
            <p style={{ margin: "4px 0 0", color: "var(--a-text-muted)", fontSize: 13 }}>Tổng cộng {rows.length} đơn.</p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--a-surface-raised)", borderBottom: "1px solid var(--a-border)" }}>
                  {["Booking", "Khách / Phòng", "Ngày tạo", "Tổng tiền", "Trạng thái", "Thao tác"].map((heading, idx) => (
                    <th key={heading} style={{ padding: "16px 18px", textAlign: idx === 5 ? "right" : "left", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--a-text-muted)" }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: 48, textAlign: "center", color: "var(--a-text-soft)" }}>Đang tải dữ liệu...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 48, textAlign: "center", color: "var(--a-text-soft)" }}>Chưa có đơn dịch vụ nào.</td></tr>
                ) : (
                  rows.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid var(--a-border)" }}>
                      <td style={{ padding: "16px 18px" }}>
                        <strong style={{ color: "var(--a-text)" }}>{item.bookingCode || `#${item.bookingId || "-"}`}</strong>
                        <div style={{ marginTop: 4, fontSize: 12, color: "var(--a-text-muted)" }}>Order #{item.id}</div>
                      </td>
                      <td style={{ padding: "16px 18px", color: "var(--a-text-muted)" }}>
                        <div>{item.guestName || "-"}</div>
                        <div style={{ fontSize: 12, color: "var(--a-text-muted)", marginTop: 4 }}>Phòng: {item.roomNumber || "-"}</div>
                      </td>
                      <td style={{ padding: "16px 18px", color: "var(--a-text-muted)" }}>{formatDate(item.orderDate)}</td>
                      <td style={{ padding: "16px 18px", fontWeight: 700, color: "var(--a-text)" }}>{formatCurrency(item.totalAmount)}</td>
                      <td style={{ padding: "16px 18px" }}>
                        <select
                          value={item.status || ""}
                          onChange={(e) => updateOrderServiceStatus(item.id, e.target.value).then(loadData)}
                          style={{ ...inputStyle, minWidth: 150 }}
                          disabled={!item.isActive}
                        >
                          {ORDER_STATUSES.map((orderStatus) => (
                            <option key={orderStatus} value={orderStatus}>{getOrderStatusLabelShort(orderStatus)}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "16px 18px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 8 }}>
                          <IconButton icon="visibility" title="Xem chi tiết" onClick={() => openDetail(item.id)} />
                          <IconButton icon="edit" title="Chỉnh sửa" onClick={() => openEditModal(item)} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </ServiceAdminShell>

      {modalOpen ? (
        <SharedModal open={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? "Cập nhật đơn dịch vụ" : "Tạo đơn dịch vụ"}>
          <form onSubmit={submitForm}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Booking / Phòng / Khách</label>
                <select
                  value={form.bookingDetailId}
                  onChange={(e) => setForm((prev) => ({ ...prev, bookingDetailId: e.target.value }))}
                  style={inputStyle}
                  disabled={Boolean(editingItem)}
                >
                  <option value="">Chọn booking detail khả dụng</option>
                  {bookingDetailOptions.map((option) => (
                    <option key={option.bookingDetailId} value={option.bookingDetailId}>
                      {`${option.roomNumber || "—"} • ${option.guestName || "Khách"} • ${option.bookingCode || `#${option.bookingId}`}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Ghi chú</label>
                <input value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} style={inputStyle} placeholder="Ghi chú giao dịch vụ" />
              </div>
            </div>

            {selectedBookingDetail ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-3" style={{ padding: 14, borderRadius: 14, background: "var(--a-bg)", border: "1px solid var(--a-border)" }}>
                <InfoChip label="Booking" value={selectedBookingDetail.bookingCode || `#${selectedBookingDetail.bookingId || "—"}`} />
                <InfoChip label="Khách" value={selectedBookingDetail.guestName || "—"} />
                <InfoChip label="Phòng" value={selectedBookingDetail.roomNumber || "—"} />
                <InfoChip label="Trạng thái" value={getBookingStatusLabelShort(selectedBookingDetail.bookingStatus)} />
              </div>
            ) : null}

            <div style={{ marginTop: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <strong style={{ color: "var(--a-text)" }}>Dòng dịch vụ</strong>
                <button type="button" onClick={addLine} style={secondaryButtonStyle}>Thêm dòng</button>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {form.items.map((item, index) => (
                  <div key={`${index}-${item.serviceId}`} className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr_0.7fr_0.9fr_auto] gap-3 items-end" style={{ padding: 14, borderRadius: 14, border: "1px solid var(--a-border)", background: "var(--a-surface-raised)" }}>
                    <div>
                      <label style={labelStyle}>Nhóm dịch vụ</label>
                      <select value={item.categoryId} onChange={(e) => updateItemField(index, "categoryId", e.target.value)} style={inputStyle}>
                        <option value="">Chọn nhóm dịch vụ</option>
                        {activeCategoryOptions.map((category) => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Dịch vụ</label>
                      <select value={item.serviceId} onChange={(e) => updateItemField(index, "serviceId", e.target.value)} style={inputStyle}>
                        <option value="">{item.categoryId ? "Chọn dịch vụ" : "Chọn nhóm trước"}</option>
                        {getServicesByCategory(item.categoryId).map((service) => (
                          <option key={service.id} value={service.id}>{service.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Số lượng</label>
                      <input type="number" min="1" value={item.quantity} onChange={(e) => updateItemField(index, "quantity", e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Đơn giá override</label>
                      <input type="number" min="0" value={item.unitPriceOverride} onChange={(e) => updateItemField(index, "unitPriceOverride", e.target.value)} style={inputStyle} placeholder="Để trống = giá gốc" />
                    </div>
                    <button type="button" onClick={() => removeLine(index)} disabled={form.items.length === 1} style={{ ...secondaryButtonStyle, opacity: form.items.length === 1 ? 0.5 : 1 }}>
                      Xóa dòng
                    </button>
                    {item.serviceId ? (
                      <div style={{ gridColumn: "1 / span 5", fontSize: 12, color: "var(--a-text-muted)", marginTop: -2 }}>
                        Đơn giá gốc: {formatCurrency(activeServiceOptions.find((service) => String(service.id) === String(item.serviceId))?.price || 0)}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {errorMessage ? <p style={{ color: "var(--a-error)", marginTop: 12 }}>{errorMessage}</p> : null}
            <FormFooter submitting={submitting} onClose={() => setModalOpen(false)} />
          </form>
        </SharedModal>
      ) : null}

      {detailOpen && detailItem ? (
        <SharedModal open={detailOpen} onClose={() => setDetailOpen(false)} title={`Chi tiết Order #${detailItem.id}`}>
          <div style={{ display: "grid", gap: 12 }}>
            <DetailGrid label="Booking" value={detailItem.bookingCode || `#${detailItem.bookingId || "?"}`} />
            <DetailGrid label="Khách" value={detailItem.guestName || "?"} />
            <DetailGrid label="Phòng" value={detailItem.roomNumber || "?"} />
            <DetailGrid label="Loại phòng" value={detailItem.roomTypeName || "?"} />
            <DetailGrid label="Ngày tạo" value={formatDate(detailItem.orderDate)} />
            <DetailGrid label="Trạng thái" value={getOrderStatusLabelShort(detailItem.status)} />
            <DetailGrid label="Tổng tiền" value={formatCurrency(detailItem.totalAmount)} />
            <div style={{ marginTop: 8 }}>
              <strong style={{ color: "var(--a-text)" }}>Dòng dịch vụ</strong>
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {(detailItem.details || []).map((line) => (
                  <div key={line.id} style={{ padding: 14, borderRadius: 14, border: "1px solid var(--a-border)", background: "var(--a-surface-raised)", display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--a-text)" }}>{line.serviceName || `#${line.serviceId}`}</div>
                      <div style={{ color: "var(--a-text-muted)", fontSize: 12, marginTop: 4 }}>
                        Số lượng: {line.quantity} · Đơn giá: {formatCurrency(line.unitPrice)}
                      </div>
                    </div>
                    <strong style={{ color: "var(--a-text)" }}>{formatCurrency(line.lineTotal)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SharedModal>
      ) : null}
    </>
  );
}

function InfoChip({ label, value }) {
  return (
    <div style={{ padding: 12, borderRadius: 12, background: "var(--a-surface)", border: "1px solid var(--a-border)" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--a-text-muted)" }}>{label}</div>
      <div style={{ marginTop: 6, fontWeight: 700, color: "var(--a-text)" }}>{value}</div>
    </div>
  );
}

function DetailGrid({ label, value }) {
  return (
    <div style={{ padding: 14, borderRadius: 14, border: "1px solid var(--a-border)", background: "var(--a-surface-raised)" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--a-text-muted)" }}>{label}</div>
      <div style={{ marginTop: 6, fontWeight: 700, color: "var(--a-text)" }}>{value}</div>
    </div>
  );
}

