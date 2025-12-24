-- ============================================
-- Add Delivery Status to Order Items
-- ============================================

-- Add is_delivered column to order_items table
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN NOT NULL DEFAULT false;

-- Create index for filtering delivered items
CREATE INDEX IF NOT EXISTS idx_order_items_is_delivered ON order_items(is_delivered);

