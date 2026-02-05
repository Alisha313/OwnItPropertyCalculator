import express from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

// AI Agent responses - simulates a real estate agent
const agentResponses = {
  greeting: [
    "Hi there! I'm your AI Real Estate Agent. How can I help you today? 🏠",
    "Hello! Welcome to Own It! I'm here to help you find your dream property. What are you looking for?",
    "Hey! Great to meet you! Whether you're buying, selling, or just curious about the market, I'm here to help!"
  ],
  
  buying: [
    "That's exciting! Buying a home is a big decision. First, have you thought about your budget? Our mortgage calculator can help you figure out what you can afford.",
    "Looking to buy? Great choice! Some key things to consider: location, budget, and must-have features. What's most important to you?",
    "I'd love to help you find the perfect home! What area are you interested in, and how many bedrooms do you need?"
  ],
  
  selling: [
    "Thinking about selling? The current market is quite active. Would you like tips on how to prepare your home for sale?",
    "Selling can be both exciting and stressful. I can help guide you through the process. Have you had your home appraised recently?",
    "Ready to sell? First step is understanding your home's value. Location, condition, and recent comparable sales all factor in."
  ],
  
  mortgage: [
    "Great question about mortgages! The key factors are: your credit score, down payment, and debt-to-income ratio. Have you checked out our mortgage calculator?",
    "For mortgages, I recommend getting pre-approved first. It shows sellers you're serious and helps you know your budget. Typically you'll need 3-20% down payment.",
    "Mortgage rates vary based on loan type, credit score, and market conditions. FHA loans are great for first-time buyers with lower down payments!"
  ],
  
  rental: [
    "Looking to rent? Smart move for flexibility! What's your ideal price range and location?",
    "Rentals are a great option! When searching, consider: proximity to work, neighborhood safety, and included amenities. What matters most to you?",
    "I can help you find the perfect rental! Most landlords look for proof of income (usually 3x the rent) and good credit. Any specific areas you're interested in?"
  ],
  
  investment: [
    "Real estate investing can be very rewarding! Are you thinking about rental properties, fix-and-flip, or REITs?",
    "Great interest in investing! Key metrics to know: cap rate, cash-on-cash return, and ROI. Would you like me to explain any of these?",
    "Investment properties are a fantastic way to build wealth! Location is crucial - look for areas with job growth and population increases."
  ],
  
  firstTime: [
    "Congratulations on starting your home buying journey! First-time buyers often qualify for special programs and lower down payments. Have you looked into FHA loans?",
    "Being a first-time buyer is exciting! My top tips: 1) Get pre-approved, 2) Know your must-haves vs nice-to-haves, 3) Budget for closing costs (2-5% of price).",
    "Welcome to home buying! Don't worry, I'll guide you through every step. Start by checking your credit score and saving for a down payment. Even 3% can work!"
  ],
  
  default: [
    "That's a great question! Let me help you with that. Could you tell me more about what you're looking for?",
    "I'm here to help! Whether it's buying, selling, renting, or understanding mortgages, just let me know what you need.",
    "Thanks for reaching out! Real estate can be complex, but I'm here to make it simple. What specific questions do you have?",
    "I'd be happy to help with that! For the best advice, could you share a bit more about your situation?",
    "Good question! The real estate market has many nuances. Let me know your specific concerns and I'll do my best to help."
  ]
};

// Determine which category the user's message falls into
function categorizeMessage(message) {
  const lower = message.toLowerCase();
  
  if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey') || lower.includes('start')) {
    return 'greeting';
  }
  if (lower.includes('buy') || lower.includes('purchase') || lower.includes('looking for home') || lower.includes('find a house')) {
    return 'buying';
  }
  if (lower.includes('sell') || lower.includes('list my') || lower.includes('selling')) {
    return 'selling';
  }
  if (lower.includes('mortgage') || lower.includes('loan') || lower.includes('interest rate') || lower.includes('down payment') || lower.includes('financing')) {
    return 'mortgage';
  }
  if (lower.includes('rent') || lower.includes('lease') || lower.includes('apartment')) {
    return 'rental';
  }
  if (lower.includes('invest') || lower.includes('roi') || lower.includes('cap rate') || lower.includes('income property')) {
    return 'investment';
  }
  if (lower.includes('first time') || lower.includes('first-time') || lower.includes('never bought') || lower.includes('new to')) {
    return 'firstTime';
  }
  
  return 'default';
}

// Get a random response from a category
function getAgentResponse(category) {
  const responses = agentResponses[category] || agentResponses.default;
  return responses[Math.floor(Math.random() * responses.length)];
}

// Check if user has free chat access (1 week from registration)
function checkChatAccess(userId) {
  const session = db.prepare(`
    SELECT * FROM chat_sessions 
    WHERE user_id = ? 
    ORDER BY started_at DESC LIMIT 1
  `).get(userId);
  
  if (!session) {
    return { hasAccess: true, isNew: true };
  }
  
  const freeAccessEnds = new Date(session.free_access_ends);
  const now = new Date();
  const daysRemaining = Math.ceil((freeAccessEnds - now) / (1000 * 60 * 60 * 24));
  
  // Check if user has paid subscription
  const subscription = db.prepare(`
    SELECT * FROM subscriptions 
    WHERE user_id = ? AND status = 'active'
  `).get(userId);
  
  if (subscription) {
    return { hasAccess: true, isPaid: true, sessionId: session.id };
  }
  
  return {
    hasAccess: daysRemaining > 0,
    daysRemaining: Math.max(0, daysRemaining),
    sessionId: session.id,
    freeAccessEnds: session.free_access_ends
  };
}

// Get or create chat session
router.get("/session", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const access = checkChatAccess(userId);
  
  if (access.isNew) {
    // Create new session with 1 week free access
    const freeAccessEnds = new Date();
    freeAccessEnds.setDate(freeAccessEnds.getDate() + 7);
    
    const info = db.prepare(`
      INSERT INTO chat_sessions (user_id, free_access_ends)
      VALUES (?, ?)
    `).run(userId, freeAccessEnds.toISOString());
    
    return res.json({
      sessionId: info.lastInsertRowid,
      hasAccess: true,
      daysRemaining: 7,
      freeAccessEnds: freeAccessEnds.toISOString(),
      messages: []
    });
  }
  
  if (!access.hasAccess) {
    return res.json({
      hasAccess: false,
      message: "Your free week has ended. Subscribe to continue chatting with our AI agent!",
      daysRemaining: 0
    });
  }
  
  // Get existing messages
  const messages = db.prepare(`
    SELECT role, content, created_at 
    FROM chat_messages 
    WHERE session_id = ?
    ORDER BY created_at ASC
  `).all(access.sessionId);
  
  res.json({
    sessionId: access.sessionId,
    hasAccess: true,
    daysRemaining: access.daysRemaining,
    isPaid: access.isPaid,
    messages
  });
});

// Send a message and get AI response
router.post("/message", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const { message } = req.body;
  
  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: "Message cannot be empty" });
  }
  
  const access = checkChatAccess(userId);
  
  if (!access.hasAccess) {
    return res.status(403).json({
      error: "Your free week has ended. Subscribe to continue!",
      upgradeRequired: true
    });
  }
  
  let sessionId = access.sessionId;
  
  // Create session if needed
  if (access.isNew) {
    const freeAccessEnds = new Date();
    freeAccessEnds.setDate(freeAccessEnds.getDate() + 7);
    
    const info = db.prepare(`
      INSERT INTO chat_sessions (user_id, free_access_ends)
      VALUES (?, ?)
    `).run(userId, freeAccessEnds.toISOString());
    
    sessionId = info.lastInsertRowid;
  }
  
  // Save user message
  db.prepare(`
    INSERT INTO chat_messages (session_id, role, content)
    VALUES (?, 'user', ?)
  `).run(sessionId, message.trim());
  
  // Generate AI response
  const category = categorizeMessage(message);
  const agentReply = getAgentResponse(category);
  
  // Save agent response
  db.prepare(`
    INSERT INTO chat_messages (session_id, role, content)
    VALUES (?, 'agent', ?)
  `).run(sessionId, agentReply);
  
  // Update message count
  db.prepare(`
    UPDATE chat_sessions SET total_messages = total_messages + 2 WHERE id = ?
  `).run(sessionId);
  
  res.json({
    userMessage: message.trim(),
    agentReply,
    sessionId
  });
});

// Get chat history
router.get("/history", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  
  const session = db.prepare(`
    SELECT * FROM chat_sessions 
    WHERE user_id = ? 
    ORDER BY started_at DESC LIMIT 1
  `).get(userId);
  
  if (!session) {
    return res.json({ messages: [] });
  }
  
  const messages = db.prepare(`
    SELECT role, content, created_at 
    FROM chat_messages 
    WHERE session_id = ?
    ORDER BY created_at ASC
  `).all(session.id);
  
  res.json({ 
    messages,
    totalMessages: session.total_messages,
    startedAt: session.started_at
  });
});

export default router;
