const express=require('express');
const path=require('path');
const fs=require('fs');
const multer=require('multer');
const XLSX=require('xlsx');
const pdfParse=require('pdf-parse');
const {db,SUPPLIER_UPLOAD_DIR}=require('../db/database');
const {managerOnly}=require('../middleware/auth');

const router=express.Router();
router.use(managerOnly);
const allowed=new Set(['application/pdf','image/png','image/jpeg','image/webp','text/csv',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
const upload=multer({
  storage:multer.diskStorage({destination:(_r,_f,cb)=>cb(null,SUPPLIER_UPLOAD_DIR),
    filename:(_r,f,cb)=>cb(null,`supplier-${Date.now()}-${Math.round(Math.random()*1e8)}${path.extname(f.originalname).toLowerCase()}`)}),
  limits:{fileSize:20*1024*1024}, fileFilter:(_r,f,cb)=>cb(null,allowed.has(f.mimetype))
});

const normalize=v=>String(v||'').trim().replace(/\s+/g,' ').toLowerCase();
const field=(row,names)=>{const entries=Object.entries(row);for(const name of names){const hit=entries.find(([k])=>normalize(k)===name);if(hit)return hit[1];}return '';};
function mapRows(rows){
  const products=db.prepare('SELECT id,name FROM products WHERE active=1').all();
  const byName=new Map(products.map(p=>[normalize(p.name),p]));
  return rows.filter(r=>Object.values(r).some(v=>String(v).trim())).map(r=>{
    const name=String(field(r,['product','product name','name','item'])||'').trim();
    const product=byName.get(normalize(name));
    return {source:r,product_name:name,product_id:product?.id||null,quantity:Number(field(r,['quantity','qty','units']))||0,
      unit_cost:Number(field(r,['unit cost','cost','purchase price','price']))||0};
  });
}
async function parseFile(file){
  const ext=path.extname(file.originalname).toLowerCase();
  if(['.xlsx','.xls','.csv'].includes(ext)){
    const wb=XLSX.readFile(file.path); return mapRows(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''}));
  }
  if(ext==='.pdf'){
    const parsed=await pdfParse(fs.readFileSync(file.path));
    const rows=parsed.text.split(/\r?\n/).map(line=>{const parts=line.trim().split(/\s{2,}|\t|,/);return {product:parts[0],quantity:parts[1],cost:parts[2]};});
    return mapRows(rows);
  }
  return [{product_name:'',product_id:null,quantity:0,unit_cost:0,image_preview:`/api/supplier-invoices/attachment/${path.basename(file.path)}`}];
}

router.post('/preview',upload.single('file'),async(req,res)=>{
  if(!req.file)return res.status(400).json({error:'Supported invoice file required'});
  try{res.json({temp_file:path.basename(req.file.path),original_name:req.file.originalname,rows:await parseFile(req.file)});}
  catch(e){fs.rmSync(req.file.path,{force:true});res.status(400).json({error:`Could not read invoice: ${e.message}`});}
});

router.get('/',(req,res)=>{
  const q=`%${String(req.query.q||'').trim()}%`;
  res.json(db.prepare(`SELECT s.*,COUNT(i.id) item_count FROM supplier_invoices s
    LEFT JOIN supplier_invoice_items i ON i.supplier_invoice_id=s.id
    WHERE s.internal_ref LIKE ? OR s.supplier_invoice_no LIKE ? OR s.supplier_name LIKE ?
    GROUP BY s.id ORDER BY s.id DESC`).all(q,q,q));
});
router.get('/attachment/:name',(req,res)=>{
  const name=path.basename(req.params.name),file=path.join(SUPPLIER_UPLOAD_DIR,name);
  if(!fs.existsSync(file))return res.status(404).json({error:'Not found'});
  res.sendFile(file);
});
router.get('/:id',(req,res)=>{
  const row=db.prepare('SELECT * FROM supplier_invoices WHERE id=?').get(req.params.id);
  if(!row)return res.status(404).json({error:'Not found'});
  row.items=db.prepare('SELECT * FROM supplier_invoice_items WHERE supplier_invoice_id=? ORDER BY id').all(row.id);
  res.json(row);
});

router.post('/',(req,res)=>{
  const b=req.body,name=String(b.supplier_name||'').trim(),supplierNo=String(b.supplier_invoice_no||'').trim();
  if(!name||!supplierNo||!b.invoice_date)return res.status(400).json({error:'Supplier, invoice number and date are required'});
  if(!Array.isArray(b.items)||!b.items.length)return res.status(400).json({error:'At least one invoice item is required'});
  try{
    const result=db.transaction(()=>{
      if(db.prepare('SELECT 1 FROM supplier_invoices WHERE LOWER(TRIM(supplier_name))=? AND LOWER(TRIM(supplier_invoice_no))=?').get(normalize(name),normalize(supplierNo)))
        throw new Error('This supplier invoice already exists');
      const seq=db.prepare('SELECT COALESCE(MAX(id),0)+1 n FROM supplier_invoices').get().n;
      const ref=`SUP-${String(seq).padStart(5,'0')}`;
      let subtotal=0; const prepared=[];
      for(const raw of b.items){
        const product=db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(raw.product_id);
        const qty=Number(raw.quantity),cost=Number(raw.unit_cost);
        if(!product)throw new Error('Select a valid product for every row');
        if(!Number.isFinite(qty)||qty<=0||!Number.isFinite(cost)||cost<0)throw new Error(`Invalid quantity or cost for ${product.name}`);
        const line=qty*cost;subtotal+=line;prepared.push({product,qty,cost,line});
      }
      const tax=Number(b.tax)||0,total=subtotal+tax;
      if(tax<0)throw new Error('Invalid tax');
      const file=b.temp_file?path.basename(b.temp_file):null;
      if(file&&!fs.existsSync(path.join(SUPPLIER_UPLOAD_DIR,file)))throw new Error('Uploaded attachment expired');
      const id=db.prepare(`INSERT INTO supplier_invoices(internal_ref,supplier_name,supplier_invoice_no,invoice_date,
        subtotal,tax,total,notes,attachment_path,attachment_name,created_by,created_by_name)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(ref,name,supplierNo,b.invoice_date,subtotal,tax,total,b.notes||null,file,
        b.original_name||null,req.session.userId,req.session.username).lastInsertRowid;
      const ins=db.prepare(`INSERT INTO supplier_invoice_items(supplier_invoice_id,product_id,product_name,quantity,unit_cost,line_total)
        VALUES(?,?,?,?,?,?)`);
      for(const x of prepared){
        const oldQty=x.product.track_stock?Number(x.product.stock):0;
        const newQty=x.product.track_stock?oldQty+x.qty:oldQty;
        const weighted=x.product.track_stock&&newQty>0?((oldQty*Number(x.product.purchase_price))+(x.qty*x.cost))/newQty:x.cost;
        db.prepare('UPDATE products SET stock=?,purchase_price=? WHERE id=?').run(newQty,weighted,x.product.id);
        ins.run(id,x.product.id,x.product.name,x.qty,x.cost,x.line);
        if(x.product.track_stock)db.prepare(`INSERT INTO stock_history(product_id,change,reason,balance,ref) VALUES(?,?,?,?,?)`)
          .run(x.product.id,x.qty,'supplier_invoice',newQty,ref);
      }
      return {id,internal_ref:ref,total};
    })();
    res.json(result);
  }catch(e){res.status(e.message.includes('already exists')?409:400).json({error:e.message});}
});

module.exports=router;
