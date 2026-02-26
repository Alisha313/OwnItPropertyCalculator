# Own It Property Calculator

A modern real estate platform with AI-powered features for property valuation, market trends analysis, and interactive map views.

## Features

### Core Features
- **Property Listings** - Browse homes for sale and rentals
- **Mortgage Calculator** - Calculate monthly payments and affordability
- **User Authentication** - Sign up/login with subscription management
- **AI Chat Agent** - Get real estate guidance with 1-week free trial

### AI Real Estate Agent Features (New!)

The AI Real Estate Agent chat widget now includes three powerful AI capabilities:

#### 1. Property Value Estimate
Get AI-powered property valuation based on comparable properties.
- Uses rules-based algorithm with bedroom, bathroom, and age adjustments
- Compares against similar properties in the same city/state
- Shows confidence level based on number of comparables found

#### 2. Market Trend Summary
View historical price trends for any city.
- Quarterly price-per-sqft data from Q1 2023 to Q4 2025
- Interactive Chart.js visualization
- Growth statistics and trend analysis

#### 3. Map View for Listings
Explore listings on an interactive Leaflet map.
- Filter by For Sale, For Rent, or All listings
- Click markers to see property details and prices
- Navigate to full listing details

## Tech Stack

- **Frontend**: Vanilla JavaScript SPA
- **Backend**: Node.js / Express
- **Database**: SQLite (better-sqlite3)
- **Maps**: Leaflet.js
- **Charts**: Chart.js

## API Endpoints

### AI Endpoints

#### GET `/api/ai/valuation`
Get AI-powered property valuation.

**Query Parameters:**
- `listingId` (required) - ID of the listing to valuate

**Response:**
```json
{
  "listing": { "id": 1, "price": 599000, "city": "Edison", ... },
  "estimatedValue": 612500,
  "explanation": "Based on 3 comparable properties...",
  "compsUsed": 3,
  "adjustments": { "bedrooms": 5000, "bathrooms": 2500, "age": -1500 }
}
```

#### GET `/api/ai/market-trends`
Get market price trends for a city.

**Query Parameters:**
- `city` (required) - City name (e.g., "Edison")
- `state` (required) - State abbreviation (e.g., "NJ")

**Response:**
```json
{
  "city": "Edison",
  "state": "NJ",
  "series": [
    { "quarter": 1, "year": 2023, "pricePerSqft": 285 },
    ...
  ],
  "summary": {
    "earliestPrice": 285,
    "latestPrice": 342,
    "totalGrowthPercent": 20.0
  }
}
```

#### GET `/api/listings/map`
Get listings with coordinates for map display.

**Query Parameters:**
- `kind` (optional) - Filter by "sale" or "rental"

**Response:**
```json
[
  {
    "id": 1,
    "kind": "sale",
    "price": 599000,
    "city": "Edison",
    "state": "NJ",
    "lat": 40.5187,
    "lng": -74.4121,
    "bedrooms": 4,
    "bathrooms": 2.5,
    "square_feet": 2200
  },
  ...
]
```

## Database Schema

### New Tables

#### `market_trends`
Stores quarterly price-per-sqft data for market trend analysis.
- `id` - Primary key
- `city` - City name
- `state` - State abbreviation
- `quarter` - Quarter (1-4)
- `year` - Year (2023-2025)
- `price_per_sqft` - Average price per square foot

#### `listings` (Updated)
Added coordinate columns for map functionality:
- `lat` - Latitude coordinate
- `lng` - Longitude coordinate

## Getting Started

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Initialize database:
   ```bash
   sqlite3 backend/db/ownit.db < backend/db/schema.sql
   sqlite3 backend/db/ownit.db < backend/db/seed.sql
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open `http://localhost:3000` in your browser

## Available Cities for Market Trends

Market trend data is available for the following cities:
- New Jersey: Edison, Newark, Jersey City, Woodbridge, Trenton
- New York: New York City, Buffalo, Rochester
- Massachusetts: Boston, Cambridge
- Florida: Miami, Orlando, Tampa
- California: Los Angeles, San Francisco, San Diego
- Texas: Houston, Dallas, Austin
- And more...

## License

GPLv2 or later
