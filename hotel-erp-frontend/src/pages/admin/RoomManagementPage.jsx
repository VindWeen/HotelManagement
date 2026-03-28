// src/pages/admin/RoomManagementPage.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
    getRooms,
    getRoomById,
    createRoom,
    updateRoom,
    updateBusinessStatus,
    updateCleaningStatus,
    bulkCreateRooms,
} from "../../api/roomsApi";
import { getRoomTypes } from "../../api/roomTypesApi";
import { getInventoryByRoom, cloneInventory } from "../../api/roomInventoriesApi";
import { getAmenities } from "../../api/amenitiesApi";

// ─── Constants ─────────────────────────────────────────────────────────────────
const BUSINESS_STATUS_CONFIG = {
    Available: {
        label: "Sẵn sàng",
        bg: "#ecfdf5",
        color: "#059669",
        border: "#a7f3d0",
        dot: "#10b981",
    },
    Occupied: {
        label: "Đang dùng",
        bg: "#fffbeb",
        color: "#d97706",
        border: "#fde68a",
        dot: "#f59e0b",
    },
    Disabled: {
        label: "Bảo trì",
        bg: "#f5f3ff",
        color: "#7c3aed",
        border: "#ddd6fe",
        dot: "#8b5cf6",
    },
};

const CLEANING_STATUS_CONFIG = {
    Clean: {
        label: "Sạch sẽ",
        bg: "#eff6ff",
        color: "#2563eb",
        border: "#bfdbfe",
        icon: "check_circle",
    },
    Dirty: {
        label: "Cần dọn",
        bg: "#fff7ed",
        color: "#ea580c",
        border: "#fed7aa",
        icon: "cleaning_services",
    },
};

const VIEW_TYPES = ["Biển", "Thành phố", "Núi", "Vườn", "Hồ bơi"];

// ─── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ id, msg, type = "success", dur = 4000, onDismiss }) {
    const styles = {
        success: { bg: "#1e3a2f", border: "#2d5a45", text: "#a7f3d0", prog: "#34d399", icon: "check_circle" },
        error: { bg: "#3a1e1e", border: "#5a2d2d", text: "#fca5a5", prog: "#f87171", icon: "error" },
        warning: { bg: "#3a2e1a", border: "#5a4820", text: "#fcd34d", prog: "#fbbf24", icon: "warning" },
        info: { bg: "#1e2f3a", border: "#2d4a5a", text: "#93c5fd", prog: "#60a5fa", icon: "info" },
    };
    const s = styles[type] || styles.info;
    useEffect(() => {
        const t = setTimeout(() => onDismiss(id), dur);
        return () => clearTimeout(t);
    }, []);
    return (
        <div style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text, borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,.35)", pointerEvents: "auto", marginBottom: 10, minWidth: 280 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "13px 13px 9px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 19, flexShrink: 0, marginTop: 1, fontVariationSettings: "'FILL' 1,'wght' 400" }}>{s.icon}</span>
                <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, margin: 0, flex: 1 }}>{msg}</p>
                <button onClick={() => onDismiss(id)} style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.4, color: "inherit", padding: 2 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                </button>
            </div>
            <div style={{ margin: "0 12px 9px", height: 3, borderRadius: 9999, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
                <div style={{ height: "100%", background: s.prog, animation: `toastProgress ${dur}ms linear forwards` }} />
            </div>
        </div>
    );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────────
function SkeletonRows() {
    return Array.from({ length: 6 }).map((_, i) => (
        <tr key={i}>
            {Array.from({ length: 6 }).map((_, j) => (
                <td key={j} style={{ padding: "18px 24px" }}>
                    <div className="skeleton" style={{ height: 14, width: j === 0 ? 50 : j === 2 ? 160 : 80, borderRadius: 6 }} />
                </td>
            ))}
        </tr>
    ));
}

// ─── Room Card (for grid view) ──────────────────────────────────────────────────
function RoomCard({ room, onDetail }) {
    const bsCfg = BUSINESS_STATUS_CONFIG[room.businessStatus] || BUSINESS_STATUS_CONFIG.Available;
    const clCfg = CLEANING_STATUS_CONFIG[room.cleaningStatus] || CLEANING_STATUS_CONFIG.Clean;
    return (
        <div
            onClick={() => onDetail(room.id)}
            style={{
                background: "white",
                border: `1.5px solid ${bsCfg.border}`,
                borderRadius: 16,
                padding: "16px 18px",
                cursor: "pointer",
                transition: "all .18s",
                position: "relative",
                overflow: "hidden",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
        >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: bsCfg.dot, borderRadius: "16px 16px 0 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, paddingTop: 4 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#1c1917", fontFamily: "Manrope, sans-serif" }}>{room.roomNumber}</span>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: bsCfg.dot, flexShrink: 0, marginTop: 6 }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,.4)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {room.roomTypeName || "—"}
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: bsCfg.color, background: bsCfg.bg, padding: "2px 8px", borderRadius: 9999 }}>
                    {bsCfg.label}
                </span>
                <span style={{ fontSize: 10, color: "#9ca3af" }}>T.{room.floor || "?"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13, color: clCfg.color, fontVariationSettings: "'FILL' 1" }}>{clCfg.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: clCfg.color }}>{clCfg.label}</span>
            </div>
        </div>
    );
}

// ─── Status Dropdown ────────────────────────────────────────────────────────────
function StatusDropdown({ options, current, onSelect, configMap }) {
    const [open, setOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef(null);
    const menuRef = useRef(null);
    const cfg = configMap[current] || {};

    const openMenu = () => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            // position: absolute trên body → cần cộng scroll
            setMenuPos({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
            });
        }
        setOpen(true);
    };

    useEffect(() => {
        if (!open) return;
        const handleClick = (e) => {
            if (
                btnRef.current && !btnRef.current.contains(e.target) &&
                menuRef.current && !menuRef.current.contains(e.target)
            ) setOpen(false);
        };
        const handleScroll = () => setOpen(false);
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("scroll", handleScroll, true);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("scroll", handleScroll, true);
        };
    }, [open]);

    const menu = open ? createPortal(
        <div
            ref={menuRef}
            style={{
                position: "absolute",
                top: menuPos.top,
                left: menuPos.left,
                zIndex: 9999,
                background: "white",
                borderRadius: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,.14)",
                border: "1px solid #f1f0ea",
                minWidth: 150,
                overflow: "hidden",
            }}
        >
            {options.map((opt) => {
                const optCfg = configMap[opt] || {};
                return (
                    <button
                        key={opt}
                        onClick={() => { onSelect(opt); setOpen(false); }}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", width: "100%", background: opt === current ? "#f9f8f3" : "transparent", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: optCfg.color || "#374151", textAlign: "left", fontFamily: "Manrope, sans-serif" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f9f8f3"}
                        onMouseLeave={e => e.currentTarget.style.background = opt === current ? "#f9f8f3" : "transparent"}
                    >
                        {optCfg.dot && <span style={{ width: 7, height: 7, borderRadius: "50%", background: optCfg.dot, flexShrink: 0 }} />}
                        {optCfg.icon && <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1", color: optCfg.color }}>{optCfg.icon}</span>}
                        {optCfg.label || opt}
                        {opt === current && <span className="material-symbols-outlined" style={{ fontSize: 14, marginLeft: "auto", color: "#4f645b" }}>check</span>}
                    </button>
                );
            })}
        </div>,
        document.body
    ) : null;

    return (
        <div style={{ display: "inline-block" }}>
            <button
                ref={btnRef}
                onClick={() => open ? setOpen(false) : openMenu()}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, border: `1.5px solid ${cfg.border || "#e2e8e1"}`, background: cfg.bg || "#f9f8f3", cursor: "pointer", fontSize: 12, fontWeight: 700, color: cfg.color || "#6b7280", fontFamily: "Manrope, sans-serif" }}
            >
                {cfg.dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />}
                {cfg.icon && <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>{cfg.icon}</span>}
                <span>{cfg.label || current}</span>
                <span className="material-symbols-outlined" style={{ fontSize: 14, opacity: 0.5 }}>expand_more</span>
            </button>
            {menu}
        </div>
    );
}

// ─── Create Room Modal ─────────────────────────────────────────────────────────
function CreateRoomModal({ roomTypes, allRooms, onClose, onCreated, showToast }) {
    const [mode, setMode] = useState("single"); // single | bulk
    const [roomNumber, setRoomNumber] = useState("");
    const [floor, setFloor] = useState("");
    const [roomTypeId, setRoomTypeId] = useState("");
    const [viewType, setViewType] = useState("");
    const [cloneFromRoomId, setCloneFromRoomId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Bulk create
    const [bulkText, setBulkText] = useState("");

    // Get selected room type details
    const selectedType = roomTypes.find((rt) => rt.id === parseInt(roomTypeId));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!roomNumber.trim()) return setError("Số phòng không được để trống.");
        if (!roomTypeId) return setError("Vui lòng chọn hạng phòng.");

        setLoading(true);
        try {
            const res = await createRoom({
                roomNumber: roomNumber.trim(),
                floor: floor ? parseInt(floor) : null,
                roomTypeId: parseInt(roomTypeId),
                viewType: viewType || null,
            });

            // Clone inventory if selected
            if (cloneFromRoomId && res.data?.id) {
                try {
                    await cloneInventory(parseInt(cloneFromRoomId), [res.data.id]);
                    showToast("Đã clone vật tư từ phòng mẫu.", "info");
                } catch (_) { }
            }

            showToast(`Đã tạo phòng ${roomNumber} thành công!`, "success");
            onCreated();
            onClose();
        } catch (err) {
            setError(err?.response?.data?.message || "Tạo phòng thất bại.");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!roomTypeId) return setError("Vui lòng chọn hạng phòng.");
        const lines = bulkText.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return setError("Nhập ít nhất 1 số phòng.");

        const items = lines.map(line => {
            const parts = line.split(/[\s,]+/);
            return {
                roomNumber: parts[0],
                floor: parts[1] ? parseInt(parts[1]) : null,
                roomTypeId: parseInt(roomTypeId),
                viewType: viewType || null,
            };
        });

        setLoading(true);
        try {
            const res = await bulkCreateRooms(items);
            const { created = [], skipped = [], invalid = [] } = res.data || {};
            showToast(`Tạo ${created.length} phòng. Bỏ qua: ${skipped.length}. Lỗi: ${invalid.length}.`, "success");
            onCreated();
            onClose();
        } catch (err) {
            setError(err?.response?.data?.message || "Thêm nhiều phòng thất bại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div style={{ background: "white", borderRadius: 24, width: "100%", maxWidth: 680, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,.18)" }}>
                {/* Header */}
                <div style={{ padding: "24px 28px 16px", borderBottom: "1px solid #f1f0ea", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", margin: 0, fontFamily: "Manrope, sans-serif" }}>Thêm phòng mới</h3>
                        <p style={{ fontSize: 12, color: "#6b7280", margin: "3px 0 0" }}>Điền thông tin để tạo phòng trong hệ thống</p>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: "#9ca3af", display: "flex" }}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Mode Tabs */}
                <div style={{ padding: "16px 28px 0", display: "flex", gap: 8, flexShrink: 0 }}>
                    {["single", "bulk"].map(m => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); setError(""); }}
                            style={{
                                padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "Manrope, sans-serif",
                                background: mode === m ? "#4f645b" : "#f1f0ea",
                                color: mode === m ? "#e7fef3" : "#6b7280",
                                transition: "all .15s",
                            }}
                        >
                            {m === "single" ? "Tạo 1 phòng" : "Tạo nhiều phòng"}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div style={{ padding: "20px 28px 0", overflowY: "auto", flex: 1 }}>
                    {mode === "single" ? (
                        <form id="create-room-form" onSubmit={handleSubmit} noValidate>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                                <div>
                                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#6b7280", marginBottom: 6 }}>Số phòng *</label>
                                    <input
                                        value={roomNumber}
                                        onChange={e => setRoomNumber(e.target.value)}
                                        placeholder="VD: 101, VILLA-1"
                                        style={{ width: "100%", borderRadius: 12, border: "1.5px solid #e2e8e1", padding: "10px 14px", fontSize: 14, background: "#f9f8f3", outline: "none", boxSizing: "border-box" }}
                                        onFocus={e => e.target.style.borderColor = "#4f645b"}
                                        onBlur={e => e.target.style.borderColor = "#e2e8e1"}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#6b7280", marginBottom: 6 }}>Tầng</label>
                                    <input
                                        value={floor}
                                        onChange={e => setFloor(e.target.value)}
                                        type="number"
                                        placeholder="VD: 1, 2, 3..."
                                        style={{ width: "100%", borderRadius: 12, border: "1.5px solid #e2e8e1", padding: "10px 14px", fontSize: 14, background: "#f9f8f3", outline: "none", boxSizing: "border-box" }}
                                        onFocus={e => e.target.style.borderColor = "#4f645b"}
                                        onBlur={e => e.target.style.borderColor = "#e2e8e1"}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#6b7280", marginBottom: 6 }}>Hạng phòng *</label>
                                <select
                                    value={roomTypeId}
                                    onChange={e => setRoomTypeId(e.target.value)}
                                    style={{ width: "100%", borderRadius: 12, border: "1.5px solid #e2e8e1", padding: "10px 14px", fontSize: 14, background: "#f9f8f3", outline: "none" }}
                                    onFocus={e => e.target.style.borderColor = "#4f645b"}
                                    onBlur={e => e.target.style.borderColor = "#e2e8e1"}
                                >
                                    <option value="">-- Chọn hạng phòng --</option>
                                    {roomTypes.map(rt => (
                                        <option key={rt.id} value={rt.id}>
                                            {rt.name} — {new Intl.NumberFormat("vi-VN").format(rt.basePrice)}đ/đêm · {rt.capacityAdults} người lớn
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Room Type Preview Card */}
                            {selectedType && (
                                <div style={{ marginBottom: 16, borderRadius: 16, overflow: "hidden", border: "1.5px solid #e2e8e1" }}>
                                    {selectedType.primaryImage && (
                                        <div style={{ position: "relative", height: 160 }}>
                                            <img
                                                src={selectedType.primaryImage.imageUrl}
                                                alt={selectedType.name}
                                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                                            />
                                            <div style={{ display: "none", width: "100%", height: "100%", background: "linear-gradient(135deg, #d1e8dd 0%, #c3dacf 100%)", alignItems: "center", justifyContent: "center" }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#4f645b", opacity: 0.5 }}>bed</span>
                                            </div>
                                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 100%)", padding: "20px 16px 10px" }}>
                                                <p style={{ color: "white", fontSize: 15, fontWeight: 800, margin: 0, fontFamily: "Manrope, sans-serif" }}>{selectedType.name}</p>
                                                <p style={{ color: "rgba(255,255,255,.75)", fontSize: 12, margin: "2px 0 0" }}>
                                                    {selectedType.bedType} · {selectedType.areaSqm}m² · {selectedType.viewType}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {!selectedType.primaryImage && (
                                        <div style={{ height: 100, background: "linear-gradient(135deg, #d1e8dd 0%, #c3dacf 100%)", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 36, color: "#4f645b", opacity: 0.7 }}>bed</span>
                                            <div>
                                                <p style={{ color: "#2f433c", fontSize: 14, fontWeight: 800, margin: 0, fontFamily: "Manrope, sans-serif" }}>{selectedType.name}</p>
                                                <p style={{ color: "#4f645b", fontSize: 12, margin: "2px 0 0" }}>{selectedType.bedType} · {selectedType.areaSqm}m²</p>
                                            </div>
                                        </div>
                                    )}
                                    {selectedType.amenities && selectedType.amenities.length > 0 && (
                                        <div style={{ padding: "12px 14px", background: "#fafaf8" }}>
                                            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#9ca3af", margin: "0 0 8px" }}>Tiện nghi</p>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                                {selectedType.amenities.map(a => (
                                                    <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", background: "#e8f5f0", color: "#2f433c", borderRadius: 9999, fontSize: 11, fontWeight: 600 }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>
                                                            {a.iconUrl || "star"}
                                                        </span>
                                                        {a.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                                <div>
                                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#6b7280", marginBottom: 6 }}>Hướng nhìn</label>
                                    <select
                                        value={viewType}
                                        onChange={e => setViewType(e.target.value)}
                                        style={{ width: "100%", borderRadius: 12, border: "1.5px solid #e2e8e1", padding: "10px 14px", fontSize: 14, background: "#f9f8f3", outline: "none" }}
                                        onFocus={e => e.target.style.borderColor = "#4f645b"}
                                        onBlur={e => e.target.style.borderColor = "#e2e8e1"}
                                    >
                                        <option value="">-- Chọn hướng nhìn --</option>
                                        {VIEW_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#6b7280", marginBottom: 6 }}>Clone vật tư từ phòng</label>
                                    <select
                                        value={cloneFromRoomId}
                                        onChange={e => setCloneFromRoomId(e.target.value)}
                                        style={{ width: "100%", borderRadius: 12, border: "1.5px solid #e2e8e1", padding: "10px 14px", fontSize: 14, background: "#f9f8f3", outline: "none" }}
                                        onFocus={e => e.target.style.borderColor = "#4f645b"}
                                        onBlur={e => e.target.style.borderColor = "#e2e8e1"}
                                    >
                                        <option value="">-- Không clone --</option>
                                        {allRooms.map(r => (
                                            <option key={r.id} value={r.id}>
                                                {r.roomNumber} ({r.roomTypeName || "N/A"})
                                            </option>
                                        ))}
                                    </select>
                                    {cloneFromRoomId && (
                                        <p style={{ fontSize: 11, color: "#4f645b", margin: "4px 0 0", fontWeight: 600 }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 13, verticalAlign: "middle" }}>info</span>
                                            {" "}Vật tư & minibar sẽ được sao chép từ phòng đã chọn
                                        </p>
                                    )}
                                </div>
                            </div>
                        </form>
                    ) : (
                        <form id="create-room-form" onSubmit={handleBulkSubmit} noValidate>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#6b7280", marginBottom: 6 }}>Hạng phòng *</label>
                                <select
                                    value={roomTypeId}
                                    onChange={e => setRoomTypeId(e.target.value)}
                                    style={{ width: "100%", borderRadius: 12, border: "1.5px solid #e2e8e1", padding: "10px 14px", fontSize: 14, background: "#f9f8f3", outline: "none" }}
                                >
                                    <option value="">-- Chọn hạng phòng --</option>
                                    {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                                </select>
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#6b7280", marginBottom: 6 }}>Hướng nhìn</label>
                                <select
                                    value={viewType}
                                    onChange={e => setViewType(e.target.value)}
                                    style={{ width: "100%", borderRadius: 12, border: "1.5px solid #e2e8e1", padding: "10px 14px", fontSize: 14, background: "#f9f8f3", outline: "none" }}
                                >
                                    <option value="">-- Chọn hướng nhìn --</option>
                                    {VIEW_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                            <div style={{ marginBottom: 8 }}>
                                <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#6b7280", marginBottom: 6 }}>
                                    Danh sách phòng (mỗi dòng 1 phòng) *
                                </label>
                                <textarea
                                    value={bulkText}
                                    onChange={e => setBulkText(e.target.value)}
                                    rows={8}
                                    placeholder={"101 1\n102 1\n201 2\n202 2\n(Định dạng: số_phòng tầng)"}
                                    style={{ width: "100%", borderRadius: 12, border: "1.5px solid #e2e8e1", padding: "10px 14px", fontSize: 13, background: "#f9f8f3", outline: "none", resize: "vertical", fontFamily: "monospace", boxSizing: "border-box" }}
                                    onFocus={e => e.target.style.borderColor = "#4f645b"}
                                    onBlur={e => e.target.style.borderColor = "#e2e8e1"}
                                />
                                <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>
                                    Định dạng: <code style={{ background: "#f1f0ea", padding: "1px 5px", borderRadius: 4 }}>số_phòng tầng</code> — Tầng có thể bỏ qua. VD: <code style={{ background: "#f1f0ea", padding: "1px 5px", borderRadius: 4 }}>101 1</code>
                                </p>
                            </div>
                        </form>
                    )}

                    {error && (
                        <div style={{ padding: "10px 14px", background: "rgba(168,56,54,.08)", border: "1px solid rgba(168,56,54,.2)", borderRadius: 12, display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#a83836", fontVariationSettings: "'FILL' 1" }}>error</span>
                            <span style={{ fontSize: 13, color: "#a83836", fontWeight: 500 }}>{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: "16px 28px 24px", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0, borderTop: "1px solid #f1f0ea", marginTop: 8 }}>
                    <button onClick={onClose} style={{ padding: "10px 22px", borderRadius: 12, fontSize: 14, fontWeight: 600, background: "none", border: "1.5px solid #e2e8e1", color: "#6b7280", cursor: "pointer" }}>
                        Hủy
                    </button>
                    <button
                        type="submit"
                        form="create-room-form"
                        disabled={loading}
                        style={{ padding: "10px 22px", borderRadius: 12, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg, #4f645b 0%, #43574f 100%)", color: "#e7fef3", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, opacity: loading ? 0.6 : 1 }}
                    >
                        {loading && <div style={{ width: 14, height: 14, border: "2px solid rgba(231,254,243,.4)", borderTopColor: "#e7fef3", borderRadius: "50%", animation: "spin .65s linear infinite" }} />}
                        {mode === "bulk" ? "Tạo nhiều phòng" : "Tạo phòng"}
                    </button>
                </div>
            </div>
        </div>
    );
}


// ─── Main Component ────────────────────────────────────────────────────────────
export default function RoomManagementPage() {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [roomTypes, setRoomTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState("table"); // table | grid
    const [toasts, setToasts] = useState([]);
    const [filters, setFilters] = useState({ businessStatus: "", cleaningStatus: "", roomTypeId: "", floor: "" });
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(12);
    const debounceRef = useRef(null);

    const showToast = useCallback((msg, type = "success") => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, msg, type }]);
    }, []);

    const dismissToast = useCallback(id => setToasts(prev => prev.filter(t => t.id !== id)), []);

    const loadRooms = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.businessStatus) params.businessStatus = filters.businessStatus;
            if (filters.cleaningStatus) params.cleaningStatus = filters.cleaningStatus;
            if (filters.roomTypeId) params.roomTypeId = parseInt(filters.roomTypeId);
            if (filters.floor) params.floor = parseInt(filters.floor);
            const res = await getRooms(params);
            setRooms(res.data?.data || []);
            setPage(1);
        } catch (err) {
            showToast("Không thể tải danh sách phòng.", "error");
        } finally {
            setLoading(false);
        }
    }, [filters]);

    const loadRoomTypes = useCallback(async () => {
        try {
            const res = await getRoomTypes();
            setRoomTypes(res.data || []);
        } catch (_) { }
    }, []);

    useEffect(() => { loadRooms(); }, [loadRooms]);
    useEffect(() => { loadRoomTypes(); }, [loadRoomTypes]);

    // Stats
    const stats = {
        total: rooms.length,
        available: rooms.filter(r => r.businessStatus === "Available").length,
        occupied: rooms.filter(r => r.businessStatus === "Occupied").length,
        disabled: rooms.filter(r => r.businessStatus === "Disabled").length,
        dirty: rooms.filter(r => r.cleaningStatus === "Dirty").length,
    };

    // Pagination
    const totalPages = Math.max(1, Math.ceil(rooms.length / pageSize));
    const paginatedRooms = rooms.slice((page - 1) * pageSize, page * pageSize);

    // Unique floors for filter
    const floors = [...new Set(rooms.map(r => r.floor).filter(Boolean))].sort((a, b) => a - b);

    const clearFilters = () => setFilters({ businessStatus: "", cleaningStatus: "", roomTypeId: "", floor: "" });
    const hasFilters = Object.values(filters).some(Boolean);

    return (
        <>
            <style>{`
        .material-symbols-outlined { font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; vertical-align:middle; }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        @keyframes toastProgress { from{width:100%} to{width:0} }
        @keyframes fadeRow { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .skeleton { background:linear-gradient(90deg,#e8e8e0 25%,#f2f2ea 50%,#e8e8e0 75%); background-size:600px; animation:shimmer 1.4s infinite; border-radius:6px; }
        .fade-row { animation:fadeRow .2s ease forwards; }
        tbody tr:hover td { background:#fafaf8 !important; }
        .pg-btn { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:600; color:#6b7280; background:transparent; border:none; cursor:pointer; transition:background .15s,color .15s; font-family:'Manrope',sans-serif; }
        .pg-btn:hover:not(:disabled) { background:#f3f4f6; }
        .pg-btn.active { background:#4f645b; color:#e7fef3; cursor:default; }
        .pg-btn:disabled { opacity:.35; cursor:not-allowed; }
      `}</style>

            {/* Toast Container */}
            <div style={{ position: "fixed", top: 24, right: 24, zIndex: 300, pointerEvents: "none", minWidth: 280 }}>
                {toasts.map(t => <Toast key={t.id} {...t} onDismiss={dismissToast} />)}
            </div>

            {/* Create Modal */}
            {createModalOpen && (
                <CreateRoomModal
                    roomTypes={roomTypes}
                    allRooms={rooms}
                    onClose={() => setCreateModalOpen(false)}
                    onCreated={loadRooms}
                    showToast={showToast}
                />
            )}

            {/* Detail Modal Removed as we navigate to RoomDetailPage now */}

            <div style={{ maxWidth: 1400, margin: "0 auto" }}>
                {/* Page Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
                    <div>
                        <h2 style={{ fontSize: 26, fontWeight: 800, color: "#1c1917", letterSpacing: "-0.025em", margin: "0 0 4px", fontFamily: "Manrope, sans-serif" }}>
                            Quản lý Phòng
                        </h2>
                        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                            Tổng <span style={{ fontWeight: 700, color: "#1c1917" }}>{stats.total}</span> phòng
                            {hasFilters && <span style={{ color: "#4f645b", fontWeight: 600, marginLeft: 4 }}>(đang lọc)</span>}
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {/* View toggle */}
                        <div style={{ display: "flex", gap: 2, background: "#f1f0ea", padding: 4, borderRadius: 12 }}>
                            {["table", "grid"].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setViewMode(m)}
                                    style={{ padding: "7px 14px", borderRadius: 9, background: viewMode === m ? "white" : "transparent", border: "none", cursor: "pointer", color: viewMode === m ? "#1c1917" : "#9ca3af", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, boxShadow: viewMode === m ? "0 1px 4px rgba(0,0,0,.1)" : "none", transition: "all .15s", fontFamily: "Manrope, sans-serif" }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{m === "table" ? "table_rows" : "grid_view"}</span>
                                    {m === "table" ? "Bảng" : "Lưới"}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setCreateModalOpen(true)}
                            style={{ padding: "9px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700, background: "#4f645b", color: "#e7fef3", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, boxShadow: "0 4px 12px rgba(79,100,91,.2)", fontFamily: "Manrope, sans-serif" }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
                            Thêm phòng
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
                    {[
                        { label: "TỔNG PHÒNG", value: stats.total, bg: "#f8f9fa", color: "#6b7280", border: "#f1f0ea" },
                        { label: "SẴN SÀNG", value: stats.available, bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
                        { label: "ĐANG DÙNG", value: stats.occupied, bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
                        { label: "BẢO TRÌ", value: stats.disabled, bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" },
                        { label: "CẦN DỌN", value: stats.dirty, bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
                    ].map(s => (
                        <div key={s.label} style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 16, padding: "16px 18px", textAlign: "center" }}>
                            <p style={{ fontSize: 24, fontWeight: 800, color: s.color, margin: "0 0 4px", fontFamily: "Manrope, sans-serif" }}>{s.value}</p>
                            <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: s.color, margin: 0, opacity: 0.7 }}>{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Filter Bar */}
                <div style={{ background: "white", borderRadius: 18, padding: "18px 22px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,.06)", border: "1px solid #f1f0ea", display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
                    {[
                        {
                            label: "Trạng thái KD",
                            key: "businessStatus",
                            options: [{ value: "", label: "Tất cả" }, { value: "Available", label: "Sẵn sàng" }, { value: "Occupied", label: "Đang dùng" }, { value: "Disabled", label: "Bảo trì" }],
                        },
                        {
                            label: "Tình trạng vệ sinh",
                            key: "cleaningStatus",
                            options: [{ value: "", label: "Tất cả" }, { value: "Clean", label: "Sạch sẽ" }, { value: "Dirty", label: "Cần dọn" }],
                        },
                        {
                            label: "Hạng phòng",
                            key: "roomTypeId",
                            options: [{ value: "", label: "Tất cả" }, ...roomTypes.map(rt => ({ value: rt.id.toString(), label: rt.name }))],
                        },
                        {
                            label: "Tầng",
                            key: "floor",
                            options: [{ value: "", label: "Tất cả" }, ...floors.map(f => ({ value: f.toString(), label: `Tầng ${f}` }))],
                        },
                    ].map(f => (
                        <div key={f.key} style={{ flex: 1, minWidth: 160 }}>
                            <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#9ca3af", marginBottom: 6 }}>{f.label}</label>
                            <select
                                value={filters[f.key]}
                                onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                                style={{ width: "100%", background: "#f9f8f3", border: "1.5px solid #e2e8e1", borderRadius: 12, padding: "9px 12px", fontSize: 13, fontWeight: 500, outline: "none", fontFamily: "Manrope, sans-serif" }}
                                onFocus={e => e.target.style.borderColor = "#4f645b"}
                                onBlur={e => e.target.style.borderColor = "#e2e8e1"}
                            >
                                {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    ))}
                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            style={{ padding: "9px 14px", borderRadius: 12, background: "#fee2e2", border: "1.5px solid #fecaca", color: "#dc2626", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 5, flexShrink: 0, fontFamily: "Manrope, sans-serif" }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>filter_alt_off</span>
                            Xóa lọc
                        </button>
                    )}
                </div>

                {/* Table View */}
                {viewMode === "table" && (
                    <div style={{ background: "white", borderRadius: 18, boxShadow: "0 1px 4px rgba(0,0,0,.06)", border: "1px solid #f1f0ea", overflow: "hidden" }}>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "rgba(249,248,243,.6)", borderBottom: "1px solid #f1f0ea" }}>
                                        {["Số phòng", "Tầng", "Hạng phòng", "Trạng thái KD", "Vệ sinh", "Thao tác"].map((h, i) => (
                                            <th key={h} style={{ padding: "15px 24px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#9ca3af", textAlign: i === 5 ? "right" : "left" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <SkeletonRows />
                                    ) : paginatedRooms.length === 0 ? null : (
                                        paginatedRooms.map((room, i) => {
                                            const bsCfg = BUSINESS_STATUS_CONFIG[room.businessStatus] || BUSINESS_STATUS_CONFIG.Available;
                                            const clCfg = CLEANING_STATUS_CONFIG[room.cleaningStatus] || CLEANING_STATUS_CONFIG.Clean;
                                            return (
                                                <tr key={room.id} className="fade-row" style={{ borderBottom: "1px solid #fafaf8", animationDelay: `${i * 20}ms` }}>
                                                    <td style={{ padding: "16px 24px" }}>
                                                        <span style={{ fontSize: 15, fontWeight: 800, color: "#1c1917", fontFamily: "Manrope, sans-serif" }}>{room.roomNumber}</span>
                                                        <span style={{ marginLeft: 8, fontSize: 11, color: "#9ca3af" }}>#{room.id}</span>
                                                    </td>
                                                    <td style={{ padding: "16px 24px", fontSize: 14, color: "#4b5563", fontWeight: 500 }}>{room.floor || "—"}</td>
                                                    <td style={{ padding: "16px 24px", fontSize: 13, color: "#374151", fontWeight: 500 }}>{room.roomTypeName || "—"}</td>
                                                    <td style={{ padding: "16px 24px" }}>
                                                        <StatusDropdown
                                                            options={["Available", "Occupied", "Disabled"]}
                                                            current={room.businessStatus}
                                                            onSelect={async (val) => {
                                                                try {
                                                                    await updateBusinessStatus(room.id, val);
                                                                    showToast(`Phòng ${room.roomNumber}: ${BUSINESS_STATUS_CONFIG[val]?.label}`, "success");
                                                                    loadRooms();
                                                                } catch (err) {
                                                                    showToast(err?.response?.data?.message || "Lỗi cập nhật trạng thái.", "error");
                                                                }
                                                            }}
                                                            configMap={BUSINESS_STATUS_CONFIG}
                                                        />
                                                    </td>
                                                    <td style={{ padding: "16px 24px" }}>
                                                        <StatusDropdown
                                                            options={["Clean", "Dirty"]}
                                                            current={room.cleaningStatus}
                                                            onSelect={async (val) => {
                                                                try {
                                                                    await updateCleaningStatus(room.id, val);
                                                                    showToast(`Phòng ${room.roomNumber}: ${CLEANING_STATUS_CONFIG[val]?.label}`, "success");
                                                                    loadRooms();
                                                                } catch (err) {
                                                                    showToast(err?.response?.data?.message || "Lỗi cập nhật vệ sinh.", "error");
                                                                }
                                                            }}
                                                            configMap={CLEANING_STATUS_CONFIG}
                                                        />
                                                    </td>
                                                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                                        <button
                                                            onClick={() => navigate(`/admin/rooms/${room.id}`)}
                                                            style={{ padding: "7px 14px", borderRadius: 10, background: "#f0faf5", border: "1.5px solid #a7f3d0", color: "#059669", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, marginLeft: "auto", fontFamily: "Manrope, sans-serif" }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = "#4f645b"; e.currentTarget.style.color = "#e7fef3"; e.currentTarget.style.borderColor = "#4f645b"; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = "#f0faf5"; e.currentTarget.style.color = "#059669"; e.currentTarget.style.borderColor = "#a7f3d0"; }}
                                                        >
                                                            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>visibility</span>
                                                            Chi tiết
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Empty State */}
                        {!loading && paginatedRooms.length === 0 && (
                            <div style={{ padding: "64px 0", textAlign: "center" }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 52, color: "#d1d5db", display: "block", marginBottom: 12 }}>meeting_room</span>
                                <p style={{ color: "#9ca3af", fontWeight: 600, fontSize: 14 }}>Không tìm thấy phòng nào</p>
                                {hasFilters && (
                                    <button onClick={clearFilters} style={{ marginTop: 12, padding: "7px 18px", borderRadius: 10, background: "#4f645b", color: "#e7fef3", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                                        Xóa bộ lọc
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Pagination */}
                        {!loading && rooms.length > 0 && (
                            <div style={{ padding: "14px 24px", borderTop: "1px solid #f1f0ea", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>
                                    {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, rooms.length)} / {rooms.length} phòng
                                </span>
                                <div style={{ display: "flex", gap: 4 }}>
                                    <button className="pg-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
                                    </button>
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        const n = totalPages <= 5 ? i + 1 : Math.max(1, page - 2) + i;
                                        if (n > totalPages) return null;
                                        return (
                                            <button key={n} className={`pg-btn${n === page ? " active" : ""}`} onClick={() => setPage(n)}>{n}</button>
                                        );
                                    })}
                                    <button className="pg-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Grid View */}
                {viewMode === "grid" && (
                    <>
                        {loading ? (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="skeleton" style={{ height: 130, borderRadius: 16 }} />
                                ))}
                            </div>
                        ) : paginatedRooms.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "64px 0" }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 52, color: "#d1d5db", display: "block", marginBottom: 12 }}>meeting_room</span>
                                <p style={{ color: "#9ca3af", fontWeight: 600 }}>Không tìm thấy phòng nào</p>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
                                    {paginatedRooms.map(room => (
                                        <RoomCard key={room.id} room={room} onDetail={(id) => navigate(`/admin/rooms/${id}`)} />
                                    ))}
                                </div>
                                {/* Grid pagination */}
                                {rooms.length > pageSize && (
                                    <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 4 }}>
                                        <button className="pg-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
                                        </button>
                                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                            const n = Math.max(1, page - 2) + i;
                                            if (n > totalPages) return null;
                                            return <button key={n} className={`pg-btn${n === page ? " active" : ""}`} onClick={() => setPage(n)}>{n}</button>;
                                        })}
                                        <button className="pg-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </>
    );
}