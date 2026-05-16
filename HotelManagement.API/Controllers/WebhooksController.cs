using HotelManagement.API.Services;
using HotelManagement.Core.Constants;
using HotelManagement.Core.Entities;
using HotelManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WebhooksController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IInvoiceService _invoiceService;
    private readonly IAuditTrailService _auditTrail;

    public WebhooksController(AppDbContext db, IInvoiceService invoiceService, IAuditTrailService auditTrail)
    {
        _db = db;
        _invoiceService = invoiceService;
        _auditTrail = auditTrail;
    }

    [AllowAnonymous]
    [HttpPost("sepay")]
    public async Task<IActionResult> SePayWebhook([FromBody] JsonElement payload)
    {
        try
        {
            string jsonStr = payload.GetRawText();
            string? receivedOrderCode = null;
            decimal amount = 0;
            string? transId = null;
            bool isSuccess = false;

            // Attempt to parse SePay Payment Gateway format
            if (payload.TryGetProperty("payment_status", out var statusProp))
            {
                isSuccess = (statusProp.GetString() == "SUCCESS");
                if (payload.TryGetProperty("order_invoice_number", out var orderNoProp))
                    receivedOrderCode = orderNoProp.ValueKind == JsonValueKind.Null ? null : orderNoProp.ToString();
                if (payload.TryGetProperty("order_amount", out var amountProp))
                    amount = amountProp.GetDecimal();
                if (payload.TryGetProperty("transaction_code", out var transProp))
                    transId = transProp.ValueKind == JsonValueKind.Null ? null : transProp.ToString();
            }
            // Fallback to SePay Bank Webhook format
            else if (payload.TryGetProperty("content", out var contentProp))
            {
                if (payload.TryGetProperty("code", out var codeProp))
                    receivedOrderCode = codeProp.ValueKind == JsonValueKind.Null ? null : codeProp.ToString();

                if (string.IsNullOrEmpty(receivedOrderCode))
                {
                    string content = contentProp.GetString() ?? "";
                    var match = System.Text.RegularExpressions.Regex.Match(content, @"booking (\d+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    if (match.Success)
                    {
                        receivedOrderCode = match.Groups[1].Value;
                    }
                }
                isSuccess = true;
                if (payload.TryGetProperty("transferAmount", out var transferProp))
                    amount = transferProp.GetDecimal();
                else if (payload.TryGetProperty("amountIn", out var amountInProp))
                    amount = amountInProp.GetDecimal();
                    
                if (payload.TryGetProperty("referenceCode", out var refProp))
                    transId = refProp.ValueKind == JsonValueKind.Null ? null : refProp.ToString();
                else if (payload.TryGetProperty("referenceNumber", out var refNumProp))
                    transId = refNumProp.ValueKind == JsonValueKind.Null ? null : refNumProp.ToString();
            }

            if (!isSuccess || string.IsNullOrEmpty(receivedOrderCode) || amount <= 0)
            {
                await _auditTrail.WriteAsync(_db, null, Request, new AuditTrailEntry
                {
                    ActionCode = "SEPAY_WEBHOOK_UNHANDLED",
                    ActionLabel = "SePay Webhook Unhandled",
                    Message = "Webhook payload received but not processed (not success, missing code, or amount <= 0).",
                    Severity = "Warning",
                    TableName = "Payments",
                    NewValue = jsonStr
                });
                return Ok(new { success = true, message = "Webhook received but ignored." });
            }

            bool isIdParsed = int.TryParse(receivedOrderCode, out int parsedId);
            var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.BookingCode == receivedOrderCode || (isIdParsed && b.Id == parsedId));
            if (booking == null)
            {
                await _auditTrail.WriteAsync(_db, null, Request, new AuditTrailEntry
                {
                    ActionCode = "SEPAY_WEBHOOK_BOOKING_NOT_FOUND",
                    ActionLabel = "SePay Webhook Booking Not Found",
                    Message = $"Booking {receivedOrderCode} not found for webhook.",
                    Severity = "Error",
                    TableName = "Payments",
                    NewValue = jsonStr
                });
                return Ok(new { success = true, message = "Booking not found." });
            }

            // Check if this transaction code already exists to prevent duplicate IPN processing
            if (!string.IsNullOrEmpty(transId))
            {
                var exists = await _db.Payments.AnyAsync(p => p.BookingId == booking.Id && p.TransactionCode == transId && p.PaymentMethod == "SePay");
                if (exists)
                {
                    return Ok(new { success = true, message = "Transaction already processed." });
                }
            }

            var payment = new Payment
            {
                BookingId = booking.Id,
                PaymentType = PaymentTypes.BookingDeposit,
                PaymentMethod = "SePay",
                AmountPaid = amount,
                TransactionCode = transId ?? $"SEPAY_{DateTime.UtcNow.Ticks}",
                Status = PaymentStatuses.Success,
                PaymentDate = DateTime.UtcNow,
                Note = $"SePay Webhook - Order: {receivedOrderCode}"
            };

            _db.Payments.Add(payment);

            var totalPaid = await _db.Payments
                .Where(p => p.BookingId == booking.Id && p.Status == PaymentStatuses.Success)
                .SumAsync(p => (decimal?)(p.PaymentType == PaymentTypes.Refund ? -p.AmountPaid : p.AmountPaid)) ?? 0;

            totalPaid += amount;
            booking.DepositAmount = Math.Max(0m, totalPaid);

            if (booking.Status == BookingStatuses.Pending &&
                (booking.DepositAmount ?? 0m) >= booking.RequiredBookingDepositAmount)
            {
                booking.Status = BookingStatuses.Confirmed;
            }

            await _db.SaveChangesAsync();
            await _invoiceService.CreateFromBookingAsync(booking.Id);

            await _auditTrail.WriteAsync(_db, null, Request, new AuditTrailEntry
            {
                ActionCode = "SEPAY_WEBHOOK_SUCCESS",
                ActionLabel = "Thanh toán SePay thành công",
                Message = $"Thanh toán SePay thành công cho booking #{booking.Id} ({receivedOrderCode}). Số tiền: {amount:N0}d. TransId: {transId}.",
                EntityType = "Payment",
                EntityId = booking.Id,
                EntityLabel = booking.BookingCode,
                Severity = "Success",
                TableName = "Payments",
                NewValue = $"{{\"bookingId\":{booking.Id},\"amount\":{amount},\"transId\":\"{transId}\",\"newStatus\":\"{booking.Status}\"}}"
            });

            return Ok(new { success = true, message = "Webhook processed successfully." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }
}
