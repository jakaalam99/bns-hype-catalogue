-- Fix RLS for store_orders to be more robust for MDs
DROP POLICY IF EXISTS "Users see own store orders" ON public.store_orders;
CREATE POLICY "Users see own store orders" ON public.store_orders FOR SELECT TO authenticated 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND upper(role) IN ('MD', 'ADMIN', 'SUPER_ADMIN', 'MERCHANDISER', 'ADMINISTRATOR')
    )
);

-- Also ensure MDs can see store_order_items
DROP POLICY IF EXISTS "Users see own store order items" ON public.store_order_items;
CREATE POLICY "Users see own store order items" ON public.store_order_items FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.store_orders 
        WHERE id = order_id AND (
            user_id = auth.uid() OR 
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND upper(role) IN ('MD', 'ADMIN', 'SUPER_ADMIN', 'MERCHANDISER', 'ADMINISTRATOR')
            )
        )
    )
);
