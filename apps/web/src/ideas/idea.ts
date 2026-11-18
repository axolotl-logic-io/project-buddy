import { z } from "zod";
import { QUEST_ID } from "@/ids.ts";

const IDEA_ID = z.uuid().brand<"IdeaId">();
const IDEA_TEXT_MAX_LENGTH = 200;
const IDEA_TEXT = z.string().trim().min(1).max(IDEA_TEXT_MAX_LENGTH);
const IDEA = z.object({ id: IDEA_ID, text: IDEA_TEXT });
type Idea = z.infer<typeof IDEA>;
const IDEA_REQUEST = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), questId: QUEST_ID, text: IDEA_TEXT }),
  z.object({
    op: z.literal("edit"),
    questId: QUEST_ID,
    id: IDEA_ID,
    text: IDEA_TEXT,
  }),
  z.object({
    op: z.literal("reorder"),
    questId: QUEST_ID,
    id: IDEA_ID,
    before: IDEA_ID.optional(),
  }),
  z.object({ op: z.literal("remove"), questId: QUEST_ID, id: IDEA_ID }),
  z.object({ op: z.literal("move"), questId: QUEST_ID, id: IDEA_ID }),
]);
type IdeaRequest = z.infer<typeof IDEA_REQUEST>;
// Why an idea couldn't change: the request was malformed, the quest or idea
// isn't open to the user, or Tasks couldn't take the idea.
type IdeaProblem = "invalid" | "not-found" | "tasks-full";
type IdeaResult =
  | { readonly kind: "saved"; readonly message?: string }
  | {
      readonly kind: "problem";
      readonly reason: IdeaProblem;
      readonly text: string;
    };

export type { Idea, IdeaProblem, IdeaRequest, IdeaResult };
export { IDEA, IDEA_REQUEST, IDEA_TEXT_MAX_LENGTH };
