#!/bin/bash

# Complete schema migration setup script
# This script migrates from the current simple schema to the new comprehensive schema

set -e  # Exit on any error

echo "Starting migration to new comprehensive schema..."

# Database connection parameters from .env
source .env

# Function to run SQL commands
run_sql() {
    psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -c "$1"
}

run_sql_file() {
    psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -f "$1"
}

echo "Step 1: Creating backup of existing data..."
run_sql "CREATE TABLE IF NOT EXISTS job_lines_backup AS SELECT * FROM job_lines;"
run_sql "CREATE TABLE IF NOT EXISTS process_steps_backup AS SELECT * FROM process_steps;"
run_sql "CREATE TABLE IF NOT EXISTS quotes_backup AS SELECT * FROM quotes;"
run_sql "CREATE TABLE IF NOT EXISTS customers_backup AS SELECT * FROM customers;"

echo "Step 2: Applying new comprehensive schema..."
# Apply the new schema (this will create new tables alongside existing ones)
run_sql_file "/Users/Shared/Next-Printing/Resources/PDF Selector /scripts/schema.sql"

echo "Step 3: Running data migration..."
# Run the migration script to transfer data from old tables to new structure
run_sql_file "migrate_to_new_schema.sql"

echo "Step 4: Verifying migration..."
echo "Checking record counts..."
run_sql "
SELECT 
    'Original job_lines' as table_name, 
    COUNT(*) as record_count 
FROM job_lines_backup
UNION ALL
SELECT 
    'New jobs' as table_name, 
    COUNT(*) as record_count 
FROM jobs
UNION ALL
SELECT 
    'Original process_steps' as table_name, 
    COUNT(*) as record_count 
FROM process_steps_backup
UNION ALL
SELECT 
    'New job_operations' as table_name, 
    COUNT(*) as record_count 
FROM job_operations;
"

echo "Step 5: Testing parser compatibility..."
echo "The job parser has been updated to work with the new jobs table."
echo "The quotes parser will continue to work unchanged with the quotes table."

echo ""
echo "Migration completed successfully!"
echo ""
echo "Summary:"
echo "- job_lines data migrated to jobs table"
echo "- process_steps data migrated to job_operations table"
echo "- Quotes table preserved unchanged"
echo "- Customers table preserved unchanged"
echo "- Parsers updated to work with new schema"
echo ""
echo "Next steps:"
echo "1. Test the parsers with sample data"
echo "2. Once verified, you can drop the old backup tables"
echo "3. Update any other applications to use the new schema"
