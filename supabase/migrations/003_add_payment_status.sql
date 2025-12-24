-- ============================================
-- Add Payment Status to Orders
-- ============================================

-- Add is_paid column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT false;

-- Create index for payment status filtering
CREATE INDEX IF NOT EXISTS idx_orders_is_paid ON orders(is_paid);

-- Update existing sample data (mark some as paid for testing)
UPDATE orders SET is_paid = true WHERE order_number = '#1237';

