using HotelManagement.API.Services;
using HotelManagement.Core.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardAggregationService _dashboardAggregationService;

    public DashboardController(IDashboardAggregationService dashboardAggregationService)
    {
        _dashboardAggregationService = dashboardAggregationService;
    }

    /// <summary>
    /// [Legacy] Trả về tổng quan đầy đủ — chỉ dùng cho Admin.
    /// Dùng GET /my thay thế cho các role khác.
    /// </summary>
    [HttpGet("overview")]
    [RequirePermission(PermissionCodes.ViewDashboard)]
    public async Task<IActionResult> GetOverview(CancellationToken cancellationToken)
    {
        var data = await _dashboardAggregationService.GetOverviewAsync(cancellationToken);
        return Ok(new { message = "Lấy dữ liệu dashboard thành công.", data });
    }

    /// <summary>
    /// Trả về snapshot dashboard phù hợp với role đang đăng nhập.
    /// Snapshot tự động tạo nếu chưa có hôm nay.
    /// </summary>
    [HttpGet("my")]
    [RequirePermission(PermissionCodes.ViewDashboard)]
    public async Task<IActionResult> GetMyDashboard(CancellationToken cancellationToken)
    {
        var roleName = User.FindFirst("role")?.Value
                    ?? User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value
                    ?? "Admin";

        var result = await _dashboardAggregationService.GetRoleSnapshotAsync(roleName, cancellationToken);
        return Ok(new
        {
            success = true,
            message = "Lấy dữ liệu dashboard thành công.",
            data = result
        });
    }

    /// <summary>
    /// Buộc refresh snapshot cho một hoặc nhiều role (Admin/Manager only).
    /// Body: { "roles": ["Admin","Accountant"] } hoặc để trống để refresh tất cả.
    /// </summary>
    [HttpPost("refresh")]
    [RequirePermission(PermissionCodes.ViewDashboard)]
    public async Task<IActionResult> RefreshSnapshots([FromBody] RefreshSnapshotRequest? request, CancellationToken cancellationToken)
    {
        var roleName = User.FindFirst("role")?.Value
                    ?? User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value
                    ?? string.Empty;

        if (roleName is not ("Admin" or "Manager"))
            return Forbid();

        var roles = (request?.Roles == null || request.Roles.Length == 0)
            ? SnapshotRoles.All
            : request.Roles;

        await _dashboardAggregationService.RefreshSnapshotsAsync(roles, cancellationToken);
        return Ok(new
        {
            success = true,
            message = $"Đã refresh snapshot cho: {string.Join(", ", roles)}.",
            roles
        });
    }
}

public class RefreshSnapshotRequest
{
    /// <summary>Danh sách role cần refresh. Để trống = refresh tất cả.</summary>
    public string[]? Roles { get; set; }
}
