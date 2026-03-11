using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Models
{
    public class User
    {
        [Key]
        public int Id { get; set; }

        public int? RoleId { get; set; }
        public int? MembershipId { get; set; }

        [Required]
        [StringLength(255)]
        public string FullName { get; set; } = null!;

        [Required]
        [StringLength(255)]
        public string Email { get; set; } = null!;

        [StringLength(50)]
        public string? Phone { get; set; }

        [Required]
        public string PasswordHash { get; set; } = null!;

        public bool? Status { get; set; } = true;

        // Navigation properties
        [ForeignKey(nameof(RoleId))]
        public virtual Role? Role { get; set; }

        [ForeignKey(nameof(MembershipId))]
        public virtual Membership? Membership { get; set; }

        // One-to-Many
        public virtual ICollection<Booking>? Bookings { get; set; } = new List<Booking>();
        public virtual ICollection<Review>? Reviews { get; set; } = new List<Review>();
        public virtual ICollection<Article>? Articles { get; set; } = new List<Article>();
        public virtual ICollection<AuditLog>? AuditLogs { get; set; } = new List<AuditLog>();
    }
}