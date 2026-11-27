import { type ListType, listItemLimit, listItemText } from "@/lists/list.ts";
import {
  nextReply,
  type ReplyChoice,
  type RiteDefinition,
  riteReply,
} from "@/rites/rite.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";

// The note that answers a message the list can't hold, naming its items.
function refusedNote(type: ListType): string {
  return PERFORMANCE_COPY.refused(
    listItemLimit(type),
    LISTS_COPY.nouns(type).one,
  );
}

// The rite's answer to a message in a performance, worked out in the
// browser so it shows at once: its choice of reply and that reply's text,
// or only the note for a message the list can't hold. given is the replies
// the rite has given in the performance, by place, in the order it gave
// them. The server keeps the choice when the rite could have made it.
function answerMessage(
  performance: {
    readonly rite: RiteDefinition;
    readonly listName: string;
    readonly listType: ListType;
  },
  given: readonly number[],
  message: { readonly text: string; readonly author: string },
  random: () => number,
): { readonly reply: string; readonly choice?: ReplyChoice } {
  if (!listItemText(performance.listType).safeParse(message.text).success) {
    return { reply: refusedNote(performance.listType) };
  }
  const choice = nextReply(performance.rite, given, random);
  return {
    choice,
    reply: riteReply(
      performance.rite,
      choice,
      { name: performance.listName },
      message,
    ),
  };
}

export { answerMessage, refusedNote };
