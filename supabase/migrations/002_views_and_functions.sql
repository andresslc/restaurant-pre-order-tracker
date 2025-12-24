-- ============================================
-- Views and Helper Functions
-- ============================================

-- ============================================
-- View: Orders with Items (Aggregated)
-- ============================================

CREATE OR REPLACE VIEW orders_with_items AS
SELECT 
    o.id,
    o.order_number,
    o.customer_name,
    o.status,
    o.estimated_arrival,
    o.arrived_at,
    o.wait_time,
    o.delivery_type,
    o.address,
    o.created_at,
    o.updated_at,
    COALESCE(
        json_agg(
            json_build_object(
                'id', oi.id,
                'name', oi.name,
                'quantity', oi.quantity
            )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::json
    ) AS items
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id
ORDER BY o.created_at DESC;

-- ============================================
-- Function: Get Order with Items
-- ============================================

CREATE OR REPLACE FUNCTION get_order_with_items(p_order_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'id', o.id,
        'order_number', o.order_number,
        'customer_name', o.customer_name,
        'status', o.status,
        'estimated_arrival', o.estimated_arrival,
        'arrived_at', o.arrived_at,
        'wait_time', o.wait_time,
        'delivery_type', o.delivery_type,
        'address', o.address,
        'created_at', o.created_at,
        'updated_at', o.updated_at,
        'items', COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'id', oi.id,
                    'name', oi.name,
                    'quantity', oi.quantity
                )
            ) FROM order_items oi WHERE oi.order_id = o.id),
            '[]'::json
        )
    ) INTO result
    FROM orders o
    WHERE o.id = p_order_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: Create Order with Items
-- ============================================

CREATE OR REPLACE FUNCTION create_order_with_items(
    p_customer_name VARCHAR(255),
    p_delivery_type delivery_type,
    p_estimated_arrival VARCHAR(50) DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_items JSON DEFAULT '[]'::JSON
)
RETURNS JSON AS $$
DECLARE
    v_order_id UUID;
    v_item JSON;
    result JSON;
BEGIN
    -- Insert the order
    INSERT INTO orders (customer_name, delivery_type, estimated_arrival, address)
    VALUES (p_customer_name, p_delivery_type, p_estimated_arrival, p_address)
    RETURNING id INTO v_order_id;
    
    -- Insert order items
    FOR v_item IN SELECT * FROM json_array_elements(p_items)
    LOOP
        INSERT INTO order_items (order_id, name, quantity)
        VALUES (
            v_order_id,
            v_item->>'name',
            (v_item->>'quantity')::INTEGER
        );
    END LOOP;
    
    -- Return the complete order with items
    SELECT get_order_with_items(v_order_id) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: Mark Order as Arrived
-- ============================================

CREATE OR REPLACE FUNCTION mark_order_arrived(p_order_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    UPDATE orders 
    SET status = 'arrived', arrived_at = NOW()
    WHERE id = p_order_id AND status = 'pending';
    
    SELECT get_order_with_items(p_order_id) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: Mark Order as Delivered
-- ============================================

CREATE OR REPLACE FUNCTION mark_order_delivered(p_order_id UUID)
RETURNS JSON AS $$
DECLARE
    v_wait_time INTEGER;
    result JSON;
BEGIN
    -- Calculate wait time in seconds
    SELECT EXTRACT(EPOCH FROM (NOW() - arrived_at))::INTEGER
    INTO v_wait_time
    FROM orders
    WHERE id = p_order_id AND status = 'arrived';
    
    -- Update the order
    UPDATE orders 
    SET status = 'delivered', wait_time = v_wait_time
    WHERE id = p_order_id AND status = 'arrived';
    
    SELECT get_order_with_items(p_order_id) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: Get Products Aggregate
-- ============================================

CREATE OR REPLACE FUNCTION get_products_aggregate()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT COALESCE(
        json_agg(
            json_build_object(
                'name', name,
                'quantity', total_quantity
            )
            ORDER BY total_quantity DESC
        ),
        '[]'::json
    ) INTO result
    FROM (
        SELECT oi.name, SUM(oi.quantity) as total_quantity
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        GROUP BY oi.name
    ) subquery;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: Get Orders Stats
-- ============================================

CREATE OR REPLACE FUNCTION get_orders_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_orders', COUNT(*),
        'pending_orders', COUNT(*) FILTER (WHERE status = 'pending'),
        'arrived_orders', COUNT(*) FILTER (WHERE status = 'arrived'),
        'delivered_orders', COUNT(*) FILTER (WHERE status = 'delivered'),
        'delivery_orders', COUNT(*) FILTER (WHERE delivery_type = 'delivery'),
        'onsite_orders', COUNT(*) FILTER (WHERE delivery_type = 'on-site'),
        'avg_wait_time', ROUND(AVG(wait_time) FILTER (WHERE wait_time IS NOT NULL))
    ) INTO result
    FROM orders;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

