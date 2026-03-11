using System.ComponentModel.DataAnnotations;

namespace HotelManagement.Models
{
    public class ServiceCategory
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(255)]
        public string Name { get; set; } = null!;

        // Navigation property
        public virtual ICollection<Service>? Services { get; set; } = new List<Service>();
    }
}