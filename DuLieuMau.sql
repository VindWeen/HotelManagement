--============================================== TẠO DATABASE ============================================
use master
if exists(select * from sys.databases where name = 'HotelManagementDB')
    drop database [HotelManagementDB]
go
create database [HotelManagementDB]

--============================================ TẠO BẢNG =================================
go
USE [HotelManagementDB]
GO

-- ============================================================
-- CLUSTER 1: SYSTEM, AUTH & HR
-- ============================================================

CREATE TABLE [dbo].[Roles](
    [id]          [int]           IDENTITY(1,1) NOT NULL,
    [name]        [nvarchar](100) NOT NULL,
    [description] [nvarchar](max) NULL,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

CREATE TABLE [dbo].[Permissions](
    [id]              [int]         IDENTITY(1,1) NOT NULL,
    [name]            [nvarchar](100) NOT NULL,
    [permission_code] [varchar](50)   NOT NULL,
    [module_name]     [nvarchar](50)  NULL,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[Role_Permissions](
    [role_id]       [int] NOT NULL,
    [permission_id] [int] NOT NULL,
PRIMARY KEY CLUSTERED ([role_id] ASC, [permission_id] ASC)
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[Memberships](
    [id]               [int]           IDENTITY(1,1) NOT NULL,
    [tier_name]        [nvarchar](100) NOT NULL,
    [min_points]       [int]           NULL,
    [max_points]       [int]           NULL,
    [discount_percent] [decimal](5, 2) NULL,
    [color_hex]        [varchar](7)    NULL,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[Users](
    [id]                   [int]            IDENTITY(1,1) NOT NULL,
    [role_id]              [int]            NULL,
    [membership_id]        [int]            NULL,
    [full_name]            [nvarchar](255)  NOT NULL,
    [email]                [nvarchar](255)  NOT NULL,
    [phone]                [nvarchar](50)   NULL,
    [date_of_birth]        [date]           NULL,
    [gender]               [nvarchar](10)   NULL,
    [address]              [nvarchar](500)  NULL,
    [national_id]          [nvarchar](20)   NULL,
    [password_hash]        [nvarchar](max)  NOT NULL,
    [avatar_url]           [nvarchar](max)  NULL,
    [loyalty_points]       [int]            NOT NULL DEFAULT 0,
    [loyalty_points_usable][int]            NOT NULL DEFAULT 0,
    [status]               [bit]            NULL,
    [last_login_at]        [datetime]       NULL,
    [created_at]           [datetime]       NOT NULL DEFAULT GETDATE(),
    [updated_at]           [datetime]       NULL,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

CREATE TABLE [dbo].[Audit_Logs](
    [id]          [int]            IDENTITY(1,1) NOT NULL,
    [user_id]     [int]            NULL,
    [action]      [nvarchar](50)   NOT NULL,
    [table_name]  [nvarchar](100)  NOT NULL,
    [record_id]   [int]            NOT NULL,
    [old_value]   [nvarchar](max)  NULL,
    [new_value]   [nvarchar](max)  NULL,
    [ip_address]  [varchar](50)    NULL,
    [user_agent]  [nvarchar](500)  NULL,
    [created_at]  [datetime]       NULL,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [dbo].[Users]
    ADD [refresh_token]        [nvarchar](500) NULL,
        [refresh_token_expiry] [datetime]      NULL;
GO

-- ============================================================
-- CLUSTER 2: ROOM MANAGEMENT
-- ============================================================

CREATE TABLE [dbo].[Amenities](
    [id]        [int]            IDENTITY(1,1) NOT NULL,
    [name]      [nvarchar](255)  NOT NULL,
    [icon_url]  [nvarchar](max)  NULL,
    [is_active] [bit]            NOT NULL DEFAULT 1,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

CREATE TABLE [dbo].[Room_Types](
    [id]                [int]            IDENTITY(1,1) NOT NULL,
    [name]              [nvarchar](255)  NOT NULL,
    [slug]              [nvarchar](100)  NULL,
    [base_price]        [decimal](18, 2) NOT NULL,
    [capacity_adults]   [int]            NOT NULL,
    [capacity_children] [int]            NOT NULL,
    [area_sqm]          [decimal](8, 2)  NULL,
    [bed_type]          [nvarchar](50)   NULL,
    [view_type]         [nvarchar](50)   NULL,
    [description]       [nvarchar](max)  NULL,
    [is_active]         [bit]            NOT NULL DEFAULT 1,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

CREATE TABLE [dbo].[Rooms](
    [id]               [int]           IDENTITY(1,1) NOT NULL,
    [room_type_id]     [int]           NULL,
    [room_number]      [nvarchar](50)  NOT NULL,
    [floor]            [int]           NULL,
    [view_type]        [nvarchar](50)  NULL,
    [status]           [nvarchar](50)  NULL,
    [business_status]  [nvarchar](20)  NOT NULL DEFAULT 'Available',
    [cleaning_status]  [nvarchar](20)  NOT NULL DEFAULT 'Clean',
    [notes]            [nvarchar](500) NULL,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[RoomType_Amenities](
    [room_type_id] [int] NOT NULL,
    [amenity_id]   [int] NOT NULL,
PRIMARY KEY CLUSTERED ([room_type_id] ASC, [amenity_id] ASC)
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[Room_Images](
    [id]                    [int]            IDENTITY(1,1) NOT NULL,
    [room_type_id]          [int]            NULL,
    [image_url]             [nvarchar](max)  NOT NULL,
    [cloudinary_public_id]  [nvarchar](255)  NULL,
    [is_primary]            [bit]            NULL,
    [sort_order]            [int]            NOT NULL DEFAULT 0,
    [is_active]             [bit]            NOT NULL DEFAULT 1,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

CREATE TABLE [dbo].[Room_Inventory](
    [id]           [int]            IDENTITY(1,1) NOT NULL,
    [room_id]      [int]            NULL,
    [item_name]    [nvarchar](255)  NOT NULL,
    [item_type]    [nvarchar](20)   NOT NULL DEFAULT 'Asset',
    [quantity]     [int]            NULL,
    [price_if_lost][decimal](18, 2) NULL,
    [is_active]    [bit]            NOT NULL DEFAULT 1,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY]
GO

-- ============================================================
-- CLUSTER 3: BOOKING & PROMOTIONS
-- ============================================================

CREATE TABLE [dbo].[Vouchers](
    [id]                        [int]            IDENTITY(1,1) NOT NULL,
    [code]                      [nvarchar](50)   NOT NULL,
    [discount_type]             [nvarchar](50)   NOT NULL,
    [discount_value]            [decimal](18, 2) NOT NULL,
    [max_discount_amount]       [decimal](18, 2) NULL,
    [min_booking_value]         [decimal](18, 2) NULL,
    [applicable_room_type_id]   [int]            NULL,
    [valid_from]                [datetime]       NULL,
    [valid_to]                  [datetime]       NULL,
    [usage_limit]               [int]            NULL,
    [used_count]                [int]            NOT NULL DEFAULT 0,
    [max_uses_per_user]         [int]            NOT NULL DEFAULT 1,
    [is_active]                 [bit]            NOT NULL DEFAULT 1,
    [created_at]                [datetime]       NOT NULL DEFAULT GETDATE(),
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[Bookings](
    [id]                     [int]            IDENTITY(1,1) NOT NULL,
    [user_id]                [int]            NULL,
    [guest_name]             [nvarchar](255)  NULL,
    [guest_phone]            [nvarchar](50)   NULL,
    [guest_email]            [nvarchar](255)  NULL,
    [num_adults]             [int]            NOT NULL DEFAULT 1,
    [num_children]           [int]            NOT NULL DEFAULT 0,
    [booking_code]           [nvarchar](50)   NOT NULL,
    [voucher_id]             [int]            NULL,
    [total_estimated_amount] [decimal](18, 2) NOT NULL DEFAULT 0,
    [deposit_amount]         [decimal](18, 2) NULL    DEFAULT 0,
    [check_in_time]          [datetime]       NULL,
    [check_out_time]         [datetime]       NULL,
    [status]                 [nvarchar](50)   NULL,
    [source]                 [nvarchar](20)   NOT NULL DEFAULT 'online',
    [note]                   [nvarchar](500)  NULL,
    [cancellation_reason]    [nvarchar](500)  NULL,
    [cancelled_at]           [datetime]       NULL,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[Booking_Details](
    [id]              [int]            IDENTITY(1,1) NOT NULL,
    [booking_id]      [int]            NULL,
    [room_id]         [int]            NULL,
    [room_type_id]    [int]            NULL,
    [check_in_date]   [datetime]       NOT NULL,
    [check_out_date]  [datetime]       NOT NULL,
    [price_per_night] [decimal](18, 2) NOT NULL,
    [note]            [nvarchar](500)  NULL,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY]
GO

-- ============================================================
-- CLUSTER 4: SERVICES & OPERATIONS
-- ============================================================

CREATE TABLE [dbo].[Service_Categories](
    [id]   [int]           IDENTITY(1,1) NOT NULL,
    [name] [nvarchar](255) NOT NULL,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[Services](
    [id]          [int]            IDENTITY(1,1) NOT NULL,
    [category_id] [int]            NULL,
    [name]        [nvarchar](255)  NOT NULL,
    [description] [nvarchar](500)  NULL,
    [price]       [decimal](18, 2) NOT NULL,
    [unit]        [nvarchar](50)   NULL,
    [image_url]   [nvarchar](max)  NULL,
    [is_active]   [bit]            NOT NULL DEFAULT 1,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[Order_Services](
    [id]                [int]            IDENTITY(1,1) NOT NULL,
    [booking_detail_id] [int]            NULL,
    [order_date]        [datetime]       NULL,
    [total_amount]      [decimal](18, 2) NULL,
    [status]            [nvarchar](50)   NULL,
    [note]              [nvarchar](500)  NULL,
    [completed_at]      [datetime]       NULL,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[Order_Service_Details](
    [id]               [int]            IDENTITY(1,1) NOT NULL,
    [order_service_id] [int]            NULL,
    [service_id]       [int]            NULL,
    [quantity]         [int]            NOT NULL,
    [unit_price]       [decimal](18, 2) NOT NULL,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[Loss_And_Damages](
    [id]                [int]            IDENTITY(1,1) NOT NULL,
    [booking_detail_id] [int]            NULL,
    [room_inventory_id] [int]            NULL,
    [reported_by]       [int]            NULL,
    [quantity]          [int]            NOT NULL,
    [penalty_amount]    [decimal](18, 2) NOT NULL,
    [description]       [nvarchar](max)  NULL,
    [status]            [nvarchar](20)   NOT NULL DEFAULT 'Pending',
    [created_at]        [datetime]       NULL,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

-- ============================================================
-- CLUSTER 5: BILLING, REVIEWS & CMS
-- ============================================================

CREATE TABLE [dbo].[Invoices](
    [id]                   [int]            IDENTITY(1,1) NOT NULL,
    [booking_id]           [int]            NULL,
    [total_room_amount]    [decimal](18, 2) NULL,
    [total_service_amount] [decimal](18, 2) NULL,
    [total_damage_amount]  [decimal](18, 2) NULL,
    [discount_amount]      [decimal](18, 2) NULL,
    [tax_amount]           [decimal](18, 2) NULL,
    [final_total]          [decimal](18, 2) NULL,
    [status]               [nvarchar](50)   NULL,
    [created_at]           [datetime]       NOT NULL DEFAULT GETDATE(),
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[Payments](
    [id]               [int]            IDENTITY(1,1) NOT NULL,
    [invoice_id]       [int]            NULL,
    [payment_type]     [nvarchar](30)   NULL,
    [payment_method]   [nvarchar](50)   NULL,
    [amount_paid]      [decimal](18, 2) NOT NULL,
    [transaction_code] [nvarchar](100)  NULL,
    [status]           [nvarchar](20)   NOT NULL DEFAULT 'Success',
    [payment_date]     [datetime]       NULL,
    [note]             [nvarchar](500)  NULL,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[Reviews](
    [id]               [int]           IDENTITY(1,1) NOT NULL,
    [user_id]          [int]           NULL,
    [room_type_id]     [int]           NULL,
    [booking_id]       [int]           NULL,
    [rating]           [int]           NULL,
    [comment]          [nvarchar](max) NULL,
    [image_url]        [nvarchar](max) NULL,
    [is_approved]      [bit]           NULL DEFAULT 0,
    [rejection_reason] [nvarchar](500) NULL,
    [created_at]       [datetime]      NULL,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

CREATE TABLE [dbo].[Article_Categories](
    [id]        [int]           IDENTITY(1,1) NOT NULL,
    [name]      [nvarchar](255) NOT NULL,
    [slug]      [nvarchar](100) NULL,
    [is_active] [bit]           NOT NULL DEFAULT 1,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[Articles](
    [id]                    [int]            IDENTITY(1,1) NOT NULL,
    [category_id]           [int]            NULL,
    [author_id]             [int]            NULL,
    [title]                 [nvarchar](max)  NOT NULL,
    [slug]                  [nvarchar](255)  NULL,
    [content]               [nvarchar](max)  NULL,
    [thumbnail_url]         [nvarchar](max)  NULL,
    [cloudinary_public_id]  [nvarchar](255)  NULL,
    [meta_title]            [nvarchar](200)  NULL,
    [meta_description]      [nvarchar](500)  NULL,
    [status]                [nvarchar](20)   NOT NULL DEFAULT 'Draft',
    [is_active]             [bit]            NOT NULL DEFAULT 1,
    [published_at]          [datetime]       NULL,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

CREATE TABLE [dbo].[Attractions](
    [id]            [int]            IDENTITY(1,1) NOT NULL,
    [name]          [nvarchar](255)  NOT NULL,
    [category]      [nvarchar](50)   NULL,
    [address]       [nvarchar](500)  NULL,
    [latitude]      [decimal](9, 6)  NULL,
    [longitude]     [decimal](9, 6)  NULL,
    [distance_km]   [decimal](5, 2)  NULL,
    [description]   [nvarchar](max)  NULL,
    [image_url]     [nvarchar](max)  NULL,
    [map_embed_link][nvarchar](max)  NULL,
    [is_active]     [bit]            NOT NULL DEFAULT 1,
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

-- ============================================================
-- CLUSTER 6: HR — SHIFTS
-- ============================================================

CREATE TABLE [dbo].[Shifts](
    [id]              [int]            IDENTITY(1,1) NOT NULL,
    [user_id]         [int]            NOT NULL,
    [confirmed_by]    [int]            NULL,
    [shift_type]      [nvarchar](20)   NOT NULL,
    [department]      [nvarchar](50)   NOT NULL,
    [planned_start]   [datetime]       NOT NULL,
    [planned_end]     [datetime]       NOT NULL,
    [actual_start]    [datetime]       NULL,
    [actual_end]      [datetime]       NULL,
    [late_minutes]    [int]            NOT NULL DEFAULT 0,
    [status]          [nvarchar](20)   NOT NULL DEFAULT 'Scheduled',
    [handover_note]   [nvarchar](max)  NULL,
    [cash_at_handover][decimal](18, 2) NULL,
    [created_at]      [datetime]       NOT NULL DEFAULT GETDATE(),
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

-- ============================================================
-- CLUSTER 7: LOYALTY & PROMOTIONS TRACKING
-- ============================================================

CREATE TABLE [dbo].[Loyalty_Transactions](
    [id]               [int]            IDENTITY(1,1) NOT NULL,
    [user_id]          [int]            NOT NULL,
    [booking_id]       [int]            NULL,
    [transaction_type] [nvarchar](20)   NOT NULL,
    [points]           [int]            NOT NULL,
    [balance_after]    [int]            NOT NULL,
    [note]             [nvarchar](255)  NULL,
    [created_at]       [datetime]       NOT NULL DEFAULT GETDATE(),
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[Voucher_Usage](
    [id]         [int]      IDENTITY(1,1) NOT NULL,
    [voucher_id] [int]      NOT NULL,
    [user_id]    [int]      NOT NULL,
    [booking_id] [int]      NOT NULL,
    [used_at]    [datetime] NOT NULL DEFAULT GETDATE(),
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY]
GO

-- ============================================================
-- UNIQUE INDEXES
-- ============================================================
SET ANSI_PADDING ON
GO
CREATE UNIQUE NONCLUSTERED INDEX [UQ_Article_Categories_Slug] ON [dbo].[Article_Categories] ([slug] ASC) WHERE [slug] IS NOT NULL
GO
ALTER TABLE [dbo].[Articles]           ADD UNIQUE NONCLUSTERED ([slug] ASC)
GO
ALTER TABLE [dbo].[Bookings]           ADD UNIQUE NONCLUSTERED ([booking_code] ASC)
GO
CREATE UNIQUE NONCLUSTERED INDEX [UQ_Room_Types_Slug] ON [dbo].[Room_Types] ([slug] ASC) WHERE [slug] IS NOT NULL
GO
ALTER TABLE [dbo].[Users]              ADD UNIQUE NONCLUSTERED ([email] ASC)
GO
ALTER TABLE [dbo].[Vouchers]           ADD UNIQUE NONCLUSTERED ([code] ASC)
GO

-- ============================================================
-- DEFAULT CONSTRAINTS
-- ============================================================
ALTER TABLE [dbo].[Articles]           ADD DEFAULT (getdate())    FOR [published_at]
ALTER TABLE [dbo].[Audit_Logs]         ADD DEFAULT (getdate())    FOR [created_at]
ALTER TABLE [dbo].[Bookings]           ADD DEFAULT ('Pending')    FOR [status]
ALTER TABLE [dbo].[Invoices]           ADD DEFAULT ((0))          FOR [total_room_amount]
ALTER TABLE [dbo].[Invoices]           ADD DEFAULT ((0))          FOR [total_service_amount]
ALTER TABLE [dbo].[Invoices]           ADD DEFAULT ((0))          FOR [total_damage_amount]
ALTER TABLE [dbo].[Invoices]           ADD DEFAULT ((0))          FOR [discount_amount]
ALTER TABLE [dbo].[Invoices]           ADD DEFAULT ((0))          FOR [tax_amount]
ALTER TABLE [dbo].[Invoices]           ADD DEFAULT ((0))          FOR [final_total]
ALTER TABLE [dbo].[Invoices]           ADD DEFAULT ('Unpaid')     FOR [status]
ALTER TABLE [dbo].[Loss_And_Damages]   ADD DEFAULT (getdate())    FOR [created_at]
ALTER TABLE [dbo].[Memberships]        ADD DEFAULT ((0))          FOR [min_points]
ALTER TABLE [dbo].[Memberships]        ADD DEFAULT ((0.00))       FOR [discount_percent]
ALTER TABLE [dbo].[Order_Services]     ADD DEFAULT (getdate())    FOR [order_date]
ALTER TABLE [dbo].[Order_Services]     ADD DEFAULT ((0))          FOR [total_amount]
ALTER TABLE [dbo].[Order_Services]     ADD DEFAULT ('Pending')    FOR [status]
ALTER TABLE [dbo].[Payments]           ADD DEFAULT (getdate())    FOR [payment_date]
ALTER TABLE [dbo].[Reviews]            ADD DEFAULT (getdate())    FOR [created_at]
ALTER TABLE [dbo].[Room_Images]        ADD DEFAULT ((0))          FOR [is_primary]
ALTER TABLE [dbo].[Room_Inventory]     ADD DEFAULT ((1))          FOR [quantity]
ALTER TABLE [dbo].[Room_Inventory]     ADD DEFAULT ((0))          FOR [price_if_lost]
ALTER TABLE [dbo].[Rooms]              ADD DEFAULT ('Available')  FOR [status]
ALTER TABLE [dbo].[Users]              ADD DEFAULT ((1))          FOR [status]
ALTER TABLE [dbo].[Vouchers]           ADD DEFAULT ((0))          FOR [min_booking_value]
GO

-- ============================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================
ALTER TABLE [dbo].[Audit_Logs]          WITH CHECK ADD FOREIGN KEY([user_id])              REFERENCES [dbo].[Users]             ([id])
ALTER TABLE [dbo].[Role_Permissions]    WITH CHECK ADD FOREIGN KEY([permission_id])         REFERENCES [dbo].[Permissions]       ([id])
ALTER TABLE [dbo].[Role_Permissions]    WITH CHECK ADD FOREIGN KEY([role_id])               REFERENCES [dbo].[Roles]             ([id])
ALTER TABLE [dbo].[Users]               WITH CHECK ADD FOREIGN KEY([membership_id])         REFERENCES [dbo].[Memberships]       ([id])
ALTER TABLE [dbo].[Users]               WITH CHECK ADD FOREIGN KEY([role_id])               REFERENCES [dbo].[Roles]             ([id])
ALTER TABLE [dbo].[Room_Images]         WITH CHECK ADD FOREIGN KEY([room_type_id])          REFERENCES [dbo].[Room_Types]        ([id])
ALTER TABLE [dbo].[Room_Inventory]      WITH CHECK ADD FOREIGN KEY([room_id])               REFERENCES [dbo].[Rooms]             ([id])
ALTER TABLE [dbo].[Rooms]               WITH CHECK ADD FOREIGN KEY([room_type_id])          REFERENCES [dbo].[Room_Types]        ([id])
ALTER TABLE [dbo].[RoomType_Amenities]  WITH CHECK ADD FOREIGN KEY([amenity_id])            REFERENCES [dbo].[Amenities]         ([id])
ALTER TABLE [dbo].[RoomType_Amenities]  WITH CHECK ADD FOREIGN KEY([room_type_id])          REFERENCES [dbo].[Room_Types]        ([id])
ALTER TABLE [dbo].[Booking_Details]     WITH CHECK ADD FOREIGN KEY([booking_id])            REFERENCES [dbo].[Bookings]          ([id])
ALTER TABLE [dbo].[Booking_Details]     WITH CHECK ADD FOREIGN KEY([room_id])               REFERENCES [dbo].[Rooms]             ([id])
ALTER TABLE [dbo].[Booking_Details]     WITH CHECK ADD FOREIGN KEY([room_type_id])          REFERENCES [dbo].[Room_Types]        ([id])
ALTER TABLE [dbo].[Bookings]            WITH CHECK ADD FOREIGN KEY([user_id])               REFERENCES [dbo].[Users]             ([id])
ALTER TABLE [dbo].[Bookings]            WITH CHECK ADD FOREIGN KEY([voucher_id])            REFERENCES [dbo].[Vouchers]          ([id])
ALTER TABLE [dbo].[Vouchers]            WITH CHECK ADD FOREIGN KEY([applicable_room_type_id]) REFERENCES [dbo].[Room_Types]      ([id])
ALTER TABLE [dbo].[Invoices]            WITH CHECK ADD FOREIGN KEY([booking_id])            REFERENCES [dbo].[Bookings]          ([id])
ALTER TABLE [dbo].[Loss_And_Damages]    WITH CHECK ADD FOREIGN KEY([booking_detail_id])     REFERENCES [dbo].[Booking_Details]   ([id])
ALTER TABLE [dbo].[Loss_And_Damages]    WITH CHECK ADD FOREIGN KEY([room_inventory_id])     REFERENCES [dbo].[Room_Inventory]    ([id])
ALTER TABLE [dbo].[Loss_And_Damages]    WITH CHECK ADD FOREIGN KEY([reported_by])           REFERENCES [dbo].[Users]             ([id])
ALTER TABLE [dbo].[Order_Service_Details] WITH CHECK ADD FOREIGN KEY([order_service_id])   REFERENCES [dbo].[Order_Services]    ([id])
ALTER TABLE [dbo].[Order_Service_Details] WITH CHECK ADD FOREIGN KEY([service_id])         REFERENCES [dbo].[Services]          ([id])
ALTER TABLE [dbo].[Order_Services]      WITH CHECK ADD FOREIGN KEY([booking_detail_id])     REFERENCES [dbo].[Booking_Details]   ([id])
ALTER TABLE [dbo].[Services]            WITH CHECK ADD FOREIGN KEY([category_id])           REFERENCES [dbo].[Service_Categories]([id])
ALTER TABLE [dbo].[Articles]            WITH CHECK ADD FOREIGN KEY([author_id])             REFERENCES [dbo].[Users]             ([id])
ALTER TABLE [dbo].[Articles]            WITH CHECK ADD FOREIGN KEY([category_id])           REFERENCES [dbo].[Article_Categories]([id])
ALTER TABLE [dbo].[Payments]            WITH CHECK ADD FOREIGN KEY([invoice_id])            REFERENCES [dbo].[Invoices]          ([id])
ALTER TABLE [dbo].[Reviews]             WITH CHECK ADD FOREIGN KEY([booking_id])            REFERENCES [dbo].[Bookings]          ([id])
ALTER TABLE [dbo].[Reviews]             WITH CHECK ADD FOREIGN KEY([room_type_id])          REFERENCES [dbo].[Room_Types]        ([id])
ALTER TABLE [dbo].[Reviews]             WITH CHECK ADD FOREIGN KEY([user_id])               REFERENCES [dbo].[Users]             ([id])
ALTER TABLE [dbo].[Loyalty_Transactions] WITH CHECK ADD FOREIGN KEY([user_id])             REFERENCES [dbo].[Users]             ([id])
ALTER TABLE [dbo].[Loyalty_Transactions] WITH CHECK ADD FOREIGN KEY([booking_id])          REFERENCES [dbo].[Bookings]          ([id])
ALTER TABLE [dbo].[Shifts]              WITH CHECK ADD FOREIGN KEY([user_id])               REFERENCES [dbo].[Users]             ([id])
ALTER TABLE [dbo].[Shifts]              WITH CHECK ADD FOREIGN KEY([confirmed_by])          REFERENCES [dbo].[Users]             ([id])
ALTER TABLE [dbo].[Voucher_Usage]       WITH CHECK ADD FOREIGN KEY([voucher_id])            REFERENCES [dbo].[Vouchers]          ([id])
ALTER TABLE [dbo].[Voucher_Usage]       WITH CHECK ADD FOREIGN KEY([user_id])               REFERENCES [dbo].[Users]             ([id])
ALTER TABLE [dbo].[Voucher_Usage]       WITH CHECK ADD FOREIGN KEY([booking_id])            REFERENCES [dbo].[Bookings]          ([id])
GO

-- ============================================================
-- CHECK CONSTRAINTS
-- ============================================================
ALTER TABLE [dbo].[Reviews] WITH CHECK ADD CHECK (([rating]>=(1) AND [rating]<=(5)))
GO

CREATE UNIQUE INDEX [UQ_Reviews_User_Booking]
    ON [dbo].[Reviews] ([user_id], [booking_id])
    WHERE [booking_id] IS NOT NULL;
GO

-- ============================================================
-- BẢNG Activity_Logs
-- ============================================================

CREATE TABLE [dbo].[Activity_Logs](
    [id]            [int]            IDENTITY(1,1) NOT NULL,
    [user_id]       [int]            NULL,
    [role_name]     [nvarchar](100)  NULL,
    [action_code]   [nvarchar](100)  NOT NULL,
    [action_label]  [nvarchar](255)  NOT NULL,
    [entity_type]   [nvarchar](100)  NULL,
    [entity_id]     [int]            NULL,
    [entity_label]  [nvarchar](500)  NULL,
    [severity]      [nvarchar](20)   NOT NULL DEFAULT 'Info',
    [message]       [nvarchar](max)  NOT NULL,
    [metadata]      [nvarchar](max)  NULL,
    [created_at]    [datetime]       NOT NULL DEFAULT GETDATE(),
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [dbo].[Activity_Logs]
    WITH CHECK ADD FOREIGN KEY([user_id]) REFERENCES [dbo].[Users]([id])
GO

CREATE NONCLUSTERED INDEX [IX_Activity_Logs_UserId_CreatedAt]
    ON [dbo].[Activity_Logs] ([user_id] ASC, [created_at] DESC)
GO

CREATE NONCLUSTERED INDEX [IX_Activity_Logs_EntityType_EntityId]
    ON [dbo].[Activity_Logs] ([entity_type] ASC, [entity_id] ASC)
GO

CREATE NONCLUSTERED INDEX [IX_Activity_Logs_CreatedAt]
    ON [dbo].[Activity_Logs] ([created_at] DESC)
GO

CREATE NONCLUSTERED INDEX [IX_Activity_Logs_ActionCode]
    ON [dbo].[Activity_Logs] ([action_code] ASC)
GO

CREATE TABLE [dbo].[Activity_Log_Reads] (
    [id]              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [activity_log_id] INT NOT NULL,
    [user_id]         INT NOT NULL,
    [read_at]         DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [fk_activity_log_reads_activity_logs] FOREIGN KEY ([activity_log_id]) REFERENCES [dbo].[Activity_Logs] ([id]) ON DELETE CASCADE,
    CONSTRAINT [fk_activity_log_reads_users]         FOREIGN KEY ([user_id])         REFERENCES [dbo].[Users]          ([id]) ON DELETE CASCADE
);
GO

CREATE UNIQUE INDEX [uk_activity_log_user]      ON [dbo].[Activity_Log_Reads] ([activity_log_id], [user_id]);
CREATE        INDEX [ix_activity_log_reads_user_id] ON [dbo].[Activity_Log_Reads] ([user_id]);
GO

-- ============================================================
-- SEED DATA
-- Ngày tham chiếu: 28/03/2026 (hôm nay)
-- Lịch booking trải đều 7 ngày gần nhất để Dashboard có đủ dữ liệu
-- ============================================================

-- 1. Roles
SET IDENTITY_INSERT [dbo].[Roles] ON
INSERT [dbo].[Roles] ([id], [name], [description]) VALUES (1,  N'Admin',       N'Quản trị viên')
INSERT [dbo].[Roles] ([id], [name], [description]) VALUES (2,  N'Manager',     N'Quản lý khách sạn')
INSERT [dbo].[Roles] ([id], [name], [description]) VALUES (3,  N'Receptionist',N'Lễ tân')
INSERT [dbo].[Roles] ([id], [name], [description]) VALUES (4,  N'Accountant',  N'Kế toán')
INSERT [dbo].[Roles] ([id], [name], [description]) VALUES (5,  N'Housekeeping',N'Buồng phòng')
INSERT [dbo].[Roles] ([id], [name], [description]) VALUES (6,  N'Security',    N'Bảo vệ')
INSERT [dbo].[Roles] ([id], [name], [description]) VALUES (7,  N'Chef',        N'Đầu bếp')
INSERT [dbo].[Roles] ([id], [name], [description]) VALUES (8,  N'Waiter',      N'Nhân viên phục vụ')
INSERT [dbo].[Roles] ([id], [name], [description]) VALUES (9,  N'IT Support',  N'Kỹ thuật viên')
INSERT [dbo].[Roles] ([id], [name], [description]) VALUES (10, N'Guest',       N'Khách hàng')
SET IDENTITY_INSERT [dbo].[Roles] OFF
GO

-- 2. Permissions
SET IDENTITY_INSERT [dbo].[Permissions] ON
INSERT [dbo].[Permissions] ([id], [name], [permission_code], [module_name]) VALUES (1,  N'VIEW_DASHBOARD',   N'VIEW_DASHBOARD',   N'System')
INSERT [dbo].[Permissions] ([id], [name], [permission_code], [module_name]) VALUES (2,  N'MANAGE_USERS',     N'MANAGE_USERS',     N'HR')
INSERT [dbo].[Permissions] ([id], [name], [permission_code], [module_name]) VALUES (3,  N'MANAGE_ROLES',     N'MANAGE_ROLES',     N'HR')
INSERT [dbo].[Permissions] ([id], [name], [permission_code], [module_name]) VALUES (4,  N'MANAGE_ROOMS',     N'MANAGE_ROOMS',     N'Room')
INSERT [dbo].[Permissions] ([id], [name], [permission_code], [module_name]) VALUES (5,  N'MANAGE_BOOKINGS',  N'MANAGE_BOOKINGS',  N'Booking')
INSERT [dbo].[Permissions] ([id], [name], [permission_code], [module_name]) VALUES (6,  N'MANAGE_INVOICES',  N'MANAGE_INVOICES',  N'Billing')
INSERT [dbo].[Permissions] ([id], [name], [permission_code], [module_name]) VALUES (7,  N'MANAGE_SERVICES',  N'MANAGE_SERVICES',  N'Service')
INSERT [dbo].[Permissions] ([id], [name], [permission_code], [module_name]) VALUES (8,  N'VIEW_REPORTS',     N'VIEW_REPORTS',     N'Report')
INSERT [dbo].[Permissions] ([id], [name], [permission_code], [module_name]) VALUES (9,  N'MANAGE_CONTENT',   N'MANAGE_CONTENT',   N'CMS')
INSERT [dbo].[Permissions] ([id], [name], [permission_code], [module_name]) VALUES (10, N'MANAGE_INVENTORY', N'MANAGE_INVENTORY', N'Room')
SET IDENTITY_INSERT [dbo].[Permissions] OFF
GO

-- 3. Memberships
SET IDENTITY_INSERT [dbo].[Memberships] ON
INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [max_points], [discount_percent], [color_hex]) VALUES (1,  N'Khách Mới', 0,      499,    CAST(0.00  AS Decimal(5,2)), N'#9E9E9E')
INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [max_points], [discount_percent], [color_hex]) VALUES (2,  N'Đồng',      500,    999,    CAST(2.00  AS Decimal(5,2)), N'#CD7F32')
INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [max_points], [discount_percent], [color_hex]) VALUES (3,  N'Bạc',       1000,   2999,   CAST(5.00  AS Decimal(5,2)), N'#C0C0C0')
INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [max_points], [discount_percent], [color_hex]) VALUES (4,  N'Vàng',      3000,   4999,   CAST(8.00  AS Decimal(5,2)), N'#FFD700')
INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [max_points], [discount_percent], [color_hex]) VALUES (5,  N'Bạch Kim',  5000,   9999,   CAST(10.00 AS Decimal(5,2)), N'#E5E4E2')
INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [max_points], [discount_percent], [color_hex]) VALUES (6,  N'Kim Cương', 10000,  19999,  CAST(15.00 AS Decimal(5,2)), N'#B9F2FF')
INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [max_points], [discount_percent], [color_hex]) VALUES (7,  N'Elite',     20000,  49999,  CAST(20.00 AS Decimal(5,2)), N'#7B68EE')
INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [max_points], [discount_percent], [color_hex]) VALUES (8,  N'VIP',       50000,  99999,  CAST(25.00 AS Decimal(5,2)), N'#FF8C00')
INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [max_points], [discount_percent], [color_hex]) VALUES (9,  N'VVIP',      100000, 199999, CAST(30.00 AS Decimal(5,2)), N'#DC143C')
INSERT [dbo].[Memberships] ([id], [tier_name], [min_points], [max_points], [discount_percent], [color_hex]) VALUES (10, N'Signature', 200000, NULL,   CAST(35.00 AS Decimal(5,2)), N'#2F4F4F')
SET IDENTITY_INSERT [dbo].[Memberships] OFF
GO

-- 4. Users
SET IDENTITY_INSERT [dbo].[Users] ON
INSERT [dbo].[Users] ([id],[role_id],[membership_id],[full_name],[email],[phone],[password_hash],[status],[loyalty_points],[loyalty_points_usable],[created_at])
VALUES (1,  1,  NULL, N'Nguyễn Admin',    N'admin@hotel.com',       N'0900000001', N'$2a$11$oFBpZq/8S8DAE2qhAt0TCOIsOXB3WlBlmdybSneBVxZBdqcKzm9Qu', 1, 0,    0,    CAST(N'2026-01-01T00:00:00.000' AS DateTime))
INSERT [dbo].[Users] ([id],[role_id],[membership_id],[full_name],[email],[phone],[password_hash],[status],[loyalty_points],[loyalty_points_usable],[created_at])
VALUES (2,  2,  NULL, N'Trần Manager',    N'manager@hotel.com',     N'0900000002', N'$2a$11$oFBpZq/8S8DAE2qhAt0TCOIsOXB3WlBlmdybSneBVxZBdqcKzm9Qu', 1, 0,    0,    CAST(N'2026-01-01T00:00:00.000' AS DateTime))
INSERT [dbo].[Users] ([id],[role_id],[membership_id],[full_name],[email],[phone],[password_hash],[status],[loyalty_points],[loyalty_points_usable],[created_at])
VALUES (3,  3,  NULL, N'Lê Lễ Tân',      N'reception1@hotel.com',  N'0900000003', N'$2a$11$oFBpZq/8S8DAE2qhAt0TCOIsOXB3WlBlmdybSneBVxZBdqcKzm9Qu', 1, 0,    0,    CAST(N'2026-01-01T00:00:00.000' AS DateTime))
INSERT [dbo].[Users] ([id],[role_id],[membership_id],[full_name],[email],[phone],[password_hash],[status],[loyalty_points],[loyalty_points_usable],[created_at])
VALUES (4,  3,  NULL, N'Phạm Lễ Tân',    N'reception2@hotel.com',  N'0900000004', N'$2a$11$oFBpZq/8S8DAE2qhAt0TCOIsOXB3WlBlmdybSneBVxZBdqcKzm9Qu', 1, 0,    0,    CAST(N'2026-01-01T00:00:00.000' AS DateTime))
INSERT [dbo].[Users] ([id],[role_id],[membership_id],[full_name],[email],[phone],[password_hash],[status],[loyalty_points],[loyalty_points_usable],[created_at])
VALUES (5,  4,  NULL, N'Hoàng Kế Toán',  N'accountant@hotel.com',  N'0900000005', N'$2a$11$oFBpZq/8S8DAE2qhAt0TCOIsOXB3WlBlmdybSneBVxZBdqcKzm9Qu', 1, 0,    0,    CAST(N'2026-01-01T00:00:00.000' AS DateTime))
INSERT [dbo].[Users] ([id],[role_id],[membership_id],[full_name],[email],[phone],[password_hash],[status],[loyalty_points],[loyalty_points_usable],[created_at])
VALUES (6,  10, 1,    N'Khách Hàng A',   N'guestA@gmail.com',      N'0900000006', N'$2a$11$oFBpZq/8S8DAE2qhAt0TCOIsOXB3WlBlmdybSneBVxZBdqcKzm9Qu', 1, 120,  100,  CAST(N'2026-03-01T00:00:00.000' AS DateTime))
INSERT [dbo].[Users] ([id],[role_id],[membership_id],[full_name],[email],[phone],[password_hash],[status],[loyalty_points],[loyalty_points_usable],[created_at])
VALUES (7,  10, 2,    N'Khách Hàng B',   N'guestB@gmail.com',      N'0900000007', N'$2a$11$oFBpZq/8S8DAE2qhAt0TCOIsOXB3WlBlmdybSneBVxZBdqcKzm9Qu', 1, 550,  400,  CAST(N'2026-03-05T00:00:00.000' AS DateTime))
INSERT [dbo].[Users] ([id],[role_id],[membership_id],[full_name],[email],[phone],[password_hash],[status],[loyalty_points],[loyalty_points_usable],[created_at])
VALUES (8,  10, 3,    N'Khách Hàng C',   N'guestC@gmail.com',      N'0900000008', N'$2a$11$oFBpZq/8S8DAE2qhAt0TCOIsOXB3WlBlmdybSneBVxZBdqcKzm9Qu', 1, 1200, 1000, CAST(N'2026-03-10T00:00:00.000' AS DateTime))
INSERT [dbo].[Users] ([id],[role_id],[membership_id],[full_name],[email],[phone],[password_hash],[status],[loyalty_points],[loyalty_points_usable],[created_at])
VALUES (9,  10, 4,    N'Khách Hàng D',   N'guestD@gmail.com',      N'0900000009', N'$2a$11$oFBpZq/8S8DAE2qhAt0TCOIsOXB3WlBlmdybSneBVxZBdqcKzm9Qu', 1, 3500, 3000, CAST(N'2026-03-15T00:00:00.000' AS DateTime))
INSERT [dbo].[Users] ([id],[role_id],[membership_id],[full_name],[email],[phone],[password_hash],[status],[loyalty_points],[loyalty_points_usable],[created_at])
VALUES (10, 10, 5,    N'Khách Hàng E',   N'guestE@gmail.com',      N'0900000010', N'$2a$11$oFBpZq/8S8DAE2qhAt0TCOIsOXB3WlBlmdybSneBVxZBdqcKzm9Qu', 1, 5200, 5000, CAST(N'2026-03-20T00:00:00.000' AS DateTime))
SET IDENTITY_INSERT [dbo].[Users] OFF
GO

-- 5. Role_Permissions
INSERT [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (1, 1)
INSERT [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (1, 2)
INSERT [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (1, 3)
INSERT [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (1, 4)
INSERT [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (1, 5)
INSERT [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (1, 6)
INSERT [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (1, 7)
INSERT [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (1, 8)
INSERT [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (1, 9)
INSERT [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (1, 10)
INSERT [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (2, 1)
INSERT [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (2, 4)
INSERT [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (2, 5)
INSERT [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (2, 8)
INSERT [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (3, 1)
INSERT [dbo].[Role_Permissions] ([role_id], [permission_id]) VALUES (3, 5)
GO

-- 6. Amenities
SET IDENTITY_INSERT [dbo].[Amenities] ON
INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (1,  N'Wifi Miễn Phí',     N'wifi.png',      1)
INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (2,  N'Smart TV',           N'tv.png',        1)
INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (3,  N'Điều Hòa',           N'ac.png',        1)
INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (4,  N'Bồn Tắm Sứ',        N'bathtub.png',   1)
INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (5,  N'Ban Công',           N'balcony.png',   1)
INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (6,  N'Minibar',            N'minibar.png',   1)
INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (7,  N'Két Sắt',            N'safe.png',      1)
INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (8,  N'Máy Sấy Tóc',       N'hairdryer.png', 1)
INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (9,  N'Máy Pha Cà Phê',    N'coffee.png',    1)
INSERT [dbo].[Amenities] ([id], [name], [icon_url], [is_active]) VALUES (10, N'Bàn Làm Việc',      N'desk.png',      1)
SET IDENTITY_INSERT [dbo].[Amenities] OFF
GO

-- 7. Room_Types
SET IDENTITY_INSERT [dbo].[Room_Types] ON
INSERT [dbo].[Room_Types] ([id],[name],[slug],[base_price],[capacity_adults],[capacity_children],[area_sqm],[bed_type],[view_type],[description],[is_active])
VALUES (1,  N'Standard Single',    N'standard-single',    CAST(400000.00  AS Decimal(18,2)), 1, 0, CAST(20.0 AS Decimal(8,2)), N'Single',  N'Thành phố', N'Phòng tiêu chuẩn 1 giường đơn',        1)
INSERT [dbo].[Room_Types] ([id],[name],[slug],[base_price],[capacity_adults],[capacity_children],[area_sqm],[bed_type],[view_type],[description],[is_active])
VALUES (2,  N'Standard Double',    N'standard-double',    CAST(500000.00  AS Decimal(18,2)), 2, 1, CAST(25.0 AS Decimal(8,2)), N'Double',  N'Thành phố', N'Phòng tiêu chuẩn 1 giường đôi',        1)
INSERT [dbo].[Room_Types] ([id],[name],[slug],[base_price],[capacity_adults],[capacity_children],[area_sqm],[bed_type],[view_type],[description],[is_active])
VALUES (3,  N'Superior City View', N'superior-city-view', CAST(700000.00  AS Decimal(18,2)), 2, 1, CAST(30.0 AS Decimal(8,2)), N'Queen',   N'Thành phố', N'Phòng cao cấp hướng phố',               1)
INSERT [dbo].[Room_Types] ([id],[name],[slug],[base_price],[capacity_adults],[capacity_children],[area_sqm],[bed_type],[view_type],[description],[is_active])
VALUES (4,  N'Deluxe Ocean View',  N'deluxe-ocean-view',  CAST(900000.00  AS Decimal(18,2)), 2, 2, CAST(35.0 AS Decimal(8,2)), N'King',    N'Biển',      N'Phòng Deluxe hướng biển',               1)
INSERT [dbo].[Room_Types] ([id],[name],[slug],[base_price],[capacity_adults],[capacity_children],[area_sqm],[bed_type],[view_type],[description],[is_active])
VALUES (5,  N'Premium Deluxe',     N'premium-deluxe',     CAST(1200000.00 AS Decimal(18,2)), 2, 2, CAST(38.0 AS Decimal(8,2)), N'King',    N'Biển',      N'Phòng Premium tiện nghi cao cấp',       1)
INSERT [dbo].[Room_Types] ([id],[name],[slug],[base_price],[capacity_adults],[capacity_children],[area_sqm],[bed_type],[view_type],[description],[is_active])
VALUES (6,  N'Family Suite',       N'family-suite',       CAST(1500000.00 AS Decimal(18,2)), 4, 2, CAST(55.0 AS Decimal(8,2)), N'Twin',    N'Vườn',      N'Phòng Suite cho gia đình',              1)
INSERT [dbo].[Room_Types] ([id],[name],[slug],[base_price],[capacity_adults],[capacity_children],[area_sqm],[bed_type],[view_type],[description],[is_active])
VALUES (7,  N'Junior Suite',       N'junior-suite',       CAST(1800000.00 AS Decimal(18,2)), 2, 2, CAST(60.0 AS Decimal(8,2)), N'King',    N'Biển',      N'Phòng Suite nhỏ nhắn sang trọng',      1)
INSERT [dbo].[Room_Types] ([id],[name],[slug],[base_price],[capacity_adults],[capacity_children],[area_sqm],[bed_type],[view_type],[description],[is_active])
VALUES (8,  N'Executive Suite',    N'executive-suite',    CAST(2500000.00 AS Decimal(18,2)), 2, 2, CAST(75.0 AS Decimal(8,2)), N'King',    N'Biển',      N'Phòng Suite cho doanh nhân',            1)
INSERT [dbo].[Room_Types] ([id],[name],[slug],[base_price],[capacity_adults],[capacity_children],[area_sqm],[bed_type],[view_type],[description],[is_active])
VALUES (9,  N'Presidential Suite', N'presidential-suite', CAST(5000000.00 AS Decimal(18,2)), 4, 2, CAST(120.0 AS Decimal(8,2)),N'King',   N'Biển',      N'Phòng Tổng thống',                      1)
INSERT [dbo].[Room_Types] ([id],[name],[slug],[base_price],[capacity_adults],[capacity_children],[area_sqm],[bed_type],[view_type],[description],[is_active])
VALUES (10, N'Royal Villa',        N'royal-villa',        CAST(8000000.00 AS Decimal(18,2)), 6, 4, CAST(250.0 AS Decimal(8,2)),N'King',   N'Biển',      N'Biệt thự hoàng gia nguyên căn',         1)
SET IDENTITY_INSERT [dbo].[Room_Types] OFF
GO

-- 8. Rooms
-- Trạng thái phòng phản ánh đúng booking hiện tại:
--   Phòng 2, 6, 7  → Occupied (đang có khách Checked_in)
--   Phòng 3        → Dirty (vừa Completed, chờ dọn)
--   Phòng 4        → Disabled (bảo trì)
--   Còn lại        → Available / Clean
SET IDENTITY_INSERT [dbo].[Rooms] ON
INSERT [dbo].[Rooms] ([id],[room_type_id],[room_number],[floor],[view_type],[status],[business_status],[cleaning_status])
VALUES (1,  1,  N'101',    1, N'Thành phố', N'Available',   N'Available',   N'Clean')
INSERT [dbo].[Rooms] ([id],[room_type_id],[room_number],[floor],[view_type],[status],[business_status],[cleaning_status])
VALUES (2,  2,  N'102',    1, N'Thành phố', N'Occupied',    N'Occupied',    N'Dirty')
INSERT [dbo].[Rooms] ([id],[room_type_id],[room_number],[floor],[view_type],[status],[business_status],[cleaning_status])
VALUES (3,  3,  N'201',    2, N'Thành phố', N'Cleaning',    N'Available',   N'Dirty')
INSERT [dbo].[Rooms] ([id],[room_type_id],[room_number],[floor],[view_type],[status],[business_status],[cleaning_status])
VALUES (4,  4,  N'202',    2, N'Biển',      N'Maintenance', N'Disabled',    N'Clean')
INSERT [dbo].[Rooms] ([id],[room_type_id],[room_number],[floor],[view_type],[status],[business_status],[cleaning_status])
VALUES (5,  5,  N'301',    3, N'Biển',      N'Available',   N'Available',   N'Clean')
INSERT [dbo].[Rooms] ([id],[room_type_id],[room_number],[floor],[view_type],[status],[business_status],[cleaning_status])
VALUES (6,  6,  N'302',    3, N'Vườn',      N'Occupied',    N'Occupied',    N'Dirty')
INSERT [dbo].[Rooms] ([id],[room_type_id],[room_number],[floor],[view_type],[status],[business_status],[cleaning_status])
VALUES (7,  7,  N'401',    4, N'Biển',      N'Occupied',    N'Occupied',    N'Dirty')
INSERT [dbo].[Rooms] ([id],[room_type_id],[room_number],[floor],[view_type],[status],[business_status],[cleaning_status])
VALUES (8,  8,  N'402',    4, N'Biển',      N'Available',   N'Available',   N'Clean')
INSERT [dbo].[Rooms] ([id],[room_type_id],[room_number],[floor],[view_type],[status],[business_status],[cleaning_status])
VALUES (9,  9,  N'501',    5, N'Biển',      N'Available',   N'Available',   N'Clean')
INSERT [dbo].[Rooms] ([id],[room_type_id],[room_number],[floor],[view_type],[status],[business_status],[cleaning_status])
VALUES (10, 10, N'VILLA-1',1, N'Biển',      N'Available',   N'Available',   N'Clean')
SET IDENTITY_INSERT [dbo].[Rooms] OFF
GO

-- 9. RoomType_Amenities
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (1, 1)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (1, 2)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (1, 3)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (2, 1)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (2, 2)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (2, 3)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (3, 1)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (3, 3)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (3, 4)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (3, 5)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (4, 1)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (4, 2)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (4, 5)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (4, 6)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (4, 7)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (5, 1)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (5, 2)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (5, 4)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (5, 6)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (5, 8)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (6, 1)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (6, 2)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (6, 5)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (6, 6)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (7, 1)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (7, 2)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (7, 4)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (7, 5)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (7, 7)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (7, 9)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (8, 1)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (8, 2)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (8, 4)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (8, 6)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (8, 7)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (8, 9)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (8, 10)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (9, 1)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (9, 2)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (9, 4)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (9, 5)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (9, 6)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (9, 7)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (9, 8)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (9, 9)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (9, 10)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (10, 1)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (10, 2)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (10, 3)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (10, 4)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (10, 5)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (10, 6)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (10, 7)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (10, 8)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (10, 9)
INSERT [dbo].[RoomType_Amenities] ([room_type_id], [amenity_id]) VALUES (10, 10)
GO

-- 10. Room_Images
SET IDENTITY_INSERT [dbo].[Room_Images] ON
INSERT [dbo].[Room_Images] ([id],[room_type_id],[image_url],[cloudinary_public_id],[is_primary],[sort_order],[is_active])
VALUES (1,  1,  N'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', NULL, 1, 0, 1)
INSERT [dbo].[Room_Images] ([id],[room_type_id],[image_url],[cloudinary_public_id],[is_primary],[sort_order],[is_active])
VALUES (2,  2,  N'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800', NULL, 1, 0, 1)
INSERT [dbo].[Room_Images] ([id],[room_type_id],[image_url],[cloudinary_public_id],[is_primary],[sort_order],[is_active])
VALUES (3,  3,  N'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800', NULL, 1, 0, 1)
INSERT [dbo].[Room_Images] ([id],[room_type_id],[image_url],[cloudinary_public_id],[is_primary],[sort_order],[is_active])
VALUES (4,  4,  N'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800', NULL, 1, 0, 1)
INSERT [dbo].[Room_Images] ([id],[room_type_id],[image_url],[cloudinary_public_id],[is_primary],[sort_order],[is_active])
VALUES (5,  5,  N'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800', NULL, 1, 0, 1)
INSERT [dbo].[Room_Images] ([id],[room_type_id],[image_url],[cloudinary_public_id],[is_primary],[sort_order],[is_active])
VALUES (6,  6,  N'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800', NULL, 1, 0, 1)
INSERT [dbo].[Room_Images] ([id],[room_type_id],[image_url],[cloudinary_public_id],[is_primary],[sort_order],[is_active])
VALUES (7,  7,  N'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800', NULL, 1, 0, 1)
INSERT [dbo].[Room_Images] ([id],[room_type_id],[image_url],[cloudinary_public_id],[is_primary],[sort_order],[is_active])
VALUES (8,  8,  N'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800', NULL, 1, 0, 1)
INSERT [dbo].[Room_Images] ([id],[room_type_id],[image_url],[cloudinary_public_id],[is_primary],[sort_order],[is_active])
VALUES (9,  9,  N'https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=800', NULL, 1, 0, 1)
INSERT [dbo].[Room_Images] ([id],[room_type_id],[image_url],[cloudinary_public_id],[is_primary],[sort_order],[is_active])
VALUES (10, 10, N'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800', NULL, 1, 0, 1)
SET IDENTITY_INSERT [dbo].[Room_Images] OFF
GO

-- 11. Room_Inventory
SET IDENTITY_INSERT [dbo].[Room_Inventory] ON
INSERT [dbo].[Room_Inventory] ([id],[room_id],[item_name],[item_type],[quantity],[price_if_lost],[is_active])
VALUES (1,  1, N'Tivi Samsung 40 inch', N'Asset',   1,  CAST(5000000.00 AS Decimal(18,2)), 1)
INSERT [dbo].[Room_Inventory] ([id],[room_id],[item_name],[item_type],[quantity],[price_if_lost],[is_active])
VALUES (2,  1, N'Điều Khiển Tivi',      N'Asset',   1,  CAST(300000.00  AS Decimal(18,2)), 1)
INSERT [dbo].[Room_Inventory] ([id],[room_id],[item_name],[item_type],[quantity],[price_if_lost],[is_active])
VALUES (3,  2, N'Khăn Tắm Lớn',        N'Asset',   2,  CAST(200000.00  AS Decimal(18,2)), 1)
INSERT [dbo].[Room_Inventory] ([id],[room_id],[item_name],[item_type],[quantity],[price_if_lost],[is_active])
VALUES (4,  2, N'Cốc Thủy Tinh',       N'Asset',   2,  CAST(50000.00   AS Decimal(18,2)), 1)
INSERT [dbo].[Room_Inventory] ([id],[room_id],[item_name],[item_type],[quantity],[price_if_lost],[is_active])
VALUES (5,  3, N'Bình Đun Siêu Tốc',   N'Asset',   1,  CAST(400000.00  AS Decimal(18,2)), 1)
INSERT [dbo].[Room_Inventory] ([id],[room_id],[item_name],[item_type],[quantity],[price_if_lost],[is_active])
VALUES (6,  3, N'Máy Sấy Tóc',         N'Asset',   1,  CAST(350000.00  AS Decimal(18,2)), 1)
INSERT [dbo].[Room_Inventory] ([id],[room_id],[item_name],[item_type],[quantity],[price_if_lost],[is_active])
VALUES (7,  4, N'Gối Nằm',             N'Asset',   4,  CAST(250000.00  AS Decimal(18,2)), 1)
INSERT [dbo].[Room_Inventory] ([id],[room_id],[item_name],[item_type],[quantity],[price_if_lost],[is_active])
VALUES (8,  4, N'Móc Treo Quần Áo',    N'Asset',   10, CAST(20000.00   AS Decimal(18,2)), 1)
INSERT [dbo].[Room_Inventory] ([id],[room_id],[item_name],[item_type],[quantity],[price_if_lost],[is_active])
VALUES (9,  5, N'Áo Choàng Tắm',       N'Asset',   2,  CAST(450000.00  AS Decimal(18,2)), 1)
INSERT [dbo].[Room_Inventory] ([id],[room_id],[item_name],[item_type],[quantity],[price_if_lost],[is_active])
VALUES (10, 5, N'Thảm Lau Chân',       N'Asset',   1,  CAST(100000.00  AS Decimal(18,2)), 1)
SET IDENTITY_INSERT [dbo].[Room_Inventory] OFF
GO

-- 12. Vouchers
SET IDENTITY_INSERT [dbo].[Vouchers] ON
INSERT [dbo].[Vouchers] ([id],[code],[discount_type],[discount_value],[max_discount_amount],[min_booking_value],[applicable_room_type_id],[valid_from],[valid_to],[usage_limit],[used_count],[max_uses_per_user],[is_active],[created_at])
VALUES (1,  N'KM1',  N'PERCENT',      CAST(10.00  AS Decimal(18,2)), CAST(500000.00  AS Decimal(18,2)), CAST(500000.00   AS Decimal(18,2)), NULL, CAST(N'2026-01-01' AS DateTime), CAST(N'2026-12-31' AS DateTime), 100, 2, 1, 1, CAST(N'2026-01-01' AS DateTime))
INSERT [dbo].[Vouchers] ([id],[code],[discount_type],[discount_value],[max_discount_amount],[min_booking_value],[applicable_room_type_id],[valid_from],[valid_to],[usage_limit],[used_count],[max_uses_per_user],[is_active],[created_at])
VALUES (2,  N'KM2',  N'FIXED_AMOUNT', CAST(100000.00 AS Decimal(18,2)), NULL, CAST(1000000.00  AS Decimal(18,2)), NULL, CAST(N'2026-01-01' AS DateTime), CAST(N'2026-12-31' AS DateTime), 50,  1, 1, 1, CAST(N'2026-01-01' AS DateTime))
INSERT [dbo].[Vouchers] ([id],[code],[discount_type],[discount_value],[max_discount_amount],[min_booking_value],[applicable_room_type_id],[valid_from],[valid_to],[usage_limit],[used_count],[max_uses_per_user],[is_active],[created_at])
VALUES (3,  N'KM3',  N'PERCENT',      CAST(15.00  AS Decimal(18,2)), CAST(1000000.00 AS Decimal(18,2)), CAST(2000000.00  AS Decimal(18,2)), NULL, CAST(N'2026-01-01' AS DateTime), CAST(N'2026-12-31' AS DateTime), 30,  1, 1, 1, CAST(N'2026-01-01' AS DateTime))
INSERT [dbo].[Vouchers] ([id],[code],[discount_type],[discount_value],[max_discount_amount],[min_booking_value],[applicable_room_type_id],[valid_from],[valid_to],[usage_limit],[used_count],[max_uses_per_user],[is_active],[created_at])
VALUES (4,  N'KM4',  N'FIXED_AMOUNT', CAST(200000.00 AS Decimal(18,2)), NULL, CAST(1500000.00  AS Decimal(18,2)), NULL, CAST(N'2026-01-01' AS DateTime), CAST(N'2026-12-31' AS DateTime), 50,  1, 1, 1, CAST(N'2026-01-01' AS DateTime))
INSERT [dbo].[Vouchers] ([id],[code],[discount_type],[discount_value],[max_discount_amount],[min_booking_value],[applicable_room_type_id],[valid_from],[valid_to],[usage_limit],[used_count],[max_uses_per_user],[is_active],[created_at])
VALUES (5,  N'KM5',  N'PERCENT',      CAST(20.00  AS Decimal(18,2)), CAST(2000000.00 AS Decimal(18,2)), CAST(3000000.00  AS Decimal(18,2)), NULL, CAST(N'2026-01-01' AS DateTime), CAST(N'2026-12-31' AS DateTime), 20,  0, 1, 1, CAST(N'2026-01-01' AS DateTime))
INSERT [dbo].[Vouchers] ([id],[code],[discount_type],[discount_value],[max_discount_amount],[min_booking_value],[applicable_room_type_id],[valid_from],[valid_to],[usage_limit],[used_count],[max_uses_per_user],[is_active],[created_at])
VALUES (6,  N'KM6',  N'FIXED_AMOUNT', CAST(50000.00  AS Decimal(18,2)), NULL, CAST(0.00         AS Decimal(18,2)), NULL, CAST(N'2026-01-01' AS DateTime), CAST(N'2026-12-31' AS DateTime), 200, 0, 1, 1, CAST(N'2026-01-01' AS DateTime))
INSERT [dbo].[Vouchers] ([id],[code],[discount_type],[discount_value],[max_discount_amount],[min_booking_value],[applicable_room_type_id],[valid_from],[valid_to],[usage_limit],[used_count],[max_uses_per_user],[is_active],[created_at])
VALUES (7,  N'KM7',  N'PERCENT',      CAST(5.00   AS Decimal(18,2)), CAST(300000.00  AS Decimal(18,2)), CAST(0.00         AS Decimal(18,2)), NULL, CAST(N'2026-01-01' AS DateTime), CAST(N'2026-12-31' AS DateTime), 500, 0, 1, 1, CAST(N'2026-01-01' AS DateTime))
INSERT [dbo].[Vouchers] ([id],[code],[discount_type],[discount_value],[max_discount_amount],[min_booking_value],[applicable_room_type_id],[valid_from],[valid_to],[usage_limit],[used_count],[max_uses_per_user],[is_active],[created_at])
VALUES (8,  N'KM8',  N'FIXED_AMOUNT', CAST(500000.00 AS Decimal(18,2)), NULL, CAST(5000000.00  AS Decimal(18,2)), NULL, CAST(N'2026-01-01' AS DateTime), CAST(N'2026-12-31' AS DateTime), 10,  0, 1, 1, CAST(N'2026-01-01' AS DateTime))
INSERT [dbo].[Vouchers] ([id],[code],[discount_type],[discount_value],[max_discount_amount],[min_booking_value],[applicable_room_type_id],[valid_from],[valid_to],[usage_limit],[used_count],[max_uses_per_user],[is_active],[created_at])
VALUES (9,  N'KM9',  N'PERCENT',      CAST(25.00  AS Decimal(18,2)), CAST(5000000.00 AS Decimal(18,2)), CAST(10000000.00 AS Decimal(18,2)), NULL, CAST(N'2026-01-01' AS DateTime), CAST(N'2026-12-31' AS DateTime), 5,   0, 1, 1, CAST(N'2026-01-01' AS DateTime))
INSERT [dbo].[Vouchers] ([id],[code],[discount_type],[discount_value],[max_discount_amount],[min_booking_value],[applicable_room_type_id],[valid_from],[valid_to],[usage_limit],[used_count],[max_uses_per_user],[is_active],[created_at])
VALUES (10, N'KM10', N'FIXED_AMOUNT', CAST(1000000.00 AS Decimal(18,2)), NULL, CAST(20000000.00 AS Decimal(18,2)), NULL, CAST(N'2026-01-01' AS DateTime), CAST(N'2026-12-31' AS DateTime), 2,   0, 1, 1, CAST(N'2026-01-01' AS DateTime))
SET IDENTITY_INSERT [dbo].[Vouchers] OFF
GO

-- ============================================================
-- 13. Bookings — 10 booking trải đều 7 ngày (22–28/03/2026)
-- ─────────────────────────────────────────────────────────────
-- BK-0001  Completed   CI 22/03  CO 24/03  → doanh thu ngày 24
-- BK-0002  Completed   CI 23/03  CO 25/03  → doanh thu ngày 25
-- BK-0003  Completed   CI 24/03  CO 26/03  → doanh thu ngày 26
-- BK-0004  Completed   CI 25/03  CO 27/03  → doanh thu ngày 27
-- BK-0005  Completed   CI 26/03  CO 28/03  → doanh thu ngày 28 (hôm nay)
-- BK-0006  Checked_in  CI 27/03  CO 29/03  → đang ở, chưa có doanh thu
-- BK-0007  Checked_in  CI 28/03  CO 30/03  → đang ở, chưa có doanh thu
-- BK-0008  Confirmed   CI 29/03  CO 31/03  → chờ check-in
-- BK-0009  Pending     CI 30/03  CO 01/04  → chờ xác nhận
-- BK-0010  Cancelled   ──────────────────  → huỷ ngày 22/03
-- ============================================================
SET IDENTITY_INSERT [dbo].[Bookings] ON

-- BK-0001: Completed, check-out 24/03
INSERT [dbo].[Bookings] ([id],[user_id],[guest_name],[guest_phone],[guest_email],[num_adults],[num_children],[booking_code],[voucher_id],[total_estimated_amount],[deposit_amount],[check_in_time],[check_out_time],[status],[source])
VALUES (1, 6, N'Khách Hàng A', N'0900000006', N'guestA@gmail.com', 1, 0, N'BK-0001', NULL,
        CAST(800000.00  AS Decimal(18,2)), CAST(240000.00  AS Decimal(18,2)),
        CAST(N'2026-03-22 14:00:00' AS DateTime), CAST(N'2026-03-24 11:00:00' AS DateTime),
        N'Completed', N'online')

-- BK-0002: Completed, check-out 25/03
INSERT [dbo].[Bookings] ([id],[user_id],[guest_name],[guest_phone],[guest_email],[num_adults],[num_children],[booking_code],[voucher_id],[total_estimated_amount],[deposit_amount],[check_in_time],[check_out_time],[status],[source])
VALUES (2, 7, N'Khách Hàng B', N'0900000007', N'guestB@gmail.com', 2, 1, N'BK-0002', 1,
        CAST(1350000.00 AS Decimal(18,2)), CAST(405000.00  AS Decimal(18,2)),
        CAST(N'2026-03-23 14:00:00' AS DateTime), CAST(N'2026-03-25 11:00:00' AS DateTime),
        N'Completed', N'online')

-- BK-0003: Completed, check-out 26/03
INSERT [dbo].[Bookings] ([id],[user_id],[guest_name],[guest_phone],[guest_email],[num_adults],[num_children],[booking_code],[voucher_id],[total_estimated_amount],[deposit_amount],[check_in_time],[check_out_time],[status],[source])
VALUES (3, 8, N'Khách Hàng C', N'0900000008', N'guestC@gmail.com', 2, 0, N'BK-0003', NULL,
        CAST(1400000.00 AS Decimal(18,2)), CAST(420000.00  AS Decimal(18,2)),
        CAST(N'2026-03-24 14:00:00' AS DateTime), CAST(N'2026-03-26 11:00:00' AS DateTime),
        N'Completed', N'online')

-- BK-0004: Completed, check-out 27/03
INSERT [dbo].[Bookings] ([id],[user_id],[guest_name],[guest_phone],[guest_email],[num_adults],[num_children],[booking_code],[voucher_id],[total_estimated_amount],[deposit_amount],[check_in_time],[check_out_time],[status],[source])
VALUES (4, 9, N'Khách Hàng D', N'0900000009', N'guestD@gmail.com', 2, 2, N'BK-0004', 2,
        CAST(2600000.00 AS Decimal(18,2)), CAST(780000.00  AS Decimal(18,2)),
        CAST(N'2026-03-25 14:00:00' AS DateTime), CAST(N'2026-03-27 11:00:00' AS DateTime),
        N'Completed', N'online')

-- BK-0005: Completed, check-out hôm nay 28/03
INSERT [dbo].[Bookings] ([id],[user_id],[guest_name],[guest_phone],[guest_email],[num_adults],[num_children],[booking_code],[voucher_id],[total_estimated_amount],[deposit_amount],[check_in_time],[check_out_time],[status],[source])
VALUES (5, 10, N'Khách Hàng E', N'0900000010', N'guestE@gmail.com', 2, 0, N'BK-0005', NULL,
        CAST(3600000.00 AS Decimal(18,2)), CAST(1080000.00 AS Decimal(18,2)),
        CAST(N'2026-03-26 14:00:00' AS DateTime), CAST(N'2026-03-28 11:00:00' AS DateTime),
        N'Completed', N'online')

-- BK-0006: Checked_in, check-in hôm qua 27/03, check-out 29/03
INSERT [dbo].[Bookings] ([id],[user_id],[guest_name],[guest_phone],[guest_email],[num_adults],[num_children],[booking_code],[voucher_id],[total_estimated_amount],[deposit_amount],[check_in_time],[check_out_time],[status],[source])
VALUES (6, NULL, N'Khách Vãng Lai 1', N'0911111111', NULL, 2, 0, N'BK-0006', 3,
        CAST(2550000.00 AS Decimal(18,2)), CAST(765000.00  AS Decimal(18,2)),
        CAST(N'2026-03-27 14:00:00' AS DateTime), NULL,
        N'Checked_in', N'walk_in')

-- BK-0007: Checked_in, check-in hôm nay 28/03, check-out 30/03
INSERT [dbo].[Bookings] ([id],[user_id],[guest_name],[guest_phone],[guest_email],[num_adults],[num_children],[booking_code],[voucher_id],[total_estimated_amount],[deposit_amount],[check_in_time],[check_out_time],[status],[source])
VALUES (7, NULL, N'Khách Vãng Lai 2', N'0922222222', NULL, 2, 1, N'BK-0007', NULL,
        CAST(3600000.00 AS Decimal(18,2)), CAST(1080000.00 AS Decimal(18,2)),
        CAST(N'2026-03-28 09:00:00' AS DateTime), NULL,
        N'Checked_in', N'walk_in')

-- BK-0008: Confirmed, check-in ngày mai 29/03
INSERT [dbo].[Bookings] ([id],[user_id],[guest_name],[guest_phone],[guest_email],[num_adults],[num_children],[booking_code],[voucher_id],[total_estimated_amount],[deposit_amount],[check_in_time],[check_out_time],[status],[source])
VALUES (8, 6, N'Khách Hàng A', N'0900000006', N'guestA@gmail.com', 2, 2, N'BK-0008', NULL,
        CAST(10000000.00 AS Decimal(18,2)), CAST(3000000.00 AS Decimal(18,2)),
        NULL, NULL,
        N'Confirmed', N'online')

-- BK-0009: Pending, đặt hôm nay cho 30/03
INSERT [dbo].[Bookings] ([id],[user_id],[guest_name],[guest_phone],[guest_email],[num_adults],[num_children],[booking_code],[voucher_id],[total_estimated_amount],[deposit_amount],[check_in_time],[check_out_time],[status],[source])
VALUES (9, 7, N'Khách Hàng B', N'0900000007', N'guestB@gmail.com', 4, 0, N'BK-0009', NULL,
        CAST(16000000.00 AS Decimal(18,2)), CAST(4800000.00 AS Decimal(18,2)),
        NULL, NULL,
        N'Pending', N'online')

-- BK-0010: Cancelled ngày 22/03
INSERT [dbo].[Bookings] ([id],[user_id],[guest_name],[guest_phone],[guest_email],[num_adults],[num_children],[booking_code],[voucher_id],[total_estimated_amount],[deposit_amount],[check_in_time],[check_out_time],[status],[source],[cancellation_reason],[cancelled_at])
VALUES (10, 8, N'Khách Hàng C', N'0900000008', N'guestC@gmail.com', 2, 0, N'BK-0010', 4,
        CAST(2200000.00 AS Decimal(18,2)), CAST(0.00         AS Decimal(18,2)),
        NULL, NULL,
        N'Cancelled', N'online', N'Thay đổi kế hoạch du lịch', CAST(N'2026-03-22 09:00:00' AS DateTime))

SET IDENTITY_INSERT [dbo].[Bookings] OFF
GO

-- ============================================================
-- 14. Booking_Details — ngày CI/CO khớp với Bookings
-- ============================================================
SET IDENTITY_INSERT [dbo].[Booking_Details] ON

-- BK-0001: phòng 101 (Standard Single), 22–24/03, 2 đêm × 400k = 800k
INSERT [dbo].[Booking_Details] ([id],[booking_id],[room_id],[room_type_id],[check_in_date],[check_out_date],[price_per_night])
VALUES (1, 1, 1, 1, CAST(N'2026-03-22 14:00:00' AS DateTime), CAST(N'2026-03-24 11:00:00' AS DateTime), CAST(400000.00  AS Decimal(18,2)))

-- BK-0002: phòng 102 (Standard Double), 23–25/03, 2 đêm × 500k, voucher 10% → 900k
INSERT [dbo].[Booking_Details] ([id],[booking_id],[room_id],[room_type_id],[check_in_date],[check_out_date],[price_per_night])
VALUES (2, 2, 2, 2, CAST(N'2026-03-23 14:00:00' AS DateTime), CAST(N'2026-03-25 11:00:00' AS DateTime), CAST(500000.00  AS Decimal(18,2)))

-- BK-0003: phòng 201 (Superior City View), 24–26/03, 2 đêm × 700k = 1.4M
INSERT [dbo].[Booking_Details] ([id],[booking_id],[room_id],[room_type_id],[check_in_date],[check_out_date],[price_per_night])
VALUES (3, 3, 3, 3, CAST(N'2026-03-24 14:00:00' AS DateTime), CAST(N'2026-03-26 11:00:00' AS DateTime), CAST(700000.00  AS Decimal(18,2)))

-- BK-0004: phòng 302 (Family Suite) 25–27/03, 2 đêm × 1.5M - 100k voucher = 2.8M → ~2.6M
INSERT [dbo].[Booking_Details] ([id],[booking_id],[room_id],[room_type_id],[check_in_date],[check_out_date],[price_per_night])
VALUES (4, 4, 6, 6, CAST(N'2026-03-25 14:00:00' AS DateTime), CAST(N'2026-03-27 11:00:00' AS DateTime), CAST(1500000.00 AS Decimal(18,2)))

-- BK-0005: phòng 401 (Junior Suite), 26–28/03, 2 đêm × 1.8M = 3.6M
INSERT [dbo].[Booking_Details] ([id],[booking_id],[room_id],[room_type_id],[check_in_date],[check_out_date],[price_per_night])
VALUES (5, 5, 7, 7, CAST(N'2026-03-26 14:00:00' AS DateTime), CAST(N'2026-03-28 11:00:00' AS DateTime), CAST(1800000.00 AS Decimal(18,2)))

-- BK-0006 (Checked_in): phòng 302 (Family Suite), 27–29/03, 2 đêm × 1.5M - KM3 = 2.55M
INSERT [dbo].[Booking_Details] ([id],[booking_id],[room_id],[room_type_id],[check_in_date],[check_out_date],[price_per_night])
VALUES (6, 6, 6, 6, CAST(N'2026-03-27 14:00:00' AS DateTime), CAST(N'2026-03-29 11:00:00' AS DateTime), CAST(1500000.00 AS Decimal(18,2)))

-- BK-0007 (Checked_in): phòng 401 (Junior Suite), 28–30/03, 2 đêm × 1.8M = 3.6M
INSERT [dbo].[Booking_Details] ([id],[booking_id],[room_id],[room_type_id],[check_in_date],[check_out_date],[price_per_night])
VALUES (7, 7, 7, 7, CAST(N'2026-03-28 09:00:00' AS DateTime), CAST(N'2026-03-30 11:00:00' AS DateTime), CAST(1800000.00 AS Decimal(18,2)))

-- BK-0008 (Confirmed): phòng NULL, Executive Suite, 29/03–02/04, 4 đêm × 2.5M = 10M
INSERT [dbo].[Booking_Details] ([id],[booking_id],[room_id],[room_type_id],[check_in_date],[check_out_date],[price_per_night])
VALUES (8, 8, NULL, 8, CAST(N'2026-03-29 14:00:00' AS DateTime), CAST(N'2026-04-02 11:00:00' AS DateTime), CAST(2500000.00 AS Decimal(18,2)))

-- BK-0009 (Pending): phòng NULL, Royal Villa, 30/03–02/04, 2 đêm × 8M = 16M
INSERT [dbo].[Booking_Details] ([id],[booking_id],[room_id],[room_type_id],[check_in_date],[check_out_date],[price_per_night])
VALUES (9, 9, NULL, 10, CAST(N'2026-03-30 14:00:00' AS DateTime), CAST(N'2026-04-01 11:00:00' AS DateTime), CAST(8000000.00 AS Decimal(18,2)))

-- BK-0010 (Cancelled): phòng NULL, Deluxe Ocean View, 25–27/03
INSERT [dbo].[Booking_Details] ([id],[booking_id],[room_id],[room_type_id],[check_in_date],[check_out_date],[price_per_night])
VALUES (10, 10, NULL, 4, CAST(N'2026-03-25 14:00:00' AS DateTime), CAST(N'2026-03-27 11:00:00' AS DateTime), CAST(900000.00  AS Decimal(18,2)))

SET IDENTITY_INSERT [dbo].[Booking_Details] OFF
GO

-- 15. Invoices
SET IDENTITY_INSERT [dbo].[Invoices] ON
INSERT [dbo].[Invoices] ([id],[booking_id],[total_room_amount],[total_service_amount],[total_damage_amount],[discount_amount],[tax_amount],[final_total],[status],[created_at])
VALUES (1,  1,  CAST(800000.00   AS Decimal(18,2)), CAST(0.00       AS Decimal(18,2)), CAST(0.00      AS Decimal(18,2)), CAST(0.00      AS Decimal(18,2)), CAST(80000.00    AS Decimal(18,2)), CAST(880000.00   AS Decimal(18,2)), N'Paid',    CAST(N'2026-03-24T12:00:00' AS DateTime))
INSERT [dbo].[Invoices] ([id],[booking_id],[total_room_amount],[total_service_amount],[total_damage_amount],[discount_amount],[tax_amount],[final_total],[status],[created_at])
VALUES (2,  2,  CAST(1000000.00  AS Decimal(18,2)), CAST(150000.00  AS Decimal(18,2)), CAST(50000.00  AS Decimal(18,2)), CAST(100000.00 AS Decimal(18,2)), CAST(110000.00   AS Decimal(18,2)), CAST(1210000.00  AS Decimal(18,2)), N'Paid',    CAST(N'2026-03-25T12:00:00' AS DateTime))
INSERT [dbo].[Invoices] ([id],[booking_id],[total_room_amount],[total_service_amount],[total_damage_amount],[discount_amount],[tax_amount],[final_total],[status],[created_at])
VALUES (3,  3,  CAST(1400000.00  AS Decimal(18,2)), CAST(0.00       AS Decimal(18,2)), CAST(400000.00 AS Decimal(18,2)), CAST(0.00      AS Decimal(18,2)), CAST(180000.00   AS Decimal(18,2)), CAST(1980000.00  AS Decimal(18,2)), N'Paid',    CAST(N'2026-03-26T12:00:00' AS DateTime))
INSERT [dbo].[Invoices] ([id],[booking_id],[total_room_amount],[total_service_amount],[total_damage_amount],[discount_amount],[tax_amount],[final_total],[status],[created_at])
VALUES (4,  4,  CAST(3000000.00  AS Decimal(18,2)), CAST(200000.00  AS Decimal(18,2)), CAST(50000.00  AS Decimal(18,2)), CAST(100000.00 AS Decimal(18,2)), CAST(315000.00   AS Decimal(18,2)), CAST(3465000.00  AS Decimal(18,2)), N'Paid',    CAST(N'2026-03-27T12:00:00' AS DateTime))
INSERT [dbo].[Invoices] ([id],[booking_id],[total_room_amount],[total_service_amount],[total_damage_amount],[discount_amount],[tax_amount],[final_total],[status],[created_at])
VALUES (5,  5,  CAST(3600000.00  AS Decimal(18,2)), CAST(500000.00  AS Decimal(18,2)), CAST(0.00      AS Decimal(18,2)), CAST(0.00      AS Decimal(18,2)), CAST(410000.00   AS Decimal(18,2)), CAST(4510000.00  AS Decimal(18,2)), N'Paid',    CAST(N'2026-03-28T12:00:00' AS DateTime))
INSERT [dbo].[Invoices] ([id],[booking_id],[total_room_amount],[total_service_amount],[total_damage_amount],[discount_amount],[tax_amount],[final_total],[status],[created_at])
VALUES (6,  6,  CAST(3000000.00  AS Decimal(18,2)), CAST(0.00       AS Decimal(18,2)), CAST(0.00      AS Decimal(18,2)), CAST(450000.00 AS Decimal(18,2)), CAST(255000.00   AS Decimal(18,2)), CAST(2805000.00  AS Decimal(18,2)), N'Unpaid',  CAST(N'2026-03-27T15:00:00' AS DateTime))
INSERT [dbo].[Invoices] ([id],[booking_id],[total_room_amount],[total_service_amount],[total_damage_amount],[discount_amount],[tax_amount],[final_total],[status],[created_at])
VALUES (7,  7,  CAST(3600000.00  AS Decimal(18,2)), CAST(0.00       AS Decimal(18,2)), CAST(0.00      AS Decimal(18,2)), CAST(0.00      AS Decimal(18,2)), CAST(360000.00   AS Decimal(18,2)), CAST(3960000.00  AS Decimal(18,2)), N'Unpaid',  CAST(N'2026-03-28T10:00:00' AS DateTime))
INSERT [dbo].[Invoices] ([id],[booking_id],[total_room_amount],[total_service_amount],[total_damage_amount],[discount_amount],[tax_amount],[final_total],[status],[created_at])
VALUES (8,  8,  CAST(10000000.00 AS Decimal(18,2)), CAST(0.00       AS Decimal(18,2)), CAST(0.00      AS Decimal(18,2)), CAST(0.00      AS Decimal(18,2)), CAST(1000000.00  AS Decimal(18,2)), CAST(11000000.00 AS Decimal(18,2)), N'Unpaid',  CAST(N'2026-03-28T08:00:00' AS DateTime))
INSERT [dbo].[Invoices] ([id],[booking_id],[total_room_amount],[total_service_amount],[total_damage_amount],[discount_amount],[tax_amount],[final_total],[status],[created_at])
VALUES (9,  9,  CAST(16000000.00 AS Decimal(18,2)), CAST(0.00       AS Decimal(18,2)), CAST(0.00      AS Decimal(18,2)), CAST(0.00      AS Decimal(18,2)), CAST(1600000.00  AS Decimal(18,2)), CAST(17600000.00 AS Decimal(18,2)), N'Unpaid',  CAST(N'2026-03-28T08:30:00' AS DateTime))
INSERT [dbo].[Invoices] ([id],[booking_id],[total_room_amount],[total_service_amount],[total_damage_amount],[discount_amount],[tax_amount],[final_total],[status],[created_at])
VALUES (10, 10, CAST(1800000.00  AS Decimal(18,2)), CAST(0.00       AS Decimal(18,2)), CAST(0.00      AS Decimal(18,2)), CAST(0.00      AS Decimal(18,2)), CAST(0.00        AS Decimal(18,2)), CAST(0.00        AS Decimal(18,2)), N'Refunded',CAST(N'2026-03-22T10:00:00' AS DateTime))
SET IDENTITY_INSERT [dbo].[Invoices] OFF
GO

-- 16. Payments
SET IDENTITY_INSERT [dbo].[Payments] ON
INSERT [dbo].[Payments] ([id],[invoice_id],[payment_type],[payment_method],[amount_paid],[transaction_code],[status],[payment_date])
VALUES (1,  1,  N'Final_Settlement', N'Cash',          CAST(880000.00   AS Decimal(18,2)), N'CASH001',  N'Success', CAST(N'2026-03-24T12:30:00' AS DateTime))
INSERT [dbo].[Payments] ([id],[invoice_id],[payment_type],[payment_method],[amount_paid],[transaction_code],[status],[payment_date])
VALUES (2,  2,  N'Final_Settlement', N'VNPay',          CAST(1210000.00  AS Decimal(18,2)), N'VNPAY123', N'Success', CAST(N'2026-03-25T13:00:00' AS DateTime))
INSERT [dbo].[Payments] ([id],[invoice_id],[payment_type],[payment_method],[amount_paid],[transaction_code],[status],[payment_date])
VALUES (3,  3,  N'Final_Settlement', N'Credit Card',    CAST(1980000.00  AS Decimal(18,2)), N'CC456',    N'Success', CAST(N'2026-03-26T12:00:00' AS DateTime))
INSERT [dbo].[Payments] ([id],[invoice_id],[payment_type],[payment_method],[amount_paid],[transaction_code],[status],[payment_date])
VALUES (4,  4,  N'Final_Settlement', N'Bank Transfer',  CAST(3465000.00  AS Decimal(18,2)), N'BANK001',  N'Success', CAST(N'2026-03-27T12:30:00' AS DateTime))
INSERT [dbo].[Payments] ([id],[invoice_id],[payment_type],[payment_method],[amount_paid],[transaction_code],[status],[payment_date])
VALUES (5,  5,  N'Final_Settlement', N'Momo',           CAST(4510000.00  AS Decimal(18,2)), N'MOMO001',  N'Success', CAST(N'2026-03-28T11:30:00' AS DateTime))
INSERT [dbo].[Payments] ([id],[invoice_id],[payment_type],[payment_method],[amount_paid],[transaction_code],[status],[payment_date])
VALUES (6,  6,  N'Deposit',          N'Cash',           CAST(765000.00   AS Decimal(18,2)), N'CASH002',  N'Success', CAST(N'2026-03-27T14:30:00' AS DateTime))
INSERT [dbo].[Payments] ([id],[invoice_id],[payment_type],[payment_method],[amount_paid],[transaction_code],[status],[payment_date])
VALUES (7,  7,  N'Deposit',          N'VNPay',          CAST(1080000.00  AS Decimal(18,2)), N'VNPAY999', N'Success', CAST(N'2026-03-28T09:30:00' AS DateTime))
INSERT [dbo].[Payments] ([id],[invoice_id],[payment_type],[payment_method],[amount_paid],[transaction_code],[status],[payment_date])
VALUES (8,  8,  N'Deposit',          N'Credit Card',    CAST(3000000.00  AS Decimal(18,2)), N'CC888',    N'Success', CAST(N'2026-03-28T08:30:00' AS DateTime))
INSERT [dbo].[Payments] ([id],[invoice_id],[payment_type],[payment_method],[amount_paid],[transaction_code],[status],[payment_date])
VALUES (9,  9,  N'Deposit',          N'Bank Transfer',  CAST(4800000.00  AS Decimal(18,2)), N'BANK002',  N'Success', CAST(N'2026-03-28T08:45:00' AS DateTime))
INSERT [dbo].[Payments] ([id],[invoice_id],[payment_type],[payment_method],[amount_paid],[transaction_code],[status],[payment_date])
VALUES (10, 10, N'Refund',           N'Cash',           CAST(0.00        AS Decimal(18,2)), N'REF001',   N'Success', CAST(N'2026-03-22T10:30:00' AS DateTime))
SET IDENTITY_INSERT [dbo].[Payments] OFF
GO

-- 17. Service_Categories
SET IDENTITY_INSERT [dbo].[Service_Categories] ON
INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (1,  N'Nhà Hàng & Ẩm Thực')
INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (2,  N'Spa & Massage')
INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (3,  N'Di Chuyển & Đưa Đón')
INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (4,  N'Giặt Ủi')
INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (5,  N'Tour Du Lịch')
INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (6,  N'Phòng Gym & Yoga')
INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (7,  N'Hồ Bơi')
INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (8,  N'Tổ Chức Sự Kiện')
INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (9,  N'Khu Vui Chơi Trẻ Em')
INSERT [dbo].[Service_Categories] ([id], [name]) VALUES (10, N'Cửa Hàng Lưu Niệm')
SET IDENTITY_INSERT [dbo].[Service_Categories] OFF
GO

-- 18. Services
SET IDENTITY_INSERT [dbo].[Services] ON
INSERT [dbo].[Services] ([id],[category_id],[name],[price],[unit],[is_active])
VALUES (1,  1,  N'Set Ăn Sáng Buffet',    CAST(200000.00 AS Decimal(18,2)), N'Người',  1)
INSERT [dbo].[Services] ([id],[category_id],[name],[price],[unit],[is_active])
VALUES (2,  1,  N'Mì Ý Hải Sản',          CAST(150000.00 AS Decimal(18,2)), N'Phần',   1)
INSERT [dbo].[Services] ([id],[category_id],[name],[price],[unit],[is_active])
VALUES (3,  2,  N'Massage Toàn Thân 60p', CAST(500000.00 AS Decimal(18,2)), N'Lượt',   1)
INSERT [dbo].[Services] ([id],[category_id],[name],[price],[unit],[is_active])
VALUES (4,  2,  N'Xông Hơi Thảo Dược',   CAST(300000.00 AS Decimal(18,2)), N'Lượt',   1)
INSERT [dbo].[Services] ([id],[category_id],[name],[price],[unit],[is_active])
VALUES (5,  3,  N'Đưa Đón Sân Bay 4 Chỗ',CAST(350000.00 AS Decimal(18,2)), N'Chuyến', 1)
INSERT [dbo].[Services] ([id],[category_id],[name],[price],[unit],[is_active])
VALUES (6,  3,  N'Thuê Xe Máy Nửa Ngày', CAST(100000.00 AS Decimal(18,2)), N'Chiếc',  1)
INSERT [dbo].[Services] ([id],[category_id],[name],[price],[unit],[is_active])
VALUES (7,  4,  N'Giặt Khô Áo Vest',     CAST(120000.00 AS Decimal(18,2)), N'Cái',    1)
INSERT [dbo].[Services] ([id],[category_id],[name],[price],[unit],[is_active])
VALUES (8,  4,  N'Giặt Sấy Tiêu Chuẩn', CAST(40000.00  AS Decimal(18,2)), N'Kg',     1)
INSERT [dbo].[Services] ([id],[category_id],[name],[price],[unit],[is_active])
VALUES (9,  5,  N'Tour Đảo Nửa Ngày',    CAST(800000.00 AS Decimal(18,2)), N'Người',  1)
INSERT [dbo].[Services] ([id],[category_id],[name],[price],[unit],[is_active])
VALUES (10, 10, N'Móc Khóa Kỷ Niệm',    CAST(50000.00  AS Decimal(18,2)), N'Cái',    1)
SET IDENTITY_INSERT [dbo].[Services] OFF
GO

-- 19. Order_Services (gắn với các booking đang active)
SET IDENTITY_INSERT [dbo].[Order_Services] ON
INSERT [dbo].[Order_Services] ([id],[booking_detail_id],[order_date],[total_amount],[status])
VALUES (1,  1,  CAST(N'2026-03-22T18:00:00' AS DateTime), CAST(150000.00  AS Decimal(18,2)), N'Delivered')
INSERT [dbo].[Order_Services] ([id],[booking_detail_id],[order_date],[total_amount],[status])
VALUES (2,  2,  CAST(N'2026-03-23T19:00:00' AS DateTime), CAST(200000.00  AS Decimal(18,2)), N'Delivered')
INSERT [dbo].[Order_Services] ([id],[booking_detail_id],[order_date],[total_amount],[status])
VALUES (3,  3,  CAST(N'2026-03-24T20:00:00' AS DateTime), CAST(500000.00  AS Decimal(18,2)), N'Delivered')
INSERT [dbo].[Order_Services] ([id],[booking_detail_id],[order_date],[total_amount],[status])
VALUES (4,  4,  CAST(N'2026-03-25T18:30:00' AS DateTime), CAST(350000.00  AS Decimal(18,2)), N'Delivered')
INSERT [dbo].[Order_Services] ([id],[booking_detail_id],[order_date],[total_amount],[status])
VALUES (5,  5,  CAST(N'2026-03-26T19:30:00' AS DateTime), CAST(800000.00  AS Decimal(18,2)), N'Delivered')
INSERT [dbo].[Order_Services] ([id],[booking_detail_id],[order_date],[total_amount],[status])
VALUES (6,  6,  CAST(N'2026-03-27T20:00:00' AS DateTime), CAST(150000.00  AS Decimal(18,2)), N'Delivered')
INSERT [dbo].[Order_Services] ([id],[booking_detail_id],[order_date],[total_amount],[status])
VALUES (7,  7,  CAST(N'2026-03-28T10:30:00' AS DateTime), CAST(200000.00  AS Decimal(18,2)), N'Pending')
INSERT [dbo].[Order_Services] ([id],[booking_detail_id],[order_date],[total_amount],[status])
VALUES (8,  7,  CAST(N'2026-03-28T12:00:00' AS DateTime), CAST(0.00       AS Decimal(18,2)), N'Pending')
INSERT [dbo].[Order_Services] ([id],[booking_detail_id],[order_date],[total_amount],[status])
VALUES (9,  5,  CAST(N'2026-03-27T09:00:00' AS DateTime), CAST(500000.00  AS Decimal(18,2)), N'Delivered')
INSERT [dbo].[Order_Services] ([id],[booking_detail_id],[order_date],[total_amount],[status])
VALUES (10, 4,  CAST(N'2026-03-26T15:00:00' AS DateTime), CAST(200000.00  AS Decimal(18,2)), N'Delivered')
SET IDENTITY_INSERT [dbo].[Order_Services] OFF
GO

-- 20. Order_Service_Details
SET IDENTITY_INSERT [dbo].[Order_Service_Details] ON
INSERT [dbo].[Order_Service_Details] ([id],[order_service_id],[service_id],[quantity],[unit_price]) VALUES (1,  1,  2,  1, CAST(150000.00 AS Decimal(18,2)))
INSERT [dbo].[Order_Service_Details] ([id],[order_service_id],[service_id],[quantity],[unit_price]) VALUES (2,  2,  1,  1, CAST(200000.00 AS Decimal(18,2)))
INSERT [dbo].[Order_Service_Details] ([id],[order_service_id],[service_id],[quantity],[unit_price]) VALUES (3,  3,  3,  1, CAST(500000.00 AS Decimal(18,2)))
INSERT [dbo].[Order_Service_Details] ([id],[order_service_id],[service_id],[quantity],[unit_price]) VALUES (4,  4,  5,  1, CAST(350000.00 AS Decimal(18,2)))
INSERT [dbo].[Order_Service_Details] ([id],[order_service_id],[service_id],[quantity],[unit_price]) VALUES (5,  5,  9,  1, CAST(800000.00 AS Decimal(18,2)))
INSERT [dbo].[Order_Service_Details] ([id],[order_service_id],[service_id],[quantity],[unit_price]) VALUES (6,  6,  2,  1, CAST(150000.00 AS Decimal(18,2)))
INSERT [dbo].[Order_Service_Details] ([id],[order_service_id],[service_id],[quantity],[unit_price]) VALUES (7,  7,  1,  1, CAST(200000.00 AS Decimal(18,2)))
INSERT [dbo].[Order_Service_Details] ([id],[order_service_id],[service_id],[quantity],[unit_price]) VALUES (8,  9,  3,  1, CAST(500000.00 AS Decimal(18,2)))
INSERT [dbo].[Order_Service_Details] ([id],[order_service_id],[service_id],[quantity],[unit_price]) VALUES (9,  10, 1,  1, CAST(200000.00 AS Decimal(18,2)))
INSERT [dbo].[Order_Service_Details] ([id],[order_service_id],[service_id],[quantity],[unit_price]) VALUES (10, 2,  10, 1, CAST(50000.00  AS Decimal(18,2)))
SET IDENTITY_INSERT [dbo].[Order_Service_Details] OFF
GO

-- 21. Loss_And_Damages
SET IDENTITY_INSERT [dbo].[Loss_And_Damages] ON
INSERT [dbo].[Loss_And_Damages] ([id],[booking_detail_id],[room_inventory_id],[reported_by],[quantity],[penalty_amount],[description],[status],[created_at])
VALUES (1,  3,  5,  5, 1, CAST(400000.00 AS Decimal(18,2)), N'Làm hỏng bình đun siêu tốc', N'Confirmed', CAST(N'2026-03-26T13:00:00' AS DateTime))
INSERT [dbo].[Loss_And_Damages] ([id],[booking_detail_id],[room_inventory_id],[reported_by],[quantity],[penalty_amount],[description],[status],[created_at])
VALUES (2,  2,  4,  5, 1, CAST(50000.00  AS Decimal(18,2)), N'Làm vỡ cốc thủy tinh',       N'Confirmed', CAST(N'2026-03-25T12:00:00' AS DateTime))
INSERT [dbo].[Loss_And_Damages] ([id],[booking_detail_id],[room_inventory_id],[reported_by],[quantity],[penalty_amount],[description],[status],[created_at])
VALUES (3,  5,  6,  5, 1, CAST(350000.00 AS Decimal(18,2)), N'Mất máy sấy tóc',             N'Pending',   CAST(N'2026-03-28T11:00:00' AS DateTime))
INSERT [dbo].[Loss_And_Damages] ([id],[booking_detail_id],[room_inventory_id],[reported_by],[quantity],[penalty_amount],[description],[status],[created_at])
VALUES (4,  1,  2,  5, 1, CAST(300000.00 AS Decimal(18,2)), N'Làm mất điều khiển tivi',     N'Confirmed', CAST(N'2026-03-24T12:00:00' AS DateTime))
INSERT [dbo].[Loss_And_Damages] ([id],[booking_detail_id],[room_inventory_id],[reported_by],[quantity],[penalty_amount],[description],[status],[created_at])
VALUES (5,  4,  7,  5, 1, CAST(250000.00 AS Decimal(18,2)), N'Làm cháy gối nằm',            N'Confirmed', CAST(N'2026-03-27T13:00:00' AS DateTime))
INSERT [dbo].[Loss_And_Damages] ([id],[booking_detail_id],[room_inventory_id],[reported_by],[quantity],[penalty_amount],[description],[status],[created_at])
VALUES (6,  4,  8,  5, 2, CAST(40000.00  AS Decimal(18,2)), N'Gãy móc treo quần áo',        N'Confirmed', CAST(N'2026-03-27T13:05:00' AS DateTime))
INSERT [dbo].[Loss_And_Damages] ([id],[booking_detail_id],[room_inventory_id],[reported_by],[quantity],[penalty_amount],[description],[status],[created_at])
VALUES (7,  6,  9,  5, 1, CAST(450000.00 AS Decimal(18,2)), N'Mất áo choàng tắm',           N'Pending',   CAST(N'2026-03-28T09:00:00' AS DateTime))
INSERT [dbo].[Loss_And_Damages] ([id],[booking_detail_id],[room_inventory_id],[reported_by],[quantity],[penalty_amount],[description],[status],[created_at])
VALUES (8,  3,  4,  5, 2, CAST(100000.00 AS Decimal(18,2)), N'Vỡ 2 cốc thủy tinh',          N'Confirmed', CAST(N'2026-03-26T12:30:00' AS DateTime))
INSERT [dbo].[Loss_And_Damages] ([id],[booking_detail_id],[room_inventory_id],[reported_by],[quantity],[penalty_amount],[description],[status],[created_at])
VALUES (9,  1,  10, 5, 1, CAST(100000.00 AS Decimal(18,2)), N'Làm bẩn thảm lau chân',       N'Confirmed', CAST(N'2026-03-24T11:30:00' AS DateTime))
INSERT [dbo].[Loss_And_Damages] ([id],[booking_detail_id],[room_inventory_id],[reported_by],[quantity],[penalty_amount],[description],[status],[created_at])
VALUES (10, 7,  3,  5, 1, CAST(200000.00 AS Decimal(18,2)), N'Làm hỏng khăn tắm',           N'Pending',   CAST(N'2026-03-28T10:00:00' AS DateTime))
SET IDENTITY_INSERT [dbo].[Loss_And_Damages] OFF
GO

-- 22. Reviews
SET IDENTITY_INSERT [dbo].[Reviews] ON
INSERT [dbo].[Reviews] ([id],[user_id],[room_type_id],[rating],[comment],[created_at],[booking_id],[is_approved])
VALUES (1,  6,  1,  5, N'Phòng tuyệt vời, sạch sẽ, nhân viên thân thiện!',        CAST(N'2026-03-24T15:00:00' AS DateTime), 1, 1)
INSERT [dbo].[Reviews] ([id],[user_id],[room_type_id],[rating],[comment],[created_at],[booking_id],[is_approved])
VALUES (2,  7,  2,  4, N'Khá tốt, view đẹp, bữa sáng ngon miệng.',                CAST(N'2026-03-25T14:00:00' AS DateTime), 2, 1)
INSERT [dbo].[Reviews] ([id],[user_id],[room_type_id],[rating],[comment],[created_at],[booking_id],[is_approved])
VALUES (3,  8,  3,  3, N'Bình thường, điều hòa hơi ồn, dịch vụ cần cải thiện.',   CAST(N'2026-03-26T13:00:00' AS DateTime), 3, 1)
INSERT [dbo].[Reviews] ([id],[user_id],[room_type_id],[rating],[comment],[created_at],[booking_id],[is_approved])
VALUES (4,  9,  6,  5, N'Phòng gia đình rất rộng, trẻ em thích lắm.',              CAST(N'2026-03-27T16:00:00' AS DateTime), 4, 1)
INSERT [dbo].[Reviews] ([id],[user_id],[room_type_id],[rating],[comment],[created_at],[booking_id],[is_approved])
VALUES (5,  10, 7,  5, N'Junior Suite sang trọng, view biển cực đẹp vào buổi sáng.',CAST(N'2026-03-28T12:00:00' AS DateTime),5, 0)
INSERT [dbo].[Reviews] ([id],[user_id],[room_type_id],[rating],[comment],[created_at],[booking_id],[is_approved])
VALUES (6,  6,  2,  4, N'Lần thứ hai ở đây, vẫn rất hài lòng.',                   CAST(N'2026-03-20T10:00:00' AS DateTime), NULL, 1)
INSERT [dbo].[Reviews] ([id],[user_id],[room_type_id],[rating],[comment],[created_at],[booking_id],[is_approved])
VALUES (7,  7,  4,  5, N'Deluxe Ocean View xứng đáng từng đồng tiền.',             CAST(N'2026-03-18T11:00:00' AS DateTime), NULL, 1)
INSERT [dbo].[Reviews] ([id],[user_id],[room_type_id],[rating],[comment],[created_at],[booking_id],[is_approved])
VALUES (8,  8,  5,  2, N'Chưa hài lòng với tốc độ dọn phòng, phải chờ khá lâu.',  CAST(N'2026-03-15T09:00:00' AS DateTime), NULL, 0)
INSERT [dbo].[Reviews] ([id],[user_id],[room_type_id],[rating],[comment],[created_at],[booking_id],[is_approved])
VALUES (9,  9,  8,  5, N'Executive Suite hoàn hảo cho chuyến công tác.',           CAST(N'2026-03-10T14:00:00' AS DateTime), NULL, 1)
INSERT [dbo].[Reviews] ([id],[user_id],[room_type_id],[rating],[comment],[created_at],[booking_id],[is_approved])
VALUES (10, 10, 10, 5, N'Royal Villa — trải nghiệm đỉnh cao, sẽ quay lại!',        CAST(N'2026-03-05T16:00:00' AS DateTime), NULL, 1)
SET IDENTITY_INSERT [dbo].[Reviews] OFF
GO

-- 23. Article_Categories
SET IDENTITY_INSERT [dbo].[Article_Categories] ON
INSERT [dbo].[Article_Categories] ([id],[name],[slug],[is_active]) VALUES (1,  N'Tin Tức Khách Sạn',     N'tin-tuc-khach-san',      1)
INSERT [dbo].[Article_Categories] ([id],[name],[slug],[is_active]) VALUES (2,  N'Cẩm Nang Du Lịch',     N'cam-nang-du-lich',       1)
INSERT [dbo].[Article_Categories] ([id],[name],[slug],[is_active]) VALUES (3,  N'Khám Phá Ẩm Thực',     N'kham-pha-am-thuc',       1)
INSERT [dbo].[Article_Categories] ([id],[name],[slug],[is_active]) VALUES (4,  N'Sự Kiện & Lễ Hội',     N'su-kien-le-hoi',         1)
INSERT [dbo].[Article_Categories] ([id],[name],[slug],[is_active]) VALUES (5,  N'Chương Trình Khuyến Mãi',N'chuong-trinh-khuyen-mai',1)
INSERT [dbo].[Article_Categories] ([id],[name],[slug],[is_active]) VALUES (6,  N'Văn Hóa Địa Phương',   N'van-hoa-dia-phuong',     1)
INSERT [dbo].[Article_Categories] ([id],[name],[slug],[is_active]) VALUES (7,  N'Hướng Dẫn Di Chuyển',  N'huong-dan-di-chuyen',    1)
INSERT [dbo].[Article_Categories] ([id],[name],[slug],[is_active]) VALUES (8,  N'Góc Thư Giãn',          N'goc-thu-gian',            1)
INSERT [dbo].[Article_Categories] ([id],[name],[slug],[is_active]) VALUES (9,  N'Hỏi Đáp (FAQ)',         N'hoi-dap-faq',             1)
INSERT [dbo].[Article_Categories] ([id],[name],[slug],[is_active]) VALUES (10, N'Thư Viện Ảnh',          N'thu-vien-anh',            1)
SET IDENTITY_INSERT [dbo].[Article_Categories] OFF
GO

-- 24. Articles
SET IDENTITY_INSERT [dbo].[Articles] ON
INSERT [dbo].[Articles] ([id],[category_id],[author_id],[title],[slug],[content],[status],[is_active],[published_at])
VALUES (1,  1,  1, N'Khai trương nhà hàng Sky Lounge mới',         N'khai-truong-nha-hang-sky-lounge',   N'Nhà hàng Sky Lounge tầng 20 chính thức mở cửa từ 01/04/2026 với menu đặc biệt từ bếp trưởng quốc tế.', N'Published', 1, CAST(N'2026-03-25T08:00:00' AS DateTime))
INSERT [dbo].[Articles] ([id],[category_id],[author_id],[title],[slug],[content],[status],[is_active],[published_at])
VALUES (2,  2,  2, N'Top 5 điểm đến không thể bỏ lỡ mùa hè',      N'top-5-diem-den-mua-he',             N'Khám phá những điểm đến tuyệt vời trong bán kính 20km từ khách sạn phù hợp cho gia đình và cặp đôi.',  N'Published', 1, CAST(N'2026-03-24T09:00:00' AS DateTime))
INSERT [dbo].[Articles] ([id],[category_id],[author_id],[title],[slug],[content],[status],[is_active],[published_at])
VALUES (3,  3,  3, N'Món ngon hải sản địa phương không thể bỏ qua', N'mon-ngon-hai-san-dia-phuong',       N'Từ cá thu nướng, tôm hùm hấp đến cua rang muối — những món ăn đặc sản mà mọi du khách phải thử.',      N'Published', 1, CAST(N'2026-03-23T10:00:00' AS DateTime))
INSERT [dbo].[Articles] ([id],[category_id],[author_id],[title],[slug],[content],[status],[is_active],[published_at])
VALUES (4,  4,  1, N'Lễ hội âm nhạc quốc tế tháng 4',              N'le-hoi-am-nhac-quoc-te-thang-4',   N'The Ethereal Hotel tự hào đồng tổ chức Lễ hội Âm nhạc Quốc tế 2026 với hơn 20 nghệ sĩ nổi tiếng.',    N'Published', 1, CAST(N'2026-03-22T11:00:00' AS DateTime))
INSERT [dbo].[Articles] ([id],[category_id],[author_id],[title],[slug],[content],[status],[is_active],[published_at])
VALUES (5,  5,  2, N'Ưu đãi đặt phòng sớm hè 2026 — giảm 20%',     N'uu-dai-dat-phong-som-he-2026',      N'Đặt phòng trước 30/04 để nhận ưu đãi giảm 20% cùng bữa sáng miễn phí cho 2 người lớn.',               N'Published', 1, CAST(N'2026-03-21T08:00:00' AS DateTime))
INSERT [dbo].[Articles] ([id],[category_id],[author_id],[title],[slug],[content],[status],[is_active],[published_at])
VALUES (6,  6,  3, N'Lịch sử và văn hóa vùng biển miền Trung',      N'lich-su-van-hoa-vung-bien-mien-trung',N'Hành trình khám phá các di tích lịch sử hơn 3000 năm tuổi trong bán kính 30km từ khách sạn.',         N'Published', 1, CAST(N'2026-03-20T10:00:00' AS DateTime))
INSERT [dbo].[Articles] ([id],[category_id],[author_id],[title],[slug],[content],[status],[is_active],[published_at])
VALUES (7,  7,  1, N'Từ sân bay về khách sạn — 5 cách di chuyển',   N'tu-san-bay-ve-khach-san',           N'Hướng dẫn chi tiết các phương tiện di chuyển từ sân bay quốc tế đến The Ethereal Hotel.',              N'Published', 1, CAST(N'2026-03-18T09:00:00' AS DateTime))
INSERT [dbo].[Articles] ([id],[category_id],[author_id],[title],[slug],[content],[status],[is_active],[published_at])
VALUES (8,  8,  2, N'Bí quyết thư giãn hoàn hảo cuối tuần',         N'bi-quyet-thu-gian-cuoi-tuan',       N'Gói Wellness Weekend gồm massage 90 phút, yoga sáng và bữa tối tại nhà hàng mái vòm.',                  N'Published', 1, CAST(N'2026-03-15T10:00:00' AS DateTime))
INSERT [dbo].[Articles] ([id],[category_id],[author_id],[title],[slug],[content],[status],[is_active],[published_at])
VALUES (9,  9,  3, N'Quy định check-in, check-out và chính sách huỷ', N'quy-dinh-check-in-check-out',     N'Giờ nhận phòng từ 14:00, trả phòng trước 12:00. Huỷ miễn phí trước 48 giờ.',                          N'Published', 1, CAST(N'2026-03-10T08:00:00' AS DateTime))
INSERT [dbo].[Articles] ([id],[category_id],[author_id],[title],[slug],[content],[status],[is_active],[published_at])
VALUES (10, 10, 1, N'Bộ ảnh flycam resort mùa xuân 2026',            N'bo-anh-flycam-resort-mua-xuan',    N'Ngắm nhìn The Ethereal Hotel từ trên cao qua bộ ảnh drone ấn tượng trong dịp xuân 2026.',               N'Published', 1, CAST(N'2026-03-05T09:00:00' AS DateTime))
SET IDENTITY_INSERT [dbo].[Articles] OFF
GO

-- 25. Attractions
SET IDENTITY_INSERT [dbo].[Attractions] ON
INSERT [dbo].[Attractions] ([id],[name],[category],[address],[latitude],[longitude],[distance_km],[description],[image_url],[map_embed_link],[is_active])
VALUES (1,  N'Chợ Hàn',                N'Ẩm thực',   N'119 Trần Phú, Đà Nẵng',             CAST(16.068079 AS Decimal(9,6)), CAST(108.223230 AS Decimal(9,6)), CAST(1.20  AS Decimal(5,2)), N'Khu chợ truyền thống sầm uất nổi tiếng nhất Đà Nẵng',     NULL, N'https://maps.google.com', 1)
INSERT [dbo].[Attractions] ([id],[name],[category],[address],[latitude],[longitude],[distance_km],[description],[image_url],[map_embed_link],[is_active])
VALUES (2,  N'Bãi Biển Mỹ Khê',        N'Thiên nhiên',N'Võ Nguyên Giáp, Sơn Trà, Đà Nẵng', CAST(16.060000 AS Decimal(9,6)), CAST(108.247000 AS Decimal(9,6)), CAST(0.80  AS Decimal(5,2)), N'Một trong những bãi tắm đẹp nhất châu Á',                  NULL, N'https://maps.google.com', 1)
INSERT [dbo].[Attractions] ([id],[name],[category],[address],[latitude],[longitude],[distance_km],[description],[image_url],[map_embed_link],[is_active])
VALUES (3,  N'Bảo Tàng Điêu Khắc Chăm',N'Di tích',   N'02 Tháng 9, Đà Nẵng',               CAST(16.067000 AS Decimal(9,6)), CAST(108.221000 AS Decimal(9,6)), CAST(2.50  AS Decimal(5,2)), N'Bảo tàng lưu giữ hơn 2000 hiện vật văn hóa Chăm Pa',      NULL, N'https://maps.google.com', 1)
INSERT [dbo].[Attractions] ([id],[name],[category],[address],[latitude],[longitude],[distance_km],[description],[image_url],[map_embed_link],[is_active])
VALUES (4,  N'Cầu Rồng',               N'Giải trí',  N'Trần Hưng Đạo, Đà Nẵng',            CAST(16.061000 AS Decimal(9,6)), CAST(108.227000 AS Decimal(9,6)), CAST(1.80  AS Decimal(5,2)), N'Cây cầu phun lửa và nước biểu tượng của Đà Nẵng',          NULL, N'https://maps.google.com', 1)
INSERT [dbo].[Attractions] ([id],[name],[category],[address],[latitude],[longitude],[distance_km],[description],[image_url],[map_embed_link],[is_active])
VALUES (5,  N'Ngũ Hành Sơn',           N'Di tích',   N'Hoàng Sa, Ngũ Hành Sơn, Đà Nẵng',  CAST(16.000000 AS Decimal(9,6)), CAST(108.264000 AS Decimal(9,6)), CAST(8.00  AS Decimal(5,2)), N'Quần thể danh thắng với 5 ngọn núi đá vôi huyền bí',       NULL, N'https://maps.google.com', 1)
INSERT [dbo].[Attractions] ([id],[name],[category],[address],[latitude],[longitude],[distance_km],[description],[image_url],[map_embed_link],[is_active])
VALUES (6,  N'Sun World Đà Nẵng',      N'Giải trí',  N'Bà Nà Hills, Hòa Vang, Đà Nẵng',   CAST(15.990000 AS Decimal(9,6)), CAST(107.993000 AS Decimal(9,6)), CAST(25.00 AS Decimal(5,2)), N'Khu du lịch cao nguyên hàng đầu Đông Nam Á',               NULL, N'https://maps.google.com', 1)
INSERT [dbo].[Attractions] ([id],[name],[category],[address],[latitude],[longitude],[distance_km],[description],[image_url],[map_embed_link],[is_active])
VALUES (7,  N'Bán Đảo Sơn Trà',        N'Thiên nhiên',N'Sơn Trà, Đà Nẵng',                 CAST(16.106000 AS Decimal(9,6)), CAST(108.289000 AS Decimal(9,6)), CAST(12.00 AS Decimal(5,2)), N'Khu bảo tồn thiên nhiên với voọc chà vá đặc hữu',          NULL, N'https://maps.google.com', 1)
INSERT [dbo].[Attractions] ([id],[name],[category],[address],[latitude],[longitude],[distance_km],[description],[image_url],[map_embed_link],[is_active])
VALUES (8,  N'Làng Đá Mỹ Nghệ Non Nước',N'Di tích',  N'Hòa Hải, Ngũ Hành Sơn, Đà Nẵng',  CAST(15.996000 AS Decimal(9,6)), CAST(108.263000 AS Decimal(9,6)), CAST(9.00  AS Decimal(5,2)), N'Làng nghề điêu khắc đá lâu đời nhất miền Trung',           NULL, N'https://maps.google.com', 1)
INSERT [dbo].[Attractions] ([id],[name],[category],[address],[latitude],[longitude],[distance_km],[description],[image_url],[map_embed_link],[is_active])
VALUES (9,  N'Vincom Đà Nẵng',         N'Giải trí',  N'910A Ngô Quyền, Đà Nẵng',          CAST(16.054000 AS Decimal(9,6)), CAST(108.220000 AS Decimal(9,6)), CAST(2.20  AS Decimal(5,2)), N'Trung tâm mua sắm, ẩm thực và giải trí hiện đại',          NULL, N'https://maps.google.com', 1)
INSERT [dbo].[Attractions] ([id],[name],[category],[address],[latitude],[longitude],[distance_km],[description],[image_url],[map_embed_link],[is_active])
VALUES (10, N'Đèo Hải Vân',            N'Thiên nhiên',N'Liên Chiểu — Phú Lộc, Thừa Thiên', CAST(16.200000 AS Decimal(9,6)), CAST(108.125000 AS Decimal(9,6)), CAST(30.00 AS Decimal(5,2)), N'Cung đèo đẹp nhất Việt Nam với view biển choáng ngợp',     NULL, N'https://maps.google.com', 1)
SET IDENTITY_INSERT [dbo].[Attractions] OFF
GO

-- 26. Audit_Logs (mẫu hoạt động trong 7 ngày)
SET IDENTITY_INSERT [dbo].[Audit_Logs] ON
INSERT [dbo].[Audit_Logs] ([id],[user_id],[action],[table_name],[record_id],[old_value],[new_value],[ip_address],[created_at])
VALUES (1,  3, N'CREATE_BOOKING',    N'Bookings',      1,  NULL,                          N'{"bookingCode":"BK-0001","status":"Pending"}',     N'192.168.1.3', CAST(N'2026-03-22T10:00:00' AS DateTime))
INSERT [dbo].[Audit_Logs] ([id],[user_id],[action],[table_name],[record_id],[old_value],[new_value],[ip_address],[created_at])
VALUES (2,  3, N'CONFIRM_BOOKING',   N'Bookings',      1,  N'{"status":"Pending"}',       N'{"status":"Confirmed"}',                           N'192.168.1.3', CAST(N'2026-03-22T11:00:00' AS DateTime))
INSERT [dbo].[Audit_Logs] ([id],[user_id],[action],[table_name],[record_id],[old_value],[new_value],[ip_address],[created_at])
VALUES (3,  3, N'CHECKIN_BOOKING',   N'Bookings',      1,  N'{"status":"Confirmed"}',     N'{"status":"Checked_in"}',                          N'192.168.1.3', CAST(N'2026-03-22T14:00:00' AS DateTime))
INSERT [dbo].[Audit_Logs] ([id],[user_id],[action],[table_name],[record_id],[old_value],[new_value],[ip_address],[created_at])
VALUES (4,  3, N'CHECKOUT_BOOKING',  N'Bookings',      1,  N'{"status":"Checked_in"}',    N'{"status":"Completed"}',                           N'192.168.1.3', CAST(N'2026-03-24T11:00:00' AS DateTime))
INSERT [dbo].[Audit_Logs] ([id],[user_id],[action],[table_name],[record_id],[old_value],[new_value],[ip_address],[created_at])
VALUES (5,  1, N'UPDATE_ROOM',       N'Rooms',         3,  N'{"cleaningStatus":"Clean"}', N'{"cleaningStatus":"Dirty"}',                       N'192.168.1.1', CAST(N'2026-03-24T12:00:00' AS DateTime))
INSERT [dbo].[Audit_Logs] ([id],[user_id],[action],[table_name],[record_id],[old_value],[new_value],[ip_address],[created_at])
VALUES (6,  3, N'CHECKOUT_BOOKING',  N'Bookings',      2,  N'{"status":"Checked_in"}',    N'{"status":"Completed"}',                           N'192.168.1.3', CAST(N'2026-03-25T11:00:00' AS DateTime))
INSERT [dbo].[Audit_Logs] ([id],[user_id],[action],[table_name],[record_id],[old_value],[new_value],[ip_address],[created_at])
VALUES (7,  1, N'LOCK_ACCOUNT',      N'Users',         8,  N'{"status":1}',               N'{"status":0}',                                     N'192.168.1.1', CAST(N'2026-03-26T09:00:00' AS DateTime))
INSERT [dbo].[Audit_Logs] ([id],[user_id],[action],[table_name],[record_id],[old_value],[new_value],[ip_address],[created_at])
VALUES (8,  1, N'UNLOCK_ACCOUNT',    N'Users',         8,  N'{"status":0}',               N'{"status":1}',                                     N'192.168.1.1', CAST(N'2026-03-26T09:30:00' AS DateTime))
INSERT [dbo].[Audit_Logs] ([id],[user_id],[action],[table_name],[record_id],[old_value],[new_value],[ip_address],[created_at])
VALUES (9,  3, N'CHECKIN_BOOKING',   N'Bookings',      6,  N'{"status":"Confirmed"}',     N'{"status":"Checked_in"}',                          N'192.168.1.3', CAST(N'2026-03-27T14:00:00' AS DateTime))
INSERT [dbo].[Audit_Logs] ([id],[user_id],[action],[table_name],[record_id],[old_value],[new_value],[ip_address],[created_at])
VALUES (10, 3, N'CHECKIN_BOOKING',   N'Bookings',      7,  N'{"status":"Confirmed"}',     N'{"status":"Checked_in"}',                          N'192.168.1.3', CAST(N'2026-03-28T09:00:00' AS DateTime))
SET IDENTITY_INSERT [dbo].[Audit_Logs] OFF
GO

-- ============================================================
-- Voucher_Usage — ghi lại các voucher đã dùng
-- ============================================================
SET IDENTITY_INSERT [dbo].[Voucher_Usage] ON
INSERT [dbo].[Voucher_Usage] ([id],[voucher_id],[user_id],[booking_id],[used_at])
VALUES (1, 1, 7, 2, CAST(N'2026-03-23T10:30:00' AS DateTime))
INSERT [dbo].[Voucher_Usage] ([id],[voucher_id],[user_id],[booking_id],[used_at])
VALUES (2, 2, 9, 4, CAST(N'2026-03-25T10:30:00' AS DateTime))
INSERT [dbo].[Voucher_Usage] ([id],[voucher_id],[user_id],[booking_id],[used_at])
VALUES (3, 3, 6, 6, CAST(N'2026-03-26T20:00:00' AS DateTime))
SET IDENTITY_INSERT [dbo].[Voucher_Usage] OFF
GO

-- ============================================================
-- Activity_Logs — thông báo realtime mẫu trong 7 ngày
-- ============================================================
SET IDENTITY_INSERT [dbo].[Activity_Logs] ON
INSERT [dbo].[Activity_Logs] ([id],[user_id],[role_name],[action_code],[action_label],[entity_type],[entity_id],[entity_label],[severity],[message],[created_at])
VALUES (1,  3, N'Receptionist', N'CREATE_BOOKING',   N'Đặt phòng mới',       N'Booking', 1,  N'BK-0001', N'Success', N'Khách hàng Khách Hàng A đã đặt phòng thành công (BK-0001). Tổng: 800.000đ',          CAST(N'2026-03-22T10:00:00' AS DateTime))
INSERT [dbo].[Activity_Logs] ([id],[user_id],[role_name],[action_code],[action_label],[entity_type],[entity_id],[entity_label],[severity],[message],[created_at])
VALUES (2,  3, N'Receptionist', N'CHECKIN_BOOKING',  N'Check-in khách',       N'Booking', 1,  N'BK-0001', N'Success', N'Lê Lễ Tân đã thực hiện check-in cho khách Khách Hàng A (BK-0001).',                  CAST(N'2026-03-22T14:00:00' AS DateTime))
INSERT [dbo].[Activity_Logs] ([id],[user_id],[role_name],[action_code],[action_label],[entity_type],[entity_id],[entity_label],[severity],[message],[created_at])
VALUES (3,  3, N'Receptionist', N'CHECKOUT_BOOKING', N'Check-out khách',      N'Booking', 1,  N'BK-0001', N'Success', N'Lê Lễ Tân đã thực hiện check-out cho khách Khách Hàng A (BK-0001).',                 CAST(N'2026-03-24T11:00:00' AS DateTime))
INSERT [dbo].[Activity_Logs] ([id],[user_id],[role_name],[action_code],[action_label],[entity_type],[entity_id],[entity_label],[severity],[message],[created_at])
VALUES (4,  3, N'Receptionist', N'CHECKOUT_BOOKING', N'Check-out khách',      N'Booking', 2,  N'BK-0002', N'Success', N'Lê Lễ Tân đã thực hiện check-out cho khách Khách Hàng B (BK-0002).',                 CAST(N'2026-03-25T11:00:00' AS DateTime))
INSERT [dbo].[Activity_Logs] ([id],[user_id],[role_name],[action_code],[action_label],[entity_type],[entity_id],[entity_label],[severity],[message],[created_at])
VALUES (5,  1, N'Admin',        N'LOCK_ACCOUNT',     N'Khóa tài khoản',       N'User',    8,  N'guestC@gmail.com', N'Warning', N'Nguyễn Admin đã khóa tài khoản của Khách Hàng C (guestC@gmail.com).', CAST(N'2026-03-26T09:00:00' AS DateTime))
INSERT [dbo].[Activity_Logs] ([id],[user_id],[role_name],[action_code],[action_label],[entity_type],[entity_id],[entity_label],[severity],[message],[created_at])
VALUES (6,  1, N'Admin',        N'UNLOCK_ACCOUNT',   N'Mở khóa tài khoản',   N'User',    8,  N'guestC@gmail.com', N'Success', N'Nguyễn Admin đã mở khóa tài khoản của Khách Hàng C.',                CAST(N'2026-03-26T09:30:00' AS DateTime))
INSERT [dbo].[Activity_Logs] ([id],[user_id],[role_name],[action_code],[action_label],[entity_type],[entity_id],[entity_label],[severity],[message],[created_at])
VALUES (7,  3, N'Receptionist', N'CHECKIN_BOOKING',  N'Check-in khách',       N'Booking', 6,  N'BK-0006', N'Success', N'Lê Lễ Tân đã thực hiện check-in cho khách Khách Vãng Lai 1 (BK-0006).',             CAST(N'2026-03-27T14:00:00' AS DateTime))
INSERT [dbo].[Activity_Logs] ([id],[user_id],[role_name],[action_code],[action_label],[entity_type],[entity_id],[entity_label],[severity],[message],[created_at])
VALUES (8,  1, N'Admin',        N'CREATE_USER',      N'Tạo tài khoản mới',   N'User',    10, N'guestE@gmail.com', N'Success', N'Nguyễn Admin đã tạo tài khoản nhân viên mới cho Khách Hàng E.',       CAST(N'2026-03-27T08:00:00' AS DateTime))
INSERT [dbo].[Activity_Logs] ([id],[user_id],[role_name],[action_code],[action_label],[entity_type],[entity_id],[entity_label],[severity],[message],[created_at])
VALUES (9,  2, N'Manager',      N'UPDATE_ROOM',      N'Cập nhật phòng',       N'Room',    4,  N'202',     N'Info',    N'Trần Manager đã cập nhật thông tin phòng 202 (chuyển sang Disabled để bảo trì).',    CAST(N'2026-03-27T10:00:00' AS DateTime))
INSERT [dbo].[Activity_Logs] ([id],[user_id],[role_name],[action_code],[action_label],[entity_type],[entity_id],[entity_label],[severity],[message],[created_at])
VALUES (10, 3, N'Receptionist', N'CHECKIN_BOOKING',  N'Check-in khách',       N'Booking', 7,  N'BK-0007', N'Success', N'Lê Lễ Tân đã thực hiện check-in cho khách Khách Vãng Lai 2 (BK-0007).',             CAST(N'2026-03-28T09:00:00' AS DateTime))
SET IDENTITY_INSERT [dbo].[Activity_Logs] OFF
GO

PRINT '============================================================'
PRINT 'HotelManagementDB seeded thành công!'
PRINT 'Tài khoản đăng nhập: admin@hotel.com / Admin@123'
PRINT ''
PRINT 'Tóm tắt booking 7 ngày (22-28/03/2026):'
PRINT '  BK-0001  Completed  check-out 24/03  800.000đ'
PRINT '  BK-0002  Completed  check-out 25/03  1.350.000đ'
PRINT '  BK-0003  Completed  check-out 26/03  1.400.000đ'
PRINT '  BK-0004  Completed  check-out 27/03  2.600.000đ'
PRINT '  BK-0005  Completed  check-out 28/03  3.600.000đ'
PRINT '  BK-0006  Checked_in CI 27/03         đang ở'
PRINT '  BK-0007  Checked_in CI 28/03         đang ở'
PRINT '  BK-0008  Confirmed  CI 29/03         chờ check-in'
PRINT '  BK-0009  Pending    CI 30/03         chờ xác nhận'
PRINT '  BK-0010  Cancelled  huỷ 22/03'
PRINT '============================================================'
GO