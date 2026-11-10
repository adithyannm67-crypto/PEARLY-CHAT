# Peerly – Real-Time Peer-to-Peer Chat Application

**Peerly** is a real-time communication platform designed to enable seamless interaction between users through peer-to-peer (P2P) communication.

Built using WebRTC, WebSockets, and Supabase, Peerly combines real-time messaging, user presence, and direct peer connections into a modern chat experience.

## 🚀 Live Demo

- **Application:** https://pearly-chat.vercel.app
- **Backend:** https://pearly-chat.onrender.com

---

## ✨ Features

### 💬 Real-Time Messaging
- Instant messaging between users.
- Peer-to-peer communication using WebRTC DataChannels.
- WebSocket-based signaling for connection establishment.
- Reliable message delivery over established peer connections.

### 📞 WebRTC Communication
- Direct peer-to-peer connections.
- ICE candidate exchange.
- STUN server configuration for NAT traversal.
- Connection state monitoring.
- Automatic connection handling and recovery mechanisms.

### 🟢 Real-Time Presence
- Online and offline user status.
- Real-time presence synchronization.
- Multi-tab presence management.
- Heartbeat-based connection monitoring.
- Presence cleanup when users disconnect.

### 🔐 Authentication
- Secure user authentication using Supabase.
- Session management.
- Authenticated WebSocket connections.

### 📍 Location & Weather
- Location-based functionality.
- Map integration.
- Weather information.

### 📱 Responsive Interface
- Mobile-friendly design.
- Responsive chat interface.
- Modern messaging experience inspired by familiar chat applications.

---

## 🏗️ System Architecture

Peerly follows a hybrid architecture combining centralized signaling with decentralized communication.

```text
                 USER A
                    |
                    |
              React Client
                    |
                    |
              WebSocket
                    |
                    |
           Signaling Server
                    |
                    |
              WebSocket
                    |
                    |
              React Client
                    |
                    |
                 USER B


       After WebRTC Negotiation

             USER A
                |
                |
          WebRTC DataChannel
                |
                |
             USER B
```

### How It Works

**1. Authentication**
- Users authenticate through Supabase.
- The client obtains an authentication token.

**2. WebSocket Connection**
- The client establishes a WebSocket connection with the backend.
- The connection is authenticated using the user's access token.

**3. Signaling**
- The signaling server coordinates connection establishment.
- Users exchange WebRTC offers, answers, and ICE candidates.

**4. WebRTC Negotiation**
- The peers create RTCPeerConnection instances.
- SDP offers and answers establish the connection parameters.
- ICE candidates help discover a viable network path.

**5. Peer-to-Peer Communication**
- Once the connection is established, a WebRTC DataChannel is used for direct messaging.
- Messages travel between peers without requiring the signaling server to relay every message.

**6. Presence Synchronization**
- Supabase Realtime helps maintain and synchronize user presence.
- Multi-tab tracking prevents incorrect online/offline status transitions.

---

## 🛠️ Technology Stack

| Category | Technology |
|---|---|
| Frontend | React |
| Language | TypeScript |
| Styling | CSS / Tailwind CSS |
| Backend | Node.js |
| Signaling | WebSocket |
| Peer Communication | WebRTC |
| Authentication | Supabase Auth |
| Real-Time Presence | Supabase Realtime |
| Network Traversal | STUN / ICE |
| Frontend Deployment | Vercel |
| Backend Deployment | Render |

---

## 📂 Project Structure

```text
peerly/
│
├── client/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── hooks/
│       ├── pages/
│       ├── services/
│       ├── utils/
│       └── ...
│
├── server/
│   ├── src/
│   │   ├── routes/
│   │   ├── websocket/
│   │   ├── services/
│   │   └── ...
│   └── ...
│
└── README.md
```

*The directory structure above represents the logical organization; actual filenames may vary.*

---

## ⚙️ Getting Started

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- Git
- A Supabase account

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd peerly
```

### 2. Install Dependencies

Install frontend dependencies:

```bash
cd client
npm install
```

Install backend dependencies:

```bash
cd ../server
npm install
```

### 3. Configure Environment Variables

Create the appropriate `.env` files for the frontend and backend.

**Frontend environment variables**

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:PORT
VITE_WS_URL=ws://localhost:PORT
```

**Backend environment variables**

```env
PORT=your_server_port
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace these example variable names with the exact names expected by your application.

Never commit actual secrets or credentials to Git.

### 4. Start the Backend

```bash
cd server
npm run dev
```

### 5. Start the Frontend

Open another terminal:

```bash
cd client
npm run dev
```

The application should now be accessible through the local development URL displayed by Vite.

---

## 🌐 Deployment

Peerly uses separate deployment environments for the frontend and backend.

| Component | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |

### Frontend – Vercel
- Connect the GitHub repository.
- Configure the frontend root directory.
- Add the required environment variables.
- Deploy the application.

### Backend – Render
- Connect the GitHub repository.
- Configure the backend root directory.
- Configure the build and start commands.
- Add backend environment variables.
- Deploy the WebSocket signaling server.

Ensure the frontend API and WebSocket URLs point to the deployed backend.

---

## 🔄 WebRTC Connection Lifecycle

```text
User A                  Signaling Server              User B
  |                            |                         |
  |------ Connect ------------>|<------ Connect --------|
  |                            |                         |
  |------ Create Offer ------->|                         |
  |                            |------ Forward Offer -->|
  |                            |                         |
  |                            |<----- Send Answer ------|
  |<----- Forward Answer ------|                         |
  |                            |                         |
  |------ ICE Candidates ----->|                         |
  |                            |------ ICE Candidates -->|
  |                            |                         |
  |=========== ICE Connectivity Checks ================|
  |                            |                         |
  |<============ P2P Connection Established ===========>|
  |                            |                         |
  |<========== WebRTC DataChannel Communication ========>|
```

The signaling server is primarily responsible for connection coordination. Once a direct connection is established, supported communication takes place through the WebRTC DataChannel.

---

## 🔒 Security Considerations

- Authenticate WebSocket connections.
- Validate user permissions before joining conversations.
- Keep sensitive environment variables out of the frontend.
- Use HTTPS and secure WebSocket connections (WSS) in production.
- Validate incoming signaling messages.
- Use Supabase security policies to protect application data.

---

## 🎯 Project Objective

The primary objective of Peerly is to explore and implement peer-to-peer networking in a practical real-world application.

The project demonstrates:

- WebRTC connection establishment.
- WebSocket signaling architecture.
- SDP offer/answer negotiation.
- ICE candidate exchange.
- NAT traversal concepts.
- Real-time user presence.
- Hybrid client-server and peer-to-peer communication.

## 👨‍💻 Project

**Peerly – Peer-to-Peer Real-Time Communication**

Built to explore modern networking concepts and real-time communication technologies.
