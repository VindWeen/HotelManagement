import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  exportAllAuditLogs,
  exportAuditLogs,
  getAuditLogFilterOptions,
  getAuditLogHistory,
} from "../../api/auditLogsApi";
import { useResponsiveAdmin } from "../../hooks/useResponsiveAdmin";
import { useAdminAuthStore } from "../../store/adminAuthStore";

const panelStyle = {
  background: "var(--a-surface)",
  borderRadius: 16,
  boxShadow: "var(--a-shadow-sm)",
  border: "1px solid var(--a-border)",
};

const inputStyle = {
  width: "100%",
  background: "var(--a-surface-raised)",
  border: "1px solid var(--a-border-strong)",
  borderRadius: 12,
  padding: "10px 16px",
  fontSize: 14,
  color: "var(--a-text)",
  outline: "none",
  boxSizing: "border-box",
  minHeight: 42,
};

const fieldLabelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "var(--a-text-muted)",
  marginBottom: 8,
};

function normalizeEmployeeOptions(payload) {
  const sources = [
    payload?.users,
    payload?.employees,
    payload?.data?.users,
    payload?.data?.employees,
    payload?.data,
    payload,
  ];

  const rawList = sources.find((item) => Array.isArray(item)) || [];

  return rawList
    .map((employee) => {
      const userId =
        employee?.userId ??
        employee?.id ??
        employee?.staffId ??
        employee?.employeeId ??
        employee?.accountId;
      const userName =
        employee?.userName ??
        employee?.fullName ??
        employee?.name ??
        employee?.employeeName ??
        employee?.staffName;
      const roleName =
        employee?.roleName ??
        employee?.role ??
        employee?.roleCode ??
        employee?.departmentName ??
        "";

      if (!userId || !userName) return null;

      return {
        userId: String(userId),
        userName,
        roleName,
      };
    })
    .filter(Boolean);
}

function roleBadgeStyle(roleName) {
  if (roleName === "Admin") {
    return { background: "var(--a-info-bg)", color: "var(--a-info)" };
  }
  if (roleName === "Manager") {
    return { background: "var(--a-success-bg)", color: "var(--a-success)" };
  }
  if (roleName === "Housekeeping") {
    return { background: "var(--a-warning-bg)", color: "var(--a-warning)" };
  }
  return { background: "var(--a-surface-raised)", color: "var(--a-text-muted)" };
}

function actionTextStyle(actionType) {
  if (actionType === "DELETE") return { color: "var(--a-warning)" };
  if (actionType === "PATCH") return { color: "var(--a-brand-ink)" };
  if (actionType === "PUT" || actionType === "UPDATE") return { color: "var(--a-info)" };
  return { color: "var(--a-success)" };
}

function downloadBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default function AuditLogsPage() {
  const { isMobile } = useResponsiveAdmin();
  const currentUserRole = useAdminAuthStore((s) => s.user?.role);
  const canViewAll = currentUserRole === "Admin" || currentUserRole === "Manager";
  const [filters, setFilters] = useState({
    userId: "",
    date: "",
    month: "",
    year: new Date().getFullYear().toString(),
  });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 0 });
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [expandedIds, setExpandedIds] = useState({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, index) => String(now - index));
  }, []);

  const loadFilterOptions = useCallback(async () => {
    const res = await getAuditLogFilterOptions();
    setEmployees(normalizeEmployeeOptions(res.data));
  }, []);

  const loadRows = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize: pagination.pageSize,
      };
      if (filters.userId) params.userId = Number(filters.userId);
      if (filters.date) params.date = filters.date;
      if (filters.month) params.month = Number(filters.month);
      if (filters.year) params.year = Number(filters.year);

      const res = await getAuditLogHistory(params);
      setRows(res.data?.data || []);
      setPagination(res.data?.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.pageSize]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    loadRows(1);
  }, [loadRows]);

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExportFiltered = async () => {
    setExporting(true);
    try {
      const params = {};
      if (filters.userId) params.userId = Number(filters.userId);
      if (filters.date) params.date = filters.date;
      if (filters.month) params.month = Number(filters.month);
      if (filters.year) params.year = Number(filters.year);
      const res = await exportAuditLogs(params);
      downloadBlob(res.data, "audit-logs-filtered.xlsx");
    } finally {
      setExporting(false);
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const res = await exportAllAuditLogs();
      downloadBlob(res.data, "audit-logs-all.xlsx");
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      userId: "",
      date: "",
      month: "",
      year: new Date().getFullYear().toString(),
    });
  };

  const hasFilter = Boolean(filters.userId || filters.date || filters.month || filters.year);
  const start = pagination.total ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const end = pagination.total ? Math.min(pagination.page * pagination.pageSize, pagination.total) : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', sans-serif; }
      `}</style>
      <div style={{ maxWidth: 1400, margin: "0 auto", paddingInline: isMobile ? 4 : 0 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "var(--a-text)" }}>Nhật ký hoạt động</h1>
          <p style={{ margin: "4px 0 0", color: "var(--a-text-muted)", fontSize: 14 }}>
            {canViewAll
              ? "Theo dõi toàn bộ hoạt động trong hệ thống."
              : `Bạn chỉ xem được log của nhóm vai trò ${currentUserRole || "hiện tại"}.`}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
          <button
            onClick={handleExportFiltered}
            disabled={exporting}
            style={{
              padding: "8px 20px",
              width: isMobile ? "100%" : "auto",
              justifyContent: "center",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 800,
              background: "var(--a-surface)",
              color: "var(--a-text)",
              border: "1px solid var(--a-border)",
              cursor: exporting ? "not-allowed" : "pointer",
              boxShadow: "var(--a-shadow-sm)",
              opacity: exporting ? 0.7 : 1,
            }}
          >
            Xuất theo bộ lọc
          </button>
          <button
            onClick={handleExportAll}
            disabled={exporting}
            style={{
              padding: "8px 20px",
              width: isMobile ? "100%" : "auto",
              justifyContent: "center",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 800,
              background: "var(--a-emphasis-bg)",
              color: "var(--a-emphasis-text)",
              border: "none",
              cursor: exporting ? "not-allowed" : "pointer",
              boxShadow: "var(--a-shadow-sm)",
              opacity: exporting ? 0.7 : 1,
            }}
          >
            Xuất toàn bộ
          </button>
        </div>
      </div>

      <section style={{ ...panelStyle, padding: 24, marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(260px,1fr) 220px 180px 180px auto", gap: 16, alignItems: "flex-end" }}>
          <div>
            <label style={fieldLabelStyle}>Nhân viên</label>
            <select value={filters.userId} onChange={(e) => handleFilterChange("userId", e.target.value)} style={inputStyle}>
            <option value="">Lọc theo nhân viên</option>
            {employees.map((employee) => (
              <option key={employee.userId} value={employee.userId}>
                {employee.roleName ? `${employee.userName} - ${employee.roleName}` : employee.userName}
              </option>
            ))}
            </select>
          </div>

          <div>
            <label style={fieldLabelStyle}>Ngày</label>
            <input
            type="date"
            value={filters.date}
            onChange={(e) => handleFilterChange("date", e.target.value)}
            style={inputStyle}
            />
          </div>

          <div>
            <label style={fieldLabelStyle}>Tháng</label>
            <select value={filters.month} onChange={(e) => handleFilterChange("month", e.target.value)} style={inputStyle}>
            <option value="">Lọc theo tháng</option>
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                Tháng {index + 1}
              </option>
            ))}
            </select>
          </div>

          <div>
            <label style={fieldLabelStyle}>Năm</label>
            <select value={filters.year} onChange={(e) => handleFilterChange("year", e.target.value)} style={inputStyle}>
            <option value="">Lọc theo năm</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
            </select>
          </div>
          <button
            onClick={clearFilters}
            style={{
              background: "var(--a-surface-raised)",
              border: "1px solid var(--a-border)",
              color: "var(--a-text-muted)",
              padding: 10,
              borderRadius: 12,
              cursor: "pointer",
              minHeight: 42,
              width: isMobile ? "100%" : "auto",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Xóa bộ lọc"
          >
            <span className="material-symbols-outlined">tune</span>
          </button>
        </div>
      </section>

      <section style={{ ...panelStyle, overflow: "hidden" }}>
        {isMobile ? (
          <div style={{ display: "grid", gap: 12, padding: 14 }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--a-text-muted)" }}>Dang tai du lieu...</div>
            ) : rows.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--a-text-muted)" }}>Khong co log phu hop bo loc hien tai.</div>
            ) : rows.map((row) => {
              const badge = roleBadgeStyle(row.roleName);
              const expanded = !!expandedIds[row.id];
              return (
                <article key={row.id} style={{ border: "1px solid var(--a-border)", borderRadius: 16, padding: 14, background: expanded ? "var(--a-surface-raised)" : "var(--a-surface)", boxShadow: "var(--a-shadow-sm)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "var(--a-text-muted)", fontWeight: 800, marginBottom: 4 }}>{row.logDate}</div>
                      <div style={{ fontSize: 15, color: "var(--a-text)", fontWeight: 800 }}>{row.userName}</div>
                      <span style={{ display: "inline-flex", marginTop: 6, padding: "4px 9px", borderRadius: 999, fontSize: 10, fontWeight: 800, textTransform: "uppercase", ...badge }}>{row.roleName}</span>
                    </div>
                    <button onClick={() => toggleExpanded(row.id)} style={{ width: 36, height: 36, borderRadius: 12, border: "1px solid var(--a-border)", background: "var(--a-surface)", color: "var(--a-primary)", fontWeight: 900 }}>
                      {expanded ? "-" : "+"}
                    </button>
                  </div>
                  <p style={{ margin: "12px 0 0", color: "var(--a-text-muted)", fontSize: 13, lineHeight: 1.55 }}>{row.summary}</p>
                  {expanded ? (
                    <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                      {(row.events || []).map((event, index) => (
                        <div key={event.eventId || `${row.id}-${index}`} style={{ border: "1px solid var(--a-border)", borderRadius: 12, padding: 10, background: "var(--a-surface-raised)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: "var(--a-text)", fontWeight: 800 }}>{event.time}</span>
                            <span style={{ fontSize: 12, fontWeight: 900, ...actionTextStyle(event.actionType) }}>{event.actionType}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--a-text-muted)", fontWeight: 700, marginBottom: 4 }}>{event.entityType}</div>
                          <div style={{ fontSize: 13, color: "var(--a-text-muted)", lineHeight: 1.45 }}>{event.message}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--a-surface-raised)", borderBottom: "1px solid var(--a-border)", color: "var(--a-text)" }}>
                <th style={{ padding: "16px 18px", width: 56 }} />
                <th style={{ padding: "16px 18px", textAlign: "left", fontSize: 13, fontWeight: 800 }}>Ngày</th>
                <th style={{ padding: "16px 18px", textAlign: "left", fontSize: 13, fontWeight: 800 }}>Nhân viên</th>
                <th style={{ padding: "16px 18px", textAlign: "left", fontSize: 13, fontWeight: 800 }}>Tóm tắt hoạt động</th>
              </tr>
            </thead>
            <tbody style={{ borderTop: "1px solid var(--a-border)" }}>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: 28, textAlign: "center", color: "var(--a-text-muted)" }}>Đang tải dữ liệu...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 28, textAlign: "center", color: "var(--a-text-muted)" }}>Không có log phù hợp bộ lọc hiện tại.</td>
                </tr>
              ) : rows.map((row) => {
                const badge = roleBadgeStyle(row.roleName);
                const expanded = !!expandedIds[row.id];
                return (
                  <Fragment key={row.id}>
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: expanded ? "none" : "1px solid var(--a-divider)",
                        background: expanded ? "var(--a-surface-raised)" : "",
                        boxShadow: expanded ? "inset 3px 0 0 var(--a-primary)" : "none",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = expanded ? "var(--a-surface-raised)" : "color-mix(in srgb, var(--a-primary) 6%, var(--a-surface))";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = expanded ? "var(--a-surface-raised)" : "";
                      }}
                    >
                      <td style={{ padding: "16px 18px", verticalAlign: "top" }}>
                        <button
                          onClick={() => toggleExpanded(row.id)}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 999,
                            border: "1px solid var(--a-border)",
                            background: "var(--a-surface)",
                            cursor: "pointer",
                            color: "var(--a-primary)",
                            fontWeight: 700,
                            fontSize: 16,
                          }}
                        >
                          {expanded ? "-" : "+"}
                        </button>
                      </td>
                      <td style={{ padding: "16px 24px", verticalAlign: "top", fontWeight: 600, color: "var(--a-text)" }}>{row.logDate}</td>
                      <td style={{ padding: "16px 24px", verticalAlign: "top" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 500, color: "var(--a-text)", fontSize: 14 }}>{row.userName}</span>
                          <span style={{
                            display: "inline-flex",
                            width: "fit-content",
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontWeight: 700,
                            fontSize: 11,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            ...badge,
                          }}>
                            {row.roleName}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", verticalAlign: "top", color: "var(--a-text-muted)", fontSize: 14 }}>{row.summary}</td>
                    </tr>
                    {expanded ? (
                      <tr style={{ background: "var(--a-surface-raised)", borderBottom: "1px solid var(--a-border)" }}>
                        <td />
                        <td colSpan={3} style={{ padding: "0 24px 20px 40px" }}>
                          <div style={{ background: "var(--a-surface)", border: "1px solid var(--a-border)", borderRadius: 14, overflow: "hidden", borderLeft: "4px solid var(--a-primary)", boxShadow: "var(--a-shadow-sm)" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", background: "var(--a-brand-bg)", borderBottom: "1px solid var(--a-border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--a-brand-ink)" }}>
                                subdirectory_arrow_right
                              </span>
                              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--a-brand-ink)" }}>
                                Chi tiết hoạt động
                              </span>
                            </div>
                            <span style={{ fontSize: 12, color: "var(--a-text-muted)", fontWeight: 600 }}>
                              {row.events.length} sự kiện
                            </span>
                          </div>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ color: "var(--a-text-muted)", background: "var(--a-surface-raised)", borderBottom: "1px solid var(--a-border)" }}>
                                <th style={{ textAlign: "left", padding: "12px 16px" }}>Giờ</th>
                                <th style={{ textAlign: "left", padding: "12px 16px" }}>Hành động</th>
                                <th style={{ textAlign: "left", padding: "12px 16px" }}>Đối tượng</th>
                                <th style={{ textAlign: "left", padding: "12px 16px" }}>Nội dung</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.events.map((event, index) => (
                                <tr key={event.eventId || `${row.id}-${index}`} style={{ borderTop: index === 0 ? "none" : "1px solid var(--a-divider)" }}>
                                  <td style={{ padding: "12px 16px", whiteSpace: "nowrap", color: "var(--a-text)" }}>{event.time}</td>
                                  <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: 13, ...actionTextStyle(event.actionType) }}>{event.actionType}</td>
                                  <td style={{ padding: "12px 16px", color: "var(--a-text)" }}>{event.entityType}</td>
                                  <td style={{ padding: "12px 16px", color: "var(--a-text-muted)" }}>{event.message}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "14px" : "16px 24px", borderTop: "1px solid var(--a-border)", flexWrap: "wrap", gap: 12 }}>
          <span style={{ color: "var(--a-text-muted)", fontSize: 14 }}>
            Tổng {pagination.total || 0} nhóm log
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => loadRows(Math.max(1, pagination.page - 1))}
              disabled={(pagination.page || 1) <= 1}
              style={{
                background: "var(--a-surface)",
                border: "1px solid var(--a-border)",
                borderRadius: 10,
                padding: "8px 14px",
                fontSize: 13,
                color: "var(--a-text)",
                cursor: (pagination.page || 1) <= 1 ? "not-allowed" : "pointer",
                opacity: (pagination.page || 1) <= 1 ? 0.5 : 1,
              }}
            >
              Trước
            </button>
            <span style={{ color: "var(--a-text-muted)", fontSize: 14 }}>
              Trang {pagination.page || 1}/{pagination.totalPages || 1}
            </span>
            <button
              onClick={() => loadRows(Math.min(pagination.totalPages || 1, (pagination.page || 1) + 1))}
              disabled={(pagination.page || 1) >= (pagination.totalPages || 1)}
              style={{
                background: "var(--a-surface)",
                border: "1px solid var(--a-border)",
                borderRadius: 10,
                padding: "8px 14px",
                fontSize: 13,
                color: "var(--a-text)",
                cursor: (pagination.page || 1) >= (pagination.totalPages || 1) ? "not-allowed" : "pointer",
                opacity: (pagination.page || 1) >= (pagination.totalPages || 1) ? 0.5 : 1,
              }}
            >
              Sau
            </button>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
