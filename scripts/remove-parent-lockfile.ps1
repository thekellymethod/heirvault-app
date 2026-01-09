# Remove parent directory lockfile to fix Next.js workspace root issue
# This script removes C:\Users\theke\package-lock.json if it exists
# This prevents Next.js from picking the wrong workspace root

$parentLockfile = "C:\Users\theke\package-lock.json"

if (Test-Path $parentLockfile) {
    Write-Host "Found parent lockfile at: $parentLockfile"
    Write-Host "Removing to fix Next.js workspace root detection..."
    
    Remove-Item -Path $parentLockfile -Force
    Write-Host "Removed parent lockfile"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Restart your dev server"
    Write-Host "2. Clear .next cache: Remove-Item -Recurse -Force .next"
    Write-Host "3. Restart VS Code if using Turbopack"
} else {
    Write-Host "No parent lockfile found at: $parentLockfile"
    Write-Host "This is good - Next.js should use the correct workspace root"
}
