using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Models
{
    public class LossAndDamage
    {
        [Key]
        public int Id { get; set; }

        public int? BookingDetailId { get; set; }
        public int? RoomInventoryId { get; set; }

        [Required]
        public int Quantity { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal PenaltyAmount { get; set; }

        public string? Description { get; set; }

        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(BookingDetailId))]
        public virtual BookingDetail? BookingDetail { get; set; }

        [ForeignKey(nameof(RoomInventoryId))]
        public virtual RoomInventory? RoomInventory { get; set; }
    }
}