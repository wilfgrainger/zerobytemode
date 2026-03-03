CREATE TABLE IF NOT EXISTS subscriptions (
  email TEXT PRIMARY KEY,
  stripe_customer_id TEXT,
  is_active INTEGER DEFAULT 0,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS login_tokens (
  email TEXT NOT NULL,
  token TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
