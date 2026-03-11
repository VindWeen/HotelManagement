using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Models
{
    public class Review
    {
        [Key]
        public int Id { get; set; }

        public int? UserId { get; set; }
        public int? RoomTypeId { get; set; }

        [Range(1, 5)]
        public int? Rating { get; set; }

        public string? Comment { get; set; }

        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(UserId))]
        public virtual User? User { get; set; }

        [ForeignKey(nameof(RoomTypeId))]
        public virtual RoomType? RoomType { get; set; }
    }
}