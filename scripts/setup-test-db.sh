#!/bin/bash

# Setup Test Database Script
# This script creates a test database and runs migrations

set -e

echo "Setting up test database..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL in .env.test file"
    exit 1
fi

# Extract database name from DATABASE_URL
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

if [ -z "$DB_NAME" ]; then
    echo "Error: Could not extract database name from DATABASE_URL"
    exit 1
fi

echo "Database name: $DB_NAME"

# Create test database (if using PostgreSQL directly)
# Note: This assumes you have psql installed and can connect to PostgreSQL
# For managed databases (Neon, Supabase), create the database via their dashboard

echo "Creating test database (if it doesn't exist)..."
# Uncomment if using local PostgreSQL:
# createdb $DB_NAME 2>/dev/null || echo "Database already exists or creation failed"

# Run migrations
echo "Running database migrations..."
npm run db:migrate

echo "Test database setup complete!"
echo ""
echo "Next steps:"
echo "1. Verify .env.test file has correct DATABASE_URL"
echo "2. Run tests: npm test"
echo "3. Run E2E tests: npm run test:e2e"

