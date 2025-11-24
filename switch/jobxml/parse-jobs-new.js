import { readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { parseStringPromise } from 'xml2js';
import { Client } from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });
async function parseJobXML(xmlContent) {
    try {
        // Validation: Check if XML has a root element, if not wrap it in <jobline>
        let processedXml = xmlContent.trim();
        // Check if XML starts with <?xml declaration
        const hasXmlDeclaration = processedXml.startsWith('<?xml');
        // Remove XML declaration temporarily if present
        let xmlDeclaration = '';
        if (hasXmlDeclaration) {
            const declarationEnd = processedXml.indexOf('?>');
            if (declarationEnd !== -1) {
                xmlDeclaration = processedXml.substring(0, declarationEnd + 2);
                processedXml = processedXml.substring(declarationEnd + 2).trim();
            }
        }
        // Check if content has a root element wrapper
        // Valid XML should start with a single root element like <jobline>...</jobline>
        // Invalid XML (from newxml folder) has multiple top-level elements
        const needsWrapper = !processedXml.startsWith('<jobline>') &&
            !processedXml.startsWith('<jobs>');
        if (needsWrapper) {
            console.log('Warning: XML missing root element, wrapping in <jobline>');
            processedXml = `<jobline>${processedXml}</jobline>`;
        }
        // Re-add XML declaration if it was present
        if (xmlDeclaration) {
            processedXml = xmlDeclaration + '\n' + processedXml;
        }
        const result = await parseStringPromise(processedXml);
        const jobs = [];
        // The actual XML structure uses <jobline> as root element
        if (result.jobline) {
            const jobline = result.jobline;
            // Extract process steps if they exist
            const processSteps = [];
            if (jobline.processList && jobline.processList[0] && jobline.processList[0].item) {
                for (const item of jobline.processList[0].item) {
                    processSteps.push({
                        barcode: item.barcode[0],
                        name: item.name[0],
                        sort: parseFloat(item.sort[0])
                    });
                }
            }
            jobs.push({
                lineIdentifier: jobline.lineIdentifier[0],
                lineIdentifierNoPrefix: jobline.lineIdentifierNoPrefix ? jobline.lineIdentifierNoPrefix[0] : undefined,
                jobId: jobline.jobId[0],
                jobIdNoPrefix: jobline.jobIdNoPrefix ? jobline.jobIdNoPrefix[0] : undefined,
                jobLineId: jobline.jobLineId[0],
                jobName: jobline.jobName[0] === 'nan' ? 'Unnamed Job' : jobline.jobName[0],
                recipeId: jobline.recipeId ? jobline.recipeId[0] : undefined,
                customerId: jobline.customerId[0],
                customerName: jobline.customerName[0],
                customerContactName: jobline.customerContactName ? jobline.customerContactName[0] : undefined,
                customerContactEmail: jobline.customerContactEmail ? jobline.customerContactEmail[0] : undefined,
                accountManagerName: jobline.accountManagerName ? jobline.accountManagerName[0] : undefined,
                accountManagerEmail: jobline.accountManagerEmail ? jobline.accountManagerEmail[0] : undefined,
                itemId: jobline.itemId ? jobline.itemId[0] : undefined,
                productId: jobline.productId ? jobline.productId[0] : undefined,
                productCode: jobline.productCode ? jobline.productCode[0] : undefined,
                productName: jobline.productName[0],
                quantity: parseInt(jobline.quantity[0]),
                sizeXmm: jobline.sizeXmm ? parseFloat(jobline.sizeXmm[0]) : undefined,
                sizeYmm: jobline.sizeYmm ? parseFloat(jobline.sizeYmm[0]) : undefined,
                sibling: jobline.sibling ? parseInt(jobline.sibling[0]) : undefined,
                siblingCount: jobline.siblingCount ? parseInt(jobline.siblingCount[0]) : undefined,
                revision: jobline.revision ? parseInt(jobline.revision[0]) : undefined,
                approvers: jobline.approvers ? jobline.approvers[0] : undefined,
                // fileName and laminateName excluded as requested
                fileLocation: jobline.fileLocation && jobline.fileLocation[0] !== 'PH-fileLocation' ? jobline.fileLocation[0] : undefined,
                orderDate: jobline.orderDate[0],
                dueDate: jobline.dueDate[0],
                materialName: jobline.materialName ? jobline.materialName[0] : undefined,
                finishingName: jobline.finishingName ? jobline.finishingName[0] : undefined,
                printColour: jobline.Print_Colour && jobline.Print_Colour[0] !== 'nan' ? jobline.Print_Colour[0] : undefined,
                tool: jobline.Tool ? jobline.Tool[0] : undefined,
                cores: jobline.Cores ? jobline.Cores[0] : undefined,
                handMachineApplied: jobline.key ? jobline.key.find((k) => k.$.name === 'Hand/Machine Applied')?._ : undefined,
                supply: jobline.Supply ? jobline.Supply[0] : undefined,
                kinds: jobline.kinds ? parseInt(jobline.kinds[0]) : undefined,
                rollDirection: jobline.RollDirection ? jobline.RollDirection[0] : undefined,
                lineDescription: jobline.lineDescription[0],
                notes: extractNotesFromLineDescription(jobline.lineDescription[0], jobline.Supply ? jobline.Supply[0] : ''),
                quoteId: jobline.quoteId ? jobline.quoteId[0] : undefined,
                quoteLineId: jobline.quoteLineId ? jobline.quoteLineId[0] : undefined,
                quoteDate: jobline.quoteDate ? jobline.quoteDate[0] : undefined,
                deliveryToAddress: jobline.deliveryToAddress ? jobline.deliveryToAddress[0] : undefined,
                profitCentreName: jobline.profitCentreName ? jobline.profitCentreName[0] : undefined,
                processSteps: processSteps
            });
        }
        return jobs;
    }
    catch (error) {
        console.error('Error parsing XML:', error);
        return [];
    }
}
// Helper function to convert DD-MM-YYYY to YYYY-MM-DD
function formatDateForDB(dateString) {
    if (!dateString)
        return dateString;
    // Check if date is in DD-MM-YYYY format
    const ddMmYyyyMatch = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (ddMmYyyyMatch) {
        const [, day, month, year] = ddMmYyyyMatch;
        return `${year}-${month}-${day}`;
    }
    // Return as-is if already in correct format or different format
    return dateString;
}
// Helper function to extract notes from lineDescription after Supply content
function extractNotesFromLineDescription(lineDescription, supply) {
    if (!lineDescription || !supply)
        return '';
    // Find the position of the supply text in the line description
    const supplyMatch = lineDescription.indexOf(`Supply: ${supply}`);
    if (supplyMatch === -1)
        return '';
    // Find the end of the supply section (next || after the supply text)
    const supplyEnd = lineDescription.indexOf('||', supplyMatch + `Supply: ${supply}`.length);
    if (supplyEnd === -1)
        return '';
    // Extract everything after the supply section
    const notesSection = lineDescription.substring(supplyEnd + 2);
    // Convert double pipes to line breaks and clean up
    return notesSection
        .split('||')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
}
async function uploadToDatabase(jobs) {
    const client = new Client({
        host: process.env.PG_HOST,
        port: Number(process.env.PG_PORT),
        database: process.env.PG_DATABASE,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
    });
    try {
        await client.connect();
        console.log('Connected to database');
        for (const job of jobs) {
            // Insert or update customer with new schema
            await client.query(`
        INSERT INTO customers (customer_id, name) 
        VALUES ($1, $2) 
        ON CONFLICT (customer_id) DO UPDATE SET 
          name = EXCLUDED.name
      `, [job.customerId, job.customerName]);
            // Insert customer contact if available
            if (job.customerContactName || job.customerContactEmail) {
                await client.query(`
          INSERT INTO customer_contacts (contact_id, customer_id, contact_first_name, contact_email, contact_type, is_primary) 
          VALUES ($1, $2, $3, $4, $5, $6) 
          ON CONFLICT (contact_id) DO UPDATE SET 
            contact_first_name = EXCLUDED.contact_first_name,
            contact_email = EXCLUDED.contact_email
        `, [`${job.customerId}_primary`, job.customerId, job.customerContactName, job.customerContactEmail, 'primary', true]);
            }
            // Check if quote exists, set to null if not found
            let validQuoteId = null;
            if (job.quoteId) {
                try {
                    const quoteResult = await client.query('SELECT quoteid FROM quotes WHERE quoteid = $1', [job.quoteId]);
                    if (quoteResult.rows.length > 0) {
                        validQuoteId = job.quoteId;
                    }
                    else {
                        // For now, just use the quote ID from XML since quotes table might be empty
                        validQuoteId = job.quoteId;
                        console.log(`Note: Quote ${job.quoteId} not found in quotes table, but proceeding with quote reference for job ${job.jobLineId}`);
                    }
                }
                catch (error) {
                    console.log(`Warning: Error checking quote ${job.quoteId}, using quote ID anyway:`, error.message);
                    validQuoteId = job.quoteId;
                }
            }
            // NEW MAPPING: jobLineId -> job_id, jobId -> job_number
            await client.query(`INSERT INTO jobs (
          job_id, job_number, customer_id, line_identifier, line_identifier_no_prefix, 
          job_name, recipe_id, order_date, due_date, delivery_address,
          account_manager_name, account_manager_email, item_id, product_id, 
          product_code, product_name, qty_ordered, size_x, size_y,
          sibling, sibling_count, revision, approvers, material_name, 
          finishing_name, print_colour, tool, cores, hand_machine_applied, 
          supply, kinds, roll_direction, line_description, notes, quote_id, 
          quote_line_id, quote_date, profit_centre_name, processed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39)
        ON CONFLICT (job_id) DO UPDATE SET
          job_number = EXCLUDED.job_number,
          line_identifier = EXCLUDED.line_identifier,
          line_identifier_no_prefix = EXCLUDED.line_identifier_no_prefix,
          job_name = EXCLUDED.job_name,
          recipe_id = EXCLUDED.recipe_id,
          order_date = EXCLUDED.order_date,
          due_date = EXCLUDED.due_date,
          delivery_address = EXCLUDED.delivery_address,
          account_manager_name = EXCLUDED.account_manager_name,
          account_manager_email = EXCLUDED.account_manager_email,
          item_id = EXCLUDED.item_id,
          product_id = EXCLUDED.product_id,
          product_code = EXCLUDED.product_code,
          product_name = EXCLUDED.product_name,
          qty_ordered = EXCLUDED.qty_ordered,
          size_x = EXCLUDED.size_x,
          size_y = EXCLUDED.size_y,
          sibling = EXCLUDED.sibling,
          sibling_count = EXCLUDED.sibling_count,
          revision = EXCLUDED.revision,
          approvers = EXCLUDED.approvers,
          material_name = EXCLUDED.material_name,
          finishing_name = EXCLUDED.finishing_name,
          print_colour = EXCLUDED.print_colour,
          tool = EXCLUDED.tool,
          cores = EXCLUDED.cores,
          hand_machine_applied = EXCLUDED.hand_machine_applied,
          supply = EXCLUDED.supply,
          kinds = EXCLUDED.kinds,
          roll_direction = EXCLUDED.roll_direction,
          line_description = EXCLUDED.line_description,
          notes = EXCLUDED.notes,
          quote_id = EXCLUDED.quote_id,
          quote_line_id = EXCLUDED.quote_line_id,
          quote_date = EXCLUDED.quote_date,
          profit_centre_name = EXCLUDED.profit_centre_name,
          processed = FALSE`, [
                job.jobLineId, // job_id (NEW MAPPING: jobLineId -> job_id)
                job.jobId, // job_number (NEW MAPPING: jobId -> job_number) 
                job.customerId, // customer_id
                job.lineIdentifier, job.lineIdentifierNoPrefix, job.jobName, job.recipeId,
                formatDateForDB(job.orderDate), formatDateForDB(job.dueDate), job.deliveryToAddress,
                job.accountManagerName, job.accountManagerEmail, job.itemId, job.productId,
                job.productCode, job.productName, job.quantity, job.sizeXmm, job.sizeYmm,
                job.sibling, job.siblingCount, job.revision, job.approvers, job.materialName,
                job.finishingName, job.printColour, job.tool, job.cores, job.handMachineApplied,
                job.supply, job.kinds, job.rollDirection, job.lineDescription, job.notes, validQuoteId,
                job.quoteLineId, job.quoteDate ? formatDateForDB(job.quoteDate) : null,
                job.profitCentreName, false // processed
            ]);
            // Insert job operations with compatibility fields
            for (const step of job.processSteps) {
                await client.query(`
          INSERT INTO job_operations (job_operation_id, job_id, barcode, name, sort, sequence_order) 
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (job_operation_id) DO UPDATE SET
            name = EXCLUDED.name,
            sort = EXCLUDED.sort,
            sequence_order = EXCLUDED.sequence_order
        `, [`${job.jobLineId}_${step.barcode}`, job.jobLineId, step.barcode, step.name, step.sort, step.sort]);
            }
            console.log(`Processed job: ${job.jobLineId} (${job.jobId}) - ${job.productName}`);
        }
        console.log(`Processed ${jobs.length} jobs successfully`);
    }
    catch (error) {
        console.error('Database error:', error);
        throw error;
    }
    finally {
        await client.end();
    }
}
async function main() {
    try {
        console.log('Starting job XML processing...');
        // Get XML file path from command line arguments
        const xmlFilePath = process.argv[2];
        if (!xmlFilePath) {
            console.error('Error: Please provide XML file path as argument');
            process.exit(1);
        }
        if (!existsSync(xmlFilePath)) {
            console.error(`Error: XML file not found at ${xmlFilePath}`);
            process.exit(1);
        }
        console.log(`Processing ${xmlFilePath}...`);
        const xmlContent = readFileSync(xmlFilePath, 'utf8');
        const jobs = await parseJobXML(xmlContent);
        if (jobs.length > 0) {
            await uploadToDatabase(jobs);
            console.log(`Successfully processed ${basename(xmlFilePath)}`);
        }
        else {
            console.log(`No jobs found in ${basename(xmlFilePath)}`);
        }
        console.log('Job XML processing completed');
    }
    catch (error) {
        console.error('Error in main process:', error);
        process.exit(1);
    }
}
main();
