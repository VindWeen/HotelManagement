using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using HotelManagement.Core.Entities;
using HotelManagement.Infrastructure.Data;
using HotelManagement.Core.Authorization;
using HotelManagement.Core.Constants;
using HotelManagement.Core.DTOs;
using HotelManagement.Core.Helpers;
using HotelManagement.API.Services;

namespace HotelManagement.API.Controllers;

#region DTOs
public class CreateVoucherRequest
{
    public string Code { get; set; } = null!;
    public string DiscountType { get; set; } = null!; // PERCENT / FIXED_AMOUNT
    public decimal DiscountValue { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    public decimal? MinBookingValue { get; set; }
    public int? ApplicableRoomTypeId { get; set; }
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
    public int? UsageLimit { get; set; }
    public int MaxUsesPerUser { get; set; } = 1;
    public string AudienceType { get; set; } = VoucherAudienceTypes.Public;
    public int? TargetMembershipId { get; set; }
    public string? OccasionName { get; set; }
    public List<int> TargetUserIds { get; set; } = new();
    public bool SendEmailToRecipients { get; set; }
}

public class UpdateVoucherRequest
{
    public string? DiscountType { get; set; }
    public decimal? DiscountValue { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    public decimal? MinBookingValue { get; set; }
    public int? ApplicableRoomTypeId { get; set; }
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
    public int? UsageLimit { get; set; }
    public int? MaxUsesPerUser { get; set; }
    public string? AudienceType { get; set; }
    public int? TargetMembershipId { get; set; }
    public string? OccasionName { get; set; }
    public List<int>? TargetUserIds { get; set; }
    public bool? IsActive { get; set; }
}

public class ValidateVoucherRequest
{
    public string Code { get; set; } = null!;
    public decimal BookingAmount { get; set; }
}
#endregion

[ApiController]
[Route("api/[controller]")]
public class VouchersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IActivityLogService _activityLog;
    private readonly IVoucherValidationService _voucherValidationService;
    private readonly IVoucherAudienceService _voucherAudienceService;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;

    public VouchersController(
        AppDbContext context,
        IActivityLogService activityLog,
        IVoucherValidationService voucherValidationService,
        IVoucherAudienceService voucherAudienceService,
        IEmailService emailService,
        IConfiguration configuration)
    {
        _context = context;
        _activityLog = activityLog;
        _voucherValidationService = voucherValidationService;
        _voucherAudienceService = voucherAudienceService;
        _emailService = emailService;
        _configuration = configuration;
    }

    private static string NormalizeAudienceType(string? value)
        => string.IsNullOrWhiteSpace(value) ? VoucherAudienceTypes.Public : value.Trim().ToUpperInvariant();

    private async Task<string?> ValidateAudienceDefinitionAsync(
        string audienceType,
        int? targetMembershipId,
        string? occasionName,
        IReadOnlyCollection<int>? targetUserIds)
    {
        if (!VoucherAudienceTypes.All.Contains(audienceType))
            return "Phân loại voucher không hợp lệ.";

        if (audienceType == VoucherAudienceTypes.User)
        {
            if (targetUserIds == null || targetUserIds.Count == 0)
                return "Voucher riêng khách hàng cần chọn ít nhất một khách.";

            var validGuestCount = await _context.Users
                .Include(u => u.Role)
                .CountAsync(u => targetUserIds.Contains(u.Id)
                    && u.Status != false
                    && u.Role != null
                    && u.Role.Name == "Guest");

            if (validGuestCount != targetUserIds.Distinct().Count())
                return "Danh sách khách được chọn không hợp lệ hoặc không phải tài khoản Guest.";
        }

        if (audienceType == VoucherAudienceTypes.Membership)
        {
            if (!targetMembershipId.HasValue)
                return "Voucher hạng thành viên cần chọn hạng áp dụng.";

            var membershipExists = await _context.Memberships
                .AnyAsync(m => m.Id == targetMembershipId.Value && m.IsActive);

            if (!membershipExists)
                return "Hạng thành viên áp dụng không hợp lệ hoặc đã tắt.";
        }

        if (audienceType == VoucherAudienceTypes.Holiday && string.IsNullOrWhiteSpace(occasionName))
            return "Voucher dịp lễ cần nhập tên dịp.";

        return null;
    }

    private async Task SyncTargetUsersAsync(Voucher voucher, IEnumerable<int> targetUserIds)
    {
        var existing = await _context.VoucherTargetUsers
            .Where(x => x.VoucherId == voucher.Id)
            .ToListAsync();

        _context.VoucherTargetUsers.RemoveRange(existing);

        foreach (var userId in targetUserIds.Distinct())
        {
            _context.VoucherTargetUsers.Add(new VoucherTargetUser
            {
                VoucherId = voucher.Id,
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            });
        }
    }

    private int ResolveBirthdayTargetMonth(Voucher voucher)
    {
        if (voucher.ValidFrom.HasValue)
            return voucher.ValidFrom.Value.Month;

        if (voucher.ValidTo.HasValue)
            return voucher.ValidTo.Value.Month;

        return DateTime.Now.Month;
    }

    private string? BuildAbsoluteAssetUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return null;

        if (Uri.TryCreate(url, UriKind.Absolute, out var absoluteUri))
            return absoluteUri.ToString();

        var requestBaseUrl = $"{Request.Scheme}://{Request.Host.Value}";
        if (string.IsNullOrWhiteSpace(requestBaseUrl))
            return url;

        if (!Uri.TryCreate(requestBaseUrl, UriKind.Absolute, out var requestUri))
            return url;

        if (url.StartsWith('/'))
            return new Uri(requestUri, url).ToString();

        return new Uri(requestUri, "/" + url).ToString();
    }

    private async Task<List<VoucherEmailRecipient>> ResolveVoucherRecipientsAsync(Voucher voucher)
    {
        var guestBaseQuery = _context.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .Where(u => u.Status == true
                && !string.IsNullOrWhiteSpace(u.Email)
                && u.Role != null
                && u.Role.Name == "Guest");

        if (voucher.AudienceType == VoucherAudienceTypes.User)
        {
            var userIds = await _context.VoucherTargetUsers
                .AsNoTracking()
                .Where(x => x.VoucherId == voucher.Id)
                .Select(x => x.UserId)
                .ToListAsync();

            guestBaseQuery = guestBaseQuery.Where(u => userIds.Contains(u.Id));
        }
        else if (voucher.AudienceType == VoucherAudienceTypes.BirthdayMonth)
        {
            var targetMonth = ResolveBirthdayTargetMonth(voucher);
            guestBaseQuery = guestBaseQuery.Where(u => u.DateOfBirth.HasValue && u.DateOfBirth.Value.Month == targetMonth);
        }
        else if (voucher.AudienceType == VoucherAudienceTypes.Membership && voucher.TargetMembershipId.HasValue)
        {
            guestBaseQuery = guestBaseQuery.Where(u => u.MembershipId == voucher.TargetMembershipId.Value);
        }

        return await guestBaseQuery
            .OrderBy(u => u.FullName)
            .Select(u => new VoucherEmailRecipient(
                u.Id,
                u.FullName,
                u.Email))
            .ToListAsync();
    }

    private async Task<int> SendVoucherCampaignAsync(Voucher voucher)
    {
        var recipients = await ResolveVoucherRecipientsAsync(voucher);
        if (recipients.Count == 0)
            return 0;

        var roomType = voucher.ApplicableRoomTypeId.HasValue
            ? await _context.RoomTypes
                .AsNoTracking()
                .Include(rt => rt.RoomImages)
                .FirstOrDefaultAsync(rt => rt.Id == voucher.ApplicableRoomTypeId.Value)
            : null;

        var membershipTierName = voucher.TargetMembershipId.HasValue
            ? await _context.Memberships
                .AsNoTracking()
                .Where(m => m.Id == voucher.TargetMembershipId.Value)
                .Select(m => m.TierName)
                .FirstOrDefaultAsync()
            : null;

        var primaryRoomImage = roomType?.RoomImages
            .Where(img => img.IsActive)
            .OrderByDescending(img => img.IsPrimary == true)
            .ThenBy(img => img.SortOrder)
            .Select(img => img.ImageUrl)
            .FirstOrDefault();

        var payload = new VoucherEmailPayload(
            voucher.Code,
            voucher.AudienceType,
            voucher.DiscountType,
            voucher.DiscountValue,
            voucher.MaxDiscountAmount,
            voucher.MinBookingValue,
            voucher.ValidFrom,
            voucher.ValidTo,
            roomType?.Name,
            BuildAbsoluteAssetUrl(primaryRoomImage),
            membershipTierName,
            voucher.OccasionName,
            _configuration["Frontend:BaseUrl"]);

        return await _emailService.SendVoucherCampaignAsync(recipients, payload);
    }

    // ================= GET AVAILABLE FOR GUEST =================
    [Authorize]
    [HttpGet("available")]
    public async Task<IActionResult> GetAvailable()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var now = DateTime.Now;

        var userUsageCounts = await _context.VoucherUsages
            .AsNoTracking()
            .Where(vu => vu.UserId == userId)
            .GroupBy(vu => vu.VoucherId)
            .Select(g => new { VoucherId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.VoucherId, x => x.Count);

        var vouchers = await _context.Vouchers
            .AsNoTracking()
            .Where(v => v.IsActive
                && (!v.ValidFrom.HasValue || v.ValidFrom <= now)
                && (!v.ValidTo.HasValue || v.ValidTo >= now)
                && (!v.UsageLimit.HasValue || v.UsedCount < v.UsageLimit.Value))
            .OrderBy(v => v.ValidTo ?? DateTime.MaxValue)
            .ThenByDescending(v => v.DiscountValue)
            .Select(v => new
            {
                v.Id,
                v.Code,
                v.DiscountType,
                v.DiscountValue,
                v.MaxDiscountAmount,
                v.MinBookingValue,
                v.ApplicableRoomTypeId,
                ApplicableRoomTypeName = v.ApplicableRoomType != null ? v.ApplicableRoomType.Name : null,
                v.ValidFrom,
                v.ValidTo,
                v.UsageLimit,
                v.UsedCount,
                v.MaxUsesPerUser,
                v.AudienceType,
                v.TargetMembershipId,
                TargetMembershipName = v.TargetMembership != null ? v.TargetMembership.TierName : null,
                v.OccasionName
            })
            .ToListAsync();

        var data = new List<object>();
        foreach (var v in vouchers)
        {
            userUsageCounts.TryGetValue(v.Id, out var userUsedCount);
            var remainingForUser = Math.Max(0, v.MaxUsesPerUser - userUsedCount);
            var remainingGlobal = v.UsageLimit.HasValue
                ? Math.Max(0, v.UsageLimit.Value - v.UsedCount)
                : (int?)null;
            var audienceUnavailableReason = await _voucherAudienceService.GetUnavailableReasonAsync(
                new Voucher
                {
                    Id = v.Id,
                    AudienceType = v.AudienceType,
                    TargetMembershipId = v.TargetMembershipId
                },
                userId);

            if (audienceUnavailableReason != null)
                continue;

            data.Add(new
            {
                v.Id,
                v.Code,
                v.DiscountType,
                v.DiscountValue,
                v.MaxDiscountAmount,
                v.MinBookingValue,
                v.ApplicableRoomTypeId,
                v.ApplicableRoomTypeName,
                v.ValidFrom,
                v.ValidTo,
                v.UsageLimit,
                v.UsedCount,
                v.MaxUsesPerUser,
                v.AudienceType,
                v.TargetMembershipId,
                v.TargetMembershipName,
                v.OccasionName,
                UserUsedCount = userUsedCount,
                RemainingForUser = remainingForUser,
                UsageRemaining = remainingGlobal,
                IsUsable = remainingForUser > 0,
                UnavailableReason = remainingForUser <= 0 ? $"Bạn đã dùng voucher này tối đa {v.MaxUsesPerUser} lần." : null
            });
        }

        return Ok(new
        {
            data,
            message = "Lấy danh sách voucher khả dụng thành công."
        });
    }

    // ================= GET ALL =================
    [RequirePermission(PermissionCodes.ManageBookings)]
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] ListQueryRequest queryRequest,
        [FromQuery] bool? isActive,
        [FromQuery] string? audienceType)
    {
        var page = Math.Max(1, queryRequest.Page);
        var pageSize = Math.Clamp(queryRequest.PageSize <= 0 ? 10 : queryRequest.PageSize, 1, 100);

        var query = _context.Vouchers.AsQueryable();

        if (isActive.HasValue)
            query = query.Where(v => v.IsActive == isActive.Value);

        var normalizedAudienceType = NormalizeAudienceType(audienceType);
        if (!string.IsNullOrWhiteSpace(audienceType))
            query = query.Where(v => v.AudienceType == normalizedAudienceType);

        if (!string.IsNullOrWhiteSpace(queryRequest.Status))
        {
            var activeByStatus = queryRequest.Status.Equals("active", StringComparison.OrdinalIgnoreCase);
            query = query.Where(v => v.IsActive == activeByStatus);
        }

        if (!string.IsNullOrWhiteSpace(queryRequest.Keyword))
        {
            var keyword = queryRequest.Keyword.Trim().ToLower();
            query = query.Where(v => v.Code.ToLower().Contains(keyword));
        }

        if (queryRequest.FromDate.HasValue)
            query = query.Where(v => !v.ValidFrom.HasValue || v.ValidFrom >= queryRequest.FromDate);

        if (queryRequest.ToDate.HasValue)
            query = query.Where(v => !v.ValidTo.HasValue || v.ValidTo <= queryRequest.ToDate);

        var sortDirDesc = !string.Equals(queryRequest.SortDir, "asc", StringComparison.OrdinalIgnoreCase);
        query = queryRequest.SortBy?.ToLower() switch
        {
            "code" => sortDirDesc ? query.OrderByDescending(v => v.Code) : query.OrderBy(v => v.Code),
            "validfrom" => sortDirDesc ? query.OrderByDescending(v => v.ValidFrom) : query.OrderBy(v => v.ValidFrom),
            "validto" => sortDirDesc ? query.OrderByDescending(v => v.ValidTo) : query.OrderBy(v => v.ValidTo),
            _ => sortDirDesc ? query.OrderByDescending(v => v.Id) : query.OrderBy(v => v.Id)
        };

        var total = await query.CountAsync();
        var activeTotal = await query.CountAsync(v => v.IsActive);

        var data = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(v => new
            {
                v.Id,
                v.Code,
                v.DiscountType,
                v.DiscountValue,
                v.MaxDiscountAmount,
                v.MinBookingValue,
                v.ApplicableRoomTypeId,
                v.ValidFrom,
                v.ValidTo,
                v.UsageLimit,
                v.UsedCount,          // used_count / usage_limit
                v.MaxUsesPerUser,
                v.AudienceType,
                v.TargetMembershipId,
                TargetMembershipName = v.TargetMembership != null ? v.TargetMembership.TierName : null,
                v.OccasionName,
                TargetUsers = v.TargetUsers.Select(t => new
                {
                    t.UserId,
                    FullName = t.User.FullName,
                    t.User.Email
                }).ToList(),
                v.IsActive,
                v.CreatedAt
            })
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(total / (double)pageSize);
        var payload = new ApiListResponse<object>
        {
            Data = data,
            Pagination = new PaginationMeta
            {
                CurrentPage = page,
                PageSize = pageSize,
                TotalItems = total,
                TotalPages = totalPages
            },
            Summary = new { totalItems = total, activeItems = activeTotal },
            Message = "Lấy danh sách voucher thành công."
        };

        return Ok(payload);
    }

    // ================= GET BY ID =================
    [RequirePermission(PermissionCodes.ManageBookings)]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var v = await _context.Vouchers
            .Include(x => x.TargetMembership)
            .Include(x => x.TargetUsers)
                .ThenInclude(x => x.User)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (v == null) return NotFound();
        return Ok(new
        {
            v.Id,
            v.Code,
            v.DiscountType,
            v.DiscountValue,
            v.MaxDiscountAmount,
            v.MinBookingValue,
            v.ApplicableRoomTypeId,
            v.ValidFrom,
            v.ValidTo,
            v.UsageLimit,
            v.UsedCount,
            v.MaxUsesPerUser,
            v.AudienceType,
            v.TargetMembershipId,
            TargetMembershipName = v.TargetMembership?.TierName,
            v.OccasionName,
            TargetUsers = v.TargetUsers.Select(t => new { t.UserId, t.User.FullName, t.User.Email }),
            v.IsActive,
            v.CreatedAt
        });
    }

    // ================= CREATE =================
    [RequirePermission(PermissionCodes.ManageBookings)]
    [HttpPost]
    public async Task<IActionResult> Create(CreateVoucherRequest request)
    {
        // Validate discount type
        if (request.DiscountType != VoucherDiscountTypes.Percent && request.DiscountType != VoucherDiscountTypes.FixedAmount)
            return BadRequest("DiscountType phải là PERCENT hoặc FIXED_AMOUNT");

        // Validate PERCENT không vượt 100
        if (request.DiscountType == VoucherDiscountTypes.Percent && request.DiscountValue > 100)
            return BadRequest("Phần trăm giảm giá không được vượt quá 100%");

        // Validate ngày
        if (request.ValidFrom.HasValue && request.ValidTo.HasValue
            && request.ValidFrom >= request.ValidTo)
            return BadRequest("ValidFrom phải trước ValidTo");

        var audienceType = NormalizeAudienceType(request.AudienceType);
        var audienceError = await ValidateAudienceDefinitionAsync(
            audienceType,
            request.TargetMembershipId,
            request.OccasionName,
            request.TargetUserIds);

        if (audienceError != null)
            return BadRequest(audienceError);

        // Kiểm tra code trùng
        var exists = await _context.Vouchers.AnyAsync(v => v.Code == request.Code);
        if (exists)
            return BadRequest($"Mã voucher '{request.Code}' đã tồn tại");

        var voucher = new Voucher
        {
            Code                 = request.Code.ToUpper().Trim(),
            DiscountType         = request.DiscountType,
            DiscountValue        = request.DiscountValue,
            MaxDiscountAmount    = request.MaxDiscountAmount,
            MinBookingValue      = request.MinBookingValue,
            ApplicableRoomTypeId = request.ApplicableRoomTypeId,
            ValidFrom            = request.ValidFrom,
            ValidTo              = request.ValidTo,
            UsageLimit           = request.UsageLimit,
            MaxUsesPerUser       = request.MaxUsesPerUser,
            AudienceType         = audienceType,
            TargetMembershipId   = audienceType == VoucherAudienceTypes.Membership ? request.TargetMembershipId : null,
            OccasionName         = audienceType == VoucherAudienceTypes.Holiday ? request.OccasionName?.Trim() : null,
            UsedCount            = 0,
            IsActive             = true,
            CreatedAt            = DateTime.UtcNow
        };

        _context.Vouchers.Add(voucher);
        await _context.SaveChangesAsync();

        if (audienceType == VoucherAudienceTypes.User)
        {
            await SyncTargetUsersAsync(voucher, request.TargetUserIds);
            await _context.SaveChangesAsync();
        }

        int emailSentCount = 0;
        string? emailWarning = null;
        if (request.SendEmailToRecipients)
        {
            try
            {
                emailSentCount = await SendVoucherCampaignAsync(voucher);
            }
            catch (Exception ex)
            {
                emailWarning = $"Voucher đã tạo nhưng gửi email thất bại: {ex.Message}";
            }
        }

        var currentUserId = JwtHelper.GetUserId(User);
        // Ghi Activity Log
        await _activityLog.LogAsync(
            actionCode: "CREATE_VOUCHER",
            actionLabel: "Tạo voucher mới",
            message: $"Đã tạo voucher khuyến mãi mới: {voucher.Code} (Giảm {voucher.DiscountValue}{(voucher.DiscountType == VoucherDiscountTypes.Percent ? "%" : "đ")}).",
            entityType: "Voucher",
            entityId: voucher.Id,
            entityLabel: voucher.Code,
            severity: "Success",
            userId: currentUserId,
            roleName: User.FindFirst("role")?.Value
        );

        // Ghi AuditLog
        _context.AuditLogs.Add(new AuditLog
        {
            UserId    = currentUserId,
            Action    = "CREATE_VOUCHER",
            TableName = "Vouchers",
            RecordId  = voucher.Id,
            OldValue  = null,
            NewValue  = $"{{\"code\": \"{voucher.Code}\", \"discountType\": \"{voucher.DiscountType}\", \"discountValue\": {voucher.DiscountValue}}}",
            UserAgent = Request.Headers["User-Agent"].ToString(),
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        return Ok(new
        {
            voucher,
            emailSentCount,
            emailWarning,
            message = request.SendEmailToRecipients
                ? emailWarning == null
                    ? $"Tạo voucher thành công và đã gửi email cho {emailSentCount} người nhận."
                    : "Tạo voucher thành công nhưng có lỗi khi gửi email."
                : "Tạo voucher thành công."
        });
    }

    // ================= UPDATE =================
    [RequirePermission(PermissionCodes.ManageBookings)]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateVoucherRequest request)
    {
        var v = await _context.Vouchers
            .Include(x => x.TargetUsers)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (v == null) return NotFound();

        // Validate discount type nếu có thay đổi
        if (request.DiscountType != null
            && request.DiscountType != VoucherDiscountTypes.Percent
            && request.DiscountType != VoucherDiscountTypes.FixedAmount)
            return BadRequest("DiscountType phải là PERCENT hoặc FIXED_AMOUNT");

        if (request.DiscountType == VoucherDiscountTypes.Percent
            && request.DiscountValue.HasValue
            && request.DiscountValue > 100)
            return BadRequest("Phần trăm giảm giá không được vượt quá 100%");

        // Validate ngày
        var newFrom = request.ValidFrom ?? v.ValidFrom;
        var newTo   = request.ValidTo   ?? v.ValidTo;
        if (newFrom.HasValue && newTo.HasValue && newFrom >= newTo)
            return BadRequest("ValidFrom phải trước ValidTo");

        var nextAudienceType = NormalizeAudienceType(request.AudienceType ?? v.AudienceType);
        var nextTargetMembershipId = request.TargetMembershipId ?? v.TargetMembershipId;
        var nextOccasionName = request.OccasionName ?? v.OccasionName;
        var nextTargetUserIds = request.TargetUserIds ?? v.TargetUsers.Select(x => x.UserId).ToList();
        var audienceError = await ValidateAudienceDefinitionAsync(
            nextAudienceType,
            nextTargetMembershipId,
            nextOccasionName,
            nextTargetUserIds);

        if (audienceError != null)
            return BadRequest(audienceError);

        // Cập nhật các field nếu có giá trị mới
        if (request.DiscountType     != null) v.DiscountType         = request.DiscountType;
        if (request.DiscountValue    .HasValue) v.DiscountValue      = request.DiscountValue.Value;
        if (request.MaxDiscountAmount.HasValue) v.MaxDiscountAmount  = request.MaxDiscountAmount;
        if (request.MinBookingValue  .HasValue) v.MinBookingValue    = request.MinBookingValue;
        if (request.ApplicableRoomTypeId.HasValue) v.ApplicableRoomTypeId = request.ApplicableRoomTypeId;
        if (request.ValidFrom        .HasValue) v.ValidFrom          = request.ValidFrom;
        if (request.ValidTo          .HasValue) v.ValidTo            = request.ValidTo;
        if (request.UsageLimit       .HasValue) v.UsageLimit         = request.UsageLimit;
        if (request.MaxUsesPerUser   .HasValue) v.MaxUsesPerUser     = request.MaxUsesPerUser.Value;
        if (request.AudienceType     != null) v.AudienceType         = nextAudienceType;
        if (request.AudienceType     != null || request.TargetMembershipId.HasValue)
            v.TargetMembershipId = nextAudienceType == VoucherAudienceTypes.Membership ? nextTargetMembershipId : null;
        if (request.AudienceType     != null || request.OccasionName != null)
            v.OccasionName = nextAudienceType == VoucherAudienceTypes.Holiday ? nextOccasionName?.Trim() : null;
        if ((request.AudienceType != null || request.TargetUserIds != null) && nextAudienceType != VoucherAudienceTypes.User)
            _context.VoucherTargetUsers.RemoveRange(v.TargetUsers);
        if (nextAudienceType == VoucherAudienceTypes.User && request.TargetUserIds != null)
            await SyncTargetUsersAsync(v, nextTargetUserIds);
        if (request.IsActive         .HasValue) v.IsActive           = request.IsActive.Value;

        var currentUserId = JwtHelper.GetUserId(User);
        // Ghi Activity Log
        await _activityLog.LogAsync(
            actionCode: "UPDATE_VOUCHER",
            actionLabel: "Cập nhật voucher",
            message: $"Đã cập nhật thông tin cho voucher {v.Code}.",
            entityType: "Voucher",
            entityId: id,
            entityLabel: v.Code,
            severity: "Info",
            userId: currentUserId,
            roleName: User.FindFirst("role")?.Value
        );

        // Ghi AuditLog
        _context.AuditLogs.Add(new AuditLog
        {
            UserId    = currentUserId,
            Action    = "UPDATE_VOUCHER",
            TableName = "Vouchers",
            RecordId  = id,
            OldValue  = null,
            NewValue  = $"{{\"code\": \"{v.Code}\", \"isActive\": {v.IsActive.ToString().ToLower()}}}",
            UserAgent = Request.Headers["User-Agent"].ToString(),
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        await _context.SaveChangesAsync();
        return Ok(v);
    }

    // ================= DELETE (SOFT) =================
    [RequirePermission(PermissionCodes.ManageBookings)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var v = await _context.Vouchers.FindAsync(id);
        if (v == null) return NotFound();

        v.IsActive = false; // Soft delete, không xóa khỏi DB

        var currentUserId = JwtHelper.GetUserId(User);
        // Ghi Activity Log
        await _activityLog.LogAsync(
            actionCode: "DELETE_VOUCHER",
            actionLabel: "Vô hiệu hóa voucher",
            message: $"Voucher {v.Code} đã bị ngừng áp dụng.",
            entityType: "Voucher",
            entityId: id,
            entityLabel: v.Code,
            severity: "Warning",
            userId: currentUserId,
            roleName: User.FindFirst("role")?.Value
        );

        // Ghi AuditLog
        _context.AuditLogs.Add(new AuditLog
        {
            UserId    = currentUserId,
            Action    = "DELETE_VOUCHER",
            TableName = "Vouchers",
            RecordId  = id,
            OldValue  = $"{{\"isActive\": true}}",
            NewValue  = $"{{\"isActive\": false}}",
            UserAgent = Request.Headers["User-Agent"].ToString(),
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        await _context.SaveChangesAsync();

        return Ok(new { message = $"Voucher '{v.Code}' đã bị vô hiệu hóa." });
    }

    // ================= VALIDATE =================
    [Authorize]
    [HttpPost("validate")]
    public async Task<IActionResult> Validate(ValidateVoucherRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var v = await _context.Vouchers
            .FirstOrDefaultAsync(x => x.Code == request.Code.ToUpper().Trim());

        if (v == null || !v.IsActive)
            return BadRequest(new { valid = false, message = "Voucher không tồn tại hoặc đã bị vô hiệu hóa" });

        if (!_voucherValidationService.ValidateUsage(v, request.BookingAmount, DateTime.Now, out var voucherRuleError))
            return BadRequest(new { valid = false, message = voucherRuleError });

        var audienceUnavailableReason = await _voucherAudienceService.GetUnavailableReasonAsync(v, userId);
        if (audienceUnavailableReason != null)
            return BadRequest(new { valid = false, message = audienceUnavailableReason });

        // Kiểm tra thời hạn
        if (v.ValidFrom.HasValue && DateTime.Now < v.ValidFrom)
            return BadRequest(new { valid = false, message = "Voucher chưa đến ngày sử dụng" });

        if (v.ValidTo.HasValue && DateTime.Now > v.ValidTo)
            return BadRequest(new { valid = false, message = "Voucher đã hết hạn" });

        // Kiểm tra usage limit
        if (v.UsageLimit.HasValue && v.UsedCount >= v.UsageLimit)
            return BadRequest(new { valid = false, message = "Voucher đã hết lượt sử dụng" });

        // Kiểm tra user đã dùng voucher này chưa (max_uses_per_user)
        var userUsedCount = await _context.VoucherUsages
            .CountAsync(vu => vu.VoucherId == v.Id && vu.UserId == userId);

        if (userUsedCount >= v.MaxUsesPerUser)
            return BadRequest(new { valid = false, message = $"Bạn đã dùng voucher này tối đa {v.MaxUsesPerUser} lần" });

        // Kiểm tra min booking value
        if (v.MinBookingValue.HasValue && request.BookingAmount < v.MinBookingValue)
            return BadRequest(new
            {
                valid   = false,
                message = $"Đơn hàng tối thiểu {v.MinBookingValue:N0}đ để dùng voucher này"
            });

        // Tính tiền giảm
        decimal discount = 0;
        if (v.DiscountType == VoucherDiscountTypes.Percent)
        {
            discount = request.BookingAmount * v.DiscountValue / 100;
            if (v.MaxDiscountAmount.HasValue)
                discount = Math.Min(discount, v.MaxDiscountAmount.Value);
        }
        else
        {
            discount = v.DiscountValue;
        }

        discount = Math.Min(discount, request.BookingAmount); // không giảm quá tổng tiền

        return Ok(new
        {
            valid           = true,
            voucherId       = v.Id,
            code            = v.Code,
            discountType    = v.DiscountType,
            discountValue   = v.DiscountValue,
            audienceType    = NormalizeAudienceType(v.AudienceType),
            targetMembershipId = v.TargetMembershipId,
            occasionName    = v.OccasionName,
            discountAmount  = discount,
            finalAmount     = request.BookingAmount - discount,
            usageRemaining  = v.UsageLimit.HasValue ? v.UsageLimit - v.UsedCount : (int?)null
        });
    }
}



