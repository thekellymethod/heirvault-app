# Check specific lines in .env.local

Write-Host "Checking .env.local lines 7-8..." -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path .env.local)) {
    Write-Host "❌ .env.local not found" -ForegroundColor Red
    exit 1
}

$lines = Get-Content .env.local
$line7 = if ($lines.Count -ge 7) { $lines[6] } else { "Line 7 doesn't exist" }
$line8 = if ($lines.Count -ge 8) { $lines[7] } else { "Line 8 doesn't exist" }

Write-Host "Line 7:" -ForegroundColor Yellow
if ($line7 -match 'DATABASE_URL') {
    # Mask the password but show the format
    $masked = $line7 -replace '://([^:]+):([^@]+)@', '://$1:***@'
    $masked = $masked -replace '://([^.]+)\.([^@]+)@', '://$1.***@'
    Write-Host "   $masked" -ForegroundColor Gray
    
    # Check for the dot issue
    if ($line7 -match 'postgres\.pgpnbtmgloextjpmxxgv\.99xZvLSJ') {
        Write-Host "   ❌ ISSUE FOUND: Dot (.) instead of colon (:) between username and password" -ForegroundColor Red
        Write-Host "   Fix: Change the dot to a colon" -ForegroundColor Yellow
    } elseif ($line7 -match 'postgres\.pgpnbtmgloextjpmxxgv:99xZvLSJ') {
        Write-Host "   ✅ Format looks correct (has colon)" -ForegroundColor Green
    }
} else {
    Write-Host "   $line7" -ForegroundColor Gray
}

Write-Host "`nLine 8:" -ForegroundColor Yellow
if ($line8 -match 'DATABASE_URL') {
    $masked = $line8 -replace '://([^:]+):([^@]+)@', '://$1:***@'
    $masked = $masked -replace '://([^.]+)\.([^@]+)@', '://$1.***@'
    Write-Host "   $masked" -ForegroundColor Gray
    
    if ($line8 -match 'postgres\.pgpnbtmgloextjpmxxgv\.99xZvLSJ') {
        Write-Host "   ❌ ISSUE FOUND: Dot (.) instead of colon (:) between username and password" -ForegroundColor Red
        Write-Host "   Fix: Change the dot to a colon" -ForegroundColor Yellow
    } elseif ($line8 -match 'postgres\.pgpnbtmgloextjpmxxgv:99xZvLSJ') {
        Write-Host "   ✅ Format looks correct (has colon)" -ForegroundColor Green
    }
} else {
    Write-Host "   $line8" -ForegroundColor Gray
}

Write-Host "`nAll DATABASE_URL lines in file:" -ForegroundColor Cyan
Get-Content .env.local | Select-String "DATABASE_URL" | ForEach-Object {
    $lineNum = $_.LineNumber
    $content = $_.Line
    $masked = $content -replace '://([^:]+):([^@]+)@', '://$1:***@'
    $masked = $masked -replace '://([^.]+)\.([^@]+)@', '://$1.***@'
    Write-Host "   Line $lineNum : $masked" -ForegroundColor Gray
}
