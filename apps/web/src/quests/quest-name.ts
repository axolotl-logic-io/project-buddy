// The rule for a new quest's name, shared by the New Quest form, the
// new-chat form's name dialog and the construct's create_quest tool: trimmed,
// at least one character and at most QUEST_NAME_MAX_LENGTH. Its length is
// counted in UTF-16 code units, as an input's maxLength counts, so the
// browser and the server agree; an emoji takes 2 or more. A QuestName
// has passed it, so only a checked name starts a quest. Names saved before
// the limit may be longer; they are kept and shown as they are.
import { z } from "zod";

// Long enough for any name a user would call a quest, short enough that
// a name can't carry a message of its own in the site's emails.
const QUEST_NAME_MAX_LENGTH = 80;

const QUEST_NAME = z
  .string()
  .trim()
  .min(1, { error: "A quest needs a name." })
  .check((context) => {
    // zod's own max counts code points, so it is checked here instead.
    if (context.value.length > QUEST_NAME_MAX_LENGTH) {
      context.issues.push({
        code: "too_big",
        origin: "string",
        maximum: QUEST_NAME_MAX_LENGTH,
        inclusive: true,
        input: context.value,
        message: `A quest name has at most ${QUEST_NAME_MAX_LENGTH} characters. Choose a shorter one.`,
      });
    }
  })
  .brand<"QuestName">();

type QuestName = z.infer<typeof QUEST_NAME>;

// The text as a quest's name, or why it can't be one: it is empty or only
// spaces, or longer than QUEST_NAME_MAX_LENGTH once trimmed.
type QuestNameCheck =
  | { readonly kind: "named"; readonly name: QuestName }
  | { readonly kind: "missing" | "tooLong" };

function checkQuestName(text: string): QuestNameCheck {
  const parsed = QUEST_NAME.safeParse(text);
  if (parsed.success) {
    return { kind: "named", name: parsed.data };
  }
  if (parsed.error.issues.some(({ code }) => code === "too_big")) {
    return { kind: "tooLong" };
  }
  return { kind: "missing" };
}

export type { QuestName, QuestNameCheck };
export { checkQuestName, QUEST_NAME, QUEST_NAME_MAX_LENGTH };
