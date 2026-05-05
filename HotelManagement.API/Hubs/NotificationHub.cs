using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace HotelManagement.API.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    public static string GetUserGroupName(int userId) => $"user:{userId}";

    /// <summary>
    /// Khi client kết nối, tự động thêm vào Group theo Role.
    /// Ví dụ: Admin → Group "Admin", Receptionist → Group "Receptionist"
    /// Nhờ đó có thể broadcast thông báo đến toàn bộ 1 Role cùng lúc.
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        var roleName = Context.User?.FindFirst(ClaimTypes.Role)?.Value 
                    ?? Context.User?.FindFirst("role")?.Value;

        if (userId > 0)
            await Groups.AddToGroupAsync(Context.ConnectionId, GetUserGroupName(userId));

        if (!string.IsNullOrEmpty(roleName))
            await Groups.AddToGroupAsync(Context.ConnectionId, roleName);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        var roleName = Context.User?.FindFirst(ClaimTypes.Role)?.Value 
                    ?? Context.User?.FindFirst("role")?.Value;

        if (userId > 0)
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GetUserGroupName(userId));

        if (!string.IsNullOrEmpty(roleName))
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roleName);

        await base.OnDisconnectedAsync(exception);
    }

    private int GetUserId()
    {
        var rawUserId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? Context.User?.FindFirst("sub")?.Value;

        return int.TryParse(rawUserId, out var userId) ? userId : 0;
    }
}
