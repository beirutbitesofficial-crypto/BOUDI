// UI helpers: DOM builder, formatting, toast, modal
import { getLang, t } from './i18n.js?v=20260912-mobile';

let currency = 'LBP';
let usdRate = 89500;
export function setCurrency(c) { currency = c === 'USD' ? 'USD' : 'LBP'; localStorage.setItem('display_currency',currency); }
export function getCurrency() { return currency; }
export function setExchangeRate(rate) { const n=Number(rate); if(n>0)usdRate=n; }

// Format money (no decimals for LBP-style large numbers)
export function money(n) {
  n = Number(n) || 0;
  if (currency === 'USD') n /= usdRate;
  const decimals = currency === 'USD' ? 2 : 0;
  const s = n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `\u2066${s} ${currency==='LBP'&&getLang()==='ar'?'ل.ل.':currency}\u2069`;
}

export function num(n) {
  return (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function fmtDate(iso) {
  if (!iso) return '';
  // SQLite stores UTC; convert to local
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'));
  return d.toLocaleString(getLang() === 'ar' ? 'ar-EG' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function fmtDay(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'));
  return d.toLocaleDateString(getLang() === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Tiny DOM builder: el('div.class#id', {attrs}, [children])
export function el(tag, props = {}, children = []) {
  let tagName = 'div', id = null;
  const classes = [];
  tagName = (tag.match(/^[a-z0-9]+/i) || ['div'])[0];
  tag.replace(/\.([a-z0-9_-]+)/gi, (_, c) => classes.push(c));
  const idm = tag.match(/#([a-z0-9_-]+)/i); if (idm) id = idm[1];
  const node = document.createElement(tagName);
  if (classes.length) node.className = classes.join(' ');
  if (id) node.id = id;
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v);
  }
  const kids = Array.isArray(children) ? children : [children];
  kids.forEach(c => { if (c === null || c === undefined || c === false) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
  return node;
}

export function toast(msg, type = 'success') {
  const wrap = document.getElementById('toast-wrap');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = t(msg);
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 250); }, 2800);
}

export function modal({ title, body, footer, wide }) {
  const root = document.getElementById('modal-root');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const m = document.createElement('div');
  m.className = 'modal' + (wide ? ' wide' : '');
  const head = document.createElement('div');
  head.className = 'modal-head';
  head.innerHTML = `<h3></h3><button class="modal-close">✕</button>`;
  head.querySelector('h3').textContent = title || '';
  const bodyEl = document.createElement('div');
  bodyEl.className = 'modal-body';
  if (typeof body === 'string') bodyEl.innerHTML = body; else bodyEl.appendChild(body);
  m.appendChild(head); m.appendChild(bodyEl);
  if (footer) { const f = document.createElement('div'); f.className = 'modal-foot';
    (Array.isArray(footer) ? footer : [footer]).forEach(b => f.appendChild(b)); m.appendChild(f); }
  overlay.appendChild(m);
  root.appendChild(overlay);
  const close = () => overlay.remove();
  head.querySelector('.modal-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  return { overlay, close, bodyEl };
}

export function confirmDialog(message, onConfirm) {
  const yes = el('button.btn.btn-danger', { text: t('yes') });
  const no = el('button.btn.btn-ghost', { text: t('no') });
  const { close } = modal({ title: t('confirm_delete'), body: el('p', { text: message, style: 'color:var(--muted);line-height:1.6' }), footer: [no, yes] });
  no.addEventListener('click', close);
  yes.addEventListener('click', () => { close(); onConfirm(); });
}

export function statCard({ label, value, sub, tint, icon }) {
  return el(`div.card.stat-card.${tint || 'tint-orange'}`, {}, [
    el('div.stat-ico', { text: icon || '💰' }),
    el('div.stat-label', { text: label }),
    el('div.stat-value', { text: value }),
    sub ? el('div.stat-sub', { text: sub }) : null
  ]);
}

export function badge(text, cls) { return el(`span.badge.${cls}`, { text }); }

export function spinner() {
  return el('div.empty-state', {}, [el('div', { text: t('loading') })]);
}
