#!/bin/bash

# Test script for the updated job parser with new schema
# This script tests a single XML file to verify the migration works

set -e

echo "Testing updated job parser with new schema..."

# Test with one of the existing job XML files
TEST_FILE="/Users/Shared/Next-Printing/Resources/Switch to Posgres/switch/jobxml/xml/J1200-373.xml"

if [ ! -f "$TEST_FILE" ]; then
    echo "Error: Test file not found: $TEST_FILE"
    exit 1
fi

echo "Testing with file: $TEST_FILE"

# Run the updated job parser
cd "/Users/Shared/Next-Printing/Resources/Switch to Posgres/switch/jobxml"
node parse-jobs.js "$TEST_FILE"

echo ""
echo "Test completed. Check the output above for any errors."
echo "If successful, the job should be inserted into the 'jobs' table."
