const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { db, UPLOAD_DIR } = require('../db/database');
const { normalizeBarcode, ensureBarcodeSchema } = require('../db/barcode');
const { posUsers, managerOnly, sanitizeCosts } = require('../middleware/auth');

ensureBarcodeSchema(db);

const router = express.Router();
const allowedMime = new Set(['image/png', 'image/jpeg', 'image/webp']);
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, `product-${Date.now()}-${Math.round(Math.random()*1e8)}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, allowedMime.has(file.mimetype))
});

function number(value, label, { min = 0 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min) throw new Error(`Invalid ${label}`);
  return n;
}

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function barcodeOrNull(value) {
  const barcode = normalizeBarcode(value);
  return barcode || null;
}

function barcodeConflict(barcode, excludeId = null) {
  if (!barcode) return null;
  if (excludeId === null) return db.prepare('SELECT id,name FROM products WHERE barcode=? AND active=1').get(barcode);
  return db.prepare('SELECT id,name FROM products WHERE barcode=? AND id<>? AND active=1').get(barcode, excludeId);
}

router.get('/', posUsers, (req, res) => {
  const params = [];
  let where = 'WHERE p.active=1';
  if (req.query.type) { where += ' AND p.type=?'; params.push(req.query.type === 'gaming' ? 'gaming' : 'product'); }
  const rows = db.prepare(`SELECT p.*, c.name category_name, c.name_ar category_name_ar
    FROM products p LEFT JOIN categories c ON c.id=p.category_id ${where} ORDER BY p.name`).all(...params);
  res.json(sanitizeCosts(rows, req.session.role));
});

router.get('/barcode/:barcode', posUsers, (req, res) => {
  const barcode = normalizeBarcode(req.params.barcode);
  if (!barcode) return res.status(400).json({ error: 'Barcode required' });
  const row = db.prepare('SELECT * FROM products WHERE barcode=? AND active=1').get(barcode);
  if (!row) return res.status(404).json({ error: 'Product not found' });
  res.json(sanitizeCosts(row, req.session.role));
});

router.get('/:id', posUsers, (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(sanitizeCosts(row, req.session.role));
});

router.post('/upload', posUsers, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'PNG, JPG, JPEG or WebP image required' });
  res.json({ path: `/uploads/${req.file.filename}?v=${Date.now()}` });
});

router.post('/', posUsers, (req, res) => {
  try {
    const b = req.body, name = String(b.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Product name required' });
    const duplicate = db.prepare(`SELECT id FROM products WHERE active=1 AND LOWER(TRIM(name))=?`).get(normalizeName(name));
    if (duplicate) return res.status(409).json({ error: 'A product with this name already exists', id: duplicate.id });
    const barcode = barcodeOrNull(b.barcode);
    const conflict = barcodeConflict(barcode);
    if (conflict) return res.status(409).json({ error: `Barcode already belongs to ${conflict.name}`, id: conflict.id });
    const type = b.type === 'gaming' ? 'gaming' : 'product';
    const track = type === 'gaming' ? 0 : (b.track_stock === false || Number(b.track_stock) === 0 ? 0 : 1);
    const stock = number(b.stock || 0, 'stock');
    const purchasePrice=req.session.role==='cashier'?0:number(b.purchase_price || 0, 'purchase price');
    const info = db.prepare(`INSERT INTO products
      (name,name_ar,category_id,type,barcode,purchase_price,selling_price,stock,min_stock,track_stock,image,active)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(name, b.name_ar || null, b.category_id || null, type, barcode,
      purchasePrice, number(b.selling_price || 0, 'selling price'),
      stock, number(b.min_stock || 0, 'minimum stock'), track, b.image || null, b.active === false ? 0 : 1);
    if (track && stock) db.prepare(`INSERT INTO stock_history(product_id,change,reason,balance,ref)
      VALUES(?,?,?,?,?)`).run(info.lastInsertRowid, stock, 'restock', stock, 'initial');
    res.json({ id: info.lastInsertRowid, barcode });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', managerOnly, (req, res) => {
  try {
    const old = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
    if (!old) return res.status(404).json({ error: 'Not found' });
    const b=req.body, name=String(b.name || '').trim();
    if (!name) throw new Error('Product name required');
    const type=b.type==='gaming'?'gaming':'product';
    const track=type==='gaming'?0:(b.track_stock===false||Number(b.track_stock)===0?0:1);
    const stock=b.stock===undefined?old.stock:number(b.stock,'stock');
    const image=b.image===undefined?old.image:b.image;
    const barcode=b.barcode===undefined?barcodeOrNull(old.barcode):barcodeOrNull(b.barcode);
    const conflict=barcodeConflict(barcode,old.id);
    if(conflict) return res.status(409).json({error:`Barcode already belongs to ${conflict.name}`,id:conflict.id});
    db.prepare(`UPDATE products SET name=?,name_ar=?,category_id=?,type=?,barcode=?,purchase_price=?,selling_price=?,
      stock=?,min_stock=?,track_stock=?,image=?,active=? WHERE id=?`).run(name,b.name_ar||null,b.category_id||null,type,barcode,
      number(b.purchase_price||0,'purchase price'),number(b.selling_price||0,'selling price'),stock,
      number(b.min_stock||0,'minimum stock'),track,image,b.active===false?0:1,old.id);
    if (track && stock!==old.stock) db.prepare(`INSERT INTO stock_history(product_id,change,reason,balance,ref)
      VALUES(?,?,?,?,?)`).run(old.id,stock-old.stock,'manual_adjustment',stock,'product edit');
    // Keep previous image files for backups and other records that may reference them.
    res.json({ ok:true, barcode, image: image ? `${image.split('?')[0]}?v=${Date.now()}` : null });
  } catch(e) { res.status(400).json({ error:e.message }); }
});

router.post('/:id/restock', managerOnly, (req,res) => {
  try {
    const qty=number(req.body.quantity,'quantity',{min:Number.EPSILON});
    const p=db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
    if(!p) return res.status(404).json({error:'Not found'});
    if(!p.track_stock) return res.status(400).json({error:'Stock tracking is disabled'});
    const balance=Number(p.stock)+qty;
    const tx=db.transaction(()=>{
      db.prepare('UPDATE products SET stock=? WHERE id=?').run(balance,p.id);
      db.prepare(`INSERT INTO stock_history(product_id,change,reason,balance,ref) VALUES(?,?,?,?,?)`)
        .run(p.id,qty,'restock',balance,req.body.notes||'restock');
    }); tx(); res.json({ok:true,stock:balance});
  } catch(e){res.status(400).json({error:e.message});}
});

router.delete('/:id', managerOnly, (req,res)=>{
  db.prepare('UPDATE products SET active=0 WHERE id=?').run(req.params.id);
  res.json({ok:true});
});

module.exports=router;
module.exports.normalizeName=normalizeName;
