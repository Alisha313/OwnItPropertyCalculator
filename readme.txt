=== OwnIt Property Calculator ===
CPS 4982 — Summer I 2026

Full documentation: see README.md in this folder.

== What it is ==

A Node.js + MongoDB property platform with:
- Customer site (listings, mortgage/rental/rent-vs-buy calculators, home value estimator, AI chat)
- Agent portal (CRM pipeline, listings, home values, showings, inbox)

== Quick start ==

1. cd backend && npm install
2. Copy environment variables into backend/.env (see README.md)
3. npm run dev
4. Open http://localhost:3000 (customer) or http://localhost:3000/agent.html (agents)

== Main routes (customer) ==

#/          Home
#/sales     Sales listings
#/rentals   Rental listings
#/mortgage  Calculators
#/sell      Home value estimator
#/auth      Login / register
#/subscription  Plans and appointments

== License ==

Academic / course project.
