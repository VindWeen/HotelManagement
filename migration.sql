USE [HotelManagementDB];
GO

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
