using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using System.Net;

namespace HotelManagement.API.Services;

public interface IEmailService
{
    Task SendBookingConfirmationAsync(string toEmail, string guestName, string bookingCode, DateTime checkIn, DateTime checkOut, decimal totalAmount, string? webUrl = null);
    Task SendNewStaffAccountAsync(string toEmail, string fullName, string password, string roleName);
    Task SendGuestWelcomeAsync(string toEmail, string fullName);
    Task SendGuestAccountCreatedAsync(string toEmail, string fullName, string password);
    Task SendPasswordChangedAsync(string toEmail, string fullName);
    Task SendForgotPasswordResetAsync(string toEmail, string fullName, string newPassword);
    Task SendPasswordResetByAdminAsync(string toEmail, string fullName, string newPassword);
    Task<int> SendVoucherCampaignAsync(IEnumerable<VoucherEmailRecipient> recipients, VoucherEmailPayload payload);
}

public sealed record VoucherEmailRecipient(
    int UserId,
    string FullName,
    string Email);

public sealed record VoucherEmailPayload(
    string VoucherCode,
    string AudienceType,
    string DiscountType,
    decimal DiscountValue,
    decimal? MaxDiscountAmount,
    decimal? MinBookingValue,
    DateTime? ValidFrom,
    DateTime? ValidTo,
    string? RoomTypeName,
    string? RoomImageUrl,
    string? MembershipTierName,
    string? OccasionName,
    string? FrontendBaseUrl);

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;

    public EmailService(IConfiguration config)
    {
        _config = config;
    }

    public Task SendBookingConfirmationAsync(string toEmail, string guestName, string bookingCode, DateTime checkIn, DateTime checkOut, decimal totalAmount, string? webUrl = null)
    {
        var safeWebUrl = string.IsNullOrWhiteSpace(webUrl) ? null : WebUtility.HtmlEncode(webUrl.Trim());
        var websiteBlock = safeWebUrl == null
            ? string.Empty
            : $"""
                <div style="margin: 20px 0; padding: 16px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px;">
                    <p style="margin: 0 0 10px; color: #075985; font-weight: 600;">Bạn có thể xem lại booking và thông tin khách sạn tại website:</p>
                    <a href="{safeWebUrl}" style="display: inline-block; padding: 10px 16px; border-radius: 999px; background: #4f645b; color: #ffffff; text-decoration: none; font-weight: 700;">Mở website khách sạn</a>
                    <p style="margin: 10px 0 0; color: #6b7280; font-size: 12px;">Hoặc truy cập trực tiếp: {safeWebUrl}</p>
                </div>
                """;
        var subject = $"[Hotel] Xác nhận đặt phòng #{bookingCode}";
        var body = $"""
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #4f645b;">✅ Đặt phòng thành công!</h2>
                <p>Xin chào <strong>{WebUtility.HtmlEncode(guestName)}</strong>,</p>
                <p>Đặt phòng của bạn đã được xác nhận. Dưới đây là thông tin chi tiết:</p>

                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr style="background: #f9f8f3;">
                        <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600;">Mã đặt phòng</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">{WebUtility.HtmlEncode(bookingCode)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600;">Check-in</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">{checkIn:dd/MM/yyyy}</td>
                    </tr>
                    <tr style="background: #f9f8f3;">
                        <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600;">Check-out</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">{checkOut:dd/MM/yyyy}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600;">Tổng tiền dự kiến</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; color: #4f645b; font-weight: 700;">{totalAmount:N0} VNĐ</td>
                    </tr>
                </table>

                {websiteBlock}

                <p style="color: #6b7280; font-size: 13px;">Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ chúng tôi.</p>
                <p style="color: #6b7280; font-size: 13px;">Trân trọng,<br/><strong>Hotel Management Team</strong></p>
            </div>
            """;

        return SendAsync(toEmail, guestName, subject, body);
    }

    public Task SendNewStaffAccountAsync(string toEmail, string fullName, string password, string roleName)
    {
        var subject = "[Hotel] Tài khoản nhân viên của bạn đã được tạo";
        var body = $"""
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #4f645b;">👋 Chào mừng bạn đến với đội ngũ!</h2>
                <p>Xin chào <strong>{WebUtility.HtmlEncode(fullName)}</strong>,</p>
                <p>Tài khoản nhân viên của bạn đã được tạo thành công. Dưới đây là thông tin đăng nhập:</p>

                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr style="background: #f9f8f3;">
                        <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600;">Email đăng nhập</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">{WebUtility.HtmlEncode(toEmail)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600;">Mật khẩu tạm thời</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 700; color: #dc2626;">{WebUtility.HtmlEncode(password)}</td>
                    </tr>
                    <tr style="background: #f9f8f3;">
                        <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600;">Vai trò</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">{WebUtility.HtmlEncode(roleName)}</td>
                    </tr>
                </table>

                <p style="color: #dc2626; font-size: 13px;">⚠️ Vui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu.</p>
                <p style="color: #6b7280; font-size: 13px;">Trân trọng,<br/><strong>Hotel Management Team</strong></p>
            </div>
            """;

        return SendAsync(toEmail, fullName, subject, body);
    }

    public Task SendGuestWelcomeAsync(string toEmail, string fullName)
    {
        var subject = "[Hotel] Chào mừng bạn đến với hệ thống khách sạn";
        var body = $"""
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #4f645b;">Xin chào {WebUtility.HtmlEncode(fullName)}!</h2>
                <p>Tài khoản khách hàng của bạn đã được tạo thành công.</p>
                <p>Bạn có thể đăng nhập để theo dõi lịch sử đặt phòng, hạng thành viên và các ưu đãi hiện có.</p>
                <p style="color: #6b7280; font-size: 13px;">Trân trọng,<br/><strong>Hotel Management Team</strong></p>
            </div>
            """;

        return SendAsync(toEmail, fullName, subject, body);
    }

    public Task SendGuestAccountCreatedAsync(string toEmail, string fullName, string password)
    {
        var subject = "[Hotel] Tài khoản thành viên của bạn đã được tạo";
        var body = $"""
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #4f645b;">Tài khoản của bạn đã sẵn sàng</h2>
                <p>Xin chào <strong>{WebUtility.HtmlEncode(fullName)}</strong>,</p>
                <p>Tài khoản thành viên đã được tạo cho bạn sau khi làm thủ tục check-in. Bạn có thể đăng nhập bằng email này và mật khẩu tạm thời bên dưới:</p>

                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr style="background: #f9f8f3;">
                        <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600;">Email đăng nhập</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">{WebUtility.HtmlEncode(toEmail)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600;">Mật khẩu tạm thời</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 700; color: #15803d;">{WebUtility.HtmlEncode(password)}</td>
                    </tr>
                </table>

                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin: 16px 0;">
                    <p style="margin: 0; color: #92400e;">Vui lòng đăng nhập và đổi mật khẩu sau khi vào hệ thống.</p>
                </div>

                <p style="color: #6b7280; font-size: 13px;">Trân trọng,<br/><strong>Hotel Management Team</strong></p>
            </div>
            """;

        return SendAsync(toEmail, fullName, subject, body);
    }

    public Task SendPasswordChangedAsync(string toEmail, string fullName)
    {
        var subject = "[Hotel] Mật khẩu của bạn vừa được thay đổi";
        var body = $"""
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #4f645b;">🔐 Mật khẩu đã được thay đổi</h2>
                <p>Xin chào <strong>{WebUtility.HtmlEncode(fullName)}</strong>,</p>
                <p>Mật khẩu tài khoản của bạn vừa được thay đổi thành công vào lúc <strong>{DateTime.Now:HH:mm dd/MM/yyyy}</strong>.</p>

                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin: 16px 0;">
                    <p style="margin: 0; color: #92400e;">⚠️ Nếu bạn <strong>không thực hiện</strong> thay đổi này, vui lòng liên hệ quản trị viên ngay lập tức.</p>
                </div>

                <p style="color: #6b7280; font-size: 13px;">Trân trọng,<br/><strong>Hotel Management Team</strong></p>
            </div>
            """;

        return SendAsync(toEmail, fullName, subject, body);
    }

    public Task SendForgotPasswordResetAsync(string toEmail, string fullName, string newPassword)
    {
        var subject = "[Hotel] Mật khẩu mới cho tài khoản của bạn";
        var body = $"""
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #4f645b;">Mật khẩu mới của bạn đã sẵn sàng</h2>
                <p>Xin chào <strong>{WebUtility.HtmlEncode(fullName)}</strong>,</p>
                <p>Hệ thống đã xử lý yêu cầu quên mật khẩu của bạn. Đây là mật khẩu mới để bạn đăng nhập:</p>

                <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
                    <span style="font-size: 24px; font-weight: 700; letter-spacing: 0.1em; color: #15803d; font-family: monospace; padding: 4px 8px; background: #dcfce7; border-radius: 4px; user-select: all; cursor: copy;">{WebUtility.HtmlEncode(newPassword)}</span>
                </div>

                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin: 16px 0;">
                    <p style="margin: 0; color: #92400e;">Vui lòng đăng nhập bằng mật khẩu mới và đổi lại mật khẩu sau khi vào hệ thống.</p>
                </div>

                <p style="color: #6b7280; font-size: 13px;">Nếu bạn không thực hiện yêu cầu này, vui lòng liên hệ bộ phận hỗ trợ sớm nhất có thể.</p>
                <p style="color: #6b7280; font-size: 13px;">Trân trọng,<br/><strong>Hotel Management Team</strong></p>
            </div>
            """;

        return SendAsync(toEmail, fullName, subject, body);
    }

    public Task SendPasswordResetByAdminAsync(string toEmail, string fullName, string newPassword)
    {
        var subject = "[Hotel] Mật khẩu của bạn đã được thiết lập lại";
        var body = $"""
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #4f645b;">&#128274; Mật khẩu đã được thiết lập lại</h2>
                <p>Xin chào <strong>{WebUtility.HtmlEncode(fullName)}</strong>,</p>
                <p>Quản trị viên đã thiết lập lại mật khẩu tài khoản của bạn. Dưới đây là mật khẩu mới:</p>

                <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
                    <span style="font-size: 24px; font-weight: 700; letter-spacing: 0.1em; color: #15803d; font-family: monospace; padding: 4px 8px; background: #dcfce7; border-radius: 4px; user-select: all; cursor: copy;">{WebUtility.HtmlEncode(newPassword)}</span>
                </div>

                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin: 16px 0;">
                    <p style="margin: 0; color: #92400e;">&#9888;&#65039; Vui lòng đăng nhập và <strong>đổi mật khẩu ngay</strong> sau khi nhận được email này.</p>
                </div>

                <p style="color: #6b7280; font-size: 13px;">Nếu bạn không yêu cầu điều này, vui lòng liên hệ quản trị viên ngay lập tức.</p>
                <p style="color: #6b7280; font-size: 13px;">Trân trọng,<br/><strong>Hotel Management Team</strong></p>
            </div>
            """;

        return SendAsync(toEmail, fullName, subject, body);
    }

    public async Task<int> SendVoucherCampaignAsync(IEnumerable<VoucherEmailRecipient> recipients, VoucherEmailPayload payload)
    {
        var sentCount = 0;
        foreach (var recipient in recipients
            .Where(x => !string.IsNullOrWhiteSpace(x.Email))
            .GroupBy(x => x.Email.Trim().ToLowerInvariant())
            .Select(g => g.First()))
        {
            var subject = BuildVoucherSubject(payload);
            var body = BuildVoucherEmailBody(recipient.FullName, payload);
            await SendAsync(recipient.Email, recipient.FullName, subject, body);
            sentCount++;
        }

        return sentCount;
    }

    private static string BuildVoucherSubject(VoucherEmailPayload payload)
    {
        var headline = payload.AudienceType switch
        {
            "BIRTHDAY_MONTH" => "Ưu đãi sinh nhật dành cho bạn",
            "MEMBERSHIP" => $"Ưu đãi thành viên {payload.MembershipTierName ?? string.Empty}".Trim(),
            "HOLIDAY" => $"Ưu đãi {payload.OccasionName ?? "đặc biệt"}",
            "USER" => "Voucher ưu đãi dành riêng cho bạn",
            _ => "Voucher ưu đãi mới từ khách sạn"
        };

        return $"[Hotel] {headline} - {payload.VoucherCode}";
    }

    private static string BuildVoucherEmailBody(string fullName, VoucherEmailPayload payload)
    {
        var roomImageBlock = string.IsNullOrWhiteSpace(payload.RoomImageUrl)
            ? string.Empty
            : $"""
                <div style="margin: 0 0 18px;">
                    <img src="{WebUtility.HtmlEncode(payload.RoomImageUrl)}" alt="Room" style="display:block;width:100%;height:220px;object-fit:cover;border-radius:18px;" />
                </div>
                """;

        var audienceBadge = payload.AudienceType switch
        {
            "BIRTHDAY_MONTH" => "Sinh nhật",
            "MEMBERSHIP" => $"Thành viên {payload.MembershipTierName ?? string.Empty}".Trim(),
            "HOLIDAY" => payload.OccasionName ?? "Dịp đặc biệt",
            "USER" => "Ưu đãi riêng",
            _ => "Ưu đãi mới"
        };

        var discountText = payload.DiscountType == "PERCENT"
            ? $"{payload.DiscountValue:N0}%"
            : $"{payload.DiscountValue:N0} VNĐ";

        var maxDiscountText = payload.MaxDiscountAmount.HasValue
            ? $"{payload.MaxDiscountAmount.Value:N0} VNĐ"
            : "Không giới hạn";

        var minBookingText = payload.MinBookingValue.HasValue
            ? $"{payload.MinBookingValue.Value:N0} VNĐ"
            : "Không yêu cầu";

        var validFromText = payload.ValidFrom.HasValue ? payload.ValidFrom.Value.ToString("dd/MM/yyyy HH:mm") : "Ngay khi nhận";
        var validToText = payload.ValidTo.HasValue ? payload.ValidTo.Value.ToString("dd/MM/yyyy HH:mm") : "Cho đến khi hết lượt";
        var roomTypeText = string.IsNullOrWhiteSpace(payload.RoomTypeName) ? "Tất cả hạng phòng" : payload.RoomTypeName;

        var websiteBlock = string.IsNullOrWhiteSpace(payload.FrontendBaseUrl)
            ? string.Empty
            : $"""
                <div style="margin-top:20px;text-align:center;">
                    <a href="{WebUtility.HtmlEncode(payload.FrontendBaseUrl)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#4f645b;color:#ffffff;text-decoration:none;font-weight:700;">Đặt phòng ngay</a>
                </div>
                """;

        return $"""
            <div style="font-family:Arial,sans-serif;background:#f7f5ef;padding:24px;color:#1f2937;">
                <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;padding:24px;border:1px solid #ebe7dc;">
                    {roomImageBlock}
                    <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#eef6f1;color:#4f645b;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;">{WebUtility.HtmlEncode(audienceBadge)}</div>
                    <h2 style="margin:14px 0 8px;color:#18212b;font-size:28px;line-height:1.2;">Mã ưu đãi mới dành cho bạn</h2>
                    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">Xin chào <strong>{WebUtility.HtmlEncode(fullName)}</strong>, khách sạn vừa phát hành voucher mới. Bạn có thể dùng mã bên dưới để nhận ưu đãi cho lần đặt phòng tiếp theo.</p>

                    <div style="padding:18px;border-radius:20px;background:linear-gradient(135deg,#18212b 0%,#4f645b 100%);color:#ffffff;">
                        <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.78;">Mã voucher</div>
                        <div style="margin-top:8px;font-size:30px;font-weight:800;letter-spacing:.14em;">{WebUtility.HtmlEncode(payload.VoucherCode)}</div>
                        <div style="margin-top:12px;font-size:16px;">Ưu đãi: <strong>{discountText}</strong></div>
                    </div>

                    <table style="width:100%;border-collapse:separate;border-spacing:0 10px;margin:18px 0 6px;">
                        <tr>
                            <td style="width:42%;padding:12px 14px;background:#f9f8f3;border-radius:12px 0 0 12px;font-weight:700;">Giảm tối đa</td>
                            <td style="padding:12px 14px;background:#f9f8f3;border-radius:0 12px 12px 0;">{maxDiscountText}</td>
                        </tr>
                        <tr>
                            <td style="padding:12px 14px;background:#f9f8f3;border-radius:12px 0 0 12px;font-weight:700;">Đơn tối thiểu</td>
                            <td style="padding:12px 14px;background:#f9f8f3;border-radius:0 12px 12px 0;">{minBookingText}</td>
                        </tr>
                        <tr>
                            <td style="padding:12px 14px;background:#f9f8f3;border-radius:12px 0 0 12px;font-weight:700;">Áp dụng cho</td>
                            <td style="padding:12px 14px;background:#f9f8f3;border-radius:0 12px 12px 0;">{WebUtility.HtmlEncode(roomTypeText)}</td>
                        </tr>
                        <tr>
                            <td style="padding:12px 14px;background:#f9f8f3;border-radius:12px 0 0 12px;font-weight:700;">Hiệu lực từ</td>
                            <td style="padding:12px 14px;background:#f9f8f3;border-radius:0 12px 12px 0;">{validFromText}</td>
                        </tr>
                        <tr>
                            <td style="padding:12px 14px;background:#f9f8f3;border-radius:12px 0 0 12px;font-weight:700;">Hiệu lực đến</td>
                            <td style="padding:12px 14px;background:#f9f8f3;border-radius:0 12px 12px 0;">{validToText}</td>
                        </tr>
                    </table>

                    <div style="margin-top:18px;padding:16px 18px;border-radius:16px;background:#fff7ed;border:1px solid #fdba74;color:#9a3412;font-size:14px;line-height:1.7;">
                        Lưu ý: mỗi khách chỉ sử dụng theo giới hạn được cấu hình trên voucher. Vui lòng nhập chính xác mã khi đặt phòng.
                    </div>
                    {websiteBlock}
                    <p style="margin:18px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">Trân trọng,<br /><strong>Hotel Management Team</strong></p>
                </div>
            </div>
            """;
    }

    private async Task SendAsync(string toEmail, string toName, string subject, string htmlBody)
    {
        var smtpHost = _config["Email:SmtpHost"]!;
        var smtpPort = int.Parse(_config["Email:SmtpPort"]!);
        var senderEmail = _config["Email:SenderEmail"]!;
        var senderName = _config["Email:SenderName"]!;
        var password = _config["Email:Password"]!;

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(senderName, senderEmail));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = subject;
        message.Body = new TextPart("html") { Text = htmlBody };

        using var client = new SmtpClient();
        await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(senderEmail, password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}
