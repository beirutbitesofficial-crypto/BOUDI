import { api } from '../api.js?v=20260912-mobile';
import { t, getLang } from '../i18n.js?v=20260912-mobile';
import { el, statCard, money, num, fmtDate, badge, toast } from '../ui.js?v=20260912-mobile';
import { state } from '../app.js?v=20260912-mobile';

export async function renderReports(root) {
  let period = 'daily';
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const year = today.slice(0, 4);

  const dateInput = el('input', { type: 'date', value: today });
  const monthInput = el('input', { type: 'month', value: month });
  const yearInput = el('input', { type: 'number', min: '2020', max: '2100', value: year, style: 'width:110px' });

  const tabs = el('div.pill-tabs', {});
  ['daily', 'monthly', 'yearly'].forEach(p => {
    const b = el(`button${p === 'daily' ? '.active' : ''}`, { text: t(p) });
    b.addEventListener('click', () => { period = p; tabs.querySelectorAll('button').forEach(x => x.classList.remove('active')); b.classList.add('active'); syncInputs(); load(); });
    tabs.appendChild(b);
  });

  function syncInputs() {
    dateInput.style.display = period === 'daily' ? '' : 'none';
    monthInput.style.display = period === 'monthly' ? '' : 'none';
    yearInput.style.display = period === 'yearly' ? '' : 'none';
  }

  const resultWrap = el('div', { style: 'margin-top:18px' });
  let lastData = null;

  function query() {
    if (period === 'daily') return `?period=daily&date=${dateInput.value}`;
    if (period === 'monthly') return `?period=monthly&month=${monthInput.value}`;
    return `?period=yearly&year=${yearInput.value}`;
  }

  async function load() {
    resultWrap.innerHTML = '';
    const data = await api.get('/reports' + query());
    lastData = data;
    render(data);
  }

  [dateInput, monthInput, yearInput].forEach(i => i.addEventListener('change', load));

  function render(d) {
    resultWrap.innerHTML = '';
    const stats = el('div.grid.stats-grid', {}, [
      statCard({ label: t('total_sales'), value: money(d.total_sales), tint: 'tint-orange', icon: '💰' }),
      statCard({ label: t('gross_profit'), value: money(d.gross_profit), tint: 'tint-blue', icon: '📊' }),
      statCard({ label: t('net_profit'), value: money(d.net_profit), sub: `${t('total_expenses')}: ${money(d.expenses_total)}`, tint: 'tint-green', icon: '📈' }),
      statCard({ label: t('product_sales'), value: money(d.product_sales), tint: 'tint-orange', icon: '📦' }),
      statCard({ label: t('gaming_sales'), value: money(d.gaming_sales), sub: `${t('games_sold_today').replace(' Today','').replace(' اليوم','')}: ${num(d.games_sold)}`, tint: 'tint-blue', icon: '🎮' }),
      statCard({ label: t('total_expenses'), value: money(d.expenses_total), tint: 'tint-red', icon: '💡' }),
      statCard({ label: t('outstanding_debts'), value: money(d.outstanding_debts), tint: 'tint-yellow', icon: '💳' }),
      statCard({ label: t('invoices'), value: num(d.invoice_count), tint: 'tint-blue', icon: '🧾' })
    ]);

    // Best selling
    const bestRows = d.best_selling.length ? d.best_selling.map(b => el('tr', {}, [
      el('td', {}, [b.name, b.type === 'gaming' ? badge(' ' + t('gaming'), 'badge-blue') : null]),
      el('td', { text: num(b.qty) }),
      el('td.text-right', { text: money(b.revenue) })
    ])) : [el('tr', {}, [el('td', { colspan: 3, class: 'muted', text: t('no_data') })])];
    const bestCard = el('div.card', {}, [
      el('div.card-title', { text: '🏆 ' + t('best_selling') }),
      el('div.table-wrap', {}, [el('table', {}, [
        el('thead', {}, [el('tr', {}, [el('th', { text: t('name') }), el('th', { text: t('qty_sold') }), el('th.text-right', { text: t('revenue') })])]),
        el('tbody', {}, bestRows)
      ])])
    ]);

    // Expenses breakdown
    const expRows = d.expenses_by_category.length ? d.expenses_by_category.map(e => el('tr', {}, [
      el('td', {}, [badge(t(e.category) || e.category, 'badge-orange')]),
      el('td.text-right', { text: money(e.amount) })
    ])) : [el('tr', {}, [el('td', { colspan: 2, class: 'muted', text: t('no_data') })])];
    const expCard = el('div.card', {}, [
      el('div.card-title', { text: '💡 ' + t('expenses') }),
      el('div.table-wrap', {}, [el('table', {}, [
        el('thead', {}, [el('tr', {}, [el('th', { text: t('category') }), el('th.text-right', { text: t('amount') })])]),
        el('tbody', {}, expRows)
      ])])
    ]);

    resultWrap.appendChild(stats);
    resultWrap.appendChild(el('div.two-col', { style: 'margin-top:18px' }, [bestCard, expCard]));
  }

  const exportPdfBtn = el('button.btn.btn-danger', { text: '📄 ' + t('export_pdf'), onclick: () => exportPDF(lastData) });
  const exportXlsBtn = el('button.btn.btn-green', { text: '📊 ' + t('export_excel'), onclick: () => exportExcel(lastData) });

  const card = el('div.card', {}, [
    el('div.toolbar', {}, [tabs, dateInput, monthInput, yearInput, el('div.spacer', {}), exportPdfBtn, exportXlsBtn])
  ]);
  root.appendChild(card);
  root.appendChild(resultWrap);
  syncInputs();
  await load();
}

function reportRows(d) {
  return [
    [t('report'), d.label],
    [t('total_sales'), d.total_sales],
    [t('product_sales'), d.product_sales],
    [t('gaming_sales'), d.gaming_sales],
    [t('games_sold_today').replace(' Today', '').replace(' اليوم', ''), d.games_sold],
    [t('gross_profit'), d.gross_profit],
    [t('total_expenses'), d.expenses_total],
    [t('net_profit'), d.net_profit],
    [t('outstanding_debts'), d.outstanding_debts],
    [t('invoices'), d.invoice_count]
  ];
}

function exportPDF(d) {
  if (!d) { toast(t('no_data'), 'warn'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const cafe = (state.settings && state.settings.cafe_name) || 'Friend Cafe';
  doc.setFontSize(18); doc.text(cafe, 14, 18);
  doc.setFontSize(12); doc.setTextColor(120);
  doc.text(`${t('report')}: ${d.label}`, 14, 26);
  doc.autoTable({
    startY: 32,
    head: [[t('report'), t('value')]],
    body: reportRows(d).map(r => [r[0], typeof r[1] === 'number' ? r[1].toLocaleString('en-US') : r[1]]),
    theme: 'striped',
    headStyles: { fillColor: [255, 122, 26] }
  });
  if (d.best_selling && d.best_selling.length) {
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 8,
      head: [[t('best_selling'), t('qty_sold'), t('revenue')]],
      body: d.best_selling.map(b => [b.name, b.qty, b.revenue.toLocaleString('en-US')]),
      theme: 'striped',
      headStyles: { fillColor: [47, 123, 255] }
    });
  }
  doc.save(`report-${d.label}.pdf`);
}

function exportExcel(d) {
  if (!d) { toast(t('no_data'), 'warn'); return; }
  const wb = XLSX.utils.book_new();
  const summary = XLSX.utils.aoa_to_sheet([[t('report'), t('value')], ...reportRows(d)]);
  XLSX.utils.book_append_sheet(wb, summary, t('Summary'));
  if (d.best_selling && d.best_selling.length) {
    const best = XLSX.utils.aoa_to_sheet([[t('name'), t('type'), t('qty_sold'), t('revenue')],
      ...d.best_selling.map(b => [b.name, b.type, b.qty, b.revenue])]);
    XLSX.utils.book_append_sheet(wb, best, t('Best Selling'));
  }
  if (d.invoices && d.invoices.length) {
    const inv = XLSX.utils.aoa_to_sheet([[t('invoice_no'), t('customer_name'), t('product_sales'), t('gaming_sales'), t('total'), t('status'), t('date')],
      ...d.invoices.map(i => [i.invoice_no, i.customer_name, i.product_total, i.gaming_total, i.total, i.payment_status, i.created_at])]);
    XLSX.utils.book_append_sheet(wb, inv, t('Invoices'));
  }
  XLSX.writeFile(wb, `report-${d.label}.xlsx`);
}
