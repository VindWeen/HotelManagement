using System.Linq.Expressions;
using System.Security.Claims;
using System.Text.Json;
using ClosedXML.Excel;
using HotelManagement.Core.Authorization;
using HotelManagement.Core.Entities;
using HotelManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AuditLogsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuditLogsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("history")]
    [RequirePermission(PermissionCodes.ViewAuditLogs)]
    public async Task<IActionResult> GetHistory(
        [FromQuery] int? userId,
        [FromQuery] DateTime? date,
        [FromQuery] int? month,
        [FromQuery] int? year,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = BuildScopedQuery(userId, date, month, year);

        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderByDescending(x => x.LogDate)
            .ThenByDescending(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new AuditLogRow
            {
                Id = x.Id,
                UserId = x.UserId,
                RoleName = x.RoleName,
                LogDate = x.LogDate,
                LogData = x.LogData,
                UserName = x.User != null ? x.User.FullName : "Hệ thống"
            })
            .ToListAsync(cancellationToken);

        var items = rows
            .Select(ParseHistoryItem)
            .Where(x => x is not null)
            .Cast<object>()
            .ToList();

        return Ok(new
        {
            data = items,
            pagination = new
            {
                page,
                pageSize,
                total,
                totalPages = (int)Math.Ceiling(total / (double)pageSize)
            }
        });
    }

    [HttpGet("filter-options")]
    [RequirePermission(PermissionCodes.ViewAuditLogs)]
    public async Task<IActionResult> GetFilterOptions(CancellationToken cancellationToken = default)
    {
        var currentRole = GetCurrentRole();
        var usersQuery = _db.Users
            .AsNoTracking()
            .Where(x => x.RoleId != null && x.Role != null);

        if (!CanViewAllRoles(currentRole))
        {
            var normalized = currentRole ?? string.Empty;
            usersQuery = usersQuery.Where(x => x.Role != null && x.Role.Name == normalized);
        }

        var users = await usersQuery
            .Select(x => new
            {
                userId = x.Id,
                userName = x.FullName,
                roleName = x.Role != null ? x.Role.Name : string.Empty
            })
            .OrderBy(x => x.roleName)
            .ThenBy(x => x.userName)
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            users,
            scope = new
            {
                role = currentRole,
                canViewAll = CanViewAllRoles(currentRole)
            }
        });
    }

    [HttpGet("export")]
    [RequirePermission(PermissionCodes.ViewAuditLogs)]
    public async Task<IActionResult> ExportFiltered(
        [FromQuery] int? userId,
        [FromQuery] DateTime? date,
        [FromQuery] int? month,
        [FromQuery] int? year,
        CancellationToken cancellationToken = default)
    {
        var query = BuildScopedQuery(userId, date, month, year);
        var rows = await query
            .OrderByDescending(x => x.LogDate)
            .ThenByDescending(x => x.Id)
            .Select(x => new AuditLogRow
            {
                Id = x.Id,
                RoleName = x.RoleName,
                LogDate = x.LogDate,
                LogData = x.LogData,
                UserName = x.User != null ? x.User.FullName : "Hệ thống"
            })
            .ToListAsync(cancellationToken);

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("AuditLogs");
        WriteFilteredExport(worksheet, rows);
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;

        return File(
            stream.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"audit-logs-filtered-{DateTime.UtcNow:yyyyMMddHHmmss}.xlsx");
    }

    [HttpGet("export-all")]
    [RequirePermission(PermissionCodes.ViewAuditLogs)]
    public async Task<IActionResult> ExportAll(CancellationToken cancellationToken = default)
    {
        var currentRole = GetCurrentRole();
        var rows = await _db.AuditLogs
            .AsNoTracking()
            .Where(BuildRoleScopePredicate(currentRole))
            .OrderByDescending(x => x.LogDate)
            .ThenByDescending(x => x.Id)
            .Select(x => new AuditLogRow
            {
                Id = x.Id,
                RoleName = x.RoleName,
                LogDate = x.LogDate,
                LogData = x.LogData,
                UserName = x.User != null ? x.User.FullName : "Hệ thống"
            })
            .ToListAsync(cancellationToken);

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("AuditLogsAll");
        WriteFullExport(worksheet, rows);
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;

        return File(
            stream.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"audit-logs-all-{DateTime.UtcNow:yyyyMMddHHmmss}.xlsx");
    }

    private IQueryable<AuditLog> BuildScopedQuery(int? userId, DateTime? date, int? month, int? year)
    {
        var currentRole = GetCurrentRole();
        var query = _db.AuditLogs
            .AsNoTracking()
            .Where(BuildRoleScopePredicate(currentRole));

        if (userId.HasValue)
        {
            query = query.Where(x => x.UserId == userId);
        }

        if (date.HasValue)
        {
            var targetDate = date.Value.Date;
            query = query.Where(x => x.LogDate == targetDate);
        }

        if (month.HasValue)
        {
            query = query.Where(x => x.LogDate.Month == month.Value);
        }

        if (year.HasValue)
        {
            query = query.Where(x => x.LogDate.Year == year.Value);
        }

        return query;
    }

    private static void WriteFilteredExport(IXLWorksheet worksheet, IEnumerable<AuditLogRow> rows)
    {
        worksheet.Cell(1, 1).Value = "Ngày";
        worksheet.Cell(1, 2).Value = "Nhân viên";
        worksheet.Cell(1, 3).Value = "Chức vụ";
        worksheet.Cell(1, 4).Value = "Thời gian";
        worksheet.Cell(1, 5).Value = "Hành động";
        worksheet.Cell(1, 6).Value = "Nội dung";

        var rowIndex = 2;
        foreach (var row in rows)
        {
            var payload = ParsePayload((string)row.LogData);
            foreach (var evt in payload.Events.OrderBy(x => x.Timestamp))
            {
                worksheet.Cell(rowIndex, 1).Value = ((DateTime)row.LogDate).ToString("dd/MM/yyyy");
                worksheet.Cell(rowIndex, 2).Value = (string)row.UserName;
                worksheet.Cell(rowIndex, 3).Value = (string)row.RoleName;
                worksheet.Cell(rowIndex, 4).Value = evt.Timestamp.ToLocalTime().ToString("HH:mm:ss");
                worksheet.Cell(rowIndex, 5).Value = NormalizeActionLabel(evt.ActionType);
                worksheet.Cell(rowIndex, 6).Value = evt.Message;
                rowIndex++;
            }
        }

        worksheet.Columns().AdjustToContents();
    }

    private static void WriteFullExport(IXLWorksheet worksheet, IEnumerable<AuditLogRow> rows)
    {
        worksheet.Cell(1, 1).Value = "ID Nhóm";
        worksheet.Cell(1, 2).Value = "Ngày lưu log";
        worksheet.Cell(1, 3).Value = "Tên nhân viên";
        worksheet.Cell(1, 4).Value = "Chức vụ";
        worksheet.Cell(1, 5).Value = "Thời gian sự kiện";
        worksheet.Cell(1, 6).Value = "Loại hành động";
        worksheet.Cell(1, 7).Value = "Loại đối tượng";
        worksheet.Cell(1, 8).Value = "Nội dung chi tiết";

        var rowIndex = 2;
        foreach (var row in rows)
        {
            var payload = ParsePayload((string)row.LogData);
            foreach (var evt in payload.Events.OrderBy(x => x.Timestamp))
            {
                worksheet.Cell(rowIndex, 1).Value = (int)row.Id;
                worksheet.Cell(rowIndex, 2).Value = ((DateTime)row.LogDate).ToString("dd/MM/yyyy");
                worksheet.Cell(rowIndex, 3).Value = (string)row.UserName;
                worksheet.Cell(rowIndex, 4).Value = (string)row.RoleName;
                worksheet.Cell(rowIndex, 5).Value = evt.Timestamp.ToLocalTime().ToString("dd/MM/yyyy HH:mm:ss");
                worksheet.Cell(rowIndex, 6).Value = NormalizeActionLabel(evt.ActionType);
                worksheet.Cell(rowIndex, 7).Value = evt.EntityType;
                worksheet.Cell(rowIndex, 8).Value = evt.Message;
                rowIndex++;
            }
        }

        worksheet.Columns().AdjustToContents();
    }

    private object? ParseHistoryItem(AuditLogRow row)
    {
        var payload = ParsePayload((string)row.LogData);
        if (payload.Events.Count == 0 && string.IsNullOrWhiteSpace(payload.Summary.Text))
        {
            return null;
        }

        return new
        {
            id = (int)row.Id,
            userId = (int?)row.UserId,
            userName = (string)row.UserName,
            roleName = (string)row.RoleName,
            logDate = ((DateTime)row.LogDate).ToString("yyyy-MM-dd"),
            summary = payload.Summary.Text,
            totalEvents = payload.TotalEvents,
            events = payload.Events
                .OrderBy(x => x.Timestamp)
                .Select(x => new
                {
                    eventId = x.EventId,
                    time = x.Timestamp.ToLocalTime().ToString("HH:mm:ss"),
                    timestamp = x.Timestamp,
                    actionType = NormalizeActionLabel(x.ActionType),
                    entityType = x.EntityType,
                    message = x.Message
                })
        };
    }

    private static AuditLogPayloadDto ParsePayload(string logData)
    {
        if (string.IsNullOrWhiteSpace(logData))
        {
            return new AuditLogPayloadDto();
        }

        try
        {
            return JsonSerializer.Deserialize<AuditLogPayloadDto>(logData, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new AuditLogPayloadDto();
        }
        catch
        {
            return new AuditLogPayloadDto
            {
                TotalEvents = 1,
                Summary = new AuditLogSummaryDto { Text = "Không thể phân tích log_data." },
                Events =
                [
                    new AuditLogEventDto
                    {
                        EventId = Guid.NewGuid().ToString(),
                        Timestamp = DateTime.UtcNow,
                        ActionType = "UPDATE",
                        EntityType = "System",
                        Message = logData
                    }
                ]
            };
        }
    }

    private string GetCurrentRole()
    {
        return User.FindFirst(ClaimTypes.Role)?.Value
            ?? User.FindFirst("role")?.Value
            ?? string.Empty;
    }

    private static bool CanViewAllRoles(string? roleName)
    {
        return string.Equals(roleName, "Admin", StringComparison.OrdinalIgnoreCase)
            || string.Equals(roleName, "Manager", StringComparison.OrdinalIgnoreCase);
    }

    private static Expression<Func<AuditLog, bool>> BuildRoleScopePredicate(string? roleName)
    {
        if (CanViewAllRoles(roleName))
        {
            return _ => true;
        }

        var normalized = roleName ?? string.Empty;
        return x => x.RoleName == normalized;
    }

    private static string NormalizeActionLabel(string actionType)
    {
        if (string.Equals(actionType, "CREATE", StringComparison.OrdinalIgnoreCase)) return "POST";
        if (string.Equals(actionType, "UPDATE", StringComparison.OrdinalIgnoreCase)) return "PUT";
        return actionType?.ToUpperInvariant() ?? "PUT";
    }

    private sealed class AuditLogPayloadDto
    {
        public int TotalEvents { get; set; }
        public AuditLogSummaryDto Summary { get; set; } = new();
        public List<AuditLogEventDto> Events { get; set; } = [];
    }

    private sealed class AuditLogSummaryDto
    {
        public string Text { get; set; } = string.Empty;
    }

    private sealed class AuditLogEventDto
    {
        public string EventId { get; set; } = Guid.NewGuid().ToString();
        public DateTime Timestamp { get; set; }
        public string ActionType { get; set; } = "UPDATE";
        public string EntityType { get; set; } = "System";
        public string Message { get; set; } = string.Empty;
    }

    private sealed class AuditLogRow
    {
        public int Id { get; set; }
        public int? UserId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public DateTime LogDate { get; set; }
        public string LogData { get; set; } = string.Empty;
        public string UserName { get; set; } = "Hệ thống";
    }
}
