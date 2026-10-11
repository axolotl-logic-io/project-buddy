"use client";

import { ComposerPrimitive } from "@assistant-ui/react";
import type { JSX } from "react";
import { COPY } from "@/ui/copy.ts";

const MESSAGE_ROWS = 3;

// The box the user writes a message in. Send is disabled while it is empty
// or the tutor is replying.
export function ChatComposer(): JSX.Element {
  return (
    <ComposerPrimitive.Root className="flex items-end gap-2">
      <ComposerPrimitive.Input
        aria-label={COPY.chat.messageLabel}
        className="input-field flex-1"
        minRows={MESSAGE_ROWS}
        name="message"
      />
      <ComposerPrimitive.Send className="button-primary">
        {COPY.chat.send}
      </ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  );
}
