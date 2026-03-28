using HotelManagement.Core.Authorization;
using HotelManagement.Core.Entities;
using HotelManagement.Core.Helpers;
using HotelManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using System.Text.Json;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LossAndDamagesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly Cloudinary   _cloudinary;

    public LossAndDamagesController(AppDbContext db, Cloudinary cloudinary)
    {
        _db         = db;
        _cloudinary = cloudinary;
    }

    // Đối tượng hỗ trợ lưu trữ JSON trong DB
    private class ImageItem { public string url { get; set; } = ""; public string publicId { get; set; } = ""; }

    [HttpGet]
    [RequirePermission(PermissionCodes.ManageInventory)]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var query = _db.LossAndDamages
            .AsNoTracking()
            .Include(l => l.RoomInventory)
                .ThenInclude(ri => ri!.Room)
            .Include(l => l.Reporter)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(l => l.Status == status);

        if (fromDate.HasValue)
            query = query.Where(l => l.CreatedAt >= fromDate.Value.Date);

        if (toDate.HasValue)
            query = query.Where(l => l.CreatedAt < toDate.Value.Date.AddDays(1));

        var records = await query
            .OrderByDescending(l => l.CreatedAt)
            .Select(l => new
            {
                l.Id,
                l.BookingDetailId,
                l.RoomInventoryId,
                l.Quantity,
                l.PenaltyAmount,
                l.Description,
                l.Status,
                l.CreatedAt,
                l.ReportedBy,
                l.ImageUrl, // Lưu ý: cái này bây giờ là chuỗi JSON mảng ảnh
                ItemName     = l.RoomInventory != null ? l.RoomInventory.ItemName : null,
                RoomNumber   = l.RoomInventory != null && l.RoomInventory.Room != null
                                 ? l.RoomInventory.Room.RoomNumber : null,
                ReporterName = l.Reporter != null ? l.Reporter.FullName : null,
            })
            .ToListAsync();

        return Ok(records);
    }

    [HttpGet("{id:int}")]
    [RequirePermission(PermissionCodes.ManageInventory)]
    public async Task<IActionResult> GetById(int id)
    {
        var record = await _db.LossAndDamages
            .AsNoTracking()
            .Include(l => l.RoomInventory)
                .ThenInclude(ri => ri!.Room)
            .Include(l => l.Reporter)
            .Where(l => l.Id == id)
            .Select(l => new
            {
                l.Id,
                l.BookingDetailId,
                l.RoomInventoryId,
                l.Quantity,
                l.PenaltyAmount,
                l.Description,
                l.Status,
                l.CreatedAt,
                l.ReportedBy,
                l.ImageUrl,
                ItemName     = l.RoomInventory != null ? l.RoomInventory.ItemName : null,
                RoomNumber   = l.RoomInventory != null && l.RoomInventory.Room != null
                                 ? l.RoomInventory.Room.RoomNumber : null,
                ReporterName = l.Reporter != null ? l.Reporter.FullName : null,
            })
            .FirstOrDefaultAsync();

        if (record is null) return NotFound(new { message = $"Không tìm thấy biên bản #{id}." });
        return Ok(record);
    }

    [HttpPost]
    [RequirePermission(PermissionCodes.ManageInventory)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Create([FromForm] CreateLossAndDamageRequest request)
    {
        if (request.Quantity < 1) return BadRequest(new { message = "Số lượng phải ít nhất là 1." });

        var userId = JwtHelper.GetUserId(User);
        var imageList = new List<ImageItem>();

        // Xử lý upload nhiều ảnh nếu có
        if (request.Images != null && request.Images.Any())
        {
            foreach (var file in request.Images)
            {
                using var stream = file.OpenReadStream();
                var uploadParams = new ImageUploadParams
                {
                    File = new FileDescription(file.FileName, stream),
                    Folder = "hotel/loss-damage",
                    Transformation = new Transformation().Width(1200).Quality("auto").FetchFormat("auto")
                };
                var result = await _cloudinary.UploadAsync(uploadParams);
                if (result.Error == null)
                    imageList.Add(new ImageItem { url = result.SecureUrl.ToString(), publicId = result.PublicId });
            }
        }

        var record = new LossAndDamage
        {
            BookingDetailId = request.BookingDetailId,
            RoomInventoryId = request.RoomInventoryId,
            ReportedBy      = userId,
            Quantity        = request.Quantity,
            PenaltyAmount   = request.PenaltyAmount,
            Description     = request.Description?.Trim(),
            Status          = request.Status ?? "Pending",
            CreatedAt       = DateTime.UtcNow,
            ImageUrl        = imageList.Any() ? JsonSerializer.Serialize(imageList) : null
        };

        _db.LossAndDamages.Add(record);
        await _db.SaveChangesAsync();

        return StatusCode(201, new { message = "Tạo biên bản thành công.", id = record.Id });
    }

    [HttpPut("{id:int}")]
    [RequirePermission(PermissionCodes.ManageInventory)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Update(int id, [FromForm] UpdateLossAndDamageRequest request)
    {
        var record = await _db.LossAndDamages.FirstOrDefaultAsync(l => l.Id == id);
        if (record is null) return NotFound(new { message = $"Không tìm thấy biên bản #{id}." });

        // 1. Phân tích ảnh cũ
        var currentImages = new List<ImageItem>();
        if (!string.IsNullOrEmpty(record.ImageUrl))
        {
            try { currentImages = JsonSerializer.Deserialize<List<ImageItem>>(record.ImageUrl) ?? new(); }
            catch { /* fallback nếu không phải json */ }
        }

        // 2. Xác định ảnh cần giữ lại (Frontend gửi về danh sách URL muốn giữ)
        var imagesToKeep = new List<string>();
        if (!string.IsNullOrEmpty(request.KeepImagesJson))
        {
            imagesToKeep = JsonSerializer.Deserialize<List<string>>(request.KeepImagesJson) ?? new();
        }

        // 3. Xóa các ảnh không được giữ lại trên Cloudinary
        var imagesToRemove = currentImages.Where(ci => !imagesToKeep.Contains(ci.url)).ToList();
        foreach (var img in imagesToRemove)
        {
            await _cloudinary.DestroyAsync(new DeletionParams(img.publicId));
        }

        // 4. Danh sách ảnh mới sau khi lọc
        var finalImages = currentImages.Where(ci => imagesToKeep.Contains(ci.url)).ToList();

        // 5. Upload các ảnh mới thêm vào
        if (request.Images != null && request.Images.Any())
        {
            foreach (var file in request.Images)
            {
                using var stream = file.OpenReadStream();
                var uploadParams = new ImageUploadParams
                {
                    File = new FileDescription(file.FileName, stream),
                    Folder = "hotel/loss-damage",
                    Transformation = new Transformation().Width(1200).Quality("auto").FetchFormat("auto")
                };
                var result = await _cloudinary.UploadAsync(uploadParams);
                if (result.Error == null)
                    finalImages.Add(new ImageItem { url = result.SecureUrl.ToString(), publicId = result.PublicId });
            }
        }

        record.Quantity      = request.Quantity;
        record.PenaltyAmount = request.PenaltyAmount;
        record.Description   = request.Description?.Trim();
        record.Status        = request.Status;
        record.ImageUrl      = finalImages.Any() ? JsonSerializer.Serialize(finalImages) : null;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Cập nhật biên bản thành công.", imageUrl = record.ImageUrl });
    }

    [HttpDelete("{id:int}")]
    [RequirePermission(PermissionCodes.ManageInventory)]
    public async Task<IActionResult> Delete(int id)
    {
        var record = await _db.LossAndDamages.FirstOrDefaultAsync(l => l.Id == id);
        if (record is null) return NotFound(new { message = $"Không tìm thấy biên bản #{id}." });

        // Xóa tất cả ảnh trên Cloudinary
        if (!string.IsNullOrEmpty(record.ImageUrl))
        {
            try {
                var images = JsonSerializer.Deserialize<List<ImageItem>>(record.ImageUrl);
                if (images != null) {
                    foreach (var img in images) await _cloudinary.DestroyAsync(new DeletionParams(img.publicId));
                }
            } catch { }
        }

        _db.LossAndDamages.Remove(record);
        await _db.SaveChangesAsync();
        return Ok(new { message = $"Đã xóa biên bản #{id}." });
    }
}

public class CreateLossAndDamageRequest
{
    public int?            BookingDetailId { get; set; }
    public int?            RoomInventoryId { get; set; }
    public int             Quantity { get; set; }
    public decimal         PenaltyAmount { get; set; }
    public string?         Description { get; set; }
    public string?         Status { get; set; }
    public List<IFormFile>? Images { get; set; } // Upload nhiều file
}

public class UpdateLossAndDamageRequest
{
    public int             Quantity { get; set; }
    public decimal         PenaltyAmount { get; set; }
    public string?         Description { get; set; }
    public string          Status { get; set; } = null!;
    public List<IFormFile>? Images { get; set; } // File ảnh mới tải lên
    public string?         KeepImagesJson { get; set; } // JSON mảng URL các ảnh cũ muốn giữ lại
}
