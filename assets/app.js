/** -------------------------
 *  Auth (backend session)
 *  ------------------------- */

let currentUser = null;

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include", // IMPORTANT: sends session cookie
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  // Try to read JSON either way
  let data = null;
  try { data = await res.json(); } catch {}

  if (!res.ok) {
    const msg = data?.error || `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function getUser() {
  return currentUser;
}

function setUser(user) {
  currentUser = user;
  syncAuthUI();
}

async function refreshMe() {
  try {
    const data = await apiFetch("/api/auth/me", { method: "GET" });
    setUser(data.user);
  } catch {
    setUser(null);
  }
}

async function logout() {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch {
    // even if logout fails, clear UI
  }
  setUser(null);
  location.hash = "#/";
}

function syncAuthUI() {
  const user = getUser();
  const badge = document.getElementById("userBadge");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (user) {
    badge.textContent = `Hi, ${user.name}`;
    badge.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    loginBtn.classList.add("hidden");
  } else {
    badge.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    loginBtn.classList.remove("hidden");
  }
}


/** -------------------------
 *  Router
 *  ------------------------- */
const routes = {
  "/": HomePage,
  "/sales": () => ListingsPage("sale"),
  "/rentals": () => ListingsPage("rental"),
  "/mortgage": MortgagePage,
  "/auth": AuthPage,
  "/contact": ContactPage,
};

window.addEventListener("hashchange", render);
document.getElementById("logoutBtn").addEventListener("click", logout);
syncAuthUI();
refreshMe(); // loads session user if already logged in
render();


function render() {
  const path = (location.hash || "#/").replace("#", "");
  const page = routes[path] || NotFoundPage;

  setActiveNav(path);
  const app = document.getElementById("app");
  app.innerHTML = "";
  app.appendChild(page());
}

function setActiveNav(path) {
  document.querySelectorAll(".nav a").forEach(a => {
    const href = a.getAttribute("href")?.replace("#", "");
    a.classList.toggle("active", href === path);
  });
}

/** -------------------------
 *  Pages
 *  ------------------------- */
function HomePage() {
  const el = document.createElement("div");
  el.className = "grid";
  el.innerHTML = `
    <section class="hero">
      <div class="pill">Fast • Simple • Student-friendly</div>
      <h1 style="margin:10px 0 6px;font-size:34px;letter-spacing:-.6px;">Own It Property Calculator</h1>
      <div class="card__muted" style="max-width:820px;">
        Browse Sales & Rental listings, then estimate payments with a mortgage calculator + amortization schedule.
      </div>
      <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">
        <a class="btn btn--primary" href="#/mortgage">Try Mortgage Calculator</a>
        <a class="btn" href="#/sales">Browse Sales</a>
        <a class="btn" href="#/rentals">Browse Rentals</a>
      </div>
    </section>

    <section class="grid grid--3">
      <div class="card"><div class="card__body">
        <div class="card__title">Featured Listings</div>
        <div class="card__muted">Quick picks based on popular cities.</div>
        <div id="featured" style="margin-top:12px;display:grid;gap:10px;"></div>
      </div></div>

      <div class="card"><div class="card__body">
        <div class="card__title">Easy Filters</div>
        <div class="card__muted">City, price range, beds/baths, status, sorting.</div>
        <div class="notice" style="margin-top:12px;">Works for both Sales and Rentals.</div>
      </div></div>

      <div class="card"><div class="card__body">
        <div class="card__title">Calculator + Amortization</div>
        <div class="card__muted">See P&I, taxes, insurance, HOA, PMI and the full month-by-month breakdown.</div>
        <div style="margin-top:12px;">
          <a class="btn btn--primary" href="#/mortgage">Open Calculator</a>
        </div>
      </div></div>
    </section>
  `;

   const featured = el.querySelector("#featured");
  featured.innerHTML = `<div class="notice">Loading featured listings...</div>`;

  (async () => {
    try {
      const data = await apiFetch("/api/listings?kind=sale&status=active&sort=price_desc");
      const top = (data.listings || []).slice(0, 3);

      featured.innerHTML = top.length
        ? top.map(cardListing).join("")
        : `<div class="notice">No featured listings found.</div>`;
    } catch (err) {
      featured.innerHTML = `<div class="notice">Could not load listings: ${err.message}</div>`;
    }
  })();


  return el;
}

function ContactPage() {
  const el = document.createElement("div");
  el.className = "grid grid--2";
  el.innerHTML = `
    <div class="card"><div class="card__body">
      <div class="card__title">Contact Us</div>
      <div class="card__muted">Questions or feedback? Reach us here.</div>
      <div style="margin-top:14px;display:grid;gap:10px;">
        <div class="pill">Email: support@ownit.example</div>
        <div class="pill">Phone: (555) 123-4567</div>
      </div>
    </div></div>

    <div class="card"><div class="card__body">
      <div class="card__title">Tip</div>
      <div class="card__muted">For the project demo, explain this is a sample contact section (no real email sending yet).</div>
      <div class="notice" style="margin-top:12px;">If you want, you can add a “mailto:” link later.</div>
    </div></div>
  `;
  return el;
}

function AuthPage() {
  const el = document.createElement("div");
  el.className = "grid grid--2";

  el.innerHTML = `
    <div class="card"><div class="card__body">
      <div class="card__title">Register</div>
      <div class="card__muted">Create a simple account (saved in the browser).</div>

      <form id="registerForm" style="margin-top:14px;display:grid;gap:12px;">
        <div class="field">
          <label>Full Name</label>
          <input name="name" placeholder="Jane Doe" required />
        </div>
        <div class="field">
          <label>Email</label>
          <input name="email" type="email" placeholder="jane@email.com" required />
        </div>
        <div class="field">
          <label>Password</label>
          <input name="password" type="password" minlength="4" required />
        </div>
        <button class="btn btn--primary" type="submit">Create Account</button>
        <div class="notice">Demo auth using backend + SQLite + session cookie.</div>
      </form>
    </div></div>

    <div class="card"><div class="card__body">
      <div class="card__title">Login</div>
      <div class="card__muted">Use the same email/password you registered with.</div>

      <form id="loginForm" style="margin-top:14px;display:grid;gap:12px;">
        <div class="field">
          <label>Email</label>
          <input name="email" type="email" required />
        </div>
        <div class="field">
          <label>Password</label>
          <input name="password" type="password" required />
        </div>
        <button class="btn" type="submit">Login</button>
        <div id="authMsg" class="notice hidden"></div>
      </form>
    </div></div>
  `;

  const msg = el.querySelector("#authMsg");
el.querySelector("#registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));

  try {
    const res = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password
      })
    });

    setUser(res.user);
    location.hash = "#/";
  } catch (err) {
    msg.textContent = err.message;
    msg.classList.remove("hidden");
  }
});


  el.querySelector("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));

  try {
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: data.email,
        password: data.password
      })
    });

    setUser(res.user);
    location.hash = "#/";
  } catch (err) {
    msg.textContent = err.message;
    msg.classList.remove("hidden");
  }
});


  return el;
}

function ListingsPage(kind) {
  const el = document.createElement("div");
  const title = kind === "sale" ? "Sales Listings" : "Rental Listings";
  const subtitle = kind === "sale" ? "Find your dream home across all 50 states" : "Discover amazing rentals nationwide";

  // All US states for filter dropdown
  const states = [
    { code: "", name: "All States" },
    { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
    { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
    { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
    { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
    { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
    { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
    { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
    { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
    { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
    { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
    { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
    { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
    { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
    { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
    { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
    { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
    { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }
  ];
  const stateOptions = states.map(s => `<option value="${s.code}">${s.name}</option>`).join("");

  el.className = "listings-container";
  el.innerHTML = `
    <div class="listings-hero">
      <h1 class="listings-hero__title">${title}</h1>
      <p class="listings-hero__subtitle">${subtitle}</p>
    </div>

    <div class="listings-filters card">
      <div class="card__body">
        <div class="filters-grid">
          <div class="field">
            <label>State</label>
            <select id="fState">${stateOptions}</select>
          </div>
          <div class="field">
            <label>City</label>
            <input id="fCity" placeholder="Any city" />
          </div>
          <div class="field">
            <label>Status</label>
            <select id="fStatus">
              <option value="">Any</option>
              <option value="active">Active</option>
              <option value="sold">${kind === "sale" ? "Sold" : "Rented"}</option>
            </select>
          </div>
          <div class="field">
            <label>Min Price</label>
            <input id="fMin" type="number" placeholder="0" />
          </div>
          <div class="field">
            <label>Max Price</label>
            <input id="fMax" type="number" placeholder="Any" />
          </div>
          <div class="field">
            <label>Beds (min)</label>
            <input id="fBeds" type="number" placeholder="0" />
          </div>
          <div class="field">
            <label>Baths (min)</label>
            <input id="fBaths" type="number" placeholder="0" />
          </div>
          <div class="field">
            <label>Sort by</label>
            <select id="fSort">
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
              <option value="beds_desc">Bedrooms: Most</option>
              <option value="baths_desc">Bathrooms: Most</option>
            </select>
          </div>
          <div class="field filter-buttons">
            <button id="applyBtn" class="btn btn--primary" type="button">🔍 Search</button>
            <button id="resetBtn" class="btn" type="button">↺ Reset</button>
          </div>
        </div>
      </div>
    </div>

    <div class="listings-results">
      <div id="resultsCount" class="results-count"></div>
      <div id="listingsGrid" class="listings-grid"></div>
    </div>
  `;

  // Grab DOM refs
  const f = {
    state: el.querySelector("#fState"),
    city: el.querySelector("#fCity"),
    status: el.querySelector("#fStatus"),
    min: el.querySelector("#fMin"),
    max: el.querySelector("#fMax"),
    beds: el.querySelector("#fBeds"),
    baths: el.querySelector("#fBaths"),
    sort: el.querySelector("#fSort"),
  };

  const grid = el.querySelector("#listingsGrid");
  const count = el.querySelector("#resultsCount");

  // Draw listings
  const draw = async () => {
    grid.innerHTML = `<div class="listings-loading"><div class="spinner"></div>Loading listings...</div>`;
    count.textContent = "";

    const params = new URLSearchParams();
    params.set("kind", kind);

    const state = f.state.value;
    if (state) params.set("state", state);

    const city = f.city.value.trim();
    if (city) params.set("city", city);

    const status = f.status.value;
    if (status) params.set("status", status);

    if (f.min.value) params.set("minPrice", f.min.value);
    if (f.max.value) params.set("maxPrice", f.max.value);
    if (f.beds.value) params.set("beds", f.beds.value);
    if (f.baths.value) params.set("baths", f.baths.value);

    if (f.sort.value) params.set("sort", f.sort.value);

    try {
      const data = await apiFetch(`/api/listings?${params.toString()}`);
      const list = data.listings || [];
      count.innerHTML = `<span class="count-number">${list.length}</span> ${kind === "sale" ? "properties" : "rentals"} found`;
      
      if (list.length === 0) {
        grid.innerHTML = `<div class="no-results">
          <span class="no-results-icon">🏠</span>
          <p>No listings found matching your criteria.</p>
          <p class="card__muted">Try adjusting your filters.</p>
        </div>`;
      } else {
        grid.innerHTML = list.map(l => cardListingNew(l, kind)).join("");
      }
    } catch (err) {
      grid.innerHTML = `<div class="error-message">Error loading listings: ${err.message}</div>`;
    }
  };

  el.querySelector("#applyBtn").addEventListener("click", draw);

  el.querySelector("#resetBtn").addEventListener("click", () => {
    f.state.value = "";
    f.city.value = "";
    f.status.value = "";
    f.min.value = "";
    f.max.value = "";
    f.beds.value = "";
    f.baths.value = "";
    f.sort.value = "price_asc";
    draw();
  });

  draw();
  return el;
}

function cardListingNew(l, kind) {
  const isRent = kind === "rental";
  const statusClass = l.status === "active" ? "status-active" : "status-sold";
  const statusText = l.status === "active" ? "Active" : (isRent ? "Rented" : "Sold");
  const defaultImg = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800";
  const imgUrl = l.image_url || defaultImg;
  
  return `
    <div class="listing-card">
      <div class="listing-card__image" style="background-image: url('${imgUrl}');">
        <span class="listing-card__status ${statusClass}">${statusText}</span>
        <span class="listing-card__type">${l.type}</span>
      </div>
      <div class="listing-card__content">
        <div class="listing-card__price">${money(l.price, isRent)}</div>
        <div class="listing-card__location">
          <span class="location-icon">📍</span>
          ${l.city}${l.state ? ", " + l.state : ""}
        </div>
        ${l.address ? `<div class="listing-card__address">${l.address}</div>` : ""}
        <div class="listing-card__details">
          <span class="detail"><b>${l.bedrooms}</b> beds</span>
          <span class="detail-divider">•</span>
          <span class="detail"><b>${l.bathrooms}</b> baths</span>
          ${l.sqft ? `<span class="detail-divider">•</span><span class="detail"><b>${l.sqft.toLocaleString()}</b> sqft</span>` : ""}
        </div>
        ${l.description ? `<p class="listing-card__desc">${l.description}</p>` : ""}
        ${l.year_built ? `<div class="listing-card__year">Built in ${l.year_built}</div>` : ""}
      </div>
    </div>
  `;
}


function MortgagePage() {
  const el = document.createElement("div");
  el.className = "mortgage-container";

  // Interest rates by state (30-year fixed, as of 2026)
  const stateRates = {
    "AL": { name: "Alabama", rate: 6.85 },
    "AK": { name: "Alaska", rate: 6.92 },
    "AZ": { name: "Arizona", rate: 6.78 },
    "AR": { name: "Arkansas", rate: 6.88 },
    "CA": { name: "California", rate: 6.65 },
    "CO": { name: "Colorado", rate: 6.72 },
    "CT": { name: "Connecticut", rate: 6.80 },
    "DE": { name: "Delaware", rate: 6.82 },
    "FL": { name: "Florida", rate: 6.70 },
    "GA": { name: "Georgia", rate: 6.75 },
    "HI": { name: "Hawaii", rate: 6.95 },
    "ID": { name: "Idaho", rate: 6.83 },
    "IL": { name: "Illinois", rate: 6.77 },
    "IN": { name: "Indiana", rate: 6.79 },
    "IA": { name: "Iowa", rate: 6.81 },
    "KS": { name: "Kansas", rate: 6.84 },
    "KY": { name: "Kentucky", rate: 6.86 },
    "LA": { name: "Louisiana", rate: 6.89 },
    "ME": { name: "Maine", rate: 6.78 },
    "MD": { name: "Maryland", rate: 6.73 },
    "MA": { name: "Massachusetts", rate: 6.68 },
    "MI": { name: "Michigan", rate: 6.76 },
    "MN": { name: "Minnesota", rate: 6.74 },
    "MS": { name: "Mississippi", rate: 6.91 },
    "MO": { name: "Missouri", rate: 6.82 },
    "MT": { name: "Montana", rate: 6.87 },
    "NE": { name: "Nebraska", rate: 6.80 },
    "NV": { name: "Nevada", rate: 6.71 },
    "NH": { name: "New Hampshire", rate: 6.75 },
    "NJ": { name: "New Jersey", rate: 6.69 },
    "NM": { name: "New Mexico", rate: 6.84 },
    "NY": { name: "New York", rate: 6.67 },
    "NC": { name: "North Carolina", rate: 6.74 },
    "ND": { name: "North Dakota", rate: 6.86 },
    "OH": { name: "Ohio", rate: 6.78 },
    "OK": { name: "Oklahoma", rate: 6.88 },
    "OR": { name: "Oregon", rate: 6.70 },
    "PA": { name: "Pennsylvania", rate: 6.76 },
    "RI": { name: "Rhode Island", rate: 6.79 },
    "SC": { name: "South Carolina", rate: 6.77 },
    "SD": { name: "South Dakota", rate: 6.85 },
    "TN": { name: "Tennessee", rate: 6.81 },
    "TX": { name: "Texas", rate: 6.73 },
    "UT": { name: "Utah", rate: 6.75 },
    "VT": { name: "Vermont", rate: 6.82 },
    "VA": { name: "Virginia", rate: 6.71 },
    "WA": { name: "Washington", rate: 6.68 },
    "WV": { name: "West Virginia", rate: 6.90 },
    "WI": { name: "Wisconsin", rate: 6.77 },
    "WY": { name: "Wyoming", rate: 6.88 },
    "DC": { name: "Washington D.C.", rate: 6.72 }
  };

  const stateOptions = Object.entries(stateRates)
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([code, data]) => `<option value="${code}">${data.name} (${data.rate}%)</option>`)
    .join('');

  el.innerHTML = `
    <!-- Hero Section -->
    <div class="mortgage-hero">
      <div class="mortgage-hero__title">🏠 Mortgage Calculator</div>
      <div class="mortgage-hero__sub">Estimate your monthly payment and see a detailed breakdown of your costs</div>
    </div>

    <!-- Main Layout -->
    <div class="mortgage-layout">
      <!-- Input Form -->
      <div class="mortgage-form">
        <div class="mortgage-form__title">
          <span class="mortgage-form__icon">📊</span>
          Loan Details
        </div>
        <div class="mortgage-form__grid">
          <div class="mortgage-input">
            <label>Home Price</label>
            <input id="homePrice" type="number" value="700000" placeholder="$700,000" />
          </div>

          <div class="mortgage-input">
            <label>Down Payment</label>
            <input id="downPayment" type="number" value="140000" placeholder="$140,000" />
          </div>

          <div class="mortgage-input state-select">
            <label>📍 Select State (Auto-fills Rate)</label>
            <select id="stateSelect">
              <option value="">-- Select a State --</option>
              ${stateOptions}
            </select>
          </div>

          <div class="mortgage-form__row">
            <div class="mortgage-input">
              <label>Loan Term</label>
              <select id="termYears">
                <option value="30">30 years</option>
                <option value="20">20 years</option>
                <option value="15">15 years</option>
                <option value="10">10 years</option>
              </select>
            </div>
            <div class="mortgage-input">
              <label>Interest Rate (%)</label>
              <input id="rate" type="number" step="0.01" value="6.75" placeholder="6.75%" />
            </div>
          </div>

          <div class="mortgage-form__row">
            <div class="mortgage-input">
              <label>Property Tax (yearly)</label>
              <input id="tax" type="number" value="12000" placeholder="$12,000" />
            </div>
            <div class="mortgage-input">
              <label>Insurance (yearly)</label>
              <input id="ins" type="number" value="1800" placeholder="$1,800" />
            </div>
          </div>

          <div class="mortgage-form__row">
            <div class="mortgage-input">
              <label>Monthly HOA</label>
              <input id="hoa" type="number" value="0" placeholder="$0" />
            </div>
            <div class="mortgage-input">
              <label>Include PMI?</label>
              <select id="includePmi">
                <option value="yes">Yes (if &lt;20% down)</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          <div class="mortgage-input">
            <label>PMI Rate (annual % of loan)</label>
            <input id="pmiRate" type="number" step="0.01" value="0.6" placeholder="0.6%" />
          </div>

          <button id="calcBtn" class="mortgage-btn" type="button">
            ✨ Calculate Payment
          </button>
        </div>
      </div>

      <!-- Results Panel -->
      <div class="mortgage-results">
        <!-- Total Monthly Card -->
        <div class="mortgage-total-card">
          <div class="mortgage-total__label">Estimated Monthly Payment</div>
          <div id="totalMonthly" class="mortgage-total__value">$0</div>
          <div id="loanSummary" class="mortgage-total__sub">Loan: $0 • 30 years @ 6.75%</div>
        </div>

        <!-- Donut Chart -->
        <div class="mortgage-chart">
          <div class="mortgage-chart__title">Payment Breakdown</div>
          <div class="mortgage-chart__container">
            <div class="mortgage-donut">
              <svg viewBox="0 0 100 100" id="donutChart">
                <!-- Segments will be inserted here -->
              </svg>
              <div class="mortgage-donut__center">
                <div id="donutCenterValue" class="mortgage-donut__center-value">$0</div>
                <div class="mortgage-donut__center-label">per month</div>
              </div>
            </div>
            <div id="chartLegend" class="mortgage-legend">
              <!-- Legend items will be inserted here -->
            </div>
          </div>
        </div>

        <!-- Stat Cards -->
        <div id="breakdownCards" class="mortgage-breakdown">
          <!-- Breakdown cards will be inserted here -->
        </div>
      </div>
    </div>

    <!-- Amortization Table -->
    <div class="mortgage-amort">
      <div class="mortgage-amort__header">
        <div class="mortgage-amort__title">📅 Amortization Schedule</div>
        <div class="mortgage-amort__stats">
          <div class="mortgage-amort__stat">
            <div class="mortgage-amort__stat-label">Total Interest</div>
            <div id="totalInterest" class="mortgage-amort__stat-value">$0</div>
          </div>
          <div class="mortgage-amort__stat">
            <div class="mortgage-amort__stat-label">Total Cost</div>
            <div id="totalCost" class="mortgage-amort__stat-value">$0</div>
          </div>
        </div>
      </div>
      <div class="mortgage-amort__table">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Payment</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>Balance</th>
              <th>Total Interest</th>
            </tr>
          </thead>
          <tbody id="amRows"></tbody>
        </table>
      </div>
    </div>

    <!-- Info Cards -->
    <div class="mortgage-info-grid">
      <div class="mortgage-info-card">
        <div class="mortgage-info-card__icon">📐</div>
        <div class="mortgage-info-card__title">How It's Calculated</div>
        <div class="mortgage-info-card__content">
          Monthly P&I uses the standard amortization formula:<br/>
          <strong style="color:var(--accent2);">M = P × [r(1+r)ⁿ] / [(1+r)ⁿ - 1]</strong><br/>
          Where r = monthly rate, n = total months
        </div>
      </div>

      <div class="mortgage-info-card">
        <div class="mortgage-info-card__icon">🏦</div>
        <div class="mortgage-info-card__title">Loan Types</div>
        <ul class="mortgage-info-card__list">
          <li>Conventional (most common)</li>
          <li>FHA (lower down payment)</li>
          <li>VA (for veterans)</li>
          <li>USDA (rural areas)</li>
        </ul>
      </div>

      <div class="mortgage-info-card">
        <div class="mortgage-info-card__icon">❓</div>
        <div class="mortgage-info-card__title">What is PMI?</div>
        <div class="mortgage-info-card__content">
          Private Mortgage Insurance is typically required when your down payment is less than 20%. It protects the lender if you default on the loan.
        </div>
      </div>

      <div class="mortgage-info-card">
        <div class="mortgage-info-card__icon">💡</div>
        <div class="mortgage-info-card__title">Pro Tips</div>
        <ul class="mortgage-info-card__list">
          <li>20%+ down removes PMI requirement</li>
          <li>15-year loans have lower rates</li>
          <li>Extra payments reduce total interest</li>
        </ul>
      </div>
    </div>

    <!-- State Rates Table -->
    <div class="mortgage-rates-section">
      <div class="mortgage-rates-header">
        <div class="mortgage-rates-title">
          <span>📍</span> Interest Rates by State (30-Year Fixed)
        </div>
        <div class="mortgage-rates-sub">Current average rates across all 50 states + D.C.</div>
      </div>
      <div class="mortgage-rates-grid" id="stateRatesGrid">
        <!-- State rates will be populated here -->
      </div>
    </div>
  `;

  const amRows = el.querySelector("#amRows");
  const donutChart = el.querySelector("#donutChart");
  const chartLegend = el.querySelector("#chartLegend");
  const breakdownCards = el.querySelector("#breakdownCards");
  const totalMonthlyEl = el.querySelector("#totalMonthly");
  const loanSummaryEl = el.querySelector("#loanSummary");
  const donutCenterValue = el.querySelector("#donutCenterValue");
  const totalInterestEl = el.querySelector("#totalInterest");
  const totalCostEl = el.querySelector("#totalCost");
  const stateRatesGrid = el.querySelector("#stateRatesGrid");

  // Populate state rates grid
  const sortedStates = Object.entries(stateRates).sort((a, b) => a[1].name.localeCompare(b[1].name));
  const avgRate = (sortedStates.reduce((sum, [,d]) => sum + d.rate, 0) / sortedStates.length).toFixed(2);
  
  stateRatesGrid.innerHTML = sortedStates.map(([code, data]) => {
    const isLow = data.rate < avgRate;
    const isHigh = data.rate > 6.85;
    return `
      <div class="state-rate-card ${isLow ? 'state-rate-card--low' : ''} ${isHigh ? 'state-rate-card--high' : ''}" data-state="${code}">
        <div class="state-rate-card__code">${code}</div>
        <div class="state-rate-card__name">${data.name}</div>
        <div class="state-rate-card__rate">${data.rate}%</div>
      </div>
    `;
  }).join('');

  // Click on state card to select that state
  stateRatesGrid.querySelectorAll('.state-rate-card').forEach(card => {
    card.addEventListener('click', () => {
      const code = card.dataset.state;
      const stateSelect = el.querySelector("#stateSelect");
      const rateInput = el.querySelector("#rate");
      stateSelect.value = code;
      rateInput.value = stateRates[code].rate;
      calc();
      // Scroll to top of calculator
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const colors = {
    pAndI: '#7c5cff',
    tax: '#29d7ff',
    insurance: '#ff6b9d',
    hoa: '#ffd93d',
    pmi: '#6bcb77'
  };

  function createDonutChart(data) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return '';
    
    let cumulative = 0;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    
    return data.filter(d => d.value > 0).map(d => {
      const percent = d.value / total;
      const dashArray = percent * circumference;
      const dashOffset = -cumulative * circumference;
      cumulative += percent;
      
      return `<circle
        cx="50" cy="50" r="${radius}"
        fill="none"
        stroke="${d.color}"
        stroke-width="12"
        stroke-dasharray="${dashArray} ${circumference}"
        stroke-dashoffset="${dashOffset}"
        style="transition: all 0.5s ease;"
      />`;
    }).join('');
  }

  function createLegend(data) {
    return data.filter(d => d.value > 0).map(d => `
      <div class="mortgage-legend__item">
        <span class="mortgage-legend__dot" style="background:${d.color}"></span>
        <span>${d.label}</span>
        <span class="mortgage-legend__value">${money(d.value)}</span>
      </div>
    `).join('');
  }

  function createBreakdownCards(monthly) {
    const cards = [
      { label: 'Principal & Interest', value: monthly.pAndI, color: colors.pAndI, sub: 'Loan payment' },
      { label: 'Property Tax', value: monthly.tax, color: colors.tax, sub: 'Monthly portion' },
      { label: 'Home Insurance', value: monthly.insurance, color: colors.insurance, sub: 'Monthly portion' },
      { label: 'HOA Fees', value: monthly.hoa, color: colors.hoa, sub: 'If applicable' },
      { label: 'PMI', value: monthly.pmi, color: colors.pmi, sub: 'Until 20% equity' },
      { label: 'Loan Amount', value: monthly.loan, color: '#a9b3d6', sub: 'Total borrowed' }
    ];

    return cards.map(c => `
      <div class="mortgage-stat" style="--stat-color: ${c.color}">
        <div class="mortgage-stat__label">${c.label}</div>
        <div class="mortgage-stat__value">${money(c.value)}</div>
        <div class="mortgage-stat__sub">${c.sub}</div>
      </div>
    `).join('');
  }

  const calc = () => {
    const homePrice = num(el.querySelector("#homePrice").value);
    const downPayment = num(el.querySelector("#downPayment").value);
    const termYears = num(el.querySelector("#termYears").value);
    const rate = num(el.querySelector("#rate").value);
    const tax = num(el.querySelector("#tax").value);
    const ins = num(el.querySelector("#ins").value);
    const hoa = num(el.querySelector("#hoa").value);
    const includePmi = el.querySelector("#includePmi").value === "yes";
    const pmiRate = num(el.querySelector("#pmiRate").value);

    const monthly = monthlyHousingCost({
      homePrice,
      downPayment,
      annualRatePct: rate,
      termYears,
      annualPropertyTax: tax,
      annualHomeInsurance: ins,
      monthlyHOA: hoa,
      includePMI: includePmi,
      pmiRateAnnualPct: pmiRate
    });

    // Update total monthly
    totalMonthlyEl.textContent = money(monthly.totalMonthly);
    donutCenterValue.textContent = money(monthly.totalMonthly);
    loanSummaryEl.textContent = `Loan: ${money(monthly.loan)} • ${termYears} years @ ${rate}%`;

    // Create donut chart data
    const chartData = [
      { label: 'Principal & Interest', value: monthly.pAndI, color: colors.pAndI },
      { label: 'Property Tax', value: monthly.tax, color: colors.tax },
      { label: 'Insurance', value: monthly.insurance, color: colors.insurance },
      { label: 'HOA', value: monthly.hoa, color: colors.hoa },
      { label: 'PMI', value: monthly.pmi, color: colors.pmi }
    ];

    donutChart.innerHTML = createDonutChart(chartData);
    chartLegend.innerHTML = createLegend(chartData);
    breakdownCards.innerHTML = createBreakdownCards(monthly);

    // Amortization schedule
    const am = amortizationSchedule({ homePrice, downPayment, annualRatePct: rate, termYears });
    
    // Update total interest and cost
    const lastRow = am.rows[am.rows.length - 1];
    totalInterestEl.textContent = money(lastRow?.cumulativeInterest || 0);
    totalCostEl.textContent = money((lastRow?.cumulativeInterest || 0) + monthly.loan);

    amRows.innerHTML = am.rows.map(r => `
      <tr>
        <td class="month-cell">${r.month}</td>
        <td>${money(r.monthlyPayment)}</td>
        <td style="color:#6bcb77;">${money(r.principalPaid)}</td>
        <td style="color:#ff6b9d;">${money(r.interestPaid)}</td>
        <td class="balance-cell">${money(r.balance)}</td>
        <td style="color:var(--muted);">${money(r.cumulativeInterest)}</td>
      </tr>
    `).join("");
  };

  // State selector - auto-fill interest rate
  const stateSelect = el.querySelector("#stateSelect");
  const rateInput = el.querySelector("#rate");
  
  stateSelect.addEventListener("change", () => {
    const stateCode = stateSelect.value;
    if (stateCode && stateRates[stateCode]) {
      rateInput.value = stateRates[stateCode].rate;
      calc();
    }
  });

  el.querySelector("#calcBtn").addEventListener("click", calc);
  
  // Also calculate on input change for live updates
  el.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('change', calc);
  });
  
  calc();
  return el;
}

function NotFoundPage() {
  const el = document.createElement("div");
  el.innerHTML = `<div class="card"><div class="card__body">
    <div class="card__title">Page not found</div>
    <div class="card__muted">Go back to <a href="#/" style="text-decoration:underline;">Home</a>.</div>
  </div></div>`;
  return el;
}

/** -------------------------
 *  Helpers (Listings)
 *  ------------------------- */
function filterAndSort(list, filters) {
  const {
    city, status, minPrice, maxPrice, bedrooms, bathrooms, sortBy
  } = filters;

  let out = list.slice();

  if (city) out = out.filter(l => l.city.toLowerCase() === city.toLowerCase());
  if (status) out = out.filter(l => l.status === status);

  if (minPrice != null) out = out.filter(l => l.price >= minPrice);
  if (maxPrice != null) out = out.filter(l => l.price <= maxPrice);

  if (bedrooms != null) out = out.filter(l => l.bedrooms >= bedrooms);
  if (bathrooms != null) out = out.filter(l => l.bathrooms >= bathrooms);

  const sorters = {
    price_asc: (a,b) => a.price - b.price,
    price_desc: (a,b) => b.price - a.price,
    beds_desc: (a,b) => b.bedrooms - a.bedrooms,
    baths_desc: (a,b) => b.bathrooms - a.bathrooms,
  };
  if (sortBy && sorters[sortBy]) out.sort(sorters[sortBy]);

  return out;
}

function rowListing(l) {
  return `
    <tr>
      <td>${l.id}</td>
      <td>${l.type}</td>
      <td>${l.city}</td>
      <td>${cap(l.status)}</td>
      <td>${money(l.price, l.kind === "rental")}</td>
      <td>${l.bedrooms}</td>
      <td>${l.bathrooms}</td>
    </tr>
  `;
}

function cardListing(l) {
  const isRent = l.kind === "rental";
  return `
    <div class="notice" style="display:flex;justify-content:space-between;gap:10px;">
      <div>
        <b>${l.city}</b> • ${l.type}<br/>
        <span style="color:var(--muted);font-size:13px;">
          ${l.bedrooms} bd • ${l.bathrooms} ba • ${cap(l.status)}
        </span>
      </div>
      <div style="font-weight:800;">${money(l.price, isRent)}</div>
    </div>
  `;
}

/** -------------------------
 *  Helpers (Mortgage)
 *  ------------------------- */
function monthlyPayment(principal, annualRatePct, termYears) {
  const r = (annualRatePct / 100) / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function amortizationSchedule({ homePrice, downPayment, annualRatePct, termYears }) {
  const principal0 = Math.max(0, homePrice - downPayment);
  const pAndI = monthlyPayment(principal0, annualRatePct, termYears);
  const r = (annualRatePct / 100) / 12;
  const n = termYears * 12;

  let balance = principal0;
  let cumInterest = 0;
  const rows = [];

  for (let month = 1; month <= n; month++) {
    const interest = balance * r;
    const principalPaid = Math.min(balance, pAndI - interest);
    balance = Math.max(0, balance - principalPaid);
    cumInterest += interest;

    rows.push({
      month,
      monthlyPayment: round2(pAndI),
      balance: round2(balance),
      principalPaid: round2(principalPaid),
      interestPaid: round2(interest),
      cumulativeInterest: round2(cumInterest)
    });

    if (balance <= 0) break;
  }

  return { principal: principal0, pAndI: round2(pAndI), rows };
}

function monthlyHousingCost({
  homePrice, downPayment, annualRatePct, termYears,
  annualPropertyTax, annualHomeInsurance, monthlyHOA,
  includePMI, pmiRateAnnualPct
}) {
  const loan = Math.max(0, homePrice - downPayment);
  const pAndI = monthlyPayment(loan, annualRatePct, termYears);

  const tax = (annualPropertyTax || 0) / 12;
  const ins = (annualHomeInsurance || 0) / 12;
  const hoa = monthlyHOA || 0;

  const downPct = homePrice > 0 ? (downPayment / homePrice) * 100 : 0;
  const pmi = (includePMI && downPct < 20)
    ? (loan * ((pmiRateAnnualPct || 0) / 100)) / 12
    : 0;

  return {
    loan: round2(loan),
    pAndI: round2(pAndI),
    tax: round2(tax),
    insurance: round2(ins),
    hoa: round2(hoa),
    pmi: round2(pmi),
    totalMonthly: round2(pAndI + tax + ins + hoa + pmi)
  };
}

/** -------------------------
 *  Utils
 *  ------------------------- */
function num(v){ return Number(v || 0); }
function numOrNull(v){ return v === "" || v == null ? null : Number(v); }
function round2(x){ return Math.round((x + Number.EPSILON) * 100) / 100; }
function money(n, isRent=false){
  const v = Number(n || 0);
  const s = v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return isRent ? `$${s}/mo` : `$${s}`;
}
function cap(s){ return (s||"").charAt(0).toUpperCase() + (s||"").slice(1); }
function kv(k,v){
  return `<div class="notice" style="display:flex;justify-content:space-between;gap:10px;">
    <span>${k}</span><b>${v}</b>
  </div>`;
}
