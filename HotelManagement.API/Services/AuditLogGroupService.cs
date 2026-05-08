using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using HotelManagement.Core.DTOs;
using HotelManagement.Core.Helpers;
using HotelManagement.Core.Entities;

namespace HotelManagement.API.Services;

public sealed class AuditLogGroupEvent
{
    [JsonPropertyName("eventId")]
    public string EventId { get; set; } = Guid.NewGuid().ToString();
    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    [JsonPropertyName("actionType")]
    public string ActionType { get; set; } = "UPDATE";
    [JsonPropertyName("entityType")]
    public string EntityType { get; set; } = "System";
    [JsonPropertyName("context")]
    public object? Context { get; set; }
    [JsonPropertyName("changes")]
    public object? Changes { get; set; }
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;
}

public sealed class AuditLogGroupPayload
{
    [JsonPropertyName("actionLabel")]
    public string ActionLabel { get; set; } = string.Empty;

    [JsonPropertyName("payload")]
    public AuditLogDayPayload Payload { get; set; } = new();
}

public sealed class AuditLogSummary
{
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}

public interface IAuditLogGroupService
{
    AuditLog CreateSingle(
        ClaimsPrincipal? user,
        string summary,
        string actionType,
        string entityType,
        string message,
        object? context = null,
        object? changes = null,
        int? userIdOverride = null,
        string? roleNameOverride = null,
        DateTime? timestamp = null);

    AuditLog CreateGroup(
        ClaimsPrincipal? user,
        string summary,
        IEnumerable<AuditLogGroupEvent> events,
        int? userIdOverride = null,
        string? roleNameOverride = null,
        DateTime? logDateOverride = null);
}

public class AuditLogGroupService : IAuditLogGroupService
{
    public AuditLog CreateSingle(
        ClaimsPrincipal? user,
        string summary,
        string actionType,
        string entityType,
        string message,
        object? context = null,
        object? changes = null,
        int? userIdOverride = null,
        string? roleNameOverride = null,
        DateTime? timestamp = null)
    {
        return CreateGroup(
            user,
            summary,
            [
                new AuditLogGroupEvent
                {
                    EventId = Guid.NewGuid().ToString(),
                    Timestamp = timestamp ?? DateTime.UtcNow,
                    ActionType = actionType,
                    EntityType = entityType,
                    Context = context,
                    Changes = changes,
                    Message = message
                }
            ],
            userIdOverride,
            roleNameOverride,
            timestamp);
    }

    public AuditLog CreateGroup(
        ClaimsPrincipal? user,
        string summary,
        IEnumerable<AuditLogGroupEvent> events,
        int? userIdOverride = null,
        string? roleNameOverride = null,
        DateTime? logDateOverride = null)
    {
        var materializedEvents = events.ToList();
        var firstEvent = materializedEvents
            .OrderBy(x => x.Timestamp)
            .FirstOrDefault();

        var details = materializedEvents
            .OrderBy(x => x.Timestamp)
            .Select(x => new AuditLogDetailPayload
            {
                DetailId = x.EventId,
                Timestamp = x.Timestamp,
                Message = x.Message,
                Context = x.Context,
                Changes = x.Changes
            })
            .ToList();

        var action = new AuditLogActionPayload
        {
            ActionId = Guid.NewGuid().ToString(),
            Timestamp = firstEvent?.Timestamp ?? DateTime.UtcNow,
            ActionCode = firstEvent?.ActionType ?? "UPDATE",
            ActionLabel = summary,
            EntityType = firstEvent?.EntityType ?? "System",
            Message = summary,
            DetailCount = details.Count,
            Details = details,
            Context = firstEvent?.Context,
            Changes = firstEvent?.Changes
        };

        var payload = new AuditLogDayPayload
        {
            TotalActions = 1,
            Summary = new AuditLogSummaryPayload { Text = summary },
            Actions = [action]
        };

        var userId = userIdOverride;
        if (!userId.HasValue && user?.Identity?.IsAuthenticated == true)
        {
            userId = JwtHelper.GetUserId(user);
        }

        var roleName = roleNameOverride
            ?? user?.FindFirst(ClaimTypes.Role)?.Value
            ?? user?.FindFirst("role")?.Value
            ?? "System";

        var sourceDate = logDateOverride
            ?? (firstEvent?.Timestamp ?? DateTime.UtcNow);

        // Tính ngày theo múi giờ UTC+7 (Việt Nam) để log đúng ngày nghiệp vụ
        var vnTz = TimeZoneInfo.FindSystemTimeZoneById(
            OperatingSystem.IsWindows() ? "SE Asia Standard Time" : "Asia/Ho_Chi_Minh");
        var sourceUtc = sourceDate.Kind == DateTimeKind.Utc
            ? sourceDate
            : DateTime.SpecifyKind(sourceDate, DateTimeKind.Utc);
        var effectiveDate = TimeZoneInfo.ConvertTimeFromUtc(sourceUtc, vnTz).Date;

        return new AuditLog
        {
            UserId = userId,
            RoleName = roleName,
            LogDate = effectiveDate,
            LogData = JsonSerializer.Serialize(payload)
        };
    }
}
