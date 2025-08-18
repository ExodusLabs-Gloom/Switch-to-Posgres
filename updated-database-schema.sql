-- Updated Database Schema for Switch to PostgreSQL Migration
-- Generated from current TypeScript parsers: parse-jobs-new.ts and parse-quotes.ts
-- Date: 2025-08-18

-- ===================================================================
-- CORE TABLES
-- ===================================================================

-- TABLE: customers
CREATE TABLE IF NOT EXISTS customers (
  customer_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: customer_contacts  
CREATE TABLE IF NOT EXISTS customer_contacts (
  contact_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(customer_id),
  contact_first_name TEXT,
  contact_email TEXT,
  contact_type TEXT DEFAULT 'primary',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: quotes
CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,                    -- lineIdentifier (quote primary key)
  lineidentifier TEXT NOT NULL,          -- lineIdentifier  
  lineidentifiernoprefix TEXT,           -- lineIdentifierNoPrefix
  quoteid TEXT NOT NULL,                 -- quoteId (Q-number)
  quoteidnoprefix TEXT,                  -- quoteIdNoPrefix
  quotelineid TEXT NOT NULL,             -- quoteLineId
  quotedescription TEXT NOT NULL,        -- quoteDescription
  recipeid TEXT,                         -- recipeId
  quotedate DATE,                        -- quoteDate (formatted)
  customerid TEXT REFERENCES customers(customer_id), -- customerId
  customername TEXT,                     -- customerName
  quantity INTEGER NOT NULL,             -- quantity
  sibling INTEGER,                       -- sibling
  siblingcount INTEGER,                  -- siblingCount
  revision INTEGER,                      -- revision
  sizexmm DOUBLE PRECISION,              -- sizeXmm
  sizeymm DOUBLE PRECISION,              -- sizeYmm
  filename TEXT,                         -- fileName
  materialname TEXT,                     -- materialName
  laminatename TEXT,                     -- laminateName
  finishingname TEXT,                    -- finishingName
  printcolour TEXT,                      -- printColour
  tool TEXT,                             -- tool
  cores TEXT,                            -- cores
  handmachineapplied TEXT,               -- handMachineApplied
  supply TEXT,                           -- supply
  kinds INTEGER,                         -- kinds
  rolldirection TEXT,                    -- rollDirection
  linedescription TEXT NOT NULL,         -- lineDescription
  notes TEXT,                            -- notes (extracted from lineDescription)
  deliverytoaddress TEXT,                -- deliveryToAddress
  profitcentrename TEXT,                 -- profitCentreName
  status TEXT DEFAULT 'Active',          -- status
  changehistory TEXT,                    -- changeHistory
  processed BOOLEAN DEFAULT FALSE,       -- processed flag
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: jobs (NEW MAPPING: jobLineId -> job_id, jobId -> job_number)
CREATE TABLE IF NOT EXISTS jobs (
  job_id TEXT PRIMARY KEY,              -- jobLineId (job primary key)
  job_number TEXT NOT NULL,             -- jobId (job display number)
  customer_id TEXT REFERENCES customers(customer_id), -- customerId
  line_identifier TEXT NOT NULL,        -- lineIdentifier
  line_identifier_no_prefix TEXT,       -- lineIdentifierNoPrefix
  job_name TEXT NOT NULL,               -- jobName
  recipe_id TEXT,                       -- recipeId
  order_date DATE,                      -- orderDate (formatted)
  due_date DATE,                        -- dueDate (formatted)
  delivery_address TEXT,                -- deliveryToAddress
  account_manager_name TEXT,            -- accountManagerName
  account_manager_email TEXT,           -- accountManagerEmail
  item_id TEXT,                         -- itemId
  product_id TEXT,                      -- productId
  product_code TEXT,                    -- productCode
  product_name TEXT NOT NULL,           -- productName
  qty_ordered INTEGER NOT NULL,         -- quantity
  size_x DOUBLE PRECISION,              -- sizeXmm
  size_y DOUBLE PRECISION,              -- sizeYmm
  sibling INTEGER,                      -- sibling
  sibling_count INTEGER,                -- siblingCount
  revision INTEGER,                     -- revision
  approvers TEXT,                       -- approvers
  material_name TEXT,                   -- materialName
  finishing_name TEXT,                  -- finishingName
  print_colour TEXT,                    -- printColour
  tool TEXT,                            -- tool
  cores TEXT,                           -- cores
  hand_machine_applied TEXT,            -- handMachineApplied
  supply TEXT,                          -- supply
  kinds INTEGER,                        -- kinds
  roll_direction TEXT,                  -- rollDirection
  line_description TEXT NOT NULL,       -- lineDescription
  notes TEXT,                           -- notes (extracted from lineDescription)
  quote_id TEXT,                        -- quoteId (reference to quotes.quoteid)
  quote_line_id TEXT,                   -- quoteLineId
  quote_date DATE,                      -- quoteDate (formatted)
  profit_centre_name TEXT,              -- profitCentreName
  processed BOOLEAN DEFAULT FALSE,      -- processed flag
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: job_operations (process steps with decimal sort support)
CREATE TABLE IF NOT EXISTS job_operations (
  job_operation_id TEXT PRIMARY KEY,    -- Composite: job_id + barcode
  job_id TEXT NOT NULL REFERENCES jobs(job_id), -- jobLineId
  barcode TEXT NOT NULL,                -- barcode
  name TEXT NOT NULL,                   -- name
  sort DOUBLE PRECISION NOT NULL,       -- sort (supports decimals: 2.5, 2.9, etc.)
  sequence_order DOUBLE PRECISION NOT NULL, -- sequence_order (same as sort)
  completed_at TIMESTAMP,              -- completion timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

-- Customer indexes
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Customer contacts indexes
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_email ON customer_contacts(contact_email);

-- Quote indexes
CREATE INDEX IF NOT EXISTS idx_quotes_quoteid ON quotes(quoteid);
CREATE INDEX IF NOT EXISTS idx_quotes_customerid ON quotes(customerid);
CREATE INDEX IF NOT EXISTS idx_quotes_quotedate ON quotes(quotedate);
CREATE INDEX IF NOT EXISTS idx_quotes_processed ON quotes(processed);

-- Job indexes
CREATE INDEX IF NOT EXISTS idx_jobs_job_number ON jobs(job_number);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_order_date ON jobs(order_date);
CREATE INDEX IF NOT EXISTS idx_jobs_due_date ON jobs(due_date);
CREATE INDEX IF NOT EXISTS idx_jobs_quote_id ON jobs(quote_id);
CREATE INDEX IF NOT EXISTS idx_jobs_processed ON jobs(processed);

-- Job operations indexes
CREATE INDEX IF NOT EXISTS idx_job_operations_job_id ON job_operations(job_id);
CREATE INDEX IF NOT EXISTS idx_job_operations_sort ON job_operations(sort);
CREATE INDEX IF NOT EXISTS idx_job_operations_barcode ON job_operations(barcode);

-- ===================================================================
-- TRIGGERS FOR UPDATED_AT
-- ===================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_contacts_updated_at BEFORE UPDATE ON customer_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_operations_updated_at BEFORE UPDATE ON job_operations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- COMMENTS
-- ===================================================================

COMMENT ON TABLE customers IS 'Customer master data';
COMMENT ON TABLE customer_contacts IS 'Customer contact information';
COMMENT ON TABLE quotes IS 'Quote data from Switch application';
COMMENT ON TABLE jobs IS 'Job data from Switch application with new mapping (jobLineId->job_id, jobId->job_number)';
COMMENT ON TABLE job_operations IS 'Job process steps with decimal sort order support';

COMMENT ON COLUMN jobs.job_id IS 'Primary key: jobLineId from XML (e.g., 373)';
COMMENT ON COLUMN jobs.job_number IS 'Display number: jobId from XML (e.g., J1200)';
COMMENT ON COLUMN jobs.notes IS 'Notes extracted from lineDescription after Supply content, || converted to line breaks';
COMMENT ON COLUMN quotes.notes IS 'Notes extracted from lineDescription after Supply content, || converted to line breaks';
COMMENT ON COLUMN job_operations.sort IS 'Sort order supporting decimal values (2, 2.5, 2.9, 3, etc.)';
