/**
 * @file agent-portal.js
 * @project OwnIt Property Calculator — Agent Portal
 * @description SPA entry point for the agent dashboard. Handles auth,
 *              routing, and all page rendering for agent-facing features.
 */

/* ═══════════════════════════════════════════════════════════════
   Authentication
   ═══════════════════════════════════════════════════════════════ */

let currentUser = null;
let authToken = localStorage.getItem("token");

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

function getUser() { return currentUser; }

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
  showLoginPage();
}

function syncAuthUI() {
  const badge = document.getElementById("userBadge");
  const logoutBtn = document.getElementById("logoutBtn");
  if (currentUser) {
    badge.textContent = `Agent: ${currentUser.name}`;
    badge.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
    logoutBtn.classList.add("hidden");
  }
}

/* ═══════════════════════════════════════════════════════════════
   Theme Toggle
   ═══════════════════════════════════════════════════════════════ */

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme === "light" ? "light" : "dark");
  localStorage.setItem("theme", theme);
}

applyTheme(localStorage.getItem("theme") || "dark");

document.getElementById("themeToggle").addEventListener("click", () => {
  const isDark = document.documentElement.classList.contains("dark");
  applyTheme(isDark ? "light" : "dark");
});

/* ═══════════════════════════════════════════════════════════════
   Router
   ═══════════════════════════════════════════════════════════════ */

const routes = {
  "/": DashboardPage,
  "/leads": LeadsPage,
  "/listings": ListingsPage,
  "/listings/new": ListingFormPage,
  "/chats": ChatsPage,
  "/appointments": AppointmentsPage,
};

const STAGE_HELP = {
  new: "Brand-new contact — they chatted, booked, or reached out but you have not followed up yet.",
  contacted: "You have spoken with them (call, email, or chat reply).",
  viewing_scheduled: "A property tour is on the calendar (customer or you created an appointment).",
  offer_made: "They submitted or discussed an offer on a property.",
  closed: "Deal finished — won or lost. Use for your records.",
};

window.addEventListener("hashchange", render);
document.getElementById("logoutBtn").addEventListener("click", logout);

async function boot() {
  await refreshMe();
  if (currentUser) render();
}

boot();

function render() {
  if (!currentUser) { showLoginPage(); return; }

  const fullPath = (location.hash || "#/").replace("#", "");
  const path = fullPath.split("?")[0] || "/";

  const leadMatch = path.match(/^\/leads\/([^/]+)$/);
  const listingEditMatch = path.match(/^\/listings\/([^/]+)\/edit$/);

  let page;
  let navPath = path;

  if (leadMatch) {
    page = () => LeadDetailPage(leadMatch[1]);
    navPath = "/leads";
  } else if (listingEditMatch) {
    page = () => ListingFormPage(listingEditMatch[1]);
    navPath = "/listings";
  } else {
    page = routes[path] || NotFoundPage;
  }

  setActiveNav(navPath);
  const app = document.getElementById("app");
  app.innerHTML = "";
  app.appendChild(page());
}

function setActiveNav(path) {
  document.querySelectorAll(".agent-nav a").forEach(a => {
    const href = a.getAttribute("href")?.replace("#", "");
    a.classList.toggle("active", href === path);
  });
}

/* ═══════════════════════════════════════════════════════════════
   Login Page (agent-specific)
   ═══════════════════════════════════════════════════════════════ */

function showLoginPage() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  const el = document.createElement("div");
  el.style.maxWidth = "400px";
  el.style.margin = "4rem auto";
  el.innerHTML = `
    <h1 style="text-align:center;margin-bottom:1.5rem;">Agent Login</h1>
    <form id="agentLoginForm" class="agent-form">
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="loginEmail" required />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" id="loginPassword" required />
      </div>
      <div id="loginError" style="color:#ef4444;font-size:0.85rem;margin-bottom:0.75rem;"></div>
      <button type="submit" class="btn btn--primary" style="width:100%;">Login</button>
    </form>
    <p style="text-align:center;margin-top:1rem;font-size:0.85rem;opacity:0.6;">
      Need an agent account? <a href="#" id="showRegister">Register here</a>
    </p>
    <form id="agentRegisterForm" class="agent-form" style="display:none;margin-top:1.5rem;">
      <h2 style="margin-bottom:1rem;">Agent Registration</h2>
      <div class="form-group"><label>Name</label><input type="text" id="regName" required /></div>
      <div class="form-group"><label>Email</label><input type="email" id="regEmail" required /></div>
      <div class="form-group"><label>Password</label><input type="password" id="regPassword" required /></div>
      <div id="regError" style="color:#ef4444;font-size:0.85rem;margin-bottom:0.75rem;"></div>
      <button type="submit" class="btn btn--primary" style="width:100%;">Register as Agent</button>
    </form>
  `;
  app.appendChild(el);

  el.querySelector("#showRegister").addEventListener("click", (e) => {
    e.preventDefault();
    el.querySelector("#agentRegisterForm").style.display = "block";
  });

  el.querySelector("#agentLoginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = el.querySelector("#loginEmail").value;
    const password = el.querySelector("#loginPassword").value;
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
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
    const name = el.querySelector("#regName").value;
    const email = el.querySelector("#regEmail").value;
    const password = el.querySelector("#regPassword").value;
    try {
      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role: "agent" })
      });
      saveToken(data.token);
      setUser(data.user);
      render();
    } catch (err) {
      el.querySelector("#regError").textContent = err.message;
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   Dashboard Page
   ═══════════════════════════════════════════════════════════════ */

function DashboardPage() {
  const el = document.createElement("div");
  el.innerHTML = `
    <h1 style="margin-bottom:1.5rem;">Dashboard</h1>
    <div class="dash-grid" id="dashCards">
      <div class="dash-card" title="Leads still in the New stage"><div class="dash-card__label">New Leads</div><div class="dash-card__value" id="statLeads">—</div></div>
      <div class="dash-card" title="All chat threads (live + AI)"><div class="dash-card__label">Active Chats</div><div class="dash-card__value" id="statChats">—</div><div class="dash-card__sub" id="statLiveChats"></div></div>
      <div class="dash-card" title="Pending or confirmed tours today and future"><div class="dash-card__label">Upcoming Viewings</div><div class="dash-card__value" id="statAppts">—</div></div>
      <div class="dash-card" title="Listings with status active in MongoDB"><div class="dash-card__label">Active Listings</div><div class="dash-card__value" id="statListings">—</div></div>
    </div>
    <div class="section-header"><h2>Recent Leads</h2></div>
    <div id="recentLeads" style="opacity:0.6;">Loading...</div>
  `;

  loadDashboardData(el);
  return el;
}

async function loadDashboardData(el) {
  try {
    const [leads, listings, appointments, chats] = await Promise.all([
      apiFetch("/api/agent/leads?limit=5"),
      apiFetch("/api/agent/listings"),
      apiFetch("/api/agent/appointments"),
      apiFetch("/api/agent/chats"),
    ]);

    el.querySelector("#statLeads").textContent = leads.leads?.filter(l => l.stage === "new").length ?? 0;
    const sessions = chats.sessions || [];
    const liveCount = sessions.filter(s => (s.session_type || "ai") === "human").length;
    el.querySelector("#statChats").textContent = sessions.length;
    const liveSub = el.querySelector("#statLiveChats");
    if (liveSub) liveSub.textContent = liveCount ? `${liveCount} need agent reply` : "";
    el.querySelector("#statAppts").textContent = appointments.appointments?.filter(a => {
      if (!a.date || a.status === "cancelled") return false;
      return new Date(a.date) >= new Date(new Date().toDateString());
    }).length ?? 0;
    el.querySelector("#statListings").textContent = listings.listings?.filter(l => l.status === "active").length ?? 0;

    const recentEl = el.querySelector("#recentLeads");
    if (!leads.leads || leads.leads.length === 0) {
      recentEl.innerHTML = "<p>No leads yet. Leads are created when users start a chat.</p>";
      return;
    }

    recentEl.innerHTML = `<table class="agent-table">
      <thead><tr><th>Name</th><th>Email</th><th>Stage</th><th>Date</th></tr></thead>
      <tbody>${leads.leads.slice(0, 5).map(l => `
        <tr style="cursor:pointer;" onclick="location.hash='#/leads/${l._id}'">
          <td>${esc(l.user_name)}</td>
          <td>${esc(l.user_email)}</td>
          <td><span class="badge-status badge-status--${stageClass(l.stage)}">${l.stage}</span></td>
          <td>${fmtDate(l.created_at)}</td>
        </tr>`).join("")}
      </tbody>
    </table>`;
  } catch (err) {
    el.querySelector("#recentLeads").textContent = "Failed to load dashboard data.";
  }
}

/* ═══════════════════════════════════════════════════════════════
   Leads Page
   ═══════════════════════════════════════════════════════════════ */

function LeadsPage() {
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="section-header">
      <h2>Lead Pipeline</h2>
      <div>
        <button class="btn btn--ghost" id="viewKanban">Kanban</button>
        <button class="btn btn--ghost" id="viewList">List</button>
      </div>
    </div>
    <div id="leadsContainer">Loading...</div>
  `;

  let viewMode = "kanban";
  el.querySelector("#viewKanban").addEventListener("click", () => { viewMode = "kanban"; renderLeads(el); });
  el.querySelector("#viewList").addEventListener("click", () => { viewMode = "list"; renderLeads(el); });

  loadLeadsData(el, () => viewMode);
  return el;
}

let leadsCache = [];

async function loadLeadsData(el, getViewMode) {
  try {
    const data = await apiFetch("/api/agent/leads");
    leadsCache = data.leads || [];
    renderLeadsView(el, leadsCache, getViewMode());
  } catch {
    el.querySelector("#leadsContainer").textContent = "Failed to load leads.";
  }
}

function renderLeads(el) {
  renderLeadsView(el, leadsCache, el.querySelector("#viewKanban") ? "kanban" : "list");
}

function renderLeadsView(el, leads, mode) {
  const container = el.querySelector("#leadsContainer");
  if (mode === "kanban") {
    const stages = ["new", "contacted", "viewing_scheduled", "offer_made", "closed"];
    container.innerHTML = `<div class="pipeline">${stages.map(stage => {
      const items = leads.filter(l => l.stage === stage);
      return `<div class="pipeline-col">
        <div class="pipeline-col__title">${stageName(stage)} <span class="pipeline-col__count">${items.length}</span></div>
        <div class="pipeline-col__hint">${STAGE_HELP[stage] || ""}</div>
        ${items.map(l => `
          <div class="pipeline-card" onclick="location.hash='#/leads/${l._id}'">
            <div class="pipeline-card__name">${esc(l.user_name)}</div>
            <div class="pipeline-card__meta">${esc(l.user_email)} &middot; ${fmtDate(l.created_at)}</div>
          </div>`).join("")}
      </div>`;
    }).join("")}</div>`;
  } else {
    container.innerHTML = `<table class="agent-table">
      <thead><tr><th>Name</th><th>Email</th><th>Stage</th><th>Source Listing</th><th>Date</th></tr></thead>
      <tbody>${leads.map(l => `
        <tr style="cursor:pointer;" onclick="location.hash='#/leads/${l._id}'">
          <td>${esc(l.user_name)}</td>
          <td>${esc(l.user_email)}</td>
          <td><span class="badge-status badge-status--${stageClass(l.stage)}">${stageName(l.stage)}</span></td>
          <td>${l.source_listing_id || "—"}</td>
          <td>${fmtDate(l.created_at)}</td>
        </tr>`).join("")}
      </tbody>
    </table>`;
  }
}

/* ═══════════════════════════════════════════════════════════════
   Lead Detail Page
   ═══════════════════════════════════════════════════════════════ */

function LeadDetailPage(id) {
  const el = document.createElement("div");
  el.innerHTML = `<div id="leadDetail">Loading...</div>`;
  loadLeadDetail(el, id);
  return el;
}

async function loadLeadDetail(el, id) {
  try {
    const data = await apiFetch(`/api/agent/leads/${id}`);
    const lead = data.lead;
    const notes = data.notes || [];
    const calcRuns = data.calculator_runs || [];
    const messages = data.messages || [];

    const container = el.querySelector("#leadDetail");
    container.innerHTML = `
      <a href="#/leads" style="opacity:0.6;font-size:0.85rem;">&larr; Back to Leads</a>
      <h2 style="margin:0.75rem 0 0.5rem;">${esc(lead.user_name)}</h2>
      <p style="opacity:0.6;margin-bottom:1.5rem;">${esc(lead.user_email)} &middot; Lead since ${fmtDate(lead.created_at)}</p>

      <div style="margin-bottom:1.5rem;">
        <label style="font-size:0.8rem;font-weight:600;margin-right:0.5rem;">Stage:</label>
        <select id="stageSelect" class="btn btn--ghost" style="padding:0.3rem 0.6rem;">
          ${["new","contacted","viewing_scheduled","offer_made","closed"].map(s =>
            `<option value="${s}" ${s === lead.stage ? "selected" : ""}>${stageName(s)}</option>`
          ).join("")}
        </select>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
        <div>
          <h3 style="margin-bottom:0.75rem;">Chat History</h3>
          <div style="max-height:300px;overflow-y:auto;border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:8px;padding:0.75rem;">
            ${messages.length === 0 ? "<p style='opacity:0.5'>No messages</p>" :
              messages.map(m => `<div class="chat-msg chat-msg--${m.role === 'user' ? 'user' : 'agent'}">${esc(m.content)}</div>`).join("")}
          </div>
        </div>
        <div>
          <h3 style="margin-bottom:0.75rem;">Calculator Runs</h3>
          ${calcRuns.length === 0 ? "<p style='opacity:0.5'>No calculator runs</p>" :
            `<table class="agent-table"><thead><tr><th>Listing</th><th>Price</th><th>Date</th></tr></thead><tbody>
            ${calcRuns.map(c => `<tr><td>${c.listing_id || "—"}</td><td>$${(c.purchase_price||0).toLocaleString()}</td><td>${fmtDate(c.created_at)}</td></tr>`).join("")}
            </tbody></table>`}
        </div>
      </div>

      <div style="margin-top:2rem;">
        <h3 style="margin-bottom:0.75rem;">Agent Notes</h3>
        <div id="notesList">
          ${notes.map(n => `<div style="padding:0.5rem 0;border-bottom:1px solid var(--border,rgba(255,255,255,0.06));">
            <div style="font-size:0.85rem;">${esc(n.content)}</div>
            <div style="font-size:0.7rem;opacity:0.5;">${fmtDate(n.created_at)}</div>
          </div>`).join("") || "<p style='opacity:0.5'>No notes yet</p>"}
        </div>
        <div style="display:flex;gap:0.5rem;margin-top:0.75rem;">
          <input id="noteInput" placeholder="Add a note..." style="flex:1;padding:0.5rem 0.75rem;border-radius:8px;border:1px solid var(--border,rgba(255,255,255,0.15));background:var(--card-bg,rgba(255,255,255,0.04));color:inherit;" />
          <button id="addNoteBtn" class="btn btn--primary">Add</button>
        </div>
      </div>
    `;

    container.querySelector("#stageSelect").addEventListener("change", async (e) => {
      await apiFetch(`/api/agent/leads/${id}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage: e.target.value })
      });
    });

    container.querySelector("#addNoteBtn").addEventListener("click", async () => {
      const input = container.querySelector("#noteInput");
      const content = input.value.trim();
      if (!content) return;
      await apiFetch(`/api/agent/leads/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ content })
      });
      input.value = "";
      loadLeadDetail(el, id);
    });
  } catch (err) {
    el.querySelector("#leadDetail").textContent = "Failed to load lead details.";
  }
}

/* ═══════════════════════════════════════════════════════════════
   Listings Page
   ═══════════════════════════════════════════════════════════════ */

function ListingsPage() {
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="section-header">
      <h2>Listings Manager</h2>
      <a href="#/listings/new" class="btn btn--primary">+ Add Listing</a>
    </div>
    <div id="listingsSummary" class="agent-help-banner" style="margin-top:0;"></div>
    <div id="listingsTable">Loading...</div>
  `;
  loadListings(el);
  return el;
}

async function loadListings(el) {
  try {
    const data = await apiFetch("/api/agent/listings");
    const listings = data.listings || [];
    const container = el.querySelector("#listingsTable");

    if (listings.length === 0) {
      container.innerHTML = "<p style='opacity:0.6;'>No listings yet.</p>";
      return;
    }

    const sales = listings.filter(l => l.kind === "sale").length;
    const rentals = listings.filter(l => l.kind === "rental").length;
    el.querySelector("#listingsSummary").textContent =
      `${listings.length} total in database · ${sales} sales · ${rentals} rentals (matches customer Sales/Rentals pages)`;

    container.innerHTML = `<table class="agent-table">
      <thead><tr><th>ID</th><th>Kind</th><th>Address</th><th>City</th><th>Type</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${listings.map(l => `
        <tr>
          <td style="font-size:0.75rem;opacity:0.7;">${esc(l.id)}</td>
          <td>${l.kind === "rental" ? "Rental" : "Sale"}</td>
          <td>${esc(l.address)}</td>
          <td>${esc(l.city)}, ${l.state}</td>
          <td>${esc(l.type)}</td>
          <td>$${(l.price||0).toLocaleString()}${l.discount ? ` <span class="discount-badge">${l.discount.type === 'percent' ? l.discount.amount + '%' : '$' + l.discount.amount} off</span>` : ""}</td>
          <td><span class="badge-status badge-status--${l.status}">${l.status}</span></td>
          <td class="actions">
            <button class="btn btn--ghost btn-edit" data-id="${l.id}">Edit</button>
            <button class="btn btn--ghost btn-status" data-id="${l.id}" data-status="${l.status}">
              ${l.status === "active" ? "Mark Sold" : "Reactivate"}
            </button>
            <button class="btn btn--ghost btn-discount" data-id="${l.id}">Discount</button>
            <button class="btn btn--ghost btn-delete" data-id="${l.id}" style="color:#ef4444;">Delete</button>
          </td>
        </tr>`).join("")}
      </tbody>
    </table>`;

    container.querySelectorAll(".btn-edit").forEach(btn => {
      btn.addEventListener("click", () => { location.hash = `#/listings/${btn.dataset.id}/edit`; });
    });

    container.querySelectorAll(".btn-status").forEach(btn => {
      btn.addEventListener("click", async () => {
        const newStatus = btn.dataset.status === "active" ? "sold" : "active";
        await apiFetch(`/api/agent/listings/${btn.dataset.id}/status`, {
          method: "PATCH", body: JSON.stringify({ status: newStatus })
        });
        loadListings(el);
      });
    });

    container.querySelectorAll(".btn-discount").forEach(btn => {
      btn.addEventListener("click", () => showDiscountModal(btn.dataset.id, el));
    });

    container.querySelectorAll(".btn-delete").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this listing?")) return;
        await apiFetch(`/api/agent/listings/${btn.dataset.id}`, { method: "DELETE" });
        loadListings(el);
      });
    });
  } catch {
    el.querySelector("#listingsTable").textContent = "Failed to load listings.";
  }
}

function showDiscountModal(listingId, parentEl) {
  const existing = document.getElementById("discountModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "discountModal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;";
  modal.innerHTML = `
    <div style="background:var(--bg,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:12px;padding:2rem;max-width:400px;width:90%;">
      <h3 style="margin-bottom:1rem;">Apply Discount</h3>
      <form id="discountForm" class="agent-form">
        <div class="form-group">
          <label>Type</label>
          <select id="discType"><option value="percent">Percentage (%)</option><option value="flat">Flat ($)</option></select>
        </div>
        <div class="form-group"><label>Amount</label><input type="number" id="discAmount" min="0" step="0.01" required /></div>
        <div class="form-group"><label>Expires</label><input type="date" id="discExpiry" /></div>
        <div style="display:flex;gap:0.5rem;">
          <button type="submit" class="btn btn--primary">Apply</button>
          <button type="button" class="btn btn--ghost" id="discCancel">Cancel</button>
          <button type="button" class="btn btn--ghost" id="discRemove" style="color:#ef4444;">Remove Discount</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);

  modal.querySelector("#discCancel").addEventListener("click", () => modal.remove());
  modal.querySelector("#discRemove").addEventListener("click", async () => {
    await apiFetch(`/api/agent/discounts/${listingId}`, { method: "DELETE" });
    modal.remove();
    loadListings(parentEl);
  });

  modal.querySelector("#discountForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await apiFetch("/api/agent/discounts", {
      method: "POST",
      body: JSON.stringify({
        listing_id: listingId,
        type: modal.querySelector("#discType").value,
        amount: Number(modal.querySelector("#discAmount").value),
        expires_at: modal.querySelector("#discExpiry").value || null,
      })
    });
    modal.remove();
    loadListings(parentEl);
  });
}

/* ═══════════════════════════════════════════════════════════════
   Listing Form Page (create / edit)
   ═══════════════════════════════════════════════════════════════ */

function ListingFormPage(editId) {
  const el = document.createElement("div");
  const isEdit = !!editId;
  el.innerHTML = `
    <a href="#/listings" style="opacity:0.6;font-size:0.85rem;">&larr; Back to Listings</a>
    <h2 style="margin:0.75rem 0 1.5rem;">${isEdit ? "Edit Listing" : "Add New Listing"}</h2>
    <form id="listingForm" class="agent-form">
      <div class="form-row">
        <div class="form-group"><label>Kind</label><select id="fKind"><option value="sale">Sale</option><option value="rental">Rental</option></select></div>
        <div class="form-group"><label>Type</label><input id="fType" placeholder="Single Family, Condo..." required /></div>
      </div>
      <div class="form-group"><label>Address</label><input id="fAddress" required /></div>
      <div class="form-row">
        <div class="form-group"><label>City</label><input id="fCity" required /></div>
        <div class="form-group"><label>State</label><input id="fState" maxlength="2" placeholder="NY" required /></div>
      </div>
      <div class="form-group"><label>Description</label><textarea id="fDesc"></textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Price ($)</label><input type="number" id="fPrice" min="0" required /></div>
        <div class="form-group"><label>Sqft</label><input type="number" id="fSqft" min="0" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Bedrooms</label><input type="number" id="fBeds" min="0" /></div>
        <div class="form-group"><label>Bathrooms</label><input type="number" id="fBaths" min="0" step="0.5" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Year Built</label><input type="number" id="fYear" min="1800" max="2030" /></div>
        <div class="form-group"><label>Image URL</label><input id="fImage" placeholder="https://..." /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Latitude</label><input type="number" id="fLat" step="0.0001" /></div>
        <div class="form-group"><label>Longitude</label><input type="number" id="fLng" step="0.0001" /></div>
      </div>
      <div id="formError" style="color:#ef4444;font-size:0.85rem;margin-bottom:0.75rem;"></div>
      <button type="submit" class="btn btn--primary">${isEdit ? "Update Listing" : "Create Listing"}</button>
    </form>`;

  if (isEdit) {
    loadListingForEdit(el, editId);
  }

  el.querySelector("#listingForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      kind: el.querySelector("#fKind").value,
      type: el.querySelector("#fType").value,
      address: el.querySelector("#fAddress").value,
      city: el.querySelector("#fCity").value,
      state: el.querySelector("#fState").value.toUpperCase(),
      description: el.querySelector("#fDesc").value,
      price: Number(el.querySelector("#fPrice").value),
      sqft: Number(el.querySelector("#fSqft").value) || null,
      bedrooms: Number(el.querySelector("#fBeds").value) || null,
      bathrooms: Number(el.querySelector("#fBaths").value) || null,
      year_built: Number(el.querySelector("#fYear").value) || null,
      image_url: el.querySelector("#fImage").value || null,
      lat: Number(el.querySelector("#fLat").value) || null,
      lng: Number(el.querySelector("#fLng").value) || null,
    };

    try {
      if (isEdit) {
        await apiFetch(`/api/agent/listings/${editId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/api/agent/listings", { method: "POST", body: JSON.stringify(body) });
      }
      location.hash = "#/listings";
    } catch (err) {
      el.querySelector("#formError").textContent = err.message;
    }
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

/* ═══════════════════════════════════════════════════════════════
   Chats Page (Active Chat Panel)
   ═══════════════════════════════════════════════════════════════ */

function ChatsPage() {
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="section-header"><h2>Active Chats</h2></div>
    <div class="chat-panel">
      <div class="chat-panel__list" id="chatList">Loading...</div>
      <div class="chat-panel__messages" id="chatMessages">
        <div class="chat-panel__msg-area" id="chatMsgArea">
          <p style="opacity:0.5;margin:auto;">Select a conversation to view messages</p>
        </div>
        <div class="chat-panel__input-row">
          <input id="chatInput" placeholder="Type a reply..." disabled />
          <button id="chatSendBtn" class="btn btn--primary" disabled>Send</button>
        </div>
      </div>
    </div>`;

  loadChatSessions(el);
  return el;
}

let activeSessionId = null;

async function loadChatSessions(el) {
  try {
    const data = await apiFetch("/api/agent/chats");
    const sessions = data.sessions || [];
    const listEl = el.querySelector("#chatList");

    if (sessions.length === 0) {
      listEl.innerHTML = "<p style='padding:1rem;opacity:0.5;'>No chat sessions yet.</p>";
      return;
    }

    listEl.innerHTML = sessions.map(s => {
      const isHuman = (s.session_type || "ai") === "human";
      return `
      <div class="chat-panel__conv ${s._id === activeSessionId ? 'chat-panel__conv--active' : ''}" data-id="${s._id}">
        <div class="chat-panel__conv-name">
          ${esc(s.user_name || "User")}
          <span class="chat-type-badge chat-type-badge--${isHuman ? "human" : "ai"}">${isHuman ? "Live Chat" : "AI Bot"}</span>
        </div>
        <div class="chat-panel__conv-preview">${s.total_messages || 0} messages &middot; ${fmtDate(s.started_at)}</div>
      </div>`;
    }).join("");

    listEl.querySelectorAll(".chat-panel__conv").forEach(item => {
      item.addEventListener("click", () => {
        activeSessionId = item.dataset.id;
        loadChatMessages(el, item.dataset.id);
        listEl.querySelectorAll(".chat-panel__conv").forEach(c => c.classList.remove("chat-panel__conv--active"));
        item.classList.add("chat-panel__conv--active");
      });
    });
  } catch {
    el.querySelector("#chatList").textContent = "Failed to load chats.";
  }
}

async function loadChatMessages(el, sessionId) {
  const msgArea = el.querySelector("#chatMsgArea");
  const input = el.querySelector("#chatInput");
  const sendBtn = el.querySelector("#chatSendBtn");

  try {
    const data = await apiFetch(`/api/agent/chats/${sessionId}/messages`);
    const messages = data.messages || [];

    msgArea.innerHTML = messages.map(m =>
      `<div class="chat-msg chat-msg--${m.role === 'user' ? 'user' : 'agent'}">${esc(m.content)}</div>`
    ).join("") || "<p style='opacity:0.5;margin:auto;'>No messages in this conversation.</p>";

    msgArea.scrollTop = msgArea.scrollHeight;
    input.disabled = false;
    sendBtn.disabled = false;

    sendBtn.onclick = async () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      await apiFetch(`/api/agent/chats/${sessionId}/reply`, {
        method: "POST",
        body: JSON.stringify({ message: text })
      });
      loadChatMessages(el, sessionId);
    };

    input.onkeydown = (e) => { if (e.key === "Enter") sendBtn.click(); };
  } catch {
    msgArea.innerHTML = "<p style='color:#ef4444;'>Failed to load messages.</p>";
  }
}

/* ═══════════════════════════════════════════════════════════════
   Appointments Page
   ═══════════════════════════════════════════════════════════════ */

function AppointmentsPage() {
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="section-header">
      <h2>Appointments</h2>
      <button class="btn btn--primary" id="newApptBtn">+ New Appointment</button>
    </div>
    <div id="calendarView"></div>
    <div id="apptList" style="margin-top:1.5rem;"></div>
  `;

  el.querySelector("#newApptBtn").addEventListener("click", () => showAppointmentModal(el));
  loadAppointments(el);
  return el;
}

async function loadAppointments(el) {
  try {
    const data = await apiFetch("/api/agent/appointments");
    const appointments = data.appointments || [];

    renderCalendar(el.querySelector("#calendarView"), appointments);

    const listEl = el.querySelector("#apptList");
    const upcoming = appointments.filter(a => new Date(a.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date));

    listEl.innerHTML = `<h3 style="margin-bottom:0.75rem;">Upcoming Viewings</h3>
      ${upcoming.length === 0 ? "<p style='opacity:0.5'>No upcoming appointments.</p>" :
        `<table class="agent-table"><thead><tr><th>Date</th><th>Time</th><th>Client</th><th>Source</th><th>Listing</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        ${upcoming.map(a => `<tr>
          <td>${fmtDate(a.date)}</td>
          <td>${a.time || "—"}</td>
          <td>${esc(a.client_name || "—")}${a.client_email ? `<br><span style="font-size:0.75rem;opacity:0.6;">${esc(a.client_email)}</span>` : ""}</td>
          <td>${a.source === "customer" ? "Customer" : "Agent"}</td>
          <td>${a.listing_id || "—"}</td>
          <td><span class="badge-status badge-status--${a.status === 'confirmed' ? 'active' : 'new'}">${a.status}</span></td>
          <td class="actions">
            <button class="btn btn--ghost btn-confirm" data-id="${a._id}">Confirm</button>
            <button class="btn btn--ghost btn-cancel-appt" data-id="${a._id}" style="color:#ef4444;">Cancel</button>
          </td>
        </tr>`).join("")}
        </tbody></table>`}`;

    listEl.querySelectorAll(".btn-confirm").forEach(btn => {
      btn.addEventListener("click", async () => {
        await apiFetch(`/api/agent/appointments/${btn.dataset.id}`, {
          method: "PATCH", body: JSON.stringify({ status: "confirmed" })
        });
        loadAppointments(el);
      });
    });

    listEl.querySelectorAll(".btn-cancel-appt").forEach(btn => {
      btn.addEventListener("click", async () => {
        await apiFetch(`/api/agent/appointments/${btn.dataset.id}`, {
          method: "PATCH", body: JSON.stringify({ status: "cancelled" })
        });
        loadAppointments(el);
      });
    });
  } catch {
    el.querySelector("#apptList").textContent = "Failed to load appointments.";
  }
}

function renderCalendar(container, appointments) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  const monthName = now.toLocaleString("default", { month: "long", year: "numeric" });
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let html = `<h3 style="margin-bottom:0.75rem;">${monthName}</h3><div class="calendar-grid">`;
  html += days.map(d => `<div class="calendar-grid__header">${d}</div>`).join("");

  for (let i = 0; i < firstDay; i++) html += `<div class="calendar-grid__day"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayAppts = appointments.filter(a => a.date && a.date.startsWith(dateStr));
    const isToday = d === today;

    html += `<div class="calendar-grid__day ${isToday ? 'calendar-grid__day--today' : ''}">
      <div class="calendar-grid__day-num">${d}</div>
      ${dayAppts.map(a => `<div class="calendar-grid__event">${a.time || ""} ${esc(a.client_name || "Viewing")}</div>`).join("")}
    </div>`;
  }

  html += "</div>";
  container.innerHTML = html;
}

function showAppointmentModal(parentEl) {
  const existing = document.getElementById("apptModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "apptModal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;";
  modal.innerHTML = `
    <div style="background:var(--bg,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:12px;padding:2rem;max-width:400px;width:90%;">
      <h3 style="margin-bottom:1rem;">New Appointment</h3>
      <form id="apptForm" class="agent-form">
        <div class="form-group"><label>Date</label><input type="date" id="apptDate" required /></div>
        <div class="form-group"><label>Time</label><input type="time" id="apptTime" /></div>
        <div class="form-group"><label>Client Name</label><input id="apptClient" required /></div>
        <div class="form-group"><label>Listing ID (optional)</label><input id="apptListing" /></div>
        <div class="form-group"><label>Notes</label><textarea id="apptNotes"></textarea></div>
        <div style="display:flex;gap:0.5rem;">
          <button type="submit" class="btn btn--primary">Create</button>
          <button type="button" class="btn btn--ghost" id="apptCancel">Cancel</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);

  modal.querySelector("#apptCancel").addEventListener("click", () => modal.remove());
  modal.querySelector("#apptForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await apiFetch("/api/agent/appointments", {
      method: "POST",
      body: JSON.stringify({
        date: modal.querySelector("#apptDate").value,
        time: modal.querySelector("#apptTime").value,
        client_name: modal.querySelector("#apptClient").value,
        listing_id: modal.querySelector("#apptListing").value || null,
        notes: modal.querySelector("#apptNotes").value || null,
      })
    });
    modal.remove();
    loadAppointments(parentEl);
  });
}

/* ═══════════════════════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════════════════════ */

function esc(str) {
  if (!str) return "";
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function stageName(stage) {
  const map = { new: "New", contacted: "Contacted", viewing_scheduled: "Viewing Scheduled", offer_made: "Offer Made", closed: "Closed" };
  return map[stage] || stage;
}

function stageClass(stage) {
  const map = { new: "new", contacted: "contacted", viewing_scheduled: "viewing", offer_made: "offer", closed: "closed" };
  return map[stage] || "new";
}

function NotFoundPage() {
  const el = document.createElement("div");
  el.innerHTML = "<h1>404</h1><p>Page not found.</p>";
  return el;
}
