CREATE TABLE IF NOT EXISTS subscriptions (
  email TEXT PRIMARY KEY,
  stripe_customer_id TEXT,
  is_active INTEGER DEFAULT 0,
  updated_at INTEGER
);
