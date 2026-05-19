namespace HotelManagement.Core.Entities;

public class SystemSetting
{
    public int Id { get; set; }
    public decimal BookingDepositPercent { get; set; }
    public decimal CheckInRequiredPercent { get; set; }
    public string? HotelAddress { get; set; }
    public decimal? HotelLatitude { get; set; }
    public decimal? HotelLongitude { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int? UpdatedBy { get; set; }

    public User? UpdatedByUser { get; set; }
}
