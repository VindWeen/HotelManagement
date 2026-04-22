import { useEffect, useState } from "react";
import { approveReview, getReviews } from "../../api/reviewsApi";
import { useResponsiveAdmin } from "../../hooks/useResponsiveAdmin";

const cardStyle = {
  background: "white",
  borderRadius: 18,
  border: "1px solid #f1f0ea",
  boxShadow: "0 1px 3px rgba(0,0,0,.06)",
};

function formatDate(date) {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleString("vi-VN");
  } catch {
    return date;
  }
}

export default function ReviewAdminPage() {
  const { isMobile } = useResponsiveAdmin();
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getReviews({ status, page: 1, pageSize: 100 });
      setRows(res.data?.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Không thể tải danh sách đánh giá.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [status]);

  const handleApprove = async (id, isApproved) => {
    const rejectionReason = isApproved ? null : window.prompt("Nhập lý do từ chối đánh giá");
    if (!isApproved && !rejectionReason?.trim()) return;
    try {
      await approveReview(id, isApproved, rejectionReason?.trim() || null);
      await loadData();
    } catch (e) {
      setError(e?.response?.data?.message || "Không thể cập nhật trạng thái đánh giá.");
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingInline: isMobile ? 4 : 0 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', sans-serif; }
      `}</style>

      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 28, color: "#1c1917", fontWeight: 800, letterSpacing: "-0.025em" }}>Duyệt đánh giá</h2>
          <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 14 }}>
            Kiểm tra đánh giá từ khách và duyệt hoặc từ chối ngay trong admin.
          </p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ minWidth: isMobile ? 0 : 220, width: isMobile ? "100%" : "auto", padding: "10px 14px", borderRadius: 12, border: "1.5px solid #e2e8e1", background: "#f9f8f3", fontWeight: 600 }}>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Đã từ chối</option>
        </select>
      </div>

      {error ? <div style={{ ...cardStyle, padding: 14, marginBottom: 20, color: "#b91c1c", background: "#fff7f7" }}>{error}</div> : null}

      <section style={{ ...cardStyle, overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #f1f0ea" }}>
          <strong style={{ color: "#1c1917" }}>Danh sách đánh giá</strong>
          <p style={{ margin: "4px 0 0", color: "#78716c", fontSize: 13 }}>Tổng cộng {rows.length} đánh giá.</p>
        </div>
        {isMobile ? (
          <div style={{ display: "grid", gap: 12, padding: 16 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Đang tải dữ liệu...</div>
            ) : rows.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Chưa có đánh giá phù hợp bộ lọc.</div>
            ) : (
              rows.map((review) => (
                <article key={review.id} style={{ border: "1px solid #f1f0ea", borderRadius: 16, padding: 14, display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#1c1917" }}>{review.user?.fullName || "-"}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "#78716c" }}>{review.roomType?.name || "-"}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: "#1c1917" }}>{review.rating}/5</div>
                  </div>
                  <div style={{ fontSize: 13, color: "#57534e", lineHeight: 1.6 }}>{review.comment || "-"}</div>
                  {review.rejectionReason ? <div style={{ color: "#b91c1c", fontSize: 12 }}>Lý do từ chối: {review.rejectionReason}</div> : null}
                  <div style={{ fontSize: 12, color: "#78716c" }}>{formatDate(review.createdAt)}</div>
                  <div>
                    {status === "pending" ? (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <button type="button" onClick={() => handleApprove(review.id, true)} style={{ padding: "10px 10px", borderRadius: 10, border: "1px solid #bbf7d0", background: "#ecfdf5", color: "#047857", cursor: "pointer" }}>Duyệt</button>
                        <button type="button" onClick={() => handleApprove(review.id, false)} style={{ padding: "10px 10px", borderRadius: 10, border: "1px solid #fecaca", background: "#fff7f7", color: "#b91c1c", cursor: "pointer" }}>Từ chối</button>
                      </div>
                    ) : (
                      <span style={{ color: "#78716c", fontSize: 13 }}>Đã xử lý</span>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#faf8f3", borderBottom: "1px solid #f1f0ea" }}>
                {["Khách", "Hạng phòng", "Đánh giá", "Nội dung", "Ngày tạo", "Thao tác"].map((heading, idx) => (
                  <th key={heading} style={{ padding: "16px 18px", textAlign: idx === 5 ? "right" : "left", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "#78716c" }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Đang tải dữ liệu...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Chưa có đánh giá phù hợp bộ lọc.</td></tr>
              ) : (
                rows.map((review) => (
                  <tr key={review.id} style={{ borderBottom: "1px solid #f7f4ee" }}>
                    <td style={{ padding: "16px 18px" }}>{review.user?.fullName || "-"}</td>
                    <td style={{ padding: "16px 18px" }}>{review.roomType?.name || "-"}</td>
                    <td style={{ padding: "16px 18px", fontWeight: 700 }}>{review.rating}/5</td>
                    <td style={{ padding: "16px 18px", color: "#57534e", minWidth: 280 }}>
                      <div>{review.comment || "-"}</div>
                      {review.rejectionReason ? <div style={{ marginTop: 6, color: "#b91c1c", fontSize: 12 }}>Lý do từ chối: {review.rejectionReason}</div> : null}
                    </td>
                    <td style={{ padding: "16px 18px", color: "#57534e" }}>{formatDate(review.createdAt)}</td>
                    <td style={{ padding: "16px 18px", textAlign: "right" }}>
                      {status === "pending" ? (
                        <div style={{ display: "inline-flex", gap: 8 }}>
                          <button type="button" onClick={() => handleApprove(review.id, true)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #bbf7d0", background: "#ecfdf5", color: "#047857", cursor: "pointer" }}>Duyệt</button>
                          <button type="button" onClick={() => handleApprove(review.id, false)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #fecaca", background: "#fff7f7", color: "#b91c1c", cursor: "pointer" }}>Từ chối</button>
                        </div>
                      ) : (
                        <span style={{ color: "#78716c", fontSize: 13 }}>Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </section>
    </div>
  );
}
