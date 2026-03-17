using System.Text;
using HotelManagement.Core.Authorization;
using HotelManagement.Core.Helpers;
using HotelManagement.Infrastructure.Data;
using Mapster;
using MapsterMapper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ── 1. Database ──────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── 2. JWT Authentication ────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"]!;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew                = TimeSpan.Zero
        };

        // Trả về JSON thay vì redirect khi 401/403
        options.Events = new JwtBearerEvents
        {
            OnChallenge = ctx =>
            {
                ctx.HandleResponse();
                ctx.Response.StatusCode  = 401;
                ctx.Response.ContentType = "application/json";
                return ctx.Response.WriteAsync(
                    "{\"error\":\"Unauthorized\",\"message\":\"Token không hợp lệ hoặc đã hết hạn.\"}");
            },
            OnForbidden = ctx =>
            {
                ctx.Response.StatusCode  = 403;
                ctx.Response.ContentType = "application/json";
                return ctx.Response.WriteAsync(
                    "{\"error\":\"Forbidden\",\"message\":\"Bạn không có quyền thực hiện hành động này.\"}");
            }
        };
    });

// ── 3. RBAC ──────────────────────────────────────────────────────
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();
builder.Services.AddAuthorization();

// ── 4. Helpers ───────────────────────────────────────────────────
builder.Services.AddScoped<JwtHelper>();

// ── 5. Mapster ───────────────────────────────────────────────────
builder.Services.AddMapster();

// ── 6. Controllers ───────────────────────────────────────────────
builder.Services.AddControllers();

// ── 7. OpenAPI / Swagger UI ──────────────────────────────────────
// Dùng AddOpenApi() built-in của .NET 10 — không cần Microsoft.OpenApi.Models
builder.Services.AddOpenApi();

// ── Build ────────────────────────────────────────────────────────
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();       // endpoint: /openapi/v1.json
    app.UseSwaggerUI(c =>
        c.SwaggerEndpoint("/openapi/v1.json", "Hotel Management API v1"));
}

// Thứ tự PHẢI đúng: Authentication trước Authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.Run();
