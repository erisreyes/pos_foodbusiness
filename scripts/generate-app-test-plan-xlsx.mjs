/**
 * Generates APP_TEST_PLAN.xlsx (Office Open XML) using only Node built-ins.
 * Run: node scripts/generate-app-test-plan-xlsx.mjs
 */
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateRawSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outPath = join(root, 'APP_TEST_PLAN.xlsx');
const tmpDir = join(root, '.xlsx-tmp');

const SOURCE = 'src/app/App.tsx';

const TEST_CASE_HEADERS = [
  'Test ID',
  'Section',
  'Scenario',
  'Step',
  'Role',
  'Action',
  'Expected Result',
  'Priority',
  'Status',
  'Tester',
  'Test Date',
  'Device/Browser',
  'Notes',
  'Source File',
];

function row(id, section, scenario, step, role, action, expected, priority = 'Medium') {
  return [
    id,
    section,
    scenario,
    String(step),
    role,
    action,
    expected,
    priority,
    'Not Run',
    '',
    '',
    '',
    '',
    SOURCE,
  ];
}

const testCases = [
  row('TC-1.1-01', '1 Bootstrap & auth', '1.1 Cold start — no session', 1, 'Any', 'Open app at / with no active Supabase session', 'Staff Portal (UserLogin) dialog is open and required (cannot dismiss)', 'High'),
  row('TC-1.1-02', '1 Bootstrap & auth', '1.1 Cold start — no session', 2, 'Any', 'Observe background', 'Login blocks POS; products may still load in background after init'),
  row('TC-1.2-01', '1 Bootstrap & auth', '1.2 Login — staff user', 1, 'Staff', 'Enter valid staff email/password and submit', 'Login succeeds; welcome toast with staff name', 'High'),
  row('TC-1.2-02', '1 Bootstrap & auth', '1.2 Login — staff user', 2, 'Staff', 'After login', 'Login dialog closes; POS home visible', 'High'),
  row('TC-1.2-03', '1 Bootstrap & auth', '1.2 Login — staff user', 3, 'Staff', 'Check header', 'Title "Mini Step Pet Supplies", subtitle "Point of Sale"'),
  row('TC-1.2-04', '1 Bootstrap & auth', '1.2 Login — staff user', 4, 'Staff', 'Check admin controls', 'No "+ Add New Item" button', 'High'),
  row('TC-1.2-05', '1 Bootstrap & auth', '1.2 Login — staff user', 5, 'Staff', 'Check product grid', 'Products cannot be edited from grid (no edit affordance for staff)', 'High'),
  row('TC-1.3-01', '1 Bootstrap & auth', '1.3 Login — admin user', 1, 'Admin', 'Log out, log in as admin', 'Login dialog closes', 'High'),
  row('TC-1.3-02', '1 Bootstrap & auth', '1.3 Login — admin user', 2, 'Admin', 'Check product section', '"+ Add New Item" button visible', 'High'),
  row('TC-1.3-03', '1 Bootstrap & auth', '1.3 Login — admin user', 3, 'Admin', 'Check product grid', 'Edit product action available (admin only)', 'High'),
  row('TC-1.4-01', '1 Bootstrap & auth', '1.4 Existing session on reload', 1, 'Any', 'Log in, refresh browser', 'Login dialog not shown; user stays on POS', 'High'),
  row('TC-1.4-02', '1 Bootstrap & auth', '1.4 Existing session on reload', 2, 'Any', 'Verify role', 'userRole restored from profiles.role via Supabase'),
  row('TC-1.5-01', '1 Bootstrap & auth', '1.5 Auth state — sign out via Supabase', 1, 'Any', 'Log in, then sign out from another tab or session expiry', 'SIGNED_OUT handler runs: login opens, cashierId and userRole cleared', 'Medium'),
  row('TC-2.1-01', '2 Product loading', '2.1 Successful load', 1, 'Any', 'Log in and wait for products', 'Brief "Loading products..." then product grid', 'High'),
  row('TC-2.1-02', '2 Product loading', '2.1 Successful load', 2, 'Any', 'Verify data source', 'Products from fetchProducts() / Supabase view'),
  row('TC-2.2-01', '2 Product loading', '2.2 Load failure', 1, 'Any', 'Simulate failure (invalid Supabase URL or offline during first load)', 'Toast: "Failed to load products from database"', 'Medium'),
  row('TC-2.2-02', '2 Product loading', '2.2 Load failure', 2, 'Any', 'Check UI after failure', '"No products found" or empty grid after loading ends'),
  row('TC-2.3-01', '2 Product loading', '2.3 Reload after add/update', 1, 'Admin', 'Add item via Add Item modal and save', 'loadProducts() runs; new product appears in grid', 'High'),
  row('TC-2.3-02', '2 Product loading', '2.3 Reload after add/update', 2, 'Admin', 'Update item via Update Item modal', 'Grid reflects updated name/price/stock after close', 'High'),
  row('TC-3.1', '3 Category filtering', 'Category tab rules', '-', 'Any', 'Tab: all — product category: Any', 'All products shown (subject to search)'),
  row('TC-3.2', '3 Category filtering', 'Category tab rules', '-', 'Any', 'Tab: dog — product contains "dog" (e.g. Dog Food)', 'Product shown'),
  row('TC-3.3', '3 Category filtering', 'Category tab rules', '-', 'Any', 'Tab: dog — product: Cat Food only', 'Product hidden'),
  row('TC-3.4', '3 Category filtering', 'Category tab rules', '-', 'Any', 'Tab: cat — product contains "cat"', 'Product shown'),
  row('TC-3.5', '3 Category filtering', 'Category tab rules', '-', 'Any', 'Tab: meds — category exactly pharmacy', 'Product shown'),
  row('TC-3.6', '3 Category filtering', 'Category tab rules', '-', 'Any', 'Tab: meds — product: Dog Food', 'Product hidden'),
  row('TC-3.7-01', '3 Category filtering', 'Category tab UI', 1, 'Any', 'Select each tab in sequence', 'Grid updates without full page reload'),
  row('TC-3.7-02', '3 Category filtering', 'Category tab UI', 2, 'Any', 'Observe active tab', 'Highlighted state on CategoryTabBar'),
  row('TC-4.1', '4 Search', 'Product search', 1, 'Any', 'Type part of a product name', 'Only matching products shown'),
  row('TC-4.2', '4 Search', 'Product search', 2, 'Any', 'Type part of category', 'Matching products shown'),
  row('TC-4.3', '4 Search', 'Product search', 3, 'Any', 'Type product id', 'Matching product shown'),
  row('TC-4.4', '4 Search', 'Product search', 4, 'Any', 'Apply search with category tab selected', 'Both filters apply (AND)'),
  row('TC-4.5', '4 Search', 'Product search', 5, 'Any', 'Enter query with no matches', '"No products found"'),
  row('TC-4.6', '4 Search', 'Product search', 6, 'Any', 'Clear search', 'Previous category filter still applies'),
  row('TC-5.1-01', '5 Cart operations', '5.1 Add to cart', 1, 'Any', 'Tap a product in the grid', 'Success toast with product name; item in checkout panel', 'High'),
  row('TC-5.1-02', '5 Cart operations', '5.1 Add to cart', 2, 'Any', 'Tap same product again', 'Quantity increments; toast mentions new quantity'),
  row('TC-5.1-03', '5 Cart operations', '5.1 Add to cart', 3, 'Any', 'Check Pay button', 'Shows item count: Pay (N) · ₱X.XX when cart not empty', 'High'),
  row('TC-5.2-01', '5 Cart operations', '5.2 Update quantity', 1, 'Any', 'Increase quantity in cart', 'Subtotal and Pay button total update'),
  row('TC-5.2-02', '5 Cart operations', '5.2 Update quantity', 2, 'Any', 'Decrease quantity to minimum', 'Quantity does not go below 1'),
  row('TC-5.3-01', '5 Cart operations', '5.3 Remove from cart', 1, 'Any', 'Remove a line item', 'Item removed; info toast with product name'),
  row('TC-5.3-02', '5 Cart operations', '5.3 Remove from cart', 2, 'Any', 'Check total after remove', 'Checkout total recalculates'),
  row('TC-5.4-01', '5 Cart operations', '5.4 Cancel order', 1, 'Any', 'Add items, click Cancel Order', 'Cart empty'),
  row('TC-5.4-02', '5 Cart operations', '5.4 Cancel order', 2, 'Any', 'Check Pay button after cancel', 'Pay · ₱0.00 (no item count)'),
  row('TC-6.1-01', '6 Checkout flow', '6.1 Empty cart guard', 1, 'Any', 'With empty cart, click Pay', 'Toast: Cart is empty; checkout modal does not open', 'High'),
  row('TC-6.2-01', '6 Checkout flow', '6.2 Open checkout panel', 1, 'Any', 'Add at least one item, click Pay', 'PosCheckoutPanel shows in checkout column with cart line items', 'High'),
  row('TC-6.2-02', '6 Checkout flow', '6.2 Open checkout modal', 2, 'Any', 'Verify cashier', 'Modal receives cashierId from logged-in user'),
  row('TC-6.3-01', '6 Checkout flow', '6.3 Complete payment (integration)', 1, 'Any', 'Enter tendered amount ≥ total, confirm payment', 'Supabase: transactions, transaction_items, stock RPC succeed', 'High'),
  row('TC-6.3-02', '6 Checkout flow', '6.3 Complete payment (integration)', 2, 'Any', 'On success', 'completeCheckout: success toast, cart cleared, modal closes', 'High'),
  row('TC-6.3-03', '6 Checkout flow', '6.3 Complete payment (integration)', 3, 'Any', 'Check localStorage', 'New transaction appended to pet-pos-transactions when applicable'),
  row('TC-6.4-01', '6 Checkout flow', '6.4 Checkout failure', 1, 'Any', 'Force DB error (e.g. invalid cashier_id / no profile row)', 'Error shown in modal; cart not cleared until success path'),
  row('TC-6.5-01', '6 Checkout flow', '6.5 Subtotal display', 1, 'Any', 'Add items with known prices', 'Checkout Total = sum of price × quantity (no discount in UI total)', 'High'),
  row('TC-7.1', '7 Barcode scanner', 'Barcode scan', 1, 'Any', 'Click camera / scan button in header', 'BarcodeScanner opens'),
  row('TC-7.2', '7 Barcode scanner', 'Barcode scan', 2, 'Any', 'Scan or enter valid product barcode/ID', 'Product found via fetchProductById; added to cart; success toast', 'High'),
  row('TC-7.3', '7 Barcode scanner', 'Barcode scan', 3, 'Any', 'Scan unknown barcode', 'Toast: Product not found with SKU in description'),
  row('TC-7.4', '7 Barcode scanner', 'Barcode scan', 4, 'Any', 'Trigger network/API error', 'Toast: Error scanning product'),
  row('TC-7.5', '7 Barcode scanner', 'Barcode scan', 5, 'Any', 'Close scanner', 'Modal closes without adding item'),
  row('TC-8.1', '8 Logout', 'Logout flow', 1, 'Any', 'Add items to cart, click logout (user icon)', 'supabase.auth.signOut() called', 'High'),
  row('TC-8.2', '8 Logout', 'Logout flow', 2, 'Any', 'After logout', 'Cart cleared; toast Logged out successfully; login dialog opens', 'High'),
  row('TC-8.3', '8 Logout', 'Logout flow', 3, 'Any', 'Verify session state', 'cashierId and userRole cleared', 'High'),
  row('TC-9.1', '9 Navigation', 'Drawer and routes', 1, 'Any', 'Open menu (hamburger)', 'Drawer shows POS, Inventory, Sales Report Dashboard, User Management'),
  row('TC-9.2', '9 Navigation', 'Drawer and routes', 2, 'Any', 'Click Inventory Management', 'Navigate to /inventory; drawer section highlights inventory'),
  row('TC-9.3', '9 Navigation', 'Drawer and routes', 3, 'Any', 'Click Sales Report Dashboard', 'Navigate to /reports'),
  row('TC-9.4', '9 Navigation', 'Drawer and routes', 4, 'Any', 'Click User Management', 'Navigate to /users; placeholder text shown'),
  row('TC-9.5', '9 Navigation', 'Drawer and routes', 5, 'Any', 'Click Point of Sale', 'Navigate to /; POS layout restored'),
  row('TC-9.6', '9 Navigation', 'Drawer and routes', 6, 'Any', 'Click Close in drawer', 'Drawer closes'),
  row('TC-10.1-01', '10 Admin-only modals', '10.1 Add New Item', 1, 'Staff', 'Confirm as staff', 'No "+ Add New Item" — cannot open modal from App', 'High'),
  row('TC-10.1-02', '10 Admin-only modals', '10.1 Add New Item', 2, 'Admin', 'Click "+ Add New Item"', 'AddItemModal opens'),
  row('TC-10.1-03', '10 Admin-only modals', '10.1 Add New Item', 3, 'Admin', 'Save new product', 'Modal closes; loadProducts() refreshes grid'),
  row('TC-10.2-01', '10 Admin-only modals', '10.2 Update Item', 1, 'Admin', 'Trigger edit on a product', 'UpdateItemModal opens with productToEdit set'),
  row('TC-10.2-02', '10 Admin-only modals', '10.2 Update Item', 2, 'Admin', 'Save changes', 'loadProducts(); modal closes; productToEdit null'),
  row('TC-10.2-03', '10 Admin-only modals', '10.2 Update Item', 3, 'Admin', 'Cancel / close without save', 'Modal closes without required grid refresh'),
  row('TC-11.1', '11 localStorage', 'Transaction history', 1, 'Any', 'Complete a checkout (success path)', 'transactions state updated'),
  row('TC-11.2', '11 localStorage', 'Transaction history', 2, 'Any', 'Inspect localStorage pet-pos-transactions', 'JSON array with id, items, total, paymentMethod, timestamp'),
  row('TC-11.3', '11 localStorage', 'Transaction history', 3, 'Any', 'Reload app', 'Saved transactions restored; timestamp parsed as Date'),
  row('TC-11.4', '11 localStorage', 'Transaction history', 4, 'Any', 'Start with empty transactions', 'Key not written until transactions.length > 0'),
  row('TC-12.1', '12 Layout & responsive UI', 'Responsive layout', 1, 'Any', 'Mobile portrait', 'Hint: Rotate to landscape for products and checkout side by side'),
  row('TC-12.2', '12 Layout & responsive UI', 'Responsive layout', 2, 'Any', 'Large screen (lg+)', 'Two-column grid: products left, checkout right'),
  row('TC-12.3', '12 Layout & responsive UI', 'Responsive layout', 3, 'Any', 'Check safe areas', 'Header safe-area-inset-top; bottom safe-area-inset-bottom'),
  row('TC-12.4', '12 Layout & responsive UI', 'Responsive layout', 4, 'Any', 'Check touch targets', 'Header buttons min 44px (min-h-11 min-w-11)'),
  row('EC-1', '13 Error & edge cases', 'Edge cases', '-', 'Any', 'Login with wrong password', 'Error in Staff Portal; POS stays blocked', 'High'),
  row('EC-2', '13 Error & edge cases', 'Edge cases', '-', 'Any', 'Profile missing for auth user', 'Login may succeed with fallback name/role staff (UserLogin)', 'Medium'),
  row('EC-3', '13 Error & edge cases', 'Edge cases', '-', 'Any', 'Pay without cashierId', 'Checkout modal gets empty string; DB insert may fail — verify error handling', 'Medium'),
  row('EC-4', '13 Error & edge cases', 'Edge cases', '-', 'Any', 'Rapid double-tap Pay', 'No duplicate modals or duplicate local transactions without completing payment'),
  row('EC-5', '13 Error & edge cases', 'Edge cases', '-', 'Any', 'Navigate away with items in cart', 'Cart retained in memory when returning to / unless logout'),
];

const summaryChecklist = [
  ['#', 'Area', 'Pass', 'Fail', 'Notes', 'Tester', 'Test Date'],
  [1, 'Bootstrap & auth', '', '', '', '', ''],
  [2, 'Product loading', '', '', '', '', ''],
  [3, 'Category filters', '', '', '', '', ''],
  [4, 'Search', '', '', '', '', ''],
  [5, 'Cart', '', '', '', '', ''],
  [6, 'Checkout', '', '', '', '', ''],
  [7, 'Barcode scan', '', '', '', '', ''],
  [8, 'Logout', '', '', '', '', ''],
  [9, 'Navigation', '', '', '', '', ''],
  [10, 'Admin modals', '', '', '', '', ''],
  [11, 'localStorage', '', '', '', '', ''],
  [12, 'Layout', '', '', '', '', ''],
  [13, 'Edge cases', '', '', '', '', ''],
];

const testData = [
  ['Type', 'Item', 'Example Value', 'Notes'],
  ['Prerequisite', 'Application running', 'npm run dev', ''],
  ['Prerequisite', 'Environment variables', 'VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY in .env.local', ''],
  ['Prerequisite', 'Product catalog', 'products_with_categories populated in Supabase', ''],
  ['Prerequisite', 'localStorage (optional)', 'Clear pet-pos-transactions before persistence tests', ''],
  ['Account', 'Admin user', 'admin@yourstore.test', 'profiles.role = admin'],
  ['Account', 'Staff user', 'staff@yourstore.test', 'profiles.role = staff'],
  ['Product', 'Dog category test', 'Name contains Dog, e.g. Dog Food', 'For TC-3.2'],
  ['Product', 'Pharmacy test', 'category = pharmacy', 'For TC-3.5'],
  ['Search', 'Search term', 'Partial product name or SKU', ''],
  ['Barcode', 'Valid barcode', 'Existing products.barcode or id', ''],
  ['Barcode', 'Invalid barcode', '9999999999999', ''],
  ['Cart', 'Price calculation', 'e.g. ₱100 × 2 = ₱200.00 subtotal', ''],
];

const readme = [
  ['App.tsx Test Plan — Excel Export'],
  [''],
  ['Source document', 'APP_TEST_PLAN.md'],
  ['Generated by', 'scripts/generate-app-test-plan-xlsx.mjs'],
  ['Regenerate', 'npm run test-plan:xlsx'],
  [''],
  ['Status values', 'Not Run | Pass | Fail | Blocked'],
];

const sheets = [
  { name: 'Test Cases', rows: [TEST_CASE_HEADERS, ...testCases] },
  { name: 'Summary Checklist', rows: summaryChecklist },
  { name: 'Test Data', rows: testData },
  { name: 'Readme', rows: readme },
];

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colName(n) {
  let s = '';
  let x = n;
  while (x >= 0) {
    s = String.fromCharCode((x % 26) + 65) + s;
    x = Math.floor(x / 26) - 1;
  }
  return s;
}

function buildSheetXml(rows) {
  const rowXml = rows
    .map((cells, r) => {
      const cellXml = cells
        .map((val, c) => {
          const ref = `${colName(c)}${r + 1}`;
          const text = escapeXml(val ?? '');
          return `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
        })
        .join('');
      return `<row r="${r + 1}">${cellXml}</row>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
}

function crc32(buf) {
  let c = ~0;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })());
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ ~0) >>> 0;
}

function zipStore(files) {
  const local = [];
  const central = [];
  let offset = 0;

  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const comp = deflateRawSync(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0, 8);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(0, 12);
    ch.writeUInt16LE(0, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(comp.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt16LE(0, 30);
    ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34);
    ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE(0, 38);
    ch.writeUInt32LE(offset, 42);

    local.push(lh, nameBuf, comp);
    central.push(ch, nameBuf);
    offset += lh.length + nameBuf.length + comp.length;
  }

  const centralSize = central.reduce((s, b) => s + b.length, 0);
  const centralStart = offset;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(centralStart, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...local, ...central, eocd]);
}

const sheetEntries = sheets.map((s, i) => ({
  path: `xl/worksheets/sheet${i + 1}.xml`,
  name: s.name,
  xml: buildSheetXml(s.rows),
}));

const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
${sheetEntries.map((s, i) => `    <sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('\n')}
  </sheets>
</workbook>`;

const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheetEntries.map((s, i) => `  <Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('\n')}
</Relationships>`;

const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${sheetEntries.map((_, i) => `  <Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
</Types>`;

const zipFiles = [
  { name: '[Content_Types].xml', data: Buffer.from(contentTypes, 'utf8') },
  { name: '_rels/.rels', data: Buffer.from(rootRels, 'utf8') },
  { name: 'xl/workbook.xml', data: Buffer.from(workbookXml, 'utf8') },
  { name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(workbookRels, 'utf8') },
  ...sheetEntries.map((s, i) => ({
    name: `xl/worksheets/sheet${i + 1}.xml`,
    data: Buffer.from(s.xml, 'utf8'),
  })),
];

writeFileSync(outPath, zipStore(zipFiles));
console.log(`Wrote ${outPath} (${testCases.length} test rows, ${sheets.length} sheets)`);
