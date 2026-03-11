using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Models
{
    public class Service
    {
        [Key]
        public int Id { get; set; }

        public int? CategoryId { get; set; }

        [Required]
        [StringLength(255)]
        public string Name { get; set; } = null!;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }

        [StringLength(50)]
        public string? Unit { get; set; }

        [ForeignKey(nameof(CategoryId))]
        public virtual ServiceCategory? Category { get; set; }

        // One-to-Many với OrderServiceDetail
        public virtual ICollection<OrderServiceDetail>? OrderServiceDetails { get; set; } = new List<OrderServiceDetail>();
    }
}