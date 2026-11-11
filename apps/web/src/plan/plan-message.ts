// The messages a person adds to a chat without the construct: a change they
// made to the plan, by command or with the Plan panel, and a plan card the
// /plan command shows. Each is a user message whose one part is a data part,
// saved in the chat so everyone in it, and the construct on its next reply,
// sees it. No reply answers one. It imports nothing from the server, because
// the chat in the browser reads the same parts.
import type { UIMessage } from "ai";
import { z } from "zod";
import type { ChatMessage } from "@/chats/message-author.ts";
import { readJournalPart } from "@/journal/journal-message.ts";
import { PLAN_CHANGE_LINE } from "@/plan/plan.ts";

// The data part names, as the AI SDK stores them: `data-` and a name.
const PLAN_CHANGE_PART = "data-plan-change";
const PLAN_CARD_PART = "data-plan-card";

// A plan change a person made in the chat: the version it saved, what it
// did, the command they typed for it, if they typed one, and the version it
// undid, if it was an undo.
const PLAN_CHANGE_DATA = z.object({
  version: z.number().int().positive(),
  lines: z.array(PLAN_CHANGE_LINE),
  command: z.string().optional(),
  undoesVersion: z.number().int().positive().optional(),
});

// A plan card: the plan, as it is whenever the card is shown, which the
// command it answers asked for.
const PLAN_CARD_DATA = z.object({ command: z.string() });

type PlanChangeData = z.infer<typeof PLAN_CHANGE_DATA>;
type PlanCardData = z.infer<typeof PLAN_CARD_DATA>;

// A plan message's one part, as the chat reads it.
type PlanMessagePart =
  | { readonly kind: "change"; readonly data: PlanChangeData }
  | { readonly kind: "card"; readonly data: PlanCardData };

// The part as a plan message's part, or undefined for any other part.
function readPlanPart(part: {
  readonly type: string;
  readonly data?: unknown;
}): PlanMessagePart | undefined {
  if (part.type === PLAN_CHANGE_PART) {
    const { data } = PLAN_CHANGE_DATA.safeParse(part.data);
    if (data !== undefined) {
      return { kind: "change", data };
    }
  }
  if (part.type === PLAN_CARD_PART) {
    const { data } = PLAN_CARD_DATA.safeParse(part.data);
    if (data !== undefined) {
      return { kind: "card", data };
    }
  }
  return undefined;
}

// Whether the message is a plan message: a user message holding only plan
// parts.
function isPlanMessage(message: Pick<UIMessage, "role" | "parts">): boolean {
  return (
    message.role === "user" &&
    message.parts.length > 0 &&
    message.parts.every(
      (part) =>
        readPlanPart(part) !== undefined || readJournalPart(part) !== undefined,
    )
  );
}

// Whether a reply answers the message: a user message that isn't a plan
// message.
function awaitsReply(message: Pick<UIMessage, "role" | "parts">): boolean {
  return message.role === "user" && !isPlanMessage(message);
}

// A new plan message with this id, holding the change.
function planChangeMessage(id: string, data: PlanChangeData): ChatMessage {
  return { id, role: "user", parts: [{ type: PLAN_CHANGE_PART, data }] };
}

// A new plan message with this id, holding a plan card.
function planCardMessage(id: string, data: PlanCardData): ChatMessage {
  return { id, role: "user", parts: [{ type: PLAN_CARD_PART, data }] };
}

export type { PlanCardData, PlanChangeData, PlanMessagePart };
export {
  awaitsReply,
  isPlanMessage,
  PLAN_CARD_PART,
  PLAN_CHANGE_PART,
  planCardMessage,
  planChangeMessage,
  readPlanPart,
};
