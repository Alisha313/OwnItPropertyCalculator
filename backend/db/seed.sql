-- Sales Listings
INSERT OR REPLACE INTO listings (id, kind, type, city, state, address, description, image_url, status, price, bedrooms, bathrooms, sqft, year_built) VALUES
('S-1001', 'sale', 'Single Family', 'Edison', 'NJ', '123 Oak Street', 'Beautiful colonial home with updated kitchen.', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', 'active', 699000, 4, 3, 2800, 1998),
('S-1002', 'sale', 'Townhouse', 'Jersey City', 'NJ', '456 Hudson Ave', 'Modern townhouse with NYC skyline views.', 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800', 'active', 540000, 2, 2, 1650, 2015),
('S-1003', 'sale', 'Condo', 'Hoboken', 'NJ', '789 Washington St', 'Luxury condo near PATH train.', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 'sold', 615000, 2, 2, 1200, 2018),
('S-1004', 'sale', 'Multi Family', 'Newark', 'NJ', '321 Broad St', 'Investment property with 3 units.', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800', 'active', 475000, 5, 3, 3200, 1965),
('S-1005', 'sale', 'Single Family', 'Manhattan', 'NY', '88 Park Ave', 'Stunning brownstone with garden.', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 'active', 2850000, 5, 4, 4200, 1920),
('S-1006', 'sale', 'Condo', 'Brooklyn', 'NY', '200 Williamsburg St', 'Industrial loft with exposed brick.', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', 'active', 1250000, 2, 2, 1800, 2010),
('S-1007', 'sale', 'Single Family', 'Boston', 'MA', '45 Beacon Hill Rd', 'Historic home near Boston Common.', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 'active', 1650000, 4, 3, 3100, 1890),
('S-1008', 'sale', 'Townhouse', 'Cambridge', 'MA', '78 Harvard Square', 'Charming townhouse near Harvard.', 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800', 'active', 1150000, 3, 2, 2200, 1945),
('S-1009', 'sale', 'Single Family', 'Hartford', 'CT', '555 Farmington Ave', 'Colonial revival with porch.', 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800', 'active', 485000, 4, 3, 2600, 1952),
('S-1010', 'sale', 'Condo', 'Philadelphia', 'PA', '1500 Walnut St', 'High-rise condo with city views.', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', 'active', 520000, 2, 2, 1400, 2008),
('S-1011', 'sale', 'Single Family', 'Miami', 'FL', '100 Ocean Drive', 'Waterfront estate with pool.', 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800', 'active', 1850000, 5, 5, 4500, 2005),
('S-1012', 'sale', 'Condo', 'Orlando', 'FL', '250 International Dr', 'Resort-style living near parks.', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 'active', 385000, 3, 2, 1600, 2019),
('S-1013', 'sale', 'Single Family', 'Tampa', 'FL', '789 Bay Shore Blvd', 'Mediterranean home with pool.', 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', 'active', 725000, 4, 3, 2900, 2001),
('S-1014', 'sale', 'Townhouse', 'Jacksonville', 'FL', '456 Beach Blvd', 'Beachside townhouse with terrace.', 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800', 'active', 445000, 3, 2, 1800, 2017),
('S-1015', 'sale', 'Single Family', 'Atlanta', 'GA', '200 Peachtree St', 'Buckhead luxury home.', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800', 'active', 895000, 5, 4, 4100, 2012),
('S-1016', 'sale', 'Condo', 'Savannah', 'GA', '50 Bull St', 'Historic district condo.', 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=800', 'active', 425000, 2, 2, 1300, 1885),
('S-1017', 'sale', 'Single Family', 'Charlotte', 'NC', '300 Queens Rd', 'Myers Park estate with pool.', 'https://images.unsplash.com/photo-1600563438938-a9a27216b4f5?w=800', 'active', 1250000, 6, 5, 5200, 1995),
('S-1018', 'sale', 'Townhouse', 'Raleigh', 'NC', '125 Glenwood Ave', 'Downtown townhouse with deck.', 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800', 'active', 475000, 3, 3, 2100, 2020),
('S-1019', 'sale', 'Single Family', 'Charleston', 'SC', '88 Meeting St', 'Historic Charleston single.', 'https://images.unsplash.com/photo-1599427303058-f04cbcf4756f?w=800', 'active', 1100000, 4, 3, 2800, 1840),
('S-1020', 'sale', 'Condo', 'Nashville', 'TN', '500 Broadway', 'Downtown high-rise with views.', 'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=800', 'active', 565000, 2, 2, 1350, 2021),
('S-1021', 'sale', 'Single Family', 'Chicago', 'IL', '1000 Lake Shore Dr', 'Lincoln Park greystone.', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 'active', 1450000, 5, 4, 3800, 1910),
('S-1022', 'sale', 'Condo', 'Chicago', 'IL', '401 N Wabash', 'Magnificent Mile condo.', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800', 'active', 680000, 2, 2, 1500, 2015),
('S-1023', 'sale', 'Single Family', 'Detroit', 'MI', '250 Boston Blvd', 'Renovated mansion.', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 'active', 385000, 5, 4, 4200, 1918),
('S-1024', 'sale', 'Townhouse', 'Ann Arbor', 'MI', '100 State St', 'Modern townhouse near U of M.', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800', 'active', 425000, 3, 2, 1800, 2018),
('S-1025', 'sale', 'Single Family', 'Minneapolis', 'MN', '500 Lake Harriet', 'Lakefront home with dock.', 'https://images.unsplash.com/photo-1600047509782-20d39509f26d?w=800', 'active', 895000, 4, 3, 3200, 1955),
('S-1026', 'sale', 'Single Family', 'Milwaukee', 'WI', '200 Brady St', 'Victorian in East Side.', 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800', 'active', 365000, 4, 2, 2400, 1905),
('S-1027', 'sale', 'Single Family', 'Columbus', 'OH', '150 German Village', 'Brick townhome with garden.', 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800', 'active', 445000, 3, 2, 2000, 1890),
('S-1028', 'sale', 'Condo', 'Cleveland', 'OH', '1200 Euclid Ave', 'Playhouse Square condo.', 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800', 'active', 285000, 2, 1, 1100, 2005),
('S-1029', 'sale', 'Single Family', 'Indianapolis', 'IN', '400 Meridian St', 'Meridian-Kessler bungalow.', 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800', 'active', 345000, 3, 2, 1850, 1935),
('S-1030', 'sale', 'Single Family', 'Kansas City', 'MO', '300 Ward Pkwy', 'Country Club Plaza home.', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800', 'active', 625000, 4, 3, 3100, 1948),
('S-1031', 'sale', 'Single Family', 'Phoenix', 'AZ', '5000 E Camelback', 'Desert modern with views.', 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800', 'active', 1150000, 4, 4, 3800, 2019),
('S-1032', 'sale', 'Condo', 'Scottsdale', 'AZ', '7500 E Doubletree', 'Golf course condo.', 'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=800', 'active', 485000, 2, 2, 1600, 2016),
('S-1033', 'sale', 'Single Family', 'Tucson', 'AZ', '200 N Campbell Ave', 'Spanish colonial with courtyard.', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 'active', 525000, 3, 2, 2200, 1975),
('S-1034', 'sale', 'Single Family', 'Albuquerque', 'NM', '400 Rio Grande Blvd', 'Adobe home with kiva.', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800', 'active', 465000, 3, 2, 2100, 1985),
('S-1035', 'sale', 'Single Family', 'Santa Fe', 'NM', '100 Canyon Rd', 'Authentic Santa Fe adobe.', 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800', 'active', 785000, 3, 2, 2400, 1940),
('S-1036', 'sale', 'Single Family', 'Austin', 'TX', '1500 S Congress Ave', 'Modern farmhouse.', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 'active', 975000, 4, 3, 2800, 2018),
('S-1037', 'sale', 'Townhouse', 'Dallas', 'TX', '3000 McKinney Ave', 'Uptown townhouse.', 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800', 'active', 625000, 3, 3, 2400, 2021),
('S-1038', 'sale', 'Single Family', 'Houston', 'TX', '2500 River Oaks', 'River Oaks estate with pool.', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800', 'active', 1650000, 5, 5, 5500, 2008),
('S-1039', 'sale', 'Condo', 'San Antonio', 'TX', '200 E Houston St', 'River Walk condo.', 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=800', 'active', 385000, 2, 2, 1300, 2014),
('S-1040', 'sale', 'Single Family', 'Las Vegas', 'NV', '8000 S Las Vegas Blvd', 'Custom home with Strip views.', 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800', 'active', 875000, 4, 4, 3600, 2017),
('S-1041', 'sale', 'Single Family', 'Los Angeles', 'CA', '1000 Sunset Blvd', 'Hollywood Hills modern.', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', 'active', 2450000, 4, 4, 3500, 2015),
('S-1042', 'sale', 'Condo', 'San Francisco', 'CA', '500 Mission St', 'SOMA high-rise with bay views.', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', 'active', 1350000, 2, 2, 1400, 2019),
('S-1043', 'sale', 'Single Family', 'San Diego', 'CA', '800 La Jolla Shores', 'Beachfront home.', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 'active', 3200000, 5, 5, 4800, 2010),
('S-1044', 'sale', 'Townhouse', 'Oakland', 'CA', '200 Lake Merritt', 'Modern townhouse with lake views.', 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800', 'active', 895000, 3, 2, 2000, 2017),
('S-1045', 'sale', 'Single Family', 'Seattle', 'WA', '300 Queen Anne Ave', 'Victorian with Space Needle views.', 'https://images.unsplash.com/photo-1600047509782-20d39509f26d?w=800', 'active', 1150000, 4, 3, 2800, 1908),
('S-1046', 'sale', 'Condo', 'Portland', 'OR', '1000 Pearl District', 'Pearl District loft.', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 'active', 545000, 2, 2, 1350, 2012),
('S-1047', 'sale', 'Single Family', 'Denver', 'CO', '500 Cherry Creek', 'Contemporary with mountain views.', 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800', 'active', 1250000, 4, 4, 3400, 2020),
('S-1048', 'sale', 'Townhouse', 'Boulder', 'CO', '200 Pearl St', 'Downtown townhouse near hiking.', 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800', 'active', 785000, 3, 2, 2100, 2019),
('S-1049', 'sale', 'Single Family', 'Salt Lake City', 'UT', '400 E South Temple', 'Historic Avenues home.', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800', 'active', 625000, 4, 3, 2600, 1925),
('S-1050', 'sale', 'Single Family', 'Honolulu', 'HI', '100 Diamond Head Rd', 'Diamond Head oceanfront.', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 'active', 4500000, 5, 5, 4200, 1995),
('S-1051', 'sale', 'Single Family', 'Anchorage', 'AK', '200 Northern Lights', 'Mountain view home.', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 'active', 485000, 4, 3, 2800, 2005),
('S-1052', 'sale', 'Single Family', 'Boise', 'ID', '300 Harrison Blvd', 'North End craftsman.', 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800', 'active', 525000, 4, 2, 2400, 1948),
('S-1053', 'sale', 'Single Family', 'Billings', 'MT', '150 Rimrock Rd', 'Contemporary with river views.', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800', 'active', 425000, 4, 3, 2600, 2010),
('S-1054', 'sale', 'Single Family', 'Cheyenne', 'WY', '400 Capitol Ave', 'Historic Victorian.', 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=800', 'active', 345000, 4, 2, 2200, 1895),
('S-1055', 'sale', 'Single Family', 'Sioux Falls', 'SD', '200 Phillips Ave', 'Downtown loft conversion.', 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800', 'active', 295000, 3, 2, 1800, 2018),
('S-1056', 'sale', 'Single Family', 'Fargo', 'ND', '100 Broadway', 'Renovated craftsman.', 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800', 'active', 275000, 3, 2, 1600, 1935),
('S-1057', 'sale', 'Single Family', 'Omaha', 'NE', '500 Dodge St', 'Dundee neighborhood Tudor.', 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800', 'active', 385000, 4, 2, 2400, 1928),
('S-1058', 'sale', 'Single Family', 'Des Moines', 'IA', '300 Grand Ave', 'East Village townhouse.', 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800', 'active', 325000, 3, 2, 1900, 2019),
('S-1059', 'sale', 'Single Family', 'Little Rock', 'AR', '200 Riverfront Dr', 'River Market condo.', 'https://images.unsplash.com/photo-1600047509782-20d39509f26d?w=800', 'active', 285000, 2, 2, 1400, 2015),
('S-1060', 'sale', 'Single Family', 'Oklahoma City', 'OK', '400 Classen Blvd', 'Heritage Hills home.', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 'active', 445000, 4, 3, 2800, 1925);

-- Rental Listings
INSERT OR REPLACE INTO listings (id, kind, type, city, state, address, description, image_url, status, price, bedrooms, bathrooms, sqft, year_built) VALUES
('R-2001', 'rental', 'Apartment', 'Edison', 'NJ', '200 Main St', 'Modern apartment with updated appliances.', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'active', 2600, 2, 2, 1100, 2015),
('R-2002', 'rental', 'Condo', 'Hoboken', 'NJ', '100 River St', 'Waterfront condo with NYC views.', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 'active', 3400, 1, 1, 850, 2018),
('R-2003', 'rental', 'Single Family', 'Jersey City', 'NJ', '450 Grove St', 'Charming home with backyard.', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', 'sold', 4200, 3, 2, 1800, 1985),
('R-2004', 'rental', 'Apartment', 'Newark', 'NJ', '50 Market St', 'Downtown apartment near Penn Station.', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 'active', 2100, 1, 1, 700, 2010),
('R-2005', 'rental', 'Apartment', 'Manhattan', 'NY', '200 W 72nd St', 'Upper West Side near Central Park.', 'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=800', 'active', 4800, 2, 1, 950, 1960),
('R-2006', 'rental', 'Loft', 'Brooklyn', 'NY', '100 Kent Ave', 'Williamsburg loft with exposed brick.', 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800', 'active', 4200, 1, 1, 1000, 2012),
('R-2007', 'rental', 'Apartment', 'Boston', 'MA', '50 Newbury St', 'Back Bay apartment on Newbury.', 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800', 'active', 3800, 2, 1, 1050, 1920),
('R-2008', 'rental', 'Apartment', 'Cambridge', 'MA', '200 Mass Ave', 'Near Harvard Square.', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800', 'active', 3200, 1, 1, 750, 1965),
('R-2009', 'rental', 'Townhouse', 'Philadelphia', 'PA', '300 South St', 'Society Hill townhouse.', 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800', 'active', 3500, 3, 2, 1600, 1850),
('R-2010', 'rental', 'Apartment', 'Pittsburgh', 'PA', '100 Liberty Ave', 'Downtown apartment with river views.', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'active', 1800, 1, 1, 700, 2008),
('R-2011', 'rental', 'Apartment', 'Miami', 'FL', '500 Brickell Ave', 'Luxury Brickell apartment.', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', 'active', 4500, 2, 2, 1300, 2020),
('R-2012', 'rental', 'Condo', 'Orlando', 'FL', '100 Lake Eola Dr', 'Downtown condo overlooking Lake Eola.', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 'active', 2400, 2, 2, 1100, 2017),
('R-2013', 'rental', 'Single Family', 'Tampa', 'FL', '200 Bayshore Blvd', 'South Tampa home with pool.', 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', 'active', 4800, 4, 3, 2600, 2000),
('R-2014', 'rental', 'Apartment', 'Jacksonville', 'FL', '50 Riverside Ave', 'Riverside apartment.', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'active', 1900, 2, 1, 950, 2015),
('R-2015', 'rental', 'Apartment', 'Atlanta', 'GA', '1000 Peachtree St', 'Midtown high-rise with skyline views.', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 'active', 2800, 2, 2, 1200, 2019),
('R-2016', 'rental', 'Apartment', 'Savannah', 'GA', '100 Forsyth Park', 'Forsyth Park apartment.', 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800', 'active', 2200, 1, 1, 800, 1890),
('R-2017', 'rental', 'Townhouse', 'Charlotte', 'NC', '500 S Tryon St', 'Uptown townhouse with rooftop.', 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800', 'active', 3200, 2, 2, 1400, 2021),
('R-2018', 'rental', 'Apartment', 'Raleigh', 'NC', '200 Fayetteville St', 'Downtown apartment.', 'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=800', 'active', 2100, 1, 1, 750, 2018),
('R-2019', 'rental', 'Single Family', 'Charleston', 'SC', '50 Broad St', 'Downtown Charleston home.', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', 'active', 4500, 3, 2, 2000, 1870),
('R-2020', 'rental', 'Apartment', 'Nashville', 'TN', '300 Broadway', 'Downtown Music City apartment.', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'active', 2900, 2, 2, 1100, 2020),
('R-2021', 'rental', 'Apartment', 'Chicago', 'IL', '500 N Michigan', 'Magnificent Mile apartment.', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', 'active', 3600, 2, 2, 1200, 2010),
('R-2022', 'rental', 'Loft', 'Chicago', 'IL', '200 W Kinzie', 'River North loft.', 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800', 'active', 2800, 1, 1, 1100, 2005),
('R-2023', 'rental', 'Apartment', 'Detroit', 'MI', '100 Woodward Ave', 'Downtown Detroit apartment.', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'active', 1600, 1, 1, 800, 2018),
('R-2024', 'rental', 'Apartment', 'Ann Arbor', 'MI', '300 State St', 'Near U of Michigan.', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 'active', 2200, 2, 1, 950, 2015),
('R-2025', 'rental', 'Apartment', 'Minneapolis', 'MN', '100 Hennepin Ave', 'Downtown near Target Field.', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 'active', 2400, 2, 2, 1100, 2019),
('R-2026', 'rental', 'Single Family', 'Milwaukee', 'WI', '400 N Water St', 'Third Ward townhouse.', 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800', 'active', 2600, 3, 2, 1800, 2016),
('R-2027', 'rental', 'Apartment', 'Columbus', 'OH', '200 N High St', 'Short North apartment.', 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800', 'active', 1900, 2, 1, 900, 2017),
('R-2028', 'rental', 'Apartment', 'Cleveland', 'OH', '100 Public Square', 'Downtown apartment.', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800', 'active', 1500, 1, 1, 750, 2012),
('R-2029', 'rental', 'Apartment', 'Indianapolis', 'IN', '300 Mass Ave', 'Mass Ave apartment.', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'active', 1700, 2, 1, 950, 2020),
('R-2030', 'rental', 'Apartment', 'Kansas City', 'MO', '200 Main St', 'Power and Light district.', 'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=800', 'active', 1800, 1, 1, 800, 2018),
('R-2031', 'rental', 'Apartment', 'Phoenix', 'AZ', '2000 E Camelback', 'Biltmore area apartment.', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', 'active', 2200, 2, 2, 1100, 2018),
('R-2032', 'rental', 'Condo', 'Scottsdale', 'AZ', '7000 E Indian School', 'Old Town Scottsdale condo.', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 'active', 2800, 2, 2, 1200, 2015),
('R-2033', 'rental', 'Single Family', 'Tucson', 'AZ', '100 N Campbell Ave', 'Near University of Arizona.', 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', 'active', 2400, 3, 2, 1800, 1985),
('R-2034', 'rental', 'Apartment', 'Albuquerque', 'NM', '200 Central Ave', 'Downtown near Route 66.', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'active', 1400, 1, 1, 700, 2010),
('R-2035', 'rental', 'Casita', 'Santa Fe', 'NM', '300 Canyon Rd', 'Adobe casita with kiva fireplace.', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', 'active', 2200, 1, 1, 650, 1960),
('R-2036', 'rental', 'Apartment', 'Austin', 'TX', '1000 S Congress', 'SoCo apartment.', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 'active', 2800, 2, 1, 950, 2019),
('R-2037', 'rental', 'Apartment', 'Dallas', 'TX', '2000 McKinney Ave', 'Uptown apartment.', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', 'active', 2600, 1, 1, 850, 2021),
('R-2038', 'rental', 'Townhouse', 'Houston', 'TX', '1500 Montrose Blvd', 'Montrose townhouse.', 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800', 'active', 3200, 3, 2, 1900, 2017),
('R-2039', 'rental', 'Apartment', 'San Antonio', 'TX', '100 E Houston St', 'River Walk apartment.', 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800', 'active', 1800, 1, 1, 750, 2016),
('R-2040', 'rental', 'Apartment', 'Las Vegas', 'NV', '3000 Las Vegas Blvd', 'High-rise with Strip views.', 'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=800', 'active', 2400, 2, 2, 1100, 2020),
('R-2041', 'rental', 'Apartment', 'Los Angeles', 'CA', '500 Hollywood Blvd', 'Hollywood apartment.', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', 'active', 3200, 1, 1, 800, 2015),
('R-2042', 'rental', 'Apartment', 'San Francisco', 'CA', '200 Market St', 'SOMA apartment.', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 'active', 4200, 1, 1, 750, 2018),
('R-2043', 'rental', 'Condo', 'San Diego', 'CA', '500 Harbor Dr', 'Gaslamp Quarter condo.', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 'active', 3500, 2, 2, 1200, 2019),
('R-2044', 'rental', 'Apartment', 'Oakland', 'CA', '100 Broadway', 'Jack London Square apartment.', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'active', 2800, 2, 1, 1000, 2016),
('R-2045', 'rental', 'Apartment', 'Seattle', 'WA', '200 Pike St', 'Pike Place apartment.', 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800', 'active', 3200, 1, 1, 800, 2017),
('R-2046', 'rental', 'Loft', 'Portland', 'OR', '500 NW 23rd Ave', 'Pearl District loft.', 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800', 'active', 2400, 1, 1, 950, 2014),
('R-2047', 'rental', 'Apartment', 'Denver', 'CO', '1000 16th St', 'LoDo apartment.', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800', 'active', 2600, 2, 1, 1050, 2020),
('R-2048', 'rental', 'Condo', 'Boulder', 'CO', '100 Pearl St', 'Downtown Boulder condo.', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 'active', 2800, 2, 2, 1100, 2018),
('R-2049', 'rental', 'Apartment', 'Salt Lake City', 'UT', '200 S State St', 'Downtown apartment.', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'active', 1800, 1, 1, 750, 2019),
('R-2050', 'rental', 'Condo', 'Honolulu', 'HI', '500 Ala Moana', 'Waikiki condo with ocean views.', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', 'active', 3800, 2, 2, 1100, 2016),
('R-2051', 'rental', 'Apartment', 'Anchorage', 'AK', '100 W 5th Ave', 'Downtown with mountain views.', 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800', 'active', 1800, 2, 1, 900, 2012),
('R-2052', 'rental', 'Single Family', 'Boise', 'ID', '200 N 8th St', 'Downtown Boise home.', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', 'active', 2400, 3, 2, 1600, 2000),
('R-2053', 'rental', 'Apartment', 'Billings', 'MT', '100 N Broadway', 'Downtown apartment.', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'active', 1400, 2, 1, 850, 2015),
('R-2054', 'rental', 'Apartment', 'Cheyenne', 'WY', '200 W Lincolnway', 'Historic downtown apartment.', 'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=800', 'active', 1200, 1, 1, 700, 2008),
('R-2055', 'rental', 'Apartment', 'Sioux Falls', 'SD', '100 S Phillips Ave', 'Downtown near Falls Park.', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 'active', 1300, 2, 1, 900, 2017),
('R-2056', 'rental', 'Apartment', 'Fargo', 'ND', '200 Broadway', 'Downtown Fargo apartment.', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800', 'active', 1100, 1, 1, 650, 2014),
('R-2057', 'rental', 'Townhouse', 'Omaha', 'NE', '300 Harney St', 'Old Market townhouse.', 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800', 'active', 2000, 2, 2, 1300, 2019),
('R-2058', 'rental', 'Apartment', 'Des Moines', 'IA', '100 Court Ave', 'East Village apartment.', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'active', 1500, 1, 1, 750, 2020),
('R-2059', 'rental', 'Apartment', 'Little Rock', 'AR', '100 Main St', 'River Market apartment.', 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800', 'active', 1400, 2, 1, 900, 2016),
('R-2060', 'rental', 'Apartment', 'Oklahoma City', 'OK', '200 E Sheridan', 'Bricktown apartment.', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 'active', 1600, 2, 2, 1000, 2018);

-- Subscription Plans
INSERT OR REPLACE INTO subscription_plans (id, name, billing_cycle, price, features) VALUES
(1, 'Basic Monthly', 'monthly', 9.99, '["Browse all listings","30-day free trial","Talk to real estate agent","No payment until trial ends","Email reminders before trial expires"]'),
(2, 'Basic Annual', 'annually', 89.99, '["Browse all listings","30-day free trial","Talk to real estate agent","No payment until trial ends","Email reminders before trial expires","Save $30/year"]');

-- Update listings with lat/lng coordinates (approximate city centers)
UPDATE listings SET lat = 40.5187, lng = -74.4121 WHERE city = 'Edison';
UPDATE listings SET lat = 40.7178, lng = -74.0431 WHERE city = 'Jersey City';
UPDATE listings SET lat = 40.7440, lng = -74.0324 WHERE city = 'Hoboken';
UPDATE listings SET lat = 40.7357, lng = -74.1724 WHERE city = 'Newark';
UPDATE listings SET lat = 40.7831, lng = -73.9712 WHERE city = 'Manhattan';
UPDATE listings SET lat = 40.6782, lng = -73.9442 WHERE city = 'Brooklyn';
UPDATE listings SET lat = 42.3601, lng = -71.0589 WHERE city = 'Boston';
UPDATE listings SET lat = 42.3736, lng = -71.1097 WHERE city = 'Cambridge';
UPDATE listings SET lat = 41.7658, lng = -72.6734 WHERE city = 'Hartford';
UPDATE listings SET lat = 39.9526, lng = -75.1652 WHERE city = 'Philadelphia';
UPDATE listings SET lat = 40.4406, lng = -79.9959 WHERE city = 'Pittsburgh';
UPDATE listings SET lat = 25.7617, lng = -80.1918 WHERE city = 'Miami';
UPDATE listings SET lat = 28.5383, lng = -81.3792 WHERE city = 'Orlando';
UPDATE listings SET lat = 27.9506, lng = -82.4572 WHERE city = 'Tampa';
UPDATE listings SET lat = 30.3322, lng = -81.6557 WHERE city = 'Jacksonville';
UPDATE listings SET lat = 33.7490, lng = -84.3880 WHERE city = 'Atlanta';
UPDATE listings SET lat = 32.0809, lng = -81.0912 WHERE city = 'Savannah';
UPDATE listings SET lat = 35.2271, lng = -80.8431 WHERE city = 'Charlotte';
UPDATE listings SET lat = 35.7796, lng = -78.6382 WHERE city = 'Raleigh';
UPDATE listings SET lat = 32.7765, lng = -79.9311 WHERE city = 'Charleston';
UPDATE listings SET lat = 36.1627, lng = -86.7816 WHERE city = 'Nashville';
UPDATE listings SET lat = 41.8781, lng = -87.6298 WHERE city = 'Chicago';
UPDATE listings SET lat = 42.3314, lng = -83.0458 WHERE city = 'Detroit';
UPDATE listings SET lat = 42.2808, lng = -83.7430 WHERE city = 'Ann Arbor';
UPDATE listings SET lat = 44.9778, lng = -93.2650 WHERE city = 'Minneapolis';
UPDATE listings SET lat = 43.0389, lng = -87.9065 WHERE city = 'Milwaukee';
UPDATE listings SET lat = 39.9612, lng = -82.9988 WHERE city = 'Columbus';
UPDATE listings SET lat = 41.4993, lng = -81.6944 WHERE city = 'Cleveland';
UPDATE listings SET lat = 39.7684, lng = -86.1581 WHERE city = 'Indianapolis';
UPDATE listings SET lat = 39.0997, lng = -94.5786 WHERE city = 'Kansas City';
UPDATE listings SET lat = 33.4484, lng = -112.0740 WHERE city = 'Phoenix';
UPDATE listings SET lat = 33.4942, lng = -111.9261 WHERE city = 'Scottsdale';
UPDATE listings SET lat = 32.2226, lng = -110.9747 WHERE city = 'Tucson';
UPDATE listings SET lat = 35.0844, lng = -106.6504 WHERE city = 'Albuquerque';
UPDATE listings SET lat = 35.6870, lng = -105.9378 WHERE city = 'Santa Fe';
UPDATE listings SET lat = 30.2672, lng = -97.7431 WHERE city = 'Austin';
UPDATE listings SET lat = 32.7767, lng = -96.7970 WHERE city = 'Dallas';
UPDATE listings SET lat = 29.7604, lng = -95.3698 WHERE city = 'Houston';
UPDATE listings SET lat = 29.4241, lng = -98.4936 WHERE city = 'San Antonio';
UPDATE listings SET lat = 36.1699, lng = -115.1398 WHERE city = 'Las Vegas';
UPDATE listings SET lat = 34.0522, lng = -118.2437 WHERE city = 'Los Angeles';
UPDATE listings SET lat = 37.7749, lng = -122.4194 WHERE city = 'San Francisco';
UPDATE listings SET lat = 32.7157, lng = -117.1611 WHERE city = 'San Diego';
UPDATE listings SET lat = 37.8044, lng = -122.2712 WHERE city = 'Oakland';
UPDATE listings SET lat = 47.6062, lng = -122.3321 WHERE city = 'Seattle';
UPDATE listings SET lat = 45.5051, lng = -122.6750 WHERE city = 'Portland';
UPDATE listings SET lat = 39.7392, lng = -104.9903 WHERE city = 'Denver';
UPDATE listings SET lat = 40.0150, lng = -105.2705 WHERE city = 'Boulder';
UPDATE listings SET lat = 40.7608, lng = -111.8910 WHERE city = 'Salt Lake City';
UPDATE listings SET lat = 21.3069, lng = -157.8583 WHERE city = 'Honolulu';
UPDATE listings SET lat = 61.2181, lng = -149.9003 WHERE city = 'Anchorage';
UPDATE listings SET lat = 43.6150, lng = -116.2023 WHERE city = 'Boise';
UPDATE listings SET lat = 45.7833, lng = -108.5007 WHERE city = 'Billings';
UPDATE listings SET lat = 41.1400, lng = -104.8202 WHERE city = 'Cheyenne';
UPDATE listings SET lat = 43.5460, lng = -96.7313 WHERE city = 'Sioux Falls';
UPDATE listings SET lat = 46.8772, lng = -96.7898 WHERE city = 'Fargo';
UPDATE listings SET lat = 41.2565, lng = -95.9345 WHERE city = 'Omaha';
UPDATE listings SET lat = 41.5868, lng = -93.6250 WHERE city = 'Des Moines';
UPDATE listings SET lat = 34.7465, lng = -92.2896 WHERE city = 'Little Rock';
UPDATE listings SET lat = 35.4676, lng = -97.5164 WHERE city = 'Oklahoma City';

-- Market Trends (mock historical data by quarter for 2023-2025)
-- NJ Cities
INSERT INTO market_trends (city, state, quarter, year, price_per_sqft) VALUES
('Edison', 'NJ', 1, 2023, 245), ('Edison', 'NJ', 2, 2023, 252), ('Edison', 'NJ', 3, 2023, 258), ('Edison', 'NJ', 4, 2023, 262),
('Edison', 'NJ', 1, 2024, 268), ('Edison', 'NJ', 2, 2024, 275), ('Edison', 'NJ', 3, 2024, 280), ('Edison', 'NJ', 4, 2024, 285),
('Edison', 'NJ', 1, 2025, 290), ('Edison', 'NJ', 2, 2025, 295), ('Edison', 'NJ', 3, 2025, 302), ('Edison', 'NJ', 4, 2025, 308),
('Jersey City', 'NJ', 1, 2023, 380), ('Jersey City', 'NJ', 2, 2023, 392), ('Jersey City', 'NJ', 3, 2023, 405), ('Jersey City', 'NJ', 4, 2023, 415),
('Jersey City', 'NJ', 1, 2024, 425), ('Jersey City', 'NJ', 2, 2024, 438), ('Jersey City', 'NJ', 3, 2024, 450), ('Jersey City', 'NJ', 4, 2024, 460),
('Jersey City', 'NJ', 1, 2025, 470), ('Jersey City', 'NJ', 2, 2025, 482), ('Jersey City', 'NJ', 3, 2025, 495), ('Jersey City', 'NJ', 4, 2025, 505),
('Hoboken', 'NJ', 1, 2023, 520), ('Hoboken', 'NJ', 2, 2023, 535), ('Hoboken', 'NJ', 3, 2023, 548), ('Hoboken', 'NJ', 4, 2023, 560),
('Hoboken', 'NJ', 1, 2024, 575), ('Hoboken', 'NJ', 2, 2024, 588), ('Hoboken', 'NJ', 3, 2024, 600), ('Hoboken', 'NJ', 4, 2024, 612),
('Hoboken', 'NJ', 1, 2025, 625), ('Hoboken', 'NJ', 2, 2025, 640), ('Hoboken', 'NJ', 3, 2025, 655), ('Hoboken', 'NJ', 4, 2025, 668),
('Newark', 'NJ', 1, 2023, 145), ('Newark', 'NJ', 2, 2023, 148), ('Newark', 'NJ', 3, 2023, 152), ('Newark', 'NJ', 4, 2023, 155),
('Newark', 'NJ', 1, 2024, 158), ('Newark', 'NJ', 2, 2024, 162), ('Newark', 'NJ', 3, 2024, 165), ('Newark', 'NJ', 4, 2024, 168),
('Newark', 'NJ', 1, 2025, 172), ('Newark', 'NJ', 2, 2025, 175), ('Newark', 'NJ', 3, 2025, 178), ('Newark', 'NJ', 4, 2025, 182),
-- NY Cities
('Manhattan', 'NY', 1, 2023, 1450), ('Manhattan', 'NY', 2, 2023, 1480), ('Manhattan', 'NY', 3, 2023, 1520), ('Manhattan', 'NY', 4, 2023, 1550),
('Manhattan', 'NY', 1, 2024, 1580), ('Manhattan', 'NY', 2, 2024, 1620), ('Manhattan', 'NY', 3, 2024, 1660), ('Manhattan', 'NY', 4, 2024, 1700),
('Manhattan', 'NY', 1, 2025, 1740), ('Manhattan', 'NY', 2, 2025, 1780), ('Manhattan', 'NY', 3, 2025, 1820), ('Manhattan', 'NY', 4, 2025, 1860),
('Brooklyn', 'NY', 1, 2023, 680), ('Brooklyn', 'NY', 2, 2023, 695), ('Brooklyn', 'NY', 3, 2023, 712), ('Brooklyn', 'NY', 4, 2023, 728),
('Brooklyn', 'NY', 1, 2024, 745), ('Brooklyn', 'NY', 2, 2024, 762), ('Brooklyn', 'NY', 3, 2024, 780), ('Brooklyn', 'NY', 4, 2024, 798),
('Brooklyn', 'NY', 1, 2025, 815), ('Brooklyn', 'NY', 2, 2025, 835), ('Brooklyn', 'NY', 3, 2025, 855), ('Brooklyn', 'NY', 4, 2025, 875),
-- MA Cities
('Boston', 'MA', 1, 2023, 750), ('Boston', 'MA', 2, 2023, 768), ('Boston', 'MA', 3, 2023, 785), ('Boston', 'MA', 4, 2023, 802),
('Boston', 'MA', 1, 2024, 820), ('Boston', 'MA', 2, 2024, 838), ('Boston', 'MA', 3, 2024, 855), ('Boston', 'MA', 4, 2024, 875),
('Boston', 'MA', 1, 2025, 895), ('Boston', 'MA', 2, 2025, 915), ('Boston', 'MA', 3, 2025, 935), ('Boston', 'MA', 4, 2025, 955),
('Cambridge', 'MA', 1, 2023, 820), ('Cambridge', 'MA', 2, 2023, 840), ('Cambridge', 'MA', 3, 2023, 860), ('Cambridge', 'MA', 4, 2023, 880),
('Cambridge', 'MA', 1, 2024, 900), ('Cambridge', 'MA', 2, 2024, 922), ('Cambridge', 'MA', 3, 2024, 945), ('Cambridge', 'MA', 4, 2024, 968),
('Cambridge', 'MA', 1, 2025, 990), ('Cambridge', 'MA', 2, 2025, 1015), ('Cambridge', 'MA', 3, 2025, 1040), ('Cambridge', 'MA', 4, 2025, 1065),
-- FL Cities
('Miami', 'FL', 1, 2023, 440), ('Miami', 'FL', 2, 2023, 455), ('Miami', 'FL', 3, 2023, 470), ('Miami', 'FL', 4, 2023, 485),
('Miami', 'FL', 1, 2024, 500), ('Miami', 'FL', 2, 2024, 518), ('Miami', 'FL', 3, 2024, 535), ('Miami', 'FL', 4, 2024, 552),
('Miami', 'FL', 1, 2025, 570), ('Miami', 'FL', 2, 2025, 588), ('Miami', 'FL', 3, 2025, 608), ('Miami', 'FL', 4, 2025, 628),
('Orlando', 'FL', 1, 2023, 220), ('Orlando', 'FL', 2, 2023, 228), ('Orlando', 'FL', 3, 2023, 235), ('Orlando', 'FL', 4, 2023, 242),
('Orlando', 'FL', 1, 2024, 250), ('Orlando', 'FL', 2, 2024, 258), ('Orlando', 'FL', 3, 2024, 265), ('Orlando', 'FL', 4, 2024, 272),
('Orlando', 'FL', 1, 2025, 280), ('Orlando', 'FL', 2, 2025, 288), ('Orlando', 'FL', 3, 2025, 298), ('Orlando', 'FL', 4, 2025, 308),
('Tampa', 'FL', 1, 2023, 265), ('Tampa', 'FL', 2, 2023, 275), ('Tampa', 'FL', 3, 2023, 285), ('Tampa', 'FL', 4, 2023, 295),
('Tampa', 'FL', 1, 2024, 305), ('Tampa', 'FL', 2, 2024, 315), ('Tampa', 'FL', 3, 2024, 325), ('Tampa', 'FL', 4, 2024, 336),
('Tampa', 'FL', 1, 2025, 348), ('Tampa', 'FL', 2, 2025, 360), ('Tampa', 'FL', 3, 2025, 372), ('Tampa', 'FL', 4, 2025, 385),
-- CA Cities
('Los Angeles', 'CA', 1, 2023, 680), ('Los Angeles', 'CA', 2, 2023, 698), ('Los Angeles', 'CA', 3, 2023, 715), ('Los Angeles', 'CA', 4, 2023, 732),
('Los Angeles', 'CA', 1, 2024, 750), ('Los Angeles', 'CA', 2, 2024, 770), ('Los Angeles', 'CA', 3, 2024, 790), ('Los Angeles', 'CA', 4, 2024, 810),
('Los Angeles', 'CA', 1, 2025, 830), ('Los Angeles', 'CA', 2, 2025, 852), ('Los Angeles', 'CA', 3, 2025, 875), ('Los Angeles', 'CA', 4, 2025, 898),
('San Francisco', 'CA', 1, 2023, 1050), ('San Francisco', 'CA', 2, 2023, 1075), ('San Francisco', 'CA', 3, 2023, 1100), ('San Francisco', 'CA', 4, 2023, 1125),
('San Francisco', 'CA', 1, 2024, 1150), ('San Francisco', 'CA', 2, 2024, 1180), ('San Francisco', 'CA', 3, 2024, 1210), ('San Francisco', 'CA', 4, 2024, 1240),
('San Francisco', 'CA', 1, 2025, 1270), ('San Francisco', 'CA', 2, 2025, 1300), ('San Francisco', 'CA', 3, 2025, 1335), ('San Francisco', 'CA', 4, 2025, 1370),
('San Diego', 'CA', 1, 2023, 580), ('San Diego', 'CA', 2, 2023, 595), ('San Diego', 'CA', 3, 2023, 610), ('San Diego', 'CA', 4, 2023, 625),
('San Diego', 'CA', 1, 2024, 642), ('San Diego', 'CA', 2, 2024, 658), ('San Diego', 'CA', 3, 2024, 675), ('San Diego', 'CA', 4, 2024, 692),
('San Diego', 'CA', 1, 2025, 710), ('San Diego', 'CA', 2, 2025, 730), ('San Diego', 'CA', 3, 2025, 750), ('San Diego', 'CA', 4, 2025, 772),
-- TX Cities
('Austin', 'TX', 1, 2023, 385), ('Austin', 'TX', 2, 2023, 395), ('Austin', 'TX', 3, 2023, 405), ('Austin', 'TX', 4, 2023, 415),
('Austin', 'TX', 1, 2024, 425), ('Austin', 'TX', 2, 2024, 438), ('Austin', 'TX', 3, 2024, 450), ('Austin', 'TX', 4, 2024, 462),
('Austin', 'TX', 1, 2025, 475), ('Austin', 'TX', 2, 2025, 488), ('Austin', 'TX', 3, 2025, 502), ('Austin', 'TX', 4, 2025, 518),
('Dallas', 'TX', 1, 2023, 245), ('Dallas', 'TX', 2, 2023, 252), ('Dallas', 'TX', 3, 2023, 258), ('Dallas', 'TX', 4, 2023, 265),
('Dallas', 'TX', 1, 2024, 272), ('Dallas', 'TX', 2, 2024, 280), ('Dallas', 'TX', 3, 2024, 288), ('Dallas', 'TX', 4, 2024, 295),
('Dallas', 'TX', 1, 2025, 305), ('Dallas', 'TX', 2, 2025, 315), ('Dallas', 'TX', 3, 2025, 325), ('Dallas', 'TX', 4, 2025, 335),
('Houston', 'TX', 1, 2023, 195), ('Houston', 'TX', 2, 2023, 200), ('Houston', 'TX', 3, 2023, 205), ('Houston', 'TX', 4, 2023, 210),
('Houston', 'TX', 1, 2024, 215), ('Houston', 'TX', 2, 2024, 222), ('Houston', 'TX', 3, 2024, 228), ('Houston', 'TX', 4, 2024, 235),
('Houston', 'TX', 1, 2025, 242), ('Houston', 'TX', 2, 2025, 250), ('Houston', 'TX', 3, 2025, 258), ('Houston', 'TX', 4, 2025, 268),
-- WA/CO/AZ Cities 
('Seattle', 'WA', 1, 2023, 520), ('Seattle', 'WA', 2, 2023, 535), ('Seattle', 'WA', 3, 2023, 550), ('Seattle', 'WA', 4, 2023, 565),
('Seattle', 'WA', 1, 2024, 580), ('Seattle', 'WA', 2, 2024, 598), ('Seattle', 'WA', 3, 2024, 615), ('Seattle', 'WA', 4, 2024, 632),
('Seattle', 'WA', 1, 2025, 650), ('Seattle', 'WA', 2, 2025, 670), ('Seattle', 'WA', 3, 2025, 690), ('Seattle', 'WA', 4, 2025, 710),
('Denver', 'CO', 1, 2023, 385), ('Denver', 'CO', 2, 2023, 395), ('Denver', 'CO', 3, 2023, 405), ('Denver', 'CO', 4, 2023, 415),
('Denver', 'CO', 1, 2024, 428), ('Denver', 'CO', 2, 2024, 440), ('Denver', 'CO', 3, 2024, 452), ('Denver', 'CO', 4, 2024, 465),
('Denver', 'CO', 1, 2025, 480), ('Denver', 'CO', 2, 2025, 495), ('Denver', 'CO', 3, 2025, 510), ('Denver', 'CO', 4, 2025, 525),
('Phoenix', 'AZ', 1, 2023, 285), ('Phoenix', 'AZ', 2, 2023, 295), ('Phoenix', 'AZ', 3, 2023, 305), ('Phoenix', 'AZ', 4, 2023, 315),
('Phoenix', 'AZ', 1, 2024, 325), ('Phoenix', 'AZ', 2, 2024, 338), ('Phoenix', 'AZ', 3, 2024, 350), ('Phoenix', 'AZ', 4, 2024, 362),
('Phoenix', 'AZ', 1, 2025, 375), ('Phoenix', 'AZ', 2, 2025, 390), ('Phoenix', 'AZ', 3, 2025, 405), ('Phoenix', 'AZ', 4, 2025, 420),
-- IL city  
('Chicago', 'IL', 1, 2023, 295), ('Chicago', 'IL', 2, 2023, 305), ('Chicago', 'IL', 3, 2023, 315), ('Chicago', 'IL', 4, 2023, 325),
('Chicago', 'IL', 1, 2024, 335), ('Chicago', 'IL', 2, 2024, 348), ('Chicago', 'IL', 3, 2024, 360), ('Chicago', 'IL', 4, 2024, 372),
('Chicago', 'IL', 1, 2025, 385), ('Chicago', 'IL', 2, 2025, 400), ('Chicago', 'IL', 3, 2025, 415), ('Chicago', 'IL', 4, 2025, 430),
-- GA/NC cities
('Atlanta', 'GA', 1, 2023, 230), ('Atlanta', 'GA', 2, 2023, 238), ('Atlanta', 'GA', 3, 2023, 245), ('Atlanta', 'GA', 4, 2023, 252),
('Atlanta', 'GA', 1, 2024, 260), ('Atlanta', 'GA', 2, 2024, 270), ('Atlanta', 'GA', 3, 2024, 280), ('Atlanta', 'GA', 4, 2024, 290),
('Atlanta', 'GA', 1, 2025, 300), ('Atlanta', 'GA', 2, 2025, 312), ('Atlanta', 'GA', 3, 2025, 325), ('Atlanta', 'GA', 4, 2025, 338),
('Charlotte', 'NC', 1, 2023, 235), ('Charlotte', 'NC', 2, 2023, 242), ('Charlotte', 'NC', 3, 2023, 250), ('Charlotte', 'NC', 4, 2023, 258),
('Charlotte', 'NC', 1, 2024, 268), ('Charlotte', 'NC', 2, 2024, 278), ('Charlotte', 'NC', 3, 2024, 288), ('Charlotte', 'NC', 4, 2024, 298),
('Charlotte', 'NC', 1, 2025, 310), ('Charlotte', 'NC', 2, 2025, 322), ('Charlotte', 'NC', 3, 2025, 335), ('Charlotte', 'NC', 4, 2025, 348);
