import { useSearchParams, useNavigate } from "react-router-dom";
import { PageContainer, EmptyState } from "../../../components/guest";

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ── Phát hiện loại callback ──────────────────────────────
  // VNPay trả về: vnp_ResponseCode, vnp_TxnRef
  // MoMo trả về : resultCode, orderId
  const isVnPay = searchParams.has("vnp_ResponseCode") || searchParams.has("vnp_TxnRef");

  let isSuccess = false;
  let bookingId = null;
  let displayMessage = "";
  let displayOrderId = "";

  if (isVnPay) {
    const responseCode = searchParams.get("vnp_ResponseCode");
    const txnRef       = searchParams.get("vnp_TxnRef");      // BOOKING_123_timestamp
    const bankCode     = searchParams.get("vnp_BankCode") || "";
    const transNo      = searchParams.get("vnp_TransactionNo") || "";

    isSuccess = responseCode === "00";
    displayOrderId = txnRef || "";

    if (txnRef && txnRef.startsWith("BOOKING_")) {
      const parts = txnRef.split("_");
      if (parts.length >= 2) bookingId = parts[1];
    }

    displayMessage = isSuccess
      ? `Giao dịch ${transNo ? "#" + transNo : ""} qua ${bankCode || "VNPay"} đã thành công.`
      : vnpayErrorMessage(responseCode);
  } else {
    // MoMo
    const resultCode = searchParams.get("resultCode");
    const orderId    = searchParams.get("orderId");
    const message    = searchParams.get("message");

    isSuccess = resultCode === "0";
    displayOrderId = orderId || "";

    if (orderId && orderId.startsWith("BOOKING_")) {
      const parts = orderId.split("_");
      if (parts.length >= 2) bookingId = parts[1];
    }

    displayMessage = isSuccess
      ? `Đơn hàng ${orderId} đã được thanh toán qua MoMo.`
      : (message || "Đã có lỗi xảy ra trong quá trình thanh toán MoMo.");
  }

  const backUrl = bookingId ? `/guest/payment/deposit/${bookingId}` : "/guest/my-bookings";

  return (
    <PageContainer className="g-section-lg">
      <div style={{ maxWidth: 500, margin: "40px auto" }}>
        {isSuccess ? (
          <EmptyState
            icon="🎉"
            title="Thanh toán thành công!"
            message={displayMessage}
            action={{ label: "Xem chi tiết Booking", onClick: () => navigate(backUrl) }}
          />
        ) : (
          <EmptyState
            icon="❌"
            title="Thanh toán thất bại"
            message={displayMessage}
            action={{ label: "Thử lại", onClick: () => navigate(backUrl) }}
          />
        )}
      </div>
    </PageContainer>
  );
}

function vnpayErrorMessage(code) {
  const messages = {
    "07": "Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).",
    "09": "Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking.",
    "10": "Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.",
    "11": "Đã hết hạn chờ thanh toán. Vui lòng thực hiện lại.",
    "12": "Thẻ/Tài khoản bị khóa.",
    "13": "Nhập sai mật khẩu OTP. Vui lòng thực hiện lại.",
    "24": "Giao dịch bị hủy.",
    "51": "Tài khoản không đủ số dư để thực hiện giao dịch.",
    "65": "Tài khoản đã vượt quá hạn mức giao dịch trong ngày.",
    "75": "Ngân hàng thanh toán đang bảo trì.",
    "79": "Nhập sai mật khẩu thanh toán quá số lần quy định.",
  };
  return messages[code] ?? `Giao dịch không thành công (mã lỗi: ${code || "N/A"}).`;
}
