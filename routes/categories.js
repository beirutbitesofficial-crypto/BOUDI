const express = require('express');
const { db } = require('../db/database');
const { allowRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', allowRoles(['cashier', 'management']), (req, res) => {
  const kind = req.query.kind;
  let rows;
  if (kind) {
    rows = db.prepare('SELECT * FROM categories WHERE kind = ? ORDER BY name').all(kind);
  } else {
    rows = db.prepare('SELECT * FROM categories ORDER BY name').all();
  }
  res.json(rows);
});

router.post('/', allowRoles(['management']), (req, res) => {
  const { name, name_ar, kind } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const info = db.prepare('INSERT INTO categories (name, name_ar, kind) VALUES (?,?,?)')
    .run(name.trim(), name_ar || null, kind === 'gaming' ? 'gaming' : 'product');
  res.json({ id: info.lastInsertRowid });
});

router.put('/:id', allowRoles(['management']), (req, res) => {
  const { name, name_ar, kind } = req.body;
  db.prepare('UPDATE categories SET name=?, name_ar=?, kind=? WHERE id=?')
    .run(name, name_ar || null, kind === 'gaming' ? 'gaming' : 'product', req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', allowRoles(['management']), (req, res) => {
  db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
