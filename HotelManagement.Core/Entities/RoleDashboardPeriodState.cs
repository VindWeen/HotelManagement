using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Core.Entities;

/// <summary>
/// Lưu dashboard snapshot theo role + kỳ thời gian (DAILY/WEEKLY/MONTHLY).
/// Mỗi role có 1 dòng / kỳ. Service rebuild khi có sự kiện nghiệp vụ.
/// </summary>
[Table("Role_Dashboard_Period_States")]
public class RoleDashboardPeriodState
{
    [Key]
    public int Id { get; set; }

    // ── Role info ──────────────────────────────────────────────
    public int RoleId { get; set; }

    [MaxLength(100)]
    public string RoleName { get; set; } = string.Empty;

    // ── Dashboard identity ─────────────────────────────────────
    [MaxLength(100)]
    public string DashboardCode { get; set; } = string.Empty;   // ADMIN_DASHBOARD, WAREHOUSE_DASHBOARD...

    [MaxLength(255)]
    public string DashboardTitle { get; set; } = string.Empty;

    // ── Period info ────────────────────────────────────────────
    [MaxLength(20)]
    public string PeriodType { get; set; } = string.Empty;      // DAILY / WEEKLY / MONTHLY / QUARTERLY / YEARLY

    [MaxLength(30)]
    public string PeriodKey { get; set; } = string.Empty;       // "2026-05" / "2026-W20" / "2026-05-13"

    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }

    // ── JSON payload ───────────────────────────────────────────
    public string DashboardJson { get; set; } = "{}";           // số liệu chính kỳ hiện tại
    public string? ComparisonJson { get; set; }                 // so sánh với kỳ trước (cache)

    // ── Trạng thái kỳ ─────────────────────────────────────────
    [MaxLength(20)]
    public string Status { get; set; } = "OPEN";                // OPEN / CLOSED / REBUILT / CORRECTED

    public bool IsCurrent { get; set; } = false;                // true = kỳ hiện tại đang OPEN

    // ── Event tracking ─────────────────────────────────────────
    [MaxLength(100)]
    public string? LastEventType { get; set; }                  // DAMAGE_REPORTED, MANUAL_REBUILD, ...

    [MaxLength(100)]
    public string? LastEventSource { get; set; }                // tên service đã trigger

    public int? LastEventRefId { get; set; }                    // ID bản ghi nguồn

    // ── Optimistic concurrency ─────────────────────────────────
    public int Version { get; set; } = 1;

    // ── Timestamps ────────────────────────────────────────────
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAt { get; set; }

    // ── Audit ─────────────────────────────────────────────────
    public int? UpdatedBy { get; set; }                         // FK Users.id

    // ── Navigation ────────────────────────────────────────────
    [ForeignKey(nameof(RoleId))]
    public Role? Role { get; set; }

    [ForeignKey(nameof(UpdatedBy))]
    public User? UpdatedByUser { get; set; }
}
