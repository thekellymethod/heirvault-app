# Validate and fix DATABASE_URL format
# This script checks if DATABASE_URL has the correct format

Write-Host "Checking DATABASE_URL format..." -ForegroundColor Cyan

$dbUrl = $env:DATABASE_URL

if (-not $dbUrl) {
    Write-Host "❌ DATABASE_URL is not set" -ForegroundColor Red
    exit 1
}

Write-Host "`nCurrent DATABASE_URL (first 80 chars):" -ForegroundColor Yellow
Write-Host $dbUrl.Substring(0, [Math]::Min(80, $dbUrl.Length)) -ForegroundColor Gray

# Check for common issues
$issues = @()

# Check 1: Wrong separator (dot instead of colon)
if ($dbUrl -match 'postgres\.pgpnbtmgloextjpmxxgv\.99xZvLSJ_NNmXT4') {
    $issues += "❌ Found dot (.) instead of colon (:) between username and password"
    Write-Host "`n🔧 Fix needed:" -ForegroundColor Red
    Write-Host "   Change: postgres.pgpnbtmgloextjpmxxgv.99xZvLSJ_NNmXT4" -ForegroundColor Yellow
    Write-Host "   To:     postgres.pgpnbtmgloextjpmxxgv:99xZvLSJ_NNmXT4" -ForegroundColor Green
}

# Check 2: Missing scheme
if (-not $dbUrl.StartsWith("postgresql://")) {
    $issues += "❌ Missing 'postgresql://' scheme"
}

# Check 3: Has quotes
if ($dbUrl.StartsWith('"') -or $dbUrl.StartsWith("'")) {
    $issues += "❌ DATABASE_URL has leading quotes (remove them)"
    Write-Host "`n🔧 Fix: Remove quotes from .env.local" -ForegroundColor Yellow
}

# Check 4: Check format pattern
if ($dbUrl -notmatch '^postgresql://[^:]+:[^@]+@') {
    $issues += "❌ Invalid format - should be: postgresql://USERNAME:PASSWORD@HOST"
}

# Check 5: Check for required parameters for pooled connection
if ($dbUrl -match 'pooler\.supabase\.com') {
    if ($dbUrl -notmatch 'pgbouncer=true') {
        $issues += "⚠️  Pooled connection should include 'pgbouncer=true'"
    }
    if ($dbUrl -notmatch 'connection_limit=') {
        $issues += "⚠️  Pooled connection should include 'connection_limit=1'"
    }
}

if ($issues.Count -eq 0) {
    Write-Host "`n✅ DATABASE_URL format looks correct!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n❌ Found $($issues.Count) issue(s):" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "   $issue" -ForegroundColor Yellow
    }
    Write-Host "`n💡 Correct format for Supabase pooled connection:" -ForegroundColor Cyan
    Write-Host '   postgresql://postgres.pgpnbtmgloextjpmxxgv:99xZvLSJ_NNmXT4@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require' -ForegroundColor Gray
    exit 1
}
