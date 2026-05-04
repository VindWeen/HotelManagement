import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAdminAuthStore } from "../store/adminAuthStore";
import { useLoadingStore } from "../store/loadingStore";
import { logout } from "../api/authApi";
import { getMyProfile } from "../api/userProfileApi";
import { useSignalR } from "../hooks/useSignalR";
import { useResponsiveAdmin } from "../hooks/useResponsiveAdmin";
import NotificationMenu from "../components/NotificationMenu";
import "../styles/admin-theme.css";

const THEME_STORAGE_KEY = "admin-theme-mode";
const SIDEBAR_WIDTH = 256;

function buildNavItems(hasPermission) {
  return [
    hasPermission("VIEW_DASHBOARD") && { to: "/admin/dashboard", icon: "dashboard", label: "Dashboard" },
    hasPermission("MANAGE_ROOMS") && { to: "/admin/rooms", icon: "meeting_room", label: "Quản lý phòng" },
    hasPermission("MANAGE_ROOMS") && { to: "/admin/maintenance", icon: "construction", label: "Bảo trì phòng" },
    hasPermission("MANAGE_ROOMS") && { to: "/admin/housekeeping", icon: "cleaning_services", label: "Dọn phòng" },
    hasPermission("MANAGE_ROOMS") && { to: "/admin/room-types", icon: "category", label: "Hạng phòng" },
    hasPermission("MANAGE_INVENTORY") && { to: "/admin/items", icon: "inventory_2", label: "Vật tư và Minibar" },
    hasPermission("MANAGE_INVENTORY") && { to: "/admin/loss-damage", icon: "report_problem", label: "Thất thoát và Đền bù" },
    hasPermission("MANAGE_BOOKINGS") && { to: "/admin/bookings", icon: "confirmation_number", label: "Đặt phòng" },
    hasPermission("MANAGE_BOOKINGS") && { to: "/admin/vouchers", icon: "local_offer", label: "Voucher" },
    hasPermission("MANAGE_SERVICES") && { to: "/admin/services", icon: "room_service", label: "Quản lý dịch vụ" },
    hasPermission("MANAGE_INVOICES") && { to: "/admin/invoices", icon: "receipt_long", label: "Hóa đơn" },
    hasPermission("MANAGE_USERS") && { to: "/admin/memberships", icon: "workspace_premium", label: "Khách hàng thành viên" },
    hasPermission("MANAGE_USERS") && { to: "/admin/shifts", icon: "schedule", label: "Ca làm việc" },
    hasPermission("MANAGE_CONTENT") && { to: "/admin/articles", icon: "article", label: "Bài viết" },
    hasPermission("MANAGE_CONTENT") && { to: "/admin/attractions", icon: "place", label: "Địa điểm" },
    hasPermission("MANAGE_CONTENT") && { to: "/admin/reviews", icon: "reviews", label: "Đánh giá" },
    hasPermission("MANAGE_USERS") && { to: "/admin/staff", icon: "group", label: "Danh sách nhân sự" },
    hasPermission("VIEW_ROLES") && { to: "/admin/roles", icon: "shield_person", label: "Vai trò và Phân quyền" },
    hasPermission("VIEW_AUDIT_LOGS") && { to: "/admin/audit-logs", icon: "history", label: "Nhật ký hoạt động" },
  ].filter(Boolean);
}

export default function AdminLayout() {
  const { user, permissions } = useAdminAuthStore();
  const clearAuth = useAdminAuthStore((s) => s.clearAuth);
  const updateUser = useAdminAuthStore((s) => s.updateUser);
  const isLoading = useLoadingStore((s) => s.isLoading);
  const navigate = useNavigate();

  useSignalR();

  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem(THEME_STORAGE_KEY) || "light";
  });
  const { width, isMobile } = useResponsiveAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getMyProfile();
        if (res.data) updateUser(res.data);
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
      }
    };

    if (user?.id || user?.fullName) {
      fetchProfile();
    }
  }, [user?.id, user?.fullName, updateUser]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    document.documentElement.style.colorScheme = themeMode;
    document.body.style.transition = "background-color 0.38s cubic-bezier(0.22, 1, 0.36, 1)";
    document.body.style.background = themeMode === "dark" ? "#111411" : "#f8f9fa";
  }, [themeMode]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // keep client logout even if server fails
    }
    clearAuth();
    navigate("/login");
  };

  const hasPermission = useCallback(
    (code) =>
      permissions.some(
        (p) =>
          (typeof p === "string" && p === code) ||
          (typeof p === "object" && p.permissionCode === code),
      ),
    [permissions],
  );

  const navItems = useMemo(() => buildNavItems(hasPermission), [hasPermission]);
  const ch = (user?.fullName || "A")[0].toUpperCase();
  const canUseNotificationCenter = user?.role === "Admin" || user?.role === "Manager";

  return (
    <>
      {isLoading && (
        <div className="admin-loading-overlay">
          <div className="admin-spinner" />
        </div>
      )}

      <div className="admin-portal" data-theme={themeMode}>
        <div
          className="admin-shell"
          style={{
            fontFamily: "'Manrope', sans-serif",
            overflowX: "hidden",
          }}
        >
          {isMobile && sidebarOpen && (
            <button
              className="admin-sidebar-overlay"
              onClick={() => setSidebarOpen(false)}
              aria-label="Dong menu"
              style={{
                position: "fixed",
                inset: 0,
                border: "none",
                zIndex: 45,
                cursor: "pointer",
              }}
            />
          )}

          <aside
            className="admin-sidebar"
            style={{
              width: SIDEBAR_WIDTH,
              height: "100vh",
              position: "fixed",
              left: 0,
              top: 0,
              transform: isMobile ? (sidebarOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
              transition: "transform .25s ease",
              display: "flex",
              flexDirection: "column",
              padding: isMobile ? "22px 12px 18px" : "32px 16px",
              zIndex: 50,
              overflow: "hidden",
            }}
          >
            <div style={{ marginBottom: 40, paddingLeft: 16 }}>
              <h1
                className="admin-brand-title"
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                The Ethereal
              </h1>
              <p
                className="admin-brand-subtitle"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginTop: 4,
                  marginBottom: 0,
                }}
              >
                Hotel ERP
              </p>
            </div>

            <nav
              className="admin-sidebar-nav"
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                minHeight: 0,
                overflowY: "auto",
                paddingRight: 6,
                scrollbarWidth: "thin",
              }}
            >
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontVariationSettings: isActive ? "'FILL' 1,'wght' 400" : "'FILL' 0",
                        }}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div
              style={{
                marginTop: "auto",
                paddingLeft: 16,
                paddingRight: 16,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <button className="admin-ghost-btn" onClick={handleLogout}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  logout
                </span>
                Đăng xuất
              </button>
            </div>
          </aside>

          <header
            className="admin-topbar"
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: isMobile ? "100%" : `calc(100% - ${SIDEBAR_WIDTH}px)`,
              height: 64,
              zIndex: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: isMobile ? "0 12px" : width < 1280 ? "0 24px" : "0 32px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 32, flex: 1 }}>
              {isMobile && (
                <button
                  className="admin-icon-btn"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Mo menu"
                  style={{ borderRadius: 12 }}
                >
                  <span className="material-symbols-outlined">menu</span>
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 16, marginLeft: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <NavLink to="/" title="Về trang Khách" className="admin-icon-btn">
                  <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
                    public
                  </span>
                </NavLink>

                <button
                  className="admin-icon-btn"
                  onClick={() => setThemeMode((prev) => (prev === "dark" ? "light" : "dark"))}
                  title={themeMode === "dark" ? "Chuyển sang light mode" : "Chuyển sang dark mode"}
                  aria-label={themeMode === "dark" ? "Chuyển sang light mode" : "Chuyển sang dark mode"}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
                    {themeMode === "dark" ? "light_mode" : "dark_mode"}
                  </span>
                </button>

                {canUseNotificationCenter ? <NotificationMenu /> : null}

                <button className="admin-icon-btn" title="Tro giup" aria-label="Tro giup">
                  <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
                    help_outline
                  </span>
                </button>
              </div>

              {!isMobile && (
                <div
                  style={{
                    width: 1,
                    height: 32,
                    background: "var(--a-border)",
                  }}
                />
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                }}
              >
                {!isMobile && (
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--a-text)",
                        margin: 0,
                      }}
                    >
                      {user?.fullName || "-"}
                    </p>
                    <p style={{ fontSize: 10, color: "var(--a-text-muted)", margin: 0 }}>
                      {user?.role || "-"}
                    </p>
                  </div>
                )}

                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid var(--a-border)",
                    }}
                    alt="Avatar"
                  />
                ) : (
                  <div className="admin-avatar">{ch}</div>
                )}
              </div>
            </div>
          </header>

          <main
            style={{
              marginLeft: isMobile ? 0 : SIDEBAR_WIDTH,
              paddingTop: 64,
              minHeight: "100vh",
            }}
          >
            <div
              className="admin-page-shell"
              style={{ padding: isMobile ? "12px 12px 20px" : width < 1280 ? 24 : 32 }}
            >
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
