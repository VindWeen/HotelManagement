import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAttractionById } from "../../api/attractionsApi";
import { PageContainer, LoadingSpinner, EmptyState } from "../../components/guest";
import { getFullImageUrl } from "../../utils/imageUtils";

export default function AttractionDetailPage() {
  const { id } = useParams();
  const [attraction, setAttraction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getAttractionById(id);
        if (!cancelled) setAttraction(res.data);
      } catch {
        if (!cancelled) setAttraction(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const mapEmbedUrl = useMemo(() => {
    if (!attraction) return "";
    
    // Nếu có embed link nhưng không phải url tuyệt đối, có thể DB lưu sai
    if (attraction.mapEmbedLink && attraction.mapEmbedLink.startsWith("http")) {
      return attraction.mapEmbedLink;
    }
    
    // Fallback 1: Dùng tọa độ lat/lng
    if (attraction.latitude != null && attraction.longitude != null) {
      return `https://maps.google.com/maps?q=${attraction.latitude},${attraction.longitude}&z=15&output=embed`;
    }
    
    // Fallback 2: Dùng địa chỉ
    if (attraction.address) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(attraction.address)}&z=15&output=embed`;
    }

    return "";
  }, [attraction]);

  if (loading) return <LoadingSpinner fullPage text="Đang tải điểm đến..." />;
  if (!attraction) return <EmptyState icon="🗺️" title="Không tìm thấy điểm đến" action={<Link to="/attractions" className="g-btn-outline">Quay lại</Link>} />;

  return (
    <>
      <div style={{ background: 'var(--g-surface-raised)', padding: 'var(--g-space-16) 0 var(--g-space-10)' }}>
        <PageContainer size="md">
          <Link to="/attractions" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--g-primary)' }}>
            <span>←</span> Quay lại danh sách khám phá
          </Link>
          <div className="g-label" style={{ marginTop: 'var(--g-space-6)' }}>
            {attraction.category || "Địa điểm"}
          </div>
          <h1 style={{ 
            fontFamily: 'var(--g-font-heading)',
            fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
            lineHeight: 1.1,
            letterSpacing: 'var(--g-tracking-tight)',
            marginTop: 'var(--g-space-4)'
          }}>
            {attraction.name}
          </h1>
          {attraction.address && (
            <p style={{
              fontSize: 'var(--g-text-lg)',
              color: 'var(--g-text-secondary)',
              marginTop: 'var(--g-space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span>📍</span> {attraction.address}
            </p>
          )}
        </PageContainer>
      </div>

      <PageContainer style={{ paddingBottom: 'var(--g-space-24)', paddingTop: 'var(--g-space-12)' }}>
        <div className="flex flex-col lg:flex-row items-start" style={{ gap: 'var(--g-space-10)' }}>
          
          <article className="g-card w-full" style={{ border: 'none', borderRadius: 'var(--g-radius-2xl)' }}>
            {attraction.imageUrl && (
              <div style={{ height: 460, overflow: 'hidden' }}>
                <img src={getFullImageUrl(attraction.imageUrl)} alt={attraction.name} className="g-img-cover" />
              </div>
            )}
            <div style={{ padding: 'var(--g-space-10) clamp(24px, 5vw, 64px)' }}>
              <div className="g-label" style={{ marginBottom: 'var(--g-space-4)' }}>Mô tả chi tiết</div>
              <div className="g-prose">
                <p style={{ whiteSpace: 'pre-line' }}>{attraction.description || "Chưa có mô tả chi tiết."}</p>
              </div>
            </div>
          </article>

          <aside className="w-full lg:w-[380px] shrink-0" style={{ position: "sticky", top: 100, display: "grid", gap: 'var(--g-space-6)' }}>
            <div className="g-card">
              <div style={{ padding: 'var(--g-space-5) var(--g-space-6)', borderBottom: '1px solid var(--g-border)', background: 'var(--g-bg)' }}>
                <div className="g-label">Bản đồ & Vị trí</div>
              </div>
              <div style={{ padding: 'var(--g-space-6)', display: "grid", gap: 'var(--g-space-4)' }}>
                {mapEmbedUrl ? (
                  <iframe title={`map-${attraction.id}`} src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" style={{ width: "100%", height: 300, border: "none", borderRadius: 'var(--g-radius-md)' }} />
                ) : (
                  <div style={{ padding: 'var(--g-space-8) 0', textAlign: 'center', color: 'var(--g-text-muted)', background: 'var(--g-surface)', borderRadius: 'var(--g-radius-md)' }}>
                    Chưa có tọa độ bản đồ.
                  </div>
                )}
                
                {attraction.distanceKm != null && (
                  <div style={{ 
                    marginTop: 'var(--g-space-2)', 
                    padding: 'var(--g-space-3)', 
                    background: 'var(--g-surface)', 
                    borderRadius: 'var(--g-radius-sm)',
                    fontSize: 'var(--g-text-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span>🚗</span> Khoảng cách ước tính: <strong>{attraction.distanceKm} km</strong>
                  </div>
                )}
              </div>
            </div>
          </aside>

        </div>
      </PageContainer>
    </>
  );
}
