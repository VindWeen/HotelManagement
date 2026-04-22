import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  exportAllAuditLogs,
  exportAuditLogs,
  getAuditLogFilterOptions,
  getAuditLogHistory,
} from "../../api/auditLogsApi";
import { useAdminAuthStore } from "../../store/adminAuthStore";

const panelStyle = {
  background: "white",
  borderRadius: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,.06)",
  border: "1px solid #f1f0ea",
};

const inputStyle = {
  width: "100%",
  background: "#f9f8f3",
  border: "1px solid #e2e8e1",
  borderRadius: 12,
  padding: "10px 16px",
  fontSize: 14,
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
  color: "#6b7280",
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
    return { background: "#ede9fe", color: "#6d28d9" };
  }
  if (roleName === "Manager") {
    return { background: "#dcfce7", color: "#15803d" };
  }
  if (roleName === "Housekeeping") {
    return { background: "#fef3c7", color: "#b45309" };
  }
  return { background: "#e5e7eb", color: "#4b5563" };
}

function actionTextStyle(actionType) {
  if (actionType === "DELETE") return { color: "#b45309" };
  if (actionType === "PATCH") return { color: "#0f766e" };
  if (actionType === "PUT" || actionType === "UPDATE") return { color: "#2563eb" };
  return { color: "#15803d" };
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
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
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
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#1f2937" }}>Nhật ký hoạt động</h1>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
            {canViewAll
              ? "Theo dõi toàn bộ hoạt động trong hệ thống."
              : `Bạn chỉ xem được log của nhóm vai trò ${currentUserRole || "hiện tại"}.`}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={handleExportFiltered}
            disabled={exporting}
            style={{
              padding: "8px 20px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 800,
              background: "white",
              color: "#1c1917",
              border: "1px solid #e2e8e1",
              cursor: exporting ? "not-allowed" : "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,.06)",
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
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 800,
              background: "#4f645b",
              color: "#e7fef3",
              border: "none",
              cursor: exporting ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(79,100,91,.2)",
              opacity: exporting ? 0.7 : 1,
            }}
          >
            Xuất toàn bộ
          </button>
        </div>
      </div>

      <section style={{ ...panelStyle, padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <label style={fieldLabelStyle}>Nhan vien</label>
            <select value={filters.userId} onChange={(e) => handleFilterChange("userId", e.target.value)} style={inputStyle}>
            <option value="">Lọc theo nhân viên</option>
            {employees.map((employee) => (
              <option key={employee.userId} value={employee.userId}>
                {employee.roleName ? `${employee.userName} - ${employee.roleName}` : employee.userName}
              </option>
            ))}
            </select>
          </div>

          <div style={{ width: 220 }}>
            <label style={fieldLabelStyle}>Ngay</label>
            <input
            type="date"
            value={filters.date}
            onChange={(e) => handleFilterChange("date", e.target.value)}
            style={inputStyle}
            />
          </div>

          <div style={{ width: 180 }}>
            <label style={fieldLabelStyle}>Thang</label>
            <select value={filters.month} onChange={(e) => handleFilterChange("month", e.target.value)} style={inputStyle}>
            <option value="">Lọc theo tháng</option>
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                Tháng {index + 1}
              </option>
            ))}
            </select>
          </div>

          <div style={{ width: 180 }}>
            <label style={fieldLabelStyle}>Nam</label>
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
              background: "#f3f4f6",
              border: "1px solid #e2e8e1",
              color: "#4b5563",
              padding: 10,
              borderRadius: 12,
              cursor: "pointer",
              minHeight: 42,
            }}
            title="Xoa bo loc"
          >
            <span className="material-symbols-outlined">tune</span>
          </button>
        </div>
      </section>

      <section style={{ ...panelStyle, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(249,248,243,.5)", borderBottom: "1px solid #f1f0ea", color: "#44403c" }}>
                <th style={{ padding: "16px 18px", width: 56 }} />
                <th style={{ padding: "16px 18px", textAlign: "left", fontSize: 13, fontWeight: 800 }}>Ngày</th>
                <th style={{ padding: "16px 18px", textAlign: "left", fontSize: 13, fontWeight: 800 }}>Nhân viên</th>
                <th style={{ padding: "16px 18px", textAlign: "left", fontSize: 13, fontWeight: 800 }}>Tóm tắt hoạt động</th>
              </tr>
            </thead>
            <tbody style={{ borderTop: "1px solid #f1f0ea" }}>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: 28, textAlign: "center", color: "#6b7280" }}>Đang tải dữ liệu...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 28, textAlign: "center", color: "#6b7280" }}>Không có log phù hợp bộ lọc hiện tại.</td>
                </tr>
              ) : rows.map((row) => {
                const badge = roleBadgeStyle(row.roleName);
                const expanded = !!expandedIds[row.id];
                return (
                  <Fragment key={row.id}>
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: expanded ? "none" : "1px solid #fafaf8",
                        background: expanded ? "#fcfcfa" : "",
                        boxShadow: expanded ? "inset 3px 0 0 #4f645b" : "none",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = expanded ? "#fcfcfa" : "#fafaf8";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = expanded ? "#fcfcfa" : "";
                      }}
                    >
                      <td style={{ padding: "16px 18px", verticalAlign: "top" }}>
                        <button
                          onClick={() => toggleExpanded(row.id)}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 999,
                            border: "1px solid #d6d3d1",
                            background: "#fff",
                            cursor: "pointer",
                            color: "#4f645b",
                            fontWeight: 700,
                            fontSize: 16,
                          }}
                        >
                          {expanded ? "-" : "+"}
                        </button>
                      </td>
                      <td style={{ padding: "16px 24px", verticalAlign: "top", fontWeight: 600, color: "#292524" }}>{row.logDate}</td>
                      <td style={{ padding: "16px 24px", verticalAlign: "top" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 500, color: "#292524", fontSize: 14 }}>{row.userName}</span>
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
                      <td style={{ padding: "16px 24px", verticalAlign: "top", color: "#4b5563", fontSize: 14 }}>{row.summary}</td>
                    </tr>
                    {expanded ? (
                      <tr style={{ background: "#fcfcfa", borderBottom: "1px solid #f1f0ea" }}>
                        <td />
                        <td colSpan={3} style={{ padding: "0 24px 20px 40px" }}>
                          <div style={{ background: "#f8fafc", border: "1px solid #e2e8e1", borderRadius: 14, overflow: "hidden", borderLeft: "4px solid #4f645b", boxShadow: "0 1px 2px rgba(0,0,0,.04)" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", background: "rgba(79,100,91,.07)", borderBottom: "1px solid #e2e8e1" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#4f645b" }}>
                                subdirectory_arrow_right
                              </span>
                              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4f645b" }}>
                                Chi tiết hoạt động
                              </span>
                            </div>
                            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
                              {row.events.length} sự kiện
                            </span>
                          </div>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ color: "#6b7280", background: "rgba(248,250,252,.95)", borderBottom: "1px solid #e2e8e1" }}>
                                <th style={{ textAlign: "left", padding: "12px 16px" }}>Giờ</th>
                                <th style={{ textAlign: "left", padding: "12px 16px" }}>Hành động</th>
                                <th style={{ textAlign: "left", padding: "12px 16px" }}>Đối tượng</th>
                                <th style={{ textAlign: "left", padding: "12px 16px" }}>Nội dung</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.events.map((event, index) => (
                                <tr key={event.eventId || `${row.id}-${index}`} style={{ borderTop: index === 0 ? "none" : "1px solid #f1f0ea" }}>
                                  <td style={{ padding: "12px 16px", whiteSpace: "nowrap", color: "#44403c" }}>{event.time}</td>
                                  <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: 13, ...actionTextStyle(event.actionType) }}>{event.actionType}</td>
                                  <td style={{ padding: "12px 16px", color: "#44403c" }}>{event.entityType}</td>
                                  <td style={{ padding: "12px 16px", color: "#4b5563" }}>{event.message}</td>
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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderTop: "1px solid #f1f0ea", flexWrap: "wrap", gap: 12 }}>
          <span style={{ color: "#6b7280", fontSize: 14 }}>
            Tổng {pagination.total || 0} nhóm log
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => loadRows(Math.max(1, pagination.page - 1))}
              disabled={(pagination.page || 1) <= 1}
              style={{
                background: "#fff",
                border: "1px solid #e2e8e1",
                borderRadius: 10,
                padding: "8px 14px",
                fontSize: 13,
                color: "#44403c",
                cursor: (pagination.page || 1) <= 1 ? "not-allowed" : "pointer",
                opacity: (pagination.page || 1) <= 1 ? 0.5 : 1,
              }}
            >
              Trước
            </button>
            <span style={{ color: "#4b5563", fontSize: 14 }}>
              Trang {pagination.page || 1}/{pagination.totalPages || 1}
            </span>
            <button
              onClick={() => loadRows(Math.min(pagination.totalPages || 1, (pagination.page || 1) + 1))}
              disabled={(pagination.page || 1) >= (pagination.totalPages || 1)}
              style={{
                background: "#fff",
                border: "1px solid #e2e8e1",
                borderRadius: 10,
                padding: "8px 14px",
                fontSize: 13,
                color: "#44403c",
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
