import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getGuestServiceCatalog } from "../../../api/guestServicesApi";
import { PageContainer, LoadingSpinner, EmptyState } from "../../../components/guest";
import { formatCurrency } from "../../../utils";

export default function GuestServicesPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchKw, setSearchKw] = useState("");
  const [activeCat, setActiveCat] = useState("all");

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    try {
      const res = await getGuestServiceCatalog();
      setCategories(res.data?.data || []);
    } catch (err) {
      console.error(err);
      setError("Không thể tải danh sách dịch vụ.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer className="g-section-lg">
        <LoadingSpinner text="Đang tải danh sách dịch vụ..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer className="g-section-lg">
        <EmptyState icon="❌" title="Lỗi" message={error} />
      </PageContainer>
    );
  }

  const handleOrder = (targetServiceId = null) => {
    navigate("/guest/services/order" + (targetServiceId ? `?serviceId=${targetServiceId}` : ""));
  };

  const styles = `
    .sv-hero {
      position: relative;
      background: linear-gradient(135deg, var(--g-primary), var(--g-primary-hover));
      border-radius: 24px;
      padding: 60px 40px;
      color: white;
      overflow: hidden;
      margin-bottom: 40px;
      box-shadow: 0 20px 40px rgba(26,56,38,0.15);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .sv-hero::after {
      content: '';
      position: absolute;
      inset: 0;
      background: url('https://images.unsplash.com/photo-1544161515-4ab6ce6db874?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80') center/cover;
      opacity: 0.15;
      mix-blend-mode: overlay;
      pointer-events: none;
    }
    .sv-hero-title {
      font-family: var(--g-font-heading);
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 16px;
      z-index: 1;
      letter-spacing: -0.02em;
    }
    .sv-hero-desc {
      font-size: 1.1rem;
      max-width: 600px;
      opacity: 0.9;
      z-index: 1;
      margin-bottom: 32px;
      line-height: 1.6;
    }
    .sv-search-bar {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 500px;
      display: flex;
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 50px;
      padding: 6px 6px 6px 20px;
    }
    .sv-search-bar input {
      flex: 1;
      background: transparent;
      border: none;
      color: white;
      font-size: 1rem;
      outline: none;
    }
    .sv-search-bar input::placeholder {
      color: rgba(255,255,255,0.7);
    }
    .sv-search-bar button {
      background: white;
      color: var(--g-primary);
      border: none;
      border-radius: 40px;
      padding: 10px 24px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .sv-search-bar button:hover {
      transform: scale(1.05);
    }

    .sv-nav {
      display: flex;
      gap: 12px;
      margin-bottom: 40px;
      overflow-x: auto;
      padding-bottom: 8px;
    }
    .sv-nav::-webkit-scrollbar { display: none; }
    .sv-cat-pill {
      padding: 12px 24px;
      background: var(--g-surface-raised);
      border: 1px solid var(--g-border-light);
      border-radius: 100px;
      font-weight: 600;
      color: var(--g-text-secondary);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.3s;
    }
    .sv-cat-pill:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .sv-cat-pill.active {
      background: var(--g-primary);
      color: white;
      border-color: var(--g-primary);
      box-shadow: 0 8px 24px rgba(26,56,38,0.2);
    }

    .sv-cat-section {
      margin-bottom: 60px;
      animation: g-fadeInUp 0.6s ease-out backwards;
    }
    .sv-cat-title {
      font-family: var(--g-font-heading);
      font-size: 2rem;
      color: var(--g-text);
      margin-bottom: 24px;
      position: relative;
      display: inline-block;
    }
    .sv-cat-title::after {
      content: '';
      position: absolute;
      bottom: -6px;
      left: 0;
      width: 40px;
      height: 3px;
      background: var(--g-gold);
      border-radius: 2px;
    }

    .sv-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 30px;
    }
    .sv-card {
      background: var(--g-surface);
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid var(--g-border);
      transition: transform 0.3s, box-shadow 0.3s;
      display: flex;
      flex-direction: column;
      position: relative;
      group: hover;
    }
    .sv-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.08);
      border-color: var(--g-gold);
    }
    .sv-card-img-wrap {
      width: 100%;
      height: 220px;
      position: relative;
      overflow: hidden;
      background: var(--g-surface-alt);
    }
    .sv-card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s;
    }
    .sv-card:hover .sv-card-img {
      transform: scale(1.08);
    }
    .sv-card-icon {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--g-text-muted);
      opacity: 0.5;
    }
    .sv-card-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .sv-card-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 8px;
      color: var(--g-text);
    }
    .sv-card-desc {
      font-size: 0.95rem;
      color: var(--g-text-secondary);
      line-height: 1.5;
      margin-bottom: 20px;
      flex: 1;
    }
    .sv-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid var(--g-border-light);
    }
    .sv-card-price {
      font-size: 1.3rem;
      font-weight: 800;
      color: var(--g-primary);
      font-family: var(--g-font-heading);
    }
    .sv-card-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--g-surface-raised);
      border: 1px solid var(--g-border);
      color: var(--g-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s;
    }
    .sv-card:hover .sv-card-btn {
      background: var(--g-primary);
      border-color: var(--g-primary);
      color: white;
    }
  `;

  return (
    <PageContainer className="g-section-lg">
      <style>{styles}</style>

      {/* Hero Section */}
      <div className="sv-hero">
        <h1 className="sv-hero-title">Khám Phá Dịch Vụ</h1>
        <p className="sv-hero-desc">
          Trải nghiệm đẳng cấp với các dịch vụ tuyệt vời ngay tại phòng của bạn. Từ ẩm thực tinh tế đến spa thư giãn, chúng tôi luôn sẵn lòng phục vụ.
        </p>
        <div className="sv-search-bar">
          <input
            type="text"
            placeholder="Tìm kiếm dịch vụ (Vd: Massage, Rượu vang...)"
            value={searchKw}
            onChange={e => setSearchKw(e.target.value)}
          />
          <button type="button" onClick={() => handleOrder()}>GỌI DỊCH VỤ</button>
        </div>
      </div>

      {/* Categories Navigation */}
      <div className="sv-nav">
        <button 
          className={`sv-cat-pill ${activeCat === "all" ? "active" : ""}`}
          onClick={() => setActiveCat("all")}
        >
          Tất cả dịch vụ
        </button>
        {categories.map((cat) => (
          <button 
            key={cat.id} 
            className={`sv-cat-pill ${activeCat === cat.id ? "active" : ""}`}
            onClick={() => setActiveCat(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Services List */}
      <div>
        {categories.map((cat, idx) => {
          if (activeCat !== "all" && activeCat !== cat.id) return null;

          const filteredServices = cat.services.filter(s => 
            s.name.toLowerCase().includes(searchKw.toLowerCase())
          );

          if (filteredServices.length === 0) return null;

          return (
            <div key={cat.id} className="sv-cat-section" style={{ animationDelay: `${idx * 0.1}s` }}>
              <h2 className="sv-cat-title">{cat.name}</h2>
              <div className="sv-grid">
                {filteredServices.map(srv => (
                  <div key={srv.id} className="sv-card">
                    <div className="sv-card-img-wrap">
                      {srv.imageUrl ? (
                        <img src={srv.imageUrl} alt={srv.name} className="sv-card-img" />
                      ) : (
                        <div className="sv-card-icon">
                          <span className="material-symbols-outlined" style={{ fontSize: 64 }}>room_service</span>
                        </div>
                      )}
                    </div>
                    <div className="sv-card-body">
                      <h3 className="sv-card-title">{srv.name}</h3>
                      <p className="sv-card-desc">{srv.description || "Tận hưởng chất lượng dịch vụ chuẩn 5 sao."}</p>
                      
                      <div className="sv-card-footer">
                        <div className="sv-card-price">
                          {formatCurrency(srv.price)}
                          {srv.unit && <span style={{ fontSize: "0.85rem", color: "var(--g-text-muted)", marginLeft: 4, fontWeight: 500 }}>/ {srv.unit}</span>}
                        </div>
                        <button className="sv-card-btn" onClick={() => handleOrder(srv.id)} title="Đặt dịch vụ này">
                          <span className="material-symbols-outlined">add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
}
