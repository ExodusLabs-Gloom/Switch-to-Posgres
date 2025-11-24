import { readFileSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';
import { Client } from 'pg';
import { config } from 'dotenv';
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
// Parse the new compact processList format: "~19716||Indigo||2^^~19717||Digicon||3^^..."
function parseCompactProcessList(processListValue) {
    if (!processListValue)
        return [];
    const steps = [];
    // Split on record separator
    const records = processListValue.split('^^');
    for (const record of records) {
        const trimmed = record.trim();
        if (!trimmed)
            continue;
        const parts = trimmed.split('||');
        if (parts.length < 3)
            continue;
        const [barcode, name, sortStr] = parts;
        const sort = parseFloat(sortStr);
        if (!barcode || !name || Number.isNaN(sort))
            continue;
        steps.push({ barcode, name, sort });
    }
    return steps;
}
async function parseQuoteXML(xmlContent) {
    try {
        const result = await parseStringPromise(xmlContent);
        const quotes = [];
        // Normalise structure: either <jobline>...</jobline> or a flat root object
        let jobline;
        if (result.jobline) {
            // Old structure: root is <jobline>
            jobline = result.jobline;
        }
        else {
            // New structure: fields are direct children of the root
            // xml2js wraps the root tag name (unknown), so pick the first key
            const rootKeys = Object.keys(result || {});
            if (rootKeys.length > 0) {
                const root = result[rootKeys[0]];
                if (root && root.lineIdentifier && root.QuoteLineId) {
                    jobline = root;
                }
            }
        }
        if (!jobline) {
            return [];
        }
        // Extract process steps for both formats
        const processSteps = [];
        if (jobline.processList && jobline.processList[0]) {
            const pl = jobline.processList[0];
            if (pl.item) {
                // Old nested item format
                for (const item of pl.item) {
                    processSteps.push({
                        barcode: item.barcode[0],
                        name: item.name[0],
                        sort: parseFloat(item.sort[0])
                    });
                }
            }
            else if (typeof pl === 'string') {
                // New compact string format on root
                processSteps.push(...parseCompactProcessList(pl));
            }
            else if (Array.isArray(pl) && typeof pl[0] === 'string') {
                processSteps.push(...parseCompactProcessList(pl[0]));
            }
        }
        // Handle different tag spellings / structures
        const printColour = (jobline.Print_Colour && jobline.Print_Colour[0]) ||
            (jobline['Print Colour'] && jobline['Print Colour'][0]) ||
            undefined;
        // Old: <key name="Hand/Machine Applied">HAND APPLIED</key>
        // New (after normalisation): <HandMachineApplied>HAND APPLIED</HandMachineApplied>
        let handMachineApplied;
        if (jobline.key && Array.isArray(jobline.key)) {
            const keyVal = jobline.key.find((k) => k.$ && k.$.name === 'Hand/Machine Applied');
            if (keyVal && typeof keyVal._ === 'string') {
                handMachineApplied = keyVal._;
            }
        }
        if (!handMachineApplied && jobline['Hand/Machine Applied']) {
            handMachineApplied = jobline['Hand/Machine Applied'][0];
        }
        if (!handMachineApplied && jobline.HandMachineApplied) {
            handMachineApplied = jobline.HandMachineApplied[0];
        }
        const supply = jobline.Supply ? jobline.Supply[0] : undefined;
        const lineDescription = jobline.lineDescription ? jobline.lineDescription[0] : '';
        quotes.push({
            lineIdentifier: jobline.lineIdentifier[0],
            lineIdentifierNoPrefix: jobline.lineIdentifierNoPrefix ? jobline.lineIdentifierNoPrefix[0] : undefined,
            quoteId: jobline.QuoteId[0],
            quoteIdNoPrefix: jobline.quoteIdNoPrefix ? jobline.quoteIdNoPrefix[0] : undefined,
            quoteLineId: jobline.QuoteLineId[0],
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
            printColour: printColour && printColour !== 'nan' ? printColour : undefined,
            tool: jobline.Tool && jobline.Tool[0] !== 'nan' ? jobline.Tool[0] : undefined,
            cores: jobline.Cores ? jobline.Cores[0] : undefined,
            handMachineApplied,
            supply,
            kinds: jobline.kinds ? parseInt(jobline.kinds[0]) : undefined,
            rollDirection: jobline.RollDirection ? jobline.RollDirection[0] : undefined,
            lineDescription,
            notes: extractNotesFromLineDescription(lineDescription, supply || ''),
            deliveryToAddress: jobline.deliveryToAddress && jobline.deliveryToAddress[0] !== 'nan' ? jobline.deliveryToAddress[0] : undefined,
            profitCentreName: jobline.profitCentreName ? jobline.profitCentreName[0] : undefined,
            processSteps
        });
        return quotes;
    }
    catch (error) {
        console.error('Error parsing XML:', error);
        return [];
    }
}
async function parseQuoteJSON(jsonContent) {
    const obj = JSON.parse(jsonContent);
    const processSteps = parseCompactProcessList(obj.processList);
    const printColour = obj['Print Colour'];
    const handMachineApplied = obj['Hand/Machine Applied'] ?? undefined;
    const supply = obj.Supply;
    const lineDescription = obj.lineDescription;
    const quote = {
        lineIdentifier: String(obj.lineIdentifier),
        lineIdentifierNoPrefix: obj.lineIdentifierNoPrefix ? String(obj.lineIdentifierNoPrefix) : undefined,
        quoteId: String(obj.QuoteId),
        quoteIdNoPrefix: obj.quoteIdNoPrefix ? String(obj.quoteIdNoPrefix) : undefined,
        quoteLineId: String(obj.QuoteLineId),
        quoteDescription: String(obj.quoteDescription),
        recipeId: obj.recipeId !== undefined ? String(obj.recipeId) : undefined,
        quoteDate: String(obj.quoteDate),
        customerId: String(obj.customerId),
        customerName: String(obj.customerName),
        quantity: Number(obj.quantity),
        sibling: obj.sibling !== undefined ? Number(obj.sibling) : undefined,
        siblingCount: obj.siblingCount !== undefined ? Number(obj.siblingCount) : undefined,
        revision: obj.revision !== undefined ? Number(obj.revision) : undefined,
        sizeXmm: obj.sizeXmm !== undefined && obj.sizeXmm !== "" ? Number(obj.sizeXmm) : undefined,
        sizeYmm: obj.sizeYmm !== undefined && obj.sizeYmm !== "" ? Number(obj.sizeYmm) : undefined,
        fileName: obj.fileName && obj.fileName !== '' ? String(obj.fileName) : undefined,
        materialName: obj.materialName && obj.materialName !== '' ? String(obj.materialName) : undefined,
        laminateName: obj.laminateName && obj.laminateName !== '' ? String(obj.laminateName) : undefined,
        finishingName: obj.finishingName && obj.finishingName !== '' ? String(obj.finishingName) : undefined,
        printColour: printColour && printColour !== '' ? printColour : undefined,
        tool: obj.Tool && obj.Tool !== '' ? String(obj.Tool) : undefined,
        cores: obj.Cores && obj.Cores !== '' ? String(obj.Cores) : undefined,
        handMachineApplied,
        supply,
        kinds: obj.kinds !== undefined ? Number(obj.kinds) : undefined,
        rollDirection: obj.RollDirection ? String(obj.RollDirection) : undefined,
        lineDescription: lineDescription || '',
        notes: extractNotesFromLineDescription(lineDescription || '', supply || ''),
        deliveryToAddress: obj.deliveryToAddress && obj.deliveryToAddress !== '' ? String(obj.deliveryToAddress) : undefined,
        profitCentreName: obj.profitCentreName ? String(obj.profitCentreName) : undefined,
        processSteps,
    };
    return [quote];
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
        console.log('Starting quote XML/JSON processing...');
        const xmlFilePath = process.argv[2];
        if (!xmlFilePath) {
            console.error('Error: Please provide XML or JSON file path as argument');
            process.exit(1);
        }
        if (!existsSync(xmlFilePath)) {
            console.error(`Error: file not found at ${xmlFilePath}`);
            process.exit(1);
        }
        console.log(`Processing ${xmlFilePath}...`);
        const content = readFileSync(xmlFilePath, 'utf8');
        const lower = xmlFilePath.toLowerCase();
        let quotes = [];
        if (lower.endsWith('.json')) {
            quotes = await parseQuoteJSON(content);
        }
        else {
            let xmlContent = content;
            xmlContent = xmlContent
                .replace(/<Hand\/Machine Applied>/g, '<HandMachineApplied>')
                .replace(/<\/Hand\/Machine Applied>/g, '</HandMachineApplied>');
            const trimmed = xmlContent.trim();
            if (!trimmed.startsWith('<jobline') && !trimmed.startsWith('<?xml')) {
                console.log('No root <jobline> element detected, wrapping content...');
                xmlContent = `<jobline>\n${xmlContent}\n</jobline>`;
            }
            quotes = await parseQuoteXML(xmlContent);
        }
        if (quotes.length > 0) {
            await uploadToDatabase(quotes);
            console.log(`Successfully processed ${basename(xmlFilePath)}`);
        }
        else {
            console.log(`No quotes found in ${basename(xmlFilePath)}`);
        }
        console.log('Processing completed');
    }
    catch (error) {
        console.error('Error in main process:', error);
        process.exit(1);
    }
}
main();
