# Debug what Prisma is actually seeing

Write-Host "=== Debugging Prisma DATABASE_URL ===" -ForegroundColor Cyan
Write-Host ""

# Load .env.local
if (Test-Path .env.local) {
    Write-Host "Loading .env.local..." -ForegroundColor Yellow
    Get-Content .env.local | ForEach-Object {
        if ($_ -match '^([^#=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'").Trim()
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
} else {
    Write-Host "❌ .env.local not found" -ForegroundColor Red
    exit 1
}

$dbUrl = $env:DATABASE_URL

if (-not $dbUrl) {
    Write-Host "❌ DATABASE_URL not set in environment" -ForegroundColor Red
    exit 1
}

Write-Host "`nDATABASE_URL Analysis:" -ForegroundColor Cyan
Write-Host "Length: $($dbUrl.Length)" -ForegroundColor Gray
Write-Host "Starts with: $($dbUrl.Substring(0, [Math]::Min(20, $dbUrl.Length)))" -ForegroundColor Gray
Write-Host ""

# Check for the problematic pattern
Write-Host "Checking for format issues..." -ForegroundColor Yellow

$issues = @()

# Check 1: Dot instead of colon
if ($dbUrl -match 'postgres\.pgpnbtmgloextjpmxxgv\.99xZvLSJ') {
    $issues += "❌ FOUND: Dot (.) instead of colon (:) between username and password"
    Write-Host "   Pattern: postgres.pgpnbtmgloextjpmxxgv.99xZvLSJ" -ForegroundColor Red
    Write-Host "   Should be: postgres.pgpnbtmgloextjpmxxgv:99xZvLSJ" -ForegroundColor Green
}

# Check 2: Check the exact position
$match = [regex]::Match($dbUrl, 'postgres\.pgpnbtmgloextjpmxxgv([.:])99xZvLSJ')
if ($match.Success) {
    $separator = $match.Groups[1].Value
    if ($separator -eq '.') {
        $issues += "❌ Separator is DOT (.) at position $($match.Index + 35)"
        Write-Host "   Found: '$separator' but need ':'" -ForegroundColor Red
    } else {
        Write-Host "✅ Separator is COLON (:)" -ForegroundColor Green
    }
}

# Check 3: Show the actual URL (masked)
$masked = $dbUrl -replace '://([^:]+):([^@]+)@', '://$1:***@'
Write-Host "`nMasked URL: $masked" -ForegroundColor Gray

# Check 4: Check for quotes
if ($dbUrl.StartsWith('"') -or $dbUrl.StartsWith("'")) {
    $issues += "❌ Has leading quotes"
}
if ($dbUrl.EndsWith('"') -or $dbUrl.EndsWith("'")) {
    $issues += "❌ Has trailing quotes"
}

# Check 5: Check scheme
if (-not $dbUrl.StartsWith("postgresql://")) {
    $issues += "❌ Missing or wrong scheme (should start with 'postgresql://')"
    Write-Host "   Actual start: $($dbUrl.Substring(0, [Math]::Min(15, $dbUrl.Length)))" -ForegroundColor Red
}

# Show raw bytes for first 100 chars to catch hidden characters
Write-Host "`nFirst 100 characters (hex):" -ForegroundColor Yellow
$bytes = [System.Text.Encoding]::UTF8.GetBytes($dbUrl.Substring(0, [Math]::Min(100, $dbUrl.Length)))
$hex = ($bytes | ForEach-Object { $_.ToString("X2") }) -join " "
Write-Host $hex.Substring(0, [Math]::Min(200, $hex.Length)) -ForegroundColor Gray

if ($issues.Count -gt 0) {
    Write-Host "`n❌ Found $($issues.Count) issue(s):" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "   $issue" -ForegroundColor Yellow
    }
    Write-Host "`n💡 Fix your .env.local file:" -ForegroundColor Cyan
    Write-Host '   DATABASE_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:99xZvLSJ_NNmXT4@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"' -ForegroundColor Gray
    exit 1
} else {
    Write-Host "`n✅ Format looks correct!" -ForegroundColor Green
    Write-Host "`nTesting with Prisma..." -ForegroundColor Yellow
    npx prisma migrate status 2>&1
}
