-- Bharat Stores database schema (PostgreSQL / Neon)
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  username    TEXT NOT NULL UNIQUE,
  pin_hash    TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Login lockout after repeated wrong PINs
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_logins INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS customers (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT,
  address     TEXT,
  area        TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers (phone);

CREATE TABLE IF NOT EXISTS products (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  name_hi       TEXT,
  category      TEXT,
  unit          TEXT NOT NULL DEFAULT 'pcs',
  price         NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_price    NUMERIC(12,2),
  stock         NUMERIC(12,3) NOT NULL DEFAULT 0,
  low_stock_at  NUMERIC(12,3) NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_history (
  id          SERIAL PRIMARY KEY,
  product_id  INT NOT NULL REFERENCES products(id),
  old_price   NUMERIC(12,2),
  new_price   NUMERIC(12,2) NOT NULL,
  changed_by  INT REFERENCES users(id),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS price_history_product_idx ON price_history (product_id, changed_at DESC);

CREATE TABLE IF NOT EXISTS bills (
  id            SERIAL PRIMARY KEY,
  bill_no       SERIAL UNIQUE,
  customer_id   INT REFERENCES customers(id),
  cust_name     TEXT,
  cust_phone    TEXT,
  cust_address  TEXT,
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'packed', 'delivered', 'cancelled')),
  delivery      TEXT NOT NULL DEFAULT 'pickup' CHECK (delivery IN ('pickup', 'home')),
  subtotal      NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid          NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_mode  TEXT NOT NULL DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'upi', 'credit', 'partial')),
  source        TEXT NOT NULL DEFAULT 'shop' CHECK (source IN ('shop', 'whatsapp')),
  notes         TEXT,
  created_by    INT REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_by  INT REFERENCES users(id),
  delivered_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS bills_status_idx ON bills (status, created_at DESC);
CREATE INDEX IF NOT EXISTS bills_customer_idx ON bills (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bills_created_idx ON bills (created_at DESC);

CREATE TABLE IF NOT EXISTS bill_items (
  id          SERIAL PRIMARY KEY,
  bill_id     INT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  product_id  INT REFERENCES products(id),
  name        TEXT NOT NULL,
  name_hi     TEXT,
  unit        TEXT NOT NULL,
  qty         NUMERIC(12,3) NOT NULL,
  price       NUMERIC(12,2) NOT NULL,
  amount      NUMERIC(12,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS bill_items_bill_idx ON bill_items (bill_id);

CREATE TABLE IF NOT EXISTS stock_moves (
  id          SERIAL PRIMARY KEY,
  product_id  INT NOT NULL REFERENCES products(id),
  qty         NUMERIC(12,3) NOT NULL,
  reason      TEXT NOT NULL CHECK (reason IN ('sale', 'purchase', 'adjust', 'cancel', 'opening')),
  bill_id     INT REFERENCES bills(id),
  note        TEXT,
  created_by  INT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_moves_product_idx ON stock_moves (product_id, created_at DESC);

-- Customer khata. amount > 0 means the customer owes more, amount < 0 means they paid.
-- Rows are never updated or deleted; corrections are new rows.
CREATE TABLE IF NOT EXISTS ledger (
  id           SERIAL PRIMARY KEY,
  customer_id  INT NOT NULL REFERENCES customers(id),
  kind         TEXT NOT NULL CHECK (kind IN ('bill', 'payment', 'adjust')),
  amount       NUMERIC(12,2) NOT NULL,
  bill_id      INT REFERENCES bills(id),
  mode         TEXT,
  note         TEXT,
  created_by   INT REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ledger_customer_idx ON ledger (customer_id, created_at);

CREATE TABLE IF NOT EXISTS wa_messages (
  id           SERIAL PRIMARY KEY,
  wa_id        TEXT UNIQUE,
  from_phone   TEXT,
  from_name    TEXT,
  body         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'done', 'ignored')),
  bill_id      INT REFERENCES bills(id),
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wa_messages_status_idx ON wa_messages (status, received_at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id),
  action      TEXT NOT NULL,
  entity      TEXT,
  entity_id   INT,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC);

INSERT INTO settings (key, value) VALUES
  ('shop_name', 'Bharat Stores'),
  ('shop_name_hi', 'भारत स्टोर्स'),
  ('shop_address', ''),
  ('shop_phone', ''),
  ('gstin', ''),
  ('bill_footer', 'धन्यवाद! फिर पधारें।')
ON CONFLICT (key) DO NOTHING;
