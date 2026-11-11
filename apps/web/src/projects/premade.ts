// The premade quest a quest started from: its stable identity, kept on the
// quest whatever the user renames it to. The four are starting points of one
// ordinary quest, not types: only Dailies behaves differently, as the user's
// one ongoing quest (src/conversations/dailies.ts). The catalog's names,
// Journals and activities are in premade-quests.ts. The browser imports this
// module, so it imports nothing server-only.
import { z } from "zod";

const PREMADE_IDS = ["dailies", "learn", "make", "do"] as const;

const PREMADE_ID = z.enum(PREMADE_IDS);

type PremadeId = z.infer<typeof PREMADE_ID>;

// The stored or submitted value as a premade id; undefined for none or any
// other value.
function parsePremadeId(value: unknown): PremadeId | undefined {
  return PREMADE_ID.safeParse(value).data;
}

export type { PremadeId };
export { PREMADE_ID, PREMADE_IDS, parsePremadeId };
