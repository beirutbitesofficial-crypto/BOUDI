try{require('dotenv').config();}catch{}
const path=require('path');const express=require('express');const session=require('express-session');const cookieParser=require('cookie-parser');
const {init,UPLOAD_DIR,db}=require('./db/database');const {ensureBarcodeSchema}=require('./db/barcode');init();ensureBarcodeSchema(db);
const app=express(),PORT=process.env.PORT||5050,HOST=process.env.HOST||'0.0.0.0';app.set('trust proxy',1);
app.use(express.json({limit:'25mb'}));app.use(express.urlencoded({extended:true,limit:'25mb'}));app.use(cookieParser());
app.use(session({secret:process.env.SESSION_SECRET||'boudi-cafe-change-this',proxy:true,resave:false,saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:'lax',secure:process.env.COOKIE_SECURE==='true'?'auto':false,maxAge:12*60*60*1000}}));
for(const [url,file] of [['auth','auth'],['dashboard','dashboard'],['categories','categories'],['products','products'],['gaming','gaming'],
  ['invoices','invoices'],['debtors','debtors'],['shifts','shifts'],['open-orders','open_orders'],['expenses','expenses'],
  ['inventory','inventory'],['supplier-invoices','supplier_invoices'],['product-import','product_import'],['reports','reports'],['search','search'],['settings','settings'],['backup','backup']])
  app.use(`/api/${url}`,require(`./routes/${file}`));
app.get('/vendor/html5-qrcode.min.js',(_req,res)=>res.sendFile(path.join(__dirname,'node_modules','html5-qrcode','html5-qrcode.min.js')));
app.use('/uploads',express.static(UPLOAD_DIR,{etag:true,maxAge:'1h'}));app.use(express.static(path.join(__dirname,'public')));
app.get('*',(_req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,HOST,()=>console.log(`BOUDI CAFE POS running on ${HOST}:${PORT}`));
module.exports=app;
