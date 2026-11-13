"use client";

import { ComposerPrimitive } from "@assistant-ui/react";
import {
  type FocusEvent,
  type JSX,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
} from "react";
import { optionId } from "@/components/chat/chat-commands.ts";
import { CommandMenu } from "@/components/chat/command-menu.tsx";
import type { ReplyStop } from "@/components/chat/reply-stop.ts";
import { useComposerCommands } from "@/components/chat/use-composer-commands.ts";
import { Button } from "@/components/ui/button.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { CHAT_COPY } from "@/ui/copy/chat.ts";

// The box starts this many lines high and grows with the message up to the
// most, then scrolls.
const MESSAGE_ROWS = 2;
const MOST_MESSAGE_ROWS = 12;

// The box the user writes a message in, with its Send button. Enter sends
// and Shift+Enter starts a new line, as the hint under the box says. Send is
// disabled while the message is empty or the construct is replying. While a
// reply runs, stop is given, and Stop reply takes Send's place; when the
// reply ends and Stop goes, focus on it moves to the message box. While the
// message has focus, the whole box shows it, Send included. inputRef, if
// given, holds the message box, so the thread can move focus to it. In an
// adventure with commands (chat-commands.ts), typing "/" lists them above the
// box, and a command runs at once instead of going to the construct.
export function ChatComposer({
  inputRef,
  stop,
}: {
  readonly inputRef?: RefObject<HTMLTextAreaElement | null>;
  readonly stop?: ReplyStop | undefined;
}): JSX.Element {
  // Whether focus left Stop reply for another element, or was never on it;
  // a Stop that goes when the reply ends leaves focus nowhere instead.
  const stopMovedOnRef = useRef(true);
  const onStopFocus = useCallback((): void => {
    stopMovedOnRef.current = false;
  }, []);
  const onStopBlur = useCallback(
    (event: FocusEvent<HTMLButtonElement>): void => {
      // Disabling the focused Stop button can send focus to the document
      // in WebKit. That is focus loss, not a move to another control.
      stopMovedOnRef.current =
        event.relatedTarget !== null &&
        event.relatedTarget !== document.body &&
        event.relatedTarget !== document.documentElement;
    },
    [],
  );
  const running = stop !== undefined;
  useEffect(() => {
    if (running || stopMovedOnRef.current) {
      return;
    }
    stopMovedOnRef.current = true;
    if (
      document.activeElement === null ||
      document.activeElement === document.body
    ) {
      inputRef?.current?.focus();
    }
  }, [running, inputRef]);
  const onStopClick = useCallback(async (): Promise<void> => {
    // WebKit pointer clicks do not focus buttons, unlike keyboard activation.
    stopMovedOnRef.current = false;
    if (stop !== undefined) {
      await stop.onStop();
    }
  }, [stop]);
  const hintId = useId();
  const menuId = useId();
  const problemId = useId();
  const commands = useComposerCommands();
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
      <div className="field-box">
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
        {stop !== undefined && (
          <Button
            variant="secondary"
            onClick={onStopClick}
            disabled={stop.stopping}
            onFocus={onStopFocus}
            onBlur={onStopBlur}
          >
            <Icon name="stop" />
            <span className="sr-only sm:not-sr-only">{CHAT_COPY.stop}</span>
          </Button>
        )}
        {stop === undefined && (
          <ComposerPrimitive.Send
            asChild={true}
            disabled={commands.running}
            onClick={commands.intercept}
          >
            <Button>
              <Icon name="send" />
              <span className="sr-only sm:not-sr-only">{CHAT_COPY.send}</span>
            </Button>
          </ComposerPrimitive.Send>
        )}
      </div>
      {commands.problem !== undefined && (
        <Alert id={problemId}>{commands.problem}</Alert>
      )}
      <p className="px-2 text-muted text-xs" id={hintId}>
        {CHAT_COPY.keyHint}
      </p>
    </ComposerPrimitive.Root>
  );
}
