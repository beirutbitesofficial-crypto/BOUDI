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
  const cleanName = String(name || '').trim();
  const cleanKind = kind === 'gaming' ? 'gaming' : 'product';
  if (!cleanName) return res.status(400).json({ error: 'Name required' });
  const duplicate = db.prepare('SELECT id FROM categories WHERE LOWER(TRIM(name)) = LOWER(?) AND kind = ?').get(cleanName, cleanKind);
  if (duplicate) return res.status(409).json({ error: 'A category with this name already exists' });
  const info = db.prepare('INSERT INTO categories (name, name_ar, kind) VALUES (?,?,?)')
    .run(cleanName, String(name_ar || '').trim() || null, cleanKind);
  res.json({ id: info.lastInsertRowid, name: cleanName, name_ar: String(name_ar || '').trim() || null, kind: cleanKind });
});

router.put('/:id', allowRoles(['management']), (req, res) => {
  const { name, name_ar, kind } = req.body;
  const cleanName = String(name || '').trim();
  const cleanKind = kind === 'gaming' ? 'gaming' : 'product';
  if (!cleanName) return res.status(400).json({ error: 'Name required' });
  const existing = db.prepare('SELECT id FROM categories WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Category not found' });
  const duplicate = db.prepare('SELECT id FROM categories WHERE LOWER(TRIM(name)) = LOWER(?) AND kind = ? AND id <> ?').get(cleanName, cleanKind, req.params.id);
  if (duplicate) return res.status(409).json({ error: 'A category with this name already exists' });
  db.prepare('UPDATE categories SET name=?, name_ar=?, kind=? WHERE id=?')
    .run(cleanName, String(name_ar || '').trim() || null, cleanKind, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', allowRoles(['management']), (req, res) => {
  db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
