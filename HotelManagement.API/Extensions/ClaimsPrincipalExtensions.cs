using HotelManagement.Core.Common;
using System.Security.Claims;

namespace HotelManagement.API.Extensions;

/// <summary>
/// Extension methods để đọc claim từ User (ClaimsPrincipal) bên trong Controller.
///
/// Cách dùng trong controller:
///   var userId = User.GetUserId();
///   var perms  = User.GetPermissions();
///   bool ok    = User.HasPermission(Permissions.ManageRooms);
/// </summary>
public static class ClaimsPrincipalExtensions
{
    /// <summary>Lấy UserId từ JWT claim "uid". Trả về null nếu không tìm thấy.</summary>
    public static int? GetUserId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(AppClaimTypes.UserId);
        return int.TryParse(value, out var id) ? id : null;
    }

    /// <summary>Lấy UserId, ném exception nếu không tìm thấy (dùng cho endpoint bắt buộc auth).</summary>
    public static int GetUserIdRequired(this ClaimsPrincipal principal)
        => principal.GetUserId()
           ?? throw new InvalidOperationException("Không tìm thấy claim uid trong token.");

    /// <summary>Lấy email từ JWT.</summary>
    public static string? GetEmail(this ClaimsPrincipal principal)
        => principal.FindFirstValue(AppClaimTypes.Email);

    /// <summary>Lấy tên role từ JWT.</summary>
    public static string? GetRoleName(this ClaimsPrincipal principal)
        => principal.FindFirstValue(AppClaimTypes.RoleName);

    /// <summary>Lấy tất cả permission code từ JWT.</summary>
    public static IReadOnlySet<string> GetPermissions(this ClaimsPrincipal principal)
        => principal.Claims
            .Where(c => c.Type == AppClaimTypes.Permission)
            .Select(c => c.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

    /// <summary>Kiểm tra user có permission cụ thể không.</summary>
    public static bool HasPermission(this ClaimsPrincipal principal, string permissionCode)
        => principal.Claims.Any(c =>
            c.Type == AppClaimTypes.Permission &&
            c.Value.Equals(permissionCode, StringComparison.OrdinalIgnoreCase));

    /// <summary>Kiểm tra user có đủ TẤT CẢ permission trong danh sách không.</summary>
    public static bool HasAllPermissions(this ClaimsPrincipal principal, params string[] permissionCodes)
    {
        var userPerms = principal.GetPermissions();
        return permissionCodes.All(p => userPerms.Contains(p));
    }
}
