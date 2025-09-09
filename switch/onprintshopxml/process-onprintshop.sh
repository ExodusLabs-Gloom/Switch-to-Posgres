#!/bin/bash

XML_PATH="$1"
LOG_FILE="/Users/Shared/Next-Printing/Resources/Switch to Posgres/switch/onprintshopxml/onprintshop.log"
NODE_PATH="/usr/local/bin/node"
SCRIPT_PATH="/Users/Shared/Next-Printing/Resources/Switch to Posgres/switch/onprintshopxml/parse-onprintshop.js"

# Logging clearly what was passed in
echo "=======================" >> "$LOG_FILE"
echo "XML_PATH: $XML_PATH" >> "$LOG_FILE"
echo "Timestamp: $(date)" >> "$LOG_FILE"
echo "=======================" >> "$LOG_FILE"

"$NODE_PATH" "$SCRIPT_PATH" "$XML_PATH"
