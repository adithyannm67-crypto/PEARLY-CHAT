# Peerly — Errors and Fixes

> Status: code fixes are applied. Client lint, typecheck, and production build pass;
> backend syntax checks and unauthenticated endpoint checks pass. The Supabase
> migration `client/supabase/migrations/20240103_chat_schema_policies.sql` still
> needs to be applied before authenticated flows can be fully verified.

## Apply the Migration First

The connected Supabase project does not currently have the RPCs from this
migration. Probing `resolve_email_by_username`, `get_or_create_direct_conversation`,
and `is_conversation_participant` returns `PGRST202`, so `POST /api/conversations`
cannot use the secure RPC yet.

1. Open the Supabase Dashboard for this project.
2. Go to **SQL Editor**.
3. Paste the full contents of
   `client/supabase/migrations/20240103_chat_schema_policies.sql`.
4. Run it once, then retry creating a conversation.

The migration is idempotent and can be re-run safely. It also forces the
`SECURITY DEFINER` helpers to be owned by the table owner, which is required for
them to bypass RLS during conversation creation.

Verify it with:

```sql
SELECT proname, pg_get_userbyid(proowner) AS owner
FROM pg_proc
WHERE proname IN (
  'resolve_email_by_username',
  'get_or_create_direct_conversation',
  'is_conversation_participant'
);
```

The owner should match the owner of `public.conversations`/`public.users`.

## Auth / Signup / Signin

1. **Error:** `public.users` has RLS enabled with no policies, so username lookup and most user reads are denied.
   **Fix:** Add RLS policies for `users` and chat tables; use authenticated Supabase clients for user-scoped queries; use a server-side security-definer function for login lookup.

2. **Error:** Signup confirmation redirect points to the backend, which has no `/auth/callback` route.
   **Fix:** Set `emailRedirectTo` to `${CLIENT_URL}/auth/callback`, add the client callback page, and whitelist the URL in Supabase Auth.

3. **Error:** Signup page links to `/login`, but the real route is `/auth/login`.
   **Fix:** Change the link to `/auth/login`.

4. **Error:** Usernames are stored without normalization but looked up lowercased, so mixed-case usernames cannot log in.
   **Fix:** Normalize usernames to lowercase on signup, profile update, and lookup; add a unique index on `lower(username)`.

5. **Error:** Backend cookies are set only at login and never refreshed, so the custom access-token cookie goes stale after about one hour.
   **Fix:** Forward the browser’s refreshed Supabase access token as `Authorization: Bearer` to Next/backend. Cookie refresh/rotation remains optional if cookies are kept as a fallback.

6. **Error:** Signup accepts empty name/username values.
   **Fix:** Validate both fields server-side and client-side; enforce username format `[a-z0-9_]{3,30}`.

7. **Error:** Duplicate usernames are silently swallowed by the signup trigger, creating auth users without `public.users` rows.
   **Fix:** Remove the trigger’s `unique_violation` exception handler and pre-check the username before signup; return `409 Conflict`.

8. **Error:** All server exceptions are returned as HTTP 500, including validation and auth failures.
   **Fix:** Add an `HttpError(status, message)` class and map `error.status` in the server catch block.

9. **Error:** Sensitive debug logging exposes access tokens, cookie names, and user data.
   **Fix:** Remove token/user/cookie logs; log only method/path in development.

10. **Error:** `/api/auth/resolve-username` exposes email addresses and enables account enumeration.
    **Fix:** Move username resolution inside the signin endpoint, add rate limiting, and return generic auth errors. **Partial:** the security-definer lookup RPC is still callable with the public anon key.

11. **Error:** Logout clears cookies but does not revoke the Supabase refresh token.
    **Fix:** Call Supabase sign-out with the user session before clearing cookies; clear custom and `sb-*` cookies.

## Middleware / Session

12. **Error:** Middleware uses a plain Supabase client with no cookie storage, so `getSession()` is effectively always null.
    **Fix:** Remove the broken middleware and rely on the client auth guard plus API authorization.

13. **Error:** Middleware checks `/login` and `/register`, but the app uses `/auth/login` and `/auth/signup`.
    **Fix:** Remove the broken middleware; dashboard redirects unauthenticated users to `/auth/login`.

14. **Error:** Missing Supabase env vars cause `createClient(undefined, undefined)` instead of a safe fallback.
    **Fix:** Removed with the middleware deletion.

15. **Error:** The unused SSR Supabase helper writes refreshed cookies only to the request object, never the response.
    **Fix:** Removed the unused helper.

## Conversations / Dashboard

16. **Error:** `GET /api/conversations` trusts the `userId` query parameter, allowing any user ID to be read.
    **Fix:** Require authentication and derive `userId` from the verified Supabase JWT.

17. **Error:** `POST /api/conversations` trusts `userId` from the request body, allowing impersonation.
    **Fix:** Derive the user from the token and ignore client-supplied `userId`; validate `otherUserId`.

18. **Error:** Conversation creation mixes authenticated and anon Supabase clients, breaking under RLS.
    **Fix:** Use one authenticated client per request and move direct-conversation creation into a security-definer RPC.

19. **Error:** Stale-token failures after access-token expiry.
    **Fix:** Same as item 5: send the refreshed bearer token through Next proxies to the backend.

20. **Error:** Conversations and messages do not update in real time.
    **Fix:** Subscribe to `messages` `postgres_changes` in the dashboard and chat view; enable the Realtime publication in the migration.

## Messages

21. **Error:** Message GET/POST endpoints have no authorization and trust the client-supplied `senderId`.
    **Fix:** Require auth, derive `senderId` from the token, and verify conversation membership before reading or writing.

22. **Error:** Next message proxies drop cookies and authorization headers.
    **Fix:** Forward both `Cookie` and `Authorization` to the backend for all proxies.

23. **Error:** Switching conversations leaves old messages visible while the new conversation loads.
    **Fix:** Clear message/input/error state whenever `conversationId` changes; deduplicate realtime and send responses by message ID.

## New Chat / Settings

24. **Error:** `PATCH /api/users` trusts `userId` and allows updating any user.
    **Fix:** Authenticate, derive the user ID from the token, and update only the authenticated user. Forward auth headers from the Next proxy.

25. **Error:** New-chat user listing is blocked by `users` RLS and returns private emails.
    **Fix:** Add a public-safe profile view without emails and RLS policies; return only `id`, `username`, `full_name`, and `avatar_url`.

26. **Error:** Existing `auth.users` are not backfilled into `public.users`.
    **Fix:** Add a migration backfill using auth metadata, handling duplicate usernames before adding the unique index.

27. **Error:** User search only filters the currently loaded list.
    **Fix:** Add server-side search with `ilike`, a result limit, and debounced client queries.

## Data / Server Infrastructure

28. **Error:** `parseBody` references undefined `HttpError`, which can crash on oversized payloads.
    **Fix:** Add and import the real `HttpError` class; return `413` for oversized bodies.

29. **Error:** `new Error(400, "message")` sets the message to `"400"` and loses the real validation message.
    **Fix:** Replace all invalid error constructions with `HttpError` and return the correct status/message.

30. **Error:** Fresh databases lack `conversations`, `conversation_participants`, `messages`, and `connection_requests`.
    **Fix:** Add migrations for all chat tables, indexes, foreign keys, RLS policies, and Realtime.

31. **Error:** CORS is hardcoded to `http://localhost:3000`.
    **Fix:** Read allowed origins from `CLIENT_URL`/`ALLOWED_ORIGINS` and only reflect allowed origins.

32. **Error:** Legacy auth utility uses `module.exports` in an ESM project and a Supabase v1 `auth.api.setCookie` API.
    **Fix:** Remove the unused broken utility.

33. **Error:** Cookies are parsed twice via a second `server.on("request")` listener.
    **Fix:** Parse cookies once before routing and let `getAccessToken` reuse `req.cookies`.

## Verification Checklist

- Apply `20240103_chat_schema_policies.sql` in Supabase.
- Set `CLIENT_URL` on the backend and add it to Supabase Auth redirect URLs.
- Test signup, email confirmation callback, username login, email login, logout, dashboard load, New Chat, Settings, message send, and Realtime.
- Run `npm run lint` and `npx tsc --noEmit` in `client/`.
- Run `node --check` on changed server files.
