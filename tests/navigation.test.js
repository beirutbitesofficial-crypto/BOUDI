const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');
function node(){const classes=new Set();return {classList:{toggle(k,on){on?classes.add(k):classes.delete(k)},contains:k=>classes.has(k)},attrs:{},setAttribute(k,v){this.attrs[k]=v},focus(){},addEventListener(k,fn){this[k]=fn}};}
test('drawer synchronizes backdrop, scroll lock, expanded state and route dismissal',async()=>{
 const sidebar=node(),app=node(),toggle=node(),close=node(),backdrop=node(),link=node(),body=node();
 sidebar.querySelectorAll=()=>[link];
 const viewport={matches:true,addEventListener(k,fn){this.change=fn}};
 const handlers={};global.window={matchMedia:()=>viewport};global.document={body,addEventListener(k,fn){handlers[k]=fn}};
 try{
 const src=fs.readFileSync(path.join(__dirname,'../public/js/navigation.js'),'utf8');
 const {setupNavigation}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
 setupNavigation({sidebar,app,toggle,close,backdrop,translate:x=>x});
 assert.equal(sidebar.inert,true);assert.equal(backdrop.hidden,true);
 toggle.onclick();assert.equal(toggle.attrs['aria-expanded'],'true');assert.equal(backdrop.hidden,false);assert.equal(body.classList.contains('sidebar-open'),true);
 link.click();assert.equal(toggle.attrs['aria-expanded'],'false');assert.equal(body.classList.contains('sidebar-open'),false);
 toggle.onclick();backdrop.onclick();assert.equal(backdrop.hidden,true);
 toggle.onclick();handlers.keydown({key:'Escape',preventDefault(){}});assert.equal(sidebar.inert,true);
 viewport.matches=false;viewport.change();assert.equal(sidebar.inert,false);
 }finally{delete global.window;delete global.document;}
});
