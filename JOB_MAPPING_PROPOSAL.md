# Job XML to New Database Schema Mapping Proposal

## Overview
This document outlines how to map job XML data from the Switch application to the new comprehensive database schema.

## Current XML Structure Analysis

### Sample XML Fields (from J1200-373.xml):
```xml
<lineIdentifier>J1200-373</lineIdentifier>
<jobId>J1200</jobId>
<jobLineId>373</jobLineId>
<jobName>RLQ306118 Reject / Radiance / Indulge</jobName>
<customerId>B-21776</customerId>
<customerName>PASTEL PINES INTERNATIONAL</customerName>
<quantity>28300</quantity>
<sizeXmm>45.0</sizeXmm>
<sizeYmm>115.0</sizeYmm>
<materialName>PP60 - Permanent</materialName>
<finishingName>MATTE LAMINATE</finishingName>
<orderDate>16-07-2025</orderDate>
<dueDate>25-07-2025</dueDate>
```

## Proposed Mapping Strategy

### 1. Core Job Table Mapping (`jobs` table)

| XML Field | New Schema Field | Mapping Notes |
|-----------|------------------|---------------|
| `lineIdentifier` | `job_id` | Primary key (e.g., "J1200-373") |
| `jobLineId` | `job_number` | Job number for display (e.g., "373") |
| `customerId` | `customer_id` | Direct mapping |
| `quantity` | `qty_ordered` | Direct mapping |
| `sizeXmm` | `size_x` | Convert to numeric(8,2) |
| `sizeYmm` | `size_y` | Convert to numeric(8,2) |
| `orderDate` | `order_date` | Convert DD-MM-YYYY to DATE |
| `dueDate` | `due_date` | Convert DD-MM-YYYY to DATE |
| `deliveryToAddress` | `delivery_address` | Direct mapping |

### 2. Missing Fields Strategy

For XML fields that don't have direct equivalents in the new schema:

#### Option A: Store in `special_instructions` as JSON
```json
{
  "jobName": "RLQ306118 Reject / Radiance / Indulge",
  "recipeId": "16159",
  "accountManagerName": "Robyn Renton",
  "accountManagerEmail": "robyn@rentonslabels.com.au",
  "itemId": "2317",
  "productId": "2317",
  "productCode": "15489",
  "productName": "Labels",
  "sibling": 1,
  "siblingCount": 4,
  "revision": -1,
  "approvers": "PH-approvers",
  "fileName": "nan",
  "fileLocation": "PH-fileLocation",
  "materialName": "PP60 - Permanent",
  "laminateName": "nan",
  "finishingName": "MATTE LAMINATE",
  "printColour": "6 Colour",
  "tool": "D0773(6,6)(3,2)2mm Rectangle",
  "cores": "76mm",
  "handMachineApplied": "MACHINE APPLIED",
  "supply": "MOD 200mm, Left Edge Leading",
  "kinds": 1,
  "rollDirection": "RD4",
  "lineDescription": "Size: 45mm x 115mm...",
  "quoteId": "Q15081",
  "quoteLineId": "18371",
  "quoteDate": "16-07-2025",
  "profitCentreName": "Packaging Labels"
}
```

#### Option B: Create Additional Tables

**job_legacy_data table:**
```sql
CREATE TABLE job_legacy_data (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES jobs(job_id),
  job_name TEXT,
  recipe_id TEXT,
  account_manager_name TEXT,
  account_manager_email TEXT,
  item_id TEXT,
  product_id TEXT,
  product_code TEXT,
  product_name TEXT,
  sibling INTEGER,
  sibling_count INTEGER,
  revision INTEGER,
  approvers TEXT,
  file_name TEXT,
  file_location TEXT,
  material_name TEXT,
  laminate_name TEXT,
  finishing_name TEXT,
  print_colour TEXT,
  tool TEXT,
  cores TEXT,
  hand_machine_applied TEXT,
  supply TEXT,
  kinds INTEGER,
  roll_direction TEXT,
  line_description TEXT,
  quote_id TEXT,
  quote_line_id TEXT,
  quote_date DATE,
  profit_centre_name TEXT
);
```

### 3. Customer Data Mapping

| XML Field | Customer Table Field | Notes |
|-----------|---------------------|-------|
| `customerId` | `customer_id` | Primary key |
| `customerName` | `name` | Direct mapping |
| `customerContactName` | Store in `customer_contacts` | Separate table |
| `customerContactEmail` | Store in `customer_contacts` | Separate table |

### 4. Process Steps Mapping (`job_operations` table)

The XML `processList` needs compatibility fields added to `job_operations`:

**Required additions to job_operations table:**
```sql
ALTER TABLE job_operations 
ADD COLUMN barcode TEXT,
ADD COLUMN name TEXT,
ADD COLUMN sort FLOAT,
ADD COLUMN completed_at TIMESTAMP;
```

**Mapping:**
| XML Field | job_operations Field | Notes |
|-----------|---------------------|-------|
| `<barcode>J1200~13055</barcode>` | `barcode` | Direct mapping |
| `<name>Indigo</name>` | `name` | Direct mapping |
| `<sort>2</sort>` | `sort` & `sequence_order` | Map to both fields |

## Recommended Implementation Plan

### Phase 1: Prepare Database
1. Create the `quotes` table (unchanged from old schema)
2. Add compatibility fields to `job_operations` table
3. Create `job_legacy_data` table for comprehensive field storage

### Phase 2: Update Parsers
1. **Jobs Parser**: Map core fields to new schema + store legacy data
2. **Quotes Parser**: Keep unchanged, just create the table

### Phase 3: Data Flow
```
XML Job Data
    ↓
Parse & Extract
    ↓
Core Fields → jobs table
Legacy Fields → job_legacy_data table
Customer Info → customers + customer_contacts
Process Steps → job_operations (with compatibility fields)
```

## Questions for Decision:

**1. Legacy Data Storage:**
- **Option A**: Store in `special_instructions` as JSON (simpler)
- **Option B**: Create `job_legacy_data` table (normalized, searchable)

**2. Material/Finishing Mapping:**
- Should I try to map `materialName`/`finishingName` to the new `materials`/`finishing_options` tables?
- Or store as text in legacy data for now?

**3. Account Manager:**
- Store in legacy data or try to map to `account_managers` table?

**4. Quote Integration:**
- Should the `quoteId`/`quoteLineId` reference the quotes table?
- Or store as text for now?

## My Recommendation:

**Start with Option A (JSON storage)** for rapid deployment:
- Store core production fields in main `jobs` table
- Store all legacy fields in `special_instructions` as JSON
- Add compatibility fields to `job_operations`
- Create `quotes` table unchanged

This allows immediate functionality while preserving all data for future normalization.

Would you like me to implement this approach?
