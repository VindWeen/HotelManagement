using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
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
    [JsonPropertyName("TotalEvents")]
    public int TotalEvents { get; set; }
    [JsonPropertyName("Summary")]
    public AuditLogSummary Summary { get; set; } = new();
    [JsonPropertyName("Events")]
    public List<AuditLogGroupEvent> Events { get; set; } = [];
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
        var firstTimestamp = materializedEvents
            .OrderBy(x => x.Timestamp)
            .Select(x => x.Timestamp)
            .FirstOrDefault();

        var payload = new AuditLogGroupPayload
        {
            TotalEvents = materializedEvents.Count,
            Summary = new AuditLogSummary { Text = summary },
            Events = materializedEvents
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
            ?? (firstTimestamp == default ? DateTime.UtcNow : firstTimestamp);
        var effectiveDate = sourceDate.Date;

        return new AuditLog
        {
            UserId = userId,
            RoleName = roleName,
            LogDate = effectiveDate,
            LogData = JsonSerializer.Serialize(payload)
        };
    }
}
