// src/pages/admin/DashboardPage.jsx
import { useState } from "react";

// ─── Mini Components ──────────────────────────────────────────────────────────

function KpiCard({ bg, iconBg, icon, iconColor, badge, badgeBg, badgeText, label, labelColor, value, valueColor }) {
  return (
    <div style={{ background: bg, padding: 24, borderRadius: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ padding: 8, background: iconBg, borderRadius: 10 }}>
          <span className="material-symbols-outlined" style={{ color: iconColor, fontSize: 22 }}>{icon}</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: badgeText, background: badgeBg, padding: "4px 10px", borderRadius: 9999 }}>{badge}</span>
      </div>
      <div>
        <p style={{ color: labelColor, fontSize: 13, fontWeight: 500, margin: "0 0 4px" }}>{label}</p>
        <h3 style={{ fontSize: 24, fontWeight: 800, color: valueColor, margin: 0, fontFamily: "Manrope, sans-serif" }}>{value}</h3>
      </div>
    </div>
  );
}

function BookingRow({ initials, initialsStyle, name, room, date, status, statusStyle }) {
  return (
    <tr style={{ borderBottom: "1px solid rgba(239,238,231,.5)" }}>
      <td style={{ padding: "16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, ...initialsStyle }}>{initials}</div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{name}</span>
        </div>
      </td>
      <td style={{ padding: "16px 0", fontSize: 14, color: "#5e6059" }}>{room}</td>
      <td style={{ padding: "16px 0", fontSize: 14, color: "#5e6059" }}>{date}</td>
      <td style={{ padding: "16px 0" }}>
        <span style={{ padding: "4px 12px", borderRadius: 9999, fontSize: 11, fontWeight: 700, ...statusStyle }}>{status}</span>
      </td>
      <td style={{ padding: "16px 0" }}>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#7a7b75" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>more_horiz</span>
        </button>
      </td>
    </tr>
  );
}

function ActivityItem({ icon, iconBg, iconColor, dotColor, title, desc, time }) {
  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="material-symbols-outlined" style={{ color: iconColor, fontSize: 20 }}>{icon}</span>
        </div>
        <div style={{ position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: dotColor, border: "2px solid white" }} />
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{title}</p>
        <p style={{ fontSize: 12, color: "#5e6059", margin: "0 0 4px" }}>{desc}</p>
        <span style={{ fontSize: 10, color: "#b2b2ab", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{time}</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [chartPeriod, setChartPeriod] = useState("monthly");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        .material-symbols-outlined { font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; vertical-align:middle; }
        .dash-table th { text-align: left; padding-bottom: 16px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #b2b2ab; border-bottom: 1px solid #efeee7; }
        .dash-table tr:last-child td { border-bottom: none; }
        .period-btn { padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 700; border: none; cursor: pointer; transition: all .15s; }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "Manrope, sans-serif" }}>

        {/* Page Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
          <div>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: "#1c1917", letterSpacing: "-0.03em", margin: "0 0 6px" }}>Manager Dashboard</h2>
            <p style={{ fontSize: 14, color: "#5e6059", margin: 0 }}>Welcome back, check your daily sanctuary stats.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <span className="material-symbols-outlined" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 18 }}>search</span>
              <input
                style={{ paddingLeft: 38, paddingRight: 16, paddingTop: 8, paddingBottom: 8, background: "#efeee7", border: "none", borderRadius: 9999, width: 220, fontSize: 13, outline: "none" }}
                placeholder="Search operations..."
              />
            </div>
            <button style={{ padding: 8, background: "#e9e8e1", border: "none", borderRadius: "50%", cursor: "pointer", position: "relative", display: "flex" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
              <span style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, background: "#a83836", borderRadius: "50%", border: "2px solid #e9e8e1" }} />
            </button>
          </div>
        </header>

        {/* KPI Cards */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 32 }}>
          <KpiCard
            bg="#d1e8dd" iconBg="rgba(66,86,78,.1)" icon="payments" iconColor="#42564e"
            badge="+12%" badgeBg="rgba(66,86,78,.08)" badgeText="#42564e"
            label="Total Revenue" labelColor="rgba(66,86,78,.7)" value="$128,430" valueColor="#2f433c"
          />
          <KpiCard
            bg="#ffdad9" iconBg="rgba(109,72,73,.1)" icon="meeting_room" iconColor="#6d4849"
            badge="84%" badgeBg="rgba(109,72,73,.08)" badgeText="#6d4849"
            label="Room Occupancy" labelColor="rgba(109,72,73,.7)" value="142/180" valueColor="#583637"
          />
          <KpiCard
            bg="#f7e8dd" iconBg="rgba(95,85,77,.1)" icon="calendar_month" iconColor="#5f554d"
            badge="Steady" badgeBg="rgba(95,85,77,.08)" badgeText="#5f554d"
            label="New Bookings" labelColor="rgba(95,85,77,.7)" value="24 Today" valueColor="#4c433b"
          />
          <KpiCard
            bg="#e3e3db" iconBg="rgba(79,100,91,.1)" icon="badge" iconColor="#4f645b"
            badge="Active" badgeBg="rgba(79,100,91,.08)" badgeText="#4f645b"
            label="Active Staff" labelColor="#5e6059" value="58 Units" valueColor="#1c1917"
          />
        </section>

        {/* Analytics + Distribution */}
        <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 32, marginBottom: 32 }}>

          {/* Line Chart */}
          <div style={{ background: "white", borderRadius: 20, padding: 32, boxShadow: "0 1px 4px rgba(0,0,0,.06)", border: "1px solid #f1f0ea" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
              <div>
                <h4 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Financial Trends</h4>
                <p style={{ fontSize: 13, color: "#5e6059", margin: 0 }}>Net growth vs. projections per month</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="period-btn"
                  onClick={() => setChartPeriod("monthly")}
                  style={{ background: chartPeriod === "monthly" ? "#4f645b" : "#efeee7", color: chartPeriod === "monthly" ? "#e7fef3" : "#5e6059" }}
                >Monthly</button>
                <button
                  className="period-btn"
                  onClick={() => setChartPeriod("weekly")}
                  style={{ background: chartPeriod === "weekly" ? "#4f645b" : "#efeee7", color: chartPeriod === "weekly" ? "#e7fef3" : "#5e6059" }}
                >Weekly</button>
              </div>
            </div>

            <div style={{ position: "relative", height: 220 }}>
              <svg viewBox="0 0 800 200" style={{ width: "100%", height: "100%" }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#4f645b" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#4f645b" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                {[40, 80, 120, 160].map(y => (
                  <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="#f1f0ea" strokeWidth="1" />
                ))}
                {/* Area fill */}
                <path d="M0,150 Q100,120 200,160 T400,100 T600,140 T800,80 L800,200 L0,200 Z" fill="url(#areaGrad)" />
                {/* Line stroke */}
                <path d="M0,150 Q100,120 200,160 T400,100 T600,140 T800,80" fill="none" stroke="#4f645b" strokeWidth="3" strokeLinecap="round" />
                {/* Data points */}
                {[[200,160],[400,100],[600,140],[800,80]].map(([x,y]) => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="#4f645b" stroke="white" strokeWidth="2.5" />
                ))}
              </svg>
              {/* X axis labels */}
              <div style={{ position: "absolute", bottom: -20, left: 0, width: "100%", display: "flex", justifyContent: "space-between", paddingInline: 4 }}>
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"].map(m => (
                  <span key={m} style={{ fontSize: 10, fontWeight: 700, color: "#b2b2ab", textTransform: "uppercase", letterSpacing: "0.12em" }}>{m}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Donut Chart */}
          <div style={{ background: "white", borderRadius: 20, padding: 32, boxShadow: "0 1px 4px rgba(0,0,0,.06)", border: "1px solid #f1f0ea", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: "100%", marginBottom: 24 }}>
              <h4 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Room Type</h4>
              <p style={{ fontSize: 13, color: "#5e6059", margin: 0 }}>Current occupancy mix</p>
            </div>

            {/* SVG donut */}
            <div style={{ position: "relative", width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                <circle cx="18" cy="18" r="16" fill="none" stroke="#efeee7" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#4f645b" strokeWidth="3" strokeDasharray="70, 100" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#7b5556" strokeWidth="3" strokeDasharray="15, 100" strokeDashoffset="-70" />
              </svg>
              <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: 30, fontWeight: 800, color: "#1c1917", lineHeight: 1 }}>84%</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#b2b2ab", textTransform: "uppercase", letterSpacing: "0.15em" }}>Full</span>
              </div>
            </div>

            {/* Legend */}
            <div style={{ width: "100%", marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { color: "#4f645b", label: "Deluxe Suite", value: "70%" },
                { color: "#7b5556", label: "Garden Villa", value: "15%" },
                { color: "#e3e3db", label: "Standard", value: "15%", border: "1px solid #d1d1c9" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0, border: item.border }} />
                    <span style={{ fontSize: 12, color: "#5e6059", fontWeight: 500 }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bookings Table + Activity Feed */}
        <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 32 }}>

          {/* Bookings Table */}
          <div style={{ background: "white", borderRadius: 20, padding: 32, boxShadow: "0 1px 4px rgba(0,0,0,.06)", border: "1px solid #f1f0ea" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h4 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Recent Bookings</h4>
              <button style={{ color: "#4f645b", fontSize: 13, fontWeight: 700, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>
                View All <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
              </button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="dash-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th>Guest</th>
                    <th>Room</th>
                    <th>Check In</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <BookingRow
                    initials="EH"
                    initialsStyle={{ background: "#d1e8dd", color: "#4f645b" }}
                    name="Evelyn Harper" room="Suite 402" date="Oct 24, 2023"
                    status="Process"
                    statusStyle={{ background: "#d1e8dd", color: "#2f433c" }}
                  />
                  <BookingRow
                    initials="JM"
                    initialsStyle={{ background: "#ffdad9", color: "#7b5556" }}
                    name="Julian Marsh" room="Villa 12" date="Oct 25, 2023"
                    status="Open"
                    statusStyle={{ background: "#f7e8dd", color: "#5f554d" }}
                  />
                  <BookingRow
                    initials="SD"
                    initialsStyle={{ background: "#e9e8e1", color: "#5e6059" }}
                    name="Sarah Dubois" room="Studio 08" date="Oct 22, 2023"
                    status="Completed"
                    statusStyle={{ background: "#e3e3db", color: "#5e6059" }}
                  />
                  <BookingRow
                    initials="KL"
                    initialsStyle={{ background: "#d1e8dd", color: "#4f645b" }}
                    name="Kwame Liu" room="Suite 301" date="Oct 26, 2023"
                    status="Pending"
                    statusStyle={{ background: "#fef9c3", color: "#854d0e" }}
                  />
                </tbody>
              </table>
            </div>
          </div>

          {/* Staff Activity */}
          <div style={{ background: "white", borderRadius: 20, padding: 32, boxShadow: "0 1px 4px rgba(0,0,0,.06)", border: "1px solid #f1f0ea" }}>
            <h4 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 24px" }}>Staff Insights</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <ActivityItem
                icon="cleaning_services" iconBg="rgba(79,100,91,.1)" iconColor="#4f645b"
                dotColor="#4f645b"
                title="Housekeeping Confirmed"
                desc="Suite 402 is now ready for check-in."
                time="12 mins ago"
              />
              <ActivityItem
                icon="doorbell" iconBg="rgba(123,85,86,.1)" iconColor="#7b5556"
                dotColor="#7b5556"
                title="Service Request"
                desc="Villa 12 requested turndown service."
                time="45 mins ago"
              />
              <ActivityItem
                icon="restaurant" iconBg="rgba(103,93,85,.1)" iconColor="#675d55"
                dotColor="#675d55"
                title="F&B Inventory Alert"
                desc="Wine cellar restock needed for Terrace bar."
                time="2 hours ago"
              />
              <ActivityItem
                icon="person_add" iconBg="rgba(122,123,117,.1)" iconColor="#7a7b75"
                dotColor="#9ca3af"
                title="New Staff Onboarded"
                desc="Marcus T. joined the Concierge team."
                time="5 hours ago"
              />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}