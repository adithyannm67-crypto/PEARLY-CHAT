
import { useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

import type { Conversation } from "@/types/chat";

type RealtimeHandlers = {
  userId: string | null;
  supabase: SupabaseClient<Database>;

  setConversations: (
    value: Conversation[] | ((prev: Conversation[]) => Conversation[]),
  ) => void;

  loadConversations: () => void | Promise<void>;
  loadConnectionRequests: () => void | Promise<void>;
  loadSentConnectionRequests: () => void | Promise<void>;
  loadRequestHistory?: () => void | Promise<void>;
};

export function useDashboardRealtime({
  userId,
  supabase,
  setConversations,
  loadConversations,
  loadConnectionRequests,
  loadSentConnectionRequests,
  loadRequestHistory,
}: RealtimeHandlers) {
  useEffect(() => {
    if (!userId) {
      console.log("[Realtime] No user ID. Subscription skipped.");
      return;
    }

    console.log(`[Realtime:${userId}] Creating channel...`);

    const channel = supabase
      .channel(`dashboard:${userId}`)

      // Conversation participant changes
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_participants",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("[Realtime] Participant change:", payload);
          void loadConversations();
        },
      )

      // New messages
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          console.log("[Realtime] New message:", payload);

          const row = payload.new as {
            conversation_id: string;
            content: string;
            created_at: string;
          };

          setConversations((previous) => {
            const index = previous.findIndex(
              (conversation) => conversation.id === row.conversation_id,
            );

            if (index === -1) return previous;

            const next = [...previous];

            next[index] = {
              ...next[index],
              lastMessage: row.content,
              lastMessageTime: row.created_at,
            };

            return next.sort(
              (a, b) =>
                new Date(b.lastMessageTime).getTime() -
                new Date(a.lastMessageTime).getTime(),
            );
          });
        },
      )

      // All connection request changes
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connection_requests",
        },
        (payload) => {
          console.log("[Realtime] CONNECTION REQUEST EVENT:", payload);

          void loadConnectionRequests();
          void loadSentConnectionRequests();
          void loadRequestHistory?.();
        },
      )

      .subscribe((status, error) => {
        console.log(`[Realtime:${userId}] Channel status:`, status);

        if (error) {
          console.error(`[Realtime:${userId}] Subscription error:`, error);
        }
      });

    return () => {
      console.log(`[Realtime:${userId}] Removing channel...`);

      void supabase.removeChannel(channel);
    };
  }, [
    userId,
    supabase,
    setConversations,
    loadConversations,
    loadConnectionRequests,
    loadSentConnectionRequests,
    loadRequestHistory,
  ]);
}

// import { useEffect } from "react";
// import type { SupabaseClient } from "@supabase/supabase-js";
// import type { Database } from "@/types/database";

// import type { Conversation } from "@/types/chat";

// type RealtimeHandlers = {
//   userId: string | null;
//   supabase: SupabaseClient<Database>;
//   setConversations: (
//     value: Conversation[] | ((prev: Conversation[]) => Conversation[]),
//   ) => void;
//   loadConversations: () => void | Promise<void>;
//   loadConnectionRequests: () => void | Promise<void>;
//   loadSentConnectionRequests: () => void | Promise<void>;
//   loadRequestHistory?: () => void | Promise<void>;
// };

// export function useDashboardRealtime({
//   userId,
//   supabase,
//   setConversations,
//   loadConversations,
//   loadConnectionRequests,
//   loadSentConnectionRequests,
//   loadRequestHistory,
// }: RealtimeHandlers) {
//   useEffect(() => {
//     if (!userId) return;

//     const channel = supabase
//       .channel(`dashboard:${userId}`)
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "conversation_participants",
//           filter: `user_id=eq.${userId}`,
//         },
//         () => {
//           void loadConversations();
//         },
//       )
//       .on(
//         "postgres_changes",
//         {
//           event: "INSERT",
//           schema: "public",
//           table: "messages",
//         },
//         (payload) => {
//           const row = payload.new as {
//             conversation_id: string;
//             content: string;
//             created_at: string;
//           };

//           setConversations((previous) => {
//             const index = previous.findIndex(
//               (conversation) => conversation.id === row.conversation_id,
//             );

//             if (index === -1) return previous;

//             const next = [...previous];
//             next[index] = {
//               ...next[index],
//               lastMessage: row.content,
//               lastMessageTime: row.created_at,
//             };

//             return next.sort(
//               (a, b) =>
//                 new Date(b.lastMessageTime).getTime() -
//                 new Date(a.lastMessageTime).getTime(),
//             );
//           });
//         },
//       )
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "connection_requests",
//           filter: `receiver_id=eq.${userId}`,
//         },
//         (payload) => {
//           console.log(`[Realtime:${userId}] Incoming request event:`, payload);

//           void loadConnectionRequests();
//           void loadSentConnectionRequests();
//           void loadRequestHistory?.();
//         },
//       )
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "connection_requests",
//           // filter: `sender_id=eq.${userId}`,
//         },
//         (payload) => {
//           console.log(`[Realtime:${userId}] Outgoing request event:`, payload);

//           void loadConnectionRequests();
//           void loadSentConnectionRequests();
//           void loadRequestHistory?.();
//         },
//       )
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "connection_requests",
//         },
//         (payload) => {
//           console.log("🔥 DATABASE EVENT RECEIVED:", payload);
//         },
//       )
//       .subscribe((status, error) => {
//         console.log(`[Realtime:${userId}] Status:`, status);

//         if (error) {
//           console.error(`[Realtime:${userId}] Error:`, error);
//         }
//       });

//     return () => {
//       supabase.removeChannel(channel);
//     };
//   }, [
//     userId,
//     supabase,
//     setConversations,
//     loadConversations,
//     loadConnectionRequests,
//     loadSentConnectionRequests,
//     loadRequestHistory,
//   ]);
// }
