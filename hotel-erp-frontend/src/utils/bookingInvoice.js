export const BOOKING_INVOICE_EXPORT_TOOLTIP =
  "Cần dọn phòng để kiểm kê thất thoát trước khi xuất hóa đơn nháp";

const EXPORTABLE_BOOKING_STATUSES = new Set([
  "Checked_out_pending_settlement",
  "Completed",
]);

export const canExportBookingInvoice = (booking) => {
  if (!EXPORTABLE_BOOKING_STATUSES.has(booking?.status)) {
    return false;
  }

  const details = booking?.bookingDetails || [];
  if (details.length === 0) {
    return false;
  }

  return details.every((detail) => {
    const cleaningStatus = detail?.cleaningStatus;
    if (!cleaningStatus) return false;
    return String(cleaningStatus).toLowerCase() !== "dirty";
  });
};
