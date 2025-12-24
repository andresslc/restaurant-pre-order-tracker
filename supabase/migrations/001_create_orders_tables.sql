-- ============================================
-- Restaurant Pre-Order Tracker Database Schema
-- Supabase PostgreSQL Migration
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM Types
-- ============================================

-- Order status enum
CREATE TYPE order_status AS ENUM ('pending', 'arrived', 'delivered');

-- Delivery type enum  
CREATE TYPE delivery_type AS ENUM ('on-site', 'delivery');

-- ============================================
-- Orders Table
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(10) NOT NULL UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    estimated_arrival VARCHAR(50),
    arrived_at TIMESTAMPTZ,
    wait_time INTEGER, -- in seconds
    delivery_type delivery_type NOT NULL DEFAULT 'on-site',
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Order Items Table
-- ============================================

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Index on order status for filtering
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Index on delivery type for filtering
CREATE INDEX IF NOT EXISTS idx_orders_delivery_type ON orders(delivery_type);

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Index on order_id for order items lookup
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ============================================
-- Updated At Trigger Function
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger for Orders Updated At
-- ============================================

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
CREATE TRIGGER trigger_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Function to Generate Order Number
-- ============================================

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := '#' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger to Auto-Generate Order Number
-- ============================================

DROP TRIGGER IF EXISTS trigger_generate_order_number ON orders;
CREATE TRIGGER trigger_generate_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_number();

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Enable RLS on order_items table
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
-- (Adjust based on your authentication needs)
CREATE POLICY "Allow all operations for authenticated users" ON orders
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON order_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Allow anonymous access for development/public use
-- (Remove in production if you need authentication)
CREATE POLICY "Allow anonymous read access" ON orders
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow anonymous insert access" ON orders
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anonymous update access" ON orders
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access" ON orders
    FOR DELETE
    TO anon
    USING (true);

CREATE POLICY "Allow anonymous read access" ON order_items
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow anonymous insert access" ON order_items
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anonymous update access" ON order_items
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access" ON order_items
    FOR DELETE
    TO anon
    USING (true);

-- ============================================
-- Sample Data (Optional - for testing)
-- ============================================

-- Insert sample orders
INSERT INTO orders (order_number, customer_name, status, estimated_arrival, delivery_type) VALUES
    ('#1234', 'John Smith', 'pending', '12:30 PM', 'on-site'),
    ('#1235', 'Sarah Johnson', 'arrived', '12:15 PM', 'on-site'),
    ('#1236', 'Mike Davis', 'arrived', '12:20 PM', 'delivery'),
    ('#1237', 'Emily Brown', 'delivered', '12:00 PM', 'on-site');

-- Update arrived_at for arrived orders
UPDATE orders SET arrived_at = NOW() - INTERVAL '2 minutes' WHERE order_number = '#1235';
UPDATE orders SET arrived_at = NOW() - INTERVAL '1 minute' WHERE order_number = '#1236';
UPDATE orders SET address = '123 Main St, Apt 4B' WHERE order_number = '#1236';
UPDATE orders SET wait_time = 185 WHERE order_number = '#1237';

-- Insert sample order items
INSERT INTO order_items (order_id, name, quantity) 
SELECT id, 'Burgers', 2 FROM orders WHERE order_number = '#1234';
INSERT INTO order_items (order_id, name, quantity) 
SELECT id, 'Coke', 1 FROM orders WHERE order_number = '#1234';

INSERT INTO order_items (order_id, name, quantity) 
SELECT id, 'Caesar Salad', 1 FROM orders WHERE order_number = '#1235';
INSERT INTO order_items (order_id, name, quantity) 
SELECT id, 'Iced Tea', 2 FROM orders WHERE order_number = '#1235';

INSERT INTO order_items (order_id, name, quantity) 
SELECT id, 'Pizzas', 3 FROM orders WHERE order_number = '#1236';
INSERT INTO order_items (order_id, name, quantity) 
SELECT id, 'Wings', 1 FROM orders WHERE order_number = '#1236';

INSERT INTO order_items (order_id, name, quantity) 
SELECT id, 'Pasta', 2 FROM orders WHERE order_number = '#1237';
INSERT INTO order_items (order_id, name, quantity) 
SELECT id, 'Tiramisu', 1 FROM orders WHERE order_number = '#1237';

