import { useEffect, useState } from "react";
import {
  getSystemSettings,
  updateDepositSettings,
  updateLocationSettings,
} from "../api/systemSettingsApi";

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid var(--a-border)",
  background: "var(--a-surface-raised)",
  color: "var(--a-text)",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "'Manrope', sans-serif",
  outline: "none",
};

const titleStyle = {
  margin: "6px 0 0",
  fontSize: 24,
  fontWeight: 800,
  color: "var(--a-text)",
  letterSpacing: "-0.02em",
};

const modalCardStyle = {
  width: "100%",
  maxWidth: 760,
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  background: "var(--a-surface)",
  border: "1px solid var(--a-border)",
  borderRadius: 24,
  boxShadow: "var(--a-shadow-lg)",
  fontFamily: "'Manrope', sans-serif",
  animation: "ssmScaleIn .2s ease-out",
};

const TAB_KEYS = {
  deposit: "deposit",
  location: "location",
};

export default function SystemSettingsModal({ open, onClose }) {
  const [activeTab, setActiveTab] = useState(TAB_KEYS.deposit);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [depositForm, setDepositForm] = useState({
    bookingDepositPercent: "30",
    checkInRequiredPercent: "50",
  });
  const [locationForm, setLocationForm] = useState({
    hotelAddress: "",
    hotelLatitude: "",
    hotelLongitude: "",
  });

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const loadSettings = async () => {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        const response = await getSystemSettings();
        if (cancelled) return;
        const data = response.data || {};
        setDepositForm({
          bookingDepositPercent: String(data.bookingDepositPercent ?? 30),
          checkInRequiredPercent: String(data.checkInRequiredPercent ?? 50),
        });
        setLocationForm({
          hotelAddress: data.hotelAddress || "",
          hotelLatitude: data.hotelLatitude != null ? String(data.hotelLatitude) : "",
          hotelLongitude: data.hotelLongitude != null ? String(data.hotelLongitude) : "",
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.response?.data?.message || "Không thể tải cấu hình hệ thống.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const handleSaveDeposit = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await updateDepositSettings({
        bookingDepositPercent: Number(depositForm.bookingDepositPercent),
        checkInRequiredPercent: Number(depositForm.checkInRequiredPercent),
      });
      setSuccess(response.data?.message || "Đã cập nhật cấu hình tiền cọc.");
    } catch (saveError) {
      setError(saveError?.response?.data?.message || "Không thể cập nhật cấu hình tiền cọc.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLocation = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await updateLocationSettings({
        hotelAddress: locationForm.hotelAddress,
        hotelLatitude: locationForm.hotelLatitude === "" ? null : Number(locationForm.hotelLatitude),
        hotelLongitude: locationForm.hotelLongitude === "" ? null : Number(locationForm.hotelLongitude),
      });
      setSuccess(response.data?.message || "Đã cập nhật vị trí khách sạn.");
    } catch (saveError) {
      setError(saveError?.response?.data?.message || "Không thể cập nhật vị trí khách sạn.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes ssmScaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
      <div
        onClick={(event) => event.target === event.currentTarget && onClose()}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.55)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1600,
          padding: 20,
        }}
      >
        <div style={modalCardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              padding: "20px 24px",
              borderBottom: "1px solid var(--a-border)",
              background: "var(--a-surface-raised)",
              flexShrink: 0,
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--a-text-muted)" }}>
                Setting
              </div>
              <h3 style={{ margin: "6px 0 0", fontSize: 24, color: "var(--a-text)", fontWeight: 800 }}>Cấu hình hệ thống</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                border: "1px solid var(--a-border)",
                background: "var(--a-surface)",
                color: "var(--a-text-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div
            style={{
              margin: 20,
              padding: 24,
              borderRadius: 16,
              background: "var(--a-surface-raised)",
              border: "1px solid var(--a-border)",
              overflowY: "auto",
            }}
          >
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          {[
            { key: TAB_KEYS.deposit, label: "Tiền cọc" },
            { key: TAB_KEYS.location, label: "Vị trí khách sạn" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: activeTab === tab.key ? "1px solid var(--a-primary)" : "1px solid var(--a-border)",
                background: activeTab === tab.key ? "var(--a-primary-soft)" : "var(--a-surface-raised)",
                color: activeTab === tab.key ? "var(--a-primary)" : "var(--a-text-muted)",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error ? (
          <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, border: "1px solid var(--a-error-border)", background: "var(--a-error-bg)", color: "var(--a-error)", fontWeight: 700 }}>
            {error}
          </div>
        ) : null}
        {success ? (
          <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, border: "1px solid var(--a-success-border)", background: "var(--a-success-bg)", color: "var(--a-success)", fontWeight: 700 }}>
            {success}
          </div>
        ) : null}

        {loading ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--a-text-muted)" }}>Đang tải cấu hình...</div>
        ) : null}

        {!loading && activeTab === TAB_KEYS.deposit ? (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 800, color: "var(--a-text-muted)" }}>
                  % cọc để xác nhận booking
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={depositForm.bookingDepositPercent}
                  onChange={(event) => setDepositForm((prev) => ({ ...prev, bookingDepositPercent: event.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 800, color: "var(--a-text-muted)" }}>
                  % cần đạt để check-in
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={depositForm.checkInRequiredPercent}
                  onChange={(event) => setDepositForm((prev) => ({ ...prev, checkInRequiredPercent: event.target.value }))}
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ color: "var(--a-text-muted)", fontSize: 13, lineHeight: 1.6 }}>
              Cấu hình này sẽ ảnh hưởng các booking mới và tự động tính lại ngưỡng tiền cọc cho booking chưa hoàn tất.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={handleSaveDeposit}
                disabled={saving}
                style={{
                  padding: "11px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: "var(--a-primary)",
                  color: "var(--a-text-inverse)",
                  fontWeight: 800,
                  cursor: "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Đang lưu..." : "Lưu cấu hình tiền cọc"}
              </button>
            </div>
          </div>
        ) : null}

        {!loading && activeTab === TAB_KEYS.location ? (
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 800, color: "var(--a-text-muted)" }}>
                Địa chỉ khách sạn
              </label>
              <input
                value={locationForm.hotelAddress}
                onChange={(event) => setLocationForm((prev) => ({ ...prev, hotelAddress: event.target.value }))}
                style={inputStyle}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 800, color: "var(--a-text-muted)" }}>
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={locationForm.hotelLatitude}
                  onChange={(event) => setLocationForm((prev) => ({ ...prev, hotelLatitude: event.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 800, color: "var(--a-text-muted)" }}>
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={locationForm.hotelLongitude}
                  onChange={(event) => setLocationForm((prev) => ({ ...prev, hotelLongitude: event.target.value }))}
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ color: "var(--a-text-muted)", fontSize: 13, lineHeight: 1.6 }}>
              Khi thay đổi vị trí, hệ thống sẽ tự động tính lại khoảng cách cho các địa điểm đang lưu.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={handleSaveLocation}
                disabled={saving}
                style={{
                  padding: "11px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: "var(--a-primary)",
                  color: "var(--a-text-inverse)",
                  fontWeight: 800,
                  cursor: "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Đang lưu..." : "Lưu vị trí khách sạn"}
              </button>
            </div>
          </div>
        ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
