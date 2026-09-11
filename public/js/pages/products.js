import {api} from '../api.js';
import {el,money,toast,modal} from '../ui.js';
import {state} from '../app.js';
import {normalizeBarcode,openBarcodeCamera} from '../barcode.js';

export async function renderProducts(root){
  let [products,categories]=await Promise.all([api.get('/products'),api.get('/categories?kind=product')]);
  const search=el('input',{placeholder:'Search products or barcode'});
  const grid=el('div.product-grid');
  const management=state.user.role!=='cashier';
  const add=el('button.btn.btn-primary',{text:'Add Product',onclick:()=>editProduct({},true)});
  const manageCategories=management?el('button.btn.btn-blue',{text:'Manage Categories',onclick:openCategoryManager}):null;
  const imp=management?el('button.btn.btn-blue',{text:'Import Products',onclick:importProducts}):null;
  search.oninput=draw;
  root.append(el('div.flex',{},[search,add,manageCategories,imp]),grid);

  function draw(){
    grid.innerHTML='';
    const q=search.value.toLowerCase();
    for(const p of products.filter(x=>!q||`${x.name} ${x.name_ar||''} ${x.barcode||''}`.toLowerCase().includes(q))){
      const picture=p.image
        ?el('img',{src:p.image,alt:p.name,onerror:e=>e.currentTarget.replaceWith(el('div.product-image-fallback',{text:'☕'}))})
        :el('div.product-image-fallback',{text:'☕'});
      grid.appendChild(el('div.card.product-admin-card',{},[
        picture,el('h3',{text:p.name}),el('p',{text:money(p.selling_price)}),
        el('p',{text:p.track_stock?`Stock: ${p.stock}`:'Stock not tracked'}),
        el('p',{text:p.barcode?`Barcode: ${p.barcode}`:'No barcode',style:'color:var(--muted);font-size:.9rem'}),
        management?el('div.product-card-actions',{},[
          el('button.btn.btn-sm.btn-blue',{text:p.barcode?'Scan / Change Code':'Scan Code',onclick:()=>editProduct(p,true)}),
          el('button.btn.btn-sm',{text:'Edit',onclick:()=>editProduct(p,false)}),
          el('button.btn.btn-sm.btn-danger',{text:'Archive',onclick:async()=>{await api.del('/products/'+p.id);products=await api.get('/products');draw();}})
        ]):null
      ]));
    }
  }

  function editProduct(p={},scanFirst=false){
    const barcode=el('input',{value:p.barcode||'',placeholder:'Scan barcode or enter code','data-barcode-input':'1',autocomplete:'off',inputmode:'numeric'});
    const scanBtn=el('button.btn.btn-blue',{type:'button',text:'📷 Scan Barcode'});
    const name=el('input',{value:p.name||'',placeholder:'Product name'});
    const ar=el('input',{value:p.name_ar||'',placeholder:'Arabic name'});
    const category=el('select',{},[el('option',{value:'',text:'Select category'}),...categories.map(c=>el('option',{value:c.id,text:c.name,selected:String(c.id)===String(p.category_id)?'selected':null}))]);
    const sell=el('input',{type:'number',min:'0',value:p.selling_price||0});
    const cost=el('input',{type:'number',min:'0',value:p.purchase_price||0});
    const stock=el('input',{type:'number',min:'0',value:p.stock||0});
    const min=el('input',{type:'number',min:'0',value:p.min_stock||0});
    const track=el('input',{type:'checkbox',checked:p.track_stock===0?null:'checked'});
    const active=el('input',{type:'checkbox',checked:p.active===0?null:'checked'});
    const image=el('input',{type:'file',accept:'.png,.jpg,.jpeg,.webp'});
    let imagePath=p.image||null;
    const focusDetails=()=>{name.focus();name.select?.();};
    barcode.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();barcode.value=normalizeBarcode(barcode.value);focusDetails();}});
    scanBtn.onclick=()=>openBarcodeCamera({title:p.id?'Scan / Change Product Barcode':'Scan New Product Barcode',onScan:code=>{barcode.value=code;focusDetails();return false;}});
    const save=async()=>{
      try{
        if(image.files[0]){const fd=new FormData();fd.append('image',image.files[0]);imagePath=(await api.upload('/products/upload',fd)).path;}
        const data={name:name.value,name_ar:ar.value,category_id:category.value||null,type:'product',barcode:normalizeBarcode(barcode.value),selling_price:sell.value,stock:stock.value,min_stock:min.value,track_stock:track.checked,active:active.checked,image:imagePath};
        if(management)data.purchase_price=cost.value;
        if(p.id)await api.put('/products/'+p.id,data);else await api.post('/products',data);
        m.close();products=await api.get('/products');draw();toast('Product saved');
      }catch(e){toast(e.message,'error');}
    };
    const barcodeBlock=el('div',{style:'grid-column:1/-1'},[
      el('label',{text:'Barcode',style:'display:block;margin-bottom:7px;font-weight:800'}),
      el('div.flex',{},[barcode,scanBtn]),
      el('small',{text:'Scan the product first with the USB barcode scanner or phone camera, then enter its name and price.',style:'display:block;margin-top:6px;color:var(--muted)'})
    ]);
    const fields=[barcodeBlock,name,ar,category,sell];if(management)fields.push(cost);
    fields.push(stock,min,el('label',{},[track,' Track stock']),el('label',{},[active,' Active']),image);
    const m=modal({title:p.id?'Edit Product':'Add Product',wide:true,body:el('div.form-grid',{},fields),footer:el('button.btn.btn-primary',{text:'Save',onclick:save})});
    setTimeout(()=>{if(scanFirst||!p.id){barcode.focus();barcode.select?.();}},50);
  }

  function openCategoryManager(){
    const list=el('div');
    const body=el('div',{},[
      el('p',{text:'Add new product categories or edit the names employees see in the POS.',style:'color:var(--muted);margin-top:0'}),
      el('button.btn.btn-primary',{text:'+ Add Category',onclick:()=>editCategory()}),list
    ]);
    modal({title:'Manage Categories',wide:true,body});
    function renderList(){
      list.innerHTML='';
      if(!categories.length){list.appendChild(el('p',{text:'No categories yet.',style:'color:var(--muted)'}));return;}
      for(const category of categories){
        list.appendChild(el('div.card.flex',{style:'justify-content:space-between;margin-top:10px'},[
          el('div',{},[el('b',{text:category.name}),category.name_ar?el('small',{text:` — ${category.name_ar}`,style:'color:var(--muted)'}):null]),
          el('button.btn.btn-sm',{text:'Edit',onclick:()=>editCategory(category)})
        ]));
      }
    }
    function editCategory(category={}){
      const name=el('input',{value:category.name||'',placeholder:'Category name'});
      const nameAr=el('input',{value:category.name_ar||'',placeholder:'Arabic name (optional)',dir:'rtl'});
      const save=el('button.btn.btn-primary',{text:'Save'});
      const categoryModal=modal({title:category.id?'Edit Category':'Add Category',body:el('div.form-grid',{},[name,nameAr]),footer:save});
      save.onclick=async()=>{
        if(!name.value.trim())return toast('Category name is required','error');
        save.disabled=true;
        try{
          const payload={name:name.value.trim(),name_ar:nameAr.value.trim(),kind:'product'};
          if(category.id)await api.put('/categories/'+category.id,payload);else await api.post('/categories',payload);
          categories=await api.get('/categories?kind=product');categoryModal.close();renderList();toast(category.id?'Category updated':'Category added');
        }catch(e){toast(e.message,'error');}finally{save.disabled=false;}
      };
      setTimeout(()=>name.focus(),50);
    }
    renderList();
  }

  function importProducts(){
    const file=el('input',{type:'file',accept:'.xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.webp'}),review=el('div'),rows=[];
    file.onchange=async()=>{const fd=new FormData();fd.append('file',file.files[0]);const r=await api.upload('/product-import/preview',fd);rows.splice(0,rows.length,...r.rows);renderRows();};
    function renderRows(){review.innerHTML='';rows.forEach((r,i)=>{const n=el('input',{value:r.name,placeholder:'Product name'}),c=el('select',{},[el('option',{value:'',text:'Category'}),...categories.map(x=>el('option',{value:x.id,text:x.name}))]),s=el('input',{type:'number',value:r.selling_price}),p=el('input',{type:'number',value:r.purchase_price}),q=el('input',{type:'number',value:r.stock});for(const[x,k]of[[n,'name'],[c,'category_id'],[s,'selling_price'],[p,'purchase_price'],[q,'stock']])x.oninput=()=>r[k]=x.value;review.appendChild(el('div.supplier-row',{},[n,c,s,p,q,el('button',{text:'✕',onclick:()=>{rows.splice(i,1);renderRows();}})]));});}
    const m=modal({title:'Import Products — review before saving',wide:true,body:el('div',{},[file,review]),footer:el('button.btn.btn-primary',{text:'Save Products',onclick:async()=>{try{const r=await api.post('/product-import/save',{rows});toast(`Added ${r.added}; skipped ${r.skipped} duplicates`);m.close();products=await api.get('/products');draw();}catch(e){toast(e.message,'error');}}})});
  }
  draw();
}
