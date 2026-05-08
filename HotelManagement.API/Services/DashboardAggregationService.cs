using HotelManagement.Core.Constants;
using HotelManagement.Core.DTOs;
using HotelManagement.Core.Entities;
using HotelManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace HotelManagement.API.Services;

// ────────────────────────────────────────────────────────────────────────────
//  ROLES mà hệ thống tạo snapshot
// ────────────────────────────────────────────────────────────────────────────
public static class SnapshotRoles
{
    public const string Admin        = "Admin";
    public const string Manager      = "Manager";
    public const string Accountant   = "Accountant";
    public const string Receptionist = "Receptionist";
    public const string Housekeeping = "Housekeeping";

    /// <summary>Tất cả các role sẽ được sinh snapshot. Các role còn lại nhận snapshot trống.</summary>
    public static readonly string[] All = [Admin, Manager, Accountant, Receptionist, Housekeeping];
}

public interface IDashboardAggregationService
{
    Task<DashboardOverviewResponse> GetOverviewAsync(CancellationToken cancellationToken = default);
    Task<ReportOccupancyResponse> GetOccupancyAsync(DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default);
    Task<ReportRevenueResponse> GetRevenueAsync(DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default);
    Task<ReportBookingsResponse> GetBookingsAsync(DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default);
    Task<ReportServicesResponse> GetServicesAsync(DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default);
    Task<ReportLossDamageResponse> GetLossDamagesAsync(DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default);
    Task<ReportMembersResponse> GetMembersAsync(CancellationToken cancellationToken = default);

    // ── Snapshot API ─────────────────────────────────────────────────────────
    /// <summary>Trả về snapshot JSON cho role, tự động tính mới nếu chưa có hôm nay.</summary>
    Task<object> GetRoleSnapshotAsync(string roleName, CancellationToken ct = default);
    /// <summary>Buộc tính lại & lưu snapshot cho danh sách roles (fire-and-forget safe).</summary>
    Task RefreshSnapshotsAsync(IEnumerable<string> roleNames, CancellationToken ct = default);
}

public class DashboardAggregationService : IDashboardAggregationService
{
    private readonly AppDbContext _db;

    public DashboardAggregationService(AppDbContext db)
    {
        _db = db;
    }

    // ════════════════════════════════════════════════════════════════════════
    //  SNAPSHOT — PUBLIC API
    // ════════════════════════════════════════════════════════════════════════

    public async Task<object> GetRoleSnapshotAsync(string roleName, CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.Date;
        var existing = await _db.DashboardSnapshots
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.RoleName == roleName && s.SnapshotDate == today, ct);

        if (existing != null)
        {
            // Trả về JSON đã lưu, kèm metadata
            var parsed = JsonSerializer.Deserialize<object>(existing.SnapshotData)
                         ?? new object();
            return new
            {
                role = roleName,
                computedAt = existing.ComputedAt,
                data = parsed
            };
        }

        // Chưa có snapshot hôm nay → tính ngay
        var (payload, json) = await BuildRolePayloadAsync(roleName, ct);
        await UpsertSnapshotAsync(roleName, today, json, ct);
        return new
        {
            role = roleName,
            computedAt = DateTime.UtcNow,
            data = payload
        };
    }

    public async Task RefreshSnapshotsAsync(IEnumerable<string> roleNames, CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.Date;
        foreach (var role in roleNames.Distinct())
        {
            try
            {
                var (_, json) = await BuildRolePayloadAsync(role, ct);
                await UpsertSnapshotAsync(role, today, json, ct);
            }
            catch
            {
                // Không để lỗi tính 1 role ảnh hưởng các role khác
            }
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  BUILD PAYLOAD THEO ROLE
    // ════════════════════════════════════════════════════════════════════════

    private async Task<(object Payload, string Json)> BuildRolePayloadAsync(string roleName, CancellationToken ct)
    {
        object payload = roleName switch
        {
            SnapshotRoles.Admin or SnapshotRoles.Manager => await BuildAdminPayloadAsync(ct),
            SnapshotRoles.Accountant => await BuildAccountantPayloadAsync(ct),
            SnapshotRoles.Receptionist => await BuildReceptionistPayloadAsync(ct),
            SnapshotRoles.Housekeeping => await BuildHousekeepingPayloadAsync(ct),
            _ => new { note = "No dashboard data for this role." }
        };

        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        var json = JsonSerializer.Serialize(payload, options);
        return (payload, json);
    }

    // ── Admin / Manager ──────────────────────────────────────────────────────
    private async Task<object> BuildAdminPayloadAsync(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var today = now.Date;

        var bookings = await _db.Bookings
            .AsNoTracking()
            .Include(b => b.BookingDetails)
            .OrderByDescending(b => b.Id)
            .Take(500)
            .ToListAsync(ct);

        var rooms = await _db.Rooms
            .AsNoTracking()
            .Include(r => r.RoomType)
            .OrderBy(r => r.RoomNumber)
            .ToListAsync(ct);

        var users = await _db.Users.AsNoTracking().ToListAsync(ct);
        var reviews = await _db.Reviews.AsNoTracking().Where(r => r.IsApproved == true).ToListAsync(ct);
        var damages = await _db.LossAndDamages.AsNoTracking().ToListAsync(ct);
        var invoices = await _db.Invoices.AsNoTracking()
            .Where(i => i.Status == "Paid")
            .OrderByDescending(i => i.CreatedAt)
            .Take(500)
            .ToListAsync(ct);

        var completedBookings = bookings.Where(b => b.Status == BookingStatuses.Completed).ToList();
        var totalRevenue = invoices.Sum(i => i.FinalTotal ?? 0m);
        var todayRevenue = invoices
            .Where(i => i.CreatedAt.Date == today)
            .Sum(i => i.FinalTotal ?? 0m);

        var availableRooms = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Available && r.CleaningStatus == CleaningStatuses.Clean);
        var occupiedRooms = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Occupied);
        var totalRooms = Math.Max(1, rooms.Count);

        var revenueLabels = Enumerable.Range(0, 7)
            .Select(offset => now.Date.AddDays(offset - 6).ToString("dd/MM"))
            .ToList();

        var revenueValues = Enumerable.Range(0, 7)
            .Select(offset =>
            {
                var day = now.Date.AddDays(offset - 6);
                return invoices
                    .Where(i => i.CreatedAt.Date == day)
                    .Sum(i => i.FinalTotal ?? 0m);
            })
            .ToList();

        var monthStart = new DateTime(today.Year, today.Month, 1);

        return new
        {
            section = "full",
            kpis = new
            {
                totalRevenue,
                todayRevenue,
                activeBookings = bookings.Count(b => b.Status is BookingStatuses.Pending or BookingStatuses.Confirmed or BookingStatuses.CheckedIn or BookingStatuses.CheckedOutPendingSettlement),
                pendingBookings = bookings.Count(b => b.Status == BookingStatuses.Pending),
                availableRooms,
                occupancyRate = (int)Math.Round((occupiedRooms / (double)totalRooms) * 100),
                avgRating = reviews.Count == 0
                    ? 0d
                    : Math.Round(reviews.Where(r => r.Rating.HasValue).Average(r => (double)r.Rating!.Value), 1),
                totalUsers = users.Count,
                newUsersThisMonth = users.Count(u => u.CreatedAt >= monthStart)
            },
            revenue = new { labels = revenueLabels, values = revenueValues },
            bookings = new
            {
                byStatus = bookings.GroupBy(b => b.Status ?? "Unknown").ToDictionary(g => g.Key, g => g.Count()),
                recent = bookings.Take(8).Select(b => new
                {
                    b.Id,
                    b.BookingCode,
                    b.GuestName,
                    b.GuestPhone,
                    b.TotalEstimatedAmount,
                    b.Status
                }).ToList()
            },
            rooms = new
            {
                countByStatus = new Dictionary<string, int>
                {
                    ["Ready"]       = availableRooms,
                    ["Occupied"]    = occupiedRooms,
                    ["Cleaning"]    = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Available && r.CleaningStatus == CleaningStatuses.Dirty),
                    ["PendingLoss"] = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Available && r.CleaningStatus == CleaningStatuses.PendingLoss),
                    ["Maintenance"] = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Disabled)
                },
                preview = rooms.Take(12).Select(r => new
                {
                    r.Id,
                    r.RoomNumber,
                    roomTypeName = r.RoomType?.Name,
                    r.BusinessStatus,
                    r.CleaningStatus,
                    liveStatus = BuildRoomLiveStatus(r.BusinessStatus, r.CleaningStatus)
                }).ToList()
            },
            members = new
            {
                totalMembers   = users.Count(u => u.MembershipId != null || u.LoyaltyPoints > 0),
                activeMembers  = users.Count(u => (u.MembershipId != null || u.LoyaltyPoints > 0) && u.Status == true),
                lockedMembers  = users.Count(u => (u.MembershipId != null || u.LoyaltyPoints > 0) && u.Status != true),
                totalPoints    = users.Sum(u => u.LoyaltyPoints)
            },
            damages = new
            {
                pendingCount   = damages.Count(d => d.Status == "Pending"),
                confirmedCount = damages.Count(d => d.Status == "Confirmed"),
                totalPenalty   = damages.Sum(d => d.PenaltyAmount * d.Quantity)
            }
        };
    }

    // ── Kế toán ────────────────────────────────────────────────────────────────
    private async Task<object> BuildAccountantPayloadAsync(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        var monthStart = new DateTime(today.Year, today.Month, 1);
        var monthEnd   = monthStart.AddMonths(1).AddTicks(-1);

        var invoices = await _db.Invoices
            .AsNoTracking()
            .Where(i => i.CreatedAt >= monthStart && i.CreatedAt <= monthEnd)
            .ToListAsync(ct);

        var allInvoices = await _db.Invoices.AsNoTracking().ToListAsync(ct);
        var damages = await _db.LossAndDamages.AsNoTracking().ToListAsync(ct);
        var orders  = await _db.OrderServices.AsNoTracking()
            .Where(o => o.OrderDate >= monthStart && o.OrderDate <= monthEnd)
            .ToListAsync(ct);
        var payments = await _db.Payments.AsNoTracking()
            .Where(p => p.PaymentDate >= monthStart && p.Status == "Success")
            .ToListAsync(ct);

        var paidInvoices = allInvoices.Where(i => i.Status == "Paid").ToList();
        var monthPaid    = invoices.Where(i => i.Status == "Paid").ToList();

        var revenueByDay = Enumerable.Range(0, 7)
            .Select(offset =>
            {
                var day = today.AddDays(offset - 6);
                return new
                {
                    date   = day.ToString("dd/MM"),
                    amount = paidInvoices.Where(i => i.CreatedAt.Date == day).Sum(i => i.FinalTotal ?? 0m)
                };
            }).ToList();

        return new
        {
            section = "accountant",
            period  = new { from = monthStart, to = monthEnd },
            revenue = new
            {
                totalAllTime   = paidInvoices.Sum(i => i.FinalTotal ?? 0m),
                thisMonth      = monthPaid.Sum(i => i.FinalTotal ?? 0m),
                roomRevenue    = invoices.Sum(i => i.TotalRoomAmount ?? 0m),
                serviceRevenue = invoices.Sum(i => i.TotalServiceAmount ?? 0m),
                damageRevenue  = invoices.Sum(i => i.TotalDamageAmount ?? 0m),
                discounts      = invoices.Sum(i => i.DiscountAmount ?? 0m)
            },
            invoiceSummary = new
            {
                total          = invoices.Count,
                paid           = invoices.Count(i => i.Status == "Paid"),
                unpaid         = invoices.Count(i => i.Status == "Unpaid"),
                partiallyPaid  = invoices.Count(i => i.Status == "Partially_Paid"),
                draft          = invoices.Count(i => i.Status == "Draft")
            },
            payments = new
            {
                totalThisMonth = payments.Sum(p => p.PaymentType == "Refund" ? -p.AmountPaid : p.AmountPaid),
                byMethod = payments
                    .GroupBy(p => p.PaymentMethod ?? "Other")
                    .ToDictionary(g => g.Key, g => g.Sum(p => p.AmountPaid))
            },
            services = new
            {
                totalOrders = orders.Count,
                totalAmount = orders.Sum(o => o.TotalAmount ?? 0m)
            },
            damages = new
            {
                pendingCount   = damages.Count(d => d.Status == "Pending"),
                confirmedCount = damages.Count(d => d.Status == "Confirmed"),
                totalPenalty   = damages.Sum(d => d.PenaltyAmount * d.Quantity),
                thisMonthPenalty = damages
                    .Where(d => d.CreatedAt >= monthStart && d.Status == "Confirmed")
                    .Sum(d => d.PenaltyAmount * d.Quantity)
            },
            revenueByDay
        };
    }

    // ── Lễ tân ─────────────────────────────────────────────────────────────────
    private async Task<object> BuildReceptionistPayloadAsync(CancellationToken ct)
    {
        var today = DateTime.UtcNow.Date;

        var bookings = await _db.Bookings
            .AsNoTracking()
            .Include(b => b.BookingDetails)
            .Where(b => b.Status != BookingStatuses.Cancelled && b.Status != BookingStatuses.Completed)
            .OrderByDescending(b => b.Id)
            .ToListAsync(ct);

        var rooms = await _db.Rooms
            .AsNoTracking()
            .Include(r => r.RoomType)
            .OrderBy(r => r.RoomNumber)
            .ToListAsync(ct);

        var damages = await _db.LossAndDamages.AsNoTracking()
            .Where(d => d.Status == "Pending")
            .ToListAsync(ct);

        var arrivals = bookings.Where(b =>
            (b.Status == BookingStatuses.Pending || b.Status == BookingStatuses.Confirmed) &&
            b.BookingDetails.Any(d => d.CheckInDate.Date == today)).ToList();

        var checkouts = bookings.Where(b =>
            (b.Status == BookingStatuses.CheckedIn || b.Status == BookingStatuses.CheckedOutPendingSettlement) &&
            b.BookingDetails.Any(d => d.CheckOutDate.Date == today)).ToList();

        var staying = bookings.Where(b => b.Status == BookingStatuses.CheckedIn).ToList();

        return new
        {
            section = "receptionist",
            today   = today,
            summary = new
            {
                todayArrivals  = arrivals.Count,
                todayCheckouts = checkouts.Count,
                staying        = staying.Count,
                pendingBookings = bookings.Count(b => b.Status == BookingStatuses.Pending),
                pendingDamages = damages.Count
            },
            arrivals = arrivals.Take(20).Select(b => new
            {
                b.Id,
                b.BookingCode,
                b.GuestName,
                b.GuestPhone,
                b.Status,
                b.TotalEstimatedAmount,
                checkInDate = b.BookingDetails.OrderBy(d => d.CheckInDate).FirstOrDefault()?.CheckInDate
            }).ToList(),
            checkouts = checkouts.Take(20).Select(b => new
            {
                b.Id,
                b.BookingCode,
                b.GuestName,
                b.GuestPhone,
                b.Status,
                checkOutDate = b.BookingDetails.OrderByDescending(d => d.CheckOutDate).FirstOrDefault()?.CheckOutDate
            }).ToList(),
            rooms = new
            {
                countByStatus = new Dictionary<string, int>
                {
                    ["Ready"]       = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Available && r.CleaningStatus == CleaningStatuses.Clean),
                    ["Occupied"]    = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Occupied),
                    ["Cleaning"]    = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Available && r.CleaningStatus == CleaningStatuses.Dirty),
                    ["PendingLoss"] = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Available && r.CleaningStatus == CleaningStatuses.PendingLoss),
                    ["Maintenance"] = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Disabled)
                },
                list = rooms.Select(r => new
                {
                    r.Id,
                    r.RoomNumber,
                    roomTypeName = r.RoomType?.Name,
                    r.BusinessStatus,
                    r.CleaningStatus,
                    liveStatus = BuildRoomLiveStatus(r.BusinessStatus, r.CleaningStatus)
                }).ToList()
            }
        };
    }

    // ── Housekeeping ────────────────────────────────────────────────────────────
    private async Task<object> BuildHousekeepingPayloadAsync(CancellationToken ct)
    {
        var rooms = await _db.Rooms
            .AsNoTracking()
            .Include(r => r.RoomType)
            .OrderBy(r => r.RoomNumber)
            .ToListAsync(ct);

        var damages = await _db.LossAndDamages
            .AsNoTracking()
            .Where(d => d.Status == "Pending")
            .OrderByDescending(d => d.CreatedAt)
            .Take(50)
            .ToListAsync(ct);

        return new
        {
            section = "housekeeping",
            summary = new
            {
                needsCleaning  = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Available && r.CleaningStatus == CleaningStatuses.Dirty),
                pendingLoss    = rooms.Count(r => r.CleaningStatus == CleaningStatuses.PendingLoss),
                occupied       = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Occupied),
                ready          = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Available && r.CleaningStatus == CleaningStatuses.Clean),
                maintenance    = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Disabled)
            },
            rooms = rooms.Select(r => new
            {
                r.Id,
                r.RoomNumber,
                r.Floor,
                roomTypeName = r.RoomType?.Name,
                r.BusinessStatus,
                r.CleaningStatus,
                liveStatus = BuildRoomLiveStatus(r.BusinessStatus, r.CleaningStatus)
            }).ToList(),
            pendingDamages = damages.Select(d => new
            {
                d.Id,
                d.Description,
                d.Quantity,
                d.PenaltyAmount,
                d.Status,
                d.CreatedAt
            }).ToList()
        };
    }

    // ════════════════════════════════════════════════════════════════════════
    //  UPSERT SNAPSHOT
    // ════════════════════════════════════════════════════════════════════════

    private async Task UpsertSnapshotAsync(string roleName, DateTime date, string json, CancellationToken ct)
    {
        var existing = await _db.DashboardSnapshots
            .FirstOrDefaultAsync(s => s.RoleName == roleName && s.SnapshotDate == date, ct);

        if (existing != null)
        {
            existing.SnapshotData = json;
            existing.ComputedAt   = DateTime.UtcNow;
        }
        else
        {
            _db.DashboardSnapshots.Add(new DashboardSnapshot
            {
                RoleName     = roleName,
                SnapshotDate = date,
                SnapshotData = json,
                ComputedAt   = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync(ct);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  LEGACY REPORT METHODS (giữ nguyên để backward compatible)
    // ════════════════════════════════════════════════════════════════════════

    public async Task<DashboardOverviewResponse> GetOverviewAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var today = now.Date;

        var bookings = await _db.Bookings
            .AsNoTracking()
            .Include(b => b.BookingDetails)
            .OrderByDescending(b => b.Id)
            .Take(200)
            .ToListAsync(cancellationToken);

        var rooms = await _db.Rooms
            .AsNoTracking()
            .Include(r => r.RoomType)
            .OrderBy(r => r.RoomNumber)
            .ToListAsync(cancellationToken);

        var users = await _db.Users.AsNoTracking().ToListAsync(cancellationToken);
        var reviews = await _db.Reviews.AsNoTracking().Where(r => r.IsApproved == true).ToListAsync(cancellationToken);
        var damages = await _db.LossAndDamages.AsNoTracking().ToListAsync(cancellationToken);

        var completedBookings = bookings.Where(b => string.Equals(b.Status, BookingStatuses.Completed, StringComparison.OrdinalIgnoreCase)).ToList();
        var totalRevenue = completedBookings.Sum(b => b.TotalEstimatedAmount);
        var todayRevenue = completedBookings
            .Where(b => (b.CheckOutTime ?? b.BookingDetails.OrderByDescending(d => d.CheckOutDate).Select(d => (DateTime?)d.CheckOutDate).FirstOrDefault())?.Date == today)
            .Sum(b => b.TotalEstimatedAmount);

        var availableRooms = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Available && r.CleaningStatus == CleaningStatuses.Clean);
        var occupiedRooms = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Occupied);
        var totalRooms = Math.Max(1, rooms.Count);

        var revenueLabels = Enumerable.Range(0, 7)
            .Select(offset => now.Date.AddDays(offset - 6).ToString("dd/MM"))
            .ToList();
        var revenueValues = Enumerable.Range(0, 7)
            .Select(offset =>
            {
                var day = now.Date.AddDays(offset - 6);
                return completedBookings
                    .Where(b => (b.CheckOutTime ?? b.BookingDetails.OrderByDescending(d => d.CheckOutDate).Select(d => (DateTime?)d.CheckOutDate).FirstOrDefault())?.Date == day)
                    .Sum(b => b.TotalEstimatedAmount);
            })
            .ToList();

        return new DashboardOverviewResponse
        {
            Kpis = new DashboardKpiResponse
            {
                TotalRevenue = totalRevenue,
                TodayRevenue = todayRevenue,
                ActiveBookings = bookings.Count(b => b.Status is BookingStatuses.Pending or BookingStatuses.Confirmed or BookingStatuses.CheckedIn or BookingStatuses.CheckedOutPendingSettlement),
                PendingBookings = bookings.Count(b => b.Status == BookingStatuses.Pending),
                AvailableRooms = availableRooms,
                OccupancyRate = (int)Math.Round((occupiedRooms / (double)totalRooms) * 100),
                AvgRating = reviews.Count == 0
                    ? 0d
                    : Math.Round(reviews.Where(r => r.Rating.HasValue).Average(r => (double)r.Rating!.Value), 1)
            },
            Revenue = new DashboardRevenueResponse { Labels = revenueLabels, Values = revenueValues },
            Bookings = new DashboardBookingSummaryResponse
            {
                ByStatus = bookings.GroupBy(b => b.Status ?? "Unknown").ToDictionary(g => g.Key, g => g.Count()),
                Recent = bookings.Take(8).Select(b => new BookingSummaryItemResponse
                {
                    Id = b.Id,
                    BookingCode = b.BookingCode,
                    GuestName = b.GuestName,
                    GuestPhone = b.GuestPhone,
                    TotalEstimatedAmount = b.TotalEstimatedAmount,
                    Status = b.Status,
                    ReferenceDate = b.CheckInTime ?? b.BookingDetails.OrderBy(d => d.CheckInDate).Select(d => (DateTime?)d.CheckInDate).FirstOrDefault()
                }).ToList()
            },
            Rooms = new DashboardRoomSummaryResponse
            {
                CountByStatus = new Dictionary<string, int>
                {
                    ["Ready"]       = availableRooms,
                    ["Occupied"]    = occupiedRooms,
                    ["Cleaning"]    = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Available && r.CleaningStatus == CleaningStatuses.Dirty),
                    ["PendingLoss"] = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Available && r.CleaningStatus == CleaningStatuses.PendingLoss),
                    ["Maintenance"] = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Disabled)
                },
                Preview = rooms.Take(12).Select(r => new RoomSummaryItemResponse
                {
                    Id = r.Id,
                    RoomNumber = r.RoomNumber,
                    RoomTypeName = r.RoomType?.Name,
                    BusinessStatus = r.BusinessStatus,
                    CleaningStatus = r.CleaningStatus,
                    LiveStatus = BuildRoomLiveStatus(r.BusinessStatus, r.CleaningStatus)
                }).ToList()
            },
            Members = new DashboardMemberSummaryResponse
            {
                TotalMembers  = users.Count(u => u.MembershipId != null || u.LoyaltyPoints > 0 || u.LoyaltyPointsUsable > 0),
                ActiveMembers = users.Count(u => (u.MembershipId != null || u.LoyaltyPoints > 0 || u.LoyaltyPointsUsable > 0) && u.Status == true),
                LockedMembers = users.Count(u => (u.MembershipId != null || u.LoyaltyPoints > 0 || u.LoyaltyPointsUsable > 0) && u.Status != true),
                TotalPoints   = users.Sum(u => u.LoyaltyPoints)
            },
            Damages = new DashboardDamageSummaryResponse
            {
                PendingCount   = damages.Count(d => string.Equals(d.Status, "Pending", StringComparison.OrdinalIgnoreCase)),
                ConfirmedCount = damages.Count(d => string.Equals(d.Status, "Confirmed", StringComparison.OrdinalIgnoreCase)),
                TotalPenaltyAmount = damages.Sum(d => d.PenaltyAmount * d.Quantity)
            }
        };
    }

    public async Task<ReportOccupancyResponse> GetOccupancyAsync(DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default)
    {
        var rooms = await _db.Rooms.AsNoTracking().ToListAsync(cancellationToken);
        var totalRooms    = rooms.Count;
        var occupiedRooms = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Occupied);
        var availableRooms = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Available && r.CleaningStatus == CleaningStatuses.Clean);
        var disabledRooms = rooms.Count(r => r.BusinessStatus == RoomBusinessStatuses.Disabled);

        return new ReportOccupancyResponse
        {
            FromDate = (fromDate ?? DateTime.UtcNow.Date).Date,
            ToDate = (toDate ?? DateTime.UtcNow.Date).Date,
            TotalRooms = totalRooms,
            OccupiedRooms = occupiedRooms,
            AvailableRooms = availableRooms,
            DisabledRooms = disabledRooms,
            OccupancyRate = totalRooms == 0 ? 0 : (int)Math.Round((occupiedRooms / (double)totalRooms) * 100)
        };
    }

    public async Task<ReportRevenueResponse> GetRevenueAsync(DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var invoices = await _db.Invoices.AsNoTracking().Where(i => i.CreatedAt >= from && i.CreatedAt <= to).ToListAsync(cancellationToken);
        var roomRevenue    = invoices.Sum(i => i.TotalRoomAmount ?? 0m);
        var serviceRevenue = invoices.Sum(i => i.TotalServiceAmount ?? 0m);
        var damageRevenue  = invoices.Sum(i => i.TotalDamageAmount ?? 0m);

        return new ReportRevenueResponse
        {
            FromDate = from,
            ToDate = to,
            RoomRevenue    = roomRevenue,
            ServiceRevenue = serviceRevenue,
            DamageRevenue  = damageRevenue,
            TotalRevenue   = roomRevenue + serviceRevenue + damageRevenue
        };
    }

    public async Task<ReportBookingsResponse> GetBookingsAsync(DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var bookings = await _db.Bookings
            .AsNoTracking()
            .Include(b => b.BookingDetails)
            .Where(b => b.BookingDetails.Any(d => d.CheckInDate >= from && d.CheckInDate <= to))
            .ToListAsync(cancellationToken);

        return new ReportBookingsResponse
        {
            FromDate = from,
            ToDate = to,
            ByStatus = bookings.GroupBy(b => b.Status ?? "Unknown").ToDictionary(g => g.Key, g => g.Count()),
            BySource = bookings.GroupBy(b => b.Source ?? BookingSources.Online).ToDictionary(g => g.Key, g => g.Count())
        };
    }

    public async Task<ReportServicesResponse> GetServicesAsync(DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var orders = await _db.OrderServices
            .AsNoTracking()
            .Include(o => o.OrderServiceDetails)
                .ThenInclude(d => d.Service)
            .Where(o => o.OrderDate >= from && o.OrderDate <= to)
            .ToListAsync(cancellationToken);

        return new ReportServicesResponse
        {
            FromDate = from,
            ToDate = to,
            TotalOrders = orders.Count,
            TotalAmount = orders.Sum(o => o.TotalAmount ?? 0m),
            TopServices = orders
                .SelectMany(o => o.OrderServiceDetails)
                .Where(d => d.Service != null)
                .GroupBy(d => new { d.ServiceId, d.Service!.Name })
                .Select(g => new ServiceSalesItemResponse
                {
                    ServiceId   = g.Key.ServiceId ?? 0,
                    ServiceName = g.Key.Name,
                    Quantity    = g.Sum(x => x.Quantity),
                    Revenue     = g.Sum(x => x.Quantity * x.UnitPrice)
                })
                .OrderByDescending(x => x.Revenue)
                .Take(5)
                .ToList()
        };
    }

    public async Task<ReportLossDamageResponse> GetLossDamagesAsync(DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var incidents = await _db.LossAndDamages.AsNoTracking().Where(x => x.CreatedAt >= from && x.CreatedAt <= to).ToListAsync(cancellationToken);

        return new ReportLossDamageResponse
        {
            FromDate          = from,
            ToDate            = to,
            TotalIncidents    = incidents.Count,
            PendingIncidents  = incidents.Count(x => string.Equals(x.Status, "Pending", StringComparison.OrdinalIgnoreCase)),
            ConfirmedIncidents = incidents.Count(x => string.Equals(x.Status, "Confirmed", StringComparison.OrdinalIgnoreCase)),
            TotalPenaltyAmount = incidents.Sum(x => x.PenaltyAmount * x.Quantity)
        };
    }

    public async Task<ReportMembersResponse> GetMembersAsync(CancellationToken cancellationToken = default)
    {
        var users = await _db.Users
            .AsNoTracking()
            .Include(u => u.Membership)
            .Where(u => u.MembershipId != null || u.LoyaltyPoints > 0 || u.LoyaltyPointsUsable > 0)
            .ToListAsync(cancellationToken);

        return new ReportMembersResponse
        {
            TotalMembers  = users.Count,
            ActiveMembers = users.Count(u => u.Status == true),
            LockedMembers = users.Count(u => u.Status != true),
            TotalPoints   = users.Sum(u => u.LoyaltyPoints),
            TierBreakdown = users
                .GroupBy(u => u.Membership?.TierName ?? "Chưa có hạng")
                .Select(g => new MemberTierBreakdownItemResponse
                {
                    TierName    = g.Key,
                    MemberCount = g.Count(),
                    TotalPoints = g.Sum(x => x.LoyaltyPoints)
                })
                .OrderByDescending(x => x.MemberCount)
                .ToList()
        };
    }

    // ════════════════════════════════════════════════════════════════════════
    //  PRIVATE HELPERS
    // ════════════════════════════════════════════════════════════════════════

    private static (DateTime From, DateTime To) NormalizeRange(DateTime? fromDate, DateTime? toDate)
    {
        var from = (fromDate ?? DateTime.UtcNow.Date.AddDays(-30)).Date;
        var to   = (toDate ?? DateTime.UtcNow.Date).Date.AddDays(1).AddTicks(-1);
        if (to < from) to = from.AddDays(1).AddTicks(-1);
        return (from, to);
    }

    private static string BuildRoomLiveStatus(string businessStatus, string cleaningStatus)
    {
        if (businessStatus == RoomBusinessStatuses.Disabled) return "Maintenance";
        if (businessStatus == RoomBusinessStatuses.Occupied) return "Occupied";
        if (cleaningStatus == CleaningStatuses.PendingLoss)  return "PendingLoss";
        if (cleaningStatus == CleaningStatuses.Dirty)        return "Cleaning";
        return "Ready";
    }
}
