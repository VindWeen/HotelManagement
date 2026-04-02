using HotelManagement.Core.Authorization;
using HotelManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EquipmentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public EquipmentsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [RequirePermission(PermissionCodes.ManageInventory)]
    public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = false)
    {
        var query = _db.Equipments.AsNoTracking().AsQueryable();

        if (!includeInactive)
            query = query.Where(e => e.IsActive);

        var items = await query
            .OrderBy(e => e.Name)
            .Select(e => new
            {
                e.Id,
                e.ItemCode,
                e.Name,
                e.Category,
                e.Unit,
                e.TotalQuantity,
                e.InUseQuantity,
                e.DamagedQuantity,
                e.LiquidatedQuantity,
                e.InStockQuantity,
                e.BasePrice,
                e.DefaultPriceIfLost,
                e.Supplier,
                e.IsActive
                ,
                e.ImageUrl
            })
            .ToListAsync();

        return Ok(new { data = items, total = items.Count });
    }

    [HttpPatch("{id:int}/deduct")]
    public async Task<IActionResult> Deduct(int id, [FromBody] DeductEquipmentRequest request)
    {
        var equipment = await _db.Equipments.FindAsync(id);
        if (equipment is null) return NotFound(new { message = $"Không tìm thấy vật tư #{id}." });

        if (equipment.InUseQuantity >= request.Quantity)
        {
            equipment.InUseQuantity -= request.Quantity;
        }
        else
        {
            equipment.InUseQuantity = 0;
        }

        equipment.DamagedQuantity += request.Quantity;

        if (request.AuditLog) {
            var userId = HotelManagement.Core.Helpers.JwtHelper.GetUserId(User);
            _db.AuditLogs.Add(new HotelManagement.Core.Entities.AuditLog
            {
                UserId = userId,
                Action = "DEDUCT_EQUIPMENT",
                TableName = "Equipments",
                RecordId = id,
                OldValue = null,
                NewValue = $"{{\"quantity\": {request.Quantity}, \"reason\": \"{request.Reason}\"}}",
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedAt = DateTime.UtcNow
            });
        }
        
        await _db.SaveChangesAsync();
        return Ok(new { message = "Khấu trừ thành công" });
    }
}

public record DeductEquipmentRequest(int Quantity, string Reason, bool AuditLog);
