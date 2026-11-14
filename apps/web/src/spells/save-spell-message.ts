import type { Transaction } from "@/db/client.ts";
import { IDEA_REQUEST } from "@/ideas/idea.ts";
import { changeIdea } from "@/ideas/idea-store.ts";
import type { QuestId, UserId } from "@/ids.ts";
import { PLAN_STEP_TEXT } from "@/plan/plan.ts";
import { changePlan } from "@/plan/plan-store.ts";
import type { SpellDestination } from "@/spells/spell-destination.ts";

interface SpellMessage {
  readonly destination: SpellDestination;
  readonly questId: QuestId;
  readonly text: string;
}
type SaveMessage = (
  owner: UserId,
  message: SpellMessage,
  tx: Transaction,
) => Promise<boolean>;

const DESTINATION_HANDLERS: Readonly<Record<SpellDestination, SaveMessage>> = {
  async plan(
    owner: UserId,
    { questId, text }: SpellMessage,
    tx: Transaction,
  ): Promise<boolean> {
    const parsed = PLAN_STEP_TEXT.safeParse(text);
    if (!parsed.success) {
      return false;
    }
    const result = await changePlan(
      owner,
      { questId, author: "person" },
      [{ op: "add", text: parsed.data }],
      tx,
    );
    if (result?.kind !== "changed") {
      throw new Error("Could not save the spell’s Plan step");
    }
    return true;
  },
  async brainstorm(
    owner: UserId,
    { questId, text }: SpellMessage,
    tx: Transaction,
  ): Promise<boolean> {
    const parsed = IDEA_REQUEST.safeParse({ op: "add", questId, text });
    if (!parsed.success) {
      return false;
    }
    const result = await changeIdea(owner, parsed.data, tx);
    if (result.kind !== "saved") {
      throw new Error("Could not save the spell’s idea");
    }
    return true;
  },
};

// Validate and save through the destination's own rules inside the message transaction.
function saveSpellMessage(
  owner: UserId,
  message: SpellMessage,
  tx: Transaction,
): Promise<boolean> {
  return DESTINATION_HANDLERS[message.destination](owner, message, tx);
}

export { saveSpellMessage };
