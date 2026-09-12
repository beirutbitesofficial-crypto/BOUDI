import {t} from '../i18n.js?v=20260912-i18n';
import {api} from '../api.js?v=20260912-i18n';import {el,statCard,money,num,fmtDate,badge,modal} from '../ui.js?v=20260912-i18n';import {renderSupplierInvoices} from './supplier-invoices.js?v=20260912-i18n';
export async function renderInventory(root){
  const tabs=el('div.pill-tabs'),body=el('div');const show=async(name)=>{tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));body.innerHTML='';if(name==='supplier')return renderSupplierInvoices(body);return overview();};
  for(const [name,label] of [['overview',t('Inventory Overview')],['supplier',t('Supplier Invoices')]])tabs.appendChild(el('button',{text:label,'data-tab':name,onclick:()=>show(name)}));root.append(tabs,body);
  async function overview(){const [inv,alerts,history]=await Promise.all([api.get('/inventory'),api.get('/inventory/alerts'),api.get('/inventory/history')]);body.appendChild(el('div.grid.stats-grid',{},[
    statCard({label:t('Inventory purchase value'),value:money(inv.inventory_value),icon:'💰'}),statCard({label:t('Expected retail value'),value:money(inv.retail_value),icon:'🏷️'}),statCard({label:t('Low stock'),value:num(alerts.low.length),icon:'⚠️'}),statCard({label:t('Out of stock'),value:num(alerts.out.length),icon:'🚫'})]));
    const tbody=el('tbody');for(const p of inv.products)tbody.appendChild(el('tr',{},[el('td',{text:p.name}),el('td',{text:p.category_name||'-'}),el('td',{},[p.stock<=0?badge(t('Out'),'badge-red'):num(p.stock)]),el('td',{text:money(p.purchase_price)}),el('td',{text:money(p.selling_price)}),el('td',{text:money(p.purchase_price*p.stock)})]));
    body.appendChild(el('div.card',{},[el('div.table-wrap',{},[el('table',{},[el('thead',{},[el('tr',{},[t('Product'),t('Category'),t('Stock'),t('Purchase cost'),t('Selling price'),t('Value')].map(x=>el('th',{text:x})))]),tbody])])]));
    body.appendChild(el('div.card',{},[el('h3',{text:t('Stock History')}),...history.slice(0,100).map(h=>el('div.history-line',{},[el('b',{text:h.product_name}),el('span',{text:(h.change>=0?'+':'')+h.change}),el('span',{text:t(h.reason)}),el('span',{text:h.ref||'-'}),el('small',{text:fmtDate(h.created_at)})]))]));
  }await show('overview');
}
