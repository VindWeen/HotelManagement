using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace HotelManagement.API.Services;

public class MomoCreatePaymentRequest
{
    public string PartnerCode { get; init; } = "";
    public string AccessKey { get; init; } = "";
    public string RequestId { get; init; } = "";
    public long Amount { get; init; }
    public string OrderId { get; init; } = "";
    public string OrderInfo { get; init; } = "";
    public string RedirectUrl { get; init; } = "";
    public string IpnUrl { get; init; } = "";
    public string RequestType { get; init; } = "captureWallet";
    public string ExtraData { get; init; } = "";
    public int Lang { get; init; } = 0;
    public string Signature { get; init; } = "";
}

public class MomoPaymentResult
{
    public bool Success { get; init; }
    public string? PayUrl { get; init; }
    public string? QrCodeUrl { get; init; }
    public string? OrderId { get; init; }
    public string? RequestId { get; init; }
    public string? Message { get; init; }
    public int ResultCode { get; init; }
}

public interface IMomoService
{
    Task<MomoPaymentResult> CreatePaymentAsync(int bookingId, decimal amount, string orderInfo);
    bool VerifySignature(IQueryCollection query, string rawSignature);
    bool VerifyIpnSignature(Dictionary<string, string> fields, string receivedSignature);
}

public class MomoService : IMomoService
{
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<MomoService> _logger;

    private string PartnerCode => _configuration["MoMo:PartnerCode"] ?? "MOMO";
    private string AccessKey => _configuration["MoMo:AccessKey"] ?? "";
    private string SecretKey => _configuration["MoMo:SecretKey"] ?? "";
    private string Endpoint => _configuration["MoMo:Endpoint"] ?? "https://test-payment.momo.vn/v2/gateway/api/create";
    private string ReturnUrl => _configuration["MoMo:ReturnUrl"] ?? "http://localhost:5173/guest/payment/result";
    private string IpnUrl => _configuration["MoMo:IpnUrl"] ?? "http://localhost:5279/api/Payments/momo/ipn";

    public MomoService(IConfiguration configuration, IHttpClientFactory httpClientFactory, ILogger<MomoService> logger)
    {
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<MomoPaymentResult> CreatePaymentAsync(int bookingId, decimal amount, string orderInfo)
    {
        var orderId = $"BOOKING_{bookingId}_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        var requestId = Guid.NewGuid().ToString("N");
        var amountLong = (long)Math.Round(amount);

        var rawSignature = $"accessKey={AccessKey}" +
                           $"&amount={amountLong}" +
                           $"&extraData=" +
                           $"&ipnUrl={IpnUrl}" +
                           $"&orderId={orderId}" +
                           $"&orderInfo={orderInfo}" +
                           $"&partnerCode={PartnerCode}" +
                           $"&redirectUrl={ReturnUrl}" +
                           $"&requestId={requestId}" +
                           $"&requestType=captureWallet";

        var signature = ComputeHmacSha256(rawSignature, SecretKey);

        var payload = new
        {
            partnerCode = PartnerCode,
            accessKey = AccessKey,
            requestId,
            amount = amountLong,
            orderId,
            orderInfo,
            redirectUrl = ReturnUrl,
            ipnUrl = IpnUrl,
            requestType = "captureWallet",
            extraData = "",
            lang = "en",
            signature
        };

        try
        {
            var client = _httpClientFactory.CreateClient();
            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PostAsync(Endpoint, content);
            var responseBody = await response.Content.ReadAsStringAsync();

            _logger.LogInformation("[MoMo] Response: {Body}", responseBody);

            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;

            var resultCode = root.TryGetProperty("resultCode", out var rcProp) ? rcProp.GetInt32() : -1;
            var message = root.TryGetProperty("message", out var msgProp) ? msgProp.GetString() : "Unknown";
            var payUrl = root.TryGetProperty("payUrl", out var puProp) ? puProp.GetString() : null;
            var qrCodeUrl = root.TryGetProperty("qrCodeUrl", out var qrProp) ? qrProp.GetString() : null;

            return new MomoPaymentResult
            {
                Success = resultCode == 0,
                PayUrl = payUrl,
                QrCodeUrl = qrCodeUrl,
                OrderId = orderId,
                RequestId = requestId,
                Message = message,
                ResultCode = resultCode
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[MoMo] Error creating payment for booking #{BookingId}", bookingId);
            return new MomoPaymentResult
            {
                Success = false,
                Message = ex.Message,
                ResultCode = -1
            };
        }
    }

    public bool VerifyIpnSignature(Dictionary<string, string> fields, string receivedSignature)
    {
        var rawSignature = $"accessKey={AccessKey}" +
                           $"&amount={fields.GetValueOrDefault("amount", "")}" +
                           $"&extraData={fields.GetValueOrDefault("extraData", "")}" +
                           $"&message={fields.GetValueOrDefault("message", "")}" +
                           $"&orderId={fields.GetValueOrDefault("orderId", "")}" +
                           $"&orderInfo={fields.GetValueOrDefault("orderInfo", "")}" +
                           $"&orderType={fields.GetValueOrDefault("orderType", "")}" +
                           $"&partnerCode={fields.GetValueOrDefault("partnerCode", "")}" +
                           $"&payType={fields.GetValueOrDefault("payType", "")}" +
                           $"&requestId={fields.GetValueOrDefault("requestId", "")}" +
                           $"&responseTime={fields.GetValueOrDefault("responseTime", "")}" +
                           $"&resultCode={fields.GetValueOrDefault("resultCode", "")}" +
                           $"&transId={fields.GetValueOrDefault("transId", "")}";

        var computed = ComputeHmacSha256(rawSignature, SecretKey);
        return string.Equals(computed, receivedSignature, StringComparison.OrdinalIgnoreCase);
    }

    public bool VerifySignature(IQueryCollection query, string rawSignature)
    {
        var receivedSignature = query["signature"].ToString();
        var computed = ComputeHmacSha256(rawSignature, SecretKey);
        return string.Equals(computed, receivedSignature, StringComparison.OrdinalIgnoreCase);
    }

    private static string ComputeHmacSha256(string data, string key)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
    }
}
