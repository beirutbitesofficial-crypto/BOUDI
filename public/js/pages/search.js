import { api } from '../api.js';
import { t } from '../i18n.js';
import { el, money, num, fmtDate, badge } from '../ui.js';

export async function renderSearch(root) {
  const input = el('input', { placeholder: t('search_placeholder'), 'data-i18n-ph': 'search_placeholder', style: 'font-size:16px;padding:14px' });
  const results = el('div', { style: 'margin-top:18px' });
  let timer = null;

  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 250); });

  async function run() {
    const q = input.value.trim();
    if (!q) { results.innerHTML = ''; return; }
    const d = await api.get('/search?q=' + encodeURIComponent(q));
    results.innerHTML = '';
    const any = d.invoices.length || d.products.length || d.debtors.length || d.customers.length;
    if (!any) { results.appendChild(el('div.empty-state', { html: `<div class="es-ico">🔍</div>${t('no_results')}` })); return; }

    if (d.products.length) results.appendChild(section('📦 ' + t('products'),
      ['', t('type'), t('selling_price'), t('stock')],
      d.products.map(p => [p.name, p.type === 'gaming' ? t('gaming') : t('product'), money(p.selling_price), num(p.stock)])));

    if (d.invoices.length) results.appendChild(section('🧾 ' + t('invoices'),
      [t('invoice_no'), t('customer_name'), t('total'), t('status'), t('date')],
      d.invoices.map(i => [i.invoice_no, i.customer_name, money(i.total),
        i.payment_status === 'paid' ? t('paid') : t('unpaid'), fmtDate(i.created_at)])));

    if (d.debtors.length) results.appendChild(section('💳 ' + t('debtors'),
      [t('customer_name'), t('debt_amount'), t('paid_amount'), t('status')],
      d.debtors.map(x => [x.customer_name, money(x.amount), money(x.paid_amount), x.status])));

    if (d.customers.length) results.appendChild(section('👥 ' + t('customers_today').replace(' Today', '').replace(' اليوم', ''),
      [t('name'), t('username').replace('Username','Phone').replace('اسم المستخدم','هاتف')],
      d.customers.map(c => [c.name, c.phone || '-'])));
  }

  function section(title, headers, rows) {
    return el('div.card', { style: 'margin-bottom:16px' }, [
      el('div.card-title', { text: title }),
      el('div.table-wrap', {}, [el('table', {}, [
        el('thead', {}, [el('tr', {}, headers.map(h => el('th', { text: h })))]),
        el('tbody', {}, rows.map(r => el('tr', {}, r.map(c => el('td', { text: String(c) })))))
      ])])
    ]);
  }

  root.appendChild(el('div.card', {}, [el('div.search-box', { style: 'max-width:100%' }, [input])]));
  root.appendChild(results);
  input.focus();
}
