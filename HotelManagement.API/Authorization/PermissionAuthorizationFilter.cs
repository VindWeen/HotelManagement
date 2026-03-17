using HotelManagement.Core.Common;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace HotelManagement.API.Authorization;

/// <summary>
/// IActionFilter kiểm tra claim "permission" trong JWT token.
/// Đăng ký global trong Program.cs để áp dụng cho tất cả controller.
/// </summary>
public class PermissionAuthorizationFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        // Lấy attribute từ action hoặc controller
        var attribute = context.ActionDescriptor.EndpointMetadata
            .OfType<RequirePermissionAttribute>()
            .FirstOrDefault();

        // Không có attribute → endpoint public hoặc chỉ cần [Authorize] bình thường
        if (attribute is null) return;

        var user = context.HttpContext.User;

        // Chưa đăng nhập
        if (user.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedObjectResult(new
            {
                message = "Bạn chưa đăng nhập."
            });
            return;
        }

        // Lấy tất cả permission claim từ JWT
        var userPermissions = user.Claims
            .Where(c => c.Type == AppClaimTypes.Permission)
            .Select(c => c.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Kiểm tra đủ TẤT CẢ permission được yêu cầu
        var missingPermissions = attribute.PermissionCodes
            .Where(p => !userPermissions.Contains(p))
            .ToList();

        if (missingPermissions.Count > 0)
        {
            context.Result = new ObjectResult(new
            {
                message = "Bạn không có quyền thực hiện thao tác này.",
                required = attribute.PermissionCodes,
                missing  = missingPermissions
            })
            { StatusCode = StatusCodes.Status403Forbidden };
        }
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}
