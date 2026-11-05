-- Complete chat schema, RLS policies, backfill, and server-side auth helpers.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversation_participants_user_idx
  ON public.conversation_participants (user_id);

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON public.messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS messages_sender_idx
  ON public.messages (sender_id);

CREATE INDEX IF NOT EXISTS connection_requests_receiver_status_idx
  ON public.connection_requests (receiver_id, status);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

-- Avoid recursive RLS checks by evaluating membership in a definer function.
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_conversation_participant(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID) TO authenticated;

-- Atomically create or return a direct conversation for the authenticated user.
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(p_other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_conversation_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF v_user_id = p_other_user_id THEN
    RAISE EXCEPTION 'You cannot start a conversation with yourself' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(least(v_user_id::text, p_other_user_id::text) || ':' || greatest(v_user_id::text, p_other_user_id::text))::bigint
  );

  SELECT cp1.conversation_id
  INTO v_conversation_id
  FROM public.conversation_participants cp1
  JOIN public.conversation_participants cp2
    ON cp2.conversation_id = cp1.conversation_id
  WHERE cp1.user_id = v_user_id
    AND cp2.user_id = p_other_user_id
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  INSERT INTO public.conversations DEFAULT VALUES
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES
    (v_conversation_id, v_user_id),
    (v_conversation_id, p_other_user_id);

  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_direct_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(UUID) TO authenticated;

-- Used only by the backend signin endpoint so the client never receives emails.
CREATE OR REPLACE FUNCTION public.resolve_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM public.users
  WHERE lower(username) = lower(trim(p_username))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_email_by_username(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_email_by_username(TEXT) TO anon, authenticated;

-- Public-safe profile view: no emails exposed to other users.
CREATE OR REPLACE VIEW public.public_user_profiles AS
SELECT id, username, avatar_url, full_name, created_at
FROM public.users;

REVOKE ALL ON public.public_user_profiles FROM anon, authenticated;
GRANT SELECT ON public.public_user_profiles TO authenticated;

DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS conversations_select_participant ON public.conversations;
CREATE POLICY conversations_select_participant
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (public.is_conversation_participant(id, auth.uid()));

DROP POLICY IF EXISTS conversation_participants_select_member ON public.conversation_participants;
CREATE POLICY conversation_participants_select_member
  ON public.conversation_participants
  FOR SELECT
  TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS messages_select_participant ON public.messages;
CREATE POLICY messages_select_participant
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS messages_insert_participant ON public.messages;
CREATE POLICY messages_insert_participant
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_participant(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS connection_requests_select_participant ON public.connection_requests;
CREATE POLICY connection_requests_select_participant
  ON public.connection_requests
  FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

DROP POLICY IF EXISTS connection_requests_insert_sender ON public.connection_requests;
CREATE POLICY connection_requests_insert_sender
  ON public.connection_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS connection_requests_update_receiver ON public.connection_requests;
CREATE POLICY connection_requests_update_receiver
  ON public.connection_requests
  FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Backfill users created before public.users existed.
WITH ranked_users AS (
  SELECT
    u.id,
    u.email,
    lower(NULLIF(u.raw_user_meta_data->>'username', '')) AS username,
    COALESCE(NULLIF(u.raw_user_meta_data->>'name', ''), u.email) AS full_name,
    u.created_at,
    row_number() OVER (
      PARTITION BY lower(NULLIF(u.raw_user_meta_data->>'username', ''))
      ORDER BY u.created_at, u.id
    ) AS username_rank
  FROM auth.users u
)
INSERT INTO public.users (id, email, username, full_name, created_at)
SELECT
  id,
  email,
  CASE WHEN username_rank = 1 THEN username ELSE NULL END,
  full_name,
  created_at
FROM ranked_users
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    username = COALESCE(public.users.username, EXCLUDED.username),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name);

-- Clear case-insensitive username duplicates before adding the unique index.
WITH duplicate_usernames AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY lower(username)
      ORDER BY created_at, id
    ) AS username_rank
  FROM public.users
  WHERE username IS NOT NULL
)
UPDATE public.users
SET username = NULL
FROM duplicate_usernames
WHERE public.users.id = duplicate_usernames.id
  AND duplicate_usernames.username_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx
  ON public.users (lower(username))
  WHERE username IS NOT NULL;

-- Normalize future signups and let duplicate usernames fail the transaction.
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
    lower(NULLIF(NEW.raw_user_meta_data->>'username', '')),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), NEW.email),
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        username = COALESCE(EXCLUDED.username, public.users.username),
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable Realtime message inserts.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;
