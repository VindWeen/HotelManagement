using HotelManagement.API.Hubs;
using HotelManagement.Infrastructure.Data;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace HotelManagement.API.Services;

public interface ISessionInvalidationService
{
    Task InvalidateUserAsync(int userId, string message, string reason, CancellationToken cancellationToken = default);
    Task InvalidateUsersByRoleAsync(int roleId, string message, string reason, CancellationToken cancellationToken = default);
}

public class SessionInvalidationService : ISessionInvalidationService
{
    private readonly AppDbContext _db;
    private readonly IHubContext<NotificationHub> _hub;

    public SessionInvalidationService(AppDbContext db, IHubContext<NotificationHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    public async Task InvalidateUserAsync(int userId, string message, string reason, CancellationToken cancellationToken = default)
    {
        var affectedRows = await _db.Users
            .Where(u => u.Id == userId)
            .ExecuteUpdateAsync(updates => updates
                .SetProperty(u => u.AuthVersion, u => u.AuthVersion + 1)
                .SetProperty(u => u.RefreshToken, _ => (string?)null)
                .SetProperty(u => u.RefreshTokenExpiry, _ => (DateTime?)null)
                .SetProperty(u => u.UpdatedAt, _ => DateTime.UtcNow), cancellationToken);

        if (affectedRows <= 0) return;

        await _hub.Clients.Group(NotificationHub.GetUserGroupName(userId))
            .SendAsync("ForceLogout", BuildPayload(message, reason), cancellationToken);
    }

    public async Task InvalidateUsersByRoleAsync(int roleId, string message, string reason, CancellationToken cancellationToken = default)
    {
        var userIds = await _db.Users
            .AsNoTracking()
            .Where(u => u.RoleId == roleId)
            .Select(u => u.Id)
            .ToListAsync(cancellationToken);

        if (userIds.Count == 0) return;

        await _db.Users
            .Where(u => u.RoleId == roleId)
            .ExecuteUpdateAsync(updates => updates
                .SetProperty(u => u.AuthVersion, u => u.AuthVersion + 1)
                .SetProperty(u => u.RefreshToken, _ => (string?)null)
                .SetProperty(u => u.RefreshTokenExpiry, _ => (DateTime?)null)
                .SetProperty(u => u.UpdatedAt, _ => DateTime.UtcNow), cancellationToken);

        var payload = BuildPayload(message, reason);
        foreach (var userId in userIds)
        {
            await _hub.Clients.Group(NotificationHub.GetUserGroupName(userId))
                .SendAsync("ForceLogout", payload, cancellationToken);
        }
    }

    private static object BuildPayload(string message, string reason) => new
    {
        message,
        reason,
        triggeredAt = DateTime.UtcNow
    };
}
