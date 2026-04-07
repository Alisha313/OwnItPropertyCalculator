/**
 * @file subscriptionRoutes.js
 * @project OwnIt Property Calculator
 * @description Manages user subscription lifecycle including free trials,
 *              plan selection, payment method registration, activation,
 *              cancellation, and real estate agent contact requests.
 *
 * Endpoints:
 *   GET  /api/subscriptions/plans           - List all available plans
 *   GET  /api/subscriptions/status          - Current user's subscription status
 *   POST /api/subscriptions/start-trial     - Begin a 30-day free trial
 *   POST /api/subscriptions/select-plan     - Choose a subscription plan
 *   POST /api/subscriptions/add-payment-method - Register a payment method
 *   POST /api/subscriptions/activate        - Activate a paid subscription
 *   POST /api/subscriptions/cancel          - Cancel current subscription
 *   POST /api/subscriptions/contact-agent   - Submit a real estate agent request
 *   GET  /api/subscriptions/agent-requests  - View submitted agent requests
 */

import express from "express";
import { mongo, connectToMongoDB, seedDatabase } from "../db/mongo.js";
import { authenticateToken } from "./authRoutes.js";

const router = express.Router();
const TRIAL_DAYS = 30; // Duration of the free trial period in days

// Lazy initialization flag: connect to MongoDB on the first request
let initialized = false;

/**
 * Ensures MongoDB is connected and seed data is loaded before handling a request.
 * Runs only once per server process lifetime.
 */
async function ensureInitialized() {
  if (!initialized) {
    await connectToMongoDB();
    await seedDatabase();
    initialized = true;
  }
}

/**
 * Converts any date-like value to a Date object.
 * Returns null for falsy or invalid values.
 * @param {string|Date|null} value
 * @returns {Date|null}
 */
function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Calculates how many whole days remain until the given date.
 * Returns 0 if the date has already passed.
 * @param {Date|null} date
 * @returns {number}
 */
function daysUntil(date) {
  if (!date) return 0;
  return Math.max(0, Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24)));
}

/**
 * Fetches the most recently updated subscription document for a user.
 * @param {string} userId - The user's MongoDB ID string.
 * @returns {Promise<object|null>}
 */
async function getLatestSubscription(userId) {
  return await mongo.subscriptions()
    .findOne(
      { user_id: userId },
      { sort: { updated_at: -1, created_at: -1 } }
    );
}

/**
 * Looks up a subscription plan by its ID.
 * @param {string|null} planId
 * @returns {Promise<object|null>}
 */
async function getPlanById(planId) {
  if (!planId) return null;
  return await mongo.subscription_plans().findOne({ _id: planId });
}

/**
 * Enriches a subscription document with its linked plan's name, billing cycle,
 * and price, avoiding the need for callers to perform a second query.
 * @param {object|null} subscription
 * @returns {Promise<object|null>}
 */
async function withPlanFields(subscription) {
  if (!subscription) return null;
  const plan = await getPlanById(subscription.plan_id);
  return {
    ...subscription,
    plan_name: plan?.name ?? null,
    billing_cycle: plan?.billing_cycle ?? null,
    price: plan?.price ?? null
  };
}

/**
 * Determines whether a subscription currently grants access to the platform.
 * Trials are active if the trial end date is in the future.
 * Paid subscriptions are active if no end date is set, or end date is future.
 * @param {object|null} subscription
 * @returns {Promise<boolean>}
 */
async function hasLiveAccess(subscription) {
  if (!subscription) return false;

  if (subscription.status === "trial") {
    return daysUntil(parseDate(subscription.trial_end)) > 0;
  }

  if (subscription.status === "active") {
    const end = parseDate(subscription.subscription_end);
    return !end || end > new Date();
  }

  return false;
}

async function maybeExpire(subscription) {
  if (!subscription) return subscription;

  const now = new Date();
  const trialEnd = parseDate(subscription.trial_end);
  const subEnd = parseDate(subscription.subscription_end);

  let nextStatus = subscription.status;
  if (subscription.status === "trial" && trialEnd && trialEnd <= now) {
    nextStatus = "expired";
  }
  if (subscription.status === "active" && subEnd && subEnd <= now) {
    nextStatus = "expired";
  }

  if (nextStatus !== subscription.status) {
    subscription = {
      ...subscription,
      status: nextStatus,
      updated_at: new Date().toISOString()
    };

    if (subscription._id) {
      await mongo.subscriptions().updateOne(
        { _id: subscription._id },
        { $set: { status: nextStatus, updated_at: new Date().toISOString() } }
      );
    }
  }

  return subscription;
}

// Get all subscription plans
router.get("/plans", async (req, res) => {
  try {
    await ensureInitialized();
    const plans = await mongo.subscription_plans().find({}).toArray();
    res.json({ plans });
  } catch (error) {
    console.error("Plans error:", error);
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

// Get user's current subscription status
router.get("/status", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let subscription = await getLatestSubscription(req.user.id);
    subscription = await maybeExpire(subscription);

    if (!subscription) {
      return res.json({ subscription: null, message: "No active subscription" });
    }

    subscription = await withPlanFields(subscription);

    const daysRemaining = subscription?.status === "trial"
      ? daysUntil(parseDate(subscription.trial_end))
      : 0;

    res.json({
      subscription: {
        ...subscription,
        days_remaining: daysRemaining,
        is_trial_active: subscription?.status === "trial" && daysRemaining > 0
      }
    });
  } catch (error) {
    console.error("Status error:", error);
    res.status(500).json({ error: "Failed to get subscription status" });
  }
});

// Start a free trial
router.post("/start-trial", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const existing = await mongo.subscriptions().findOne({ user_id: req.user.id });
    if (existing) {
      return res.status(400).json({ error: "User already has a subscription record" });
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

    const result = await mongo.subscriptions().insertOne({
      user_id: req.user.id,
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

    res.json({
      ok: true,
      message: `${TRIAL_DAYS}-day free trial started!`,
      trial_end: trialEnd.toISOString()
    });
  } catch (error) {
    console.error("Start trial error:", error);
    res.status(500).json({ error: "Failed to start trial" });
  }
});

// Select a subscription plan
router.post("/select-plan", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ error: "Plan ID is required" });
    }

    const plan = await getPlanById(planId);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const existing = await getLatestSubscription(req.user.id);
    
    if (existing) {
      await mongo.subscriptions().updateOne(
        { _id: existing._id },
        { 
          $set: { 
            plan_id: planId,
            status: existing.status === "cancelled" ? "expired" : existing.status,
            updated_at: new Date().toISOString()
          }
        }
      );
    } else {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
      
      await mongo.subscriptions().insertOne({
        user_id: req.user.id,
        plan_id: planId,
        status: "trial",
        trial_start: new Date().toISOString(),
        trial_end: trialEnd.toISOString(),
        subscription_start: null,
        subscription_end: null,
        payment_method_added: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    res.json({
      ok: true,
      message: `Selected ${plan.name} plan. Add a payment method, then activate your subscription.`,
      plan
    });
  } catch (error) {
    console.error("Select plan error:", error);
    res.status(500).json({ error: "Failed to select plan" });
  }
});

// Add payment method
router.post("/add-payment-method", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const existing = await getLatestSubscription(req.user.id);
    if (!existing?.plan_id) {
      return res.status(400).json({ error: "Please select a subscription plan first" });
    }

    await mongo.subscriptions().updateOne(
      { _id: existing._id },
      { $set: { payment_method_added: true, updated_at: new Date().toISOString() } }
    );

    res.json({
      ok: true,
      message: "Payment method added. You won't be charged until your trial ends."
    });
  } catch (error) {
    console.error("Add payment error:", error);
    res.status(500).json({ error: "Failed to add payment method" });
  }
});

// Activate subscription
router.post("/activate", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let subscription = await getLatestSubscription(req.user.id);
    if (!subscription) {
      return res.status(404).json({ error: "No subscription found" });
    }

    if (!subscription.payment_method_added) {
      return res.status(400).json({ error: "Please add a payment method first" });
    }

    if (!subscription.plan_id) {
      return res.status(400).json({ error: "Please select a subscription plan first" });
    }

    const plan = await getPlanById(subscription.plan_id);
    if (!plan) {
      return res.status(400).json({ error: "Selected plan no longer exists" });
    }

    const subscriptionStart = new Date();
    const subscriptionEnd = new Date();
    if (plan.billing_cycle === "monthly") {
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
    } else {
      subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
    }

    await mongo.subscriptions().updateOne(
      { _id: subscription._id },
      {
        $set: {
          status: "active",
          subscription_start: subscriptionStart.toISOString(),
          subscription_end: subscriptionEnd.toISOString(),
          payment_method_added: true,
          updated_at: new Date().toISOString()
        }
      }
    );

    res.json({
      ok: true,
      message: "Subscription activated!",
      subscription_end: subscriptionEnd.toISOString()
    });
  } catch (error) {
    console.error("Activate error:", error);
    res.status(500).json({ error: "Failed to activate subscription" });
  }
});

// Cancel subscription
router.post("/cancel", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const subscription = await getLatestSubscription(req.user.id);
    if (!subscription) {
      return res.status(404).json({ error: "No subscription found" });
    }

    if (subscription.status === "cancelled") {
      return res.json({ ok: true, message: "Subscription already cancelled" });
    }

    await mongo.subscriptions().updateOne(
      { _id: subscription._id },
      { $set: { status: "cancelled", subscription_end: new Date().toISOString(), updated_at: new Date().toISOString() } }
    );

    res.json({ ok: true, message: "Subscription cancelled" });
  } catch (error) {
    console.error("Cancel error:", error);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

// Contact agent
router.post("/contact-agent", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const subscription = await maybeExpire(await getLatestSubscription(req.user.id));
    if (!hasLiveAccess(subscription)) {
      return res.status(403).json({
        error: "You need an active trial or subscription to contact an agent"
      });
    }

    const { message } = req.body;
    const result = await mongo.agent_requests().insertOne({
      user_id: req.user.id,
      message: message || "I would like to speak with a real estate agent.",
      status: "pending",
      created_at: new Date().toISOString()
    });

    res.json({
      ok: true,
      message: "Your request has been submitted. An agent will contact you soon!",
      requestId: result.insertedId
    });
  } catch (error) {
    console.error("Contact agent error:", error);
    res.status(500).json({ error: "Failed to submit agent request" });
  }
});

// Get agent requests
router.get("/agent-requests", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requests = await mongo.agent_requests()
      .find({ user_id: req.user.id })
      .sort({ created_at: -1 })
      .toArray();

    res.json({ requests });
  } catch (error) {
    console.error("Agent requests error:", error);
    res.status(500).json({ error: "Failed to fetch agent requests" });
  }
});

export default router;
