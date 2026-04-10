
$path = "d:\HotelManagement\HotelManagement.API\Controllers\AttractionsController.cs"
$bytes = [System.IO.File]::ReadAllBytes($path)
$content = [System.Text.Encoding]::UTF8.GetString($bytes)

# Build the correct replacement string with proper Unicode
# Di tich = Di t + i-acute(u00ED) + ch
# Am thuc = A-circumflex-hook(u1EA8) + m th + u-horn-dot(u1EF1) + c
# Giai tri = Gi + a-hook(u1EA3) + i tr + i-acute(u00ED)
# Thien nhien = Thi + e-circumflex(u00EA) + n nhi + e-circumflex(u00EA) + n

$diTich     = "Di t" + [char]0x00ED + "ch"
$amThuc     = [char]0x1EA8 + "m th" + [char]0x1EF1 + "c"
$giaiTri    = "Gi" + [char]0x1EA3 + "i tr" + [char]0x00ED
$thienNhien = "Thi" + [char]0x00EA + "n nhi" + [char]0x00EA + "n"

Write-Host "Target strings:"
Write-Host "  [$diTich]"
Write-Host "  [$amThuc]"
Write-Host "  [$giaiTri]"
Write-Host "  [$thienNhien]"

$newMethod = @"
    private static bool IsValidCategory(string? category)
    {
        if (string.IsNullOrWhiteSpace(category)) return true;

        // Su dung ky tu thuc de dam bao dung
        var allowed = new[] { "$diTich", "$amThuc", "$giaiTri", "$thienNhien" };
        return allowed.Contains(category.Trim());
    }
"@

# Use regex to replace the method
$pattern = '(?s)private static bool IsValidCategory\(string\? category\).*?\n    \}'
$newContent = [regex]::Replace($content, $pattern, $newMethod.TrimStart())

if ($newContent -eq $content) {
    Write-Host "WARNING: Pattern not matched, trying wider pattern..."
    $pattern2 = '(?s)    private static bool IsValidCategory.*?\n    \}'
    $newContent = [regex]::Replace($content, $pattern2, $newMethod)
}

# Write back as UTF-8 without BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $newContent, $utf8NoBom)

Write-Host "Done! Verifying new content:"
$verify = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$match = [regex]::Match($verify, '(?s)private static bool IsValidCategory.*?\n    \}')
Write-Host $match.Value
