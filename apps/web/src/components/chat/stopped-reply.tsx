"use client";

import type { JSX } from "react";
import { Button } from "@/components/ui/button.tsx";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { IMAGE_COPY } from "@/ui/copy/images.ts";

// Says the buddy didn't reply to the chat's last message, such as when the user
// reopens a chat whose reply failed, with a way to ask for the reply again.
export function StoppedReply({
  buddyName,
  onRetry,
}: {
  readonly buddyName: string;
  readonly onRetry?: (() => void) | undefined;
}): JSX.Element {
  return (
    <div className="panel flex flex-wrap items-center gap-3">
      <p className="text-muted">{CHAT_COPY.replyStopped(buddyName)}</p>
      {onRetry !== undefined && (
        <Button onClick={onRetry} variant="secondary">
          {IMAGE_COPY.retry}
        </Button>
      )}
    </div>
  );
}
