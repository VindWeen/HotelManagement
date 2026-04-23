using HotelManagement.Core.Entities;
using HotelManagement.Core.Constants;
using HotelManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HotelManagement.API.Services;

public interface IVoucherValidationService
{
    bool ValidateDefinition(
        string discountType,
        decimal discountValue,
        DateTime? validFrom,
        DateTime? validTo,
        int? usageLimit,
        int maxUsesPerUser,
        out string errorMessage);

    bool ValidateUsage(Voucher voucher, decimal bookingAmount, DateTime nowUtc, out string errorMessage);
    decimal CalculateDiscount(Voucher voucher, decimal bookingAmount);
}

public interface IVoucherAudienceService
{
    Task<bool> CanUseAsync(Voucher voucher, int userId, CancellationToken cancellationToken = default);
    Task<string?> GetUnavailableReasonAsync(Voucher voucher, int userId, CancellationToken cancellationToken = default);
}

public class VoucherValidationService : IVoucherValidationService
{
    public bool ValidateDefinition(
        string discountType,
        decimal discountValue,
        DateTime? validFrom,
        DateTime? validTo,
        int? usageLimit,
        int maxUsesPerUser,
        out string errorMessage)
    {
        if (discountType != VoucherDiscountTypes.Percent && discountType != VoucherDiscountTypes.FixedAmount)
        {
            errorMessage = "Loại giảm giá phải là PERCENT hoặc FIXED_AMOUNT.";
            return false;
        }

        if (discountValue <= 0)
        {
            errorMessage = "Giá trị giảm phải lớn hơn 0.";
            return false;
        }

        if (discountType == VoucherDiscountTypes.Percent && discountValue > 100)
        {
            errorMessage = "Phần trăm giảm giá không được vượt quá 100%.";
            return false;
        }

        if (validFrom.HasValue && validTo.HasValue && validFrom >= validTo)
        {
            errorMessage = "ValidFrom phải trước ValidTo.";
            return false;
        }

        if (usageLimit.HasValue && usageLimit.Value <= 0)
        {
            errorMessage = "Giới hạn sử dụng phải lớn hơn 0.";
            return false;
        }

        if (maxUsesPerUser <= 0)
        {
            errorMessage = "Số lượt dùng tối đa mỗi user phải lớn hơn 0.";
            return false;
        }

        errorMessage = string.Empty;
        return true;
    }

    public bool ValidateUsage(Voucher voucher, decimal bookingAmount, DateTime nowUtc, out string errorMessage)
    {
        if (!voucher.IsActive)
        {
            errorMessage = "Voucher đã bị vô hiệu hóa.";
            return false;
        }

        if (voucher.ValidFrom.HasValue && nowUtc < voucher.ValidFrom.Value)
        {
            errorMessage = "Voucher chưa đến ngày sử dụng.";
            return false;
        }

        if (voucher.ValidTo.HasValue && nowUtc > voucher.ValidTo.Value)
        {
            errorMessage = "Voucher đã hết hạn.";
            return false;
        }

        if (voucher.UsageLimit.HasValue && voucher.UsedCount >= voucher.UsageLimit.Value)
        {
            errorMessage = "Voucher đã hết lượt sử dụng.";
            return false;
        }

        if (voucher.MinBookingValue.HasValue && bookingAmount < voucher.MinBookingValue.Value)
        {
            errorMessage = $"Đơn hàng tối thiểu {voucher.MinBookingValue.Value:N0}đ để dùng voucher này.";
            return false;
        }

        errorMessage = string.Empty;
        return true;
    }

    public decimal CalculateDiscount(Voucher voucher, decimal bookingAmount)
    {
        decimal discount;
        if (voucher.DiscountType == VoucherDiscountTypes.Percent)
        {
            discount = bookingAmount * voucher.DiscountValue / 100;
            if (voucher.MaxDiscountAmount.HasValue)
                discount = Math.Min(discount, voucher.MaxDiscountAmount.Value);
        }
        else
        {
            discount = voucher.DiscountValue;
        }

        return Math.Min(discount, bookingAmount);
    }
}

public class VoucherAudienceService : IVoucherAudienceService
{
    private readonly AppDbContext _db;

    public VoucherAudienceService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<bool> CanUseAsync(Voucher voucher, int userId, CancellationToken cancellationToken = default)
        => await GetUnavailableReasonAsync(voucher, userId, cancellationToken) == null;

    public async Task<string?> GetUnavailableReasonAsync(Voucher voucher, int userId, CancellationToken cancellationToken = default)
    {
        var audienceType = string.IsNullOrWhiteSpace(voucher.AudienceType)
            ? VoucherAudienceTypes.Public
            : voucher.AudienceType.Trim().ToUpperInvariant();

        if (audienceType == VoucherAudienceTypes.Public || audienceType == VoucherAudienceTypes.Holiday)
            return null;

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
            return "Không tìm thấy tài khoản khách hàng.";

        if (audienceType == VoucherAudienceTypes.User)
        {
            var isTargeted = await _db.VoucherTargetUsers
                .AsNoTracking()
                .AnyAsync(x => x.VoucherId == voucher.Id && x.UserId == userId, cancellationToken);

            return isTargeted ? null : "Voucher này không áp dụng cho tài khoản của bạn.";
        }

        if (audienceType == VoucherAudienceTypes.BirthdayMonth)
        {
            if (!user.DateOfBirth.HasValue)
                return "Voucher sinh nhật yêu cầu tài khoản có ngày sinh.";

            return user.DateOfBirth.Value.Month == DateTime.Now.Month
                ? null
                : "Voucher sinh nhật chỉ áp dụng trong tháng sinh của bạn.";
        }

        if (audienceType == VoucherAudienceTypes.Membership)
        {
            if (!voucher.TargetMembershipId.HasValue)
                return "Voucher hạng thành viên chưa cấu hình hạng áp dụng.";

            return user.MembershipId == voucher.TargetMembershipId.Value
                ? null
                : "Voucher này không áp dụng cho hạng thành viên của bạn.";
        }

        return "Phân loại voucher không hợp lệ.";
    }
}

