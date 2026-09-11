import { api } from '../api.js';
import { t } from '../i18n.js';
import { el, statCard, money, fmtDay, badge, toast, modal, confirmDialog } from '../ui.js';

const CATS = ['electricity', 'internet', 'rent', 'maintenance', 'other'];

export async function renderExpenses(root) {
  let expenses = await api.get('/expenses');

  function total() { return expenses.reduce((s, e) => s + e.amount, 0); }

  const stats = el('div.grid.stats-grid', {}, [
    statCard({ label: t('total_expenses'), value: money(total()), tint: 'tint-red', icon: '💡' })
  ]);

  const tbody = el('tbody', {});
  function draw() {
    tbody.innerHTML = '';
    if (!expenses.length) { tbody.appendChild(el('tr', {}, [el('td', { colspan: 5, class: 'muted', text: t('no_data') })])); return; }
    expenses.forEach(e => {
      tbody.appendChild(el('tr', {}, [
        el('td', {}, [badge(t(e.category) || e.category, 'badge-orange')]),
        el('td', { text: e.description || '-' }),
        el('td', {}, [el('b', { text: money(e.amount) })]),
        el('td.muted', { text: fmtDay(e.expense_date) }),
        el('td', {}, [el('div.list-actions', {}, [
          el('button.btn.btn-sm.btn-blue', { text: t('edit'), onclick: () => openForm(e) }),
          el('button.btn.btn-sm.btn-danger', { text: t('delete'), onclick: () => del(e) })
        ])])
      ]));
    });
    stats.querySelector('.stat-value').textContent = money(total());
  }

  async function reload() { expenses = await api.get('/expenses'); draw(); }

  async function del(e) {
    confirmDialog(t('confirm_delete'), async () => { await api.del('/expenses/' + e.id); toast(t('delete'), 'success'); reload(); });
  }

  function openForm(e) {
    const cat = el('select', {}, CATS.map(c => el('option', { value: c, selected: e && e.category === c ? 'selected' : null, text: t(c) })));
    const desc = el('input', { value: e ? (e.description || '') : '' });
    const amount = el('input', { type: 'number', min: '0', value: e ? e.amount : '' });
    const date = el('input', { type: 'date', value: e ? e.expense_date : new Date().toISOString().slice(0, 10) });
    const save = el('button.btn.btn-primary', { text: t('save') });
    const cancel = el('button.btn.btn-ghost', { text: t('cancel') });
    const body = el('div', {}, [
      el('div.form-row', {}, [el('label', { text: t('category') }), cat]),
      el('div.form-row', {}, [el('label', { text: t('description') }), desc]),
      el('div.form-grid', {}, [
        el('div.form-row', {}, [el('label', { text: t('amount') }), amount]),
        el('div.form-row', {}, [el('label', { text: t('date') }), date])
      ])
    ]);
    const m = modal({ title: e ? t('edit') : t('add_expense'), body, footer: [cancel, save] });
    cancel.addEventListener('click', m.close);
    save.addEventListener('click', async () => {
      if (!amount.value) { toast(t('required_field'), 'error'); return; }
      const payload = { category: cat.value, description: desc.value, amount: Number(amount.value), expense_date: date.value };
      if (e) await api.put('/expenses/' + e.id, payload); else await api.post('/expenses', payload);
      m.close(); toast(t('save'), 'success'); reload();
    });
  }

  const card = el('div.card', { style: 'margin-top:18px' }, [
    el('div.toolbar', {}, [el('div.spacer', {}),
      el('button.btn.btn-primary', { text: '➕ ' + t('add_expense'), onclick: () => openForm(null) })]),
    el('div.table-wrap', {}, [el('table', {}, [
      el('thead', {}, [el('tr', {}, [el('th', { text: t('category') }), el('th', { text: t('description') }),
        el('th', { text: t('amount') }), el('th', { text: t('date') }), el('th', { text: t('actions') })])]),
      tbody
    ])])
  ]);
  root.appendChild(stats);
  root.appendChild(card);
  draw();
}
