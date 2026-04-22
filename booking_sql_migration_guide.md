# Hướng Dẫn Cập Nhật SQL Schema — Guest Online Booking

## Phân Tích Schema Hiện Tại

Schema hiện tại ở `HotelManagement.sql` **đã đáp ứng được** hầu hết yêu cầu:

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Booking pending mặc định | ✅ Có | `DEFAULT ('Pending') FOR [status]` |
| Chọn loại phòng (không chọn phòng cụ thể) | ✅ Có | `room_id` là `NULL`, `room_type_id` là bắt buộc |
| Đặt cọc 30% | ✅ Có | `required_booking_deposit_amount` đã có |
| Check overbooking theo khoảng ngày | ✅ Có | Logic trong `BookingController.CountBookedRoomsAsync()` |
| Hủy phòng (có lý do) | ✅ Có | `cancellation_reason`, `cancelled_at` đã có |
| Trạng thái lifecycle đầy đủ | ✅ Có | `status` trong Bookings |
| Admin gán phòng sau | ✅ Có | `room_id` nullable, gán khi check-in |
| Nguồn booking | ✅ Có | `source = 'online' / 'walk_in' / 'phone'` |

## Các Tính Năng Chưa Có Trong SQL — Nên Thêm

### 1. Booking Expiry (Tự động hết hạn)

> Schema hiện tại **không có** cột `expires_at` cho Bookings. Booking pending không có thời hạn rõ ràng.

#### Thêm cột `expires_at` vào bảng `Bookings`:

```sql
-- Chạy trên HotelManagementDB
ALTER TABLE [dbo].[Bookings]
    ADD [expires_at] [datetime] NULL;
GO

-- Comment: NULL = không hết hạn (walk_in/phone), có giá trị = sẽ expire tự động (online)
-- Logic: khi tạo booking online, backend set expires_at = GETUTCDATE() + 24 giờ
```

#### Tạo Scheduled Job hoặc Background Service để xử lý expiry:

Thêm vào **BookingController.cs** (chỉ thêm, không sửa code cũ) một endpoint mới:

```csharp
// Endpoint này gọi bởi background job (Hangfire / Windows Task Scheduler)
// POST /api/Bookings/expire-pending
[RequirePermission(PermissionCodes.ManageBookings)]
[HttpPost("expire-pending")]
public async Task<IActionResult> ExpirePendingBookings(CancellationToken ct)
{
    var now = DateTime.UtcNow;
    var expired = await _context.Bookings
        .Where(b => b.Status == "Pending" 
                 && b.ExpiresAt != null 
                 && b.ExpiresAt <= now)
        .ToListAsync(ct);
    
    foreach (var b in expired)
    {
        b.Status = "Cancelled";
        b.CancellationReason = "Hết thời gian chờ thanh toán cọc.";
        b.CancelledAt = now;
    }
    
    await _context.SaveChangesAsync(ct);
    return Ok(new { success = true, expired = expired.Count });
}
```

---

### 2. Cancel Policy — Hoàn / Không Hoàn Cọc

> Schema hiện tại **không có** trường để đánh dấu chính sách hoàn cọc khi hủy.

#### Thêm cột vào `Bookings`:

```sql
ALTER TABLE [dbo].[Bookings]
    ADD [refund_policy]       [nvarchar](20)   NULL DEFAULT 'refundable',
        [refundable_until]    [datetime]        NULL,
        [refund_amount]       [decimal](18, 2)  NULL;
GO

-- refund_policy: 'refundable' | 'non_refundable' | 'partial'
-- refundable_until: deadline hoàn cọc (ví dụ: 48h trước check-in)
-- refund_amount: NULL = tự tính, có giá trị = đã quyết định
```

#### Logic nghiệp vụ đề xuất (backend):
- Booking status = `Pending` → hủy **miễn phí** (chưa thanh toán cọc)
- Booking status = `Confirmed`, hủy trước 48h check-in → hoàn 50% cọc
- Booking status = `Confirmed`, hủy trong 48h check-in → **mất cọc**

---

### 3. Pending Limit Per User (Giới hạn spam)

> Tính năng này **đã xử lý ở frontend** (giới hạn 3 booking pending). Không cần thêm SQL.
> 
> Nếu muốn enforce ở backend, thêm check trong `Create` action:

```csharp
// Thêm vào BookingController.Create() sau phần validate request
if (request.UserId.HasValue)
{
    var pendingCount = await _context.Bookings
        .CountAsync(b => b.UserId == request.UserId && b.Status == "Pending", cancellationToken);
    if (pendingCount >= 3)
        return BookingActionError(400, "Bạn đang có quá nhiều booking chờ xử lý. Vui lòng thanh toán hoặc hủy bớt.");
}
```

---

### 4. Room Type Availability Count (Không dùng inventory riêng)

> **Đã đáp ứng** qua `CountBookedRoomsAsync()` + `CountTotalRoomsByTypeAsync()` trong controller.
> Không cần thêm bảng inventory riêng.

---

## Migration Script Hoàn Chỉnh

Chạy script sau trên `HotelManagementDB` (SQL Server):

```sql
USE [HotelManagementDB];
GO

-- ============================================================
-- MIGRATION: Guest Online Booking Enhancement
-- Version: 1.0
-- Date: 2026-04-15
-- ============================================================

-- 1. Thêm expires_at vào Bookings
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.Bookings') 
    AND name = 'expires_at'
)
BEGIN
    ALTER TABLE [dbo].[Bookings]
        ADD [expires_at] [datetime] NULL;
    PRINT 'Added expires_at to Bookings';
END
GO

-- 2. Thêm cancel policy fields vào Bookings
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.Bookings') 
    AND name = 'refund_policy'
)
BEGIN
    ALTER TABLE [dbo].[Bookings]
        ADD [refund_policy]     [nvarchar](20)   NULL DEFAULT 'refundable',
            [refundable_until]  [datetime]        NULL,
            [refund_amount]     [decimal](18, 2)  NULL;
    PRINT 'Added refund policy fields to Bookings';
END
GO

-- 3. Index để query booking pending theo thời gian expire
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_Bookings_Status_ExpiresAt'
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Bookings_Status_ExpiresAt]
        ON [dbo].[Bookings] ([status] ASC, [expires_at] ASC)
        WHERE [expires_at] IS NOT NULL;
    PRINT 'Created index IX_Bookings_Status_ExpiresAt';
END
GO

-- 4. Index để query booking pending per user
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_Bookings_UserId_Status'
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Bookings_UserId_Status]
        ON [dbo].[Bookings] ([user_id] ASC, [status] ASC);
    PRINT 'Created index IX_Bookings_UserId_Status';
END
GO

PRINT 'Migration completed successfully!';
```

---

## Cập Nhật Entity Model C# (nếu thêm cột SQL)

Nếu thêm `expires_at` và `refund_policy`, cần thêm vào entity `Booking.cs` trong `HotelManagement.Core`:

```csharp
// Trong file HotelManagement.Core/Entities/Booking.cs — CHỈ THÊM, không sửa
public DateTime? ExpiresAt { get; set; }
public string? RefundPolicy { get; set; }    // refundable | non_refundable | partial
public DateTime? RefundableUntil { get; set; }
public decimal? RefundAmount { get; set; }
```

Và cập nhật `AppDbContext` mapping nếu dùng Fluent API (thêm `HasColumnName`).

---

## Tóm Tắt — Cần Làm Ngay

| Việc | Ưu tiên | Ghi chú |
|---|---|---|
| Chạy migration SQL script | 🔴 Cao | Thêm `expires_at`, indexes |
| Thêm property vào `Booking.cs` | 🔴 Cao | Cần cho expires_at feature |
| Thêm endpoint `expire-pending` | 🟡 Trung bình | Cần background job gọi định kỳ |
| Thêm pending limit check ở backend | 🟢 Thấp | Frontend đã handle, backend là extra safety |
| Thêm refund policy fields | 🟢 Thấp | Optional, chính sách có thể quản lý thủ công |

> **Lưu ý**: Trang frontend `BookingPage.jsx` đã hoạt động đầy đủ mà **không cần** chạy migration ngay lập tức. Migration chỉ cần thiết để hỗ trợ tự động expire booking và chính sách hoàn cọc chi tiết hơn.
