import { useEffect, useMemo, useState } from "react";
import { EmptyState, LoadingSpinner, PageContainer, SectionTitle, StatusBadge } from "../../components/guest";
import { createReview, getMyReviewStatus } from "../../api/reviewsApi";
import { formatCurrency } from "../../utils";
import { getFullImageUrl } from "../../utils/imageUtils";

const getReviewVariant = (status) => {
  if (status === "approved") return "success";
  if (status === "rejected") return "error";
  if (status === "pending") return "warning";
  return "neutral";
};

const getReviewLabel = (status) => {
  if (status === "approved") return "Đã duyệt";
  if (status === "rejected") return "Bị từ chối";
  if (status === "pending") return "Đã đánh giá";
  return "Không rõ";
};

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function MyReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [submittedReviews, setSubmittedReviews] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedBooking = useMemo(
    () => pendingBookings.find((item) => String(item.id) === String(selectedBookingId)),
    [pendingBookings, selectedBookingId]
  );

  const imagePreview = useMemo(() => {
    if (!image) return "";
    return URL.createObjectURL(image);
  }, [image]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getMyReviewStatus();
      const pending = res.data?.pendingReviewBookings || [];
      setPendingBookings(pending);
      const allSubmitted = res.data?.submittedReviews || [];
      setSubmittedReviews(allSubmitted.filter(r => r.status === "approved"));
      setSelectedBookingId((current) => current || (pending[0]?.id ? String(pending[0].id) : ""));
    } catch (err) {
      setError(err?.response?.data?.message || "Không thể tải trạng thái review.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedBooking) {
      setError("Vui lòng chọn booking đã hoàn tất để đánh giá.");
      return;
    }
    if (!selectedBooking.roomTypeId) {
      setError("Booking này chưa có hạng phòng hợp lệ để đánh giá.");
      return;
    }
    if (rating < 1 || rating > 5) {
      setError("Điểm đánh giá phải từ 1 đến 5.");
      return;
    }

    setSubmitting(true);
    try {
      await createReview({
        bookingId: selectedBooking.id,
        roomTypeId: selectedBooking.roomTypeId,
        rating,
        comment: comment.trim(),
        image,
      });
      setSuccess("Cảm ơn bạn đã đánh giá.");
      setComment("");
      setImage(null);
      setSelectedBookingId("");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Gửi review thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Đang tải review của bạn..." />;
  }

  return (
    <PageContainer className="g-section-lg" style={{ display: "grid", gap: 28 }}>
      <SectionTitle
        align="left"
        eyebrow="Sau lưu trú"
        title="Review Của Tôi"
        subtitle="Gửi đánh giá cho các kỳ lưu trú đã hoàn tất và theo dõi trạng thái duyệt."
      />

      {error ? (
        <div className="g-card" style={{ padding: 18, color: "var(--g-error)", borderColor: "var(--g-error-border)", background: "var(--g-error-bg)" }}>
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="g-card" style={{ padding: 18, color: "var(--g-success)", borderColor: "var(--g-success-border)", background: "var(--g-success-bg)" }}>
          {success}
        </div>
      ) : null}

      <section style={{ display: "grid", gap: 32, maxWidth: 800, width: "100%", margin: "0 auto" }}>
        <form className="g-card" style={{ padding: 28, display: "grid", gap: 20 }} onSubmit={handleSubmit}>
          <SectionTitle align="left" titleSize="sm" title="Tạo Review" subtitle="Chỉ booking đã hoàn tất và chưa từng review mới xuất hiện ở đây." />

          {pendingBookings.length === 0 ? (
            <EmptyState compact icon="rate_review" title="Không có booking chờ review" message="Sau khi lưu trú hoàn tất, bạn có thể gửi đánh giá tại đây." />
          ) : (
            <>
              <label style={{ display: "grid", gap: 8 }}>
                <span className="g-label">Booking cần đánh giá</span>
                <select
                  value={selectedBookingId}
                  onChange={(event) => setSelectedBookingId(event.target.value)}
                  style={{ padding: "12px 14px", borderRadius: "var(--g-radius-md)", border: "1px solid var(--g-border)", font: "inherit" }}
                >
                  {pendingBookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {booking.bookingCode} - {booking.roomTypeName || "Hạng phòng"}
                    </option>
                  ))}
                </select>
              </label>

              {selectedBooking ? (
                <div style={{ padding: 14, borderRadius: "var(--g-radius-md)", background: "var(--g-surface-raised)", display: "grid", gap: 6, color: "var(--g-text-secondary)" }}>
                  <strong style={{ color: "var(--g-text)" }}>{selectedBooking.roomTypeName || "Hạng phòng"}</strong>
                  <span>{formatDate(selectedBooking.checkInDate)} - {formatDate(selectedBooking.checkOutDate)}</span>
                  <span>Tổng booking: {formatCurrency(selectedBooking.totalEstimatedAmount || 0)}</span>
                </div>
              ) : null}

              <label style={{ display: "grid", gap: 8 }}>
                <span className="g-label">Điểm đánh giá</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--g-gold, #FFD700)",
                        fontSize: "2.5rem",
                        padding: 0,
                        lineHeight: 1,
                      }}
                    >
                      {value <= rating ? "★" : "☆"}
                    </button>
                  ))}
                </div>
              </label>

              <label style={{ display: "grid", gap: 8 }}>
                <span className="g-label">Nội dung</span>
                <textarea
                  rows={5}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Chia sẻ trải nghiệm lưu trú của bạn..."
                  style={{ padding: "12px 14px", borderRadius: "var(--g-radius-md)", border: "1px solid var(--g-border)", font: "inherit", resize: "vertical" }}
                />
              </label>

              <div style={{ display: "grid", gap: 8 }}>
                <span className="g-label">Ảnh minh chứng</span>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "24px",
                  border: "2px dashed var(--g-border)",
                  borderRadius: "var(--g-radius-md)",
                  background: "var(--g-surface-raised)",
                  cursor: "pointer",
                  color: "var(--g-text-secondary)",
                  textAlign: "center"
                }}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) => setImage(event.target.files?.[0] || null)}
                    style={{ display: "none" }}
                  />
                  {image ? (
                    <span style={{ color: "var(--g-text)" }}>Đã chọn: <strong>{image.name}</strong><br/><small>(Nhấn để đổi ảnh khác)</small></span>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <span className="material-icons" style={{ fontSize: 32, color: "var(--g-text-secondary)" }}>add_photo_alternate</span>
                      <span>Nhấn để chọn ảnh minh chứng (Tùy chọn)</span>
                    </div>
                  )}
                </label>
              </div>

              {imagePreview ? (
                <img src={imagePreview} alt="Preview review" style={{ width: "100%", maxHeight: 300, objectFit: "cover", borderRadius: "var(--g-radius-md)" }} />
              ) : null}

              <button className="g-btn-primary" type="submit" disabled={submitting} style={{ justifyContent: "center" }}>
                {submitting ? "Đang gửi..." : "Gửi review"}
              </button>
            </>
          )}
        </form>

        <section style={{ display: "grid", gap: 16 }}>
          <SectionTitle align="left" titleSize="sm" title="Review Đã Gửi" subtitle="Các review của bạn đã được duyệt và hiển thị." />
          {submittedReviews.length === 0 ? (
            <EmptyState compact icon="reviews" title="Bạn chưa gửi review nào" message="Review đã gửi sẽ xuất hiện ở khu vực này." />
          ) : (
            submittedReviews.map((review) => (
              <article key={review.id} className="g-card" style={{ padding: 18, display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div className="g-label">{review.bookingCode || `Booking #${review.bookingId || "—"}`}</div>
                    <strong style={{ display: "block", marginTop: 6 }}>{review.roomTypeName || "Hạng phòng"}</strong>
                  </div>
                  <StatusBadge variant={getReviewVariant(review.status)} dot>{getReviewLabel(review.status)}</StatusBadge>
                </div>
                <div style={{ color: "var(--g-gold)", fontSize: "1.2rem" }}>
                  {"★".repeat(review.rating || 0)}{"☆".repeat(Math.max(0, 5 - (review.rating || 0)))}
                </div>
                {review.imageUrl ? (
                  <img src={getFullImageUrl(review.imageUrl)} alt="Review" style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: "var(--g-radius-md)" }} />
                ) : null}
                {review.comment ? <p style={{ margin: 0, color: "var(--g-text-secondary)", lineHeight: "var(--g-leading-relaxed)" }}>{review.comment}</p> : null}
                {review.rejectionReason ? (
                  <div style={{ padding: 12, borderRadius: "var(--g-radius-md)", background: "var(--g-error-bg)", color: "var(--g-error)", border: "1px solid var(--g-error-border)" }}>
                    {review.rejectionReason}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </section>
      </section>
    </PageContainer>
  );
}
