// How the quest panel's controls act: each sends its message to the quest's
// conversation, as if the user had typed it in the composer, so the
// conversation records what was done to the quest. A command
// (src/commands/panel-commands.ts, src/tasks/tasks-commands.ts) runs at once
// without a model; any other message, such as "cast Brainstorm", goes to the
// construct. The conversation gives its send to the panel through
// ChatSendContext; outside a conversation there is none.
import { createContext, useCallback, useContext, useState } from "react";
import { PANEL_COMMANDS_COPY } from "@/ui/copy/commands.ts";

// What came of a send: it ran, with the note the conversation now shows
// under it, if any; or it didn't, and why, which the composer shows too.
type ChatSendResult =
  | { readonly sent: true; readonly note?: string | undefined }
  | { readonly sent: false; readonly problem?: string | undefined };

type ChatSend = (text: string) => Promise<ChatSendResult>;

const ChatSendContext = createContext<ChatSend | undefined>(undefined);

// The conversation's send, or undefined outside a conversation.
function useChatSend(): ChatSend | undefined {
  return useContext(ChatSendContext);
}

// A panel control's side of a send: whether one is under way, and the note
// or the problem the last one came to, for the control's status line.
interface PanelSend {
  readonly send: (text: string) => Promise<ChatSendResult>;
  readonly busy: boolean;
  readonly status: string | undefined;
  readonly problem: string | undefined;
}

function usePanelSend(): PanelSend {
  const chatSend = useChatSend();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | undefined>();
  const [problem, setProblem] = useState<string | undefined>();
  const send = useCallback(
    async (text: string): Promise<ChatSendResult> => {
      setStatus(undefined);
      setProblem(undefined);
      if (chatSend === undefined) {
        setProblem(PANEL_COMMANDS_COPY.problems.noConversation);
        return {
          sent: false,
          problem: PANEL_COMMANDS_COPY.problems.noConversation,
        };
      }
      setBusy(true);
      try {
        const sending: Promise<ChatSendResult> = chatSend(text);
        const result = await sending;
        if (result.sent) {
          setStatus(result.note);
        } else {
          setProblem(result.problem);
        }
        return result;
      } catch {
        setProblem(PANEL_COMMANDS_COPY.problems.failed);
        return { sent: false, problem: PANEL_COMMANDS_COPY.problems.failed };
      } finally {
        setBusy(false);
      }
    },
    [chatSend],
  );
  return { send, busy, status, problem };
}

export type { ChatSend, ChatSendResult, PanelSend };
export { ChatSendContext, useChatSend, usePanelSend };
