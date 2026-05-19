SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.System_Settings', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[System_Settings](
        [id] [int] IDENTITY(1,1) NOT NULL,
        [booking_deposit_percent] [decimal](5, 2) NOT NULL CONSTRAINT [DF_System_Settings_BookingDepositPercent] DEFAULT (30),
        [check_in_required_percent] [decimal](5, 2) NOT NULL CONSTRAINT [DF_System_Settings_CheckInRequiredPercent] DEFAULT (50),
        [hotel_address] [nvarchar](500) NULL,
        [hotel_latitude] [decimal](9, 6) NULL,
        [hotel_longitude] [decimal](9, 6) NULL,
        [created_at] [datetime] NOT NULL CONSTRAINT [DF_System_Settings_CreatedAt] DEFAULT (GETUTCDATE()),
        [updated_at] [datetime] NULL,
        [updated_by] [int] NULL,
        CONSTRAINT [PK_System_Settings] PRIMARY KEY CLUSTERED ([id] ASC)
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_System_Settings_Users_UpdatedBy')
BEGIN
    ALTER TABLE [dbo].[System_Settings] WITH CHECK
    ADD CONSTRAINT [FK_System_Settings_Users_UpdatedBy]
    FOREIGN KEY([updated_by]) REFERENCES [dbo].[Users]([id]);
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[System_Settings])
BEGIN
    INSERT INTO [dbo].[System_Settings]
        ([booking_deposit_percent], [check_in_required_percent], [hotel_address], [hotel_latitude], [hotel_longitude], [created_at])
    VALUES
        (30, 50, N'', 10.953402, 106.802169, GETUTCDATE());
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[Permissions] WHERE [permission_code] = N'MANAGE_SYSTEM_SETTINGS')
    INSERT INTO [dbo].[Permissions] ([name], [permission_code]) VALUES (N'MANAGE_SYSTEM_SETTINGS', N'MANAGE_SYSTEM_SETTINGS');

IF NOT EXISTS (SELECT 1 FROM [dbo].[Permissions] WHERE [permission_code] = N'MANAGE_VOUCHERS')
    INSERT INTO [dbo].[Permissions] ([name], [permission_code]) VALUES (N'MANAGE_VOUCHERS', N'MANAGE_VOUCHERS');

IF NOT EXISTS (SELECT 1 FROM [dbo].[Permissions] WHERE [permission_code] = N'CHANGE_USER_ROLE')
    INSERT INTO [dbo].[Permissions] ([name], [permission_code]) VALUES (N'CHANGE_USER_ROLE', N'CHANGE_USER_ROLE');

IF NOT EXISTS (SELECT 1 FROM [dbo].[Permissions] WHERE [permission_code] = N'EDIT_ROLE_PERMISSIONS')
    INSERT INTO [dbo].[Permissions] ([name], [permission_code]) VALUES (N'EDIT_ROLE_PERMISSIONS', N'EDIT_ROLE_PERMISSIONS');

IF NOT EXISTS (SELECT 1 FROM [dbo].[Permissions] WHERE [permission_code] = N'VIEW_SYSTEM_SETTINGS')
    INSERT INTO [dbo].[Permissions] ([name], [permission_code]) VALUES (N'VIEW_SYSTEM_SETTINGS', N'VIEW_SYSTEM_SETTINGS');

DECLARE @AdminRoleId int = (SELECT TOP 1 [id] FROM [dbo].[Roles] WHERE [name] = N'Admin');
DECLARE @ManagerRoleId int = (SELECT TOP 1 [id] FROM [dbo].[Roles] WHERE [name] = N'Manager');

DECLARE @ManageSystemSettingsId int = (SELECT TOP 1 [id] FROM [dbo].[Permissions] WHERE [permission_code] = N'MANAGE_SYSTEM_SETTINGS');
DECLARE @ManageVouchersId int = (SELECT TOP 1 [id] FROM [dbo].[Permissions] WHERE [permission_code] = N'MANAGE_VOUCHERS');
DECLARE @ChangeUserRoleId int = (SELECT TOP 1 [id] FROM [dbo].[Permissions] WHERE [permission_code] = N'CHANGE_USER_ROLE');
DECLARE @EditRolePermissionsId int = (SELECT TOP 1 [id] FROM [dbo].[Permissions] WHERE [permission_code] = N'EDIT_ROLE_PERMISSIONS');
DECLARE @ViewSystemSettingsId int = (SELECT TOP 1 [id] FROM [dbo].[Permissions] WHERE [permission_code] = N'VIEW_SYSTEM_SETTINGS');

IF @AdminRoleId IS NOT NULL AND @ManageSystemSettingsId IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM [dbo].[Role_Permissions] WHERE [role_id] = @AdminRoleId AND [permission_id] = @ManageSystemSettingsId)
    INSERT INTO [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (@AdminRoleId, @ManageSystemSettingsId);

IF @AdminRoleId IS NOT NULL AND @ManageVouchersId IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM [dbo].[Role_Permissions] WHERE [role_id] = @AdminRoleId AND [permission_id] = @ManageVouchersId)
    INSERT INTO [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (@AdminRoleId, @ManageVouchersId);

IF @AdminRoleId IS NOT NULL AND @ChangeUserRoleId IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM [dbo].[Role_Permissions] WHERE [role_id] = @AdminRoleId AND [permission_id] = @ChangeUserRoleId)
    INSERT INTO [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (@AdminRoleId, @ChangeUserRoleId);

IF @AdminRoleId IS NOT NULL AND @EditRolePermissionsId IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM [dbo].[Role_Permissions] WHERE [role_id] = @AdminRoleId AND [permission_id] = @EditRolePermissionsId)
    INSERT INTO [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (@AdminRoleId, @EditRolePermissionsId);

IF @AdminRoleId IS NOT NULL AND @ViewSystemSettingsId IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM [dbo].[Role_Permissions] WHERE [role_id] = @AdminRoleId AND [permission_id] = @ViewSystemSettingsId)
    INSERT INTO [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (@AdminRoleId, @ViewSystemSettingsId);

IF @ManagerRoleId IS NOT NULL AND @ManageVouchersId IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM [dbo].[Role_Permissions] WHERE [role_id] = @ManagerRoleId AND [permission_id] = @ManageVouchersId)
    INSERT INTO [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (@ManagerRoleId, @ManageVouchersId);

COMMIT TRANSACTION;
