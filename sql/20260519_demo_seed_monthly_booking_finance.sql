SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @SeedMarker NVARCHAR(100) = N'DEMO_SEED_20260519';
    DECLARE @BookingPrefix NVARCHAR(50) = N'DM-202605-';
    DECLARE @VoucherPrefix NVARCHAR(20) = N'DMV';
    DECLARE @GuestEmailDomain NVARCHAR(50) = N'@seed.local';
    DECLARE @Today DATE = CAST(GETDATE() AS DATE);
    DECLARE @Now DATETIME = GETDATE();
    DECLARE @CurrentMonth INT = MONTH(GETDATE());
    DECLARE @CurrentYear INT = YEAR(GETDATE());
    DECLARE @GuestRoleId INT = (SELECT TOP 1 [id] FROM [dbo].[Roles] WHERE [name] = N'Guest');
    DECLARE @HousekeepingUserId INT = (
        SELECT TOP 1 [id]
        FROM [dbo].[Users]
        WHERE [role_id] = (SELECT TOP 1 [id] FROM [dbo].[Roles] WHERE [name] = N'Housekeeping')
        ORDER BY [id]
    );
    DECLARE @PasswordHash NVARCHAR(MAX) = (
        SELECT TOP 1 [password_hash]
        FROM [dbo].[Users]
        WHERE [password_hash] IS NOT NULL
        ORDER BY [id]
    );
    DECLARE @BookingDepositPercent DECIMAL(5, 2) = 30;
    DECLARE @CheckInRequiredPercent DECIMAL(5, 2) = 50;

    IF @GuestRoleId IS NULL
        THROW 51000, N'Không tìm thấy role Guest để seed demo.', 1;

    IF @HousekeepingUserId IS NULL
        THROW 51001, N'Không tìm thấy user Housekeeping để seed loss & damage demo.', 1;

    IF @PasswordHash IS NULL
        THROW 51002, N'Không tìm thấy password hash mẫu để seed user demo.', 1;

    IF OBJECT_ID(N'dbo.System_Settings', N'U') IS NOT NULL
    BEGIN
        SELECT TOP 1
            @BookingDepositPercent = ISNULL([booking_deposit_percent], 30),
            @CheckInRequiredPercent = ISNULL([check_in_required_percent], 50)
        FROM [dbo].[System_Settings]
        ORDER BY [id] DESC;
    END

    IF OBJECT_ID(N'tempdb..#DemoUsers') IS NOT NULL DROP TABLE #DemoUsers;
    IF OBJECT_ID(N'tempdb..#DemoRooms') IS NOT NULL DROP TABLE #DemoRooms;
    IF OBJECT_ID(N'tempdb..#DemoRoomPool') IS NOT NULL DROP TABLE #DemoRoomPool;
    IF OBJECT_ID(N'tempdb..#DemoVouchers') IS NOT NULL DROP TABLE #DemoVouchers;
    IF OBJECT_ID(N'tempdb..#BookingPlans') IS NOT NULL DROP TABLE #BookingPlans;
    IF OBJECT_ID(N'tempdb..#SeedBookings') IS NOT NULL DROP TABLE #SeedBookings;
    IF OBJECT_ID(N'tempdb..#DetailPlans') IS NOT NULL DROP TABLE #DetailPlans;
    IF OBJECT_ID(N'tempdb..#SeedBookingDetails') IS NOT NULL DROP TABLE #SeedBookingDetails;
    IF OBJECT_ID(N'tempdb..#BookingFinancials') IS NOT NULL DROP TABLE #BookingFinancials;
    IF OBJECT_ID(N'tempdb..#InvoicePlans') IS NOT NULL DROP TABLE #InvoicePlans;
    IF OBJECT_ID(N'tempdb..#SeedInvoices') IS NOT NULL DROP TABLE #SeedInvoices;
    IF OBJECT_ID(N'tempdb..#LoyaltySeeds') IS NOT NULL DROP TABLE #LoyaltySeeds;

    DELETE vu
    FROM [dbo].[Voucher_Usage] vu
    INNER JOIN [dbo].[Bookings] b ON b.[id] = vu.[booking_id]
    WHERE b.[booking_code] LIKE @BookingPrefix + N'%';

    DELETE lt
    FROM [dbo].[Loyalty_Transactions] lt
    INNER JOIN [dbo].[Bookings] b ON b.[id] = lt.[booking_id]
    WHERE b.[booking_code] LIKE @BookingPrefix + N'%';

    DELETE p
    FROM [dbo].[Payments] p
    LEFT JOIN [dbo].[Bookings] b ON b.[id] = p.[booking_id]
    LEFT JOIN [dbo].[Invoices] i ON i.[id] = p.[invoice_id]
    LEFT JOIN [dbo].[Bookings] ib ON ib.[id] = i.[booking_id]
    WHERE (b.[booking_code] LIKE @BookingPrefix + N'%')
       OR (ib.[booking_code] LIKE @BookingPrefix + N'%')
       OR (p.[note] LIKE N'%' + @SeedMarker + N'%');

    DELETE ia
    FROM [dbo].[Invoice_Adjustments] ia
    INNER JOIN [dbo].[Invoices] i ON i.[id] = ia.[invoice_id]
    INNER JOIN [dbo].[Bookings] b ON b.[id] = i.[booking_id]
    WHERE b.[booking_code] LIKE @BookingPrefix + N'%'
       OR ia.[reason] LIKE N'%' + @SeedMarker + N'%';

    DELETE lad
    FROM [dbo].[Loss_And_Damages] lad
    INNER JOIN [dbo].[Booking_Details] bd ON bd.[id] = lad.[booking_detail_id]
    INNER JOIN [dbo].[Bookings] b ON b.[id] = bd.[booking_id]
    WHERE b.[booking_code] LIKE @BookingPrefix + N'%'
       OR lad.[description] LIKE N'%' + @SeedMarker + N'%';

    DELETE osd
    FROM [dbo].[Order_Service_Details] osd
    INNER JOIN [dbo].[Order_Services] os ON os.[id] = osd.[order_service_id]
    INNER JOIN [dbo].[Booking_Details] bd ON bd.[id] = os.[booking_detail_id]
    INNER JOIN [dbo].[Bookings] b ON b.[id] = bd.[booking_id]
    WHERE b.[booking_code] LIKE @BookingPrefix + N'%'
       OR os.[note] LIKE N'%' + @SeedMarker + N'%';

    DELETE os
    FROM [dbo].[Order_Services] os
    INNER JOIN [dbo].[Booking_Details] bd ON bd.[id] = os.[booking_detail_id]
    INNER JOIN [dbo].[Bookings] b ON b.[id] = bd.[booking_id]
    WHERE b.[booking_code] LIKE @BookingPrefix + N'%'
       OR os.[note] LIKE N'%' + @SeedMarker + N'%';

    DELETE i
    FROM [dbo].[Invoices] i
    INNER JOIN [dbo].[Bookings] b ON b.[id] = i.[booking_id]
    WHERE b.[booking_code] LIKE @BookingPrefix + N'%';

    DELETE bd
    FROM [dbo].[Booking_Details] bd
    INNER JOIN [dbo].[Bookings] b ON b.[id] = bd.[booking_id]
    WHERE b.[booking_code] LIKE @BookingPrefix + N'%';

    DELETE FROM [dbo].[Bookings]
    WHERE [booking_code] LIKE @BookingPrefix + N'%';

    DELETE vtu
    FROM [dbo].[Voucher_Target_Users] vtu
    INNER JOIN [dbo].[Vouchers] v ON v.[id] = vtu.[voucher_id]
    WHERE v.[code] LIKE @VoucherPrefix + N'%';

    DELETE FROM [dbo].[Room_Inventory]
    WHERE [note] LIKE N'%' + @SeedMarker + N'%';

    DELETE FROM [dbo].[Rooms]
    WHERE [notes] LIKE N'%' + @SeedMarker + N'%';

    DELETE FROM [dbo].[Vouchers]
    WHERE [code] LIKE @VoucherPrefix + N'%';

    DELETE FROM [dbo].[Users]
    WHERE [email] LIKE N'demo.guest%' + @GuestEmailDomain;

    CREATE TABLE #DemoUsers
    (
        UserSlot INT NOT NULL PRIMARY KEY,
        FullName NVARCHAR(255) NOT NULL,
        Email NVARCHAR(255) NOT NULL,
        Phone NVARCHAR(50) NOT NULL,
        Gender NVARCHAR(10) NULL,
        DateOfBirth DATE NULL,
        MembershipId INT NULL,
        InitialLoyaltyPoints INT NOT NULL,
        InitialLoyaltyUsable INT NOT NULL,
        UserId INT NULL
    );

    INSERT INTO #DemoUsers
    (
        UserSlot, FullName, Email, Phone, Gender, DateOfBirth,
        MembershipId, InitialLoyaltyPoints, InitialLoyaltyUsable
    )
    VALUES
    (1,  N'Nguyễn Minh An',        N'demo.guest01@seed.local', N'0907000001', N'Nam', DATEFROMPARTS(1994, @CurrentMonth, 4),  1,  200,   200),
    (2,  N'Trần Thu Hà',           N'demo.guest02@seed.local', N'0907000002', N'Nữ',  DATEFROMPARTS(1996,  3, 12),            2,  700,   500),
    (3,  N'Lê Quốc Bảo',           N'demo.guest03@seed.local', N'0907000003', N'Nam', DATEFROMPARTS(1989, 11, 21),            3, 1800,  1300),
    (4,  N'Phạm Ngọc Mai',         N'demo.guest04@seed.local', N'0907000004', N'Nữ',  DATEFROMPARTS(1993, @CurrentMonth, 9),  4, 3600,  2400),
    (5,  N'Võ Gia Huy',            N'demo.guest05@seed.local', N'0907000005', N'Nam', DATEFROMPARTS(1991,  7, 17),            5, 6200,  4800),
    (6,  N'Đặng Thanh Trúc',       N'demo.guest06@seed.local', N'0907000006', N'Nữ',  DATEFROMPARTS(1998,  9,  2),            2,  900,   700),
    (7,  N'Bùi Hoàng Long',        N'demo.guest07@seed.local', N'0907000007', N'Nam', DATEFROMPARTS(1988,  1, 28),            3, 2200,  1700),
    (8,  N'Hồ Mỹ Duyên',           N'demo.guest08@seed.local', N'0907000008', N'Nữ',  DATEFROMPARTS(1997,  5, 30),            1,  150,   150),
    (9,  N'Ngô Đức Khánh',         N'demo.guest09@seed.local', N'0907000009', N'Nam', DATEFROMPARTS(1990, @CurrentMonth, 15), 4, 4200,  3100),
    (10, N'Phan Ngọc Bích',        N'demo.guest10@seed.local', N'0907000010', N'Nữ',  DATEFROMPARTS(1995,  2,  5),            5, 7800,  6100),
    (11, N'Dương Minh Khoa',       N'demo.guest11@seed.local', N'0907000011', N'Nam', DATEFROMPARTS(1987,  8, 18),            6, 11200, 8500),
    (12, N'Đỗ Hải Yến',            N'demo.guest12@seed.local', N'0907000012', N'Nữ',  DATEFROMPARTS(1999, 12, 11),            1,  300,   300),
    (13, N'Cao Nhật Nam',          N'demo.guest13@seed.local', N'0907000013', N'Nam', DATEFROMPARTS(1992, 10,  7),            2,  650,   650),
    (14, N'Nguyễn Lan Chi',        N'demo.guest14@seed.local', N'0907000014', N'Nữ',  DATEFROMPARTS(1994, @CurrentMonth, 20), 3, 1600,  1400),
    (15, N'Tạ Tuấn Kiệt',          N'demo.guest15@seed.local', N'0907000015', N'Nam', DATEFROMPARTS(1986,  4,  1),            4, 4800,  3500),
    (16, N'Lý Bảo Anh',            N'demo.guest16@seed.local', N'0907000016', N'Nữ',  DATEFROMPARTS(2000,  6, 14),            2,  950,   800),
    (17, N'Châu Quốc Thịnh',       N'demo.guest17@seed.local', N'0907000017', N'Nam', DATEFROMPARTS(1991,  3, 27),            5, 6900,  5300),
    (18, N'La Thảo Vy',            N'demo.guest18@seed.local', N'0907000018', N'Nữ',  DATEFROMPARTS(1998,  1,  9),            1,  250,   250),
    (19, N'Đinh Trung Hiếu',       N'demo.guest19@seed.local', N'0907000019', N'Nam', DATEFROMPARTS(1985, 11,  3),            6, 13800, 9900),
    (20, N'Kiều Phương Linh',      N'demo.guest20@seed.local', N'0907000020', N'Nữ',  DATEFROMPARTS(1996,  7, 23),            3, 2100,  1800),
    (21, N'Mai Anh Tú',            N'demo.guest21@seed.local', N'0907000021', N'Nam', DATEFROMPARTS(1993, @CurrentMonth, 27), 4, 3900,  3300),
    (22, N'Vương Khả Hân',         N'demo.guest22@seed.local', N'0907000022', N'Nữ',  DATEFROMPARTS(1997,  5,  6),            2,  850,   850),
    (23, N'Tôn Gia Phúc',          N'demo.guest23@seed.local', N'0907000023', N'Nam', DATEFROMPARTS(1989,  9, 29),            5, 9100,  7200),
    (24, N'Quách Nhã Uyên',        N'demo.guest24@seed.local', N'0907000024', N'Nữ',  DATEFROMPARTS(1995,  2, 19),            1,  180,   180);

    INSERT INTO [dbo].[Users]
    (
        [role_id], [membership_id], [full_name], [email], [phone], [date_of_birth], [gender],
        [address], [password_hash], [loyalty_points], [loyalty_points_usable], [status], [created_at], [updated_at]
    )
    SELECT
        @GuestRoleId,
        du.[MembershipId],
        du.[FullName],
        du.[Email],
        du.[Phone],
        du.[DateOfBirth],
        du.[Gender],
        N'Khách demo seed tháng - ' + @SeedMarker,
        @PasswordHash,
        du.[InitialLoyaltyPoints],
        du.[InitialLoyaltyUsable],
        1,
        DATEADD(DAY, -40 + du.[UserSlot], @Now),
        DATEADD(DAY, -3, @Now)
    FROM #DemoUsers du;

    UPDATE du
    SET du.[UserId] = u.[id]
    FROM #DemoUsers du
    INNER JOIN [dbo].[Users] u ON u.[email] = du.[Email];

    CREATE TABLE #DemoRooms
    (
        RoomNumber NVARCHAR(50) NOT NULL PRIMARY KEY,
        RoomTypeId INT NOT NULL,
        RoomId INT NULL
    );

    INSERT INTO #DemoRooms (RoomNumber, RoomTypeId)
    VALUES
    (N'105', 1), (N'106', 1), (N'107', 2), (N'108', 2), (N'109', 3), (N'110', 3),
    (N'111', 4), (N'112', 4), (N'205', 1), (N'206', 2), (N'207', 3), (N'208', 3),
    (N'209', 4), (N'210', 4), (N'211', 5), (N'212', 5), (N'303', 2), (N'304', 3),
    (N'305', 4), (N'306', 5), (N'307', 6), (N'308', 6), (N'309', 7), (N'310', 7),
    (N'403', 3), (N'404', 4), (N'405', 5), (N'406', 6), (N'407', 7), (N'408', 8),
    (N'409', 8), (N'410', 9), (N'502', 4), (N'503', 6), (N'504', 8), (N'VILLA-2', 10);

    INSERT INTO [dbo].[Rooms]
    (
        [room_type_id], [room_number], [floor], [view_type], [status],
        [business_status], [cleaning_status], [notes]
    )
    SELECT
        dr.[RoomTypeId],
        dr.[RoomNumber],
        CASE
            WHEN dr.[RoomNumber] LIKE N'VILLA%' THEN 1
            ELSE TRY_CONVERT(INT, LEFT(dr.[RoomNumber], 1))
        END,
        CASE dr.[RoomTypeId] % 4
            WHEN 0 THEN N'Biển'
            WHEN 1 THEN N'Thành phố'
            WHEN 2 THEN N'Vườn'
            ELSE N'Hồ bơi'
        END,
        CASE
            WHEN dr.[RoomNumber] IN (N'208', N'406', N'410') THEN N'Maintenance'
            WHEN dr.[RoomNumber] IN (N'106', N'205', N'303', N'503') THEN N'Cleaning'
            WHEN dr.[RoomNumber] IN (N'309', N'502') THEN N'Occupied'
            ELSE N'Available'
        END,
        CASE
            WHEN dr.[RoomNumber] IN (N'208', N'406', N'410') THEN N'Disabled'
            WHEN dr.[RoomNumber] IN (N'309', N'502') THEN N'Occupied'
            ELSE N'Available'
        END,
        CASE
            WHEN dr.[RoomNumber] IN (N'106', N'205', N'303', N'503') THEN N'Dirty'
            WHEN dr.[RoomNumber] IN (N'111', N'307') THEN N'PendingLoss'
            ELSE N'Clean'
        END,
        N'Room demo monthly finance seed - ' + @SeedMarker
    FROM #DemoRooms dr;

    UPDATE dr
    SET dr.[RoomId] = r.[id]
    FROM #DemoRooms dr
    INNER JOIN [dbo].[Rooms] r ON r.[room_number] = dr.[RoomNumber];

    INSERT INTO [dbo].[Room_Inventory]
    (
        [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [equipment_id]
    )
    SELECT
        dr.[RoomId],
        inv.[quantity],
        inv.[price_if_lost],
        @SeedMarker + N' inventory',
        1,
        inv.[item_type],
        inv.[equipment_id]
    FROM #DemoRooms dr
    CROSS APPLY
    (
        VALUES
        (5,  1, CAST(350000.00 AS DECIMAL(18, 2)),  'Asset'),
        (11, 2, CAST(150000.00 AS DECIMAL(18, 2)),  'Asset'),
        (12, 2, CAST(50000.00  AS DECIMAL(18, 2)),  'Asset'),
        (14, CASE WHEN dr.[RoomTypeId] IN (6, 9, 10) THEN 2 ELSE 1 END, CAST(1200000.00 AS DECIMAL(18, 2)), 'Asset'),
        (15, CASE WHEN dr.[RoomTypeId] IN (6, 9, 10) THEN 4 ELSE 2 END, CAST(250000.00  AS DECIMAL(18, 2)), 'Asset'),
        (16, CASE WHEN dr.[RoomTypeId] >= 8 THEN 4 ELSE 2 END,          CAST(10000.00   AS DECIMAL(18, 2)), 'Minibar'),
        (17, CASE WHEN dr.[RoomTypeId] >= 6 THEN 2 ELSE 1 END,          CAST(20000.00   AS DECIMAL(18, 2)), 'Minibar'),
        (18, CASE WHEN dr.[RoomTypeId] >= 8 THEN 2 ELSE 1 END,          CAST(35000.00   AS DECIMAL(18, 2)), 'Minibar'),
        (19, CASE WHEN dr.[RoomTypeId] >= 5 THEN 2 ELSE 1 END,          CAST(25000.00   AS DECIMAL(18, 2)), 'Minibar'),
        (20, CASE WHEN dr.[RoomTypeId] >= 5 THEN 2 ELSE 1 END,          CAST(30000.00   AS DECIMAL(18, 2)), 'Minibar'),
        (3,  1, CAST(3000000.00 AS DECIMAL(18, 2)), 'Asset'),
        (9,  CASE WHEN dr.[RoomTypeId] >= 3 THEN 1 ELSE 0 END,          CAST(3000000.00 AS DECIMAL(18, 2)), 'Asset')
    ) inv(equipment_id, quantity, price_if_lost, item_type)
    WHERE inv.[quantity] > 0;

    INSERT INTO [dbo].[Room_Inventory]
    (
        [room_id], [quantity], [price_if_lost], [note], [is_active], [item_type], [equipment_id]
    )
    SELECT
        dr.[RoomId],
        1,
        CASE WHEN dr.[RoomTypeId] >= 8 THEN CAST(17000000.00 AS DECIMAL(18, 2)) ELSE CAST(8000000.00 AS DECIMAL(18, 2)) END,
        @SeedMarker + N' inventory',
        1,
        'Asset',
        CASE WHEN dr.[RoomTypeId] >= 8 THEN 21 ELSE 1 END
    FROM #DemoRooms dr;

    CREATE TABLE #DemoVouchers
    (
        VoucherCode NVARCHAR(50) NOT NULL PRIMARY KEY,
        AudienceType NVARCHAR(50) NOT NULL,
        ApplicableRoomTypeId INT NULL,
        TargetMembershipId INT NULL,
        VoucherId INT NULL
    );

    INSERT INTO #DemoVouchers
    (
        VoucherCode, AudienceType, ApplicableRoomTypeId, TargetMembershipId
    )
    VALUES
    (N'DMV-PUB10',       N'PUBLIC',         NULL, NULL),
    (N'DMV-PUB200',      N'PUBLIC',         NULL, NULL),
    (N'DMV-STD15',       N'PUBLIC',         1,    NULL),
    (N'DMV-DBL12',       N'PUBLIC',         2,    NULL),
    (N'DMV-DELUXE12',    N'PUBLIC',         4,    NULL),
    (N'DMV-FAMILY500',   N'PUBLIC',         6,    NULL),
    (N'DMV-HOLIDAY25',   N'HOLIDAY',        NULL, NULL),
    (N'DMV-HOLIDAY300',  N'HOLIDAY',        NULL, NULL),
    (N'DMV-BDAY15',      N'BIRTHDAY_MONTH', NULL, NULL),
    (N'DMV-MEMBER-DONG', N'MEMBERSHIP',     NULL, 2),
    (N'DMV-MEMBER-BAC',  N'MEMBERSHIP',     NULL, 3),
    (N'DMV-MEMBER-VANG', N'MEMBERSHIP',     NULL, 4),
    (N'DMV-MEMBER-BK',   N'MEMBERSHIP',     NULL, 5),
    (N'DMV-USER150',     N'USER',           NULL, NULL),
    (N'DMV-USERSUITE',   N'USER',           8,    NULL),
    (N'DMV-VILLA999',    N'PUBLIC',         10,   NULL);

    INSERT INTO [dbo].[Vouchers]
    (
        [code], [discount_type], [discount_value], [max_discount_amount], [min_booking_value],
        [applicable_room_type_id], [valid_from], [valid_to], [usage_limit], [used_count],
        [max_uses_per_user], [audience_type], [target_membership_id], [occasion_name], [is_active], [created_at]
    )
    SELECT
        dv.[VoucherCode],
        CASE
            WHEN dv.[VoucherCode] IN (N'DMV-PUB200', N'DMV-FAMILY500', N'DMV-HOLIDAY300', N'DMV-USER150', N'DMV-VILLA999')
                THEN N'FIXED_AMOUNT'
            ELSE N'PERCENT'
        END,
        CASE dv.[VoucherCode]
            WHEN N'DMV-PUB10'       THEN CAST(10.00     AS DECIMAL(18, 2))
            WHEN N'DMV-PUB200'      THEN CAST(200000.00 AS DECIMAL(18, 2))
            WHEN N'DMV-STD15'       THEN CAST(15.00     AS DECIMAL(18, 2))
            WHEN N'DMV-DBL12'       THEN CAST(12.00     AS DECIMAL(18, 2))
            WHEN N'DMV-DELUXE12'    THEN CAST(12.00     AS DECIMAL(18, 2))
            WHEN N'DMV-FAMILY500'   THEN CAST(500000.00 AS DECIMAL(18, 2))
            WHEN N'DMV-HOLIDAY25'   THEN CAST(25.00     AS DECIMAL(18, 2))
            WHEN N'DMV-HOLIDAY300'  THEN CAST(300000.00 AS DECIMAL(18, 2))
            WHEN N'DMV-BDAY15'      THEN CAST(15.00     AS DECIMAL(18, 2))
            WHEN N'DMV-MEMBER-DONG' THEN CAST(8.00      AS DECIMAL(18, 2))
            WHEN N'DMV-MEMBER-BAC'  THEN CAST(10.00     AS DECIMAL(18, 2))
            WHEN N'DMV-MEMBER-VANG' THEN CAST(12.00     AS DECIMAL(18, 2))
            WHEN N'DMV-MEMBER-BK'   THEN CAST(18.00     AS DECIMAL(18, 2))
            WHEN N'DMV-USER150'     THEN CAST(150000.00 AS DECIMAL(18, 2))
            WHEN N'DMV-USERSUITE'   THEN CAST(20.00     AS DECIMAL(18, 2))
            WHEN N'DMV-VILLA999'    THEN CAST(999000.00 AS DECIMAL(18, 2))
        END,
        CASE
            WHEN dv.[VoucherCode] IN (N'DMV-HOLIDAY25', N'DMV-MEMBER-BK') THEN CAST(1500000.00 AS DECIMAL(18, 2))
            WHEN dv.[VoucherCode] IN (N'DMV-PUB10', N'DMV-BDAY15', N'DMV-MEMBER-DONG', N'DMV-MEMBER-BAC', N'DMV-MEMBER-VANG') THEN CAST(700000.00 AS DECIMAL(18, 2))
            WHEN dv.[VoucherCode] IN (N'DMV-STD15', N'DMV-DBL12', N'DMV-DELUXE12', N'DMV-USERSUITE') THEN CAST(900000.00 AS DECIMAL(18, 2))
            ELSE NULL
        END,
        CASE
            WHEN dv.[VoucherCode] = N'DMV-PUB10' THEN CAST(600000.00  AS DECIMAL(18, 2))
            WHEN dv.[VoucherCode] = N'DMV-PUB200' THEN CAST(1200000.00 AS DECIMAL(18, 2))
            WHEN dv.[VoucherCode] = N'DMV-STD15' THEN CAST(800000.00  AS DECIMAL(18, 2))
            WHEN dv.[VoucherCode] = N'DMV-DBL12' THEN CAST(1000000.00 AS DECIMAL(18, 2))
            WHEN dv.[VoucherCode] = N'DMV-DELUXE12' THEN CAST(1800000.00 AS DECIMAL(18, 2))
            WHEN dv.[VoucherCode] = N'DMV-FAMILY500' THEN CAST(2500000.00 AS DECIMAL(18, 2))
            WHEN dv.[VoucherCode] = N'DMV-HOLIDAY25' THEN CAST(2500000.00 AS DECIMAL(18, 2))
            WHEN dv.[VoucherCode] = N'DMV-HOLIDAY300' THEN CAST(1800000.00 AS DECIMAL(18, 2))
            WHEN dv.[VoucherCode] = N'DMV-BDAY15' THEN CAST(900000.00 AS DECIMAL(18, 2))
            WHEN dv.[VoucherCode] = N'DMV-MEMBER-DONG' THEN CAST(900000.00 AS DECIMAL(18, 2))
            WHEN dv.[VoucherCode] = N'DMV-MEMBER-BAC' THEN CAST(1200000.00 AS DECIMAL(18, 2))
            WHEN dv.[VoucherCode] = N'DMV-MEMBER-VANG' THEN CAST(1500000.00 AS DECIMAL(18, 2))
            WHEN dv.[VoucherCode] = N'DMV-MEMBER-BK' THEN CAST(2500000.00 AS DECIMAL(18, 2))
            WHEN dv.[VoucherCode] = N'DMV-USER150' THEN CAST(1000000.00 AS DECIMAL(18, 2))
            WHEN dv.[VoucherCode] = N'DMV-USERSUITE' THEN CAST(2600000.00 AS DECIMAL(18, 2))
            WHEN dv.[VoucherCode] = N'DMV-VILLA999' THEN CAST(8500000.00 AS DECIMAL(18, 2))
        END,
        dv.[ApplicableRoomTypeId],
        DATEADD(DAY, -15, @Now),
        DATEADD(DAY, 45, @Now),
        CASE
            WHEN dv.[VoucherCode] IN (N'DMV-VILLA999', N'DMV-USERSUITE') THEN 6
            WHEN dv.[VoucherCode] IN (N'DMV-HOLIDAY25', N'DMV-HOLIDAY300') THEN 18
            WHEN dv.[VoucherCode] LIKE N'DMV-MEMBER%' THEN 12
            ELSE 50
        END,
        0,
        CASE
            WHEN dv.[VoucherCode] IN (N'DMV-HOLIDAY25', N'DMV-HOLIDAY300') THEN 2
            WHEN dv.[VoucherCode] IN (N'DMV-USER150', N'DMV-USERSUITE', N'DMV-VILLA999') THEN 1
            ELSE 3
        END,
        dv.[AudienceType],
        dv.[TargetMembershipId],
        CASE
            WHEN dv.[AudienceType] = N'HOLIDAY' THEN N'Ưu đãi dịp cao điểm'
            WHEN dv.[AudienceType] = N'BIRTHDAY_MONTH' THEN N'Ưu đãi sinh nhật'
            WHEN dv.[AudienceType] = N'MEMBERSHIP' THEN N'Ưu đãi hạng thành viên'
            ELSE N'Voucher demo tháng'
        END,
        1,
        DATEADD(DAY, -10, @Now)
    FROM #DemoVouchers dv;

    UPDATE dv
    SET dv.[VoucherId] = v.[id]
    FROM #DemoVouchers dv
    INNER JOIN [dbo].[Vouchers] v ON v.[code] = dv.[VoucherCode];

    INSERT INTO [dbo].[Voucher_Target_Users] ([voucher_id], [user_id], [created_at])
    SELECT dv.[VoucherId], du.[UserId], DATEADD(DAY, -5, @Now)
    FROM #DemoVouchers dv
    INNER JOIN #DemoUsers du ON
        (dv.[VoucherCode] = N'DMV-USER150' AND du.[UserSlot] IN (2, 6, 9, 14, 20))
        OR
        (dv.[VoucherCode] = N'DMV-USERSUITE' AND du.[UserSlot] IN (5, 10, 11, 19, 23));

    CREATE TABLE #BookingPlans
    (
        PlanNo INT NOT NULL PRIMARY KEY,
        Status NVARCHAR(50) NOT NULL,
        Source NVARCHAR(20) NOT NULL,
        UserSlot INT NULL,
        RoomCount INT NOT NULL,
        StayOffset INT NOT NULL,
        StayLength INT NOT NULL,
        NeedsRoomAssignment BIT NOT NULL,
        VoucherPreference NVARCHAR(30) NULL,
        RedeemPoints INT NOT NULL,
        RefundCase BIT NOT NULL,
        NumAdults INT NOT NULL,
        NumChildren INT NOT NULL
    );

    DECLARE @n INT = 1;
    WHILE @n <= 12
    BEGIN
        INSERT INTO #BookingPlans
        VALUES
        (
            @n,
            N'Pending',
            CASE WHEN @n % 3 = 0 THEN N'phone' ELSE N'online' END,
            CASE WHEN @n % 5 = 0 THEN NULL ELSE ((@n - 1) % 24) + 1 END,
            CASE WHEN @n IN (3, 6, 9, 12) THEN 2 ELSE 1 END,
            1 + (@n % 12),
            1 + (@n % 4),
            0,
            CASE WHEN @n % 4 = 0 THEN N'PUBLIC' WHEN @n % 6 = 0 THEN N'HOLIDAY' ELSE NULL END,
            0,
            0,
            CASE WHEN @n IN (3, 6, 9, 12) THEN 3 ELSE 2 END,
            CASE WHEN @n % 4 = 0 THEN 1 ELSE 0 END
        );
        SET @n += 1;
    END;

    SET @n = 13;
    WHILE @n <= 30
    BEGIN
        INSERT INTO #BookingPlans
        VALUES
        (
            @n,
            N'Confirmed',
            CASE WHEN @n % 4 = 0 THEN N'walk_in' WHEN @n % 2 = 0 THEN N'phone' ELSE N'online' END,
            CASE WHEN @n % 6 = 0 THEN NULL ELSE ((@n - 1) % 24) + 1 END,
            CASE WHEN @n IN (15, 18, 21, 24, 27, 30) THEN 2 ELSE 1 END,
            2 + (@n % 18),
            2 + (@n % 4),
            CASE WHEN @n % 3 = 0 THEN 1 ELSE 0 END,
            CASE
                WHEN @n % 7 = 0 THEN N'USER'
                WHEN @n % 5 = 0 THEN N'MEMBERSHIP'
                WHEN @n % 4 = 0 THEN N'ROOM'
                WHEN @n % 3 = 0 THEN N'PUBLIC'
                ELSE NULL
            END,
            CASE WHEN @n % 9 = 0 THEN 200 WHEN @n % 8 = 0 THEN 100 ELSE 0 END,
            0,
            CASE WHEN @n % 3 = 0 THEN 3 ELSE 2 END,
            CASE WHEN @n % 5 = 0 THEN 1 ELSE 0 END
        );
        SET @n += 1;
    END;

    SET @n = 31;
    WHILE @n <= 42
    BEGIN
        INSERT INTO #BookingPlans
        VALUES
        (
            @n,
            N'Checked_in',
            CASE WHEN @n % 4 = 0 THEN N'walk_in' ELSE N'online' END,
            CASE WHEN @n % 7 = 0 THEN NULL ELSE ((@n - 1) % 24) + 1 END,
            CASE WHEN @n IN (33, 36, 39) THEN 2 ELSE 1 END,
            -(@n % 3),
            2 + (@n % 4),
            1,
            CASE
                WHEN @n % 6 = 0 THEN N'ROOM'
                WHEN @n % 5 = 0 THEN N'BIRTHDAY'
                WHEN @n % 4 = 0 THEN N'HOLIDAY'
                ELSE N'PUBLIC'
            END,
            CASE WHEN @n % 4 = 0 THEN 200 ELSE 0 END,
            0,
            CASE WHEN @n IN (33, 36, 39) THEN 4 ELSE 2 END,
            CASE WHEN @n % 3 = 0 THEN 1 ELSE 0 END
        );
        SET @n += 1;
    END;

    SET @n = 43;
    WHILE @n <= 54
    BEGIN
        INSERT INTO #BookingPlans
        VALUES
        (
            @n,
            N'Checked_out_pending_settlement',
            CASE WHEN @n % 2 = 0 THEN N'walk_in' ELSE N'online' END,
            CASE WHEN @n % 8 = 0 THEN NULL ELSE ((@n - 1) % 24) + 1 END,
            CASE WHEN @n IN (45, 48, 51, 54) THEN 2 ELSE 1 END,
            -10 + (@n - 43),
            2 + (@n % 3),
            1,
            CASE
                WHEN @n % 6 = 0 THEN N'MEMBERSHIP'
                WHEN @n % 5 = 0 THEN N'ROOM'
                WHEN @n % 4 = 0 THEN N'HOLIDAY'
                ELSE N'PUBLIC'
            END,
            CASE WHEN @n % 3 = 0 THEN 300 ELSE 0 END,
            0,
            CASE WHEN @n IN (45, 48, 51, 54) THEN 4 ELSE 2 END,
            CASE WHEN @n % 4 = 0 THEN 1 ELSE 0 END
        );
        SET @n += 1;
    END;

    SET @n = 55;
    WHILE @n <= 72
    BEGIN
        INSERT INTO #BookingPlans
        VALUES
        (
            @n,
            N'Completed',
            CASE WHEN @n % 3 = 0 THEN N'walk_in' WHEN @n % 2 = 0 THEN N'phone' ELSE N'online' END,
            CASE WHEN @n % 9 = 0 THEN NULL ELSE ((@n - 1) % 24) + 1 END,
            CASE WHEN @n IN (56, 59, 62, 65, 68, 71) THEN 2 ELSE 1 END,
            -27 + (@n - 55),
            1 + (@n % 4),
            1,
            CASE
                WHEN @n % 8 = 0 THEN N'USER'
                WHEN @n % 7 = 0 THEN N'BIRTHDAY'
                WHEN @n % 6 = 0 THEN N'MEMBERSHIP'
                WHEN @n % 5 = 0 THEN N'ROOM'
                ELSE N'PUBLIC'
            END,
            CASE WHEN @n % 4 = 0 THEN 200 WHEN @n % 6 = 0 THEN 400 ELSE 0 END,
            0,
            CASE WHEN @n IN (56, 59, 62, 65, 68, 71) THEN 4 ELSE 2 END,
            CASE WHEN @n % 5 = 0 THEN 1 ELSE 0 END
        );
        SET @n += 1;
    END;

    SET @n = 73;
    WHILE @n <= 80
    BEGIN
        INSERT INTO #BookingPlans
        VALUES
        (
            @n,
            N'Cancelled',
            CASE WHEN @n % 2 = 0 THEN N'online' ELSE N'phone' END,
            CASE WHEN @n % 4 = 0 THEN NULL ELSE ((@n - 1) % 24) + 1 END,
            CASE WHEN @n IN (74, 78) THEN 2 ELSE 1 END,
            4 + (@n % 8),
            2 + (@n % 3),
            0,
            CASE WHEN @n % 3 = 0 THEN N'PUBLIC' WHEN @n % 5 = 0 THEN N'MEMBERSHIP' ELSE NULL END,
            0,
            CASE WHEN @n IN (73, 76, 79) THEN 1 ELSE 0 END,
            CASE WHEN @n IN (74, 78) THEN 3 ELSE 2 END,
            CASE WHEN @n % 4 = 0 THEN 1 ELSE 0 END
        );
        SET @n += 1;
    END;

    CREATE TABLE #SeedBookings
    (
        PlanNo INT NOT NULL PRIMARY KEY,
        BookingId INT NOT NULL,
        UserId INT NULL,
        Status NVARCHAR(50) NOT NULL
    );

    INSERT INTO [dbo].[Bookings]
    (
        [user_id], [guest_name], [guest_phone], [guest_email], [num_adults], [num_children],
        [booking_code], [voucher_id], [total_estimated_amount], [loyalty_points_redeemed], [loyalty_discount_amount],
        [deposit_amount], [required_booking_deposit_amount], [required_check_in_amount],
        [check_in_time], [check_out_time], [status], [source], [note],
        [cancellation_reason], [cancelled_at], [expires_at], [refund_policy], [refundable_until], [refund_amount]
    )
    SELECT
        du.[UserId],
        COALESCE(du.[FullName], N'Khách vãng lai #' + RIGHT(N'000' + CAST(src.[PlanNo] AS NVARCHAR(10)), 3)),
        COALESCE(du.[Phone], N'091900' + RIGHT(N'0000' + CAST(src.[PlanNo] AS NVARCHAR(10)), 4)),
        COALESCE(du.[Email], N'walkin.' + RIGHT(N'000' + CAST(src.[PlanNo] AS NVARCHAR(10)), 3) + @GuestEmailDomain),
        src.[NumAdults],
        src.[NumChildren],
        @BookingPrefix + RIGHT(N'000' + CAST(src.[PlanNo] AS NVARCHAR(10)), 3),
        NULL,
        0,
        0,
        0,
        0,
        0,
        0,
        NULL,
        NULL,
        src.[Status],
        src.[Source],
        N'Booking demo tháng cho dashboard/invoice/service/damage - ' + @SeedMarker,
        CASE WHEN src.[Status] = N'Cancelled' THEN N'Hủy seed demo - đổi kế hoạch lưu trú' ELSE NULL END,
        CASE WHEN src.[Status] = N'Cancelled' THEN DATEADD(HOUR, 10, DATEADD(DAY, src.[StayOffset] - 2, CAST(@Today AS DATETIME))) ELSE NULL END,
        CASE WHEN src.[Status] = N'Pending' AND src.[Source] = N'online' THEN DATEADD(HOUR, 18, DATEADD(DAY, src.[StayOffset] - 1, CAST(@Today AS DATETIME))) ELSE NULL END,
        CASE
            WHEN src.[Status] = N'Cancelled' AND src.[RefundCase] = 1 THEN N'partial'
            WHEN src.[Status] = N'Cancelled' THEN N'non_refundable'
            ELSE N'refundable'
        END,
        DATEADD(HOUR, 12, DATEADD(DAY, src.[StayOffset] - 1, CAST(@Today AS DATETIME))),
        0
    FROM #BookingPlans src
    LEFT JOIN #DemoUsers du ON du.[UserSlot] = src.[UserSlot];

    INSERT INTO #SeedBookings (PlanNo, BookingId, UserId, Status)
    SELECT
        bp.[PlanNo],
        b.[id],
        b.[user_id],
        b.[status]
    FROM #BookingPlans bp
    INNER JOIN [dbo].[Bookings] b
        ON b.[booking_code] = @BookingPrefix + RIGHT(N'000' + CAST(bp.[PlanNo] AS NVARCHAR(10)), 3);

    CREATE TABLE #DetailPlans
    (
        PlanNo INT NOT NULL,
        BookingId INT NOT NULL,
        DetailNo INT NOT NULL,
        AssignRoom BIT NOT NULL,
        RoomTypeId INT NOT NULL,
        CheckInDate DATETIME NOT NULL,
        CheckOutDate DATETIME NOT NULL,
        PricePerNight DECIMAL(18, 2) NOT NULL
    );

    ;WITH DetailNumbers AS
    (
        SELECT 1 AS DetailNo
        UNION ALL
        SELECT 2
    )
    INSERT INTO #DetailPlans
    (
        PlanNo, BookingId, DetailNo, AssignRoom, RoomTypeId, CheckInDate, CheckOutDate, PricePerNight
    )
    SELECT
        sb.[PlanNo],
        sb.[BookingId],
        dn.[DetailNo],
        CASE
            WHEN bp.[Status] IN (N'Checked_in', N'Checked_out_pending_settlement', N'Completed') THEN 1
            WHEN bp.[Status] = N'Confirmed' AND bp.[NeedsRoomAssignment] = 1 THEN 1
            ELSE 0
        END,
        CASE
            WHEN dn.[DetailNo] = 1 THEN
                CASE sb.[PlanNo] % 10
                    WHEN 0 THEN 10
                    WHEN 1 THEN 1
                    WHEN 2 THEN 2
                    WHEN 3 THEN 3
                    WHEN 4 THEN 4
                    WHEN 5 THEN 5
                    WHEN 6 THEN 6
                    WHEN 7 THEN 7
                    WHEN 8 THEN 8
                    ELSE 4
                END
            ELSE
                CASE (sb.[PlanNo] + 3) % 8
                    WHEN 0 THEN 2
                    WHEN 1 THEN 3
                    WHEN 2 THEN 4
                    WHEN 3 THEN 5
                    WHEN 4 THEN 6
                    WHEN 5 THEN 3
                    WHEN 6 THEN 4
                    ELSE 7
                END
        END,
        DATEADD(HOUR, 14 + (sb.[PlanNo] % 3), DATEADD(DAY, bp.[StayOffset], CAST(@Today AS DATETIME))),
        DATEADD(HOUR, 11 + (sb.[PlanNo] % 2), DATEADD(DAY, bp.[StayOffset] + bp.[StayLength], CAST(@Today AS DATETIME))),
        rt.[base_price]
    FROM #SeedBookings sb
    INNER JOIN #BookingPlans bp ON bp.[PlanNo] = sb.[PlanNo]
    INNER JOIN DetailNumbers dn ON dn.[DetailNo] <= bp.[RoomCount]
    INNER JOIN [dbo].[Room_Types] rt ON rt.[id] =
        CASE
            WHEN dn.[DetailNo] = 1 THEN
                CASE sb.[PlanNo] % 10
                    WHEN 0 THEN 10
                    WHEN 1 THEN 1
                    WHEN 2 THEN 2
                    WHEN 3 THEN 3
                    WHEN 4 THEN 4
                    WHEN 5 THEN 5
                    WHEN 6 THEN 6
                    WHEN 7 THEN 7
                    WHEN 8 THEN 8
                    ELSE 4
                END
            ELSE
                CASE (sb.[PlanNo] + 3) % 8
                    WHEN 0 THEN 2
                    WHEN 1 THEN 3
                    WHEN 2 THEN 4
                    WHEN 3 THEN 5
                    WHEN 4 THEN 6
                    WHEN 5 THEN 3
                    WHEN 6 THEN 4
                    ELSE 7
                END
        END;

    CREATE TABLE #SeedBookingDetails
    (
        BookingDetailId INT NOT NULL PRIMARY KEY,
        PlanNo INT NOT NULL,
        BookingId INT NOT NULL,
        DetailNo INT NOT NULL,
        RoomTypeId INT NOT NULL,
        AssignRoom BIT NOT NULL
    );

    INSERT INTO [dbo].[Booking_Details]
    (
        [booking_id], [room_id], [room_type_id], [check_in_date], [check_out_date], [price_per_night], [note]
    )
    SELECT
        src.[BookingId],
        NULL,
        src.[RoomTypeId],
        src.[CheckInDate],
        src.[CheckOutDate],
        src.[PricePerNight],
        N'Chi tiết demo #' + CAST(src.[DetailNo] AS NVARCHAR(10)) + N' - ' + @SeedMarker
    FROM #DetailPlans src;

    INSERT INTO #SeedBookingDetails (BookingDetailId, PlanNo, BookingId, DetailNo, RoomTypeId, AssignRoom)
    SELECT
        bd.[id],
        dp.[PlanNo],
        dp.[BookingId],
        dp.[DetailNo],
        dp.[RoomTypeId],
        dp.[AssignRoom]
    FROM #DetailPlans dp
    INNER JOIN [dbo].[Booking_Details] bd
        ON bd.[booking_id] = dp.[BookingId]
       AND bd.[room_type_id] = dp.[RoomTypeId]
       AND bd.[check_in_date] = dp.[CheckInDate]
       AND bd.[check_out_date] = dp.[CheckOutDate]
       AND bd.[price_per_night] = dp.[PricePerNight]
       AND bd.[note] = N'Chi tiết demo #' + CAST(dp.[DetailNo] AS NVARCHAR(10)) + N' - ' + @SeedMarker;

    ;WITH RoomPool AS
    (
        SELECT
            dr.[RoomId],
            dr.[RoomTypeId],
            ROW_NUMBER() OVER (PARTITION BY dr.[RoomTypeId] ORDER BY dr.[RoomNumber]) AS SeqNo,
            COUNT(*) OVER (PARTITION BY dr.[RoomTypeId]) AS TotalPerType
        FROM #DemoRooms dr
    )
    SELECT *
    INTO #DemoRoomPool
    FROM RoomPool;

    UPDATE bd
    SET bd.[room_id] = rp.[RoomId]
    FROM [dbo].[Booking_Details] bd
    INNER JOIN #SeedBookingDetails sbd ON sbd.[BookingDetailId] = bd.[id]
    INNER JOIN #DemoRoomPool rp
        ON rp.[RoomTypeId] = sbd.[RoomTypeId]
       AND rp.[SeqNo] = (((sbd.[PlanNo] * 3) + sbd.[DetailNo]) % rp.[TotalPerType]) + 1
    WHERE sbd.[AssignRoom] = 1;

    CREATE TABLE #BookingFinancials
    (
        BookingId INT NOT NULL PRIMARY KEY,
        BookingRoomAmount DECIMAL(18, 2) NOT NULL,
        FirstRoomTypeId INT NULL,
        VoucherId INT NULL,
        VoucherDiscount DECIMAL(18, 2) NOT NULL DEFAULT 0,
        RedeemPoints INT NOT NULL DEFAULT 0,
        LoyaltyDiscount DECIMAL(18, 2) NOT NULL DEFAULT 0
    );

    INSERT INTO #BookingFinancials (BookingId, BookingRoomAmount, FirstRoomTypeId)
    SELECT
        sb.[BookingId],
        SUM(
            (CASE
                WHEN DATEDIFF(DAY, bd.[check_in_date], bd.[check_out_date]) <= 0 THEN 1
                ELSE DATEDIFF(DAY, bd.[check_in_date], bd.[check_out_date])
             END) * bd.[price_per_night]
        ) AS BookingRoomAmount,
        MIN(bd.[room_type_id]) AS FirstRoomTypeId
    FROM #SeedBookings sb
    INNER JOIN [dbo].[Booking_Details] bd ON bd.[booking_id] = sb.[BookingId]
    GROUP BY sb.[BookingId];

    UPDATE bf
    SET
        bf.[VoucherId] = picked.[VoucherId],
        bf.[VoucherDiscount] = COALESCE(picked.[VoucherDiscount], 0),
        bf.[RedeemPoints] = CASE
            WHEN COALESCE(picked.[RemainingAfterVoucher], bf.[BookingRoomAmount]) >= CAST(bp.[RedeemPoints] * 100 AS DECIMAL(18, 2))
                 AND bp.[UserSlot] IS NOT NULL
                 AND bp.[RedeemPoints] > 0
                 AND du.[InitialLoyaltyUsable] >= bp.[RedeemPoints]
                THEN bp.[RedeemPoints]
            ELSE 0
        END,
        bf.[LoyaltyDiscount] = CASE
            WHEN COALESCE(picked.[RemainingAfterVoucher], bf.[BookingRoomAmount]) >= CAST(bp.[RedeemPoints] * 100 AS DECIMAL(18, 2))
                 AND bp.[UserSlot] IS NOT NULL
                 AND bp.[RedeemPoints] > 0
                 AND du.[InitialLoyaltyUsable] >= bp.[RedeemPoints]
                THEN CAST(bp.[RedeemPoints] * 100 AS DECIMAL(18, 2))
            ELSE 0
        END
    FROM #BookingFinancials bf
    INNER JOIN #SeedBookings sb ON sb.[BookingId] = bf.[BookingId]
    INNER JOIN #BookingPlans bp ON bp.[PlanNo] = sb.[PlanNo]
    LEFT JOIN #DemoUsers du ON du.[UserSlot] = bp.[UserSlot]
    OUTER APPLY
    (
        SELECT TOP 1
            dv.[VoucherId],
            CASE
                WHEN v.[discount_type] = N'PERCENT'
                    THEN CASE
                        WHEN v.[max_discount_amount] IS NOT NULL
                            THEN CASE
                                WHEN (bf.[BookingRoomAmount] * v.[discount_value] / 100.0) > v.[max_discount_amount]
                                    THEN v.[max_discount_amount]
                                ELSE (bf.[BookingRoomAmount] * v.[discount_value] / 100.0)
                            END
                        ELSE (bf.[BookingRoomAmount] * v.[discount_value] / 100.0)
                    END
                ELSE v.[discount_value]
            END AS VoucherDiscount,
            bf.[BookingRoomAmount]
                - CASE
                    WHEN v.[discount_type] = N'PERCENT'
                        THEN CASE
                            WHEN v.[max_discount_amount] IS NOT NULL
                                THEN CASE
                                    WHEN (bf.[BookingRoomAmount] * v.[discount_value] / 100.0) > v.[max_discount_amount]
                                        THEN v.[max_discount_amount]
                                    ELSE (bf.[BookingRoomAmount] * v.[discount_value] / 100.0)
                                END
                            ELSE (bf.[BookingRoomAmount] * v.[discount_value] / 100.0)
                        END
                    ELSE v.[discount_value]
                END AS RemainingAfterVoucher
        FROM #DemoVouchers dv
        INNER JOIN [dbo].[Vouchers] v ON v.[id] = dv.[VoucherId]
        LEFT JOIN #DemoUsers u ON u.[UserSlot] = bp.[UserSlot]
        LEFT JOIN [dbo].[Voucher_Target_Users] vtu
            ON vtu.[voucher_id] = dv.[VoucherId]
           AND vtu.[user_id] = u.[UserId]
        WHERE bp.[VoucherPreference] IS NOT NULL
          AND bf.[BookingRoomAmount] >= ISNULL(v.[min_booking_value], 0)
          AND (dv.[ApplicableRoomTypeId] IS NULL OR dv.[ApplicableRoomTypeId] = bf.[FirstRoomTypeId])
          AND
          (
              (bp.[VoucherPreference] = N'PUBLIC' AND dv.[AudienceType] = N'PUBLIC')
              OR (bp.[VoucherPreference] = N'HOLIDAY' AND dv.[AudienceType] = N'HOLIDAY')
              OR (bp.[VoucherPreference] = N'BIRTHDAY' AND dv.[AudienceType] = N'BIRTHDAY_MONTH' AND u.[DateOfBirth] IS NOT NULL AND MONTH(u.[DateOfBirth]) = @CurrentMonth)
              OR (bp.[VoucherPreference] = N'MEMBERSHIP' AND dv.[AudienceType] = N'MEMBERSHIP' AND u.[MembershipId] = dv.[TargetMembershipId])
              OR (bp.[VoucherPreference] = N'USER' AND dv.[AudienceType] = N'USER' AND vtu.[user_id] IS NOT NULL)
              OR (bp.[VoucherPreference] = N'ROOM' AND dv.[ApplicableRoomTypeId] = bf.[FirstRoomTypeId] AND dv.[AudienceType] IN (N'PUBLIC', N'USER'))
          )
        ORDER BY
            CASE
                WHEN bp.[VoucherPreference] = N'ROOM' AND dv.[ApplicableRoomTypeId] = bf.[FirstRoomTypeId] THEN 0
                WHEN dv.[AudienceType] = N'USER' THEN 1
                WHEN dv.[AudienceType] = N'MEMBERSHIP' THEN 2
                WHEN dv.[AudienceType] = N'BIRTHDAY_MONTH' THEN 3
                WHEN dv.[AudienceType] = N'HOLIDAY' THEN 4
                ELSE 5
            END,
            dv.[VoucherCode]
    ) picked;

    UPDATE b
    SET
        b.[voucher_id] = bf.[VoucherId],
        b.[total_estimated_amount] = CASE
            WHEN bf.[BookingRoomAmount] - bf.[VoucherDiscount] - bf.[LoyaltyDiscount] < 0 THEN 0
            ELSE bf.[BookingRoomAmount] - bf.[VoucherDiscount] - bf.[LoyaltyDiscount]
        END,
        b.[loyalty_points_redeemed] = bf.[RedeemPoints],
        b.[loyalty_discount_amount] = bf.[LoyaltyDiscount],
        b.[required_booking_deposit_amount] = ROUND(
            (CASE
                WHEN bf.[BookingRoomAmount] - bf.[VoucherDiscount] - bf.[LoyaltyDiscount] < 0 THEN 0
                ELSE bf.[BookingRoomAmount] - bf.[VoucherDiscount] - bf.[LoyaltyDiscount]
            END) * (@BookingDepositPercent / 100.0),
            2
        ),
        b.[required_check_in_amount] = ROUND(
            (CASE
                WHEN bf.[BookingRoomAmount] - bf.[VoucherDiscount] - bf.[LoyaltyDiscount] < 0 THEN 0
                ELSE bf.[BookingRoomAmount] - bf.[VoucherDiscount] - bf.[LoyaltyDiscount]
            END) * (@CheckInRequiredPercent / 100.0),
            2
        ),
        b.[deposit_amount] = CASE bp.[Status]
            WHEN N'Pending' THEN 0
            WHEN N'Confirmed' THEN CASE WHEN bp.[PlanNo] % 2 = 0 THEN ROUND(((bf.[BookingRoomAmount] - bf.[VoucherDiscount] - bf.[LoyaltyDiscount]) * (@BookingDepositPercent / 100.0)), 2) ELSE 0 END
            WHEN N'Checked_in' THEN ROUND(((bf.[BookingRoomAmount] - bf.[VoucherDiscount] - bf.[LoyaltyDiscount]) * (@CheckInRequiredPercent / 100.0)), 2)
            WHEN N'Checked_out_pending_settlement' THEN ROUND(((bf.[BookingRoomAmount] - bf.[VoucherDiscount] - bf.[LoyaltyDiscount]) * 0.55), 2)
            WHEN N'Completed' THEN ROUND(((bf.[BookingRoomAmount] - bf.[VoucherDiscount] - bf.[LoyaltyDiscount]) * 0.40), 2)
            WHEN N'Cancelled' THEN CASE WHEN bp.[RefundCase] = 1 THEN ROUND(((bf.[BookingRoomAmount] - bf.[VoucherDiscount] - bf.[LoyaltyDiscount]) * (@BookingDepositPercent / 100.0)), 2) ELSE 0 END
            ELSE 0
        END,
        b.[check_in_time] = CASE
            WHEN bp.[Status] IN (N'Checked_in', N'Checked_out_pending_settlement', N'Completed')
                THEN DATEADD(MINUTE, (bp.[PlanNo] % 5) * 7, MIN_DATES.[MinCheckInDate])
            ELSE NULL
        END,
        b.[check_out_time] = CASE
            WHEN bp.[Status] IN (N'Checked_out_pending_settlement', N'Completed')
                THEN DATEADD(MINUTE, (bp.[PlanNo] % 4) * 6, MAX_DATES.[MaxCheckOutDate])
            ELSE NULL
        END,
        b.[refund_amount] = CASE
            WHEN bp.[Status] = N'Cancelled' AND bp.[RefundCase] = 1
                THEN ROUND(
                    ROUND(((bf.[BookingRoomAmount] - bf.[VoucherDiscount] - bf.[LoyaltyDiscount]) * (@BookingDepositPercent / 100.0)), 2) * 0.6,
                    2
                )
            ELSE 0
        END
    FROM [dbo].[Bookings] b
    INNER JOIN #SeedBookings sb ON sb.[BookingId] = b.[id]
    INNER JOIN #BookingPlans bp ON bp.[PlanNo] = sb.[PlanNo]
    INNER JOIN #BookingFinancials bf ON bf.[BookingId] = b.[id]
    CROSS APPLY
    (
        SELECT MIN([check_in_date]) AS MinCheckInDate
        FROM [dbo].[Booking_Details]
        WHERE [booking_id] = b.[id]
    ) MIN_DATES
    CROSS APPLY
    (
        SELECT MAX([check_out_date]) AS MaxCheckOutDate
        FROM [dbo].[Booking_Details]
        WHERE [booking_id] = b.[id]
    ) MAX_DATES;

    ;WITH EligibleDetails AS
    (
        SELECT
            sbd.[BookingDetailId],
            sbd.[BookingId],
            sb.[PlanNo],
            sb.[Status],
            ROW_NUMBER() OVER (ORDER BY sb.[PlanNo], sbd.[DetailNo]) AS RN
        FROM #SeedBookingDetails sbd
        INNER JOIN #SeedBookings sb ON sb.[BookingId] = sbd.[BookingId]
        WHERE sb.[Status] IN (N'Checked_in', N'Checked_out_pending_settlement', N'Completed')
    ),
    OrderPlan AS
    (
        SELECT
            ed.[BookingDetailId],
            1 AS OrderNo,
            ed.[PlanNo],
            ed.[Status],
            ed.[RN]
        FROM EligibleDetails ed
        WHERE ed.[RN] <= 50

        UNION ALL

        SELECT
            ed.[BookingDetailId],
            2 AS OrderNo,
            ed.[PlanNo],
            ed.[Status],
            ed.[RN]
        FROM EligibleDetails ed
        WHERE ed.[RN] % 2 = 0
          AND ed.[RN] <= 40
    )
    INSERT INTO [dbo].[Order_Services]
    (
        [booking_detail_id], [order_date], [total_amount], [status], [note], [completed_at], [is_active]
    )
    SELECT
        op.[BookingDetailId],
        DATEADD(HOUR, 8 + (op.[RN] % 10), DATEADD(DAY, -1 + (op.[OrderNo] % 2), @Now)),
        0,
        CASE
            WHEN op.[Status] = N'Checked_in' AND op.[OrderNo] = 1 AND op.[RN] % 3 = 0 THEN N'Pending'
            WHEN op.[Status] = N'Checked_in' AND op.[OrderNo] = 2 AND op.[RN] % 5 = 0 THEN N'Cancelled'
            WHEN op.[Status] = N'Checked_out_pending_settlement' AND op.[OrderNo] = 2 AND op.[RN] % 4 = 0 THEN N'Cancelled'
            ELSE N'Delivered'
        END,
        N'Order service demo #' + CAST(op.[OrderNo] AS NVARCHAR(10)) + N' - ' + @SeedMarker,
        CASE
            WHEN op.[Status] = N'Checked_in' AND op.[OrderNo] = 1 AND op.[RN] % 3 = 0 THEN NULL
            WHEN op.[Status] = N'Checked_in' AND op.[OrderNo] = 2 AND op.[RN] % 5 = 0 THEN NULL
            WHEN op.[Status] = N'Checked_out_pending_settlement' AND op.[OrderNo] = 2 AND op.[RN] % 4 = 0 THEN NULL
            ELSE DATEADD(HOUR, 1, DATEADD(HOUR, 8 + (op.[RN] % 10), DATEADD(DAY, -1 + (op.[OrderNo] % 2), @Now)))
        END,
        1
    FROM OrderPlan op;

    ;WITH SeedOrders AS
    (
        SELECT
            os.[id],
            os.[booking_detail_id],
            ROW_NUMBER() OVER (ORDER BY os.[id]) AS RN
        FROM [dbo].[Order_Services] os
        WHERE os.[note] LIKE N'%'+ @SeedMarker + N'%'
    )
    INSERT INTO [dbo].[Order_Service_Details]
    (
        [order_service_id], [service_id], [quantity], [unit_price]
    )
    SELECT
        so.[id],
        items.[service_id],
        items.[quantity],
        s.[price]
    FROM SeedOrders so
    CROSS APPLY
    (
        VALUES
        (CASE so.[RN] % 10 WHEN 0 THEN 1 WHEN 1 THEN 2 WHEN 2 THEN 3 WHEN 3 THEN 4 WHEN 4 THEN 5 WHEN 5 THEN 6 WHEN 6 THEN 7 WHEN 7 THEN 8 WHEN 8 THEN 9 ELSE 10 END, 1 + (so.[RN] % 2)),
        (CASE (so.[RN] + 3) % 10 WHEN 0 THEN 1 WHEN 1 THEN 2 WHEN 2 THEN 3 WHEN 3 THEN 4 WHEN 4 THEN 5 WHEN 5 THEN 6 WHEN 6 THEN 7 WHEN 7 THEN 8 WHEN 8 THEN 9 ELSE 10 END, 1),
        (CASE WHEN so.[RN] % 5 = 0 THEN (CASE (so.[RN] + 6) % 10 WHEN 0 THEN 1 WHEN 1 THEN 2 WHEN 2 THEN 3 WHEN 3 THEN 4 WHEN 4 THEN 5 WHEN 5 THEN 6 WHEN 6 THEN 7 WHEN 7 THEN 8 WHEN 8 THEN 9 ELSE 10 END) ELSE NULL END,
         CASE WHEN so.[RN] % 5 = 0 THEN 1 ELSE NULL END)
    ) items(service_id, quantity)
    INNER JOIN [dbo].[Services] s ON s.[id] = items.[service_id]
    WHERE items.[service_id] IS NOT NULL
      AND items.[quantity] IS NOT NULL;

    UPDATE os
    SET os.[total_amount] = calc.[TotalAmount]
    FROM [dbo].[Order_Services] os
    INNER JOIN
    (
        SELECT [order_service_id], SUM([quantity] * [unit_price]) AS TotalAmount
        FROM [dbo].[Order_Service_Details]
        GROUP BY [order_service_id]
    ) calc ON calc.[order_service_id] = os.[id]
    WHERE os.[note] LIKE N'%'+ @SeedMarker + N'%';

    ;WITH EligibleDamageDetails AS
    (
        SELECT
            sbd.[BookingDetailId],
            bd.[room_id],
            sb.[PlanNo],
            sb.[Status],
            ROW_NUMBER() OVER (ORDER BY sb.[PlanNo], sbd.[DetailNo]) AS RN
        FROM #SeedBookingDetails sbd
        INNER JOIN [dbo].[Booking_Details] bd ON bd.[id] = sbd.[BookingDetailId]
        INNER JOIN #SeedBookings sb ON sb.[BookingId] = sbd.[BookingId]
        WHERE sb.[Status] IN (N'Checked_in', N'Checked_out_pending_settlement', N'Completed')
          AND bd.[room_id] IS NOT NULL
    ),
    DamagePlan AS
    (
        SELECT TOP (60)
            ed.[BookingDetailId],
            ed.[room_id],
            ed.[PlanNo],
            ed.[Status],
            ed.[RN],
            ROW_NUMBER() OVER (ORDER BY ed.[PlanNo], ed.[RN]) AS DamageNo
        FROM EligibleDamageDetails ed
        CROSS JOIN (VALUES (1), (2), (3)) extra(N)
        ORDER BY ed.[RN], extra.N
    )
    INSERT INTO [dbo].[Loss_And_Damages]
    (
        [booking_detail_id], [room_inventory_id], [reported_by], [quantity], [penalty_amount], [description],
        [img_url], [status], [is_stock_synced], [replenished_quantity], [replenished_at], [replenishment_note], [created_at]
    )
    SELECT
        dp.[BookingDetailId],
        ri_pick.[id],
        @HousekeepingUserId,
        CASE WHEN dp.[DamageNo] % 7 = 0 THEN 2 ELSE 1 END,
        ri_pick.[price_if_lost],
        N'Biên bản loss/damage demo #' + CAST(dp.[DamageNo] AS NVARCHAR(10)) + N' - ' + @SeedMarker,
        NULL,
        CASE
            WHEN dp.[DamageNo] <= 20 THEN N'Pending'
            WHEN dp.[DamageNo] <= 45 THEN N'Confirmed'
            ELSE N'Waived'
        END,
        CASE WHEN dp.[DamageNo] <= 45 THEN 1 ELSE 0 END,
        CASE
            WHEN dp.[DamageNo] BETWEEN 21 AND 30 THEN 0
            WHEN dp.[DamageNo] BETWEEN 31 AND 38 THEN 1
            WHEN dp.[DamageNo] BETWEEN 39 AND 45 THEN CASE WHEN dp.[DamageNo] % 7 = 0 THEN 2 ELSE 1 END
            ELSE 0
        END,
        CASE
            WHEN dp.[DamageNo] BETWEEN 31 AND 45 THEN DATEADD(DAY, -1, @Now)
            ELSE NULL
        END,
        CASE
            WHEN dp.[DamageNo] BETWEEN 31 AND 38 THEN N'Bổ sung một phần vật tư demo'
            WHEN dp.[DamageNo] BETWEEN 39 AND 45 THEN N'Bổ sung đầy đủ vật tư demo'
            ELSE NULL
        END,
        DATEADD(HOUR, dp.[DamageNo] % 12, DATEADD(DAY, -8 + (dp.[DamageNo] % 7), @Now))
    FROM DamagePlan dp
    CROSS APPLY
    (
        SELECT TOP 1 ri.[id], ri.[price_if_lost]
        FROM [dbo].[Room_Inventory] ri
        WHERE ri.[room_id] = dp.[room_id]
          AND ri.[note] LIKE N'%' + @SeedMarker + N'%'
        ORDER BY CASE WHEN ri.[item_type] = 'Minibar' THEN 1 ELSE 0 END, ri.[id] + dp.[DamageNo]
    ) ri_pick;

    CREATE TABLE #InvoicePlans
    (
        BookingId INT NOT NULL PRIMARY KEY,
        TargetStatus NVARCHAR(50) NOT NULL,
        SortKey INT NOT NULL
    );

    INSERT INTO #InvoicePlans (BookingId, TargetStatus, SortKey)
    SELECT TOP (6)
        sb.[BookingId],
        CASE WHEN ROW_NUMBER() OVER (ORDER BY sb.[PlanNo]) <= 4 THEN N'Draft' ELSE N'Unpaid' END,
        sb.[PlanNo]
    FROM #SeedBookings sb
    WHERE sb.[Status] = N'Checked_in'
    ORDER BY sb.[PlanNo];

    INSERT INTO #InvoicePlans (BookingId, TargetStatus, SortKey)
    SELECT TOP (6)
        sb.[BookingId],
        N'Draft',
        sb.[PlanNo]
    FROM #SeedBookings sb
    WHERE sb.[Status] = N'Confirmed'
    ORDER BY sb.[PlanNo];

    INSERT INTO #InvoicePlans (BookingId, TargetStatus, SortKey)
    SELECT
        sb.[BookingId],
        CASE WHEN ROW_NUMBER() OVER (ORDER BY sb.[PlanNo]) <= 6 THEN N'Ready_To_Collect' ELSE N'Partially_Paid' END,
        sb.[PlanNo]
    FROM #SeedBookings sb
    WHERE sb.[Status] = N'Checked_out_pending_settlement';

    INSERT INTO #InvoicePlans (BookingId, TargetStatus, SortKey)
    SELECT
        sb.[BookingId],
        N'Paid',
        sb.[PlanNo]
    FROM #SeedBookings sb
    WHERE sb.[Status] = N'Completed';

    CREATE TABLE #SeedInvoices
    (
        InvoiceId INT NOT NULL PRIMARY KEY,
        BookingId INT NOT NULL,
        TargetStatus NVARCHAR(50) NOT NULL,
        SortKey INT NOT NULL
    );

    INSERT INTO [dbo].[Invoices]
    (
        [booking_id], [total_room_amount], [total_service_amount], [total_damage_amount],
        [discount_amount], [tax_amount], [final_total], [status], [created_at]
    )
    SELECT
        src.[BookingId],
        0,
        0,
        0,
        0,
        0,
        0,
        src.[TargetStatus],
        DATEADD(DAY, -4, @Now)
    FROM #InvoicePlans src;

    INSERT INTO #SeedInvoices (InvoiceId, BookingId, TargetStatus, SortKey)
    SELECT
        i.[id],
        ip.[BookingId],
        ip.[TargetStatus],
        ip.[SortKey]
    FROM #InvoicePlans ip
    INNER JOIN [dbo].[Invoices] i
        ON i.[booking_id] = ip.[BookingId];

    ;WITH InvBase AS
    (
        SELECT
            si.[InvoiceId],
            si.[BookingId],
            room.RoomAmount,
            ISNULL(serv.ServiceAmount, 0) AS ServiceAmount,
            ISNULL(dmg.DamageAmount, 0) AS DamageAmount,
            (room.RoomAmount - b.[total_estimated_amount]) AS BookingDiscount
        FROM #SeedInvoices si
        INNER JOIN [dbo].[Bookings] b ON b.[id] = si.[BookingId]
        CROSS APPLY
        (
            SELECT SUM(
                (CASE
                    WHEN DATEDIFF(DAY, bd.[check_in_date], bd.[check_out_date]) <= 0 THEN 1
                    ELSE DATEDIFF(DAY, bd.[check_in_date], bd.[check_out_date])
                 END) * bd.[price_per_night]
            ) AS RoomAmount
            FROM [dbo].[Booking_Details] bd
            WHERE bd.[booking_id] = si.[BookingId]
        ) room
        OUTER APPLY
        (
            SELECT SUM(os.[total_amount]) AS ServiceAmount
            FROM [dbo].[Order_Services] os
            INNER JOIN [dbo].[Booking_Details] bd ON bd.[id] = os.[booking_detail_id]
            WHERE bd.[booking_id] = si.[BookingId]
              AND os.[is_active] = 1
              AND os.[status] <> N'Cancelled'
        ) serv
        OUTER APPLY
        (
            SELECT SUM(lad.[penalty_amount] * lad.[quantity]) AS DamageAmount
            FROM [dbo].[Loss_And_Damages] lad
            INNER JOIN [dbo].[Booking_Details] bd ON bd.[id] = lad.[booking_detail_id]
            WHERE bd.[booking_id] = si.[BookingId]
              AND lad.[status] <> N'Waived'
        ) dmg
    )
    UPDATE i
    SET
        i.[total_room_amount] = ib.[RoomAmount],
        i.[total_service_amount] = ib.[ServiceAmount],
        i.[total_damage_amount] = ib.[DamageAmount],
        i.[discount_amount] = CASE WHEN ib.[BookingDiscount] < 0 THEN 0 ELSE ib.[BookingDiscount] END
    FROM [dbo].[Invoices] i
    INNER JOIN InvBase ib ON ib.[InvoiceId] = i.[id];

    INSERT INTO [dbo].[Invoice_Adjustments]
    (
        [invoice_id], [adjustment_type], [amount], [reason], [note], [created_at]
    )
    SELECT
        si.[InvoiceId],
        CASE WHEN si.[SortKey] % 3 = 0 THEN N'Discount' ELSE N'Surcharge' END,
        CASE WHEN si.[SortKey] % 3 = 0 THEN CAST(80000.00 + (si.[SortKey] % 4) * 20000.00 AS DECIMAL(18, 2))
             ELSE CAST(120000.00 + (si.[SortKey] % 5) * 30000.00 AS DECIMAL(18, 2)) END,
        CASE WHEN si.[SortKey] % 3 = 0 THEN N'Điều chỉnh ưu đãi thủ công - ' + @SeedMarker
             ELSE N'Phụ thu phát sinh demo - ' + @SeedMarker END,
        N'Invoice adjustment demo',
        DATEADD(HOUR, si.[SortKey] % 6, DATEADD(DAY, -2, @Now))
    FROM #SeedInvoices si
    WHERE si.[SortKey] % 2 = 0;

    UPDATE i
    SET i.[final_total] =
        CASE
            WHEN base.[SubTotal] + base.[SurchargeAmount] - base.[ManualDiscountAmount] < 0 THEN 0
            ELSE base.[SubTotal] + base.[SurchargeAmount] - base.[ManualDiscountAmount]
        END
    FROM [dbo].[Invoices] i
    INNER JOIN
    (
        SELECT
            si.[InvoiceId],
            ISNULL(i.[total_room_amount], 0)
            + ISNULL(i.[total_service_amount], 0)
            + ISNULL(i.[total_damage_amount], 0)
            - ISNULL(i.[discount_amount], 0) AS SubTotal,
            ISNULL(SUM(CASE WHEN ia.[adjustment_type] = N'Surcharge' THEN ia.[amount] ELSE 0 END), 0) AS SurchargeAmount,
            ISNULL(SUM(CASE WHEN ia.[adjustment_type] = N'Discount' THEN ia.[amount] ELSE 0 END), 0) AS ManualDiscountAmount
        FROM #SeedInvoices si
        INNER JOIN [dbo].[Invoices] i ON i.[id] = si.[InvoiceId]
        LEFT JOIN [dbo].[Invoice_Adjustments] ia ON ia.[invoice_id] = i.[id]
        GROUP BY si.[InvoiceId], i.[total_room_amount], i.[total_service_amount], i.[total_damage_amount], i.[discount_amount]
    ) base ON base.[InvoiceId] = i.[id];

    INSERT INTO [dbo].[Payments]
    (
        [booking_id], [invoice_id], [payment_type], [payment_method], [amount_paid], [transaction_code], [status], [payment_date], [note]
    )
    SELECT
        b.[id],
        NULL,
        N'Booking_Deposit',
        CASE WHEN sb.[PlanNo] % 3 = 0 THEN N'Cash' ELSE N'VNPay' END,
        b.[deposit_amount],
        N'DEP-' + RIGHT(N'000' + CAST(sb.[PlanNo] AS NVARCHAR(10)), 3),
        N'Success',
        DATEADD(HOUR, 9, DATEADD(DAY, -1, MIN_BD.[MinCheckIn])),
        N'Booking deposit demo - ' + @SeedMarker
    FROM [dbo].[Bookings] b
    INNER JOIN #SeedBookings sb ON sb.[BookingId] = b.[id]
    CROSS APPLY
    (
        SELECT MIN([check_in_date]) AS MinCheckIn
        FROM [dbo].[Booking_Details]
        WHERE [booking_id] = b.[id]
    ) MIN_BD
    WHERE b.[deposit_amount] > 0;

    INSERT INTO [dbo].[Payments]
    (
        [booking_id], [invoice_id], [payment_type], [payment_method], [amount_paid], [transaction_code], [status], [payment_date], [note]
    )
    SELECT
        b.[id],
        NULL,
        N'Refund',
        N'Bank Transfer',
        b.[refund_amount],
        N'RF-' + RIGHT(N'000' + CAST(sb.[PlanNo] AS NVARCHAR(10)), 3),
        N'Success',
        DATEADD(HOUR, 16, ISNULL(b.[cancelled_at], @Now)),
        N'Booking refund demo - ' + @SeedMarker
    FROM [dbo].[Bookings] b
    INNER JOIN #SeedBookings sb ON sb.[BookingId] = b.[id]
    WHERE b.[status] = N'Cancelled'
      AND ISNULL(b.[refund_amount], 0) > 0;

    INSERT INTO [dbo].[Payments]
    (
        [booking_id], [invoice_id], [payment_type], [payment_method], [amount_paid], [transaction_code], [status], [payment_date], [note]
    )
    SELECT
        b.[id],
        NULL,
        N'Booking_Deposit',
        N'VNPay',
        b.[required_booking_deposit_amount],
        N'DEP-PENDING-' + RIGHT(N'000' + CAST(sb.[PlanNo] AS NVARCHAR(10)), 3),
        CASE WHEN sb.[PlanNo] % 2 = 0 THEN N'Pending' ELSE N'Failed' END,
        DATEADD(HOUR, 10, @Now),
        N'Attempted deposit demo - ' + @SeedMarker
    FROM [dbo].[Bookings] b
    INNER JOIN #SeedBookings sb ON sb.[BookingId] = b.[id]
    WHERE sb.[Status] IN (N'Pending', N'Confirmed')
      AND sb.[PlanNo] % 6 = 0;

    INSERT INTO [dbo].[Payments]
    (
        [booking_id], [invoice_id], [payment_type], [payment_method], [amount_paid], [transaction_code], [status], [payment_date], [note]
    )
    SELECT
        NULL,
        si.[InvoiceId],
        CASE
            WHEN si.[TargetStatus] = N'Paid' AND si.[SortKey] % 3 = 0 THEN N'CheckIn_Collection'
            ELSE N'Final_Settlement'
        END,
        CASE WHEN si.[SortKey] % 4 = 0 THEN N'Cash' ELSE N'Bank Transfer' END,
        CASE
            WHEN si.[TargetStatus] = N'Paid'
                THEN CASE
                    WHEN i.[final_total] - b.[deposit_amount] < 0 THEN 0
                    ELSE i.[final_total] - b.[deposit_amount]
                END
            WHEN si.[TargetStatus] = N'Partially_Paid'
                THEN ROUND((i.[final_total] - b.[deposit_amount]) * 0.55, 2)
            WHEN si.[TargetStatus] = N'Unpaid'
                THEN 0
            ELSE 0
        END,
        N'INV-' + RIGHT(N'000' + CAST(si.[SortKey] AS NVARCHAR(10)), 3),
        N'Success',
        DATEADD(HOUR, 13 + (si.[SortKey] % 5), DATEADD(DAY, -1, @Now)),
        N'Invoice payment demo - ' + @SeedMarker
    FROM #SeedInvoices si
    INNER JOIN [dbo].[Invoices] i ON i.[id] = si.[InvoiceId]
    INNER JOIN [dbo].[Bookings] b ON b.[id] = si.[BookingId]
    WHERE si.[TargetStatus] IN (N'Paid', N'Partially_Paid')
      AND CASE
            WHEN si.[TargetStatus] = N'Paid'
                THEN CASE WHEN i.[final_total] - b.[deposit_amount] < 0 THEN 0 ELSE i.[final_total] - b.[deposit_amount] END
            WHEN si.[TargetStatus] = N'Partially_Paid'
                THEN ROUND((i.[final_total] - b.[deposit_amount]) * 0.55, 2)
            ELSE 0
          END > 0;

    INSERT INTO [dbo].[Payments]
    (
        [booking_id], [invoice_id], [payment_type], [payment_method], [amount_paid], [transaction_code], [status], [payment_date], [note]
    )
    SELECT
        NULL,
        si.[InvoiceId],
        N'Final_Settlement',
        N'Credit Card',
        ROUND((i.[final_total] - b.[deposit_amount]) * 0.30, 2),
        N'INV-PENDING-' + RIGHT(N'000' + CAST(si.[SortKey] AS NVARCHAR(10)), 3),
        CASE WHEN si.[SortKey] % 2 = 0 THEN N'Pending' ELSE N'Failed' END,
        DATEADD(HOUR, 15, @Now),
        N'Invoice payment attempt demo - ' + @SeedMarker
    FROM #SeedInvoices si
    INNER JOIN [dbo].[Invoices] i ON i.[id] = si.[InvoiceId]
    INNER JOIN [dbo].[Bookings] b ON b.[id] = si.[BookingId]
    WHERE si.[TargetStatus] IN (N'Draft', N'Unpaid', N'Ready_To_Collect')
      AND i.[final_total] > b.[deposit_amount]
      AND si.[SortKey] % 3 = 0;

    UPDATE i
    SET i.[status] = si.[TargetStatus]
    FROM [dbo].[Invoices] i
    INNER JOIN #SeedInvoices si ON si.[InvoiceId] = i.[id];

    INSERT INTO [dbo].[Voucher_Usage]
    (
        [voucher_id], [user_id], [booking_id], [used_at]
    )
    SELECT
        b.[voucher_id],
        b.[user_id],
        b.[id],
        DATEADD(HOUR, 9, DATEADD(DAY, -2, MIN_BD.[MinCheckIn]))
    FROM [dbo].[Bookings] b
    CROSS APPLY
    (
        SELECT MIN([check_in_date]) AS MinCheckIn
        FROM [dbo].[Booking_Details]
        WHERE [booking_id] = b.[id]
    ) MIN_BD
    WHERE b.[booking_code] LIKE @BookingPrefix + N'%'
      AND b.[voucher_id] IS NOT NULL
      AND b.[user_id] IS NOT NULL;

    UPDATE v
    SET v.[used_count] = usage.[UsedCount]
    FROM [dbo].[Vouchers] v
    INNER JOIN
    (
        SELECT [voucher_id], COUNT(*) AS UsedCount
        FROM [dbo].[Voucher_Usage]
        GROUP BY [voucher_id]
    ) usage ON usage.[voucher_id] = v.[id]
    WHERE v.[code] LIKE @VoucherPrefix + N'%';

    CREATE TABLE #LoyaltySeeds
    (
        UserId INT NOT NULL PRIMARY KEY,
        InitialTotal INT NOT NULL,
        InitialUsable INT NOT NULL
    );

    INSERT INTO #LoyaltySeeds (UserId, InitialTotal, InitialUsable)
    SELECT [UserId], [InitialLoyaltyPoints], [InitialLoyaltyUsable]
    FROM #DemoUsers;

    ;WITH RedeemEvents AS
    (
        SELECT
            b.[user_id] AS UserId,
            b.[id] AS BookingId,
            DATEADD(MINUTE, -30, MIN_BD.[MinCheckIn]) AS EventDate,
            N'redeemed' AS TransactionType,
            -b.[loyalty_points_redeemed] AS Points,
            N'Đổi ' + CAST(b.[loyalty_points_redeemed] AS NVARCHAR(20)) + N' điểm cho booking ' + b.[booking_code] + N' - ' + @SeedMarker AS Note,
            1 AS SortOrder
        FROM [dbo].[Bookings] b
        CROSS APPLY
        (
            SELECT MIN([check_in_date]) AS MinCheckIn
            FROM [dbo].[Booking_Details]
            WHERE [booking_id] = b.[id]
        ) MIN_BD
        WHERE b.[booking_code] LIKE @BookingPrefix + N'%'
          AND b.[user_id] IS NOT NULL
          AND b.[loyalty_points_redeemed] > 0
    ),
    EarnedEvents AS
    (
        SELECT
            b.[user_id] AS UserId,
            b.[id] AS BookingId,
            DATEADD(MINUTE, 45, ISNULL(b.[check_out_time], @Now)) AS EventDate,
            N'earned' AS TransactionType,
            FLOOR(
                (
                    ISNULL(i.[total_room_amount], 0)
                    + ISNULL(i.[total_service_amount], 0)
                    - ISNULL(i.[discount_amount], 0)
                    - ISNULL(adj.[ManualDiscountAmount], 0)
                ) / 10000.0
            ) AS Points,
            N'Cộng điểm từ booking ' + b.[booking_code] + N' - ' + @SeedMarker AS Note,
            2 AS SortOrder
        FROM [dbo].[Bookings] b
        INNER JOIN #SeedInvoices si ON si.[BookingId] = b.[id] AND si.[TargetStatus] = N'Paid'
        INNER JOIN [dbo].[Invoices] i ON i.[id] = si.[InvoiceId]
        OUTER APPLY
        (
            SELECT SUM(CASE WHEN [adjustment_type] = N'Discount' THEN [amount] ELSE 0 END) AS ManualDiscountAmount
            FROM [dbo].[Invoice_Adjustments]
            WHERE [invoice_id] = i.[id]
        ) adj
        WHERE b.[booking_code] LIKE @BookingPrefix + N'%'
          AND b.[user_id] IS NOT NULL
    ),
    LoyaltyEvents AS
    (
        SELECT * FROM RedeemEvents
        UNION ALL
        SELECT * FROM EarnedEvents WHERE [Points] > 0
    ),
    Running AS
    (
        SELECT
            le.[UserId],
            le.[BookingId],
            le.[EventDate],
            le.[TransactionType],
            le.[Points],
            le.[Note],
            ls.[InitialUsable]
                + SUM(le.[Points]) OVER (
                    PARTITION BY le.[UserId]
                    ORDER BY le.[EventDate], le.[SortOrder], le.[BookingId]
                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                ) AS BalanceAfter
        FROM LoyaltyEvents le
        INNER JOIN #LoyaltySeeds ls ON ls.[UserId] = le.[UserId]
    )
    INSERT INTO [dbo].[Loyalty_Transactions]
    (
        [user_id], [booking_id], [transaction_type], [points], [balance_after], [note], [created_at]
    )
    SELECT
        [UserId], [BookingId], [TransactionType], [Points], [BalanceAfter], [Note], [EventDate]
    FROM Running;

    ;WITH LoyaltyTotals AS
    (
        SELECT
            ls.[UserId],
            ls.[InitialTotal] + ISNULL(SUM(CASE WHEN lt.[points] > 0 THEN lt.[points] ELSE 0 END), 0) AS FinalTotalPoints,
            ls.[InitialUsable] + ISNULL(SUM(lt.[points]), 0) AS FinalUsablePoints
        FROM #LoyaltySeeds ls
        LEFT JOIN [dbo].[Loyalty_Transactions] lt ON lt.[user_id] = ls.[UserId]
        GROUP BY ls.[UserId], ls.[InitialTotal], ls.[InitialUsable]
    ),
    MembershipChoice AS
    (
        SELECT
            lt.[UserId],
            lt.[FinalTotalPoints],
            lt.[FinalUsablePoints],
            (
                SELECT TOP 1 m.[id]
                FROM [dbo].[Memberships] m
                WHERE m.[is_active] = 1
                  AND ISNULL(m.[min_points], 0) <= lt.[FinalTotalPoints]
                  AND (m.[max_points] IS NULL OR lt.[FinalTotalPoints] <= m.[max_points])
                ORDER BY ISNULL(m.[min_points], 0) DESC, m.[id] DESC
            ) AS TargetMembershipId
        FROM LoyaltyTotals lt
    )
    UPDATE u
    SET
        u.[loyalty_points] = mc.[FinalTotalPoints],
        u.[loyalty_points_usable] = CASE WHEN mc.[FinalUsablePoints] < 0 THEN 0 ELSE mc.[FinalUsablePoints] END,
        u.[membership_id] = mc.[TargetMembershipId],
        u.[updated_at] = @Now
    FROM [dbo].[Users] u
    INNER JOIN MembershipChoice mc ON mc.[UserId] = u.[id];

    SELECT
        COUNT(*) AS SeededBookings,
        SUM(CASE WHEN [status] = N'Pending' THEN 1 ELSE 0 END) AS PendingBookings,
        SUM(CASE WHEN [status] = N'Confirmed' THEN 1 ELSE 0 END) AS ConfirmedBookings,
        SUM(CASE WHEN [status] = N'Checked_in' THEN 1 ELSE 0 END) AS CheckedInBookings,
        SUM(CASE WHEN [status] = N'Checked_out_pending_settlement' THEN 1 ELSE 0 END) AS CheckedOutPendingBookings,
        SUM(CASE WHEN [status] = N'Completed' THEN 1 ELSE 0 END) AS CompletedBookings,
        SUM(CASE WHEN [status] = N'Cancelled' THEN 1 ELSE 0 END) AS CancelledBookings
    FROM [dbo].[Bookings]
    WHERE [booking_code] LIKE @BookingPrefix + N'%';

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
