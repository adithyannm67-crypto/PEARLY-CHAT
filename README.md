# Peerly — Peer-to-Peer Chat

Peerly is a browser-based, one-to-one chat application. It uses **WebRTC DataChannels** to send live chat messages directly between two connected browsers. A **Node.js HTTP and WebSocket server** handles authentication-related API requests and WebRTC signaling, while **Supabase** provides authentication, PostgreSQL data storage, row-level security, and Realtime updates.

> **Architecture note:** WebRTC signaling is relayed through the backend, but chat payloads are sent over the peer-to-peer data channel after the WebRTC connection is established. The backend also receives a separate request to persist sent messages so conversation history can be loaded later.

## Features present in the source

- Account registration, sign-in, sign-out, password recovery, and the authentication callback flow.
- Username-based and email-based sign-in support in the backend authentication flow.
- User lookup and profile data, including username, full name, and avatar URL fields.
- Direct conversation creation and conversation listing.
- Connection requests, request status handling, and connection-request history.
- One-to-one WebRTC connections using `RTCPeerConnection` and an RTCDataChannel.
- WebSocket signaling for authentication, room membership, offers, answers, and ICE candidates.
- WebRTC Perfect Negotiation with deterministic polite/impolite roles, offer-collision handling, and ICE-candidate queuing (as documented and implemented in the peer-connection client).
- Data-channel message acknowledgements, duplicate-message suppression, and an acknowledgement timeout.
- Best-effort message persistence through the backend messages API.
- Supabase Realtime subscriptions for dashboard data changes and Supabase Realtime Presence for online-user state.
- UI components for chat, typing indicators, notifications, connection status, offline state, settings, search, and request history.

The repository snapshot supplied for this README does **not** contain an implemented map or weather feature. Those features are therefore intentionally not described here.

## Technology stack

### Frontend (`client/`)

- Next.js 16 App Router
- React 19
- TypeScript and JavaScript
- Supabase JavaScript client and `@supabase/ssr`
- Tailwind CSS 4
- Lucide React icons
- Vitest, Testing Library, and JSDOM for client-side tests

### Backend (`server/`)

- Node.js with ECMAScript modules
- Native HTTP server
- `ws` WebSocket server
- Supabase JavaScript client
- Twilio SDK for temporary TURN credentials
- dotenv
- Vitest and Supertest for backend tests

### Infrastructure

- Supabase Auth and PostgreSQL
- Supabase Row Level Security (RLS)
- Supabase Realtime and Realtime Presence
- WebRTC STUN/TURN ICE infrastructure

## High-level architecture

```text
┌──────────────────────────┐              ┌──────────────────────────┐
│       Browser A          │              │       Browser B          │
│                          │              │                          │
│ Next.js / React UI       │              │ Next.js / React UI       │
│ Supabase client          │              │ Supabase client          │
│ RTCPeerConnection        │              │ RTCPeerConnection        │
│ RTCDataChannel           │◄────────────►│ RTCDataChannel           │
└────────────┬─────────────┘   Chat data   └────────────┬─────────────┘
             │                                         │
             │ HTTPS API + WebSocket signaling         │
             └────────────────┬────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Node.js backend │
                    │                  │
                    │ HTTP API         │
                    │ WebSocket server │
                    │ Signaling rooms  │
                    └─────────┬────────┘
                              │
                       Supabase Auth /
                       PostgreSQL / RLS
                       Realtime / Presence
```

The diagram separates the two communication paths:

1. **Signaling and application API:** browsers communicate with the backend over HTTPS and WebSocket. The WebSocket server authenticates sockets, checks conversation membership, manages signaling rooms, and forwards WebRTC negotiation messages.
2. **Chat transport:** once WebRTC is connected, text messages and delivery acknowledgements travel over the RTCDataChannel between the two browsers. The client separately calls the messages API to store a copy for history.

## WebRTC connection lifecycle

1. A signed-in user selects or opens a direct conversation.
2. The client obtains the current Supabase access token and connects to the backend WebSocket endpoint.
3. The client authenticates the socket and sends `JOIN_ROOM` with the conversation ID.
4. The backend verifies that the authenticated user belongs to that conversation before admitting the socket to the room. The room is limited to two distinct participants.
5. When the other participant joins, the clients initialize their peer-connection logic.
6. The peers exchange `OFFER`, `ANSWER`, and `ICE_CANDIDATE` messages through the WebSocket signaling server.
7. The client applies Perfect Negotiation logic to handle simultaneous offers and queues ICE candidates until they can be applied.
8. When the RTCDataChannel opens, the clients can exchange chat messages directly.
9. A received text message is deduplicated by message ID and acknowledged by the receiving peer.
10. After the sender receives the acknowledgement, it attempts to persist the message through `POST /api/messages`. Persistence is best-effort and is separate from peer delivery.

A WebSocket `ROOM_JOINED` or a WebRTC signaling state of `stable` alone does not mean chat is ready. The application also tracks the peer-connection and data-channel states.

## WebSocket signaling protocol

The server handles these client message types:

| Type | Purpose |
|---|---|
| `AUTH` | Authenticate the WebSocket connection using a Supabase access token. |
| `PING` | Request a heartbeat response. |
| `JOIN_ROOM` | Join a conversation after server-side membership verification. |
| `LEAVE_ROOM` | Leave a conversation room. |
| `OFFER` | Forward a WebRTC session description to the other participant. |
| `ANSWER` | Forward the answer session description. |
| `ICE_CANDIDATE` | Forward a trickled ICE candidate. |

Server events include `AUTHENTICATED`, `ROOM_JOINED`, `PEER_JOINED`, `PEER_LEFT`, `PEER_RECONNECTED`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`, `PONG`, and `ERROR`.

The signaling implementation also includes payload-size validation, JSON/payload validation, authentication checks, duplicate-signal suppression, a two-participant room limit, serialized per-socket message handling, and ping/pong heartbeat handling.

## HTTP API

The backend routes are registered in `server/src/server.js`.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/signup` | Create an account. |
| `POST` | `/api/auth/signin` | Sign in using the supported email/username flow. |
| `POST` | `/api/auth/logout` | Sign out and clear authentication cookies. |
| `GET` | `/api/conversations` | Retrieve the authenticated user's conversations. |
| `POST` | `/api/conversations` | Create or retrieve a direct conversation. |
| `GET`, `POST`, `PATCH` | `/api/connection-requests` | Read and manage connection requests, according to the route handler. |
| `GET` | `/api/connection-request-history` | Retrieve connection-request history. |
| `GET`, `POST` | `/api/messages` | Retrieve and persist conversation messages, according to the route handler. |
| `GET` | `/api/users` | Retrieve user information. |
| `GET` | `/api/ice-config` | Return configured STUN servers and, when available, Twilio TURN credentials. |

All protected routes use the backend authentication middleware. The exact accepted request bodies and query parameters are defined in the corresponding route files under `server/src/api/`.

## Database and Supabase

The SQL migrations are located in `client/supabase/migrations/`.

They define or update the application's user/profile data, conversations, conversation participants, messages, connection requests, helper functions, policies, and Realtime publication membership.

The schema uses Supabase Auth user IDs and RLS policies to restrict access. The chat schema migration includes helper functions used for tasks such as checking conversation membership, creating/retrieving a direct conversation, and resolving a username to an email address for the backend sign-in flow. A public-safe user profile view is used to avoid exposing email addresses in profile lookups.

### Apply the migrations

Apply the migration files to the Supabase project in filename order:

1. `20240101_create_profiles_table.sql`
2. `20240102_drop_profiles_use_users.sql`
3. `20240103_chat_schema_policies.sql`
4. `20240104_delete_conversation_policy.sql`
5. `20240105_add_presence_columns.sql`

Use the Supabase SQL Editor or your established migration workflow. Review the SQL and confirm the target project before applying it.

**Important verification note:** the repository's `ERRORS_AND_FIXES.md` records that the RPC functions from `20240103_chat_schema_policies.sql` were not present in the connected Supabase project at the time that note was written. Verify that this migration has actually been applied before relying on conversation creation and username resolution. The presence migration adds database presence columns; the current client presence implementation should be checked in `client/src/hooks/useOnlineStatus.ts` and the dashboard context before assuming that database columns are the sole source of live presence.

## Environment variables

The following names are read by the supplied source. Set values in your local environment and deployment provider; do not commit real credentials.

### Frontend — `client/.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_PUBLIC_SERVER_URL=http://localhost:5000

# Optional client-side STUN entries; the current ICE fetch path
# obtains its effective server list from the backend /api/ice-config endpoint.
NEXT_PUBLIC_STUN_URL_1=stun:YOUR_STUN_SERVER
```

The frontend reads:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SERVER_URL`
- `NEXT_PUBLIC_STUN_URL_1` through `NEXT_PUBLIC_STUN_URL_5` in the ICE helper

### Backend — `server/.env`

```env
PORT=5000
NODE_ENV=development

SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

CLIENT_URL=http://localhost:3000
SERVER_URL=http://localhost:5000

# Used by the ICE configuration route
TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN

# Optional STUN entries read by the backend ICE configuration route
NEXT_PUBLIC_STUN_URL_1=stun:YOUR_STUN_SERVER

# Optional comma-separated WebSocket origin allowlist
ALLOWED_ORIGINS=http://localhost:3000
```

Backend configuration requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CLIENT_URL`, and `SERVER_URL` at startup. `PORT` defaults to `5000`, and `NODE_ENV` defaults to `development`.

**TURN configuration detail:** the current `/api/ice-config` handler returns an HTTP 500 when `TWILIO_ACCOUNT_SID` or `TWILIO_AUTH_TOKEN` is absent. If both are present but Twilio token creation fails, the handler catches that failure and can still return the configured STUN entries. Configure and test this route before expecting TURN relay connectivity.

## Local development

### Requirements

- Node.js version compatible with the installed Next.js version.
- npm.
- A Supabase project with the required migrations applied.
- Twilio credentials if you want the current ICE configuration endpoint to return successfully and issue TURN credentials.

### 1. Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
cd crypto-pearly-chat
```

Use the actual repository URL and directory name for your clone.

### 2. Configure the backend

```bash
cd server
npm install
```

Create `server/.env` using the backend variables above, then start the server:

```bash
npm run dev
```

The backend listens on `0.0.0.0` and defaults to port `5000`.

### 3. Configure the frontend

In a second terminal:

```bash
cd client
npm install
```

Create `client/.env.local` using the frontend variables above, then run:

```bash
npm run dev
```

Open `http://localhost:3000`.

### 4. Verify the application

Test the complete flow with two separate browser sessions or devices:

1. Register or sign in as two different users.
2. Create or accept a connection and open the direct conversation.
3. Confirm both users join the same signaling room.
4. Confirm the WebRTC peer connection reaches `connected` and the data channel opens.
5. Exchange messages in both directions and verify delivery acknowledgements.
6. Refresh the conversation and verify that persisted messages load.
7. Test reconnection and ICE restart behavior on different networks.

## Useful commands

### Frontend

```bash
cd client
npm run dev
npm run build
npm run start
npm run lint

# Run the configured Vitest suite
npx vitest run
```

### Backend

```bash
cd server
npm run dev
npm start
npm run build
npm test
```

The backend `build` script is intentionally a no-op because the backend is plain JavaScript/ESM with no compilation step.

## Project structure

```text
crypto-pearly-chat/
├── README.md
├── ERRORS_AND_FIXES.md
├── client/
│   ├── package.json
│   ├── next.config.ts
│   ├── src/
│   │   ├── app/                  # App Router pages and auth routes
│   │   ├── components/           # Chat, sidebar, notifications, UI
│   │   ├── context/              # Auth, dashboard, notification state
│   │   ├── hooks/                # Conversations, requests, presence/realtime
│   │   ├── lib/
│   │   │   ├── supabase/         # Supabase client/context
│   │   │   └── webrtc/           # Peer connection, signaling, data channel
│   │   └── types/
│   ├── supabase/
│   │   └── migrations/
│   └── tests/
└── server/
    ├── package.json
    ├── src/
    │   ├── server.js             # HTTP server and route registration
    │   ├── api/                  # HTTP API route handlers
    │   ├── config/               # Environment and Supabase clients
    │   ├── services/             # Chat and connection-request services
    │   ├── utils/                # Auth, CORS, cookies, validation, rate limits
    │   └── ws/
    │       └── signaling.ts      # WebSocket signaling and room management
    └── tests/
```

## Deployment considerations

- Deploy the Next.js application and Node.js backend as separate services.
- Set `NEXT_PUBLIC_SERVER_URL` in the frontend to the deployed backend's HTTPS origin. The client uses that base URL for HTTP API calls; the signaling client derives the WebSocket URL from it.
- Set backend `CLIENT_URL` to the deployed frontend origin and configure `ALLOWED_ORIGINS` as appropriate for the production frontend origin(s).
- Configure the Supabase project URL and anon key on both frontend and backend using the correct variable names for each runtime.
- Add the frontend's authentication callback URL to the Supabase Auth redirect URL allowlist.
- Configure Twilio credentials and verify that `/api/ice-config` returns usable ICE server configuration.
- Use HTTPS/WSS in production.
- Keep the signaling backend on a **single instance** unless room state is moved to a shared system. Signaling rooms and socket maps are currently held in process memory; separate backend replicas will not share room membership or signaling messages. A shared pub/sub or signaling adapter (for example, Redis) is needed before horizontal scaling.
- Test TURN connectivity across restrictive NATs, mobile networks, and corporate firewalls. STUN-only connectivity is not guaranteed to work for every pair of networks.

## Security and operational notes

- WebSocket authentication accepts a bearer token in the Authorization header or the `access_token` cookie; the signaling server explicitly avoids accepting tokens in URL query parameters.
- Room joins are checked against conversation membership on the backend.
- HTTP state-changing requests include origin/CSRF checks, and the backend has shared request utilities for authentication, cookie handling, rate limiting, and response formatting.
- Supabase RLS policies are an important part of the data-access boundary; apply and validate the migrations rather than relying only on UI restrictions.
- Do not expose service-role keys, Twilio auth tokens, or other server secrets in frontend variables or source control.
- The in-memory signaling room design is single-process state, not a horizontally scaled messaging fabric.

## Tests

The repository includes:
- Frontend authentication tests in `client/tests/`.
- Backend authentication tests in `server/tests/auth.test.js`.
- Backend API tests in `server/tests/backend.test.js`.
- WebSocket signaling tests in `server/tests/websocket.test.js`.

Run the relevant test commands from each package directory. A passing unit/integration suite does not by itself prove successful peer connectivity across real-world NAT/firewall combinations; test with two independent clients and networks.

## Known limitations and items to verify

- **Single-instance signaling:** room membership and WebSocket routing are stored in in-memory `Map`/`Set` structures. Multi-instance deployment requires shared coordination.
- **Supabase migration state:** verify that the chat schema/RPC migration is applied to the target Supabase project. The repository's error/fix notes explicitly call this out as a required verification.
- **TURN endpoint configuration:** the current ICE endpoint requires Twilio credentials to be configured before it returns successfully.
- **Best-effort persistence:** the message is sent over the data channel first; persistence is attempted after acknowledgement. A persistence failure does not undo a message already delivered to the peer.
- **Data-channel scope:** the supplied data-channel implementation handles text payloads and acknowledgements. Do not assume file, image, or voice-message transfer from this implementation.
- **Presence source:** the codebase contains both database presence columns/migration and client Realtime presence logic. Verify the runtime behavior and migration state in the target Supabase project.
- **Feature scope:** no map or weather implementation was found in the supplied repository snapshot.

---

Peerly is designed as a learning and demonstration project for direct browser-to-browser communication, WebRTC negotiation, WebSocket signaling, and real-time application state.
