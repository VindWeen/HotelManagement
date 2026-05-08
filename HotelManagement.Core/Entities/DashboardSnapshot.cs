using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Core.Entities;

[Table("Dashboard_Snapshots")]
public class DashboardSnapshot
{
    [Key]
    public int Id { get; set; }

    /// <summary>Tên role: Admin, Manager, Accountant, Receptionist, Housekeeping, ...</summary>
    [MaxLength(100)]
    public string RoleName { get; set; } = string.Empty;

    /// <summary>Ngày UTC snapshot (date-only, để unique theo role+ngày)</summary>
    public DateTime SnapshotDate { get; set; }

    /// <summary>JSON payload đã serialize theo role</summary>
    public string SnapshotData { get; set; } = "{}";

    /// <summary>Thời điểm tính/refresh gần nhất (UTC)</summary>
    public DateTime ComputedAt { get; set; } = DateTime.UtcNow;
}
