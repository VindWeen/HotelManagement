import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getArticleBySlug } from "../../api/articlesApi";
import { PageContainer, LoadingSpinner, EmptyState } from "../../components/guest";
import { getFullImageUrl } from "../../utils/imageUtils";

export default function ArticleDetailPage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getArticleBySlug(slug);
        // Only show if it's published to guests
        if (!cancelled) {
          if (res.data?.status === "Published") {
            setArticle(res.data);
          } else {
            setArticle(null); // Treat non-published as not found for guests
          }
        }
      } catch {
        if (!cancelled) setArticle(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const parsedArticle = useMemo(() => {
    if (!article) return { contentHtml: "", attractions: [] };
    if (typeof window === "undefined") {
      return { contentHtml: article.content || "", attractions: [] };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(article.content || "<p>Chưa có nội dung.</p>", "text/html");
    const attractionNodes = Array.from(doc.querySelectorAll(".article-attraction-block"));

    const attractions = attractionNodes.map((node, index) => {
      const dataset = node.dataset || {};
      const latitude = dataset.latitude ? Number(dataset.latitude) : null;
      const longitude = dataset.longitude ? Number(dataset.longitude) : null;
      const rawMapEmbedLink = dataset.mapEmbedLink || "";
      let mapEmbedUrl = "";
      
      // Nếu có link hợp lệ (bắt buộc phải là url tuyệt đối bắt đầu bằng http) thì dùng luôn
      if (rawMapEmbedLink && rawMapEmbedLink.startsWith("http")) {
        mapEmbedUrl = rawMapEmbedLink;
      } 
      // Nếu không, Fallback 1: dùng tọa độ GPS
      else if (latitude != null && !Number.isNaN(latitude) && longitude != null && !Number.isNaN(longitude)) {
        mapEmbedUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;
      } 
      // Fallback 2: Không có tọa độ thì dùng Địa chỉ tĩnh
      else if (dataset.address) {
        mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(dataset.address)}&z=15&output=embed`;
      }

      node.remove();

      let nextElement = node.nextElementSibling;
      while (nextElement && nextElement.tagName === "P" && !nextElement.textContent?.trim()) {
        const emptyElement = nextElement;
        nextElement = nextElement.nextElementSibling;
        emptyElement.remove();
      }

      if (nextElement?.tagName === "P") {
        const noteText = nextElement.textContent?.trim() || "";
        if (noteText.startsWith("Đã liên kết địa điểm:")) {
          nextElement.remove();
        }
      }

      return {
        id: dataset.attractionId || `attraction-${index + 1}`,
        name: dataset.name || "Địa điểm liên kết",
        category: dataset.category || "",
        address: dataset.address || "",
        imageUrl: dataset.imageUrl || "",
        mapEmbedLink: rawMapEmbedLink,
        latitude,
        longitude,
        mapEmbedUrl,
      };
    });

    const attractionCards = article.attraction ? [article.attraction] : attractions;

    return {
      contentHtml: doc.body.innerHTML || "<p>Chưa có nội dung.</p>",
      attractions: attractionCards,
    };
  }, [article]);

  if (loading) return <LoadingSpinner fullPage text="Đang tải bài viết..." />;
  if (!article) return <EmptyState icon="😕" title="Không tìm thấy bài viết" message="Bài viết không tồn tại hoặc chưa được xuất bản." action={<Link to="/articles" className="g-btn-outline">Quay lại danh sách</Link>} />;

  const publishedDate = article.publishedAt 
    ? new Date(article.publishedAt).toLocaleDateString("vi-VN", { year: 'numeric', month: 'long', day: 'numeric' })
    : "";

  return (
    <>
      <style>{`
        .g-article-body {
          font-size: 18px;
          line-height: 1.9;
          color: var(--g-text-secondary);
          word-break: break-word;
        }
        .g-article-body h1,
        .g-article-body h2,
        .g-article-body h3,
        .g-article-body h4 {
          color: var(--g-text);
          line-height: 1.2;
          margin: 1.8em 0 0.75em;
          letter-spacing: -0.03em;
          font-family: var(--g-font-heading);
        }
        .g-article-body h2 { font-size: 34px; }
        .g-article-body h3 { font-size: 26px; }
        .g-article-body p { margin: 1em 0; }
        .g-article-body img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1.5em auto;
          border-radius: 18px;
          box-shadow: var(--g-shadow-md);
        }
        .g-article-body ul,
        .g-article-body ol {
          padding-left: 1.5em;
          margin: 1em 0;
        }
        .g-article-body blockquote {
          margin: 1.6em 0;
          padding: 0.8em 1.2em;
          border-left: 4px solid var(--g-primary);
          background: var(--g-surface-raised);
          color: var(--g-text-secondary);
        }
        .g-article-body a {
          color: var(--g-primary);
          text-decoration: underline;
        }
      `}</style>
      
      {/* Nền cover full page */}
      <div style={{ background: "linear-gradient(180deg, var(--g-surface-raised) 0%, var(--g-bg) 220px, var(--g-bg) 100%)", minHeight: "100vh" }}>
        <header
          style={{
            maxWidth: 980,
            margin: "0 auto",
            padding: "56px 24px 28px",
          }}
        >
          <Link to="/articles" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--g-primary)' }}>
            <span>←</span> Tạp chí Ethereal
          </Link>

          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 13, color: "var(--g-text-muted)", marginBottom: 14 }}>
              {article.category?.name || "Chưa phân loại"} • {publishedDate || "Mới nhất"}
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(34px, 5vw, 56px)",
                lineHeight: 1.05,
                letterSpacing: "-0.04em",
                color: "var(--g-text)",
                fontFamily: "var(--g-font-heading)"
              }}
            >
              {article.title}
            </h1>
            {article.metaDescription && (
              <p
                style={{
                  margin: "18px 0 0",
                  maxWidth: 720,
                  fontSize: 18,
                  lineHeight: 1.7,
                  color: "var(--g-text-secondary)",
                }}
              >
                {article.metaDescription}
              </p>
            )}
          </div>
        </header>

        <main style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 72px" }}>
          <div
            className={`flex flex-col ${parsedArticle.attractions.length ? 'lg:flex-row' : ''} items-start`}
            style={{
              gap: 24,
            }}
          >
            <article
              className="w-full"
              style={{
                background: "var(--g-bg-card)",
                borderRadius: 28,
                border: "1px solid var(--g-border)",
                boxShadow: "var(--g-shadow-lg)",
                overflow: "hidden",
              }}
            >
              {article.thumbnailUrl && (
                <div style={{ width: '100%', height: 420 }}>
                  <img src={getFullImageUrl(article.thumbnailUrl)} alt={article.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div
                style={{
                  padding: "36px clamp(22px, 5vw, 72px) 48px",
                }}
              >
                <div
                  className="g-article-body"
                  dangerouslySetInnerHTML={{ __html: parsedArticle.contentHtml }}
                />
              </div>
            </article>

            {parsedArticle.attractions.length > 0 && (
              <aside className="w-full lg:w-[360px] shrink-0" style={{ display: "grid", gap: 16 }}>
                {parsedArticle.attractions.map((attraction) => {
                  let mapEmbedUrl = attraction.mapEmbedUrl || "";
                  
                  // Nếu chưa có (ví dụ lấy từ API backend object), tự generate
                  if (!mapEmbedUrl) {
                    const rawLink = attraction.mapEmbedLink || "";
                    if (rawLink && rawLink.startsWith("http")) {
                      mapEmbedUrl = rawLink;
                    } else if (attraction.latitude != null && attraction.longitude != null) {
                      mapEmbedUrl = `https://maps.google.com/maps?q=${attraction.latitude},${attraction.longitude}&z=15&output=embed`;
                    } else if (attraction.address) {
                      mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(attraction.address)}&z=15&output=embed`;
                    }
                  }

                  return (
                      <section
                        key={attraction.id}
                        style={{
                          background: "var(--g-bg-card)",
                          borderRadius: 24,
                          border: "1px solid var(--g-border)",
                          boxShadow: "var(--g-shadow-lg)",
                          overflow: "hidden",
                          position: "sticky",
                          top: 100,
                        }}
                      >
                        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--g-border-light)", background: "var(--g-surface-raised)" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--g-primary)" }}>
                            Địa điểm liên kết
                          </div>
                          <h3 style={{ margin: "10px 0 0", fontSize: 24, lineHeight: 1.2, color: "var(--g-text)", fontFamily: 'var(--g-font-heading)' }}>
                            {attraction.name}
                          </h3>
                          {attraction.category && (
                            <p style={{ margin: "8px 0 0", color: "var(--g-text-muted)", fontSize: 14 }}>{attraction.category}</p>
                          )}
                        </div>
                        <div style={{ padding: 20, display: "grid", gap: 16 }}>
                          {attraction.imageUrl && (
                            <img
                              src={getFullImageUrl(attraction.imageUrl)}
                              alt={attraction.name}
                              style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 18, border: "1px solid var(--g-border)" }}
                            />
                          )}
                          {attraction.address && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--g-text-muted)" }}>
                                Địa chỉ
                              </div>
                              <div style={{ marginTop: 6, color: "var(--g-text-secondary)", lineHeight: 1.7 }}>{attraction.address}</div>
                            </div>
                          )}
                          {mapEmbedUrl ? (
                            <iframe
                              title={`attraction-map-${attraction.id}`}
                              src={mapEmbedUrl}
                              loading="lazy"
                              style={{ width: "100%", height: 260, border: "1px solid var(--g-border)", borderRadius: 18 }}
                            />
                          ) : (
                            <div style={{ padding: 18, borderRadius: 16, background: "var(--g-surface-raised)", color: "var(--g-text-muted)", textAlign: "center" }}>
                              Địa điểm này chưa có tọa độ để hiển thị bản đồ.
                            </div>
                          )}
                          <Link to={`/attractions/${attraction.id}`} className="g-btn-outline" style={{ marginTop: 8, display: 'block', textAlign: 'center' }}>
                            Xem chi tiết địa điểm
                          </Link>
                        </div>
                      </section>
                  );
                })}
              </aside>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
