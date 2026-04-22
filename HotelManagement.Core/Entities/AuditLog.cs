using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Core.Entities;

public class AuditLog
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string RoleName { get; set; } = null!;
    public DateTime LogDate { get; set; }
    public string LogData { get; set; } = null!;

    // Legacy write shape kept temporarily so existing controllers can continue
    // constructing AuditLog objects while AppDbContext normalizes them.
    [NotMapped]
    public string? Action { get; set; }

    [NotMapped]
    public string? TableName { get; set; }

    [NotMapped]
    public int RecordId { get; set; }

    [NotMapped]
    public string? OldValue { get; set; }

    [NotMapped]
    public string? NewValue { get; set; }

    [NotMapped]
    public string? UserAgent { get; set; }

    [NotMapped]
    public DateTime? CreatedAt { get; set; }

    // Navigation
    public User? User { get; set; }
}
