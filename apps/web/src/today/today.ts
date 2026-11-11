// The quest Home offers to continue: the one the user was most recently
// active in, with its next step. The store that reads it is today-store.ts.
// It imports nothing from the server, so pages, components and tests can
// use it.
import type { ChatProject } from "@/chats/chat-rows.ts";

interface TodayProject {
  readonly project: ChatProject;
  // The next step its plan or Journal records, or undefined if none.
  readonly nextStep: string | undefined;
}

export type { TodayProject };
