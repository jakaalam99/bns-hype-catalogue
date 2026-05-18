-- User Profiles & Multi-User Store Assignments Migration

-- 1. Create Public Profiles Table
-- This mirrors auth.users to allow the frontend to list and select users.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT,
    store_id UUID REFERENCES public.destination_locations(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR ALL USING (
        upper(auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'MD', 'SUPER_ADMIN')
    );

-- 4. Sync existing users into profiles
INSERT INTO public.profiles (id, email, role)
SELECT 
    id, 
    email, 
    raw_user_meta_data ->> 'role'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 5. Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'role');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Cleanup previous column (optional, but cleaner)
-- ALTER TABLE public.destination_locations DROP COLUMN IF EXISTS user_id;
