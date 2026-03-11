using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Models
{
    public class Payment
    {
        [Key]
        public int Id { get; set; }

        public int? InvoiceId { get; set; }

        [StringLength(50)]
        public string? PaymentMethod { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal AmountPaid { get; set; }

        [StringLength(100)]
        public string? TransactionCode { get; set; }

        public DateTime? PaymentDate { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(InvoiceId))]
        public virtual Invoice? Invoice { get; set; }
    }
}