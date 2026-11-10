"use client";

import { ComposerPrimitive, useAui, useAuiState } from "@assistant-ui/react";
import {
  type ChangeEvent,
  type JSX,
  type RefObject,
  useCallback,
  useId,
  useRef,
} from "react";
import { optionId } from "@/components/chat/chat-commands.ts";
import { CommandMenu } from "@/components/chat/command-menu.tsx";
import { ImageAttachment } from "@/components/chat/image-attachment.tsx";
import { useComposerCommands } from "@/components/chat/use-composer-commands.ts";
import { Button } from "@/components/ui/button.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
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
// disabled while the message is empty or the construct is replying. While the
// message has focus, the whole box shows it, Send included. inputRef, if
// given, holds the message box, so the thread can move focus to it. In an
// adventure with commands (chat-commands.ts), typing "/" lists them above the
// box, and a command runs at once instead of going to the construct.
export function ChatComposer({
  inputRef,
}: {
  readonly inputRef?: RefObject<HTMLTextAreaElement | null>;
}): JSX.Element {
  const hintId = useId();
  const menuId = useId();
  const problemId = useId();
  const commands = useComposerCommands();
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
  let describedBy = hintId;
  if (commands.problem !== undefined) {
    describedBy = `${problemId} ${hintId}`;
  }
  let menuControls: string | undefined;
  let activeOption: string | undefined;
  if (commands.listings.length > 0) {
    menuControls = menuId;
    activeOption = optionId(menuId, commands.active);
  }
  return (
    <ComposerPrimitive.Root
      className="relative flex flex-col gap-1.5"
      onSubmit={commands.intercept}
    >
      {commands.listings.length > 0 && (
        <CommandMenu
          id={menuId}
          listings={commands.listings}
          active={commands.active}
          onChoose={commands.complete}
        />
      )}
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
          aria-describedby={describedBy}
          aria-controls={menuControls}
          aria-activedescendant={activeOption}
          aria-autocomplete="list"
          onKeyDown={commands.keyDown}
          aria-label={CHAT_COPY.messageLabel}
          className="field-box-control"
          maxRows={MOST_MESSAGE_ROWS}
          minRows={MESSAGE_ROWS}
          name="message"
          ref={inputRef}
        />
        <ComposerPrimitive.Send
          asChild={true}
          disabled={blocked || commands.running}
          onClick={commands.intercept}
        >
          <Button>
            <Icon name="send" />
            <span className="sr-only sm:not-sr-only">{CHAT_COPY.send}</span>
          </Button>
        </ComposerPrimitive.Send>
      </div>
      {commands.problem !== undefined && (
        <Alert id={problemId}>{commands.problem}</Alert>
      )}
      <p className="px-2 text-muted text-xs" id={hintId}>
        {CHAT_COPY.keyHint}
        <span className="block">{IMAGE_COPY.limits}</span>
      </p>
    </ComposerPrimitive.Root>
  );
}
