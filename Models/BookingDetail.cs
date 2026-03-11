using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Models
{
    public class BookingDetail
    {
        [Key]
        public int Id { get; set; }

        public int? BookingId { get; set; }
        public int? RoomId { get; set; }
        public int? RoomTypeId { get; set; }

        [Required]
        public DateTime CheckInDate { get; set; }

        [Required]
        public DateTime CheckOutDate { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal PricePerNight { get; set; }

        // Navigation properties
        [ForeignKey(nameof(BookingId))]
        public virtual Booking? Booking { get; set; }

        [ForeignKey(nameof(RoomId))]
        public virtual Room? Room { get; set; }

        [ForeignKey(nameof(RoomTypeId))]
        public virtual RoomType? RoomType { get; set; }

        // One-to-Many với OrderService và LossAndDamage
        public virtual ICollection<OrderService>? OrderServices { get; set; } = new List<OrderService>();
        public virtual ICollection<LossAndDamage>? LossAndDamages { get; set; } = new List<LossAndDamage>();
    }
}