namespace HotelManagement.API.Authorization;

/// <summary>
/// Đánh dấu endpoint yêu cầu permission cụ thể.
/// Dùng kèm với PermissionAuthorizationFilter để kiểm tra claim trong JWT.
///
/// Ví dụ:
///   [RequirePermission(Permissions.ManageRooms)]
///   [RequirePermission(Permissions.ManageRooms, Permissions.ViewDashboard)] // cần CẢ HAI
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
public class RequirePermissionAttribute : Attribute
{
    public string[] PermissionCodes { get; }

    public RequirePermissionAttribute(params string[] permissionCodes)
    {
        PermissionCodes = permissionCodes;
    }
}
