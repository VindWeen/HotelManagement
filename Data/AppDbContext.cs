using Microsoft.EntityFrameworkCore;
using HotelManagement.Models;

namespace HotelManagement.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // DbSet cho tất cả các bảng
        public DbSet<Amenity> Amenities { get; set; }
        public DbSet<ArticleCategory> ArticleCategories { get; set; }
        public DbSet<Article> Articles { get; set; }
        public DbSet<Attraction> Attractions { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<BookingDetail> BookingDetails { get; set; }
        public DbSet<Booking> Bookings { get; set; }
        public DbSet<Invoice> Invoices { get; set; }
        public DbSet<LossAndDamage> LossAndDamages { get; set; }
        public DbSet<Membership> Memberships { get; set; }
        public DbSet<OrderServiceDetail> OrderServiceDetails { get; set; }
        public DbSet<OrderService> OrderServices { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Permission> Permissions { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<RolePermission> RolePermissions { get; set; }
        public DbSet<RoomImage> RoomImages { get; set; }
        public DbSet<RoomInventory> RoomInventories { get; set; }
        public DbSet<RoomType> RoomTypes { get; set; }
        public DbSet<Room> Rooms { get; set; }
        public DbSet<RoomTypeAmenity> RoomTypeAmenities { get; set; }
        public DbSet<ServiceCategory> ServiceCategories { get; set; }
        public DbSet<Service> Services { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Voucher> Vouchers { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Cấu hình Many-to-Many cho Role_Permissions
            modelBuilder.Entity<RolePermission>()
                .HasKey(rp => new { rp.RoleId, rp.PermissionId });

            modelBuilder.Entity<RolePermission>()
                .HasOne(rp => rp.Role)
                .WithMany(r => r.RolePermissions)
                .HasForeignKey(rp => rp.RoleId);

            modelBuilder.Entity<RolePermission>()
                .HasOne(rp => rp.Permission)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(rp => rp.PermissionId);

            // Cấu hình Many-to-Many cho RoomType_Amenities
            modelBuilder.Entity<RoomTypeAmenity>()
                .HasKey(rta => new { rta.RoomTypeId, rta.AmenityId });

            modelBuilder.Entity<RoomTypeAmenity>()
                .HasOne(rta => rta.RoomType)
                .WithMany(rt => rt.RoomTypeAmenities)
                .HasForeignKey(rta => rta.RoomTypeId);

            modelBuilder.Entity<RoomTypeAmenity>()
                .HasOne(rta => rta.Amenity)
                .WithMany(a => a.RoomTypeAmenities)
                .HasForeignKey(rta => rta.AmenityId);

            // Các quan hệ 1:N khác (nếu cần override thêm)
            modelBuilder.Entity<User>()
                .HasOne(u => u.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(u => u.RoleId);

            modelBuilder.Entity<User>()
                .HasOne(u => u.Membership)
                .WithMany(m => m.Users)
                .HasForeignKey(u => u.MembershipId);

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.User)
                .WithMany(u => u.Bookings)
                .HasForeignKey(b => b.UserId);

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.Voucher)
                .WithMany(v => v.Bookings)
                .HasForeignKey(b => b.VoucherId);

            // ... bạn có thể thêm các cấu hình khác nếu EF tự map chưa đúng

            // Đảm bảo unique constraints
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<Booking>()
                .HasIndex(b => b.BookingCode)
                .IsUnique();

            modelBuilder.Entity<Voucher>()
                .HasIndex(v => v.Code)
                .IsUnique();

            modelBuilder.Entity<Article>()
                .HasIndex(a => a.Slug)
                .IsUnique();
        }
    }
}