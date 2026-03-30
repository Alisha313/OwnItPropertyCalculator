import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { mongo, connectToMongoDB, seedDatabase, getObjectId } from "../db/mongo.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Initialize MongoDB on first request
let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await connectToMongoDB();
    await seedDatabase();
    initialized = true;
  }
}

function generateToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

async function loadSubscriptionSnapshot(userId) {
  const subscription = await mongo.subscriptions()
    .findOne(
      { user_id: userId },
      { sort: { updated_at: -1, created_at: -1 } }
    );

  if (!subscription) return null;

  return {
    plan_id: subscription.plan_id ?? null,
    status: subscription.status,
    trial_start: subscription.trial_start ?? null,
    trial_end: subscription.trial_end ?? null,
    subscription_start: subscription.subscription_start ?? null,
    subscription_end: subscription.subscription_end ?? null,
    payment_method_added: subscription.payment_method_added ? 1 : 0,
    created_at: subscription.created_at ?? null,
    updated_at: subscription.updated_at ?? null
  };
}

// Middleware to verify JWT
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      req.user = null;
      return next();
    }
    req.user = user;
    
    // Load subscription data
    try {
      await ensureInitialized();
      req.subscription = await loadSubscriptionSnapshot(user.id);
    } catch (e) {
      console.error("Error loading subscription:", e);
    }
    
    next();
  });
}

router.post("/register", async (req, res) => {
  try {
    await ensureInitialized();
    
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, password are required" });
    }

    const exists = await mongo.users().findOne({ email });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    const hash = bcrypt.hashSync(password, 10);

    const result = await mongo.users().insertOne({
      name,
      email,
      password_hash: hash,
      created_at: new Date().toISOString()
    });

    const userId = result.insertedId;

    // Automatically start 30-day free trial for new users
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    await mongo.subscriptions().insertOne({
      user_id: userId,
      plan_id: null,
      status: "trial",
      trial_start: new Date().toISOString(),
      trial_end: trialEnd.toISOString(),
      subscription_start: null,
      subscription_end: null,
      payment_method_added: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Schedule email reminders for trial
    const reminderDays = [
      { type: "trial_7_days", daysBeforeEnd: 7 },
      { type: "trial_3_days", daysBeforeEnd: 3 },
      { type: "trial_1_day", daysBeforeEnd: 1 },
      { type: "trial_expired", daysBeforeEnd: 0 }
    ];

    for (const reminder of reminderDays) {
      const scheduledDate = new Date(trialEnd);
      scheduledDate.setDate(scheduledDate.getDate() - reminder.daysBeforeEnd);
      await mongo.email_reminders().insertOne({
        user_id: userId,
        reminder_type: reminder.type,
        scheduled_for: scheduledDate.toISOString(),
        sent: false,
        sent_at: null,
        created_at: new Date().toISOString()
      });
    }

    const token = generateToken({ _id: userId, name, email });
    const subscription = await loadSubscriptionSnapshot(userId);

    res.json({
      ok: true,
      token,
      user: { id: userId.toString(), name, email },
      subscription,
      trial: {
        started: true,
        ends: trialEnd.toISOString(),
        message: "Your 30-day free trial has started! No payment required until trial ends."
      }
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    await ensureInitialized();
    
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await mongo.users().findOne({ email });

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = generateToken(user);
    const subscription = await loadSubscriptionSnapshot(user._id);

    res.json({ 
      ok: true, 
      token,
      user: { id: user._id.toString(), name: user.name, email: user.email },
      subscription
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", (req, res) => {
  // With JWT, logout is handled client-side by removing the token
  res.json({ ok: true });
});

router.get("/me", authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  
  res.json({ 
    user: req.user,
    subscription: req.subscription || null
  });
});

export default router;
