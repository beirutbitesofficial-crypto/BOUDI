const express=require('express');const {db}=require('../db/database');const {managerOnly}=require('../middleware/auth');const router=express.Router();router.use(managerOnly);
const level=()=>Number(db.prepare("SELECT value FROM settings WHERE key='low_stock_alert'").get()?.value)||5;
router.get('/',(_req,res)=>{const products=db.prepare(`SELECT p.*,c.name category_name FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.active=1 ORDER BY p.stock`).all();
  const tracked=products.filter(p=>p.track_stock);res.json({products,inventory_value:tracked.reduce((s,p)=>s+p.stock*p.purchase_price,0),retail_value:tracked.reduce((s,p)=>s+p.stock*p.selling_price,0),low_stock_level:level()});});
router.get('/alerts',(_req,res)=>res.json({low:db.prepare('SELECT * FROM products WHERE active=1 AND track_stock=1 AND stock>0 AND stock<=? ORDER BY stock').all(level()),out:db.prepare('SELECT * FROM products WHERE active=1 AND track_stock=1 AND stock<=0').all()}));
router.get('/history/:productId',(req,res)=>res.json(db.prepare('SELECT * FROM stock_history WHERE product_id=? ORDER BY id DESC LIMIT 500').all(req.params.productId)));
router.get('/history',(_req,res)=>res.json(db.prepare(`SELECT h.*,p.name product_name FROM stock_history h JOIN products p ON p.id=h.product_id ORDER BY h.id DESC LIMIT 500`).all()));
module.exports=router;
