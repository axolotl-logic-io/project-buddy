"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { type FormEvent, useState } from "react";

export function ChatView({
  chatId,
  personaName,
  initialMessages,
}: {
  chatId: string;
  personaName: string;
  initialMessages: UIMessage[];
}) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // The server loads the history, so send only the new message.
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: { id, message: messages[messages.length - 1] },
      }),
    }),
  });
  const busy = status === "submitted" || status === "streaming";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4">
        {messages.map((message) => (
          <li key={message.id}>
            <p className="font-medium text-sm text-zinc-600 dark:text-zinc-400">
              {message.role === "user" ? "You" : personaName}
            </p>
            {message.parts.map((part, index) =>
              part.type === "text" ? (
                <p
                  className="whitespace-pre-wrap"
                  // biome-ignore lint/suspicious/noArrayIndexKey: parts have no ids, and their order within a message never changes
                  key={index}
                >
                  {part.text}
                </p>
              ) : null,
            )}
          </li>
        ))}
      </ol>
      {status === "submitted" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {personaName} is thinking…
        </p>
      )}
      {error && (
        <p className="text-red-700 text-sm dark:text-red-400" role="alert">
          Something went wrong: {error.message}
        </p>
      )}
      <form className="flex items-end gap-2" onSubmit={handleSubmit}>
        <label className="flex flex-1 flex-col gap-1">
          <span className="sr-only">Message</span>
          <textarea
            className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700"
            name="message"
            onChange={(event) => setInput(event.target.value)}
            rows={3}
            value={input}
          />
        </label>
        <button
          className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          disabled={busy}
          type="submit"
        >
          Send
        </button>
      </form>
    </div>
  );
}
