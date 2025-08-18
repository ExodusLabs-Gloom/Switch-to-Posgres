-- Migration script to transfer data from job_lines to new jobs table
-- This script maps existing job_lines data to the new comprehensive jobs table structure

-- Skip backup creation if already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'job_lines_backup') THEN
        CREATE TABLE job_lines_backup AS SELECT * FROM job_lines;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'process_steps_backup') THEN
        CREATE TABLE process_steps_backup AS SELECT * FROM process_steps;
    END IF;
END $$;

-- Migration SQL to populate the new jobs table from existing job_lines
INSERT INTO jobs (
    -- Primary identification (using existing column names)
    job_id,                      -- Maps to id from job_lines  
    customer_id,                 -- Maps to customerId
    
    -- Preserve existing job_lines compatibility fields
    lineidentifier,
    lineidentifiernoprefix,
    joblineid,                   -- Keep as order reference
    quotelineid,
    jobname,
    recipeid,
    orderdate,
    duedate,
    accountmanagername,
    accountmanageremail,
    itemid,
    productid,
    productcode,
    productname,
    
    -- Production specifications (map existing fields)
    qty_ordered,                 -- Maps to quantity
    size_x,                      -- Maps to sizeXmm
    size_y,                      -- Maps to sizeYmm
    
    -- Preserve all existing fields exactly as they are
    quantity,
    sibling,
    siblingcount,
    revision,
    approvers,
    filename,
    filelocation,
    materialname,
    laminatename,
    finishingname,
    printcolour,
    tool,
    cores,
    handmachineapplied,
    supply,
    kinds,
    rolldirection,
    linedescription,
    quoteid,
    deliverytoaddress,
    profitcentrename,
    customerfolderid,
    processed
)
SELECT 
    -- Primary identification
    id as job_id,
    customerId as customer_id,
    
    -- Preserve existing job_lines compatibility fields
    lineIdentifier,
    lineIdentifierNoPrefix,
    jobLineId,
    quoteLineId,
    jobName,
    recipeId,
    orderDate,
    dueDate,
    accountManagerName,
    accountManagerEmail,
    itemId,
    productId,
    productCode,
    productName,
    
    -- Production specifications (map existing fields)
    quantity as qty_ordered,
    sizeXmm as size_x,
    sizeYmm as size_y,
    
    -- Preserve all existing fields exactly as they are
    quantity,
    sibling,
    siblingCount,
    revision,
    approvers,
    fileName,
    fileLocation,
    materialName,
    laminateName,
    finishingName,
    printColour,
    tool,
    cores,
    handMachineApplied,
    supply,
    kinds,
    rollDirection,
    lineDescription,
    quoteId,
    deliveryToAddress,
    profitCentreName,
    customerFolderId,
    processed
FROM job_lines;

-- Migrate process_steps to job_operations with compatibility fields
INSERT INTO job_operations (
    job_operation_id,
    job_id,
    barcode,
    name,
    sort,
    sequence_order,
    completedat
)
SELECT 
    id as job_operation_id,
    jobLineId as job_id,
    barcode,
    name,
    sort,
    sort as sequence_order,
    completedAt
FROM process_steps;

-- Verify the migration
SELECT 
    'job_lines' as source_table, 
    COUNT(*) as record_count 
FROM job_lines
UNION ALL
SELECT 
    'jobs' as source_table, 
    COUNT(*) as record_count 
FROM jobs
UNION ALL
SELECT 
    'process_steps' as source_table, 
    COUNT(*) as record_count 
FROM process_steps
UNION ALL
SELECT 
    'job_operations' as source_table, 
    COUNT(*) as record_count 
FROM job_operations;

-- Show sample of migrated data
SELECT 
    job_id,
    joblineid,
    customer_id,
    jobname,
    quantity,
    qty_ordered,
    size_x,
    size_y,
    processed
FROM jobs 
LIMIT 5;

-- Show sample of migrated job operations
SELECT 
    job_operation_id,
    job_id,
    barcode,
    name,
    sort,
    sequence_order
FROM job_operations 
LIMIT 5;
