"use client";

import { ComposerPrimitive } from "@assistant-ui/react";
import { type JSX, useId } from "react";
import { ChatIcon } from "@/components/chat/chat-icon.tsx";
import { COPY } from "@/ui/copy.ts";

// The box starts this many lines high and grows with the message up to the
// most, then scrolls.
const MESSAGE_ROWS = 2;
const MOST_MESSAGE_ROWS = 12;

// The box the user writes a message in, with its Send button. Enter sends
// and Shift+Enter starts a new line, as the hint under the box says. Send is
// disabled while the message is empty or the tutor is replying. The box
// shows focus around the whole composer, Send included.
export function ChatComposer(): JSX.Element {
  const hintId = useId();
  return (
    <ComposerPrimitive.Root className="flex flex-col gap-1.5">
      <div className="flex items-end gap-2 rounded-box border border-line bg-field p-2 shadow-control has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-focus has-[textarea:focus-visible]:outline-offset-2">
        <ComposerPrimitive.Input
          aria-describedby={hintId}
          aria-label={COPY.chat.messageLabel}
          className="flex-1 resize-none bg-transparent px-2 py-1.5 text-foreground leading-relaxed focus-visible:outline-none"
          maxRows={MOST_MESSAGE_ROWS}
          minRows={MESSAGE_ROWS}
          name="message"
        />
        <ComposerPrimitive.Send className="flex items-center gap-2 rounded-control bg-primary px-4 py-2 font-medium text-on-primary shadow-control enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          <ChatIcon name="send" />
          {COPY.chat.send}
        </ComposerPrimitive.Send>
      </div>
      <p className="px-2 text-muted text-xs" id={hintId}>
        {COPY.chat.keyHint}
      </p>
    </ComposerPrimitive.Root>
  );
}
