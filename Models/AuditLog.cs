using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Models
{
    public class AuditLog
    {
        [Key]
        public int Id { get; set; }

        public int? UserId { get; set; }

        [Required]
        [StringLength(50)]
        public string Action { get; set; } = null!;

        [Required]
        [StringLength(100)]
        public string TableName { get; set; } = null!;

        public int RecordId { get; set; }

        public string? OldValue { get; set; }
        public string? NewValue { get; set; }

        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(UserId))]
        public virtual User? User { get; set; }
    }
}