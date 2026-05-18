-- Final ironclad fix for the Rp 0 price issue
-- This version of the RPC will automatically fetch the price from the products table 
-- if the passed unit_price is 0 or NULL.
CREATE OR REPLACE FUNCTION public.submit_store_order(
    p_store_id UUID,
    p_user_id UUID,
    p_items JSONB -- Array of {product_id, quantity, unit_price}
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_item RECORD;
    v_total_amount NUMERIC := 0;
    v_warehouse_record RECORD;
    v_current_qty_needed INTEGER;
    v_deducted INTEGER;
    v_allowed_warehouse_groups UUID[];
    v_final_unit_price NUMERIC;
BEGIN
    -- Get allowed warehouse groups for this store
    SELECT allowed_warehouse_group_ids INTO v_allowed_warehouse_groups
    FROM public.store_warehouse_configs
    WHERE store_id = p_store_id;

    -- Create the order header first (will update total_amount later)
    INSERT INTO public.store_orders (store_id, user_id, status, total_amount)
    VALUES (p_store_id, p_user_id, 'Pending', 0)
    RETURNING id INTO v_order_id;

    -- Process items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER, unit_price NUMERIC)
    LOOP
        -- IRONCLAD PRICE CHECK: If passed price is 0/NULL, fetch from products table
        IF v_item.unit_price IS NULL OR v_item.unit_price <= 0 THEN
            SELECT COALESCE(discount_price, price) INTO v_final_unit_price
            FROM public.products
            WHERE id = v_item.product_id;
        ELSE
            v_final_unit_price := v_item.unit_price;
        END IF;

        -- Add to total amount
        v_total_amount := v_total_amount + (v_final_unit_price * v_item.quantity);

        -- Insert order item
        INSERT INTO public.store_order_items (order_id, product_id, quantity, unit_price)
        VALUES (v_order_id, v_item.product_id, v_item.quantity, v_final_unit_price);

        -- Deduct Stock from authorized warehouses
        v_current_qty_needed := v_item.quantity;
        
        FOR v_warehouse_record IN 
            SELECT ws.warehouse_id, ws.quantity, ws.id as stock_row_id
            FROM public.warehouse_stocks ws
            JOIN public.warehouses w ON ws.warehouse_id = w.id
            WHERE ws.product_id = v_item.product_id
            AND w.group_id = ANY(v_allowed_warehouse_groups)
            AND ws.quantity > 0
            ORDER BY ws.quantity DESC
        LOOP
            IF v_current_qty_needed <= 0 THEN
                EXIT;
            END IF;

            v_deducted := LEAST(v_current_qty_needed, v_warehouse_record.quantity);
            
            UPDATE public.warehouse_stocks
            SET quantity = quantity - v_deducted
            WHERE id = v_warehouse_record.stock_row_id;

            v_current_qty_needed := v_current_qty_needed - v_deducted;
        END LOOP;

        IF v_current_qty_needed > 0 THEN
            RAISE EXCEPTION 'Insufficient total stock in authorized warehouses for product ID %', v_item.product_id;
        END IF;
    END LOOP;

    -- Update final total amount
    UPDATE public.store_orders SET total_amount = v_total_amount WHERE id = v_order_id;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
