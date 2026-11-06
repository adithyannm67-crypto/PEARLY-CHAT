-- Add online presence columns to users table.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS users_is_online_idx
  ON public.users (is_online);

CREATE INDEX IF NOT EXISTS users_last_seen_idx
  ON public.users (last_seen);

-- Allow users to update their own online status and last_seen.
DROP POLICY IF EXISTS users_update_presence ON public.users;
CREATE POLICY users_update_presence
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Enable Realtime on the users table so presence changes broadcast.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Recreate public_user_profiles view to include presence columns.
CREATE OR REPLACE VIEW public.public_user_profiles AS
SELECT id, username, avatar_url, full_name, created_at, is_online, last_seen
FROM public.users;

REVOKE ALL ON public.public_user_profiles FROM anon, authenticated;
GRANT SELECT ON public.public_user_profiles TO authenticated;
