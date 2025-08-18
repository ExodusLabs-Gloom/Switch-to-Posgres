-- Database setup script for new job mapping
-- This script prepares the database for the new job parser mapping

-- 1. Create the quotes table (unchanged from old schema)
CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  lineIdentifier TEXT,
  lineIdentifierNoPrefix TEXT,
  quoteId TEXT,
  quoteIdNoPrefix TEXT,
  quoteLineId TEXT,
  quoteDescription TEXT,
  recipeId TEXT,
  quoteDate DATE,
  customerId TEXT,
  customerName TEXT,
  quantity INTEGER,
  sibling INTEGER,
  siblingCount INTEGER,
  revision INTEGER,
  sizeXmm FLOAT,
  sizeYmm FLOAT,
  fileName TEXT,
  materialName TEXT,
  laminateName TEXT,
  finishingName TEXT,
  printColour TEXT,
  tool TEXT,
  cores TEXT,
  handMachineApplied TEXT,
  supply TEXT,
  kinds INTEGER,
  rollDirection TEXT,
  lineDescription TEXT,
  notes TEXT,
  deliveryToAddress TEXT,
  profitCentreName TEXT,
  status TEXT,
  changeHistory TEXT,
  processed BOOLEAN DEFAULT FALSE
);

-- 2. Add compatibility fields to job_operations table
ALTER TABLE job_operations 
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS sort FLOAT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- 2a. Change sequence_order to support decimal values  
ALTER TABLE job_operations ALTER COLUMN sequence_order TYPE double precision;

-- 3. Add new columns to jobs table for XML fields
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS line_identifier TEXT,
ADD COLUMN IF NOT EXISTS line_identifier_no_prefix TEXT,
ADD COLUMN IF NOT EXISTS job_name TEXT,
ADD COLUMN IF NOT EXISTS recipe_id TEXT,
ADD COLUMN IF NOT EXISTS account_manager_name TEXT,
ADD COLUMN IF NOT EXISTS account_manager_email TEXT,
ADD COLUMN IF NOT EXISTS item_id TEXT,
ADD COLUMN IF NOT EXISTS product_id TEXT,
ADD COLUMN IF NOT EXISTS product_code TEXT,
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS sibling INTEGER,
ADD COLUMN IF NOT EXISTS sibling_count INTEGER,
ADD COLUMN IF NOT EXISTS revision INTEGER,
ADD COLUMN IF NOT EXISTS approvers TEXT,
ADD COLUMN IF NOT EXISTS material_name TEXT,
ADD COLUMN IF NOT EXISTS finishing_name TEXT,
ADD COLUMN IF NOT EXISTS print_colour TEXT,
ADD COLUMN IF NOT EXISTS tool TEXT,
ADD COLUMN IF NOT EXISTS cores TEXT,
ADD COLUMN IF NOT EXISTS hand_machine_applied TEXT,
ADD COLUMN IF NOT EXISTS supply TEXT,
ADD COLUMN IF NOT EXISTS kinds INTEGER,
ADD COLUMN IF NOT EXISTS roll_direction TEXT,
ADD COLUMN IF NOT EXISTS line_description TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS quote_id TEXT,
ADD COLUMN IF NOT EXISTS quote_line_id TEXT,
ADD COLUMN IF NOT EXISTS quote_date DATE,
ADD COLUMN IF NOT EXISTS profit_centre_name TEXT,
ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quotes_quoteId ON quotes(quoteId);
CREATE INDEX IF NOT EXISTS idx_quotes_customerId ON quotes(customerId);
CREATE INDEX IF NOT EXISTS idx_jobs_line_identifier ON jobs(line_identifier);
CREATE INDEX IF NOT EXISTS idx_jobs_quote_id ON jobs(quote_id);
CREATE INDEX IF NOT EXISTS idx_job_operations_barcode ON job_operations(barcode);

-- 5. Create customer_contacts table if it doesn't exist
CREATE TABLE IF NOT EXISTS customer_contacts (
  contact_id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(customer_id),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_type TEXT DEFAULT 'primary',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verification queries
SELECT 'Database setup completed successfully!' as status;

-- Show table structures
\d jobs
\d job_operations
\d quotes
