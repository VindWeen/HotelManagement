import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getArticles } from "../../api/articlesApi";
import { PageContainer, SectionTitle, LoadingSpinner, EmptyState } from "../../components/guest";
import { getPlainTextExcerpt, stripHtml } from "../../utils";
import { getFullImageUrl } from "../../utils/imageUtils";

export default function ArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [sortOrder, setSortOrder] = useState("desc");
  const [searchTerm, setSearchTerm] = useState("");

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
  const filteredArticles = publishedArticles.filter(a => {
    const matchesCategory = activeCategory === "Tất cả" || a.category?.name === activeCategory;
    const matchesSearch = !searchTerm || 
      a.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.metaDescription?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
            icon={<span className="material-symbols-outlined" style={{ fontSize: 'inherit' }}>article</span>} 
            title="Chưa có bài viết nào" 
            message="Chúng tôi đang cập nhật nội dung. Bạn hãy quay lại sau nhé!"
          />
        ) : (
          <>
            {/* Thanh Tìm kiếm & Bộ lọc */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48, gap: 24, flexWrap: 'wrap' }}>
              
              {/* Thanh tìm kiếm */}
              <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 450 }}>
                <span className="material-symbols-outlined" style={{ 
                  position: 'absolute', 
                  left: 16, 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--g-text-faint)',
                  pointerEvents: 'none'
                }}>
                  search
                </span>
                <input 
                  type="text" 
                  placeholder="Tìm kiếm bài viết..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 48px',
                    borderRadius: 'var(--g-radius-full)',
                    border: '1px solid var(--g-neutral-border)',
                    background: 'var(--g-bg-card)',
                    color: 'var(--g-text)',
                    fontSize: 'var(--g-text-sm)',
                    outline: 'none',
                    transition: 'all var(--g-transition)',
                    boxShadow: 'var(--g-shadow-sm)'
                  }}
                  className="g-focus-ring"
                />
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              
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
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 'var(--g-space-10)' }}>
              {filteredArticles.map((article) => (
                <Link
                  key={article.id}
                  to={`/articles/${article.slug}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                  className="group"
                >
                  <article className="g-card" style={{ 
                    display: 'flex', 
                    flexDirection: 'row', 
                    width: '100%',
                    minHeight: 320,
                    flexWrap: 'wrap'
                  }}>
                    {/* Phần hình ảnh */}
                    <div style={{ 
                      flex: '0 0 100%',
                      height: 240, 
                      position: 'relative', 
                      background: 'var(--g-surface-raised)',
                      overflow: 'hidden'
                    }} className="md:!flex-[0_0_400px] md:!h-auto">
                      {article.thumbnailUrl ? (
                        <img 
                          src={getFullImageUrl(article.thumbnailUrl)} 
                          alt={stripHtml(article.title) || "Article thumbnail"} 
                          className="g-img-cover"
                          style={{
                            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        />
                      ) : (
                        <div style={{ 
                          width: '100%', 
                          height: '100%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: 'var(--g-text-faint)',
                          fontSize: 'var(--g-text-sm)'
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: 8 }}>image</span>
                        </div>
                      )}
                    </div>

                    {/* Phần nội dung */}
                    <div style={{ 
                      padding: 'var(--g-space-8)', 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column',
                      justifyContent: 'center',
                      minWidth: 320
                    }}>
                      <div className="g-label" style={{ color: 'var(--g-primary)', marginBottom: 'var(--g-space-3)' }}>
                        {article.category?.name || "Chưa phân loại"}
                      </div>
                      
                      <h3 style={{ 
                        fontFamily: 'var(--g-font-heading)',
                        fontSize: 'var(--g-text-2xl)', 
                        fontWeight: 800,
                        lineHeight: 'var(--g-leading-snug)', 
                        color: 'var(--g-text)',
                        margin: 0,
                        transition: 'color var(--g-transition)'
                      }} className="group-hover:text-[var(--g-primary)]">
                        {getPlainTextExcerpt(article.title, 120)}
                      </h3>

                      {article.metaDescription && (
                        <p style={{ 
                          color: 'var(--g-text-secondary)', 
                          lineHeight: 'var(--g-leading-relaxed)',
                          fontSize: 'var(--g-text-base)',
                          marginTop: 'var(--g-space-4)',
                          marginBottom: 'var(--g-space-6)',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {getPlainTextExcerpt(article.metaDescription, 240)}
                        </p>
                      )}

                      <div style={{ 
                        marginTop: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: 'var(--g-primary)',
                        fontWeight: 700,
                        fontSize: 'var(--g-text-sm)',
                        textTransform: 'uppercase',
                        letterSpacing: 'var(--g-tracking-wider)'
                      }}>
                        Xem chi tiết
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_right_alt</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
            
            {filteredArticles.length === 0 && (
              <div style={{ padding: '80px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16, color: 'var(--g-text-faint)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 'inherit' }}>search_off</span>
                </div>
                <div style={{ color: 'var(--g-text)', fontWeight: 700, fontSize: 'var(--g-text-xl)', marginBottom: 8 }}>
                  Không tìm thấy bài viết
                </div>
                <div style={{ color: 'var(--g-text-muted)' }}>
                  {searchTerm 
                    ? `Không có kết quả nào cho "${searchTerm}". Thử từ khóa khác nhé!`
                    : "Không có bài viết nào trong danh mục này."}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}
