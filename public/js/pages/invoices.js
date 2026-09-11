import { api } from '../api.js';
import { t, getLang } from '../i18n.js';
import { el, money, num, fmtDate, badge, toast, modal, confirmDialog } from '../ui.js';

export async function renderInvoices(root) {
  const invoices = await api.get('/invoices?limit=300');

  const searchInput = el('input', { placeholder: t('search'), 'data-i18n-ph': 'search' });
  const tbody = el('tbody', {});

  function draw(list) {
    tbody.innerHTML = '';
    if (!list.length) { tbody.appendChild(el('tr', {}, [el('td', { colspan: 7, class: 'muted', text: t('no_results') })])); return; }
    list.forEach(inv => {
      tbody.appendChild(el('tr', {}, [
        el('td', {}, [el('b', { text: inv.invoice_no })]),
        el('td', { text: inv.customer_name }),
        el('td', { text: money(inv.total) }),
        el('td', {}, [inv.gaming_total > 0 ? badge(money(inv.gaming_total), 'badge-blue') : el('span.muted', { text: '-' })]),
        el('td', {}, [inv.payment_status === 'paid' ? badge(t('paid'), 'badge-green') : badge(t('unpaid'), 'badge-red')]),
        el('td.muted', { text: fmtDate(inv.created_at) }),
        el('td', {}, [el('div.list-actions', {}, [
          el('button.btn.btn-sm.btn-blue', { text: t('view'), onclick: () => viewInvoice(inv.id) }),
          el('button.btn.btn-sm.btn-danger', { text: t('delete'), onclick: () => del(inv.id) })
        ])])
      ]));
    });
  }

  function filter() {
    const q = searchInput.value.trim().toLowerCase();
    draw(invoices.filter(i => !q || i.invoice_no.toLowerCase().includes(q) || i.customer_name.toLowerCase().includes(q)));
  }
  searchInput.addEventListener('input', filter);

  async function del(id) {
    confirmDialog(t('confirm_delete'), async () => {
      await api.del('/invoices/' + id);
      const idx = invoices.findIndex(i => i.id === id);
      if (idx >= 0) invoices.splice(idx, 1);
      filter(); toast(t('delete'), 'success');
    });
  }

  async function viewInvoice(id) {
    const inv = await api.get('/invoices/' + id);
    const rows = inv.items.map(it => el('tr', {}, [
      el('td', {}, [it.name, it.type === 'gaming' ? badge(' ' + t('gaming'), 'badge-blue') : null]),
      el('td', { text: num(it.quantity) }),
      el('td', { text: money(it.unit_price) }),
      el('td.text-right', { text: money(it.line_total) })
    ]));
    const body = el('div', {}, [
      el('div.card', { style: 'background:var(--bg-2);margin-bottom:14px' }, [
        line(t('invoice_no'), inv.invoice_no),
        line(t('customer_name'), inv.customer_name),
        line(t('date'), fmtDate(inv.created_at)),
        line(t('payment_status'), inv.payment_status === 'paid' ? t('paid') : t('unpaid')),
        inv.notes ? line(t('notes'), inv.notes) : null
      ]),
      el('div.table-wrap', {}, [el('table', {}, [
        el('thead', {}, [el('tr', {}, [el('th', { text: t('name') }), el('th', { text: t('quantity') }), el('th', { text: t('unit_price') }), el('th.text-right', { text: t('total') })])]),
        el('tbody', {}, rows)
      ])]),
      el('div.card', { style: 'background:var(--bg-2);margin-top:14px' }, [
        line(t('product_sales'), money(inv.product_total)),
        line(t('gaming_sales'), money(inv.gaming_total)),
        inv.discount > 0 ? line(t('discount'), money(inv.discount)) : null,
        line(t('grand_total'), money(inv.total))
      ])
    ]);
    const printBtn = el('button.btn.btn-blue', { text: '🖨️ ' + t('print'), onclick: () => window.print() });
    const closeBtn = el('button.btn.btn-ghost', { text: t('close') });
    const m = modal({ title: inv.invoice_no, body, footer: [printBtn, closeBtn], wide: true });
    closeBtn.addEventListener('click', m.close);
  }
  function line(k, v) { return el('div.cart-total-row', {}, [el('span.muted', { text: k }), el('b', { text: v })]); }

  const card = el('div.card', {}, [
    el('div.toolbar', {}, [el('div.search-box', {}, [searchInput]), el('div.spacer', {})]),
    el('div.table-wrap', {}, [el('table', {}, [
      el('thead', {}, [el('tr', {}, [el('th', { text: t('invoice_no') }), el('th', { text: t('customer_name') }),
        el('th', { text: t('total') }), el('th', { text: t('gaming') }), el('th', { text: t('status') }),
        el('th', { text: t('date') }), el('th', { text: t('actions') })])]),
      tbody
    ])])
  ]);
  root.appendChild(card);
  draw(invoices);
}
