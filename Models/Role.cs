using System.ComponentModel.DataAnnotations;

namespace HotelManagement.Models
{
    public class Role
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = null!;

        public string? Description { get; set; }

        // Navigation properties
        public virtual ICollection<User>? Users { get; set; } = new List<User>();
        public virtual ICollection<RolePermission>? RolePermissions { get; set; } = new List<RolePermission>();
    }
}