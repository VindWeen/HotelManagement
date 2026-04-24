/* eslint-disable react-refresh/only-export-components */
import { NavLink } from "react-router-dom";

export const SERVICE_VIEW_STORAGE_KEY = "admin_services_view";

export const panelStyle = {
  background: "var(--a-surface)",
  borderRadius: 16,
  border: "1px solid var(--a-border)",
  boxShadow: "var(--a-shadow-sm)",
};

export const globalFontReset = `* { font-family: 'Manrope', sans-serif; }`;

export const inputStyle = {
  width: "100%",
  background: "var(--a-surface-raised)",
  border: "1.5px solid var(--a-border-strong)",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 14,
  fontWeight: 600,
  color: "var(--a-text)",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "'Manrope', sans-serif",
  transition: "all 0.2s",
};

export const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--a-text-muted)",
  marginBottom: 8,
};

export const statusFilterOptions = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Hiện" },
  { value: "inactive", label: "Đã ẩn" },
];

const TOAST_STYLES = {
  success: {
    bg: "var(--a-success-bg)",
    border: "var(--a-success-border)",
    text: "var(--a-success)",
    prog: "var(--a-success)",
    icon: "check_circle",
  },
  warning: {
    bg: "var(--a-warning-bg)",
    border: "var(--a-warning-border)",
    text: "var(--a-warning)",
    prog: "var(--a-warning)",
    icon: "warning",
  },
  error: {
    bg: "var(--a-error-bg)",
    border: "var(--a-error-border)",
    text: "var(--a-error)",
    prog: "var(--a-error)",
    icon: "error",
  },
  info: {
    bg: "var(--a-info-bg)",
    border: "var(--a-info-border)",
    text: "var(--a-info)",
    prog: "var(--a-info)",
    icon: "info",
  },
};

export function getIncludeInactive(statusFilter) {
  return statusFilter !== "active";
}

export function applyStatusFilter(rows, statusFilter) {
  if (statusFilter === "inactive") {
    return rows.filter((item) => !item.isActive);
  }

  if (statusFilter === "active") {
    return rows.filter((item) => item.isActive);
  }

  return rows;
}

export function ServiceAdminShell({
  view,
  title,
  subtitle,
  stats,
  filterContent,
  primaryAction,
  children,
}) {
  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        ${globalFontReset}
      `}</style>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              color: "var(--a-text-muted)",
            }}
          >
            Service Admin
          </p>
          <h2
            style={{
              margin: "4px 0 0",
              fontSize: 28,
              fontWeight: 800,
              color: "var(--a-text)",
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h2>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--a-text-muted)" }}>
            {subtitle}
          </p>
        </div>
        <div style={{ flexShrink: 0 }}>{primaryAction}</div>
      </div>

      <div style={{ ...panelStyle, padding: 10, marginBottom: 20 }}>
        <div
          style={{
            display: "inline-flex",
            background: "var(--a-surface-raised)",
            borderRadius: 16,
            padding: 6,
            gap: 6,
          }}
        >
                    <ServiceViewLink
            to="/admin/services/order"
            active={view === "order"}
            icon="receipt"
            label="Đơn dịch vụ"
          />
          <ServiceViewLink
            to="/admin/services/items"
            active={view === "items"}
            icon="room_service"
            label="Dịch vụ"
          />
          <ServiceViewLink
            to="/admin/services/categories"
            active={view === "categories"}
            icon="category"
            label="Nhóm dịch vụ"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {stats.map((stat) => (
          <div key={stat.label} style={{ ...panelStyle, padding: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    color: "var(--a-text-muted)",
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 26,
                    fontWeight: 800,
                    color: "var(--a-text)",
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: "var(--a-text-muted)",
                  }}
                >
                  {stat.description}
                </div>
              </div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: "var(--a-brand-bg)",
                  color: "var(--a-brand-ink)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section style={{ ...panelStyle, padding: 24, marginBottom: 24 }}>
        {filterContent}
      </section>

      {children}
    </div>
  );
}

function ServiceViewLink({ to, active, icon, label }) {
  return (
    <NavLink
      to={to}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        borderRadius: 12,
        textDecoration: "none",
        background: active ? "var(--a-primary)" : "transparent",
        color: active ? "var(--a-text-inverse)" : "var(--a-text-muted)",
        fontWeight: 800,
        transition: "all .15s",
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
        {icon}
      </span>
      <span>{label}</span>
    </NavLink>
  );
}

export function Modal({ open, title, description, onClose, children }) {
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
            <h3 style={{ margin: 0, fontSize: 22, color: "var(--a-text)" }}>
              {title}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--a-text-muted)" }}>
              {description || "Giao diện đồng bộ với admin hiện tại."}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--a-text-muted)",
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

export function StatusChip({ active, label }) {
  return (
    <span
      style={{
        padding: "5px 10px",
        borderRadius: 999,
        background: active ? "var(--a-success-bg)" : "var(--a-surface-bright)",
        color: active ? "var(--a-success)" : "var(--a-text-soft)",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: ".06em",
        border: "none",
      }}
    >
      {label || (active ? "Hoạt động" : "Đã ẩn")}
    </span>
  );
}

export function EmptyState({ label, icon }) {
  return (
    <div style={{ textAlign: "center", color: "var(--a-text-soft)" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 42 }}>
        {icon}
      </span>
      <p style={{ margin: "10px 0 0", fontWeight: 500 }}>{label}</p>
    </div>
  );
}

export function IconButton({ icon, title, onClick, danger = false }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="sub-card-p"
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
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
        {icon}
      </span>
    </button>
  );
}

export function FormFooter({ submitting, onClose }) {
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
          border: "1px solid var(--a-border-strong)",
          background: "var(--a-surface)",
          color: "var(--a-text-muted)",
          fontWeight: 600,
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
          fontWeight: 700,
          cursor: "pointer",
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </div>
  );
}

export function VisibilitySwitch({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className="btn-reset-p"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        border: "none",
        background: "transparent",
        padding: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        borderRadius: 999,
        outline: "none",
      }}
    >
      <div
        className="toggle-track-p"
        style={{
          position: "relative",
          width: 44,
          height: 24,
          borderRadius: 999,
          background: checked ? "var(--a-primary)" : "var(--a-border-strong)",
          transition: "all .2s ease",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 23 : 3,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "var(--a-surface)",
            transition: "all .2s ease",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </div>
      <span
        className="pure-text-p"
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: checked ? "var(--a-success)" : "var(--a-text-soft)",
          textTransform: "uppercase",
          letterSpacing: ".05em",
        }}
      >
        {checked ? "Hiện" : "Ẩn"}
      </span>
    </button>
  );
}

export function primaryButton(disabled) {
  return {
    background: disabled ? "var(--a-text-soft)" : "var(--a-primary)",
    color: "var(--a-text-inverse)",
    border: "none",
    borderRadius: 12,
    padding: "10px 22px",
    fontSize: 14,
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    boxShadow: disabled ? "none" : "var(--a-shadow-sm)",
    transition: "all 0.15s",
  };
}

export function ServiceToast({ id, msg, type = "success", dur = 4000, onDismiss }) {
  const s = TOAST_STYLES[type] || TOAST_STYLES.info;

  return (
    <div
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,.3)",
        pointerEvents: "auto",
        marginBottom: 10,
        animation: "toastIn .35s cubic-bezier(.22,1,.36,1) forwards",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "13px 13px 9px",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 19,
            flexShrink: 0,
            marginTop: 1,
            fontVariationSettings: "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20",
          }}
        >
          {s.icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              opacity: 0.5,
              marginBottom: 2,
            }}
          >
            Cập nhật hiển thị
          </div>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {msg}
          </p>
        </div>
        <button
          onClick={() => onDismiss(id)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            opacity: 0.4,
            padding: 2,
            color: "inherit",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            close
          </span>
        </button>
      </div>
      <div
        style={{
          margin: "0 12px 9px",
          height: 3,
          borderRadius: 9999,
          background: "rgba(255,255,255,.1)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 9999,
            background: s.prog,
            animation: `toastProgress ${dur}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

export function ServiceToastContainer({ toasts, onDismiss }) {
  return (
    <>
      <style>{`
        @keyframes toastProgress { from { width: 100%; } to { width: 0; } }
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-6px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          top: 24,
          right: 24,
          zIndex: 300,
          minWidth: 280,
          maxWidth: 360,
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <ServiceToast key={toast.id} {...toast} onDismiss={onDismiss} />
        ))}
      </div>
    </>
  );
}

export function ServicePagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
}) {
  if (totalItems <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
    const pageNumber = totalPages <= 5 ? index + 1 : Math.max(1, page - 2) + index;
    return pageNumber > totalPages ? null : pageNumber;
  }).filter(Boolean);

  return (
    <div
      style={{
        padding: "14px 20px",
        borderTop: "1px solid #f1f0ea",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
      }}
    >
      <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>
        {start}–{end} / {totalItems}
      </span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <PaginationButton
          label="chevron_left"
          icon
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        />
        {pageNumbers.map((pageNumber) => (
          <PaginationButton
            key={pageNumber}
            label={String(pageNumber)}
            active={pageNumber === page}
            onClick={() => onPageChange(pageNumber)}
          />
        ))}
        <PaginationButton
          label="chevron_right"
          icon
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        />
      </div>
    </div>
  );
}

function PaginationButton({ label, onClick, disabled = false, active = false, icon = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={active ? "" : "sub-card-p"}
      style={{
        minWidth: 32,
        height: 32,
        padding: icon ? 0 : "0 10px",
        borderRadius: 9,
        border: active ? "none" : "1px solid #ece7de",
        background: active ? "#4f645b" : "white",
        color: active ? "#ecfdf5" : "#6b7280",
        fontSize: 12,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon ? (
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          {label}
        </span>
      ) : (
        label
      )}
    </button>
  );
}
