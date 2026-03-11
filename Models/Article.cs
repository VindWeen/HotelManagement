using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagement.Models
{
    public class Article
    {
        [Key]
        public int Id { get; set; }

        public int? CategoryId { get; set; }
        public int? AuthorId { get; set; }

        [Required]
        public string Title { get; set; } = null!;

        [StringLength(255)]
        public string? Slug { get; set; }

        public string? Content { get; set; }

        public string? ThumbnailUrl { get; set; }

        public DateTime? PublishedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey(nameof(CategoryId))]
        public virtual ArticleCategory? Category { get; set; }

        [ForeignKey(nameof(AuthorId))]
        public virtual User? Author { get; set; }
    }
}