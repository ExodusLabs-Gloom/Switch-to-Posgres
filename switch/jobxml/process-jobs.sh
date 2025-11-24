#!/bin/bash

XML_PATH="$1"
OUTPUT_PATH="$2"
LOG_FILE="/Users/Shared/Next-Printing/Resources/Switch to Posgres/switch/jobxml/jobs.log"
NODE_PATH="/usr/local/bin/node"
SCRIPT_PATH="/Users/Shared/Next-Printing/Resources/Switch to Posgres/switch/jobxml/parse-jobs-new.js"


# Logging clearly what was passed in
echo "=======================" >> "$LOG_FILE"
echo "XML_PATH: $XML_PATH" >> "$LOG_FILE"
echo "OUTPUT_PATH: $OUTPUT_PATH" >> "$LOG_FILE"
echo "Timestamp: $(date)" >> "$LOG_FILE"
echo "=======================" >> "$LOG_FILE"

"$NODE_PATH" "$SCRIPT_PATH" "$XML_PATH" "$OUTPUT_PATH"
