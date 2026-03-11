using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Models
{
    public class RoomImage
    {
        [Key]
        public int Id { get; set; }

        public int? RoomTypeId { get; set; }

        [Required]
        public string ImageUrl { get; set; } = null!;

        public bool? IsPrimary { get; set; } = false;

        [ForeignKey(nameof(RoomTypeId))]
        public virtual RoomType? RoomType { get; set; }
    }
}