# Check and fix hostname in DATABASE_URL

Write-Host "Checking DATABASE_URL hostname..." -ForegroundColor Cyan
Write-Host ""

# Load .env.local
if (Test-Path .env.local) {
    Get-Content .env.local | ForEach-Object {
        if ($_ -match '^([^#=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'").Trim()
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
}

$dbUrl = $env:DATABASE_URL

if (-not $dbUrl) {
    Write-Host "❌ DATABASE_URL not set" -ForegroundColor Red
    exit 1
}

Write-Host "Current DATABASE_URL hostname:" -ForegroundColor Yellow
$match = [regex]::Match($dbUrl, '@([^:]+):')
if ($match.Success) {
    $hostname = $match.Groups[1].Value
    Write-Host "   $hostname" -ForegroundColor Gray
    
    # Check for the missing dot issue
    if ($hostname -match 'pgpnbtmgloextjpmxxgvsupabase\.co$') {
        Write-Host "`n❌ ISSUE FOUND: Missing dot in hostname!" -ForegroundColor Red
        Write-Host "   Current: $hostname" -ForegroundColor Red
        Write-Host "   Should be: db.pgpnbtmgloextjpmxxgv.supabase.co" -ForegroundColor Green
        Write-Host "`n💡 This is a DIRECT connection URL (port 5432)" -ForegroundColor Yellow
        Write-Host "   For migrations, you should use the POOLED connection (port 6543)" -ForegroundColor Yellow
        Write-Host "   Pooled URL format: aws-1-us-east-2.pooler.supabase.com:6543" -ForegroundColor Cyan
    } elseif ($hostname -match 'pooler\.supabase\.com') {
        Write-Host "`n✅ Using pooled connection (correct for migrations)" -ForegroundColor Green
    } elseif ($hostname -match '\.supabase\.co$') {
        Write-Host "`n⚠️  Using direct connection (port 5432)" -ForegroundColor Yellow
        Write-Host "   For Prisma migrations, use pooled connection (port 6543) instead" -ForegroundColor Yellow
    }
} else {
    Write-Host "   Could not parse hostname from URL" -ForegroundColor Red
}

Write-Host "`nRecommended DATABASE_URL format:" -ForegroundColor Cyan
Write-Host 'DATABASE_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:99xZvLSJ_NNmXT4@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"' -ForegroundColor Gray
