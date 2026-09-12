import { api } from '../api.js?v=20260912-i18n';
import { t } from '../i18n.js?v=20260912-i18n';
import { el, statCard, money, num, fmtDate, badge, toast, modal, confirmDialog } from '../ui.js?v=20260912-i18n';
import { state } from '../app.js?v=20260912-i18n';

export async function renderDebtors(root) {
  let debtors = await api.get('/debtors');
  const summary = await api.get('/debtors/summary');

  const stats = el('div.grid.stats-grid', {}, [
    statCard({ label: t('outstanding_debts'), value: money(summary.outstanding), tint: 'tint-red', icon: '💳' }),
    statCard({ label: t('debtors'), value: num(summary.count), tint: 'tint-yellow', icon: '👥' })
  ]);

  let filterStatus = 'all';
  const searchInput = el('input', { placeholder: t('search'), 'data-i18n-ph': 'search' });
  const tabs = el('div.pill-tabs', {});
  function tab(v, label) {
    const btn = el(`button${filterStatus === v ? '.active' : ''}`, { text: label });
    btn.addEventListener('click', () => {
      filterStatus = v;
      tabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      draw();
    });
    return btn;
  }
  ['all', 'unpaid', 'partial'].forEach(v => tabs.appendChild(tab(v, t(v))));

  const tbody = el('tbody', {});
  function draw() {
    tbody.innerHTML = '';
    const q = searchInput.value.trim().toLowerCase();
    let list = debtors.filter(d => (!q || `${d.customer_name} ${d.phone || ''}`.toLowerCase().includes(q)));
    if (filterStatus !== 'all') list = list.filter(d => d.status === filterStatus);
    if (!list.length) { tbody.appendChild(el('tr', {}, [el('td', { colspan: 7, class: 'muted', text: t('no_data') })])); return; }
    list.forEach(d => {
      const remaining = d.amount - d.paid_amount;
      tbody.appendChild(el('tr', {}, [
        el('td', {}, [el('b', { text: d.customer_name })]),
        el('td', { text: d.phone || '-' }),
        el('td', { text: money(d.amount) }),
        el('td', { text: money(d.paid_amount) }),
        el('td', {}, [remaining > 0 ? el('span.text-red', { text: money(remaining) }) : el('span.text-green', { text: money(0) })]),
        el('td', {}, [statusBadge(d.status)]),
        el('td', {}, [el('div.list-actions', {}, [
          d.status !== 'paid' ? el('button.btn.btn-sm.btn-green', { text: '💵 ' + t('pay'), onclick: () => payDebt(d) }) : null,
          d.phone ? el('button.btn.btn-sm.whatsapp-btn', { text: 'WhatsApp', onclick: () => sendWhatsApp(d) }) : null,
          el('button.btn.btn-sm', { text: t('Edit'), onclick: () => editDebtor(d) }),
          el('button.btn.btn-sm.btn-blue', { text: t('view'), onclick: () => viewDebt(d) }),
          state.user.role !== 'cashier' ? el('button.btn.btn-sm.btn-danger', { text: t('delete'), onclick: () => del(d) }) : null
        ])])
      ]));
    });
  }
  searchInput.addEventListener('input', draw);

  async function reload() { debtors = await api.get('/debtors'); draw(); }

  async function del(d) {
    confirmDialog(t('confirm_delete'), async () => { await api.del('/debtors/' + d.id); toast(t('delete'), 'success'); reload(); });
  }

  function sendWhatsApp(d) {
    const phone = String(d.phone || '').replace(/\D/g, '');
    if (!phone) return toast(t('Add a phone number first'), 'error');
    const remaining = money(d.amount - d.paid_amount);
    const message = `مرحباً ${d.customer_name}، تذكير ودي من BOUDI CAFE. المبلغ المتبقي عليكم هو ${remaining}. شكراً لكم.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }

  function editDebtor(d) {
    const name = el('input', { value: d.customer_name });
    const phone = el('input', { value: d.phone || '', placeholder: '+961 XX XXX XXX' });
    const save = el('button.btn.btn-primary', { text: t('save') });
    const cancel = el('button.btn.btn-ghost', { text: t('cancel') });
    const body = el('div', {}, [
      el('div.form-row', {}, [el('label', { text: t('customer_name') }), name]),
      el('div.form-row', {}, [el('label', { text: t('Phone number') }), phone])
    ]);
    const m = modal({ title: t('Edit debtor'), body, footer: [cancel, save] });
    cancel.addEventListener('click', m.close);
    save.addEventListener('click', async () => {
      if (!name.value.trim()) return toast(t('required_field'), 'error');
      try { await api.put('/debtors/' + d.id, { customer_name: name.value.trim(), phone: phone.value.trim() }); m.close(); toast(t('save'), 'success'); await reload(); }
      catch (e) { toast(e.message, 'error'); }
    });
  }

  function payDebt(d) {
    const remaining = d.amount - d.paid_amount;
    const amount = el('input', { type: 'number', min: '0', value: remaining });
    const notes = el('input', { placeholder: t('notes') });
    const full = el('button.btn.btn-green', { text: t('mark_paid'), onclick: () => { amount.value = remaining; save(); } });
    const save = async () => {
      await api.post(`/debtors/${d.id}/pay`, { amount: Number(amount.value) || 0, notes: notes.value });
      m.close(); toast(t('record_payment'), 'success'); reload();
    };
    const saveBtn = el('button.btn.btn-primary', { text: t('record_payment'), onclick: save });
    const cancel = el('button.btn.btn-ghost', { text: t('cancel') });
    const body = el('div', {}, [
      el('p', { class: 'muted', style: 'margin-bottom:12px', text: `${d.customer_name} — ${t('remaining')}: ${money(remaining)}` }),
      el('div.form-row', {}, [el('label', { text: t('amount') }), amount]),
      el('div.form-row', {}, [el('label', { text: t('notes') }), notes])
    ]);
    const m = modal({ title: t('record_payment'), body, footer: [cancel, full, saveBtn] });
    cancel.addEventListener('click', m.close);
  }

  async function viewDebt(d) {
    const full = await api.get('/debtors/' + d.id);
    const rows = (full.payments || []).map(p => el('tr', {}, [
      el('td', { text: money(p.amount) }), el('td', { text: p.notes || '-' }), el('td.muted', { text: fmtDate(p.created_at) })
    ]));
    const body = el('div', {}, [
      el('div.card', { style: 'background:var(--bg-2);margin-bottom:14px' }, [
        line(t('customer_name'), full.customer_name),
        line(t('Phone number'), full.phone || '-'),
        line(t('debt_amount'), money(full.amount)),
        line(t('paid_amount'), money(full.paid_amount)),
        line(t('remaining'), money(full.amount - full.paid_amount)),
        line(t('date'), fmtDate(full.created_at))
      ]),
      el('div.card-title', { text: t('payment_history') }),
      el('div.table-wrap', {}, [el('table', {}, [
        el('thead', {}, [el('tr', {}, [el('th', { text: t('amount') }), el('th', { text: t('notes') }), el('th', { text: t('date') })])]),
        el('tbody', {}, rows.length ? rows : [el('tr', {}, [el('td', { colspan: 3, class: 'muted', text: t('no_data') })])])
      ])])
    ]);
    const closeBtn = el('button.btn.btn-ghost', { text: t('close') });
    const m = modal({ title: full.customer_name, body, footer: [closeBtn] });
    closeBtn.addEventListener('click', m.close);
  }
  function line(k, v) { return el('div.cart-total-row', {}, [el('span.muted', { text: k }), el('b', { text: v })]); }

  function addDebtor() {
    const name = el('input', {});
    const phone = el('input', { placeholder: '+961 XX XXX XXX' });
    const amount = el('input', { type: 'number', min: '0', value: '0' });
    const notes = el('input', {});
    const save = el('button.btn.btn-primary', { text: t('save') });
    const cancel = el('button.btn.btn-ghost', { text: t('cancel') });
    const body = el('div', {}, [
      el('div.form-row', {}, [el('label', { text: t('customer_name') }), name]),
      el('div.form-row', {}, [el('label', { text: t('Phone number') }), phone]),
      el('div.form-row', {}, [el('label', { text: t('debt_amount') }), amount]),
      el('div.form-row', {}, [el('label', { text: t('notes') }), notes])
    ]);
    const m = modal({ title: t('add_debtor'), body, footer: [cancel, save] });
    cancel.addEventListener('click', m.close);
    save.addEventListener('click', async () => {
      if (!name.value.trim()) { toast(t('required_field'), 'error'); return; }
      await api.post('/debtors', { customer_name: name.value.trim(), phone: phone.value.trim(), amount: Number(amount.value) || 0, notes: notes.value });
      m.close(); toast(t('save'), 'success'); reload();
    });
  }

  const card = el('div.card', { style: 'margin-top:18px' }, [
    el('div.toolbar', {}, [el('div.search-box', {}, [searchInput]), tabs, el('div.spacer', {}),
      el('button.btn.btn-primary', { text: '➕ ' + t('add_debtor'), onclick: addDebtor })]),
    el('div.table-wrap', {}, [el('table', {}, [
      el('thead', {}, [el('tr', {}, [el('th', { text: t('customer_name') }), el('th', { text: t('Phone number') }), el('th', { text: t('debt_amount') }),
        el('th', { text: t('paid_amount') }), el('th', { text: t('remaining') }), el('th', { text: t('status') }), el('th', { text: t('actions') })])]),
      tbody
    ])])
  ]);
  root.appendChild(stats);
  root.appendChild(card);
  draw();
}

function statusBadge(s) {
  if (s === 'paid') return badge(t('paid'), 'badge-green');
  if (s === 'partial') return badge(t('partial'), 'badge-yellow');
  return badge(t('unpaid'), 'badge-red');
}
