using System.Text.Json;
using HotelManagement.Core.Authorization;
using HotelManagement.Core.DTOs;
using HotelManagement.Core.Entities;
using HotelManagement.Core.Helpers;
using HotelManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using static System.Math;

namespace HotelManagement.API.Services;

public sealed class RoleDashboardPeriodService : IRoleDashboardPeriodService
{
    private static readonly string[] SupportedDashboardRoles = new[]
    {
        "Admin",
        "Manager",
        "Receptionist",
        "Accountant",
        "Housekeeping",
        "WarehouseStaff"
    };

    private readonly AppDbContext _db;

    public RoleDashboardPeriodService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<DashboardPeriodResponseDto?> GetDashboardAsync(
        string roleName,
        string periodType,
        string? periodKey,
        bool currentOnly,
        CancellationToken cancellationToken = default)
    {
        var normalizedRole = NormalizeRoleName(roleName);
        var normalizedPeriodType = DashboardPeriodHelper.NormalizePeriodType(periodType);

        RoleDashboardPeriodState? entity;

        if (currentOnly)
        {
            entity = await _db.RoleDashboardPeriodStates
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.RoleName == normalizedRole
                         && x.PeriodType == normalizedPeriodType
                         && x.IsCurrent,
                    cancellationToken);

            if (entity is null)
            {
                await RebuildDashboardAsync(
                    normalizedRole,
                    normalizedPeriodType,
                    DateTime.UtcNow,
                    updatedByUserId: null,
                    eventType: "AUTO_BOOTSTRAP",
                    eventRefId: null,
                    cancellationToken);

                entity = await _db.RoleDashboardPeriodStates
                    .AsNoTracking()
                    .FirstOrDefaultAsync(
                        x => x.RoleName == normalizedRole
                             && x.PeriodType == normalizedPeriodType
                             && x.IsCurrent,
                        cancellationToken);
            }
        }
        else
        {
            entity = await _db.RoleDashboardPeriodStates
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.RoleName == normalizedRole
                         && x.PeriodType == normalizedPeriodType
                         && x.PeriodKey == periodKey,
                    cancellationToken);
        }

        return entity is null ? null : MapToDto(entity);
    }

    public async Task<IReadOnlyList<DashboardHistoryItemDto>> GetHistoryAsync(
        string roleName,
        string periodType,
        int take,
        CancellationToken cancellationToken = default)
    {
        var normalizedRole = NormalizeRoleName(roleName);
        var normalizedPeriodType = DashboardPeriodHelper.NormalizePeriodType(periodType);
        var limit = Math.Clamp(take, 1, 36);

        return await _db.RoleDashboardPeriodStates
            .AsNoTracking()
            .Where(x => x.RoleName == normalizedRole && x.PeriodType == normalizedPeriodType)
            .OrderByDescending(x => x.PeriodStart)
            .Take(limit)
            .Select(x => new DashboardHistoryItemDto
            {
                Id = x.Id,
                RoleName = x.RoleName,
                DashboardCode = x.DashboardCode,
                PeriodType = x.PeriodType,
                PeriodKey = x.PeriodKey,
                PeriodStart = x.PeriodStart,
                PeriodEnd = x.PeriodEnd,
                Status = x.Status,
                IsCurrent = x.IsCurrent,
                UpdatedAt = x.UpdatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task RebuildDashboardAsync(
        string roleName,
        string periodType,
        DateTime occurredAtUtc,
        int? updatedByUserId,
        string eventType,
        int? eventRefId,
        CancellationToken cancellationToken = default)
    {
        var normalizedRole = NormalizeRoleName(roleName);
        var normalizedPeriodType = DashboardPeriodHelper.NormalizePeriodType(periodType);
        var role = await _db.Roles.FirstOrDefaultAsync(x => x.Name == normalizedRole, cancellationToken)
            ?? throw new InvalidOperationException($"Role '{normalizedRole}' does not exist.");

        var periodInfo = DashboardPeriodHelper.Resolve(normalizedPeriodType, EnsureUtc(occurredAtUtc));
        var dashboardCode = DashboardPeriodHelper.GetDashboardCode(role.Name);
        var dashboardTitle = $"{role.Name} Dashboard";

        var entity = await _db.RoleDashboardPeriodStates
            .FirstOrDefaultAsync(
                x => x.RoleId == role.Id
                     && x.DashboardCode == dashboardCode
                     && x.PeriodType == periodInfo.PeriodType
                     && x.PeriodKey == periodInfo.PeriodKey,
                cancellationToken);

        var dashboardPayload = await BuildDashboardPayloadAsync(role.Name, periodInfo, cancellationToken);
        var comparisonPayload = await BuildComparisonPayloadAsync(
            role.Id,
            dashboardCode,
            periodInfo,
            dashboardPayload,
            cancellationToken);
        var now = DateTime.UtcNow;

        if (entity is null)
        {
            entity = new RoleDashboardPeriodState
            {
                RoleId = role.Id,
                RoleName = role.Name,
                DashboardCode = dashboardCode,
                DashboardTitle = dashboardTitle,
                PeriodType = periodInfo.PeriodType,
                PeriodKey = periodInfo.PeriodKey,
                PeriodStart = periodInfo.PeriodStart,
                PeriodEnd = periodInfo.PeriodEnd,
                DashboardJson = dashboardPayload,
                ComparisonJson = comparisonPayload,
                Status = "REBUILT",
                IsCurrent = periodInfo.IsCurrent,
                LastEventType = eventType,
                LastEventRefId = eventRefId,
                LastEventSource = nameof(RoleDashboardPeriodService),
                Version = 1,
                CreatedAt = now,
                UpdatedAt = now,
                UpdatedBy = updatedByUserId
            };
            _db.RoleDashboardPeriodStates.Add(entity);
        }
        else
        {
            entity.DashboardTitle = dashboardTitle;
            entity.PeriodStart = periodInfo.PeriodStart;
            entity.PeriodEnd = periodInfo.PeriodEnd;
            entity.DashboardJson = dashboardPayload;
            entity.ComparisonJson = comparisonPayload;
            entity.Status = "REBUILT";
            entity.IsCurrent = periodInfo.IsCurrent;
            entity.LastEventType = eventType;
            entity.LastEventRefId = eventRefId;
            entity.LastEventSource = nameof(RoleDashboardPeriodService);
            entity.Version += 1;
            entity.UpdatedAt = now;
            entity.UpdatedBy = updatedByUserId;
        }

        if (periodInfo.IsCurrent)
        {
            var outdatedCurrentRows = await _db.RoleDashboardPeriodStates
                .Where(x => x.RoleId == role.Id
                            && x.PeriodType == periodInfo.PeriodType
                            && x.Id != entity.Id
                            && x.IsCurrent)
                .ToListAsync(cancellationToken);

            foreach (var row in outdatedCurrentRows)
            {
                row.IsCurrent = false;
                row.ClosedAt = now;
                row.UpdatedAt = now;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task RebuildAffectedDashboardsAsync(
        string eventType,
        DateTime occurredAtUtc,
        int? updatedByUserId,
        int? eventRefId,
        CancellationToken cancellationToken = default)
    {
        var roles = await GetDashboardRolesAsync(cancellationToken);
        foreach (var roleName in roles)
        {
            foreach (var period in DashboardPeriodHelper.DefaultEventPeriods)
            {
                await RebuildDashboardAsync(
                    roleName,
                    period,
                    occurredAtUtc,
                    updatedByUserId,
                    eventType,
                    eventRefId,
                    cancellationToken);
            }
        }
    }

    public async Task RebuildAllCurrentDashboardsAsync(
        int? updatedByUserId,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var roles = await GetDashboardRolesAsync(cancellationToken);
        foreach (var roleName in roles)
        {
            foreach (var period in DashboardPeriodHelper.DefaultEventPeriods)
            {
                await RebuildDashboardAsync(
                    roleName,
                    period,
                    now,
                    updatedByUserId,
                    "MANUAL_REBUILD",
                    null,
                    cancellationToken);
            }
        }
    }

    private async Task<List<string>> GetDashboardRolesAsync(CancellationToken cancellationToken)
    {
        var roleNames = await _db.RolePermissions
            .AsNoTracking()
            .Where(x => x.Permission.PermissionCode == PermissionCodes.ViewDashboard)
            .Select(x => x.Role!.Name)
            .Distinct()
            .ToListAsync(cancellationToken);

        return roleNames
            .Where(x => SupportedDashboardRoles.Contains(x))
            .OrderBy(x => Array.IndexOf(SupportedDashboardRoles, x))
            .ToList();
    }

    private async Task<string> BuildDashboardPayloadAsync(
        string roleName,
        DashboardPeriodInfo periodInfo,
        CancellationToken cancellationToken)
    {
        var rangeStart = periodInfo.PeriodStart;
        var rangeEnd = periodInfo.PeriodEnd;

        var invoiceQuery = _db.Invoices.AsNoTracking()
            .Include(x => x.Booking).ThenInclude(b => b!.BookingDetails)
            .Where(x => 
                (x.Booking != null && x.Booking.BookingDetails.Any() && x.Booking.BookingDetails.Max(d => d.CheckOutDate) >= rangeStart && x.Booking.BookingDetails.Max(d => d.CheckOutDate) <= rangeEnd) ||
                ((x.Booking == null || !x.Booking.BookingDetails.Any()) && x.CreatedAt >= rangeStart && x.CreatedAt <= rangeEnd)
            );
        var bookingQuery = _db.Bookings.AsNoTracking();
        var userQuery = _db.Users.AsNoTracking();
        var lossQuery = _db.LossAndDamages.AsNoTracking();
        var reviewQuery = _db.Reviews.AsNoTracking();
        var voucherQuery = _db.Vouchers.AsNoTracking();
        var roomTypeQuery = _db.RoomTypes.AsNoTracking();
        var roomQuery = _db.Rooms
            .AsNoTracking()
            .Include(x => x.RoomType);
        var equipmentQuery = _db.Equipments.AsNoTracking().Where(x => x.IsActive);

        var totalRevenue = await invoiceQuery
            .Where(x => x.Status == "Paid")
            .SumAsync(x => (decimal?)x.FinalTotal ?? 0m, cancellationToken);

        var invoicesInPeriod = await invoiceQuery.ToListAsync(cancellationToken);
        var bookings = await bookingQuery
            .Include(x => x.BookingDetails)
                .ThenInclude(x => x.Room)
            .Include(x => x.BookingDetails)
                .ThenInclude(x => x.RoomType)
            .ToListAsync(cancellationToken);
        var usersCount = await userQuery.CountAsync(cancellationToken);
        var newUsersInPeriod = await userQuery.CountAsync(
            x => x.CreatedAt >= rangeStart && x.CreatedAt <= rangeEnd,
            cancellationToken);
        var pendingLosses = await lossQuery
            .Where(x => x.Status == "Pending")
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
        var pendingLossCount = pendingLosses.Count;
        var confirmedLosses = await lossQuery
            .Where(x => x.Status == "Confirmed")
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
        var confirmedLossValue = await lossQuery
            .Where(x => x.Status == "Confirmed")
            .SumAsync(x => (decimal?)x.PenaltyAmount ?? 0m, cancellationToken);
        var approvedReviews = await reviewQuery
            .Where(x => x.IsApproved == true)
            .ToListAsync(cancellationToken);
        var pendingReviews = await reviewQuery
            .Where(x => x.IsApproved != true)
            .ToListAsync(cancellationToken);
        var vouchers = await voucherQuery.ToListAsync(cancellationToken);
        var roomTypes = await roomTypeQuery.ToListAsync(cancellationToken);
        var rooms = await roomQuery.ToListAsync(cancellationToken);
        var equipments = await equipmentQuery.ToListAsync(cancellationToken);

        var sellableRooms = Math.Max(1, rooms.Count(x => x.BusinessStatus != "Disabled"));
        var occupiedRooms = rooms.Count(x => x.BusinessStatus == "Occupied");
        var readyRooms = rooms.Count(x => x.BusinessStatus == "Available" && x.CleaningStatus == "Clean");
        var cleaningRooms = rooms.Count(x => x.BusinessStatus == "Available" && x.CleaningStatus == "Dirty");
        var pendingLossRooms = rooms.Count(x => x.BusinessStatus == "Available" && x.CleaningStatus == "PendingLoss");
        var activeBookings = bookings.Count(x => x.Status is "Pending" or "Confirmed" or "Checked_in" or "Checked_out_pending_settlement");
        var occupancyRate = (int)Math.Round((decimal)occupiedRooms / sellableRooms * 100m);
        var pendingHandlingBookings = bookings.Count(x => x.Status is "Pending" or "Confirmed");
        var todayUtc = DateTime.UtcNow.Date;
        var todayArrivalBookings = bookings
            .Where(x => x.BookingDetails.Any(d => d.CheckInDate.Date == todayUtc))
            .OrderBy(x => x.BookingDetails.Min(d => d.CheckInDate))
            .Take(6)
            .ToList();
        var todayArrivals = todayArrivalBookings.Count;
        var stayingGuestBookings = bookings
            .Where(x => x.Status == "Checked_in")
            .OrderByDescending(x => x.CheckInTime ?? x.BookingDetails.Min(d => d.CheckInDate))
            .Take(6)
            .ToList();
        var stayingGuests = bookings.Count(x => x.Status == "Checked_in");
        var pendingCheckoutBookings = bookings
            .Where(x => x.Status == "Checked_out_pending_settlement")
            .OrderByDescending(x => x.CheckOutTime ?? x.BookingDetails.Max(d => d.CheckOutDate))
            .Take(6)
            .ToList();
        var pendingCheckout = pendingCheckoutBookings.Count;
        var actionBookings = bookings
            .Where(x => x.Status is "Pending" or "Confirmed")
            .OrderBy(x => x.BookingDetails.Min(d => d.CheckInDate))
            .Take(6)
            .ToList();
        var recentInvoices = invoicesInPeriod
            .OrderByDescending(x => x.CreatedAt)
            .Take(6)
            .ToList();
        var unpaidInvoiceItems = invoicesInPeriod
            .Where(x => x.Status is "Ready_To_Collect" or "Unpaid" or "Partially_Paid")
            .OrderByDescending(x => x.CreatedAt)
            .Take(6)
            .ToList();
        var unpaidInvoices = invoicesInPeriod.Count(x => x.Status is "Ready_To_Collect" or "Unpaid" or "Partially_Paid");
        var pendingReplenishmentRecords = confirmedLosses
            .Where(x => x.ReplenishedAt == null || x.ReplenishedQuantity < x.Quantity)
            .Take(8)
            .ToList();
        var pendingReplenishment = pendingReplenishmentRecords.Count;
        var activeEquipments = equipments.Count;
        var totalInStock = equipments.Sum(x => x.InStockQuantity);
        var totalInUse = equipments.Sum(x => x.InUseQuantity);
        var totalDamaged = equipments.Sum(x => x.DamagedQuantity + x.LiquidatedQuantity);
        var totalEquipmentUnits = equipments.Sum(x => x.TotalQuantity);
        var totalInvoiceValue = invoicesInPeriod.Sum(x => x.FinalTotal ?? 0m);
        var roomRevenue = invoicesInPeriod.Sum(x => x.TotalRoomAmount ?? 0m);
        var serviceRevenue = invoicesInPeriod.Sum(x => x.TotalServiceAmount ?? 0m);
        var damageRevenue = invoicesInPeriod.Sum(x => x.TotalDamageAmount ?? 0m);
        var pendingPaymentAmount = unpaidInvoiceItems.Sum(x => x.FinalTotal ?? 0m);
        var avgRating = approvedReviews.Count > 0
            ? approvedReviews.Average(x => (double)(x.Rating ?? 0))
            : 0d;
        var activeVouchers = vouchers.Count(x => x.IsActive);
        var activeRoomTypes = roomTypes.Count(x => x.IsActive);
        var totalLossValue = pendingLosses.Sum(x => x.PenaltyAmount * x.Quantity)
                            + confirmedLosses.Sum(x => x.PenaltyAmount * x.Quantity);

        var cleaningRoomItems = rooms
            .Where(x => x.BusinessStatus == "Available" && x.CleaningStatus == "Dirty")
            .OrderBy(x => x.RoomNumber)
            .Take(8)
            .ToList();
        var pendingLossRoomItems = rooms
            .Where(x => x.BusinessStatus == "Available" && x.CleaningStatus == "PendingLoss")
            .OrderBy(x => x.RoomNumber)
            .Take(8)
            .ToList();
        var readyRoomItems = rooms
            .Where(x => x.BusinessStatus == "Available" && x.CleaningStatus == "Clean")
            .OrderBy(x => x.RoomNumber)
            .Take(8)
            .ToList();
        var lowStockItems = equipments
            .Where(x => x.InStockQuantity <= Math.Max(5, (int)Math.Ceiling(x.TotalQuantity * 0.2m)))
            .OrderBy(x => x.InStockQuantity)
            .ThenBy(x => x.Name)
            .Take(8)
            .ToList();
        var damagedEquipmentItems = equipments
            .Where(x => x.DamagedQuantity > 0 || x.LiquidatedQuantity > 0)
            .OrderByDescending(x => x.DamagedQuantity + x.LiquidatedQuantity)
            .ThenBy(x => x.Name)
            .Take(8)
            .ToList();
        var recentBookingItems = bookings
            .OrderByDescending(x => x.CheckInTime ?? x.BookingDetails.Min(d => d.CheckInDate))
            .Take(8)
            .ToList();
        var filteredBookings = bookings
            .Where(x =>
            {
                var refDate = GetBookingReferenceDate(x);
                return refDate.HasValue && refDate.Value >= rangeStart && refDate.Value <= rangeEnd;
            })
            .ToList();
        var bookingsByStatus = filteredBookings
            .GroupBy(x => x.Status ?? "Unknown")
            .ToDictionary(x => x.Key, x => x.Count());
        var endDateForChart = periodInfo.IsCurrent ? todayUtc : rangeEnd.Date;
        var revenueByDay = Enumerable.Range(0, 7)
            .Select(offset =>
            {
                var date = endDateForChart.AddDays(-(6 - offset));
                var amount = invoicesInPeriod
                    .Where(x => x.Status == "Paid" && (
                        (x.Booking != null && x.Booking.BookingDetails.Any() && x.Booking.BookingDetails.Max(d => d.CheckOutDate).Date == date) ||
                        ((x.Booking == null || !x.Booking.BookingDetails.Any()) && x.CreatedAt.Date == date)
                    ))
                    .Sum(x => x.FinalTotal ?? 0m);
                return new
                {
                    label = date.ToString("dd/MM"),
                    value = amount
                };
            })
            .ToArray();
        var roomTypeOccupancy = roomTypes
            .Select(rt =>
            {
                var occupied = rooms.Count(r => r.RoomTypeId == rt.Id && r.BusinessStatus == "Occupied");
                var total = rooms.Count(r => r.RoomTypeId == rt.Id && r.BusinessStatus != "Disabled");
                return new
                {
                    id = rt.Id,
                    name = rt.Name,
                    occupied,
                    total,
                    rate = total > 0 ? (int)Round((decimal)occupied / total * 100m) : 0
                };
            })
            .OrderByDescending(x => x.total)
            .ThenBy(x => x.name)
            .ToArray();
        var roomStatusShared = new
        {
            counts = new
            {
                ready = readyRooms,
                occupied = occupiedRooms,
                cleaning = cleaningRooms,
                pendingLoss = pendingLossRooms,
                maintenance = rooms.Count(x => x.BusinessStatus == "Disabled")
            },
            roomsByStatus = new
            {
                Ready = rooms.Where(x => x.BusinessStatus == "Available" && x.CleaningStatus == "Clean").OrderBy(x => x.RoomNumber).Select(MapRoomCard).ToArray(),
                Occupied = rooms.Where(x => x.BusinessStatus == "Occupied").OrderBy(x => x.RoomNumber).Select(MapRoomCard).ToArray(),
                Cleaning = rooms.Where(x => x.BusinessStatus == "Available" && x.CleaningStatus == "Dirty").OrderBy(x => x.RoomNumber).Select(MapRoomCard).ToArray(),
                PendingLoss = rooms.Where(x => x.BusinessStatus == "Available" && x.CleaningStatus == "PendingLoss").OrderBy(x => x.RoomNumber).Select(MapRoomCard).ToArray(),
                Maintenance = rooms.Where(x => x.BusinessStatus == "Disabled").OrderBy(x => x.RoomNumber).Select(MapRoomCard).ToArray()
            }
        };
        var reviewSummary = new
        {
            averageRating = avgRating,
            totalReviews = approvedReviews.Count,
            pendingReviews = pendingReviews.Count,
            distribution = Enumerable.Range(1, 5)
                .Reverse()
                .Select(star => new
                {
                    rating = star,
                    count = approvedReviews.Count(x => x.Rating == star)
                })
                .ToArray()
        };
        var quickStats = new
        {
            activeVouchers,
            totalVouchers = vouchers.Count,
            availableRooms = readyRooms,
            totalRooms = rooms.Count,
            activeRoomTypes,
            totalUsers = usersCount,
            newUsersInPeriod
        };
        var inventorySummary = new
        {
            totalEquipments = activeEquipments,
            totalQuantity = totalEquipmentUnits,
            inUseQuantity = totalInUse,
            damagedQuantity = totalDamaged,
            inStockQuantity = totalInStock
        };
        var lossOverview = new
        {
            totalLossValue,
            pendingLossCount,
            confirmedLossCount = confirmedLosses.Count,
            totalRecords = pendingLosses.Count + confirmedLosses.Count
        };

        var roleCards = roleName switch
        {
            "Admin" => new object[]
            {
                Kpi("Tổng doanh thu", totalRevenue, "VND"),
                Kpi("Booking đang hoạt động", activeBookings, "COUNT"),
                Kpi("Tỷ lệ lấp đầy", occupancyRate, "%"),
                Kpi("Tài khoản hệ thống", usersCount, "COUNT")
            },
            "Manager" => new object[]
            {
                Kpi("Doanh thu kỳ", totalRevenue, "VND"),
                Kpi("Công suất phòng", occupancyRate, "%"),
                Kpi("Booking vận hành", activeBookings, "COUNT"),
                Kpi("Cảnh báo vận hành mở", pendingLossCount + cleaningRooms, "COUNT")
            },
            "Receptionist" => new object[]
            {
                Kpi("Khách đến hôm nay", todayArrivals, "COUNT"),
                Kpi("Khách đang lưu trú", stayingGuests, "COUNT"),
                Kpi("Chờ trả phòng", pendingCheckout, "COUNT"),
                Kpi("Booking chờ xử lý", pendingHandlingBookings, "COUNT")
            },
            "Accountant" => new object[]
            {
                Kpi("Tổng hóa đơn kỳ", invoicesInPeriod.Count, "COUNT"),
                Kpi("Tổng giá trị hóa đơn", invoicesInPeriod.Sum(x => x.FinalTotal ?? 0m), "VND"),
                Kpi("Hóa đơn chưa thanh toán", unpaidInvoices, "COUNT"),
                Kpi("Giá trị thất thoát đã xác nhận", confirmedLossValue, "VND")
            },
            "Housekeeping" => new object[]
            {
                Kpi("Phòng cần dọn", cleaningRooms, "COUNT"),
                Kpi("Phòng pending loss", pendingLossRooms, "COUNT"),
                Kpi("Phòng đã sẵn sàng", readyRooms, "COUNT"),
                Kpi("Biên bản thất thoát mở", pendingLossCount, "COUNT")
            },
            "WarehouseStaff" => new object[]
            {
                Kpi("Tổng vật tư active", activeEquipments, "COUNT"),
                Kpi("Tồn kho khả dụng", totalInStock, "COUNT"),
                Kpi("Vật tư đang dùng", totalInUse, "COUNT"),
                Kpi("Hư hỏng/chờ bổ sung", totalDamaged + pendingReplenishment, "COUNT")
            },
            _ => new object[]
            {
                Kpi("Tổng doanh thu", totalRevenue, "VND"),
                Kpi("Booking đang hoạt động", activeBookings, "COUNT"),
                Kpi("Tỷ lệ lấp đầy", occupancyRate, "%"),
                Kpi("Cảnh báo mở", pendingLossCount, "COUNT")
            }
        };

        var sections = new
        {
            admin = new
            {
                recentBookings = recentBookingItems.Select(MapBookingCard).ToArray(),
                roomStatus = new
                {
                    ready = readyRooms,
                    occupied = occupiedRooms,
                    cleaning = cleaningRooms,
                    pendingLoss = pendingLossRooms,
                    maintenance = rooms.Count(x => x.BusinessStatus == "Disabled")
                },
                operationalAlerts = new
                {
                    pendingLossCount,
                    pendingReplenishment,
                    lowStockCount = lowStockItems.Count
                }
            },
            manager = new
            {
                recentBookings = recentBookingItems.Select(MapBookingCard).ToArray(),
                roomStatus = new
                {
                    ready = readyRooms,
                    occupied = occupiedRooms,
                    cleaning = cleaningRooms,
                    pendingLoss = pendingLossRooms,
                    maintenance = rooms.Count(x => x.BusinessStatus == "Disabled")
                },
                operationalAlerts = new
                {
                    pendingLossCount,
                    pendingReplenishment,
                    lowStockCount = lowStockItems.Count
                }
            },
            receptionist = new
            {
                summary = new
                {
                    arrivals = todayArrivals,
                    stayingGuests,
                    pendingCheckout,
                    pendingHandlingBookings,
                    readyRooms,
                    cleaningRooms,
                    outstandingSettlementValue = unpaidInvoiceItems.Sum(x => x.FinalTotal ?? 0m)
                },
                todayArrivals = todayArrivalBookings.Select(MapBookingCard).ToArray(),
                stayingGuests = stayingGuestBookings.Select(MapBookingCard).ToArray(),
                pendingCheckoutBookings = pendingCheckoutBookings.Select(MapBookingCard).ToArray(),
                actionBookings = actionBookings.Select(MapBookingCard).ToArray()
            },
            accountant = new
            {
                summary = new
                {
                    totalInvoices = invoicesInPeriod.Count,
                    totalInvoiceValue,
                    unpaidInvoiceCount = unpaidInvoices,
                    unpaidInvoiceValue = unpaidInvoiceItems.Sum(x => x.FinalTotal ?? 0m),
                    confirmedLossValue
                },
                recentInvoices = recentInvoices.Select(MapInvoiceCard).ToArray(),
                unpaidInvoices = unpaidInvoiceItems.Select(MapInvoiceCard).ToArray(),
                confirmedDamageRecords = confirmedLosses
                    .Take(6)
                    .Select(MapLossDamageCard)
                    .ToArray(),
                revenueBreakdown = new
                {
                    roomRevenue,
                    serviceRevenue,
                    damageRevenue
                }
            },
            housekeeping = new
            {
                summary = new
                {
                    cleaningRooms,
                    pendingLossRooms,
                    readyRooms,
                    pendingLossCount,
                    activeEquipments
                },
                cleaningRooms = cleaningRoomItems.Select(MapRoomCard).ToArray(),
                pendingLossRooms = pendingLossRoomItems.Select(MapRoomCard).ToArray(),
                readyRooms = readyRoomItems.Select(MapRoomCard).ToArray(),
                pendingReplenishmentRecords = pendingReplenishmentRecords
                    .Select(MapLossDamageCard)
                    .ToArray()
            },
            warehouseStaff = new
            {
                summary = new
                {
                    activeEquipments,
                    totalInStock,
                    totalInUse,
                    totalDamaged,
                    pendingReplenishment
                },
                lowStockItems = lowStockItems.Select(MapEquipmentCard).ToArray(),
                pendingReplenishmentRecords = pendingReplenishmentRecords
                    .Select(MapLossDamageCard)
                    .ToArray(),
                damagedInventoryItems = damagedEquipmentItems.Select(MapEquipmentCard).ToArray(),
                inventorySummary = new
                {
                    totalQuantity = equipments.Sum(x => x.TotalQuantity),
                    inUseQuantity = totalInUse,
                    inStockQuantity = totalInStock
                }
            }
        };

        var shared = new
        {
            recentBookings = recentBookingItems.Select(MapBookingCard).ToArray(),
            revenueByDay,
            bookingsByStatus,
            roomTypeOccupancy,
            roomStatus = roomStatusShared,
            reviewSummary,
            quickStats,
            inventorySummary,
            lossOverview
        };

        var sectionHints = roleName switch
        {
            "Admin" => new[]
            {
                "Doanh thu theo ngày",
                "Booking gần đây",
                "Trạng thái phòng toàn khách sạn",
                "Cảnh báo thất thoát và vật tư",
                "Đánh giá khách hàng",
                "Thống kê users, vouchers, room types"
            },
            "Manager" => new[]
            {
                "Doanh thu theo kỳ",
                "Công suất theo loại phòng",
                "Booking cần xử lý",
                "Room status vận hành",
                "Cảnh báo pending loss và maintenance"
            },
            "Receptionist" => new[]
            {
                "Khách đến hôm nay",
                "Khách đang lưu trú",
                "Danh sách chờ check-out",
                "Phòng sẵn sàng nhận khách",
                "Booking mới, chờ cọc, chờ xác nhận"
            },
            "Accountant" => new[]
            {
                "Hóa đơn gần đây",
                "Hóa đơn chưa thanh toán",
                "Breakdown doanh thu phòng, dịch vụ, thất thoát",
                "Khoản thu cần follow-up",
                "Biên bản thất thoát đã xác nhận"
            },
            "Housekeeping" => new[]
            {
                "Phòng cần dọn ngay",
                "Phòng vừa check-out chờ dọn",
                "Phòng pending loss cần phối hợp",
                "Nhật ký dọn phòng gần đây"
            },
            "WarehouseStaff" => new[]
            {
                "Vật tư sắp thiếu",
                "Tồn thấp theo danh mục",
                "Loss/damage cần bổ sung",
                "Đối soát vật tư theo phòng",
                "Vật tư hư hỏng hoặc liquidated"
            },
            _ => Array.Empty<string>()
        };

        return JsonSerializer.Serialize(new
        {
            meta = new
            {
                schemaVersion = 2,
                dashboardCode = DashboardPeriodHelper.GetDashboardCode(roleName),
                roleName,
                periodType = periodInfo.PeriodType,
                periodKey = periodInfo.PeriodKey,
                status = "OPEN"
            },
            summary = new
            {
                totalRevenue,
                activeBookings,
                occupancyRate,
                pendingLossCount,
                cleaningRooms,
                pendingLossRooms,
                readyRooms,
                totalBookings = filteredBookings.Count,
                stayingGuests,
                pendingCheckout,
                pendingHandlingBookings,
                totalInvoices = invoicesInPeriod.Count,
                totalInvoiceValue,
                unpaidInvoices,
                pendingPaymentAmount,
                confirmedLossValue,
                activeEquipments,
                totalInStock,
                totalInUse,
                totalDamaged,
                totalEquipmentUnits,
                pendingReplenishment,
                usersCount,
                newUsersInPeriod,
                avgRating,
                pendingReviews = pendingReviews.Count,
                activeVouchers,
                activeRoomTypes,
                totalLossValue,
                confirmedLoss = confirmedLosses.Count
            },
            widgets = new
            {
                kpiCards = roleCards,
                sectionHints,
                sections,
                shared
            },
            breakdown = new
            {
                totalRooms = rooms.Count,
                totalInvoices = invoicesInPeriod.Count,
                totalEquipments = activeEquipments
            },
            alerts = new[]
            {
                new
                {
                    level = "info",
                    message = $"{roleName} dashboard rebuilt for {periodInfo.PeriodKey}."
                }
            },
            events = Array.Empty<object>()
        });
    }

    private async Task<string> BuildComparisonPayloadAsync(
        int roleId,
        string dashboardCode,
        DashboardPeriodInfo periodInfo,
        string currentDashboardPayload,
        CancellationToken cancellationToken)
    {
        var currentSummary = ExtractSummaryMetrics(currentDashboardPayload);
        var previousSummary = await GetPreviousSummaryMetricsAsync(
            roleId,
            dashboardCode,
            periodInfo,
            cancellationToken);

        var metrics = new Dictionary<string, object>();

        AddComparisonMetric(metrics, "totalBookings", currentSummary, previousSummary, "higher_is_better");
        AddComparisonMetric(metrics, "totalRevenue", currentSummary, previousSummary, "higher_is_better");
        AddComparisonMetric(metrics, "occupancyRate", currentSummary, previousSummary, "higher_is_better");
        AddComparisonMetric(metrics, "damageReports", currentSummary, previousSummary, "lower_is_better");
        AddComparisonMetric(metrics, "penaltyAmount", currentSummary, previousSummary, "lower_is_better");
        AddComparisonMetric(metrics, "newCustomers", currentSummary, previousSummary, "higher_is_better");
        AddComparisonMetric(metrics, "dirtyRooms", currentSummary, previousSummary, "lower_is_better");
        AddComparisonMetric(metrics, "pendingPaymentAmount", currentSummary, previousSummary, "lower_is_better");

        var previousPeriodInfo = DashboardPeriodHelper.Resolve(
            periodInfo.PeriodType,
            periodInfo.PreviousPeriodStart,
            periodInfo.PreviousPeriodStart);

        return JsonSerializer.Serialize(new
        {
            baseInfo = new
            {
                comparisonType = "PREVIOUS_PERIOD",
                previousPeriodKey = previousPeriodInfo.PeriodKey,
                previousPeriodStart = periodInfo.PreviousPeriodStart,
                previousPeriodEnd = periodInfo.PreviousPeriodEnd
            },
            metrics
        });
    }

    private async Task<Dictionary<string, decimal>> GetPreviousSummaryMetricsAsync(
        int roleId,
        string dashboardCode,
        DashboardPeriodInfo periodInfo,
        CancellationToken cancellationToken)
    {
        var previousSnapshot = await _db.RoleDashboardPeriodStates
            .AsNoTracking()
            .Where(x => x.RoleId == roleId
                        && x.DashboardCode == dashboardCode
                        && x.PeriodType == periodInfo.PeriodType
                        && x.PeriodStart <= periodInfo.PreviousPeriodStart)
            .OrderByDescending(x => x.PeriodStart)
            .FirstOrDefaultAsync(cancellationToken);

        if (previousSnapshot is not null)
        {
            var snapshotMetrics = ExtractSummaryMetrics(previousSnapshot.DashboardJson);
            if (snapshotMetrics.Count > 0)
            {
                return snapshotMetrics;
            }
        }

        return await BuildFallbackPreviousSummaryMetricsAsync(periodInfo, cancellationToken);
    }

    private async Task<Dictionary<string, decimal>> BuildFallbackPreviousSummaryMetricsAsync(
        DashboardPeriodInfo periodInfo,
        CancellationToken cancellationToken)
    {
        var rangeStart = periodInfo.PreviousPeriodStart;
        var rangeEnd = periodInfo.PreviousPeriodEnd;

        var invoicesInRange = await _db.Invoices
            .AsNoTracking()
            .Where(x => x.CreatedAt >= rangeStart && x.CreatedAt <= rangeEnd)
            .ToListAsync(cancellationToken);

        var bookingsInRange = await _db.Bookings
            .AsNoTracking()
            .Include(x => x.BookingDetails)
            .Where(x => x.BookingDetails.Any())
            .ToListAsync(cancellationToken);

        var filteredBookings = bookingsInRange
            .Where(x =>
            {
                var refDate = GetBookingReferenceDate(x);
                return refDate.HasValue && refDate.Value >= rangeStart && refDate.Value <= rangeEnd;
            })
            .ToList();

        var damageRecords = await _db.LossAndDamages
            .AsNoTracking()
            .Where(x => x.CreatedAt >= rangeStart && x.CreatedAt <= rangeEnd)
            .ToListAsync(cancellationToken);

        var newCustomers = await _db.Users
            .AsNoTracking()
            .CountAsync(x => x.CreatedAt >= rangeStart && x.CreatedAt <= rangeEnd, cancellationToken);

        var pendingPaymentAmount = invoicesInRange
            .Where(x => x.Status is "Ready_To_Collect" or "Unpaid" or "Partially_Paid")
            .Sum(x => x.FinalTotal ?? 0m);

        var paidRevenue = invoicesInRange
            .Where(x => x.Status == "Paid")
            .Sum(x => x.FinalTotal ?? 0m);

        var confirmedPenaltyAmount = damageRecords
            .Where(x => x.Status == "Confirmed")
            .Sum(x => x.PenaltyAmount);

        return new Dictionary<string, decimal>
        {
            ["totalBookings"] = filteredBookings.Count,
            ["totalRevenue"] = paidRevenue,
            ["damageReports"] = damageRecords.Count,
            ["penaltyAmount"] = confirmedPenaltyAmount,
            ["newCustomers"] = newCustomers,
            ["pendingPaymentAmount"] = pendingPaymentAmount
        };
    }

    private static Dictionary<string, decimal> ExtractSummaryMetrics(string? dashboardJson)
    {
        var metrics = new Dictionary<string, decimal>();
        if (string.IsNullOrWhiteSpace(dashboardJson))
        {
            return metrics;
        }

        try
        {
            using var document = JsonDocument.Parse(dashboardJson);
            if (!document.RootElement.TryGetProperty("summary", out var summary))
            {
                return metrics;
            }

            CopySummaryMetric(summary, metrics, "totalBookings");
            CopySummaryMetric(summary, metrics, "totalRevenue");
            CopySummaryMetric(summary, metrics, "occupancyRate");
            CopySummaryMetric(summary, metrics, "pendingLossCount", "damageReports");
            CopySummaryMetric(summary, metrics, "confirmedLossValue", "penaltyAmount");
            CopySummaryMetric(summary, metrics, "newUsersInPeriod", "newCustomers");
            CopySummaryMetric(summary, metrics, "cleaningRooms", "dirtyRooms");
            CopySummaryMetric(summary, metrics, "pendingHandlingBookings");
            CopySummaryMetric(summary, metrics, "totalInvoiceValue");
            CopySummaryMetric(summary, metrics, "unpaidInvoices");
            CopySummaryMetric(summary, metrics, "pendingReplenishment");

            if (summary.TryGetProperty("pendingPaymentAmount", out var pendingPaymentElement) &&
                TryConvertJsonNumber(pendingPaymentElement, out var pendingPaymentAmount))
            {
                metrics["pendingPaymentAmount"] = pendingPaymentAmount;
            }
        }
        catch
        {
            return new Dictionary<string, decimal>();
        }

        return metrics;
    }

    private static void CopySummaryMetric(
        JsonElement summary,
        IDictionary<string, decimal> metrics,
        string sourceKey,
        string? targetKey = null)
    {
        if (!summary.TryGetProperty(sourceKey, out var element)) return;
        if (!TryConvertJsonNumber(element, out var value)) return;
        metrics[targetKey ?? sourceKey] = value;
    }

    private static bool TryConvertJsonNumber(JsonElement element, out decimal value)
    {
        value = 0m;
        return element.ValueKind switch
        {
            JsonValueKind.Number => element.TryGetDecimal(out value),
            JsonValueKind.String => decimal.TryParse(element.GetString(), out value),
            _ => false
        };
    }

    private static void AddComparisonMetric(
        IDictionary<string, object> metrics,
        string key,
        IReadOnlyDictionary<string, decimal> currentSummary,
        IReadOnlyDictionary<string, decimal> previousSummary,
        string directionMeaning)
    {
        if (!currentSummary.TryGetValue(key, out var currentValue)) return;
        if (!previousSummary.TryGetValue(key, out var previousValue)) return;

        var growthRate = DashboardPeriodHelper.CalculateGrowthRate(currentValue, previousValue);
        var trend = DashboardPeriodHelper.ResolveTrend(currentValue, previousValue);

        metrics[key] = new
        {
            currentValue,
            previousValue,
            growthRate,
            trend,
            directionMeaning
        };
    }

    private static object Kpi(string title, object value, string unit)
    {
        return new
        {
            title,
            value,
            unit
        };
    }

    private static object MapBookingCard(Booking booking)
    {
        var detail = booking.BookingDetails
            .OrderBy(x => x.CheckInDate)
            .FirstOrDefault();

        return new
        {
            booking.Id,
            booking.BookingCode,
            booking.GuestName,
            booking.GuestPhone,
            booking.GuestEmail,
            booking.Status,
            booking.TotalEstimatedAmount,
            booking.CheckInTime,
            booking.CheckOutTime,
            roomNumber = detail?.Room?.RoomNumber,
            roomTypeName = detail?.RoomType?.Name,
            checkInDate = detail?.CheckInDate,
            checkOutDate = detail?.CheckOutDate
        };
    }

    private static object MapInvoiceCard(Invoice invoice)
    {
        return new
        {
            invoice.Id,
            invoice.BookingId,
            invoice.Status,
            invoice.FinalTotal,
            invoice.TotalRoomAmount,
            invoice.TotalServiceAmount,
            invoice.TotalDamageAmount,
            invoice.CreatedAt
        };
    }

    private static object MapRoomCard(Room room)
    {
        return new
        {
            room.Id,
            room.RoomNumber,
            room.RoomTypeId,
            roomTypeName = room.RoomType?.Name,
            room.Floor,
            room.BusinessStatus,
            room.CleaningStatus
        };
    }

    private static object MapEquipmentCard(Equipment equipment)
    {
        return new
        {
            equipment.Id,
            equipment.ItemCode,
            equipment.Name,
            equipment.Category,
            equipment.Unit,
            equipment.TotalQuantity,
            equipment.InStockQuantity,
            equipment.InUseQuantity,
            equipment.DamagedQuantity,
            equipment.LiquidatedQuantity
        };
    }

    private static object MapLossDamageCard(LossAndDamage item)
    {
        return new
        {
            item.Id,
            item.Quantity,
            item.ReplenishedQuantity,
            item.PenaltyAmount,
            item.Status,
            item.Description,
            item.CreatedAt,
            item.ReplenishedAt
        };
    }

    private static DateTime? GetBookingReferenceDate(Booking booking)
    {
        if (booking.CheckInTime.HasValue) return booking.CheckInTime.Value;
        return booking.BookingDetails
            .OrderBy(x => x.CheckInDate)
            .Select(x => (DateTime?)x.CheckInDate)
            .FirstOrDefault();
    }

    private static DashboardPeriodResponseDto MapToDto(RoleDashboardPeriodState entity)
    {
        return new DashboardPeriodResponseDto
        {
            Id = entity.Id,
            RoleId = entity.RoleId,
            RoleName = entity.RoleName,
            DashboardCode = entity.DashboardCode,
            DashboardTitle = entity.DashboardTitle,
            PeriodType = entity.PeriodType,
            PeriodKey = entity.PeriodKey,
            PeriodStart = entity.PeriodStart,
            PeriodEnd = entity.PeriodEnd,
            Status = entity.Status,
            IsCurrent = entity.IsCurrent,
            Version = entity.Version,
            UpdatedAt = entity.UpdatedAt,
            Dashboard = ParseJsonElement(entity.DashboardJson),
            Comparison = ParseJsonElement(entity.ComparisonJson)
        };
    }

    private static JsonElement? ParseJsonElement(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        using var document = JsonDocument.Parse(raw);
        return document.RootElement.Clone();
    }

    private static string NormalizeRoleName(string? roleName)
    {
        if (string.IsNullOrWhiteSpace(roleName)) return "Guest";
        return roleName.Trim();
    }

    private static DateTime EnsureUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }
}
