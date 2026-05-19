using HotelManagement.API.Services;
using HotelManagement.Core.Authorization;
using HotelManagement.Core.Constants;
using HotelManagement.Core.Entities;
using HotelManagement.Core.Helpers;
using HotelManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SystemSettingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ISystemSettingsService _settingsService;
    private readonly IAuditTrailService _auditTrail;

    public SystemSettingsController(
        AppDbContext db,
        ISystemSettingsService settingsService,
        IAuditTrailService auditTrail)
    {
        _db = db;
        _settingsService = settingsService;
        _auditTrail = auditTrail;
    }

    [HttpGet]
    [RequirePermission(PermissionCodes.ManageSystemSettings)]
    public async Task<IActionResult> GetCurrent(CancellationToken cancellationToken)
    {
        var setting = await _settingsService.GetCurrentAsync(cancellationToken);
        return Ok(MapSetting(setting));
    }

    [HttpPut("deposit")]
    [RequirePermission(PermissionCodes.ManageSystemSettings)]
    public async Task<IActionResult> UpdateDepositSettings([FromBody] UpdateDepositSettingsRequest request, CancellationToken cancellationToken)
    {
        if (request.BookingDepositPercent <= 0 || request.BookingDepositPercent > 100)
            return BadRequest(new { message = "Phần trăm cọc xác nhận booking phải lớn hơn 0 và nhỏ hơn hoặc bằng 100." });

        if (request.CheckInRequiredPercent <= 0 || request.CheckInRequiredPercent > 100)
            return BadRequest(new { message = "Phần trăm cần đạt để check-in phải lớn hơn 0 và nhỏ hơn hoặc bằng 100." });

        if (request.CheckInRequiredPercent < request.BookingDepositPercent)
            return BadRequest(new { message = "Phần trăm check-in phải lớn hơn hoặc bằng phần trăm cọc xác nhận booking." });

        var currentUserId = JwtHelper.GetUserId(User);
        var setting = await _settingsService.UpdateDepositSettingsAsync(
            request.BookingDepositPercent,
            request.CheckInRequiredPercent,
            currentUserId > 0 ? currentUserId : null,
            cancellationToken);

        var affectedBookings = await RecalculateOpenBookingsAsync(setting, cancellationToken);

        await _auditTrail.WriteAsync(_db, User, Request, new AuditTrailEntry
        {
            ActionCode = "UPDATE_SYSTEM_DEPOSIT_SETTINGS",
            ActionLabel = "Cập nhật cấu hình tiền cọc",
            Message = $"Đã cập nhật mức cọc booking {setting.BookingDepositPercent}% và mức yêu cầu check-in {setting.CheckInRequiredPercent}%.",
            EntityType = "SystemSetting",
            EntityId = setting.Id,
            EntityLabel = "DepositSettings",
            Severity = "Info",
            TableName = "System_Settings",
            RecordId = setting.Id,
            NewValue = $"{{\"bookingDepositPercent\":{setting.BookingDepositPercent},\"checkInRequiredPercent\":{setting.CheckInRequiredPercent},\"affectedBookings\":{affectedBookings}}}"
        }, cancellationToken);

        return Ok(new
        {
            message = $"Đã cập nhật cấu hình tiền cọc. {affectedBookings} booking đang mở đã được tính lại.",
            data = MapSetting(setting),
            affectedBookings
        });
    }

    [HttpPut("location")]
    [RequirePermission(PermissionCodes.ManageSystemSettings)]
    public async Task<IActionResult> UpdateLocationSettings([FromBody] UpdateLocationSettingsRequest request, CancellationToken cancellationToken)
    {
        if (request.HotelLatitude is < -90 or > 90)
            return BadRequest(new { message = "Latitude phải nằm trong khoảng -90 đến 90." });

        if (request.HotelLongitude is < -180 or > 180)
            return BadRequest(new { message = "Longitude phải nằm trong khoảng -180 đến 180." });

        var currentUserId = JwtHelper.GetUserId(User);
        var setting = await _settingsService.UpdateHotelLocationAsync(
            request.HotelAddress,
            request.HotelLatitude,
            request.HotelLongitude,
            currentUserId > 0 ? currentUserId : null,
            cancellationToken);

        var affectedAttractions = await RecalculateAttractionDistancesAsync(setting, cancellationToken);

        await _auditTrail.WriteAsync(_db, User, Request, new AuditTrailEntry
        {
            ActionCode = "UPDATE_SYSTEM_LOCATION_SETTINGS",
            ActionLabel = "Cập nhật vị trí khách sạn",
            Message = "Đã cập nhật vị trí khách sạn và tính lại khoảng cách các địa điểm.",
            EntityType = "SystemSetting",
            EntityId = setting.Id,
            EntityLabel = "HotelLocation",
            Severity = "Info",
            TableName = "System_Settings",
            RecordId = setting.Id,
            NewValue = $"{{\"hotelAddress\":\"{setting.HotelAddress ?? string.Empty}\",\"hotelLatitude\":{setting.HotelLatitude?.ToString() ?? "null"},\"hotelLongitude\":{setting.HotelLongitude?.ToString() ?? "null"},\"affectedAttractions\":{affectedAttractions}}}"
        }, cancellationToken);

        return Ok(new
        {
            message = $"Đã cập nhật vị trí khách sạn. {affectedAttractions} địa điểm đã được tính lại khoảng cách.",
            data = MapSetting(setting),
            affectedAttractions
        });
    }

    private async Task<int> RecalculateOpenBookingsAsync(SystemSetting setting, CancellationToken cancellationToken)
    {
        var bookings = await _db.Bookings
            .Where(b =>
                b.Status != BookingStatuses.Completed &&
                b.Status != BookingStatuses.Cancelled &&
                b.Status != BookingStatuses.NoShow)
            .ToListAsync(cancellationToken);

        foreach (var booking in bookings)
        {
            var estimatedTotal = Math.Max(0m, booking.TotalEstimatedAmount);
            booking.RequiredBookingDepositAmount = decimal.Round(
                estimatedTotal * (setting.BookingDepositPercent / 100m),
                2,
                MidpointRounding.AwayFromZero);
            booking.RequiredCheckInAmount = decimal.Round(
                estimatedTotal * (setting.CheckInRequiredPercent / 100m),
                2,
                MidpointRounding.AwayFromZero);

            var paidBeforeCheckout = Math.Max(0m, booking.DepositAmount ?? 0m);
            if (string.Equals(booking.Status, BookingStatuses.Pending, StringComparison.OrdinalIgnoreCase)
                && paidBeforeCheckout >= booking.RequiredBookingDepositAmount)
            {
                booking.Status = BookingStatuses.Confirmed;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        return bookings.Count;
    }

    private async Task<int> RecalculateAttractionDistancesAsync(SystemSetting setting, CancellationToken cancellationToken)
    {
        var attractions = await _db.Attractions.ToListAsync(cancellationToken);
        foreach (var attraction in attractions)
        {
            attraction.DistanceKm = CalculateDistanceKm(
                setting.HotelLatitude,
                setting.HotelLongitude,
                attraction.Latitude,
                attraction.Longitude);
        }

        await _db.SaveChangesAsync(cancellationToken);
        return attractions.Count;
    }

    internal static decimal? CalculateDistanceKm(
        decimal? hotelLatitude,
        decimal? hotelLongitude,
        decimal? targetLatitude,
        decimal? targetLongitude)
    {
        if (!hotelLatitude.HasValue
            || !hotelLongitude.HasValue
            || !targetLatitude.HasValue
            || !targetLongitude.HasValue)
        {
            return null;
        }

        var hotelLat = (double)hotelLatitude.Value;
        var hotelLon = (double)hotelLongitude.Value;
        var targetLat = (double)targetLatitude.Value;
        var targetLon = (double)targetLongitude.Value;

        const double earthRadiusKm = 6371d;
        var latitudeDelta = DegreesToRadians(targetLat - hotelLat);
        var longitudeDelta = DegreesToRadians(targetLon - hotelLon);
        var startLatitude = DegreesToRadians(hotelLat);
        var endLatitude = DegreesToRadians(targetLat);
        var haversine = Math.Pow(Math.Sin(latitudeDelta / 2d), 2d)
            + Math.Cos(startLatitude) * Math.Cos(endLatitude) * Math.Pow(Math.Sin(longitudeDelta / 2d), 2d);
        var arc = 2d * Math.Atan2(Math.Sqrt(haversine), Math.Sqrt(1d - haversine));
        var distance = earthRadiusKm * arc;
        return Math.Round((decimal)distance, 2, MidpointRounding.AwayFromZero);
    }

    private static double DegreesToRadians(double degrees) => degrees * (Math.PI / 180d);

    private static object MapSetting(SystemSetting setting) => new
    {
        setting.Id,
        setting.BookingDepositPercent,
        setting.CheckInRequiredPercent,
        setting.HotelAddress,
        setting.HotelLatitude,
        setting.HotelLongitude,
        setting.CreatedAt,
        setting.UpdatedAt,
        setting.UpdatedBy
    };
}

public record UpdateDepositSettingsRequest(decimal BookingDepositPercent, decimal CheckInRequiredPercent);

public record UpdateLocationSettingsRequest(string? HotelAddress, decimal? HotelLatitude, decimal? HotelLongitude);
