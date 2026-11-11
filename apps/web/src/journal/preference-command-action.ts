// The plan command entry point routes preference commands here after its
// owner and awaiting-reply checks. No model is called.
import { generateId } from "ai";
import type { ChatMessage } from "@/chats/message-author.ts";
import { savePlanMessage } from "@/chats/store.ts";
import type { ChatId, ProjectId, UserId } from "@/ids.ts";
import { journalMessage } from "@/journal/journal-message.ts";
import { readSection, writeSection } from "@/journal/journal-store.ts";
import { preferenceCommand } from "@/journal/preference-commands.ts";
import { JOURNAL_SECTIONS_COPY as COPY } from "@/ui/copy/journal.ts";

async function runPreferenceCommand(
  owner: UserId,
  projectId: ProjectId,
  chatId: ChatId,
  text: string,
): Promise<ChatMessage | typeof COPY.failed | typeof COPY.commandHelp> {
  const command = preferenceCommand(text);
  if (command === undefined || command.kind === "invalid") {
    return COPY.commandHelp;
  }
  let state = await readSection(owner, projectId, "preferences");
  if (state === undefined) {
    return COPY.failed;
  }
  if (command.kind === "edit") {
    const result = await writeSection(owner, {
      projectId,
      kind: "preferences",
      author: "person",
      edit: command.edit,
      basedOn: state.version,
    });
    if (result.status === "not-changed") {
      return COPY.failed;
    }
    ({ state } = result);
  }
  const message = journalMessage(generateId(), {
    projectId,
    version: state.version,
    content: state.content,
    changed: command.kind === "edit",
    command: text,
  });
  if (!(await savePlanMessage(owner, chatId, message))) {
    return COPY.failed;
  }
  return message;
}

export { runPreferenceCommand };
