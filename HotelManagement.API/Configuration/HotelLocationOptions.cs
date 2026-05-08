namespace HotelManagement.API.Configuration;

public class HotelLocationOptions
{
    public const string SectionName = "HotelLocation";

    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
}
