using HotelManagement.Core.Helpers;
using HotelManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JwtHelper _jwt;

    public AuthController(AppDbContext db, JwtHelper jwt)
    {
        _db  = db;
        _jwt = jwt;
    }

    /// <summary>
    /// Đăng nhập — trả về JWT token chứa đầy đủ permissions.
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // 1. Tìm user theo email, include Role để lấy tên
        var user = await _db.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user is null)
            return Unauthorized(new { message = "Email hoặc mật khẩu không đúng." });

        // 2. Kiểm tra Soft Delete — nhân viên đã nghỉ việc không được đăng nhập
        if (!user.IsActive)
            return Unauthorized(new { message = "Tài khoản đã bị vô hiệu hóa." });

        // 3. Kiểm tra bị khóa (status = false)
        if (user.Status == false)
            return Unauthorized(new { message = "Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên." });

        // 4. BCrypt verify password
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Email hoặc mật khẩu không đúng." });

        // 5. Lấy danh sách permission_code của role này
        var permissionCodes = await _db.RolePermissions
            .Where(rp => rp.RoleId == user.RoleId)
            .Join(_db.Permissions,
                rp => rp.PermissionId,
                p  => p.Id,
                (rp, p) => p.PermissionCode)
            .ToListAsync();

        // 6. Cập nhật last_login_at
        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // 7. Tạo token
        var roleName = user.Role?.Name ?? "Guest";
        var token    = _jwt.GenerateToken(user, roleName, permissionCodes);

        return Ok(new
        {
            token,
            expiresIn   = 60,
            userId      = user.Id,
            fullName    = user.FullName,
            email       = user.Email,
            role        = roleName,
            avatarUrl   = user.AvatarUrl,
            permissions = permissionCodes
        });
    }
}

public record LoginRequest(string Email, string Password);
