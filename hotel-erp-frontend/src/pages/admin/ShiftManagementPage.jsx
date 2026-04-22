import { useCallback, useEffect, useMemo, useState } from "react";
import { completeShift, confirmShift, createShift, getCurrentShifts, getShifts, handoverShift, startShift } from "../../api/shiftsApi";
import { useResponsiveAdmin } from "../../hooks/useResponsiveAdmin";
import { getUsers } from "../../api/userManagementApi";

const SHIFT_TIME_PRESETS = {
  Morning: { start: "07:00", end: "14:30", label: "07:00 - 14:30" },
  Afternoon: { start: "14:30", end: "22:00", label: "14:30 - 22:00" },
  Night: { start: "22:00", end: "07:00", label: "22:00 - 07:00" },
};

function toLocalInputValue(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildShiftDateRange(shiftType) {
  const preset = SHIFT_TIME_PRESETS[shiftType] || SHIFT_TIME_PRESETS.Morning;
  const now = new Date();
  const start = new Date(now);
  const [startHour, startMinute] = preset.start.split(":").map(Number);
  start.setHours(startHour, startMinute, 0, 0);

  const end = new Date(start);
  const [endHour, endMinute] = preset.end.split(":").map(Number);
  end.setHours(endHour, endMinute, 0, 0);
  if (end <= start) end.setDate(end.getDate() + 1);

  return {
    plannedStart: toLocalInputValue(start),
    plannedEnd: toLocalInputValue(end),
  };
}

const pageCard = {
  background: "#fff",
  border: "1px solid #f1f0ea",
  borderRadius: 20,
  boxShadow: "0 1px 3px rgba(0,0,0,.06)",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 14px",
  borderRadius: 12,
  border: "1.5px solid #e2e8e1",
  background: "#f9f8f3",
  fontSize: 13,
  fontWeight: 600,
  color: "#1c1917",
  outline: "none",
  fontFamily: "'Manrope', sans-serif",
};

const PRIMARY_BUTTON = {
  background: "linear-gradient(135deg,#4f645b 0%,#43574f 100%)",
  color: "#e7fef3",
  border: "none",
  borderRadius: 12,
  padding: "10px 22px",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  boxShadow: "0 4px 12px rgba(79,100,91,.2)",
  transition: "all 0.15s",
};

const SECONDARY_BUTTON = {
  padding: "10px 22px",
  borderRadius: 12,
  border: "1.5px solid #e2e8e1",
  background: "white",
  color: "#57534e",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.15s",
};

const statusMeta = {
  Scheduled: { bg: "#fef3c7", color: "#92400e", label: "Đã xếp ca" },
  Active: { bg: "#dcfce7", color: "#166534", label: "Đang trực" },
  Completed: { bg: "#e0e7ff", color: "#3730a3", label: "Hoàn tất" },
  Absent: { bg: "#fee2e2", color: "#991b1b", label: "Vắng mặt" },
};

const fmtDateTimeLocal = (value) =>
  value ? new Date(value).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export default function ShiftManagementPage() {
  const { isMobile } = useResponsiveAdmin();
  const [users, setUsers] = useState([]);
  const [rows, setRows] = useState([]);
  const [currentRows, setCurrentRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [handoverTarget, setHandoverTarget] = useState(null);
  const [handoverForm, setHandoverForm] = useState({ handoverNote: "", cashAtHandover: "" });
  const [filters, setFilters] = useState({ department: "", status: "" });
  const [form, setForm] = useState({
    userId: "",
    shiftType: "Morning",
    department: "Reception",
    ...buildShiftDateRange("Morning"),
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const [userRes, shiftRes, currentRes] = await Promise.all([
        getUsers({ page: 1, pageSize: 200 }),
        getShifts(filters),
        getCurrentShifts(),
      ]);

      setUsers(userRes.data?.data || []);
      setRows(shiftRes.data?.data || []);
      setCurrentRows(currentRes.data?.data || []);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Không thể tải dữ liệu ca làm việc.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const staffOptions = useMemo(
    () =>
      (users || []).filter(
        (item) =>
          item.status !== false &&
          String(item.roleName || item.role?.name || "").toLowerCase() !== "guest",
      ),
    [users],
  );

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");
    try {
      await createShift({
        userId: Number(form.userId),
        shiftType: form.shiftType,
        department: form.department,
        plannedStart: form.plannedStart,
        plannedEnd: form.plannedEnd,
      });
      setForm({
        userId: "",
        shiftType: "Morning",
        department: "Reception",
        ...buildShiftDateRange("Morning"),
      });
      await load();
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Không thể tạo ca làm việc.");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (runner) => {
    setSaving(true);
    setErrorMessage("");
    try {
      await runner();
      setHandoverTarget(null);
      setHandoverForm({ handoverNote: "", cashAtHandover: "" });
      await load();
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Thao tác ca làm việc thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 1360, margin: "0 auto", paddingInline: isMobile ? 4 : 0 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', sans-serif; }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 28, color: "#1c1917", fontWeight: 800 }}>Ca làm việc</h2>
          <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 14, maxWidth: 760, lineHeight: 1.65 }}>
            Module này hỗ trợ phân ca, bắt đầu ca, ghi chú bàn giao và xác nhận hoàn tất. Quy tắc chồng ca và ca active cùng bộ phận được xử lý ở backend.
          </p>
        </div>
        <button type="button" onClick={load} disabled={loading} style={{ ...SECONDARY_BUTTON, height: 42, width: isMobile ? "100%" : "auto", justifyContent: "center" }}>
          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {errorMessage ? <div style={{ ...pageCard, marginBottom: 20, padding: 14, color: "#b91c1c", background: "#fff7f7", borderColor: "#fecaca" }}>{errorMessage}</div> : null}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <article style={{ ...pageCard, padding: 22 }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 18, color: "#1c1917", fontWeight: 800 }}>Tạo ca mới</h3>
          <form onSubmit={handleCreate} style={{ display: "grid", gap: 12 }}>
            <select value={form.userId} onChange={(e) => setForm((prev) => ({ ...prev, userId: e.target.value }))} style={inputStyle} required>
              <option value="">Chọn nhân sự</option>
              {staffOptions.map((user) => (
                <option key={user.id} value={user.id}>{user.fullName} - {user.roleName || user.role?.name || "Staff"}</option>
              ))}
            </select>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select value={form.shiftType} onChange={(e) => setForm((prev) => ({ ...prev, shiftType: e.target.value, ...buildShiftDateRange(e.target.value) }))} style={inputStyle}>
                <option value="Morning">Ca sáng</option>
                <option value="Afternoon">Ca chiều</option>
                <option value="Night">Ca đêm</option>
              </select>
              <select value={form.department} onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))} style={inputStyle}>
                <option value="Reception">Lễ tân</option>
                <option value="Housekeeping">Buồng phòng</option>
                <option value="Manager">Quản lý</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="datetime-local" value={form.plannedStart} onChange={(e) => setForm((prev) => ({ ...prev, plannedStart: e.target.value }))} style={inputStyle} required />
              <input type="datetime-local" value={form.plannedEnd} onChange={(e) => setForm((prev) => ({ ...prev, plannedEnd: e.target.value }))} style={inputStyle} required />
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
              Khung giờ mặc định: {SHIFT_TIME_PRESETS[form.shiftType]?.label || "--"}
            </div>
            <button type="submit" disabled={saving} style={{ ...PRIMARY_BUTTON, height: 44, justifyContent: "center" }}>
              {saving ? "Đang lưu..." : "Tạo ca làm việc"}
            </button>
          </form>
        </article>

        <article style={{ ...pageCard, padding: 22 }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 18, color: "#1c1917", fontWeight: 800 }}>Ca đang hoạt động / trong giờ</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {currentRows.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: 14 }}>Hiện chưa có ca nào trong khung giờ hiện tại.</div>
            ) : currentRows.map((shift) => {
              const meta = statusMeta[shift.status] || statusMeta.Scheduled;
              return (
                <div key={shift.id} style={{ background: "#faf8f3", borderRadius: 14, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div>
                      <div style={{ color: "#1c1917", fontSize: 15, fontWeight: 800 }}>{shift.userFullName}</div>
                      <div style={{ color: "#6b7280", fontSize: 13 }}>{shift.department} • {shift.shiftType}</div>
                    </div>
                    <span style={{ padding: "6px 10px", borderRadius: 999, background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 800 }}>{meta.label}</span>
                  </div>
                  <div style={{ marginTop: 10, color: "#57534e", fontSize: 13 }}>
                    {fmtDateTimeLocal(shift.plannedStart)} - {fmtDateTimeLocal(shift.plannedEnd)}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section style={{ ...pageCard, overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #f1ece2", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <strong style={{ color: "#1c1917", fontSize: 18 }}>Danh sách ca làm việc</strong>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
            <select value={filters.department} onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))} style={{ ...inputStyle, width: isMobile ? "100%" : 160 }}>
              <option value="">Tất cả bộ phận</option>
              <option value="Reception">Lễ tân</option>
              <option value="Housekeeping">Buồng phòng</option>
              <option value="Manager">Quản lý</option>
            </select>
            <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))} style={{ ...inputStyle, width: isMobile ? "100%" : 160 }}>
              <option value="">Tất cả trạng thái</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Absent">Absent</option>
            </select>
          </div>
        </div>
        {isMobile ? (
          <div style={{ display: "grid", gap: 12, padding: 14 }}>
            {rows.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>Chưa có ca làm việc nào.</div>
            ) : rows.map((shift) => {
              const meta = statusMeta[shift.status] || statusMeta.Scheduled;
              const isEditingHandover = handoverTarget === shift.id;
              return (
                <article key={shift.id} style={{ border: "1px solid #f1ece2", borderRadius: 16, padding: 14, display: "grid", gap: 12, background: "white" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ color: "#1c1917", fontWeight: 900, fontSize: 16 }}>{shift.userFullName}</div>
                      <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>{shift.department} - {shift.shiftType}</div>
                    </div>
                    <span style={{ padding: "6px 10px", borderRadius: 999, background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 900, whiteSpace: "nowrap" }}>{meta.label}</span>
                  </div>
                  <div style={{ display: "grid", gap: 6, color: "#57534e", fontSize: 13 }}>
                    <div><strong>Thời gian:</strong> {fmtDateTimeLocal(shift.plannedStart)} - {fmtDateTimeLocal(shift.plannedEnd)}</div>
                    <div><strong>Bắt đầu thực tế:</strong> {fmtDateTimeLocal(shift.actualStart)}</div>
                    <div><strong>Xác nhận:</strong> {shift.confirmedByName || "Chưa có"}</div>
                    {shift.lateMinutes > 0 ? <div style={{ color: "#b45309", fontWeight: 800 }}>Trễ {shift.lateMinutes} phút</div> : null}
                  </div>
                  {isEditingHandover ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <textarea value={handoverForm.handoverNote} onChange={(e) => setHandoverForm((prev) => ({ ...prev, handoverNote: e.target.value }))} placeholder="Ghi chú bàn giao" style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
                      <input type="number" value={handoverForm.cashAtHandover} onChange={(e) => setHandoverForm((prev) => ({ ...prev, cashAtHandover: e.target.value }))} placeholder="Tiền mặt bàn giao (nếu có)" style={inputStyle} />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <button type="button" onClick={() => runAction(() => handoverShift(shift.id, { handoverNote: handoverForm.handoverNote, cashAtHandover: handoverForm.cashAtHandover || null }))} style={{ height: 38, borderRadius: 10, border: "none", background: "#4f645b", color: "#fff", fontWeight: 800 }}>Lưu</button>
                        <button type="button" onClick={() => setHandoverTarget(null)} style={{ height: 38, borderRadius: 10, border: "1px solid #d6d3d1", background: "#fff", fontWeight: 800 }}>Hủy</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: "#faf8f3", borderRadius: 12, padding: 10, color: "#57534e", fontSize: 13, lineHeight: 1.5 }}>
                      {shift.handoverNote || "Chưa có ghi chú bàn giao."}
                      {shift.cashAtHandover != null ? <div style={{ marginTop: 6, fontWeight: 800 }}>Tiền bàn giao: {shift.cashAtHandover}</div> : null}
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button type="button" onClick={() => runAction(() => startShift(shift.id))} disabled={shift.status !== "Scheduled"} style={{ height: 38, borderRadius: 10, border: "1px solid #d6d3d1", background: "#fff", fontWeight: 800, opacity: shift.status !== "Scheduled" ? 0.5 : 1 }}>Bắt đầu</button>
                    <button type="button" onClick={() => { setHandoverTarget(shift.id); setHandoverForm({ handoverNote: shift.handoverNote || "", cashAtHandover: shift.cashAtHandover || "" }); }} style={{ height: 38, borderRadius: 10, border: "1px solid #d6d3d1", background: "#fff", fontWeight: 800 }}>Bàn giao</button>
                    <button type="button" onClick={() => runAction(() => completeShift(shift.id))} disabled={shift.status !== "Active"} style={{ height: 38, borderRadius: 10, border: "1px solid #d6d3d1", background: "#fff", fontWeight: 800, opacity: shift.status !== "Active" ? 0.5 : 1 }}>Hoàn tất</button>
                    <button type="button" onClick={() => runAction(() => confirmShift(shift.id))} style={{ height: 38, borderRadius: 10, border: "none", background: "#1f2937", color: "#fff", fontWeight: 800 }}>Xác nhận</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#faf8f3", borderBottom: "1px solid #f1ece2" }}>
                {["Nhân sự", "Bộ phận", "Thời gian", "Trạng thái", "Bàn giao", "Thao tác"].map((title) => (
                  <th key={title} style={{ padding: "14px 18px", textAlign: "left", color: "#78716c", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em" }}>{title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>Chưa có ca làm việc nào.</td></tr>
              ) : rows.map((shift) => {
                const meta = statusMeta[shift.status] || statusMeta.Scheduled;
                const isEditingHandover = handoverTarget === shift.id;
                return (
                  <tr key={shift.id} style={{ borderBottom: "1px solid #f7f4ee", verticalAlign: "top" }}>
                    <td style={{ padding: "16px 18px" }}>
                      <div style={{ color: "#1c1917", fontWeight: 800 }}>{shift.userFullName}</div>
                      <div style={{ color: "#6b7280", fontSize: 13 }}>Xác nhận: {shift.confirmedByName || "Chưa có"}</div>
                    </td>
                    <td style={{ padding: "16px 18px", color: "#57534e", fontWeight: 700 }}>{shift.department} • {shift.shiftType}</td>
                    <td style={{ padding: "16px 18px", color: "#57534e" }}>
                      <div>{fmtDateTimeLocal(shift.plannedStart)} - {fmtDateTimeLocal(shift.plannedEnd)}</div>
                      <div style={{ marginTop: 6, fontSize: 12, color: "#78716c" }}>Bắt đầu thực tế: {fmtDateTimeLocal(shift.actualStart)}</div>
                    </td>
                    <td style={{ padding: "16px 18px" }}>
                      <span style={{ padding: "6px 10px", borderRadius: 999, background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 800 }}>{meta.label}</span>
                      {shift.lateMinutes > 0 ? <div style={{ marginTop: 8, color: "#b45309", fontSize: 12, fontWeight: 700 }}>Trễ {shift.lateMinutes} phút</div> : null}
                    </td>
                    <td style={{ padding: "16px 18px" }}>
                      {isEditingHandover ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          <textarea value={handoverForm.handoverNote} onChange={(e) => setHandoverForm((prev) => ({ ...prev, handoverNote: e.target.value }))} placeholder="Ghi chú bàn giao" style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
                          <input type="number" value={handoverForm.cashAtHandover} onChange={(e) => setHandoverForm((prev) => ({ ...prev, cashAtHandover: e.target.value }))} placeholder="Tiền mặt bàn giao (nếu có)" style={inputStyle} />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button type="button" onClick={() => runAction(() => handoverShift(shift.id, { handoverNote: handoverForm.handoverNote, cashAtHandover: handoverForm.cashAtHandover || null }))} style={{ height: 36, padding: "0 12px", borderRadius: 10, border: "none", background: "#4f645b", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Lưu</button>
                            <button type="button" onClick={() => setHandoverTarget(null)} style={{ height: 36, padding: "0 12px", borderRadius: 10, border: "1px solid #d6d3d1", background: "#fff", fontWeight: 700, cursor: "pointer" }}>Hủy</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: "#57534e", fontSize: 13, lineHeight: 1.5 }}>
                          <div>{shift.handoverNote || "Chưa có ghi chú bàn giao."}</div>
                          {shift.cashAtHandover != null ? <div style={{ marginTop: 6, fontWeight: 700 }}>Tiền bàn giao: {shift.cashAtHandover}</div> : null}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "16px 18px" }}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <button type="button" onClick={() => runAction(() => startShift(shift.id))} disabled={shift.status !== "Scheduled"} style={{ height: 36, borderRadius: 10, border: "1px solid #d6d3d1", background: "#fff", fontWeight: 700, cursor: "pointer" }}>Bắt đầu ca</button>
                        <button
                          type="button"
                          onClick={() => {
                            setHandoverTarget(shift.id);
                            setHandoverForm({
                              handoverNote: shift.handoverNote || "",
                              cashAtHandover: shift.cashAtHandover || "",
                            });
                          }}
                          style={{ height: 36, borderRadius: 10, border: "1px solid #d6d3d1", background: "#fff", fontWeight: 700, cursor: "pointer" }}
                        >
                          Bàn giao
                        </button>
                        <button type="button" onClick={() => runAction(() => completeShift(shift.id))} disabled={shift.status !== "Active"} style={{ height: 36, borderRadius: 10, border: "1px solid #d6d3d1", background: "#fff", fontWeight: 700, cursor: "pointer" }}>Hoàn tất</button>
                        <button type="button" onClick={() => runAction(() => confirmShift(shift.id))} style={{ height: 36, borderRadius: 10, border: "none", background: "#1f2937", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Xác nhận</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </section>
    </div>
  );
}
