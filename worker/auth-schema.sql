CREATE TABLE IF NOT EXISTS login_tokens (
  email TEXT NOT NULL,
  token TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
