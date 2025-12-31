# Test DATABASE_URL validation
# Loads .env.local and runs validation

Write-Host "Loading .env.local..." -ForegroundColor Cyan

if (-not (Test-Path .env.local)) {
    Write-Host "❌ .env.local file not found" -ForegroundColor Red
    exit 1
}

# Load .env.local
Get-Content .env.local | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"').Trim("'").Trim()
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        if ($name -eq 'DATABASE_URL') {
            Write-Host "✅ Loaded DATABASE_URL" -ForegroundColor Green
        }
    }
}

Write-Host "`nRunning validation..." -ForegroundColor Cyan
Write-Host ""

# Run the validation script
& "$PSScriptRoot\validate-db-url.ps1"
