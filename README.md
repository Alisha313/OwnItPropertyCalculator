# OwnIt Property Calculator

A full-stack property platform for browsing listings, running mortgage and rental calculators, estimating home values, and managing leads through an agent CRM. Built a student-friendly real estate web application.

The customer site is a vanilla JavaScript SPA served by the Express backend. The agent portal is a separate SPA on the same server.

---

## Live URLs (local)

| App | URL |
|-----|-----|
| Customer site | [http://localhost:3000](http://localhost:3000) |
| Agent portal | [http://localhost:3000/agent.html](http://localhost:3000/agent.html) |

Use the **backend on port 3000** — not the Vite dev server in `frontend/` (that folder is an unused scaffold).

---

## Features

### Customer site (`index.html` + `assets/app.js`)

| Page | Route | Description |
|------|-------|-------------|
| Home | `#/` | Hero, interactive US map, featured listings, quick filters |
| Sales | `#/sales` | Filterable sale listings with cards and map |
| Rentals | `#/rentals` | Filterable rental listings |
| Mortgage | `#/mortgage` | Mortgage, rental affordability, and rent-vs-buy calculators with amortization |
| Sell | `#/sell` | “What's My Home Worth?” — estimate, comps, market trend chart, net proceeds |
| Listing detail | `#/listing/:id` | Photos, stats, mortgage/rental shortcuts, agent chat, book a viewing |
| Auth | `#/auth` | Register and login (JWT stored in `localStorage`) |
| Subscription | `#/subscription` | Trial, plans, payment method (demo), appointments |
| Agent chat | `#/agent-chat` | Direct messaging with a human agent (subscription required) |
| Contact | `#/contact` | Support info |

**Also included**

- Light / dark theme (persisted in `localStorage`)
- Floating AI chat widget (Groq or OpenAI) with map, trends, and valuation tools
- Price-reduction badges on discounted listings
- Leaflet map with state choropleth and listing markers
- Chart.js market trend charts on listing and sell pages

### Agent portal (`agent.html` + `assets/agent-portal.js`)

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `#/` | Stats, action queue, recent leads |
| Clients | `#/leads` | Drag-and-drop CRM pipeline |
| Inbox | `#/chats` | AI and human customer conversations |
| Listings | `#/listings` | Manage sale/rental inventory, apply price reductions |
| Home Values | `#/home-values` | Run valuations, view seller leads, market comparison |
| Showings | `#/appointments` | Calendar and viewing requests from customers |
| Settings | `#/settings` | Agent profile |

Seller leads from `#/sell` appear in the pipeline with a **Seller** tag and property details in the lead drawer.

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| Frontend | HTML, CSS, vanilla ES modules (`assets/app.js`, `assets/agent-portal.js`) |
| Maps / charts | Leaflet, Chart.js |
| Backend | Node.js, Express |
| Database | MongoDB Atlas (`backend/src/db/mongo.js`) |
| Auth | JWT (`jsonwebtoken`), `bcryptjs` for passwords |
| AI chat | Groq API (preferred) or OpenAI via `openai` SDK |
| Valuation | Rules-based service (`backend/src/services/valuationService.js`) using listings + market trend data |

---

## Project structure

```
OwnItPropertyCalculator/
├── index.html              # Customer SPA shell
├── agent.html              # Agent portal shell
├── assets/
│   ├── app.js              # Customer router, pages, API client
│   ├── app.css             # Global styles + theme
│   ├── agent-portal.js     # Agent router and CRM UI
│   └── agent-portal.css    # Agent shell styles
├── backend/
│   ├── server.js           # HTTP server entry
│   ├── src/
│   │   ├── app.js          # Express app, static files, API mounts
│   │   ├── db/mongo.js     # MongoDB connection, seed data, indexes
│   │   ├── services/
│   │   │   └── valuationService.js
│   │   └── routes/         # auth, listings, chat, ai, subscriptions, agent/*
│   └── package.json
├── frontend/               # Unused Vite/React scaffold (not the main app)
├── CODE_REVIEW.md          # Code review notes
└── README.md               # This file
```

---

## Getting started

### Prerequisites

- Node.js 18+
- MongoDB Atlas cluster (or compatible URI)
- Optional: [Groq](https://console.groq.com/) API key for AI chat

### 1. Install backend dependencies

```bash
cd backend
npm install
```

### 2. Environment variables

Create `backend/.env`:

```env
PORT=3000
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/?appName=ownit

# AI chat (at least one recommended)
GROQ_API_KEY=your_groq_api_key
# GROQ_CHAT_MODEL=llama-3.1-8b-instant

# Optional OpenAI fallback
# OPENAI_API_KEY=your_openai_key
```

### 3. Run the server

```bash
cd backend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The server seeds sample listings on first API use if the database is empty.

### 4. Agent access

1. Open [http://localhost:3000/agent.html](http://localhost:3000/agent.html)
2. Register an agent account from the login screen
3. Use the portal to manage leads, listings, and home-value estimates

---

## API overview

| Prefix | Purpose |
|--------|---------|
| `/api/auth` | Register, login, logout, `me` |
| `/api/listings` | Public listings (filter, map, detail) |
| `/api/subscriptions` | Plans, trial, billing (demo) |
| `/api/chat` | AI chat session and messages (incl. SSE stream) |
| `/api/human-chat` | Customer ↔ agent messaging |
| `/api/appointments` | Viewing requests |
| `/api/ai` | Valuation, market trends, home-value estimate, seller lead |
| `/api/agent/*` | Dashboard, leads, listings, discounts, chats, appointments, analytics, etc. |

**Home value endpoints**

- `POST /api/ai/home-value` — public estimate from city, state, sqft, beds/baths, etc.
- `POST /api/ai/home-value/request-agent` — authenticated; creates a seller lead for agents

---

## Development notes

- **Routing:** Hash-based (`#/sales`, `#/sell`, …). Initial `render()` runs at the end of `app.js` so sell-page helpers load first.
- **Static assets:** Served from `/assets` by Express; customer pages load `assets/app.js` as `type="module"`.
- **Theme:** `html.light` / `html.dark` on `<html>`; shared between customer and agent sites.
- **Tests:** No automated test suite in the repo yet; see `CODE_REVIEW.md` for review notes.


