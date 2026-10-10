"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  type ChangeEvent,
  type JSX,
  type SubmitEvent,
  useCallback,
  useState,
} from "react";
import { userMessageForCase } from "@/errors/app-error.ts";
import { COPY } from "@/ui/copy.ts";

// The server loads the history, so send only the new message.
function onlyNewMessage({
  id,
  messages,
}: {
  id: string;
  messages: UIMessage[];
}): { body: { id: string; message: UIMessage | undefined } } {
  return { body: { id, message: messages.at(-1) } };
}

const CHAT_TRANSPORT = new DefaultChatTransport({
  api: "/api/chat",
  prepareSendMessagesRequest: onlyNewMessage,
});

function speakerName(role: UIMessage["role"], personaName: string): string {
  if (role === "user") {
    return COPY.chat.you;
  }
  return personaName;
}

// The text a message shows: its text parts in order, each on its own line.
// Other parts, such as the tutor's reasoning, are not shown.
function messageText(message: UIMessage): string {
  return message.parts
    .flatMap((part) => {
      if (part.type === "text") {
        return [part.text];
      }
      return [];
    })
    .join("\n");
}

function ChatMessage({
  message,
  personaName,
}: {
  message: UIMessage;
  personaName: string;
}): JSX.Element {
  return (
    <li>
      <p className="font-medium text-muted text-sm">
        {speakerName(message.role, personaName)}
      </p>
      <p className="whitespace-pre-wrap">{messageText(message)}</p>
    </li>
  );
}

function MessageComposer({
  busy,
  onSend,
}: {
  busy: boolean;
  onSend: (text: string) => void;
}): JSX.Element {
  const [input, setInput] = useState("");
  const handleSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const text = input.trim();
      if (text === "" || busy) {
        return;
      }
      onSend(text);
      setInput("");
    },
    [input, busy, onSend],
  );
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      setInput(event.target.value);
    },
    [],
  );

  return (
    <form className="flex items-end gap-2" onSubmit={handleSubmit}>
      <label className="flex flex-1 flex-col gap-1">
        <span className="sr-only">{COPY.chat.messageLabel}</span>
        <textarea
          className="rounded border border-line px-2 py-1"
          name="message"
          onChange={handleChange}
          rows={3}
          value={input}
        />
      </label>
      <button
        className="rounded bg-primary px-4 py-2 text-on-primary disabled:opacity-50"
        disabled={busy}
        type="submit"
      >
        {COPY.chat.send}
      </button>
    </form>
  );
}

export function ChatView({
  chatId,
  personaName,
  initialMessages,
}: {
  chatId: string;
  personaName: string;
  initialMessages: UIMessage[];
}): JSX.Element {
  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: CHAT_TRANSPORT,
  });
  const sendText = useCallback(
    (text: string): void => {
      sendMessage({ text }).catch(() => {
        // useChat already reports a failed send through `error`.
      });
    },
    [sendMessage],
  );

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            personaName={personaName}
          />
        ))}
      </ol>
      {status === "submitted" && (
        <p className="text-muted text-sm">{COPY.chat.thinking(personaName)}</p>
      )}
      {error !== undefined && (
        // /api/chat reports a failure as its AppErrorCase alone.
        <p className="text-danger text-sm" role="alert">
          {userMessageForCase(error.message)}
        </p>
      )}
      <MessageComposer
        busy={status === "submitted" || status === "streaming"}
        onSend={sendText}
      />
    </div>
  );
}
