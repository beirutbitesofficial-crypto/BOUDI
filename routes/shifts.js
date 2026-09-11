const express = require('express');
const { db } = require('../db/database');
const { allowRoles } = require('../middleware/auth');

const router = express.Router();
router.use(allowRoles(['cashier', 'management']));

function getOpenShift() {
  return db.prepare("SELECT * FROM shifts WHERE status = 'open' ORDER BY id DESC LIMIT 1").get();
}

function totalsSince(openedAt) {
  const paidSales = db.prepare(`
    SELECT COALESCE(SUM(total),0) v FROM invoices
    WHERE payment_status = 'paid' AND created_at >= ?
  `).get(openedAt).v;
  const unpaidSales = db.prepare(`
    SELECT COALESCE(SUM(total),0) v FROM invoices
    WHERE payment_status != 'paid' AND created_at >= ?
  `).get(openedAt).v;
  const expenses = db.prepare(`
    SELECT COALESCE(SUM(amount),0) v FROM expenses
    WHERE created_at >= ?
  `).get(openedAt).v;
  return { paidSales, unpaidSales, expenses };
}

router.get('/current', (req, res) => {
  const shift = getOpenShift();
  if (!shift) return res.json({ shift: null });
  const totals = totalsSince(shift.opened_at);
  res.json({
    shift,
    totals,
    expected_cash: shift.opening_cash + totals.paidSales - totals.expenses
  });
});

router.get('/history', (req, res) => {
  const rows = db.prepare('SELECT * FROM shifts ORDER BY id DESC LIMIT 100').all();
  res.json(rows);
});

router.post('/open', (req, res) => {
  if (getOpenShift()) return res.status(400).json({ error: 'There is already an open shift' });
  const openingCash = Number(req.body.opening_cash) || 0;
  const info = db.prepare(`
    INSERT INTO shifts (opened_by, opened_by_name, opening_cash, notes)
    VALUES (?,?,?,?)
  `).run(req.session.userId || null, req.session.username || null, openingCash, req.body.notes || null);
  res.json({ id: info.lastInsertRowid });
});

router.post('/close', (req, res) => {
  const shift = getOpenShift();
  if (!shift) return res.status(400).json({ error: 'No open shift' });
  const totals = totalsSince(shift.opened_at);
  const closingCash = Number(req.body.closing_cash) || 0;
  const expectedCash = shift.opening_cash + totals.paidSales - totals.expenses;
  const difference = closingCash - expectedCash;
  db.prepare(`
    UPDATE shifts
    SET closing_cash = ?, expected_cash = ?, cash_difference = ?,
        paid_sales_total = ?, unpaid_sales_total = ?, expenses_total = ?,
        notes = COALESCE(?, notes), status = 'closed', closed_at = datetime('now')
    WHERE id = ?
  `).run(
    closingCash, expectedCash, difference,
    totals.paidSales, totals.unpaidSales, totals.expenses,
    req.body.notes || null, shift.id
  );
  res.json({ ok: true, expected_cash: expectedCash, cash_difference: difference });
});

module.exports = router;
