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
async function parseQuoteXML(xmlContent) {
    try {
        const result = await parseStringPromise(xmlContent);
        const quotes = [];
        // The actual XML structure uses <jobline> as root element for both quotes and jobs
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
            quotes.push({
                lineIdentifier: jobline.lineIdentifier[0],
                lineIdentifierNoPrefix: jobline.lineIdentifierNoPrefix ? jobline.lineIdentifierNoPrefix[0] : undefined,
                quoteId: jobline.QuoteId[0], // Note: QuoteId has capital Q in quotes
                quoteIdNoPrefix: jobline.quoteIdNoPrefix ? jobline.quoteIdNoPrefix[0] : undefined,
                quoteLineId: jobline.QuoteLineId[0], // Note: QuoteLineId has capital Q and L
                quoteDescription: jobline.quoteDescription[0],
                recipeId: jobline.recipeId ? jobline.recipeId[0] : undefined,
                quoteDate: jobline.quoteDate[0],
                customerId: jobline.customerId[0],
                customerName: jobline.customerName[0],
                quantity: parseInt(jobline.quantity[0]),
                sibling: jobline.sibling ? parseInt(jobline.sibling[0]) : undefined,
                siblingCount: jobline.siblingCount ? parseInt(jobline.siblingCount[0]) : undefined,
                revision: jobline.revision ? parseInt(jobline.revision[0]) : undefined,
                sizeXmm: jobline.sizeXmm ? parseFloat(jobline.sizeXmm[0]) : undefined,
                sizeYmm: jobline.sizeYmm ? parseFloat(jobline.sizeYmm[0]) : undefined,
                fileName: jobline.fileName && jobline.fileName[0] !== 'nan' ? jobline.fileName[0] : undefined,
                materialName: jobline.materialName && jobline.materialName[0] !== 'nan' ? jobline.materialName[0] : undefined,
                laminateName: jobline.laminateName && jobline.laminateName[0] !== 'nan' ? jobline.laminateName[0] : undefined,
                finishingName: jobline.finishingName ? jobline.finishingName[0] : undefined,
                printColour: jobline.Print_Colour && jobline.Print_Colour[0] !== 'nan' ? jobline.Print_Colour[0] : undefined,
                tool: jobline.Tool && jobline.Tool[0] !== 'nan' ? jobline.Tool[0] : undefined,
                cores: jobline.Cores ? jobline.Cores[0] : undefined,
                handMachineApplied: jobline.key ? jobline.key.find((k) => k.$.name === 'Hand/Machine Applied')?._ : undefined,
                supply: jobline.Supply ? jobline.Supply[0] : undefined,
                kinds: jobline.kinds ? parseInt(jobline.kinds[0]) : undefined,
                rollDirection: jobline.RollDirection ? jobline.RollDirection[0] : undefined,
                lineDescription: jobline.lineDescription[0],
                notes: extractNotesFromLineDescription(jobline.lineDescription[0], jobline.Supply ? jobline.Supply[0] : ''),
                deliveryToAddress: jobline.deliveryToAddress && jobline.deliveryToAddress[0] !== 'nan' ? jobline.deliveryToAddress[0] : undefined,
                profitCentreName: jobline.profitCentreName ? jobline.profitCentreName[0] : undefined,
                processSteps: processSteps
            });
        }
        return quotes;
    }
    catch (error) {
        console.error('Error parsing XML:', error);
        return [];
    }
}
async function uploadToDatabase(quotes) {
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
        for (const quote of quotes) {
            // Insert or update customer with new schema
            await client.query(`
        INSERT INTO customers (customer_id, name) 
        VALUES ($1, $2) 
        ON CONFLICT (customer_id) DO UPDATE SET 
          name = EXCLUDED.name
      `, [quote.customerId, quote.customerName]);
            // Insert quote with all fields and processed flag reset to false (using lowercase column names)
            await client.query(`
        INSERT INTO quotes (
          id, lineidentifier, lineidentifiernoprefix, quoteid, quoteidnoprefix, 
          quotelineid, quotedescription, recipeid, quotedate, customerid, customername,
          quantity, sibling, siblingcount, revision, sizexmm, sizeymm, filename,
          materialname, laminatename, finishingname, printcolour, tool, cores,
          handmachineapplied, supply, kinds, rolldirection, linedescription, notes,
          deliverytoaddress, profitcentrename, status, changehistory, processed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35) 
        ON CONFLICT (id) DO UPDATE SET
          lineidentifier = EXCLUDED.lineidentifier,
          lineidentifiernoprefix = EXCLUDED.lineidentifiernoprefix,
          quoteid = EXCLUDED.quoteid,
          quoteidnoprefix = EXCLUDED.quoteidnoprefix,
          quotelineid = EXCLUDED.quotelineid,
          quotedescription = EXCLUDED.quotedescription,
          recipeid = EXCLUDED.recipeid,
          quotedate = EXCLUDED.quotedate,
          customerid = EXCLUDED.customerid,
          customername = EXCLUDED.customername,
          quantity = EXCLUDED.quantity,
          sibling = EXCLUDED.sibling,
          siblingcount = EXCLUDED.siblingcount,
          revision = EXCLUDED.revision,
          sizexmm = EXCLUDED.sizexmm,
          sizeymm = EXCLUDED.sizeymm,
          filename = EXCLUDED.filename,
          materialname = EXCLUDED.materialname,
          laminatename = EXCLUDED.laminatename,
          finishingname = EXCLUDED.finishingname,
          printcolour = EXCLUDED.printcolour,
          tool = EXCLUDED.tool,
          cores = EXCLUDED.cores,
          handmachineapplied = EXCLUDED.handmachineapplied,
          supply = EXCLUDED.supply,
          kinds = EXCLUDED.kinds,
          rolldirection = EXCLUDED.rolldirection,
          linedescription = EXCLUDED.linedescription,
          notes = EXCLUDED.notes,
          deliverytoaddress = EXCLUDED.deliverytoaddress,
          profitcentrename = EXCLUDED.profitcentrename,
          status = EXCLUDED.status,
          changehistory = EXCLUDED.changehistory,
          processed = FALSE`, [
                quote.lineIdentifier, quote.lineIdentifier, quote.lineIdentifierNoPrefix,
                quote.quoteId, quote.quoteIdNoPrefix, quote.quoteLineId, quote.quoteDescription,
                quote.recipeId, formatDateForDB(quote.quoteDate), quote.customerId, quote.customerName,
                quote.quantity, quote.sibling, quote.siblingCount, quote.revision,
                quote.sizeXmm, quote.sizeYmm, quote.fileName, quote.materialName, quote.laminateName,
                quote.finishingName, quote.printColour, quote.tool, quote.cores, quote.handMachineApplied,
                quote.supply, quote.kinds, quote.rollDirection, quote.lineDescription, quote.notes,
                quote.deliveryToAddress, quote.profitCentreName, 'Active', quote.quoteDescription, false
            ]);
            // Note: Process steps are not directly supported in the new schema
            // They would need to be linked to job_lines instead
            console.log(`Note: ${quote.processSteps.length} process steps found but not inserted (requires job_line association)`);
            console.log(`Processed quote: ${quote.lineIdentifier} - ${quote.quoteDescription}`);
        }
        console.log(`Processed ${quotes.length} quotes successfully`);
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
        console.log('Starting quote XML processing...');
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
        const quotes = await parseQuoteXML(xmlContent);
        if (quotes.length > 0) {
            await uploadToDatabase(quotes);
            console.log(`Successfully processed ${basename(xmlFilePath)}`);
        }
        else {
            console.log(`No quotes found in ${basename(xmlFilePath)}`);
        }
        console.log('Quote XML processing completed');
    }
    catch (error) {
        console.error('Error in main process:', error);
        process.exit(1);
    }
}
main();
