const express=require('express');const bcrypt=require('bcryptjs');const {db}=require('../db/database');const {requireAuth,managerOnly,normalizeRole}=require('../middleware/auth');
const router=express.Router();
router.post('/login',(req,res)=>{const user=db.prepare('SELECT * FROM users WHERE username=?').get(String(req.body.username||'').trim());
  if(!user||!bcrypt.compareSync(String(req.body.password||''),user.password_hash))return res.status(401).json({error:'Invalid username or password'});
  const timeout=Number(db.prepare("SELECT value FROM settings WHERE key='session_timeout_min'").get()?.value)||30;
  Object.assign(req.session,{userId:user.id,username:user.username,role:normalizeRole(user.role),timeoutMin:timeout,lastActivity:Date.now()});
  req.session.save(err=>err?res.status(500).json({error:'Could not save session'}):res.json({id:user.id,username:user.username,role:normalizeRole(user.role)}));});
router.post('/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
router.get('/me',requireAuth,(req,res)=>res.json({id:req.session.userId,username:req.session.username,role:normalizeRole(req.session.role)}));
router.post('/change-password',requireAuth,(req,res)=>{const user=db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId),next=String(req.body.newPassword||'');
  if(!user||!bcrypt.compareSync(String(req.body.currentPassword||''),user.password_hash))return res.status(400).json({error:'Current password incorrect'});
  if(next.length<8)return res.status(400).json({error:'Password must have at least 8 characters'});db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(next,10),user.id);res.json({ok:true});});
router.get('/users',managerOnly,(_req,res)=>res.json(db.prepare('SELECT id,username,role,created_at FROM users ORDER BY username').all().map(u=>({...u,role:normalizeRole(u.role),password_protected:true}))));
router.post('/users',managerOnly,(req,res)=>{const role=normalizeRole(req.body.role);if(!['admin','manager','cashier'].includes(role))return res.status(400).json({error:'Invalid role'});
  const username=String(req.body.username||'').trim(),password=String(req.body.password||'');if(!username||password.length<8)return res.status(400).json({error:'Username and 8-character password required'});
  try{const id=db.prepare('INSERT INTO users(username,password_hash,role) VALUES(?,?,?)').run(username,bcrypt.hashSync(password,10),role).lastInsertRowid;res.json({id});}
  catch(e){res.status(409).json({error:'Username already exists'});}});
router.put('/users/:id',managerOnly,(req,res)=>{const id=Number(req.params.id);if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'Invalid user'});
  const existing=db.prepare('SELECT id,username,role,created_at FROM users WHERE id=?').get(id);if(!existing)return res.status(404).json({error:'User not found'});
  const username=req.body.username===undefined?existing.username:String(req.body.username||'').trim();
  const role=req.body.role===undefined?normalizeRole(existing.role):normalizeRole(req.body.role);const password=String(req.body.password||'');
  if(!username)return res.status(400).json({error:'Username is required'});if(!['admin','manager','cashier'].includes(role))return res.status(400).json({error:'Invalid role'});if(password&&password.length<8)return res.status(400).json({error:'Password must have at least 8 characters'});
  try{if(password)db.prepare('UPDATE users SET username=?,role=?,password_hash=? WHERE id=?').run(username,role,bcrypt.hashSync(password,10),id);else db.prepare('UPDATE users SET username=?,role=? WHERE id=?').run(username,role,id);
    if(req.session.userId===id){req.session.username=username;req.session.role=role;}
    const updated=db.prepare('SELECT id,username,role,created_at FROM users WHERE id=?').get(id);res.json({...updated,role:normalizeRole(updated.role),password_protected:true});
  }catch(e){res.status(409).json({error:'Username already exists'});}});
module.exports=router;
