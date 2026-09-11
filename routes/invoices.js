const express=require('express');
const {db}=require('../db/database');
const {posUsers,sanitizeCosts}=require('../middleware/auth');
const router=express.Router();
router.use(posUsers);

function invoiceNo(){
  const id=db.prepare('SELECT COALESCE(MAX(id),0)+1 n FROM invoices').get().n;
  return `INV-${new Date().getFullYear()}-${String(id).padStart(5,'0')}`;
}
const finite=(v,label,min=0)=>{const n=Number(v);if(!Number.isFinite(n)||n<min)throw new Error(`Invalid ${label}`);return n;};
const isManager=r=>['admin','manager'].includes(r);

router.get('/',(req,res)=>{
  const limit=Math.max(1,Math.min(1000,Number(req.query.limit)||100));
  res.json(sanitizeCosts(db.prepare('SELECT * FROM invoices ORDER BY id DESC LIMIT ?').all(limit),req.session.role));
});
router.get('/:id',(req,res)=>{
  const inv=db.prepare('SELECT * FROM invoices WHERE id=?').get(req.params.id);
  if(!inv)return res.status(404).json({error:'Not found'});
  inv.items=db.prepare('SELECT * FROM invoice_items WHERE invoice_id=?').all(inv.id);
  res.json(sanitizeCosts(inv,req.session.role));
});

router.post('/',(req,res)=>{
  const b=req.body||{};
  if(!db.prepare("SELECT 1 FROM shifts WHERE status='open' LIMIT 1").get())return res.status(400).json({error:'Open a shift before saving orders'});
  if(!Array.isArray(b.items)||!b.items.length)return res.status(400).json({error:'At least one item is required'});
  try{
    const result=db.transaction(()=>{
      const payment=b.payment_status==='unpaid'?'unpaid':'paid';
      const prepared=[];let subtotal=0,cost=0,productTotal=0,gamingTotal=0,games=0;
      for(const raw of b.items){
        const qty=finite(raw.quantity,'quantity',Number.EPSILON),unit=finite(raw.unit_price,'price');
        const product=db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(raw.product_id);
        if(!product)throw new Error('Product not found');
        if(product.type==='gaming'){
          games+=qty;
          if(Number(unit)!==Number(db.prepare("SELECT value FROM settings WHERE key='default_game_price'").get()?.value||100000))
            throw new Error('Gaming price cannot be changed');
        }
        if(product.track_stock&&Number(product.stock)+1e-8<qty)throw new Error(`Insufficient stock for ${product.name}`);
        const line=qty*unit;subtotal+=line;cost+=qty*Number(product.purchase_price||0);
        if(product.type==='gaming')gamingTotal+=line;else productTotal+=line;
        prepared.push({product,qty,unit,line});
      }
      if(games>0&&!Number.isInteger(games))throw new Error('Gaming quantity must be a whole number');
      let customer=String(b.customer_name||'').trim();
      if((games>0||payment==='unpaid')&&!customer)throw new Error('Customer name is required for gaming and debt sales');
      if(!customer)customer='Walk-in Customer';
      let customerRow=db.prepare('SELECT * FROM customers WHERE LOWER(TRIM(name))=LOWER(?) ORDER BY id LIMIT 1').get(customer);
      const customerId=customerRow?customerRow.id:db.prepare('INSERT INTO customers(name) VALUES(?)').run(customer).lastInsertRowid;
      if(customerRow)customer=customerRow.name.trim();
      const discount=finite(b.discount||0,'discount'),total=Math.max(0,subtotal-discount),profit=total-cost,number=invoiceNo();
      const id=db.prepare(`INSERT INTO invoices(invoice_no,customer_id,customer_name,subtotal,discount,total,cost_total,profit,
        product_total,gaming_total,games_count,payment_status,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(number,customerId,customer,subtotal,discount,total,cost,profit,productTotal,gamingTotal,games,payment,b.notes||null).lastInsertRowid;
      const ins=db.prepare(`INSERT INTO invoice_items(invoice_id,product_id,name,type,quantity,unit_price,purchase_price,line_total)
        VALUES(?,?,?,?,?,?,?,?)`);
      for(const x of prepared){
        ins.run(id,x.product.id,x.product.name,x.product.type,x.qty,x.unit,x.product.purchase_price,x.line);
        if(x.product.track_stock){
          const current=db.prepare('SELECT stock FROM products WHERE id=?').get(x.product.id).stock,balance=Number(current)-x.qty;
          db.prepare('UPDATE products SET stock=? WHERE id=?').run(balance,x.product.id);
          db.prepare(`INSERT INTO stock_history(product_id,change,reason,balance,ref) VALUES(?,?,?,?,?)`)
            .run(x.product.id,-x.qty,'sale',balance,number);
        }
      }
      if(payment==='unpaid')db.prepare(`INSERT INTO debtors(invoice_id,customer_id,customer_name,amount,paid_amount,status,notes)
        VALUES(?,?,?,?,0,'unpaid',?)`).run(id,customerId,customer,total,b.notes||`Invoice ${number}`);
      let gamingProgress=null;
      for(let player=0;player<games;player++){
        let session=db.prepare("SELECT * FROM gaming_sessions WHERE status='open' ORDER BY id DESC LIMIT 1").get();
        if(!session){const sid=db.prepare("INSERT INTO gaming_sessions(status,players_count) VALUES('open',0)").run().lastInsertRowid;session={id:sid,players_count:0};}
        db.prepare(`INSERT INTO gaming_session_players(session_id,invoice_id,customer_name,payment_status,price) VALUES(?,?,?,?,?)`)
          .run(session.id,id,customer,payment,gamingTotal/games);
        const count=Number(session.players_count)+1,completed=count===10;
        db.prepare(`UPDATE gaming_sessions SET players_count=?,status=?,completed_at=? WHERE id=?`)
          .run(count,completed?'completed':'open',completed?new Date().toISOString():null,session.id);
        gamingProgress={session_id:session.id,players_count:count,completed};
      }
      return sanitizeCosts({id,invoice_no:number,total,cost_total:cost,profit,gaming_progress:gamingProgress},req.session.role);
    })();
    res.json(result);
  }catch(e){res.status(400).json({error:e.message});}
});

router.delete('/:id',(req,res)=>{
  if(!isManager(req.session.role))return res.status(403).json({error:'Forbidden'});
  try{
    const found=db.transaction(()=>{
      const inv=db.prepare('SELECT * FROM invoices WHERE id=?').get(req.params.id);if(!inv)return false;
      const items=db.prepare(`SELECT i.*,p.track_stock FROM invoice_items i LEFT JOIN products p ON p.id=i.product_id WHERE i.invoice_id=?`).all(inv.id);
      for(const item of items)if(item.product_id&&item.track_stock){
        const p=db.prepare('SELECT stock FROM products WHERE id=?').get(item.product_id);if(!p)continue;
        const balance=Number(p.stock)+Number(item.quantity);
        db.prepare('UPDATE products SET stock=? WHERE id=?').run(balance,item.product_id);
        db.prepare(`INSERT INTO stock_history(product_id,change,reason,balance,ref) VALUES(?,?,?,?,?)`)
          .run(item.product_id,item.quantity,'sale_reversal',balance,inv.invoice_no);
      }
      db.prepare('DELETE FROM debtors WHERE invoice_id=?').run(inv.id);
      db.prepare('DELETE FROM invoices WHERE id=?').run(inv.id);return true;
    })();
    if(!found)return res.status(404).json({error:'Not found'});res.json({ok:true});
  }catch(e){res.status(400).json({error:e.message});}
});
module.exports=router;
