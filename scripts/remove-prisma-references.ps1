# Script to remove all Prisma references from source files
# This script comments out all prisma. calls and removes Prisma imports

Write-Host "Removing Prisma references from source files..."

# Find all TypeScript files with prisma. calls
$files = Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Where-Object {
    (Get-Content $_.FullName -Raw) -match 'prisma\.'
}

Write-Host "Found $($files.Count) files with prisma. calls"

foreach ($file in $files) {
    Write-Host "Processing: $($file.FullName)"
    $content = Get-Content $file.FullName -Raw
    
    # Comment out prisma. calls (basic pattern)
    # Note: This is a simple approach - manual review recommended
    $content = $content -replace '(\s+)(await\s+)?prisma\.', '$1// Prisma removed: $2prisma.'
    
    Set-Content -Path $file.FullName -Value $content -NoNewline
}

Write-Host "Done. Please review changes manually."
