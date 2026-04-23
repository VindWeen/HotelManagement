import { useEffect, useMemo, useState } from "react";
import { getMyProfile, updateProfile, changePassword, uploadAvatar } from "../../api/userProfileApi";
import { PageContainer, SectionTitle, LoadingSpinner, StatusBadge } from "../../components/guest";
import { useAdminAuthStore } from "../../store/adminAuthStore";
import { useResponsiveAdmin } from "../../hooks/useResponsiveAdmin";
import { getFullImageUrl } from "../../utils/imageUtils";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function FeedbackBanner({ feedback }) {
  if (!feedback?.text) return null;

  const palette = feedback.type === "success"
    ? { bg: "var(--g-success-bg)", border: "var(--g-success-border)", text: "var(--g-success)" }
    : { bg: "var(--g-error-bg)", border: "var(--g-error-border)", text: "var(--g-error)" };

  return (
    <div
      style={{
        borderRadius: "var(--g-radius-md)",
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        color: palette.text,
        padding: "14px 16px",
        fontWeight: 600,
      }}
    >
      {feedback.text}
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span className="g-label">{label}</span>
      {children}
      {hint ? (
        <span style={{ fontSize: "var(--g-text-sm)", color: "var(--g-text-muted)" }}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  minHeight: 48,
  padding: "13px 14px",
  borderRadius: "var(--g-radius-md)",
  border: "1px solid var(--g-border)",
  background: "var(--g-bg-card)",
  color: "var(--g-text)",
  fontSize: "var(--g-text-base)",
  lineHeight: 1.4,
  fontFamily: "inherit",
  outline: "none",
};

export default function GuestProfilePage() {
  const { isMobile, isTablet } = useResponsiveAdmin();
  const updateUser = useAdminAuthStore((s) => s.updateUser);
  const authUser = useAdminAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileFeedback, setProfileFeedback] = useState(null);
  const [passwordFeedback, setPasswordFeedback] = useState(null);
  const [avatarFeedback, setAvatarFeedback] = useState(null);
  const [avatarHover, setAvatarHover] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    gender: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const avatarInputId = "guest-avatar-upload";

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const res = await getMyProfile();
        if (cancelled) return;

        const nextProfile = res.data || null;
        setProfile(nextProfile);
        setForm({
          fullName: nextProfile?.fullName || "",
          phone: nextProfile?.phone || "",
          address: nextProfile?.address || "",
          dateOfBirth: nextProfile?.dateOfBirth || "",
          gender: nextProfile?.gender || "",
        });
        updateUser({
          fullName: nextProfile?.fullName || authUser?.fullName || "",
          avatarUrl: nextProfile?.avatarUrl || authUser?.avatarUrl || null,
        });
      } catch (err) {
        if (!cancelled) {
          setProfileFeedback({
            type: "error",
            text: err?.response?.data?.message || "Không thể tải hồ sơ cá nhân.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [authUser?.avatarUrl, authUser?.fullName, updateUser]);

  const avatarPreview = useMemo(() => {
    return getFullImageUrl(profile?.avatarUrl || authUser?.avatarUrl || "");
  }, [authUser?.avatarUrl, profile?.avatarUrl]);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileFeedback(null);
    setSavingProfile(true);

    try {
      await updateProfile({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender.trim(),
      });

      const refreshed = await getMyProfile();
      const nextProfile = refreshed.data || null;
      setProfile(nextProfile);
      updateUser({
        fullName: nextProfile?.fullName || "",
        avatarUrl: nextProfile?.avatarUrl || null,
      });
      setProfileFeedback({
        type: "success",
        text: "Thông tin hồ sơ đã được cập nhật.",
      });
    } catch (err) {
      setProfileFeedback({
        type: "error",
        text: err?.response?.data?.message || "Không thể cập nhật hồ sơ.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordFeedback(null);

    if (!passwordForm.oldPassword || !passwordForm.newPassword) {
      setPasswordFeedback({ type: "error", text: "Vui lòng nhập đủ mật khẩu cũ và mật khẩu mới." });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordFeedback({ type: "error", text: "Mật khẩu mới phải có ít nhất 6 ký tự." });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordFeedback({ type: "error", text: "Xác nhận mật khẩu mới chưa khớp." });
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(passwordForm.oldPassword, passwordForm.newPassword);
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordFeedback({ type: "success", text: "Mật khẩu đã được thay đổi thành công." });
    } catch (err) {
      setPasswordFeedback({
        type: "error",
        text: err?.response?.data?.message || "Không thể đổi mật khẩu.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarChange = async (event) => {
    setAvatarFeedback(null);
    const nextFile = event.target.files?.[0] || null;

    if (!nextFile) {
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(nextFile.type)) {
      setAvatarFeedback({ type: "error", text: "Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc GIF." });
      event.target.value = "";
      return;
    }

    if (nextFile.size > 5 * 1024 * 1024) {
      setAvatarFeedback({ type: "error", text: "Ảnh đại diện không được vượt quá 5MB." });
      event.target.value = "";
      return;
    }

    setUploadingAvatar(true);
    try {
      const res = await uploadAvatar(nextFile);
      const nextAvatarUrl = res.data?.avatarUrl || null;
      setProfile((prev) => ({ ...prev, avatarUrl: nextAvatarUrl }));
      updateUser({ avatarUrl: nextAvatarUrl });
      setAvatarFeedback({ type: "success", text: "Avatar đã được cập nhật." });
    } catch (err) {
      setAvatarFeedback({
        type: "error",
        text: err?.response?.data?.message || "Không thể upload avatar.",
      });
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  if (loading) {
    return <LoadingSpinner text="Đang tải hồ sơ cá nhân..." />;
  }

  return (
    <PageContainer className="g-section-lg" style={{ display: "grid", gap: 28 }}>
      <SectionTitle
        align="left"
        eyebrow="Tài Khoản"
        title="Hồ sơ cá nhân"
        subtitle="Quản lý thông tin tài khoản, thay đổi avatar và cập nhật mật khẩu để sử dụng guest portal thuận tiện hơn."
      />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isMobile || isTablet ? "1fr" : "minmax(320px, 420px) minmax(0, 1fr)",
          gap: 24,
          alignItems: "start",
        }}
      >
        <article className="g-card" style={{ padding: 24, display: "grid", gap: 18 }}>
          <div style={{ display: "grid", justifyItems: "center", gap: 14 }}>
            <label
              htmlFor={avatarInputId}
              style={{
                position: "relative",
                width: 136,
                height: 136,
                borderRadius: "50%",
                overflow: "hidden",
                background: "var(--g-primary-muted)",
                border: "1px solid var(--g-border)",
                cursor: uploadingAvatar ? "progress" : "pointer",
                boxShadow: avatarHover
                  ? "0 18px 40px rgba(15,23,42,0.14)"
                  : "0 10px 24px rgba(15,23,42,0.08)",
                transform: avatarHover ? "translateY(-2px)" : "translateY(0)",
                transition: "transform 0.2s var(--g-ease), box-shadow 0.2s var(--g-ease)",
              }}
              onMouseEnter={() => setAvatarHover(true)}
              onMouseLeave={() => setAvatarHover(false)}
              title="Thay ảnh đại diện"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "2.4rem",
                    fontWeight: 700,
                    color: "var(--g-primary)",
                  }}
                >
                  {(profile?.fullName || authUser?.fullName || "?").slice(0, 1).toUpperCase()}
                </div>
              )}

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  padding: 12,
                  textAlign: "center",
                  background: uploadingAvatar
                    ? "rgba(17,24,39,0.58)"
                    : avatarHover
                      ? "linear-gradient(180deg, rgba(17,24,39,0.08) 0%, rgba(17,24,39,0.72) 100%)"
                      : "rgba(17,24,39,0)",
                  color: "#fff",
                  opacity: uploadingAvatar || avatarHover ? 1 : 0,
                  transition: "opacity 0.2s var(--g-ease), background 0.2s var(--g-ease)",
                }}
              >
                <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
                    {uploadingAvatar ? "progress_activity" : "add_a_photo"}
                  </span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, lineHeight: 1.4 }}>
                    {uploadingAvatar ? "Đang cập nhật..." : "Thay ảnh đại diện"}
                  </span>
                </div>
              </div>
            </label>

            <input
              id={avatarInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              style={{ display: "none" }}
              disabled={uploadingAvatar}
            />

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--g-text)" }}>
                {profile?.fullName || authUser?.fullName || "Khách hàng"}
              </div>
              <div style={{ marginTop: 6, color: "var(--g-text-secondary)" }}>{profile?.email || authUser?.email || "—"}</div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <StatusBadge variant="primary">{profile?.roleName || authUser?.role || "Guest"}</StatusBadge>
              <StatusBadge variant="gold">{profile?.membershipTier || "Chưa có hạng"}</StatusBadge>
            </div>
          </div>

          <FeedbackBanner feedback={avatarFeedback} />

          <div
            style={{
              display: "grid",
              gap: 10,
              padding: 16,
              borderRadius: "var(--g-radius-md)",
              background: "var(--g-surface-raised)",
              border: "1px solid var(--g-border-light)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span className="g-label">Điểm loyalty</span>
              <strong>{profile?.loyaltyPoints ?? 0}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span className="g-label">Điểm khả dụng</span>
              <strong>{profile?.loyaltyPointsUsable ?? 0}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span className="g-label">Ngày tham gia</span>
              <strong>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("vi-VN") : "—"}</strong>
            </div>
          </div>
        </article>

        <div style={{ display: "grid", gap: 24 }}>
          <article className="g-card" style={{ padding: 24, display: "grid", gap: 16 }}>
            <SectionTitle
              align="left"
              titleSize="sm"
              title="Thông tin cá nhân"
              subtitle="Bạn có thể cập nhật các thông tin cơ bản dùng trong booking và loyalty."
            />
            <FeedbackBanner feedback={profileFeedback} />

            <form onSubmit={handleProfileSubmit} style={{ display: "grid", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 16 }}>
                <Field label="Họ và tên">
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Email" hint="Email hiện chưa hỗ trợ thay đổi trong portal khách hàng.">
                  <input value={profile?.email || ""} disabled style={{ ...inputStyle, background: "var(--g-surface-raised)", color: "var(--g-text-muted)" }} />
                </Field>
                <Field label="Số điện thoại">
                  <input
                    value={form.phone}
                    onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Ngày sinh">
                  <input
                    type="date"
                    value={form.dateOfBirth || ""}
                    onChange={(event) => setForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Giới tính">
                  <select
                    value={form.gender}
                    onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="Male">Nam</option>
                    <option value="Female">Nữ</option>
                    <option value="Other">Khác</option>
                  </select>
                </Field>
                <Field label="Hạng thành viên">
                  <input
                    value={profile?.membershipTier || "Chưa có hạng"}
                    disabled
                    style={{ ...inputStyle, background: "var(--g-surface-raised)", color: "var(--g-text-muted)" }}
                  />
                </Field>
              </div>

              <Field label="Địa chỉ">
                <textarea
                  rows={4}
                  value={form.address}
                  onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </Field>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="g-btn-primary" disabled={savingProfile}>
                  {savingProfile ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </article>

          <article className="g-card" style={{ padding: 24, display: "grid", gap: 16 }}>
            <SectionTitle
              align="left"
              titleSize="sm"
              title="Đổi mật khẩu"
              subtitle="Sử dụng mật khẩu mạnh và không trùng với các dịch vụ khác."
            />
            <FeedbackBanner feedback={passwordFeedback} />

            <form onSubmit={handlePasswordSubmit} style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 16 }}>
                <Field label="Mật khẩu hiện tại">
                  <input
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, oldPassword: event.target.value }))}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Mật khẩu mới">
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Xác nhận mật khẩu mới">
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                    style={inputStyle}
                  />
                </Field>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="g-btn-primary" disabled={savingPassword}>
                  {savingPassword ? "Đang cập nhật..." : "Đổi mật khẩu"}
                </button>
              </div>
            </form>
          </article>
        </div>
      </section>
    </PageContainer>
  );
}
