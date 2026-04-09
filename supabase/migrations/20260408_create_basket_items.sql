-- Create basket_items table for server-side persistence
CREATE TABLE IF NOT EXISTS public.basket_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.basket_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own basket items"
    ON public.basket_items
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_basket_items_updated_at
    BEFORE UPDATE ON public.basket_items
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
