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
import { TOOL_PARTS } from "@/components/chat/tool-parts.tsx";
import { WorkingDots } from "@/components/chat/working-dots.tsx";
import { TextRun } from "@/components/chat/working-note.tsx";
import { COPY } from "@/ui/copy.ts";

type Role = MessageRuntimeState["role"];

// Consecutive text parts of a message group into one text run, which shows
// as a working note or as prose as a whole.
const TEXT_RUNS = groupPartByType({ text: ["group-text-run"] });

type BodyRenderInfo =
  MessagePrimitive.GroupedParts.RenderInfo<"group-text-run">;

// How far the tutor has got with a message: thinking before it has written
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
// find; the tutor's replies read as the page's own text, at full width.
const MESSAGE_LOOKS: Readonly<Record<Role, MessageLook>> = {
  user: {
    item: "flex flex-col items-end gap-1.5 pl-8 sm:pl-16",
    speaker: "text-muted text-sm",
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

function speakerName(role: Role, personaName: string): string {
  if (role === "user") {
    return COPY.chat.you;
  }
  return personaName;
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
  return (
    part.type === "tool-call" &&
    TOOL_PARTS.get(part.toolName)?.placement === "under"
  );
}

// One message of the thread: who said it, then its parts in the order they
// arrived, except the tool calls placed under the message, such as the
// manual citations, which come after all the others. The tutor's text
// before a later inline tool call shows as a quiet working note (TextRun).
// Until the tutor has started a reply, the reply says that the persona is
// thinking; while the tutor writes it, dots beside its name say so. Either
// way it is marked busy.
function ChatMessage({
  role,
  personaName,
}: {
  role: Role;
  personaName: string;
}): JSX.Element {
  const look = MESSAGE_LOOKS[role];
  const progress = useAuiState(({ message }) => messageProgress(message));
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
          {speakerName(role, personaName)}
          {progress === "writing" && <WorkingDots />}
        </p>
        <div className={look.body}>
          {progress === "thinking" && (
            <p className="flex items-center gap-2 text-muted text-sm">
              <WorkingDots />
              {COPY.chat.thinking(personaName)}
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
      </li>
    </MessagePrimitive.Root>
  );
}

export { ChatMessage };
