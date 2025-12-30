# Fix DIRECT_URL format for Supavisor
$envFile = ".env.local"
$content = Get-Content $envFile -Raw

# Correct Supavisor format:
# postgresql://postgres.[REF]:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require

# Pattern to find and replace DIRECT_URL
$oldPattern = 'DIRECT_URL="[^"]*"'
$newDirectUrl = 'DIRECT_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:99xZvLSJ_NNmXT4@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"'

if ($content -match $oldPattern) {
    $content = $content -replace $oldPattern, $newDirectUrl
    Set-Content -Path $envFile -Value $content -NoNewline
    Write-Host "✅ Updated DIRECT_URL to use Supavisor (port 6543, pgbouncer=true)"
} else {
    Write-Host "❌ Could not find DIRECT_URL in .env.local"
}

