const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const DB_PATH = path.join(DATA_DIR, 'boudicafe.db');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const SUPPLIER_UPLOAD_DIR = path.join(DATA_DIR, 'supplier-invoices');
for (const dir of [DATA_DIR, UPLOAD_DIR, SUPPLIER_UPLOAD_DIR]) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

function hasColumn(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
}

function addColumn(table, definition) {
  const column = definition.trim().split(/\s+/)[0];
  if (!hasColumn(table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
}

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_ar TEXT,
      kind TEXT NOT NULL DEFAULT 'product',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_ar TEXT,
      category_id INTEGER,
      type TEXT NOT NULL DEFAULT 'product',
      purchase_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      stock REAL NOT NULL DEFAULT 0,
      min_stock REAL NOT NULL DEFAULT 0,
      track_stock INTEGER NOT NULL DEFAULT 1,
      image TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      customer_name TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      cost_total REAL NOT NULL DEFAULT 0,
      profit REAL NOT NULL DEFAULT 0,
      product_total REAL NOT NULL DEFAULT 0,
      gaming_total REAL NOT NULL DEFAULT 0,
      games_count REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'paid',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      product_id INTEGER,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'product',
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      purchase_price REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS debtors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      customer_id INTEGER,
      customer_name TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'unpaid',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS debtor_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      debtor_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(debtor_id) REFERENCES debtors(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL DEFAULT 'other', description TEXT,
      amount REAL NOT NULL DEFAULT 0,
      expense_date TEXT NOT NULL DEFAULT (date('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opened_by INTEGER, opened_by_name TEXT,
      opening_cash REAL NOT NULL DEFAULT 0, closing_cash REAL,
      expected_cash REAL, cash_difference REAL,
      paid_sales_total REAL NOT NULL DEFAULT 0,
      unpaid_sales_total REAL NOT NULL DEFAULT 0,
      expenses_total REAL NOT NULL DEFAULT 0,
      notes TEXT, status TEXT NOT NULL DEFAULT 'open',
      opened_at TEXT NOT NULL DEFAULT (datetime('now')), closed_at TEXT,
      FOREIGN KEY(opened_by) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS open_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL, discount REAL NOT NULL DEFAULT 0,
      notes TEXT, created_by INTEGER, created_by_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS open_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      open_order_id INTEGER NOT NULL, product_id INTEGER,
      name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'product',
      quantity REAL NOT NULL DEFAULT 1, unit_price REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(open_order_id) REFERENCES open_orders(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS gaming_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL DEFAULT 'open',
      players_count INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS gaming_session_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      invoice_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'paid',
      price REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(session_id) REFERENCES gaming_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS stock_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL, change REAL NOT NULL,
      reason TEXT NOT NULL, balance REAL NOT NULL, ref TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS supplier_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      internal_ref TEXT UNIQUE,
      supplier_name TEXT NOT NULL,
      supplier_invoice_no TEXT NOT NULL,
      invoice_date TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      attachment_path TEXT,
      attachment_name TEXT,
      created_by INTEGER,
      created_by_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(supplier_name, supplier_invoice_no)
    );
    CREATE TABLE IF NOT EXISTS supplier_invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_invoice_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_cost REAL NOT NULL,
      line_total REAL NOT NULL,
      FOREIGN KEY(supplier_invoice_id) REFERENCES supplier_invoices(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE RESTRICT
    );
    CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);
    CREATE INDEX IF NOT EXISTS idx_stock_product ON stock_history(product_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_lookup ON supplier_invoices(supplier_name, supplier_invoice_no);
  `);

  addColumn('open_orders', "gaming_players REAL NOT NULL DEFAULT 0");
  addColumn('open_orders', "order_type TEXT NOT NULL DEFAULT 'product'");
  addColumn('supplier_invoices', 'internal_ref TEXT');
  addColumn('debtors', 'phone TEXT');
  migrate();
  seedIdentity();
}

function migrate() {
  const run = db.transaction(() => {
    db.prepare("UPDATE users SET role='manager' WHERE role='management'").run();
    const missing = db.prepare("SELECT id FROM supplier_invoices WHERE internal_ref IS NULL OR TRIM(internal_ref)='' ORDER BY id").all();
    const update = db.prepare('UPDATE supplier_invoices SET internal_ref=? WHERE id=?');
    for (const row of missing) update.run(`SUP-${String(row.id).padStart(5, '0')}`, row.id);
    db.prepare(`INSERT OR IGNORE INTO schema_migrations(version,name) VALUES(1,'boudi-cafe-safe-schema')`).run();
  });
  run();
}

function seedIdentity() {
  if (!db.prepare('SELECT 1 FROM users LIMIT 1').get()) {
    db.prepare('INSERT INTO users(username,password_hash,role) VALUES(?,?,?)')
      .run('admin', bcrypt.hashSync('admin123', 10), 'admin');
  }
  const defaults = {
    cafe_name: 'BOUDI CAFE', currency: 'LBP', usd_exchange_rate: '89500', default_game_price: '100000',
    gaming_players_per_session: '10', low_stock_alert: '5', language: 'en',
    dark_mode: '1', session_timeout_min: '30'
  };
  const stmt = db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)');
  for (const [key, value] of Object.entries(defaults)) stmt.run(key, value);
}

function backupDatabase(targetPath) {
  db.pragma('wal_checkpoint(FULL)');
  fs.copyFileSync(DB_PATH, targetPath);
}

module.exports = { db, init, DB_PATH, DATA_DIR, UPLOAD_DIR, SUPPLIER_UPLOAD_DIR, backupDatabase };
