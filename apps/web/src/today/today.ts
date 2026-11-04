// What is waiting for the user today, as the landing page's Today section
// shows it: the projects they were most recently active in, each with its
// next step and its latest chat to continue, and their most recent other
// chats. The store that reads it is today-store.ts. It imports nothing from
// the server, so pages, components and tests can use it.
import type { Chat, ChatProject } from "@/chats/chat-rows.ts";
import type { ChatId } from "@/ids.ts";

// A project the user was recently active in.
interface TodayProject {
  readonly project: ChatProject;
  // The next step its memory records, or undefined if it records none.
  readonly nextStep: string | undefined;
  // Its most recently active chat, to continue in.
  readonly latestChat: ChatId;
  readonly latestChatLabel?: string | undefined;
}

// What Today shows. Both lists are newest activity first, and a chat that a
// project continues in is not repeated among the chats. Both are empty for a
// user with no chats. Unread check-ins (#609) can join as another list.
interface Today {
  readonly projects: readonly TodayProject[];
  readonly chats: readonly Chat[];
}

// Whether Today has anything to show. A user with no chats has nothing, and
// the landing page shows only the new-chat form.
function hasToday(today: Today): boolean {
  return today.projects.length > 0 || today.chats.length > 0;
}

export type { Today, TodayProject };
export { hasToday };
