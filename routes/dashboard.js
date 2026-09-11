const express = require('express');
const { db } = require('../db/database');
const { allowRoles } = require('../middleware/auth');

const router = express.Router();
router.use(allowRoles(['cashier', 'management']));

// SQLite datetime('now') is UTC. We compare using local day boundaries derived on the server.
function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
}

router.get('/', (req, res) => {
  // Use local date string comparison on created_at (stored as UTC 'YYYY-MM-DD HH:MM:SS')
  // We rely on localtime modifier for accurate "today".
  const today = db.prepare(`
    SELECT
      COALESCE(SUM(total),0) AS sales,
      COALESCE(SUM(profit),0) AS profit,
      COALESCE(SUM(product_total),0) AS product_revenue,
      COALESCE(SUM(gaming_total),0) AS gaming_revenue,
      COALESCE(SUM(games_count),0) AS games_sold,
      COUNT(*) AS invoices,
      COUNT(DISTINCT customer_name) AS customers
    FROM invoices
    WHERE date(created_at, 'localtime') = date('now','localtime')
  `).get();

  const debts = db.prepare("SELECT COALESCE(SUM(amount - paid_amount),0) v FROM debtors WHERE status != 'paid'").get().v;

  if (req.session.role === 'cashier') {
    return res.json({
      cashier_limited: true,
      sales: today.sales
    });
  }

  const lowLevelRow = db.prepare("SELECT value FROM settings WHERE key='low_stock_alert'").get();
  const lowLevel = lowLevelRow ? Number(lowLevelRow.value) : 5;
  const lowStock = db.prepare(`SELECT id,name,stock,min_stock FROM products
    WHERE active=1 AND track_stock=1 AND stock <= ? ORDER BY stock ASC LIMIT 20`).all(lowLevel);

  const bestSelling = db.prepare(`
    SELECT ii.name, ii.type, SUM(ii.quantity) AS qty, SUM(ii.line_total) AS revenue
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    GROUP BY ii.name, ii.type
    ORDER BY qty DESC LIMIT 8
  `).all();

  const recent = db.prepare(`SELECT id, invoice_no, customer_name, total, payment_status, created_at, gaming_total, product_total
    FROM invoices ORDER BY id DESC LIMIT 10`).all();

  // 7-day sales trend
  const trend = db.prepare(`
    SELECT date(created_at,'localtime') AS day,
      COALESCE(SUM(total),0) AS sales,
      COALESCE(SUM(profit),0) AS profit
    FROM invoices
    WHERE date(created_at,'localtime') >= date('now','localtime','-6 days')
    GROUP BY day ORDER BY day
  `).all();

  res.json({
    sales: today.sales,
    profit: today.profit,
    product_revenue: today.product_revenue,
    gaming_revenue: today.gaming_revenue,
    games_sold: today.games_sold,
    customers: today.customers,
    invoices: today.invoices,
    outstanding_debts: debts,
    low_stock: lowStock,
    best_selling: bestSelling,
    recent,
    trend
  });
});

module.exports = router;
