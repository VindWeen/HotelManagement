using HotelManagement.Core.Authorization;
using HotelManagement.Core.DTOs;
using HotelManagement.Core.Helpers;
using HotelManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LoyaltyMembersController : ControllerBase
{
    private readonly AppDbContext _db;

    public LoyaltyMembersController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = JwtHelper.GetUserId(User);

        var memberships = await _db.Memberships
            .AsNoTracking()
            .Where(m => m.IsActive)
            .OrderBy(m => m.MinPoints ?? 0)
            .Select(m => new
            {
                m.Id,
                m.TierName,
                m.MinPoints,
                m.MaxPoints,
                m.DiscountPercent,
                m.ColorHex
            })
            .ToListAsync();

        var member = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.Phone,
                u.AvatarUrl,
                u.LoyaltyPoints,
                u.LoyaltyPointsUsable,
                MembershipId = u.MembershipId,
                MembershipTier = u.Membership != null ? u.Membership.TierName : null,
                MembershipColor = u.Membership != null ? u.Membership.ColorHex : null,
                MembershipDiscount = u.Membership != null ? u.Membership.DiscountPercent : null,
                MembershipMinPoints = u.Membership != null ? u.Membership.MinPoints : null,
                MembershipMaxPoints = u.Membership != null ? u.Membership.MaxPoints : null,
                TransactionCount = u.LoyaltyTransactions.Count()
            })
            .FirstOrDefaultAsync();

        if (member is null)
            return NotFound(new { message = "Không tìm thấy thông tin thành viên." });

        var nextTier = memberships
            .Where(m => (m.MinPoints ?? 0) > member.LoyaltyPoints)
            .OrderBy(m => m.MinPoints ?? 0)
            .FirstOrDefault();

        var currentMin = member.MembershipMinPoints ?? 0;
        var nextMin = nextTier?.MinPoints;
        var pointsToNextTier = nextMin.HasValue
            ? Math.Max(0, nextMin.Value - member.LoyaltyPoints)
            : 0;
        var progressPercent = nextMin.HasValue && nextMin.Value > currentMin
            ? Math.Clamp((member.LoyaltyPoints - currentMin) * 100m / (nextMin.Value - currentMin), 0m, 100m)
            : 100m;

        return Ok(new
        {
            member,
            currentTier = new
            {
                id = member.MembershipId,
                tierName = member.MembershipTier,
                colorHex = member.MembershipColor,
                discountPercent = member.MembershipDiscount,
                minPoints = member.MembershipMinPoints,
                maxPoints = member.MembershipMaxPoints
            },
            nextTier,
            progress = new
            {
                currentPoints = member.LoyaltyPoints,
                currentTierMinPoints = currentMin,
                nextTierMinPoints = nextMin,
                pointsToNextTier,
                progressPercent = Math.Round(progressPercent, 1)
            },
            tiers = memberships,
            message = "Lấy thông tin loyalty thành công."
        });
    }

    [HttpGet("me/transactions")]
    public async Task<IActionResult> GetMyTransactions()
    {
        var userId = JwtHelper.GetUserId(User);

        var transactions = await _db.LoyaltyTransactions
            .AsNoTracking()
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new LoyaltyTransactionResponse(
                t.Id,
                t.TransactionType,
                t.Points,
                t.BalanceAfter,
                t.Note,
                t.BookingId,
                t.Booking != null ? t.Booking.BookingCode : null,
                t.CreatedAt
            ))
            .ToListAsync();

        return Ok(new
        {
            data = transactions,
            summary = new
            {
                totalTransactions = transactions.Count,
                earnedPoints = transactions.Where(t => t.Points > 0).Sum(t => t.Points),
                spentPoints = transactions.Where(t => t.Points < 0).Sum(t => Math.Abs(t.Points))
            },
            message = "Lấy lịch sử tích điểm thành công."
        });
    }

    [HttpGet]
    [RequirePermission(PermissionCodes.ManageUsers)]
    public async Task<IActionResult> GetList([FromQuery] LoyaltyMemberListQueryRequest queryRequest)
    {
        var page = Math.Max(1, queryRequest.Page);
        var pageSize = Math.Clamp(queryRequest.PageSize <= 0 ? 10 : queryRequest.PageSize, 1, 100);

        var baseQuery = _db.Users
            .AsNoTracking()
            .Where(u =>
                u.MembershipId != null ||
                u.LoyaltyPoints > 0 ||
                u.LoyaltyPointsUsable > 0);

        if (!string.IsNullOrWhiteSpace(queryRequest.Keyword))
        {
            var keyword = queryRequest.Keyword.Trim().ToLower();
            baseQuery = baseQuery.Where(u =>
                (u.FullName != null && u.FullName.ToLower().Contains(keyword)) ||
                (u.Email != null && u.Email.ToLower().Contains(keyword)) ||
                (u.Phone != null && u.Phone.ToLower().Contains(keyword)) ||
                (u.Membership != null && u.Membership.TierName.ToLower().Contains(keyword)));
        }

        if (queryRequest.MembershipId.HasValue)
            baseQuery = baseQuery.Where(u => u.MembershipId == queryRequest.MembershipId.Value);

        if (queryRequest.MinPoints.HasValue)
            baseQuery = baseQuery.Where(u => u.LoyaltyPoints >= queryRequest.MinPoints.Value);

        if (queryRequest.MaxPoints.HasValue)
            baseQuery = baseQuery.Where(u => u.LoyaltyPoints <= queryRequest.MaxPoints.Value);

        if (!string.IsNullOrWhiteSpace(queryRequest.Status))
        {
            if (queryRequest.Status.Equals("active", StringComparison.OrdinalIgnoreCase))
                baseQuery = baseQuery.Where(u => u.Status == true);
            else if (queryRequest.Status.Equals("locked", StringComparison.OrdinalIgnoreCase))
                baseQuery = baseQuery.Where(u => u.Status != true);
        }

        var totalItems = await baseQuery.CountAsync();
        var summaryTotals = await baseQuery
            .GroupBy(_ => 1)
            .Select(g => new
            {
                TotalMembers = g.Count(),
                TotalPoints = g.Sum(x => x.LoyaltyPoints),
                TotalUsablePoints = g.Sum(x => x.LoyaltyPointsUsable),
                ActiveMembers = g.Count(x => x.Status == true),
                LockedMembers = g.Count(x => x.Status != true)
            })
            .FirstOrDefaultAsync();

        var tierBreakdown = await baseQuery
            .GroupBy(u => new
            {
                TierName = u.Membership != null ? u.Membership.TierName : "Chưa có hạng",
                SortRank = u.Membership != null ? (u.Membership.MinPoints ?? -1) : -1
            })
            .Select(g => new
            {
                tierName = g.Key.TierName,
                sortRank = g.Key.SortRank,
                memberCount = g.Count(),
                totalPoints = g.Sum(x => x.LoyaltyPoints),
                totalUsablePoints = g.Sum(x => x.LoyaltyPointsUsable)
            })
            .OrderByDescending(x => x.sortRank)
            .ThenBy(x => x.tierName)
            .ToListAsync();

        var sortDirDesc = !string.Equals(queryRequest.SortDir, "asc", StringComparison.OrdinalIgnoreCase);
        baseQuery = queryRequest.SortBy?.ToLower() switch
        {
            "fullname" => sortDirDesc ? baseQuery.OrderByDescending(u => u.FullName) : baseQuery.OrderBy(u => u.FullName),
            "tier" => sortDirDesc
                ? baseQuery.OrderByDescending(u => u.Membership != null ? (u.Membership.MinPoints ?? -1) : -1).ThenByDescending(u => u.LoyaltyPoints)
                : baseQuery.OrderBy(u => u.Membership != null ? (u.Membership.MinPoints ?? -1) : -1).ThenByDescending(u => u.LoyaltyPoints),
            "usablepoints" => sortDirDesc ? baseQuery.OrderByDescending(u => u.LoyaltyPointsUsable) : baseQuery.OrderBy(u => u.LoyaltyPointsUsable),
            "createdat" => sortDirDesc ? baseQuery.OrderByDescending(u => u.CreatedAt) : baseQuery.OrderBy(u => u.CreatedAt),
            _ => sortDirDesc ? baseQuery.OrderByDescending(u => u.LoyaltyPoints).ThenByDescending(u => u.CreatedAt) : baseQuery.OrderBy(u => u.LoyaltyPoints).ThenBy(u => u.CreatedAt)
        };

        var data = await baseQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.Phone,
                u.AvatarUrl,
                u.Status,
                u.CreatedAt,
                u.UpdatedAt,
                u.LastLoginAt,
                u.LoyaltyPoints,
                u.LoyaltyPointsUsable,
                MembershipId = u.MembershipId,
                MembershipTier = u.Membership != null ? u.Membership.TierName : null,
                MembershipColor = u.Membership != null ? u.Membership.ColorHex : null,
                MembershipDiscount = u.Membership != null ? u.Membership.DiscountPercent : null,
                TransactionCount = u.LoyaltyTransactions.Count()
            })
            .ToListAsync();

        return Ok(new ApiListResponse<object>
        {
            Data = data,
            Pagination = new PaginationMeta
            {
                CurrentPage = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = (int)Math.Ceiling(totalItems / (double)pageSize)
            },
            Summary = new
            {
                totalMembers = summaryTotals?.TotalMembers ?? 0,
                totalPoints = summaryTotals?.TotalPoints ?? 0,
                totalUsablePoints = summaryTotals?.TotalUsablePoints ?? 0,
                activeMembers = summaryTotals?.ActiveMembers ?? 0,
                lockedMembers = summaryTotals?.LockedMembers ?? 0,
                tierBreakdown
            },
            Message = "Lấy danh sách khách hàng thành viên thành công."
        });
    }

    [HttpGet("{id:int}")]
    [RequirePermission(PermissionCodes.ManageUsers)]
    public async Task<IActionResult> GetById(int id)
    {
        var member = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == id && (u.MembershipId != null || u.LoyaltyPoints > 0 || u.LoyaltyPointsUsable > 0))
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.Phone,
                u.DateOfBirth,
                u.Gender,
                u.Address,
                u.NationalId,
                u.AvatarUrl,
                u.Status,
                u.CreatedAt,
                u.UpdatedAt,
                u.LastLoginAt,
                u.LoyaltyPoints,
                u.LoyaltyPointsUsable,
                MembershipId = u.MembershipId,
                MembershipTier = u.Membership != null ? u.Membership.TierName : null,
                MembershipColor = u.Membership != null ? u.Membership.ColorHex : null,
                MembershipDiscount = u.Membership != null ? u.Membership.DiscountPercent : null,
                TransactionCount = u.LoyaltyTransactions.Count(),
                LastTransactionAt = u.LoyaltyTransactions
                    .OrderByDescending(t => t.CreatedAt)
                    .Select(t => (DateTime?)t.CreatedAt)
                    .FirstOrDefault(),
                BookingCount = u.Bookings.Count(),
                CompletedBookingCount = u.Bookings.Count(b => b.Status == "Completed"),
                ReviewCount = u.Reviews.Count(),
                VoucherUsageCount = u.VoucherUsages.Count(),
                RecentBookings = u.Bookings
                    .OrderByDescending(b => b.Id)
                    .Take(5)
                    .Select(b => new
                    {
                        b.Id,
                        b.BookingCode,
                        b.Status,
                        b.TotalEstimatedAmount,
                        CheckInDate = b.BookingDetails
                            .OrderBy(d => d.CheckInDate)
                            .Select(d => (DateTime?)d.CheckInDate)
                            .FirstOrDefault()
                    }),
                RecentReviews = u.Reviews
                    .OrderByDescending(r => r.CreatedAt)
                    .Take(5)
                    .Select(r => new
                    {
                        r.Id,
                        r.Rating,
                        r.Comment,
                        r.CreatedAt,
                        r.IsApproved
                    }),
                RecentVoucherUsage = u.VoucherUsages
                    .OrderByDescending(v => v.UsedAt)
                    .Take(5)
                    .Select(v => new
                    {
                        v.Id,
                        v.VoucherId,
                        VoucherCode = v.Voucher != null ? v.Voucher.Code : null,
                        v.UsedAt
                    })
            })
            .FirstOrDefaultAsync();

        if (member is null)
            return NotFound(new { message = $"Không tìm thấy khách hàng thành viên #{id}." });

        return Ok(member);
    }

    [HttpGet("{id:int}/transactions")]
    [RequirePermission(PermissionCodes.ManageUsers)]
    public async Task<IActionResult> GetTransactions(int id)
    {
        var memberExists = await _db.Users
            .AsNoTracking()
            .AnyAsync(u => u.Id == id && (u.MembershipId != null || u.LoyaltyPoints > 0 || u.LoyaltyPointsUsable > 0));

        if (!memberExists)
            return NotFound(new { message = $"Không tìm thấy khách hàng thành viên #{id}." });

        var transactions = await _db.LoyaltyTransactions
            .AsNoTracking()
            .Where(t => t.UserId == id)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new LoyaltyTransactionResponse(
                t.Id,
                t.TransactionType,
                t.Points,
                t.BalanceAfter,
                t.Note,
                t.BookingId,
                t.Booking != null ? t.Booking.BookingCode : null,
                t.CreatedAt
            ))
            .ToListAsync();

        return Ok(new
        {
            data = transactions,
            summary = new
            {
                totalTransactions = transactions.Count,
                earnedPoints = transactions.Where(t => t.Points > 0).Sum(t => t.Points),
                spentPoints = transactions.Where(t => t.Points < 0).Sum(t => Math.Abs(t.Points))
            },
            message = "Lấy lịch sử tích điểm thành công."
        });
    }
}
