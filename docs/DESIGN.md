# Bharat Stores – Shop Management App: Design

A mobile-first web app (works in the phone browser and can be "installed" to the home screen)
for running the shop when the owner is away.

## 1. Problems → Features

| # | Problem today | What the app does |
|---|---------------|-------------------|
| 1 | Owner is outside, nobody at the shop can make bills | Owner creates the bill on his phone. It appears instantly in the **Orders** screen on the shop phone/computer. Staff open it, **print it in Hindi**, pack it, and mark it **Delivered**. |
| 2 | Keeping stock | Every product has a stock count. Selling reduces stock automatically, cancelling a bill puts it back, "Stock In" adds purchased goods. Low-stock list on the home screen. Every change is recorded. |
| 3 | Keeping prices right while away | Only the owner can change prices (from anywhere). Staff can only bill at the current price. Every price change is kept in a history. |
| 4 | Audit of credit (udhaar) bills | Each customer has a **khata (ledger)**: bills add to the due, payments reduce it. Shows the running balance, a list of everyone who owes money, and can send a reminder on WhatsApp. An audit log records who did what and when. |
| 5 | WhatsApp orders (good to have) | a) **Send bill on WhatsApp** with one tap (free, no setup). b) **WhatsApp Inbox**: orders arrive automatically once the WhatsApp Business Cloud API is connected, or staff can paste a message in. Each order can be turned into a bill. |
| 6 | Customer name & address | Customer book with name, phone, address, area, and notes. Search by name or phone while billing. |

## 2. Users & roles

| Role | Can do |
|------|--------|
| **Owner** (Malik) | Everything: bills, products, prices, stock, customers, payments, staff accounts, audit log, settings |
| **Staff** | See bills, print, mark packed/delivered, create bills (at the fixed price only, no discount), add customers, record payments received, record goods received (Stock In). **Cannot** change prices, correct stock counts, cancel bills, see the audit log, or manage users. |

Login uses a **username + 4–6 digit PIN** (easy on a phone). The very first visit to `/setup` creates the owner account.

## 3. Architecture

```
 Owner's phone ─┐                         ┌──────────────────────┐
                ├──HTTPS──►  Vercel       │  Neon Postgres (DB)  │
 Shop phone/PC ─┘          (Next.js app)──►  Singapore region    │
 (prints bill)              Singapore     └──────────────────────┘
                                ▲
 WhatsApp Cloud API ──webhook───┘   (optional)
```

* **Frontend + backend:** Next.js 15 (React, App Router, Server Actions), TypeScript, Tailwind CSS.
  One codebase; pages are rendered on the server, so they load fast on cheap phones.
* **Database:** PostgreSQL on **Neon** (managed, free tier, automatic backups/history).
  Accessed via `postgres.js`, using transactions for billing so stock, bill, and ledger never disagree.
* **Hosting:** **Vercel**, auto-deploys on every push to GitHub. Region `sin1` (Singapore), next to the DB and close to India.
* **Auth:** PIN hashed with bcrypt; session in a signed, HTTP-only cookie (JWT via `jose`), valid for 30 days.
* **Language:** Every screen works in Hindi and English (toggle). Products have a Hindi name that is printed on the bill.
* **Live orders at the shop:** The Orders screen refreshes itself every 15 seconds and beeps when a new bill arrives.
* **Printing:** A print page sized for 58mm/80mm thermal printers or A5/A4 paper, using the phone or PC's normal print dialog.

## 4. Database (tables)

```
users            id, name, username, pin_hash, role(owner|staff), active, created_at
settings         key, value                      -- shop name, address, phone, GSTIN, bill footer
customers        id, name, phone, address, area, notes, created_at
products         id, name, name_hi, category, unit, price, cost_price, stock, low_stock_at, active, updated_at
price_history    id, product_id, old_price, new_price, changed_by, changed_at
stock_moves      id, product_id, qty(+/-), reason(sale|purchase|adjust|cancel), bill_id, note, created_by, created_at
bills            id, bill_no, customer_id, cust_name, cust_phone, cust_address,
                 status(new|packed|delivered|cancelled), delivery(pickup|home),
                 subtotal, discount, total, paid, payment_mode(cash|upi|credit|partial),
                 source(shop|whatsapp), notes, created_by, created_at, delivered_by, delivered_at
bill_items       id, bill_id, product_id, name, name_hi, unit, qty, price, amount
ledger           id, customer_id, kind(bill|payment|adjust), amount(+ = owes more, - = paid),
                 bill_id, mode, note, created_by, created_at
wa_messages      id, wa_id, from_phone, from_name, body, status(new|done|ignored), bill_id, received_at
audit_log        id, user_id, action, entity, entity_id, details(json), created_at
```

Customer due = `SUM(ledger.amount)` for that customer. Ledger rows are never edited or deleted; corrections are new rows. That's what makes it auditable.

Full SQL: [`db/schema.sql`](../db/schema.sql).

## 5. Screens (mobile, bottom navigation)

```
┌─────────────────────────┐
│ Bharat Stores   [हि/EN] │
├─────────────────────────┤
│ Today: ₹12,450  (23)    │   Home: today's sales, new orders to pack,
│ To pack: 3   Due: ₹48k  │   total udhaar, low stock
│ ⚠ Low stock: Atta, Dal  │
│ [+ New Bill]            │
├─────────────────────────┤
│ 🏠  🧾  📦  👥  ☰      │   Home · Bills · Products · Customers · More
└─────────────────────────┘
```

* **New Bill:** pick/add customer → search products (Hindi or English) → qty → total → discount →
  payment (Cash / UPI / Udhaar / Partial) → Save. Goes to the shop's Orders list.
* **Bills/Orders:** tabs New · Packed · Delivered · All. Open → Print (Hindi), Mark packed, Delivered, WhatsApp, Cancel (owner).
* **Products:** search, low-stock filter; edit price (owner), Stock In / adjust (owner), price & stock history.
* **Customers:** list with due amount; customer page shows the khata with running balance, Receive Payment, and WhatsApp reminder.
* **More:** Udhaar list, WhatsApp Inbox, Audit Log, Staff, Shop Settings, Language, Logout.

## 6. Build plan

1. Project setup (Next.js, Tailwind), DB schema on Neon
2. Login/roles, setup page, layout and Hindi/English
3. Products, prices, stock
4. Customers and khata (ledger)
5. Billing, orders queue, printing
6. Dashboard, udhaar list, audit log, settings, staff
7. WhatsApp share and inbox/webhook
8. Deploy to Vercel and connect the DB

## 7. Later ideas
Barcode scanning, GST invoices, daily WhatsApp summary to the owner, supplier purchase tracking, offline mode.
