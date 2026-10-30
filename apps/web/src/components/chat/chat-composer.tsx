"use client";

import { ComposerPrimitive, useAui, useAuiState } from "@assistant-ui/react";
import { type ChangeEvent, type JSX, useCallback, useId, useRef } from "react";
import { ImageAttachment } from "@/components/chat/image-attachment.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { IMAGE_COPY } from "@/ui/copy/images.ts";

function renderAttachment(): JSX.Element {
  return <ImageAttachment />;
}

// The box starts this many lines high and grows with the message up to the
// most, then scrolls.
const MESSAGE_ROWS = 2;
const MOST_MESSAGE_ROWS = 12;

// The box the user writes a message in, with its Send button. Enter sends
// and Shift+Enter starts a new line, as the hint under the box says. Send is
// disabled while the message is empty or the buddy is replying. While the
// message has focus, the whole box shows it, Send included.
export function ChatComposer(): JSX.Element {
  const hintId = useId();
  const pickerRef = useRef<HTMLInputElement>(null);
  const aui = useAui();
  const chooseImages = useCallback((): void => {
    pickerRef.current?.click();
  }, []);
  const selectImages = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const files = Array.from(event.currentTarget.files ?? []);
      event.currentTarget.value = "";
      Promise.all(files.map((file) => aui.composer.addAttachment(file))).catch(
        () => undefined,
      );
    },
    [aui],
  );
  const blocked = useAuiState(({ composer }) =>
    composer.attachments.some(
      (attachment) =>
        attachment.status.type === "running" ||
        attachment.status.type === "incomplete",
    ),
  );
  return (
    <ComposerPrimitive.Root className="flex flex-col gap-1.5">
      <div className="flex gap-3 overflow-x-auto">
        <ComposerPrimitive.Attachments>
          {renderAttachment}
        </ComposerPrimitive.Attachments>
      </div>
      <input
        ref={pickerRef}
        type="file"
        accept="image/*"
        multiple={true}
        hidden={true}
        aria-label={IMAGE_COPY.add}
        onChange={selectImages}
      />
      <div className="field-box">
        <Button
          className="chat-attach-button"
          aria-label={IMAGE_COPY.add}
          title={IMAGE_COPY.add}
          onClick={chooseImages}
          variant="quiet"
        >
          <Icon name="image" />
        </Button>
        <ComposerPrimitive.Input
          aria-describedby={hintId}
          aria-label={CHAT_COPY.messageLabel}
          className="field-box-control"
          maxRows={MOST_MESSAGE_ROWS}
          minRows={MESSAGE_ROWS}
          name="message"
        />
        <ComposerPrimitive.Send asChild={true} disabled={blocked}>
          <Button>
            <Icon name="send" />
            {CHAT_COPY.send}
          </Button>
        </ComposerPrimitive.Send>
      </div>
      <p className="px-2 text-muted text-xs" id={hintId}>
        {CHAT_COPY.keyHint}
        <span className="block">{IMAGE_COPY.limits}</span>
      </p>
    </ComposerPrimitive.Root>
  );
}
