/**
 * @file requireAgent.js
 * @project OwnIt Property Calculator
 * @description Middleware that verifies the requesting user has the "agent" role.
 *              Must be used after authenticateToken (JWT verification) middleware.
 */

export function requireAgent(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (req.user.role !== "agent") {
    return res.status(403).json({ error: "Agent access required" });
  }

  next();
}
