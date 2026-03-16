using Microsoft.EntityFrameworkCore;

namespace HotelManagement.Infrastructure.Data;
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

}