# Switch XML Processing

This folder contains XML parsing utilities for processing quote and job XML files.

## Structure

```
switch/
├── quotexml/
│   ├── parse-quotes.ts      # TypeScript parser for quote XML files
│   ├── process-quotes.sh    # Shell script to compile and run quote parser
│   └── xml/                 # Folder for quote XML files
│       └── sample-quotes.xml
├── jobxml/
│   ├── parse-jobs.ts        # TypeScript parser for job XML files
│   ├── process-jobs.sh      # Shell script to compile and run job parser
│   └── xml/                 # Folder for job XML files
│       └── sample-jobs.xml
└── README.md               # This file
```

## Usage

### Quote XML Processing

1. Place your quote XML files in `switch/quotexml/xml/`
2. Run the processing script:
   ```bash
   cd switch/quotexml
   chmod +x process-quotes.sh
   ./process-quotes.sh
   ```

### Job XML Processing

1. Place your job XML files in `switch/jobxml/xml/`
2. Run the processing script:
   ```bash
   cd switch/jobxml
   chmod +x process-jobs.sh
   ./process-jobs.sh
   ```

## Requirements

- Node.js with TypeScript support OR Bun runtime
- PostgreSQL database with the required schema
- xml2js npm package for XML parsing

## Installing Dependencies

```bash
npm install xml2js @types/xml2js
```

## Environment Variables

The scripts use the same `.env` file from the project root with these variables:
- `PG_HOST`
- `PG_PORT`
- `PG_DATABASE`
- `PG_USER`
- `PG_PASSWORD`

## XML Format

### Quote XML Format
```xml
<quotes>
  <quote id="Q2024-001" lineId="QL001" date="2024-08-08" status="Active" history="Description">
    <!-- quote data -->
  </quote>
</quotes>
```

### Job XML Format
```xml
<jobs>
  <job id="J2024-001" lineId="JL001" name="Job Name" customerId="CUST001" 
       product="Product Name" quantity="100" orderDate="2024-08-08" dueDate="2024-08-15"
       material="Material" colour="Color" quoteId="Q2024-001">
  </job>
</jobs>
```

## Notes

- The parsers will create or update records in the database
- Existing records with the same ID will be updated
- The XML folder will be created automatically if it doesn't exist
- Check the console output for processing results and any errors
