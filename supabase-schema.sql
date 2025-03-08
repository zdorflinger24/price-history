-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lumber_prices JSONB NOT NULL,
    build_intricacy_costs JSONB NOT NULL,
    additional_costs JSONB NOT NULL,
    transportation_costs JSONB NOT NULL,
    vehicle_dimensions JSONB NOT NULL,
    fastener_costs JSONB NOT NULL,
    lumber_processing_cost DECIMAL(10,4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Shipping locations table
CREATE TABLE IF NOT EXISTS shipping_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    distance DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quotes table (combines both Basic and Advanced calculator data)
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Basic Info
    customer_name VARCHAR(255),
    company_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    sales_person VARCHAR(255),
    quote_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    quote_type VARCHAR(50) NOT NULL, -- 'basic' or 'advanced'
    
    -- Location and Transportation
    location_id UUID REFERENCES shipping_locations(id),
    transportation_type VARCHAR(50),
    pallets_per_truck INTEGER,
    
    -- Basic Quote Fields
    length DECIMAL(10,2),
    width DECIMAL(10,2),
    board_feet DECIMAL(10,2),
    lumber_type VARCHAR(100),
    heat_treated BOOLEAN DEFAULT false,
    notched BOOLEAN DEFAULT false,
    painted BOOLEAN DEFAULT false,
    bands BOOLEAN DEFAULT false,
    build_intricacy VARCHAR(50),
    
    -- Advanced Quote Fields (stored as JSONB for flexibility)
    pallet_components JSONB,
    
    -- Calculation Results
    total_cost DECIMAL(10,2),
    cost_per_mbf DECIMAL(10,2),
    walkaway_price DECIMAL(10,2),
    price_per_board_foot DECIMAL(10,2),
    profit_margin_25 DECIMAL(10,2),
    profit_margin_30 DECIMAL(10,2),
    profit_margin_35 DECIMAL(10,2),
    transportation_cost DECIMAL(10,2),
    total_cost_with_transport DECIMAL(10,2),
    
    -- Loading Configurations
    loading_config JSONB,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'draft',
    notes TEXT
);

-- Insert default settings
INSERT INTO settings (
    lumber_prices,
    build_intricacy_costs,
    additional_costs,
    transportation_costs,
    vehicle_dimensions,
    fastener_costs,
    lumber_processing_cost
) VALUES (
    '{
        "Recycled": {"a": 10, "b": 60, "c": 350},
        "Combo": {"a": 8, "b": 96, "c": 500},
        "Green Pine": {"a": 5, "b": 60, "c": 650},
        "SYP": {"a": 4, "b": 48, "c": 700}
    }',
    '{
        "Automated": 0.75,
        "Manual Easy": 1,
        "Manual Intricate": 3
    }',
    '{
        "painted": 0.75,
        "notched": 0.85,
        "heatTreated": 1,
        "bands": 0.10
    }',
    '{
        "baseDeliveryFee": {
            "Truck": 100,
            "Dry Van": 200,
            "Flatbed": 250
        },
        "perMileCharge": 2
    }',
    '{
        "Truck": {"length": 408, "width": 96, "height": 96, "maxWeight": 10000},
        "Dry Van": {"length": 636, "width": 102, "height": 110, "maxWeight": 45000},
        "Flatbed": {"length": 636, "width": 102, "height": 0, "maxWeight": 48000}
    }',
    '{
        "standard": 0.0046,
        "automatic": 0.0065,
        "specialty": 0.01
    }',
    0.05
);

-- Insert sample shipping locations
INSERT INTO shipping_locations (name, address, distance) VALUES
    ('Local Warehouse', '123 Main St, Anytown, USA', 5.2),
    ('Regional Distribution Center', '456 Commerce Pkwy, Business City, USA', 25.8),
    ('Cross-Country Hub', '789 Logistics Ave, Shipping City, USA', 150.3);

-- Create indexes for better query performance
CREATE INDEX idx_quotes_customer_name ON quotes(customer_name);
CREATE INDEX idx_quotes_quote_date ON quotes(quote_date);
CREATE INDEX idx_quotes_quote_type ON quotes(quote_type);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_shipping_locations_name ON shipping_locations(name);

-- Add RLS (Row Level Security) policies
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_locations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access for settings"
    ON settings FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Public read access for shipping_locations"
    ON shipping_locations FOR SELECT
    TO anon
    USING (true);

-- Update quotes table policies
DROP POLICY IF EXISTS "Public read access for quotes" ON quotes;
DROP POLICY IF EXISTS "Public insert access for quotes" ON quotes;

CREATE POLICY "Enable read access for all users"
    ON quotes FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Enable insert access for all users"
    ON quotes FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for all users"
    ON quotes FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete access for all users"
    ON quotes FOR DELETE
    TO anon, authenticated
    USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_quotes_updated_at
    BEFORE UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_locations_updated_at
    BEFORE UPDATE ON shipping_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 