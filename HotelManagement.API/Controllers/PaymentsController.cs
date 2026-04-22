using HotelManagement.API.Services;
using HotelManagement.Core.Authorization;
using HotelManagement.Core.Constants;
using HotelManagement.Core.Entities;
using HotelManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagement.API.Controllers;

public class RecordPaymentRequest
{
    public int? BookingId { get; set; }
    public int? InvoiceId { get; set; }
    public string? PaymentType { get; set; }
    public string? PaymentMethod { get; set; }
    public decimal AmountPaid { get; set; }
    public string? TransactionCode { get; set; }
    public string? Note { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPaymentService _paymentService;
    private readonly IInvoiceService _invoiceService;

    public PaymentsController(AppDbContext db, IPaymentService paymentService, IInvoiceService invoiceService)
    {
        _db = db;
        _paymentService = paymentService;
        _invoiceService = invoiceService;
    }

    [RequirePermission(PermissionCodes.ManageInvoices)]
    [HttpPost]
    public async Task<IActionResult> RecordPayment([FromBody] RecordPaymentRequest request)
    {
        _paymentService.EnsureValidAmount(request.AmountPaid);

        var hasBooking = request.BookingId.HasValue;
        var hasInvoice = request.InvoiceId.HasValue;
        if (hasBooking == hasInvoice)
            return BadRequest(new { success = false, message = "Thanh toán phải gắn đúng một trong hai đối tượng: booking hoặc hóa đơn." });

        if (hasBooking)
        {
            var bookingId = request.BookingId!.Value;
            var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId);
            if (booking == null)
                return NotFound(new { success = false, message = $"Không tìm thấy booking #{bookingId}." });

            var normalizedType = request.PaymentType switch
            {
                PaymentTypes.Refund => PaymentTypes.Refund,
                PaymentTypes.CheckInCollection => PaymentTypes.CheckInCollection,
                _ => PaymentTypes.BookingDeposit
            };

            var payment = new Payment
            {
                BookingId = booking.Id,
                PaymentType = normalizedType,
                PaymentMethod = request.PaymentMethod ?? "Cash",
                AmountPaid = request.AmountPaid,
                TransactionCode = request.TransactionCode,
                Status = PaymentStatuses.Success,
                PaymentDate = DateTime.UtcNow,
                Note = request.Note
            };

            _db.Payments.Add(payment);
            await _db.SaveChangesAsync();

            var recalculated = await _db.Payments
                .Where(p => p.BookingId == booking.Id && p.Status == PaymentStatuses.Success)
                .SumAsync(p => p.PaymentType == PaymentTypes.Refund ? -p.AmountPaid : p.AmountPaid);

            booking.DepositAmount = Math.Max(0m, recalculated);
            if (booking.Status == BookingStatuses.Pending && booking.DepositAmount >= booking.RequiredBookingDepositAmount)
            {
                booking.Status = BookingStatuses.Confirmed;
            }

            await _db.SaveChangesAsync();
            if (normalizedType != PaymentTypes.Refund)
            {
                await _invoiceService.CreateFromBookingAsync(booking.Id);
            }

            return Ok(new
            {
                success = true,
                message = normalizedType == PaymentTypes.Refund ? "Ghi nhận hoàn tiền booking thành công." : "Ghi nhận thanh toán booking thành công.",
                data = new
                {
                    payment.Id,
                    payment.BookingId,
                    payment.AmountPaid,
                    payment.PaymentType,
                    payment.PaymentMethod,
                    payment.TransactionCode,
                    payment.Status,
                    payment.PaymentDate,
                    payment.Note
                },
                booking = new
                {
                    booking.Id,
                    booking.BookingCode,
                    booking.Status,
                    booking.DepositAmount,
                    booking.RequiredBookingDepositAmount,
                    booking.RequiredCheckInAmount,
                    canConfirm = booking.DepositAmount >= booking.RequiredBookingDepositAmount,
                    canCheckIn = booking.DepositAmount >= booking.RequiredCheckInAmount
                }
            });
        }

        var invoiceId = request.InvoiceId!.Value;
        var invoice = await _db.Invoices
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.Id == invoiceId);

        if (invoice == null)
            return NotFound(new { success = false, message = $"Không tìm thấy hóa đơn #{invoiceId}." });

        var paidAmount = invoice.Payments
            .Where(p => p.Status == PaymentStatuses.Success)
            .Sum(p => p.PaymentType == PaymentTypes.Refund ? -p.AmountPaid : p.AmountPaid);
        var depositAmount = invoice.BookingId.HasValue
            ? await _db.Bookings
                .Where(b => b.Id == invoice.BookingId.Value)
                .Select(b => b.DepositAmount ?? 0m)
                .FirstOrDefaultAsync()
            : 0m;
        var outstandingAmount = Math.Max(0m, (invoice.FinalTotal ?? 0m) - paidAmount - depositAmount);

        if (request.AmountPaid > outstandingAmount)
        {
            return BadRequest(new
            {
                success = false,
                message = $"Số tiền thanh toán không được vượt quá dư nợ hiện tại ({outstandingAmount:N0}đ).",
                outstandingAmount
            });
        }

        var invoicePayment = new Payment
        {
            InvoiceId = invoiceId,
            PaymentType = request.PaymentType ?? PaymentTypes.FinalSettlement,
            PaymentMethod = request.PaymentMethod ?? "Cash",
            AmountPaid = request.AmountPaid,
            TransactionCode = request.TransactionCode,
            Status = PaymentStatuses.Success,
            PaymentDate = DateTime.UtcNow,
            Note = request.Note
        };

        _db.Payments.Add(invoicePayment);
        await _db.SaveChangesAsync();

        // [MỚI] Đồng bộ lại DepositAmount cho Booking liên quan
        if (invoice.BookingId.HasValue)
        {
            var bId = invoice.BookingId.Value;
            var relatedBooking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bId);
            if (relatedBooking != null)
            {
                // Tính tổng tất cả payment thành công liên quan đến booking này (trực tiếp hoặc qua invoice)
                var totalPaid = await _db.Payments
                    .Where(p => (p.BookingId == bId || (p.InvoiceId != null && _db.Invoices.Any(i => i.Id == p.InvoiceId && i.BookingId == bId))) && p.Status == PaymentStatuses.Success)
                    .SumAsync(p => p.PaymentType == PaymentTypes.Refund ? -p.AmountPaid : p.AmountPaid);

                relatedBooking.DepositAmount = Math.Max(0m, totalPaid);
                
                // Nếu đang Pending mà nộp đủ tiền qua invoice thì cũng auto Confirm
                if (relatedBooking.Status == BookingStatuses.Pending && relatedBooking.DepositAmount >= relatedBooking.RequiredBookingDepositAmount)
                {
                    relatedBooking.Status = BookingStatuses.Confirmed;
                }
                
                await _db.SaveChangesAsync();
            }
        }

        var finalized = await _invoiceService.FinalizeAsync(invoice.Id);

        return Ok(new
        {
                success = true,
                message = "Ghi nhận thanh toán thành công.",
                data = new
                {
                    invoicePayment.Id,
                    invoicePayment.InvoiceId,
                    invoicePayment.AmountPaid,
                    invoicePayment.PaymentType,
                    invoicePayment.PaymentMethod,
                    invoicePayment.TransactionCode,
                    invoicePayment.Status,
                    invoicePayment.PaymentDate,
                    invoicePayment.Note
                },
                invoice = finalized
        });
    }
}
