using System.ComponentModel.DataAnnotations;

namespace HotelManagement.Models
{
    public class ArticleCategory
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(255)]
        public string Name { get; set; } = null!;

        // Navigation property
        public virtual ICollection<Article> Articles { get; set; } = new List<Article>();
    }
}