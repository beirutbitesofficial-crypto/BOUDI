# BOUDI CAFE POS

A modern, fast, web-based Point of Sale system for **BOUDI CAFE** — products **and** gaming
(sold by quantity, not time). Dark theme with orange + blue accents, full **English / Arabic (RTL)**
support, and a professional dashboard. Runs locally on a laptop (no printer required).

## Features
- **Secure Admin login** with session timeout (default `admin` / `admin123`)
- **Dashboard**: today's sales, profit, customers, games sold, product & gaming revenue,
  outstanding debts, low-stock alerts, best sellers, recent transactions, charts
- **POS**: fast invoicing by customer name, products + gaming, editable qty & price,
  notes, live totals, **Paid / Unpaid** (Unpaid auto-creates a Debtor)
- **Gaming** sold by quantity — unlimited custom items, price editable from Settings/Products,
  reported **separately** from product sales
- **Products**: add / edit / delete, categories, purchase & selling price, stock, min stock, image
- **Inventory**: auto-decrement on sale, inventory value, low/out-of-stock alerts, stock history
- **Debtors**: partial/full payments with full payment history
- **Expenses**: electricity, internet, rent, maintenance, other — deducted from net profit
- **Reports**: daily / monthly / yearly with PDF & Excel export
- **Search**: invoices, customers, products, debtors
- **Settings**: cafe name, logo, currency, default game price, low-stock level, language,
  session timeout, change password, **backup & restore** database
- **Backup**: one-click JSON export / import of all data

## Run

```bash
npm install
npm start
```

Then open **http://localhost:5050** and log in with `admin` / `admin123`.

> Change the default password from **Settings → Security** after first login.
> To use a different port: `PORT=8080 npm start`

## Data & Backup
- All data is stored in a single SQLite file: `data/boudicafe.db`
- Uploaded images: `data/uploads/`
- Use **Settings → Backup** to export/restore a full JSON snapshot, or simply copy the
  `data/` folder.

## Tech
Node.js + Express + better-sqlite3 (backend) · Vanilla JS SPA · Chart.js · jsPDF · SheetJS
