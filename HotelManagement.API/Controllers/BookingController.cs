using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using System.Security.Claims;
using HotelManagement.Core.Entities;
using HotelManagement.Infrastructure.Data;

namespace HotelManagement.API.Controllers;

#region DTOs
public class CreateBookingRequest
{
    public string GuestName { get; set; } = null!;
    public string GuestPhone { get; set; } = null!;
    public string GuestEmail { get; set; } = null!;
    public int NumAdults { get; set; }
    public int NumChildren { get; set; }
    public int? VoucherId { get; set; }
    public List<CreateBookingDetailRequest> Details { get; set; } = new();
}

public class CreateBookingDetailRequest
{
    public int RoomTypeId { get; set; }
    public DateTime CheckInDate { get; set; }
    public DateTime CheckOutDate { get; set; }
}
#endregion

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConnectionMultiplexer _redis;

    public BookingsController(AppDbContext context, IConnectionMultiplexer redis)
    {
        _context = context;
        _redis = redis;
    }

    private IDatabase RedisDb => _redis.GetDatabase();

    // ================= GET ALL =================
    [Authorize(Roles = "Admin,Staff")]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var bookings = await _context.Bookings
            .Include(b => b.BookingDetails)
            .ToListAsync();

        return Ok(bookings);
    }

    // ================= GET BY ID =================
    [Authorize]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var booking = await _context.Bookings
            .Include(b => b.BookingDetails)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound();
        return Ok(booking);
    }

    // ================= MY BOOKINGS =================
    [Authorize]
    [HttpGet("my-bookings")]
    public async Task<IActionResult> GetMyBookings()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var bookings = await _context.Bookings
            .Where(b => b.UserId == userId)
            .Include(b => b.BookingDetails)
            .ToListAsync();

        return Ok(bookings);
    }

    // ================= CREATE WITH REDIS LOCK =================
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create(CreateBookingRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var locks = new List<string>();

        try
        {
            // ===== 1. Acquire lock cho từng room type =====
            foreach (var d in request.Details)
            {
                var lockKey = $"lock:booking:{d.RoomTypeId}:{d.CheckInDate:yyyyMMdd}:{d.CheckOutDate:yyyyMMdd}";
                var acquired = await RedisDb.StringSetAsync(lockKey, "locked", TimeSpan.FromSeconds(30), When.NotExists);

                if (!acquired)
                    return BadRequest($"RoomType {d.RoomTypeId} đang được người khác đặt. Thử lại!");

                locks.Add(lockKey);
            }

            // ===== 2. Check overlap DB =====
            foreach (var d in request.Details)
            {
                var isConflict = await _context.BookingDetails
                    .AnyAsync(bd =>
                        bd.RoomTypeId == d.RoomTypeId &&
                        !(bd.CheckOutDate <= d.CheckInDate || bd.CheckInDate >= d.CheckOutDate)
                    );

                if (isConflict)
                    return BadRequest($"RoomType {d.RoomTypeId} đã bị đặt trong khoảng thời gian này!");
            }

            // ===== 3. Create booking =====
            var booking = new Booking
            {
                UserId = userId,
                GuestName = request.GuestName,
                GuestPhone = request.GuestPhone,
                GuestEmail = request.GuestEmail,
                NumAdults = request.NumAdults,
                NumChildren = request.NumChildren,
                BookingCode = Guid.NewGuid().ToString(),
                Status = "Pending",
                Source = "online"
            };

            foreach (var d in request.Details)
            {
                var nights = (d.CheckOutDate - d.CheckInDate).Days;

                var roomType = await _context.RoomTypes.FindAsync(d.RoomTypeId);
                if (roomType == null)
                    return BadRequest("RoomType not found");

                booking.TotalEstimatedAmount += nights * roomType.BasePrice;

                booking.BookingDetails.Add(new BookingDetail
                {
                    RoomTypeId = d.RoomTypeId,
                    CheckInDate = d.CheckInDate,
                    CheckOutDate = d.CheckOutDate,
                    PricePerNight = roomType.BasePrice
                });
            }

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            return Ok(booking);
        }
        finally
        {
            // ===== 4. Release lock =====
            foreach (var key in locks)
            {
                await RedisDb.KeyDeleteAsync(key);
            }
        }
    }

    // ================= CONFIRM =================
    [Authorize(Roles = "Admin,Staff")]
    [HttpPatch("{id}/confirm")]
    public async Task<IActionResult> Confirm(int id)
    {
        var booking = await _context.Bookings.FindAsync(id);
        if (booking == null) return NotFound();

        if (booking.Status != "Pending")
            return BadRequest("Only pending booking can be confirmed");

        booking.Status = "Confirmed";
        await _context.SaveChangesAsync();

        return Ok(booking);
    }

    // ================= CANCEL =================
    [Authorize]
    [HttpPatch("{id}/cancel")]
    public async Task<IActionResult> Cancel(int id, [FromBody] string reason)
    {
        var booking = await _context.Bookings.FindAsync(id);
        if (booking == null) return NotFound();

        if (booking.Status == "Completed")
            return BadRequest("Cannot cancel completed booking");

        booking.Status = "Cancelled";
        booking.CancellationReason = reason;
        booking.CancelledAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(booking);
    }

    // ================= CHECK-IN =================
    [Authorize(Roles = "Admin,Staff")]
    [HttpPatch("{id}/check-in")]
    public async Task<IActionResult> CheckIn(int id)
    {
        var booking = await _context.Bookings.FindAsync(id);
        if (booking == null) return NotFound();

        if (booking.Status != "Confirmed")
            return BadRequest("Only confirmed booking can check-in");

        booking.Status = "Checked_in";
        booking.CheckInTime = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(booking);
    }

    // ================= CHECK-OUT =================
    [Authorize(Roles = "Admin,Staff")]
    [HttpPatch("{id}/check-out")]
    public async Task<IActionResult> CheckOut(int id)
    {
        var booking = await _context.Bookings.FindAsync(id);
        if (booking == null) return NotFound();

        if (booking.Status != "Checked_in")
            return BadRequest("Only checked-in booking can check-out");

        booking.Status = "Completed";
        booking.CheckOutTime = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(booking);
    }
}