/**
 * @file agent-portal.js
 * @project OwnIt Property Calculator — Agent Portal CRM
 */

let currentUser = null;
let authToken = localStorage.getItem("token");
let leadsCache = [];
let listingsMap = {};
let activeSessionId = null;
let chatPollInterval = null;
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();

const STAGES = ["new", "contacted", "viewing_scheduled", "offer_made", "closed"];

const STAGE_META = {
  new: { name: "New Lead", short: "New", color: "#3b82f6", icon: "★" },
  contacted: { name: "In Contact", short: "Contact", color: "#f59e0b", icon: "☎" },
  viewing_scheduled: { name: "Showing Set", short: "Showing", color: "#8b5cf6", icon: "🏠" },
  offer_made: { name: "Offer Stage", short: "Offer", color: "#10b981", icon: "📋" },
  closed: { name: "Closed", short: "Closed", color: "#6b7280", icon: "✓" },
};

const STAGE_HELP = {
  new: "Fresh inquiry — drag to move or tap a card to follow up.",
  contacted: "You've reached out. Next step: schedule a showing.",
  viewing_scheduled: "Tour on the books — check Calendar.",
  offer_made: "Buyer is negotiating or submitted an offer.",
  closed: "Deal done — won or lost.",
};

const PAGE_TITLES = {
  "/": "Dashboard",
  "/leads": "Clients",
  "/listings": "My Listings",
  "/listings/new": "New Listing",
  "/home-values": "Home Values",
  "/chats": "Inbox",
  "/appointments": "Showings",
  "/settings": "Settings",
};

const routes = {
  "/": DashboardPage,
  "/leads": LeadsPage,
  "/listings": ListingsPage,
  "/listings/new": () => ListingFormPage(),
  "/home-values": HomeValuesPage,
  "/chats": ChatsPage,
  "/appointments": AppointmentsPage,
  "/settings": SettingsPage,
};

function saveToken(token) {
  authToken = token;
  localStorage.setItem("token", token);
}

function clearToken() {
  authToken = null;
  localStorage.removeItem("token");
}

async function apiFetch(url, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(url, { credentials: "include", headers, ...options });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data;
}

function setUser(user) {
  currentUser = user;
  syncAuthUI();
}

async function refreshMe() {
  try {
    const data = await apiFetch("/api/auth/me", { method: "GET" });
    if (data.user && data.user.role === "agent") {
      setUser(data.user);
    } else {
      setUser(null);
      showLoginPage();
    }
  } catch {
    setUser(null);
    showLoginPage();
  }
}

async function logout() {
  try { await apiFetch("/api/auth/logout", { method: "POST" }); } catch {}
  clearToken();
  setUser(null);
  closeLeadDrawer();
  showLoginPage();
}

function syncAuthUI() {
  const shell = document.getElementById("agentShell");
  const badge = document.getElementById("userBadge");
  const logoutBtn = document.getElementById("logoutBtn");
  if (currentUser) {
    shell?.classList.remove("agent-shell--login");
    badge.textContent = currentUser.name;
    badge.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    refreshSidebarBadges();
  } else {
    shell?.classList.add("agent-shell--login");
    badge.classList.add("hidden");
    logoutBtn.classList.add("hidden");
  }
}

function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `agent-toast agent-toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function renderPageShell(title, actionsHtml, bodyHtml) {
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">${title}</h2>
      ${actionsHtml ? `<div class="page-actions">${actionsHtml}</div>` : ""}
    </div>
    ${bodyHtml}
  `;
  return el;
}

function setPageTitle(path) {
  const titleEl = document.getElementById("pageTitle");
  if (titleEl) titleEl.textContent = PAGE_TITLES[path] || "Agent Portal";
}

function setActiveNav(path) {
  document.querySelectorAll(".agent-sidebar__link[data-nav]").forEach(a => {
    a.classList.toggle("active", a.getAttribute("data-nav") === path);
  });
}

async function refreshSidebarBadges() {
  if (!currentUser) return;
  try {
    const data = await apiFetch("/api/agent/dashboard/summary");
    setSidebarBadges({
      newLeads: data.new_leads,
      unreadChats: data.human_chats,
      pendingAppts: data.pending_appointments,
    });
  } catch {}
}

function setSidebarBadges({ newLeads, unreadChats, pendingAppts }) {
  const setBadge = (key, val) => {
    const el = document.querySelector(`[data-badge="${key}"]`);
    if (!el) return;
    if (val > 0) {
      el.textContent = val > 99 ? "99+" : String(val);
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  };
  setBadge("leads", newLeads || 0);
  setBadge("chats", unreadChats || 0);
  setBadge("appointments", pendingAppts || 0);
}

async function loadListingsMap() {
  try {
    const data = await apiFetch("/api/agent/listings");
    listingsMap = {};
    for (const l of data.listings || []) {
      listingsMap[l.id] = `${l.address}, ${l.city}, ${l.state}`;
    }
  } catch {}
}

function listingLabel(id) {
  if (!id) return "—";
  return listingsMap[id] || id;
}

function stopChatPolling() {
  if (chatPollInterval) {
    clearInterval(chatPollInterval);
    chatPollInterval = null;
  }
}

function ensureLeadDrawerDOM() {
  const root = document.getElementById("leadDrawerRoot");
  if (root.children.length) return;
  root.innerHTML = `
    <div class="lead-drawer-backdrop" id="leadDrawerBackdrop"></div>
    <div class="lead-drawer" id="leadDrawer">
      <div class="lead-drawer__header">
        <div id="leadDrawerHeader"></div>
        <button type="button" class="lead-drawer__close" id="leadDrawerClose" aria-label="Close">&times;</button>
      </div>
      <div class="lead-drawer__body" id="leadDrawerBody">
        <div class="agent-loading agent-loading--skeleton"></div>
      </div>
    </div>`;
  document.getElementById("leadDrawerClose").addEventListener("click", closeLeadDrawer);
  document.getElementById("leadDrawerBackdrop").addEventListener("click", closeLeadDrawer);
}

function openLeadDrawer(leadId) {
  ensureLeadDrawerDOM();
  document.getElementById("leadDrawer").classList.add("lead-drawer--open");
  document.getElementById("leadDrawerBackdrop").classList.add("lead-drawer-backdrop--open");
  loadLeadDrawer(leadId);
}

function closeLeadDrawer() {
  document.getElementById("leadDrawer")?.classList.remove("lead-drawer--open");
  document.getElementById("leadDrawerBackdrop")?.classList.remove("lead-drawer-backdrop--open");
}

async function loadLeadDrawer(id) {
  const header = document.getElementById("leadDrawerHeader");
  const body = document.getElementById("leadDrawerBody");
  if (!header || !body) return;
  body.innerHTML = `<div class="agent-loading agent-loading--skeleton"></div>`;
  try {
    const data = await apiFetch(`/api/agent/leads/${id}`);
    const lead = data.lead;
    const notes = data.notes || [];
    const calcRuns = data.calculator_runs || [];
    const messages = data.messages || [];
    header.innerHTML = `
      <div>
        <h2 style="margin:0 0 0.25rem;font-size:1.1rem;">${esc(lead.user_name)}</h2>
        <p style="margin:0;opacity:0.6;font-size:0.85rem;">${esc(lead.user_email)} &middot; since ${fmtDate(lead.created_at)}</p>
      </div>`;
    body.innerHTML = `
      <div class="lead-drawer__section">
        <h3>Pipeline Stage</h3>
        <div class="stage-track" id="drawerStageTrack">
          ${STAGES.map((s, i) => {
            const active = s === lead.stage;
            const passed = STAGES.indexOf(lead.stage) > i;
            return `<button type="button" class="stage-track__step ${active ? "stage-track__step--active" : ""} ${passed ? "stage-track__step--done" : ""}" data-stage="${s}" style="--step-color:${STAGE_META[s].color}">
              <span class="stage-track__dot">${STAGE_META[s].icon}</span>
              <span class="stage-track__label">${STAGE_META[s].short}</span>
            </button>${i < STAGES.length - 1 ? '<span class="stage-track__line"></span>' : ""}`;
          }).join("")}
        </div>
        <div class="stage-actions">
          ${STAGES.indexOf(lead.stage) > 0 ? `<button type="button" class="btn btn--ghost btn-sm" id="drawerStageBack">← Move Back</button>` : ""}
          ${STAGES.indexOf(lead.stage) < STAGES.length - 1 ? `<button type="button" class="btn btn--primary btn-sm" id="drawerStageNext">Advance to ${STAGE_META[STAGES[STAGES.indexOf(lead.stage) + 1]].name} →</button>` : ""}
        </div>
        ${lead.source_listing_label ? `<p class="lead-drawer__source">Interested in: ${esc(lead.source_listing_label)}</p>` : ""}
      </div>
      ${lead.source === "seller_valuation" && lead.seller_property ? `
      <div class="lead-drawer__section">
        <h3>Seller Property</h3>
        <div class="seller-detail">
          ${lead.seller_property.address ? `<div class="seller-detail__row"><span>Address</span><b>${esc(lead.seller_property.address)}</b></div>` : ""}
          <div class="seller-detail__row"><span>Location</span><b>${esc(lead.seller_property.city || "")}, ${esc(lead.seller_property.state || "")}</b></div>
          <div class="seller-detail__row"><span>Size</span><b>${lead.seller_property.sqft ? Number(lead.seller_property.sqft).toLocaleString() + " sqft" : "—"}</b></div>
          <div class="seller-detail__row"><span>Beds / Baths</span><b>${lead.seller_property.bedrooms || "—"} / ${lead.seller_property.bathrooms || "—"}</b></div>
          <div class="seller-detail__row"><span>Year Built</span><b>${lead.seller_property.year_built || "—"}</b></div>
          ${lead.seller_estimate ? `<div class="seller-detail__row"><span>OwnIt estimate</span><b>${moneyFmt(lead.seller_estimate)}</b></div>` : ""}
        </div>
        <button type="button" class="btn btn--primary btn-sm" id="drawerCreateListing" style="margin-top:10px;">Create listing from this home</button>
      </div>` : ""}
      <div class="lead-drawer__section">
        <h3>Chat History</h3>
        <div class="lead-drawer__chat" id="drawerChat">
          ${messages.length === 0 ? "<p style='opacity:0.5;margin:0;'>No messages</p>" :
            messages.map(m => `<div class="chat-msg chat-msg--${m.role === "user" ? "user" : "agent"}">${esc(m.content)}</div>`).join("")}
        </div>
      </div>
      <div class="lead-drawer__section">
        <h3>Calculator Runs</h3>
        ${calcRuns.length === 0 ? "<p style='opacity:0.5;margin:0;'>No calculator runs</p>" :
          `<table class="agent-table"><thead><tr><th>Listing</th><th>Price</th><th>Date</th></tr></thead><tbody>
          ${calcRuns.map(c => `<tr><td>${esc(listingLabel(c.listing_id))}</td><td>$${(c.purchase_price||0).toLocaleString()}</td><td>${fmtDate(c.created_at)}</td></tr>`).join("")}
          </tbody></table>`}
      </div>
      <div class="lead-drawer__section">
        <h3>Agent Notes</h3>
        <div id="drawerNotesList">
          ${notes.map(n => `<div style="padding:0.5rem 0;border-bottom:1px solid var(--border,rgba(255,255,255,0.06));">
            <div style="font-size:0.85rem;">${esc(n.content)}</div>
            <div style="font-size:0.7rem;opacity:0.5;">${fmtDate(n.created_at)}</div>
          </div>`).join("") || "<p style='opacity:0.5;margin:0;'>No notes yet</p>"}
        </div>
        <div class="lead-drawer__note-input">
          <input id="drawerNoteInput" placeholder="Add a note..." />
          <button id="drawerAddNoteBtn" class="btn btn--primary">Add</button>
        </div>
      </div>`;
    const chatEl = body.querySelector("#drawerChat");
    if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;

    async function updateLeadStage(newStage) {
      await apiFetch(`/api/agent/leads/${id}/stage`, { method: "PATCH", body: JSON.stringify({ stage: newStage }) });
      const idx = leadsCache.findIndex(l => String(l._id) === String(id));
      if (idx >= 0) leadsCache[idx].stage = newStage;
      showToast(`Moved to ${STAGE_META[newStage].name}`);
      refreshSidebarBadges();
      loadLeadDrawer(id);
    }

    body.querySelectorAll(".stage-track__step").forEach(btn => {
      btn.addEventListener("click", () => updateLeadStage(btn.dataset.stage).catch(err => showToast(err.message, "error")));
    });
    body.querySelector("#drawerStageBack")?.addEventListener("click", () => {
      const i = STAGES.indexOf(lead.stage);
      if (i > 0) updateLeadStage(STAGES[i - 1]).catch(err => showToast(err.message, "error"));
    });
    body.querySelector("#drawerStageNext")?.addEventListener("click", () => {
      const i = STAGES.indexOf(lead.stage);
      if (i < STAGES.length - 1) updateLeadStage(STAGES[i + 1]).catch(err => showToast(err.message, "error"));
    });

    body.querySelector("#drawerCreateListing")?.addEventListener("click", () => {
      const p = lead.seller_property || {};
      const params = new URLSearchParams();
      if (p.address) params.set("address", p.address);
      if (p.city) params.set("city", p.city);
      if (p.state) params.set("state", p.state);
      if (p.sqft) params.set("sqft", p.sqft);
      if (p.bedrooms) params.set("bedrooms", p.bedrooms);
      if (p.bathrooms) params.set("bathrooms", p.bathrooms);
      if (p.year_built) params.set("year_built", p.year_built);
      if (p.property_type) params.set("type", p.property_type);
      if (lead.seller_estimate) params.set("price", lead.seller_estimate);
      closeLeadDrawer();
      location.hash = `#/listings/new?${params.toString()}`;
    });

    body.querySelector("#drawerAddNoteBtn").addEventListener("click", async () => {
      const input = body.querySelector("#drawerNoteInput");
      const content = input.value.trim();
      if (!content) return;
      try {
        await apiFetch(`/api/agent/leads/${id}/notes`, { method: "POST", body: JSON.stringify({ content }) });
        input.value = "";
        showToast("Note added");
        loadLeadDrawer(id);
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  } catch {
    body.innerHTML = `<p class="agent-empty">Failed to load lead details.</p>`;
  }
}

function applyTheme(theme) {
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme === "light" ? "light" : "dark");
  localStorage.setItem("theme", theme);
}

applyTheme(localStorage.getItem("theme") || "dark");

document.getElementById("themeToggle").addEventListener("click", () => {
  applyTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");
});

document.getElementById("sidebarToggle")?.addEventListener("click", () => {
  document.getElementById("agentSidebar")?.classList.toggle("agent-sidebar--open");
  document.getElementById("sidebarBackdrop")?.classList.toggle("agent-sidebar-backdrop--visible");
});

document.getElementById("sidebarBackdrop")?.addEventListener("click", () => {
  document.getElementById("agentSidebar")?.classList.remove("agent-sidebar--open");
  document.getElementById("sidebarBackdrop")?.classList.remove("agent-sidebar-backdrop--visible");
});

window.addEventListener("hashchange", render);
document.getElementById("logoutBtn").addEventListener("click", logout);

async function boot() {
  await loadListingsMap();
  await refreshMe();
  if (currentUser) render();
}

boot();

function render() {
  stopChatPolling();
  if (!currentUser) { showLoginPage(); return; }

  const hash = location.hash || "#/";
  const fullPath = hash.replace("#", "");
  const [path, queryStr] = fullPath.split("?");
  const navPath = path || "/";

  if (navPath === "/analytics") {
    location.replace("#/");
    return;
  }

  const leadMatch = navPath.match(/^\/leads\/([^/]+)$/);
  const listingEditMatch = navPath.match(/^\/listings\/([^/]+)\/edit$/);

  let pageFn;
  let activePath = navPath;

  if (leadMatch) {
    pageFn = LeadsPage;
    activePath = "/leads";
    setTimeout(() => openLeadDrawer(leadMatch[1]), 0);
  } else if (listingEditMatch) {
    pageFn = () => ListingFormPage(listingEditMatch[1]);
    activePath = "/listings";
  } else {
    pageFn = routes[navPath] || NotFoundPage;
  }

  setActiveNav(activePath);
  setPageTitle(listingEditMatch ? "/listings/new" : activePath);

  const app = document.getElementById("app");
  app.innerHTML = "";
  app.appendChild(pageFn());

  const params = new URLSearchParams(queryStr || "");
  const openId = params.get("open");
  if (openId && navPath === "/leads") setTimeout(() => openLeadDrawer(openId), 0);

  refreshSidebarBadges();
}

function showLoginPage() {
  closeLeadDrawer();
  const app = document.getElementById("app");
  app.innerHTML = "";
  const el = document.createElement("div");
  el.className = "agent-login-wrap";
  el.innerHTML = `
    <h1>Agent Login</h1>
    <form id="agentLoginForm" class="agent-form">
      <div class="form-group"><label>Email</label><input type="email" id="loginEmail" required /></div>
      <div class="form-group"><label>Password</label><input type="password" id="loginPassword" required /></div>
      <div id="loginError" class="agent-login-error"></div>
      <button type="submit" class="btn btn--primary">Login</button>
    </form>
    <p class="agent-login-footer">Need an agent account? <a href="#" id="showRegister">Register here</a></p>
    <form id="agentRegisterForm" class="agent-form" style="display:none;margin-top:1.5rem;">
      <h2 style="margin-bottom:1rem;">Agent Registration</h2>
      <div class="form-group"><label>Name</label><input type="text" id="regName" required /></div>
      <div class="form-group"><label>Email</label><input type="email" id="regEmail" required /></div>
      <div class="form-group"><label>Password</label><input type="password" id="regPassword" required /></div>
      <div id="regError" class="agent-login-error"></div>
      <button type="submit" class="btn btn--primary">Register as Agent</button>
    </form>`;
  app.appendChild(el);

  el.querySelector("#showRegister").addEventListener("click", (e) => {
    e.preventDefault();
    el.querySelector("#agentRegisterForm").style.display = "block";
  });

  el.querySelector("#agentLoginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: el.querySelector("#loginEmail").value, password: el.querySelector("#loginPassword").value }),
      });
      if (data.user.role !== "agent") {
        el.querySelector("#loginError").textContent = "This account is not an agent account.";
        return;
      }
      saveToken(data.token);
      setUser(data.user);
      render();
    } catch (err) {
      el.querySelector("#loginError").textContent = err.message;
    }
  });

  el.querySelector("#agentRegisterForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: el.querySelector("#regName").value,
          email: el.querySelector("#regEmail").value,
          password: el.querySelector("#regPassword").value,
          role: "agent",
        }),
      });
      saveToken(data.token);
      setUser(data.user);
      render();
    } catch (err) {
      el.querySelector("#regError").textContent = err.message;
    }
  });
}

function DashboardPage() {
  const firstName = esc((currentUser?.name || "Agent").split(" ")[0]);
  const el = renderPageShell("Dashboard", "", `
    <div class="dash-hero">
      <div class="dash-hero__glow" aria-hidden="true"></div>
      <div class="dash-hero__content">
        <p class="dash-hero__eyebrow">Your command center</p>
        <h2 class="dash-hero__title">Welcome back, ${firstName}</h2>
        <p class="dash-hero__sub">Track leads, chats, and showings at a glance.</p>
      </div>
      <div class="dash-hero__orb dash-hero__orb--1" aria-hidden="true"></div>
      <div class="dash-hero__orb dash-hero__orb--2" aria-hidden="true"></div>
    </div>
    <div class="dash-grid" id="dashStats">
      <div class="dash-card dash-card--leads">
        <div class="dash-card__icon" aria-hidden="true">★</div>
        <div class="dash-card__label">New Leads</div>
        <div class="dash-card__value" id="statLeads">—</div>
      </div>
      <div class="dash-card dash-card--chats">
        <div class="dash-card__icon" aria-hidden="true">💬</div>
        <div class="dash-card__label">Live Chats</div>
        <div class="dash-card__value" id="statChats">—</div>
      </div>
      <div class="dash-card dash-card--appts">
        <div class="dash-card__icon" aria-hidden="true">📅</div>
        <div class="dash-card__label">Upcoming Viewings</div>
        <div class="dash-card__value" id="statAppts">—</div>
      </div>
      <div class="dash-card dash-card--listings">
        <div class="dash-card__icon" aria-hidden="true">🏠</div>
        <div class="dash-card__label">Active Listings</div>
        <div class="dash-card__value" id="statListings">—</div>
      </div>
    </div>
    <div class="dash-layout">
      <div class="agent-card agent-card--priority">
        <h3 class="agent-card__title"><span class="agent-card__title-dot"></span>Needs Attention</h3>
        <div id="actionQueue" class="action-queue"><div class="agent-loading agent-loading--skeleton"></div></div>
      </div>
      <div class="agent-card">
        <h3 class="agent-card__title"><span class="agent-card__title-dot agent-card__title-dot--cyan"></span>Recent Leads</h3>
        <div id="recentLeads"><div class="agent-loading agent-loading--skeleton"></div></div>
      </div>
    </div>`);
  loadDashboardData(el);
  return el;
}

async function loadDashboardData(el) {
  try {
    const [summary, chats, discounts, appointments] = await Promise.all([
      apiFetch("/api/agent/dashboard/summary"),
      apiFetch("/api/agent/chats"),
      apiFetch("/api/agent/discounts").catch(() => ({ discounts: [] })),
      apiFetch("/api/agent/appointments"),
    ]);

    el.querySelector("#statLeads").textContent = summary.new_leads ?? 0;
    el.querySelector("#statChats").textContent = summary.human_chats ?? 0;
    el.querySelector("#statAppts").textContent = summary.upcoming_appointments ?? 0;
    el.querySelector("#statListings").textContent = summary.active_listings ?? 0;
    setSidebarBadges({ newLeads: summary.new_leads, unreadChats: summary.human_chats, pendingAppts: summary.pending_appointments });

    const actions = [];
    const humanSessions = (chats.sessions || []).filter(s => (s.session_type || "ai") === "human");
    if (humanSessions.length) {
      actions.push({ label: "Unanswered live chats", meta: `${humanSessions.length} conversation(s) need a reply`, action: () => { location.hash = "#/chats"; } });
    }

    const newLeads = await apiFetch("/api/agent/leads?stage=new");
    for (const lead of (newLeads.leads || []).slice(0, 5)) {
      actions.push({ label: `New lead: ${lead.user_name}`, meta: lead.user_email, action: () => openLeadDrawer(lead._id) });
    }

    const today = new Date(new Date().toDateString());
    const weekAhead = new Date(today);
    weekAhead.setDate(weekAhead.getDate() + 7);
    for (const appt of (appointments.appointments || [])) {
      if (!appt.date || appt.status === "cancelled" || appt.status === "confirmed") continue;
      const d = new Date(appt.date);
      if (d >= today && d <= weekAhead) {
        actions.push({ label: `Unconfirmed viewing: ${appt.client_name || "Client"}`, meta: `${fmtDate(appt.date)} ${appt.time || ""}`, action: () => { location.hash = "#/appointments"; } });
      }
    }

    const soonDiscounts = (discounts.discounts || []).filter(d => {
      if (!d.expires_at) return false;
      const exp = new Date(d.expires_at);
      const in7 = new Date(today);
      in7.setDate(in7.getDate() + 7);
      return exp >= today && exp <= in7;
    });
    if (soonDiscounts.length) {
      actions.push({ label: "Discounts expiring soon", meta: `${soonDiscounts.length} listing discount(s) expire within 7 days`, action: () => { location.hash = "#/listings"; } });
    }

    const queueEl = el.querySelector("#actionQueue");
    if (actions.length === 0) {
      queueEl.innerHTML = `<div class="agent-empty"><p>All caught up — no urgent items right now.</p></div>`;
    } else {
      queueEl.innerHTML = actions.slice(0, 8).map((a, i) => `
        <button type="button" class="action-item" data-action="${i}">
          <div><div class="action-item__label">${esc(a.label)}</div><div class="action-item__meta">${esc(a.meta)}</div></div>
          <span class="action-item__badge">Action</span>
        </button>`).join("");
      queueEl.querySelectorAll(".action-item").forEach((btn, i) => btn.addEventListener("click", actions[i].action));
    }

    const recentEl = el.querySelector("#recentLeads");
    const recent = summary.recent_leads || [];
    if (recent.length === 0) {
      recentEl.innerHTML = `<div class="agent-empty"><p>No leads yet.</p><p>Leads appear when users start a chat on the customer site.</p></div>`;
    } else {
      recentEl.innerHTML = `<table class="agent-table"><thead><tr><th>Name</th><th>Email</th><th>Stage</th><th>Date</th></tr></thead><tbody>
        ${recent.map(l => `<tr class="clickable" data-lead="${l._id}"><td>${esc(l.user_name)}</td><td>${esc(l.user_email)}</td>
        <td><span class="badge-status badge-status--${stageClass(l.stage)}">${stageName(l.stage)}</span></td><td>${fmtDate(l.created_at)}</td></tr>`).join("")}
        </tbody></table>`;
      recentEl.querySelectorAll("[data-lead]").forEach(row => row.addEventListener("click", () => openLeadDrawer(row.dataset.lead)));
    }
  } catch {
    el.querySelector("#actionQueue").innerHTML = `<p class="agent-empty">Failed to load dashboard.</p>`;
  }
}

function LeadsPage() {
  const el = renderPageShell("Client Pipeline", "", `
    <p class="pipeline-tip">Drag cards between columns to move clients through your deal — just like a real brokerage board.</p>
    <div id="leadsContainer"><div class="agent-loading agent-loading--skeleton"></div></div>`);
  loadLeadsData(el);
  return el;
}

async function loadLeadsData(el) {
  try {
    const data = await apiFetch("/api/agent/leads");
    leadsCache = data.leads || [];
    renderPipeline(el, leadsCache);
  } catch {
    el.querySelector("#leadsContainer").innerHTML = `<p class="agent-empty">Failed to load leads.</p>`;
  }
}

let draggedLeadId = null;

function renderPipeline(el, leads) {
  const container = el.querySelector("#leadsContainer");
  container.innerHTML = `<div class="pipeline pipeline--crm">${STAGES.map(stage => {
    const meta = STAGE_META[stage];
    const items = leads.filter(l => l.stage === stage);
    return `<div class="pipeline-col pipeline-col--${stage}" data-stage="${stage}" style="--col-accent:${meta.color}">
      <div class="pipeline-col__head">
        <span class="pipeline-col__icon">${meta.icon}</span>
        <div><div class="pipeline-col__title">${meta.name}</div><div class="pipeline-col__hint">${STAGE_HELP[stage] || ""}</div></div>
        <span class="pipeline-col__count">${items.length}</span>
      </div>
      <div class="pipeline-col__dropzone" data-stage="${stage}">
        ${items.length === 0 ? `<div class="pipeline-col__empty">Drop leads here</div>` : ""}
        ${items.map(l => `
          <div class="pipeline-card pipeline-card--draggable" draggable="true" data-lead="${l._id}" data-stage="${l.stage}">
            <div class="pipeline-card__accent"></div>
            <div class="pipeline-card__name">${esc(l.user_name)}${l.source === "seller_valuation" ? ` <span class="seller-tag">Seller</span>` : ""}</div>
            <div class="pipeline-card__meta">${esc(l.user_email)}</div>
            <div class="pipeline-card__meta">${fmtDate(l.created_at)}</div>
            ${l.source === "seller_valuation" && l.seller_property ? `<div class="pipeline-card__property">Wants to sell: ${esc(l.seller_property.city || "")}, ${esc(l.seller_property.state || "")}${l.seller_estimate ? ` · ${moneyFmt(l.seller_estimate)}` : ""}</div>` : (l.source_listing_label ? `<div class="pipeline-card__property">${esc(l.source_listing_label)}</div>` : "")}
            <div class="pipeline-card__footer">
              <button type="button" class="pipeline-card__open" data-lead="${l._id}">View Client →</button>
            </div>
          </div>`).join("")}
      </div>
    </div>`;
  }).join("")}</div>`;

  container.querySelectorAll(".pipeline-card--draggable").forEach(card => {
    card.addEventListener("dragstart", (e) => {
      draggedLeadId = card.dataset.lead;
      card.classList.add("pipeline-card--dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("pipeline-card--dragging");
      draggedLeadId = null;
      container.querySelectorAll(".pipeline-col__dropzone").forEach(z => z.classList.remove("pipeline-col__dropzone--over"));
    });
  });

  container.querySelectorAll(".pipeline-col__dropzone").forEach(zone => {
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("pipeline-col__dropzone--over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("pipeline-col__dropzone--over"));
    zone.addEventListener("drop", async (e) => {
      e.preventDefault();
      zone.classList.remove("pipeline-col__dropzone--over");
      const newStage = zone.dataset.stage;
      if (!draggedLeadId || !newStage) return;
      const lead = leadsCache.find(l => String(l._id) === draggedLeadId);
      if (!lead || lead.stage === newStage) return;
      try {
        await apiFetch(`/api/agent/leads/${draggedLeadId}/stage`, { method: "PATCH", body: JSON.stringify({ stage: newStage }) });
        lead.stage = newStage;
        showToast(`${lead.user_name} → ${STAGE_META[newStage].name}`);
        renderPipeline(el, leadsCache);
        refreshSidebarBadges();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });

  container.querySelectorAll(".pipeline-card__open").forEach(btn => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); openLeadDrawer(btn.dataset.lead); });
  });
}

const DEFAULT_LISTING_IMG = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800";

function moneyFmt(n, isRent = false) {
  const v = Number(n || 0);
  const s = v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return isRent ? `$${s}/mo` : `$${s}`;
}

function safeCssUrl(url) {
  return (url || DEFAULT_LISTING_IMG).replace(/'/g, "%27").replace(/"/g, "%22");
}

function daysOnMarket(listing) {
  const start = listing.created_at || listing.updated_at;
  if (!start) return null;
  const ms = Date.now() - new Date(start).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function renderAgentListingCard(l) {
  const isRent = l.kind === "rental";
  const statusClass = l.status === "active" ? "status-active" : "status-sold";
  const statusText = l.status === "active" ? "Active" : (isRent ? "Rented" : "Sold");
  const imgUrl = safeCssUrl(l.image_url);
  const pricePerSqft = l.sqft && l.price ? Math.round(l.price / l.sqft) : null;
  const hasDiscount = l.original_price && l.original_price !== l.price;
  const dom = daysOnMarket(l);
  const discountLabel = l.discount
    ? (l.discount.type === "percent" ? `${l.discount.amount}% off` : `$${Number(l.discount.amount).toLocaleString()} off`)
    : null;
  const reducedBadgeText = discountLabel ? `PRICE REDUCED — ${discountLabel}` : "PRICE REDUCED";
  const discountExpiry = l.discount?.expires_at ? fmtDate(l.discount.expires_at) : null;

  return `
    <article class="agent-listing-card">
      <div class="listing-card">
        <div class="listing-card__image" style="background-image:url('${imgUrl}')">
          <span class="listing-card__status ${statusClass}">${statusText}</span>
          <span class="listing-card__type">${esc(l.type || (isRent ? "Rental" : "Sale"))}</span>
          ${hasDiscount ? `<span class="agent-listing-card__reduced">${esc(reducedBadgeText)}</span>` : ""}
        </div>
        <div class="listing-card__content">
          <div class="listing-card__price">
            ${moneyFmt(l.price, isRent)}
            ${l.original_price && l.original_price !== l.price ? `<span style="text-decoration:line-through;opacity:0.5;font-size:0.8em;margin-left:8px;">${moneyFmt(l.original_price, isRent)}</span>` : ""}
          </div>
          ${pricePerSqft && !isRent ? `<div style="font-size:0.75rem;color:var(--muted);margin-top:2px;">$${pricePerSqft}/sq ft</div>` : ""}
          <div class="listing-card__location">
            <span class="location-icon">📍</span>
            ${esc(l.city)}${l.state ? ", " + esc(l.state) : ""}
          </div>
          ${l.address ? `<div class="listing-card__address">${esc(l.address)}</div>` : ""}
          <div class="listing-card__details">
            <span class="detail"><b>${l.bedrooms ?? "—"}</b> beds</span>
            <span class="detail-divider">•</span>
            <span class="detail"><b>${l.bathrooms ?? "—"}</b> baths</span>
            ${l.sqft ? `<span class="detail-divider">•</span><span class="detail"><b>${Number(l.sqft).toLocaleString()}</b> sqft</span>` : ""}
          </div>
          ${l.description ? `<p class="listing-card__desc">${esc(l.description)}</p>` : ""}
          <div style="display:flex;align-items:center;gap:10px;margin-top:6px;font-size:0.78rem;color:var(--muted);flex-wrap:wrap;">
            ${l.year_built ? `<span>🏗 Built ${l.year_built}</span>` : ""}
            ${isRent ? `<span>📋 12-mo lease</span>` : ""}
            ${!isRent && l.sqft && l.sqft >= 2000 ? `<span>🏠 Spacious</span>` : ""}
            ${!isRent && l.year_built && l.year_built >= 2018 ? `<span>✨ New Build</span>` : ""}
          </div>
        </div>
      </div>

      <div class="agent-listing-card__broker">
        <div class="agent-listing-card__broker-title">Agent Details</div>
        <div class="agent-listing-card__meta-grid">
          <div class="agent-listing-card__meta-item"><span>Listing ID</span><strong>${esc(l.id)}</strong></div>
          ${dom !== null ? `<div class="agent-listing-card__meta-item"><span>Days on Market</span><strong>${dom} days</strong></div>` : ""}
          ${l.updated_at ? `<div class="agent-listing-card__meta-item"><span>Last Updated</span><strong>${fmtDate(l.updated_at)}</strong></div>` : ""}
          ${l.lat && l.lng ? `<div class="agent-listing-card__meta-item"><span>Coordinates</span><strong>${l.lat}, ${l.lng}</strong></div>` : `<div class="agent-listing-card__meta-item"><span>Map Pin</span><strong>Not set</strong></div>`}
          ${discountLabel ? `<div class="agent-listing-card__meta-item agent-listing-card__meta-item--highlight"><span>Active Offer</span><strong>${discountLabel}${discountExpiry ? ` · exp ${discountExpiry}` : ""}</strong></div>` : ""}
          ${pricePerSqft && isRent && l.sqft ? `<div class="agent-listing-card__meta-item"><span>Rent / Sq Ft</span><strong>$${Math.round(l.price / l.sqft)}/sqft</strong></div>` : ""}
          <div class="agent-listing-card__meta-item"><span>Kind</span><strong>${isRent ? "Rental" : "For Sale"}</strong></div>
        </div>
        <div class="agent-listing-card__actions">
          <button type="button" class="btn btn--ghost btn-sm btn-edit" data-id="${esc(l.id)}">Edit</button>
          <button type="button" class="btn btn--ghost btn-sm btn-status" data-id="${esc(l.id)}" data-status="${l.status}">${l.status === "active" ? "Mark Sold" : "Relist"}</button>
          <button type="button" class="btn btn--ghost btn-sm btn-discount" data-id="${esc(l.id)}">Offer</button>
          <button type="button" class="btn btn--ghost btn-sm btn-delete" data-id="${esc(l.id)}">Delete</button>
        </div>
      </div>
    </article>`;
}

function bindListingCardActions(container, el, filter) {
  container.querySelectorAll(".btn-edit").forEach(btn => btn.addEventListener("click", () => { location.hash = `#/listings/${btn.dataset.id}/edit`; }));
  container.querySelectorAll(".btn-status").forEach(btn => btn.addEventListener("click", async () => {
    await apiFetch(`/api/agent/listings/${btn.dataset.id}/status`, { method: "PATCH", body: JSON.stringify({ status: btn.dataset.status === "active" ? "sold" : "active" }) });
    showToast("Listing updated"); loadListings(el, () => filter);
  }));
  container.querySelectorAll(".btn-discount").forEach(btn => btn.addEventListener("click", () => showDiscountModal(btn.dataset.id, el, () => loadListings(el, () => filter))));
  container.querySelectorAll(".btn-delete").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Remove this listing from the market?")) return;
    await apiFetch(`/api/agent/listings/${btn.dataset.id}`, { method: "DELETE" });
    showToast("Listing removed"); loadListings(el, () => filter);
  }));
}

function ListingsPage() {
  let filter = "all";
  const el = renderPageShell("My Listings", `<a href="#/listings/new" class="btn btn--primary">+ Add Listing</a>`, `
    <div class="listing-tabs">
      <button type="button" class="listing-tab active" data-filter="all">All Properties</button>
      <button type="button" class="listing-tab" data-filter="sale">For Sale</button>
      <button type="button" class="listing-tab" data-filter="rental">Rentals</button>
    </div>
    <div id="listingsGrid"><div class="agent-loading agent-loading--skeleton"></div></div>`);

  el.querySelectorAll(".listing-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      filter = tab.dataset.filter;
      el.querySelectorAll(".listing-tab").forEach(t => t.classList.toggle("active", t === tab));
      renderListingsGrid(el, listingsCache, filter);
    });
  });

  loadListings(el, () => filter);
  return el;
}

let listingsCache = [];

async function loadListings(el, getFilter) {
  try {
    const data = await apiFetch("/api/agent/listings");
    listingsCache = data.listings || [];
    listingsMap = {};
    for (const l of listingsCache) listingsMap[l.id] = `${l.address}, ${l.city}, ${l.state}`;
    renderListingsGrid(el, listingsCache, getFilter());
  } catch {
    el.querySelector("#listingsGrid").innerHTML = `<p class="agent-empty">Failed to load listings.</p>`;
  }
}

function renderListingsGrid(el, listings, filter) {
  const container = el.querySelector("#listingsGrid");
  const sales = listings.filter(l => l.kind === "sale");
  const rentals = listings.filter(l => l.kind === "rental");

  const renderSection = (title, items) => {
    if (items.length === 0) return "";
    return `
      <div class="agent-listings-section">
        ${title ? `<h3 class="agent-listings-section__title">${title}</h3>` : ""}
        <div class="listings-grid">${items.map(l => renderAgentListingCard(l)).join("")}</div>
      </div>`;
  };

  if (filter === "sale") {
    if (sales.length === 0) {
      container.innerHTML = `<div class="agent-empty"><p>No sale listings yet.</p><a href="#/listings/new" class="btn btn--primary">Add listing</a></div>`;
      return;
    }
    container.innerHTML = renderSection("", sales);
  } else if (filter === "rental") {
    if (rentals.length === 0) {
      container.innerHTML = `<div class="agent-empty"><p>No rental listings yet.</p><a href="#/listings/new" class="btn btn--primary">Add listing</a></div>`;
      return;
    }
    container.innerHTML = renderSection("", rentals);
  } else {
    if (listings.length === 0) {
      container.innerHTML = `<div class="agent-empty"><p>No listings yet.</p><a href="#/listings/new" class="btn btn--primary">Add your first listing</a></div>`;
      return;
    }
    container.innerHTML = renderSection("For Sale", sales) + renderSection("Rentals", rentals);
  }

  bindListingCardActions(container, el, filter);
}

function showDiscountModal(listingId, parentEl, onDone) {
  document.getElementById("discountModal")?.remove();
  const modal = document.createElement("div");
  modal.id = "discountModal";
  modal.className = "agent-modal-backdrop";
  modal.innerHTML = `<div class="agent-modal"><h3>Apply Price Reduction</h3><form id="discountForm" class="agent-form">
    <div class="form-group"><label>Type</label><select id="discType"><option value="percent">Percentage (%)</option><option value="flat">Flat ($)</option></select></div>
    <div class="form-group"><label>Amount</label><input type="number" id="discAmount" min="0" step="0.01" required /></div>
    <div class="form-group"><label>Expires</label><input type="date" id="discExpiry" /></div>
    <div class="agent-modal__actions"><button type="submit" class="btn btn--primary">Apply</button>
    <button type="button" class="btn btn--ghost" id="discCancel">Cancel</button>
    <button type="button" class="btn btn--ghost" id="discRemove" style="color:#ef4444;">Remove</button></div></form></div>`;
  document.body.appendChild(modal);
  const done = onDone || (() => loadListings(parentEl, () => "all"));
  modal.querySelector("#discCancel").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector("#discRemove").addEventListener("click", async () => {
    await apiFetch(`/api/agent/discounts/${listingId}`, { method: "DELETE" });
    modal.remove(); showToast("Discount removed"); done();
  });
  modal.querySelector("#discountForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await apiFetch("/api/agent/discounts", { method: "POST", body: JSON.stringify({
      listing_id: listingId, type: modal.querySelector("#discType").value,
      amount: Number(modal.querySelector("#discAmount").value), expires_at: modal.querySelector("#discExpiry").value || null,
    }) });
    modal.remove(); showToast("Price reduction applied"); done();
  });
}

function ListingFormPage(editId) {
  const isEdit = !!editId;
  const el = document.createElement("div");
  el.innerHTML = `<a href="#/listings" class="back-link">&larr; Back to Listings</a><h2 class="page-title">${isEdit ? "Edit Listing" : "Add New Listing"}</h2>
    <form id="listingForm" class="agent-form">
      <div class="form-row"><div class="form-group"><label>Kind</label><select id="fKind"><option value="sale">Sale</option><option value="rental">Rental</option></select></div>
      <div class="form-group"><label>Type</label><input id="fType" placeholder="Single Family, Condo..." required /></div></div>
      <div class="form-group"><label>Address</label><input id="fAddress" required /></div>
      <div class="form-row"><div class="form-group"><label>City</label><input id="fCity" required /></div><div class="form-group"><label>State</label><input id="fState" maxlength="2" placeholder="NY" required /></div></div>
      <div class="form-group"><label>Description</label><textarea id="fDesc"></textarea></div>
      <div class="form-row"><div class="form-group"><label>Price ($)</label><input type="number" id="fPrice" min="0" required /></div><div class="form-group"><label>Sqft</label><input type="number" id="fSqft" min="0" /></div></div>
      <div class="form-row"><div class="form-group"><label>Bedrooms</label><input type="number" id="fBeds" min="0" /></div><div class="form-group"><label>Bathrooms</label><input type="number" id="fBaths" min="0" step="0.5" /></div></div>
      <div class="form-row"><div class="form-group"><label>Year Built</label><input type="number" id="fYear" min="1800" max="2030" /></div><div class="form-group"><label>Image URL</label><input id="fImage" placeholder="https://..." /></div></div>
      <div class="form-row"><div class="form-group"><label>Latitude</label><input type="number" id="fLat" step="0.0001" /></div><div class="form-group"><label>Longitude</label><input type="number" id="fLng" step="0.0001" /></div></div>
      <div id="formError" class="form-error"></div><button type="submit" class="btn btn--primary">${isEdit ? "Update Listing" : "Create Listing"}</button></form>`;
  if (isEdit) {
    loadListingForEdit(el, editId);
  } else {
    const params = new URLSearchParams((location.hash.split("?")[1]) || "");
    const setVal = (sel, key) => { const v = params.get(key); if (v) el.querySelector(sel).value = v; };
    setVal("#fType", "type");
    setVal("#fAddress", "address");
    setVal("#fCity", "city");
    setVal("#fState", "state");
    setVal("#fPrice", "price");
    setVal("#fSqft", "sqft");
    setVal("#fBeds", "bedrooms");
    setVal("#fBaths", "bathrooms");
    setVal("#fYear", "year_built");
  }
  el.querySelector("#listingForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      kind: el.querySelector("#fKind").value, type: el.querySelector("#fType").value,
      address: el.querySelector("#fAddress").value, city: el.querySelector("#fCity").value,
      state: el.querySelector("#fState").value.toUpperCase(), description: el.querySelector("#fDesc").value,
      price: Number(el.querySelector("#fPrice").value), sqft: Number(el.querySelector("#fSqft").value) || null,
      bedrooms: Number(el.querySelector("#fBeds").value) || null, bathrooms: Number(el.querySelector("#fBaths").value) || null,
      year_built: Number(el.querySelector("#fYear").value) || null, image_url: el.querySelector("#fImage").value || null,
      lat: Number(el.querySelector("#fLat").value) || null, lng: Number(el.querySelector("#fLng").value) || null,
    };
    try {
      if (isEdit) await apiFetch(`/api/agent/listings/${editId}`, { method: "PUT", body: JSON.stringify(body) });
      else await apiFetch("/api/agent/listings", { method: "POST", body: JSON.stringify(body) });
      showToast(isEdit ? "Listing updated" : "Listing created");
      location.hash = "#/listings";
    } catch (err) { el.querySelector("#formError").textContent = err.message; }
  });
  return el;
}

async function loadListingForEdit(el, id) {
  try {
    const listing = await apiFetch(`/api/listings/${id}`);
    el.querySelector("#fKind").value = listing.kind || "sale";
    el.querySelector("#fType").value = listing.type || "";
    el.querySelector("#fAddress").value = listing.address || "";
    el.querySelector("#fCity").value = listing.city || "";
    el.querySelector("#fState").value = listing.state || "";
    el.querySelector("#fDesc").value = listing.description || "";
    el.querySelector("#fPrice").value = listing.price || "";
    el.querySelector("#fSqft").value = listing.sqft || "";
    el.querySelector("#fBeds").value = listing.bedrooms || "";
    el.querySelector("#fBaths").value = listing.bathrooms || "";
    el.querySelector("#fYear").value = listing.year_built || "";
    el.querySelector("#fImage").value = listing.image_url || "";
    el.querySelector("#fLat").value = listing.lat || "";
    el.querySelector("#fLng").value = listing.lng || "";
  } catch {}
}

function ChatsPage() {
  let showAi = false;
  const el = renderPageShell("Inbox", `<label style="font-size:0.85rem;display:flex;align-items:center;gap:0.4rem;cursor:pointer;"><input type="checkbox" id="showAiChats" /> Show AI chats</label>`,
    `<div class="chat-panel"><div class="chat-panel__list" id="chatList"><div class="agent-loading">Loading...</div></div>
    <div class="chat-panel__messages"><div class="chat-panel__msg-area" id="chatMsgArea"><p style="opacity:0.5;margin:auto;">Select a conversation</p></div>
    <div class="chat-panel__input-row"><input id="chatInput" placeholder="Type a reply..." disabled /><button id="chatSendBtn" class="btn btn--primary" disabled>Send</button></div></div></div>`);
  el.querySelector("#showAiChats").addEventListener("change", (e) => { showAi = e.target.checked; loadChatSessions(el, showAi); });
  loadChatSessions(el, showAi);
  return el;
}

async function loadChatSessions(el, showAi = false) {
  try {
    const data = await apiFetch("/api/agent/chats");
    let sessions = data.sessions || [];
    if (!showAi) sessions = sessions.filter(s => (s.session_type || "ai") === "human");
    const listEl = el.querySelector("#chatList");
    if (sessions.length === 0) {
      listEl.innerHTML = `<div class="agent-empty" style="padding:1rem;"><p>${showAi ? "No chat sessions." : "No live chats. Enable AI chats to see bot threads."}</p></div>`;
      return;
    }
    listEl.innerHTML = sessions.map(s => {
      const isHuman = (s.session_type || "ai") === "human";
      return `<div class="chat-panel__conv ${s._id === activeSessionId ? "chat-panel__conv--active" : ""}" data-id="${s._id}">
        <div class="chat-panel__conv-name">${esc(s.user_name || "User")}<span class="chat-type-badge chat-type-badge--${isHuman ? "human" : "ai"}">${isHuman ? "Live" : "AI"}</span></div>
        <div class="chat-panel__conv-preview">${s.total_messages || 0} messages · ${fmtDate(s.started_at)}</div></div>`;
    }).join("");
    listEl.querySelectorAll(".chat-panel__conv").forEach(item => {
      item.addEventListener("click", () => {
        activeSessionId = item.dataset.id;
        listEl.querySelectorAll(".chat-panel__conv").forEach(c => c.classList.remove("chat-panel__conv--active"));
        item.classList.add("chat-panel__conv--active");
        loadChatMessages(el, item.dataset.id);
      });
    });
  } catch {
    el.querySelector("#chatList").innerHTML = `<p class="agent-empty">Failed to load chats.</p>`;
  }
}

async function loadChatMessages(el, sessionId) {
  const msgArea = el.querySelector("#chatMsgArea");
  const input = el.querySelector("#chatInput");
  const sendBtn = el.querySelector("#chatSendBtn");
  const fetchMessages = async () => {
    try {
      const data = await apiFetch(`/api/agent/chats/${sessionId}/messages`);
      const messages = data.messages || [];
      msgArea.innerHTML = messages.map(m => `<div class="chat-msg chat-msg--${m.role === "user" ? "user" : "agent"}">${esc(m.content)}</div>`).join("") || `<p style="opacity:0.5;margin:auto;">No messages.</p>`;
      msgArea.scrollTop = msgArea.scrollHeight;
      input.disabled = false;
      sendBtn.disabled = false;
    } catch {
      msgArea.innerHTML = `<p style="color:#ef4444;">Failed to load messages.</p>`;
    }
  };
  await fetchMessages();
  stopChatPolling();
  chatPollInterval = setInterval(fetchMessages, 9000);
  sendBtn.onclick = async () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    await apiFetch(`/api/agent/chats/${sessionId}/reply`, { method: "POST", body: JSON.stringify({ message: text }) });
    await fetchMessages();
    showToast("Reply sent");
  };
  input.onkeydown = (e) => { if (e.key === "Enter") sendBtn.click(); };
}

function AppointmentsPage() {
  const el = renderPageShell("Showings & Appointments", `<button class="btn btn--primary" id="newApptBtn">+ Schedule Showing</button>`, `
    <div class="schedule-layout">
      <div class="schedule-main">
        <div id="todaySchedule" class="agent-card"><div class="agent-loading agent-loading--skeleton"></div></div>
        <div id="agendaList" class="agent-card"></div>
      </div>
      <div class="schedule-side">
        <div id="calendarView" class="agent-card"></div>
      </div>
    </div>`);
  el.querySelector("#newApptBtn").addEventListener("click", () => showAppointmentModal(el));
  loadAppointments(el);
  return el;
}

async function loadAppointments(el) {
  try {
    const data = await apiFetch("/api/agent/appointments");
    const appointments = (data.appointments || []).filter(a => a.status !== "cancelled");
    const reload = () => loadAppointments(el);
    renderTodaySchedule(el.querySelector("#todaySchedule"), appointments, reload);
    renderAgenda(el.querySelector("#agendaList"), appointments, reload);
    renderCalendar(el.querySelector("#calendarView"), appointments, el);
  } catch {
    el.querySelector("#todaySchedule").innerHTML = `<p class="agent-empty">Failed to load appointments.</p>`;
  }
}

function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  const ampm = hr >= 12 ? "PM" : "AM";
  const h12 = hr % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function renderTodaySchedule(container, appointments, reloadFn) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAppts = appointments.filter(a => a.date === todayStr).sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  container.innerHTML = `
    <div class="schedule-today__head">
      <h3 class="agent-card__title">Today's Showings</h3>
      <span class="schedule-today__date">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
    </div>
    ${todayAppts.length === 0
      ? `<div class="schedule-empty"><p>No showings scheduled today.</p><p class="schedule-empty__hint">Use + Schedule Showing to book a property tour.</p></div>`
      : `<div class="appt-cards">${todayAppts.map(a => renderApptCard(a)).join("")}</div>`}`;
  bindApptCardActions(container, reloadFn);
}

function renderAgenda(container, appointments, reloadFn) {
  const today = new Date(new Date().toDateString());
  const upcoming = appointments
    .filter(a => new Date(a.date) >= today)
    .sort((a, b) => new Date(a.date + "T" + (a.time || "00:00")) - new Date(b.date + "T" + (b.time || "00:00")))
    .slice(0, 20);

  const byDate = {};
  for (const a of upcoming) {
    if (!byDate[a.date]) byDate[a.date] = [];
    byDate[a.date].push(a);
  }

  container.innerHTML = `<h3 class="agent-card__title">Upcoming Schedule</h3>
    ${Object.keys(byDate).length === 0
      ? `<div class="schedule-empty"><p>No upcoming appointments on the books.</p></div>`
      : Object.entries(byDate).map(([date, appts]) => `
        <div class="agenda-day">
          <div class="agenda-day__label">${fmtAgendaDate(date)}</div>
          <div class="appt-cards">${appts.map(a => renderApptCard(a)).join("")}</div>
        </div>`).join("")}`;

  bindApptCardActions(container, reloadFn);
}

function fmtAgendaDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateStr === today.toISOString().slice(0, 10)) return "Today";
  if (dateStr === tomorrow.toISOString().slice(0, 10)) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function renderApptCard(a) {
  const statusClass = a.status === "confirmed" ? "appt-card--confirmed" : "appt-card--pending";
  return `<div class="appt-card ${statusClass}" data-id="${a._id}">
    <div class="appt-card__time">${fmtTime(a.time) || "TBD"}</div>
    <div class="appt-card__body">
      <div class="appt-card__client">${esc(a.client_name || "Client")}</div>
      <div class="appt-card__property">${esc(listingLabel(a.listing_id))}</div>
      ${a.notes ? `<div class="appt-card__notes">${esc(a.notes)}</div>` : ""}
      <div class="appt-card__status"><span class="badge-status badge-status--${a.status === "confirmed" ? "active" : "new"}">${a.status}</span></div>
    </div>
    <div class="appt-card__actions">
      ${a.status !== "confirmed" ? `<button type="button" class="btn btn--primary btn-sm btn-confirm" data-id="${a._id}">Confirm</button>` : ""}
      <button type="button" class="btn btn--ghost btn-sm btn-cancel-appt" data-id="${a._id}">Cancel</button>
    </div>
  </div>`;
}

function bindApptCardActions(container, reloadFn) {
  container.querySelectorAll(".btn-confirm").forEach(btn => btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    await apiFetch(`/api/agent/appointments/${btn.dataset.id}`, { method: "PATCH", body: JSON.stringify({ status: "confirmed" }) });
    showToast("Showing confirmed"); reloadFn(); refreshSidebarBadges();
  }));
  container.querySelectorAll(".btn-cancel-appt").forEach(btn => btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!confirm("Cancel this showing?")) return;
    await apiFetch(`/api/agent/appointments/${btn.dataset.id}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) });
    showToast("Showing cancelled"); reloadFn(); refreshSidebarBadges();
  }));
}

function renderCalendar(container, appointments, pageEl) {
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const isCurrentMonth = today.getFullYear() === calendarYear && today.getMonth() === calendarMonth;
  const monthName = new Date(calendarYear, calendarMonth).toLocaleString("default", { month: "long", year: "numeric" });
  const days = ["S", "M", "T", "W", "T", "F", "S"];

  const apptByDate = {};
  for (const a of appointments) {
    if (!a.date) continue;
    apptByDate[a.date] = (apptByDate[a.date] || 0) + 1;
  }

  let html = `<div class="mini-cal"><div class="calendar-nav">
    <button type="button" class="btn btn--ghost btn-sm" id="calPrev">&larr;</button>
    <h3>${monthName}</h3>
    <button type="button" class="btn btn--ghost btn-sm" id="calNext">&rarr;</button>
  </div><div class="mini-cal__grid">`;
  html += days.map(d => `<div class="mini-cal__head">${d}</div>`).join("");
  for (let i = 0; i < firstDay; i++) html += `<div class="mini-cal__cell mini-cal__cell--empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const count = apptByDate[dateStr] || 0;
    const isToday = isCurrentMonth && d === today.getDate();
    html += `<button type="button" class="mini-cal__cell ${isToday ? "mini-cal__cell--today" : ""} ${count ? "mini-cal__cell--busy" : ""}" data-date="${dateStr}">
      <span class="mini-cal__num">${d}</span>${count ? `<span class="mini-cal__dot">${count}</span>` : ""}
    </button>`;
  }
  html += `</div><p class="mini-cal__legend"><span class="mini-cal__dot mini-cal__dot--sample"></span> Has showings</p></div>`;
  container.innerHTML = html;

  const reload = () => loadAppointments(pageEl);
  container.querySelector("#calPrev").addEventListener("click", () => { calendarMonth--; if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; } renderCalendar(container, appointments, pageEl); });
  container.querySelector("#calNext").addEventListener("click", () => { calendarMonth++; if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; } renderCalendar(container, appointments, pageEl); });
  container.querySelectorAll(".mini-cal__cell[data-date]").forEach(cell => {
    cell.addEventListener("click", () => {
      calendarMonth = parseInt(cell.dataset.date.slice(5, 7), 10) - 1;
      calendarYear = parseInt(cell.dataset.date.slice(0, 4), 10);
      reload();
    });
  });
}

function showAppointmentModal(parentEl) {
  document.getElementById("apptModal")?.remove();
  const modal = document.createElement("div");
  modal.id = "apptModal";
  modal.className = "agent-modal-backdrop";
  modal.innerHTML = `<div class="agent-modal"><h3>Schedule a Showing</h3><form id="apptForm" class="agent-form">
    <div class="form-group"><label>Date</label><input type="date" id="apptDate" required /></div>
    <div class="form-group"><label>Time</label><input type="time" id="apptTime" value="10:00" /></div>
    <div class="form-group"><label>Client Name</label><input id="apptClient" required placeholder="Buyer's full name" /></div>
    <div class="form-group"><label>Property (listing ID)</label><input id="apptListing" placeholder="Optional — paste listing ID" /></div>
    <div class="form-group"><label>Notes</label><textarea id="apptNotes" placeholder="Key details, lockbox code, etc."></textarea></div>
    <div class="agent-modal__actions"><button type="submit" class="btn btn--primary">Schedule</button><button type="button" class="btn btn--ghost" id="apptCancel">Cancel</button></div></form></div>`;
  document.body.appendChild(modal);
  modal.querySelector("#apptCancel").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector("#apptForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await apiFetch("/api/agent/appointments", { method: "POST", body: JSON.stringify({
      date: modal.querySelector("#apptDate").value, time: modal.querySelector("#apptTime").value,
      client_name: modal.querySelector("#apptClient").value, listing_id: modal.querySelector("#apptListing").value || null,
      notes: modal.querySelector("#apptNotes").value || null,
    }) });
    modal.remove(); showToast("Showing scheduled"); loadAppointments(parentEl); refreshSidebarBadges();
  });
}

function SettingsPage() {
  const user = currentUser || {};
  const el = renderPageShell("Settings", "", `
    <div class="agent-card settings-profile"><h3 class="agent-card__title">Agent Profile</h3>
    <div class="settings-row"><span class="settings-row__label">Name</span><span class="settings-row__value">${esc(user.name || "—")}</span></div>
    <div class="settings-row"><span class="settings-row__label">Email</span><span class="settings-row__value">${esc(user.email || "—")}</span></div>
    <div class="settings-row"><span class="settings-row__label">Role</span><span class="settings-row__value">Agent</span></div></div>
    <div class="agent-card"><h3 class="agent-card__title">Quick Links</h3>
    <p style="margin:0 0 0.75rem;opacity:0.7;font-size:0.9rem;">Open the customer-facing site in a new tab to preview listings and tools.</p>
    <a href="/" target="_blank" rel="noopener" class="btn btn--primary">View Customer Site</a>
    <button type="button" class="btn btn--ghost" id="settingsLogout" style="margin-left:0.5rem;">Logout</button></div>`);
  el.querySelector("#settingsLogout").addEventListener("click", logout);
  return el;
}

/** Lazily loads Chart.js from CDN. Resolves true when available. */
function ensureChartJs() {
  return new Promise((resolve) => {
    if (typeof Chart !== "undefined") return resolve(true);
    const existing = document.getElementById("chartjs-cdn");
    if (existing) {
      existing.addEventListener("load", () => resolve(typeof Chart !== "undefined"));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const s = document.createElement("script");
    s.id = "chartjs-cdn";
    s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
    s.onload = () => resolve(typeof Chart !== "undefined");
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

const AGENT_US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

/**
 * Agent "Home Values" tool: run a seller valuation for a client and review
 * incoming seller leads.
 */
function HomeValuesPage() {
  const stateOptions = AGENT_US_STATES.map(s => `<option value="${s}">${s}</option>`).join("");
  const el = renderPageShell("Home Values", "", `
    <p class="pipeline-tip">Run an instant home value estimate for a seller, then review homeowners who asked for a listing consultation.</p>
    <div class="hv-grid">
      <form id="hvForm" class="agent-form hv-form">
        <h3 class="hv-form__title">Estimate a home's value</h3>
        <div class="form-row">
          <div class="form-group"><label>City</label><input id="hvCity" placeholder="" required /></div>
          <div class="form-group"><label>State</label><select id="hvState" required><option value="">--</option>${stateOptions}</select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Square Feet</label><input id="hvSqft" type="number" min="1" required /></div>
          <div class="form-group"><label>Type</label><input id="hvType" placeholder="Single Family" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Bedrooms</label><input id="hvBeds" type="number" min="0" /></div>
          <div class="form-group"><label>Bathrooms</label><input id="hvBaths" type="number" min="0" step="0.5" /></div>
        </div>
        <div class="form-group"><label>Year Built</label><input id="hvYear" type="number" min="1800" max="${new Date().getFullYear()}" /></div>
        <button type="submit" class="btn btn--primary" id="hvSubmit">Run Estimate</button>
      </form>
      <div id="hvResults" class="hv-results"></div>
    </div>
    <div class="hv-market-compare card" style="margin-top:20px;">
      <div class="card__body">
        <h3 class="hv-form__title">Area pricing snapshot</h3>
        <p class="pipeline-tip" style="margin-bottom:12px;">How active listing prices compare to market $/sqft benchmarks.</p>
        <div id="hvMarketCompare"><div class="agent-loading agent-loading--skeleton"></div></div>
      </div>
    </div>
    <div class="hv-leads">
      <h3 class="hv-form__title">Seller leads</h3>
      <div id="hvLeadsList"><div class="agent-loading agent-loading--skeleton"></div></div>
    </div>
  `);

  const resultsEl = el.querySelector("#hvResults");
  el.querySelector("#hvForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = {
      city: el.querySelector("#hvCity").value.trim(),
      state: el.querySelector("#hvState").value,
      sqft: el.querySelector("#hvSqft").value,
      property_type: el.querySelector("#hvType").value.trim() || "home",
      bedrooms: el.querySelector("#hvBeds").value,
      bathrooms: el.querySelector("#hvBaths").value,
      year_built: el.querySelector("#hvYear").value,
    };
    if (!input.city || !input.state || !input.sqft) {
      showToast("City, state, and square feet are required", "error");
      return;
    }
    const btn = el.querySelector("#hvSubmit");
    btn.disabled = true; btn.textContent = "Estimating…";
    resultsEl.innerHTML = `<div class="agent-loading agent-loading--skeleton"></div>`;
    try {
      const data = await apiFetch("/api/ai/home-value", { method: "POST", body: JSON.stringify(input) });
      renderHvResults(resultsEl, data, input);
    } catch (err) {
      resultsEl.innerHTML = `<p class="agent-empty">${esc(err.message || "Not enough data for this area.")}</p>`;
    } finally {
      btn.disabled = false; btn.textContent = "Run Estimate";
    }
  });

  loadSellerLeads(el);
  loadMarketComparison(el);
  return el;
}

function renderHvResults(resultsEl, data, input) {
  const confLabel = data.confidence === "high" ? "High confidence"
    : data.confidence === "medium" ? "Moderate confidence" : "Limited data";
  const comps = data.comps || [];
  const area = data.areaStats || {};
  const compsScope = data.compsScope || "city";
  const areaScope = area.scope || "city";
  const compsNote = compsScope === "state"
    ? `No listings in ${esc(input.city)} — showing ${esc(input.state)} statewide comps.`
    : `Listings in ${esc(input.city)}, ${esc(input.state)}.`;

  const adjRows = (data.adjustments || []).map(a =>
    `<tr><td>${esc(a.factor)}</td><td>${esc(a.description)}</td><td>${a.percent >= 0 ? "+" : ""}${a.percent.toFixed(1)}%</td></tr>`
  ).join("") || `<tr><td colspan="3">No adjustments applied</td></tr>`;

  resultsEl.innerHTML = `
    <div class="hv-estimate">
      <div class="hv-estimate__label">OwnIt estimate · ${esc(input.city)}, ${esc(input.state)}</div>
      <div class="hv-estimate__value">${moneyFmt(data.estimatedValue)}</div>
      <div class="hv-estimate__range">${moneyFmt(data.valueRange.low)} – ${moneyFmt(data.valueRange.high)}</div>
      <span class="seller-tag seller-tag--${data.confidence}">${confLabel}</span>
      <p class="hv-estimate__explain">${esc(data.explanation)}</p>
      <p class="hv-estimate__source">Source: ${esc(data.dataSourceLabel || data.dataSource)}</p>
    </div>

    <div class="hv-detail-grid">
      <div><span>Size</span><b>${Number(input.sqft).toLocaleString()} sqft</b></div>
      <div><span>Beds / Baths</span><b>${input.bedrooms || "—"} / ${input.bathrooms || "—"}</b></div>
      <div><span>Year built</span><b>${input.year_built || "—"}</b></div>
      <div><span>Your $/sqft</span><b>$${data.yourPricePerSqft || Math.round(data.estimatedValue / data.sqft)}</b></div>
    </div>

    <h4 class="hv-subtitle">Value breakdown</h4>
    <table class="agent-table agent-table--compact">
      <tbody>
        <tr><td>Base value</td><td>${moneyFmt(data.baseValue || data.estimatedValue)}</td></tr>
        ${(data.adjustments || []).map(a => `<tr><td>${esc(a.description)}</td><td>${a.percent >= 0 ? "+" : ""}${a.percent.toFixed(1)}%</td></tr>`).join("")}
        <tr><td><b>Estimated value</b></td><td><b>${moneyFmt(data.estimatedValue)}</b></td></tr>
      </tbody>
    </table>

    <div class="hv-stats">
      <div class="hv-stat"><b>$${data.avgPricePerSqft}</b><span>Est. $/sqft</span></div>
      <div class="hv-stat"><b>${area.medianPricePerSqft ? "$" + area.medianPricePerSqft : "$" + (area.avgPricePerSqft || data.avgPricePerSqft)}</b><span>Median (${areaScope})</span></div>
      <div class="hv-stat"><b>${area.listingCount ?? 0}</b><span>Listings (${areaScope})</span></div>
      <div class="hv-stat"><b>${area.avgDaysOnMarket != null ? area.avgDaysOnMarket + "d" : "—"}</b><span>Avg DOM</span></div>
    </div>

    <h4 class="hv-subtitle">Comparable homes</h4>
    <p class="pipeline-tip" style="margin:0 0 8px;">${compsNote}</p>
    ${comps.length ? `<div class="hv-comp-grid">${comps.map(c => `
      <div class="hv-comp-card">
        <div class="hv-comp-card__price">${moneyFmt(c.price)}</div>
        <div>${esc(c.address || c.city)}</div>
        <div class="hv-comp-card__meta">${esc(c.city)}, ${esc(c.state)} · ${Number(c.sqft).toLocaleString()} sqft · $${c.pricePerSqft}/sqft</div>
        <div class="hv-comp-card__meta">${c.bedrooms ?? "—"} bd · ${c.bathrooms ?? "—"} ba</div>
      </div>`).join("")}</div>` : `<p class="agent-empty">No comps found — try a major city in the state.</p>`}

    <h4 class="hv-subtitle">Feature adjustments</h4>
    <table class="agent-table agent-table--compact"><thead><tr><th>Factor</th><th>Detail</th><th>Impact</th></tr></thead><tbody>${adjRows}</tbody></table>

    <h4 class="hv-subtitle">Area price trend</h4>
    <div data-hv-trend-summary class="hv-trend-summary"></div>
    <div class="hv-trend sell-trend"><canvas id="hvTrendChart" height="180"></canvas><div id="hvTrendFallback" data-trend-fallback class="agent-empty" style="display:none;"></div></div>

    <div class="hv-actions">
      <button type="button" class="btn btn--primary btn-sm" id="hvCreateListing">Create listing from estimate</button>
      <a class="btn btn--ghost btn-sm" href="#/leads">View seller leads</a>
    </div>
  `;

  resultsEl.querySelector("#hvCreateListing")?.addEventListener("click", () => {
    const params = new URLSearchParams();
    if (input.city) params.set("city", input.city);
    if (input.state) params.set("state", input.state);
    if (input.sqft) params.set("sqft", input.sqft);
    if (input.bedrooms) params.set("bedrooms", input.bedrooms);
    if (input.bathrooms) params.set("bathrooms", input.bathrooms);
    if (input.year_built) params.set("year_built", input.year_built);
    if (input.property_type) params.set("type", input.property_type);
    if (data.estimatedValue) params.set("price", data.estimatedValue);
    location.hash = `#/listings/new?${params.toString()}`;
  });

  renderHvTrendChart(resultsEl, data.marketTrend);
}

async function renderHvTrendChart(resultsEl, trend) {
  const summaryEl = resultsEl.querySelector("[data-hv-trend-summary]");
  if (trend?.available && trend.summary && summaryEl) {
    const s = trend.summary;
    summaryEl.innerHTML = `
      <span class="hv-trend-label">${esc(trend.label || "Area trend")}${trend.scope === "regional" ? " · regional benchmark" : ""}</span>
      <span class="hv-trend-growth hv-trend-growth--${s.trend}">${s.growthPercent >= 0 ? "+" : ""}${s.growthPercent}%</span>
      <span class="hv-trend-prices">$${s.startPrice} → $${s.endPrice}/sqft</span>`;
  }

  const canvas = resultsEl.querySelector("#hvTrendChart");
  const fallback = resultsEl.querySelector("[data-trend-fallback]");
  if (!trend?.available || !trend.series?.length) {
    if (canvas) canvas.style.display = "none";
    if (fallback) {
      fallback.style.display = "block";
      fallback.textContent = "No trend history for this city — estimate uses statewide sale data.";
    }
    return;
  }

  const ok = await ensureChartJs();
  if (!ok || !canvas) {
    if (fallback) { fallback.style.display = "block"; fallback.textContent = "Chart unavailable."; }
    return;
  }
  if (fallback) fallback.style.display = "none";
  const isLight = document.documentElement.classList.contains("light");
  new Chart(canvas, {
    type: "line",
    data: {
      labels: trend.series.map(p => p.label),
      datasets: [{ label: "$/sqft", data: trend.series.map(p => p.pricePerSqft), borderColor: "#7c5cff", backgroundColor: "rgba(124,92,255,0.1)", fill: true, tension: 0.35, pointRadius: 3 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 9 }, color: isLight ? "#6b7280" : "#888" } },
        y: { ticks: { font: { size: 9 }, color: isLight ? "#6b7280" : "#888", callback: v => "$" + v } },
      },
    },
  });
}

async function loadMarketComparison(el) {
  const container = el.querySelector("#hvMarketCompare");
  if (!container) return;
  try {
    const data = await apiFetch("/api/agent/analytics/market-comparison");
    const rows = data.comparisons || [];
    if (!rows.length) {
      container.innerHTML = `<p class="agent-empty">No market comparison data available yet.</p>`;
      return;
    }
    container.innerHTML = `<table class="agent-table">
      <thead><tr><th>Listing</th><th>Listing $/sqft</th><th>Market $/sqft</th><th>Diff</th></tr></thead>
      <tbody>${rows.map(r => {
        const diff = r.listing_price_sqft - r.market_price_sqft;
        const diffClass = diff > 0 ? "hv-diff--high" : diff < 0 ? "hv-diff--low" : "";
        return `<tr>
          <td>${esc(r.city)}, ${esc(r.state)}</td>
          <td>$${r.listing_price_sqft}</td>
          <td>$${r.market_price_sqft}</td>
          <td class="${diffClass}">${diff >= 0 ? "+" : ""}$${diff}</td>
        </tr>`;
      }).join("")}</tbody>
    </table>`;
  } catch {
    container.innerHTML = `<p class="agent-empty">Could not load market comparison.</p>`;
  }
}

async function loadSellerLeads(el) {
  const listEl = el.querySelector("#hvLeadsList");
  try {
    const data = await apiFetch("/api/agent/leads");
    const sellers = (data.leads || []).filter(l => l.source === "seller_valuation");
    if (sellers.length === 0) {
      listEl.innerHTML = `
        <div class="hv-leads-empty">
          <p><b>No seller leads yet</b></p>
          <p class="agent-empty">When homeowners use <a href="/" target="_blank" rel="noopener">What's My Home Worth?</a> on the customer site and click "Talk to an agent," they'll show up here and in your Clients pipeline with a <span class="seller-tag">Seller</span> badge.</p>
          <ul class="hv-leads-tips">
            <li>Run an estimate above while on a call with a homeowner</li>
            <li>Use <b>Create listing from estimate</b> to start a new listing pre-filled with their details</li>
            <li>Check the Clients board for seller-tagged leads</li>
          </ul>
        </div>`;
      return;
    }
    listEl.innerHTML = `<table class="agent-table">
      <thead><tr><th>Name</th><th>Property</th><th>Estimate</th><th>Since</th><th></th></tr></thead>
      <tbody>${sellers.map(l => {
        const p = l.seller_property || {};
        return `<tr>
          <td>${esc(l.user_name)}</td>
          <td>${esc(p.city || "")}, ${esc(p.state || "")}${p.sqft ? ` · ${Number(p.sqft).toLocaleString()} sqft` : ""}</td>
          <td>${l.seller_estimate ? moneyFmt(l.seller_estimate) : "—"}</td>
          <td>${fmtDate(l.created_at)}</td>
          <td><a class="btn btn--ghost btn-sm" href="#/leads?open=${l._id}">View</a></td>
        </tr>`;
      }).join("")}</tbody>
    </table>`;
  } catch {
    listEl.innerHTML = `<p class="agent-empty">Failed to load seller leads.</p>`;
  }
}

function esc(str) {
  if (!str) return "";
  const d = document.createElement("div");
  d.textContent = String(str);
  return d.innerHTML;
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function stageName(stage) {
  return STAGE_META[stage]?.name || stage;
}

function stageClass(stage) {
  const map = { new: "new", contacted: "contacted", viewing_scheduled: "viewing", offer_made: "offer", closed: "closed" };
  return map[stage] || "new";
}

function NotFoundPage() {
  const el = document.createElement("div");
  el.innerHTML = `<div class="agent-empty"><h2>404</h2><p>Page not found.</p><a href="#/">Back to Dashboard</a></div>`;
  return el;
}
