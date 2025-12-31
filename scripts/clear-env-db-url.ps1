# Clear DATABASE_URL from current PowerShell session
# Run this when you suspect environment variable precedence issues

Write-Host "Checking for DATABASE_URL in current session..." -ForegroundColor Cyan

if ($env:DATABASE_URL) {
    $preview = if ($env:DATABASE_URL.Length -gt 60) { $env:DATABASE_URL.Substring(0, 60) + "..." } else { $env:DATABASE_URL }
    Write-Host "WARNING: Found DATABASE_URL in session: $preview" -ForegroundColor Yellow
    Write-Host "Removing DATABASE_URL from session..." -ForegroundColor Yellow
    
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    
    if (-not $env:DATABASE_URL) {
        Write-Host "SUCCESS: DATABASE_URL cleared from session" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Failed to clear DATABASE_URL" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "OK: No DATABASE_URL found in session (this is good)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Close this PowerShell window" -ForegroundColor White
Write-Host "   2. Open a NEW PowerShell window" -ForegroundColor White
Write-Host "   3. Run: `$env:DATABASE_URL (should be empty)" -ForegroundColor White
Write-Host "   4. Run: npx prisma migrate status" -ForegroundColor White
