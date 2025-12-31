# Add DATABASE_URL to .env.local if missing

Write-Host "Checking if DATABASE_URL exists in .env.local..." -ForegroundColor Cyan

if (-not (Test-Path .env.local)) {
    Write-Host "❌ .env.local not found" -ForegroundColor Red
    exit 1
}

$content = Get-Content .env.local -Raw
$hasDatabaseUrl = $content -match '^\s*DATABASE_URL\s*='

if ($hasDatabaseUrl) {
    Write-Host "✅ DATABASE_URL already exists in .env.local" -ForegroundColor Green
    Write-Host "`nCurrent DATABASE_URL line:" -ForegroundColor Yellow
    Get-Content .env.local | Select-String "DATABASE_URL" | ForEach-Object {
        $masked = $_.Line -replace '://([^:]+):([^@]+)@', '://$1:***@'
        Write-Host "   $masked" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ DATABASE_URL is MISSING from .env.local" -ForegroundColor Red
    Write-Host "`nYou need to add DATABASE_URL to your .env.local file." -ForegroundColor Yellow
    Write-Host "`nAdd this line (with the correct format):" -ForegroundColor Cyan
    Write-Host 'DATABASE_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:99xZvLSJ_NNmXT4@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"' -ForegroundColor Gray
    Write-Host "`n⚠️  IMPORTANT: Use colon (:) not dot (.) between username and password!" -ForegroundColor Red
    Write-Host "   Correct: postgres.pgpnbtmgloextjpmxxgv:99xZvLSJ_NNmXT4" -ForegroundColor Green
    Write-Host "   Wrong:   postgres.pgpnbtmgloextjpmxxgv.99xZvLSJ_NNmXT4" -ForegroundColor Red
}
