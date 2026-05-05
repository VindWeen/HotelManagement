import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { addInvoiceAdjustment, finalizeInvoice, getInvoiceDetail, removeInvoiceAdjustment } from "../../api/invoicesApi";
import { recordPayment } from "../../api/paymentsApi";
import { formatCurrency, formatDate } from "../../utils";
import { formatMoneyInput, parseMoneyInput } from "../../utils/moneyInput";
import { getInvoiceStatusLabel, getPaymentTypeLabel } from "../../utils/statusLabels";
import { printInvoiceDocument } from "../../utils/printInvoice";
import { useResponsiveAdmin } from "../../hooks/useResponsiveAdmin";
// ─── Thông báo ────────────────────────────────────────────────────────────────────
const TOAST_STYLES = {
  success: { bg: "var(--a-success-bg)", border: "var(--a-success-border)", text: "var(--a-success)", prog: "var(--a-success)", icon: "check_circle" },
  error:   { bg: "var(--a-error-bg)", border: "var(--a-error-border)", text: "var(--a-error)", prog: "var(--a-error)", icon: "error" },
  warning: { bg: "var(--a-warning-bg)", border: "var(--a-warning-border)", text: "var(--a-warning)", prog: "var(--a-warning)", icon: "warning" },
  info:    { bg: "var(--a-info-bg)", border: "var(--a-info-border)", text: "var(--a-info)", prog: "var(--a-info)", icon: "info" },
};

function Toast({ id, msg, type = "success", dur = 3500, onDismiss }) {
  const s = TOAST_STYLES[type] || TOAST_STYLES.info;
  useEffect(() => {
    const t = setTimeout(() => onDismiss(id), dur);
    return () => clearTimeout(t);
  }, [id, dur, onDismiss]);
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text, borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 28px rgba(0,0,0,.35)", pointerEvents: "auto", marginBottom: 10, minWidth: 280, animation: "toastIn .32s cubic-bezier(.22,1,.36,1) forwards" }}>
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

// ─── Nhãn trạng thái ─────────────────────────────────────────────────────────────
const InvoiceStatusBadge = ({ status }) => {
  const map = {
    Draft: { bg: "var(--a-info-bg)", text: "var(--a-info)", icon: "draft" },
    Ready_To_Collect: { bg: "var(--a-brand-bg)", text: "var(--a-brand-ink)", icon: "point_of_sale" },
    Unpaid: { bg: "var(--a-error-bg)", text: "var(--a-error)", icon: "pending_actions" },
    Partially_Paid: { bg: "var(--a-warning-bg)", text: "var(--a-warning)", icon: "hourglass_top" },
    Paid: { bg: "var(--a-success-bg)", text: "var(--a-success)", icon: "check_circle" },
    Refunded: { bg: "var(--a-surface-bright)", text: "var(--a-text-muted)", icon: "replay" }
  };
  const s = map[status] || {
    bg: "var(--a-surface-bright)",
    text: "var(--a-text-muted)",
    icon: "help",
  };
  return (
    <span className="badge-p" style={{ background: s.bg, color: s.text }}>
      <span className="material-symbols-outlined" style={{ fontSize: 13, fontWeight: 700 }}>{s.icon}</span>
      {getInvoiceStatusLabel(status)}
    </span>
  );
};

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useResponsiveAdmin();
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [form, setForm] = useState({
    amountPaid: "",
    paymentType: "Final_Settlement",
    paymentMethod: "Cash",
    transactionCode: "",
    note: "",
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
    adjustmentType: "Surcharge",
    amount: "",
    reason: "",
    note: "",
  });

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
      const res = await getInvoiceDetail(id);
      setInvoice(res.data?.data || null);
    } catch (e) {
      showToast(e?.response?.data?.message || "Không thể tải chi tiết hóa đơn.", "error");
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

    useEffect(() => {
    load();
  }, [load]);

  const location = useLocation();
  useEffect(() => {
    if (invoice && location.state?.autoPrint) {
      window.history.replaceState({}, document.title);
      setTimeout(() => {
        printInvoiceDocument(invoice, "final");
      }, 500);
    }
  }, [invoice, location.state]);

  const outstanding = useMemo(() => invoice?.outstandingAmount || 0, [invoice]);

  const submitPayment = async (e) => {
    e.preventDefault();
    const amountPaid = parseMoneyInput(form.amountPaid);
    if (amountPaid <= 0) {
      showToast("Vui lòng nhập số tiền hợp lệ", "error");
      return;
    }
    if (amountPaid > outstanding) {
      showToast(`Số tiền thanh toán không được vượt quá dư nợ (${formatCurrency(outstanding)}).`, "error");
      return;
    }
    try {
      await recordPayment({
        invoiceId: Number(id),
        paymentType: form.paymentType,
        paymentMethod: form.paymentMethod,
        amountPaid,
        transactionCode: form.transactionCode || null,
        note: form.note || null,
      });
      setForm((s) => ({ ...s, amountPaid: "", transactionCode: "", note: "" }));
      showToast("Đã lưu thanh toán thành công.", "success");
      await load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Không thể ghi nhận thanh toán.", "error");
    }
  };

  const runFinalize = async () => {
    try {
      await finalizeInvoice(id);
      showToast("Đã chốt hóa đơn thành công.", "success");
      await load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Không thể chốt hóa đơn.", "error");
    }
  };

  const submitAdjustment = async (e) => {
    e.preventDefault();
    if (parseMoneyInput(adjustmentForm.amount) <= 0 || !adjustmentForm.reason.trim()) {
      showToast("Vui lòng nhập số tiền và lý do điều chỉnh hợp lệ.", "error");
      return;
    }

    try {
      await addInvoiceAdjustment(id, {
        adjustmentType: adjustmentForm.adjustmentType,
        amount: parseMoneyInput(adjustmentForm.amount),
        reason: adjustmentForm.reason,
        note: adjustmentForm.note || null,
      });
      setAdjustmentForm({
        adjustmentType: "Surcharge",
        amount: "",
        reason: "",
        note: "",
      });
      showToast("Đã cập nhật điều chỉnh hóa đơn.", "success");
      await load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Không thể thêm điều chỉnh hóa đơn.", "error");
    }
  };

  const handleRemoveAdjustment = async (adjustmentId) => {
    try {
      await removeInvoiceAdjustment(id, adjustmentId);
      showToast("Đã xóa điều chỉnh hóa đơn.", "success");
      await load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Không thể xóa điều chỉnh hóa đơn.", "error");
    }
  };

  

  const inputStyle = {
    border: "1px solid var(--a-border)",
    background: "var(--a-surface-raised)",
    padding: "10px 14px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 600,
    color: "var(--a-text)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "Manrope, sans-serif",
  };
  const cardStyle = {
    background: "var(--a-surface)",
    borderRadius: 18,
    border: "1px solid var(--a-border)",
    boxShadow: "var(--a-shadow-sm)",
  };
  const sectionHeaderStyle = {
    padding: "20px 24px",
    borderBottom: "1px solid var(--a-border)",
    background: "var(--a-surface-raised)",
  };
  const tableHeadCellStyle = {
    padding: "14px 24px",
    fontSize: 12,
    fontWeight: 700,
    color: "var(--a-text-muted)",
    borderBottom: "1px solid var(--a-border)",
    textTransform: "uppercase",
    letterSpacing: ".05em",
  };
  const damageStatusBadgeStyle = (remainingToReplenish) => ({
    width: "fit-content",
    background:
      remainingToReplenish > 0 ? "var(--a-warning-bg)" : "var(--a-success-bg)",
    border: `1px solid ${
      remainingToReplenish > 0
        ? "var(--a-warning-border)"
        : "var(--a-success-border)"
    }`,
    color: remainingToReplenish > 0 ? "var(--a-warning)" : "var(--a-success)",
  });
  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 40 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', sans-serif; }
        @keyframes toastIn { from{transform:translateX(110%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes toastProgress { from{width:100%} to{width:0} }
        .table-row { transition: background 0.1s; }
        .table-row td { border-bottom: 1px solid var(--a-border); }
        .table-row:hover td { background: color-mix(in srgb, var(--a-primary) 6%, var(--a-surface)); }
        .badge-p { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; border: 1px solid transparent; }
        .action-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 22px; border-radius: 12px; font-size: 14px; font-weight: 800; background: var(--a-surface); color: var(--a-text); border: 1px solid var(--a-border); cursor: pointer; transition: all 0.15s; justify-content: center; }
        .action-btn:hover:not(:disabled) { border-color: var(--a-border-strong); color: var(--a-primary); background: var(--a-primary-muted); }
        .action-btn.primary { background: var(--a-primary); color: var(--a-text-inverse); border: 1px solid transparent; font-weight: 800; }
        .action-btn.primary:hover:not(:disabled) { background: var(--a-primary-hover); color: var(--a-text-inverse); box-shadow: var(--a-shadow-sm); }
        .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      {/* Khu vực thông báo */}
      <div style={{ position: "fixed", top: 24, right: 24, zIndex: 300, pointerEvents: "none", minWidth: 280 }}>
        {toasts.map((t) => <Toast key={t.id} {...t} onDismiss={dismissToast} />)}
      </div>

      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => navigate("/admin/invoices")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--a-text-muted)", fontSize: 13, fontWeight: 800, cursor: "pointer", padding: 0, marginBottom: 12 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Quay lại danh sách
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "var(--a-text)", letterSpacing: "-0.03em", margin: 0 }}>
            Chi tiết Hóa đơn
            {invoice && <span style={{ marginLeft: 14, color: "var(--a-text-soft)", fontWeight: 600, fontSize: 18 }}>#{invoice.id}</span>}
          </h2>
          {invoice && <InvoiceStatusBadge status={invoice.status} />}
        </div>
      </div>

      {!loading && invoice && (
        <div className="flex flex-col xl:flex-row gap-8">
          {/* Left Column: Form & Table */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
            <div style={{ ...cardStyle, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--a-text)", margin: "0 0 16px" }}>Phụ phí / Điều chỉnh hóa đơn</h3>
              <form onSubmit={submitAdjustment} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select value={adjustmentForm.adjustmentType} onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, adjustmentType: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="Surcharge">Phụ phí</option>
                    <option value="Discount">Giảm trừ thủ công</option>
                  </select>
                  <input
                    placeholder="Lý do, ví dụ: Phụ thu nhận phòng sớm"
                    value={adjustmentForm.reason}
                    onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, reason: e.target.value }))}
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Số tiền"
                    value={adjustmentForm.amount}
                    onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, amount: formatMoneyInput(e.target.value) }))}
                    style={inputStyle}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  <textarea
                    placeholder="Ghi chú thêm (tùy chọn)"
                    value={adjustmentForm.note}
                    onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, note: e.target.value }))}
                    style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
                  />
                  <button type="submit" className="action-btn primary" style={{ minWidth: 180 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
                    Thêm điều chỉnh
                  </button>
                </div>
              </form>
            </div>
            
            {/* Payment Form */}
            {invoice.status !== "Paid" && (
              <div style={{ ...cardStyle, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--a-text)", margin: "0 0 16px" }}>Ghi nhận thanh toán</h3>
                {(invoice.status === "Draft" || invoice.status === "Ready_To_Collect") && (
                  <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--a-info-border)", background: "var(--a-info-bg)", color: "var(--a-info)", fontSize: 13, fontWeight: 700 }}>
                    {invoice.status === "Draft"
                      ? "Hóa đơn này đang ở trạng thái nháp. Bạn có thể chốt hóa đơn trước hoặc thu tiền trực tiếp để hệ thống tự cập nhật trạng thái."
                      : "Hóa đơn đã sẵn sàng để thu tiền. Bạn có thể ghi nhận thanh toán từng phần hoặc thanh toán đủ."}
                  </div>
                )}
                <form onSubmit={submitPayment} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "var(--a-text-muted)", marginBottom: 6 }}>Số tiền (Dư nợ: {formatCurrency(outstanding)})</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="VD: 1.000.000"
                        value={form.amountPaid}
                        onChange={(e) => {
                          setForm({ ...form, amountPaid: formatMoneyInput(e.target.value) });
                        }}
                        required
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = "var(--a-primary)"}
                        onBlur={(e) => e.target.style.borderColor = "var(--a-border)"}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "var(--a-text-muted)", marginBottom: 6 }}>Loại thanh toán</label>
                      <select value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }} onFocus={(e) => e.target.style.borderColor = "var(--a-primary)"} onBlur={(e) => e.target.style.borderColor = "var(--a-border)"}>
                        <option value="Final_Settlement">Thanh toán cuối</option>
                        <option value="Refund">Hoàn tiền</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "var(--a-text-muted)", marginBottom: 6 }}>Phương thức</label>
                      <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }} onFocus={(e) => e.target.style.borderColor = "var(--a-primary)"} onBlur={(e) => e.target.style.borderColor = "var(--a-border)"}>
                        <option value="Cash">Tiền mặt (Cash)</option>
                        <option value="Momo">Momo</option>
                        <option value="VNPay_Mock">VNPay (Mock)</option>
                        <option value="Credit Card">Thẻ tín dụng</option>
                        <option value="Bank Transfer">Chuyển khoản (Bank)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "var(--a-text-muted)", marginBottom: 6 }}>Mã giao dịch</label>
                      <input placeholder="VD: VNP1234..." value={form.transactionCode} onChange={(e) => setForm({ ...form, transactionCode: e.target.value })} style={inputStyle} onFocus={(e) => e.target.style.borderColor = "var(--a-primary)"} onBlur={(e) => e.target.style.borderColor = "var(--a-border)"} />
                    </div>
                  </div>
                  <div>
                    <textarea placeholder="Ghi chú (Tùy chọn)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={{ ...inputStyle, minHeight: 80, resize: "none" }} onFocus={(e) => e.target.style.borderColor = "var(--a-primary)"} onBlur={(e) => e.target.style.borderColor = "var(--a-border)"} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                    <button type="submit" className="action-btn primary" disabled={!form.amountPaid}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span> Lưu thanh toán
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Payments Table */}
            <div style={{ ...cardStyle, overflow: "hidden" }}>
              <div style={sectionHeaderStyle}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--a-text)", margin: 0 }}>Danh sách điều chỉnh</h3>
              </div>
              {isMobile && (
                <div style={{ display: "grid", gap: 12, padding: 14 }}>
                  {(invoice.adjustments || []).length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", color: "var(--a-text-muted)", fontSize: 14 }}>Chưa có phụ phí hoặc giảm trừ thủ công.</div>
                  ) : (invoice.adjustments || []).map((item) => (
                    <article key={item.id} style={{ border: "1px solid var(--a-border)", borderRadius: 16, padding: 14, display: "grid", gap: 10, background: "var(--a-surface-soft)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 900, color: "var(--a-text)" }}>{item.reason}</div>
                          <div style={{ fontSize: 12, color: "var(--a-text-muted)", marginTop: 4 }}>{formatDate(item.createdAt)}</div>
                        </div>
                        <div style={{ fontWeight: 900, color: item.adjustmentType === "Discount" ? "var(--a-warning)" : "var(--a-error)" }}>
                          {item.adjustmentType === "Discount" ? "-" : "+"}{formatCurrency(item.amount)}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: item.adjustmentType === "Discount" ? "var(--a-warning)" : "var(--a-text-muted)" }}>
                        {item.adjustmentType === "Discount" ? "Giảm trừ thủ công" : "Phụ phí"}{item.note ? ` • ${item.note}` : ""}
                      </div>
                      <button type="button" className="action-btn" style={{ justifyContent: "center", padding: "9px 12px", fontSize: 12 }} onClick={() => handleRemoveAdjustment(item.id)}>
                        Xóa
                      </button>
                    </article>
                  ))}
                </div>
              )}
              <div data-invoice-list="adjustments" className="overflow-x-auto" style={{ display: isMobile ? "none" : "block" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr data-admin-table-head="true">
                    <th style={{ ...tableHeadCellStyle, textAlign: "left" }}>Thời gian</th>
                    <th style={{ ...tableHeadCellStyle, textAlign: "left" }}>Lý do</th>
                    <th style={{ ...tableHeadCellStyle, textAlign: "right" }}>Giá trị</th>
                    <th style={{ ...tableHeadCellStyle, textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.adjustments || []).length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: "32px 24px", textAlign: "center", color: "var(--a-text-muted)", fontSize: 14 }}>
                        Chưa có phụ phí hoặc giảm trừ thủ công.
                      </td>
                    </tr>
                  )}
                  {(invoice.adjustments || []).map((item) => (
                    <tr key={item.id} className="table-row">
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--a-text)" }}>{formatDate(item.createdAt).split(" ")[0]}</div>
                        <div style={{ fontSize: 11, color: "var(--a-text-soft)" }}>{formatDate(item.createdAt).split(" ")[1]}</div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--a-text)" }}>{item.reason}</div>
                        <div style={{ fontSize: 12, color: item.adjustmentType === "Discount" ? "var(--a-warning)" : "var(--a-text-muted)", marginTop: 4 }}>
                          {item.adjustmentType === "Discount" ? "Giảm trừ thủ công" : "Phụ phí"}
                          {item.note ? ` • ${item.note}` : ""}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: item.adjustmentType === "Discount" ? "var(--a-warning)" : "var(--a-error)" }}>
                          {item.adjustmentType === "Discount" ? "-" : "+"}{formatCurrency(item.amount)}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <button type="button" className="action-btn" style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => handleRemoveAdjustment(item.id)}>
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            <div style={{ ...cardStyle, overflow: "hidden" }}>
              <div style={sectionHeaderStyle}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--a-text)", margin: 0 }}>Dịch vụ đã sử dụng</h3>
              </div>
              {isMobile && (
                <div style={{ display: "grid", gap: 12, padding: 14 }}>
                  {(invoice.serviceItems || []).length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", color: "var(--a-text-muted)", fontSize: 14 }}>Không có dịch vụ phát sinh.</div>
                  ) : (invoice.serviceItems || []).map((item, index) => (
                    <article key={`${item.orderServiceId}-${item.serviceId}-${index}`} style={{ border: "1px solid var(--a-border)", borderRadius: 16, padding: 14, display: "grid", gap: 10, background: "var(--a-surface-soft)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 900, color: "var(--a-text)" }}>{item.serviceName || "-"}</div>
                          <div style={{ fontSize: 12, color: "var(--a-text-muted)", marginTop: 4 }}>Phòng {item.roomNumber || "-"} • {item.orderDate ? formatDate(item.orderDate) : "Chưa có thời gian"}</div>
                        </div>
                        <div style={{ fontWeight: 900, color: "var(--a-text)" }}>{formatCurrency(item.totalAmount || 0)}</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, color: "var(--a-text-muted)" }}>
                        <div>SL: <strong>{item.quantity || 0}</strong></div>
                        <div>Đơn giá: <strong>{formatCurrency(item.unitPrice || 0)}</strong></div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <div data-invoice-list="services" className="overflow-x-auto" style={{ display: isMobile ? "none" : "block" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr data-admin-table-head="true">
                    <th style={{ ...tableHeadCellStyle, textAlign: "left" }}>Phòng</th>
                    <th style={{ ...tableHeadCellStyle, textAlign: "left" }}>Dịch vụ</th>
                    <th style={{ ...tableHeadCellStyle, textAlign: "right" }}>SL</th>
                    <th style={{ ...tableHeadCellStyle, textAlign: "right" }}>Đơn giá</th>
                    <th style={{ ...tableHeadCellStyle, textAlign: "right" }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.serviceItems || []).length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: "32px 24px", textAlign: "center", color: "var(--a-text-muted)", fontSize: 14 }}>
                        Không có dịch vụ phát sinh.
                      </td>
                    </tr>
                  )}
                  {(invoice.serviceItems || []).map((item, index) => (
                    <tr key={`${item.orderServiceId}-${item.serviceId}-${index}`} className="table-row">
                      <td style={{ padding: "16px 24px", fontSize: 13, fontWeight: 700, color: "var(--a-text)" }}>{item.roomNumber || "-"}</td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--a-text)" }}>{item.serviceName || "-"}</div>
                        <div style={{ fontSize: 11, color: "var(--a-text-soft)", marginTop: 4 }}>{item.orderDate ? formatDate(item.orderDate) : "Chưa có thời gian"}</div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--a-text)" }}>{item.quantity || 0}</td>
                      <td style={{ padding: "16px 24px", textAlign: "right", fontSize: 13, color: "var(--a-text-muted)" }}>{formatCurrency(item.unitPrice || 0)}</td>
                      <td style={{ padding: "16px 24px", textAlign: "right", fontSize: 14, fontWeight: 800, color: "var(--a-text)" }}>{formatCurrency(item.totalAmount || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            <div style={{ ...cardStyle, overflow: "hidden" }}>
              <div style={sectionHeaderStyle}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--a-text)", margin: 0 }}>Thiết bị / thất thoát</h3>
              </div>
              {isMobile && (
                <div style={{ display: "grid", gap: 12, padding: 14 }}>
                  {(invoice.damageItems || []).length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", color: "var(--a-text-muted)", fontSize: 14 }}>Không có thất thoát hoặc thiết bị hư.</div>
                  ) : (invoice.damageItems || []).map((item) => (
                    <article key={item.id} style={{ border: "1px solid var(--a-border)", borderRadius: 16, padding: 14, display: "grid", gap: 10, background: "var(--a-surface-soft)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 900, color: "var(--a-text)" }}>{item.itemName || "-"}</div>
                          <div style={{ fontSize: 12, color: "var(--a-text-muted)", marginTop: 4 }}>Phòng {item.roomNumber || "-"} • SL {item.quantity || 0}</div>
                        </div>
                        <div style={{ fontWeight: 900, color: "var(--a-error)" }}>{formatCurrency(item.totalAmount || 0)}</div>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--a-text-muted)" }}>{item.description || "Không có ghi chú"}</div>
                      <span className="badge-p" style={damageStatusBadgeStyle(item.remainingToReplenish)}>
                        {item.remainingToReplenish > 0 ? `Còn thiếu ${item.remainingToReplenish}` : "Đã bổ sung đủ"}
                      </span>
                    </article>
                  ))}
                </div>
              )}
              <div data-invoice-list="damages" className="overflow-x-auto" style={{ display: isMobile ? "none" : "block" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr data-admin-table-head="true">
                    <th style={{ ...tableHeadCellStyle, textAlign: "left" }}>Phòng</th>
                    <th style={{ ...tableHeadCellStyle, textAlign: "left" }}>Vật tư</th>
                    <th style={{ ...tableHeadCellStyle, textAlign: "center" }}>Trạng thái</th>
                    <th style={{ ...tableHeadCellStyle, textAlign: "right" }}>SL</th>
                    <th style={{ ...tableHeadCellStyle, textAlign: "right" }}>Đơn giá</th>
                    <th style={{ ...tableHeadCellStyle, textAlign: "right" }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.damageItems || []).length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: "32px 24px", textAlign: "center", color: "var(--a-text-muted)", fontSize: 14 }}>
                        Không có thất thoát hoặc thiết bị hư.
                      </td>
                    </tr>
                  )}
                  {(invoice.damageItems || []).map((item) => (
                    <tr key={item.id} className="table-row">
                      <td style={{ padding: "16px 24px", fontSize: 13, fontWeight: 700, color: "var(--a-text)" }}>{item.roomNumber || "-"}</td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--a-text)" }}>{item.itemName || "-"}</div>
                        <div style={{ fontSize: 11, color: "var(--a-text-soft)", marginTop: 4 }}>{item.description || "Không có ghi chú"}</div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "center" }}>
                        <span
                          className="badge-p"
                          style={damageStatusBadgeStyle(item.remainingToReplenish)}
                        >
                          {item.remainingToReplenish > 0 ? `Còn thiếu ${item.remainingToReplenish}` : "Đã bổ sung đủ"}
                        </span>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--a-text)" }}>{item.quantity || 0}</td>
                      <td style={{ padding: "16px 24px", textAlign: "right", fontSize: 13, color: "var(--a-text-muted)" }}>{formatCurrency(item.penaltyAmount || 0)}</td>
                      <td style={{ padding: "16px 24px", textAlign: "right", fontSize: 14, fontWeight: 800, color: "var(--a-error)" }}>{formatCurrency(item.totalAmount || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            <div style={{ ...cardStyle, overflow: "hidden" }}>
              <div style={sectionHeaderStyle}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--a-text)", margin: 0 }}>Lịch sử thanh toán</h3>
              </div>
              {isMobile && (
                <div style={{ display: "grid", gap: 12, padding: 14 }}>
                  {(invoice.payments || []).length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", color: "var(--a-text-muted)", fontSize: 14 }}>Chưa có lịch sử giao dịch.</div>
                  ) : (invoice.payments || []).map((p) => (
                    <article key={p.id} style={{ border: "1px solid var(--a-border)", borderRadius: 16, padding: 14, display: "grid", gap: 8, background: "var(--a-surface-soft)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 900, color: "var(--a-text)" }}>{getPaymentTypeLabel(p.paymentType)}</div>
                          <div style={{ fontSize: 12, color: "var(--a-text-muted)", marginTop: 4 }}>{formatDate(p.paymentDate)} • {p.paymentMethod}</div>
                        </div>
                        <div style={{ fontWeight: 900, color: p.paymentType === "Refund" ? "var(--a-error)" : "var(--a-success)" }}>{formatCurrency(p.amountPaid)}</div>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--a-text-muted)", fontFamily: "monospace" }}>Mã GD: {p.transactionCode || "-"}</div>
                    </article>
                  ))}
                </div>
              )}
              <div data-invoice-list="payments" className="overflow-x-auto" style={{ display: isMobile ? "none" : "block" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr data-admin-table-head="true">
                    <th style={{ ...tableHeadCellStyle, textAlign: "left" }}>Thời gian</th>
                    <th style={{ ...tableHeadCellStyle, textAlign: "left" }}>Loại / PT</th>
                    <th style={{ ...tableHeadCellStyle, textAlign: "right" }}>Số tiền</th>
                    <th style={{ ...tableHeadCellStyle, textAlign: "center" }}>Mã Giao Dịch</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.payments || []).length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: "40px 24px", textAlign: "center", color: "var(--a-text-muted)", fontSize: 14 }}>
                        Chưa có lịch sử giao dịch.
                      </td>
                    </tr>
                  )}
                  {(invoice.payments || []).map((p) => (
                    <tr key={p.id} className="table-row">
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--a-text)" }}>{formatDate(p.paymentDate).split(' ')[0]}</div>
                        <div style={{ fontSize: 11, color: "var(--a-text-soft)" }}>{formatDate(p.paymentDate).split(' ')[1]}</div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--a-text)" }}>{getPaymentTypeLabel(p.paymentType)}</div>
                        <div style={{ fontSize: 12, color: "var(--a-text-muted)" }}>{p.paymentMethod}</div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: p.paymentType === "Refund" ? "var(--a-error)" : "var(--a-success)" }}>
                          {formatCurrency(p.amountPaid)}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "center" }}>
                        <div style={{ fontSize: 13, color: "var(--a-text-muted)", fontFamily: "monospace", letterSpacing: 0.5 }}>{p.transactionCode || "-"}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>

          <div className="w-full xl:w-[320px] shrink-0">
            <div style={{ ...cardStyle, padding: 24, position: "sticky", top: 24, background: "color-mix(in srgb, var(--a-surface) 88%, transparent)", backdropFilter: "blur(12px)" }}>
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, color: "var(--a-text-soft)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Liên kết Booking</p>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--a-text)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--a-primary)" }}>link</span>
                  {invoice.bookingCode || invoice.bookingId || "-"}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <button type="button" className="action-btn" style={{ padding: "12px 14px", fontSize: 13 }} onClick={() => printInvoiceDocument(invoice, "draft")}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>draft</span>
                  In bản nháp
                </button>
                <button type="button" className="action-btn primary" style={{ padding: "12px 14px", fontSize: 13 }} onClick={() => printInvoiceDocument(invoice, "final")}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>receipt_long</span>
                  In hóa đơn
                </button>
              </div>

              <div style={{ height: 1, background: "var(--a-border)", margin: "20px 0" }} />
              
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--a-text-muted)" }}>
                  <span>Tiền phòng:</span>
                  <span style={{ fontWeight: 700, color: "var(--a-text)" }}>{formatCurrency(invoice.totalRoomAmount)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--a-text-muted)" }}>
                  <span>Tiền dịch vụ:</span>
                  <span style={{ fontWeight: 700, color: "var(--a-text)" }}>{formatCurrency(invoice.totalServiceAmount)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--a-text-muted)" }}>
                  <span>Bồi thường thiết bị:</span>
                  <span style={{ fontWeight: 700, color: "var(--a-text)" }}>{formatCurrency(invoice.totalDamageAmount)}</span>
                </div>
                {invoice.adjustmentAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--a-error)" }}>
                    <span>Phụ phí thủ công:</span>
                    <span style={{ fontWeight: 700 }}>+{formatCurrency(invoice.adjustmentAmount)}</span>
                  </div>
                )}
                {invoice.discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--a-success)" }}>
                    <span>Chiết khấu:</span>
                    <span style={{ fontWeight: 700 }}>-{formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                {invoice.manualDiscountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--a-warning)" }}>
                    <span>Giảm trừ thủ công:</span>
                    <span style={{ fontWeight: 700 }}>-{formatCurrency(invoice.manualDiscountAmount)}</span>
                  </div>
                )}
                {invoice.taxAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--a-text-muted)" }}>
                    <span>Thuế:</span>
                    <span style={{ fontWeight: 700, color: "var(--a-text)" }}>{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: "var(--a-border)", margin: "20px 0", borderStyle: "dashed" }} />

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, color: "var(--a-text)", marginBottom: 12 }}>
                <span>Tổng cộng:</span>
                <span>{formatCurrency(invoice.finalTotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--a-success)", fontWeight: 700, marginBottom: 16 }}>
                <span>Đã thanh toán:</span>
                <span>{formatCurrency(invoice.paidAmount)}</span>
              </div>
              {invoice.depositAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--a-primary)", fontWeight: 700, marginBottom: 16 }}>
                  <span>Tiền cọc booking:</span>
                  <span>{formatCurrency(invoice.depositAmount)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, color: invoice.outstandingAmount > 0 ? "var(--a-error)" : "var(--a-text-muted)", padding: "12px 14px", background: invoice.outstandingAmount > 0 ? "var(--a-error-bg)" : "var(--a-surface-raised)", borderRadius: 12, border: `1px solid ${invoice.outstandingAmount > 0 ? "var(--a-error-border)" : "var(--a-border)"}` }}>
                <span>Dư nợ / Còn lại:</span>
                <span>{formatCurrency(invoice.outstandingAmount)}</span>
              </div>

              {invoice.status !== "Paid" && invoice.status !== "Refunded" && (
                <div style={{ marginTop: 24 }}>
                  <button className="action-btn primary" style={{ width: "100%", padding: "14px", fontSize: 15 }} onClick={runFinalize}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>verified</span> Chốt Hóa Đơn
                  </button>
                  <div style={{ fontSize: 12, textAlign: "center", color: "var(--a-text-soft)", marginTop: 8 }}>
                    Chỉ chốt (Finalize) khi khách đã thanh toán đủ hoặc không còn phát sinh giao dịch.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




