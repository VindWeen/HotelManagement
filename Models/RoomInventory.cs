using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Models
{
    public class RoomInventory
    {
        [Key]
        public int Id { get; set; }

        public int? RoomId { get; set; }

        [Required]
        [StringLength(255)]
        public string ItemName { get; set; } = null!;

        public int? Quantity { get; set; } = 1;

        [Column(TypeName = "decimal(18,2)")]
        public decimal? PriceIfLost { get; set; }

        [ForeignKey(nameof(RoomId))]
        public virtual Room? Room { get; set; }

        // One-to-Many với LossAndDamage
        public virtual ICollection<LossAndDamage>? LossAndDamages { get; set; } = new List<LossAndDamage>();
    }
}