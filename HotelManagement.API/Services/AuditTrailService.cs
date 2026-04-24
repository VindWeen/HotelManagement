using HotelManagement.Infrastructure.Data;
using System.Security.Claims;
using HotelManagement.Core.Helpers;

namespace HotelManagement.API.Services;

public sealed class AuditTrailEntry
{
    public string ActionCode { get; set; } = string.Empty;
    public string ActionLabel { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public int? EntityId { get; set; }
    public string? EntityLabel { get; set; }
    public string Severity { get; set; } = "Info";
    public string TableName { get; set; } = string.Empty;
    public int? RecordId { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? Metadata { get; set; }
}

public interface IAuditTrailService
{
    Task WriteAsync(
        AppDbContext db,
        ClaimsPrincipal user,
        HttpRequest request,
        AuditTrailEntry entry,
        CancellationToken cancellationToken = default);
}

public class AuditTrailService : IAuditTrailService
{
    private readonly IActivityLogService _activityLog;
    private readonly IAuditLogGroupService _auditLogGroup;

    public AuditTrailService(IActivityLogService activityLog, IAuditLogGroupService auditLogGroup)
    {
        _activityLog = activityLog;
        _auditLogGroup = auditLogGroup;
    }

    public async Task WriteAsync(
        AppDbContext db,
        ClaimsPrincipal user,
        HttpRequest request,
        AuditTrailEntry entry,
        CancellationToken cancellationToken = default)
    {
        int? userId = null;
        if (user.Identity?.IsAuthenticated == true)
        {
            try { userId = JwtHelper.GetUserId(user); } catch { }
        }
        var roleName = user.FindFirst(ClaimTypes.Role)?.Value ?? user.FindFirst("role")?.Value;

        await _activityLog.LogAsync(
            actionCode: entry.ActionCode,
            actionLabel: entry.ActionLabel,
            message: entry.Message,
            entityType: entry.EntityType,
            entityId: entry.EntityId,
            entityLabel: entry.EntityLabel,
            severity: entry.Severity,
            userId: userId,
            roleName: roleName,
            metadata: entry.Metadata
        );

        db.AuditLogs.Add(_auditLogGroup.CreateSingle(
            user,
            summary: entry.Message,
            actionType: entry.ActionCode,
            entityType: entry.EntityType,
            message: entry.Message,
            context: new
            {
                tableName = entry.TableName,
                recordId = entry.RecordId ?? entry.EntityId,
                entityLabel = entry.EntityLabel,
                userAgent = request.Headers["User-Agent"].ToString()
            },
            changes: new
            {
                oldData = ParseJsonIfPossible(entry.OldValue),
                newData = ParseJsonIfPossible(entry.NewValue),
                metadata = ParseJsonIfPossible(entry.Metadata)
            },
            userIdOverride: userId,
            roleNameOverride: roleName
        ));

        await db.SaveChangesAsync(cancellationToken);
    }

    private static object? ParseJsonIfPossible(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;

        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(raw);
            return doc.RootElement.Clone();
        }
        catch
        {
            return raw;
        }
    }
}

