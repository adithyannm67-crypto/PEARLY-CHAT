# Peerly — Errors and Fixes

> Status: All client TypeScript checks pass; all server Node syntax checks pass.
> WebRTC Perfect Negotiation implemented. Supabase migration
> `client/supabase/migrations/20240103_chat_schema_policies.sql` still
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

Also ensure `public.conversation_participants` is added to the
`supabase_realtime` publication (included in the migration) so participant
change events are delivered for Realtime subscriptions.

## Completed Fixes (this session)

### WebRTC / Signaling

1. **WebRTC Perfect Negotiation implemented** — `peerConnection.ts` rewritten
   with deterministic polite/impolite roles (`localUserId > peerUserId`),
   `onnegotiationneeded`-driven offer creation, offer collision handling
   (polite peer rolls back + re-negotiates; impolite peer ignores colliding
   offers), ICE candidate queuing + flushing, and single reused
   `RTCPeerConnection` per conversation. Data channel created once by the
   polite peer, received by the impolite peer via `ondatachannel`.

2. **Duplicate WebSocket logs eliminated** — `signaling.js` message handling
   serialized per socket (`socket._chain` promise chain) so `JOIN_ROOM` can't
   race ahead of a pending `AUTH`. Auto-auth guards against duplicate
   `AUTHENTICATED` responses. `handleJoinRoom` suppresses duplicate
   `PEER_JOINED` on re-joins.

3. **ICE candidate dedup on server** — 30-second TTL cache keyed by
   `conversationId|type|senderId|payloadHash` prevents re-broadcasting
   identical trickle ICE candidates during WebRTC negotiation.

4. **Sender-side ICE candidate queue** — `peerConnection.ts` queues candidates
   generated before the WebSocket is ready and flushes them after connect.
   Added `flushIceCandidates()` called from `useWebRTC.connect()`.

5. **Data channel disconnect error fixed** — `dataChannel.ts` adds `isClosing`
   flag to suppress benign `onerror` during intentional `channel.close()`.
   `useWebRTC.ts` logs data channel errors without tearing down connection
   state.

6. **Disconnect bug fixed** — `useWebRTC.disconnect()` saves `conversationId`
   before nulling it, so `LEAVE_ROOM` uses the correct ID.

7. **Duplicate room joining fixed** — Room joined exactly once in `connect()`
   after authentication; removed join from `onAuthenticated`.

8. **Manual offer creation removed** — Negotiation driven by
   `onnegotiationneeded` in `peerConnection.ts`, not by `onPeerJoined`.

9. **Connection state corrected** — `signalingState === 'stable'` no longer
   treated as proof of connection. `iceConnectionState` and
   `RTCDataChannel.readyState` used appropriately.

### Supabase Realtime / Presence

10. **Presence migrated to Supabase Realtime Presence** — `usePresence.ts`
    switched from `postgres_changes` on `users` table + 30-second REST API
    heartbeat to `presence:global` channel with `channel.track()` heartbeat.
    DB `is_online`/`last_seen` synced only on mount/unmount.

11. **Presence 'not iterable' error fixed** — `newPresences`/`leftPresences`
    null-checked; `Object.values()` used instead of `Object.entries()`;
    presence values handled as both single objects and arrays.

12. **Presence disconnect errors fixed** — `channel.track()`, `channel.untrack()`,
    and `supabase.removeChannel()` wrapped in try/catch to prevent unhandled
    errors during disconnect/page unload.

13. **Realtime subscriptions optimized** — `useDashboardRealtime.ts` split
    `event: "*"` into specific events (INSERT/DELETE for participants,
    INSERT/UPDATE for connection_requests with status-change checks). Removed
    bare unfiltered `connection_requests` subscription that logged every DB
    event in the table.

14. **ChatArea presence status deduped** — Merged identical `false`/`undefined`
    branches into a single ternary. `lastSeen` formatted via `formatDateLabel`.

### Messages API

15. **Query param name fixed** — `selectedConversationId` → `conversationId`
    to match backend route expectation. Added `console.error` in catch block.

### Auth / Signup / Signin (pre-existing, partially addressed)

16. **Signup validation** — Email pattern, password length (8+), name required,
    username format `[a-z0-9_]{3,30}`. Duplicate username pre-checked via RPC.
    `emailRedirectTo` set to `${CLIENT_URL}/auth/callback`.

17. **Signin** — Rate limited. Username resolved via `resolve_email_by_username`
    RPC. Generic auth errors returned.

18. **Logout** — Revokes Supabase session via `createUserClient` + `signOut()`,
    clears `access_token`, `refresh_token`, and `sb-*` cookies.

### Quick error / UX fixes (errors-and-fixes branch)

19. **ANSWER server logging added** — `server/src/ws/signaling.js` now logs
    `[SERVER-OFFER]` for ANSWER receive and forward (previously only OFFER and
    ICE_CANDIDATE were logged).

20. **Malformed WebSocket messages logged** —
    `client/src/lib/webrtc/signalingClient.ts` `ws.onmessage` now logs malformed
    JSON instead of silently ignoring parse errors.

21. **Data channel internal state fix** —
    `client/src/lib/webrtc/dataChannel.ts` no longer sets
    `this.state = 'failed'` on benign `onerror` during disconnect; only calls
    `onError` handler.

22. **Shared logger extracted** —
    `client/src/lib/webrtc/logger.ts` created with `getBrowserName()` and
    `log()`; imported by `peerConnection.ts` and `signalingClient.ts`, removing
    duplicated function bodies.

23. **Server env var names fixed** — `server/src/config/supabase.js`,
    `server/src/config/supabase-auth.js`, and
    `server/src/api/auth/logout/route.js` now read `SUPABASE_URL` and
    `SUPABASE_ANON_KEY` instead of the Next.js client-side convention
    `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `.env` already
    defines both names.

24. **WebRTC data channel messages persisted** — `useWebRTC.ts` `sendMessage`
    now POSTs to `/api/messages` via `authFetch` after sending via the data
    channel, so chat history persists across page refreshes. Persistence is
    best-effort; the message is still sent via the data channel even if the API
    call fails. `ChatArea.tsx` `handleSend` awaits the async `sendMessage`.

25. **STUN/TURN server config moved to backend** — `server/src/api/ice-config/route.js`
    provides GET /api/ice-config endpoint that generates temporary TURN credentials
    via Twilio SDK. `client/src/lib/webrtc/iceServers.ts` fetches ICE config from
    backend via authFetch. No Twilio credentials are exposed to frontend.
    Documented in `client/.env.example`.

## Required for Deployment

The following must be resolved before deploying to production. Without them,
the app will not work reliably for real users across different networks.

1. **In-memory signaling rooms scaled** — `server/src/ws/signaling.js` `rooms`
   Map is per-process. Works fine on a single server instance, but will break
   if you run multiple replicas (e.g. on Railway, Fly, Render, or Kubernetes).
   Add Redis/pubsub adapter or document single-instance-only deployment.

## Optional / Refactoring / Nice-to-Have

None remaining — all optional items completed.

## Verification Checklist

- Apply `20240103_chat_schema_policies.sql` in Supabase.
- Set `CLIENT_URL` on the backend and add it to Supabase Auth redirect URLs.
- Test signup, email confirmation callback, username login, email login, logout,
  dashboard load, New Chat, Settings, message send, Realtime, and WebRTC call
  between two browsers.
- Run `npm run lint` and `npx tsc --noEmit` in `client/`.
- Run `node --check` on changed server files.
- Verify TURN server works for cross-NAT WebRTC connections.
- Verify chat history persists across page refreshes.
- Verify WebRTC connection works on cellular / different networks (TURN).
