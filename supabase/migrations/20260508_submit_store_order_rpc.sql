-- Atomic Store Order Submission with Stock Deduction
CREATE OR REPLACE FUNCTION public.submit_store_order(
    p_store_id UUID,
    p_user_id UUID,
    p_items JSONB -- Array of {product_id, quantity, unit_price}
) RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_item RECORD;
    v_total_amount NUMERIC := 0;
    v_allowed_warehouse_groups UUID[];
    v_current_qty_needed INTEGER;
    v_warehouse_record RECORD;
    v_deducted INTEGER;
BEGIN
    -- 1. Get total amount and allowed warehouse groups
    SELECT allowed_warehouse_group_ids INTO v_allowed_warehouse_groups
    FROM public.store_warehouse_configs
    WHERE store_id = p_store_id;

    IF v_allowed_warehouse_groups IS NULL THEN
        RAISE EXCEPTION 'Store not configured with any authorized warehouse groups.';
    END IF;

    -- Calculate total
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER, unit_price NUMERIC)
    LOOP
        v_total_amount := v_total_amount + (v_item.unit_price * v_item.quantity);
    END LOOP;

    -- 2. Create the Order
    INSERT INTO public.store_orders (store_id, user_id, total_amount, status)
    VALUES (p_store_id, p_user_id, v_total_amount, 'Pending')
    RETURNING id INTO v_order_id;

    -- 3. Process each item: Save record and Deduct Stock
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER, unit_price NUMERIC)
    LOOP
        -- Insert Order Item
        INSERT INTO public.store_order_items (order_id, product_id, quantity, unit_price)
        VALUES (v_order_id, v_item.product_id, v_item.quantity, v_item.unit_price);

        -- Deduct Stock from authorized warehouses
        v_current_qty_needed := v_item.quantity;
        
        -- Loop through authorized warehouses that have this product
        FOR v_warehouse_record IN 
            SELECT ws.warehouse_id, ws.quantity, ws.id as stock_row_id
            FROM public.warehouse_stocks ws
            JOIN public.warehouses w ON ws.warehouse_id = w.id
            WHERE ws.product_id = v_item.product_id
            AND w.group_id = ANY(v_allowed_warehouse_groups)
            AND ws.quantity > 0
            ORDER BY ws.quantity DESC -- Deduct from largest piles first
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

        -- If still need quantity, it means total stock was insufficient (though UI should prevent this)
        IF v_current_qty_needed > 0 THEN
            RAISE EXCEPTION 'Insufficient total stock in authorized warehouses for product ID %', v_item.product_id;
        END IF;
    END LOOP;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
