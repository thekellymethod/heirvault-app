# Verify environment variable setup and precedence
# This script helps diagnose DATABASE_URL issues

Write-Host "Environment Variable Diagnostic Tool" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check PowerShell session
Write-Host "1. PowerShell Session Environment:" -ForegroundColor Yellow
if ($env:DATABASE_URL) {
    $url = $env:DATABASE_URL
    Write-Host "   WARNING: DATABASE_URL is set in session" -ForegroundColor Red
    if ($url) {
        $preview = if ($url.Length -gt 80) { $url.Substring(0, 80) + "..." } else { $url }
        Write-Host "   Value: $preview" -ForegroundColor Gray
        $hostMatch = if ($url -match '@([^:]+)') { $matches[1] } else { 'unknown' }
        Write-Host "   Host: $hostMatch" -ForegroundColor Gray
    }
} else {
    Write-Host "   OK: No DATABASE_URL in session (will load from files)" -ForegroundColor Green
}

# Check .env.local
Write-Host ""
Write-Host "2. .env.local file:" -ForegroundColor Yellow
if (Test-Path .env.local) {
    $envLocal = Get-Content .env.local | Select-String -Pattern "^DATABASE_URL|^DIRECT_URL|^DIRECT_DATABASE_URL" -CaseSensitive
    if ($envLocal) {
        Write-Host "   OK: Found DATABASE_URL in .env.local" -ForegroundColor Green
        $url = ($envLocal -split '=')[1]
        $hostMatch = if ($url -match '@([^:]+)') { $matches[1] } else { 'unknown' }
        Write-Host "   Host: $hostMatch" -ForegroundColor Gray
        
        # Check for quotes
        if ($url.StartsWith('"') -or $url.StartsWith("'")) {
            Write-Host "   WARNING: URL is quoted (should not be)" -ForegroundColor Red
        } else {
            Write-Host "   OK: URL format is correct (no quotes)" -ForegroundColor Green
        }
        
        # Check for old db.* host
        if ($url -match "db\.[^.]+\.supabase\.co") {
            Write-Host "   WARNING: Using old direct connection (db.*)" -ForegroundColor Red
        } elseif ($url -match "pooler\.supabase\.com") {
            Write-Host "   OK: Using pooled connection (pooler.supabase.com)" -ForegroundColor Green
        }
    } else {
        Write-Host "   WARNING: No DATABASE_URL found in .env.local" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ERROR: .env.local does not exist" -ForegroundColor Red
}

# Check .env
Write-Host ""
Write-Host "3. .env file:" -ForegroundColor Yellow
if (Test-Path .env) {
    $envFile = Get-Content .env | Select-String -Pattern "^DATABASE_URL|^DIRECT_URL|^DIRECT_DATABASE_URL" -CaseSensitive
    if ($envFile) {
        Write-Host "   WARNING: DATABASE_URL found in .env" -ForegroundColor Red
        Write-Host "   This will override .env.local if .env.local is missing!" -ForegroundColor Yellow
        Write-Host "   Recommendation: Remove DATABASE_URL from .env, keep only in .env.local" -ForegroundColor Yellow
    } else {
        Write-Host "   OK: No DATABASE_URL in .env (good)" -ForegroundColor Green
    }
} else {
    Write-Host "   INFO: .env does not exist (this is okay)" -ForegroundColor Gray
}

# Check what Prisma will see
Write-Host ""
Write-Host "4. What Prisma will load:" -ForegroundColor Yellow
Write-Host "   Note: Run npx prisma migrate status to see which env file Prisma loads" -ForegroundColor Gray
Write-Host "   Look for lines like: injecting env (...) from .env.local" -ForegroundColor Gray

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "   - .env.local has highest priority" -ForegroundColor White
Write-Host "   - .env is fallback only" -ForegroundColor White
Write-Host "   - PowerShell session env overrides both" -ForegroundColor White
Write-Host "   - Best practice: DATABASE_URL only in .env.local" -ForegroundColor White
