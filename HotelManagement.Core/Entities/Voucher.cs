namespace HotelManagement.Core.Entities;

public class Voucher
{
    public int Id { get; set; }
    public string Code { get; set; } = null!;
    public string DiscountType { get; set; } = null!; // PERCENT / FIXED_AMOUNT
    public decimal DiscountValue { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    public decimal? MinBookingValue { get; set; }
    public int? ApplicableRoomTypeId { get; set; }
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
    public int? UsageLimit { get; set; }
    public int UsedCount { get; set; } = 0;
    public int MaxUsesPerUser { get; set; } = 1;
    public string AudienceType { get; set; } = "PUBLIC";
    public int? TargetMembershipId { get; set; }
    public string? OccasionName { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    // Navigation
    public RoomType? ApplicableRoomType { get; set; }
    public Membership? TargetMembership { get; set; }
    public ICollection<Booking> Bookings { get; set; } = [];
    public ICollection<VoucherUsage> VoucherUsages { get; set; } = [];
    public ICollection<VoucherTargetUser> TargetUsers { get; set; } = [];
}
