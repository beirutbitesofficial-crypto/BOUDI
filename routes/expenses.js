const express = require('express');
const { db } = require('../db/database');
const { allowRoles } = require('../middleware/auth');

const router = express.Router();
router.use(allowRoles(['management']));

router.get('/', (req, res) => {
  const { from, to } = req.query;
  let sql = 'SELECT * FROM expenses';
  const params = [];
  if (from && to) { sql += ' WHERE expense_date BETWEEN ? AND ?'; params.push(from, to); }
  sql += ' ORDER BY expense_date DESC, id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.post('/', (req, res) => {
  const b = req.body;
  const info = db.prepare(`INSERT INTO expenses (category, description, amount, expense_date)
    VALUES (?,?,?,?)`).run(
    b.category || 'other', b.description || null, Number(b.amount) || 0,
    b.expense_date || new Date().toISOString().slice(0, 10)
  );
  res.json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const b = req.body;
  db.prepare('UPDATE expenses SET category=?, description=?, amount=?, expense_date=? WHERE id=?')
    .run(b.category || 'other', b.description || null, Number(b.amount) || 0, b.expense_date, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
