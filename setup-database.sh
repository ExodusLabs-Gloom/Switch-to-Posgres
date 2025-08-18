#!/bin/bash

# Database setup script for Quote and Job management system
# This script will create the required database tables

echo "Setting up database schema..."

# Check if required environment variables are set
if [[ -z "$PG_HOST" || -z "$PG_PORT" || -z "$PG_DATABASE" || -z "$PG_USER" || -z "$PG_PASSWORD" ]]; then
    echo "Error: Required environment variables not set."
    echo "Please ensure .env file contains: PG_HOST, PG_PORT, PG_DATABASE, PG_USER, PG_PASSWORD"
    exit 1
fi

# Load environment variables from .env file
if [ -f .env ]; then
    source .env
    echo "Loaded environment variables from .env file"
else
    echo "Warning: .env file not found in current directory"
fi

# Run the database schema
echo "Connecting to database: $PG_DATABASE on $PG_HOST:$PG_PORT"
echo "Running database schema setup..."

PGPASSWORD=$PG_PASSWORD psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -f database_schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database schema setup completed successfully!"
    echo ""
    echo "You can now run the XML parsers:"
    echo "  - Quote parser: cd switch/quotexml && node parse-quotes.js path/to/quote.xml"
    echo "  - Job parser: cd switch/jobxml && node parse-jobs.js path/to/job.xml"
else
    echo "❌ Database schema setup failed!"
    echo "Please check your database connection settings and try again."
    exit 1
fi
