import { useState, useEffect, useCallback } from "react";
import { getMyDashboard, refreshDashboardSnapshot } from "../../api/dashboardApi";
import { useResponsiveAdmin } from "../../hooks/useResponsiveAdmin";

// Formatting utilities
const fmt = (n) => (n == null ? "?" : new Intl.NumberFormat("vi-VN").format(n));
const fmtCurrency = (n) => n == null ? "?" : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "?";
const fmtDateTime = (d) => d ? new Date(d).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "?";

const DASH_STATUS_CFG = {
  Pending: { label: "Chờ xử lý", bg: "var(--a-warning-bg)", color: "var(--a-warning)", dot: "var(--a-warning)" },
  Confirmed: { label: "Đã xác nhận", bg: "var(--a-info-bg)", color: "var(--a-info)", dot: "var(--a-info)" },
  Checked_in: { label: "Đang ở", bg: "var(--a-success-bg)", color: "var(--a-success)", dot: "var(--a-success)" },
  Checked_out_pending_settlement: { label: "Chờ thanh toán", bg: "var(--a-warning-bg)", color: "var(--a-warning)", dot: "var(--a-warning)" },
  Completed: { label: "Hoàn thành", bg: "var(--a-surface-bright)", color: "var(--a-text-muted)", dot: "var(--a-text-soft)" },
  Cancelled: { label: "Đã huỷ", bg: "var(--a-error-bg)", color: "var(--a-error)", dot: "var(--a-error)" },
};

const DASH_ROOM_BS_CFG = {
  Ready: { bg: "var(--a-success-bg)", border: "var(--a-success-border)", dot: "var(--a-success)", label: "Sẵn sàng", badge_bg: "var(--a-success-bg)", badge_color: "var(--a-success)" },
  Occupied: { bg: "var(--a-warning-bg)", border: "var(--a-warning-border)", dot: "var(--a-warning)", label: "Đang có khách", badge_bg: "var(--a-warning-bg)", badge_color: "var(--a-warning)" },
  Cleaning: { bg: "var(--a-error-bg)", border: "var(--a-error-border)", dot: "var(--a-error)", label: "Cần dọn dẹp", badge_bg: "var(--a-error-bg)", badge_color: "var(--a-error)" },
  PendingLoss: { bg: "color-mix(in srgb, var(--a-error-bg) 68%, var(--a-warning-bg))", border: "color-mix(in srgb, var(--a-error-border) 72%, var(--a-warning-border))", dot: "var(--a-error)", label: "Chờ xử lý thất thoát", badge_bg: "color-mix(in srgb, var(--a-error-bg) 72%, var(--a-warning-bg))", badge_color: "var(--a-error)" },
  Maintenance: { bg: "var(--a-surface-bright)", border: "var(--a-border-strong)", dot: "var(--a-text-muted)", label: "Bảo trì", badge_bg: "var(--a-surface-bright)", badge_color: "var(--a-text-muted)" },
};

// UI Components
const Skel = ({ w = "100%", h = 16, r = 8, style = {} }) => <div className="admin-skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
function MiniBar({ data, labels, color = "var(--a-primary)" }) {
  if (!data?.length) return null;
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
          <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
            <div style={{ width: "100%", height: `${(v / max) * 100}%`, background: color, borderRadius: "4px 4px 2px 2px", minHeight: 4, transition: "height .4s ease", opacity: i === data.length - 1 ? 1 : 0.45 + (i / data.length) * 0.55 }} />
          </div>
          {labels?.[i] && <span style={{ fontSize: 9, color: "var(--a-text-soft)", fontWeight: 600, whiteSpace: "nowrap" }}>{labels[i]}</span>}
        </div>
      ))}
    </div>
  );
}

// --- Dashboards ---
function AdminDashboard({ data, loading, onRefresh, isMobile }) {
  const kpis = data?.kpis || {};
  const rev = data?.revenue || { labels: [], values: [] };
  const bks = data?.bookings || { byStatus: {}, recent: [] };
  const rms = data?.rooms || { countByStatus: {}, preview: [] };

  return (
    <div className="admin-page" style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Header title="Tổng quan hệ thống" loading={loading} onRefresh={onRefresh} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-5">
        <KpiCard icon="payments" intent="brand" label="Tổng doanh thu" value={fmtCurrency(kpis.totalRevenue)} sub={`Hôm nay: ${fmtCurrency(kpis.todayRevenue)}`} delay={0} />
        <KpiCard icon="confirmation_number" intent="info" label="Booking đang hoạt động" value={fmt(kpis.activeBookings)} sub={`${kpis.pendingBookings} chờ cọc`} delay={60} />
        <KpiCard icon="meeting_room" intent="error" label="Tỷ lệ lấp đầy" value={`${kpis.occupancyRate || 0}%`} sub={`${kpis.availableRooms || 0} phòng sẵn sàng`} delay={120} />
        <KpiCard icon="group" intent="warning" label="Tài khoản hệ thống" value={fmt(kpis.totalUsers)} sub={`+${kpis.newUsersThisMonth || 0} tháng này`} delay={180} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="card-in admin-card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 18 }}><h4>Doanh thu 7 ngày qua</h4><p>Ghi nhận qua hóa đơn</p></div>
          <MiniBar data={rev.values} labels={rev.labels} color="var(--a-brand-ink)" />
        </div>
        <div className="card-in admin-card" style={{ padding: 24 }}>
          <h4>Thất thoát & Hư hỏng</h4>
          <p style={{marginTop: 10}}>Chờ xử lý: <strong>{data?.damages?.pendingCount || 0}</strong></p>
          <p>Giá trị phạt: <strong style={{color: "var(--a-error)"}}>{fmtCurrency(data?.damages?.totalPenalty || 0)}</strong></p>
        </div>
      </div>
      <RoomsStatusGrid rooms={rms.preview} countByStatus={rms.countByStatus} loading={loading} />
      <RecentBookingsTable recentBookings={bks.recent} isMobile={isMobile} loading={loading} />
    </div>
  );
}

function AccountantDashboard({ data, loading, onRefresh }) {
  const rev = data?.revenue || {};
  const inv = data?.invoiceSummary || {};
  const pay = data?.payments || {};
  const dam = data?.damages || {};

  return (
    <div className="admin-page" style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Header title="Bảng điều khiển Kế toán" loading={loading} onRefresh={onRefresh} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
        <KpiCard icon="account_balance_wallet" intent="brand" label="Doanh thu tháng này" value={fmtCurrency(rev.thisMonth)} sub={`Tổng cộng: ${fmtCurrency(rev.totalAllTime)}`} delay={0} />
        <KpiCard icon="receipt_long" intent="info" label="Hóa đơn đã thanh toán" value={fmtCurrency(inv.paid)} sub={`${inv.unpaid}VND chưa thanh toán`} delay={60} />
        <KpiCard icon="report" intent="error" label="Khoản phạt thất thoát" value={fmtCurrency(dam.totalPenalty)} sub={`${dam.pendingCount} biên bản chờ`} delay={120} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card-in admin-card" style={{ padding: 24 }}>
          <h4>Cơ cấu thanh toán tháng này ({fmtCurrency(pay.totalThisMonth)})</h4>
          <ul>{Object.entries(pay.byMethod || {}).map(([m, val]) => <li key={m}>{m}: {fmtCurrency(val)}</li>)}</ul>
        </div>
        <div className="card-in admin-card" style={{ padding: 24 }}>
          <h4>Doanh thu dịch vụ</h4>
          <p>{fmtCurrency(data?.services?.totalAmount)} từ {data?.services?.totalOrders} đơn hàng</p>
        </div>
      </div>
    </div>
  );
}

function ReceptionistDashboard({ data, loading, onRefresh, isMobile }) {
  const sum = data?.summary || {};
  return (
    <div className="admin-page" style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Header title="Lễ tân - Trực ca" loading={loading} onRefresh={onRefresh} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
        <KpiCard icon="flight_land" intent="brand" label="Khách đến hôm nay" value={fmt(sum.todayArrivals)} delay={0} />
        <KpiCard icon="flight_takeoff" intent="warning" label="Khách đi hôm nay" value={fmt(sum.todayCheckouts)} delay={60} />
        <KpiCard icon="sensor_door" intent="info" label="Phòng đang có khách" value={fmt(sum.staying)} delay={120} />
      </div>
      <RecentBookingsTable recentBookings={(data?.arrivals || []).concat(data?.checkouts || [])} isMobile={isMobile} loading={loading} />
    </div>
  );
}

function HousekeepingDashboard({ data, loading, onRefresh }) {
  const sum = data?.summary || {};
  return (
    <div className="admin-page" style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Header title="Buồng phòng" loading={loading} onRefresh={onRefresh} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
        <KpiCard icon="cleaning_services" intent="error" label="Cần dọn dẹp" value={fmt(sum.needsCleaning)} delay={0} />
        <KpiCard icon="report" intent="warning" label="Chờ xử lý thất thoát" value={fmt(sum.pendingLoss)} delay={60} />
        <KpiCard icon="done_all" intent="success" label="Sẵn sàng" value={fmt(sum.ready)} delay={120} />
      </div>
      <RoomsStatusGrid rooms={data?.rooms || []} countByStatus={{}} loading={loading} hideEmpty />
    </div>
  );
}

// Shared Sub-components
function Header({title, loading, onRefresh}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
      <div><h2 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 5px" }}>{title}</h2></div>
      <button className="refresh-btn" onClick={onRefresh} disabled={loading} style={{padding: "8px 16px", borderRadius: 12, background: "var(--a-surface)", border: "1px solid var(--a-border)", cursor: "pointer"}}>
        {loading ? "..." : "Làm mới"}
      </button>
    </div>
  );
}

function KpiCard({icon, intent, label, value, sub, delay}) {
  return (
    <div className="card-in admin-stat-card" data-intent={intent} style={{ padding: 22, animationDelay: `${delay}ms`}}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{background: "var(--a-surface-raised)", border: "1px solid var(--a-border)", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center"}}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
        </div>
      </div>
      <p style={{margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "var(--a-text-soft)"}}>{label}</p>
      <h3 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>{value}</h3>
      <p style={{ fontSize: 11, fontWeight: 600, margin: 0 }}>{sub}</p>
    </div>
  );
}

function RoomsStatusGrid({rooms, countByStatus, loading, hideEmpty = false}) {
  if (loading) return <div>Đang tải sơ đồ phòng...</div>;
  if (!rooms || rooms.length === 0) return <div>Không có phòng nào.</div>;
  
  const STATUS_ORDER = ["Occupied", "Cleaning", "PendingLoss", "Maintenance", "Ready"];
  
  const enhancedRooms = rooms.map(rm => ({
    ...rm,
    statusKey: rm.businessStatus === "Disabled" ? "Maintenance" :
               rm.businessStatus === "Occupied" ? "Occupied" :
               rm.cleaningStatus === "PendingLoss" ? "PendingLoss" :
               rm.cleaningStatus === "Dirty" ? "Cleaning" : "Ready"
  })).sort((a, b) => String(a.roomNumber || "").localeCompare(String(b.roomNumber || ""), "vi", { numeric: true }));

  return (
    <div className="card-in admin-card" style={{ padding: 24, marginBottom: 20 }}>
      <h4 style={{marginBottom: 20, fontSize: 15, fontWeight: 800}}>Khái quát phòng</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {STATUS_ORDER.map(status => {
          const groupRooms = enhancedRooms.filter(r => r.statusKey === status);
          if (groupRooms.length === 0) return null;
          
          const cfg = DASH_ROOM_BS_CFG[status] || DASH_ROOM_BS_CFG.Ready;
          
          return (
            <div key={status}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: cfg.dot }}></span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--a-text-muted)" }}>{cfg.label} ({groupRooms.length})</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 12 }}>
                {groupRooms.map(rm => (
                  <div key={rm.id} style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}`, borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
                    <span style={{ fontSize: 18, fontWeight: 800 }}>{rm.roomNumber}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecentBookingsTable({recentBookings, isMobile, loading}) {
  if (loading) return <div>Đang tải booking...</div>;
  if (!recentBookings || !recentBookings.length) return <div style={{padding: 24}}>Không có booking gần đây.</div>;
  return (
    <div className="card-in admin-card" style={{ padding: 24, overflowX: "auto" }}>
      <h4 style={{marginBottom: 16, fontSize: 15, fontWeight: 800}}>Hoạt động đặt phòng</h4>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
        <thead><tr style={{borderBottom: "1px solid var(--a-border)", background: "color-mix(in srgb, var(--a-surface-raised) 92%, transparent)"}}><th style={{textAlign: "left", padding: "12px 20px", fontSize: 10, textTransform: "uppercase", color: "var(--a-text-muted)"}}>Mã</th><th style={{textAlign: "left", padding: "12px 20px", fontSize: 10, textTransform: "uppercase", color: "var(--a-text-muted)"}}>Khách</th><th style={{textAlign: "left", padding: "12px 20px", fontSize: 10, textTransform: "uppercase", color: "var(--a-text-muted)"}}>Trạng thái</th></tr></thead>
        <tbody>
          {recentBookings.map(b => {
             const cfg = DASH_STATUS_CFG[b.status] || DASH_STATUS_CFG.Cancelled;
             return (
              <tr key={b.id} style={{borderBottom: "1px solid var(--a-border)", cursor: "pointer"}} className="hover-row">
                <td style={{padding: "14px 20px", fontSize: 12, fontWeight: 700, fontFamily: "monospace"}}>{b.bookingCode}</td>
                <td style={{padding: "14px 20px", fontSize: 13, fontWeight: 600}}>{b.guestName || "Khách vãng lai"}</td>
                <td style={{padding: "14px 20px"}}><span style={{background: cfg.bg, color: cfg.color, padding: "4px 12px", borderRadius: 9999, fontSize: 11, fontWeight: 700}}>{cfg.label}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Global Styles
const GLOBAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&display=swap');
* { font-family: 'Manrope', sans-serif; }
.card-in { animation: fadeUp .35s ease forwards; background: var(--a-surface); border: 1px solid var(--a-border); border-radius: 16px; }
@keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
tr.hover-row:hover td { background:color-mix(in srgb, var(--a-primary) 6%, var(--a-surface)); }
`;

export default function DashboardPage() {
  const { isMobile } = useResponsiveAdmin();
  const [loading, setLoading] = useState(true);
  const [dashData, setDashData] = useState(null);
  const [role, setRole] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyDashboard();
      if (res.data && res.data.data) {
        setRole(res.data.data.role);
        setDashData(res.data.data.data);
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleRefresh = async () => {
    try { setLoading(true); await refreshDashboardSnapshot(); await fetchDashboard(); } catch(err) {} finally { setLoading(false); }
  }

  if (loading && !dashData) return <div style={{ padding: 40, textAlign: "center" }}>Đang tải dữ liệu dashboard...</div>;

  let View = AdminDashboard;
  if (role === "Accountant") View = AccountantDashboard;
  if (role === "Receptionist") View = ReceptionistDashboard;
  if (role === "Housekeeping") View = HousekeepingDashboard;

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <View data={dashData} loading={loading} onRefresh={handleRefresh} isMobile={isMobile} />
    </>
  );
}
