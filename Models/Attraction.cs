using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Models
{
    public class Attraction
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(255)]
        public string Name { get; set; } = null!;

        [Column(TypeName = "decimal(5,2)")]
        public decimal? DistanceKm { get; set; }

        public string? Description { get; set; }

        public string? MapEmbedLink { get; set; }
    }
}