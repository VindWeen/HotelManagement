import { printInvoiceDocument } from "../utils/printInvoice";

const INVOICE_PREVIEW_STATUS_LABELS = {
  Draft: "Nháp",
  Partially_Paid: "Thanh toán một phần",
  PartiallyPaid: "Thanh toán một phần",
};

const MODAL_OVERLAY_STYLE = {
  position: "fixed",
  inset: 0,
  background: "var(--a-overlay)",
  backdropFilter: "blur(6px)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "32px 16px",
  overflowY: "auto",
};

const MODAL_SURFACE_STYLE = {
  background: "var(--a-surface)",
  borderRadius: 24,
  width: "100%",
  maxWidth: 820,
  boxShadow: "var(--a-shadow-lg)",
  border: "1px solid var(--a-border)",
  overflow: "hidden",
};

const SECONDARY_BUTTON_STYLE = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "1.5px solid var(--a-border-strong)",
  background: "var(--a-surface)",
  fontWeight: 700,
  color: "var(--a-text-muted)",
  cursor: "pointer",
  fontSize: 14,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};

const PRIMARY_BUTTON_STYLE = {
  flex: 1,
  padding: "12px 0",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg,#1c2e26,#2d4a3e)",
  fontWeight: 700,
  color: "var(--a-text-inverse)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontSize: 14,
};

const INLINE_LIGHT_SPINNER = {
  width: 14,
  height: 14,
  border: "2px solid rgba(255,255,255,.35)",
  borderTopColor: "currentColor",
  borderRadius: "50%",
  animation: "spin .65s linear infinite",
};

export default function BookingInvoicePreviewModal({
  open,
  booking,
  invoice,
  loading,
  confirming,
  onConfirm,
  onClose,
}) {
  if (!open) return null;

  const invToPrint = invoice
    ? {
        ...invoice,
        booking,
        bookingCode: booking?.bookingCode || invoice.bookingCode,
        status: invoice.status || "Draft",
        id: invoice.id || "DRAFT",
        createdAt: invoice.createdAt || new Date(),
        outstandingAmount:
          invoice.outstandingAmount ??
          Math.max(
            0,
            (booking?.totalEstimatedAmount || 0) - (booking?.depositAmount || 0),
          ),
      }
    : null;

  const fc = (n) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(n ?? 0);
  const fd = (d) => (d ? new Date(d).toLocaleDateString("vi-VN") : "-");
  const thS = {
    padding: "10px 14px",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--a-text-muted)",
    textTransform: "uppercase",
    borderBottom: "1px solid var(--a-border)",
    textAlign: "left",
  };
  const tdS = {
    padding: "10px 14px",
    fontSize: 13,
    borderBottom: "1px solid var(--a-border)",
    color: "var(--a-text)",
  };
  const secL = {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--a-text-muted)",
    textTransform: "uppercase",
    letterSpacing: ".06em",
    marginBottom: 10,
  };

  const details = invToPrint?.bookingDetails || booking?.bookingDetails || [];
  const services = invToPrint?.serviceItems || [];
  const damages = invToPrint?.damageItems || [];
  const adjustments = invToPrint?.adjustments || [];
  const payments = invToPrint?.payments || [];
  const invoiceStatusLabel =
    INVOICE_PREVIEW_STATUS_LABELS[invToPrint?.status] ||
    invToPrint?.status ||
    "Nháp";
  const outstanding =
    invToPrint?.outstandingAmount ??
    Math.max(0, (booking?.totalEstimatedAmount || 0) - (booking?.depositAmount || 0));
  const isDraft = !invToPrint?.status || invToPrint.status === "Draft";
  const printMode = isDraft ? "draft" : "final";

  return (
    <div
      style={{ ...MODAL_OVERLAY_STYLE, zIndex: 2500 }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div style={MODAL_SURFACE_STYLE}>
        <div
          style={{
            background: "linear-gradient(135deg,#1c2e26,#2d4a3e)",
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                className="material-symbols-outlined"
                style={{
                  color: "#a7f3d0",
                  fontSize: 20,
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                receipt_long
              </span>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "#e7fef3", margin: 0 }}>
                {isDraft ? "Hóa đơn nháp" : "Hóa đơn"} - Xem trước khi xuất
              </h3>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: "rgba(167,243,208,.15)",
                  color: "#a7f3d0",
                  border: "1px solid rgba(167,243,208,.3)",
                  borderRadius: 9999,
                  padding: "2px 10px",
                }}
              >
                {invoiceStatusLabel}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "rgba(231,254,243,.5)", margin: "4px 0 0" }}>
              Booking #{booking?.bookingCode} • {booking?.guestName}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,.1)",
              border: "none",
              borderRadius: 8,
              padding: "6px 8px",
              cursor: "pointer",
              color: "#a7f3d0",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              close
            </span>
          </button>
        </div>

        <div style={{ padding: "20px 24px", maxHeight: "70vh", overflowY: "auto" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--a-text-muted)" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: "3px solid var(--a-border)",
                  borderTopColor: "var(--a-primary)",
                  borderRadius: "50%",
                  animation: "spin .65s linear infinite",
                  margin: "0 auto 12px",
                }}
              />
              <p style={{ fontSize: 13, margin: 0 }}>Đang tải hóa đơn...</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 18 }}>
                <div style={secL}>Chi tiết lưu trú</div>
                <div style={{ border: "1px solid var(--a-border)", borderRadius: 12, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--a-surface-raised)" }}>
                        <th style={thS}>Phòng</th>
                        <th style={thS}>Hạng</th>
                        <th style={thS}>Check-in</th>
                        <th style={thS}>Check-out</th>
                        <th style={{ ...thS, textAlign: "right" }}>Giá/đêm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ ...tdS, textAlign: "center", color: "var(--a-text-muted)" }}>
                            Không có dữ liệu
                          </td>
                        </tr>
                      ) : (
                        details.map((detail, index) => (
                          <tr key={index}>
                            <td style={tdS}>{detail.roomNumber || detail.roomName || "-"}</td>
                            <td style={tdS}>{detail.roomTypeName || "-"}</td>
                            <td style={tdS}>{fd(detail.checkInDate)}</td>
                            <td style={tdS}>{fd(detail.checkOutDate)}</td>
                            <td style={{ ...tdS, textAlign: "right", fontWeight: 700 }}>
                              {fc(detail.pricePerNight || 0)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={secL}>Dịch vụ đã sử dụng</div>
                <div style={{ border: "1px solid var(--a-border)", borderRadius: 12, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--a-surface-raised)" }}>
                        <th style={thS}>Phòng</th>
                        <th style={thS}>Dịch vụ</th>
                        <th style={{ ...thS, textAlign: "right" }}>SL</th>
                        <th style={{ ...thS, textAlign: "right" }}>Đơn giá</th>
                        <th style={{ ...thS, textAlign: "right" }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ ...tdS, textAlign: "center", color: "var(--a-text-muted)" }}>
                            Không có dịch vụ
                          </td>
                        </tr>
                      ) : (
                        services.map((service, index) => (
                          <tr key={index}>
                            <td style={tdS}>{service.roomNumber || "-"}</td>
                            <td style={tdS}>{service.serviceName || "-"}</td>
                            <td style={{ ...tdS, textAlign: "right" }}>{service.quantity || 0}</td>
                            <td style={{ ...tdS, textAlign: "right" }}>{fc(service.unitPrice || 0)}</td>
                            <td style={{ ...tdS, textAlign: "right", fontWeight: 700 }}>{fc(service.totalAmount || 0)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={secL}>Thất thoát / Thiết bị</div>
                <div style={{ border: "1px solid var(--a-border)", borderRadius: 12, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--a-surface-raised)" }}>
                        <th style={thS}>Phòng</th>
                        <th style={thS}>Vật tư</th>
                        <th style={{ ...thS, textAlign: "right" }}>SL</th>
                        <th style={{ ...thS, textAlign: "right" }}>Đơn giá</th>
                        <th style={{ ...thS, textAlign: "right" }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {damages.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ ...tdS, textAlign: "center", color: "var(--a-text-muted)" }}>
                            Không có thất thoát
                          </td>
                        </tr>
                      ) : (
                        damages.map((damage, index) => (
                          <tr key={index}>
                            <td style={tdS}>{damage.roomNumber || "-"}</td>
                            <td style={tdS}>{damage.itemName || "-"}</td>
                            <td style={{ ...tdS, textAlign: "right" }}>{damage.quantity || 0}</td>
                            <td style={{ ...tdS, textAlign: "right" }}>{fc(damage.penaltyAmount || 0)}</td>
                            <td style={{ ...tdS, textAlign: "right", fontWeight: 700, color: "var(--a-error)" }}>
                              {fc(damage.totalAmount || 0)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                <div>
                  <div style={secL}>Điều chỉnh</div>
                  <div style={{ border: "1px solid var(--a-border)", borderRadius: 12, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "var(--a-surface-raised)" }}>
                          <th style={thS}>Loại</th>
                          <th style={thS}>Lý do</th>
                          <th style={{ ...thS, textAlign: "right" }}>Số tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adjustments.length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ ...tdS, textAlign: "center", color: "var(--a-text-muted)" }}>
                              Không có
                            </td>
                          </tr>
                        ) : (
                          adjustments.map((adjustment, index) => (
                            <tr key={index}>
                              <td style={tdS}>{adjustment.adjustmentType === "Discount" ? "Giảm trừ" : "Phụ phí"}</td>
                              <td style={tdS}>{adjustment.reason || "-"}</td>
                              <td
                                style={{
                                  ...tdS,
                                  textAlign: "right",
                                  fontWeight: 700,
                                  color: adjustment.adjustmentType === "Discount" ? "var(--a-warning)" : "var(--a-error)",
                                }}
                              >
                                {adjustment.adjustmentType === "Discount" ? "-" : "+"}
                                {fc(adjustment.amount)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <div style={secL}>Lịch sử thanh toán</div>
                  <div style={{ border: "1px solid var(--a-border)", borderRadius: 12, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "var(--a-surface-raised)" }}>
                          <th style={thS}>Ngày</th>
                          <th style={thS}>Phương thức</th>
                          <th style={{ ...thS, textAlign: "right" }}>Số tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ ...tdS, textAlign: "center", color: "var(--a-text-muted)" }}>
                              Chưa có
                            </td>
                          </tr>
                        ) : (
                          payments.map((payment, index) => (
                            <tr key={index}>
                              <td style={tdS}>{fd(payment.paymentDate)}</td>
                              <td style={tdS}>{payment.paymentMethod || "-"}</td>
                              <td style={{ ...tdS, textAlign: "right", fontWeight: 700, color: "var(--a-success)" }}>
                                {fc(payment.amountPaid || 0)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "var(--a-surface-raised)",
                  borderRadius: 14,
                  padding: "16px 20px",
                  border: "1px solid var(--a-border)",
                }}
              >
                {[
                  ["Tiền phòng", fc(invToPrint?.totalRoomAmount || 0)],
                  ["Tiền dịch vụ", fc(invToPrint?.totalServiceAmount || 0)],
                  ["Bồi thường", fc(invToPrint?.totalDamageAmount || 0)],
                  ["Phụ phí", fc(invToPrint?.adjustmentAmount || 0)],
                  ["Chiết khấu voucher", `- ${fc(invToPrint?.discountAmount || 0)}`],
                  ["Giảm trừ thủ công", `- ${fc(invToPrint?.manualDiscountAmount || 0)}`],
                  ["Thuế", fc(invToPrint?.taxAmount || 0)],
                  ["Đã thanh toán", fc(invToPrint?.paidAmount || 0)],
                  ["Tiền cọc", fc(invToPrint?.depositAmount || 0)],
                  ["Tổng cần thu", fc(invToPrint?.finalTotal || 0)],
                ].map(([label, value], index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      color: label === "Tổng cần thu" ? "var(--a-text)" : "var(--a-text-muted)",
                      fontWeight: label === "Tổng cần thu" ? 800 : 400,
                      marginTop: label === "Tổng cần thu" ? 8 : 0,
                      paddingTop: label === "Tổng cần thu" ? 8 : 0,
                      borderTop: label === "Tổng cần thu" ? "1px solid var(--a-border)" : "none",
                      marginBottom: 6,
                    }}
                  >
                    <span>{label}</span>
                    <span style={{ fontWeight: 700, color: "var(--a-text)" }}>{value}</span>
                  </div>
                ))}
                <div style={{ height: 1, background: "var(--a-border)", margin: "10px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800 }}>
                  <span style={{ color: "var(--a-text)" }}>Còn lại</span>
                  <span style={{ color: outstanding > 0 ? "var(--a-error)" : "var(--a-success)" }}>
                    {outstanding > 0 ? fc(outstanding) : "Đã thanh toán đủ"}
                  </span>
                </div>
                {outstanding > 0 ? (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      background: "var(--a-warning-bg)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--a-warning)",
                      fontWeight: 600,
                    }}
                  >
                    Cần thanh toán thêm {fc(outstanding)} trước khi rời.
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

        <div style={{ padding: "14px 24px 20px", display: "flex", gap: 10, borderTop: "1px solid var(--a-border)" }}>
          <button onClick={onClose} style={{ ...SECONDARY_BUTTON_STYLE, flex: "0 0 auto" }}>
            Đóng
          </button>
          <button
            onClick={() => invToPrint && printInvoiceDocument(invToPrint, printMode)}
            disabled={loading || !invToPrint}
            style={{ ...SECONDARY_BUTTON_STYLE, flex: "0 0 auto", opacity: loading || !invToPrint ? 0.5 : 1 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              print
            </span>
            In hóa đơn
          </button>
          {isDraft ? (
            <button
              onClick={onConfirm}
              disabled={confirming || loading || !invToPrint}
              style={{
                ...PRIMARY_BUTTON_STYLE,
                opacity: confirming || loading || !invToPrint ? 0.7 : 1,
              }}
            >
              {confirming ? (
                <div style={INLINE_LIGHT_SPINNER} />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  verified
                </span>
              )}
              {confirming ? "Đang xử lý..." : "Xác nhận và in hóa đơn thật"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
