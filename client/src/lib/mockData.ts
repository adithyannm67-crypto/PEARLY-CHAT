export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string; // initials like 'JD'
  status: 'online' | 'offline' | 'away';
  lastSeen: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: string; // ISO string
  status: 'sent' | 'delivered' | 'read';
}

export interface Conversation {
  id: string;
  participants: string[]; // user IDs
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export const MOCK_CREDENTIALS = {
  username: 'demo',
  password: 'password123',
};

export const currentUser: User = {
  id: 'user-0',
  name: 'Alex Morgan',
  username: 'alexm',
  email: 'alex@peerly.io',
  avatar: 'AM',
  status: 'online',
  lastSeen: 'Just now',
};

export const mockUsers: User[] = [
  currentUser,
  {
    id: 'user-1',
    name: 'Sarah Chen',
    username: 'sarahc',
    email: 'sarah.chen@peerly.io',
    avatar: 'SC',
    status: 'online',
    lastSeen: 'Just now',
  },
  {
    id: 'user-2',
    name: 'Marcus Johnson',
    username: 'marcusj',
    email: 'marcus.j@peerly.io',
    avatar: 'MJ',
    status: 'away',
    lastSeen: '15m ago',
  },
  {
    id: 'user-3',
    name: 'Priya Patel',
    username: 'priyap',
    email: 'priya.patel@peerly.io',
    avatar: 'PP',
    status: 'online',
    lastSeen: 'Just now',
  },
  {
    id: 'user-4',
    name: 'James Wilson',
    username: 'jamesw',
    email: 'james.wilson@peerly.io',
    avatar: 'JW',
    status: 'offline',
    lastSeen: '2h ago',
  },
  {
    id: 'user-5',
    name: 'Elena Rodriguez',
    username: 'elenar',
    email: 'elena.rodriguez@peerly.io',
    avatar: 'ER',
    status: 'online',
    lastSeen: 'Just now',
  },
  {
    id: 'user-6',
    name: 'David Kim',
    username: 'davidk',
    email: 'david.kim@peerly.io',
    avatar: 'DK',
    status: 'offline',
    lastSeen: 'Yesterday',
  },
  {
    id: 'user-7',
    name: 'Olivia Thompson',
    username: 'oliviat',
    email: 'olivia.t@peerly.io',
    avatar: 'OT',
    status: 'away',
    lastSeen: '45m ago',
  },
  {
    id: 'user-8',
    name: 'Ryan Nakamura',
    username: 'ryann',
    email: 'ryan.nakamura@peerly.io',
    avatar: 'RN',
    status: 'offline',
    lastSeen: '2d ago',
  },
];

export const mockMessages: Message[] = [
  // Conversation 1: Alex Morgan & Sarah Chen (WebRTC signaling & canary deployment)
  {
    id: 'msg-101',
    conversationId: 'conv-1',
    senderId: 'user-1',
    content: 'Hey Alex! Have you had a chance to review the PR for the WebRTC signaling layer?',
    timestamp: '2026-11-03T16:24:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-102',
    conversationId: 'conv-1',
    senderId: 'user-0',
    content: 'Just pulled it down! The connection fallback mechanism looks super solid.',
    timestamp: '2026-11-03T16:32:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-103',
    conversationId: 'conv-1',
    senderId: 'user-1',
    content: 'Awesome. I was a bit worried about ICE restart edge cases on flaky mobile networks.',
    timestamp: '2026-11-03T16:35:10.000Z',
    status: 'read',
  },
  {
    id: 'msg-104',
    conversationId: 'conv-1',
    senderId: 'user-0',
    content: 'Tested it with high packet loss simulation and it recovered in under 200ms. Approved and left a couple of minor comments!',
    timestamp: '2026-11-04T08:45:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-105',
    conversationId: 'conv-1',
    senderId: 'user-1',
    content: 'Thanks! Addressed those comments and merged into staging.',
    timestamp: '2026-11-04T09:12:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-106',
    conversationId: 'conv-1',
    senderId: 'user-0',
    content: 'Let\'s roll it out to the canary fleet after lunch.',
    timestamp: '2026-11-04T09:30:15.000Z',
    status: 'read',
  },
  {
    id: 'msg-107',
    conversationId: 'conv-1',
    senderId: 'user-1',
    content: 'Sounds like a plan. I\'ll monitor Datadog during the rollout.',
    timestamp: '2026-11-04T09:55:00.000Z',
    status: 'delivered',
  },

  // Conversation 2: Alex Morgan & Marcus Johnson (Weekend hike & coffee meetup)
  {
    id: 'msg-201',
    conversationId: 'conv-2',
    senderId: 'user-2',
    content: 'Hey Alex, are we still on for the hiking trail this Saturday?',
    timestamp: '2026-11-03T14:10:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-202',
    conversationId: 'conv-2',
    senderId: 'user-0',
    content: 'Definitely! Weather forecast looks crisp and clear. Mount Tam trail?',
    timestamp: '2026-11-03T14:18:20.000Z',
    status: 'read',
  },
  {
    id: 'msg-203',
    conversationId: 'conv-2',
    senderId: 'user-2',
    content: 'Yes! The Dipsea trail loop. Let\'s start early before the parking fills up.',
    timestamp: '2026-11-03T14:22:45.000Z',
    status: 'read',
  },
  {
    id: 'msg-204',
    conversationId: 'conv-2',
    senderId: 'user-0',
    content: 'Works for me. How does 7:30 AM at the trailhead sound?',
    timestamp: '2026-11-03T15:05:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-205',
    conversationId: 'conv-2',
    senderId: 'user-2',
    content: 'Perfect. I\'ll bring the pour-over gear for summit coffee.',
    timestamp: '2026-11-03T15:12:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-206',
    conversationId: 'conv-2',
    senderId: 'user-0',
    content: 'Haha legendary. See you Saturday morning!',
    timestamp: '2026-11-04T07:45:00.000Z',
    status: 'read',
  },

  // Conversation 3: Alex Morgan & Priya Patel (Design feedback & dark mode tokens)
  {
    id: 'msg-301',
    conversationId: 'conv-3',
    senderId: 'user-3',
    content: 'Alex, I updated the Figma tokens for the dark mode surface contrast.',
    timestamp: '2026-11-03T11:20:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-302',
    conversationId: 'conv-3',
    senderId: 'user-0',
    content: 'Checking it out now! The #1E293B surface against #101827 main background has much better depth.',
    timestamp: '2026-11-03T11:35:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-303',
    conversationId: 'conv-3',
    senderId: 'user-3',
    content: 'Glad you like it! Did you notice the subtle focus ring style?',
    timestamp: '2026-11-03T11:42:15.000Z',
    status: 'read',
  },
  {
    id: 'msg-304',
    conversationId: 'conv-3',
    senderId: 'user-0',
    content: 'Yeah, the 2px primary offset ring looks crisp on inputs. Much cleaner than standard browser outlines.',
    timestamp: '2026-11-03T12:05:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-305',
    conversationId: 'conv-3',
    senderId: 'user-3',
    content: 'Quick question: should we increase the base font size for chat messages on mobile?',
    timestamp: '2026-11-04T08:15:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-306',
    conversationId: 'conv-3',
    senderId: 'user-0',
    content: '14px with 1.5 line-height feels great on smaller screens without sacrificing information density.',
    timestamp: '2026-11-04T08:24:30.000Z',
    status: 'read',
  },
  {
    id: 'msg-307',
    conversationId: 'conv-3',
    senderId: 'user-3',
    content: 'Makes total sense. I\'ll finalize the component spec and send over the spacing guidelines.',
    timestamp: '2026-11-04T08:50:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-308',
    conversationId: 'conv-3',
    senderId: 'user-0',
    content: 'Awesome, ready to implement whenever you push the spec!',
    timestamp: '2026-11-04T09:10:00.000Z',
    status: 'read',
  },

  // Conversation 4: Alex Morgan & James Wilson (Database migration & production rollout)
  {
    id: 'msg-401',
    conversationId: 'conv-4',
    senderId: 'user-4',
    content: 'Hey Alex, heads up: we need to run the database migration for message reactions tonight.',
    timestamp: '2026-11-03T17:00:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-402',
    conversationId: 'conv-4',
    senderId: 'user-0',
    content: 'Got it. Is it a non-blocking schema change or will there be brief downtime?',
    timestamp: '2026-11-03T17:15:30.000Z',
    status: 'read',
  },
  {
    id: 'msg-403',
    conversationId: 'conv-4',
    senderId: 'user-4',
    content: 'Zero downtime — adding nullable columns and a backfill worker script.',
    timestamp: '2026-11-03T17:22:10.000Z',
    status: 'read',
  },
  {
    id: 'msg-404',
    conversationId: 'conv-4',
    senderId: 'user-0',
    content: 'Awesome. Staging migration ran cleanly earlier today, right?',
    timestamp: '2026-11-03T17:40:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-405',
    conversationId: 'conv-4',
    senderId: 'user-4',
    content: 'Yep, took about 45 seconds on 2M mock rows with no locking issues.',
    timestamp: '2026-11-03T18:02:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-406',
    conversationId: 'conv-4',
    senderId: 'user-4',
    content: 'Production migration completed smoothly at 6 AM. All health checks green.',
    timestamp: '2026-11-04T06:30:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-407',
    conversationId: 'conv-4',
    senderId: 'user-0',
    content: 'Phenomenal execution James! Thanks for handling that.',
    timestamp: '2026-11-04T07:15:00.000Z',
    status: 'read',
  },

  // Conversation 5: Alex Morgan & Elena Rodriguez (Team lunch & React meetup)
  {
    id: 'msg-501',
    conversationId: 'conv-5',
    senderId: 'user-5',
    content: 'Hey Alex! A few of us from the frontend team are heading to that new ramen spot down the street. Want to join?',
    timestamp: '2026-11-04T08:30:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-502',
    conversationId: 'conv-5',
    senderId: 'user-0',
    content: 'Ooh ramen sounds amazing today! What time are you thinking?',
    timestamp: '2026-11-04T08:42:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-503',
    conversationId: 'conv-5',
    senderId: 'user-5',
    content: 'Around 12:30 PM! Trying to beat the peak lunch rush.',
    timestamp: '2026-11-04T08:48:10.000Z',
    status: 'read',
  },
  {
    id: 'msg-504',
    conversationId: 'conv-5',
    senderId: 'user-0',
    content: 'Count me in! Also, are you attending the local React meetup this Thursday?',
    timestamp: '2026-11-04T09:05:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-505',
    conversationId: 'conv-5',
    senderId: 'user-5',
    content: 'Yes! David and I are actually giving a lightning talk on client-side state sync.',
    timestamp: '2026-11-04T09:20:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-506',
    conversationId: 'conv-5',
    senderId: 'user-0',
    content: 'Oh nice, I\'ll definitely be in the front row cheering you on!',
    timestamp: '2026-11-04T09:25:30.000Z',
    status: 'read',
  },
  {
    id: 'msg-507',
    conversationId: 'conv-5',
    senderId: 'user-5',
    content: 'Haha sweet! Meet in the main lobby at 12:25 PM then?',
    timestamp: '2026-11-04T09:58:00.000Z',
    status: 'delivered',
  },

  // Conversation 6: Alex Morgan & David Kim (E2E encryption handshake benchmarks)
  {
    id: 'msg-601',
    conversationId: 'conv-6',
    senderId: 'user-6',
    content: 'Hey Alex, have you verified the end-to-end encryption handshake benchmarks?',
    timestamp: '2026-11-03T15:20:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-602',
    conversationId: 'conv-6',
    senderId: 'user-0',
    content: 'Yes! Just finished benchmarking the ECDH key exchange with AES-GCM.',
    timestamp: '2026-11-03T15:35:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-603',
    conversationId: 'conv-6',
    senderId: 'user-6',
    content: 'What were the latency numbers looking like across regions?',
    timestamp: '2026-11-03T15:42:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-604',
    conversationId: 'conv-6',
    senderId: 'user-0',
    content: 'Sub-15ms for initial key exchange and negligible overhead for subsequent payload packets.',
    timestamp: '2026-11-03T16:10:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-605',
    conversationId: 'conv-6',
    senderId: 'user-6',
    content: 'That\'s even faster than our initial target. Did you document the cipher suite negotiation?',
    timestamp: '2026-11-04T08:10:00.000Z',
    status: 'read',
  },
  {
    id: 'msg-606',
    conversationId: 'conv-6',
    senderId: 'user-0',
    content: 'Drafted the RFC in Notion and linked the test vectors. Take a look when you get a chance!',
    timestamp: '2026-11-04T08:35:00.000Z',
    status: 'read',
  },
];

export const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    participants: ['user-0', 'user-1'],
    lastMessage: 'Sounds like a plan. I\'ll monitor Datadog during the rollout.',
    lastMessageTime: '2026-11-04T09:55:00.000Z',
    unreadCount: 1,
  },
  {
    id: 'conv-5',
    participants: ['user-0', 'user-5'],
    lastMessage: 'Haha sweet! Meet in the main lobby at 12:25 PM then?',
    lastMessageTime: '2026-11-04T09:58:00.000Z',
    unreadCount: 1,
  },
  {
    id: 'conv-3',
    participants: ['user-0', 'user-3'],
    lastMessage: 'Awesome, ready to implement whenever you push the spec!',
    lastMessageTime: '2026-11-04T09:10:00.000Z',
    unreadCount: 0,
  },
  {
    id: 'conv-6',
    participants: ['user-0', 'user-6'],
    lastMessage: 'Drafted the RFC in Notion and linked the test vectors. Take a look when you get a chance!',
    lastMessageTime: '2026-11-04T08:35:00.000Z',
    unreadCount: 0,
  },
  {
    id: 'conv-2',
    participants: ['user-0', 'user-2'],
    lastMessage: 'Haha legendary. See you Saturday morning!',
    lastMessageTime: '2026-11-04T07:45:00.000Z',
    unreadCount: 0,
  },
  {
    id: 'conv-4',
    participants: ['user-0', 'user-4'],
    lastMessage: 'Phenomenal execution James! Thanks for handling that.',
    lastMessageTime: '2026-11-04T07:15:00.000Z',
    unreadCount: 0,
  },
];

// Helper functions
export function getUserById(id: string): User | undefined {
  return mockUsers.find((user) => user.id === id);
}

export function getConversationMessages(conversationId: string): Message[] {
  return mockMessages.filter((msg) => msg.conversationId === conversationId);
}

export function getOtherParticipant(conversation: Conversation): User | undefined {
  const otherUserId = conversation.participants.find((id) => id !== currentUser.id);
  if (!otherUserId) return undefined;
  return getUserById(otherUserId);
}

// Aliases matching prompt requirements
export const users = mockUsers;
export const conversations = mockConversations;
export const messages = mockMessages;
