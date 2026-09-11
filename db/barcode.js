function normalizeBarcode(value) {
  return String(value || '').trim().replace(/\s+/g, '');
}

function ensureBarcodeSchema(db) {
  const columns = db.prepare('PRAGMA table_info(products)').all();
  if (!columns.some(column => column.name === 'barcode')) {
    db.exec('ALTER TABLE products ADD COLUMN barcode TEXT');
  }
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique
    ON products(barcode)
    WHERE barcode IS NOT NULL AND TRIM(barcode) <> ''`);
}

module.exports = { normalizeBarcode, ensureBarcodeSchema };
