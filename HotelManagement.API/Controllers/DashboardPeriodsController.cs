using System.Security.Claims;
using HotelManagement.API.Services;
using HotelManagement.Core.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelManagement.API.Controllers;

[Route("api/dashboard-periods")]
[ApiController]
[Authorize]
public class DashboardPeriodsController : ControllerBase
{
    private readonly IRoleDashboardPeriodService _dashboardService;

    public DashboardPeriodsController(IRoleDashboardPeriodService dashboardService)
        => _dashboardService = dashboardService;

    /// <summary>GET dashboard kỳ hiện tại của role (mặc định MONTHLY).</summary>
    [HttpGet("current")]
    public async Task<IActionResult> GetCurrentDashboard(
        [FromQuery] string? roleName,
        [FromQuery] string periodType = "MONTHLY",
        CancellationToken cancellationToken = default)
    {
        var resolvedRole = ResolveRoleName(roleName);
        var dashboard = await _dashboardService.GetDashboardAsync(
            resolvedRole, periodType, periodKey: null, currentOnly: true, cancellationToken);

        return dashboard == null
            ? NotFound(new { message = "Không tìm thấy dashboard hiện tại." })
            : Ok(dashboard);
    }

    /// <summary>GET dashboard theo kỳ cụ thể (periodKey: "2026-05", "2026-W20", ...).</summary>
    [HttpGet("{roleName}/{periodType}/{periodKey}")]
    public async Task<IActionResult> GetDashboardByPeriod(
        string roleName, string periodType, string periodKey,
        CancellationToken cancellationToken = default)
    {
        var dashboard = await _dashboardService.GetDashboardAsync(
            roleName, periodType, periodKey, currentOnly: false, cancellationToken);

        return dashboard == null
            ? NotFound(new { message = "Không tìm thấy dashboard theo kỳ." })
            : Ok(dashboard);
    }

    /// <summary>GET lịch sử kỳ của 1 role (tối đa 36 kỳ).</summary>
    [HttpGet("{roleName}/{periodType}/history")]
    public async Task<IActionResult> GetHistory(
        string roleName, string periodType,
        [FromQuery] int take = 12,
        CancellationToken cancellationToken = default)
    {
        var items = await _dashboardService.GetHistoryAsync(roleName, periodType, take, cancellationToken);
        return Ok(items);
    }

    /// <summary>POST rebuild dashboard 1 role/period theo thời điểm.</summary>
    [HttpPost("rebuild")]
    public async Task<IActionResult> RebuildDashboard(
        [FromBody] DashboardRebuildRequestDto request,
        CancellationToken cancellationToken = default)
    {
        await _dashboardService.RebuildDashboardAsync(
            request.RoleName, request.PeriodType,
            request.OccurredAtUtc ?? DateTime.UtcNow,
            ResolveUserId(), "MANUAL_REBUILD", null, cancellationToken);

        return Ok(new { message = "Đã rebuild dashboard theo kỳ." });
    }

    /// <summary>POST rebuild toàn bộ dashboard kỳ hiện tại (tất cả roles).</summary>
    [HttpPost("rebuild-current")]
    public async Task<IActionResult> RebuildAllCurrent(CancellationToken cancellationToken = default)
    {
        await _dashboardService.RebuildAllCurrentDashboardsAsync(ResolveUserId(), cancellationToken);
        return Ok(new { message = "Đã cập nhật dữ liệu Dashboard cho kỳ hiện tại thành công." });
    }

    [AllowAnonymous]
    [HttpGet("test-rebuild")]
    public async Task<IActionResult> TestRebuild(CancellationToken cancellationToken = default)
    {
        await _dashboardService.RebuildAllCurrentDashboardsAsync(null, cancellationToken);
        return Ok(new { message = "Rebuild OK" });
    }

    /// <summary>POST trigger rebuild từ sự kiện nghiệp vụ (DAMAGE_REPORTED, ...).</summary>
    [HttpPost("events/rebuild-affected")]
    public async Task<IActionResult> RebuildAffectedByEvent(
        [FromBody] DashboardEventRequestDto request,
        CancellationToken cancellationToken = default)
    {
        await _dashboardService.RebuildAffectedDashboardsAsync(
            request.EventType,
            request.OccurredAtUtc ?? DateTime.UtcNow,
            ResolveUserId(), request.RefId, cancellationToken);

        return Ok(new { message = "Đã cập nhật các dashboard bị ảnh hưởng bởi sự kiện." });
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private string ResolveRoleName(string? requested)
    {
        if (!string.IsNullOrWhiteSpace(requested)) return requested.Trim();
        return User.FindFirst(ClaimTypes.Role)?.Value ?? "Guest";
    }

    private int? ResolveUserId()
    {
        var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(raw, out var id) ? id : null;
    }
}
