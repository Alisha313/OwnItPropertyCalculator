import express from "express";
import bcrypt from "bcryptjs";
import { db, initDb } from "../db.js";

const router = express.Router();

// Initialize DB once when routes load (safe for small class project)
initDb();

router.post("/register", (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, password are required" });
  }

  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists) return res.status(409).json({ error: "Email already registered" });

  const hash = bcrypt.hashSync(password, 10);

  const info = db
    .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
    .run(name, email, hash);

  const userId = info.lastInsertRowid;

  // Automatically start 30-day free trial for new users
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 30);

  db.prepare(`
    INSERT INTO subscriptions (user_id, status, trial_end)
    VALUES (?, 'trial', ?)
  `).run(userId, trialEnd.toISOString());

  // Schedule email reminders for trial
  const reminderDays = [
    { type: 'trial_7_days', daysBeforeEnd: 7 },
    { type: 'trial_3_days', daysBeforeEnd: 3 },
    { type: 'trial_1_day', daysBeforeEnd: 1 },
    { type: 'trial_expired', daysBeforeEnd: 0 }
  ];

  const reminderStmt = db.prepare(`
    INSERT INTO email_reminders (user_id, reminder_type, scheduled_for)
    VALUES (?, ?, ?)
  `);

  for (const reminder of reminderDays) {
    const scheduledDate = new Date(trialEnd);
    scheduledDate.setDate(scheduledDate.getDate() - reminder.daysBeforeEnd);
    reminderStmt.run(userId, reminder.type, scheduledDate.toISOString());
  }

  req.session.user = { id: userId, name, email };

  res.json({ 
    ok: true, 
    user: req.session.user,
    trial: {
      started: true,
      ends: trialEnd.toISOString(),
      message: "Your 30-day free trial has started! No payment required until trial ends."
    }
  });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = db
    .prepare("SELECT id, name, email, password_hash FROM users WHERE email = ?")
    .get(email);

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  req.session.user = { id: user.id, name: user.name, email: user.email };
  res.json({ ok: true, user: req.session.user });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/me", (req, res) => {
  res.json({ user: req.session?.user || null });
});

export default router;
