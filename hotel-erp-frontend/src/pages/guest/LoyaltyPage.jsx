import { useEffect, useMemo, useState } from "react";
import { EmptyState, LoadingSpinner, PageContainer, SectionTitle, StatusBadge } from "../../components/guest";
import { getMyLoyalty, getMyLoyaltyTransactions } from "../../api/loyaltyMembersApi";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const txVariant = (type) => {
  if (type === "earned") return "success";
  if (type === "redeemed") return "warning";
  if (type === "expired") return "error";
  return "neutral";
};

export default function LoyaltyPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loyalty, setLoyalty] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [loyaltyRes, txRes] = await Promise.all([
          getMyLoyalty(),
          getMyLoyaltyTransactions(),
        ]);

        if (cancelled) return;
        setLoyalty(loyaltyRes.data || null);
        setTransactions(txRes.data?.data || []);
        setSummary(txRes.data?.summary || null);
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || "Không thể tải thông tin loyalty.");
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

  const member = loyalty?.member;
  const progress = loyalty?.progress;
  const tier = loyalty?.currentTier;
  const nextTier = loyalty?.nextTier;
  const progressPercent = Math.min(100, Math.max(0, progress?.progressPercent ?? 0));

  const tierStyle = useMemo(
    () => ({
      borderColor: tier?.colorHex || "var(--g-border)",
      background: tier?.colorHex ? `${tier.colorHex}14` : "var(--g-bg-card)",
    }),
    [tier?.colorHex]
  );

  if (loading) {
    return <LoadingSpinner text="Đang tải thông tin thành viên..." />;
  }

  return (
    <PageContainer className="g-section-lg" style={{ display: "grid", gap: 28 }}>
      <SectionTitle
        align="left"
        eyebrow="Membership"
        title="Loyalty & Hạng Thành Viên"
        subtitle="Theo dõi điểm tích lũy, quyền lợi hiện tại và tiến trình lên hạng của bạn."
      />

      {error ? (
        <div className="g-card" style={{ padding: 18, color: "var(--g-error)", borderColor: "var(--g-error-border)", background: "var(--g-error-bg)" }}>
          {error}
        </div>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        <article className="g-card" style={{ padding: 24, display: "grid", gap: 18, ...tierStyle }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <div className="g-label">Hạng hiện tại</div>
              <h2 style={{ margin: "6px 0 0", fontFamily: "var(--g-font-heading)", color: tier?.colorHex || "var(--g-primary)" }}>
                {tier?.tierName || "Chưa có hạng"}
              </h2>
            </div>
            <StatusBadge variant="success" dot>
              {tier?.discountPercent ? `Giảm ${tier.discountPercent}%` : "Đang tích điểm"}
            </StatusBadge>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
            <div>
              <div className="g-label">Tổng điểm</div>
              <strong style={{ fontSize: "1.8rem", color: "var(--g-text)" }}>{member?.loyaltyPoints ?? 0}</strong>
            </div>
            <div>
              <div className="g-label">Điểm dùng được</div>
              <strong style={{ fontSize: "1.8rem", color: "var(--g-primary)" }}>{member?.loyaltyPointsUsable ?? 0}</strong>
            </div>
            <div>
              <div className="g-label">Giao dịch điểm</div>
              <strong style={{ fontSize: "1.8rem", color: "var(--g-text)" }}>{member?.transactionCount ?? 0}</strong>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "var(--g-text-secondary)", fontSize: "var(--g-text-sm)" }}>
              <span>{nextTier ? `Còn ${progress?.pointsToNextTier ?? 0} điểm để lên ${nextTier.tierName}` : "Bạn đang ở hạng cao nhất hiện có"}</span>
              <strong>{progressPercent}%</strong>
            </div>
            <div style={{ height: 12, borderRadius: 999, background: "var(--g-surface-raised)", overflow: "hidden" }}>
              <div style={{ width: `${progressPercent}%`, height: "100%", background: tier?.colorHex || "var(--g-primary)", borderRadius: 999 }} />
            </div>
          </div>
        </article>

        <article className="g-card" style={{ padding: 24, display: "grid", gap: 14 }}>
          <div className="g-label">Tổng quan điểm</div>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span>Điểm đã cộng</span>
              <strong style={{ color: "var(--g-success)" }}>{summary?.earnedPoints ?? 0}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span>Điểm đã dùng</span>
              <strong style={{ color: "var(--g-warning)" }}>{summary?.spentPoints ?? 0}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span>Tổng giao dịch</span>
              <strong>{summary?.totalTransactions ?? 0}</strong>
            </div>
          </div>
        </article>
      </section>

      <section style={{ display: "grid", gap: 16 }}>
        <SectionTitle align="left" titleSize="sm" title="Lịch Sử Tích Điểm" subtitle="Các lần cộng, dùng hoặc điều chỉnh điểm loyalty của bạn." />
        {transactions.length === 0 ? (
          <EmptyState compact icon="stars" title="Chưa có giao dịch điểm" message="Sau khi hoàn tất lưu trú hoặc dùng điểm, lịch sử sẽ hiển thị tại đây." />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {transactions.map((tx) => (
              <article key={tx.id} className="g-card" style={{ padding: 18, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <StatusBadge variant={txVariant(tx.transactionType)} dot>{tx.transactionType}</StatusBadge>
                    <div style={{ marginTop: 8, color: "var(--g-text-secondary)" }}>{tx.note || tx.bookingCode || "Giao dịch loyalty"}</div>
                  </div>
                  <strong style={{ fontSize: "1.2rem", color: tx.points >= 0 ? "var(--g-success)" : "var(--g-error)" }}>
                    {tx.points >= 0 ? "+" : ""}{tx.points} điểm
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--g-text-muted)", fontSize: "var(--g-text-sm)" }}>
                  <span>{formatDate(tx.createdAt)}</span>
                  <span>Số dư: {tx.balanceAfter}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}
