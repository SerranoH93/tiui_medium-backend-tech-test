CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  folio TEXT UNIQUE NOT NULL,
  recipient_name TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_route', 'delivered', 'cancelled', 'paid')),
  total_amount NUMERIC NOT NULL,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  incident_reported BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_webhook_logs (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  folio TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  previous_status TEXT NULL,
  new_status TEXT NOT NULL,
  source TEXT NOT NULL,
  external_reference TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
