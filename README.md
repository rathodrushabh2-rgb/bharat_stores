# भारत स्टोर्स / Bharat Stores

Shop app for billing, stock, prices, udhaar (credit) and WhatsApp orders.
Works on any phone browser (Hindi + English) and can be added to the home screen like an app.

* Design & architecture: [docs/DESIGN.md](docs/DESIGN.md)
* WhatsApp setup: [docs/WHATSAPP.md](docs/WHATSAPP.md)
* Database tables: [db/schema.sql](db/schema.sql)

## How the shop uses it

| Who | What they do |
|-----|--------------|
| **Owner (outside the shop)** | Home → **+ नया बिल** → choose customer → add items → payment (नकद / UPI / उधार / थोड़ा जमा) → Save. |
| **Staff at the shop** | Keep the app open on the shop phone or PC. A new bill **beeps** and shows *नया ऑर्डर आया है!* → open it → **प्रिंट** (Hindi bill) → pack → **पैक हो गया** → deliver → **दे दिया**. |
| **Customer pays udhaar** | Customers → customer → **पैसे मिले** → amount → Save. |
| **Change prices** (owner) | Products → **₹ भाव बदलें** → edit prices → Save. Every change is kept in history. |
| **Goods arrive** | Products → item → **माल आया** → quantity. |
| **Old notebook dues** (owner) | Customer → **बकाया सुधारें / पुराना उधार** → + amount → reason. |
| **Who did what** (owner) | More → **रिकॉर्ड (ऑडिट)**. |

First visit after deployment: open `/setup` to create the owner login (username + 4–6 digit PIN).
Then add staff from **More → स्टाफ़ / यूज़र**.

Printing: the print page supports 58mm/80mm thermal printers and A5/A4 paper. On Android, a Bluetooth
thermal printer works through its print-service app (e.g. "RawBT") using the normal Print button.

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
| `SESSION_SECRET` | yes | 64-character random string (`openssl rand -hex 32`) |
| `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | optional | WhatsApp Cloud API webhook |
