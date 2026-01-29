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

  req.session.user = { id: info.lastInsertRowid, name, email };

  res.json({ ok: true, user: req.session.user });
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
