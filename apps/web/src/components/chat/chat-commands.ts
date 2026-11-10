// The commands an adventure's composer offers (src/plan/plan-commands.ts):
// what the list under "/" shows, and how a command runs, without the
// construct. The adventure gives them to its composer through
// ChatCommandsContext; a composer without them sends every message.
import { createContext } from "react";

// One command as the list shows it: its name as typed, how to write it and
// what it does.
interface CommandListing {
  readonly command: string;
  readonly usage: string;
  readonly description: string;
}

interface ChatCommands {
  readonly listings: readonly CommandListing[];
  // Whether the mock model runs, so its own `/mock-…` commands go to it as
  // messages.
  readonly mockCommands: boolean;
  // Whether the adventure is in a quest; outside one, only the plan
  // commands' names run as commands (isChatCommand).
  readonly inQuest: boolean;
  // Runs the command and answers with why it did nothing, or undefined once
  // it ran.
  readonly run: (text: string) => Promise<string | undefined>;
}

const ChatCommandsContext = createContext<ChatCommands | undefined>(undefined);

// The id of the listing at index in the command menu with id menuId, which
// the message box names as its active descendant.
function optionId(menuId: string, index: number): string {
  return `${menuId}-${index}`;
}

export type { ChatCommands, CommandListing };
export { ChatCommandsContext, optionId };
