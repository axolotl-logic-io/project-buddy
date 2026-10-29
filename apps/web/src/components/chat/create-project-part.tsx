import Link from "next/link";
import type { JSX } from "react";
import type { ToolCallPart } from "@/components/chat/tool-parts.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { CREATE_PROJECT_OUTPUT } from "@/replies/tools/create-project-contract.ts";
import { CREATE_PROJECT_COPY, quotaUsedUpMessage } from "@/ui/copy/chat.ts";

// The project the buddy created from the central chat, with a link to its
// interview chat, or why it created none: Claude is unavailable, or the
// user's quota is used up. Nothing shows until the call has answered.
export function CreateProjectPart({
  part,
}: {
  part: Pick<ToolCallPart, "result">;
}): JSX.Element | null {
  const output = CREATE_PROJECT_OUTPUT.safeParse(part.result);
  if (!output.success) {
    return null;
  }
  const result = output.data;
  switch (result.status) {
    case "created":
      return (
        <div className="card flex flex-col gap-2 text-sm">
          <p className="icon-line font-medium">
            <Icon name="pencil" />
            {CREATE_PROJECT_COPY.created(result.name)}
          </p>
          <Link className="text-link" href={`/chats/${result.interviewChatId}`}>
            {CREATE_PROJECT_COPY.openInterview}
          </Link>
        </div>
      );
    case "claudeUnavailable":
      return (
        <p className="icon-line text-muted text-sm">
          <Icon name="alert" />
          {CREATE_PROJECT_COPY.claudeUnavailable}
        </p>
      );
    case "quotaUsedUp":
      return (
        <p className="icon-line text-muted text-sm">
          <Icon name="alert" />
          {quotaUsedUpMessage(new Date(result.resetsOn))}
        </p>
      );
    default: {
      const unknownResult: never = result;
      return unknownResult;
    }
  }
}
