"use client";

import {
  type EnrichedPartState,
  groupPartByType,
  MessagePrimitive,
  type MessageRuntimeState,
  useAuiState,
} from "@assistant-ui/react";
import { type JSX, type ReactNode, useCallback } from "react";
import { ChatPart } from "@/components/chat/chat-parts.tsx";
import { ImageAttachment } from "@/components/chat/image-attachment.tsx";
import { ReplyCostLabel } from "@/components/chat/reply-cost.tsx";
import { placementOf } from "@/components/chat/tool-parts.tsx";
import { WorkingDots } from "@/components/chat/working-dots.tsx";
import { TextRun } from "@/components/chat/working-note.tsx";
import {
  ConstructAvatar,
  ConstructIllustration,
} from "@/components/constructs/construct-visual.tsx";
import type { ConstructSnapshot } from "@/constructs/construct.ts";
import {
  resolveConstructVisual,
  type VisualDestination,
} from "@/constructs/visual.ts";
import type { ReplyCost } from "@/replies/reply-accounting.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";

type Role = MessageRuntimeState["role"];

// Consecutive text parts of a message group into one text run, which shows
// as a working note or as prose as a whole.
const TEXT_RUNS = groupPartByType({ text: ["group-text-run"] });

type BodyRenderInfo =
  MessagePrimitive.GroupedParts.RenderInfo<"group-text-run">;

// How far the construct has got with a message: thinking before it has written
// anything, writing it, or done. The user's messages are always done.
type MessageProgress = "thinking" | "writing" | "done";

// The classes of a message's three parts: the item, the speaker's name and
// the body under it.
interface MessageLook {
  readonly item: string;
  readonly speaker: string;
  readonly body: string;
}

// How a message looks, by who sent it. The user's messages sit at the end
// of the line on a quiet panel, so her side of the conversation is easy to
// find; the construct's replies read as the page's own text, at full width.
const MESSAGE_LOOKS: Readonly<Record<Role, MessageLook>> = {
  user: {
    item: "flex flex-col items-end gap-1.5 pl-8 sm:pl-16",
    speaker: "wrap-anywhere max-w-full text-muted text-sm",
    body: "flex max-w-full flex-col gap-3 rounded-box border border-line/40 bg-surface px-4 py-2.5 shadow-control",
  },
  assistant: {
    item: "flex flex-col gap-1.5",
    speaker:
      "flex items-center gap-2 font-heading font-semibold text-primary text-sm",
    body: "flex flex-col gap-3 leading-relaxed",
  },
  system: {
    item: "flex flex-col gap-1.5",
    speaker: "text-muted text-sm",
    body: "flex flex-col gap-3",
  },
};

function renderImageAttachment(): JSX.Element {
  return <ImageAttachment removable={false} />;
}

// Who wrote the message: the construct, its author when someone else wrote it,
// or "You".
function speakerName(
  role: Role,
  constructName: string,
  authorName: string | undefined,
): string {
  if (role !== "user") {
    return constructName;
  }
  return authorName ?? CHAT_COPY.you;
}

function messageProgress(message: MessageRuntimeState): MessageProgress {
  if (message.role !== "assistant" || message.status.type !== "running") {
    return "done";
  }
  if (message.content.length === 0) {
    return "thinking";
  }
  return "writing";
}

// Whether part shows under the rest of its message, wherever it arrived in
// the stream: a call of a tool whose TOOL_PARTS entry is placed "under".
function showsUnderMessage(part: EnrichedPartState): boolean {
  return placementOf(part) === "under";
}

// One message of the thread: who said it, its author's name for a user
// message someone other than the viewer wrote, then its parts in the order they
// arrived, except the tool calls placed under the message, such as the
// manual citations, which come after all the others. The construct's text
// before a later inline tool call, such as a search, shows as a quiet
// working note (TextRun; the rule is in working-note-rule.ts).
// Until the construct has started a reply, the reply says that the construct is
// thinking; while the construct writes it, dots beside its name say so. Either
// way it is marked busy.
function ChatMessage({
  role,
  cost,
  construct,
  destination,
  opening,
  activityAllowed,
  authorName,
}: {
  role: Role;
  cost?: ReplyCost | undefined;
  construct: ConstructSnapshot;
  destination: VisualDestination;
  opening: boolean;
  activityAllowed: boolean;
  authorName?: string | undefined;
}): JSX.Element {
  const look = MESSAGE_LOOKS[role];
  const runningProgress = useAuiState(({ message }) =>
    messageProgress(message),
  );
  let progress = runningProgress;
  if (!activityAllowed) {
    progress = "done";
  }
  const constructName = construct.name;
  const { asset } = resolveConstructVisual(construct, "avatar");
  let artwork: string | undefined;
  if (asset?.kind === "built-in") {
    ({ artwork } = asset);
  }
  const renderBodyPart = useCallback(
    ({ part, children }: BodyRenderInfo): ReactNode => {
      if (part.type === "group-text-run") {
        return <TextRun indices={part.indices}>{children}</TextRun>;
      }
      if (part.type === "indicator" || showsUnderMessage(part)) {
        return null;
      }
      return <ChatPart part={part} role={role} />;
    },
    [role],
  );
  const renderUnderPart = useCallback(
    ({ part }: { part: EnrichedPartState }): JSX.Element | null => {
      if (!showsUnderMessage(part)) {
        return null;
      }
      return <ChatPart part={part} role={role} />;
    },
    [role],
  );

  return (
    <MessagePrimitive.Root asChild={true}>
      <li aria-busy={progress !== "done"} className={look.item}>
        <p className={look.speaker}>
          {role === "assistant" && (
            <span
              className="chat-presence"
              data-artwork={artwork}
              data-active={progress !== "done"}
            >
              <ConstructAvatar
                construct={construct}
                destination={destination}
                size={32}
                decorative={true}
              />
            </span>
          )}
          <span className="wrap-anywhere min-w-0">
            {speakerName(role, constructName, authorName)}
          </span>
          {progress === "writing" && (
            <>
              <WorkingDots />
              <span className="sr-only">
                {CHAT_COPY.writing(constructName)}
              </span>
            </>
          )}
        </p>
        {role === "assistant" && opening && (
          <div className="chat-opening">
            <ConstructIllustration
              construct={construct}
              destination={destination}
              visualRole="opening"
              displayWidth={224}
            />
          </div>
        )}
        <div className={look.body}>
          <MessagePrimitive.Attachments>
            {renderImageAttachment}
          </MessagePrimitive.Attachments>
          {progress === "thinking" && (
            <p className="flex items-center gap-2 text-muted text-sm">
              <WorkingDots />
              {CHAT_COPY.thinking(constructName)}
            </p>
          )}
          {progress !== "thinking" && (
            <>
              <MessagePrimitive.GroupedParts
                groupBy={TEXT_RUNS}
                indicator="never"
              >
                {renderBodyPart}
              </MessagePrimitive.GroupedParts>
              <MessagePrimitive.Parts>{renderUnderPart}</MessagePrimitive.Parts>
            </>
          )}
        </div>
        {role === "assistant" && opening !== true && progress === "done" && (
          <ReplyCostLabel cost={cost} />
        )}
      </li>
    </MessagePrimitive.Root>
  );
}

export { ChatMessage };
