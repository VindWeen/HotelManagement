import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { PageContainer, EmptyState } from "../../../components/guest";

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const orderId = searchParams.get("orderId");
  const resultCode = searchParams.get("resultCode");
  const message = searchParams.get("message");
  
  // Extract bookingId from orderId (Format: BOOKING_123_timestamp)
  let bookingId = null;
  if (orderId && orderId.startsWith("BOOKING_")) {
    const parts = orderId.split("_");
    if (parts.length >= 2) {
      bookingId = parts[1];
    }
  }

  const isSuccess = resultCode === "0";

  return (
    <PageContainer className="g-section-lg">
      <div style={{ maxWidth: 500, margin: "40px auto" }}>
        {isSuccess ? (
          <EmptyState 
            icon="🎉" 
            title="Thanh toán thành công!" 
            message={`Đơn hàng ${orderId} đã được thanh toán. ${message || ""}`} 
            action={{ label: "Xem chi tiết Booking", onClick: () => navigate(bookingId ? `/guest/payment/deposit/${bookingId}` : "/guest/my-bookings") }}
          />
        ) : (
          <EmptyState 
            icon="❌" 
            title="Thanh toán thất bại" 
            message={message || "Đã có lỗi xảy ra trong quá trình thanh toán."} 
            action={{ label: "Thử lại", onClick: () => navigate(bookingId ? `/guest/payment/deposit/${bookingId}` : "/guest/my-bookings") }}
          />
        )}
      </div>
    </PageContainer>
  );
}
