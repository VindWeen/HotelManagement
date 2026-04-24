import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getInvoices } from "../../api/invoicesApi";
import { useResponsiveAdmin } from "../../hooks/useResponsiveAdmin";
import { formatCurrency, formatDate } from "../../utils";
import { getInvoiceStatusLabel } from "../../utils/statusLabels";

const TOAST_STYLES = {
  success: {
    bg: "var(--a-success-bg)",
    border: "var(--a-success-border)",
    text: "var(--a-success)",
    prog: "var(--a-success)",
    icon: "check_circle",
  },
  error: {
    bg: "var(--a-error-bg)",
    border: "var(--a-error-border)",
    text: "var(--a-error)",
    prog: "var(--a-error)",
    icon: "error",
  },
  warning: {
    bg: "var(--a-warning-bg)",
    border: "var(--a-warning-border)",
    text: "var(--a-warning)",
    prog: "var(--a-warning)",
    icon: "warning",
  },
  info: {
    bg: "var(--a-info-bg)",
    border: "var(--a-info-border)",
    text: "var(--a-info)",
    prog: "var(--a-info)",
    icon: "info",
  },
};

function Toast({ id, msg, type = "success", dur = 3500, onDismiss }) {
  const s = TOAST_STYLES[type] || TOAST_STYLES.info;

  useEffect(() => {
    const t = setTimeout(() => onDismiss(id), dur);
    return () => clearTimeout(t);
  }, [dur, id, onDismiss]);

  return (
    <div
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 8px 28px rgba(0,0,0,.35)",
        pointerEvents: "auto",
        marginBottom: 10,
        minWidth: 280,
        animation: "toastIn .32s cubic-bezier(.22,1,.36,1) forwards",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "12px 12px 8px",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 18,
            flexShrink: 0,
            marginTop: 1,
            fontVariationSettings: "'FILL' 1",
          }}
        >
          {s.icon}
        </span>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.4,
            margin: 0,
            flex: 1,
          }}
        >
          {msg}
        </p>
        <button
          onClick={() => onDismiss(id)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            opacity: 0.4,
            color: "inherit",
            padding: 2,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            close
          </span>
        </button>
      </div>
      <div
        style={{
          margin: "0 12px 8px",
          height: 3,
          borderRadius: 9999,
          background: "rgba(255,255,255,.1)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            background: s.prog,
            animation: `toastProgress ${dur}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

function getInvoiceStatusTone(status) {
  switch (status) {
    case "Draft":
      return "info";
    case "Ready_To_Collect":
      return "brand";
    case "Unpaid":
      return "error";
    case "Partially_Paid":
      return "warning";
    case "Paid":
      return "success";
    default:
      return "neutral";
  }
}

function getStatusStyle(status) {
  switch (getInvoiceStatusTone(status)) {
    case "info":
      return {
        bg: "var(--a-info-bg)",
        border: "var(--a-info-border)",
        text: "var(--a-info)",
        icon: "draft",
      };
    case "brand":
      return {
        bg: "var(--a-brand-bg)",
        border: "var(--a-brand-border)",
        text: "var(--a-brand-ink)",
        icon: "point_of_sale",
      };
    case "error":
      return {
        bg: "var(--a-error-bg)",
        border: "var(--a-error-border)",
        text: "var(--a-error)",
        icon: "pending_actions",
      };
    case "warning":
      return {
        bg: "var(--a-warning-bg)",
        border: "var(--a-warning-border)",
        text: "var(--a-warning)",
        icon: "hourglass_top",
      };
    case "success":
      return {
        bg: "var(--a-success-bg)",
        border: "var(--a-success-border)",
        text: "var(--a-success)",
        icon: "check_circle",
      };
    default:
      return {
        bg: "var(--a-surface-bright)",
        border: "var(--a-border)",
        text: "var(--a-text-muted)",
        icon: "replay",
      };
  }
}

function InvoiceStatusBadge({ status }) {
  const s = getStatusStyle(status);

  return (
    <span
      className="admin-status-badge"
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
        {s.icon}
      </span>
      {getInvoiceStatusLabel(status)}
    </span>
  );
}

const shellCardStyle = {
  background: "var(--a-surface)",
  border: "1px solid var(--a-border)",
  borderRadius: 18,
  boxShadow: "var(--a-shadow-sm)",
};

const filterInputStyle = {
  width: "100%",
  minHeight: 44,
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid var(--a-border)",
  background: "var(--a-surface-raised)",
  color: "var(--a-text)",
  fontSize: 13,
  fontWeight: 600,
  outline: "none",
  cursor: "pointer",
};

const tableHeaderCellStyle = {
  padding: "16px 24px",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--a-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  borderBottom: "1px solid var(--a-border)",
};

export default function InvoiceListPage() {
  const { isMobile } = useResponsiveAdmin();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [status, setStatus] = useState("");

  const showToast = useCallback((msg, type = "success") => {
    const toastId = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id: toastId, msg, type }]);
  }, []);

  const dismissToast = useCallback((toastId) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInvoices({ page: 1, pageSize: 200, status });
      setRows(res.data?.data || []);
    } catch (e) {
      showToast(
        e?.response?.data?.message || "Không thể tải danh sách hóa đơn.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [showToast, status]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const finalTotal = rows.reduce((sum, item) => sum + (item.finalTotal || 0), 0);
    const outstanding = rows.reduce(
      (sum, item) => sum + (item.outstandingAmount || 0),
      0,
    );
    const paidCount = rows.filter((item) => item.status === "Paid").length;

    return { finalTotal, outstanding, paidCount };
  }, [rows]);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingInline: isMobile ? 4 : 0 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', sans-serif; }
        @keyframes toastIn { from{transform:translateX(110%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes toastProgress { from{width:100%} to{width:0} }
        .invoice-table-row td {
          border-bottom: 1px solid var(--a-border);
          transition: background-color .16s ease, border-color .16s ease;
        }
        .invoice-table-row:hover td {
          background: color-mix(in srgb, var(--a-primary) 6%, var(--a-surface));
        }
        .invoice-icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid var(--a-border);
          background: var(--a-surface-raised);
          color: var(--a-text-muted);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all .18s ease;
        }
        .invoice-icon-btn:hover {
          background: var(--a-primary-muted);
          color: var(--a-primary);
          border-color: var(--a-border-strong);
        }
        .invoice-action-btn {
          min-height: 42px;
          border-radius: 12px;
          border: 1px solid var(--a-border);
          background: var(--a-surface);
          color: var(--a-text);
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
        }
        .invoice-action-btn:hover:not(:disabled) {
          background: var(--a-primary-muted);
          color: var(--a-primary);
          border-color: var(--a-border-strong);
        }
        .invoice-action-btn.primary {
          background: var(--a-primary);
          color: var(--a-text-inverse);
          border-color: transparent;
        }
        .invoice-action-btn.primary:hover:not(:disabled) {
          background: var(--a-primary-hover);
          color: var(--a-text-inverse);
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          top: 24,
          right: 24,
          zIndex: 300,
          pointerEvents: "none",
          minWidth: 280,
        }}
      >
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onDismiss={dismissToast} />
        ))}
      </div>

      <section
        className="admin-card"
        style={{
          padding: isMobile ? 20 : 24,
          marginBottom: 20,
          display: "flex",
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between",
          gap: 16,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <div>
          <div className="admin-overline" style={{ marginBottom: 6 }}>
            Revenue Control
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--a-text)",
            }}
          >
            Quản lý hóa đơn
          </h2>
          <p
            className="admin-section-subtitle"
            style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.6 }}
          >
            Theo dõi tổng thu, dư nợ và trạng thái thanh toán trong cùng một giao diện.
          </p>
        </div>

        <button
          type="button"
          className="invoice-action-btn"
          onClick={load}
          style={{ width: isMobile ? "100%" : "auto" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            refresh
          </span>
          Làm mới
        </button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginBottom: 20 }}>
        <article className="admin-stat-card" data-intent="brand" style={{ padding: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div className="admin-overline" style={{ marginBottom: 8 }}>
                Tổng hóa đơn
              </div>
              <div className="admin-kpi-value" style={{ fontSize: 30, fontWeight: 800 }}>
                {rows.length}
              </div>
            </div>
            <div className="admin-stat-icon">
              <span className="material-symbols-outlined">receipt_long</span>
            </div>
          </div>
        </article>

        <article className="admin-stat-card" data-intent="success" style={{ padding: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div className="admin-overline" style={{ marginBottom: 8 }}>
                Tổng giá trị
              </div>
              <div className="admin-kpi-value" style={{ fontSize: 24, fontWeight: 800 }}>
                {formatCurrency(totals.finalTotal)}
              </div>
            </div>
            <div className="admin-stat-icon">
              <span className="material-symbols-outlined">payments</span>
            </div>
          </div>
        </article>

        <article className="admin-stat-card" data-intent="error" style={{ padding: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div className="admin-overline" style={{ marginBottom: 8 }}>
                Dư nợ cần thu
              </div>
              <div className="admin-kpi-value" style={{ fontSize: 24, fontWeight: 800 }}>
                {formatCurrency(totals.outstanding)}
              </div>
              <div
                className="admin-section-subtitle"
                style={{ marginTop: 8, fontSize: 12 }}
              >
                {totals.paidCount} hóa đơn đã thanh toán xong
              </div>
            </div>
            <div className="admin-stat-icon">
              <span className="material-symbols-outlined">account_balance_wallet</span>
            </div>
          </div>
        </article>
      </section>

      <section
        className="admin-card"
        style={{
          padding: isMobile ? 16 : 18,
          marginBottom: 20,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 12,
          alignItems: isMobile ? "stretch" : "center",
        }}
      >
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ ...filterInputStyle, width: isMobile ? "100%" : 240 }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Draft">Hóa đơn nháp</option>
          <option value="Ready_To_Collect">Sẵn sàng thu</option>
          <option value="Unpaid">Chưa thanh toán</option>
          <option value="Partially_Paid">Thanh toán một phần</option>
          <option value="Paid">Đã thanh toán</option>
          <option value="Refunded">Đã hoàn tiền</option>
        </select>

        <button
          type="button"
          className="invoice-action-btn"
          style={{ width: isMobile ? "100%" : "auto" }}
          onClick={() => setStatus("")}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            filter_alt_off
          </span>
          Xóa lọc
        </button>
      </section>

      <section className="admin-table-shell" style={shellCardStyle}>
        {isMobile ? (
          <div style={{ display: "grid", gap: 12, padding: 14 }}>
            {loading ? (
              <div
                className="admin-card-soft"
                style={{ padding: 28, textAlign: "center", color: "var(--a-text-muted)" }}
              >
                Đang tải danh sách hóa đơn...
              </div>
            ) : rows.length === 0 ? (
              <div
                className="admin-card-soft"
                style={{ padding: 28, textAlign: "center", color: "var(--a-text-muted)" }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 42,
                    marginBottom: 10,
                    opacity: 0.6,
                    display: "block",
                  }}
                >
                  search_off
                </span>
                Không tìm thấy hóa đơn nào
              </div>
            ) : (
              rows.map((item) => (
                <article
                  key={item.id}
                  className="admin-card-soft"
                  style={{ padding: 16, display: "grid", gap: 14 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 17,
                          fontWeight: 800,
                          color: "var(--a-text)",
                        }}
                      >
                        Hóa đơn #{item.id}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--a-text-muted)",
                          marginTop: 4,
                        }}
                      >
                        Booking {item.bookingCode || item.bookingId || "-"}
                      </div>
                    </div>
                    <InvoiceStatusBadge status={item.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className="admin-card-bright"
                      style={{ padding: 12, borderRadius: 14 }}
                    >
                      <div className="admin-overline" style={{ marginBottom: 6 }}>
                        Tổng tiền
                      </div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: "var(--a-success)",
                        }}
                      >
                        {formatCurrency(item.finalTotal)}
                      </div>
                    </div>

                    <div
                      className="admin-card-bright"
                      style={{ padding: 12, borderRadius: 14 }}
                    >
                      <div className="admin-overline" style={{ marginBottom: 6 }}>
                        Dư nợ
                      </div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color:
                            item.outstandingAmount > 0
                              ? "var(--a-error)"
                              : "var(--a-text-muted)",
                        }}
                      >
                        {formatCurrency(item.outstandingAmount)}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--a-text-muted)",
                      fontWeight: 700,
                    }}
                  >
                    Tạo lúc {formatDate(item.createdAt)}
                  </div>

                  <button
                    type="button"
                    className="invoice-action-btn primary"
                    onClick={() => navigate(`/admin/invoices/${item.id}`)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      visibility
                    </span>
                    Xem chi tiết
                  </button>
                </article>
              ))
            )}
          </div>
        ) : (
          <table>
            <thead>
              <tr data-admin-table-head="true">
                <th style={{ ...tableHeaderCellStyle, textAlign: "left" }}>ID hóa đơn</th>
                <th style={{ ...tableHeaderCellStyle, textAlign: "left" }}>Mã booking</th>
                <th style={{ ...tableHeaderCellStyle, textAlign: "right" }}>Tổng tiền</th>
                <th style={{ ...tableHeaderCellStyle, textAlign: "right" }}>Dư nợ</th>
                <th style={{ ...tableHeaderCellStyle, textAlign: "center" }}>Trạng thái</th>
                <th style={{ ...tableHeaderCellStyle, textAlign: "right" }}>Ngày tạo</th>
                <th style={{ ...tableHeaderCellStyle, textAlign: "center" }}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "48px 24px",
                      textAlign: "center",
                      color: "var(--a-text-muted)",
                    }}
                  >
                    Đang tải danh sách hóa đơn...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "48px 24px",
                      textAlign: "center",
                      color: "var(--a-text-muted)",
                    }}
                  >
                    Không tìm thấy hóa đơn nào
                  </td>
                </tr>
              ) : (
                rows.map((item) => (
                  <tr key={item.id} className="invoice-table-row">
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--a-text)" }}>
                        #{item.id}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "var(--a-text-muted)",
                        }}
                      >
                        {item.bookingCode || item.bookingId || "-"}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "var(--a-success)",
                        }}
                      >
                        {formatCurrency(item.finalTotal)}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color:
                            item.outstandingAmount > 0
                              ? "var(--a-error)"
                              : "var(--a-text-muted)",
                        }}
                      >
                        {formatCurrency(item.outstandingAmount)}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "center" }}>
                      <InvoiceStatusBadge status={item.status} />
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--a-text)" }}>
                        {formatDate(item.createdAt).split(" ")[0]}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--a-text-soft)",
                          marginTop: 2,
                        }}
                      >
                        {formatDate(item.createdAt).split(" ")[1]}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "center" }}>
                      <button
                        type="button"
                        className="invoice-icon-btn"
                        title="Xem chi tiet"
                        onClick={() => navigate(`/admin/invoices/${item.id}`)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          visibility
                        </span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
