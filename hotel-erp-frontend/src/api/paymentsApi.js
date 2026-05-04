import axiosClient from "./axios";

// Guest: Tạo thanh toán MoMo cho tiền cọc
export const createGuestDepositPayment = (bookingId, access = {}) =>
  axiosClient.post("/Payments/guest/deposit", { bookingId, ...access });

// Guest: Xem trạng thái thanh toán booking
export const getGuestPaymentStatus = (bookingId, access = {}) =>
  axiosClient.get(`/Payments/guest/booking/${bookingId}`, { params: access });

// Admin: Ghi nhận thanh toán thủ công (cũ)
export const recordPayment = (payload) => axiosClient.post("/Payments", payload);
