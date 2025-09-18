// Onprintshop XML parser (initial version)
// Copy of jobxml/parse-jobs-new.ts, to be customized after sample XML is provided
import * as fs from 'fs';
import * as path from 'path';
import { parseStringPromise } from 'xml2js';
import { Client } from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

// Helper: convert DD-MM-YYYY or YYYY-MM-DD to YYYY-MM-DD
function formatDateForDB(dateString: string): string {
  if (!dateString) return dateString;
  // Accepts DD-MM-YYYY or YYYY-MM-DD
  const ddMmYyyyMatch = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddMmYyyyMatch) {
    const [, day, month, year] = ddMmYyyyMatch;
    return `${year}-${month}-${day}`;
  }
  const yyyyMmDdMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyyMmDdMatch) {
    return dateString;
  }
  return dateString;
}

// Helper: add business days (Mon-Fri only, skips Sat/Sun and public holidays)
const PUBLIC_HOLIDAYS = [
  // Add your public holidays here in 'YYYY-MM-DD' format
  '2025-01-01', // New Year's Day
  '2025-01-27', // Australia Day (observed)
  '2025-04-18', // Good Friday
  '2025-04-21', // Easter Monday
  '2025-04-25', // Anzac Day
  '2025-06-09', // Queen's Birthday
  '2025-12-25', // Christmas Day
  '2025-12-26', // Boxing Day
  // ...add more as needed
];
function addBusinessDays(date: Date, days: number): Date {
  let result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const yyyyMmDd = result.toISOString().slice(0, 10);
    // Only count Monday–Friday as business days (skip Saturday/Sunday and public holidays)
    if (
      result.getDay() >= 1 && result.getDay() <= 5 &&
      !PUBLIC_HOLIDAYS.includes(yyyyMmDd)
    ) {
      added++;
    }
  }
  return result;
}

// Minimal notes extraction (placeholder, can be improved if needed)
function extractNotesFromProduct(item: any): string {
  // Example: extract from products_name or another field if needed
  return '';
}

// --- Material Normalization Settings ---
const MATERIAL_RULES = [
  { name: 'MAT-JOB-1755527048343-6', match: [/metallic/i] },
  { name: 'MAT-JOB-1755527048344-7', match: [/synthetic/i, /craft beer/i] },
  { name: 'MAT-JOB-1755527048346-12', match: [/standard/i, /paper/i] },
  { name: 'MAT-JOB-1755527048335-0', match: [/premium/i] },
];

function normalizeMaterial(productTitle: string = '', productInfo: string = ''): string {
  const combined = `${productTitle} ${productInfo}`;
  for (const rule of MATERIAL_RULES) {
    if (rule.match.some((re: RegExp) => re.test(combined))) {
      return rule.name;
    }
  }
  return '';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '../../.env') });

async function main() {
  try {
    console.log('Starting Onprintshop XML processing...');
    // Get XML file path from command line arguments
    const xmlFilePath = process.argv[2];
    if (!xmlFilePath) {
      console.error('Error: Please provide XML file path as argument');
      process.exit(1);
    }
    if (!fs.existsSync(xmlFilePath)) {
      console.error(`Error: XML file not found at ${xmlFilePath}`);
      process.exit(1);
    }
    if (!fs.statSync(xmlFilePath).isFile()) {
      console.error(`Error: Provided path is not a file: ${xmlFilePath}`);
      process.exit(1);
    }
    console.log(`Processing ${xmlFilePath}...`);
    const xml = fs.readFileSync(xmlFilePath, 'utf-8');
    const result = await parseStringPromise(xml);
    const order = result.order;
    if (!order) return;
    const jobNumber = order.order_number?.[0] || order.orders_id?.[0];
    const jobId = 'Labex_' + order.orders_id?.[0];
    const customerId = null; // Set customerId to null for now

    // Connect to Postgres
    const client = new Client({
      host: process.env.PG_HOST,
      port: Number(process.env.PG_PORT),
      database: process.env.PG_DATABASE,
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
    });
    await client.connect();

    // Extract job line details from the first <items> (if present)
    const firstItem = order.product_details?.[0]?.items?.[0] || {};
    // Normalized material from job line
    const material = normalizeMaterial(firstItem.products_title?.[0], firstItem.product_info?.[0]);

    // Parse size into size_x and size_y (expects format like '100x200mm' or '100 x 200 mm')
    let size_x = null, size_y = null;
    const sizeStr = firstItem.productsize?.[0] || '';
    const sizeMatch = sizeStr.match(/(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)/);
    if (sizeMatch) {
      size_x = parseFloat(sizeMatch[1]);
      size_y = parseFloat(sizeMatch[2]);
    }

    // --- Finishing Normalization ---
    let finishing_id = null;
    const finish = firstItem.features_details?.[0]?.Finish?.[0]?.toLowerCase() || '';
    const productTitle = firstItem.products_title?.[0]?.toLowerCase() || '';
    if (finish.includes('gloss')) {
      finishing_id = 'GLOSS_LAM';
    } else if (finish.includes('matt')) {
      finishing_id = 'MATT_LAM';
    } else if (productTitle.includes('premium wine')) {
      finishing_id = 'MATT_VARN';
    }

    // --- Material Normalization for material_id ---
    let material_id = null;
    const materialStr = `${firstItem.products_title?.[0] || ''} ${firstItem.product_info?.[0] || ''}`.toLowerCase();
    if (materialStr.includes('metallic')) {
      material_id = 'MAT-JOB-1755527048343-6';
    } else if (materialStr.includes('synthetic') || materialStr.includes('craft beer')) {
      material_id = 'MAT-JOB-1755527048344-7';
    } else if (materialStr.includes('standard') || materialStr.includes('paper')) {
      material_id = 'MAT-JOB-1755527048346-12';
    } else if (materialStr.includes('premium')) {
      material_id = 'MAT-JOB-1755527048335-0';
    }

    // --- Print Colour Normalization ---
    let print_colour = 'CMYK';
    const whiteInk = firstItem.features_details?.[0]?.White_Ink?.[0]?.toLowerCase() || '';
    if (whiteInk === 'required' || whiteInk === 'yes' || whiteInk === 'true') {
      print_colour = 'W+CMYK';
    }

    // Parse kinds (versions) as integer
    let kinds = 0;
    const versionsRaw = firstItem.features_details?.[0]?.Versions?.[0] || '';
    const kindsMatch = versionsRaw.match(/(\d+)/);
    if (kindsMatch) {
      kinds = parseInt(kindsMatch[1], 10);
    }

    // Compose line_identifier_no_prefix: prefer orders_products_id (the user's requested value),
    // then order_product_id, otherwise fall back to orderId_productId combination.
    const ordersProductsId = firstItem.orders_products_id?.[0] || firstItem.orders_products_id || null;
    const orderProductId = firstItem.order_product_id?.[0] || firstItem.order_product_id || null;
    const orderId = order.orders_id?.[0] || order.orders_id || null;
    let line_identifier_no_prefix = '';
    if (ordersProductsId) {
      line_identifier_no_prefix = String(ordersProductsId);
    } else if (orderProductId) {
      line_identifier_no_prefix = String(orderProductId);
    } else if (orderId) {
      // fallback: combine order id and any product id present
      line_identifier_no_prefix = `${orderId}_${orderProductId || ''}`;
    }

    // Info: log the computed line identifier (minimal logging)
    console.log('Computed line_identifier_no_prefix =', line_identifier_no_prefix);

    // Format order_date and calculate due_date (5 business days after order_date)
    let order_date_raw = order.orders_date_finished?.[0] || order.order_date_finished?.[0];
    let order_date = order_date_raw ? formatDateForDB(order_date_raw.split(' ')[0]) : null;
    let due_date = null;
    if (order_date) {
      const orderDateObj = new Date(order_date);
      const dueDateObj = addBusinessDays(orderDateObj, 5);
      // Format as YYYY-MM-DD
      due_date = dueDateObj.toISOString().slice(0, 10);
    }

    // Insert/update job (jobs table)
    await client.query(`
      INSERT INTO jobs (job_id, job_number, customer_id, notes, shipping_mode, courier_company_name, shipping_type_id, order_date, due_date, product_name, qty_ordered, size_x, size_y, product_id, finishing_id, material_id, kinds, hand_machine_applied, print_colour, cores, roll_direction, job_name, line_identifier_no_prefix)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      ON CONFLICT (job_id) DO UPDATE SET
        job_number = EXCLUDED.job_number,
        customer_id = EXCLUDED.customer_id,
        notes = EXCLUDED.notes,
        shipping_mode = EXCLUDED.shipping_mode,
        courier_company_name = EXCLUDED.courier_company_name,
        shipping_type_id = EXCLUDED.shipping_type_id,
        order_date = EXCLUDED.order_date,
        due_date = EXCLUDED.due_date,
        product_name = EXCLUDED.product_name,
        qty_ordered = EXCLUDED.qty_ordered,
        size_x = EXCLUDED.size_x,
        size_y = EXCLUDED.size_y,
        product_id = EXCLUDED.product_id,
        finishing_id = EXCLUDED.finishing_id,
        material_id = EXCLUDED.material_id,
        kinds = EXCLUDED.kinds,
        hand_machine_applied = EXCLUDED.hand_machine_applied,
        print_colour = EXCLUDED.print_colour,
        cores = EXCLUDED.cores,
        roll_direction = EXCLUDED.roll_direction,
        job_name = EXCLUDED.job_name,
        line_identifier_no_prefix = EXCLUDED.line_identifier_no_prefix
    `, [
      jobId,
      jobNumber,
      customerId,
      order.order_note?.[0] || '',
      order.shipping_mode?.[0] || '',
      order.courirer_company_name?.[0] || '',
      order.shipping_type_id?.[0] || '',
      order_date,
      due_date,
      firstItem.products_name?.[0] || '',
      firstItem.products_quantity?.[0] || '',
      size_x,
      size_y,
      firstItem.product_id?.[0] || '',
      finishing_id,
      material_id,
      kinds,
      firstItem.features_details?.[0]?.Application?.[0] || '', // hand_machine_applied
      print_colour,
      firstItem.features_details?.[0]?.Core_Size?.[0] || '', // cores
      firstItem.features_details?.[0]?.Roll_Direction?.[0] || '',
      // Map job_name as product_title
      firstItem.products_title?.[0] || '',
      line_identifier_no_prefix
    ]);
    await client.end();
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
}

main().catch(console.error);
