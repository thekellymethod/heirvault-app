# Test Prisma connection with DATABASE_URL from .env.local

Write-Host "Loading .env.local and testing Prisma connection..." -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path .env.local)) {
    Write-Host "❌ .env.local file not found" -ForegroundColor Red
    exit 1
}

# Load .env.local
Get-Content .env.local | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"').Trim("'").Trim()
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}

Write-Host "Testing Prisma migrate status..." -ForegroundColor Yellow
Write-Host ""

# Test Prisma connection
npx prisma migrate status

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Prisma connection successful!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Prisma connection failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
    Write-Host "`nChecking DATABASE_URL format..." -ForegroundColor Yellow
    $dbUrl = $env:DATABASE_URL
    if ($dbUrl) {
        Write-Host "DATABASE_URL length: $($dbUrl.Length)" -ForegroundColor Gray
        Write-Host "First 100 chars: $($dbUrl.Substring(0, [Math]::Min(100, $dbUrl.Length)))" -ForegroundColor Gray
        if ($dbUrl -match 'postgres\.pgpnbtmgloextjpmxxgv\.') {
            Write-Host "`n⚠️  WARNING: Found dot (.) instead of colon (:) in username/password separator" -ForegroundColor Red
        }
    }
}
