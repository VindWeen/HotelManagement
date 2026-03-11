using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Models
{
    public class OrderServiceDetail
    {
        [Key]
        public int Id { get; set; }

        public int? OrderServiceId { get; set; }
        public int? ServiceId { get; set; }

        [Required]
        public int Quantity { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal UnitPrice { get; set; }

        [ForeignKey(nameof(OrderServiceId))]
        public virtual OrderService? OrderService { get; set; }

        [ForeignKey(nameof(ServiceId))]
        public virtual Service? Service { get; set; }
    }
}