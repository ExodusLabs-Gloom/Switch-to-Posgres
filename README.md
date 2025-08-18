# Switch to PostgreSQL Migration Scripts

A comprehensive XML parsing and database migration system for processing Switch application job and quote XML files into a PostgreSQL database with enhanced production management capabilities.

## Overview

This project implements XML parsers for:
- **Job XML files** from Switch application → PostgreSQL jobs table
- **Quote XML files** from Switch application → PostgreSQL quotes table

### Key Features

- **New Production Schema**: Enhanced database schema with 25+ additional fields for comprehensive job tracking
- **Decimal Sort Values**: Support for decimal sequence ordering (2.5, 2.9) in production steps
- **Quote Integration**: Full quote-to-job relationship mapping
- **Customer Management**: Enhanced customer and contact tracking
- **Field Exclusion**: Configurable field exclusion (fileName, laminateName removed as requested)

## Database Schema

### Core Mapping Strategy

The migration implements a new mapping strategy where:
- `jobLineId` (XML) → `job_id` (database primary key)
- `jobId` (XML) → `job_number` (database display field)

### Schema Updates

- **jobs table**: Added 25+ new columns for comprehensive XML field storage including `notes` field
- **job_operations table**: Enhanced with decimal sequence support and compatibility fields
- **quotes table**: Full quote data with customer relationships and `notes` field
- **customer_contacts table**: Enhanced customer contact management

### Notes Functionality

Both job and quote parsers now extract notes from the `lineDescription` field:
- **Source**: Content after the `Supply:` section in `lineDescription`
- **Processing**: Double pipe characters (`||`) are converted to line breaks (`\n`)
- **Storage**: Stored in the `notes` column in both `jobs` and `quotes` tables

## Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- TypeScript

### Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
Copy `.env.example` to `.env` and configure your PostgreSQL connection:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password
```

3. **Setup database schema:**
Run the SQL scripts directly in your PostgreSQL database:
```bash
psql -d your_database -f setup-new-mapping.sql
```

## Usage

### Compile TypeScript Files

```bash
npx tsc
```

### Process Job XML Files

**Single file:**
```bash
node switch/jobxml/parse-jobs-new.js path/to/job.xml
```

**Batch processing:**
```bash
./switch/jobxml/process-jobs.sh
```

### Process Quote XML Files

**Single file:**
```bash
node switch/quotexml/parse-quotes.js path/to/quote.xml
```

**Batch processing:**
```bash
./switch/quotexml/process-quotes.sh
```

## Project Structure

```
├── switch/
│   ├── jobxml/
│   │   ├── parse-jobs-new.ts       # Main job parser (new mapping)
│   │   ├── parse-jobs.ts           # Legacy job parser
│   │   ├── process-jobs.sh         # Batch job processing
│   │   └── xml/                    # Sample XML files
│   └── quotexml/
│       ├── parse-quotes.ts         # Quote parser
│       ├── process-quotes.sh       # Batch quote processing
│       └── xml/                    # Sample XML files
├── setup-new-mapping.sql          # Database schema setup
├── database_schema.sql             # Complete production schema
├── migrate_to_new_schema.sql       # Migration scripts
└── JOB_MAPPING_PROPOSAL.md         # Detailed mapping documentation
```

## XML File Processing

### Job XML Structure

The parser handles Switch job XML files with the following key elements:
- Job identification (jobLineId, jobId)
- Customer information
- Production steps with decimal sorting
- Material specifications
- Quote references

### Quote XML Structure

- Quote identification and versioning
- Customer and contact details
- Line items and specifications
- Production requirements

## Database Integration

### Jobs Table

The enhanced jobs table includes:
- Core job identification
- Customer relationship
- Production metadata
- Material specifications
- Quote references
- Timestamp tracking

### Process Steps

Production steps support:
- Decimal sequence ordering (1, 1.5, 2, 2.5, 2.9, 3, etc.)
- Operation codes and descriptions
- Material requirements
- Quality specifications

## Migration Features

### Field Exclusion

The following fields are excluded from processing as requested:
- `fileName`
- `laminateName`

### Data Integrity

- Comprehensive error handling
- Transaction-based processing
- Foreign key validation
- Duplicate prevention

## Testing

### Sample Files

The project includes comprehensive sample XML files:
- Job files: `J1200-373.xml`, `J1211-406.xml`, etc.
- Quote files: `Q15081-18371.xml`, `Q15094-18406.xml`, etc.

### Validation

Process sample files to verify the setup:
```bash
# Test job processing
node switch/jobxml/parse-jobs-new.js switch/jobxml/xml/J1200-373.xml

# Test quote processing  
node switch/quotexml/parse-quotes.js switch/quotexml/xml/Q15081-18371.xml
```

## Configuration

### TypeScript Configuration

The project uses ES modules with the following key settings:
- Module: ESNext
- Target: ES2020
- Strict type checking enabled

### Environment Variables

- `DB_HOST`: PostgreSQL host
- `DB_PORT`: PostgreSQL port
- `DB_NAME`: Database name
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password

## Troubleshooting

### Common Issues

1. **TypeScript compilation errors**: Ensure `tsconfig.json` is configured for ES modules
2. **Database connection**: Verify `.env` configuration
3. **XML parsing errors**: Check XML file format and structure

### Logging

- Job processing: `switch/jobxml/jobs.log`
- Quote processing: `switch/quotexml/quotes.log`

## Development

### Adding New Fields

1. Update the TypeScript interfaces
2. Modify the database schema
3. Update the parser logic
4. Test with sample files

### Performance Optimization

- Batch processing for large XML sets
- Transaction optimization
- Index usage for lookups

## Production Deployment

1. **Database Setup**: Run migration scripts
2. **Environment Configuration**: Set production environment variables
3. **Process Monitoring**: Monitor log files for errors
4. **Backup Strategy**: Implement regular database backups

## License

This project is proprietary software for Next Printing production management.

## Support

For technical support or questions about the migration process, contact the development team.

---

**Last Updated**: August 2025
**Version**: 1.0.0
**Database Schema Version**: Production Enhanced
