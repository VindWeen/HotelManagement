using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using HotelManagement.API.Services;
using HotelManagement.Core.Authorization;
using HotelManagement.Core.Constants;
using HotelManagement.Core.Entities;
using HotelManagement.Core.Helpers;
using HotelManagement.Core.Models.Enums;
using HotelManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LossAndDamagesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly Cloudinary _cloudinary;
    private readonly INotificationService _notificationService;
    private readonly IAuditLogGroupService _auditLogGroup;
    private readonly IAuditTrailService _auditTrail;

    public LossAndDamagesController(
        AppDbContext db,
        Cloudinary cloudinary,
        INotificationService notificationService,
        IAuditLogGroupService auditLogGroup,
        IAuditTrailService auditTrail)
    {
        _db = db;
        _cloudinary = cloudinary;
        _notificationService = notificationService;
        _auditLogGroup = auditLogGroup;
        _auditTrail = auditTrail;
    }

    private class ImageItem
    {
        public string url { get; set; } = "";
        public string publicId { get; set; } = "";
    }

    private static List<ImageItem> ParseImages(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return [];

        try
        {
            var parsed = JsonSerializer.Deserialize<List<ImageItem>>(raw);
            if (parsed is not null)
                return parsed;
        }
        catch
        {
        }

        return raw.StartsWith("http", StringComparison.OrdinalIgnoreCase)
            ? [new ImageItem { url = raw, publicId = "" }]
            : [];
    }

    private static string NormalizeStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
            return "Pending";

        var normalized = status.Trim();
        return normalized is "Pending" or "Confirmed" or "Waived"
            ? normalized
            : "Pending";
    }

    private static int ComputeRemainingToReplenish(LossAndDamage record)
        => Math.Max(0, Math.Max(1, record.Quantity) - Math.Max(0, record.ReplenishedQuantity));

    private static string BuildHousekeepingLossSummary(string roomNumber, IReadOnlyList<string> itemNames)
    {
        if (itemNames.Count == 0)
            return $"Ghi nhận thất thoát vật tư tại phòng {roomNumber}.";

        if (itemNames.Count == 1)
            return $"Ghi nhận thất thoát {itemNames[0]} tại phòng {roomNumber}.";

        return $"Ghi nhận thất thoát {itemNames[0]} tại phòng {roomNumber}. (và {itemNames.Count - 1} sự kiện khác)";
    }

    private async Task<bool> IsPenaltySettledAsync(LossAndDamage record)
    {
        if (!record.BookingDetailId.HasValue)
            return false;

        return await _db.BookingDetails
            .Where(bd => bd.Id == record.BookingDetailId.Value)
            .AnyAsync(bd => bd.Booking != null && bd.Booking.Status == BookingStatuses.Completed);
    }

    private static string ComputeRoomStatus(string businessStatus, string cleaningStatus)
        => businessStatus switch
        {
            "Occupied" => "Occupied",
            "Disabled" => "Maintenance",
            "Available" when cleaningStatus is "Dirty" or "PendingLoss" => "Cleaning",
            _ => "Available"
        };

    private async Task<int?> ResolveRoomIdAsync(LossAndDamage record)
    {
        if (record.RoomInventoryId.HasValue)
        {
            return await _db.RoomInventories
                .Where(ri => ri.Id == record.RoomInventoryId.Value)
                .Select(ri => (int?)ri.RoomId)
                .FirstOrDefaultAsync();
        }

        if (record.BookingDetailId.HasValue)
        {
            return await _db.BookingDetails
                .Where(bd => bd.Id == record.BookingDetailId.Value)
                .Select(bd => bd.RoomId)
                .FirstOrDefaultAsync();
        }

        return null;
    }

    private async Task<int?> ResolveBookingDetailIdForRoomInventoryAsync(int roomInventoryId)
    {
        var roomId = await _db.RoomInventories
            .Where(ri => ri.Id == roomInventoryId)
            .Select(ri => ri.RoomId)
            .FirstOrDefaultAsync();

        if (roomId <= 0)
            return null;

        return await _db.BookingDetails
            .Where(bd =>
                bd.RoomId == roomId &&
                bd.Booking != null &&
                (bd.Booking.Status == "Checked_out_pending_settlement" ||
                 bd.Booking.Status == "Completed"))
            .OrderByDescending(bd => bd.Booking!.CheckOutTime ?? bd.CheckOutDate)
            .ThenByDescending(bd => bd.Id)
            .Select(bd => (int?)bd.Id)
            .FirstOrDefaultAsync();
    }

    private async Task SyncRoomCleaningStatusForLossAsync(LossAndDamage record)
    {
        var roomId = await ResolveRoomIdAsync(record);
        if (!roomId.HasValue)
            return;

        var room = await _db.Rooms.FirstOrDefaultAsync(r => r.Id == roomId.Value);
        if (room is null || room.BusinessStatus != "Available")
            return;

        var hasPendingLoss = await _db.LossAndDamages
            .Where(l => l.Id != record.Id && (l.Status == "Pending" || (l.Status == "Confirmed" && l.ReplenishedQuantity < l.Quantity)))
            .AnyAsync(l =>
                (l.RoomInventoryId.HasValue && l.RoomInventory != null && l.RoomInventory.RoomId == roomId.Value)
                || (l.BookingDetailId.HasValue && l.BookingDetail != null && l.BookingDetail.RoomId == roomId.Value));

        if (record.Status == "Pending" || (record.Status == "Confirmed" && ComputeRemainingToReplenish(record) > 0))
            hasPendingLoss = true;

        if (hasPendingLoss)
        {
            if (room.CleaningStatus == "Clean" || room.CleaningStatus == "PendingLoss")
            {
                room.CleaningStatus = "PendingLoss";
                room.Status = ComputeRoomStatus(room.BusinessStatus, room.CleaningStatus);
            }

            return;
        }

        if (room.CleaningStatus == "PendingLoss")
        {
            room.CleaningStatus = "Clean";
            room.Status = ComputeRoomStatus(room.BusinessStatus, room.CleaningStatus);
        }
    }

    private async Task<AuditLogGroupEvent?> SyncEquipmentForLossRecordAsync(LossAndDamage record)
    {
        if (record.IsStockSynced || !record.RoomInventoryId.HasValue)
            return null;

        var roomInventory = await _db.RoomInventories
            .Include(ri => ri.Equipment)
            .FirstOrDefaultAsync(ri => ri.Id == record.RoomInventoryId.Value);

        if (roomInventory?.Equipment is null)
            return null;

        var equipment = roomInventory.Equipment;
        var quantity = Math.Max(1, record.Quantity);
        var shortageQuantity = Math.Max(0, quantity - Math.Max(0, record.ReplenishedQuantity));

        roomInventory.Quantity = Math.Max(0, (roomInventory.Quantity ?? 0) - shortageQuantity);
        roomInventory.IsActive = (roomInventory.Quantity ?? 0) > 0;
        roomInventory.Note ??= record.Description;
        equipment.InUseQuantity = Math.Max(0, equipment.InUseQuantity - shortageQuantity);
        equipment.DamagedQuantity += quantity;
        equipment.UpdatedAt = DateTime.UtcNow;
        record.IsStockSynced = true;

        return new AuditLogGroupEvent
        {
            EventId = Guid.NewGuid().ToString(),
            Timestamp = DateTime.UtcNow,
            ActionType = "UPDATE",
            EntityType = "Equipment",
            Message = $"Đã cập nhật tồn kho {equipment.Name} (Giảm {shortageQuantity} đang sử dụng, Tăng {quantity} hỏng).",
            Context = new { equipmentId = equipment.Id, reason = $"Xác nhận biên bản mất/hỏng #{record.Id}" },
            Changes = new { quantityAddedToDamaged = quantity, quantityRemovedFromUse = shortageQuantity }
        };
    }

    private async Task<AuditLogGroupEvent?> RestoreEquipmentForLossRecordAsync(LossAndDamage record)
    {
        if (!record.IsStockSynced || !record.RoomInventoryId.HasValue)
            return null;

        var roomInventory = await _db.RoomInventories
            .Include(ri => ri.Equipment)
            .FirstOrDefaultAsync(ri => ri.Id == record.RoomInventoryId.Value);

        if (roomInventory?.Equipment is null)
            return null;

        var equipment = roomInventory.Equipment;
        var quantity = Math.Max(1, record.Quantity);
        var shortageQuantity = Math.Max(0, quantity - Math.Max(0, record.ReplenishedQuantity));

        roomInventory.Quantity = Math.Max(0, roomInventory.Quantity ?? 0) + shortageQuantity;
        roomInventory.IsActive = true;
        equipment.InUseQuantity += shortageQuantity;
        equipment.DamagedQuantity = Math.Max(0, equipment.DamagedQuantity - quantity);
        equipment.UpdatedAt = DateTime.UtcNow;
        record.IsStockSynced = false;

        return new AuditLogGroupEvent
        {
            EventId = Guid.NewGuid().ToString(),
            Timestamp = DateTime.UtcNow,
            ActionType = "UPDATE",
            EntityType = "Equipment",
            Message = $"Đã hoàn tác kho {equipment.Name} (Tăng {shortageQuantity} đang sử dụng, Giảm {quantity} hỏng).",
            Context = new { equipmentId = equipment.Id, reason = $"Hoàn tác biên bản mất/hỏng #{record.Id}" },
            Changes = new { quantityRemovedFromDamaged = quantity, quantityAddedToUse = shortageQuantity }
        };
    }

    [HttpGet]
    [RequirePermission(PermissionCodes.ManageInventory)]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var query = _db.LossAndDamages
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
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
                l.IsStockSynced,
                l.ReplenishedQuantity,
                l.ReplenishedAt,
                l.ReplenishmentNote,
                l.CreatedAt,
                l.ReportedBy,
                l.ImgUrl,
                ItemName = l.RoomInventory != null && l.RoomInventory.Equipment != null ? l.RoomInventory.Equipment.Name : null,
                RoomNumber = l.RoomInventory != null && l.RoomInventory.Room != null ? l.RoomInventory.Room.RoomNumber : null,
                ReporterName = l.Reporter != null ? l.Reporter.FullName : null,
                AvailableStock = l.RoomInventory != null && l.RoomInventory.Equipment != null ? l.RoomInventory.Equipment.InStockQuantity : 0,
                RoomInventoryQuantity = l.RoomInventory != null ? l.RoomInventory.Quantity : null,
                EquipmentIsActive = l.RoomInventory != null && l.RoomInventory.Equipment != null ? l.RoomInventory.Equipment.IsActive : true,
                IsPenaltySettled = l.BookingDetail != null && l.BookingDetail.Booking != null && l.BookingDetail.Booking.Status == BookingStatuses.Completed,
            })
            .ToListAsync();

        var data = records.Select(l => new
        {
            l.Id,
            l.BookingDetailId,
            l.RoomInventoryId,
            l.Quantity,
            l.PenaltyAmount,
            l.Description,
            l.Status,
            l.IsStockSynced,
            l.ReplenishedQuantity,
            l.ReplenishedAt,
            l.ReplenishmentNote,
            RemainingToReplenish = Math.Max(0, l.Quantity - l.ReplenishedQuantity),
            l.CreatedAt,
            l.ReportedBy,
            l.ItemName,
            l.RoomNumber,
            l.ReporterName,
            l.AvailableStock,
            l.RoomInventoryQuantity,
            l.EquipmentIsActive,
            l.IsPenaltySettled,
            Images = ParseImages(l.ImgUrl)
        }).ToList();

        return Ok(new { data, total = data.Count });
    }

    [HttpGet("{id:int}")]
    [RequirePermission(PermissionCodes.ManageInventory)]
    public async Task<IActionResult> GetById(int id)
    {
        var record = await _db.LossAndDamages
            .AsNoTracking()
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
                l.IsStockSynced,
                l.ReplenishedQuantity,
                l.ReplenishedAt,
                l.ReplenishmentNote,
                l.CreatedAt,
                l.ReportedBy,
                l.ImgUrl,
                ItemName = l.RoomInventory != null && l.RoomInventory.Equipment != null ? l.RoomInventory.Equipment.Name : null,
                RoomNumber = l.RoomInventory != null && l.RoomInventory.Room != null ? l.RoomInventory.Room.RoomNumber : null,
                ReporterName = l.Reporter != null ? l.Reporter.FullName : null,
                AvailableStock = l.RoomInventory != null && l.RoomInventory.Equipment != null ? l.RoomInventory.Equipment.InStockQuantity : 0,
                RoomInventoryQuantity = l.RoomInventory != null ? l.RoomInventory.Quantity : null,
                EquipmentIsActive = l.RoomInventory != null && l.RoomInventory.Equipment != null ? l.RoomInventory.Equipment.IsActive : true,
                IsPenaltySettled = l.BookingDetail != null && l.BookingDetail.Booking != null && l.BookingDetail.Booking.Status == BookingStatuses.Completed,
            })
            .FirstOrDefaultAsync();

        if (record is null)
            return NotFound(new { message = $"Không tìm thấy biên bản #{id}." });

        return Ok(new
        {
            record.Id,
            record.BookingDetailId,
            record.RoomInventoryId,
            record.Quantity,
            record.PenaltyAmount,
            record.Description,
            record.Status,
            record.IsStockSynced,
            record.ReplenishedQuantity,
            record.ReplenishedAt,
            record.ReplenishmentNote,
            RemainingToReplenish = Math.Max(0, record.Quantity - record.ReplenishedQuantity),
            record.CreatedAt,
            record.ReportedBy,
            record.ItemName,
            record.RoomNumber,
            record.ReporterName,
            record.AvailableStock,
            record.RoomInventoryQuantity,
            record.EquipmentIsActive,
            record.IsPenaltySettled,
            Images = ParseImages(record.ImgUrl)
        });
    }

    [HttpPost]
    [RequirePermission(PermissionCodes.ManageInventory)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Create([FromForm] CreateLossAndDamageRequest request)
    {
        if (request.Quantity < 1)
            return BadRequest(new { message = "Số lượng phải ít nhất là 1." });

        var userId = JwtHelper.GetUserId(User);
        var userAgent = Request.Headers["User-Agent"].ToString();
        var imageList = new List<ImageItem>();

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
            ReportedBy = userId,
            Quantity = request.Quantity,
            PenaltyAmount = request.PenaltyAmount,
            Description = request.Description?.Trim(),
            Status = NormalizeStatus(request.Status),
            IsStockSynced = false,
            CreatedAt = DateTime.UtcNow,
            ImgUrl = imageList.Any() ? JsonSerializer.Serialize(imageList) : null
        };

        if (!record.BookingDetailId.HasValue && record.RoomInventoryId.HasValue)
            record.BookingDetailId = await ResolveBookingDetailIdForRoomInventoryAsync(record.RoomInventoryId.Value);

        _db.LossAndDamages.Add(record);
        AuditLogGroupEvent? syncEvent = null;
        if (record.Status == "Confirmed")
            syncEvent = await SyncEquipmentForLossRecordAsync(record);

        await _db.SaveChangesAsync();
        await SyncRoomCleaningStatusForLossAsync(record);
        await _db.SaveChangesAsync();

        var roomNumber = "N/A";
        if (record.RoomInventoryId.HasValue)
        {
            roomNumber = await _db.RoomInventories
                .Where(ri => ri.Id == record.RoomInventoryId.Value)
                .Select(ri => ri.Room != null ? ri.Room.RoomNumber : null)
                .FirstOrDefaultAsync() ?? "N/A";
        }

        var notification = new Notification
        {
            Title = "Biên bản mới đã được lập",
            Message = $"Một biên bản bồi thường mới đã được tạo cho phòng {roomNumber}.",
            Type = NotificationType.Success,
            Action = NotificationAction.CreateLossReport
        };

        _ = _notificationService.SendToRolesAsync(new[] { "Admin", "Manager" }, notification.Title, notification.Message, notification.Action.ToString());

        return StatusCode(201, new
        {
            message = record.Status == "Confirmed"
                ? "Tạo biên bản thành công và đã đồng bộ kho sau khi xác nhận."
                : "Tạo biên bản thành công. Kho sẽ chỉ được đồng bộ khi biên bản được xác nhận.",
            id = record.Id,
            isStockSynced = record.IsStockSynced,
            notification
        });
    }

    [HttpPut("{id:int}")]
    [RequirePermission(PermissionCodes.ManageInventory)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Update(int id, [FromForm] UpdateLossAndDamageRequest request)
    {
        if (request.Quantity < 1)
            return BadRequest(new { message = "Số lượng phải ít nhất là 1." });

        var record = await _db.LossAndDamages.FirstOrDefaultAsync(l => l.Id == id);
        if (record is null)
            return NotFound(new { message = $"Không tìm thấy biên bản #{id}." });

        var oldStatus = record.Status;
        var oldQuantity = record.Quantity;

        if (request.Quantity < record.ReplenishedQuantity)
            return BadRequest(new { message = "Số lượng không được nhỏ hơn phần đã bổ sung." });

        if (request.Status?.Trim() == "Waived" && await IsPenaltySettledAsync(record))
            return BadRequest(new { message = "Không thể chuyển sang miễn trừ vì khoản thất thoát này đã được thanh toán." });

        var currentImages = new List<ImageItem>();
        if (!string.IsNullOrEmpty(record.ImgUrl))
        {
            try { currentImages = JsonSerializer.Deserialize<List<ImageItem>>(record.ImgUrl) ?? new(); }
            catch { }
        }

        var imagesToKeep = new List<string>();
        if (!string.IsNullOrEmpty(request.KeepImagesJson))
            imagesToKeep = JsonSerializer.Deserialize<List<string>>(request.KeepImagesJson) ?? new();

        var imagesToRemove = currentImages.Where(ci => !imagesToKeep.Contains(ci.url)).ToList();
        foreach (var img in imagesToRemove.Where(x => !string.IsNullOrWhiteSpace(x.publicId)))
            await _cloudinary.DestroyAsync(new DeletionParams(img.publicId));

        var finalImages = currentImages.Where(ci => imagesToKeep.Contains(ci.url)).ToList();

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

        var events = new List<AuditLogGroupEvent>();
        if (record.IsStockSynced)
        {
            var restoreEvent = await RestoreEquipmentForLossRecordAsync(record);
            if (restoreEvent != null) events.Add(restoreEvent);
        }

        record.Quantity = request.Quantity;
        record.PenaltyAmount = request.PenaltyAmount;
        record.Description = request.Description?.Trim();
        record.Status = NormalizeStatus(request.Status);
        if (record.ReplenishedQuantity > record.Quantity)
            record.ReplenishedQuantity = record.Quantity;
        if (record.ReplenishedQuantity < Math.Max(1, record.Quantity))
            record.ReplenishedAt = null;
        record.ImgUrl = finalImages.Any() ? JsonSerializer.Serialize(finalImages) : null;

        if (record.Status == "Confirmed")
        {
            var syncEvent = await SyncEquipmentForLossRecordAsync(record);
            if (syncEvent != null) events.Add(syncEvent);
        }

        await _db.SaveChangesAsync();
        await SyncRoomCleaningStatusForLossAsync(record);
        await _db.SaveChangesAsync();

        var notification = new Notification
        {
            Title = "Cập nhật biên bản thành công",
            Message = $"Thông tin biên bản #{id} đã được cập nhật.",
            Type = NotificationType.Success,
            Action = NotificationAction.UpdateLossReport
        };

        events.Add(new AuditLogGroupEvent
        {
            EventId = Guid.NewGuid().ToString(),
            Timestamp = DateTime.UtcNow,
            ActionType = "UPDATE",
            EntityType = "LossAndDamage",
            Context = new { damageId = id },
            Changes = new { oldStatus, newStatus = record.Status, oldQuantity, newQuantity = record.Quantity },
            Message = $"Đã cập nhật biên bản #{id}" + (oldStatus != record.Status ? $" (trạng thái: {oldStatus} -> {record.Status})" : "") + "."
        });

        var auditLog = _auditLogGroup.CreateGroup(
            User,
            $"Cập nhật biên bản mất/hỏng #{id} (trạng thái: {record.Status})." + (events.Count > 1 ? $" (và {events.Count - 1} sự kiện đồng bộ kho)" : ""),
            events);
        _db.AuditLogs.Add(auditLog);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = oldStatus != record.Status || oldQuantity != record.Quantity
                ? "Cập nhật biên bản thành công và đã đối chiếu lại tồn kho theo trạng thái mới."
                : "Cập nhật biên bản thành công.",
            imgUrl = record.ImgUrl,
            isStockSynced = record.IsStockSynced,
            notification
        });
    }

    [HttpPost("batch-update-status")]
    [RequirePermission(PermissionCodes.ManageInventory)]
    public async Task<IActionResult> BatchUpdateStatus([FromBody] BatchUpdateStatusRequest request)
    {
        if (request.LossAndDamageIds == null || !request.LossAndDamageIds.Any())
            return BadRequest(new { message = "Danh sách biên bản không hợp lệ." });

        var newStatus = NormalizeStatus(request.Status);

        var records = await _db.LossAndDamages
            .Include(x => x.RoomInventory)
                .ThenInclude(ri => ri!.Equipment)
            .Include(x => x.RoomInventory)
                .ThenInclude(ri => ri!.Room)
            .Where(x => request.LossAndDamageIds.Contains(x.Id))
            .ToListAsync();

        if (records.Count == 0)
            return NotFound(new { message = "Không tìm thấy biên bản nào." });

        var events = new List<AuditLogGroupEvent>();
        int updatedCount = 0;

        foreach (var record in records)
        {
            var oldStatus = record.Status;
            if (oldStatus == newStatus) continue;

            if (newStatus == "Waived" && await IsPenaltySettledAsync(record))
                continue; 

            if (record.IsStockSynced && newStatus != "Confirmed")
            {
                var restoreEvent = await RestoreEquipmentForLossRecordAsync(record);
                if (restoreEvent != null) events.Add(restoreEvent);
            }

            record.Status = newStatus;

            if (record.Status == "Confirmed")
            {
                var syncEvent = await SyncEquipmentForLossRecordAsync(record);
                if (syncEvent != null) events.Add(syncEvent);
            }

            events.Add(new AuditLogGroupEvent
            {
                EventId = Guid.NewGuid().ToString(),
                Timestamp = DateTime.UtcNow,
                ActionType = "UPDATE",
                EntityType = "LossAndDamage",
                Context = new { damageId = record.Id, roomNumber = record.RoomInventory?.Room?.RoomNumber },
                Changes = new { oldStatus, newStatus = record.Status },
                Message = $"Đã cập nhật biên bản #{record.Id} (trạng thái: {oldStatus} -> {record.Status})."
            });
            
            updatedCount++;
        }

        if (updatedCount == 0)
            return BadRequest(new { message = "Không có biên bản nào đủ điều kiện để cập nhật trạng thái hoặc tất cả đã ở trạng thái này." });

        await _db.SaveChangesAsync();

        foreach (var record in records)
        {
            await SyncRoomCleaningStatusForLossAsync(record);
        }
        await _db.SaveChangesAsync();

        var distinctRooms = records
            .Where(r => r.RoomInventory?.Room != null)
            .Select(r => r.RoomInventory!.Room!.RoomNumber)
            .Distinct()
            .ToList();
        var roomText = distinctRooms.Count > 0 ? $" tại phòng {string.Join(", ", distinctRooms)}" : "";

        var auditLog = _auditLogGroup.CreateGroup(
            User,
            $"Cập nhật trạng thái hàng loạt {updatedCount} biên bản đền bù{roomText} thành {newStatus}.",
            events);
        _db.AuditLogs.Add(auditLog);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"Đã cập nhật trạng thái thành công cho {updatedCount} biên bản." });
    }

    [HttpPost("housekeeping-audit-group")]
    [RequirePermission(PermissionCodes.ManageInventory)]
    public async Task<IActionResult> CreateHousekeepingAuditGroup([FromBody] CreateHousekeepingLossAuditGroupRequest request)
    {
        if (request.Items is null || request.Items.Count == 0)
            return BadRequest(new { message = "Danh sách vật tư thất thoát không được để trống." });

        var roomNumber = string.IsNullOrWhiteSpace(request.RoomNumber) ? "N/A" : request.RoomNumber.Trim();
        var roomInventoryIds = request.Items
            .Where(x => x.RoomInventoryId > 0)
            .Select(x => x.RoomInventoryId)
            .Distinct()
            .ToList();

        var inventoryLookup = await _db.RoomInventories
            .AsNoTracking()
            .Where(ri => roomInventoryIds.Contains(ri.Id))
            .Select(ri => new
            {
                ri.Id,
                ItemName = ri.Equipment != null ? ri.Equipment.Name : null,
                RoomNumber = ri.Room != null ? ri.Room.RoomNumber : null
            })
            .ToDictionaryAsync(x => x.Id, x => x);

        var events = new List<AuditLogGroupEvent>();
        var itemNames = new List<string>();

        foreach (var item in request.Items)
        {
            inventoryLookup.TryGetValue(item.RoomInventoryId, out var inventory);
            var itemName = string.IsNullOrWhiteSpace(inventory?.ItemName)
                ? $"Vat tu #{item.RoomInventoryId}"
                : inventory!.ItemName!;
            var effectiveRoomNumber = string.IsNullOrWhiteSpace(inventory?.RoomNumber)
                ? roomNumber
                : inventory!.RoomNumber!;

            itemNames.Add(itemName);
            events.Add(new AuditLogGroupEvent
            {
                EventId = Guid.NewGuid().ToString(),
                Timestamp = DateTime.UtcNow,
                ActionType = "CREATE",
                EntityType = "LossAndDamage",
                Context = new
                {
                    damageId = item.LossAndDamageId,
                    roomNumber = effectiveRoomNumber,
                    targetItem = itemName,
                    roomInventoryId = item.RoomInventoryId
                },
                Changes = new
                {
                    oldData = (object?)null,
                    newData = new
                    {
                        item.Quantity,
                        item.PenaltyAmount,
                        item.Description
                    }
                },
                Message = $"Ghi nhận thất thoát {itemName} tại phòng {effectiveRoomNumber}."
            });
        }

        var auditLog = _auditLogGroup.CreateGroup(
            User,
            BuildHousekeepingLossSummary(roomNumber, itemNames),
            events);

        _db.AuditLogs.Add(auditLog);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Đã ghi nhật ký hoạt động cho danh sách vật tư thất thoát.",
            totalEvents = events.Count
        });
    }

    [HttpDelete("{id:int}")]
    [RequirePermission(PermissionCodes.ManageInventory)]
    public async Task<IActionResult> Delete(int id)
    {
        var record = await _db.LossAndDamages.FirstOrDefaultAsync(l => l.Id == id);
        if (record is null)
            return NotFound(new { message = $"Không tìm thấy biên bản #{id}." });

        var events = new List<AuditLogGroupEvent>();
        if (record.IsStockSynced)
        {
            var restoreEvent = await RestoreEquipmentForLossRecordAsync(record);
            if (restoreEvent != null) events.Add(restoreEvent);
        }

        if (!string.IsNullOrEmpty(record.ImgUrl))
        {
            try
            {
                var images = JsonSerializer.Deserialize<List<ImageItem>>(record.ImgUrl);
                if (images != null)
                {
                    foreach (var img in images.Where(x => !string.IsNullOrWhiteSpace(x.publicId)))
                        await _cloudinary.DestroyAsync(new DeletionParams(img.publicId));
                }
            }
            catch
            {
            }
        }

        _db.LossAndDamages.Remove(record);
        await _db.SaveChangesAsync();
        await SyncRoomCleaningStatusForLossAsync(record);
        await _db.SaveChangesAsync();

        var notification = new Notification
        {
            Title = "Đã xóa biên bản",
            Message = $"Biên bản bồi thường #{id} đã được xóa thành công.",
            Type = NotificationType.Success,
            Action = NotificationAction.DeleteLossReport
        };

        events.Add(new AuditLogGroupEvent
        {
            EventId = Guid.NewGuid().ToString(),
            Timestamp = DateTime.UtcNow,
            ActionType = "DELETE",
            EntityType = "LossAndDamage",
            Context = new { damageId = id },
            Changes = new { oldStatus = record.Status, oldQuantity = record.Quantity },
            Message = $"Xóa biên bản #{id} khỏi hệ thống."
        });

        var auditLog = _auditLogGroup.CreateGroup(
            User,
            $"Xóa biên bản mất/hỏng #{id} khỏi hệ thống." + (events.Count > 1 ? $" (và {events.Count - 1} sự kiện đồng bộ kho)" : ""),
            events);
        _db.AuditLogs.Add(auditLog);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Đã xóa biên bản và hoàn tác tồn kho nếu biên bản đã từng được xác nhận.",
            notification
        });
    }

    [HttpPost("{id:int}/replenish")]
    [RequirePermission(PermissionCodes.ManageInventory)]
    public async Task<IActionResult> Replenish(int id, [FromBody] ReplenishLossAndDamageRequest request)
    {
        if (request.Quantity < 1)
            return BadRequest(new { message = "Số lượng bổ sung phải lớn hơn 0." });

        var record = await _db.LossAndDamages
            .Include(l => l.RoomInventory)
                .ThenInclude(ri => ri!.Equipment)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (record is null)
            return NotFound(new { message = $"Không tìm thấy biên bản #{id}." });

        if (record.Status != "Confirmed")
            return BadRequest(new { message = "Chỉ có thể bổ sung sau khi biên bản đã xác nhận." });

        if (!record.RoomInventoryId.HasValue || record.RoomInventory?.Equipment is null)
            return BadRequest(new { message = "Biên bản này không gắn với vật tư phòng để bổ sung." });

        if (!record.RoomInventory.Equipment.IsActive)
            return BadRequest(new { message = "Vật tư này đã ngừng kinh doanh hoặc đang bị vô hiệu hóa, không thể bổ sung lại vào phòng." });

        var remaining = ComputeRemainingToReplenish(record);
        if (remaining <= 0)
            return BadRequest(new { message = "Biên bản này đã được bổ sung đủ." });

        var roomInventory = record.RoomInventory;
        var equipment = roomInventory.Equipment;
        var availableStock = Math.Max(0, equipment.InStockQuantity);
        if (availableStock <= 0)
            return BadRequest(new
            {
                message = "Kho hiện không còn tồn khả dụng để bổ sung.",
                remainingToReplenish = remaining,
                availableStock
            });

        var actualQuantity = Math.Min(request.Quantity, Math.Min(remaining, availableStock));

        roomInventory.Quantity = Math.Max(0, roomInventory.Quantity ?? 0) + actualQuantity;
        roomInventory.IsActive = true;
        if (!string.IsNullOrWhiteSpace(request.Note))
            roomInventory.Note = request.Note.Trim();

        equipment.InUseQuantity += actualQuantity;
        equipment.UpdatedAt = DateTime.UtcNow;

        record.ReplenishedQuantity += actualQuantity;
        if (record.ReplenishedQuantity >= Math.Max(1, record.Quantity))
            record.ReplenishedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(request.Note))
            record.ReplenishmentNote = request.Note.Trim();

        await _db.SaveChangesAsync();
        await SyncRoomCleaningStatusForLossAsync(record);
        await _db.SaveChangesAsync();

        var remainingAfter = ComputeRemainingToReplenish(record);

        await _auditTrail.WriteAsync(_db, User, Request, new AuditTrailEntry
        {
            ActionCode = "REPLENISH_LOSS_DAMAGE",
            ActionLabel = "Bổ sung vật tư cho biên bản mất/hỏng",
            Message = $"Đã bổ sung {actualQuantity} vật tư cho biên bản #{id}. Tổng đã bổ sung: {record.ReplenishedQuantity}/{record.Quantity}. Còn thiếu: {remainingAfter}.",
            EntityType = "LossAndDamage",
            EntityId = id,
            EntityLabel = $"Biên bản #{id}",
            Severity = remainingAfter == 0 ? "Success" : "Info",
            TableName = "LossAndDamages",
            RecordId = id,
            NewValue = $"{{\"replenishedQuantity\":{actualQuantity},\"totalReplenished\":{record.ReplenishedQuantity},\"remaining\":{remainingAfter},\"note\":\"{request.Note ?? ""}\"}}"
        });

        return Ok(new
        {
            message = remainingAfter == 0
                ? "Đã bổ sung đủ vật tư cho phòng."
                : $"Đã bổ sung {actualQuantity} và còn thiếu {remainingAfter}.",
            replenishedQuantity = actualQuantity,
            totalReplenishedQuantity = record.ReplenishedQuantity,
            remainingToReplenish = remainingAfter,
            roomInventoryQuantity = roomInventory.Quantity,
            availableStock = Math.Max(0, equipment.InStockQuantity)
        });
    }

    [HttpPost("batch-replenish")]
    [RequirePermission(PermissionCodes.ManageInventory)]
    public async Task<IActionResult> BatchReplenish([FromBody] BatchReplenishRequest request)
    {
        if (request.Items is null || request.Items.Count == 0)
            return BadRequest(new { message = "Danh sách vật tư không hợp lệ." });

        var lossIds = request.Items.Select(x => x.LossAndDamageId).Distinct().ToList();
        var records = await _db.LossAndDamages
            .Include(x => x.RoomInventory)
                .ThenInclude(ri => ri!.Equipment)
            .Include(x => x.RoomInventory)
                .ThenInclude(ri => ri!.Room)
            .Where(x => lossIds.Contains(x.Id))
            .ToListAsync();

        var events = new List<AuditLogGroupEvent>();
        int totalReplenished = 0;

        foreach (var reqItem in request.Items)
        {
            var record = records.FirstOrDefault(x => x.Id == reqItem.LossAndDamageId);
            if (record == null) continue;

            if (record.Status != "Confirmed") continue;
            if (!record.RoomInventoryId.HasValue || record.RoomInventory?.Equipment is null) continue;
            if (!record.RoomInventory.Equipment.IsActive) continue;

            var remaining = ComputeRemainingToReplenish(record);
            if (remaining <= 0) continue;

            var roomInventory = record.RoomInventory;
            var equipment = roomInventory.Equipment;
            var availableStock = Math.Max(0, equipment.InStockQuantity);
            if (availableStock <= 0) continue;

            var actualQuantity = Math.Min(reqItem.Quantity, Math.Min(remaining, availableStock));
            if (actualQuantity <= 0) continue;

            roomInventory.Quantity = Math.Max(0, roomInventory.Quantity ?? 0) + actualQuantity;
            roomInventory.IsActive = true;
            if (!string.IsNullOrWhiteSpace(reqItem.Note))
                roomInventory.Note = reqItem.Note.Trim();

            equipment.InUseQuantity += actualQuantity;
            equipment.UpdatedAt = DateTime.UtcNow;

            record.ReplenishedQuantity += actualQuantity;
            if (record.ReplenishedQuantity >= Math.Max(1, record.Quantity))
                record.ReplenishedAt = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(reqItem.Note))
                record.ReplenishmentNote = reqItem.Note.Trim();
            
            totalReplenished += actualQuantity;

            var roomNumber = roomInventory.Room?.RoomNumber ?? "N/A";

            events.Add(new AuditLogGroupEvent
            {
                EventId = Guid.NewGuid().ToString(),
                Timestamp = DateTime.UtcNow,
                ActionType = "UPDATE",
                EntityType = "LossAndDamage",
                Context = new { damageId = record.Id, equipmentId = equipment.Id, itemName = equipment.Name, roomNumber },
                Changes = new { quantityAdded = actualQuantity, note = reqItem.Note },
                Message = $"Bổ sung {actualQuantity} {equipment.Name} vào phòng {roomNumber}."
            });
        }

        if (totalReplenished == 0)
            return BadRequest(new { message = "Không có vật tư nào đủ điều kiện hoặc kho đã hết để bổ sung." });

        await _db.SaveChangesAsync();
        
        foreach (var record in records)
        {
            await SyncRoomCleaningStatusForLossAsync(record);
        }
        await _db.SaveChangesAsync();

        var distinctRooms = records
            .Where(r => r.RoomInventory?.Room != null)
            .Select(r => r.RoomInventory!.Room!.RoomNumber)
            .Distinct()
            .ToList();
        var roomText = distinctRooms.Count > 0 ? $" tại phòng {string.Join(", ", distinctRooms)}" : "";

        var auditLog = _auditLogGroup.CreateGroup(
            User,
            $"Bổ sung hàng loạt {totalReplenished} vật tư cho các biên bản đền bù{roomText}.",
            events);
        _db.AuditLogs.Add(auditLog);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"Đã bổ sung thành công {totalReplenished} vật tư." });
    }

}

public class CreateLossAndDamageRequest
{
    public int? BookingDetailId { get; set; }
    public int? RoomInventoryId { get; set; }
    public int Quantity { get; set; }
    public decimal PenaltyAmount { get; set; }
    public string? Description { get; set; }
    public string? Status { get; set; }
    public List<IFormFile>? Images { get; set; }
}

public class CreateHousekeepingLossAuditGroupRequest
{
    public string? RoomNumber { get; set; }
    public List<CreateHousekeepingLossAuditItemRequest> Items { get; set; } = [];
}

public class CreateHousekeepingLossAuditItemRequest
{
    public int LossAndDamageId { get; set; }
    public int RoomInventoryId { get; set; }
    public int Quantity { get; set; }
    public decimal PenaltyAmount { get; set; }
    public string? Description { get; set; }
}

public class UpdateLossAndDamageRequest
{
    public int Quantity { get; set; }
    public decimal PenaltyAmount { get; set; }
    public string? Description { get; set; }
    public string Status { get; set; } = null!;
    public List<IFormFile>? Images { get; set; }
    public string? KeepImagesJson { get; set; }
}

public class ReplenishLossAndDamageRequest
{
    public int Quantity { get; set; }
    public string? Note { get; set; }
}

public class BatchReplenishRequest
{
    public List<BatchReplenishItemRequest> Items { get; set; } = [];
}

public class BatchReplenishItemRequest
{
    public int LossAndDamageId { get; set; }
    public int Quantity { get; set; }
    public string? Note { get; set; }
}

public class BatchUpdateStatusRequest
{
    public List<int> LossAndDamageIds { get; set; } = [];
    public string Status { get; set; } = null!;
}
