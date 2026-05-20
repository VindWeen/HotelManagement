IF COL_LENGTH(N'dbo.Attractions', N'distance_km') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[Attractions]
    ALTER COLUMN [distance_km] [decimal](7, 2) NULL;
END
