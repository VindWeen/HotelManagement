namespace HotelManagement.Core.Entities;

public class VoucherTargetUser
{
    public int VoucherId { get; set; }
    public int UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Voucher Voucher { get; set; } = null!;
    public User User { get; set; } = null!;
}
