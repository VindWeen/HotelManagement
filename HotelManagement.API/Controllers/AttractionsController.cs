using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using HotelManagement.API.Configuration;
using HotelManagement.API.Services;
using HotelManagement.Core.Authorization;
using HotelManagement.Core.Entities;
using HotelManagement.Core.Helpers;
using HotelManagement.Core.Models.Enums;
using HotelManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AttractionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IActivityLogService _activityLog;
    private readonly Cloudinary _cloudinary;
    private readonly IAuditTrailService _auditTrail;
    private readonly HotelLocationOptions _hotelLocation;

    public AttractionsController(
        AppDbContext db,
        IActivityLogService activityLog,
        Cloudinary cloudinary,
        IAuditTrailService auditTrail,
        IOptions<HotelLocationOptions> hotelLocationOptions)
    {
        _db = db;
        _activityLog = activityLog;
        _cloudinary = cloudinary;
        _auditTrail = auditTrail;
        _hotelLocation = hotelLocationOptions.Value;
    }

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
            .OrderBy(a => a.DistanceKm == null)
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
                a.CloudinaryPublicId,
                a.MapEmbedLink
            })
            .FirstOrDefaultAsync();

        if (attraction is null)
        {
            return NotFound(new
            {
                Notification = new Notification
                {
                    Title = "Khong tim thay dia diem",
                    Message = $"Khong tim thay dia diem #{id}.",
                    Type = NotificationType.Error,
                    Action = NotificationAction.Other
                }
            });
        }

        return Ok(attraction);
    }

    [HttpPost]
    [RequirePermission(PermissionCodes.ManageContent)]
    public async Task<IActionResult> Create([FromBody] CreateAttractionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Ten dia diem khong duoc de trong." });

        if (!IsValidCategory(request.Category))
            return BadRequest(new { message = "Category khong hop le. Dung: Di tich | Am thuc | Giai tri | Thien nhien." });

        if (request.Latitude is < -90 or > 90)
            return BadRequest(new { message = "Latitude phai nam trong khoang -90 den 90." });

        if (request.Longitude is < -180 or > 180)
            return BadRequest(new { message = "Longitude phai nam trong khoang -180 den 180." });

        if (HasIncompleteCoordinates(request.Latitude, request.Longitude))
            return BadRequest(new { message = "Can nhap day du ca latitude va longitude de tinh khoang cach." });

        var attraction = new Attraction
        {
            Name = request.Name.Trim(),
            Category = request.Category?.Trim(),
            Address = request.Address?.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            DistanceKm = CalculateDistanceKm(request.Latitude, request.Longitude),
            Description = request.Description?.Trim(),
            ImageUrl = request.ImageUrl?.Trim(),
            CloudinaryPublicId = request.CloudinaryPublicId?.Trim(),
            MapEmbedLink = NormalizeMapEmbedLink(request.MapEmbedLink),
            IsActive = true
        };

        _db.Attractions.Add(attraction);
        await _db.SaveChangesAsync();

        await _activityLog.LogAsync(
            actionCode: "CREATE_ATTRACTION",
            actionLabel: "Tao dia diem",
            message: $"Da them dia diem tham quan moi: \"{attraction.Name}\" ({attraction.Category}).",
            entityType: "Attraction",
            entityId: attraction.Id,
            entityLabel: attraction.Name,
            severity: "Success",
            userId: JwtHelper.GetUserId(User),
            roleName: User.FindFirst("role")?.Value
        );

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = JwtHelper.GetUserId(User),
            Action = "CREATE_ATTRACTION",
            TableName = "Attractions",
            RecordId = attraction.Id,
            OldValue = null,
            NewValue = $"{{\"name\": \"{attraction.Name}\", \"category\": \"{attraction.Category}\"}}",
            UserAgent = Request.Headers["User-Agent"].ToString(),
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetById),
            new { id = attraction.Id },
            new
            {
                message = "Tao dia diem thanh cong.",
                attraction.Id,
                attraction.Name,
                attraction.Category,
                attraction.DistanceKm
            });
    }

    [HttpPut("{id:int}")]
    [RequirePermission(PermissionCodes.ManageContent)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAttractionRequest request)
    {
        var attraction = await _db.Attractions
            .FirstOrDefaultAsync(a => a.Id == id && a.IsActive);

        if (attraction is null)
            return NotFound(new { message = $"Khong tim thay dia diem #{id}." });

        if (request.Category is not null && !IsValidCategory(request.Category))
            return BadRequest(new { message = "Category khong hop le. Dung: Di tich | Am thuc | Giai tri | Thien nhien." });

        if (request.Latitude is < -90 or > 90)
            return BadRequest(new { message = "Latitude phai nam trong khoang -90 den 90." });

        if (request.Longitude is < -180 or > 180)
            return BadRequest(new { message = "Longitude phai nam trong khoang -180 den 180." });

        var nextLatitude = request.Latitude ?? attraction.Latitude;
        var nextLongitude = request.Longitude ?? attraction.Longitude;
        if (HasIncompleteCoordinates(nextLatitude, nextLongitude))
            return BadRequest(new { message = "Can nhap day du ca latitude va longitude de tinh khoang cach." });

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

        attraction.DistanceKm = CalculateDistanceKm(nextLatitude, nextLongitude);

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
        await _activityLog.LogAsync(
            actionCode: "UPDATE_ATTRACTION",
            actionLabel: "Cap nhat dia diem",
            message: $"Thong tin dia diem \"{attraction.Name}\" da duoc chinh sua.",
            entityType: "Attraction",
            entityId: id,
            entityLabel: attraction.Name,
            severity: "Info",
            userId: currentUserId,
            roleName: User.FindFirst("role")?.Value
        );

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = currentUserId,
            Action = "UPDATE_ATTRACTION",
            TableName = "Attractions",
            RecordId = id,
            OldValue = null,
            NewValue = $"{{\"name\": \"{attraction.Name}\", \"category\": \"{attraction.Category}\"}}",
            UserAgent = Request.Headers["User-Agent"].ToString(),
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Cap nhat dia diem thanh cong.",
            attraction.Id,
            attraction.Name,
            attraction.Category,
            attraction.DistanceKm
        });
    }

    [HttpPost("upload-image")]
    [RequirePermission(PermissionCodes.ManageContent)]
    public async Task<IActionResult> UploadImage(IFormFile? file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Vui long chon anh dia diem can upload." });

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp", "image/gif" };
        if (!allowedTypes.Contains(file.ContentType.ToLowerInvariant()))
            return BadRequest(new { message = "Chi chap nhan anh dinh dang JPEG, PNG, WebP hoac GIF." });

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
            return StatusCode(502, new { message = $"Upload that bai: {uploadResult.Error.Message}" });

        await _auditTrail.WriteAsync(_db, User, Request, new AuditTrailEntry
        {
            ActionCode = "UPLOAD_ATTRACTION_IMAGE",
            ActionLabel = "Tai len anh dia diem",
            Message = $"Da tai len 1 anh moi cho muc dia diem tham quan (publicId: {uploadResult.PublicId}).",
            EntityType = "AttractionImage",
            Severity = "Info"
        });

        return Ok(new
        {
            message = "Upload anh dia diem thanh cong.",
            url = uploadResult.SecureUrl.ToString(),
            publicId = uploadResult.PublicId
        });
    }

    [HttpDelete("{id:int}")]
    [RequirePermission(PermissionCodes.ManageContent)]
    public async Task<IActionResult> Delete(int id)
    {
        var attraction = await _db.Attractions
            .FirstOrDefaultAsync(a => a.Id == id && a.IsActive);

        if (attraction is null)
            return NotFound(new { message = $"Khong tim thay dia diem #{id}." });

        attraction.IsActive = false;

        var currentUserId = JwtHelper.GetUserId(User);
        await _activityLog.LogAsync(
            actionCode: "DELETE_ATTRACTION",
            actionLabel: "Xoa dia diem",
            message: $"{(User.FindFirst("full_name")?.Value ?? "He thong")} da xoa dia diem \"{attraction.Name}\".",
            entityType: "Attraction",
            entityId: id,
            entityLabel: attraction.Name,
            severity: "Warning",
            userId: currentUserId,
            roleName: User.FindFirst("role")?.Value
        );

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = currentUserId,
            Action = "DELETE_ATTRACTION",
            TableName = "Attractions",
            RecordId = id,
            OldValue = $"{{\"isActive\": true, \"name\": \"{attraction.Name}\"}}",
            NewValue = "{\"isActive\": false}",
            UserAgent = Request.Headers["User-Agent"].ToString(),
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new { message = $"Da xoa dia diem '{attraction.Name}' thanh cong." });
    }

    [HttpPatch("{id:int}/toggle-active")]
    [RequirePermission(PermissionCodes.ManageContent)]
    public async Task<IActionResult> ToggleActive(int id)
    {
        var attraction = await _db.Attractions.FindAsync(id);
        if (attraction is null)
            return NotFound(new { message = $"Khong tim thay dia diem #{id}." });

        var oldActive = attraction.IsActive;
        attraction.IsActive = !attraction.IsActive;

        var currentUserId = JwtHelper.GetUserId(User);
        _db.AuditLogs.Add(new AuditLog
        {
            UserId = currentUserId,
            Action = "TOGGLE_ATTRACTION",
            TableName = "Attractions",
            RecordId = id,
            OldValue = $"{{\"isActive\": {oldActive.ToString().ToLower()}}}",
            NewValue = $"{{\"isActive\": {attraction.IsActive.ToString().ToLower()}}}",
            UserAgent = Request.Headers["User-Agent"].ToString(),
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        var action = attraction.IsActive ? "kich hoat" : "vo hieu hoa";
        return Ok(new
        {
            message = $"Da {action} dia diem '{attraction.Name}'.",
            attraction.Id,
            attraction.Name,
            attraction.IsActive
        });
    }

    private static bool IsValidCategory(string? category)
    {
        if (string.IsNullOrWhiteSpace(category))
            return true;

        var allowed = new[] { "Di tích", "Ẩm thực", "Giải trí", "Thiên nhiên" };
        return allowed.Contains(category.Trim());
    }

    private static bool HasIncompleteCoordinates(decimal? latitude, decimal? longitude)
        => (latitude.HasValue && !longitude.HasValue) || (!latitude.HasValue && longitude.HasValue);

    private static string? NormalizeMapEmbedLink(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var trimmed = value.Trim();
        var srcMatch = System.Text.RegularExpressions.Regex.Match(
            trimmed,
            "src\\s*=\\s*[\"']([^\"']+)[\"']",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);

        return srcMatch.Success ? srcMatch.Groups[1].Value.Trim() : trimmed;
    }

    private decimal? CalculateDistanceKm(decimal? attractionLatitude, decimal? attractionLongitude)
    {
        if (!attractionLatitude.HasValue
            || !attractionLongitude.HasValue
            || !_hotelLocation.Latitude.HasValue
            || !_hotelLocation.Longitude.HasValue)
            return null;

        var hotelLatitude = (double)_hotelLocation.Latitude.Value;
        var hotelLongitude = (double)_hotelLocation.Longitude.Value;
        var targetLatitude = (double)attractionLatitude.Value;
        var targetLongitude = (double)attractionLongitude.Value;

        const double earthRadiusKm = 6371d;
        var latitudeDelta = DegreesToRadians(targetLatitude - hotelLatitude);
        var longitudeDelta = DegreesToRadians(targetLongitude - hotelLongitude);
        var startLatitude = DegreesToRadians(hotelLatitude);
        var endLatitude = DegreesToRadians(targetLatitude);

        var haversine = Math.Pow(Math.Sin(latitudeDelta / 2d), 2d)
            + Math.Cos(startLatitude) * Math.Cos(endLatitude) * Math.Pow(Math.Sin(longitudeDelta / 2d), 2d);
        var arc = 2d * Math.Atan2(Math.Sqrt(haversine), Math.Sqrt(1d - haversine));
        var distance = earthRadiusKm * arc;

        return Math.Round((decimal)distance, 2, MidpointRounding.AwayFromZero);
    }

    private static double DegreesToRadians(double degrees) => degrees * (Math.PI / 180d);

    private async Task DeleteCloudinaryImageAsync(string? publicId)
    {
        if (string.IsNullOrWhiteSpace(publicId))
            return;

        var deleteParams = new DeletionParams(publicId)
        {
            ResourceType = ResourceType.Image
        };

        await _cloudinary.DestroyAsync(deleteParams);
    }
}

public record CreateAttractionRequest(
    string Name,
    string? Category,
    string? Address,
    decimal? Latitude,
    decimal? Longitude,
    string? Description,
    string? ImageUrl,
    string? CloudinaryPublicId,
    string? MapEmbedLink
);

public record UpdateAttractionRequest(
    string? Name,
    string? Category,
    string? Address,
    decimal? Latitude,
    decimal? Longitude,
    string? Description,
    string? ImageUrl,
    string? CloudinaryPublicId,
    bool? RemoveImage,
    string? MapEmbedLink
);
