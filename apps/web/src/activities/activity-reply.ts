import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { activityResultOpenTo, messageOpenTo } from "@/accounts/owner-scope.ts";
import { currentActivity, newSession } from "@/activities/activity-sessions.ts";
import { builtInActivity } from "@/activities/chosen-activity.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { inTransaction, type Transaction } from "@/db/client.ts";
import { activityMessageResults } from "@/db/tables/activity-message-results.ts";
import { activitySessions } from "@/db/tables/activity-sessions.ts";
import { messages } from "@/db/tables/quests-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { IDEA_REQUEST } from "@/ideas/idea.ts";
import { changeIdea } from "@/ideas/idea-store.ts";
import type { UserId } from "@/ids.ts";
import { PLAN_STEP_TEXT } from "@/plan/plan.ts";
import { changePlan } from "@/plan/plan-store.ts";
import type { ChatRequest } from "@/replies/chat-protocol.ts";
import { ACTIVITY_COPY } from "@/ui/copy/activity.ts";

const COMMAND = z.enum(["brainstorm", "plan", "stop"]);
const LEADING_SLASH = /^\//u;
const OTHER_COMMAND = /^\s*(?:\/|help\b|look\b|search\b|cast\b)/iu;

interface ActivityResponse {
  readonly text: string | null;
}

async function respond(
  owner: UserId,
  chat: Chat,
  message: ChatRequest["message"],
  tx: Transaction,
): Promise<ActivityResponse> {
  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
  const command = COMMAND.safeParse(
    text.toLowerCase().replace(LEADING_SLASH, ""),
  );
  if (command.success) {
    const name = command.data;
    if (chat.quest === undefined && name.toLowerCase() !== "stop") {
      return { text: ACTIVITY_COPY.noQuest };
    }
    let id: "open-chat" | "brainstorming" | "project-breakdown" = "open-chat";
    let label = ACTIVITY_COPY.chat;
    if (name.toLowerCase() === "brainstorm") {
      id = "brainstorming";
      label = ACTIVITY_COPY.brainstorm;
    }
    if (name.toLowerCase() === "plan") {
      id = "project-breakdown";
      label = ACTIVITY_COPY.plan;
    }
    const activity = { ...builtInActivity(id), name: label };
    await tx
      .insert(activitySessions)
      .select(newSession(owner, chat.id, activity, message.id));
    if (id === "open-chat") {
      return { text: ACTIVITY_COPY.stopped };
    }
    return { text: ACTIVITY_COPY.started(label) };
  }
  if (OTHER_COMMAND.test(text) || chat.quest === undefined) {
    return { text: null };
  }
  const activity = await currentActivity(owner, chat, tx);
  if (activity.id !== "brainstorming" && activity.id !== "project-breakdown") {
    return { text: null };
  }
  const parsed = PLAN_STEP_TEXT.safeParse(text);
  if (!parsed.success) {
    return { text: ACTIVITY_COPY.invalid };
  }
  if (activity.id === "brainstorming") {
    await changeIdea(
      owner,
      IDEA_REQUEST.parse({
        op: "add",
        questId: chat.quest.id,
        text: parsed.data,
      }),
      tx,
    );
    return { text: ACTIVITY_COPY.ideaSaved };
  }
  const result = await changePlan(
    owner,
    { questId: chat.quest.id, author: "person" },
    [{ op: "add", text: parsed.data }],
    tx,
  );
  if (result?.kind !== "changed") {
    return { text: ACTIVITY_COPY.full };
  }
  return { text: ACTIVITY_COPY.planSaved };
}

// Executes the current Activity once per saved message. The result and bucket
// write commit together; retrying after a lost reply never adds a second item.
function activityReply(
  owner: UserId,
  chat: Chat,
  message: ChatRequest["message"],
): Promise<string | undefined> {
  return withAppErrors("activityReply", () =>
    inTransaction(async (tx): Promise<string | undefined> => {
      const [saved] = await tx
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.id, message.id),
            eq(messages.chatId, chat.id),
            messageOpenTo(owner),
          ),
        )
        .for("update");
      if (saved === undefined) {
        return undefined;
      }
      const [previous] = await tx
        .select({ text: activityMessageResults.text })
        .from(activityMessageResults)
        .where(
          and(
            eq(activityMessageResults.messageId, message.id),
            activityResultOpenTo(owner),
          ),
        );
      if (previous !== undefined) {
        return previous.text;
      }
      const response = await respond(owner, chat, message, tx);
      if (response.text !== null) {
        await tx.insert(activityMessageResults).values({
          messageId: message.id,
          chatId: chat.id,
          text: response.text,
        });
        return response.text;
      }
      return undefined;
    }),
  );
}

export { activityReply };
