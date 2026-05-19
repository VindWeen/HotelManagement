SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @ReviewSeedMarker NVARCHAR(100) = N'review-seed-20260519';
    DECLARE @BookingPrefix NVARCHAR(50) = N'DM-202605-';

    IF OBJECT_ID(N'tempdb..#ReviewCandidates') IS NOT NULL DROP TABLE #ReviewCandidates;
    IF OBJECT_ID(N'tempdb..#ReviewSeedRows') IS NOT NULL DROP TABLE #ReviewSeedRows;

    DELETE FROM [dbo].[Reviews]
    WHERE [image_url] LIKE N'https://picsum.photos/seed/' + @ReviewSeedMarker + N'-%';

    ;WITH CompletedBookings AS
    (
        SELECT
            b.[id] AS BookingId,
            b.[user_id] AS UserId,
            b.[booking_code] AS BookingCode,
            b.[check_out_time] AS CheckOutTime,
            first_detail.[room_type_id] AS RoomTypeId,
            first_detail.[RoomTypeName],
            ROW_NUMBER() OVER
            (
                ORDER BY
                    CASE WHEN b.[booking_code] LIKE @BookingPrefix + N'%' THEN 0 ELSE 1 END,
                    ISNULL(b.[check_out_time], GETDATE()) DESC,
                    b.[id] DESC
            ) AS RN
        FROM [dbo].[Bookings] b
        CROSS APPLY
        (
            SELECT TOP 1
                bd.[room_type_id],
                rt.[name] AS RoomTypeName
            FROM [dbo].[Booking_Details] bd
            LEFT JOIN [dbo].[Room_Types] rt ON rt.[id] = bd.[room_type_id]
            WHERE bd.[booking_id] = b.[id]
            ORDER BY bd.[id]
        ) first_detail
        WHERE b.[status] = N'Completed'
          AND b.[user_id] IS NOT NULL
          AND first_detail.[room_type_id] IS NOT NULL
          AND NOT EXISTS
          (
              SELECT 1
              FROM [dbo].[Reviews] r
              WHERE r.[booking_id] = b.[id]
                AND r.[user_id] = b.[user_id]
          )
    )
    SELECT TOP (30)
        cb.[BookingId],
        cb.[UserId],
        cb.[BookingCode],
        cb.[CheckOutTime],
        cb.[RoomTypeId],
        cb.[RoomTypeName],
        ROW_NUMBER() OVER (ORDER BY cb.[RN]) AS SeedNo
    INTO #ReviewCandidates
    FROM CompletedBookings cb
    ORDER BY cb.[RN];

    CREATE TABLE #ReviewSeedRows
    (
        SeedNo INT NOT NULL PRIMARY KEY,
        Rating INT NOT NULL,
        Comment NVARCHAR(MAX) NOT NULL,
        IsApproved BIT NOT NULL,
        RejectionReason NVARCHAR(500) NULL
    );

    INSERT INTO #ReviewSeedRows (SeedNo, Rating, Comment, IsApproved, RejectionReason)
    VALUES
    (1, 5, N'Phòng sạch sẽ, nhân viên hỗ trợ nhanh và thủ tục check-in rất mượt.', 1, NULL),
    (2, 5, N'Không gian đẹp, ngủ rất yên tĩnh, buffet sáng ổn hơn mong đợi.', 1, NULL),
    (3, 4, N'Vị trí thuận tiện, phòng đúng mô tả, chỉ mong minibar đa dạng hơn chút.', 1, NULL),
    (4, 5, N'Trải nghiệm tổng thể rất tốt, đặc biệt là đội lễ tân và buồng phòng.', 1, NULL),
    (5, 4, N'Phòng rộng và thoáng, check-out nhanh, phù hợp cho chuyến công tác.', 1, NULL),
    (6, 5, N'Gia đình mình ở khá thoải mái, dịch vụ ổn và khu vực chung sạch đẹp.', 1, NULL),
    (7, 4, N'Hạng phòng này đáng tiền, giường êm và cách âm tương đối tốt.', 1, NULL),
    (8, 5, N'Mình thích cách phục vụ chuyên nghiệp, yêu cầu hỗ trợ được xử lý nhanh.', 1, NULL),
    (9, 4, N'View đẹp, nội thất ổn, trải nghiệm nhìn chung hài lòng.', 1, NULL),
    (10, 5, N'Ở ngắn ngày nhưng rất ưng ý, sẽ cân nhắc quay lại lần sau.', 1, NULL),
    (11, 4, N'Phòng gọn gàng, sạch, tiện nghi đủ dùng và thái độ phục vụ tốt.', 1, NULL),
    (12, 5, N'Dịch vụ tốt, khu vực phòng yên tĩnh, phù hợp nghỉ dưỡng cuối tuần.', 1, NULL),
    (13, 4, N'Khá hài lòng với chất lượng lưu trú, thủ tục nhận phòng nhanh.', 1, NULL),
    (14, 5, N'Tổng thể rất ổn, đội ngũ hỗ trợ thân thiện và chuyên nghiệp.', 1, NULL),
    (15, 5, N'Chuyến đi rất vui, mình muốn chia sẻ trải nghiệm tích cực này với mọi người.', 0, NULL),
    (16, 4, N'Phòng đẹp và sạch, mình đã chụp vài ảnh lúc lưu trú để lưu niệm.', 0, NULL),
    (17, 5, N'Dịch vụ tốt, ăn sáng ngon, nhân viên dễ thương và hỗ trợ nhiệt tình.', 0, NULL),
    (18, 4, N'Trải nghiệm ổn định, không có điểm gì quá lớn để phàn nàn.', 0, NULL),
    (19, 5, N'Đợt ở này khá hài lòng, đặc biệt là cảm giác riêng tư và yên tĩnh.', 0, NULL),
    (20, 4, N'Phù hợp nghỉ gia đình, khu vực phòng và hành lang được giữ vệ sinh tốt.', 0, NULL),
    (21, 5, N'Mình đánh giá cao tốc độ hỗ trợ khi cần thêm vật dụng trong phòng.', 0, NULL),
    (22, 4, N'Nhìn chung ổn, trải nghiệm mượt từ đặt phòng đến lúc trả phòng.', 0, NULL),
    (23, 5, N'Chất lượng phòng tốt, nhân viên thân thiện, sẽ giới thiệu cho bạn bè.', 0, NULL),
    (24, 4, N'Trải nghiệm tốt, không gian đẹp, mong có dịp quay lại sớm.', 0, NULL),
    (25, 2, N'Phòng tạm ổn nhưng nội dung review này cần điều chỉnh thêm trước khi hiển thị công khai.', 0, N'Nội dung chưa phù hợp để hiển thị công khai, vui lòng diễn đạt khách quan hơn.'),
    (26, 3, N'Mình có góp ý hơi cảm tính về nhân viên nên review này cần bổ sung lại ngữ cảnh.', 0, N'Nội dung phản hồi còn thiếu ngữ cảnh và có thể gây hiểu nhầm.'),
    (27, 2, N'Trải nghiệm chưa tốt như kỳ vọng nhưng phần mô tả hiện tại chưa đủ cụ thể.', 0, N'Nội dung quá ngắn và chưa nêu rõ tình huống cần phản ánh.'),
    (28, 1, N'Mình không hài lòng và đã viết lại theo cảm xúc nhiều hơn là mô tả trải nghiệm.', 0, N'Nội dung có ngôn từ chưa phù hợp với quy định duyệt review.'),
    (29, 3, N'Có vài điểm chưa ưng ý nhưng review này cần viết rõ ràng hơn để hệ thống duyệt.', 0, N'Nội dung chưa đủ rõ và chưa hỗ trợ tốt cho người đọc khác.'),
    (30, 2, N'Một số nhận xét mang tính suy đoán nên hiện chưa phù hợp để công khai.', 0, N'Review chứa nhận định chưa kiểm chứng, cần chỉnh sửa trước khi duyệt.');

    INSERT INTO [dbo].[Reviews]
    (
        [user_id], [room_type_id], [booking_id], [rating], [comment], [image_url],
        [is_approved], [rejection_reason], [created_at]
    )
    SELECT
        rc.[UserId],
        rc.[RoomTypeId],
        rc.[BookingId],
        rs.[Rating],
        rs.[Comment],
        N'https://picsum.photos/seed/' + @ReviewSeedMarker + N'-' + RIGHT(N'00' + CAST(rc.[SeedNo] AS NVARCHAR(10)), 2) + N'/800/600',
        rs.[IsApproved],
        rs.[RejectionReason],
        DATEADD(HOUR, 9 + (rc.[SeedNo] % 9), DATEADD(DAY, 1 + (rc.[SeedNo] % 4), ISNULL(rc.[CheckOutTime], GETDATE())))
    FROM #ReviewCandidates rc
    INNER JOIN #ReviewSeedRows rs ON rs.[SeedNo] = rc.[SeedNo];

    SELECT
        COUNT(*) AS SeededReviews,
        SUM(CASE WHEN [is_approved] = 1 THEN 1 ELSE 0 END) AS ApprovedReviews,
        SUM(CASE WHEN [is_approved] = 0 AND [rejection_reason] IS NULL THEN 1 ELSE 0 END) AS PendingReviews,
        SUM(CASE WHEN [is_approved] = 0 AND [rejection_reason] IS NOT NULL THEN 1 ELSE 0 END) AS RejectedReviews
    FROM [dbo].[Reviews]
    WHERE [image_url] LIKE N'https://picsum.photos/seed/' + @ReviewSeedMarker + N'-%';

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
