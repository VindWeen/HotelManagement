import { formatCurrency, formatDate } from "./index";
import { getInvoiceStatusLabel, getPaymentTypeLabel } from "./statusLabels";

export const printInvoiceDocument = (invoice, mode = "final") => {
    if (!invoice) return;

    const title = mode === "draft" ? `BAN NHAP HOA DON #${invoice.id}` : `HOA DON THANH TOAN #${invoice.id}`;
    const adjustmentRows = (invoice.adjustments || []).map((item) => `
      <tr>
        <td>${item.adjustmentType === "Discount" ? "Giam tru" : "Phu phi"}</td>
        <td>${item.reason || "-"}</td>
        <td style="text-align:right;">${item.adjustmentType === "Discount" ? "-" : "+"}${formatCurrency(item.amount)}</td>
      </tr>
    `).join("");

    const paymentRows = (invoice.payments || []).map((item) => `
      <tr>
        <td>${formatDate(item.paymentDate || "")}</td>
        <td>${getPaymentTypeLabel(item.paymentType) || "-"}</td>
        <td>${item.paymentMethod || "-"}</td>
        <td style="text-align:right;">${formatCurrency(item.amountPaid || 0)}</td>
      </tr>
    `).join("");

    const detailRows = (invoice.bookingDetails || []).map((item) => `
      <tr>
        <td>${item.roomNumber || "-"}</td>
        <td>${item.roomTypeName || "-"}</td>
        <td>${formatDate(item.checkInDate).split(" ")[0]}</td>
        <td>${formatDate(item.checkOutDate).split(" ")[0]}</td>
        <td style="text-align:right;">${formatCurrency(item.pricePerNight || 0)}</td>
      </tr>
    `).join("");

    const serviceRows = (invoice.serviceItems || []).map((item) => `
      <tr>
        <td>${item.roomNumber || "-"}</td>
        <td>${item.serviceName || "-"}</td>
        <td>${item.quantity || 0}</td>
        <td style="text-align:right;">${formatCurrency(item.unitPrice || 0)}</td>
        <td style="text-align:right;">${formatCurrency(item.totalAmount || 0)}</td>
      </tr>
    `).join("");

    const damageRows = (invoice.damageItems || []).map((item) => `
      <tr>
        <td>${item.roomNumber || "-"}</td>
        <td>${item.itemName || "-"}</td>
        <td>${item.quantity || 0}</td>
        <td style="text-align:right;">${formatCurrency(item.penaltyAmount || 0)}</td>
        <td style="text-align:right;">${formatCurrency(item.totalAmount || 0)}</td>
      </tr>
    `).join("");

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      showToast("Trình duyệt đang chặn cửa sổ in.", "warning");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; padding: 32px; }
            h1, h2, h3, p { margin: 0; }
            .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 24px; }
            .badge { display:inline-block; padding:6px 12px; border-radius:999px; background:#f3f4f6; font-size:12px; font-weight:700; }
            .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
            .card { border:1px solid #e5e7eb; border-radius:16px; padding:16px; }
            .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; color:#6b7280; margin-bottom: 12px; }
            table { width:100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border-bottom:1px solid #e5e7eb; padding:10px 8px; text-align:left; font-size:13px; }
            th { color:#6b7280; font-size:12px; text-transform:uppercase; }
            .summary-row { display:flex; justify-content:space-between; margin-bottom:10px; font-size:14px; }
            .summary-total { font-size:18px; font-weight:800; margin-top:12px; padding-top:12px; border-top:2px solid #111827; }
            .muted { color:#6b7280; }
            .watermark { color:#b91c1c; font-weight:800; letter-spacing: 0.2em; }
            @media print { body { padding: 16px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 style="font-size:28px; margin-bottom:6px;">${mode === "draft" ? "BẢN NHÁP HÓA ĐƠN" : "HÓA ĐƠN THANH TOÁN"}</h1>
              <p class="muted">Mã hóa đơn: #${invoice.id}</p>
              <p class="muted">Booking: ${invoice.bookingCode || invoice.bookingId || "-"}</p>
            </div>
            <div style="text-align:right;">
              ${mode === "draft" ? '<div class="watermark">DRAFT</div>' : '<div class="badge">ĐÃ CHỐT</div>'}
              <p class="muted" style="margin-top:8px;">Ngày in: ${formatDate(new Date())}</p>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="section-title">Thông tin khách</div>
              <p><strong>${invoice.booking?.guestName || "-"}</strong></p>
              <p class="muted">SĐT: ${invoice.booking?.guestPhone || "-"}</p>
              <p class="muted">Email: ${invoice.booking?.guestEmail || "-"}</p>
            </div>
            <div class="card">
              <div class="section-title">Trạng thái</div>
              <p><strong>${getInvoiceStatusLabel(invoice.status) || "-"}</strong></p>
              <p class="muted">Ngày tạo: ${formatDate(invoice.createdAt)}</p>
            </div>
          </div>

          <div class="card" style="margin-bottom: 24px;">
            <div class="section-title">Chi tiết lưu trú</div>
            <table>
              <thead>
                <tr>
                  <th>Phòng</th>
                  <th>Hạng phòng</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th style="text-align:right;">Giá/đêm</th>
                </tr>
              </thead>
              <tbody>
                ${detailRows || '<tr><td colspan="5">Không có dữ liệu</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="card" style="margin-bottom: 24px;">
            <div class="section-title">Dịch vụ đã sử dụng</div>
            <table>
              <thead>
                <tr>
                  <th>Phòng</th>
                  <th>Dịch vụ</th>
                  <th>SL</th>
                  <th style="text-align:right;">Đơn giá</th>
                  <th style="text-align:right;">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                ${serviceRows || '<tr><td colspan="5">Không có dịch vụ phát sinh</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="card" style="margin-bottom: 24px;">
            <div class="section-title">Thiết bị / thất thoát</div>
            <table>
              <thead>
                <tr>
                  <th>Phòng</th>
                  <th>Vật tư</th>
                  <th>SL</th>
                  <th style="text-align:right;">Đơn giá đền bù</th>
                  <th style="text-align:right;">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                ${damageRows || '<tr><td colspan="5">Không có thất thoát</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="grid">
            <div class="card">
              <div class="section-title">Điều chỉnh hóa đơn</div>
              <table>
                <thead>
                  <tr>
                    <th>Loại</th>
                    <th>Lý do</th>
                    <th style="text-align:right;">Số tiền</th>
                  </tr>
                </thead>
                <tbody>
                  ${adjustmentRows || '<tr><td colspan="3">Không có điều chỉnh</td></tr>'}
                </tbody>
              </table>
            </div>
            <div class="card">
              <div class="section-title">Tổng hợp thanh toán</div>
              <div class="summary-row"><span>Tiền phòng</span><strong>${formatCurrency(invoice.totalRoomAmount || 0)}</strong></div>
              <div class="summary-row"><span>Tiền dịch vụ</span><strong>${formatCurrency(invoice.totalServiceAmount || 0)}</strong></div>
              <div class="summary-row"><span>Bồi thường</span><strong>${formatCurrency(invoice.totalDamageAmount || 0)}</strong></div>
              <div class="summary-row"><span>Phụ phí</span><strong>${formatCurrency(invoice.adjustmentAmount || 0)}</strong></div>
              <div class="summary-row"><span>Chiết khấu voucher</span><strong>- ${formatCurrency(invoice.discountAmount || 0)}</strong></div>
              <div class="summary-row"><span>Giảm trừ thủ công</span><strong>- ${formatCurrency(invoice.manualDiscountAmount || 0)}</strong></div>
              <div class="summary-row"><span>Thuế</span><strong>${formatCurrency(invoice.taxAmount || 0)}</strong></div>
              <div class="summary-row"><span>Đã thanh toán</span><strong>${formatCurrency(invoice.paidAmount || 0)}</strong></div>
              <div class="summary-row"><span>Tiền cọc</span><strong>${formatCurrency(invoice.depositAmount || 0)}</strong></div>
              <div class="summary-row summary-total"><span>Tổng cần thu</span><span>${formatCurrency(invoice.finalTotal || 0)}</span></div>
              <div class="summary-row" style="margin-top:12px;"><span>Còn lại</span><strong>${formatCurrency(invoice.outstandingAmount || 0)}</strong></div>
            </div>
          </div>

          <div class="card" style="margin-top: 24px;">
            <div class="section-title">Lịch sử thanh toán</div>
            <table>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Loại</th>
                  <th>Phương thức</th>
                  <th style="text-align:right;">Số tiền</th>
                </tr>
              </thead>
              <tbody>
                ${paymentRows || '<tr><td colspan="4">Chưa có thanh toán</td></tr>'}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 200);
  };
