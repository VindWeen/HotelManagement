import axiosClient from "./axios";

// Guest: Tạo thanh toán MoMo cho tiền cọc
export const createGuestDepositPayment = (bookingId) =>
  axiosClient.post("/Payments/guest/deposit", { bookingId });

// Guest: Xem trạng thái thanh toán booking
export const getGuestPaymentStatus = (bookingId) =>
  axiosClient.get(`/Payments/guest/booking/${bookingId}`);

// Admin: Ghi nhận thanh toán thủ công (cũ)
export const recordPayment = (payload) => axiosClient.post("/Payments", payload);
