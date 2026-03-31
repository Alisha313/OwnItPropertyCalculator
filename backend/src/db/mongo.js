import { MongoClient, ObjectId } from "mongodb";

const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://paalisha_db_user:LMaGOVJw0vABFc24@ownit.2yfj4f1.mongodb.net/?appName=ownit";

let client = null;
let db = null;

export async function connectToMongoDB() {
  if (db) return db;
  
  try {
    client = new MongoClient(MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 1,
    });
    
    await client.connect();
    db = client.db("ownit");
    
    // Create indexes
    await createIndexes();
    
    console.log("Connected to MongoDB Atlas");
    return db;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

async function createIndexes() {
  // Users - email unique
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  
  // Listings indexes
  await db.collection("listings").createIndex({ kind: 1 });
  await db.collection("listings").createIndex({ city: 1 });
  await db.collection("listings").createIndex({ state: 1 });
  await db.collection("listings").createIndex({ price: 1 });
  
  // Subscriptions indexes
  await db.collection("subscriptions").createIndex({ user_id: 1 });
  await db.collection("subscriptions").createIndex({ status: 1 });
  
  // Chat sessions indexes
  await db.collection("chat_sessions").createIndex({ user_id: 1 });
  await db.collection("chat_messages").createIndex({ session_id: 1 });
  
  // Market trends indexes
  await db.collection("market_trends").createIndex({ city: 1, state: 1 });
  await db.collection("market_trends").createIndex({ year: 1 });
  
  // Saved properties indexes
  await db.collection("saved_properties").createIndex({ user_id: 1 });
  
  console.log("MongoDB indexes created");
}

export function getDb() {
  if (!db) throw new Error("MongoDB not connected. Call connectToMongoDB() first.");
  return db;
}

export function getObjectId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

// Helper to convert MongoDB documents to match old SQLite API
export const mongo = {
  users: () => getDb().collection("users"),
  listings: () => getDb().collection("listings"),
  subscription_plans: () => getDb().collection("subscription_plans"),
  subscriptions: () => getDb().collection("subscriptions"),
  email_reminders: () => getDb().collection("email_reminders"),
  agent_requests: () => getDb().collection("agent_requests"),
  chat_sessions: () => getDb().collection("chat_sessions"),
  chat_messages: () => getDb().collection("chat_messages"),
  market_trends: () => getDb().collection("market_trends"),
  saved_properties: () => getDb().collection("saved_properties"),
};

// Seed data for initial population
export async function seedDatabase() {
  const db = getDb();
  
  // Check if already seeded
  const existingListings = await db.collection("listings").countDocuments();
  if (existingListings > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }
  
  console.log("Seeding database with initial data...");
  
  // Seed subscription plans
  await db.collection("subscription_plans").insertMany([
    { name: "Basic", billing_cycle: "monthly", price: 9.99, features: ["Basic property search", "5 saved properties", "Email support"] },
    { name: "Pro", billing_cycle: "monthly", price: 19.99, features: ["Advanced property search", "Unlimited saved properties", "AI assistant access", "Priority support"] },
    { name: "Annual Basic", billing_cycle: "annually", price: 99.99, features: ["Basic property search", "5 saved properties", "Email support"] },
    { name: "Annual Pro", billing_cycle: "annually", price: 199.99, features: ["Advanced property search", "Unlimited saved properties", "AI assistant access", "Priority support"] },
  ]);
  
  // Seed market trends
  const marketTrends = [];
  const cities = [
    { city: "New York", state: "NY" },
    { city: "Los Angeles", state: "CA" },
    { city: "Chicago", state: "IL" },
    { city: "Houston", state: "TX" },
    { city: "Miami", state: "FL" },
    { city: "Seattle", state: "WA" },
    { city: "Denver", state: "CO" },
    { city: "Phoenix", state: "AZ" },
    { city: "Atlanta", state: "GA" },
    { city: "Boston", state: "MA" },
    { city: "San Francisco", state: "CA" },
    { city: "Austin", state: "TX" },
  ];
  
  const basePrices = { "NY": 450, "CA": 380, "IL": 180, "TX": 160, "FL": 250, "WA": 300, "CO": 280, "AZ": 200, "GA": 190, "MA": 360 };
  
  for (const { city, state } of cities) {
    const basePrice = basePrices[state] || 200;
    for (let year = 2022; year <= 2025; year++) {
      for (let quarter = 1; quarter <= 4; quarter++) {
        const variance = 1 + (Math.random() * 0.2 - 0.1);
        marketTrends.push({
          city,
          state,
          quarter,
          year,
          price_per_sqft: Math.round(basePrice * variance),
        });
      }
    }
  }
  await db.collection("market_trends").insertMany(marketTrends);
  
  // Seed listings — 1 sale + 1 rental per US state (100 total)
  const listings = [
    // ── SALES ──────────────────────────────────────────────────────────────
    { id: "sale_AL", kind: "sale", type: "Single Family",  city: "Birmingham",    state: "AL", address: "214 Magnolia Dr",      description: "Charming brick colonial with wraparound porch and mature oak trees in a quiet neighborhood",             image_url: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80", status: "active", price: 245000,  bedrooms: 3, bathrooms: 2,   sqft: 1780, year_built: 2005, lat: 33.5186,  lng: -86.8104  },
    { id: "sale_AK", kind: "sale", type: "Single Family",  city: "Anchorage",     state: "AK", address: "8810 Arctic Blvd",     description: "Well-insulated home with mountain views, two-car garage, and updated kitchen",                         image_url: "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800&q=80", status: "active", price: 420000,  bedrooms: 3, bathrooms: 2,   sqft: 1650, year_built: 2010, lat: 61.2181,  lng: -149.9003 },
    { id: "sale_AZ", kind: "sale", type: "Ranch",          city: "Scottsdale",    state: "AZ", address: "4421 Desert Rose Ln",  description: "Open-concept ranch home with heated pool, desert landscaping, and stunning mountain backdrop",         image_url: "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800&q=80", status: "active", price: 589000,  bedrooms: 4, bathrooms: 3,   sqft: 2400, year_built: 2017, lat: 33.4942,  lng: -111.9261 },
    { id: "sale_AR", kind: "sale", type: "Single Family",  city: "Little Rock",   state: "AR", address: "311 Kavanaugh Blvd",   description: "Updated craftsman bungalow with hardwood floors, modern kitchen, and large fenced backyard",            image_url: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80", status: "active", price: 218000,  bedrooms: 3, bathrooms: 2,   sqft: 1520, year_built: 2003, lat: 34.7465,  lng: -92.2896  },
    { id: "sale_CA", kind: "sale", type: "Condo",          city: "Los Angeles",   state: "CA", address: "456 Sunset Blvd",     description: "Modern condo with ocean view, rooftop terrace, and open-concept floor plan",                         image_url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80", status: "active", price: 1250000, bedrooms: 3, bathrooms: 2,   sqft: 1800, year_built: 2020, lat: 34.0522,  lng: -118.2437 },
    { id: "sale_CO", kind: "sale", type: "Contemporary",   city: "Denver",        state: "CO", address: "2200 Larimer St",     description: "Sleek contemporary home with rooftop deck and panoramic Rocky Mountain views",                        image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80", status: "active", price: 675000,  bedrooms: 3, bathrooms: 2.5, sqft: 2100, year_built: 2019, lat: 39.7392,  lng: -104.9903 },
    { id: "sale_CT", kind: "sale", type: "Colonial",       city: "Greenwich",     state: "CT", address: "90 Round Hill Rd",    description: "Classic New England colonial with formal dining room, finished basement, and tree-lined backyard",     image_url: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80", status: "active", price: 895000,  bedrooms: 4, bathrooms: 3,   sqft: 2800, year_built: 2008, lat: 41.0262,  lng: -73.6282  },
    { id: "sale_DE", kind: "sale", type: "Townhouse",      city: "Wilmington",    state: "DE", address: "512 Lovering Ave",    description: "End-unit townhouse with private rooftop, updated appliances, and walkable to Trolley Square",         image_url: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80", status: "active", price: 348000,  bedrooms: 3, bathrooms: 2.5, sqft: 1750, year_built: 2015, lat: 39.7447,  lng: -75.5484  },
    { id: "sale_FL", kind: "sale", type: "Single Family",  city: "Miami",         state: "FL", address: "321 Ocean Dr",        description: "Stunning waterfront estate with heated pool, summer kitchen, and tropical landscaping",               image_url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80", status: "active", price: 1875000, bedrooms: 4, bathrooms: 3,   sqft: 2800, year_built: 2021, lat: 25.7617,  lng: -80.1918  },
    { id: "sale_GA", kind: "sale", type: "Craftsman",      city: "Atlanta",       state: "GA", address: "740 Ponce de Leon Ave","description": "Beautiful craftsman with original hardwood floors, wrap porch, and newly renovated chef's kitchen",   image_url: "https://images.unsplash.com/photo-1598228723793-52759bba239c?w=800&q=80", status: "active", price: 495000,  bedrooms: 4, bathrooms: 2.5, sqft: 2250, year_built: 2001, lat: 33.7490,  lng: -84.3880  },
    { id: "sale_HI", kind: "sale", type: "Single Family",  city: "Honolulu",      state: "HI", address: "1221 Ala Moana Blvd", description: "Tropical island home with lanai, lush garden, and breathtaking ocean views just minutes from Waikiki",  image_url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80", status: "active", price: 1350000, bedrooms: 3, bathrooms: 2,   sqft: 1650, year_built: 2016, lat: 21.3069,  lng: -157.8583 },
    { id: "sale_ID", kind: "sale", type: "Ranch",          city: "Boise",         state: "ID", address: "5510 Warm Springs Ave","description": "Spacious single-level ranch with open layout, three-car garage, and views of the Boise foothills",    image_url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80", status: "active", price: 478000,  bedrooms: 4, bathrooms: 3,   sqft: 2300, year_built: 2014, lat: 43.6150,  lng: -116.2023 },
    { id: "sale_IL", kind: "sale", type: "Condo",          city: "Chicago",       state: "IL", address: "875 N Michigan Ave",  description: "Luxury Gold Coast condo with floor-to-ceiling windows, chef's kitchen, and stunning lake views",        image_url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80", status: "active", price: 625000,  bedrooms: 2, bathrooms: 2,   sqft: 1400, year_built: 2018, lat: 41.8781,  lng: -87.6298  },
    { id: "sale_IN", kind: "sale", type: "Single Family",  city: "Indianapolis",  state: "IN", address: "3340 N Meridian St",  description: "Classic two-story with updated master bath, finished basement, and tree-shaded backyard",             image_url: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80", status: "active", price: 289000,  bedrooms: 4, bathrooms: 2.5, sqft: 2050, year_built: 2007, lat: 39.7684,  lng: -86.1581  },
    { id: "sale_IA", kind: "sale", type: "Single Family",  city: "Des Moines",    state: "IA", address: "4215 Ingersoll Ave",  description: "Well-maintained ranch home with updated kitchen, new roof, and large fenced yard perfect for families", image_url: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80", status: "active", price: 252000,  bedrooms: 3, bathrooms: 2,   sqft: 1600, year_built: 2004, lat: 41.5868,  lng: -93.6250  },
    { id: "sale_KS", kind: "sale", type: "Single Family",  city: "Wichita",       state: "KS", address: "1780 E Douglas Ave",  description: "Spacious brick home near College Hill with original built-ins, hardwood floors, and sunroom",          image_url: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80", status: "active", price: 235000,  bedrooms: 3, bathrooms: 2,   sqft: 1850, year_built: 2000, lat: 37.6872,  lng: -97.3301  },
    { id: "sale_KY", kind: "sale", type: "Colonial",       city: "Louisville",    state: "KY", address: "2210 Grinstead Dr",   description: "Classic colonial in the Highlands with front porch, renovated kitchen, and oversized garage",         image_url: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80", status: "active", price: 315000,  bedrooms: 4, bathrooms: 2,   sqft: 2100, year_built: 2002, lat: 38.2527,  lng: -85.7585  },
    { id: "sale_LA", kind: "sale", type: "Craftsman",      city: "New Orleans",   state: "LA", address: "618 Magazine St",     description: "Restored Uptown shotgun double with original cypress floors, courtyard garden, and classic architecture", image_url: "https://images.unsplash.com/photo-1598228723793-52759bba239c?w=800&q=80", status: "active", price: 385000,  bedrooms: 3, bathrooms: 2,   sqft: 1700, year_built: 1935, lat: 29.9511,  lng: -90.0715  },
    { id: "sale_ME", kind: "sale", type: "Single Family",  city: "Portland",      state: "ME", address: "24 Eastern Promenade", description: "Charming Victorian with harbour views, original woodwork, and a sunny eat-in kitchen",                  image_url: "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800&q=80", status: "active", price: 489000,  bedrooms: 3, bathrooms: 2,   sqft: 1900, year_built: 1895, lat: 43.6591,  lng: -70.2568  },
    { id: "sale_MD", kind: "sale", type: "Townhouse",      city: "Baltimore",     state: "MD", address: "1401 Fed Hill Sq",    description: "Federal Hill rowhome with private rooftop deck, exposed brick, and stunning harbor views",            image_url: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80", status: "active", price: 498000,  bedrooms: 3, bathrooms: 2.5, sqft: 1850, year_built: 2012, lat: 39.2904,  lng: -76.6122  },
    { id: "sale_MA", kind: "sale", type: "Single Family",  city: "Boston",        state: "MA", address: "45 Commonwealth Ave",  description: "Elegant Back Bay brownstone with period details, updated systems, and private garden patio",           image_url: "https://images.unsplash.com/photo-1625602812206-5ec545ca1231?w=800&q=80", status: "active", price: 1150000, bedrooms: 3, bathrooms: 2.5, sqft: 2000, year_built: 1890, lat: 42.3601,  lng: -71.0589  },
    { id: "sale_MI", kind: "sale", type: "Single Family",  city: "Ann Arbor",     state: "MI", address: "612 Granger Ave",     description: "Classic Ann Arbor bungalow near U of M campus with updated bath, new windows, and perennial garden",   image_url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80", status: "active", price: 368000,  bedrooms: 3, bathrooms: 1.5, sqft: 1450, year_built: 1948, lat: 42.2808,  lng: -83.7430  },
    { id: "sale_MN", kind: "sale", type: "Contemporary",   city: "Minneapolis",   state: "MN", address: "2800 Lake Calhoun Pkwy","description": "Modern home steps from Lake Calhoun with open floor plan, chef's kitchen, and attached two-car garage",  image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80", status: "active", price: 549000,  bedrooms: 4, bathrooms: 3,   sqft: 2350, year_built: 2016, lat: 44.9778,  lng: -93.2650  },
    { id: "sale_MS", kind: "sale", type: "Single Family",  city: "Jackson",       state: "MS", address: "910 Fortification St", description: "Updated craftsman in Belhaven with original hardwoods, screened porch, and mature magnolias",           image_url: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80", status: "active", price: 198000,  bedrooms: 3, bathrooms: 2,   sqft: 1620, year_built: 1960, lat: 32.2988,  lng: -90.1848  },
    { id: "sale_MO", kind: "sale", type: "Single Family",  city: "Kansas City",   state: "MO", address: "4422 Wornall Rd",     description: "Beautifully renovated two-story in Ward Parkway with finished basement and private deck",              image_url: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80", status: "active", price: 329000,  bedrooms: 4, bathrooms: 2.5, sqft: 2200, year_built: 1998, lat: 39.0997,  lng: -94.5786  },
    { id: "sale_MT", kind: "sale", type: "Ranch",          city: "Bozeman",       state: "MT", address: "1200 S 3rd Ave",      description: "Timber-frame ranch with open great room, mountain views, and proximity to world-class skiing",          image_url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80", status: "active", price: 595000,  bedrooms: 4, bathrooms: 3,   sqft: 2600, year_built: 2013, lat: 45.6770,  lng: -111.0429 },
    { id: "sale_NE", kind: "sale", type: "Single Family",  city: "Omaha",         state: "NE", address: "5115 Leavenworth St",  description: "Well-kept ranch with sunlit living areas, updated kitchen, and spacious backyard in Midtown Crossing",  image_url: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80", status: "active", price: 278000,  bedrooms: 3, bathrooms: 2,   sqft: 1700, year_built: 2006, lat: 41.2565,  lng: -95.9345  },
    { id: "sale_NV", kind: "sale", type: "Contemporary",   city: "Las Vegas",     state: "NV", address: "9300 S Eastern Ave",  description: "Sleek contemporary with private pool, smart home system, and breathtaking Vegas Strip views",           image_url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80", status: "active", price: 480000,  bedrooms: 4, bathrooms: 3,   sqft: 2500, year_built: 2019, lat: 36.1699,  lng: -115.1398 },
    { id: "sale_NH", kind: "sale", type: "Colonial",       city: "Manchester",    state: "NH", address: "76 Beech St",         description: "Stately colonial near Derryfield Park with granite counters, three-car garage, and in-law suite",      image_url: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80", status: "active", price: 528000,  bedrooms: 4, bathrooms: 3,   sqft: 2800, year_built: 2011, lat: 42.9956,  lng: -71.4548  },
    { id: "sale_NJ", kind: "sale", type: "Single Family",  city: "Hoboken",       state: "NJ", address: "330 Washington St",   description: "Renovated brownstone steps from PATH train with private parking and Manhattan skyline views",           image_url: "https://images.unsplash.com/photo-1598228723793-52759bba239c?w=800&q=80", status: "active", price: 920000,  bedrooms: 3, bathrooms: 2.5, sqft: 1950, year_built: 1910, lat: 40.7440,  lng: -74.0324  },
    { id: "sale_NM", kind: "sale", type: "Ranch",          city: "Albuquerque",   state: "NM", address: "6820 Rio Grande Blvd", description: "Adobe-style ranch with vigas, saltillo tile, and a landscaped courtyard with Sandia Mountain views",    image_url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80", status: "active", price: 349000,  bedrooms: 3, bathrooms: 2,   sqft: 1900, year_built: 2009, lat: 35.0844,  lng: -106.6504 },
    { id: "sale_NY", kind: "sale", type: "Single Family",  city: "New York",      state: "NY", address: "123 Manhattan Ave",   description: "Beautiful brownstone in Manhattan with classic brick facade and modern interiors",                      image_url: "https://images.unsplash.com/photo-1625602812206-5ec545ca1231?w=800&q=80", status: "active", price: 850000,  bedrooms: 2, bathrooms: 2,   sqft: 1200, year_built: 2018, lat: 40.7128,  lng: -74.0060  },
    { id: "sale_NC", kind: "sale", type: "Craftsman",      city: "Charlotte",     state: "NC", address: "1840 Kenilworth Ave",  description: "Arts & Crafts bungalow in Dilworth with original details, screened porch, and updated kitchen",         image_url: "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800&q=80", status: "active", price: 448000,  bedrooms: 3, bathrooms: 2,   sqft: 1780, year_built: 1928, lat: 35.2271,  lng: -80.8431  },
    { id: "sale_ND", kind: "sale", type: "Single Family",  city: "Fargo",         state: "ND", address: "2215 S University Dr", description: "Bright two-story near NDSU with new windows, updated baths, and double attached garage",               image_url: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80", status: "active", price: 295000,  bedrooms: 4, bathrooms: 2.5, sqft: 2050, year_built: 2008, lat: 46.8772,  lng: -96.7898  },
    { id: "sale_OH", kind: "sale", type: "Single Family",  city: "Columbus",      state: "OH", address: "1412 Summit St",      description: "Victorian-era home in Short North arts district with tin ceilings, remodeled bath, and parking pad",    image_url: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80", status: "active", price: 318000,  bedrooms: 3, bathrooms: 2,   sqft: 1680, year_built: 1905, lat: 39.9612,  lng: -82.9988  },
    { id: "sale_OK", kind: "sale", type: "Ranch",          city: "Oklahoma City", state: "OK", address: "4510 NW Expressway",   description: "Open-plan ranch with vaulted ceilings, three-car garage, and a sparkling in-ground pool",               image_url: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80", status: "active", price: 272000,  bedrooms: 4, bathrooms: 2.5, sqft: 2200, year_built: 2010, lat: 35.4676,  lng: -97.5164  },
    { id: "sale_OR", kind: "sale", type: "Craftsman",      city: "Portland",      state: "OR", address: "2244 SE Division St",  description: "Restored Portland craftsman with Stumptown charm, ADU in backyard, and great walkability score",         image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80", status: "active", price: 619000,  bedrooms: 3, bathrooms: 2,   sqft: 1900, year_built: 1922, lat: 45.5051,  lng: -122.6750 },
    { id: "sale_PA", kind: "sale", type: "Townhouse",      city: "Philadelphia",  state: "PA", address: "1820 Pine St",        description: "Rittenhouse Square rowhome with chef's kitchen, exposed brick, private garden, and off-street parking",  image_url: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80", status: "active", price: 565000,  bedrooms: 3, bathrooms: 2.5, sqft: 2100, year_built: 2014, lat: 39.9526,  lng: -75.1652  },
    { id: "sale_RI", kind: "sale", type: "Single Family",  city: "Providence",    state: "RI", address: "110 Benefit St",      description: "Federal-style home on College Hill with harbor views, period millwork, and updated systems",            image_url: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80", status: "active", price: 545000,  bedrooms: 4, bathrooms: 2.5, sqft: 2200, year_built: 1820, lat: 41.8240,  lng: -71.4128  },
    { id: "sale_SC", kind: "sale", type: "Single Family",  city: "Charleston",    state: "SC", address: "22 Church St",        description: "Antebellum-era South of Broad home with piazzas, formal garden, and meticulous historic restoration",    image_url: "https://images.unsplash.com/photo-1598228723793-52759bba239c?w=800&q=80", status: "active", price: 785000,  bedrooms: 3, bathrooms: 2,   sqft: 2050, year_built: 1840, lat: 32.7765,  lng: -79.9311  },
    { id: "sale_SD", kind: "sale", type: "Single Family",  city: "Sioux Falls",   state: "SD", address: "3310 S Kiwanis Ave",  description: "Move-in ready two-story with granite counters, vaulted ceilings, and large corner lot",               image_url: "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800&q=80", status: "active", price: 312000,  bedrooms: 4, bathrooms: 3,   sqft: 2100, year_built: 2012, lat: 43.5446,  lng: -96.7311  },
    { id: "sale_TN", kind: "sale", type: "Craftsman",      city: "Nashville",     state: "TN", address: "1640 12th Ave S",     description: "East Nashville craftsman in the heart of 12 South with original character and modern updates throughout",  image_url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80", status: "active", price: 525000,  bedrooms: 3, bathrooms: 2,   sqft: 1850, year_built: 1945, lat: 36.1627,  lng: -86.7816  },
    { id: "sale_TX", kind: "sale", type: "Townhouse",      city: "Austin",        state: "TX", address: "789 Congress Ave",    description: "Charming two-story townhouse near downtown Austin with covered porch and designer finishes",            image_url: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80", status: "active", price: 425000,  bedrooms: 3, bathrooms: 2.5, sqft: 1650, year_built: 2019, lat: 30.2672,  lng: -97.7431  },
    { id: "sale_UT", kind: "sale", type: "Contemporary",   city: "Salt Lake City",state: "UT", address: "450 E South Temple", description: "Modern home with soaring ceilings, ski-in access, and unobstructed Wasatch Mountain views",              image_url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80", status: "active", price: 675000,  bedrooms: 4, bathrooms: 3,   sqft: 2600, year_built: 2020, lat: 40.7608,  lng: -111.8910 },
    { id: "sale_VT", kind: "sale", type: "Colonial",       city: "Burlington",    state: "VT", address: "88 South Willard St",  description: "Lovingly maintained colonial near Church Street with original wide-plank floors and covered porch",      image_url: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80", status: "active", price: 495000,  bedrooms: 3, bathrooms: 2,   sqft: 1950, year_built: 1890, lat: 44.4759,  lng: -73.2121  },
    { id: "sale_VA", kind: "sale", type: "Single Family",  city: "Richmond",      state: "VA", address: "2700 Monument Ave",   description: "Grand Victorian on Monument Avenue with original plaster medallions, marble fireplaces, and carriage house", image_url: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80", status: "active", price: 745000,  bedrooms: 5, bathrooms: 3,   sqft: 3200, year_built: 1908, lat: 37.5407,  lng: -77.4360  },
    { id: "sale_WA", kind: "sale", type: "Condo",          city: "Seattle",       state: "WA", address: "555 Pike St",         description: "Contemporary condo with floor-to-ceiling windows, Puget Sound views, and concierge building",          image_url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80", status: "active", price: 695000,  bedrooms: 2, bathrooms: 2,   sqft: 1100, year_built: 2022, lat: 47.6062,  lng: -122.3321 },
    { id: "sale_WV", kind: "sale", type: "Single Family",  city: "Morgantown",    state: "WV", address: "411 University Ave",  description: "Solid brick colonial near WVU campus with hardwood floors, updated kitchen, and generous yard",         image_url: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80", status: "active", price: 215000,  bedrooms: 3, bathrooms: 2,   sqft: 1550, year_built: 1992, lat: 39.6295,  lng: -79.9559  },
    { id: "sale_WI", kind: "sale", type: "Single Family",  city: "Milwaukee",     state: "WI", address: "2820 N Downer Ave",   description: "Bay View bungalow with original built-ins, updated bath, and steps to Lake Michigan parks",             image_url: "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800&q=80", status: "active", price: 298000,  bedrooms: 3, bathrooms: 1.5, sqft: 1480, year_built: 1929, lat: 43.0389,  lng: -87.9065  },
    { id: "sale_WY", kind: "sale", type: "Ranch",          city: "Cheyenne",      state: "WY", address: "1812 Carey Ave",      description: "Sprawling ranch with mountain views, three-car garage, and energy-efficient upgrades throughout",       image_url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80", status: "active", price: 355000,  bedrooms: 4, bathrooms: 2.5, sqft: 2300, year_built: 2015, lat: 41.1400,  lng: -104.8202 },

    // ── RENTALS ────────────────────────────────────────────────────────────
    { id: "rent_AL", kind: "rental", type: "Apartment",    city: "Birmingham",    state: "AL", address: "100 Richard Arrington Blvd","description": "Bright downtown apartment with exposed brick, updated kitchen, and walkable to dining and entertainment", image_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80", status: "active", price: 1050,  bedrooms: 1, bathrooms: 1,   sqft: 720,  year_built: 2016, lat: 33.5186,  lng: -86.8012  },
    { id: "rent_AK", kind: "rental", type: "House",        city: "Anchorage",     state: "AK", address: "2200 W 32nd Ave",     description: "Cozy single-family rental with large yard, two-car garage, and trail access to Far North Bicentennial Park", image_url: "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80", status: "active", price: 2100,  bedrooms: 3, bathrooms: 2,   sqft: 1450, year_built: 2005, lat: 61.1850,  lng: -149.9300 },
    { id: "rent_AZ", kind: "rental", type: "Townhouse",    city: "Phoenix",       state: "AZ", address: "450 Camelback Rd",    description: "Southwest-style townhouse with private pool, gated community, and views of the McDowell Mountains",      image_url: "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800&q=80", status: "active", price: 1950,  bedrooms: 2, bathrooms: 2,   sqft: 1200, year_built: 2018, lat: 33.4484,  lng: -112.0740 },
    { id: "rent_AR", kind: "rental", type: "Apartment",    city: "Little Rock",   state: "AR", address: "400 President Clinton Ave","description": "Modern riverfront apartment with granite counters, in-unit laundry, and city skyline views",          image_url: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&q=80", status: "active", price: 1050,  bedrooms: 1, bathrooms: 1,   sqft: 680,  year_built: 2017, lat: 34.7490,  lng: -92.2811  },
    { id: "rent_CA", kind: "rental", type: "Condo",        city: "San Francisco",  state: "CA", address: "888 Brannan St",     description: "Chic SoMa condo with concrete ceilings, chef's kitchen, rooftop terrace access, and secure parking",    image_url: "https://images.unsplash.com/photo-1567684014761-b65e2e59b9eb?w=800&q=80", status: "active", price: 3800,  bedrooms: 2, bathrooms: 2,   sqft: 1100, year_built: 2019, lat: 37.7749,  lng: -122.4194 },
    { id: "rent_CO", kind: "rental", type: "Apartment",    city: "Denver",        state: "CO", address: "1500 Main St",        description: "Modern loft-style apartment near LoDo with mountain views and rooftop access",                         image_url: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&q=80", status: "active", price: 1800,  bedrooms: 1, bathrooms: 1,   sqft: 750,  year_built: 2020, lat: 39.7392,  lng: -104.9903 },
    { id: "rent_CT", kind: "rental", type: "Apartment",    city: "New Haven",     state: "CT", address: "900 Chapel St",       description: "Renovated apartment near Yale campus with hardwood floors, stainless appliances, and in-unit washer/dryer", image_url: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80", status: "active", price: 1950,  bedrooms: 2, bathrooms: 1,   sqft: 900,  year_built: 2014, lat: 41.3083,  lng: -72.9279  },
    { id: "rent_DE", kind: "rental", type: "Apartment",    city: "Wilmington",    state: "DE", address: "900 N Market St",     description: "Downtown high-rise apartment with gym access, rooftop lounge, and sweeping Delaware River views",       image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80", status: "active", price: 1650,  bedrooms: 1, bathrooms: 1,   sqft: 750,  year_built: 2018, lat: 39.7447,  lng: -75.5484  },
    { id: "rent_FL", kind: "rental", type: "Condo",        city: "Miami",         state: "FL", address: "888 Brickell Ave",    description: "Luxury high-rise condo in Brickell with resort-style pool and panoramic bay views",                     image_url: "https://images.unsplash.com/photo-1567684014761-b65e2e59b9eb?w=800&q=80", status: "active", price: 3500,  bedrooms: 2, bathrooms: 2,   sqft: 1350, year_built: 2023, lat: 25.7589,  lng: -80.1916  },
    { id: "rent_GA", kind: "rental", type: "Apartment",    city: "Atlanta",       state: "GA", address: "1100 Peachtree St NE", description: "Midtown high-rise unit with floor-to-ceiling windows, concierge service, and rooftop infinity pool",    image_url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80", status: "active", price: 2100,  bedrooms: 2, bathrooms: 2,   sqft: 1050, year_built: 2021, lat: 33.7877,  lng: -84.3842  },
    { id: "rent_HI", kind: "rental", type: "Condo",        city: "Honolulu",      state: "HI", address: "1777 Ala Moana Blvd", description: "Oceanfront condo at Ala Moana with lanai, tropical breezes, and resort-style amenities",                image_url: "https://images.unsplash.com/photo-1567684014761-b65e2e59b9eb?w=800&q=80", status: "active", price: 3600,  bedrooms: 2, bathrooms: 2,   sqft: 1100, year_built: 2017, lat: 21.2969,  lng: -157.8383 },
    { id: "rent_ID", kind: "rental", type: "House",        city: "Boise",         state: "ID", address: "1820 Harrison Blvd",  description: "North End bungalow rental with fenced yard, two-car driveway, and short walk to Hyde Park restaurants",  image_url: "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80", status: "active", price: 1750,  bedrooms: 3, bathrooms: 2,   sqft: 1400, year_built: 2008, lat: 43.6274,  lng: -116.2119 },
    { id: "rent_IL", kind: "rental", type: "Apartment",    city: "Chicago",       state: "IL", address: "2000 N Clark St",     description: "Lincoln Park one-bedroom with in-unit laundry, updated kitchen, and steps to the lake front",          image_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80", status: "active", price: 2000,  bedrooms: 1, bathrooms: 1,   sqft: 750,  year_built: 2015, lat: 41.9148,  lng: -87.6361  },
    { id: "rent_IN", kind: "rental", type: "House",        city: "Indianapolis",  state: "IN", address: "1600 Broad Ripple Ave", description: "Broad Ripple bungalow with large covered porch, fenced yard, and two off-street parking spaces",        image_url: "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80", status: "active", price: 1350,  bedrooms: 3, bathrooms: 1.5, sqft: 1300, year_built: 2000, lat: 39.8684,  lng: -86.1411  },
    { id: "rent_IA", kind: "rental", type: "Apartment",    city: "Des Moines",    state: "IA", address: "811 Grand Ave",       description: "Modern apartment in East Village with open layout, stainless appliances, and building rooftop lounge",   image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80", status: "active", price: 1100,  bedrooms: 1, bathrooms: 1,   sqft: 700,  year_built: 2019, lat: 41.5900,  lng: -93.6180  },
    { id: "rent_KS", kind: "rental", type: "House",        city: "Wichita",       state: "KS", address: "1440 N Hydraulic St",  description: "Renovated Riverside bungalow with new appliances, washer/dryer hookups, and private yard",             image_url: "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80", status: "active", price: 1050,  bedrooms: 2, bathrooms: 1,   sqft: 1000, year_built: 1995, lat: 37.7000,  lng: -97.3350  },
    { id: "rent_KY", kind: "rental", type: "Apartment",    city: "Louisville",    state: "KY", address: "400 W Market St",     description: "NuLu district loft with polished concrete floors, exposed ductwork, and walkable to Porch restaurant row", image_url: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&q=80", status: "active", price: 1350,  bedrooms: 1, bathrooms: 1,   sqft: 800,  year_built: 2016, lat: 38.2573,  lng: -85.7567  },
    { id: "rent_LA", kind: "rental", type: "Apartment",    city: "New Orleans",   state: "LA", address: "800 Bourbon St",      description: "French Quarter apartment with wrought iron balcony, heart pine floors, and steps from world-class dining", image_url: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80", status: "active", price: 1600,  bedrooms: 2, bathrooms: 1,   sqft: 900,  year_built: 1910, lat: 29.9584,  lng: -90.0646  },
    { id: "rent_ME", kind: "rental", type: "Apartment",    city: "Portland",      state: "ME", address: "1 Commercial St",     description: "Old Port waterfront apartment with exposed brick, sea views, and walkable to ferry and restaurants",     image_url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80", status: "active", price: 1750,  bedrooms: 1, bathrooms: 1,   sqft: 680,  year_built: 2013, lat: 43.6567,  lng: -70.2492  },
    { id: "rent_MD", kind: "rental", type: "Condo",        city: "Baltimore",     state: "MD", address: "100 E Pratt St",      description: "Inner Harbor condo with floor-to-ceiling windows, gym, concierge, and stunning water views",            image_url: "https://images.unsplash.com/photo-1567684014761-b65e2e59b9eb?w=800&q=80", status: "active", price: 2050,  bedrooms: 2, bathrooms: 2,   sqft: 1100, year_built: 2020, lat: 39.2867,  lng: -76.6099  },
    { id: "rent_MA", kind: "rental", type: "Apartment",    city: "Boston",        state: "MA", address: "400 Newbury St",      description: "Back Bay one-bedroom steps from Copley Square with hardwood floors, built-ins, and exposed brick",      image_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80", status: "active", price: 3200,  bedrooms: 1, bathrooms: 1,   sqft: 650,  year_built: 1920, lat: 42.3512,  lng: -71.0837  },
    { id: "rent_MI", kind: "rental", type: "Apartment",    city: "Detroit",       state: "MI", address: "1515 Woodward Ave",   description: "Midtown studio with polished concrete floors, in-unit laundry, and rooftop views of Detroit's skyline",   image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80", status: "active", price: 1100,  bedrooms: 1, bathrooms: 1,   sqft: 620,  year_built: 2018, lat: 42.3473,  lng: -83.0558  },
    { id: "rent_MN", kind: "rental", type: "Apartment",    city: "Minneapolis",   state: "MN", address: "111 Nicollet Mall",   description: "Downtown one-bedroom with light rail access, heated underground parking, and fitness center",            image_url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80", status: "active", price: 1700,  bedrooms: 1, bathrooms: 1,   sqft: 750,  year_built: 2019, lat: 44.9800,  lng: -93.2700  },
    { id: "rent_MS", kind: "rental", type: "House",        city: "Jackson",       state: "MS", address: "1220 N State St",     description: "Belhaven bungalow with spacious yard, updated kitchen, and covered carport in a walkable neighborhood",   image_url: "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80", status: "active", price: 1000,  bedrooms: 2, bathrooms: 1,   sqft: 950,  year_built: 1958, lat: 32.3099,  lng: -90.1745  },
    { id: "rent_MO", kind: "rental", type: "Apartment",    city: "Kansas City",   state: "MO", address: "200 W 25th St",       description: "Crossroads Arts District loft with original brick, oversized windows, and walkable to galleries and bars",  image_url: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&q=80", status: "active", price: 1250,  bedrooms: 1, bathrooms: 1,   sqft: 780,  year_built: 2015, lat: 39.0830,  lng: -94.5870  },
    { id: "rent_MT", kind: "rental", type: "House",        city: "Bozeman",       state: "MT", address: "505 W Babcock St",    description: "Cozy Craftsman rental near MSU with fenced yard, ski storage room, and mountain bike trail access",      image_url: "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80", status: "active", price: 1900,  bedrooms: 3, bathrooms: 2,   sqft: 1350, year_built: 2006, lat: 45.6820,  lng: -111.0500 },
    { id: "rent_NE", kind: "rental", type: "Apartment",    city: "Omaha",         state: "NE", address: "1010 Howard St",      description: "Old Market apartment with industrial-chic style, exposed brick, and vibrant restaurant scene downstairs",  image_url: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80", status: "active", price: 1200,  bedrooms: 1, bathrooms: 1,   sqft: 700,  year_built: 2014, lat: 41.2581,  lng: -95.9380  },
    { id: "rent_NV", kind: "rental", type: "Condo",        city: "Las Vegas",     state: "NV", address: "3750 Las Vegas Blvd S", "description": "High-rise condo with Strip views, resort pool access, valet parking, and concierge services",          image_url: "https://images.unsplash.com/photo-1567684014761-b65e2e59b9eb?w=800&q=80", status: "active", price: 2400,  bedrooms: 2, bathrooms: 2,   sqft: 1100, year_built: 2022, lat: 36.1147,  lng: -115.1729 },
    { id: "rent_NH", kind: "rental", type: "Apartment",    city: "Manchester",    state: "NH", address: "100 Arms St",         description: "Millyard apartment with exposed timber beams, river views, and in-unit washer/dryer in a historic mill",  image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80", status: "active", price: 1700,  bedrooms: 2, bathrooms: 1,   sqft: 950,  year_built: 2011, lat: 42.9900,  lng: -71.4600  },
    { id: "rent_NJ", kind: "rental", type: "Apartment",    city: "Jersey City",   state: "NJ", address: "130 Bay St",          description: "Grove Street PATH apartment with Manhattan views, gym, rooftop, and concierge",                         image_url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80", status: "active", price: 2900,  bedrooms: 1, bathrooms: 1,   sqft: 750,  year_built: 2021, lat: 40.7178,  lng: -74.0431  },
    { id: "rent_NM", kind: "rental", type: "House",        city: "Albuquerque",   state: "NM", address: "2240 Rio Grande Blvd", "description": "Adobe-style rental in North Valley with courtyard, vigas, and stunning Sandia Mountain sunset views",   image_url: "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80", status: "active", price: 1450,  bedrooms: 2, bathrooms: 1,   sqft: 1050, year_built: 1970, lat: 35.1100,  lng: -106.6600 },
    { id: "rent_NY", kind: "rental", type: "Apartment",    city: "New York",      state: "NY", address: "100 Park Ave",        description: "Midtown apartment with hardwood floors, updated kitchen, and steps to Grand Central Terminal",           image_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80", status: "active", price: 2800,  bedrooms: 1, bathrooms: 1,   sqft: 650,  year_built: 2015, lat: 40.7527,  lng: -73.9772  },
    { id: "rent_NC", kind: "rental", type: "Apartment",    city: "Raleigh",       state: "NC", address: "400 Fayetteville St",  description: "Downtown Raleigh apartment with quartz counters, smart home features, and rooftop pool",                image_url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80", status: "active", price: 1700,  bedrooms: 2, bathrooms: 2,   sqft: 1050, year_built: 2020, lat: 35.7796,  lng: -78.6382  },
    { id: "rent_ND", kind: "rental", type: "Apartment",    city: "Fargo",         state: "ND", address: "112 Broadway N",      description: "Downtown apartment near NDSU with heated underground parking, in-unit laundry, and pet-friendly policy",  image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80", status: "active", price: 1150,  bedrooms: 1, bathrooms: 1,   sqft: 720,  year_built: 2016, lat: 46.8770,  lng: -96.7880  },
    { id: "rent_OH", kind: "rental", type: "Apartment",    city: "Columbus",      state: "OH", address: "700 N High St",       description: "Short North apartment with exposed brick, large windows, and walkable to galleries, bars, and restaurants", image_url: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80", status: "active", price: 1400,  bedrooms: 1, bathrooms: 1,   sqft: 750,  year_built: 2017, lat: 39.9745,  lng: -82.9988  },
    { id: "rent_OK", kind: "rental", type: "House",        city: "Oklahoma City", state: "OK", address: "1800 NW 23rd St",     description: "Charming Mesta Park bungalow with hardwood floors, updated kitchen, and fenced backyard",              image_url: "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80", status: "active", price: 1100,  bedrooms: 2, bathrooms: 1,   sqft: 1050, year_built: 1942, lat: 35.4950,  lng: -97.5200  },
    { id: "rent_OR", kind: "rental", type: "Apartment",    city: "Portland",      state: "OR", address: "1400 SW Morrison St",  description: "Pearl District apartment with modern finishes, bike storage, communal rooftop, and TriMet access",       image_url: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&q=80", status: "active", price: 1950,  bedrooms: 1, bathrooms: 1,   sqft: 750,  year_built: 2018, lat: 45.5196,  lng: -122.6843 },
    { id: "rent_PA", kind: "rental", type: "Apartment",    city: "Philadelphia",  state: "PA", address: "230 S Broad St",      description: "Avenue of the Arts apartment with soaring ceilings, original windows, and city skyline views",          image_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80", status: "active", price: 1850,  bedrooms: 2, bathrooms: 1,   sqft: 950,  year_built: 2012, lat: 39.9450,  lng: -75.1640  },
    { id: "rent_RI", kind: "rental", type: "Apartment",    city: "Providence",    state: "RI", address: "200 Westminster St",  description: "Downcity loft with polished concrete, floor-to-ceiling glass, and walkable to AS220 arts scene",         image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80", status: "active", price: 1650,  bedrooms: 1, bathrooms: 1,   sqft: 780,  year_built: 2015, lat: 41.8220,  lng: -71.4150  },
    { id: "rent_SC", kind: "rental", type: "Apartment",    city: "Charleston",    state: "SC", address: "40 N Market St",      description: "Historic district apartment with heart pine floors, tall ceilings, and private courtyard garden access",  image_url: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80", status: "active", price: 2100,  bedrooms: 2, bathrooms: 1,   sqft: 950,  year_built: 1890, lat: 32.7800,  lng: -79.9323  },
    { id: "rent_SD", kind: "rental", type: "House",        city: "Sioux Falls",   state: "SD", address: "1910 W 22nd St",      description: "Updated rental bungalow with fenced yard, attached garage, and close to Yankton Trail Park",            image_url: "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80", status: "active", price: 1200,  bedrooms: 3, bathrooms: 1.5, sqft: 1100, year_built: 1998, lat: 43.5350,  lng: -96.7450  },
    { id: "rent_TN", kind: "rental", type: "Apartment",    city: "Nashville",     state: "TN", address: "500 12th Ave S",      description: "Gulch apartment with quartz counters, smart locks, rooftop pool, and steps to honky-tonk row",          image_url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80", status: "active", price: 2000,  bedrooms: 1, bathrooms: 1,   sqft: 750,  year_built: 2021, lat: 36.1520,  lng: -86.7910  },
    { id: "rent_TX", kind: "rental", type: "House",        city: "Austin",        state: "TX", address: "222 Riverside Dr",    description: "Spacious ranch-style house with large backyard, mature trees, and close to Barton Springs Pool",        image_url: "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80", status: "active", price: 2200,  bedrooms: 3, bathrooms: 2,   sqft: 1400, year_built: 2017, lat: 30.3074,  lng: -97.7533  },
    { id: "rent_UT", kind: "rental", type: "Apartment",    city: "Salt Lake City",state: "UT", address: "111 S Main St",       description: "Downtown apartment near TRAX with mountain views, bike storage, rooftop lounge, and in-unit laundry",   image_url: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&q=80", status: "active", price: 1800,  bedrooms: 1, bathrooms: 1,   sqft: 760,  year_built: 2020, lat: 40.7600,  lng: -111.8950 },
    { id: "rent_VT", kind: "rental", type: "Apartment",    city: "Burlington",    state: "VT", address: "200 College St",      description: "Church Street apartment with hardwood floors, large windows, and steps to farmers market and waterfront", image_url: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80", status: "active", price: 1700,  bedrooms: 1, bathrooms: 1,   sqft: 680,  year_built: 2010, lat: 44.4780,  lng: -73.2140  },
    { id: "rent_VA", kind: "rental", type: "Apartment",    city: "Richmond",      state: "VA", address: "2300 Cary St",        description: "Carytown apartment with exposed brick, in-unit laundry, and walkable to indie shops and restaurants",    image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80", status: "active", price: 1800,  bedrooms: 1, bathrooms: 1,   sqft: 720,  year_built: 2014, lat: 37.5451,  lng: -77.4697  },
    { id: "rent_WA", kind: "rental", type: "Apartment",    city: "Seattle",       state: "WA", address: "400 Westlake Ave N",   description: "South Lake Union apartment with Puget Sound views, bike storage, dog-friendly, and steps to Amazon campus",image_url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80", status: "active", price: 2600,  bedrooms: 1, bathrooms: 1,   sqft: 750,  year_built: 2022, lat: 47.6282,  lng: -122.3380 },
    { id: "rent_WV", kind: "rental", type: "Apartment",    city: "Morgantown",    state: "WV", address: "300 High St",         description: "Downtown apartment near WVU with updated kitchen, covered parking, and easy access to the Monongalia Trail", image_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80", status: "active", price: 950,   bedrooms: 1, bathrooms: 1,   sqft: 620,  year_built: 2008, lat: 39.6313,  lng: -79.9553  },
    { id: "rent_WI", kind: "rental", type: "Apartment",    city: "Milwaukee",     state: "WI", address: "1000 N Water St",     description: "Historic Third Ward apartment with exposed brick, walk to lakefront, and building fitness center",        image_url: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&q=80", status: "active", price: 1350,  bedrooms: 1, bathrooms: 1,   sqft: 730,  year_built: 2013, lat: 43.0419,  lng: -87.9060  },
    { id: "rent_WY", kind: "rental", type: "House",        city: "Cheyenne",      state: "WY", address: "600 E 18th St",       description: "Single-family rental with two-car garage, fenced yard, and convenient access to I-25 and downtown",      image_url: "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80", status: "active", price: 1400,  bedrooms: 3, bathrooms: 2,   sqft: 1300, year_built: 2009, lat: 41.1450,  lng: -104.8100 },
  ];

  await db.collection("listings").insertMany(listings);
  
  console.log("Database seeded successfully!");
}

// Graceful shutdown
export async function closeMongoDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("MongoDB connection closed");
  }
}
