# Own It Property Calculator

A modern real estate platform with AI-powered features for property valuation, market trends analysis, and interactive map views.

## Features

### Core Features
- **Property Listings** - Browse homes for sale and rentals
- **Mortgage Calculator** - Calculate monthly payments and affordability
- **User Authentication** - Sign up/login with subscription management
- **AI Chat Agent** - Get real estate guidance with 1-week free trial
- **Tax & Affordability Calculations** - Calculate property taxes, insurance, HOA fees, and total monthly payments
- **Saved Calculations** - Save and reference your property calculation scenarios

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

### Calculations & Tax Endpoints

#### GET `/api/taxes/location`
Get tax rates for a specific location.

**Query Parameters:**
- `city` (required) - City name
- `state` (required) - State abbreviation

**Response:**
```json
{
  "id": 1,
  "state": "NJ",
  "city": "Edison",
  "property_tax_rate": 0.89,
  "sales_tax_rate": 0.07,
  "transfer_tax": 0.01
}
```

#### POST `/api/calculations`
Create a new property affordability calculation (requires authentication).

**Request Body:**
```json
{
  "listing_id": "1",
  "purchase_price": 599000,
  "down_payment": 120000,
  "interest_rate": 6.5,
  "loan_term_years": 30,
  "property_tax": 5330,
  "insurance": 1200,
  "hoa_fees": 0
}
```

**Response:**
```json
{
  "id": 5,
  "user_id": 2,
  "listing_id": "1",
  "purchase_price": 599000,
  "down_payment": 120000,
  "interest_rate": 6.5,
  "loan_term_years": 30,
  "property_tax": 5330,
  "insurance": 1200,
  "hoa_fees": 0,
  "total_monthly_payment": 3542.50
}
```

#### GET `/api/calculations/:id`
Get a specific calculation (requires authentication).

**Response:** Returns the calculation object with all details.

#### GET `/api/calculations`
List all calculations for the current user (requires authentication).

**Response:** Returns array of calculation objects.

#### POST `/api/calculations/:id/save`
Save a calculation to favorites (requires authentication).

**Request Body:**
```json
{
  "name": "My Ideal Home",
  "notes": "Primary residence option with 30-year mortgage"
}
```

**Response:**
```json
{
  "id": 3,
  "user_id": 2,
  "calculation_id": 5,
  "name": "My Ideal Home",
  "notes": "Primary residence option with 30-year mortgage",
  "saved_at": "2026-04-01T12:34:56Z"
}
```

#### GET `/api/calculations/saved`
Get all saved calculations for the current user (requires authentication).

**Response:** Returns array of saved calculation objects.

## Database Schema

### New Tables

#### `taxes`
Stores property tax rates and fees by location.
- `id` - Primary key
- `state` - State abbreviation
- `city` - City name
- `property_tax_rate` - Annual property tax as percentage
- `sales_tax_rate` - Sales tax rate
- `transfer_tax` - Transfer tax for property sales

#### `calculations`
Stores property affordability calculations.
- `id` - Primary key
- `user_id` - ID of the user (foreign key to users)
- `listing_id` - ID of the listing (foreign key to listings)
- `purchase_price` - Property purchase price
- `down_payment` - Down payment amount
- `interest_rate` - Mortgage interest rate
- `loan_term_years` - Loan term in years
- `property_tax` - Calculated annual property tax
- `insurance` - Annual insurance cost
- `hoa_fees` - Annual HOA fees
- `total_monthly_payment` - Total monthly mortgage payment including all costs

#### `saved_calculations`
Stores user's saved calculation scenarios.
- `id` - Primary key
- `user_id` - ID of the user (foreign key to users)
- `calculation_id` - ID of the calculation (foreign key to calculations)
- `name` - User-defined name for the calculation
- `notes` - Optional notes about the calculation
- `saved_at` - Timestamp when calculation was saved

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
