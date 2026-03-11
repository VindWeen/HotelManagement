using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Models
{
    public class OrderService
    {
        [Key]
        public int Id { get; set; }

        public int? BookingDetailId { get; set; }

        public DateTime? OrderDate { get; set; } = DateTime.UtcNow;

        [Column(TypeName = "decimal(18,2)")]
        public decimal? TotalAmount { get; set; }

        [StringLength(50)]
        public string? Status { get; set; } = "Pending";

        [ForeignKey(nameof(BookingDetailId))]
        public virtual BookingDetail? BookingDetail { get; set; }

        // One-to-Many
        public virtual ICollection<OrderServiceDetail> OrderServiceDetails { get; set; } = new List<OrderServiceDetail>();
    }
}