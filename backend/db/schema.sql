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
  state TEXT NOT NULL DEFAULT 'NJ',
  address TEXT,
  description TEXT,
  image_url TEXT,
  status TEXT NOT NULL CHECK(status IN ('active','sold')),
  price INTEGER NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms INTEGER NOT NULL,
  sqft INTEGER,
  year_built INTEGER
);

CREATE INDEX idx_listings_kind ON listings(kind);
CREATE INDEX idx_listings_city ON listings(city);
CREATE INDEX idx_listings_state ON listings(state);
CREATE INDEX idx_listings_price ON listings(price);

-- Subscription Plans
DROP TABLE IF EXISTS subscription_plans;
CREATE TABLE subscription_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  billing_cycle TEXT NOT NULL CHECK(billing_cycle IN ('monthly','annually')),
  price REAL NOT NULL,
  features TEXT NOT NULL -- JSON array of features
);

-- User Subscriptions
DROP TABLE IF EXISTS subscriptions;
CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  plan_id INTEGER,
  status TEXT NOT NULL CHECK(status IN ('trial','active','cancelled','expired')),
  trial_start TEXT NOT NULL DEFAULT (datetime('now')),
  trial_end TEXT NOT NULL DEFAULT (datetime('now', '+30 days')),
  subscription_start TEXT,
  subscription_end TEXT,
  payment_method_added INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

-- Email Reminders Queue
DROP TABLE IF EXISTS email_reminders;
CREATE TABLE email_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  reminder_type TEXT NOT NULL CHECK(reminder_type IN ('trial_7_days','trial_3_days','trial_1_day','trial_expired')),
  scheduled_for TEXT NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Agent Contact Requests
DROP TABLE IF EXISTS agent_requests;
CREATE TABLE agent_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','contacted','resolved')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_email_reminders_scheduled ON email_reminders(scheduled_for);
CREATE INDEX idx_email_reminders_sent ON email_reminders(sent);

-- AI Chat Feature (Free for 1 week)
DROP TABLE IF EXISTS chat_sessions;
CREATE TABLE chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  free_access_ends TEXT NOT NULL DEFAULT (datetime('now', '+7 days')),
  total_messages INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS chat_messages;
CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user','agent')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
