-- Supabase Auth cleanup script.
-- Deletes ALL Supabase Authentication users and cascaded auth data.
-- Does NOT touch public schema tables, storage, provider settings, or config.
-- Run in Supabase SQL Editor as project owner.

-- 1. Inspect current Auth users (and related auth rows).
SELECT id, email, created_at, last_sign_in_at
FROM auth.users
ORDER BY created_at;

SELECT 'auth.users' AS table_name, COUNT(*) AS row_count FROM auth.users
UNION ALL
SELECT 'auth.identities', COUNT(*) FROM auth.identities
UNION ALL
SELECT 'auth.sessions', COUNT(*) FROM auth.sessions
UNION ALL
SELECT 'auth.refresh_tokens', COUNT(*) FROM auth.refresh_tokens
UNION ALL
SELECT 'auth.mfa_factors', COUNT(*) FROM auth.mfa_factors;

-- 2. Delete all Auth users. Cascades to identities, sessions, tokens, MFA, etc.
--    (public.users rows are already cleared; any residual rows would cascade too.)
BEGIN;
DELETE FROM auth.users;
COMMIT;

-- 3. Verify no Auth users remain.
SELECT 'auth.users' AS table_name, COUNT(*) AS row_count FROM auth.users
UNION ALL
SELECT 'auth.identities', COUNT(*) FROM auth.identities
UNION ALL
SELECT 'auth.sessions', COUNT(*) FROM auth.sessions
UNION ALL
SELECT 'auth.refresh_tokens', COUNT(*) FROM auth.refresh_tokens
UNION ALL
SELECT 'auth.mfa_factors', COUNT(*) FROM auth.mfa_factors;
