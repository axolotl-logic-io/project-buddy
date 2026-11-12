// The composer's side of the chat's commands (chat-commands.ts): the list of
// commands that a message starting with "/" brings up, moved through with the
// arrow keys and chosen with Tab, Enter or a click; and the send that runs a
// command at once instead of sending it to the construct, keeping the text
// and saying why when the command can't run.

import { useAui, useAuiState } from "@assistant-ui/react";
import {
  type KeyboardEvent,
  type SyntheticEvent,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  ChatCommandsContext,
  type CommandListing,
} from "@/components/chat/chat-commands.ts";
import { isChatCommand } from "@/plan/plan-commands.ts";
import { CHAT_COMMANDS_COPY } from "@/ui/copy/plan.ts";

const WHITE_SPACE = /\s/u;

// A command whose name alone is a whole command, which Enter runs rather
// than completes.
const WHOLE_COMMANDS: ReadonlySet<string> = new Set([
  "/plan",
  "/brainstorm",
  "/stop",
  "/undo",
  "/done",
]);

interface ComposerCommands {
  // The commands the list shows for the text typed so far; none while the
  // list is closed.
  readonly listings: readonly CommandListing[];
  // The listing the arrow keys are on.
  readonly active: number;
  readonly complete: (command: string) => void;
  // Runs the composer's text as a command instead of sending it, if it is
  // one: the form's submit and the Send button call it first.
  readonly intercept: (event: SyntheticEvent) => void;
  readonly keyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  // Why the last command did nothing, until the text changes.
  readonly problem: string | undefined;
  readonly running: boolean;
}

function useComposerCommands(): ComposerCommands {
  const commands = useContext(ChatCommandsContext);
  const aui = useAui();
  const text = useAuiState(({ composer }) => composer.text);
  const [highlighted, setHighlighted] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<string | undefined>();
  const [problem, setProblem] = useState<
    { readonly text: string; readonly for: string } | undefined
  >();
  const [running, setRunning] = useState(false);
  const typed = text.trimStart();
  const listings = useMemo((): readonly CommandListing[] => {
    if (
      commands === undefined ||
      !typed.startsWith("/") ||
      WHITE_SPACE.test(typed) ||
      dismissedAt === text
    ) {
      return [];
    }
    return commands.listings.filter(({ command }) => command.startsWith(typed));
  }, [commands, typed, dismissedAt, text]);
  const active = Math.max(0, Math.min(highlighted, listings.length - 1));
  const complete = useCallback(
    (command: string): void => {
      aui.composer.setText(`${command} `);
      setHighlighted(0);
    },
    [aui],
  );
  const intercept = useCallback(
    (event: SyntheticEvent): void => {
      if (commands === undefined || !isChatCommand(text, commands)) {
        return;
      }
      event.preventDefault();
      if (running === true) {
        return;
      }
      setRunning(true);
      commands
        .run(text)
        .then((found) => {
          if (found === undefined) {
            aui.composer.setText("");
            setProblem(undefined);
            return;
          }
          setProblem({ text: found, for: text });
        })
        .catch(() => setProblem({ text: CHAT_COMMANDS_COPY.failed, for: text }))
        .finally(() => setRunning(false));
    },
    [aui, commands, running, text],
  );
  const keyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>): void => {
      const listing = listings[active];
      if (listing === undefined) {
        return;
      }
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setHighlighted((active + 1) % listings.length);
          return;
        case "ArrowUp":
          event.preventDefault();
          setHighlighted((active - 1 + listings.length) % listings.length);
          return;
        case "Tab":
          event.preventDefault();
          complete(listing.command);
          return;
        case "Enter":
          if (event.shiftKey || WHOLE_COMMANDS.has(typed)) {
            return;
          }
          event.preventDefault();
          complete(listing.command);
          return;
        case "Escape":
          event.preventDefault();
          setDismissedAt(text);
          return;
        default:
          return;
      }
    },
    [active, complete, listings, text, typed],
  );
  let shownProblem: string | undefined;
  if (problem !== undefined && problem.for === text) {
    shownProblem = problem.text;
  }
  return {
    listings,
    active,
    complete,
    intercept,
    keyDown,
    problem: shownProblem,
    running,
  };
}

export type { ComposerCommands };
export { useComposerCommands };
