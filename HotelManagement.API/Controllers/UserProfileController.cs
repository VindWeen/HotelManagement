using System.Net.Http.Headers;
using System.Text.Json;
using HotelManagement.Core.Helpers;
using HotelManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserProfileController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public UserProfileController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    // ══════════════════════════════════════════════════════════════
    // GET /api/UserProfile/my-profile
    // [Authenticated — mọi role]
    // Bảng liên quan: Users, Memberships, Roles
    // Lấy id từ JWT claim, không nhận userId từ body.
    // Trả về profile kèm tên membership, loyalty_points.
    // ══════════════════════════════════════════════════════════════
    [HttpGet("my-profile")]
    public async Task<IActionResult> GetMyProfile()
    {
        var userId = JwtHelper.GetUserId(User);

        var profile = await _db.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .Include(u => u.Membership)
            .Where(u => u.Id == userId)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.Phone,
                u.DateOfBirth,
                u.Gender,
                u.Address,
                u.NationalId,
                u.AvatarUrl,
                u.LoyaltyPoints,
                u.LoyaltyPointsUsable,
                u.Status,
                u.IsActive,
                u.LastLoginAt,
                u.CreatedAt,
                u.UpdatedAt,
                RoleId = u.RoleId,
                RoleName = u.Role != null ? u.Role.Name : null,
                MembershipId = u.MembershipId,
                MembershipTier = u.Membership != null ? u.Membership.TierName : null,
                MembershipDiscount = u.Membership != null ? u.Membership.DiscountPercent : null,
                MembershipColor = u.Membership != null ? u.Membership.ColorHex : null
            })
            .FirstOrDefaultAsync();

        if (profile is null)
            return NotFound(new { message = "Không tìm thấy thông tin người dùng." });

        return Ok(profile);
    }

    // ══════════════════════════════════════════════════════════════
    // PUT /api/UserProfile/update-profile
    // [Authenticated — mọi role]
    // Bảng liên quan: Users
    // Chỉ cho sửa: full_name, phone, address, date_of_birth, gender.
    // Cập nhật updated_at. Không cho sửa email, role, is_active.
    // ══════════════════════════════════════════════════════════════
    [HttpPut("update-profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = JwtHelper.GetUserId(User);

        var user = await _db.Users.FindAsync(userId);
        if (user is null)
            return NotFound(new { message = "Không tìm thấy thông tin người dùng." });

        // Chỉ cập nhật các trường được phép
        user.FullName    = request.FullName?.Trim()    ?? user.FullName;
        user.Phone       = request.Phone?.Trim()       ?? user.Phone;
        user.Address     = request.Address?.Trim()     ?? user.Address;
        user.DateOfBirth = request.DateOfBirth          ?? user.DateOfBirth;
        user.Gender      = request.Gender?.Trim()      ?? user.Gender;
        user.UpdatedAt   = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new { message = "Cập nhật thông tin cá nhân thành công." });
    }

    // ══════════════════════════════════════════════════════════════
    // PUT /api/UserProfile/change-password
    // [Authenticated — mọi role]
    // Bảng liên quan: Users
    // Body: { oldPassword, newPassword }. BCrypt verify old → hash new.
    // Nếu oldPassword sai trả 400. Chống session hijacking.
    // ══════════════════════════════════════════════════════════════
    [HttpPut("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = JwtHelper.GetUserId(User);

        var user = await _db.Users.FindAsync(userId);
        if (user is null)
            return NotFound(new { message = "Không tìm thấy thông tin người dùng." });

        // Verify mật khẩu cũ
        if (!BCrypt.Net.BCrypt.Verify(request.OldPassword, user.PasswordHash))
            return BadRequest(new { message = "Mật khẩu cũ không chính xác." });

        // Hash mật khẩu mới
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt    = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new { message = "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." });
    }

    // ══════════════════════════════════════════════════════════════
    // POST /api/UserProfile/upload-avatar
    // [Authenticated — mọi role]
    // Bảng liên quan: Users
    // Upload IFormFile → Cloudinary (crop 500×500 face).
    // Xóa ảnh cũ trên Cloud (dùng cloudinary_public_id lưu ở đâu đó
    // hoặc trích từ URL). Lưu avatar_url mới.
    // ══════════════════════════════════════════════════════════════
    [HttpPost("upload-avatar")]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Vui lòng chọn file ảnh." });

        // Validate file type
        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp", "image/gif" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
            return BadRequest(new { message = "Chỉ chấp nhận file ảnh (JPEG, PNG, WebP, GIF)." });

        // Validate file size (max 5MB)
        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { message = "File ảnh không được vượt quá 5MB." });

        var userId = JwtHelper.GetUserId(User);

        var user = await _db.Users.FindAsync(userId);
        if (user is null)
            return NotFound(new { message = "Không tìm thấy thông tin người dùng." });

        // Cloudinary config
        var cloudName = _config["Cloudinary:CloudName"]!;
        var apiKey    = _config["Cloudinary:ApiKey"]!;
        var apiSecret = _config["Cloudinary:ApiSecret"]!;

        // Xóa ảnh cũ trên Cloudinary nếu có
        if (!string.IsNullOrEmpty(user.AvatarUrl))
        {
            var oldPublicId = ExtractPublicIdFromUrl(user.AvatarUrl);
            if (!string.IsNullOrEmpty(oldPublicId))
            {
                await DeleteFromCloudinary(cloudName, apiKey, apiSecret, oldPublicId);
            }
        }

        // Cấu hình Unsigned Upload
        // LƯU Ý CHO DEV: Bạn cần vào Cloudinary Dashboard > Settings > Upload > Add upload preset
        // - Name: "hotel_avatar_preset" (hoặc sửa chuỗi bên dưới)
        // - Signing Mode: Unsigned
        // - Thêm thư mục (Folder): "hotel_avatars" (tùy chọn)
        var uploadPreset = "hotel_avatar_preset"; 

        using var stream = file.OpenReadStream();
        using var httpClient = new HttpClient();

        var uploadUrl = $"https://api.cloudinary.com/v1_1/{cloudName}/image/upload";

        using var content = new MultipartFormDataContent();
        var fileContent = new StreamContent(stream);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(file.ContentType);
        content.Add(fileContent, "file", file.FileName);
        content.Add(new StringContent(uploadPreset), "upload_preset");

        var response = await httpClient.PostAsync(uploadUrl, content);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            return StatusCode(502, new
            {
                message = "Upload ảnh lên Cloudinary thất bại. Hãy chắc chắn bạn đã tạo Upload Preset 'Unsigned' trên Cloudinary Dashboard.",
                detail = responseBody
            });

        // Parse URL từ response
        using var doc = JsonDocument.Parse(responseBody);
        var secureUrl = doc.RootElement.GetProperty("secure_url").GetString()!;

        // Chèn transformation crop 500x500 face vào URL
        var avatarUrl = secureUrl.Replace("/image/upload/", "/image/upload/c_thumb,g_face,w_500,h_500/");

        // Lưu avatar_url mới
        user.AvatarUrl = avatarUrl;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message   = "Upload avatar thành công.",
            avatarUrl
        });
    }

    // ── Helper: Trích public_id từ Cloudinary URL ────────────────
    private static string? ExtractPublicIdFromUrl(string url)
    {
        try
        {
            var uri = new Uri(url);
            var path = uri.AbsolutePath;
            var uploadIndex = path.IndexOf("/upload/", StringComparison.Ordinal);
            if (uploadIndex < 0) return null;

            var afterUpload = path[(uploadIndex + 8)..];

            var segments = afterUpload.Split('/');
            var startIndex = 0;
            for (var i = 0; i < segments.Length; i++)
            {
                if (segments[i].Length > 1 && segments[i][0] == 'v' &&
                    long.TryParse(segments[i][1..], out _))
                {
                    startIndex = i + 1;
                    break;
                }
            }

            if (startIndex >= segments.Length) return null;

            var publicIdWithExt = string.Join('/', segments[startIndex..]);
            var dotIndex = publicIdWithExt.LastIndexOf('.');
            return dotIndex > 0 ? publicIdWithExt[..dotIndex] : publicIdWithExt;
        }
        catch
        {
            return null;
        }
    }

    // ── Helper: Xóa ảnh cũ trên Cloudinary ──────────────────────
    // LƯU Ý: Xóa ảnh qua REST API yêu cầu Server Signature.
    // Nếu bạn đang dùng API key để sign thủ công mà lỗi, tốt nhất phần xóa ảnh 
    // nên được thực hiện thông qua SDK (CloudinaryDotNet).
    // Ở đây ta dùng signature cơ bản để thử xóa.
    private static async Task DeleteFromCloudinary(
        string cloudName, string apiKey, string apiSecret, string publicId)
    {
        try
        {
            using var httpClient = new HttpClient();
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
            
            // Sign destroy
            var stringToSign = $"public_id={publicId}&timestamp={timestamp}{apiSecret}";
            using var sha1 = System.Security.Cryptography.SHA1.Create();
            var hashBytes = sha1.ComputeHash(System.Text.Encoding.UTF8.GetBytes(stringToSign));
            var signature = Convert.ToHexStringLower(hashBytes);

            var destroyUrl = $"https://api.cloudinary.com/v1_1/{cloudName}/image/destroy";

            var formContent = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("public_id", publicId),
                new KeyValuePair<string, string>("api_key", apiKey),
                new KeyValuePair<string, string>("timestamp", timestamp),
                new KeyValuePair<string, string>("signature", signature)
            });

            await httpClient.PostAsync(destroyUrl, formContent);
        }
        catch
        {
            // Không block flow nếu xóa ảnh cũ thất bại
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Request DTOs
// ══════════════════════════════════════════════════════════════════

public record UpdateProfileRequest(
    string? FullName,
    string? Phone,
    string? Address,
    DateOnly? DateOfBirth,
    string? Gender
);

public record ChangePasswordRequest(
    string OldPassword,
    string NewPassword
);
