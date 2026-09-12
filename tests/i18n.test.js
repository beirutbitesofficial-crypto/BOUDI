const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'../public/js');
const asURL=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');

test('Arabic defaults, English login, reversible switch, and safe interpolation',async()=>{
  let loggedIn=false;
  const app={},login={classList:{contains:()=>loggedIn}},button={};
  const node={textContent:'Products',getAttribute:()=> 'products',closest:()=>null};
  const loginNode={textContent:'Login',getAttribute:()=> 'login',closest:()=>login};
  global.document={documentElement:{},getElementById:id=>({app,'login-screen':login,'quick-lang':button})[id],querySelectorAll:selector=>selector==='[data-i18n]'?[node,loginNode]:[]};
  global.localStorage={getItem:()=> 'en',setItem(){}};
  const phrases=asURL(fs.readFileSync(path.join(root,'phrases.js'),'utf8'));
  const source=fs.readFileSync(path.join(root,'i18n.js'),'utf8').replace(/'\.\/phrases\.js[^']*'/,JSON.stringify(phrases));
  const {getLang,setLang,t}=await import(asURL(source));
  assert.equal(getLang(),'ar');
  setLang('ar');assert.equal(document.documentElement.lang,'en');assert.equal(login.dir,'ltr');assert.equal(loginNode.textContent,'Login');
  loggedIn=true;setLang('ar');assert.equal(document.documentElement.dir,'rtl');assert.equal(node.textContent,'المنتجات');
  assert.equal(t('Purchase Price (LBP)'),'سعر الشراء (ل.ل.)');
  assert.equal(t('Barcode: {code}',{code:'001234'}),'الباركود: 001234');
  setLang('en');assert.equal(document.documentElement.dir,'ltr');assert.equal(node.textContent,'Products');assert.equal(t('Save Product'),'Save Product');assert.equal(button.textContent,'العربية');
  assert.equal(t('BOUDI CAFE'),'BOUDI CAFE');assert.equal(loginNode.textContent,'Login');
  setLang('ar');assert.equal(t('Save Product'),'حفظ المنتج');
  delete global.document;delete global.localStorage;
});

test('all relative JS imports use the same version, including cyclic app imports',()=>{
  for(const dir of [root,path.join(root,'pages')])for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.js'))){
    const source=fs.readFileSync(path.join(dir,file),'utf8');
    for(const match of source.matchAll(/from\s*['"](\.[^'"]+)['"]/g))assert.ok(match[1].endsWith('?v=20260912-mobile'),`${file}: ${match[1]}`);
  }
});
