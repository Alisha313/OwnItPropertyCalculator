/**
 * @file chatRoutes.js
 * @project OwnIt Property Calculator
 * @description AI-powered real estate chat assistant routes.
 *              Users receive one free week of access to the chat feature.
 *              After that, a paid subscription is required. Chat history
 *              is persisted in MongoDB for context-aware conversations.
 *
 *              The AI client prefers Groq (free tier) and falls back to OpenAI.
 *
 * Endpoints:
 *   GET  /api/chat/session         - Retrieve or create the user's chat session
 *   POST /api/chat/message         - Send a message and receive an AI reply
 *   POST /api/chat/message/stream  - Send a message and stream the AI reply (SSE)
 */

import express from "express";
import OpenAI from "openai";
import { mongo, connectToMongoDB, seedDatabase } from "../db/mongo.js";
import { authenticateToken } from "./authRoutes.js";
import { userIdQuery, resolveUserId } from "../utils/userQuery.js";

const router = express.Router();

let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await connectToMongoDB();
    await seedDatabase();
    initialized = true;
  }
}

let cachedAIClient = undefined;

function getAIClient() {
  if (cachedAIClient !== undefined) return cachedAIClient;

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && groqKey !== "your_groq_api_key_here") {
    cachedAIClient = {
      client: new OpenAI({ apiKey: groqKey, baseURL: "https://api.groq.com/openai/v1" }),
      model: process.env.GROQ_CHAT_MODEL || "llama-3.1-8b-instant",
    };
    return cachedAIClient;
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && openaiKey !== "your_openai_api_key_here") {
    cachedAIClient = {
      client: new OpenAI({ apiKey: openaiKey }),
      model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
    };
    return cachedAIClient;
  }

  cachedAIClient = null;
  return cachedAIClient;
}

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

const FALLBACK_RESPONSES = [
  "I'm your OwnIt AI assistant! To enable real AI responses, add a free Groq API key to the backend `.env` file (`GROQ_API_KEY=gsk_...`). Get one free at console.groq.com — no credit card needed!",
  "Great question! For live AI-powered answers, grab a free key at console.groq.com and set `GROQ_API_KEY` in your backend `.env`. Once that's set, I can answer anything about mortgages, market trends, and more.",
];

function buildMessages(userMessage, conversationHistory) {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory.map(m => ({
      role: m.role === "agent" ? "assistant" : "user",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];
}

async function getAIReply(userMessage, conversationHistory) {
  const ai = getAIClient();
  if (!ai) {
    return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
  }

  const completion = await ai.client.chat.completions.create({
    model: ai.model,
    messages: buildMessages(userMessage, conversationHistory),
    max_tokens: 350,
    temperature: 0.7,
  });

  return completion.choices[0].message.content.trim();
}

async function* streamAIReply(userMessage, conversationHistory) {
  const ai = getAIClient();
  if (!ai) {
    yield FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
    return;
  }

  const stream = await ai.client.chat.completions.create({
    model: ai.model,
    messages: buildMessages(userMessage, conversationHistory),
    max_tokens: 350,
    temperature: 0.7,
    stream: true,
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content;
    if (token) yield token;
  }
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPaidFromSubscription(subscription) {
  if (!subscription || subscription.status !== "active") return false;
  const end = parseDate(subscription.subscription_end);
  return !end || end > new Date();
}

async function hasPaidSubscription(userId) {
  const subscription = await mongo.subscriptions().findOne(
    { ...userIdQuery(userId), status: "active" },
    { sort: { updated_at: -1 } }
  );
  return isPaidFromSubscription(subscription);
}

async function checkChatAccess(userId, subscriptionSnapshot) {
  const session = await mongo.chat_sessions().findOne(
    {
      ...userIdQuery(userId),
      $or: [{ session_type: "ai" }, { session_type: { $exists: false } }],
    },
    { sort: { started_at: -1 } }
  );

  if (!session) return { hasAccess: true, isNew: true };

  const freeAccessEnds = new Date(session.free_access_ends);
  const now = new Date();
  const daysRemaining = Math.ceil((freeAccessEnds - now) / (1000 * 60 * 60 * 24));

  const isPaid = subscriptionSnapshot !== undefined
    ? isPaidFromSubscription(subscriptionSnapshot)
    : await hasPaidSubscription(userId);

  if (isPaid) {
    return { hasAccess: true, isPaid: true, sessionId: session._id };
  }

  return {
    hasAccess: daysRemaining > 0,
    daysRemaining: Math.max(0, daysRemaining),
    sessionId: session._id,
    freeAccessEnds: session.free_access_ends,
  };
}

async function ensureChatSession(access, userId) {
  if (!access.isNew) return access.sessionId;

  const freeAccessEnds = new Date();
  freeAccessEnds.setDate(freeAccessEnds.getDate() + 7);

  const result = await mongo.chat_sessions().insertOne({
    user_id: resolveUserId(userId),
    session_type: "ai",
    started_at: new Date().toISOString(),
    free_access_ends: freeAccessEnds.toISOString(),
    total_messages: 0,
  });
  return result.insertedId;
}

async function fetchChatHistory(sessionId) {
  const history = await mongo.chat_messages()
    .find({ session_id: sessionId })
    .sort({ created_at: -1 })
    .limit(20)
    .project({ role: 1, content: 1 })
    .toArray();
  history.reverse();
  return history;
}

async function ensureLead(user, listingId) {
  const existingLead = await mongo.leads().findOne(userIdQuery(user.id));
  if (existingLead) return;

  await mongo.leads().insertOne({
    user_id: resolveUserId(user.id),
    user_name: user.name || "Unknown",
    user_email: user.email || "",
    source_listing_id: listingId || null,
    stage: "new",
    created_at: new Date().toISOString(),
  });
}

async function prepareChatMessage(req) {
  const { message } = req.body;
  if (!message || message.trim().length === 0) {
    return { error: { status: 400, body: { error: "Message cannot be empty" } } };
  }

  const access = await checkChatAccess(req.user.id, req.subscription);
  if (!access.hasAccess) {
    return {
      error: {
        status: 403,
        body: { error: "Your free week has ended. Subscribe to continue!", upgradeRequired: true },
      },
    };
  }

  const sessionId = await ensureChatSession(access, req.user.id);
  const [history, existingLead] = await Promise.all([
    fetchChatHistory(sessionId),
    mongo.leads().findOne(userIdQuery(req.user.id), { projection: { _id: 1 } }),
  ]);

  if (!existingLead) {
    await ensureLead(req.user, req.body.listing_id);
  }

  const trimmed = message.trim();
  await mongo.chat_messages().insertOne({
    session_id: sessionId,
    role: "user",
    content: trimmed,
    created_at: new Date().toISOString(),
  });

  return { sessionId, history, trimmed };
}

function handleChatError(error, res) {
  console.error("Chat message error:", error);

  if (error?.status === 401) {
    return res.status(500).json({ error: "Invalid OpenAI API key — check your OPENAI_API_KEY environment variable." });
  }
  if (error?.status === 429) {
    return res.status(500).json({ error: "OpenAI rate limit reached. Please try again in a moment." });
  }

  return res.status(500).json({ error: "Failed to send message" });
}

// ── GET /api/chat/session ─────────────────────────────────────────────────────
router.get("/session", authenticateToken, async (req, res) => {
  try {
    await ensureInitialized();

    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const access = await checkChatAccess(req.user.id, req.subscription);

    if (access.isNew) {
      const freeAccessEnds = new Date();
      freeAccessEnds.setDate(freeAccessEnds.getDate() + 7);

      const result = await mongo.chat_sessions().insertOne({
        user_id: req.user.id,
        session_type: "ai",
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

    const prepared = await prepareChatMessage(req);
    if (prepared.error) return res.status(prepared.error.status).json(prepared.error.body);

    const { sessionId, history, trimmed } = prepared;
    const agentReply = await getAIReply(trimmed, history);

    await mongo.chat_messages().insertOne({
      session_id: sessionId,
      role: "agent",
      content: agentReply,
      created_at: new Date().toISOString(),
    });

    await mongo.chat_sessions().updateOne(
      { _id: sessionId },
      { $inc: { total_messages: 2 } }
    );

    res.json({
      userMessage: trimmed,
      agentReply,
      sessionId,
    });
  } catch (error) {
    handleChatError(error, res);
  }
});

// ── POST /api/chat/message/stream ─────────────────────────────────────────────
router.post("/message/stream", authenticateToken, async (req, res) => {
  try {
    await ensureInitialized();
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const prepared = await prepareChatMessage(req);
    if (prepared.error) return res.status(prepared.error.status).json(prepared.error.body);

    const { sessionId, history, trimmed } = prepared;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    let agentReply = "";
    try {
      for await (const token of streamAIReply(trimmed, history)) {
        agentReply += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    } catch (streamError) {
      console.error("Chat stream error:", streamError);
      res.write(`data: ${JSON.stringify({ error: "Failed to stream response" })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    await mongo.chat_messages().insertOne({
      session_id: sessionId,
      role: "agent",
      content: agentReply.trim(),
      created_at: new Date().toISOString(),
    });

    await mongo.chat_sessions().updateOne(
      { _id: sessionId },
      { $inc: { total_messages: 2 } }
    );

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      handleChatError(error, res);
    } else {
      console.error("Chat stream error:", error);
      res.end();
    }
  }
});

// ── GET /api/chat/history ─────────────────────────────────────────────────────
router.get("/history", authenticateToken, async (req, res) => {
  try {
    await ensureInitialized();

    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const session = await mongo.chat_sessions().findOne(
      { ...userIdQuery(req.user.id) },
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
