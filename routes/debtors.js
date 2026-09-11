const express=require('express');
const {db}=require('../db/database');
const {posUsers}=require('../middleware/auth');
const router=express.Router();router.use(posUsers);
const nameKey=x=>`LOWER(TRIM(REPLACE(REPLACE(REPLACE(${x},'  ',' '),'  ',' '),'  ',' ')))`;
const grouped=`SELECT MIN(id) id,TRIM(customer_name) customer_name,MAX(NULLIF(TRIM(phone),'')) phone,SUM(amount) amount,SUM(paid_amount) paid_amount,
 CASE WHEN SUM(amount-paid_amount)<=0.000001 THEN 'paid' WHEN SUM(paid_amount)>0 THEN 'partial' ELSE 'unpaid' END status,
 COUNT(*) debt_count,MAX(created_at) created_at FROM debtors GROUP BY ${nameKey('customer_name')}`;
const getGroup=id=>db.prepare(`${grouped} HAVING ${nameKey('customer_name')}=(SELECT ${nameKey('customer_name')} FROM debtors WHERE id=?)`).get(id);
function normalizeLebanesePhone(value){const raw=String(value||'').trim();if(!raw)return null;let digits=raw.replace(/\D/g,'');if(digits.startsWith('00961'))digits=digits.slice(2);if(digits.startsWith('961'))digits='+'+digits;else{if(digits.startsWith('0'))digits=digits.slice(1);digits='+961'+digits;}if(!/^\+961\d{7,8}$/.test(digits))throw new Error('Enter a valid Lebanese phone number');return digits;}

router.get('/',(req,res)=>{let sql=`SELECT * FROM (${grouped}) WHERE status!='paid'`,params=[];if(['unpaid','partial'].includes(req.query.status)){sql+=' AND status=?';params=[req.query.status];}
  res.json(db.prepare(`${sql} ORDER BY created_at DESC`).all(...params));});
router.get('/summary',(req,res)=>res.json(db.prepare(`SELECT COALESCE(SUM(amount-paid_amount),0) outstanding,
 COUNT(DISTINCT ${nameKey('customer_name')}) count FROM debtors WHERE amount-paid_amount>0.000001`).get()));
router.get('/:id',(req,res)=>{const d=getGroup(req.params.id);if(!d)return res.status(404).json({error:'Not found'});
  d.payments=db.prepare(`SELECT p.* FROM debtor_payments p JOIN debtors d ON d.id=p.debtor_id
    WHERE ${nameKey('d.customer_name')}=${nameKey('?')} ORDER BY p.id`).all(d.customer_name);res.json(d);});
router.post('/',(req,res)=>{const name=String(req.body.customer_name||'').trim(),amount=Number(req.body.amount);let phone;try{phone=normalizeLebanesePhone(req.body.phone);}catch(e){return res.status(400).json({error:e.message});}
  if(!name||!Number.isFinite(amount)||amount<=0)return res.status(400).json({error:'Valid customer and amount required'});
  let c=db.prepare(`SELECT * FROM customers WHERE ${nameKey('name')}=${nameKey('?')} ORDER BY id LIMIT 1`).get(name);
  const cid=c?c.id:db.prepare('INSERT INTO customers(name) VALUES(?)').run(name).lastInsertRowid;
  const id=db.prepare(`INSERT INTO debtors(customer_id,customer_name,phone,amount,paid_amount,status,notes) VALUES(?,?,?, ?,0,'unpaid',?)`)
    .run(cid,c?c.name.trim():name,phone,amount,req.body.notes||null).lastInsertRowid;if(phone)db.prepare('UPDATE customers SET phone=? WHERE id=?').run(phone,cid);res.json({id});});
router.put('/:id',(req,res)=>{const g=getGroup(req.params.id);if(!g)return res.status(404).json({error:'Not found'});
  const name=String(req.body.customer_name||g.customer_name).trim();if(!name)return res.status(400).json({error:'Customer name required'});let phone;try{phone=req.body.phone===undefined?g.phone:normalizeLebanesePhone(req.body.phone);}catch(e){return res.status(400).json({error:e.message});}
  db.transaction(()=>{db.prepare(`UPDATE debtors SET customer_name=?,phone=?,notes=COALESCE(?,notes)
    WHERE ${nameKey('customer_name')}=${nameKey('?')}`).run(name,phone,req.body.notes??null,g.customer_name);
    db.prepare(`UPDATE customers SET name=?,phone=COALESCE(?,phone) WHERE ${nameKey('name')}=${nameKey('?')}`).run(name,phone,g.customer_name);})();res.json({ok:true});});
router.post('/:id/pay',(req,res)=>{const g=getGroup(req.params.id);if(!g)return res.status(404).json({error:'Not found'});
  let amount=req.body.amount===undefined?g.amount-g.paid_amount:Number(req.body.amount);if(!Number.isFinite(amount)||amount<=0)return res.status(400).json({error:'Invalid amount'});
  amount=Math.min(amount,g.amount-g.paid_amount);db.transaction(()=>{let left=amount;const rows=db.prepare(`SELECT * FROM debtors
    WHERE ${nameKey('customer_name')}=${nameKey('?')} AND amount-paid_amount>0.000001 ORDER BY id`).all(g.customer_name);
    for(const d of rows){if(left<=0.000001)break;const paidNow=Math.min(left,d.amount-d.paid_amount),paid=d.paid_amount+paidNow,
      status=paid>=d.amount-0.000001?'paid':'partial';db.prepare('INSERT INTO debtor_payments(debtor_id,amount,notes) VALUES(?,?,?)').run(d.id,paidNow,req.body.notes||null);
      db.prepare('UPDATE debtors SET paid_amount=?,status=? WHERE id=?').run(paid,status,d.id);if(status==='paid'&&d.invoice_id)db.prepare("UPDATE invoices SET payment_status='paid' WHERE id=?").run(d.invoice_id);left-=paidNow;}})();res.json({ok:true,paid:amount});});
router.delete('/:id',(req,res)=>{if(!['admin','manager'].includes(req.session.role))return res.status(403).json({error:'Cashier cannot delete debtors'});
  const g=getGroup(req.params.id);if(!g)return res.status(404).json({error:'Not found'});db.prepare(`DELETE FROM debtors WHERE ${nameKey('customer_name')}=${nameKey('?')}`).run(g.customer_name);res.json({ok:true});});
module.exports=router;
