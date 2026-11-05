-- Drop the legacy profiles table and use public.users as the single profile source.

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Signup now writes directly to public.users instead of profiles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, username, full_name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'username', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), NEW.email),
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        username = COALESCE(EXCLUDED.username, public.users.username),
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name);

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Remove the old table. Dependent foreign keys are dropped with it.
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Re-point chat and connection foreign keys at public.users.
ALTER TABLE IF EXISTS public.messages
  DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

ALTER TABLE IF EXISTS public.messages
  ADD CONSTRAINT messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.connection_requests
  DROP CONSTRAINT IF EXISTS connection_requests_sender_id_fkey;

ALTER TABLE IF EXISTS public.connection_requests
  ADD CONSTRAINT connection_requests_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.connection_requests
  DROP CONSTRAINT IF EXISTS connection_requests_receiver_id_fkey;

ALTER TABLE IF EXISTS public.connection_requests
  ADD CONSTRAINT connection_requests_receiver_id_fkey
  FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;
