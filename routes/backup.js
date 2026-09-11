const express=require('express');
const fs=require('fs');
const path=require('path');
const multer=require('multer');
const archiver=require('archiver');
const unzipper=require('unzipper');
const {db,DATA_DIR,DB_PATH,UPLOAD_DIR,SUPPLIER_UPLOAD_DIR}=require('../db/database');
const {managerOnly}=require('../middleware/auth');
const router=express.Router();router.use(managerOnly);
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:512*1024*1024}});
const TABLES=['users','categories','products','customers','invoices','invoice_items','debtors','debtor_payments','expenses',
  'shifts','open_orders','open_order_items','gaming_sessions','gaming_session_players','stock_history','settings','supplier_invoices','supplier_invoice_items'];

function manifest(){const dump={version:3,app:'BOUDI CAFE',kind:'full-backup',exported_at:new Date().toISOString(),tables:{}};
  for(const table of TABLES)dump.tables[table]=db.prepare(`SELECT * FROM ${table}`).all();return dump;}

function restoreTables(data){if(!data?.tables)throw new Error('Invalid backup manifest');
  db.transaction(()=>{for(const table of [...TABLES].reverse())db.prepare(`DELETE FROM ${table}`).run();
    for(const table of TABLES){const rows=data.tables[table];if(!Array.isArray(rows)||!rows.length)continue;
      const available=new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name));const cols=Object.keys(rows[0]).filter(c=>available.has(c));
      if(!cols.length)continue;const stmt=db.prepare(`INSERT INTO ${table}(${cols.join(',')}) VALUES(${cols.map(()=>'?').join(',')})`);
      for(const row of rows)stmt.run(...cols.map(c=>row[c]));}})();}

router.get('/export',(_req,res)=>{db.pragma('wal_checkpoint(FULL)');const dump=manifest();
  res.setHeader('Content-Type','application/json');res.setHeader('Content-Disposition',`attachment; filename="boudi-cafe-backup-${new Date().toISOString().slice(0,10)}.json"`);
  res.send(JSON.stringify(dump,null,2));});

router.get('/export-full',(_req,res)=>{db.pragma('wal_checkpoint(FULL)');const date=new Date().toISOString().slice(0,10);
  res.setHeader('Content-Type','application/zip');res.setHeader('Content-Disposition',`attachment; filename="boudi-cafe-full-backup-${date}.zip"`);
  const zip=archiver('zip',{zlib:{level:6}});zip.on('error',e=>{if(!res.headersSent)res.status(500).json({error:e.message});else res.destroy(e);});zip.pipe(res);
  zip.append(JSON.stringify(manifest(),null,2),{name:'manifest.json'});if(fs.existsSync(DB_PATH))zip.file(DB_PATH,{name:'database/boudicafe.db'});
  if(fs.existsSync(UPLOAD_DIR))zip.directory(UPLOAD_DIR,'uploads');if(fs.existsSync(SUPPLIER_UPLOAD_DIR))zip.directory(SUPPLIER_UPLOAD_DIR,'supplier-invoices');zip.finalize();});

router.post('/import',(req,res)=>{try{restoreTables(req.body);res.json({ok:true});}catch(e){res.status(400).json({error:e.message});}});

router.post('/import-full',upload.single('backup'),async(req,res)=>{if(!req.file)return res.status(400).json({error:'Select a ZIP backup'});
  try{const zip=await unzipper.Open.buffer(req.file.buffer);const entries=new Map();
    for(const entry of zip.files){const normalized=entry.path.replace(/\\/g,'/');if(normalized.startsWith('/')||normalized.split('/').includes('..'))throw new Error('Unsafe backup path');if(entry.type==='File')entries.set(normalized,await entry.buffer());}
    const raw=entries.get('manifest.json');if(!raw)throw new Error('manifest.json is missing');const data=JSON.parse(raw.toString('utf8'));if(data.app!=='BOUDI CAFE')throw new Error('This is not a BOUDI CAFE backup');
    const files=[];for(const [name,buffer] of entries){let target;if(name.startsWith('uploads/'))target=path.join(UPLOAD_DIR,path.basename(name));else if(name.startsWith('supplier-invoices/'))target=path.join(SUPPLIER_UPLOAD_DIR,path.basename(name));else continue;files.push({target,buffer});}
    restoreTables(data);for(const file of files){fs.mkdirSync(path.dirname(file.target),{recursive:true});fs.writeFileSync(file.target,file.buffer);}res.json({ok:true,files_restored:files.length});
  }catch(e){res.status(400).json({error:e.message});}});

router.post('/factory-reset',(req,res)=>{if(String(req.body.confirm||'')!=='FACTORY RESET')return res.status(400).json({error:'Type FACTORY RESET to confirm'});
  const purge=['supplier_invoice_items','supplier_invoices','gaming_session_players','gaming_sessions','debtor_payments','debtors','invoice_items','invoices','open_order_items','open_orders','stock_history','expenses','shifts','customers'];
  db.transaction(()=>{for(const table of purge)db.prepare(`DELETE FROM ${table}`).run();db.prepare('UPDATE products SET stock=0').run();})();
  for(const folder of ['supplier-invoices','uploads']){const dir=path.join(DATA_DIR,folder);if(fs.existsSync(dir))for(const file of fs.readdirSync(dir))fs.rmSync(path.join(dir,file),{force:true,recursive:true});}
  res.json({ok:true});});
module.exports=router;
