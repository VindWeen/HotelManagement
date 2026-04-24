import { useCallback, useEffect, useMemo, useState } from "react";
import { getMemberships } from "../../api/membershipsApi";
import {
  getLoyaltyMemberById,
  getLoyaltyMemberTransactions,
  getLoyaltyMembers,
} from "../../api/loyaltyMembersApi";
import { useResponsiveAdmin } from "../../hooks/useResponsiveAdmin";

const card = {
  background: "var(--a-surface)",
  border: "1px solid var(--a-border)",
  borderRadius: 20,
  boxShadow: "var(--a-shadow-sm)",
};

const input = {
  width: "100%",
  background: "var(--a-surface-raised)",
  border: "1px solid var(--a-border)",
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

const label = {
  display: "block",
  marginBottom: 8,
  color: "var(--a-text-muted)",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: ".12em",
};

const primaryBtn = {
  background: "var(--a-primary)",
  color: "var(--a-text-inverse)",
  border: "1px solid transparent",
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

const ghostBtn = {
  padding: "10px 22px",
  borderRadius: 12,
  border: "1px solid var(--a-border)",
  background: "var(--a-surface)",
  color: "var(--a-text-muted)",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.15s",
};

const sortOptions = [
  ["loyaltyPoints-desc", "Điểm tích lũy giảm dần"],
  ["loyaltyPoints-asc", "Điểm tích lũy tăng dần"],
  ["usablePoints-desc", "Điểm khả dụng giảm dần"],
  ["createdAt-desc", "Mới tham gia gần đây"],
  ["fullname-asc", "Tên A-Z"],
  ["tier-asc", "Hạng A-Z"],
];

const statThemes = {
  spotlight: {
    background: "var(--a-emphasis-bg)",
    border: "color-mix(in srgb, var(--a-primary) 22%, transparent)",
    title: "var(--a-emphasis-muted)",
    value: "var(--a-emphasis-text)",
    helper: "var(--a-emphasis-muted)",
    orb: "color-mix(in srgb, var(--a-primary) 18%, transparent)",
  },
  members: {
    background: "var(--a-warning-bg)",
    border: "var(--a-warning-border)",
    title: "var(--a-warning)",
    value: "var(--a-warning)",
    helper: "var(--a-warning)",
    orb: "color-mix(in srgb, var(--a-warning) 18%, transparent)",
  },
  points: {
    background: "var(--a-info-bg)",
    border: "var(--a-info-border)",
    title: "var(--a-info)",
    value: "var(--a-info)",
    helper: "var(--a-info)",
    orb: "color-mix(in srgb, var(--a-info) 18%, transparent)",
  },
  usable: {
    background: "var(--a-success-bg)",
    border: "var(--a-success-border)",
    title: "var(--a-success)",
    value: "var(--a-success)",
    helper: "var(--a-success)",
    orb: "color-mix(in srgb, var(--a-success) 18%, transparent)",
  },
  active: {
    background: "var(--a-brand-bg)",
    border: "var(--a-brand-border)",
    title: "var(--a-brand-ink)",
    value: "var(--a-brand-ink)",
    helper: "var(--a-brand-ink)",
    orb: "color-mix(in srgb, var(--a-primary) 16%, transparent)",
  },
};

const hexToRgb = (hex) => {
  const normalized = String(hex || "").trim().replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const rgbaFromHex = (hex, alpha) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const fmt = (v) => Number(v || 0).toLocaleString("vi-VN");
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("vi-VN") : "—");
const fmtDateTime = (v) => (v ? new Date(v).toLocaleString("vi-VN") : "—");

const statusMeta = (s) =>
  s === true
    ? {
        label: "Hoạt động",
        bg: "var(--a-success-bg)",
        color: "var(--a-success)",
        border: "var(--a-success-border)",
      }
    : {
        label: "Đã khóa",
        bg: "var(--a-surface-raised)",
        color: "var(--a-text-muted)",
        border: "var(--a-border)",
      };

const txMeta = (type, points) => {
  const normalized = String(type || "").toLowerCase();
  if (points > 0 || normalized === "earned") {
    return {
      label: "Cộng điểm",
      bg: "var(--a-success-bg)",
      color: "var(--a-success)",
      border: "var(--a-success-border)",
      sign: "+",
    };
  }
  if (normalized === "expired") {
    return {
      label: "Hết hạn",
      bg: "var(--a-warning-bg)",
      color: "var(--a-warning)",
      border: "var(--a-warning-border)",
      sign: "",
    };
  }
  return {
    label: "Trừ điểm",
    bg: "var(--a-error-bg)",
    color: "var(--a-error)",
    border: "var(--a-error-border)",
    sign: "",
  };
};

const getTierTheme = (name, colorHex) => {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized || normalized.includes("chưa có hạng")) {
    return {
      background: "var(--a-surface-raised)",
      border: "var(--a-border)",
      text: "var(--a-text-muted)",
      dot: colorHex || "var(--a-text-soft)",
      subtle: "var(--a-text-soft)",
    };
  }

  let baseColor = colorHex;

  if (!baseColor) {
    if (normalized.includes("gold") || normalized.includes("vàng")) baseColor = "#eab308";
    else if (normalized.includes("silver") || normalized.includes("bạc")) baseColor = "#94a3b8";
    else if (normalized.includes("bronze") || normalized.includes("đồng")) baseColor = "#c2410c";
    else if (normalized.includes("platinum") || normalized.includes("bạch kim")) baseColor = "#cbd5e1";
    else if (normalized.includes("diamond") || normalized.includes("kim cương")) baseColor = "#22d3ee";
    else if (normalized.includes("elite")) baseColor = "#8b5cf6";
    else if (normalized.includes("vvip")) baseColor = "#e11d48";
    else if (normalized.includes("vip")) baseColor = "#f97316";
    else if (normalized.includes("signature")) baseColor = "#14b8a6";
    else if (normalized.includes("guest") || normalized.includes("new") || normalized.includes("khách mới")) baseColor = "#9ca3af";
    else baseColor = "#a5d6a7";
  }

  return {
    background: rgbaFromHex(baseColor, 0.14) || "var(--a-brand-bg)",
    border: rgbaFromHex(baseColor, 0.28) || "var(--a-brand-border)",
    text: baseColor,
    dot: baseColor,
    subtle: rgbaFromHex(baseColor, 0.92) || baseColor,
  };
};

function TierBadge({ name, colorHex }) {
  const theme = getTierTheme(name, colorHex);
  return (
    <span
      className="tier-badge-text-p"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        background: theme.background,
        border: `1px solid ${theme.border}`,
        color: theme.text,
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: theme.dot,
          border: "1px solid rgba(0,0,0,.08)",
        }}
      />
      {name || "Chưa có hạng"}
    </span>
  );
}

function Stat({ title, value, helper, theme }) {
  const colors = statThemes[theme] || statThemes.members;
  return (
    <article
      style={{
        ...card,
        padding: 20,
        position: "relative",
        overflow: "hidden",
        background: colors.background,
        border: `1px solid ${colors.border}`,
        boxShadow: `0 16px 34px ${colors.orb}`,
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -24,
          bottom: -34,
          width: 118,
          height: 118,
          borderRadius: "50%",
          background: colors.orb,
        }}
      />
      <div style={{ position: "relative" }}>
        <div style={{ color: colors.title, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em" }}>{title}</div>
        <div style={{ marginTop: 10, color: colors.value, fontWeight: 800, fontSize: 30 }}>{value}</div>
        <div style={{ marginTop: 8, color: colors.helper, fontSize: 13 }}>{helper}</div>
      </div>
    </article>
  );
}

export default function MembershipPage() {
  const { isMobile } = useResponsiveAdmin();
  const [tiers, setTiers] = useState([]);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ totalMembers: 0, totalPoints: 0, totalUsablePoints: 0, activeMembers: 0, lockedMembers: 0, tierBreakdown: [] });
  const [pagination, setPagination] = useState({ currentPage: 1, totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ keyword: "", membershipId: "", status: "", minPoints: "", maxPoints: "", sort: "loyaltyPoints-desc" });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [member, setMember] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txSummary, setTxSummary] = useState({ totalTransactions: 0, earnedPoints: 0, spentPoints: 0 });

  useEffect(() => {
    let active = true;
    getMemberships({ page: 1, pageSize: 100 })
      .then((res) => {
        if (active) setTiers(res.data?.data || []);
      })
      .catch(() => {
        if (active) setTiers([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const sort = useMemo(() => {
    const [sortBy, sortDir] = filters.sort.split("-");
    return { sortBy, sortDir };
  }, [filters.sort]);

  const tierColorMap = useMemo(
    () =>
      Object.fromEntries(
        tiers.map((tier) => [String(tier.tierName || "").trim().toLowerCase(), tier.colorHex || null]),
      ),
    [tiers],
  );

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await getLoyaltyMembers({
        page,
        pageSize: 10,
        keyword: filters.keyword.trim(),
        membershipId: filters.membershipId || null,
        status: filters.status || null,
        minPoints: filters.minPoints || null,
        maxPoints: filters.maxPoints || null,
        sortBy: sort.sortBy,
        sortDir: sort.sortDir,
      });
      setRows(res.data?.data || []);
      setSummary(res.data?.summary || { totalMembers: 0, totalPoints: 0, totalUsablePoints: 0, activeMembers: 0, lockedMembers: 0, tierBreakdown: [] });
      setPagination(res.data?.pagination || { currentPage: 1, totalItems: 0, totalPages: 0 });
    } catch (error) {
      setRows([]);
      setSummary({ totalMembers: 0, totalPoints: 0, totalUsablePoints: 0, activeMembers: 0, lockedMembers: 0, tierBreakdown: [] });
      setErrorMessage(error?.response?.data?.message || "Không thể tải danh sách khách hàng thành viên.");
    } finally {
      setLoading(false);
    }
  }, [filters.keyword, filters.membershipId, filters.status, filters.minPoints, filters.maxPoints, page, sort.sortBy, sort.sortDir]);

  useEffect(() => {
    const timer = setTimeout(() => loadMembers(), 220);
    return () => clearTimeout(timer);
  }, [loadMembers]);

  useEffect(() => {
    setPage(1);
  }, [filters.keyword, filters.membershipId, filters.status, filters.minPoints, filters.maxPoints, filters.sort]);

  const resetFilters = () => {
    setFilters({ keyword: "", membershipId: "", status: "", minPoints: "", maxPoints: "", sort: "loyaltyPoints-desc" });
  };

  const openDetail = async (id) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setMember(null);
    setTransactions([]);
    try {
      const [memberRes, txRes] = await Promise.all([
        getLoyaltyMemberById(id),
        getLoyaltyMemberTransactions(id),
      ]);
      setMember(memberRes.data || null);
      setTransactions(txRes.data?.data || []);
      setTxSummary(txRes.data?.summary || { totalTransactions: 0, earnedPoints: 0, spentPoints: 0 });
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Không thể tải chi tiết loyalty member.");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = Math.max(1, pagination.totalPages || 1);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', sans-serif; }
        .membership-row { transition: background-color .16s ease; }
        .membership-row:hover td { background: color-mix(in srgb, var(--a-primary) 6%, var(--a-surface)); }
        .membership-icon-btn {
          padding: 8px;
          color: var(--a-text-soft);
          background: none;
          border: none;
          cursor: pointer;
          border-radius: 8px;
          transition: all .15s;
        }
        .membership-icon-btn:hover {
          background: var(--a-primary-muted);
          color: var(--a-primary);
        }
        .membership-ghost:hover {
          background: var(--a-primary-muted) !important;
          color: var(--a-primary) !important;
          border-color: var(--a-border-strong) !important;
        }
        .membership-primary:hover {
          background: var(--a-primary-hover) !important;
        }
        .membership-page [style*="background: white"],
        .membership-page [style*="background:white"],
        .membership-page [style*="background: #fff"],
        .membership-page [style*="background:#fff"],
        .membership-page [style*="background: #ffffff"],
        .membership-page [style*="background:#ffffff"] {
          background: var(--a-surface) !important;
        }
        .membership-page [style*="background: #f9f8f3"],
        .membership-page [style*="background:#f9f8f3"],
        .membership-page [style*="background: #faf8f3"],
        .membership-page [style*="background:#faf8f3"],
        .membership-page [style*="background: #f8f6f1"],
        .membership-page [style*="background:#f8f6f1"] {
          background: var(--a-surface-raised) !important;
        }
        .membership-page [style*="border: 1px solid #f1f0ea"],
        .membership-page [style*="border:1px solid #f1f0ea"],
        .membership-page [style*="borderBottom: 1px solid #f1f0ea"],
        .membership-page [style*="borderBottom: 1px solid #f1ece2"],
        .membership-page [style*="borderLeft: 1px solid #efe7dc"],
        .membership-page [style*="border: 1px solid #efe9de"],
        .membership-page [style*="border: 1px solid #efe7dc"] {
          border-color: var(--a-border) !important;
        }
        .membership-page [style*="color: #1c1917"],
        .membership-page [style*="color:#1c1917"],
        .membership-page [style*="color: #292524"],
        .membership-page [style*="color:#292524"],
        .membership-page [style*="color: #1f2937"],
        .membership-page [style*="color:#1f2937"] {
          color: var(--a-text) !important;
        }
        .membership-page [style*="color: #6b7280"],
        .membership-page [style*="color:#6b7280"],
        .membership-page [style*="color: #78716c"],
        .membership-page [style*="color:#78716c"],
        .membership-page [style*="color: #57534e"],
        .membership-page [style*="color:#57534e"],
        .membership-page [style*="color: #44403c"],
        .membership-page [style*="color:#44403c"] {
          color: var(--a-text-muted) !important;
        }
        .membership-page [style*="color: #9ca3af"],
        .membership-page [style*="color:#9ca3af"],
        .membership-page [style*="color: #a8a29e"],
        .membership-page [style*="color:#a8a29e"] {
          color: var(--a-text-soft) !important;
        }
        .membership-page [style*="color: #0f766e"],
        .membership-page [style*="color:#0f766e"],
        .membership-page [style*="color: #047857"],
        .membership-page [style*="color:#047857"],
        .membership-page [style*="color: #14532d"],
        .membership-page [style*="color:#14532d"] {
          color: var(--a-success) !important;
        }
        .membership-page [style*="color: #b91c1c"],
        .membership-page [style*="color:#b91c1c"],
        .membership-page [style*="color: #be123c"],
        .membership-page [style*="color:#be123c"] {
          color: var(--a-error) !important;
        }
        .membership-page [style*="background: #fff7f7"],
        .membership-page [style*="background:#fff7f7"],
        .membership-page [style*="background: #fef2f2"],
        .membership-page [style*="background:#fef2f2"] {
          background: var(--a-error-bg) !important;
        }
        .membership-page [style*="borderColor: #fecaca"],
        .membership-page [style*="borderColor:#fecaca"] {
          border-color: var(--a-error-border) !important;
        }
      `}</style>
      <div className="membership-page" style={{ maxWidth: 1360, margin: "0 auto", paddingInline: isMobile ? 4 : 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 28, color: "var(--a-text)", fontWeight: 800 }}>Khách hàng thành viên</h2>
            <p style={{ margin: "8px 0 0", color: "var(--a-text-muted)", fontSize: 14, maxWidth: 760, lineHeight: 1.65 }}>
              Theo dõi khách hàng có hạng thành viên hoặc đã phát sinh điểm loyalty, xem phân bố theo hạng và lịch sử cộng trừ điểm của từng người.
            </p>
          </div>
          <div style={{ ...card, padding: "14px 16px", minWidth: 260, background: statThemes.spotlight.background, border: `1px solid ${statThemes.spotlight.border}`, boxShadow: "var(--a-shadow-md)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", background: statThemes.spotlight.orb, right: -30, top: -34 }} />
            <div style={{ position: "relative" }}>
              <div style={{ color: statThemes.spotlight.title, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em" }}>Tổng đang theo dõi</div>
              <div style={{ marginTop: 8, color: statThemes.spotlight.value, fontSize: 28, fontWeight: 800 }}>{fmt(summary.totalMembers)}</div>
              <div style={{ marginTop: 6, color: statThemes.spotlight.helper, fontSize: 13 }}>{fmt(summary.activeMembers)} hoạt động, {fmt(summary.lockedMembers)} đã khóa</div>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div style={{ ...card, marginBottom: 20, padding: 14, color: "var(--a-error)", background: "var(--a-error-bg)", borderColor: "var(--a-error-border)" }}>
            {errorMessage}
          </div>
        ) : null}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Stat title="Member Loyalty" value={fmt(summary.totalMembers)} helper="User có hạng thành viên hoặc có điểm loyalty." theme="members" />
          <Stat title="Tổng Điểm Tích Lũy" value={fmt(summary.totalPoints)} helper="Tổng điểm đang ghi nhận trên toàn bộ member." theme="points" />
          <Stat title="Điểm Khả Dụng" value={fmt(summary.totalUsablePoints)} helper="Phần điểm khách có thể sử dụng hiện tại." theme="usable" />
          <Stat title="Tỷ Lệ Hoạt Động" value={`${summary.totalMembers ? Math.round((summary.activeMembers / summary.totalMembers) * 100) : 0}%`} helper="Tỷ lệ account loyalty member còn hoạt động." theme="active" />
        </section>

        <section style={{ ...card, padding: 24, marginBottom: 24 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
            <div>
              <label style={label}>Tìm khách hàng</label>
              <input value={filters.keyword} onChange={(e) => setFilters((p) => ({ ...p, keyword: e.target.value }))} style={input} placeholder="Tên, email, điện thoại hoặc hạng..." />
            </div>
            <div>
              <label style={label}>Hạng thành viên</label>
              <select value={filters.membershipId} onChange={(e) => setFilters((p) => ({ ...p, membershipId: e.target.value }))} style={input}>
                <option value="">Tất cả hạng</option>
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>{t.tierName}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>Trạng thái</label>
              <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} style={input}>
                <option value="">Tất cả trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="locked">Đã khóa</option>
              </select>
            </div>
            <div>
              <label style={label}>Điểm từ</label>
              <input type="number" min="0" value={filters.minPoints} onChange={(e) => setFilters((p) => ({ ...p, minPoints: e.target.value }))} style={input} placeholder="0" />
            </div>
            <div>
              <label style={label}>Điểm đến</label>
              <input type="number" min="0" value={filters.maxPoints} onChange={(e) => setFilters((p) => ({ ...p, maxPoints: e.target.value }))} style={input} placeholder="100000" />
            </div>
            <div>
              <label style={label}>Sắp xếp</label>
              <select value={filters.sort} onChange={(e) => setFilters((p) => ({ ...p, sort: e.target.value }))} style={input}>
                {sortOptions.map(([value, text]) => (
                  <option key={value} value={value}>{text}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ color: "var(--a-text-muted)", fontSize: 13 }}>Trang chỉ hiển thị user có hạng thành viên hoặc đã phát sinh điểm loyalty.</div>
            <button type="button" className="membership-ghost" style={ghostBtn} onClick={resetFilters}>Xóa bộ lọc</button>
          </div>
        </section>

        <section className="flex flex-col xl:flex-row gap-4 items-start">
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--a-border)" }}>
              <strong style={{ color: "var(--a-text)", fontSize: 16 }}>Danh sách loyalty member</strong>
              <p style={{ margin: "6px 0 0", color: "var(--a-text-muted)", fontSize: 13 }}>Hiển thị {fmt(rows.length)} / {fmt(pagination.totalItems)} khách hàng thành viên.</p>
            </div>
            {isMobile ? (
              <div style={{ display: "grid", gap: 12, padding: 14 }}>
                {loading ? <div style={{ padding: 28, textAlign: "center", color: "var(--a-text-muted)" }}>Dang tai du lieu loyalty...</div> : null}
                {!loading && rows.length === 0 ? <div style={{ padding: 28, textAlign: "center", color: "var(--a-text-muted)" }}>Khong co khach hang nao khop voi bo loc hien tai.</div> : null}
                {!loading && rows.map((row) => {
                  const status = statusMeta(row.status);
                  return (
                    <article key={row.id} style={{ border: "1px solid var(--a-border)", borderRadius: 16, padding: 14, display: "grid", gap: 12, background: "var(--a-surface)" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ width: 44, height: 44, borderRadius: 999, background: "var(--a-primary-soft)", color: "var(--a-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flexShrink: 0, border: "1px solid color-mix(in srgb, var(--a-primary) 22%, transparent)" }}>
                          {(row.fullName || "?").charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ color: "var(--a-text)", fontWeight: 900, fontSize: 16 }}>{row.fullName}</div>
                          <div style={{ color: "var(--a-text-muted)", fontSize: 13, overflowWrap: "anywhere" }}>{row.email || "-"}</div>
                          <div style={{ color: "var(--a-text-soft)", fontSize: 12 }}>{row.phone || "Chua co so dien thoai"}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <TierBadge name={row.membershipTier} colorHex={row.membershipColor} />
                        <span style={{ display: "inline-flex", padding: "6px 10px", borderRadius: 999, fontSize: 10, fontWeight: 900, background: status.bg, color: status.color, border: `1px solid ${status.border || "transparent"}`, textTransform: "uppercase" }}>{status.label}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div style={{ background: "var(--a-surface-raised)", borderRadius: 12, padding: 10 }}>
                          <div style={{ color: "var(--a-text-soft)", fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>Tích lũy</div>
                          <div style={{ marginTop: 4, color: "var(--a-text)", fontWeight: 900 }}>{fmt(row.loyaltyPoints)}</div>
                        </div>
                        <div style={{ background: "var(--a-surface-raised)", borderRadius: 12, padding: 10 }}>
                          <div style={{ color: "var(--a-text-soft)", fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>Khả dụng</div>
                          <div style={{ marginTop: 4, color: "var(--a-success)", fontWeight: 900 }}>{fmt(row.loyaltyPointsUsable)}</div>
                        </div>
                      </div>
                      <div style={{ color: "var(--a-text-muted)", fontSize: 12 }}>Giao dịch: {fmt(row.transactionCount)} - Tham gia: {fmtDate(row.createdAt)}</div>
                      <button type="button" className="membership-primary" onClick={() => openDetail(row.id)} style={{ ...primaryBtn, width: "100%", justifyContent: "center" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>visibility</span>
                        Xem chi tiết
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--a-surface-raised)", borderBottom: "1px solid var(--a-border)" }}>
                    {["Khách hàng", "Hạng", "Điểm tích lũy", "Điểm khả dụng", "Giao dịch", "Trạng thái", "Ngày tham gia", "Thao tác"].map((h) => (
                      <th key={h} style={{ padding: "15px 24px", textAlign: "center", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--a-text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={8} style={{ padding: 48, textAlign: "center", color: "var(--a-text-muted)" }}>Đang tải dữ liệu loyalty...</td></tr> : null}
                  {!loading && rows.length === 0 ? <tr><td colSpan={8} style={{ padding: 48, textAlign: "center", color: "var(--a-text-muted)" }}>Không có khách hàng nào khớp với bộ lọc hiện tại.</td></tr> : null}
                  {!loading && rows.map((row) => {
                    const status = statusMeta(row.status);
                    return (
                      <tr key={row.id} className="membership-row" style={{ borderBottom: "1px solid var(--a-border)" }}>
                        <td style={{ padding: "16px 24px" }}>
                          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <div style={{ width: 42, height: 42, borderRadius: 999, background: "var(--a-primary-soft)", color: "var(--a-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, border: "1px solid color-mix(in srgb, var(--a-primary) 22%, transparent)" }}>
                              {(row.fullName || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ color: "var(--a-text)", fontWeight: 700, fontSize: 14 }}>{row.fullName}</div>
                              <div style={{ color: "var(--a-text-muted)", fontSize: 14 }}>{row.email || "—"}</div>
                              <div style={{ color: "var(--a-text-soft)", fontSize: 12 }}>{row.phone || "Chưa có số điện thoại"}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "16px 24px" }}><TierBadge name={row.membershipTier} colorHex={row.membershipColor} /></td>
                        <td style={{ padding: "16px 24px", color: "var(--a-text)", fontWeight: 800, fontSize: 14 }}>{fmt(row.loyaltyPoints)}</td>
                        <td style={{ padding: "16px 24px", color: "var(--a-success)", fontWeight: 800, fontSize: 14 }}>{fmt(row.loyaltyPointsUsable)}</td>
                        <td style={{ padding: "16px 24px", color: "var(--a-text-muted)", fontSize: 14 }}>{fmt(row.transactionCount)}</td>
                        <td style={{ padding: "16px 24px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: 96,
                              padding: "6px 12px",
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 800,
                              lineHeight: 1,
                              whiteSpace: "nowrap",
                              background: status.bg,
                              color: status.color,
                              border: `1px solid ${status.border || "transparent"}`,
                              textTransform: "uppercase",
                              textAlign: "center",
                            }}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td style={{ padding: "16px 24px", color: "var(--a-text-muted)", fontSize: 14 }}><div>{fmtDate(row.createdAt)}</div><div style={{ color: "var(--a-text-soft)", fontSize: 12 }}>Cập nhật: {fmtDate(row.updatedAt)}</div></td>
                        <td style={{ padding: "16px 24px", textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                            <button
                              type="button"
                              onClick={() => openDetail(row.id)}
                              className="membership-icon-btn"
                              title="Xem chi tiết"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                                visibility
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--a-border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ color: "var(--a-text-muted)", fontSize: 13 }}>Trang {pagination.currentPage || 1} / {totalPages}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ ...ghostBtn, opacity: page <= 1 ? 0.5 : 1 }}>Trang trước</button>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} style={{ ...ghostBtn, opacity: page >= totalPages ? 0.5 : 1 }}>Trang sau</button>
              </div>
            </div>
          </div>

          <aside className="w-full xl:w-[250px] shrink-0" style={{ ...card, padding: 20 }}>
            <div style={{ color: "var(--a-text)", fontSize: 16, fontWeight: 800 }}>Phân bố theo hạng</div>
            <p style={{ margin: "6px 0 18px", color: "var(--a-text-muted)", fontSize: 13, lineHeight: 1.6 }}>Snapshot nhanh để xem member đang tập trung ở hạng nào và tổng điểm đi kèm.</p>
            <div style={{ display: "grid", gap: 12 }}>
              {(summary.tierBreakdown || []).length === 0 ? <div style={{ color: "var(--a-text-soft)", fontSize: 14 }}>Chưa có dữ liệu breakdown.</div> : summary.tierBreakdown.map((item) => {
                const theme = getTierTheme(
                  item.tierName,
                  tierColorMap[String(item.tierName || "").trim().toLowerCase()],
                );
                return (
                  <div key={item.tierName} style={{ border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14, background: theme.background }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 999, background: theme.dot, border: "1px solid rgba(0,0,0,.08)" }} />
                      <div className="tier-badge-text-p" style={{ color: theme.text, fontWeight: 800, fontSize: 14 }}>{item.tierName}</div>
                    </div>
                    <div className="tier-badge-text-p" style={{ marginTop: 8, color: theme.subtle, fontSize: 13 }}>{fmt(item.memberCount)} member</div>
                    <div className="tier-badge-text-p" style={{ marginTop: 4, color: theme.subtle, fontSize: 13 }}>{fmt(item.totalPoints)} điểm tích lũy</div>
                    <div className="tier-badge-text-p" style={{ marginTop: 4, color: theme.text, fontSize: 13, fontWeight: 700 }}>{fmt(item.totalUsablePoints)} điểm khả dụng</div>
                  </div>
                );
              })}
            </div>
          </aside>
        </section>
      </div>

      {detailOpen ? (
        <div style={{ position: "fixed", inset: 0, background: "var(--a-overlay)", backdropFilter: "blur(6px)", display: "flex", justifyContent: "flex-end", zIndex: 120 }} onClick={() => setDetailOpen(false)}>
          <div className="primary-card-p" style={{ width: "min(720px,100%)", height: "100vh", background: "var(--a-surface)", borderLeft: "1px solid var(--a-border)", overflowY: "auto", boxShadow: "var(--a-shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "24px 24px 18px", borderBottom: "1px solid var(--a-border)", display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ color: "var(--a-text-muted)", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em" }}>Loyalty Member Detail</div>
                <h3 style={{ margin: "8px 0 0", fontSize: 24, color: "var(--a-text)" }}>{member?.fullName || "Đang tải..."}</h3>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--a-text-muted)" }}>Hồ sơ loyalty và lịch sử cộng trừ điểm của khách hàng.</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                aria-label="Đóng chi tiết khách hàng"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  border: "1px solid var(--a-border)",
                  background: "var(--a-surface)",
                  color: "var(--a-text-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>

            {detailLoading ? <div style={{ padding: 40, color: "var(--a-text-muted)", textAlign: "center" }}>Đang tải chi tiết loyalty member...</div> : null}
            {!detailLoading && member ? (
              <div style={{ padding: 24 }}>
                <div style={{ ...card, padding: 20, marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ color: "var(--a-text)", fontSize: 22, fontWeight: 800 }}>{member.fullName}</div>
                      <div style={{ marginTop: 6, color: "var(--a-text-muted)", fontSize: 14 }}>{member.email || "—"}</div>
                      <div style={{ marginTop: 6, color: "var(--a-text-muted)", fontSize: 14 }}>{member.phone || "Chưa có số điện thoại"}</div>
                    </div>
                    <div style={{ display: "grid", gap: 10 }}>
                      <TierBadge name={member.membershipTier} colorHex={member.membershipColor} />
                      <span style={{ padding: "6px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: statusMeta(member.status).bg, color: statusMeta(member.status).color, border: `1px solid ${statusMeta(member.status).border || "transparent"}`, textTransform: "uppercase" }}>{statusMeta(member.status).label}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
                    {[
                      ["Điểm tích lũy", fmt(member.loyaltyPoints)],
                      ["Điểm khả dụng", fmt(member.loyaltyPointsUsable)],
                      ["Tổng giao dịch", fmt(member.transactionCount)],
                      ["Tổng booking", fmt(member.bookingCount)],
                      ["Booking hoàn tất", fmt(member.completedBookingCount)],
                      ["Lượt review", fmt(member.reviewCount)],
                      ["Lượt dùng voucher", fmt(member.voucherUsageCount)],
                      ["Giảm giá hạng", member.membershipDiscount != null ? `${member.membershipDiscount}%` : "—"],
                      ["Ngày tham gia", fmtDateTime(member.createdAt)],
                      ["Giao dịch gần nhất", fmtDateTime(member.lastTransactionAt)],
                      ["Giới tính", member.gender || "—"],
                      ["Ngày sinh", member.dateOfBirth || "—"],
                      ["CCCD / Hộ chiếu", member.nationalId || "—"],
                      ["Địa chỉ", member.address || "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="sub-card-p" style={{ background: "var(--a-surface-raised)", borderRadius: 14, padding: 12 }}>
                        <div style={{ color: "var(--a-text-soft)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 800 }}>{k}</div>
                        <div style={{ marginTop: 6, color: "var(--a-text)", fontSize: 14, fontWeight: 700 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ ...card, padding: 20 }}>
                  <div style={{ color: "var(--a-text)", fontWeight: 800, fontSize: 18 }}>Lịch sử cộng trừ điểm</div>
                  <div style={{ marginTop: 6, color: "var(--a-text-muted)", fontSize: 13 }}>{fmt(txSummary.totalTransactions)} giao dịch, cộng {fmt(txSummary.earnedPoints)} điểm, đã trừ {fmt(txSummary.spentPoints)} điểm.</div>
                  <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                    {transactions.length === 0 ? <div style={{ color: "var(--a-text-muted)" }}>Khách hàng này chưa có giao dịch loyalty nào.</div> : transactions.map((item) => {
                      const meta = txMeta(item.transactionType, item.points);
                      return (
                        <div key={item.id} className="sub-card-p" style={{ border: "1px solid var(--a-border)", borderRadius: 16, padding: 16, background: "var(--a-surface)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                            <div>
                              <span style={{ display: "inline-flex", padding: "5px 10px", borderRadius: 999, background: meta.bg, color: meta.color, border: `1px solid ${meta.border || "transparent"}`, fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{meta.label}</span>
                              <div style={{ marginTop: 10, color: "var(--a-text)", fontSize: 16, fontWeight: 800 }}>{meta.sign}{fmt(item.points)} điểm</div>
                              <div style={{ marginTop: 6, color: "var(--a-text-muted)", fontSize: 13 }}>Số dư sau giao dịch: {fmt(item.balanceAfter)} điểm</div>
                            </div>
                            <div style={{ textAlign: "right", color: "var(--a-text-muted)", fontSize: 13 }}>
                              <div>{fmtDateTime(item.createdAt)}</div>
                              <div style={{ marginTop: 6 }}>Booking: {item.bookingCode || (item.bookingId ? `#${item.bookingId}` : "—")}</div>
                            </div>
                          </div>
                          {item.note ? <div style={{ marginTop: 12, color: "var(--a-text-muted)", fontSize: 14, lineHeight: 1.6 }}>{item.note}</div> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ ...card, padding: 20, marginTop: 18 }}>
                  <div style={{ color: "var(--a-text)", fontWeight: 800, fontSize: 18 }}>Tóm tắt CRM nội bộ</div>
                  <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
                    <div>
                      <div style={{ color: "var(--a-text-muted)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Booking gần đây</div>
                      {(member.recentBookings || []).length === 0 ? (
                        <div style={{ color: "var(--a-text-soft)", fontSize: 14 }}>Chưa có booking gần đây.</div>
                      ) : (
                        <div style={{ display: "grid", gap: 10 }}>
                          {member.recentBookings.map((item) => (
                            <div key={`${item.bookingCode}-${item.id}`} className="sub-card-p" style={{ border: "1px solid var(--a-border)", borderRadius: 14, padding: 12, background: "var(--a-surface)" }}>
                              <div style={{ color: "var(--a-text)", fontWeight: 800 }}>{item.bookingCode}</div>
                              <div style={{ marginTop: 4, color: "var(--a-text-muted)", fontSize: 13 }}>{item.status} • {fmtDateTime(item.checkInDate || item.createdAt)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ color: "var(--a-text-muted)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Review gần đây</div>
                      {(member.recentReviews || []).length === 0 ? (
                        <div style={{ color: "var(--a-text-soft)", fontSize: 14 }}>Chưa có review gần đây.</div>
                      ) : (
                        <div style={{ display: "grid", gap: 10 }}>
                          {member.recentReviews.map((item) => (
                            <div key={item.id} style={{ border: "1px solid var(--a-border)", borderRadius: 14, padding: 12, background: "var(--a-surface)" }}>
                              <div style={{ color: "var(--a-text)", fontWeight: 800 }}>Đánh giá {item.rating || 0}/5</div>
                              <div style={{ marginTop: 4, color: "var(--a-text-muted)", fontSize: 13 }}>{fmtDateTime(item.createdAt)}</div>
                              <div style={{ marginTop: 8, color: "var(--a-text-muted)", fontSize: 14 }}>{item.comment || "Không có nội dung."}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ color: "var(--a-text-muted)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Voucher gần dùng</div>
                      {(member.recentVoucherUsage || []).length === 0 ? (
                        <div style={{ color: "var(--a-text-soft)", fontSize: 14 }}>Chưa phát sinh voucher usage.</div>
                      ) : (
                        <div style={{ display: "grid", gap: 10 }}>
                          {member.recentVoucherUsage.map((item) => (
                            <div key={item.id} style={{ border: "1px solid var(--a-border)", borderRadius: 14, padding: 12, background: "var(--a-surface)" }}>
                              <div style={{ color: "var(--a-text)", fontWeight: 800 }}>{item.voucherCode || `Voucher #${item.voucherId}`}</div>
                              <div style={{ marginTop: 4, color: "var(--a-text-muted)", fontSize: 13 }}>{fmtDateTime(item.usedAt || item.createdAt)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
