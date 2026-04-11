import { useEffect, useState } from "react";
import { getReviews } from "../../api/reviewsApi";
import { PageContainer, SectionTitle, LoadingSpinner, EmptyState } from "../../components/guest";
import { getFullImageUrl } from "../../utils/imageUtils";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getReviews({ page: 1, pageSize: 18 });
        if (!cancelled) {
          setReviews(res.data?.data || []);
          setAvgRating(res.data?.avgRating || 0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageContainer className="g-section-lg">
      <SectionTitle 
        eyebrow="Góc nhìn khách hàng"
        title="Dấu Ấn Khó Quên"
        subtitle={<>Điểm đánh giá trung bình: <strong style={{ color: 'var(--g-gold)', fontSize: '1.2em' }}>{avgRating}/5</strong></>}
      />

      <div style={{ marginTop: 'var(--g-space-14)' }}>
        {loading ? (
          <LoadingSpinner variant="skeleton" skeletonCount={6} />
        ) : reviews.length === 0 ? (
          <EmptyState 
            icon="✨" 
            title="Chưa có đánh giá" 
            message="Hãy là người đầu tiên để lại đánh giá sau kỳ nghỉ của bạn!"
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 'var(--g-space-6)' }}>
            {reviews.map((review) => (
              <article key={review.id} className="g-card" style={{ display: 'flex', flexDirection: 'column' }}>
                {review.imageUrl && (
                  <div style={{ height: 200, overflow: 'hidden' }}>
                    <img src={getFullImageUrl(review.imageUrl)} alt="Review" className="g-img-cover" />
                  </div>
                )}
                <div style={{ padding: 'var(--g-space-6)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 'var(--g-text-xl)', color: 'var(--g-gold)' }}>
                    {"★".repeat(review.rating)}{"☆".repeat(Math.max(0, 5 - review.rating))}
                  </div>
                  
                  {review.comment && (
                    <blockquote style={{
                      margin: 'var(--g-space-4) 0',
                      flex: 1,
                      fontStyle: 'italic',
                      lineHeight: 'var(--g-leading-relaxed)',
                      color: 'var(--g-text-secondary)',
                      fontSize: 'var(--g-text-base)'
                    }}>
                      "{review.comment}"
                    </blockquote>
                  )}
                  
                  <div style={{ marginTop: 'var(--g-space-2)', paddingTop: 'var(--g-space-4)', borderTop: '1px solid var(--g-border)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--g-text)' }}>
                      {review.user?.fullName || "Khách lưu trú"}
                    </div>
                    {review.roomType?.name && (
                      <div style={{ fontSize: 'var(--g-text-sm)', color: 'var(--g-text-muted)', marginTop: 2 }}>
                        Chất lượng phòng: {review.roomType.name}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
