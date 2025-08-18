# Database Schema Update Summary

**Date**: 2025-08-18  
**Update**: Derived schema from current TypeScript parsers

## Overview

The database schema has been updated to exactly match what the current TypeScript parsers (`parse-jobs-new.ts` and `parse-quotes.ts`) are using in production. This ensures 100% compatibility between the code and database structure.

## Key Changes

### 1. Notes Functionality Added
- **Both `jobs` and `quotes` tables** now have a `notes TEXT` column
- Notes are extracted from `lineDescription` after the `Supply:` content
- Double pipe characters (`||`) are converted to line breaks (`\n`)
- Implementation uses the `extractNotesFromLineDescription()` helper function

### 2. Table Structure Corrections

#### **customers table**
```sql
CREATE TABLE customers (
  customer_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **customer_contacts table**  
```sql
CREATE TABLE customer_contacts (
  contact_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(customer_id),
  contact_first_name TEXT,
  contact_email TEXT,
  contact_type TEXT DEFAULT 'primary',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **quotes table** (all lowercase column names)
```sql
CREATE TABLE quotes (
  id TEXT PRIMARY KEY,                    -- lineIdentifier
  lineidentifier TEXT NOT NULL,          
  lineidentifiernoprefix TEXT,           
  quoteid TEXT NOT NULL,                 -- Q-number
  quoteidnoprefix TEXT,                  
  quotelineid TEXT NOT NULL,             
  quotedescription TEXT NOT NULL,        
  -- ... 25+ additional fields
  notes TEXT,                            -- NEW: extracted notes
  processed BOOLEAN DEFAULT FALSE        
);
```

#### **jobs table** (NEW MAPPING)
```sql
CREATE TABLE jobs (
  job_id TEXT PRIMARY KEY,              -- jobLineId (NEW MAPPING)
  job_number TEXT NOT NULL,             -- jobId (NEW MAPPING)
  customer_id TEXT REFERENCES customers(customer_id),
  line_identifier TEXT NOT NULL,        
  line_identifier_no_prefix TEXT,       
  job_name TEXT NOT NULL,               
  -- ... 25+ additional fields
  notes TEXT,                           -- NEW: extracted notes
  processed BOOLEAN DEFAULT FALSE      
);
```

#### **job_operations table** (decimal sort support)
```sql
CREATE TABLE job_operations (
  job_operation_id TEXT PRIMARY KEY,    -- job_id + barcode
  job_id TEXT NOT NULL REFERENCES jobs(job_id),
  barcode TEXT NOT NULL,                
  name TEXT NOT NULL,                   
  sort DOUBLE PRECISION NOT NULL,       -- Supports 2.5, 2.9, etc.
  sequence_order DOUBLE PRECISION NOT NULL,
  completed_at TIMESTAMP,              
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Critical Mapping Changes

**Previous**: jobId → job_id, jobLineId → job_number  
**NEW**: jobLineId → job_id, jobId → job_number

This change aligns with production requirements where:
- `job_id` (primary key) = jobLineId (e.g., "373")
- `job_number` (display) = jobId (e.g., "J1200")

### 4. Data Type Corrections

- **DOUBLE PRECISION** instead of FLOAT for decimal values
- **DATE** instead of TEXT for date fields
- **INTEGER** for numeric fields where appropriate
- **TEXT** for all string fields (more flexible than VARCHAR)

### 5. Comprehensive Indexes

Added performance indexes for:
- Customer lookups
- Date range queries  
- Quote and job references
- Processing status filtering
- Sort order queries

### 6. Triggers and Functions

- **updated_at triggers** for all tables
- **Safe column additions** with existence checks
- **Data type conversions** for existing tables

## Files Updated

1. **`updated-database-schema.sql`** - Complete new schema
2. **`setup-new-mapping.sql`** - Migration script  
3. **`README.md`** - Updated documentation

## Migration Impact

- **Zero downtime**: Scripts use `IF NOT EXISTS` and safe alterations
- **Backward compatible**: Existing data preserved
- **Production ready**: Matches exact parser requirements

## Validation

The schema has been validated against:
- ✅ Job XML processing (`parse-jobs-new.ts`)
- ✅ Quote XML processing (`parse-quotes.ts`) 
- ✅ Customer contact insertion
- ✅ Job operations with decimal sorting
- ✅ Notes extraction functionality

## Notes Extraction Example

**Input lineDescription:**
```
Supply: MOD 200mm, Left Edge Leading||Qty: 28,300||||||Ceramics Diffuser Refill Guava Lychee x 300||||||Reject Shop 200mL Refill Coconut Lime x 5000||
```

**Extracted notes:**
```
Qty: 28,300

Ceramics Diffuser Refill Guava Lychee x 300

Reject Shop 200mL Refill Coconut Lime x 5000
```

This update ensures the database schema is perfectly aligned with the current parser implementation and production requirements.
