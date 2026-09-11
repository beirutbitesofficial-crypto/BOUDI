const express = require('express');
const { db } = require('../db/database');
const { allowRoles, sanitizeCosts } = require('../middleware/auth');

const router = express.Router();
router.use(allowRoles(['cashier', 'management']));

// Gaming items are products with type='gaming'
router.get('/', (req, res) => {
  res.json(sanitizeCosts(db.prepare("SELECT * FROM products WHERE type='gaming' AND active=1 ORDER BY selling_price").all(),req.session.role));
});

function currentSession(){
  const session=db.prepare("SELECT * FROM gaming_sessions WHERE status='open' ORDER BY id DESC LIMIT 1").get();
  if(!session)return {id:null,players_count:0,status:'open',players:[]};
  session.players=db.prepare('SELECT id,customer_name,payment_status,price,created_at FROM gaming_session_players WHERE session_id=? ORDER BY id').all(session.id);
  return session;
}

router.get('/session/current', (_req,res)=>res.json(currentSession()));

router.post('/session/player', (req,res)=>{
  const name=String(req.body.customer_name||'').trim();
  const payment=req.body.payment_status==='unpaid'?'unpaid':'paid';
  const productId=Number(req.body.product_id);
  if(!name)return res.status(400).json({error:'Gamer name is required'});
  if(!db.prepare("SELECT 1 FROM shifts WHERE status='open' LIMIT 1").get())return res.status(400).json({error:'Open a shift before adding gamers'});
  try{
    const result=db.transaction(()=>{
      const product=db.prepare("SELECT * FROM products WHERE id=? AND type='gaming' AND active=1").get(productId);
      if(!product)throw new Error('Select a gaming item');
      const price=Number(db.prepare("SELECT value FROM settings WHERE key='default_game_price'").get()?.value||100000);
      const cost=Number(product.purchase_price||0);
      let session=db.prepare("SELECT * FROM gaming_sessions WHERE status='open' ORDER BY id DESC LIMIT 1").get();
      if(!session){const sid=db.prepare("INSERT INTO gaming_sessions(status,players_count) VALUES('open',0)").run().lastInsertRowid;session={id:sid,players_count:0};}
      if(session.players_count>=10)throw new Error('Gaming session is already complete');
      let customer=db.prepare('SELECT * FROM customers WHERE LOWER(TRIM(name))=LOWER(?) ORDER BY id LIMIT 1').get(name);
      const customerId=customer?customer.id:db.prepare('INSERT INTO customers(name) VALUES(?)').run(name).lastInsertRowid;
      const savedName=customer?customer.name.trim():name;
      const nextId=db.prepare('SELECT COALESCE(MAX(id),0)+1 n FROM invoices').get().n;
      const invoiceNo=`INV-${new Date().getFullYear()}-${String(nextId).padStart(5,'0')}`;
      const invoiceId=db.prepare(`INSERT INTO invoices(invoice_no,customer_id,customer_name,subtotal,discount,total,cost_total,profit,
        product_total,gaming_total,games_count,payment_status,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(invoiceNo,customerId,savedName,price,0,price,cost,price-cost,0,price,1,payment,req.body.notes||'Gaming session player').lastInsertRowid;
      db.prepare(`INSERT INTO invoice_items(invoice_id,product_id,name,type,quantity,unit_price,purchase_price,line_total)
        VALUES(?,?,?,?,1,?,?,?)`).run(invoiceId,product.id,product.name,'gaming',price,Number(product.purchase_price||0),price);
      if(payment==='unpaid')db.prepare(`INSERT INTO debtors(invoice_id,customer_id,customer_name,amount,paid_amount,status,notes)
        VALUES(?,?,?,?,0,'unpaid',?)`).run(invoiceId,customerId,savedName,price,`Gaming ${invoiceNo}`);
      db.prepare(`INSERT INTO gaming_session_players(session_id,invoice_id,customer_name,payment_status,price) VALUES(?,?,?,?,?)`)
        .run(session.id,invoiceId,savedName,payment,price);
      const count=Number(session.players_count)+1,completed=count===10;
      db.prepare(`UPDATE gaming_sessions SET players_count=?,status=?,completed_at=? WHERE id=?`)
        .run(count,completed?'completed':'open',completed?new Date().toISOString():null,session.id);
      return {ok:true,invoice_no:invoiceNo,session_id:session.id,players_count:count,completed};
    })();
    res.json(result);
  }catch(e){res.status(400).json({error:e.message});}
});

module.exports = router;
