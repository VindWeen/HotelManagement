using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Models
{
    public class Booking
    {
        [Key]
        public int Id { get; set; }

        public int? UserId { get; set; }

        [StringLength(255)]
        public string? GuestName { get; set; }

        [StringLength(50)]
        public string? GuestPhone { get; set; }

        [StringLength(255)]
        public string? GuestEmail { get; set; }

        [Required]
        [StringLength(50)]
        public string BookingCode { get; set; } = null!;

        public int? VoucherId { get; set; }

        [StringLength(50)]
        public string? Status { get; set; } = "Pending";

        // Navigation properties
        [ForeignKey(nameof(UserId))]
        public virtual User? User { get; set; }

        [ForeignKey(nameof(VoucherId))]
        public virtual Voucher? Voucher { get; set; }

        // One-to-Many
        public virtual ICollection<BookingDetail> BookingDetails { get; set; } = new List<BookingDetail>();
        public virtual ICollection<Invoice>? Invoices { get; set; } = new List<Invoice>();
    }
}