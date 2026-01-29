PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS listings;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE listings (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('sale','rental')),
  type TEXT NOT NULL,
  city TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','sold')),
  price INTEGER NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms INTEGER NOT NULL
);

CREATE INDEX idx_listings_kind ON listings(kind);
CREATE INDEX idx_listings_city ON listings(city);
CREATE INDEX idx_listings_price ON listings(price);
