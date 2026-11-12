import Link from "next/link";
import type { JSX } from "react";
import type { ToolCallPart } from "@/components/chat/tool-parts.tsx";
import { EarnGoldLink } from "@/components/earn-gold-link.tsx";
import { QuestFromChat } from "@/components/quest-from-chat.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { userMessage } from "@/errors/app-error.ts";
import {
  CREATE_QUEST_OUTPUT,
  offeredContext,
} from "@/replies/tools/create-quest-contract.ts";
import { CREATE_QUEST_COPY } from "@/ui/copy/chat.ts";

// The quest the construct offers in Chat, with Turn Chat into a quest filled
// in from it, so the user creates it only by confirming the same form as the
// Chat's own button. A result saved before offers shows the quest it created,
// or why it created none. Nothing shows until the call has answered.
export function CreateQuestPart({
  part,
}: {
  part: Pick<ToolCallPart, "result">;
}): JSX.Element | null {
  const output = CREATE_QUEST_OUTPUT.safeParse(part.result);
  if (!output.success) {
    return null;
  }
  const result = output.data;
  switch (result.status) {
    case "proposed":
      return (
        <div className="card flex flex-col items-start gap-2 text-sm">
          <p className="icon-line font-medium">
            <Icon name="plus" />
            {CREATE_QUEST_COPY.offered(result.name)}
          </p>
          <QuestFromChat context={offeredContext(result)} name={result.name} />
        </div>
      );
    case "created":
      return (
        <div className="card flex flex-col gap-2 text-sm">
          <p className="icon-line font-medium">
            <Icon name="check" />
            {CREATE_QUEST_COPY.created(result.name)}
          </p>
          <Link
            className="self-start text-link"
            href={`/quests/${result.questId}`}
          >
            {CREATE_QUEST_COPY.openQuest}
          </Link>
        </div>
      );
    case "claudeUnavailable":
      return (
        <p className="icon-line text-muted text-sm">
          <Icon name="alert" />
          {CREATE_QUEST_COPY.claudeUnavailable}
        </p>
      );
    case "outOfGold":
    case "quotaUsedUp":
      return (
        <p className="icon-line text-muted text-sm">
          <Icon name="alert" />
          <span>
            <span>{userMessage("out-of-gold")}</span>
            <EarnGoldLink />
          </span>
        </p>
      );
    default: {
      const unknownResult: never = result;
      return unknownResult;
    }
  }
}
