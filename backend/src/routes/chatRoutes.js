import express from "express";
import OpenAI from "openai";
import { mongo, connectToMongoDB, seedDatabase } from "../db/mongo.js";
import { authenticateToken } from "./authRoutes.js";

const router = express.Router();

let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await connectToMongoDB();
    await seedDatabase();
    initialized = true;
  }
}

// ── AI client — prefers Groq (free), falls back to OpenAI ────────────────────
function getAIClient() {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && groqKey !== "your_groq_api_key_here") {
    return {
      client: new OpenAI({ apiKey: groqKey, baseURL: "https://api.groq.com/openai/v1" }),
      model: "llama-3.3-70b-versatile",
    };
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && openaiKey !== "your_openai_api_key_here") {
    return {
      client: new OpenAI({ apiKey: openaiKey }),
      model: "gpt-4o-mini",
    };
  }
  return null;
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Alex, a knowledgeable and friendly AI real estate assistant for OwnIt Property Calculator — a platform that helps users buy, sell, and rent homes across the United States.

Your role:
- Answer any real estate question clearly and helpfully, just like a licensed agent would
- Help users understand mortgages, down payments, interest rates, amortization, and monthly payment calculations
- Give honest market insights for US cities and states
- Explain rental vs buying decisions, investment properties, cap rates, and ROI
- Guide first-time buyers through the home buying process step by step
- Discuss neighborhoods, school districts, property taxes, HOA fees, and closing costs
- Help users understand the listings on OwnIt (sales and rentals across all 50 states)
- Answer general questions too — you're a full AI assistant, not just a real estate bot

Tone: Conversational, confident, and helpful. Use plain language. Avoid jargon unless the user introduces it. Keep answers concise but complete — no unnecessary filler.

When doing mortgage math, show your work clearly with numbers. For example: "On a $400k loan at 6.8% for 30 years, your monthly payment would be $2,608."

You have access to the full conversation history, so always remember what the user said before.`;

// ── Fallback responses when no API key is configured ─────────────────────────
const FALLBACK_RESPONSES = [
  "I'm your OwnIt AI assistant! To enable real AI responses, add a free Groq API key to the backend `.env` file (`GROQ_API_KEY=gsk_...`). Get one free at console.groq.com — no credit card needed!",
  "Great question! For live AI-powered answers, grab a free key at console.groq.com and set `GROQ_API_KEY` in your backend `.env`. Once that's set, I can answer anything about mortgages, market trends, and more.",
];

// ── Call AI (Groq or OpenAI) with full conversation history ──────────────────
async function getAIReply(userMessage, conversationHistory) {
  const ai = getAIClient();

  if (!ai) {
    return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory.map(m => ({
      role: m.role === "agent" ? "assistant" : "user",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const completion = await ai.client.chat.completions.create({
    model: ai.model,
    messages,
    max_tokens: 600,
    temperature: 0.7,
  });

  return completion.choices[0].message.content.trim();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function hasPaidSubscription(userId) {
  const subscription = await mongo.subscriptions().findOne(
    { user_id: userId, status: "active" },
    { sort: { updated_at: -1 } }
  );
  if (subscription) {
    const dbEnd = parseDate(subscription.subscription_end);
    if (!dbEnd || dbEnd > new Date()) return true;
  }
  return false;
}

async function checkChatAccess(userId) {
  const session = await mongo.chat_sessions().findOne(
    { user_id: userId },
    { sort: { started_at: -1 } }
  );

  if (!session) return { hasAccess: true, isNew: true };

  const freeAccessEnds = new Date(session.free_access_ends);
  const now = new Date();
  const daysRemaining = Math.ceil((freeAccessEnds - now) / (1000 * 60 * 60 * 24));

  if (await hasPaidSubscription(userId)) {
    return { hasAccess: true, isPaid: true, sessionId: session._id };
  }

  return {
    hasAccess: daysRemaining > 0,
    daysRemaining: Math.max(0, daysRemaining),
    sessionId: session._id,
    freeAccessEnds: session.free_access_ends,
  };
}

// ── GET /api/chat/session ─────────────────────────────────────────────────────
router.get("/session", authenticateToken, async (req, res) => {
  try {
    await ensureInitialized();

    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const access = await checkChatAccess(req.user.id);

    if (access.isNew) {
      const freeAccessEnds = new Date();
      freeAccessEnds.setDate(freeAccessEnds.getDate() + 7);

      const result = await mongo.chat_sessions().insertOne({
        user_id: req.user.id,
        started_at: new Date().toISOString(),
        free_access_ends: freeAccessEnds.toISOString(),
        total_messages: 0,
      });

      return res.json({
        sessionId: result.insertedId,
        hasAccess: true,
        daysRemaining: 7,
        freeAccessEnds: freeAccessEnds.toISOString(),
        messages: [],
      });
    }

    if (!access.hasAccess) {
      return res.json({
        hasAccess: false,
        message: "Your free week has ended. Subscribe to continue chatting!",
        daysRemaining: 0,
      });
    }

    const messages = await mongo.chat_messages()
      .find({ session_id: access.sessionId })
      .sort({ created_at: 1 })
      .project({ role: 1, content: 1, created_at: 1 })
      .toArray();

    res.json({
      sessionId: access.sessionId,
      hasAccess: true,
      daysRemaining: access.daysRemaining,
      isPaid: access.isPaid,
      messages,
    });
  } catch (error) {
    console.error("Chat session error:", error);
    res.status(500).json({ error: "Failed to get chat session" });
  }
});

// ── POST /api/chat/message ────────────────────────────────────────────────────
router.post("/message", authenticateToken, async (req, res) => {
  try {
    await ensureInitialized();

    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { message } = req.body;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const access = await checkChatAccess(req.user.id);

    if (!access.hasAccess) {
      return res.status(403).json({
        error: "Your free week has ended. Subscribe to continue!",
        upgradeRequired: true,
      });
    }

    let sessionId = access.sessionId;

    // Create session if this is the first message ever
    if (access.isNew) {
      const freeAccessEnds = new Date();
      freeAccessEnds.setDate(freeAccessEnds.getDate() + 7);

      const result = await mongo.chat_sessions().insertOne({
        user_id: req.user.id,
        started_at: new Date().toISOString(),
        free_access_ends: freeAccessEnds.toISOString(),
        total_messages: 0,
      });
      sessionId = result.insertedId;
    }

    // Fetch last 20 messages for context window (keeps tokens reasonable)
    const history = await mongo.chat_messages()
      .find({ session_id: sessionId })
      .sort({ created_at: -1 })
      .limit(20)
      .project({ role: 1, content: 1 })
      .toArray();
    history.reverse(); // oldest first for the API

    // Save user message first
    await mongo.chat_messages().insertOne({
      session_id: sessionId,
      role: "user",
      content: message.trim(),
      created_at: new Date().toISOString(),
    });

    // Call OpenAI (or fallback)
    const agentReply = await getAIReply(message.trim(), history);

    // Save AI reply
    await mongo.chat_messages().insertOne({
      session_id: sessionId,
      role: "agent",
      content: agentReply,
      created_at: new Date().toISOString(),
    });

    // Increment message count
    await mongo.chat_sessions().updateOne(
      { _id: sessionId },
      { $inc: { total_messages: 2 } }
    );

    res.json({
      userMessage: message.trim(),
      agentReply,
      sessionId,
    });
  } catch (error) {
    console.error("Chat message error:", error);

    // Surface API key errors cleanly
    if (error?.status === 401) {
      return res.status(500).json({ error: "Invalid OpenAI API key — check your OPENAI_API_KEY environment variable." });
    }
    if (error?.status === 429) {
      return res.status(500).json({ error: "OpenAI rate limit reached. Please try again in a moment." });
    }

    res.status(500).json({ error: "Failed to send message" });
  }
});

// ── GET /api/chat/history ─────────────────────────────────────────────────────
router.get("/history", authenticateToken, async (req, res) => {
  try {
    await ensureInitialized();

    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const session = await mongo.chat_sessions().findOne(
      { user_id: req.user.id },
      { sort: { started_at: -1 } }
    );

    if (!session) return res.json({ messages: [] });

    const messages = await mongo.chat_messages()
      .find({ session_id: session._id })
      .sort({ created_at: 1 })
      .project({ role: 1, content: 1, created_at: 1 })
      .toArray();

    res.json({
      messages,
      totalMessages: session.total_messages,
      startedAt: session.started_at,
    });
  } catch (error) {
    console.error("Chat history error:", error);
    res.status(500).json({ error: "Failed to get chat history" });
  }
});

export default router;
