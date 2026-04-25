using HotelManagement.Core.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using System.Text.Json;

namespace HotelManagement.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // ── Cluster 1: System, Auth & HR ────────────────────────────
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Membership> Memberships => Set<Membership>();
    public DbSet<User> Users => Set<User>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<ActivityLogRead> ActivityLogReads => Set<ActivityLogRead>();
    public DbSet<DashboardSnapshot> DashboardSnapshots => Set<DashboardSnapshot>();

    // ── Cluster 2: Room Management ───────────────────────────────
    public DbSet<Amenity> Amenities => Set<Amenity>();
    public DbSet<RoomType> RoomTypes => Set<RoomType>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<RoomTypeAmenity> RoomTypeAmenities => Set<RoomTypeAmenity>();
    public DbSet<RoomImage> RoomImages => Set<RoomImage>();
    public DbSet<Equipment> Equipments => Set<Equipment>();
    public DbSet<RoomInventory> RoomInventories => Set<RoomInventory>();
    public DbSet<MaintenanceTicket> MaintenanceTickets => Set<MaintenanceTicket>();

    // ── Cluster 3: Booking & Promotions ─────────────────────────
    public DbSet<Voucher> Vouchers => Set<Voucher>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<BookingDetail> BookingDetails => Set<BookingDetail>();

    // ── Cluster 4: Services & Operations ────────────────────────
    public DbSet<ServiceCategory> ServiceCategories => Set<ServiceCategory>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<OrderService> OrderServices => Set<OrderService>();
    public DbSet<OrderServiceDetail> OrderServiceDetails => Set<OrderServiceDetail>();
    public DbSet<LossAndDamage> LossAndDamages => Set<LossAndDamage>();

    // ── Cluster 5: Billing, Reviews & CMS ───────────────────────
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceAdjustment> InvoiceAdjustments => Set<InvoiceAdjustment>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<ArticleCategory> ArticleCategories => Set<ArticleCategory>();
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<Attraction> Attractions => Set<Attraction>();

    // ── Cluster 6 & 7: HR & Loyalty ─────────────────────────────
    public DbSet<Shift> Shifts => Set<Shift>();
    public DbSet<LoyaltyTransaction> LoyaltyTransactions => Set<LoyaltyTransaction>();
    public DbSet<VoucherUsage> VoucherUsages => Set<VoucherUsage>();
    public DbSet<VoucherTargetUser> VoucherTargetUsers => Set<VoucherTargetUser>();

    public override int SaveChanges()
    {
        NormalizeAuditLogs();
        return base.SaveChanges();
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        NormalizeAuditLogs();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await NormalizeAuditLogsAsync(cancellationToken);
        return await base.SaveChangesAsync(cancellationToken);
    }

    public override async Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        await NormalizeAuditLogsAsync(cancellationToken);
        return await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── 1. Map tên bảng SQL (snake_case / underscore) ────────
        modelBuilder.Entity<AuditLog>().ToTable("Audit_Logs");
        modelBuilder.Entity<AuditLog>()
            .Property(a => a.LogDate)
            .HasColumnType("date");
        modelBuilder.Entity<AuditLog>()
            .HasIndex(a => a.LogDate);
        modelBuilder.Entity<AuditLog>()
            .HasIndex(a => new { a.UserId, a.LogDate });
        modelBuilder.Entity<AuditLog>()
            .HasIndex(a => a.RoleName);
        modelBuilder.Entity<RoomType>().ToTable("Room_Types");
        modelBuilder.Entity<RoomTypeAmenity>().ToTable("RoomType_Amenities");
        modelBuilder.Entity<RoomImage>().ToTable("Room_Images");
        modelBuilder.Entity<Equipment>().ToTable("Equipments");
        modelBuilder.Entity<RoomInventory>().ToTable("Room_Inventory");
        modelBuilder.Entity<RolePermission>().ToTable("Role_Permissions");
        modelBuilder.Entity<BookingDetail>().ToTable("Booking_Details");
        modelBuilder.Entity<ServiceCategory>().ToTable("Service_Categories");
        modelBuilder.Entity<OrderService>().ToTable("Order_Services");
        modelBuilder.Entity<OrderServiceDetail>().ToTable("Order_Service_Details");
        modelBuilder.Entity<LossAndDamage>().ToTable("Loss_And_Damages");
        modelBuilder.Entity<MaintenanceTicket>().ToTable("Maintenance_Tickets");
        modelBuilder.Entity<InvoiceAdjustment>().ToTable("Invoice_Adjustments");
        modelBuilder.Entity<ArticleCategory>().ToTable("Article_Categories");
        modelBuilder.Entity<LoyaltyTransaction>().ToTable("Loyalty_Transactions");
        modelBuilder.Entity<VoucherUsage>().ToTable("Voucher_Usage");
        modelBuilder.Entity<VoucherTargetUser>().ToTable("Voucher_Target_Users");
        modelBuilder.Entity<ActivityLog>().ToTable("Activity_Logs");
        modelBuilder.Entity<ActivityLog>()
            .HasIndex(a => new { a.UserId, a.CreatedAt });

        modelBuilder.Entity<ActivityLog>()
            .HasIndex(a => new { a.EntityType, a.EntityId });

        // Index cho màn hình thông báo: OrderBy CreatedAt DESC
        modelBuilder.Entity<ActivityLog>()
            .HasIndex(a => a.CreatedAt);

        // Index cho filter ActionCode
        modelBuilder.Entity<ActivityLog>()
            .HasIndex(a => a.ActionCode);

        // ── ActivityLogRead: per-user read status ─────────────────
        modelBuilder.Entity<ActivityLogRead>().ToTable("Activity_Log_Reads");

        // Unique: mỗi user chỉ đọc 1 lần / 1 log entry
        modelBuilder.Entity<ActivityLogRead>()
            .HasIndex(r => new { r.ActivityLogId, r.UserId })
            .IsUnique();

        // Index tìm nhanh: "chưa đọc của user X"
        modelBuilder.Entity<ActivityLogRead>()
            .HasIndex(r => r.UserId);

        modelBuilder.Entity<ActivityLogRead>()
            .HasOne(r => r.ActivityLog)
            .WithMany(a => a.Reads)
            .HasForeignKey(r => r.ActivityLogId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ActivityLogRead>()
            .HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── DashboardSnapshot ─────────────────────────────────────
        modelBuilder.Entity<DashboardSnapshot>().ToTable("Dashboard_Snapshots");
        modelBuilder.Entity<DashboardSnapshot>()
            .HasIndex(s => new { s.RoleName, s.SnapshotDate })
            .IsUnique();
        modelBuilder.Entity<DashboardSnapshot>()
            .HasIndex(s => new { s.RoleName, s.ComputedAt });
        modelBuilder.Entity<DashboardSnapshot>()
            .Property(s => s.SnapshotDate)
            .HasColumnType("date");

        // ── 2. Composite Primary Keys cho bảng join ──────────────
        modelBuilder.Entity<RolePermission>()
            .HasKey(rp => new { rp.RoleId, rp.PermissionId });

        modelBuilder.Entity<RoomTypeAmenity>()
            .HasKey(rta => new { rta.RoomTypeId, rta.AmenityId });

        modelBuilder.Entity<VoucherTargetUser>()
            .HasKey(vtu => new { vtu.VoucherId, vtu.UserId });

        // ── 3. Unique Indexes ─────────────────────────────────────
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email).IsUnique();

        modelBuilder.Entity<Voucher>()
            .HasIndex(v => v.Code).IsUnique();

        modelBuilder.Entity<Voucher>()
            .HasOne(v => v.TargetMembership)
            .WithMany()
            .HasForeignKey(v => v.TargetMembershipId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<VoucherTargetUser>()
            .HasOne(vtu => vtu.Voucher)
            .WithMany(v => v.TargetUsers)
            .HasForeignKey(vtu => vtu.VoucherId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<VoucherTargetUser>()
            .HasOne(vtu => vtu.User)
            .WithMany(u => u.VoucherTargets)
            .HasForeignKey(vtu => vtu.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Booking>()
            .HasIndex(b => b.BookingCode).IsUnique();

        modelBuilder.Entity<Article>()
            .HasIndex(a => a.Slug).IsUnique();

        // Filtered unique: NULL slug không bị vi phạm unique
        modelBuilder.Entity<RoomType>()
            .HasIndex(rt => rt.Slug)
            .IsUnique()
            .HasFilter("[slug] IS NOT NULL");

        modelBuilder.Entity<ArticleCategory>()
            .HasIndex(ac => ac.Slug)
            .IsUnique()
            .HasFilter("[slug] IS NOT NULL");

        // Filtered unique: mỗi user chỉ review 1 lần mỗi booking
        modelBuilder.Entity<Review>()
            .HasIndex(r => new { r.UserId, r.BookingId })
            .IsUnique()
            .HasFilter("[booking_id] IS NOT NULL");

        // ── 4. Quan hệ có nhiều FK trỏ về cùng 1 bảng ───────────

        // Shifts: User có 2 FK về Users (UserId và ConfirmedBy)
        modelBuilder.Entity<Shift>()
            .HasOne(s => s.User)
            .WithMany(u => u.Shifts)
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Shift>()
            .HasOne(s => s.ConfirmedByUser)
            .WithMany(u => u.ConfirmedShifts)
            .HasForeignKey(s => s.ConfirmedBy)
            .OnDelete(DeleteBehavior.Restrict);

        // LossAndDamage: ReportedBy → Users
        modelBuilder.Entity<LossAndDamage>()
            .HasOne(l => l.Reporter)
            .WithMany(u => u.ReportedDamages)
            .HasForeignKey(l => l.ReportedBy)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<MaintenanceTicket>()
            .HasOne(t => t.Room)
            .WithMany(r => r.MaintenanceTickets)
            .HasForeignKey(t => t.RoomId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<MaintenanceTicket>()
            .HasOne(t => t.ReportedByUser)
            .WithMany(u => u.ReportedMaintenanceTickets)
            .HasForeignKey(t => t.ReportedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<MaintenanceTicket>()
            .HasOne(t => t.AssignedToUser)
            .WithMany(u => u.AssignedMaintenanceTickets)
            .HasForeignKey(t => t.AssignedToUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Payment>()
            .HasOne(p => p.Booking)
            .WithMany(b => b.Payments)
            .HasForeignKey(p => p.BookingId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Payment>()
            .HasOne(p => p.Invoice)
            .WithMany(i => i.Payments)
            .HasForeignKey(p => p.InvoiceId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Payment>()
            .HasIndex(p => p.BookingId);

        modelBuilder.Entity<Article>()
            .HasOne(a => a.Attraction)
            .WithMany(a => a.Articles)
            .HasForeignKey(a => a.AttractionId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<RoomInventory>()
            .HasOne(ri => ri.Equipment)
            .WithMany(e => e.RoomInventories)
            .HasForeignKey(ri => ri.EquipmentId)
            .OnDelete(DeleteBehavior.Restrict);

        // Equipments.in_stock_quantity là computed column trong SQL
        // -> EF chỉ đọc giá trị, không ghi trực tiếp khi insert/update.
        modelBuilder.Entity<Equipment>()
            .Property(e => e.InStockQuantity)
            .HasComputedColumnSql("(([total_quantity]-[in_use_quantity])-[damaged_quantity])-[liquidated_quantity]", stored: false);

        // ── 5. Map tên cột snake_case cho toàn bộ entity ─────────
        // EF Core mặc định dùng PascalCase, SQL dùng snake_case
        // Convention này convert tự động: RoomTypeId → room_type_id
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                property.SetColumnName(ToSnakeCase(property.Name));
            }

            foreach (var key in entity.GetKeys())
            {
                key.SetName(ToSnakeCase(key.GetName()!));
            }

            foreach (var fk in entity.GetForeignKeys())
            {
                fk.SetConstraintName(ToSnakeCase(fk.GetConstraintName()!));
            }

            foreach (var index in entity.GetIndexes())
            {
                index.SetDatabaseName(ToSnakeCase(index.GetDatabaseName()!));
            }
        }
    }

    // Helper: PascalCase / camelCase → snake_case
    private static string ToSnakeCase(string name)
    {
        return Regex.Replace(name, @"([a-z0-9])([A-Z])", "$1_$2").ToLower();
    }

    private void NormalizeAuditLogs()
    {
        var pending = ChangeTracker.Entries<AuditLog>()
            .Where(x => x.State == EntityState.Added)
            .Select(x => x.Entity)
            .Where(x => string.IsNullOrWhiteSpace(x.LogData) || string.IsNullOrWhiteSpace(x.RoleName))
            .ToList();

        if (pending.Count == 0) return;

        var rolesByUserId = BuildAuditRoleLookup(pending.Select(x => x.UserId).Where(x => x.HasValue).Select(x => x!.Value));

        foreach (var auditLog in pending)
        {
            NormalizeAuditLog(auditLog, rolesByUserId);
        }
    }

    private async Task NormalizeAuditLogsAsync(CancellationToken cancellationToken)
    {
        var pending = ChangeTracker.Entries<AuditLog>()
            .Where(x => x.State == EntityState.Added)
            .Select(x => x.Entity)
            .Where(x => string.IsNullOrWhiteSpace(x.LogData) || string.IsNullOrWhiteSpace(x.RoleName))
            .ToList();

        if (pending.Count == 0) return;

        var userIds = pending
            .Select(x => x.UserId)
            .Where(x => x.HasValue)
            .Select(x => x!.Value)
            .Distinct()
            .ToList();

        var rolesByUserId = await Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Include(u => u.Role)
            .ToDictionaryAsync(u => u.Id, u => u.Role != null ? u.Role.Name : "System", cancellationToken);

        foreach (var auditLog in pending)
        {
            NormalizeAuditLog(auditLog, rolesByUserId);
        }
    }

    private Dictionary<int, string> BuildAuditRoleLookup(IEnumerable<int> userIds)
    {
        var ids = userIds.Distinct().ToList();
        if (ids.Count == 0) return new Dictionary<int, string>();

        return Users
            .AsNoTracking()
            .Where(u => ids.Contains(u.Id))
            .Include(u => u.Role)
            .ToDictionary(u => u.Id, u => u.Role != null ? u.Role.Name : "System");
    }

    private static void NormalizeAuditLog(AuditLog auditLog, IReadOnlyDictionary<int, string> rolesByUserId)
    {
        if (string.IsNullOrWhiteSpace(auditLog.RoleName))
        {
            auditLog.RoleName = auditLog.UserId.HasValue && rolesByUserId.TryGetValue(auditLog.UserId.Value, out var roleName)
                ? roleName
                : "System";
        }

        var eventTime = auditLog.CreatedAt ?? DateTime.UtcNow;
        if (auditLog.LogDate == default)
        {
            auditLog.LogDate = eventTime.Date;
        }

        if (string.IsNullOrWhiteSpace(auditLog.LogData))
        {
            var actionType = string.IsNullOrWhiteSpace(auditLog.Action) ? "UPDATE" : auditLog.Action!.Trim();
            var payload = new
            {
                TotalEvents = 1,
                Summary = new
                {
                    text = BuildLegacySummary(auditLog)
                },
                Events = new[]
                {
                    new
                    {
                        eventId = Guid.NewGuid().ToString(),
                        timestamp = eventTime,
                        actionType,
                        entityType = string.IsNullOrWhiteSpace(auditLog.TableName) ? "System" : auditLog.TableName,
                        context = new
                        {
                            recordId = auditLog.RecordId,
                            userAgent = auditLog.UserAgent
                        },
                        changes = new
                        {
                            oldData = TryParseJson(auditLog.OldValue),
                            newData = TryParseJson(auditLog.NewValue)
                        },
                        message = BuildLegacySummary(auditLog)
                    }
                }
            };

            auditLog.LogData = JsonSerializer.Serialize(payload);
        }
    }

    private static object? TryParseJson(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;

        try
        {
            using var document = JsonDocument.Parse(raw);
            return document.RootElement.Clone();
        }
        catch
        {
            return raw;
        }
    }

    private static string BuildLegacySummary(AuditLog auditLog)
    {
        if (!string.IsNullOrWhiteSpace(auditLog.Action))
        {
            return auditLog.Action!.ToUpperInvariant() switch
            {
                "LOGIN" => "Đăng nhập hệ thống.",
                "LOGOUT" => "Đăng xuất hệ thống.",
                "REGISTER" => "Đăng ký tài khoản mới.",
                "FORGOT_PASSWORD_RESET" => "Đặt lại mật khẩu bằng quên mật khẩu.",
                "GRANT_PERMISSION" => "Cấp quyền cho vai trò.",
                "REVOKE_PERMISSION" => "Thu hồi quyền khỏi vai trò.",
                _ => $"{auditLog.Action} {auditLog.TableName ?? "System"}#{auditLog.RecordId}"
            };
        }

        return $"{auditLog.TableName ?? "System"}#{auditLog.RecordId}";
    }
}
