import { api } from '../api.js';
import { t } from '../i18n.js';
import { el, statCard, money, fmtDate, toast, badge } from '../ui.js';

export async function renderShifts(root) {
  let current = await api.get('/shifts/current');
  let history = await api.get('/shifts/history');

  async function reload() {
    current = await api.get('/shifts/current');
    history = await api.get('/shifts/history');
    draw();
  }

  function draw() {
    root.innerHTML = '';
    const shift = current.shift;
    const totals = current.totals || { paidSales: 0, unpaidSales: 0, expenses: 0 };
    root.appendChild(el('div.grid.stats-grid', {}, [
      statCard({ label: t('shift_status'), value: shift ? t('open') : t('closed'), tint: shift ? 'tint-green' : 'tint-red', icon: '🕒' }),
      statCard({ label: t('paid_sales'), value: money(totals.paidSales), tint: 'tint-green', icon: '💵' }),
      statCard({ label: t('sent_to_debtors'), value: money(totals.unpaidSales), tint: 'tint-yellow', icon: '💳' }),
      statCard({ label: t('expected_cash'), value: money(current.expected_cash || 0), tint: 'tint-blue', icon: '🧮' })
    ]));

    root.appendChild(shift ? closeCard(shift) : openCard());
    root.appendChild(historyCard());
  }

  function openCard() {
    const openingCash = el('input', { type: 'number', min: '0', value: '0' });
    const notes = el('textarea', { rows: 2, placeholder: t('notes') });
    const open = async () => {
      await api.post('/shifts/open', { opening_cash: Number(openingCash.value) || 0, notes: notes.value.trim() });
      toast(t('shift_opened'), 'success');
      reload();
    };
    return el('div.card', { style: 'margin-top:18px' }, [
      el('div.card-title', { text: '🔓 ' + t('open_shift') }),
      el('div.form-row', {}, [el('label', { text: t('opening_cash') }), openingCash]),
      el('div.form-row', {}, [el('label', { text: t('notes') }), notes]),
      el('button.btn.btn-primary', { text: t('open_shift'), onclick: open })
    ]);
  }

  function closeCard(shift) {
    const closingCash = el('input', { type: 'number', min: '0', value: current.expected_cash || 0 });
    const notes = el('textarea', { rows: 2, placeholder: t('notes') });
    const close = async () => {
      await api.post('/shifts/close', { closing_cash: Number(closingCash.value) || 0, notes: notes.value.trim() });
      toast(t('shift_closed'), 'success');
      reload();
    };
    return el('div.card', { style: 'margin-top:18px' }, [
      el('div.card-title', { text: '🔒 ' + t('close_shift') }),
      line(t('opened_by'), shift.opened_by_name || '-'),
      line(t('opened_at'), fmtDate(shift.opened_at)),
      line(t('opening_cash'), money(shift.opening_cash)),
      line(t('expected_cash'), money(current.expected_cash || 0)),
      el('div.form-row', {}, [el('label', { text: t('closing_cash') }), closingCash]),
      el('div.form-row', {}, [el('label', { text: t('notes') }), notes]),
      el('button.btn.btn-danger', { text: t('close_shift'), onclick: close })
    ]);
  }

  function historyCard() {
    const rows = history.map(s => el('tr', {}, [
      el('td', { text: s.id }),
      el('td', {}, [s.status === 'open' ? badge(t('open'), 'badge-green') : badge(t('closed'), 'badge-gray')]),
      el('td', { text: s.opened_by_name || '-' }),
      el('td', { text: money(s.opening_cash) }),
      el('td', { text: money(s.expected_cash || 0) }),
      el('td', { text: s.closing_cash === null ? '-' : money(s.closing_cash) }),
      el('td', { text: s.cash_difference === null ? '-' : money(s.cash_difference) }),
      el('td.muted', { text: fmtDate(s.opened_at) })
    ]));
    return el('div.card', { style: 'margin-top:18px' }, [
      el('div.card-title', { text: t('shift_history') }),
      el('div.table-wrap', {}, [el('table', {}, [
        el('thead', {}, [el('tr', {}, [
          el('th', { text: '#' }), el('th', { text: t('status') }), el('th', { text: t('opened_by') }),
          el('th', { text: t('opening_cash') }), el('th', { text: t('expected_cash') }),
          el('th', { text: t('closing_cash') }), el('th', { text: t('difference') }), el('th', { text: t('date') })
        ])]),
        el('tbody', {}, rows.length ? rows : [el('tr', {}, [el('td.muted', { colspan: 8, text: t('no_data') })])])
      ])])
    ]);
  }

  function line(k, v) {
    return el('div.cart-total-row', {}, [el('span.muted', { text: k }), el('b', { text: v })]);
  }

  draw();
}
