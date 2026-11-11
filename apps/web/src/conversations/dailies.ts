// Dailies: the user's one ongoing quest for starting their day, continued
// every day in its one conversation, never reset. It is an ordinary quest,
// marked as the user's Dailies (projects.dailies) so it is found by that mark
// whatever the user renames it to; the database keeps one per user, so of
// concurrent starts exactly one makes it. Starting the day is a message the
// user sends in its conversation, like any other, which the Dailies
// activity's instructions guide.

import { and, eq } from "drizzle-orm";
import { projectOwnedBy } from "@/accounts/owner-scope.ts";
import type { ChatActivity } from "@/activities/chosen-activity.ts";
import { isProjectChat, type ProjectChat } from "@/chats/chat-rows.ts";
import type { NewChatConstruct } from "@/chats/new-chat-store.ts";
import {
  startNewQuest,
  startQuestConversation,
} from "@/conversations/start-quest.ts";
import { getDb } from "@/db/client.ts";
import { projects } from "@/db/tables/projects-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { type ProjectId, parseProjectId, type UserId } from "@/ids.ts";
import type { ProjectName } from "@/projects/project-name.ts";

// The user's Dailies, newly started or resumed as it was, with its
// conversation, or why it wasn't started: the user is out of batteries, or
// Claude couldn't write its opening.
type StartDailiesResult =
  | {
      readonly kind: "started" | "resumed";
      readonly chat: ProjectChat;
    }
  | { readonly kind: "outOfGold" }
  | { readonly kind: "claudeUnavailable" };

// What a new Dailies starts with, from its premade quest: its name and
// Journal, which the user can change later, its construct and its activity.
interface DailiesStart {
  readonly name: ProjectName;
  readonly journal: string;
  readonly motivation?: string;
  readonly construct: NewChatConstruct;
  readonly activity: ChatActivity;
}

// The id of the user's own Dailies; undefined if they have none.
async function dailiesId(user: UserId): Promise<ProjectId | undefined> {
  const [row] = await withAppErrors("dailiesId", () =>
    getDb()
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.dailies, true), projectOwnedBy(user))),
  );
  return parseProjectId(row?.id ?? "");
}

// The user's Dailies resumed: its conversation as it is, or, for one left
// without a conversation, a new one started.
async function resume(
  user: UserId,
  projectId: ProjectId,
): Promise<StartDailiesResult> {
  const started = await startQuestConversation(user, projectId);
  if (started.kind === "notFound") {
    throw new Error("The user's Dailies is not open to them");
  }
  if (started.kind !== "started") {
    return started;
  }
  const { conversation } = started;
  if (!isProjectChat(conversation)) {
    throw new Error("A Dailies conversation has no quest");
  }
  return { kind: "resumed", chat: conversation };
}

// The user's Dailies: resumed as it is when they have one, which changes
// nothing, writes nothing and spends no batteries; otherwise started from
// start, like any new quest. A storage failure throws.
async function startDailies(
  user: UserId,
  start: DailiesStart,
): Promise<StartDailiesResult> {
  const existing = await dailiesId(user);
  if (existing !== undefined) {
    return await resume(user, existing);
  }
  const started = await startNewQuest(user, start.name, start.construct, {
    journal: start.journal,
    motivation: start.motivation ?? "",
    activity: start.activity,
    dailies: true,
  });
  if (started !== undefined) {
    return started;
  }
  const made = await dailiesId(user);
  if (made === undefined) {
    throw new Error("A Dailies was refused as a duplicate, yet none exists");
  }
  return await resume(user, made);
}

export type { DailiesStart, StartDailiesResult };
export { startDailies };
