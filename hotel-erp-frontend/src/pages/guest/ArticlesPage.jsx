import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getArticles } from "../../api/articlesApi";
import { PageContainer, SectionTitle, LoadingSpinner, EmptyState } from "../../components/guest";
import { getFullImageUrl } from "../../utils/imageUtils";

export default function ArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getArticles({ page: 1, pageSize: 100 }); // Lấy thêm bài viết để filter tab
        if (!cancelled) {
          setArticles(res.data?.data || []);
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

  const publishedArticles = articles
    .filter(a => a.status === "Published" && a.isActive !== false) // Chỉ lấy bài is_active = 1 (true)
    .sort((a, b) => {
      const dateA = new Date(a.publishedAt || a.createdAt);
      const dateB = new Date(b.publishedAt || b.createdAt);
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

  const categories = ["Tất cả", ...new Set(articles.filter(a => a.status === "Published" && a.isActive !== false).map(a => a.category?.name).filter(Boolean))];
  const filteredArticles = activeCategory === "Tất cả" 
    ? publishedArticles 
    : publishedArticles.filter(a => a.category?.name === activeCategory);

  return (
    <PageContainer className="g-section-lg">
      <SectionTitle 
        eyebrow="Tạp chí Ethereal"
        title="Tin Tức & Khám Phá"
        subtitle="Khám phá những câu chuyện thú vị, kinh nghiệm du lịch và những mẹo nhỏ để có một kỳ nghỉ hoàn hảo."
      />

      <div style={{ marginTop: 'var(--g-space-14)' }}>
        {loading ? (
          <LoadingSpinner variant="skeleton" skeletonCount={6} />
        ) : publishedArticles.length === 0 ? (
          <EmptyState 
            icon="📰" 
            title="Chưa có bài viết nào" 
            message="Chúng tôi đang cập nhật nội dung. Bạn hãy quay lại sau nhé!"
          />
        ) : (
          <>
            {/* Bộ lọc Danh mục & Ngày xuất bản */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 40, gap: 16, flexWrap: 'wrap' }}>
              
              {/* Lọc Tag/Category */}
              {categories.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label htmlFor="category-select" style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--g-text-secondary)' }}>
                    Danh mục:
                  </label>
                  <select
                    id="category-select"
                    value={activeCategory}
                    onChange={(e) => setActiveCategory(e.target.value)}
                    style={{
                      padding: '10px 36px 10px 16px',
                      borderRadius: 'var(--g-radius-md)',
                      border: '1px solid var(--g-neutral-border)',
                      background: 'var(--g-bg-card)',
                      color: 'var(--g-text)',
                      fontSize: '0.9375rem',
                      fontFamily: 'var(--g-font-body)',
                      outline: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      backgroundSize: '16px'
                    }}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Lọc / Sắp xếp Ngày xuất bản */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label htmlFor="sort-select" style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--g-text-secondary)' }}>
                  Ngày xuất bản:
                </label>
                <select
                  id="sort-select"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  style={{
                    padding: '10px 36px 10px 16px',
                    borderRadius: 'var(--g-radius-md)',
                    border: '1px solid var(--g-neutral-border)',
                    background: 'var(--g-bg-card)',
                    color: 'var(--g-text)',
                    fontSize: '0.9375rem',
                    fontFamily: 'var(--g-font-body)',
                    outline: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '16px'
                  }}
                >
                  <option value="desc">Mới nhất</option>
                  <option value="asc">Cũ nhất</option>
                </select>
              </div>

            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 'var(--g-space-8)' }}>
              {filteredArticles.map((article) => (
                <Link
                  key={article.id}
                  to={`/articles/${article.slug}`}
                  style={{ textDecoration: "none", color: "inherit", display: 'flex' }}
                >
                  <article className="g-card" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <div style={{ height: 220, position: 'relative', background: 'var(--g-surface)' }}>
                      {article.thumbnailUrl ? (
                        <img src={getFullImageUrl(article.thumbnailUrl)} alt={article.title} className="g-img-cover" />
                      ) : null}
                    </div>
                    <div style={{ padding: 'var(--g-space-6)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div className="g-label">
                        {article.category?.name || "Chưa phân loại"}
                      </div>
                      <h3 style={{ 
                        fontFamily: 'var(--g-font-heading)',
                        fontSize: 'var(--g-text-xl)', 
                        lineHeight: 'var(--g-leading-snug)', 
                        color: 'var(--g-text)',
                        marginTop: 'var(--g-space-3)',
                        marginBottom: 'var(--g-space-3)'
                      }}>
                        {article.title}
                      </h3>
                      {article.metaDescription && (
                        <p style={{ 
                          color: 'var(--g-text-secondary)', 
                          lineHeight: 'var(--g-leading-relaxed)',
                          fontSize: 'var(--g-text-sm)',
                          flex: 1,
                          margin: 0
                        }}>
                          {article.metaDescription}
                        </p>
                      )}
                    </div>
                  </article>
                </Link>
              ))}
            </div>
            
            {filteredArticles.length === 0 && (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--g-text-muted)' }}>
                Không có bài viết nào trong danh mục này.
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}
