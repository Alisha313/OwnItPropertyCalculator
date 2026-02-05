import express from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

// Get all subscription plans
router.get("/plans", (req, res) => {
  const plans = db.prepare("SELECT * FROM subscription_plans").all();
  const formattedPlans = plans.map(plan => ({
    ...plan,
    features: JSON.parse(plan.features)
  }));
  res.json({ plans: formattedPlans });
});

// Get user's current subscription status
router.get("/status", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  
  const subscription = db.prepare(`
    SELECT s.*, sp.name as plan_name, sp.billing_cycle, sp.price
    FROM subscriptions s
    LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE s.user_id = ?
    ORDER BY s.created_at DESC
    LIMIT 1
  `).get(userId);

  if (!subscription) {
    return res.json({ subscription: null, message: "No active subscription" });
  }

  // Calculate days remaining in trial
  const trialEnd = new Date(subscription.trial_end);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));

  res.json({
    subscription: {
      ...subscription,
      days_remaining: daysRemaining,
      is_trial_active: subscription.status === 'trial' && daysRemaining > 0
    }
  });
});

// Start a free trial (called after registration)
router.post("/start-trial", requireAuth, (req, res) => {
  const userId = req.session.user.id;

  // Check if user already has a subscription
  const existing = db.prepare("SELECT id FROM subscriptions WHERE user_id = ?").get(userId);
  if (existing) {
    return res.status(400).json({ error: "User already has a subscription record" });
  }

  // Create trial subscription
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 30); // 30-day trial

  const info = db.prepare(`
    INSERT INTO subscriptions (user_id, status, trial_end)
    VALUES (?, 'trial', ?)
  `).run(userId, trialEnd.toISOString());

  // Schedule email reminders
  scheduleTrialReminders(userId, trialEnd);

  res.json({ 
    ok: true, 
    message: "30-day free trial started!",
    trial_end: trialEnd.toISOString()
  });
});

// Select a subscription plan (upgrade from trial)
router.post("/select-plan", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const { planId } = req.body;

  if (!planId) {
    return res.status(400).json({ error: "Plan ID is required" });
  }

  const plan = db.prepare("SELECT * FROM subscription_plans WHERE id = ?").get(planId);
  if (!plan) {
    return res.status(404).json({ error: "Plan not found" });
  }

  // Update user's subscription with selected plan
  db.prepare(`
    UPDATE subscriptions 
    SET plan_id = ?, updated_at = datetime('now')
    WHERE user_id = ?
  `).run(planId, userId);

  res.json({ 
    ok: true, 
    message: `Selected ${plan.name} plan. Add payment method to activate after trial.`,
    plan
  });
});

// Add payment method (simulated - in production, integrate Stripe/PayPal)
router.post("/add-payment-method", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const { paymentDetails } = req.body;

  // In a real app, you would:
  // 1. Validate payment details with Stripe/PayPal
  // 2. Store tokenized payment info securely
  // 3. Set up recurring billing

  // For now, just mark payment method as added
  db.prepare(`
    UPDATE subscriptions 
    SET payment_method_added = 1, updated_at = datetime('now')
    WHERE user_id = ?
  `).run(userId);

  res.json({ 
    ok: true, 
    message: "Payment method added. You won't be charged until your trial ends."
  });
});

// Activate subscription (after trial or immediately with payment)
router.post("/activate", requireAuth, (req, res) => {
  const userId = req.session.user.id;

  const subscription = db.prepare(`
    SELECT * FROM subscriptions WHERE user_id = ?
  `).get(userId);

  if (!subscription) {
    return res.status(404).json({ error: "No subscription found" });
  }

  if (!subscription.payment_method_added) {
    return res.status(400).json({ error: "Please add a payment method first" });
  }

  if (!subscription.plan_id) {
    return res.status(400).json({ error: "Please select a subscription plan first" });
  }

  const plan = db.prepare("SELECT * FROM subscription_plans WHERE id = ?").get(subscription.plan_id);
  
  // Calculate subscription end based on billing cycle
  const subscriptionStart = new Date();
  const subscriptionEnd = new Date();
  if (plan.billing_cycle === 'monthly') {
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
  } else {
    subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
  }

  db.prepare(`
    UPDATE subscriptions 
    SET status = 'active',
        subscription_start = ?,
        subscription_end = ?,
        updated_at = datetime('now')
    WHERE user_id = ?
  `).run(subscriptionStart.toISOString(), subscriptionEnd.toISOString(), userId);

  res.json({ 
    ok: true, 
    message: "Subscription activated!",
    subscription_end: subscriptionEnd.toISOString()
  });
});

// Cancel subscription
router.post("/cancel", requireAuth, (req, res) => {
  const userId = req.session.user.id;

  db.prepare(`
    UPDATE subscriptions 
    SET status = 'cancelled', updated_at = datetime('now')
    WHERE user_id = ?
  `).run(userId);

  res.json({ ok: true, message: "Subscription cancelled" });
});

// Request to talk to a real estate agent
router.post("/contact-agent", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const { message } = req.body;

  // Check if user has active trial or subscription
  const subscription = db.prepare(`
    SELECT * FROM subscriptions 
    WHERE user_id = ? AND status IN ('trial', 'active')
  `).get(userId);

  if (!subscription) {
    return res.status(403).json({ 
      error: "You need an active trial or subscription to contact an agent" 
    });
  }

  const info = db.prepare(`
    INSERT INTO agent_requests (user_id, message)
    VALUES (?, ?)
  `).run(userId, message || "I would like to speak with a real estate agent.");

  res.json({ 
    ok: true, 
    message: "Your request has been submitted. An agent will contact you soon!",
    requestId: info.lastInsertRowid
  });
});

// Get user's agent contact requests
router.get("/agent-requests", requireAuth, (req, res) => {
  const userId = req.session.user.id;

  const requests = db.prepare(`
    SELECT * FROM agent_requests 
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);

  res.json({ requests });
});

// Helper function to schedule trial reminder emails
function scheduleTrialReminders(userId, trialEnd) {
  const reminderDays = [
    { type: 'trial_7_days', daysBeforeEnd: 7 },
    { type: 'trial_3_days', daysBeforeEnd: 3 },
    { type: 'trial_1_day', daysBeforeEnd: 1 },
    { type: 'trial_expired', daysBeforeEnd: 0 }
  ];

  const stmt = db.prepare(`
    INSERT INTO email_reminders (user_id, reminder_type, scheduled_for)
    VALUES (?, ?, ?)
  `);

  for (const reminder of reminderDays) {
    const scheduledDate = new Date(trialEnd);
    scheduledDate.setDate(scheduledDate.getDate() - reminder.daysBeforeEnd);
    
    stmt.run(userId, reminder.type, scheduledDate.toISOString());
  }
}

// Get pending email reminders (for a cron job or background task)
router.get("/pending-reminders", (req, res) => {
  const now = new Date().toISOString();
  
  const reminders = db.prepare(`
    SELECT er.*, u.name, u.email
    FROM email_reminders er
    JOIN users u ON er.user_id = u.id
    WHERE er.sent = 0 AND er.scheduled_for <= ?
  `).all(now);

  res.json({ reminders });
});

// Mark reminder as sent
router.post("/mark-reminder-sent/:id", (req, res) => {
  const { id } = req.params;

  db.prepare(`
    UPDATE email_reminders 
    SET sent = 1, sent_at = datetime('now')
    WHERE id = ?
  `).run(id);

  res.json({ ok: true });
});

export default router;
