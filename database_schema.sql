-- Database schema for Quote and Job management system
-- Based on the provided schema.sql structure
-- Run this script in your PostgreSQL database before using the parsers

-- TABLE: customers
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  customerId TEXT UNIQUE,
  customerName TEXT,
  customerContactName TEXT,
  customerContactEmail TEXT
);

-- TABLE: quotes (expanded to include all XML fields)
CREATE TABLE quotes (
  id TEXT PRIMARY KEY,
  lineIdentifier TEXT,
  lineIdentifierNoPrefix TEXT,
  quoteId TEXT,
  quoteIdNoPrefix TEXT,
  quoteLineId TEXT,
  quoteDescription TEXT,
  recipeId TEXT,
  quoteDate DATE,
  customerId TEXT REFERENCES customers(customerId),
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

-- TABLE: customer_folders
CREATE TABLE customer_folders (
  id TEXT PRIMARY KEY,
  customerId TEXT REFERENCES customers(customerId),
  sizeXmm FLOAT,
  sizeYmm FLOAT,
  folderName TEXT
);

-- TABLE: customer_file_index
CREATE TABLE customer_file_index (
  id TEXT PRIMARY KEY,
  fileName TEXT,
  fileLocation TEXT,
  uploadedAt TIMESTAMP,
  usedInJobLineId TEXT, -- Optional backref to job_lines
  notes TEXT,
  customerFolderId TEXT REFERENCES customer_folders(id)
);

-- TABLE: job_lines
CREATE TABLE job_lines (
  id TEXT PRIMARY KEY,
  lineIdentifier TEXT,
  lineIdentifierNoPrefix TEXT,
  jobId TEXT,
  jobIdNoPrefix TEXT,
  jobLineId TEXT,
  jobName TEXT,
  recipeId TEXT,
  orderDate DATE,
  dueDate DATE,
  customerId TEXT REFERENCES customers(customerId),
  accountManagerName TEXT,
  accountManagerEmail TEXT,
  itemId TEXT,
  productId TEXT,
  productCode TEXT,
  productName TEXT,
  quantity INTEGER,
  sizeXmm FLOAT,
  sizeYmm FLOAT,
  sibling INTEGER,
  siblingCount INTEGER,
  revision INTEGER,
  approvers TEXT,
  fileName TEXT,
  fileLocation TEXT,
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
  quoteId TEXT REFERENCES quotes(quoteId),
  quoteLineId TEXT,
  quoteDate DATE,
  deliveryToAddress TEXT,
  profitCentreName TEXT,
  customerFolderId TEXT REFERENCES customer_folders(id),
  processed BOOLEAN DEFAULT FALSE
);

-- TABLE: job_line_files (many-to-many join between job_lines and customer_file_index)
CREATE TABLE job_line_files (
  id TEXT PRIMARY KEY,
  jobLineId TEXT REFERENCES job_lines(id),
  fileIndexId TEXT REFERENCES customer_file_index(id)
);

-- TABLE: process_steps
CREATE TABLE process_steps (
  id TEXT PRIMARY KEY,
  jobLineId TEXT REFERENCES job_lines(id),
  barcode TEXT,
  name TEXT,
  sort FLOAT,
  completedAt TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_customerId ON customers(customerId);
CREATE INDEX IF NOT EXISTS idx_quotes_quoteId ON quotes(quoteId);
CREATE INDEX IF NOT EXISTS idx_job_lines_customerId ON job_lines(customerId);
CREATE INDEX IF NOT EXISTS idx_job_lines_jobId ON job_lines(jobId);
CREATE INDEX IF NOT EXISTS idx_job_lines_lineIdentifier ON job_lines(lineIdentifier);
CREATE INDEX IF NOT EXISTS idx_process_steps_jobLineId ON process_steps(jobLineId);
CREATE INDEX IF NOT EXISTS idx_process_steps_barcode ON process_steps(barcode);
