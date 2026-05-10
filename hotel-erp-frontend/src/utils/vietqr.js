const VIETQR_BANK = "VCB";
const VIETQR_ACCOUNT = "1039807638";
const VIETQR_TEMPLATE = "compact";

export const VIETQR_ACCOUNT_NAME = "HOTEL MANAGEMENT";

export function normalizeVietnameseText(value = "") {
  return value
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function buildVietQRUrl(amount, description) {
  const base = `https://img.vietqr.io/image/${VIETQR_BANK}-${VIETQR_ACCOUNT}-${VIETQR_TEMPLATE}.png`;
  const params = new URLSearchParams({
    amount: Math.max(0, Math.round(Number(amount) || 0)).toString(),
    addInfo: description || "",
  });
  return `${base}?${params.toString()}`;
}

export function buildInvoiceVietQRData(booking, invoice) {
  const outstandingAmount = Math.max(
    0,
    Number(
      invoice?.outstandingAmount ??
        (Number(invoice?.finalTotal || 0) -
          Number(invoice?.paidAmount || 0) -
          Number(invoice?.depositAmount || 0)),
    ) || 0,
  );

  if (outstandingAmount <= 0) {
    return null;
  }

  const guestName =
    booking?.guestName ||
    invoice?.guestName ||
    invoice?.booking?.guestName ||
    booking?.guestEmail?.split("@")[0] ||
    "";
  const bookingCode = booking?.bookingCode || invoice?.bookingCode || invoice?.bookingId || "";
  const normalizedGuestName = normalizeVietnameseText(guestName).trim();
  const description = [normalizedGuestName, "Thanh toan hoa don", bookingCode, outstandingAmount]
    .filter(Boolean)
    .join(" ");

  return {
    bankCode: VIETQR_BANK,
    accountNumber: VIETQR_ACCOUNT,
    template: VIETQR_TEMPLATE,
    accountName: VIETQR_ACCOUNT_NAME,
    amount: outstandingAmount,
    description,
    qrUrl: buildVietQRUrl(outstandingAmount, description),
  };
}
