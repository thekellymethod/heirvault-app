# Check what's in .env.local

Write-Host "Checking .env.local file..." -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path .env.local)) {
    Write-Host "❌ .env.local file not found" -ForegroundColor Red
    exit 1
}

Write-Host "Looking for DATABASE_URL..." -ForegroundColor Yellow
$dbUrlLines = Get-Content .env.local | Select-String 'DATABASE_URL'

if ($dbUrlLines.Count -eq 0) {
    Write-Host "❌ DATABASE_URL not found in .env.local" -ForegroundColor Red
    Write-Host "`nFirst 10 lines of .env.local:" -ForegroundColor Yellow
    Get-Content .env.local | Select-Object -First 10
} else {
    Write-Host "✅ Found $($dbUrlLines.Count) DATABASE_URL line(s):" -ForegroundColor Green
    foreach ($line in $dbUrlLines) {
        $display = $line.Line
        if ($display.Length -gt 100) {
            $display = $display.Substring(0, 100) + "..."
        }
        Write-Host "   $display" -ForegroundColor Gray
        
        # Check if it's commented
        if ($line.Line.Trim().StartsWith('#')) {
            Write-Host "   ⚠️  WARNING: This line is commented out!" -ForegroundColor Red
        }
        
        # Check format
        if ($line.Line -match 'DATABASE_URL\s*=\s*["\']?([^"\']+)["\']?') {
            $value = $matches[1]
            if ($value -match 'postgres\.pgpnbtmgloextjpmxxgv\.99xZvLSJ') {
                Write-Host "   ❌ FORMAT ERROR: Has dot (.) instead of colon (:)" -ForegroundColor Red
            } elseif ($value -match 'postgres\.pgpnbtmgloextjpmxxgv:99xZvLSJ') {
                Write-Host "   ✅ Format looks correct (has colon)" -ForegroundColor Green
            }
        }
    }
}

Write-Host "`nTesting dotenv load..." -ForegroundColor Yellow
$result = node -e "require('dotenv').config({ path: '.env.local' }); console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET (' + process.env.DATABASE_URL.substring(0, 50) + '...)' : 'NOT SET');"
Write-Host $result
