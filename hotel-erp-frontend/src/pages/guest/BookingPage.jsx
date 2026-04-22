import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getGuestAvailability, createBooking, getMyBookings, cancelBooking } from "../../api/bookingsApi";
import { validateVoucher } from "../../api/vouchersApi";
import {
  PageContainer,
  SectionTitle,
  LoadingSpinner,
  StatusBadge,
  GuestModal,
  EmptyState,
} from "../../components/guest";
import { formatCurrency } from "../../utils";
import { getBookingStatusLabel } from "../../utils/statusLabels";
import { useAdminAuthStore } from "../../store/adminAuthStore";

/* ─────────────────────────────────────────────
   CONSTANTS & HELPERS
───────────────────────────────────────────── */
const MAX_PENDING = 3; // giới hạn booking pending mỗi tài khoản
const DEPOSIT_RATE = 0.3; // 30%

const today = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const formatDateVN = (v) => {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTimeVN = (v) => {
  if (!v) return "—";
  return new Date(v).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const calcNights = (ci, co) => {
  if (!ci || !co) return 0;
  const d = Math.floor((new Date(co) - new Date(ci)) / 86400000);
  return d < 1 ? 1 : d;
};

const getStatusVariant = (status) => {
  if (status === "Confirmed") return "info";
  if (status === "Pending") return "warning";
  if (status === "Checked_in" || status === "CheckedIn") return "success";
  if (status === "Completed") return "neutral";
  if (status === "Cancelled" || status === "NoShow") return "error";
  if (status === "Checked_out_pending_settlement") return "warning";
  return "primary";
};

/* ─────────────────────────────────────────────
   INLINE STYLES
───────────────────────────────────────────── */
const PAGE_CSS = `
  .bp-page { display: grid; gap: 48px; }

  /* ── Booking form grid ── */
  .bp-layout {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 32px;
    align-items: start;
  }
  @media (max-width: 1023px) {
    .bp-layout { grid-template-columns: 1fr; }
  }

  /* ── Step Header ── */
  .bp-steps {
    display: flex;
    gap: 0;
    border-radius: var(--g-radius-full);
    overflow: hidden;
    border: 1px solid var(--g-border);
    margin-bottom: 28px;
    background: var(--g-bg-card);
  }
  .bp-step {
    flex: 1;
    padding: 14px 12px;
    text-align: center;
    font-size: var(--g-text-sm);
    font-weight: 600;
    color: var(--g-text-muted);
    background: transparent;
    border-right: 1px solid var(--g-border);
    cursor: default;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    position: relative;
  }
  .bp-step:last-child { border-right: none; }
  .bp-step.done { color: var(--g-success); }
  .bp-step.active {
    background: var(--g-primary);
    color: var(--g-text-on-primary);
    font-weight: 700;
  }
  .bp-step-num {
    width: 22px; height: 22px;
    border-radius: 50%;
    border: 2px solid currentColor;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800; flex-shrink: 0;
  }
  .bp-step.active .bp-step-num { background: rgba(255,255,255,0.25); border-color: rgba(255,255,255,0.6); }
  .bp-step.done .bp-step-num { background: var(--g-success); border-color: var(--g-success); color: #fff; }

  /* ── Section cards ── */
  .bp-card {
    background: var(--g-bg-card);
    border: 1px solid var(--g-border);
    border-radius: var(--g-radius-lg);
    padding: 24px;
    margin-bottom: 20px;
  }
  .bp-card-title {
    font-size: var(--g-text-lg);
    font-weight: 700;
    color: var(--g-text);
    margin: 0 0 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    letter-spacing: var(--g-tracking-tight);
  }
  .bp-card-title span.material-symbols-outlined {
    font-size: 20px;
    color: var(--g-primary);
  }

  /* ── Form fields ── */
  .bp-form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }
  .bp-form-row.single { grid-template-columns: 1fr; }
  @media (max-width: 639px) {
    .bp-form-row { grid-template-columns: 1fr; }
  }
  .bp-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .bp-label {
    font-size: var(--g-text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: var(--g-tracking-widest);
    color: var(--g-text-muted);
  }
  .bp-label .bp-required { color: var(--g-error); margin-left: 3px; }
  .bp-input {
    padding: 11px 14px;
    border: 1.5px solid var(--g-border);
    border-radius: var(--g-radius-md);
    font-size: var(--g-text-sm);
    font-family: var(--g-font-body);
    color: var(--g-text);
    background: var(--g-surface);
    transition: border-color 0.2s, box-shadow 0.2s;
    width: 100%;
    box-sizing: border-box;
  }
  .bp-input:focus {
    outline: none;
    border-color: var(--g-primary);
    box-shadow: 0 0 0 3px rgba(26,56,38,0.08);
  }
  .bp-input.error { border-color: var(--g-error); }
  .bp-field-error {
    font-size: var(--g-text-xs);
    color: var(--g-error);
    margin-top: 2px;
  }
  .bp-input:disabled {
    background: var(--g-surface-raised);
    color: var(--g-text-muted);
    cursor: not-allowed;
  }

  /* Hide number spinners */
  .bp-input[type=number]::-webkit-inner-spin-button,
  .bp-input[type=number]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .bp-input[type=number] {
    -moz-appearance: textfield;
  }

  /* ── Room type list ── */
  .bp-room-types {
    display: grid;
    gap: 14px;
  }
  .bp-rt-card {
    border: 2px solid var(--g-border);
    border-radius: var(--g-radius-lg);
    overflow: hidden;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
    background: var(--g-bg-card);
    display: grid;
    grid-template-columns: 200px 1fr;
  }
  .bp-rt-card:hover {
    border-color: var(--g-primary-light);
    transform: translateY(-2px);
    box-shadow: var(--g-shadow-md);
  }
  .bp-rt-card.selected {
    border-color: var(--g-primary);
    box-shadow: 0 0 0 3px rgba(26,56,38,0.12), var(--g-shadow-md);
  }
  .bp-rt-card.unavailable {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .bp-rt-card.unavailable:hover { transform: none; box-shadow: none; }
  .bp-rt-img {
    width: 200px;
    height: 130px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .bp-rt-img-placeholder {
    width: 200px;
    height: 130px;
    background: linear-gradient(135deg, var(--g-surface-raised), var(--g-border));
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--g-text-faint);
  }
  .bp-rt-body {
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .bp-rt-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    flex-wrap: wrap;
  }
  .bp-rt-name {
    font-size: var(--g-text-base);
    font-weight: 700;
    color: var(--g-text);
    letter-spacing: var(--g-tracking-tight);
  }
  .bp-rt-price {
    font-size: var(--g-text-sm);
    font-weight: 700;
    color: var(--g-primary);
    white-space: nowrap;
  }
  .bp-rt-price span { font-size: var(--g-text-xs); font-weight: 400; color: var(--g-text-muted); }
  .bp-rt-meta {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  .bp-rt-badge {
    font-size: var(--g-text-xs);
    font-weight: 600;
    color: var(--g-text-muted);
    background: var(--g-surface-raised);
    padding: 3px 10px;
    border-radius: var(--g-radius-full);
    border: 1px solid var(--g-border-light);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .bp-rt-avail {
    font-size: var(--g-text-xs);
    font-weight: 700;
    color: var(--g-success);
    margin-top: 4px;
  }
  .bp-rt-unavail {
    font-size: var(--g-text-xs);
    font-weight: 700;
    color: var(--g-error);
    margin-top: 4px;
  }
  .bp-rt-selected-badge {
    font-size: var(--g-text-sm);
    font-weight: 700;
    color: #fff;
    background: #1a3826; /* Dark green matching user image */
    padding: 10px 16px;
    border-radius: var(--g-radius-md);
    margin-top: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    box-sizing: border-box;
    box-shadow: 0 4px 12px rgba(26,56,38,0.2);
  }
  @media (max-width: 639px) {
    .bp-rt-card { grid-template-columns: 1fr; }
    .bp-rt-img, .bp-rt-img-placeholder { width: 100%; height: 160px; }
  }

  /* ── Summary sidebar ── */
  .bp-summary {
    position: sticky;
    top: calc(var(--g-header-h) + 20px);
  }
  .bp-summary-card {
    background: var(--g-bg-card);
    border: 1px solid var(--g-border);
    border-radius: var(--g-radius-lg);
    overflow: hidden;
  }
  .bp-summary-head {
    padding: 18px 20px;
    background: var(--g-primary);
    color: var(--g-text-on-primary);
  }
  .bp-summary-head h3 {
    font-size: var(--g-text-base);
    font-weight: 700;
    margin: 0;
    letter-spacing: var(--g-tracking-tight);
  }
  .bp-summary-body {
    padding: 18px 20px;
    display: grid;
    gap: 12px;
  }
  .bp-sum-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    font-size: var(--g-text-sm);
  }
  .bp-sum-label { color: var(--g-text-muted); flex-shrink: 0; }
  .bp-sum-value { font-weight: 600; color: var(--g-text); text-align: right; }
  .bp-sum-divider { height: 1px; background: var(--g-border-light); }
  .bp-sum-total .bp-sum-label { font-weight: 700; color: var(--g-text); font-size: var(--g-text-sm); }
  .bp-sum-total .bp-sum-value {
    font-weight: 800;
    color: var(--g-primary);
    font-size: var(--g-text-xl);
    font-family: var(--g-font-heading);
    letter-spacing: var(--g-tracking-tight);
  }
  .bp-sum-deposit {
    background: var(--g-primary-subtle);
    border-radius: var(--g-radius-md);
    padding: 12px 14px;
  }
  .bp-sum-deposit-title {
    font-size: var(--g-text-xs);
    font-weight: 700;
    color: var(--g-primary);
    text-transform: uppercase;
    letter-spacing: var(--g-tracking-widest);
    margin-bottom: 4px;
  }
  .bp-sum-deposit-amount {
    font-size: var(--g-text-2xl);
    font-weight: 800;
    color: var(--g-primary);
    font-family: var(--g-font-heading);
    letter-spacing: var(--g-tracking-tight);
  }
  .bp-sum-deposit-note {
    font-size: var(--g-text-xs);
    color: var(--g-text-muted);
    margin-top: 4px;
    line-height: 1.5;
  }

  /* ── Policy notice ── */
  .bp-policy {
    background: var(--g-warning-bg);
    border: 1px solid var(--g-warning-border);
    border-radius: var(--g-radius-md);
    padding: 14px 16px;
    font-size: var(--g-text-xs);
    color: var(--g-warning);
    line-height: 1.6;
    margin-top: 8px;
  }
  .bp-policy strong { font-weight: 700; display: block; margin-bottom: 4px; }

  /* ── Error / info banner ── */
  .bp-banner {
    border-radius: var(--g-radius-md);
    padding: 14px 16px;
    font-size: var(--g-text-sm);
    font-weight: 600;
    line-height: 1.5;
    margin-bottom: 16px;
    animation: g-fadeInDown 0.25s ease;
  }
  .bp-banner.error { background: var(--g-error-bg); border: 1px solid var(--g-error-border); color: var(--g-error); }
  .bp-banner.success { background: var(--g-success-bg); border: 1px solid var(--g-success-border); color: var(--g-success); }
  .bp-banner.info { background: var(--g-info-bg); border: 1px solid var(--g-info-border); color: var(--g-info); }

  /* ── Voucher row ── */
  .bp-voucher-row {
    display: flex;
    gap: 8px;
  }
  .bp-voucher-row .bp-input { flex: 1; }
  .bp-voucher-btn {
    padding: 11px 16px;
    border: 1.5px solid var(--g-primary);
    border-radius: var(--g-radius-md);
    background: transparent;
    color: var(--g-primary);
    font-size: var(--g-text-sm);
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    font-family: var(--g-font-body);
    white-space: nowrap;
  }
  .bp-voucher-btn:hover { background: var(--g-primary-muted); }
  .bp-voucher-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .bp-voucher-info {
    font-size: var(--g-text-xs);
    color: var(--g-success);
    font-weight: 600;
    margin-top: 4px;
  }
  .bp-voucher-error {
    font-size: var(--g-text-xs);
    color: var(--g-error);
    font-weight: 600;
    margin-top: 4px;
  }

  /* ── Submit button section ── */
  .bp-submit-section {
    display: grid;
    gap: 12px;
    padding: 18px 20px;
    border-top: 1px solid var(--g-border-light);
    background: var(--g-surface-raised);
  }

  /* ── Pending bookings section ── */
  .bp-pending-list { display: grid; gap: 14px; }
  .bp-pending-card {
    background: var(--g-bg-card);
    border: 1px solid var(--g-border);
    border-radius: var(--g-radius-lg);
    overflow: hidden;
    transition: box-shadow 0.2s;
  }
  .bp-pending-card:hover { box-shadow: var(--g-shadow-md); }
  .bp-pending-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 16px 20px 0;
  }
  .bp-pending-code {
    font-weight: 700;
    font-size: var(--g-text-sm);
    color: var(--g-text);
    letter-spacing: var(--g-tracking-tight);
  }
  .bp-pending-body {
    padding: 14px 20px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
  }
  .bp-pending-item { display: flex; flex-direction: column; gap: 3px; }
  .bp-pending-item-label {
    font-size: var(--g-text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: var(--g-tracking-widest);
    color: var(--g-text-muted);
  }
  .bp-pending-item-value { font-size: var(--g-text-sm); font-weight: 600; color: var(--g-text); }
  .bp-pending-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    border-top: 1px solid var(--g-border-light);
    background: var(--g-surface-raised);
    gap: 12px;
    flex-wrap: wrap;
  }
  .bp-pending-total {
    font-size: var(--g-text-sm);
    color: var(--g-text-muted);
  }
  .bp-pending-total strong {
    color: var(--g-text);
    font-weight: 700;
    margin-left: 6px;
  }
  .bp-cancel-btn {
    padding: 7px 16px;
    border: 1.5px solid var(--g-error-border);
    border-radius: var(--g-radius-full);
    background: transparent;
    color: var(--g-error);
    font-size: var(--g-text-xs);
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    font-family: var(--g-font-body);
  }
  .bp-cancel-btn:hover { background: var(--g-error-bg); }

  /* ── Deposit progress ── */
  .bp-deposit-progress {
    background: var(--g-info-bg);
    border: 1px solid var(--g-info-border);
    border-radius: var(--g-radius-md);
    padding: 10px 14px;
    font-size: var(--g-text-xs);
    color: var(--g-info);
    font-weight: 600;
    margin-top: 4px;
  }

  /* ── Success modal ── */
  .bp-success-icon {
    width: 72px; height: 72px;
    border-radius: 50%;
    background: var(--g-success-bg);
    border: 2px solid var(--g-success-border);
    display: flex; align-items: center; justify-content: center;
    font-size: 2.2rem;
    margin: 0 auto 20px;
  }
  .bp-success-title {
    font-family: var(--g-font-heading);
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--g-text);
    text-align: center;
    letter-spacing: var(--g-tracking-tight);
    margin-bottom: 8px;
  }
  .bp-success-sub {
    font-size: var(--g-text-sm);
    color: var(--g-text-muted);
    text-align: center;
    line-height: 1.6;
    margin-bottom: 24px;
  }
  .bp-success-details {
    background: var(--g-surface-raised);
    border-radius: var(--g-radius-md);
    padding: 16px;
    display: grid;
    gap: 10px;
    margin-bottom: 20px;
  }
  .bp-success-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: var(--g-text-sm);
    gap: 12px;
  }
  .bp-success-row-label { color: var(--g-text-muted); }
  .bp-success-row-value { font-weight: 700; color: var(--g-text); text-align: right; }
  .bp-success-deposit {
    background: linear-gradient(135deg, var(--g-primary), var(--g-primary-hover));
    border-radius: var(--g-radius-md);
    padding: 16px;
    text-align: center;
    color: var(--g-text-on-primary);
  }
  .bp-success-deposit-title { font-size: var(--g-text-xs); font-weight: 700; letter-spacing: var(--g-tracking-widest); text-transform: uppercase; opacity: 0.8; margin-bottom: 4px; }
  .bp-success-deposit-amount { font-size: 1.6rem; font-weight: 800; font-family: var(--g-font-heading); letter-spacing: var(--g-tracking-tight); }
  .bp-success-deposit-note { font-size: var(--g-text-xs); opacity: 0.75; margin-top: 6px; line-height: 1.5; }

  /* ── Cancel modal ── */
  .bp-cancel-modal-warn {
    background: var(--g-warning-bg);
    border: 1px solid var(--g-warning-border);
    border-radius: var(--g-radius-md);
    padding: 14px 16px;
    font-size: var(--g-text-sm);
    color: var(--g-warning);
    margin-bottom: 16px;
    line-height: 1.6;
  }
  .bp-cancel-modal-warn strong { font-weight: 700; display: block; margin-bottom: 4px; }

  /* ── Loading state ── */
  .bp-rt-loading { display: grid; gap: 14px; }
  .bp-rt-skeleton {
    height: 130px;
    border-radius: var(--g-radius-lg);
    background: linear-gradient(90deg, var(--g-surface) 25%, var(--g-border) 50%, var(--g-surface) 75%);
    background-size: 200% auto;
    animation: g-shimmer 1.4s linear infinite;
  }

  /* ── Nights badge ── */
  .bp-nights-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: var(--g-primary-subtle);
    border: 1px solid var(--g-primary-light);
    color: var(--g-primary);
    border-radius: var(--g-radius-full);
    padding: 5px 14px;
    font-size: var(--g-text-xs);
    font-weight: 700;
    letter-spacing: 0.02em;
  }
`;

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function BookingPage() {
  const navigate = useNavigate();
  const user = useAdminAuthStore((s) => s.user);
  const token = useAdminAuthStore((s) => s.token);
  const isGuest = !!token;

  /* ── Step state ── */
  const [step, setStep] = useState(1); // 1: dates+guests, 2: room type, 3: guest info, 4: review

  /* ── Dates & guests ── */
  const [checkIn, setCheckIn] = useState(today());
  const [checkOut, setCheckOut] = useState(tomorrow());
  const [numAdults, setNumAdults] = useState(1);
  const [numChildren, setNumChildren] = useState(0);

  /* ── Room types ── */
  const [roomTypes, setRoomTypes] = useState([]);
  const [loadingRoomTypes, setLoadingRoomTypes] = useState(false);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(null);

  /* ── Guest info ── */
  const [guestName, setGuestName] = useState(user?.fullName || "");
  const [guestPhone, setGuestPhone] = useState(user?.phone || "");
  const [guestEmail, setGuestEmail] = useState(user?.email || "");
  const [note, setNote] = useState("");

  /* ── Voucher ── */
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherInfo, setVoucherInfo] = useState(null); // { voucherId, discountAmount, finalAmount }
  const [voucherError, setVoucherError] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);

  /* ── Validation errors ── */
  const [dateError, setDateError] = useState("");
  const [guestErrors, setGuestErrors] = useState({});

  /* ── UI state ── */
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successBooking, setSuccessBooking] = useState(null); // booking result
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  /* ── Existing pending bookings (spam limit check) ── */
  const [pendingBookings, setPendingBookings] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [showPendingSection, setShowPendingSection] = useState(false);

  /* ── Cancel modal ── */
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  /* ── Computed ── */
  const nights = useMemo(() => calcNights(checkIn, checkOut), [checkIn, checkOut]);

  const selectedRoomType = useMemo(
    () => roomTypes.find((rt) => rt.id === selectedRoomTypeId),
    [roomTypes, selectedRoomTypeId]
  );

  const subtotal = useMemo(() => {
    if (!selectedRoomType) return 0;
    return nights * selectedRoomType.basePrice;
  }, [nights, selectedRoomType]);

  const discountAmount = voucherInfo?.discountAmount || 0;
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const depositRequired = Math.round(totalAmount * DEPOSIT_RATE * 100) / 100;

  const pendingCount = pendingBookings.filter((b) => b.status === "Pending").length;
  const spamBlocked = isGuest && pendingCount >= MAX_PENDING;

  /* ─── Load room type availability when step 2 ─── */
  const loadRoomTypes = useCallback(async () => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return;
    setLoadingRoomTypes(true);
    try {
      const res = await getGuestAvailability({
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numAdults,
        numChildren,
      });
      const list = res.data?.data || res.data || [];
      setRoomTypes(Array.isArray(list) ? list : []);
    } catch {
      setRoomTypes([]);
    } finally {
      setLoadingRoomTypes(false);
    }
  }, [checkIn, checkOut, numAdults, numChildren]);

  /* ─── Load pending bookings for spam check ─── */
  const loadPendingBookings = useCallback(async () => {
    if (!isGuest) return;
    setLoadingPending(true);
    try {
      const res = await getMyBookings();
      const data = res.data?.data || res.data || [];
      const list = Array.isArray(data) ? data : [];
      const pending = list.filter(
        (b) => b.status === "Pending" || b.status === "Confirmed"
      );
      setPendingBookings(pending);
    } catch {
      setPendingBookings([]);
    } finally {
      setLoadingPending(false);
    }
  }, [isGuest]);

  useEffect(() => {
    if (isGuest) loadPendingBookings();
  }, [loadPendingBookings, isGuest]);

  /* ─── Step 1: validate dates ─── */
  const validateDates = () => {
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);
    const ci = new Date(checkIn);
    const co = new Date(checkOut);

    if (!checkIn) return setDateError("Vui lòng chọn ngày nhận phòng."), false;
    if (ci < today0) return setDateError("Ngày nhận phòng không được là ngày quá khứ."), false;
    if (!checkOut || co <= ci)
      return setDateError("Ngày trả phòng phải sau ngày nhận phòng."), false;
    if (nights > 90) return setDateError("Số đêm không được vượt quá 90 đêm."), false;
    if (numAdults < 1) return setDateError("Phải có ít nhất 1 người lớn."), false;
    setDateError("");
    return true;
  };

  /* ─── Step 3: validate guest info ─── */
  const validateGuestInfo = () => {
    const errs = {};
    if (!guestName.trim()) errs.guestName = "Vui lòng nhập họ tên.";
    if (!/^\d{9,12}$/.test(guestPhone.replace(/\s+/g, "")))
      errs.guestPhone = "Số điện thoại không hợp lệ (9–12 chữ số).";
    if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail))
      errs.guestEmail = "Email không hợp lệ.";
    setGuestErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ─── Voucher ─── */
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherLoading(true);
    setVoucherError("");
    setVoucherInfo(null);
    try {
      const res = await validateVoucher(voucherCode.trim().toUpperCase(), subtotal);
      const d = res.data?.data || res.data;
      if (d?.valid) {
        setVoucherInfo(d);
      } else {
        setVoucherError(d?.message || "Voucher không hợp lệ hoặc đã hết hạn.");
      }
    } catch (err) {
      setVoucherError(
        err?.response?.data?.message || "Không thể xác thực voucher."
      );
    } finally {
      setVoucherLoading(false);
    }
  };

  /* ─── Navigation ─── */
  const goToStep = (n) => {
    if (n === 2) {
      if (!validateDates()) return;
      loadRoomTypes();
    }
    if (n === 3 && !selectedRoomTypeId) return;
    if (n === 4 && !validateGuestInfo()) return;
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ─── Submit booking ─── */
  const handleSubmit = async () => {
    if (!validateGuestInfo()) { setStep(3); return; }
    if (spamBlocked) {
      setSubmitError(`Bạn đang có ${pendingCount} booking chờ xử lý. Vui lòng thanh toán hoặc hủy bớt trước khi đặt thêm.`);
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        userId: isGuest ? user?.id : undefined,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim() || undefined,
        numAdults,
        numChildren,
        source: "online",
        note: note.trim() || undefined,
        voucherId: voucherInfo?.voucherId || undefined,
        details: [
          {
            roomTypeId: selectedRoomTypeId,
            checkInDate: checkIn,
            checkOutDate: checkOut,
          },
        ],
      };

      const res = await createBooking(payload);
      const booking = res.data?.data || res.data;
      setSuccessBooking(booking);
      setShowSuccessModal(true);
      if (isGuest) loadPendingBookings();
    } catch (err) {
      setSubmitError(
        err?.response?.data?.message || "Đặt phòng thất bại. Vui lòng thử lại."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Cancel booking ─── */
  const handleCancelBooking = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) { setCancelError("Vui lòng nhập lý do hủy."); return; }
    setCancelling(true);
    setCancelError("");
    try {
      await cancelBooking(cancelTarget.id, cancelReason.trim());
      setCancelTarget(null);
      setCancelReason("");
      loadPendingBookings();
    } catch (err) {
      setCancelError(err?.response?.data?.message || "Hủy booking thất bại.");
    } finally {
      setCancelling(false);
    }
  };

  /* ─── After success – reset form ─── */
  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setStep(1);
    setSelectedRoomTypeId(null);
    setVoucherCode("");
    setVoucherInfo(null);
    setNote("");
    setSuccessBooking(null);
    setShowPendingSection(true);
  };

  /* ─── Steps definition ─── */
  const STEPS = [
    { n: 1, label: "Ngày & Khách" },
    { n: 2, label: "Loại phòng" },
    { n: 3, label: "Thông tin" },
    { n: 4, label: "Xem lại" },
  ];

  return (
    <>
      <style>{PAGE_CSS}</style>

      {/* ── Success modal ── */}
      <GuestModal
        open={showSuccessModal}
        onClose={handleSuccessClose}
        title=""
        showClose={false}
        width={500}
        footer={
          <div style={{ display: "flex", gap: 10, width: "100%", justifyContent: "center", flexWrap: "wrap" }}>
            <button className="g-btn-outline" onClick={() => { handleSuccessClose(); navigate("/guest/my-bookings"); }}>
              Xem danh sách booking
            </button>
            <button
              className="g-btn-primary"
              onClick={() => { 
                const bookingId = successBooking?.id;
                handleSuccessClose(); 
                if (bookingId) {
                  navigate(`/guest/payment/deposit/${bookingId}`);
                } else {
                  navigate("/guest/my-bookings");
                }
              }}
            >
              Thanh toán cọc ngay
            </button>
          </div>
        }
      >
        {successBooking && (
          <>
            <div className="bp-success-icon">🎉</div>
            <div className="bp-success-title">Đặt phòng thành công!</div>
            <div className="bp-success-sub">
              Booking của bạn đã được tạo. Hãy thanh toán đặt cọc để xác nhận chỗ ở của bạn.
            </div>
            <div className="bp-success-details">
              <div className="bp-success-row">
                <span className="bp-success-row-label">Mã booking</span>
                <span className="bp-success-row-value" style={{ color: "var(--g-primary)", fontSize: "1.05rem" }}>
                  {successBooking.bookingCode}
                </span>
              </div>
              <div className="bp-success-row">
                <span className="bp-success-row-label">Ngày nhận phòng</span>
                <span className="bp-success-row-value">{formatDateVN(successBooking.bookingDetails?.[0]?.checkInDate)}</span>
              </div>
              <div className="bp-success-row">
                <span className="bp-success-row-label">Ngày trả phòng</span>
                <span className="bp-success-row-value">{formatDateVN(successBooking.bookingDetails?.[0]?.checkOutDate)}</span>
              </div>
              <div className="bp-success-row">
                <span className="bp-success-row-label">Loại phòng</span>
                <span className="bp-success-row-value">{successBooking.bookingDetails?.[0]?.roomTypeName}</span>
              </div>
              <div className="bp-success-row">
                <span className="bp-success-row-label">Tổng tiền dự kiến</span>
                <span className="bp-success-row-value">{formatCurrency(successBooking.totalEstimatedAmount)}</span>
              </div>
              <div className="bp-success-row">
                <span className="bp-success-row-label">Trạng thái</span>
                <span className="bp-success-row-value">
                  <StatusBadge variant="warning" dot>Chờ cọc</StatusBadge>
                </span>
              </div>
            </div>
            <div className="bp-success-deposit">
              <div className="bp-success-deposit-title">💳 Tiền cọc cần thanh toán (30%)</div>
              <div className="bp-success-deposit-amount">
                {formatCurrency(successBooking.paymentSummary?.requiredBookingDepositAmount || 0)}
              </div>
              <div className="bp-success-deposit-note">
                Vui lòng liên hệ lễ tân hoặc chuyển khoản để thanh toán đặt cọc.<br />
                Booking sẽ tự động hết hạn nếu không thanh toán đúng hạn.
              </div>
            </div>
          </>
        )}
      </GuestModal>

      {/* ── Cancel modal ── */}
      <GuestModal
        open={!!cancelTarget}
        onClose={() => { setCancelTarget(null); setCancelReason(""); setCancelError(""); }}
        title="Xác nhận hủy booking"
        width={480}
        footer={
          <>
            <button
              className="g-btn-ghost"
              onClick={() => { setCancelTarget(null); setCancelReason(""); setCancelError(""); }}
              disabled={cancelling}
            >
              Không hủy
            </button>
            <button
              className="g-btn-primary"
              style={{ background: "var(--g-error)", color: "#fff" }}
              onClick={handleCancelBooking}
              disabled={cancelling}
            >
              {cancelling ? "Đang hủy..." : "Xác nhận hủy"}
            </button>
          </>
        }
      >
        <div className="bp-cancel-modal-warn">
          <strong>⚠️ Lưu ý chính sách hủy phòng</strong>
          {cancelTarget?.status === "Confirmed"
            ? "Booking đã được xác nhận — tiền cọc có thể không được hoàn trả tùy theo chính sách. Vui lòng liên hệ lễ tân để biết thêm chi tiết."
            : "Booking đang chờ thanh toán — bạn có thể hủy miễn phí trước khi thanh toán đặt cọc."}
        </div>
        <div className="bp-field">
          <label className="bp-label">Lý do hủy <span className="bp-required">*</span></label>
          <textarea
            className="bp-input"
            rows={3}
            placeholder="Nhập lý do hủy booking..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            style={{ resize: "vertical" }}
          />
          {cancelError && <span className="bp-field-error">{cancelError}</span>}
        </div>
      </GuestModal>

      <PageContainer className="g-section-lg bp-page">
        {/* ── Page header ── */}
        <SectionTitle
          align="left"
          eyebrow="Online Booking"
          title="Đặt Phòng Trực Tuyến"
          subtitle="Chọn loại phòng phù hợp, điền thông tin và hoàn tất đặt cọc 30% để giữ chỗ."
        />

        {/* ── Spam warning ── */}
        {isGuest && spamBlocked && (
          <div className="bp-banner error">
            ⛔ Bạn đang có <strong>{pendingCount} booking chưa thanh toán</strong> (tối đa {MAX_PENDING} booking pending).
            Vui lòng thanh toán hoặc hủy bớt trước khi đặt thêm.
            <Link to="/guest/my-bookings" style={{ color: "inherit", fontWeight: 700, marginLeft: 8 }}>
              Xem My Booking →
            </Link>
          </div>
        )}

        <div className="bp-layout">
          {/* ── LEFT COLUMN ── */}
          <div>
            {/* Steps */}
            <div className="bp-steps">
              {STEPS.map((s) => (
                <div
                  key={s.n}
                  className={`bp-step${step === s.n ? " active" : step > s.n ? " done" : ""}`}
                >
                  <span className="bp-step-num">
                    {step > s.n ? "✓" : s.n}
                  </span>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>

            {/* ─── STEP 1: Date & guests ─── */}
            {step === 1 && (
              <div className="bp-card g-animate-up">
                <h2 className="bp-card-title">
                  <span className="material-symbols-outlined">calendar_month</span>
                  Chọn ngày &amp; số khách
                </h2>

                <div className="bp-form-row">
                  <div className="bp-field">
                    <label className="bp-label">Ngày nhận phòng <span className="bp-required">*</span></label>
                    <input
                      type="date"
                      className={`bp-input${dateError ? " error" : ""}`}
                      value={checkIn}
                      min={today()}
                      onChange={(e) => { setCheckIn(e.target.value); setDateError(""); setSelectedRoomTypeId(null); setVoucherInfo(null); }}
                    />
                  </div>
                  <div className="bp-field">
                    <label className="bp-label">Ngày trả phòng <span className="bp-required">*</span></label>
                    <input
                      type="date"
                      className={`bp-input${dateError ? " error" : ""}`}
                      value={checkOut}
                      min={checkIn || today()}
                      onChange={(e) => { setCheckOut(e.target.value); setDateError(""); setSelectedRoomTypeId(null); setVoucherInfo(null); }}
                    />
                  </div>
                </div>

                {nights > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <span className="bp-nights-badge">
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>bedtime</span>
                      {nights} đêm lưu trú
                    </span>
                  </div>
                )}

                <div className="bp-form-row">
                  <div className="bp-field">
                    <label className="bp-label">Số người lớn <span className="bp-required">*</span></label>
                    <input
                      type="number"
                      className="bp-input"
                      placeholder="1"
                      value={numAdults}
                      onChange={(e) => setNumAdults(e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1))}
                      onBlur={() => { if (numAdults === "" || numAdults < 1) setNumAdults(1); }}
                    />
                  </div>
                  <div className="bp-field">
                    <label className="bp-label">Số trẻ em</label>
                    <input
                      type="number"
                      className="bp-input"
                      placeholder="0"
                      value={numChildren}
                      onChange={(e) => setNumChildren(e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value) || 0))}
                      onBlur={() => { if (numChildren === "") setNumChildren(0); }}
                    />
                  </div>
                </div>

                {dateError && <div className="bp-banner error">{dateError}</div>}

                <button
                  className="g-btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => goToStep(2)}
                >
                  Xem phòng trống →
                </button>
              </div>
            )}

            {/* ─── STEP 2: Room type selection ─── */}
            {step === 2 && (
              <div className="g-animate-up">
                <div className="bp-card" style={{ marginBottom: 16 }}>
                  <h2 className="bp-card-title">
                    <span className="material-symbols-outlined">hotel</span>
                    Chọn loại phòng
                  </h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                    <span className="bp-nights-badge">
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>calendar_month</span>
                      {formatDateVN(checkIn)} → {formatDateVN(checkOut)} ({nights} đêm)
                    </span>
                    <span className="bp-nights-badge">
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>group</span>
                      {numAdults} người lớn{numChildren > 0 ? `, ${numChildren} trẻ em` : ""}
                    </span>
                    <button
                      className="g-btn-ghost"
                      style={{ fontSize: "var(--g-text-xs)", padding: "5px 12px" }}
                      onClick={() => setStep(1)}
                    >
                      ← Thay đổi
                    </button>
                  </div>

                  {loadingRoomTypes ? (
                    <div className="bp-rt-loading">
                      {[1, 2, 3].map((i) => <div key={i} className="bp-rt-skeleton" />)}
                    </div>
                  ) : roomTypes.length === 0 ? (
                    <EmptyState icon="🏨" title="Không có loại phòng" message="Hiện tại không có loại phòng nào khả dụng. Vui lòng thử lại sau." />
                  ) : (
                    <div className="bp-room-types">
                      {roomTypes.map((rt) => {
                        const isSelected = selectedRoomTypeId === rt.id;
                        // isAvailable từ server: availableRooms > 0
                        // meetsCapacity từ server: capacityAdults >= numAdults
                        const meetsCapacity = rt.meetsCapacity !== undefined
                          ? rt.meetsCapacity
                          : (rt.capacityAdults >= numAdults && rt.capacityChildren >= numChildren);
                        const isAvailable = rt.isAvailable !== undefined ? rt.isAvailable : true;
                        const selectable = meetsCapacity && isAvailable;
                        return (
                          <div
                            key={rt.id}
                            className={`bp-rt-card${isSelected ? " selected" : ""}${!selectable ? " unavailable" : ""}`}
                            onClick={() => selectable && setSelectedRoomTypeId(rt.id)}
                            role="radio"
                            aria-checked={isSelected}
                            tabIndex={selectable ? 0 : -1}
                            onKeyDown={(e) => e.key === "Enter" && selectable && setSelectedRoomTypeId(rt.id)}
                          >
                            {rt.primaryImageUrl ? (
                              <img src={rt.primaryImageUrl} alt={rt.name} className="bp-rt-img" />
                            ) : (
                              <div className="bp-rt-img-placeholder">
                                <span className="material-symbols-outlined" style={{ fontSize: 36 }}>hotel</span>
                              </div>
                            )}
                            <div className="bp-rt-body">
                              <div className="bp-rt-header">
                                <div className="bp-rt-name">{rt.name}</div>
                                <div className="bp-rt-price">
                                  {formatCurrency(rt.basePrice)} <span>/đêm</span>
                                </div>
                              </div>
                              <div className="bp-rt-meta">
                                {rt.bedType && (
                                  <span className="bp-rt-badge">🛏 {rt.bedType}</span>
                                )}
                                {rt.areaSqm && (
                                  <span className="bp-rt-badge">📐 {rt.areaSqm}m²</span>
                                )}
                                <span className="bp-rt-badge">
                                  👥 {rt.capacityAdults} người lớn{rt.capacityChildren > 0 ? ` + ${rt.capacityChildren} trẻ` : ""}
                                </span>
                                {/* Availability badge từ server */}
                                {rt.availableRooms !== undefined && (
                                  <span className="bp-rt-badge" style={{
                                    background: isAvailable ? "var(--g-success-bg)" : "var(--g-error-bg)",
                                    borderColor: isAvailable ? "var(--g-success-border)" : "var(--g-error-border)",
                                    color: isAvailable ? "var(--g-success)" : "var(--g-error)",
                                  }}>
                                    {isAvailable
                                      ? `✓ Còn ${rt.availableRooms} phòng`
                                      : "✗ Hết phòng"}
                                  </span>
                                )}
                              </div>
                              {rt.description && (
                                <div style={{ fontSize: "var(--g-text-xs)", color: "var(--g-text-secondary)", lineHeight: 1.5, marginTop: 4 }}>
                                  {rt.description.length > 100 ? rt.description.slice(0, 100) + "..." : rt.description}
                                </div>
                              )}
                              {/* Status text */}
                              {isSelected ? (
                                <span className="bp-rt-selected-badge">✓ Đã chọn</span>
                              ) : !isAvailable ? (
                                <span className="bp-rt-unavail">✗ Hết phòng trong khoảng ngày này</span>
                              ) : !meetsCapacity ? (
                                <span className="bp-rt-unavail">
                                  ✗ Không đủ sức chứa ({rt.capacityAdults} người lớn / {rt.capacityChildren} trẻ em)
                                </span>
                              ) : (
                                <span className="bp-rt-avail">✓ Phù hợp — nhấn để chọn</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button className="g-btn-outline" onClick={() => setStep(1)}>← Quay lại</button>
                  <button
                    className="g-btn-primary"
                    onClick={() => goToStep(3)}
                    disabled={!selectedRoomTypeId}
                  >
                    Tiếp theo →
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 3: Guest info ─── */}
            {step === 3 && (
              <div className="bp-card g-animate-up">
                <h2 className="bp-card-title">
                  <span className="material-symbols-outlined">person</span>
                  Thông tin khách hàng
                </h2>

                <div className="bp-form-row single">
                  <div className="bp-field">
                    <label className="bp-label">Họ và tên <span className="bp-required">*</span></label>
                    <input
                      type="text"
                      className={`bp-input${guestErrors.guestName ? " error" : ""}`}
                      placeholder="Nguyễn Văn A"
                      value={guestName}
                      onChange={(e) => { setGuestName(e.target.value); setGuestErrors((p) => ({ ...p, guestName: "" })); }}
                    />
                    {guestErrors.guestName && <span className="bp-field-error">{guestErrors.guestName}</span>}
                  </div>
                </div>

                <div className="bp-form-row">
                  <div className="bp-field">
                    <label className="bp-label">Số điện thoại <span className="bp-required">*</span></label>
                    <input
                      type="tel"
                      className={`bp-input${guestErrors.guestPhone ? " error" : ""}`}
                      placeholder="0901234567"
                      value={guestPhone}
                      onChange={(e) => { setGuestPhone(e.target.value); setGuestErrors((p) => ({ ...p, guestPhone: "" })); }}
                    />
                    {guestErrors.guestPhone && <span className="bp-field-error">{guestErrors.guestPhone}</span>}
                  </div>
                  <div className="bp-field">
                    <label className="bp-label">Email</label>
                    <input
                      type="email"
                      className={`bp-input${guestErrors.guestEmail ? " error" : ""}`}
                      placeholder="example@email.com"
                      value={guestEmail}
                      onChange={(e) => { setGuestEmail(e.target.value); setGuestErrors((p) => ({ ...p, guestEmail: "" })); }}
                    />
                    {guestErrors.guestEmail && <span className="bp-field-error">{guestErrors.guestEmail}</span>}
                  </div>
                </div>

                <div className="bp-form-row single">
                  <div className="bp-field">
                    <label className="bp-label">Ghi chú đặc biệt</label>
                    <textarea
                      className="bp-input"
                      rows={3}
                      placeholder="Ví dụ: Phòng tầng cao, cần crib cho em bé, dị ứng lông thú..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      style={{ resize: "vertical" }}
                    />
                  </div>
                </div>

                {/* Voucher */}
                {isGuest && (
                  <div className="bp-form-row single" style={{ marginTop: 4 }}>
                    <div className="bp-field">
                      <label className="bp-label">Mã voucher</label>
                      <div className="bp-voucher-row">
                        <input
                          type="text"
                          className="bp-input"
                          placeholder=""
                          value={voucherCode}
                          onChange={(e) => { setVoucherCode(e.target.value.toUpperCase()); setVoucherInfo(null); setVoucherError(""); }}
                        />
                        <button
                          className="bp-voucher-btn"
                          onClick={handleApplyVoucher}
                          disabled={voucherLoading || !voucherCode.trim()}
                        >
                          {voucherLoading ? "..." : "Áp dụng"}
                        </button>
                      </div>
                      {voucherInfo && (
                        <div className="bp-voucher-info">
                          ✓ Giảm {formatCurrency(voucherInfo.discountAmount)} — Còn {formatCurrency(voucherInfo.finalAmount)}</div>
                      )}
                      {voucherError && <div className="bp-voucher-error">✗ {voucherError}</div>}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                  <button className="g-btn-outline" onClick={() => setStep(2)}>← Quay lại</button>
                  <button className="g-btn-primary" onClick={() => goToStep(4)}>
                    Xem lại →
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 4: Review & submit ─── */}
            {step === 4 && (
              <div className="bp-card g-animate-up">
                <h2 className="bp-card-title">
                  <span className="material-symbols-outlined">fact_check</span>
                  Xác nhận thông tin đặt phòng
                </h2>

                {/* Date & room summary */}
                <div style={{ background: "var(--g-surface-raised)", borderRadius: "var(--g-radius-md)", padding: 16, marginBottom: 20, display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--g-text-sm)", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ color: "var(--g-text-muted)" }}>Loại phòng</span>
                    <strong style={{ color: "var(--g-text)" }}>{selectedRoomType?.name}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--g-text-sm)", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ color: "var(--g-text-muted)" }}>Check-in</span>
                    <strong>{formatDateVN(checkIn)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--g-text-sm)", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ color: "var(--g-text-muted)" }}>Check-out</span>
                    <strong>{formatDateVN(checkOut)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--g-text-sm)", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ color: "var(--g-text-muted)" }}>Số đêm</span>
                    <strong>{nights} đêm</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--g-text-sm)", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ color: "var(--g-text-muted)" }}>Khách</span>
                    <strong>{numAdults} người lớn{numChildren > 0 ? `, ${numChildren} trẻ em` : ""}</strong>
                  </div>
                </div>

                {/* Guest info summary */}
                <div style={{ background: "var(--g-surface-raised)", borderRadius: "var(--g-radius-md)", padding: 16, marginBottom: 20, display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--g-text-sm)", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ color: "var(--g-text-muted)" }}>Họ tên</span>
                    <strong>{guestName}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--g-text-sm)", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ color: "var(--g-text-muted)" }}>Điện thoại</span>
                    <strong>{guestPhone}</strong>
                  </div>
                  {guestEmail && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--g-text-sm)", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ color: "var(--g-text-muted)" }}>Email</span>
                      <strong>{guestEmail}</strong>
                    </div>
                  )}
                  {voucherInfo && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--g-text-sm)", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ color: "var(--g-text-muted)" }}>Voucher</span>
                      <strong style={{ color: "var(--g-success)" }}>-{formatCurrency(discountAmount)}</strong>
                    </div>
                  )}
                </div>

                {submitError && <div className="bp-banner error">{submitError}</div>}

                <div className="bp-policy">
                  <strong>📋 Chính sách đặt phòng online</strong>
                  • Booking sẽ ở trạng thái <strong>Chờ cọc (Pending)</strong> sau khi tạo.<br />
                  • Cần thanh toán đặt cọc tối thiểu <strong>30%</strong> ({formatCurrency(depositRequired)}) để xác nhận.<br />
                  • Admin sẽ gán phòng cụ thể sau khi booking được xác nhận.<br />
                  • Booking chưa thanh toán sẽ tự động hết hạn sau 24 giờ.
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                  <button className="g-btn-outline" onClick={() => setStep(3)} disabled={submitting}>← Quay lại</button>
                  <button
                    className="g-btn-primary"
                    onClick={handleSubmit}
                    disabled={submitting || spamBlocked}
                    style={{ minWidth: 160, justifyContent: "center" }}
                  >
                    {submitting ? (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, animation: "g-spin 1s linear infinite" }}>progress_activity</span>
                        Đang đặt...
                      </>
                    ) : (
                      "🗓 Xác nhận đặt phòng"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: Summary sidebar ── */}
          <div className="bp-summary">
            <div className="bp-summary-card">
              <div className="bp-summary-head">
                <h3>📋 Tóm tắt đặt phòng</h3>
              </div>
              <div className="bp-summary-body">
                {selectedRoomType ? (
                  <>
                    <div className="bp-sum-row">
                      <span className="bp-sum-label">Loại phòng</span>
                      <span className="bp-sum-value">{selectedRoomType.name}</span>
                    </div>
                    <div className="bp-sum-row">
                      <span className="bp-sum-label">Giá/đêm</span>
                      <span className="bp-sum-value">{formatCurrency(selectedRoomType.basePrice)}</span>
                    </div>
                    <div className="bp-sum-row">
                      <span className="bp-sum-label">Số đêm</span>
                      <span className="bp-sum-value">{nights} đêm</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="bp-sum-row">
                        <span className="bp-sum-label" style={{ color: "var(--g-success)" }}>Giảm giá</span>
                        <span className="bp-sum-value" style={{ color: "var(--g-success)" }}>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    <div className="bp-sum-divider" />
                    <div className="bp-sum-row bp-sum-total">
                      <span className="bp-sum-label">Tổng dự kiến</span>
                      <span className="bp-sum-value">{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="bp-sum-deposit">
                      <div className="bp-sum-deposit-title">💳 Đặt cọc 30% (tối thiểu)</div>
                      <div className="bp-sum-deposit-amount">{formatCurrency(depositRequired)}</div>
                      <div className="bp-sum-deposit-note">
                        Thanh toán cọc để chuyển sang trạng thái Đã xác nhận.
                        Booking tự hết hạn sau 24h nếu chưa thanh toán.
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {checkIn && checkOut && nights > 0 && (
                      <div className="bp-sum-row">
                        <span className="bp-sum-label">Số đêm</span>
                        <span className="bp-sum-value">{nights} đêm</span>
                      </div>
                    )}
                    <div style={{ fontSize: "var(--g-text-sm)", color: "var(--g-text-muted)", textAlign: "center", padding: "12px 0" }}>
                      Chọn loại phòng để xem giá
                    </div>
                  </>
                )}
              </div>

              {/* Booking lifecycle guide */}
              <div style={{ padding: "0 20px 20px" }}>
                <div style={{ borderTop: "1px solid var(--g-border-light)", paddingTop: 16, display: "grid", gap: 8 }}>
                  <div style={{ fontSize: "var(--g-text-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "var(--g-tracking-widest)", color: "var(--g-text-muted)", marginBottom: 4 }}>
                    Vòng đời booking
                  </div>
                  {[
                    { s: "Pending", label: "Chờ cọc", desc: "Chưa thanh toán cọc", color: "var(--g-warning)" },
                    { s: "Confirmed", label: "Đã xác nhận", desc: "Cọc ≥ 30%", color: "var(--g-info)" },
                    { s: "Checked_in", label: "Đang lưu trú", desc: "Đã nhận phòng", color: "var(--g-success)" },
                    { s: "Settlement", label: "Chờ quyết toán", desc: "Sau check-out", color: "var(--g-warning)" },
                    { s: "Completed", label: "Hoàn tất", desc: "Đã thanh toán", color: "var(--g-neutral)" },
                  ].map((item) => (
                    <div key={item.s} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--g-text-xs)" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                      <div>
                        <strong style={{ color: "var(--g-text)" }}>{item.label}</strong>
                        <span style={{ color: "var(--g-text-muted)", marginLeft: 4 }}>— {item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Pending bookings section (if logged in) ── */}
        {isGuest && (pendingBookings.length > 0 || showPendingSection) && (
          <div className="g-animate-up" style={{ marginTop: 8 }}>
            <SectionTitle
              align="left"
              eyebrow="Đang chờ xử lý"
              title="Booking Chưa Hoàn Tất"
              subtitle="Các booking đang chờ thanh toán cọc hoặc đã được xác nhận."
            />

            {loadingPending ? (
              <LoadingSpinner text="Đang tải..." />
            ) : pendingBookings.length === 0 ? (
              <EmptyState icon="✅" title="Không có booking đang chờ" message="Tất cả booking đều đã được xử lý." />
            ) : (
              <div className="bp-pending-list">
                {pendingBookings.map((b) => {
                  const detail = b.bookingDetails?.[0];
                  const depReq = b.paymentSummary?.requiredBookingDepositAmount || 0;
                  const depPaid = b.depositAmount || 0;
                  const remaining = Math.max(0, depReq - depPaid);
                  return (
                    <div key={b.id} className="bp-pending-card">
                      <div className="bp-pending-header">
                        <div className="bp-pending-code">
                          {b.bookingCode || `#${b.id}`}
                        </div>
                        <StatusBadge variant={getStatusVariant(b.status)} dot>
                          {getBookingStatusLabel(b.status)}
                        </StatusBadge>
                      </div>
                      <div className="bp-pending-body">
                        {detail && (
                          <div className="bp-pending-item">
                            <span className="bp-pending-item-label">Loại phòng</span>
                            <span className="bp-pending-item-value">{detail.roomTypeName || "Không rõ"}</span>
                          </div>
                        )}
                        {detail && (
                          <div className="bp-pending-item">
                            <span className="bp-pending-item-label">Ngày lưu trú</span>
                            <span className="bp-pending-item-value">
                              {formatDateVN(detail.checkInDate)} → {formatDateVN(detail.checkOutDate)}
                            </span>
                          </div>
                        )}
                        <div className="bp-pending-item">
                          <span className="bp-pending-item-label">Tổng dự kiến</span>
                          <span className="bp-pending-item-value">{formatCurrency(b.totalEstimatedAmount)}</span>
                        </div>
                        {b.status === "Pending" && remaining > 0 && (
                          <div className="bp-pending-item" style={{ gridColumn: "1 / -1" }}>
                            <div className="bp-deposit-progress">
                              💳 Cần đặt cọc thêm: <strong>{formatCurrency(remaining)}</strong> để xác nhận booking.
                              Vui lòng liên hệ lễ tân hoặc chuyển khoản theo mã booking.
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="bp-pending-footer">
                        {(b.status === "Pending" || b.status === "Confirmed") && (
                          <button
                            className="bp-cancel-btn"
                            onClick={() => { setCancelTarget(b); setCancelReason(""); setCancelError(""); }}
                          >
                            Hủy booking
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </PageContainer>
    </>
  );
}
