using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Models
{
    public class Membership
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string TierName { get; set; } = null!;

        public int? MinPoints { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal? DiscountPercent { get; set; }

        // Navigation property
        public virtual ICollection<User>? Users { get; set; } = new List<User>();
    }
}