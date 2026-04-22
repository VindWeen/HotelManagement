using HotelManagement.API.Services;
using HotelManagement.Core.Authorization;
using HotelManagement.Core.Constants;
using HotelManagement.Core.Entities;
using HotelManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

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

public class GuestDepositRequest
{
    public int BookingId { get; set; }
}

public class MomoIpnRequest
{
    public string? PartnerCode { get; set; }
    public string? AccessKey { get; set; }
    public string? RequestId { get; set; }
    public long Amount { get; set; }
    public string? OrderId { get; set; }
    public string? OrderInfo { get; set; }
    public string? OrderType { get; set; }
    public long TransId { get; set; }
    public int ResultCode { get; set; }
    public string? Message { get; set; }
    public string? PayType { get; set; }
    public long ResponseTime { get; set; }
    public string? ExtraData { get; set; }
    public string? Signature { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPaymentService _paymentService;
    private readonly IInvoiceService _invoiceService;
    private readonly IMomoService _momoService;

    public PaymentsController(AppDbContext db, IPaymentService paymentService, IInvoiceService invoiceService, IMomoService momoService)
    {
        _db = db;
        _paymentService = paymentService;
        _invoiceService = invoiceService;
        _momoService = momoService;
    }

    // ─── GUEST ENDPOINTS ──────────────────────────────────────────────────

    /// <summary>Guest: Tạo yêu cầu thanh toán cọc qua MoMo</summary>
    [Authorize]
    [HttpPost("guest/deposit")]
    public async Task<IActionResult> GuestCreateDeposit([FromBody] GuestDepositRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub")
                  ?? User.FindFirstValue("id");

        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Không xác định được tài khoản." });

        var booking = await _db.Bookings
            .FirstOrDefaultAsync(b => b.Id == request.BookingId);

        if (booking == null)
            return NotFound(new { success = false, message = "Không tìm thấy booking." });

        // Check booking belongs to current user
        if (booking.UserId == null || booking.UserId.ToString() != userId)
            return Forbid();

        if (booking.Status != BookingStatuses.Pending)
            return BadRequest(new { success = false, message = $"Booking đang ở trạng thái '{booking.Status}', không cần thanh toán cọc." });

        var required = booking.RequiredBookingDepositAmount;
        var paid = booking.DepositAmount ?? 0m;
        var remaining = Math.Max(0m, required - paid);

        if (remaining <= 0)
            return BadRequest(new { success = false, message = "Booking đã được thanh toán đủ cọc." });

        var orderInfo = $"Dat coc booking {booking.BookingCode} - {remaining:N0}đ";
        var result = await _momoService.CreatePaymentAsync(booking.Id, remaining, orderInfo);

        if (!result.Success)
            return BadRequest(new { success = false, message = result.Message ?? "Tạo thanh toán MoMo thất bại." });

        return Ok(new
        {
            success = true,
            data = new
            {
                payUrl = result.PayUrl,
                qrCodeUrl = result.QrCodeUrl,
                orderId = result.OrderId,
                amount = remaining,
                bookingCode = booking.BookingCode,
                bookingId = booking.Id
            }
        });
    }

    /// <summary>MoMo IPN callback — cập nhật trạng thái booking sau khi thanh toán</summary>
    [AllowAnonymous]
    [HttpPost("momo/ipn")]
    public async Task<IActionResult> MomoIpn([FromBody] MomoIpnRequest ipn)
    {
        var fields = new Dictionary<string, string>
        {
            ["accessKey"] = ipn.AccessKey ?? "",
            ["amount"] = ipn.Amount.ToString(),
            ["extraData"] = ipn.ExtraData ?? "",
            ["message"] = ipn.Message ?? "",
            ["orderId"] = ipn.OrderId ?? "",
            ["orderInfo"] = ipn.OrderInfo ?? "",
            ["orderType"] = ipn.OrderType ?? "",
            ["partnerCode"] = ipn.PartnerCode ?? "",
            ["payType"] = ipn.PayType ?? "",
            ["requestId"] = ipn.RequestId ?? "",
            ["responseTime"] = ipn.ResponseTime.ToString(),
            ["resultCode"] = ipn.ResultCode.ToString(),
            ["transId"] = ipn.TransId.ToString()
        };

        if (!_momoService.VerifyIpnSignature(fields, ipn.Signature ?? ""))
            return BadRequest(new { message = "Invalid signature" });

        if (ipn.ResultCode != 0)
            return Ok(new { message = "Payment not successful." });

        // Extract bookingId from orderId format: BOOKING_{id}_{timestamp}
        var parts = (ipn.OrderId ?? "").Split('_');
        if (parts.Length >= 2 && int.TryParse(parts[1], out var bookingId))
        {
            var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId);
            if (booking != null)
            {
                var payment = new Payment
                {
                    BookingId = bookingId,
                    PaymentType = PaymentTypes.BookingDeposit,
                    PaymentMethod = "MoMo",
                    AmountPaid = ipn.Amount,
                    TransactionCode = ipn.TransId.ToString(),
                    Status = PaymentStatuses.Success,
                    PaymentDate = DateTime.UtcNow,
                    Note = $"MoMo IPN - OrderId: {ipn.OrderId}"
                };

                _db.Payments.Add(payment);

                var totalPaid = await _db.Payments
                    .Where(p => p.BookingId == bookingId && p.Status == PaymentStatuses.Success)
                    .SumAsync(p => p.PaymentType == PaymentTypes.Refund ? -p.AmountPaid : p.AmountPaid);

                totalPaid += ipn.Amount;
                booking.DepositAmount = Math.Max(0m, totalPaid);

                if (booking.Status == BookingStatuses.Pending &&
                    (booking.DepositAmount ?? 0m) >= booking.RequiredBookingDepositAmount)
                {
                    booking.Status = BookingStatuses.Confirmed;
                }

                await _db.SaveChangesAsync();
                await _invoiceService.CreateFromBookingAsync(booking.Id);
            }
        }

        return Ok(new { message = "IPN received." });
    }

    /// <summary>Guest: Xem trạng thái thanh toán booking</summary>
    [Authorize]
    [HttpGet("guest/booking/{bookingId:int}")]
    public async Task<IActionResult> GuestGetPaymentStatus(int bookingId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub")
                  ?? User.FindFirstValue("id");

        var booking = await _db.Bookings
            .Include(b => b.Payments)
            .Include(b => b.BookingDetails)
            .FirstOrDefaultAsync(b => b.Id == bookingId);

        if (booking == null)
            return NotFound(new { success = false, message = "Không tìm thấy booking." });

        if (booking.UserId == null || booking.UserId.ToString() != userId)
            return Forbid();

        var payments = booking.Payments
            .Where(p => p.Status == PaymentStatuses.Success)
            .OrderByDescending(p => p.PaymentDate)
            .Select(p => new
            {
                p.Id,
                p.AmountPaid,
                p.PaymentMethod,
                p.PaymentType,
                p.TransactionCode,
                p.PaymentDate
            }).ToList();

        return Ok(new
        {
            success = true,
            data = new
            {
                bookingId = booking.Id,
                bookingCode = booking.BookingCode,
                status = booking.Status,
                totalEstimatedAmount = booking.TotalEstimatedAmount,
                depositRequired = booking.RequiredBookingDepositAmount,
                depositPaid = booking.DepositAmount ?? 0m,
                remaining = Math.Max(0m, booking.RequiredBookingDepositAmount - (booking.DepositAmount ?? 0m)),
                isFullyDeposited = (booking.DepositAmount ?? 0m) >= booking.RequiredBookingDepositAmount,
                payments
            }
        });
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
