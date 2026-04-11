using HotelManagement.Core.Authorization;
using HotelManagement.Core.Entities;
using HotelManagement.Core.Helpers;
using HotelManagement.Core.Models.Enums;
using HotelManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelManagement.API.Services;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AttractionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IActivityLogService _activityLog;
    private readonly Cloudinary _cloudinary;

    public AttractionsController(AppDbContext db, IActivityLogService activityLog, Cloudinary cloudinary)
    {
        _db = db;
        _activityLog = activityLog;
        _cloudinary = cloudinary;
    }

    // GET /api/Attractions
    // Public â€” is_active = 1.
    // Kèm latitude, longitude, category để FE render Google Maps marker.
    // Sắp xếp theo distance_km tăng dần.
    // Filter tùy chọn theo category.
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] string? category, [FromQuery] bool includeInactive = false)
    {
        var isAdmin = User.Identity?.IsAuthenticated == true
                   && User.HasClaim("permission", PermissionCodes.ManageContent);

        var query = _db.Attractions
            .AsNoTracking()
            .AsQueryable();

        if (!(isAdmin && includeInactive))
            query = query.Where(a => a.IsActive);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(a => a.Category == category.Trim());

        var items = await query
            .OrderBy(a => a.DistanceKm == null)   // null xuống cuối
            .ThenBy(a => a.DistanceKm)
            .ThenBy(a => a.Name)
            .Select(a => new
            {
                a.Id,
                a.Name,
                a.Category,
                a.Address,
                a.Latitude,
                a.Longitude,
                a.DistanceKm,
                a.ImageUrl,
                a.IsActive
            })
            .ToListAsync();

        return Ok(new { data = items, total = items.Count });
    }

    // GET /api/Attractions/{id}
    // Public â€” chi tiết 1 địa điểm.
    // Trả đầy đủ: tọa độ GPS, địa chỉ, mô tả, ảnh, map embed link.
    // FE dùng khi click marker trên Google Maps.
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id)
    {
        var attraction = await _db.Attractions
            .AsNoTracking()
            .Where(a => a.Id == id && a.IsActive)
            .Select(a => new
            {
                a.Id,
                a.Name,
                a.Category,
                a.Address,
                a.Latitude,
                a.Longitude,
                a.DistanceKm,
                a.Description,
                a.ImageUrl,
                a.MapEmbedLink
            })
            .FirstOrDefaultAsync();

        if (attraction is null)
            return NotFound(new { Notification = new Notification
            {
                Title = "Không tìm thấy địa điểm",
                Message = $"Không tìm thấy địa điểm #{id}.",
                Type = NotificationType.Error,
                Action = NotificationAction.Other
            }});

        return Ok(attraction);
    }

    // POST /api/Attractions
    // [MANAGE_CONTENT]
    // Body: { name, category, address, latitude, longitude,
    //         distanceKm, description, imageUrl, mapEmbedLink }
    [HttpPost]
    [RequirePermission(PermissionCodes.ManageContent)]
    public async Task<IActionResult> Create([FromBody] CreateAttractionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Tên địa điểm không được để trống." });

        if (!IsValidCategory(request.Category))
            return BadRequest(new
            {
                message = "Category không hợp lệ. Dùng: Di tích | Ẩm thực | Giải trí | Thiên nhiên."
            });

        if (request.Latitude is < -90 or > 90)
            return BadRequest(new { message = "Latitude phải nằm trong khoảng -90 đến 90." });

        if (request.Longitude is < -180 or > 180)
            return BadRequest(new { message = "Longitude phải nằm trong khoảng -180 đến 180." });

        if (request.DistanceKm is < 0)
            return BadRequest(new { message = "DistanceKm không được âm." });

        var attraction = new Attraction
        {
            Name         = request.Name.Trim(),
            Category     = request.Category?.Trim(),
            Address      = request.Address?.Trim(),
            Latitude     = request.Latitude,
            Longitude    = request.Longitude,
            DistanceKm   = request.DistanceKm,
            Description  = request.Description?.Trim(),
            ImageUrl     = request.ImageUrl?.Trim(),
            CloudinaryPublicId = request.CloudinaryPublicId?.Trim(),
            MapEmbedLink = NormalizeMapEmbedLink(request.MapEmbedLink),
            IsActive     = true
        };

        _db.Attractions.Add(attraction);
        await _db.SaveChangesAsync();

        await _db.SaveChangesAsync();

        // Ghi Activity Log
        await _activityLog.LogAsync(
            actionCode: "CREATE_ATTRACTION",
            actionLabel: "Tạo địa điểm",
            message: $"Đã thêm địa điểm tham quan mới: \"{attraction.Name}\" ({attraction.Category}).",
            entityType: "Attraction",
            entityId: attraction.Id,
            entityLabel: attraction.Name,
            severity: "Success",
            userId: JwtHelper.GetUserId(User),
            roleName: User.FindFirst("role")?.Value
        );

        // Khôi phục AuditLog
        _db.AuditLogs.Add(new AuditLog
        {
            UserId    = JwtHelper.GetUserId(User),
            Action    = "CREATE_ATTRACTION",
            TableName = "Attractions",
            RecordId  = attraction.Id,
            OldValue  = null,
            NewValue  = $"{{\"name\": \"{attraction.Name}\", \"category\": \"{attraction.Category}\"}}",
            UserAgent = Request.Headers["User-Agent"].ToString(),
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById),
            new { id = attraction.Id },
            new
            {
                message = "Tạo địa điểm thành công.",
                attraction.Id,
                attraction.Name,
                attraction.Category,
                attraction.DistanceKm
            });
    }

    // PUT /api/Attractions/{id}
    // [MANAGE_CONTENT]
    // Patch-style: chỉ cập nhật field được gửi lên (không null).
    [HttpPut("{id:int}")]
    [RequirePermission(PermissionCodes.ManageContent)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAttractionRequest request)
    {
        var attraction = await _db.Attractions
            .FirstOrDefaultAsync(a => a.Id == id && a.IsActive);

        if (attraction is null)
            return NotFound(new { message = $"Không tìm thấy địa điểm #{id}." });

        // Validate trước khi cập nhật
        if (request.Category is not null && !IsValidCategory(request.Category))
            return BadRequest(new
            {
                message = "Category không hợp lệ. Dùng: Di tích | Ẩm thực | Giải trí | Thiên nhiên."
            });

        if (request.Latitude is < -90 or > 90)
            return BadRequest(new { message = "Latitude phải nằm trong khoảng -90 đến 90." });

        if (request.Longitude is < -180 or > 180)
            return BadRequest(new { message = "Longitude phải nằm trong khoảng -180 đến 180." });

        if (request.DistanceKm is < 0)
            return BadRequest(new { message = "DistanceKm không được âm." });

        // Chỉ cập nhật field được gửi lên
        if (!string.IsNullOrWhiteSpace(request.Name))
            attraction.Name = request.Name.Trim();

        if (request.Category is not null)
            attraction.Category = request.Category.Trim();

        if (request.Address is not null)
            attraction.Address = request.Address.Trim();

        if (request.Latitude.HasValue)
            attraction.Latitude = request.Latitude.Value;

        if (request.Longitude.HasValue)
            attraction.Longitude = request.Longitude.Value;

        if (request.DistanceKm.HasValue)
            attraction.DistanceKm = request.DistanceKm.Value;

        if (request.Description is not null)
            attraction.Description = request.Description.Trim();

        if (request.RemoveImage == true)
        {
            await DeleteCloudinaryImageAsync(attraction.CloudinaryPublicId);
            attraction.ImageUrl = null;
            attraction.CloudinaryPublicId = null;
        }
        else if (request.ImageUrl is not null)
        {
            if (!string.IsNullOrWhiteSpace(attraction.CloudinaryPublicId)
                && attraction.CloudinaryPublicId != request.CloudinaryPublicId)
            {
                await DeleteCloudinaryImageAsync(attraction.CloudinaryPublicId);
            }

            attraction.ImageUrl = request.ImageUrl.Trim();
            attraction.CloudinaryPublicId = request.CloudinaryPublicId?.Trim();
        }

        if (request.MapEmbedLink is not null)
            attraction.MapEmbedLink = NormalizeMapEmbedLink(request.MapEmbedLink);

        var currentUserId = JwtHelper.GetUserId(User);
        // Ghi Activity Log
        await _activityLog.LogAsync(
            actionCode: "UPDATE_ATTRACTION",
            actionLabel: "Cập nhật địa điểm",
            message: $"Thông tin địa điểm \"{attraction.Name}\" đã được chỉnh sửa.",
            entityType: "Attraction",
            entityId: id,
            entityLabel: attraction.Name,
            severity: "Info",
            userId: currentUserId,
            roleName: User.FindFirst("role")?.Value
        );

        // Khôi phục AuditLog
        _db.AuditLogs.Add(new AuditLog
        {
            UserId    = currentUserId,
            Action    = "UPDATE_ATTRACTION",
            TableName = "Attractions",
            RecordId  = id,
            OldValue  = null,
            NewValue  = $"{{\"name\": \"{attraction.Name}\", \"category\": \"{attraction.Category}\"}}",
            UserAgent = Request.Headers["User-Agent"].ToString(),
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Cập nhật địa điểm thành công.",
            attraction.Id,
            attraction.Name,
            attraction.Category,
            attraction.DistanceKm
        });
    }

    // POST /api/Attractions/upload-image
    [HttpPost("upload-image")]
    [RequirePermission(PermissionCodes.ManageContent)]
    public async Task<IActionResult> UploadImage(IFormFile? file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Vui lòng chọn ảnh địa điểm cần upload." });

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp", "image/gif" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
            return BadRequest(new { message = "Chỉ chấp nhận ảnh định dạng JPEG, PNG, WebP hoặc GIF." });

        await using var stream = file.OpenReadStream();
        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(file.FileName, stream),
            Folder = "hotel/attractions",
            PublicId = $"attraction_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}",
            Transformation = new Transformation().Quality("auto").FetchFormat("auto")
        };

        var uploadResult = await _cloudinary.UploadAsync(uploadParams);

        if (uploadResult.Error is not null)
            return StatusCode(502, new { message = $"Upload thất bại: {uploadResult.Error.Message}" });

        return Ok(new
        {
            message = "Upload ảnh địa điểm thành công.",
            url = uploadResult.SecureUrl.ToString(),
            publicId = uploadResult.PublicId
        });
    }

    // DELETE /api/Attractions/{id}
    // [MANAGE_CONTENT]  Soft Delete: is_active = 0.
    // Marker tự biến mất khỏi Google Maps vì GET chỉ trả is_active = 1.
    [HttpDelete("{id:int}")]
    [RequirePermission(PermissionCodes.ManageContent)]
    public async Task<IActionResult> Delete(int id)
    {
        var attraction = await _db.Attractions
            .FirstOrDefaultAsync(a => a.Id == id && a.IsActive);

        if (attraction is null)
            return NotFound(new { message = $"Không tìm thấy địa điểm #{id}." });

        attraction.IsActive = false;

        var currentUserId = JwtHelper.GetUserId(User);
        // Ghi Activity Log
        await _activityLog.LogAsync(
            actionCode: "DELETE_ATTRACTION",
            actionLabel: "Xóa địa điểm",
            message: $"{(User.FindFirst("full_name")?.Value ?? "Hệ thống")} đã xóa địa điểm \"{attraction.Name}\".",
            entityType: "Attraction",
            entityId: id,
            entityLabel: attraction.Name,
            severity: "Warning",
            userId: currentUserId,
            roleName: User.FindFirst("role")?.Value
        );

        // Khôi phục AuditLog
        _db.AuditLogs.Add(new AuditLog
        {
            UserId    = currentUserId,
            Action    = "DELETE_ATTRACTION",
            TableName = "Attractions",
            RecordId  = id,
            OldValue  = $"{{\"isActive\": true, \"name\": \"{attraction.Name}\"}}",
            NewValue  = "{\"isActive\": false}",
            UserAgent = Request.Headers["User-Agent"].ToString(),
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        await _db.SaveChangesAsync();

        return Ok(new { message = $"Đã xóa địa điểm '{attraction.Name}' thành công." });
    }

    // PATCH /api/Attractions/{id}/toggle-active  [MANAGE_CONTENT]
    // Bật/tắt địa điểm: is_active = 1 â†” 0
    [HttpPatch("{id:int}/toggle-active")]
    [RequirePermission(PermissionCodes.ManageContent)]
    public async Task<IActionResult> ToggleActive(int id)
    {
        var attraction = await _db.Attractions.FindAsync(id);
 
        if (attraction is null)
            return NotFound(new { message = $"Không tìm thấy địa điểm #{id}." });
 
        var oldActive = attraction.IsActive;
        attraction.IsActive = !attraction.IsActive;

        var currentUserId = JwtHelper.GetUserId(User);
        _db.AuditLogs.Add(new AuditLog
        {
            UserId    = currentUserId,
            Action    = "TOGGLE_ATTRACTION",
            TableName = "Attractions",
            RecordId  = id,
            OldValue  = $"{{\"isActive\": {oldActive.ToString().ToLower()}}}",
            NewValue  = $"{{\"isActive\": {attraction.IsActive.ToString().ToLower()}}}",
            UserAgent = Request.Headers["User-Agent"].ToString(),
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
 
        var action = attraction.IsActive ? "kích hoạt" : "vô hiệu hóa";
        return Ok(new
        {
            message  = $"Đã {action} địa điểm '{attraction.Name}'.",
            attraction.Id,
            attraction.Name,
            attraction.IsActive
        });
    }

    /// <summary>
    /// Kiểm tra category hợp lệ theo 4 loại định nghĩa sẵn trong DB.
    /// null / empty được phép (field nullable).
    /// </summary>
    private static bool IsValidCategory(string? category)
    {
        if (string.IsNullOrWhiteSpace(category)) return true;

        var allowed = new[] { "Di tích", "Ẩm thực", "Giải trí", "Thiên nhiên" };
        return allowed.Contains(category.Trim());
    }

    private static string? NormalizeMapEmbedLink(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;

        var trimmed = value.Trim();
        var srcMatch = System.Text.RegularExpressions.Regex.Match(
            trimmed,
            "src\\s*=\\s*[\"']([^\"']+)[\"']",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);

        return srcMatch.Success ? srcMatch.Groups[1].Value.Trim() : trimmed;
    }

    private async Task DeleteCloudinaryImageAsync(string? publicId)
    {
        if (string.IsNullOrWhiteSpace(publicId)) return;

        var deleteParams = new DeletionParams(publicId)
        {
            ResourceType = ResourceType.Image
        };

        await _cloudinary.DestroyAsync(deleteParams);
    }
}

// REQUEST RECORDS

/// <summary>Request body cho POST /api/Attractions</summary>
public record CreateAttractionRequest(
    string   Name,
    string?  Category,       // Di tích | Ẩm thực | Giải trí | Thiên nhiên
    string?  Address,
    decimal? Latitude,
    decimal? Longitude,
    decimal? DistanceKm,
    string?  Description,
    string?  ImageUrl,
    string?  CloudinaryPublicId,
    string?  MapEmbedLink
);

/// <summary>
/// Request body cho PUT /api/Attractions/{id}.
/// Tất cả field nullable — chỉ cập nhật field được gửi lên.
/// </summary>
public record UpdateAttractionRequest(
    string?  Name,
    string?  Category,
    string?  Address,
    decimal? Latitude,
    decimal? Longitude,
    decimal? DistanceKm,
    string?  Description,
    string?  ImageUrl,
    string?  CloudinaryPublicId,
    bool?    RemoveImage,
    string?  MapEmbedLink
);

