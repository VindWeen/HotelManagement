import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAttractions } from "../../api/attractionsApi";
import { PageContainer, SectionTitle, LoadingSpinner, EmptyState } from "../../components/guest";
import { getFullImageUrl } from "../../utils/imageUtils";

export default function AttractionsPage() {
  const [attractions, setAttractions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getAttractions();
        if (!cancelled) setAttractions(res.data?.data || []);
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
        eyebrow="Khám phá điểm đến"
        title="Bản Đồ Trải Nghiệm"
        subtitle="Những địa điểm du lịch, văn hóa và ẩm thực đặc sắc không thể bỏ lỡ xung quanh The Ethereal."
      />

      <div style={{ marginTop: 'var(--g-space-14)' }}>
        {loading ? (
          <LoadingSpinner variant="skeleton" skeletonCount={6} />
        ) : attractions.length === 0 ? (
          <EmptyState 
            icon="🗺️" 
            title="Chưa có địa điểm khám phá" 
            message="Chúng tôi đang tổng hợp các điểm đến hấp dẫn. Quay lại sau nhé!"
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 'var(--g-space-8)' }}>
            {attractions.map((attraction) => (
              <Link 
                key={attraction.id} 
                to={`/attractions/${attraction.id}`} 
                style={{ textDecoration: "none", color: "inherit", display: 'flex' }}
              >
                <article className="g-card" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <div style={{ height: 240, position: 'relative', background: 'var(--g-surface)' }}>
                    {attraction.imageUrl ? (
                      <img src={getFullImageUrl(attraction.imageUrl)} alt={attraction.name} className="g-img-cover" />
                    ) : null}
                  </div>
                  <div style={{ padding: 'var(--g-space-6)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="g-label">
                      {attraction.category || "Địa điểm"}
                    </div>
                    <h3 style={{ 
                      fontFamily: 'var(--g-font-heading)',
                      fontSize: 'var(--g-text-xl)', 
                      lineHeight: 'var(--g-leading-snug)', 
                      color: 'var(--g-text)',
                      marginTop: 'var(--g-space-3)',
                      marginBottom: 'var(--g-space-3)'
                    }}>
                      {attraction.name}
                    </h3>
                    {attraction.address && (
                      <p style={{ 
                        color: 'var(--g-text-secondary)', 
                        lineHeight: 'var(--g-leading-relaxed)',
                        fontSize: 'var(--g-text-sm)',
                        flex: 1,
                        margin: 0
                      }}>
                        📍 {attraction.address}
                      </p>
                    )}
                    <div style={{ marginTop: 'var(--g-space-4)' }}>
                       <span style={{ fontSize: 'var(--g-text-sm)', fontWeight: 600, color: 'var(--g-primary)' }}>Khám phá ngay →</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
