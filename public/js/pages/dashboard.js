import { api } from '../api.js?v=20260912-i18n';
import { t, getLang } from '../i18n.js?v=20260912-i18n';
import { el, statCard, money, num, fmtDate, badge } from '../ui.js?v=20260912-i18n';

export async function renderDashboard(root) {
  const d = await api.get('/dashboard');

  if (d.cashier_limited) {
    root.appendChild(el('div.grid.stats-grid', {}, [
      statCard({ label: t('todays_sales'), value: money(d.sales), tint: 'tint-orange', icon: '💰' })
    ]));
    return;
  }

  const stats = el('div.grid.stats-grid', {}, [
    statCard({ label: t('todays_sales'), value: money(d.sales), tint: 'tint-orange', icon: '💰' }),
    statCard({ label: t('todays_profit'), value: money(d.profit), tint: 'tint-green', icon: '📈' }),
    statCard({ label: t('customers_today'), value: num(d.customers), tint: 'tint-blue', icon: '👥' }),
    statCard({ label: t('games_sold_today'), value: num(d.games_sold), tint: 'tint-blue', icon: '🎮' }),
    statCard({ label: t('product_revenue'), value: money(d.product_revenue), tint: 'tint-orange', icon: '📦' }),
    statCard({ label: t('gaming_revenue'), value: money(d.gaming_revenue), tint: 'tint-blue', icon: '🕹️' }),
    statCard({ label: t('outstanding_debts'), value: money(d.outstanding_debts), tint: 'tint-red', icon: '💳' }),
    statCard({ label: t('invoices_count'), value: num(d.invoices), tint: 'tint-yellow', icon: '🧾' })
  ]);

  // Charts row
  const trendCard = el('div.card', {}, [
    el('div.card-title', { text: t('sales_trend') }),
    el('div.chart-box', {}, [el('canvas', { id: 'trend-chart' })])
  ]);
  const revCard = el('div.card', {}, [
    el('div.card-title', { text: `${t('product_revenue')} / ${t('gaming_revenue')}` }),
    el('div.chart-box', {}, [el('canvas', { id: 'rev-chart' })])
  ]);
  const chartsRow = el('div.grid.dashboard-charts-row', {}, [trendCard, revCard]);

  // Best selling
  const bestRows = d.best_selling.length ? d.best_selling.map(b => el('tr', {}, [
    el('td', {}, [el('b', { text: getLang() === 'ar' ? (b.name) : b.name }),
      b.type === 'gaming' ? badge(' ' + t('gaming'), 'badge-blue') : null]),
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

  // Low stock
  const lowRows = d.low_stock.length ? d.low_stock.map(l => el('tr', {}, [
    el('td', { text: l.name }),
    el('td', {}, [l.stock <= 0 ? badge(t('out_of_stock'), 'badge-red') : badge(num(l.stock), 'badge-yellow')]),
    el('td.text-right', { text: num(l.min_stock) })
  ])) : [el('tr', {}, [el('td', { colspan: 3, class: 'muted', text: t('no_low_stock') })])];

  const lowCard = el('div.card', {}, [
    el('div.card-title', { text: '⚠️ ' + t('low_stock_alerts') }),
    el('div.table-wrap', {}, [el('table', {}, [
      el('thead', {}, [el('tr', {}, [el('th', { text: t('name') }), el('th', { text: t('stock') }), el('th.text-right', { text: t('min_stock') })])]),
      el('tbody', {}, lowRows)
    ])])
  ]);

  const midRow = el('div.two-col', {}, [bestCard, lowCard]);

  // Recent transactions
  const recRows = d.recent.length ? d.recent.map(r => el('tr', {}, [
    el('td', { text: r.invoice_no }),
    el('td', { text: r.customer_name }),
    el('td', { text: money(r.total) }),
    el('td', {}, [r.payment_status === 'paid' ? badge(t('paid'), 'badge-green') : badge(t('unpaid'), 'badge-red')]),
    el('td.muted', { text: fmtDate(r.created_at) })
  ])) : [el('tr', {}, [el('td', { colspan: 5, class: 'muted', text: t('no_data') })])];

  const recentCard = el('div.card.dashboard-recent-card', {}, [
    el('div.card-title', { text: '🧾 ' + t('recent_transactions') }),
    el('div.table-wrap', {}, [el('table', {}, [
      el('thead', {}, [el('tr', {}, [el('th', { text: t('invoice_no') }), el('th', { text: t('customer_name') }),
        el('th', { text: t('total') }), el('th', { text: t('status') }), el('th', { text: t('date') })])]),
      el('tbody', {}, recRows)
    ])])
  ]);

  root.appendChild(stats);
  const wrap = el('div.dashboard-wrap', {}, [chartsRow, midRow, recentCard]);
  root.appendChild(wrap);

  // Draw charts
  const gridColor = 'rgba(255,255,255,0.06)';
  const labels = d.trend.map(x => x.day.slice(5));
  const trendCanvas = root.querySelector('#trend-chart');
  const revCanvas = root.querySelector('#rev-chart');
  if (!trendCanvas || !revCanvas || !window.Chart) return;
  requestAnimationFrame(() => {
  Chart.getChart(trendCanvas)?.destroy(); Chart.getChart(revCanvas)?.destroy();
  new Chart(trendCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: t('total_sales'), data: d.trend.map(x => x.sales), borderColor: '#ff7a1a', backgroundColor: 'rgba(255,122,26,.15)', fill: true, tension: .35 },
        { label: t('total_profit'), data: d.trend.map(x => x.profit), borderColor: '#2f7bff', backgroundColor: 'rgba(47,123,255,.12)', fill: true, tension: .35 }
      ]
    },
    options: chartOpts(gridColor)
  });

  new Chart(revCanvas, {
    type: 'doughnut',
    data: {
      labels: [t('product_revenue'), t('gaming_revenue')],
      datasets: [{ data: [d.product_revenue || 0, d.gaming_revenue || 0], backgroundColor: ['#ff7a1a', '#2f7bff'], borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#8b93a7' }, position: 'bottom' } } }
  });
  });
}

function chartOpts(gridColor) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#8b93a7' } } },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: '#616a80' } },
      y: { grid: { color: gridColor }, ticks: { color: '#616a80' } }
    }
  };
}
