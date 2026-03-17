using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelManagement.Core.Entities;
using HotelManagement.Infrastructure.Data;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace HotelManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ArticleCategoriesController : ControllerBase
    {
        private readonly AppDbContext _db;

        public ArticleCategoriesController(AppDbContext db)
        {
            _db = db;
        }

        /// <summary>
        /// GET /api/ArticleCategories [Public]
        /// Danh sách category active (dùng render menu blog & bộ lọc bài viết trên FE)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var categories = await _db.ArticleCategories
                .AsNoTracking()
                .Where(c => c.IsActive)
                .OrderBy(c => c.Name)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Slug
                })
                .ToListAsync();

            return Ok(categories);
        }

        /// <summary>
        /// GET /api/ArticleCategories/{id} [Public]
        /// Chi tiết 1 category (FE dùng load form sửa trong admin CMS)
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var category = await _db.ArticleCategories
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category == null)
                return NotFound(new { message = "Danh mục không tồn tại." });

            return Ok(new
            {
                category.Id,
                category.Name,
                category.Slug
            });
        }

        /// <summary>
        /// POST /api/ArticleCategories [MANAGE_CONTENT]
        /// Tạo mới category. Tự động sinh slug từ name (bỏ dấu, thay space bằng "-").
        /// </summary>
        [HttpPost]
        [Authorize]  // MANAGE_CONTENT được check qua JWT claims (RolePermissions)
        public async Task<IActionResult> Create([FromBody] CreateArticleCategoryRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { message = "Tên danh mục không được để trống." });

            var name = request.Name.Trim();

            // Kiểm tra trùng tên
            if (await _db.ArticleCategories.AnyAsync(c => c.Name == name))
                return Conflict(new { message = "Tên danh mục đã tồn tại." });

            var slug = GenerateSlug(name);

            // Kiểm tra trùng slug (hiếm xảy ra)
            if (await _db.ArticleCategories.AnyAsync(c => c.Slug == slug))
                return Conflict(new { message = "Slug đã tồn tại." });

            var category = new ArticleCategory
            {
                Name = name,
                Slug = slug,
                IsActive = true
            };

            _db.ArticleCategories.Add(category);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = category.Id }, new
            {
                category.Id,
                category.Name,
                category.Slug
            });
        }

        /// <summary>
        /// PUT /api/ArticleCategories/{id} [MANAGE_CONTENT]
        /// Chỉ cập nhật tên, giữ nguyên slug để không phá URL cũ.
        /// </summary>
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(int id, [FromBody] CreateArticleCategoryRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { message = "Tên danh mục không được để trống." });

            var name = request.Name.Trim();

            var category = await _db.ArticleCategories.FindAsync(id);
            if (category == null)
                return NotFound(new { message = "Danh mục không tồn tại." });

            // Kiểm tra trùng tên (loại trừ chính nó)
            if (await _db.ArticleCategories.AnyAsync(c => c.Name == name && c.Id != id))
                return Conflict(new { message = "Tên danh mục đã tồn tại." });

            category.Name = name;
            // Slug KHÔNG thay đổi

            await _db.SaveChangesAsync();

            return Ok(new
            {
                category.Id,
                category.Name,
                category.Slug
            });
        }

        /// <summary>
        /// DELETE /api/ArticleCategories/{id} [MANAGE_CONTENT]
        /// Soft delete: set IsActive = false. Bài viết cũ vẫn giữ category_id.
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int id)
        {
            var category = await _db.ArticleCategories.FindAsync(id);
            if (category == null)
                return NotFound(new { message = "Danh mục không tồn tại." });

            category.IsActive = false;
            await _db.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Sinh slug chuẩn SEO, hỗ trợ tiếng Việt (bỏ dấu, lowercase, thay space bằng -, loại ký tự đặc biệt)
        /// </summary>
        private static string GenerateSlug(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return string.Empty;

            // Bỏ dấu tiếng Việt
            var normalized = input.ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();

            foreach (var c in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                    sb.Append(c);
            }

            var slug = sb.ToString().Normalize(NormalizationForm.FormC);

            // Thay khoảng trắng & ký tự đặc biệt
            slug = Regex.Replace(slug, @"[\s]+", "-");
            slug = Regex.Replace(slug, @"[^a-z0-9-]", "");
            slug = Regex.Replace(slug, @"-+", "-");

            return slug.Trim('-');
        }
    }

    /// <summary>
    /// DTO cho Create & Update (chỉ cần name)
    /// </summary>
    public record CreateArticleCategoryRequest(string Name);
}