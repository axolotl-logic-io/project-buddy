import { z } from "zod";
import type { ChatMessage } from "@/chats/message-author.ts";
import { PROJECT_ID } from "@/ids.ts";
import { CONTENT } from "@/journal/journal.ts";

const JOURNAL_PART = "data-journal-section";
const JOURNAL_DATA = z.object({
  projectId: PROJECT_ID,
  version: z.number().int().nonnegative(),
  content: CONTENT,
  changed: z.boolean(),
  command: z.string(),
});
type JournalData = z.infer<typeof JOURNAL_DATA>;
function readJournalPart(part: {
  readonly type: string;
  readonly data?: unknown;
}): JournalData | undefined {
  if (part.type === JOURNAL_PART) {
    return JOURNAL_DATA.safeParse(part.data).data;
  }
  return undefined;
}
function journalMessage(id: string, data: JournalData): ChatMessage {
  return { id, role: "user", parts: [{ type: JOURNAL_PART, data }] };
}

export { JOURNAL_PART, journalMessage, readJournalPart };
