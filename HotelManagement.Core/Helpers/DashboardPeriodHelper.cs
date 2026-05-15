using System.Globalization;

namespace HotelManagement.Core.Helpers;

public sealed record DashboardPeriodInfo(
    string PeriodType,
    string PeriodKey,
    DateTime PeriodStart,
    DateTime PeriodEnd,
    DateTime PreviousPeriodStart,
    DateTime PreviousPeriodEnd,
    bool IsCurrent);

public static class DashboardPeriodHelper
{
    public const string Daily = "DAILY";
    public const string Weekly = "WEEKLY";
    public const string Monthly = "MONTHLY";
    public const string Quarterly = "QUARTERLY";
    public const string Yearly = "YEARLY";

    /// <summary>Các kỳ mặc định được cập nhật khi có sự kiện nghiệp vụ.</summary>
    public static IReadOnlyList<string> DefaultEventPeriods { get; } = new[] { Daily, Weekly, Monthly };

    public static DashboardPeriodInfo Resolve(string periodType, DateTime occurredAtUtc, DateTime? nowUtc = null)
    {
        var normalizedType = NormalizePeriodType(periodType);
        var utc = DateTime.SpecifyKind(occurredAtUtc, DateTimeKind.Utc);
        var currentUtc = nowUtc ?? DateTime.UtcNow;

        return normalizedType switch
        {
            Daily     => ResolveDaily(utc, currentUtc),
            Weekly    => ResolveWeekly(utc, currentUtc),
            Monthly   => ResolveMonthly(utc, currentUtc),
            Quarterly => ResolveQuarterly(utc, currentUtc),
            Yearly    => ResolveYearly(utc, currentUtc),
            _ => throw new ArgumentOutOfRangeException(nameof(periodType), periodType, "Unsupported period type.")
        };
    }

    public static string NormalizePeriodType(string? periodType)
    {
        var value = string.IsNullOrWhiteSpace(periodType) ? Monthly : periodType.Trim().ToUpperInvariant();
        return value switch
        {
            Daily or Weekly or Monthly or Quarterly or Yearly => value,
            _ => throw new ArgumentOutOfRangeException(nameof(periodType), periodType,
                "Period type must be DAILY, WEEKLY, MONTHLY, QUARTERLY or YEARLY.")
        };
    }

    public static string GetDashboardCode(string roleName) => roleName switch
    {
        "Admin"         => "ADMIN_DASHBOARD",
        "Manager"       => "MANAGER_DASHBOARD",
        "Receptionist"  => "RECEPTION_DASHBOARD",
        "Accountant"    => "ACCOUNTANT_DASHBOARD",
        "Housekeeping"  => "HOUSEKEEPING_DASHBOARD",
        "WarehouseStaff"=> "WAREHOUSE_DASHBOARD",
        _ => roleName.Replace(" ", "_").ToUpperInvariant() + "_DASHBOARD"
    };

    /// <summary>Tính growth rate, xử lý edge case chia cho 0.</summary>
    public static decimal? CalculateGrowthRate(decimal current, decimal previous)
    {
        if (previous == 0 && current == 0) return null;
        if (previous == 0) return 100m;
        return Math.Round(((current - previous) / previous) * 100m, 2);
    }

    /// <summary>Trả về "up" / "down" / "stable".</summary>
    public static string ResolveTrend(decimal current, decimal previous)
    {
        if (current > previous) return "up";
        if (current < previous) return "down";
        return "stable";
    }

    // ─── Private resolvers ────────────────────────────────────────────────────

    private static DashboardPeriodInfo ResolveDaily(DateTime utc, DateTime nowUtc)
    {
        var start = utc.Date;
        var end   = start.AddDays(1).AddTicks(-1);
        return new DashboardPeriodInfo(Daily, start.ToString("yyyy-MM-dd"), start, end,
            start.AddDays(-1), start.AddTicks(-1), nowUtc.Date == start);
    }

    private static DashboardPeriodInfo ResolveWeekly(DateTime utc, DateTime nowUtc)
    {
        var dayOffset = ((int)utc.DayOfWeek + 6) % 7;
        var start     = utc.Date.AddDays(-dayOffset);
        var end       = start.AddDays(7).AddTicks(-1);
        var isoWeek   = ISOWeek.GetWeekOfYear(start);
        var isoYear   = ISOWeek.GetYear(start);
        var curWeekStart = nowUtc.Date.AddDays(-(((int)nowUtc.DayOfWeek + 6) % 7));
        return new DashboardPeriodInfo(Weekly, $"{isoYear}-W{isoWeek:00}", start, end,
            start.AddDays(-7), start.AddTicks(-1), curWeekStart == start);
    }

    private static DashboardPeriodInfo ResolveMonthly(DateTime utc, DateTime nowUtc)
    {
        var start    = new DateTime(utc.Year, utc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var end      = start.AddMonths(1).AddTicks(-1);
        var prevStart = start.AddMonths(-1);
        return new DashboardPeriodInfo(Monthly, start.ToString("yyyy-MM"), start, end,
            prevStart, start.AddTicks(-1), nowUtc.Year == start.Year && nowUtc.Month == start.Month);
    }

    private static DashboardPeriodInfo ResolveQuarterly(DateTime utc, DateTime nowUtc)
    {
        var quarter    = ((utc.Month - 1) / 3) + 1;
        var startMonth = ((quarter - 1) * 3) + 1;
        var start      = new DateTime(utc.Year, startMonth, 1, 0, 0, 0, DateTimeKind.Utc);
        var end        = start.AddMonths(3).AddTicks(-1);
        var prevStart  = start.AddMonths(-3);
        var curQuarter = ((nowUtc.Month - 1) / 3) + 1;
        return new DashboardPeriodInfo(Quarterly, $"{utc.Year}-Q{quarter}", start, end,
            prevStart, start.AddTicks(-1), nowUtc.Year == utc.Year && curQuarter == quarter);
    }

    private static DashboardPeriodInfo ResolveYearly(DateTime utc, DateTime nowUtc)
    {
        var start    = new DateTime(utc.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var end      = start.AddYears(1).AddTicks(-1);
        var prevStart = start.AddYears(-1);
        return new DashboardPeriodInfo(Yearly, utc.Year.ToString(CultureInfo.InvariantCulture),
            start, end, prevStart, start.AddTicks(-1), nowUtc.Year == utc.Year);
    }
}
