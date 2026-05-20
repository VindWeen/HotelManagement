import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { PageContainer, EmptyState } from "../../../components/guest";
import { useAdminAuthStore } from "../../../store/adminAuthStore";

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAdminAuthStore();

  const isVnPay = searchParams.has("vnp_ResponseCode") || searchParams.has("vnp_TxnRef");
  const isSePay = searchParams.has("payment");

  let isSuccess = false;
  let bookingId = null;
  let displayMessage = "";
  let displayOrderId = "";

  if (isVnPay) {
    const responseCode = searchParams.get("vnp_ResponseCode");
    const txnRef       = searchParams.get("vnp_TxnRef");
    const bankCode     = searchParams.get("vnp_BankCode") || "";
    const transNo      = searchParams.get("vnp_TransactionNo") || "";

    isSuccess = responseCode === "00";
    displayOrderId = txnRef || "";

    if (txnRef && txnRef.startsWith("BOOKING_")) {
      const parts = txnRef.split("_");
      if (parts.length >= 2) bookingId = parts[1];
    }

    displayMessage = isSuccess
      ? `Giao dịch ${transNo ? "#" + transNo : ""} qua ${bankCode || "VNPay"} đã thành công. Tự động chuyển trang sau 3 giây...`
      : vnpayErrorMessage(responseCode);
  } else if (isSePay) {
    const paymentStatus = searchParams.get("payment");
    const orderId = searchParams.get("orderId");

    isSuccess = paymentStatus === "success";
    displayOrderId = orderId || "";
    bookingId = orderId;

    if (paymentStatus === "success") {
      displayMessage = `Thanh toán cho đơn hàng ${displayOrderId} thành công. Tự động chuyển trang sau 3 giây...`;
    } else if (paymentStatus === "cancel") {
      displayMessage = `Bạn đã hủy thanh toán cho đơn hàng ${displayOrderId}.`;
    } else {
      displayMessage = `Thanh toán cho đơn hàng ${displayOrderId} thất bại.`;
    }
  } else {
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
      ? `Đơn hàng ${orderId} đã được thanh toán qua MoMo. Tự động chuyển trang sau 3 giây...`
      : (message || "Đã có lỗi xảy ra trong quá trình thanh toán.");
  }

  const fallbackUrl = token ? "/guest/my-bookings" : "/booking";
  const successUrl = fallbackUrl;
  const errorUrl = bookingId ? `/guest/payment/deposit/${bookingId}` : fallbackUrl;

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        navigate(successUrl);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate, successUrl]);

  return (
    <PageContainer className="g-section-lg">
      <div style={{ maxWidth: 500, margin: "40px auto" }}>
        {isSuccess ? (
          <EmptyState
            icon="🎉"
            title="Thanh toán thành công!"
            message={displayMessage}
            action={{ label: "Chuyển qua trang booking của tôi", onClick: () => navigate(successUrl) }}
          />
        ) : (
          <EmptyState
            icon="❌"
            title={searchParams.get("payment") === "cancel" ? "Thanh toán đã bị hủy" : "Thanh toán thất bại"}
            message={displayMessage}
            action={{ label: "Thử lại", onClick: () => navigate(errorUrl) }}
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
