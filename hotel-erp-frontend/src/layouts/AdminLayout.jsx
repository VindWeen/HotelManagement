import { useEffect, useMemo, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAdminAuthStore } from "../store/adminAuthStore";
import { useLoadingStore } from "../store/loadingStore";
import { logout } from "../api/authApi";
import { getMyProfile } from "../api/userProfileApi";
import { useSignalR } from "../hooks/useSignalR";
import NotificationMenu from "../components/NotificationMenu";

const THEME_STORAGE_KEY = "admin-theme-mode";
const SIDEBAR_WIDTH = 256;

function getPalette(mode) {
  if (mode === "dark") {
    return {
      pageBg: "#000000",
      shellBg: "#000000",
      headerBg: "rgba(0, 0, 0, 0.9)",
      panelBg: "#000000",
      panelMuted: "#050505",
      panelBorder: "rgba(255,255,255,0.1)",
      textMain: "#ffffff",
      textSub: "#d1d5db",
      brand: "#ffffff",
      brandStrong: "#ffffff",
      activeBg: "#333333",
      activeText: "#ffffff",
      overlay: "rgba(0,0,0,0.85)",
      divider: "rgba(255,255,255,0.08)",
    };
  }

  return {
    pageBg: "#f8f9fa",
    shellBg: "#ffffff",
    headerBg: "rgba(255,255,255,.82)",
    panelBg: "#ffffff",
    panelMuted: "#f3f4f6",
    panelBorder: "#f1f0ea",
    textMain: "#1c1917",
    textSub: "#6b7280",
    brand: "#1a3826",
    brandStrong: "#4f645b",
    activeBg: "rgba(236,253,245,.55)",
    activeText: "#1a3826",
    overlay: "rgba(15,23,42,.34)",
    divider: "#e5e7eb",
  };
}

function navStyle(palette) {
  return ({ isActive }) => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderRadius: 12,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: isActive ? 700 : 500,
    color: isActive ? palette.activeText : palette.textSub,
    background: isActive ? palette.activeBg : "transparent",
    transition: "all .15s",
  });
}

function buildNavItems(hasPermission) {
  return [
    hasPermission("VIEW_DASHBOARD") && { to: "/admin/dashboard", icon: "dashboard", label: "Dashboard" },
    hasPermission("MANAGE_ROOMS") && { to: "/admin/rooms", icon: "meeting_room", label: "Quản lý phòng" },
    hasPermission("MANAGE_ROOMS") && { to: "/admin/maintenance", icon: "construction", label: "Bảo trì phòng" },
    hasPermission("MANAGE_ROOMS") && { to: "/admin/housekeeping", icon: "cleaning_services", label: "Dọn phòng" },
    hasPermission("MANAGE_ROOMS") && { to: "/admin/room-types", icon: "category", label: "Hạng phòng" },
    hasPermission("MANAGE_INVENTORY") && { to: "/admin/items", icon: "inventory_2", label: "Vật tư & Minibar" },
    hasPermission("MANAGE_INVENTORY") && { to: "/admin/loss-damage", icon: "report_problem", label: "Thất thoát & Đền bù" },
    hasPermission("MANAGE_BOOKINGS") && { to: "/admin/bookings", icon: "confirmation_number", label: "Booking & Voucher" },
    hasPermission("MANAGE_SERVICES") && { to: "/admin/services", icon: "room_service", label: "Quản lý dịch vụ" },
    hasPermission("MANAGE_INVOICES") && { to: "/admin/invoices", icon: "receipt_long", label: "Hóa đơn" },
    hasPermission("MANAGE_USERS") && { to: "/admin/memberships", icon: "workspace_premium", label: "Khách hàng thành viên" },
    hasPermission("MANAGE_USERS") && { to: "/admin/shifts", icon: "schedule", label: "Ca làm việc" },
    hasPermission("MANAGE_CONTENT") && { to: "/admin/articles", icon: "article", label: "Bài viết" },
    hasPermission("MANAGE_CONTENT") && { to: "/admin/attractions", icon: "place", label: "Địa điểm" },
    hasPermission("MANAGE_CONTENT") && { to: "/admin/reviews", icon: "reviews", label: "Đánh giá" },
    hasPermission("MANAGE_USERS") && { to: "/admin/staff", icon: "group", label: "Danh sách Nhân sự" },
    hasPermission("VIEW_ROLES") && { to: "/admin/roles", icon: "shield_person", label: "Vai trò & Phân quyền" },
  ].filter(Boolean);
}

export default function AdminLayout() {
  const { user, permissions } = useAdminAuthStore();
  const clearAuth = useAdminAuthStore((s) => s.clearAuth);
  const updateUser = useAdminAuthStore((s) => s.updateUser);
  const isLoading = useLoadingStore((s) => s.isLoading);
  const navigate = useNavigate();

  useSignalR();

  const [topSearch, setTopSearch] = useState("");
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem(THEME_STORAGE_KEY) || "light";
  });
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 1100;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const palette = useMemo(() => getPalette(themeMode), [themeMode]);

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
    if (typeof window === "undefined") return undefined;

    const syncViewport = () => {
      const mobile = window.innerWidth < 1100;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    document.documentElement.classList.toggle("dark", themeMode === "dark");
    document.body.style.background = palette.pageBg;
  }, [themeMode, palette.pageBg]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // vẫn logout phía client dù server lỗi
    }
    clearAuth();
    navigate("/login");
  };

  const onSearch = (value) => setTopSearch(value);

  const hasPermission = (code) =>
    permissions.some(
      (p) =>
        (typeof p === "string" && p === code) ||
        (typeof p === "object" && p.permissionCode === code),
    );

  const navItems = useMemo(() => buildNavItems(hasPermission), [permissions]);
  const ch = (user?.fullName || "A")[0].toUpperCase();
  const canUseNotificationCenter = user?.role === "Admin" || user?.role === "Manager";

  return (
    <>
      <style>{`
        .spinner-overlay { position:fixed; inset:0; background:rgba(255,255,255,0.6); z-index:9999; display:flex; align-items:center; justify-content:center; }
        .spinner { width:40px; height:40px; border:4px solid #e5e7eb; border-top:4px solid #4f645b; border-radius:50%; animation:spin 0.8s linear infinite; }
        .admin-sidebar-nav::-webkit-scrollbar { width: 0; }
        .admin-sidebar-nav:hover::-webkit-scrollbar { width: 8px; }
        .admin-sidebar-nav::-webkit-scrollbar-track { background: transparent; }
        .admin-sidebar-nav::-webkit-scrollbar-thumb { background: transparent; border-radius: 999px; }
        .admin-sidebar-nav:hover::-webkit-scrollbar-thumb { background: rgba(120, 113, 108, 0.35); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 1099px) {
          .admin-desktop-links { display: none !important; }
        }

        /* ADMIN WIDE DARK MODE OVERRIDES */
        /* Exhaustive List of Bright Background Overrides */
        .dark [style*="background:#ffffff"], .dark [style*="background: #ffffff"],
        .dark [style*="background-color:#ffffff"], .dark [style*="background-color: #ffffff"],
        .dark [style*="background:white"], .dark [style*="background: white"],
        .dark [style*="background-color:white"], .dark [style*="background-color: white"],
        .dark [style*="background:#faf8f3"], .dark [style*="background: #faf8f3"],
        .dark [style*="background:#f9f8f3"], .dark [style*="background: #f9f8f3"],
        .dark [style*="background:#fcfbf8"], .dark [style*="background: #fcfbf8"],
        .dark [style*="background:#fcf8f3"], .dark [style*="background: #fcf8f3"],
        .dark [style*="background:#fcfbf6"], .dark [style*="background: #fcfbf6"],
        .dark [style*="background:#f1f0ea"], .dark [style*="background: #f1f0ea"],
        .dark [style*="background:#f8f9fa"], .dark [style*="background: #f8f9fa"],
        .dark [style*="background:#f3f4f6"], .dark [style*="background: #f3f4f6"],
        .dark [style*="background:#f9fafb"], .dark [style*="background: #f9fafb"],
        .dark [style*="background:#eef7f1"], .dark [style*="background: #eef7f1"],
        .dark [style*="background:#ecfdf5"], .dark [style*="background: #ecfdf5"],
        .dark [style*="background:#fef3c7"], .dark [style*="background: #fef3c7"],
        .dark [style*="background:#edf2f7"], .dark [style*="background: #edf2f7"] {
           background-color: #000000 !important;
           box-shadow: none !important;
        }

        .dark [style*="background:linear-gradient(135deg,#d1e8dd,#c3dacf)"] {
           background: #1a1a1a !important;
        }

        /* Status Badge Overrides (make them outlines or transparent in dark mode) */
        .dark [style*="background:#ecfdf5"], .dark [style*="background: #ecfdf5"],
        .dark [style*="background:#e0e7ff"], .dark [style*="background: #e0e7ff"],
        .dark [style*="background:#fef2f2"], .dark [style*="background: #fef2f2"],
        .dark [style*="background:#fef3c7"], .dark [style*="background: #fef3c7"],
        .dark [style*="background:#fff7ed"], .dark [style*="background: #fff7ed"] {
           background-color: rgba(255,255,255,0.05) !important;
           border: 1px solid currentColor !important;
        }

        .dark [style*="border:1px solid #f1f0ea"], .dark [style*="border: 1px solid #f1f0ea"],
        .dark [style*="border:1.5px solid #f1f0ea"], .dark [style*="border: 1.5px solid #f1f0ea"],
        .dark [style*="border:1.5px solid #e2e8e1"], .dark [style*="border: 1.5px solid #e2e8e1"] {
           border-color: rgba(255,255,255,0.15) !important;
        }

        .dark [style*="color:#1c1917"], .dark [style*="color: #1c1917"],
        .dark [style*="color:rgb(28, 25, 23)"], .dark [style*="color: rgb(28, 25, 23)"],
        .dark [style*="color:#374151"], .dark [style*="color: #374151"],
        .dark [style*="color:rgb(55, 65, 81)"], .dark [style*="color: rgb(55, 65, 81)"],
        .dark [style*="color:#4b5563"], .dark [style*="color: #4b5563"],
        .dark [style*="color:rgb(75, 85, 99)"], .dark [style*="color: rgb(75, 85, 99)"],
        .dark [style*="color:#5e6059"], .dark [style*="color: #5e6059"],
        .dark [style*="color:#31332e"], .dark [style*="color: #31332e"],
        .dark [style*="color:#334155"], .dark [style*="color: #334155"],
        .dark [style*="color:#44403c"], .dark [style*="color: #44403c"],
        .dark [style*="color:#78716c"], .dark [style*="color: #78716c"],
        .dark [style*="color:#57534e"], .dark [style*="color: #57534e"] {
          color: #ffffff !important;
        }

        .dark [style*="color:#5e6059"], .dark [style*="color: #5e6059"],
        .dark [style*="color:#31332e"], .dark [style*="color: #31332e"],
        .dark [style*="color:#334155"], .dark [style*="color: #334155"],
        .dark [style*="color:#44403c"], .dark [style*="color: #44403c"],
        .dark [style*="color:#78716c"], .dark [style*="color: #78716c"],
        .dark [style*="color:#6b7280"], .dark [style*="color: #6b7280"],
        .dark [style*="color:#a8a29e"], .dark [style*="color: #a8a29e"],
        .dark [style*="color:#78716c"], .dark [style*="color: #78716c"],
        .dark [style*="color:#57534e"], .dark [style*="color: #57534e"],
        .dark [style*="color:#44403c"], .dark [style*="color: #44403c"],
        .dark [style*="color:#52525b"], .dark [style*="color: #52525b"] {
          color: #94a3b8 !important;
        }

        .dark [style*="color:#1f2937"], .dark [style*="color: #1f2937"],
        .dark [style*="color:#111827"], .dark [style*="color: #111827"],
        .dark [style*="color:#292524"], .dark [style*="color: #292524"] {
          color: #ffffff !important;
        }

        .dark [style*="color:#6b7280"], .dark [style*="color: #6b7280"],
        .dark [style*="color:rgb(107, 114, 128)"], .dark [style*="color: rgb(107, 114, 128)"],
        .dark [style*="color:#9ca3af"], .dark [style*="color: #9ca3af"],
        .dark [style*="color:rgb(156, 163, 175)"], .dark [style*="color: rgb(156, 163, 175)"],
        .dark [style*="color:rgba(0, 0, 0, 0.5)"], .dark [style*="color: rgba(0, 0, 0, 0.5)"] {
          color: #d1d5db !important;
        }

        .dark [style*="border-color:#e2e8e1"], .dark [style*="border-color: #e2e8e1"],
        .dark [style*="border-color:rgb(226, 232, 225)"], .dark [style*="border-color: rgb(226, 232, 225)"],
        .dark [style*="border-color:#cbd5e1"], .dark [style*="border-color: #cbd5e1"],
        .dark [style*="border-color:rgb(203, 213, 225)"], .dark [style*="border-color: rgb(203, 213, 225)"],
        .dark [style*="solid #e2e8e1"], .dark [style*="solid rgb(226, 232, 225)"],
        .dark [style*="border-bottom: 1px solid #e2e8e1"] {
          border-color: rgba(255,255,255,0.08) !important;
          border-bottom-color: rgba(255,255,255,0.08) !important;
        }

        .dark input:not([type="radio"]):not([type="checkbox"]), .dark select, .dark textarea {
          background: #050505 !important;
          color: #ffffff !important;
          border-color: rgba(255,255,255,0.15) !important;
        }

        .dark table th {
          background: rgba(255,255,255,0.04) !important;
          color: #d1d5db !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .dark table td {
          border-color: rgba(255,255,255,0.04) !important;
          color: inherit !important;
        }
        .dark table tr:hover td {
          background-color: rgba(255,255,255,0.03) !important;
        }

        .dark .modal-content, .dark .drawer-content { background: #000000 !important; }
        .dark [style*="boxShadow"], .dark [style*="box-shadow"] {
          box-shadow: 0 4px 24px rgba(0,0,0,0.4) !important;
        }

        .dark .room-card { 
            background: #000000 !important; 
            border-color: rgba(255,255,255,0.12) !important;
        }
        .dark .status-badge { 
            background: rgba(255,255,255,0.08) !important; 
            color: #d1e1d9 !important;
            border: 1px solid rgba(255,255,255,0.12) !important; 
        }

        /* --- BROAD REFINEMENTS FOR ALL ADMIN PAGES --- */
        .dark .bg-white, .dark .bg-gray-50, .dark .bg-gray-100, 
        .dark .bg-stone-50, .dark .bg-stone-100, .dark .bg-slate-50, .dark .bg-slate-100,
        .dark [style*="background: white"], 
        .dark [style*="background-color: white"],
        .dark [style*="background: #fff"],
        .dark [style*="background-color: #fff"],
        .dark [style*="background: #ffffff"],
        .dark [style*="background-color: #ffffff"],
        .dark [style*="background: rgb(255, 255, 255)"],
        .dark [style*="background-color: rgb(255, 255, 255)"] {
          background-color: #000000 !important;
          border-color: rgba(255,255,255,0.12) !important;
        }

        /* Catch common light backgrounds with space and color format variations */
        .dark [style*="background:#f9f8f3"], .dark [style*="background: #f9f8f3"],
        .dark [style*="background-color:#f9f8f3"], .dark [style*="background-color: #f9f8f3"],
        .dark [style*="rgb(249,248,243)"], .dark [style*="rgb(249, 248, 243)"],
        .dark [style*="background:#faf8f3"], .dark [style*="background: #faf8f3"],
        .dark [style*="background-color:#faf8f3"], .dark [style*="background-color: #faf8f3"],
        .dark [style*="rgb(250,248,243)"], .dark [style*="rgb(250, 248, 243)"],
        .dark [style*="background:#fafaf9"], .dark [style*="background: #fafaf9"],
        .dark [style*="background-color:#fafaf9"], .dark [style*="background-color: #fafaf9"],
        .dark [style*="rgb(250,250,249)"], .dark [style*="rgb(250, 250, 249)"],
        .dark [style*="background:#fafaf8"], .dark [style*="background: #fafaf8"],
        .dark [style*="background-color:#fafaf8"], .dark [style*="background-color: #fafaf8"],
        .dark [style*="rgb(250,250,248)"], .dark [style*="rgb(250, 250, 248)"],
        .dark [style*="background:#f8fafc"], .dark [style*="background: #f8fafc"],
        .dark [style*="background-color:#f8fafc"], .dark [style*="background-color: #f8fafc"],
        .dark [style*="rgb(248,250,252)"], .dark [style*="rgb(248, 250, 252)"],
        .dark [style*="background:#f0f7f3"], .dark [style*="background: #f0f7f3"],
        .dark [style*="rgb(240,247,243)"], .dark [style*="rgb(240, 247, 243)"],
        .dark [style*="rgba(249,248,243"], .dark [style*="rgba(249, 248, 243"],
        .dark [style*="rgba(250,248,243"], .dark [style*="rgba(250, 248, 243"],
        .dark [style*="rgba(227,227,219"], .dark [style*="rgba(227, 227, 219"] {
          background-color: rgba(255,255,255,0.06) !important;
        }

        /* Catch dark brand colors used as text and make them bright */
        .dark [style*="color:#4f645b"], .dark [style*="color: #4f645b"],
        .dark [style*="color:#1a3826"], .dark [style*="color: #1a3826"] {
          color: #ffffff !important;
        }

        /* Catch error/warning/info light backgrounds */
        .dark .bg-amber-50, .dark .bg-red-50, .dark .bg-blue-50, .dark .bg-emerald-50,
        .dark [style*="background: #fff1f2"],
        .dark [style*="background-color: #fff1f2"],
        .dark [style*="background: #eff6ff"],
        .dark [style*="background-color: #eff6ff"],
        .dark [style*="background: #fee2e2"],
        .dark [style*="background-color: #fee2e2"] {
          background-color: rgba(255,255,255,0.06) !important;
          color: #ffffff !important;
        }

        /* Text colors */
        .dark .text-stone-700, .dark .text-stone-800, .dark .text-stone-900,
        .dark .text-gray-700, .dark .text-gray-800, .dark .text-gray-900,
        .dark .text-slate-700, .dark .text-slate-800, .dark .text-slate-900,
        .dark [style*="color: #1c1917"], .dark [style*="color: #0f172a"],
        .dark [style*="color: #1e293b"], .dark [style*="color: #374151"], 
        .dark [style*="color: #334155"] {
          color: #ffffff !important;
        }

        .dark .text-stone-400, .dark .text-stone-500, .dark .text-stone-600,
        .dark .text-gray-400, .dark .text-gray-500, .dark .text-gray-600,
        .dark .text-slate-400, .dark .text-slate-500, .dark .text-slate-600,
        .dark [style*="color: #6b7280"], .dark [style*="color: #94a3b8"],
        .dark [style*="color: #64748b"], .dark [style*="color: #9ca3af"],
        .dark [style*="color: #78716c"] {
          color: #d1d5db !important;
        }

        /* Borders */
        .dark .border-stone-100, .dark .border-stone-200, .dark .border-stone-300,
        .dark .border-gray-100, .dark .border-gray-200, .dark .border-gray-300,
        .dark .border-slate-100, .dark .border-slate-200, .dark .border-slate-300,
        .dark [style*="border: 1px solid #e2e8e1"],
        .dark [style*="border: 1.5px solid #e2e8e1"],
        .dark [style*="border: 1px solid #f1f0ea"],
        .dark [style*="border: 1px solid #ece7de"],
        .dark [style*="border-color: #e2e8e1"],
        .dark [style*="border-color: #f1f0ea"] {
          border-color: rgba(255,255,255,0.08) !important;
        }

        /* Table specific */
        .dark tr[style*="background: rgba(249,248,243"],
        .dark tr[style*="background-color: rgba(249,248,243"] {
          background-color: rgba(255,255,255,0.04) !important;
          border-bottom-color: rgba(255,255,255,0.08) !important;
        }

        /* Modals and Overlays */
        .dark .modal-backdrop { background: rgba(0,0,0,0.85) !important; }
        .dark [style*="background: white"][style*="borderRadius: 24"],
        .dark [style*="background: white"][style*="border-radius: 20"],
        .dark div[class*="modal"] div[class*="bg-white"] {
           background-color: #000000 !important;
           border: 1px solid rgba(255,255,255,0.2) !important;
           color: #ffffff !important;
        }

        /* Buttons and Interactive */
        .dark .pg-btn:hover:not(.active) { background: rgba(255,255,255,0.1) !important; }
        .dark .pg-btn.active, .dark .tab-btn.active, .dark .active-filter {
          background-color: #333333 !important;
          color: #ffffff !important;
          border-color: #555555 !important;
        }

        .dark button:not(.pg-btn):not(.action-btn):not([style*="background:none"]),
        .dark .pg-btn:not(.active),
        .dark .btn-icon-p { 
          background: #262626 !important;
          color: #ffffff !important;
          border: 1px solid rgba(255,255,255,0.3) !important;
        }

        .dark button[style*="background:linear-gradient"],
        .dark button[style*="background-color:linear-gradient"],
        .dark button[style*="background:#4f645b"],
        .dark button[style*="background: #4f645b"] {
          background: #ffffff !important;
          color: #000000 !important;
          border: none !important;
          font-weight: 800 !important;
        }

        /* Catch specific 'Active State' colors from RoomTypes stats and others and make them gray */
        .dark [style*="border-color:#059669"], .dark [style*="border-color: #059669"],
        .dark [style*="border-color:#6b7280"], .dark [style*="border-color: #6b7280"],
        .dark [style*="border-color:#1a3826"], .dark [style*="border-color: #1a3826"],
        .dark [style*="border-color:#4f645b"], .dark [style*="border-color: #4f645b"],
        .dark [style*="solid #059669"], .dark [style*="solid #6b7280"], .dark [style*="solid #1a3826"] {
           background-color: #333333 !important;
           border-color: #555555 !important;
           color: #ffffff !important;
        }

        .dark .status-badge { 
            background: rgba(255,255,255,0.08) !important; 
            color: #ffffff !important;
            border: 1px solid rgba(255,255,255,0.15) !important; 
        }
        
        /* Tooltips/Popovers if any */
        .dark [style*="box-shadow: 0 20px 40px rgba(15,23,42,.14)"] {
           background-color: #000000 !important;
           border-color: rgba(255,255,255,0.2) !important;
           box-shadow: 0 10px 40px rgba(0,0,0,0.85) !important;
        }

        /* Toggle Switches */
        .dark .slider { 
            background-color: #4b5563 !important; 
        }
        .dark input:checked + .slider { 
            background-color: #10b981 !important; 
        }
        .dark .slider:before {
            background-color: #ffffff !important;
        }
        .dark .toggle-switch span[style*="background:#4f645b"] {
            background-color: #10b981 !important;
        }
        .dark .toggle-switch span[style*="background:#d1d5db"] {
            background-color: #4b5563 !important;
        }
        .dark .primary-card-p {
           background-color: #000000 !important;
           border-color: rgba(255,255,255,0.1) !important;
           color: #ffffff !important;
        }

        .dark .sub-card-p {
           background-color: #121212 !important;
           border-color: rgba(255,255,255,0.12) !important;
           color: #ffffff !important;
        }

        /* Membership Badge Text - Force black for visibility on light rank backgrounds */
        .dark .tier-badge-text-p, 
        .dark .tier-badge-text-p div, 
        .dark .tier-badge-text-p span,
        .dark .tier-badge-text-p p {
           color: #000000 !important;
        }

        /* Quill Editor Dark Mode */
        .dark .ql-toolbar.ql-snow, 
        .dark .ql-container.ql-snow {
          border-color: rgba(255,255,255,0.1) !important;
          background-color: #000000 !important;
          color: #ffffff !important;
        }
        .dark .ql-editor {
          color: #ffffff !important;
        }
        .dark .ql-snow .ql-stroke {
          stroke: #d1d5db !important;
        }
        .dark .ql-snow .ql-fill {
          fill: #d1d5db !important;
        }
        .dark .ql-snow .ql-picker {
          color: #d1d5db !important;
        }
        .dark .ql-toolbar.ql-snow {
          background-color: #121212 !important;
        }
        .dark .ql-editor.ql-blank::before {
          color: rgba(255,255,255,0.4) !important;
        }
        
        /* Combobox / Select / Input Dark Mode */
        .dark select option {
          background-color: #121212 !important;
          color: #ffffff !important;
        }
        .dark input, .dark select, .dark textarea {
          background-color: #1a1a1a !important;
          border-color: rgba(255,255,255,0.15) !important;
          color: #ffffff !important;
        }
        /* Specific treatment for date/time inputs to make them 'bright' as requested */
        .dark input[type="date"], 
        .dark input[type="datetime-local"],
        .dark input[type="time"] {
          background-color: #262626 !important;
          border-color: rgba(255,255,255,0.3) !important;
          color-scheme: dark !important;
        }
        
        /* Checkbox / Radio Dark Mode */
        .dark input[type="checkbox"], .dark input[type="radio"] {
          accent-color: #10b981 !important;
          cursor: pointer;
        }
        /* Optional: improve visibility of unchecked state */
        .dark input[type="checkbox"] {
          border: 1px solid rgba(255,255,255,0.3) !important;
        }

        /* Toggle Switch Refinement (Off state) */
        .dark .toggle-track-p {
          background-color: #3f3f3f !important;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1) !important;
        }
        /* Toggle Switch (On state) */
        .dark .toggle-track-p[style*="background:#4f645b"],
        .dark .toggle-track-p[style*="background: #4f645b"] {
          background-color: #10b981 !important;
        }
        /* Ensure toggle outer button stays transparent to avoid 'square' artifact */
        .dark .btn-reset-p,
        .dark .toggle-track-p.parent-button, 
        .dark button[style*="background:transparent"],
        .dark button[style*="background: transparent"] {
          background-color: transparent !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        
        /* Pure text highlighted for Dark Mode */
        .dark .pure-text-p {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
      `}</style>

      {isLoading && (
        <div className="spinner-overlay">
          <div className="spinner" />
        </div>
      )}

      <div
        style={{
          fontFamily: "'Manrope', sans-serif",
          background: palette.pageBg,
          minHeight: "100vh",
          color: palette.textMain,
          overflowX: "hidden",
        }}
      >
        {isMobile && sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Đóng menu"
            style={{
              position: "fixed",
              inset: 0,
              border: "none",
              background: palette.overlay,
              zIndex: 45,
              cursor: "pointer",
            }}
          />
        )}

        <aside
          style={{
            width: SIDEBAR_WIDTH,
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            transform: isMobile ? (sidebarOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
            transition: "transform .25s ease",
            borderRight: `1px solid ${palette.panelBorder}`,
            background: palette.shellBg,
            display: "flex",
            flexDirection: "column",
            padding: "32px 16px",
            zIndex: 50,
            overflow: "hidden",
            boxShadow: isMobile ? "0 18px 48px rgba(0,0,0,.22)" : "none",
          }}
        >
          <div style={{ marginBottom: 40, paddingLeft: 16 }}>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: "0.15em",
                color: palette.brand,
                textTransform: "uppercase",
              }}
            >
              The Ethereal
            </h1>
            <p
              style={{
                fontSize: 10,
                letterSpacing: "0.2em",
                color: palette.textSub,
                textTransform: "uppercase",
                marginTop: 4,
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
              <NavLink key={item.to} to={item.to} style={navStyle(palette)}>
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
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 12,
                background: "none",
                border: `1px solid ${palette.panelBorder}`,
                color: palette.textSub,
                fontWeight: 500,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                logout
              </span>
              Đăng xuất
            </button>
          </div>
        </aside>

        <header
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: isMobile ? "100%" : `calc(100% - ${SIDEBAR_WIDTH}px)`,
            height: 64,
            zIndex: 40,
            background: palette.headerBg,
            backdropFilter: "blur(12px)",
            borderBottom: `1px solid ${palette.panelBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isMobile ? "0 16px" : "0 32px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 32, flex: 1 }}>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: `1px solid ${palette.panelBorder}`,
                  background: palette.panelBg,
                  color: palette.textMain,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
            )}

          </div>

          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 16, marginLeft: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <NavLink
                to="/"
                title="Về Trang Khách"
                style={{
                  padding: 8,
                  border: `1px solid ${palette.panelBorder}`,
                  background: palette.panelBg,
                  cursor: "pointer",
                  color: palette.textSub,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
                  public
                </span>
              </NavLink>
              
              <button
                onClick={() => setThemeMode((prev) => (prev === "dark" ? "light" : "dark"))}
                title={themeMode === "dark" ? "Chuyển sang light mode" : "Chuyển sang dark mode"}
                style={{
                  padding: 8,
                  border: `1px solid ${palette.panelBorder}`,
                  background: palette.panelBg,
                  cursor: "pointer",
                  color: palette.textSub,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
                  {themeMode === "dark" ? "light_mode" : "dark_mode"}
                </span>
              </button>

              {canUseNotificationCenter ? <NotificationMenu /> : null}

              <button
                title="Trợ giúp"
                style={{
                  padding: 8,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: palette.textSub,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 19 }}>help_outline</span>
              </button>
            </div>

            {!isMobile && <div style={{ width: 1, height: 32, background: palette.divider }} />}

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
                      color: palette.textMain,
                      margin: 0,
                    }}
                  >
                    {user?.fullName || "—"}
                  </p>
                  <p style={{ fontSize: 10, color: palette.textSub, margin: 0 }}>
                    {user?.role || "—"}
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
                    border: `2px solid ${palette.panelBorder}`,
                  }}
                  alt="Avatar"
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: themeMode === "dark" ? "rgba(143,191,166,.18)" : "rgba(79,100,91,.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: palette.brandStrong,
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {ch}
                </div>
              )}
            </div>
          </div>
        </header>

        <main
          style={{
            marginLeft: isMobile ? 0 : SIDEBAR_WIDTH,
            width: isMobile ? "100%" : `calc(100% - ${SIDEBAR_WIDTH}px)`,
            paddingTop: 64,
            minHeight: "100vh",
            overflowX: "hidden",
          }}
        >
          <div style={{ padding: isMobile ? 16 : 32, overflowX: "hidden" }}>
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
}
