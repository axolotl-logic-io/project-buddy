"use client";

import { ComposerPrimitive } from "@assistant-ui/react";
import { type JSX, useId } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { CHAT_COPY } from "@/ui/copy/chat.ts";

// The box starts this many lines high and grows with the message up to the
// most, then scrolls.
const MESSAGE_ROWS = 2;
const MOST_MESSAGE_ROWS = 12;

// The box the user writes a message in, with its Send button. Enter sends
// and Shift+Enter starts a new line, as the hint under the box says. Send is
// disabled while the message is empty or the tutor is replying. While the
// message has focus, the whole box shows it, Send included.
export function ChatComposer(): JSX.Element {
  const hintId = useId();
  return (
    <ComposerPrimitive.Root className="flex flex-col gap-1.5">
      <div className="field-box">
        <ComposerPrimitive.Input
          aria-describedby={hintId}
          aria-label={CHAT_COPY.messageLabel}
          className="field-box-control"
          maxRows={MOST_MESSAGE_ROWS}
          minRows={MESSAGE_ROWS}
          name="message"
        />
        <ComposerPrimitive.Send asChild={true}>
          <Button>
            <Icon name="send" />
            {CHAT_COPY.send}
          </Button>
        </ComposerPrimitive.Send>
      </div>
      <p className="px-2 text-muted text-xs" id={hintId}>
        {CHAT_COPY.keyHint}
      </p>
    </ComposerPrimitive.Root>
  );
}
