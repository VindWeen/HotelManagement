using HotelManagement.Core.Entities;
using HotelManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HotelManagement.API.Services;

public interface ISystemSettingsService
{
    Task<SystemSetting> GetCurrentAsync(CancellationToken cancellationToken = default);
    Task<SystemSetting> UpdateDepositSettingsAsync(
        decimal bookingDepositPercent,
        decimal checkInRequiredPercent,
        int? updatedBy,
        CancellationToken cancellationToken = default);
    Task<SystemSetting> UpdateHotelLocationAsync(
        string? hotelAddress,
        decimal? hotelLatitude,
        decimal? hotelLongitude,
        int? updatedBy,
        CancellationToken cancellationToken = default);
}

public class SystemSettingsService : ISystemSettingsService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;

    public SystemSettingsService(AppDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    public async Task<SystemSetting> GetCurrentAsync(CancellationToken cancellationToken = default)
    {
        var setting = await _db.SystemSettings
            .FirstOrDefaultAsync(cancellationToken);

        if (setting != null)
        {
            return setting;
        }

        setting = new SystemSetting
        {
            BookingDepositPercent = 30m,
            CheckInRequiredPercent = 50m,
            HotelAddress = string.Empty,
            HotelLatitude = ParseDecimal(_configuration["HotelLocation:Latitude"]),
            HotelLongitude = ParseDecimal(_configuration["HotelLocation:Longitude"]),
            CreatedAt = DateTime.UtcNow
        };

        _db.SystemSettings.Add(setting);
        await _db.SaveChangesAsync(cancellationToken);
        return setting;
    }

    public async Task<SystemSetting> UpdateDepositSettingsAsync(
        decimal bookingDepositPercent,
        decimal checkInRequiredPercent,
        int? updatedBy,
        CancellationToken cancellationToken = default)
    {
        var setting = await GetCurrentAsync(cancellationToken);
        setting.BookingDepositPercent = bookingDepositPercent;
        setting.CheckInRequiredPercent = checkInRequiredPercent;
        setting.UpdatedAt = DateTime.UtcNow;
        setting.UpdatedBy = updatedBy;
        await _db.SaveChangesAsync(cancellationToken);
        return setting;
    }

    public async Task<SystemSetting> UpdateHotelLocationAsync(
        string? hotelAddress,
        decimal? hotelLatitude,
        decimal? hotelLongitude,
        int? updatedBy,
        CancellationToken cancellationToken = default)
    {
        var setting = await GetCurrentAsync(cancellationToken);
        setting.HotelAddress = hotelAddress?.Trim();
        setting.HotelLatitude = hotelLatitude;
        setting.HotelLongitude = hotelLongitude;
        setting.UpdatedAt = DateTime.UtcNow;
        setting.UpdatedBy = updatedBy;
        await _db.SaveChangesAsync(cancellationToken);
        return setting;
    }

    private static decimal? ParseDecimal(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return decimal.TryParse(value, out var parsed) ? parsed : null;
    }
}
