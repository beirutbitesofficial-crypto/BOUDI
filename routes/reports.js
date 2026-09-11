const express = require('express');
const { db } = require('../db/database');
const { allowRoles } = require('../middleware/auth');

const router = express.Router();
router.use(allowRoles(['management']));

/**
 * period = 'daily' | 'monthly' | 'yearly' | 'custom'
 * date = reference date (YYYY-MM-DD) for daily
 * month = YYYY-MM for monthly ; year = YYYY for yearly
 * from/to for custom
 */
function resolveRange(q) {
  const period = q.period || 'daily';
  if (period === 'daily') {
    const d = q.date || new Date().toISOString().slice(0, 10);
    return { from: d, to: d, label: d };
  }
  if (period === 'monthly') {
    const m = q.month || new Date().toISOString().slice(0, 7);
    return { from: `${m}-01`, to: `${m}-31`, label: m };
  }
  if (period === 'yearly') {
    const y = q.year || String(new Date().getFullYear());
    return { from: `${y}-01-01`, to: `${y}-12-31`, label: y };
  }
  return { from: q.from, to: q.to, label: `${q.from} → ${q.to}` };
}

router.get('/', (req, res) => {
  const { from, to, label } = resolveRange(req.query);

  const sales = db.prepare(`
    SELECT
      COALESCE(SUM(total),0) AS total_sales,
      COALESCE(SUM(profit),0) AS gross_profit,
      COALESCE(SUM(product_total),0) AS product_sales,
      COALESCE(SUM(gaming_total),0) AS gaming_sales,
      COALESCE(SUM(games_count),0) AS games_sold,
      COALESCE(SUM(cost_total),0) AS cost_total,
      COUNT(*) AS invoice_count
    FROM invoices
    WHERE date(created_at,'localtime') BETWEEN ? AND ?
  `).get(from, to);

  const expensesTotal = db.prepare(`SELECT COALESCE(SUM(amount),0) v FROM expenses
    WHERE expense_date BETWEEN ? AND ?`).get(from, to).v;

  const expensesByCat = db.prepare(`SELECT category, SUM(amount) amount FROM expenses
    WHERE expense_date BETWEEN ? AND ? GROUP BY category ORDER BY amount DESC`).all(from, to);

  const outstanding = db.prepare("SELECT COALESCE(SUM(amount - paid_amount),0) v FROM debtors WHERE status != 'paid'").get().v;

  const unpaidInRange = db.prepare(`SELECT COALESCE(SUM(total),0) v FROM invoices
    WHERE payment_status='unpaid' AND date(created_at,'localtime') BETWEEN ? AND ?`).get(from, to).v;

  const bestSelling = db.prepare(`
    SELECT ii.name, ii.type, SUM(ii.quantity) AS qty, SUM(ii.line_total) AS revenue
    FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
    WHERE date(i.created_at,'localtime') BETWEEN ? AND ?
    GROUP BY ii.name, ii.type ORDER BY qty DESC LIMIT 15
  `).all(from, to);

  const invoices = db.prepare(`SELECT id, invoice_no, customer_name, total, product_total, gaming_total,
    payment_status, created_at FROM invoices
    WHERE date(created_at,'localtime') BETWEEN ? AND ? ORDER BY id DESC`).all(from, to);

  const netProfit = sales.gross_profit - expensesTotal;

  res.json({
    label, from, to,
    total_sales: sales.total_sales,
    gross_profit: sales.gross_profit,
    net_profit: netProfit,
    product_sales: sales.product_sales,
    gaming_sales: sales.gaming_sales,
    games_sold: sales.games_sold,
    cost_total: sales.cost_total,
    invoice_count: sales.invoice_count,
    expenses_total: expensesTotal,
    expenses_by_category: expensesByCat,
    outstanding_debts: outstanding,
    unpaid_in_range: unpaidInRange,
    best_selling: bestSelling,
    invoices
  });
});

module.exports = router;
