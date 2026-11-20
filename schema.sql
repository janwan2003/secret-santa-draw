-- Hatdraw (secret-santa-draw) D1 schema
CREATE TABLE IF NOT EXISTS exchanges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  budget TEXT NOT NULL DEFAULT '',
  event_date TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',      -- open | drawn
  revealed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  drawn_at INTEGER
);
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  exchange_id TEXT NOT NULL,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  wishlist TEXT NOT NULL DEFAULT '',
  is_organizer INTEGER NOT NULL DEFAULT 0,
  participates INTEGER NOT NULL DEFAULT 1,
  giftee_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS members_ex ON members(exchange_id);
CREATE UNIQUE INDEX IF NOT EXISTS members_tok ON members(token_hash);
CREATE TABLE IF NOT EXISTS exclusions (
  exchange_id TEXT NOT NULL,
  a_id TEXT NOT NULL,
  b_id TEXT NOT NULL,
  PRIMARY KEY (exchange_id, a_id, b_id)
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exchange_id TEXT NOT NULL,
  santa_id TEXT NOT NULL,
  giftee_id TEXT NOT NULL,
  from_santa INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_pair ON messages(santa_id, giftee_id);
CREATE INDEX IF NOT EXISTS messages_ex ON messages(exchange_id);
CREATE TABLE IF NOT EXISTS rate (
  k TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);
