using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Models
{
    public class Room
    {
        [Key]
        public int Id { get; set; }

        public int? RoomTypeId { get; set; }

        [Required]
        [StringLength(50)]
        public string RoomNumber { get; set; } = null!;

        public int? Floor { get; set; }

        [StringLength(50)]
        public string? Status { get; set; } = "Available";

        [ForeignKey(nameof(RoomTypeId))]
        public virtual RoomType? RoomType { get; set; }

        // One-to-Many với RoomInventory
        public virtual ICollection<RoomInventory>? RoomInventories { get; set; } = new List<RoomInventory>();

        // One-to-Many với BookingDetail
        public virtual ICollection<BookingDetail>? BookingDetails { get; set; } = new List<BookingDetail>();
    }
}