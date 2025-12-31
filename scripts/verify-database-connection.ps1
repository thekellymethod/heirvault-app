# Comprehensive database connection verification script
# Follows the step-by-step verification process

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database Connection Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# STEP 1: Clear environment variables
Write-Host "STEP 1: Clearing environment variables..." -ForegroundColor Yellow
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:DIRECT_URL -ErrorAction SilentlyContinue
Remove-Item Env:DIRECT_DATABASE_URL -ErrorAction SilentlyContinue

$dbVars = Get-ChildItem Env: | Where-Object { $_.Name -like "*DATABASE*" -or $_.Name -like "*DIRECT*" }
if ($dbVars) {
    Write-Host "WARNING: Found database-related environment variables:" -ForegroundColor Red
    $dbVars | ForEach-Object { Write-Host "  $($_.Name) = $($_.Value.Substring(0, [Math]::Min(50, $_.Value.Length)))..." -ForegroundColor Red }
    Write-Host "Please clear these manually or restart PowerShell" -ForegroundColor Yellow
} else {
    Write-Host "OK: No database variables in session" -ForegroundColor Green
}

Write-Host ""

# STEP 2: Sanity-check .env.local
Write-Host "STEP 2: Checking .env.local..." -ForegroundColor Yellow
if (Test-Path .env.local) {
    $envLocal = Get-Content .env.local
    $dbLines = $envLocal | Select-String -Pattern "^DATABASE_URL|^DIRECT_URL|^DIRECT_DATABASE_URL" -CaseSensitive
    
    if ($dbLines.Count -eq 0) {
        Write-Host "ERROR: No DATABASE_URL found in .env.local" -ForegroundColor Red
    } elseif ($dbLines.Count -gt 1) {
        Write-Host "WARNING: Found $($dbLines.Count) database-related lines in .env.local" -ForegroundColor Red
        $dbLines | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
        Write-Host "Should have exactly ONE DATABASE_URL line" -ForegroundColor Yellow
    } else {
        $dbLine = $dbLines[0].Line
        Write-Host "OK: Found DATABASE_URL in .env.local" -ForegroundColor Green
        
        # Check format
        $url = ($dbLine -split '=')[1]
        $issues = @()
        
        if ($url.StartsWith('"') -or $url.StartsWith("'")) {
            $issues += "URL is quoted (should not be)"
        }
        if ($url -match '\s') {
            $issues += "URL contains spaces"
        }
        if ($url -notmatch ':6543') {
            $issues += "Not using port 6543 (pooled connection)"
        }
        if ($url -notmatch 'pooler\.supabase\.com') {
            $issues += "Not using pooler.supabase.com host"
        }
        
        if ($issues) {
            Write-Host "WARNING: Format issues found:" -ForegroundColor Red
            $issues | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
        } else {
            Write-Host "OK: URL format is correct" -ForegroundColor Green
            Write-Host "  Port: 6543 (pooled)" -ForegroundColor Gray
            Write-Host "  Host: pooler.supabase.com" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "ERROR: .env.local does not exist" -ForegroundColor Red
}

Write-Host ""

# STEP 3: Validate Prisma schema
Write-Host "STEP 3: Validating Prisma schema..." -ForegroundColor Yellow
Write-Host "Running: npx prisma validate" -ForegroundColor Gray
Write-Host ""

$validateOutput = npx prisma validate 2>&1
$validateExitCode = $LASTEXITCODE

if ($validateExitCode -eq 0) {
    Write-Host "SUCCESS: Prisma validation passed" -ForegroundColor Green
    $validateOutput | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
} else {
    Write-Host "ERROR: Prisma validation failed" -ForegroundColor Red
    $validateOutput | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    Write-Host ""
    Write-Host "STOP: Fix the URL format before continuing" -ForegroundColor Red
    exit 1
}

Write-Host ""

# STEP 4: Test connection (non-destructive)
Write-Host "STEP 4: Testing database connection (non-destructive)..." -ForegroundColor Yellow
Write-Host "Running: npx prisma db pull" -ForegroundColor Gray
Write-Host ""

$pullOutput = npx prisma db pull 2>&1
$pullExitCode = $LASTEXITCODE

if ($pullExitCode -eq 0) {
    Write-Host "SUCCESS: Database connection works" -ForegroundColor Green
    $pullOutput | Select-Object -Last 5 | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
} else {
    Write-Host "ERROR: Database connection failed" -ForegroundColor Red
    $pullOutput | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    Write-Host ""
    Write-Host "This indicates a real auth/SSL error, not a config issue" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# STEP 5: Check migration status
Write-Host "STEP 5: Checking migration status..." -ForegroundColor Yellow
Write-Host "Running: npx prisma migrate status" -ForegroundColor Gray
Write-Host ""

$statusOutput = npx prisma migrate status 2>&1 | Out-String
Write-Host $statusOutput

if ($statusOutput -match "Database schema is up to date") {
    Write-Host ""
    Write-Host "SUCCESS: Database schema is up to date!" -ForegroundColor Green
    Write-Host "No migrations needed." -ForegroundColor Green
} elseif ($statusOutput -match "Following migrations have not been applied") {
    Write-Host ""
    Write-Host "INFO: Migrations pending (this is normal)" -ForegroundColor Yellow
    Write-Host "Run: npx prisma migrate deploy" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "WARNING: Unexpected migration status" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verification Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
