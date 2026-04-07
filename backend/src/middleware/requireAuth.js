/**
 * @file requireAuth.js
 * @project OwnIt Property Calculator
 * @description Express middleware that protects routes requiring authentication.
 *              Checks for a valid session user object; returns 401 Unauthorized
 *              if no authenticated session is found.
 */

/**
 * Middleware to restrict access to authenticated users only.
 * Attach this to any route that requires the user to be logged in.
 *
 * @param {import('express').Request}  req  - Express request object.
 * @param {import('express').Response} res  - Express response object.
 * @param {import('express').NextFunction} next - Next middleware function.
 */
export function requireAuth(req, res, next) {
  // req.session.user is set by the auth flow upon successful login
  if (!req.session?.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}
