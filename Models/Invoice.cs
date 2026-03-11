using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Models
{
    public class Invoice
    {
        [Key]
        public int Id { get; set; }

        public int? BookingId { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? TotalRoomAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? TotalServiceAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? DiscountAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? TaxAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? FinalTotal { get; set; }

        [StringLength(50)]
        public string? Status { get; set; } = "Unpaid";

        // Navigation properties
        [ForeignKey(nameof(BookingId))]
        public virtual Booking? Booking { get; set; }

        public virtual ICollection<Payment>? Payments { get; set; } = new List<Payment>();
    }
}