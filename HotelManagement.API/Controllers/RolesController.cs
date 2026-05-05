using HotelManagement.API.Services;
using HotelManagement.Core.Authorization;
using HotelManagement.Core.Entities;
using HotelManagement.Core.Helpers;
using HotelManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IActivityLogService _activityLog;
    private readonly ISessionInvalidationService _sessionInvalidation;

    public RolesController(
        AppDbContext db,
        IActivityLogService activityLog,
        ISessionInvalidationService sessionInvalidation)
    {
        _db = db;
        _activityLog = activityLog;
        _sessionInvalidation = sessionInvalidation;
    }

    [HttpGet]
    [RequirePermission(PermissionCodes.ViewRoles)]
    public async Task<IActionResult> GetAll()
    {
        var roles = await _db.Roles
            .AsNoTracking()
            .OrderBy(r => r.Id)
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.Description
            })
            .ToListAsync();

        return Ok(new { data = roles, total = roles.Count });
    }

    [HttpGet("{id:int}")]
    [RequirePermission(PermissionCodes.ViewRoles)]
    public async Task<IActionResult> GetById(int id)
    {
        var role = await _db.Roles
            .AsNoTracking()
            .Where(r => r.Id == id)
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.Description,
                Permissions = r.RolePermissions
                    .Select(rp => new
                    {
                        rp.Permission.Id,
                        rp.Permission.Name,
                        rp.Permission.PermissionCode
                    })
                    .OrderBy(p => p.Name)
                    .ThenBy(p => p.Name)
                    .ToList()
            })
            .FirstOrDefaultAsync();

        if (role is null)
            return NotFound(new { message = $"Không tìm thấy role #{id}." });

        return Ok(role);
    }

    [HttpPost("assign-permission")]
    [RequirePermission(PermissionCodes.EditRoles)]
    public async Task<IActionResult> AssignPermission([FromBody] AssignPermissionRequest request)
    {
        var role = await _db.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.Id == request.RoleId);
        if (role is null)
            return NotFound(new { message = $"Role #{request.RoleId} không tồn tại." });

        if (IsSystemProtectedRole(role.Name))
            return BadRequest(new { message = $"Không cho phép chỉnh phân quyền trực tiếp cho vai trò '{role.Name}'." });

        var permissionExists = await _db.Permissions.AnyAsync(p => p.Id == request.PermissionId);
        if (!permissionExists)
            return NotFound(new { message = $"Permission #{request.PermissionId} không tồn tại." });

        var existing = await _db.RolePermissions
            .FirstOrDefaultAsync(rp =>
                rp.RoleId == request.RoleId &&
                rp.PermissionId == request.PermissionId);

        if (request.Grant)
        {
            if (existing is null)
            {
                _db.RolePermissions.Add(new RolePermission
                {
                    RoleId = request.RoleId,
                    PermissionId = request.PermissionId
                });

                var currentUserId = JwtHelper.GetUserId(User);
                _db.AuditLogs.Add(new AuditLog
                {
                    UserId = currentUserId,
                    Action = "GRANT_PERMISSION",
                    TableName = "Role_Permissions",
                    RecordId = request.RoleId,
                    OldValue = null,
                    NewValue = $"{{\"roleId\": {request.RoleId}, \"permissionId\": {request.PermissionId}}}",
                    UserAgent = Request.Headers["User-Agent"].ToString(),
                    CreatedAt = DateTime.UtcNow
                });

                await _db.SaveChangesAsync();

                var permissionName = (await _db.Permissions.FindAsync(request.PermissionId))?.Name ?? $"Permission #{request.PermissionId}";
                await _activityLog.LogAsync(
                    actionCode: "GRANT_PERMISSION",
                    actionLabel: "Cấp quyền cho vai trò",
                    message: $"{(User.FindFirst("full_name")?.Value ?? "Hệ thống")} đã cấp quyền '{permissionName}' cho vai trò '{role.Name}'.",
                    entityType: "Role",
                    entityId: request.RoleId,
                    entityLabel: role.Name,
                    severity: "Warning",
                    userId: currentUserId,
                    roleName: User.FindFirst("role")?.Value
                );

                await _sessionInvalidation.InvalidateUsersByRoleAsync(
                    request.RoleId,
                    $"Quyền của vai trò '{role.Name}' đã thay đổi. Vui lòng đăng nhập lại.",
                    "role_permissions_changed");
            }

            return Ok(new { message = "Đã gán permission thành công." });
        }

        if (existing is not null)
        {
            _db.RolePermissions.Remove(existing);

            var currentUserId = JwtHelper.GetUserId(User);
            _db.AuditLogs.Add(new AuditLog
            {
                UserId = currentUserId,
                Action = "REVOKE_PERMISSION",
                TableName = "Role_Permissions",
                RecordId = request.RoleId,
                OldValue = $"{{\"roleId\": {request.RoleId}, \"permissionId\": {request.PermissionId}}}",
                NewValue = null,
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            var permissionName = (await _db.Permissions.FindAsync(request.PermissionId))?.Name ?? $"Permission #{request.PermissionId}";
            await _activityLog.LogAsync(
                actionCode: "REVOKE_PERMISSION",
                actionLabel: "Thu hồi quyền khỏi vai trò",
                message: $"{(User.FindFirst("full_name")?.Value ?? "Hệ thống")} đã thu hồi quyền '{permissionName}' khỏi vai trò '{role.Name}'.",
                entityType: "Role",
                entityId: request.RoleId,
                entityLabel: role.Name,
                severity: "Warning",
                userId: currentUserId,
                roleName: User.FindFirst("role")?.Value
            );

            await _sessionInvalidation.InvalidateUsersByRoleAsync(
                request.RoleId,
                $"Quyền của vai trò '{role.Name}' đã thay đổi. Vui lòng đăng nhập lại.",
                "role_permissions_changed");
        }

        return Ok(new { message = "Đã thu hồi permission thành công." });
    }

    [HttpPut("{id:int}/permissions")]
    [RequirePermission(PermissionCodes.EditRoles)]
    public async Task<IActionResult> UpdatePermissions(int id, [FromBody] UpdateRolePermissionsRequest request)
    {
        if (request.RoleId != id)
            return BadRequest(new { message = "RoleId không khớp với route." });

        var role = await _db.Roles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (role is null)
            return NotFound(new { message = $"Role #{id} không tồn tại." });

        if (IsSystemProtectedRole(role.Name))
            return BadRequest(new { message = $"Không cho phép chỉnh phân quyền trực tiếp cho vai trò '{role.Name}'." });

        var requestedPermissionIds = (request.PermissionIds ?? [])
            .Distinct()
            .ToList();

        var existingPermissionIds = role.RolePermissions
            .Select(rp => rp.PermissionId)
            .ToHashSet();

        var validPermissionIds = await _db.Permissions
            .Where(p => requestedPermissionIds.Contains(p.Id))
            .Select(p => p.Id)
            .ToListAsync();

        if (validPermissionIds.Count != requestedPermissionIds.Count)
            return BadRequest(new { message = "Danh sách permission chứa giá trị không hợp lệ." });

        var toAdd = requestedPermissionIds
            .Where(permissionId => !existingPermissionIds.Contains(permissionId))
            .ToList();
        var toRemove = existingPermissionIds
            .Where(permissionId => !requestedPermissionIds.Contains(permissionId))
            .ToList();

        if (toAdd.Count == 0 && toRemove.Count == 0)
            return Ok(new { message = "Không có thay đổi permission." });

        if (toAdd.Count > 0)
        {
            foreach (var permissionId in toAdd)
            {
                _db.RolePermissions.Add(new RolePermission
                {
                    RoleId = id,
                    PermissionId = permissionId
                });
            }
        }

        if (toRemove.Count > 0)
        {
            var removableEntries = role.RolePermissions
                .Where(rp => toRemove.Contains(rp.PermissionId))
                .ToList();
            _db.RolePermissions.RemoveRange(removableEntries);
        }

        var currentUserId = JwtHelper.GetUserId(User);
        _db.AuditLogs.Add(new AuditLog
        {
            UserId = currentUserId,
            Action = "BULK_UPDATE_ROLE_PERMISSIONS",
            TableName = "Role_Permissions",
            RecordId = id,
            OldValue = $"{{\"permissionIds\": [{string.Join(",", existingPermissionIds.OrderBy(x => x))}]}}",
            NewValue = $"{{\"permissionIds\": [{string.Join(",", requestedPermissionIds.OrderBy(x => x))}]}}",
            UserAgent = Request.Headers["User-Agent"].ToString(),
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        await _activityLog.LogAsync(
            actionCode: "BULK_UPDATE_ROLE_PERMISSIONS",
            actionLabel: "Cập nhật quyền vai trò",
            message: $"{(User.FindFirst("full_name")?.Value ?? "Hệ thống")} đã cập nhật quyền của vai trò '{role.Name}'.",
            entityType: "Role",
            entityId: id,
            entityLabel: role.Name,
            severity: "Warning",
            userId: currentUserId,
            roleName: User.FindFirst("role")?.Value
        );

        await _sessionInvalidation.InvalidateUsersByRoleAsync(
            id,
            $"Quyền của vai trò '{role.Name}' đã thay đổi. Vui lòng đăng nhập lại.",
            "role_permissions_changed");

        return Ok(new
        {
            message = "Đã cập nhật permission của vai trò thành công.",
            addedPermissionIds = toAdd,
            removedPermissionIds = toRemove
        });
    }

    [HttpGet("my-permissions")]
    public async Task<IActionResult> GetMyPermissions()
    {
        var userId = JwtHelper.GetUserId(User);

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user?.RoleId is null)
            return Ok(new { permissions = Array.Empty<string>() });

        var permissions = await _db.RolePermissions
            .AsNoTracking()
            .Where(rp => rp.RoleId == user.RoleId)
            .Join(_db.Permissions,
                rp => rp.PermissionId,
                p => p.Id,
                (rp, p) => new
                {
                    p.PermissionCode,
                    p.Name
                })
            .OrderBy(p => p.Name)
            .ToListAsync();

        return Ok(new { permissions });
    }

    private static bool IsSystemProtectedRole(string? roleName)
    {
        return string.Equals(roleName, "Guest", StringComparison.OrdinalIgnoreCase)
            || string.Equals(roleName, "Admin", StringComparison.OrdinalIgnoreCase);
    }
}

public record AssignPermissionRequest(int RoleId, int PermissionId, bool Grant);
public record UpdateRolePermissionsRequest(int RoleId, List<int>? PermissionIds);
