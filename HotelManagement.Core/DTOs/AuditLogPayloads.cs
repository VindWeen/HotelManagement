using System.Text.Json.Serialization;

namespace HotelManagement.Core.DTOs;

public sealed class AuditLogDayPayload
{
    [JsonPropertyName("version")]
    public int Version { get; set; } = 2;

    [JsonPropertyName("totalActions")]
    public int TotalActions { get; set; }

    [JsonPropertyName("summary")]
    public AuditLogSummaryPayload Summary { get; set; } = new();

    [JsonPropertyName("actions")]
    public List<AuditLogActionPayload> Actions { get; set; } = [];
}

public sealed class AuditLogSummaryPayload
{
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}

public sealed class AuditLogActionPayload
{
    [JsonPropertyName("actionId")]
    public string ActionId { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("actionCode")]
    public string ActionCode { get; set; } = "UPDATE";

    [JsonPropertyName("actionLabel")]
    public string ActionLabel { get; set; } = string.Empty;

    [JsonPropertyName("entityType")]
    public string EntityType { get; set; } = "System";

    [JsonPropertyName("entityId")]
    public int? EntityId { get; set; }

    [JsonPropertyName("entityLabel")]
    public string? EntityLabel { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("detailCount")]
    public int DetailCount { get; set; }

    [JsonPropertyName("details")]
    public List<AuditLogDetailPayload> Details { get; set; } = [];

    [JsonPropertyName("context")]
    public object? Context { get; set; }

    [JsonPropertyName("changes")]
    public object? Changes { get; set; }
}

public sealed class AuditLogDetailPayload
{
    [JsonPropertyName("detailId")]
    public string DetailId { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("context")]
    public object? Context { get; set; }

    [JsonPropertyName("changes")]
    public object? Changes { get; set; }
}
