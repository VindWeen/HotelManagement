// src/pages/admin/RolePermissionPage.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { getRoles, getRoleById, assignPermission } from "../../api/rolesApi";
import { getPermissions } from "../../api/permissionsApi";
import { useAdminAuthStore } from "../../store/adminAuthStore";
import { useResponsiveAdmin } from "../../hooks/useResponsiveAdmin";

const inferModuleName = (permissionCode) => {
  if (permissionCode.includes("ROLE")) return "Role";
  if (permissionCode.includes("USER")) return "User";
  if (permissionCode.includes("ROOM") || permissionCode.includes("INVENTORY"))
    return "Room";
  if (permissionCode.includes("BOOKING")) return "Booking";
  if (permissionCode.includes("INVOICE")) return "Billing";
  if (permissionCode.includes("SERVICE")) return "Service";
  if (permissionCode.includes("REPORT")) return "Report";
  if (permissionCode.includes("CONTENT")) return "CMS";
  return "System";
};

const PERMISSION_LABELS = {
  VIEW_DASHBOARD: "Xem bảng điều khiển",
  MANAGE_USERS: "Quản lý người dùng",
  CREATE_USERS: "Tạo người dùng",
  VIEW_USERS: "Xem người dùng",
  MANAGE_ROLES: "Quản lý vai trò",
  VIEW_ROLES: "Xem vai trò",
  EDIT_ROLES: "Chỉnh sửa phân quyền",
  MANAGE_ROOMS: "Quản lý phòng",
  MANAGE_INVENTORY: "Quản lý vật tư",
  MANAGE_BOOKINGS: "Quản lý booking",
  MANAGE_INVOICES: "Quản lý hóa đơn",
  MANAGE_SERVICES: "Quản lý dịch vụ",
  VIEW_REPORTS: "Xem báo cáo",
  MANAGE_CONTENT: "Quản lý nội dung",
};

const getPermissionLabel = (permission) =>
  PERMISSION_LABELS[permission.permissionCode] ||
  permission.name ||
  permission.permissionCode;

// â”€â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TOAST_STYLES = {
  success: { bg: "var(--a-success-bg)", border: "var(--a-success-border)", text: "var(--a-success)", prog: "var(--a-success)", icon: "check_circle" },
  error: { bg: "var(--a-error-bg)", border: "var(--a-error-border)", text: "var(--a-error)", prog: "var(--a-error)", icon: "error" },
  warning: { bg: "var(--a-warning-bg)", border: "var(--a-warning-border)", text: "var(--a-warning)", prog: "var(--a-warning)", icon: "warning" },
  info: { bg: "var(--a-info-bg)", border: "var(--a-info-border)", text: "var(--a-info)", prog: "var(--a-info)", icon: "info" },
};

const PRIMARY_BUTTON = {
  background: "var(--a-emphasis-bg)",
  color: "var(--a-emphasis-text)",
  border: "none",
  borderRadius: 12,
  padding: "10px 22px",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  boxShadow: "var(--a-shadow-sm)",
  transition: "all 0.15s",
};

const SECONDARY_BUTTON = {
  background: "var(--a-surface)",
  color: "var(--a-text-muted)",
  border: "1.5px solid var(--a-border-strong)",
  borderRadius: 12,
  padding: "10px 22px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.15s",
};

function Toast({ id, msg, type = "success", dur = 3500, onDismiss }) {
  const s = TOAST_STYLES[type] || TOAST_STYLES.info;
  useEffect(() => {
    const t = setTimeout(() => onDismiss(id), dur);
    return () => clearTimeout(t);
  }, [id, dur, onDismiss]);
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
        animation: "toastIn .32s cubic-bezier(.22,1,.36,1) forwards",
        minWidth: 280,
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

function PermissionCheckbox({
  checked,
  indeterminate = false,
  disabled = false,
  onChange,
  size = 17,
}) {
  const isActive = checked || indeterminate;

  return (
    <span
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          margin: 0,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        className="checkbox-p"
      />
      <span
        style={{
          width: size,
          height: size,
          borderRadius: 4,
          border: `1.5px solid ${isActive ? "#10b981" : "rgba(255,255,255,0.2)"}`,
          background: isActive ? "#10b981" : "transparent",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--a-text-inverse)",
          boxShadow: isActive ? "inset 0 0 0 1px rgba(255,255,255,0.08)" : "none",
          opacity: disabled ? 0.65 : 1,
          transition: "all .18s ease",
        }}
      >
        {indeterminate ? (
          <span
            style={{
              width: Math.max(8, size - 7),
              height: 2,
              borderRadius: 9999,
              background: "var(--a-text-inverse)",
              display: "block",
            }}
          />
        ) : checked ? (
          <span
            className="material-symbols-outlined"
            style={{ fontSize: Math.max(12, size - 4), fontVariationSettings: "'FILL' 1" }}
          >
            check
          </span>
        ) : null}
      </span>
    </span>
  );
}

// â”€â”€â”€ Role color dots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ROLE_COLORS = {
  Admin: "#7c3aed",
  Manager: "#059669",
  Receptionist: "#2563eb",
  Accountant: "#64748b",
  Housekeeping: "#d97706",
  Security: "#ea580c",
  Chef: "#dc2626",
  Waiter: "#ec4899",
  "IT Support": "#0891b2",
  Guest: "#9ca3af",
};

function getRoleColor(name) {
  return ROLE_COLORS[name] || "var(--a-primary)";
}

function isProtectedRole(name) {
  return name === "Admin" || name === "Guest";
}

// â”€â”€â”€ Skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SkeletonRows() {
  return Array.from({ length: 5 }).map((_, i) => (
    <tr key={i}>
      <td style={{ padding: "20px 28px" }}>
        <div className="skel" style={{ width: 72, height: 14 }} />
      </td>
      <td style={{ padding: "20px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            className="skel"
            style={{ width: 10, height: 10, borderRadius: "50%" }}
          />
          <div className="skel" style={{ width: 110, height: 14 }} />
        </div>
      </td>
      <td style={{ padding: "20px 28px" }}>
        <div className="skel" style={{ width: 200, height: 13 }} />
      </td>
      <td style={{ padding: "20px 28px", textAlign: "right" }}>
        <div
          className="skel"
          style={{ width: 90, height: 32, borderRadius: 8, marginLeft: "auto" }}
        />
      </td>
    </tr>
  ));
}

// â”€â”€â”€ Permission Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PermissionModal({
  role,
  initialPerms,
  permissionsCatalog,
  canEdit,
  onClose,
  onSaved,
  showToast,
}) {
  const [currentPerms] = useState(initialPerms || []);
  const canEditRole = canEdit && !isProtectedRole(role?.name);
  const [checked, setChecked] = useState(() => {
    const map = {};
    const hasManageRoles = (initialPerms || []).some(
      (permission) => permission.permissionCode === "MANAGE_ROLES",
    );
    permissionsCatalog.forEach((p) => {
      map[p.id] =
        (initialPerms || []).some(
          (cp) => cp.permissionCode === p.permissionCode || cp.id === p.id,
        ) ||
        (hasManageRoles &&
          (p.permissionCode === "VIEW_ROLES" ||
            p.permissionCode === "EDIT_ROLES"));
    });
    return map;
  });
  const [saving, setSaving] = useState(false);

  const getCheckedByCode = (map, code) =>
    permissionsCatalog.some(
      (permission) => permission.permissionCode === code && map[permission.id],
    );

  const setCheckedByCode = (map, code, value) => {
    permissionsCatalog.forEach((permission) => {
      if (permission.permissionCode === code) {
        map[permission.id] = value;
      }
    });
  };

  const syncRolePermissionDependency = (map) => {
    const hasManageRoles = getCheckedByCode(map, "MANAGE_ROLES");
    if (hasManageRoles) {
      setCheckedByCode(map, "VIEW_ROLES", true);
      setCheckedByCode(map, "EDIT_ROLES", true);
      return map;
    }

    const hasView = getCheckedByCode(map, "VIEW_ROLES");
    const hasEdit = getCheckedByCode(map, "EDIT_ROLES");
    if (!hasView || !hasEdit) {
      setCheckedByCode(map, "MANAGE_ROLES", false);
    }
    return map;
  };

  const toggle = (id) =>
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      const permission = permissionsCatalog.find((item) => item.id === id);
      if (!permission) return next;

      const code = permission.permissionCode;
      if (code === "MANAGE_ROLES") {
        const enabled = !!next[id];
        setCheckedByCode(next, "VIEW_ROLES", enabled);
        setCheckedByCode(next, "EDIT_ROLES", enabled);
        return syncRolePermissionDependency(next);
      }

      if (code === "VIEW_ROLES" || code === "EDIT_ROLES") {
        return syncRolePermissionDependency(next);
      }

      return next;
    });

  const grouped = useMemo(() => {
    const map = {};
    permissionsCatalog.forEach((p) => {
      if (!map[p.moduleName]) map[p.moduleName] = [];
      map[p.moduleName].push(p);
    });
    return map;
  }, [permissionsCatalog]);

  const allPermissionIds = useMemo(
    () => permissionsCatalog.map((p) => p.id),
    [permissionsCatalog],
  );

  const selectedCount = useMemo(
    () =>
      allPermissionIds.reduce((count, id) => count + (checked[id] ? 1 : 0), 0),
    [allPermissionIds, checked],
  );
  const allChecked =
    allPermissionIds.length > 0 && selectedCount === allPermissionIds.length;
  const partiallyChecked = selectedCount > 0 && !allChecked;

  const toggleAll = () =>
    setChecked((prev) => {
      const enableAll = !allChecked;
      const next = { ...prev };
      allPermissionIds.forEach((id) => {
        next[id] = enableAll;
      });
      return syncRolePermissionDependency(next);
    });

  const toggleModule = (modulePerms) =>
    setChecked((prev) => {
      const isModuleFullyChecked = modulePerms.every((perm) => !!prev[perm.id]);
      const next = { ...prev };
      modulePerms.forEach((perm) => {
        next[perm.id] = !isModuleFullyChecked;
      });
      return syncRolePermissionDependency(next);
    });

  const handleSave = async () => {
    setSaving(true);

    try {
      const promises = [];
      permissionsCatalog.forEach((p) => {
        const shouldHave = !!checked[p.id];
        const hasNow = currentPerms.some(
          (cp) => cp.permissionCode === p.permissionCode || cp.id === p.id,
        );
        if (shouldHave !== hasNow) {
          promises.push(assignPermission(role.id, p.id, shouldHave));
        }
      });
      await Promise.all(promises);
      showToast(
        `Đã cập nhật quyền cho vai trò "${role.name}" thành công.`,
        "success",
      );
      onSaved();
      onClose();
    } catch (e) {
      showToast(e?.response?.data?.message || "Cập nhật thất bại.", "error");
    } finally {
      setSaving(false);
    }
  };

  const moduleLabels = {
    System: "Hệ thống",
    User: "Người dùng",
    Role: "Vai trò",
    Room: "Phòng & Vật tư",
    Booking: "Booking",
    Billing: "Thanh toán",
    Service: "Dịch vụ",
    Report: "Báo cáo",
    CMS: "Nội dung",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--a-overlay)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="primary-card-p"
        style={{
          background: "var(--a-surface)",
          borderRadius: 20,
          width: "100%",
          maxWidth: 540,
          boxShadow: "var(--a-shadow-lg)",
          animation: "modalIn .25s cubic-bezier(.22,1,.36,1)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 28px 18px",
            borderBottom: "1px solid var(--a-border)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "inherit",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Cấu hình quyền hạn
            </h3>
            <p
              style={{
                fontSize: 12,
                color: "inherit",
                opacity: 0.6,
                margin: "4px 0 0",
                fontWeight: 500,
              }}
            >
              Vai trò:{" "}
              <span style={{ color: getRoleColor(role.name), fontWeight: 700 }}>
                {role.name}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              color: "var(--a-text-soft)",
              display: "flex",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20 }}
            >
              close
            </span>
          </button>
        </div>

        {/* Body */}
        <div
          style={{ padding: "20px 28px 0", maxHeight: 440, overflowY: "auto" }}
        >
          <label
            className="sub-card-p"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: 12,
              border: "1.5px solid var(--a-border-strong)",
              background: "var(--a-surface-raised)",
              cursor: canEditRole ? "pointer" : "not-allowed",
              userSelect: "none",
            }}
          >
            <PermissionCheckbox
              checked={allChecked}
              indeterminate={partiallyChecked}
              disabled={!canEditRole}
              onChange={toggleAll}
              size={17}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: "inherit" }}>
              Tất cả quyền
            </span>
          </label>

          {isProtectedRole(role?.name) && (
            <div
              style={{
                marginBottom: 16,
                padding: "10px 14px",
                borderRadius: 12,
                background: "var(--a-warning-bg)",
                border: "1px solid var(--a-warning-border)",
                color: "var(--a-warning)",
                fontSize: 12,
                lineHeight: 1.6,
                fontWeight: 600,
              }}
            >
              Vai trò hệ thống như Admin và Guest đang được khóa phân quyền trực tiếp để tránh lệch quyền nên.
            </div>
          )}
          {Object.entries(grouped).map(([module, perms]) => (
            <div key={module} style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <PermissionCheckbox
                  checked={
                    perms.length > 0 && perms.every((p) => !!checked[p.id])
                  }
                  indeterminate={
                    perms.reduce(
                      (count, permission) =>
                        count + (checked[permission.id] ? 1 : 0),
                      0,
                    ) > 0 &&
                    perms.reduce(
                      (count, permission) =>
                        count + (checked[permission.id] ? 1 : 0),
                      0,
                    ) < perms.length
                  }
                  disabled={!canEditRole}
                  onChange={() => toggleModule(perms)}
                  size={16}
                />
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: ".12em",
                    textTransform: "uppercase",
                    color: "var(--a-text-soft)",
                    margin: 0,
                  }}
                >
                  {moduleLabels[module] || module}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {perms.map((p) => (
                  <label
                    key={p.id}
                    className="sub-card-p"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: checked[p.id]
                        ? "rgba(16,185,129,.1)"
                        : "var(--a-surface-raised)",
                      border: `1.5px solid ${checked[p.id] ? "var(--a-success-border)" : "var(--a-border-strong)"}`,
                      cursor: canEditRole ? "pointer" : "not-allowed",
                      transition: "all .15s",
                      userSelect: "none",
                    }}
                  >
                    <PermissionCheckbox
                      checked={!!checked[p.id]}
                      disabled={!canEditRole}
                      onChange={() => toggle(p.id)}
                      size={17}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: checked[p.id] ? "var(--a-success)" : "inherit",
                        lineHeight: 1.3,
                      }}
                    >
                      {p.displayNameVi || getPermissionLabel(p)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 28px 24px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            onClick={onClose}
            className="sub-card-p"
            style={{
              padding: "10px 22px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              background: "none",
              border: "1.5px solid var(--a-border-strong)",
              color: "var(--a-text-muted)",
              cursor: "pointer",
            }}
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !canEditRole}
            style={{
              padding: "10px 22px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              background: "var(--a-emphasis-bg)",
              color: "var(--a-emphasis-text)",
              border: "none",
              cursor: canEditRole ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: 8,
              opacity: saving || !canEditRole ? 0.6 : 1,
            }}
          >
            {saving && (
              <div
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid color-mix(in srgb, var(--a-emphasis-text) 35%, transparent)",
                  borderTopColor: "var(--a-emphasis-text)",
                  borderRadius: "50%",
                  animation: "spin .65s linear infinite",
                }}
              />
            )}
            Cập nhật
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function RolePermissionPage() {
  const { isMobile } = useResponsiveAdmin();
  const { permissions } = useAdminAuthStore();

  const [roles, setRoles] = useState([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedRolePerms, setSelectedRolePerms] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const showToast = useCallback((msg, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, type }]);
  }, []);

  const dismissToast = useCallback(
    (id) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    [],
  );

  const loadRoles = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const [rolesRes, permissionsRes] = await Promise.all([
          getRoles(),
          getPermissions(),
        ]);
        setRoles(rolesRes.data?.data || []);
        setPermissionsCatalog(
          (permissionsRes.data?.data || []).map((p) => ({
            ...p,
            moduleName: inferModuleName(p.permissionCode),
            displayNameVi: getPermissionLabel(p),
          })),
        );
      } catch {
        showToast("Không thể tải dữ liệu phân quyền.", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleRefresh = () => loadRoles(true);

  // Fetch trước khi mở modal để tránh flash skeleton
  const openPermission = async (role) => {
    try {
      const res = await getRoleById(role.id);
      setSelectedRolePerms(res.data?.permissions || []);
      setSelectedRole(role);
    } catch {
      showToast("Không thể tải quyền của vai trò.", "error");
    }
  };

  const totalPages = Math.max(1, Math.ceil(roles.length / pageSize));
  const paginatedRoles = roles.slice((page - 1) * pageSize, page * pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, roles.length);

  const hasPermission = (code) =>
    permissions.some(
      (p) =>
        (typeof p === "string" && p === code) ||
        (typeof p === "object" && p.permissionCode === code),
    );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', sans-serif; }

        .skel { background:linear-gradient(90deg,rgba(0,0,0,0.05) 25%,rgba(0,0,0,0.1) 50%,rgba(0,0,0,0.05) 75%); background-size:600px; animation:shimmer 1.4s infinite; border-radius:6px; height:13px; }
        .fade-row { animation:fadeRow .2s ease forwards; }

        @keyframes fadeRow { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin360 { to{transform:rotate(360deg)} }
        @keyframes toastIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes toastProgress { from{width:100%} to{width:0} }

        .perm-btn {
            display:inline-flex; align-items:center; gap:6px;
            padding:8px 16px; border-radius:10px; font-size:13px; font-weight:700;
            background:var(--a-brand-bg); color:var(--a-brand-ink); border:1.5px solid var(--a-brand-border);
            cursor:pointer; transition:all .15s; font-family:'Manrope',sans-serif;
        }
        .perm-btn:hover { background:var(--a-primary); color:var(--a-text-inverse); border-color:var(--a-primary); }

        .pg-btn { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:600; color:var(--a-text-muted); opacity:0.8; background:transparent; border:none; cursor:pointer; transition:all .15s; font-family:'Manrope',sans-serif; }
        .pg-btn:hover:not(:disabled) { background:var(--a-surface-raised); opacity:1; }
        .pg-btn.active { background:var(--a-primary); color:var(--a-text-inverse); font-weight:700; cursor:default; opacity:1; }
        .pg-btn:disabled { opacity:.2; cursor:not-allowed; }

        tr:hover td { background:color-mix(in srgb, var(--a-primary) 6%, var(--a-surface)) !important; }
        .table-head { background:var(--a-surface-raised); border-bottom:1.5px solid var(--a-border); }
        .table-cell { border-bottom:1px solid var(--a-divider); padding:16px 20px; }
            `}</style>

      {/* Khu v?c thĂ´ng bĂ¡o */}
      <div
        style={{
          position: "fixed",
          top: 24,
          right: 24,
          zIndex: 300,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onDismiss={dismissToast} />
        ))}
      </div>

      {/* Permission Modal */}
      {selectedRole && (
        <PermissionModal
          role={selectedRole}
          initialPerms={selectedRolePerms}
          permissionsCatalog={permissionsCatalog}
          canEdit={hasPermission("EDIT_ROLES")}
          onClose={() => {
            setSelectedRole(null);
            setSelectedRolePerms([]);
          }}
          onSaved={() => loadRoles()}
          showToast={showToast}
        />
      )}

      {/* Content Area */}
      <div style={{ width: "100%", maxWidth: 1440, margin: "0 auto" }}>
        {/* Page header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 32,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "var(--a-text)",
                letterSpacing: "-0.03em",
                margin: "0 0 6px",
              }}
            >
              Quản lý vai trò &amp; Quyền (RBAC)
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "inherit",
                opacity: 0.6,
                margin: 0,
                maxWidth: 520,
              }}
            >
              Phân định vai trò và gán quyền hạn truy cập cho từng bộ phận.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ ...SECONDARY_BUTTON, height: 42, gap: 8, width: isMobile ? "100%" : "auto", justifyContent: "center", whiteSpace: "nowrap" }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 18,
                animation: refreshing ? "spin360 .8s linear infinite" : "none",
              }}
            >
              refresh
            </span>
            Làm mới
          </button>
        </div>

        {/* Table card */}
        <div
          className="primary-card-p"
          style={{
            background: "var(--a-surface)",
            borderRadius: 20,
            boxShadow: "var(--a-shadow-sm)",
            border: "1px solid var(--a-border)",
            overflow: "hidden",
          }}
        >
          {/* Card header */}
          <div
            style={{
              padding: "20px 28px",
              borderBottom: "1px solid var(--a-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "inherit",
                margin: 0,
              }}
            >
              Danh sách vai trò
            </h3>
            {!loading && (
              <span style={{ fontSize: 12, color: "inherit", opacity: 0.5, fontWeight: 500 }}>
                HIỂN THỊ {Math.min(paginatedRoles.length, pageSize)}/
                {roles.length}
              </span>
            )}
          </div>

          {/* Table */}
          {isMobile ? (
            <div style={{ display: "grid", gap: 12, padding: 14 }}>
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="skeleton" style={{ height: 104, borderRadius: 16 }} />
                ))
              ) : paginatedRoles.length === 0 ? (
                <div style={{ padding: "36px 0", textAlign: "center", color: "var(--a-text-soft)" }}>Chua co vai tro nao</div>
              ) : paginatedRoles.map((role, i) => {
                const dotColor = getRoleColor(role.name);
                const roleNum = (page - 1) * pageSize + i + 1;
                return (
                  <article key={role.id} className="fade-row" style={{ border: "1px solid var(--a-border)", borderRadius: 16, padding: 14, display: "grid", gap: 12, background: "var(--a-surface)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 900, color: "#9ca3af" }}>ROLE-{String(roleNum).padStart(3, "0")}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, boxShadow: `0 0 0 2px ${dotColor}22` }} />
                          <span style={{ fontSize: 16, fontWeight: 900, color: "var(--a-text)" }}>{role.name}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--a-text-muted)", lineHeight: 1.45 }}>{role.description || "Chưa có mô tả"}</div>
                    {hasPermission("EDIT_ROLES") && (
                      <button className="perm-btn" onClick={() => openPermission(role)} disabled={isProtectedRole(role.name)} style={{ opacity: isProtectedRole(role.name) ? 0.55 : 1, cursor: isProtectedRole(role.name) ? "not-allowed" : "pointer", width: "100%", justifyContent: "center" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>shield_lock</span>
                        {isProtectedRole(role.name) ? "Đã khóa" : "Phân quyền"}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead className="table-head">
                <tr>
                  {["ID", "TÊN VAI TRÒ", "MÔ TẢ", "THAO TÁC"].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: "16px 28px",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: ".1em",
                        color: "var(--a-text-muted)",
                        textAlign: i === 3 ? "right" : "left",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows />
                ) : paginatedRoles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ padding: "60px 0", textAlign: "center" }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: 40,
                          color: "#d1d5db",
                          display: "block",
                          marginBottom: 10,
                        }}
                      >
                        shield_question
                      </span>
                      <p
                        style={{
                          color: "#9ca3af",
                          fontWeight: 500,
                          fontSize: 14,
                        }}
                      >
                        Chưa có vai trò nào
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedRoles.map((role, i) => {
                    const dotColor = getRoleColor(role.name);
                    const roleNum = (page - 1) * pageSize + i + 1;
                    return (
                      <tr
                        key={role.id}
                        className="fade-row"
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          animationDelay: `${Math.min(i * 30, 150)}ms`,
                        }}
                      >
                        <td
                          style={{
                            padding: "20px 28px",
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#9ca3af",
                            fontFamily: "monospace",
                            letterSpacing: ".05em",
                          }}
                        >
                          ROLE-{String(roleNum).padStart(3, "0")}
                        </td>
                        <td style={{ padding: "20px 28px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                width: 9,
                                height: 9,
                                borderRadius: "50%",
                                background: dotColor,
                                flexShrink: 0,
                                boxShadow: `0 0 0 2px ${dotColor}22`,
                              }}
                            />
                            <span
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: "inherit",
                              }}
                            >
                              {role.name}
                            </span>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "20px 28px",
                            fontSize: 14,
                            color: "inherit",
                            opacity: 0.7
                          }}
                        >
                          {role.description || (
                            <span
                              style={{ color: "#d1d5db", fontStyle: "italic" }}
                            >
                              Chua co mo ta
                            </span>
                          )}
                        </td>
                        <td
                          style={{ padding: "20px 28px", textAlign: "right" }}
                        >
                          {hasPermission("EDIT_ROLES") && (
                            <button
                              className="perm-btn"
                              onClick={() => openPermission(role)}
                              disabled={isProtectedRole(role.name)}
                              title={
                                isProtectedRole(role.name)
                                  ? "Vai trò hệ thống đang bị khóa phân quyền trực tiếp."
                                  : "Phân quyền"
                              }
                              style={{
                                opacity: isProtectedRole(role.name) ? 0.55 : 1,
                                cursor: isProtectedRole(role.name)
                                  ? "not-allowed"
                                  : "pointer",
                              }}
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: 16 }}
                              >
                                shield_lock
                              </span>
                              {isProtectedRole(role.name) ? "Đã khóa" : "Phân quyền"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          )}

          {/* Pagination */}
          {!loading && roles.length > 0 && (
            <div
              style={{
                padding: "14px 28px",
                borderTop: "1px solid var(--a-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <p style={{ fontSize: 12, color: "var(--a-text-soft)", margin: 0 }}>
                {start}-{end} /{" "}
                <span style={{ fontWeight: 600, color: "var(--a-text-muted)" }}>
                  {roles.length}
                </span>{" "}
                vai trò
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  className="pg-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18 }}
                  >
                    chevron_left
                  </span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (n) => (
                    <button
                      key={n}
                      className={`pg-btn${n === page ? " active" : ""}`}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  ),
                )}
                <button
                  className="pg-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18 }}
                  >
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info note */}
        <div
          className="sub-card-p"
          style={{
            marginTop: 20,
            padding: "14px 20px",
            background: "var(--a-brand-bg)",
            borderRadius: 12,
            border: "1px solid var(--a-brand-border)",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 18,
              color: "var(--a-brand-ink)",
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            info
          </span>
          <p
            style={{
              fontSize: 12,
              color: "inherit",
              opacity: 0.7,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Tài khoản có quyền <strong>VIEW_ROLES</strong> có thể xem danh sách
            vai trò. Chỉ tài khoản có quyền <strong>EDIT_ROLES</strong> mới có
            thể thay đổi phân quyền. Các thay đổi sẽ được áp dụng ngay khi người
            dùng đăng nhập lại.
          </p>
        </div>
      </div>
    </>
  );
}


