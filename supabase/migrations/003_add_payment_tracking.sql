-- ============================================
-- Add Payment Tracking to Orders
-- ============================================

-- Drop the is_paid column if it exists (replacing with better system)
ALTER TABLE orders DROP COLUMN IF EXISTS is_paid;

-- Add payment tracking columns
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Create index for payment status filtering
CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(total_amount, amount_paid);

-- Update existing sample data with some amounts for testing
UPDATE orders SET total_amount = 25.50, amount_paid = 25.50 WHERE order_number = '#1237';
UPDATE orders SET total_amount = 18.00, amount_paid = 10.00 WHERE order_number = '#1236';
UPDATE orders SET total_amount = 32.00, amount_paid = 0 WHERE order_number = '#1235';
UPDATE orders SET total_amount = 15.00, amount_paid = 0 WHERE order_number = '#1234';

