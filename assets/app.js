/** -------------------------
 *  Auth (backend session)
 *  ------------------------- */

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
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  
  const res = await fetch(url, {
    credentials: "include",
    headers,
    ...options
  });

  // Try to read JSON either way
  let data = null;
  try { data = await res.json(); } catch { }

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
  clearToken();
  setUser(null);
  location.hash = "#/";
}

function syncAuthUI() {
  const user = getUser();
  const badge = document.getElementById("userBadge");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const subNav = document.getElementById("subNav");

  if (user) {
    badge.textContent = `Hi, ${user.name}`;
    badge.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    loginBtn.classList.add("hidden");
    if (subNav) subNav.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    loginBtn.classList.remove("hidden");
    if (subNav) subNav.classList.add("hidden");
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
  "/subscription": SubscriptionPage,
};

window.addEventListener("hashchange", render);
document.getElementById("logoutBtn").addEventListener("click", logout);
syncAuthUI();
refreshMe(); // loads session user if already logged in

/** -------------------------
 *  Theme Toggle (light / dark)
 *  ------------------------- */
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
function currentTileUrl() {
  return document.documentElement.classList.contains('light') ? TILE_LIGHT : TILE_DARK;
}

// Set dark mode by default if no theme is stored
if (!localStorage.getItem('theme')) {
  document.documentElement.classList.add('dark');
  localStorage.setItem('theme', 'dark');
}

// Theme toggle click handler
document.getElementById('themeToggle').addEventListener('click', function() {
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    localStorage.setItem('theme', 'light');
    console.log('Theme: Light');
  } else {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    console.log('Theme: Dark');
  }
  window.dispatchEvent(new Event('ownit-theme-change'));
});

render();


function render() {
  const path = (location.hash || "#/").replace("#", "");

  // Handle dynamic /listing/:id route
  const listingMatch = path.match(/^\/listing\/(.+)$/);
  let page;
  let navPath = path;
  if (listingMatch) {
    const id = listingMatch[1];
    page = () => ListingDetailPage(id);
    navPath = "/sales";
  } else {
    page = routes[path] || NotFoundPage;
  }

  setActiveNav(navPath);
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

    <!-- Interactive Map Section -->
    <section class="home-map-section">
      <div class="home-map-header">
        <div class="home-map-header__text">
          <div class="home-map-badge">Explore Properties</div>
          <h2 class="home-map-header__title">Discover Properties Across the <span class="gradient-text">United States</span></h2>
          <p class="home-map-header__sub">Interactive map with real-time property hotspots. Click any marker to explore listings in that area.</p>
        </div>
        <div class="home-map-stats">
          <div class="home-map-stat">
            <span class="home-map-stat__value" id="mapStatStates">50</span>
            <span class="home-map-stat__label">States</span>
          </div>
          <div class="home-map-stat">
            <span class="home-map-stat__value" id="mapStatCities">200+</span>
            <span class="home-map-stat__label">Cities</span>
          </div>
          <div class="home-map-stat">
            <span class="home-map-stat__value" id="mapStatListings">--</span>
            <span class="home-map-stat__label">Listings</span>
          </div>
        </div>
      </div>
      <div class="home-map-wrapper">
        <div class="home-map-container">
          <div id="homeMap" class="home-map"></div>
          <div class="home-map-overlay-gradient"></div>
        </div>
        <div class="home-map-sidebar">
          <div class="home-map-sidebar__title">Trending Markets</div>
          <div id="trendingMarkets" class="home-map-sidebar__list">
            <div class="trending-item" data-lat="40.7128" data-lng="-74.006">
              <div class="trending-item__dot" style="background:#7c5cff;"></div>
              <div class="trending-item__info">
                <div class="trending-item__city">New York, NY</div>
                <div class="trending-item__detail">High demand • Avg $3,200/mo</div>
              </div>
              <div class="trending-item__arrow">→</div>
            </div>
            <div class="trending-item" data-lat="34.0522" data-lng="-118.2437">
              <div class="trending-item__dot" style="background:#29d7ff;"></div>
              <div class="trending-item__info">
                <div class="trending-item__city">Los Angeles, CA</div>
                <div class="trending-item__detail">Rising prices • Avg $2,800/mo</div>
              </div>
              <div class="trending-item__arrow">→</div>
            </div>
            <div class="trending-item" data-lat="41.8781" data-lng="-87.6298">
              <div class="trending-item__dot" style="background:#6bcb77;"></div>
              <div class="trending-item__info">
                <div class="trending-item__city">Chicago, IL</div>
                <div class="trending-item__detail">Best value • Avg $1,900/mo</div>
              </div>
              <div class="trending-item__arrow">→</div>
            </div>
            <div class="trending-item" data-lat="29.7604" data-lng="-95.3698">
              <div class="trending-item__dot" style="background:#ffd93d;"></div>
              <div class="trending-item__info">
                <div class="trending-item__city">Houston, TX</div>
                <div class="trending-item__detail">Growing fast • Avg $1,600/mo</div>
              </div>
              <div class="trending-item__arrow">→</div>
            </div>
            <div class="trending-item" data-lat="25.7617" data-lng="-80.1918">
              <div class="trending-item__dot" style="background:#ff6b9d;"></div>
              <div class="trending-item__info">
                <div class="trending-item__city">Miami, FL</div>
                <div class="trending-item__detail">Hot market • Avg $2,500/mo</div>
              </div>
              <div class="trending-item__arrow">→</div>
            </div>
            <div class="trending-item" data-lat="47.6062" data-lng="-122.3321">
              <div class="trending-item__dot" style="background:#a78bfa;"></div>
              <div class="trending-item__info">
                <div class="trending-item__city">Seattle, WA</div>
                <div class="trending-item__detail">Tech hub • Avg $2,400/mo</div>
              </div>
              <div class="trending-item__arrow">→</div>
            </div>
          </div>
          <div style="display:grid;gap:8px;margin-top:12px;">
            <a href="#/sales" class="btn btn--primary" style="width:100%;text-align:center;">Browse Sales →</a>
            <a href="#/rentals" class="btn" style="width:100%;text-align:center;border-color:var(--accent2);color:var(--accent2);">Browse Rentals →</a>
          </div>
        </div>
      </div>
    </section>

    <section class="grid grid--3">
      <div class="card"><div class="card__body">
        <div class="card__title">Featured Listings</div>
        <div class="card__muted">Quick picks — tap a city to see what's available.</div>
        <div id="quickPickBtns" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;">
          <button class="btn quick-pick-btn quick-pick-btn--active" data-city="">All</button>
          <button class="btn quick-pick-btn" data-city="New York">New York</button>
          <button class="btn quick-pick-btn" data-city="Los Angeles">LA</button>
          <button class="btn quick-pick-btn" data-city="Chicago">Chicago</button>
          <button class="btn quick-pick-btn" data-city="Miami">Miami</button>
          <button class="btn quick-pick-btn" data-city="Houston">Houston</button>
        </div>
        <div id="featured" style="margin-top:12px;display:grid;gap:10px;"></div>
      </div></div>

      <div class="card"><div class="card__body">
        <div class="card__title">Easy Filters</div>
        <div class="card__muted">Jump straight to filtered results.</div>
        <div style="margin-top:14px;display:grid;gap:10px;">
          <div class="field">
            <label>I'm looking for</label>
            <select id="efKind">
              <option value="sale">Sales</option>
              <option value="rental">Rentals</option>
            </select>
          </div>
          <div class="field">
            <label>Price up to</label>
            <select id="efPrice">
              <option value="">Any</option>
              <option value="1500">$1,500/mo</option>
              <option value="2500">$2,500/mo</option>
              <option value="300000">$300k</option>
              <option value="500000">$500k</option>
            </select>
          </div>
          <div class="field">
            <label>Min Bedrooms</label>
            <select id="efBeds">
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
          </div>
          <button id="efGoBtn" class="btn btn--primary" style="width:100%;">Search Listings →</button>
        </div>
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

  // Quick-pick city loader — fetches BOTH sales + rentals
  async function loadFeatured(city) {
    featured.innerHTML = `<div class="notice">Loading...</div>`;
    try {
      const cityQ = city ? `&city=${encodeURIComponent(city)}` : '';
      const [salesData, rentalData] = await Promise.all([
        apiFetch(`/api/listings?kind=sale&status=active&sort=price_desc${cityQ}`),
        apiFetch(`/api/listings?kind=rental&status=active&sort=price_desc${cityQ}`),
      ]);
      const sales = (salesData.listings || []).slice(0, 2);
      const rentals = (rentalData.listings || []).slice(0, 2);
      const combined = [...sales, ...rentals];

      if (combined.length === 0) {
        featured.innerHTML = `<div class="notice">No listings found${city ? ' in ' + city : ''}.</div>`;
      } else {
        featured.innerHTML = combined.map(l => cardListing(l)).join('');
      }
    } catch (err) {
      featured.innerHTML = `<div class="notice">Could not load listings: ${err.message}</div>`;
    }
  }

  // Wire up quick-pick buttons
  el.querySelectorAll('.quick-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.quick-pick-btn').forEach(b => b.classList.remove('quick-pick-btn--active'));
      btn.classList.add('quick-pick-btn--active');
      loadFeatured(btn.dataset.city);
    });
  });

  loadFeatured(''); // initial load — all cities

  // Easy Filters "Go" button
  el.querySelector('#efGoBtn').addEventListener('click', () => {
    const kind = el.querySelector('#efKind').value;
    const route = kind === 'rental' ? '#/rentals' : '#/sales';
    // We'll set hash, then after page renders set filter values
    location.hash = route;
  });

  // Update listing count on map stat
  (async () => {
    try {
      const [sd, rd] = await Promise.all([
        apiFetch('/api/listings?kind=sale'),
        apiFetch('/api/listings?kind=rental'),
      ]);
      const total = (sd.listings || []).length + (rd.listings || []).length;
      const statEl = el.querySelector('#mapStatListings');
      if (statEl) statEl.textContent = total > 0 ? total : '--';
    } catch { }
  })();

  // ---------- Initialize Home Page Map ----------
  setTimeout(() => {
    const mapContainer = el.querySelector("#homeMap");
    if (!mapContainer || typeof L === "undefined") return;

    const map = L.map(mapContainer, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    }).setView([39.5, -98.35], 4);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Theme-aware map tiles
    let tileLayer = L.tileLayer(currentTileUrl(), {
      maxZoom: 19,
      attribution: ''
    }).addTo(map);

    window.addEventListener('ownit-theme-change', () => {
      map.removeLayer(tileLayer);
      tileLayer = L.tileLayer(currentTileUrl(), { maxZoom: 19, attribution: '' }).addTo(map);
    });

    // Property hotspot cities with coordinates
    const hotspots = [
      { city: "New York", state: "NY", lat: 40.7128, lng: -74.006, color: "#7c5cff", listings: 45, avgPrice: "$3,200" },
      { city: "Los Angeles", state: "CA", lat: 34.0522, lng: -118.2437, color: "#29d7ff", listings: 38, avgPrice: "$2,800" },
      { city: "Chicago", state: "IL", lat: 41.8781, lng: -87.6298, color: "#6bcb77", listings: 29, avgPrice: "$1,900" },
      { city: "Houston", state: "TX", lat: 29.7604, lng: -95.3698, color: "#ffd93d", listings: 33, avgPrice: "$1,600" },
      { city: "Miami", state: "FL", lat: 25.7617, lng: -80.1918, color: "#ff6b9d", listings: 27, avgPrice: "$2,500" },
      { city: "Seattle", state: "WA", lat: 47.6062, lng: -122.3321, color: "#a78bfa", listings: 22, avgPrice: "$2,400" },
      { city: "Denver", state: "CO", lat: 39.7392, lng: -104.9903, color: "#7c5cff", listings: 18, avgPrice: "$2,100" },
      { city: "Phoenix", state: "AZ", lat: 33.4484, lng: -112.074, color: "#29d7ff", listings: 25, avgPrice: "$1,800" },
      { city: "Atlanta", state: "GA", lat: 33.749, lng: -84.388, color: "#6bcb77", listings: 21, avgPrice: "$1,700" },
      { city: "Boston", state: "MA", lat: 42.3601, lng: -71.0589, color: "#ffd93d", listings: 19, avgPrice: "$2,900" },
      { city: "San Francisco", state: "CA", lat: 37.7749, lng: -122.4194, color: "#ff6b9d", listings: 31, avgPrice: "$3,500" },
      { city: "Nashville", state: "TN", lat: 36.1627, lng: -86.7816, color: "#a78bfa", listings: 16, avgPrice: "$1,800" },
      { city: "Austin", state: "TX", lat: 30.2672, lng: -97.7431, color: "#7c5cff", listings: 24, avgPrice: "$2,000" },
      { city: "Portland", state: "OR", lat: 45.5152, lng: -122.6784, color: "#29d7ff", listings: 14, avgPrice: "$2,200" },
      { city: "Charlotte", state: "NC", lat: 35.2271, lng: -80.8431, color: "#6bcb77", listings: 17, avgPrice: "$1,500" },
      { city: "Las Vegas", state: "NV", lat: 36.1699, lng: -115.1398, color: "#ffd93d", listings: 20, avgPrice: "$1,700" },
      { city: "Minneapolis", state: "MN", lat: 44.9778, lng: -93.265, color: "#ff6b9d", listings: 12, avgPrice: "$1,600" },
      { city: "Philadelphia", state: "PA", lat: 39.9526, lng: -75.1652, color: "#a78bfa", listings: 23, avgPrice: "$1,800" },
      { city: "San Diego", state: "CA", lat: 32.7157, lng: -117.1611, color: "#7c5cff", listings: 26, avgPrice: "$2,600" },
      { city: "Dallas", state: "TX", lat: 32.7767, lng: -96.797, color: "#29d7ff", listings: 28, avgPrice: "$1,700" },
      { city: "Salt Lake City", state: "UT", lat: 40.7608, lng: -111.891, color: "#6bcb77", listings: 11, avgPrice: "$1,500" },
      { city: "Raleigh", state: "NC", lat: 35.7796, lng: -78.6382, color: "#ffd93d", listings: 15, avgPrice: "$1,600" },
      { city: "Detroit", state: "MI", lat: 42.3314, lng: -83.0458, color: "#ff6b9d", listings: 13, avgPrice: "$1,200" },
      { city: "Kansas City", state: "MO", lat: 39.0997, lng: -94.5786, color: "#a78bfa", listings: 10, avgPrice: "$1,300" },
      { city: "Tampa", state: "FL", lat: 27.9506, lng: -82.4572, color: "#7c5cff", listings: 22, avgPrice: "$2,000" },
    ];

    // Custom pulsing circle marker
    function createPulseIcon(color) {
      return L.divIcon({
        className: 'map-pulse-marker',
        html: `<div class="pulse-dot" style="background:${color};box-shadow:0 0 12px ${color}80;"><div class="pulse-ring" style="border-color:${color};"></div></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
    }

    hotspots.forEach(h => {
      const marker = L.marker([h.lat, h.lng], { icon: createPulseIcon(h.color) }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:var(--font);min-width:160px;">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${h.city}, ${h.state}</div>
          <div style="color:#666;font-size:12px;margin-bottom:6px;">~${h.listings} active listings</div>
          <div style="font-weight:600;color:#7c5cff;font-size:13px;">Avg ${h.avgPrice}/mo</div>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <a href="#/sales" style="font-size:12px;color:#7c5cff;text-decoration:underline;">Sales →</a>
            <a href="#/rentals" style="font-size:12px;color:#29d7ff;text-decoration:underline;">Rentals →</a>
          </div>
        </div>
      `);
    });

    // Clicking trending market item flies to that city
    el.querySelectorAll(".trending-item").forEach(item => {
      item.addEventListener("click", () => {
        const lat = parseFloat(item.dataset.lat);
        const lng = parseFloat(item.dataset.lng);
        if (lat && lng) map.flyTo([lat, lng], 10, { duration: 1.5 });
      });
    });

    // Fix map rendering after DOM insertion
    setTimeout(() => map.invalidateSize(), 200);
  }, 100);

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

      if (res.token) {
        saveToken(res.token);
      }
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

      if (res.token) {
        saveToken(res.token);
      }
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
        <div class="filters-header">
          <div class="filters-header__title">
            <span class="filters-header__icon">🔍</span>
            Filter Properties
          </div>
        </div>
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
        </div>
        <div class="filters-action-row">
          <div class="field">
            <label>Sort by</label>
            <select id="fSort">
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
              <option value="beds_desc">Bedrooms: Most</option>
              <option value="baths_desc">Bathrooms: Most</option>
            </select>
          </div>
          <div class="filter-buttons">
            <button id="resetBtn" class="btn" type="button">↺ Reset</button>
            <button id="applyBtn" class="btn btn--primary" type="button">🔍 Search</button>
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
          <span class="no-results-icon"></span>
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
    <div class="listing-card" onclick="location.hash='#/listing/${l.id}'" style="cursor:pointer;">
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

  // Track which calculator is active
  let activeCalc = "mortgage"; // "mortgage" or "rental"

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

  // Cities by state for rental calculator
  const stateCities = {
    "AL": ["Birmingham", "Montgomery", "Huntsville", "Mobile", "Tuscaloosa", "Hoover", "Dothan", "Auburn", "Decatur", "Madison"],
    "AK": ["Anchorage", "Fairbanks", "Juneau", "Sitka", "Ketchikan", "Wasilla", "Kenai", "Kodiak", "Bethel", "Palmer"],
    "AZ": ["Phoenix", "Tucson", "Mesa", "Chandler", "Scottsdale", "Glendale", "Gilbert", "Tempe", "Peoria", "Surprise"],
    "AR": ["Little Rock", "Fort Smith", "Fayetteville", "Springdale", "Jonesboro", "Rogers", "Conway", "North Little Rock", "Bentonville", "Pine Bluff"],
    "CA": ["Los Angeles", "San Diego", "San Jose", "San Francisco", "Fresno", "Sacramento", "Long Beach", "Oakland", "Bakersfield", "Anaheim", "Santa Ana", "Riverside", "Irvine", "Santa Clara", "Pasadena"],
    "CO": ["Denver", "Colorado Springs", "Aurora", "Fort Collins", "Lakewood", "Thornton", "Arvada", "Westminster", "Pueblo", "Boulder"],
    "CT": ["Bridgeport", "New Haven", "Stamford", "Hartford", "Waterbury", "Norwalk", "Danbury", "New Britain", "West Hartford", "Greenwich"],
    "DE": ["Wilmington", "Dover", "Newark", "Middletown", "Bear", "Brookside", "Glasgow", "Hockessin", "Smyrna", "Milford"],
    "FL": ["Jacksonville", "Miami", "Tampa", "Orlando", "St. Petersburg", "Hialeah", "Port St. Lucie", "Cape Coral", "Tallahassee", "Fort Lauderdale", "Pembroke Pines", "Hollywood", "Gainesville", "Miramar", "Coral Springs"],
    "GA": ["Atlanta", "Augusta", "Columbus", "Macon", "Savannah", "Athens", "Sandy Springs", "South Fulton", "Roswell", "Johns Creek"],
    "HI": ["Honolulu", "Pearl City", "Hilo", "Kailua", "Waipahu", "Kaneohe", "Mililani Town", "Kahului", "Ewa Gentry", "Kihei"],
    "ID": ["Boise", "Meridian", "Nampa", "Idaho Falls", "Caldwell", "Pocatello", "Coeur d'Alene", "Twin Falls", "Post Falls", "Lewiston"],
    "IL": ["Chicago", "Aurora", "Joliet", "Naperville", "Rockford", "Springfield", "Elgin", "Peoria", "Champaign", "Waukegan"],
    "IN": ["Indianapolis", "Fort Wayne", "Evansville", "South Bend", "Carmel", "Bloomington", "Fishers", "Hammond", "Gary", "Lafayette"],
    "IA": ["Des Moines", "Cedar Rapids", "Davenport", "Sioux City", "Iowa City", "Waterloo", "Ames", "West Des Moines", "Council Bluffs", "Ankeny"],
    "KS": ["Wichita", "Overland Park", "Kansas City", "Olathe", "Topeka", "Lawrence", "Shawnee", "Manhattan", "Lenexa", "Salina"],
    "KY": ["Louisville", "Lexington", "Bowling Green", "Owensboro", "Covington", "Richmond", "Georgetown", "Florence", "Hopkinsville", "Nicholasville"],
    "LA": ["New Orleans", "Baton Rouge", "Shreveport", "Metairie", "Lafayette", "Lake Charles", "Kenner", "Bossier City", "Monroe", "Alexandria"],
    "ME": ["Portland", "Lewiston", "Bangor", "South Portland", "Auburn", "Biddeford", "Sanford", "Brunswick", "Scarborough", "Westbrook"],
    "MD": ["Baltimore", "Columbia", "Germantown", "Silver Spring", "Waldorf", "Frederick", "Ellicott City", "Glen Burnie", "Gaithersburg", "Rockville"],
    "MA": ["Boston", "Worcester", "Springfield", "Cambridge", "Lowell", "Brockton", "New Bedford", "Quincy", "Lynn", "Fall River"],
    "MI": ["Detroit", "Grand Rapids", "Warren", "Sterling Heights", "Ann Arbor", "Lansing", "Flint", "Dearborn", "Livonia", "Troy"],
    "MN": ["Minneapolis", "Saint Paul", "Rochester", "Bloomington", "Duluth", "Brooklyn Park", "Plymouth", "Maple Grove", "Woodbury", "St. Cloud"],
    "MS": ["Jackson", "Gulfport", "Southaven", "Biloxi", "Hattiesburg", "Olive Branch", "Tupelo", "Meridian", "Greenville", "Horn Lake"],
    "MO": ["Kansas City", "St. Louis", "Springfield", "Columbia", "Independence", "Lee's Summit", "O'Fallon", "St. Joseph", "St. Charles", "Blue Springs"],
    "MT": ["Billings", "Missoula", "Great Falls", "Bozeman", "Butte", "Helena", "Kalispell", "Havre", "Anaconda", "Miles City"],
    "NE": ["Omaha", "Lincoln", "Bellevue", "Grand Island", "Kearney", "Fremont", "Hastings", "Norfolk", "North Platte", "Columbus"],
    "NV": ["Las Vegas", "Henderson", "Reno", "North Las Vegas", "Sparks", "Carson City", "Fernley", "Elko", "Mesquite", "Boulder City"],
    "NH": ["Manchester", "Nashua", "Concord", "Derry", "Dover", "Rochester", "Salem", "Merrimack", "Hudson", "Londonderry"],
    "NJ": ["Newark", "Jersey City", "Paterson", "Elizabeth", "Edison", "Woodbridge", "Lakewood", "Toms River", "Hamilton", "Trenton", "Clifton", "Camden", "Brick", "Cherry Hill", "Hoboken"],
    "NM": ["Albuquerque", "Las Cruces", "Rio Rancho", "Santa Fe", "Roswell", "Farmington", "Clovis", "Hobbs", "Alamogordo", "Carlsbad"],
    "NY": ["New York City", "Buffalo", "Rochester", "Yonkers", "Syracuse", "Albany", "New Rochelle", "Mount Vernon", "Schenectady", "Utica", "White Plains", "Troy", "Niagara Falls", "Binghamton", "Long Beach"],
    "NC": ["Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem", "Fayetteville", "Cary", "Wilmington", "High Point", "Concord"],
    "ND": ["Fargo", "Bismarck", "Grand Forks", "Minot", "West Fargo", "Williston", "Dickinson", "Mandan", "Jamestown", "Wahpeton"],
    "OH": ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron", "Dayton", "Parma", "Canton", "Youngstown", "Lorain"],
    "OK": ["Oklahoma City", "Tulsa", "Norman", "Broken Arrow", "Edmond", "Lawton", "Moore", "Midwest City", "Enid", "Stillwater"],
    "OR": ["Portland", "Salem", "Eugene", "Gresham", "Hillsboro", "Beaverton", "Bend", "Medford", "Springfield", "Corvallis"],
    "PA": ["Philadelphia", "Pittsburgh", "Allentown", "Reading", "Scranton", "Bethlehem", "Lancaster", "Harrisburg", "Altoona", "Erie"],
    "RI": ["Providence", "Warwick", "Cranston", "Pawtucket", "East Providence", "Woonsocket", "Newport", "Central Falls", "Westerly", "North Providence"],
    "SC": ["Charleston", "Columbia", "North Charleston", "Mount Pleasant", "Rock Hill", "Greenville", "Summerville", "Goose Creek", "Hilton Head Island", "Sumter"],
    "SD": ["Sioux Falls", "Rapid City", "Aberdeen", "Brookings", "Watertown", "Mitchell", "Yankton", "Pierre", "Huron", "Vermillion"],
    "TN": ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Clarksville", "Murfreesboro", "Franklin", "Jackson", "Johnson City", "Bartlett"],
    "TX": ["Houston", "San Antonio", "Dallas", "Austin", "Fort Worth", "El Paso", "Arlington", "Corpus Christi", "Plano", "Laredo", "Lubbock", "Garland", "Irving", "Frisco", "McKinney"],
    "UT": ["Salt Lake City", "West Valley City", "Provo", "West Jordan", "Orem", "Sandy", "St. George", "Ogden", "Layton", "Taylorsville"],
    "VT": ["Burlington", "South Burlington", "Rutland", "Barre", "Montpelier", "Winooski", "St. Albans", "Newport", "Vergennes", "Middlebury"],
    "VA": ["Virginia Beach", "Norfolk", "Chesapeake", "Richmond", "Newport News", "Alexandria", "Hampton", "Roanoke", "Portsmouth", "Suffolk"],
    "WA": ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue", "Kent", "Everett", "Renton", "Federal Way", "Spokane Valley"],
    "WV": ["Charleston", "Huntington", "Morgantown", "Parkersburg", "Wheeling", "Weirton", "Fairmont", "Martinsburg", "Beckley", "Clarksburg"],
    "WI": ["Milwaukee", "Madison", "Green Bay", "Kenosha", "Racine", "Appleton", "Waukesha", "Eau Claire", "Oshkosh", "Janesville"],
    "WY": ["Cheyenne", "Casper", "Laramie", "Gillette", "Rock Springs", "Sheridan", "Green River", "Evanston", "Riverton", "Jackson"],
    "DC": ["Washington", "Georgetown", "Capitol Hill", "Dupont Circle", "Adams Morgan", "Columbia Heights", "Navy Yard", "Foggy Bottom", "Chinatown", "U Street"]
  };

  // Generate state options for rental calculator
  const rentalStateOptions = '<option value="">Select a State</option>' +
    Object.entries(stateCities)
      .sort((a, b) => {
        const nameA = stateRates[a[0]]?.name || a[0];
        const nameB = stateRates[b[0]]?.name || b[0];
        return nameA.localeCompare(nameB);
      })
      .map(([code]) => {
        const name = stateRates[code]?.name || code;
        return `<option value="${code}">${name}</option>`;
      })
      .join('');

  const stateOptions = Object.entries(stateRates)
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([code, data]) => `<option value="${code}">${data.name} (${data.rate}%)</option>`)
    .join('');

  el.innerHTML = `
    <!-- Hero Section -->
    <div class="mortgage-hero">
      <div class="mortgage-hero__title">🏠 Property Calculator</div>
      <div class="mortgage-hero__sub">Estimate your monthly payments for buying or renting a property</div>
    </div>

    <!-- Calculator Type Selector -->
    <div class="calc-type-selector">
      <button id="mortgageCalcBtn" class="calc-type-btn calc-type-btn--active" data-type="mortgage">
        <span class="calc-type-btn__icon"></span>
        <span class="calc-type-btn__label">Mortgage Calculator</span>
        <span class="calc-type-btn__desc">Calculate home loan payments</span>
      </button>
      <button id="rentalCalcBtn" class="calc-type-btn" data-type="rental">
        <span class="calc-type-btn__icon"></span>
        <span class="calc-type-btn__label">Rental Calculator</span>
        <span class="calc-type-btn__desc">Estimate rental costs & affordability</span>
      </button>
    </div>

    <!-- Mortgage Calculator Section -->
    <div id="mortgageCalcSection" class="calc-section">
      <!-- Main Layout -->
      <div class="mortgage-layout">
        <!-- Input Form -->
        <div class="mortgage-form">
          <div class="mortgage-form__title">
            <span class="mortgage-form__icon"></span>
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
              <label>Select State (Auto-fills Rate)</label>
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

      <!-- State Rates Table (Moved Up) -->
      <div class="mortgage-rates-section">
        <div class="mortgage-rates-header">
          <div class="mortgage-rates-title">
            <span></span> Interest Rates by State (30-Year Fixed)
          </div>
          <div class="mortgage-rates-sub">Current average rates across all 50 states + D.C. • Click to apply rate</div>
        </div>
        <div class="mortgage-rates-grid" id="stateRatesGrid">
          <!-- State rates will be populated here -->
        </div>
      </div>

      <!-- Info Cards -->
      <div class="mortgage-info-grid">
        <div class="mortgage-info-card">
          <div class="mortgage-info-card__icon"></div>
          <div class="mortgage-info-card__title">How It's Calculated</div>
          <div class="mortgage-info-card__content">
            Monthly P&I uses the standard amortization formula:<br/>
            <strong style="color:var(--accent2);">M = P × [r(1+r)ⁿ] / [(1+r)ⁿ - 1]</strong><br/>
            Where r = monthly rate, n = total months
          </div>
        </div>

        <div class="mortgage-info-card">
          <div class="mortgage-info-card__icon"></div>
          <div class="mortgage-info-card__title">Loan Types</div>
          <ul class="mortgage-info-card__list">
            <li>Conventional (most common)</li>
            <li>FHA (lower down payment)</li>
            <li>VA (for veterans)</li>
            <li>USDA (rural areas)</li>
          </ul>
        </div>

        <div class="mortgage-info-card">
          <div class="mortgage-info-card__icon"></div>
          <div class="mortgage-info-card__title">What is PMI?</div>
          <div class="mortgage-info-card__content">
            Private Mortgage Insurance is typically required when your down payment is less than 20%. It protects the lender if you default on the loan.
          </div>
        </div>

        <div class="mortgage-info-card">
          <div class="mortgage-info-card__icon"></div>
          <div class="mortgage-info-card__title">Pro Tips</div>
          <ul class="mortgage-info-card__list">
            <li>20%+ down removes PMI requirement</li>
            <li>15-year loans have lower rates</li>
            <li>Extra payments reduce total interest</li>
          </ul>
        </div>
      </div>

      <!-- Amortization Table (Moved to Bottom) -->
      <div class="mortgage-amort">
        <div class="mortgage-amort__header">
          <div class="mortgage-amort__title">Amortization Schedule</div>
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
    </div>

    <!-- Rental Calculator Section -->
    <div id="rentalCalcSection" class="calc-section" style="display: none;">
      <div class="mortgage-layout">
        <!-- Rental Input Form -->
        <div class="mortgage-form">
          <div class="mortgage-form__title">
            <span class="mortgage-form__icon"></span>
            Rental Details
          </div>
          <div class="mortgage-form__grid">
            <div class="mortgage-form__row">
              <div class="mortgage-input">
                <label>State</label>
                <select id="rentalState">${rentalStateOptions}</select>
              </div>
              <div class="mortgage-input">
                <label>City</label>
                <select id="rentalCity">
                  <option value="">Select a State first</option>
                </select>
              </div>
            </div>

            <div class="mortgage-input">
              <label>Monthly Rent</label>
              <input id="monthlyRent" type="number" value="2500" placeholder="$2,500" />
            </div>

            <div class="mortgage-input">
              <label>Security Deposit</label>
              <input id="securityDeposit" type="number" value="2500" placeholder="$2,500" />
            </div>

            <div class="mortgage-form__row">
              <div class="mortgage-input">
                <label>Renter's Insurance (yearly)</label>
                <input id="rentersInsurance" type="number" value="180" placeholder="$180" />
              </div>
              <div class="mortgage-input">
                <label>Parking Fee (monthly)</label>
                <input id="parkingFee" type="number" value="0" placeholder="$0" />
              </div>
            </div>

            <div class="mortgage-form__row">
              <div class="mortgage-input">
                <label>Pet Deposit (one-time)</label>
                <input id="petDeposit" type="number" value="0" placeholder="$0" />
              </div>
              <div class="mortgage-input">
                <label>Pet Rent (monthly)</label>
                <input id="petRent" type="number" value="0" placeholder="$0" />
              </div>
            </div>

            <div class="mortgage-form__row">
              <div class="mortgage-input">
                <label>Utilities Estimate (monthly)</label>
                <input id="utilitiesEstimate" type="number" value="150" placeholder="$150" />
              </div>
              <div class="mortgage-input">
                <label>Lease Term (months)</label>
                <select id="leaseTerm">
                  <option value="12">12 months</option>
                  <option value="6">6 months</option>
                  <option value="18">18 months</option>
                  <option value="24">24 months</option>
                </select>
              </div>
            </div>

            <div class="mortgage-input">
              <label>Your Monthly Income (for affordability)</label>
              <input id="monthlyIncome" type="number" value="7000" placeholder="$7,000" />
            </div>

            <button id="rentalCalcBtnCalc" class="mortgage-btn" type="button">
               Calculate Rental Costs
            </button>
          </div>
        </div>

        <!-- Rental Results Panel -->
        <div class="mortgage-results">
          <!-- Total Monthly Card -->
          <div class="mortgage-total-card">
            <div class="mortgage-total__label">Total Monthly Cost</div>
            <div id="rentalTotalMonthly" class="mortgage-total__value">$0</div>
            <div id="rentalSummary" class="mortgage-total__sub">Rent + Insurance + Fees + Utilities</div>
          </div>

          <!-- Affordability Indicator -->
          <div class="rental-affordability" id="affordabilitySection">
            <div class="rental-affordability__title">Affordability Check</div>
            <div id="affordabilityBar" class="rental-affordability__bar">
              <div class="rental-affordability__fill" style="width: 0%"></div>
            </div>
            <div class="rental-affordability__info">
              <span id="rentPercent">0%</span> of income
              <span id="affordabilityStatus" class="rental-affordability__status">Good</span>
            </div>
            <div id="affordabilityTip" class="rental-affordability__tip"></div>
          </div>

          <!-- Donut Chart -->
          <div class="mortgage-chart">
            <div class="mortgage-chart__title">Cost Breakdown</div>
            <div class="mortgage-chart__container">
              <div class="mortgage-donut">
                <svg viewBox="0 0 100 100" id="rentalDonutChart">
                  <!-- Segments will be inserted here -->
                </svg>
                <div class="mortgage-donut__center">
                  <div id="rentalDonutCenterValue" class="mortgage-donut__center-value">$0</div>
                  <div class="mortgage-donut__center-label">per month</div>
                </div>
              </div>
              <div id="rentalChartLegend" class="mortgage-legend">
                <!-- Legend items will be inserted here -->
              </div>
            </div>
          </div>

          <!-- Stat Cards -->
          <div id="rentalBreakdownCards" class="mortgage-breakdown">
            <!-- Breakdown cards will be inserted here -->
          </div>
        </div>
      </div>

      <!-- Rental Cost Summary -->
      <div class="rental-summary-section">
        <div class="mortgage-amort__header">
          <div class="mortgage-amort__title">Rental Cost Summary</div>
          <div class="mortgage-amort__stats">
            <div class="mortgage-amort__stat">
              <div class="mortgage-amort__stat-label">Move-in Cost</div>
              <div id="moveInCost" class="mortgage-amort__stat-value">$0</div>
            </div>
            <div class="mortgage-amort__stat">
              <div class="mortgage-amort__stat-label">Yearly Total</div>
              <div id="yearlyRentalCost" class="mortgage-amort__stat-value">$0</div>
            </div>
          </div>
        </div>
        <div class="rental-summary-grid">
          <div class="rental-summary-card">
            <div class="rental-summary-card__icon"></div>
            <div class="rental-summary-card__title">Move-in Costs</div>
            <div id="moveInBreakdown" class="rental-summary-card__content">
              <!-- Will be populated -->
            </div>
          </div>
          <div class="rental-summary-card">
            <div class="rental-summary-card__icon"></div>
            <div class="rental-summary-card__title">Lease Term Projection</div>
            <div id="leaseProjection" class="rental-summary-card__content">
              <!-- Will be populated -->
            </div>
          </div>
        </div>
      </div>

      <!-- Rental Info Cards -->
      <div class="mortgage-info-grid">
        <div class="mortgage-info-card">
          <div class="mortgage-info-card__icon"></div>
          <div class="mortgage-info-card__title">Rent Affordability Rule</div>
          <div class="mortgage-info-card__content">
            The 30% rule suggests spending no more than <strong>30% of your gross income</strong> on rent. This ensures you have enough for other expenses.
          </div>
        </div>

        <div class="mortgage-info-card">
          <div class="mortgage-info-card__icon"></div>
          <div class="mortgage-info-card__title">Before Signing</div>
          <ul class="mortgage-info-card__list">
            <li>Read the lease thoroughly</li>
            <li>Document existing damage</li>
            <li>Understand renewal terms</li>
            <li>Know the pet policy</li>
          </ul>
        </div>

        <div class="mortgage-info-card">
          <div class="mortgage-info-card__icon"></div>
          <div class="mortgage-info-card__title">Hidden Costs</div>
          <ul class="mortgage-info-card__list">
            <li>Application fees ($25-$75)</li>
            <li>Move-in/out cleaning</li>
            <li>Late payment fees</li>
            <li>Early termination fees</li>
          </ul>
        </div>

        <div class="mortgage-info-card">
          <div class="mortgage-info-card__icon"></div>
          <div class="mortgage-info-card__title">Renter Tips</div>
          <ul class="mortgage-info-card__list">
            <li>Get renter's insurance</li>
            <li>Set up auto-pay for rent</li>
            <li>Keep records of payments</li>
            <li>Know your tenant rights</li>
          </ul>
        </div>
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
  const avgRate = (sortedStates.reduce((sum, [, d]) => sum + d.rate, 0) / sortedStates.length).toFixed(2);

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
  el.querySelectorAll('#mortgageCalcSection input, #mortgageCalcSection select').forEach(input => {
    input.addEventListener('change', calc);
  });

  // -------------------- Rental Calculator Logic --------------------
  const rentalColors = {
    rent: '#7c5cff',
    insurance: '#29d7ff',
    parking: '#ff6b9d',
    petRent: '#ffd93d',
    utilities: '#6bcb77'
  };

  const rentalDonutChart = el.querySelector("#rentalDonutChart");
  const rentalChartLegend = el.querySelector("#rentalChartLegend");
  const rentalBreakdownCards = el.querySelector("#rentalBreakdownCards");
  const rentalTotalMonthlyEl = el.querySelector("#rentalTotalMonthly");
  const rentalDonutCenterValue = el.querySelector("#rentalDonutCenterValue");
  const moveInCostEl = el.querySelector("#moveInCost");
  const yearlyRentalCostEl = el.querySelector("#yearlyRentalCost");
  const affordabilityBar = el.querySelector("#affordabilityBar .rental-affordability__fill");
  const rentPercentEl = el.querySelector("#rentPercent");
  const affordabilityStatusEl = el.querySelector("#affordabilityStatus");
  const affordabilityTipEl = el.querySelector("#affordabilityTip");
  const moveInBreakdownEl = el.querySelector("#moveInBreakdown");
  const leaseProjectionEl = el.querySelector("#leaseProjection");

  function createRentalBreakdownCards(rental) {
    const cards = [
      { label: 'Monthly Rent', value: rental.rent, color: rentalColors.rent, sub: 'Base rent amount' },
      { label: 'Renter\'s Insurance', value: rental.insurance, color: rentalColors.insurance, sub: 'Monthly portion' },
      { label: 'Parking Fee', value: rental.parking, color: rentalColors.parking, sub: 'If applicable' },
      { label: 'Pet Rent', value: rental.petRent, color: rentalColors.petRent, sub: 'Monthly pet fee' },
      { label: 'Utilities', value: rental.utilities, color: rentalColors.utilities, sub: 'Estimated monthly' },
      { label: 'Move-in Total', value: rental.moveInCost, color: '#a9b3d6', sub: 'One-time costs' }
    ];

    return cards.map(c => `
      <div class="mortgage-stat" style="--stat-color: ${c.color}">
        <div class="mortgage-stat__label">${c.label}</div>
        <div class="mortgage-stat__value">${money(c.value)}</div>
        <div class="mortgage-stat__sub">${c.sub}</div>
      </div>
    `).join('');
  }

  const calcRental = () => {
    const rent = num(el.querySelector("#monthlyRent").value);
    const securityDeposit = num(el.querySelector("#securityDeposit").value);
    const rentersInsurance = num(el.querySelector("#rentersInsurance").value);
    const parkingFee = num(el.querySelector("#parkingFee").value);
    const petDeposit = num(el.querySelector("#petDeposit").value);
    const petRent = num(el.querySelector("#petRent").value);
    const utilities = num(el.querySelector("#utilitiesEstimate").value);
    const leaseTerm = num(el.querySelector("#leaseTerm").value);
    const monthlyIncome = num(el.querySelector("#monthlyIncome").value);

    // Monthly costs
    const monthlyInsurance = rentersInsurance / 12;
    const totalMonthly = rent + monthlyInsurance + parkingFee + petRent + utilities;

    // Move-in costs (first month rent + deposits)
    const moveInCost = rent + securityDeposit + petDeposit;

    // Yearly cost
    const yearlyTotal = (totalMonthly * 12);

    // Lease term projection
    const leaseTotal = (totalMonthly * leaseTerm) + moveInCost;

    // Affordability calculation
    const rentPercent = monthlyIncome > 0 ? (totalMonthly / monthlyIncome) * 100 : 0;
    let affordabilityStatus = 'Excellent';
    let affordabilityClass = 'excellent';
    let affordabilityTip = 'Great! Your housing costs are well within budget.';

    if (rentPercent > 50) {
      affordabilityStatus = 'Not Recommended';
      affordabilityClass = 'danger';
      affordabilityTip = 'This rental may strain your budget. Consider more affordable options.';
    } else if (rentPercent > 40) {
      affordabilityStatus = 'Stretched';
      affordabilityClass = 'warning';
      affordabilityTip = 'This is above the recommended 30% threshold. Budget carefully.';
    } else if (rentPercent > 30) {
      affordabilityStatus = 'Moderate';
      affordabilityClass = 'moderate';
      affordabilityTip = 'Slightly above 30%, but manageable with good budgeting.';
    } else if (rentPercent > 20) {
      affordabilityStatus = 'Good';
      affordabilityClass = 'good';
      affordabilityTip = 'You\'re within the recommended range. Good choice!';
    }

    // Update UI
    rentalTotalMonthlyEl.textContent = money(totalMonthly);
    rentalDonutCenterValue.textContent = money(totalMonthly);
    moveInCostEl.textContent = money(moveInCost);
    yearlyRentalCostEl.textContent = money(yearlyTotal);

    // Affordability bar
    affordabilityBar.style.width = `${Math.min(rentPercent, 100)}%`;
    affordabilityBar.className = `rental-affordability__fill rental-affordability__fill--${affordabilityClass}`;
    rentPercentEl.textContent = `${rentPercent.toFixed(1)}%`;
    affordabilityStatusEl.textContent = affordabilityStatus;
    affordabilityStatusEl.className = `rental-affordability__status rental-affordability__status--${affordabilityClass}`;
    affordabilityTipEl.textContent = affordabilityTip;

    // Donut chart
    const rentalChartData = [
      { label: 'Rent', value: rent, color: rentalColors.rent },
      { label: 'Insurance', value: monthlyInsurance, color: rentalColors.insurance },
      { label: 'Parking', value: parkingFee, color: rentalColors.parking },
      { label: 'Pet Rent', value: petRent, color: rentalColors.petRent },
      { label: 'Utilities', value: utilities, color: rentalColors.utilities }
    ];

    rentalDonutChart.innerHTML = createDonutChart(rentalChartData);
    rentalChartLegend.innerHTML = createLegend(rentalChartData);

    const rentalData = {
      rent,
      insurance: monthlyInsurance,
      parking: parkingFee,
      petRent,
      utilities,
      moveInCost
    };
    rentalBreakdownCards.innerHTML = createRentalBreakdownCards(rentalData);

    // Move-in breakdown
    moveInBreakdownEl.innerHTML = `
      <div class="rental-breakdown-item">
        <span>First Month's Rent</span>
        <strong>${money(rent)}</strong>
      </div>
      <div class="rental-breakdown-item">
        <span>Security Deposit</span>
        <strong>${money(securityDeposit)}</strong>
      </div>
      ${petDeposit > 0 ? `
      <div class="rental-breakdown-item">
        <span>Pet Deposit</span>
        <strong>${money(petDeposit)}</strong>
      </div>
      ` : ''}
      <div class="rental-breakdown-item rental-breakdown-item--total">
        <span>Total Move-in</span>
        <strong>${money(moveInCost)}</strong>
      </div>
    `;

    // Lease projection
    leaseProjectionEl.innerHTML = `
      <div class="rental-breakdown-item">
        <span>Monthly Cost × ${leaseTerm} months</span>
        <strong>${money(totalMonthly * leaseTerm)}</strong>
      </div>
      <div class="rental-breakdown-item">
        <span>Move-in Costs</span>
        <strong>${money(moveInCost)}</strong>
      </div>
      <div class="rental-breakdown-item rental-breakdown-item--total">
        <span>Total Lease Cost</span>
        <strong>${money(leaseTotal)}</strong>
      </div>
      <div class="rental-breakdown-item rental-breakdown-item--note">
        <span>Monthly Average</span>
        <strong>${money(leaseTotal / leaseTerm)}</strong>
      </div>
    `;
  };

  el.querySelector("#rentalCalcBtnCalc").addEventListener("click", calcRental);

  // State/City dropdown logic for rental calculator
  const rentalStateSelect = el.querySelector("#rentalState");
  const rentalCitySelect = el.querySelector("#rentalCity");

  rentalStateSelect.addEventListener("change", function () {
    const selectedState = this.value;
    rentalCitySelect.innerHTML = '';

    if (selectedState && stateCities[selectedState]) {
      rentalCitySelect.innerHTML = '<option value="">Select a City</option>' +
        stateCities[selectedState].map(city => `<option value="${city}">${city}</option>`).join('');
    } else {
      rentalCitySelect.innerHTML = '<option value="">Select a State first</option>';
    }
  });

  // Live updates for rental calculator
  el.querySelectorAll('#rentalCalcSection input, #rentalCalcSection select').forEach(input => {
    input.addEventListener('change', calcRental);
  });

  // -------------------- Calculator Type Switching --------------------
  const mortgageCalcBtn = el.querySelector("#mortgageCalcBtn");
  const rentalCalcBtn = el.querySelector("#rentalCalcBtn");
  const mortgageCalcSection = el.querySelector("#mortgageCalcSection");
  const rentalCalcSection = el.querySelector("#rentalCalcSection");

  function switchCalculator(type) {
    activeCalc = type;

    if (type === "mortgage") {
      mortgageCalcBtn.classList.add("calc-type-btn--active");
      rentalCalcBtn.classList.remove("calc-type-btn--active");
      mortgageCalcSection.style.display = "block";
      rentalCalcSection.style.display = "none";
    } else {
      rentalCalcBtn.classList.add("calc-type-btn--active");
      mortgageCalcBtn.classList.remove("calc-type-btn--active");
      rentalCalcSection.style.display = "block";
      mortgageCalcSection.style.display = "none";
      calcRental(); // Calculate on switch
    }
  }

  mortgageCalcBtn.addEventListener("click", () => switchCalculator("mortgage"));
  rentalCalcBtn.addEventListener("click", () => switchCalculator("rental"));

  calc();
  return el;
}


/** -------------------------
 *  UC04: Listing Detail Page
 *  ------------------------- */
function ListingDetailPage(id) {
  const el = document.createElement("div");
  el.className = "listing-detail-container";
  el.innerHTML = `<div class="listings-loading"><div class="spinner"></div>Loading listing...</div>`;

  (async () => {
    try {
      const l = await apiFetch(`/api/listings/${encodeURIComponent(id)}`);
      const isRent = l.kind === "rental";
      const defaultImg = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800";
      const imgUrl = l.image_url || defaultImg;
      const statusClass = l.status === "active" ? "status-active" : "status-sold";
      const statusText = l.status === "active" ? "Active" : (isRent ? "Rented" : "Sold");

      el.innerHTML = `
        <a href="#/${isRent ? 'rentals' : 'sales'}" class="back-link">← Back to ${isRent ? 'Rentals' : 'Sales'}</a>

        <div class="detail-hero" style="background-image: url('${imgUrl}');">
          <div class="detail-hero__overlay">
            <span class="listing-card__status ${statusClass}" style="font-size:14px;padding:6px 14px;">${statusText}</span>
            <span class="listing-card__type" style="font-size:14px;padding:6px 14px;">${l.type}</span>
          </div>
        </div>

        <div class="detail-content">
          <div class="detail-main">
            <h1 class="detail-price">${money(l.price, isRent)}</h1>
            <div class="detail-location">
              <span class="location-icon">📍</span>
              ${l.address ? l.address + ', ' : ''}${l.city}${l.state ? ', ' + l.state : ''}
            </div>

            <div class="detail-stats">
              <div class="detail-stat">
                <div class="detail-stat__value">${l.bedrooms}</div>
                <div class="detail-stat__label">Bedrooms</div>
              </div>
              <div class="detail-stat">
                <div class="detail-stat__value">${l.bathrooms}</div>
                <div class="detail-stat__label">Bathrooms</div>
              </div>
              ${l.sqft ? `<div class="detail-stat">
                <div class="detail-stat__value">${l.sqft.toLocaleString()}</div>
                <div class="detail-stat__label">Sq Ft</div>
              </div>` : ''}
              ${l.year_built ? `<div class="detail-stat">
                <div class="detail-stat__value">${l.year_built}</div>
                <div class="detail-stat__label">Year Built</div>
              </div>` : ''}
            </div>

            ${l.description ? `
            <div class="detail-section">
              <h3 class="detail-section__title">Description</h3>
              <p class="detail-section__text">${l.description}</p>
            </div>` : ''}
          </div>

          <div class="detail-sidebar">
            <div class="card"><div class="card__body">
              <div class="card__title">Interested?</div>
              <div class="card__muted" style="margin-bottom:12px;">
                ${isRent ? 'Estimate your monthly costs' : 'Calculate your mortgage payment'}
              </div>
              <a class="btn btn--primary" href="#/mortgage" style="width:100%;text-align:center;">
                ${isRent ? '🔑 Rental Calculator' : '🏦 Mortgage Calculator'}
              </a>
              ${currentUser ? `
              <button class="btn" style="width:100%;text-align:center;margin-top:8px;" onclick="location.hash='#/subscription'">
                📞 Contact an Agent
              </button>` : `
              <a class="btn" href="#/auth" style="width:100%;text-align:center;margin-top:8px;">
                 Login to Contact Agent
              </a>`}
            </div></div>

            <div class="card" style="margin-top:12px;"><div class="card__body">
              <div class="card__title">Property Summary</div>
              <div style="display:grid;gap:6px;margin-top:10px;">
                ${kv('Type', l.type)}
                ${kv('Status', cap(l.status))}
                ${kv('Beds', l.bedrooms)}
                ${kv('Baths', l.bathrooms)}
                ${l.sqft ? kv('Sq Ft', l.sqft.toLocaleString()) : ''}
                ${l.year_built ? kv('Built', l.year_built) : ''}
              </div>
            </div></div>
          </div>
        </div>
      `;
    } catch (err) {
      el.innerHTML = `
        <div class="card"><div class="card__body">
          <div class="card__title">Listing Not Found</div>
          <div class="card__muted">${err.message}</div>
          <a class="btn" href="#/sales" style="margin-top:12px;">← Back to Listings</a>
        </div></div>
      `;
    }
  })();

  return el;
}


/** -------------------------
 *  UC12-16, UC20: Subscription Page
 *  ------------------------- */
function SubscriptionPage() {
  const el = document.createElement("div");
  el.className = "subscription-container";

  if (!currentUser) {
    el.innerHTML = `
      <div class="card" style="text-align:center;padding:40px;">
        <div style="font-size:48px;margin-bottom:12px;">🔐</div>
        <div class="card__title">Login Required</div>
        <div class="card__muted" style="margin-bottom:16px;">Please log in to manage your subscription.</div>
        <a class="btn btn--primary" href="#/auth">Login / Sign Up</a>
      </div>
    `;
    return el;
  }

  el.innerHTML = `
    <div class="sub-hero">
      <h1 class="sub-hero__title">My Subscription</h1>
      <p class="sub-hero__sub">Manage your plan, payment, and agent access</p>
    </div>

    <!-- Current Status -->
    <div id="subStatusSection" class="sub-section">
      <div class="sub-section__title">Current Status</div>
      <div id="subStatus" class="sub-status-card">
        <div class="notice">Loading subscription status...</div>
      </div>
    </div>

    <!-- Plans -->
    <div id="subPlansSection" class="sub-section">
      <div class="sub-section__title">Available Plans</div>
      <div id="subPlans" class="sub-plans-grid">
        <div class="notice">Loading plans...</div>
      </div>
    </div>

    <!-- Payment Method -->
    <div id="subPaymentSection" class="sub-section">
      <div class="sub-section__title">Payment Method</div>
      <div class="card"><div class="card__body">
        <div id="paymentStatus" class="card__muted">Loading...</div>
        <div id="paymentForm" style="display:none;margin-top:14px;">
          <div class="notice" style="margin-bottom:12px; font-size:13px; background:rgba(59,130,246,0.1); color:#1d4ed8; border:1px solid rgba(59,130,246,0.2);">
             <strong>Testing Environment:</strong> Enter any fake credit card. Your payment information is <strong>never stored</strong> and is securely discarded after this step.
          </div>
          <div style="display:grid;gap:10px;">
            <div class="field">
              <label>Card Number</label>
              <input id="cardNumber" placeholder="4242 4242 4242 4242" maxlength="19" oninput="this.value = this.value.replace(/[^0-9]/g, '').replace(/(.{4})/g, '$1 ').trim();" />
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="field">
                <label>Expiry Date</label>
                <input id="cardExpiry" placeholder="MM/YY" maxlength="5" oninput="this.value = this.value.replace(/[^0-9]/g, '').replace(/^([2-9])$/g, '0$1').replace(/^(1[3-9])$/g, '01').replace(/^([0-1][0-9])([0-9]{1,2})$/g, '$1/$2');" />
              </div>
              <div class="field">
                <label>CVV / CVC</label>
                <input id="cardCvv" placeholder="123" maxlength="4" oninput="this.value = this.value.replace(/[^0-9]/g, '');" />
              </div>
            </div>
            <button id="addPaymentBtn" class="btn btn--primary" style="margin-top:4px;">💳 Securely Add (Fake) Payment Method</button>
          </div>
        </div>
      </div></div>
    </div>

    <!-- Actions -->
    <div id="subActionsSection" class="sub-section">
      <div class="sub-section__title">Actions</div>
      <div class="sub-actions">
        <button id="activateBtn" class="btn btn--primary" style="display:none;">🚀 Activate Subscription</button>
        <button id="cancelBtn" class="btn btn--danger" style="display:none;">✖ Cancel Subscription</button>
      </div>
      <div id="cancelConfirm" style="display:none; margin-top:12px; padding:16px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:8px;">
        <div style="font-weight:600; color:#b91c1c; margin-bottom:8px;">Are you absolutely sure you want to cancel?</div>
        <div style="font-size:13px; color:#991b1b; margin-bottom:12px;">You will lose access to premium features immediately.</div>
        <div style="display:flex; gap:10px;">
          <button id="cancelConfirmYes" class="btn btn--danger">Yes, Cancel Subscription</button>
          <button id="cancelConfirmNo" class="btn">Keep Subscription</button>
        </div>
      </div>
    </div>

    <!-- Contact Agent (UC20) -->
    <div class="sub-section">
      <div class="sub-section__title"> Contact a Real Estate Agent</div>
      <div class="card"><div class="card__body">
        <div class="card__muted" style="margin-bottom:12px;">Need expert help? Submit a request and a licensed agent will reach out to you.</div>
        <form id="agentForm" style="display:grid;gap:12px;">
          <div class="field">
            <label>Your Message (optional)</label>
            <textarea id="agentMessage" rows="3" placeholder="I'm looking for a 3-bedroom home in New Jersey..."></textarea>
          </div>
          <button class="btn btn--primary" type="submit">Submit Agent Request</button>
        </form>
        <div id="agentResult" style="margin-top:12px;"></div>

        <div style="margin-top:20px;">
          <div class="sub-section__title" style="font-size:14px;">Previous Requests</div>
          <div id="agentRequestsList" class="notice">Loading...</div>
        </div>
      </div></div>
    </div>

    <!-- Status Message -->
    <div id="subMessage" class="notice hidden" style="margin-top:16px;"></div>
  `;

  // State
  let subData = null;

  const subStatusEl = el.querySelector("#subStatus");
  const subPlansEl = el.querySelector("#subPlans");
  const paymentStatusEl = el.querySelector("#paymentStatus");
  const paymentFormEl = el.querySelector("#paymentForm");
  const activateBtn = el.querySelector("#activateBtn");
  const cancelBtn = el.querySelector("#cancelBtn");
  const subMessage = el.querySelector("#subMessage");

  function showMsg(text, type = "info") {
    subMessage.textContent = text;
    subMessage.className = `notice ${type === 'error' ? 'notice--error' : ''}`;
    subMessage.classList.remove("hidden");
    setTimeout(() => subMessage.classList.add("hidden"), 5000);
  }

  // UC12: Load subscription status
  async function loadSubscriptionStatus() {
    try {
      const data = await apiFetch("/api/subscriptions/status");
      subData = data.subscription;

      if (!subData) {
        subStatusEl.innerHTML = `
          <div class="sub-status sub-status--none">
            <span class="sub-status__icon"></span>
            <div>
              <div class="sub-status__label">No Subscription</div>
              <div class="sub-status__sub">You don't have an active subscription or trial.</div>
            </div>
          </div>
        `;
        activateBtn.style.display = "none";
        cancelBtn.style.display = "none";
        return;
      }

      const status = subData.status;
      const icon = status === "active" ? "" : status === "trial" ? "" : status === "cancelled" ? "❌" : "⏰";
      const days = subData.days_remaining || 0;

      subStatusEl.innerHTML = `
        <div class="sub-status sub-status--${status}">
          <span class="sub-status__icon">${icon}</span>
          <div style="flex:1;">
            <div class="sub-status__label">${cap(status)}${status === 'trial' ? ' (30-day free trial)' : ''}</div>
            <div class="sub-status__sub">
              ${status === 'trial' ? `${days} days remaining • Trial ends ${new Date(subData.trial_end).toLocaleDateString()}` : ''}
              ${status === 'active' ? `Plan: ${subData.plan_name || 'N/A'} • Ends ${new Date(subData.subscription_end).toLocaleDateString()}` : ''}
              ${status === 'cancelled' ? 'Your subscription has been cancelled. You can reactivate at any time.' : ''}
              ${status === 'expired' ? 'Your subscription has expired. Select a plan to reactivate.' : ''}
            </div>
            ${subData.plan_name ? `<div class="sub-status__plan">Plan: <b>${subData.plan_name}</b> (${subData.billing_cycle}) — $${subData.price}/${subData.billing_cycle === 'monthly' ? 'mo' : 'yr'}</div>` : ''}
            <div class="sub-status__payment">Payment method: ${subData.payment_method_added ? ' Added' : ' Not added'}</div>
          </div>
        </div>
      `;

      // Show/hide action buttons with explicit next-step guidance
      const activationEligibleStatus = status === "trial" || status === "expired" || status === "cancelled";
      const canActivateNow = activationEligibleStatus && subData.plan_id && subData.payment_method_added;

      if (activationEligibleStatus) {
        activateBtn.style.display = "inline-flex";
        activateBtn.disabled = !canActivateNow;
        activateBtn.textContent = canActivateNow
          ? "🚀 Activate Subscription"
          : (subData.plan_id ? "💳 Add Payment Method to Activate" : "🧭 Select a Plan to Activate");
      } else {
        activateBtn.style.display = "none";
        activateBtn.disabled = false;
        activateBtn.textContent = "🚀 Activate Subscription";
      }

      if (status === "active" || (status === "trial" && subData.plan_id)) {
        cancelBtn.style.display = "inline-flex";
      } else {
        cancelBtn.style.display = "none";
      }

      // Payment section
      if (subData.payment_method_added) {
        paymentStatusEl.textContent = subData.plan_id
          ? "Payment method on file. You can activate your subscription now."
          : "Payment method on file. Select a plan to continue.";
        paymentFormEl.style.display = "none";
      } else {
        paymentStatusEl.textContent = subData.plan_id
          ? "No payment method added yet."
          : "Select a plan first, then add your payment method.";
        paymentFormEl.style.display = subData.plan_id ? "block" : "none";
      }

    } catch (err) {
      subStatusEl.innerHTML = `<div class="notice" style="color:var(--danger);">Error: ${err.message}</div>`;
    }
  }

  // Load subscription plans
  async function loadPlans() {
    try {
      const data = await apiFetch("/api/subscriptions/plans");
      const plans = data.plans || [];
      if (plans.length === 0) {
        subPlansEl.innerHTML = `<div class="notice">No plans available.</div>`;
        return;
      }

      subPlansEl.innerHTML = plans.map(p => `
        <div class="sub-plan-card ${subData && subData.plan_id === p.id ? 'sub-plan-card--selected' : ''}">
          <div class="sub-plan-card__name">${p.name}</div>
          <div class="sub-plan-card__price">$${p.price}<span class="sub-plan-card__cycle">/${p.billing_cycle === 'monthly' ? 'mo' : 'yr'}</span></div>
          <ul class="sub-plan-card__features">
            ${(p.features || []).map(f => `<li>✓ ${f}</li>`).join('')}
          </ul>
          <button class="btn btn--primary sub-plan-card__btn" data-plan-id="${p.id}" ${subData && subData.plan_id === p.id ? 'disabled' : ''}>
            ${subData && subData.plan_id === p.id ? '✓ Current Plan' : 'Select Plan'}
          </button>
        </div>
      `).join('');

      // UC13: Select plan click handlers
      subPlansEl.querySelectorAll('.sub-plan-card__btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const planId = Number(btn.dataset.planId);
          try {
            const res = await apiFetch("/api/subscriptions/select-plan", {
              method: "POST",
              body: JSON.stringify({ planId })
            });
            showMsg(res.message || "Plan selected.");
            await loadSubscriptionStatus();
            await loadPlans();
          } catch (err) {
            showMsg(err.message, "error");
          }
        });
      });
    } catch (err) {
      subPlansEl.innerHTML = `<div class="notice" style="color:var(--danger);">Error: ${err.message}</div>`;
    }
  }

  // UC14: Add payment method
  el.querySelector("#addPaymentBtn").addEventListener("click", async () => {
    if (!subData?.plan_id) {
      showMsg("Select a subscription plan first.", "error");
      return;
    }

    const cc = el.querySelector("#cardNumber").value.replace(/\s/g, '');
    const exp = el.querySelector("#cardExpiry").value;
    const cvv = el.querySelector("#cardCvv").value;

    if (cc.length < 15 || exp.length < 4 || cvv.length < 3) {
      showMsg("Please enter a realistic fake card number, expiry, and CVV.", "error");
      return;
    }

    try {
      await apiFetch("/api/subscriptions/add-payment-method", {
        method: "POST",
        body: JSON.stringify({ paymentDetails: { simulated: true } })
      });
      showMsg("Payment method added! Click Activate Subscription in Actions.");
      await loadSubscriptionStatus();
    } catch (err) {
      showMsg(err.message, "error");
    }
  });

  // UC15: Activate subscription
  activateBtn.addEventListener("click", async () => {
    try {
      await apiFetch("/api/subscriptions/activate", { method: "POST" });
      showMsg("Subscription activated! 🎉");
      await loadSubscriptionStatus();
      await loadPlans();
    } catch (err) {
      showMsg(err.message, "error");
    }
  });

  // UC16: Cancel subscription
  const cancelConfirmEl = el.querySelector("#cancelConfirm");

  cancelBtn.addEventListener("click", () => {
    cancelConfirmEl.style.display = "block";
    cancelBtn.style.display = "none";
  });

  el.querySelector("#cancelConfirmNo").addEventListener("click", () => {
    cancelConfirmEl.style.display = "none";
    cancelBtn.style.display = "inline-flex";
  });

  el.querySelector("#cancelConfirmYes").addEventListener("click", async () => {
    cancelConfirmEl.style.display = "none";
    cancelBtn.style.display = "inline-flex"; // Restore for visual consistency before reload
    try {
      await apiFetch("/api/subscriptions/cancel", { method: "POST" });
      showMsg("Subscription cancelled.");
      await loadSubscriptionStatus();
      await loadPlans();
    } catch (err) {
      showMsg(err.message, "error");
    }
  });

  // UC20: Contact agent
  el.querySelector("#agentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = el.querySelector("#agentMessage").value.trim();
    const resultEl = el.querySelector("#agentResult");
    try {
      const res = await apiFetch("/api/subscriptions/contact-agent", {
        method: "POST",
        body: JSON.stringify({ message: message || undefined })
      });
      resultEl.innerHTML = `<div class="notice" style="background:rgba(16,185,129,.12);color:#059669;border:1px solid rgba(16,185,129,.2);"> ${res.message}</div>`;
      el.querySelector("#agentMessage").value = "";
      loadAgentRequests();
    } catch (err) {
      resultEl.innerHTML = `<div class="notice" style="color:var(--danger);">${err.message}</div>`;
    }
  });

  // Load past agent requests
  async function loadAgentRequests() {
    const listEl = el.querySelector("#agentRequestsList");
    try {
      const data = await apiFetch("/api/subscriptions/agent-requests");
      const reqs = data.requests || [];
      if (reqs.length === 0) {
        listEl.innerHTML = `<div class="card__muted">No previous requests.</div>`;
        return;
      }
      listEl.innerHTML = reqs.map(r => `
        <div class="notice" style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <div>
            <div style="font-size:13px;color:var(--muted);">${new Date(r.created_at).toLocaleString()}</div>
            <div>${r.message || 'No message provided'}</div>
          </div>
          <span class="pill" style="font-size:11px;">${cap(r.status)}</span>
        </div>
      `).join('');
    } catch (err) {
      listEl.innerHTML = `<div class="card__muted">Could not load requests.</div>`;
    }
  }

  // Load everything
  (async () => {
    await loadSubscriptionStatus();
    await loadPlans();
    await loadAgentRequests();
  })();

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
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    beds_desc: (a, b) => b.bedrooms - a.bedrooms,
    baths_desc: (a, b) => b.bathrooms - a.bathrooms,
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
function num(v) { return Number(v || 0); }
function numOrNull(v) { return v === "" || v == null ? null : Number(v); }
function round2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }
function money(n, isRent = false) {
  const v = Number(n || 0);
  const s = v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return isRent ? `$${s}/mo` : `$${s}`;
}
function cap(s) { return (s || "").charAt(0).toUpperCase() + (s || "").slice(1); }
function kv(k, v) {
  return `<div class="notice" style="display:flex;justify-content:space-between;gap:10px;">
    <span>${k}</span><b>${v}</b>
  </div>`;
}

/** -------------------------
 *  AI Chat Widget
 *  ------------------------- */
let chatOpen = false;
let chatSession = null;
let chatMessages = [];

function initChatWidget() {
  // Prevent duplicate initialization
  if (document.querySelector('.chat-widget')) return;

  // Create chat widget HTML
  const widget = document.createElement('div');
  widget.className = 'chat-widget';
  widget.innerHTML = `
    <button class="chat-toggle" id="chatToggle" title="Chat with AI Agent">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
      <span class="notification-dot" style="display:none"></span>
    </button>
    <div class="chat-window" id="chatWindow">
      <div class="chat-header">
        <div class="chat-header__avatar">🏠</div>
        <div class="chat-header__info">
          <div class="chat-header__name">AI Real Estate Agent</div>
          <div class="chat-header__status">Online • Free for 1 week</div>
        </div>
        <button class="chat-header__close" id="chatClose">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>
      <div id="chatFreeBanner" class="chat-free-banner" style="display:none">
        🎉 <strong>Free access!</strong> <span id="chatDaysLeft">7 days</span> remaining
      </div>
      <div class="chat-messages" id="chatMessages"></div>
      <div class="chat-ai-actions" id="chatAiActions">
        <button class="chat-ai-btn" id="aiValuationBtn" title="Get AI property valuation">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
          Estimate Value
        </button>
        <button class="chat-ai-btn" id="aiTrendsBtn" title="View market trends">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/></svg>
          Market Trends
        </button>
        <button class="chat-ai-btn" id="aiMapBtn" title="View listings on map">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          View Map
        </button>
      </div>
      <div class="chat-input-area" id="chatInputArea">
        <input type="text" class="chat-input" id="chatInput" placeholder="Ask about buying, selling, mortgages..." />
        <button class="chat-send" id="chatSend">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(widget);

  // Event listeners
  document.getElementById('chatToggle').addEventListener('click', toggleChat);
  document.getElementById('chatClose').addEventListener('click', () => toggleChat(false));
  document.getElementById('chatSend').addEventListener('click', sendChatMessage);
  document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });

  // AI feature button listeners
  document.getElementById('aiValuationBtn').addEventListener('click', showAiValuationPrompt);
  document.getElementById('aiTrendsBtn').addEventListener('click', showAiMarketTrends);
  document.getElementById('aiMapBtn').addEventListener('click', showAiMapView);
}

async function toggleChat(forceState) {
  chatOpen = typeof forceState === 'boolean' ? forceState : !chatOpen;
  const window = document.getElementById('chatWindow');

  if (chatOpen) {
    window.classList.add('open');
    await loadChatSession();
    document.getElementById('chatInput').focus();
  } else {
    window.classList.remove('open');
  }
}

async function loadChatSession() {
  const messagesEl = document.getElementById('chatMessages');
  const inputArea = document.getElementById('chatInputArea');
  const freeBanner = document.getElementById('chatFreeBanner');

  // Check if user is logged in
  if (!currentUser) {
    messagesEl.innerHTML = `
      <div class="chat-login-prompt">
        <div class="chat-login-prompt__icon">🔐</div>
        <div class="chat-login-prompt__title">Login Required</div>
        <div class="chat-login-prompt__text">
          Sign up or log in to chat with our AI Real Estate Agent for FREE for 1 week!
        </div>
        <a href="#/auth" class="btn btn--primary" onclick="toggleChat(false)">Login / Sign Up</a>
      </div>
    `;
    inputArea.style.display = 'none';
    freeBanner.style.display = 'none';
    return;
  }

  try {
    const data = await apiFetch('/api/chat/session');
    chatSession = data;

    if (!data.hasAccess) {
      // Free week expired
      messagesEl.innerHTML = `
        <div class="chat-expired">
          <div class="chat-expired__icon">⏰</div>
          <div class="chat-expired__title">Free Trial Ended</div>
          <div class="chat-expired__text">
            Your 1-week free access has ended. Subscribe to continue chatting with our AI agent!
          </div>
          <button class="btn btn--primary" onclick="alert('Subscription coming soon!')">Subscribe Now</button>
        </div>
      `;
      inputArea.style.display = 'none';
      freeBanner.style.display = 'none';
      return;
    }

    // Show free banner
    if (!data.isPaid) {
      freeBanner.style.display = 'block';
      document.getElementById('chatDaysLeft').textContent = `${data.daysRemaining} day${data.daysRemaining !== 1 ? 's' : ''}`;
    } else {
      freeBanner.innerHTML = '⭐ <strong>Premium access</strong> • Unlimited chat';
      freeBanner.style.display = 'block';
    }

    inputArea.style.display = 'flex';
    chatMessages = data.messages || [];

    // Render messages or welcome
    if (chatMessages.length === 0) {
      messagesEl.innerHTML = `
        <div class="chat-message chat-message--agent">
          Hi ${currentUser.name}! 👋 I'm your AI Real Estate Agent. I can help you with:
          <br><br>
          🏠 <b>Buying</b> - Find your dream home<br>
          💰 <b>Selling</b> - Get tips on listing<br>
          📊 <b>Mortgages</b> - Understand financing<br>
          🔑 <b>Rentals</b> - Explore rental options<br>
          📈 <b>Investing</b> - Learn about ROI<br>
          <br>
          What can I help you with today?
        </div>
      `;
    } else {
      renderChatMessages();
    }

  } catch (err) {
    messagesEl.innerHTML = `
      <div class="notice" style="color: var(--danger);">
        Failed to load chat. Please try again.
      </div>
    `;
  }
}

function renderChatMessages() {
  const messagesEl = document.getElementById('chatMessages');
  messagesEl.innerHTML = chatMessages.map(msg => `
    <div class="chat-message chat-message--${msg.role === 'user' ? 'user' : 'agent'}">
      ${escapeHtml(msg.content)}
    </div>
  `).join('');

  // Scroll to bottom
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();

  if (!message || !currentUser) return;

  input.value = '';
  input.disabled = true;
  document.getElementById('chatSend').disabled = true;

  // Add user message immediately
  chatMessages.push({ role: 'user', content: message });
  renderChatMessages();

  // Show typing indicator
  const messagesEl = document.getElementById('chatMessages');
  const typingEl = document.createElement('div');
  typingEl.className = 'chat-typing';
  typingEl.innerHTML = '<span></span><span></span><span></span>';
  messagesEl.appendChild(typingEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  try {
    // Simulate slight delay for realism
    await new Promise(r => setTimeout(r, 800 + Math.random() * 700));

    const data = await apiFetch('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message })
    });

    // Remove typing indicator
    typingEl.remove();

    // Add agent response
    chatMessages.push({ role: 'agent', content: data.agentReply });
    renderChatMessages();

  } catch (err) {
    typingEl.remove();

    if (err.message.includes('Subscribe')) {
      // Access expired
      loadChatSession();
    } else {
      chatMessages.push({ role: 'agent', content: "Sorry, I'm having trouble responding right now. Please try again!" });
      renderChatMessages();
    }
  }

  input.disabled = false;
  document.getElementById('chatSend').disabled = false;
  input.focus();
}

// ===== AI Feature Functions =====

// Simple toast notification
function showToast(message, type = 'info') {
  // Remove existing toast
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-notification--${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    right: 24px;
    padding: 12px 20px;
    background: ${type === 'warning' ? '#fbbf24' : type === 'error' ? '#ef4444' : '#7c5cff'};
    color: ${type === 'warning' ? '#000' : '#fff'};
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10001;
    animation: fadeIn 0.3s;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

// Global state for AI features
let aiMapInstance = null;
let aiChartInstance = null;

async function showAiValuationPrompt() {
  if (!currentUser) {
    showToast('Please log in to use AI features', 'warning');
    return;
  }

  const messagesEl = document.getElementById('chatMessages');

  // Show listing selection UI
  messagesEl.innerHTML += `
    <div class="chat-message chat-message--agent">
      📊 <b>AI Property Valuation</b><br><br>
      Enter a listing ID to get an AI-powered value estimate:
      <div style="margin-top: 12px; display: flex; gap: 8px;">
        <input type="number" id="aiValuationInput" placeholder="Enter Listing ID" 
          style="flex: 1; padding: 8px 12px; background: rgba(255,255,255,0.04); border: 1px solid var(--line); border-radius: 8px; color: var(--text); font-size: 13px;">
        <button id="aiValuationSubmit" class="btn btn--small" style="padding: 8px 16px;">Get Estimate</button>
      </div>
      <div style="margin-top: 8px; font-size: 12px; color: var(--muted);">
        Tip: You can find listing IDs in the Listings section
      </div>
    </div>
  `;

  messagesEl.scrollTop = messagesEl.scrollHeight;

  // Add submit handler
  document.getElementById('aiValuationSubmit').addEventListener('click', async () => {
    const listingId = document.getElementById('aiValuationInput').value;
    if (!listingId) {
      showToast('Please enter a listing ID', 'warning');
      return;
    }
    await fetchAiValuation(parseInt(listingId));
  });

  document.getElementById('aiValuationInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('aiValuationSubmit').click();
    }
  });
}

async function fetchAiValuation(listingId) {
  const messagesEl = document.getElementById('chatMessages');

  // Show loading
  const loadingEl = document.createElement('div');
  loadingEl.className = 'chat-message chat-message--agent';
  loadingEl.innerHTML = '<div class="chat-typing"><span></span><span></span><span></span></div> Analyzing property...';
  messagesEl.appendChild(loadingEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  try {
    const data = await apiFetch(`/api/ai/valuation?listingId=${listingId}`);
    loadingEl.remove();

    const diffPercent = ((data.estimatedValue - data.listing.price) / data.listing.price * 100).toFixed(1);
    const diffClass = diffPercent >= 0 ? 'above' : 'below';
    const confidenceClass = data.compsUsed >= 3 ? 'high' : data.compsUsed >= 2 ? 'medium' : 'low';

    messagesEl.innerHTML += `
      <div class="chat-message chat-message--agent">
        <div class="ai-valuation">
          <div class="ai-valuation__header">
            <div class="ai-valuation__estimate">$${data.estimatedValue.toLocaleString()}</div>
            <span class="ai-valuation__confidence ai-valuation__confidence--${confidenceClass}">
              ${confidenceClass} confidence
            </span>
          </div>
          <div class="ai-valuation__diff ai-valuation__diff--${diffClass}">
            ${diffPercent >= 0 ? '↑' : '↓'} ${Math.abs(diffPercent)}% ${diffPercent >= 0 ? 'above' : 'below'} listed price ($${data.listing.price.toLocaleString()})
          </div>
          <div class="ai-valuation__explanation">${data.explanation}</div>
          <div class="ai-valuation__comps">
            <div class="ai-valuation__comps-title">Based on ${data.compsUsed} comparable properties</div>
            <div class="ai-valuation__comp">
              <strong>Adjustments:</strong> Bedrooms: ${data.adjustments.bedrooms > 0 ? '+' : ''}$${data.adjustments.bedrooms.toLocaleString()} | 
              Bathrooms: ${data.adjustments.bathrooms > 0 ? '+' : ''}$${data.adjustments.bathrooms.toLocaleString()} | 
              Age: ${data.adjustments.age > 0 ? '+' : ''}$${data.adjustments.age.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    `;

    messagesEl.scrollTop = messagesEl.scrollHeight;

  } catch (err) {
    loadingEl.innerHTML = `❌ ${err.message || 'Failed to get valuation. Please try a different listing ID.'}`;
  }
}

async function showAiMarketTrends() {
  if (!currentUser) {
    showToast('Please log in to use AI features', 'warning');
    return;
  }

  const messagesEl = document.getElementById('chatMessages');

  // Show city selection UI
  messagesEl.innerHTML += `
    <div class="chat-message chat-message--agent">
      📈 <b>Market Trends Analysis</b><br><br>
      Enter a city and state to see price trends:
      <div style="margin-top: 12px; display: flex; gap: 8px;">
        <input type="text" id="aiTrendsCity" placeholder="City (e.g., Edison)" 
          style="flex: 2; padding: 8px 12px; background: rgba(255,255,255,0.04); border: 1px solid var(--line); border-radius: 8px; color: var(--text); font-size: 13px;">
        <input type="text" id="aiTrendsState" placeholder="State (e.g., NJ)" maxlength="2"
          style="flex: 1; padding: 8px 12px; background: rgba(255,255,255,0.04); border: 1px solid var(--line); border-radius: 8px; color: var(--text); font-size: 13px; text-transform: uppercase;">
        <button id="aiTrendsSubmit" class="btn btn--small" style="padding: 8px 16px;">View</button>
      </div>
    </div>
  `;

  messagesEl.scrollTop = messagesEl.scrollHeight;

  // Add submit handler
  document.getElementById('aiTrendsSubmit').addEventListener('click', async () => {
    const city = document.getElementById('aiTrendsCity').value.trim();
    const state = document.getElementById('aiTrendsState').value.trim().toUpperCase();
    if (!city || !state) {
      showToast('Please enter city and state', 'warning');
      return;
    }
    await fetchAiMarketTrends(city, state);
  });

  document.getElementById('aiTrendsState').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('aiTrendsSubmit').click();
    }
  });
}

async function fetchAiMarketTrends(city, state) {
  const messagesEl = document.getElementById('chatMessages');

  // Show loading
  const loadingEl = document.createElement('div');
  loadingEl.className = 'chat-message chat-message--agent';
  loadingEl.innerHTML = '<div class="chat-typing"><span></span><span></span><span></span></div> Analyzing market data...';
  messagesEl.appendChild(loadingEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  try {
    const data = await apiFetch(`/api/ai/market-trends?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`);
    loadingEl.remove();

    if (!data.series || data.series.length === 0) {
      messagesEl.innerHTML += `
        <div class="chat-message chat-message--agent">
          ❌ No market data available for ${city}, ${state}. Try a major city like Edison, NJ or Miami, FL.
        </div>
      `;
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return;
    }

    // Create chart container
    const chartId = 'aiChart_' + Date.now();
    const growthClass = data.summary.totalGrowthPercent >= 0 ? 'up' : 'down';

    messagesEl.innerHTML += `
      <div class="chat-message chat-message--agent">
        <div class="ai-chart-container" style="min-height: 320px;">
          <div style="font-weight: 600; margin-bottom: 12px;">📊 ${city}, ${state} Market Trends</div>
          <canvas id="${chartId}" style="max-height: 180px;"></canvas>
          <div class="ai-chart-summary">
            <div class="ai-chart-stat ai-chart-stat--${growthClass}">
              <div class="ai-chart-stat__value">${data.summary.totalGrowthPercent >= 0 ? '+' : ''}${data.summary.totalGrowthPercent}%</div>
              <div class="ai-chart-stat__label">Total Growth</div>
            </div>
            <div class="ai-chart-stat">
              <div class="ai-chart-stat__value">$${data.summary.latestPrice}</div>
              <div class="ai-chart-stat__label">Current $/sqft</div>
            </div>
            <div class="ai-chart-stat">
              <div class="ai-chart-stat__value">$${data.summary.earliestPrice}</div>
              <div class="ai-chart-stat__label">Start $/sqft</div>
            </div>
            <div class="ai-chart-stat">
              <div class="ai-chart-stat__value">${data.series.length}</div>
              <div class="ai-chart-stat__label">Data Points</div>
            </div>
          </div>
        </div>
      </div>
    `;

    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Initialize chart
    setTimeout(() => {
      const ctx = document.getElementById(chartId);
      if (ctx && typeof Chart !== 'undefined') {
        const labels = data.series.map(s => `Q${s.quarter} ${s.year}`);
        const prices = data.series.map(s => s.pricePerSqft);

        new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: '$/sqft',
              data: prices,
              borderColor: '#7c5cff',
              backgroundColor: 'rgba(124, 92, 255, 0.1)',
              fill: true,
              tension: 0.3,
              pointRadius: 3,
              pointBackgroundColor: '#7c5cff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              x: {
                grid: { color: document.documentElement.classList.contains('light') ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)' },
                ticks: { color: document.documentElement.classList.contains('light') ? '#6b7280' : '#888', font: { size: 10 } }
              },
              y: {
                grid: { color: document.documentElement.classList.contains('light') ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)' },
                ticks: { color: document.documentElement.classList.contains('light') ? '#6b7280' : '#888', font: { size: 10 }, callback: v => '$' + v }
              }
            }
          }
        });
      }
    }, 100);

  } catch (err) {
    loadingEl.innerHTML = `❌ ${err.message || 'Failed to fetch market trends.'}`;
  }
}

async function showAiMapView() {
  if (!currentUser) {
    showToast('Please log in to use AI features', 'warning');
    return;
  }

  const messagesEl = document.getElementById('chatMessages');

  // Show map type selection
  messagesEl.innerHTML += `
    <div class="chat-message chat-message--agent">
      🗺️ <b>Listings Map View</b><br><br>
      Choose listing type to view on map:
      <div style="margin-top: 12px; display: flex; gap: 8px;">
        <button id="mapViewSale" class="chat-ai-btn">🏠 For Sale</button>
        <button id="mapViewRental" class="chat-ai-btn">🔑 For Rent</button>
        <button id="mapViewAll" class="chat-ai-btn">📍 All Listings</button>
      </div>
    </div>
  `;

  messagesEl.scrollTop = messagesEl.scrollHeight;

  // Add handlers
  document.getElementById('mapViewSale').addEventListener('click', () => showMapInChat('sale'));
  document.getElementById('mapViewRental').addEventListener('click', () => showMapInChat('rental'));
  document.getElementById('mapViewAll').addEventListener('click', () => showMapInChat(''));
}

async function showMapInChat(kind) {
  const messagesEl = document.getElementById('chatMessages');

  // Show loading
  const loadingEl = document.createElement('div');
  loadingEl.className = 'chat-message chat-message--agent';
  loadingEl.innerHTML = '<div class="chat-typing"><span></span><span></span><span></span></div> Loading map data...';
  messagesEl.appendChild(loadingEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  try {
    const url = kind ? `/api/listings/map?kind=${kind}` : '/api/listings/map';
    const listings = await apiFetch(url);
    loadingEl.remove();

    if (listings.length === 0) {
      messagesEl.innerHTML += `
        <div class="chat-message chat-message--agent">
          📍 No listings found with location data.
        </div>
      `;
      return;
    }

    // Create map container
    const mapId = 'aiMap_' + Date.now();
    const kindLabel = kind === 'sale' ? 'For Sale' : kind === 'rental' ? 'For Rent' : 'All';

    messagesEl.innerHTML += `
      <div class="chat-message chat-message--agent" style="padding: 0;">
        <div class="ai-map-container">
          <div class="ai-map-header">
            <span class="ai-map-header__title">🗺️ ${listings.length} ${kindLabel} Listings</span>
            <a href="#/map?kind=${kind}" style="font-size: 12px; color: var(--accent);">Open Full Map →</a>
          </div>
          <div id="${mapId}" class="ai-map" style="height: 280px;"></div>
        </div>
      </div>
    `;

    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Initialize Leaflet map
    setTimeout(() => {
      if (typeof L !== 'undefined') {
        const mapEl = document.getElementById(mapId);
        if (!mapEl) return;

        // Find center point from listings
        const validListings = listings.filter(l => l.lat && l.lng);
        if (validListings.length === 0) return;

        const avgLat = validListings.reduce((s, l) => s + l.lat, 0) / validListings.length;
        const avgLng = validListings.reduce((s, l) => s + l.lng, 0) / validListings.length;

        const map = L.map(mapId).setView([avgLat, avgLng], 10);

        let aiTileLayer = L.tileLayer(currentTileUrl(), {
          maxZoom: 19, attribution: ''
        }).addTo(map);

        window.addEventListener('ownit-theme-change', () => {
          map.removeLayer(aiTileLayer);
          aiTileLayer = L.tileLayer(currentTileUrl(), { maxZoom: 19, attribution: '' }).addTo(map);
        });

        // Add markers
        validListings.forEach(listing => {
          const price = listing.kind === 'rental'
            ? `$${listing.price.toLocaleString()}/mo`
            : `$${listing.price.toLocaleString()}`;

          const marker = L.marker([listing.lat, listing.lng]).addTo(map);
          marker.bindPopup(`
            <div class="map-popup">
              <div class="map-popup__price">${price}</div>
              <div class="map-popup__location">${listing.city}, ${listing.state}</div>
              <div class="map-popup__details">
                ${listing.bedrooms} bed • ${listing.bathrooms} bath • ${listing.square_feet.toLocaleString()} sqft
              </div>
              <a href="#/listing/${listing.id}" class="map-popup__link" onclick="toggleChat(false)">View Details</a>
            </div>
          `);
        });

        // Fit bounds to show all markers
        const bounds = L.latLngBounds(validListings.map(l => [l.lat, l.lng]));
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    }, 100);

  } catch (err) {
    loadingEl.innerHTML = `❌ ${err.message || 'Failed to load map data.'}`;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize chat widget immediately since this is a module script (runs after DOM ready)
initChatWidget();
