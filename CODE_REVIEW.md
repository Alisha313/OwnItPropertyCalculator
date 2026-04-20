# Code Review — OwnIt Property Calculator
**Reviewed by:** Claude Code
**Date:** April 16, 2026
**Checklist Source:** "A Comprehensive Code Review Checklist"

---

## 1. Verify Feature Requirements

**Does the code accomplish what the end user needs?**

The application covers its core stated features well:
- Property listings (sales & rentals) with filtering
- Mortgage calculator
- User authentication (register, login, logout)
- AI chat agent for property queries
- Light/dark theme toggle
- Map view (Leaflet.js)
- Subscription/trial management

**Is there any missing functionality?**
- The logout endpoint (`POST /api/auth/logout`) does nothing server-side — it simply returns `{ ok: true }`. Since JWTs are stateless, there is no token blacklisting. If a token is stolen, it cannot be revoked until its 30-day expiry. A token revocation list or shorter expiry with refresh tokens would improve security.
- The `dialog-table.js` references `$$()`, a shorthand selector, that is not defined within that file. It depends on a global defined elsewhere (`assets/js/functions.js`), creating an implicit dependency that could break silently.

**Are there any poorly implemented functions?**
- In `hourpicker.js`, `onDoneTimepicker()` uses `hours > 0` and `minutes > 0` to decide whether to zero-pad (line 120). If the user enters `0` for hours, it correctly shows `00`, but if `currentInput.hour` is `null` (user never typed), the concatenation `'0' + null` produces `"0null"`. No null guard exists.

**Could they add any related functions the user would like?**
- A "Save Calculation" button for the mortgage calculator (the DB schema supports `saved_calculations` but no UI surface was found).
- Property comparison feature (side-by-side listing view).

---

## 2. Assess Readability

**Can you easily identify code block start and end points?**
Yes. The backend files (`app.js`, `authRoutes.js`) use clear section banners (`// ── Section ──`) and are well-indented. Frontend JS files are consistently indented with tabs and follow a logical top-to-bottom flow.

**Can lines fit on a standard screen?**
Mostly yes. The `all-calculators.js` file is a single minified line (line 1 is ~20,000+ characters of JSON). While this is intentional for a data file, it is completely unreadable. It should either be a `.json` file or formatted across multiple lines.

**Does the code speak for itself?**
The backend is strong here — JSDoc comments on every function and section dividers make intent clear. Frontend utility files (`fractions.js`, `dropdown-icon.js`) have no comments, relying entirely on self-explanatory code, which mostly works but struggles in edge-case logic (e.g., `buildFrac`'s sign logic in `fractions.js` line 12 is non-obvious).

**Does it prioritize clarity and brevity?**
Generally yes. A few exceptions:
- `dropdown-icon.js` line 23 has a duplicate statement: `element.classList.remove('tab--active')` appears twice in a row (lines 22–23) with no effect from the second call.
- `chart.js` has a full copy of `customDataLabels` object defined twice — once on lines 82–102 and again on lines 116–136 inside `switchTheme()`. The duplication is unnecessary.

**Does it avoid obscure language?**
Yes. The code uses standard vanilla JavaScript throughout with no unusual patterns.

**Can you discern the role of specific functions/methods?**
Yes, for backend files. Frontend utility files are small and readable. The main `assets/app.js` is large (the SPA router) and would benefit from being split into page modules.

**Did the dev break the code into easy-to-understand chunks?**
The backend is well-modularized (separate route files per domain: auth, listings, subscriptions, chat, AI). The frontend is a single large `app.js` which handles routing, auth, all page renders, and all API calls — this is the weakest area for readability.

---

## 3. Test Maintainability

**Is the code easy to test and debug?**
- The backend is moderately testable — Express routes are pure HTTP handlers, and MongoDB is abstracted behind `mongo.js`. However, the `initialized` flag in `authRoutes.js` (line 26) is module-level state, which makes unit testing with mocks harder (tests cannot reset it between runs).
- There are no test files present in the repository.

**Can you configure the code to quickly change data values?**
Yes, for the backend — `JWT_SECRET`, `MONGODB_URI`, and other secrets are read from environment variables via `dotenv`. The `all-calculators.js` data array is a separate file, making calculator catalog updates easy without touching logic.

**Is the code tied to another system or an outdated program?**
- Leaflet is loaded from `unpkg.com` via CDN (index.html lines 32–39) with Subresource Integrity (SRI) hashes — this is good practice. Chart.js is loaded from a local copy, which is also fine.
- The backend uses `sql.js` (found in node_modules) alongside MongoDB — evidence of a past SQLite implementation that has been replaced. The `backend/src/db.js` file should be checked to confirm the old DB code is not still referenced.

**Does the code rely on functions or technology you want to phase out?**
The `backend/cleanup-duplicates.js` file still exists at the repo root, suggesting a one-time data migration script that was never removed. This is leftover tooling that should be cleaned up.

---

## 4. Check for Security Vulnerabilities

**Does the code use outdated tools or ones with known security problems?**
All major dependencies (`express`, `bcryptjs`, `jsonwebtoken`) appear current. `bcrypt` is used with a work factor of 10 (line 134 of `authRoutes.js`), which is appropriate.

**Do you see vulnerabilities if you wanted to steal data or access a system?**
- **Wildcard CORS** (app.js lines 44–55): The CORS middleware reflects whatever `Origin` header is sent by the client. With `Access-Control-Allow-Credentials: true` and a reflected origin, any site can make credentialed cross-origin requests. This should be replaced with an explicit allowlist of known origins.
- **JWT in localStorage** (assets/app.js line 21): Storing the JWT in `localStorage` exposes it to any JavaScript on the page (XSS risk). `HttpOnly` cookies are the recommended alternative.
- **No rate limiting**: The `/api/auth/login` endpoint has no brute-force protection. An attacker can attempt unlimited password guesses.

**Does the code leverage authentication and authorization for security?**
Yes — the `authenticateToken` middleware in `authRoutes.js` correctly verifies JWTs before protected routes. The `requireAuth.js` middleware file exists for route-level enforcement.

**Is the user's input sanitized to prevent security attacks?**
- The backend uses MongoDB, which is not vulnerable to SQL injection by design. However, user-supplied data (`name`, `email`) is stored directly in MongoDB without trimming, length validation, or format enforcement (e.g., no email format check on registration).
- On the frontend, HTML is injected via `.innerHTML` in `hourpicker.js` (line 17–49) using template literals that include `VALUE[0]` (derived from a user-typed input field value). If this value contained HTML tags, it would be rendered — a potential XSS vector.

**Does the code securely store user data?**
Passwords are hashed with bcrypt (good). The JWT secret falls back to `"your-secret-key-change-in-production"` if `JWT_SECRET` is not set (authRoutes.js line 23) — in a real deployment this default would be a critical flaw, though the comment acknowledges it.

**GDPR — N/A per checklist instructions.**

---

## 5. Consider Speed and Performance

**Does the code contain inefficient string concatenations, logging, or object allocations?**
- In `chart.js`, calling `donutBig.destroy()` and recreating the entire chart on every theme switch (lines 113–148) is expensive. Chart.js supports updating colors without destroying the instance. The `customDataLabels` plugin object is also recreated on every theme switch unnecessarily.
- `all-calculators.js` is a 200+ entry array parsed fresh on every page load. For a data-heavy SPA, this is acceptable but could be lazy-loaded.

**Can you see duplicate code you don't need?**
- `customDataLabels` in `chart.js` is defined identically in two places (lines 82–102 and 116–136).
- `datepicker.js` initializes two pickers (US format and ISO format) with identical configuration except `dateFormat`. The shared config could be extracted into a variable.
- In `dropdown-icon.js`, line 23 has a redundant duplicate: `element.classList.remove('tab--active')` called back-to-back.

**Will the program negatively affect system performance overall?**
- A `window.addEventListener('click', ...)` listener is added inside `DROPDOWN_WRAPPER.forEach(...)` (dropdown-icon.js line 33). If there are N dropdowns, N click listeners are added to the window — all firing on every click. This should be a single delegated listener.
- In `hourpicker.js`, `window.addEventListener('keydown', onDoneTimepickerEnter)` is added each time a timepicker opens (line 96) but is only removed on done/cancel. If the timepicker is opened and the user clicks outside to close it, the keydown listener leaks.

**Does the code rely on poorly optimized assets or multiple API requests?**
The SPA calls `/api/auth/me` on every page load to restore auth state. This is one extra round-trip per navigation — acceptable for a small app but could be avoided by decoding the JWT client-side for display purposes.

---

## 6. Confirm Adequate Documentation

**Does the documentation explain the code's purpose?**
- The backend files (`app.js`, `authRoutes.js`) have excellent JSDoc headers describing the file's role, all endpoints, and parameters.
- `index.html` has a detailed comment block at the top (lines 1–20) explaining the SPA shell structure.
- Frontend utility files (`fractions.js`, `dropdown-icon.js`, `dialog-table.js`, `datepicker.js`) have **no documentation at all**. Their purpose must be inferred from the code.

**Does the documentation teach the user how to use the code?**
No setup documentation (README) was found at the project root. The backend has a `README.md` in node_modules but no project-level setup guide covering how to run the app, required environment variables, or how to seed the database.

**Do any new features or code changes warrant additional documentation?**
The AI routes (`aiRoutes.js`, `chatRoutes.js`), subscription system, and trial management are features that would benefit from documentation of their expected behavior and API contracts.

**Is the documentation clear and well written?**
Where it exists (backend), yes — it is well-structured and professional. The gap is the complete absence of documentation in the frontend utility layer.

---

## 7. Inspect Naming Conventions

**Have you reviewed variable, constant, class field, and method names?**
Yes.

**Are the names simple and legible?**
Mostly yes. Some exceptions:
- `mongo` as a namespace object (in `db/mongo.js`) is fine but could be confused with the MongoDB client itself.
- `frac` in `fractions.js` is abbreviated but context makes it clear.
- `TIMEPICKER`, `DROPDOWN_WRAPPER`, etc. — all-caps names are used for DOM query results (not actual constants). JavaScript convention reserves ALL_CAPS for true constants (primitive values that never change). These are mutable references.

**Do the names fit a consistent naming convention?**
Mostly — the project mixes conventions:
- Backend: `camelCase` for functions, `SCREAMING_SNAKE` for environment-derived constants (appropriate).
- Frontend: `SCREAMING_SNAKE` for DOM element references (e.g., `DROPDOWN_WRAPPER`, `TIMEPICKER_DONE`) — unconventional and inconsistent with standard JS practice of using `camelCase` for `const` DOM references.

**Do the names convey what a function or variable is?**
Yes, for the most part. `ensureInitialized()`, `generateToken()`, `loadSubscriptionSnapshot()`, `refreshMe()` — all are self-explanatory. `setValue` in `dropdown-icon.js` is slightly vague (sets the value of what?), but its context in the file makes it clear.

**Do the names explain the context or scope of the overall codebase?**
The file names are clear and domain-appropriate: `authRoutes.js`, `listingRoutes.js`, `subscriptionRoutes.js`. Frontend files like `fractions.js` and `hourpicker.js` are narrow in scope and named correctly.

---

## Summary Table

| Checklist Item            | Status     | Key Issues |
|---------------------------|------------|------------|
| 1. Feature Requirements   | ✅ Good    | Minor gaps: no save-calc UI, logout not server-enforced |
| 2. Readability            | ⚠️ Mixed   | Excellent backend, monolithic frontend `app.js`, no-comment utilities |
| 3. Maintainability        | ⚠️ Mixed   | No tests, leftover migration script, module-level state |
| 4. Security               | ⚠️ Concerns | Wildcard CORS + credentials, JWT in localStorage, no rate limiting, innerHTML XSS risk |
| 5. Speed & Performance    | ⚠️ Mixed   | Duplicate chart plugin, N window listeners for N dropdowns, keydown listener leak |
| 6. Documentation          | ⚠️ Mixed   | Backend well-documented; no project README, no frontend utility docs |
| 7. Naming Conventions     | ✅ Good    | Consistent, readable; minor issue with SCREAMING_SNAKE for DOM refs |

---

## Top Recommendations

1. **Fix the CORS policy** — replace the reflected-origin approach with an explicit allowlist.
2. **Move JWT to HttpOnly cookie** — eliminates XSS token theft risk.
3. **Add rate limiting to `/api/auth/login`** — prevent brute-force attacks.
4. **Fix the innerHTML XSS risk** in `hourpicker.js` — sanitize or use `textContent` / `createElement` instead of template literal injection.
5. **Deduplicate `customDataLabels`** in `chart.js` — extract to a shared function.
6. **Fix the N-listeners bug** in `dropdown-icon.js` — use a single delegated window listener.
7. **Add a project-level README** with setup instructions and environment variable documentation.
8. **Add at least smoke tests** for the auth routes to prevent regressions.
