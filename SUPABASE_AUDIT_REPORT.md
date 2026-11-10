# Peerly Supabase Audit Report

## Access limitation
This audit is based on the repository migrations and application source. No live Supabase database credentials (service role/database password) were available, so runtime database metadata, RLS inspection, role grants, storage inventory, and pg_stat usage statistics could not be queried directly. The SQL inventory queries below are provided for the Supabase SQL Editor to complete the live portion.

## A. Known application database inventory (from migrations)

| Schema | Entity | Type | Purpose | Classification |
|---|---|---|---|---|
| public | users | table | Application profile, FK to auth.users | ACTIVELY USED |
| public | conversations | table | Conversation containers | ACTIVELY USED |
| public | conversation_participants | table | Membership links | ACTIVELY USED |
| public | messages | table | Persisted messages | ACTIVELY USED |
| public | connection_requests | table | Connection request state | ACTIVELY USED |
| public | public_user_profiles | view | Safe public profile projection | ACTIVELY USED |
| public | is_conversation_participant | function | RLS membership helper | INDIRECTLY USED |
| public | get_or_create_direct_conversation | function (RPC) | Create/reuse direct conversation | ACTIVELY USED |
| public | resolve_email_by_username | function (RPC) | Username-to-email resolution | ACTIVELY USED |
| public | handle_new_user | trigger function | Sync auth signup to public.users | INDIRECTLY USED |
| public | on_auth_user_created | trigger | Fires handle_new_user | INDIRECTLY USED |
| public | users PK/FK to auth.users | constraint | Identity link | INDIRECTLY USED |
| public | conversation FKs | constraints | Referential integrity | INDIRECTLY USED |
| public | unique indexes | indexes | Dedup pending requests, usernames | ACTIVELY/INDIRECTLY USED |
| public | messages/conversation indexes | indexes | Query performance | ACTIVELY USED |
| public | users is_online/last_seen columns | columns | Online presence | POTENTIALLY UNUSED / LEGACY |
| public | users_is_online_idx, users_last_seen_idx | indexes | Presence lookup | POTENTIALLY UNUSED / LEGACY |
| public | users_update_presence policy | RLS policy | Presence updates | POTENTIALLY UNUSED / LEGACY |

## B. Usage mapping (application code)

- `public.users`: server `chatService.js` (select/update), auth signup trigger. Columns used: id, email, username, avatar_url, full_name, created_at. `is_online`, `last_seen` not referenced anywhere.
- `public.conversations`: server delete conversation; RPC creation.
- `public.conversation_participants`: server selects membership; realtime subscriptions.
- `public.messages`: server insert/select; realtime subscription in `useDashboardRealtime.ts`.
- `public.connection_requests`: server CRUD; realtime subscription.
- `public.public_user_profiles`: server selects public columns; view includes presence columns not selected by code.
- RPCs: `get_or_create_direct_conversation`, `resolve_email_by_username` invoked in server.
- Auth: client AuthProvider uses Supabase Auth. Storage: no storage operations found.

## C. Potentially unused entities

1. `public.users.is_online`
2. `public.users.last_seen`
3. `public.users_is_online_idx`
4. `public.users_last_seen_idx`
5. `public.users_update_presence` RLS policy
6. Presence columns in `public.public_user_profiles` view

Reason: online/offline presence feature was removed (commit c721f04), and no code references these columns/indexes/policy.

## D. Dependency warnings

- `public_user_profiles` view depends on `users`; removing columns from view requires recreating the view.
- `users_update_own` policy still covers normal user updates, so removing `users_update_presence` does not remove update capability, but it may affect clients expecting presence updates.
- Dropping columns is destructive and could break older clients or external integrations.

## E. Recommended cleanup

| Entity | Type | Reason unused | Evidence | Dependencies | Risk | Recommendation |
|---|---|---|---|---|---|---|
| is_online | column | Presence feature removed | No code refs | view | Medium | Investigate |
| last_seen | column | Presence feature removed | No code refs | view | Medium | Investigate |
| users_is_online_idx | index | Presence feature removed | No code refs | none | Low | Candidate for Removal |
| users_last_seen_idx | index | Presence feature removed | No code refs | none | Low | Candidate for Removal |
| users_update_presence | RLS policy | Presence feature removed | No code refs | users table | Medium | Investigate |

No core table, RPC, trigger, or index supporting active queries is recommended for removal.

## F. Proposed cleanup SQL (do not execute without approval)

```sql
-- Candidate cleanup for removed presence feature only.
-- Review and run manually if approved.

BEGIN;

DROP INDEX IF EXISTS public.users_is_online_idx;
DROP INDEX IF EXISTS public.users_last_seen_idx;

DROP POLICY IF EXISTS users_update_presence ON public.users;

-- Recreate public profile view without presence columns.
DROP VIEW IF EXISTS public.public_user_profiles;
CREATE VIEW public.public_user_profiles AS
SELECT id, username, avatar_url, full_name, created_at
FROM public.users;

REVOKE ALL ON public.public_user_profiles FROM anon, authenticated;
GRANT SELECT ON public.public_user_profiles TO authenticated;

-- Optional, higher-risk column removal (investigate first):
-- ALTER TABLE public.users DROP COLUMN IF EXISTS is_online;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS last_seen;

COMMIT;
```

## Live verification queries (run in Supabase SQL Editor)

```sql
SELECT schemaname, tablename FROM pg_tables WHERE schemaname IN ('public','auth','storage');
SELECT * FROM pg_views WHERE schemaname IN ('public','auth','storage');
SELECT n.nspname, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','auth','storage');
SELECT * FROM pg_triggers WHERE tgrelid::regclass::text LIKE 'public.%';
SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname IN ('public','auth','storage');
SELECT relname, indexrelname, idx_scan FROM pg_stat_user_indexes ORDER BY idx_scan;
SELECT relname, seq_scan, idx_scan, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables;
```

Awaiting your approval before any cleanup.
