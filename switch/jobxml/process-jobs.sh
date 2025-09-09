#!/bin/bash

XML_PATH="$1"
LOG_FILE="/Users/Shared/Next-Printing/Resources/Switch to Posgres/switch/jobxml/jobs.log"
NODE_PATH="/usr/local/bin/node"
SCRIPT_PATH="/Users/Shared/Next-Printing/Resources/Switch to Posgres/switch/jobxml/parse-jobs-new.js"

# If an argument is provided, use it as the XML path; otherwise, use the default from $1
if [ -n "$1" ]; then
  XML_PATH="$1"
fi

# Logging clearly what was passed in
echo "=======================" >> "$LOG_FILE"
echo "XML_PATH: $XML_PATH" >> "$LOG_FILE"
echo "Timestamp: $(date)" >> "$LOG_FILE"
echo "=======================" >> "$LOG_FILE"

"$NODE_PATH" "$SCRIPT_PATH" "$XML_PATH"
