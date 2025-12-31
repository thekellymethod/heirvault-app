# Test if quotes matter for DATABASE_URL

Write-Host "Testing DATABASE_URL with and without quotes..." -ForegroundColor Cyan
Write-Host ""

# Test URL
$testUrl = "postgresql://postgres.pgpnbtmgloextjpmxxgv:99xZvLSJ_NNmXT4@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"

Write-Host "Test URL (masked):" -ForegroundColor Yellow
$masked = $testUrl -replace '://([^:]+):([^@]+)@', '://$1:***@'
Write-Host "   $masked" -ForegroundColor Gray
Write-Host ""

# Test with quotes
Write-Host "1. WITH quotes (recommended):" -ForegroundColor Green
$withQuotes = "DATABASE_URL=`"$testUrl`""
Write-Host "   $withQuotes" -ForegroundColor Gray

# Test without quotes  
Write-Host "`n2. WITHOUT quotes (also works):" -ForegroundColor Yellow
$withoutQuotes = "DATABASE_URL=$testUrl"
Write-Host "   $withoutQuotes" -ForegroundColor Gray

Write-Host "`n✅ RECOMMENDATION: Use WITH quotes" -ForegroundColor Green
Write-Host "   Reason: Connection strings contain special characters (:, /, ?, &, =)" -ForegroundColor Gray
Write-Host "   Quotes prevent any parsing issues" -ForegroundColor Gray
Write-Host "`nBoth formats work, but quotes are safer!" -ForegroundColor Cyan
