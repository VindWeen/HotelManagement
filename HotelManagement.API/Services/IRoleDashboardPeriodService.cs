using HotelManagement.Core.DTOs;

namespace HotelManagement.API.Services;

/// <summary>
/// Service quản lý dashboard theo role + kỳ (DAILY/WEEKLY/MONTHLY).
/// Mỗi role có 1 dòng / kỳ trong Role_Dashboard_Period_States.
/// </summary>
public interface IRoleDashboardPeriodService
{
    /// <summary>Lấy dashboard của 1 role theo kỳ hoặc kỳ hiện tại.</summary>
    Task<DashboardPeriodResponseDto?> GetDashboardAsync(
        string roleName,
        string periodType,
        string? periodKey,
        bool currentOnly,
        CancellationToken cancellationToken = default);

    /// <summary>Lấy lịch sử các kỳ của 1 role (tối đa 36 kỳ).</summary>
    Task<IReadOnlyList<DashboardHistoryItemDto>> GetHistoryAsync(
        string roleName,
        string periodType,
        int take,
        CancellationToken cancellationToken = default);

    /// <summary>Rebuild dashboard của 1 role/period tại thời điểm occurredAtUtc.</summary>
    Task RebuildDashboardAsync(
        string roleName,
        string periodType,
        DateTime occurredAtUtc,
        int? updatedByUserId,
        string eventType,
        int? eventRefId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Tự động resolve các role bị ảnh hưởng bởi eventType và rebuild
    /// dashboard cho tất cả DefaultEventPeriods (DAILY, WEEKLY, MONTHLY).
    /// </summary>
    Task RebuildAffectedDashboardsAsync(
        string eventType,
        DateTime occurredAtUtc,
        int? updatedByUserId,
        int? eventRefId,
        CancellationToken cancellationToken = default);

    /// <summary>Rebuild toàn bộ roles/periods hiện tại (dùng cho cron job hoặc manual).</summary>
    Task RebuildAllCurrentDashboardsAsync(
        int? updatedByUserId,
        CancellationToken cancellationToken = default);
}
