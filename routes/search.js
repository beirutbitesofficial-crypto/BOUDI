const express = require('express');
const { db } = require('../db/database');
const { allowRoles } = require('../middleware/auth');

const router = express.Router();
router.use(allowRoles(['management']));

router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ invoices: [], products: [], debtors: [], customers: [] });
  const like = `%${q}%`;

  const invoices = db.prepare(`SELECT id, invoice_no, customer_name, total, payment_status, created_at
    FROM invoices WHERE invoice_no LIKE ? OR customer_name LIKE ? ORDER BY id DESC LIMIT 30`).all(like, like);

  const products = db.prepare(`SELECT id, name, name_ar, type, selling_price, stock
    FROM products WHERE active=1 AND (name LIKE ? OR name_ar LIKE ?) ORDER BY name LIMIT 30`).all(like, like);

  const debtors = db.prepare(`SELECT id, customer_name, amount, paid_amount, status, created_at
    FROM debtors WHERE customer_name LIKE ? ORDER BY id DESC LIMIT 30`).all(like);

  const customers = db.prepare(`SELECT id, name, phone FROM customers WHERE name LIKE ? OR phone LIKE ? LIMIT 30`).all(like, like);

  res.json({ invoices, products, debtors, customers });
});

module.exports = router;
