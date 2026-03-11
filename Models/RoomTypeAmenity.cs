using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Models
{
    public class RoomTypeAmenity
    {
        public int RoomTypeId { get; set; }
        public int AmenityId { get; set; }

        [ForeignKey(nameof(RoomTypeId))]
        public virtual RoomType RoomType { get; set; } = null!;

        [ForeignKey(nameof(AmenityId))]
        public virtual Amenity Amenity { get; set; } = null!;
    }
}