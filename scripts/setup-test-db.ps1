# Setup Test Database Script (PowerShell)
# This script creates a test database and runs migrations

Write-Host "Setting up test database..." -ForegroundColor Green

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "Error: DATABASE_URL environment variable is not set" -ForegroundColor Red
    Write-Host "Please set DATABASE_URL in .env.test file" -ForegroundColor Yellow
    exit 1
}

# Extract database name from DATABASE_URL
$dbName = $env:DATABASE_URL -replace '.*/([^?]+).*', '$1'

if (-not $dbName) {
    Write-Host "Error: Could not extract database name from DATABASE_URL" -ForegroundColor Red
    exit 1
}

Write-Host "Database name: $dbName" -ForegroundColor Cyan

# Run migrations
Write-Host "Running database migrations..." -ForegroundColor Green
npm run db:migrate

Write-Host "Test database setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Verify .env.test file has correct DATABASE_URL"
Write-Host "2. Run tests: npm test"
Write-Host "3. Run E2E tests: npm run test:e2e"

