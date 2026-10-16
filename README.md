# भारत स्टोर्स / Bharat Stores

Shop app for billing, stock, prices, udhaar (credit) and WhatsApp orders.
Works on any phone browser (Hindi + English) and can be added to the home screen like an app.

* Design & architecture: [docs/DESIGN.md](docs/DESIGN.md)
* WhatsApp setup: [docs/WHATSAPP.md](docs/WHATSAPP.md)
* Printer (which one, how to connect): [docs/PRINTER.md](docs/PRINTER.md)
* Database tables: [db/schema.sql](db/schema.sql)

## How the shop uses it

| Who | What they do |
|-----|--------------|
| **Owner (outside the shop)** | Home → **+ नया बिल** → choose customer → add items → payment (नकद / UPI / उधार / थोड़ा जमा) → Save. |
| **Staff at the shop** | Turn on **new order alerts** once on the shop phone (banner at the top, or menu → alerts). Every new bill rings the phone like a message, even when locked. Tap it → **प्रिंट** → pack → **पैक हो गया** → deliver → **दे दिया**. As a backup the app also checks every 10 minutes (not 11 PM–9 AM, changeable in Settings) and whenever it is opened. |
| **Customer pays udhaar** | Customers → customer → **पैसे मिले** → amount → Save. |
| **Change prices** (owner) | Products → **₹ भाव बदलें** → edit prices → Save. Every change is kept in history. |
| **Update many prices from Excel** (owner) | Products → **⬆️ रेट लिस्ट अपलोड** → download the current list → change prices / add rows in Excel → upload (.xlsx or .csv) → check the preview → **बदलाव लागू करें**. Rows are matched by ID, else by English name. |
| **Hindi names** | Type the English name; the Hindi name fills itself (dictionary of grocery words + phonetic spelling). Correct it if needed. "बाकी हिंदी नाम भरें" fills old products. |
| **Grams** | On a bill, tap **ग्राम** next to a KG item and type 300 for 300 g (same for ml). |
| **"₹30 ki cheeni"** | Tap **₹** next to a KG item and type the money; the weight is worked out. |
| **Small quantity charge** | KG items of 250 g or less cost ₹4/kg more (both changeable in Settings). Applies to "by ₹" too. |
| **Change a line amount** | Type a different amount in the line's ₹ box (owner; staff only if allowed). The weight stays the same; it is marked and logged. |
| **Special rates** | On a bill, the rate box can be changed (owner; staff only if allowed in Settings). **पुराने भाव लगाएं** uses the rate this customer paid on their most recent bill for each item. |
| **Goods arrive** | Products → item → **माल आया** → quantity. |
| **Old notebook dues** (owner) | Customer → **बकाया सुधारें / पुराना उधार** → + amount → reason. |
| **Who did what** (owner) | More → **रिकॉर्ड (ऑडिट)**. |

First visit after deployment: open `/setup` to create the owner login (username + 4–6 digit PIN).
Then add staff from **More → स्टाफ़ / यूज़र**.

Printing: see [docs/PRINTER.md](docs/PRINTER.md). Recommended: a WiFi laser printer and the
**A4 · 2 कॉपी** print size (customer copy + shop copy; udhaar bills get a signature line).

## Tech

Next.js 15 (React, server actions) · Tailwind CSS · Neon Postgres (`@neondatabase/serverless` over HTTPS) ·
PIN login with bcrypt + signed cookie (`jose`) · Hosted on Vercel (region `sin1`).

## Run locally

```bash
cp .env.example .env.local   # fill DATABASE_URL and SESSION_SECRET
npm install
npm run dev                  # http://localhost:3000
```

Database setup: run `db/schema.sql` once on the database (it is safe to run again).

## Environment variables

| Name | Needed | What |
|------|--------|------|
| `DATABASE_URL` | yes | Neon pooled connection string |
| `SESSION_SECRET` | optional | Random string for signing logins (`openssl rand -hex 32`); derived from `DATABASE_URL` if unset |
| `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | optional | WhatsApp Cloud API webhook |
