using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Models
{
    public class RoomType
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(255)]
        public string Name { get; set; } = null!;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal BasePrice { get; set; }

        [Required]
        public int CapacityAdults { get; set; }

        [Required]
        public int CapacityChildren { get; set; }

        public string? Description { get; set; }

        // Navigation properties
        public virtual ICollection<Room>? Rooms { get; set; } = new List<Room>();
        public virtual ICollection<RoomImage>? RoomImages { get; set; } = new List<RoomImage>();
        public virtual ICollection<RoomTypeAmenity>? RoomTypeAmenities { get; set; } = new List<RoomTypeAmenity>();
        public virtual ICollection<BookingDetail>? BookingDetails { get; set; } = new List<BookingDetail>();
        public virtual ICollection<Review>? Reviews { get; set; } = new List<Review>();
    }
}